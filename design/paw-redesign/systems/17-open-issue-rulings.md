# 17 — Open-Issue Rulings (Binding)

Adjudicator: Open-Issue Adjudicator · Date: 2026-08-27
Scope: final rulings on Appendix A items **A-2, A-4 (secondary), A-5, A-6, A-7, A-8** of `FIEZEL-PAW-REDESIGN-SPECIFICATION.md`.
Evidence base: systems 07–14 in full; repo code `features/mascot/fiezel-mascot.js`, `features/mascot/fiezel-motion.css`, `features/audio/fiezel-ui-sfx.js`, `app.js`, `assets/brand/BRAND-GUIDE.md`; `directions/direction-c.svg`, `directions/direction-b-modernization.md`; proof-sheet generators `systems/build_sheet.py`, `systems/gen_poses_sheet.py`.
Naming: the character's official name is **PAW**. Every ruling below uses PAW; file titles that still say "Pau" are a Phase-1 rename concern, out of scope here except where an edit is already mandated (A-6).
**These rulings are binding. Edit manifests list the exact text changes; a later subagent applies them — no spec file was edited by this document.**

---

## R-1 (A-2) — Correct-streak mechanism: `reward` event + call-site change wins; one deprecation alias

**DECISION.** Implement 09 §3.3 / 13 §1.3: add first-class **`react('reward', {kind:'gems', amount})`** to the component and change the call site `app.js:3836` from `pawReact('correct-streak')` to `pawReact('reward', {kind:'gems'})`. 10 §5.3's `correct-streak → badge-earned` alias is **rejected**. One defensive alias is permitted: **`correct-streak` → `reward`** (see alias policy).

**Rationale.** 09 and 13 agree on mechanism, state, timing, and memory semantics, and 13 supplies the complete choreography (lv2 cheer + chest puff + one tail-ring glint, 1600 ms, confetti 38, `char.reward` SFX, 4 s cooldown, no `_mem.streak` touch); 10's alias would route a gems reward into `proud` (2200 ms ACHIEVEMENT), which is the wrong emotional tier and would fast-forward nothing but still misfile the moment. Keeping the dead event name alive as the primary mechanism also preserves a misleading vocabulary ("correct-streak" for a listening-gems award that is not an answer streak). A short-lived alias still protects any stale caller during rollout without keeping the bad name canonical.

**Final `react()` event vocabulary (22 events, canonical).**
Existing 15 (unchanged): `onboard`, `question-shown`, `hover-answer`, `answer-picked`, `correct`, `wrong`, `hint`, `listening-start`, `listening-stop`, `lesson-complete`, `streak-lost`, `favorite`, `badge-earned`, `idle-timeout`, `wake`.
New 7: `reward`, `level-up`, `milestone`, `welcome-back`, `lesson-start`, `speak-start`, `speak-end` (speech names per R-2a).

**Alias policy (exact).** Exactly ONE alias exists in `react()`: `case 'correct-streak': console.info('[fiezel-mascot] "correct-streak" is deprecated → "reward"'); return this.react('reward', detail);` — logged with `console.info` (not `warn`), once per session. No alias to `badge-earned`. No other aliases, ever; every other unknown event keeps the shipped `console.warn` + `return false` path. The alias ships in the same change as the `app.js:3836` call-site fix and is **removed one release after** telemetry/QA confirm no `correct-streak` emissions remain. The interim hotfix `pawReact('badge-earned')` (09/13) applies only if a release ships before `reward` exists.

**Edit manifest R-1.**

| # | File | Section | Old text | New text |
|---|---|---|---|---|
| 1 | `systems/10-motion.md` | §5.3, line 220 | `- `correct-streak` → alias of `badge-earned` (**fixes the dead event at `app.js:3836`**, audit Task D).` | `- `reward` → lv2 cheer + chest puff + tail-ring glint `{hold:1600}` (13 §1.3 choreography binding; fixes the dead event at `app.js:3836` via call-site change to `pawReact('reward')`; deprecation alias `correct-streak` → `reward` per 17 R-1, removed after one release).` |
| 2 | `systems/10-motion.md` | §7 checklist, line 317 | `- [ ] `speech-start/end`, `level-up`, `milestone`, `welcome-back`, `lesson-start`, `correct-streak` events wired; `correct-streak` no longer warns.` | `- [ ] `speak-start/end`, `level-up`, `milestone`, `welcome-back`, `lesson-start`, `reward` events wired; `app.js:3836` call site changed to `pawReact('reward')`; deprecation alias `correct-streak`→`reward` in place (17 R-1).` |
| 3 | `systems/12-lesson-layer.md` | §6d, line 335 | `- Fix dead `pawReact('correct-streak')` → `celebrating`/`proud` (`app.js:3836`, audit 03 #14).` | `- Fix dead `pawReact('correct-streak')`: call site → `pawReact('reward', {kind:'gems'})`; new `reward` event per 13 §1.3 / 17 R-1 (`app.js:3836`, audit 03 #14).` |
| 4 | `systems/14-voice-sfx.md` | §6 table, line 200 | `| Fix while in there | `app.js:3836` dead `'correct-streak'` react → `celebrating`/`proud` | 1-line, flagged in audit 03 |` | `| Fix while in there | `app.js:3836` dead `'correct-streak'` react → call site changed to `'reward'` (13 §1.3 / 17 R-1) | 1-line call-site change + new `react()` case, flagged in audit 03 |` |

---

## R-2 (A-4 secondary) — Speech wire format, WELCOME_BACK, LESSON_START, milestone proud-hold

### R-2a. Canonical speech event wire format

