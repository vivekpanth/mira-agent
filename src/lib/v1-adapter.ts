import type { Difficulty, Evidence, Mood, Persona, Report, Turn } from "@/types";
import { computeMetrics } from "@/lib/metrics";
import { scenarios, defaultScenario } from "@/lib/v1/scenarios";
import { simulateResponse } from "@/lib/v1/simulation";
import type {
  ClientEmotion,
  Feedback,
  ScenarioConfig,
  TranscriptTurn,
  TrustEvent,
} from "@/lib/v1/types";

const DIFFICULTY_TO_V1: Record<Difficulty, ScenarioConfig["difficulty"]> = {
  Easy: "beginner",
  Moderate: "intermediate",
  Hard: "advanced",
};

const DIFFICULTY_FROM_V1: Record<ScenarioConfig["difficulty"], Difficulty> = {
  beginner: "Easy",
  intermediate: "Moderate",
  advanced: "Hard",
};

const SETTING_KEYWORDS: Array<{ setting: ScenarioConfig["setting"]; terms: string[] }> = [
  { setting: "clinic", terms: ["patient", "clinic", "doctor", "nurse", "chest", "breath", "symptom", "medical", "hospital", "gp"] },
  { setting: "it_helpdesk", terms: ["software", "system", "outage", "server", "it", "helpdesk", "payroll", "ticket", "escalat", "tech", "login"] },
  { setting: "student_support_office", terms: ["student", "assignment", "group", "unit", "deadline", "colleague", "team", "support", "1:1", "manager"] },
];

