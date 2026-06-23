// lib/archetype.ts — turns a scenario (or a generated Persona) into a visual
// "archetype" that drives BOTH the avatar's appearance and the 3D room theme.
//
// This is what makes "the scenario drives the environment" true:
//  - matchArchetype(rawText) picks the closest archetype from the scenario text
//  - components/three/AvatarStage.tsx uses lookFor()/themeFor() on the persona

import type { Mood, Persona } from "@/types";

export type Archetype =
  | "medical"
  | "pediatric"
  | "grief"
  | "it-client"
  | "workplace"
  | "generic";

/** Appearance of the procedural avatar for a given archetype. */
export interface AvatarLook {
  skin: string;
  skinDk: string;
  lip: string;
  hair: string;
  top: string; // cardigan / shirt / jacket body colour
  topAccent: string; // collar / shirt strip
  hairStyle: "bob" | "short" | "bald" | "ponytail";
}

/** Theme of the 3D room for a given archetype. */
export interface RoomTheme {
  bg: string; // canvas background + fog colour
  wall: string;
  wallDk: string;
  floor: string;
  accent: string; // poster / rug / shelf accent + mood-light base tint
  ambient: number; // base ambient intensity (cooler scenes a touch dimmer)
  prop: "clinic" | "office" | "home" | "corporate";
  label: string; // short setting label (overlaid in UI)
}

// Ordered most-specific → least so the first hit wins.
const RULES: { archetype: Archetype; re: RegExp }[] = [
  {
    archetype: "grief",
    re: /grief|griev|bereave|end.?of.?life|palliat|hospice|terminal|dying|passed away|funeral|loss of/i,
  },
  {
    archetype: "pediatric",
    re: /child|children|parent|son|daughter|toddler|baby|infant|kid|antibiotic|paediatr|pediatr|mum|dad|school/i,
  },
  {
    archetype: "it-client",
    re: /software|system|outage|payroll|server|network|it support|technical|vendor|deploy|downtime|escalat|\bsla\b|ticket|database|app crash|payment system|api/i,
  },
  {
    archetype: "workplace",
    re: /colleague|coworker|deadline|performance|appraisal|one.?to.?one|underperform|team member|workplace|manager|feedback|disciplinar|hr\b|promotion/i,
  },
  {
    archetype: "medical",
    re: /patient|chest|pain|clinic|symptom|cardiac|heart|diagnos|nurse|ward|\bgp\b|doctor|medical|blood|prescri|surgery|wound|x-?ray|scan/i,
  },
];

/** Classify free text (a scenario, or persona fields) into an archetype. */
export function matchArchetype(text: string): Archetype {
  const hit = RULES.find((r) => r.re.test(text));
  return hit ? hit.archetype : "generic";
}

/** Classify a Persona by its descriptive fields (role + scene + emotion + concern). */
export function deriveArchetype(persona: Persona | null): Archetype {
  if (!persona) return "generic";
  return matchArchetype(
    `${persona.role} ${persona.scene} ${persona.emotion} ${persona.hiddenConcern}`,
  );
}

export const AVATAR_LOOKS: Record<Archetype, AvatarLook> = {
  medical: {
    skin: "#e3b48f", skinDk: "#d49e76", lip: "#c4756b",
    hair: "#9a8d7d", top: "#6f7f96", topAccent: "#ece6db", hairStyle: "bob",
  },
  pediatric: {
    skin: "#cf9560", skinDk: "#b97f4e", lip: "#a85d4e",
    hair: "#33271c", top: "#436f8c", topAccent: "#eef1f4", hairStyle: "short",
  },
  grief: {
    skin: "#dcae8c", skinDk: "#c89a78", lip: "#b07d74",
    hair: "#ccc6bc", top: "#8a7f96", topAccent: "#e8e4ec", hairStyle: "bob",
  },
  "it-client": {
    skin: "#d3a274", skinDk: "#bf8c5e", lip: "#a96a5a",
    hair: "#2b2620", top: "#34506b", topAccent: "#f2f4f7", hairStyle: "short",
  },
  workplace: {
    skin: "#d8a87f", skinDk: "#c4946b", lip: "#b27668",
    hair: "#5a4632", top: "#5f7a6a", topAccent: "#eef0ec", hairStyle: "ponytail",
  },
  generic: {
    skin: "#d8a87f", skinDk: "#c4946b", lip: "#b27668",
    hair: "#6a5444", top: "#6f7f96", topAccent: "#ece6db", hairStyle: "short",
  },
};

export const ROOM_THEMES: Record<Archetype, RoomTheme> = {
  medical: {
    bg: "#e9e1d3", wall: "#ece4d6", wallDk: "#e3d9c8", floor: "#cdbb9e",
    accent: "#bfe8e4", ambient: 0.95, prop: "clinic", label: "Consultation room",
  },
  pediatric: {
    bg: "#eae7da", wall: "#eef0e6", wallDk: "#e4e7d6", floor: "#d8c9a8",
    accent: "#ffd9a0", ambient: 1.05, prop: "clinic", label: "After-hours clinic",
  },
  grief: {
    bg: "#e3e2e6", wall: "#e7e4ea", wallDk: "#ddd9e2", floor: "#c9c2bc",
    accent: "#c8d0e0", ambient: 0.82, prop: "home", label: "Quiet ward room",
  },
  "it-client": {
    bg: "#dde1e6", wall: "#e3e6ea", wallDk: "#d6dade", floor: "#b9bcc2",
    accent: "#aac4e8", ambient: 0.92, prop: "corporate", label: "Client meeting room",
  },
  workplace: {
    bg: "#e4e5e0", wall: "#e9e9e2", wallDk: "#dedfd6", floor: "#c4c0b4",
    accent: "#bfe8c4", ambient: 0.95, prop: "office", label: "Office — one-to-one",
  },
  generic: {
    bg: "#e7e2d8", wall: "#ece7dc", wallDk: "#e2dccf", floor: "#cabfa6",
    accent: "#cfe3df", ambient: 0.95, prop: "office", label: "Meeting room",
  },
};

/** Ordered list + display metadata for the student-facing appearance picker. */
export const ARCHETYPES: Archetype[] = [
  "medical", "pediatric", "grief", "it-client", "workplace", "generic",
];

export const ARCHETYPE_META: Record<Archetype, { label: string; emoji: string }> = {
  medical:     { label: "Patient",   emoji: "🫀" },
  pediatric:   { label: "Parent",    emoji: "💊" },
  grief:       { label: "Relative",  emoji: "🕊️" },
  "it-client": { label: "IT client", emoji: "💻" },
  workplace:   { label: "Colleague", emoji: "🤝" },
  generic:     { label: "General",   emoji: "💬" },
};

export const lookFor = (persona: Persona | null): AvatarLook =>
  AVATAR_LOOKS[deriveArchetype(persona)];

export const themeFor = (persona: Persona | null): RoomTheme =>
  ROOM_THEMES[deriveArchetype(persona)];

/** Per-mood accent (mirrors the rim light) — kept here so Room can import once. */
export const MOOD_ACCENT: Record<Mood, string> = {
  anxious: "#ffd9a0",
  angry: "#ffb0a8",
  sad: "#aac4e8",
  neutral: "#bfe8e4",
};
