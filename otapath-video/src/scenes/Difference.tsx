import { Check } from "lucide-react";
import type React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, inOut, ramp } from "../anim";
import { Backdrop } from "../components/Backdrop";
import { Footage, type FootageName } from "../components/Footage";
import { KineticLine, Pop } from "../components/Kinetic";
import { Sfx } from "../components/Soundtrack";
import { C, FONT } from "../theme";

/** A fixed window onto one region of a real recording (zoomed, cropped, looping a short moment). */
const Crop = ({
  name,
  src,
  rate = 1,
  at,
  width,
  height,
  zoom,
  cx,
  cy,
  aspect = 16 / 9,
  radius = 26,
}: {
  readonly name: FootageName;
  readonly src: readonly [number, number];
  readonly rate?: number;
  readonly at: number;
  readonly width: number;
  readonly height: number;
  readonly zoom: number;
  readonly cx: number;
  readonly cy: number;
  readonly aspect?: number;
  readonly radius?: number;
}) => {
  const vw = width * zoom;
  const vh = vw / aspect;
  const left = Math.min(0, Math.max(width - vw, width / 2 - cx * vw));
  const top = Math.min(0, Math.max(height - vh, height / 2 - cy * vh));
  return (
    <div style={{ position: "relative", width, height, borderRadius: radius, overflow: "hidden", backgroundColor: C.ink }}>
      <div style={{ position: "absolute", left, top, width: vw, height: vh }}>
        <Footage name={name} cuts={[{ at, src, rate }]} />
      </div>
    </div>
  );
};

const Proof = ({
  at,
  out,
  title,
  note,
  children,
}: {
  readonly at: number;
  readonly out: number;
  readonly title: React.ReactNode;
  readonly note: string;
  readonly children: React.ReactNode;
}) => (
  <Pop at={at} out={out} distance={90} style={{ position: "absolute", left: 180, top: 56, width: 1560 }}>
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 44, borderBottom: "8px solid rgba(28,25,23,0.10)", padding: 30 }}>
      {children}
      <div style={{ padding: "24px 10px 6px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
        <div>
          <div style={{ fontFamily: FONT.sans, fontWeight: 800, fontSize: 26, letterSpacing: "0.16em", textTransform: "uppercase", color: C.tangerine }}>Different by design</div>
          <div style={{ marginTop: 6, fontFamily: FONT.display, fontWeight: 600, fontSize: 84, lineHeight: 1.04, letterSpacing: "-0.024em", color: C.ink }}>{title}</div>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 27, lineHeight: 1.3, color: "rgba(28,25,23,0.5)", textAlign: "right", maxWidth: 420, paddingBottom: 14 }}>{note}</div>
      </div>
    </div>
  </Pop>
);

const BUILT = [
  { at: 11.76, label: "A real app", sub: "installable patient PWA" },
  { at: 12.56, label: "A real backend", sub: "Next.js · Supabase · 16 API routes" },
  { at: 13.68, label: "A real closed loop", sub: "portal ⇄ phone, live" },
];

