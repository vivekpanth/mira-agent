#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="${HOME}/.lmstudio/bin:${PATH}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  ✓ %s\n' "$*"; }

bold "Stopping MIRA stack"

if docker compose ps -q kokoro 2>/dev/null | grep -q .; then
  docker compose down
  ok "Kokoro Docker stopped"
else
  ok "Kokoro Docker was not running (or owned by another project on :8880)"
fi

if command -v lms >/dev/null 2>&1; then
  if lms server status 2>/dev/null | grep -q "running"; then
    lms server stop || true
    ok "LM Studio server stopped"
  fi
fi

ok "Done (Next.js dev server: Ctrl+C if still running)"
