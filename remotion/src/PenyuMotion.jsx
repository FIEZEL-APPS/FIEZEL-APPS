import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';

export const PenyuMotion = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // -------------------------------------------------------------
  // 1. TIMING & STORY PHASES (150 frames = 5.00 seconds)
  // Phase 1 (0-50, 0.0s-1.67s): Swimming in gracefully from left
  // Phase 2 (50-95, 1.67s-3.17s): Turning head to viewer, smiling, blowing bubbles
  // Phase 3 (95-150, 3.17s-5.00s): Waving flipper, energetic glide up to sunlit surface
  // -------------------------------------------------------------

  // Overall Turtle Global Position & Glide
  // Starts at X: 22%, glides to center (48%), then swims smoothly toward top right (76%)
  const turtleX = interpolate(
    frame,
    [0, 50, 95, 150],
    [16, 44, 48, 76],
    { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) }
  );

  const turtleY = interpolate(
    frame,
    [0, 50, 95, 150],
    [54, 48, 47, 32],
    { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) }
  );

  // Turtle body overall tilt / pitch angle
  // Tilted slightly down as entering, leveling out when looking, tilted up as ascending
  const baseTilt = interpolate(
    frame,
    [0, 45, 95, 150],
    [-6, -1, 4, -14],
    { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }
  );

  // -------------------------------------------------------------
  // 2. FLIPPER STROKE LOCOMOTION PHYSICS (Anatomical wave cycles)
  // -------------------------------------------------------------
  // Stroke frequency: fast during entry & exit, gentle/idle in middle
  const strokeSpeed = frame < 45 ? 5.5 : frame < 95 ? 3.0 : 6.0;
  const strokePhase = t * strokeSpeed;

  // Primary front flipper paddle angle (-35 deg downstroke to +25 deg upstroke)
  const flipperWave = Math.sin(strokePhase);
  const flipperAngle = flipperWave * 28;

  // Subtle flipper tip flex (curvature illusion)
  const tipFlex = Math.cos(strokePhase) * 12;

  // Rear flipper rudder steering motion
  const rearFlipperWave = Math.sin(strokePhase - 1.2) * 16;

  // Secondary body rocking / surge from flipper thrust
  const bodySurgeY = Math.sin(strokePhase) * 6;
  const bodyRoll = Math.cos(strokePhase) * 3;

  // -------------------------------------------------------------
  // 3. HEAD & NECK ANATOMY (Extension, curiosity, rotation)
  // -------------------------------------------------------------
  // In Phase 2, head turns to face viewer with curiosity (rotates up, extends out)
  const headLookProgress = interpolate(
    frame,
    [45, 60, 90, 105],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) }
  );

  const headRot = (Math.sin(t * 2.5) * 3) + (headLookProgress * 12);
  const headExtendX = Math.cos(t * 2.5) * 4 + (headLookProgress * 8);
  const headExtendY = headLookProgress * -4;

  // -------------------------------------------------------------
  // 4. FACIAL EXPRESSIONS & BLINKING
  // -------------------------------------------------------------
  // Eye blinks: natural 4-frame blinks at frame 32 and frame 85
  const isBlinking =
    (frame >= 32 && frame <= 35) ||
    (frame >= 84 && frame <= 87) ||
    (frame >= 130 && frame <= 133);

  // Pupil movement (looking forward -> looking at viewer -> looking up to surface)
  const pupilOffsetX = interpolate(
    frame,
    [0, 50, 65, 95, 120, 150],
    [4, 4, 1, 1, 3, 5],
    { extrapolateRight: 'clamp' }
  );
  const pupilOffsetY = interpolate(
    frame,
    [0, 50, 65, 95, 120, 150],
    [0, 0, 1, 1, -2, -3],
    { extrapolateRight: 'clamp' }
  );

  // Mouth expression: neutral line -> cute open smile -> happy whistle
  const mouthOpen = interpolate(
    frame,
    [48, 62, 92, 105],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  );

  // Cheek blush pulse when smiling
  const blushOpacity = 0.35 + mouthOpen * 0.35;

  // -------------------------------------------------------------
  // 5. SPECIAL ACTION: FLIPPER WAVE (Phase 3: greeting gesture)
  // -------------------------------------------------------------
  // Right flipper raises into a friendly wave at frames 88-112
  const waveProgress = interpolate(
    frame,
    [88, 96, 110, 118],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) }
  );
  const waveAngle = waveProgress > 0 ? Math.sin((frame - 88) * 0.8) * 18 * waveProgress : 0;

  // Effective flipper angles blending swim stroke and wave
  const rightFlipperRot = (flipperAngle * (1 - waveProgress)) + ((-40 + waveAngle) * waveProgress);
  // Left flipper (far side) has opposite phase offset for realistic 3D swimming
  const leftFlipperRot = Math.sin(strokePhase + 0.6) * 22;

  // -------------------------------------------------------------
  // 6. UNDERWATER ENVIRONMENT & BUBBLES
  // -------------------------------------------------------------
  // Bubbles emitted from mouth around frames 65 - 100
  const bubbleList = [
    { startFrame: 64,  speed: 1.6, drift: 12, size: 9 },
    { startFrame: 70,  speed: 1.9, drift: -10, size: 14 },
    { startFrame: 76,  speed: 1.4, drift: 16, size: 7 },
    { startFrame: 82,  speed: 2.1, drift: -14, size: 12 },
    { startFrame: 90,  speed: 1.8, drift: 8,  size: 16 },
    { startFrame: 98,  speed: 2.2, drift: -18, size: 11 },
    { startFrame: 106, speed: 1.7, drift: 14, size: 8 },
  ];

  // Ambient water rays drift
  const rayShimmer = Math.sin(t * 1.8) * 6;

  // Seaweed sway in bottom background
  const kelpSway1 = Math.sin(t * 1.6) * 14;
  const kelpSway2 = Math.sin(t * 1.6 + 1.2) * 18;
  const kelpSway3 = Math.sin(t * 1.6 + 2.4) * 12;

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(180deg, #18839C 0%, #0F5C72 45%, #083747 100%)',
      overflow: 'hidden',
      fontFamily: 'Nunito, sans-serif',
    }}>
      {/* --- LAYER 1: SUNLIGHT SHIMMER RAYS (Ocean Caustics) --- */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.35,
        }}
        viewBox="0 0 1280 720"
      >
        <defs>
          <linearGradient id="rayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A8F5FF" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#48D1E8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#18839C" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`${120 + rayShimmer},0 ${260 + rayShimmer},0 ${380 + rayShimmer * 2},720 ${60 + rayShimmer * 2},720`} fill="url(#rayGrad)" />
        <polygon points={`${420 - rayShimmer},0 ${580 - rayShimmer},0 ${740 - rayShimmer * 2},720 ${320 - rayShimmer * 2},720`} fill="url(#rayGrad)" opacity="0.8" />
        <polygon points={`${750 + rayShimmer * 1.5},0 ${920 + rayShimmer * 1.5},0 ${1140 + rayShimmer * 3},720 ${640 + rayShimmer * 3},720`} fill="url(#rayGrad)" opacity="0.9" />
        <polygon points={`${1020 - rayShimmer},0 ${1180 - rayShimmer},0 ${1280},720 ${920},720`} fill="url(#rayGrad)" opacity="0.6" />
      </svg>

      {/* --- LAYER 2: BACKGROUND SEAWEED (Deep Underwater Flora) --- */}
      <svg
        style={{
          position: 'absolute',
          bottom: -10,
          left: 0,
          width: '100%',
          height: 380,
          pointerEvents: 'none',
        }}
        viewBox="0 0 1280 380"
      >
        {/* Left Kelp Cluster */}
        <path
          d={`M 60 380 Q ${75 + kelpSway1} 240, ${90 + kelpSway1 * 1.5} 120 Q ${105 + kelpSway1 * 2} 60, ${100 + kelpSway1 * 2.2} 20 Q ${80 + kelpSway1 * 1.8} 80, ${65 + kelpSway1} 220 Z`}
          fill="#0D4F46"
          opacity="0.6"
        />
        <path
          d={`M 110 380 Q ${130 + kelpSway2} 260, ${150 + kelpSway2 * 1.4} 150 Q ${165 + kelpSway2 * 2} 80, ${160 + kelpSway2 * 2.2} 40 Q ${140 + kelpSway2 * 1.6} 110, ${120 + kelpSway2} 240 Z`}
          fill="#136358"
          opacity="0.7"
        />
        {/* Right Kelp Cluster */}
        <path
          d={`M 1160 380 Q ${1180 + kelpSway3} 250, ${1190 + kelpSway3 * 1.5} 140 Q ${1200 + kelpSway3 * 2} 80, ${1210 + kelpSway3 * 2.2} 30 Q ${1180 + kelpSway3 * 1.7} 100, ${1165 + kelpSway3} 230 Z`}
          fill="#0D4F46"
          opacity="0.55"
        />
        <path
          d={`M 1210 380 Q ${1225 + kelpSway1} 270, ${1240 + kelpSway1 * 1.4} 160 Q ${1255 + kelpSway1 * 2} 90, ${1250 + kelpSway1 * 2.2} 50 Q ${1230 + kelpSway1 * 1.6} 120, ${1215 + kelpSway1} 250 Z`}
          fill="#167366"
          opacity="0.75"
        />
      </svg>

      {/* --- LAYER 3: THE 2D VECTOR SEA TURTLE (Penyu) CHARACTER RIG --- */}
      <div
        style={{
          position: 'absolute',
          left: `${turtleX}%`,
          top: `${turtleY + bodySurgeY * 0.2}%`,
          transform: `translate(-50%, -50%) rotate(${baseTilt + bodyRoll}deg)`,
          width: 440,
          height: 340,
          filter: 'drop-shadow(0 24px 35px rgba(2, 26, 34, 0.45))',
        }}
      >
        <svg viewBox="-220 -170 440 340" width="100%" height="100%">
          <defs>
            {/* Shell Top Gradients */}
            <linearGradient id="shellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#48B07E" />
              <stop offset="45%" stopColor="#2D855B" />
              <stop offset="100%" stopColor="#1B5E3C" />
            </linearGradient>
            <linearGradient id="shellRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#A7F3D0" />
              <stop offset="50%" stopColor="#5EEAD4" />
              <stop offset="100%" stopColor="#2DD4BF" />
            </linearGradient>

            {/* Skin / Flipper Gradients */}
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="60%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="skinDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Plastron (Belly) Gradient */}
            <linearGradient id="bellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="100%" stopColor="#FDE68A" />
            </linearGradient>

            {/* Scute Glow / Pattern */}
            <radialGradient id="scuteGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.8" />
              <stop offset="65%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.8" />
            </radialGradient>
          </defs>

          {/* ========================================================== */}
          {/* A. REAR LEFT FLIPPER (Far side fin) */}
          {/* ========================================================== */}
          <g transform={`translate(-85, 30) rotate(${-rearFlipperWave * 0.7 - 10})`}>
            <path
              d="M 0 0 C -20 15, -55 35, -75 25 C -85 20, -80 0, -55 -10 C -35 -18, -10 -10, 0 0 Z"
              fill="url(#skinDarkGrad)"
            />
          </g>

          {/* ========================================================== */}
          {/* B. FRONT LEFT FLIPPER (Far side pectoral wing) */}
          {/* ========================================================== */}
          <g transform={`translate(25, -20) rotate(${leftFlipperRot - 20})`}>
            <path
              d="M 0 0 C 35 -35, 95 -60, 140 -45 C 160 -38, 155 -15, 120 15 C 80 50, 25 35, 0 0 Z"
              fill="url(#skinDarkGrad)"
            />
            {/* Texture scales on far flipper */}
            <circle cx="65" cy="-20" r="7" fill="#047857" opacity="0.6" />
            <circle cx="95" cy="-22" r="6" fill="#047857" opacity="0.6" />
            <circle cx="118" cy="-12" r="5" fill="#047857" opacity="0.6" />
          </g>

          {/* ========================================================== */}
          {/* C. TAIL (Wagging gently) */}
          {/* ========================================================== */}
          <g transform={`translate(-115, 30) rotate(${Math.sin(strokePhase * 1.5) * 8})`}>
            <path
              d="M 0 -8 C -24 -2, -35 8, -25 14 C -12 18, 0 8, 0 -8 Z"
              fill="url(#skinGrad)"
            />
          </g>

          {/* ========================================================== */}
          {/* D. NECK & HEAD (Articulated anatomical group) */}
          {/* ========================================================== */}
          <g transform={`translate(${75 + headExtendX}, ${-10 + headExtendY}) rotate(${headRot})`}>
            {/* Stretchy Neck */}
            <path
              d="M -35 15 C -20 20, 5 22, 20 12 C 28 5, 20 -20, -10 -25 C -25 -28, -35 -20, -35 15 Z"
              fill="url(#skinGrad)"
            />

            {/* Turtle Head Base */}
            <path
              d="M 0 -30 C 35 -35, 75 -20, 85 5 C 92 25, 72 45, 40 45 C 10 45, -15 25, -15 -5 C -15 -22, -8 -28, 0 -30 Z"
              fill="url(#skinGrad)"
            />

            {/* Neck / Cranium Scale Spots */}
            <ellipse cx="10" cy="-20" rx="6" ry="4" fill="#059669" opacity="0.55" />
            <ellipse cx="28" cy="-20" rx="8" ry="5" fill="#059669" opacity="0.55" />
            <ellipse cx="48" cy="-15" rx="7" ry="4" fill="#059669" opacity="0.55" />

            {/* Cute Rosy Cheek Blush */}
            <circle
              cx="45"
              cy="22"
              r="12"
              fill="#F43F5E"
              opacity={blushOpacity}
              filter="blur(2px)"
            />

            {/* Expressive Beak Mouth (Opens into a beaming smile & blows bubbles) */}
            {mouthOpen > 0.3 ? (
              // Open Happy Mouth
              <g transform="translate(68, 18)">
                <path
                  d="M 0 0 Q 14 12, 10 22 Q -2 18, -4 4 Z"
                  fill="#881337"
                />
                {/* Pink Tongue */}
                <ellipse cx="6" cy="14" rx="5" ry="4" fill="#FB7185" />
              </g>
            ) : (
              // Cute Line Smile
              <path
                d="M 62 16 Q 74 24, 80 18"
                stroke="#1B4332"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
            )}

            {/* Nostril */}
            <circle cx="82" cy="6" r="2.2" fill="#1B4332" />

            {/* BIG VIBRANT CARTOON EYE */}
            <g transform="translate(42, -2)">
              {/* Eye White Sclera */}
              <ellipse cx="0" cy="0" rx="16" ry="19" fill="#FFFFFF" />

              {/* Eye Outline Rim */}
              <ellipse cx="0" cy="0" rx="16" ry="19" fill="none" stroke="#1B4332" strokeWidth="2.5" />

              {/* Moving Iris & Pupil */}
              <g transform={`translate(${pupilOffsetX}, ${pupilOffsetY})`}>
                {/* Colorful Turquoise Iris */}
                <ellipse cx="0" cy="0" rx="11" ry="13" fill="#0284C7" />
                <ellipse cx="0" cy="0" rx="9" ry="11" fill="#0369A1" />

                {/* Dark Pupil */}
                <ellipse cx="0" cy="0" rx="7" ry="8.5" fill="#0F172A" />

                {/* Glossy Highlights (Sparkle of life) */}
                <circle cx="-3.5" cy="-4" r="3.8" fill="#FFFFFF" />
                <circle cx="3" cy="3" r="1.8" fill="#FFFFFF" opacity="0.85" />
              </g>

              {/* EYELID BLINK MECHANISM (Smooth clipping overlay) */}
              {isBlinking && (
                <g>
                  {/* Closed Eyelid */}
                  <path
                    d="M -16 0 Q 0 16, 16 0 Q 0 -18, -16 0 Z"
                    fill="#34D399"
                  />
                  {/* Closed Eyelash Smile Line */}
                  <path
                    d="M -15 2 Q 0 14, 15 2"
                    stroke="#1B4332"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
              )}
            </g>
          </g>

          {/* ========================================================== */}
          {/* E. BELLY (Plastron Underlayer) */}
          {/* ========================================================== */}
          <path
            d="M -75 35 C -30 65, 45 60, 85 28 C 75 42, -15 68, -75 35 Z"
            fill="url(#bellyGrad)"
          />

          {/* ========================================================== */}
          {/* F. MAIN SHELL (Carapace with detailed scutes) */}
          {/* ========================================================== */}
          <g>
            {/* Shell Body Dome */}
            <path
              d="M -110 25 C -120 -55, 60 -75, 95 10 C 95 42, -90 55, -110 25 Z"
              fill="url(#shellGrad)"
              stroke="#134E32"
              strokeWidth="3.5"
            />

            {/* Outer Decorative Shell Rim Flange */}
            <path
              d="M -112 24 Q -95 44, -60 46 Q -20 48, 20 45 Q 60 40, 96 12 Q 88 28, 50 36 Q 0 42, -55 38 Q -95 34, -112 24 Z"
              fill="url(#shellRimGrad)"
            />

            {/* Geometric Scutes Pattern (Plates on turtle shell) */}
            {/* Center Scute 1 */}
            <path
              d="M -10 -48 L 30 -44 L 45 -15 L 15 5 L -20 -8 L -20 -38 Z"
              fill="url(#scuteGrad)"
              stroke="#D1FAE5"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Center Scute 2 (Front) */}
            <path
              d="M 32 -42 L 68 -25 L 75 8 L 48 -12 Z"
              fill="url(#scuteGrad)"
              stroke="#D1FAE5"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Center Scute 3 (Back) */}
            <path
              d="M -55 -40 L -12 -46 L -22 -6 L -65 -2 L -78 -22 Z"
              fill="url(#scuteGrad)"
              stroke="#D1FAE5"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Lower Scute Band */}
            <path
              d="M -62 0 L -18 -4 L 16 7 L 46 -10 L 72 10 L 40 28 L -10 32 L -58 24 Z"
              fill="#1B5E3C"
              opacity="0.4"
              stroke="#A7F3D0"
              strokeWidth="1.8"
            />
          </g>

          {/* ========================================================== */}
          {/* G. REAR RIGHT FLIPPER (Near side rudder paddle) */}
          {/* ========================================================== */}
          <g transform={`translate(-60, 42) rotate(${rearFlipperWave + 5})`}>
            <path
              d="M 0 0 C -20 18, -60 42, -80 32 C -92 25, -85 5, -60 -5 C -35 -15, -10 -5, 0 0 Z"
              fill="url(#skinGrad)"
              stroke="#047857"
              strokeWidth="2.5"
            />
            <circle cx="-38" cy="12" r="5.5" fill="#047857" opacity="0.6" />
            <circle cx="-56" cy="16" r="4.5" fill="#047857" opacity="0.6" />
          </g>

          {/* ========================================================== */}
          {/* H. FRONT RIGHT FLIPPER (Main near pectoral wing paddle) */}
          {/* ========================================================== */}
          <g transform={`translate(45, 12) rotate(${rightFlipperRot})`}>
            {/* Main curved flipper wing path */}
            <path
              d={`M 0 0 C 45 -40, 115 -65, 165 -45 C 190 -35, 185 -5, 145 35 C 95 80, 25 55, 0 0 Z`}
              fill="url(#skinGrad)"
              stroke="#047857"
              strokeWidth="3"
            />

            {/* Flipper Decorative Scale Spots */}
            <ellipse cx="60" cy="-18" rx="10" ry="7" fill="#047857" opacity="0.6" transform="rotate(-15)" />
            <ellipse cx="95" cy="-22" rx="11" ry="8" fill="#047857" opacity="0.6" transform="rotate(-10)" />
            <ellipse cx="130" cy="-15" rx="9" ry="6" fill="#047857" opacity="0.6" transform="rotate(-5)" />
            <ellipse cx="80" cy="14" rx="8" ry="6" fill="#047857" opacity="0.5" />
            <ellipse cx="115" cy="12" rx="7" ry="5" fill="#047857" opacity="0.5" />
            <circle cx="150" cy="5" r="5" fill="#047857" opacity="0.5" />
          </g>
        </svg>
      </div>

      {/* --- LAYER 4: PHYSICAL BUBBLE STREAM (Blowing from turtle mouth) --- */}
      {bubbleList.map((b, i) => {
        if (frame < b.startFrame) return null;
        const bLife = frame - b.startFrame;
        const bY = (turtleY - 5) - bLife * (b.speed * 2.8);
        const bX = (turtleX + 16) + Math.sin(bLife * 0.15 + i) * b.drift;
        const bOpacity = interpolate(bLife, [0, 8, 45, 60], [0, 0.85, 0.7, 0], {
          extrapolateRight: 'clamp',
        });
        const bScale = interpolate(bLife, [0, 15], [0.4, 1.0], { extrapolateRight: 'clamp' });

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${bX}%`,
              top: `${bY}%`,
              width: b.size,
              height: b.size,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95) 0%, rgba(167,243,208,0.5) 45%, rgba(6,182,212,0.3) 100%)',
              border: '1.5px solid rgba(255,255,255,0.85)',
              boxShadow: '0 0 10px rgba(165,243,252,0.6)',
              transform: `translate(-50%, -50%) scale(${bScale})`,
              opacity: bOpacity,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* --- LAYER 5: AMBIENT PLANKTON / GLOW MOTES --- */}
      {[...Array(12)].map((_, i) => {
        const seed = i * 43;
        const moteY = ((frame * 0.4 + seed * 9) % 110) - 5;
        const moteX = (seed * 11) % 96 + 2;
        const moteAlpha = 0.2 + 0.3 * Math.sin(t * 2 + i);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${moteX}%`,
              top: `${moteY}%`,
              width: 5 + (i % 4),
              height: 5 + (i % 4),
              borderRadius: '50%',
              background: '#A7F3D0',
              boxShadow: '0 0 8px #6EE7B7',
              opacity: moteAlpha,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* --- LAYER 6: TOP CINEMATIC BADGE --- */}
      <div
        style={{
          position: 'absolute',
          top: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(5, 46, 58, 0.75)',
          backdropFilter: 'blur(10px)',
          padding: '8px 24px',
          borderRadius: 30,
          border: '1px solid rgba(110, 231, 183, 0.4)',
          color: '#6EE7B7',
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          zIndex: 20,
        }}
      >
        <span>🐢</span>
        <span>Original 2D Vector Rig · Penyu Laut (Sea Turtle)</span>
      </div>

      {/* --- LAYER 7: BOTTOM STORY CAPTION --- */}
      <div
        style={{
          position: 'absolute',
          bottom: 34,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(5, 46, 58, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '12px 30px',
          borderRadius: 22,
          border: '1.5px solid rgba(94, 234, 212, 0.45)',
          boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 20,
        }}
      >
        <span style={{ fontSize: 22 }}>
          {frame < 50 ? '🌊' : frame < 95 ? '✨' : '👋'}
        </span>
        <span style={{
          color: '#F0FDFA',
          fontWeight: 800,
          fontSize: 18,
          fontFamily: 'Nunito, sans-serif',
        }}>
          {frame < 50
            ? 'Penyu meluncur anggun dengan dayungan sirip anatomis'
            : frame < 95
            ? 'Menoleh ke kamera, tersenyum ramah & meniup gelembung!'
            : 'Melambaikan sirip dan melesat menuju permukaan cerah'}
        </span>
      </div>
    </AbsoluteFill>
  );
};
