import { Camera, Footprints, HeartHandshake, Mic } from "lucide-react";
import { AbsoluteFill, CanvasImage, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, inOut, ramp, track } from "../anim";
import { Backdrop } from "../components/Backdrop";
import { BrowserStage } from "../components/BrowserStage";
import { Footage } from "../components/Footage";
import { KineticLine, Pop } from "../components/Kinetic";
import { OtaDog } from "../components/OtaDog";
import { Sfx } from "../components/Soundtrack";
import { C, FONT } from "../theme";

const NOS = [
  { word: "questionnaires", at: 4.95 },
  { word: "streaks", at: 6.19 },
  { word: "guilt", at: 6.93 },
];

const SIGNALS = [
  { icon: Mic, label: "Voice", at: 9.86, bg: C.tangerine },
  { icon: Camera, label: "Photos", at: 10.44, bg: C.cobalt },
  { icon: Footprints, label: "Movement", at: 11.06, bg: C.forest },
];

/** 12–25 s · meet OtaPath: brand reveal → what it refuses to be → first look at the real product. */
export const Solution = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const logo = ramp(t, 0.1, 0.7, EASE.back);
  const brandOut = ramp(t, 4.55, 0.35, EASE.in);
  const nos = inOut(t, 4.7, 7.55, 0.35, 0.3);
  const ui = ramp(t, 7.45, 0.7, EASE.out);
  const dogX = track(t, [[0.2, -320], [4.9, 2050]], (x) => x);

  return (
    <AbsoluteFill>
      <Backdrop color={C.cream} drift={t / 13} />

      {/* A · brand reveal */}
      {t < 5 ? (
        <AbsoluteFill style={{ opacity: 1 - brandOut, translate: `0px ${-brandOut * 50}px` }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 170, display: "flex", justifyContent: "center", alignItems: "center", gap: 44 }}>
            <CanvasImage
              src={staticFile("logo.png")}
              style={{ width: 216, height: 216, borderRadius: 52, scale: String(logo), rotate: `${(1 - logo) * -18}deg`, boxShadow: "0 30px 60px -24px rgba(198,79,0,0.5)" }}
            />
            <KineticLine size={236} weight={700} words={[{ text: "OtaPath", at: 0.39 }]} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 462 }}>
            <KineticLine
              size={70}
              font={FONT.sans}
              weight={600}
              color="rgba(28,25,23,0.78)"
              align="center"
              lineHeight={1.22}
              words={[
                { text: "A", at: 1.45 },
                { text: "warm", at: 1.57, color: C.tangerine },
                { text: "walking", at: 1.81, color: C.tangerine },
                { text: "companion", at: 2.15, color: C.tangerine },
                { text: "for", at: 2.65, br: true },
                { text: "the", at: 3.05 },
                { text: "fragile", at: 3.15 },
                { text: "weeks", at: 3.53 },
                { text: "after", at: 3.85 },
                { text: "treatment.", at: 4.23 },
              ]}
            />
          </div>
          {/* the companion trots through, leaving the app's dotted trail */}
          <div style={{ position: "absolute", left: 0, top: 902, width: Math.max(0, dogX + 60), height: 0, borderTop: `9px dotted ${C.tangerine}`, opacity: 0.55 }} />
          <OtaDog size={250} flip style={{ position: "absolute", left: dogX, top: 706 }} />
        </AbsoluteFill>
      ) : null}

      {/* B · what it refuses to be */}
      {t > 4.6 && t < 7.7 ? (
        <AbsoluteFill style={{ backgroundColor: C.butter, opacity: nos, justifyContent: "center", paddingLeft: 260, paddingBottom: 70, gap: 14 }}>
          {NOS.map((n) => {
            const p = ramp(t, n.at, 0.45, EASE.out);
            const strike = ramp(t, n.at + 0.32, 0.3, EASE.inOut);
            return (
              <div key={n.word} style={{ display: "flex", alignItems: "center", gap: 40, opacity: Math.min(1, p * 2), translate: `${(1 - p) * -90}px 0px` }}>
                <div
                  style={{
                    width: 150,
                    height: 150,
                    borderRadius: "50%",
                    backgroundColor: C.tangerine,
                    color: C.cream,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: FONT.sans,
                    fontWeight: 800,
                    fontSize: 64,
                    letterSpacing: "0.02em",
                    scale: String(0.6 + 0.4 * p),
                    borderBottom: "8px solid rgba(28,25,23,0.16)",
                  }}
                >
                  NO
                </div>
                <div style={{ position: "relative", fontFamily: FONT.display, fontWeight: 600, fontSize: 176, lineHeight: 1.12, letterSpacing: "-0.03em", color: C.ink }}>
                  {n.word}.
                  <div
                    style={{
                      position: "absolute",
                      left: -14,
                      top: "56%",
                      height: 16,
                      borderRadius: 8,
                      width: `calc(${strike * 100}% + ${strike * 20}px)`,
                      backgroundColor: C.tangerine,
                      rotate: "-1.5deg",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </AbsoluteFill>
      ) : null}

      {/* C · first look at the real thing */}
      {t > 7.4 ? (
        <AbsoluteFill style={{ opacity: Math.min(1, ui * 1.4) }}>
          <div style={{ position: "absolute", left: 100, top: 140, width: 590 }}>
            <KineticLine
              size={100}
              words={[
                { text: "Just", at: 7.6 },
                { text: "tiny,", at: 7.84 },
                { text: "real-world", at: 8.4, color: C.tangerine, italic: true, br: true },
                { text: "quests.", at: 8.88, br: true },
              ]}
            />
            <div style={{ marginTop: 50, display: "flex", flexDirection: "column", gap: 16 }}>
              {SIGNALS.map((s) => (
                <Pop key={s.label} at={s.at} from="left">
                  <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                    <div style={{ width: 78, height: 78, borderRadius: 24, backgroundColor: s.bg, display: "grid", placeItems: "center", borderBottom: "5px solid rgba(28,25,23,0.18)" }}>
                      <s.icon size={40} color={C.cream} strokeWidth={2.4} />
                    </div>
                    <div style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 52, letterSpacing: "-0.03em", color: C.ink }}>{s.label}</div>
                  </div>
                </Pop>
              ))}
              <Pop at={12.2} from="left">
                <div
                  style={{
                    marginTop: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 20,
                    padding: "20px 34px 20px 24px",
                    borderRadius: 30,
                    backgroundColor: C.ink,
                    borderBottom: "6px solid rgba(0,0,0,0.35)",
                  }}
                >
                  <HeartHandshake size={46} color={C.solar} strokeWidth={2.3} />
                  <div style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 38, letterSpacing: "-0.02em", color: C.cream, whiteSpace: "nowrap" }}>
                    Care team, in the loop
                  </div>
                </div>
              </Pop>
            </div>
          </div>
          <BrowserStage
            x={700 + (1 - ui) * 160}
            y={112}
            width={1160}
            dark={false}
            label="OtaPath · the app's own guided stage"
            zoom={track(t, [[7.5, 1.0], [9.2, 1.0], [12.6, 1.1]])}
            cx={0.5}
            cy={0.48}
          >
            <Footage name="stage" cuts={[{ at: 7.5, src: [0.5, 6.4], rate: 1.04 }]} />
          </BrowserStage>
        </AbsoluteFill>
      ) : null}

      <Sfx
        cues={[
          { at: 0.1, name: "pop", volume: 0.5 },
          { at: 4.5, name: "whoosh-soft", volume: 0.35 },
          { at: 5.25, name: "swish", volume: 0.3 },
          { at: 6.5, name: "swish", volume: 0.3 },
          { at: 7.24, name: "swish", volume: 0.3 },
          { at: 7.35, name: "whoosh-soft", volume: 0.3 },
          { at: 9.86, name: "pop", volume: 0.35 },
          { at: 10.44, name: "pop", volume: 0.35 },
          { at: 11.06, name: "pop", volume: 0.35 },
          { at: 12.2, name: "chime", volume: 0.25 },
        ]}
      />
    </AbsoluteFill>
  );
};
