import type { Difficulty, Persona } from "@/types";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Easy: "bg-teal/15 text-teal-dark",
  Moderate: "bg-orange/15 text-orange",
  Hard: "bg-mood-angry/15 text-mood-angry",
};

/** Renders the parsed Persona — proof that "the scenario drives the environment". */
export function PersonaCard({ persona }: { persona: Persona }) {
  return (
    <article className="reveal w-full rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-navy2/10">
      <header className="flex items-start justify-between gap-4">
        <div>
          {persona.userRole && (
            <p className="text-xs font-semibold uppercase tracking-wide text-teal">
              You: {persona.userRole}
            </p>
          )}
          <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-navy">
            {persona.userRole ? `Your client: ${persona.role}` : persona.role}
          </h2>
          <p className="mt-1 text-sm text-dim">{persona.scene}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${DIFFICULTY_STYLES[persona.difficulty]}`}
        >
          {persona.difficulty}
        </span>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-navy2/8 px-3 py-1 text-xs font-medium text-navy2">
          {persona.emotion}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-orange/30 bg-orange/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange">
          Hidden concern
        </p>
        <p className="mt-1 text-sm leading-relaxed text-navy">
          {persona.hiddenConcern}
        </p>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-dim">
          What MIRA will assess
        </p>
        <ol className="mt-2 space-y-2">
          {persona.objectives.map((obj, i) => (
            <li key={i} className="flex gap-3 text-sm text-navy">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/15 text-xs font-semibold text-teal-dark">
                {i + 1}
              </span>
              <span className="leading-relaxed">{obj}</span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
