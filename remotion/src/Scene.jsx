import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import rig from '../public/assets/characters/face-rig.json';

const src = (char, pose) => staticFile(`assets/characters/${char}/png/${pose}.png`);
const blinkSrc = (char, pose) => staticFile(`assets/characters/${char}/png/blink/${pose}.png`);

const faceRig = (char, pose) => rig?.[char]?.[pose]?.faces ?? null;

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

// Thought bubbles for the thinking / curious poses
const Think = ({glyph='?', cx=64, cy=18}) => {
  const frame = useCurrentFrame();
  return [0,1,2].map(i=>{
    const t=((frame + i*26) % 78)/78;
    return <div key={i} style={{position:'absolute', left:`${cx}%`, top:`${cy}%`,
      fontFamily:'Baloo 2, sans-serif', fontWeight:800, color:'#7C2436',
      fontSize:18+i*12, opacity: Math.sin(t*Math.PI)*0.8,
      transform:`translate(${t*34}px, ${-t*80}px) rotate(${(t-0.5)*18}deg)`}}>{glyph}</div>;
  });
};

/** 3-frame blink with an occasional double-blink, offset per character */
const isBlinking = (frame, fps, seed = 0) => {
  const period = Math.round(fps * 2.7);
  const f = frame + seed;
  const t = ((f % period) + period) % period;
  const cycle = Math.floor(f / period);
  if (t < 3) return true;
  if (cycle % 3 === 0 && t >= 8 && t < 11) return true;   // double blink
  return false;
};

/** Subtle mouth motion: re-scales only the mouth patch of the same artwork.
 *  The patch is feathered with a radial mask so its edges never show a seam. */
const Mouth = ({imgSrc, box, amp}) => {
  const mask = 'radial-gradient(62% 62% at 50% 40%, #000 40%, rgba(0,0,0,.55) 68%, transparent 100%)';
  return (
    <div style={{position:'absolute', left:`${box[0]*100}%`, top:`${box[1]*100}%`,
      width:`${box[2]*100}%`, height:`${box[3]*100}%`, overflow:'hidden',
      maskImage:mask, WebkitMaskImage:mask}}>
      <Img src={imgSrc} style={{position:'absolute',
        left:`${(-box[0]/box[2])*100}%`, top:`${(-box[1]/box[3])*100}%`,
        width:`${100/box[2]}%`, height:`${100/box[3]}%`,
        transformOrigin:'50% 0%',
        transform:`scaleY(${1+amp}) scaleX(${1-amp*0.3})`, display:'block'}}/>
    </div>
  );
};

/**
 * motion: idle | wave | celebrate | sleep | cheer | walk | oops | curious | think
 * anchor: 'ground' (bottom aligned) | 'center' (head shots)
 */
export const Mascot = ({char='nusa', pose='full-neutral', motion='idle',
  height=64, cx=50, bottom=14, flip=false, anchor='ground', seed=0, talk=true}) => {
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
  else if (motion==='oops'){
    // startled little hop, then a nervous wobble
    const p=(frame % (fps*1.6))/(fps*1.6);
    const hop=Math.max(0, Math.sin(p*Math.PI*2)) * (p<0.5?1:0);
    lift=hop*70; ty=-lift;
    rot=Math.sin(t*2*Math.PI/0.45)*2.6*(1-hop);
    sy=1+hop*0.04; sx=1-hop*0.03;
  }
  else if (motion==='curious'){
    // slow lean + head sway, as if inspecting something
    ty=-bob*8; rot=Math.sin(t*2*Math.PI/3.6)*4.5; tx=Math.sin(t*2*Math.PI/3.6)*14;
    sy=1+Math.sin(t*2*Math.PI/2.0)*0.012;
  }
  else if (motion==='think'){
    ty=-bob*7; rot=Math.sin(t*2*Math.PI/4.2)*2.2;
    sy=1+Math.sin(t*2*Math.PI/2.8)*0.015; sx=1-Math.sin(t*2*Math.PI/2.8)*0.010;
  }

  const faces = faceRig(char, pose);
  const canBlink = !!faces && motion!=='sleep';
  const blink = canBlink && isBlinking(frame, fps, seed);
  // gentle, non-verbal mouth motion (breathing / soft talking)
  const mAmp = talk && motion!=='sleep'
    ? 0.045 + 0.045*Math.sin(t*2*Math.PI/1.15) + 0.015*Math.sin(t*2*Math.PI/0.43)
    : 0.015*Math.sin(t*2*Math.PI/3.2);

  const pos = anchor==='center'
    ? {top:'50%', left:`${cx}%`, transform:
        `translate(-50%,-50%) translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${sx*(flip?-1:1)}, ${sy})`,
       transformOrigin:'50% 60%'}
    : {bottom:`${bottom}%`, left:`${cx}%`, transform:
        `translateX(-50%) translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${sx*(flip?-1:1)}, ${sy})`,
       transformOrigin:'50% 100%'};

  return (
    <AbsoluteFill>
      {anchor!=='center' && <Shadow cx={cx} bottom={bottom-2} w={height*5} lift={lift}/>}
      <div style={{position:'absolute', ...pos, height:`${height}%`,
        filter:'drop-shadow(0 22px 20px rgba(42,35,28,.22))'}}>
        <div style={{position:'relative', height:'100%', width:'auto', display:'inline-block'}}>
          <Img src={src(char,pose)} style={{height:'100%', width:'auto', display:'block'}}/>
          {canBlink && (
            <Img src={blinkSrc(char,pose)} style={{position:'absolute', left:0, top:0,
              height:'100%', width:'auto', display:'block', opacity: blink?1:0}}/>
          )}
          {faces && faces.map((f,i)=> f.mouth
            ? <Mouth key={i} imgSrc={blink ? blinkSrc(char,pose) : src(char,pose)}
                box={f.mouth} amp={mAmp}/>
            : null)}
        </div>
      </div>
      {motion==='sleep' && <Zzz/>}
      {motion==='think' && <Think glyph="?" cx={cx+18} cy={12}/>}
      {motion==='curious' && <Think glyph="!" cx={cx+20} cy={10}/>}
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
