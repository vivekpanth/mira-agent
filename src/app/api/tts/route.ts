import { NextRequest, NextResponse } from "next/server";
import type { ClientEmotion } from "@/lib/v1/types";
import { synthesizeClientSpeech } from "@/lib/v1/voice/serverTts";
import { getTtsStatus, warmTtsEngine } from "@/lib/v1/voice/warmTts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emotions: ClientEmotion[] = ["neutral", "anxious", "defensive", "relieved"];

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const text = String(payload.text ?? "");
  const scenarioId = String(payload.scenarioId ?? "group-assignment-support");
  const emotion = emotions.includes(payload.emotion) ? (payload.emotion as ClientEmotion) : "neutral";

  const result = await synthesizeClientSpeech(text, scenarioId, emotion);
  if (!result) return NextResponse.json({ error: "TTS unavailable" }, { status: 503 });

  const audioBytes = result.audio instanceof ArrayBuffer ? new Uint8Array(result.audio) : new Uint8Array(result.audio);
  return new NextResponse(audioBytes, {
    headers: {
      "Content-Type": result.contentType,
      "X-TTS-Provider": result.provider,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  try {
    const status = await getTtsStatus();
    if (!status.ok) {
      return NextResponse.json(
        { ...status, error: "Kokoro Docker is not running. Run: npm run tts:up" },
        { status: 503 },
      );
    }
    const warmed = await warmTtsEngine();
    return NextResponse.json({ ...warmed, docker: status.docker });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 503 });
  }
}
