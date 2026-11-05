/**
 * features/voice-studio/src/lib/sileroVadGate.ts
 *
 * Self-hosted Neural Human-Voice Activity Detection Gate powered by `@ricky0123/vad-web`
 * (`silero_vad_v5.onnx` + ONNX Runtime Web WASM, single-threaded CSP-clean).
 *
 * Prevents street traffic, passing motorcycles/cars, horns, fans, wind, or table knocks
 * from ever triggering user-speaking UI state, false barge-in, or silence-wait freezes.
 */

import { float32At16kToPcm16Base64 } from './handyVad';

export interface SileroVadGateCallbacks {
  isMicMuted: () => boolean;
  isAiPlaying: () => boolean;
  onHumanSpeechState: (speaking: boolean) => void;
  onHumanBargeIn: () => void;
  onSpeechPcm16kBase64: (pcmBase64: string) => void;
  onSpeechEnded: () => void;
}

interface GlobalVadNamespace {
  MicVAD?: {
    new: (opts: Record<string, unknown>) => Promise<{
      start: () => void;
      pause: () => void;
      destroy?: () => void;
    }>;
  };
}

let bundleLoadPromise: Promise<GlobalVadNamespace | null> | null = null;

function resolveSileroBaseCandidates(): string[] {
  const out: string[] = [];
  if (typeof window !== 'undefined' && window.location?.href) {
    try {
      out.push(new URL('vendor/silero-vad/', window.location.href).href);
    } catch {
      // ignore
    }
    try {
      out.push(new URL('../vendor/silero-vad/', window.location.href).href);
    } catch {
      // ignore
    }
    try {
      out.push(new URL('../../vendor/silero-vad/', window.location.href).href);
    } catch {
      // ignore
    }
  }
  out.push('./vendor/silero-vad/', '/app/vendor/silero-vad/', '/vendor/silero-vad/');
  return Array.from(new Set(out));
}

function loadSileroBundle(): Promise<{ vad: GlobalVadNamespace; baseHref: string } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof WebAssembly === 'undefined') {
    return Promise.resolve(null);
  }
  const win = window as unknown as {
    vad?: GlobalVadNamespace;
    ort?: unknown;
    __fzSileroBaseHref?: string;
  };
  // @ricky0123/vad-web UMD bundle requires global `window.ort` (onnxruntime-web).
  // Skip script injection cleanly when `window.ort` is not preloaded to avoid dead script tags and console errors.
  if (!win.ort) {
    return Promise.resolve(null);
  }
  if (win.vad?.MicVAD && typeof win.vad.MicVAD.new === 'function') {
    return Promise.resolve({
      vad: win.vad,
      baseHref: win.__fzSileroBaseHref || resolveSileroBaseCandidates()[0],
    });
  }

  if (bundleLoadPromise) {
    return bundleLoadPromise.then((v) =>
      v ? { vad: v, baseHref: win.__fzSileroBaseHref || resolveSileroBaseCandidates()[0] } : null
    );
  }

  const candidates = resolveSileroBaseCandidates();
  bundleLoadPromise = new Promise<GlobalVadNamespace | null>((resolve) => {
    let idx = 0;
    const tryNext = () => {
      if (idx >= candidates.length) {
        bundleLoadPromise = null;
        resolve(null);
        return;
      }
      const baseHref = candidates[idx++];
      const script = document.createElement('script');
      script.src = `${baseHref}bundle.min.js`;
      script.async = true;
      script.setAttribute('data-fz-vs-silero', '1');
      script.onload = () => {
        if (win.vad?.MicVAD) {
          win.__fzSileroBaseHref = baseHref;
          resolve(win.vad);
        } else {
          script.remove();
          tryNext();
        }
      };
      script.onerror = () => {
        script.remove();
        tryNext();
      };
      (document.head || document.documentElement).appendChild(script);
    };
    tryNext();
  });

  return bundleLoadPromise.then((v) =>
    v ? { vad: v, baseHref: win.__fzSileroBaseHref || candidates[0] } : null
  );
}

export class SileroNeuralVadGate {
  private instance: { start: () => void; pause: () => void; destroy?: () => void } | null = null;
  private active = false;
  private disposed = false;
  private confirmedSpeaking = false;
  private lastHumanSpeechAt = 0;
  private lastProb = 0;

  public isActive(): boolean {
    return this.active && !this.disposed;
  }

  public isConfirmedSpeaking(): boolean {
    return this.confirmedSpeaking;
  }

  public getLastHumanSpeechAt(): number {
    return this.lastHumanSpeechAt;
  }

  public markHumanSpeechAt(t: number = Date.now()): void {
    this.lastHumanSpeechAt = t;
  }

  public getLastSpeechProbability(): number {
    return this.lastProb;
  }

