// services/bedrock.ts — Bedrock persona parsing + dialogue + report scoring,
// behind a Mock/Real switch (CLAUDE.md §3). Client code never imports this.
//
// MOCK mode: a keyword router (matchArchetype) turns the scenario into a distinct
//   persona, so "the scenario drives the environment" is true without any cloud.
// REAL mode: an LLM generates the persona, in-character dialogue, and the coaching
//   report prose — Amazon Bedrock (Claude) or, when LLM_PROVIDER=local, an on-device
//   Ollama model (quota-proof for the demo). lib/metrics.ts still owns the numbers.

import type { ConverseResult, Mood, Persona, Report, Turn } from "@/types";
import { deriveArchetype, matchArchetype } from "@/lib/archetype";
import { mockPersona, PERSONA_BY_ARCHETYPE } from "@/fixtures/persona";
import { CONVERSATION_BY_ARCHETYPE } from "@/fixtures/conversation";
import { mockReport } from "@/fixtures/report";

const USE_MOCKS = process.env.USE_MOCKS !== "false";

/** Small fake latency so loading/shimmer states are actually visible in mock mode. */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MOODS: Mood[] = ["anxious", "angry", "sad", "neutral"];
const asMood = (v: unknown): Mood =>
  typeof v === "string" && (MOODS as string[]).includes(v) ? (v as Mood) : "neutral";

// ───────────────────────── parseScenario ─────────────────────────
// free text -> Persona (drives the environment + avatar look + mood)

export async function parseScenario(text: string): Promise<Persona> {
  if (USE_MOCKS) return mockParseScenario(text);
  return realParseScenario(text);
}

async function mockParseScenario(text: string): Promise<Persona> {
  await delay(450);
  // Keyword-route the scenario to the closest archetype persona (CLAUDE.md §3.6).
  return PERSONA_BY_ARCHETYPE[matchArchetype(text)];
}

async function realParseScenario(text: string): Promise<Persona> {
  try {
    return await bedrockParseScenario(text);
  } catch (err) {
    // Throttled / transient AWS failure → keep the demo alive with the routed mock.
    console.warn("[bedrock] parseScenario fell back to mock:", (err as Error).name);
    return PERSONA_BY_ARCHETYPE[matchArchetype(text)];
  }
}

async function bedrockParseScenario(text: string): Promise<Persona> {
  const raw = await invokeClaude(
    "You generate a single role-play CLIENT for a communication-rehearsal app. " +
      "Reply with ONLY valid minified JSON, no markdown, matching exactly: " +
      '{"role":string,"scene":string,"emotion":string,' +
      '"difficulty":"Easy"|"Moderate"|"Hard","hiddenConcern":string,' +
      '"objectives":[string,string,string],' +
      '"avatarMood":"anxious"|"angry"|"sad"|"neutral"}. ' +
      "role is like 'Patient — Margaret, 58'. objectives are exactly 3 learning goals " +
      "for the student. avatarMood is the client's dominant emotion.",
    `Scenario: ${text}`,
  );
  const p = JSON.parse(extractJson(raw)) as Partial<Persona>;
  // Defensive: never trust the model's shape blindly (CLAUDE.md §3).
  const mood = asMood(p.avatarMood);
  return {
    role: String(p.role ?? "Client"),
    scene: String(p.scene ?? text.slice(0, 120)),
    emotion: String(p.emotion ?? "Reserved"),
    difficulty:
      p.difficulty === "Easy" || p.difficulty === "Hard" ? p.difficulty : "Moderate",
    hiddenConcern: String(p.hiddenConcern ?? ""),
    objectives:
      Array.isArray(p.objectives) && p.objectives.length === 3
        ? p.objectives.map(String)
        : mockPersona.objectives,
    avatarMood: mood,
    voiceId: voiceForMood(mood),
  };
}

// ───────────────────────── converse ─────────────────────────
// latest student turn -> in-character client reply (+ mood shift)

export async function converse(
  turns: Turn[],
  studentText: string,
  persona?: Persona | null,
): Promise<ConverseResult> {
  if (USE_MOCKS) return mockConverse(turns, studentText, persona);
  return realConverse(turns, studentText, persona ?? mockPersona);
}

