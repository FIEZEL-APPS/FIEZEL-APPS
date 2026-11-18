/**
 * features/voice-studio/src/lib/acousticProsodyAnalyzer.ts
 *
 * Real digital-signal-processing (DSP) acoustic & F0 pitch contour analyzer for FIEZEL Voice Studio.
 * Extracts genuine fundamental frequency (F0) trajectories using the YIN Normalized Difference Function
 * + parabolic interpolation on raw 16 kHz PCM buffers, maps speaker-normalized semitone contours onto
 * Chao 5-level tonal space (Mandarin 4 tones + tone sandhi), evaluates Japanese pitch-accent downsteps,
 * and measures English/PTE prosody stress & tail articulation energy — feeding directly into Braincore.
 */

import type { TargetLang } from '../types/voiceCall.ts';

export interface PitchFrameSample {
  tMs: number;
  f0Hz: number;
  rms: number;
  rmsDb: number;
  voiced: boolean;
  confidence: number;
}

export interface SyllableToneContour {
  index: number;
  expectedTone: 1 | 2 | 3 | 4 | 5;
  slopeStPerSec: number;
  startSt: number;
  endSt: number;
  minSt: number;
  meanSt: number;
  matched: boolean;
  score: number;
}

export interface AcousticProsodyAnalysis {
  hasSufficientAudio: boolean;
  voicedFrameCount: number;
  totalFrameCount: number;
  voicedRatio: number;
  f0MedianHz: number;
  f0MinHz: number;
  f0MaxHz: number;
  pitchSpanSemitones: number;
  rmsMeanDb: number;
  energyDynamicDb: number;
  /** Normalized overall acoustic & prosody score in [0, 1] */
  prosodyConfidence: number;
  /** Mandarin 4-tone accuracy in [0, 1] when targetLang === 'zh' */
  toneAccuracy?: number;
  /** Japanese pitch accent contour score in [0, 1] when targetLang === 'ja' */
  pitchAccentScore?: number;
  /** English prosody + articulation contrast score in [0, 1] when targetLang === 'en' */
  englishProsodyScore?: number;
  syllableContours?: SyllableToneContour[];
  /** Non-null when acoustic contour clearly contradicts expected tone/accent/prosody */
  acousticMisconceptionId: string | null;
  canonicalTaxonomyCode: string | null;
  whyFailsId: string | null;
  contourSummary: string;
}

/**
 * YIN F0 estimator on a single mono PCM frame (default 16 kHz, 512 samples = 32 ms).
 * Frequency bounds 75 Hz .. 420 Hz cover adult male, female, and youth speech cleanly.
 */
