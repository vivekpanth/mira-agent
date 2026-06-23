# MIRA — Session Handoff

A quick-start context file for a new AI chat (or teammate) picking up MIRA.
Point the new session at this file first: *"Read docs/HANDOFF.md and summarise the
state before changing anything."*

MIRA = a Next.js 16 / React 19 / TypeScript hackathon app for the **ACU IT Hackathon**.
Flow: **Scenario → Rehearsal (3D virtual client) → AI coaching Report.**
Repo: https://github.com/vivekpantha1-byte/m1

---

## Read these first (load context before editing)

| File | Why |
|---|---|
| `CLAUDE.md` | Build rules — follow exactly |
| `src/types.ts` | **FROZEN** contracts — don't change shapes |
| `src/lib/archetype.ts` | Scenario → avatar look + room theme mapping |
| `src/lib/v1-adapter.ts` | Scenario text → persona (keyword router) + report adapter |
| `src/lib/v1/ai/` | **Local LLM** layer (LM Studio / Ollama) — dialogue, structured output, fallback |
| `src/lib/v1/voice/serverTts.ts` | **Local neural TTS** (Kokoro, with Piper / macOS / browser fallbacks) |
| `src/services/rekognition.ts` | Eye-contact detection (DetectFaces) — mock + real, feeds the report |
| `src/lib/useEyeContact.ts` | Client-side webcam sampling → `/api/vision` → aggregated `eyeContactPct` |
| `src/lib/useCamera.ts` | Self-view + records the **3D scene canvas** (+ mic) for the download |
| `src/lib/useAppearance.ts` | Student avatar/room override state (outside frozen SessionState) |
| `src/components/three/AvatarStage.tsx`, `Avatar.tsx`, `Room.tsx` | 3D scene (procedural, scenario-themed) |
| `src/fixtures/persona.ts`, `conversation.ts` | 6 archetype personas + per-archetype scripted dialogue |
| `docs/AWS_SETUP.md`, `README.md` | AWS runbook + project overview |

---

## Current state (typecheck + build both pass)

- **The whole AI stack runs on-device — no Bedrock, no Polly, no cloud LLM.** Rekognition
  (eye-contact) is the only optional cloud call.
- **LLM = local** (`src/lib/v1/ai/`). Default **LM Studio** (`qwen/qwen3-8b`); set
  `LLM_PROVIDER=ollama` for Ollama (`gemma4:e4b`). Persona routing is deterministic
  (`v1-adapter.ts`); dialogue + report prose go through the local model. Configure via
  `LMSTUDIO_*` env. Warm a model before a demo — first call is slowest.
  - Run `npm run status` (or GET `/api/status`) to confirm the live provider + model.
- **Voice = local neural TTS** (`serverTts.ts`): **Kokoro** by default (`npm run tts:up`
  starts the Docker server), falling back to Piper → macOS `say` → browser speech.
  Audio is returned as a data URL on `/api/converse`; no S3.
- **Eye contact = Amazon Rekognition** (`DetectFaces`), the only cloud call and **mocked by
  default**. `useEyeContact` samples the webcam every `NEXT_PUBLIC_VISION_SAMPLE_MS` (3500ms)
  → `/api/vision` → `eyeContactPct`, merged into the report by `computeMetrics`. Set
  `USE_MOCKS=false` + AWS creds to go live (free tier = 5,000 images/mo). Mock fallback on any error.
- **Recording** = the **3D scene canvas** (avatar + room + the student's in-scene monitor)
  + mic audio, captured via `canvas.captureStream()`. The downloaded `.webm` therefore
  shows client + student + room in one frame (not the raw webcam).
- **Scenario keyword router** → archetype personas (medical / it-client / student-support),
  each with its own avatar look, 3D room theme, mood-driven animation, and scripted fallback dialogue.
- **"Customise the scene"** picker lets the student override avatar + room
  (`useAppearance`), with a live 3D preview.
- **ACU purple** rebrand (brand tokens repointed in `src/app/globals.css`).

### Gotchas (so the next session doesn't re-debug)
1. The local model must be **loaded and serving** before a demo (LM Studio server on
   `:1234`, or `ollama serve` on `:11434`). `/api/status` reports whether it's reachable.
2. Kokoro runs in Docker on `:8880` — start it with `npm run tts:up`. Without any TTS
   engine the client voice silently falls back to robotic browser speech.
3. Rekognition only fires when `USE_MOCKS=false` **and** AWS creds are present; otherwise
   eye-contact is a deterministic ~75% mock. That's by design, not a bug.

---

## Pending tasks

1. `src/lib/metrics.test.ts` has a **pre-existing failing wpm test** (expects 129, gets 150)
   from an earlier WPM-clamp change — reconcile the test with `src/lib/metrics.ts`.
   (Unrelated to the LLM / eye-contact / recording work; typecheck is clean.)
2. Update `docs/AWS_SETUP.md` with the four gotchas above + the local-LLM/Rekognition wiring.
3. **Browser smoke test still owed** for the eye-contact + recording features — typecheck
   passes but they haven't been clicked through end-to-end in a live browser yet. Confirm:
   eye-contact % shows in the report, and the downloaded `.webm` shows scene + student.
4. Required deliverables not yet done: a **"reflection on student learning"** doc and a
   **3-minute demo video** (the composite recording can double as demo footage).

> New dep added this session: `@aws-sdk/client-rekognition`.

---

## Working tips
- Run `npm run dev` fresh and **hard-refresh** the browser (`Cmd+Shift+R`) — stale dev
  bundles caused confusion before.
- Scripts: `npm run dev` · `npm run build` · `npm run typecheck` · `npm run test`.
