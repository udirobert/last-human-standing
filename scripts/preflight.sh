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

# Retrieve only variable names and non-empty status. Never copy production secrets
# (service-role keys, signing keys, admin tokens) to the local machine.
TMP_ENV=$(mktemp)
trap 'rm -f "$TMP_ENV"' EXIT
ssh "${HOST}" "sed -n -E 's/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/\\1=present/p' ${REMOTE_BASE}/shared/.env" > "$TMP_ENV"

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
  # Supabase access-control hardening
  "PUBLIC_BASE_URL"
  "SUPABASE_BUCKET_PRIVATE"
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

if ! ssh "${HOST}" "grep -qx 'SUPABASE_BUCKET_PRIVATE=true' ${REMOTE_BASE}/shared/.env"; then
  fail "SUPABASE_BUCKET_PRIVATE must be exactly 'true' in ${HOST}:${REMOTE_BASE}/shared/.env."
fi

if ssh "${HOST}" "grep -qE '^TELEGRAM_BOT_TOKEN=.+' ${REMOTE_BASE}/shared/.env"; then
  if ! ssh "${HOST}" "grep -qE '^TELEGRAM_WEBHOOK_SECRET=.+' ${REMOTE_BASE}/shared/.env"; then
    fail "TELEGRAM_WEBHOOK_SECRET is required when TELEGRAM_BOT_TOKEN is configured."
  fi
fi

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

# Do not derive the relayer address locally: the private CELO_SIGNING_KEY must
# remain on the host. Verify the non-secret VoteRegistry address remotely.
VOTE_REGISTRY_MATCH=$(ssh "${HOST}" "awk -F= -v expected='${VOTE_REGISTRY_DEPLOYED}' '\$1 == \"VOTE_REGISTRY_ADDRESS\" { found=1; exit tolower(\$2) == tolower(expected) ? 0 : 1 } END { if (!found) exit 1 }' ${REMOTE_BASE}/shared/.env" >/dev/null 2>&1 && echo "yes" || echo "no")
if [ "$VOTE_REGISTRY_MATCH" != "yes" ]; then
  warn "VOTE_REGISTRY_ADDRESS does not match the documented deployed contract ${VOTE_REGISTRY_DEPLOYED}."
  warn "Update the server configuration or revise the documented deployment address before launch."
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

# --- PM2 process health check ------------------------------------------------
# Detect the conditions that caused the 2026-04-03 incident: a manually
# started process under root with the wrong cwd crash-looped 8.6M times,
# filling disk with ~9 GB of error logs. Catch it before deploying.
info "Checking pm2 process health on ${HOST}…"

