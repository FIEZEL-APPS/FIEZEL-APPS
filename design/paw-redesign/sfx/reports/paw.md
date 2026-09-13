# PAW SFX report — raw-texture category (v3, OA-8/OA-9) — §G morph history below

Status: COMPLETE (v3). Generator: `generators/paw_gen.py` (deterministic,
fixed seeds; default mode `raw-polished` reproduces all masters, the promo
texture library, QA assets and metrics JSON in one run).

---

## v3 (2026-08-28) — OWNER RULING OA-8: RAW textures, lightly polished

**Ruling:** the OWNER prefers the RAW cat textures over the §G deep-morphed
versions for the four PAW SFX — *"pakai yang mentah aja, tapi polish sedikit
aja"*. The chirp/trill/purr/meow character must stay clearly audible and
charming. Polish permitted: gentle EQ (mud/harshness only), soft fades, a
tasteful hint of shimmer/reverb tail, loudness normalization to contract
bands. **Banned:** spectral morphing, formant shifting, the 1-3 kHz carve,
instrument dominance. The textures are additionally the OWNER's **permanent
raw material for promo content** → new promo library `sfx/textures/`
(raw + polished + web OGG + Indonesian README with provenance/determinism).

**Same-day ruling OA-9:** `paw_greet` is **THE FIEZEL signature sound**
("suara khas FIEZEL") — crafted with extra care (see below) — and
**`stamp_thud` is RETIRED**: the splash slam moment now plays `paw_greet`.
Applied: `masters/stamp_thud.wav` archived to `qa/retired/` (+ an `.ogg`
copy); `web/stamp_thud.ogg` deliberately **left in place for compatibility**
but marked RETIRED in the docs; `splash-prototype/js/sfx.js` `MANIFEST.thud`
remapped `stamp_thud.ogg` → `paw_greet.ogg` (comments updated, API name
`'thud'` kept so `pawstamp.js` needs no change).

### What changed

- **Masters/web OVERWRITTEN** with raw-polished renders (paw_greet,
  paw_appear = splash_paw_appear, paw_encourage, paw_celebrate). The §G
  morphed v2 renders are **archived, not deleted**:
  `qa/paw/morphed-v1/{masters,web,spectrograms}/` + the old A/B demo
  (`paw_morph_ab_demo.wav/.png`).
- **Generator** rewritten: default mode `raw-polished`; the full §G morph
  pipeline is kept runnable as history via `--mode morph-history`.
- **QA audition:** `qa/paw_morph_ab_demo.wav` is replaced by
  `qa/paw_final_audition.wav` (all 4 finals in sequence, 6.87 s;
  spectrogram `qa/paw/paw_final_audition.png` viewed).
- **Promo texture library** built at `sfx/textures/` (chirp/trill/purr/meow,
  raw full-length + polished + OGG each, 8 spectrograms viewed).
- New splash-prototype copies: 5 fresh `.ogg` into
  `splash-prototype/assets/sfx/` (overwrite).

### v3 master metrics (all spectrograms VIEWED: no clipping, clean tails, character intact)

| file | dur (s) | window | peak dBFS | RMS dBFS | target RMS | character (AM retention vs raw)\* |
|---|---|---|---|---|---|---|
| `masters/paw_greet.wav` + `.ogg` | 0.880 | 0.6–0.9 ✓ | −9.47 | −20.0 | −22..−18 ✓ | chirp vibrato 38 Hz: 0.94 |
| `masters/paw_appear.wav` + `.ogg` | 0.680 | 0.5–0.7 ✓ | −9.02 | −20.0 | −22..−18 ✓ | trill roll 24 Hz: 1.42 |
| `masters/splash_paw_appear.wav` + `.ogg` | 0.680 | (same asset) | −9.02 | −20.0 | — | — |
| `masters/paw_encourage.wav` + `.ogg` | 1.480 | 1.2–1.5 ✓ | −11.76 | −22.0 | −24..−20 ✓ | purr AM 26 Hz: 0.95 (depth 0.285→0.269) |
| `masters/paw_celebrate.wav` + `.ogg` | 1.780 | 1.2–1.8 ✓ (audit floor 1.5 ✓) | −13.29 | −19.0 | −22..−18 ✓ | meow arc 12 Hz: 1.39 |

