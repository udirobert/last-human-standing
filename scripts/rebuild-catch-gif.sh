#!/bin/sh
# Rebuild docs/itch-assets/catch.gif after a fresh capture export.
#
# The Jump Jolt rule (see GAME_OFF_2026.md "Lesson pass"): itch browse
# grids render the GIF's first frame as a static still until hover, so
# frame 1 must be the painted poster, not a transition still. This script
# prepends it, pads every frame to 630x500 with the poster's desk tone,
# and writes the optimized GIF in place.
#
# Usage: bash scripts/rebuild-catch-gif.sh [export.gif]
#        (default export: /tmp/catch-export.gif from the headless capture)
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:-/tmp/catch-export.gif}"
GIF="docs/itch-assets/catch.gif"
POSTER="game-off/cover-630x500.png"
TMP="$(mktemp -d)"

[ -f "$SRC" ] || { echo "no export found at $SRC — capture the 5 catch frames first" >&2; exit 1; }

# coalesce the captured frames (they carry per-frame crop offsets), then
# pad onto the 630x500 canvas with the poster's bottom-edge desk tone
TONE=$(magick "$POSTER" -format "%[pixel:p{8,492}]" info:)
echo "desk tone: $TONE"
magick "$SRC" -coalesce "$TMP/c-%d.png"
magick "$TMP"/c-*.png -background "$TONE" -gravity center -extent 630x500 "$TMP/p-%d.png"

# poster leads (held 1.5s), then the catch frames at their captured pace
N=$(ls "$TMP"/p-*.png | wc -l | tr -d ' ')
ARGS=""
i=0
for f in "$TMP"/p-*.png; do
  # frame delays: original capture ran ~0.7s per frame
  ARGS="$ARGS ( $f -delay 71 )"
  i=$((i+1))
done
# shellcheck disable=SC2086
magick \( "$POSTER" -delay 150 \) $ARGS -loop 0 -layers optimize "$TMP/catch-new.gif"

mv "$TMP/catch-new.gif" "$GIF"
rm -rf "$TMP"
echo "wrote $GIF:"
magick identify "$GIF"
echo "frame 1 must be the full-size poster — verify: magick '$GIF'[0] frame1.png"
