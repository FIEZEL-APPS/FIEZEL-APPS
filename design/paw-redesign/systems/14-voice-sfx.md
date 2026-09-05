# 14 — Voice & SFX Integration (PAW Expressive)

Designer: Voice & SFX Integration Designer · Date: 2026-08-27
Covers: master-prompt §23 (PAW Speech), §24 (Voice Integration), §25 (Character SFX), §26 (Character Signature), §33 (Accessibility), constrained by §35 (What NOT To Do).
Inputs: `directions/selected-direction.md` (binding), `directions/direction-c-expressive.md` (rig + sp1/sp2 mouths), `audit/03-usage-and-motion.md` Task C/D, and repo reads of `features/neural-voice/fiezel-voice-say.js`, `fiezel-subtitle.js`, `fiezel-prosody.js`, `fiezel-voice-persona.js`, `features/audio/fiezel-ui-sfx.js`, `features/brand/fiezel-choreography.js`, `features/mascot/fiezel-mascot.js`. **Design spec only — no repo files were modified.**

## 0. Hard rules honored throughout

1. **The FIEZEL neural voice system is never replaced.** `FiezelVoiceSay` stays the single door; its 5-layer ladder (L1 R2/ElevenLabs → L2 Puter → L3 on-device VITS → L4 speechSynthesis → L5 text), breakers, prefetch guards, credit memos, and the 152 MB download guard are untouched. This spec only *listens* at seams that already exist and adds display-side behavior.
2. **Rotation-free body language** (selected-direction binding note): every speech/SFX-coupled motion below uses translate/scale/opacity + limb/ear/tail rotations only — the body mass and whole figure never rotate.
3. **One canonical rig source**: everything targets `fiezel-mascot.js` classes (`fz-m-sp1/sp2/open/smile`, `fz-head`, `fz-brows`, …). Static twins and the website copy are generated exports.
4. **Not every movement gets a sound** (§25/§35): the SFX plan below is subtractive by design — 6 categories, most reactions stay silent.

### 0.1 Ground truth about timing (what the runtime actually gives us)

| Layer | Timing signal available today | Quality |
|---|---|---|
| L1 assets | `store.playUrl(..., onProgress(currentTime, duration))` → HTMLAudio `timeupdate` (`fiezel-audio-resolver.js:246`) | **~4 Hz** (≈250 ms cadence), monotonic, audio-clocked |
| L2 Puter | `voice.speak(..., onProgress)` → HTMLAudio `timeupdate` (`fiezel-puter-voice.js:306`) | same ~4 Hz |
| L3 local neural | `local.speak()` is called **without onProgress** (`fiezel-voice-say.js:238-240`) — no time signal reaches the facade | none (promise resolve only) |
| L4 speechSynthesis | `utterance.onstart/onend/onerror` inside the facade (`fiezel-voice-say.js:299-301`); `onboundary` exists on some browsers but is not wired and is unreliable | start/end only |
| L5 text | `resolve(false)` — silence | none |

`FiezelSubtitle` cues are character-length estimates re-anchored to the audio's `currentTime` on every `update()` (`fiezel-subtitle.js:155-165`) — per audit 03 this is **the best sync source in the product** and the spec builds on it rather than inventing a second clock. There is **no per-phoneme or per-word timing anywhere**; a true viseme track is therefore a future upgrade (§1.4), not the baseline.

Consequence: a mouth flap every 110–160 ms **cannot be clocked from onProgress alone** (4 Hz). The design below runs a free-running local cycle *gated and corrected* by the 4 Hz audio clock — the audio clock decides *whether* the mouth moves and *which sentence beat* it is on; the local cycle only decides the flap phase in between.

---

## 1. Speech animation (§23) — the SPEAKING state and its 3-level viseme strategy

### 1.1 New mascot state: `speaking`

Additive to the existing 14-state machine, using the existing persistent-state mechanism (`setState('speaking', {hold: 0})`, replaced explicitly on speech end — same pattern as `listening`).

Direction C SPEAKING tuple (from the §3 table of `direction-c-expressive.md`): ears −2/−2 (barely alert), upper lids 4 (soft attention), pupils toward the learner/camera (0,−1), brows hidden→soft raise on emphasis, mouth driven by the viseme engine below, tail-tip slow +6 sway, arms at rest with beat gestures (§1.5). Blink **stays enabled** during speaking (people blink while talking; suppressing it is what reads as "audio playing over a static character"). `speaking` is *not* added to `NO_BLINK`.

