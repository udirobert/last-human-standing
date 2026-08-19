#!/usr/bin/env bash
# Gate 1 — temporary live window on prod, operator dry run, restore prelaunch schedule.
set -euo pipefail

HOST="${LHS_HOST:-snel-bot}"
ENV_FILE="/opt/last-human-standing/shared/.env"
DOMAIN="${LHS_DOMAIN:-lasthumanstanding.thisyearnofear.com}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESTORE_LAUNCH="${GAME_LAUNCH_AT:-2026-08-24T18:00:00Z}"
DRY_LAUNCH="$(date -u -v-1H +%Y-%m-%dT%H:00:00Z 2>/dev/null || date -u -d '1 hour ago' +%Y-%m-%dT%H:00:00Z)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[dry-run]${NC} $*"; }
warn() { echo -e "${YELLOW}[dry-run]${NC} $*"; }

cd "$ROOT"

ADMIN_TOKEN=$(ssh "$HOST" "grep '^ADMIN_TOKEN=' ${ENV_FILE} | cut -d= -f2-")
[ -n "$ADMIN_TOKEN" ] || { echo "ADMIN_TOKEN missing on ${HOST}"; exit 1; }

cleanup() {
  info "Restoring prod env + cleaning dry-run rows…"
  ssh "$HOST" bash -s <<EOF
set -euo pipefail
ENV="${ENV_FILE}"
upsert() {
  local key="\$1" val="\$2"
  if grep -qE "^\${key}=" "\$ENV"; then
    sed -i.bak "s|^\${key}=.*|\${key}=\${val}|" "\$ENV"
  else
    echo "\${key}=\${val}" >> "\$ENV"
  fi
}
upsert GAME_LAUNCH_AT "${RESTORE_LAUNCH}"
sed -i.bak '/^ENABLE_TEST_ROUTES=/d' "\$ENV" || true
EOF
  supabase db query --linked --yes -f "$ROOT/scripts/sql/pilot-dry-run-cleanup.sql" >/dev/null
  ssh "$HOST" "pm2 restart last-human-standing --update-env" >/dev/null
}
trap cleanup EXIT

info "Seeding dry-run operator accounts…"
supabase db query --linked --yes -f "$ROOT/scripts/sql/pilot-dry-run-seed.sql" >/dev/null

info "Opening temporary live window (GAME_LAUNCH_AT=${DRY_LAUNCH}, ENABLE_TEST_ROUTES=true)…"
ssh "$HOST" bash -s <<EOF
set -euo pipefail
ENV="${ENV_FILE}"
upsert() {
  local key="\$1" val="\$2"
  if grep -qE "^\${key}=" "\$ENV"; then
    sed -i.bak "s|^\${key}=.*|\${key}=\${val}|" "\$ENV"
  else
    echo "\${key}=\${val}" >> "\$ENV"
  fi
}
upsert GAME_LAUNCH_AT "${DRY_LAUNCH}"
upsert ENABLE_TEST_ROUTES "true"
EOF
ssh "$HOST" "pm2 restart last-human-standing --update-env" >/dev/null
sleep 4

info "Running API dry run…"
ADMIN_TOKEN="$ADMIN_TOKEN" LHS_API_URL="https://${DOMAIN}" node "$ROOT/scripts/pilot-dry-run.mjs"

info "Verifying prelaunch restored…"
PHASE=$(curl -sS "https://${DOMAIN}/api/game/state" | python3 -c "import json,sys; print(json.load(sys.stdin).get('phase','?'))")
[ "$PHASE" = "prelaunch" ] || warn "Expected prelaunch after restore, got phase=${PHASE}"

info "Gate 1 dry run complete. Log: docs/ops/2026-08-19-gate1-dry-run.md"
