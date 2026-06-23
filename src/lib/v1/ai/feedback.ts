import { createFeedback } from "@/lib/v1/simulation";
import { Feedback, ScenarioConfig, TranscriptTurn, TrustEvent } from "@/lib/v1/types";
import { lmstudioStructured } from "./lmstudio";
import { feedbackResponseSchema } from "./schema";

function buildFeedbackPrompt(scenario: ScenarioConfig, transcript: TranscriptTurn[], events: TrustEvent[]): string {
  const lines = transcript.map((t) => `[${t.timestampSeconds}s] ${t.speaker === "student" ? "Student" : scenario.client.name}: ${t.text}`).join("\n");
  const markers = events
    .map((e) => `[${e.timestampSeconds}s] delta ${e.delta} (${e.markerType}): "${e.studentMessage}" → ${e.explanation}`)
    .join("\n");

  return `You are an educational communication coach reviewing a practice session.

Scenario: ${scenario.title}
Client: ${scenario.client.name} (${scenario.client.role})
Learning goals: ${scenario.learningGoals.join("; ")}

Transcript:
${lines || "No transcript."}

Trust events:
${markers || "No trust events recorded."}

Provide constructive, non-judgmental feedback. Focus on empathy, clarity, open questions, active listening, and next steps.
Do not give clinical, legal, or counselling advice.
Score each dimension from 1-10 (integers only).
Return ONLY valid JSON matching the schema.`;
}

function sanitizeFeedback(raw: Partial<Feedback>): Feedback | null {
  if (!raw.scores || !raw.strengths?.length || !raw.missedOpportunities?.length || !raw.suggestedRetry) return null;

  const clamp = (n: unknown) => Math.min(10, Math.max(1, Math.round(Number(n) || 5)));

  return {
    scores: {
      empathy: clamp(raw.scores.empathy),
      clarity: clamp(raw.scores.clarity),
      questioning: clamp(raw.scores.questioning),
      nextSteps: clamp(raw.scores.nextSteps),
    },
    strengths: raw.strengths.map(String).slice(0, 4),
    missedOpportunities: raw.missedOpportunities.map(String).slice(0, 4),
    suggestedRetry: String(raw.suggestedRetry).trim(),
  };
}

export async function generateFeedback(
  scenario: ScenarioConfig,
  transcript: TranscriptTurn[],
  trustEvents: TrustEvent[],
): Promise<Feedback & { source: "lmstudio" | "simulation" }> {
  const fallback = createFeedback(transcript, trustEvents);

  const result = await lmstudioStructured<Partial<Feedback>>({
    schemaName: "session_feedback",
    schema: feedbackResponseSchema,
    messages: [{ role: "user", content: buildFeedbackPrompt(scenario, transcript, trustEvents) }],
  });

  const parsed = result ? sanitizeFeedback(result) : null;
  if (parsed) return { ...parsed, source: "lmstudio" };

  return { ...fallback, source: "simulation" };
}
