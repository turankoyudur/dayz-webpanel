Param(
  # Output zip path. Default: <repoRoot>\release\dayz-web-panel-panel-only-v<version>-YYYYMMDD-HHMMSS.zip
  [string]$Out = "",
  # If set, include dist/ in the ZIP. Default: exclude dist/ (user will build locally).
  [switch]$IncludeDist
)

$ErrorActionPreference = "Stop"

Write-Host "=== DayZ Web Panel | Release ZIP ==="

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$Ts = Get-Date -Format "yyyyMMdd-HHmmss"

# Read version from package.json (SemVer recommended)
$Ver = "0.0.0"
try {
  $pkg = Get-Content (Join-Path $Root "package.json") -Raw | ConvertFrom-Json
  if ($pkg.version) { $Ver = $pkg.version }
} catch {
  $Ver = "0.0.0"
}

if ([string]::IsNullOrWhiteSpace($Out)) {
  $Out = Join-Path $Root "release\dayz-web-panel-panel-only-v$Ver-$Ts.zip"
}

$Stage = Join-Path $Root ".release_stage"

# 1) Clean stage
if (Test-Path $Stage) {
  Remove-Item -Recurse -Force $Stage
}
New-Item -ItemType Directory -Path $Stage | Out-Null

# 2) Exclusions
$excludeDirs = @(
  "node_modules",
  ".git",
  ".builder",
  ".release_stage",
  "release",
  "data\logs"
)
if (-not $IncludeDist) { $excludeDirs += "dist" }

$excludeFiles = @(
  ".env",
  "data\app.db"
)

$excludeDirPaths = @()
foreach ($d in $excludeDirs) { $excludeDirPaths += (Join-Path $Root $d) }

Write-Host "Root       : $Root"
Write-Host "Out        : $Out"
Write-Host ("IncludeDist: " + [bool]$IncludeDist)

# 3) Copy to stage (robocopy)
Write-Host "Staging files..."

# robocopy exit codes: 0,1 are success; >=8 are failure
$rcArgs = @(
  "$Root",
  "$Stage",
  "/E",
  "/XD"
) + $excludeDirPaths + @(
  "/XF"
) + $excludeFiles + @(
  "/NFL","/NDL","/NJH","/NJS","/NC","/NS","/NP"
)

$p = Start-Process -FilePath "robocopy" -ArgumentList $rcArgs -NoNewWindow -PassThru -Wait
if ($p.ExitCode -ge 8) {
  throw "Robocopy failed with exit code $($p.ExitCode)"
}

# 4) Ensure data/ is clean and placeholders exist
$stageData = Join-Path $Stage "data"
$stageLogs = Join-Path $stageData "logs"
New-Item -ItemType Directory -Path $stageLogs -Force | Out-Null

Get-ChildItem -Path $stageLogs -Force -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

$stageDb = Join-Path $stageData "app.db"
if (Test-Path $stageDb) { Remove-Item -Force $stageDb }

New-Item -ItemType File -Path (Join-Path $stageLogs ".gitkeep") -Force | Out-Null

# Ensure secrets are not staged
$env = Join-Path $Stage ".env"
if (Test-Path $env) { Remove-Item -Force $env }

# 5) Zip
$releaseDir = Split-Path -Parent $Out
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
if (Test-Path $Out) { Remove-Item -Force $Out }

Write-Host "Creating zip..."
Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $Out -Force

# 6) Cleanup
Remove-Item -Recurse -Force $Stage

Write-Host "SUCCESS: $Out"
