@echo off
REM ============================================================
REM  Switch the hub repo from the old static page to the Next.js
REM  app, then push. Run this once, after the new files land.
REM ============================================================
cd /d "%~dp0"

echo.
echo === removing the old static files ===
if exist index.html  git rm -f --ignore-unmatch index.html
if exist deploy.bat  git rm -f --ignore-unmatch deploy.bat
if exist deploy.ps1  git rm -f --ignore-unmatch deploy.ps1
if exist push.bat    git rm -f --ignore-unmatch push.bat
if exist push2.bat   git rm -f --ignore-unmatch push2.bat
if exist hub\NUL (
  git rm -r -f --ignore-unmatch hub
  rmdir /s /q hub
)

echo.
echo === staging everything else ===
git add -A
git status --short

echo.
echo === committing ===
git commit -m "feat: replace the static page with a Supabase-authenticated app" -m "A static page cannot be made private - the list would sit in the HTML for anyone who opened View source. This verifies the Supabase session server-side instead, using the accounts staff already have, and costs nothing."

echo.
echo === pushing ===
git push

echo.
echo ============================================================
echo  Pushed. Two things left, both in the browser:
echo.
echo   1. Vercel -^> seedcl-hub -^> Settings -^> Environment Variables
echo        NEXT_PUBLIC_SUPABASE_URL
echo        NEXT_PUBLIC_SUPABASE_ANON_KEY
echo      (Supabase -^> salesreport -^> Settings -^> API)
echo.
echo   2. Supabase -^> Authentication -^> URL Configuration
echo      add  https://seedclmalaysiastore.com/login
echo.
echo  Claude can do both - just say so.
echo ============================================================
echo.
pause
