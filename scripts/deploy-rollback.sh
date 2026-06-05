#!/usr/bin/env bash
set -euo pipefail

HOST="snel-bot"
REMOTE_BASE="/opt/last-human-standing"
PM2_NAME="last-human-standing"

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
info() { echo -e "${GREEN}[rollback]${NC} $*"; }
fail() { echo -e "${RED}[rollback]${NC} $*"; exit 1; }

RELEASES=$(ssh "${HOST}" "ls -1d ${REMOTE_BASE}/releases/*/ 2>/dev/null | sort")
COUNT=$(echo "${RELEASES}" | grep -c '/' || true)

if [ "${COUNT}" -lt 2 ]; then
  fail "Need at least 2 releases to roll back. Found: ${COUNT}"
fi

PREVIOUS=$(echo "${RELEASES}" | tail -2 | head -1)
CURRENT=$(ssh "${HOST}" "readlink ${REMOTE_BASE}/current")

info "Current:  ${CURRENT}"
info "Rolling back to: ${PREVIOUS}"

ssh "${HOST}" "ln -sfn ${PREVIOUS} ${REMOTE_BASE}/current"
ssh "${HOST}" "pm2 restart ${PM2_NAME}"

info "Done. Run 'ssh ${HOST} curl -sf https://lasthumanstanding.thisyearnofear.com/api/health' to verify."
