/**
 * A speech-bubble caption layered over the 3D stage (DOM, not inside the Canvas
 * per CLAUDE.md §4). Client speaks from the top (teal, near the avatar); the
 * student's words appear at the bottom. aria-live announces each utterance (§5).
 */
type Speaker = "client" | "student";

export function SpeechCaption({
  text,
  speaker,
  name,
}: {
  text: string;
  speaker: Speaker;
  name?: string;
}) {
  if (!text) return null;
  const isClient = speaker === "client";

  return (
    <div
      aria-live="polite"
      className={[
        "pointer-events-none absolute left-1/2 z-20 w-[min(85%,28rem)] -translate-x-1/2",
        isClient ? "top-16" : "bottom-16",
      ].join(" ")}
    >
      <div
        className={[
          "reveal relative rounded-2xl px-4 py-2.5 text-sm leading-snug shadow-lg backdrop-blur-md ring-1",
          isClient
            ? "bg-white/95 text-navy ring-teal/40"
            : "bg-navy/90 text-white ring-white/15",
        ].join(" ")}
      >
        {name && (
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-widest text-teal">
            {name}
          </span>
        )}
        {text}
        {/* tail */}
        <span
          className={[
            "absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 ring-1",
            isClient
              ? "-bottom-1.5 bg-white/95 ring-teal/40"
              : "-bottom-1.5 bg-navy/90 ring-white/15",
          ].join(" ")}
        />
      </div>
    </div>
  );
}
