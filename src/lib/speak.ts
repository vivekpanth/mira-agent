// Browser speechSynthesis fallback when the server TTS returns no audioUrl.
// Resolves when speech finishes so callers can toggle the avatar's `speaking` prop.

export function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;
      // Prefer a calm English voice if one is available.
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => /en-(GB|US)/i.test(v.lang) && /female|Samantha|Joanna|Karen/i.test(v.name));
      if (voice) utter.voice = voice;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    } catch {
      resolve();
    }
  });
}

/** Play a synthesized audio clip; resolves when finished. Falls back to TTS. */
export function playAudio(url: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(url);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void audio.play().catch(() => resolve());
    } catch {
      resolve();
    }
  });
}
