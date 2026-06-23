# MIRA — 3-Minute Demo Script (ACU x AWS Hackathon)

Goal: hit every rubric line in 3:00. Speak to the camera, screen-share the running app on
`localhost`. Practise once. Keep moving — do **not** wait for slow model replies on camera (the
report screen is the payoff).

## 0:00–0:25 — Hook + problem (Innovation, Educational Impact)
> "Students in nursing, counselling and IT have to master hard conversations — but they can't
> practise on real patients or clients. MIRA is a web app where you type a scenario and rehearse
> that conversation with a 3D virtual client, then get an evidence-based coaching report.
> And here's our key decision: **the conversation runs on a local AI model — no student or patient
> data ever leaves the machine.**"

## 0:25–1:00 — Scenario drives the environment (Functionality /30)
- Type: *"A patient comes to me with a respiratory condition and is anxious."* → **Begin**.
> "The scenario builds the room *and* the person — our keyword router picks a medical archetype,
> so we get a clinic, an anxious patient persona, mood-driven lighting, and a matching voice."
- Show the 3D room + avatar + **your own camera feed on the in-scene monitor** ("two figures in one
  room — the client, and me — exactly as the brief asks").

## 1:00–1:50 — Live interaction (Functionality, Innovation, UX /20)
- Speak one line, e.g. *"Hi, I'm one of the nurses — can you tell me what's been happening?"*
- Client replies **aloud (Amazon Polly neural voice)**; point out the **speech-bubble captions**
  and the **mood shift** ("watch the lighting warm as I show empathy").
> "Dialogue is a local Llama model; the voice is Amazon Polly; and Amazon Rekognition is measuring
> my eye contact through the webcam the whole time."

## 1:50–2:35 — The payoff: coaching report (Educational Impact /20)
- Click **End session & get report**. Show:
  - Overall score + skills radar.
  - **Measured signals**: talk ratio, fillers, pace, **eye contact % (Rekognition)**.
  - **Evidence** — "every score is backed by a direct quote from what I actually said."
  - Two actionable tips.
> "This closes the reflective-practice loop: act, see objective evidence, improve."

## 2:35–3:00 — Recording + close (Functionality, Teamwork /10)
- Click **Download recording** → show the `.webm` plays back the scene, **captions, and both
  voices**.
> "Audio + video recorded and downloadable, up to 30 minutes. To recap: scenario-driven 3D
> environment, live AWS Polly voice and Rekognition vision, a private on-device conversation for
> data protection, and an evidence-based coaching report. That's MIRA. Thank you."

---

## Judge Q&A prep (1 minute)
- **"Why not Amazon Bedrock for the dialogue?"** → "Bedrock is fully wired — one environment flag.
  We *default* to a local model on purpose: conversations in healthcare/counselling are sensitive,
  so keeping them on-device is a data-sovereignty feature. We use AWS where it adds the most value —
  Polly for natural speech and Rekognition for vision analytics, both live."
- **"Is the scenario really driving things or is it scripted?"** → "A keyword router maps the text
  to one of six archetypes that each configure a distinct room, persona, mood and voice; the
  dialogue is generated live by the model in character."
- **"How are the scores trustworthy?"** → "The numeric metrics are deterministic pure functions of
  the transcript — reproducible — and every qualitative score cites an exact quote."
- **"What's the architecture?"** → "Next.js + TypeScript + React Three Fiber; a service layer where
  every external call has Mock / Local / AWS implementations, so it runs offline on localhost and
  upgrades to live AWS cleanly."

## Pre-record checklist
- [ ] `npm run dev` fresh, **hard-refresh** (Cmd+Shift+R).
- [ ] Camera + mic permission granted; good lighting; face the screen.
- [ ] **Recording verified** — run one short session and confirm the downloaded `.webm` has
      picture, captions, and *both* voices BEFORE filming the final take.
- [ ] Quiet room; close other tabs; model warmed up (one throwaway turn first).
