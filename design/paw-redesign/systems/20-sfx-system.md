# 20 — FIEZEL SFX SYSTEM (binding)

**Status:** BINDING. Authorized by the OWNER SFX brief (2026-08-28,
`uploaded_attachments/c405e096ffae4b2aac5aa541a302301c/FIEZEL-SFX-Brief-2.pdf`)
and registered as **OA-7** in `FIEZEL-PAW-REDESIGN-SPECIFICATION.md`. This
document **supersedes the motif-quotation character-SFX design** in
`systems/14-voice-sfx.md` §3 and master-spec §29 (both kept as history with
supersession notes). What survives from that design unchanged: the
**single-engine rule** (audit 03 C.4), the mute/priority/motion-coupling/
rationing rules (14 §3.1), and the accessibility rules (14 §5) — only the
*sound sources* change, from runtime-synthesized motif quotes to the 27
produced audio files below.

Production truth: `sfx/SFX-CONTRACT.md` (mechanics), `sfx/lib/MOTIF.md`
(locked motif), `sfx/reports/*.md` (per-category production reports),
`sfx/qa/acceptance_audit.py` + `sfx/qa/acceptance_audit_results.json` +
`sfx/qa/loudness_ladder.png` (independent QA acceptance, 2026-08-28).

> **OA-8/OA-9 amendments (2026-08-28, later the same day — binding):**
> **(OA-8)** the four PAW SFX are now **LIGHTLY POLISHED RAW cat textures**
> ("pakai yang mentah aja, tapi polish sedikit aja") — the §G deep-morph
> design is SUPERSEDED for these files (kept as history in §5); the raw
> textures are also the OWNER's permanent promo raw material →
> `sfx/textures/`. **(OA-9)** **`paw_greet` is THE FIEZEL SIGNATURE SOUND**
> ("suara khas FIEZEL") — the most important sound in the app — and
> **`stamp_thud` is RETIRED**: the splash slam moment plays `paw_greet`.
> Details: §1/§3/§4/§5, `sfx/reports/paw.md` v3.

---

## 1. Audio identity (brief §1, binding)

- **Character:** playful tapi premium/eksklusif — polished, warm (PAW the
  kawaii cat, Pikachu palette), never generic "app edukasi ceria", never
  cheap toy-app, never cold corporate.
- **Timbre:** mallet percussion (marimba / xylophone / glockenspiel /
  celesta / kalimba) + modern synth bell, with a thin soft-pad / shimmer /
  air layer behind the mallet notes for the premium feel.
- **Harmony:** major key for all positive feedback; negative feedback uses
  soft descending intervals — never harsh buzz or sharp dissonance
  (encouraging, not punishing).
- **Signature motif:** one 3-4 note motif = FIEZEL sonic DNA, varied across
  splash / streak / lesson-complete / level-up (Netflix/Xbox startup-sound
  logic). See §2.
- **Durations:** 0.3–2 s snappy (exam_complete / level_up up to ~3 s); SFX
  never block the learning rhythm.
- **Banned:** acoustic guitar/strings, real human vocals, Duolingo-imitation
  chimes (G14). Synth/mallet/percussion only.
- **PAW sounds (OA-8, supersedes brief §G for these 4 files):** RAW
  cat-vocalization textures, lightly polished only — the chirp/trill/purr/
  meow character stays clearly audible and charming (gentle EQ, soft fades,
  hint of shimmer/reverb, loudness normalization; NO morphing/formant
  shift/1-3 kHz carve/instrument dominance). See §5 honesty note.
- **FIEZEL sonic signature (OA-9): `paw_greet`** — the raw double-chirp
  F4→A4 (motif notes 1-2) is the brand's signature sound, used at the
  first greeting AND as the splash-stamp sound (replacing the retired
  `stamp_thud`). Treat it as the most important sound in the app.

## 2. The locked signature motif — "Ascent & Crown" (lib/MOTIF.md)

**F4 (349.23) → A4 (440.00) → C5 (523.25) → G5 (783.99)** — three even fast
pickups + one held "crown". Key F major; the crown is the **add9** color
tone, reached by the widest leap (+P5) = the recognizable fingerprint even
at 300 ms. Harmony rule: any bed under the crown is **Fadd9 without E/Bb**.
Grid unit 85 ms (mini) → 160 ms (standard) → 190 ms (fanfare); always
crescendo into the crown.

