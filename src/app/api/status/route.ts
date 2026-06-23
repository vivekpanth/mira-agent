import { NextResponse } from "next/server";
import { lmstudio, llmProvider, tts } from "@/lib/v1/ai/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    llm: {
      provider: llmProvider,
      model: lmstudio.model,
      baseUrl: lmstudio.baseUrl,
      enabled: lmstudio.enabled,
    },
    tts: {
      engine: tts.engine,
      kokoroBaseUrl: tts.kokoroBaseUrl,
    },
  });
}
