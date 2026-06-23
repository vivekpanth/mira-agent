import type { Metrics, Turn } from "@/types";
import { simulateResponse } from "@/lib/v1/simulation";

export type LiveDimension = "expression" | "communication" | "fluency";

export type DimensionScore = {
  key: LiveDimension;
  label: string;
  score: number; // 0..100
  ok: boolean;
  detail: string;
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Verbal delivery: fillers, pace, interruptions. */
export function scoreFluency(metrics: Metrics): DimensionScore {
  let score = 88;
  score -= metrics.fillers * 10;
  if (metrics.interruptions > 0) score -= metrics.interruptions * 12;
  if (metrics.wpm > 0 && (metrics.wpm < 110 || metrics.wpm > 175)) score -= 8;

  const ok = score >= 70;
  let detail = "Smooth pace, few fillers.";
  if (metrics.fillers >= 3) detail = `${metrics.fillers} fillers — pause instead of um/uh.`;
  else if (metrics.interruptions > 0) detail = "Wait for the client to finish before responding.";
  else if (metrics.wpm > 175) detail = "Slow down slightly — you're rushing.";
  else if (metrics.wpm > 0 && metrics.wpm < 110) detail = "A slightly quicker pace keeps momentum.";

  return { key: "fluency", label: "Fluency", score: clamp(score), ok, detail };
}

/** Relational skills: empathy, open questions, talk balance. */
export function scoreCommunication(turns: Turn[], metrics: Metrics): DimensionScore {
  const studentTurns = turns.filter((t) => t.speaker === "student");
  if (studentTurns.length === 0) {
    return { key: "communication", label: "Communication", score: 0, ok: false, detail: "Speak to begin scoring." };
  }

  let score = 55;
  studentTurns.forEach((turn, i) => {
    const marker = simulateResponse(turn.text, i).markerType;
    if (marker === "empathy" || marker === "open_question") score += 12;
    else if (marker === "supportive_next_step" || marker === "clarity") score += 8;
    else if (marker === "judgement") score -= 14;
    else if (marker === "missed_opportunity") score -= 4;
  });

  const talkPct = metrics.talkRatio * 100;
  if (talkPct >= 28 && talkPct <= 52) score += 10;
  else if (talkPct > 62) score -= 12;

  score = clamp(score);
  const ok = score >= 70;

  let detail = "Good balance of listening and open questions.";
  const last = studentTurns[studentTurns.length - 1];
  const lastMarker = simulateResponse(last.text, studentTurns.length - 1).markerType;
  if (lastMarker === "judgement") detail = "Soften blame — invite their story instead.";
  else if (talkPct > 62) detail = "You're talking more than the client. Ask an open question.";
  else if (lastMarker === "missed_opportunity") detail = "Acknowledge the feeling before moving on.";

  return { key: "communication", label: "Communication", score: clamp(score), ok, detail };
}

/** Non-verbal presence: eye contact when camera is active. */
export function scoreExpression(metrics: Metrics): DimensionScore {
  if (metrics.eyeContactPct <= 0) {
    return {
      key: "expression",
      label: "Expression",
      score: 65,
      ok: true,
      detail: "Camera on — eye contact will be tracked live.",
    };
  }

  const score = clamp(metrics.eyeContactPct);
  const ok = score >= 60;
  const detail =
    score >= 75
      ? "Strong eye contact — you look engaged."
      : score >= 50
        ? "Glance at the camera a little more often."
        : "Look toward the client on screen to show presence.";

  return { key: "expression", label: "Expression", score, ok, detail };
}

export function liveDimensionScores(turns: Turn[], metrics: Metrics): DimensionScore[] {
  return [
    scoreExpression(metrics),
    scoreCommunication(turns, metrics),
    scoreFluency(metrics),
  ];
}

export function reportRubricSummary(
  subscores: { empathy: number; clarity: number; questioning: number; structure: number; nonverbal: number },
  metrics: Metrics,
): DimensionScore[] {
  const communication = clamp((subscores.empathy + subscores.clarity + subscores.questioning) / 3);
  const fluency = scoreFluency(metrics).score;
  const expression = clamp(subscores.nonverbal);

  return [
    {
      key: "expression",
      label: "Expression",
      score: expression,
      ok: expression >= 70,
      detail: metrics.eyeContactPct > 0 ? `${metrics.eyeContactPct}% eye contact` : "Posture & presence from session",
    },
    {
      key: "communication",
      label: "Communication",
      score: communication,
      ok: communication >= 70,
      detail: "Empathy, clarity & questioning combined",
    },
    {
      key: "fluency",
      label: "Fluency",
      score: fluency,
      ok: fluency >= 70,
      detail: `${metrics.fillers} fillers · ${metrics.wpm} wpm`,
    },
  ];
}
