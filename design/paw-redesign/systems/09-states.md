# 09 — PAW Character State System (Wave 3 spec)

Designer: Character State System Designer · Date: 2026-08-27
Binding inputs: `directions/selected-direction.md` (Direction C rig is the geometry/parameter base), `directions/direction-c-expressive.md` (§3 expression table, §4 P1–P20 rig params, §6 rotation-free body language), `audit/03-usage-and-motion.md` (runtime, event inventory, defects), master-prompt §4, §11 (also honored: §8, §12–13, §19–25, §33).
Canonical rig source: `features/mascot/fiezel-mascot.js` (E5 rule — static twins and the `website/assets/mascot/` copy are generated exports of this one component).

**This is a design spec, not code. No repo files were modified.** Scope guard (master-prompt §4): everything below describes how PAW *reacts* to events the game system already emits. No game mechanic, reward, XP, streak, or progression rule is changed.

Naming convention: `CAPS` = canonical character states (the required 15). `lowercase` = runtime state names (`STATES[]` / `st-*` classes in `fiezel-mascot.js:205-213`). Expression names ("Happy", "Gentle concern"…) are the 14-expression library of master-prompt §8 as parameterized in `direction-c-expressive.md` §3.

---

## 1. Reconciliation: 14 runtime states → 15 canonical states

### 1.1 Principles

1. **Do not break the runtime contract.** `FiezelPaw.setState/react`, the `st-<name>` class scheme, `TRANSIENT` holds, `NO_BLINK`, `_mem` escalation and the `fz-state` DOM event all stay. New states are **additive** entries in `STATES[]`; existing names are kept so every current caller and every `fiezel-motion.css` selector keeps resolving.
2. **The canonical 15 are the product vocabulary; the runtime keeps a slightly larger set.** Five existing states (`curious`, `hinting`, `sleepy`, `sad`, `love`) are not in the required 15 but are load-bearing (onboarding poses, hint UX, streak-lost choreography). They are retained as **supporting states** underneath the canonical layer.
3. **CORRECT and CELEBRATING share one runtime state, split by level.** The existing escalation memory (`_mem.streak` → `celebrating lv1–3`, `fiezel-mascot.js:333-335`) is exactly the §19/§22 tiering; we keep it and name lv1 = CORRECT, lv2–3 = CELEBRATING rather than duplicating keyframes.
4. **Five genuinely new runtime states** close the gaps audit 03 identified: `speaking`, `welcome-back`, `lesson-start`, `level-up`, `milestone`.

### 1.2 Migration table (old → new)

