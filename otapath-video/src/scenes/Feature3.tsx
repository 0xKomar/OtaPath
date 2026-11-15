import { ArrowRight } from "lucide-react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, ramp, track } from "../anim";
import { Backdrop } from "../components/Backdrop";
import { BrowserStage } from "../components/BrowserStage";
import { Disclosure, Slot } from "../components/Callout";
import { FeatureTitle } from "../components/FeatureTitle";
import { type Cut, FOOTAGE, Footage, sceneTimeOf } from "../components/Footage";
import { Chip, KineticLine } from "../components/Kinetic";
import { PhoneStage } from "../components/PhoneStage";
import { Sfx } from "../components/Soundtrack";
import { Wipe } from "../components/Wipe";
import { C } from "../theme";

const DEMO = 3.4;
const SPLIT = 15.65; // the phone joins: both recordings run on one shared clock

// "clinic-before": the portal BEFORE today's walk.
const TRIAGE: Cut = { at: DEMO, src: [0.6, 6.0], rate: 2.0 }; // caseload → Review
const DRIFT: Cut = { at: 6.1, src: [6.0, 11.0], rate: 2.5 }; // the drift alert
// "clinic": the portal AFTER the capsule (recorded together with "phone2").
const REBOUND: Cut = { at: 8.1, src: [0.5, 8.6], rate: 2.5 }; // curves pull back up
const LISTEN: Cut = { at: 11.34, src: [10.4, 17.4], rate: 5.8 }; // capsule + voice note
const PICK: Cut = { at: 12.55, src: [23.6, 25.2], rate: 2.0 }; // choose the next place
const SEND: Cut = { at: 13.35, src: [30.2, 31.9], rate: 1.7 }; // send to Matti's phone
const CHECKIN: Cut = { at: 14.35, src: [45.6, 48.2], rate: 2.0 }; // warm check-in
const LANDS: Cut = { at: SPLIT, src: [31.9, 35.3], rate: 1.0 }; // mission lands
const NOTE: Cut = { at: 19.05, src: [36.2, 40.4], rate: 1.4 }; // doctor's note on the card
const WARM: Cut = { at: 22.05, src: [48.1, 50.9], rate: 1.4 }; // check-in lands
const AFTER = [REBOUND, LISTEN, PICK, SEND, CHECKIN, LANDS, NOTE, WARM];

// phone2 was recorded simultaneously — shift by the difference of the two start clocks
const OFFSET = FOOTAGE.phone2.t0 - FOOTAGE.clinic.t0;
const onPhone = (c: Cut): Cut => ({ ...c, src: [c.src[0] - OFFSET, c.src[1] - OFFSET] });
const PHONE = [LANDS, NOTE, WARM].map(onPhone);

const STEPS: { at: number; out: number; text: string; bg: string; fg?: string }[] = [
  { at: DEMO + 0.2, out: 8.05, text: "Before today's walk", bg: C.blush },
  { at: 8.15, out: 11.3, text: "After today's capsule", bg: C.forest },
  { at: 11.38, out: 12.5, text: "His voice note, in her portal", bg: C.solar, fg: C.ink },
  { at: 12.6, out: 14.3, text: "Prescribe the next quest", bg: C.tangerine },
  { at: 14.4, out: SPLIT - 0.05, text: "Send a warm check-in", bg: C.tangerine },
];

