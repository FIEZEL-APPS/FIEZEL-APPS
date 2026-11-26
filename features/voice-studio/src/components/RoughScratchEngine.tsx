import React, { useEffect, useMemo, useRef, useState } from 'react';
import rough from 'roughjs';
import type {
  BucketSortableChip,
  BucketZoneSpec,
  DialSectorStop,
  InkPaletteId,
  LearnerLocale,
  RoughHatchKind,
  SeesawItemToken,
  TargetLang,
  WhiteboardStepCommand,
  WirePairSpec,
} from '../types/voiceCall';
import { MathText } from './MathText';
import { HighlightText } from './WhiteboardVisualDiagrams';
import { wbPick } from '../lib/i18n';

export interface InkStudioPalette {
  id: InkPaletteId;
  ink: string;
  accent: string;
  wash: string;
  accentWash: string;
  foilA: string;
  foilB: string;
  label: string;
}

export const INK_STUDIO_PALETTES: Record<InkPaletteId, InkStudioPalette> = {
  cobalt_blueprint: {
    id: 'cobalt_blueprint',
    ink: '#1D4ED8',
    accent: '#D97706',
    wash: '#DBEAFE',
    accentWash: '#FEF3C7',
    foilA: '#1E3A8A',
    foilB: '#2563EB',
    label: 'Blueprint',
  },
  terracotta_atelier: {
    id: 'terracotta_atelier',
    ink: '#C2410C',
    accent: '#0F766E',
    wash: '#FFEDD5',
    accentWash: '#CCFBF1',
    foilA: '#9A3412',
    foilB: '#EA580C',
    label: 'Terracotta',
  },
  violet_prism: {
    id: 'violet_prism',
    ink: '#6D28D9',
    accent: '#DB2777',
    wash: '#EDE9FE',
    accentWash: '#FCE7F3',
    foilA: '#4C1D95',
    foilB: '#7C3AED',
    label: 'Prism',
  },
  crimson_scalpel: {
    id: 'crimson_scalpel',
    ink: '#BE123C',
    accent: '#15803D',
    wash: '#FFE4E6',
    accentWash: '#DCFCE7',
    foilA: '#881337',
    foilB: '#E11D48',
    label: 'Carmine',
  },
  amber_fulcrum: {
    id: 'amber_fulcrum',
    ink: '#B45309',
    accent: '#1E40AF',
    wash: '#FEF3C7',
    accentWash: '#DBEAFE',
    foilA: '#78350F',
    foilB: '#D97706',
    label: 'Fulcrum',
  },
  teal_oscillator: {
    id: 'teal_oscillator',
    ink: '#0F766E',
    accent: '#E11D48',
    wash: '#CCFBF1',
    accentWash: '#FFE4E6',
    foilA: '#115E59',
    foilB: '#0D9488',
    label: 'Oscillator',
  },
  indigo_constellation: {
    id: 'indigo_constellation',
    ink: '#3730A3',
    accent: '#0284C7',
    wash: '#E0E7FF',
    accentWash: '#E0F2FE',
    foilA: '#312E81',
    foilB: '#4F46E5',
    label: 'Constellation',
  },
  emerald_botanical: {
    id: 'emerald_botanical',
    ink: '#15803D',
    accent: '#CA8A04',
    wash: '#DCFCE7',
    accentWash: '#FEF9C3',
    foilA: '#14532D',
    foilB: '#16A34A',
    label: 'Botanical',
  },
};

const PALETTE_KEYS = Object.keys(INK_STUDIO_PALETTES) as InkPaletteId[];
const HATCH_STYLES: RoughHatchKind[] = ['hachure', 'cross-hatch', 'zigzag', 'dots', 'dashed'];

export function hashTopicSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function resolveStepPalette(step: WhiteboardStepCommand & { id?: string }, fallbackOffset = 0): InkStudioPalette {
  if (step.inkPalette && INK_STUDIO_PALETTES[step.inkPalette]) {
    return INK_STUDIO_PALETTES[step.inkPalette];
  }
  const seed = hashTopicSeed(`${step.id || ''}:${step.title || ''}:${step.variantSeed || 0}`) + fallbackOffset;
  return INK_STUDIO_PALETTES[PALETTE_KEYS[seed % PALETTE_KEYS.length]];
}

export function resolveStepHatch(step: WhiteboardStepCommand & { id?: string }): RoughHatchKind {
  if (step.roughHatch && HATCH_STYLES.includes(step.roughHatch)) {
    return step.roughHatch;
  }
  const seed = hashTopicSeed(`${step.title || ''}:${step.id || ''}:${step.variantSeed || 0}`);
  return HATCH_STYLES[seed % HATCH_STYLES.length];
}

export function animateRoughScratchPaths(svgEl: SVGSVGElement | null, maxAnimated = 42): void {
  if (!svgEl || typeof window === 'undefined') return;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  } catch {}
  const paths = Array.from(svgEl.querySelectorAll('path')).slice(0, maxAnimated);
  paths.forEach((p, idx) => {
    try {
      const len = Math.max(48, Math.min(900, Math.ceil(p.getTotalLength())));
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
      p.style.transition = 'none';
      void p.getBoundingClientRect();
      const delayMs = Math.min(340, idx * 18);
      const durMs = Math.min(460, 190 + (idx % 5) * 38);
      p.style.transition = `stroke-dashoffset ${durMs}ms cubic-bezier(0.23, 1, 0.32, 1) ${delayMs}ms`;
      p.style.strokeDashoffset = '0';
    } catch {
      // Ignore non-geometry paths
    }
  });
}

function pickL(locale: LearnerLocale | undefined, en: string, id: string, th?: string): string {
  return wbPick(en, id, th || en, locale);
}

export interface LabEventPayload {
  stepId: string;
  isCorrect: boolean;
  userAnswer: string;
  expectedAnswer: string;
  feedbackToSpeak: string;
}

export interface MechanicWidgetProps {
  step: WhiteboardStepCommand & { id: string };
  locale?: LearnerLocale;
  targetLang?: TargetLang;
  isCompletedByStudent: boolean;
  isWaitingOnStudent: boolean;
  onInteractionResult: (ev: LabEventPayload) => void;
  onSkipContinue?: () => void;
}

const SkipGateLink: React.FC<{
  show: boolean;
  locale?: LearnerLocale;
  onSkip?: () => void;
}> = ({ show, locale, onSkip }) => {
  if (!show || !onSkip) return null;
  return (
    <button
      type="button"
      data-testid="wb-socratic-skip-btn"
      onClick={onSkip}
      className="min-h-[40px] min-w-[64px] px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white border border-[#E2E8F0] text-[11.5px] font-bold text-[#475569] hover:text-[#0F172A] cursor-pointer shrink-0 inline-flex items-center justify-center transition-transform active:scale-95"
    >
      {pickL(locale, 'Continue ›', 'Lanjut ›', 'ไปต่อ ›')}
    </button>
  );
};

/* ============================================================================
 * MECHANIC 1: SCRATCH-OFF FOIL INK CARD (`scratch_reveal`)
 * ============================================================================ */
