/**
 * FIEZEL Audio Sound Effects System
 * Plays canonical audio SFX from /assets/audio/sfx/ with multi-path resolution
 * and harmonic Web Audio synthesis fallback.
 */

export type FiezelSfxName =
  | 'button_tap'
  | 'lesson_start'
  | 'answer_correct'
  | 'answer_wrong'
  | 'lesson_complete'
  | 'xp_gain';

let sharedSynthCtx: AudioContext | null = null;

function getSharedSynthContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedSynthCtx || sharedSynthCtx.state === 'closed') {
    sharedSynthCtx = new AudioCtx();
  }
  if (sharedSynthCtx.state === 'suspended') {
    void sharedSynthCtx.resume().catch(() => {});
  }
  return sharedSynthCtx;
}

/**
 * Synthesizes a soft, harmonic tone if static asset playback is restricted or unavailable
 */
function playSynthesizedFallback(name: FiezelSfxName): void {
  try {
    const ctx = getSharedSynthContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (name === 'button_tap') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (name === 'lesson_start') {
      // Upward melodic major third chime
      const notes = [523.25, 659.25]; // C5 -> E5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        noteGain.gain.setValueAtTime(0.12, now + idx * 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(noteGain);
        noteGain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.26);
      });
    } else if (name === 'answer_correct') {
      // Bright major triad (E5 -> G#5 -> B5)
      const triad = [659.25, 830.61, 987.77];
      triad.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        noteGain.gain.setValueAtTime(0.14, now + idx * 0.06);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
        osc.connect(noteGain);
        noteGain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.36);
      });
    } else if (name === 'answer_wrong') {
      // Soft gentle low thud
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (name === 'lesson_complete') {
      // Victory fanfare (C5 -> G5 -> C6)
      const fanfare = [523.25, 783.99, 1046.5];
      fanfare.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        noteGain.gain.setValueAtTime(0.15, now + idx * 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);
        osc.connect(noteGain);
        noteGain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.46);
      });
    } else if (name === 'xp_gain') {
      // Crisp sparkle tick (1320Hz)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1318.51, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.09);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch {
    // Completely silent fallback in restrictive or non-audio test environments
  }
}

export function playFiezelSfx(name: FiezelSfxName): void {
  if (typeof window === 'undefined') return;

  try {
    const candidateUrls = [
      `/assets/audio/sfx/${name}.mp3`,
      `./assets/audio/sfx/${name}.mp3`,
      `../../assets/audio/sfx/${name}.mp3`,
      `/assets/audio/sfx/${name}.ogg`,
    ];

    let tried = 0;
    const tryNext = () => {
      if (tried >= candidateUrls.length) {
        playSynthesizedFallback(name);
        return;
      }
      const url = candidateUrls[tried++];
      const audio = new Audio(url);
      audio.volume = 0.45;
      audio.oncanplaythrough = () => {
        audio.play().catch(() => {
          playSynthesizedFallback(name);
        });
      };
      audio.onerror = () => {
        tryNext();
      };
      // Trigger load
      audio.load();
    };

    tryNext();
  } catch {
    playSynthesizedFallback(name);
  }
}
