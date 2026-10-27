"use client";
// Users panel — the hub's copy of the Sales dashboard's Users tab.
//
// Same Supabase project, same RPCs: admin_list_users() reads the roster, the
// admin_* functions write to it, and sp_user_map takes the role toggles. Every
// one of them checks current_user_is_admin() inside Postgres, so a non-admin
// who reaches this component by any route still gets an exception, not data.
// The last-admin guard is also a database trigger; the error it raises is shown
// as-is.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { DEPARTMENTS } from "./departments";

// The sections an admin can grant: every dashboard that is live today.
const SECTIONS = DEPARTMENTS.filter(d => d.status === "live");

// Same list as the Sales dashboard's Users tab (every account maps to one).
const SP_OPTIONS = ["Alan", "Dino", "Khen", "Sakinah", "Simon", "Seed Malaysia"];

type Row = {
  user_id: string;
  email: string | null;
  sp: string | null;
  is_admin: boolean;
  can_view_all: boolean;
  last_sign_in_at: string | null;
};

const errText = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));

export function AdminUsers({ selfEmail }: { selfEmail: string }) {
  const supabase = useRef(supabaseBrowser()).current;
  const [rows, setRows] = useState<Row[]>([]);
  // user_id -> app.staff.departments. null until loaded, or when the access
  // functions are not installed yet (supabase/0001_department_access.sql).
  const [access, setAccess] = useState<Map<string, string[]> | null>(null);
  const [accessMissing, setAccessMissing] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");

  const mounted = useRef(true);
  // Re-armed on mount: Strict Mode runs mount -> cleanup -> mount in development.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [users, staff] = await Promise.all([
      supabase.rpc("admin_list_users"),
      supabase.rpc("admin_list_staff_access"),
    ]);
    if (!mounted.current) return;
    if (users.error) setError(`Could not load users: ${users.error.message}`);
    else { setRows((users.data as Row[]) ?? []); setError(""); }
    if (staff.error) {
      setAccess(null);
      setAccessMissing(staff.error.message);
    } else {
      setAccess(new Map(((staff.data as { user_id: string; departments: string[] | null }[]) ?? [])
        .map(s => [s.user_id, s.departments ?? []])));
      setAccessMissing("");
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh]);

  const isSelf = (r: Row) => r.email?.toLowerCase() === selfEmail.toLowerCase();

  // Runs one write, then reloads the roster. Returns whether it worked.
  async function run(id: string, write: () => PromiseLike<{ error: { message: string } | null }>, done: string) {
    setBusyId(id); setError(""); setNotice("");
    try {
      const { error } = await write();
      if (error) throw error;
      setNotice(done);
      await refresh();
      return true;
    } catch (e) {
      setError(errText(e));
      return false;
    } finally {
      if (mounted.current) setBusyId(null);
    }
  }

  const patch = (r: Row, changes: Partial<Row>, done: string) =>
    run(r.user_id, () => supabase.from("sp_user_map").update(changes).eq("user_id", r.user_id), done);

  function toggleAdmin(r: Row) {
    const next = !r.is_admin;
    if (!next && isSelf(r) && !confirm("Remove admin from your OWN account? You will lose this panel immediately.")) return;
    patch(r, { is_admin: next }, next
      ? `${r.email} is now an admin.`
      : `${r.email} is now a regular user.`);
  }

  // Adds or removes one section, keeping anything else already on the person's
  // list (keys this screen doesn't know about are left alone).
  function toggleSection(r: Row, key: string, name: string) {
    const current = access?.get(r.user_id) ?? [];
    const has = current.includes(key);
    const next = has ? current.filter(k => k !== key) : [...current, key];
    run(r.user_id,
      () => supabase.rpc("admin_set_user_departments", { p_user_id: r.user_id, p_departments: next }),
      has ? `${r.email} can no longer open ${name}.` : `${r.email} can now open ${name}.`);
  }

  function toggleViewAll(r: Row) {
    if (r.is_admin) return;
    const next = !r.can_view_all;
    patch(r, { can_view_all: next }, next
      ? `${r.email} can now see every salesperson's data.`
      : `${r.email} is now restricted to their own data (${r.sp}).`);
  }

  async function saveEmail(r: Row) {
    const next = editEmail.trim().toLowerCase();
    if (!next || next === r.email?.toLowerCase()) { setEditId(null); return; }
    const ok = await run(r.user_id,
      () => supabase.rpc("admin_update_user_email", { p_user_id: r.user_id, p_email: next }),
      `Email changed to ${next}.`);
    if (ok) setEditId(null);
  }

  function resetPassword(r: Row) {
    const pw = window.prompt(`Set a new password for ${r.email}.\nAt least 8 characters. Share it via a private channel.`);
    if (pw == null) return;
    if (pw.length < 8) { setError("Password must be at least 8 characters."); return; }
    run(r.user_id,
      () => supabase.rpc("admin_reset_user_password", { p_user_id: r.user_id, p_password: pw }),
      `Password reset for ${r.email}.`);
  }

  function remove(r: Row) {
    if (isSelf(r)) { setError("You can't delete your own account."); return; }
    if (!confirm(`Permanently delete ${r.email}?\n\nThis removes the sign-in account and the salesperson mapping. It cannot be undone.`)) return;
    run(r.user_id, () => supabase.rpc("admin_delete_user", { p_user_id: r.user_id }), `${r.email} has been deleted.`);
  }

  async function create(p: { email: string; password: string; sp: string; isAdmin: boolean; canViewAll: boolean; sections: string[] }) {
    const ok = await run("__new__",
      async () => {
        const made = await supabase.rpc("admin_create_user", {
          p_email: p.email, p_password: p.password, p_sp: p.sp,
          p_is_admin: p.isAdmin, p_can_view_all: p.canViewAll,
        });
        if (made.error) return made;
        // Only when the access functions exist and something was ticked.
        if (access && p.sections.length) {
          return supabase.rpc("admin_set_user_departments", {
            p_user_id: made.data as string, p_departments: p.sections,
          });
        }
        return made;
      },
      `Created ${p.email}${p.isAdmin ? " (admin)" : ""}. Share the password with them privately.`);
    if (ok) setAddOpen(false);
  }

  const adminCount = rows.filter(r => r.is_admin).length;

  return (
    <div className="adm-users">
      <div className="adm-bar">
        <div className="adm-title">
          Users
          <span className="adm-meta"> · {rows.length} account{rows.length === 1 ? "" : "s"} · {adminCount} admin{adminCount === 1 ? "" : "s"}</span>
        </div>
        <div className="adm-actions">
          <button type="button" className="btn primary" onClick={() => setAddOpen(o => !o)}>
            {addOpen ? "Cancel" : "+ Add user"}
          </button>
          <button type="button" className="btn" onClick={refresh}>Refresh</button>
        </div>
      </div>

      {addOpen && (
        <AddUserForm busy={busyId === "__new__"} showSections={!!access}
          onSubmit={create} onCancel={() => setAddOpen(false)} />
      )}

      <p className="adm-help">
        These are the same accounts that sign in to every department dashboard. <strong>Sections</strong> are
        the dashboards a person may open; admins can open all of them.
        {" "}<strong>Admin</strong> manages users and uploaded files in the Sales dashboard.
        {" "}<strong>Own only</strong> restricts a user to their own salesperson&apos;s rows there.
        {access && (
          <> Account, Administration and Warehouse refuse anyone without their section. Sales and Human Resources
          don&apos;t check sections yet, so ticking them only records the choice.</>
        )}
      </p>

      {error && <div className="adm-msg bad" role="alert">⚠ {error}</div>}
      {accessMissing && !loading && (
        <div className="adm-msg warn" role="status">
          <span>
            Section access isn&apos;t switched on yet. Run <code>supabase/0001_department_access.sql</code> once
            in the Supabase SQL editor to enable it. ({accessMissing})
          </span>
        </div>
      )}
      {notice && (
        <div className="adm-msg ok" role="status">
          <span>✓ {notice}</span>
          <button type="button" className="x" onClick={() => setNotice("")} aria-label="Dismiss">✕</button>
        </div>
      )}

      {loading ? (
        <p className="adm-empty">Loading users…</p>
      ) : rows.length === 0 ? (
        <p className="adm-empty">No users found.</p>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Account / Salesperson</th>{access && <th>Sections</th>}<th>Data access</th><th>Role</th><th>Last sign-in</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const busy = busyId === r.user_id;
                return (
                  <tr key={r.user_id}>
                    <td>
                      {editId === r.user_id ? (
                        <div className="adm-inline">
                          <input
                            className="field sm" type="email" autoFocus value={editEmail} disabled={busy}
                            onChange={e => setEditEmail(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") saveEmail(r);
                              if (e.key === "Escape") setEditId(null);
                            }}
                          />
                          <button type="button" className="btn primary sm" disabled={busy} onClick={() => saveEmail(r)}>Save</button>
                          <button type="button" className="btn sm" disabled={busy} onClick={() => setEditId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="adm-inline">
                          <span className="adm-email">{r.email}</span>
                          {isSelf(r) && <span className="adm-meta">(you)</span>}
                          <button
                            type="button" className="adm-icon" disabled={busy} title="Change this email"
                            aria-label={`Change email for ${r.email}`}
                            onClick={() => { setEditId(r.user_id); setEditEmail(r.email ?? ""); }}
                          >✎</button>
                        </div>
                      )}
                      <select
                        className="field sm adm-sp" value={r.sp ?? ""} disabled={busy}
                        aria-label={`Salesperson for ${r.email}`}
                        onChange={e => e.target.value !== r.sp && patch(r, { sp: e.target.value }, `${r.email} is now mapped to ${e.target.value}.`)}
                      >
                        {r.sp && !SP_OPTIONS.includes(r.sp) && <option value={r.sp}>{r.sp}</option>}
                        {SP_OPTIONS.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                      </select>
                    </td>
                    {access && (
                      <td>
                        {r.is_admin ? (
                          <span className="adm-meta">All sections (admin)</span>
                        ) : (
                          <div className="adm-chips" role="group" aria-label={`Sections for ${r.email}`}>
                            {SECTIONS.map(s => {
                              const on = (access.get(r.user_id) ?? []).includes(s.key);
                              return (
                                <button
                                  key={s.key} type="button" disabled={busy}
                                  className={`chip${on ? " on" : ""}`} aria-pressed={on}
                                  title={on ? `Remove ${s.name}` : `Allow ${s.name}`}
                                  onClick={() => toggleSection(r, s.key, s.name)}
                                >
                                  {s.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    )}
                    <td>
                      {r.is_admin ? (
                        <span className="adm-meta">All teams (admin)</span>
                      ) : (
                        <button
                          type="button" disabled={busy} onClick={() => toggleViewAll(r)}
                          className={`btn sm ${r.can_view_all ? "good" : "warn"}`}
                          title={r.can_view_all ? "Restrict this user to their own data" : "Let this user see all teams"}
                        >
                          {r.can_view_all ? "All teams" : "Own only"}
                        </button>
                      )}
                    </td>
                    <td>
                      <button
                        type="button" disabled={busy} onClick={() => toggleAdmin(r)}
                        className={`btn sm ${r.is_admin ? "accent" : ""}`}
                        title={r.is_admin ? "Demote to regular user" : "Promote to admin"}
                      >
                        {r.is_admin ? "★ Admin" : "Regular user"}
                      </button>
                    </td>
                    <td className="adm-mono">
                      {r.last_sign_in_at
                        ? new Date(r.last_sign_in_at).toLocaleString("en-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "never"}
                    </td>
                    <td>
                      <div className="adm-inline">
                        <button type="button" className="btn sm" disabled={busy} onClick={() => resetPassword(r)} title="Set a new password for this user">Password</button>
                        <button
                          type="button" className="btn sm danger" disabled={busy || isSelf(r)} onClick={() => remove(r)}
                          title={isSelf(r) ? "You cannot delete your own account" : "Permanently delete this user"}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="adm-foot">The database refuses to remove the last admin, so the dashboards can never be locked out of their own controls.</p>
    </div>
  );
}

function AddUserForm({ busy, showSections, onSubmit, onCancel }: {
  busy: boolean;
  showSections: boolean;
  onSubmit: (p: { email: string; password: string; sp: string; isAdmin: boolean; canViewAll: boolean; sections: string[] }) => void;
  onCancel: () => void;
}) {
  const [sections, setSections] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sp, setSp] = useState(SP_OPTIONS[0]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canViewAll, setCanViewAll] = useState(true);

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && password.length >= 8;

  return (
    <form
      className="adm-add"
      onSubmit={e => {
        e.preventDefault();
        if (valid) onSubmit({ email: email.trim().toLowerCase(), password, sp, isAdmin, canViewAll: canViewAll || isAdmin, sections });
      }}
    >
      <div className="adm-fields">
        <label>
          <span className="label">Email</span>
          <input className="field" type="email" required autoFocus value={email} disabled={busy}
            placeholder="name@seed-malaysia.com" onChange={e => setEmail(e.target.value)} />
        </label>
        <label>
          <span className="label">Initial password</span>
          <input className="field" type="text" required minLength={8} value={password} disabled={busy}
            autoComplete="new-password" placeholder="at least 8 characters" onChange={e => setPassword(e.target.value)} />
        </label>
        <label>
          <span className="label">Salesperson</span>
          <select className="field" value={sp} disabled={busy} onChange={e => setSp(e.target.value)}>
            {SP_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="adm-checks">
        <label><input type="checkbox" checked={isAdmin} disabled={busy} onChange={e => setIsAdmin(e.target.checked)} /> Admin (manages users and files)</label>
        <label><input type="checkbox" checked={canViewAll || isAdmin} disabled={busy || isAdmin} onChange={e => setCanViewAll(e.target.checked)} /> Sees all teams <span className="adm-meta">(admins always do)</span></label>
      </div>
      {showSections && !isAdmin && (
        <div className="adm-checks" role="group" aria-label="Sections this person can open">
          <span className="label">Sections</span>
          {SECTIONS.map(s => (
            <label key={s.key}>
              <input type="checkbox" disabled={busy} checked={sections.includes(s.key)}
                onChange={e => setSections(cur => e.target.checked ? [...cur, s.key] : cur.filter(k => k !== s.key))} />
              {s.name}
            </label>
          ))}
        </div>
      )}
      <div className="adm-inline">
        <button type="submit" className="btn primary" disabled={busy || !valid}>{busy ? "Creating…" : "Create account"}</button>
        <button type="button" className="btn" disabled={busy} onClick={onCancel}>Cancel</button>
        <span className="adm-meta">Auto-confirmed. Share the password privately; they can change it with “Forgot your password?” on the sign-in page.</span>
      </div>
    </form>
  );
}
