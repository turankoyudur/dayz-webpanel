@echo off
setlocal enabledelayedexpansion

REM ==============================================================
REM DayZ Web Panel - Installer for Windows 11
REM - Installs NodeJS LTS (via winget) if missing
REM - Installs npm deps
REM - Creates .env from .env.example (if missing)
REM - Initializes database (prisma db push)
REM - Builds the project
REM
REM All output is logged to .\data\logs\install-YYYYMMDD-HHMMSS.log
REM ==============================================================

set ROOT=%~dp0..\..
cd /d "%ROOT%"

REM --- basic sanity ---
if not exist "package.json" (
  echo ERROR: package.json not found. Please run from the project root.
  exit /b 2
)

if not exist "data\logs" mkdir "data\logs"

REM --- locale-safe timestamp (avoids Turkish date formats breaking filenames) ---
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set TS=%%i
set LOGFILE=data\logs\install-%TS%.log

call :log "=== DayZ Web Panel Installer started ==="
call :log "Working dir: %CD%"

REM --- winget check ---
where winget >nul 2>nul
if errorlevel 1 (
  call :log "ERROR: winget not found. Please install App Installer from Microsoft Store."
  exit /b 10
)

REM --- node check ---
where node >nul 2>nul
if errorlevel 1 (
  call :log "NodeJS not found. Installing NodeJS LTS via winget..."
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements >>"%LOGFILE%" 2>&1
  if errorlevel 1 (
    call :log "ERROR: NodeJS installation failed. See log: %LOGFILE%"
    exit /b 11
  )
) else (
  call :log "NodeJS found."
)

REM --- npm check ---
where npm >nul 2>nul
if errorlevel 1 (
  call :log "ERROR: npm not found, Node install may be incomplete."
  exit /b 12
)

REM --- .env bootstrap ---
if not exist ".env" (
  if exist ".env.example" (
    copy /y ".env.example" ".env" >>"%LOGFILE%" 2>&1
    call :log "Created .env from .env.example"
  ) else (
    call :log "ERROR: .env.example missing."
    exit /b 13
  )
) else (
  call :log ".env already exists."
)

REM --- install deps (prefer pnpm; fallback to npm) ---
call :log "Installing dependencies (pnpm preferred, npm fallback)..."
where pnpm >nul 2>nul
if errorlevel 1 (
  call :log "pnpm not found. Enabling corepack + preparing pnpm..."
  call corepack enable >>"%LOGFILE%" 2>&1
  if errorlevel 1 (
    call :log "WARN: corepack enable failed. Falling back to npm install."
    goto :npm_install
  )
  call corepack prepare pnpm@10.14.0 --activate >>"%LOGFILE%" 2>&1
  if errorlevel 1 (
    call :log "WARN: corepack prepare failed. Falling back to npm install."
    goto :npm_install
  )
)

call :log "Running pnpm install --frozen-lockfile..."
call pnpm install --frozen-lockfile >>"%LOGFILE%" 2>&1
if errorlevel 1 (
  call :log "WARN: pnpm install failed. Falling back to npm install (with devDependencies)."
  goto :npm_install
)
goto :deps_done

:npm_install
if exist "package-lock.json" (
  call :log "Running npm ci (package-lock.json detected)..."
  call npm ci >>"%LOGFILE%" 2>&1
) else (
  call :log "Running npm install --include=dev..."
  call npm install --include=dev >>"%LOGFILE%" 2>&1
)
if errorlevel 1 (
  call :log "ERROR: npm install failed. See log: %LOGFILE%"
  exit /b 14
)
:deps_done

REM --- init DB ---
call :log "Initializing DB (prisma generate + db push)..."
call npm run db:setup >>"%LOGFILE%" 2>&1
if errorlevel 1 (
  call :log "ERROR: DB init failed. See log: %LOGFILE%"
  exit /b 15
)

REM --- build ---
call :log "Building (client + server)..."
call npm run build >>"%LOGFILE%" 2>&1
if errorlevel 1 (
  call :log "ERROR: Build failed. See log: %LOGFILE%"
  exit /b 16
)

call :log "SUCCESS: Install complete."
call :log "Next: run scripts\windows\start.bat"
exit /b 0

:log
echo [%date% %time%] %~1
echo [%date% %time%] %~1>>"%LOGFILE%"
exit /b 0
