import { Stethoscope } from "lucide-react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ramp, track } from "../anim";
import { Backdrop } from "../components/Backdrop";
import { Disclosure, Slot, Sub } from "../components/Callout";
import { FeatureTitle } from "../components/FeatureTitle";
import { type Cut, Footage, sceneTimeOf } from "../components/Footage";
import { Card, Chip, KineticLine } from "../components/Kinetic";
import { PhoneStage } from "../components/PhoneStage";
import { Sfx } from "../components/Soundtrack";
import { Wipe } from "../components/Wipe";
import { C, FONT } from "../theme";

const DEMO = 3.2; // the title card hands over to the live app here

// Real recording of the patient app (capture/record.mjs → "phone").
const NAME: Cut = { at: DEMO, src: [0.6, 7.6], rate: 2.2 }; // naming the companion
const QUEST: Cut = { at: 6.38, src: [10.4, 15.9], rate: 1.5 }; // the doctor's quest
const WALK: Cut = { at: 10.05, src: [16.6, 45.4], rate: 3.1 }; // the 550 m walk
const GLOW: Cut = { at: 19.34, src: [45.4, 47.9], rate: 1 }; // "5% of the neighborhood is yours"
const CUTS = [NAME, QUEST, WALK, GLOW];

const RIGHT = 960;

