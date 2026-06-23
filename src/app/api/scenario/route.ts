import { NextResponse } from "next/server";
import type { Persona, Difficulty } from "@/types";
import { mockPersona } from "@/fixtures/persona";
import {
  resolveScenarioFromText,
  scenarioToPersona,
  type ScenarioOverrides,
} from "@/lib/v1-adapter";
import type { ClientEmotion } from "@/lib/v1/types";

const EMOTIONS: ClientEmotion[] = ["neutral", "anxious", "defensive", "relieved"];
const DIFF_MAP: Record<Difficulty, ScenarioOverrides["difficulty"]> = {
  Easy: "beginner",
  Moderate: "intermediate",
  Hard: "advanced",
};

// POST { text } -> Persona. Uses the v1 scenario engine (LM Studio + presets).
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("demo") === "1") {
    return NextResponse.json<Persona>(mockPersona);
  }

  let text = "";
  const overrides: ScenarioOverrides = {};
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text : "";
    if (EMOTIONS.includes(body?.emotion)) overrides.emotion = body.emotion;
    if (body?.difficulty in DIFF_MAP) overrides.difficulty = DIFF_MAP[body.difficulty as Difficulty];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Missing 'text'" }, { status: 400 });
  }

  const scenario = resolveScenarioFromText(text, overrides);
  const persona = scenarioToPersona(scenario);
  return NextResponse.json<Persona>(persona);
}