\* the same envelope-modulation metric used in v2 as a *removal* proxy, now
read as a **retention** check: ≈1.0 (or >1) = the animal fingerprint
survives intact — the exact opposite verdict of §G, as ruled. The 1-3 kHz
vocal band is untouched by design (greet 0.129, appear 0.084, celebrate
0.048 energy fraction — raw-texture-like; encourage's purr has none, its
fingerprint is the 26 Hz AM).

### Polish applied per sound (complete list — nothing else)

| sound | recipe | polish |
|---|---|---|
| `paw_greet` **(FIEZEL signature, OA-9)** | 2 raw chirps F4→A4 (motif notes 1-2), 0.20 s apart, second chirp leads (gain 0.88/1.0) | HP 170 Hz (mud), high-shelf −2.5 dB >9.5 kHz (synthetic breath hiss), reverb wet 0.09, **shimmer send 0.04 = premium sheen (extra-care touch)**, tight −54 dB trim for snap, fades 5/70 ms, RMS −20 |
| `paw_appear` (+ splash alias) | 1 raw trill ~C5 (0.34 s, 24 Hz roll) | HP 200 Hz, high-shelf −2.5 dB >10 kHz, reverb wet 0.11, fades 5/60 ms, RMS −20 |
| `paw_encourage` | raw purr F2, 1.32 s, 26 Hz AM | HP 32 Hz (rumble only — keeps the 87 Hz body), high-shelf −3 dB >4.5 kHz, warm reverb wet 0.10 room 0.6, slow fades 22/140 ms, RMS −22 |
| `paw_celebrate` | raw energetic meow F4 (1.25 s, arc peaks ≈C5) + OPTIONAL very light shimmer accent (`shimmer_layer` C6 gain 0.07 @0.55 s) | HP 150 Hz, high-shelf −2 dB >9.5 kHz, reverb wet 0.12 room 0.6, shimmer send 0.04, fades 5/120 ms, RMS −19 |

Clickless: generator fades + `export()`'s 2 ms guarantee; peaks all ≤ −9 dBFS
(ceiling −1 dBFS never engaged). Zero-phase (filtfilt) high-pass keeps the
chirp/trill attacks unsmeared.

### paw_greet — extra care notes (OA-9 signature sound)

Two-chirp F4→A4 gesture = motif notes 1-2, so the brand's sonic DNA and its
mascot's literal voice are now the same object. Design decisions: higher
second chirp carries the peak (rising, optimistic contour); a 0.04 shimmer
send adds the "premium" sheen without masking the chirp (allowed "hint of
shimmer"); tail trimmed at −54 dB so the sound stays snappy (0.88 s incl.
tail) for its new double duty as the splash-slam sound (splash budget slot
~520→880 ms — verified against the 2200 ms auto-stamp: contact +300 ms +
880 ms tail ends ≈3.68 s absolute, still inside the onboarding fade window,
and the greet's bright band clears splash_intro's faded pad bed).

### Handoff notes (v3)

- `qa/acceptance_audit.py` (QA-owned) still carries the v2 expected tuples
  for the 5 paw files + a `stamp_thud` masters row — needs a QA refresh to
  the v3 table above (durations/peaks/RMS all inside the same contract
  bands, so only the cross-check tuples change; stamp_thud master now lives
  in `qa/retired/`).
- The v2 overlay evidence (`qa/paw/overlay_*.wav`) was rendered against the
  morphed paw_celebrate; the raw meow carries more 1-3 kHz energy (0.048 vs
  0.013), still ~½ of exam_pass's own band share — re-render the overlays at
  integration if the stacked moment feels crowded, and keep the optional
  −2..−3 dB duck available.
- OI-2 (human blind test §G.7) is MOOT under OA-8 — there is nothing to
  disguise anymore.

---

# HISTORY — v1/v2 §G morphed design (SUPERSEDED by OA-8, kept verbatim)

Brief §G + §3.8 read in full (PDF pages 3-5), contract, lib/README.md and
lib/MOTIF.md read before production. The archived morphed renders live in
`qa/paw/morphed-v1/`; re-render via `--mode morph-history`.

## Honesty statement (contract-mandated)

