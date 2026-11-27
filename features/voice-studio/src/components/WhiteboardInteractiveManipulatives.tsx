import React, { useEffect, useMemo, useRef, useState } from 'react';
import rough from 'roughjs';
import type {
  LearnerLocale,
  SocraticQuickChoice,
  SocraticSliderStop,
  StepDerivationLine,
  TargetLang,
  WhiteboardStepCommand,
} from '../types/voiceCall';
import { MathText } from './MathText';
import { HighlightText } from './WhiteboardVisualDiagrams';
import { wbPick } from '../lib/i18n';
import {
  animateRoughScratchPaths,
  BalanceSeesawLab,
  FractionSliceShaderLab,
  MagneticSlotBuilderLab,
  resolveStepHatch,
  resolveStepPalette,
  RotaryDialGaugeLab,
  ScratchRevealFoilLab,
  VennBucketSorterLab,
  WavePendulumOscillatorLab,
  WireNodeConnectorLab,
} from './RoughScratchEngine';
import { ExperimentSandboxRouter } from './WhiteboardExperimentSandbox';

export interface SocraticInteractionEvent {
  stepId: string;
  isCorrect: boolean;
  userAnswer: string;
  expectedAnswer: string;
  feedbackToSpeak: string;
}

interface ManipulativeCommonProps {
  step: WhiteboardStepCommand & { id: string };
  locale?: LearnerLocale;
  targetLang?: TargetLang;
  isCompletedByStudent: boolean;
  isWaitingOnStudent: boolean;
  onInteractionResult: (ev: SocraticInteractionEvent) => void;
  onSkipContinue?: () => void;
}

function pickLoc(locale: LearnerLocale | undefined, en: string, id: string, th?: string): string {
  return wbPick(en, id, th || en, locale);
}

/**
 * Inline Socratic Voice / Quick-Input Bar
 */