**Brand continuity:** every motif tone is inside the current app pitch
vocabulary (`FiezelChoreography.PITCH` F2 F3 C4 F4 A4 C5 G5), and the old
"ta-ta-TAAA" F4→A4→C5(+G5) contour is literally motif notes 1-2-3(+crown) —
the new motif *formalizes* the shipped DNA rather than replacing it.

Motif appearances: full statement in `splash_intro`, `lesson_complete`,
`level_up`, `exam_complete` (fanfare form), mini form in
`notif_streak_reminder`, notes 1-3 in `streak_5` (crown withheld so
`streak_10` "completes" it), notes 1-2 in `paw_greet`, notes 3-4 in
`paw_celebrate`, opening interval octave-up in `answer_correct` (crown
deliberately reserved for ceremonial sounds). API:
`fzsynth.MOTIF` / `render_motif(variant)` — pitches are never re-invented.

## 3. Catalog — 27 produced files (26 brief names + `stamp_thud`)

Measured values from the independent acceptance audit (max-400 ms-window
RMS, 44.1 kHz/16-bit masters). Tier = brief §4 implementation priority.

| # | File | Category | Dur (s) | RMS dBFS | Peak dBFS | Tier | Description |
|---|------|----------|---------|----------|-----------|------|-------------|
| 1 | `answer_correct` | answers | 0.795 | −19.0 | −5.9 | 1 | 3-note ascending arpeggio F5-A5-C6 (motif 1-2-3 octave-up, no crown), glock+bell, zero-fatigue design (>8 kHz energy 0.017 %) |
| 2 | `answer_wrong` | answers | 0.719 | −20.5 | −10.1 | 1 | soft pitched "bonk" on F3, gentle descending, no buzz — encouraging |
| 3 | `splash_intro` | splash/UI | 1.960 | −18.0 | −7.9 | 2 | silence → swell/whoosh → motif reveal (celesta+bell), crown G5 @1.30 s fuels the splash equalizer; timeline-locked to `FZSplash.clock` (splash_ui report §2) |
| 4 | `lesson_start` | UI | 0.660 | −23.0 | −12.3 | 2 | rising P5 F4→C5 marimba chime — "mulai fokus" |
| 5 | `button_tap` | UI | 0.058 | −24.7 | −5.6 | 2 | felt/wooden soft click, non-musical, dead by ~30 ms |
| 6 | `lesson_complete` | progress | 1.979 | −17.4 | −7.3 | 3 | standard-form motif fanfare, full chord bed, "achievement" |
| 7 | `level_up` | progress | 2.905 | −16.4 | −3.8 | 3 | the most ceremonial motif statement: long swell + fanfare + pad — loudest sound in the app |
| 8 | `streak_5` | progress | 1.130 | −19.5 | −7.9 | 3 | motif notes 1-3 only (crown withheld), rising energy |
| 9 | `streak_10` | progress | 1.653 | −18.5 | −8.1 | 3 | completes streak_5: full motif incl. crown, kalimba+xylophone |
| 10 | `exam_complete` | exams | 2.950 | −17.0 | −4.7 | 4 | weightiest fanfare: Fadd9 build-up swell → main hit → motif resolve (2-3 s per brief) |
| 11 | `exam_pass` | exams | 1.900 | −17.5 | −5.7 | 4 | energetic full-major pass fanfare; overlay-verified with `paw_celebrate` |
| 12 | `exam_result_reveal` | exams | 1.450 | −19.0 | −7.4 | 4 | mallet "drumroll" anticipation before the verdict, 1-1.5 s |
| 13 | `exam_score_tick` | exams | 0.032 | −24.6 | −11.4 | 4 | per-tick count-up blip (pitch rises with score via playbackRate — see §7) |
| 14 | `notif_general` | notifs | 0.800 | −23.0 | −13.5 | 5 | two soft rising notes, pocket-safe (deliberately quiet band, phone-speaker simulated) |
| 15 | `notif_achievement` | notifs | 1.302 | −21.0 | −11.4 | 5 | 3-4 layered notes, more ceremonial notification |
| 16 | `xp_gain` | progress | 0.160 | −24.0 | −13.0 | 5 | tiny "coin" tick, <0.3 s, session-proof (x30 QA render) |
| 17 | `paw_greet` | paw | 0.880 | −20.0 | −9.5 | 6 | **THE FIEZEL SIGNATURE SOUND (OA-9)** — raw double chirp F4→A4 (motif notes 1-2), lightly polished (OA-8); also the splash-stamp sound (row 27) |
| 18 | `paw_appear` | paw | 0.680 | −20.0 | −9.0 | 6 | raw short trill ~C5 (24 Hz roll), lightly polished pop-in (OA-8) |
| 19 | `paw_encourage` | paw | 1.480 | −22.0 | −11.8 | 6 | raw warm purr F2 (26 Hz AM), lightly polished — soothing comfort (OA-8) |
| 20 | `paw_celebrate` | paw | 1.780 | −19.0 | −13.3 | 6 | raw energetic meow F4 (arc peaks ≈C5) + very light shimmer accent (OA-8) |
| 21 | `splash_paw_appear` | paw | 0.680 | −20.0 | −9.0 | opt | brief §2A optional; **byte-identical to `paw_appear`** (dual-slot export). RESERVED — m025-80 keeps the splash mascot-free |
| 22 | `notif_streak_reminder` | notifs | 0.900 | −22.0 | −11.1 | opt | mini-form motif quote, slightly more urgent than notif_general |
| 23 | `answer_correct_perfect` | answers | 1.116 | −19.0 | −6.8 | opt | answer_correct DNA + shimmer tail — fast/no-hint answers |
| 24 | `answer_wrong_retry` | answers | 0.680 | −21.0 | −11.2 | opt | neutral whole-step descent C4→Bb3 — "coba lagi", not "gagal" |
| 25 | `page_transition` | UI | 0.360 | −25.0 | −10.9 | opt | pitchless soft whoosh, quietest file by design |
| 26 | `error_system` | UI | 0.572 | −23.0 | −9.0 | opt | technical-neutral muted E4→D4, zero playfulness — distinct from answer_wrong |
| 27 | `stamp_thud` | splash | 0.388 | −18.5 | −4.8 | **RETIRED (OA-9)** | the splash slam moment now plays **`paw_greet`**; master archived at `sfx/qa/retired/stamp_thud.wav`, `web/stamp_thud.ogg` kept in place for compatibility only — no active trigger |

