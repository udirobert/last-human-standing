#!/usr/bin/env bash
set -euo pipefail

# NIGHT SHIFT — Standalone Packager for GitHub Game Off 2026
# Builds the itch.io HTML5 zip and prepares an isolated git repository.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GAME_DIR="$ROOT_DIR/game-off"
STANDALONE_DIR="$ROOT_DIR/dist/night-shift"
ZIP_OUTPUT="$ROOT_DIR/dist/night-shift-itch.zip"

echo "=== 1. Verifying Game Logic & Determinism ==="
node "$GAME_DIR/test-logic.mjs"

echo "=== 2. Building itch.io HTML5 Zip Archive ==="
mkdir -p "$ROOT_DIR/dist"
cd "$GAME_DIR"
rm -f "$ZIP_OUTPUT"
zip -r "$ZIP_OUTPUT" \
  index.html \
  style.css \
  game.js \
  logic.js \
  riddles.js \
  cover-630x500.svg \
  export-cover.html \
  README.md \
  LICENSE-CREDITS.txt

echo "Created itch.io upload package: $ZIP_OUTPUT ($(du -h "$ZIP_OUTPUT" | cut -f1))"

echo "=== 3. Exporting Standalone GitHub Repository ==="
rm -rf "$STANDALONE_DIR"
mkdir -p "$STANDALONE_DIR"

cp -R "$GAME_DIR/"* "$STANDALONE_DIR/"

cat << 'EOF' > "$STANDALONE_DIR/.gitignore"
.DS_Store
*.log
node_modules/
EOF

cat << 'EOF' > "$STANDALONE_DIR/LICENSE"
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

cd "$STANDALONE_DIR"
git init -b main
git add .
git commit -m "NIGHT SHIFT — GitHub Game Off 2026 submission"

echo ""
echo "============================================================"
echo " Standalone repository prepared at:"
echo "   $STANDALONE_DIR"
echo ""
echo " Ready to push to GitHub:"
echo "   cd $STANDALONE_DIR"
echo "   git remote add origin https://github.com/<your-username>/night-shift.git"
echo "   git push -u origin main"
echo ""
echo " Ready to upload to itch.io:"
echo "   $ZIP_OUTPUT"
echo "============================================================"
