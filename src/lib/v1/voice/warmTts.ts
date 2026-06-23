import { tts } from "@/lib/v1/ai/config";
import { warmKokoroEngine } from "./kokoroEngine";
import { kokoroHttpAvailable, warmKokoroHttp } from "./kokoroHttp";

export async function warmTtsEngine(): Promise<{ ok: boolean; provider: string; warmed: boolean }> {
  if (tts.kokoroBaseUrl && (tts.engine === "auto" || tts.engine === "kokoro-docker" || tts.engine === "kokoro-http")) {
    await warmKokoroHttp();
    return { ok: true, provider: "kokoro-http", warmed: true };
  }

  await warmKokoroEngine();
  return { ok: true, provider: "kokoro", warmed: true };
}

export async function getTtsStatus(): Promise<{ ok: boolean; provider: string; docker: boolean }> {
  if (tts.kokoroBaseUrl) {
    const docker = await kokoroHttpAvailable();
    return { ok: docker, provider: "kokoro-http", docker };
  }
  return { ok: true, provider: "kokoro", docker: false };
}
