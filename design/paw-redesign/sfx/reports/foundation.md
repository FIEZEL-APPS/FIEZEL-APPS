# Foundation report — lib/fzsynth.py + signature motif

Status: COMPLETE. Library is locked; category generators may now import it
(read-only per contract). Brief + contract read in full before production.

## Deliverables

- `lib/fzsynth.py` — full numpy/scipy DSP toolkit (deterministic, seeded).
  Verified: numpy 2.5.2, scipy 1.18.1, matplotlib 3.11.1, ffmpeg 8.0.1 present.
- `lib/MOTIF.md` — locked motif spec + variation rules.
- `lib/README.md` — API docs for all 6 producer categories + limitations.
- `qa/foundation/` — 20 primitive demo spectrograms (`demo_*.png`),
  11 reference renders (`ref_*.wav` + viewed `ref_*.png`),
  motif shoot-out in `qa/foundation/motif_protos/` (3 candidates x 3 scales,
  WAV+PNG each).
- Process scripts kept for re-runs: `lib/_smoketest.py`, `lib/_motif_protos.py`,
  `lib/_final_renders.py`.

## LOCKED MOTIF: "Ascent & Crown" — F4 · A4 · C5 · G5 (F major)

Intervals +M3 +m3 +P5; three fast even pickups crescendo into a held add9
"crown" (G5) over an Fadd9 bed. Chosen over B (F4-C5-A4-F5 zigzag, generic
tonic-octave landing, muddy at mini scale) and C (C4-F4-A4 horn call, warm but
weak brand DNA). Full justification in `lib/MOTIF.md`.
API: `fz.MOTIF`, `fz.render_motif("mini"|"streak"|"standard"|"splash"|"fanfare")`.

## Reference render QA metrics (all viewed: no clipping, no aliasing, clean tails)

| file | dur (s) | peak dBFS | RMS dBFS |
|---|---|---|---|
| ref_marimba_F4 | 1.57 | -10.46 | -20.03 |
| ref_xylophone_A4 | 1.29 | -6.55 | -20.07 |
| ref_glockenspiel_G5 | 2.28 | -11.14 | -20.01 |
| ref_celesta_C5 | 1.87 | -11.94 | -20.02 |
| ref_kalimba_F4 | 1.38 | -9.90 | -20.03 |
| ref_synthbell_C5 | 2.04 | -9.57 | -20.01 |
| ref_motif_mini | 1.73 | -12.09 | -23.00 |
| ref_motif_standard | 2.19 | -7.63 | -20.00 |
| ref_motif_fanfare | 3.89 | -6.18 | -18.00 |
| ref_motif_splash | 2.58 | -7.62 | -19.00 |
| ref_motif_streak | 1.69 | -8.91 | -20.00 |

Note: durations include natural reverb tails; the mini motif GESTURE completes
in ~0.35 s (4 onsets), satisfying the 300 ms scalability constraint — trim the
tail harder (`trim_silence(y, -54, 40)`) if a hard <0.5 s asset is required.
Determinism verified (`np.array_equal` on repeated renders). `export()` verified
writing masters/*.wav (44.1k/16-bit) + web/*.ogg (test files removed after check).

## Library limitations for downstream generators (also in README §Known limitations)

1. Cat textures are procedurally synthesized (FM chirp, ~26 Hz AM purr,
   vibrato trill, formant-glide meow) — no real cat recordings exist in this
   environment. Brief §G pipeline (morph → formant shift → 1-3 kHz carve →
   70-80/20-30 blend) is fully implemented (`morph_paw`); document honestly.
2. Pitch shifting is resample-based — use for sends/textures, not melodies.
3. Reverb is mono Schroeder small-room; keep wet ≤0.25.
4. Producers return peak-safe audio but final loudness MUST be set via
   `export(rms_target=...)` (micros -26..-22, feedback -22..-18, fanfare -20..-16).
