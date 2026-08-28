# Progress & Reward SFX — production report

Producer: Progress & Reward subagent · Generator: `generators/progress_gen.py`
(deterministic, seeded 500/510/520/530/540, re-runnable) · Library: `lib/fzsynth.py`
(read-only) · Motif: locked "Ascent & Crown" (F4-A4-C5-G5, Fadd9 bed) from
`fzsynth.MOTIF` per `lib/MOTIF.md`.

## Sounds & design (brief §2E)

| name | brief requirement | design | motif derivation |
|---|---|---|---|
| `xp_gain` | <300 ms coin/tick, zero fatigue | single kalimba pluck C6 + coin partial G6, one soft onset (7.7 ms attack), dry | pitches = motif tones (C, G-crown) +8va; no melody, so no melodic wear-out |
| `streak_5` | rising phrase, medium energy, ~1 s | kalimba lead + light xylophone doubling, dry-ish, C6 glock ghost lift | motif notes 1-3 ONLY (F4-A4-C5, no crown) per MOTIF.md rule |
| `streak_10` | longer/more complex, escalating to full motif, ~1.5 s | same kalimba+xylo DNA: light echo of the 1-3 pickup run → FULL motif with G5 crown + glock G6 + thin F3/C4 pad | "completes" streak_5 — streak intensity variant (110 ms grid) |
| `lesson_complete` | 1.5-2 s fanfare, FULL CHORDS, thicker layers | marimba motif (160 ms grid) + opening F3-C4-F4 chord stab + crown Fadd9 mallet-ensemble chord (marimba strum + celesta 8va) + synth-bell doubling + glock + shimmer veil + pad bed | standard-intensity quote; chord bed = MOTIF `chord_bed` (Fadd9, no E/Bb) |
| `level_up` | THE most majestic, 2-3 s, orchestral-synth swell, tops exam_pass, warm | 0.85 s F2/C3/F3 swell + soft whoosh + 2.1 s wide-Fadd9 pad crescendo UNDER the motif → fanfare motif (190 ms grid, marimba+bell+glock 8va) → crown: full Fadd9 chord + celesta C5/F5/A5 + shimmer-layer crown, wet 0.20 reverb + shimmer send | fanfare-intensity variant; crown harmonized strictly per Fadd9 rule |

All F-major, no semitone clashes, mallet+synth-bell only (no strings/vocals).

## Metrics (mastered files, `rms` = max 400 ms window)

| name | dur (s) | spec dur | peak dBFS | RMS dBFS | RMS window | in window |
|---|---|---|---|---|---|---|
| xp_gain | 0.16 | <0.3 | -13.0 | -24.0 | -26..-22 | PASS |
| streak_5 | 1.13 | ~1 | -7.9 | -19.5 | -20..-17 | PASS |
| streak_10 | 1.65 | ~1.5 | -8.1 | -18.5 | -20..-17 | PASS |
| lesson_complete | 1.98 | 1.5-2 | -7.3 | -17.4 | -20..-17 | PASS |
| level_up | 2.90 | 2-3 | -3.8 | -16.4 | -19..-16 | PASS |

Peaks all ≤ -1 dBFS (ceiling enforced by `export`), 2 ms clickless fade-ins,
WAV masters in `masters/`, OGG (ffmpeg -q:a 4) in `web/`.

## Hierarchy proof (mandatory ladder check)

Demo: `qa/reward_hierarchy_demo.wav` — xp_gain → streak_5 → streak_10 →
lesson_complete → level_up with 800 ms gaps (spectrogram
`spectrograms/reward_hierarchy_demo.png`, viewed).

Fullness metrics: *octave bands lit* = of 8 octave bands 63 Hz-16 kHz, count with
mean power within 45 dB of the loudest band; *occupied bins %* = share of Welch
rFFT bins within 55 dB of the peak bin (wider = spectrally fuller).

| tier | duration (s) | RMS (dBFS) | octave bands lit | occupied bins % | layers |
|---|---|---|---|---|---|
| 1 xp_gain | 0.16 | -24.0 | 4 | 1.8 | 2 |
| 2 streak_5 | 1.13 | -19.5 | 7 | 18.1 | 3 |
| 3 streak_10 | 1.65 | -18.5 | 7 | 25.8 | 5 |
| 4 lesson_complete | 1.98 | -17.4 | 7 | 26.2 | 8 |
| 5 level_up | 2.90 | -16.4 | 8 | 49.1 | 10 |

