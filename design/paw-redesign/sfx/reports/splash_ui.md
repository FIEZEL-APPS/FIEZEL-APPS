# SPLASH & UI SFX — Production Report

Owner: Splash & UI producer · Generator: `generators/splash_ui_gen.py` (deterministic, seed 20260828, re-runnable; `--iters` re-renders round-1 splash candidates) · Date: 2026-08-28

## 1. Delivered files & metrics (from `fz.export` / `fz.analyze`, max-400ms-window RMS)

| name | dur (s) | peak dBFS | RMS dBFS | target RMS | in spec |
|---|---|---|---|---|---|
| splash_intro | 1.960 | -7.92 | -18.00 | -20..-16 (fanfare band) | YES (dur 1.5–2 s ✓) |
| button_tap | 0.058 | -5.64 | -24.66 | -26..-22 (UI micro) | YES (<150 ms ✓) |
| lesson_start | 0.660 | -12.26 | -23.00 | -26..-22 | YES (400–700 ms ✓) |
| page_transition | 0.360 | -10.94 | -25.00 | -26..-22 | YES (300–500 ms ✓) |
| error_system | 0.572 | -8.97 | -23.00 | -26..-22 | YES (400–600 ms ✓) |
| stamp_thud | 0.388 | -4.77 | -18.52 | impact/feedback weight | YES (≤400 ms ✓) |

All: WAV 44.1 kHz/16-bit in `masters/`, OGG (`-q:a 4`) in `web/`, peak ≤ -1 dBFS, 2 ms clickless fade-in via export, spectrogram PNGs in `spectrograms/` — every PNG visually inspected (no clipping bars, no aliasing lines, clean tails). PNGs plot the **exported** signal (post normalize/limit).

## 2. splash_intro — v4 auto-flow timeline mapping (for the Integrator)

Structure derived from `splash-prototype/NOTES.md` §1/§7 (v4 auto-flow: particle formation → equalizer → auto paw stamp @2200). Play splash_intro at **t0 = 0 of FZSplash.clock**; sound-internal times = clock times:

| sound time (ms) | sound event | splash beat anchor (NOTES.md) |
|---|---|---|
| 0–660 | airy swell (F3/C4/F4 pad + soft 240→2000 Hz whoosh + air), no transient | 0–950 particle cloud gathers the F |
| 700 | motif note 1 — F4 (celesta+bell) | F SVG crossfade begins ~820 (note rings into it) |
| 880 | motif note 2 — A4 | F crossfade completes 944 / `f-locked` @950 |
| 1060 | motif note 3 — C5 | gold-bar SVG crossfade 1060–1150 |
| 1300 | **crown G5** (celesta 1.7 s + bell + octave glock glint) | `bars-solid`/equalizer already running (1150–1900) — crown = the equalizer's musical fuel |
| 1420–1960 | shimmer sparkles + Fadd9 pad bed (F3–C4–G4, no E/no Bb per MOTIF.md) ring out, 140 ms fade | equalizer dance → `settle` @1900–2140 lands as the tail dies |
| (silence) | — | auto `pawstamp.play()` @2200 → **stamp_thud** is the SLAM hit (separate file, see §5) |

Onsets 700/880/1060 also give `sfx.getLevels(t)` real per-beat energy in the 700–1300 window the equalizer reads. Motif pitches taken from `fz.MOTIF` (LOCKED "Ascent & Crown", F4-A4-C5-G5) — never re-invented; instrumentation follows the MOTIF.md splash row (celesta + synth bell, wetter reverb 0.18, shimmer send).

## 3. splash_intro musicality iterations (2 rounds, artifacts kept)

**Round 1 — two arrangements** (renders: `qa/splash_ui_iters/splash_r1_{A,B}.wav`, spectrograms `spectrograms/iter_splash_r1_{A,B}.png`, both viewed):

- **A** = stock `render_motif("splash")` delayed 150 ms + extra swell → onsets 700/850/1000/1150, crown exactly on bars-solid. Verdict: whoosh top end hissy to ~12 kHz, motif clusters early (all 4 notes inside 450 ms), crown-at-1150 leaves the 1300–1900 equalizer window carried by tail only. Feels rushed, less "reveal".
- **B** = custom arrangement from `fz.MOTIF` data, broadening onsets 700/880/1060/1300 (slight ritardando into the crown). Verdict: clear crescendo into the crown (waveform peak lands on G5 = premium reveal), beats align with the F/bars crossfades, crown drives the equalizer window. **Chosen.**

