"use client";
// Admin button in the masthead. Click -> password prompt -> Users panel.
//
// The prompt is a step-up check, not the lock itself: the person is already
// signed in, so it asks them to prove it is still them by re-entering their own
// account password, which Supabase verifies (signInWithPassword). No password is
// stored or compared in this app, and there is no shared admin secret to leak.
//
// What actually protects the data is the database. `isAdmin` comes from the
// server (page.tsx reads sp_user_map under RLS) and only decides what to show;
// every admin_* function re-checks current_user_is_admin() in Postgres. Closing
// the dialog locks the panel again, so the next open asks for the password.
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AdminUsers } from "./admin-users";

export function AdminButton({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function close() {
    setOpen(false);
    setUnlocked(false);
    setPassword("");
    setErr("");
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { setErr("Enter your password."); return; }
    setBusy(true); setErr("");
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setBusy(false);
    setPassword("");
    if (error) {
      setErr(error.message === "Invalid login credentials"
        ? "That password is incorrect."
        : error.message);
      return;
    }
    if (!isAdmin) {
      setErr(`${email} is not an admin. Ask an admin to promote this account.`);
      return;
    }
    setUnlocked(true);
  }

  return (
    <>
      <button type="button" className="admin-btn" onClick={() => setOpen(true)}>
        Admin
      </button>

      <dialog
        ref={dialog}
        className={`admin-dialog${unlocked ? " wide" : ""}`}
        aria-label="Admin"
        // Escape and the backdrop both fire `close`; keep React state in step.
        onClose={() => { if (open) close(); }}
        onClick={e => { if (e.target === dialog.current) close(); }}
      >
        {open && (unlocked ? (
          <>
            <div className="admin-head">
              <h2>Admin</h2>
              <button type="button" className="signout" onClick={close}>Lock &amp; close</button>
            </div>
            <AdminUsers selfEmail={email} />
          </>
        ) : (
          <form className="admin-gate" onSubmit={unlock}>
            <div className="mark">SC</div>
            <h2>Admin</h2>
            <p>Enter your password for {email} to open user control.</p>
            <input
              className="field" type="password" autoFocus value={password}
              autoComplete="current-password" placeholder="Password"
              aria-label="Password"
              onChange={e => setPassword(e.target.value)}
            />
            {err && <p className="err" role="alert">{err}</p>}
            <button className="submit" disabled={busy}>{busy ? "Checking…" : "Unlock"}</button>
            <button type="button" className="linkish" onClick={close}>Cancel</button>
          </form>
        ))}
      </dialog>
    </>
  );
}
