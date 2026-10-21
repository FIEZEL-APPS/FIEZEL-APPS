import React from 'react';

/**
 * FIEZEL Official Brand Design Tokens
 * Master identity palette: Solar Gold, Maroon, Emerald, Warm Paper, Warm Ink
 */
export const FIEZEL_BRAND_COLORS = {
  solarGold: '#FFC700',
  maroon: '#8C2233',
  emerald: '#2E8B69',
  warmPaper: '#FFF9EE',
  warmInk: '#241A11',
  ivory: '#FDFAF3',
  goldAccent: '#D8B36B',
  blush: '#F0A0AC',
} as const;

/**
 * Ornamen 1: Jejak Kaki PAW Resmi (Koordinat tunggal dari assets/brand/fiezel-paw.svg)
 */
export const FiezelPawStamp: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    role="img"
    aria-label="FIEZEL PAW"
    className={className}
  >
    <rect x="4.6" y="7.5" width="3.1" height="4.6" rx="1.55" />
    <rect x="8.9" y="5.1" width="3.1" height="7" rx="1.55" />
    <rect x="13.2" y="3.4" width="3.1" height="8.7" rx="1.55" />
    <rect x="17.5" y="6.2" width="3.1" height="5.9" rx="1.55" />
    <path d="M12.6 14c3.5 0 5.9 1.9 5.9 4.1 0 2-2 3.4-5.9 3.4s-5.9-1.4-5.9-3.4c0-2.2 2.4-4.1 5.9-4.1Z" />
  </svg>
);

/**
 * Ornamen 2: Garis Konstelasi Neural Emas Khas FIEZEL (dari design/redesign-v1/prototype/app.js)
 */
export const FiezelNeuralConstellation: React.FC<{
  className?: string;
  strokeColor?: string;
  opacity?: number;
}> = ({ className = 'w-full h-full', strokeColor = FIEZEL_BRAND_COLORS.solarGold, opacity = 0.4 }) => (
  <svg
    viewBox="0 0 340 120"
    preserveAspectRatio="none"
    aria-hidden="true"
    className={`pointer-events-none select-none ${className}`}
  >
    <g stroke={strokeColor} strokeWidth="1.25" fill="none" opacity={opacity}>
      <path d="M-10 84 C 60 60 90 96 150 74 S 260 40 350 62" />
      <path d="M-10 40 C 70 22 130 54 200 30 S 300 10 350 26" />
    </g>
    <g fill={strokeColor} opacity={Math.min(1, opacity + 0.35)}>
      <circle cx="150" cy="74" r="2.8" />
      <circle cx="200" cy="30" r="2.8" />
      <circle cx="90" cy="66" r="2.2" />
      <circle cx="282" cy="49" r="2.2" />
    </g>
  </svg>
);

/**
 * Ornamen 3: Bintang 4-Sudut Emas (#D8B36B / #FFC700) & Marun/Merah (#8C2233 / #D9536A) Khas PAW
 */
export const FiezelSparkleOrnament: React.FC<{ className?: string }> = ({
  className = 'w-6 h-6',
}) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    aria-hidden="true"
    className={`pointer-events-none select-none ${className}`}
  >
    <path
      d="M14 4 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z"
      fill={FIEZEL_BRAND_COLORS.solarGold}
    />
    <path
      d="M28 18 l2 5.5 5.5 2 -5.5 2 -2 5.5 -2 -5.5 -5.5 -2 5.5 -2 Z"
      fill={FIEZEL_BRAND_COLORS.maroon}
    />
    <circle cx="27" cy="8" r="2" fill={FIEZEL_BRAND_COLORS.goldAccent} />
  </svg>
);

/**
 * Ornamen 4: Ikon Merek FIEZEL (Huruf F + 2 Batang Gelombang Suara Emas dari assets/brand/fiezel-icon.svg)
 */
export const FiezelBrandCrest: React.FC<{ className?: string }> = ({
  className = 'w-9 h-9',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    role="img"
    aria-label="FIEZEL Crest"
    className={className}
  >
    <defs>
      <radialGradient id="fzCrestField" cx="30%" cy="18%" r="92%">
        <stop offset="0%" stopColor={FIEZEL_BRAND_COLORS.warmInk} />
        <stop offset="55%" stopColor="#1B1418" />
        <stop offset="100%" stopColor="#120C0E" />
      </radialGradient>
      <linearGradient id="fzCrestIvory" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={FIEZEL_BRAND_COLORS.warmPaper} />
        <stop offset="100%" stopColor="#EBDBC0" />
      </linearGradient>
      <linearGradient id="fzCrestGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFDE59" />
        <stop offset="45%" stopColor={FIEZEL_BRAND_COLORS.solarGold} />
        <stop offset="100%" stopColor="#E6A800" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="128" fill="url(#fzCrestField)" />
    <g fill="url(#fzCrestIvory)">
      <rect x="132" y="140" width="46" height="232" rx="23" />
      <rect x="132" y="140" width="136" height="46" rx="23" />
      <rect x="132" y="228" width="108" height="44" rx="22" />
    </g>
    <g fill="url(#fzCrestGold)">
      <rect x="300" y="196" width="38" height="120" rx="19" />
      <rect x="354" y="160" width="38" height="192" rx="19" />
    </g>
  </svg>
);

/**
 * Ornamen 5: Corner Filigree / Bingkai Sudut Geometris Emas & Marun FIEZEL
 */
export const FiezelCornerOrnament: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24',
}) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    aria-hidden="true"
    className={`pointer-events-none select-none ${className}`}
  >
    <circle cx="96" cy="24" r="46" stroke={FIEZEL_BRAND_COLORS.solarGold} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.45" />
    <circle cx="96" cy="24" r="28" stroke={FIEZEL_BRAND_COLORS.maroon} strokeWidth="1.2" opacity="0.22" />
    <path
      d="M96 8 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z"
      fill={FIEZEL_BRAND_COLORS.solarGold}
      opacity="0.65"
    />
    <circle cx="62" cy="48" r="3" fill={FIEZEL_BRAND_COLORS.maroon} opacity="0.35" />
  </svg>
);

/**
 * Ornamen 6: Medali Akurasi & Verifikasi Suara FIEZEL
 * Mengintegrasikan Emerald (#2E8B69), Solar Gold (#FFC700), Warm Paper (#FFF9EE), Warm Ink (#241A11), Maroon (#8C2233)
 */
export const FiezelAccuracySeal: React.FC<{
  className?: string;
  fill?: string;
  accent?: string;
}> = ({
  className = 'w-6 h-6',
  fill = FIEZEL_BRAND_COLORS.warmPaper,
  accent = FIEZEL_BRAND_COLORS.emerald,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    role="img"
    aria-label="FIEZEL Accuracy Seal"
    className={className}
  >
    <rect width="24" height="24" rx="7" fill={fill} stroke="#F0E4CF" strokeWidth="1" />
    <circle cx="12" cy="12" r="8" fill={accent} fillOpacity="0.15" stroke={accent} strokeWidth="1.5" />
    <path
      d="M8.5 12.5 L11 15 L15.5 9.5"
      stroke={accent}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="18" cy="6" r="1.8" fill={FIEZEL_BRAND_COLORS.solarGold} />
    <circle cx="6" cy="18" r="1.2" fill={FIEZEL_BRAND_COLORS.maroon} />
  </svg>
);

