/** Two prioritised coaching tips — minimal list layout. */
export function TipCards({ tips }: { tips: [string, string] }) {
  return (
    <ol className="space-y-3">
      {tips.map((tip, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-navy">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/12 text-[11px] font-bold text-teal-dark">
            {i + 1}
          </span>
          <span>{tip}</span>
        </li>
      ))}
    </ol>
  );
}
