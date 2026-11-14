/**
 * features/voice-studio/src/lib/sileroVadGate.ts
 *
 * Self-hosted Neural Human-Voice Activity Detection Gate powered by `@ricky0123/vad-web`
 * (`silero_vad_v5.onnx` + ONNX Runtime Web WASM, single-threaded CSP-clean).
 *
 * Prevents street traffic, passing motorcycles/cars, horns, fans, wind, or table knocks
 * from ever triggering user-speaking UI state, false barge-in, or silence-wait freezes.
 */

import {
  HandyHumanVad,
  float32At16kToPcm16Base64,
  hasDynamicSpeechModulation,
} from './handyVad';

export interface SileroFrameTelemetry {
  frameMs: number;
  isActiveVoice: boolean;
  confirmedSpeech: boolean;
  pSpeech: number;
  rms: number;
}

export interface SileroVadGateCallbacks {
  isMicMuted: () => boolean;
  isAiPlaying: () => boolean;
  isWorkbenchOpen?: () => boolean;
  onHumanSpeechState: (speaking: boolean) => void;
  onHumanBargeIn: () => void;
  onBargeCandidateAudio?: (samples16k: Float32Array, rms: number) => void;
  onSpeechPcm16kBase64: (pcmBase64: string) => void;
  onSpeechEnded: () => void;
  onFrameTelemetry?: (telemetry: SileroFrameTelemetry) => void;
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

function loadScriptTag(src: string, attrName: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector(`script[${attrName}][src="${src}"]`);
    if (existing) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.setAttribute(attrName, '1');
    script.onload = () => resolve(true);
    script.onerror = () => {
      script.remove();
      resolve(false);
    };
    (document.head || document.documentElement).appendChild(script);
  });
}

function configureOrtWasm(ortObj: any, baseHref: string): void {
  try {
    if (ortObj?.env?.wasm) {
      ortObj.env.wasm.wasmPaths = baseHref;
      ortObj.env.wasm.numThreads = 1;
      ortObj.env.wasm.proxy = false;
    }
  } catch {
    // ignore
  }
}

const SILERO_WARM_FILES = [
  'bundle.min.js',
  'ort-wasm-simd-threaded.js',
  'ort-wasm-simd-threaded.wasm',
  'silero_vad_v5.onnx',
  'vad.worklet.bundle.min.js',
];

function warmSileroVendorCache(baseHref: string): void {
  if (typeof window === 'undefined' || !('caches' in window) || typeof fetch !== 'function') return;
  void (async () => {
    try {
      const keys = await window.caches.keys();
      const targetCacheName =
        keys.find((k) => k.startsWith('fiezel-v')) ||
        `fiezel-v${String((window as unknown as { FIEZEL_VERSION?: string }).FIEZEL_VERSION || '5.19.0')}`;
      const cache = await window.caches.open(targetCacheName);
      await Promise.all(
        SILERO_WARM_FILES.map(async (file) => {
          const url = new URL(file, baseHref).href;
          try {
            const hit = await cache.match(url);
            if (!hit) {
              const res = await fetch(url, { credentials: 'same-origin' });
              if (res && res.ok) {
                await cache.put(url, res.clone());
              }
            }
          } catch {
            // Non-blocking warmup
          }
        })
      );
    } catch {
      // CacheStorage unavailable (e.g. private browsing)
    }
  })();
}