export function estimateFramePitchYIN(
  frame: Float32Array,
  sampleRate: number = 16000
): Omit<PitchFrameSample, 'tMs'> {
  const N = frame.length;
  if (N < 128) {
    return { f0Hz: 0, rms: 0, rmsDb: -90, voiced: false, confidence: 0 };
  }

  let sumSq = 0;
  for (let i = 0; i < N; i++) {
    const s = frame[i];
    sumSq += s * s;
  }
  const rms = Math.sqrt(sumSq / N);
  const rmsDb = rms > 1e-6 ? 20 * Math.log10(rms) : -90;
  if (rms < 0.012) {
    return { f0Hz: 0, rms, rmsDb, voiced: false, confidence: 0 };
  }

  const maxLag = Math.min(Math.floor(N / 2) - 1, Math.floor(sampleRate / 75));
  const minLag = Math.max(4, Math.floor(sampleRate / 420));
  if (maxLag <= minLag + 2) {
    return { f0Hz: 0, rms, rmsDb, voiced: false, confidence: 0 };
  }

  const diff = new Float32Array(maxLag + 1);
  const windowLen = N - maxLag;
  for (let tau = 1; tau <= maxLag; tau++) {
    let acc = 0;
    for (let j = 0; j < windowLen; j++) {
      const d = frame[j] - frame[j + tau];
      acc += d * d;
    }
    diff[tau] = acc;
  }

  const cmndf = new Float32Array(maxLag + 1);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxLag; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = runningSum > 1e-9 ? (diff[tau] * tau) / runningSum : 1;
  }

  const THRESHOLD = 0.22;
  let bestTau = -1;
  for (let tau = minLag; tau < maxLag; tau++) {
    if (cmndf[tau] < THRESHOLD) {
      while (tau + 1 < maxLag && cmndf[tau + 1] < cmndf[tau]) {
        tau++;
      }
      bestTau = tau;
      break;
    }
  }

  if (bestTau < 0) {
    let minVal = 1;
    let minIdx = -1;
    for (let tau = minLag; tau < maxLag; tau++) {
      if (cmndf[tau] < minVal) {
        minVal = cmndf[tau];
        minIdx = tau;
      }
    }
    if (minVal > 0.36 || minIdx < 0) {
      return { f0Hz: 0, rms, rmsDb, voiced: false, confidence: Math.max(0, 1 - minVal) };
    }
    bestTau = minIdx;
  }

  // Parabolic interpolation for sub-sample frequency precision
  let refinedTau = bestTau;
  if (bestTau > minLag && bestTau < maxLag) {
    const prev = cmndf[bestTau - 1];
    const curr = cmndf[bestTau];
    const next = cmndf[bestTau + 1];
    const denom = 2 * (2 * curr - prev - next);
    if (Math.abs(denom) > 1e-9) {
      const shift = (prev - next) / denom;
      if (Math.abs(shift) <= 1) {
        refinedTau = bestTau + shift;
      }
    }
  }

  const f0Hz = refinedTau > 0 ? sampleRate / refinedTau : 0;
  const minCmndf = cmndf[bestTau];
  const confidence = Math.max(0, Math.min(1, 1 - minCmndf));
  const validFreq = f0Hz >= 75 && f0Hz <= 420 && confidence >= 0.55;

  return {
    f0Hz: validFreq ? Number(f0Hz.toFixed(2)) : 0,
    rms,
    rmsDb: Number(rmsDb.toFixed(1)),
    voiced: validFreq,
    confidence: Number(confidence.toFixed(3)),
  };
}

const TONE_MARK_MAP: Record<string, 1 | 2 | 3 | 4> = {
  'ā': 1, 'ē': 1, 'ī': 1, 'ō': 1, 'ū': 1, 'ǖ': 1,
  'á': 2, 'é': 2, 'í': 2, 'ó': 2, 'ú': 2, 'ǘ': 2,
  'ǎ': 3, 'ě': 3, 'ǐ': 3, 'ǒ': 3, 'ǔ': 3, 'ǚ': 3,
  'à': 4, 'è': 4, 'ì': 4, 'ò': 4, 'ù': 4, 'ǜ': 4,
};

/**
 * Extracts target Mandarin syllable tones (1..5) from Pinyin tone marks, numeric tones (ma1..ma4),
 * or common high-frequency HSK words when only Hanzi is provided, applying 3+3 tone sandhi (3,3 -> 2,3).
 */
