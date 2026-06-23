import { NextResponse } from "next/server";
import type { Persona } from "@/types";
import { mockPersona } from "@/fixtures/persona";
import { resolveScenarioFromText, scenarioToPersona } from "@/lib/v1-adapter";

// POST { text } -> Persona. Uses the v1 scenario engine (LM Studio + presets).
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("demo") === "1") {
    return NextResponse.json<Persona>(mockPersona);
  }

  let text = "";
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Missing 'text'" }, { status: 400 });
  }

  const scenario = resolveScenarioFromText(text);
  const persona = scenarioToPersona(scenario);
  return NextResponse.json<Persona>(persona);
}