async function mockConverse(
  turns: Turn[],
  _studentText: string,
  persona?: Persona | null,
): Promise<ConverseResult> {
  await delay(600);
  // Pick the script for THIS scenario so each persona has its own dialogue
  // (even when this is the throttle fallback for real Bedrock).
  const archetype = deriveArchetype(persona ?? null);
  const lines = CONVERSATION_BY_ARCHETYPE[archetype];

  const said = turns.filter((t) => t.speaker === "client").length;
  const replyText = lines[Math.min(said, lines.length - 1)];

  // Mood starts at the persona's emotion and softens toward neutral with rapport.
  const progress = said / Math.max(lines.length - 1, 1);
  const baseMood: Mood = persona?.avatarMood ?? "anxious";
  const mood: Mood = progress >= 0.66 ? "neutral" : baseMood;

  return { replyText, audioUrl: null, mood };
}

async function realConverse(
  turns: Turn[],
  studentText: string,
  persona: Persona,
): Promise<ConverseResult> {
  try {
    return await bedrockConverse(turns, studentText, persona);
  } catch (err) {
    console.warn("[bedrock] converse fell back to mock:", (err as Error).name);
    return mockConverse(turns, studentText, persona);
  }
}

async function bedrockConverse(
  turns: Turn[],
  studentText: string,
  persona: Persona,
): Promise<ConverseResult> {
  const history = turns
    .map((t) => `${t.speaker === "student" ? "Student" : "Client"}: ${t.text}`)
    .join("\n");

  const raw = await invokeClaude(
    `You ARE this client in a communication-rehearsal role-play. Stay fully in character.\n` +
      `Role: ${persona.role}\nSituation: ${persona.scene}\n` +
      `Emotion: ${persona.emotion}\nHidden concern (reveal only if the student earns it): ${persona.hiddenConcern}\n` +
      `Reply with ONLY valid minified JSON: {"replyText":string,"mood":"anxious"|"angry"|"sad"|"neutral"}. ` +
      `replyText is 1-3 natural spoken sentences. mood is how you feel after the student's last line — ` +
      `it should soften if they show empathy, harden if they're dismissive.`,
    `Conversation so far:\n${history}\n\nStudent just said: "${studentText}"\nRespond in character.`,
  );
  const r = JSON.parse(extractJson(raw)) as { replyText?: string; mood?: string };
  return {
    replyText: String(r.replyText ?? "…"),
    audioUrl: null, // /api/converse attaches Polly audio after this returns
    mood: asMood(r.mood),
  };
}

// ───────────────────────── analyze ─────────────────────────
// full transcript -> coaching Report (prose). Numbers overlaid by lib/metrics.

export async function analyze(turns: Turn[]): Promise<Report> {
  if (USE_MOCKS) return mockAnalyze(turns);
  return realAnalyze(turns);
}

async function mockAnalyze(_turns: Turn[]): Promise<Report> {
  await delay(900);
  return mockReport;
}

async function realAnalyze(turns: Turn[]): Promise<Report> {
  try {
    return await bedrockAnalyze(turns);
  } catch (err) {
    console.warn("[bedrock] analyze fell back to mock:", (err as Error).name);
    return mockReport;
  }
}

async function bedrockAnalyze(turns: Turn[]): Promise<Report> {
  const transcript = turns
    .map((t) => `${t.speaker === "student" ? "Student" : "Client"}: ${t.text}`)
    .join("\n");

  const raw = await invokeClaude(
    "You are a communication-skills coach. Score the STUDENT's performance in this " +
      "role-play. Reply with ONLY valid minified JSON matching: " +
      '{"overall":0-100,"subscores":{"empathy":0-100,"clarity":0-100,' +
      '"questioning":0-100,"structure":0-100,"nonverbal":0-100},' +
      '"evidence":[{"quote":string,"tag":"good"|"improve"|"flag","comment":string}],' +
      '"tips":[string,string]}. ' +
      "Every quote must be an EXACT line from the transcript. Give >=1 evidence per " +
      "subscore and exactly 2 prioritised, actionable tips. (Numeric speech metrics " +
      "are computed separately — focus on the qualitative judgement.)",
    `Transcript:\n${transcript}`,
  );
  const r = JSON.parse(extractJson(raw)) as Partial<Report>;
  // metrics is filled by computeMetrics() in /api/analyze; provide a safe stub here.
  return {
    overall: typeof r.overall === "number" ? r.overall : 70,
    subscores: {
      empathy: r.subscores?.empathy ?? 70,
      clarity: r.subscores?.clarity ?? 70,
      questioning: r.subscores?.questioning ?? 70,
      structure: r.subscores?.structure ?? 70,
      nonverbal: r.subscores?.nonverbal ?? 70,
    },
    metrics: mockReport.metrics,
    evidence: Array.isArray(r.evidence) ? r.evidence : mockReport.evidence,
    tips:
      Array.isArray(r.tips) && r.tips.length === 2
        ? [String(r.tips[0]), String(r.tips[1])]
        : mockReport.tips,
  };
}