Rest/neutral mouth inside a speech turn is `fz-m-smile` — PAW closes to its identity smile at every pause, never to a slack `flat`.

### 1.2 Viseme mouth grammar (Direction C mouth set)

Four shapes carry all speech: `fz-m-sp1` (small open), `fz-m-sp2` (mid open), `fz-m-open` (large open), `fz-m-smile` (closed/rest). `fz-m-o` is used only as a punctuation accent (see below). All are display toggles — no path morphs, per the brand hard rule.

**Flap cycle (Level 1 & 2):** while "voiced", toggle on a jittered interval of **110–160 ms** (randomized per flap so it never looks metronomic) through a weighted pattern, not a fixed loop:

- 55% sp1, 30% sp2, 15% open — small shapes dominate; `open` is the occasional stressed syllable, which keeps PAW calm (master-prompt §7) instead of chattering at maximum aperture.
- Never the same shape twice in a row; never `open` twice within 600 ms.
- **Sentence-boundary choreography**, driven by subtitle cue changes (§1.3):
  - cue advance → close to `smile` for one prosody-informed gap (use `FiezelProsody.GAP_MS` semantics: ~420–480 ms for `. ! ?`, ~200 ms for clause commas when detectable from the cue text's trailing punctuation), then resume flapping;
  - cue text ends with `?` → final beat is `fz-m-o` for 140 ms before the smile (a small "hm?" read), plus a near-side ear perk −6° for 300 ms;
  - cue text ends with `!` → final beat is `open` 140 ms, brows raise +3 for 300 ms.
- At sizes below ~42 px (coach bubble face 30 px, map note 28 px) sp1/sp2 differences are invisible (Direction C §7 scalability note): the component collapses the cycle to `smile ↔ open` at the same cadence. Same code path, one size-conditional shape table.

### 1.3 Level 1 — band-synced cycling (L1/L2; the primary mode)

**Clock source:** the same `onProgress(currentTime, duration)` stream that already drives `FiezelSubtitle.update()` (`fiezel-voice-say.js:170,207`). The speech bridge (§2.1) taps it and derives:

- `voiced = true` while `currentTime` advances between consecutive callbacks;
- **stall gate:** if two consecutive callbacks show `Δ currentTime < 60 ms`, or no callback arrives for **900 ms**, the audio is paused/stalled/buffering → mouth closes to `smile` immediately (flap loop suspends). It resumes on the next advancing callback. This is the desync guard: the mouth can never keep flapping over silence for more than ~1 s.
- **cue index** from `FiezelSubtitle.cueIndexAt(cues, currentTime)` (the band already computes it; the bridge reads the same value) → sentence-boundary choreography in §1.2 and beat gestures in §1.5. This deliberately reuses the band's estimate rather than re-deriving one: one timing brain, one drift.
- The 110–160 ms flap loop itself runs on `requestAnimationFrame` accumulation inside the mascot component (started/stopped by the `speaking` state), not on `setInterval` — same reasoning as the subtitle module: independent timers drift; here the loop is *slaved* to the audio clock via the stall gate and cue index, so drift is bounded to one flap.

Honest labeling: this is **amplitude-agnostic band sync** — it does not read the waveform. A true amplitude follower (WebAudio `AnalyserNode` on the playing element) is listed in §1.4 as upgrade A because it requires touching the players; the stall-gated cycle gets ~90% of the perceived effect for none of the audio-graph risk.

### 1.4 Level 2 — degraded mode (L3/L4), and Level 3 — future phoneme upgrade

**L3 (local neural, no time signal):** the bridge knows speech started (promise in flight) and ended (resolve). Mouth runs the same flap cycle against an **estimated duration**: `est = chars / (14.5 chars/s × persona.speed)` (the same character-length logic `FiezelSubtitle.cuesFor` uses, with the persona speed from `FiezelVoicePersona`), sentence gaps inserted per `FiezelProsody.GAP_MS`. Hard safety: mouth force-closes at `min(est × 1.5, 20 s)` even if the promise hasn't resolved; the promise resolving always wins and closes immediately.

**L4 (speechSynthesis):** speaking begins on `utterance.onstart` (never on `speak()` call — iOS accepts speaks that never voice; the facade's 10 s breaker exists precisely for this), ends on `onend`/`onerror`. Between them, run a **gentler cycle** (140–200 ms interval, `open` weight dropped to 5%) with the same estimated-duration cap. If the browser exposes `onboundary` word events, use them opportunistically as beat resets — a free partial upgrade, never a dependency. If the browser breaker is open (facade returns false without voicing), speaking never starts.

**L5 (text only):** **no mouth animation at all** — animating a mouth over silence is the one guaranteed-wrong output. PAW holds its current state; if the call site is a tutor line, an optional single `encouraging` pulse may acknowledge the text, but the default is stillness + subtitle/text.

**Level 3 — phoneme-level upgrade path (optional, later):** L1 assets are pre-produced files in a manifest built by CI (`audio-generate.yml` / `audio-deploy-worker.yml`). A batch forced-alignment step (e.g. an aligner over the ElevenLabs output, or ElevenLabs' own character-timestamp API at generation time) can emit a compact viseme track per asset — `"visemes": [[t_ms, shape], …]` with shapes reduced to the existing 5 (`smile|sp1|sp2|open|o`) — added to `audio/manifest.json` as an **optional field**. Runtime: if the resolved asset carries a track, the mouth driver plays it keyed to the same `currentTime` (4 Hz callbacks + rAF interpolation is ample for 5 shapes); if absent, Level 1 applies unchanged. Zero new runtime dependencies, zero behavior change for untracked assets, no client-side phoneme analysis ever. Upgrade A (cheaper, do first if desired): an `AnalyserNode` amplitude follower on the L1/L2 audio element, mapping RMS bands → sp1/sp2/open, which converts the cycle from time-jittered to genuinely energy-driven.

### 1.5 Eye / head / gesture micro-motion during speech

All rotation-free (head = translate only), all clamped to Direction C parameter ranges, all suppressed under reduced motion (§5):

| Channel | Behavior while speaking | Trigger |
|---|---|---|
| Head | `fz-head` translateY 0→+2→0 "talk bob", eased, once per sentence start; continuous ±1 px slow sway (4 s period) | cue advance / always |
| Eyes | pupils rest at (0,−1) toward the learner; micro-saccade ±2 px every 2.5–4 s (randomized); blink loop unchanged | rAF loop |
| Brows | hidden by default; +3 raise for 300 ms on `!` sentences and on hype-persona lines (§2.2) | cue text / persona |
| Ears | −2/−2 baseline; near-side −6° perk 300 ms on `?` sentences | cue text |
| Tail | tip slow sway +6/−2, 2.4 s period (calmer than idle's flick states) | while speaking |
| Arms (beat gesture) | small right-arm beat: rotate −18° and back over 260 ms with `--fz-out` easing, **at most once every 2 sentence cues and at most 3 per utterance**; suppressed in head-crop placements (arms not visible anyway) | every 2nd–3rd cue advance |
| Anticipation | on confirmed speech start (first advancing progress / `onstart`): one 180 ms "inhale" — `fz-all` scale 1→1.012→1 | speech start |

The restraint numbers are the point: continuous channels are slow and tiny; discrete accents are rationed. PAW should read as *talking*, not *performing*.

---

## 2. Integration map (§24): VOICE → SPEECH STATE → MOUTH → FACE → BODY → GESTURE

### 2.1 Attach point: the speech bridge (one new seam, no ladder changes)

A small additive module, `features/mascot/fiezel-speech-bridge.js` (name indicative), is the **only** proposed touch to voice code paths, and it touches them at the facade boundary only:

- `fiezel-voice-say.js` gains ~6 one-line event emissions at seams that already exist (design-listed here; implementation is a later wave): `fiezel-speech` CustomEvents with `detail = {phase, layer, currentTime?, duration?, cueIndex?}` where `phase ∈ start | progress | end | interrupt | silent`. Emission points: first advancing `onProgress` (start, L1/L2), each `onProgress` (progress), `band_.end()` / promise resolve true (end), `stop()` (interrupt), resolve false (silent, L5), L3 speak() dispatch (start, layer:3), L4 `utterance.onstart` (start, layer:4). No return values change; no ladder logic changes; events are fire-and-forget and wrapped in try/catch like every other emission in this codebase.
- The bridge subscribes to `fiezel-speech`, plus the two **existing** events:
  - **`fiezel-neural-voice-progress`** (`fiezel-neural-voice-bootstrap.js:127`, ios-cache-fix`:45`) — this is *model download/preparation* progress, **not** speech. Mapping: never `speaking`. Optional: while a user-initiated preparation is in flight and a speak is pending, hold `thinking` (hold:0) so the wait is acknowledged; release on completion.
  - **`fiezel-neural-voice-degraded`** (`fiezel-neural-voice-audibility-fix.js:149`, provider `browser-speech-synthesis`) — audio is unreliable/silent even though a layer "accepted" it. Mapping: **immediately end speaking** (mouth → smile 90 ms) and suppress re-entry to `speaking` for the rest of that utterance. A flapping mouth over degraded/silent audio is worse than a still one.
- The bridge drives the mascot **only** through the sanctioned door: `pawSetState('speaking',{hold:0})` / `pawSetState('idle')` wrappers in `app.js`, which already gate on `pawMotionAllowed()` (reduced motion + `preferences.motion`) — so speech animation inherits all three reduced-motion layers for free. The mouth flap engine itself lives inside `fiezel-mascot.js` (started by the `speaking` state, fed cue/stall data via the existing `fz-state`/attribute channel), so *all live instances* (coach bubble, strip face, listening row) speak in unison exactly like every other state fans out today.

### 2.2 The mapping table, all five layers

| | VOICE (what plays) | SPEECH STATE | MOUTH | FACE | BODY | GESTURE |
|---|---|---|---|---|---|---|
| **L1** R2/ElevenLabs asset | HTMLAudio, `timeupdate` 4 Hz, subtitle band live | `speaking` on first advancing progress; end on `band_.end()`/resolve | Level 1 cycle, cue-choreographed, stall-gated | lids 4, pupils (0,−1), brows/ears punctuation accents | talk bob + slow sway; inhale on start | beat gesture ≤3/utterance |
| **L2** Puter engine | same signal shape as L1 | identical to L1 (the bridge doesn't care which of the two fired progress) | identical | identical | identical | identical |
| **L3** on-device VITS | promise-only; **no progress**; subtitle shows one static line (band never updates) | `speaking` on dispatch; end on resolve; force-close at `min(est×1.5, 20 s)` | Level 2 cycle on estimated duration + prosody gaps | same, minus punctuation accents (no cue clock — use estimated sentence boundaries from the same char-length split) | talk bob on estimated boundaries | beat gestures halved (est. clock is fuzzy) |
| **L4** speechSynthesis | `onstart`/`onend`; breaker may refuse | `speaking` on `onstart` **only**; end on `onend`/`onerror`/est-cap | Level 2 gentle cycle (140–200 ms, open ≈5%); `onboundary` beats if available | lids 4 only; no accents | slow sway only | none |
| **L5** text only | silence; caller shows text | **never `speaking`** (`silent` phase) | none — mouth stays on current state's shape | unchanged | unchanged | optional single `encouraging` pulse, default none |

**Persona overlay** (`FiezelVoicePersona`): the facade resolves *ajar* (sid 2) vs *hype* (sid 5) per sentence. Bridge mapping: `hype` sentences add the encouraging flavor on top of `speaking` — brows +3 for the sentence, tail-tip sway amplitude doubled (to +12), flap `open` weight 15%→22%. `ajar` = baseline. Register switching thus becomes *visible* as well as audible, reinforcing (not replacing) the existing voice identity.

### 2.3 Start / stop / interrupt / desync rules

- **Start latency:** `say()` first fetches subtitle + resolves assets; nothing about PAW changes until sound is *confirmed* (first advancing progress, L3 dispatch, or L4 `onstart`). No "mouth warming up" during network waits — the current state simply persists. The 180 ms inhale is the join between the two.
- **Normal end:** mouth eases to `smile` over 120 ms (`--fz-out`), micro-channels release over 300 ms, state returns to `idle` unless a caller has queued a state (existing `then` mechanism). The bridge must end `speaking` on the facade promise resolution even if it missed audio events — the promise is the authoritative "turn is over".
- **Interrupt (`FiezelVoiceSay.stop()`):** the facade already stops all players and closes the band; the bridge's `interrupt` phase snaps the mouth to `smile` in 90 ms with no lingering micro-motion — matching the audio's hard cut. Screen exits (`renderInner` teardown) already call stop-paths; no new teardown needed.
- **Overlapping `say()` calls:** the app's pattern is stop-then-say; if a second `start` arrives while `speaking`, the bridge treats it as interrupt+start (re-enter restarts keyframes via the existing `_restartAnimations` path — no reflow).
- **Desync ladder (worst-case honesty):** (1) stall gate closes the mouth within ≤900 ms of any silence; (2) estimated-duration caps close it in clock-less layers; (3) `fiezel-neural-voice-degraded` closes it on unreliable audio; (4) promise resolution always closes it. The failure mode is therefore always "mouth stops too early", never "mouth flaps over silence" — the correct side to fail on.
- **Suppressed subtitles** (`suppressSubtitles: true`, listening exams): no band → no cue clock even on L1/L2. The bridge falls back to Level 2 estimated boundaries; better, for listening exams specifically the product intent is *the learner listens hard* — recommended mapping is to keep the existing `listening` state (headphones groove) instead of `speaking` for these calls, selected by an explicit `say()` option (`characterState: 'listening'`) so call sites choose.

---

## 3. Character SFX system (§25)

> **SUPERSEDED BY OA-7 (2026-08-28, OWNER SFX brief `FIEZEL-SFX-Brief-2.pdf`) — the binding SFX spec is now `systems/20-sfx-system.md`.** The runtime-synthesized motif-quotation sounds below (the six-category `VOICES` design) are replaced by the produced 27-file library under `sfx/` built on the locked "Ascent & Crown" motif (`sfx/lib/MOTIF.md` — same F4/A4/C5/G5 pitch DNA, formalized). 20 §4 maps every old sound to its replacement or marks it RETIRED (notably: cat-2 "Reaction" and the cat-3 G5 glint retire with no replacement — those moments stay silent). **Still binding from this section:** §3.1's global rules (single engine, mute switch, speech priority, motion coupling, gesture unlock, "not every movement gets a sound") and the §3.2 cooldown/dedupe columns, which carry over into the 20 §7 sample manifest. Everything else below is kept as history.

### 3.1 Engine and global rules

All character SFX **extend `FiezelUiSfx`** — new entries in its `VOICES` table — never a second audio engine (audit 03 C.4 directive). Every sound is a quotation of the brand motif (notes from `FiezelChoreography.PITCH`: F2 F3 C4 F4 A4 C5 G5; the "ta-ta-TAAA" contour), rendered in the same struck-bar timbre (PARTIALS/DETUNE/tail), so character sounds and UI sounds remain one sonic sentence.

Global rules, in priority order:

1. **Mute:** the existing "Suara jawaban" preference (`feedbackSounds !== false`) silences all character SFX — same single switch, no new settings row (matches the engine's own `preferencesAllow`).
2. **Speech priority:** character SFX **never play while `FiezelVoiceSay` is speaking** (bridge exposes `isSpeaking()`); they are skipped, not queued — a late sound accompanies nothing (the engine's own GESTURE_GRACE lesson). Exception: Celebration and Level/Milestone may play, ducked, because they mark moments where speech is finished by construction (post-`finishQuiz`).
3. **Motion coupling:** an SFX whose paired animation is suppressed (reduced motion / `preferences.motion` false / `is-static` containers) does not fire. Orphaned sounds read as bugs, and no information may ride on sound alone (§33) — every sound below has a simultaneous visual (state animation + text/toast).
4. **Gesture unlock:** all sounds obey the engine's no-schedule-on-suspended-context rule; character SFX are never armed with a pending window (that privilege stays with the splash motif).
5. **Not every movement gets a sound:** curious, thinking, listening, hover, lookAt, blink, idle, sleepy, coach-bubble open/close (already covered by UI `open/close`), and per-question correct at low tiers stay **silent**.

### 3.2 The six categories

| # | Category | Sonic character | Notes (motif quote) | Duration | Trigger | Dedupe / cooldown | Mute & settings |
|---|---|---|---|---|---|---|---|
| 1 | **Entrance** ("paw-in") | two soft ascending taps, felt more than heard; struck-bar with hammer attack at −8 dB vs UI taps | F4 → C5 (tonic→fifth, the `nav` interval, softened) | ≤180 ms | coach-bubble birth pop (`is-paw-born`) and onboarding mascot enter (`fzm-ob-paw-in`) — the only two true "PAW appears" moments; **never** on strip-face repaints (those are re-renders, not entrances) | once per screen mount; ≥8 s since last entrance; skipped if any speech active | mutes with feedbackSounds; skipped when motion off (no pop to accompany) |
| 2 | **Reaction** | single mid tap with a slight pitch-bend down — a "hm" | A4 alone (the motif's color tone) | ≤120 ms | only two reactions earn sound: `hinting` (bulb pop — pair with a G5 sparkle grace note) and `confused` first-wrong tilt | max 1 per question; ≥6 s cooldown; never on second-wrong (encouragement takes over) | as above |
| 3 | **Correct** | the existing answer feedback arpeggio (`playFeedbackSound('success')`, `app.js:1732`) **remains the canonical correct sound — unchanged**. Character layer adds one tiny top note only at celebrating **lv3** (streak): a G5 "glint" riding the jump apex | G5 grace, +160 ms after the success arpeggio starts | ≤150 ms added | `answerFeedbackSignal(ok=true)` when mascot celebration level = 3 | the glint fires at most once per 60 s and never twice in one quiz; **hard rule: never a second full melody on top of the success arpeggio** | both obey feedbackSounds (same switch already) |
| 4 | **Encouragement** | warm falling third, soft mallet, longer tail — consoling, not sad | A4 → F4 (color tone settling home to the tonic) | ≤220 ms | `wrong` with wrongRow ≥2 (the moment the mascot switches to `encouraging`), and `streak-lost` → encouraging tail | max 2 per quiz session, ≥20 s apart — repeated sympathy sounds read as patronizing; error tone itself (existing) is untouched | as above |
| 5 | **Celebration** | the existing `uiSfx('celebrate')` full broken chord (F4 A4 C5 G5) **is** the character celebration — it already fires beside `lesson-complete` (`app.js:4954-4957`); the mascot's completion jump is choreographed *to* it (first jump lands on the C5 at ~160 ms) | existing VOICES.celebrate | ~1.0 s (existing) | `finishQuiz` | already single-fire per completion; **no additional mascot-emitted sound** — the fix is choreography sync, not a new asset | as above |
| 6 | **Level / Milestone** | the signature flourish: full ta-ta-TAAA motif one octave context — F2 sub root under F4→A4→C5, closing G5 shimmer with the long room tail; the most complete motif statement outside the splash | F2 + F4 → A4 → C5 → G5 | ≤1.1 s | level-exam pass (`app.js:3035` — the "PAW sampai lompat-lompat" copy moment that currently has **no** reaction, audit 03 finding), promotion, day-streak milestones, first-badge | max once per session; ≥60 s from any Celebration; suppressed entirely during placement tests (assessment ≠ party) | as above |

Prototyping/QA home: `tools/dev/sfx-preview.html` (existing preview page) gains the six entries for OWNER audition before any wiring.

---

## 4. FIEZEL Character Signature (§26) — "the PAW Spark" (canonical; 17 R-4)

One selective, repeatable combination — gesture + micro-expression + sound + timing — that is unmistakably FIEZEL:

**Choreography (total ≈900 ms, rotation-free):**

1. **0 ms** — left arm raises to +105° with pads shown (the Direction C "welcoming spark" concept pose), ear asym perk (L −8°, R +4°), `--fz-spring` easing;
2. **~105 ms** — quick double-blink into the **happy-arc eyes** (the signature eye shape, kept unchanged from current PAW by design), mouth `open` smile;
3. **~210 ms** — tail-tip flick to +18°, head translate (+2,−2);
4. **hold ~400 ms**, then release everything over 300 ms with `--fz-out`.

**Sound (context-dependent, 17 R-4):** on the splash, no new asset — the existing b4/b5 A4 beat is the sound (11 §1.3); on first greeting of a session, the *short form* — F4 → A4 → C5 only, mallet-bright, ≤420 ms; on level-up/milestone, the §3.2 category-6 *long form* — one sound per occurrence, never both — beats 1/2/3 of the gesture land exactly on the three notes (same offsets the choreography table uses: ~0/105/210 ms). Motion and motif share one rhythm; that shared "ta-ta-TAAA" *is* the signature.

**When it plays (allowlist — nowhere else; 17 R-4):**
- splash (OWNER-gated, m025-80);
- first greeting of a session (first `onboard` react of the day);
- level-exam pass / promotion (long-form audio — one event, one sound);
- milestone keys (Spark rides 13 §4.3 Act II);
- onboarding completion — OWNER taste call, DEFAULT EXCLUDED ("PAW welcomes you in"; if opted in, replaces the step-6 proud settle's final beat, short-form audio).

**When it must NOT play:** during questions or any assessment screen; on or near wrong answers; while speech is active or within 500 ms after it; more than once per session per context above; in head-crop micro placements <42 px (the arm is cropped out — the pose would be invisible, so both pose and sound are skipped); when reduced motion or motion-off applies (static `st-welcoming` pose may render, sound is skipped per rule 3.1-3); during placement tests.

Selectivity is what makes a signature: **≤2 occurrences in a normal session**, ever.

---

## 5. Accessibility (§33)

1. **Captions are the primary channel, mouth is decoration.** The `FiezelSubtitle` band (`#fiezelSubtitle`, `role="status"`, `aria-live="polite"`) keeps running in every layer including silent L5 — text delivery never depends on speech animation. The mouth/viseme layer is explicitly *redundant* with captions and audio; it may fail closed (§2.3) with zero information loss. Mascot instances stay `aria-hidden` in fallback markup (`fiezel-mascot.js:522`) and the speaking state adds **no** ARIA announcements — screen-reader users hear the voice and the polite subtitle line, nothing about the puppet.
2. **Reduced-motion speech behavior** (all three existing gates inherited via `pawSetState`, §2.1): OS `prefers-reduced-motion`, the app's "Animasi antarmuka" toggle, and static containers each fully suppress the speaking animation — mouth stays on the state's static shape, no flapping, no bob, no beat gestures. Voice, subtitles, and prosody are completely unaffected: the learner loses decoration, never content. No "low-motion mouth" middle mode — a slow flap is still motion.
3. **No information by sound alone.** Every SFX in §3 co-occurs with a visual + textual signal that carries the meaning by itself: correct/wrong → answer highlight, burst, and score text; encouragement → encouraging state + supportive copy; milestone → modal/toast copy + completion screen; entrance → the visible mascot itself. Muting feedbackSounds loses zero information; equally, the sounds never carry *different* information than the visuals (no "error chord with a happy face").
4. **Settings surface unchanged:** speech animation follows the existing motion toggle; character SFX follow the existing sound toggle; haptics stay independent. No new preference rows — the master prompt's "not annoying" bar is met by cooldowns and rationing, not by asking the user to manage more switches.
5. **Volume hygiene:** character SFX sit at or below the current UI-SFX master gain (0.5) and never duck the neural voice; speech always wins the mix (rule 3.1-2). The subtitle band must never be occluded by the mascot in any placement (existing `pointer-events:none` + placement rules retained).

---

## 6. Summary of proposed (future-wave) touch points — for the implementation planner

| Piece | Where | Nature |
|---|---|---|
| `speaking` state + mouth flap engine + micro-motion | `fiezel-mascot.js` + `fiezel-motion.css` | additive state, Direction C rig |
| ~6 `fiezel-speech` event emissions | `fiezel-voice-say.js` seams (say/onProgress/end/stop/L3/L4) | one-line emits; **no ladder logic changes** |
| Speech bridge (events → `pawSetState`) | new small module | additive |
| 6 `VOICES` entries + cooldown table | `fiezel-ui-sfx.js` (+ `tools/dev/sfx-preview.html` audition) | additive |
| Optional manifest `visemes` field + CI alignment step | `audio/manifest.json` schema, `audio-generate.yml` | optional, backward-compatible |
| Fix while in there | `app.js:3836` dead `'correct-streak'` react → call site changed to `'reward'` (13 §1.3 / 17 R-1) | 1-line call-site change + new `react()` case, flagged in audit 03 |

Everything above integrates with — and nothing replaces — the FIEZEL neural voice system.
