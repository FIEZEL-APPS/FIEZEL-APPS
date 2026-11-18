import React, { useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/caveat/600.css';
import '@fontsource/caveat/700.css';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';
import rough from 'roughjs';
import { annotate } from 'rough-notation';
import { getStroke } from 'perfect-freehand';
import {
  cleanReadingForLang,
  ensureKanjiStrokesLoaded,
  getKakijunEntry,
  resolveKakijunEntryForLang,
  subscribeKanjiVgUpdates,
  synthesizeFallbackStrokesForAnyChar,
} from '../data/kakijunStrokeBank';
import type { TargetLang, WhiteboardVectorShape } from '../types/voiceCall';
import type { WhiteboardScenePlan, WhiteboardSceneStep } from '../lib/whiteboardDirector';
import {
  AnimatedTutorPenSvg,
  FormulaBlocksDiagram,
  HighlightText,
  MetaphorSceneDiagram,
  MindMapDiagram,
  SmpVectorIcon,
  TimelineTrackDiagram,
  VisualZoomLightbox,
  countSpatialTokenHits,
  resolveSequentialItemFocus,
  resolveSpatialPanelFocus,
} from './WhiteboardVisualDiagrams';
import { MathText, splitMathSegments } from './MathText';
import { layoutGraphToShapes } from '../lib/dagreLayout';
import { wbPick } from '../lib/i18n';

export type PenColor = '#2563EB' | '#DC2626' | '#059669' | '#D97706';

interface FreehandStroke {
  id: string;
  color: PenColor;
  points: number[][];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

interface LiveWhiteboardCanvasProps {
  plan: WhiteboardScenePlan;
  targetLang?: TargetLang;
  playbackSpeed: 0.75 | 1 | 1.25 | 1.5;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  replayNonce: number;
  zoomLevel: number;
  onZoomChange?: (zoom: number) => void;
  autoSpotlight?: boolean;
  onToggleAutoSpotlight?: (enabled: boolean) => void;
  isPenActive: boolean;
  penColor: PenColor;
  onPenToggle: (active: boolean) => void;
  onCircleAsk: (excerpt: string, userQuestion?: string) => void;
  quizSlot: React.ReactNode;
  boardContainerRef?: React.RefObject<HTMLDivElement | null>;
  externalStepIndex?: number | null;
  externalStepProgress?: number | null;
  activeSpokenText?: string;
  onSelectStepIndex?: (idx: number) => void;
}

function cleanBracketArtifacts(val?: unknown): string {
  return String(val ?? '')
    .replace(/\(\s*\)|（\s*）|\[\s*\]|\{\s*\}/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,•])\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanSvgMathNotation(val?: unknown): string {
  return cleanBracketArtifacts(val)
    .replace(/\$\$/g, '')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\pi\b|\bpi\b/g, 'π')
    .replace(/([A-Za-z0-9)])\^2\b/g, '$1²')
    .replace(/([A-Za-z0-9)])\^3\b/g, '$1³')
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\sqrt\(([^)]+)\)|\\sqrt\{([^}]+)\}/g, '√($1$2)');
}

function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';
  const d = stroke.reduce<Array<string | number>>(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

const MarkerNibCursor: React.FC<{ color?: string }> = ({ color = '#2563EB' }) => (
  <span
    className="inline-flex items-center align-middle fz-marker-nib-bob pointer-events-none select-none drop-shadow-md"
    aria-hidden="true"
  >
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="4.5" cy="21.5" r="4.2" fill="#FDE047" fillOpacity="0.65" />
      <path
        d="M3.5 22.5L7.4 15.2L19.4 3.2C20.3 2.3 21.8 2.3 22.7 3.2C23.6 4.1 23.6 5.6 22.7 6.5L10.7 18.5L3.5 22.5Z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M16.2 6.4L19.6 9.8" stroke={color} strokeWidth="2.1" />
      <circle cx="4.1" cy="21.9" r="2.3" fill={color} />
    </svg>
  </span>
);

const HandwrittenReveal: React.FC<{
  text: string;
  progress: number;
  isActive: boolean;
  queuedPreview?: boolean;
  highlightTerms?: string[];
  emphasize?: boolean;
  className?: string;
}> = ({ text, progress, isActive, queuedPreview = false, highlightTerms = [], emphasize = false, className = '' }) => {
  const safeText = text || '';
  if (queuedPreview) {
    return (
      <span
        data-wb-queued-text="1"
        className={`opacity-0 select-none pointer-events-none ${className}`}
        aria-hidden="true"
      >
        <MathText text={safeText} active={false} />
      </span>
    );
  }
  if (progress >= 0.985) {
    return (
      <HighlightText
        text={safeText}
        terms={highlightTerms}
        active
        emphasize={emphasize}
        className={className}
      />
    );
  }
  const rawIdx = Math.max(0, Math.floor(safeText.length * Math.max(0, progress)));
  const wordEnd = rawIdx > 0 && rawIdx < safeText.length && !/\s/.test(safeText[rawIdx])
    ? safeText.indexOf(' ', rawIdx)
    : rawIdx;
  let charCount = wordEnd === -1 ? safeText.length : Math.min(safeText.length, wordEnd);
  // Snap boundary past any active math formula so KaTeX renders cleanly without splitting partial $ or ^ tokens
  if (charCount > 0 && charCount < safeText.length) {
    const segs = splitMathSegments(safeText);
    let pos = 0;
    for (const seg of segs) {
      const segEnd = pos + seg.raw.length;
      if (seg.kind === 'math' && charCount > pos && charCount < segEnd) {
        charCount = segEnd;
        break;
      }
      pos = segEnd;
    }
  }
  const shown = safeText.slice(0, charCount);
  const rest = safeText.slice(charCount);
  const showCaret = isActive && progress > 0.01 && progress < 0.98;

  return (
    <span className={className}>
      <HighlightText
        text={shown}
        terms={highlightTerms}
        active={shown.length > 0}
        emphasize={emphasize}
      />
      {showCaret && (
        <span
          aria-hidden="true"
          className="inline-block w-[2.5px] h-[0.95em] align-middle bg-[#2563EB] rounded-full ml-1 animate-pulse"
        />
      )}
      {rest && (
        <span className="opacity-0 select-none pointer-events-none" aria-hidden="true">
          <MathText text={rest} active={false} />
        </span>
      )}
    </span>
  );
};

const RoughMarkedText: React.FC<{
  text: string;
  type: 'highlight' | 'circle' | 'strike-through' | 'underline';
  color: string;
  show: boolean;
  strokeWidth?: number;
  className?: string;
}> = ({ text, type, color, show, strokeWidth = 2.4, className = '' }) => {
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const annotationRef = useRef<ReturnType<typeof annotate> | null>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    if (annotationRef.current) {
      try {
        annotationRef.current.remove();
      } catch {
        // Ignore cleanup error
      }
      annotationRef.current = null;
    }
    if (!show) return;

    const timer = window.setTimeout(() => {
      if (!spanRef.current) return;
      try {
        const ann = annotate(spanRef.current, {
          type,
          color,
          strokeWidth,
          multiline: true,
          padding: type === 'circle' ? 5 : 2,
          animationDuration: 320,
          iterations: type === 'highlight' ? 2 : 1,
        });
        annotationRef.current = ann;
        ann.show();
      } catch {
        // Ignore annotation fallback
      }
    }, 12);

    return () => {
      window.clearTimeout(timer);
      if (annotationRef.current) {
        try {
          annotationRef.current.remove();
        } catch {
          // Ignore
        }
        annotationRef.current = null;
      }
    };
  }, [show, type, color, strokeWidth, text]);

  return (
    <span ref={spanRef} className={`relative inline ${className}`}>
      <MathText text={text} active={false} />
    </span>
  );
};

function animateRoughSvgPaths(svgEl: Element) {
  const paths = Array.from(svgEl.querySelectorAll('path'));
  paths.forEach((p, idx) => {
    try {
      const len = Math.max(80, Math.ceil(p.getTotalLength()));
      p.style.setProperty('--fz-path-len', String(len));
      p.style.setProperty('--fz-draw-ms', `${Math.min(420, 200 + idx * 28)}ms`);
      p.style.animationDelay = `${Math.min(180, idx * 24)}ms`;
      p.classList.add('fz-rough-path-draw');
    } catch {
      // Ignore path without getTotalLength
    }
  });
}

const RoughContrastScaleDiagram: React.FC<{
  step: WhiteboardSceneStep;
  progress: number;
  isActive?: boolean;
  isPlaying?: boolean;
  queuedPreview?: boolean;
  autoZoom?: boolean;
  spokenText?: string;
  onZoomInspect?: () => void;
  isLightbox?: boolean;
}> = ({
  step,
  progress,
  isActive = false,
  isPlaying = false,
  queuedPreview = false,
  autoZoom = true,
  spokenText,
  onZoomInspect,
  isLightbox = false,
}) => {
  const beamSvgRef = useRef<SVGSVGElement | null>(null);
  const leftBoxRef = useRef<SVGSVGElement | null>(null);
  const rightBoxRef = useRef<SVGSVGElement | null>(null);

  const termA = cleanBracketArtifacts(step.termA) || wbPick('Concept A', 'Konsep A');
  const descA = cleanBracketArtifacts(step.descA);
  const termB = cleanBracketArtifacts(step.termB) || wbPick('Concept B', 'Konsep B');
  const descB = cleanBracketArtifacts(step.descB);
  const analogy = cleanBracketArtifacts(step.analogy);
  const effP = isLightbox ? 1 : queuedPreview ? 0.04 : progress;
  const terms = queuedPreview ? [] : step.highlightTerms || [];

  const focusPan = resolveSpatialPanelFocus({
    spokenText,
    progress: effP,
    leftText: `${termA} ${descA}`,
    rightText: `${termB} ${descB}`,
    isActive,
    isPlaying,
    autoZoom,
    isLightbox,
    queuedPreview,
    chronologicalSplit: 0.47,
  });

  const leftIsErrorTrap = /\b(?:salah|keliru|hindari|trap|jebakan|wrong|error)\b|✕|×/i.test(
    `${termA} ${step.leftPanel?.badge || ''}`
  );
  const leftStroke = leftIsErrorTrap ? '#B45309' : '#0284C7';
  const leftFill = leftIsErrorTrap ? '#FEF3C7' : '#E0F2FE';
  const leftTitleClass = leftIsErrorTrap ? 'text-[#92400E]' : 'text-[#0369A1]';
  const leftShadow = leftIsErrorTrap ? 'rgba(180,83,9,0.22)' : 'rgba(2,132,199,0.22)';
  const formatBadgeLabel = (label: string) => {
    const up = label.trim().toUpperCase();
    if (up.length <= 18) return up;
    return up.slice(0, 18).replace(/\s+\S*$/, '').trim() || up.slice(0, 18);
  };

  useEffect(() => {
    if (leftBoxRef.current) {
      leftBoxRef.current.innerHTML = '';
      const rcL = rough.svg(leftBoxRef.current);
      leftBoxRef.current.appendChild(
        rcL.rectangle(4, 4, 212, 92, {
          stroke: leftStroke,
          strokeWidth: 2,
          fill: leftFill,
          fillStyle: 'solid',
          roughness: 1.35,
        })
      );
      animateRoughSvgPaths(leftBoxRef.current);
    }
    if (rightBoxRef.current) {
      rightBoxRef.current.innerHTML = '';
      const rcR = rough.svg(rightBoxRef.current);
      rightBoxRef.current.appendChild(
        rcR.rectangle(4, 4, 212, 92, {
          stroke: '#15803D',
          strokeWidth: 2.2,
          fill: '#DCFCE7',
          fillStyle: 'solid',
          roughness: 1.35,
        })
      );
      animateRoughSvgPaths(rightBoxRef.current);
    }
    const svg = beamSvgRef.current;
    if (!svg) return;
    svg.innerHTML = '';
    const rc = rough.svg(svg);
    svg.appendChild(rc.line(112, 2, 112, 20, { stroke: '#475569', strokeWidth: 1.8 }));
    svg.appendChild(rc.line(348, 2, 348, 20, { stroke: '#475569', strokeWidth: 1.8 }));
    svg.appendChild(rc.line(66, 20, 394, 20, { stroke: '#1E293B', strokeWidth: 2.6, roughness: 1.15 }));
    svg.appendChild(
      rc.polygon(
        [
          [230, 22],
          [206, 62],
          [254, 62],
        ],
        { stroke: '#334155', strokeWidth: 2, fill: '#E2E8F0', fillStyle: 'hachure', roughness: 1.3 }
      )
    );
    animateRoughSvgPaths(svg);
  }, [step.id, termA, termB]);

  return (
    <div data-testid="contrast-scale-diagram" className="relative my-2 rounded-2xl bg-white/90 border border-[#E5E7EB] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
          <span>⚖️</span>
          <span>{cleanBracketArtifacts(step.title) || wbPick('Concept Balance Diagram', 'Diagram Timbangan Konsep')}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isLightbox && isActive && isPlaying && effP > 0.02 && effP < 0.98 && (
            <AnimatedTutorPenSvg label={wbPick('Comparing...', 'Membandingkan...')} />
          )}
          {!isLightbox && onZoomInspect && (
            <button
              type="button"
              data-testid="wb-visual-zoom-btn"
              onClick={onZoomInspect}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-[#EFF6FF] border border-[#CBD5E1] text-[10.5px] font-bold text-[#1E40AF] cursor-pointer"
            >
              <span>🔍</span>
              <span>Perbesar</span>
            </button>
          )}
        </div>
      </div>
      <div className="w-full max-w-[500px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
          <div
            data-wb-box="pan-a"
            data-wb-panel-focus={focusPan === 'left' ? 'zoom-in' : focusPan === 'right' ? 'dim' : 'idle'}
            className="relative min-h-[96px] px-3.5 py-3 flex flex-col items-center justify-center text-center rounded-2xl transition-all duration-400"
            style={{
              opacity: focusPan === 'right' ? 0.48 : 1,
              transform: focusPan === 'left' ? 'translateY(-3px) scale(1.065)' : focusPan === 'right' ? 'scale(0.96)' : 'scale(1)',
              zIndex: focusPan === 'left' ? 15 : undefined,
              filter: focusPan === 'left' ? `drop-shadow(0 12px 24px ${leftShadow})` : undefined,
            }}
          >
            <svg
              ref={leftBoxRef}
              viewBox="0 0 220 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            <div className="relative z-10 flex items-center gap-1.5 mb-0.5">
              <SmpVectorIcon name={leftIsErrorTrap ? 'warn' : 'target'} color={leftStroke} size={16} />
              <span
                className="px-2 py-0.5 rounded-full text-white text-[9px] font-extrabold tracking-wider uppercase"
                style={{ backgroundColor: leftStroke }}
              >
                {step.leftPanel?.badge || formatBadgeLabel(termA)}
              </span>
            </div>
            <div className={`relative z-10 fz-handwriting-heading text-sm sm:text-base font-bold ${leftTitleClass} leading-snug break-words`}>
              <HighlightText text={termA} terms={terms} active={effP >= 0.08} emphasize={focusPan === 'left'} />
            </div>
            {descA && (
              <div className="relative z-10 fz-handwriting-body text-[11.5px] text-[#475569] leading-snug mt-0.5 break-words">
                <HighlightText text={descA} terms={terms} active={effP >= 0.22} emphasize={focusPan === 'left'} />
              </div>
            )}
          </div>
          <div
            data-wb-box="pan-b"
            data-wb-panel-focus={focusPan === 'right' ? 'zoom-in' : focusPan === 'left' ? 'dim' : 'idle'}
            className="relative min-h-[96px] px-3.5 py-3 flex flex-col items-center justify-center text-center rounded-2xl transition-all duration-400"
            style={{
              opacity: focusPan === 'left' ? 0.48 : 1,
              transform: focusPan === 'right' ? 'translateY(-3px) scale(1.065)' : focusPan === 'left' ? 'scale(0.96)' : 'scale(1)',
              zIndex: focusPan === 'right' ? 15 : undefined,
              filter: focusPan === 'right' ? 'drop-shadow(0 12px 24px rgba(21,128,61,0.22))' : undefined,
            }}
          >
            <svg
              ref={rightBoxRef}
              viewBox="0 0 220 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            <div className="relative z-10 flex items-center gap-1.5 mb-0.5">
              <SmpVectorIcon name="star" color="#15803D" size={16} />
              <span className="px-2 py-0.5 rounded-full bg-[#15803D] text-white text-[9px] font-extrabold tracking-wider uppercase">
                {step.rightPanel?.badge || formatBadgeLabel(termB)}
              </span>
            </div>
            <div className="relative z-10 fz-handwriting-heading text-sm sm:text-base font-bold text-[#15803D] leading-snug break-words">
              <HighlightText text={termB} terms={terms} active={effP >= 0.25} emphasize={focusPan === 'right'} />
            </div>
            {descB && (
              <div className="relative z-10 fz-handwriting-body text-[11.5px] text-[#334155] leading-snug mt-0.5 break-words">
                <HighlightText text={descB} terms={terms} active={effP >= 0.4} emphasize={focusPan === 'right'} />
              </div>
            )}
          </div>
        </div>
        <svg ref={beamSvgRef} viewBox="0 0 460 68" className="w-full h-auto block select-none -mt-0.5" />
      </div>
      {analogy && (
        <div
          className="mt-2 px-3 py-2 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs font-semibold text-[#166534] transition-all duration-300"
          style={{ opacity: effP > 0.48 ? 1 : 0.72 }}
        >
          <span className="font-extrabold mr-1">💡 Kuncinya:</span>
          <span className="fz-handwriting-body text-sm">
            <HighlightText text={analogy} terms={terms} active={effP > 0.48} />
          </span>
        </div>
      )}
    </div>
  );
};