## 4. Event mapping — every SFX → app trigger

Trigger anchors from `audit/03-usage-and-motion.md` Task D, `systems/09-states.md`
SFX slots, `systems/13-reactions.md`, `systems/14-voice-sfx.md` §3.
All firing rules of 14 §3.1 stay binding: one sound per moment, skipped
while `FiezelVoiceSay` speaks (celebration/milestone excepted, ducked),
muted by the existing "Suara jawaban" switch, suppressed when the paired
animation is suppressed, and **most movements stay silent**.

| App event (source anchor) | New file | Replaces (old sound) |
|---|---|---|
| Splash t0 — `FZSplash.clock` 0 (11 §1S-v4) | `splash_intro` | old splash motif beats b1–b5 (A4 beat incl.) — the file's internal onsets 700/880/1060/1300 ms are the beat grid; feeds `sfx.getLevels(t)` for the equalizer |
| Paw stamp SLAM — auto `pawstamp.play()` @2200, contact ~+300 ms (abs ~2500); reduced-motion stamp @+320 ms | **`paw_greet` (OA-9 — the signature sound marks the brand moment)**; wired in `splash-prototype/js/sfx.js` `MANIFEST.thud` | `stamp_thud` (RETIRED by OA-9), which had replaced the old oscillator thud |
| PAW pop-in on splash | — RESERVED (`splash_paw_appear` asset exists) | none — m025-80: no mascot on splash, permanent |
| Onboarding mascot enter (`fzm-ob-paw-in`) + coach-bubble birth (`is-paw-born`) — old cat-1 Entrance triggers, ≥8 s apart, once per mount | `paw_appear` | cat-1 Entrance two-tap F4→C5 (RETIRED) |
| First greeting of session / `onboard` react; audio of the PAW Spark short form (§30, 17 R-4) | `paw_greet` **(OA-9: FIEZEL signature sound)** | Spark short-form synth F4→A4→C5 ≤420 ms (RETIRED; see open item OI-4) |
| ANSWER_CORRECT — `answerFeedbackSignal(ok=true)` (`app.js:1737`) | `answer_correct` | `playFeedbackSound('success')` oscillator arpeggio (RETIRED) |
| Fast/no-hint correct; celebrating **lv3** streak moment (09 §2.6) | `answer_correct_perfect` | cat-3 G5 "glint" grace note (RETIRED — this file takes the special-correct role; never layered on top of answer_correct) |
| ANSWER_INCORRECT — `answerFeedbackSignal(ok=false)` | `answer_wrong` | `playFeedbackSound('error')` (RETIRED) |
| Retry offered after wrong (retry UX, brief §2C) | `answer_wrong_retry` | none (new) |
| Encouraging switch — wrongRow ≥2, and STREAK_LOST → encouraging tail (`app.js:2716`); max 2/session, ≥20 s apart, ≥60 s cooldown (09 §4) | `paw_encourage` | cat-4 falling third A4→F4 (RETIRED) |
| LESSON/SESSION_COMPLETE — `finishQuiz` (`app.js:4954-4957`) | `lesson_complete` | `uiSfx('celebrate')` broken chord = cat-5 (RETIRED as synth; this file is the celebrate) |
| GEMS_AWARD listening streak-of-5 — `reward` react (fixed `'correct-streak'` call site, 13 §1.3 / 17 R-1) | `streak_5` | `char.reward` two-note figure (13 §2) — RETIRED, superseded by this file |
| Streak 10 / day-streak milestone (daily panel `app.js:3200-3206`) | `streak_10` | none (new) |
| XP/gems increment toast (per award unit) | `xp_gain` | none (new) |
| LEVEL EXAM PASS — `app.js:3035` ("PAW sampai lompat-lompat") | `exam_pass` **+ `paw_celebrate`** (overlay clash-verified: paw carries 2-10× less 1-3 kHz energy, summed peak −2.7 dBFS; optional −2..−3 dB duck on phone speakers) | nothing existed (audit 03 defect — no reaction despite copy) |
| Level test / challenge finished (finishQuiz exam branch, e.g. 150-soal level test) | `exam_complete` | none (new) |
| Result screen reveal (`app.js:4972`), before verdict | `exam_result_reveal` | none (new) |
| Score count-up ticks (result screen animation) | `exam_score_tick` (repeat per tick, rising playbackRate) | none (new) |
| LEVEL_UP / promotion — MILESTONE tier (13 §4.3 Act II, ~300 ms slot) | `level_up` (+ `paw_celebrate` where the Spark long form applies; **one moment, never three layers** — level_up + paw_celebrate max) | cat-6 flourish F2+F4→A4→C5→G5 ≤1.1 s (RETIRED) |
| Badge / achievement notification (`badge-earned` → proud; streak badge panel) | `notif_achievement` | none (new) |
| Daily reminder notification (push/local) | `notif_general` | none (new) |
| Streak reminder notification | `notif_streak_reminder` | none (new) |
| LESSON_START react (17 R-2: 1600 ms state) / quiz begins | `lesson_start` | none (new) |
| Generic UI tap / nav | `button_tap` | old nav-interval taps (RETIRED) |
| Screen transition (optional, minimal) | `page_transition` | none (new) |
| Technical error (connection failed etc.) — never wrong answers | `error_system` | none (new) |

