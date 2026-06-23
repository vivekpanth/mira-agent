# MIRA — 3-Minute Winning Demo Script (ACU x AWS Hackathon)

**Team:** Vivek · Narendra · Diwash
**Scenario we demo:** an internationally-trained IT professional practising a job interview with
a skeptical hiring manager — a struggle the three of us know first-hand.
**Hard rules:** finish in **3:00**. Every sentence earns a rubric point. Never wait on a slow model
reply on camera — keep narrating, cut to the report (that's the payoff).

Rubric coverage: Functionality /30 · UX /20 · Innovation /20 · Educational Impact /20 · Teamwork /10.

---

## Speaking order & roles
- **Vivek** — opening hook + privacy/AWS framing + close. (the narrative)
- **Narendra** — drives the app: types the scenario, speaks the interview turn. (the live demo)
- **Diwash** — walks the coaching report + downloads the recording. (the payoff)

---

## THE SCRIPT (with hooks ⟶)

### 0:00–0:30 — Vivek — Hook + problem  ⟶ *Educational Impact, Innovation*
> "We're three international students — Vivek, Narendra and Diwash. Between us we have years of
> IT experience from back home — and we've all faced the same wall: getting rejected here, not on
> our coding, but on the **interview**. Talking about yourself with confidence is a skill, and
> there's nowhere safe to practise it.
>
> So we built **MIRA** — type any scenario, and rehearse that exact conversation, out loud, with a
> 3D virtual client. And our number-one principle: **your practice is private — the conversation
> never leaves your computer.** Narendra, show them."

### 0:30–1:05 — Narendra — Scenario drives the environment  ⟶ *Functionality /30*
- Type into the box:
  > *"I'm an internationally-trained IT professional with years of experience back home, but I keep
  > getting rejected here. I want to practise a job interview with a hiring manager who is skeptical
  > about my overseas experience."*
- Click **Begin**.
> "From that one sentence MIRA builds the whole scene — a professional office, a skeptical
> hiring-manager persona with a hidden concern, mood-driven lighting, and a matching voice. And
> there I am, on the screen in the room — the camera puts the student and the client face to face,
> exactly as the brief asks."

### 1:05–1:55 — Narendra — Live interaction  ⟶ *Functionality, Innovation, UX /20*
- Push to talk, say one strong line:
  > *"Thanks for seeing me. I know my experience is from overseas, but I led a team of four building
  > production systems — let me show you how that transfers."*
- The client replies **aloud**. Point at the screen:
> "That voice is **Amazon Polly** — a real neural voice. The reply comes from a **local Llama 3.1
> model running on this machine** — nothing about my answer is sent to any AI company. You can read
> everything in the **live captions**, and watch the lighting warm up as I build rapport — the
> client's **mood** is shifting. And the whole time, **Amazon Rekognition** is checking my eye
> contact through the webcam."

### 1:55–2:35 — Diwash — The coaching report  ⟶ *Educational Impact /20*
- Click **End session & get report**. Walk it fast:
> "Here's what makes this a learning tool, not a toy. An instant coaching report:
> an overall score and skills radar; **measured signals** — talk-ratio, filler words, pace, and
> **eye-contact percentage from Amazon Rekognition**; and critically — **every score is backed by
> a direct quote from what I actually said.** Plus two specific tips for next time. That's the
> reflective-practice loop: act, see real evidence, improve."

### 2:35–3:00 — Diwash → Vivek — Recording + close  ⟶ *Functionality, Teamwork /10*
- Diwash clicks **Download recording**, show the `.webm` plays back the scene **with captions and
  both voices**.
> *(Diwash)* "Full audio and video of the session — captions burned in — downloadable in one click,
> up to 30 minutes."
- **Vivek closes:**
> "So: a scenario-driven 3D environment, a live **Amazon Polly** voice and **Amazon Rekognition**
> vision, a **private on-device** conversation that protects sensitive data, and an evidence-based
> coaching report that actually helps you improve. That's MIRA — practice that's safe, private, and
> real. Thank you."

---

## 🎥 How to produce the video (do this now)

**Tooling:** record the screen with the running app at `localhost:3000`.
- Mac: **Cmd+Shift+5** → "Record Selected Portion" over the browser window (records screen; use the
  mic for narration). Or **OBS** if you want a webcam talking-head in a corner.
- Capture system audio too so the Polly voice is in the video (OBS, or QuickTime "New Screen
  Recording" with audio). If unsure, narrate over it — the captions carry the meaning.

**Process (≈15 min):**
1. **Warm up** the model: run one throwaway turn first so the on-camera reply is fast.
2. **Dry run once** end-to-end with a stopwatch — trim until you land under 3:00.
3. **Record the final take.** One continuous screen-record is fine; one person narrates and clicks,
   the other two record their lines (intro/close) — or do it live together on a Teams call and
   record that.
4. Keep the **report screen on-screen longest** — it's the highest-scoring moment.
5. Export as **`MIRA-demo.mp4`**, watch it once, confirm audio is audible and it's < 3:00.

**Shot checklist:** scenario typed → office + avatar + your camera-in-scene → one spoken turn +
voiced reply + captions + mood shift → report (eye-contact %, quotes, tips) → download recording.

---

## 🛡️ Judge Q&A prep (1 minute — own these)
- **"Did you use AWS?"** → "Yes — **Amazon Polly** for the client's neural voice and **Amazon
  Rekognition** for eye-contact analysis, both live. We deliberately keep the *conversation* on a
  local model so sensitive practice data never leaves the device — AWS for speech and vision, local
  for privacy."
- **"Why a local LLM — isn't cloud better?"** → "For healthcare, counselling and career coaching,
  the conversation is sensitive. Keeping it on-device means a university can actually deploy this
  under its data-governance rules. Privacy *is* the feature."
- **"Is the scenario really driving the environment?"** → "The scenario text generates the persona
  live — role, hidden concern, mood, voice — and that drives the 3D room, the avatar, the lighting,
  and the Polly voice. Different scenario, different room and person."
- **"How are the scores trustworthy?"** → "Numeric metrics are deterministic pure functions of the
  transcript — reproducible — and every qualitative score cites an exact quote. Eye contact is real
  Rekognition face-pose data."
- **"What's the stack?"** → "Next.js + TypeScript + React Three Fiber; a service layer with
  Mock / Local / AWS implementations, so it runs offline on localhost and uses live AWS for voice
  and vision."

---

## ✅ Pre-record checklist
- [ ] `npm run dev` fresh; **hard-refresh** (Cmd+Shift+R).
- [ ] Camera + mic allowed; good lighting; face the screen for a real eye-contact number.
- [ ] **Recording verified** — confirm the downloaded `.webm` has picture, captions, and BOTH
      voices BEFORE the final take.
- [ ] Model warmed (one throwaway turn); quiet room; other tabs closed.
- [ ] Final video is **`MIRA-demo.mp4`, audible, under 3:00.**
