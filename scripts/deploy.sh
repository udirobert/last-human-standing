#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Single-shot production deploy for last-human-standing
#
# Usage (on the server, as the `deploy` user or via sudo -u deploy):
#   bash scripts/deploy.sh /tmp/lhs-YYYYMMDD-HHMMSS.tar.gz
#
# What it does:
#   1. Extracts the tarball into /opt/last-human-standing/releases/<timestamp>
#   2. Symlinks the release's node_modules to the SHARED copy
#      (avoids 700 MB of duplication per release — was 5.6 GB across
#       8 releases before this fix)
#   3. Symlinks the .env to the shared file
#   4. Flips the `current` symlink
#   5. `pm2 restart last-human-standing --update-env` for zero-downtime
#   6. Trims releases to the most recent 2 (current + previous) so
#      the disk doesn't fill up again
#
# The build happens on the local machine; this script only deploys
# pre-built artifacts. Node deps are NOT installed per-release.
# =============================================================================
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: bash scripts/deploy.sh /tmp/lhs-YYYYMMDD-HHMMSS.tar.gz"
  exit 1
fi

TARBALL="$1"
if [ ! -f "$TARBALL" ]; then
  echo "Tarball not found: $TARBALL"
  exit 1
fi

ROOT="/opt/last-human-standing"
SHARED="$ROOT/shared"
RELEASES="$ROOT/releases"
TIMESTAMP=$(basename "$TARBALL" | sed 's/^lhs-//;s/\.tar\.gz$//')
RELEASE_DIR="$RELEASES/$TIMESTAMP"

if [ -d "$RELEASE_DIR" ]; then
  echo "Release $TIMESTAMP already exists on disk; aborting to avoid clobber."
  exit 1
fi

echo "[deploy] extracting $TARBALL → $RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
# Tarballs built on the local machine have an outer `lhs-release/`
# wrapper from the build step. Extract the whole archive to a temp
# dir, then move the inner release into place.
WORK=$(mktemp -d)
if ! tar -xzf "$TARBALL" -C "$WORK" 2>/dev/null; then
  echo "[deploy] tar extraction failed"
  rm -rf "$WORK" "$RELEASE_DIR"
  exit 1
fi
INNER=$(ls -1 "$WORK" | head -1)
if [ -z "$INNER" ]; then
  echo "[deploy] tarball is empty"
  rm -rf "$WORK" "$RELEASE_DIR"
  exit 1
