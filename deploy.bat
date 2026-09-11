@echo off
REM Double-click this file to deploy the hub.
REM It just runs deploy.ps1 without you having to open PowerShell yourself.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
echo.
echo Done. Press any key to close.
pause >nul
