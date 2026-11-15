import type React from "react";
import { C } from "../theme";

const SCREEN_W = 430;
const SCREEN_H = 900;

/**
 * The patient's phone. `scale`, `cx`, `cy` act as a camera: the point (cx, cy)
 * of the screen (0–1) is pinned to (anchorX, anchorY) on the canvas, so raising
 * `scale` pushes in on that part of the real UI. Sizes are laid out in real
 * pixels (not CSS-scaled) so the 1032×2160 recording stays sharp when zoomed.
 */
export const PhoneStage = ({
  scale = 1,
  cx = 0.5,
  cy = 0.5,
  anchorX,
  anchorY,
  opacity = 1,
  children,
}: {
  readonly scale?: number;
  readonly cx?: number;
  readonly cy?: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly opacity?: number;
  readonly children: React.ReactNode;
}) => {
  const k = 0.96 * scale;
  const w = SCREEN_W * k;
  const h = SCREEN_H * k;
  const bezel = 13 * k;
  const left = anchorX - cx * w;
  const top = anchorY - cy * h;
  return (
    <div
      style={{
        position: "absolute",
        left: left - bezel,
        top: top - bezel,
        width: w + bezel * 2,
        height: h + bezel * 2,
        borderRadius: 46 * k,
        backgroundColor: C.ink,
        boxShadow: `0 ${40 * k}px ${90 * k}px ${-30 * k}px rgba(28,25,23,0.55), 0 0 0 ${1.5 * k}px rgba(255,255,255,0.08) inset`,
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: bezel,
          top: bezel,
          width: w,
          height: h,
          borderRadius: 34 * k,
          overflow: "hidden",
          backgroundColor: C.cream,
        }}
      >
        {children}
      </div>
    </div>
  );
};
