# SEED CL Malaysia — Internal Hub

The front door at **seedclmalaysiastore.com**. One static page that links out to each
department dashboard. No build step, no dependencies, no data, no auth — so it cannot
break the live department sites and it deploys in about two minutes.

## Files

```
index.html     the whole site — HTML, CSS and the department list, one file
vercel.json    apex redirect + security headers
```

## Deploy

### Option A — GitHub + Vercel (recommended, gives you one-click updates)

1. Create a new repo `seedclmalaysia2-oss/hub` on GitHub, push this folder to it.
2. Vercel → **New Project** → import `seedclmalaysia2-oss/hub`.
3. Framework preset: **Other**. Leave build command and output directory empty.
4. Deploy.
5. Project → **Settings → Domains** → add `seedclmalaysiastore.com` and
   `www.seedclmalaysiastore.com`. Vercel prints the DNS records to add.

### Option B — Vercel CLI (no GitHub)

```bash
npm i -g vercel
cd seedcl-hub
vercel --prod
```

Then add the domain in Settings → Domains as above.

## DNS

The two department subdomains already resolve to their own Vercel projects. Adding
the apex domain here does **not** touch them — they are separate records.

| Record | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` (Vercel prints the current value — use theirs, not this) |
| CNAME | `www` | `cname.vercel-dns.com` |

Leave the existing `sales` and `gmdashboard` records exactly as they are.

## Editing the department list

Every department is one block in `index.html`. To move one from planned to live:

1. Change the wrapper from `<div class="dept planned">` to
   `<a class="dept" href="https://hr.seedclmalaysiastore.com">`, and its closing tag
   from `</div>` to `</a>`.
2. Swap the pill: `<span class="pill queued">` → `<span class="pill live">`, and the
   label text to `Live`.
3. Move the block into the **In service** section and update the three counts: the
   `2 / 8` in the masthead and the `<span class="n">` on each group heading.

The palette, type scale and radii are taken from `gmreport/DESIGN.md` so the hub
matches the department dashboards. Colours are CSS custom properties at the top of
`index.html` — change them there, nowhere else.

## Deliberate non-goals for v1

- **No auth.** The page lists destinations; each department app authenticates its own
  users. Nothing sensitive is on this page.
- **No live data.** Status is hand-edited. It changes a few times a year.
- **No framework.** Adding React here would mean a build step and a deploy pipeline
  for a page that is one screen of static text.

When single sign-on lands (see `ARCHITECTURE.md` in the Claude project), this page
gains a session check and hides tiles the signed-in user cannot open. That is the
point at which it may be worth moving to Next.js — not before.
