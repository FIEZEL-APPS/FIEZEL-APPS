# 13 — Reaction System (CORRECT · INCORRECT · LESSON_COMPLETE · MILESTONE tier)

Reaction Designer · Wave 3 · Date: 2026-08-27
Basis (binding): `directions/selected-direction.md` (Direction C rig, rotation-free body language, closed palette, cuteness guard E2, single-canonical-rig rule E5), `directions/direction-c-expressive.md` (rig params P1–P20, 14-expression tuples), `audit/03-usage-and-motion.md` (react() event map, `_mem` escalation memory, `CONFETTI_MAX` 120, defects).
Sibling Wave-3 specs this document aligns with: `systems/09-states.md` (state machine, wiring, priorities, new `reward`/`level-up`/`milestone` events) and `systems/10-motion.md` (keyframe inventory, easing tokens, celebration tier keyframes). Where this spec refines them, the delta is listed in §7.
Code ground truth: `features/mascot/fiezel-mascot.js` (react/setState/_confetti/_mem), `features/mascot/fiezel-motion.css`, `app.js` (`answerFeedbackSignal` :1737, `finishQuiz` :4954–4957, `gemsHook` :3836, `levelExamSettle` :3026).
Master prompt coverage: §19–22, §26 (signature), §33 (accessibility).
**Design spec only — no repo files modified.**

---

## 0. Conventions every reaction obeys

| Convention | Rule |
|---|---|
| Easings | `--fz-spring: cubic-bezier(.34,1.56,.64,1)` for celebratory attacks only; `--fz-out: cubic-bezier(.22,1,.36,1)` for every settle and for ALL concern-family movement (concern must never bounce); `--fz-calm`/`--fz-settle` per 10-motion §5.2 for ambient/handoff |
| Duration tokens | `--fz-fast 120ms` face toggles · `--fz-base 240ms` expression onsets · `--fz-slow 420ms` limb settles; reaction attack ≤ 200ms from event (10-motion QA rule 3) |
| Transform budget | transform/opacity only; rotation only on parts with documented pivots (ears P3/P4, tail bones P14/P15, arms P16/P17, detached accessories); **never** on `fz-all`/`fz-body`/`fz-head`/`fz-face` — leans and nods are translate-only (Direction C §6) |
| Clamps | All values inside Direction C §4 hard clamps (cuteness guard E2) — reactions never exceed them, at any tier |
| Living baseline | Breath P1 and blink P20 keep running under every reaction (blink except in `NO_BLINK` states); reactions layer on top, never pause the pulse |
| Entry funnel | All reactions enter through `FiezelPaw.react(evt, detail)` via the `pawReact()` wrapper — which returns early under `prefers-reduced-motion`/`preferences.motion===false`. **Therefore no reaction may be the sole carrier of information** (§6) |
| Memory | Escalation lives in `_mem {streak, wrongRow}` on the long-lived coach-bubble instance (Home faces are repainted per render) — tier logic below assumes exactly this |
| Confetti | Hard cap **120 live particles/instance** kept; ≤8 under OS reduced-motion; 1.4s particle life; all budgets below fit the cap, plus rate rules in §1.4 |
| SFX | One character-SFX voice max per reaction, from the `fiezel-ui-sfx` motif engine only (never a second engine); skipped while `FiezelVoiceSay` is speaking; respects `feedbackSoundsOn()` |
| Canonical source | Parts addressed by `fz-*` class + P-number against the ONE rig source `features/mascot/fiezel-mascot.js`; website copy + static SVG twins are generated exports (E5) |

Rig shorthand (Direction C §4): `P2` head translate · `P3/4` ears (−14…+18°) · `P5/6` lid-up (0–34) · `P7` lid-low (0…−14) · `P8` pupils · `P9` gaze (`--lx/--ly`) · `P10` eye pop (0.95–1.12) · `P11/12` brows · `P13` mouth (`smile·soft·open·o·sp1·sp2·wave·flat·concern·sad`) · `P14` tail base (±8°) · `P15` tail tip (±20°) · `P16/17` arms · `P18` pads · `P19` chest (1–1.06) · `P20` blink. Expression numbers = the 14-expression library (Direction C §3).

---

## 1. CORRECT (master prompt §19)

**Trigger (existing, unchanged):** `answerFeedbackSignal(true)` → `pawReact('correct')` (`app.js:1737`) — the single funnel that also fires haptic, success arpeggio, and the "Benar!" answer burst at t=0.

