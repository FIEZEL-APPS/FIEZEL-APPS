// SSOT WebAudio Context & Mobile PWA Gesture Unlocker for the Learning Whiteboard

let sharedBoardAudioCtx: AudioContext | null = null;
const unlockSubscribers = new Set<() => void>();
let globalUnlockListenerAttached = false;
let htmlAudioPrimed = false;

// Valid 48-byte 8kHz 16-bit mono silent PCM WAV for synchronous HTMLAudioElement gesture unlock on iOS/Android PWA
const SILENT_WAV_DATA_URL = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQQAAAAAAAAA';

function primeSilentHtmlAudio(): void {
  if (htmlAudioPrimed || typeof Audio === 'undefined') return;
  try {
    const a = new Audio(SILENT_WAV_DATA_URL);
    a.muted = true;
    a.volume = 0;
    const p = a.play();
    if (p && typeof p.then === 'function') {
      void p
        .then(() => {
          htmlAudioPrimed = true;
          try {
            a.pause();
            a.removeAttribute('src');
          } catch {
            // Ignore cleanup
          }
        })
        .catch(() => {
          // Will retry on next gesture
        });
    }
  } catch {
    // Ignore
  }
}

function resolveAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return win.AudioContext || win.webkitAudioContext || null;
}

function playSilentPrimePulse(ctx: AudioContext): void {
  try {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate || 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    window.setTimeout(() => {
      try {
        src.disconnect();
        gain.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    }, 30);
  } catch {
    // Ignore silent prime errors
  }
}

function detachGlobalUnlockListeners(): void {
  if (!globalUnlockListenerAttached || typeof document === 'undefined') return;
  globalUnlockListenerAttached = false;
  document.removeEventListener('pointerdown', handleGlobalGestureUnlock, true);
  document.removeEventListener('touchstart', handleGlobalGestureUnlock, true);
  document.removeEventListener('keydown', handleGlobalGestureUnlock, true);
}

function handleGlobalGestureUnlock(): void {
  const ctx = unlockSharedBoardAudioContext();
  if (ctx && ctx.state === 'running') {
    detachGlobalUnlockListeners();
  }
}

export function ensureGlobalGestureUnlockListener(): void {
  if (globalUnlockListenerAttached || typeof document === 'undefined') return;
  globalUnlockListenerAttached = true;
  document.addEventListener('pointerdown', handleGlobalGestureUnlock, { capture: true, passive: true });
  document.addEventListener('touchstart', handleGlobalGestureUnlock, { capture: true, passive: true });
  document.addEventListener('keydown', handleGlobalGestureUnlock, { capture: true, passive: true });
}

/**
 * Returns the shared singleton AudioContext for the whiteboard (creating one if available).
 */
export function getSharedBoardAudioContext(): AudioContext | null {
  const Ctor = resolveAudioContextCtor();
  if (!Ctor) return null;
  if (!sharedBoardAudioCtx || sharedBoardAudioCtx.state === 'closed') {
    try {
      sharedBoardAudioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return sharedBoardAudioCtx;
}

/**
 * Synchronously creates/resumes and primes the shared AudioContext inside a user gesture.
 * Safe to call repeatedly from button clicks, touch handlers, and modal open actions.
 */
export function unlockSharedBoardAudioContext(): AudioContext | null {
  primeSilentHtmlAudio();
  const ctx = getSharedBoardAudioContext();
  if (!ctx) return null;
  if (ctx.state === 'suspended') {
    try {
      const p = ctx.resume();
      if (p && typeof p.then === 'function') {
        void p
          .then(() => {
            if (ctx.state === 'running') {
              playSilentPrimePulse(ctx);
              detachGlobalUnlockListeners();
              unlockSubscribers.forEach((cb) => {
                try {
                  cb();
                } catch {
                  // Ignore subscriber error
                }
              });
            }
          })
          .catch(() => {
            ensureGlobalGestureUnlockListener();
          });
      }
    } catch {
      ensureGlobalGestureUnlockListener();
    }
  }
  playSilentPrimePulse(ctx);
  if (ctx.state === 'running') {
    detachGlobalUnlockListeners();
    unlockSubscribers.forEach((cb) => {
      try {
        cb();
      } catch {
        // Ignore subscriber error
      }
    });
  } else {
    ensureGlobalGestureUnlockListener();
  }
  return ctx;
}

/**
 * Bounded AudioContext.resume() that never hangs forever outside a user gesture
 * (critical for Mobile PWA / iOS Safari where ctx.resume() can stay unresolved).
 */
export async function resumeAudioContextBounded(
  ctx: AudioContext | null | undefined,
  timeoutMs = 220
): Promise<boolean> {
  if (!ctx || ctx.state === 'closed') return false;
  if (ctx.state === 'running') return true;
  ensureGlobalGestureUnlockListener();
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(ctx.state === 'running');
    }, Math.max(40, timeoutMs));

    try {
      const p = ctx.resume();
      if (p && typeof p.then === 'function') {
        void p
          .then(() => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve(ctx.state === 'running');
          })
          .catch(() => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve(ctx.state === 'running');
          });
      } else {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          resolve(ctx.state === 'running');
        }
      }
    } catch {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(false);
      }
    }
  });
}

export function subscribeBoardAudioUnlock(cb: () => void): () => void {
  unlockSubscribers.add(cb);
  return () => {
    unlockSubscribers.delete(cb);
  };
}

/**
 * Bounded HTMLAudioElement.play() guard for Mobile PWA / iOS Safari where play()
 * can stay pending without rejecting, or resolve while still paused.
 */
export async function playHtmlAudioBounded(
  audio: HTMLAudioElement,
  timeoutMs = 650
): Promise<'playing' | 'blocked'> {
  return new Promise<'playing' | 'blocked'>((resolve) => {
    let settled = false;
    const finish = (res: 'playing' | 'blocked') => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(res);
    };
    const timer = window.setTimeout(() => {
      finish(audio.paused ? 'blocked' : 'playing');
    }, Math.max(120, timeoutMs));
    try {
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        void p
          .then(() => {
            finish(audio.paused ? 'blocked' : 'playing');
          })
          .catch(() => {
            finish('blocked');
          });
      } else {
        finish(audio.paused ? 'blocked' : 'playing');
      }
    } catch {
      finish('blocked');
    }
  });
}
