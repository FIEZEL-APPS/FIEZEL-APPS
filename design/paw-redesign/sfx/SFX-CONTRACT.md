# FIEZEL SFX v1 — Production Contract

Source of truth: OWNER brief `/home/user/workspace/uploaded_attachments/c405e096ffae4b2aac5aa541a302301c/FIEZEL-SFX-Brief-2.pdf` (read it in full before producing anything). This contract adds only production mechanics.

## Identity (from brief §1, binding)
- Playful tapi premium: mallet percussion (marimba/xylophone/glockenspiel/celesta/kalimba) + modern synth bell; soft pad/shimmer/air layer behind mallet notes; NO cheap toy-app timbre, NO cold corporate.
- Major key for positive; soft descending intervals (never harsh buzz/dissonance) for negative.
- ONE signature motif (3-4 notes) = FIEZEL sonic DNA, varied across splash_intro, streak_10, lesson_complete, level_up.
- Durations 0.3–2s (exam_complete/level_up up to ~3s per brief), snappy, never blocks learning rhythm.
- No acoustic guitar/strings/human vocals. Synth/mallet/percussion only.
- PAW SFX (§G): built from cat-vocalization textures (chirp/meow/purr/trill) morphed into instruments until unrecognizable as cat (blind-test rule; instrument 70-80% dominant, cat texture 20-30% "soul"). In this environment cat textures are SYNTHESIZED procedurally (FM chirps, purr = low-rate AM growl, trill = vibrato chirp), then processed per the brief pipeline (pitch/stretch → spectral morph → formant shift → EQ carve 1-3kHz → blend). Document honestly in the spec.

## Shared library (built by Foundation subagent, then read-only for everyone)
`/home/user/workspace/pau-redesign/sfx/lib/fzsynth.py` — numpy DSP toolkit: sr=44100; mallet strike synths (marimba/glocken/celesta/kalimba), synth bell, pad/shimmer/air layers, whoosh/noise swell, soft thud, tick/click, arpeggio/chord builders, ADSR, simple reverb (schroeder), soft limiter, RMS/peak normalization to targets, fade tools, cat-texture generators (chirp/purr/trill/meow-ish), morph tools (spectral crossfade via STFT, formant-ish EQ carve), `export(name, y)` writing WAV 44.1kHz/16-bit to `masters/` + OGG (ffmpeg -q:a 4) to `web/`. Also `MOTIF` = the signature motif spec (notes, rhythm) exposed as data + `render_motif(variant=...)`.

## Loudness & QA (every file, enforced)
- Peak ≤ -1.0 dBFS; RMS window target: UI micro sounds -26..-22 dBFS, feedback -22..-18, fanfares -20..-16. No clipping. ≤10ms fade-in for clickless starts, natural tails.
- Every producer must generate for each sound: the WAV+OGG, a waveform+spectrogram PNG (matplotlib) and VIEW it (no clipping bars, clean tail), and print duration/peak/RMS into `reports/<category>.md`.
- Repetition-fatigue sounds (answer_correct, answer_wrong, button_tap, xp_gain, exam_score_tick): also render `qa/<name>_x30.wav` (30 plays, natural gaps) for human audition.

## Naming & layout (exact)
`/home/user/workspace/pau-redesign/sfx/`
- `lib/fzsynth.py`, `lib/MOTIF.md`
- `generators/<category>_gen.py` (deterministic, seeded, re-runnable)
- `masters/<name>.wav`, `web/<name>.ogg`, `qa/`, `reports/`, `spectrograms/`
File names exactly per brief: splash_intro, splash_paw_appear, notif_general, notif_streak_reminder, notif_achievement, answer_correct, answer_correct_perfect, answer_wrong, answer_wrong_retry, exam_complete, exam_pass, exam_result_reveal, exam_score_tick, streak_5, streak_10, lesson_complete, level_up, xp_gain, button_tap, lesson_start, page_transition, error_system, paw_greet, paw_appear, paw_encourage, paw_celebrate.

## Ownership
Each category subagent owns ONLY its generator file + its outputs + its report. Never edit lib/ (request fixes via report notes). Foundation owns lib/ + MOTIF.md. Integrator owns the audition page + splash wiring. QA owns nothing but reports.
