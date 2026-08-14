#!/usr/bin/env bash
# =============================================================================
# relaunch-prep.sh — Aug 3 cohort 1 re-launch prep
#
# Applies Supabase migration 029 (round bump + empty-cohort reset), updates
# production env vars, and verifies /api/game/state returns prelaunch.
# Run from repo root.
#
# Usage:
#   bash scripts/relaunch-prep.sh              # migrations + verify only
#   bash scripts/relaunch-prep.sh --update-env # also patch prod .env + restart
# =============================================================================
set -euo pipefail

HOST="${LHS_HOST:-snel-bot}"
REMOTE_BASE="/opt/last-human-standing"
ENV_FILE="${REMOTE_BASE}/shared/.env"
DOMAIN="${LHS_DOMAIN:-lasthumanstanding.thisyearnofear.com}"

GAME_LAUNCH_AT="2026-08-03T18:00:00Z"
COHORT_SIZE="25"
COHORT_2_LAUNCH_AT="2026-08-17T18:00:00Z"
# Lower floor for 25-person beta — draw fires once 5 free entrants sign up.
LOTTERY_MIN_CANDIDATES="5"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[relaunch]${NC} $*"; }
warn()  { echo -e "${YELLOW}[relaunch]${NC} $*"; }
fail()  { echo -e "${RED}[relaunch]${NC} $*"; exit 1; }

UPDATE_ENV=false
for arg in "$@"; do
  case "$arg" in
    --update-env) UPDATE_ENV=true ;;
    -h|--help)
      echo "Usage: bash scripts/relaunch-prep.sh [--update-env]"
      exit 0
      ;;
    *) fail "Unknown arg: $arg" ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

info "Applying Supabase migrations (029 Aug 3 launch bump + reset)…"
if command -v supabase >/dev/null 2>&1; then
  supabase db push --linked || fail "supabase db push failed — verify the linked project with supabase migration list --linked"
else
  fail "supabase CLI not found; install it and link the project before applying migrations"
fi

if [ "$UPDATE_ENV" = true ]; then
  info "Patching ${HOST}:${ENV_FILE}…"
  ssh "$HOST" "test -f ${ENV_FILE}" || fail "${ENV_FILE} not found on ${HOST}"

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
upsert GAME_LAUNCH_AT "${GAME_LAUNCH_AT}"
upsert COHORT_SIZE "${COHORT_SIZE}"
upsert COHORT_2_LAUNCH_AT "${COHORT_2_LAUNCH_AT}"
upsert LOTTERY_MIN_CANDIDATES "${LOTTERY_MIN_CANDIDATES}"
EOF

  info "Restarting PM2 with updated env…"
  ssh "$HOST" "pm2 restart last-human-standing --update-env"
else
  warn "Skipping prod env update (pass --update-env to patch ${HOST}:${ENV_FILE})"
  warn "Required values:"
  echo "  GAME_LAUNCH_AT=${GAME_LAUNCH_AT}"
  echo "  COHORT_SIZE=${COHORT_SIZE}"
  echo "  COHORT_2_LAUNCH_AT=${COHORT_2_LAUNCH_AT}"
  echo "  LOTTERY_MIN_CANDIDATES=${LOTTERY_MIN_CANDIDATES}"
fi

info "Checking https://${DOMAIN}/api/game/state…"
STATE=$(curl -sS --max-time 15 "https://${DOMAIN}/api/game/state" || echo "{}")
PHASE=$(echo "$STATE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('phase','?'))" 2>/dev/null || echo "?")
LAUNCH=$(echo "$STATE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('launchAt','?'))" 2>/dev/null || echo "?")
RESERVED=$(echo "$STATE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('reservedCount','?'))" 2>/dev/null || echo "?")

echo "  phase=${PHASE}  launchAt=${LAUNCH}  reservedCount=${RESERVED}"

if [ "$PHASE" = "prelaunch" ] && [ "$LAUNCH" = "${GAME_LAUNCH_AT}" ]; then
  info "Game state looks ready for Aug 3 pre-launch."
elif [ "$UPDATE_ENV" = false ] && [ "$PHASE" = "live" ]; then
  warn "Still in live phase — run with --update-env after migrations to bump GAME_LAUNCH_AT."
else
  warn "Unexpected state. Expected phase=prelaunch launchAt=${GAME_LAUNCH_AT}"
fi

info "Checking lottery gating…"
curl -sS --max-time 15 "https://${DOMAIN}/api/lottery/status" | python3 -m json.tool 2>/dev/null || true

echo
warn "Manual steps still required:"
echo "  1. Seed prize pool to \$200–500+ cUSD/WLD (see scripts/preflight.sh balances)"
echo "  2. Deploy latest code: bash scripts/preflight.sh && bash scripts/package-release.sh"
echo "  3. Dry-run: admin create short round → check-in → vote → close-day"
echo "  4. Promotion copy for World / Farcaster / ?demo=1"
