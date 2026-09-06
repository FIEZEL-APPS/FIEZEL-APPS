const fs = require('fs');
const path = require('path');

const baseContent = fs.readFileSync('tools/be14-website-index.html', 'utf8');

// Read the exact original showcase from be14-hero.html
const heroContent = fs.readFileSync('tools/be14-hero.html', 'utf8');
const showcaseMatch = heroContent.match(/<div class="showcase seq seq-4">[\s\S]*?<\/ul>\s*<\/div>/);
if (!showcaseMatch) {
  throw new Error('Could not find showcase in be14-hero.html');
}
const exactShowcase = showcaseMatch[0];

// Custom styles to inject into <head>
const customStyles = `
<style>
  /* Wordmark KelasKu untuk Guru — Satu baris horizontal ketat */
  .kelasku-brand {
    display: inline-flex !important;
    align-items: baseline !important;
    gap: 8px !important;
    white-space: nowrap !important;
    vertical-align: baseline !important;
  }
  .kelasku-main {
    font-weight: 800 !important;
    letter-spacing: -0.02em !important;
    line-height: 1 !important;
  }
  .kelasku-tag {
    font-weight: 600 !important;
    font-size: 0.68em !important;
    opacity: 0.88 !important;
    letter-spacing: -0.01em !important;
    line-height: 1 !important;
  }

  /* Dual Ecosystem Stage in Hero */
  .hero-dual-stage {
    display: grid;
    grid-template-columns: minmax(320px, 1fr) minmax(340px, 1.25fr);
    gap: 32px;
    align-items: center;
    max-width: 1240px;
    margin: 24px auto 0;
    padding: 0 16px;
    position: relative;
    z-index: 2;
  }

  /* Left Side: Student Showcase wrapper */
  .stage-student {
    position: relative;
    width: 100%;
    overflow: visible;
  }
  /* Preserve 100% of the original .showcase behavior */
  .stage-student .showcase {
    margin-top: 0;
    min-height: clamp(340px, 48vh, 460px);
  }

  /* Right Side: Teacher MacBook Showcase wrapper */
  .stage-teacher {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding-top: 50px; /* space for Mira behind screen */
  }

  /* Accurate Apple MacBook Pro Mockup */
  .mac-container {
    position: relative;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    filter: drop-shadow(0 24px 48px rgba(36,26,17,0.18));
  }

  /* Teacher Mascot (MIRA) — Situated strictly BEHIND the laptop lid */
  .mira-teacher-wrapper {
    position: absolute;
    top: -95px;
    left: 50%;
    transform: translateX(-50%);
    width: 220px;
    height: 140px;
    z-index: 1; /* Behind lid (z-index 2) */
    pointer-events: none;
  }
  .mira-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  /* Animations for MIRA */
  .anim .mira-teacher-wrapper {
    animation: miraBreathing 4.8s ease-in-out infinite;
  }
  @keyframes miraBreathing {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-5px); }
  }

  .anim .mira-anim-head {
    transform-origin: 110px 105px;
    animation: miraHeadGlance 9s ease-in-out infinite;
  }
  @keyframes miraHeadGlance {
    0%, 35%, 65%, 100% { transform: rotate(0deg); }
    40%, 60% { transform: rotate(2.5deg); }
    70%, 90% { transform: rotate(-2deg); }
  }

  .anim .mira-eyelid {
    animation: miraBlink 5.2s infinite;
  }
  @keyframes miraBlink {
    0%, 46%, 50%, 96%, 100% { transform: scaleY(1); }
    48%, 98% { transform: scaleY(0.08); }
  }
  .mira-eyelid {
    transform-origin: center 80px;
  }

  /* MacBook Screen Lid */
  .mac-lid {
    position: relative;
    z-index: 2; /* In front of Mira's body */
    background: #0B0C0E;
    border-radius: 16px 16px 0 0;
    padding: 10px 10px 0 10px;
    box-shadow:
      inset 0 0 0 1.5px #A1A5A9,
      inset 0 0 0 3px #1F2226,
      0 -2px 8px rgba(0,0,0,0.15);
  }
  .mac-screen {
    position: relative;
    background: #0D1117;
    border-radius: 9px 9px 0 0;
    overflow: hidden;
    aspect-ratio: 16 / 10;
    border: 1px solid #1c2024;
  }
  .mac-screen img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  /* FaceTime Notch */
  .mac-notch {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 72px;
    height: 14px;
    background: #0B0C0E;
    border-radius: 0 0 7px 7px;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.5);
  }
  .mac-camera {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #111B27;
    border: 0.8px solid #203045;
    position: relative;
  }
  .mac-camera::after {
    content: '';
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: #2563EB;
    top: 1px; left: 1px;
    opacity: 0.75;
  }
  .mac-led {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #22C55E;
    opacity: 0.85;
    box-shadow: 0 0 4px #22C55E;
  }

  /* MacBook Keyboard Base */
  .mac-base {
    position: relative;
    z-index: 3;
    height: 14px;
    background: linear-gradient(180deg, #D4D8DC 0%, #B8BCC0 35%, #9CA0A4 100%);
    border-radius: 0 0 16px 16px;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.7),
      0 4px 12px rgba(0,0,0,0.18);
  }
  .mac-hinge {
    position: absolute;
    top: 0; left: 12%; right: 12%;
    height: 3px;
    background: #2E3236;
    border-radius: 0 0 2px 2px;
  }
  .mac-scoop {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 68px;
    height: 5px;
    background: #7B8085;
    border-radius: 0 0 5px 5px;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.35);
  }

  /* Badge caption under laptop */
  .teacher-hero-meta {
    margin-top: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .teacher-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: var(--cream-warm);
    border: 1px solid var(--gold-line);
    border-radius: var(--radius-pill);
    padding: 6px 14px;
    font-size: var(--fs-micro);
    font-weight: 700;
    color: var(--maroon-deep);
    box-shadow: var(--shadow-sm);
  }
  .btn-teacher-hero {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: #1F7A63;
    color: #FFFFFF !important;
    padding: 9px 18px;
    border-radius: var(--radius-pill);
    font-size: var(--fs-micro);
    font-weight: 700;
    text-decoration: none;
    box-shadow: 0 3px 0 #145545, var(--shadow-sm);
    transition: transform .18s var(--fz-out);
  }
  .btn-teacher-hero:hover {
    transform: translateY(-2px);
    background: #279478;
    color: #FFFFFF !important;
  }
  .btn-teacher-hero .kelasku-brand {
    color: #FFFFFF !important;
  }
  .btn-teacher-hero .kelasku-main {
    color: #FFFFFF !important;
  }
  .btn-teacher-hero .kelasku-tag {
    color: rgba(255,255,255,0.85) !important;
  }

  @media (max-width: 980px) {
    .hero-dual-stage {
      grid-template-columns: 1fr;
      gap: 40px;
    }
    .stage-teacher {
      padding-top: 40px;
    }
    .mac-container {
      max-width: 480px;
    }
  }
</style>
`;

