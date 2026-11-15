import { Camera, Mic, Quote } from "lucide-react";
import type React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, ramp, track } from "../anim";
import { Backdrop } from "../components/Backdrop";
import { Disclosure, Slot } from "../components/Callout";
import { FeatureTitle } from "../components/FeatureTitle";
import { type Cut, Footage, sceneTimeOf } from "../components/Footage";
import { Chip, KineticLine } from "../components/Kinetic";
import { PhoneStage } from "../components/PhoneStage";
import { Sfx } from "../components/Soundtrack";
import { Wipe } from "../components/Wipe";
import { C, FONT } from "../theme";

const DEMO = 3.0;

// Real recording of the capture flow (same "phone" take as Feature 1).
const PHOTO: Cut = { at: DEMO, src: [48.7, 56.5], rate: 2.0 }; // photo-hunt
const TO_MIC: Cut = { at: 6.9, src: [56.5, 59.0], rate: 3.0 };
const VOICE: Cut = { at: 7.73, src: [59.0, 70.3], rate: 2.3 }; // the 10 s voice note
const WORDS: Cut = { at: 12.64, src: [70.3, 76.5], rate: 3.2 }; // his words
const TUCKED: Cut = { at: 14.58, src: [76.5, 81.7], rate: 1.25 }; // "Tucked away safely"
const PIN: Cut = { at: 18.74, src: [81.7, 86.2], rate: 1.5 }; // back on the map
const ATLAS: Cut = { at: 21.74, src: [87.6, 91.2], rate: 1.5 }; // the memory atlas
const CUTS = [PHOTO, TO_MIC, VOICE, WORDS, TUCKED, PIN, ATLAS];

const RIGHT = 960;

/**
 * What the app itself computed for the capsule recorded in this take
 * (read back from the demo database after the recording — see README).
 */
const MEASURED = {
  f0Hz: 113,
  f0SdHz: 39.5,
  voiceScore: 97,
  vibrancy: 81,
  luminance: 54,
  palette: ["#bd9118", "#9c7422", "#c19e3d", "#ccb775", "#6c4815"],
  savoring: 100,
  themes: ["color", "light", "soundscape", "texture"],
};

const Row = ({
  at,
  until,
  icon,
  title,
  what,
  color,
  children,
}: {
  readonly at: number;
  readonly until: number;
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly what: string;
  readonly color: string;
  readonly children: React.ReactNode;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = ramp(t, at, 0.5, EASE.out);
  const live = t >= at && t < until;
  return (
    <div
      style={{
        display: "flex",
        gap: 26,
        padding: "22px 28px",
        borderRadius: 32,
        backgroundColor: live ? "#FFFFFF" : "rgba(255,255,255,0.55)",
        borderBottom: `6px solid ${live ? color : "rgba(28,25,23,0.08)"}`,
        opacity: 0.18 + 0.82 * p,
        translate: `${(1 - p) * 60}px 0px`,
        scale: String(live ? 1 : 0.985),
      }}
    >
      <div style={{ width: 92, height: 92, borderRadius: 28, backgroundColor: color, display: "grid", placeItems: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 54, letterSpacing: "-0.02em", color: C.ink }}>{title}</div>
          <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 32, color: "rgba(28,25,23,0.55)" }}>{what}</div>
        </div>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "nowrap", alignItems: "center", gap: 8, opacity: ramp(t, at + 0.25, 0.5) }}>{children}</div>
      </div>
    </div>
  );
};

