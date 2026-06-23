"use client";

/**
 * Shared Web Audio graph so the SESSION RECORDING captures both sides of the
 * conversation. canvas.captureStream() carries no audio, and a bare `new Audio()`
 * isn't routable into a MediaStream — so the client's synthesized voice never made it
 * into the download. Here we fan every sound through one AudioContext:
 *
 *   mic ─────────────┐
 *                     ├──> MediaStreamDestination  (added to the MediaRecorder)
 *   client TTS audio ─┤
 *                     └──> ctx.destination          (the speakers — TTS only)
 *
 * Mic is NOT sent to the speakers (that would echo the student back at themselves).
 * All best-effort: any failure falls back to plain playback so audio never breaks.
 */

let ctx: AudioContext | null = null;
let dest: MediaStreamAudioDestinationNode | null = null;
let micConnected = false;

function ensure(): { ctx: AudioContext; dest: MediaStreamAudioDestinationNode } {
  if (!ctx || !dest) {
    ctx = new AudioContext();
    dest = ctx.createMediaStreamDestination();
  }
  return { ctx, dest };
}

/** Route the student's mic into the recording mix (once). */
export function connectMic(stream: MediaStream): void {
  try {
    const { ctx, dest } = ensure();
    void ctx.resume(); // context may start suspended; mic must flow into the mix now
    if (micConnected) return;
    ctx.createMediaStreamSource(stream).connect(dest); // recording only, no speakers
    micConnected = true;
  } catch {
    /* non-fatal */
  }
}

/** The combined mic + TTS audio track, for adding to the MediaRecorder. */
export function getRecordingStream(): MediaStream | null {
  return dest ? dest.stream : null;
}

/**
 * Play a synthesized voice clip routed through the bus so it lands in the recording AND the
 * speakers. Resolves when playback finishes. Falls back to uncaptured playback.
 */
export function playCapturable(url: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const { ctx, dest } = ensure();
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      const src = ctx.createMediaElementSource(audio);
      src.connect(ctx.destination); // student hears it
      src.connect(dest); // recording captures it
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void ctx
        .resume()
        .then(() => audio.play())
        .catch(() => resolve());
    } catch {
      // Last resort: play without capture so the demo still has sound.
      try {
        const audio = new Audio(url);
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
      } catch {
        resolve();
      }
    }
  });
}