**Retired with no replacement (stay silent, per 14 §3.1-5):** cat-2
"Reaction" A4 "hm" (hinting bulb-pop + first-wrong tilt earn **no sound**
in the new system — the brief defines no reaction SFX and silence is
kinder); coach-bubble open/close synth taps beyond the standard
`button_tap`. Curious/thinking/listening/hover/blink/idle/sleepy remain
silent as before.

## 5. PAW sound sources — honest documentation (OA-8 current design + §G history)

**CURRENT (OA-8, 2026-08-28):** the four PAW SFX are the RAW synthetic cat
textures themselves, lightly polished only — per texture: gentle high-pass
(mud/rumble), gentle high-shelf −2..−3 dB on synthetic breath hiss (the
1-3 kHz vocal band is never touched), a hint of reverb (wet 0.09-0.12) /
shimmer send (≤0.04), soft fades, RMS normalization. Character-retention
metrics (envelope-AM fingerprints ≈0.94-1.42 vs raw — fully intact) and the
per-sound polish table: `sfx/reports/paw.md` v3; audition
`sfx/qa/paw_final_audition.wav`. The textures are additionally the OWNER's
permanent promo raw material: `sfx/textures/` (raw + polished + OGG +
Indonesian README). The morphed v2 renders are archived in
`sfx/qa/paw/morphed-v1/`; the generator keeps the full §G chain runnable
via `--mode morph-history`.

