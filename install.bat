@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

echo =============================================================
echo DayZ Local Panel - Installer (Windows 11)
echo =============================================================
echo.

echo [0/3] Ensuring Node.js (portable LTS if needed)...
call scripts\ensure-node.bat
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js setup failed.
  exit /b 1
)

echo.
echo [1/3] Installing dependencies (npm install)...
call scripts\with-node.bat npm install
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed.
  exit /b 1
)

echo.
echo [2/3] Building web + server (npm run build)...
call scripts\with-node.bat npm run build
if errorlevel 1 (
  echo.
  echo [ERROR] Build failed.
  exit /b 1
)

echo.
echo [3/3] Initializing local data (npm run setup)...
call scripts\with-node.bat npm run setup
if errorlevel 1 (
  echo.
  echo [ERROR] Setup failed.
  exit /b 1
)

echo.
echo ✅ Install complete.
echo.
echo Next step:
echo   - Run start.bat
echo.
echo First login credentials:
echo   - data\SystemConfig\FIRST_RUN_CREDENTIALS.txt
echo.
pause
