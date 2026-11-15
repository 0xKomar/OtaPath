import { Composition, Folder } from "remotion";
import { Main } from "./Main";
import { Difference } from "./scenes/Difference";
import { Ending } from "./scenes/Ending";
import { Feature1 } from "./scenes/Feature1";
import { Feature2 } from "./scenes/Feature2";
import { Feature3 } from "./scenes/Feature3";
import { Hook } from "./scenes/Hook";
import { Solution } from "./scenes/Solution";

export const RemotionRoot = () => {
  return (
    <>
      <Composition id="OtaPathDemo" component={Main} durationInFrames={3600} fps={30} width={1920} height={1080} />
      <Folder name="Scenes">
        <Composition id="Hook" component={Hook} durationInFrames={360} fps={30} width={1920} height={1080} />
        <Composition id="Solution" component={Solution} durationInFrames={390} fps={30} width={1920} height={1080} />
        <Composition id="Feature1" component={Feature1} durationInFrames={660} fps={30} width={1920} height={1080} />
        <Composition id="Feature2" component={Feature2} durationInFrames={720} fps={30} width={1920} height={1080} />
        <Composition id="Feature3" component={Feature3} durationInFrames={720} fps={30} width={1920} height={1080} />
        <Composition id="Difference" component={Difference} durationInFrames={450} fps={30} width={1920} height={1080} />
        <Composition id="Ending" component={Ending} durationInFrames={300} fps={30} width={1920} height={1080} />
      </Folder>
    </>
  );
};
