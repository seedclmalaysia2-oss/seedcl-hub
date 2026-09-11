@echo off
REM Commit whatever changed here and push it to GitHub.
cd /d "%~dp0"
echo.
echo === changes ===
git add -A
git status --short
echo.
echo === committing ===
git commit -m "chore: keep the single-project hub behind Vercel password protection" -m "Vercel protects whole projects rather than paths, so a separate public landing page would never be seen once protection is on. The password prompt is the front door."
echo.
echo === pushing ===
git push
echo.
echo Done. Press any key to close.
pause >nul
