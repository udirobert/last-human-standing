#!/usr/bin/env bash
# Pre-deploy preflight: ssh into the prod host and assert the env vars
# and onchain state required for a healthy launch. Run BEFORE scripts/deploy.sh.
# Exits non-zero on any failure so it can be wired into CI / chained.

set -euo pipefail

HOST="snel-bot"
REMOTE_BASE="/opt/last-human-standing"
ENV_FILE="\${REMOTE_BASE}/shared/.env"

# cUSD on Celo mainnet (https://celoscan.io/token/0x765de816845861e75a25fca122bb6898b8b1282a)
CUSD_CELO="0x765DE816845861e75A25fCA122bb6898B8B1282a"
PRIZE_POOL_CELO="0xCf34005917b4d39AE97696D14e979F335CD6B2f0"
# VoteRegistry deployed on Celo mainnet (from contracts/.voteregistry)
VOTE_REGISTRY_DEPLOYED="0x5ae66f26ea17ff6499a9fad4bdb299e73cec59e1"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[preflight]${NC} $*"; }
warn()  { echo -e "${YELLOW}[preflight]${NC} $*"; }
fail()  { echo -e "${RED}[preflight]${NC} $*"; exit 1; }

info "Reaching ${HOST}…"
ssh "${HOST}" "echo ok" >/dev/null || fail "Cannot reach ${HOST}"

info "Checking ${HOST}:${REMOTE_BASE}/shared/.env"
ssh "${HOST}" "test -f ${REMOTE_BASE}/shared/.env" \
  || fail "${REMOTE_BASE}/shared/.env not found — has the host been bootstrapped yet?"

# Read the prod .env into a temp file so we can grep it deterministically.
TMP_ENV=$(mktemp)
trap 'rm -f "$TMP_ENV"' EXIT
ssh "${HOST}" "cat ${REMOTE_BASE}/shared/.env" > "$TMP_ENV"

# Required env vars for the launch to work end-to-end.
# VITE_-prefixed vars are BUILD-time (read by Vite during `npm run build`
# from the local .env, not from the server), so they are checked separately
# against the local .env further down. The server only needs the runtime
# vars to actually run the relayer and serve API requests.
REQUIRED=(
  # Voting + relayer
  "VOTE_REGISTRY_ADDRESS"
  "CELO_SIGNING_KEY"
  # Supabase (read + write)
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  # Frontend prize pool addresses (server reads these for /api/stats)
  "VITE_PRIZE_POOL_ADDRESS"
  "VITE_CELO_PRIZE_POOL_ADDRESS"
  # Farcaster cast-action validation
  "NEYNAR_API_KEY"
  # Admin
  "ADMIN_TOKEN"
  # Launch timing
  "GAME_LAUNCH_AT"
  "COHORT_SIZE"
)

MISSING=()
for var in "${REQUIRED[@]}"; do
  if ! grep -qE "^${var}=" "$TMP_ENV"; then
    MISSING+=("$var")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo
  fail "Missing env vars in ${HOST}:${REMOTE_BASE}/shared/.env:
    ${MISSING[*]}

Add them and re-run. See .env.example for documentation."
fi
info "All ${#REQUIRED[@]} required env vars present"

