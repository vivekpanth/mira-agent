import { simulateResponse } from "@/lib/v1/simulation";
import { ClientEmotion, ConversationResponse, MarkerType, ScenarioConfig, TranscriptTurn } from "@/lib/v1/types";
import { lmstudioStructured } from "./lmstudio";
import { conversationResponseSchema } from "./schema";

const emotions: ClientEmotion[] = ["neutral", "anxious", "defensive", "relieved"];
const markers: MarkerType[] = ["empathy", "open_question", "clarity", "judgement", "interruption", "missed_opportunity", "supportive_next_step"];

function buildSystemPrompt(scenario: ScenarioConfig, trustScore: number, turnCount: number): string {
  return `You are roleplaying as a virtual client in an educational communication practice simulation.

Scenario: ${scenario.rawPrompt}
Client name: ${scenario.client.name}
Client role: ${scenario.client.role}
Setting: ${scenario.setting.replaceAll("_", " ")}
Initial emotion: ${scenario.client.initialEmotion}
Hidden concern (reveal gradually, not immediately): ${scenario.client.hiddenConcern}
Difficulty: ${scenario.difficulty}
Learning goals for the student: ${scenario.learningGoals.join("; ")}
Current trust score (private, 0-100): ${trustScore}
Turn count: ${turnCount}

Rules:
- Stay in character as ${scenario.client.name}. Be realistic, concise (1-3 sentences), emotionally consistent.
- Do not give professional advice. You are the client, not a counsellor or expert.
- Reveal the hidden concern only after the student shows empathy, asks relevant open questions, or trust is building.
- If the student uses blaming or dismissive language, become more defensive and guarded.
- If the student validates feelings and invites explanation, open up gradually.
- Evaluate the student's latest message for communication quality.

Return ONLY valid JSON matching the schema.`;
}

function formatHistory(history: TranscriptTurn[], clientName: string): string {
  if (!history.length) return "No prior turns.";
  return history
    .slice(-12)
    .map((t) => `${t.speaker === "student" ? "Student" : clientName}: ${t.text}`)
    .join("\n");
}

function sanitize(raw: Partial<ConversationResponse>): ConversationResponse | null {
  if (!raw.reply || !raw.coachingSignal) return null;

  const emotion = emotions.includes(raw.emotion as ClientEmotion) ? (raw.emotion as ClientEmotion) : "anxious";
  const markerType = markers.includes(raw.markerType as MarkerType) ? (raw.markerType as MarkerType) : "missed_opportunity";
  const trustDelta = Math.min(10, Math.max(-10, Math.round(Number(raw.trustDelta) || 0)));

  return {
    reply: String(raw.reply).trim(),
    emotion,
    trustDelta,
    markerType,
    coachingSignal: String(raw.coachingSignal).trim(),
    suggestedAlternative: raw.suggestedAlternative ? String(raw.suggestedAlternative).trim() : undefined,
  };
}

export type ConversationRequest = {
  scenario: ScenarioConfig;
  studentMessage: string;
  history: TranscriptTurn[];
  trustScore: number;
  turnCount: number;
};

export async function generateConversationResponse(input: ConversationRequest): Promise<ConversationResponse & { source: "lmstudio" | "simulation" }> {
  const fallback = simulateResponse(input.studentMessage, input.turnCount);

  const result = await lmstudioStructured<Partial<ConversationResponse>>({
    schemaName: "conversation_response",
    schema: conversationResponseSchema,
    messages: [
      { role: "system", content: buildSystemPrompt(input.scenario, input.trustScore, input.turnCount) },
      {
        role: "user",
        content: `Conversation so far:\n${formatHistory(input.history, input.scenario.client.name)}\n\nStudent's latest message:\n${input.studentMessage}`,
      },
    ],
  });

  const parsed = result ? sanitize(result) : null;
  if (parsed) return { ...parsed, source: "lmstudio" };

  return { ...fallback, source: "simulation" };
}
