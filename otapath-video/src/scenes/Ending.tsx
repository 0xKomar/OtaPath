import { Heart } from "lucide-react";
import { AbsoluteFill, CanvasImage, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, ramp, track } from "../anim";
import { Backdrop } from "../components/Backdrop";
import { KineticLine } from "../components/Kinetic";
import { OtaDog } from "../components/OtaDog";
import { Sfx } from "../components/Soundtrack";
import { C, FONT } from "../theme";

/** 110–120 s · the name, the promise, the app's own tagline. */
export const Ending = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const reveal = ramp(t, 0, 1.1, EASE.out);
  const logo = ramp(t, 0.15, 0.8, EASE.back);
  const dogX = track(t, [[0.4, -300], [6.6, 250]], EASE.out);
  const walking = t < 6.5;
  const footer = ramp(t, 8.2, 0.6);

  return (
    <AbsoluteFill style={{ backgroundColor: C.butter }}>
      {/* the golden mist clears from the centre */}
      <AbsoluteFill style={{ clipPath: `circle(${reveal * 78}% at 50% 42%)` }}>
        <Backdrop color={C.cream} bloomA="rgba(255,206,50,0.42)" bloomB="rgba(255,107,43,0.2)" drift={t / 10} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: `circle(${reveal * 78 + 1.2}% at 50% 42%)`,
          WebkitMaskImage: `radial-gradient(circle at 50% 42%, transparent ${reveal * 76}%, black ${reveal * 78}%)`,
          backgroundColor: C.solar,
          opacity: 1 - ramp(t, 0.7, 0.5),
        }}
      />

      <div style={{ position: "absolute", left: 0, right: 0, top: 104, display: "flex", justifyContent: "center", alignItems: "center", gap: 48 }}>
        <CanvasImage
          src={staticFile("logo.png")}
          style={{ width: 232, height: 232, borderRadius: 56, scale: String(logo), rotate: `${(1 - logo) * -20}deg`, boxShadow: "0 34px 70px -26px rgba(198,79,0,0.55)" }}
        />
        <KineticLine size={262} weight={700} words={[{ text: "OtaPath", at: 0.9 }]} />
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 420 }}>
        <KineticLine
          size={66}
          font={FONT.sans}
          weight={600}
          color="rgba(28,25,23,0.78)"
          align="center"
          lineHeight={1.24}
          out={6.35}
          words={[
            { text: "From", at: 1.74 },
            { text: "hospital", at: 1.82 },
            { text: "discharge", at: 2.2 },
            { text: "to", at: 2.74 },
            { text: "lasting", at: 3.12, color: C.forest },
            { text: "recovery —", at: 3.44, color: C.forest },
            { text: "one", at: 4.44, br: true },
            { text: "small", at: 4.62 },
            { text: "walk", at: 4.94 },
            { text: "at", at: 5.2 },
            { text: "a", at: 5.38 },
            { text: "time.", at: 5.5 },
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 432 }}>
        <KineticLine
          size={128}
          color={C.tangerine}
          align="center"
          words={[
            { text: "Step", at: 6.5, italic: true },
            { text: "outside.", at: 6.74, italic: true },
            { text: "Feel", at: 7.5, italic: true, color: C.ink },
            { text: "brighter.", at: 7.6, italic: true, color: C.ink },
          ]}
        />
      </div>

      {/* the companion walks his path in */}
      <div style={{ position: "absolute", left: 0, top: 868, width: Math.max(0, dogX + 70), borderTop: `9px dotted ${C.tangerine}`, opacity: 0.6 }} />
      <OtaDog size={236} flip walking={walking} style={{ position: "absolute", left: dogX, top: 680 }} />

      <div
        style={{
          position: "absolute",
          right: 130,
          top: 790,
          textAlign: "right",
          opacity: footer,
          translate: `0px ${(1 - footer) * 24}px`,
          fontFamily: FONT.sans,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 34, color: "rgba(28,25,23,0.66)", display: "flex", gap: 11, justifyContent: "flex-end", alignItems: "center" }}>
          From Poland with <Heart size={32} color={C.tangerine} fill={C.tangerine} /> in Finland · built at Hype Arena, Espoo
        </div>
      </div>

      <Sfx
        cues={[
          { at: 0.2, name: "sparkle", volume: 0.5 },
          { at: 6.4, name: "swish", volume: 0.3 },
          { at: 7.45, name: "pop", volume: 0.35 },
        ]}
      />
    </AbsoluteFill>
  );
};