const RoughSyntaxFlowDiagram: React.FC<{
  step: WhiteboardSceneStep;
  progress: number;
  isActive?: boolean;
  isPlaying?: boolean;
  queuedPreview?: boolean;
  autoZoom?: boolean;
  spokenText?: string;
  onZoomInspect?: () => void;
  isLightbox?: boolean;
}> = ({
  step,
  progress,
  isActive = false,
  isPlaying = false,
  queuedPreview = false,
  autoZoom = true,
  spokenText,
  onZoomInspect,
  isLightbox = false,
}) => {
  const nodes = useMemo(
    () =>
      (step.nodes || [])
        .map((n) => ({
          ...n,
          role: cleanBracketArtifacts(n.role),
          word: cleanBracketArtifacts(n.word),
        }))
        .filter((n) => n.word || n.role),
    [step.nodes]
  );
  const boxRefs = useRef<Array<SVGSVGElement | null>>([]);
  const effP = isLightbox ? 1 : queuedPreview ? 0.04 : progress;
  const terms = queuedPreview ? [] : step.highlightTerms || [];
  const activeNodeIdx = resolveSequentialItemFocus({
    spokenText,
    progress: effP,
    itemTexts: nodes.map((nd) => `${nd.role || ''} ${nd.word || ''}`),
    isActive,
    isPlaying,
    autoZoom,
    isLightbox,
    queuedPreview,
  });

  useEffect(() => {
    boxRefs.current.forEach((svg, idx) => {
      if (!svg || idx >= nodes.length) return;
      svg.innerHTML = '';
      const rc = rough.svg(svg);
      const fill = nodes[idx]?.color || '#E0F2FE';
      svg.appendChild(
        rc.rectangle(4, 4, 180, 74, {
          stroke: '#334155',
          strokeWidth: 1.9,
          fill,
          fillStyle: 'solid',
          roughness: 1.35,
        })
      );
      animateRoughSvgPaths(svg);
    });
  }, [step.id, nodes]);

  return (
    <div data-testid="syntax-flow-diagram" className="my-2 rounded-2xl bg-white/90 border border-[#E5E7EB] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
          <span>🚂</span>
          <span>{cleanBracketArtifacts(step.title) || wbPick('Sentence Pattern Flow', 'Alur Pola Kalimat')}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isLightbox && isActive && isPlaying && effP > 0.02 && effP < 0.98 && (
            <AnimatedTutorPenSvg label={wbPick('Building flow...', 'Menyusun alur...')} />
          )}
          {!isLightbox && onZoomInspect && (
            <button
              type="button"
              data-testid="wb-visual-zoom-btn"
              onClick={onZoomInspect}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-[#EFF6FF] border border-[#CBD5E1] text-[10.5px] font-bold text-[#1E40AF] cursor-pointer"
            >
              <span>🔍</span>
              <span>{wbPick('Zoom', 'Perbesar')}</span>
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {nodes.map((node, idx) => {
          const threshold = (idx / Math.max(1, nodes.length)) * 0.65;
          const visible = queuedPreview || effP >= threshold;
          const isFocused = idx === activeNodeIdx;
          return (
            <React.Fragment key={idx}>
              <div
                data-wb-box={`syntax-${idx}`}
                data-wb-panel-focus={isFocused ? 'zoom-in' : activeNodeIdx >= 0 ? 'dim' : 'idle'}
                className="relative min-w-[140px] max-w-[235px] min-h-[76px] h-auto flex flex-col items-center justify-center px-3.5 py-2 transition-all duration-300"
                style={{
                  opacity: activeNodeIdx >= 0 && !isFocused ? 0.48 : visible ? 1 : 0.72,
                  transform: isFocused ? 'translateY(-3px) scale(1.075)' : activeNodeIdx >= 0 ? 'scale(0.955)' : 'scale(1)',
                  zIndex: isFocused ? 15 : undefined,
                  filter: isFocused ? 'drop-shadow(0 10px 20px rgba(37,99,235,0.22))' : undefined,
                }}
              >
                <svg
                  ref={(el) => {
                    boxRefs.current[idx] = el;
                  }}
                  viewBox="0 0 188 82"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
                {node.role && (
                  <span className="relative z-10 text-[9.5px] font-extrabold uppercase tracking-wider text-[#475569] text-center break-words">
                    {node.role}
                  </span>
                )}
                {node.word && (
                  <span className="relative z-10 fz-handwriting-heading text-[15px] font-bold text-[#0F172A] leading-snug text-center break-words mt-0.5">
                    <HighlightText text={node.word} terms={terms} active={visible && !queuedPreview} emphasize={isFocused} />
                  </span>
                )}
              </div>
              {idx < nodes.length - 1 && (
                <svg
                  width="26"
                  height="18"
                  viewBox="0 0 26 18"
                  className={`shrink-0 transition-opacity duration-300 ${
                    visible ? 'opacity-100' : 'opacity-50'
                  }`}
                >
                  <path
                    d="M2 9 C9 5, 16 5, 22 9 M17 4 L23 9 L17 14"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const RoughKanjiGridDiagram: React.FC<{
  step: WhiteboardSceneStep;
  progress: number;
  targetLang?: TargetLang;
}> = ({ step, progress, targetLang }) => {
  const targetChar = ((step.character || '').match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/) || [
    (step.character || '五').trim()[0] || '五',
  ])[0];
  const [vgRevision, setVgRevision] = useState(0);

  useEffect(() => {
    const unsub = subscribeKanjiVgUpdates(() => setVgRevision((v) => v + 1));
    void ensureKanjiStrokesLoaded(targetChar, targetLang);
    return unsub;
  }, [targetChar, targetLang]);

  const kakijun = useMemo(() => {
    const bankHit = getKakijunEntry(targetChar, targetLang);
    // INVARIAN: Bank resmi KanjiVG / MakeMeAHanzi selalu diprioritaskan agar goresan bebas halusinasi.
    const rawEntry =
      bankHit ||
      synthesizeFallbackStrokesForAnyChar(targetChar, step.strokePaths, step.strokeCount, targetLang);
    return resolveKakijunEntryForLang(rawEntry, targetLang);
  }, [targetChar, step.strokePaths, step.strokeCount, targetLang, vgRevision]);

  const strokes = kakijun.strokes;
  const totalStrokes = Math.max(1, strokes.length);

  const [focusedStrokeIdx, setFocusedStrokeIdx] = useState<number | null>(null);
  const [focusedFraction, setFocusedFraction] = useState<number>(1);
  const [maxReachedIdx, setMaxReachedIdx] = useState<number>(0);
  const [showTraceGuide, setShowTraceGuide] = useState<boolean>(true);
  const [pathLengths, setPathLengths] = useState<number[]>([]);
  const [nibPoint, setNibPoint] = useState<{ x: number; y: number } | null>(null);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);

  useEffect(() => {
    setFocusedStrokeIdx(null);
    setFocusedFraction(1);
    setMaxReachedIdx(0);
    setShowTraceGuide(true);
  }, [step.id, kakijun.char]);

  // Measure actual SVG Bezier path lengths whenever strokes change
  useEffect(() => {
    const lens = strokes.map((_, idx) => {
      const el = pathRefs.current[idx];
      if (!el) return 120;
      try {
        return Math.max(24, el.getTotalLength());
      } catch {
        return 120;
      }
    });
    setPathLengths(lens);
  }, [strokes, kakijun.char]);

  // Animate a single stroke when user clicks a Goresan 1..N mini-box
  useEffect(() => {
    if (focusedStrokeIdx === null) return;
    let raf = 0;
    const dur = 680;
    const t0 = performance.now();
    setFocusedFraction(0.04);
    const run = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setFocusedFraction(p);
      if (p < 1) {
        raf = requestAnimationFrame(run);
      }
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [focusedStrokeIdx, strokes.length]);

  // Compute stroke-by-stroke state with intro breath pocket so Goresan 1 aligns cleanly with spoken audio
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const strokeProgress =
    clampedProgress >= 1 ? 1 : Math.max(0.02, Math.min(1, (clampedProgress - 0.1) / 0.9));
  const scaled = strokeProgress * totalStrokes;
  const activeIdx =
    focusedStrokeIdx !== null
      ? focusedStrokeIdx
      : clampedProgress >= 1
        ? totalStrokes - 1
        : Math.min(totalStrokes - 1, Math.floor(scaled));

  useEffect(() => {
    setMaxReachedIdx((prev) => Math.max(prev, activeIdx));
  }, [activeIdx]);

  const getStrokeFraction = (idx: number): number => {
    if (focusedStrokeIdx !== null) {
      if (idx < focusedStrokeIdx) return 1;
      if (idx === focusedStrokeIdx) return focusedFraction;
      return 0;
    }
    if (clampedProgress >= 1) return 1;
    if (idx < Math.floor(scaled)) return 1;
    if (idx === Math.floor(scaled)) return Math.max(0.04, scaled - Math.floor(scaled));
    return 0;
  };

  // De-overlap stroke badge coordinates softly so KanjiVG positions stay faithful while never overlapping
  const badgePositions = useMemo(() => {
    const placed: Array<[number, number]> = [];
    const offsets: Array<[number, number]> = [
      [0, 0],
      [0, -8],
      [8, 0],
      [-8, 0],
      [0, 8],
      [6.5, -6.5],
      [-6.5, -6.5],
      [6.5, 6.5],
      [-6.5, 6.5],
    ];
    return strokes.map((st) => {
      const baseX = st.numPos?.[0] ?? st.start[0];
      const baseY = st.numPos?.[1] ?? st.start[1];
      let chosen: [number, number] = [
        Math.max(5.5, Math.min(103.5, baseX)),
        Math.max(6.5, Math.min(102.5, baseY)),
      ];
      for (const [dx, dy] of offsets) {
        const cx = Math.max(5.5, Math.min(103.5, baseX + dx));
        const cy = Math.max(6.5, Math.min(102.5, baseY + dy));
        const collides = placed.some(([px, py]) => Math.hypot(cx - px, cy - py) < 7.8);
        if (!collides) {
          chosen = [cx, cy];
          break;
        }
      }
      placed.push(chosen);
      return chosen;
    });
  }, [strokes]);

  const activeFraction = getStrokeFraction(activeIdx);

  // Track exact SVG pen coordinate along the active stroke
  useEffect(() => {
    const activeEl = pathRefs.current[activeIdx];
    const len = pathLengths[activeIdx] || 100;
    const isDrawingNow =
      (focusedStrokeIdx !== null && focusedFraction < 0.99) ||
      (focusedStrokeIdx === null && clampedProgress > 0.01 && clampedProgress < 0.99);
    if (!activeEl || !isDrawingNow) {
      setNibPoint(null);
      return;
    }
    try {
      const pt = activeEl.getPointAtLength(Math.max(0, Math.min(len, len * activeFraction)));
      setNibPoint({ x: pt.x, y: pt.y });
    } catch {
      const s = strokes[activeIdx];
      setNibPoint(s ? { x: s.start[0], y: s.start[1] } : null);
    }
  }, [activeIdx, activeFraction, focusedStrokeIdx, focusedFraction, clampedProgress, pathLengths, strokes]);

  const activeStrokeMeta = strokes[activeIdx] || strokes[0];
  const displayMeaning = step.meaning && step.meaning !== step.title ? step.meaning : kakijun.meaningId;
  const displayReading = cleanReadingForLang(step.reading, kakijun.reading, targetLang, kakijun.char);

  return (
    <div
      data-testid="kakijun-stroke-animator"
      data-char={kakijun.char}
      data-stroke-count={strokes.length || kakijun.strokeCount || 0}
      data-active-stroke={strokes.length > 0 ? activeIdx + 1 : 0}
      className="my-2 py-2 space-y-3"
    >
      <div className="flex flex-wrap items-start gap-5">
        {/* Main 176x176 SVG Genkouyoushi Grid directly on dot-grid paper */}
        <div
          data-kanji-practice-box="true"
          className="relative w-[176px] h-[176px] shrink-0 rounded-xl border-2 border-[#1E293B] bg-[#FFFDF8]/90 shadow-xs"
        >
          <svg viewBox="0 0 109 109" className="w-full h-full block select-none">
            {/* Traditional Crosshairs */}
            <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="#CBD5E1" strokeWidth="0.9" strokeDasharray="3 3" />
            <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="#CBD5E1" strokeWidth="0.9" strokeDasharray="3 3" />
            <line x1="0" y1="0" x2="109" y2="109" stroke="#E2E8F0" strokeWidth="0.65" strokeDasharray="2 4" />
            <line x1="109" y1="0" x2="0" y2="109" stroke="#E2E8F0" strokeWidth="0.65" strokeDasharray="2 4" />

            {/* Clean faint character glyph fallback only while authoritative vectors load */}
            {strokes.length === 0 && (
              <text
                x="54.5"
                y="79"
                textAnchor="middle"
                fontSize="74"
                fontWeight="500"
                fill="#CBD5E1"
                fillOpacity="0.45"
              >
                {kakijun.char}
              </text>
            )}

            {/* Subtle trace watermark guide */}
            {showTraceGuide &&
              strokes.map((st, idx) => (
                <path
                  key={`guide_${idx}`}
                  d={st.d}
                  fill="none"
                  stroke="#94A3B8"
                  strokeOpacity={0.18}
                  strokeWidth="3.0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

            {/* Animated real calligraphy brush strokes drawn 1 -> 2 -> ... -> N */}
            {strokes.map((st, idx) => {
              const frac = getStrokeFraction(idx);
              const len = pathLengths[idx] || 120;
              const isActiveStroke = idx === activeIdx && (clampedProgress < 1 || focusedStrokeIdx !== null);
              const visible = frac > 0;
              const dashOffset = Math.max(0, len * (1 - frac));
              return (
                <path
                  key={`stroke_${idx}`}
                  ref={(el) => {
                    pathRefs.current[idx] = el;
                  }}
                  d={st.d}
                  fill="none"
                  stroke={isActiveStroke ? '#DC2626' : '#0F172A'}
                  strokeWidth={isActiveStroke ? '4.4' : '3.8'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={len}
                  strokeDashoffset={visible ? dashOffset : len}
                  style={{ opacity: visible ? 1 : 0 }}
                />
              );
            })}

            {/* Numbered stroke-order start badges (only shown for strokes reached so far — zero future spoiler, active always on top) */}
            {strokes
              .map((st, idx) => ({ st, idx }))
              .sort((a, b) => (a.idx === activeIdx ? 1 : b.idx === activeIdx ? -1 : a.idx - b.idx))
              .map(({ st, idx }) => {
                const [bx, by] = badgePositions[idx] || [
                  Math.max(5.5, Math.min(103.5, st.numPos?.[0] ?? st.start[0])),
                  Math.max(6.5, Math.min(102.5, st.numPos?.[1] ?? st.start[1])),
                ];
                const frac = getStrokeFraction(idx);
                const isCurrentBadge = idx === activeIdx;
                const isDoneBadge = frac >= 1 && !isCurrentBadge;
                if (frac <= 0 && !isCurrentBadge) return null;
                return (
                  <g
                    key={`badge_${idx}`}
                    onClick={() => setFocusedStrokeIdx(idx)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={bx}
                      cy={by}
                      r={isCurrentBadge ? 4.3 : 3.5}
                      fill={isCurrentBadge ? '#DC2626' : isDoneBadge ? '#15803D' : '#E2E8F0'}
                      stroke="#FFFFFF"
                      strokeWidth="0.85"
                    />
                    <text
                      x={bx}
                      y={by + (isCurrentBadge ? 1.65 : 1.45)}
                      textAnchor="middle"
                      fontSize={isCurrentBadge ? '4.8' : '4.1'}
                      fontWeight="800"
                      fill={isCurrentBadge || isDoneBadge ? '#FFFFFF' : '#475569'}
                    >
                      {st.order}
                    </text>
                  </g>
                );
              })}

            {/* Clean crimson moving nib tip without phantom black brush stem */}
            {nibPoint && (
              <g transform={`translate(${nibPoint.x}, ${nibPoint.y})`} className="pointer-events-none">
                <circle cx="0" cy="0" r="4.4" fill="#EF4444" fillOpacity="0.22" />
                <circle cx="0" cy="0" r="2.2" fill="#DC2626" stroke="#FFFFFF" strokeWidth="0.9" />
              </g>
            )}
          </svg>
        </div>

        {/* Live stroke metadata & active instruction */}
        <div className="min-w-[190px] flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">
              {targetLang === 'zh' || /hanzi/i.test(`${step.title || ''} ${step.spokenNarration || ''}`) ? 'HANZI' : kakijun.type.toUpperCase()} • {strokes.length > 0 ? `${strokes.length} ${wbPick('STROKES', 'GORESAN')}` : kakijun.strokeCount ? `${kakijun.strokeCount} ${wbPick('STROKES', 'GORESAN')}` : 'KANJIVG'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-bold">
              {strokes.length > 0 ? `${wbPick('Stroke', 'Goresan')} ${activeIdx + 1}/${strokes.length}` : wbPick('Loading strokes...', 'Memuat goresan...')}
            </span>
            {strokes.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTraceGuide((v) => !v)}
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border transition cursor-pointer ${
                  showTraceGuide
                    ? 'bg-[#E2E8F0] text-[#0F172A] border-[#94A3B8]'
                    : 'bg-white text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A]'
                }`}
                title={wbPick('Show / hide trace guidelines', 'Tampilkan / sembunyikan garis bayangan untuk latihan menjiplak')}
              >
                {showTraceGuide ? wbPick('👁 Hide Trace', '👁 Tutup Jiplak') : wbPick('👁 Trace', '👁 Jiplak')}
              </button>
            )}
            {focusedStrokeIdx !== null && (
              <button
                type="button"
                onClick={() => setFocusedStrokeIdx(null)}
                className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[11px] font-bold hover:bg-[#BBF7D0] cursor-pointer"
              >
                {wbPick('▶ Follow Tutor', '▶ Ikuti Tutor')}
              </button>
            )}
          </div>

          <div className="fz-handwriting-heading text-2xl font-bold text-[#15803D] leading-tight">
            {displayReading}
          </div>
          <div className="fz-handwriting-body text-base font-semibold text-[#0F172A]">
            {displayMeaning}
          </div>

          {activeStrokeMeta && (
            <div className="rounded-xl bg-[#FEF3C7]/75 border border-[#FCD34D] px-3 py-1.5 text-xs font-semibold text-[#92400E]">
              ✍ {activeStrokeMeta.hint}
            </div>
          )}

          {(step.mnemonic || kakijun.mnemonicId) && (
            <p className="text-xs text-[#475569] italic leading-relaxed">
              💡 {step.mnemonic || kakijun.mnemonicId}
            </p>
          )}
        </div>
      </div>

      {/* Step-by-step Cumulative Mini-Boxes (Unspoiled progressive reveal: 1 -> 2 -> ... -> N) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {strokes.map((_, boxIdx) => {
          const isUnlocked = boxIdx <= maxReachedIdx || boxIdx === activeIdx || clampedProgress >= 1;
          const isSelected = boxIdx === activeIdx;
          return (
            <button
              key={`mini_${boxIdx}`}
              type="button"
              data-testid={`kanji-stroke-step-${boxIdx + 1}`}
              onClick={() => setFocusedStrokeIdx(boxIdx)}
              title={wbPick(`Click to view stroke ${boxIdx + 1}`, `Klik untuk lihat cara tulis Goresan ${boxIdx + 1}`)}
              className={`group flex flex-col items-center p-1 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#DC2626] bg-[#FEF2F2] ring-2 ring-[#FCA5A5]/60 scale-105'
                  : isUnlocked
                    ? 'border-[#CBD5E1] bg-[#FFFDF8] hover:border-[#15803D]'
                    : 'border-dashed border-[#CBD5E1] bg-white/60 hover:border-[#15803D] hover:bg-[#FFFDF8]'
              }`}
            >
              <svg viewBox="0 0 109 109" className="w-11 h-11 block">
                <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" />
                {strokes.slice(0, boxIdx + 1).map((sub, subIdx) => (
                  <path
                    key={`sub_${subIdx}`}
                    d={sub.d}
                    fill="none"
                    stroke={
                      subIdx === boxIdx
                        ? isUnlocked
                          ? '#DC2626'
                          : '#F87171'
                        : isUnlocked
                          ? '#334155'
                          : '#CBD5E1'
                    }
                    strokeOpacity={isUnlocked ? 1 : subIdx === boxIdx ? 0.85 : 0.65}
                    strokeWidth={subIdx === boxIdx ? '5.8' : '4.2'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
              <span
                className={`text-[10px] font-bold leading-none pb-0.5 ${
                  isSelected ? 'text-[#DC2626]' : 'text-[#64748B]'
                }`}
              >
                {boxIdx + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const InteractiveToneWaveWidget: React.FC<{
  step: WhiteboardSceneStep;
  progress: number;
}> = ({ step, progress }) => {
  const [freq, setFreq] = useState<number>(1.2);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [phaseShift, setPhaseShift] = useState<number>(0);

  useEffect(() => {
    if (!isAnimating) return;
    let raf = 0;
    const tick = () => {
      setPhaseShift((p) => (p + 0.045 * freq) % (Math.PI * 2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isAnimating, freq]);

  const wavePath = useMemo(() => {
    const pts: string[] = [];
    for (let x = 20; x <= 380; x += 6) {
      const t = ((x - 20) / 360) * Math.PI * 2 * freq * 1.6 + phaseShift;
      const y = 62 - Math.sin(t) * 30;
      pts.push(`${x === 20 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [freq, phaseShift]);

  return (
    <div
      className={`my-2 rounded-2xl bg-white/85 border border-[#E5E7EB] p-3 space-y-2 transition-opacity duration-300 ${
        progress > 0.15 ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284C7]">
          ~ {step.title || 'Gelombang Nada & Intonasi'}
        </span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]">
          {freq.toFixed(1)}x Tempo
        </span>
      </div>
      <svg viewBox="0 0 400 116" className="w-full h-[108px] rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
        <line x1="20" y1="62" x2="380" y2="62" stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth="1.2" />
        <path d={wavePath} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
        <circle cx="200" cy={62 - Math.sin(((180 / 360) * Math.PI * 2 * freq * 1.6) + phaseShift) * 30} r="5.5" fill="#DC2626" />
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAnimating((v) => !v)}
            className="px-2.5 py-1 rounded-lg bg-[#0F172A] text-white font-bold text-[11px] cursor-pointer"
          >
            {isAnimating ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFreq(1.2);
              setPhaseShift(0);
              setIsAnimating(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-[#334155] font-bold text-[11px] cursor-pointer"
          >
            Reset
          </button>
        </div>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-[#475569]">
          <span>Frekuensi Nada</span>
          <input
            type="range"
            min="0.5"
            max="2.2"
            step="0.1"
            value={freq}
            onChange={(e) => setFreq(parseFloat(e.target.value))}
            className="w-24 accent-[#2563EB] cursor-pointer"
          />
        </label>
      </div>
      {step.text && (
        <div className="fz-handwriting-body text-sm text-[#1E293B] bg-[#F8FAFC] px-2.5 py-1 rounded-lg">
          {step.text}, <span className="text-[#0284C7] font-bold">{step.reading}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Freeform AI Vector Sketch Renderer (`kind: 'rough_scene'`):
 * Menggambar sketsa vektor spesifik topik apapun secara stroke-by-stroke
 * memakai Rough.js (rect, circle, ellipse, line, arrow, polygon, curve, text).
 */
const normalizeShapePoints = (sh: { points?: number[][] | string; pointsText?: string }): Array<[number, number]> => {
  const raw = Array.isArray(sh.points)
    ? sh.points
    : typeof sh.points === 'string'
      ? sh.points
      : typeof sh.pointsText === 'string'
        ? sh.pointsText
        : null;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])))
      .map((p) => [Number(p[0]), Number(p[1])] as [number, number]);
  }
  return raw
    .split(/[;|]/)
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const nums = pair.split(/[\s,]+/).map((n) => Number(n.trim()));
      return nums.length >= 2 && Number.isFinite(nums[0]) && Number.isFinite(nums[1])
        ? ([nums[0], nums[1]] as [number, number])
        : null;
    })
    .filter((pt): pt is [number, number] => Boolean(pt));
};

const wrapSvgLabelLines = (text: string, maxCharsPerLine: number, maxLines = 3, noEllipsis = false): string[] => {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const capLines = noEllipsis ? Math.max(maxLines, 6) : maxLines;
  let limit = maxCharsPerLine;
  if (noEllipsis && text.length > limit * capLines) {
    limit = Math.max(limit, Math.ceil(text.length / capLines) + 2);
  }
  const lines: string[] = [];
  let current = '';
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= limit || !current) {
      current = candidate;
    } else if (lines.length + 1 < capLines) {
      lines.push(current);
      current = w;
    } else if (noEllipsis) {
      // Keep remaining words intact on final line rather than truncating with ellipsis
      current = [current, ...words.slice(i)].join(' ');
      break;
    } else {
      lines.push(current);
      current = w;
      break;
    }
  }
  if (current && lines.length < capLines) {
    lines.push(current);
  } else if (current && lines.length === capLines && !noEllipsis) {
    const last = lines[capLines - 1];
    lines[capLines - 1] = last.length > limit - 1 ? `${last.slice(0, limit - 2)}…` : `${last}…`;
  }
  return lines;
};

const RoughFreeformSceneDiagram: React.FC<{
  step: WhiteboardSceneStep;
  progress: number;
  isActive?: boolean;
  isPlaying?: boolean;
  queuedPreview?: boolean;
  autoZoom?: boolean;
  spokenText?: string;
  onZoomInspect?: () => void;
  isLightbox?: boolean;
}> = ({
  step,
  progress,
  isActive = false,
  isPlaying = false,
  queuedPreview = false,
  autoZoom = true,
  spokenText,
  onZoomInspect,
  isLightbox = false,
}) => {
  const svgRef = useRef<SVGGElement | null>(null);
  const renderedStepIdRef = useRef<string>('');
  const renderedCountRef = useRef<number>(0);
  const renderedStageRef = useRef<number | null>(null);
  const renderedShapesRef = useRef<unknown>(null);
  const resolvedGraph = useMemo(() => {
    if (!Array.isArray(step.graphNodes) || step.graphNodes.length < 2) return null;
    const shapesAreOnlyBoxesOrEmpty =
      !Array.isArray(step.shapes) ||
      step.shapes.length === 0 ||
      step.shapes.every(
        (sh) => sh.op === 'rect' || sh.op === 'arrow' || sh.op === 'line' || sh.op === 'text'
      );
    if (!shapesAreOnlyBoxesOrEmpty) return null;
    return layoutGraphToShapes({
      graphNodes: step.graphNodes,
      graphEdges: step.graphEdges,
      graphDirection: step.graphDirection,
      caption: step.caption,
    });
  }, [step.graphNodes, step.graphEdges, step.graphDirection, step.shapes, step.caption]);

  const w = Math.max(320, Math.min(720, resolvedGraph?.width || step.width || 560));
  const h = Math.max(180, Math.min(440, resolvedGraph?.height || step.height || 250));
  const rawShapes = resolvedGraph && resolvedGraph.shapes.length >= 2 ? resolvedGraph.shapes : step.shapes || [];
  const [stageFilter, setStageFilter] = useState<number | null>(null);

  useEffect(() => {
    setStageFilter(null);
  }, [step.id]);

  // Pre-normalize shapes: strip empty `()`, remove empty unlabeled boxes, auto-expand boxes to contain wrapped text, and resolve box/text collisions!
  const shapes = useMemo(() => {
    type PreparedShape = WhiteboardVectorShape & {
      _cx: number;
      _cy: number;
      _rx: number;
      _ry: number;
      _rw: number;
      _rh: number;
      _rr: number;
      _label: string;
      _sub: string;
      _text: string;
      _wrappedLabel: string[];
      _wrappedSub: string[];
      _isBoxContainer: boolean;
      _lineStep: number;
      _fontSize: number;
      _subLineStep: number;
      _visualTopOffset: number;
      _visualBottomOffset: number;
    };

    const getCenter = (sh: WhiteboardVectorShape): [number, number] => {
      const sx = sh.x ?? (sh as { cx?: number }).cx;
      const sy = sh.y ?? (sh as { cy?: number }).cy;
      return [sx ?? 80, sy ?? 80];
    };

    const rawTextPool = rawShapes
      .map((sh, idx) => ({
        idx,
        sh,
        text: sh.op === 'text' ? cleanBracketArtifacts(sh.text || sh.label || (sh as { title?: string }).title) : '',
        pt: getCenter(sh),
      }))
      .filter((t) => t.sh.op === 'text' && t.text);
    const consumedTextIdx = new Set<number>();

    const prepped: PreparedShape[] = [];

    rawShapes.forEach((origSh, origIdx) => {
      if (!origSh) return;
      const rec = origSh as WhiteboardVectorShape & { title?: string };
      let cleanLbl = cleanSvgMathNotation(rec.label || rec.title || (rec.op !== 'text' ? rec.text : ''));
      let cleanSub = cleanSvgMathNotation(rec.sublabel);
      const cleanTxt = rec.op === 'text' ? cleanSvgMathNotation(rec.text || rec.label || rec.title) : '';

      if (rec.op === 'text') {
        if (!cleanTxt || consumedTextIdx.has(origIdx)) return;
      }

      const [sx0, sy0] = getCenter(rec);
      let rx = sx0;
      let ry = sy0;
      let rw = Math.abs(rec.w || 120);
      let rh = Math.abs(rec.h || 56);
      let rr = Math.abs(rec.r || 32);

      if (rec.op === 'rect') {
        if ((rec.w || 0) < 0) rx = sx0 + (rec.w || 0);
        if ((rec.h || 0) < 0) ry = sy0 + (rec.h || 0);
      }

      const isRect = rec.op === 'rect' && (typeof rec.x === 'number' || typeof (rec as { cx?: number }).cx === 'number');
      const isTinyMarker = isRect && rw <= 30 && rh <= 30;
      const isBox = (isRect && !isTinyMarker) || rec.op === 'circle' || rec.op === 'ellipse';

      // Absorb isolated floating text inside a box so neither empty boxes nor orphaned label/sublabel nodes render
      if (isBox && (!cleanLbl || !cleanSub)) {
        const boxLeft = rec.op === 'rect' ? rx : sx0 - (rec.op === 'circle' ? rr : rw / 2);
        const boxRight = rec.op === 'rect' ? rx + rw : sx0 + (rec.op === 'circle' ? rr : rw / 2);
        const boxTop = rec.op === 'rect' ? ry : sy0 - (rec.op === 'circle' ? rr : rh / 2);
        const boxBottom = rec.op === 'rect' ? ry + rh : sy0 + (rec.op === 'circle' ? rr : rh / 2);
        const insideHits = rawTextPool.filter(
          (t) =>
            !consumedTextIdx.has(t.idx) &&
            t.pt[0] >= boxLeft - 14 &&
            t.pt[0] <= boxRight + 14 &&
            t.pt[1] >= boxTop - 10 &&
            t.pt[1] <= boxBottom + 18
        );
        if (insideHits.length > 0) {
          if (!cleanLbl) {
            cleanLbl = insideHits[0].text;
            consumedTextIdx.add(insideHits[0].idx);
          }
          const subHit = insideHits.find((t) => !consumedTextIdx.has(t.idx));
          if (!cleanSub && subHit) {
            cleanSub = subHit.text;
            consumedTextIdx.add(subHit.idx);
          }
        } else if (!cleanLbl && !cleanSub) {
          return; // Skip completely empty decorative boxes!
        }
      }

      const isConnector =
        (rec.op === 'line' || rec.op === 'arrow') &&
        typeof rec.x1 === 'number' &&
        typeof rec.y1 === 'number' &&
        typeof rec.x2 === 'number' &&
        typeof rec.y2 === 'number';

      const maxChars =
        rec.op === 'rect' || rec.op === 'ellipse'
          ? Math.max(16, Math.min(28, Math.max(Math.floor(rw / 7.6), cleanLbl.length <= 20 ? cleanLbl.length : 18)))
          : rec.op === 'circle'
            ? Math.max(12, Math.min(22, Math.floor((rr * 1.8) / 7.5)))
            : isConnector
              ? 22
              : 24;

      const wrappedLabel = cleanLbl ? wrapSvgLabelLines(cleanLbl, maxChars, isBox ? 5 : 4, isBox) : [];
      const wrappedSub = cleanSub ? wrapSvgLabelLines(cleanSub, Math.max(18, maxChars + 6), isBox ? 4 : 3, isBox) : [];
      const fontSize = wrappedLabel.length > 2 ? 12 : wrappedLabel.length > 1 ? 12.8 : 13.5;
      // Measured SVG Kalam line height: 13.5px renders 21.6px tall (+14.4 above / +7.2 below baseline)
      const lineStep = Math.ceil(fontSize * 1.38);
      const subLineStep = 15;
      const visualTopOffset =
        wrappedLabel.length > 0 ? -Math.ceil(fontSize * 1.1) : -11;
      const visualBottomOffset =
        wrappedLabel.length > 0
          ? wrappedSub.length > 0
            ? wrappedLabel.length * lineStep + 3 + (wrappedSub.length - 1) * subLineStep + 5
            : (wrappedLabel.length - 1) * lineStep + Math.ceil(fontSize * 0.56)
          : Math.max(0, wrappedSub.length - 1) * subLineStep + 5;
      const visualTextH = visualBottomOffset - visualTopOffset;

      // Auto-expand box containers so label & sublabel NEVER spill out of their box ("keluar jalur")
      if (isBox && (wrappedLabel.length > 0 || wrappedSub.length > 0)) {
        const longestLbl = wrappedLabel.reduce((m, l) => Math.max(m, l.length), 0);
        const longestSub = wrappedSub.reduce((m, s) => Math.max(m, s.length), 0);
        const reqW = Math.max(longestLbl * (fontSize * 0.68) + 36, longestSub * 7.0 + 36);
        const reqH = Math.ceil(visualTextH + 34);
        if (rec.op === 'rect') {
          const cxMid = rx + rw / 2;
          const cyMid = ry + rh / 2;
          rw = Math.max(rw, Math.ceil(reqW));
          rh = Math.max(rh, Math.ceil(reqH));
          rx = Math.max(14, Math.round(cxMid - rw / 2));
          ry = Math.max(14, Math.round(cyMid - rh / 2));
        } else if (rec.op === 'ellipse') {
          rw = Math.max(rw, Math.ceil(reqW * 1.2));
          rh = Math.max(rh, Math.ceil(reqH * 1.26));
        } else if (rec.op === 'circle') {
          rr = Math.max(rr, Math.ceil(Math.hypot(reqW / 2, reqH / 2) * 0.96));
        }
      }

      const cx =
        rec.op === 'rect'
          ? rx + rw / 2
          : sx0;
      const cy =
        rec.op === 'rect'
          ? ry + rh / 2
          : sy0;

      prepped.push({
        ...rec,
        x: rec.op === 'rect' ? rx : isBox ? cx : rec.x,
        y: rec.op === 'rect' ? ry : isBox ? cy : rec.y,
        w: isBox && (rec.op === 'rect' || rec.op === 'ellipse') ? rw : rec.w,
        h: isBox && (rec.op === 'rect' || rec.op === 'ellipse') ? rh : rec.h,
        r: rec.op === 'circle' ? rr : rec.r,
        label: cleanLbl || undefined,
        sublabel: cleanSub || undefined,
        text: cleanTxt || undefined,
        _cx: cx,
        _cy: cy,
        _rx: rx,
        _ry: ry,
        _rw: rw,
        _rh: rh,
        _rr: rr,
        _label: cleanLbl,
        _sub: cleanSub,
        _text: cleanTxt,
        _wrappedLabel: wrappedLabel,
        _wrappedSub: wrappedSub,
        _isBoxContainer: isBox,
        _lineStep: lineStep,
        _fontSize: fontSize,
        _subLineStep: subLineStep,
        _visualTopOffset: visualTopOffset,
        _visualBottomOffset: visualBottomOffset,
      });
    });

    // Drop any text entries absorbed into empty boxes in pass 2 (just in case container came AFTER text in JSON)
    const filtered = prepped.filter(
      (p) => !(p.op === 'text' && rawTextPool.some((t) => consumedTextIdx.has(t.idx) && t.text === p._text && p.x === t.sh.x && p.y === t.sh.y))
    );

    // Deterministic AABB collision separation between box containers (>= 16px breathing room)
    const getBoxBounds = (p: PreparedShape) => {
      if (p.op === 'rect') {
        return { left: p._rx, top: p._ry, right: p._rx + p._rw, bottom: p._ry + p._rh };
      }
      if (p.op === 'circle') {
        return { left: p._cx - p._rr, top: p._cy - p._rr, right: p._cx + p._rr, bottom: p._cy + p._rr };
      }
      return { left: p._cx - p._rw / 2, top: p._cy - p._rh / 2, right: p._cx + p._rw / 2, bottom: p._cy + p._rh / 2 };
    };

    const shiftContainer = (p: PreparedShape, dx: number, dy: number) => {
      p._rx = Math.max(14, p._rx + dx);
      p._ry = Math.max(14, p._ry + dy);
      p._cx = p.op === 'rect' ? p._rx + p._rw / 2 : Math.max(14 + (p.op === 'circle' ? p._rr : p._rw / 2), p._cx + dx);
      p._cy = p.op === 'rect' ? p._ry + p._rh / 2 : Math.max(14 + (p.op === 'circle' ? p._rr : p._rh / 2), p._cy + dy);
      p.x = p.op === 'rect' ? p._rx : p._cx;
      p.y = p.op === 'rect' ? p._ry : p._cy;
    };

    const boxes = filtered.filter((p) => p._isBoxContainer);
    const padGap = 26;
    for (let iter = 0; iter < 20; iter++) {
      let moved = false;
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = getBoxBounds(boxes[i]);
          const b = getBoxBounds(boxes[j]);
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left) + padGap;
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) + padGap;
          if (overlapX > 0 && overlapY > 0) {
            moved = true;
            if (overlapX <= overlapY) {
              const push = Math.ceil(overlapX / 2);
              if (boxes[i]._cx <= boxes[j]._cx) {
                shiftContainer(boxes[i], -Math.min(push, 8), 0);
                shiftContainer(boxes[j], overlapX - Math.min(push, 8), 0);
              } else {
                shiftContainer(boxes[j], -Math.min(push, 8), 0);
                shiftContainer(boxes[i], overlapX - Math.min(push, 8), 0);
              }
            } else {
              const push = Math.ceil(overlapY / 2);
              if (boxes[i]._cy <= boxes[j]._cy) {
                shiftContainer(boxes[i], 0, -Math.min(push, 8));
                shiftContainer(boxes[j], 0, overlapY - Math.min(push, 8));
              } else {
                shiftContainer(boxes[j], 0, -Math.min(push, 8));
                shiftContainer(boxes[i], 0, overlapY - Math.min(push, 8));
              }
            }
          }
        }
      }
      if (!moved) break;
    }

    // Re-snap line/arrow endpoints cleanly to container outer edges so arrows never pierce box text after auto-expansion
    filtered.forEach((p) => {
      if (
        (p.op !== 'line' && p.op !== 'arrow') ||
        typeof p.x1 !== 'number' ||
        typeof p.y1 !== 'number' ||
        typeof p.x2 !== 'number' ||
        typeof p.y2 !== 'number'
      ) {
        return;
      }
      const dx = p.x2 - p.x1;
      const dy = p.y2 - p.y1;
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      if (horizontal && boxes.length >= 2) {
        const yMid = (p.y1 + p.y2) / 2;
        const rowBoxes = boxes
          .map((bx) => ({ bx, b: getBoxBounds(bx) }))
          .filter(({ b }) => yMid >= b.top - 12 && yMid <= b.bottom + 12)
          .sort((a, b) => a.bx._cx - b.bx._cx);
        if (dx >= 0 && rowBoxes.length >= 2) {
          const leftHit =
            rowBoxes.find(({ b }) => p.x1! >= b.left - 8 && p.x1! <= b.right + 16) ||
            rowBoxes.filter(({ bx }) => bx._cx < (p.x1! + p.x2!) / 2).slice(-1)[0];
          const rightHit = leftHit
            ? rowBoxes.find(({ bx }) => bx._cx > leftHit.bx._cx)
            : undefined;
          if (leftHit && rightHit && rightHit.b.left - leftHit.b.right >= 10) {
            p.x1 = leftHit.b.right + 4;
            p.x2 = rightHit.b.left - 4;
            p.y1 = Math.round((leftHit.bx._cy + rightHit.bx._cy) / 2);
            p.y2 = p.y1;
          }
        }
      } else if (!horizontal && boxes.length >= 2) {
        const xMid = (p.x1 + p.x2) / 2;
        const colBoxes = boxes
          .map((bx) => ({ bx, b: getBoxBounds(bx) }))
          .filter(({ b }) => xMid >= b.left - 12 && xMid <= b.right + 12)
          .sort((a, b) => a.bx._cy - b.bx._cy);
        if (dy >= 0 && colBoxes.length >= 2) {
          const topHit =
            colBoxes.find(({ b }) => p.y1! >= b.top - 8 && p.y1! <= b.bottom + 16) ||
            colBoxes.filter(({ bx }) => bx._cy < (p.y1! + p.y2!) / 2).slice(-1)[0];
          const botHit = topHit
            ? colBoxes.find(({ bx }) => bx._cy > topHit.bx._cy)
            : undefined;
          if (topHit && botHit && botHit.b.top - topHit.b.bottom >= 10) {
            p.y1 = topHit.b.bottom + 3;
            p.y2 = botHit.b.top - 3;
            p.x1 = Math.round((topHit.bx._cx + botHit.bx._cx) / 2);
            p.x2 = p.x1;
          }
        }
      }
    });

    // Nudge standalone text shapes downward if they overlap any expanded container box
    filtered.forEach((p) => {
      if (p.op !== 'text' || !p._text) return;
      let tx = p._cx;
      let ty = p._cy;
      const fontSize = p.size === 'lg' ? 19 : p.size === 'sm' ? 12.5 : 14.5;
      const maxPerLine = Math.max(36, Math.floor((Math.max(280, w - 28) - Math.max(0, tx)) / (fontSize * 0.54)));
      const lines = wrapSvgLabelLines(p._text, maxPerLine, 5);
      const estW = Math.max(80, lines.reduce((m, l) => Math.max(m, l.length), 0) * fontSize * 0.56);
      const estH = lines.length * (fontSize + 4);
      for (const box of boxes) {
        const b = getBoxBounds(box);
        const overlapsX = tx + estW > b.left - 8 && tx < b.right + 8;
        const overlapsY = ty - fontSize < b.bottom + 10 && ty + estH > b.top - 4;
        if (overlapsX && overlapsY) {
          ty = Math.max(ty, b.bottom + fontSize + 14);
        }
      }
      p.x = tx;
      p.y = ty;
      p._cx = tx;
      p._cy = ty;
    });

    return filtered;
  }, [rawShapes, w]);

  const effP = isLightbox ? 1 : queuedPreview ? 0.04 : Math.min(1, Math.max(0, progress));
  const activeBoxIndices = useMemo(() => {
    const boxes = shapes.map((sh, i) => (sh._isBoxContainer ? i : -1)).filter((i) => i >= 0);
    // Urutkan urutan baca spasial: Atas -> Bawah (toleransi baris 48px), lalu Kiri -> Kanan
    return boxes.sort((a, b) => {
      const sa = shapes[a];
      const sb = shapes[b];
      const ay = sa._cy ?? 0;
      const by = sb._cy ?? 0;
      if (Math.abs(ay - by) > 48) return ay - by;
      return (sa._cx ?? 0) - (sb._cx ?? 0);
    });
  }, [shapes]);
  const focusPosIdx = resolveSequentialItemFocus({
    spokenText,
    progress: effP,
    itemTexts:
      activeBoxIndices.length > 0
        ? activeBoxIndices.map((sIdx) => `${shapes[sIdx]._label} ${shapes[sIdx]._sub}`)
        : shapes.map((sh) => `${sh._label} ${sh._sub} ${sh._text}`),
    isActive,
    isPlaying,
    autoZoom,
    isLightbox,
    queuedPreview,
  });
  const activeShapeIdx =
    focusPosIdx < 0
      ? -1
      : activeBoxIndices.length > 0
        ? activeBoxIndices[focusPosIdx] ?? -1
        : focusPosIdx;
  const reachedCount =
    isLightbox || queuedPreview || !isActive || !isPlaying
      ? shapes.length
      : Math.max(
          1,
          Math.min(shapes.length, Math.ceil(((effP - 0.005) / 0.86) * shapes.length)),
          activeShapeIdx >= 0 ? Math.min(shapes.length, activeShapeIdx + 2) : 1
        );
  const visibleCount =
    stageFilter !== null
      ? Math.min(shapes.length, stageFilter)
      : shapes.length;

  const getShapeCenter = (sh: (typeof shapes)[number]): [number, number] => [sh._cx ?? 80, sh._cy ?? 80];

  // Compute collision-free padded viewBox covering ALL expanded shapes, wrapped labels, sublabels & connector pills
  const viewBox = useMemo(() => {
    let minX = 0;
    let minY = 0;
    let maxX = w;
    let maxY = h;
    for (const sh of shapes) {
      if (!sh) continue;
      if (sh.op === 'rect') {
        minX = Math.min(minX, sh._rx);
        minY = Math.min(minY, sh._ry);
        maxX = Math.max(maxX, sh._rx + sh._rw);
        maxY = Math.max(maxY, sh._ry + sh._rh);
      } else if (sh.op === 'circle') {
        minX = Math.min(minX, sh._cx - sh._rr);
        minY = Math.min(minY, sh._cy - sh._rr);
        maxX = Math.max(maxX, sh._cx + sh._rr);
        maxY = Math.max(maxY, sh._cy + sh._rr);
      } else if (sh.op === 'ellipse') {
        minX = Math.min(minX, sh._cx - sh._rw / 2);
        minY = Math.min(minY, sh._cy - sh._rh / 2);
        maxX = Math.max(maxX, sh._cx + sh._rw / 2);
        maxY = Math.max(maxY, sh._cy + sh._rh / 2);
      } else if (
        (sh.op === 'line' || sh.op === 'arrow') &&
        typeof sh.x1 === 'number' &&
        typeof sh.y1 === 'number' &&
        typeof sh.x2 === 'number' &&
        typeof sh.y2 === 'number'
      ) {
        minX = Math.min(minX, sh.x1, sh.x2) - 14;
        minY = Math.min(minY, sh.y1, sh.y2) - 18;
        maxX = Math.max(maxX, sh.x1, sh.x2) + 14;
        maxY = Math.max(maxY, sh.y1, sh.y2) + 14;
      } else if (sh.op === 'polygon' || sh.op === 'curve') {
        const pts = normalizeShapePoints(sh);
        for (const [px, py] of pts) {
          minX = Math.min(minX, px - 14);
          minY = Math.min(minY, py - 14);
          maxX = Math.max(maxX, px + 14);
          maxY = Math.max(maxY, py + 14);
        }
      } else if (sh.op === 'text' && sh._text) {
        const fontSize = sh.size === 'lg' ? 19 : sh.size === 'sm' ? 12.5 : 14.5;
        const maxPerLine = Math.max(36, Math.floor((Math.max(280, w - 28) - Math.max(0, sh._cx)) / (fontSize * 0.54)));
        const lines = wrapSvgLabelLines(sh._text, maxPerLine, 5);
        const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
        const estW = longest * fontSize * 0.58;
        minX = Math.min(minX, sh._cx - 10);
        minY = Math.min(minY, sh._cy - fontSize - 8);
        maxX = Math.max(maxX, sh._cx + estW + 16);
        maxY = Math.max(maxY, sh._cy + lines.length * (fontSize + 5));
      }
      if (sh._wrappedLabel.length > 0 && sh.op !== 'text') {
        const maxChars = Math.max(
          ...sh._wrappedLabel.map((l) => l.length),
          ...sh._wrappedSub.map((s) => Math.ceil(s.length * 0.85))
        );
        const lw = Math.max(48, maxChars * 8.0 + 20);
        const blockH = sh._visualBottomOffset - sh._visualTopOffset;
        const isConn =
          typeof sh.x1 === 'number' && typeof sh.x2 === 'number' && typeof sh.y1 === 'number' && typeof sh.y2 === 'number';
        const cx = isConn ? ((sh.x1 as number) + (sh.x2 as number)) / 2 : sh._cx;
        const cy = isConn ? ((sh.y1 as number) + (sh.y2 as number)) / 2 - 14 : sh._cy;
        minX = Math.min(minX, cx - lw / 2 - 10);
        maxX = Math.max(maxX, cx + lw / 2 + 10);
        minY = Math.min(minY, cy - blockH / 2 - 14);
        maxY = Math.max(maxY, cy + blockH / 2 + 16);
      }
    }
    const pad = 16;
    const vx = Math.floor(minX - pad);
    const vy = Math.floor(minY - pad);
    const vw = Math.ceil(maxX - minX + pad * 2);
    const vh = Math.ceil(maxY - minY + pad * 2);
    return { vx, vy, vw: Math.max(320, vw), vh: Math.max(180, vh) };
  }, [shapes, w, h]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (
      renderedStepIdRef.current !== step.id ||
      renderedStageRef.current !== stageFilter ||
      renderedShapesRef.current !== shapes ||
      visibleCount < renderedCountRef.current
    ) {
      svg.innerHTML = '';
      renderedStepIdRef.current = step.id;
      renderedStageRef.current = stageFilter;
      renderedShapesRef.current = shapes;
      renderedCountRef.current = 0;
    }
    if (visibleCount <= 0 || renderedCountRef.current === visibleCount) return;

    const rc = rough.svg(svg as unknown as SVGSVGElement);
    const startIdx = renderedCountRef.current;

    for (let sIdx = startIdx; sIdx < visibleCount; sIdx++) {
      const sh = shapes[sIdx];
      if (!sh) continue;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('data-wb-shape-idx', String(sIdx));
      g.style.transition = 'opacity 200ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1), filter 200ms ease';
      g.style.transformBox = 'fill-box';
      g.style.transformOrigin = 'center';
      const stroke = sh.stroke || '#1E293B';
      const strokeWidth = sh.op === 'arrow' ? Math.max(2.2, sh.strokeWidth || 2.2) : sh.strokeWidth || 2;
      const opts = {
        stroke,
        strokeWidth,
        fill: sh.fill || undefined,
        fillStyle: sh.fill ? ('solid' as const) : undefined,
        roughness: 1.15,
        strokeLineDash: sh.dashed ? [6, 5] : undefined,
      };

      if (sh.op === 'rect' && (typeof sh.x === 'number' || typeof (sh as { cx?: number }).cx === 'number')) {
        g.appendChild(rc.rectangle(sh._rx, sh._ry, sh._rw, sh._rh, opts));
      } else if (sh.op === 'circle') {
        g.appendChild(rc.circle(sh._cx, sh._cy, sh._rr * 2, opts));
      } else if (sh.op === 'ellipse') {
        g.appendChild(rc.ellipse(sh._cx, sh._cy, sh._rw, sh._rh, opts));
      } else if (
        sh.op === 'line' &&
        typeof sh.x1 === 'number' &&
        typeof sh.y1 === 'number' &&
        typeof sh.x2 === 'number' &&
        typeof sh.y2 === 'number'
      ) {
        g.appendChild(rc.line(sh.x1, sh.y1, sh.x2, sh.y2, opts));
      } else if (
        sh.op === 'arrow' &&
        typeof sh.x1 === 'number' &&
        typeof sh.y1 === 'number' &&
        typeof sh.x2 === 'number' &&
        typeof sh.y2 === 'number'
      ) {
        g.appendChild(rc.line(sh.x1, sh.y1, sh.x2, sh.y2, opts));
        const angle = Math.atan2(sh.y2 - sh.y1, sh.x2 - sh.x1);
        const headLen = 11;
        const ax1 = sh.x2 - headLen * Math.cos(angle - Math.PI / 6);
        const ay1 = sh.y2 - headLen * Math.sin(angle - Math.PI / 6);
        const ax2 = sh.x2 - headLen * Math.cos(angle + Math.PI / 6);
        const ay2 = sh.y2 - headLen * Math.sin(angle + Math.PI / 6);
        g.appendChild(rc.line(sh.x2, sh.y2, ax1, ay1, opts));
        g.appendChild(rc.line(sh.x2, sh.y2, ax2, ay2, opts));
      } else if (sh.op === 'polygon') {
        const pts = normalizeShapePoints(sh);
        if (pts.length >= 3) g.appendChild(rc.polygon(pts, opts));
      } else if (sh.op === 'curve') {
        const pts = normalizeShapePoints(sh);
        if (pts.length >= 2) {
          g.appendChild(rc.curve(pts, { ...opts, fill: undefined }));
          if (sh.arrowHead) {
            const pEnd = pts[pts.length - 1];
            const pPrev = pts[pts.length - 2];
            const angle = Math.atan2(pEnd[1] - pPrev[1], pEnd[0] - pPrev[0]);
            const headLen = 10;
            g.appendChild(
              rc.line(
                pEnd[0],
                pEnd[1],
                pEnd[0] - headLen * Math.cos(angle - Math.PI / 6),
                pEnd[1] - headLen * Math.sin(angle - Math.PI / 6),
                opts
              )
            );
            g.appendChild(
              rc.line(
                pEnd[0],
                pEnd[1],
                pEnd[0] - headLen * Math.cos(angle + Math.PI / 6),
                pEnd[1] - headLen * Math.sin(angle + Math.PI / 6),
                opts
              )
            );
          }
        }
      }
      if (g.childNodes.length > 0) {
        animateRoughSvgPaths(g);
        svg.appendChild(g);
      }
    }

    renderedCountRef.current = visibleCount;
  }, [step.id, visibleCount, stageFilter, shapes]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const groups = Array.from(svg.querySelectorAll<SVGGElement>('[data-wb-shape-idx]'));
    groups.forEach((g) => {
      const idx = Number(g.getAttribute('data-wb-shape-idx') || '-1');
      const isReached = stageFilter !== null || idx < reachedCount;
      if (activeShapeIdx < 0) {
        g.style.opacity = queuedPreview ? '0.2' : isReached ? '1' : '0.28';
        g.style.transform = 'scale(1)';
        g.style.filter = '';
      } else if (idx === activeShapeIdx) {
        g.style.opacity = '1';
        g.style.transform = 'scale(1.045)';
        g.style.filter = 'drop-shadow(0 8px 18px rgba(21,128,61,0.28))';
      } else if (!isReached) {
        g.style.opacity = '0.34';
        g.style.transform = 'scale(0.985)';
        g.style.filter = '';
      } else {
        const sh = shapes[idx];
        g.style.opacity = sh?._isBoxContainer ? '0.54' : '0.82';
        g.style.transform = 'scale(1)';
        g.style.filter = '';
      }
    });
  }, [activeShapeIdx, reachedCount, stageFilter, queuedPreview, shapes]);

  const penShapeIdx =
    shapes.length === 0
      ? -1
      : activeShapeIdx >= 0
        ? Math.min(shapes.length - 1, activeShapeIdx)
        : Math.max(0, Math.min(shapes.length - 1, reachedCount - 1));
  const activeShape = penShapeIdx >= 0 ? shapes[penShapeIdx] : null;
  const penActive = !isLightbox && isActive && isPlaying && effP > 0.02 && effP < 0.98;
  const nibPt = useMemo(() => {
    if (!penActive || shapes.length === 0) return null;
    const toPct = (px: number, py: number) => ({
      x: Math.max(4, Math.min(94, ((px - viewBox.vx) / viewBox.vw) * 100)),
      y: Math.max(6, Math.min(90, ((py - viewBox.vy) / viewBox.vh) * 100)),
    });
    const getEndAnchor = (sh: typeof shapes[number]): [number, number] => {
      if (typeof sh.x2 === 'number' && typeof sh.y2 === 'number') {
        return [sh.x2, sh.y2];
      }
      const [sx, sy] = getShapeCenter(sh);
      if (sh.op === 'rect') {
        return [sh._rx + sh._rw * 0.92, sy];
      }
      const pts = normalizeShapePoints(sh);
      if (pts.length > 0) {
        return pts[pts.length - 1];
      }
      return [sx, sy];
    };
    if (effP < 0.86 && activeShape) {
      const n = Math.max(1, shapes.length);
      const exactIdx = (effP / 0.86) * n;
      const localT = Math.min(1, Math.max(0, exactIdx - Math.floor(exactIdx)));
      const raw = activeShape as unknown as Record<string, unknown>;
      if (
        typeof raw.x1 === 'number' &&
        typeof raw.y1 === 'number' &&
        typeof activeShape.x2 === 'number' &&
        typeof activeShape.y2 === 'number'
      ) {
        return toPct(
          raw.x1 + (activeShape.x2 - raw.x1) * localT,
          raw.y1 + (activeShape.y2 - raw.y1) * localT,
        );
      }
      const pts = normalizeShapePoints(activeShape);
      if (pts.length > 1) {
        const segFloat = localT * (pts.length - 1);
        const sIdx = Math.min(pts.length - 2, Math.floor(segFloat));
        const sFrac = segFloat - sIdx;
        return toPct(
          pts[sIdx][0] + (pts[sIdx + 1][0] - pts[sIdx][0]) * sFrac,
          pts[sIdx][1] + (pts[sIdx + 1][1] - pts[sIdx][1]) * sFrac,
        );
      }
      const [sx, sy] = getShapeCenter(activeShape);
      if (activeShape.op === 'rect') {
        return toPct(
          activeShape._rx + activeShape._rw * (0.1 + 0.85 * localT),
          sy + Math.sin(localT * Math.PI) * 10,
        );
      }
      const prevAnchor = penShapeIdx > 0 ? getEndAnchor(shapes[penShapeIdx - 1]) : [sx - 24, sy];
      return toPct(
        prevAnchor[0] + (sx - prevAnchor[0]) * localT,
        prevAnchor[1] + (sy - prevAnchor[1]) * localT,
      );
    }
    // Phase 0.86..0.98: smooth pointer sweep across drawn shapes while tutor finishes sentence
    const sweepT = Math.min(0.999, Math.max(0, (effP - 0.86) / 0.12));
    if (shapes.length === 1) {
      const [sx, sy] = getEndAnchor(shapes[0]);
      return toPct(sx + Math.cos(sweepT * Math.PI * 2) * 18, sy + Math.sin(sweepT * Math.PI * 2) * 8);
    }
    const seg = sweepT * (shapes.length - 1);
    const i0 = Math.min(shapes.length - 2, Math.floor(seg));
    const f = seg - i0;
    const a0 = getEndAnchor(shapes[i0]);
    const a1 = getEndAnchor(shapes[i0 + 1]);
    return toPct(a0[0] + (a1[0] - a0[0]) * f, a0[1] + (a1[1] - a0[1]) * f);
  }, [penActive, shapes, viewBox, effP, activeShape, visibleCount]);

  const stageMilestones = useMemo(() => {
    if (shapes.length < 4) return [];
    const mid = Math.max(2, Math.ceil(shapes.length / 2));
    return [
      { label: 'Tahap 1', count: 2 },
      { label: 'Tahap 2', count: mid },
      { label: 'Lengkap', count: shapes.length },
    ];
  }, [shapes.length]);

  return (
    <div data-testid="solvely-bare-diagram" className="my-2 space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803D] flex items-center gap-1.5">
            <span>✦ {cleanBracketArtifacts(step.title) || wbPick('Topic Visual Sketch', 'Sketsa Visual Topik')}</span>
          </span>
          {penActive && <AnimatedTutorPenSvg color="#15803D" label={wbPick('Drawing...', 'Menggambar...')} />}
          {!isLightbox && onZoomInspect && (
            <button
              type="button"
              data-testid="wb-visual-zoom-btn"
              onClick={onZoomInspect}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border border-[#E2D9C5] bg-white/95 text-[#334155] hover:bg-[#FEF3C7] hover:border-[#F59E0B] transition-colors cursor-pointer"
              title={wbPick('Zoom in to inspect details', 'Perbesar diagram untuk melihat detail')}
            >
              <span>🔍</span>
              <span>{wbPick('Zoom', 'Perbesar')}</span>
            </button>
          )}
        </div>
        {stageMilestones.length > 0 && (
          <div className="flex items-center gap-1">
            {stageMilestones.map((m) => {
              const active = stageFilter === m.count || (stageFilter === null && m.count === shapes.length && progress >= 0.94);
              return (
                <button
                  key={m.label}
                  type="button"
                  data-testid={`diagram-stage-${m.label.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => setStageFilter(stageFilter === m.count ? null : m.count)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                    active
                      ? 'bg-[#15803D] text-white'
                      : 'bg-white/80 text-[#475569] border border-[#D5DAD3] hover:text-[#15803D]'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        )}
        {step.caption && !stageMilestones.length && (
          <span className="text-[10.5px] font-medium text-[#64748B] leading-snug text-right max-w-[75%]">
            {cleanBracketArtifacts(step.caption)}
          </span>
        )}
      </div>

      <div className="relative w-full overflow-hidden bg-transparent">
        <svg viewBox={`${viewBox.vx} ${viewBox.vy} ${viewBox.vw} ${viewBox.vh}`} className="w-full h-auto block select-none">
          <g ref={svgRef} />
          {shapes.slice(0, visibleCount).map((sh, sIdx) => {
            if (sh.op === 'text' && sh._text) {
              const fontSize = sh.size === 'lg' ? 19 : sh.size === 'sm' ? 12.5 : 14.5;
              const maxPerLine = Math.max(36, Math.floor((Math.max(280, w - 28) - Math.max(0, sh._cx)) / (fontSize * 0.54)));
              const wrapped = wrapSvgLabelLines(sh._text, maxPerLine, 5);
              const tx = Math.max(viewBox.vx + 12, Math.min(viewBox.vx + viewBox.vw - 24, sh._cx));
              const ty = Math.max(viewBox.vy + 18, Math.min(viewBox.vy + viewBox.vh - 14 - Math.max(0, wrapped.length - 1) * (fontSize + 4), sh._cy));
              return (
                <text
                  key={`txt_${sIdx}`}
                  x={tx}
                  y={ty}
                  fill={sh.stroke || '#0F172A'}
                  fontSize={fontSize}
                  fontWeight={sh.size === 'lg' ? '700' : '600'}
                  style={{ fontFamily: "'Kalam', 'Caveat', 'Plus Jakarta Sans', cursive, sans-serif" }}
                >
                  {wrapped.map((ln, lIdx) => (
                    <tspan key={lIdx} x={tx} dy={lIdx === 0 ? 0 : fontSize + 4}>
                      {ln}
                    </tspan>
                  ))}
                </text>
              );
            }
            if (sh._wrappedLabel.length === 0 && sh._wrappedSub.length === 0) return null;
            let lx = sh._cx;
            let ly = sh._cy;
            const isConnector =
              typeof sh.x1 === 'number' &&
              typeof sh.x2 === 'number' &&
              typeof sh.y1 === 'number' &&
              typeof sh.y2 === 'number';
            if (isConnector) {
              lx = ((sh.x1 as number) + (sh.x2 as number)) / 2;
              ly = ((sh.y1 as number) + (sh.y2 as number)) / 2 - 12;
            } else if (!sh._isBoxContainer) {
              const pts = normalizeShapePoints(sh);
              if (pts.length >= 2) {
                lx = pts.reduce((sum, pt) => sum + pt[0], 0) / pts.length;
                ly = pts.reduce((sum, pt) => sum + pt[1], 0) / pts.length;
              }
            }
            const wrappedLabel = sh._wrappedLabel;
            const wrappedSub = sh._wrappedSub;
            const fontSize = sh._fontSize;
            const lineStep = sh._lineStep;
            const subLineStep = sh._subLineStep;
            const hasSub = wrappedSub.length > 0;
            const visualH = sh._visualBottomOffset - sh._visualTopOffset;
            const centeredBaselineY = ly - (sh._visualTopOffset + sh._visualBottomOffset) / 2;
            const clampedX = Math.max(viewBox.vx + 20, Math.min(viewBox.vx + viewBox.vw - 20, lx));
            const firstLineY = sh._isBoxContainer
              ? centeredBaselineY
              : Math.max(
                  viewBox.vy + 18,
                  Math.min(
                    viewBox.vy + viewBox.vh - 16 - Math.max(0, wrappedSub.length - 1) * subLineStep,
                    centeredBaselineY
                  )
                );
            const subStartY =
              wrappedLabel.length > 0 ? firstLineY + wrappedLabel.length * lineStep + 3 : firstLineY;
            const maxLineChars = Math.max(
              4,
              ...wrappedLabel.map((l) => l.length),
              ...wrappedSub.map((s) => Math.ceil(s.length * 0.85))
            );
            const pillW = Math.min(280, Math.max(40, maxLineChars * 7.6 + 16));
            const isBoxActive = activeShapeIdx === sIdx;
            const isBoxDimmed = activeShapeIdx >= 0 && activeShapeIdx !== sIdx && sh._isBoxContainer;
            return (
              <g
                key={`lbl_${sIdx}`}
                style={{
                  opacity: isBoxDimmed ? 0.52 : queuedPreview ? 0.16 : 1,
                  transform: isBoxActive ? 'scale(1.045)' : 'scale(1)',
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  transition: 'opacity 200ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {isConnector && (
                  <rect
                    x={clampedX - pillW / 2}
                    y={firstLineY - 14}
                    width={pillW}
                    height={visualH + 6}
                    rx={5}
                    fill="#FAFBF9"
                    fillOpacity={0.94}
                  />
                )}
                {wrappedLabel.length > 0 && (
                  <text
                    x={clampedX}
                    y={firstLineY}
                    textAnchor="middle"
                    fill="#0F172A"
                    fontSize={fontSize}
                    fontWeight="700"
                    style={{ fontFamily: "'Kalam', 'Caveat', 'Plus Jakarta Sans', cursive, sans-serif" }}
                  >
                    {wrappedLabel.map((ln, lIdx) => (
                      <tspan key={lIdx} x={clampedX} dy={lIdx === 0 ? 0 : lineStep}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                )}
                {hasSub && (
                  <text
                    x={clampedX}
                    y={subStartY}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize={10.8}
                    fontWeight="600"
                  >
                    {wrappedSub.map((subLn, slIdx) => (
                      <tspan key={slIdx} x={clampedX} dy={slIdx === 0 ? 0 : subLineStep}>
                        {subLn}
                      </tspan>
                    ))}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {penActive && nibPt && (
          <div
            data-testid="wb-freeform-pen-nib"
            style={{ left: `${nibPt.x}%`, top: `${nibPt.y}%`, transform: 'translate(-4px, -18px)' }}
            className="absolute pointer-events-none transition-[left,top] duration-100 ease-linear"
          >
            <MarkerNibCursor color="#15803D" />
          </div>
        )}
      </div>
    </div>
  );
};

export const LiveWhiteboardCanvas: React.FC<LiveWhiteboardCanvasProps> = ({
  plan,
  targetLang,
  playbackSpeed,
  isPlaying,
  onPlayingChange,
  replayNonce,
  zoomLevel,
  onZoomChange,
  autoSpotlight = true,
  onToggleAutoSpotlight,
  isPenActive,
  penColor,
  onPenToggle,
  onCircleAsk,
  quizSlot,
  boardContainerRef,
  externalStepIndex = null,
  externalStepProgress = null,
  activeSpokenText = '',
  onSelectStepIndex,
}) => {
  const steps = plan.steps;
  const totalSteps = steps.length;

  const [internalStepIndex, setInternalStepIndex] = useState<number>(0);
  const [internalStepProgress, setInternalStepProgress] = useState<number>(0);
  const [zoomedStep, setZoomedStep] = useState<WhiteboardSceneStep | null>(null);
  const [innerNaturalSize, setInnerNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const isExternallyControlled =
    typeof externalStepIndex === 'number' && typeof externalStepProgress === 'number';
  const activeStepIndex = isExternallyControlled ? (externalStepIndex as number) : internalStepIndex;
  const activeStepProgress = isExternallyControlled
    ? (externalStepProgress as number)
    : internalStepProgress;

  // Student freehand ink strokes ("Circle to Ask")
  const [strokes, setStrokes] = useState<FreehandStroke[]>([]);
  const [draftPoints, setDraftPoints] = useState<number[][] | null>(null);
  const [pendingCircleAsk, setPendingCircleAsk] = useState<{
    excerpt: string;
    x: number;
    y: number;
  } | null>(null);

  const fallbackBoardContainerRef = useRef<HTMLDivElement | null>(null);
  const resolvedBoardContainerRef = boardContainerRef || fallbackBoardContainerRef;
  const canvasInnerRef = useRef<HTMLDivElement | null>(null);
  const stepNodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const userManualScrollUntilRef = useRef<number>(0);
  const programmaticScrollUntilRef = useRef<number>(0);
  const zoomLevelRef = useRef<number>(zoomLevel);
  zoomLevelRef.current = zoomLevel;
  const onZoomChangeRef = useRef<((z: number) => void) | undefined>(onZoomChange);
  onZoomChangeRef.current = onZoomChange;

  // Track natural unscaled dimensions of canvasInnerRef + viewport container content width for layout-safe zooming
  useEffect(() => {
    const innerEl = canvasInnerRef.current;
    const containerEl = resolvedBoardContainerRef.current;
    if (typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      if (containerEl) {
        let hPad = 0;
        try {
          const cs = window.getComputedStyle(containerEl);
          hPad = (parseFloat(cs.paddingLeft || '0') || 0) + (parseFloat(cs.paddingRight || '0') || 0);
        } catch {}
        const cw = Math.max(0, Math.round(containerEl.clientWidth - hPad));
        setContainerWidth((prev) => (prev === cw ? prev : cw));
      }
      if (innerEl) {
        const w = innerEl.offsetWidth;
        const h = Math.max(innerEl.offsetHeight, innerEl.scrollHeight);
        if (w > 0 || h > 0) {
          setInnerNaturalSize((prev) =>
            prev.width === w && prev.height === h ? prev : { width: w, height: h },
          );
        }
      }
    };
    measure();
    const obs = new ResizeObserver(measure);
    if (innerEl) obs.observe(innerEl);
    if (containerEl) obs.observe(containerEl);
    return () => obs.disconnect();
  }, [resolvedBoardContainerRef, steps.length, plan.boardTitle, zoomLevel]);

  // Pause auto-scroll briefly on real manual scroll intent, plus support smooth Ctrl/Cmd+Wheel zoom
  useEffect(() => {
    const container = resolvedBoardContainerRef.current;
    if (!container) return;
    let lastScrollTop = container.scrollTop;
    let lastScrollLeft = container.scrollLeft;
    const markManualIntent = () => {
      userManualScrollUntilRef.current = Date.now() + 4500;
    };
    const handleWheel = (e: WheelEvent) => {
      if ((e.ctrlKey || e.metaKey) && onZoomChangeRef.current) {
        e.preventDefault();
        programmaticScrollUntilRef.current = Date.now() + 500;
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const nextZ =
          Math.round(Math.max(0.75, Math.min(1.6, zoomLevelRef.current + delta)) * 100) / 100;
        onZoomChangeRef.current(nextZ);
        return;
      }
      markManualIntent();
    };
    const handleScroll = () => {
      const movedY = Math.abs(container.scrollTop - lastScrollTop);
      const movedX = Math.abs(container.scrollLeft - lastScrollLeft);
      lastScrollTop = container.scrollTop;
      lastScrollLeft = container.scrollLeft;
      if (movedY < 4 && movedX < 4) return;
      if (Date.now() > programmaticScrollUntilRef.current) {
        // User dragged scrollbar or scrolled manually
        userManualScrollUntilRef.current = Math.max(
          userManualScrollUntilRef.current,
          Date.now() + 3000,
        );
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', markManualIntent, { passive: true });
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', markManualIntent);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [resolvedBoardContainerRef]);

  const maxBulletByStepRef = useRef<Map<string, number>>(new Map());
  const maxRowByStepRef = useRef<Map<string, number>>(new Map());
  const prevStepProgByIdRef = useRef<Map<string, number>>(new Map());
  const prevActiveStepIdxRef = useRef<number>(activeStepIndex);
  const prevZoomLevelRef = useRef<number>(zoomLevel);
  const cameraGlideRafRef = useRef<number>(0);

  // Clear manual scroll lock + monotonic sub-highlight history on Replay or topic change
  useEffect(() => {
    userManualScrollUntilRef.current = 0;
    maxBulletByStepRef.current.clear();
    maxRowByStepRef.current.clear();
    prevStepProgByIdRef.current.clear();
  }, [replayNonce, plan.boardTitle, steps.length]);

  // Keep monotonic cursors accurate when jumping backward across steps (e.g. Phase Scrubber rewind)
  useEffect(() => {
    if (activeStepIndex < prevActiveStepIdxRef.current) {
      for (let i = activeStepIndex; i < steps.length; i++) {
        const st = steps[i];
        if (st) {
          maxBulletByStepRef.current.delete(st.id);
          maxRowByStepRef.current.delete(st.id);
          prevStepProgByIdRef.current.delete(st.id);
        }
      }
    }
    prevActiveStepIdxRef.current = activeStepIndex;
  }, [activeStepIndex, steps]);

  // Unified Damped Camera Controller (tracks active card & sub-item smoothly across X and Y without competing observers)
  useEffect(() => {
    if (!autoSpotlight) return;
    const container = resolvedBoardContainerRef.current;
    if (!container || steps.length === 0) return;

    const zoomChanged = Math.abs(prevZoomLevelRef.current - zoomLevel) > 0.005;
    prevZoomLevelRef.current = zoomLevel;
    if (zoomChanged) {
      userManualScrollUntilRef.current = 0;
      programmaticScrollUntilRef.current = Date.now() + 500;
    }

    const targetIdx = Math.min(Math.max(0, activeStepIndex), steps.length - 1);
    const activeStep = steps[targetIdx];
    if (!activeStep) return;

    const stepEl = stepNodeRefs.current.get(activeStep.id);
    if (!stepEl) return;

    let timerId = 0;
    let lastFocusedSub: Element | null = null;
    const scheduleCameraCheck = () => {
      if (timerId) return;
      timerId = window.setTimeout(() => {
        timerId = 0;
        if (Date.now() < userManualScrollUntilRef.current) return;
        const cRect = container.getBoundingClientRect();
        if (cRect.height <= 40 || cRect.width <= 40) return;

        const focusedSub = stepEl.querySelector(
          '.fz-sub-zoom-in, .fz-table-row-focus-active, [data-wb-panel-focus="zoom-in"]'
        );
        lastFocusedSub = focusedSub;
        const targetEl = focusedSub || stepEl;
        const tRect = targetEl.getBoundingClientRect();
        if (tRect.height <= 0 || tRect.width <= 0) return;

        const padTop = focusedSub ? 28 : 20;
        const padBottom = focusedSub ? 36 : 28;
        const padSide = 20;
        const inViewY = tRect.top >= cRect.top + padTop && tRect.bottom <= cRect.bottom - padBottom;
        const inViewX = tRect.left >= cRect.left + padSide && tRect.right <= cRect.right - padSide;
        const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
        if (inViewY && (inViewX || maxLeft <= 8) && !(maxLeft <= 8 && container.scrollLeft > 4)) return;

        const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);

        let goalTop = container.scrollTop;
        if (!inViewY) {
          const absTop = tRect.top - cRect.top + container.scrollTop;
          const desiredOffset =
            tRect.height >= cRect.height - 48
              ? padTop
              : focusedSub
                ? Math.max(padTop, Math.min(cRect.height * 0.34, (cRect.height - tRect.height) / 2))
                : Math.max(padTop, Math.min(cRect.height * 0.22, cRect.height - tRect.height - padBottom));
          goalTop = Math.max(0, Math.min(maxTop, absTop - desiredOffset));
        }

        let goalLeft = maxLeft <= 8 ? 0 : container.scrollLeft;
        if (maxLeft > 8 && !inViewX) {
          const absLeft = tRect.left - cRect.left + container.scrollLeft;
          const absCenterX = absLeft + tRect.width / 2;
          const centeredLeft = absCenterX - cRect.width / 2;
          const edgeSafeLeft = absLeft - padSide;
          goalLeft = Math.max(
            0,
            Math.min(maxLeft, tRect.width < cRect.width - padSide * 2 ? centeredLeft : edgeSafeLeft)
          );
        }

        const diffY = Math.abs(goalTop - container.scrollTop);
        const diffX = Math.abs(goalLeft - container.scrollLeft);
        if (diffY < 10 && diffX < 10) return;

        if (cameraGlideRafRef.current) {
          cancelAnimationFrame(cameraGlideRafRef.current);
          cameraGlideRafRef.current = 0;
        }

        const startTop = container.scrollTop;
        const startLeft = container.scrollLeft;
        const startPerf = performance.now();
        const durationMs = 320;
        programmaticScrollUntilRef.current = Date.now() + durationMs + 140;

        const glide = (now: number) => {
          const p = Math.min(1, (now - startPerf) / durationMs);
          const eased = 1 - Math.pow(1 - p, 3);
          container.scrollTop = startTop + (goalTop - startTop) * eased;
          if (maxLeft > 8 || Math.abs(goalLeft - startLeft) > 2) {
            container.scrollLeft = startLeft + (goalLeft - startLeft) * eased;
          }
          if (p < 1 && Date.now() >= userManualScrollUntilRef.current) {
            cameraGlideRafRef.current = requestAnimationFrame(glide);
          } else {
            cameraGlideRafRef.current = 0;
          }
        };
        cameraGlideRafRef.current = requestAnimationFrame(glide);

        try {
          (window as unknown as { __fzWbLastAutoScroll?: Record<string, unknown> }).__fzWbLastAutoScroll = {
            stepId: activeStep.id,
            stepIndex: targetIdx,
            focusedSubTag: focusedSub ? focusedSub.getAttribute('data-wb-box') || focusedSub.tagName : null,
            nextScrollTop: Math.round(goalTop),
            nextScrollLeft: Math.round(goalLeft),
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            scrollWidth: container.scrollWidth,
            clientWidth: container.clientWidth,
            at: Date.now(),
          };
        } catch {}
      }, 45);
    };

    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            const currentSub = stepEl.querySelector(
              '.fz-sub-zoom-in, .fz-table-row-focus-active, [data-wb-panel-focus="zoom-in"]'
            );
            if (currentSub !== lastFocusedSub) {
              scheduleCameraCheck();
            }
          })
        : null;
    observer?.observe(stepEl, {
      attributes: true,
      attributeFilter: ['class', 'data-wb-panel-focus'],
      subtree: true,
    });
    scheduleCameraCheck();

    return () => {
      if (timerId) window.clearTimeout(timerId);
      observer?.disconnect();
      if (cameraGlideRafRef.current) {
        cancelAnimationFrame(cameraGlideRafRef.current);
        cameraGlideRafRef.current = 0;
      }
    };
  }, [activeStepIndex, steps, resolvedBoardContainerRef, zoomLevel, plan.boardTitle, autoSpotlight]);

  // Clear pen ink markings when topic switches cleanly
  useEffect(() => {
    setStrokes([]);
    setDraftPoints(null);
    setPendingCircleAsk(null);
  }, [plan.boardTitle]);

  // Reset internal playback whenever plan changes or Replay clicked (unless parent lockstep controls it)
  useEffect(() => {
    if (isExternallyControlled) return;
    setInternalStepIndex(0);
    setInternalStepProgress(0);
    onPlayingChange(true);
  }, [plan.boardTitle, replayNonce, isExternallyControlled]);

  // Progressive stroke-by-stroke internal animation timer (when parent audio sequencer is not active)
  useEffect(() => {
    if (isExternallyControlled) return;
    if (!isPlaying || totalSteps === 0) return;
    if (internalStepIndex >= totalSteps) {
      onPlayingChange(false);
      return;
    }

    const currentStep = steps[internalStepIndex];
    const baseDuration = Math.max(450, (currentStep?.durationMs || 1100) / playbackSpeed);
    const startTime = performance.now() - internalStepProgress * baseDuration;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(1, elapsed / baseDuration);
      setInternalStepProgress(pct);
      if (pct < 1) {
        rafId = requestAnimationFrame(tick);
      } else if (internalStepIndex < totalSteps - 1) {
        setInternalStepIndex((prev) => prev + 1);
        setInternalStepProgress(0);
      } else {
        setInternalStepIndex(totalSteps);
        setInternalStepProgress(1);
        onPlayingChange(false);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isExternallyControlled, isPlaying, internalStepIndex, totalSteps, playbackSpeed, steps]);

  const lastPhaseIdx = Math.max(1, (plan.phaseLabels?.length || 4) - 1);
  const currentPhase =
    activeStepIndex >= totalSteps
      ? lastPhaseIdx
      : steps[activeStepIndex]?.phaseIndex ?? 0;

  const jumpToPhase = (phaseIdx: number) => {
    userManualScrollUntilRef.current = 0;
    maxBulletByStepRef.current.clear();
    maxRowByStepRef.current.clear();
    prevStepProgByIdRef.current.clear();
    if (phaseIdx <= 0) {
      if (onSelectStepIndex) {
        onSelectStepIndex(0);
      } else {
        setInternalStepIndex(0);
        setInternalStepProgress(0.05);
      }
      onPlayingChange(true);
      return;
    }
    if (phaseIdx >= lastPhaseIdx) {
      const lastPhaseStepIdx = steps.findIndex((s) => (s?.phaseIndex ?? 0) >= phaseIdx);
      const targetIdx = lastPhaseStepIdx >= 0 ? lastPhaseStepIdx : totalSteps;
      if (onSelectStepIndex) {
        onSelectStepIndex(targetIdx);
      } else {
        setInternalStepIndex(targetIdx);
        setInternalStepProgress(targetIdx < totalSteps ? 0.05 : 1);
      }
      onPlayingChange(targetIdx < totalSteps);
      return;
    }
    const exactIdx = steps.findIndex((s) => (s?.phaseIndex ?? 0) === phaseIdx);
    const firstAtOrAfterIdx = steps.findIndex((s) => (s?.phaseIndex ?? 0) >= phaseIdx);
    let fallbackLeIdx = -1;
    for (let i = 0; i < steps.length; i += 1) {
      if ((steps[i]?.phaseIndex ?? 0) <= phaseIdx) {
        fallbackLeIdx = i;
      }
    }
    const resolved =
      exactIdx >= 0
        ? exactIdx
        : firstAtOrAfterIdx >= 0
          ? firstAtOrAfterIdx
          : fallbackLeIdx >= 0
            ? fallbackLeIdx
            : totalSteps;
    if (onSelectStepIndex) {
      onSelectStepIndex(resolved);
    } else {
      setInternalStepIndex(resolved);
      setInternalStepProgress(1);
      onPlayingChange(false);
    }
  };

  // Pointer handlers for Student Freehand Pen ("Circle to Ask")
  const getRelativeCoords = (e: React.PointerEvent<SVGSVGElement>): [number, number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      (e.clientX - rect.left) / zoomLevel,
      (e.clientY - rect.top) / zoomLevel,
      e.pressure || 0.5,
    ];
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPenActive) return;
    e.preventDefault();
    try {
      window.getSelection()?.removeAllRanges();
    } catch {}
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getRelativeCoords(e);
    setDraftPoints([pt]);
    setPendingCircleAsk(null);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPenActive || !draftPoints) return;
    const pt = getRelativeCoords(e);
    setDraftPoints((prev) => (prev ? [...prev, pt] : [pt]));
  };

  const handlePointerUp = () => {
    if (!isPenActive || !draftPoints || draftPoints.length < 1) {
      setDraftPoints(null);
      return;
    }
    // Terima titik tunggal (丶) maupun coretan singkat dengan menggandakan titik mikro untuk perfect-freehand
    const normalizedPoints =
      draftPoints.length === 1
        ? [draftPoints[0], [draftPoints[0][0] + 0.6, draftPoints[0][1] + 0.6, draftPoints[0][2] || 0.5]]
        : draftPoints;
    const xs = normalizedPoints.map((p) => p[0]);
    const ys = normalizedPoints.map((p) => p[1]);
    const bbox = {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
    const newStroke: FreehandStroke = {
      id: `stk_${Date.now()}`,
      color: penColor,
      points: normalizedPoints,
      bbox,
    };
    setStrokes((prev) => [...prev, newStroke]);
    setDraftPoints(null);

    // Match circled board blocks for "Circle to Ask" — kecuali jika user sedang latihan mencoret Kanji di kotak 168x168
    const rootEl = canvasInnerRef.current;
    if (rootEl) {
      const rootRect = rootEl.getBoundingClientRect();
      const firstPt = normalizedPoints[0];
      const lastPt = normalizedPoints[normalizedPoints.length - 1];
      const startClientX = rootRect.left + firstPt[0] * zoomLevel;
      const startClientY = rootRect.top + firstPt[1] * zoomLevel;
      const endClientX = rootRect.left + lastPt[0] * zoomLevel;
      const endClientY = rootRect.top + lastPt[1] * zoomLevel;
      const kanjiBoxes = Array.from(rootEl.querySelectorAll<HTMLElement>('[data-kanji-practice-box="true"]'));
      const insideKanjiPracticeZone = kanjiBoxes.some((kb) => {
        const kr = kb.getBoundingClientRect();
        const sIn = startClientX >= kr.left - 4 && startClientX <= kr.right + 4 && startClientY >= kr.top - 4 && startClientY <= kr.bottom + 4;
        const eIn = endClientX >= kr.left - 4 && endClientX <= kr.right + 4 && endClientY >= kr.top - 4 && endClientY <= kr.bottom + 4;
        return sIn && eIn;
      });
      if (insideKanjiPracticeZone) {
        return;
      }

      const blocks = Array.from(rootEl.querySelectorAll<HTMLElement>('[data-wb-excerpt]'));
      const matchedTexts: string[] = [];
      blocks.forEach((el) => {
        const r = el.getBoundingClientRect();
        const relLeft = (r.left - rootRect.left) / zoomLevel;
        const relTop = (r.top - rootRect.top) / zoomLevel;
        const relRight = (r.right - rootRect.left) / zoomLevel;
        const relBottom = (r.bottom - rootRect.top) / zoomLevel;
        const overlaps =
          bbox.maxX >= relLeft - 12 &&
          bbox.minX <= relRight + 12 &&
          bbox.maxY >= relTop - 12 &&
          bbox.minY <= relBottom + 12;
        if (overlaps) {
          const val = el.getAttribute('data-wb-excerpt') || el.innerText || '';
          if (val.trim()) matchedTexts.push(val.trim());
        }
      });

      const spanW = bbox.maxX - bbox.minX;
      const spanH = bbox.maxY - bbox.minY;
      if (spanW > 24 || spanH > 20) {
        const excerpt =
          matchedTexts.slice(0, 2).join(' | ').slice(0, 140) || plan.boardTitle;
        setPendingCircleAsk({
          excerpt,
          x: Math.min(bbox.maxX, (rootRect.width / zoomLevel) - 210),
          y: Math.max(8, bbox.minY - 36),
        });
      }
    }
  };

  const renderStepNode = (step: WhiteboardSceneStep, stepIdx: number) => {
    const isCompleted = stepIdx < activeStepIndex;
    const isCurrent = stepIdx === activeStepIndex;
    const isQueued = stepIdx > activeStepIndex;
    // Skala progres penulisan & highlight agar mulai instan sejak detik 0 dan tuntas sebelum transisi zoom-out (0..0.92).
    const stepProg = isCompleted ? 1 : isCurrent ? activeStepProgress : 0;
    const prevKnownProg = prevStepProgByIdRef.current.get(step.id) ?? 0;
    if (isCurrent && stepProg < prevKnownProg - 0.04) {
      maxBulletByStepRef.current.delete(step.id);
      maxRowByStepRef.current.delete(step.id);
    }
    prevStepProgByIdRef.current.set(step.id, stepProg);
    const activeRevealP = isCompleted ? 1 : isCurrent ? Math.max(0, Math.min(1, stepProg / 0.92)) : 0;
    const textProg = isQueued ? 0 : activeRevealP;
    const inFocusWindow =
      autoSpotlight && isPlaying && isCurrent && activeStepProgress >= 0.01 && activeStepProgress <= 0.93;
    const isZoomingOutTransition =
      autoSpotlight && isPlaying && isCurrent && activeStepProgress > 0.93;
    const isDimmedByFocus =
      autoSpotlight && isPlaying && !isCurrent && activeStepProgress >= 0.01 && activeStepProgress <= 0.93;
    const showActivePen =
      step.kind !== 'checkpoint' && isPlaying && isCurrent && activeStepProgress > 0.01 && activeStepProgress < 0.95;
    const wrapQueued = (node: React.ReactNode) => (
      <div
        key={step.id}
        ref={(el) => {
          if (el) {
            stepNodeRefs.current.set(step.id, el);
          } else {
            stepNodeRefs.current.delete(step.id);
          }
        }}
        data-wb-step-id={step.id}
        data-wb-step-state={isCompleted ? 'completed' : isCurrent ? 'active' : 'queued'}
        data-wb-auto-zoom={inFocusWindow ? 'in' : isZoomingOutTransition ? 'out' : 'idle'}
        className={`relative rounded-2xl px-3.5 pt-2.5 ${step.kind === 'checkpoint' ? 'pb-3.5' : 'pb-9'} mx-0.5 border fz-wb-spotlight-card ${
          isCurrent
            ? inFocusWindow
              ? 'border-[#22C55E]/90 bg-white opacity-100 fz-wb-spotlight-zoom-in'
              : isZoomingOutTransition
                ? 'border-[#86EFAC]/85 bg-white/95 opacity-100 fz-wb-spotlight-zoom-out'
                : `border-[#86EFAC]/85 bg-white/95 shadow-[0_6px_22px_rgba(21,128,61,0.09)] opacity-100 ${
                    autoSpotlight ? 'fz-wb-spotlight-active' : ''
                  }`
            : isDimmedByFocus
              ? 'border-transparent bg-white/40 fz-wb-spotlight-dimmed'
              : isCompleted
                ? 'border-transparent bg-white/45 opacity-100'
                : 'border-dashed border-[#CBD5E1]/70 bg-white/40 opacity-55'
        }`}
      >
        {isQueued && (
          <div className="mb-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[10px] font-bold text-[#64748B] pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
            <span>{wbPick('Up next', 'Menunggu giliran')}{step.title ? `: ${step.title}` : ''}</span>
          </div>
        )}
        {showActivePen && (
          <div
            data-testid="wb-active-pen-badge"
            className="fz-pen-float-badge absolute bottom-2 right-3 z-20 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/95 border border-[#86EFAC] shadow-xs pointer-events-none"
          >
            <AnimatedTutorPenSvg color="#15803D" label={wbPick('Tutor Writing...', 'Tutor Menulis...')} />
          </div>
        )}
        <div className={isQueued ? (step.kind === 'checkpoint' ? 'opacity-95 focus-within:opacity-100 hover:opacity-100 transition-opacity duration-300' : 'opacity-25 select-none transition-opacity duration-300') : 'fz-wb-card-enter'}>{node}</div>
      </div>
    );

    if (step.kind === 'heading') {
      return wrapQueued(
        <div
          data-wb-excerpt={`${step.title || ''}: ${step.text || ''}`}
          className="space-y-1 pb-2"
        >
          <h2 className="fz-handwriting-heading text-2xl sm:text-3xl font-bold text-[#15803D] leading-snug">
            <HandwrittenReveal
              text={step.title || plan.boardTitle}
              progress={isQueued ? 1 : Math.min(1, Math.max(0.15, textProg / 0.44))}
              isActive={isPlaying && isCurrent && textProg < 0.44}
              queuedPreview={isQueued}
              highlightTerms={step.highlightTerms}
              emphasize={inFocusWindow}
            />
          </h2>
          {step.text && (
            <p className="fz-handwriting-body text-sm sm:text-base text-[#334155] leading-snug">
              <HandwrittenReveal
                text={step.text}
                progress={isQueued ? 1 : Math.max(0, (textProg - 0.44) / 0.56)}
                isActive={isPlaying && isCurrent && textProg >= 0.44}
                queuedPreview={isQueued}
                highlightTerms={step.highlightTerms}
                emphasize={inFocusWindow}
              />
            </p>
          )}
        </div>
      );
    }

    if (step.kind === 'note') {
      const bullets = (step.bullets || []).map((b) => cleanBracketArtifacts(b)).filter(Boolean);
      const bulletWeight = (item: string) => {
        const txt = String(item || '').trim();
        const words = txt.split(/\s+/).filter(Boolean).length;
        const pauses = (txt.match(/[,:;—\-()]/g) || []).length;
        return Math.max(4, words + pauses * 0.45);
      };
      const bWeights = bullets.map(bulletWeight);
      const safeTotalBulletW = Math.max(1, bWeights.reduce((a, b) => a + b, 0));
      let accBW = 0;
      const bulletSegs = bWeights.map((w) => {
        const segStart = accBW / safeTotalBulletW;
        accBW += w;
        return {
          segStart,
          segLen: Math.max(0.05, w / safeTotalBulletW),
          segEnd: accBW / safeTotalBulletW,
        };
      });
      let weightedBulletIdx = Math.max(0, bullets.length - 1);
      for (let bi = 0; bi < bulletSegs.length; bi += 1) {
        if (activeRevealP <= bulletSegs[bi].segEnd || bi === bulletSegs.length - 1) {
          weightedBulletIdx = bi;
          break;
        }
      }
      let activeBulletIdx = -1;
      if (inFocusWindow && bullets.length > 0 && stepProg >= 0.01 && stepProg <= 0.93) {
        const prevIdx = stepProg < 0.03 ? -1 : (maxBulletByStepRef.current.get(step.id) ?? -1);
        const spokenL = (activeSpokenText || '').toLowerCase();
        let bestIdx = -1;
        let bestHits = 0;
        if (spokenL.length >= 4) {
          bullets.forEach((b, idx) => {
            // Batasi pencocokan suara hanya di sekitar jendela bobot aktif agar highlight tidak melompat jauh mendahului tutor
            if (idx < Math.max(0, prevIdx) || idx > Math.min(bullets.length - 1, Math.max(weightedBulletIdx, Math.max(0, prevIdx)) + 1)) return;
            const hits = countSpatialTokenHits(spokenL, b);
            if (hits > bestHits) {
              bestHits = hits;
              bestIdx = idx;
            }
          });
        }
        const candIdx = bestHits >= 1 && bestIdx >= 0 ? bestIdx : weightedBulletIdx;
        activeBulletIdx = Math.max(prevIdx, Math.min(bullets.length - 1, candIdx));
        maxBulletByStepRef.current.set(step.id, activeBulletIdx);
      }
      return wrapQueued(
        <div
          data-wb-excerpt={bullets.join(' ')}
          className="space-y-1.5 pl-1"
        >
          {step.title && (
            <div className="fz-handwriting-heading text-lg font-bold text-[#0F172A]">
              <HighlightText
                text={cleanBracketArtifacts(step.title)}
                terms={step.highlightTerms}
                active
                emphasize={inFocusWindow}
              />
            </div>
          )}
          {bullets.map((b, bIdx) => {
            const seg = bulletSegs[bIdx] || { segStart: 0, segLen: 1 };
            const baseP = Math.max(0, Math.min(1, (activeRevealP - seg.segStart) / seg.segLen));
            // Kunci kursor penulisan agar SEIRAMA dengan bullet yang sedang dizoom/diucapkan
            const localP = isQueued
              ? 1
              : activeBulletIdx >= 0
                ? bIdx < activeBulletIdx
                  ? 1
                  : bIdx > activeBulletIdx
                    ? 0
                    : Math.max(baseP, 0.14)
                : baseP;
            const isBulletZoomed =
              activeBulletIdx >= 0 &&
              (activeBulletIdx === bIdx);
            const isBulletDimmed = activeBulletIdx >= 0 && activeBulletIdx !== bIdx;
            return (
              <div
                key={bIdx}
                className={`flex items-start gap-2 text-[#1E293B] rounded-xl px-2 py-1 fz-sub-zoom-item ${
                  isBulletZoomed ? 'fz-sub-zoom-in' : isBulletDimmed ? 'fz-sub-dim' : ''
                }`}
              >
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isBulletZoomed ? 'bg-[#16A34A]' : 'bg-[#1E293B]'}`} />
                <span className="fz-handwriting-body text-sm sm:text-[15.5px] leading-relaxed">
                  <HandwrittenReveal
                    text={b}
                    progress={localP}
                    isActive={isPlaying && isCurrent && localP > 0.01 && localP < 0.98}
                    queuedPreview={isQueued}
                    highlightTerms={step.highlightTerms}
                    emphasize={isBulletZoomed}
                  />
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    if (step.kind === 'metaphor_scene') {
      return wrapQueued(
        <div data-wb-excerpt={`${step.title || ''} ${step.caption || ''}`.trim()}>
          <MetaphorSceneDiagram
            step={step}
            progress={textProg}
            isActive={isCurrent}
            isPlaying={isPlaying}
            queuedPreview={isQueued}
            autoZoom={autoSpotlight}
            spokenText={isCurrent ? activeSpokenText : undefined}
            onZoomInspect={() => setZoomedStep(step)}
          />
        </div>
      );
    }

    if (step.kind === 'mind_map') {
      return wrapQueued(
        <div
          data-wb-excerpt={`${step.title || ''} ${(step.branches || []).map((b) => b.label).join(' ')}`.trim()}
        >
          <MindMapDiagram
            step={step}
            progress={textProg}
            isActive={isCurrent}
            isPlaying={isPlaying}
            queuedPreview={isQueued}
            autoZoom={autoSpotlight}
            spokenText={isCurrent ? activeSpokenText : undefined}
            onZoomInspect={() => setZoomedStep(step)}
          />
        </div>
      );
    }

    if (step.kind === 'timeline_track') {
      return wrapQueued(
        <div
          data-wb-excerpt={`${step.title || ''} ${(step.timelineEvents || []).map((e) => e.title || e.example || '').join(' -> ')}`.trim()}
        >
          <TimelineTrackDiagram
            step={step}
            progress={textProg}
            isActive={isCurrent}
            isPlaying={isPlaying}
            queuedPreview={isQueued}
            autoZoom={autoSpotlight}
            spokenText={isCurrent ? activeSpokenText : undefined}
            onZoomInspect={() => setZoomedStep(step)}
          />
        </div>
      );
    }

    if (step.kind === 'formula_blocks') {
      return wrapQueued(
        <div
          data-wb-excerpt={`${step.title || ''} ${(step.blocks || []).map((b) => `${b.role}: ${b.token}`).join(' ')}`.trim()}
        >
          <FormulaBlocksDiagram
            step={step}
            progress={textProg}
            isActive={isCurrent}
            isPlaying={isPlaying}
            queuedPreview={isQueued}
            autoZoom={autoSpotlight}
            spokenText={isCurrent ? activeSpokenText : undefined}
            onZoomInspect={() => setZoomedStep(step)}
          />
        </div>
      );
    }

    if (step.kind === 'rough_scene') {
      return wrapQueued(
        <div
          data-wb-excerpt={
            step.caption ||
            step.title ||
            (step.shapes || []).map((s) => s.label || s.text || '').filter(Boolean).join(' ')
          }
        >
          <RoughFreeformSceneDiagram
            step={step}
            progress={textProg}
            isActive={isCurrent}
            isPlaying={isPlaying}
            queuedPreview={isQueued}
            autoZoom={autoSpotlight}
            spokenText={isCurrent ? activeSpokenText : undefined}
            onZoomInspect={() => setZoomedStep(step)}
          />
        </div>
      );
    }

    if (step.kind === 'contrast_scale') {
      return wrapQueued(
        <div data-wb-excerpt={`${step.termA || ''} vs ${step.termB || ''}`}>
          <RoughContrastScaleDiagram
            step={step}
            progress={textProg}
            isActive={isCurrent}
            isPlaying={isPlaying}
            queuedPreview={isQueued}
            autoZoom={autoSpotlight}
            spokenText={isCurrent ? activeSpokenText : undefined}
            onZoomInspect={() => setZoomedStep(step)}
          />
        </div>
      );
    }

    if (step.kind === 'syntax_flow') {
      return wrapQueued(
        <div
          data-wb-excerpt={(step.nodes || []).map((n) => n.word).join(' ')}
        >
          <RoughSyntaxFlowDiagram
            step={step}
            progress={textProg}
            isActive={isCurrent}
            isPlaying={isPlaying}
            queuedPreview={isQueued}
            autoZoom={autoSpotlight}
            spokenText={isCurrent ? activeSpokenText : undefined}
            onZoomInspect={() => setZoomedStep(step)}
          />
        </div>
      );
    }

    if (step.kind === 'kanji_grid') {
      const kanjiExcerpt = `${cleanBracketArtifacts(step.character)}${cleanBracketArtifacts(step.reading) ? ` (${cleanBracketArtifacts(step.reading)})` : ''}`;
      return wrapQueued(
        <div data-wb-excerpt={kanjiExcerpt} className="space-y-1.5">
          <div className="flex items-center justify-end px-1">
            <button
              type="button"
              data-testid="wb-visual-zoom-btn"
              onClick={() => setZoomedStep(step)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border border-[#E2D9C5] bg-white/95 text-[#334155] hover:bg-[#FEF3C7] hover:border-[#F59E0B] transition-colors cursor-pointer"
              title="Perbesar panduan urutan guratan Kanji"
            >
              <span>🔍</span>
              <span>Perbesar</span>
            </button>
          </div>
          <div
            className="transition-transform duration-500 ease-out origin-center"
            style={{ transform: inFocusWindow ? 'scale(1.06)' : 'scale(1)' }}
          >
            <RoughKanjiGridDiagram step={step} progress={stepProg} targetLang={targetLang} />
          </div>
        </div>
      );
    }

    if (step.kind === 'tone_wave') {
      return wrapQueued(
        <div data-wb-excerpt={step.text || step.title || 'Gelombang Nada'}>
          <InteractiveToneWaveWidget step={step} progress={textProg} />
        </div>
      );
    }

    if (step.kind === 'highlight_callout') {
      const mainText = step.text || '';
      const hlPhrase = step.highlightPhrase || mainText;
      return wrapQueued(
        <div
          data-wb-excerpt={mainText}
          className="py-1.5 space-y-1 rounded-xl px-2.5 transition-all duration-500 ease-out"
          style={{
            transform: inFocusWindow ? 'scale(1.045)' : 'scale(1)',
            backgroundColor: inFocusWindow ? 'rgba(254, 249, 195, 0.65)' : 'transparent',
          }}
        >
          {step.title && (
            <div className="fz-handwriting-heading text-lg font-bold text-[#0F172A]">
              <HighlightText text={step.title} terms={step.highlightTerms} active emphasize={inFocusWindow} />
            </div>
          )}
          <div className="fz-handwriting-body text-[15px] text-[#1E293B] leading-relaxed">
            {isQueued ? (
              <HandwrittenReveal
                text={hlPhrase}
                progress={0}
                isActive={false}
                queuedPreview
              />
            ) : textProg >= 0.72 ? (
              <RoughMarkedText
                text={hlPhrase}
                type="highlight"
                color={step.highlightColor || 'rgba(125, 211, 252, 0.48)'}
                show={isCompleted || (isCurrent && textProg >= 0.72)}
              />
            ) : (
              <HandwrittenReveal
                text={hlPhrase}
                progress={Math.min(1, textProg / 0.72)}
                isActive={isPlaying && isCurrent}
                highlightTerms={step.highlightTerms}
                emphasize={inFocusWindow}
              />
            )}
          </div>
        </div>
      );
    }

    if (step.kind === 'table') {
      const headers = (step.tableHeaders || []).map((h) => cleanBracketArtifacts(h)).filter(Boolean);
      const rows = (step.tableRows || [])
        .map((r) => r.map((c) => cleanBracketArtifacts(c)))
        .filter((r) => r.some(Boolean));
      const rowWeights = rows.map((r) =>
        Math.max(4, r.join(' ').split(/\s+/).filter(Boolean).length)
      );
      const totalRowW = Math.max(1, rowWeights.reduce((a, b) => a + b, 0));
      let accRowW = 0;
      const rowSegs = rowWeights.map((rw) => {
        const segStart = accRowW / totalRowW;
        accRowW += rw;
        return { segStart, segEnd: accRowW / totalRowW, segLen: Math.max(0.05, rw / totalRowW) };
      });
      const rowPhaseP = Math.max(0, Math.min(1, (activeRevealP - 0.14) / 0.86));
      let weightedRowIdx = Math.max(0, rows.length - 1);
      for (let ri = 0; ri < rowSegs.length; ri += 1) {
        if (rowPhaseP <= rowSegs[ri].segEnd || ri === rowSegs.length - 1) {
          weightedRowIdx = ri;
          break;
        }
      }
      let activeRowIdx = -1;
      if (inFocusWindow && rows.length > 0 && stepProg >= 0.02 && stepProg <= 0.93) {
        const prevRow = stepProg < 0.03 ? -1 : (maxRowByStepRef.current.get(step.id) ?? -1);
        const spokenL = (activeSpokenText || '').toLowerCase();
        let bestRow = -1;
        let bestHits = 0;
        if (spokenL.length >= 4) {
          rows.forEach((row, rIdx) => {
            if (rIdx < Math.max(0, prevRow) || rIdx > Math.min(rows.length - 1, Math.max(weightedRowIdx, Math.max(0, prevRow)) + 1)) return;
            const hits = countSpatialTokenHits(spokenL, row.join(' '));
            if (hits > bestHits) {
              bestHits = hits;
              bestRow = rIdx;
            }
          });
        }
        const candRow = bestHits >= 1 && bestRow >= 0 ? bestRow : weightedRowIdx;
        activeRowIdx = Math.max(prevRow, Math.min(rows.length - 1, candRow));
        maxRowByStepRef.current.set(step.id, activeRowIdx);
      }

      return wrapQueued(
        <div
          data-wb-excerpt={`${headers.join(' vs ')}: ${rows.flat().join(' ')}`}
          className="space-y-1.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="fz-handwriting-heading text-xl font-bold text-[#0F172A] flex items-center gap-1.5">
              <SmpVectorIcon name="sparkles" color="#15803D" size={16} />
              <span>{step.title || 'Perbandingan di Papan'}</span>
            </div>
            <button
              type="button"
              data-testid="wb-visual-zoom-btn"
              onClick={() => setZoomedStep(step)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border border-[#E2D9C5] bg-white/95 text-[#334155] hover:bg-[#FEF3C7] hover:border-[#F59E0B] transition-colors cursor-pointer"
              title="Perbesar tabel perbandingan"
            >
              <span>🔍</span>
              <span>Perbesar</span>
            </button>
          </div>
          <div className="rounded-2xl overflow-visible border border-[#E2E0D8] bg-white/85 shadow-2xs p-0.5">
            <table className="w-full border-collapse text-left rounded-xl overflow-visible">
              <thead>
                <tr className="bg-[#F2F1EC] border-b border-[#E2E0D8]">
                  {headers.map((h, hIdx) => {
                    const start = (hIdx / Math.max(1, headers.length)) * 0.14;
                    const len = Math.max(0.06, 0.14 / Math.max(1, headers.length));
                    const cellP = isQueued ? 1 : Math.max(0, Math.min(1, (activeRevealP - start) / len));
                    return (
                      <th
                        key={hIdx}
                        className="px-3 py-2 fz-handwriting-body text-xs sm:text-sm font-bold text-[#1E293B] border-r last:border-r-0 border-[#E2E0D8]"
                      >
                        <HandwrittenReveal
                          text={h}
                          progress={cellP}
                          isActive={isPlaying && isCurrent && cellP > 0 && cellP < 1}
                          queuedPreview={isQueued}
                          highlightTerms={step.highlightTerms}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => {
                  const isRowFocused = rIdx === activeRowIdx;
                  const isRowDimmed = activeRowIdx >= 0 && rIdx !== activeRowIdx;
                  const rSeg = rowSegs[rIdx] || { segStart: 0, segLen: 1 };
                  const rowLocalP = isQueued ? 1 : Math.max(0, Math.min(1, (rowPhaseP - rSeg.segStart) / rSeg.segLen));
                  return (
                    <tr
                      key={rIdx}
                      className={`border-b last:border-b-0 border-[#EAE8E1] fz-table-row-focus ${
                        isRowFocused ? 'fz-table-row-focus-active' : ''
                      }`}
                      style={
                        isRowFocused
                          ? { transform: 'scale(1.018)', transformOrigin: 'center center', opacity: 1 }
                          : isRowDimmed
                            ? { opacity: 0.46, transform: 'scale(0.985)', transformOrigin: 'center center' }
                            : undefined
                      }
                    >
                      {row.map((cell, cIdx) => {
                        const cSpan = 1 / Math.max(1, row.length);
                        const baseCellP = Math.max(0, Math.min(1, (rowLocalP - cIdx * cSpan) / Math.max(0.18, cSpan)));
                        const cellP = isQueued
                          ? 1
                          : activeRowIdx >= 0
                            ? rIdx < activeRowIdx
                              ? 1
                              : rIdx > activeRowIdx
                                ? 0
                                : Math.max(baseCellP, 0.16)
                            : baseCellP;
                        return (
                          <td
                            key={cIdx}
                            className="px-3 py-2.5 align-top fz-handwriting-body text-xs sm:text-[13.5px] text-[#334155] border-r last:border-r-0 border-[#EAE8E1] min-h-[42px]"
                          >
                            <HandwrittenReveal
                              text={cell}
                              progress={cellP}
                              isActive={isPlaying && isCurrent && cellP > 0 && cellP < 1}
                              queuedPreview={isQueued}
                              highlightTerms={step.highlightTerms}
                              emphasize={isRowFocused}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (step.kind === 'trap_vs_fix') {
      const trapSpoken = String(activeSpokenText || '').toLowerCase();
      const wrongHits = countSpatialTokenHits(trapSpoken, step.wrongText || '');
      const rightHits = countSpatialTokenHits(trapSpoken, step.rightText || '');
      const saysWrongCue = /\b(?:hindari|salah|keliru|jangan|avoid|wrong|mistake)\b/i.test(trapSpoken);
      const saysRightCue = /\b(?:yang\s+benar|yang\s+tepat|seharusnya|instead\s+use|correct\s+form)\b/i.test(trapSpoken);
      const pickRightSide =
        inFocusWindow && stepProg >= 0.02 && stepProg <= 0.93
          ? saysRightCue && !saysWrongCue
            ? true
            : saysWrongCue && !saysRightCue
              ? false
              : rightHits > wrongHits && stepProg >= 0.24
                ? true
                : wrongHits > rightHits
                  ? false
                  : stepProg >= 0.46
          : false;
      const focusWrong = inFocusWindow && stepProg >= 0.02 && stepProg <= 0.93 && !pickRightSide;
      const focusRight = inFocusWindow && stepProg >= 0.02 && stepProg <= 0.93 && pickRightSide;
      return wrapQueued(
        <div
          data-wb-excerpt={`${step.wrongText || ''} -> ${step.rightText || ''}`}
          className="pl-3.5 border-l-[3px] border-[#DC2626]/70 py-1 space-y-2"
        >
          <div className="fz-handwriting-heading text-lg font-bold text-[#0F172A]">
            {step.title || 'Coretan Salah vs Benar'}
          </div>
          {step.wrongText && (
            <div
              data-wb-panel-focus={focusWrong ? 'zoom-in' : focusRight ? 'dim' : 'idle'}
              className="flex items-start gap-2 rounded-xl px-2.5 py-1.5 transition-all duration-400"
              style={{
                transform: focusWrong ? 'scale(1.065)' : focusRight ? 'scale(0.97)' : 'scale(1)',
                opacity: focusRight ? 0.44 : 1,
                backgroundColor: focusWrong ? 'rgba(254, 226, 226, 0.7)' : 'transparent',
                boxShadow: focusWrong ? '0 8px 20px rgba(220, 38, 38, 0.16)' : undefined,
                transformOrigin: 'left center',
              }}
            >
              <span className="text-xs font-extrabold px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#B91C1C] shrink-0">
                ✕
              </span>
              <div className="fz-handwriting-body text-sm sm:text-[15px] text-[#7F1D1D]">
                {isQueued ? (
                  <HandwrittenReveal
                    text={step.wrongText}
                    progress={0}
                    isActive={false}
                    queuedPreview
                  />
                ) : textProg >= 0.25 ? (
                  <RoughMarkedText
                    text={step.wrongText}
                    type="strike-through"
                    color="#DC2626"
                    show={textProg >= 0.25}
                  />
                ) : (
                  <HandwrittenReveal
                    text={step.wrongText}
                    progress={Math.min(1, textProg / 0.25)}
                    isActive={isPlaying && isCurrent}
                  />
                )}
              </div>
            </div>
          )}
          {step.rightText && (
            <div
              data-wb-panel-focus={focusRight ? 'zoom-in' : focusWrong ? 'dim' : 'idle'}
              className="flex items-start gap-2 rounded-xl px-2.5 py-1.5 transition-all duration-400"
              style={{
                transform: focusRight ? 'scale(1.04)' : focusWrong ? 'scale(0.98)' : 'scale(1)',
                opacity: focusWrong ? 0.44 : 1,
                backgroundColor: focusRight ? 'rgba(220, 252, 231, 0.78)' : 'transparent',
                boxShadow: focusRight ? '0 10px 24px rgba(22, 163, 74, 0.18)' : undefined,
                transformOrigin: 'left center',
              }}
            >
              <span className="text-xs font-extrabold px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] shrink-0">
                ✓
              </span>
              <div className="fz-handwriting-body text-sm sm:text-[15.5px] font-bold text-[#14532D]">
                {isQueued ? (
                  <HandwrittenReveal
                    text={step.rightText}
                    progress={0}
                    isActive={false}
                    queuedPreview
                  />
                ) : textProg >= 0.72 ? (
                  <RoughMarkedText
                    text={step.rightText}
                    type={step.rightText.length > 26 ? 'underline' : 'circle'}
                    color="#16A34A"
                    show={textProg >= 0.72}
                  />
                ) : (
                  <HandwrittenReveal
                    text={step.rightText}
                    progress={Math.max(0, (textProg - 0.36) / 0.36)}
                    isActive={isPlaying && isCurrent && textProg >= 0.36}
                  />
                )}
              </div>
            </div>
          )}
          {step.reason && (
            <div className="text-xs text-[#475569] italic leading-relaxed">
              <span className="font-bold text-[#0F172A] not-italic">Alasan: </span>
              <HandwrittenReveal
                text={step.reason}
                progress={isQueued ? 0 : Math.max(0, Math.min(1, (textProg - 0.25) / 0.72))}
                isActive={isPlaying && isCurrent && textProg >= 0.25 && textProg < 0.97}
                queuedPreview={isQueued}
                highlightTerms={step.highlightTerms}
                emphasize={focusRight}
              />
            </div>
          )}
        </div>
      );
    }

    if (step.kind === 'student_question') {
      return wrapQueued(
        <div
          data-wb-excerpt={step.text || ''}
          className="rounded-2xl bg-[#EFF6FF]/90 border border-[#BFDBFE] p-3 space-y-1.5 shadow-2xs"
        >
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#2563EB] text-white text-[10px] font-extrabold tracking-wider uppercase">
            <span>PERTANYAANMU</span>
          </div>
          {step.highlightPhrase && (
            <div className="text-[11px] text-[#1D4ED8] italic line-clamp-1">
              Area: "{step.highlightPhrase}"
            </div>
          )}
          <div className="fz-handwriting-body text-sm font-bold text-[#1E3A8A]">
            "{step.text}"
          </div>
          {step.reason && (
            <div className="fz-handwriting-body text-xs text-[#1E293B] border-t border-[#DBEAFE] pt-1.5">
              {step.reason}
            </div>
          )}
        </div>
      );
    }

    if (step.kind === 'checkpoint') {
      return wrapQueued(
        <div
          data-wb-excerpt={wbPick('Quick Check Practice', 'Latihan Cek Pemahaman')}
          className="relative z-30 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm p-3.5"
        >
          {quizSlot}
        </div>
      );
    }

    return null;
  };

  const leftSteps = steps
    .map((s, idx) => ({ step: s, idx }))
    .filter((item) => item.step.column === 'left');
  const rightSteps = steps
    .map((s, idx) => ({ step: s, idx }))
    .filter((item) => item.step.column === 'right');

  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Phase Scrubber Bar (terinspirasi dari [0 Copy] [1 Cut] [2 Half-turn] [3 Fit] Solvely) */}
      <div className="px-3 sm:px-4 py-2 bg-[#F4F6F3] border-b border-[#E5E8E3] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div
          className="flex items-center gap-1 overflow-x-auto whitespace-nowrap max-w-full pb-0.5"
          data-testid="wb-phase-scrubber"
        >
          {plan.phaseLabels.map((label, pIdx) => {
            const active = currentPhase === pIdx;
            const passed = currentPhase > pIdx;
            return (
              <button
                key={label}
                type="button"
                onClick={() => jumpToPhase(pIdx)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  active
                    ? 'bg-[#15803D] text-white shadow-2xs'
                    : passed
                      ? 'bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]'
                      : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:text-[#0F172A]'
                }`}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => jumpToPhase(0)}
            className="px-2 py-1 rounded-lg text-[11px] font-bold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] cursor-pointer shrink-0 whitespace-nowrap"
          >
            Reset
          </button>
        </div>

        {/* Status Live Menulis + Auto Zoom Lens Indicator */}
        <div className="flex flex-wrap items-center gap-2">
          {isPlaying && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-ping" />
              <span>{wbPick('Tutor is writing on the board...', 'Tutor sedang menulis di papan...')}</span>
            </span>
          )}
          {autoSpotlight && isPlaying && (
            <span
              data-testid="wb-auto-zoom-indicator"
              className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-full"
            >
              <span>🔍</span>
              <span>
                {activeStepProgress > 0.93
                  ? wbPick('Zoom Out Transition', 'Zoom Out Transisi')
                  : activeStepProgress >= 0.01
                    ? wbPick('Focus Zoom', 'Zoom In Fokus')
                    : wbPick('Focus Ready', 'Fokus Siap')}
              </span>
            </span>
          )}
          {isPenActive && (
            <div className="flex items-center gap-1.5 bg-white border border-[#BFDBFE] px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#1D4ED8]">
              <span>{wbPick('✏️ Pen Mode Active: circle any part to ask', '✏️ Mode Spidol Aktif: lingkari bagian mana pun untuk bertanya')}</span>
              {strokes.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setStrokes((prev) => prev.slice(0, -1));
                      setPendingCircleAsk(null);
                    }}
                    className="underline cursor-pointer"
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStrokes([]);
                      setPendingCircleAsk(null);
                    }}
                    className="underline text-[#DC2626] cursor-pointer"
                  >
                    {wbPick('Clear', 'Hapus')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Live Lesson Progress Rail (smooth forward momentum bar) */}
      <div
        className="h-[3px] w-full bg-[#E5E8E3] shrink-0 overflow-hidden"
        aria-hidden="true"
        data-testid="wb-lesson-progress-rail"
      >
        <div
          className="h-full bg-gradient-to-r from-[#15803D] via-[#10B981] to-[#34D399] transition-[width] duration-150 ease-out"
          style={{
            width: `${Math.max(
              0,
              Math.min(
                100,
                plan.steps.length > 0
                  ? ((Math.min(plan.steps.length, activeStepIndex) + (activeStepIndex < plan.steps.length ? activeStepProgress : 0)) /
                      plan.steps.length) *
                      100
                  : 0
              )
            ).toFixed(1)}%`,
          }}
        />
      </div>

      {/* Dot-Grid Scrollable / Zoomable Whiteboard Surface */}
      <div
        ref={resolvedBoardContainerRef}
        data-testid="solvely-dotgrid-whiteboard"
        className={`relative flex-1 overflow-auto fz-solvely-dotgrid p-4 sm:p-6 lg:p-8 ${
          isPenActive ? 'select-none' : ''
        }`}
      >
        {(() => {
          const isScaled = Math.abs(zoomLevel - 1) > 0.005;
          const baseNaturalW =
            containerWidth > 80
              ? Math.min(1120, containerWidth)
              : innerNaturalSize.width > 0
                ? innerNaturalSize.width
                : 0;
          const scaledW =
            isScaled && baseNaturalW > 0 ? Math.round(baseNaturalW * zoomLevel) : undefined;
          const scaledH =
            isScaled && innerNaturalSize.height > 0
              ? Math.round(innerNaturalSize.height * zoomLevel)
              : undefined;
          const outerStyle: React.CSSProperties = isScaled
            ? {
                width: scaledW ? `${scaledW}px` : '100%',
                minHeight: scaledH ? `${scaledH}px` : undefined,
                overflow: 'visible',
              }
            : { maxWidth: '1120px', width: '100%' };
          const innerStyle: React.CSSProperties = isScaled
            ? {
                width: baseNaturalW > 0 ? `${baseNaturalW}px` : '100%',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top left',
              }
            : { maxWidth: '1120px', width: '100%' };

          return (
            <div className="mx-auto" style={outerStyle}>
              <div
                ref={canvasInnerRef}
                style={innerStyle}
                className="relative min-h-full mx-auto pb-10"
              >
                {/* 2-Column Spatial Layout persis Solvely (Kolom Kiri Penjelasan+Diagram+Kuis, Kolom Kanan Tabel+Coretan+Tanya) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7 space-y-5">
                    {leftSteps.map(({ step, idx }) => renderStepNode(step, idx))}
                  </div>
                  <div className="lg:col-span-5 space-y-5 pt-1">
                    {rightSteps.map(({ step, idx }) => renderStepNode(step, idx))}
                  </div>
                </div>

                {/* Student Freehand Ink SVG Layer (perfect-freehand) */}
                <svg
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={`absolute inset-0 w-full h-full z-20 ${
                    isPenActive ? 'pointer-events-auto cursor-crosshair touch-none' : 'pointer-events-none'
                  }`}
                >
                  {strokes.map((stk) => {
                    const outline = getStroke(stk.points, {
                      size: 6,
                      thinning: 0.45,
                      smoothing: 0.55,
                      streamline: 0.5,
                    });
                    return <path key={stk.id} d={getSvgPathFromStroke(outline)} fill={stk.color} opacity="0.72" />;
                  })}
                  {draftPoints && draftPoints.length === 1 && (
                    <circle cx={draftPoints[0][0]} cy={draftPoints[0][1]} r="3.5" fill={penColor} opacity="0.72" />
                  )}
                  {draftPoints && draftPoints.length > 1 && (
                    <path
                      d={getSvgPathFromStroke(
                        getStroke(draftPoints, {
                          size: 6,
                          thinning: 0.45,
                          smoothing: 0.55,
                          streamline: 0.5,
                        })
                      )}
                      fill={penColor}
                      opacity="0.72"
                    />
                  )}
                </svg>

                {/* Circle-to-Ask Floating Action Pill */}
                {pendingCircleAsk && (
                  <div
                    style={{ left: Math.max(8, pendingCircleAsk.x), top: Math.max(8, pendingCircleAsk.y) }}
                    className="absolute z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1E293B] text-white text-xs font-bold shadow-xl animate-in fade-in duration-150"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const targetExcerpt = pendingCircleAsk.excerpt;
                        setPendingCircleAsk(null);
                        onPenToggle(false);
                        onCircleAsk(
                          targetExcerpt,
                          `Tolong jelaskan lebih detail bagian yang saya lingkari ini: "${targetExcerpt}"`
                        );
                      }}
                      className="cursor-pointer hover:underline"
                    >
                      ✨ Tanya Bagian Yang Dilingkari
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingCircleAsk(null)}
                      className="text-white/70 hover:text-white cursor-pointer ml-1"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Interactive Diagram Zoom Lightbox */}
      <VisualZoomLightbox
        step={zoomedStep}
        onClose={() => setZoomedStep(null)}
        renderContent={(step, _lightboxScale) => {
          if (step.kind === 'metaphor_scene') {
            return (
              <MetaphorSceneDiagram
                step={step}
                progress={1}
                isActive
                isPlaying={false}
                isLightbox
              />
            );
          }
          if (step.kind === 'mind_map') {
            return (
              <MindMapDiagram
                step={step}
                progress={1}
                isActive
                isPlaying={false}
                isLightbox
              />
            );
          }
          if (step.kind === 'timeline_track') {
            return (
              <TimelineTrackDiagram
                step={step}
                progress={1}
                isActive
                isPlaying={false}
                isLightbox
              />
            );
          }
          if (step.kind === 'formula_blocks') {
            return (
              <FormulaBlocksDiagram
                step={step}
                progress={1}
                isActive
                isPlaying={false}
                isLightbox
              />
            );
          }
          if (step.kind === 'rough_scene') {
            return (
              <RoughFreeformSceneDiagram
                step={step}
                progress={1}
                isActive
                isPlaying={false}
                isLightbox
              />
            );
          }
          if (step.kind === 'contrast_scale') {
            return (
              <RoughContrastScaleDiagram
                step={step}
                progress={1}
                isActive
                isPlaying={false}
                isLightbox
              />
            );
          }
          if (step.kind === 'syntax_flow') {
            return (
              <RoughSyntaxFlowDiagram
                step={step}
                progress={1}
                isActive
                isPlaying={false}
                isLightbox
              />
            );
          }
          if (step.kind === 'kanji_grid') {
            return (
              <RoughKanjiGridDiagram
                step={step}
                progress={1}
                targetLang={targetLang}
              />
            );
          }
          if (step.kind === 'table') {
            const headers = (step.tableHeaders || []).map((h) => cleanBracketArtifacts(h)).filter(Boolean);
            const rows = (step.tableRows || [])
              .map((r) => r.map((c) => cleanBracketArtifacts(c)))
              .filter((r) => r.some(Boolean));
            return (
              <div className="space-y-2">
                <div className="fz-handwriting-heading text-2xl font-bold text-[#0F172A]">
                  {step.title || 'Perbandingan di Papan'}
                </div>
                <div className="rounded-2xl overflow-hidden border border-[#E2E0D8] bg-white shadow-sm">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#F2F1EC] border-b border-[#E2E0D8]">
                        {headers.map((h, i) => (
                          <th key={i} className="px-4 py-3 text-sm font-bold text-[#1E293B] border-r last:border-r-0 border-[#E2E0D8]">
                            <HighlightText text={h} terms={step.highlightTerms} active />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, rIdx) => (
                        <tr key={rIdx} className="border-b last:border-b-0 border-[#EAE8E1]">
                          {r.map((cell, cIdx) => (
                            <td key={cIdx} className="px-4 py-3 text-sm text-[#334155] border-r last:border-r-0 border-[#EAE8E1]">
                              <HighlightText text={cell} terms={step.highlightTerms} active />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }
          return (
            <div className="space-y-2 p-2">
              {step.title && (
                <div className="text-xl font-bold text-[#0F172A]">{step.title}</div>
              )}
              {(step.caption || step.text) && (
                <p className="text-sm text-[#334155] leading-relaxed">
                  {step.caption || step.text}
                </p>
              )}
            </div>
          );
        }}
      />
    </div>
  );
};
