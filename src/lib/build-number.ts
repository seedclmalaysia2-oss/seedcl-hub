// The running build label in the top bar, e.g. "202611 build 00017" (the SEED
// house format: month it went live, then a running number). Vercel builds have
// no git history, so the number can't be counted from commits at build time.
// Each live (production) deployment takes the next number the first time anyone
// opens the hub, kept in the shared table public.app_build (app, sha, n,
// went_live), the same table the Sales dashboard uses. Preview deployments,
// `next dev`, or any failure give null, and the bar then says "test build".
//
// public.app_build has RLS on with no policies, so only the service role reads
// or writes it. Server only: the key never reaches the browser.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP = "seedcl-hub";
/** Commits on main before this scheme started (21 Nov 2026); the first live build is 17. */
const BEFORE = 16;
const SHA = process.env.VERCEL_GIT_COMMIT_SHA || "";
const LIVE = process.env.VERCEL_ENV === "production";

type Row = { n: number; went_live: string };

async function sb(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function readRow(): Promise<Row | null> {
  const r = await sb(`app_build?app=eq.${APP}&sha=eq.${encodeURIComponent(SHA)}&select=n,went_live`);
  if (!r.ok) throw new Error(`app_build read ${r.status}`);
  return ((await r.json()) as Row[])[0] ?? null;
}

async function assign(): Promise<string | null> {
  let row = await readRow();
  if (!row) {
    const r = await sb(`app_build?app=eq.${APP}&select=n&order=n.desc&limit=1`);
    if (!r.ok) throw new Error(`app_build max ${r.status}`);
    const max = ((await r.json()) as { n: number }[])[0]?.n;
    const n = (Number.isFinite(max) ? max : BEFORE) + 1;
    // Two first views at once: the second insert is ignored and both read the same row.
    const ins = await sb("app_build?on_conflict=app,sha", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ app: APP, sha: SHA, n }),
    });
    if (!ins.ok) throw new Error(`app_build insert ${ins.status}`);
    row = await readRow();
  }
  const n = Number(row?.n);
  if (!row || !Number.isFinite(n)) return null;
  // The month the build went live, in Malaysia time (UTC+8).
  const month = new Date(new Date(row.went_live).getTime() + 8 * 3600_000).toISOString().slice(0, 7).replace("-", "");
  return `${month} build ${String(n).padStart(5, "0")}`;
}

// One lookup per server instance; a failure is not cached, so the next view retries.
let cached: Promise<string | null> | null = null;

export async function buildLabel(): Promise<string | null> {
  if (!LIVE || !SHA || !SUPABASE_URL || !SERVICE_KEY) return null;
  cached ??= assign().catch(() => { cached = null; return null; });
  return cached;
}
