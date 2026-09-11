# Deploy the SEED CL hub to Vercel.
#
# Run from PowerShell inside this folder:
#     powershell -ExecutionPolicy Bypass -File .\deploy.ps1
#
# It commits the folder to git and deploys it to Vercel. The Vercel step opens
# your browser to sign in the first time; after that it remembers you.
# Attaching the domain is the one manual step at the end — Vercel needs you to
# confirm it, and it takes about thirty seconds.

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "`n=== 1/3  git ===" -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    git init
    git branch -M main
}
git add -A
# Nothing staged means nothing changed since the last run — not an error.
if (git diff --cached --quiet) {
    Write-Host "No changes to commit." -ForegroundColor DarkGray
} else {
    git commit -m "feat: hub landing page for seedclmalaysiastore.com" -m @"
One static page listing all eight department dashboards, grouped by real
status rather than eight identical 'coming soon' cards. Sales and
Administration link out; the rest are marked in-build or queued.

No build step, no dependencies, no auth, no data.
"@
}

Write-Host "`n=== 2/3  deploy ===" -ForegroundColor Cyan
Write-Host "If this is the first run, a browser window will open to sign in to Vercel." -ForegroundColor DarkGray
npx --yes vercel@latest --prod --yes

Write-Host "`n=== 3/3  attach the domain ===" -ForegroundColor Cyan
Write-Host @"
The deployment is live on its own .vercel.app URL. To put it on the real domain:

  Vercel -> this project -> Settings -> Domains
  Add:  seedclmalaysiastore.com
  Add:  www.seedclmalaysiastore.com

DNS already points at Vercel, so both should verify immediately rather than
making you wait for propagation. Your sales. and gmdashboard. subdomains are
separate records and are not affected.

Or do it from here without leaving the terminal:
  npx vercel domains add seedclmalaysiastore.com
  npx vercel domains add www.seedclmalaysiastore.com
"@ -ForegroundColor Yellow