**Intent:** a short warm "yes!" that stays pleasant on the 40th repetition. The canonical per-answer reaction completes in ≤ **1200ms** trigger→idle. Tier-*entry* moments (the streak crossing 2, then 3) are allowed the longer CELEBRATING envelope — see §1.2.

### 1.1 Canonical timeline (tier lv1; the skeleton all tiers share)

| t (ms) | Beat | Rig / system action | Easing |
|---|---|---|---|
| 0 | **Trigger** | App-owned, unchanged: burst "Benar!" + `circle-check-big` icon, haptic `success`, `playFeedbackSound('success')` arpeggio — verdict is never late to the finger | — |
| 0–80 | **Notice** | P9 gaze already on the picked answer (set by `answer-picked`/`hover-answer` lookAt); pupils P8 snap to (0,−2) — up at the user; ears P3/P4 begin −8/−8 perk | 80ms `--fz-out` |
| 60–180 | **Eye react** | `fz-eye-open` → `fz-eye-happy` arc cross-fade (`--fz-fast` 120ms); lid-low P7 → −6 smile-squint at hop peak | 120ms opacity |
| 120–220 | **Smile** | P13 `smile` → `open` (display toggle; reads as one motion because the eyes led) | instant toggle |
| 180–1030 | **Small celebratory move** | Single squash-stretch hop on `fz-all` (`fzJump` .85s: crouch scale(1.1,.82) → air translateY −40px → land scale(1.05,.92) → 1); one arm −80° with pads P18 (09-states 2.6 pose); tail tip P15 +18° flick; ears settle −10/−10. **No body rotation** | .85s `--fz-spring` |
| ~200 | **SFX slot** `Correct` | The success arpeggio owns this moment. Optional single motif tail-note ≤250ms from `fiezel-ui-sfx` (09-states 2.6), default **off** — never double-score an answer | — |
| 180 | **Confetti** | 28 particles (existing `18+10×lv` formula, lv1) — subject to rate rule §1.4.3 | 1.25s fall |
| 1030–1180 | **Return** | Arm/tail/ears home, mouth → `smile`, happy arcs → open eyes (120ms fade), P7 → 0 | 150ms `--fz-out` |
| ≤1200 | **Idle** | Hold expires → `setState('idle')` | — |

Expression: **#10 Celebrating at low amplitude** (per 09-states 2.6 — CORRECT is `celebrating` lv1; visually adjacent to #2 Happy).

### 1.2 Escalation tiers for streaks — and the anti-inflation rule

Streak source: `_mem.streak` (incremented by `correct`, reset by `wrong` and `lesson-complete`); tier = `min(3, streak)` — the shipped escalation, kept. Tiers escalate **amplitude + garnish, never new moves** (selected-direction: "tiers by amplitude and repeat count").

| Tier | When | Celebratory move | Extra rig | Confetti | Envelope (motion → idle) |
|---|---|---|---|---|---|
| **lv1 = CORRECT** | streak 1, and every "repeat" correct (see rule below) | `fzJump` .85s ×1, one arm −80° | tail tip +18 | 28 | **≤1200ms** (§1.1) |
| **lv2** | streak *reaches* 2 | `fzJump` .8s ×2 double hop | two-arm cheer literal L +96° / R −96°, pads on (17 R-3) | 38 | 1600ms |
| **lv3** | streak *reaches* 3 | `fzJumpBig` .9s ×2 (air −58px) | arms literal L +110…+120° / R −110…−120° pads (17 R-3), ears −10/−10, tail base +6 / tip +18, eye pop P10 1.08 at first apex | 48 | 1900ms (existing hold) |

**Tier-entry rule (new — the anti-spam heart of §19):** the full tier choreography plays only when the streak *crosses into* the tier (streak hits 2, hits 3). Every subsequent correct at streak > 3 replays the **compact form**: lv1's single-hop ≤1200ms envelope wearing lv3's garnish (two-arm cheer, ears −10/−10), confetti **0**, re-bursting 24 particles on every 5th consecutive correct only. Rationale: shipped behavior replays the full 1900ms double-big-jump + 48 confetti on *every* correct once streak ≥3 — in a 10-question run of correct answers that is 7 identical maximal celebrations, which is exactly the celebration inflation §22 forbids. Escalate on the transition, not on the repetition; the big emotions stay banked for `reward`, LESSON_COMPLETE, and the milestone tier.

### 1.3 Fixing the invalid `pawReact('correct-streak')` — the real streak-reward reaction

