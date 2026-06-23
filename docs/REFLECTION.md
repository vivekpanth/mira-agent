# MIRA — Reflection on Student Learning

**MIRA (Multimodal Interactive Rehearsal Assistant)** lets students rehearse real client and
patient conversations with a 3D virtual client, then receive an evidence-based coaching report.
Below is how it enhances learning — and why our architecture choices matter pedagogically.

## 1. Safe, repeatable, judgement-free practice
Communication, interviewing, and breaking-bad-news skills are learned by *doing* — but novices
can't practise on real patients or clients without risk. MIRA gives unlimited, consequence-free
reps. A student can attempt the same difficult conversation ten times, try different openings,
and fail safely. Repetition with variation is how procedural skills become automatic.

## 2. Privacy is a *pedagogical* feature, not just a technical one
We run the dialogue model **entirely on-device** (Llama 3.1 8B, with Gemma as a fallback). The
conversation — which in a clinical or counselling context contains sensitive, simulated patient
disclosures — **never leaves the student's machine.** This matters for learning in two ways:

- **Psychological safety → candid practice.** Students rehearse honestly when they trust that an
  awkward attempt isn't being uploaded, stored, or reviewed. Fear of surveillance produces
  stilted, performative practice; privacy produces real practice.
- **Institutional adoption.** Universities in healthcare, social work, and counselling face
  strict data-governance rules. A tool that keeps conversation data local is one a faculty can
  actually deploy — so the learning benefit reaches students instead of stalling in review.

We pair this with **AWS where the cloud genuinely adds value**: Amazon Polly for a natural neural
client voice and Amazon Rekognition for objective eye-contact analysis. Keeping the conversation
itself on-device — while using AWS for speech and vision — is a deliberate data-sovereignty
choice, not a limitation.

## 3. Evidence-based feedback closes the reflective loop
Practice without feedback plateaus. After each session MIRA produces a coaching report where
**every score is backed by a direct quote from the transcript** — so feedback is concrete and
actionable, not vague. This operationalises *reflective practice* (Schön / Kolb's experiential
learning cycle): the student acts, then reviews objective evidence of what they actually did, then
adjusts. The downloadable session recording lets them re-watch their own non-verbal behaviour.

## 4. Objective, measurable skill signals
Soft skills feel unmeasurable; MIRA makes them concrete and trackable across sessions:
- **Eye contact %** — Amazon Rekognition face-pose analysis (a real non-verbal signal).
- **Talk ratio** — did the student dominate or listen?
- **Filler words, speaking pace (wpm), interruptions** — deterministic, reproducible metrics.
- **Empathy / clarity / questioning / structure** — qualitative sub-scores, each evidenced.

Because the numbers are deterministic, a student sees *real progress* over time rather than a
black-box grade — which sustains motivation.

## 5. Breadth across disciplines
The scenario text drives the environment, so one tool serves nursing ("a patient with a
respiratory condition"), IT ("a client reporting a system failure"), and counselling ("a difficult
conversation"). The same reflective loop transfers across ACU's health, education, and
professional programs.

## 6. Accessibility
Captions are on by default (on-screen speech bubbles *and* burned into the recording), the flow is
keyboard-navigable, and loading states are always visible — so the tool supports diverse learners.

---

**In short:** MIRA turns isolated, high-stakes communication practice into a safe, private,
repeatable loop with objective feedback — the conditions under which communication skills, and the
confidence to use them, actually develop.
