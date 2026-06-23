import type { KokoroTTS } from "kokoro-js";
import type { KokoroVoice } from "./profiles";

type KokoroModule = typeof import("kokoro-js");

let engine: KokoroTTS | null = null;
let loading: Promise<KokoroTTS> | null = null;

async function loadEngine(): Promise<KokoroTTS> {
  if (engine) return engine;
  if (loading) return loading;

  loading = (async () => {
    const mod: KokoroModule = await import("kokoro-js");
    engine = await mod.KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "q8",
      device: "cpu",
    });
    return engine;
  })();

  return loading;
}

export async function synthesizeWithKokoro(text: string, voice: KokoroVoice, speed: number): Promise<ArrayBuffer> {
  const tts = await loadEngine();
  const audio = await tts.generate(text, { voice, speed });
  return audio.toWav();
}

export async function warmKokoroEngine(): Promise<void> {
  await loadEngine();
}