**HISTORY — the superseded §G morph design (kept per contract):** the brief
mandates real cat recordings morphed into instruments. **In this
environment no real cat recordings exist**; the cat textures (FM chirp with
formant coloration, ~26 Hz AM purr, 24 Hz vibrato trill, formant-glide
meow) are **procedurally synthesized** by `lib/fzsynth.py`. The §G pipeline
itself is implemented faithfully per sound, not plain layering:

1. texture synthesized at the target note f0 and duration (§G steps 1-2);
2. STFT spectral morph with phase from the instrument (§G step 3 — for
   `paw_celebrate` this *is* the vocoder-style fusion);
3. formant shift away from animal-vocal character (§G step 4);
4. EQ carve of the 1-3 kHz meow-recognition band (§G step 5);
5. final blend: instrument 72-84 % dominant / morphed texture 16-28 %
   "soul" (§G step 6 window 70-80/20-30). DEEP sounds add a low-pass on the
   texture layer.

**Blind-test proxy (§G.7), 2 documented iterations** (`reports/paw.md`,
metrics `qa/paw/paw_metrics.json`): 1-3 kHz vocal-band energy carved
−5.5..−15.7 dB vs raw texture; signature animal AM fingerprints (trill
24 Hz, purr 26 Hz, chirp vibrato) reduced to ≤0.010 envelope depth (purr
0.290→0.006, −34 dB); v2 spectrograms show no pitch-glide ridges and no
modulation serration. **Verdict at the time: passed the objective proxy.** Under OA-8 the
blind-test requirement is MOOT — the cat character is now the point, not
the thing to disguise. The old A/B transformation evidence is archived at
`qa/paw/morphed-v1/paw_morph_ab_demo.wav`.

## 6. Loudness & format standards (binding QA numbers)

- **Master:** WAV 44.1 kHz / 16-bit mono, `sfx/masters/`. **Web:** OGG
  Vorbis `-q:a 4`, `sfx/web/` (27 files, **~325 KB total**). MP3 fallback:
  §7.
- **Peak ≤ −1.0 dBFS**, no clipping, ≤10 ms clickless fade-in, natural
  tails.
- **RMS bands** (max-400 ms window): UI micro −26..−22 · notifications
  −24..−20 (documented sub-band: pocket-safe per brief §2B) · feedback
  −22..−18 · fanfares −20..−16.
- **Loudness hierarchy** (audited, `qa/loudness_ladder.png`): micro family
  quietest (page_transition −25.0 … xp_gain −24.0) → notifs → feedback →
  fanfares, `level_up` loudest (−16.4), `exam_complete` (−17.0) —
  ceremonial weight strictly increases with achievement size.
- Re-render rule: adjust `rms_target` in the owning
  `generators/<cat>_gen.py` only; never peak-normalize; generators are
  deterministic/seeded.

## 7. Implementation plan (`fiezel-ui-sfx.js` → sample player)

The single-engine rule survives: `FiezelUiSfx` keeps its name, public API
(`uiSfx(name)`), the "Suara jawaban" preference gate, the
no-schedule-on-suspended-context rule and gesture unlock — but its
oscillator `VOICES` synth table is replaced by a **sample manifest**:

- `audio/sfx-manifest.json`: `{ name: { ogg, mp3, gain, cooldownMs,
  maxPerSession } }` for the 27 files; cooldown values carry over from
  14 §3.2 (entrance ≥8 s, encourage ≥20 s ×2/session, milestone 1/session,
  etc.).
- **Decoding:** one `AudioContext`; `fetch` → `decodeAudioData` →
  `AudioBuffer` cache; playback via `AudioBufferSourceNode` + per-sound
  `GainNode` under the existing master gain (0.5). `exam_score_tick`
  repeats one buffer with rising `playbackRate` for the count-up pitch
  climb (one asset, no tick ladder files).
