import { Sequence, useVideoConfig } from "remotion";
import { Music, Narration, Sfx } from "./components/Soundtrack";
import { Subtitles } from "./components/Subtitles";
import { Wipe } from "./components/Wipe";
import { Difference } from "./scenes/Difference";
import { Ending } from "./scenes/Ending";
import { Feature1 } from "./scenes/Feature1";
import { Feature2 } from "./scenes/Feature2";
import { Feature3 } from "./scenes/Feature3";
import { Hook } from "./scenes/Hook";
import { Solution } from "./scenes/Solution";
import { C, SECTION } from "./theme";

/** OtaPath — 120-second pitch + product demo. */
export const Main = () => {
  const { fps } = useVideoConfig();
  const span = (s: { from: number; to: number }) => ({
    from: Math.round(s.from * fps),
    durationInFrames: Math.round((s.to - s.from) * fps),
  });
  return (
    <>
      <Sequence name="0:00 Hook — the problem" {...span(SECTION.hook)}>
        <Hook />
      </Sequence>
      <Sequence name="0:12 Solution — meet OtaPath" {...span(SECTION.solution)}>
        <Solution />
      </Sequence>
      <Sequence name="0:25 Feature 1 — the map is the game" {...span(SECTION.feature1)}>
        <Feature1 />
      </Sequence>
      <Sequence name="0:47 Feature 2 — memory capsules" {...span(SECTION.feature2)}>
        <Feature2 />
      </Sequence>
      <Sequence name="1:11 Feature 3 — the clinician's loop" {...span(SECTION.feature3)}>
        <Feature3 />
      </Sequence>
      <Sequence name="1:35 Difference — what is real" {...span(SECTION.difference)}>
        <Difference />
      </Sequence>
      <Sequence name="1:50 Ending" {...span(SECTION.ending)}>
        <Ending />
      </Sequence>

      {/* scene-change wipes: the last band to clear matches the next scene's backdrop */}
      <Wipe at={SECTION.solution.from} colors={[C.cream, C.solar, C.tangerine]} />
      <Wipe at={SECTION.feature1.from} colors={[C.tangerine, C.solar, C.cream]} />
      <Wipe at={SECTION.feature2.from} colors={[C.forestDeep, C.solar, C.cream]} direction={-1} />
      <Wipe at={SECTION.feature3.from} colors={[C.cobalt, C.solar, C.cream]} />
      <Wipe at={SECTION.difference.from} colors={[C.cream, C.solar, C.tangerine]} direction={-1} />
      <Wipe at={SECTION.ending.from} colors={[C.butter, C.solar, C.cream]} />

      <Subtitles />

      <Music />
      <Narration />
      <Sfx
        cues={[
          { at: SECTION.solution.from - 0.42, name: "whoosh-soft", volume: 0.5 },
          { at: SECTION.feature1.from - 0.42, name: "whoosh-soft", volume: 0.45 },
          { at: SECTION.feature2.from - 0.42, name: "whoosh-soft", volume: 0.45 },
          { at: SECTION.feature3.from - 0.42, name: "whoosh-soft", volume: 0.45 },
          { at: SECTION.difference.from - 0.42, name: "whoosh-soft", volume: 0.45 },
          { at: SECTION.ending.from - 0.42, name: "whoosh-soft", volume: 0.5 },
        ]}
      />
    </>
  );
};
