import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { DEPARTMENTS, GROUPS, PILL_LABEL } from "./departments";
import { AdminButton } from "./admin-button";
import { SignOutButton } from "./sign-out-button";

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

  return (
    <div className="wrap">
      <div className="userbar">
        <span>{user.email}</span>
        <SignOutButton />
      </div>

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
          <AdminButton email={user.email ?? ""} isAdmin={isAdmin} />
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
  );
}
