import { NextResponse } from "next/server";
import type { ConverseResult, Persona, Turn } from "@/types";
import { generateConversationResponse } from "@/lib/v1/ai/conversation";
import { synthesizeClientSpeech } from "@/lib/v1/voice/serverTts";
import {
  emotionToMood,
  personaToScenario,
  rebuildTrustState,
  toAudioDataUrl,
  turnsToTranscript,
} from "@/lib/v1-adapter";
import { mockPersona } from "@/fixtures/persona";
import { mockTurns } from "@/fixtures/conversation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { turns, studentText, persona? } -> ConverseResult. Backed by v1 LM Studio + Kokoro TTS.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("demo") === "1") {
    const firstClient = mockTurns.find((t) => t.speaker === "client")!;
    return NextResponse.json<ConverseResult>({
      replyText: firstClient.text,
      audioUrl: null,
      mood: mockPersona.avatarMood,
    });
  }

  let turns: Turn[] = [];
  let studentText = "";
  let persona: Persona | null = null;
  try {
    const body = await req.json();
    turns = Array.isArray(body?.turns) ? body.turns : [];
    studentText = typeof body?.studentText === "string" ? body.studentText : "";
    persona = body?.persona ?? null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!studentText.trim()) {
    return NextResponse.json({ error: "Missing 'studentText'" }, { status: 400 });
  }

  const activePersona = persona ?? mockPersona;
  const scenario = personaToScenario(activePersona, activePersona.scene);
  const history = turnsToTranscript(turns);
  const { trustScore, trustEvents } = rebuildTrustState(turns);

  const result = await generateConversationResponse({
    scenario,
    studentMessage: studentText,
    history,
    trustScore,
    turnCount: trustEvents.length,
  });

  const mood = emotionToMood(result.emotion);
  let audioUrl: string | null = null;
  const tts = await synthesizeClientSpeech(result.reply, scenario.id, result.emotion);
  if (tts) audioUrl = toAudioDataUrl(tts.audio, tts.contentType);

  return NextResponse.json<ConverseResult>({
    replyText: result.reply,
    audioUrl,
    mood,
  });
}
