#!/usr/bin/env bash
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────
HOST="snel-bot"
REMOTE_BASE="/opt/last-human-standing"
PM2_NAME="last-human-standing"
KEEP_RELEASES=2
DOMAIN="lasthumanstanding.thisyearnofear.com"
HEALTH_URL="https://${DOMAIN}/api/health"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RELEASE_DIR="releases/${TIMESTAMP}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[deploy]${NC} $*"; }
fail()  { echo -e "${RED}[deploy]${NC} $*"; exit 1; }

# ─── Preflight ───────────────────────────────────────────────────────────
info "Checking local build…"
npm run build || fail "Local build failed"

info "Connecting to ${HOST}…"
ssh "${HOST}" "echo ok" || fail "Cannot reach ${HOST}"

# ─── One-time migration from flat layout ─────────────────────────────────
ssh "${HOST}" bash -s <<MIGRATE
BASE="${REMOTE_BASE}"

if [ ! -d "\${BASE}/shared" ] && [ -f "\${BASE}/.env" ]; then
  echo "[migrate] Detected flat layout — migrating to release structure"
  mkdir -p "\${BASE}/shared" "\${BASE}/releases"

  # Protect .env
  cp "\${BASE}/.env" "\${BASE}/shared/.env"
  echo "[migrate] .env copied to shared/"

  # Move node_modules to shared (or discard for fresh install)
  if [ -d "\${BASE}/node_modules" ]; then
    mv "\${BASE}/node_modules" "\${BASE}/shared/node_modules"
    echo "[migrate] node_modules moved to shared/"
  fi

  # Clean old flat files that releases will replace
  rm -rf "\${BASE}/server" "\${BASE}/public" "\${BASE}/dist" "\${BASE}/src" \
         "\${BASE}/docs" "\${BASE}/tests" "\${BASE}/.git" "\${BASE}/.junie" "\${BASE}/.bud" \
         2>/dev/null || sudo rm -rf "\${BASE}/server" "\${BASE}/public" "\${BASE}/dist" "\${BASE}/src" \
         "\${BASE}/docs" "\${BASE}/tests" "\${BASE}/.git" "\${BASE}/.junie" "\${BASE}/.bud" \
         2>/dev/null || true
  echo "[migrate] Old flat layout files cleaned"

  # Fix port to match nginx proxy (5300)
  if grep -q '^PORT=8787' "\${BASE}/shared/.env"; then
    sed -i 's/^PORT=8787/PORT=5300/' "\${BASE}/shared/.env"
    echo "[migrate] Fixed PORT from 8787 to 5300 (matches nginx)"
  fi
fi

mkdir -p "\${BASE}/releases" "\${BASE}/shared"
MIGRATE

# ─── Create release directory ────────────────────────────────────────────
info "Creating release ${TIMESTAMP}…"
ssh "${HOST}" "mkdir -p ${REMOTE_BASE}/${RELEASE_DIR}"

# ─── rsync code to release ───────────────────────────────────────────────
info "Syncing code…"
rsync -az --delete \
  --include='server/***' \
  --include='public/***' \
  --include='dist/***' \
  --include='contracts/***' \
  --include='package.json' \
  --include='package-lock.json' \
  --exclude='*' \
  ./ "${HOST}:${REMOTE_BASE}/${RELEASE_DIR}/"

# ─── Symlink dist for nginx ─────────────────────────────────────────────
info "Symlinking dist for nginx…"
ssh "${HOST}" "ln -sfn ${REMOTE_BASE}/current/dist ${REMOTE_BASE}/dist" 2>/dev/null || true

# ─── Symlink shared resources ────────────────────────────────────────────
info "Linking shared .env and node_modules…"
ssh "${HOST}" bash -s <<LINK
set -e
RELEASE="${REMOTE_BASE}/${RELEASE_DIR}"

# Symlink .env (protected, never overwritten)
ln -sf "${REMOTE_BASE}/shared/.env" "\${RELEASE}/.env"

# Symlink node_modules (shared across releases)
ln -sfn "${REMOTE_BASE}/shared/node_modules" "\${RELEASE}/node_modules"

# Install production deps (writes to shared/node_modules via symlink)
cd "\${RELEASE}"
npm install --omit=dev --silent 2>&1
LINK

# ─── Swap symlink ────────────────────────────────────────────────────────
PREVIOUS=$(ssh "${HOST}" "readlink ${REMOTE_BASE}/current 2>/dev/null || echo ''")

info "Activating release…"
ssh "${HOST}" "ln -sfn ${REMOTE_BASE}/${RELEASE_DIR} ${REMOTE_BASE}/current"

# ─── Restart PM2 ─────────────────────────────────────────────────────────
info "Restarting ${PM2_NAME}…"
ssh "${HOST}" bash -s <<PM2
set -e
SCRIPT="${REMOTE_BASE}/current/server/index.js"
CWD="${REMOTE_BASE}/current"

# Delete stale process if it exists (preserves the name slot)
pm2 delete ${PM2_NAME} 2>/dev/null || true

# Start with correct cwd and dotenv
pm2 start "\${SCRIPT}" \
  --name ${PM2_NAME} \
  --cwd "\${CWD}" \
  --node-args "--import dotenv/config" \
  --no-autorestart \
  2>&1

pm2 save --force 2>&1
PM2

# ─── Health check ────────────────────────────────────────────────────────
info "Health check…"
sleep 2
if curl -sf "${HEALTH_URL}" > /dev/null 2>&1; then
  info "Deploy successful — ${HEALTH_URL} is healthy"
else
  warn "Health check failed! Rolling back…"
  if [ -n "${PREVIOUS}" ]; then
    ssh "${HOST}" "ln -sfn ${PREVIOUS} ${REMOTE_BASE}/current"
    ssh "${HOST}" "pm2 restart ${PM2_NAME}" 2>/dev/null || true
    fail "Rolled back to ${PREVIOUS}"
  else
    fail "No previous release to roll back to. Check the server manually."
  fi
fi

# ─── Prune old releases ─────────────────────────────────────────────────
info "Pruning old releases (keeping ${KEEP_RELEASES})…"
ssh "${HOST}" bash -s <<PRUNE
cd "${REMOTE_BASE}/releases"
ls -1d */ 2>/dev/null | sort | head -n -${KEEP_RELEASES} | while read dir; do
  echo "  Removing \${dir}"
  rm -rf "\${dir}"
done
PRUNE

info "Done. Active release: ${RELEASE_DIR}"
