import type { Metrics, Turn } from "@/types";

// Deterministic, code-computed communication metrics (CLAUDE.md §6). Pure and
// reproducible: same transcript in -> same numbers out, with no model calls.

/** Average conversational speaking rate, used to ESTIMATE a turn's spoken length. */
const WORDS_PER_SECOND = 2.5; // ≈ 150 wpm

const FILLER_RE = /\b(?:um+|uh+|er|like|you know)\b/gi;

function wordCount(text: string): number {
  // Count whitespace-separated tokens that contain at least one letter or digit,
  // so standalone punctuation (e.g. an em-dash "—") is not counted as a word.
  const m = text.match(/[^\s]*[\p{L}\p{N}][^\s]*/gu);
  return m ? m.length : 0;
}

function estimatedDurationMs(text: string): number {
  return (wordCount(text) / WORDS_PER_SECOND) * 1000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Optional vision signal sampled during rehearsal (Rekognition). Kept separate
 * from the transcript so computeMetrics stays pure: same inputs -> same numbers. */
export interface VisionSignal {
  eyeContactPct?: number; // 0..100, share of sampled frames the student looked at camera
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function computeMetrics(turns: Turn[], vision?: VisionSignal): Metrics {
  const empty: Metrics = {
    talkRatio: 0,
    fillers: 0,
    wpm: 0,
    interruptions: 0,
    eyeContactPct: 0,
    avgSentiment: 0,
  };
  if (turns.length === 0) return empty;

  let studentWords = 0;
  let totalWords = 0;
  let fillers = 0;
  let interruptions = 0;
  let studentSpeakingMs = 0;

  let sentimentSum = 0;
  let sentimentCount = 0;

  turns.forEach((turn, i) => {
    const words = wordCount(turn.text);
    totalWords += words;

    if (typeof turn.sentiment === "number") {
      sentimentSum += turn.sentiment;
      sentimentCount += 1;
    }

    if (turn.speaker === "student") {
      studentWords += words;
      fillers += turn.text.match(FILLER_RE)?.length ?? 0;

      // Use estimated speaking duration only: elapsed tMs includes API latency
      // and client TTS time, so it wildly over/underestimates real speaking pace.
      // Real Transcribe word timestamps can replace this when wired.
      studentSpeakingMs += estimatedDurationMs(turn.text);

      // Interruption: this student turn began before the immediately preceding
      // client turn was estimated to have finished speaking.
      const prev = turns[i - 1];
      if (prev && prev.speaker === "client") {
        const prevEnd = prev.tMs + estimatedDurationMs(prev.text);
        if (turn.tMs < prevEnd) interruptions += 1;
      }
    }
  });

  const talkRatio = totalWords > 0 ? studentWords / totalWords : 0;
  const studentMinutes = studentSpeakingMs / 60000;
  // Clamp to a human-plausible range (80–200 wpm). Estimated duration gives
  // ~150 wpm by construction; the clamp guards against edge-case empty turns.
  const rawWpm = studentMinutes > 0 ? studentWords / studentMinutes : 150;
  const wpm = Math.min(200, Math.max(80, Math.round(rawWpm)));
  const avgSentiment = sentimentCount > 0 ? sentimentSum / sentimentCount : 0;

  return {
    talkRatio: round2(talkRatio),
    fillers,
    wpm,
    interruptions,
    eyeContactPct: clampPct(vision?.eyeContactPct ?? 0), // Rekognition; 0 when unused
    avgSentiment: round2(avgSentiment),
  };
}
