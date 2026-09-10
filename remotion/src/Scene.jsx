import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';

const src = (char, pose) => staticFile(`assets/characters/${char}/png/${pose}.png`);

// Warm jungle backdrop, flat-design friendly
export const Jungle = ({tint = 'green'}) => {
  const frame = useCurrentFrame();
  const bg = tint === 'green'
    ? 'radial-gradient(120% 90% at 50% 0%, #F2F7E6 0%, #E4EED2 45%, #D6E4C2 100%)'
    : 'radial-gradient(120% 90% at 50% 0%, #FDF3D6 0%, #F6E7BE 55%, #EED9A6 100%)';
  return (
    <AbsoluteFill style={{background: bg}}>
      {/* soft sun blob */}
      <div style={{position:'absolute', top:'-12%', right:'-6%', width:520, height:520, borderRadius:'50%',
        background:'radial-gradient(closest-side, rgba(255,225,150,.55), transparent)'}}/>
      {/* floating leaves */}
      {[...Array(8)].map((_,i)=>{
        const seed=(i*97)%100;
        const y=((frame*0.5 + seed*8) % 140) - 20;
        const x=8 + (seed%12)*8;
        const rot=(frame*1.6 + seed*30)%360;
        return <div key={i} style={{position:'absolute', left:`${x}%`, top:`${y}%`, fontSize:20+ (seed%20),
          opacity:.16, transform:`rotate(${rot}deg)`}}>{['🍃','🌿','🍂'][i%3]}</div>;
      })}
      {/* ground */}
      <AbsoluteFill style={{background:'linear-gradient(transparent 60%, rgba(111,163,104,.20))'}}/>
    </AbsoluteFill>
  );
};

// A shadow ellipse whose size reacts to jump lift
const Shadow = ({cx = 50, bottom = 12, w = 320, lift = 0}) => (
  <div style={{position:'absolute', left:`${cx}%`, bottom:`${bottom}%`, transform:'translateX(-50%)',
    width:w*(1 - lift*0.006), height:34*(1 - lift*0.004), borderRadius:'50%',
    background:'rgba(46,84,64,.20)', filter:'blur(3px)', opacity:0.28 - lift*0.0016}}/>
);

// Zzz particles for sleep
const Zzz = () => {
  const frame = useCurrentFrame();
  return [0,1,2].map(i=>{
    const t=((frame + i*20) % 60)/60;
    return <div key={i} style={{position:'absolute', left:'60%', top:'40%',
      fontFamily:'Baloo 2, sans-serif', fontWeight:800, color:'#2E5440',
      fontSize:20+i*10, opacity: Math.sin(t*Math.PI)*0.85,
      transform:`translate(${t*40}px, ${-t*90}px)`}}>z</div>;
  });
};

/**
 * motion: idle | wave | celebrate | sleep | cheer | walk
 */
export const Mascot = ({char='nusa', pose='full-neutral', motion='idle',
  height=64, cx=50, bottom=14, flip=false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  let ty=0, rot=0, sx=1, sy=1, lift=0, tx=0;
  const bob = Math.sin(t*2*Math.PI/2.4); // 2.4s cycle

  if (motion==='idle'){ ty = -bob*14; rot = bob*1.2; }
  else if (motion==='wave'){ ty=-Math.abs(bob)*10; rot = Math.sin(t*2*Math.PI/0.9)*3.2; }
  else if (motion==='celebrate' || motion==='cheer'){
    const p=(frame % (fps*1.3))/(fps*1.3);        // jump cycle
    const j=Math.sin(p*Math.PI);                   // 0..1..0
    lift=j*120; ty=-lift;
    if(p>0.82){ sy=0.94; sx=1.05; }                // squash on land
    else { sy=1+ j*0.03; sx=1 - j*0.02; }
  }
  else if (motion==='sleep'){ const b2=Math.sin(t*2*Math.PI/3.2); sy=1+b2*0.03; sx=1-b2*0.03; ty=-b2*4; }
  else if (motion==='walk'){
    ty=-Math.abs(Math.sin(t*2*Math.PI/0.55))*12; rot=Math.sin(t*2*Math.PI/0.55)*2.2;
  }

  return (
    <AbsoluteFill>
      <Shadow cx={cx} bottom={bottom-2} w={height*5} lift={lift}/>
      <div style={{position:'absolute', left:`${cx}%`, bottom:`${bottom}%`,
        transform:`translateX(-50%) translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${sx*(flip?-1:1)}, ${sy})`,
        transformOrigin:'50% 100%', height:`${height}%`, filter:'drop-shadow(0 22px 20px rgba(42,35,28,.22))'}}>
        <Img src={src(char,pose)} style={{height:'100%', width:'auto', display:'block'}}/>
      </div>
      {motion==='sleep' && <Zzz/>}
    </AbsoluteFill>
  );
};

// Title lower-third used in hero
export const Caption = ({title, sub, delay=10}) => {
  const frame=useCurrentFrame();
  const o=interpolate(frame,[delay,delay+18],[0,1],{extrapolateRight:'clamp',easing:Easing.out(Easing.cubic)});
  const y=interpolate(frame,[delay,delay+18],[24,0],{extrapolateRight:'clamp',easing:Easing.out(Easing.cubic)});
  return (
    <div style={{position:'absolute', left:60, bottom:56, opacity:o, transform:`translateY(${y}px)`}}>
      <div style={{fontFamily:'Baloo 2, sans-serif', fontWeight:800, fontSize:64, color:'#2A231C', lineHeight:1}}>{title}</div>
      <div style={{fontFamily:'Nunito, sans-serif', fontWeight:700, fontSize:24, color:'#7C2436', marginTop:8}}>{sub}</div>
    </div>
  );
};
