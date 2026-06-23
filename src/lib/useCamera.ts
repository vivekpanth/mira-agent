"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { connectMic, getRecordingStream } from "@/lib/audioBus";

/** The caption to burn into the recording this frame (whoever is speaking). */
export type CaptionGetter = () => { name: string; text: string } | null;

/**
 * Camera self-view + guarded session recording (MediaRecorder). Everything is
 * wrapped in try/catch so a denied permission never breaks the rehearsal flow
 * (CLAUDE.md §4 — keep capture minimal and guarded).
 *
 * The recording is a COMPOSITE: each frame we draw the 3D scene canvas plus a
 * burned-in subtitle onto a 2D canvas, and record that + the mixed audio (mic +
 * client TTS) from the audio bus — so the download has the scene, the captions,
 * and both voices.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // Recording starts later via startRecording(canvas) — we record the 3D
        // SCENE (avatar + room + the student's in-scene monitor), not the raw
        // webcam, so the downloaded video shows the whole rehearsal.
        setReady(true);
      } catch {
        setError("Camera unavailable — rehearsing without self-view.");
      }
    }
    void init();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /**
   * Begin recording: a compositor canvas (3D scene + burned-in caption) plus the
   * mixed audio bus (mic + client TTS). Idempotent and best-effort — a missing
   * canvas, unsupported codec, or audio failure never throws into the UI.
   */
  const startRecording = useCallback(
    (sceneCanvas: HTMLCanvasElement | null, getCaption?: CaptionGetter) => {
      if (recorderRef.current || !sceneCanvas) return;
      try {
        const out = document.createElement("canvas");
        out.width = sceneCanvas.width || 1280;
        out.height = sceneCanvas.height || 720;
        const ctx = out.getContext("2d");
        if (!ctx) return;

        // Compositor loop: copy the live scene, then draw the active subtitle.
        const drawFrame = () => {
          try {
            ctx.drawImage(sceneCanvas, 0, 0, out.width, out.height);
            drawSubtitle(ctx, out.width, out.height, getCaption?.() ?? null);
          } catch {
            /* a transient draw error must not kill the loop */
          }
          rafRef.current = requestAnimationFrame(drawFrame);
        };
        rafRef.current = requestAnimationFrame(drawFrame);

        const composite = out.captureStream(30);
        // Mix in mic + client TTS from the shared audio bus.
        if (streamRef.current) connectMic(streamRef.current);
        getRecordingStream()
          ?.getAudioTracks()
          .forEach((t) => composite.addTrack(t));

        const rec = new MediaRecorder(composite);
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start();
        recorderRef.current = rec;
      } catch {
        /* recording unsupported — non-fatal */
      }
    },
    [],
  );

  /** Stops recording and resolves with an object URL for the recording, if any. */
  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === "inactive") {
        resolve(null);
        return;
      }
      rec.onstop = () => {
        cancelAnimationFrame(rafRef.current);
        if (chunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        resolve(URL.createObjectURL(blob));
      };
      rec.stop();
    });
  }, []);

  return { videoRef, streamRef, ready, error, startRecording, stopRecording };
}

/** Burn a subtitle (speaker name + wrapped text) into the bottom of the frame. */
function drawSubtitle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  caption: { name: string; text: string } | null,
) {
  if (!caption?.text) return;

  const fontSize = Math.max(16, Math.round(h * 0.038));
  const pad = Math.round(fontSize * 0.7);
  const maxTextW = w * 0.86;
  ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "top";

  // Word-wrap the caption to the available width.
  const words = caption.text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxTextW && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);

  const lineH = Math.round(fontSize * 1.3);
  const nameH = Math.round(fontSize * 0.9);
  const blockH = nameH + lines.length * lineH + pad * 2;
  const blockW = Math.min(maxTextW + pad * 2, w * 0.92);
  const x = (w - blockW) / 2;
  const y = h - blockH - Math.round(h * 0.04);

  // Rounded translucent backdrop.
  ctx.fillStyle = "rgba(20, 14, 38, 0.72)";
  roundRect(ctx, x, y, blockW, blockH, Math.round(fontSize * 0.4));
  ctx.fill();

  // Speaker name (teal).
  ctx.fillStyle = "#5eead4";
  ctx.font = `600 ${nameH}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(caption.name.toUpperCase(), x + pad, y + pad);

  // Caption lines (white).
  ctx.fillStyle = "#ffffff";
  ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  lines.forEach((l, i) => {
    ctx.fillText(l, x + pad, y + pad + nameH + i * lineH);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
