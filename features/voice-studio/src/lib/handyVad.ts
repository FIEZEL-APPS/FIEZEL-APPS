/**
 * features/voice-studio/src/lib/handyVad.ts
 *
 * Human-Voice Activity Detection (VAD) ported and adapted from `cjpais/Handy`
 * (`src-tauri/src/audio_toolkit/vad/smoothed.rs` & `audio/visualizer.rs`).
 *
 * Eliminates raw RMS volume triggers so street traffic, passing vehicles, engine rumble,
 * wind gusts, fans, rain, and table knocks NEVER trigger false speech detection or barge-in,
 * while genuine human vocal speech (85-380 Hz F0 + 350-3600 Hz vocal tract formants)
 * is captured with 480ms pre-roll (`prefillFrames`) so leading consonants are never clipped.
 */

export const HANDY_VAD_SAMPLE_RATE = 16000;
export const HANDY_VAD_FRAME_SAMPLES = 512; // 32 ms @ 16 kHz (matches Handy Silero/Visualiser window)
const VOCAL_BUCKETS = 16;
const VOCAL_FREQ_MIN = 400.0;
const VOCAL_FREQ_MAX = 4000.0;
const NOISE_ALPHA = 0.002;
const INITIAL_NOISE_FLOOR_DB = -62.0;

export interface HandyFrameScore {
  score: number;
  isVoice: boolean;
  rms: number;
  vocalToRumble: number;
  spectralFlatness: number;
  pitchCorr: number;
  vocalSnrDb: number;
}

export interface HandyVadProcessResult {
  /** Concatenated 16 kHz mono float32 speech samples (includes pre-roll on onset), or null if noise/silence */
  speechPcm16k: Float32Array | null;
  /** True when SmoothedVad is currently in confirmed human speech (including hangover) */
  inSpeech: boolean;
  /** True on the exact chunk where speech onset was newly confirmed */
  speechStarted: boolean;
  /** True on the exact chunk where speech ended after hangover expired */
  speechEnded: boolean;
  /** Highest human-speech confidence score observed in this chunk [0, 1] */
  maxScore: number;
  /** Last frame diagnostic metrics */
  lastMetrics: HandyFrameScore | null;
}

export interface HandyVadOptions {
  /** Speech probability threshold [0, 1] (default 0.50) */
  threshold?: number;
  /** High-confidence threshold required during AI playback barge-in (default 0.62) */
  bargeInThreshold?: number;
  /** Pre-roll buffer frames (32ms each). Default 15 (~480 ms, matches Handy VAD_PREFILL) */
  prefillFrames?: number;
  /** Post-speech hangover frames (32ms each). Default 16 (~512 ms, matches Handy VAD_HANGOVER) */
  hangoverFrames?: number;
  /** Consecutive voiced frames required to confirm onset (default 3 = 96 ms) */
  onsetFrames?: number;
  /** Consecutive high-confidence voiced frames required for barge-in (default 4 = 128 ms) */
  bargeInOnsetFrames?: number;
}

interface BufferedFrame {
  samples: Float32Array;
  emitted: boolean;
  voiced: boolean;
}

// Precompute 512-point Hann window & bit-reversal table once
const HANN_WINDOW = new Float32Array(HANDY_VAD_FRAME_SAMPLES);
const BIT_REV = new Uint16Array(HANDY_VAD_FRAME_SAMPLES);
(function initTables() {
  const N = HANDY_VAD_FRAME_SAMPLES;
  for (let i = 0; i < N; i++) {
    HANN_WINDOW[i] = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / N));
    let x = i;
    let y = 0;
    for (let b = 0; b < 9; b++) {
      y = (y << 1) | (x & 1);
      x >>= 1;
    }
    BIT_REV[i] = y;
  }
})();

