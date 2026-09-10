import React from 'react';
import {Composition, AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {Jungle, Mascot, Caption} from './Scene.jsx';

const FPS = 30;

const Solo = ({char, pose, motion, tint='green', height=66, bottom=14, anchor='ground', seed=0}) => (
  <AbsoluteFill>
    <Jungle tint={tint}/>
    <Mascot char={char} pose={pose} motion={motion} height={height} bottom={bottom}
      anchor={anchor} seed={seed}/>
  </AbsoluteFill>
);

const Hero = () => (
  <AbsoluteFill>
    <Jungle tint="green"/>
    {/* Nusa (monkey) is deliberately smaller than Mira (human) — realistic scale */}
    <Mascot char="nusa" pose="full-neutral" motion="idle" height={48} cx={36} bottom={15} seed={0}/>
    <Mascot char="mira" pose="full-wave"    motion="wave" height={72} cx={66} bottom={15} seed={19}/>
    <Caption title="Nusa & Mira" sub="FIEZEL Character Universe · Motion by Remotion"/>
  </AbsoluteFill>
);

const WalkScene = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const cx = interpolate(frame, [0, durationInFrames], [16, 84]);
  return (
    <AbsoluteFill>
      <Jungle tint="green"/>
      <Mascot char="team" pose="walking" motion="walk" height={62} cx={cx} bottom={16}/>
    </AbsoluteFill>
  );
};

export const RemotionRoot = () => (
  <>
    <Composition id="Hero" component={Hero} durationInFrames={150} fps={FPS} width={1280} height={720}/>
    <Composition id="NusaWave" component={Solo} durationInFrames={90} fps={FPS} width={900} height={900}
      defaultProps={{char:'nusa', pose:'full-wave', motion:'wave', height:70}}/>
    <Composition id="NusaCelebrate" component={Solo} durationInFrames={104} fps={FPS} width={900} height={900}
      defaultProps={{char:'nusa', pose:'full-celebrate', motion:'celebrate', height:64, bottom:16}}/>
    <Composition id="NusaSleep" component={Solo} durationInFrames={120} fps={FPS} width={900} height={900}
      defaultProps={{char:'nusa', pose:'full-sleep', motion:'sleep', tint:'sand', height:52, bottom:26}}/>
    <Composition id="NusaOops" component={Solo} durationInFrames={96} fps={FPS} width={900} height={900}
      defaultProps={{char:'nusa', pose:'full-oops', motion:'oops', height:66, bottom:16, seed:7}}/>
    <Composition id="NusaCurious" component={Solo} durationInFrames={120} fps={FPS} width={900} height={900}
      defaultProps={{char:'nusa', pose:'head-curious', motion:'curious', tint:'sand', height:74,
        anchor:'center', seed:13}}/>
    <Composition id="NusaThinking" component={Solo} durationInFrames={126} fps={FPS} width={900} height={900}
      defaultProps={{char:'nusa', pose:'full-thinking', motion:'think', height:72, bottom:14, seed:5}}/>
    <Composition id="MiraCheer" component={Solo} durationInFrames={104} fps={FPS} width={900} height={900}
      defaultProps={{char:'mira', pose:'full-cheer', motion:'cheer', height:66, bottom:16}}/>
    <Composition id="MiraWave" component={Solo} durationInFrames={90} fps={FPS} width={900} height={900}
      defaultProps={{char:'mira', pose:'full-wave', motion:'wave', height:68, seed:11}}/>
    <Composition id="TeamWalk" component={WalkScene} durationInFrames={140} fps={FPS} width={1280} height={720}/>
  </>
);
