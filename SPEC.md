# SPEC.md — MIRA one-page PRD (feed this to the AI alongside CLAUDE.md)

## What we're building
A web app where a student (1) types a scenario, (2) rehearses a spoken conversation with a
3D virtual client, and (3) receives an AI **communication coaching report**. The differentiator
is the report — it turns a role-play sim into a practise → measure → improve learning loop.

## The three screens (the whole app)
1. **Scenario** — textarea + 3 example chips → `POST /api/scenario` → render a **PersonaCard**
   (role, emotion, difficulty, hidden concern, 3 objectives). Proves "scenario drives environment".
2. **Rehearsal** — `<AvatarStage>` (3D client, mood-reactive) + the student's live camera self-view
   + push-to-talk mic + scrolling live transcript + session timer + "End session". Each student
   turn → `POST /api/converse` → client replies in-character with a natural voice; avatar animates.
   The whole session is recorded (MediaRecorder).
3. **Report** — `POST /api/analyze` → animated overall score dial, 5 subscore bars, metric chips
   (talk-ratio, fillers, wpm, eye-contact), evidence list (quotes), 2 coaching tips, a small
   progress trend, and Download Report (PDF) + Download Recording buttons.

## The three "wow" moments to engineer (don't leave to chance)
- W1 (~0:35): typing a scenario visibly fills the persona card AND changes the 3D avatar's mood/posture.
- W2 (~1:30): the client talks back in a natural local neural voice — Kokoro (not robotic browser TTS).
- W3 (~2:20): "End session" produces a scored report citing a real quote ("you interrupted twice…").

## Design tokens
- navy `#1b2a3a`, navy2 `#22384c`, teal `#0fb5ae`, teal-dark `#0a8f89`, AWS orange `#ff9900`,
  paper `#f5f8fa`, muted `#6b8195`. Rounded-2xl cards, soft shadows, 8pt spacing grid, 150–250ms eases.
- One primary action per screen. Captions on by default. Calm, clinical, production-looking.

## AI mapping (on-device first; cloud only where it earns it)
Local LLM (LM Studio / Ollama) = persona parsing + dialogue + report scoring · Local neural TTS
(Kokoro) = client voice · Web Speech = STT · Rekognition = eye-contact (optional cloud, mocked by default).

## Build order (don't deviate)
1) Scaffold + design system  2) Walking skeleton on MOCKS (all 3 screens click)
3) Wire local LLM → neural TTS → optional Rekognition  4) Polish + seed the progress trend  5) Harden demo (backup video).

## Definition of done
12:30 skeleton on mocks · 14:00 real services + scope frozen · 14:15 backup recording · 15:00 submitted.

## Out of scope (resist these — they are time-sinks, not points)
External 3D models / GLTF, lip-sync, auth/accounts, educator dashboard, multi-language. Talk about
them in the pitch as "next steps"; do not build them on the day.
