@echo off
REM Build first, push only if the build passes.
cd /d "%~dp0"

echo.
echo === removing the obsolete cookies.ts if it is still here ===
if exist "src\lib\supabase\cookies.ts" git rm -f --ignore-unmatch "src/lib/supabase/cookies.ts"

echo.
echo === building ===
call pnpm build
if errorlevel 1 (
  echo.
  echo ============================================================
  echo  BUILD FAILED - nothing pushed. Paste the error above
  echo  to Claude; it is the same error Vercel would have hit.
  echo ============================================================
  echo.
  pause
  exit /b 1
)

echo.
echo === build passed, pushing ===
git add -A
git status --short
git commit -m "fix: annotate the cookies object with CookieMethodsServer" -m "createServerClient takes a union of two cookie-method types, and TypeScript will not contextually type a callback's parameters through a union. Annotating the variable with the single exported type gives setAll its real parameter type."
git push

echo.
echo ============================================================
echo  Pushed. Vercel will build the same thing that just passed
echo  here, so it should go green.
echo ============================================================
echo.
pause