// Precompute 16 log-spaced vocal bucket bin ranges (400 Hz - 4000 Hz @ 16 kHz, 512 FFT)
// Exact formula from cjpais/Handy `AudioVisualiser::new`
const BUCKET_RANGES: Array<[number, number]> = (function initBuckets() {
  const ranges: Array<[number, number]> = [];
  const nyquist = HANDY_VAD_SAMPLE_RATE / 2;
  const fMin = Math.min(VOCAL_FREQ_MIN, nyquist);
  const fMax = Math.min(VOCAL_FREQ_MAX, nyquist);
  for (let b = 0; b < VOCAL_BUCKETS; b++) {
    const logStart = Math.pow(b / VOCAL_BUCKETS, 2);
    const logEnd = Math.pow((b + 1) / VOCAL_BUCKETS, 2);
    const startHz = fMin + (fMax - fMin) * logStart;
    const endHz = fMin + (fMax - fMin) * logEnd;
    let startBin = Math.floor((startHz * HANDY_VAD_FRAME_SAMPLES) / HANDY_VAD_SAMPLE_RATE);
    let endBin = Math.floor((endHz * HANDY_VAD_FRAME_SAMPLES) / HANDY_VAD_SAMPLE_RATE);
    if (endBin <= startBin) endBin = startBin + 1;
    startBin = Math.min(startBin, HANDY_VAD_FRAME_SAMPLES / 2);
    endBin = Math.min(endBin, HANDY_VAD_FRAME_SAMPLES / 2);
    ranges.push([startBin, endBin]);
  }
  return ranges;
})();

function fft512InPlace(re: Float32Array, im: Float32Array): void {
  const N = HANDY_VAD_FRAME_SAMPLES;
  for (let i = 0; i < N; i++) {
    const j = BIT_REV[i];
    if (j > i) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1;
    const ang = (-2.0 * Math.PI) / len;
    const wLenRe = Math.cos(ang);
    const wLenIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let wRe = 1.0;
      let wIm = 0.0;
      for (let k = 0; k < half; k++) {
        const uIdx = i + k;
        const vIdx = uIdx + half;
        const vr = re[vIdx] * wRe - im[vIdx] * wIm;
        const vi = re[vIdx] * wIm + im[vIdx] * wRe;
        re[vIdx] = re[uIdx] - vr;
        im[vIdx] = im[uIdx] - vi;
        re[uIdx] += vr;
        im[uIdx] += vi;
        const nextWRe = wRe * wLenRe - wIm * wLenIm;
        wIm = wRe * wLenIm + wIm * wLenRe;
        wRe = nextWRe;
      }
    }
  }
}

export class HandyHumanVad {
  private threshold: number;
  private bargeInThreshold: number;
  private prefillFrames: number;
  private hangoverFrames: number;
  private onsetFrames: number;
  private bargeInOnsetFrames: number;

  private noiseFloor: Float32Array;
  private fftRe: Float32Array;
  private fftIm: Float32Array;
  private powSpec: Float32Array;
  private centered: Float32Array;
  private hpFiltered: Float32Array;
  private bucketSnrs: Float32Array;

  private resampleCarry: Float32Array;
  private resampleCarryLen: number;

  private frameBuffer: BufferedFrame[];
  private hangoverCounter: number;
  private onsetCounter: number;
  private inSpeech: boolean;

  constructor(opts: HandyVadOptions = {}) {
    this.threshold = typeof opts.threshold === 'number' ? opts.threshold : 0.50;
    this.bargeInThreshold = typeof opts.bargeInThreshold === 'number' ? opts.bargeInThreshold : 0.62;
    this.prefillFrames = typeof opts.prefillFrames === 'number' ? opts.prefillFrames : 15;
    this.hangoverFrames = typeof opts.hangoverFrames === 'number' ? opts.hangoverFrames : 16;
    this.onsetFrames = typeof opts.onsetFrames === 'number' ? opts.onsetFrames : 3;
    this.bargeInOnsetFrames = typeof opts.bargeInOnsetFrames === 'number' ? opts.bargeInOnsetFrames : 4;

    this.noiseFloor = new Float32Array(VOCAL_BUCKETS);
    this.noiseFloor.fill(INITIAL_NOISE_FLOOR_DB);
    this.fftRe = new Float32Array(HANDY_VAD_FRAME_SAMPLES);
    this.fftIm = new Float32Array(HANDY_VAD_FRAME_SAMPLES);
    this.powSpec = new Float32Array(HANDY_VAD_FRAME_SAMPLES / 2 + 1);
    this.centered = new Float32Array(HANDY_VAD_FRAME_SAMPLES);
    this.hpFiltered = new Float32Array(HANDY_VAD_FRAME_SAMPLES);
    this.bucketSnrs = new Float32Array(VOCAL_BUCKETS);

    this.resampleCarry = new Float32Array(HANDY_VAD_FRAME_SAMPLES * 4);
    this.resampleCarryLen = 0;

    this.frameBuffer = [];
    this.hangoverCounter = 0;
    this.onsetCounter = 0;
    this.inSpeech = false;
  }

