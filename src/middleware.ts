import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase session cookie and bounces signed-out visitors to
 * /login before any page HTML is produced.
 *
 * This is what replaces Vercel's paid Password Protection. The important part
 * is that it runs on the server: the department list never reaches a browser
 * that hasn't signed in, so there is nothing to find in "View source".
 *
 * The page itself checks the session again (see src/app/page.tsx). Middleware
 * has had bypass vulnerabilities in Next.js, so it is a convenience redirect
 * here, not the only thing standing between a stranger and the list.
 */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const onLogin = pathname.startsWith("/login");

  if (!user && !onLogin) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && onLogin) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
