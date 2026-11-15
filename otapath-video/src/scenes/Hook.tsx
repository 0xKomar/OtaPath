import { Footprints, Mic, ScanEye } from "lucide-react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, inOut, ramp } from "../anim";
import { Backdrop } from "../components/Backdrop";
import { KineticLine } from "../components/Kinetic";
import { Sfx } from "../components/Soundtrack";
import { C, FONT } from "../theme";

/** 0–12 s · the problem: TMS works, then patients go home alone and 1 in 3 relapse unseen. */
export const Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // beat 1 — the recovery curve
  const draw = ramp(t, 0.5, 3.5, EASE.inOut);
  const curveOpacity = inOut(t, 0.4, 4.3, 0.4, 0.4);
  // beat 3 — the stat
  const slam = ramp(t, 7.2, 0.45, EASE.out);
  const statOpacity = inOut(t, 6.25, 9.05, 0.25, 0.3);
  // beat 4 — signals nobody sees
  const dim = ramp(t, 10.35, 0.5);

  const SIGNALS = [
    { icon: Footprints, label: "Walking radius shrinks", at: 9.3, path: "M0 14 C 60 10, 110 22, 170 40 S 280 78, 340 84" },
    { icon: Mic, label: "Voice goes flat", at: 9.55, path: "M0 44 q 14 -40 28 0 t 28 0 q 14 -30 28 0 t 28 0 q 14 -18 28 0 t 28 0 q 14 -8 28 0 t 28 0 L 340 44" },
    { icon: ScanEye, label: "Attention narrows", at: 9.8, path: "M0 10 C 90 12, 150 30, 210 52 S 300 80, 340 82" },
  ];

  return (
    <AbsoluteFill>
      <Backdrop color={C.ink} bloomA="rgba(255,107,43,0.13)" bloomB="rgba(37,99,235,0.10)" drift={t / 12} grain="screen" />

      {/* beat 1 · TMS lifts people out */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: curveOpacity }}>
        <defs>
          <linearGradient id="rise" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={C.cobalt} />
            <stop offset="0.55" stopColor={C.forest} />
            <stop offset="1" stopColor={C.solar} />
          </linearGradient>
        </defs>
        <path
          d="M 140 930 C 420 920, 560 905, 760 850 S 1140 640, 1360 600 S 1660 575, 1790 560"
          fill="none"
          stroke="url(#rise)"
          strokeWidth={10}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
        />
        {[0.12, 0.3, 0.5, 0.7, 0.9].map((x) => (
          <line key={x} x1={140 + x * 1650} x2={140 + x * 1650} y1={940} y2={960} stroke="rgba(253,248,238,0.18)" strokeWidth={3} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 150, top: 150, width: 1500 }}>
        <KineticLine
          size={124}
          color={C.cream}
          out={4.2}
          words={[
            { text: "TMS", at: 0.6 },
            { text: "therapy", at: 1.3 },
            { text: "can", at: 1.76 },
            { text: "lift", at: 2.24 },
            { text: "people", at: 2.44, br: true },
            { text: "out", at: 2.78 },
            { text: "of", at: 2.96 },
            { text: "severe", at: 3.1, color: C.solar, italic: true },
            { text: "depression.", at: 3.32, color: C.solar, italic: true },
          ]}
        />
      </div>

      {/* beat 2 · then they are sent home, alone */}
      {t > 4.1 && t < 6.4 ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", paddingBottom: 60 }}>
          <KineticLine
            size={84}
            font={FONT.sans}
            weight={600}
            color="rgba(253,248,238,0.72)"
            align="center"
            out={6.25}
            words={[
              { text: "Then", at: 4.25 },
              { text: "they're", at: 4.37 },
              { text: "sent", at: 4.55 },
              { text: "home —", at: 4.75 },
            ]}
          />
          <KineticLine
            size={300}
            color={C.tangerine}
            align="center"
            out={6.25}
            words={[{ text: "alone.", at: 5.33, italic: true }]}
            style={{ marginTop: 6 }}
          />
        </AbsoluteFill>
      ) : null}

      {/* beat 3 · roughly one in three relapses */}
      {t > 6.2 && t < 9.1 ? (
        <AbsoluteFill style={{ opacity: statOpacity }}>
          <div style={{ position: "absolute", left: 150, top: 132 }}>
            <KineticLine
              size={66}
              font={FONT.sans}
              weight={600}
              color="rgba(253,248,238,0.72)"
              words={[
                { text: "Within", at: 6.3 },
                { text: "a", at: 6.46 },
                { text: "year,", at: 6.6 },
                { text: "roughly", at: 7.1 },
              ]}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: 140,
              top: 210,
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 400,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: C.cream,
              opacity: Math.min(1, slam * 2),
              scale: String(1.35 - 0.35 * slam),
              transformOrigin: "0% 60%",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: C.tangerine }}>1</span> in 3
          </div>
          <div style={{ position: "absolute", left: 160, top: 640 }}>
            <KineticLine size={150} color={C.tangerine} words={[{ text: "relapses.", at: 7.94, italic: true }]} />
          </div>
          {/* three people — one slips back */}
          <div style={{ position: "absolute", right: 170, top: 330, display: "flex", gap: 44 }}>
            {[0, 1, 2].map((i) => {
              const p = ramp(t, 7.3 + i * 0.12, 0.5, EASE.back);
              const fall = i === 2 ? ramp(t, 7.9, 0.6, EASE.inOut) : 0;
              return (
                <div key={i} style={{ scale: String(p), translate: `0px ${fall * 70}px`, opacity: 1 - fall * 0.1 }}>
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: "50%",
                      margin: "0 auto 14px",
                      backgroundColor: i === 2 && fall > 0.3 ? C.tangerine : C.cream,
                    }}
                  />
                  <div
                    style={{
                      width: 150,
                      height: 190,
                      borderRadius: "75px 75px 28px 28px",
                      backgroundColor: i === 2 && fall > 0.3 ? C.tangerine : C.cream,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div
            style={{
              position: "absolute",
              left: 160,
              top: 872,
              fontFamily: FONT.sans,
              fontWeight: 600,
              fontSize: 27,
              color: "rgba(253,248,238,0.5)",
              opacity: ramp(t, 7.9, 0.5),
            }}
          >
            TMS responders without maintenance care, at 12 months · Dunner et al., J Clin Psychiatry 2014
          </div>
        </AbsoluteFill>
      ) : null}

      {/* beat 4 · the warning signs nobody is watching */}
      {t > 9 ? (
        <AbsoluteFill>
          <div style={{ position: "absolute", left: 150, top: 120, opacity: 1 - dim * 0.85 }}>
            <KineticLine
              size={84}
              color={C.cream}
              words={[
                { text: "And", at: 9.1 },
                { text: "the", at: 9.2 },
                { text: "warning", at: 9.3, color: C.solar, italic: true },
                { text: "signs?", at: 9.54, color: C.solar, italic: true },
              ]}
            />
          </div>
          <div style={{ position: "absolute", left: 150, top: 290, width: 1620, opacity: 1 - dim * 0.88, filter: dim > 0.02 ? `blur(${dim * 7}px)` : undefined }}>
            {SIGNALS.map((s) => {
              const p = ramp(t, s.at, 0.5);
              const line = ramp(t, s.at + 0.1, 0.65, EASE.inOut);
              return (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 30,
                    padding: "26px 0",
                    borderBottom: "2px solid rgba(253,248,238,0.10)",
                    opacity: p,
                    translate: `${(1 - p) * -50}px 0px`,
                  }}
                >
                  <div style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: "rgba(253,248,238,0.08)", display: "grid", placeItems: "center" }}>
                    <s.icon size={44} color={C.cream} strokeWidth={2.2} />
                  </div>
                  <div style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 60, letterSpacing: "-0.03em", color: C.cream, flex: 1 }}>{s.label}</div>
                  <svg width={360} height={96} viewBox="-6 -4 352 96">
                    <path d={s.path} fill="none" stroke={C.tangerine} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - line} />
                  </svg>
                </div>
              );
            })}
          </div>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 40 }}>
            <KineticLine
              size={196}
              color={C.cream}
              align="center"
              words={[
                { text: "Nobody", at: 10.42, color: C.tangerine, italic: true },
                { text: "is", at: 10.58 },
                { text: "watching.", at: 10.88 },
              ]}
            />
          </AbsoluteFill>
        </AbsoluteFill>
      ) : null}

      <Sfx
        cues={[
          { at: 5.28, name: "thud", volume: 0.45 },
          { at: 7.22, name: "thud", volume: 0.7 },
          { at: 9.3, name: "swish", volume: 0.22 },
          { at: 9.55, name: "swish", volume: 0.22 },
          { at: 9.8, name: "swish", volume: 0.22 },
          { at: 10.4, name: "thud", volume: 0.6 },
        ]}
      />
    </AbsoluteFill>
  );
};