export const InlineSocraticCheckpointBar: React.FC<{
  stepId: string;
  prompt?: string;
  choices?: SocraticQuickChoice[];
  expectedKeyword?: string;
  successVoiceFeedback?: string;
  accentColor?: string;
  washColor?: string;
  locale?: LearnerLocale;
  targetLang?: TargetLang;
  isSolved: boolean;
  isWaitingOnStudent: boolean;
  onResult: (ev: SocraticInteractionEvent) => void;
  onSkipContinue?: () => void;
}> = ({
  stepId,
  prompt,
  choices,
  expectedKeyword,
  successVoiceFeedback,
  accentColor = '#1D4ED8',
  washColor = '#DBEAFE',
  locale,
  targetLang,
  isSolved,
  isWaitingOnStudent,
  onResult,
  onSkipContinue,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [feedbackNote, setFeedbackNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [typedReply, setTypedReply] = useState('');
  const recRef = useRef<any>(null);

  if (!prompt && (!choices || choices.length === 0)) return null;

  const evaluateFreeResponse = (raw: string) => {
    const clean = String(raw || '').trim();
    if (!clean) return;
    const norm = clean.toLowerCase();
    let matchedChoice: SocraticQuickChoice | undefined;
    if (choices && choices.length > 0) {
      matchedChoice = choices.find((c) => {
        const cl = c.label.toLowerCase().trim();
        return norm === cl || (cl.length >= 2 && norm.includes(cl)) || (norm.length >= 2 && cl.includes(norm));
      });
    }
    const expNorm = String(expectedKeyword || '').toLowerCase().trim();
    const isOk = matchedChoice
      ? matchedChoice.isCorrect
      : expNorm
        ? norm.includes(expNorm) || expNorm.includes(norm)
        : clean.split(/\s+/).length >= 1;

    const rightLabel =
      choices?.find((c) => c.isCorrect)?.label || expectedKeyword || clean;

    if (isOk) {
      const praise =
        successVoiceFeedback ||
        pickLoc(
          locale,
          `Spot on! "${rightLabel}" fits the core logic. Let's continue.`,
          `Tepat! "${rightLabel}" sudah pas dengan logikanya. Kita lanjut ya.`,
          `ถูกต้อง! "${rightLabel}" ตรงตามหลักการเลย ไปต่อกันนะ`
        );
      setFeedbackNote({ ok: true, text: praise });
      onResult({
        stepId,
        isCorrect: true,
        userAnswer: clean,
        expectedAnswer: rightLabel,
        feedbackToSpeak: praise,
      });
    } else {
      const hint =
        matchedChoice?.socraticHint ||
        pickLoc(
          locale,
          `Almost! Check the pattern on the board before picking "${clean}", then try once more.`,
          `Hampir! Perhatikan lagi pola di sketsa atas untuk "${clean}", lalu coba sekali lagi.`,
          `เกือบถูกแล้ว ลองสังเกตจุดสำคัญบนกระดานอีกครั้งนะ!`
        );
      setFeedbackNote({ ok: false, text: hint });
      onResult({
        stepId,
        isCorrect: false,
        userAnswer: clean,
        expectedAnswer: rightLabel,
        feedbackToSpeak: hint,
      });
    }
  };

  const toggleQuickVoice = () => {
    const SR =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    if (!SR) return;
    if (isListening && recRef.current) {
      try {
        recRef.current.stop();
      } catch {}
      setIsListening(false);
      return;
    }
    try {
      const rec = new SR();
      const locCode = String(locale || 'id').toLowerCase().split(/[-_]/)[0];
      rec.lang =
        targetLang === 'ja'
          ? 'ja-JP'
          : targetLang === 'zh'
            ? 'zh-CN'
            : locCode === 'id'
              ? 'id-ID'
              : 'en-US';
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (ev: any) => {
        const transcript = String(ev?.results?.[0]?.[0]?.transcript || '').trim();
        if (transcript) {
          setTypedReply(transcript);
          evaluateFreeResponse(transcript);
        }
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recRef.current = rec;
      setIsListening(true);
      rec.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div
      data-testid="wb-socratic-checkpoint-bar"
      data-solved={isSolved ? '1' : '0'}
      data-waiting={isWaitingOnStudent ? '1' : '0'}
      className="mt-3 pl-3.5 border-l-2 transition-colors rounded-r-2xl py-2 pr-2.5"
      style={{
        borderColor: isSolved ? '#15803D' : accentColor,
        backgroundColor: isWaitingOnStudent && !isSolved ? `${washColor}66` : 'transparent',
      }}
    >
      {prompt && (
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13.5px] sm:text-[14px] font-semibold text-[#0F172A] leading-snug pt-1">
            <span
              className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
              style={{ backgroundColor: accentColor }}
            />
            <MathText text={prompt} active />
          </p>
          {isWaitingOnStudent && !isSolved && onSkipContinue && (
            <button
              type="button"
              data-testid="wb-socratic-skip-btn"
              onClick={onSkipContinue}
              className="min-h-[40px] min-w-[64px] px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white border border-[#E2E8F0] text-[11.5px] font-bold text-[#475569] hover:text-[#0F172A] whitespace-nowrap cursor-pointer shrink-0 inline-flex items-center justify-center"
            >
              {pickLoc(locale, 'Continue ›', 'Lanjut ›', 'ไปต่อ ›')}
            </button>
          )}
        </div>
      )}

      {choices && choices.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          {choices.map((ch, idx) => {
            const isPicked = selectedIdx === idx;
            const showRight = isSolved && ch.isCorrect;
            const showWrong = isPicked && !ch.isCorrect && !isSolved;
            return (
              <button
                key={idx}
                type="button"
                data-testid={`wb-socratic-choice-${idx}`}
                disabled={isSolved}
                onClick={() => {
                  setSelectedIdx(idx);
                  const rightLabel = choices.find((c) => c.isCorrect)?.label || ch.label;
                  if (ch.isCorrect) {
                    const praise =
                      successVoiceFeedback ||
                      pickLoc(
                        locale,
                        `Exactly right: "${ch.label}". Let's build the next part!`,
                        `Nah tepat: "${ch.label}"! Yuk kita lanjutkan langkah berikutnya.`,
                        `ถูกต้องเลย: "${ch.label}"! ไปขั้นต่อไปกัน`
                      );
                    setFeedbackNote({ ok: true, text: praise });
                    onResult({
                      stepId,
                      isCorrect: true,
                      userAnswer: ch.label,
                      expectedAnswer: rightLabel,
                      feedbackToSpeak: praise,
                    });
                  } else {
                    const nudge =
                      ch.socraticHint ||
                      pickLoc(
                        locale,
                        `Hold on, "${ch.label}" doesn't match the cue yet. Check the anchor above and try the other choice!`,
                        `Tunggu dulu, "${ch.label}" belum klop dengan aturan di atas. Coba pilih bentuk satunya!`,
                        `เดี๋ยวก่อน "${ch.label}" ยังไม่ตรงกับตัวบ่งชี้ด้านบน ลองดูอีกตัวเลือกนะ!`
                      );
                    setFeedbackNote({ ok: false, text: nudge });
                    onResult({
                      stepId,
                      isCorrect: false,
                      userAnswer: ch.label,
                      expectedAnswer: rightLabel,
                      feedbackToSpeak: nudge,
                    });
                  }
                }}
                className={`min-h-[44px] min-w-[68px] px-4 py-2.5 rounded-2xl text-[13.5px] font-bold transition-transform cursor-pointer inline-flex items-center justify-center active:scale-95 shadow-2xs ${
                  showRight
                    ? 'bg-[#15803D] text-white ring-2 ring-[#86EFAC]'
                    : showWrong
                      ? 'bg-[#FEF2F2] text-[#B91C1C] ring-2 ring-[#FCA5A5]'
                      : 'bg-white text-[#0F172A] ring-1 ring-[#94A3B8]'
                }`}
              >
                <MathText text={ch.label} active />
              </button>
            );
          })}

          {!isSolved && (
            <button
              type="button"
              data-testid="wb-socratic-inline-mic"
              onClick={toggleQuickVoice}
              className={`min-h-[44px] min-w-[108px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-[12.5px] font-bold cursor-pointer transition-colors border ${
                isListening
                  ? 'bg-[#DC2626] text-white border-[#DC2626] animate-pulse'
                  : 'bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#334155] border-[#CBD5E1]'
              }`}
              title={pickLoc(locale, 'Answer by voice', 'Jawab langsung pakai suara', 'ตอบด้วยเสียง')}
            >
              <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="5.5" y="1.8" width="5" height="7.5" rx="2.5" />
                <path d="M3.2 7.5a4.8 4.8 0 0 0 9.6 0M8 12.3v2.2" />
              </svg>
              <span>
                {isListening
                  ? pickLoc(locale, 'Listening...', 'Mendengarkan...', 'กำลังฟัง...')
                  : pickLoc(locale, 'Speak', 'Jawab Suara', 'ตอบด้วยเสียง')}
              </span>
            </button>
          )}
        </div>
      )}

      {!choices?.length && !isSolved && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            evaluateFreeResponse(typedReply);
          }}
          className="mt-2.5 flex items-center gap-2 max-w-md"
        >
          <input
            type="text"
            value={typedReply}
            onChange={(e) => setTypedReply(e.target.value)}
            placeholder={pickLoc(locale, 'Type short answer or speak...', 'Ketik singkat atau tekan mic...', 'พิมพ์สั้นๆ หรือพูดตอบ...')}
            className="flex-1 min-h-[44px] px-4 py-2 rounded-2xl bg-white ring-1 ring-[#CBD5E1] text-[13.5px] text-[#0F172A] outline-none"
          />
          <button
            type="submit"
            data-testid="wb-socratic-free-submit"
            className="min-h-[44px] min-w-[68px] px-4 py-2 rounded-2xl text-white text-[13px] font-bold cursor-pointer inline-flex items-center justify-center"
            style={{ backgroundColor: accentColor }}
          >
            {pickLoc(locale, 'Check', 'Cek', 'ตรวจ')}
          </button>
        </form>
      )}

      {feedbackNote && (
        <p
          data-testid="wb-socratic-feedback-note"
          className={`mt-2 text-[12.5px] font-medium leading-snug ${
            feedbackNote.ok ? 'text-[#15803D]' : 'text-[#B45309]'
          }`}
        >
          <MathText text={feedbackNote.text} active />
        </p>
      )}
    </div>
  );
};