- **Format fallback:** OGG Vorbis primary; **Safari/iOS cannot decode
  Vorbis** → ship MP3 (`ffmpeg -q:a 3` from the WAV masters) and pick by
  `canPlayType`/UA before fetch. MP3 renders are **not yet produced** —
  open item OI-1.
- **PWA preload strategy:** tier-A (`splash_intro`, `stamp_thud`,
  `button_tap`, `answer_correct`, `answer_wrong`, `lesson_start`) fetched
  and decoded during splash particle formation (splash_intro itself must be
  ready at t0 — precached by the service worker from the previous visit,
  or skipped silently on true first-load-before-cache); everything else
  lazy-decoded on idle after first paint. Service worker precaches all 27
  compressed files (~325 KB OGG — one small image worth of payload) in the
  static cache with the app shell.
- **Splash wiring:** splash_intro starts at `FZSplash.clock` 0 (beat grid
  in §3 row 3 / splash_ui report §2); stamp_thud fires on stamp SLAM
  contact (~abs 2500 ms), independently mixable against splash_intro's
  tail. Dev harness: `splash-prototype/dev/sfx-harness.html`.

## 8. QA gates (all must pass before ship)

1. **Acceptance audit green:** `python sfx/qa/acceptance_audit.py` → 0
   problems (existence in masters/+web/, duration windows, RMS bands, peak
   ≤ −1 dBFS, no clipping runs, no true DC offset, no start click in the
   first 10 ms, OGG decodability, report cross-check). Status 2026-08-28:
   **27/27 PASS, 0 problems**; results in `qa/acceptance_audit_results.json`.
2. **Hierarchy ladder:** `qa/loudness_ladder.png` regenerated and viewed —
   micro < notif < feedback < fanfare ordering intact, level_up on top.
3. **Repetition fatigue:** human audition of `qa/<name>_x30.wav` for
   answer_correct, answer_correct_perfect, answer_wrong,
   answer_wrong_retry, button_tap, xp_gain, exam_score_tick.
4. **PAW character check (replaces the §G.7 blind test — MOOT under
   OA-8):** human audition of `qa/paw_final_audition.wav` — chirp/trill/
   purr/meow must be clearly audible and charming, no harshness/mud.
5. **Phone-speaker check:** notif set auditioned through the band-limited
   sim renders (`qa/notif_*_phonespeaker.wav`).
6. **Overlay clash:** exam_pass/level_up + paw_celebrate stacked renders
   (`qa/paw/overlay_*.wav`) stay clip-free and legible.
7. **No information by sound alone** (14 §5.3) re-verified after wiring —
   every mapped event in §4 has a simultaneous visual/text signal.

## 9. Open items

| # | Item | Owner |
|---|---|---|
| OI-1 | MP3 fallback renders for Safari/iOS (`ffmpeg -q:a 3`, 27 files) + `canPlayType` pick in the sample player | Integrator |
| OI-2 | ~~Human blind test of the 4 PAW sounds (§G.7)~~ **MOOT under OA-8** — replaced by the §8-4 character audition (`qa/paw_final_audition.wav`) | OWNER/QA at integration |
| OI-3 | Human x30 fatigue audition sign-off (renders ready in `qa/`) | OWNER/QA at integration |
| OI-4 | PAW Spark choreography re-sync: 17 R-4's short-form audio assumed 3 synth notes ≤420 ms; the replacing `paw_greet` is two chirps / 880 ms (OA-8 raw version) — realign the 3 gesture beats (0/105/210 ms) to chirp 1 / chirp 2 / decay peak, or trim a Spark-specific variant from the generator | Component implementer + Foundation |
| OI-5 | `sfx-preview.html` audition page update from synth demos to the 27 files (14 §3.2's audition-home duty) | Integrator |
| OI-6 | *(OA-8/OA-9)* QA refreshes: `qa/acceptance_audit.py` expected tuples for the 5 paw files (v3 values in `reports/paw.md`) + stamp_thud row (master now in `qa/retired/`); optional overlay re-render vs the raw `paw_celebrate` (its 1-3 kHz share rose 0.013→0.048, still ~½ of exam_pass's) | QA |
