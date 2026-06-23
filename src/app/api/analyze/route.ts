import { NextResponse } from "next/server";
import type { Report, Turn } from "@/types";
import { analyze } from "@/services/bedrock";
import { computeMetrics } from "@/lib/metrics";
import { mockReport } from "@/fixtures/report";

const USE_MOCKS = process.env.USE_MOCKS !== "false";

// POST { turns } -> Report.  ?demo=1 returns the fixture directly (CLAUDE.md §3).
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

  const report = await analyze(turns);

  if (USE_MOCKS) {
    // Mock mode: the fixture's metrics and evidence are pre-aligned (both
    // reference the same scripted session). Returning the fixture unchanged
    // keeps numbers and quoted evidence consistent — the judge sees 3 fillers,
    // and the evidence cites those exact filler words.
    return NextResponse.json<Report>(report);
  }

  // Real mode: overlay code-computed metrics so report numbers are reproducible
  // from the actual transcript (CLAUDE.md §6).
  const metrics = computeMetrics(turns, { eyeContactPct });
  return NextResponse.json<Report>({ ...report, metrics });
}