// Mira SVG and MacBook HTML
const teacherMockupHTML = `
      <!-- SISI GURU (MacBook Pro + Screenshot Asli KelasKu + MIRA di Balik Layar) -->
      <div class="stage-teacher">
        <div class="mac-container">
          
          <!-- MIRA TEACHER MASCOT — Menopang dagu di balik laptop -->
          <div class="mira-teacher-wrapper">
            <svg class="mira-svg" viewBox="0 0 220 180" role="img" aria-label="MIRA — Maskot Guru FIEZEL menopang dagu di balik laptop">
              <defs>
                <linearGradient id="miraCardigan-hero" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3AA385"/>
                  <stop offset="100%" stop-color="#1F7A63"/>
                </linearGradient>
                <linearGradient id="miraHair-hero" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#6E4436"/>
                  <stop offset="100%" stop-color="#4B281E"/>
                </linearGradient>
                <linearGradient id="miraSkin-hero" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#FFF8EE"/>
                  <stop offset="100%" stop-color="#FDEFD8"/>
                </linearGradient>
                <clipPath id="miraEyeClipL-hero"><ellipse cx="88" cy="80" rx="13" ry="14"/></clipPath>
                <clipPath id="miraEyeClipR-hero"><ellipse cx="132" cy="80" rx="13" ry="14"/></clipPath>
              </defs>

              <!-- Mascot Lower Body (Cardigan & Shoulders) — Berada di balik layar laptop -->
              <g class="mira-shoulders">
                <path d="M40 180 C40 140 70 128 110 128 C150 128 180 140 180 180 Z" fill="url(#miraCardigan-hero)"/>
                <path d="M110 134 L92 180" stroke="#166052" stroke-width="3" stroke-linecap="round"/>
                <path d="M110 134 L128 180" stroke="#166052" stroke-width="3" stroke-linecap="round"/>
                <polygon points="100,134 120,134 110,154" fill="#FDFBF7"/>
              </g>

              <!-- Animated Head & Hands Assembly -->
              <g class="mira-anim-head">
                <!-- Hair Back -->
                <ellipse cx="110" cy="74" rx="58" ry="52" fill="url(#miraHair-hero)"/>
                <path d="M54 78 Q50 110 68 135 Q80 144 86 130 Q72 105 72 78 Z" fill="url(#miraHair-hero)"/>
                <path d="M166 78 Q170 110 152 135 Q140 144 134 130 Q148 105 148 78 Z" fill="url(#miraHair-hero)"/>

                <!-- Head Base -->
                <path d="M68 76 C68 44 86 36 110 36 C134 36 152 44 152 76 C152 104 136 122 110 122 C84 122 68 104 68 76 Z" fill="url(#miraSkin-hero)"/>

                <!-- Hair Front & Bangs -->
                <path d="M64 64 C76 40 102 38 114 48 C126 38 148 40 156 64 C160 52 152 32 110 32 C68 32 60 52 64 64 Z" fill="url(#miraHair-hero)"/>
                <path d="M68 64 Q88 78 110 60 Q132 78 152 64 Q140 46 110 46 Q80 46 68 64 Z" fill="url(#miraHair-hero)"/>

                <!-- Hair Bun / Scrunchie -->
                <ellipse cx="110" cy="24" rx="22" ry="16" fill="url(#miraHair-hero)"/>
                <ellipse cx="110" cy="26" rx="14" ry="7" fill="#1F7A63"/>

                <!-- Glasses Frame -->
                <g class="mira-glasses">
                  <rect x="73" y="66" width="30" height="26" rx="9" fill="none" stroke="#634832" stroke-width="2.5"/>
                  <rect x="117" y="66" width="30" height="26" rx="9" fill="none" stroke="#634832" stroke-width="2.5"/>
                  <path d="M103 76 Q110 74 117 76" fill="none" stroke="#634832" stroke-width="2.5" stroke-linecap="round"/>
                </g>

                <!-- Animated Eyes with Natural Eyelid Blinking -->
                <g class="mira-eyes">
                  <g class="mira-eyelid">
                    <ellipse cx="88" cy="79" rx="11" ry="12" fill="#FFFFFF"/>
                    <circle cx="89" cy="79" r="7" fill="#3D2314"/>
                    <circle cx="91" cy="76" r="2.8" fill="#FFFFFF"/>
                    <circle cx="86" cy="82" r="1.3" fill="#FFFFFF" opacity="0.8"/>
                  </g>
                  <g class="mira-eyelid">
                    <ellipse cx="132" cy="79" rx="11" ry="12" fill="#FFFFFF"/>
                    <circle cx="133" cy="79" r="7" fill="#3D2314"/>
                    <circle cx="135" cy="76" r="2.8" fill="#FFFFFF"/>
                    <circle cx="130" cy="82" r="1.3" fill="#FFFFFF" opacity="0.8"/>
                  </g>
                </g>

                <!-- Blush & Smile -->
                <ellipse cx="76" cy="94" rx="8" ry="4.5" fill="#F43F5E" opacity="0.32"/>
                <ellipse cx="144" cy="94" rx="8" ry="4.5" fill="#F43F5E" opacity="0.32"/>
                <path d="M103 100 Q110 107 117 100" fill="none" stroke="#884232" stroke-width="2.5" stroke-linecap="round"/>

                <!-- Two Hands Supporting Chin (Posed right on top of laptop bezel) -->
                <g class="mira-hands-chin">
                  <!-- Left Hand -->
                  <path d="M84 126 C80 120 86 112 94 114 C98 115 102 119 104 124 C100 128 88 130 84 126 Z" fill="url(#miraSkin-hero)"/>
                  <circle cx="91" cy="116" r="4.2" fill="#FDEFD8"/>
                  <circle cx="96" cy="118" r="4.2" fill="#FDEFD8"/>
                  <circle cx="101" cy="121" r="3.8" fill="#FDEFD8"/>
                  
                  <!-- Right Hand -->
                  <path d="M136 126 C140 120 134 112 126 114 C122 115 118 119 116 124 C120 128 132 130 136 126 Z" fill="url(#miraSkin-hero)"/>
                  <circle cx="129" cy="116" r="4.2" fill="#FDEFD8"/>
                  <circle cx="124" cy="118" r="4.2" fill="#FDEFD8"/>
                  <circle cx="119" cy="121" r="3.8" fill="#FDEFD8"/>
                </g>
              </g>
            </svg>
          </div>

          <!-- MacBook Pro Display Lid -->
          <div class="mac-lid">
            <div class="mac-notch">
              <span class="mac-camera"></span>
              <span class="mac-led"></span>
            </div>
            <div class="mac-screen">
              <img src="assets/shots/teacher-desktop.png" alt="Tampilan Nyata Dashboard KelasKu untuk Guru" width="1440" height="900" loading="eager">
            </div>
          </div>

          <!-- MacBook Pro Aluminium Unibody Base -->
          <div class="mac-base">
            <div class="mac-hinge"></div>
            <div class="mac-scoop"></div>
          </div>
        </div>

        <div class="teacher-hero-meta">
          <span class="teacher-hero-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
            <span class="kelasku-brand"><span class="kelasku-main">KelasKu</span> <span class="kelasku-tag">untuk Guru</span></span> — Briefing &amp; Analitik Kelas
          </span>
          <a class="btn-teacher-hero" href="app/?teacher=preview">
            Buka Demo Guru →
          </a>
        </div>
      </div>
`;

