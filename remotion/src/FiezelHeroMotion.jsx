import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
  interpolate,
  Easing,
} from 'remotion';
import rig from '../public/assets/characters/face-rig.json';

// Pose-to-pose scale factors to maintain constant anatomical proportions
const NUSA_SCALES = {
  'full-thinking': 1.22,
  'full-oops': 1.06,
  'full-wave': 1.04,
  'full-celebrate': 1.10,
};

const MIRA_SCALES = {
  'full-neutral': 1.00,
  'full-explain': 1.00,
  'full-wave': 1.00,
  'full-cheer': 1.00,
};

const BLINK_AVAILABLE = {
  nusa: {
    'full-neutral': true,
    'full-oops': true,
    'full-wave': true,
  },
  mira: {
    'full-neutral': true,
    'full-explain': true,
    'full-wave': true,
  },
};

// Subtle feathered mouth component
const DynamicMouth = ({ char, pose, amp }) => {
  const faces = rig?.[char]?.[pose]?.faces ?? null;
  if (!faces || !faces[0]?.mouth) return null;
  const box = faces[0].mouth;
  const imgSrc = staticFile(`assets/characters/${char}/png/${pose}.png`);
  const mask =
    'radial-gradient(62% 62% at 50% 40%, #000 40%, rgba(0,0,0,.55) 68%, transparent 100%)';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${box[0] * 100}%`,
        top: `${box[1] * 100}%`,
        width: `${box[2] * 100}%`,
        height: `${box[3] * 100}%`,
        overflow: 'hidden',
        maskImage: mask,
        WebkitMaskImage: mask,
        pointerEvents: 'none',
      }}
    >
      <Img
        src={imgSrc}
        style={{
          position: 'absolute',
          left: `${(-box[0] / box[2]) * 100}%`,
          top: `${(-box[1] / box[3]) * 100}%`,
          width: `${100 / box[2]}%`,
          height: `${100 / box[3]}%`,
          transformOrigin: '50% 0%',
          transform: `scaleY(${1 + amp}) scaleX(${1 - amp * 0.3})`,
          display: 'block',
        }}
      />
    </div>
  );
};

// Floating thought bubbles
const ThoughtBubble = ({ glyph = '?', color = '#8C2233', frame, startFrame }) => {
  const localF = Math.max(0, frame - startFrame);
  return [0, 1, 2].map((i) => {
    const t = ((localF + i * 22) % 66) / 66;
    const alpha = Math.sin(t * Math.PI) * 0.85;
    const riseY = -t * 70;
    const driftX = Math.sin(t * Math.PI * 2) * 16;
    const rot = (t - 0.5) * 20;

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          right: -20,
          top: 10,
          fontFamily: "'Baloo 2', cursive",
          fontWeight: 900,
          fontSize: 22 + i * 10,
          color,
          opacity: alpha,
          transform: `translate(${driftX}px, ${riseY}px) rotate(${rot}deg)`,
          textShadow: '0 4px 10px rgba(255,255,255,0.8)',
          pointerEvents: 'none',
        }}
      >
        {glyph}
      </div>
    );
  });
};

export const FiezelHeroMotion = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig(); // 60 fps
  const totalFrames = 180; // 3.0s exact loop
  const loopT = (frame % totalFrames) / totalFrames; // 0..1
  const t = frame / fps;
  const twoPi = 2 * Math.PI;

  // ---------------------------------------------------------------------------
  // 1. STORY TIMELINE CHOREOGRAPHY (180 frames = 3.0s)
  // Phase 1 (0–44)   : Nusa Thinking (? bubbles) | Mira Neutral / Patient Mentor
  // Phase 2 (45–88)  : Nusa Oops/Aha! (hop + !)  | Mira Explaining (mouth talking + pointing)
  // Phase 3 (89–134) : Nusa Waving Arm           | Mira Waving Arm
  // Phase 4 (135–174): Nusa Big Leap Celebrate   | Mira Cheering with Fist Pump
  // Phase 5 (175–180): Seamless cross-fade back to Phase 1 for 0ms jump cut
  // ---------------------------------------------------------------------------
  const nusaTimeline = [
    { id: 'think', pose: 'full-thinking', start: 0, end: 44, bubble: '?' },
    { id: 'oops', pose: 'full-oops', start: 45, end: 88, bubble: '!' },
    { id: 'wave', pose: 'full-wave', start: 89, end: 134 },
    { id: 'celebrate', pose: 'full-celebrate', start: 135, end: 174 },
    { id: 'loop', pose: 'full-thinking', start: 175, end: 180 },
  ];

  const miraTimeline = [
    { id: 'neutral', pose: 'full-neutral', start: 0, end: 44, talk: false },
    { id: 'explain', pose: 'full-explain', start: 45, end: 88, talk: true },
    { id: 'wave', pose: 'full-wave', start: 89, end: 134, talk: false },
    { id: 'cheer', pose: 'full-cheer', start: 135, end: 174, talk: false },
    { id: 'loop', pose: 'full-neutral', start: 175, end: 180, talk: false },
  ];

  // Helper to determine active state in timeline
  const getCurrentState = (timeline) => {
    return timeline.find((s) => frame >= s.start && frame <= s.end) || timeline[0];
  };

  const nusaState = getCurrentState(nusaTimeline);
  const miraState = getCurrentState(miraTimeline);

  // Cross-fade opacity between poses (5 frames transition)
  const getCrossfade = (timeline) => {
    const s = getCurrentState(timeline);
    const progressIntoState = frame - s.start;
    if (progressIntoState < 4 && s.start > 0) {
      return progressIntoState / 4;
    }
    return 1;
  };

  const nusaOpacity = getCrossfade(nusaTimeline);
  const miraOpacity = getCrossfade(miraTimeline);

  // ---------------------------------------------------------------------------
  // 2. DETAILED ANATOMICAL PHYSICS PER POSE
  // ---------------------------------------------------------------------------
  // --- NUSA PHYSICS ---
  let nusaLift = 0;
  let nusaTy = 0;
  let nusaTx = 0;
  let nusaRot = 0;
  let nusaSx = 1;
  let nusaSy = 1;

  if (nusaState.id === 'think' || nusaState.id === 'loop') {
    // Gentle curious head tilt and breathing
    const bob = Math.sin(t * twoPi / 1.8);
    nusaTy = -bob * 8;
    nusaRot = Math.sin(t * twoPi / 2.2) * 2.8; // head tilt while pondering
    nusaSy = 1 + bob * 0.015;
    nusaSx = 1 - bob * 0.010;
  } else if (nusaState.id === 'oops') {
    // Startled little hop and nervous giggle wobble
    const progress = (frame - 45) / (88 - 45);
    const hop = Math.max(0, Math.sin(progress * Math.PI * 2)) * (progress < 0.5 ? 1 : 0);
    nusaLift = hop * 65;
    nusaTy = -nusaLift;
    nusaRot = Math.sin(t * twoPi / 0.35) * 3.2 * (1 - hop); // fast startled wobble
    nusaSy = 1 + hop * 0.05;
    nusaSx = 1 - hop * 0.03;
  } else if (nusaState.id === 'wave') {
    // Energetic hand wave: body leans into waving arm, rhythmic oscillation
    const waveCycle = Math.sin(t * twoPi / 0.75);
    nusaRot = waveCycle * 4.2; // arm/body sway
    nusaTx = waveCycle * 10;
    nusaTy = -Math.abs(waveCycle) * 8;
    nusaSy = 1 + Math.sin(t * twoPi / 1.5) * 0.02;
  } else if (nusaState.id === 'celebrate') {
    // Big joyous leap off the ground!
    const jumpProgress = (frame - 135) / (174 - 135);
    const jumpArc = Math.sin(jumpProgress * Math.PI); // 0 -> 1 -> 0
    nusaLift = jumpArc * 125; // 125px leap in the air!
    nusaTy = -nusaLift;
    nusaRot = Math.sin(jumpProgress * Math.PI * 2) * 4.0;
    if (jumpProgress > 0.82) {
      // Squash on landing
      nusaSy = 0.88;
      nusaSx = 1.12;
    } else {
      // Stretch in ascent
      nusaSy = 1 + jumpArc * 0.08;
      nusaSx = 1 - jumpArc * 0.05;
    }
  }

  // --- MIRA PHYSICS ---
  let miraLift = 0;
  let miraTy = 0;
  let miraTx = 0;
  let miraRot = 0;
  let miraSx = 1;
  let miraSy = 1;

  if (miraState.id === 'neutral' || miraState.id === 'loop') {
    // Poised breathing and gentle posture nod
    const bob = Math.sin(t * twoPi / 2.0);
    miraTy = -bob * 6;
    miraRot = Math.sin(t * twoPi / 3.0) * -1.2;
    miraSy = 1 + bob * 0.012;
  } else if (miraState.id === 'explain') {
    // Active teaching posture: leaning slightly forward towards student/user
    const bob = Math.sin(t * twoPi / 1.4);
    miraTy = -bob * 7;
    miraTx = Math.sin(t * twoPi / 2.5) * -8; // slight lean
    miraRot = -1.8 + Math.sin(t * twoPi / 1.8) * 1.5;
    miraSy = 1 + bob * 0.016;
  } else if (miraState.id === 'wave') {
    // Graceful teacher wave
    const waveCycle = Math.sin(t * twoPi / 0.85);
    miraRot = waveCycle * 3.2;
    miraTx = waveCycle * 6;
    miraTy = -Math.abs(waveCycle) * 6;
  } else if (miraState.id === 'cheer') {
    // Joyful celebration bounce with fist pump
    const cheerCycle = Math.sin(t * twoPi / 0.65);
    miraLift = Math.max(0, cheerCycle) * 35;
    miraTy = -miraLift;
    miraSy = 1 + cheerCycle * 0.03;
    miraSx = 1 - cheerCycle * 0.02;
  }

  // Mouth amplitude (dynamic speech phoneme simulation)
  const nusaMAmp =
    nusaState.id === 'celebrate'
      ? 0.12 + Math.sin(t * twoPi * 3) * 0.08
      : nusaState.id === 'oops'
      ? 0.08
      : 0.02 + Math.sin(t * twoPi * 1.2) * 0.02;

  const miraMAmp = miraState.talk
    ? 0.14 + 0.10 * Math.sin(t * twoPi * 2.8) + 0.06 * Math.sin(t * twoPi * 4.2)
    : miraState.id === 'cheer'
    ? 0.15 + Math.sin(t * twoPi * 3) * 0.07
    : 0.025;

  // Eyelid blinks
  const nusaCanBlink = BLINK_AVAILABLE.nusa[nusaState.pose] ?? false;
  const nusaBlink =
    nusaCanBlink &&
    ((frame >= 20 && frame <= 23) || (frame >= 108 && frame <= 111));

  const miraCanBlink = BLINK_AVAILABLE.mira[miraState.pose] ?? false;
  const miraBlink =
    miraCanBlink &&
    ((frame >= 32 && frame <= 35) || (frame >= 118 && frame <= 121));

  // ---------------------------------------------------------------------------
  // 3. CENTRAL PROCEDURAL GLASS ORBS (SKILLS UNIVERSE)
  // ---------------------------------------------------------------------------
  const wave1 = Math.sin(loopT * twoPi);
  const wave2 = Math.sin(loopT * 4 * Math.PI);
  const cos1 = Math.cos(loopT * twoPi);

  const orbFloat1 = Math.sin(loopT * twoPi) * 12;
  const orbFloat2 = Math.sin(loopT * twoPi + Math.PI * 0.5) * 14;
  const orbFloat3 = Math.sin(loopT * twoPi + Math.PI) * 11;
  const orbFloat4 = Math.sin(loopT * twoPi + Math.PI * 1.5) * 13;

  const coreScale = 1 + wave2 * 0.04;
  const coreGlow = 0.65 + wave1 * 0.18;

  // Particles
  const particles = [
    { x: 38, y: 32, r: 4, speed: 1, color: '#FFC700' },
    { x: 44, y: 24, r: 6, speed: 2, color: '#FFA000' },
    { x: 52, y: 22, r: 5, speed: 1, color: '#FFD54F' },
    { x: 62, y: 34, r: 4, speed: 2, color: '#FFC700' },
    { x: 35, y: 48, r: 5, speed: 1, color: '#2E8B69' },
    { x: 40, y: 62, r: 6, speed: 2, color: '#8C2233' },
    { x: 60, y: 64, r: 5, speed: 1, color: '#FFB300' },
    { x: 65, y: 48, r: 4, speed: 2, color: '#2E8B69' },
    { x: 48, y: 16, r: 7, speed: 1, color: '#FFE082' },
    { x: 50, y: 72, r: 5, speed: 2, color: '#FFC700' },
  ];

  // Story Status Caption Text
  let storyStatusEmoji = '🤔';
  let storyStatusTitle = 'Curious Discovery · Analyzing English Skills';
  let storyStatusSub = 'Nusa ponders grammatical nuances while core synapses harmonize.';

  if (frame >= 45 && frame < 89) {
    storyStatusEmoji = '💡';
    storyStatusTitle = 'Aha! Realization · Interactive Mentorship';
    storyStatusSub = 'Mira explains acoustic phonetics & sentence structure in real-time.';
  } else if (frame >= 89 && frame < 135) {
    storyStatusEmoji = '👋';
    storyStatusTitle = 'Engaging Dialogue · Speaking & Listening';
    storyStatusSub = 'Pair-learning connection established with zero cloud inference latency.';
  } else if (frame >= 135) {
    storyStatusEmoji = '🎉';
    storyStatusTitle = 'CEFR Level Mastery · Complete Fluency Unlocked';
    storyStatusSub = 'Adaptive OS rewards practice with stardust resonance and celebratory leap.';
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#FFF9EE',
        fontFamily: "'FZ Plus Jakarta Sans', 'Nunito', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* BACKGROUND */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(1300px 780px at 50% 28%, #FFFDF8 0%, #FFF4DC 52%, #F5E5C4 100%)',
        }}
      />

      {/* Sun Corona Aura */}
      <div
        style={{
          position: 'absolute',
          top: '4%',
          left: '50%',
          transform: `translate(-50%, 0) scale(${coreScale})`,
          width: 840,
          height: 840,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255, 199, 0, 0.18) 0%, rgba(255, 160, 0, 0.06) 48%, transparent 72%)',
          filter: 'blur(32px)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Botanical Leaves */}
      {[
        { l: 7, t: 16, rot: 24, icon: '🌿' },
        { l: 12, t: 72, rot: -32, icon: '🍃' },
        { l: 87, t: 18, rot: 45, icon: '🍃' },
        { l: 91, t: 74, rot: -18, icon: '🌿' },
      ].map((leaf, idx) => {
        const driftY = Math.sin(loopT * twoPi + idx) * 14;
        const driftRot = leaf.rot + Math.cos(loopT * twoPi + idx) * 8;
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${leaf.l}%`,
              top: `${leaf.t}%`,
              fontSize: 34,
              opacity: 0.22,
              transform: `translateY(${driftY}px) rotate(${driftRot}deg)`,
              filter: 'drop-shadow(0 8px 12px rgba(46,72,54,0.15))',
              userSelect: 'none',
            }}
          >
            {leaf.icon}
          </div>
        );
      })}

      {/* Floor Horizon Line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '24%',
          background:
            'linear-gradient(to top, rgba(201, 162, 75, 0.12) 0%, rgba(140, 34, 51, 0.02) 60%, transparent 100%)',
          borderTop: '1px solid rgba(240, 228, 207, 0.65)',
        }}
      />

      {/* SYNAPSE CURVES SVG */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        viewBox="0 0 1920 1080"
      >
        <defs>
          <linearGradient id="synapseGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFC700" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8C2233" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#2E8B69" stopOpacity="0.75" />
          </linearGradient>
          <filter id="synapseGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <ellipse
          cx="960"
          cy="480"
          rx={340 + wave1 * 8}
          ry={190 + cos1 * 6}
          fill="none"
          stroke="rgba(201, 162, 75, 0.22)"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          strokeDashoffset={loopT * 120}
        />

        {/* Synapse Lines to 4 Orbs */}
        <path
          d={`M 960 480 Q 960 380 960 ${270 + orbFloat1}`}
          fill="none"
          stroke="url(#synapseGold)"
          strokeWidth="2.5"
          strokeDasharray="8 6"
          strokeDashoffset={-loopT * 140}
          filter="url(#synapseGlow)"
        />
        <path
          d={`M 960 480 Q 860 440 ${760} ${420 + orbFloat2}`}
          fill="none"
          stroke="url(#synapseGold)"
          strokeWidth="2.5"
          strokeDasharray="8 6"
          strokeDashoffset={-loopT * 140}
          filter="url(#synapseGlow)"
        />
        <path
          d={`M 960 480 Q 1060 440 ${1160} ${420 + orbFloat3}`}
          fill="none"
          stroke="url(#synapseGold)"
          strokeWidth="2.5"
          strokeDasharray="8 6"
          strokeDashoffset={-loopT * 140}
          filter="url(#synapseGlow)"
        />
        <path
          d={`M 960 480 Q 960 580 960 ${650 + orbFloat4}`}
          fill="none"
          stroke="url(#synapseGold)"
          strokeWidth="2.5"
          strokeDasharray="8 6"
          strokeDashoffset={-loopT * 140}
          filter="url(#synapseGlow)"
        />
      </svg>

      {/* Floating Particles */}
      {particles.map((p, i) => {
        const pY = p.y + Math.sin(loopT * twoPi * p.speed + i) * 6;
        const pX = p.x + Math.cos(loopT * twoPi * p.speed + i) * 4;
        const pScale = 0.75 + Math.sin(loopT * twoPi * p.speed + i * 2) * 0.35;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${pX}%`,
              top: `${pY}%`,
              width: p.r,
              height: p.r,
              borderRadius: '50%',
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.r * 2.5}px ${p.color}`,
              transform: `scale(${pScale})`,
              opacity: 0.85,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* CENTRAL CORE BRAIN */}
      <div
        style={{
          position: 'absolute',
          left: 960,
          top: 480,
          transform: `translate(-50%, -50%) scale(${coreScale})`,
          width: 90,
          height: 90,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 30%, #FFFDF5 0%, #FFC700 45%, #E6A800 80%, #8C2233 100%)',
          boxShadow: `0 0 40px rgba(255, 199, 0, ${coreGlow}), 0 10px 24px rgba(42, 35, 28, 0.18)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4,
        }}
      >
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: `rotate(${loopT * 360}deg)`,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
          }}
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>

      {/* 4 PROCEDURAL GLASS ORBS */}
      {/* 1. TOP: GRAMMAR */}
      <div
        style={{
          position: 'absolute',
          left: 960,
          top: 270 + orbFloat1,
          transform: 'translate(-50%, -50%)',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 224, 130, 0.6) 35%, rgba(255, 199, 0, 0.45) 75%, rgba(201, 162, 75, 0.85) 100%)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.85)',
            boxShadow:
              '0 18px 36px rgba(230, 168, 0, 0.28), inset 0 -8px 18px rgba(255, 199, 0, 0.4), inset 0 6px 12px rgba(255, 255, 255, 0.9)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 18,
              width: 36,
              height: 18,
              borderRadius: '50%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), transparent)',
              transform: 'rotate(-32deg)',
            }}
          />
          <svg width="60" height="60" viewBox="0 0 100 100">
            <ellipse
              cx="50"
              cy="50"
              rx="38"
              ry="16"
              fill="none"
              stroke="#8C2233"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              transform={`rotate(${cos1 * 25}, 50, 50)`}
            />
            <polygon
              points="50,15 76,50 50,85 24,50"
              fill="url(#synapseGold)"
              stroke="#FFFFFF"
              strokeWidth="2"
              style={{
                transformOrigin: '50px 50px',
                transform: `scale(${1 + wave2 * 0.06})`,
              }}
            />
            <circle cx="50" cy="50" r="5" fill="#FFFFFF" />
          </svg>
        </div>
        <div
          style={{
            marginTop: 10,
            background: 'rgba(255, 255, 255, 0.92)',
            border: '1px solid rgba(255, 199, 0, 0.5)',
            color: '#4A3A28',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            padding: '4px 12px',
            borderRadius: 20,
            boxShadow: '0 4px 10px rgba(36, 26, 17, 0.08)',
          }}
        >
          GRAMMAR
        </div>
      </div>

      {/* 2. LEFT: LISTENING */}
      <div
        style={{
          position: 'absolute',
          left: 760,
          top: 420 + orbFloat2,
          transform: 'translate(-50%, -50%)',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 124,
            height: 124,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.95) 0%, rgba(169, 218, 198, 0.65) 40%, rgba(46, 139, 105, 0.5) 80%, rgba(31, 122, 99, 0.9) 100%)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.85)',
            boxShadow:
              '0 18px 36px rgba(46, 139, 105, 0.28), inset 0 -8px 18px rgba(31, 122, 99, 0.4), inset 0 6px 12px rgba(255, 255, 255, 0.9)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 18,
              width: 38,
              height: 20,
              borderRadius: '50%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.92), transparent)',
              transform: 'rotate(-32deg)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 48,
            }}
          >
            {[0, 1, 2, 3, 4].map((barIdx) => {
              const barHeight =
                14 + Math.abs(Math.sin(loopT * twoPi * 2 + barIdx * 1.35)) * 32;
              return (
                <div
                  key={barIdx}
                  style={{
                    width: 6,
                    height: `${barHeight}px`,
                    borderRadius: 4,
                    background: '#FFFFFF',
                    boxShadow: '0 2px 6px rgba(18, 33, 31, 0.35)',
                  }}
                />
              );
            })}
          </div>
        </div>
        <div
          style={{
            marginTop: 10,
            background: 'rgba(255, 255, 255, 0.92)',
            border: '1px solid rgba(46, 139, 105, 0.5)',
            color: '#12211F',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            padding: '4px 12px',
            borderRadius: 20,
            boxShadow: '0 4px 10px rgba(36, 26, 17, 0.08)',
          }}
        >
          LISTENING
        </div>
      </div>

      {/* 3. RIGHT: SPEAKING */}
      <div
        style={{
          position: 'absolute',
          left: 1160,
          top: 420 + orbFloat3,
          transform: 'translate(-50%, -50%)',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 124,
            height: 124,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 175, 185, 0.6) 38%, rgba(140, 34, 51, 0.55) 78%, rgba(90, 20, 32, 0.9) 100%)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.85)',
            boxShadow:
              '0 18px 36px rgba(140, 34, 51, 0.32), inset 0 -8px 18px rgba(90, 20, 32, 0.4), inset 0 6px 12px rgba(255, 255, 255, 0.9)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 18,
              width: 38,
              height: 20,
              borderRadius: '50%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.92), transparent)',
              transform: 'rotate(-32deg)',
            }}
          />
          <svg width="64" height="64" viewBox="0 0 100 100">
            <path
              d="M 62 30 A 24 24 0 0 1 62 70"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity={0.5 + Math.sin(loopT * twoPi * 2) * 0.4}
            />
            <path
              d="M 72 20 A 38 38 0 0 1 72 80"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity={0.5 + Math.sin(loopT * twoPi * 2 + 1) * 0.4}
            />
            <rect x="34" y="26" width="16" height="28" rx="8" fill="#FFFFFF" />
            <path
              d="M 26 42 A 16 16 0 0 0 58 42"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line x1="42" y1="58" x2="42" y2="70" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="32" y1="70" x2="52" y2="70" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        </div>
        <div
          style={{
            marginTop: 10,
            background: 'rgba(255, 255, 255, 0.92)',
            border: '1px solid rgba(140, 34, 51, 0.5)',
            color: '#5A1420',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            padding: '4px 12px',
            borderRadius: 20,
            boxShadow: '0 4px 10px rgba(36, 26, 17, 0.08)',
          }}
        >
          SPEAKING
        </div>
      </div>

      {/* 4. BOTTOM: READING */}
      <div
        style={{
          position: 'absolute',
          left: 960,
          top: 650 + orbFloat4,
          transform: 'translate(-50%, -50%)',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.95) 0%, rgba(147, 185, 214, 0.6) 38%, rgba(36, 54, 74, 0.65) 80%, rgba(18, 33, 49, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.85)',
            boxShadow:
              '0 18px 36px rgba(18, 33, 49, 0.32), inset 0 -8px 18px rgba(18, 33, 49, 0.4), inset 0 6px 12px rgba(255, 255, 255, 0.9)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 18,
              width: 36,
              height: 18,
              borderRadius: '50%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.92), transparent)',
              transform: 'rotate(-32deg)',
            }}
          />
          <svg width="58" height="58" viewBox="0 0 100 100">
            <path
              d="M 50 72 C 34 64 20 66 14 68 L 14 34 C 20 32 34 30 50 38 C 66 30 80 32 86 34 L 86 68 C 80 66 66 64 50 72 Z"
              fill="rgba(255, 255, 255, 0.25)"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <line x1="50" y1="38" x2="50" y2="72" stroke="#FFFFFF" strokeWidth="3" />
            <line x1="22" y1="44" x2="42" y2="46" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="22" y1="52" x2="38" y2="54" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="58" y1="46" x2="78" y2="44" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="62" y1="54" x2="78" y2="52" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <div
          style={{
            marginTop: 10,
            background: 'rgba(255, 255, 255, 0.92)',
            border: '1px solid rgba(36, 54, 74, 0.4)',
            color: '#12211F',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            padding: '4px 12px',
            borderRadius: 20,
            boxShadow: '0 4px 10px rgba(36, 26, 17, 0.08)',
          }}
        >
          READING
        </div>
      </div>

      {/* -------------------------------------------------------------------
          LAYER 4: LIVING ARTICULATED CHARACTERS (NUSA & MIRA)
         ------------------------------------------------------------------- */}

      {/* NUSA CONTAINER */}
      <div
        style={{
          position: 'absolute',
          left: '23%',
          bottom: '12%',
          transform: 'translateX(-50%)',
          zIndex: 6,
        }}
      >
        {/* Dynamic Contact Shadow reacting to high jumps and landing squash */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -8,
            transform: 'translateX(-50%)',
            width: Math.max(70, (260 - nusaLift * 1.3) * (nusaSx > 1.05 ? 1.25 : 1)),
            height: Math.max(10, (30 - nusaLift * 0.16) * (nusaSx > 1.05 ? 1.25 : 1)),
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, rgba(46,72,54,0.36) 0%, rgba(46,72,54,0.12) 55%, transparent 75%)',
            filter: 'blur(4px)',
            opacity: Math.max(0.08, 0.32 - nusaLift * 0.0022),
            pointerEvents: 'none',
          }}
        />

        {/* Nusa Sprite Assembly */}
        <div
          style={{
            height: 480 * (NUSA_SCALES[nusaState.pose] || 1.0),
            transformOrigin: '50% 95%',
            transform: `translate(${nusaTx}px, ${nusaTy}px) scale(${nusaSx}, ${nusaSy}) rotate(${nusaRot}deg)`,
            filter: 'drop-shadow(0 26px 30px rgba(42,35,28,0.22))',
            position: 'relative',
            opacity: nusaOpacity,
            transition: 'opacity 0.08s ease-in-out',
          }}
        >
          {/* Base Active Pose */}
          <Img
            src={staticFile(`assets/characters/nusa/png/${nusaState.pose}.png`)}
            style={{
              height: '100%',
              width: 'auto',
              display: 'block',
            }}
          />

          {/* Eyelid Blink Overlay */}
          {nusaCanBlink && (
            <Img
              src={staticFile(`assets/characters/nusa/png/blink/${nusaState.pose}.png`)}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: 'auto',
                display: 'block',
                opacity: nusaBlink ? 1 : 0,
                transition: 'opacity 0.03s',
              }}
            />
          )}

          {/* Dynamic Mouth Rig */}
          <DynamicMouth char="nusa" pose={nusaState.pose} amp={nusaMAmp} />

          {/* Thought / Exclamation Bubbles */}
          {nusaState.bubble && (
            <ThoughtBubble
              glyph={nusaState.bubble}
              frame={frame}
              startFrame={nusaState.start}
              color={nusaState.bubble === '?' ? '#8C2233' : '#FFC700'}
            />
          )}

          {/* Character Badge */}
          <div
            style={{
              position: 'absolute',
              top: 32,
              right: -14,
              background: '#FFC700',
              color: '#241A11',
              fontWeight: 800,
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 20,
              boxShadow: '0 4px 12px rgba(255,199,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>🐒</span>
            <span>Nusa</span>
          </div>
        </div>
      </div>

      {/* MIRA CONTAINER */}
      <div
        style={{
          position: 'absolute',
          left: '77%',
          bottom: '12%',
          transform: 'translateX(-50%)',
          zIndex: 6,
        }}
      >
        {/* Dynamic Contact Shadow */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -8,
            transform: 'translateX(-50%)',
            width: Math.max(120, 275 - miraLift * 1.5),
            height: Math.max(12, 32 - miraLift * 0.2),
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, rgba(46,72,54,0.34) 0%, rgba(46,72,54,0.12) 55%, transparent 75%)',
            filter: 'blur(4px)',
            opacity: Math.max(0.1, 0.3 - miraLift * 0.003),
            pointerEvents: 'none',
          }}
        />

        {/* Mira Sprite Assembly */}
        <div
          style={{
            height: 650 * (MIRA_SCALES[miraState.pose] || 1.0),
            transformOrigin: '50% 95%',
            transform: `translate(${miraTx}px, ${miraTy}px) scale(${miraSx}, ${miraSy}) rotate(${miraRot}deg)`,
            filter: 'drop-shadow(0 28px 34px rgba(42,35,28,0.22))',
            position: 'relative',
            opacity: miraOpacity,
            transition: 'opacity 0.08s ease-in-out',
          }}
        >
          {/* Base Active Pose */}
          <Img
            src={staticFile(`assets/characters/mira/png/${miraState.pose}.png`)}
            style={{
              height: '100%',
              width: 'auto',
              display: 'block',
            }}
          />

          {/* Eyelid Blink Overlay */}
          {miraCanBlink && (
            <Img
              src={staticFile(`assets/characters/mira/png/blink/${miraState.pose}.png`)}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: 'auto',
                display: 'block',
                opacity: miraBlink ? 1 : 0,
                transition: 'opacity 0.03s',
              }}
            />
          )}

          {/* Dynamic Mouth Rig (Speaking / Explaining / Cheering) */}
          <DynamicMouth char="mira" pose={miraState.pose} amp={miraMAmp} />

          {/* Character Badge */}
          <div
            style={{
              position: 'absolute',
              top: 50,
              left: -18,
              background: '#8C2233',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 20,
              boxShadow: '0 4px 12px rgba(140,34,51,0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>👩‍🏫</span>
            <span>Mira</span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------
          LAYER 5: TOP & BOTTOM EDITORIAL BRANDING & STORY HUD
         ------------------------------------------------------------------- */}
      {/* Top Banner Tag */}
      <div
        style={{
          position: 'absolute',
          top: 36,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(201, 162, 75, 0.35)',
          padding: '10px 24px',
          borderRadius: 999,
          boxShadow: '0 10px 28px rgba(36,26,17,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 10,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#2E8B69',
            boxShadow: '0 0 10px #2E8B69',
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#8C2233',
          }}
        >
          FIEZEL PERSONAL ENGLISH OS • SKILLS LAB
        </span>
      </div>

      {/* Dynamic Story HUD Card (Reacts to Character Choreography) */}
      <div
        style={{
          position: 'absolute',
          bottom: 34,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(240, 228, 207, 0.95)',
          borderRadius: 24,
          padding: '14px 38px',
          boxShadow: '0 18px 42px rgba(42, 35, 28, 0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          zIndex: 10,
          minWidth: 720,
        }}
      >
        <div style={{ fontSize: 30 }}>{storyStatusEmoji}</div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div
            style={{
              fontFamily: "'Baloo 2', 'Nunito', cursive",
              fontSize: 21,
              fontWeight: 800,
              color: '#241A11',
              lineHeight: 1.15,
            }}
          >
            {storyStatusTitle}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#6E5E47',
              letterSpacing: '0.01em',
            }}
          >
            {storyStatusSub}
          </div>
        </div>

        {/* CEFR Level Indicator Pills */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
          {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl, i) => (
            <span
              key={lvl}
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 6,
                background:
                  frame >= 135 && (lvl === 'C1' || lvl === 'C2')
                    ? '#2E8B69'
                    : i >= 4
                    ? '#8C2233'
                    : 'rgba(201, 162, 75, 0.15)',
                color:
                  (frame >= 135 && (lvl === 'C1' || lvl === 'C2')) || i >= 4
                    ? '#FFFFFF'
                    : '#4A3A28',
                transition: 'background 0.2s',
              }}
            >
              {lvl}
            </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
