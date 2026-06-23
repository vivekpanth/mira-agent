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

LM_PORT="${LMSTUDIO_PORT:-1234}"
LM_BASE="${LMSTUDIO_BASE_URL:-http://localhost:${LM_PORT}/v1}"
LM_MODEL="${LMSTUDIO_MODEL:-qwen/qwen3-8b}"
LM_LOAD_KEY="${LMSTUDIO_LOAD_KEY:-qwen}"
LLM_PROVIDER="${LLM_PROVIDER:-auto}"
if [[ "${LLM_PROVIDER}" == "auto" && "${LM_BASE}" == *":11434"* ]]; then
  LLM_PROVIDER="ollama"
fi
if [[ "${LLM_PROVIDER}" == "ollama" || "${LLM_PROVIDER}" == "local" ]]; then
  LM_BASE="${LMSTUDIO_BASE_URL:-http://localhost:11434/v1}"
  LM_MODEL="${LMSTUDIO_MODEL:-${OLLAMA_MODEL:-gemma4:e4b}}"
  LLM_PROVIDER="ollama"
fi
KOKORO_URL="${KOKORO_BASE_URL:-http://localhost:8880/v1}"
KOKORO_HEALTH="${KOKORO_URL%/v1}/health"
APP_PORT="${PORT:-3000}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  ✓ %s\n' "$*"; }
warn() { printf '  ⚠ %s\n' "$*"; }
step() { echo; bold "$*"; }

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local tries="${3:-40}"
  local i=1
  while (( i <= tries )); do
    if curl -sf "$url" >/dev/null 2>&1; then
      ok "$label ready"
      return 0
    fi
    printf '  … waiting for %s (%s/%s)\r' "$label" "$i" "$tries"
    sleep 2
    (( i++ ))
  done
  echo
  warn "$label did not become ready in time"
  return 1
}

is_local_lm() {
  [[ "${LM_BASE}" == *"localhost"* || "${LM_BASE}" == *"127.0.0.1"* ]]
}

need_cmd docker
need_cmd curl
need_cmd npm

step "MIRA — starting full stack"

step "1/4 Kokoro TTS (Docker)"
if curl -sf "$KOKORO_HEALTH" >/dev/null 2>&1; then
  ok "Kokoro already running on port 8880 (reusing existing container)"
else
  docker compose up -d kokoro
  wait_for_url "$KOKORO_HEALTH" "Kokoro TTS" 45 || {
    warn "Kokoro failed — voice will fall back to macOS say / browser"
    warn "Check logs: npm run tts:logs"
  }
fi

step "2/4 Local LLM"
if [[ "${LLM_PROVIDER}" == "ollama" ]] || [[ "${LM_BASE}" == *":11434"* ]]; then
  if command -v ollama >/dev/null 2>&1; then
    if curl -sf "${LM_BASE%/v1}/api/tags" >/dev/null 2>&1 || curl -sf "http://localhost:11434/api/tags" >/dev/null 2>&1; then
      ok "Ollama is running"
    else
      ok "Starting Ollama (ollama serve)…"
      ollama serve >/dev/null 2>&1 &
      sleep 2
    fi

    if ! ollama list 2>/dev/null | awk 'NR>1 {print $1}' | grep -Fiq "${LM_MODEL}"; then
      ok "Pulling Ollama model: ${LM_MODEL} (one-time download)"
      ollama pull "${LM_MODEL}"
    else
      ok "Ollama model ready: ${LM_MODEL}"
    fi
  else
    warn "ollama CLI not found — install from https://ollama.com/download"
  fi

  wait_for_url "${LM_BASE}/models" "Ollama API" 20 || {
    warn "Ollama API not reachable — app will use offline simulation"
  }
elif is_local_lm; then
  if command -v lms >/dev/null 2>&1; then
    if ! lms ps 2>/dev/null | grep -q "${LM_LOAD_KEY}"; then
      ok "Loading model: ${LM_LOAD_KEY} → ${LM_MODEL}"
      lms load "${LM_LOAD_KEY}" --yes
    else
      ok "LM Studio model already loaded"
    fi

    if ! lms server status 2>/dev/null | grep -q "running"; then
      ok "Starting LM Studio API on port ${LM_PORT}"
      lms server start --port "${LM_PORT}"
    else
      ok "LM Studio server already running"
    fi
  else
    warn "lms CLI not found (install LM Studio or add ~/.lmstudio/bin to PATH)"
  fi

  wait_for_url "${LM_BASE}/models" "LM Studio API" 20 || {
    warn "LM Studio API not reachable — app will use offline simulation"
  }
else
  ok "Using remote LLM at ${LM_BASE}"
  wait_for_url "${LM_BASE}/models" "Remote LLM API" 20 || {
    warn "Remote LLM not reachable — app will use offline simulation"
  }
fi

step "3/4 Next.js app"
if [[ ! -d node_modules ]]; then
  ok "Installing npm dependencies…"
  npm install
fi

step "4/4 Warm-up"
(
  for _ in $(seq 1 30); do
    if curl -sf "http://localhost:${APP_PORT}/api/tts" >/dev/null 2>&1; then
      curl -sf "http://localhost:${APP_PORT}/api/tts" >/dev/null 2>&1 || true
      ok "TTS warmed"
      break
    fi
    sleep 2
  done
) &

echo
bold "Ready — open http://localhost:${APP_PORT}"
echo "  LLM:  ${LM_BASE} (${LM_MODEL})"
echo "  TTS:  ${KOKORO_URL}"
echo "  Stop: npm run stop"
echo

exec npm run dev -- --port "${APP_PORT}"
