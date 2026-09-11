import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { DEPARTMENTS, GROUPS, PILL_LABEL } from "./departments";
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

  const liveCount = DEPARTMENTS.filter(d => d.status === "live").length;

  return (
    <div className="wrap">
      <div className="userbar">
        <span>{user.email}</span>
        <SignOutButton />
      </div>

      <header className="masthead">
        <div className="mark">SC</div>
        <div>
          <h1>SEED CL Malaysia — Internal Hub</h1>
          <p>
            One door to every department dashboard. Each team runs on its own
            subdomain and shares this sign-in.
          </p>
        </div>
        <div className="spacer" />
        <div className="count">
          <div className="num">{liveCount} / {DEPARTMENTS.length}</div>
          <div className="label">Live</div>
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
                const inner = (
                  <>
                    <div className="dept-top">
                      <h2>{dept.name}</h2>
                      <span className={`pill ${dept.status}`}>
                        <span className="dot" />
                        {PILL_LABEL[dept.status]}
                      </span>
                    </div>
                    <p className="desc">{dept.description}</p>
                    <div className="host">
                      {dept.status === "live" && <span className="arrow">→</span>}
                      {dept.host}
                    </div>
                  </>
                );
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
