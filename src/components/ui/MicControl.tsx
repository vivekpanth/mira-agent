"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Live audio-level bars: connects an AnalyserNode to the mic stream if available. */
function WaveformBars({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) return;
    let ctx: AudioContext | undefined;
    let analyser: AnalyserNode | undefined;

    try {
      ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
    } catch {
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    function draw() {
      analyser!.getByteFrequencyData(data);
      const W = canvas!.width;
      const H = canvas!.height;
      c!.clearRect(0, 0, W, H);
      const barW = (W / data.length) * 1.8;
      let x = 0;
      data.forEach((v) => {
        const h = (v / 255) * H;
        c!.fillStyle = `rgba(15, 181, 174, ${0.5 + (v / 255) * 0.5})`;
        c!.fillRect(x, H - h, barW - 1, h);
        x += barW + 1;
      });
      rafRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ctx?.close().catch(() => {});
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={28}
      className="rounded opacity-90"
      aria-hidden
    />
  );
}

/**
 * Push-to-talk control with a live audio waveform when the mic is active.
 * Typed fallback always available.
 */
export function MicControl({
  supported,
  listening,
  interim,
  disabled,
  stream,
  onStart,
  onStop,
  onSubmitText,
  autoMode = false,
}: {
  supported: boolean;
  listening: boolean;
  interim: string;
  disabled: boolean;
  stream?: MediaStream | null;
  onStart: () => void;
  onStop: () => void;
  onSubmitText: (text: string) => void;
  autoMode?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function submitDraft() {
    const text = draft.trim();
    if (!text) return;
    onSubmitText(text);
    setDraft("");
  }

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-navy2/10">
      {supported && (
        <div className="mb-3 flex items-center gap-3">
          {/* Mic button with pulsing ring when active */}
          <div className="relative">
            {listening && (
              <span className="absolute inset-0 animate-ping rounded-lg bg-teal/30" />
            )}
            <Button
              type="button"
              onClick={listening ? onStop : onStart}
              disabled={disabled && !listening}
              className={
                listening
                  ? "relative bg-mood-angry text-white hover:opacity-90"
                  : "relative bg-teal text-white hover:bg-teal-dark"
              }
            >
              {listening ? "⏹ Tap to send" : autoMode ? "🎙 Mic (auto)" : "🎙 Push to talk"}
            </Button>
          </div>

          {/* Live waveform OR hint text */}
          {listening && stream ? (
            <WaveformBars stream={stream} />
          ) : (
            <p className="min-h-5 text-sm text-dim">
              {listening
                ? interim || "Speak now — mic stops when you pause."
                : autoMode
                  ? "Tap the mic to start — it reopens automatically after each reply."
                  : "Hold a thought and tap the mic."}
            </p>
          )}

          {/* Interim text when waveform is showing */}
          {listening && stream && interim && (
            <p className="text-sm italic text-navy/70">{interim}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitDraft();
          }}
          disabled={disabled}
          placeholder={supported ? "…or type your response" : "Type your response"}
          aria-label="Type your response"
          className="flex-1 rounded-xl border border-navy2/15 bg-paper px-3 py-2 text-sm text-navy outline-none focus:border-teal disabled:opacity-50"
        />
        <Button
          type="button"
          onClick={submitDraft}
          disabled={disabled || !draft.trim()}
          className="bg-navy text-white hover:bg-navy2"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
