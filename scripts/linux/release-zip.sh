#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# DayZ Web Panel - Release ZIP Creator (Linux/macOS)
# - Excludes: node_modules/, .git/, .builder/, data/app.db, data/logs, .env
# - By default excludes dist/ (user builds locally)
# Usage:
#   ./scripts/linux/release-zip.sh              # no dist
#   INCLUDE_DIST=1 ./scripts/linux/release-zip.sh
#   OUT=./release/custom.zip ./scripts/linux/release-zip.sh
# ------------------------------------------------------------

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TS="$(date +%Y%m%d-%H%M%S)"
VER="$(node -e "try{const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));console.log(p.version||'0.0.0')}catch(e){console.log('0.0.0')}")"
OUT="${OUT:-$ROOT/release/dayz-web-panel-panel-only-v$VER-$TS.zip}"
INCLUDE_DIST="${INCLUDE_DIST:-0}"

STAGE="$ROOT/.release_stage"
rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "=== DayZ Web Panel | Release ZIP ==="
echo "Root        : $ROOT"
echo "Out         : $OUT"
echo "IncludeDist : $INCLUDE_DIST"

# Prefer rsync for excludes. Fallback to cp if rsync missing.
EXCLUDES=(
  "--exclude=node_modules"
  "--exclude=.git"
  "--exclude=.builder"
  "--exclude=.release_stage"
  "--exclude=release"
  "--exclude=.env"
  "--exclude=data/app.db"
  "--exclude=data/logs"
)
if [[ "$INCLUDE_DIST" != "1" ]]; then
  EXCLUDES+=("--exclude=dist")
fi

if command -v rsync >/dev/null 2>&1; then
  rsync -a "${EXCLUDES[@]}" "$ROOT/" "$STAGE/"
else
  echo "WARN: rsync not found. Using cp -R and manual cleanup."
  cp -R "$ROOT/." "$STAGE/"
  rm -rf "$STAGE/node_modules" "$STAGE/.git" "$STAGE/.builder" "$STAGE/.release_stage" "$STAGE/release" "$STAGE/.env" "$STAGE/data/app.db" "$STAGE/data/logs" || true
  if [[ "$INCLUDE_DIST" != "1" ]]; then
    rm -rf "$STAGE/dist" || true
  fi
fi

# Ensure clean runtime placeholders
mkdir -p "$STAGE/data/logs"
rm -rf "$STAGE/data/logs"/* || true
touch "$STAGE/data/logs/.gitkeep"
rm -f "$STAGE/data/app.db" || true

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT" || true

if command -v zip >/dev/null 2>&1; then
  (cd "$STAGE" && zip -rq "$OUT" .)
else
  echo "ERROR: zip not found. Install zip or set OUT to a tar archive yourself." >&2
  exit 2
fi

rm -rf "$STAGE"
echo "SUCCESS: $OUT"
