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

# Restart pm2 with the new env. --update-env re-reads .env so any
# changes to GAME_LAUNCH_AT, FREE_ENTRY_MODE, etc. take effect.
echo "[deploy] restarting pm2"
pm2 restart last-human-standing --update-env

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
