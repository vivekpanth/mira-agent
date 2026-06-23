import { tts } from "@/lib/v1/ai/config";
import type { KokoroVoice } from "./profiles";

export async function kokoroHttpAvailable(): Promise<boolean> {
  if (!tts.kokoroBaseUrl) return false;
  try {
    const base = tts.kokoroBaseUrl.replace(/\/v1\/?$/, "");
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function warmKokoroHttp(): Promise<void> {
  if (!tts.kokoroBaseUrl) return;
  const available = await kokoroHttpAvailable();
  if (!available) throw new Error("Kokoro Docker service is not reachable at " + tts.kokoroBaseUrl);

  const res = await fetch(`${tts.kokoroBaseUrl}/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: "kokoro",
      voice: "bf_emma",
      input: "Ready.",
      speed: 1,
      response_format: "wav",
    }),
  });
  if (!res.ok) throw new Error(`Kokoro warm request failed (${res.status})`);
}

export async function synthesizeKokoroHttp(text: string, voice: KokoroVoice, speed: number): Promise<ArrayBuffer | null> {
  if (!tts.kokoroBaseUrl) return null;

  try {
    const res = await fetch(`${tts.kokoroBaseUrl}/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model: "kokoro",
        voice,
        input: text,
        speed,
        response_format: "wav",
      }),
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}