/** 71–95 s · Feature 3 — the clinician portal and the loop closing on the patient's phone. */
export const Feature3 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const enter = ramp(t, DEMO - 0.1, 0.7);
  const split = ramp(t, SPLIT, 0.7, EASE.inOut);
  const landed = sceneTimeOf(LANDS, FOOTAGE.clinic.events["mission-landed"]);
  const warmed = sceneTimeOf(WARM, FOOTAGE.clinic.events["nudge-landed"]);
  const pulse = Math.max(1 - ramp(t, landed, 1.1), 1 - ramp(t, warmed, 1.1)) * (t >= landed ? 1 : 0);

  const winW = 1560 - split * 470;
  const winX = 180 - split * 130;
  const winY = 40 + split * 132 + (1 - enter) * 90;

  return (
    <AbsoluteFill>
      <Backdrop color={C.ink} bloomA="rgba(255,107,43,0.16)" bloomB="rgba(37,99,235,0.14)" drift={t / 24} grain="screen" />

      {t >= DEMO - 0.2 ? (
        <>
          <BrowserStage
            x={winX}
            y={winY}
            width={winW}
            label="OtaPath · clinician portal"
            opacity={enter}
            zoom={track(t, [
              [3.9, 1.0], [5.3, 1.45], [6.09, 1.45],
              [6.1, 1.3], [6.5, 1.3], [7.2, 1.75], [8.09, 1.75],
              [8.1, 1.8], [9.0, 2.0], [11.33, 2.0],
              [11.34, 1.85], [12.54, 1.85],
              [12.55, 1.9], [14.34, 1.9],
              [14.35, 1.95], [SPLIT, 1.95], [SPLIT + 0.7, 2.2],
            ])}
            cx={track(t, [
              [3.9, 0.5], [5.3, 0.49], [6.09, 0.49],
              [6.1, 0.44], [8.09, 0.44],
              [8.1, 0.405], [11.33, 0.405],
              [11.34, 0.41], [12.54, 0.41],
              [12.55, 0.5], [14.34, 0.5],
              [14.35, 0.9], [24, 0.9],
            ])}
            cy={track(t, [
              [3.9, 0.5], [5.3, 0.22], [6.09, 0.22],
              [6.1, 0.3], [6.5, 0.3], [7.2, 0.35], [8.09, 0.35],
              [8.1, 0.64], [11.33, 0.64],
              [11.34, 0.4], [12.54, 0.4],
              [12.55, 0.615], [13.34, 0.615],
              [13.35, 0.72], [14.34, 0.72],
              [14.35, 0.86], [SPLIT, 0.86], [SPLIT + 0.7, 0.12], [21.9, 0.12], [22.4, 0.86],
            ])}
          >
            {t < REBOUND.at ? <Footage name="clinic-before" cuts={[TRIAGE, DRIFT]} /> : <Footage name="clinic" cuts={AFTER} />}
          </BrowserStage>

          {/* step label riding on the window's top-right corner */}
          {STEPS.map((s) => (
            <Slot key={s.text} at={s.at} out={s.out} style={{ right: 1920 - (winX + winW) + 22, top: winY + 62 }}>
              <Chip bg={s.bg} fg={s.fg ?? C.cream} size={27} style={{ boxShadow: "0 14px 34px -10px rgba(0,0,0,0.6)" }}>
                {s.text}
              </Chip>
            </Slot>
          ))}

          {/* the loop closes: her portal and his phone, one shared clock */}
          {t >= SPLIT - 0.1 ? (
            <>
              <PhoneStage
                anchorX={1572 + (1 - split) * 640}
                anchorY={520}
                scale={track(t, [[SPLIT + 0.8, 1.02], [SPLIT + 1.5, 1.6], [18.9, 1.6], [19.5, 1.62], [21.9, 1.62], [22.5, 1.6]])}
                cy={track(t, [[SPLIT + 0.8, 0.5], [SPLIT + 1.5, 0.6], [18.9, 0.6], [19.5, 0.66], [21.9, 0.66], [22.5, 0.6]])}
              >
                <Footage name="phone2" cuts={PHONE} />
              </PhoneStage>

              <div style={{ position: "absolute", left: 52, top: 50, width: 1180, opacity: split }}>
                <KineticLine
                  size={62}
                  color={C.cream}
                  out={21.95}
                  words={[
                    { text: "Seconds", at: 16.32, color: C.solar, italic: true },
                    { text: "later,", at: 16.62, color: C.solar, italic: true },
                    { text: "it", at: 16.9 },
                    { text: "lands", at: 17.0 },
                    { text: "on", at: 17.22 },
                    { text: "his", at: 17.42 },
                    { text: "phone.", at: 17.56 },
                  ]}
                />
              </div>
              <div style={{ position: "absolute", left: 52, top: 50, width: 1180 }}>
                <KineticLine
                  size={62}
                  color={C.cream}
                  words={[
                    { text: "…and", at: 22.1 },
                    { text: "so", at: 22.25 },
                    { text: "does", at: 22.4 },
                    { text: "her", at: 22.55 },
                    { text: "warm", at: 22.7, color: C.solar, italic: true },
                    { text: "check-in.", at: 22.85, color: C.solar, italic: true },
                  ]}
                />
              </div>

              {/* portal → phone link */}
              <div
                style={{
                  position: "absolute",
                  left: 1146,
                  top: 482,
                  width: 74,
                  height: 74,
                  borderRadius: "50%",
                  backgroundColor: C.tangerine,
                  display: "grid",
                  placeItems: "center",
                  opacity: split,
                  scale: String(split * (1 + pulse * 0.35)),
                  boxShadow: `0 0 0 ${pulse * 26}px rgba(255,107,43,${0.35 * pulse})`,
                }}
              >
                <ArrowRight size={42} color={C.cream} strokeWidth={3} />
              </div>
              <Slot at={SPLIT + 0.5} out={24.2} style={{ left: 52, top: 884 }}>
                <Disclosure dark>Two real recordings, synchronized — her portal and his phone on one clock</Disclosure>
              </Slot>
            </>
          ) : null}
        </>
      ) : null}

      {t < DEMO + 0.7 ? (
        <AbsoluteFill style={{ opacity: t < DEMO ? 1 : 0 }}>
          <FeatureTitle
            number="03"
            bg={C.cobalt}
            fg={C.cream}
            accent={C.solar}
            numberAt={0.8}
            words={[
              { text: "The", at: 1.72 },
              { text: "clinician's", at: 1.8 },
              { text: "side", at: 2.44, br: true },
              { text: "of", at: 2.56 },
              { text: "the", at: 2.7 },
              { text: "loop.", at: 2.78, italic: true },
            ]}
          />
        </AbsoluteFill>
      ) : null}
      <Wipe at={DEMO} colors={[C.ink, C.solar, C.tangerine]} />

      <Sfx
        cues={[
          { at: 0.8, name: "thud", volume: 0.4 },
          { at: DEMO - 0.4, name: "whoosh-soft", volume: 0.35 },
          { at: sceneTimeOf(TRIAGE, 6.0) - 0.05, name: "mouse-click", volume: 0.5 },
          { at: REBOUND.at, name: "swish", volume: 0.25 },
          { at: sceneTimeOf(LISTEN, 14.58), name: "mouse-click", volume: 0.5 },
          { at: sceneTimeOf(PICK, 24.23), name: "mouse-click", volume: 0.5 },
          { at: sceneTimeOf(SEND, 31.44), name: "mouse-click", volume: 0.5 },
          { at: sceneTimeOf(CHECKIN, 47.47), name: "mouse-click", volume: 0.5 },
          { at: SPLIT - 0.1, name: "whoosh-soft", volume: 0.3 },
          { at: landed, name: "chime", volume: 0.4 },
          { at: warmed, name: "chime", volume: 0.4 },
        ]}
      />
    </AbsoluteFill>
  );
};
