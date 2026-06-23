"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Persona, Difficulty } from "@/types";
import type { ClientEmotion } from "@/lib/v1/types";
import { useSession } from "@/lib/useSession";
import { useAppearance } from "@/lib/useAppearance";
import { PersonaCard } from "@/components/ui/PersonaCard";
import { AppearancePicker } from "@/components/ui/AppearancePicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const AvatarStage = dynamic(
  () => import("@/components/three/AvatarStage").then((m) => m.AvatarStage),
  { ssr: false, loading: () => <StagePlaceholder /> },
);

// One per archetype so the keyword router visibly produces a different client,
// avatar, and 3D environment for each (the "scenario drives the environment" rubric).
const EXAMPLES: Array<{ label: string; text: string }> = [
  {
    label: "Cardiac anxiety",
    text: "A 58-year-old patient with chest pain who keeps insisting it is nothing and wants to leave before any tests are done.",
  },
  {
    label: "Medication resistance",
    text: "A parent demanding antibiotics for their child's viral cold and getting frustrated when you explain they would not help.",
  },
  {
    label: "End-of-life care",
    text: "A relative who has just learned their husband is dying and wants to talk through palliative care options.",
  },
  {
    label: "IT escalation",
    text: "An operations director escalating after a payroll system outage caused staff to miss their wages this month.",
  },
  {
    label: "Difficult one-to-one",
    text: "A one-to-one with a colleague about deadlines they have repeatedly missed, which is now affecting the whole team.",
  },
  {
    label: "Breaking bad news",
    text: "A patient waiting for biopsy results that came back positive, who is hopeful and asking if everything is fine.",
  },
];

// Optional explicit picks. undefined = let the keyword router infer from the text.
const DEMEANOURS: Array<{ value: ClientEmotion; label: string; hint: string }> = [
  { value: "anxious", label: "Anxious", hint: "Worried, seeking reassurance" },
  { value: "defensive", label: "Defensive", hint: "Guarded, easily provoked" },
  { value: "neutral", label: "Reserved", hint: "Flat, hard to read" },
  { value: "relieved", label: "Open", hint: "Cooperative, receptive" },
];

const DIFFICULTIES: Difficulty[] = ["Easy", "Moderate", "Hard"];

export function ScenarioScreen() {
  const { scenarioText, setScenarioText, persona, setPersona, goToStep } =
    useSession();
  const { lookKey, themeKey } = useAppearance();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  // undefined = let MIRA infer the demeanour / difficulty from the text.
  const [emotion, setEmotion] = useState<ClientEmotion | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>(undefined);

  async function generate() {
    if (!scenarioText.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/scenario", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: scenarioText, emotion, difficulty }),
      });
      if (!res.ok) throw new Error("Failed to parse scenario");
      const data: Persona = await res.json();
      setPersona(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const mood = persona?.avatarMood ?? "neutral";

  return (
    /* Full-viewport grid: narrow form left, cinematic 3D stage right */
    <div className="flex flex-1 overflow-hidden lg:grid lg:grid-cols-[420px_1fr]">

      {/* ── LEFT PANEL: form ─────────────────────────────────────────── */}
      <aside className="flex flex-col gap-5 overflow-y-auto border-r border-navy2/10 bg-paper p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal">
            Step 1 of 3
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy">
            Describe your patient
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-dim">
            MIRA builds a 3D client with a hidden concern and three learning
            objectives, then coaches you after every session.
          </p>
        </div>

        {/* After generation: collapse form and show only result + CTA */}
        {persona ? (
          <div className="reveal flex flex-col gap-3">
            <PersonaCard persona={persona} />
            <AppearancePicker />
            <Button
              onClick={() => goToStep(2)}
              className="w-full bg-navy py-5 text-sm font-semibold text-white hover:bg-navy2"
            >
              Start rehearsal →
            </Button>
            <button
              type="button"
              onClick={() => { setPersona(null); }}
              className="text-center text-xs text-dim underline-offset-2 hover:underline"
            >
              ← Change scenario
            </button>
          </div>
        ) : (
          <>
            <Textarea
              value={scenarioText}
              onChange={(e) => setScenarioText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void generate();
              }}
              placeholder="e.g. An anxious 58-year-old presenting with chest pain who keeps deflecting…"
              className="min-h-[120px] resize-none bg-white text-sm"
              aria-label="Scenario description"
            />

            {/* Example chips */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-dim">Try an example</p>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => setScenarioText(ex.text)}
                  className="rounded-xl border border-navy2/10 bg-white px-3.5 py-2.5 text-left text-xs text-navy transition-all hover:border-teal/50 hover:shadow-sm"
                >
                  <span className="font-semibold">{ex.label}</span>
                  <span className="ml-1.5 text-dim">— {ex.text.slice(0, 44)}…</span>
                </button>
              ))}
            </div>

            {/* Client demeanour — overrides what MIRA infers from the text */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-dim">
                Client demeanour{" "}
                <span className="text-navy2/40">(optional — defaults to auto)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <DemeanourChip
                  active={emotion === undefined}
                  label="Auto"
                  hint="Infer from your text"
                  onClick={() => setEmotion(undefined)}
                />
                {DEMEANOURS.map((d) => (
                  <DemeanourChip
                    key={d.value}
                    active={emotion === d.value}
                    label={d.label}
                    hint={d.hint}
                    onClick={() => setEmotion(d.value)}
                  />
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-dim">Difficulty</p>
              <div className="flex gap-2">
                <DemeanourChip
                  active={difficulty === undefined}
                  label="Auto"
                  onClick={() => setDifficulty(undefined)}
                />
                {DIFFICULTIES.map((d) => (
                  <DemeanourChip
                    key={d}
                    active={difficulty === d}
                    label={d}
                    onClick={() => setDifficulty(d)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={generate}
                disabled={loading || !scenarioText.trim()}
                className="w-full bg-teal py-5 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    MIRA is building your client…
                  </span>
                ) : (
                  "Generate client ↵"
                )}
              </Button>
              {error && <p className="text-xs text-mood-angry">{error}</p>}
            </div>
          </>
        )}
      </aside>

      {/* ── RIGHT PANEL: full-height 3D stage (the hero) ────────────── */}
      <div className="relative hidden flex-1 bg-[#19102b] lg:flex">
        <div className="absolute inset-0">
          <AvatarStage
            persona={persona}
            mood={mood}
            speaking={false}
            assembling={loading}
            wide
            lookKey={lookKey}
            themeKey={themeKey}
          />
        </div>

        {/* Overlay: top labels */}
        {!persona && !loading && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="rounded-full bg-white/8 px-4 py-2 text-sm font-medium text-white/60 backdrop-blur-sm">
              Your client will appear here
            </p>
          </div>
        )}

        {/* Overlay: persona quick-stats once loaded */}
        {persona && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="reveal flex items-center gap-3 rounded-2xl bg-navy/80 px-5 py-3 backdrop-blur-md ring-1 ring-white/10">
              <span className="text-sm font-semibold text-white">{persona.role}</span>
              <span className="h-4 w-px bg-white/20" />
              <span className="rounded-full bg-teal/20 px-2 py-0.5 text-xs font-semibold text-teal">
                {persona.difficulty}
              </span>
              <span className="text-xs text-white/60">{persona.emotion.split(",")[0]}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DemeanourChip({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? "border-teal bg-teal text-white shadow-sm"
          : "border-navy2/15 bg-white text-navy hover:border-teal/50"
      }`}
    >
      {label}
    </button>
  );
}

function StagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#19102b]">
      <div className="shimmer h-32 w-32 rounded-full" />
    </div>
  );
}