  public isInSpeech(): boolean {
    return this.inSpeech;
  }

  public reset(): void {
    this.noiseFloor.fill(INITIAL_NOISE_FLOOR_DB);
    this.resampleCarryLen = 0;
    this.frameBuffer = [];
    this.hangoverCounter = 0;
    this.onsetCounter = 0;
    this.inSpeech = false;
  }

  /**
   * Scores a single 512-sample (32ms @ 16kHz) frame for genuine human vocal speech.
   */
  public scoreFrame512(frame: Float32Array, aiPlaying = false): HandyFrameScore {
    const N = HANDY_VAD_FRAME_SAMPLES;
    if (!frame || frame.length < N) {
      return {
        score: 0,
        isVoice: false,
        rms: 0,
        vocalToRumble: 0,
        spectralFlatness: 1,
        pitchCorr: 0,
        vocalSnrDb: 0,
      };
    }

    let mean = 0;
    for (let i = 0; i < N; i++) {
      const v = frame[i];
      if (!Number.isFinite(v)) {
        return {
          score: 0,
          isVoice: false,
          rms: 0,
          vocalToRumble: 0,
          spectralFlatness: 1,
          pitchCorr: 0,
          vocalSnrDb: 0,
        };
      }
      mean += v;
    }
    mean /= N;

    let sumSq = 0;
    let peak = 0;
    let zc = 0;
    // 1st-order ~95 Hz high-pass filter copy (alpha = 0.964 @ 16 kHz) to isolate human F0 from <80 Hz truck rumble
    let prevX = 0;
    let prevY = 0;
    for (let i = 0; i < N; i++) {
      const c = Math.max(-1, Math.min(1, frame[i] - mean));
      this.centered[i] = c;
      sumSq += c * c;
      const absC = c < 0 ? -c : c;
      if (absC > peak) peak = absC;
      if (i > 0 && ((c >= 0 && this.centered[i - 1] < 0) || (c < 0 && this.centered[i - 1] >= 0))) {
        zc++;
      }
      const hp = 0.964 * (prevY + c - prevX);
      prevX = c;
      prevY = hp;
      this.hpFiltered[i] = hp;

      this.fftRe[i] = c * HANN_WINDOW[i];
      this.fftIm[i] = 0;
    }

    const rms = Math.sqrt(sumSq / N);
    const zcr = zc / N;
    const minRms = aiPlaying ? 0.012 : 0.0042;
    if (rms < minRms) {
      return {
        score: 0,
        isVoice: false,
        rms,
        vocalToRumble: 0,
        spectralFlatness: 1,
        pitchCorr: 0,
        vocalSnrDb: 0,
      };
    }

    fft512InPlace(this.fftRe, this.fftIm);

    const halfN = N >> 1;
    for (let k = 0; k <= halfN; k++) {
      const r = this.fftRe[k];
      const im = this.fftIm[k];
      this.powSpec[k] = r * r + im * im;
    }

    // Sub-band energy integration (31.25 Hz per bin @ 16 kHz)
    // Rumble: bins 1..8 (31 - 250 Hz: cars, motorcycles, wind, mic bumps)
    let rumbleEnergy = 0;
    for (let k = 1; k <= 8; k++) rumbleEnergy += this.powSpec[k];

    // Human vocal formants F1/F2/F3: bins 11..115 (343 - 3594 Hz)
    let vocalFormantEnergy = 0;
    for (let k = 11; k <= 115; k++) vocalFormantEnergy += this.powSpec[k];

    // Upper vocal harmonic/F2/F3 band: bins 24..122 (750 - 3812 Hz)
    let upperVocalEnergy = 0;
    for (let k = 24; k <= 122; k++) upperVocalEnergy += this.powSpec[k];

    let totalEnergy = 1e-12;
    for (let k = 1; k <= 240; k++) totalEnergy += this.powSpec[k];

    const vocalToRumble = vocalFormantEnergy / (rumbleEnergy + 1e-12);
    const vocalFormantShare = vocalFormantEnergy / totalEnergy;
    const upperVocalShare = upperVocalEnergy / (vocalFormantEnergy + 1e-12);
    const crestFactor = peak / (rms + 1e-9);

    // Spectral flatness (Wiener entropy) across 312 - 3812 Hz (bins 10..122)
    let logSum = 0;
    let arithSum = 0;
    const flatBins = 113;
    for (let k = 10; k <= 122; k++) {
      const p = this.powSpec[k] + 1e-12;
      logSum += Math.log(p);
      arithSum += p;
    }
    const spectralFlatness = Math.exp(logSum / flatBins) / (arithSum / flatBins + 1e-12);

    // Handy AudioVisualiser 16 vocal buckets + adaptive per-bucket noise floor
    for (let b = 0; b < VOCAL_BUCKETS; b++) {
      const [startBin, endBin] = BUCKET_RANGES[b];
      let pSum = 0;
      for (let k = startBin; k < endBin; k++) pSum += this.powSpec[k];
      const avgPower = pSum / Math.max(1, endBin - startBin);
      const db = avgPower > 1e-12 ? 20.0 * Math.log10(Math.sqrt(avgPower) / N) : -80.0;

      // Only adapt noise floor on quiet / broadband non-voiced background frames
      if (!this.inSpeech && (db < this.noiseFloor[b] + 8.0 || spectralFlatness > 0.48)) {
        this.noiseFloor[b] = NOISE_ALPHA * db + (1.0 - NOISE_ALPHA) * this.noiseFloor[b];
      }
      this.bucketSnrs[b] = Math.max(0, db - this.noiseFloor[b]);
    }

    // Average of top-4 formant bucket SNRs (human vowels create 2-4 distinct formant peaks)
    let top1 = 0, top2 = 0, top3 = 0, top4 = 0;
    for (let b = 0; b < VOCAL_BUCKETS; b++) {
      const v = this.bucketSnrs[b];
      if (v > top1) { top4 = top3; top3 = top2; top2 = top1; top1 = v; }
      else if (v > top2) { top4 = top3; top3 = top2; top2 = v; }
      else if (v > top3) { top4 = top3; top3 = v; }
      else if (v > top4) { top4 = v; }
    }
    const vocalSnrDb = (top1 + top2 + top3 + top4) * 0.25;

    // Hard physical rejections for non-human street/ambient noise:
    // 1) Vehicle engine / wind / thud rumble dominates vocal formants
    // 2) Sharp click / knock transient (crestFactor > 6.2)
    // 3) Virtually no energy in F1-F3 vocal tract band or pure single-frequency low horn beep
    if (
      vocalToRumble < 0.22 ||
      vocalFormantShare < 0.16 ||
      crestFactor > 6.2 ||
      upperVocalShare < 0.012
    ) {
      return {
        score: 0,
        isVoice: false,
        rms,
        vocalToRumble,
        spectralFlatness,
        pitchCorr: 0,
        vocalSnrDb,
      };
    }

    // Human vocal-cord pitch harmonicity (normalized autocorrelation R(tau) for F0 in 85..380 Hz -> lags 42..188)
    let bestCorr = 0;
    let bestLag = 80;
    const M = 320; // 20 ms correlation window within the 32 ms frame
    for (let lag = 42; lag <= 188; lag += 2) {
      let cross = 0;
      let e0 = 0;
      let e1 = 0;
      for (let i = 0; i < M; i++) {
        const a = this.hpFiltered[i];
        const b = this.hpFiltered[i + lag];
        cross += a * b;
        e0 += a * a;
        e1 += b * b;
      }
      const corr = cross / (Math.sqrt(e0 * e1) + 1e-12);
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }
    // Fine +/- 1 sample refinement around bestLag
    for (const delta of [-1, 1]) {
      const lag = bestLag + delta;
      if (lag < 42 || lag > 188) continue;
      let cross = 0, e0 = 0, e1 = 0;
      for (let i = 0; i < M; i++) {
        const a = this.hpFiltered[i];
        const b = this.hpFiltered[i + lag];
        cross += a * b;
        e0 += a * a;
        e1 += b * b;
      }
      const corr = cross / (Math.sqrt(e0 * e1) + 1e-12);
      if (corr > bestCorr) bestCorr = corr;
    }

    const pitchScore = Math.max(0, Math.min(1, (bestCorr - 0.30) / 0.35));
    const structureScore = Math.max(0, Math.min(1, (0.52 - spectralFlatness) / 0.34));
    const snrScore = Math.max(0, Math.min(1, (vocalSnrDb - 5.0) / 13.0));
    const formantBalanceScore =
      Math.max(0, Math.min(1, (vocalToRumble - 0.22) / 0.90)) *
      Math.max(0, Math.min(1, vocalFormantShare / 0.38));

    const score =
      0.35 * pitchScore +
      0.25 * structureScore +
      0.22 * snrScore +
      0.18 * formantBalanceScore;

    // Onset strictly requires human vocal-cord harmonicity (bestCorr >= 0.38) + non-flat formant structure.
    // Once already in confirmed speech, mid-word unvoiced consonants (/s/, /t/, /k/, /f/) are also sustained.
    const hasHarmonicVoice = bestCorr >= 0.38 && spectralFlatness < 0.48;
    const hasMidWordConsonant =
      this.inSpeech &&
      !aiPlaying &&
      structureScore >= 0.32 &&
      snrScore >= 0.42 &&
      zcr >= 0.11 &&
      zcr <= 0.48;

    const activeThreshold = aiPlaying ? this.bargeInThreshold : this.threshold;
    const isVoice = (hasHarmonicVoice || hasMidWordConsonant) && score >= activeThreshold;

    return {
      score,
      isVoice,
      rms,
      vocalToRumble,
      spectralFlatness,
      pitchCorr: bestCorr,
      vocalSnrDb,
    };
  }