**DECISION.** Two layers, both canonical, one bridge:
1. **Wire format at the voice facade:** 14 §2.1's **`fiezel-speech` CustomEvent**, `detail = {phase, layer, currentTime?, duration?, cueIndex?}`, `phase ∈ start | progress | end | interrupt | silent`, emitted at the ~6 existing `fiezel-voice-say.js` seams. This is the only speech signal the voice code ever emits.
2. **`react()` vocabulary:** 09's **`speak-start` / `speak-end`** are what the bridge module emits into the mascot funnel (`speak-start` on phase `start`, `speak-end` on `end | interrupt | silent`-after-start, and on facade promise resolution as the authoritative fallback). 10 §5.3's names `speech-start`/`speech-end` are **superseded** — same design, renamed.
3. One bridge module: 14's `fiezel-speech-bridge.js` **subsumes** 09's `fiezel-paw-voice-bridge` (they are the same module; 14's name and phase logic win because 14 owns the voice seam analysis; 09's react-vocabulary names win because 09 owns state-machine plumbing per resolved A-1 precedence).

**Rationale.** 14's CustomEvent carries the timing payload (`currentTime`, `cueIndex`) that the viseme engine needs and that a bare `speak-start/end` pair cannot, and it is defined against the actual facade seams (L1–L5 ladder) with the degraded/silent phases already handled. 09's short names are the right shape for `react()`, whose vocabulary is verbs-into-states, not transport. Splitting transport (CustomEvent) from vocabulary (react events) means neither spec's machinery is discarded and the mouth engine and the state machine each get the signal shape they were designed for.

### R-2b. WELCOME_BACK duration — **2200 ms** (09 §2.10)

**DECISION.** WELCOME_BACK is a real new state, `TRANSIENT['welcome-back'] = 2200`, choreography per 09 §2.10. 10 §5.3's `greeting {hold:1900}` implementation shim and 11 §3's 1400 ms are superseded.

**Rationale.** 09's two-beat choreography (300 ms recognition perk + eye pop, then the wave + tail double-flick) physically does not fit 1400 ms, and 10's 1900 ms was not a design decision — it simply reused the existing greeting hold. 09 owns state-machine plumbing (A-1 precedence) and is the only spec that actually designed the state rather than approximating it.

### R-2c. LESSON_START duration — **1600 ms** (09 §2.11)

**DECISION.** `TRANSIENT['lesson-start'] = 1600`, chain #4 Curious (600 ms) → #2 Happy (rest), auto-revert to idle, priority P2. 10 §5.3's `curious {hold:1100, then:'encouraging'}` is superseded.

**Rationale.** 09 is the state owner and its 600 ms Curious beat plus a settled Happy rest needs the full 1600 ms. 10's version is also semantically wrong, not just shorter: chaining into `encouraging` puts a coaching face on a moment where nothing has been answered yet — LESSON_START's job is attention direction (lookAt the question panel), which resolves into Happy, not encouragement.

### R-2d. Milestone proud-hold — **600 ms** (13 §4.3)

**DECISION.** MILESTONE Act I proud-hold = **600 ms**, per 13 §4.3's three-act structure (600 proud → 1600 burst → 800+ settle, total 3400 ms). 10 §1.3/§5.3's 1200 ms is superseded.

**Rationale.** Resolved A-1 precedence is explicit: 13 owns timing/choreography of the four reaction moments, MILESTONE included. 09 §2.15 — the state owner — independently specifies the same 600 ms act structure, so 10's 1200 ms is a lone outlier; and a 1200 ms hold inside a fixed 3400 ms transient would steal 600 ms from the burst that carries the Character Signature.

**Edit manifest R-2.**

| # | File | Section | Old text | New text |
|---|---|---|---|---|
| 1 | `systems/10-motion.md` | §5.3, line 215 | `- `speech-start` → `setState('speaking',{hold:0})`; `speech-end` → `setState('idle')`.` | `- `speak-start` → `setState('speaking',{hold:0})`; `speak-end` → `setState('idle')` (names per 09 §3.2 / 17 R-2a; emitted by the `fiezel-speech-bridge` from `fiezel-speech` CustomEvent phases, 14 §2.1).` |
| 2 | `systems/10-motion.md` | §2 SPEAKING loop policy, line 95 | `ended by `speech-end` → idle 240ms cross-settle.` | `ended by `speak-end` → idle 240ms cross-settle.` |
| 3 | `systems/10-motion.md` | §5.3 App wrappers, line 226 | `Voice hookup: wrap `FiezelVoiceSay.say()` — `speech-start` on first audible sentence, `speech-end` on resolve/stop.` | `Voice hookup: `fiezel-voice-say.js` emits `fiezel-speech` CustomEvents (14 §2.1); the speech bridge translates them to `speak-start` on first audible progress and `speak-end` on end/interrupt/resolve (17 R-2a).` |
| 4 | `systems/10-motion.md` | §7/interrupt rule, line 290 | `the mouth beat owns P13 until `speech-end`` | `the mouth beat owns P13 until `speak-end`` |
| 5 | `systems/10-motion.md` | §5.3, line 218 | `- `welcome-back` → `greeting {hold:1900}` + tail-tip +18° flick class.` | `- `welcome-back` → dedicated state `welcome-back {hold:2200}` per 09 §2.10 (recognition perk 300ms → wave + tail double-flick); no greeting shim (17 R-2b).` |
| 6 | `systems/11-splash-onboarding.md` | §3 table, line 127 (New state needed / Returning) | `duration 1400 ms transient → idle; blink allowed` | `duration 2200 ms transient → idle per 09 §2.10 (binding, 17 R-2b); blink allowed` |
| 7 | `systems/10-motion.md` | §5.3, line 219 | `- `lesson-start` → `curious {hold:1100, then:'encouraging'}`.` | `- `lesson-start` → dedicated state `lesson-start {hold:1600}`: #4 Curious 600ms → #2 Happy rest → idle, per 09 §2.11 (17 R-2c).` |
| 8 | `systems/10-motion.md` | §5.3, line 217 | `- `milestone` → `proud {hold:1200, then:'celebrating'}` with `level:3`, then settle (chain via `then`).` | `- `milestone` → `proud {hold:600, then:'celebrating'}` with `level:3`, then settle (chain via `then`) — Act I = 600ms per 13 §4.3 (binding, 17 R-2d).` |
| 9 | `systems/10-motion.md` | §1.3 table, line 81 | `| milestone *(new event)* | badges/tiers | proud held 1200ms → celebrating lv-3 burst → proud settle (`then` chain) |` | `| milestone *(new event)* | badges/tiers | proud held 600ms → celebrating lv-3 burst → proud settle (`then` chain; 13 §4.3 binding) |` |
| 10 | `systems/09-states.md` | §3.4/§5 handoff note, line 465 | `the `speak-start/end` wrapper belongs in a small `fiezel-paw-voice-bridge` module at the `FiezelVoiceSay` facade layer` | `the `speak-start/end` events are emitted by the `fiezel-speech-bridge` module (14 §2.1 — subsumes the `fiezel-paw-voice-bridge` proposal) from `fiezel-speech` CustomEvent phases at the `FiezelVoiceSay` facade layer (17 R-2a)` |

