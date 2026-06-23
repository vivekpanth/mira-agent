import { tts } from "@/lib/v1/ai/config";
import { ClientEmotion } from "@/lib/v1/types";
import { synthesizeWithKokoro } from "./kokoroEngine";
import { synthesizeKokoroHttp } from "./kokoroHttp";
import { emotionSpeed, getClientVoiceProfile } from "./profiles";

export type TtsResult = {
  audio: ArrayBuffer | Buffer;
  contentType: string;
  provider: "kokoro" | "kokoro-http" | "piper" | "macos" | "browser";
};

async function synthesizePiper(text: string, voice: string, lengthScale: number): Promise<ArrayBuffer | null> {
  if (!tts.piperBaseUrl) return null;

  try {
    const res = await fetch(`${tts.piperBaseUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ text, voice, length_scale: lengthScale }),
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function synthesizeMacos(text: string, voice: string, rate: number): Promise<Buffer | null> {
  if (process.platform !== "darwin") return null;

  const { execFile } = await import("node:child_process");
  const { readFile, unlink } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const file = join(tmpdir(), `second-seat-tts-${Date.now()}.aiff`);
  const safeVoice = voice.replace(/[^a-zA-Z0-9 ]/g, "");

  try {
    await execFileAsync("say", ["-v", safeVoice, "-r", String(rate), "-o", file, text]);
    return await readFile(file);
  } catch {
    return null;
  } finally {
    await unlink(file).catch(() => undefined);
  }
}

function useDockerKokoro(): boolean {
  return Boolean(tts.kokoroBaseUrl) && (tts.engine === "auto" || tts.engine === "kokoro-docker" || tts.engine === "kokoro-http");
}

function useEmbeddedKokoro(): boolean {
  if (useDockerKokoro()) return false;
  return tts.engine === "auto" || tts.engine === "kokoro";
}

export async function synthesizeClientSpeech(text: string, scenarioId: string, emotion: ClientEmotion): Promise<TtsResult | null> {
  const trimmed = text.trim().slice(0, 600);
  if (!trimmed) return null;

  const profile = getClientVoiceProfile(scenarioId);
  const tuning = emotionSpeed[emotion];
  const macRate = Math.round(profile.macosRate * tuning.macosMul);
  const piperLengthScale = Number((1 / tuning.kokoro).toFixed(2));

  if (useDockerKokoro()) {
    const audio = await synthesizeKokoroHttp(trimmed, profile.kokoro, tuning.kokoro);
    if (audio) return { audio, contentType: "audio/wav", provider: "kokoro-http" };
  }

  if (useEmbeddedKokoro()) {
    try {
      const audio = await synthesizeWithKokoro(trimmed, profile.kokoro, tuning.kokoro);
      return { audio, contentType: "audio/wav", provider: "kokoro" };
    } catch {
      /* fall through */
    }
  }

  if (tts.piperBaseUrl && tts.engine !== "browser") {
    const audio = await synthesizePiper(trimmed, profile.piper, piperLengthScale);
    if (audio) return { audio, contentType: "audio/wav", provider: "piper" };
  }

  if (tts.engine !== "browser") {
    const audio = await synthesizeMacos(trimmed, profile.macosVoice, macRate);
    if (audio) return { audio, contentType: "audio/aiff", provider: "macos" };
  }

  return null;
}