// ───────────────────────── Bedrock plumbing ─────────────────────────

function voiceForMood(mood: Mood): string {
  // Sensible default Polly neural voices per mood.
  switch (mood) {
    case "angry": return "Matthew";
    case "sad": return "Amy";
    default: return process.env.POLLY_VOICE_ID ?? "Joanna";
  }
}

/** Pull the first {...} block out of a model reply, tolerating stray prose/markdown. */
function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
}

/** Where the LLM prose comes from: "local" = on-device Ollama, else Amazon Bedrock. */
const LLM_PROVIDER = (process.env.LLM_PROVIDER ?? "bedrock").toLowerCase();

/**
 * One LLM round-trip (system + user → text). Routes to a local Ollama model when
 * LLM_PROVIDER=local — quota-proof for the demo — otherwise to Bedrock/Claude.
 * Both return raw text that the callers parse as JSON via extractJson().
 */
async function invokeClaude(system: string, user: string): Promise<string> {
  if (LLM_PROVIDER === "local") return invokeLocal(system, user);
  return invokeBedrock(system, user);
}

/**
 * Local model via Ollama's REST API (http://localhost:11434 by default).
 * `format:"json"` constrains output to valid JSON — every caller here asks for JSON,
 * so this sharply cuts parse failures vs. a raw chat completion.
 */
async function invokeLocal(system: string, user: string): Promise<string> {
  const base = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  // Try OLLAMA_MODEL first, then OLLAMA_FALLBACK_MODEL — mirrors the Bedrock chain.
  // While the primary model is still downloading, Ollama 404s it and we fall back.
  const models = [
    process.env.OLLAMA_MODEL ?? "llama3.1:8b",
    process.env.OLLAMA_FALLBACK_MODEL,
  ].filter((m): m is string => !!m);

  let lastErr: unknown;
  for (const model of models) {
    try {
      const res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          model,
          stream: false,
          format: "json",
          options: { num_predict: 1024, temperature: 0.7 },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`ollama ${res.status} ${res.statusText}`);
      const json = (await res.json()) as { message?: { content?: string } };
      return json.message?.content ?? "";
    } catch (err) {
      lastErr = err;
      console.warn(`[ollama] ${model} failed, trying next:`, (err as Error).message);
    }
  }
  throw lastErr ?? new Error("invokeLocal: no model configured");
}

/**
 * Single Bedrock round-trip against Claude (Anthropic messages API).
 * Tries BEDROCK_MODEL_ID first, then BEDROCK_FALLBACK_MODEL_ID — so a per-model
 * daily-token throttle (common on new accounts) auto-fails over to the next model.
 */
async function invokeBedrock(system: string, user: string): Promise<string> {
  // Imported lazily so mock mode never loads the AWS SDK.
  const { BedrockRuntimeClient, InvokeModelCommand } = await import(
    "@aws-sdk/client-bedrock-runtime"
  );
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

  const models = [
    process.env.BEDROCK_MODEL_ID,
    process.env.BEDROCK_FALLBACK_MODEL_ID,
  ].filter((m): m is string => !!m);

  let lastErr: unknown;
  for (const modelId of models) {
    try {
      const res = await client.send(
        new InvokeModelCommand({
          modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1024,
            system,
            messages: [{ role: "user", content: [{ type: "text", text: user }] }],
          }),
        }),
      );
      const json = JSON.parse(new TextDecoder().decode(res.body)) as {
        content: { text: string }[];
      };
      return json.content[0].text;
    } catch (err) {
      lastErr = err;
      console.warn(`[bedrock] ${modelId} failed, trying next:`, (err as Error).name);
    }
  }
  throw lastErr ?? new Error("invokeClaude: no model id configured");
}