- duration: strictly increasing → **monotonic PASS**
- RMS loudness: strictly increasing → **monotonic PASS**
- spectral fullness (occupied bins %): strictly increasing → **monotonic PASS**
  (octave-band count non-decreasing 4→7→7→7→8)
- musical escalation: 1 pluck → 3-note rise (no crown) → rise echoed + full
  4-note motif crowned → motif + full Fadd9 chords → swell + motif + chords +
  shimmer crown. Each tier audibly contains and exceeds the previous one.

### level_up vs exam_pass grandeur check (required: level_up must top it)

| file | dur (s) | peak | RMS | occupied bins % |
|---|---|---|---|---|
| exam_pass | 1.90 | -5.7 | -17.5 | 28.8 |
| exam_complete | 2.95 | -4.7 | -17.0 | 26.7 |
| **level_up** | **2.90** | **-3.8** | **-16.4** | **49.1** |

level_up is longer, louder, and spectrally fuller than exam_pass on every axis
(and louder/fuller than exam_complete) → **grandeur requirement PASS**. Warmth
kept: <200 Hz energy 15.3 %, all pitches F-major/Fadd9, no hard high-band energy.

## xp_gain non-fatigue analysis (`qa/xp_gain_x30.wav`, 30 plays, jittered 140-320 ms gaps)

- 160 ms total, single soft onset, attack-to-peak 7.7 ms (no click).
- Spectral centroid 1083 Hz; energy above 3 kHz ≈ 0.1 % → far below the
  harshness/sibilance region; no resonant ringing tail.
- Interval content: C6 + G6 = perfect fifth only (motif tones), zero semitone
  friction; no melodic phrase to wear out.
- Level -24 dBFS RMS (quietest tier by design); x30 sequence max-window RMS
  -25.2 dBFS, peak -13.0 dBFS — comfortable under everything else in a session.
- Spectrogram of x30 viewed: identical clean pulses, no cumulative buildup.

## Visual QA (contract: spectrograms VIEWED, ≥2 rounds)

- **Round 1 (viewed all 5 PNGs):** no clipping anywhere; found (a) over-long
  near-silent tails — streak_10 2.17 s vs ~1.5 s spec, level_up 3.56 s vs 2-3 s;
  (b) fullness dip: lesson_complete 24.6 % < streak_10 26.3 % (bass-heavy chords
  masked its top octave) → ladder not monotonic.
- **Fixes:** trim thresholds -64/-66 → -48..-52 dB with explicit fade-outs;
  shortened crown decays on level_up; brightened lesson_complete for real
  (bell 0.32→0.40, glock 0.17→0.22, celesta chord 0.20→0.26, +shimmer veil,
  shimmer send 0.07→0.08) and thinned streak_10 doubling (xylo 0.5→0.42,
  glock crown 0.22→0.18, shimmer send 0.04→0.03); streak_5 re-gridded to
  125 ms for a fuller ~1.1 s gesture.
- **Round 2 (viewed streak_5, streak_10, lesson_complete, level_up,
  reward_hierarchy_demo, xp_gain_x30):** clean tails, no clipping bars, no
  aliasing lines; ladder monotonic on all three metrics. xp_gain audio is
  bit-identical between rounds (deterministic, untouched) — round-1 view +
  x30 view cover it.

## Files

- `generators/progress_gen.py` (owner: this category)
- `masters/{xp_gain,streak_5,streak_10,lesson_complete,level_up}.wav`
- `web/{...}.ogg` (same five)
- `spectrograms/{xp_gain,streak_5,streak_10,lesson_complete,level_up,reward_hierarchy_demo,xp_gain_x30}.png`
- `qa/reward_hierarchy_demo.wav`, `qa/xp_gain_x30.wav`
- `reports/progress_metrics.json` (raw metrics dump)

## Notes to lib owner

None — no lib changes needed; `trim_silence` + `fade_out` combination covered
tail control fine.
