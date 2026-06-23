# MIRA — How the Scenario Input Drives the Virtual Environment

A brief technical explanation for the ACU x AWS Hackathon. The core requirement is that the
student's typed scenario should *configure* the virtual interaction. Here is exactly how.

## The pipeline (text → environment)

```
Scenario text
   │  POST /api/scenario
   ▼
Keyword router  (src/lib/archetype.ts → matchArchetype)
   │  classifies into one of 6 archetypes:
   │  medical · pediatric · grief · it-client · workplace · generic
   ▼
Persona  (src/types.ts — FROZEN contract)
   { role, scene, emotion, difficulty, hiddenConcern,
     objectives[3], avatarMood, voiceId }
   │
   ├── avatarMood ─────►  3D avatar posture + reactive lighting colour
   │                       (anxious=amber, angry=red, sad=blue, neutral=teal)
   ├── archetype look ─►  avatar appearance (AVATAR_LOOKS)
   ├── archetype theme ►  3D room theme / furniture / palette (ROOM_THEMES)
   └── voiceId ────────►  Amazon Polly neural voice for the client
```

So a scenario like *"a patient with a respiratory condition"* routes to the **medical** archetype:
a clinic room, a worried adult patient persona, an amber anxious mood, and a matching Polly voice.
*"A software client wants to report a system failure"* routes to **it-client**: an office, a
frustrated professional, a firmer voice. **The scenario literally builds the room and the person.**

## Dialogue — in character, on device
Each student utterance hits `POST /api/converse`. We build a system prompt from the Persona
(role, situation, emotion, hidden concern) and send it to a **local LLM (Llama 3.1 8B via Ollama,
Gemma fallback)**. The client replies in character, and its **mood shifts** based on the student's
empathy — softening with rapport, hardening if dismissed — which re-colours the lighting and
animates the avatar. **No conversation data leaves the machine** — and speech-to-text is done
in-browser (Web Speech API), so the student's audio isn't shipped to a cloud transcriber either.

## The coaching report — `POST /api/analyze`
- **Deterministic metrics** (`src/lib/metrics.ts`): talk-ratio, fillers, words-per-minute,
  interruptions — pure functions, reproducible from the transcript.
- **Eye contact** (Amazon Rekognition `DetectFaces`): the rehearsal screen samples the webcam,
  `/api/vision` scores face-pose/eyes-open, and the aggregate % is overlaid into the report.
- **Qualitative prose** (LLM): empathy/clarity/questioning sub-scores, each with a **direct quote**
  from the transcript as evidence, plus two prioritised tips.

## Recording (functional requirement)
The download is a **composite**: a 2D compositor canvas copies the live 3D scene each frame and
**burns in subtitle captions**, while a shared Web Audio bus mixes the **student's mic + the
client's Polly voice** into one track. The result is a `.webm` showing the client, the room, the
student (camera feed on an in-scene monitor), captions, and both voices — downloadable in one click.

## Architecture principles
- **Service layer with Mock / Real / Local switches** (`src/services/*`) — every external call is
  swappable, so the app runs fully on `localhost` with no cloud account, then upgrades to live AWS.
- **AWS services used live:** Amazon **Polly** (neural client voice) and Amazon **Rekognition**
  (eye-contact face-pose analysis).
- **Frozen type contracts** (`src/types.ts`) let the team build screens, services, and the 3D
  scene in parallel without breaking each other.
- **Stack:** Next.js (App Router) + TypeScript (strict) + Tailwind + React Three Fiber.

## Hybrid cloud rationale (the design story)
We use the cloud where it adds value the device can't easily match — **natural neural speech
(Polly)** and **computer-vision analytics (Rekognition)** — and keep the **conversation on-device**
for data sovereignty. That is a deliberate, defensible architecture for the sensitive
education/healthcare setting this tool targets.