const Metric = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8, padding: "6px 14px", borderRadius: 14, backgroundColor: "rgba(28,25,23,0.06)", fontFamily: FONT.sans, whiteSpace: "nowrap" }}>
    <span style={{ fontWeight: 600, fontSize: 22, color: "rgba(28,25,23,0.55)" }}>{label}</span>
    <span style={{ fontWeight: 800, fontSize: 28, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{value}</span>
  </div>
);

/** 47–71 s · Feature 2 — photo + 10 s voice note → passive biomarkers → a capsule on the map. */
export const Feature2 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const enter = ramp(t, DEMO - 0.1, 0.7);

  return (
    <AbsoluteFill>
      <Backdrop color={C.cream} bloomA="rgba(30,142,90,0.16)" bloomB="rgba(255,206,50,0.30)" drift={t / 24} />

      {t >= DEMO - 0.2 ? (
        <>
          <PhoneStage
            anchorX={520}
            anchorY={500 + (1 - enter) * 120}
            scale={track(t, [[3.5, 1], [4.2, 1.36], [6.6, 1.36], [7.3, 1.5], [14.3, 1.5], [15.0, 1.3], [18.4, 1.3], [19.2, 1.0], [21.6, 1.0], [22.3, 1.1]])}
            cy={track(t, [[3.5, 0.5], [4.2, 0.43], [6.6, 0.43], [7.3, 0.37], [12.4, 0.37], [12.9, 0.43], [14.3, 0.43], [15.0, 0.49], [18.4, 0.49], [19.2, 0.5], [21.6, 0.5], [22.3, 0.46]])}
          >
            <Footage name="phone" cuts={CUTS} />
          </PhoneStage>

          <div style={{ position: "absolute", left: RIGHT, top: 96, opacity: enter }}>
            <Chip bg={C.forest} size={26}>
              02 · Memory capsules
            </Chip>
          </div>

          <Slot at={3.3} out={7.75} style={{ left: RIGHT, top: 210, width: 880 }}>
            <KineticLine
              size={108}
              words={[
                { text: "Snap", at: 3.88 },
                { text: "one", at: 4.14 },
                { text: "vivid", at: 4.44, color: C.tangerine, italic: true, br: true },
                { text: "thing.", at: 4.7, color: C.tangerine, italic: true },
                { text: "Leave", at: 5.48, br: true },
                { text: "a", at: 5.68 },
                { text: "10-second", at: 5.88, br: true },
                { text: "voice", at: 6.32, color: C.forest, italic: true },
                { text: "note.", at: 6.58, color: C.forest, italic: true },
              ]}
            />
          </Slot>

          <Slot at={7.85} out={15.75} style={{ left: RIGHT, top: 196, width: 880 }}>
            <div style={{ fontFamily: FONT.sans, fontWeight: 800, fontSize: 30, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(28,25,23,0.5)", marginBottom: 18 }}>
              Under the hood — while he just talks
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Row at={9.2} until={11.85} color={C.tangerine} icon={<Mic size={48} color={C.cream} strokeWidth={2.4} />} title="Voice" what="pitch & energy">
                <Metric label="pitch F0" value={`${MEASURED.f0Hz} Hz`} />
                <Metric label="variation" value={`±${MEASURED.f0SdHz} Hz`} />
                <Metric label="vocal score" value={`${MEASURED.voiceScore}`} />
              </Row>
              <Row at={11.85} until={13.75} color={C.cobalt} icon={<Camera size={48} color={C.cream} strokeWidth={2.4} />} title="Photo" what="color & light">
                <Metric label="vibrancy" value={`${MEASURED.vibrancy}`} />
                <Metric label="luminance" value={`${MEASURED.luminance}`} />
                <div style={{ display: "flex", gap: 6, marginLeft: 4 }}>
                  {MEASURED.palette.map((c) => (
                    <div key={c} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c }} />
                  ))}
                </div>
              </Row>
              <Row at={13.75} until={99} color={C.forest} icon={<Quote size={46} color={C.cream} strokeWidth={2.4} />} title="Words" what="sensory richness">
                <Metric label="savoring" value={`${MEASURED.savoring}`} />
                {MEASURED.themes.map((th) => (
                  <div key={th} style={{ padding: "6px 13px", borderRadius: 14, backgroundColor: C.butter, fontFamily: FONT.sans, fontWeight: 700, fontSize: 23, color: "rgba(28,25,23,0.75)" }}>
                    {th}
                  </div>
                ))}
              </Row>
            </div>
            <Disclosure style={{ marginTop: 22, opacity: ramp(t, 9.6, 0.5) }}>Real values the app computed for this exact take</Disclosure>
          </Slot>

          <Slot at={15.95} out={23.9} style={{ left: RIGHT, top: 210, width: 880 }}>
            <KineticLine
              size={118}
              words={[
                { text: "No", at: 16.2 },
                { text: "forms.", at: 16.38 },
                { text: "Just", at: 17.32, br: true },
                { text: "a", at: 17.6 },
                { text: "memory —", at: 17.72 },
                { text: "pinned", at: 18.06, br: true, color: C.tangerine, italic: true },
                { text: "to", at: 18.4, color: C.tangerine, italic: true },
                { text: "the", at: 18.6, color: C.tangerine, italic: true },
                { text: "map.", at: 18.7, color: C.tangerine, italic: true },
              ]}
            />
            <div style={{ marginTop: 46, opacity: ramp(t, 21.9, 0.5), translate: `0px ${(1 - ramp(t, 21.9, 0.5)) * 30}px` }}>
              <Chip bg={C.forest} size={28}>Kept in his Memory Atlas</Chip>
            </div>
          </Slot>
        </>
      ) : null}

      {t < DEMO + 0.7 ? (
        <AbsoluteFill style={{ opacity: t < DEMO ? 1 : 0 }}>
          <FeatureTitle
            number="02"
            bg={C.forestDeep}
            fg={C.cream}
            accent={C.solar}
            numberAt={0.8}
            words={[
              { text: "Memory", at: 1.64 },
              { text: "capsules.", at: 1.84, italic: true, br: true },
            ]}
          />
        </AbsoluteFill>
      ) : null}
      <Wipe at={DEMO} colors={[C.cream, C.solar, C.butter]} />

      <Sfx
        cues={[
          { at: 0.8, name: "thud", volume: 0.4 },
          { at: DEMO - 0.4, name: "whoosh-soft", volume: 0.35 },
          { at: sceneTimeOf(PHOTO, 52.19), name: "shutter-modern", volume: 0.55 },
          { at: sceneTimeOf(VOICE, 59.25), name: "mouse-click", volume: 0.5 },
          { at: 9.2, name: "pop", volume: 0.3 },
          { at: 11.85, name: "pop", volume: 0.3 },
          { at: 13.75, name: "pop", volume: 0.3 },
          { at: sceneTimeOf(TUCKED, 77.25), name: "sparkle", volume: 0.4 },
          { at: 15.95, name: "swish", volume: 0.2 },
          { at: ATLAS.at, name: "page-turn", volume: 0.5 },
        ]}
      />
    </AbsoluteFill>
  );
};
