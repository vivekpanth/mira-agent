"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

/**
 * Samples the student's self-view every few seconds, posts each frame to
 * /api/vision (Rekognition), and aggregates a 0..100 eye-contact percentage.
 * All best-effort: a failed sample is skipped, never throws into the UI.
 *
 * Cadence is NEXT_PUBLIC_VISION_SAMPLE_MS (default 3500ms) — Rekognition free
 * tier is 5,000 images/mo, so ~every 3.5s is a rounding error for a demo.
 */
export function useEyeContact(
  videoRef: RefObject<HTMLVideoElement | null>,
  active: boolean,
) {
  const onTarget = useRef(0);
  const total = useRef(0);

  useEffect(() => {
    if (!active) return;
    const interval =
      Number(process.env.NEXT_PUBLIC_VISION_SAMPLE_MS) || 2500;
    const canvas = document.createElement("canvas");
    let stopped = false;

    async function sample() {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;
      // Keep the frame big enough for reliable Rekognition face detection
      // (480px wide) but small enough that the upload stays tiny.
      const W = 480;
      canvas.width = W;
      canvas.height = Math.round((W * video.videoHeight) / video.videoWidth) || 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.6);
      try {
        const res = await fetch("/api/vision", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image }),
        });
        if (!res.ok) return;
        const { onTarget: ok } = (await res.json()) as { onTarget: boolean };
        total.current += 1;
        if (ok) onTarget.current += 1;
      } catch {
        /* skip this sample */
      }
    }

    // First sample shortly after the camera warms up, then on a steady cadence.
    const warmup = setTimeout(() => {
      if (!stopped) void sample();
    }, 1500);
    const id = setInterval(() => {
      if (!stopped) void sample();
    }, interval);
    return () => {
      stopped = true;
      clearTimeout(warmup);
      clearInterval(id);
    };
  }, [videoRef, active]);

  /** Current aggregate, 0..100. Read at end-of-session to attach to the report. */
  const eyeContactPct = useCallback(
    () => (total.current > 0 ? Math.round((onTarget.current / total.current) * 100) : 0),
    [],
  );

  return { eyeContactPct };
}
