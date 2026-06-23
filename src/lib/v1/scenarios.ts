import type { ScenarioConfig } from "@/lib/v1/types";

export const scenarios: ScenarioConfig[] = [
  {
    id: "group-assignment-support",
    title: "Group assignment breakdown",
    rawPrompt: "A student asks for support after their group assignment has broken down. They are frustrated, embarrassed, and worried they will fail the unit.",
    setting: "student_support_office",
    client: { name: "Maya", role: "Distressed student", initialEmotion: "anxious", hiddenConcern: "Fear of failing and disappointing her family" },
    learningGoals: ["Build rapport without rushing", "Ask open, curious questions", "Avoid blame or assumptions", "Explain next steps clearly"],
    difficulty: "intermediate",
  },
  {
    id: "breathing-support",
    title: "Anxious patient",
    rawPrompt: "A patient reports worsening breathing symptoms and is worried their concerns will be dismissed again.",
    setting: "clinic",
    client: { name: "Sam", role: "Anxious patient", initialEmotion: "anxious", hiddenConcern: "Fear that nobody believes how serious the symptoms feel" },
    learningGoals: ["Acknowledge emotion", "Ask clear open questions", "Avoid premature reassurance", "Explain safe next steps"],
    difficulty: "intermediate",
  },
  {
    id: "software-outage",
    title: "Frustrated software client",
    rawPrompt: "A client is frustrated because a system failure is blocking their team from completing urgent work.",
    setting: "it_helpdesk",
    client: { name: "Jordan", role: "Operations manager", initialEmotion: "defensive", hiddenConcern: "Fear of losing credibility with their own team" },
    learningGoals: ["De-escalate frustration", "Clarify the impact", "Set realistic expectations", "Agree a next update"],
    difficulty: "advanced",
  },
];

export const defaultScenario = scenarios[0];

export const initialClientLine: Record<string, string> = {
  "group-assignment-support": "I’m not really sure where to start. My group has completely fallen apart and the assignment is due soon.",
  "breathing-support": "It has been getting harder to breathe, but last time I felt like nobody really listened.",
  "software-outage": "The system has been down all morning. My team can’t do their jobs and I need a real answer, not another ticket number.",
};

