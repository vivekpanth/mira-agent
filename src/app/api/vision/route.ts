import { NextResponse } from "next/server";
import { detectEyeContact } from "@/services/rekognition";

// POST { image: dataURL|base64 } -> { onTarget: boolean }
// One Rekognition sample per call; the client aggregates these into eyeContactPct.
// ?demo=1 returns a positive sample without touching AWS (CLAUDE.md §3).
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("demo") === "1") {
    return NextResponse.json({ onTarget: true });
  }

  let image = "";
  try {
    const body = await req.json();
    image = typeof body?.image === "string" ? body.image : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!image) {
    return NextResponse.json({ error: "Missing 'image'" }, { status: 400 });
  }

  // Accept a full data URL ("data:image/jpeg;base64,....") or raw base64.
  const base64 = image.includes(",") ? image.slice(image.indexOf(",") + 1) : image;
  const onTarget = await detectEyeContact(base64);
  return NextResponse.json({ onTarget });
}
