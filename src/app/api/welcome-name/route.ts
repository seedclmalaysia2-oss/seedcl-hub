import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// The signed-in person's own name, for the welcome screen shown while the hub loads after sign-in
// (src/app/welcome-splash.tsx). Same rule as the top bar on the home page (src/app/page.tsx), so the
// two agree. Nothing about anyone else; nothing at all unless signed in.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  let name: string | null = null;
  if (user) {
    const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
    name = meta.full_name || meta.name || (user.email ?? "").split("@")[0] || null;
  }
  return NextResponse.json({ name }, { headers: { "Cache-Control": "private, no-store" } });
}
