# MIRA — AI stack & (optional) AWS setup

> **TL;DR:** MIRA runs on a **private, on-device AI stack**. Dialogue is a **local LLM**
> (LM Studio / Ollama) and the client voice is **local neural TTS** (Kokoro). There is **no
> Bedrock, no Polly, no cloud LLM**. The *only* optional cloud call is **Amazon Rekognition**
> for eye-contact, and it's mocked by default — so the whole app demos with zero AWS account.

---

## 1. What runs where

| Capability | Engine | Where | Cloud? |
|---|---|---|---|
| Scenario → persona | deterministic keyword router | `src/lib/v1-adapter.ts` | no |
| In-character dialogue + report prose | **local LLM** (LM Studio `qwen/qwen3-8b`, or Ollama) | `src/lib/v1/ai/` | no |
| Client voice (TTS) | **Kokoro** neural (→ Piper → macOS → browser) | `src/lib/v1/voice/serverTts.ts` | no |
| Speech-to-text (your mic) | Web Speech API | browser | no |
| Deterministic scoring | `computeMetrics` | `src/lib/metrics.ts` | no |
| Eye-contact % | **Amazon Rekognition** `DetectFaces` | `src/services/rekognition.ts` | **optional** |

All env vars are documented in [`.env.example`](../.env.example).

---

## 2. Local AI stack (required for live dialogue/voice)

### LLM — LM Studio (default) or Ollama
1. **LM Studio:** install, load `qwen/qwen3-8b`, start the local server (`:1234`). Defaults
   already point here — nothing to set.
2. **Ollama instead:** `ollama pull gemma4:e4b && ollama serve`, then in `.env.local`:
   ```
   LLM_PROVIDER=ollama
   LMSTUDIO_BASE_URL=http://localhost:11434/v1
   LMSTUDIO_MODEL=gemma4:e4b
   ```
3. Verify: `GET /api/status` (or `npm run status`) returns the live provider + model.

> Warm the model with one call before a demo — the first request is the slowest.

### Voice — Kokoro (default)
- `npm run tts:up` starts the Kokoro Docker server on `:8880` (`TTS_ENGINE=auto` finds it).
- No Docker? It falls back to Piper (`PIPER_BASE_URL`) → macOS `say` → browser speech.
  Browser speech is the robotic last resort — start Kokoro for the "wow" voice.

---

## 3. Optional: Amazon Rekognition (eye-contact only)

This is the **only** cloud call, and it's **off by default** (`USE_MOCKS=true` → deterministic
~75% mock). Enable it only if you want real gaze tracking in the report.

1. Create an IAM user with **`rekognition:DetectFaces`**; generate an access key.
2. In `.env.local`:
   ```
   USE_MOCKS=false
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```
3. `useEyeContact` samples the webcam every `NEXT_PUBLIC_VISION_SAMPLE_MS` (3500ms) →
   `/api/vision` → `eyeContactPct`, merged into the report by `computeMetrics`.
4. Any AWS error falls back to the mock silently, so the demo never breaks.

**Cost:** Rekognition free tier = 5,000 images/mo. At 3.5s sampling that's ~24 min of
rehearsal/month free. Set an AWS Budgets alert at **$1** before flipping `USE_MOCKS=false`.

---

## 4. Demo checklist

- [ ] Local LLM server up (`/api/status` shows it reachable).
- [ ] `npm run tts:up` for the Kokoro voice.
- [ ] `USE_MOCKS=true` unless you specifically want live Rekognition.
- [ ] One warm-up dialogue turn so the first on-stage reply is fast.
- [ ] Recording captures the **3D scene canvas** + mic audio (not the raw webcam).