  public async start(
    stream: MediaStream,
    audioContext: AudioContext,
    cb: SileroVadGateCallbacks
  ): Promise<boolean> {
    this.disposed = false;
    const loaded = await loadSileroBundle();
    if (!loaded || this.disposed || !loaded.vad.MicVAD) {
      return false;
    }

    const { vad, baseHref } = loaded;
    const preRollBase64: string[] = [];
    const MAX_PREROLL_FRAMES = 14; // ~448ms @ 32ms/frame so initial consonants are preserved
    let speechStreak = 0;
    let silenceStreak = 0;
    let burstOpen = false;

    try {
      const micVad = await vad.MicVAD!.new({
        model: 'v5',
        baseAssetPath: baseHref,
        onnxWASMBasePath: baseHref,
        ortConfig: (ort: any) => {
          try {
            if (ort?.env?.wasm) {
              ort.env.wasm.numThreads = 1;
              ort.env.wasm.proxy = false;
            }
          } catch {
            // ignore
          }
        },
        positiveSpeechThreshold: 0.62,
        negativeSpeechThreshold: 0.42,
        minSpeechMs: 192,
        redemptionMs: 480,
        preSpeechPadMs: 384,
        submitUserSpeechOnPause: false,
        getStream: async () => stream,
        pauseStream: async () => {},
        resumeStream: async () => stream,
        audioContext,
        onFrameProcessed: (probs: { isSpeech?: number }, frame: Float32Array) => {
          if (this.disposed || cb.isMicMuted()) return;
          const pSpeech = typeof probs?.isSpeech === 'number' ? probs.isSpeech : 0;
          this.lastProb = pSpeech;

          let sq = 0;
          const n = frame ? frame.length : 0;
          for (let i = 0; i < n; i++) sq += frame[i] * frame[i];
          const rms = n > 0 ? Math.sqrt(sq / n) : 0;
          const pcmBase64 = n > 0 ? float32At16kToPcm16Base64(frame) : '';

          if (cb.isAiPlaying()) {
            // While AI partner speaks: Robust echo-immune human voice barge-in
            // (>= 8 frames = 256ms with neural speech probability >= 0.85 & rms >= 0.038).
            // Prevents laptop/phone speaker acoustic bleed from falsely cutting off AI playback.
            if (pSpeech >= 0.85 && rms >= 0.038) {
              this.lastHumanSpeechAt = Date.now();
              speechStreak += 1;
              silenceStreak = 0;
              if (speechStreak >= 8) {
                burstOpen = true;
                this.confirmedSpeaking = true;
                cb.onHumanBargeIn();
                cb.onHumanSpeechState(true);
              } else {
                if (pcmBase64) {
                  preRollBase64.push(pcmBase64);
                  if (preRollBase64.length > MAX_PREROLL_FRAMES) preRollBase64.shift();
                }
                return;
              }
            } else {
              if (pSpeech < 0.55) speechStreak = 0;
              if (pcmBase64) {
                preRollBase64.push(pcmBase64);
                if (preRollBase64.length > MAX_PREROLL_FRAMES) preRollBase64.shift();
              }
              return;
            }
          } else {
            // Listening state: sensitive human vocal onset (>= 2 frames / 64ms with pSpeech >= 0.45 & rms >= 0.002).
            // Guarantees quiet speech and laptop/headset built-in mics immediately open audio burst without clipping.
            const isMobile =
              typeof navigator !== 'undefined' &&
              (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints || 0) > 1);
            const endSilenceFrames = isMobile ? 11 : 13; // ~352ms mobile, ~416ms desktop
            if (pSpeech >= 0.45 && rms >= 0.002) {
              this.lastHumanSpeechAt = Date.now();
              speechStreak += 1;
              silenceStreak = 0;
              if (speechStreak >= 2) {
                burstOpen = true;
                if (!this.confirmedSpeaking) {
                  this.confirmedSpeaking = true;
                }
                cb.onHumanSpeechState(true);
              }
            } else {
              speechStreak = 0;
              if (burstOpen) {
                silenceStreak += 1;
                if (silenceStreak >= endSilenceFrames) {
                  burstOpen = false;
                  silenceStreak = 0;
                  this.confirmedSpeaking = false;
                  cb.onHumanSpeechState(false);
                  cb.onSpeechEnded();
                }
              }
            }
          }

          if (!pcmBase64) return;

          if (burstOpen) {
            while (preRollBase64.length > 0) {
              const pre = preRollBase64.shift();
              if (pre) cb.onSpeechPcm16kBase64(pre);
            }
            cb.onSpeechPcm16kBase64(pcmBase64);
          } else {
            preRollBase64.push(pcmBase64);
            if (preRollBase64.length > MAX_PREROLL_FRAMES) preRollBase64.shift();
          }
        },
        onVADMisfire: () => {
          speechStreak = 0;
          if (!burstOpen) {
            this.confirmedSpeaking = false;
            cb.onHumanSpeechState(false);
          }
        },
      });

      if (this.disposed) {
        try {
          micVad.destroy?.();
        } catch {
          // ignore
        }
        return false;
      }

      this.instance = micVad;
      this.active = true;
      micVad.start();
      try {
        (window as any).__fzVoiceStudioSileroVad = this;
      } catch {
        // ignore
      }
      return true;
    } catch (err) {
      console.warn('[VoiceStudio] Silero VAD v5 fallback to Handy DSP:', err);
      this.active = false;
      return false;
    }
  }

  public destroy(): void {
    this.disposed = true;
    this.active = false;
    this.confirmedSpeaking = false;
    const inst = this.instance;
    this.instance = null;
    if (inst) {
      try {
        inst.pause?.();
      } catch {
        // ignore
      }
      try {
        inst.destroy?.();
      } catch {
        // ignore
      }
    }
  }
}
