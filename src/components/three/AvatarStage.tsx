"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sparkles } from "@react-three/drei";
import { VideoTexture, SRGBColorSpace, RepeatWrapping } from "three";
import type { Mood, Persona } from "@/types";
import {
  AVATAR_LOOKS,
  ROOM_THEMES,
  lookFor,
  themeFor,
  type Archetype,
} from "@/lib/archetype";
import { Avatar } from "./Avatar";
import { Room } from "./Room";

// ── Student camera screen ─────────────────────────────────────────────────────
// Renders the student's webcam as a VideoTexture on a desk monitor inside the
// scene, so the patient and the student appear together in the same room.
function StudentScreen({ stream }: { stream: MediaStream | null }) {
  const [tex, setTex] = useState<VideoTexture | null>(null);

  useEffect(() => {
    if (!stream) return;
    const vid = document.createElement("video");
    vid.srcObject = stream;
    vid.muted = true;
    vid.autoplay = true;
    vid.playsInline = true;

    // Keep the play() promise so cleanup can await it before pausing,
    // avoiding "play() interrupted by pause()" AbortError on fast unmount.
    const playPromise = vid.play().catch(() => {});

    const texture = new VideoTexture(vid);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;       // mirror horizontally
    texture.repeat.set(-1, 1);
    texture.offset.set(1, 0);
    setTex(texture);

    return () => {
      void Promise.resolve(playPromise).then(() => {
        vid.pause();
        vid.srcObject = null;
      });
      texture.dispose();
    };
  }, [stream]);

  if (!tex) return null;

  // Origin at floor; desk + monitor build upward so the screen sits on the table.
  const DESK = "#9c7349";
  const DESK_DK = "#7e5a36";
  const FRAME = "#2a2f38";

  return (
    <group>
      {/* ── Desk the monitor rests on ──────────────────────────────── */}
      <mesh position={[0, 0.73, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.05, 0.74]} />
        <meshStandardMaterial color={DESK} roughness={0.5} metalness={0.1} />
      </mesh>
      {/* front modesty panel */}
      <mesh position={[0, 0.4, 0.34]} castShadow>
        <boxGeometry args={[1.4, 0.66, 0.04]} />
        <meshStandardMaterial color={DESK_DK} roughness={0.6} />
      </mesh>
      {/* legs */}
      {([[-0.63, -0.3], [0.63, -0.3], [-0.63, 0.3], [0.63, 0.3]] as [number, number][]).map(
        ([x, z], i) => (
          <mesh key={i} position={[x, 0.36, z]} castShadow>
            <boxGeometry args={[0.05, 0.72, 0.05]} />
            <meshStandardMaterial color={DESK_DK} roughness={0.7} />
          </mesh>
        ),
      )}

      {/* ── Monitor (sits on the desk) ─────────────────────────────── */}
      {/* base */}
      <mesh position={[0, 0.775, -0.05]} castShadow>
        <boxGeometry args={[0.4, 0.022, 0.22]} />
        <meshStandardMaterial color={FRAME} roughness={0.8} />
      </mesh>
      {/* neck */}
      <mesh position={[0, 0.87, -0.05]}>
        <boxGeometry args={[0.08, 0.2, 0.05]} />
        <meshStandardMaterial color={FRAME} roughness={0.8} />
      </mesh>
      {/* bezel */}
      <mesh position={[0, 1.34, -0.02]} castShadow>
        <boxGeometry args={[1.18, 0.84, 0.03]} />
        <meshStandardMaterial color={FRAME} roughness={0.55} metalness={0.3} />
      </mesh>
      {/* live video display */}
      <mesh position={[0, 1.35, 0.0]}>
        <planeGeometry args={[1.08, 0.74]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* "YOU" tab */}
      <mesh position={[-0.4, 1.04, 0.012]}>
        <planeGeometry args={[0.24, 0.08]} />
        <meshBasicMaterial color="#0fb5ae" toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Frozen contract (CLAUDE.md §4): <AvatarStage persona mood speaking />.
 * `assembling` shows a particle-build while the API processes.
 * `wide` pulls the camera back for full-height panels (screen 1).
 * `videoStream` puts the student's webcam on a monitor facing the patient.
 */
export function AvatarStage({
  persona,
  mood,
  speaking,
  assembling = false,
  wide = false,
  videoStream,
  lookKey = null,
  themeKey = null,
}: {
  persona: Persona | null;
  mood: Mood;
  speaking: boolean;
  assembling?: boolean;
  wide?: boolean;
  videoStream?: MediaStream | null;
  // Student overrides; null = auto-derive from the persona's archetype.
  lookKey?: Archetype | null;
  themeKey?: Archetype | null;
}) {
  const hasStudent = videoStream != null;

  // Scenario drives the look + environment by default; a student override wins.
  const look = lookKey ? AVATAR_LOOKS[lookKey] : lookFor(persona);
  const theme = themeKey ? ROOM_THEMES[themeKey] : themeFor(persona);

  // Face-to-face layout when the student is present; centred portrait otherwise.
  const camera = hasStudent
    ? { position: [0, 1.55, 5.2] as [number, number, number], fov: 50 }
    : wide
      ? { position: [0, 1.25, 4.6] as [number, number, number], fov: 52 }
      : { position: [0, 1.35, 3.4] as [number, number, number], fov: 46 };

  const target = hasStudent
    ? ([0.1, 1.25, 0] as [number, number, number])
    : ([0, 1.0, 0] as [number, number, number]);

  return (
    <Canvas
      dpr={[1, 2]}
      shadows
      camera={camera}
      className="rounded-2xl"
      // preserveDrawingBuffer lets the recorder copy WebGL frames into the
      // caption compositor (drawImage of a live GL canvas is blank otherwise).
      gl={{ preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => e.preventDefault(),
          false,
        );
      }}
    >
      <color attach="background" args={[theme.bg]} />
      <fog attach="fog" args={[theme.bg, 9, 22]} />

      <Room mood={mood} theme={theme} />

      {assembling ? (
        <group position={[0, 0.9, 0]}>
          <Sparkles count={50} scale={[2, 2.6, 2]} size={5} speed={3} noise={4} color="#0fb5ae" />
          <Sparkles count={18} scale={[1, 1.4, 1]} size={8} speed={5} noise={6} color="#ff9900" />
        </group>
      ) : persona ? (
        hasStudent ? (
          // Rehearsal: patient on the left, turned to face the student screen
          <group position={[-0.62, 0, 0.1]} rotation={[0, 0.5, 0]}>
            <Avatar mood={mood} speaking={speaking} look={look} />
          </group>
        ) : (
          // Scenario preview: patient centred, facing the viewer
          <Avatar mood={mood} speaking={speaking} look={look} />
        )
      ) : (
        <group position={[0, 0.9, 0]}>
          <Sparkles count={18} scale={2} size={3} speed={0.6} color="#0fb5ae" />
        </group>
      )}

      {/* Student desk + screen — on the right, turned to face the patient */}
      {hasStudent && (
        <group position={[1.05, 0, 0.35]} rotation={[0, -0.52, 0]}>
          <StudentScreen stream={videoStream} />
        </group>
      )}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2.8}
        maxPolarAngle={Math.PI / 1.9}
        target={target}
      />
    </Canvas>
  );
}