function loadSileroBundle(): Promise<{ vad: GlobalVadNamespace; baseHref: string } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof WebAssembly === 'undefined') {
    return Promise.resolve(null);
  }
  const win = window as unknown as {
    vad?: GlobalVadNamespace;
    ort?: { env?: { wasm?: Record<string, unknown> } };
    __fzSileroBaseHref?: string;
  };
  if (win.vad?.MicVAD && typeof win.vad.MicVAD.new === 'function') {
    const activeBase = win.__fzSileroBaseHref || resolveSileroBaseCandidates()[0];
    if (win.ort) {
      configureOrtWasm(win.ort, activeBase);
    }
    return Promise.resolve({
      vad: win.vad,
      baseHref: activeBase,
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
    const tryNext = async () => {
      if (idx >= candidates.length) {
        bundleLoadPromise = null;
        resolve(null);
        return;
      }
      const baseHref = candidates[idx++];
      if (win.ort) {
        configureOrtWasm(win.ort, baseHref);
      }

      const vadLoaded = await loadScriptTag(`${baseHref}bundle.min.js`, 'data-fz-vs-silero');
      if (vadLoaded && win.vad?.MicVAD) {
        if (win.ort) {
          configureOrtWasm(win.ort, baseHref);
        }
        win.__fzSileroBaseHref = baseHref;
        warmSileroVendorCache(baseHref);
        resolve(win.vad);
      } else {
        void tryNext();
      }
    };
    void tryNext();
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
  private lastFrameAt = 0;
  private lastProb = 0;

  public isActive(): boolean {
    return this.active && !this.disposed && Date.now() - this.lastFrameAt < 600;
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
    cb: SileroVadGateCallbacks,
    opts?: { preferScriptProcessor?: boolean }
  ): Promise<boolean> {
    this.disposed = false;
    const loaded = await loadSileroBundle();
    if (!loaded || this.disposed || !loaded.vad.MicVAD) {
      return false;
    }

    const { vad, baseHref } = loaded;
    const isMobilePwaDevice =
      typeof navigator !== 'undefined' &&
      (/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '') ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
        Boolean(
          navigator.vendor &&
            navigator.vendor.includes('Apple') &&
            !navigator.userAgent.includes('CriOS') &&
            !navigator.userAgent.includes('Chrome')
        ));
    const useScriptProcessor =
      typeof opts?.preferScriptProcessor === 'boolean' ? opts.preferScriptProcessor : isMobilePwaDevice;

    const preRollBase64: string[] = [];
    const MAX_PREROLL_FRAMES = 14; // ~448ms @ 32ms/frame so initial consonants are preserved
    const handyVerifier = new HandyHumanVad({
      threshold: 0.48,
      bargeInThreshold: useScriptProcessor ? 0.60 : 0.68,
      onsetFrames: 2,
      bargeInOnsetFrames: 5,
    });
    const bargeRmsSeries: number[] = [];
    let speechStreak = 0;
    let silenceStreak = 0;
    let burstOpen = false;
    let lastBargeAt = 0;

    try {
      if (audioContext && (audioContext.state === 'suspended' || (audioContext.state as string) === 'interrupted')) {
        void audioContext.resume().catch(() => {});
      }
      const micVad = await vad.MicVAD!.new({
        model: 'v5',
        baseAssetPath: baseHref,
        onnxWASMBasePath: baseHref,
        ortConfig: (ort: any) => {
          configureOrtWasm(ort, baseHref);
        },
        processorType: useScriptProcessor ? 'ScriptProcessor' : 'auto',
        positiveSpeechThreshold: 0.56,
        negativeSpeechThreshold: 0.38,
        minSpeechMs: 96,
        redemptionMs: 420,
        preSpeechPadMs: 280,
        submitUserSpeechOnPause: false,
        getStream: async () => stream,
        pauseStream: async () => {},
        resumeStream: async () => stream,
        audioContext,
        onFrameProcessed: (probs: { isSpeech?: number }, frame: Float32Array) => {
          this.lastFrameAt = Date.now();
          if (this.disposed || cb.isMicMuted()) return;
          const pSpeech = typeof probs?.isSpeech === 'number' ? probs.isSpeech : 0;
          this.lastProb = pSpeech;

          let sq = 0;
          const n = frame ? frame.length : 0;
          for (let i = 0; i < n; i++) sq += frame[i] * frame[i];
          const rms = n > 0 ? Math.sqrt(sq / n) : 0;
          const pcmBase64 = n > 0 ? float32At16kToPcm16Base64(frame) : '';

          if (cb.isAiPlaying()) {
            // Strict human-only echo & ambient vehicle/horn immune barge-in gate,
            // with Mobile-PWA hardware-AEC RMS compensation when vocal formants & harmonicity pass.
            const hm = frame && frame.length >= 256 ? handyVerifier.scoreFrame512(frame, true) : null;
            const isMobilePwaDevice =
              typeof navigator !== 'undefined' &&
              (/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '') ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
            const isModulatedHumanBarge =
              hm === null || (hm.isVoice && hm.pitchCorr >= 0.42 && hm.vocalToRumble >= 1.35);
            const isMobileAecHumanBarge =
              isMobilePwaDevice &&
              pSpeech >= 0.72 &&
              rms >= 0.008 &&
              hm !== null &&
              hm.isVoice &&
              hm.pitchCorr >= 0.42 &&
              hm.vocalToRumble >= 1.45;
            if (
              (((pSpeech >= 0.88 && rms >= 0.028) || (pSpeech >= 0.78 && rms >= 0.018)) &&
                isModulatedHumanBarge) ||
              isMobileAecHumanBarge
            ) {
              this.lastHumanSpeechAt = Date.now();
              speechStreak += 1;
              silenceStreak = 0;
              bargeRmsSeries.push(rms);
              if (bargeRmsSeries.length > 16) bargeRmsSeries.shift();
              if (pcmBase64) {
                preRollBase64.push(pcmBase64);
                if (preRollBase64.length > MAX_PREROLL_FRAMES) preRollBase64.shift();
              }
              if (frame && frame.length > 0 && cb.onBargeCandidateAudio) {
                cb.onBargeCandidateAudio(new Float32Array(frame), rms);
              }
              const requiredSileroBargeStreak = isMobilePwaDevice ? 6 : 8;
              if (
                ((speechStreak >= requiredSileroBargeStreak &&
                  hasDynamicSpeechModulation(bargeRmsSeries)) ||
                  speechStreak >= 18) &&
                Date.now() - lastBargeAt > 700
              ) {
                lastBargeAt = Date.now();
                speechStreak = 0;
                bargeRmsSeries.length = 0;
                preRollBase64.length = 0;
                this.confirmedSpeaking = true;
                cb.onHumanBargeIn();
                cb.onHumanSpeechState(true);
              }
              return;
            } else {
              if (pSpeech < 0.65 || !isModulatedHumanBarge) {
                speechStreak = 0;
                bargeRmsSeries.length = 0;
              }
              // Never buffer AI speaker echo or traffic rumble into preRollBase64 while AI is playing
              if (speechStreak === 0) preRollBase64.length = 0;
              return;
            }
          } else {
            // Listening state: capture natural human speech onset, reject traffic rumble, and submit promptly on speech end
            const isMobile =
              typeof navigator !== 'undefined' &&
              (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints || 0) > 1);
            // Crisp auto-send pause (~448ms-480ms) after human stops speaking
            const endSilenceFrames = isMobile ? 14 : 15;
            const listenHm = frame && frame.length >= 256 ? handyVerifier.scoreFrame512(frame, false) : null;
            const notMechanicalRumble =
              !listenHm || rms < 0.016 || listenHm.vocalToRumble >= 0.35 || listenHm.isVoice;
            const isActiveVoiceFrame = pSpeech >= 0.48 && rms >= 0.0022 && notMechanicalRumble;
            if (isActiveVoiceFrame) {
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
                  bargeRmsSeries.length = 0;
                  this.confirmedSpeaking = false;
                  cb.onHumanSpeechState(false);
                  cb.onSpeechEnded();
                }
              }
            }
            cb.onFrameTelemetry?.({
              frameMs: n > 0 ? Math.max(16, Math.round((n / 16000) * 1000)) : 32,
              isActiveVoice: isActiveVoiceFrame,
              confirmedSpeech: burstOpen || speechStreak >= 2,
              pSpeech,
              rms,
            });
          }

          if (!pcmBase64) return;

          if (burstOpen || speechStreak > 0) {
            while (preRollBase64.length > 0) {
              const pre = preRollBase64.shift();
              if (pre) cb.onSpeechPcm16kBase64(pre);
            }
            cb.onSpeechPcm16kBase64(pcmBase64);
          } else if (!cb.isAiPlaying()) {
            preRollBase64.push(pcmBase64);
            if (preRollBase64.length > MAX_PREROLL_FRAMES) preRollBase64.shift();
          } else {
            preRollBase64.length = 0;
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
