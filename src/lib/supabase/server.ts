// Supabase client for server components and route handlers.
//
// The hub shares its identity with every SEED CL department dashboard: one
// Supabase project, one auth.users table, one session cookie. Someone signed in
// at sales.seedclmalaysiastore.com is already signed in here.
//
// Note the method shorthand on getAll/setAll rather than arrow properties.
// `cookies` is a union type, and TypeScript cannot contextually type an arrow
// function's parameters through a union — it compiled locally and failed the
// Vercel build with "Parameter 'toSet' implicitly has an 'any' type".
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Read-only cookie store inside a Server Component. The middleware
            // refreshes the session, so there is nothing to do here.
          }
        },
      },
    },
  );
}