PM2_CHECK=$(ssh "$HOST" "
  # Check root's pm2 first — nothing should be running there.
  ROOT_PROCS=\$(sudo pm2 jlist 2>/dev/null || echo '[]')
  ROOT_LHS=\$(echo \"\$ROOT_PROCS\" | python3 -c \"
import json, sys
procs = json.load(sys.stdin)
found = [p for p in procs if p.get('name') == 'last-human-standing']
if found:
    p = found[0]
    env = p.get('pm2_env', {})
    print(f'ROOT_PROCESS:status={env.get(\\\"status\\\",\\\"unknown\\\")},restarts={env.get(\\\"restart_time\\\",0)},cwd={env.get(\\\"pm_cwd\\\",\\\"\\\") or env.get(\\\"cwd\\\",\\\"\\\")}')
\" 2>/dev/null || true)
  [ -n \"\$ROOT_LHS\" ] && echo \"\$ROOT_LHS\"

  # Check deploy user's pm2
  DEPLOY_PROCS=\$(sudo -u deploy /usr/local/lib/node_modules/pm2/bin/pm2 jlist 2>/dev/null || echo '[]')
  DEPLOY_LHS=\$(echo \"\$DEPLOY_PROCS\" | python3 -c \"
import json, sys
procs = json.load(sys.stdin)
found = [p for p in procs if p.get('name') == 'last-human-standing']
if found:
    p = found[0]
    env = p.get('pm2_env', {})
    print(f'DEPLOY_PROCESS:status={env.get(\\\"status\\\",\\\"unknown\\\")},restarts={env.get(\\\"restart_time\\\",0)},cwd={env.get(\\\"pm_cwd\\\",\\\"\\\") or env.get(\\\"cwd\\\",\\\"\\\")}')
else:
    print('DEPLOY_PROCESS:missing')
\" 2>/dev/null || echo 'DEPLOY_PROCESS:error')
  echo \"\$DEPLOY_LHS\"

  # Check log sizes (early warning for disk bloat)
  ROOT_LOG_SIZE=\$(sudo du -sb /root/.pm2/logs/ 2>/dev/null | cut -f1 || echo 0)
  DEPLOY_LOG_SIZE=\$(sudo -u deploy du -sb /home/deploy/.pm2/logs/ 2>/dev/null | cut -f1 || echo 0)
  echo \"LOG_SIZES:root=\${ROOT_LOG_SIZE},deploy=\${DEPLOY_LOG_SIZE}\"
" 2>/dev/null || echo "SSH_FAILED")

if [ "$PM2_CHECK" = "SSH_FAILED" ]; then
  warn "Could not check pm2 health (SSH command failed). Proceeding with caution."
else
  # FATAL: process running under root
  if echo "$PM2_CHECK" | grep -q "^ROOT_PROCESS:"; then
    ROOT_INFO=$(echo "$PM2_CHECK" | grep "^ROOT_PROCESS:" | sed 's/ROOT_PROCESS://')
    echo
    fail "pm2 process 'last-human-standing' is running under ROOT!
    $ROOT_INFO
    This will crash-loop (wrong cwd) and fill disk with error logs.
    Fix on the server:
      sudo pm2 delete last-human-standing && sudo pm2 save --force
    Then re-run preflight."
  fi

  # Check deploy user's process
  DEPLOY_INFO=$(echo "$PM2_CHECK" | grep "^DEPLOY_PROCESS:" | sed 's/DEPLOY_PROCESS://')
  if [ "$DEPLOY_INFO" = "missing" ]; then
    warn "No pm2 process found for deploy user — deploy.sh will bootstrap from ecosystem.config.cjs"
  elif [ "$DEPLOY_INFO" != "error" ]; then
    # Validate cwd
    PROC_CWD=$(printf '%s\n' "$DEPLOY_INFO" | sed -n 's/.*cwd=\([^,]*\).*/\1/p')
    EXPECTED_CWD="${REMOTE_BASE}/current"
    if [ -n "$PROC_CWD" ] && [ "$PROC_CWD" != "$EXPECTED_CWD" ]; then
      fail "pm2 process cwd is '$PROC_CWD', expected '$EXPECTED_CWD'.
    Wrong cwd causes MODULE_NOT_FOUND crash loops.
    Fix: ssh $HOST 'sudo -u deploy pm2 delete last-human-standing && sudo -u deploy pm2 save'
    Then deploy.sh will re-bootstrap from ecosystem.config.cjs."
    fi

    # Warn on high restart count
    PROC_RESTARTS=$(printf '%s\n' "$DEPLOY_INFO" | sed -n 's/.*restarts=\([0-9][0-9]*\).*/\1/p')
    if [ "${PROC_RESTARTS:-0}" -gt 50 ]; then
      warn "pm2 process has $PROC_RESTARTS restarts — possible crash loop."
      warn "Check: ssh $HOST 'sudo -u deploy pm2 logs last-human-standing --lines 30'"
    fi

    # Check status
    PROC_STATUS=$(printf '%s\n' "$DEPLOY_INFO" | sed -n 's/.*status=\([^,]*\).*/\1/p')
    if [ "$PROC_STATUS" = "errored" ] || [ "$PROC_STATUS" = "stopping" ]; then
      warn "pm2 process status is '$PROC_STATUS'. Deploy will attempt restart."
    fi
    info "pm2 process: $DEPLOY_INFO"
  fi

  # Warn if logs are growing large (>500 MB)
  LOG_LINE=$(echo "$PM2_CHECK" | grep "^LOG_SIZES:" | sed 's/LOG_SIZES://')
  ROOT_LOG=$(printf '%s\n' "$LOG_LINE" | sed -n 's/.*root=\([0-9][0-9]*\).*/\1/p')
  DEPLOY_LOG=$(printf '%s\n' "$LOG_LINE" | sed -n 's/.*deploy=\([0-9][0-9]*\).*/\1/p')
  THRESHOLD=$((500 * 1024 * 1024))  # 500 MB

  if [ "${ROOT_LOG:-0}" -gt "$THRESHOLD" ]; then
    ROOT_LOG_MB=$(( ${ROOT_LOG:-0} / 1024 / 1024 ))
    warn "Root pm2 logs are ${ROOT_LOG_MB} MB — risk of disk fill."
    warn "Fix: ssh $HOST 'sudo truncate -s 0 /root/.pm2/logs/*.log'"
  fi
  if [ "${DEPLOY_LOG:-0}" -gt "$THRESHOLD" ]; then
    DEPLOY_LOG_MB=$(( ${DEPLOY_LOG:-0} / 1024 / 1024 ))
    warn "Deploy pm2 logs are ${DEPLOY_LOG_MB} MB — risk of disk fill."
    warn "Fix: ssh $HOST 'sudo -u deploy truncate -s 0 /home/deploy/.pm2/logs/*.log'"
  fi
fi

# Migration reminder: the database must be verified against the linked project
# before production is changed. Do not use the SQL editor as an untracked bypass.
echo
warn "REQUIRED: verify and apply outstanding Supabase migrations through the linked CLI workflow."
warn "          Run: supabase migration list && supabase db push"
warn "          This release includes 036_security_hardening.sql."

info "Preflight passed. Safe to run: bash scripts/deploy.sh"
