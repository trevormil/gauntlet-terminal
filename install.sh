#!/usr/bin/env bash
# Gauntlet Terminal — one-line installer (macOS).
#   curl -fsSL https://labs.gauntletai.com/trevormiller/gauntlet-terminal/-/raw/main/install.sh | bash
set -euo pipefail

REPO="https://labs.gauntletai.com/trevormiller/gauntlet-terminal.git"
DIR="${1:-$HOME/gauntlet-terminal}"

echo "◆ Gauntlet Terminal installer"

if ! command -v bun >/dev/null 2>&1; then
  echo "✗ bun is required — install it from https://bun.sh then re-run." >&2
  exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo "✗ git is required." >&2
  exit 1
fi

if [ -d "$DIR/.git" ]; then
  echo "▸ Updating existing checkout at $DIR"
  git -C "$DIR" pull --ff-only
else
  echo "▸ Cloning into $DIR"
  git clone "$REPO" "$DIR"
fi

cd "$DIR"
echo "▸ Installing dependencies (rebuilds node-pty for Electron)…"
bun install

echo ""
echo "✓ Installed. Launch with:"
echo "    cd $DIR && bun run dev"
echo ""
echo "  Point it at a project:   GT_CWD=~/your/project bun run dev"
