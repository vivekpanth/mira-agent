import type { Turn } from "@/types";
import type { Archetype } from "@/lib/archetype";

/**
 * Canned transcript for the mock path. tMs offsets are realistic (~150 wpm) so
 * lib/metrics.ts produces non-trivial wpm / talk-ratio, and two student turns
 * start before the client has finished speaking → two detectable interruptions
 * (this is the quote the Report cites for the "you interrupted twice" moment).
 * Student turns also seed three fillers (um / like / you know).
 */
export const mockTurns: Turn[] = [
  {
    speaker: "client",
    text: "Oh, hello doctor. Sorry, I know you're busy — I probably shouldn't even be taking up your time.",
    tMs: 0,
    sentiment: -0.3,
  },
  {
    speaker: "student",
    text: "Not at all, Margaret, I'm really glad you came in. Take your time — what's been going on for you?",
    tMs: 7000,
    sentiment: 0.5,
  },
  {
    speaker: "client",
    text: "Well, it's just a bit of chest pain, comes and goes. It's probably nothing, honestly — just indigestion, I expect.",
    tMs: 16000,
    sentiment: -0.2,
  },
  {
    // starts at 21s, before the client turn above finishes (~24s) → interruption
    speaker: "student",
    text: "Sorry — um, when you say chest pain, can you tell me a bit more about what it actually feels like?",
    tMs: 21000,
    sentiment: 0.1,
  },
  {
    speaker: "client",
    text: "It's like a tightness, right here in the middle. Sometimes it spreads to my arm. But really, I don't want to waste anyone's time over nothing.",
    tMs: 30000,
    sentiment: -0.4,
  },
  {
    // starts at 38s, before the client turn above finishes (~42s) → interruption
    speaker: "student",
    text: "Right, like a tightness — you know, that's really helpful. Does anything in particular seem to bring it on?",
    tMs: 38000,
    sentiment: 0.2,
  },
  {
    speaker: "client",
    text: "Climbing the stairs, mostly. My father had heart trouble at about my age... but I'm sure I'm just being silly.",
    tMs: 47000,
    sentiment: -0.6,
  },
  {
    speaker: "student",
    text: "Thank you for telling me that — it isn't silly at all, and I can hear how worrying it's been. I'd like us to do an ECG and some bloods today so we can be sure together. Does that sound okay?",
    tMs: 60000,
    sentiment: 0.7,
  },
  {
    speaker: "client",
    text: "Yes... yes, I think I'd actually feel better knowing. Thank you, doctor.",
    tMs: 78000,
    sentiment: 0.5,
  },
];

/**
 * In-character client lines per archetype, used by mockConverse so that even
 * without the live LLM (e.g. offline), each scenario has its OWN dialogue that
 * starts in its emotion and softens as the student builds rapport. Lines
 * progress in order; the last is reused once exhausted.
 */
export const CONVERSATION_BY_ARCHETYPE: Record<Archetype, string[]> = {
  medical: mockTurns.filter((t) => t.speaker === "client").map((t) => t.text),
  pediatric: [
    "Look, I've been waiting nearly an hour. He's been coughing all night — he needs antibiotics, not another 'wait and see'.",
    "Viral? That's what they always say. My nephew had 'just a virus' and ended up in hospital.",
    "...Okay. So what am I actually meant to watch for? I just don't want to get this wrong.",
    "Alright. Thank you — honestly, that does make me feel a bit better about taking him home.",
  ],
  grief: [
    "I just... I don't understand how we got here so fast. He was fine at Christmas.",
    "If I agree to this — palliative care — am I giving up on him?",
    "I keep thinking I should have noticed something was wrong sooner.",
    "Thank you for sitting with me. I think... I think comfort is what he'd want.",
  ],
  "it-client": [
    "Do you understand that three hundred staff didn't get paid this morning? This is on your team.",
    "I don't want excuses, I want a timeline. When, exactly, is it fixed?",
    "...Fine. And how do I know this won't happen again next pay run?",
    "Okay. I appreciate you owning it. Let's lock in that follow-up and the prevention plan.",
  ],
  workplace: [
    "I figured this was what the meeting was about. Look, I know a couple of deadlines have slipped.",
    "It's not that I don't care about the work. There's just... a lot going on right now.",
    "My mum's been really unwell. I didn't want to bring it in as an excuse.",
    "Thanks for actually hearing me out. A lighter plan for the next sprint would genuinely help.",
  ],
  generic: [
    "I'm not really sure where to start, to be honest.",
    "It's a bit personal — I wasn't sure I'd even bring it up today.",
    "...okay. It helps that you're not making me feel judged about it.",
    "Thank you. I feel a bit lighter having actually said it out loud.",
  ],
};
