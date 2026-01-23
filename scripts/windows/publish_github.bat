@echo off
setlocal enabledelayedexpansion

rem ============================================================
rem publish_github.bat
rem Publishes this project to your GitHub repo using git + gh.
rem - Installs Git and GitHub CLI (gh) via winget if missing
rem - Clones the target repo
rem - Copies current project files into the repo
rem - Commits and pushes to a branch, then prints PR command
rem
rem Usage:
rem   You can double-click this file from anywhere.
rem   It will automatically switch to the project root (where package.json exists).
rem ============================================================

rem --- Resolve paths (works even when double-clicked) ---
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..\..

rem Normalize to an absolute path by pushd/popd
pushd "%PROJECT_ROOT%" >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Proje kok dizinine gecilemedi: %PROJECT_ROOT%
  exit /b 1
)
set PROJECT_ROOT=%CD%
popd >nul

set LOG_DIR=%PROJECT_ROOT%\data\logs
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set LOG_FILE=%LOG_DIR%\publish-github-%date:~-4%%date:~3,2%%date:~0,2%-%time:~0,2%%time:~3,2%%time:~6,2%.log
set LOG_FILE=%LOG_FILE: =0%

call :log "[INFO] Starting publish script"

rem --- CONFIG ---
rem Default target repo (you can edit this line if you want a different repo)
set REPO_URL=https://github.com/turankoyudur/dayz-webpanel-new.git
set BRANCH=gpt-v0.1-foundation
set WORKDIR=%PROJECT_ROOT%\_publish_repo

rem --- Check winget ---
where winget >nul 2>nul
if errorlevel 1 (
  call :log "[ERROR] winget not found. Install App Installer from Microsoft Store."
  echo winget bulunamadi. Microsoft Store > App Installer yukleyin.
  exit /b 1
)

rem --- Ensure git ---
where git >nul 2>nul
if errorlevel 1 (
  call :log "[INFO] Git not found. Installing via winget..."
  winget install --id Git.Git -e --source winget >> "%LOG_FILE%" 2>&1
)

where git >nul 2>nul
if errorlevel 1 (
  call :log "[ERROR] Git install failed or git not in PATH."
  echo Git kurulumu basarisiz.
  exit /b 1
)

rem --- Ensure gh ---
where gh >nul 2>nul
if errorlevel 1 (
  call :log "[INFO] GitHub CLI (gh) not found. Installing via winget..."
  winget install --id GitHub.cli -e --source winget >> "%LOG_FILE%" 2>&1
)

where gh >nul 2>nul
if errorlevel 1 (
  call :log "[WARN] gh not available. You can still push with git, but PR creation will be manual."
)

rem --- Switch to project root and verify ---
pushd "%PROJECT_ROOT%" >nul
if not exist "%CD%\package.json" (
  call :log "[ERROR] package.json not found. Run this script from project root."
  echo package.json bulunamadi. Script proje kok dizinini bulamadi: %PROJECT_ROOT%
  popd
  exit /b 1
)

rem Capture absolute source directory BEFORE we cd into WORKDIR
set SOURCE_DIR=%CD%
popd >nul

rem --- Clean workdir ---
if exist "%WORKDIR%" (
  call :log "[INFO] Removing existing workdir: %WORKDIR%"
  rmdir /s /q "%WORKDIR%" >> "%LOG_FILE%" 2>&1
)
mkdir "%WORKDIR%" >> "%LOG_FILE%" 2>&1

rem --- Clone repo ---
call :log "[INFO] Cloning repo: %REPO_URL%"
git clone "%REPO_URL%" "%WORKDIR%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :log "[ERROR] git clone failed. Check your credentials / network."
  echo git clone basarisiz. Log: %LOG_FILE%
  exit /b 1
)

pushd "%WORKDIR%"

rem --- Checkout branch ---
call :log "[INFO] Checking out branch: %BRANCH%"
git checkout -B "%BRANCH%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :log "[ERROR] git checkout failed."
  echo git checkout basarisiz. Log: %LOG_FILE%
  popd
  exit /b 1
)

rem --- Copy files from source to repo ---
call :log "[INFO] Copying project files into repo (excluding node_modules/dist/.env/data\\app.db/logs)"

rem robocopy returns codes: 0-7 are OK-ish, >=8 is failure
robocopy "%SOURCE_DIR%" "%WORKDIR%" /E /NFL /NDL /NJH /NJS /NC /NS /NP ^
  /XD node_modules dist dist-ssr .git _publish_repo data\\logs ^
  /XF .env data\\app.db *.log >> "%LOG_FILE%" 2>&1
set RC=%ERRORLEVEL%
if %RC% GEQ 8 (
  call :log "[ERROR] robocopy failed with code %RC%"
  echo robocopy basarisiz. Log: %LOG_FILE%
  popd
  exit /b 1
)

rem --- Commit ---
call :log "[INFO] Creating commit"
git add -A >> "%LOG_FILE%" 2>&1

git commit -m "DayZ Web Panel v0.1 foundation" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :log "[WARN] Commit may have failed (maybe no changes). Continuing..."
)

rem --- Push ---
call :log "[INFO] Pushing branch to origin"
git push -u origin "%BRANCH%" --force >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :log "[ERROR] git push failed."
  echo git push basarisiz. Log: %LOG_FILE%
  popd
  exit /b 1
)

call :log "[INFO] Push successful."

rem --- PR suggestion ---
where gh >nul 2>nul
if not errorlevel 1 (
  call :log "[INFO] You can create PR via gh"
  echo.
  echo PR olusturmak icin:
  echo   gh pr create --base main --head %BRANCH% --title "DayZ Web Panel v0.1" --body "Initial modular foundation"
) else (
  echo.
  echo PR icin GitHub'da su branch'i sec: %BRANCH%
)

echo.
echo OK. Log dosyasi: %LOG_FILE%

popd
exit /b 0

:log
echo %~1
echo %date% %time% %~1>> "%LOG_FILE%"
exit /b 0
