export const conversationResponseSchema = {
  type: "object",
  properties: {
    reply: { type: "string", description: "In-character client reply, 1-3 sentences." },
    emotion: { type: "string", enum: ["neutral", "anxious", "defensive", "relieved"] },
    trustDelta: { type: "integer", description: "Trust change from -10 to 10." },
    markerType: {
      type: "string",
      enum: ["empathy", "open_question", "clarity", "judgement", "interruption", "missed_opportunity", "supportive_next_step"],
    },
    coachingSignal: { type: "string", description: "Brief coaching note for the student." },
    suggestedAlternative: { type: "string", description: "Better phrasing the student could try." },
  },
  required: ["reply", "emotion", "trustDelta", "markerType", "coachingSignal", "suggestedAlternative"],
} as const;

export const feedbackResponseSchema = {
  type: "object",
  properties: {
    scores: {
      type: "object",
      properties: {
        empathy: { type: "integer" },
        clarity: { type: "integer" },
        questioning: { type: "integer" },
        nextSteps: { type: "integer" },
      },
      required: ["empathy", "clarity", "questioning", "nextSteps"],
    },
    strengths: { type: "array", items: { type: "string" } },
    missedOpportunities: { type: "array", items: { type: "string" } },
    suggestedRetry: { type: "string" },
  },
  required: ["scores", "strengths", "missedOpportunities", "suggestedRetry"],
} as const;