The cat textures are **procedurally synthesized** by `lib/fzsynth.py` — FM
chirp with formant coloration, ~26 Hz AM purr, 24 Hz vibrato trill,
formant-glide meow. **No real cat recordings exist in this environment.** The
§G morphing pipeline itself is implemented faithfully; the "organic soul" is an
approximation of what real samples would give.

## §G pipeline as implemented (per sound, NOT plain layering)

1. **Raw texture** — synthesized directly *at the target instrument note f0*
   and *at the target duration* (parametric pitch/time alignment = §G steps 1-2;
   cleaner than post-hoc resampling, which lib README forbids for melodic use).
2. **Spectral morph** — `fz.stft_morph(texture, instrument, alpha)`:
   log-magnitude cross-synthesis, phase taken from the instrument.
3. **Formant shift** — `fz.formant_shift(·, factor)`, formants moved up/away
   from animal-vocal character.
4. **EQ carve** — `fz.eq_carve(·, 1000, 3000, depth_db)` over the
   meow-recognition band.
5. **Final blend** — instrument × (1−blend) + morphed texture × blend·1.4
   (identical math to `fz.morph_paw`, re-implemented step-by-step in the
   generator so pre-carve intermediates are measurable). blend 0.16-0.28 →
   instrument 72-84 % dominant, morphed texture 16-28 % "soul" — inside the
   brief's 70-80/20-30 window.

DEEP sounds additionally low-pass the morphed texture layer
(`tex_lp` below) as an extra de-vocalization stage before blending.

## Deliverables & master metrics (all spectrograms VIEWED: no clipping bars, no aliasing lines, clean tails)

| file | dur (s) | peak dBFS | RMS dBFS | target RMS | duration spec |
|---|---|---|---|---|---|
| `masters/paw_greet.wav` + `web/paw_greet.ogg` | 0.850 | −8.91 | −20.0 | −22..−18 ✓ | 600-900 ms ✓ |
| `masters/paw_appear.wav` + `web/paw_appear.ogg` | 0.680 | −9.18 | −20.0 | −22..−18 ✓ | 500-700 ms ✓ |
| `masters/splash_paw_appear.wav` + `.ogg` | 0.680 | −9.18 | −20.0 | (same asset) | — |
| `masters/paw_encourage.wav` + `.ogg` | 1.450 | −12.35 | −22.0 | −24..−20 ✓ | 1-1.5 s ✓ |
| `masters/paw_celebrate.wav` + `.ogg` | 1.950 | −8.89 | −19.0 | −22..−18 ✓ | 1.5-2 s ✓ |

**Dual-slot note:** `splash_paw_appear` is the *same rendered asset* as
`paw_appear`, exported under both contract names (task requirement — the
splash pop-in slot and the PAW pop-in slot share one sound). If the Integrator
later wants a splash-specific variant, re-run with a different seed set.

Spectrograms: `spectrograms/paw_{greet,appear,encourage,celebrate}.png`,
`spectrograms/splash_paw_appear.png` (finals, as exported);
raw-texture references `qa/paw/<name>_raw_texture.{png,wav}`;
iteration-1 renders `qa/paw/iter1/<name>_v1.{wav,png}`;
metrics dump `qa/paw/paw_metrics.json`.

## Per-sound design & morph parameters

### paw_greet — LIGHT morph (chirp + kalimba/marimba), 0.85 s
Two plucks **F4 → A4** = motif notes 1-2 ("Ascent & Crown" quote → brand
continuity). Instrument per note: kalimba 1.0 + marimba 0.30. Texture: one
`cat_chirp` per note at the note's f0, 0.30 s. Reverb wet 0.10.

| iter | alpha | formant | carve dB | blend | chirp rise |
|---|---|---|---|---|---|
| v1 | 0.60 | 1.20 | −6 | 0.32 | 1.8 |
| **v2 (FINAL)** | **0.66** | **1.30** | **−9** | **0.28** | **1.5** |

### paw_appear = splash_paw_appear — MEDIUM morph (trill + music box), 0.68 s
Celesta grace **A4 → C5** + faint glockenspiel C6 sparkle (music-box color).
Texture: `cat_trill` at C5/1.2 (its sweep centers on the celesta note), 0.34 s,
24 Hz roll. Reverb wet 0.13.

| iter | alpha | formant | carve dB | blend |
|---|---|---|---|---|
| v1 | 0.72 | 1.35 | −10 | 0.26 |
| **v2 (FINAL)** | **0.78** | **1.45** | **−12** | **0.22** |

