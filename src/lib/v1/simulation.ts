import type { ConversationResponse, MarkerType, TranscriptTurn, TrustEvent } from "@/lib/v1/types";

const includes = (text: string, terms: string[]) => terms.some((t) => text.includes(t));

export function simulateResponse(message: string, turnCount = 0): ConversationResponse {
  const text = message.toLowerCase();
  const blame = includes(text, ["you should", "your fault", "why didn't", "why did you not", "obviously", "calm down"]);
  const empathy = includes(text, ["sounds", "sorry", "understand", "difficult", "hard", "worried", "frustrat", "thank you for"]);
  const open = includes(text, ["tell me", "what happened", "how has", "what would", "what support", "help me understand", "can you share"]);
  const next = includes(text, ["together", "options", "next step", "contact", "support available", "let's", "we can"]);
  const question = text.includes("?");

  let markerType: MarkerType = "missed_opportunity";
  let trustDelta = -1;
  let emotion: ConversationResponse["emotion"] = "anxious";
  let coachingSignal = "The response moved on without fully acknowledging the concern.";
  let suggestedAlternative = "It sounds like this has been weighing on you. What has happened so far?";

  if (blame) {
    markerType = "judgement"; trustDelta = -6; emotion = "defensive";
    coachingSignal = "Blaming language can make the client feel judged and less willing to share.";
    suggestedAlternative = "It sounds like it was difficult to know where to ask for help. What happened next?";
  } else if (empathy && open) {
    markerType = "empathy"; trustDelta = 6; emotion = turnCount > 1 ? "relieved" : "anxious";
    coachingSignal = "You acknowledged the emotion and invited the client to explain in their own words.";
  } else if (open || question) {
    markerType = "open_question"; trustDelta = 4; emotion = "anxious";
    coachingSignal = "An open question gave the client space to share the situation.";
  } else if (next) {
    markerType = "supportive_next_step"; trustDelta = 4; emotion = "relieved";
    coachingSignal = "A collaborative next step helped the client feel supported rather than managed.";
  } else if (empathy) {
    markerType = "empathy"; trustDelta = 3; emotion = "neutral";
    coachingSignal = "Validation reduced pressure and signalled that the concern was being taken seriously.";
  }

  let reply = "I’ve tried messaging everyone, but I barely get a response. I’m embarrassed that it has got this far.";
  if (blame) reply = "I know I should have done something earlier. That’s why I almost didn’t come in—I already feel like this is my fault.";
  else if (next) reply = "That would help. I don’t need you to fix everything—I just need to know there’s a way forward.";
  else if (empathy && open && turnCount > 1) reply = "Honestly, I’m scared I’ll fail the unit and disappoint my family. They’ve made a lot of sacrifices for me.";
  else if (empathy && open) reply = "Thank you. I kept trying to organise meetings, but two people stopped replying and now one says they’re leaving the unit.";
  else if (open) reply = "It started about two weeks ago. I kept checking in, but nobody agreed on what they would finish.";

  return { reply, emotion, trustDelta, markerType, coachingSignal, suggestedAlternative };
}

export function createFeedback(transcript: TranscriptTurn[], events: TrustEvent[]) {
  const positive = events.filter((e) => e.delta > 0).length;
  const negative = events.filter((e) => e.delta < 0).length;
  const count = Math.max(1, events.length);
  const hasQuestion = events.some((e) => e.markerType === "open_question" || e.markerType === "empathy");
  const hasNext = events.some((e) => e.markerType === "supportive_next_step" || e.markerType === "clarity");
  return {
    scores: {
      empathy: Math.min(10, Math.max(4, 6 + positive - negative)),
      clarity: Math.min(10, Math.max(4, hasNext ? 8 : 6)),
      questioning: Math.min(10, Math.max(4, hasQuestion ? 8 : 5)),
      nextSteps: Math.min(10, Math.max(4, hasNext ? 8 : 5)),
    },
    strengths: positive ? ["You created space for Maya to explain the situation in her own words.", "Your calm language helped keep the conversation collaborative."] : ["You stayed present through a difficult conversation."],
    missedOpportunities: [hasNext ? "You could check how confident Maya feels about the agreed next step." : "You did not yet make the available support options concrete.", count < 3 ? "A follow-up question could uncover what Maya has already tried." : "You could summarise what you heard before moving to solutions."],
    suggestedRetry: "What support have you already tried, and what would feel most helpful right now?",
  };
}

