"use client";

import type { Turn } from "@/types";
import { computeMetrics } from "@/lib/metrics";
import { liveDimensionScores } from "@/lib/liveScores";

/**
 * Live Expression · Communication · Fluency scoring during rehearsal.
 */
export function LiveCoach({ turns }: { turns: Turn[] }) {
  if (turns.length === 0) {
    return (
      <div className="rounded-xl border border-navy2/10 bg-white/60 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-dim">Live coaching</p>
        <p className="mt-1 text-xs text-navy/50">
          Expression, communication & fluency scores appear after your first turn.
        </p>
      </div>
    );
  }

  const metrics = computeMetrics(turns);
  const dimensions = liveDimensionScores(turns, metrics);
  const tip = dimensions.find((d) => !d.ok)?.detail ?? dimensions[0].detail;

  return (
    <div className="rounded-xl border border-navy2/10 bg-white px-4 py-3 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-dim">
        Expression · Communication · Fluency
      </p>

      <div className="grid grid-cols-3 gap-2 text-center">
        {dimensions.map((d) => (
          <Chip key={d.key} label={d.label} value={String(d.score)} ok={d.ok} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-dim">
        <span>{metrics.eyeContactPct > 0 ? `${metrics.eyeContactPct}% eyes` : "Eyes —"}</span>
        <span>{Math.round(metrics.talkRatio * 100)}% talk</span>
        <span>{metrics.fillers} fillers</span>
      </div>

      <p className="text-[11px] leading-snug text-navy/70 border-t border-navy2/10 pt-2">
        <span className="font-semibold text-teal">MIRA:</span> {tip}
      </p>
    </div>
  );
}

function Chip({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`rounded-lg py-1.5 px-2 ${ok ? "bg-teal/8" : "bg-orange/8"}`}>
      <p className={`text-sm font-bold ${ok ? "text-teal-dark" : "text-orange"}`}>{value}</p>
      <p className="text-[10px] text-dim">{label}</p>
    </div>
  );
}