/** 25–47 s · Feature 1 — fog-of-war map + a quest prescribed by the doctor. */
export const Feature1 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const enter = ramp(t, DEMO - 0.1, 0.7);

  return (
    <AbsoluteFill>
      <Backdrop color={C.cream} drift={t / 22} />

      {t >= DEMO - 0.2 ? (
        <>
          <PhoneStage
            anchorX={520}
            anchorY={track(t, [[16.4, 500], [17.2, 262], [19.1, 262], [19.9, 500]]) + (1 - enter) * 120}
            scale={track(t, [[4.0, 1], [4.7, 1.3], [5.7, 1.3], [6.3, 1], [6.8, 1], [7.5, 1.5], [9.7, 1.5], [10.5, 1.12], [16.4, 1.16], [17.2, 1.72], [19.1, 1.72], [19.9, 1.0]])}
            cx={track(t, [[16.4, 0.5], [17.2, 0.46], [19.1, 0.46], [19.9, 0.5]])}
            cy={track(t, [[4.0, 0.5], [4.7, 0.7], [5.7, 0.7], [6.3, 0.5], [6.8, 0.5], [7.5, 0.73], [9.7, 0.73], [10.5, 0.47], [16.4, 0.47], [17.2, 0.1], [19.1, 0.1], [19.9, 0.5]])}
          >
            <Footage name="phone" cuts={CUTS} />
          </PhoneStage>

          <div style={{ position: "absolute", left: RIGHT, top: 96, opacity: enter }}>
            <Chip bg={C.tangerine} size={26}>
              01 · The map is the game
            </Chip>
          </div>

          <Slot at={3.5} out={6.3} style={{ left: RIGHT, top: 210, width: 860 }}>
            <KineticLine
              size={112}
              words={[
                { text: "Meet", at: 3.6 },
                { text: "his", at: 3.75 },
                { text: "walking", at: 4.9, color: C.tangerine, italic: true, br: true },
                { text: "buddy.", at: 5.2, color: C.tangerine, italic: true },
              ]}
            />
            <Sub style={{ marginTop: 34, width: 760 }}>A companion that waits patiently on the days he stays in.</Sub>
          </Slot>

          <Slot at={6.45} out={9.95} style={{ left: RIGHT, top: 210, width: 880 }}>
            <KineticLine
              size={100}
              words={[
                { text: "A", at: 6.5 },
                { text: "gentle", at: 6.64 },
                { text: "quest,", at: 6.92 },
                { text: "prescribed", at: 7.68, br: true },
                { text: "by", at: 8.1 },
                { text: "his", at: 8.4 },
                { text: "own", at: 8.54, color: C.tangerine, italic: true, br: true },
                { text: "doctor.", at: 8.76, color: C.tangerine, italic: true },
              ]}
            />
            <Card bg={C.butter} style={{ marginTop: 40, width: 800, opacity: ramp(t, 8.3, 0.5) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <Chip bg={C.blush} size={20}>
                  <Stethoscope size={22} strokeWidth={3} /> Dr. Lindqvist
                </Chip>
              </div>
              <div style={{ fontFamily: FONT.display, fontStyle: "italic", fontWeight: 500, fontSize: 42, lineHeight: 1.22, color: "rgba(28,25,23,0.82)" }}>
                “first gentle outdoor re-entry — keep it under 15 minutes”
              </div>
            </Card>
          </Slot>

          <Slot at={10.0} out={14.45} style={{ left: RIGHT, top: 210, width: 880 }}>
            <KineticLine
              size={112}
              words={[
                { text: "Every", at: 10.0 },
                { text: "step", at: 10.24 },
                { text: "clears", at: 10.88, br: true },
                { text: "the", at: 11.1 },
                { text: "golden", at: 11.28, color: C.tangerine, italic: true, br: true },
                { text: "mist.", at: 11.74, color: C.tangerine, italic: true },
              ]}
            />
            <Sub style={{ marginTop: 34, width: 800, opacity: ramp(t, 12.3, 0.5) }}>His real neighborhood, on live OpenStreetMap data.</Sub>
          </Slot>

          <Slot at={14.55} out={21.7} style={{ left: RIGHT, top: 210, width: 880 }}>
            <KineticLine
              size={118}
              words={[
                { text: "Nothing", at: 14.84 },
                { text: "to", at: 15.02 },
                { text: "fail.", at: 15.24 },
                { text: "Only", at: 16.04, br: true, color: C.tangerine, italic: true },
                { text: "streets", at: 16.14, color: C.tangerine, italic: true },
                { text: "to", at: 16.48, br: true, color: C.tangerine, italic: true },
                { text: "rediscover.", at: 16.74, color: C.tangerine, italic: true },
              ]}
            />
            <div style={{ marginTop: 44, display: "flex", gap: 16, opacity: ramp(t, 17.6, 0.5) }}>
              <Chip bg={C.ink} size={26}>No streaks</Chip>
              <Chip bg={C.ink} size={26}>No red warnings</Chip>
            </div>
          </Slot>

          <Slot at={10.3} out={19.3} style={{ left: RIGHT, top: 872 }}>
            <Disclosure>Built-in demo walk (550 m, simulated GPS) · sped up 3×</Disclosure>
          </Slot>
        </>
      ) : null}

      {t < DEMO + 0.7 ? (
        <AbsoluteFill style={{ opacity: t < DEMO ? 1 : 0 }}>
          <FeatureTitle
            number="01"
            bg={C.tangerine}
            fg={C.cream}
            accent={C.butter}
            numberAt={1.0}
            words={[
              { text: "The", at: 1.86 },
              { text: "map", at: 1.94 },
              { text: "is", at: 2.12, br: true },
              { text: "the", at: 2.3 },
              { text: "game.", at: 2.44, italic: true },
            ]}
          />
        </AbsoluteFill>
      ) : null}
      <Wipe at={DEMO} colors={[C.cream, C.solar, C.butter]} />

      <Sfx
        cues={[
          { at: 1.0, name: "thud", volume: 0.4 },
          { at: DEMO - 0.4, name: "whoosh-soft", volume: 0.35 },
          { at: sceneTimeOf(NAME, 6.25), name: "mouse-click", volume: 0.5 },
          { at: sceneTimeOf(QUEST, 11.0), name: "mouse-click", volume: 0.5 },
          { at: 6.45, name: "swish", volume: 0.2 },
          { at: 10.0, name: "swish", volume: 0.2 },
          { at: 14.55, name: "swish", volume: 0.2 },
          { at: sceneTimeOf(WALK, 42.8), name: "sparkle", volume: 0.35 },
        ]}
      />
    </AbsoluteFill>
  );
};
