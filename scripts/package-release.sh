#!/usr/bin/env bash
# =============================================================================
# package-release.sh — Canonical local-side build + ship for last-human-standing
#
# Pairs with scripts/deploy.sh (the server-side half). This script:
#   1. Pulls the public VITE_ vars from the server's shared/.env over SSH
#      (runtime secrets never transit — only client-safe VITE_ values)
#   2. Builds the client locally with those vars baked in (.env.production.local)
#   3. Packages a SOURCE-FREE tarball via an explicit allowlist
#   4. scp's it to the server and invokes deploy.sh
#   5. Cleans up the temp env file on exit (trap)
#
# Usage:
#   bash scripts/package-release.sh [timestamp]
#
#   timestamp  optional, defaults to YYYYMMDD-HHMMSS (UTC)
#
# Requirements:
#   - SSH access to the prod host (snel-bot) as the deploy user
#   - npm, local node_modules installed (for the build)
#   - scripts/deploy.sh present on the server at /opt/last-human-standing/current/scripts/
#
# Security model:
#   - ALLOWLIST only: dist/, server/, scripts/, package.json, package-lock.json,
#     ecosystem.config.cjs. No src/, tests/, contracts/, supabase/, docs/, .env,
#     node_modules, .git, or agent-tooling dirs ever ship.
#   - Only VITE_-prefixed vars (public by design) are pulled from the server.
#     Runtime secrets (SUPABASE_SERVICE_ROLE_KEY, CELO_SIGNING_KEY, etc.) stay
#     on the server and are read at runtime via the .env symlink — they never
#     touch the local machine.
#   - .env.production.local is gitignored (.env.*.local in .gitignore) and
#     removed on exit via trap.
# =============================================================================
set -euo pipefail

# macOS: prevent cp from creating AppleDouble (._*) resource-fork files.
export COPYFILE_DISABLE=1

HOST="snel-bot"
REMOTE_BASE="/opt/last-human-standing"
REMOTE_ENV="${REMOTE_BASE}/shared/.env"
LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP="${1:-$(date -u +%Y%m%d-%H%M%S)}"
TARBALL_NAME="lhs-${TIMESTAMP}.tar.gz"
TARBALL="${LOCAL_ROOT}/${TARBALL_NAME}"
PROD_ENV="${LOCAL_ROOT}/.env.production.local"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[release]${NC} $*"; }
warn()  { echo -e "${YELLOW}[release]${NC} $*"; }
fail()  { echo -e "${RED}[release]${NC} $*"; exit 1; }

# --- cleanup: never leave the prod env file on disk -------------------------
cleanup() {
  if [ -f "$PROD_ENV" ]; then
    rm -f "$PROD_ENV"
    info "removed $PROD_ENV"
  fi
  if [ -f "$TARBALL" ]; then
    rm -f "$TARBALL"
    info "removed local tarball $TARBALL"
  fi
}
trap cleanup EXIT

# --- 0. preflight -----------------------------------------------------------
info "preflight: host, env, tree"
ssh "$HOST" "echo ok" >/dev/null || fail "cannot reach $HOST"
ssh "$HOST" "test -f $REMOTE_ENV" || fail "$REMOTE_ENV not found on $HOST"
[ -d "$LOCAL_ROOT/dist" ] && fail "dist/ exists locally — remove it first (clean build)"
[ -f "$LOCAL_ROOT/package.json" ] || fail "not in repo root (no package.json)"
command -v npm >/dev/null || fail "npm not found"

# --- 1. pull VITE_ vars from the server --------------------------------------
info "fetching VITE_ vars from $HOST:$REMOTE_ENV"
ssh "$HOST" "grep -E '^VITE_' $REMOTE_ENV" > "$PROD_ENV" || fail "failed to read VITE_ vars"
VITE_COUNT=$(grep -cE '^VITE_' "$PROD_ENV" || true)
[ "$VITE_COUNT" -gt 0 ] || fail "no VITE_ vars found in $REMOTE_ENV"
info "got $VITE_COUNT VITE_ vars (public client config only — no secrets transit)"

