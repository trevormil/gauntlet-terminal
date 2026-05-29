#!/usr/bin/env bash
# TerMinal — one-line installer (macOS).
#   curl -fsSL https://raw.githubusercontent.com/trevormil/TerMinal/main/install.sh | bash
set -euo pipefail

REPO="https://github.com/trevormil/TerMinal.git"
DIR="${1:-$HOME/TerMinal}"

echo "◆ TerMinal installer"

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
echo "▸ Fetching the project-template submodule (for scaffolding)…"
git submodule update --init >/dev/null 2>&1 || true
echo "▸ Installing dependencies (rebuilds node-pty for Electron)…"
bun install

echo ""
echo "✓ Installed. Launch with:"
echo "    cd $DIR && bun run dev"
echo ""
echo "  On first launch, onboarding detects your tools; pick any folder to"
echo "  attach a Claude session from the session picker."
