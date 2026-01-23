#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f package.json ]]; then
  echo "[FATAL] package.json not found. Root: $ROOT" >&2
  exit 2
fi

LOG_DIR="$ROOT/data/logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/start-${TS}.log"

log() {
  echo "$1" | tee -a "$LOG_FILE"
}

log "=== DayZ Web Panel Start (Linux) ==="
log "Root: $ROOT"

PM=""
if command -v pnpm >/dev/null 2>&1; then
  PM="pnpm"
else
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >>"$LOG_FILE" 2>&1 || true
    corepack prepare pnpm@10.14.0 --activate >>"$LOG_FILE" 2>&1 || true
  fi
  if command -v pnpm >/dev/null 2>&1; then
    PM="pnpm"
  else
    PM="npm"
  fi
fi

log "Ensuring Prisma client + DB schema (db:setup)..."
"$PM" run db:setup >>"$LOG_FILE" 2>&1

if [[ ! -f "$ROOT/dist/server/node-build.mjs" ]]; then
  log "Build not found. Running build..."
  "$PM" run build >>"$LOG_FILE" 2>&1
else
  log "Build exists. Skipping build."
fi

log "Starting server..."
node "$ROOT/dist/server/node-build.mjs" >>"$LOG_FILE" 2>&1
CODE=$?
log "Server process exited with code $CODE."
exit $CODE
