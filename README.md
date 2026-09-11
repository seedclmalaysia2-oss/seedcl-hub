# SEED CL Malaysia — internal hub

The front door at **seedclmalaysiastore.com**. Lists every department dashboard,
behind the same sign-in your team already uses for Sales and the GM report.

## Why it's an app and not a static page

It started as one static HTML file. That can't be made private: anything in a
static page is in the HTML, so hiding the list with JavaScript would still leave
every department name and subdomain in "View source". Vercel sells Password
Protection for exactly this, at $20 per project per month — for a single shared
password.

This does the same job for nothing, and better. `src/middleware.ts` and
`src/app/page.tsx` both check the Supabase session on the server, so the list is
never sent to a browser that hasn't signed in. And because it's real accounts
rather than one shared secret: you can see who has access, people use the login
they already have, and removing someone is disabling their user instead of
changing a password for everybody.

## Setup

Environment variables, locally in `.env.local` and in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL       https://fgqiwitiqwftvfhkchpt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  the anon / publishable key
```

Both are safe in the browser — the anon key is meant to be public, and every
table is behind row level security.

In Supabase → Authentication → URL Configuration, add
`https://seedclmalaysiastore.com/login` to the redirect allow-list, or
password-reset links won't come back here.

Vercel: framework preset **Next.js** (it will detect this itself). Nothing else
to configure.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Editing the department list

`src/app/departments.ts` — one array, one entry per department. To move a
department from planned to live, change its `status` to `"live"`. The grouping,
the counts and whether the tile is a link all follow from that; there is no HTML
to hand-edit.

Palette, type scale and radii in `src/app/globals.css` come from
`gmreport/DESIGN.md`, so the hub matches the dashboards it links to.

## Who can get in

Right now: anyone with a Supabase account on the project — that is, anyone in
`app.staff`. Everyone sees all eight tiles.

The next step, when you want it, is per-department access: read the signed-in
user's `app.staff.departments` in `page.tsx` and filter the list, with
`is_admin` seeing everything. The identity layer for that already exists — see
`SUPABASE-CONSOLIDATION.md` in the Claude project. It's a change to one file.

## Security notes

- `page.tsx` calls `supabase.auth.getUser()`, which validates the token with
  Supabase rather than trusting the cookie. That check, not the middleware, is
  what guards the content — Next.js middleware has had bypass vulnerabilities,
  so it's treated as a convenience redirect only.
- `export const dynamic = "force-dynamic"` keeps the page from being prerendered
  into a static file at build time, which would defeat the whole point.
