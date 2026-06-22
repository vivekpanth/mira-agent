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
| `src/services/bedrock.ts` | Real + mock Bedrock, keyword router, model fallback, graceful degradation |
| `src/services/polly.ts` | Real Amazon Polly voice |
| `src/lib/useAppearance.ts` | Student avatar/room override state (outside frozen SessionState) |
| `src/components/three/AvatarStage.tsx`, `Avatar.tsx`, `Room.tsx` | 3D scene (procedural, scenario-themed) |
| `src/fixtures/persona.ts`, `conversation.ts` | 6 archetype personas + per-archetype scripted dialogue |
| `docs/AWS_SETUP.md`, `README.md` | AWS runbook + project overview |

---

## Current state (typecheck + build both pass)

- `USE_MOCKS=false`, region **us-east-1**, creds in `.env.local` (**gitignored** — never commit).
- **Amazon Polly** = 🟢 LIVE neural voice, working.
- **Amazon Bedrock** = wired + proven working, using **Claude Haiku 4.5** via the
  inference-profile id `us.anthropic.claude-haiku-4-5-20251001-v1:0`
  (the raw `anthropic.claude-3-5-*` ids are **end-of-life**).
  ⚠️ The new AWS account's **daily token quota is exhausted**, so dialogue currently
  falls back to per-archetype scripted lines. It returns to live Claude on quota
  reset (~24h) or a **Service Quotas** increase.
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

1. `src/lib/metrics.test.ts` has a **pre-existing failing wpm test** (expects 129) from
   an earlier WPM-clamp change — reconcile the test with `src/lib/metrics.ts`.
2. Update `docs/AWS_SETUP.md` with the four gotchas above.
3. Required deliverables not yet done: a **"reflection on student learning"** doc and a
   **3-minute demo video**.

---

## Working tips
- Run `npm run dev` fresh and **hard-refresh** the browser (`Cmd+Shift+R`) — stale dev
  bundles caused confusion before.
- Scripts: `npm run dev` · `npm run build` · `npm run typecheck` · `npm run test`.
