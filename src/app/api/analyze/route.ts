import { NextResponse } from "next/server";
import type { Report, Turn } from "@/types";
import { generateFeedback } from "@/lib/v1/ai/feedback";
import { feedbackToReport, rebuildTrustState, scenarioFromTurns, turnsToTranscript } from "@/lib/v1-adapter";
import { mockReport } from "@/fixtures/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { turns, persona?, eyeContactPct? } -> Report. Uses v1 LM Studio feedback engine.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("demo") === "1") {
    return NextResponse.json<Report>(mockReport);
  }

  let turns: Turn[] = [];
  let eyeContactPct: number | undefined;
  try {
    const body = await req.json();
    turns = Array.isArray(body?.turns) ? body.turns : [];
    if (typeof body?.eyeContactPct === "number") eyeContactPct = body.eyeContactPct;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (turns.length === 0) {
    return NextResponse.json({ error: "Missing 'turns'" }, { status: 400 });
  }

  const scenario = scenarioFromTurns(turns);
  const transcript = turnsToTranscript(turns);
  const { trustEvents } = rebuildTrustState(turns);

  const feedback = await generateFeedback(scenario, transcript, trustEvents);
  const report = feedbackToReport(feedback, turns, eyeContactPct);
  return NextResponse.json<Report>(report);
}