/** 95–110 s · what makes it different, and what actually exists today. */
export const Difference = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const a = inOut(t, 0, 3.75, 0.01, 0.3);
  const c = ramp(t, 9.95, 0.5, EASE.inOut);

  return (
    <AbsoluteFill>
      <Backdrop color={C.cream} drift={t / 15} />

      {/* A · it never asks — it notices */}
      {t < 3.85 ? (
        <AbsoluteFill style={{ opacity: a, alignItems: "center", justifyContent: "center", flexDirection: "column", paddingBottom: 90 }}>
          <KineticLine
            size={104}
            font={FONT.sans}
            weight={700}
            color="rgba(28,25,23,0.82)"
            align="center"
            words={[
              { text: "OtaPath", at: 0.5 },
              { text: "never", at: 1.0 },
              { text: "asks", at: 1.24 },
              { text: "how", at: 1.56 },
              { text: "you", at: 1.76 },
              { text: "feel.", at: 1.9 },
            ]}
          />
          <KineticLine
            size={330}
            color={C.tangerine}
            align="center"
            words={[
              { text: "It", at: 2.52, italic: true },
              { text: "notices.", at: 2.62, italic: true },
            ]}
            style={{ marginTop: 10 }}
          />
        </AbsoluteFill>
      ) : null}

      {/* B · two design choices, shown on the real portal */}
      {t > 3.5 && t < 10.2 ? (
        <AbsoluteFill>
          <Proof
            at={3.7}
            out={6.85}
            title={
              <>
                Compared to <em style={{ color: C.tangerine }}>your own</em> baseline.
              </>
            }
            note="The shaded band is this patient's own remission range"
          >
            <Crop name="clinic-before" at={3.6} src={[12.0, 15.2]} rate={0.5} width={1500} height={540} zoom={1.92} cx={0.405} cy={0.59} />
          </Proof>
          <Proof
            at={6.85}
            out={10.05}
            title={
              <>
                A loop that <em style={{ color: C.tangerine }}>learns</em> what lifts you.
              </>
            }
            note="Contextual bandit — shown on the seeded demo cohort"
          >
            <Crop name="clinic-before" at={6.75} src={[18.6, 20.5]} rate={0.5} width={1500} height={540} zoom={1.7} cx={0.45} cy={0.99} />
          </Proof>
        </AbsoluteFill>
      ) : null}

      {/* C · built in a single hackathon */}
      {t > 9.9 ? (
        <AbsoluteFill style={{ backgroundColor: C.ink, clipPath: `inset(${(1 - c) * 100}% 0 0 0)` }}>
          <Backdrop color={C.ink} bloomA="rgba(255,206,50,0.16)" bloomB="rgba(255,107,43,0.16)" grain="screen" />
          <div style={{ position: "absolute", left: 130, top: 96 }}>
            <KineticLine
              size={128}
              color={C.cream}
              words={[
                { text: "Built", at: 10.1 },
                { text: "in", at: 10.26 },
                { text: "a", at: 10.44 },
                { text: "single", at: 10.56, color: C.solar, italic: true },
                { text: "hackathon.", at: 10.8, color: C.solar, italic: true },
              ]}
            />
            <div style={{ marginTop: 14, fontFamily: FONT.sans, fontWeight: 600, fontSize: 36, color: "rgba(253,248,238,0.6)", opacity: ramp(t, 11.1, 0.5) }}>
              Hype Arena · Espoo, Finland
            </div>
          </div>
          <div style={{ position: "absolute", left: 130, top: 366, display: "flex", gap: 34 }}>
            {BUILT.map((b, i) => (
              <div key={b.label} style={{ width: 531 }}>
                <Pop at={b.at} distance={80}>
                  <div style={{ borderRadius: 36, backgroundColor: "rgba(253,248,238,0.07)", border: "2px solid rgba(253,248,238,0.12)", padding: 20 }}>
                    {i === 0 ? (
                      <Crop name="phone" at={b.at - 0.3} src={[22, 34]} rate={2.2} width={487} height={372} zoom={1} cx={0.5} cy={0.44} aspect={1032 / 2160} radius={22} />
                    ) : i === 1 ? (
                      <Crop name="clinic-before" at={b.at - 0.3} src={[0.6, 6]} rate={1.6} width={487} height={372} zoom={1.7} cx={0.36} cy={0.3} radius={22} />
                    ) : (
                      <div style={{ display: "flex", gap: 9 }}>
                        <Crop name="clinic" at={b.at - 0.3} src={[31.0, 35.3]} rate={1.3} width={270} height={372} zoom={2.5} cx={0.9} cy={0.12} radius={22} />
                        <Crop name="phone2" at={b.at - 0.3} src={[30.85, 35.15]} rate={1.3} width={208} height={372} zoom={1.2} cx={0.5} cy={0.62} aspect={1032 / 2160} radius={22} />
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 4px 4px" }}>
                      <div style={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: C.forest, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Check size={36} color={C.cream} strokeWidth={3.4} />
                      </div>
                      <div>
                        <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 47, lineHeight: 1.05, letterSpacing: "-0.02em", color: C.cream, whiteSpace: "nowrap" }}>{b.label}</div>
                        <div style={{ marginTop: 4, fontFamily: FONT.sans, fontWeight: 600, fontSize: 24, color: "rgba(253,248,238,0.6)", whiteSpace: "nowrap" }}>{b.sub}</div>
                      </div>
                    </div>
                  </div>
                </Pop>
              </div>
            ))}
          </div>
        </AbsoluteFill>
      ) : null}

      <Sfx
        cues={[
          { at: 2.55, name: "thud", volume: 0.5 },
          { at: 3.6, name: "swish", volume: 0.25 },
          { at: 6.7, name: "swish", volume: 0.25 },
          { at: 9.8, name: "whoosh-soft", volume: 0.35 },
          { at: 11.76, name: "pop", volume: 0.4 },
          { at: 12.56, name: "pop", volume: 0.4 },
          { at: 13.68, name: "pop", volume: 0.4 },
        ]}
      />
    </AbsoluteFill>
  );
};
