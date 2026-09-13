# EXAMS category report (brief §2D) — exam_complete / exam_pass / exam_result_reveal / exam_score_tick

Producer: EXAMS SFX subagent. Generator: `generators/exams_gen.py` (deterministic,
seed base 700, re-runnable). Library: `lib/fzsynth.py` (read-only, no changes
requested). Motif material derived exclusively from `fz.MOTIF` ("Ascent & Crown",
F4-A4-C5-G5) per lib/MOTIF.md — never re-invented.

## Final metrics (all masters 44.1 kHz/16-bit WAV + OGG q:a 4)

| File | Duration | Peak dBFS | RMS dBFS (max 400 ms win) | Target band | OK |
|------|----------|-----------|---------------------------|-------------|----|
| exam_complete | 2.95 s | -4.7 | **-17.0** | fanfare -20..-16 | ✔ |
| exam_pass | 1.90 s | -5.7 | **-17.5** | fanfare -20..-16 | ✔ |
| exam_result_reveal | 1.45 s | -7.4 | **-19.0** | feedback/transition -22..-18 | ✔ |
| exam_score_tick | 0.032 s | -11.4 | **-24.6** | UI micro -26..-22 | ✔ |

All spectrogram PNGs (`spectrograms/exam_*.png`) rendered and VIEWED: no
clipping bars at ±1.0, no aliasing lines, clean faded tails.

## 1) exam_complete — arrangement & review rounds

Weightiest sound in the app. Structure: **build-up (0-0.72 s)** low Fadd9 swell
F2/C3/F3/G3 + rising whoosh 160→2000 Hz + 3-note marimba pickup run (F3-C4-F4,
crescendo) → **main hit (0.72 s)** marimba F2+F3 octave slam + 87 Hz soft sub
thud + synth-bell F4 sheen → **fanfare motif** (190 ms grid per MOTIF.md):
marimba lead + synth bell + glockenspiel octave doubling, crescendo weights
0.8→1.0 → **crown**: full Fadd9 marimba chord bed (F3-C4-F4-A4-G4, no E/Bb per
harmony rule) + F3/C4/A4 pad + shimmer sparkles under the held G5. Reverb wet
0.20 room 0.65 + shimmer send 0.07. Gravity = sub thud + low swell + wide bed;
warmth (marimba/pad/airy add9) avoids corporate stiffness.

- **Review round 1 (viewed):** no clipping, but 3.78 s (over the 3 s brief
  ceiling), whoosh hiss too prominent across the full spectrum in the build-up,
  and the main hit was NOT the largest transient (crown outweighed it).
- **Round 2 fixes:** whoosh gain 0.24→0.17 and top capped 2.4→2.0 kHz; main-hit
  gains raised (F2 0.85→1.05, thud 0.55→0.75, hardness 0.6→0.65); crown/bed/pad
  durations shortened; trim at -58 dB + hard 2.95 s cap + 180 ms fade-out.
- **Round 2 (viewed, approved):** main hit at 0.72 s is now the biggest
  waveform transient, crown crests at ~1.45 s, tail decays cleanly to 2.95 s.

## 2) exam_pass — celebratory + reserved space for paw_celebrate

Fast bright xylophone+kalimba run F4-A4-C5-F5 (75 ms steps, crescendo) into a
full F-major chord hit (marimba F3-A3-C4-F4-A4 + bells F4/F5 + glock F6 +
short pad + shimmer). Fully major, energetic, 1.90 s.

**Sonic space for paw_celebrate:** a smooth **-8 dB EQ carve across 1-3 kHz**
(`fz.eq_carve`) is baked into the master, because paw_celebrate's morphed-meow
signature lives in that vocal-formant band. Measured on the normalized master:
band RMS **1-3 kHz = -38.2 dBFS** vs below-1 kHz = -23.2 dBFS and above-4 kHz
= -47.5 dBFS → **15 dB of headroom in 1-3 kHz** relative to the chord body.
exam_pass energy is deliberately concentrated <1 kHz (chord/pad body) with
sparkle >4 kHz, so paw_celebrate can be overlaid (start it 0-150 ms after
exam_pass onset) or sequenced immediately after without masking.