export function extractExpectedMandarinTones(
  pinyinOrText: string
): Array<1 | 2 | 3 | 4 | 5> {
  const src = String(pinyinOrText || '').trim().toLowerCase();
  if (!src) return [];

  const commonHanziTones: Record<string, Array<1 | 2 | 3 | 4 | 5>> = {
    '你': [3], '好': [3], '我': [3], '是': [4], '不': [4], '很': [3],
    '吃': [1], '喝': [1], '吗': [5], '的': [5], '了': [5], '想': [3],
    '要': [4], '去': [4], '来': [2], '买': [3], '卖': [4], '问': [4],
    '吻': [3], '妈': [1], '麻': [2], '马': [3], '骂': [4],
    '天': [1], '一': [1], '大': [4], '小': [3], '书': [1], '水': [3],
    '咖啡': [1, 1], '老师': [3, 1], '谢谢': [4, 5], '对不起': [4, 5, 3],
    '什么': [2, 5], '怎么': [3, 5], '多少': [1, 3], '喜欢': [3, 1],
  };

  // First check tone-marked pinyin tokens or numbered pinyin tokens (e.g. "ma1", "ni3 hao3")
  const tokens = src.split(/[\s,.;!?。，！？]+/).filter(Boolean);
  const fromPinyin: Array<1 | 2 | 3 | 4 | 5> = [];
  let sawMarkedPinyin = false;
  for (const tok of tokens) {
    let foundTone: 1 | 2 | 3 | 4 | 5 | null = null;
    for (const ch of tok) {
      if (TONE_MARK_MAP[ch]) {
        foundTone = TONE_MARK_MAP[ch];
        sawMarkedPinyin = true;
        break;
      }
    }
    if (!foundTone) {
      const numM = /[a-züv]+([1-5])$/i.exec(tok);
      if (numM) {
        foundTone = Number(numM[1]) as 1 | 2 | 3 | 4 | 5;
        sawMarkedPinyin = true;
      }
    }
    if (foundTone) fromPinyin.push(foundTone);
  }

  let tones: Array<1 | 2 | 3 | 4 | 5> = sawMarkedPinyin ? fromPinyin : [];

  if (tones.length === 0) {
    // Extract from known Hanzi tokens greedily (2-char -> 1-char)
    const chars = Array.from(src.replace(/[^\u4e00-\u9faf]/g, ''));
    let i = 0;
    while (i < chars.length) {
      const two = i + 1 < chars.length ? chars[i] + chars[i + 1] : '';
      const three = i + 2 < chars.length ? two + chars[i + 2] : '';
      if (three && commonHanziTones[three]) {
        tones.push(...commonHanziTones[three]);
        i += 3;
      } else if (two && commonHanziTones[two]) {
        tones.push(...commonHanziTones[two]);
        i += 2;
      } else if (commonHanziTones[chars[i]]) {
        tones.push(...commonHanziTones[chars[i]]);
        i += 1;
      } else {
        i += 1;
      }
    }
  }

  // Apply standard Mandarin 3rd-tone sandhi: sequential 3,3 -> 2,3
  for (let i = 0; i < tones.length - 1; i++) {
    if (tones[i] === 3 && tones[i + 1] === 3) {
      tones[i] = 2;
    }
  }
  return tones;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function linearSlopePerSec(points: Array<{ tSec: number; st: number }>): number {
  if (points.length < 2) return 0;
  const n = points.length;
  let sumT = 0;
  let sumY = 0;
  for (const p of points) {
    sumT += p.tSec;
    sumY += p.st;
  }
  const meanT = sumT / n;
  const meanY = sumY / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    const dt = p.tSec - meanT;
    num += dt * (p.st - meanY);
    den += dt * dt;
  }
  return den > 1e-6 ? num / den : 0;
}

