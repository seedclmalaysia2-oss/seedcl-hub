# SEED CL Malaysia — internal hub

One page listing every department dashboard, at **seedclmalaysiastore.com**,
behind a shared password.

```
index.html     the whole site — HTML, CSS and the department list, one file
vercel.json    apex redirect + security headers
```

## How the privacy works

The site is internal, so the whole Vercel project has **Password Protection**
turned on (Project → Settings → Deployment Protection). Visitors get Vercel's
password prompt before any HTML is sent; only after entering it do they reach the
department list.

That last part is the important bit. Protection has to happen at the server, not
in the page: anything in a static file is in the HTML, so hiding the list with
JavaScript would still leave every department name and subdomain sitting in
"View source" for anyone who looked. Vercel refuses the request outright, which
is why this actually works.

Protection is a per-**project** switch — it covers every URL the project serves,
and cannot be applied to one path while leaving another open. That is why there
is no separate public landing page: with protection on, nobody would ever see it.
The password prompt is the front door.

## What a shared password does and doesn't give you

It locks the door. It does not tell you who came through it, it cannot give
different people different access, and when someone leaves the company you change
it for everybody. That is a fair trade for a page that only lists links — but it
is the reason the "Later" section below exists.

## Vercel setup

- Framework preset **Other**, build command and output directory both empty
- Domains: `seedclmalaysiastore.com`, `www.seedclmalaysiastore.com`
- Deployment Protection → Password Protection **on** (Pro plan feature)
- Connected to `seedclmalaysia2-oss/seedcl-hub` so pushes redeploy automatically

## Editing the department list

Every department is one block in `index.html`. To move one from planned to live:

1. Change the wrapper from `<div class="dept planned">` to
   `<a class="dept" href="https://hr.seedclmalaysiastore.com">`, and its closing
   `</div>` to `</a>`.
2. Swap the pill: `<span class="pill queued">` → `<span class="pill live">`, and
   the label text to `Live`.
3. Move the block into the **In service** group and update the three counts: the
   `2 / 8` in the masthead and the `<span class="n">` on each group heading.

Palette, type scale and radii come from `gmreport/DESIGN.md`, so the hub matches
the dashboards it links to. Colours are CSS custom properties at the top of
`index.html` — change them there, nowhere else.

## Later

When this becomes a Next.js app on Supabase Auth (see `SUPABASE-CONSOLIDATION.md`
in the Claude project), the shared password goes away: people sign in with the
same account they already use for Sales and GM, each person sees only the
departments in their `app.staff.departments`, and admins see all eight. At that
point the protection moves from the Vercel project switch into the app itself,
which is what makes per-person access possible.
