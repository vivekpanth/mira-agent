import type { Persona } from "@/types";
import type { Archetype } from "@/lib/archetype";

/**
 * Canned personas for the demo / ?demo=1 path. A keyword router
 * (lib/archetype.ts → matchArchetype) picks the closest archetype from the
 * student's free-text scenario so it genuinely drives the persona, avatar
 * look, and 3D environment.
 *
 * `mockPersona` stays the default export the demo/?demo=1 path relies on.
 */
export const mockPersona: Persona = {
  role: "Patient — Margaret, 58",
  scene: "Presenting to the clinic with two days of intermittent chest pain",
  emotion: "Anxious, guarded — downplays symptoms, deflects with small talk",
  difficulty: "Hard",
  hiddenConcern:
    "Privately terrified she is having a heart attack like her late father, but afraid that saying it out loud will make it real.",
  objectives: [
    "Build rapport and create psychological safety before probing symptoms",
    "Use open questions to surface the hidden cardiac fear without leading",
    "Summarise and agree a clear, shared next step (ECG + bloods today)",
  ],
  avatarMood: "anxious",
  voiceId: "Joanna",
};

/** Pediatric / medication-resistance — an upset parent. */
export const personaPediatric: Persona = {
  role: "Parent — Daniel, 34",
  scene:
    "Demanding antibiotics for his son's chesty cough at an after-hours clinic",
  emotion: "Frustrated, defensive — convinced he's being fobbed off",
  difficulty: "Moderate",
  hiddenConcern:
    "Terrified his boy will deteriorate like his nephew did, and feels powerless to protect him — the anger is fear wearing a mask.",
  objectives: [
    "Acknowledge the parent's fear before explaining why antibiotics won't help a virus",
    "Use clear, jargon-free language to build shared understanding",
    "Agree a safety-net plan so he leaves feeling heard, not dismissed",
  ],
  avatarMood: "angry",
  voiceId: "Matthew",
};

/** Grief / end-of-life — a relative on the ward. */
export const personaGrief: Persona = {
  role: "Relative — Eleanor, 61",
  scene: "Discussing end-of-life care options for her husband on the ward",
  emotion: "Grief-stricken, overwhelmed — long silences, voice breaking",
  difficulty: "Hard",
  hiddenConcern:
    "Feels she is 'giving up' on him if she agrees to palliative care, and carries guilt that she should have noticed he was unwell sooner.",
  objectives: [
    "Hold space with silence and empathy before offering information",
    "Check understanding gently and avoid overwhelming her with options",
    "Help her feel that choosing comfort is an act of love, not surrender",
  ],
  avatarMood: "sad",
  voiceId: "Amy",
};

/** IT / software client — an escalation after an outage. */
export const personaITClient: Persona = {
  role: "Client — Raj, 45 (Operations Director)",
  scene: "Escalation call after a payroll system outage missed staff payments",
  emotion: "Angry, impatient — wants accountability and a fix now",
  difficulty: "Hard",
  hiddenConcern:
    "His own standing with the board is on the line, and he fears the vendor treats his company as a low priority.",
  objectives: [
    "Acknowledge the business impact and take ownership before explaining the cause",
    "Communicate a clear timeline and next steps without over-promising",
    "Rebuild trust by agreeing a follow-up and a prevention plan",
  ],
  avatarMood: "angry",
  voiceId: "Brian",
};

/** Workplace difficult conversation — a one-to-one about performance. */
export const personaWorkplace: Persona = {
  role: "Colleague — Sam, 29",
  scene: "A one-to-one about repeatedly missed deadlines on the team",
  emotion: "Guarded, a little defensive — bracing for criticism",
  difficulty: "Moderate",
  hiddenConcern:
    "Is privately struggling with burnout and a family illness, but afraid that admitting it will make them look incapable.",
  objectives: [
    "Open with specifics and curiosity rather than blame",
    "Create safety so the underlying cause can surface",
    "Co-create a concrete, supportive improvement plan",
  ],
  avatarMood: "neutral",
  voiceId: "Joanna",
};

/** Generic fallback for scenarios that don't match a specific archetype. */
export const personaGeneric: Persona = {
  role: "Client — Jordan, 38",
  scene: "Bringing a sensitive personal concern to discuss with you",
  emotion: "Reserved, cautious — testing whether it's safe to open up",
  difficulty: "Moderate",
  hiddenConcern:
    "Worried about being judged, and unsure how much it is safe to reveal.",
  objectives: [
    "Establish rapport and signal non-judgement early",
    "Use open questions to let the real concern emerge",
    "Summarise and agree a supportive next step",
  ],
  avatarMood: "neutral",
  voiceId: "Joanna",
};

/** Keyword-router target table — maps a derived archetype to its mock persona. */
export const PERSONA_BY_ARCHETYPE: Record<Archetype, Persona> = {
  medical: mockPersona,
  pediatric: personaPediatric,
  grief: personaGrief,
  "it-client": personaITClient,
  workplace: personaWorkplace,
  generic: personaGeneric,
};