---

## R-3 (A-5) — Arm/ear/tail sign convention: canonical = literal SVG clockwise-positive as serialized

**DECISION.** The canonical convention for every published rotation value is the **literal SVG value as serialized** — clockwise-positive, per element — exactly what `direction-c.svg`, production `fiezel-motion.css`, and `systems/build_sheet.py` already output. Concretely:

- **Arms** (P16/P17, shoulder pivots (115,185)/(198,182)): `armL` **+ = out/up-raise, − = inward-across**; `armR` **− = out/up-raise, + = inward-across**. Amended ranges (08 §0.2): L −115…+130, R −130…+115.
- **Ears** (P3/P4, base pivots (108,52)/(212,52)): `earL` **− = perk, + = droop-back**; `earR` **+ = perk, − = droop-back** (mirror). Literal right-ear range −18…+14.
- **Tail** (P14/P15, single element, no mirror): literal = semantic; `tailB` ±8 @(212,244), `tailT` ±20 @(296,200); **+ = tip up/flick, − = settled low**.
- **Mirror conversion rule** for legacy semantic values (07 §1.4's "− = perk both ears"; the "raise = −N both arms" cheer shorthand): *left element literal = semantic value; right element literal = −(semantic value); tail unchanged.*
- 07 §2's expression tuples remain authored in the declared semantic ear convention (07 §1.4 documents the mapping and `build_sheet.py` implements it correctly). **Every other file's values are literal**, with the corrections in the manifest. `gen_poses_sheet.py` must negate `earR` before serializing (it currently writes `rotate({d["earR"]} …)` raw — its proof-sheet right-ear angles contradict `build_sheet.py`'s renders of the same poses, e.g. celebrating earR serialized −10 where the correct literal is +10; this is the concrete mixed-convention hazard).

**Rationale.** The literal convention is the only one with three independent physical witnesses: `direction-c.svg` serializes `arm-l rotate(105 115 185)` (raised wave) and `arm-r rotate(−14 198 182)`; production keyframes match exactly (`fzWave` arm-r −128…−104, `fzArmsUpL` +96/`fzArmsUpR` −96, `fzPoint` −94/−88, `fzChest` −46/−40, `fzHugL` −20/`fzHugR` +20); and pose exports are generated from these values (08 §0.2, selected-direction E5). Every arm value in 07/09/10/13 already coincides with the literal reading **except** the thinking chin-reach (authored −95 in 07 §2, 09 §1.2/§2.4, 10 §1.4/§6 — the canonical literal is **+96**, an inward-across sweep, per 08 §1.5 and `gen_poses_sheet.py`: "+96 keeps pads off the muzzle") and the symmetric "both arms −110…−120" cheer shorthand, which must be restated per side. A rig built naïvely from the mixed tables would raise the thinking arm outward instead of to the chin and mirror one ear the wrong way — cheap to fix on paper now, expensive to fix in exports later.

**Flagged (non-blocking) discrepancies, ruled here:**
1. `direction-c.svg` serializes the welcoming/waving right ear as literal **+4** (= perk 4°), while 07 §2 rows 4/13 author earR semantic **+4** (= droop, literal −4). The serialized concept file wins for exports; the 8° divergence is cosmetic. When regenerating exports, use literal **+4** and treat 07's semantic value as **−4** (the conversion table below already does).
2. 09 §1.2 row 4 calls the thinking chin-reach "P16 −95°" — wrong parameter (P16 is the **left** arm); the gesture is right arm **P17**, canonical literal **+96**.
3. 09 §2.5 puts the speaking presenting gesture on the **right** arm (−40 literal, small outward raise), while production `fzChest` (used by 10 §1.2 proud, −46/−40) targets the **left** arm inward. These are two different gestures on two different states; both values are legal literals; implementers must not merge the keyframes.

### Conversion table — every arm/ear/tail value in 07/08/09/10/13, both conventions

Conventions: **Literal** = canonical serialized value per element (this ruling). **Semantic** = mirror-symmetric shorthand (arms: + = raise out/up; ears: − = perk; tail: same as literal). ✱ = spec text must be corrected (see manifest).

| Source | Element · gesture | As written | Literal L / R (canonical) | Semantic |
|---|---|---|---|---|
| 07 §2 #1 Neutral | ears / arms / tail B,T | 0/0 · 0/0 · 0/0 | ears 0/0 · arms 0/0 · tail 0/0 | 0 all |
| 07 §2 #2 Happy | ears / tail | −4/−4 · 0/+8 | ears **−4 / +4** · tail 0/+8 | ears perk 4 · tip +8 |
| 07 §2 #3 Excited | ears / arms / tail | −8/−8 · +60/−60 · 0/+16 | ears **−8 / +8** · arms +60/−60 · tail 0/+16 | ears perk 8 · arms raise +60 · tip +16 |
| 07 §2 #4 Curious | ears / tail | −10/+4 · 0/+14 | ears **−10 / −4** (see flag 1: export serializes earR **+4**) · tail 0/+14 | earL perk 10, earR droop 4 · tip +14 |
| 07 §2 #5 Thinking | ears / armR / tail | +2/−6 · 0/−95 ✱ · 0/−4 | ears **+2 / +6** · arms 0 / **+96** ✱ · tail 0/−4 | earL droop 2, earR perk 6 · armR inward-across −96 · tip −4 |
| 07 §2 #6 Confused | ears / tail | +8/−8 · 0/−8 | ears **+8 / +8** · tail 0/−8 | earL droop 8, earR perk 8 · tip −8 |
| 07 §2 #7 Encouraging | ears / armR / tail | −6/−6 · 0/−90 · 0/+10 | ears **−6 / +6** · arms 0/−90 · tail 0/+10 | ears perk 6 · armR raise +90 (point) · tip +10 |
| 07 §2 #8 Proud | ears / arms / tail | −6/−6 · −10/+10 · 0/+12 | ears **−6 / +6** · arms −10/+10 | ears perk 6 · arms inward −10 · tip +12 |
| 07 §2 #9 Surprised | ears / arms / tail | −12/−12 · +20/−20 · 0/+20 | ears **−12 / +12** · arms +20/−20 | ears perk 12 · arms raise +20 · tip +20 |
| 07 §2 #10 Celebrating | ears / arms / tail | −10/−10 · +115/−115 · +6/+18 | ears **−10 / +10** · arms +115/−115 · tail +6/+18 | ears perk 10 · arms raise +115 (V) · base +6, tip +18 |
| 07 §2 #11 Calm | ears | +4/+4 | ears **+4 / −4** | ears droop 4 |
| 07 §2 #12 Sleepy | ears / tail | +10/+12 · 0/−6 | ears **+10 / −12** | earL droop 10, earR droop 12 · tip −6 |
| 07 §2 #13 Welcoming | ears / arms / tail | −8/+4 · +105/−14 · 0/+18 | ears **−8 / −4** (export serializes earR **+4**, flag 1) · arms +105/−14 | earL perk 8, earR droop 4 · armL raise +105, armR slight raise +14 · tip +18 |
| 07 §2 #14 Gentle concern | ears / arms / tail | +9/+9 · +12/−12 · 0/−10 | ears **+9 / −9** · arms +12/−12 | ears droop 9 · arms forward-drift ±12 · tip −10 |
| 08 §1.1 waving | ears / arms / tailT | −8/+4 · +105/−14 · +18 | as written = literal (08 header); earR mixed — see flag 1 | earL perk 8, earR droop 4 · armL raise +105 |
| 08 §1.2 pointing | ears / arm / tailT | −10/+2 · armL +88 (or armR −88) · +8 | literal as written; earR **+2**→ semantic −2 (perk 2) ✱ (08's earR values are 07's semantic values — read via mirror rule) | earL perk 10, earR perk 2 · arm raise +88 · tip +8 |
| 08 §1.5 thinking | ears / armR / tailT | +2/−6 · **+96** pads · −4 | earR literal **+6** ✱ · armR **+96** (canonical anchor value) | earR perk 6 · armR inward −96 · tip −4 |
| 08 §1.6 reading | ears / arms / tail | +2/+2 · −18/+18 · B−4 T−6 | ears literal **+2 / −2** ✱ · arms −18/+18 (both inward-down, holding) | ears droop 2 · arms inward −18 · base −4, tip −6 |
| 08 §1.x listening | ears | −4/−4 | ears literal **−4 / +4** ✱ | ears perk 4 |
| 08 §1.x presenting | arms / tailT | +60/−60 · +10 | literal as written | arms raise +60 · tip +10 |
| 08 §1.x encouraging | ears / armR / tailT | −6/−6 · −90 · +10 | ears literal **−6 / +6** ✱ · armR −90 | ears perk 6 · armR raise +90 |
| 08 §1.x celebrating | ears / arms / tail | −10/−10 · ±112 (t1 ±100, t3 ±118) · B+6 T+18 | ears literal **−10 / +10** ✱ · arms L +112 / R −112 (t1 ±100, t3 ±118) | ears perk 10 · arms raise 112 |
| 08 §1.x jumping | ears / arms / tail | −12/−12 · ±115 · B+8 T+20 | ears literal **−12 / +12** ✱ · arms L +115 / R −115 | ears perk 12 · arms raise 115 |
| 08 §1.x sitting | ears / arms / tail | +4/+4 · −10/+10 · B−8 T−12 | ears literal **+4 / −4** ✱ · arms −10/+10 (inward rest) | ears droop 4 · arms inward 10 |
| 08 §1.x walking | ears / arms / tail | −4/+2 · +24/−18 · B+5 T+10 | ears literal **−4 / −2** ✱ · arms +24/−18 (stride) | earL perk 4, earR droop 2 |
| 08 §1.x running | ears / arms / tail | +8/+10 · +45/−40 · B−6 T−18 | ears literal **+8 / −10** ✱ · arms +45/−40 (stride) | ears back 8/10 (wind) |
| 08 §1.x sleeping | ears / tailT | +10/+12 · −8 | ears literal **+10 / −12** ✱ | ears droop 10/12 · tip −8 |
| 09 §2.2 GREETING | armL wave | +105° pads | armL **+105** | raise +105 |
| 09 §1.2 r4 + §2.4 THINKING | armR chin | "P16 −95°" / "Right arm P17 to −95°" ✱ | armR **+96** (P17) ✱ | armR inward-across −96 |
| 09 §2.5 SPEAKING | armR presenting | −40° | armR **−40** (small outward raise; distinct from 10 §1.2 proud `fzChest` armL, flag 3) | armR raise +40 |
| 09 §2.6 CORRECT | one arm up | −80° pads | armR **−80** | raise +80 |
| 09 §2.7 CELEBRATING lv3 | both arms | "Both arms −110…−120°" ✱ | **L +110…+120 / R −110…−120** ✱ | raise 110…120 |
| 09 §2.9 ENCOURAGING | armR point | −90° pads | armR **−90** | raise +90 |
| 09 §2.10 WELCOME_BACK | ears / armL / tailT | −8/−8 · +105 · +18 | ears **−8 / +8** · armL +105 | ears perk 8 · raise +105 · tip +18 |
| 09 §2.11 LESSON_START | near ear / tailT | −10° · +14 | earL **−10** (near side = left) | perk 10 · tip +14 |
| 10 §1.2 greeting | armR `fzWave` | −128° (−104…−130 between beats) | armR **−128…−104** (production literal) | raise 104…128 |
| 10 §1.2 curious | ears / tailT | −10/+4 · +14 | ears **−10 / −4** (semantic tuple; export flag 1) | earL perk 10, earR droop 4 |
| 10 §1.2 encouraging | armR `fzPoint` | −94°→−88° | armR **−94→−88** | raise 88…94 |
| 10 §1.2 proud | arm `fzChest` | −40° | arm**L** **−46→−40** (production targets left arm inward; flag 3) | armL inward 40–46 |
| 10 §1.2 sad | ears / tailT | +9/+9 · −10 | ears **+9 / −9** | droop 9 · tip −10 |
| 10 §1.2 love | hug arms | ∓20° | **L −20 / R +20** (`fzHugL`/`fzHugR`, both inward) | inward 20 |
| 10 §1.3 lv-1 | arms / ears / tailT | ±96 · −10/−10 · +18 | arms **L +96 / R −96** (`fzArmsUpL/R`) · ears **−10 / +10** | raise 96 · perk 10 · tip +18 |
| 10 §1.3 lv-3 | arms / tail | "arms −110…−120° with pads" ✱ · B+6 T+18 | arms **L +110…+120 / R −110…−120** ✱ | raise 110…120 |
| 10 §1.3 level-up | ears / tailB | −12 both · +8 | ears **−12 / +12** | perk 12 · base +8 |
| 10 §1.4 + §6 diagram | armR thinking | −95° ✱ (lines 87, 277) | armR **+96** ✱ | inward −96 |
| 10 §1.5 speaking | tailT | +6 hold | +6 | tip +6 |
| 13 §1.1 CORRECT lv1 | ears / arm / tailT | −8/−8 begin, settle −10/−10 · one arm −80 pads · +18 | ears **−8/+8 → −10/+10** · armR **−80** | perk 8→10 · raise 80 · tip +18 |
| 13 §1.2 lv2 | both arms | "both arms −96°" ✱ | **L +96 / R −96** ✱ | raise 96 |
| 13 §1.2 lv3 | arms / ears / tail | "arms −110…−120°" ✱ · −10/−10 · B+6 T+18 | arms **L +110…+120 / R −110…−120** ✱ · ears **−10/+10** | raise 110…120 · perk 10 |
| 13 §1.3 `reward` | two-arm cheer | "−96°" ✱ | **L +96 / R −96** ✱ | raise 96 |
| 13 §2.2 INCORRECT | ears / arms / tailT | +9/+9 · ±12° forward drift · −10 | ears **+9 / −9** · arms **+12 / −12** | droop 9 · forward 12 · tip −10 |
| 13 §2.2 melt/hand-off | ears / armR / tailT | −6/−6 · point −90 pads · +10 | ears **−6 / +6** · armR **−90** | perk 6 · raise 90 · tip +10 |
| 13 §3.1 LESSON_COMPLETE | arms / ears / tail | "−115°/+115°" · −10/−10 · B+6 T+18→+12; settle ears −6/−6 | arms **L +115 / R −115** · ears **−10/+10 → −6/+6** | raise 115 · perk 10→6 |
| 13 §4.2 level-up | ears / arms / tail | −12/−12 · cheer −120° pads ✱ · B+8 T+18 | ears **−12 / +12** · arms **L +120 / R −120** ✱ | perk 12 · raise 120 · base +8 |
| 13 §4.3 milestone Act I | ears / tailT | −6/−6 · +12 | ears **−6 / +6** | perk 6 · tip +12 |
| 13 §4.3 milestone Act II | arms / ears / tail | cheer −120° ✱ · −12/−12 · B+8 T+20 | arms **L +120 / R −120** ✱ · ears **−12 / +12** | raise 120 · perk 12 · tip +20 (max) |

**Edit manifest R-3.** (Values marked ✱ above; symmetric shorthand corrections are one edit per occurrence.)

| # | File | Section | Old text | New text |
|---|---|---|---|---|
| 1 | `systems/07-expressions.md` | §2 table preamble, line 114 | `Arm signs per P16/P17: left raise = positive, right raise = negative. "brows —" = hidden (opacity 0).` | `Arm signs per P16/P17 are LITERAL serialized values (17 R-3): armL + = out/up-raise, − = inward-across; armR − = out/up-raise, + = inward-across. Ear tuple values remain semantic per §1.4 (right-ear literal = −value). "brows —" = hidden (opacity 0).` |
| 2 | `systems/07-expressions.md` | §2 table row 5 (Thinking), line 122 | `0 / −95 (on)` | `0 / +96 (on) — literal; inward-across chin-reach per 08 §1.5 / 17 R-3` |
| 3 | `systems/09-states.md` | §1.2 table row 4, line 29 | `Gains Direction C paw-to-chin arm pose (P16 −95°).` | `Gains Direction C paw-to-chin arm pose (right arm P17, literal +96° per 17 R-3).` |
| 4 | `systems/09-states.md` | §2.4 THINKING pose, line 106 | `| Pose | Right arm P17 to −95°, paw capsule near chin |` | `| Pose | Right arm P17 to +96° (literal, inward-across per 08 §1.5 / 17 R-3), paw capsule near chin |` |
| 5 | `systems/09-states.md` | §2.7 CELEBRATING pose, line 152 | `| Pose | Both arms −110…−120° with pads (the two-arm cheer Direction C unlocks) |` | `| Pose | Two-arm cheer, literal L +110…+120° / R −110…−120° with pads (17 R-3; the cheer Direction C unlocks) |` |
| 6 | `systems/10-motion.md` | §1.4 THINKING, line 87 | `right arm −95° paw-to-chin (700ms `--fz-spring`)` | `right arm +96° paw-to-chin (literal, 17 R-3; 700ms `--fz-spring`)` |
| 7 | `systems/10-motion.md` | §6 diagram, line 277 | `arm-R    0° ──────────► −95° (700ms spring)` | `arm-R    0° ──────────► +96° (700ms spring)` |
| 8 | `systems/10-motion.md` | §1.3 lv-3 row, line 78 | `arms −110…−120° with pads` | `arms literal L +110…+120° / R −110…−120° with pads (17 R-3)` |
| 9 | `systems/13-reactions.md` | §1.2 tier table lv2 row, line 60 | `both arms −96° two-arm cheer, pads on` | `two-arm cheer literal L +96° / R −96°, pads on (17 R-3)` |
| 10 | `systems/13-reactions.md` | §1.2 tier table lv3 row, line 61 | `arms −110…−120° pads` | `arms literal L +110…+120° / R −110…−120° pads (17 R-3)` |
| 11 | `systems/13-reactions.md` | §1.3 reward table, line 74 | `two-arm cheer −96° with pads` | `two-arm cheer literal L +96° / R −96° with pads (17 R-3)` |
| 12 | `systems/13-reactions.md` | §3.1 timeline, line 144 | `both arms −115°/+115° with pads P18` | `both arms literal L +115° / R −115° with pads P18 (17 R-3)` |
| 13 | `systems/13-reactions.md` | §4.2 table, line 195 | `two-arm cheer −120° pads` | `two-arm cheer literal L +120° / R −120° pads (17 R-3)` |
| 14 | `systems/13-reactions.md` | §4.3 Act II, line 207 | `two-arm cheer −120° pads` | `two-arm cheer literal L +120° / R −120° pads (17 R-3)` |
| 15 | `systems/13-reactions.md` | §5 table rows lv2/lv3/LESSON_COMPLETE/level-up (lines 221, 222, 226, 227) | `both arms −96°` / `arms −110…−120°` / `arms −115° P18` / `arms −120°` | `arms L +96/R −96` / `arms L +110…+120 / R −110…−120` / `arms L +115/R −115 P18` / `arms L +120/R −120` (each with `(17 R-3)`) |
| 16 | `systems/08-poses.md` | §0.2 parameter table, earL/earR row | `rotate deg @ ear base pivots; − = perk-in, + = droop-back; −14…+18` | `rotate deg @ ear base pivots; values in pose tuples are SEMANTIC (− = perk, + = droop, both ears); right-ear LITERAL serialized value = −(tuple value), mirror rule 17 R-3; semantic range −14…+18 (literal earR −18…+14)` |
| 17 | `systems/gen_poses_sheet.py` | earR serialization | `rotate({d["earR"]} 212 52)` | `rotate({-d["earR"]} 212 52)` (match `build_sheet.py`'s mirror; regenerate the 08 proof sheet in the same change) |
| 18 | `systems/07-expressions.md` | §2 rows 4 & 13 earR — NO EDIT; instead add one footnote under the table | *(new footnote)* | `Note (17 R-3 flag 1): direction-c.svg serializes the Curious/Welcoming right ear as literal +4 (perk 4°), i.e. semantic −4; the semantic +4 in rows 4/13 is an 8° cosmetic divergence. Exports follow the serialized concept file.` |

---

## R-4 (A-6) — Character Signature: one definition, named the **PAW Spark**

**DECISION.** There is exactly one FIEZEL Character Signature, named the **PAW Spark** (14 §4's "Pau Spark" renamed; 11 §1.3's "Gold Beat" is the same signature's splash instance, name retired).

- **Gesture (canonical, from 14 §4, ≈900 ms, rotation-free):** left arm to literal +105° with pads shown, asym ear perk (semantic L −8 / R +4; export literal −8 / +4 per R-3 flag 1) at 0 ms → quick double-blink into happy-arc eyes + `open` smile at ~105 ms → tail-tip +18° flick + head translate (+2,−2) at ~210 ms → hold ~400 ms → release 300 ms `--fz-out`. Beats 1/2/3 land on the three motif notes.
- **Audio policy (one sound per occurrence, never layered, always ducked under voice per 14 §3.1):**
  - **Splash:** no new asset — the existing choreography b4/b5 A4 gold-bar beat IS the sound (11 §1.3 wins for the splash; the splash itself remains OWNER-gated per m025-80).
  - **First greeting of session:** the short form — new `VOICES` entry F4→A4→C5, mallet-bright, ≤420 ms (14 §4).
  - **LEVEL_UP / MILESTONE:** the long form — the category-6 Level/Milestone flourish (F2 + F4→A4→C5→G5, ≤1.1 s, 14 §3.2), which for `milestone` equals 13 §4.3's octave-up struck chord slot; the Spark gesture rides Act II. The short form and long form are the same signature at two lengths, never both at once.
- **Allowlist (union, exhaustive):** splash (OWNER-gated), first greeting of a session, level-exam pass / verified promotion (`level-up`), `milestone` keys. **Never:** onboarding steps 1–5, any question or assessment screen, placement tests, within 500 ms of active speech, head-crops < 42 px, more than twice per session, reduced-motion (static `st-welcoming` pose may render; sound skipped).
- **Onboarding completion (step 6):** **OWNER taste call — default EXCLUDED.** Step 6 already carries the full celebrating→proud moment; stacking the Spark on it violates 13 §4.1's ≥600 ms anti-mush guard and 11's scarcity rule. If OWNER opts in, the Spark replaces (not adds to) the proud settle's final beat, short-form audio only.

**Rationale.** 11 and 14 describe the same gesture DNA (welcoming spark + happy arcs + F4/A4/C5 motif) with conflicting names, allowlists, and audio; a signature that has two definitions is not a signature. 14's choreography is the only fully-timed gesture spec, so it wins the body; 11's "no new asset on the splash" wins the splash audio because it protects OWNER decisions m025-84/86 (one clock, one engine) and costs nothing; 09 §2.15/13 §4.3's milestone chord slot is absorbed as the long form rather than a third definition. Scarcity is the design value all three specs state, so the default answer to the one contested slot (onboarding completion) is exclusion, flagged for OWNER.

**Edit manifest R-4.**

| # | File | Section | Old text | New text |
|---|---|---|---|---|
| 1 | `systems/11-splash-onboarding.md` | §1.3 heading + first sentence, line 58 | `**FIEZEL Character Signature = "Gold Beat":** raised open paw with pads (Welcoming spark) + asymmetric ear perk + tail-tip flick, landing on the A4 major-third **at the same frame the gold accent enters the screen**.` | `**FIEZEL Character Signature = the "PAW Spark" (canonical definition: 14 §4 as amended by 17 R-4):** raised open paw with pads + asymmetric ear perk + tail-tip flick, landing on the A4 major-third **at the same frame the gold accent enters the screen** — the Spark's splash instance.` |
| 2 | `systems/11-splash-onboarding.md` | §1.3 reuse policy, line 58 | `Reuse policy (§26 "use this selectively"): splash (here), LEVEL_UP, and MILESTONE only. Never on routine correct answers, never in onboarding steps — scarcity is what makes it a signature.` | `Reuse policy (§26 "use this selectively", full allowlist in 17 R-4): splash (here), first greeting of a session, LEVEL_UP, and MILESTONE. Never on routine correct answers, never in onboarding steps 1–5; onboarding completion is OWNER-gated, default excluded — scarcity is what makes it a signature.` |
| 3 | `systems/14-voice-sfx.md` | §4 heading, line 157 | `## 4. FIEZEL Character Signature (§26) — "the Pau Spark"` | `## 4. FIEZEL Character Signature (§26) — "the PAW Spark" (canonical; 17 R-4)` |
| 4 | `systems/14-voice-sfx.md` | §4 Sound paragraph, line 168 | `**Sound:** the Level/Milestone flourish's *short form* — F4 → A4 → C5 only, mallet-bright, ≤420 ms` | `**Sound (context-dependent, 17 R-4):** on the splash, no new asset — the existing b4/b5 A4 beat is the sound (11 §1.3); on first greeting of a session, the *short form* — F4 → A4 → C5 only, mallet-bright, ≤420 ms; on level-up/milestone, the §3.2 category-6 *long form* — one sound per occurrence, never both` |
| 5 | `systems/14-voice-sfx.md` | §4 allowlist, lines 170–173 | `**When it plays (allowlist — nowhere else):**` … `- onboarding completion ("Pau welcomes you in").` | `**When it plays (allowlist — nowhere else; 17 R-4):**` with bullets: `- splash (OWNER-gated, m025-80);` `- first greeting of a session (first `onboard` react of the day);` `- level-exam pass / promotion (long-form audio — one event, one sound);` `- milestone keys (Spark rides 13 §4.3 Act II);` `- onboarding completion — OWNER taste call, DEFAULT EXCLUDED ("PAW welcomes you in"; if opted in, replaces the step-6 proud settle's final beat, short-form audio).` |
| 6 | `systems/09-states.md` | §2.15 SFX slot row, line ~204 | `**Level/Milestone** — the full FIEZEL Character Signature: signature gesture + micro-expression + signature SFX (§26). One sound, not layered` | `**Level/Milestone** — the PAW Spark long form (17 R-4): Spark gesture + micro-expression + the category-6 flourish (14 §3.2), which is 13 §4.3's octave-up chord slot. One sound, not layered` |
| 7 | `systems/13-reactions.md` | §4.3 signature row, line 208 | `The **FIEZEL Character Signature** = Act I's held proud beat + this burst + one signature SFX:` | `The **FIEZEL Character Signature (the PAW Spark, long form — canonical definition 14 §4 / 17 R-4)** = Act I's held proud beat + this burst + one signature SFX:` |

---

## R-5 (A-7) — Blink under reduced motion: **strict no-blink** (07 §4 / BRAND-GUIDE)

**DECISION.** Under any reduced-motion gate (OS `prefers-reduced-motion`, app `preferences.motion === false`, context freeze), the blink loop does **not** run. 09 §4.6's IDLE single-blink allowance is superseded; blink is added to 10 §5.5's explicit JS-gate list. Implementation: `_blinkLoop()` in `fiezel-mascot.js` gains a `matchMedia('(prefers-reduced-motion: reduce)')` check (skip scheduling / no-op each tick), ~2 lines, both component copies + regenerated twins per E5.

**Rationale.** The shipped behavior 09 implicitly defends is an ungated oversight, not a design: `_blinkLoop()` (fiezel-mascot.js:420-435) has no reduced-motion check, and because the OS media query collapses the mascot subtree's transitions to ~0 ms, the 70 ms lid tween becomes an instantaneous **snap** of the lids every 1.8–5.6 s — a hard flicker that is *worse* under reduced motion than the normal blink, the exact opposite of the setting's intent. The documented contract is unambiguous on the strict side: 07 §4 "zero motion — no blink loop", 07 §3's NO_BLINK extension to "everything under reduced motion", and BRAND-GUIDE §4 "Kalau salah satu aktif, maskot tidak bereaksi sama sekali — bukan bereaksi lebih pelan." 09's "blinking is not vestibular motion" argument evaluates the tween that reduced-motion users never actually see; the strict rule costs nothing and matches every written promise.

**Edit manifest R-5.**

| # | File | Section | Old text | New text |
|---|---|---|---|---|
| 1 | `systems/09-states.md` | §4.6 table, IDLE row, line 438 | `| IDLE | Static Neutral; blink loop allowed (single 70ms lid, no double-blink) — blinking is not vestibular motion |` | `| IDLE | Static Neutral; NO blink loop — strict zero-motion per 07 §4 / BRAND-GUIDE §4 (17 R-5: the shipped ungated loop renders as a lid SNAP under the OS gate, not a tween) |` |
| 2 | `systems/10-motion.md` | §5.5 item 1, line ~237 | `**JS-driven motions are not CSS animations and need explicit gates**: micro-gaze loop, speaking mouth beats, and confetti (already capped to 8) each check `matchMedia('(prefers-reduced-motion: reduce)')` and no-op;` | `**JS-driven motions are not CSS animations and need explicit gates**: the blink loop (`_blinkLoop()`, 17 R-5), micro-gaze loop, speaking mouth beats, and confetti each check `matchMedia('(prefers-reduced-motion: reduce)')` and no-op (confetti additionally keeps its ≤8 cap);` |

---

## R-6 (A-8) — Feet capsules: **48×22, rx 11** (08 §0.2)

**DECISION.** Feet are pill capsules **48×22, corner radius 11**, grouped as `fz-legs`, rendered in front of the chest — Direction B's *shape* cleanup at the *current* footprint. Direction B §2's 42×18 rx9 is rejected.

**Rationale.** The production feet already occupy a 48×22 footprint (ellipses rx 24 / ry 11 at cy 257), so 48×22 capsules preserve the shipped silhouette and seated-base width that every scale-tier test was run against; 42×18 belonged to Direction B's own wider-torso proportion set (124×100 body), which was not adopted, and shrinking only the feet under the kept proportions would narrow the ground line that Direction B itself identified as the thing feet must provide at 28 px ("feet capsules keep a visible ground line the old version lost"). At rx 11 the capsule is a true pill (rx = height/2), staying inside the brand's circle/capsule/triangle primitive rule. Owner: rig builder, Phase 1.

**Edit manifest R-6.**

| # | File | Section | Old text | New text |
|---|---|---|---|---|
| 1 | `systems/08-poses.md` | §0.2, feet sentence | `Feet are **pill capsules** (48×22, rx 11 — the Direction-B cleanup adopted in selected-direction.md), and the left-arm 4%-black stain is removed in all pose exports (second adopted cleanup).` | `Feet are **pill capsules** (48×22, rx 11 — the Direction-B cleanup adopted in selected-direction.md; binding per 17 R-6, superseding Direction B §2's 42×18 rx9), and the left-arm 4%-black stain is removed in all pose exports (second adopted cleanup).` |

*(No edit to `directions/direction-b-modernization.md` — it is a historical direction record, not a normative spec.)*

---

## Application notes for the manifest-applier subagent

1. Apply edits by unique substring match within the stated section; line numbers are advisory (files may have drifted).
2. R-3 manifest item 15 bundles four one-line table-cell edits; apply each cell separately.
3. R-3 item 17 edits a Python generator, not markdown; regenerate the 08 proof sheet afterwards.
4. Code changes named in R-1 (alias + call site), R-2a (bridge), and R-5 (`_blinkLoop` gate) are implementation-wave work, NOT spec edits — do not touch `fiezel-mascot.js`/`app.js` when applying this manifest.
5. Where new text says "17 R-n", keep it verbatim — it is the traceability link back to this ruling document.
