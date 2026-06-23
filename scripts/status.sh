#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="${HOME}/.lmstudio/bin:${PATH}"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

LM_BASE="${LMSTUDIO_BASE_URL:-http://localhost:1234/v1}"
KOKORO_HEALTH="${KOKORO_BASE_URL:-http://localhost:8880/v1}"
KOKORO_HEALTH="${KOKORO_HEALTH%/v1}/health"
APP="http://localhost:${PORT:-3000}"
LLM_PROVIDER="${LLM_PROVIDER:-auto}"

check() {
  if curl -sf "$1" >/dev/null 2>&1; then
    printf '  ✓ %s\n' "$2"
  else
    printf '  ✗ %s\n' "$2"
  fi
}

echo "MIRA health"
check "$KOKORO_HEALTH" "Kokoro TTS  ($KOKORO_HEALTH)"
LLM_LABEL="LM Studio"
if [[ "${LLM_PROVIDER}" == "ollama" || "${LLM_PROVIDER}" == "local" || "${LM_BASE}" == *":11434"* ]]; then
  LLM_LABEL="Ollama"
fi
check "$LM_BASE/models" "${LLM_LABEL}  ($LM_BASE)"
check "$APP" "Next.js app ($APP)"

if command -v ollama >/dev/null 2>&1 && [[ "${LLM_LABEL}" == "Ollama" ]]; then
  echo
  ollama list 2>/dev/null || true
elif command -v lms >/dev/null 2>&1; then
  echo
  lms ps 2>/dev/null || true
fi