// Assemble the Dual Stage
const dualStageHTML = `
    <!-- Panggung Ganda: Sisi Murid (Kiri) + Sisi Guru (Kanan) -->
    <div class="hero-dual-stage">
      <!-- SISI PELAJAR (100% PERSIS SEPERTI SEBELUMNYA) -->
      <div class="stage-student">
        ${exactShowcase}
      </div>

      ${teacherMockupHTML}
    </div>
`;

let result = baseContent;

// 1. Inject custom styles into <head>
result = result.replace('</head>', customStyles + '</head>');

// 2. Add KelasKu untuk Guru to topnav
const oldTopnav = '<nav class="topnav" aria-label="Navigasi utama">\n      <a href="install/">Cara Install</a>';
const newTopnav = `<nav class="topnav" aria-label="Navigasi utama">
      <a href="app/?teacher=preview"><span class="kelasku-brand"><span class="kelasku-main" style="color:#1F7A63">KelasKu</span> <span class="kelasku-tag" style="color:var(--maroon-mid)">untuk Guru</span></span></a>
      <a href="install/">Cara Install</a>`;
result = result.replace(oldTopnav, newTopnav);

// 3. Add CTA in masthead
const oldCtaRow = `<div class="cta-row cta-center mast-cta seq seq-3">
        <a class="btn btn-primary" href="app/">Mulai Belajar</a>
        <a class="btn btn-ghost" href="install/">Cara Install</a>
      </div>`;