# Sanity: refuse to proceed if any non-VITE_ var leaked in (defensive).
if grep -vE '^VITE_|^$|^#' "$PROD_ENV" >/dev/null 2>&1; then
  fail "non-VITE_ lines detected in fetched env — aborting (should never happen)"
fi

# --- 2. build locally --------------------------------------------------------
info "building client with production VITE_ vars (npm run build)"
cd "$LOCAL_ROOT"
npm run build || fail "build failed"
[ -d "$LOCAL_ROOT/dist" ] || fail "build produced no dist/"

# --- 3. package source-free tarball (allowlist) ------------------------------
info "packaging tarball: $TARBALL_NAME"
STAGE=$(mktemp -d)
trap 'cleanup; rm -rf "$STAGE"' EXIT
INNER="$STAGE/lhs-release/$TIMESTAMP"
mkdir -p "$INNER"

# Explicit allowlist — anything NOT listed here does not ship.
# Note: public/ and root index.html are NOT shipped — Vite copies them
# into dist/ during build, and nginx serves dist/ directly (the server
# has no express.static and never references index.html).
# contracts/VoteRegistry.json is the onchain ABI artifact read by the
# vote relayer at runtime (server/lib/voteRelayer.js). The Solidity
# source (.sol), foundry.toml, and .voteregistry marker are NOT shipped.
ALLOW=(
  "dist"
  "server"
  "scripts"
  "contracts/VoteRegistry.json"
  "package.json"
  "package-lock.json"
  "ecosystem.config.cjs"
)

for item in "${ALLOW[@]}"; do
  if [ -e "$LOCAL_ROOT/$item" ]; then
    mkdir -p "$INNER/$(dirname "$item")"
    cp -R "$LOCAL_ROOT/$item" "$INNER/$item"
  else
    warn "allowlisted item missing, skipping: $item"
  fi
done

# Defensive: assert no secrets, no source, no build deps leaked into the stage.
for forbidden in \
  ".env" ".env.local" ".env.production.local" \
  "src" "tests" "supabase" "docs" "node_modules" ".git" \
  "contracts/VoteRegistry.sol" "contracts/foundry.toml" "contracts/.voteregistry"; do
  if [ -e "$INNER/$forbidden" ]; then
    fail "SECURITY: $forbidden leaked into tarball stage — aborting"
  fi
done

tar -czf "$TARBALL" -C "$STAGE" "lhs-release/$TIMESTAMP"
TARBALL_SIZE=$(du -h "$TARBALL" | cut -f1)
info "tarball ready: $TARBALL_NAME ($TARBALL_SIZE, source-free)"

# Defensive: assert no macOS resource-fork files (._*) leaked in.
if find "$STAGE" -name '._*' -print -quit | grep -q .; then
  warn "macOS ._ files found in stage — stripping from tarball"
  find "$STAGE" -name '._*' -delete
  tar -czf "$TARBALL" -C "$STAGE" "lhs-release/$TIMESTAMP"
fi

# --- 4. ship + deploy --------------------------------------------------------
info "scp tarball to $HOST"
scp "$TARBALL" "$HOST:/tmp/${TARBALL_NAME}" || fail "scp failed"

info "invoking deploy.sh on the server"
ssh "$HOST" "bash ${REMOTE_BASE}/current/scripts/deploy.sh /tmp/${TARBALL_NAME}" \
  || fail "deploy.sh failed on the server"

# Clean up the remote tarball.
ssh "$HOST" "rm -f /tmp/${TARBALL_NAME}" || warn "could not remove remote tarball"

info "deploy complete — current is ${TIMESTAMP}"
info "verify: curl https://lasthumanstanding.thisyearnofear.com/api/game/state"
