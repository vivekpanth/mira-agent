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
| `src/services/bedrock.ts` | LLM layer: **local Ollama** OR Bedrock (LLM_PROVIDER), keyword router, model fallback, graceful degradation |
| `src/services/polly.ts` | Real Amazon Polly voice |
| `src/services/rekognition.ts` | Eye-contact detection (DetectFaces) — mock + real, feeds the report |
| `src/lib/useEyeContact.ts` | Client-side webcam sampling → `/api/vision` → aggregated `eyeContactPct` |
| `src/lib/useCamera.ts` | Self-view + records the **3D scene canvas** (+ mic) for the download |
| `src/lib/useAppearance.ts` | Student avatar/room override state (outside frozen SessionState) |
| `src/components/three/AvatarStage.tsx`, `Avatar.tsx`, `Room.tsx` | 3D scene (procedural, scenario-themed) |
| `src/fixtures/persona.ts`, `conversation.ts` | 6 archetype personas + per-archetype scripted dialogue |
| `docs/AWS_SETUP.md`, `README.md` | AWS runbook + project overview |

---

## Current state (typecheck + build both pass)

- `USE_MOCKS=false`, region **us-east-1**, creds in `.env.local` (**gitignored** — never commit).
- **LLM = on-device Ollama** (`LLM_PROVIDER=local`). Primary `llama3.1:8b`, fallback
  `gemma4:e4b`. All three operations (persona / dialogue / report prose) route through
  `invokeLocal()` in `bedrock.ts`. This sidesteps the Bedrock daily-token quota — the
  reason we went local. Warm latency ≈ 2s for a short reply (~19 tok/s); the report
  (`analyze`) generates more, so expect ~20-40s behind the "thinking" shimmer.
  - Run `OLLAMA_KEEP_ALIVE=30m ollama serve` and fire one warm-up call before a demo.
- **Amazon Polly** = 🟢 LIVE neural voice, working — independent of the LLM switch.
- **Eye contact = 🟢 Amazon Rekognition** (`DetectFaces`). `useEyeContact` samples the
  webcam every `NEXT_PUBLIC_VISION_SAMPLE_MS` (3500ms) → `/api/vision` → `eyeContactPct`
  overlaid into the report by `computeMetrics(turns, { eyeContactPct })`. Mock fallback
  on any AWS error. Free tier = 5,000 images/mo.
- **Recording** = the **3D scene canvas** (avatar + room + the student's in-scene monitor)
  + mic audio, captured via `canvas.captureStream()`. The downloaded `.webm` therefore
  shows client + student + room in one frame (not the raw webcam as before).
- **Amazon Bedrock** = still wired as the non-local LLM path (set `LLM_PROVIDER=bedrock`).
  Uses **Claude Haiku 4.5** via inference-profile `us.anthropic.claude-haiku-4-5-20251001-v1:0`
  (raw `anthropic.claude-3-5-*` ids are **end-of-life**).
  ⚠️ The new AWS account's **daily token quota is exhausted** — the original reason for
  the local switch. Returns to live Claude on quota reset (~24h) or a Service Quotas increase.
- **Scenario keyword router** → 6 archetype personas (medical / pediatric / grief /
  it-client / workplace / generic), each with its own avatar look, 3D room theme,
  mood-driven animation, and scripted fallback dialogue.
- **"Customise the scene"** picker lets the student override avatar + room
  (`useAppearance`), with a live 3D preview.
- **ACU purple** rebrand (brand tokens repointed in `src/app/globals.css`).

### AWS gotchas we hit (so the next session doesn't re-debug)
1. Current Claude models need the **`us.` inference-profile prefix**, not the raw id.
2. `anthropic.claude-3-5-haiku/sonnet-*` are **EOL** — they will not invoke.
3. The Bedrock **"Model access" console page is retired** — models auto-enable on first
   invoke by a principal that has **`aws-marketplace:Subscribe` / `ViewSubscriptions`**.
   That permission is already on the `mira-hackathon` IAM user.
4. New accounts have a low **daily token quota** → `ThrottlingException: Too many tokens
   per day`. Not a code bug.

### Smoke test
`node scripts/verify-real.mjs` — confirms whether Bedrock + Polly are live right now.

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
