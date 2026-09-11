@echo off
REM Double-click to push this folder to GitHub.
cd /d "%~dp0"
echo.
echo === adding the remote (safe to see "already exists") ===
git remote add origin https://github.com/seedclmalaysia2-oss/seedcl-hub.git
echo.
echo === pushing to main ===
git push -u origin main
echo.
echo === what is on the branch now ===
git ls-files
echo.
echo Done. Press any key to close.
pause >nul
