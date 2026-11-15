"use client";

/**
 * VoiceBlob — OtaPath's voice recorder.
 * A playful morphing organic blob that reacts to microphone volume —
 * no sterile equalizer bars. Tap to speak; it turns tangerine, squishes,
 * and opens its little mouth wider as you get louder.
 * Falls back to a simulated "voice" if the mic is unavailable.
 */

import { useEffect, useRef, useState } from "react";

const C = {
  cream: "var(--cream)",
  solar: "var(--solar)",
  tangerine: "var(--tangerine)",
  charcoal: "var(--charcoal)",
} as const;

type Mode = "idle" | "live" | "sim";

/** Catmull-Rom spline → closed cubic-bezier path */
function blobPath(pts: { x: number; y: number }[]) {
  const n = pts.length;
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(2)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(2)}, ${(p2.x - (p3.x - p1.x) / 6).toFixed(2)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d + " Z";
}

const N = 10;
const CX = 100;
const CY = 100;
const R = 56;

export function VoiceBlob({
  size = 220,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const pathRef = useRef<SVGPathElement>(null);
  const mouthRef = useRef<SVGEllipseElement>(null);
  const faceRef = useRef<SVGGElement>(null);
  const volRef = useRef(0);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const recording = mode !== "idle";

  function frame() {
    tRef.current += 0.016;
    const t = tRef.current;

    // --- target volume ---
    let target = 0;
    if (mode === "live" && analyserRef.current && dataRef.current) {
      analyserRef.current.getByteTimeDomainData(dataRef.current);
      let sum = 0;
      for (let i = 0; i < dataRef.current.length; i++) {
        const v = (dataRef.current[i] - 128) / 128;
        sum += v * v;
      }
      target = Math.min(1, Math.sqrt(sum / dataRef.current.length) * 3.6);
    } else if (mode === "sim") {
      target =
        0.3 +
        0.22 * Math.sin(t * 2.3) +
        0.13 * Math.sin(t * 5.1 + 1.3) +
        0.08 * Math.sin(t * 11.7);
      target = Math.max(0.08, Math.min(0.8, target));
    }
    // smooth-lerp so the blob breathes instead of jittering
    volRef.current += (target - volRef.current) * 0.18;
    const vol = volRef.current;

    // --- morph the blob ---
    const pts = Array.from({ length: N }, (_, i) => {
      const a = (Math.PI * 2 * i) / N;
      const wobble =
        0.05 * Math.sin(t * 1.6 + i * 2.1) +
        vol * (0.22 * Math.sin(t * 4.2 + i * 2.9) + 0.12);
      const r = R * (1 + wobble);
      return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
    });
    pathRef.current?.setAttribute("d", blobPath(pts));

    // --- face reacts ---
    mouthRef.current?.setAttribute("ry", (5 + vol * 13).toFixed(2));
    faceRef.current?.setAttribute(
      "transform",
      `translate(${CX} ${CY + 5}) scale(${1 + vol * 0.12}) translate(${-CX} ${-(CY + 5)})`
    );

    rafRef.current = requestAnimationFrame(frame);
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream;
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      setMode("live");
    } catch {
      setMode("sim");
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    ctxRef.current?.close();
    streamRef.current = null;
    ctxRef.current = null;
    analyserRef.current = null;
    setMode("idle");
  }

  useEffect(() => {
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      ctxRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const fill = recording ? C.tangerine : C.solar;
  const cheek = recording ? C.solar : C.tangerine;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <button
        type="button"
        aria-pressed={recording}
        aria-label={recording ? "Stop recording" : "Start recording"}
        onClick={() => (recording ? stop() : start())}
        className="group rounded-full transition-transform duration-150 active:scale-95"
      >
        <svg viewBox="0 0 200 200" width={size} height={size} role="img">
          <path
            ref={pathRef}
            d={blobPath(
              Array.from({ length: N }, (_, i) => {
                const a = (Math.PI * 2 * i) / N;
                return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
              })
            )}
            fill={fill}
            style={{ transition: "fill 400ms ease" }}
          />
          <g ref={faceRef}>
            <ellipse cx="70" cy="108" rx="8" ry="5" fill={cheek} opacity="0.55" />
            <ellipse cx="130" cy="108" rx="8" ry="5" fill={cheek} opacity="0.55" />
            <circle cx="84" cy="92" r="5.5" fill={C.charcoal} />
            <circle cx="116" cy="92" r="5.5" fill={C.charcoal} />
            <ellipse
              ref={mouthRef}
              cx="100"
              cy="116"
              rx="8"
              ry="5"
              fill={C.charcoal}
            />
          </g>
        </svg>
      </button>
      <p className="font-sans text-sm font-bold tracking-tight text-ink-charcoal/70">
        {mode === "idle" && "Tap — say it out loud"}
        {mode === "live" && "Listening… tap to tuck this memory away"}
        {mode === "sim" && "Mic unavailable — simulating your lovely voice"}
      </p>
    </div>
  );
}