// Match a term at a word START (so "breath" still hits "breathing") but never
// mid-word — otherwise short terms like "it" wrongly match "wait", "unit", etc.
function includesAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((t) => {
    const esc = t.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${esc}`, "i").test(lower);
  });
}

function pickScenarioTemplate(text: string): ScenarioConfig {
  const lower = text.toLowerCase();
  if (includesAny(lower, ["breath", "chest pain", "clinic", "patient", "symptom", "gp", "hospital"])) {
    return scenarios.find((s) => s.id === "breathing-support") ?? defaultScenario;
  }
  if (includesAny(lower, ["software", "outage", "system", "payroll", "server", "it", "helpdesk", "escalat"])) {
    return scenarios.find((s) => s.id === "software-outage") ?? defaultScenario;
  }
  if (includesAny(lower, ["assignment", "group", "student", "unit", "deadline"])) {
    return scenarios.find((s) => s.id === "group-assignment-support") ?? defaultScenario;
  }
  return defaultScenario;
}

function inferSetting(text: string): ScenarioConfig["setting"] {
  for (const row of SETTING_KEYWORDS) {
    if (includesAny(text, row.terms)) return row.setting;
  }
  return "student_support_office";
}

function inferEmotion(text: string): ClientEmotion {
  const lower = text.toLowerCase();
  if (includesAny(lower, ["angry", "frustrat", "upset", "demand", "escalat", "furious"])) return "defensive";
  if (includesAny(lower, ["grief", "sad", "bereav", "end-of-life", "dying", "loss"])) return "anxious";
  if (includesAny(lower, ["anxious", "worried", "nervous", "scared", "afraid"])) return "anxious";
  return "anxious";
}

function inferDifficulty(text: string): ScenarioConfig["difficulty"] {
  const lower = text.toLowerCase();
  if (includesAny(lower, ["advanced", "difficult", "angry", "escalat", "hostile"])) return "advanced";
  if (includesAny(lower, ["beginner", "simple", "easy", "first time"])) return "beginner";
  return "intermediate";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "custom-scenario";
}

// Common capitalised words that start sentences / titles but are NOT names.
// Without this filter "My client…" → "My", "They are upset" → "They", etc.
const NAME_STOPWORDS = new Set([
  "a", "an", "the", "i", "my", "we", "they", "he", "she", "it", "you", "your", "our",
  "this", "that", "these", "those", "after", "before", "when", "while", "their", "there",
  "please", "help", "his", "her", "its", "and", "but", "so", "because", "during",
  "client", "customer", "patient", "student", "manager", "staff", "team", "user",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
]);

// Pull a believable first name from the prompt; otherwise keep the curated
// template name (always a proper name) rather than a random capitalised word.
function extractName(text: string, fallback: string): string {
  // 1) Explicit signal: "named Maya", "called Sam", "name is Jordan".
  const explicit = text.match(/\b(?:name(?:d|'s| is)?|called)\s+([A-Z][a-z]+)/);
  if (explicit?.[1]) return explicit[1];

  // 2) Title + name: "Mr Smith", "Dr. Lee", "Ms Chen". The title is matched
  // case-insensitively, but the NAME must be genuinely capitalised in the source
  // (no /i flag on the capture) — otherwise the verb "miss" in "miss their wages"
  // is read as the honorific "Miss" and "their" becomes the name "Their".
  const titled = text.match(/\b(?:[Mm]r|[Mm]rs|[Mm]s|[Mm]iss|[Dd]r|[Pp]rof)\.?\s+([A-Z][a-z]+)/);
  if (titled?.[1] && !NAME_STOPWORDS.has(titled[1].toLowerCase())) return titled[1];

  // 3) First capitalised word that isn't a sentence-starter / common word.
  for (const token of text.match(/\b[A-Z][a-z]+\b/g) ?? []) {
    if (!NAME_STOPWORDS.has(token.toLowerCase())) return token;
  }

  return fallback;
}

/** Optional explicit picks from the UI that override the keyword inference. */
export interface ScenarioOverrides {
  emotion?: ClientEmotion;
  difficulty?: ScenarioConfig["difficulty"];
}

/** Map free-text scenario input to a v1 ScenarioConfig the LM Studio stack understands. */
export function resolveScenarioFromText(text: string, overrides: ScenarioOverrides = {}): ScenarioConfig {
  const trimmed = text.trim();
  const template = pickScenarioTemplate(trimmed);
  const setting = inferSetting(trimmed);
  // Explicit UI pick wins; otherwise fall back to keyword inference.
  const emotion = overrides.emotion ?? inferEmotion(trimmed);

  return {
    ...template,
    id: slugify(trimmed),
    title: trimmed.slice(0, 80) || template.title,
    rawPrompt: trimmed || template.rawPrompt,
    setting,
    difficulty: overrides.difficulty ?? inferDifficulty(trimmed),
    client: {
      ...template.client,
      name: extractName(trimmed, template.client.name),
      initialEmotion: emotion,
      hiddenConcern: template.client.hiddenConcern,
    },
    learningGoals: template.learningGoals,
  };
}

// The professional role the STUDENT plays for each setting (the client is the
// counterpart they practise with — e.g. in IT helpdesk the client is the angry
// customer, and the student is the support officer).
const SETTING_TO_USER_ROLE: Record<ScenarioConfig["setting"], string> = {
  student_support_office: "Student support advisor",
  clinic: "Clinician",
  it_helpdesk: "IT support officer",
};

export function scenarioToPersona(scenario: ScenarioConfig): Persona {
  return {
    role: `${scenario.client.role} — ${scenario.client.name}`,
    userRole: SETTING_TO_USER_ROLE[scenario.setting],
    scene: scenario.rawPrompt.slice(0, 160),
    emotion: `${scenario.client.initialEmotion}, in a ${scenario.setting.replaceAll("_", " ")} setting`,
    difficulty: DIFFICULTY_FROM_V1[scenario.difficulty],
    hiddenConcern: scenario.client.hiddenConcern,
    objectives: scenario.learningGoals.slice(0, 3).concat(
      scenario.learningGoals.length < 3 ? Array(3 - scenario.learningGoals.length).fill("Stay present and collaborative") : [],
    ).slice(0, 3),
    avatarMood: emotionToMood(scenario.client.initialEmotion),
    voiceId: scenario.id,
  };
}

export function personaToScenario(persona: Persona, scenarioText: string): ScenarioConfig {
  const base = resolveScenarioFromText(scenarioText || persona.scene);
  return {
    ...base,
    rawPrompt: scenarioText || persona.scene,
    title: persona.scene.slice(0, 80) || base.title,
    difficulty: DIFFICULTY_TO_V1[persona.difficulty] ?? base.difficulty,
    client: {
      ...base.client,
      name: persona.role.split("—")[1]?.split(",")[0]?.trim() || base.client.name,
      role: persona.role.split("—")[0]?.trim() || base.client.role,
      hiddenConcern: persona.hiddenConcern || base.client.hiddenConcern,
      initialEmotion: moodToEmotion(persona.avatarMood),
    },
    learningGoals: persona.objectives.length ? persona.objectives : base.learningGoals,
  };
}

export function emotionToMood(emotion: ClientEmotion): Mood {
  switch (emotion) {
    case "defensive":
      return "angry";
    case "relieved":
      return "neutral";
    case "anxious":
      return "anxious";
    default:
      return "neutral";
  }
}

export function moodToEmotion(mood: Mood): ClientEmotion {
  switch (mood) {
    case "angry":
      return "defensive";
    case "sad":
      return "anxious";
    case "anxious":
      return "anxious";
    default:
      return "neutral";
  }
}

export function turnsToTranscript(turns: Turn[]): TranscriptTurn[] {
  return turns.map((turn, index) => ({
    id: `turn_${index}_${turn.tMs}`,
    speaker: turn.speaker,
    text: turn.text,
    timestampSeconds: Math.max(0, Math.round(turn.tMs / 1000)),
  }));
}

export function rebuildTrustState(turns: Turn[]): { trustScore: number; trustEvents: TrustEvent[] } {
  let trustScore = 48;
  const trustEvents: TrustEvent[] = [];
  let turnCount = 0;

  for (const turn of turns) {
    if (turn.speaker !== "student") continue;
    const sim = simulateResponse(turn.text, turnCount);
    const previousScore = trustScore;
    trustScore = Math.min(100, Math.max(0, previousScore + sim.trustDelta));
    trustEvents.push({
      id: `trust_${turnCount}_${turn.tMs}`,
      timestampSeconds: Math.max(0, Math.round(turn.tMs / 1000)),
      previousScore,
      nextScore: trustScore,
      delta: sim.trustDelta,
      markerType: sim.markerType,
      studentMessage: turn.text,
      explanation: sim.coachingSignal,
      suggestedAlternative: sim.suggestedAlternative,
    });
    turnCount += 1;
  }

  return { trustScore, trustEvents };
}

export function feedbackToReport(
  feedback: Feedback,
  turns: Turn[],
  eyeContactPct?: number,
): Report {
  const metrics = computeMetrics(turns, { eyeContactPct });
  const evidence = buildEvidence(turns, feedback);

  const subscores = {
    empathy: feedback.scores.empathy * 10,
    clarity: feedback.scores.clarity * 10,
    questioning: feedback.scores.questioning * 10,
    structure: feedback.scores.nextSteps * 10,
    nonverbal: Math.round(metrics.eyeContactPct * 0.6 + metrics.talkRatio * 40),
  };

  const overall = Math.round(
    (subscores.empathy + subscores.clarity + subscores.questioning + subscores.structure + subscores.nonverbal) / 5,
  );

  const tips: [string, string] = [
    feedback.missedOpportunities[0] ?? "Invite the client to explain what happened in their own words.",
    feedback.suggestedRetry,
  ];

  return {
    overall,
    subscores,
    metrics,
    evidence,
    tips,
    trend: { label: "Session score", from: Math.max(0, overall - 12), to: overall, sessions: 1 },
  };
}

/**
 * Build evidence from the per-turn trust events, so each item quotes a DISTINCT,
 * real student line with its own coaching note. Falls back to the LLM feedback's
 * strengths/missed-opportunities (no quote) when there aren't enough turns.
 */
function buildEvidence(turns: Turn[], feedback: Feedback): Evidence[] {
  const { trustEvents } = rebuildTrustState(turns);

  // Keep the single strongest event per unique student message.
  const byMessage = new Map<string, (typeof trustEvents)[number]>();
  for (const ev of trustEvents) {
    const key = ev.studentMessage.trim().toLowerCase();
    if (!key) continue;
    const existing = byMessage.get(key);
    if (!existing || Math.abs(ev.delta) > Math.abs(existing.delta)) byMessage.set(key, ev);
  }
  const unique = [...byMessage.values()];

  const positives = unique
    .filter((e) => e.delta > 0)
    .sort((a, b) => b.delta - a.delta);
  const negatives = unique
    .filter((e) => e.delta < 0)
    .sort((a, b) => a.delta - b.delta);

  const evidence: Evidence[] = [];
  for (const e of positives.slice(0, 2)) {
    evidence.push({ quote: e.studentMessage, tag: "good", comment: e.explanation });
  }
  for (const e of negatives.slice(0, 2)) {
    evidence.push({ quote: e.studentMessage, tag: "improve", comment: e.explanation });
  }

  // Fallback: no scored turns yet — surface the LLM's prose without a fake quote.
  if (evidence.length === 0) {
    for (const strength of feedback.strengths.slice(0, 1)) {
      evidence.push({ quote: strength, tag: "good", comment: "Strength noted across the session." });
    }
    for (const missed of feedback.missedOpportunities.slice(0, 1)) {
      evidence.push({ quote: missed, tag: "improve", comment: "Opportunity to build on next time." });
    }
  }

  return evidence;
}

export function toAudioDataUrl(audio: ArrayBuffer | Buffer, contentType: string): string {
  const buffer = audio instanceof ArrayBuffer ? Buffer.from(audio) : Buffer.from(audio);
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export function scenarioFromTurns(turns: Turn[], fallbackPersona?: Persona | null): ScenarioConfig {
  const transcript = turns.map((t) => t.text).join(" ");
  if (fallbackPersona) return personaToScenario(fallbackPersona, fallbackPersona.scene);
  return resolveScenarioFromText(transcript || "practice conversation");
}