/* ============================================================================
 * MECHANIC 9: DIRECT-2D ROUGH.JS DRAGGABLE CANVAS LAB (`direct_2d_canvas_lab`)
 * ============================================================================ */
export const InteractiveSliderLabWidget: React.FC<ManipulativeCommonProps> = ({
  step,
  locale,
  isCompletedByStudent,
  isWaitingOnStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = useMemo(() => resolveStepPalette(step, 0), [step]);
  const hatch = useMemo(() => resolveStepHatch(step), [step]);
  const roughSvgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);

  const domain = step.sliderDomain || 'tense_timeline';
  const min = typeof step.sliderMin === 'number' ? step.sliderMin : 0;
  const max = typeof step.sliderMax === 'number' ? step.sliderMax : 10;
  const stepSize = typeof step.sliderStep === 'number' ? step.sliderStep : 1;
  const initialVal = typeof step.sliderInitial === 'number' ? step.sliderInitial : min;
  const targetVal = typeof step.sliderTarget === 'number' ? step.sliderTarget : max;

  const [val, setVal] = useState<number>(isCompletedByStudent ? targetVal : initialVal);
  const [hasLockedTarget, setHasLockedTarget] = useState(false);
  const solved = isCompletedByStudent || hasLockedTarget;

  const stops: SocraticSliderStop[] = useMemo(() => {
    if (Array.isArray(step.sliderStops) && step.sliderStops.length >= 2) {
      return step.sliderStops;
    }
    const startExpr = step.wrongText || step.text || step.title || pickLoc(locale, 'Initial Form', 'Kondisi Awal');
    const endExpr = step.rightText || step.highlightPhrase || step.caption || step.title || pickLoc(locale, 'Target Form', 'Pola Target');
    return [
      {
        value: min,
        tag: pickLoc(locale, 'Step 1', 'Awal'),
        label: pickLoc(locale, 'Step 1', 'Awal'),
        expression: startExpr,
      },
      {
        value: targetVal,
        tag: pickLoc(locale, 'Target', 'Target'),
        label: pickLoc(locale, 'Target', 'Target'),
        expression: endExpr,
      },
    ];
  }, [step.sliderStops, step.wrongText, step.text, step.title, step.rightText, step.highlightPhrase, step.caption, min, targetVal, locale]);

  const activeStop = useMemo(() => {
    let best = stops[0];
    let bestDist = Infinity;
    for (const s of stops) {
      const d = Math.abs(s.value - val);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }, [stops, val]);

  const frac = Math.max(0, Math.min(1, (val - min) / Math.max(0.0001, max - min)));

  const commitValue = (rawNext: number) => {
    if (solved) return;
    const snapped =
      Math.round((Math.max(min, Math.min(max, rawNext)) - min) / Math.max(0.001, stepSize)) * stepSize + min;
    const nextVal = Number(snapped.toFixed(2));
    setVal(nextVal);
    const span = Math.max(1, max - min);
    if (Math.abs(nextVal - targetVal) <= Math.max(stepSize * 0.65, span * 0.12)) {
      setHasLockedTarget(true);
      setVal(targetVal);
      const targetStop = stops.reduce(
        (best, s) => (Math.abs(s.value - targetVal) < Math.abs(best.value - targetVal) ? s : best),
        stops[stops.length - 1]
      );
      const stopExpr = targetStop?.expression || targetStop?.example || targetStop?.formula || `${targetVal}${step.sliderUnit || ''}`;
      const praise =
        targetStop?.voiceFeedback ||
        targetStop?.spokenHint ||
        step.successVoiceFeedback ||
        pickLoc(
          locale,
          `Nice! Notice how "${stopExpr}" locks in right as you move to the target.`,
          `Mantap! Lihat langsung bagaimana "${stopExpr}" terkunci tepat di sasaran.`
        );
      onInteractionResult({
        stepId: step.id,
        isCorrect: true,
        userAnswer: `${targetVal}${step.sliderUnit || ''}`,
        expectedAnswer: `${targetVal}${step.sliderUnit || ''}`,
        feedbackToSpeak: praise,
      });
    }
  };

  useEffect(() => {
    const svg = roughSvgRef.current;
    if (!svg) return;
    svg.innerHTML = '';
    const rc = rough.svg(svg);

    if (domain === 'math_graph') {
      const fn = step.mathFnType || 'linear';
      if (fn === 'pythagoras') {
        const a = 3;
        const b = Math.max(1, Math.round(val));
        const ox = 88;
        const oy = 148;
        const topY = oy - a * 26;
        const rightX = Math.min(308, ox + b * 26);
        svg.appendChild(rc.line(54, oy, 332, oy, { stroke: '#94A3B8', strokeWidth: 1.5, roughness: 1.2 }));
        svg.appendChild(
          rc.polygon([[ox, topY], [ox, oy], [rightX, oy]], {
            stroke: pal.ink,
            fill: pal.wash,
            fillStyle: hatch,
            hachureGap: 8,
            strokeWidth: 2.5,
            roughness: 1.4,
          })
        );
        svg.appendChild(rc.rectangle(ox, oy - 15, 15, 15, { stroke: pal.accent, strokeWidth: 1.9, roughness: 1.1 }));
      } else if (fn === 'circle_area') {
        const r = Math.max(1, Number(val.toFixed(1)));
        const radPx = Math.min(68, 12 + (r / Math.max(5, max)) * 54);
        svg.appendChild(
          rc.circle(132, 86, radPx * 2, {
            stroke: pal.ink,
            fill: pal.wash,
            fillStyle: hatch,
            hachureGap: 8,
            strokeWidth: 2.4,
            roughness: 1.45,
          })
        );
        svg.appendChild(rc.line(132, 86, 132 + radPx, 86, { stroke: pal.accent, strokeWidth: 2.4, roughness: 1.2 }));
      } else {
        const cx = 156;
        const cy = 94;
        const unit = 18;
        svg.appendChild(rc.line(36, cy, 276, cy, { stroke: '#64748B', strokeWidth: 1.7, roughness: 1.2 }));
        svg.appendChild(rc.line(cx, 14, cx, 168, { stroke: '#64748B', strokeWidth: 1.7, roughness: 1.2 }));
        const curvePts: [number, number][] = [];
        for (let px = -4.5; px <= 5; px += 0.5) {
          const py = fn === 'quadratic' ? 0.35 * px * px - 1.4 : 0.65 * px + 0.5;
          const sx = cx + px * unit;
          const sy = cy - py * unit;
          if (sy >= 12 && sy <= 170) curvePts.push([sx, sy]);
        }
        if (curvePts.length >= 2) {
          svg.appendChild(rc.curve(curvePts, { stroke: pal.ink, strokeWidth: 2.8, roughness: 1.25 }));
        }
      }
    } else if (domain === 'physics_vector') {
      const forceN = Math.max(0, Math.round(val));
      const arrowLen = Math.min(196, 22 + (forceN / Math.max(12, max)) * 170);
      svg.appendChild(rc.line(22, 122, 434, 122, { stroke: '#64748B', strokeWidth: 2, roughness: 1.45 }));
      svg.appendChild(
        rc.rectangle(76, 64, 72, 58, {
          stroke: pal.ink,
          fill: pal.wash,
          fillStyle: hatch,
          hachureGap: 8,
          strokeWidth: 2.4,
          roughness: 1.4,
        })
      );
      const xTip = 152 + arrowLen;
      svg.appendChild(rc.line(152, 93, xTip, 93, { stroke: pal.accent, strokeWidth: 3.4, roughness: 1.25 }));
      svg.appendChild(
        rc.polygon([[xTip + 6, 93], [xTip - 9, 84], [xTip - 9, 102]], {
          stroke: pal.accent,
          fill: pal.accent,
          fillStyle: 'solid',
          roughness: 1.1,
        })
      );
    } else {
      const startX = 56;
      const endX = 404;
      const knobX = startX + frac * (endX - startX);
      svg.appendChild(rc.line(startX, 96, endX, 96, { stroke: '#94A3B8', strokeWidth: 2.1, roughness: 1.35 }));
      svg.appendChild(
        rc.circle(startX, 96, 22, { stroke: pal.ink, fill: pal.wash, fillStyle: 'hachure', roughness: 1.35 })
      );
      svg.appendChild(
        rc.circle(endX, 96, 24, { stroke: pal.accent, fill: pal.accentWash, fillStyle: 'cross-hatch', roughness: 1.35 })
      );
      if (knobX > startX + 8) {
        svg.appendChild(
          rc.curve(
            [
              [startX, 92],
              [(startX + knobX) / 2, Math.max(22, 86 - frac * 54)],
              [knobX, 92],
            ],
            { stroke: pal.ink, strokeWidth: 3.1, roughness: 1.3 }
          )
        );
      }
    }
  }, [val, domain, step.mathFnType, pal, hatch, frac, max]);

  useEffect(() => {
    animateRoughScratchPaths(roughSvgRef.current, 36);
  }, [step.id, step.variantSeed]);

  const mapPointerToDomainVal = (svgEl: SVGSVGElement, clientX: number) => {
    const rect = svgEl.getBoundingClientRect();
    const sx = ((clientX - rect.left) / Math.max(1, rect.width)) * 460;
    if (domain === 'math_graph') {
      const fn = step.mathFnType || 'linear';
      if (fn === 'pythagoras') return min + ((sx - 88) / 208) * (max - min);
      if (fn === 'circle_area') return min + ((sx - 144) / 68) * (max - min);
      return (sx - 156) / 18;
    }
    if (domain === 'physics_vector') {
      return min + ((sx - 160) / 180) * (max - min);
    }
    return min + ((sx - 56) / 348) * (max - min);
  };

  const handlePos = useMemo(() => {
    if (domain === 'math_graph') {
      const fn = step.mathFnType || 'linear';
      if (fn === 'pythagoras') {
        const b = Math.max(1, Math.round(val));
        const c = Math.sqrt(9 + b * b);
        return {
          x: Math.min(308, 88 + b * 26),
          y: 148,
          readoutA: `a = 3, b = ${b}`,
          readoutB: `c = √${9 + b * b} = ${Number.isInteger(c) ? c : c.toFixed(2)}`,
        };
      }
      if (fn === 'circle_area') {
        const r = Math.max(1, Number(val.toFixed(1)));
        const radPx = Math.min(68, 12 + (r / Math.max(5, max)) * 54);
        const area = r % 7 === 0 ? (22 / 7) * r * r : Math.PI * r * r;
        return {
          x: 132 + radPx,
          y: 86,
          readoutA: `r = ${r}${step.sliderUnit || ''}`,
          readoutB: `L ≈ ${Number.isInteger(area) ? area : area.toFixed(1)}`,
        };
      }
      const py = fn === 'quadratic' ? 0.35 * val * val - 1.4 : 0.65 * val + 0.5;
      const mathY = fn === 'quadratic' ? val * val - 2 : 2 * val + 1;
      return {
        x: Math.max(40, Math.min(272, 156 + val * 18)),
        y: Math.max(16, Math.min(166, 94 - py * 18)),
        readoutA: fn === 'quadratic' ? 'y = x² − 2' : 'y = 2x + 1',
        readoutB: `(${val}, ${Number.isInteger(mathY) ? mathY : mathY.toFixed(1)})`,
      };
    }
    if (domain === 'physics_vector') {
      const forceN = Math.max(0, Math.round(val));
      const arrowLen = Math.min(196, 22 + (forceN / Math.max(12, max)) * 170);
      return {
        x: 152 + arrowLen,
        y: 93,
        readoutA: `F = ${forceN} N (m = 2 kg)`,
        readoutB: `a = ${(forceN / 2).toFixed(1)} m/s²`,
      };
    }
    return {
      x: 56 + frac * 348,
      y: 96,
      readoutA: activeStop?.expression || activeStop?.example || '',
      readoutB: activeStop?.subnote || activeStop?.formula || '',
    };
  }, [domain, step.mathFnType, step.sliderUnit, val, frac, activeStop, max]);

  const presetValues = useMemo(() => {
    if (domain === 'tense_timeline' && stops.length >= 2) {
      return stops.slice(0, 4).map((s, idx) => ({
        val: s.value,
        label: s.label || s.tag || `${idx + 1}`,
      }));
    }
    const candidates = Array.from(
      new Set([
        min,
        initialVal,
        targetVal,
        max,
      ].map((n) => Number(n.toFixed(1))))
    ).sort((a, b) => a - b);
    return candidates.slice(0, 4).map((v) => ({
      val: v,
      label: `${v}${step.sliderUnit || ''}`,
    }));
  }, [domain, stops, min, initialVal, targetVal, max, step.sliderUnit]);

  return (
    <div
      data-testid="wb-socratic-slider-lab"
      data-solved={solved ? '1' : '0'}
      className="py-2 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: pal.wash, color: pal.ink }}
          >
            {pickLoc(locale, 'Direct Sketch Lab', 'Tarik di Sketsa')}
          </span>
          {step.title && (
            <span className="fz-handwriting-heading text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">
              <HighlightText text={step.title} terms={step.highlightTerms} active />
            </span>
          )}
        </div>
        {isWaitingOnStudent && !solved && onSkipContinue && (
          <button
            type="button"
            data-testid="wb-socratic-skip-btn"
            onClick={onSkipContinue}
            className="min-h-[40px] min-w-[64px] px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white border border-[#E2E8F0] text-[11.5px] font-bold text-[#475569] hover:text-[#0F172A] cursor-pointer shrink-0 inline-flex items-center justify-center"
          >
            {pickLoc(locale, 'Continue ›', 'Lanjut ›', 'ไปต่อ ›')}
          </button>
        )}
      </div>

      <div className="relative w-full max-w-[460px] h-[168px] select-none">
        <svg ref={roughSvgRef} viewBox="0 0 460 168" className="w-full h-full block overflow-visible pointer-events-none" />
        <svg
          data-testid="wb-direct-canvas-svg"
          viewBox="0 0 460 168"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            draggingRef.current = true;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
            commitValue(mapPointerToDomainVal(e.currentTarget, e.clientX));
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            e.stopPropagation();
            commitValue(mapPointerToDomainVal(e.currentTarget, e.clientX));
          }}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none overflow-visible"
        >
          {domain === 'tense_timeline' && (
            <>
              <text x="56" y="134" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={pal.ink}>
                {stops[0]?.tag || stops[0]?.label || '1'}
              </text>
              <text x="404" y="134" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={pal.accent}>
                {stops[stops.length - 1]?.tag || stops[stops.length - 1]?.label || 'Target'}
              </text>
            </>
          )}
          {domain === 'physics_vector' && (
            <text x="112" y="98" textAnchor="middle" fontSize="13.5" fontWeight="800" fill="#0F172A">
              2 kg
            </text>
          )}
          {domain !== 'tense_timeline' && (
            <>
              <text x="296" y="64" fontSize="14.5" fontWeight="800" fill="#0F172A">
                {handlePos.readoutA}
              </text>
              <text x="296" y="92" fontSize="14" fontWeight="800" fill={pal.ink}>
                {handlePos.readoutB}
              </text>
            </>
          )}

          {!solved && (
            <circle cx={handlePos.x} cy={handlePos.y} r="26" fill={pal.accent} fillOpacity="0.18" />
          )}
          <circle
            data-testid="wb-direct-drag-puck"
            cx={handlePos.x}
            cy={handlePos.y}
            r="12"
            fill={solved ? '#15803D' : pal.accent}
            stroke="#FFFFFF"
            strokeWidth="2.8"
          />
        </svg>

        <input
          type="range"
          data-testid="wb-socratic-slider-input"
          aria-label={step.sliderLabel || step.title || 'Interactive parameter'}
          min={min}
          max={max}
          step={stepSize}
          value={val}
          onChange={(e) => commitValue(Number(e.target.value))}
          className="sr-only"
        />
      </div>

      {/* One-tap ergonomic preset pills alongside direct 2D drag */}
      <div className="flex flex-wrap items-center gap-2">
        {presetValues.map((pv, idx) => {
          const isCur = Math.abs(val - pv.val) <= Math.max(0.01, stepSize * 0.4);
          return (
            <button
              key={idx}
              type="button"
              data-testid={`wb-slider-preset-${idx}`}
              disabled={solved}
              onClick={() => commitValue(pv.val)}
              className="min-h-[44px] min-w-[68px] px-3.5 py-2 rounded-2xl border-2 text-[12.5px] font-bold cursor-pointer inline-flex items-center justify-center transition-transform active:scale-95 shadow-2xs"
              style={{
                borderColor: isCur ? pal.accent : '#CBD5E1',
                backgroundColor: isCur ? pal.accentWash : '#FFFFFF',
                color: '#0F172A',
              }}
            >
              <MathText text={pv.label} active />
            </button>
          );
        })}
      </div>

      {domain === 'tense_timeline' && (handlePos.readoutA || handlePos.readoutB) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <div className="fz-handwriting-body text-lg sm:text-xl font-bold text-[#0F172A]">
            <MathText text={handlePos.readoutA} active />
          </div>
          {handlePos.readoutB && (
            <span className="text-xs font-bold" style={{ color: pal.ink }}>
              <MathText text={handlePos.readoutB} active />
            </span>
          )}
        </div>
      )}

      <p className="text-[12.5px] font-medium text-[#334155] pl-3 border-l-2" style={{ borderColor: pal.ink }}>
        <MathText
          text={
            solved
              ? step.successVoiceFeedback ||
                pickLoc(locale, 'Great intuition! Notice how the form locks in.', 'Intuisimu tajam! Kelihatan jelas perubahan polanya.')
              : step.socraticPrompt ||
                pickLoc(locale, 'Drag the handle on the sketch or tap a point above!', 'Tarik titik pada sketsa atau ketuk tombol titik di atas!')
          }
          active
        />
      </p>
    </div>
  );
};

