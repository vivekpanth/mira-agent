export type LlmProvider = "lmstudio" | "ollama" | "auto" | "local";

function detectProvider(): LlmProvider {
  const explicit = process.env.LLM_PROVIDER;
  if (explicit === "ollama" || explicit === "lmstudio") return explicit;
  if (explicit === "local") return "ollama";
  const base = process.env.LMSTUDIO_BASE_URL ?? "http://localhost:1234/v1";
  if (base.includes(":11434")) return "ollama";
  return "lmstudio";
}

export const llmProvider: LlmProvider = detectProvider();

export const lmstudio = {
  baseUrl: process.env.LMSTUDIO_BASE_URL ?? (llmProvider === "ollama" ? "http://localhost:11434/v1" : "http://localhost:1234/v1"),
  model: process.env.LMSTUDIO_MODEL ?? (llmProvider === "ollama" ? "gemma4:e4b" : "qwen/qwen3-8b"),
  timeoutMs: Number(process.env.LMSTUDIO_TIMEOUT_MS ?? 45000),
  temperature: Number(process.env.LMSTUDIO_TEMPERATURE ?? 0.75),
  maxTokens: Number(process.env.LMSTUDIO_MAX_TOKENS ?? 400),
  enabled: process.env.LMSTUDIO_ENABLED !== "false",
  provider: llmProvider,
};

export const tts = {
  /** auto | kokoro-docker | kokoro | piper | macos | browser */
  engine: process.env.TTS_ENGINE ?? "auto",
  /** Kokoro Docker OpenAI-compatible API (default when using docker-compose) */
  kokoroBaseUrl: process.env.KOKORO_BASE_URL ?? "http://localhost:8880/v1",
  /** Optional Piper HTTP server, e.g. http://localhost:5000 */
  piperBaseUrl: process.env.PIPER_BASE_URL,
};