fi
# The inner path may be `lhs-release` (if tarball wrapped) or the
# timestamp itself (if the build named the dir directly). Move
# whatever it is.
if [ "$INNER" = "$TIMESTAMP" ]; then
  mv "$WORK/$INNER"/* "$RELEASE_DIR/"
else
  # tarball has a wrapper; expect the inner to be `$TIMESTAMP` anyway
  INNER2=$(ls -1 "$WORK/$INNER" 2>/dev/null | head -1)
  if [ "$INNER2" = "$TIMESTAMP" ]; then
    mv "$WORK/$INNER/$INNER2"/* "$RELEASE_DIR/"
  else
    echo "[deploy] unexpected tarball layout: $INNER/$INNER2 (wanted $TIMESTAMP)"
    rm -rf "$WORK" "$RELEASE_DIR"
    exit 1
  fi
fi
rm -rf "$WORK"

cd "$RELEASE_DIR"

# Replace the per-release node_modules with a symlink to the shared
# copy. Saves ~700 MB per release. The shared copy was installed once
# on the box and is the source of truth for production deps.
if [ -d node_modules ] && [ ! -L node_modules ]; then
  echo "[deploy] symlinking node_modules → $SHARED/node_modules"
  rm -rf node_modules
fi
ln -sfn "$SHARED/node_modules" node_modules

# Env file is the same across all releases.
ln -sf "$SHARED/.env" .env

# Flip the current symlink atomically.
echo "[deploy] flipping current → $TIMESTAMP"
ln -sfn "$RELEASE_DIR" "$ROOT/current_new"
mv -Tf "$ROOT/current_new" "$ROOT/current"

# --- PM2 safety checks -------------------------------------------------------
# Guard against the incident of 2026-04-03: a manual `sudo pm2 start
# server/index.js` from the wrong cwd crash-looped 8.6M times, writing
# ~9 GB of logs. These checks catch the two failure modes:
#   1. Process running under root instead of deploy
#   2. Process registered with wrong cwd (missing /current)
#
# If the process doesn't exist yet (first deploy), bootstrap it from the
# ecosystem config rather than a bare `pm2 start`.
echo "[deploy] verifying pm2 process health"

PM2_JSON=$(pm2 jlist 2>/dev/null || echo "[]")

# Check if process exists in pm2. `restart_time` is cumulative, so retain the
# pre-restart value and assess only the restart delta after deployment.
PRE_RESTARTS=0
if echo "$PM2_JSON" | python3 -c "
import json, sys
procs = json.load(sys.stdin)
found = [p for p in procs if p.get('name') == 'last-human-standing']
sys.exit(0 if found else 1)
" 2>/dev/null; then
  # Process exists — validate cwd and user before restarting.
  PROC_CWD=$(echo "$PM2_JSON" | python3 -c "
import json, sys
procs = json.load(sys.stdin)
p = next(p for p in procs if p.get('name') == 'last-human-standing')
print(p.get('pm2_env', {}).get('pm_cwd', '') or p.get('pm2_env', {}).get('cwd', ''))
" 2>/dev/null || echo "")

  PROC_USER=$(echo "$PM2_JSON" | python3 -c "
import json, sys
procs = json.load(sys.stdin)
p = next(p for p in procs if p.get('name') == 'last-human-standing')
env = p.get('pm2_env', {})
print(env.get('username', '') or env.get('USER', ''))
" 2>/dev/null || echo "")

  PROC_RESTARTS=$(echo "$PM2_JSON" | python3 -c "
import json, sys
procs = json.load(sys.stdin)
p = next(p for p in procs if p.get('name') == 'last-human-standing')
print(p.get('pm2_env', {}).get('restart_time', 0))
" 2>/dev/null || echo "0")

  PRE_RESTARTS="$PROC_RESTARTS"

  # Abort if running as root (should always be deploy user)
  if [ "$PROC_USER" = "root" ]; then
    echo "[deploy] FATAL: pm2 process is running as root, not deploy."
    echo "         Fix: sudo pm2 delete last-human-standing && sudo pm2 save --force"
    echo "         Then re-run this deploy (it will bootstrap from ecosystem.config.cjs)."
    exit 1
  fi

  # Abort if cwd doesn't match the expected /opt/last-human-standing/current
  EXPECTED_CWD="$ROOT/current"
  if [ -n "$PROC_CWD" ] && [ "$PROC_CWD" != "$EXPECTED_CWD" ]; then
    echo "[deploy] FATAL: pm2 process cwd is '$PROC_CWD', expected '$EXPECTED_CWD'."
    echo "         This causes MODULE_NOT_FOUND crash loops."
    echo "         Fix: pm2 delete last-human-standing && pm2 save"
    echo "         Then re-run this deploy."
    exit 1
  fi

  # Warn on high restart count (symptom of a crash loop)
  if [ "$PROC_RESTARTS" -gt 50 ]; then
    echo "[deploy] WARNING: process has $PROC_RESTARTS restarts — possible crash loop."
    echo "         Proceeding with restart, but check logs after deploy."
  fi

  # All checks passed — restart with updated env
  echo "[deploy] restarting pm2 (cwd=$PROC_CWD, user=$PROC_USER)"
  pm2 restart last-human-standing --update-env
else
  # Process doesn't exist — bootstrap from ecosystem config (never bare `pm2 start`)
  echo "[deploy] process not in pm2, bootstrapping from ecosystem.config.cjs"
  pm2 start "$ROOT/current/ecosystem.config.cjs" --update-env
  pm2 save
fi

# Post-restart health gate: wait 5s then check the process is online and
# hasn't immediately restarted (the hallmark of MODULE_NOT_FOUND).
sleep 5
POST_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import json, sys
procs = json.load(sys.stdin)
p = next((p for p in procs if p.get('name') == 'last-human-standing'), None)
if not p:
    print('missing')
else:
    env = p.get('pm2_env', {})
    status = env.get('status', 'unknown')
    restarts = env.get('restart_time', 0)
    print(f'{status}:{restarts}')
" 2>/dev/null || echo "unknown:0")

POST_STATE=$(echo "$POST_STATUS" | cut -d: -f1)
POST_RESTARTS=$(echo "$POST_STATUS" | cut -d: -f2)

if [ "$POST_STATE" != "online" ]; then
  echo "[deploy] FATAL: process is '$POST_STATE' after restart — likely crash-looping."
  echo "         Check: pm2 logs last-human-standing --lines 30"
  exit 1
fi

if ! [[ "$POST_RESTARTS" =~ ^[0-9]+$ ]]; then
  echo "[deploy] FATAL: invalid pm2 restart count '$POST_RESTARTS'."
  exit 1
fi

RESTART_DELTA=$((POST_RESTARTS - PRE_RESTARTS))
if [ "$RESTART_DELTA" -gt 2 ]; then
  echo "[deploy] WARNING: $RESTART_DELTA restarts during the 5s health gate — possible crash loop starting."
  echo "         Check: pm2 logs last-human-standing --lines 30"
fi

if [ "$RESTART_DELTA" -lt 0 ]; then
  echo "[deploy] WARNING: pm2 restart count reset during deployment; verify logs manually."
fi

printf '[deploy] process confirmed online (status=%s, restart_delta=%s)\n' "$POST_STATE" "$RESTART_DELTA"

# Trim to current + 1 previous. Older releases waste ~700 MB each.
echo "[deploy] trimming old releases"
current_name=$(basename "$(readlink -f "$ROOT/current")")
previous=$(ls -1t "$RELEASES" | grep -v "^${current_name}$" | head -1)
for r in $(ls -1 "$RELEASES"); do
  if [ "$r" != "$current_name" ] && [ "$r" != "$previous" ]; then
    echo "[deploy] removing $r"
    rm -rf "$RELEASES/$r"
  fi
done

echo "[deploy] done — current is $TIMESTAMP"
df -h / | tail -1
