import type { Metrics } from "@/types";

/** Single-row session stats — compact alternative to the grid chips. */
export function MetricChips({ metrics, compact = false }: { metrics: Metrics; compact?: boolean }) {
  const items = [
    { label: "Talk", value: `${Math.round(metrics.talkRatio * 100)}%` },
    { label: "Fillers", value: String(metrics.fillers) },
    { label: "Pace", value: `${metrics.wpm} wpm` },
    { label: "Interrupts", value: String(metrics.interruptions) },
    {
      label: "Eye contact",
      value: metrics.eyeContactPct > 0 ? `${metrics.eyeContactPct}%` : "—",
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-1.5 text-sm">
            <span className="text-dim">{item.label}</span>
            <span className="font-semibold tabular-nums text-navy">{item.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-white p-3 ring-1 ring-navy2/10">
          <p className="text-xs font-medium uppercase tracking-wide text-dim">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-navy">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
