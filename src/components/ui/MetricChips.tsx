import type { Metrics } from "@/types";

/** Compact metric chips (talk-ratio, fillers, wpm, interruptions, eye-contact). */
export function MetricChips({ metrics }: { metrics: Metrics }) {
  const chips: { label: string; value: string; hint?: string }[] = [
    { label: "Talk ratio", value: `${Math.round(metrics.talkRatio * 100)}%`, hint: "your share" },
    { label: "Fillers", value: `${metrics.fillers}`, hint: "um / uh / like" },
    { label: "Pace", value: `${metrics.wpm}`, hint: "wpm" },
    { label: "Interruptions", value: `${metrics.interruptions}` },
    {
      label: "Eye contact",
      value: metrics.eyeContactPct ? `${metrics.eyeContactPct}%` : "—",
      hint: metrics.eyeContactPct ? "Rekognition" : "local-only",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {chips.map((c) => (
        <div
          key={c.label}
          className="rounded-xl bg-white p-3 ring-1 ring-navy2/10"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-dim">
            {c.label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-navy">
            {c.value}
          </p>
          {c.hint && <p className="text-[11px] text-dim">{c.hint}</p>}
        </div>
      ))}
    </div>
  );
}