# Also check VITE_ vars in the local .env (build-time). The server .env
# does not need them — they are baked into the React bundle by Vite.
LOCAL_ENV="./.env"
if [ -f "$LOCAL_ENV" ]; then
  VITE_MISSING=()
  for vvar in "VITE_VOTE_REGISTRY_ADDRESS" "VITE_PRIZE_POOL_ADDRESS" "VITE_CELO_PRIZE_POOL_ADDRESS"; do
    grep -qE "^${vvar}=" "$LOCAL_ENV" || VITE_MISSING+=("$vvar")
  done
  if grep -qE "^VITE_ENABLE_IDKIT=true$" "$LOCAL_ENV"; then
    for vvar in "VITE_MINI_APP_ID" "VITE_WORLD_ID_APP_ID"; do
      grep -qE "^${vvar}=" "$LOCAL_ENV" || VITE_MISSING+=("$vvar")
    done
  fi
  if [ ${#VITE_MISSING[@]} -gt 0 ]; then
    echo
    fail "Missing VITE_* vars in local .env (build-time, needed by Vite):
    ${VITE_MISSING[*]}

These get baked into the React bundle at build time. Add them to .env
and re-run deploy.sh."
  fi
  info "VITE_* build-time vars present in local .env"
else
  warn "No local .env found; the build will run with default Vite behavior (likely missing client config)"
fi

# Sanity: relayer signing key matches the documented prize pool wallet
ACTUAL_SIGNER=$(grep -E '^CELO_SIGNING_KEY=' "$TMP_ENV" | cut -d= -f2-)
if [ -n "$ACTUAL_SIGNER" ]; then
  DERIVED_ADDR=$(python3 -c "
from eth_account import Account
print(Account.from_key('${ACTUAL_SIGNER}').address)
" 2>/dev/null || echo "")
  if [ -n "$DERIVED_ADDR" ] && [ "$(echo "$DERIVED_ADDR" | tr '[:upper:]' '[:lower:]')" != "$(echo "$PRIZE_POOL_CELO" | tr '[:upper:]' '[:lower:]')" ]; then
    warn "CELO_SIGNING_KEY derives to ${DERIVED_ADDR}, expected prize pool ${PRIZE_POOL_CELO}"
    warn "Relayer will run, but winners will be paid from a different wallet than the prize pool"
  fi
fi

# Check VOTE_REGISTRY_ADDRESS matches the deployed contract
DEPLOYED_ADDR=$(grep -E '^VOTE_REGISTRY_ADDRESS=' "$TMP_ENV" | cut -d= -f2-)
if [ -n "$DEPLOYED_ADDR" ] && [ "$(echo "$DEPLOYED_ADDR" | tr '[:upper:]' '[:lower:]')" != "$(echo "$VOTE_REGISTRY_DEPLOYED" | tr '[:upper:]' '[:lower:]')" ]; then
  warn "VOTE_REGISTRY_ADDRESS=${DEPLOYED_ADDR} but the deployed contract is ${VOTE_REGISTRY_DEPLOYED}"
  warn "Either re-deploy with the new key, or update the env var."
fi

# Check onchain state via a public Celo RPC. No auth needed.
# Use publicnode (forno.celo.org has been returning 403 to some clients).
CELO_RPC="https://celo-rpc.publicnode.com"
info "Checking CELO + cUSD balance at ${PRIZE_POOL_CELO}…"

# Pad the prize pool address (strip 0x, left-pad to 32 bytes) and build
# the balanceOf calldata once so the inline JSON stays simple.
POOL_PADDED=$(printf '%s' "${PRIZE_POOL_CELO#0x}" | tr '[:upper:]' '[:lower:]' | awk '{printf "%064s", $0}')
CUSD_CALLDATA="0x70a08231${POOL_PADDED}"

CELO_BALANCE_WEI=$(curl -sS -X POST -H 'Content-Type: application/json' \
  "${CELO_RPC}" \
  --max-time 8 \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getBalance\",\"params\":[\"${PRIZE_POOL_CELO}\",\"latest\"]}" \
  | python3 -c "import json,sys; print(int(json.load(sys.stdin)['result'], 16))" 2>/dev/null || echo "0")

CUSD_BALANCE_RAW=$(curl -sS -X POST -H 'Content-Type: application/json' \
  "${CELO_RPC}" \
  --max-time 8 \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"${CUSD_CELO}\",\"data\":\"${CUSD_CALLDATA}\"},\"latest\"]}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('result','0x0'))" 2>/dev/null || echo "0x0")
CUSD_BALANCE=$(python3 -c "print(int('${CUSD_BALANCE_RAW}', 16) / 1e18)" 2>/dev/null || echo "0")
CELO_BALANCE=$(python3 -c "print(int('${CELO_BALANCE_WEI}') / 1e18)" 2>/dev/null || echo "0")

printf "    CELO: %.6f  (relayer gas)\n" "$CELO_BALANCE"
printf "    cUSD: %.6f  (prize payouts)\n" "$CUSD_BALANCE"

if python3 -c "import sys; sys.exit(0 if float('$CELO_BALANCE') > 0.01 else 1)"; then
  info "CELO balance is sufficient for the relayer"
else
  fail "CELO balance is too low. Fund ${PRIZE_POOL_CELO} with CELO for gas."
fi

if python3 -c "import sys; sys.exit(0 if float('$CUSD_BALANCE') > 0 else 1)"; then
  info "cUSD balance > 0 — prize payouts will work"
else
  warn "cUSD balance is 0 at ${PRIZE_POOL_CELO}. The relayer will run but can't pay winners."
  warn "Bridge cUSD before players can win: https://portal.celo.org/bridge"
fi

# Manual reminder: supabase migration
echo
warn "MANUAL: confirm supabase/migrations/0002_vote_queue.sql has been run in the Supabase SQL editor."
warn "        (The preflight cannot check DB tables without supabase admin creds.)"

info "Preflight passed. Safe to run: bash scripts/deploy.sh"
