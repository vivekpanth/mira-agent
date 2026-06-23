// services/rekognition.ts — webcam-frame eye-contact detection, behind a Mock/Real
// switch (CLAUDE.md §3). Server-only: called only by app/api/vision. Client never
// imports this and never holds AWS keys.
//
// "On target" (looking at the client) = a face is detected, roughly front-facing
// (|yaw|,|pitch| small) and eyes open. The client aggregates many samples into the
// eyeContactPct shown in the report — lib/metrics.ts still owns that number.

const USE_MOCKS = process.env.USE_MOCKS !== "false";

// Angular tolerance (degrees) for "looking at the client". Generous on pitch:
// laptop webcams sit ABOVE the screen, so a student looking at the on-screen
// avatar naturally tilts their face downward (negative pitch). A tight 15°
// scored every frame as "off target" → eye contact always read 0%.
const YAW_TOLERANCE_DEG = 30;
const PITCH_TOLERANCE_DEG = 30;

/** true = the sampled frame shows the student looking at the client. */
export async function detectEyeContact(imageBase64: string): Promise<boolean> {
  if (USE_MOCKS) return mockDetect();
  try {
    return await realDetect(imageBase64);
  } catch (err) {
    // Throttle / transient AWS failure -> keep the demo alive with a plausible sample.
    console.warn("[rekognition] detectEyeContact fell back to mock:", (err as Error).name);
    return mockDetect();
  }
}

// Deterministic ~75% "on target" so a mock demo shows a believable, stable number.
let mockTick = 0;
function mockDetect(): boolean {
  return mockTick++ % 4 !== 0;
}

async function realDetect(imageBase64: string): Promise<boolean> {
  // Imported lazily so mock mode never loads the AWS SDK.
  const { RekognitionClient, DetectFacesCommand } = await import(
    "@aws-sdk/client-rekognition"
  );
  const client = new RekognitionClient({ region: process.env.AWS_REGION });
  const res = await client.send(
    new DetectFacesCommand({
      Image: { Bytes: Buffer.from(imageBase64, "base64") },
      Attributes: ["ALL"], // need Pose + EyesOpen
    }),
  );
  const face = res.FaceDetails?.[0];
  if (!face) return false;

  const yaw = Math.abs(face.Pose?.Yaw ?? 90);
  const pitch = Math.abs(face.Pose?.Pitch ?? 90);
  const eyesOpen = face.EyesOpen?.Value ?? true;
  const onTarget = yaw <= YAW_TOLERANCE_DEG && pitch <= PITCH_TOLERANCE_DEG && eyesOpen;
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[rekognition] yaw=${yaw.toFixed(0)} pitch=${pitch.toFixed(0)} eyesOpen=${eyesOpen} -> ${onTarget}`,
    );
  }
  return onTarget;
}