## 3) exam_result_reveal — drumroll-mini + handoff design note

NOT a real drumroll: **14 soft marimba strikes with geometrically accelerating
gaps (118 ms → 34 ms)** climbing the F-major pentatonic F4→D6→(loop back)→C6,
with hardness rising 0.25→0.75 (rising brightness/filter tension), celesta
doubling on the last 4 strikes, and a quiet 250→3200 Hz whoosh underneath.
1.45 s, reverb wet 0.12 only.

**Reveal→pass handoff design (required note):** the sequence ends **suspended
on C — the dominant of F — over a faint C4+G4 pad wisp, with NO tonic and NO
motif crown**, and the tail is truncated with a 130 ms fade. Because it parks
on V:
- **exam_pass** (which opens on tonic-F material) resolves it as a perfect
  V→I arrival — start exam_pass 50-150 ms before the reveal file ends
  (its tight fade guarantees no smearing overlap);
- a **neutral resolve** (no pass) also works: C is stable enough to simply
  decay, or a single soft marimba F4/A4 dyad can close it without any sense
  of celebration — nothing in the ending promises a fanfare.
Verified in `qa/exam_reveal_pass_handoff_demo.wav` + viewed spectrogram
(`spectrograms/exam_reveal_pass_handoff_demo.png`): reveal tension peaks at
~0.9 s, decays, exam_pass enters at 1.35 s (100 ms overlap) with no spectral
clash or level jump (demo peak -5.7 dBFS).

## 4) exam_score_tick — micro tick + count-up + non-fatigue analysis

Base tick: `fz.tick` at **C6 (1046.5 Hz), 32 ms** (<80 ms budget), tone 0.55.
Pitch-steppable by construction — `build_exam_score_tick(f0)` regenerates at
any frequency; the UI can also cheaply playbackRate-shift the single master.

**Count-up demo** `qa/exam_score_countup_demo.wav` (+ viewed spectrogram):
15 ticks, 55 ms apart, rising per tick along a **two-octave major-scale climb
C6→C8** (semitone offsets 0..24). Round-1 review used a wider pentatonic climb
reaching ~7 kHz fundamentals — read as shrill on the spectrogram, so the climb
was capped at C8 (4186 Hz): still clearly "rising toward the final score",
never piercing.

**Repetition QA** `qa/exam_score_tick_x30.wav`: 30 plays with natural
deterministically-jittered gaps (140-210 ms).

**Non-fatigue analysis:** duration 32 ms (too short to develop annoyance);
spectral centroid **1132 Hz** (comfort zone — far below the 3-5 kHz ear-
sensitivity/harshness peak); energy 96.6 % in 500-2000 Hz, only 0.3 % in
5-8 kHz and ~0 % above 8 kHz (no hiss/sizzle to accumulate); crest factor
13.2 dB (soft transient, not a spike); RMS -24.6 dBFS (quiet UI-micro level);
pure decaying tone with no beating partials. The x30 audition file shows no
level buildup (max-window RMS -30.2 dBFS). Verdict: fatigue-proof for rapid
count-up use.

## Outputs

- Masters: `masters/exam_{complete,pass,result_reveal,score_tick}.wav`
- Web: `web/exam_{complete,pass,result_reveal,score_tick}.ogg`
- QA: `qa/exam_score_countup_demo.wav`, `qa/exam_score_tick_x30.wav`,
  `qa/exam_reveal_pass_handoff_demo.wav`
- Spectrograms (all viewed): `spectrograms/exam_complete.png`, `exam_pass.png`,
  `exam_result_reveal.png`, `exam_score_tick.png`,
  `exam_score_countup_demo.png`, `exam_reveal_pass_handoff_demo.png`

No lib/ fix requests. Integrator note: preload exam_result_reveal + exam_pass
together; trigger pass at `reveal_duration - 0.10 s` for the V→I handoff.