### paw_encourage — DEEP morph (purr + celesta/pad), 1.45 s
Warm F-major pad (F3-C4-F4, 0.30 s attack) + two very soft felt celesta notes
(F4, A4). Texture: `cat_purr` pitch-aligned to **F2** (harmonics sit inside the
F-major bed), full pad duration, 26 Hz AM. Reverb wet 0.16, 25 ms fade-in.
Lands as a near-ambient pad per brief.

| iter | alpha | formant | carve dB | blend | tex LP |
|---|---|---|---|---|---|
| v1 | 0.84 | 1.50 | −13 | 0.20 | — |
| **v2 (FINAL)** | **0.88** | **1.55** | **−15** | **0.16** | **2.6 kHz** |

### paw_celebrate — DEEP morph, vocoder-style fusion, 1.95 s
Carrier: major synth-pad chord on the **Fadd9 bed F3-C4-F4-A4-G4** (MOTIF.md
harmony rule — no E/Bb, crown-safe) + synth-bell F5. Modulator: energetic
`cat_meow` at F4 (its arc peaks ≈ C5, staying inside the chord), 1.2 s.
`stft_morph` with phase from the pad carrier **is** the vocoder-style fusion:
the meow's pitch melts into the chord. Motif shimmer: quiet glockenspiel quote
of motif notes 3-4 (**C5 → crown G5**) + shimmer grains at C6 + shimmer send.

| iter | alpha | formant | carve dB | blend | meow dur | tex LP |
|---|---|---|---|---|---|---|
| v1 | 0.80 | 1.50 | −12 | 0.22 | 1.0 s | — |
| **v2 (FINAL)** | **0.86** | **1.55** | **−14** | **0.18** | **1.2 s** | **5.2 kHz** |

**Spectral-space check vs exam_pass / level_up:** at design time no reports
for those sounds existed, so the 1-3 kHz band was kept modest by design
(final 1-3 kHz energy fraction **1.3 %**, dominant energy < 1 kHz pad chord +
sparkle > 4 kHz). Their masters landed (parallel producers) before sign-off,
so the check was **completed against the actual files**:

| overlay (paw_celebrate starts +0.15 s) | their 1-3k frac | paw 1-3k frac | summed peak | summed RMS |
|---|---|---|---|---|
| exam_pass + paw_celebrate | 0.030 | 0.013 | −2.66 dBFS (no clip) | −14.3 dBFS |
| level_up + paw_celebrate | 0.127 | 0.013 | −3.97 dBFS (no clip) | −16.2 dBFS |

paw_celebrate carries 2-10× less mid-band energy than either fanfare — no
1-3 kHz masking clash; overlay spectrograms viewed, both events stay legible.
Evidence: `qa/paw/overlay_{exam_pass,level_up}_plus_celebrate.{wav,png}`.
Integrator may still duck paw_celebrate −2..−3 dB in the stacked moment if
the combined level feels hot on phone speakers.

## Blind-test proxy (§G.7) — objective findings, 2 documented iterations

Metrics per iteration (full JSON in `qa/paw/paw_metrics.json`):
**band frac** = share of total spectral energy in 1-3 kHz; **AM depth** =
envelope-spectrum peak at the texture's signature animal rate relative to
envelope DC (chirp vibrato 38 Hz, trill roll 24 Hz, purr 26 Hz, meow arc 12 Hz).

| sound | 1-3k frac: raw tex → pre-carve → FINAL | carve step | vs raw | AM depth raw → FINAL |
|---|---|---|---|---|
| paw_greet v2 | 0.118 → 0.001 → 0.003 | −9.6 dB\* | **−15.7 dB** | 0.025 → 0.010 |
| paw_appear v2 | 0.081 → 0.222 → 0.021 | −10.2 dB | **−5.8 dB** | 0.050 → **0.006** |
| paw_encourage v2 | ≈0 → 0.002 → 0.000 | −9.6 dB | n/a\*\* | **0.290 → 0.006 (−34 dB)** |
| paw_celebrate v2 | 0.046 → 0.055 → 0.013 | −6.3 dB | **−5.5 dB** | 0.013 → 0.008 |

