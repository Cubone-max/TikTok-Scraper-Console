@echo off
setlocal

cd /d "%~dp0"

echo.
echo ========================================
echo   TikTok Scraper - Web Console
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [Error] Node.js was not found. Please install Node.js 20 or later.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [Error] npm was not found. Please reinstall Node.js.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [Step] Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo [Error] Dependency installation failed.
    pause
    exit /b 1
  )
)

if not exist "dist\server.js" (
  echo [Step] Building project...
  call npm.cmd run build
  if errorlevel 1 (
    echo [Error] Build failed.
    pause
    exit /b 1
  )
)

echo [Tip] If this is the first run and Playwright browser is missing, run:
echo       npx playwright install chromium
echo.
echo [Start] Web console: http://localhost:6767
echo [Tip] Close this window to stop the server.
echo.

start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:6767'"
node dist\server.js

pause
