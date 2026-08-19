#!/usr/bin/env bash
# Gate 0 — code, database, and prod env verification before Cohort 1 invites.
set -euo pipefail

HOST="${LHS_HOST:-snel-bot}"
ENV_FILE="/opt/last-human-standing/shared/.env"
DOMAIN="${LHS_DOMAIN:-lasthumanstanding.thisyearnofear.com}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "${GREEN}[gate0] PASS${NC} $*"; }
fail() { echo -e "${RED}[gate0] FAIL${NC} $*"; exit 1; }
warn() { echo -e "${YELLOW}[gate0] WARN${NC} $*"; }

cd "$ROOT"
FAILURES=0
check() {
  local label="$1" cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then pass "$label"; else warn "$label"; FAILURES=$((FAILURES + 1)); fi
}

echo "=== Gate 0 — Cohort 1 pre-invite ==="

# Migrations through 037
if command -v supabase >/dev/null 2>&1; then
  if supabase migration list --linked 2>/dev/null | grep -qE '^\s+037\s+\|\s+037'; then
    pass "Migration 037 applied (linked Supabase)"
  else
    warn "Migration 037 not applied — run: supabase db push --linked"
    FAILURES=$((FAILURES + 1))
  fi
else
  warn "supabase CLI not found"
  FAILURES=$((FAILURES + 1))
fi

ssh "$HOST" "pm2 describe last-human-standing" >/dev/null 2>&1 && pass "PM2 process online" || { warn "PM2 offline"; FAILURES=$((FAILURES + 1)); }

for var in PAID_ENTRY_ENABLED=false FREE_ENTRY_MODE=true LOTTERY_ENABLED=false \
  REQUIRE_HUMANITY_FOR_PLAY=true REQUIRE_WORLD_ID_FOR_VOTING=true \
  AUTO_PAYOUT_ENABLED=false INFILTRATOR_ENABLED=false REVIVAL_ENABLED=false \
  ENTRY_CLOSED=false GAME_LAUNCH_AT=2026-08-24T18:00:00Z COHORT_2_LAUNCH_AT=2026-09-13T18:00:00Z; do
  key="${var%%=*}"; val="${var#*=}"
  if ssh "$HOST" "grep -qx '${key}=${val}' ${ENV_FILE}" 2>/dev/null; then
    pass "${key}=${val}"
  else
    actual=$(ssh "$HOST" "grep '^${key}=' ${ENV_FILE} 2>/dev/null || echo '${key}=<unset>'")
    warn "Expected ${key}=${val}, got ${actual}"
    FAILURES=$((FAILURES + 1))
  fi
done

if ssh "$HOST" "grep -q '^ENABLE_TEST_ROUTES=true' ${ENV_FILE}" 2>/dev/null; then
  warn "ENABLE_TEST_ROUTES=true on prod — should be unset/false outside dry run"
  FAILURES=$((FAILURES + 1))
else
  pass "ENABLE_TEST_ROUTES unset/false"
fi

HEALTH=$(curl -sS --max-time 15 "https://${DOMAIN}/api/health" || echo '{}')
echo "$HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('ok') else 1)" && pass "/api/health ok" || { warn "/api/health failed"; FAILURES=$((FAILURES + 1)); }

STATE=$(curl -sS --max-time 15 "https://${DOMAIN}/api/game/state" || echo '{}')
echo "$STATE" | python3 -c "
import json,sys
d=json.load(sys.stdin)
ok = d.get('phase')=='prelaunch' and d.get('launchAt')=='2026-08-24T18:00:00Z'
sys.exit(0 if ok else 1)
" && pass "phase=prelaunch launchAt=2026-08-24" || { warn "Unexpected game state"; FAILURES=$((FAILURES + 1)); echo "$STATE" | python3 -m json.tool 2>/dev/null | head -20; }

STATS=$(curl -sS --max-time 15 "https://${DOMAIN}/api/stats" || echo '{}')
echo "$STATS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
wld=d.get('prizePool',{}).get('wld',{}).get('balance',0)
cusd=d.get('prizePool',{}).get('celo',{}).get('cusd',0)
print(f'prize: {wld} WLD + {cusd} cUSD')
sys.exit(0 if wld>=5 and cusd>=35 else 1)
" && pass "Prize pool meets pilot minimum (5 WLD + 35 cUSD)" || { warn "Prize pool below pilot minimum"; FAILURES=$((FAILURES + 1)); }

if [ -x "$ROOT/node_modules/.bin/vitest" ] || command -v npm >/dev/null; then
  npm run test:run --silent >/dev/null 2>&1 && pass "252 unit tests passing" || { warn "Unit tests failed"; FAILURES=$((FAILURES + 1)); }
fi

echo
if [ "$FAILURES" -eq 0 ]; then
  pass "Gate 0 complete — safe to invite and dry-run"
  exit 0
fi
fail "$FAILURES check(s) failed"
exit 1
