import React, { useEffect, useRef, useState } from 'react';
import type { WhiteboardSceneStep } from '../lib/whiteboardDirector';
import { MathText } from './MathText';
import { wbPick } from '../lib/i18n';
import { isMobileLowMemoryDevice } from '../lib/boardAudioUnlock';

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const HighlightText: React.FC<{
  text?: string;
  terms?: string[];
  active?: boolean;
  emphasize?: boolean;
  className?: string;
}> = ({ text = '', terms = [], active = true, emphasize = false, className }) => {
  if (!text) return null;
  const cleanTerms = Array.from(
    new Set(
      (terms || [])
        .map((t) => String(t || '').trim())
        .filter((t) => t.length >= 2 && t.length <= 44)
    )
  ).sort((a, b) => b.length - a.length);

  let pattern: RegExp | null = null;
  if (active && cleanTerms.length > 0) {
    try {
      const wrappedTerms = cleanTerms.map((term) => {
        const esc = escapeRegExp(term);
        const pre = /^[A-Za-z0-9]/.test(term) ? '(?<![A-Za-z0-9])' : '';
        const post = /[A-Za-z0-9]$/.test(term) ? '(?![A-Za-z0-9])' : '';
        return `${pre}${esc}${post}`;
      });
      pattern = new RegExp(`(${wrappedTerms.join('|')})`, 'gi');
    } catch {
      pattern = null;
    }
  }

  const lowerSet = new Set(cleanTerms.map((t) => t.toLowerCase()));
  const renderPlainSegment = (segment: string, keyPrefix: string) => {
    if (!pattern) return segment;
    const parts = segment.split(pattern);
    if (parts.length <= 1) return segment;
    return parts.map((part, idx) =>
      lowerSet.has(part.toLowerCase()) ? (
        <mark
          key={`${keyPrefix}-${idx}`}
          className={`fz-keyword-highlight ${emphasize ? 'fz-keyword-highlight-active' : ''}`}
        >
          {part}
        </mark>
      ) : (
        <React.Fragment key={`${keyPrefix}-${idx}`}>{part}</React.Fragment>
      )
    );
  };

  return (
    <MathText
      text={text}
      terms={active ? cleanTerms : []}
      active={active}
      emphasize={emphasize}
      className={className}
      renderPlainSegment={renderPlainSegment}
    />
  );
};

export const SmpVectorIcon: React.FC<{
  name?: string;
  color?: string;
  size?: number;
}> = ({ name = 'star', color = '#0284C7', size = 20 }) => {
  const k = String(name || 'star').toLowerCase();
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (k.includes('cam')) {
    return (
      <svg {...common}>
        <path d="M4 8h3l2-2h6l2 2h3v10H4z" fill="#FFFFFF" fillOpacity="0.85" />
        <circle cx="12" cy="13" r="3.4" fill={color} fillOpacity="0.18" />
        <circle cx="17.5" cy="10.5" r="0.8" fill={color} />
      </svg>
    );
  }
  if (k.includes('vid') || k.includes('play') || k.includes('reel')) {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="3" fill="#FFFFFF" fillOpacity="0.85" />
        <polygon points="10,9 16,12 10,15" fill={color} />
      </svg>
    );
  }
  if (k.includes('bolt') || k.includes('flash') || k.includes('act')) {
    return (
      <svg {...common}>
        <polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" fill="#FEF08A" />
      </svg>
    );
  }
  if (k.includes('check')) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" fill="#DCFCE7" />
        <path d="M8.5 12.5l2.5 2.5 5-5.5" />
      </svg>
    );
  }
  if (k.includes('warn') || k.includes('trap') || k.includes('alert')) {
    return (
      <svg {...common}>
        <path d="M12 3L2.5 20h19z" fill="#FEE2E2" />
        <line x1="12" y1="9.5" x2="12" y2="14" />
        <circle cx="12" cy="17.2" r="0.8" fill={color} />
      </svg>
    );
  }
  if (k.includes('clock') || k.includes('time')) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" fill="#FFFFFF" fillOpacity="0.85" />
        <polyline points="12 7 12 12 15.5 14" />
      </svg>
    );
  }
  if (k.includes('key')) {
    return (
      <svg {...common}>
        <circle cx="7.5" cy="14.5" r="3.5" fill="#FEF3C7" />
        <path d="M10.5 12l8.5-7 2 2m-3.5 3l2 2" />
      </svg>
    );
  }
  if (k.includes('lock')) {
    return (
      <svg {...common}>
        <rect x="5" y="11" width="14" height="9" rx="2.5" fill="#E0F2FE" />
        <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
      </svg>
    );
  }
  if (k.includes('game') || k.includes('rpg')) {
    return (
      <svg {...common}>
        <rect x="3" y="8" width="18" height="10" rx="4" fill="#EDE9FE" />
        <path d="M8 11v4m-2-2h4" />
        <circle cx="15.5" cy="12" r="0.9" fill={color} />
        <circle cx="17.5" cy="14" r="0.9" fill={color} />
      </svg>
    );
  }
  if (k.includes('chat')) {
    return (
      <svg {...common}>
        <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="#FFFFFF" fillOpacity="0.85" />
      </svg>
    );
  }
  if (k.includes('target')) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" fill="#FEF3C7" fillOpacity="0.6" />
        <circle cx="12" cy="12" r="5" fill="#FFFFFF" />
        <circle cx="12" cy="12" r="2" fill={color} />
      </svg>
    );
  }
  if (k.includes('bridge')) {
    return (
      <svg {...common}>
        <path d="M3 16c3-6 15-6 18 0" />
        <line x1="2" y1="16" x2="22" y2="16" />
        <line x1="7" y1="12" x2="7" y2="19" />
        <line x1="17" y1="12" x2="17" y2="19" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <polygon points="12 3 14.9 8.8 21 9.7 16.5 14.1 17.6 20.5 12 17.4 6.4 20.5 7.5 14.1 3 9.7 9.1 8.8" fill="#FEF08A" />
    </svg>
  );
};

