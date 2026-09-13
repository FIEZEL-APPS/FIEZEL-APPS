# ANSWERS SFX report — answer_correct / answer_correct_perfect / answer_wrong / answer_wrong_retry

Producer: ANSWERS subagent. Generator: `generators/answers_gen.py` (deterministic,
seeded; modes `explore` / `final` / `x30`). Sources: OWNER brief §2C + §3
(`uploaded_attachments/c405e096ffae4b2aac5aa541a302301c/FIEZEL-SFX-Brief-2.pdf`),
`SFX-CONTRACT.md`, `lib/MOTIF.md` ("Ascent & Crown", F4-A4-C5-G5).

## Delivered files & metrics (exported masters, measured post-export)

| Sound | Duration | Peak dBFS | RMS dBFS (400 ms win) | Budget check |
|---|---|---|---|---|
| answer_correct | 0.795 s | -5.87 | -19.00 | <0.8 s ✔ · feedback -22..-18 ✔ |
| answer_correct_perfect | 1.116 s | -6.80 | -19.00 | 0.3–2 s ✔ · -22..-18 ✔ |
| answer_wrong | 0.719 s | -10.05 | -20.50 | 0.3–2 s ✔ · -22..-18 ✔ |
| answer_wrong_retry | 0.680 s | -11.22 | -21.02 | 0.3–2 s ✔ · -22..-18 ✔ |

All peaks ≤ -1 dBFS (nearest is -5.87, huge margin — no limiter engagement, no
clipping). WAV masters in `masters/`, OGG in `web/`, spectrogram PNGs in
`spectrograms/` (all four viewed: no clipping bars, no aliasing lines, soft
attacks, natural tails). Machine-readable metrics: `reports/answers_metrics.json`.

## Design rationale

### Brand DNA (motif quote, per task + MOTIF.md)
The correct family quotes the motif's **opening interval F→A (+M3)** — it plays
motif notes 1-2-3 (F-A-C) transposed **one octave up** (F5-A5-C6) so it reads as
a micro-gesture, never as the full brand statement, and deliberately **omits the
G "crown"** — the crown stays reserved for ceremonial sounds (lesson_complete,
level_up). Ending on C (the 5th) = resolved-but-light, no hard cadence to wear
out over hundreds of plays. answer_wrong sits on F3 (the motif root two octaves
down) — same tonal home, opposite register.

### answer_correct (THE most-heard sound — zero-fatigue design)
- **Voicing:** 3-note ascending arpeggio F5-A5-C6, 58 ms step (total gesture
  ~0.55 s audible), glockenspiel (hardness 0.28 = felt-soft strike) 56% +
  modern synth bell (FM index 1.05) 44%, +3% air layer, reverb wet 0.10,
  shimmer send 3.5%.
- **Anti-fatigue measures:**
  - *Soft attack transient:* low mallet hardness + gain_curve crescendo (first
    note is the quietest) → no startle spike; crest factor 15.3 dB stays in the
    soft-mallet zone.
  - *No piercing highs:* 2nd-order low-pass at 8.2 kHz caps the glock's 9.3 kHz
    partial; measured energy above 8 kHz in the shipped file = **0.017%** of
    total. Brightness lives at 0.7–3 kHz (fundamentals + first partials), which
    reads "bright" without treble fatigue.
  - *Resolved-but-light ending:* ends on the 5th, 40 ms fade, tail trimmed at
    -50 dB relative to shipped loudness (inaudible on phone speakers).

### answer_correct_perfect
Identical DNA (same notes, same glock+bell blend, slightly longer rings) +
sparkle: a sparse C7-centered shimmer_layer placed over the C6 ring, low-pass
raised to 9 kHz, shimmer send 10% → audibly "sparkly tail" (visible in the
spectrogram as light 8–13 kHz dots after 0.2 s) while staying obviously the
same family.

### answer_wrong (gentle, never punishing)
Single warm bonk: low marimba F3 (hardness 0.20) + felt `soft_thud` at the
**same f0** (deliberate — a detuned thud would beat against the marimba
fundamental) + a whisper of F2 pad for body. Low-passed at 5.5 kHz, reverb 6%.
Spectrogram confirms **no dissonant beating**: single smooth monotonic decay,
no interference striping, all energy below 2 kHz except a brief soft attack.
No minor 3rd, no semitone, no buzz — a warm "bonk", not a punishment.