const newCtaRow = `<div class="cta-row cta-center mast-cta seq seq-3">
        <a class="btn btn-primary" href="app/">Mulai Belajar</a>
        <a class="btn btn-teacher-hero" href="app/?teacher=preview">Buka <span class="kelasku-brand"><span class="kelasku-main">KelasKu</span> <span class="kelasku-tag">untuk Guru</span></span> →</a>
        <a class="btn btn-ghost" href="install/">Cara Install</a>
      </div>`;
result = result.replace(oldCtaRow, newCtaRow);

// 4. Replace the single showcase with the dual-stage
const oldShowcaseBlock = `<div class="wrap">\n      <div class="showcase seq seq-4">[\\s\\S]*?<\\/ul>\\s*<\\/div>\\s*<\\/div>`;
const showcaseRegex = new RegExp('<div class="wrap">\\s*<div class="showcase seq seq-4">[\\s\\S]*?<\\/ul>\\s*<\\/div>\\s*<\\/div>');
if (!showcaseRegex.test(result)) {
  throw new Error('Could not find showcase block to replace in base content');
}
result = result.replace(showcaseRegex, dualStageHTML);

// 5. Add footer links for KelasKu untuk Guru
const oldFootLinks = '<a href="app/">Buka Aplikasi</a>';
const newFootLinks = '<a href="app/">Buka Aplikasi Murid</a>\n        <span aria-hidden="true">·</span>\n        <a href="app/?teacher=preview"><span class="kelasku-brand"><span class="kelasku-main" style="color:var(--cream)">KelasKu</span> <span class="kelasku-tag" style="color:var(--gold)">untuk Guru</span></span></a>';
result = result.replace(oldFootLinks, newFootLinks);

// 6. Write out website/index.html
fs.writeFileSync('website/index.html', result, 'utf8');
console.log('Successfully written website/index.html with 100% original phone + exact Hula PAW mascot + accurate MacBook Pro!');
