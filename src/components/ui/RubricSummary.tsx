import type { Report } from "@/types";
import { reportRubricSummary } from "@/lib/liveScores";

export function RubricSummary({
  report,
  compact = false,
}: {
  report: Pick<Report, "subscores" | "metrics">;
  compact?: boolean;
}) {
  const rows = reportRubricSummary(report.subscores, report.metrics);

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {rows.map((row) => (
          <div key={row.key} className="text-center">
            <p className={`text-2xl font-bold tabular-nums ${row.ok ? "text-teal-dark" : "text-orange"}`}>
              {row.score}
            </p>
            <p className="mt-0.5 text-xs font-medium text-navy">{row.label}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.key}
          className={`rounded-xl px-3 py-2.5 ${row.ok ? "bg-teal/8" : "bg-orange/8"}`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-navy">{row.label}</span>
            <span className={`text-lg font-bold tabular-nums ${row.ok ? "text-teal-dark" : "text-orange"}`}>
              {row.score}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] leading-snug text-dim">{row.detail}</p>
        </div>
      ))}
    </div>
  );
}
