#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f package.json ]]; then
  echo "ERROR: package.json not found. Please run from the project root." >&2
  exit 2
fi

mkdir -p data/logs
TS="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="data/logs/install-${TS}.log"

log() {
  echo "$1" | tee -a "$LOG_FILE"
}

log "=== DayZ Web Panel Installer (Linux) ==="
log "Working dir: $ROOT"

if ! command -v node >/dev/null 2>&1; then
  log "ERROR: Node.js not found. Install Node.js 22.x before running this script."
  exit 10
fi

PM=""
if command -v pnpm >/dev/null 2>&1; then
  PM="pnpm"
else
  if command -v corepack >/dev/null 2>&1; then
    log "pnpm not found. Enabling corepack + preparing pnpm..."
    corepack enable >>"$LOG_FILE" 2>&1 || true
    corepack prepare pnpm@10.14.0 --activate >>"$LOG_FILE" 2>&1 || true
  fi
  if command -v pnpm >/dev/null 2>&1; then
    PM="pnpm"
  fi
fi

if [[ -z "$PM" ]]; then
  PM="npm"
fi

if [[ "$PM" == "pnpm" ]]; then
  log "Running pnpm install --frozen-lockfile..."
  if ! pnpm install --frozen-lockfile >>"$LOG_FILE" 2>&1; then
    log "WARN: pnpm install failed. Falling back to npm install --include=dev..."
    PM="npm"
  fi
fi

if [[ "$PM" == "npm" ]]; then
  log "Running npm install --include=dev..."
  npm install --include=dev >>"$LOG_FILE" 2>&1
fi

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    log "Created .env from .env.example"
  else
    log "ERROR: .env.example missing."
    exit 13
  fi
else
  log ".env already exists."
fi

log "Initializing DB (prisma generate + db push)..."
"$PM" run db:setup >>"$LOG_FILE" 2>&1

log "Building (client + server)..."
"$PM" run build >>"$LOG_FILE" 2>&1

log "SUCCESS: Install complete."
log "Next: run scripts/linux/start.sh"
