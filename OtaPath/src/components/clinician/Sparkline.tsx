"use client";

/**
 * Sparkline — longitudinal trend chart for the clinician board.
 * Fills its card: padded data domain, min/mid/max axis labels,
 * hairline grid, 1.5px line, dashed baseline, emerald remission
 * band, optional dashed second series, hover crosshair + readout.
 * X labels are real dates rendered at exact tick positions.
 */

import { useRef, useState } from "react";

interface SparklineProps {
  values: number[];
  labels: string[];
  color: string; // css color
  unit?: string;
  /** optional second series — dashed, same scale */
  secondary?: { values: number[]; color: string; label?: string };
  /** discharge-day reference line */
  baseline?: number;
  /** svg height in viewBox units */
  height?: number;
}

export function Sparkline({ values, labels, color, unit = "", secondary, baseline, height = 150 }: SparklineProps) {
  const W = 300;
  const H = height;
  const P = 10; // top/bottom padding inside plot
  const LX = 34; // left axis gutter
  const BY = 16; // bottom gutter for x labels
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (values.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-[#E6E6E3] bg-[#FAFAF9] font-sans text-[11px] font-medium text-zinc-400 md:h-40">
        awaiting the first signals from the app
      </div>
    );
  }

  const all = [
    ...values,
    ...(secondary?.values ?? []),
    ...(baseline != null ? [baseline] : []),
  ];
  let min = Math.min(...all);
  let max = Math.max(...all);
  // pad the domain 10% so lines never clip the card edges
  const pad = Math.max(4, (max - min) * 0.1);
  min -= pad;
  max += pad;
  const span = Math.max(1, max - min);

  const plotH = H - P - BY;
  const xOf = (i: number) => LX + (i * (W - LX - P)) / Math.max(1, values.length - 1);
  const yOf = (v: number) => P + plotH - ((v - min) / span) * plotH;
  const toPx = (arr: number[]) => arr.map((v, i) => `${xOf(i)},${yOf(v).toFixed(1)}`);

  const px = toPx(values);
  const d = `M${px.join(" L")}`;
  const d2 = secondary ? `M${toPx(secondary.values).join(" L")}` : "";
  const last = px[px.length - 1]?.split(",").map(Number) ?? [0, 0];
  const baseY = baseline != null ? yOf(baseline) : null;
  const band =
    baseline != null
      ? { top: yOf(baseline * 1.12), bot: yOf(baseline * 0.88) }
      : null;
  const mid = (min + max) / 2;
  const tick = (v: number) => `${Math.round(v)}`;
  // every 2nd label for long ranges so ticks never collide
  const labelStep = values.length > 8 ? 2 : 1;

  function onMove(e: React.MouseEvent) {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(Math.round(frac * (values.length - 1)));
  }

  return (
    <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }} aria-hidden>
        {/* hairline grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={LX}
            x2={W - P}
            y1={P + f * plotH}
            y2={P + f * plotH}
            stroke="#E6E6E3"
            strokeWidth={0.75}
          />
        ))}
        {/* remission band */}
        {band && (
          <rect
            x={LX}
            y={Math.min(band.top, band.bot)}
            width={W - LX - P}
            height={Math.abs(band.bot - band.top)}
            rx={4}
            fill="#10B981"
            opacity={0.07}
          />
        )}
        {/* baseline */}
        {baseY != null && (
          <line x1={LX} x2={W - P} y1={baseY} y2={baseY} stroke="#D4D4D8" strokeWidth={1} strokeDasharray="3 4" />
        )}
        {secondary && (
          <path d={d2} fill="none" stroke={secondary.color} strokeWidth={1.5} strokeDasharray="4 3" strokeLinecap="round" opacity={0.55} />
        )}
        <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r={3} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
        {/* hover crosshair */}
        {hover != null && (
          <>
            <line x1={xOf(hover)} x2={xOf(hover)} y1={P} y2={P + plotH} stroke="#A1A1AA" strokeOpacity={0.4} strokeWidth={1} />
            <circle cx={xOf(hover)} cy={yOf(values[hover])} r={3} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
          </>
        )}
        {/* y-axis scale — min / mid / max, honestly spaced */}
        {[max, mid, min].map((v, i) => (
          <text
            key={i}
            x={LX - 5}
            y={yOf(v) + 3}
            textAnchor="end"
            fontSize={9}
            fill="#A1A1AA"
            fontFamily="inherit"
          >
            {tick(v)}
            {unit}
          </text>
        ))}
        {/* x-axis dates — one per real tick, evenly spread */}
        {values.map((_, i) =>
          i % labelStep === (values.length - 1) % labelStep ? (
            <text
              key={i}
              x={xOf(i)}
              y={H - 4}
              textAnchor={i === 0 ? "start" : i === values.length - 1 ? "end" : "middle"}
              fontSize={9}
              fill="#A1A1AA"
              fontFamily="inherit"
            >
              {labels[i]}
            </text>
          ) : null
        )}
      </svg>

      {/* hover readout */}
      {hover != null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 rounded-md border border-[#E6E6E3] bg-white px-2 py-0.5 font-sans text-[10px] font-semibold tabular-nums text-zinc-700 shadow-sm"
          style={{ left: `clamp(${LX}px, ${(xOf(hover) / W) * 100}%, 78%)` }}
        >
          {labels[hover]} · {values[hover]}
          {unit}
          {secondary && ` · ${secondary.values[hover]}${secondary.label ?? ""}`}
        </div>
      )}
    </div>
  );
}
