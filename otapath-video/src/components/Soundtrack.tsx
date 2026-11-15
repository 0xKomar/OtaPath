import { Audio } from "@remotion/media";
import { staticFile, Track, useCurrentFrame, useVideoConfig } from "remotion";
import vo from "../data/vo.json";

const FULL = 0.38; // music level when nobody is speaking
const BED = 0.135; // music level under the narration

/** distance (s) from `t` to the nearest narration line (0 while someone speaks) */
const gapToSpeech = (t: number) => {
  let d = Infinity;
  for (const l of vo.lines) {
    if (t >= l.start - 0.05 && t <= l.start + l.duration) return 0;
    d = Math.min(d, t < l.start ? l.start - t : t - (l.start + l.duration));
  }
  return d;
};

/** Original score, ducked under the narration. */
export const Music = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = Math.min(1, gapToSpeech(frame / fps) / 0.55);
  const eased = g * g * (3 - 2 * g);
  return <Audio name="Score (original)" src={staticFile("music/otapath-theme.wav")} volume={BED + (FULL - BED) * eased} />;
};

/** Narration — one clip per sentence, placed by src/data/vo-placement.json. */
export const Narration = () => {
  const { fps } = useVideoConfig();
  return (
    <Track name="Narration">
      {vo.lines.map((l) => (
        <Audio key={l.id} name={l.text} from={Math.round(l.start * fps)} src={staticFile(`vo/${l.id}.wav`)} volume={0.78} />
      ))}
    </Track>
  );
};

export type SfxCue = { readonly at: number; readonly name: string; readonly volume?: number };

/** Sound effects for one scene; `at` is scene-local seconds. */
export const Sfx = ({ cues }: { readonly cues: readonly SfxCue[] }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {cues.map((c, i) => (
        <Audio
          key={`${c.name}-${i}`}
          name={`sfx · ${c.name}`}
          from={Math.max(0, Math.round(c.at * fps))}
          src={staticFile(`sfx/${c.name}.wav`)}
          volume={(c.volume ?? 0.5) * 0.9}
        />
      ))}
    </>
  );
};
