import type { Evidence } from "@/types";

const TAG: Record<Evidence["tag"], { label: string; className: string }> = {
  good: { label: "Strength", className: "text-teal-dark" },
  improve: { label: "Improve", className: "text-orange" },
  flag: { label: "Note", className: "text-navy/60" },
};

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return (
    <ul className="divide-y divide-navy2/8">
      {evidence.map((e, i) => {
        const tag = TAG[e.tag];
        return (
          <li key={i} className="py-4 first:pt-0 last:pb-0">
            <p className={`text-[11px] font-semibold uppercase tracking-wide ${tag.className}`}>
              {tag.label}
            </p>
            <blockquote className="mt-1.5 text-sm leading-relaxed text-navy">
              &ldquo;{e.quote}&rdquo;
            </blockquote>
            <p className="mt-1 text-sm text-dim">{e.comment}</p>
          </li>
        );
      })}
    </ul>
  );
}