export const ScratchRevealFoilLab: React.FC<MechanicWidgetProps> = ({
  step,
  locale,
  isCompletedByStudent,
  isWaitingOnStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = useMemo(() => resolveStepPalette(step, 1), [step]);
  const hatch = useMemo(() => resolveStepHatch(step), [step]);
  const foilCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const underSvgRef = useRef<SVGSVGElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const strokeMoveCountRef = useRef(0);

  const [scratchedPct, setScratchedPct] = useState<number>(isCompletedByStudent ? 100 : 0);
  const [revealed, setRevealed] = useState<boolean>(isCompletedByStudent);
  const solved = isCompletedByStudent || revealed;

  const hiddenFormula =
    step.scratchHiddenFormula ||
    step.rightText ||
    step.highlightPhrase ||
    step.caption ||
    step.text ||
    step.title ||
    pickL(locale, 'Core Concept Key', 'Kunci Konsep Inti');
  const hiddenSubnote =
    step.scratchHiddenSubnote ||
    step.reason ||
    pickL(locale, 'Core pattern unlocked underneath the chalk layer!', 'Pola kunci di balik lapisan kapur terbuka!');

  useEffect(() => {
    const svg = underSvgRef.current;
    if (!svg) return;
    svg.innerHTML = '';
    const rc = rough.svg(svg);
    const sketchKind = step.scratchSketchKind || 'arch_bridge';
    if (sketchKind === 'prism_split') {
      svg.appendChild(
        rc.polygon([[56, 108], [116, 20], [176, 108]], {
          stroke: pal.ink,
          fill: pal.wash,
          fillStyle: hatch,
          strokeWidth: 2.2,
          roughness: 1.35,
        })
      );
      svg.appendChild(rc.line(14, 72, 82, 72, { stroke: '#0F172A', strokeWidth: 2.2, roughness: 1.2 }));
      svg.appendChild(rc.line(152, 56, 224, 36, { stroke: pal.ink, strokeWidth: 2.4, roughness: 1.3 }));
      svg.appendChild(rc.line(154, 74, 224, 74, { stroke: pal.accent, strokeWidth: 2.4, roughness: 1.3 }));
      svg.appendChild(rc.line(152, 90, 224, 108, { stroke: '#15803D', strokeWidth: 2.4, roughness: 1.3 }));
    } else if (sketchKind === 'venn_core') {
      svg.appendChild(
        rc.circle(96, 68, 76, { stroke: pal.ink, fill: pal.wash, fillStyle: 'hachure', roughness: 1.3 })
      );
      svg.appendChild(
        rc.circle(144, 68, 76, { stroke: pal.accent, fill: pal.accentWash, fillStyle: 'cross-hatch', roughness: 1.3 })
      );
    } else {
      svg.appendChild(
        rc.arc(120, 98, 168, 104, Math.PI, Math.PI * 2, false, {
          stroke: pal.ink,
          strokeWidth: 2.8,
          roughness: 1.4,
        })
      );
      svg.appendChild(
        rc.circle(38, 98, 22, { stroke: pal.ink, fill: pal.wash, fillStyle: hatch, roughness: 1.3 })
      );
      svg.appendChild(
        rc.circle(202, 98, 24, { stroke: pal.accent, fill: pal.accentWash, fillStyle: 'cross-hatch', roughness: 1.3 })
      );
    }
    animateRoughScratchPaths(svg);
  }, [step.id, step.scratchSketchKind, pal, hatch]);

  useEffect(() => {
    const cv = foilCanvasRef.current;
    if (!cv || solved) return;
    const w = 460;
    const h = 156;
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, pal.foilA);
    grad.addColorStop(1, pal.foilB);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 18);
    ctx.fill();

    try {
      const rCanvas = rough.canvas(cv);
      rCanvas.rectangle(8, 8, w - 16, h - 16, {
        stroke: 'rgba(255,255,255,0.36)',
        fill: 'rgba(255,255,255,0.1)',
        fillStyle: 'hachure',
        hachureGap: 12,
        roughness: 1.4,
        strokeWidth: 1.4,
      });
    } catch {}

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 14.5px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      pickL(locale, 'RUB HERE WITH FINGER / CURSOR', 'GOSOK KARTU INI DENGAN JARI / KURSOR', 'ขูดตรงนี้ด้วยนิ้วหรือเมาส์'),
      w / 2,
      h / 2 - 6
    );
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    const clue = String(
      step.scratchClueHeader ||
        pickL(locale, 'Predict first, then swipe once to reveal!', 'Tebak dulu, lalu usap untuk membuktikan!')
    ).slice(0, 56);
    ctx.fillText(clue, w / 2, h / 2 + 18);
  }, [step.id, pal, locale, solved, step.scratchClueHeader]);

  const finishReveal = (how: string) => {
    if (solved) return;
    setRevealed(true);
    setScratchedPct(100);
    const praise =
      step.successVoiceFeedback ||
      pickL(
        locale,
        `Revealed! Look at "${hiddenFormula}" sketched right underneath.`,
        `Terbuka! Lihat pola kunci "${hiddenFormula}" yang tergambar jelas di baliknya.`
      );
    onInteractionResult({
      stepId: step.id,
      isCorrect: true,
      userAnswer: how,
      expectedAnswer: hiddenFormula,
      feedbackToSpeak: praise,
    });
  };

  const scratchAtClientPoint = (clientX: number, clientY: number) => {
    const cv = foilCanvasRef.current;
    if (!cv || solved) return;
    const rect = cv.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((clientX - rect.left) / rect.width) * cv.width;
    const y = ((clientY - rect.top) / rect.height) * cv.height;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 52;
    ctx.beginPath();
    if (lastPtRef.current) {
      ctx.moveTo(lastPtRef.current.x, lastPtRef.current.y);
      ctx.lineTo(x, y);
    } else {
      ctx.arc(x, y, 26, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 10, y - 6, 16, 0, Math.PI * 2);
    ctx.fill();
    lastPtRef.current = { x, y };

    strokeMoveCountRef.current += 1;
    if (strokeMoveCountRef.current === 1 || strokeMoveCountRef.current % 2 === 0) {
      try {
        const img = ctx.getImageData(32, 18, cv.width - 64, cv.height - 36).data;
        let transparent = 0;
        const sampledTotal = Math.max(1, Math.floor(img.length / 16));
        for (let i = 3; i < img.length; i += 16) {
          if (img[i] < 80) transparent += 1;
        }
        const pct = Math.min(100, Math.round((transparent / sampledTotal) * 100));
        setScratchedPct(pct);
        if (pct >= 24 || strokeMoveCountRef.current >= 9) {
          finishReveal(hiddenFormula);
        }
      } catch {
        if (strokeMoveCountRef.current >= 8) finishReveal(hiddenFormula);
      }
    }
  };

  return (
    <div
      data-testid="wb-scratch-reveal-lab"
      data-solved={solved ? '1' : '0'}
      className="py-2 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 pr-1">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: pal.wash, color: pal.ink }}
          >
            {pickL(locale, 'Scratch Ink', 'Gosok Kapur')}
          </span>
          <span className="fz-handwriting-heading text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">
            <HighlightText text={step.title || pickL(locale, 'Scratch & Discover', 'Gosok & Buktikan Intinya')} active />
          </span>
        </div>
        <SkipGateLink show={isWaitingOnStudent && !solved} locale={locale} onSkip={onSkipContinue} />
      </div>

      <div className="relative w-full max-w-[460px] min-h-[156px] rounded-[18px] overflow-hidden select-none border border-[#CBD5E1]/80 bg-white">
        <div
          className={`flex items-center justify-between px-3.5 py-3.5 min-h-[156px] transition-opacity duration-150 ${
            solved || scratchedPct > 0 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundColor: `${pal.wash}66` }}
        >
          <svg ref={underSvgRef} viewBox="0 0 240 128" className="w-[34%] h-[118px] shrink-0 overflow-visible" />
          <div className="flex-1 pl-3 pr-1 space-y-1 min-w-0">
            <div className="fz-handwriting-heading text-lg sm:text-xl font-bold leading-snug break-words" style={{ color: pal.ink }}>
              <MathText text={hiddenFormula} active />
            </div>
            <p className="text-[12.5px] font-semibold text-[#334155] leading-snug break-words">
              <MathText text={hiddenSubnote} active />
            </p>
          </div>
        </div>

        {!solved && (
          <canvas
            ref={foilCanvasRef}
            data-testid="wb-scratch-foil-canvas"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              isDrawingRef.current = true;
              lastPtRef.current = null;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {}
              scratchAtClientPoint(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!isDrawingRef.current) return;
              e.stopPropagation();
              scratchAtClientPoint(e.clientX, e.clientY);
            }}
            onPointerUp={() => {
              isDrawingRef.current = false;
              lastPtRef.current = null;
            }}
            onPointerCancel={() => {
              isDrawingRef.current = false;
              lastPtRef.current = null;
            }}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 text-[12.5px]">
        <span className="font-medium text-[#334155] pl-3 border-l-2 flex-1 min-w-[180px]" style={{ borderColor: pal.ink }}>
          <MathText
            text={
              solved
                ? step.successVoiceFeedback || hiddenSubnote
                : step.socraticPrompt ||
                  pickL(locale, 'Swipe across the chalk card to uncover the answer!', 'Usap kartu kapur di atas dengan jari untuk membuka jawabannya!')
            }
            active
          />
        </span>
        {!solved && (
          <button
            type="button"
            data-testid="wb-scratch-quick-rub-btn"
            onClick={() => finishReveal(hiddenFormula)}
            className="min-h-[44px] min-w-[112px] px-4 py-2 rounded-full text-[12px] font-bold cursor-pointer shrink-0 inline-flex items-center justify-center transition-transform active:scale-95 border"
            style={{ backgroundColor: pal.wash, color: pal.ink, borderColor: `${pal.ink}44` }}
          >
            {scratchedPct > 0 ? `${scratchedPct}% · ` : ''}
            {pickL(locale, 'Reveal Now', 'Buka Cepat')}
          </button>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * MECHANIC 2: BALANCE SEESAW LAB (`balance_seesaw`)
 * ============================================================================ */
export const BalanceSeesawLab: React.FC<MechanicWidgetProps> = ({
  step,
  locale,
  isCompletedByStudent,
  isWaitingOnStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = useMemo(() => resolveStepPalette(step, 2), [step]);
  const hatch = useMemo(() => resolveStepHatch(step), [step]);
  const fulcrumSvgRef = useRef<SVGSVGElement | null>(null);

  const leftFixed = step.seesawLeftFixedLabel || step.text || step.title || pickL(locale, 'Target Rule', 'Sisi Target');
  const targetWeight = typeof step.seesawLeftWeight === 'number' ? step.seesawLeftWeight : 10;
  const rightBaseWeight = typeof step.seesawRightBaseWeight === 'number' ? step.seesawRightBaseWeight : 4;
  const rightFixed = step.seesawRightFixedLabel || (rightBaseWeight > 0 ? `${rightBaseWeight}` : '');

  const trayTokens: SeesawItemToken[] = useMemo(() => {
    if (Array.isArray(step.seesawTokens) && step.seesawTokens.length >= 2) {
      return step.seesawTokens;
    }
    const rightAns = step.rightText || step.highlightPhrase || pickL(locale, 'Balancing Value', 'Nilai Penyeimbang');
    const wrongAns = step.wrongText || pickL(locale, 'Distractor Value', 'Nilai Pengalih');
    const needW = Math.max(1, targetWeight - rightBaseWeight);
    return [
      { id: 't_match', label: rightAns, weight: needW },
      { id: 't_wrong', label: wrongAns, weight: needW + 4 },
    ];
  }, [step.seesawTokens, step.rightText, step.highlightPhrase, step.wrongText, targetWeight, rightBaseWeight, locale]);

  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [localSolved, setLocalSolved] = useState(false);
  const [hintNote, setHintNote] = useState<string>('');
  const solved = isCompletedByStudent || localSolved;

  useEffect(() => {
    const svg = fulcrumSvgRef.current;
    if (!svg) return;
    svg.innerHTML = '';
    const rc = rough.svg(svg);
    svg.appendChild(rc.line(60, 56, 400, 56, { stroke: '#64748B', strokeWidth: 1.8, roughness: 1.4 }));
    svg.appendChild(
      rc.polygon([[230, 8], [198, 56], [262, 56]], {
        stroke: pal.ink,
        fill: pal.wash,
        fillStyle: hatch,
        strokeWidth: 2.3,
        roughness: 1.4,
      })
    );
    svg.appendChild(rc.circle(230, 10, 10, { stroke: pal.accent, fill: pal.accentWash, fillStyle: 'solid' }));
    animateRoughScratchPaths(svg);
  }, [step.id, pal, hatch]);

  const addedWeight = placedIds.reduce((sum, id) => {
    const tok = trayTokens.find((t) => t.id === id);
    return sum + (tok ? tok.weight : 0);
  }, 0);
  const rightTotal = solved ? targetWeight : rightBaseWeight + addedWeight;
  const diff = rightTotal - targetWeight;
  const tiltDeg = Math.max(-12, Math.min(12, diff * 1.9));

  const toggleToken = (tok: SeesawItemToken) => {
    if (solved) return;
    const exists = placedIds.includes(tok.id);
    const hasSingleWinner = trayTokens.some((t) => rightBaseWeight + t.weight === targetWeight);
    const nextIds = exists
      ? placedIds.filter((x) => x !== tok.id)
      : hasSingleWinner
        ? [tok.id]
        : [...placedIds, tok.id];
    setPlacedIds(nextIds);
    const nextSum =
      rightBaseWeight +
      nextIds.reduce((s, id) => s + (trayTokens.find((t) => t.id === id)?.weight || 0), 0);
    if (nextSum === targetWeight) {
      setLocalSolved(true);
      setHintNote('');
      const chosenLabels = nextIds.map((id) => trayTokens.find((t) => t.id === id)?.label || id).join(' + ');
      const praise =
        step.successVoiceFeedback ||
        pickL(
          locale,
          `Balanced at 0 degrees! "${chosenLabels}" brings both sides into exact equilibrium.`,
          `Seimbang sempurna! "${chosenLabels}" membuat sisi kiri dan kanan sama persis.`
        );
      onInteractionResult({
        stepId: step.id,
        isCorrect: true,
        userAnswer: chosenLabels,
        expectedAnswer: String(targetWeight),
        feedbackToSpeak: praise,
      });
    } else if (!exists) {
      const nudge = pickL(
        locale,
        `Still tilted (${nextSum < targetWeight ? 'too light' : 'too heavy'}). Try another block below!`,
        `Masih miring (${nextSum < targetWeight ? 'kurang berat' : 'kelebihan beban'}). Coba ketuk keping lainnya!`
      );
      setHintNote(nudge);
    }
  };

  return (
    <div
      data-testid="wb-balance-seesaw-lab"
      data-solved={solved ? '1' : '0'}
      className="py-2 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 pr-1">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: pal.wash, color: pal.ink }}
          >
            {pickL(locale, 'Equilibrium Scale', 'Timbangan Konsep')}
          </span>
          <span className="fz-handwriting-heading text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">
            <HighlightText text={step.title || pickL(locale, 'Balance the Beam', 'Seimbangkan Kedua Sisi')} active />
          </span>
        </div>
        <SkipGateLink show={isWaitingOnStudent && !solved} locale={locale} onSkip={onSkipContinue} />
      </div>

      <div className="pt-3 pb-1 select-none">
        <div
          style={{
            transform: `rotate(${tiltDeg.toFixed(1)}deg)`,
            transition: 'transform 320ms cubic-bezier(0.23, 1, 0.32, 1)',
            transformOrigin: 'center bottom',
          }}
          className="max-w-[450px] mx-auto"
        >
          <div className="grid grid-cols-11 items-end gap-1.5 px-1 sm:px-3 pb-1.5">
            <div
              className="col-span-5 px-2.5 py-2 rounded-2xl border-2 text-center shadow-2xs min-w-0"
              style={{ borderColor: pal.ink, backgroundColor: pal.wash }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80" style={{ color: pal.ink }}>
                {pickL(locale, 'Target Side', 'Ruas Kiri')}
              </div>
              <div className="fz-handwriting-heading text-base sm:text-lg font-bold text-[#0F172A] break-words">
                <MathText text={leftFixed} active />
              </div>
            </div>

            <div className="col-span-1 flex justify-center pb-2">
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap"
                style={{
                  backgroundColor: diff === 0 ? '#DCFCE7' : '#FEF3C7',
                  color: diff === 0 ? '#15803D' : '#92400E',
                }}
              >
                {diff === 0 ? '=' : diff < 0 ? '‹' : '›'}
              </span>
            </div>

            <div
              className="col-span-5 px-2.5 py-2 rounded-2xl border-2 border-dashed text-center transition-colors min-w-0"
              style={{
                borderColor: diff === 0 ? '#15803D' : pal.accent,
                backgroundColor: diff === 0 ? '#DCFCE7' : pal.accentWash,
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: diff === 0 ? '#15803D' : pal.accent }}>
                {pickL(locale, 'Your Pan', 'Nampanmu')}
              </div>
              <div className="fz-handwriting-heading text-base sm:text-lg font-bold text-[#0F172A] break-words">
                {placedIds.length > 0 ? (
                  <MathText
                    text={[rightFixed, ...placedIds.map((id) => trayTokens.find((t) => t.id === id)?.label || '')]
                      .filter(Boolean)
                      .join(' + ')}
                    active
                  />
                ) : (
                  <span className="text-xs sm:text-sm text-[#64748B]">
                    {rightFixed ? `${rightFixed} + ?` : pickL(locale, 'Tap block below', 'Ketuk keping bawah')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div
            className="h-2.5 mx-2 rounded-full border-2 border-[#0F172A]"
            style={{ backgroundColor: pal.ink }}
          />
        </div>

        <svg ref={fulcrumSvgRef} viewBox="0 0 460 62" className="w-full max-w-[440px] h-[54px] mx-auto -mt-1 block overflow-visible" />
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
        {trayTokens.map((tok, idx) => {
          const active = placedIds.includes(tok.id);
          return (
            <button
              key={tok.id}
              type="button"
              data-testid={`wb-seesaw-token-${idx}`}
              disabled={solved}
              onClick={() => toggleToken(tok)}
              className="min-h-[46px] min-w-[76px] px-4 py-2.5 rounded-2xl border-2 text-[13.5px] font-bold cursor-pointer inline-flex items-center justify-center transition-transform active:scale-95 shadow-2xs"
              style={{
                borderColor: active ? pal.accent : '#94A3B8',
                backgroundColor: active ? pal.accentWash : '#FFFFFF',
                color: '#0F172A',
              }}
            >
              <MathText text={tok.label} active />
            </button>
          );
        })}
      </div>

      <p className="text-[12.5px] font-medium text-[#334155] pl-3 border-l-2" style={{ borderColor: hintNote ? '#D97706' : pal.ink }}>
        <MathText
          text={
            hintNote ||
            (solved
              ? step.successVoiceFeedback || pickL(locale, 'Both sides are in exact equilibrium!', 'Kedua sisi timbangan sudah sejajar!')
              : step.socraticPrompt || pickL(locale, 'Tap a block above to balance the right pan!', 'Ketuk keping di atas untuk menyeimbangkan nampan kanan!'))
          }
          active
        />
      </p>
    </div>
  );
};

/* ============================================================================
 * MECHANIC 3: RESPONSIVE ROUGH.JS ZONE SORTER (`venn_bucket_sorter`)
 * ============================================================================ */
const RoughSketchedZoneCard: React.FC<{
  zone: BucketZoneSpec;
  zoneIdx: number;
  insideChips: BucketSortableChip[];
  strokeColor: string;
  washColor: string;
  hatchStyle: RoughHatchKind;
  disabled: boolean;
  isArmed: boolean;
  onDrop: () => void;
}> = ({ zone, zoneIdx, insideChips, strokeColor, washColor, hatchStyle, disabled, isArmed, onDrop }) => {
  const bgSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = bgSvgRef.current;
    if (!svg) return;
    svg.innerHTML = '';
    const rc = rough.svg(svg);
    svg.appendChild(
      rc.rectangle(4, 4, 212, 86, {
        stroke: strokeColor,
        fill: washColor,
        fillStyle: hatchStyle,
        hachureGap: 10,
        strokeWidth: isArmed ? 2.6 : 2.0,
        roughness: 1.35,
      })
    );
  }, [strokeColor, washColor, hatchStyle, isArmed]);

  return (
    <button
      type="button"
      data-testid={`wb-bucket-zone-${zoneIdx}`}
      disabled={disabled}
      onClick={onDrop}
      className="relative min-h-[88px] w-full rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-transform active:scale-[0.98] overflow-hidden"
    >
      <svg
        ref={bgSvgRef}
        viewBox="0 0 220 94"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      <div className="relative z-10 space-y-0.5 w-full px-1">
        <div className="fz-handwriting-heading text-[16px] sm:text-[17px] font-extrabold text-[#0F172A] leading-snug break-words">
          <MathText text={zone.label} active />
        </div>
        {zone.sublabel && (
          <div className="text-[11px] font-semibold text-[#334155] leading-tight break-words">
            <MathText text={zone.sublabel} active />
          </div>
        )}
        {insideChips.length > 0 && (
          <div className="pt-1.5 flex flex-wrap justify-center gap-1.5">
            {insideChips.map((c) => (
              <span
                key={c.id}
                className="px-2.5 py-0.5 rounded-full bg-white/95 border border-[#15803D] text-[11.5px] font-bold text-[#14532D] shadow-2xs"
              >
                ✓ <MathText text={c.label} active />
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

export const VennBucketSorterLab: React.FC<MechanicWidgetProps> = ({
  step,
  locale,
  isCompletedByStudent,
  isWaitingOnStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = useMemo(() => resolveStepPalette(step, 3), [step]);

  const zones: BucketZoneSpec[] = useMemo(() => {
    if (Array.isArray(step.bucketZones) && step.bucketZones.length >= 2) {
      return step.bucketZones.slice(0, 3);
    }
    return [
      { id: 'z_a', label: step.termA || step.title || pickL(locale, 'Category A', 'Kategori Utama'), sublabel: step.descA || '' },
      { id: 'z_b', label: step.termB || pickL(locale, 'Category B', 'Kategori Kontras'), sublabel: step.descB || '' },
    ];
  }, [step.bucketZones, step.termA, step.descA, step.termB, step.descB, step.title, locale]);

  const chips: BucketSortableChip[] = useMemo(() => {
    if (Array.isArray(step.bucketChips) && step.bucketChips.length >= 2) {
      return step.bucketChips.slice(0, 4);
    }
    const cA = step.rightText || step.text || zones[0].label;
    const cB = step.wrongText || step.caption || zones[1]?.label || zones[0].label;
    return [
      { id: 'c1', label: cA, targetZoneId: zones[0].id },
      { id: 'c2', label: cB, targetZoneId: zones[1]?.id || zones[0].id },
    ];
  }, [step.bucketChips, step.rightText, step.text, step.wrongText, step.caption, zones]);

  const [selectedChipId, setSelectedChipId] = useState<string | null>(chips[0]?.id || null);
  const [placedMap, setPlacedMap] = useState<Record<string, string>>({});
  const [hintMsg, setHintMsg] = useState<string>('');
  const solved = isCompletedByStudent || Object.keys(placedMap).length >= chips.length;

  const zoneStyles: Array<{ s: string; f: string; h: RoughHatchKind }> = [
    { s: pal.ink, f: pal.wash, h: 'hachure' },
    { s: pal.accent, f: pal.accentWash, h: 'cross-hatch' },
    { s: '#15803D', f: '#DCFCE7', h: 'dots' },
  ];

  const dropIntoZone = (zoneId: string) => {
    if (solved) return;
    const activeId = selectedChipId || chips.find((c) => !placedMap[c.id])?.id;
    const chip = chips.find((c) => c.id === activeId);
    if (!chip) return;
    if (chip.targetZoneId === zoneId) {
      const next = { ...placedMap, [chip.id]: zoneId };
      setPlacedMap(next);
      const nextRemaining = chips.find((c) => !next[c.id]);
      setSelectedChipId(nextRemaining?.id || null);
      setHintMsg('');
      if (Object.keys(next).length >= chips.length) {
        const praise =
          step.successVoiceFeedback ||
          pickL(locale, 'Every item landed in its exact conceptual zone!', 'Semua contoh sudah masuk ke zona konsep yang tepat!');
        onInteractionResult({
          stepId: step.id,
          isCorrect: true,
          userAnswer: chips.map((c) => c.label).join(', '),
          expectedAnswer: zones.map((z) => z.label).join(' / '),
          feedbackToSpeak: praise,
        });
      }
    } else {
      const targetZone = zones.find((z) => z.id === chip.targetZoneId);
      const nudge =
        chip.hint ||
        pickL(
          locale,
          `Not that zone: check the meaning of "${chip.label}" and tap the matching sketched box!`,
          `Belum pas di zona itu: perhatikan ciri "${chip.label}", lalu ketuk kotak zona pasangannya!`
        );
      setHintMsg(nudge);
      onInteractionResult({
        stepId: step.id,
        isCorrect: false,
        userAnswer: `${chip.label} -> ${zoneId}`,
        expectedAnswer: `${chip.label} -> ${targetZone?.label || chip.targetZoneId}`,
        feedbackToSpeak: nudge,
      });
    }
  };

  const activeChipId = selectedChipId || chips.find((x) => !placedMap[x.id])?.id || null;

  return (
    <div
      data-testid="wb-venn-bucket-lab"
      data-solved={solved ? '1' : '0'}
      className="py-2 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 pr-1">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: pal.wash, color: pal.ink }}
          >
            {pickL(locale, 'Zone Sorter', 'Sortir Zona')}
          </span>
          <span className="fz-handwriting-heading text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">
            <HighlightText text={step.title || pickL(locale, 'Sort Into Sketched Zones', 'Masukkan ke Zona Sketsa')} active />
          </span>
        </div>
        <SkipGateLink show={isWaitingOnStudent && !solved} locale={locale} onSkip={onSkipContinue} />
      </div>

      {!solved && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((ch, idx) => {
            if (placedMap[ch.id]) return null;
            const isSel = activeChipId === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                data-testid={`wb-bucket-chip-${idx}`}
                onClick={() => setSelectedChipId(ch.id)}
                className="min-h-[44px] min-w-[68px] px-4 py-2 rounded-full text-[13.5px] font-bold cursor-pointer inline-flex items-center justify-center transition-transform active:scale-95 shadow-2xs"
                style={{
                  backgroundColor: isSel ? pal.ink : '#FFFFFF',
                  color: isSel ? '#FFFFFF' : '#0F172A',
                  border: `2px solid ${pal.ink}`,
                }}
              >
                <MathText text={ch.label} active />
              </button>
            );
          })}
        </div>
      )}

      <div
        className={`grid gap-2.5 w-full max-w-[480px] ${
          zones.length >= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
        }`}
      >
        {zones.map((zn, zIdx) => {
          const st = zoneStyles[zIdx % zoneStyles.length];
          const inside = chips.filter((c) => (solved ? c.targetZoneId === zn.id : placedMap[c.id] === zn.id));
          return (
            <RoughSketchedZoneCard
              key={zn.id}
              zone={zn}
              zoneIdx={zIdx}
              insideChips={inside}
              strokeColor={st.s}
              washColor={st.f}
              hatchStyle={st.h}
              disabled={solved}
              isArmed={!solved && Boolean(activeChipId)}
              onDrop={() => dropIntoZone(zn.id)}
            />
          );
        })}
      </div>

      <p className="text-[12.5px] font-medium text-[#334155] pl-3 border-l-2" style={{ borderColor: hintMsg ? '#D97706' : pal.ink }}>
        <MathText
          text={
            hintMsg ||
            (solved
              ? step.successVoiceFeedback || pickL(locale, 'All items sorted cleanly!', 'Semua contoh sudah tersortir rapi!')
              : step.socraticPrompt || pickL(locale, 'Tap a word chip above, then tap its matching sketched zone!', 'Pilih keping kata di atas, lalu ketuk kotak zona yang sesuai!'))
          }
          active
        />
      </p>
    </div>
  );
};

/* ============================================================================
 * MECHANIC 4: BEZIER WIRE NODE CONNECTOR (`wire_node_connector`)
 * ============================================================================ */
export const WireNodeConnectorLab: React.FC<MechanicWidgetProps> = ({
  step,
  locale,
  isCompletedByStudent,
  isWaitingOnStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = useMemo(() => resolveStepPalette(step, 4), [step]);
  const pairs: WirePairSpec[] = useMemo(() => {
    if (Array.isArray(step.wirePairs) && step.wirePairs.length >= 2) {
      return step.wirePairs.slice(0, 4);
    }
    const rightAns = step.rightText || step.text || pickL(locale, 'Natural Expression', 'Ungkapan Alami');
    const wrongAns = step.wrongText || pickL(locale, 'Common Mistake', 'Jebakan Umum');
    return [
      { id: 'w1', leftLabel: pickL(locale, 'Natural ✓', 'Kalimat Alami ✓'), rightLabel: rightAns },
      { id: 'w2', leftLabel: pickL(locale, 'Watch Out ✕', 'Jebakan Umum ✕'), rightLabel: wrongAns },
    ];
  }, [step.wirePairs, step.rightText, step.text, step.wrongText, locale]);

  const rightShuffled = useMemo(() => {
    const arr = [...pairs];
    if (arr.length >= 2) {
      const first = arr.shift()!;
      arr.push(first);
    }
    return arr;
  }, [pairs]);

  const [activeLeftId, setActiveLeftId] = useState<string | null>(pairs[0]?.id || null);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [wrongMsg, setWrongMsg] = useState<string>('');
  const solved = isCompletedByStudent || connectedIds.length >= pairs.length;

  const connectRight = (rightPairId: string) => {
    if (solved) return;
    const leftId = activeLeftId || pairs.find((p) => !connectedIds.includes(p.id))?.id;
    if (!leftId) return;
    const leftPair = pairs.find((p) => p.id === leftId);
    const rightPair = pairs.find((p) => p.id === rightPairId);
    if (!leftPair || !rightPair) return;

    if (leftId === rightPairId) {
      const next = Array.from(new Set([...connectedIds, leftId]));
      setConnectedIds(next);
      setWrongMsg('');
      const rem = pairs.find((p) => !next.includes(p.id));
      setActiveLeftId(rem?.id || null);
      if (next.length >= pairs.length) {
        const praise =
          step.successVoiceFeedback ||
          pickL(locale, 'All concept circuits connected accurately!', 'Semua jalur pasangan konsep sudah tersambung tepat!');
        onInteractionResult({
          stepId: step.id,
          isCorrect: true,
          userAnswer: pairs.map((p) => `${p.leftLabel}->${p.rightLabel}`).join(', '),
          expectedAnswer: 'all_connected',
          feedbackToSpeak: praise,
        });
      }
    } else {
      const nudge = pickL(
        locale,
        `"${leftPair.leftLabel}" doesn't pair with "${rightPair.rightLabel}". Tap its matching right terminal!`,
        `"${leftPair.leftLabel}" belum cocok ke "${rightPair.rightLabel}". Ketuk terminal pasangannya di kanan!`
      );
      setWrongMsg(nudge);
      onInteractionResult({
        stepId: step.id,
        isCorrect: false,
        userAnswer: `${leftPair.leftLabel} -> ${rightPair.rightLabel}`,
        expectedAnswer: `${leftPair.leftLabel} -> ${leftPair.rightLabel}`,
        feedbackToSpeak: nudge,
      });
    }
  };

  const wireColors = [pal.ink, pal.accent, '#15803D', '#7C3AED'];
  const rowStepPx = 56;
  const svgHeight = Math.max(112, pairs.length * rowStepPx);

  return (
    <div
      data-testid="wb-wire-connector-lab"
      data-solved={solved ? '1' : '0'}
      className="py-2 space-y-2.5 w-full max-w-full overflow-x-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 pr-1">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: pal.wash, color: pal.ink }}
          >
            {pickL(locale, 'Ink Circuit', 'Sambung Jalur')}
          </span>
          <span className="fz-handwriting-heading text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">
            <HighlightText text={step.title || pickL(locale, 'Wire Matching Nodes', 'Hubungkan Pasangan Konsep')} active />
          </span>
        </div>
        <SkipGateLink show={isWaitingOnStudent && !solved} locale={locale} onSkip={onSkipContinue} />
      </div>

      <div className="relative grid grid-cols-[1.12fr_26px_0.98fr] sm:grid-cols-[1fr_56px_1fr] items-center gap-1 sm:gap-2 max-w-[496px] py-1">
        <div className="space-y-2 z-10 min-w-0">
          {pairs.map((p, idx) => {
            const done = solved || connectedIds.includes(p.id);
            const isSel = !done && (activeLeftId || pairs.find((x) => !connectedIds.includes(x.id))?.id) === p.id;
            const col = wireColors[idx % wireColors.length];
            return (
              <button
                key={p.id}
                type="button"
                data-testid={`wb-wire-left-${idx}`}
                disabled={done}
                onClick={() => setActiveLeftId(p.id)}
                className="min-h-[48px] w-full px-2.5 sm:px-3 py-2 rounded-2xl border-2 text-left text-[12px] sm:text-[13px] font-bold flex items-center justify-between cursor-pointer transition-transform active:scale-95 shadow-2xs"
                style={{
                  borderColor: done ? col : isSel ? pal.ink : '#CBD5E1',
                  backgroundColor: done ? `${col}18` : isSel ? pal.wash : '#FFFFFF',
                }}
              >
                <span className="leading-snug break-words text-[12px] sm:text-[13px] text-[#0F172A] min-w-0">
                  <MathText text={p.leftLabel} active />
                </span>
                <span
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 ml-1.5"
                  style={{ backgroundColor: done ? col : isSel ? pal.ink : '#94A3B8' }}
                />
              </button>
            );
          })}
        </div>

        <div className="relative pointer-events-none" style={{ height: `${svgHeight}px` }}>
          <svg viewBox={`0 0 80 ${svgHeight}`} className="w-full h-full overflow-visible">
            {pairs.map((p, lIdx) => {
              const done = solved || connectedIds.includes(p.id);
              if (!done) return null;
              const rIdx = rightShuffled.findIndex((r) => r.id === p.id);
              const y1 = 26 + lIdx * rowStepPx;
              const y2 = 26 + rIdx * rowStepPx;
              const col = wireColors[lIdx % wireColors.length];
              return (
                <path
                  key={p.id}
                  d={`M 0 ${y1} C 36 ${y1}, 44 ${y2}, 80 ${y2}`}
                  fill="none"
                  stroke={col}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        </div>

        <div className="space-y-2 z-10 min-w-0">
          {rightShuffled.map((r, rIdx) => {
            const origIdx = pairs.findIndex((p) => p.id === r.id);
            const done = solved || connectedIds.includes(r.id);
            const col = wireColors[origIdx % wireColors.length];
            return (
              <button
                key={r.id}
                type="button"
                data-testid={`wb-wire-right-${rIdx}`}
                disabled={done}
                onClick={() => connectRight(r.id)}
                className="min-h-[48px] w-full px-2.5 sm:px-3 py-2 rounded-2xl border-2 text-left text-[12px] sm:text-[13px] font-bold flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-transform active:scale-95 shadow-2xs"
                style={{
                  borderColor: done ? col : '#CBD5E1',
                  backgroundColor: done ? `${col}18` : '#FFFFFF',
                }}
              >
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: done ? col : '#94A3B8' }} />
                <span className="leading-snug break-words text-[12px] sm:text-[13px] text-[#0F172A] min-w-0">
                  <MathText text={r.rightLabel} active />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[12.5px] font-medium text-[#334155] pl-3 border-l-2" style={{ borderColor: wrongMsg ? '#D97706' : pal.ink }}>
        <MathText
          text={
            wrongMsg ||
            (solved
              ? step.successVoiceFeedback || pickL(locale, 'Every wire is connected!', 'Seluruh kabel konsep sudah terhubung!')
              : step.socraticPrompt || pickL(locale, 'Tap a left node, then tap its matching right terminal!', 'Ketuk titik di kiri, lalu ketuk pasangannya di kanan!'))
          }
          active
        />
      </p>
    </div>
  );
};

/* ============================================================================
 * MECHANIC 5: ROTARY COMPASS / PROTRACTOR DIAL (`rotary_dial_gauge`)
 * ============================================================================ */
export const RotaryDialGaugeLab: React.FC<MechanicWidgetProps> = ({
  step,
  locale,
  isCompletedByStudent,
  isWaitingOnStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = useMemo(() => resolveStepPalette(step, 5), [step]);
  const dialBgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);

  const stops: DialSectorStop[] = useMemo(() => {
    if (Array.isArray(step.dialStops) && step.dialStops.length >= 2) {
      return step.dialStops;
    }
    const lowExpr = step.wrongText || pickL(locale, 'Low Intensity', 'Tingkat Dasar');
    const midExpr = step.text || step.caption || step.title || pickL(locale, 'Mid Intensity', 'Tingkat Menengah');
    const topExpr = step.rightText || step.highlightPhrase || step.title || pickL(locale, 'Peak Target', 'Target Utama');
    return [
      { angleDeg: 28, label: pickL(locale, 'Low', 'Rendah'), expression: lowExpr },
      { angleDeg: 90, label: pickL(locale, 'Mid', 'Sedang'), expression: midExpr },
      { angleDeg: 152, label: pickL(locale, 'High', 'Tinggi'), expression: topExpr },
    ];
  }, [step.dialStops, step.wrongText, step.text, step.caption, step.title, step.rightText, step.highlightPhrase, locale]);

  const targetDeg = typeof step.dialTargetDeg === 'number' ? step.dialTargetDeg : stops[stops.length - 1].angleDeg;
  const initDeg = typeof step.dialInitialDeg === 'number' ? step.dialInitialDeg : stops[0].angleDeg;
  const [deg, setDeg] = useState<number>(isCompletedByStudent ? targetDeg : initDeg);
  const [localSolved, setLocalSolved] = useState(false);
  const solved = isCompletedByStudent || localSolved;

  useEffect(() => {
    const svg = dialBgRef.current;
    if (!svg) return;
    svg.innerHTML = '';
    const rc = rough.svg(svg);
    svg.appendChild(
      rc.arc(210, 128, 192, 192, Math.PI, Math.PI * 2, false, {
        stroke: pal.ink,
        fill: pal.wash,
        fillStyle: 'hachure',
        hachureGap: 10,
        strokeWidth: 2.4,
        roughness: 1.4,
      })
    );
    [28, 60, 90, 120, 152].forEach((d) => {
      const rad = Math.PI + (d / 180) * Math.PI;
      const x1 = 210 + Math.cos(rad) * 84;
      const y1 = 128 + Math.sin(rad) * 84;
      const x2 = 210 + Math.cos(rad) * 98;
      const y2 = 128 + Math.sin(rad) * 98;
      svg.appendChild(rc.line(x1, y1, x2, y2, { stroke: '#334155', strokeWidth: 2 }));
    });
    animateRoughScratchPaths(svg);
  }, [step.id, pal]);

  const activeStop = stops.reduce(
    (best, s) => (Math.abs(s.angleDeg - deg) < Math.abs(best.angleDeg - deg) ? s : best),
    stops[0]
  );

  const selectDegree = (nextAngle: number, chosenStop?: DialSectorStop) => {
    if (solved) return;
    const clamped = Math.max(10, Math.min(170, Math.round(nextAngle)));
    setDeg(clamped);
    if (Math.abs(clamped - targetDeg) <= 18) {
      setDeg(targetDeg);
      setLocalSolved(true);
      const st =
        chosenStop ||
        stops.reduce((best, s) => (Math.abs(s.angleDeg - targetDeg) < Math.abs(best.angleDeg - targetDeg) ? s : best), stops[stops.length - 1]);
      const praise =
        step.successVoiceFeedback ||
        pickL(locale, `Locked onto ${st.label}: "${st.expression}"!`, `Tepat di ${st.label}: "${st.expression}"!`);
      onInteractionResult({
        stepId: step.id,
        isCorrect: true,
        userAnswer: st.label || `${clamped}°`,
        expectedAnswer: `${targetDeg}°`,
        feedbackToSpeak: praise,
      });
    }
  };

  const updateAngleFromPointer = (svgEl: SVGSVGElement, clientX: number, clientY: number) => {
    if (solved) return;
    const rect = svgEl.getBoundingClientRect();
    const sx = ((clientX - rect.left) / Math.max(1, rect.width)) * 420;
    const sy = ((clientY - rect.top) / Math.max(1, rect.height)) * 144;
    const dx = sx - 210;
    const dy = 128 - sy;
    const rawAngle = 180 - (Math.atan2(Math.max(4, dy), dx) * 180) / Math.PI;
    selectDegree(rawAngle);
  };

  const rad = Math.PI + (deg / 180) * Math.PI;
  const tipX = 210 + Math.cos(rad) * 78;
  const tipY = 128 + Math.sin(rad) * 78;

  return (
    <div
      data-testid="wb-rotary-dial-lab"
      data-solved={solved ? '1' : '0'}
      className="py-2 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 pr-1">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: pal.wash, color: pal.ink }}
          >
            {pickL(locale, 'Rotary Dial', 'Kompas Putar')}
          </span>
          <span className="fz-handwriting-heading text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">
            <HighlightText text={step.title || pickL(locale, 'Rotate the Gauge Needle', 'Putar Jarum Derajat')} active />
          </span>
        </div>
        <SkipGateLink show={isWaitingOnStudent && !solved} locale={locale} onSkip={onSkipContinue} />
      </div>

      <div className="relative max-w-[420px] select-none">
        <svg ref={dialBgRef} viewBox="0 0 420 144" className="w-full h-[138px] block overflow-visible pointer-events-none" />
        <svg
          data-testid="wb-rotary-dial-svg"
          viewBox="0 0 420 144"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            draggingRef.current = true;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
            updateAngleFromPointer(e.currentTarget, e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            e.stopPropagation();
            updateAngleFromPointer(e.currentTarget, e.clientX, e.clientY);
          }}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
          className="absolute inset-0 w-full h-[138px] cursor-grab active:cursor-grabbing touch-none overflow-visible"
        >
          <line x1="210" y1="128" x2={tipX} y2={tipY} stroke={pal.accent} strokeWidth="4.2" strokeLinecap="round" />
          <circle cx={tipX} cy={tipY} r="26" fill={pal.accent} fillOpacity="0.14" />
          <circle cx={tipX} cy={tipY} r="11" fill={solved ? '#15803D' : pal.accent} stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="210" cy="128" r="7" fill="#0F172A" />
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {stops.map((st, idx) => {
          const isCurrentStop = Math.abs(st.angleDeg - deg) <= 20;
          return (
            <button
              key={idx}
              type="button"
              data-testid={`wb-dial-stop-${idx}`}
              disabled={solved}
              onClick={() => selectDegree(st.angleDeg, st)}
              className="min-h-[44px] min-w-[76px] px-3.5 py-2 rounded-2xl border-2 text-[12.5px] font-bold cursor-pointer inline-flex items-center justify-center transition-transform active:scale-95 shadow-2xs"
              style={{
                borderColor: isCurrentStop ? pal.accent : '#CBD5E1',
                backgroundColor: isCurrentStop ? pal.accentWash : '#FFFFFF',
                color: '#0F172A',
              }}
            >
              <MathText text={st.label} active />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <span className="fz-handwriting-body text-lg sm:text-xl font-bold text-[#0F172A]">
          <MathText text={activeStop.expression} active />
        </span>
        {activeStop.note && (
          <span className="text-xs font-bold" style={{ color: pal.ink }}>
            <MathText text={activeStop.note} active />
          </span>
        )}
      </div>

      <p className="text-[12.5px] font-medium text-[#334155] pl-3 border-l-2" style={{ borderColor: pal.ink }}>
        <MathText
          text={
            solved
              ? step.successVoiceFeedback || activeStop.expression
              : step.socraticPrompt || pickL(locale, 'Drag the needle or tap a sector button above!', 'Putar jarum kompas atau ketuk tombol sektor di atas!')
          }
          active
        />
      </p>
    </div>
  );
};

/* ============================================================================
 * MECHANIC 6: FRACTION / SECTOR HACHURE SHADER (`fraction_slice_shader`)
 * ============================================================================ */
export const FractionSliceShaderLab: React.FC<MechanicWidgetProps> = ({
  step,
  locale,
  isCompletedByStudent,
  isWaitingOnStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = useMemo(() => resolveStepPalette(step, 6), [step]);
  const total = Math.max(2, Math.min(8, step.sliceTotal || 4));
  const target = Math.max(1, Math.min(total, step.sliceTargetCount || 3));
  const [shaded, setShaded] = useState<number[]>(
    isCompletedByStudent ? Array.from({ length: target }, (_, i) => i) : [0]
  );
  const [localSolved, setLocalSolved] = useState(false);
  const solved = isCompletedByStudent || localSolved;
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.innerHTML = '';
    const rc = rough.svg(svg);
    const cx = 92;
    const cy = 78;
    const r = 64;
    for (let i = 0; i < total; i++) {
      const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / total;
      const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / total;
      const isFilled = shaded.includes(i);
      svg.appendChild(
        rc.arc(cx, cy, r * 2, r * 2, a0, a1, true, {
          stroke: pal.ink,
          fill: isFilled ? pal.accent : '#FFFFFF',
          fillStyle: isFilled ? 'hachure' : 'solid',
          hachureGap: 6,
          strokeWidth: 2,
          roughness: 1.35,
        })
      );
    }
    animateRoughScratchPaths(svg, 24);
  }, [shaded, total, pal]);

  const toggleSlice = (idx: number) => {
    if (solved) return;
    const next = shaded.includes(idx) ? shaded.filter((x) => x !== idx) : [...shaded, idx];
    setShaded(next);
    if (next.length === target) {
      setLocalSolved(true);
      const praise =
        step.successVoiceFeedback ||
        pickL(locale, `Spot on! ${target}/${total} sectors shaded in hachure ink.`, `Tepat! ${target} dari ${total} bagian sudah terarsir penuh.`);
      onInteractionResult({
        stepId: step.id,
        isCorrect: true,
        userAnswer: `${next.length}/${total}`,
        expectedAnswer: `${target}/${total}`,
        feedbackToSpeak: praise,
      });
    }
  };

  return (
    <div
      data-testid="wb-fraction-shader-lab"
      data-solved={solved ? '1' : '0'}
      className="py-2 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 pr-1">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: pal.wash, color: pal.ink }}
          >
            {pickL(locale, 'Ink Shader', 'Arsir Bidang')}
          </span>
          <span className="fz-handwriting-heading text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">
            <HighlightText text={step.title || pickL(locale, 'Tap Sectors to Shade', 'Ketuk Juring untuk Mengarsir')} active />
          </span>
        </div>
        <SkipGateLink show={isWaitingOnStudent && !solved} locale={locale} onSkip={onSkipContinue} />
      </div>

      <div className="flex flex-wrap items-center gap-4 max-w-[460px]">
        <div className="relative w-[184px] h-[156px] shrink-0">
          <svg ref={svgRef} viewBox="0 0 184 156" className="w-full h-full block overflow-visible pointer-events-none" />
          <svg viewBox="0 0 184 156" className="absolute inset-0 w-full h-full">
            {Array.from({ length: total }, (_, i) => {
              const aMid = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / total;
              const bx = 92 + Math.cos(aMid) * 38;
              const by = 78 + Math.sin(aMid) * 38;
              return (
                <circle
                  key={i}
                  data-testid={`wb-slice-sector-${i}`}
                  cx={bx}
                  cy={by}
                  r="26"
                  fill="transparent"
                  onClick={() => toggleSlice(i)}
                  className="cursor-pointer"
                />
              );
            })}
          </svg>
        </div>

        <div className="space-y-2 flex-1 min-w-[140px]">
          <div className="fz-handwriting-heading text-3xl font-extrabold" style={{ color: pal.ink }}>
            <MathText text={`$\\frac{${shaded.length}}{${total}}$`} active />
          </div>
          <div className="text-xs font-bold text-[#475569]">
            {Math.round((shaded.length / total) * 100)}% {step.sliceCaptionUnit || pickL(locale, 'shaded', 'terarsir')}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                type="button"
                data-testid={`wb-slice-btn-${i}`}
                disabled={solved}
                onClick={() => toggleSlice(i)}
                className="min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl text-sm font-bold border-2 cursor-pointer inline-flex items-center justify-center transition-transform active:scale-95"
                style={{
                  borderColor: shaded.includes(i) ? pal.accent : '#CBD5E1',
                  backgroundColor: shaded.includes(i) ? pal.accentWash : '#FFFFFF',
                  color: '#0F172A',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[12.5px] font-medium text-[#334155] pl-3 border-l-2" style={{ borderColor: pal.ink }}>
        <MathText
          text={
            solved
              ? step.successVoiceFeedback || `${target}/${total}`
              : step.socraticPrompt || pickL(locale, `Tap slices or numbers until ${target}/${total} are hatched!`, `Ketuk bagian lingkaran atau nomornya sampai terarsir ${target}/${total}!`)
          }
          active
        />
      </p>
    </div>
  );
};

/* ============================================================================
 * MECHANIC 7: MAGNETIC BLUEPRINT SLOT BUILDER (`magnetic_slot_builder`)
 * ============================================================================ */
export const MagneticSlotBuilderLab: React.FC<MechanicWidgetProps> = ({
  step,
  locale,
  isCompletedByStudent,
  isWaitingOnStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = useMemo(() => resolveStepPalette(step, 7), [step]);
  const targetTokens = useMemo(() => {
    if (Array.isArray(step.magnetTargetTokens) && step.magnetTargetTokens.length >= 2) {
      return step.magnetTargetTokens;
    }
    const rawSource = String(step.rightText || step.text || step.title || '').trim();
    const parts = rawSource.split(/\s*(?:\+|->|→|\|)\s*/).filter(Boolean);
    if (parts.length >= 2) return parts.slice(0, 4);
    const words = rawSource.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return words.slice(0, 5);
    return [pickL(locale, 'Element 1', 'Unsur 1'), pickL(locale, 'Element 2', 'Unsur 2')];
  }, [step.magnetTargetTokens, step.rightText, step.text, step.title, locale]);

  const pool = useMemo(() => {
    const extras = Array.isArray(step.magnetDistractors) ? step.magnetDistractors.slice(0, 2) : [];
    const base = [...targetTokens, ...extras];
    return base.map((label, idx) => ({ id: `m_${idx}_${label}`, label })).reverse();
  }, [targetTokens, step.magnetDistractors]);

  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [wrongPulse, setWrongPulse] = useState<string>('');
  const solved = isCompletedByStudent || pickedIds.length === targetTokens.length;

  const tapTile = (tile: { id: string; label: string }) => {
    if (solved || pickedIds.includes(tile.id)) return;
    const expectedNext = targetTokens[pickedIds.length];
    if (tile.label.trim().toLowerCase() === expectedNext.trim().toLowerCase()) {
      const next = [...pickedIds, tile.id];
      setPickedIds(next);
      setWrongPulse('');
      if (next.length === targetTokens.length) {
        const full = targetTokens.join(' ');
        const praise =
          step.successVoiceFeedback ||
          pickL(locale, `Snapped into place: "${full}"!`, `Tersusun magnetik dengan pas: "${full}"!`);
        onInteractionResult({
          stepId: step.id,
          isCorrect: true,
          userAnswer: full,
          expectedAnswer: full,
          feedbackToSpeak: praise,
        });
      }
    } else {
      const nudge = pickL(
        locale,
        `Slot ${pickedIds.length + 1} needs "${expectedNext}" rather than "${tile.label}".`,
        `Slot ke-${pickedIds.length + 1} membutuhkan unsur "${expectedNext}", bukan "${tile.label}".`
      );
      setWrongPulse(nudge);
      onInteractionResult({
        stepId: step.id,
        isCorrect: false,
        userAnswer: tile.label,
        expectedAnswer: expectedNext,
        feedbackToSpeak: nudge,
      });
    }
  };

  return (
    <div
      data-testid="wb-magnetic-slot-lab"
      data-solved={solved ? '1' : '0'}
      className="py-2 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 pr-1">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: pal.wash, color: pal.ink }}
          >
            {pickL(locale, 'Magnet Rail', 'Rel Magnetik')}
          </span>
          <span className="fz-handwriting-heading text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">
            <HighlightText text={step.title || pickL(locale, 'Snap Into Blueprint Slots', 'Pasang ke Slot Cetak Biru')} active />
          </span>
        </div>
        <SkipGateLink show={isWaitingOnStudent && !solved} locale={locale} onSkip={onSkipContinue} />
      </div>

      <div className="flex flex-wrap items-center gap-2 py-1.5">
        {targetTokens.map((exp, idx) => {
          const filledTile = solved
            ? { id: `done_${idx}`, label: exp }
            : pickedIds[idx]
              ? pool.find((p) => p.id === pickedIds[idx])
              : null;
          const role = step.magnetSlotRoles?.[idx] || `${idx + 1}`;
          return (
            <React.Fragment key={idx}>
              <div
                className="min-w-[74px] px-3 py-2 rounded-2xl border-2 text-center transition-transform duration-200"
                style={{
                  borderStyle: filledTile ? 'solid' : 'dashed',
                  borderColor: filledTile ? pal.ink : '#94A3B8',
                  backgroundColor: filledTile ? pal.wash : 'rgba(255,255,255,0.65)',
                  transform: filledTile ? 'scale(1)' : 'scale(0.97)',
                }}
              >
                <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748B]">{role}</div>
                <div className="fz-handwriting-heading text-base font-bold text-[#0F172A] min-h-[22px]">
                  {filledTile ? <MathText text={filledTile.label} active /> : '?'}
                </div>
              </div>
              {idx < targetTokens.length - 1 && (
                <span className="text-xs font-extrabold text-[#94A3B8]">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {!solved && (
        <div className="flex flex-wrap items-center gap-2.5">
          {pool.map((tile, idx) => {
            if (pickedIds.includes(tile.id)) return null;
            return (
              <button
                key={tile.id}
                type="button"
                data-testid={`wb-magnet-tile-${idx}`}
                onClick={() => tapTile(tile)}
                className="min-h-[46px] min-w-[64px] px-4 py-2.5 rounded-2xl border-2 bg-white text-[13.5px] font-bold text-[#0F172A] cursor-pointer inline-flex items-center justify-center transition-transform active:scale-95 shadow-2xs"
                style={{ borderColor: pal.accent }}
              >
                <MathText text={tile.label} active />
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[12.5px] font-medium text-[#334155] pl-3 border-l-2" style={{ borderColor: wrongPulse ? '#D97706' : pal.ink }}>
        <MathText
          text={
            wrongPulse ||
            (solved
              ? step.successVoiceFeedback || targetTokens.join(' ')
              : step.socraticPrompt || pickL(locale, 'Tap tiles in order to snap them into the blueprint rail!', 'Ketuk keping secara berurutan agar menempel ke slot cetak biru!'))
          }
          active
        />
      </p>
    </div>
  );
};

/* ============================================================================
 * MECHANIC 8: LIVE WAVE / PITCH OSCILLATOR (`wave_pendulum_oscillator`)
 * ============================================================================ */
export const WavePendulumOscillatorLab: React.FC<MechanicWidgetProps> = ({
  step,
  locale,
  isCompletedByStudent,
  isWaitingOnStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = useMemo(() => resolveStepPalette(step, 0), [step]);
  const targetLvl = typeof step.waveTargetLevel === 'number' ? step.waveTargetLevel : 3;
  const initLvl = typeof step.waveInitialLevel === 'number' ? step.waveInitialLevel : 1;
  const [lvl, setLvl] = useState<number>(isCompletedByStudent ? targetLvl : initLvl);
  const [phase, setPhase] = useState<number>(0);
  const [localSolved, setLocalSolved] = useState(false);
  const draggingRef = useRef(false);
  const solved = isCompletedByStudent || localSolved;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setPhase((p) => (p + dt * (1.8 + lvl * 1.1)) % (Math.PI * 2));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [lvl]);

  const pts: string[] = [];
  for (let x = 24; x <= 420; x += 6) {
    const t = (x - 24) / 396;
    const y = 72 - Math.sin(t * Math.PI * 2 * lvl + phase) * (22 + lvl * 5);
    pts.push(`${pts.length === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`);
  }

  const selectWaveLevel = (next: number) => {
    if (solved) return;
    const clamped = Math.max(1, Math.min(4, Math.round(next)));
    setLvl(clamped);
    if (clamped === targetLvl) {
      setLocalSolved(true);
      const praise =
        step.successVoiceFeedback ||
        pickL(locale, `Resonance matched at ${clamped} cycles!`, `Gelombang beresonansi tepat pada frekuensi ${clamped}×!`);
      onInteractionResult({
        stepId: step.id,
        isCorrect: true,
        userAnswer: `${clamped}×`,
        expectedAnswer: `${targetLvl}×`,
        feedbackToSpeak: praise,
      });
    }
  };

  const handleDragWave = (svgEl: SVGSVGElement, clientX: number) => {
    if (solved) return;
    const rect = svgEl.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    selectWaveLevel(1 + ratio * 3);
  };

  const handleX = 24 + ((lvl - 1) / 3) * 396;

  return (
    <div
      data-testid="wb-wave-oscillator-lab"
      data-solved={solved ? '1' : '0'}
      className="py-2 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 pr-1">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: pal.wash, color: pal.ink }}
          >
            {pickL(locale, 'Live Wave', 'Osilator Hidup')}
          </span>
          <span className="fz-handwriting-heading text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">
            <HighlightText text={step.title || pickL(locale, 'Tune the Wave Crest', 'Atur Frekuensi Gelombang')} active />
          </span>
        </div>
        <SkipGateLink show={isWaitingOnStudent && !solved} locale={locale} onSkip={onSkipContinue} />
      </div>

      <svg
        data-testid="wb-wave-svg"
        viewBox="0 0 448 144"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          draggingRef.current = true;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          handleDragWave(e.currentTarget, e.clientX);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          e.stopPropagation();
          handleDragWave(e.currentTarget, e.clientX);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        className="w-full max-w-[448px] h-[132px] cursor-ew-resize touch-none select-none overflow-visible"
      >
        <line x1="20" y1="72" x2="428" y2="72" stroke="#CBD5E1" strokeWidth="1.6" strokeDasharray="5 5" />
        <path d={pts.join(' ')} fill="none" stroke={pal.ink} strokeWidth="3.2" strokeLinecap="round" />
        <circle cx={handleX} cy="72" r="26" fill={pal.accent} fillOpacity="0.15" />
        <circle cx={handleX} cy="72" r="11" fill={solved ? '#15803D' : pal.accent} stroke="#FFFFFF" strokeWidth="2.5" />
        <text x="28" y="24" fontSize="13" fontWeight="700" fill={pal.ink}>
          {step.waveUnitLabel || 'f'} = {lvl}×
        </text>
      </svg>

      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4].map((preset) => (
          <button
            key={preset}
            type="button"
            data-testid={`wb-wave-level-${preset}`}
            disabled={solved}
            onClick={() => selectWaveLevel(preset)}
            className="min-h-[44px] min-w-[60px] px-3.5 py-2 rounded-2xl border-2 text-[13px] font-bold cursor-pointer inline-flex items-center justify-center transition-transform active:scale-95"
            style={{
              borderColor: lvl === preset ? pal.accent : '#CBD5E1',
              backgroundColor: lvl === preset ? pal.accentWash : '#FFFFFF',
              color: '#0F172A',
            }}
          >
            {preset}×
          </button>
        ))}
      </div>

      <p className="text-[12.5px] font-medium text-[#334155] pl-3 border-l-2" style={{ borderColor: pal.ink }}>
        <MathText
          text={
            solved
              ? step.successVoiceFeedback || pickL(locale, 'Wave locked in!', 'Frekuensi gelombang tepat!')
              : step.socraticPrompt || pickL(locale, 'Drag the wave node or tap a frequency button above!', 'Geser titik gelombang atau ketuk tombol frekuensi di atas!')
          }
          active
        />
      </p>
    </div>
  );
};