**Round 2 — refinements on B** (final `splash_intro`): swell gain 0.55→0.70 and lengthened 0.72→0.80 s (opening read too faint against the motif); whoosh retuned 280–2600 → 240–2000 Hz and gain 0.26→0.20 (killed the hiss); crown bell gain 0.32→0.42 + celesta 1.5→1.7 s (ring audibly bridges 1300→1900); shimmer layer moved to 1420 ms (settle feel); hard cap 1.96 s + 140 ms fade-out (stays inside the 1.5–2 s brief window and out of the stamp's way). Final spectrogram re-viewed: clean.

## 4. UI micros — design notes

- **button_tap**: felt/wooden, nearly non-musical — soft noise click (1.4 kHz color) + heavily damped 660 Hz woody knock (tone 0.38, so mostly click) + tiny 185 Hz felt body. 58 ms, dead by ~30 ms.
- **lesson_start**: "mulai fokus" = rising P5, F4→C5 marimba (motif root → its C5 tone) with a quiet bell on the arrival; dry-ish (reverb 0.10), capped 0.66 s. Deliberately quotes only motif *pitch vocabulary*, not the 4-note gesture (that stays reserved for reveals/rewards).
- **page_transition**: single soft 420→1500 Hz band whoosh + faint air, 0.36 s, normalized to the quietest target (-25) for "optional feel". No pitch content → never clashes with whatever screen music/SFX follows.
- **error_system**: technical-neutral, distinct from answer_wrong (which is a playful pitched bonk): two **muted near-sine tones E4→D4** (soft whole-step down — outside the F-major motif gesture, non-dissonant per brief §3.2) with a slight filtered-noise underlay per tone, dull FM timbre (mod_ratio 2, index 0.35), no shimmer, reverb 0.06. Zero cuteness, zero energy above ~6 kHz.

## 5. stamp_thud — paw slam impact (replaces the old oscillator thud)

Pitched sub thud: exponential sine sweep **110→48 Hz over 120 ms** then held at 48 Hz, 4 ms attack, t60 0.26 s, soft tanh saturation (1.7×) for weight without cheap-boom distortion; + soft 750 Hz noise contact burst + tiny 2.3 kHz pad tick; reverb 0.05; 0.388 s total. Peak -4.8 dBFS / RMS -18.5 gives it clear impact authority over the UI micros while respecting the -1 dBFS ceiling.

**Wiring note (Integrator):** fire on pawstamp **SLAM (t=300 ms after auto `play()` @2200**, i.e. absolute ~2500 ms); reduced-motion path fires its short stamp thud @320 ms after entry per NOTES.md. `stamp_thud` is not in the brief §2 name list — it's the v4 splash slam impact commissioned to replace the old oscillator thud; kept as a separate file so the integrator can mix it against splash_intro's tail independently.

## 6. button_tap repetition QA (non-fatigue)

- `qa/button_tap_x30.wav` — 30 plays, deterministic jittered gaps 350–550 ms (seeded), 14.35 s, for human audition.
- Spectral analysis of the master (windowed FFT of the full exported file):
  - spectral centroid **468 Hz**, 95 % energy roll-off **675 Hz** → energy lives in the felt/wood band, far from the 2–5 kHz annoyance region;
  - harsh-band (2–5 kHz) energy share **0.9 %**, sparkle (>6 kHz) share **0.0 %** → nothing to sting on repeat;
  - spectral flatness 0.0001 & tonal-peak 66 dB over median: the energy is concentrated at the low thud component — but it decays in <30 ms, is quiet (-24.7 RMS), and has no ringing partials (spectrogram: silent by 35 ms). Caveat: the tonal-peak figure is inflated by the mostly-empty FFT of a 58 ms signal; the audible reality is a dull tick, not a tone.
  - Per-hit variance across the ×30 file is zero by construction (identical sample); fatigue-proofing comes from darkness + brevity + low level, not per-play variation.

## 7. Honest notes / limitations

- splash_intro peak sits at -7.9 dBFS after RMS normalization to -18 (no limiting engaged) — headroom is intentional; raise via rms_target only, never peak-normalize.
- rms figures for sounds <400 ms are whole-signal RMS (lib behavior) — stated targets applied accordingly.
- Round-1 iteration renders were loudness-matched to -18 RMS for fair A/B audition; they are **not** masters.
- No lib changes needed; no requests to Foundation.
