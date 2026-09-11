@echo off
REM Commit whatever changed in this folder and push it.
REM The repo is connected to Vercel, so the push triggers a build.
cd /d "%~dp0"
echo.
echo === changes ===
git add -A
git status --short
echo.
echo === committing ===
git commit -m "fix: union contextual-typing error in the Supabase cookie adapters" -m "createServerClient's cookies option is a union type, so an arrow function's parameters could not be contextually typed and next build rejected them as implicit any. Method shorthand fixes it."
echo.
echo === pushing ===
git push
echo.
echo ============================================================
echo  Pushed. Vercel builds automatically - watch it at
echo  vercel.com  ^-^>  seedcl-hub  ^-^>  Deployments
echo ============================================================
echo.
echo Press any key to close.
pause >nul
