import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { DEPARTMENTS, GROUPS, PILL_LABEL } from "./departments";
import { AdminButton } from "./admin-button";
import { SignOutButton } from "./sign-out-button";
import { RefreshButton } from "./refresh-button";
import { buildLabel } from "@/lib/build-number";

function initials(name: string) {
  const w = name.trim().split(/[\s._-]+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? "")).toUpperCase() || "?";
}

// Never prerender: the page depends on who is asking.
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await supabaseServer();
  // getUser() validates the token with Supabase rather than trusting the
  // cookie, which is what makes it safe to gate on. The middleware redirects
  // too, but this second check is the one that actually guards the content.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Same role flag the Sales dashboard uses. RLS lets a user read only their own
  // row, and if the read fails we treat the account as a non-admin. This decides
  // what the Admin dialog shows; the admin_* functions enforce it in Postgres.
  const { data: profile } = await supabase
    .from("sp_user_map")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  const isAdmin = !!profile?.is_admin;

  // Which sections this person may open: app.staff.departments, read through a
  // definer function because the `app` schema isn't exposed. A tile is only
  // locked when that dashboard really refuses the person (`enforced`), and never
  // when the answer is unavailable (function not installed, or the call failed):
  // the dashboards are the boundary, this just keeps the hub honest.
  const { data: accessRows, error: accessError } = await supabase.rpc("my_department_access");
  const staff = (accessRows as { departments: string[] | null; is_admin: boolean; active: boolean }[] | null)?.[0];
  const seesAll = isAdmin || !!(staff?.active && staff.is_admin);
  const mayOpen = (d: { key: string; enforced: boolean }) =>
    !!accessError || seesAll || !d.enforced || !!(staff?.active && staff.departments?.includes(d.key));

  const liveCount = DEPARTMENTS.filter(d => d.status === "live").length;
  const build = await buildLabel();
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const name = meta.full_name || meta.name || (user.email ?? "").split("@")[0];
  const role = seesAll ? "Admin" : "Staff";

  return (
    <>
    {/* SEED top navigation (house standard, as on every SEED dashboard): logo, app
        pill, build and refresh on the left; the hub's own buttons in the middle;
        who is signed in and the exit icon at the right end. */}
    <header className="tb">
      <div className="tb-left">
        <a className="tb-brand" href="/" aria-label="SEED CL HUB, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tb-logo" src="/seed-logo.png" alt="" width={58} height={30} />
        </a>
        <span className="tb-pill">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
          </svg>
          SEED CL HUB
        </span>
        <span className="tb-build">{build ?? "test build"}</span>
        <RefreshButton />
      </div>
      <nav className="tb-nav" aria-label="Top bar">
        <a className="tb-link" href="/" aria-current="page">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" />
          </svg>
          Dashboards
        </a>
        <AdminButton email={user.email ?? ""} isAdmin={isAdmin} />
      </nav>
      <div className="tb-right">
        <div className="tb-who" aria-label="Signed in as">
          <span className="tb-avatar" aria-hidden="true">{initials(name)}</span>
          <span className="tb-who-text">
            <span className="tb-name" title={user.email ?? name}>{name}</span>
            <span className="tb-role">{role}</span>
          </span>
        </div>
        <SignOutButton icon />
      </div>
    </header>
    <div className="wrap">

      <header className="masthead">
        <div className="mark">SC</div>
        <div className="masthead-title">
          <h1>SEED CL Malaysia — Internal Hub</h1>
          <p>
            One door to every department dashboard. Each team runs on its own
            subdomain and shares this sign-in.
          </p>
        </div>
        <div className="spacer" />
        <div className="masthead-side">
          <div className="count">
            <div className="num">{liveCount} / {DEPARTMENTS.length}</div>
            <div className="label">Live</div>
          </div>
        </div>
      </header>

      {GROUPS.map(group => {
        const items = DEPARTMENTS.filter(d => d.status === group.key);
        if (items.length === 0) return null;
        return (
          <section className="group" key={group.key}>
            <div className="group-head">
              <span className="label">{group.label}</span>
              <span className="rule" />
              <span className="n">{items.length}</span>
            </div>
            <div className="grid">
              {items.map(dept => {
                const locked = dept.status === "live" && !mayOpen(dept);
                const inner = (
                  <>
                    <div className="dept-top">
                      <h2>{dept.name}</h2>
                      {locked ? (
                        <span className="pill noaccess">
                          <span className="dot" />
                          No access
                        </span>
                      ) : (
                        <span className={`pill ${dept.status}`}>
                          <span className="dot" />
                          {PILL_LABEL[dept.status]}
                        </span>
                      )}
                    </div>
                    <p className="desc">{dept.description}</p>
                    <div className="host">
                      {dept.status === "live" && !locked && <span className="arrow">→</span>}
                      {locked ? "Ask an admin to add this section to your account" : dept.host}
                    </div>
                  </>
                );
                if (locked) {
                  return (
                    <div className="dept planned locked" key={dept.name} aria-disabled="true">
                      {inner}
                    </div>
                  );
                }
                return dept.status === "live" ? (
                  <a className="dept" key={dept.name} href={`https://${dept.host}`}>
                    {inner}
                  </a>
                ) : (
                  <div className="dept planned" key={dept.name}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="foot">
        <span><span className="key">Live</span> — in daily use</span>
        <span><span className="key">In build</span> — code exists, not deployed</span>
        <span><span className="key">Queued</span> — not started</span>
      </div>
    </div>
    </>
  );
}
