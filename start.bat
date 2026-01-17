@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

echo =============================================================
echo DayZ Local Panel - Start
echo =============================================================
echo.

REM Ensure Node exists (portable LTS if needed)
call scripts\ensure-node.bat
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js setup failed.
  exit /b 1
)

REM If the build output is missing, build once.
if not exist "apps\web\dist\index.html" (
  echo [INFO] Web build not found. Running build...
  call scripts\with-node.bat npm run build
  if errorlevel 1 exit /b 1
)

if not exist "apps\server\dist\index.js" (
  echo [INFO] Server build not found. Running build...
  call scripts\with-node.bat npm run build
  if errorlevel 1 exit /b 1
)

echo.
echo [INFO] Opening browser: http://localhost:8081
start "" "http://localhost:8081"

echo.
echo [INFO] Starting DayZ Local Panel server...
call scripts\with-node.bat npm run start
