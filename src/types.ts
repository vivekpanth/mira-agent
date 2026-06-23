// src/types.ts — FROZEN CONTRACTS.
// Do NOT change a shape without an explicit instruction. Every screen, API route,
// service, and fixture must honor these. This is what lets 4 people build in parallel.

export type Mood = 'anxious' | 'angry' | 'sad' | 'neutral';
export type Difficulty = 'Easy' | 'Moderate' | 'Hard';

/** Parsed from the student's free-text scenario by /api/scenario. Drives the environment. */
export interface Persona {
  role: string;            // e.g. "Patient — Margaret, 58"
  scene: string;           // e.g. "Presenting with chest pain"
  emotion: string;         // e.g. "Anxious, guarded"
  difficulty: Difficulty;
  hiddenConcern: string;   // e.g. "Fears she is having a heart attack"
  objectives: string[];    // 3 learning objectives MIRA will assess
  avatarMood: Mood;        // drives 3D posture + lighting colour
  voiceId?: string;        // preferred TTS voice id (engine-specific)
}

/** One line of dialogue in the running transcript. */
export interface Turn {
  speaker: 'student' | 'client';
  text: string;
  tMs: number;             // ms offset from session start (for pace/metrics)
  sentiment?: number;      // -1..1 (Comprehend or local)
}

/** Response from /api/converse for a single client turn. */
export interface ConverseResult {
  replyText: string;
  audioUrl: string | null; // synthesized voice (data url), or null -> speechSynthesis fallback
  mood: Mood;              // may shift during the conversation
}

/** Deterministic, code-computed metrics (lib/metrics.ts). Reproducible & explainable. */
export interface Metrics {
  talkRatio: number;       // 0..1 student share of words
  fillers: number;         // count of um/uh/like/you know
  wpm: number;             // student words per minute
  interruptions: number;
  eyeContactPct: number;   // Rekognition sampled frames, or 0 if unused
  avgSentiment: number;    // -1..1
}

export interface Evidence {
  quote: string;           // exact line from the session
  tag: 'good' | 'improve' | 'flag';
  comment: string;         // why it matters
}

/** The coaching report from /api/analyze. Every subscore must be backed by evidence. */
export interface Report {
  overall: number;         // 0..100
  subscores: {
    empathy: number; clarity: number; questioning: number;
    structure: number; nonverbal: number;
  };
  metrics: Metrics;
  evidence: Evidence[];    // >=1 per subscore
  tips: [string, string];  // exactly two, prioritised, actionable
  // optional progress seed for the "71 -> 85" trend moment
  trend?: { label: string; from: number; to: number; sessions: number };
}

/** Single source of truth held by useSession(). */
export interface SessionState {
  step: 1 | 2 | 3;
  scenarioText: string;
  persona: Persona | null;
  turns: Turn[];
  report: Report | null;
  recordingUrl: string | null;
}
