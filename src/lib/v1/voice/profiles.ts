import { ClientEmotion } from "@/lib/v1/types";

export type KokoroVoice =
  | "af_heart"
  | "af_bella"
  | "af_nicole"
  | "af_sarah"
  | "bf_emma"
  | "bf_isabella"
  | "am_michael"
  | "bm_george"
  | "bm_fable";

export type ClientVoiceProfile = {
  kokoro: KokoroVoice;
  piper: string;
  macosVoice: string;
  macosRate: number;
  browserLang: string;
  browserNames: string[];
};

export const clientVoiceProfiles: Record<string, ClientVoiceProfile> = {
  "group-assignment-support": {
    kokoro: "bf_emma",
    piper: "en_GB-semaine-medium",
    macosVoice: "Karen",
    macosRate: 180,
    browserLang: "en-AU",
    browserNames: ["Karen", "Catherine", "Tessa", "Samantha", "Moira"],
  },
  "breathing-support": {
    kokoro: "af_nicole",
    piper: "en_US-lessac-medium",
    macosVoice: "Serena",
    macosRate: 170,
    browserLang: "en-GB",
    browserNames: ["Serena", "Kate", "Samantha", "Karen"],
  },
  "software-outage": {
    kokoro: "bm_george",
    piper: "en_GB-northern_english_male-medium",
    macosVoice: "Daniel",
    macosRate: 195,
    browserLang: "en-AU",
    browserNames: ["Daniel", "Lee", "Tom", "Alex"],
  },
};

export const emotionSpeed: Record<ClientEmotion, { kokoro: number; macosMul: number; browserRate: number; browserPitch: number }> = {
  neutral: { kokoro: 0.96, macosMul: 1, browserRate: 0.95, browserPitch: 1 },
  anxious: { kokoro: 0.88, macosMul: 0.92, browserRate: 0.9, browserPitch: 1.06 },
  defensive: { kokoro: 0.84, macosMul: 0.88, browserRate: 0.86, browserPitch: 0.94 },
  relieved: { kokoro: 1.0, macosMul: 1.02, browserRate: 0.98, browserPitch: 1.02 },
};

export function getClientVoiceProfile(scenarioId: string): ClientVoiceProfile {
  return clientVoiceProfiles[scenarioId] ?? clientVoiceProfiles["group-assignment-support"];
}