function scoreMandarinSegmentTone(
  points: Array<{ tSec: number; st: number }>,
  expectedTone: 1 | 2 | 3 | 4 | 5
): { score: number; matched: boolean; slope: number; startSt: number; endSt: number; minSt: number; meanSt: number } {
  if (points.length < 2) {
    return { score: 0.5, matched: true, slope: 0, startSt: 0, endSt: 0, minSt: 0, meanSt: 0 };
  }
  const slope = linearSlopePerSec(points);
  const startSt = points[0].st;
  const endSt = points[points.length - 1].st;
  let minSt = Infinity;
  let sumSt = 0;
  for (const p of points) {
    if (p.st < minSt) minSt = p.st;
    sumSt += p.st;
  }
  const meanSt = sumSt / points.length;
  const midIdx = Math.floor(points.length / 2);
  const dipDepth = (startSt + endSt) / 2 - points[midIdx].st;

  let score = 0.7;
  if (expectedTone === 1) {
    // Tone 1 (55): high & flat (penalize steep rise/fall)
    const flatScore = Math.max(0, 1 - Math.abs(slope) / 14);
    const heightScore = meanSt >= -0.5 ? 1 : Math.max(0.2, 1 + meanSt / 4);
    score = 0.65 * flatScore + 0.35 * heightScore;
  } else if (expectedTone === 2) {
    // Tone 2 (35): clearly rising (slope >= +4 st/s)
    score = slope >= 3 ? Math.min(1, 0.7 + (slope - 3) / 18) : Math.max(0.1, 0.45 + slope / 12);
  } else if (expectedTone === 3) {
    // Tone 3 (214 / half-3rd 21): low valley or downward dip below speaker median
    const lowBonus = meanSt <= -0.8 ? 0.45 : Math.max(0, 0.35 - meanSt * 0.15);
    const dipBonus = minSt <= -1.2 || dipDepth >= 0.8 ? 0.55 : Math.max(0.1, (1 - minSt) * 0.18);
    score = Math.min(1, lowBonus + dipBonus);
  } else if (expectedTone === 4) {
    // Tone 4 (51): sharp falling (slope <= -5 st/s)
    score = slope <= -4 ? Math.min(1, 0.7 + (Math.abs(slope) - 4) / 20) : Math.max(0.08, 0.4 - slope / 12);
  } else {
    score = 0.8;
  }

  const clamped = Math.max(0, Math.min(1, Number(score.toFixed(3))));
  return {
    score: clamped,
    matched: clamped >= 0.52,
    slope: Number(slope.toFixed(2)),
    startSt: Number(startSt.toFixed(2)),
    endSt: Number(endSt.toFixed(2)),
    minSt: Number((minSt === Infinity ? 0 : minSt).toFixed(2)),
    meanSt: Number(meanSt.toFixed(2)),
  };
}

/**
 * Decodes little-endian 16-bit PCM base64 string into [-1, 1] Float32Array samples.
 */
export function decodePcm16Base64ToFloat32(pcmBase64: string): Float32Array {
  const clean = String(pcmBase64 || '').trim();
  if (!clean) return new Float32Array(0);
  let binary = '';
  const nodeBuffer = (globalThis as { Buffer?: { from(input: string, enc: string): { toString(enc: string): string } } }).Buffer;
  if (typeof atob === 'function') {
    binary = atob(clean);
  } else if (nodeBuffer && typeof nodeBuffer.from === 'function') {
    binary = nodeBuffer.from(clean, 'base64').toString('binary');
  } else {
    return new Float32Array(0);
  }
  const sampleCount = Math.floor(binary.length / 2);
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const lo = binary.charCodeAt(i * 2);
    const hi = binary.charCodeAt(i * 2 + 1);
    const signed = ((hi << 8) | lo) << 16 >> 16;
    out[i] = signed / 32768;
  }
  return out;
}

/**
 * Stateful turn-level PCM prosody & F0 contour tracker used inside App.tsx during live/PTT turns.
 */
