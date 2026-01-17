@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM =============================================================
REM scripts\ensure-node.bat
REM
REM This script guarantees that a usable Node.js exists.
REM
REM Priority order:
REM 1) If .\tools\node\current\node.exe exists, use it.
REM 2) If a system Node.js exists (node.exe on PATH) AND version >= 18, use it.
REM 3) Otherwise download a portable Node.js LTS zip from nodejs.org and extract to .\tools\node\current
REM
REM Why:
REM - You asked for a 1-click install with minimal manual steps.
REM - This avoids the pnpm/corepack PowerShell script policy issue you hit earlier.
REM =============================================================

cd /d "%~dp0\.."

set "LOCAL_NODE=%CD%\tools\node\current\node.exe"
if exist "%LOCAL_NODE%" (
  echo [OK] Using portable Node.js at: %LOCAL_NODE%
  exit /b 0
)

REM Check if system Node is available and modern enough.
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $v = node -p \"process.versions.node\"; if ([version]$v -ge [version]'18.0.0') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if %errorlevel%==0 (
  echo [OK] Using system Node.js from PATH.
  exit /b 0
)

echo [INFO] Node.js not found (or too old). Downloading portable Node.js LTS...

powershell -NoProfile -ExecutionPolicy Bypass -Command "
$ErrorActionPreference = 'Stop';
$root = Get-Location;
$tools = Join-Path $root 'tools\\node';
New-Item -ItemType Directory -Force -Path $tools | Out-Null;

# Fetch official Node.js versions list (newest first)
$index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json';
$latestLts = $index | Where-Object { $_.lts -ne $null -and $_.lts -ne $false } | Select-Object -First 1;
$ver = $latestLts.version;

$zipName = "node-$ver-win-x64.zip";
$url = "https://nodejs.org/dist/$ver/$zipName";

$tmpZip = Join-Path $tools 'node.zip';
Write-Host "Downloading $url";
Invoke-WebRequest -Uri $url -OutFile $tmpZip;

$extract = Join-Path $tools 'extract';
if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
Expand-Archive -Path $tmpZip -DestinationPath $extract -Force;

# The zip contains a single folder like node-v22.x.x-win-x64
$folder = Get-ChildItem $extract | Where-Object { $_.PSIsContainer } | Select-Object -First 1;
if (-not $folder) { throw 'Could not find extracted Node folder.' }

$current = Join-Path $tools 'current';
if (Test-Path $current) { Remove-Item $current -Recurse -Force }
Move-Item -Path $folder.FullName -Destination $current;

Remove-Item $tmpZip -Force;
Remove-Item $extract -Recurse -Force;

Write-Host "[OK] Installed portable Node.js $ver to $current";
" 
if errorlevel 1 (
  echo [ERROR] Portable Node.js download/install failed.
  exit /b 1
)

if exist "%LOCAL_NODE%" (
  echo [OK] Portable Node.js ready.
  exit /b 0
)

echo [ERROR] Node.js still not available after download.
exit /b 1
