/**
 * Plays real FIEZEL audio SFX from /assets/audio/sfx/ with safe fallback
 */
export type FiezelSfxName =
  | 'button_tap'
  | 'lesson_start'
  | 'answer_correct'
  | 'answer_wrong'
  | 'lesson_complete'
  | 'xp_gain';

export function playFiezelSfx(name: FiezelSfxName): void {
  try {
    const audio = new Audio(`/assets/audio/sfx/${name}.mp3`);
    audio.volume = 0.45;
    void audio.play().catch(() => {
      // Ignore autoplay restriction errors
    });
  } catch {
    // Ignore audio errors in headless environments
  }
}