  /**
   * Resamples arbitrary hardware sample-rate audio (e.g. 44.1kHz / 48kHz) into 16kHz 512-sample frames
   * and runs Handy's `SmoothedVad` state machine (prefill ring buffer + onset confirmation + hangover).
   */
  public processSamples(
    inputSamples: Float32Array,
    inputSampleRate: number,
    aiPlaying = false
  ): HandyVadProcessResult {
    if (!inputSamples || inputSamples.length === 0) {
      return {
        speechPcm16k: null,
        inSpeech: this.inSpeech,
        speechStarted: false,
        speechEnded: false,
        maxScore: 0,
        lastMetrics: null,
      };
    }

    const fromRate = inputSampleRate > 0 ? inputSampleRate : HANDY_VAD_SAMPLE_RATE;
    let resampled: Float32Array;
    if (fromRate === HANDY_VAD_SAMPLE_RATE) {
      resampled = inputSamples;
    } else {
      const ratio = fromRate / HANDY_VAD_SAMPLE_RATE;
      const outLen = Math.max(1, Math.floor(inputSamples.length / ratio));
      resampled = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const start = Math.floor(i * ratio);
        let end = Math.min(inputSamples.length, Math.floor((i + 1) * ratio));
        if (end <= start) end = Math.min(inputSamples.length, start + 1);
        let acc = 0;
        for (let k = start; k < end; k++) acc += inputSamples[k];
        resampled[i] = acc / (end - start);
      }
    }

