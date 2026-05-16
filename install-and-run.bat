@echo off
title Cyber WhatsApp Pro – Desktop Setup
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   Cyber WhatsApp Pro  –  Desktop App     ║
echo  ║   First-time setup                       ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js is not installed.
    echo  Please download it from https://nodejs.org ^(LTS version^)
    echo  and run this script again.
    pause
    exit /b 1
)

echo  Node.js found: 
node --version

echo.
echo  Installing dependencies...
cd /d "%~dp0"
call npm install

if %ERRORLEVEL% neq 0 (
    echo  [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo  ✓ Dependencies installed.
echo.
echo  Launching Cyber WhatsApp Pro Desktop...
echo.
call npm start