/* ============================================================================
 * MECHANIC 10: ROUGH.JS RED-MARKER SURGICAL STRIKE (`surgical_ink_strike`)
 * ============================================================================ */
const RoughRedSlashBadge: React.FC<{ text: string }> = ({ text }) => {
  const slashRef = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const svg = slashRef.current;
    if (!svg) return;
    svg.innerHTML = '';
    const rc = rough.svg(svg);
    svg.appendChild(rc.line(4, 22, 76, 6, { stroke: '#DC2626', strokeWidth: 3.1, roughness: 1.5 }));
    svg.appendChild(rc.line(6, 7, 74, 23, { stroke: '#B91C1C', strokeWidth: 2.4, roughness: 1.6 }));
    animateRoughScratchPaths(svg, 8);
  }, [text]);

  return (
    <span className="relative inline-flex items-center px-2.5 py-1 min-h-[44px]">
      <span className="fz-handwriting-body text-xl sm:text-2xl text-[#991B1B]/65 select-none">
        <MathText text={text} active />
      </span>
      <svg ref={slashRef} viewBox="0 0 80 28" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" />
    </span>
  );
};

function tokenizeSurgicalText(raw: string): string[] {
  const clean = String(raw || '').replace(/^[✕×✓\s]+/, '').trim();
  if (!clean) return [];
  const spaceSplit = clean.split(/\s+/).filter(Boolean);
  if (spaceSplit.length >= 2) return spaceSplit;
  if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(clean) && clean.length >= 3) {
    const cjkSegs = clean.match(/[\u4e00-\u9faf]+|[\u3040-\u309f]|[\u30a0-\u30ff]+|[a-zA-Z0-9]+/g) || [];
    if (cjkSegs.length >= 2) return cjkSegs.slice(0, 8);
    return Array.from(clean).slice(0, 8);
  }
  return spaceSplit;
}