    // Append to carry buffer
    const neededCap = this.resampleCarryLen + resampled.length;
    if (neededCap > this.resampleCarry.length) {
      const grown = new Float32Array(Math.max(neededCap, this.resampleCarry.length * 2));
      grown.set(this.resampleCarry.subarray(0, this.resampleCarryLen), 0);
      this.resampleCarry = grown;
    }
    this.resampleCarry.set(resampled, this.resampleCarryLen);
    this.resampleCarryLen += resampled.length;

    const emittedChunks: Float32Array[] = [];
    let totalEmittedSamples = 0;
    let speechStarted = false;
    let speechEnded = false;
    let maxScore = 0;
    let lastMetrics: HandyFrameScore | null = null;
    const requiredOnset = aiPlaying ? this.bargeInOnsetFrames : this.onsetFrames;

    let offset = 0;
    while (this.resampleCarryLen - offset >= HANDY_VAD_FRAME_SAMPLES) {
      const frame = this.resampleCarry.slice(offset, offset + HANDY_VAD_FRAME_SAMPLES);
      offset += HANDY_VAD_FRAME_SAMPLES;

      // 1. Buffer frame in pre-roll ring buffer (cjpais/Handy SmoothedVad::push_frame)
      const slot: BufferedFrame = { samples: frame, emitted: false, voiced: false };
      this.frameBuffer.push(slot);
      while (this.frameBuffer.length > this.prefillFrames + 1) {
        this.frameBuffer.shift();
      }

      // 2. Score frame with human vocal speech detector
      const metrics = this.scoreFrame512(frame, aiPlaying);
      lastMetrics = metrics;
      if (metrics.score > maxScore) maxScore = metrics.score;
      slot.voiced = metrics.isVoice;

      // 3. SmoothedVad state machine
      if (!this.inSpeech && metrics.isVoice) {
        this.onsetCounter += 1;
        if (this.onsetCounter >= requiredOnset) {
          this.inSpeech = true;
          speechStarted = true;
          this.hangoverCounter = this.hangoverFrames;
          this.onsetCounter = 0;
          // Emit prefill + current frame so leading consonants are never clipped
          for (let b = 0; b < this.frameBuffer.length; b++) {
            const buf = this.frameBuffer[b];
            if (!buf.emitted) {
              buf.emitted = true;
              emittedChunks.push(buf.samples);
              totalEmittedSamples += buf.samples.length;
            }
          }
        }
      } else if (this.inSpeech && metrics.isVoice) {
        this.hangoverCounter = this.hangoverFrames;
        slot.emitted = true;
        emittedChunks.push(frame);
        totalEmittedSamples += frame.length;
      } else if (this.inSpeech && !metrics.isVoice) {
        if (this.hangoverCounter > 0) {
          this.hangoverCounter -= 1;
          slot.emitted = true;
          emittedChunks.push(frame);
          totalEmittedSamples += frame.length;
        } else {
          this.inSpeech = false;
          speechEnded = true;
        }
      } else {
        this.onsetCounter = 0;
      }
    }

    if (offset > 0) {
      const remaining = this.resampleCarryLen - offset;
      if (remaining > 0) {
        this.resampleCarry.copyWithin(0, offset, this.resampleCarryLen);
      }
      this.resampleCarryLen = remaining;
    }

    let speechPcm16k: Float32Array | null = null;
    if (totalEmittedSamples > 0) {
      speechPcm16k = new Float32Array(totalEmittedSamples);
      let writePos = 0;
      for (let i = 0; i < emittedChunks.length; i++) {
        speechPcm16k.set(emittedChunks[i], writePos);
        writePos += emittedChunks[i].length;
      }
    }

    return {
      speechPcm16k,
      inSpeech: this.inSpeech,
      speechStarted,
      speechEnded,
      maxScore,
      lastMetrics,
    };
  }
}

export function float32At16kToPcm16Base64(samples16k: Float32Array): string {
  const int16 = new Int16Array(samples16k.length);
  for (let i = 0; i < samples16k.length; i++) {
    const s = Math.max(-1, Math.min(1, samples16k[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, Math.min(i + CHUNK, bytes.length))));
  }
  return btoa(binary);
}
