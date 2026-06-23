"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ConverseResult, Mood, Report, Turn } from "@/types";
import { useSession } from "@/lib/useSession";
import { useAppearance } from "@/lib/useAppearance";
import { useCamera } from "@/lib/useCamera";
import { useEyeContact } from "@/lib/useEyeContact";
import { useDictation } from "@/lib/useDictation";
import { speakText } from "@/lib/speak";
import { playCapturable } from "@/lib/audioBus";
import { LiveTranscript } from "@/components/ui/LiveTranscript";
import { LiveCoach }     from "@/components/ui/LiveCoach";
import { Button } from "@/components/ui/button";
import { MicControl } from "@/components/ui/MicControl";

const AvatarStage = dynamic(
  () => import("@/components/three/AvatarStage").then((m) => m.AvatarStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#19102b]">
        <div className="shimmer h-24 w-24 rounded-full" />
      </div>
    ),
  },
);

export function RehearsalScreen() {
  const { persona, turns, addTurn, setReport, setRecordingUrl, goToStep } =
    useSession();
  const { lookKey, themeKey } = useAppearance();
  const { videoRef, streamRef, ready, startRecording, stopRecording } = useCamera();
  const { eyeContactPct } = useEyeContact(videoRef, true);
  const stageRef = useRef<HTMLDivElement>(null);
  // Latest caption to burn into the recording (read live by the compositor).
  const captionRef = useRef<{ name: string; text: string } | null>(null);

  const [mood, setMood] = useState<Mood>(persona?.avatarMood ?? "neutral");
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [moodToast, setMoodToast] = useState<string | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const startMicRef = useRef<() => void>(() => {});
  const flowRef = useRef({ thinking: false, speaking: false, ending: false, supported: false });

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { llm?: { model?: string } }) => setModelLabel(d.llm?.model ?? null))
      .catch(() => {});
  }, []);

  const scheduleAutoListen = useCallback(() => {
    window.setTimeout(() => {
      const s = flowRef.current;
      if (s.supported && !s.thinking && !s.speaking && !s.ending) {
        startMicRef.current();
      }
    }, 1000);
  }, []);

  // Session timer.
  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  // Start recording the 3D scene once the camera is live and the canvas exists.
  // (AvatarStage is dynamically imported, so the <canvas> mounts a beat later.)
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const tryStart = () => {
      const canvas = stageRef.current?.querySelector("canvas");
      if (canvas) startRecording(canvas, () => captionRef.current);
      else raf = requestAnimationFrame(tryStart);
    };
    raf = requestAnimationFrame(tryStart);
    return () => cancelAnimationFrame(raf);
  }, [ready, startRecording]);

  const handleStudentUtterance = useCallback(
    async (text: string) => {
      // Ignore stray transcripts that arrive after the session has ended.
      if (!text.trim() || thinking || speaking || flowRef.current.ending) return;
      const tMs = Date.now() - startedAt.current;
      const studentTurn: Turn = { speaker: "student", text, tMs };
      addTurn(studentTurn);

      setThinking(true);
      try {
        const res = await fetch("/api/converse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            turns: [...turns, studentTurn],
            studentText: text,
            persona,
          }),
        });
        const data: ConverseResult = await res.json();
        setThinking(false);

        addTurn({
          speaker: "client",
          text: data.replyText,
          tMs: Date.now() - startedAt.current,
        });
        if (data.mood !== mood) {
          const who =
            persona?.role.split("—")[1]?.split(",")[0]?.trim() ?? "The client";
          const TOAST: Record<Mood, string> = {
            neutral: `${who} seems more at ease`,
            anxious: `${who} is becoming more anxious`,
            angry:   `${who} is getting frustrated`,
            sad:     `${who} appears distressed`,
          };
          setMoodToast(TOAST[data.mood]);
          setTimeout(() => setMoodToast(null), 3200);
        }
        setMood(data.mood);

        // Speak the reply (synthesized neural voice if present, else browser TTS).
        setSpeaking(true);
        if (data.audioUrl) await playCapturable(data.audioUrl);
        else await speakText(data.replyText);
        setSpeaking(false);
        scheduleAutoListen();
      } catch {
        setThinking(false);
        setSpeaking(false);
      }
    },
    [addTurn, turns, thinking, speaking, mood, persona, scheduleAutoListen],
  );

  const { supported, listening, interim, start, stop } =
    useDictation(handleStudentUtterance);

  startMicRef.current = start;
  flowRef.current = { thinking, speaking, ending, supported };

  // The first turn is started by the user (tap the mic). After that, the mic
  // reopens automatically once the client finishes replying (scheduleAutoListen),
  // and stops for good once the session is ended.

  async function endSession() {
    if (ending) return;
    setEnding(true);
    // Stop the mic now and flag `ending` immediately so any pending auto-listen
    // (scheduled before render) does not reopen it. The session must go silent.
    flowRef.current = { ...flowRef.current, ending: true };
    stop();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    const recordingUrl = await stopRecording();
    if (recordingUrl) setRecordingUrl(recordingUrl);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ turns, eyeContactPct: eyeContactPct() }),
      });
      const report: Report = await res.json();
      setReport(report);
      goToStep(3);
    } catch {
      setEnding(false);
    }
  }

  // Hidden video element keeps the browser stream alive for MediaRecorder.
  // The actual self-view is rendered as a VideoTexture inside the 3D scene.
  const hiddenVideo = (
    <video ref={videoRef} autoPlay muted playsInline className="hidden" aria-hidden />
  );

  if (!persona) return <>{hiddenVideo}</>;


  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  // Caption text for the on-stage speech bubbles (CLAUDE.md §5: captions on).
  const lastTurn = turns[turns.length - 1];
  const clientName = persona.role.split("—")[1]?.split(",")[0]?.trim() ?? "Client";
  const clientCaption =
    [...turns].reverse().find((t) => t.speaker === "client")?.text ?? "";
  // Live interim while dictating, else the student's last submitted line.
  const studentCaption = listening
    ? interim
    : lastTurn?.speaker === "student"
      ? lastTurn.text
      : "";
  // Mirror the on-screen bubble into the recording compositor.
  captionRef.current = speaking
    ? clientCaption
      ? { name: clientName, text: clientCaption }
      : null
    : studentCaption
      ? { name: "You", text: studentCaption }
      : null;

  // Single active subtitle line for the on-stage caption bar (client while it
  // speaks, otherwise the student's interim / last line). Full text, no clamp.
  const activeCaption: { who: "client" | "student"; name: string; text: string } | null =
    speaking && clientCaption
      ? { who: "client", name: clientName, text: clientCaption }
      : studentCaption
        ? { who: "student", name: "You", text: studentCaption }
        : null;

  return (
    <>
    {hiddenVideo}
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-6 py-6 lg:grid-cols-[2fr_1fr]">
      {/* Left: 3D stage — sticky so avatar never drifts when transcript grows */}
      <section className="sticky top-0 flex flex-col gap-4 self-start">
        <div ref={stageRef} className="relative h-[60vh] overflow-hidden rounded-2xl bg-[#19102b] ring-1 ring-navy2/10">
          <AvatarStage
            persona={persona}
            mood={mood}
            speaking={speaking}
            videoStream={streamRef.current}
            lookKey={lookKey}
            themeKey={themeKey}
          />

          {/* Top-left: persona identity (truncated so long roles never sprawl) */}
          <div className="pointer-events-none absolute left-4 top-4 flex max-w-[60%] flex-col gap-1.5">
            <span
              className="truncate rounded-full bg-navy/80 px-3 py-1 text-xs font-medium text-white backdrop-blur"
              title={persona.role}
            >
              {persona.role}
            </span>
            {modelLabel && (
              <span
                className="w-fit max-w-full truncate rounded-full bg-black/35 px-2.5 py-0.5 text-[10px] font-medium text-white/70 backdrop-blur"
                title={`AI model: ${modelLabel}`}
              >
                AI · {modelLabel}
              </span>
            )}
          </div>

          {/* Top-right: session timer */}
          <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-navy/80 px-3 py-1 font-mono text-xs text-white backdrop-blur">
            ● {mm}:{ss}
          </div>

          {/* Top-center: live status chip (thinking / speaking / mood shift) */}
          {(thinking || moodToast || (listening && !speaking)) && (
            <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2">
              <span className="flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md ring-1 ring-white/10">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    thinking
                      ? "animate-pulse bg-orange"
                      : listening && !speaking
                        ? "animate-pulse bg-teal"
                        : "bg-teal"
                  }`}
                />
                {thinking
                  ? "Thinking…"
                  : moodToast
                    ? moodToast
                    : "Listening…"}
              </span>
            </div>
          )}

          {/* Bottom: dialogue subtitle bar — full text, no truncation */}
          {activeCaption && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-4">
              <div
                aria-live="polite"
                className={`reveal max-w-[34rem] rounded-xl px-4 py-2.5 shadow-lg ring-1 backdrop-blur-md ${
                  activeCaption.who === "client"
                    ? "bg-white/95 text-navy ring-teal/30"
                    : "bg-navy/90 text-white ring-white/15"
                }`}
              >
                <span
                  className={`mb-0.5 block text-[10px] font-semibold uppercase tracking-widest ${
                    activeCaption.who === "client" ? "text-teal-dark" : "text-teal/80"
                  }`}
                >
                  {activeCaption.name}
                </span>
                <p className="max-h-24 overflow-y-auto text-sm leading-snug">
                  {activeCaption.text}
                </p>
              </div>
            </div>
          )}
        </div>

        <MicControl
          supported={supported}
          listening={listening}
          interim={interim}
          disabled={thinking || speaking || ending}
          stream={streamRef.current}
          autoMode
          onStart={start}
          onStop={stop}
          onSubmitText={handleStudentUtterance}
        />
      </section>

      {/* Right: self-view + live coach + transcript + end */}
      <section className="flex flex-col gap-3 min-h-0 overflow-y-auto">
        {/* Live coaching signals */}
        <LiveCoach turns={turns} />

        <div className="min-h-0 flex-1">
          <LiveTranscript
            turns={turns}
            isThinking={thinking}
            clientName={persona.role.split("—")[1]?.trim() ?? "Client"}
          />
        </div>

        <div className="sticky bottom-0 pt-1 pb-1 bg-paper">
          <Button
            onClick={endSession}
            disabled={ending || turns.length === 0}
            className="w-full bg-orange text-white hover:opacity-90"
          >
            {ending ? "Scoring your session…" : "End session & get report"}
          </Button>
        </div>
      </section>
    </div>
    </>
  );
}
