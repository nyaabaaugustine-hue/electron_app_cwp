@echo off
title Cyber WhatsApp Pro – Build .exe
echo.
echo  Building Windows installer (.exe)...
echo  This may take a few minutes on first run.
echo.
cd /d "%~dp0"

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js not found.  Install from https://nodejs.org
    pause & exit /b 1
)

call npm install
call npm run build:win

echo.
if exist "dist\*.exe" (
    echo  Build complete!  Installer is in the dist\ folder.
    explorer dist
) else (
    echo  Build finished - check the dist\ folder for output.
    if exist dist explorer dist
)
echo.
pause
