export type ClientEmotion = "neutral" | "anxious" | "defensive" | "relieved";
export type MarkerType = "empathy" | "open_question" | "clarity" | "judgement" | "interruption" | "missed_opportunity" | "supportive_next_step";

export type ScenarioConfig = {
  id: string;
  title: string;
  rawPrompt: string;
  setting: "student_support_office" | "clinic" | "it_helpdesk";
  client: { name: string; role: string; initialEmotion: ClientEmotion; hiddenConcern: string };
  learningGoals: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
};

export type ConversationResponse = { reply: string; emotion: ClientEmotion; trustDelta: number; markerType: MarkerType; coachingSignal: string; suggestedAlternative?: string };
export type TranscriptTurn = { id: string; speaker: "student" | "client"; text: string; timestampSeconds: number };
export type TrustEvent = { id: string; timestampSeconds: number; previousScore: number; nextScore: number; delta: number; markerType: MarkerType; studentMessage: string; explanation: string; suggestedAlternative?: string };
export type Feedback = { scores: { empathy: number; clarity: number; questioning: number; nextSteps: number }; strengths: string[]; missedOpportunities: string[]; suggestedRetry: string };

