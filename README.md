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

## Admin button (user control)

The **Admin** button under the "x / 8 Live" counter opens the same Users panel the
Sales dashboard has: add a user, change email, reset a password, promote or demote
an admin, restrict someone to their own data, delete. It uses the same Supabase
project, so it is the same accounts and nothing new to deploy.

- **Password prompt.** Clicking it asks the signed-in person for their own account
  password (`signInWithPassword`, checked by Supabase). A wrong password is
  rejected. Closing the dialog locks it again. There is no shared admin password
  and no new environment variable.
- **Who can use it.** Only accounts with `sp_user_map.is_admin = true`. Anyone else
  who enters their password is told the account isn't an admin.
- **Where the rule is enforced.** In Postgres, not here. Each `admin_*` function
  checks `current_user_is_admin()` and the last-admin guard is a database trigger.
  The prompt is a step-up check on top of that, not the lock.
- **Sections (which dashboards each person may open).** The Users panel has a
  Sections column of toggles, and the Add-user form has the same checkboxes. They
  edit `app.staff.departments`, the list the Account, Administration (`gm`) and
  Warehouse dashboards already check; admins can open everything. The hub also
  shows a tile as "No access" when that dashboard would refuse the person.
  - It needs `supabase/0001_department_access.sql` run once in Supabase Studio →
    SQL Editor. Until then the panel says so and no tile is locked.
  - **Sales and Human Resources don't check `departments` yet** (Sales gates on
    `sp_user_map`, HR on its own roles). Ticking them records the choice but
    doesn't stop anyone, so the hub doesn't lock those tiles (`enforced: false` in
    `departments.ts`). Make each dashboard check its key, then flip the flag.
- Files: `admin-button.tsx` (button + prompt), `admin-users.tsx` (panel),
  `departments.ts` (each tile's section key and whether it is enforced).
- Needs the Sales dashboard's migrations `0007`–`0018` to be applied (they already
  are in the shared project).

## Security notes

- `page.tsx` calls `supabase.auth.getUser()`, which validates the token with
  Supabase rather than trusting the cookie. That check, not the middleware, is
  what guards the content — Next.js middleware has had bypass vulnerabilities,
  so it's treated as a convenience redirect only.
- `export const dynamic = "force-dynamic"` keeps the page from being prerendered
  into a static file at build time, which would defeat the whole point.