export const AnimatedTutorPenSvg: React.FC<{ color?: string; label?: string }> = ({
  color = '#2563EB',
  label,
}) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border-2 border-[#2563EB]/45 shadow-md text-[10px] font-extrabold text-[#1E3A8A] fz-pen-float-badge">
    <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[#F59E0B]">
      <span className="absolute inset-0 rounded-full bg-[#F59E0B] animate-ping opacity-75" />
    </span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 21l3.8-.9L19.9 7a2.1 2.1 0 0 0-3-3L3.9 17.2 3 21z" fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M14.5 6.4l3 3" stroke="#1E293B" strokeWidth="2" />
      <circle cx="3.2" cy="20.8" r="2.1" fill="#F59E0B" />
    </svg>
    {label ? <span>{label}</span> : null}
  </span>
);

const ZoomInspectButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  if (!onClick) return null;
  return (
    <button
      type="button"
      data-testid="wb-visual-zoom-btn"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/95 hover:bg-[#EFF6FF] border border-[#CBD5E1] text-[10.5px] font-bold text-[#1E40AF] shadow-xs transition-transform active:scale-95 cursor-pointer"
      title={wbPick('Enlarge diagram for a closer view', 'Perbesar visual ini untuk melihat lebih jelas')}
    >
      <span>🔍</span>
      <span>{wbPick('Zoom', 'Perbesar')}</span>
    </button>
  );
};

function formatHeroSvgLabel(raw: string, maxChars = 19): string {
  const cleaned = (raw || '')
    .replace(/^(?:bedah tuntas|membedah|kupas tuntas|perbedaan|bedanya|dari nol)\s+/i, '')
    .replace(/\s+(?:dari nol|untuk pemula|secara lengkap)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= maxChars) return cleaned;
  const words = cleaned.split(' ');
  let acc = '';
  for (const w of words) {
    const candidate = acc ? `${acc} ${w}` : w;
    if (candidate.length <= maxChars) {
      acc = candidate;
    } else {
      break;
    }
  }
  return acc || cleaned.slice(0, maxChars);
}

/**
 * Hero SVG Illustration per metaphor theme — genuinely distinct artwork instead of plain 2-box rectangles!
 */
const MetaphorThemeHeroSvg: React.FC<{
  theme: NonNullable<WhiteboardSceneStep['sceneTheme']>;
  leftLabel: string;
  rightLabel: string;
  centerLabel?: string;
  progress: number;
  isWritingActive: boolean;
  focusSide?: 'left' | 'right' | 'none';
}> = ({ theme, leftLabel, rightLabel, centerLabel, progress, isWritingActive, focusSide = 'none' }) => {
  const penX = Math.max(8, Math.min(92, 10 + progress * 80));
  const penY = 50 + Math.sin(progress * Math.PI * 3) * 14;
  const svgLeft = formatHeroSvgLabel(leftLabel, 18);
  const svgRight = formatHeroSvgLabel(rightLabel, 18);
  const leftFontSize = svgLeft.length > 13 ? 11.5 : 13;
  const rightFontSize = svgRight.length > 13 ? 11.5 : 13;
  const centerBadge = formatHeroSvgLabel(centerLabel || `${svgLeft} vs ${svgRight}`, 22) || `${svgLeft} vs ${svgRight}`;
  const leftOpacity = focusSide === 'right' ? 0.55 : 1;
  const rightOpacity = focusSide === 'left' ? 0.55 : 1;

  return (
    <div className="relative w-full rounded-2xl bg-[#FFFDF7] border border-[#E2E8F0] p-2.5 overflow-hidden">
      <svg
        viewBox="0 0 560 156"
        className="w-full h-auto block"
        role="img"
        aria-label={centerLabel || `${leftLabel} vs ${rightLabel}`}
      >
        <defs>
          <linearGradient id={`beam_${theme}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.22" />
          </linearGradient>
        </defs>

        {theme === 'camera_vs_video' && (
          <g>
            {/* Left: Polaroid Snapshot Camera (Static Condition/State) */}
            <g style={{ opacity: leftOpacity, transition: 'opacity 220ms ease' }}>
              <rect x="28" y="22" width="154" height="110" rx="18" fill="#E0F2FE" stroke={focusSide === 'left' ? '#0369A1' : '#0284C7'} strokeWidth={focusSide === 'left' ? 3.2 : 2.5} />
              <rect x="68" y="11" width="44" height="15" rx="6" fill="#38BDF8" stroke="#0284C7" strokeWidth="2" />
              <circle cx="105" cy="64" r="22" fill="#FFFFFF" stroke="#0369A1" strokeWidth="2.5" />
              <circle cx="105" cy="64" r="10" fill="#0284C7" />
              <circle cx="155" cy="37" r="5" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.5" />
              <text x="105" y="106" textAnchor="middle" fontSize={leftFontSize} fontWeight="800" fill="#0C4A6E">
                {svgLeft}
              </text>
              <text x="105" y="122" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0369A1">
                FOTO KONDISI
              </text>
            </g>

            {/* Center Dynamic Divider */}
            <path d="M 192 78 C 232 46, 326 110, 366 78" fill="none" stroke="#F59E0B" strokeWidth="3" strokeDasharray="6 4" />
            <rect x="206" y="54" width="148" height="36" rx="18" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.2" />
            <text x="280" y="76" textAnchor="middle" fontSize={centerBadge.length > 16 ? 9.5 : 11} fontWeight="800" fill="#92400E">
              {centerBadge}
            </text>

            {/* Right: Reels Clapper / Video Camera (Action/Motion) */}
            <g style={{ opacity: rightOpacity, transition: 'opacity 220ms ease' }}>
              <rect x="378" y="22" width="154" height="110" rx="18" fill="#DCFCE7" stroke={focusSide === 'right' ? '#14532D' : '#15803D'} strokeWidth={focusSide === 'right' ? 3.2 : 2.5} />
              <path d="M 378 40 L 532 40" stroke="#15803D" strokeWidth="2.5" />
              <path d="M 400 22 L 412 40 M 434 22 L 446 40 M 468 22 L 480 40 M 502 22 L 514 40" stroke="#15803D" strokeWidth="2.5" />
              <polygon points="440,51 474,69 440,87" fill="#16A34A" stroke="#14532D" strokeWidth="2" strokeLinejoin="round" />
              <text x="455" y="106" textAnchor="middle" fontSize={rightFontSize} fontWeight="800" fill="#14532D">
                {svgRight}
              </text>
              <text x="455" y="122" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#15803D">
                VIDEO AKSI
              </text>
            </g>
          </g>
        )}

        {theme === 'battery_meter' && (
          <g>
            <rect x="36" y="34" width="468" height="62" rx="16" fill="#F1F5F9" stroke="#334155" strokeWidth="2.5" />
            <rect x="504" y="52" width="14" height="26" rx="4" fill="#334155" />
            {[0, 1, 2, 3, 4].map((seg) => {
              const colors = ['#EF4444', '#F97316', '#FACC15', '#4ADE80', '#10B981'];
              return (
                <rect
                  key={seg}
                  x={48 + seg * 88}
                  y={44}
                  width={78}
                  height={42}
                  rx={9}
                  fill={colors[seg]}
                  opacity={progress >= seg * 0.16 ? 0.92 : 0.28}
                />
              );
            })}
            <text x="44" y="122" fontSize="12" fontWeight="800" fill="#B91C1C">
              0% {svgLeft}
            </text>
            <text x="270" y="122" textAnchor="middle" fontSize="11" fontWeight="700" fill="#B45309">
              Skala Kekuatan / Frekuensi
            </text>
            <text x="496" y="122" textAnchor="end" fontSize="12" fontWeight="800" fill="#047857">
              100% {svgRight}
            </text>
          </g>
        )}

        {theme === 'bridge_timeline' && (
          <g>
            <path d="M 20 124 Q 140 108 280 124 T 540 124 L 540 148 L 20 148 Z" fill="#DBEAFE" />
            <path d="M 92 108 Q 280 34 468 108" fill="none" stroke="#0284C7" strokeWidth="4" />
            <line x1="76" y1="86" x2="484" y2="86" stroke="#1E293B" strokeWidth="3.5" />
            {[160, 220, 280, 340, 400].map((px) => (
              <line key={px} x1={px} y1="64" x2={px} y2="108" stroke="#64748B" strokeWidth="2" />
            ))}
            <rect x="26" y="34" width="144" height="50" rx="14" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.4" />
            <text x="98" y="56" textAnchor="middle" fontSize={leftFontSize} fontWeight="800" fill="#92400E">
              {svgLeft}
            </text>
            <text x="98" y="73" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#B45309">
              Titik Masa Lalu
            </text>
            <rect x="390" y="34" width="144" height="50" rx="14" fill="#DCFCE7" stroke="#15803D" strokeWidth="2.4" />
            <text x="462" y="56" textAnchor="middle" fontSize={rightFontSize} fontWeight="800" fill="#14532D">
              {svgRight}
            </text>
            <text x="462" y="73" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#15803D">
              Efek Hingga Kini
            </text>
          </g>
        )}

        {theme === 'stage_spotlight' && (
          <g>
            <polygon points="150,18 68,134 232,134" fill={`url(#beam_${theme})`} />
            <polygon points="410,18 328,134 492,134" fill="#DCFCE7" fillOpacity="0.65" />
            <circle cx="150" cy="22" r="10" fill="#1E293B" />
            <circle cx="410" cy="22" r="10" fill="#1E293B" />
            <ellipse cx="150" cy="126" rx="78" ry="16" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2" />
            <ellipse cx="410" cy="126" rx="78" ry="16" fill="#DCFCE7" stroke="#15803D" strokeWidth="2" />
            <text x="150" y="96" textAnchor="middle" fontSize={leftFontSize} fontWeight="800" fill="#0C4A6E">
              {svgLeft}
            </text>
            <text x="410" y="96" textAnchor="middle" fontSize={rightFontSize} fontWeight="800" fill="#14532D">
              {svgRight}
            </text>
          </g>
        )}

        {theme === 'key_and_lock' && (
          <g>
            {/* Left Key Card */}
            <g style={{ opacity: leftOpacity, transition: 'opacity 320ms ease' }}>
              <rect x="24" y="24" width="194" height="108" rx="18" fill="#FEF3C7" stroke={focusSide === 'left' ? '#B45309' : '#D97706'} strokeWidth={focusSide === 'left' ? 3.2 : 2.4} />
              <circle cx="72" cy="61" r="13" fill="#FFFFFF" stroke="#B45309" strokeWidth="2.4" />
              <circle cx="72" cy="61" r="4.8" fill="#D97706" />
              <path d="M 85 61 L 138 61 M 116 61 L 116 71 M 130 61 L 130 71" stroke="#B45309" strokeWidth="3.2" strokeLinecap="round" />
              <text x="121" y="99" textAnchor="middle" fontSize={leftFontSize} fontWeight="800" fill="#78350F">
                {svgLeft}
              </text>
              <text x="121" y="117" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#B45309">
                {wbPick('TRIGGER / SUBJECT', 'PEMICU / SUBJEK')}
              </text>
            </g>

            <path d="M 222 78 L 334 78" stroke="#16A34A" strokeWidth="3" strokeDasharray="6 4" />
            <rect x="244" y="60" width="72" height="34" rx="17" fill="#DCFCE7" stroke="#15803D" strokeWidth="2.2" />
            <text x="280" y="81" textAnchor="middle" fontSize="11" fontWeight="800" fill="#14532D">
              {wbPick('PAIR!', 'PASANG!')}
            </text>

            {/* Right Padlock Card (cleanly padded inside border with zero clipping) */}
            <g style={{ opacity: rightOpacity, transition: 'opacity 320ms ease' }}>
              <rect x="342" y="24" width="194" height="108" rx="18" fill="#E0F2FE" stroke={focusSide === 'right' ? '#0369A1' : '#0284C7'} strokeWidth={focusSide === 'right' ? 3.2 : 2.4} />
              <path d="M 428 56 V 47 A 11 11 0 0 1 450 47 V 56" fill="none" stroke="#0369A1" strokeWidth="3" />
              <rect x="421" y="56" width="36" height="22" rx="5" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.2" />
              <circle cx="439" cy="67" r="3.4" fill="#0284C7" />
              <text x="439" y="99" textAnchor="middle" fontSize={rightFontSize} fontWeight="800" fill="#0C4A6E">
                {svgRight}
              </text>
              <text x="439" y="117" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0369A1">
                {wbPick('MATCHING FORM', 'KATA PASANGAN')}
              </text>
            </g>
          </g>
        )}

        {theme === 'locomotive_train' && (
          <g>
            {/* Rail track */}
            <line x1="20" y1="128" x2="540" y2="128" stroke="#64748B" strokeWidth="3.5" />
            {[45, 95, 145, 195, 245, 295, 345, 395, 445, 495].map((rx) => (
              <line key={rx} x1={rx} y1="128" x2={rx - 6} y2="136" stroke="#94A3B8" strokeWidth="2.2" />
            ))}
            {/* Train Car 1 (Engine) */}
            <rect x="36" y="34" width="204" height="78" rx="16" fill="#DBEAFE" stroke="#1D4ED8" strokeWidth="2.5" />
            <rect x="52" y="18" width="28" height="16" rx="4" fill="#93C5FD" stroke="#1D4ED8" strokeWidth="2" />
            <circle cx="82" cy="116" r="11" fill="#1E293B" />
            <circle cx="194" cy="116" r="11" fill="#1E293B" />
            <text x="138" y="68" textAnchor="middle" fontSize={leftFontSize} fontWeight="800" fill="#1E3A8A">
              {svgLeft}
            </text>
            <text x="138" y="90" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1D4ED8">
              {wbPick('Lead Car', 'Gerbong Awal')}
            </text>
            {/* Coupler */}
            <line x1="242" y1="78" x2="314" y2="78" stroke="#0F172A" strokeWidth="4" />
            <polygon points="274,71 288,78 274,85" fill="#F59E0B" />
            {/* Train Car 2 */}
            <rect x="316" y="34" width="208" height="78" rx="16" fill="#DCFCE7" stroke="#15803D" strokeWidth="2.5" />
            <circle cx="362" cy="116" r="11" fill="#1E293B" />
            <circle cx="478" cy="116" r="11" fill="#1E293B" />
            <text x="420" y="68" textAnchor="middle" fontSize={rightFontSize} fontWeight="800" fill="#14532D">
              {svgRight}
            </text>
            <text x="420" y="90" textAnchor="middle" fontSize="10" fontWeight="700" fill="#15803D">
              {wbPick('Right Link', 'Sambungan Tepat')}
            </text>
          </g>
        )}

        {theme === 'traffic_light' && (
          <g>
            <rect x="26" y="28" width="184" height="100" rx="18" fill="#FEF2F2" stroke="#DC2626" strokeWidth="2.4" />
            <text x="118" y="72" textAnchor="middle" fontSize={leftFontSize} fontWeight="800" fill="#991B1B">
              {svgLeft}
            </text>
            <text x="118" y="96" textAnchor="middle" fontSize="10" fontWeight="700" fill="#DC2626">
              {wbPick('Check Context', 'Cek Situasi')}
            </text>
            <rect x="252" y="18" width="56" height="120" rx="16" fill="#1E293B" />
            <circle cx="280" cy="44" r="13" fill="#EF4444" />
            <circle cx="280" cy="78" r="13" fill="#F59E0B" />
            <circle cx="280" cy="112" r="13" fill="#22C55E" />
            <rect x="350" y="28" width="184" height="100" rx="18" fill="#DCFCE7" stroke="#15803D" strokeWidth="2.4" />
            <text x="442" y="72" textAnchor="middle" fontSize={rightFontSize} fontWeight="800" fill="#14532D">
              {svgRight}
            </text>
            <text x="442" y="96" textAnchor="middle" fontSize="10" fontWeight="700" fill="#15803D">
              {wbPick('Safe to Use', 'Aman Dipakai')}
            </text>
          </g>
        )}

        {theme === 'rpg_stats' && (
          <g>
            {/* Left RPG Status Shield */}
            <rect x="26" y="24" width="190" height="106" rx="18" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2.5" />
            <path d="M 60 40 L 82 40 L 82 58 C 82 69 71 75 71 75 C 71 75 60 69 60 58 Z" fill="#38BDF8" stroke="#0369A1" strokeWidth="2" />
            <rect x="94" y="47" width="100" height="12" rx="6" fill="#BAE6FD" />
            <rect x="94" y="47" width="78" height="12" rx="6" fill="#0284C7" />
            <text x="121" y="96" textAnchor="middle" fontSize={leftFontSize} fontWeight="800" fill="#0C4A6E">
              {svgLeft}
            </text>
            <text x="121" y="114" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0369A1">
              KARAKTER / STATUS
            </text>

            <rect x="228" y="58" width="104" height="36" rx="18" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.2" />
            <text x="280" y="80" textAnchor="middle" fontSize={centerBadge.length > 14 ? 9.5 : 11} fontWeight="800" fill="#92400E">
              {centerBadge.slice(0, 18)}
            </text>

            {/* Right RPG Skill / Verb Card */}
            <rect x="344" y="24" width="190" height="106" rx="18" fill="#DCFCE7" stroke="#15803D" strokeWidth="2.5" />
            <polygon points="384,38 368,62 380,62 376,78 396,54 384,54" fill="#22C55E" stroke="#14532D" strokeWidth="1.6" />
            <rect x="406" y="47" width="106" height="12" rx="6" fill="#BBF7D0" />
            <rect x="406" y="47" width="92" height="12" rx="6" fill="#16A34A" />
            <text x="439" y="96" textAnchor="middle" fontSize={rightFontSize} fontWeight="800" fill="#14532D">
              {svgRight}
            </text>
            <text x="439" y="114" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#15803D">
              FUNGSI UTAMA
            </text>
          </g>
        )}
      </svg>

      {/* Smooth gliding SVG pen cursor during active drawing - floats cleanly above labels */}
      {isWritingActive && (
        <div
          className="pointer-events-none absolute transition-all duration-150 ease-out"
          style={{
            left: `${penX}%`,
            top: `${Math.max(10, Math.min(26, penY - 38))}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <AnimatedTutorPenSvg />
        </div>
      )}
    </div>
  );
};

const SPATIAL_STOPWORD_RE =
  /^(?:yang|dan|atau|untuk|pakai|memakai|dengan|dari|pada|ini|itu|adalah|sebagai|bisa|akan|saat|jika|kalau|bukan|kata|arti|artinya|contoh|contohnya|kalimat|bentuk|sisi|panel|bagian|sebelah|pertama|kedua|ketiga|keempat|khusus|hanya|juga|dalam|lebih|the|and|with|from|into|that|this|use|used|can|not|also|only)$/;
const CORE_SHORT_GRAMMAR_RE =
  /^(?:am|is|are|be|do|did|does|to|in|on|at|by|for|of|no|wa|ga|wo|ni|de|he|ka|は|が|を|に|で|へ|も)$/;
const CJK_OR_THAI_CHAR_RE = /[\u3040-\u30ff\u4e00-\u9faf\u0e00-\u0e7f]/;

function normalizeSpokenForBoundaryMatch(raw: string): string {
  return ` ${String(raw || '')
    .toLowerCase()
    .replace(/\b(?:bukan|alih-alih|instead\s+of|rather\s+than)\s+(?:untuk\s+|memakai\s+|pakai\s+)?[a-z0-9]+(?:\s+[a-z0-9]+){0,2}/gi, ' ')
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf\u0e00-\u0e7f]+/gi, ' ')
    .trim()} `;
}

function findLastRegexMatchIdx(text: string, rx: RegExp): number {
  let last = -1;
  let m: RegExpExecArray | null;
  const clone = new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : `${rx.flags}g`);
  while ((m = clone.exec(text)) !== null) {
    last = m.index;
    if (m[0].length === 0) clone.lastIndex += 1;
  }
  return last;
}

/** Extract meaningful content + short grammar/particle tokens from a board panel/item. */
export function extractSpatialFocusTokens(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw || '').toLowerCase().split(/[\s,/():;!?'"-]+/)) {
    const tok = part.replace(/^[^a-z0-9\u3040-\u30ff\u4e00-\u9faf\u0e00-\u0e7f]+|[^a-z0-9\u3040-\u30ff\u4e00-\u9faf\u0e00-\u0e7f]+$/gi, '');
    if (!tok) continue;
    const isCjkOrThai = CJK_OR_THAI_CHAR_RE.test(tok);
    const isShortGrammar = CORE_SHORT_GRAMMAR_RE.test(tok);
    if (!isCjkOrThai && !isShortGrammar && tok.length < 3) continue;
    if (!isShortGrammar && SPATIAL_STOPWORD_RE.test(tok)) continue;
    if (!seen.has(tok)) {
      seen.add(tok);
      out.push(tok);
    }
  }
  return out;
}

/** Count boundary-safe token matches between active speech and a board card/item. */
export function countSpatialTokenHits(spokenLower: string, itemText: string, paddedSpoken?: string): number {
  const cleanSpoken = String(spokenLower || '').toLowerCase();
  if (cleanSpoken.length < 2) return 0;
  const padded = paddedSpoken || normalizeSpokenForBoundaryMatch(cleanSpoken);
  const tokens = extractSpatialFocusTokens(itemText);
  let hits = 0;
  for (const tok of tokens) {
    if (CJK_OR_THAI_CHAR_RE.test(tok)) {
      if (cleanSpoken.includes(tok)) hits += 1;
    } else if (padded.includes(` ${tok} `)) {
      hits += 1;
    }
  }
  return hits;
}

/** Resolve Left vs Right panel focus following explicit directional cues first, then token hits, then Left-to-Right order. */
export function resolveSpatialPanelFocus(opts: {
  spokenText?: string;
  progress: number;
  leftText: string;
  rightText: string;
  isActive: boolean;
  isPlaying: boolean;
  autoZoom: boolean;
  isLightbox?: boolean;
  queuedPreview?: boolean;
  chronologicalSplit?: number;
}): 'left' | 'right' | 'none' {
  const {
    spokenText,
    progress,
    leftText,
    rightText,
    isActive,
    isPlaying,
    autoZoom,
    isLightbox = false,
    queuedPreview = false,
    chronologicalSplit = 0.48,
  } = opts;
  if (isLightbox || queuedPreview || !autoZoom || !isActive || !isPlaying || progress < 0.01 || progress >= 0.93) {
    return 'none';
  }
  const spokenLower = String(spokenText || '').toLowerCase();
  const lastLeftCue = findLastRegexMatchIdx(
    spokenLower,
    /\b(?:(?:di\s+)?(?:sisi|sebelah|panel|kolom|bagian|kotak)\s+kiri|left\s+(?:side|panel|column|box)|on\s+the\s+left|pertama|first(?:ly)?)\b/gi
  );
  const lastRightCue = findLastRegexMatchIdx(
    spokenLower,
    /\b(?:(?:di\s+)?(?:sisi|sebelah|panel|kolom|bagian|kotak)\s+kanan|right\s+(?:side|panel|column|box)|on\s+the\s+right|kedua|second(?:ly)?|sebaliknya|sedangkan|sebagai\s+pembanding)\b/gi
  );
  if (lastLeftCue >= 0 || lastRightCue >= 0) {
    return lastRightCue > lastLeftCue ? 'right' : 'left';
  }

  const padded = normalizeSpokenForBoundaryMatch(spokenLower);
  const leftHits = countSpatialTokenHits(spokenLower, leftText, padded);
  const rightHits = countSpatialTokenHits(spokenLower, rightText, padded);
  if (leftHits > rightHits && leftHits > 0) return 'left';
  if (rightHits > leftHits && rightHits > 0) {
    if (progress < 0.16 && !(leftHits === 0 && rightHits >= 2)) {
      return 'left';
    }
    return 'right';
  }
  return progress < chronologicalSplit ? 'left' : 'right';
}

/** Resolve active item index (0..N-1) using ordinal cues + boundary-safe token matching + Left-to-Right progression. */
export function resolveSequentialItemFocus(opts: {
  spokenText?: string;
  progress: number;
  itemTexts: string[];
  isActive: boolean;
  isPlaying: boolean;
  autoZoom: boolean;
  isLightbox?: boolean;
  queuedPreview?: boolean;
}): number {
  const { spokenText, progress, itemTexts, isActive, isPlaying, autoZoom, isLightbox = false, queuedPreview = false } = opts;
  if (isLightbox || queuedPreview || !autoZoom || !isActive || !isPlaying || itemTexts.length === 0 || progress < 0.01 || progress >= 0.93) {
    return -1;
  }
  const spokenLower = String(spokenText || '').toLowerCase();
  const n = itemTexts.length;
  const chronoIdx = Math.min(n - 1, Math.floor(((progress - 0.01) / 0.92) * n));

  const ordinalPatterns: Array<{ idx: number; rx: RegExp }> = [
    { idx: 0, rx: /\b(?:pertama|kesatu|first|langkah\s*1|cabang\s*1|blok\s*1|bagian\s*1|di\s+(?:sisi\s+|sebelah\s+)?kiri)\b/gi },
    { idx: Math.min(n - 1, 1), rx: /\b(?:kedua|second|langkah\s*2|cabang\s*2|blok\s*2|bagian\s*2)\b/gi },
    { idx: Math.min(n - 1, 2), rx: /\b(?:ketiga|third|langkah\s*3|cabang\s*3|blok\s*3|bagian\s*3)\b/gi },
    { idx: Math.min(n - 1, 3), rx: /\b(?:keempat|fourth|langkah\s*4|cabang\s*4|blok\s*4|bagian\s*4)\b/gi },
    { idx: n - 1, rx: /\b(?:terakhir|di\s+(?:sisi\s+|sebelah\s+)?kanan)\b/gi },
  ];
  let bestOrdIdx = -1;
  let bestOrdPos = -1;
  for (const op of ordinalPatterns) {
    const pos = findLastRegexMatchIdx(spokenLower, op.rx);
    if (pos > bestOrdPos) {
      bestOrdPos = pos;
      bestOrdIdx = op.idx;
    }
  }
  if (bestOrdIdx >= 0) return bestOrdIdx;

  if (spokenLower.length >= 4) {
    const padded = normalizeSpokenForBoundaryMatch(spokenLower);
    let bestHits = 0;
    let matchedIdx = -1;
    itemTexts.forEach((txt, idx) => {
      const hits = countSpatialTokenHits(spokenLower, txt, padded);
      if (hits > bestHits) {
        bestHits = hits;
        matchedIdx = idx;
      }
    });
    if (matchedIdx >= 0) {
      if (progress < 0.14 && matchedIdx > 1 && bestHits < 2) {
        return chronoIdx;
      }
      return matchedIdx;
    }
  }
  return chronoIdx;
}

export const MetaphorSceneDiagram: React.FC<{
  step: WhiteboardSceneStep;
  progress: number;
  isActive: boolean;
  isPlaying: boolean;
  queuedPreview?: boolean;
  onZoomInspect?: () => void;
  isLightbox?: boolean;
  autoZoom?: boolean;
  spokenText?: string;
}> = ({ step, progress, isActive, isPlaying, queuedPreview = false, onZoomInspect, isLightbox = false, autoZoom = true, spokenText }) => {
  const theme = step.sceneTheme || 'key_and_lock';
  const defaultLeftIcon =
    theme === 'camera_vs_video' ? 'camera' : theme === 'key_and_lock' ? 'key' : theme === 'bridge_timeline' ? 'clock' : 'star';
  const defaultRightIcon =
    theme === 'camera_vs_video' ? 'video' : theme === 'key_and_lock' ? 'lock' : theme === 'bridge_timeline' ? 'bridge' : 'bolt';
  const lp = step.leftPanel || {
    badge: theme === 'camera_vs_video' ? wbPick('SNAPSHOT', 'FOTO KONDISI') : wbPick('RULE 1', 'ATURAN 1'),
    title: step.termA || wbPick('Core Form', 'Bentuk Utama'),
    subtitle: step.descA || '',
    icon: defaultLeftIcon,
    accentColor: '#0284C7',
    bgColor: '#E0F2FE',
  };
  const rp = step.rightPanel || {
    badge: theme === 'camera_vs_video' ? wbPick('ACTION VIDEO', 'VIDEO AKSI') : wbPick('RULE 2', 'ATURAN 2'),
    title: step.termB || wbPick('Contrast Form', 'Bentuk Pembanding'),
    subtitle: step.descB || '',
    icon: defaultRightIcon,
    accentColor: '#15803D',
    bgColor: '#DCFCE7',
  };

  const effProgress = isLightbox ? 1 : queuedPreview ? 0.04 : progress;
  const isWritingNow = !isLightbox && !queuedPreview && isActive && isPlaying && effProgress > 0.01 && effProgress < 0.95;
  const terms = queuedPreview ? [] : step.highlightTerms || [];

  // Sinkronkan panel Zoom In dengan kalimat yang sedang diucapkan tutor (arahan kiri/kanan -> token isi -> kiri lalu kanan)
  const focusSide = resolveSpatialPanelFocus({
    spokenText,
    progress: effProgress,
    leftText: `${lp.title || ''} ${step.termA || ''} ${lp.subtitle || ''} ${lp.example || ''}`,
    rightText: `${rp.title || ''} ${step.termB || ''} ${rp.subtitle || ''} ${rp.example || ''}`,
    isActive,
    isPlaying,
    autoZoom,
    isLightbox,
    queuedPreview,
    chronologicalSplit: 0.46,
  });
  const analogyZoomed =
    !isLightbox && autoZoom && isActive && isPlaying && effProgress >= 0.68 && effProgress < 0.93;
  const isMobileLite = isMobileLowMemoryDevice();

  return (
    <div className="space-y-3" data-testid="wb-metaphor-scene">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF3C7] border border-[#F59E0B]/40 text-[10.5px] font-extrabold text-[#92400E]">
          <span>🎨</span>
          <span>{step.metaphorCenterLabel || 'Analogi Visual Interaktif'}</span>
        </div>
        {!isLightbox && <ZoomInspectButton onClick={onZoomInspect} />}
      </div>

      <MetaphorThemeHeroSvg
        theme={theme}
        leftLabel={lp.title}
        rightLabel={rp.title}
        centerLabel={step.metaphorCenterLabel}
        progress={effProgress}
        isWritingActive={isWritingNow}
        focusSide={focusSide}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 overflow-visible">
        {/* Panel Kiri */}
        <div
          data-wb-panel-focus={focusSide === 'left' ? 'zoom-in' : focusSide === 'right' ? 'dim' : 'idle'}
          className="relative rounded-2xl border-2 p-3.5 transition-all duration-500 ease-out"
          style={{
            backgroundColor: lp.bgColor || '#E0F2FE',
            borderColor: focusSide === 'left' ? lp.accentColor || '#0284C7' : `${lp.accentColor || '#0284C7'}55`,
            opacity: focusSide === 'right' ? 0.44 : effProgress >= 0.12 ? 1 : 0.18,
            transform: isMobileLite
              ? undefined
              : focusSide === 'left'
                ? 'translateY(-3px) scale(1.04)'
                : focusSide === 'right'
                  ? 'translateY(0) scale(0.97)'
                  : effProgress >= 0.12
                    ? 'translateY(0) scale(1)'
                    : 'translateY(4px) scale(0.98)',
            boxShadow:
              focusSide === 'left'
                ? isMobileLite
                  ? `0 0 0 2.5px ${lp.accentColor || '#0284C7'}`
                  : `0 18px 38px ${lp.accentColor || '#0284C7'}38, 0 0 0 2.5px ${lp.accentColor || '#0284C7'}`
                : undefined,
            zIndex: focusSide === 'left' && !isMobileLite ? 20 : undefined,
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold tracking-wider uppercase text-white"
                style={{ backgroundColor: lp.accentColor || '#0284C7' }}
              >
                {lp.badge || wbPick('CONCEPT 1', 'KONSEP 1')}
              </span>
              {focusSide === 'left' && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/95 text-[#0369A1] text-[9px] font-extrabold shadow-2xs">
                  {wbPick('🔎 Focus', '🔎 Fokus')}
                </span>
              )}
            </div>
            <SmpVectorIcon name={lp.icon || 'camera'} color={lp.accentColor || '#0284C7'} size={20} />
          </div>
          <h5 className="text-[16px] font-extrabold text-[#0F172A] fz-handwriting-heading">
            <HighlightText text={lp.title} terms={terms} active={effProgress >= 0.15} emphasize={focusSide === 'left'} />
          </h5>
          {lp.subtitle && (
            <p className="mt-1 text-[12.5px] text-[#334155] leading-relaxed">
              <HighlightText text={lp.subtitle} terms={terms} active={effProgress >= 0.25} emphasize={focusSide === 'left'} />
            </p>
          )}
          {lp.example && (
            <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-white/90 border border-black/10 text-[12px] font-bold text-[#0F172A]">
              💬 <HighlightText text={lp.example} terms={terms} active={effProgress >= 0.35} emphasize={focusSide === 'left'} />
            </div>
          )}
        </div>

        {/* Panel Kanan */}
        <div
          data-wb-panel-focus={focusSide === 'right' ? 'zoom-in' : focusSide === 'left' ? 'dim' : 'idle'}
          className="relative rounded-2xl border-2 p-3.5 transition-all duration-500 ease-out"
          style={{
            backgroundColor: rp.bgColor || '#DCFCE7',
            borderColor: focusSide === 'right' ? rp.accentColor || '#15803D' : `${rp.accentColor || '#15803D'}55`,
            opacity: focusSide === 'left' ? 0.44 : effProgress >= 0.3 ? 1 : 0.18,
            transform: isMobileLite
              ? undefined
              : focusSide === 'right'
                ? 'translateY(-3px) scale(1.04)'
                : focusSide === 'left'
                  ? 'translateY(0) scale(0.97)'
                  : effProgress >= 0.3
                    ? 'translateY(0) scale(1)'
                    : 'translateY(4px) scale(0.98)',
            boxShadow:
              focusSide === 'right'
                ? isMobileLite
                  ? `0 0 0 2.5px ${rp.accentColor || '#15803D'}`
                  : `0 18px 38px ${rp.accentColor || '#15803D'}38, 0 0 0 2.5px ${rp.accentColor || '#15803D'}`
                : undefined,
            zIndex: focusSide === 'right' && !isMobileLite ? 20 : undefined,
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold tracking-wider uppercase text-white"
                style={{ backgroundColor: rp.accentColor || '#15803D' }}
              >
                {rp.badge || wbPick('CONCEPT 2', 'KONSEP 2')}
              </span>
              {focusSide === 'right' && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/95 text-[#15803D] text-[9px] font-extrabold shadow-2xs">
                  {wbPick('🔎 Focus', '🔎 Fokus')}
                </span>
              )}
            </div>
            <SmpVectorIcon name={rp.icon || 'video'} color={rp.accentColor || '#15803D'} size={20} />
          </div>
          <h5 className="text-[16px] font-extrabold text-[#0F172A] fz-handwriting-heading">
            <HighlightText text={rp.title} terms={terms} active={effProgress >= 0.4} emphasize={focusSide === 'right'} />
          </h5>
          {rp.subtitle && (
            <p className="mt-1 text-[12.5px] text-[#334155] leading-relaxed">
              <HighlightText text={rp.subtitle} terms={terms} active={effProgress >= 0.5} emphasize={focusSide === 'right'} />
            </p>
          )}
          {rp.example && (
            <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-white/90 border border-black/10 text-[12px] font-bold text-[#0F172A]">
              💬 <HighlightText text={rp.example} terms={terms} active={effProgress >= 0.6} emphasize={focusSide === 'right'} />
            </div>
          )}
        </div>
      </div>

      {step.analogy && (
        <div
          className="px-3.5 py-2.5 rounded-2xl bg-[#FFFBEB] border border-[#F59E0B]/45 text-[12px] font-semibold text-[#78350F] flex items-start gap-2 transition-transform duration-500 ease-out"
          style={{
            transform: isMobileLite ? undefined : analogyZoomed ? 'scale(1.045)' : 'scale(1)',
            boxShadow: analogyZoomed
              ? isMobileLite
                ? '0 0 0 2px rgba(245, 158, 11, 0.55)'
                : '0 12px 26px rgba(245, 158, 11, 0.28)'
              : undefined,
          }}
        >
          <span className="shrink-0 text-sm">💡</span>
          <span>
            <HighlightText text={step.analogy} terms={terms} active={effProgress >= 0.55} emphasize={analogyZoomed} />
          </span>
        </div>
      )}
    </div>
  );
};

export const MindMapDiagram: React.FC<{
  step: WhiteboardSceneStep;
  progress: number;
  isActive: boolean;
  isPlaying: boolean;
  queuedPreview?: boolean;
  onZoomInspect?: () => void;
  isLightbox?: boolean;
  autoZoom?: boolean;
  spokenText?: string;
}> = ({ step, progress, isActive, isPlaying, queuedPreview = false, onZoomInspect, isLightbox = false, autoZoom = true, spokenText }) => {
  const branches = (step.branches || []).slice(0, 6);
  if (branches.length === 0) return null;
  const effProgress = isLightbox ? 1 : queuedPreview ? 0.04 : progress;
  const isWritingNow = !isLightbox && !queuedPreview && isActive && isPlaying && effProgress > 0.01 && effProgress < 0.95;
  const centerLabel = step.metaphorCenterLabel || step.title || wbPick('Core Concept', 'Konsep Inti');
  const terms = queuedPreview ? [] : step.highlightTerms || [];
  const activeBranchIdx = resolveSequentialItemFocus({
    spokenText,
    progress: effProgress,
    itemTexts: branches.map((br) => `${br.label || ''} ${br.sublabel || ''} ${br.example || ''}`),
    isActive,
    isPlaying,
    autoZoom,
    isLightbox,
    queuedPreview,
  });
  const isMobileLite = isMobileLowMemoryDevice();

  return (
    <div className="space-y-3" data-testid="wb-mind-map">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEF2FF] border border-[#818CF8]/40 text-[10.5px] font-extrabold text-[#3730A3]">
          <span>🧠</span>
          <span>Peta Pikiran Bercabang</span>
        </span>
        <div className="flex items-center gap-2">
          {isWritingNow && <AnimatedTutorPenSvg label="Menggambar cabang..." />}
          {!isLightbox && <ZoomInspectButton onClick={onZoomInspect} />}
        </div>
      </div>

      {/* Organic Hub Banner */}
      <div className="relative rounded-2xl bg-[#FFFDF7] border border-[#CBD5E1] p-3.5 overflow-visible">
        <svg viewBox="0 0 560 76" className="w-full h-auto block mb-2" aria-hidden="true">
          {branches.map((br, idx) => {
            const cols = Math.max(2, Math.min(branches.length, 4));
            const endX = 70 + ((idx % cols) * 420) / Math.max(1, cols - 1);
            const threshold = (idx / Math.max(1, branches.length)) * 0.72;
            const branchReveal = isLightbox ? 1 : queuedPreview ? 0.04 : Math.max(0, Math.min(1, (effProgress - threshold) / 0.16));
            const isBranchFocused = idx === activeBranchIdx;
            const c = br.color || '#0EA5E9';
            return (
              <g key={idx}>
                <path
                  d={`M 280 28 C 280 54, ${endX} 42, ${endX} 70`}
                  fill="none"
                  stroke={c}
                  strokeWidth={isBranchFocused ? 3.8 : 2.6}
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="100"
                  strokeDashoffset={Math.round((1 - branchReveal) * 100)}
                  opacity={activeBranchIdx >= 0 && !isBranchFocused ? 0.32 : Math.max(0.25, branchReveal * 0.95)}
                  style={{ transition: 'stroke-dashoffset 220ms ease-out, stroke-width 200ms ease, opacity 200ms ease' }}
                />
                <circle
                  cx={endX}
                  cy={70}
                  r={isBranchFocused ? 5.2 : 3.6}
                  fill={isBranchFocused ? c : '#FFFFFF'}
                  stroke={c}
                  strokeWidth="2.2"
                  opacity={branchReveal > 0.7 ? 1 : 0.3}
                  style={{ transition: 'r 200ms ease, opacity 200ms ease' }}
                />
              </g>
            );
          })}
          <rect x="155" y="4" width="250" height="38" rx="19" fill="#DBEAFE" stroke="#1D4ED8" strokeWidth="2.5" />
          <text x="280" y="28" textAnchor="middle" fontSize="13.5" fontWeight="800" fill="#1E3A8A">
            {centerLabel.slice(0, 26)}
          </text>
        </svg>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {branches.map((br, idx) => {
            const c = br.color || '#0EA5E9';
            const visible = isLightbox || (!queuedPreview && effProgress >= (idx / Math.max(1, branches.length)) * 0.72);
            const isFocused = idx === activeBranchIdx;
            return (
              <div
                key={idx}
                data-wb-panel-focus={isFocused ? 'zoom-in' : activeBranchIdx >= 0 ? 'dim' : 'idle'}
                className="relative rounded-2xl border-2 bg-white p-3 transition-all duration-200 shadow-xs"
                style={{
                  borderColor: isFocused ? c : `${c}66`,
                  opacity: activeBranchIdx >= 0 && !isFocused ? 0.46 : visible ? 1 : 0.16,
                  transform: isMobileLite
                    ? undefined
                    : !visible
                      ? 'scale(0.98)'
                      : isFocused
                        ? 'translateY(-2px) scale(1.04)'
                        : activeBranchIdx >= 0
                          ? 'scale(0.955)'
                          : 'scale(1)',
                  boxShadow: isFocused
                    ? isMobileLite
                      ? `0 0 0 2.5px ${c}`
                      : `0 16px 34px ${c}38, 0 0 0 2.5px ${c}`
                    : undefined,
                  zIndex: isFocused && !isMobileLite ? 20 : undefined,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${c}20` }}
                  >
                    <SmpVectorIcon name={br.icon || 'star'} color={c} size={17} />
                  </span>
                  <span className="font-extrabold text-[13.5px] text-[#0F172A] fz-handwriting-heading">
                    <HighlightText text={br.label} terms={terms} active={visible} />
                  </span>
                </div>
                {br.sublabel && (
                  <p className="text-[12px] text-[#334155] leading-snug">
                    <HighlightText text={br.sublabel} terms={terms} active={visible} />
                  </p>
                )}
                {br.example && (
                  <div className="mt-1.5 px-2 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11.5px] font-bold text-[#0F172A]">
                    <HighlightText text={br.example} terms={terms} active={visible} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const TimelineTrackDiagram: React.FC<{
  step: WhiteboardSceneStep;
  progress: number;
  isActive: boolean;
  isPlaying: boolean;
  queuedPreview?: boolean;
  onZoomInspect?: () => void;
  isLightbox?: boolean;
  autoZoom?: boolean;
  spokenText?: string;
}> = ({ step, progress, isActive, isPlaying, queuedPreview = false, onZoomInspect, isLightbox = false, autoZoom = true, spokenText }) => {
  const events = (step.timelineEvents || []).slice(0, 5);
  if (events.length === 0) return null;
  const effProgress = isLightbox ? 1 : queuedPreview ? 0.04 : progress;
  const isWritingNow = !isLightbox && !queuedPreview && isActive && isPlaying && effProgress > 0.01 && effProgress < 0.95;
  const terms = queuedPreview ? [] : step.highlightTerms || [];
  const activeEventIdx = resolveSequentialItemFocus({
    spokenText,
    progress: effProgress,
    itemTexts: events.map((ev) => `${ev.timeLabel || ''} ${ev.title || ''} ${ev.example || ''}`),
    isActive,
    isPlaying,
    autoZoom,
    isLightbox,
    queuedPreview,
  });
  const isMobileLite = isMobileLowMemoryDevice();

  return (
    <div className="space-y-3" data-testid="wb-timeline-track">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E0F2FE] border border-[#0284C7]/35 text-[10.5px] font-extrabold text-[#0369A1]">
          <span>⏱️</span>
          <span>Garis Waktu & Tahapan</span>
        </span>
        <div className="flex items-center gap-2">
          {isWritingNow && <AnimatedTutorPenSvg label="Melacak waktu..." />}
          {!isLightbox && <ZoomInspectButton onClick={onZoomInspect} />}
        </div>
      </div>

      <div className="rounded-2xl bg-[#FFFDF7] border border-[#CBD5E1] p-3.5 space-y-3">
        {/* Progress Time Rail */}
        <div className="relative flex items-center justify-between px-4 py-2">
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[#E2E8F0]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0EA5E9] via-[#10B981] to-[#F59E0B] transition-all duration-300"
              style={{ width: `${Math.round(Math.max(12, effProgress * 100))}%` }}
            />
          </div>
          {events.map((ev, i) => (
            <div
              key={i}
              className="relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white shadow-xs transition-transform duration-300"
              style={{
                borderColor: ev.color || '#0EA5E9',
                transform: isMobileLite
                  ? undefined
                  : i === activeEventIdx
                    ? 'scale(1.22)'
                    : ev.isActive
                      ? 'scale(1.12)'
                      : 'scale(1)',
              }}
            >
              <SmpVectorIcon name={ev.icon || 'clock'} color={ev.color || '#0EA5E9'} size={15} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {events.map((ev, i) => {
            const visible = isLightbox || (!queuedPreview && effProgress >= (i / Math.max(1, events.length)) * 0.72);
            const isFocused = i === activeEventIdx;
            const c = ev.color || '#0EA5E9';
            return (
              <div
                key={i}
                data-wb-panel-focus={isFocused ? 'zoom-in' : activeEventIdx >= 0 ? 'dim' : 'idle'}
                className="relative rounded-2xl border-2 p-2.5 transition-all duration-200"
                style={{
                  backgroundColor: isFocused || ev.isActive ? '#ECFDF5' : '#FFFFFF',
                  borderColor: isFocused ? c : ev.isActive ? '#10B981' : '#E2E8F0',
                  opacity: activeEventIdx >= 0 && !isFocused ? 0.46 : visible ? 1 : 0.16,
                  transform: isMobileLite
                    ? undefined
                    : isFocused
                      ? 'translateY(-2px) scale(1.04)'
                      : activeEventIdx >= 0
                        ? 'scale(0.97)'
                        : 'scale(1)',
                  boxShadow: isFocused
                    ? isMobileLite
                      ? `0 0 0 2.5px ${c}`
                      : `0 16px 34px ${c}38, 0 0 0 2.5px ${c}`
                    : undefined,
                  zIndex: isFocused && !isMobileLite ? 20 : undefined,
                }}
              >
                <div className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: ev.color || '#0369A1' }}>
                  {ev.timeLabel}
                </div>
                <div className="mt-0.5 text-[13px] font-extrabold text-[#0F172A] fz-handwriting-heading">
                  <HighlightText text={ev.title} terms={terms} active={visible} />
                </div>
                {ev.example && (
                  <div className="mt-1.5 px-2 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11.5px] font-bold text-[#1E293B]">
                    <HighlightText text={ev.example} terms={terms} active={visible} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const FormulaBlocksDiagram: React.FC<{
  step: WhiteboardSceneStep;
  progress: number;
  isActive: boolean;
  isPlaying: boolean;
  queuedPreview?: boolean;
  onZoomInspect?: () => void;
  isLightbox?: boolean;
  autoZoom?: boolean;
  spokenText?: string;
}> = ({ step, progress, isActive, isPlaying, queuedPreview = false, onZoomInspect, isLightbox = false, autoZoom = true, spokenText }) => {
  const blocks = (step.blocks || []).slice(0, 6);
  if (blocks.length === 0) return null;
  const effProgress = isLightbox ? 1 : queuedPreview ? 0.04 : progress;
  const isWritingNow = !isLightbox && !queuedPreview && isActive && isPlaying && effProgress > 0.01 && effProgress < 0.95;
  const terms = queuedPreview ? [] : step.highlightTerms || [];
  const activeBlockIdx = resolveSequentialItemFocus({
    spokenText,
    progress: effProgress,
    itemTexts: blocks.map((bl) => `${bl.role || ''} ${bl.token || ''} ${bl.note || ''}`),
    isActive,
    isPlaying,
    autoZoom,
    isLightbox,
    queuedPreview,
  });
  const isMobileLite = isMobileLowMemoryDevice();

  return (
    <div className="space-y-3" data-testid="wb-formula-blocks">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DCFCE7] border border-[#16A34A]/35 text-[10.5px] font-extrabold text-[#14532D]">
          <span>🧩</span>
          <span>{wbPick('Sentence Pattern Blocks', 'Rakit Puzzle Pola Kalimat')}</span>
        </span>
        <div className="flex items-center gap-2">
          {isWritingNow && <AnimatedTutorPenSvg label={wbPick('Arranging blocks...', 'Menyusun blok...')} />}
          {!isLightbox && <ZoomInspectButton onClick={onZoomInspect} />}
        </div>
      </div>

      <div className="rounded-2xl bg-[#FFFDF7] border border-[#CBD5E1] p-3.5 space-y-3">
        {(() => {
          const isPatternMatrix = blocks.some((b) => /\s/.test((b.token || '').trim()));
          return (
            <div
              className={
                isPatternMatrix
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
                  : 'flex flex-wrap items-center justify-center gap-2'
              }
            >
              {blocks.map((bl, idx) => {
                const c = bl.color || '#0EA5E9';
                const visible = isLightbox || (!queuedPreview && effProgress >= (idx / Math.max(1, blocks.length)) * 0.72);
                const isFocused = idx === activeBlockIdx;
                return (
                  <React.Fragment key={idx}>
                    <div
                      data-wb-panel-focus={isFocused ? 'zoom-in' : activeBlockIdx >= 0 ? 'dim' : 'idle'}
                      className="relative rounded-2xl border-2 px-3 py-2 text-center shadow-xs transition-all duration-200"
                      style={{
                        borderColor: c,
                        backgroundColor: isFocused ? `${c}26` : `${c}15`,
                        opacity: activeBlockIdx >= 0 && !isFocused ? 0.46 : visible ? 1 : 0.16,
                        transform: isMobileLite
                          ? undefined
                          : !visible
                            ? 'translateY(2px) scale(0.98)'
                            : isFocused
                              ? 'translateY(-4px) scale(1.075)'
                              : activeBlockIdx >= 0
                                ? 'translateY(0) scale(0.955)'
                                : 'translateY(0) scale(1)',
                        boxShadow: isFocused
                          ? isMobileLite
                            ? `0 0 0 2.5px ${c}`
                            : `0 16px 34px ${c}3C, 0 0 0 2.5px ${c}`
                          : undefined,
                        zIndex: isFocused && !isMobileLite ? 20 : undefined,
                      }}
                    >
                      <div className="text-[9.5px] font-extrabold uppercase tracking-wider mb-0.5" style={{ color: c }}>
                        {bl.role}
                      </div>
                      <div className="text-[15px] font-extrabold text-[#0F172A] fz-handwriting-heading">
                        <HighlightText text={bl.token} terms={terms} active={visible} />
                      </div>
                      {bl.note && (
                        <div className="mt-0.5 text-[10.5px] font-medium text-[#475569] leading-snug">{bl.note}</div>
                      )}
                    </div>
                    {!isPatternMatrix && idx < blocks.length - 1 && (
                      <span className="text-[15px] font-extrabold text-[#64748B] select-none">➔</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })()}

        {(step.rightText || step.wrongText) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {step.rightText && (
              <div className="px-3 py-2 rounded-xl bg-[#ECFDF5] border border-[#86EFAC] text-[12px] font-bold text-[#14532D]">
                ✓ <HighlightText text={step.rightText} terms={terms} active={effProgress >= 0.65} />
              </div>
            )}
            {step.wrongText && (
              <div className="px-3 py-2 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[12px] font-semibold text-[#991B1B]">
                ✕ {step.wrongText}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const VisualZoomLightbox: React.FC<{
  step: WhiteboardSceneStep | null;
  onClose: () => void;
  renderContent: (step: WhiteboardSceneStep, lightboxScale: number) => React.ReactNode;
}> = ({ step, onClose, renderContent }) => {
  const [scale, setScale] = useState<number>(1);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    setScale(1);
  }, [step?.id]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateSize = () => {
      setNaturalSize({
        w: Math.ceil(el.offsetWidth || 0),
        h: Math.ceil(el.offsetHeight || 0),
      });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step?.id]);

  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onClose]);

  if (!step) return null;

  return (
    <div
      data-testid="wb-visual-zoom-lightbox"
      className="fixed inset-0 z-[120] bg-[#0F172A]/75 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] bg-[#FFFDF8] rounded-3xl border border-[#CBD5E1] shadow-2xl flex flex-col overflow-hidden fz-zoom-lightbox-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">🔍</span>
            <h4 className="font-extrabold text-[14px] text-[#0F172A] truncate">
              {step.title || wbPick('Whiteboard Visual Detail', 'Detail Visual Papan Belajar')}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-[#CBD5E1] rounded-xl overflow-hidden text-[11px] font-bold text-[#334155]">
              <button
                type="button"
                data-testid="wb-lightbox-zoom-out"
                onClick={() => setScale((s) => Math.max(0.8, Number((s - 0.15).toFixed(2))))}
                className="px-2.5 py-1 hover:bg-[#F1F5F9] cursor-pointer"
                title={wbPick('Zoom Out', 'Perkecil')}
              >
                −
              </button>
              <button
                type="button"
                data-testid="wb-lightbox-zoom-reset"
                onClick={() => setScale(1)}
                className="px-2 py-1 hover:bg-[#F1F5F9] cursor-pointer tabular-nums"
                title="Reset 100%"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                data-testid="wb-lightbox-zoom-in"
                onClick={() => setScale((s) => Math.min(2.2, Number((s + 0.15).toFixed(2))))}
                className="px-2.5 py-1 hover:bg-[#F1F5F9] cursor-pointer"
                title={wbPick('Zoom In', 'Perbesar')}
              >
                +
              </button>
            </div>
            <button
              type="button"
              data-testid="wb-lightbox-close"
              onClick={onClose}
              className="px-3 py-1 rounded-xl bg-[#0F172A] text-white text-[11px] font-bold hover:bg-[#1E293B] cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-auto p-5 sm:p-8 fz-solvely-dotgrid"
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setScale((s) =>
                Math.max(0.8, Math.min(2.2, Number((s + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(2))))
              );
            }
          }}
        >
          <div
            style={{
              width: naturalSize.w > 0 && scale > 1 ? Math.ceil(naturalSize.w * scale) : '100%',
              height: naturalSize.h > 0 ? Math.ceil(naturalSize.h * scale) : undefined,
              minHeight: 220,
              margin: '0 auto',
            }}
          >
            <div
              ref={innerRef}
              className="w-full max-w-[720px] transition-transform duration-200 ease-out"
              style={{
                width: naturalSize.w > 0 && scale > 1 ? naturalSize.w : '100%',
                margin: scale > 1 ? 0 : '0 auto',
                transform: `scale(${scale})`,
                transformOrigin: scale > 1 ? 'top left' : 'top center',
              }}
            >
              {renderContent(step, scale)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
