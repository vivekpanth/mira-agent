# CLAUDE.md — MIRA build rules (read this before every task)

MIRA = **Multimodal Interactive Rehearsal Assistant**. A web app where a student types a
scenario, rehearses a spoken conversation with a 3D virtual client, and gets an AI
**communication coaching report** afterward. This file is the source of truth for HOW we
build. Honor it in every generation. When unsure, ASK — do not invent.

---

## 0. The prime directives (never violate)
1. **Spec/contracts before code.** Don't write a feature until its types in `src/types.ts`
   exist and are agreed. Those shapes are FROZEN — do not change a shape without being told.
2. **Walking skeleton first.** The whole flow (Scenario → Rehearse → Report) must click
   end-to-end on **mock data** before any real cloud call.
3. **Everything mockable.** Every external/AWS call lives behind a service interface with a
   Mock and a Real implementation, switched by `USE_MOCKS`. The demo must run with `USE_MOCKS=true`.
4. **Small diffs, always compiling.** Change one thing at a time. Prefer editing over
   regenerating files. Never leave the repo in a non-compiling state.
5. **No new dependencies without asking.** Hallucinated/extra libs are the top error source.

---

## 1. Stack (pinned — do not substitute)
- **Next.js (App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui.** No other UI kit.
- **3D: React Three Fiber + drei** (NOT raw three.js in components — use the R3F React layer).
- **VERSION PAIRING RULE (prevents the #1 install error):**
  - React 19 / Next 15  →  `@react-three/fiber@^9` + `@react-three/drei@^10`
  - React 18 / Next 14  →  `@react-three/fiber@^8` + `@react-three/drei@^9`
  - Never mix a React 18 project with R3F v9 (or vice-versa). Check `react` version first,
    then install the matching R3F/drei major. Let npm resolve `three` to the version R3F asks for.
- State: React hooks + one `useSession()` context. No Redux/Zustand unless asked.
- Charts (report): plain SVG/CSS or `recharts` only if needed. Prefer hand-rolled SVG.

---

## 2. Folder structure
```
src/
  app/
    page.tsx                 # shell + step router (Scenario→Rehearse→Report)
    api/
      scenario/route.ts      # POST: text -> Persona (local keyword router)
      converse/route.ts      # POST: studentText -> {replyText, audioUrl, mood}
      analyze/route.ts       # POST: transcript -> Report
  components/
    screens/ ScenarioScreen.tsx RehearsalScreen.tsx ReportScreen.tsx
    ui/      PersonaCard.tsx LiveTranscript.tsx ScoreDial.tsx ...
    three/   AvatarStage.tsx Avatar.tsx Room.tsx   # all R3F
  lib/v1/    ai/ (local LLM)  voice/ (neural TTS)  # dialogue + client voice
  services/  rekognition.ts                        # eye-contact: Mock + Real (USE_MOCKS)
  fixtures/  persona.ts conversation.ts report.ts  # canned demo data
  lib/       useSession.ts metrics.ts (deterministic scoring)
  types.ts                   # FROZEN contracts
```

---

## 3. Service-layer pattern (copy this shape for any external call)
```ts
// services/rekognition.ts
const USE_MOCKS = process.env.USE_MOCKS !== 'false';
export async function detectEyeContact(jpegBase64: string): Promise<number> {
  if (USE_MOCKS) return mockEyeContact();            // deterministic, instant
  return realEyeContact(jpegBase64);                 // calls Rekognition
}
```
- Client code NEVER imports a service or holds AWS keys. Only `app/api/*` routes do.
- Every `/api` route accepts `?demo=1` → returns a fixture from `src/fixtures/`, regardless of `USE_MOCKS`.
- **The AI stack is on-device** (local LLM + neural TTS) — see §3.5. The only cloud call is
  Rekognition (eye-contact), and it's mocked by default. If a real service is risky, keep it mocked
  and SAY SO in the UI/pitch ("computed locally / on-device") — never fake a claim.

---

## 3.5 The real AI stack (no Bedrock/Polly) — full runbook in `docs/AWS_SETUP.md`
- **Dialogue + report prose:** local LLM via `src/lib/v1/ai/` — LM Studio (`qwen/qwen3-8b`) by
  default, or Ollama (`LLM_PROVIDER=ollama`). Configured with `LMSTUDIO_*` env. No cloud.
- **Client voice:** local neural TTS via `src/lib/v1/voice/serverTts.ts` — Kokoro (`npm run
  tts:up`), falling back to Piper → macOS `say` → browser speech. No cloud.
- **Persona:** deterministic keyword router in `src/lib/v1-adapter.ts` (no model call).
- **Eye-contact (optional cloud):** Amazon Rekognition `DetectFaces`, gated by `USE_MOCKS`.
  Mocked by default; set `USE_MOCKS=false` + `AWS_*` creds to go live. Region `us-east-1`.
- `lib/metrics.ts` owns the numbers; the LLM writes only the prose (evidence/tips).

## 3.6 Known gap (top priority)
`mockParseScenario` currently ignores its input and always returns the same persona. Build a
**keyword router** (medical / IT-client / difficult-conversation archetypes → distinct personas)
so "scenario drives the environment" is TRUE on mocks. This is the highest-value open task.

---

## 4. Three.js / R3F conventions (we want it interactive AND error-free)
**De-risking rule: build the avatar PROCEDURALLY from primitives. No external .gltf/.glb assets**
— external 3D assets are the biggest source of loading errors and demo failures. Zero assets = zero load risk.

- **Next.js + Canvas:** the 3D scene is client-only. The component file starts with `'use client'`,
  and `AvatarStage` is imported with `dynamic(() => import(...), { ssr: false })`. Three.js cannot SSR.
- **One `<Canvas>`** for the rehearsal room. Props: `dpr={[1, 2]}`, `shadows`, `camera={{ position:[0,1.4,4], fov:45 }}`.
- **Lighting = mood + polish:** `ambientLight` (soft) + one `directionalLight` (key, casts shadow)
  + a colored `pointLight`/rim whose color encodes mood (anxious=amber, angry=red, sad=blue, neutral=teal).
- **Animation via `useFrame`** only: idle breathing/bob always on; a stronger "talk" motion gated by
  the `speaking` prop. Mood changes posture (arm/head rotation) and material color. **No lip-sync** (time-sink trap).
- **Polish helpers from drei:** `<ContactShadows>`, `<Environment preset="city">`, `<Float>` (subtle),
  `<OrbitControls enableZoom={false} enablePan={false} minPolar.../maxPolar...>` for a little interactivity.
- **Performance/cleanliness:** R3F auto-disposes; don't manually `new` geometries in render — define them
  in JSX. Keep poly counts tiny. Don't run heavy work in `useFrame`. Throttle to `frameloop="demand"` only
  if there's no continuous animation (we have idle motion, so keep default but keep the scene light).
- **Component contract (frozen):** `<AvatarStage persona={Persona} mood={Mood} speaking={boolean} />`.
  Everything else (camera self-view, transcript) is normal DOM layered around the Canvas, not inside it.
- Make the WHOLE app feel interactive with Three.js where it earns attention: animated 3D persona,
  reactive lighting, a subtle 3D scene transition. Do NOT 3D-ify forms/reports — keep those crisp DOM.

---

## 5. Coding standards
- TypeScript **strict**; no `any` (use `unknown` + narrow). Components < ~150 lines, one job each.
- Tailwind for layout; shadcn/ui for primitives. Use the design tokens in `SPEC.md` (clinical navy/teal + AWS orange).
- Every interactive element keyboard-accessible; captions on by default; visible focus rings.
- Loading/empty states everywhere ("MIRA is thinking…" shimmer). A frozen blank screen reads as "broken" to a judge.

---

## 6. Workflow for every task (do this, in order)
1. **Plan, don't code yet.** Restate the task, list files you'll touch, name the types involved. Wait for go.
2. **Implement one slice.** Smallest change that compiles. Don't touch unrelated files.
3. **Verify.** Run build + typecheck; if there's an error, paste-fix the smallest change. Screenshot UI changes.
4. **Stop and report.** State what changed and the next smallest step.
- For deterministic scoring (`lib/metrics.ts`: talkRatio, fillers, wpm, open/closed questions), WRITE TESTS FIRST.

---

## 7. Definition of done / checkpoints
- **12:30** — Scenario→Rehearse→Report clicks end-to-end on mocks, on one machine.
- **14:00** — Local LLM dialogue + neural TTS voice wired (Rekognition optional); scope FROZEN (no new features after this).
- **14:15** — A 90s happy-path screen recording captured as demo insurance.
- **15:00** — Submitted. Then rehearse only.

## 8. Anti-patterns (instant red flags — don't do these)
- Regenerating a whole working file to "clean it up" (causes silent drift/breakage).
- Adding a library, changing a `types.ts` shape, or renaming an API field without being asked.
- Loading external 3D models, building lip-sync, or polishing avatars before the Report screen works.
- Putting AWS keys/SDK calls in client components.
- Any change that leaves `npm run build` failing.