\* pre-carve figures can exceed the raw texture because `formant_shift`
(factor > 1) relocates spectral-envelope energy *upward into* 1-3 kHz before
the carve removes it — visible in paw_appear v2 (0.222 pre-carve → 0.021).
Residual final band content is legitimate *instrument* partials (kalimba
A4×5.85 ≈ 2.6 k, glock C6 modes ≈ 2.9 k), not vocal formants.
\*\* the purr has essentially no 1-3 kHz energy, so the band metric can't
measure purr removal; its animal fingerprint is the 26 Hz AM, which is the
metric that matters there.

### Iteration 1 → 2 self-critique (spectrograms viewed for both)

- **paw_greet v1:** metrics fine, but the raw chirp's steep upward gliss
  (rise 1.8) left a faint rising-sweep cue inside the first pluck attack in
  the v1 spectrogram, and carve −6 dB was the shallowest of the set →
  **deepened** (steps 3-5: alpha +0.06, formant 1.20→1.30, carve −6→−9) and
  tamed the texture glide (rise 1.5). v2: attack reads as a mallet transient,
  no glide ridge; vibrato AM 0.010. Still LIGHT — pluck agility audibly kept
  (blend 0.28 = highest of the set, per brief "kelincahan chirp tersisa").
- **paw_appear v1:** 24 Hz trill ripple already suppressed (0.007) but a soft
  noisy patch rode the 0.06-0.10 s attack region between the celesta partials →
  **deepened** (alpha 0.72→0.78, formant →1.45, carve →−12, blend →0.22).
  v2 spectrogram: clean bell-partial stack (523/1046/2900/5700/9400 Hz),
  no AM ripple, no sustained noise band; the pop-in transient is now
  music-box character with a faint organic bloom.
- **paw_encourage v1:** the killer cue — 26 Hz purr flutter — was already
  down 0.29→0.006, but pre-carve residue at ~2-2.4 kHz was visible over the
  celesta onsets and the layer felt slightly "breathy" for an *ambient pad*
  target → **deepened** (alpha →0.88, carve →−15, blend →0.16) + 2.6 kHz
  low-pass on the morphed layer. v2: waveform envelope is smooth (no 26 Hz
  serration, compare raw-texture PNG), reads as warm pad + soft music-box
  touches. Soothing target met.
- **paw_celebrate v1:** the meow's rise-fall pitch arc was no longer traceable
  as a contiguous ridge, but faint arc-shaped shading remained around 1.5-2 kHz
  at 0.2-0.7 s and the fusion felt thin at 1.0 s meow → **deepened**
  (alpha 0.80→0.86, formant →1.55, carve →−14, blend →0.18), meow lengthened
  to 1.2 s for smoother vocoder ride, 5.2 kHz low-pass on the morphed layer.
  v2: chord + glock quote + shimmer dominate; the organic residue reads as a
  breathy pad swell, not a vocalization.

**Verdict after iteration 2 (viewed + metrics):** none of the four finals
retains an identifiable animal cue — no pitch-glide ridges, no trill/purr
modulation serration, vocal-formant band carved 6-10 dB per sound with the
strongest residual animal fingerprints reduced by a factor of 8-50. Under the
blind-test proxy these pass; a real human blind test is still recommended at
integration QA (proxy ≠ ears).

### A/B transformation evidence

`qa/paw_morph_ab_demo.wav` (12.7 s, + viewed `qa/paw/paw_morph_ab_demo.png`):
four pairs of *raw texture (−22 RMS) → 0.4 s gap → morphed final*, 0.85 s
between pairs, order greet → appear → encourage → celebrate. The spectrogram
shows each broadband vocal block collapsing into clean harmonic/mallet
structure — the contract's "evidence of transformation".

## Notes for Integrator / QA

- paw_appear and splash_paw_appear are byte-identical by design (see above).
- paw_celebrate: overlay vs exam_pass/level_up VERIFIED against their actual
  masters (table above; overlay WAVs in qa/paw/ for human audition).
- No repetition-fatigue x30 renders required for this category per contract
  (paw sounds are not in the high-frequency-trigger list).
- No lib/ changes needed; no bugs found in fzsynth morph tools. One
  observation for Foundation (informational, not a fix request):
  `formant_shift` with factor >1 can *add* 1-3 kHz envelope energy before
  `eq_carve` — generators should always carve after shifting (the `morph_paw`
  ordering is correct).
