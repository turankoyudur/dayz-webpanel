@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem --- Always run from project root (…\panel) ---
cd /d "%~dp0\..\.."
set "ROOT=%cd%"

rem --- Validate root ---
if not exist "%ROOT%\package.json" (
  echo [FATAL] package.json not found. Root: "%ROOT%"
  pause
  exit /b 2
)

rem --- Logs ---
set "LOG_DIR=%ROOT%\data\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%i"
set "LOG_FILE=%LOG_DIR%\start-%TS%.log"

call :log "=== DayZ Web Panel Start ==="
call :log "Root: %ROOT%"

call :log "Ensuring Prisma client + DB schema (db:setup)..."
call npm run db:setup >> "%LOG_FILE%" 2>&1
if errorlevel 1 goto :error

call :log "Checking build output..."
rem Both server (dist\server\node-build.mjs) and client (dist\spa\index.html) are required.
rem Checking only the server build can skip a necessary client build and lead to a blank page.
if not exist "%ROOT%\dist\server\node-build.mjs" ( set "NEED_BUILD=1" ) else ( set "NEED_BUILD=" )
if not exist "%ROOT%\dist\spa\index.html" ( set "NEED_BUILD=1" )

if defined NEED_BUILD (
  call :log "Build not found or incomplete. Running build..."
  call npm run build >> "%LOG_FILE%" 2>&1
  if errorlevel 1 goto :error
) else (
  call :log "Build exists. Skipping build."
)

call :log "Starting server..."
node "%ROOT%\dist\server\node-build.mjs" >> "%LOG_FILE%" 2>&1

set "CODE=%errorlevel%"
call :log "Server process exited with code %CODE%."
pause
exit /b %CODE%

:error
set "CODE=%errorlevel%"
call :log "ERROR: start failed with code %CODE%."
call :log "Log file: %LOG_FILE%"
echo.
echo Start failed. Log: %LOG_FILE%
pause
exit /b %CODE%

:log
echo [%date% %time%] %~1>> "%LOG_FILE%"
echo %~1
exit /b 0