export const SurgicalStrikeWidget: React.FC<ManipulativeCommonProps> = ({
  step,
  locale,
  isCompletedByStudent,
  isWaitingOnStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = useMemo(() => resolveStepPalette(step, 3), [step]);
  const tokens = useMemo(() => {
    if (Array.isArray(step.strikeTokens) && step.strikeTokens.length >= 2) {
      return step.strikeTokens;
    }
    const parsed = tokenizeSurgicalText(step.wrongText || step.text || '');
    if (parsed.length >= 2) return parsed;
    return [pickLoc(locale, 'FlawedForm', 'BagianSalah'), pickLoc(locale, 'Context', 'Konteks')];
  }, [step.strikeTokens, step.wrongText, step.text, locale]);

  const bugIdx = useMemo(() => {
    if (typeof step.bugTokenIndex === 'number' && step.bugTokenIndex >= 0 && step.bugTokenIndex < tokens.length) {
      return step.bugTokenIndex;
    }
    const rightWords = new Set(
      tokenizeSurgicalText(step.rightText || '').map((t) => t.toLowerCase().replace(/[.,!?。！？]/g, ''))
    );
    const diffIdx = tokens.findIndex(
      (t) => !rightWords.has(t.toLowerCase().replace(/[.,!?。！？]/g, ''))
    );
    return diffIdx >= 0 ? diffIdx : Math.min(1, tokens.length - 1);
  }, [step.bugTokenIndex, tokens, step.rightText]);

  const replacement = useMemo(() => {
    if (step.fixedToken !== undefined) return step.fixedToken;
    const rightArr = tokenizeSurgicalText(step.rightText || '');
    if (rightArr.length === tokens.length && rightArr[bugIdx]) {
      return rightArr[bugIdx];
    }
    if (rightArr.length < tokens.length) {
      return '';
    }
    return step.rightText || '';
  }, [step.fixedToken, step.rightText, tokens, bugIdx]);

  const [struck, setStruck] = useState(false);
  const [wrongTappedIdx, setWrongTappedIdx] = useState<number | null>(null);
  const [nudgeText, setNudgeText] = useState<string>('');
  const solved = isCompletedByStudent || struck;

  return (
    <div
      data-testid="wb-surgical-strike"
      data-solved={solved ? '1' : '0'}
      className="py-2 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: '#FFE4E6', color: '#BE123C' }}
          >
            {pickLoc(locale, 'Red Marker', 'Spidol Koreksi')}
          </span>
          <span className="fz-handwriting-heading text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">
            {step.title || pickLoc(locale, 'Slash the Clash', 'Coret Bagian yang Keliru', 'ขีดฆ่าจุดที่ผิด')}
          </span>
        </div>
        {isWaitingOnStudent && !solved && onSkipContinue && (
          <button
            type="button"
            data-testid="wb-socratic-skip-btn"
            onClick={onSkipContinue}
            className="min-h-[40px] min-w-[64px] px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white border border-[#E2E8F0] text-[11.5px] font-bold text-[#475569] hover:text-[#0F172A] cursor-pointer shrink-0 inline-flex items-center justify-center"
          >
            {pickLoc(locale, 'Continue ›', 'Lanjut ›', 'ไปต่อ ›')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 py-1.5">
        {tokens.map((tok, idx) => {
          const isBug = idx === bugIdx;
          if (solved && isBug) {
            return (
              <span key={idx} className="inline-flex items-center gap-2">
                <RoughRedSlashBadge text={tok} />
                {replacement && replacement !== step.rightText && (
                  <span className="fz-handwriting-body text-xl sm:text-2xl font-bold text-[#15803D] bg-[#DCFCE7] px-3 py-1.5 min-h-[44px] inline-flex items-center rounded-2xl ring-1 ring-[#86EFAC]">
                    <MathText text={replacement} active />
                  </span>
                )}
              </span>
            );
          }

          const isWrongTap = wrongTappedIdx === idx && !solved;
          return (
            <button
              key={idx}
              type="button"
              data-testid={`wb-strike-token-${idx}`}
              disabled={solved}
              onClick={() => {
                if (isBug) {
                  setStruck(true);
                  setWrongTappedIdx(null);
                  const praise =
                    step.successVoiceFeedback ||
                    (step.reason
                      ? `${pickLoc(locale, 'Sharp eye!', 'Tajam!', 'ตาไวมาก!')} ${step.reason}`
                      : pickLoc(
                          locale,
                          `Sharp eye! Crossing out "${tok}" fixes the clash immediately.`,
                          `Tajam! Begitu "${tok}" kita coret dengan spidol merah, susunannya langsung bersih.`
                        ));
                  setNudgeText(praise);
                  onInteractionResult({
                    stepId: step.id,
                    isCorrect: true,
                    userAnswer: tok,
                    expectedAnswer: tokens[bugIdx],
                    feedbackToSpeak: praise,
                  });
                } else {
                  setWrongTappedIdx(idx);
                  const hint =
                    step.wrongTapHint ||
                    pickLoc(
                      locale,
                      `"${tok}" is fine here, check the word or particle right next to it!`,
                      `"${tok}" sudah aman di situ, coba cek kata atau partikel di sebelahnya!`,
                      `"${tok}" วางถูกแล้ว ลองเช็กคำข้างๆ ดูนะ!`
                    );
                  setNudgeText(hint);
                  onInteractionResult({
                    stepId: step.id,
                    isCorrect: false,
                    userAnswer: tok,
                    expectedAnswer: tokens[bugIdx],
                    feedbackToSpeak: hint,
                  });
                }
              }}
              className={`fz-handwriting-body text-xl sm:text-2xl min-h-[44px] min-w-[48px] px-3.5 py-2 rounded-2xl border transition-transform cursor-pointer select-none inline-flex items-center justify-center active:scale-95 ${
                solved
                  ? 'text-[#0F172A] border-transparent font-bold cursor-default'
                  : isWrongTap
                    ? 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B] fz-wb-shake'
                    : 'bg-white/90 border-[#CBD5E1] text-[#0F172A] hover:bg-[#FFE4E6] hover:border-[#FDA4AF] hover:text-[#9F1239] shadow-2xs'
              }`}
            >
              <MathText text={tok} active />
            </button>
          );
        })}
      </div>

      {solved && step.rightText && (
        <div className="flex items-center gap-2 text-[#15803D] fz-handwriting-body text-lg sm:text-xl font-bold">
          <span className="w-5 h-5 rounded-full bg-[#15803D] text-white text-xs flex items-center justify-center shrink-0">
            ✓
          </span>
          <MathText text={step.rightText} active />
        </div>
      )}

      <p
        className="text-[12.5px] font-medium pl-3 border-l-2 text-[#334155]"
        style={{ borderColor: solved ? '#15803D' : pal.ink }}
      >
        <MathText
          text={
            nudgeText ||
            step.socraticPrompt ||
            pickLoc(
              locale,
              'Tap the flawed word chip above to slash it with red ink.',
              'Ketuk langsung keping kata pengganggu di atas untuk mencoretnya dengan spidol merah.'
            )
          }
          active
        />
      </p>
    </div>
  );
};

/* ============================================================================
 * MECHANIC 11: PALETTE-TINTED KATEX CASCADE DERIVATION (`step_derivation`)
 * ============================================================================ */
export const StepByStepDerivationWidget: React.FC<ManipulativeCommonProps> = ({
  step,
  locale,
  targetLang,
  isCompletedByStudent,
  isWaitingOnStudent,
  onInteractionResult,
  onSkipContinue,
}) => {
  const pal = useMemo(() => resolveStepPalette(step, 5), [step]);
  const lines: StepDerivationLine[] = useMemo(() => {
    if (Array.isArray(step.derivationSteps) && step.derivationSteps.length >= 2) {
      const copy = step.derivationSteps.map((ln) => ({ ...ln }));
      if (!copy.some((l) => l.isInteractiveBlank)) {
        const lastIdx = copy.length - 1;
        const lastRaw = String(copy[lastIdx].expr || copy[lastIdx].latex || '').replace(/^\$|\$$/g, '').trim();
        const eqIdx = lastRaw.lastIndexOf('=');
        const ans = eqIdx >= 0 ? lastRaw.slice(eqIdx + 1).trim() : lastRaw;
        const lhs = eqIdx >= 0 ? lastRaw.slice(0, eqIdx + 1).trim() : '';
        const numMatch = ans.match(/-?\d+(?:\.\d+)?/);
        const nVal = numMatch ? Number(numMatch[0]) : NaN;
        const altA = Number.isFinite(nVal) ? ans.replace(numMatch![0], String(nVal + 2)) : `${ans} + 1`;
        const altB = Number.isFinite(nVal) ? ans.replace(numMatch![0], String(Math.max(0, nVal * 2))) : `${ans} / 2`;
        copy[lastIdx] = {
          ...copy[lastIdx],
          expr: lhs ? `${lhs} ?` : '?',
          isInteractiveBlank: true,
          expectedValue: ans || lastRaw,
          choices: Array.from(new Set([ans || lastRaw, altA, altB])).slice(0, 3),
        };
      }
      return copy;
    }
    const mainExpr = step.rightText || step.text || step.highlightPhrase || step.title || 'Langkah Kunci';
    const trapExpr = step.wrongText || pickLoc(locale, 'Incorrect form', 'Bentuk keliru');
    return [
      { expr: step.caption || step.title || pickLoc(locale, 'Given Rule', 'Aturan Dasar'), sideOp: pickLoc(locale, 'Apply', 'Terapkan') },
      {
        expr: '?',
        isInteractiveBlank: true,
        expectedValue: mainExpr,
        choices: [mainExpr, trapExpr],
        hint: step.reason || pickLoc(locale, 'Match the core rule above!', 'Sesuaikan dengan aturan inti di atas!'),
      },
    ];
  }, [step.derivationSteps, step.rightText, step.text, step.highlightPhrase, step.title, step.wrongText, step.caption, step.reason, locale]);

  const [solvedLocal, setSolvedLocal] = useState(false);
  const solved = isCompletedByStudent || solvedLocal;

  const blankLine = lines.find((l) => l.isInteractiveBlank);
  const quickChoices: SocraticQuickChoice[] | undefined = blankLine?.choices?.map((c) => ({
    label: c.includes('$') ? c : /[\\^_]/.test(c) ? `$${c}$` : c,
    isCorrect:
      c.replace(/[$\\\s]+/g, '').toLowerCase() ===
      String(blankLine.expectedValue || blankLine.choices?.[0] || '')
        .replace(/[$\\\s]+/g, '')
        .toLowerCase(),
    socraticHint: blankLine.hint,
  }));

  const formatLineMath = (raw?: string): string => {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (s.includes('$')) return s;
    if (/[=+\-*/÷×^_\\]|\d/.test(s) && s.split(/\s+/).length <= 6) {
      return `$${s}$`;
    }
    return s;
  };

  return (
    <div
      data-testid="wb-step-derivation"
      data-solved={solved ? '1' : '0'}
      className="py-2 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: pal.wash, color: pal.ink }}
          >
            {pickLoc(locale, 'Step Cascade', 'Alur Turunan')}
          </span>
          {step.title && (
            <div className="fz-handwriting-heading text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">
              <HighlightText text={step.title} terms={step.highlightTerms} active />
            </div>
          )}
        </div>
        {!blankLine && isWaitingOnStudent && !solved && onSkipContinue && (
          <button
            type="button"
            data-testid="wb-socratic-skip-btn"
            onClick={onSkipContinue}
            className="min-h-[40px] min-w-[64px] px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white border border-[#E2E8F0] text-[11.5px] font-bold text-[#475569] hover:text-[#0F172A] cursor-pointer shrink-0 inline-flex items-center justify-center"
          >
            {pickLoc(locale, 'Continue ›', 'Lanjut ›', 'ไปต่อ ›')}
          </button>
        )}
      </div>

      <div className="space-y-2.5 pl-1">
        {lines.map((ln, idx) => {
          const isBlankRow = Boolean(ln.isInteractiveBlank);
          const isAfterBlank =
            !solved &&
            lines.findIndex((x) => x.isInteractiveBlank) >= 0 &&
            idx > lines.findIndex((x) => x.isInteractiveBlank);
          if (isAfterBlank) return null;

          const baseRaw = ln.expr || ln.latex || '';
          const filledRaw =
            isBlankRow && solved && ln.expectedValue
              ? baseRaw.includes('?')
                ? baseRaw.replace('?', ln.expectedValue)
                : ln.expectedValue
              : baseRaw;
          const displayExpr = formatLineMath(filledRaw);

          return (
            <div key={idx} className="flex flex-wrap items-center gap-2.5">
              <span
                className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: isBlankRow && !solved ? pal.wash : '#F1F5F9',
                  color: isBlankRow && !solved ? pal.ink : '#475569',
                }}
              >
                {idx + 1}
              </span>
              <div
                className="text-lg sm:text-xl font-bold tracking-tight break-words"
                style={{ color: isBlankRow && solved ? '#15803D' : '#0F172A' }}
              >
                <MathText text={displayExpr} active />
              </div>
              {ln.sideOp && (
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: pal.wash, color: pal.ink }}
                >
                  ↷ <MathText text={ln.sideOp} active />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {blankLine && (
        <InlineSocraticCheckpointBar
          stepId={step.id}
          prompt={
            step.socraticPrompt ||
            pickLoc(
              locale,
              'Your turn: choose the accurate next step!',
              'Giliranmu: pilih hasil langkah berikutnya yang tepat!',
              'ตาคุณแล้ว ขั้นต่อไปได้เท่าไหร่?'
            )
          }
          choices={quickChoices}
          expectedKeyword={blankLine.expectedValue}
          successVoiceFeedback={step.successVoiceFeedback}
          accentColor={pal.ink}
          washColor={pal.wash}
          locale={locale}
          targetLang={targetLang}
          isSolved={solved}
          isWaitingOnStudent={isWaitingOnStudent}
          onSkipContinue={onSkipContinue}
          onResult={(ev) => {
            if (ev.isCorrect) setSolvedLocal(true);
            onInteractionResult(ev);
          }}
        />
      )}
    </div>
  );
};

/* ============================================================================
 * POLYMORPHIC INTERACTIVE DISPATCHER (`PolymorphicInteractiveLab`)
 * ============================================================================ */
export const PolymorphicInteractiveLab: React.FC<ManipulativeCommonProps> = (props) => {
  const m =
    props.step.mechanic ||
    (props.step.kind === 'surgical_strike'
      ? 'surgical_ink_strike'
      : props.step.kind === 'step_derivation'
        ? 'step_derivation'
        : 'direct_2d_canvas_lab');

  switch (m) {
    case 'experiment_sandbox':
      return <ExperimentSandboxRouter {...props} />;
    case 'scratch_reveal':
      return <ScratchRevealFoilLab {...props} />;
    case 'balance_seesaw':
      return <BalanceSeesawLab {...props} />;
    case 'venn_bucket_sorter':
      return <VennBucketSorterLab {...props} />;
    case 'wire_node_connector':
      return <WireNodeConnectorLab {...props} />;
    case 'rotary_dial_gauge':
      return <RotaryDialGaugeLab {...props} />;
    case 'fraction_slice_shader':
      return <FractionSliceShaderLab {...props} />;
    case 'magnetic_slot_builder':
      return <MagneticSlotBuilderLab {...props} />;
    case 'wave_pendulum_oscillator':
      return <WavePendulumOscillatorLab {...props} />;
    case 'surgical_ink_strike':
      return <SurgicalStrikeWidget {...props} />;
    case 'step_derivation':
      return <StepByStepDerivationWidget {...props} />;
    case 'direct_2d_canvas_lab':
    default:
      return <InteractiveSliderLabWidget {...props} />;
  }
};