export function createAcousticProsodyTracker(sampleRate: number = 16000) {
  const FRAME_SIZE = 512;
  const MAX_FRAMES = 2400; // ~76 seconds max per turn
  let residual = new Float32Array(0);
  let frames: PitchFrameSample[] = [];
  let cursorMs = 0;

  const reset = () => {
    residual = new Float32Array(0);
    frames = [];
    cursorMs = 0;
  };

  const pushSamples = (chunk: Float32Array) => {
    if (!chunk || chunk.length === 0 || frames.length >= MAX_FRAMES) return;
    const merged = new Float32Array(residual.length + chunk.length);
    merged.set(residual, 0);
    merged.set(chunk, residual.length);

    let offset = 0;
    const stepMs = (FRAME_SIZE / sampleRate) * 1000;
    while (offset + FRAME_SIZE <= merged.length && frames.length < MAX_FRAMES) {
      const slice = merged.subarray(offset, offset + FRAME_SIZE);
      const est = estimateFramePitchYIN(slice, sampleRate);
      frames.push({
        tMs: Math.round(cursorMs),
        ...est,
      });
      cursorMs += stepMs;
      offset += FRAME_SIZE;
    }
    residual = merged.slice(offset);
  };

  const pushPcm16Base64 = (pcmBase64: string) => {
    const f32 = decodePcm16Base64ToFloat32(pcmBase64);
    if (f32.length > 0) pushSamples(f32);
  };

  const analyzeTurn = (opts: {
    targetLang: TargetLang;
    expectedText?: string;
    transcript?: string;
    expectedAccentPattern?: 'heiban' | 'atamadaka' | 'nakadaka' | 'auto';
  }): AcousticProsodyAnalysis => {
    const totalFrameCount = frames.length;
    const voicedFrames = frames.filter((f) => f.voiced && f.f0Hz > 0);
    const voicedFrameCount = voicedFrames.length;
    const voicedRatio = totalFrameCount > 0 ? Number((voicedFrameCount / totalFrameCount).toFixed(3)) : 0;

    if (voicedFrameCount < 4) {
      return {
        hasSufficientAudio: false,
        voicedFrameCount,
        totalFrameCount,
        voicedRatio,
        f0MedianHz: 0,
        f0MinHz: 0,
        f0MaxHz: 0,
        pitchSpanSemitones: 0,
        rmsMeanDb: -90,
        energyDynamicDb: 0,
        prosodyConfidence: 0.75,
        acousticMisconceptionId: null,
        canonicalTaxonomyCode: null,
        whyFailsId: null,
        contourSummary: 'insufficient_voiced_pcm',
      };
    }

    const f0List = voicedFrames.map((f) => f.f0Hz);
    const rmsDbList = voicedFrames.map((f) => f.rmsDb);
    const f0MedianHz = Number(median(f0List).toFixed(1));
    const f0Sorted = [...f0List].sort((a, b) => a - b);
    const p10Hz = f0Sorted[Math.floor(f0Sorted.length * 0.1)] || f0Sorted[0];
    const p90Hz = f0Sorted[Math.min(f0Sorted.length - 1, Math.floor(f0Sorted.length * 0.9))];
    const f0MinHz = Number(p10Hz.toFixed(1));
    const f0MaxHz = Number(p90Hz.toFixed(1));
    const pitchSpanSemitones = f0MinHz > 0 ? Number((12 * Math.log2(f0MaxHz / f0MinHz)).toFixed(2)) : 0;

    const rmsSorted = [...rmsDbList].sort((a, b) => a - b);
    const rmsMeanDb = Number((rmsDbList.reduce((a, b) => a + b, 0) / rmsDbList.length).toFixed(1));
    const energyDynamicDb = Number(
      Math.max(
        0,
        (rmsSorted[Math.min(rmsSorted.length - 1, Math.floor(rmsSorted.length * 0.9))] || rmsMeanDb) -
          (rmsSorted[Math.floor(rmsSorted.length * 0.2)] || rmsMeanDb)
      ).toFixed(1)
    );

    const semitoneSeries = voicedFrames.map((f) => ({
      tSec: f.tMs / 1000,
      st: 12 * Math.log2(Math.max(50, f.f0Hz) / Math.max(50, f0MedianHz)),
    }));

    // 1) Mandarin 4-Tone Contour Analysis
    if (opts.targetLang === 'zh') {
      const targetTones = extractExpectedMandarinTones(opts.expectedText || opts.transcript || '');
      const syllableContours: SyllableToneContour[] = [];
      let toneAccuracy = 0.85;
      let badIdx = -1;
      let worstTone: SyllableToneContour | null = null;

      if (targetTones.length > 0 && semitoneSeries.length >= targetTones.length * 2) {
        const segCount = Math.min(targetTones.length, Math.floor(semitoneSeries.length / 2));
        const chunkLen = Math.max(2, Math.floor(semitoneSeries.length / segCount));
        let scoreSum = 0;
        for (let k = 0; k < segCount; k++) {
          const start = k * chunkLen;
          const end = k === segCount - 1 ? semitoneSeries.length : (k + 1) * chunkLen;
          const segPoints = semitoneSeries.slice(start, end);
          const evalRes = scoreMandarinSegmentTone(segPoints, targetTones[k]);
          const item: SyllableToneContour = {
            index: k,
            expectedTone: targetTones[k],
            slopeStPerSec: evalRes.slope,
            startSt: evalRes.startSt,
            endSt: evalRes.endSt,
            minSt: evalRes.minSt,
            meanSt: evalRes.meanSt,
            matched: evalRes.matched,
            score: evalRes.score,
          };
          syllableContours.push(item);
          scoreSum += evalRes.score;
          if (!evalRes.matched && (!worstTone || evalRes.score < worstTone.score)) {
            worstTone = item;
            badIdx = k;
          }
        }
        toneAccuracy = Number((scoreSum / segCount).toFixed(3));
      } else {
        // Free-form Mandarin pitch contour dynamism check (monotone flatness = robotic non-tonal contour)
        toneAccuracy = Number(Math.max(0.2, Math.min(0.98, 0.45 + pitchSpanSemitones * 0.09)).toFixed(3));
      }

      const toneFailed =
        (targetTones.length > 0 && toneAccuracy < 0.56) ||
        (pitchSpanSemitones < 1.3 && voicedFrameCount >= 8);

      return {
        hasSufficientAudio: true,
        voicedFrameCount,
        totalFrameCount,
        voicedRatio,
        f0MedianHz,
        f0MinHz,
        f0MaxHz,
        pitchSpanSemitones,
        rmsMeanDb,
        energyDynamicDb,
        prosodyConfidence: toneAccuracy,
        toneAccuracy,
        syllableContours,
        acousticMisconceptionId: toneFailed ? 'pronunciation.mandarin_tone_mismatch' : null,
        canonicalTaxonomyCode: toneFailed ? 'lexical.form_confusion' : null,
        whyFailsId: toneFailed
          ? worstTone
            ? `Kontur nada suku kata ke-${badIdx + 1} (Nada ${worstTone.expectedTone}) meleset: kemiringan nada terbaca ${worstTone.slopeStPerSec} st/detik (akurasi kontur ${Math.round(toneAccuracy * 100)}%).`
            : `Kontur intonasi Mandarin terdengar datar (${pitchSpanSemitones} semitone). Tegaskan ayunan 4 nada (datar-tinggi 55, naik 35, rendah 214, turun tajam 51).`
          : null,
        contourSummary: `zh_f0=${f0MedianHz}Hz span=${pitchSpanSemitones}st toneAcc=${toneAccuracy}`,
      };
    }

    // 2) Japanese Pitch-Accent Contour Analysis
    if (opts.targetLang === 'ja') {
      const half = Math.floor(semitoneSeries.length / 2);
      const firstHalfMean = semitoneSeries.slice(0, half).reduce((a, b) => a + b.st, 0) / Math.max(1, half);
      const secondHalfMean =
        semitoneSeries.slice(half).reduce((a, b) => a + b.st, 0) / Math.max(1, semitoneSeries.length - half);
      const halfDeltaSt = Number((secondHalfMean - firstHalfMean).toFixed(2));
      const pattern = opts.expectedAccentPattern || 'auto';

      let pitchAccentScore = 0.84;
      let jaFailReason: string | null = null;
      if (pattern === 'atamadaka') {
        // Expect H-L drop: first half higher than second half
        pitchAccentScore = halfDeltaSt <= -1.0 ? 0.9 : Math.max(0.25, 0.55 - halfDeltaSt * 0.12);
        if (pitchAccentScore < 0.55) {
          jaFailReason = `Pola aksen Atamadaka (Tinggi->Rendah) belum turun di paruh akhir (${halfDeltaSt >= 0 ? '+' : ''}${halfDeltaSt} st).`;
        }
      } else if (pattern === 'heiban') {
        // Expect L-H rise: stay flat/high after initial rise
        pitchAccentScore = halfDeltaSt >= -0.6 ? 0.9 : Math.max(0.3, 0.65 + halfDeltaSt * 0.12);
        if (pitchAccentScore < 0.55) {
          jaFailReason = `Pola aksen Heiban seharusnya tetap stabil tinggi setelah mora pertama, namun turun ${Math.abs(halfDeltaSt)} st.`;
        }
      } else {
        // Natural Japanese mora pitch modulation (avoid extreme flat robotic monotone on >= 10 voiced frames)
        const naturalMod = Math.max(0.35, Math.min(0.96, 0.48 + pitchSpanSemitones * 0.1));
        pitchAccentScore = Number(naturalMod.toFixed(3));
        if (pitchSpanSemitones < 1.1 && voicedFrameCount >= 10) {
          jaFailReason = `Kontur pitch-accent Jepang terdengar sangat datar (${pitchSpanSemitones} st); bedakan mora tinggi (H) dan rendah (L).`;
        }
      }

      const jaFailed = Boolean(jaFailReason);
      return {
        hasSufficientAudio: true,
        voicedFrameCount,
        totalFrameCount,
        voicedRatio,
        f0MedianHz,
        f0MinHz,
        f0MaxHz,
        pitchSpanSemitones,
        rmsMeanDb,
        energyDynamicDb,
        prosodyConfidence: Number(pitchAccentScore.toFixed(3)),
        pitchAccentScore: Number(pitchAccentScore.toFixed(3)),
        acousticMisconceptionId: jaFailed ? 'pronunciation.japanese_pitch_accent_mismatch' : null,
        canonicalTaxonomyCode: jaFailed ? 'lexical.form_confusion' : null,
        whyFailsId: jaFailReason,
        contourSummary: `ja_f0=${f0MedianHz}Hz span=${pitchSpanSemitones}st delta=${halfDeltaSt}st`,
      };
    }

    // 3) English / PTE Prosody, Stress Contrast & Articulation Energy Analysis
    const stressFactor = Math.min(1, energyDynamicDb / 14);
    const intonationFactor = Math.min(1, pitchSpanSemitones / 4.2);
    const prosodyScore = Number(Math.max(0.25, Math.min(0.98, 0.35 + 0.35 * stressFactor + 0.30 * intonationFactor)).toFixed(3));
    const isFlatProsody = voicedFrameCount >= 12 && pitchSpanSemitones < 1.15 && energyDynamicDb < 4.5;

    return {
      hasSufficientAudio: true,
      voicedFrameCount,
      totalFrameCount,
      voicedRatio,
      f0MedianHz,
      f0MinHz,
      f0MaxHz,
      pitchSpanSemitones,
      rmsMeanDb,
      energyDynamicDb,
      prosodyConfidence: prosodyScore,
      englishProsodyScore: prosodyScore,
      acousticMisconceptionId: isFlatProsody ? 'pronunciation.english_prosody_drop' : null,
      canonicalTaxonomyCode: isFlatProsody ? 'lexical.form_confusion' : null,
      whyFailsId: isFlatProsody
        ? `Intonasi & penekanan kata (word stress) terlalu datar (${pitchSpanSemitones} st, dinamika energi ${energyDynamicDb} dB). Tekankan kata kunci dan konsonan akhir kalimat.`
        : null,
      contourSummary: `en_f0=${f0MedianHz}Hz span=${pitchSpanSemitones}st dyn=${energyDynamicDb}dB`,
    };
  };

  return {
    reset,
    pushSamples,
    pushPcm16Base64,
    analyzeTurn,
    getFrames: () => frames.slice(),
  };
}
