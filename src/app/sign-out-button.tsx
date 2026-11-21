"use client";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Sign out. `icon` is the exit icon at the right end of the top bar (SEED house standard). */
export function SignOutButton({ icon = false }: { icon?: boolean }) {
  async function signOut() {
    await supabaseBrowser().auth.signOut();
    // Hard navigation so the middleware sees the cleared cookie.
    window.location.assign("/login");
  }
  if (icon) {
    return (
      <button type="button" className="tb-exit" onClick={signOut} aria-label="Sign out" title="Sign out">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
        </svg>
      </button>
    );
  }
  return (
    <button type="button" className="signout" onClick={signOut}>
      Sign out
    </button>
  );
}