| # | Runtime state (today) | Disposition | Canonical state / role | Notes |
|---|---|---|---|---|
| 1 | `idle` | **Kept** | **IDLE** | Unchanged revert target. Expression Neutral. |
| 2 | `greeting` | **Kept** | **GREETING** | Expression upgraded Neutral-wave → Welcoming (#13). |
| 3 | `curious` | **Kept (supporting)** | Attention/orienting sub-state; also the opening beat of LESSON_START | Fed by `question-shown` / `hover-answer`. |
| 4 | `thinking` | **Kept** | **THINKING** | Gains Direction C paw-to-chin arm pose (right arm P17, literal +96° per 17 R-3). |
| 5 | `listening` | **Kept** | **LISTENING** | Groove re-based rotation-free (head translateX ±3 + tail counter-sway, direction-c §6). |
| 6 | `encouraging` | **Kept** | **ENCOURAGING** | Nod becomes translateY-only (no rotation). |
| 7 | `celebrating` | **Kept** | **CORRECT** (lv1) / **CELEBRATING** (lv2–3) | Tiering by amplitude + confetti count, exactly as today (`18 + 10×level`). |
| 8 | `confused` | **Kept** | **INCORRECT** (first miss) | Read softened toward §20: tilt-free, sweat kept, Confused expression (#6) with clamped ranges. |
| 9 | `hinting` | **Kept (supporting)** | Hint reaction (Excited #3 + bulb) | Gets a real caller (see §3.3). |
| 10 | `completion` | **Kept** | **LESSON_COMPLETE** | Runtime name stays `completion` (CSS keyframes depend on it). |
| 11 | `proud` | **Kept** | **ACHIEVEMENT** | Chest puff now targets `fz-chest` (P19). |
| 12 | `sleepy` | **Kept (supporting)** | Ambient dormancy (`idle-timeout`) | Finally wired (see §3.3). |
| 13 | `sad` | **Kept, re-expressed** | Streak-lost beat inside ENCOURAGING choreography | Face changes from hard-sad to **Gentle concern** (#14): concern mouth, ears +9/+9, tail low — per §20 "guide, not referee". Runtime name stays `sad`. |
| 14 | `love` | **Kept (supporting)** | Appreciation (`favorite`) | Heart-eye swap unchanged. |
| 15 | — | **NEW** | **SPEAKING** (`speaking`) | The biggest gap (audit 03 C.4/D). Persistent, mouth-beat driven. |
| 16 | — | **NEW** | **WELCOME_BACK** (`welcome-back`) | Welcoming (#13) with bigger tail flick; distinct from GREETING by warmth + memory. |
| 17 | — | **NEW** | **LESSON_START** (`lesson-start`) | Short Curious→Happy chain; today nothing marks a session opening. |
| 18 | — | **NEW** | **LEVEL_UP** (`level-up`) | Fixes the missing level-exam-pass reaction; honors the copy "PAW sampai lompat-lompat" (`app.js:124`). |
| 19 | — | **NEW** | **MILESTONE** (`milestone`) | Reserved top tier (§22): rare, strongest, signature SFX. |

Result: `STATES[]` grows 14 → 19. `TRANSIENT` gains `welcome-back:2200, lesson-start:1600, level-up:2800, milestone:3400` (speaking is persistent). `NO_BLINK` keeps its existing five entries; `speaking` is deliberately **not** added (PAW blinks while talking — alive, not robotic).

---

## 2. State definitions (all 15 canonical + 5 supporting)

Shared vocabulary: rig params P1–P20 from `direction-c-expressive.md` §4; expressions #1–#14 from its §3 table; priorities from §4.2 below; "revert" always means auto-`setState('idle')` via the existing `hold/then` machinery. All motion is **transform/opacity only, zero body rotation/mirroring** (binding rule, selected-direction.md).

SFX slots name categories of master-prompt §25 and must be built **inside `features/audio/fiezel-ui-sfx.js`** (single engine rule, audit 03 C.4), quoting the brand motif. Voice slots go through `FiezelVoiceSay` with the two OWNER personas (explain sid 2 / praise sid 5, `fiezel-voice-persona.js`). Both slots are optional per §11 — a state must read fully with sound off.

### 2.1 IDLE (`idle`)

| Field | Spec |
|---|---|
| Expression | #1 Neutral (brows hidden, smile mouth, lids retracted — pixel-equal to today's default) |
| Pose | Idle standing, arms at rest, tail neutral |
| Body movement | Breath P1 (scale 1↔1.015/.985, 2.6s) unchanged; ear micro-twitch cycles 7.4s/9.1s kept |
| Facial movement | Blink loop unchanged (70ms lid, 1.8–5.6s random, 20% double); every ~14–22s one slow "life beat": pupils P8 drift ±3px for 900ms then recenter (replaces nothing, additive, must be subtler than the ear twitch) |
| Gaze | Neutral; honors `lookAt()` (--lx/--ly, auto-recenter 2200ms) |
| Entry / exit | Entry: 240ms `--fz-out` ease from any state (mouth crossfades via 120ms display swap + lid tween). Exit: instant (any state may take over) |
| Duration / loop | Persistent, loops forever |
| Interrupt priority | P0 — interrupted by anything |
| SFX slot | none (idle is silent, §25 "do not fill every movement with a sound") |
| Voice slot | none |

### 2.2 GREETING (`greeting`)

| Field | Spec |
|---|---|
| Expression | #13 Welcoming (ears −8/+4, brows raised +4, open mouth) |
| Pose | Waving: left arm P16 to +105° with pads P18 on (the Direction C concept pose) |
| Body movement | Wave = arm rotate 3 beats over 1.1s; whole-figure stays planted (no body rotate — replaces the current ±4° wave tilt) |
| Facial movement | Brows fade in 120ms; smile→open; one blink suppresssion-free |
| Gaze | Toward viewport center / toward the panel PAW lives in |
| Entry / exit | Entry: spring `--fz-spring` 240ms; exit: arm returns 300ms then revert |
| Duration / loop | Transient 1600ms (1900ms on first greet — `_mem.greets` kept) |
| Interrupt priority | P2 |
| SFX slot | **Entrance** cue (short motif quote, ≤350ms) — only on coach-bubble birth and onboarding, not on every re-greet |
| Voice slot | Optional one-line greet via `FiezelVoiceSay` explain persona (onboarding only; already has `{en,id}` tutor lines) |

### 2.3 LISTENING (`listening`)

| Field | Spec |
|---|---|
| Expression | #2 Happy + headphones accessory (`fz-headphones`, unchanged) |
| Pose | Idle stance, head grooving |
| Body movement | Groove re-based per direction-c §6: `fz-head` translateX ±3px alternating .62s + `fz-tail-base` ∓4° counter-sway; floating notes 1.4s kept |
| Facial movement | lid-low P7 at 6 (soft enjoyment squint); blink suppressed (existing NO_BLINK) |
| Gaze | Slow drift toward the player row (lookAt target = play button) |
| Entry / exit | Headphones fade 180ms on entry; on exit notes stop first, headphones fade out, 240ms to idle |
| Duration / loop | Persistent until `listening-stop` |
| Interrupt priority | P1 — CORRECT/INCORRECT etc. interrupt it; caller must re-issue `listening-start` after transient reactions inside Skills Lab (existing behavior, keep) |
| SFX slot | none (music is playing; never compete) |
| Voice slot | none |

### 2.4 THINKING (`thinking`)

| Field | Spec |
|---|---|
| Expression | #5 Thinking (ears +2/−6, half-lids P5/6 = 10, pupils up-corner +6,−5, brows low −6°, flat mouth) |
| Pose | Right arm P17 to +96° (literal, inward-across per 08 §1.5 / 17 R-3), paw capsule near chin |
| Body movement | Head translate(+2,−1); thinking-dots accessory loop 1.1s kept |
| Facial movement | Pupils micro-oscillate ±2px horizontally every ~1.4s ("reading the problem") |
| Gaze | Up-left; overrides lookAt while active |
| Duration / loop | Persistent with caller hold (existing: 900ms for AI-analyzing, 700ms for answer-picked, hold:0 for coach ask) |
| Entry / exit | Arm raises 260ms `--fz-out`; exit lowers arm before mouth swap so the chin-paw never overlaps a smile |
| Interrupt priority | P1 |
| SFX slot | none |
| Voice slot | none (thinking is pre-speech silence) |

### 2.5 SPEAKING (`speaking`) — NEW

| Field | Spec |
|---|---|
| Expression | Base #2 Happy with lids P5/6 = 4; when persona = praise (sid 5) base shifts to #3 Excited (brows +4) |
| Pose | Idle stance; on emphasis sentences (exclamation gap in `FiezelProsody`) right arm small presenting gesture −40° for one sentence |
| Body movement | Subtle: head translateY ±1px on sentence starts (a "speech nod", translate only); breath continues |
| Facial movement | **Mouth beats**: cycle `sp1 → sp2 → open → sp1` at 110–160ms intervals while a sentence is audibly playing; `soft` between sentences (gap ≥200ms per `GAP_MS`); rest to `smile` at end. Driven by `FiezelSubtitle`'s per-sentence `begin/advance` (already synced to audio `currentTime`, audit 03 C.4) — no new timing engine |
| Gaze | Toward the user (center), occasional glance at the subtitle band (lookAt {x,y} of `#fiezelSubtitle`) once per 2–3 sentences |
| Entry / exit | Enter when `FiezelVoiceSay.say()` starts producing audio (L1–L4); exit on resolve/`stop()` → 200ms mouth settle → previous persistent state (listening if a Skills Lab clip context) or idle |
| Duration / loop | Persistent (`hold:0`) for the life of the utterance |
| Interrupt priority | P1, **but it owns the mouth channel**: reactions of P3+ arriving mid-speech play gesture-only (arms/ears/tail/confetti overlay) while mouth beats continue; P2 and below are dropped (§4.4) |
| Suppression | Never enter on L5 text-only fallback or after `fiezel-neural-voice-degraded` fires (no mouth flapping over silence); never under reduced motion (subtitles carry the content, §33) |
| SFX slot | none (voice IS the audio) |
| Voice slot | This state is the voice integration itself: VOICE → SPEAKING → mouth → face → body → gesture (master-prompt §24). Persona register selects the base expression as above |

### 2.6 CORRECT (`celebrating` lv1)

| Field | Spec |
|---|---|
| Expression | #10 Celebrating at low amplitude (ears −10/−10, brows +5, open mouth) |
| Pose | Small hop, one arm up −80° with pads |
| Body movement | §19 sequence: notice (pupils snap to answer, 80ms) → smile (120ms) → single squash-stretch hop on `fz-all` (scale/translateY, .85s) → settle. Confetti 28 particles (18+10×1, existing formula) |
| Facial movement | lid-low squint 6 during the hop peak |
| Gaze | lookAt the chosen answer element first, then center |
| Entry / exit | Spring in; auto-revert |
| Duration / loop | Transient 1900ms (existing hold), single play |
| Interrupt priority | P3 |
| SFX slot | **Correct** — keep `playFeedbackSound('success')` (app.js:1732) as-is; optional new motif tail-note ≤250ms layered from the SFX engine |
| Voice slot | Optional praise persona micro-line ("Nice!") — rate-limited, ≤1 per 4 correct answers, off by default |

### 2.7 CELEBRATING (`celebrating` lv2–3)

| Field | Spec |
|---|---|
| Expression | #10 Celebrating full (ears −10/−10, brows +5, open mouth, tail tip +18 / base +6) |
| Pose | Two-arm cheer, literal L +110…+120° / R −110…−120° with pads (17 R-3; the cheer Direction C unlocks) |
| Body movement | lv2 = double jump; lv3 = `fzJumpBig` (−58px) ×2 — existing keyframes, amplitude-tiered, rotation-free already. Confetti 38/48 particles |
| Facial movement | Eye pop P10 to 1.08 on first apex |
| Gaze | Center/up |
| Entry / exit | Spring in; auto-revert to idle |
| Duration / loop | Transient 1900ms, plays once per trigger |
| Interrupt priority | P3 |
| SFX slot | **Celebration** — motif quote, brighter voicing at lv3; reuse `uiSfx('celebrate')` family |
| Voice slot | Optional praise persona line at lv3 only ("Streak!") |
| Escalation | `_mem.streak` unchanged: lv = min(3, in-session correct streak); any `wrong` resets. This is the **existing celebration escalation**, kept verbatim |

### 2.8 INCORRECT (`confused`, then `encouraging`)

| Field | Spec |
|---|---|
| Expression | First miss: #6 Confused (asym ears +8/−8, inner-up brows, wave mouth, sweat drop). Second+ consecutive miss: skips straight to ENCOURAGING (existing `wrongRow` logic, kept — it is exactly master-prompt §20) |
| Pose | Neutral stance, head translate(−3,0) |
| Body movement | Gentle headshake = head translateX ±2 twice (replaces the current rotate-tilt — rotation ban); sweat pop kept |
| Facial movement | Brows inner-up ±10°; **no tear, no slump** — §20: "That's okay. Let's learn.", never exaggerated sadness |
| Gaze | Briefly at the wrong answer, then back to the user (a "we're in this together" look) |
| Entry / exit | Soft 240ms ease (no spring — springs read as excitement); auto-revert |
| Duration / loop | Transient 1800ms |
| Interrupt priority | P2 |
| SFX slot | keep `playFeedbackSound('error')` — already soft; **no additional character SFX** |
| Voice slot | none (silence is kinder) |

### 2.9 ENCOURAGING (`encouraging`)

| Field | Spec |
|---|---|
| Expression | #7 Encouraging (ears −6/−6, brows +3, open mouth) |
| Pose | Right arm point −90° with pads (a "you've got this" point, not at the user's mistake — points at the question) |
| Body movement | Nod = head translateY 0→+3→0 ×2 (rotation-free, direction-c §6); tail tip +10 |
| Facial movement | Warm open smile; single slow blink mid-state |
| Gaze | At the user (center) |
| Entry / exit | 240ms ease in; auto-revert |
| Duration / loop | Transient 1500ms |
| Interrupt priority | P2 |
| SFX slot | **Encouragement** — one soft ascending two-note motif fragment, ≤300ms, fired at most once per 60s (cooldown §4.5) |
| Voice slot | Optional explain-persona line on 2nd+ consecutive miss ("Pelan-pelan, coba lagi") — existing tutor-line pattern with `{en,id}` |

### 2.10 WELCOME_BACK (`welcome-back`) — NEW

| Field | Spec |
|---|---|
| Expression | #13 Welcoming, warmer variant: tail tip +18 with an extra flick, blush already present carries warmth |
| Pose | Both-ear perk −8/−8 → wave (left arm +105°) |
| Body movement | Two-beat: perk-up (300ms, ears + eye pop 1.06) as recognition, then the wave; tail double-flick |
| Facial movement | Brows up +4; open mouth; wide lids (P5/6 = 0) |
| Gaze | Straight at user |
| Entry / exit | Enters from `sleepy` (wake path) via a 200ms lid-raise in-between, or from cold app start after absence; reverts to idle |
| Duration / loop | Transient 2200ms |
| Interrupt priority | P3 |
| SFX slot | **Entrance** — the signature motif quote (this is a candidate FIEZEL Character Signature moment, §26) |
| Voice slot | Optional explain persona "Welcome back, {name}!" (name already collected at onboarding) |

### 2.11 LESSON_START (`lesson-start`) — NEW

| Field | Spec |
|---|---|
| Expression | Chain #4 Curious (600ms) → #2 Happy (rest) — the direction-c "4→2" recipe |
| Pose | Lean-in: head translate(+4,0) toward the question panel, near-side ear perk −10° |
| Body movement | Single lean, tail tip +14 hold; no bounce |
| Facial movement | Pupils toward the question panel; brows: left raised (asym curiosity) then hidden as it settles to Happy |
| Gaze | lookAt(question panel) — this is the §9 "direct attention toward content" behavior |
| Entry / exit | 240ms ease; auto-revert; the first `question-shown` of the session immediately chains after it |
| Duration / loop | Transient 1600ms |
| Interrupt priority | P2 |
| SFX slot | **Reaction** — optional tiny tick from the motif, ≤150ms; default off |
| Voice slot | none |

### 2.12 LESSON_COMPLETE (`completion`)

| Field | Spec |
|---|---|
| Expression | #10 Celebrating held longer, with #8 Proud settle at the end |
| Pose | Both arms up, tip-toe stretch on `fz-foot-l/-r` (P-foot micro-param, direction-c C11) |
| Body movement | §21 sequence kept: notice → eyes brighten (eye pop 1.1, 120ms) → celebration pose → double big jump → star loop + tail-ring glow → settle into a 400ms Proud beat → idle. Confetti 46 (existing) |
| Facial movement | Open mouth through jumps, soft mouth + lid-low 6 in the proud settle |
| Gaze | Up during jumps, at user in the settle |
| Entry / exit | Fired after `uiSfx('celebrate')` (existing order at app.js:4954-4957); auto-revert |
| Duration / loop | Transient 3200ms (existing caller hold), single play |
| Interrupt priority | P4 |
| SFX slot | **Celebration** — existing `uiSfx('celebrate')` is the sound; no second layer |
| Voice slot | Optional praise persona summary line (already the product's praise register moment) |

### 2.13 LEVEL_UP (`level-up`) — NEW

| Field | Spec |
|---|---|
| Expression | #10 Celebrating + both-ear full perk −12/−12 + tail base +8/tip +18 (direction-c LEVEL_UP recipe) |
| Pose | Two-arm cheer with pads; the promised "PAW sampai lompat-lompat" (`app.js:124`) |
| Body movement | Triple jump: two `fzJumpBig` + one small settle hop; confetti 60 (one-off cap raise, still ≤ CONFETTI_MAX 120) |
| Facial movement | Eye pop 1.1 sustained through first two jumps; open mouth |
| Gaze | Up, then at the new level badge in the modal (lookAt) |
| Entry / exit | Spring; reverts through a 400ms Proud beat like LESSON_COMPLETE |
| Duration / loop | Transient 2800ms |
| Interrupt priority | P4 |
| SFX slot | **Level/Milestone** — extended motif phrase (~700ms), distinct from the lesson celebrate |
| Voice slot | Praise persona line ("Level B1 — keren!") — this moment justifies voice |

### 2.14 ACHIEVEMENT (`proud`)

| Field | Spec |
|---|---|
| Expression | #8 Proud (ears −6/−6, soft lids 8, soft mouth) |
| Pose | Arms back, chest puff `fz-chest` scale 1→1.06 (existing proud animation, now with an addressable target) |
| Body movement | Single chest-puff .6s + head translate(0,−2) lift; tail tip +12 held |
| Facial movement | Soft smile, contented lid-low; blink suppressed (existing NO_BLINK) |
| Gaze | At the badge/achievement UI element (lookAt), then user |
| Entry / exit | 240ms ease; auto-revert |
| Duration / loop | Transient 2200ms (existing) |
| Interrupt priority | P3 |
| SFX slot | **Reaction** — single warm chord tone from the struck-bar timbre, ≤300ms |
| Voice slot | none by default |

### 2.15 MILESTONE (`milestone`) — NEW

| Field | Spec |
|---|---|
| Expression | #8 Proud held → #10 Celebrating burst → #8 Proud settle (the direction-c MILESTONE recipe: "8 held + 10 burst") |
| Pose | Three-act: chest-puff proud stance (600ms) → two-arm cheer + big jumps (1600ms) → proud settle with tail-ring glow (800ms+) |
| Body movement | Strongest tier in the system; confetti 80; tail-ring glow loop borrowed from completion |
| Facial movement | Proud soft-lids → eye pop 1.12 + open mouth → soft mouth settle |
| Gaze | User → up → user |
| Entry / exit | Never entered directly from another celebration (must pass through ≥600ms of idle/proud — prevents celebration mush); reverts to idle |
| Duration / loop | Transient 3400ms, **rare by design** (§22: "do not use this intensity for every small event") |
| Interrupt priority | P4 (highest; nothing interrupts it except teardown/navigation) |
| SFX slot | **Level/Milestone** — the PAW Spark long form (17 R-4): Spark gesture + micro-expression + the category-6 flourish (14 §3.2), which is 13 §4.3's octave-up chord slot. One sound, not layered |
| Voice slot | Praise persona line, always allowed here |

### 2.16 Supporting states (kept, one-line specs)

| State | Expression | Behavior (unchanged unless noted) | Priority |
|---|---|---|---|
| `curious` | #4 Curious (asym ears −10/+4, asym brow) | lookAt + lean-in head translate(+4,0); 1400ms from `question-shown`, 900ms from `hover-answer` (idle-only guard kept) | P0 |
| `hinting` | #3 Excited + bulb accessory | Bulb pop .45s; 1900ms | P2 |
| `sleepy` | #12 Sleepy (lids 26, ear droop +10/+12, Zz) | Persistent; entered only via `idle-timeout`; drowse 3.4s loop | P0 |
| `sad` | **re-expressed as #14 Gentle concern** (concern mouth, ears +9/+9, lids 8, tail low −10; tear accessory removed from this state) | 2400ms then → `encouraging` (existing chain kept) | P2 |
| `love` | heart-eye swap (unchanged, identity asset) | 2000ms; heartbeat .9s | P2 |

---

## 3. Trigger wiring (real code events → states)

### 3.1 Wiring table — every event from audit 03 Task D

| Game/system event | Source (file:line) | Today | New wiring |
|---|---|---|---|
| ANSWER_CORRECT | `app.js:1737` `answerFeedbackSignal(true)` | `correct` → celebrating lv1–3 | **Kept** → CORRECT/CELEBRATING (lv via `_mem.streak`) |
| ANSWER_INCORRECT | `app.js:1737` `answerFeedbackSignal(false)` | `wrong` → confused / encouraging | **Kept** → INCORRECT (wrongRow logic kept) |
| AI-analyzing panel | `app.js:1779` | `thinking` 900ms | **Kept** → THINKING |
| QUESTION_SHOWN | supported, quiz never emits (`fiezel-mascot.js:322`) | level-guard only (`app.js:2941`) | **Wire quiz render**: emit `question-shown` with the question panel as lookAt target on every new question → `curious`. First question of a session emits `lesson-start` instead (see 3.2) |
| LESSON/SESSION_COMPLETE | `app.js:4954-4957` | `lesson-complete` → completion | **Kept** → LESSON_COMPLETE |
| STREAK_LOST | `app.js:2716-2718` | `sad → encouraging` | **Kept**, sad face now Gentle concern |
| GEMS_AWARD | `app.js:3828-3837` | ⚠️ broken `'correct-streak'` | **Fixed** — see 3.3 defect 1 |
| GEMS_SPEND | `app.js:3839+` | none | `favorite` → `love` 2000ms (a small "thank you" beat; spending is a positive act, not a loss) |
| LEVEL ENTRY modal | `app.js:2911-2915` | `onboard` → greeting | **Kept** → GREETING |
| WRONG-COUNT WARNING | `app.js:2941-2943` | `wrong` / `question-shown` | Change the ≥8-miss branch from `wrong` to direct `encouraging` (a warning modal is not a fresh mistake; don't double-punish) |
| DEMOTION | `app.js:2969` | `wrong` | Change to `streak-lost` semantics: Gentle concern 2400ms → ENCOURAGING (audit itself flags `wrong` as the wrong read here) |
| LEVEL EXAM PASS | `app.js:3035` | ❌ none | **NEW `level-up` event → LEVEL_UP** — see 3.3 defect 2 |
| Placement test complete | `app.js:4972` branch | shares lesson-complete | **`milestone` (key `placement-complete`)** — a one-time major moment, stronger than a routine session end |
| MASTERED (flashcard) | `app.js:4132,4150` | none | `badge-earned` → ACHIEVEMENT (proud); haptic already fires there |
| Writing feedback delivered | `app.js:3957` | screen confetti only | `badge-earned` → ACHIEVEMENT (pairs the existing `celebrate()` with a character read) |
| DAY-STREAK maintained | `app.js:1097-1100`, panel `:3200-3206` | none | Daily first-open with streak intact → `badge-earned` (ACHIEVEMENT); streak crossing 7/30/100 → `milestone` (keys `streak-7/30/100`) |
| Session outcome scored | `app.js:4945,4950` | none | No new state — LESSON_COMPLETE already covers the moment; negative outcomes must **not** add a sad beat on the result screen (§20) |
| Listening start/stop | `app.js:3846` / `:2650` | listening / idle | **Kept** → LISTENING |
| Coach open / ask AI | `fiezel-coach-bubble.js:312,333,353` | onboard, thinking→encouraging | **Kept**; when the coach answer is spoken via `FiezelVoiceSay`, SPEAKING replaces the `encouraging` hold (see 3.4) |
| Onboarding name submitted | `app.js:3537` | `onboard` | **Kept** → GREETING |
| Voice playback lifecycle | `fiezel-voice-say.js:142` say()/stop(); subtitle `begin/advance`; `fiezel-neural-voice-degraded` | none | **NEW `speak-start` / `speak-end` events → SPEAKING** (suppressed on degraded/L5) |
| App return / new day | no timer exists today | none | **NEW visibility/session-gap trigger → WELCOME_BACK** (see 3.3, orphan `wake`) |

### 3.2 New event vocabulary (additions to `react()`)

Additive, so every existing caller keeps working:

| New event | → State | Notes |
|---|---|---|
| `lesson-start` | LESSON_START | Emitted by quiz session init (the same place that renders question 1). detail.target = question panel |
| `level-up` | LEVEL_UP | Emitted at `app.js:3035` |
| `milestone` | MILESTONE | detail.key required (`streak-7`, `placement-complete`, …) — used for once-per-key gating (§4.5) |
| `welcome-back` | WELCOME_BACK | Emitted by the return-detection wrapper (3.3, orphan 4/5) |
| `speak-start` / `speak-end` | SPEAKING / release | Emitted by a thin wrapper around `FiezelVoiceSay.say()` resolve lifecycle; `speak-end` restores the pre-speech persistent state |
| `reward` | CELEBRATING lv2 | Generic mid-tier reward event (gems etc.) that does **not** touch `_mem.streak` — answer-streak memory stays answer-only |

### 3.3 Defect fixes (audit 03 findings)

**Defect 1 — invalid `pawReact('correct-streak')` at `app.js:3836`** (silent no-op, `fiezel-mascot.js:363-365`).
Fix: replace with `pawReact('reward')` → CELEBRATING lv2 (28+10×2 confetti, two-arm cheer). Rationale: gems-for-listening-streak is a mid-tier reward — bigger than one CORRECT, far below MILESTONE — and must not inflate the answer-streak escalation memory, hence the dedicated `reward` event rather than `correct`. (Interim hotfix if shipped before the new machine: `pawReact('badge-earned')`.)

**Defect 2 — missing level-exam-pass reaction at `app.js:3035`** despite copy promising jumps (`app.js:124`).
Fix: emit `pawReact('level-up')` → LEVEL_UP (2.13) right after the pass is confirmed, before the level modal paints, so the modal's 56px face enters already mid-jump. This is the audit's "prime MILESTONE hook" resolved as LEVEL_UP; MILESTONE stays reserved for the rarer keys in 3.1.

**Defect 3 — seven orphaned events** (supported by `react()`, zero callers). Proposed drivers:

| Orphan | Proposed caller | → State |
|---|---|---|
| `hint` | Hint UX (copy exists at `app.js:115`): fire when a hint is revealed to the learner | `hinting` (Excited + bulb), 1900ms, cooldown §4.5 |
| `badge-earned` | Streak-badge panel award (`app.js:3202-3206`), `markMastered` (`app.js:4132,4150`), writing feedback saved (`app.js:3957`) | ACHIEVEMENT (`proud`) |
| `favorite` | Favorite/bookmark action on vocab/flashcards; also GEMS_SPEND translation unlock (`app.js:3839+`) | `love` |
| `idle-timeout` | **New app-level idle timer** (none exists — audit D): 90s without pointer/key/scroll input, only on ambient screens (home, map, progress; never mid-question, never during LISTENING/SPEAKING) | `sleepy` |
| `wake` | First interaction after `sleepy` | `greeting` 1200ms (existing behavior). Additionally the same detector distinguishes: same-visit doze → `wake`; return after ≥4h away or a new calendar day (visibilitychange/app start vs. persisted `lastSeenAt`) → `welcome-back` |
| `hover-answer` | `pointerenter` on quiz answer options (desktop/pointer:fine only; no-op on touch) | `curious` 900ms if idle (existing guard) + lookAt |
| `answer-picked` | Answer option tap, in the beat between selection and grading | `thinking` 700ms + lookAt — this completes the §19 "answer selected → PAW notices" opening |

All seven are **reaction wiring only** — no game rule, reward value, or flow changes (master-prompt §4).

### 3.4 SPEAKING integration detail (voice → state, §23–24)

- Attach at the facade, not the engines: wrap `FiezelVoiceSay.say()` — on first audible playback emit `speak-start`, on resolve/`stop()` emit `speak-end`. The 5-layer fallback ladder is untouched (DO NOT REPLACE rule).
- Mouth beats come from `FiezelSubtitle.begin/advance` (already `currentTime`-driven per sentence — audit 03 C.4b). Within a sentence, beats run on the 110–160ms cycle; between sentences the prosody gaps (`GAP_MS`) naturally close the mouth to `soft`.
- Persona mapping (C.4c): explain (sid 2) → Happy base; praise (sid 5) → Excited base.
- Degraded path (C.4d): `fiezel-neural-voice-degraded` or L5 text-only → never enter SPEAKING; coach keeps its current `thinking → encouraging` choreography instead.
- Coach bubble: when the AI answer is voiced, the current `encouraging` 1600ms hold (`fiezel-coach-bubble.js:353`) is replaced by SPEAKING for the utterance, exiting into a short ENCOURAGING beat.

---

## 4. State machine rules

### 4.1 Legal transitions

Persistent states: `idle`, `curious`(held), `thinking`(held), `listening`, `sleepy`, `speaking`. Transient states auto-revert via `hold/then` (existing machinery).

- From **idle**: → any state.
- From **any transient**: → its `then` target (default idle; `sad → encouraging` chain kept; `completion`/`level-up` pass through a proud settle beat) or preempted per priority (4.2).
- From **listening**: → any P2+ reaction; caller re-enters listening afterwards (existing Skills Lab pattern). `listening-stop` → idle.
- From **speaking**: → exit only via `speak-end`/`stop()`/teardown; P3+ reactions overlay gesture-only (4.4); on exit → previous persistent state or idle.
- From **sleepy**: → only `wake` (greeting), `welcome-back`, or teardown. Reactions do not fire while asleep (the idle timer only runs on ambient screens, so this cannot eat answer feedback).
- Into **milestone**: only from idle/proud after ≥600ms (2.15); never chained directly from another celebration.
- **Forbidden**: transient → same transient re-trigger inside its cooldown (4.5); anything → `sad` except `streak-lost`/demotion; INCORRECT family → any celebration without passing through idle ≥300ms (prevents whiplash when a wrong is followed instantly by a correct on multi-part questions).

### 4.2 Interrupt priority ladder

| Priority | States | Rule |
|---|---|---|
| P4 | MILESTONE, LEVEL_UP, LESSON_COMPLETE | Interrupt anything (except a running P4 — queued instead, max queue 1, latest wins) |
| P3 | CELEBRATING, CORRECT, ACHIEVEMENT, WELCOME_BACK | Interrupt P0–P2; during SPEAKING, gesture-only overlay (4.4) |
| P2 | GREETING, INCORRECT, ENCOURAGING, LESSON_START, `hinting`, `sad`, `love` | Interrupt P0–P1 idle-ish states; dropped during SPEAKING |
| P1 | SPEAKING, LISTENING, THINKING | Persistent activity; yield to P2+ per rules above |
| P0 | IDLE, `curious`, `sleepy` | Interrupted by anything |

Equal priority: newest wins (matches today's last-call-wins `setState`), except the P4 queue rule.

### 4.3 Escalation memory

Keep `_mem` (`fiezel-mascot.js:226`) and extend:

| Field | Exists | Purpose |
|---|---|---|
| `streak` | ✅ | CORRECT→CELEBRATING lv1–3 (min(3, streak)); reset by `wrong`, `lesson-complete` |
| `wrongRow` | ✅ | 1st miss → INCORRECT(confused), ≥2 → ENCOURAGING; reset by `question-shown`/`correct` |
| `greets` | ✅ | First greet longer (1900 vs 1600ms) |
| `looks` | ✅ | lookAt bookkeeping |
| `lastFire[state]` | NEW | Timestamps for cooldowns (4.5) — per instance, session-scoped |
| `milestoneKeys` | NEW (persisted in app storage, not the element) | Once-ever gate per `detail.key` for MILESTONE |
| `lastSeenAt` | NEW (persisted) | WELCOME_BACK gap detection (≥4h or new day) |

Escalation stays **session-mood, not judgment**: nothing in `_mem` may alter rewards, XP, or difficulty (§4 boundary).

### 4.4 Speech-channel rule

SPEAKING owns the mouth. While speaking: P3+ events animate ears/brows/arms/tail/confetti only, mouth beats continue uninterrupted; P2− events are dropped (not queued — stale encouragement after a speech is noise). `speak-end` releases the channel and restores the pre-speech persistent state.

### 4.5 Anti-spam cooldowns

| State / event | Cooldown | Rationale |
|---|---|---|
| CORRECT/CELEBRATING | none between answers (rapid-fire is the game feel) but confetti hard cap 120/instance kept; re-enter restarts keyframes (existing `_restartAnimations`) | keep responsiveness |
| ENCOURAGING SFX | ≥60s between encouragement sounds | supportive, not nagging |
| `hinting` | ≥8s per fire | hint spamming shouldn't turn PAW into a strobe |
| `curious` via `hover-answer` | idle-only guard (existing) + ≥900ms between fires | pointer sweeps across 4 options must not chain 4 leans |
| GREETING | ≥1 per screen mount; coach re-open within 30s does not re-greet | greeting fatigue |
| WELCOME_BACK | max 1 per 4h, persisted | must stay special |
| MILESTONE | once per `milestoneKeys` key, ever | §22 rarity |
| LEVEL_UP | naturally rare (exam pass); no extra gate | — |
| `sleepy` | idle timer 90s, ambient screens only; resets on any input | never dozes mid-task |
| Voice slots | praise micro-lines ≤1 per 4 corrects; any state voice line ≤1 per 45s | §25 "not annoying" applies to speech too |

### 4.6 Reduced-motion behavior per state (§33 + audit B.6 three layers)

The three existing gates stay exactly as-is: (1) OS `prefers-reduced-motion` scoped to the mascot subtree + confetti cap 8; (2) app setting → `body.reduce-motion` kills animation **and** `pawReact/pawSetState` return early (`app.js:2697-2699`); (3) onboarding `.fiezel-ob-still` freeze with pre-applied `st-<pose>` classes.

Because gate 2 blocks reactions entirely, the per-state static story below applies to gate 1 (OS-level) and gate 3, where the state class still lands but keyframes don't run. Rule: **every state must read as a static pose** (Direction C D3 — every state is a readable static frame):

| State | Reduced-motion presentation |
|---|---|
| IDLE | Static Neutral; NO blink loop — strict zero-motion per 07 §4 / BRAND-GUIDE §4 (17 R-5: the shipped ungated loop renders as a lid SNAP under the OS gate, not a tween) |
| GREETING / WELCOME_BACK | Static Welcoming pose (arm up, pads on), no wave loop; hold then static revert |
| LISTENING | Static Happy + headphones; no groove, no notes |
| THINKING | Static paw-to-chin, dots shown as static ellipsis (no loop) |
| SPEAKING | **State not entered** (2.5); face stays prior static pose; subtitles carry the speech |
| CORRECT / CELEBRATING | Static Celebrating pose, confetti ≤8 (existing cap), no jumps |
| INCORRECT | Static Confused (sweat static) |
| ENCOURAGING | Static Encouraging point, no nod |
| LESSON_START | Static Curious lean (translate applied as end-state, no tween) |
| LESSON_COMPLETE / LEVEL_UP / MILESTONE | Static Proud-with-arms-up composite, confetti ≤8, no jumps; SFX still allowed (sound isn't motion) unless muted |
| ACHIEVEMENT | Static Proud, chest at 1.06 end-state |
| `sleepy`/`sad`/`love`/`hinting`/`curious` | Static #12 / #14 / heart-eyes / Excited+bulb / Curious poses |

Transitions under reduced motion are instant class swaps (0ms), never eased — matching the existing freeze semantics.

---

## 5. Coverage check & acceptance

- All 15 required states defined with all 10 required fields (§11): ✅ (§2.1–2.15).
- All 14 runtime states accounted for in the migration table, none deleted: ✅ (§1.2).
- Every Task-D event wired or explicitly no-op'd with rationale: ✅ (§3.1).
- All three named defects resolved (invalid `correct-streak`, missing level-exam-pass, 7 orphans): ✅ (§3.3).
- Escalation memory, cooldowns, legal transitions, reduced-motion per state: ✅ (§4).
- Hard constraints honored: transform/opacity only, zero body rotation/mirroring, closed palette, no new accessories, single canonical rig source, `FiezelPaw` API unchanged (additive only), no game-design changes.
- Guardrail tests that must keep passing after implementation: `paw-mascot-test.js` contracts, `onboarding-test.js`, plus a new test asserting `react()` warns on unknown events **and** that `app.js` contains no call to an event outside the documented vocabulary (regression net for defect-1-class bugs).

Open handoff notes for the motion implementer (Wave 3 siblings): keyframes for the 5 new states live in `fiezel-motion.css` next to the existing 14; the `speak-start/end` events are emitted by the `fiezel-speech-bridge` module (14 §2.1 — subsumes the `fiezel-paw-voice-bridge` proposal) from `fiezel-speech` CustomEvent phases at the `FiezelVoiceSay` facade layer (17 R-2a); the second component copy in `website/assets/mascot/` and the 4 static SVG twins must be regenerated from the canonical component (E5).
