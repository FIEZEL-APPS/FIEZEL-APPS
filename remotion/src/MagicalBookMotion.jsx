import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';

export const MagicalBookMotion = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig(); // 60 fps
  const totalFrames = 180; // 3.0 seconds exact
  const loopT = (frame % totalFrames) / totalFrames; // 0..1 perfectly cyclic
  const t = frame / fps;

  // -------------------------------------------------------------------------
  // 1. SEAMLESS FLOATING PHYSICS
  // The entire book assembly floats with an exact sinusoidal rhythm (1 cycle in 3s)
  // At frame 0 and frame 180, floatY is 0 and velocity is identical!
  // -------------------------------------------------------------------------
  const floatCycle = Math.sin(loopT * 2 * Math.PI);
  const floatY = floatCycle * -18; // 18px smooth vertical levitation
  const floatTilt = Math.cos(loopT * 2 * Math.PI) * 1.5; // subtle 1.5 deg tilt

  // Under-book soft contact shadow that expands and softens with levitation
  const shadowScale = 1 - (floatY / -18) * 0.12;
  const shadowOpacity = 0.28 - (floatY / -18) * 0.08;

  // -------------------------------------------------------------------------
  // 2. BOOK OPENING & CLOSING TIMELINE (Exact 3.0s Choreography)
  // - Frames 0 - 45   (0.00s - 0.75s): Closed book floating in quiet anticipation
  // - Frames 45 - 90  (0.75s - 1.50s): Front cover opens gracefully (0 -> 180 deg)
  // - Frames 90 - 145 (1.50s - 2.42s): Full open bloom, pages orbiting
  // - Frames 145 - 180(2.42s - 3.00s): Pages return, cover closes smoothly (180 -> 0 deg)
  // -------------------------------------------------------------------------

  // Open progress: 0 (fully closed) to 1 (fully open)
  // Built with symmetric C1 smooth transitions so frame 0 === frame 180 === 0
  const openProgress = interpolate(
    frame,
    [0, 42, 88, 142, 178, 180],
    [0, 0, 1, 1, 0, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.cubic),
    }
  );

  // Cover angle: 0deg when closed, swings up and left to -172deg when open
  const coverAngle = -openProgress * 172;

  // Book spine flex during open
  const spineSpread = openProgress * 22;

  // Golden inner light radiance (expands as book opens)
  const glowIntensity = interpolate(
    frame,
    [40, 85, 142, 175],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------------------
  // 3. FLYING ORBITING PAGES (4 Enchanted Knowledge Sheets)
  // Emerge from gutter at frame 82, orbit in 3D ellipse, return at frame 155
  // -------------------------------------------------------------------------
  const flyingPages = [
    {
      id: 1,
      title: 'Cosmos',
      symbol: '✦',
      themeColor: '#ECC968',
      orbitRadiusX: 280,
      orbitRadiusY: 100,
      baseAngle: 0,
      speed: 1.0,
      floatPhase: 0,
      startFrame: 78,
      landFrame: 154,
    },
    {
      id: 2,
      title: 'Story',
      symbol: '✒',
      themeColor: '#7DD3FC',
      orbitRadiusX: 310,
      orbitRadiusY: 110,
      baseAngle: Math.PI * 0.5,
      speed: 1.0,
      floatPhase: 1.5,
      startFrame: 84,
      landFrame: 158,
    },
    {
      id: 3,
      title: 'Science',
      symbol: '⚛',
      themeColor: '#A7F3D0',
      orbitRadiusX: 260,
      orbitRadiusY: 90,
      baseAngle: Math.PI * 1.0,
      speed: 1.0,
      floatPhase: 3.0,
      startFrame: 80,
      landFrame: 150,
    },
    {
      id: 4,
      title: 'Nature',
      symbol: '🌿',
      themeColor: '#FBCFE8',
      orbitRadiusX: 300,
      orbitRadiusY: 105,
      baseAngle: Math.PI * 1.5,
      speed: 1.0,
      floatPhase: 4.5,
      startFrame: 88,
      landFrame: 160,
    },
  ];

  // -------------------------------------------------------------------------
  // 4. SEAMLESS AMBIENT STARDUST PARTICLES (Loop-locked)
  // Uses modulo arithmetic so positions at frame 0 match frame 180 perfectly
  // -------------------------------------------------------------------------
  const ambientParticles = Array.from({ length: 24 }).map((_, i) => {
    const seed = i * 29.3;
    const speed = 0.5 + (i % 3) * 0.25;
    // Cyclic vertical drift
    const yNorm = ((frame * speed + seed * 10) % totalFrames) / totalFrames;
    const py = 950 - yNorm * 750;
    const px = 200 + ((seed * 47) % 880) + Math.sin(loopT * 2 * Math.PI + i) * 20;
    const pSize = 3 + (i % 4) * 1.5;
    const pOpacity = Math.sin(yNorm * Math.PI) * (0.3 + (i % 3) * 0.25);
    return { px, py, pSize, pOpacity, color: i % 2 === 0 ? '#ECC968' : '#7DD3FC' };
  });

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at 50% 45%, #131E3A 0%, #0C1326 50%, #060913 100%)',
        overflow: 'hidden',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* --- BACKGROUND NEBULA / GLOW PARTICLES --- */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        viewBox="0 0 1920 1080"
      >
        <defs>
          <radialGradient id="centerAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ECC968" stopOpacity={0.18 * glowIntensity + 0.05} />
            <stop offset="40%" stopColor="#38BDF8" stopOpacity={0.08 * glowIntensity + 0.03} />
            <stop offset="100%" stopColor="#060913" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Central Magical Ambient Glow */}
        <circle cx="960" cy="560" r="540" fill="url(#centerAura)" />

        {/* Ambient Stardust */}
        {ambientParticles.map((p, idx) => (
          <circle
            key={idx}
            cx={p.px}
            cy={p.py}
            r={p.pSize}
            fill={p.color}
            opacity={p.pOpacity}
            filter="drop-shadow(0 0 4px rgba(236,201,104,0.6))"
          />
        ))}
      </svg>

      {/* --- FLOATING SHADOW UNDER BOOK --- */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '73%',
          width: 520 * shadowScale,
          height: 60 * shadowScale,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(3, 7, 18, 0.75) 0%, rgba(3, 7, 18, 0.25) 55%, transparent 75%)',
          filter: 'blur(16px)',
          opacity: shadowOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* --- MAIN HERO SCENE CONTAINER (Isometric 3/4 Perspective) --- */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '48%',
          width: 900,
          height: 600,
          transform: `translate(-50%, -50%) translateY(${floatY}px) rotate(${floatTilt}deg)`,
          perspective: 1400,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* ================================================================= */}
        {/* LAYER A: BACK FLYING PAGES (Z < 0 behind the book) */}
        {/* ================================================================= */}
        {flyingPages.map((pg) => {
          // Lifecycle progress within flight window
          if (frame < pg.startFrame || frame > pg.landFrame) return null;
          const flightP = (frame - pg.startFrame) / (pg.landFrame - pg.startFrame);
          
          // Emerge scale (pops out from book center, tucks back in)
          const scale = Math.sin(flightP * Math.PI) * 1.0;
          if (scale <= 0.01) return null;

          // Continuous orbital angle
          const angle = pg.baseAngle + (t * 2.2 * pg.speed);
          const orbitZ = Math.sin(angle); // Z depth indicator
          if (orbitZ >= 0) return null; // Only render back pages here

          const px = 450 + Math.cos(angle) * pg.orbitRadiusX;
          const py = 290 + Math.sin(angle) * pg.orbitRadiusY - 30;
          const tilt = Math.cos(angle) * 18;

          return (
            <div
              key={pg.id}
              style={{
                position: 'absolute',
                left: px,
                top: py,
                width: 90,
                height: 125,
                transform: `translate(-50%, -50%) scale(${scale}) rotate(${tilt}deg)`,
                borderRadius: 10,
                background: 'linear-gradient(145deg, #FFFDF7 0%, #F5EFE0 100%)',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
                border: '1.5px solid rgba(236, 201, 104, 0.65)',
                padding: 10,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: 0.92,
                zIndex: 5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, color: pg.themeColor }}>{pg.symbol}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#A3906B', letterSpacing: '0.05em' }}>{pg.title}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ height: 3, width: '85%', background: '#E2D9C5', borderRadius: 2 }} />
                <div style={{ height: 3, width: '100%', background: '#E2D9C5', borderRadius: 2 }} />
                <div style={{ height: 3, width: '60%', background: '#E2D9C5', borderRadius: 2 }} />
              </div>
              <div style={{ height: 2, width: '40%', background: pg.themeColor, borderRadius: 1 }} />
            </div>
          );
        })}

        {/* ================================================================= */}
        {/* LAYER B: THE HARDCOVER NOVEL (3D Hinged Vector Book Assembly) */}
        {/* ================================================================= */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 480,
            height: 330,
            transform: 'translate(-50%, -50%) rotateX(24deg) rotateY(-18deg) rotateZ(6deg)',
            transformStyle: 'preserve-3d',
            zIndex: 10,
          }}
        >
          {/* 1. BACK COVER (Stationary Base Hardcover) */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 250,
              height: 330,
              borderRadius: '6px 14px 14px 6px',
              background: 'linear-gradient(135deg, #162442 0%, #0F1A30 100%)',
              boxShadow: '0 20px 45px rgba(2, 6, 15, 0.65)',
              border: '2px solid rgba(236, 201, 104, 0.4)',
              boxSizing: 'border-box',
            }}
          />

          {/* 2. PAPER PAGES BLOCK (Stacked Gilded Sheets) */}
          <div
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              width: 236,
              height: 314,
              borderRadius: '4px 10px 10px 4px',
              background: 'linear-gradient(90deg, #FBF8EE 0%, #F5ECD8 92%, #ECC968 100%)',
              boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.08), 4px 6px 16px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              padding: 20,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* Right Page Content (Visible when opened) */}
            <div
              style={{
                width: '100%',
                opacity: openProgress,
                transition: 'opacity 0.2s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {/* Decorative Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#C5A85A', letterSpacing: '0.12em' }}>CHAPTER I</span>
                <span style={{ fontSize: 12, color: '#C5A85A' }}>✦</span>
              </div>

              {/* Vector Paragraph Placeholder Lines */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 4, background: '#ECC968', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#162442', fontWeight: 900, fontSize: 12 }}>A</div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
                    <div style={{ height: 4, width: '100%', background: '#D6C8AF', borderRadius: 2 }} />
                    <div style={{ height: 4, width: '85%', background: '#D6C8AF', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ height: 4, width: '100%', background: '#D6C8AF', borderRadius: 2 }} />
                <div style={{ height: 4, width: '92%', background: '#D6C8AF', borderRadius: 2 }} />
                <div style={{ height: 4, width: '96%', background: '#D6C8AF', borderRadius: 2 }} />
                <div style={{ height: 4, width: '75%', background: '#D6C8AF', borderRadius: 2 }} />
              </div>

              {/* Central Astrolabe / Celestial Emblem on Page */}
              <div style={{ alignSelf: 'center', margin: '4px 0' }}>
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="26" fill="none" stroke="#ECC968" strokeWidth="1.2" strokeDasharray="3 2" />
                  <circle cx="30" cy="30" r="18" fill="none" stroke="#ECC968" strokeWidth="1.5" />
                  <polygon points="30,8 35,26 52,30 35,34 30,52 25,34 8,30 25,26" fill="#FBF0D2" stroke="#ECC968" strokeWidth="1" />
                  <circle cx="30" cy="30" r="4" fill="#C5A85A" />
                </svg>
              </div>

              {/* Page Footer */}
              <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#A3906B' }}>— 1 —</div>
            </div>
          </div>

          {/* 3. GOLDEN GLOW LIGHT BEAM (Emanating from inside book) */}
          <div
            style={{
              position: 'absolute',
              left: 235,
              top: -60,
              width: 140,
              height: 440,
              transform: 'translateX(-50%)',
              background: 'radial-gradient(ellipse at 50% 60%, rgba(254, 240, 138, 0.65) 0%, rgba(236, 201, 104, 0.35) 45%, transparent 75%)',
              filter: 'blur(20px)',
              opacity: glowIntensity,
              pointerEvents: 'none',
              zIndex: 15,
            }}
          />

          {/* 4. BOOK SPINE (Central Hinge Joint) */}
          <div
            style={{
              position: 'absolute',
              left: 235 - (spineSpread * 0.5),
              top: 0,
              width: 24 + spineSpread,
              height: 330,
              background: 'linear-gradient(90deg, #10192E 0%, #1A2C4F 50%, #10192E 100%)',
              borderTop: '2px solid rgba(236, 201, 104, 0.5)',
              borderBottom: '2px solid rgba(236, 201, 104, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              alignItems: 'center',
              boxSizing: 'border-box',
              padding: '16px 0',
              zIndex: 18,
            }}
          >
            {/* Gold Spine Ribs */}
            {[0, 1, 2, 3, 4].map((rib) => (
              <div
                key={rib}
                style={{
                  width: '80%',
                  height: 3,
                  background: 'linear-gradient(90deg, #ECC968 0%, #FFF3C4 50%, #C5A85A 100%)',
                  borderRadius: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              />
            ))}
          </div>

          {/* 5. FRONT HARDCOVER (Swings open on Y axis anchored at Spine) */}
          <div
            style={{
              position: 'absolute',
              right: 240,
              top: 0,
              width: 250,
              height: 330,
              transformOrigin: 'right center', // Hinge anchored at the spine
              transform: `rotateY(${coverAngle}deg)`,
              transformStyle: 'preserve-3d',
              zIndex: 25,
            }}
          >
            {/* --- 5A. OUTSIDE FRONT COVER (Visible when book is closed) --- */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                borderRadius: '14px 6px 6px 14px',
                background: 'linear-gradient(145deg, #1B2B4E 0%, #111C34 100%)',
                boxShadow: openProgress < 0.1 ? '0 16px 40px rgba(0, 0, 0, 0.55)' : 'none',
                border: '2px solid rgba(236, 201, 104, 0.45)',
                backfaceVisibility: 'hidden',
                padding: 24,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              {/* Gold Foil Ornate Filigree Corner Accents */}
              <div style={{ position: 'absolute', top: 10, left: 10, width: 22, height: 22, borderTop: '2px solid #ECC968', borderLeft: '2px solid #ECC968', borderRadius: '4px 0 0 0' }} />
              <div style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderTop: '2px solid #ECC968', borderRight: '2px solid #ECC968', borderRadius: '0 4px 0 0' }} />
              <div style={{ position: 'absolute', bottom: 10, left: 10, width: 22, height: 22, borderBottom: '2px solid #ECC968', borderLeft: '2px solid #ECC968', borderRadius: '0 0 0 4px' }} />
              <div style={{ position: 'absolute', bottom: 10, right: 10, width: 22, height: 22, borderBottom: '2px solid #ECC968', borderRight: '2px solid #ECC968', borderRadius: '0 0 4px 0' }} />

              {/* Top Subtitle */}
              <div style={{ fontSize: 10, fontWeight: 800, color: '#ECC968', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 8 }}>
                CHRONICLES OF
              </div>

              {/* Main Cover Title */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Baloo 2', cursive", fontSize: 26, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '0.04em' }}>
                  KNOWLEDGE
                </div>
                <div style={{ height: 2, width: 80, background: 'linear-gradient(90deg, transparent, #ECC968, transparent)', margin: '6px auto' }} />
              </div>

              {/* Central Embossed Golden Emblem */}
              <div style={{ margin: '8px 0' }}>
                <svg width="86" height="86" viewBox="0 0 86 86">
                  {/* Concentric Golden Halo Rings */}
                  <circle cx="43" cy="43" r="38" fill="none" stroke="#ECC968" strokeWidth="1.2" strokeDasharray="4 2" opacity="0.8" />
                  <circle cx="43" cy="43" r="32" fill="#15223E" stroke="#ECC968" strokeWidth="1.8" />
                  <circle cx="43" cy="43" r="28" fill="none" stroke="#ECC968" strokeWidth="0.8" opacity="0.6" />
                  {/* Star of Wisdom */}
                  <polygon points="43,18 47,38 67,43 47,48 43,68 39,48 19,43 39,38" fill="url(#goldStarGrad)" stroke="#ECC968" strokeWidth="1" />
                  <circle cx="43" cy="43" r="5" fill="#FFF3C4" />
                  <defs>
                    <linearGradient id="goldStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFF2B2" />
                      <stop offset="50%" stopColor="#ECC968" />
                      <stop offset="100%" stopColor="#C5A85A" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Author / Seal */}
              <div style={{ fontSize: 9, fontWeight: 700, color: '#C7B187', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
                AN INTERACTIVE TALE
              </div>
            </div>

            {/* --- 5B. INSIDE FRONT COVER (Revealed when opened) --- */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                borderRadius: '6px 14px 14px 6px',
                background: 'linear-gradient(135deg, #F9F5EC 0%, #EDE4D0 100%)',
                transform: 'rotateY(180deg)', // Inside face
                backfaceVisibility: 'hidden',
                padding: 20,
                boxSizing: 'border-box',
                border: '2px solid rgba(236, 201, 104, 0.4)',
                boxShadow: 'inset 0 0 14px rgba(0, 0, 0, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {/* Left Page (Frontispiece Illustration) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#A3906B', fontWeight: 800 }}>PROLOGUE</span>
                <span style={{ fontSize: 12, color: '#C5A85A' }}>✦</span>
              </div>

              {/* Elegant Vector Art on Left Page */}
              <div style={{ alignSelf: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <svg width="70" height="70" viewBox="0 0 70 70">
                  <circle cx="35" cy="35" r="30" fill="none" stroke="#E2D6BC" strokeWidth="2" />
                  <path d="M 35 15 C 22 25, 22 45, 35 55 C 48 45, 48 25, 35 15 Z" fill="#F3EAD5" stroke="#C5A85A" strokeWidth="1.5" />
                  <circle cx="35" cy="35" r="7" fill="#ECC968" />
                  <line x1="35" y1="5" x2="35" y2="65" stroke="#C5A85A" strokeWidth="1" strokeDasharray="2 2" />
                </svg>
                <span style={{ fontSize: 10, fontStyle: 'italic', color: '#8C7B5D' }}>"The Gateway of Ideas"</span>
              </div>

              {/* Text Lines */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ height: 3.5, width: '100%', background: '#D6C8AF', borderRadius: 2 }} />
                <div style={{ height: 3.5, width: '90%', background: '#D6C8AF', borderRadius: 2 }} />
                <div style={{ height: 3.5, width: '75%', background: '#D6C8AF', borderRadius: 2 }} />
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* LAYER C: FRONT FLYING PAGES (Z >= 0 in front of the book) */}
        {/* ================================================================= */}
        {flyingPages.map((pg) => {
          if (frame < pg.startFrame || frame > pg.landFrame) return null;
          const flightP = (frame - pg.startFrame) / (pg.landFrame - pg.startFrame);
          
          const scale = Math.sin(flightP * Math.PI) * 1.0;
          if (scale <= 0.01) return null;

          const angle = pg.baseAngle + (t * 2.2 * pg.speed);
          const orbitZ = Math.sin(angle);
          if (orbitZ < 0) return null; // Only render front pages here

          const px = 450 + Math.cos(angle) * pg.orbitRadiusX;
          const py = 290 + Math.sin(angle) * pg.orbitRadiusY + 15;
          const tilt = Math.cos(angle) * 16;

          return (
            <div
              key={pg.id}
              style={{
                position: 'absolute',
                left: px,
                top: py,
                width: 95,
                height: 130,
                transform: `translate(-50%, -50%) scale(${scale}) rotate(${tilt}deg)`,
                borderRadius: 10,
                background: 'linear-gradient(145deg, #FFFFFF 0%, #FAF5EA 100%)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45), 0 0 15px rgba(236, 201, 104, 0.35)',
                border: '1.5px solid rgba(236, 201, 104, 0.8)',
                padding: 12,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                zIndex: 35,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 18, color: pg.themeColor }}>{pg.symbol}</span>
                <span style={{ fontSize: 9, fontWeight: 900, color: '#8A7346', letterSpacing: '0.06em' }}>{pg.title}</span>
              </div>

              {/* Decorative Geometric Icon in Center */}
              <div style={{ alignSelf: 'center', margin: '4px 0' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${pg.themeColor}33 0%, transparent 70%)`,
                    border: `1px dashed ${pg.themeColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color: pg.themeColor,
                  }}
                >
                  ✦
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ height: 3.5, width: '100%', background: '#DCD3C0', borderRadius: 2 }} />
                <div style={{ height: 3.5, width: '80%', background: '#DCD3C0', borderRadius: 2 }} />
                <div style={{ height: 3.5, width: '55%', background: pg.themeColor, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* --- FLOATING SAAS HERO BADGE (Top Center) --- */}
      <div
        style={{
          position: 'absolute',
          top: 48,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          padding: '10px 28px',
          borderRadius: 40,
          border: '1.2px solid rgba(236, 201, 104, 0.45)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 50,
        }}
      >
        <span style={{ color: '#ECC968', fontSize: 18 }}>✦</span>
        <span
          style={{
            color: '#F8FAFC',
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Interactive Knowledge Engine
        </span>
        <span style={{ color: '#38BDF8', fontSize: 14 }}>•</span>
        <span style={{ color: '#94A3B8', fontWeight: 700, fontSize: 14 }}>
          3s Seamless Loop
        </span>
      </div>

      {/* --- SUBTLE LOWER THIRD TITLE --- */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'Baloo 2', cursive",
            fontSize: 32,
            fontWeight: 800,
            color: '#F8FAFC',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          Where Stories Come Alive
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#94A3B8',
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span>Crafted in Pure 2D Vector</span>
          <span style={{ color: '#ECC968' }}>•</span>
          <span>60 FPS Motion Design</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