### answer_wrong_retry ("coba lagi", more neutral)
Two-note **whole-step** descent C4→Bb3 (diatonic in F major). Chose the whole
step precisely because the minor-3rd descent (candidate wrong_B) reads "sad/
failed"; a whole step reads level/neutral — "hmm, try again". Mid register
(higher than answer_wrong = less "heavy"), drier (reverb 6%), tiny Bb4 bell for
a hint of forward motivation, quietest of the family at -21 dB RMS.

## Candidates considered (round 1 — rendered + spectrograms viewed in `qa/answers_candidates/`)

| Candidate | Idea | Verdict |
|---|---|---|
| correct_A_duet | 2 notes F5→A5, glock+bell | Clean but plain; the bare interval reads more "notification" than "reward". Rejected. |
| **correct_B_triad** | 3 notes F5-A5-C6, glock+bell, crescendo | **PICKED.** Clear ascending sparkle, energy centered 0.8–2 kHz, ends light on the 5th. |
| correct_C_warm | F4-A4-C5 celesta+bell (lower octave) | Warm but celesta's inharmonic 2.76 partial shows visible amplitude wobble/rough attack in the waveform; less "bright" than brief demands. Rejected. |
| **wrong_A_single** | single F3 marimba + matched-f0 thud | **PICKED.** Smooth single decay, zero beating, gentlest read. |
| wrong_B_desc | C4→A3 marimba m3 descent | Visible low-band interference striping after 2nd onset + m3 reads "sad". Rejected for answer_wrong; its *idea* (descent) survives in retry as a neutral whole step. |

## Round 2 iteration (after viewing round-1 spectra)
1. answer_correct: hardness 0.32→0.28 (even softer strike), bell mix 40→44%
   (more body vs. metal), step 62→58 ms (snappier), 8.2 kHz cap added.
2. answer_wrong: thud gain trimmed 0.45→0.38, +faint F2 pad, 5.5 kHz cap.
3. Duration bug found & fixed: first export measured 0.958 s for answer_correct
   because silence-trimming ran *before* RMS normalization (threshold too loose
   relative to shipped level). Fix: normalize → trim at -50 dB → fade; generator
   now asserts the <0.8 s budget. Re-exported: 0.795 s.

## Repetition QA (contract: x30 files, natural gaps)

Files (30 plays each, seeded human-ish gaps 0.55–0.95 s, `qa/`):
`answer_correct_x30.wav`, `answer_correct_perfect_x30.wav`,
`answer_wrong_x30.wav`, `answer_wrong_retry_x30.wav` (+ viewed
`answer_correct_x30.png` / `answer_wrong_x30.png`: identical soft envelopes, no
level creep, peaks -5.8/-9.9 dBFS, no limiter pumping even where tails overlap).

### Fatigue-metric analysis of the x30 streams (`reports/answers_x30_analysis.json`)

| Metric | answer_correct | correct_perfect | answer_wrong | wrong_retry | Why it argues non-fatigue |
|---|---|---|---|---|---|
| per-play RMS std (dB) | 0.008 | 0.017 | 0.029 | 0.008 | ≤0.03 dB — zero loudness surprises across 30 plays; unpredictable level jumps are a primary annoyance driver. |
| spectral flux mean (norm.) | 0.107 | 0.118 | 0.050 | 0.116 | Low mean flux = spectrum evolves gently; the stream is mostly smooth decay, not constant transient assault. |
| spectral flux p95 | 0.64 | 0.63 | 0.37 | 0.75 | Even the attack frames stay well under 1.0 (the single largest onset in the stream) — attacks are rounded, not clicky. |
| HF energy >8 kHz | 0.017% | 0.027% | 0.000% | 0.000% | Effectively no energy in the piercing band that causes treble fatigue on repetition (brief §2C rule). |
| crest factor (dB) | 15.3 | 14.7 | 12.6 | 11.6 | 11–16 dB = soft-mallet dynamics: enough transient to feel responsive, far from the ~20 dB+ "spiky click" zone and far from squashed/loud-flat. |

Interpretation: fatigue in repeated UI sounds comes from (a) loudness
inconsistency, (b) sharp broadband attacks, (c) sustained >8 kHz energy, and
(d) hard cadential endings. The measurements show (a)–(c) are near floor, and
(d) is addressed musically (ending on the 5th / single warm root). The x30
files are ready for human audition.

## Notes to Foundation / Integrator
- No lib/ bugs found; `arpeggio`, `soft_thud`, `shimmer_layer`, `export` all
  behaved as documented. (One doc nit: `trim_silence` thresholds are relative
  to the *current* signal level — generators should normalize before final trim,
  as done here.)
- Re-render everything with: `python generators/answers_gen.py final && python
  generators/answers_gen.py x30` (fully deterministic).