Defect (audit 03 A.1 #14 / Task D): `gemsHook.award()` calls `pawReact('correct-streak')` (`app.js:3836`); `react()` has no such case → silent no-op, so the listening streak-of-5 gems award has **no mascot moment** despite screen `celebrate()` firing.

Fix (aligned with 09-states §3.3 defect 1): the call site changes to the new first-class event **`react('reward')`** — a mid-tier reward reaction that does **not** touch `_mem.streak` (answer-streak memory stays answer-only; a gems reward must not fast-forward the answer escalation). This document defines its choreography:

| Property | Spec |
|---|---|
| Event | `react('reward', {kind:'gems', amount})` — detail optional, rig ignores it |
| Expression / pose | #10 Celebrating at lv2 amplitude **+ Proud accent**: two-arm cheer literal L +96° / R −96° with pads (17 R-3), chest puff P19 1→1.06, one tail-ring glint (`fzRingGlow` ×1, not looped — the ring is the reward's visual rhyme) |
| Timeline | notice 0–80 (gaze to the gems toast via lookAt if a target is passed) → eye react 60–180 (happy arcs + eye pop 1.05) → smile→open 120–220 → double hop `fzJump` .8s ×2 with chest puff riding the second hop → settle 1450–1600 |
| Confetti | 38 (lv2 formula) — mascot-local; the screen-level `celebrate()` confetti is a separate layer, unchanged |
| Hold | **1600ms** → idle (between CORRECT 1200 and lv3 1900 — a reward, not a milestone) |
| SFX slot | `char.reward` — one bright two-note figure quoting the `celebrate` chord's opening interval (new voice in the `fiezel-ui-sfx` table); the gems toast + this figure is the whole score; `playFeedbackSound` does not fire here |
| Anti-spam | Same-event cooldown 4000ms (streak-of-5 gems cannot recur faster anyway); coalesce rule §1.4.1 applies |
| Interim hotfix | If shipped before the new event exists: `pawReact('badge-earned')` → `proud` (09-states note) — never leave the no-op |

Implementation note (Wave 4): add `case "reward"` to `react()` in the canonical `fiezel-mascot.js`; the unknown-event warning path stays for genuinely invalid events. Website copy + static twins regenerate (E5).

### 1.4 Anti-spam rules (CORRECT family)

1. **Coalesce window 250ms:** a second `correct` within 250ms (double-fire/duplicate grader path) is absorbed — streak still increments; no state re-enter, no `_restartAnimations`, no confetti.
2. **Interrupt forfeits confetti:** if a new `correct` lands while the previous is playing (fast answers), the new reaction replaces the old (native `setState`) but the interrupted burst's remaining budget is forfeited — never additive. `_confettiLive` already enforces the ≤120 cap; this keeps visual density sane well below it.
3. **Confetti rate:** any correct-family burst ≥28 particles may fire at most once per **3s**; inside the window the motion plays, confetti drops to 0.
4. **Tier ceiling + tier-entry rule:** escalation caps at lv3 forever; full tier choreography only on tier entry (§1.2). Streaks of 10 do not grow the reaction.
5. **SFX/voice:** ≤1 character-SFX voice per reaction; optional praise micro-line ≤1 per 4 corrects and off by default (09-states 2.6); all `char.*` slots skipped while PAW is SPEAKING.
6. **INCORRECT→CORRECT whiplash guard:** a celebration may not begin until ≥300ms after an INCORRECT-family state ended (09-states §4 forbidden-transition rule) — PAW does not mourn-and-cheer in one breath.

---

## 2. INCORRECT (master prompt §20) — "That's okay. Let's learn."

**Trigger (existing, unchanged):** `answerFeedbackSignal(false)` → `pawReact('wrong')`. App fires "Belum tepat" + supportive subline "Tenang, kita bedah jawabannya.", `circle-x` icon, error tone, haptic at t=0.

**Intent:** PAW is a guide, not a referee. The learner already got the verdict from burst + tone; PAW's only job is to soften the instant and pivot to "let's look at it together". Reaction ≤ **1000ms**, then hand off to the encouraging follow-up state. Being wrong must always be visually *quieter* than being right — INCORRECT's amplitude sits below CORRECT lv1.

### 2.1 Expression decision — Gentle concern, not alarm

The wrong-answer face is **#14 Gentle concern** — the expression the rig grew `fz-m-concern` for: a shallow soft arc that is explicitly NOT the sad mouth, sympathetic inner-up brows at ±8° (half of confused's ±14°), ears both back at a soft +9/+9. The shipped `confused` read (asym-ear alarm + `fzShakeX` head-shake + sweat drop) is retired from the wrong-answer path: a head-shake reads "no!", sweat reads alarm — both are verdict-flavored. (`confused` itself stays in the library for genuine-confusion contexts; on the wrong-answer path the runtime state may keep its name, but it wears the concern costume below — reconciliation note §7.2.)

### 2.2 Timeline (wrongRow = 1)

| t (ms) | Beat | Rig / system action | Easing |
|---|---|---|---|
| 0 | **Trigger** | App-owned verdict channels fire (text, icon, tone, haptic) — unchanged | — |
| 0–120 | **Notice** | P9 gaze to the picked answer; one blink P20 — a soft "I see" | 120ms |
| 120–480 | **Gentle-concern onset** | Ears P3/P4 → **+9/+9** back (soft, slow); lids P5/6 → **8**; brows P11/12 fade in 120ms, inner-up **±8°**; mouth P13 → **`concern`**; head P2 translate(**−2,+1**); tail tip P15 → **−10** settled low; arms P16/17 drift forward ±12° ("here with you") | 360ms `--fz-out` — unsprung; concern never bounces |
| 480–800 | **Hold beat** | One breath continues; pupils P8 glance to the answer (−2,+1) then return center toward the user — PAW checks the mistake, comes back to the learner. **Nothing shakes, loops, or droops further** | — |
| ~500 | **SFX slot** `Incorrect` | **Silent.** `playFeedbackSound('error')` already exists and is soft; no character SFX, no voice — silence is kinder (09-states 2.8) | — |
| 800–1000 | **Melt to encouraging** | Brows rotate to raised +3, ears forward −6/−6, mouth → `open`, lids → 0, head → (0,−1) — concern *melts* into encouragement through in-between faces (the rig's whole point) | 200ms `--fz-out` |
| 1000 | **Hand-off** | → `encouraging` (hold 1500ms → idle): right-arm point −90° with pads **at the question, never at the learner's mistake**; nod = `fz-head` translateY 0→+3→0 ×2 (rotation-free); tail tip +10 | point `--fz-spring`, nod ease-in-out |

State plumbing: `react('wrong')` (wrongRow 1) → concern beat `{hold:1000, then:'encouraging'}`. **wrongRow ≥ 2 skips the concern beat entirely** → straight `encouraging` (shipped logic kept — repeated misses get more support, not more mourning). wrongRow resets on `question-shown`/`correct` (shipped). Priority P2: any CORRECT-family P3 event preempts it (subject to the 300ms whiplash guard §1.4.6).

### 2.3 Hard prohibitions (never-punishing contract)

- **No** head-shake (`fzShakeX`), **no** sweat drop, **no** tear (`fz-tear`), **no** slump (`fzSlump`), **no** `sad` mouth, **no** ear droop past +9°, **no** darkened blush, **no** red flash on or near the mascot.
- No exaggerated sadness anywhere in the answer loop: the `sad` state (itself re-expressed as gentle concern per 09-states 2.16) is reserved for `streak-lost`/demotion choreography and is **unreachable from `wrong`**.
- PAW's final gaze before hand-off is centered on the user — facing the learner, ready to help, never looking away or down at the "failure".
- Amplitude ceiling: total displacement in this reaction (head 2–3px, ears 9°, tail −10°) stays below CORRECT lv1's hop — quieter than success, by contract.

### 2.4 Pairing with the encouraging follow-up

Concern → encouraging is one authored sentence: *"hmm — okay! here's how."* The concern beat may only `then:` into `encouraging` or `idle` — never `sad`, never a second concern. While `encouraging` plays, the app draws the ANALYZING panel → pembahasan (`showCoreAnalyzing` sets `thinking` 900ms on its own path at +700ms), so the emotional pivot lands *next to* the actual explanation: "let's learn" is said beside the learning.

---

## 3. LESSON_COMPLETE (master prompt §21)

**Trigger (existing, unchanged):** `finishQuiz` → `uiSfx('celebrate')` then `pawReact('lesson-complete')` (`app.js:4954–4957`), only on session closes that render the result screen. `_mem.streak` resets (shipped).

**Intent:** the major per-session character moment — clearly bigger than any answer tier, clearly below the milestone tier. Active choreography ≈ 2600ms inside the existing **3200ms** hold.

### 3.1 Timeline

| t (ms) | Beat | Rig / system action | Easing |
|---|---|---|---|
| 0 | **Trigger + signature SFX slot** | `uiSfx('celebrate')` — the full brand chord (F4→A4→… quoting the opening motif) IS the lesson-complete sound; the mascot adds **no second audio layer** (09-states 2.12) | — |
| 0–150 | **Notice — eyes brighten** | Happy-arc swap (120ms); eye pop P10 → 1.1; ears −10/−10; pupils (0,−2); mouth → `open` | `--fz-fast` |
| 150–1100 | **Celebration pose + jump 1** | `fzJumpBig` .95s on `fz-all` (squash-stretch scale + translateY −58px, rotation-free); both arms literal L +115° / R −115° with pads P18 (17 R-3); tip-toe stretch on `fz-foot-l/-r` at each apex (Direction C C11); tail base P14 +6, tip P15 +18. **Tail ring intact by construction:** the ring + its mask live inside `fz-tail-tip` (Direction C C7), so the ring rides every flick — never detached, duplicated, or masked out | .95s `--fz-spring` |
| 200 | **Confetti** | One burst of **46** (shipped count; ≈38% of the 120 cap). **Policy: single burst per lesson-complete** — no per-jump re-burst, no second wave; residue from earlier reactions is truncated by `_confettiLive` (shipped) | 1.25s fall |
| 1100–2050 | **Jump 2** | `fzJumpBig` repeat (shipped ×2 kept — completion has earned a double); `fz-stars` loop visible 150–2400ms (`fzStar` 1.2s, stagger .2s); `fzRingGlow` 1s alternate loop across the window | .95s `--fz-spring` |
| 2050–2450 | **Proud settle (400ms)** | Land into a #8 Proud beat: chest puff P19 → 1.06, mouth → `soft`, lid-low P7 −6, arms ease home, ears hold −6/−6, tail tip holds +12, gaze at the user | 400ms `--fz-out` |
| 2450–3200 | **Return** | Hold expires → `setState('idle')`; chest/tail/ears home over 300ms; final blink + `smile` | `--fz-out` |

Expression arc: **#9 Surprised flash → #10 Celebrating → #8 Proud → #1 Neutral** — a story with a beginning and an end, not a loop. Voice slot: optional praise-persona summary line (the product's existing praise-register moment); if it plays, no additional character SFX.

### 3.2 The missing level-exam-pass reaction (audit 03 defect 2) — its defined tier

Audit 03 Task D: level-exam pass (`levelExamSettle` passed branch, `app.js:3030`) has **no mascot reaction**, despite UI copy literally promising "PAW sampai lompat-lompat" (`app.js:124`). Both exam and normal sessions end in the same `finishQuiz`, so a passed exam currently gets only generic completion.

**Defined tier: `level-up` — the LEVEL_UP rung of the milestone tier (§4), one full step above LESSON_COMPLETE.** Wiring (aligned with 09-states 2.13/§3.3):

- When `examVerdict?.passed === true`, `finishQuiz` fires **`pawReact('level-up')` instead of** `lesson-complete` — never both; stacked celebrations read as noise and double-spend the confetti budget. Emit before the verdict UI paints so any 56px modal face enters already mid-jump.
- A **failed** exam fires no celebration and no sadness: the result screen pairs with `encouraging` (hold 1500ms) beside the verdict text — the verdict informs; PAW stays on the learner's side. `sad` is forbidden here.
- Placement-test completion: routed to the milestone tier with once-ever key `placement-complete` (09-states §3.1) — a one-time founding moment, not a routine session end.

---

## 4. MILESTONE tier (master prompt §22) — the reserved top of the ladder

The strongest reactions in the product form one tier with two rungs, both new runtime states (09-states 2.13/2.15): **`level-up`** (repeatable per promotion) and **`milestone`** (once-ever keys). Everything below them — answers, rewards, sessions — must stay visibly smaller, or this tier stops meaning anything.

### 4.1 Qualification — exactly what gets it, and what does not

| Qualifies | Event → rung |
|---|---|
| Level-exam pass / any verified-level promotion | `level-up` (§3.2) |
| Placement test completed (level established, once ever) | `milestone`, key `placement-complete` |
| Day-streak crossing 7 / 30 / 100 (once per key, ever) | `milestone`, keys `streak-7/30/100` |
| Terminal learning milestone (final level C2 verified) | `milestone`, key `level-c2` — praise voice line always allowed |

**Does NOT qualify** (each already has its own smaller, defined moment — celebration-inflation blocklist):

| Event | Its tier |
|---|---|
| Any correct answer / answer streak (any length) | CORRECT lv1–lv3 (§1.2) |
| Listening streak-of-5 gems award, any gems event | `reward` (§1.3) |
| Session / lesson complete (however good the score) | LESSON_COMPLETE (§3) |
| Daily streak *maintained*, daily target hit | at most `badge-earned` → `proud` (ACHIEVEMENT, 2200ms) |
| Badge earned, flashcard mastered, writing feedback saved | `proud` / `love` family, never milestone |
| Gems spent / feature unlock | none |

Gating: `milestone` requires `detail.key` and is **once ever per key**, persisted in app storage (`milestoneKeys`, 09-states §4.5); `level-up` cooldown 10s (cannot legitimately recur in-session). Rule of thumb for future wiring: if it can happen more than about once a week for an active learner, it is not this tier. Entry constraint: `milestone` is never chained directly from another celebration — it requires ≥600ms of idle/proud first (prevents celebration mush).

### 4.2 `level-up` — reaction design (transient 2800ms)

| t (ms) | Beat | Rig / system action | Easing |
|---|---|---|---|
| 0–150 | **Stunned notice** | #9 Surprised flash: eye pop P10 → 1.1, ears snap −12/−12, mouth `o`, brows raised +7 — the taken-aback beat that separates this tier from routine joy | 150ms `--fz-out` |
| 150–2000 | **"PAW sampai lompat-lompat"** | Triple jump: `fzJumpBig` ×2 + one small settle hop; both-ear full perk −12/−12 held; two-arm cheer literal L +120° / R −120° pads (17 R-3); tail base **+8** (max) / tip +18; open mouth, happy arcs, eye pop sustained through the first two apexes; confetti **60** at 200ms (one-off, ≤ cap; single burst) | `--fz-spring` per jump |
| ~300 | **SFX slot** `Level/Milestone` | Extended motif phrase ~700ms from `fiezel-ui-sfx` — distinct from the lesson `celebrate` chord (same DNA, longer sentence). Voice slot: praise-persona line ("Level B1 — keren!") — this moment justifies voice; SFX ducks under it | — |
| 2000–2400 | **Proud settle** | Chest puff 1.06, `soft` mouth, gaze via lookAt to the new level badge in the modal, then to the user | 400ms `--fz-out` |
| 2400–2800 | **Return** | → `proud`-flavored idle handoff (`then:'proud'` per 09-states), then idle | `--fz-out` |

### 4.3 `milestone` — reaction design (transient 3400ms, the FIEZEL Character Signature §26)

Three acts, per Direction C's recipe "#8 held + #10 burst":

| t (ms) | Act | Rig / system action | Easing |
|---|---|---|---|
| 0–600 | **I — Proud hold** | #8 Proud stance held: chest puff P19 1.06, ears −6/−6, soft lids 8, `soft` mouth, tail tip +12, gaze at the user — PAW *acknowledges* before celebrating; this restraint is the signature's micro-expression | 240ms ease into a 360ms hold |
| 600–2200 | **II — Burst** | #10 Celebrating at full clamp: two-arm cheer literal L +120° / R −120° pads (17 R-3), `fzJumpBig` ×2, eye pop **1.12** (max), open mouth, ears −12/−12, tail base +8 / tip +20 (max); confetti **80** at 700ms (single burst, ≤ cap; worst-case with residue truncated by `_confettiLive`); tail-ring glow loop borrowed from completion | `--fz-spring` |
| ~700 | **Signature SFX slot** | The **FIEZEL Character Signature (the PAW Spark, long form — canonical definition 14 §4 / 17 R-4)** = Act I's held proud beat + this burst + one signature SFX: the opening chord voiced once, an octave up, struck-bar timbre, ≤700ms — **one sound, never layered** (§26 "use selectively"). Voice slot: praise-persona line always allowed here; SFX ducks under it | — |
| 2200–3000 | **III — Proud settle** | Back to #8: chest 1.06 held, `soft` mouth, lid-low −6, ring glow slows and stops, gaze user → up → user | 800ms `--fz-out` |
| 3000–3400 | **Return** | Everything home; final blink + `smile` — PAW back at your side | `--fz-out` |

Priority P4 — nothing interrupts either rung except teardown/navigation.

---

## 5. Per-reaction rig sheet (consolidated)

| Reaction | Expression arc | Params exercised | Confetti | Envelope | Ease in → out |
|---|---|---|---|---|---|
| CORRECT lv1 | #10 low | P7 −6, P8, P9, P10, P13 open, P15 +18, P16 one-arm −80°, P18 | 28 | ≤1200ms | spring → out |
| lv2 (entry) | #10 | + arms L +96/R −96 (17 R-3), P3/4 −10 | 38 | 1600ms | spring → out |
| lv3 (entry) | #10 full | + arms L +110…+120 / R −110…−120 (17 R-3), P14 +6, P15 +18, P10 1.08 | 48 | 1900ms | spring → out |
| repeat (streak>3) | #10 compact | lv3 garnish on lv1 hop | 0 (24 each 5th) | ≤1200ms | spring → out |
| `reward` (streak-of-5 fix) | #10 lv2 + #8 accent | lv2 set + P19 1.06 + ring glint | 38 | 1600ms | spring → out |
| INCORRECT | #14 Gentle concern → #7 | P2 (−2,+1), P3/4 +9, P5/6 8, P11/12 inner ±8°, P13 concern→open, P15 −10, P16/17 ±12° | 0 | ≤1000ms + 1500ms follow-up | out → out (never spring) |
| LESSON_COMPLETE | #9 → #10 → #8 → #1 | P10 1.1, arms L +115/R −115 P18 (17 R-3), feet tip-toe, P14 +6, P15 +18→+12, P19 1.06, stars, ring glow | 46, single burst | 2600ms in 3200 hold | fast → spring ×2 → out |
| `level-up` | #9 → #10 → #8 | full clamp: P3/4 −12, P14 +8, P15 +18, arms L +120/R −120 (17 R-3), P10 1.1 | 60, single burst | 2800ms | out → spring → out |
| `milestone` | #8 held → #10 burst → #8 | max clamp: P10 1.12, P15 +20, P14 +8, P19 1.06 held | 80, single burst | 3400ms | ease → spring → out |

All: transform/opacity only; body mass never rotates; head language via P2 translate; every value inside Direction C clamps; breath + blink continue underneath (blink off only in shipped `NO_BLINK` states).

---

## 6. Reduced motion & accessibility (master prompt §33)

### 6.1 Reduced-motion behavior per reaction (the three shipped layers, kept)

| Layer | Mechanism | What each reaction becomes |
|---|---|---|
| **OS `prefers-reduced-motion`** | CSS collapses animation to ~0ms in the mascot subtree; `setState` still runs → the `st-*` class renders its **static pose** (brand checklist D3: every state is a readable static pose); confetti clamped ≤8 | CORRECT: static celebrating pose (happy arcs, open mouth, arm(s) up per tier). INCORRECT: static gentle-concern face (ears back, concern mouth, soft inner-up brows) → static encouraging point. `reward`: static two-arm cheer with chest puff. LESSON_COMPLETE: static celebration pose, stars visible, ring present un-animated. `level-up`/`milestone`: static proud-hold (chest 1.06, ears up, tail base +8) |
| **App setting `motion === false`** | `pawReact`/`pawSetState` wrappers return early — **reactions never fire**; PAW remains a calm static companion | All verdicts carried entirely by §6.2 channels — the reason no reaction may gate information |
| **Context freeze** (`.fiezel-ob-still`, modal `is-static`) | Pre-applied `st-<pose>` class renders the intended static expression | Modal faces (level guard, exam verdict) show the correct pose motionless |

**Static-fallback authoring rule:** each reaction's *peak* frame must be its most legible frame, because that is the only frame reduced-motion users see. Peaks: CORRECT = arm(s)-up hop apex; INCORRECT = full concern face; LESSON_COMPLETE = arms-up jump; milestone tier = proud hold. Keyframe authors verify peak-frame legibility at 42px (head-crop docks).

### 6.2 Critical feedback WITHOUT animation, sound, or color — per reaction

Contract: PAW **enhances** communication and is never the only channel. Every verdict must survive with the mascot removed, muted, motionless, and the screen in grayscale. All `<fiezel-mascot>` instances stay `aria-hidden="true"` (shipped via `faceMarkup`) — the text channels are what assistive tech announces.

| Reaction | Persistent text | Shape/icon (works in grayscale) | Structure / assistive | Haptic (non-visual, non-audio) |
|---|---|---|---|---|
| CORRECT | Burst **"Benar!"** + subline; pembahasan panel follows and stays on screen | `circle-check-big` — distinct **shape** from the X, not merely green | Feedback rendered into the document flow; ANALYZING panel `role="status" aria-live="polite"`; option lock removes ambiguity about which answer was judged | `success` pattern |
| INCORRECT | **"Belum tepat"** + "Tenang, kita bedah jawabannya." + the full explanation text (the actual learning) with the correct answer named | `circle-x` — distinct shape | Same aria-live flow; explanation is a permanent text artifact | `error` pattern — a distinct *rhythm*, readable without sight or sound of the mascot |
| LESSON_COMPLETE | Result screen: "SESSION COMPLETE" heading, **score % and "X dari Y" as text**, tutor-report line, outcome line, toast | Trophy icon; the score ring decorates the number, never replaces it | Full result document — headings + numbers, zero mascot dependency | `success`/`confirm` by accuracy |
| LEVEL_UP / MILESTONE | `examVerdict.message` full sentence ("…lulus… Ujian X sudah kebuka…") + toast; new level name as text on the result screen and Home level chip | Verdict block needs an icon or "LULUS/BELUM" text mark — **flag for UI team: `is-pass`/`is-fail` styling must not be color-only** (the wording already carries it; the mark makes it scannable) | Verdict inside the result document; level change visible as persistent text in two places | `success` |

Additional rules:
- SFX and haptics are reinforcement, never requirement: `feedbackSoundsOn()` off + haptics unavailable (all of iOS) + motion off still leaves a complete text-and-icon experience — this is the shipped design of `answerFeedbackSignal` and this spec preserves it.
- The mascot never introduces a color-only signal: its palette is closed and identical across all reactions; verdict color pairs in the UI (green-soft/red-soft) always co-occur with icon shape + wording.
- Reactions never move focus, steal `aria-live` announcements, or block input: options are locked by the grader, not by the animation; every reaction is `pointer-events:none` by the head-crop contract.

---

## 7. Reconciliation notes & event-map delta (for Wave 4)

Where this spec refines the sibling Wave-3 specs (single source of truth per topic — reactions own timing/choreography of the four §19–22 moments):

1. **CORRECT hold tightened** — 09-states 2.6 keeps the shipped 1900ms for lv1; this spec sets lv1 to ≤1200ms (§19 "keep it short") and reserves 1600/1900ms for lv2/lv3 **tier entries** only.
2. **Tier-entry anti-inflation rule** (§1.2) — refines 09-states 2.7 "kept verbatim": full tier choreography on streak transitions only; compact ≤1200ms form on repeats, confetti 0 (24 each 5th).
3. **INCORRECT face** — 09-states 2.8 keeps #6 Confused (with sweat) for the first miss; this spec re-costumes the wrong-answer path as **#14 Gentle concern** (no sweat, no head-shake, ears +9/+9, concern mouth) per §20's explicit brief, with the beat shortened 1800→1000ms into the encouraging hand-off. `confused` remains in the library for genuine-confusion contexts. Runtime state naming can stay as 09 defines it; the parameters here are binding for the wrong-answer look.
4. Adopted unchanged from 09-states/10-motion: the **`reward`** event as the `correct-streak` defect fix (choreography detailed here, §1.3), **`level-up`** (2800ms) and **`milestone`** (3400ms, once-per-key) states, confetti counts 28/38/48/46/60/80 within the untouched 120 cap, easing tokens incl. `--fz-calm`/`--fz-settle`, priorities P2/P3/P4, the ≥600ms milestone entry guard, and the 300ms INCORRECT→celebration whiplash guard.

| Event | Today | This spec |
|---|---|---|
| `correct` | celebrating lv1–3, hold 1900, full replay every correct at streak≥3 | lv1 ≤1200ms; full tiers on entry only; compact repeats; anti-spam §1.4 |
| `correct-streak` | **invalid → silent no-op** (defect) | call site → **`reward`**: lv2 cheer + chest puff + ring glint, confetti 38, hold 1600, `char.reward` SFX, 4s cooldown |
| `wrong` | confused (head-shake + sweat) 1800 → / encouraging | **gentle-concern** ≤1000 → encouraging; wrongRow≥2 → encouraging directly; prohibitions §2.3 |
| `lesson-complete` | completion hold 3200, confetti 46 | kept; authored arc #9→#10→#8→#1, single-burst policy, tail ring intact inside `fz-tail-tip`, `uiSfx('celebrate')` as the sole sound |
| level-exam pass | **no reaction** (defect) | **`level-up`** replaces lesson-complete on pass; failed exam → `encouraging`, never `sad` |
| placement complete / streak 7·30·100 / C2 | none / shared | **`milestone`** with once-ever keys; signature beat §4.3 |

Rig dependencies (all Direction C parts, nothing new): `fz-m-concern` mouth, first-class brows, 2-bone tail with ring inside `fz-tail-tip`, shoulder-pivot arms + `fz-pads-l`, `fz-head` translate channel, `fz-foot-l/-r` tip-toe, `fz-chest` puff. Canonical source `features/mascot/fiezel-mascot.js`; website copy + 4 static twins regenerate from it (selected-direction E5).
