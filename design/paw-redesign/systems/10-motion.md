# 10 — PAW Character Motion System

Author: Character Motion System Designer · Wave 3 · Date: 2026-08-27
Binding inputs: `directions/selected-direction.md` (Direction C rig, rotation-free body rule), `directions/direction-c-expressive.md` §4–6 (parameter table P1–P20), `audit/03-usage-and-motion.md`, master prompt §12–13, §18, §27, §33.
Code conventions honored: custom element `<fiezel-mascot>` + `self.FiezelPaw` funnel (`fiezel-mascot.js:485-526`), CSS keyframes on `st-*` classes, **transform/opacity only**, `fz-*` naming, `--fz-spring/--fz-out` tokens, TRANSIENT/hold/then machinery, generation-token race guard, `fz-state` DOM event, per-instance mask ids, mouth display-toggles, the four `[ADAPTASI]` constraints of `fiezel-motion.css:10-24`. **Design spec only — no repo files modified.**

---

## 0. The one hard rule (and what it breaks)

**Rotation-free body.** `rotate()` is permitted only on parts with a documented pivot: ears (P3/P4), tail bones (P14/P15), arms (P16/P17), and detached accessories (stars, notes, confetti, Zz, bulb sparkle). It is **forbidden** on `.fz-all`, `.fz-body`, `.fz-head`, `.fz-face`, `.fz-eyes`, and any group containing the head or torso mass. Leans, tilts, grooves, nods, wiggles are expressed with translate + scale only (Direction C §6). This is **stricter than current `fiezel-motion.css`** — the audit of every existing keyframe:

### 0.1 Keyframes that MUST change (contain body rotation)

| Keyframe (current) | Where | Violation | Replacement (spec §1/§7) |
|---|---|---|---|
| `fzTilt` (`fiezel-motion.css:72`) | `.st-greeting .fz-body` rotate 0→−5°→−4°→0 | body rotate | **`fzGreetShift`** — `.fz-head` translate(−5px, 1px) settle, same 1.5s `--fz-spring` envelope |
| `fzLean` (`:82`) | `.st-curious`/`.st-hinting .fz-body` rotate 4° | body rotate | **`fzHeadLean`** — `.fz-head` translate(5px, 2px) forwards, .5s `--fz-spring` |
| `fzGroove` (`:97`) | `.st-listening .fz-body` rotate ±4.5° alternate | body rotate | **`fzGrooveSway`** — `.fz-head` translateX −3px↔+3px alternate .62s + `fz-tail-base` counter-rotate ∓4° (tail pivot = legal) |
| `fzJumpBig` (`:123-126`) | 45% frame has `rotate(-4deg)` inside the jump | whole-figure rotate | keep name, **delete the rotate term**; scale/translateY squash-stretch already carries the read |
| `fzConf` (`:138`) | `.st-confused .fz-body` rotate −6° | body rotate | **`fzConfShift`** — `.fz-head` translate(−4px, 1px) forwards, .5s `--fz-spring`; `fzShakeX` face shake kept (translate-only) |
| `fzDrowse` (`:262-267`) | `.st-sleepy .fz-all` rotate −3.6°…+1.6° mixed with scale/translate | whole-figure rotate | **`fzDrowseCalm`** — same 3.4s loop, keep scale(1.012,.988) + translateY 0→3px "head-drop" beats, rotate terms removed; add `.fz-head` translateY 0→2px drift |
| `fzLoveWiggle` (`:314`) | `.st-love .fz-body` rotate ±3.5° | body rotate | **`fzLoveSway`** — `.fz-body` translateX ±3px, same .85s ease-in-out ×2 |
| `fzTailProud` / `fzTailSway` / `fzTailDroop` (`:256,282,303`) | rotate whole one-path `.fz-tail` at origin 20% 95% | not a violation (tail pivot) but the pivot is undocumented and the ring drags oddly | **remap to the 2-bone rig**: `fz-tail-base` rotate @(212,244) ±8°, `fz-tail-tip` rotate @(296,200) ±20°; ring + mask live inside the tip group (Direction C C7) |

### 0.2 Keyframes that are already legal (keep, with pivot notes)

`fzBreathe`, `fzEarTwitch` (ears; re-anchor origin to deep-base pivots (108,52)/(212,52) per C6), `fzWave`/`fzPoint`/`fzArmsUpL/R`/`fzChest`/`fzHugL/R` (arms; **re-anchor `transform-origin` from `50% 8%` to the C9 shoulder pivots** (115,185)/(198,182) so raised gestures clear the head silhouette), `fzPadsShow`, `fzDot`, `fzFloat`, `fzNod`, `fzShakeX`, `fzSweat`, `fzMascotPop`, `fzJump`, `fzStar` (accessory), `fzRingGlow`, `fzConfetti` (accessory), `fzPuff` (scale/translate only), `fzChinUp`, `fzSlump`, `fzEarSadL/R`, `fzZzz`, `fzTearDrop`, `fzHeartBeat`, `fzHeartFloat`, `fzBlushPulse`.

Out of character scope but flagged for consistency: `fzPawSettle` (`style.css:2580`) rotates the paw-print **icon** −5° in the coach bubble. The icon is a mark, not the body; no change required, but if OWNER wants total rotation hygiene, swap for a scale-only settle.

---

## 1. Motion language (exact values)

Global easing tokens (existing two kept, two added — see §5.2):

| Token | Value | Use |
|---|---|---|
| `--fz-spring` | `cubic-bezier(.34,1.56,.64,1)` | reactions, gestures, entrances with overshoot |
| `--fz-out` | `cubic-bezier(.22,1,.36,1)` | settles, gaze, exits of holds |
| `--fz-calm` *(new)* | `cubic-bezier(.45,.05,.35,1)` | infinite ambient loops (breath, sway, drowse) |
| `--fz-settle` *(new)* | `cubic-bezier(.34,1.12,.52,1)` | cross-screen handoff settles (matches coach-bubble `fzPawSettle` feel) |

### 1.1 IDLE — "alive, not noisy"

| Channel | Spec | Loop policy |
|---|---|---|
| Breath | `.fz-all` scale 1 ↔ (1.015, .985), origin 50% 88%, **period 2.6s**, `--fz-calm` | infinite; the ONLY always-on loop |
| Blink | JS loop (kept as-is, `fiezel-mascot.js:420-435`): lid close 70ms ease-in, hold+release ~130ms; interval random **1.8–5.6s**; 20% chance double-blink 200ms later | JS timer; suppressed in `NO_BLINK` states |
| Ear twitch | `fzEarTwitch` −7°→+4° flick occupying 8% of a **7.4s / 9.1s** cycle (L/R desynced, R delayed 3s) | infinite but ~92% at rest — reads as occasional |
| Micro-gaze *(new)* | JS: every **6–11s** (random), pupils (`--px/--py` on `fz-pupil`, P8) drift to a random point within ±4px/±3px over **260ms `--fz-out`**, hold **600–1400ms**, return 260ms | JS timer; skipped while a `lookAt()` target is active or state ≠ idle/calm |
| Tail | `fz-tail-tip` slow sway ±4°, period **5.2s**, `--fz-calm` | infinite, amplitude ≤4° so it never competes with breath |

Idle budget: **max 4 concurrent animated nodes** (breath, 2 ears, tail-tip) + 2 JS timers. Nothing else moves.

### 1.2 REACTION — "short and readable" (§12)

Rule of thumb: attack ≤ 200ms, whole reaction readable at a glance, total ≤ 1.6s, always auto-reverts (TRANSIENT map).

| State | Core move | Duration / easing | Amplitude | Loop |
|---|---|---|---|---|
| greeting | `fzWave` arm −128° wave + `fzGreetShift` head translate(−5,1)px + pads fade | 1.5s `--fz-spring`, hold 1600/1900ms | arm −104°…−130° between beats | ×1 |
| curious | `fzHeadLean` translate(5,2)px + asym ear perk (−10°/+4°, 300ms) + brow-L raise + tail-tip +14° | .5s `--fz-spring` forwards, hold 900–1400ms | head ≤6px (P2 clamp) | ×1, held |
| encouraging | `fzPoint` arm −94°→−88° + `fzNod` head translateY 0→+3px ×2 + brows up | point 1.4s, nod .5s ×2, hold 1500ms | nod ≤3px — a nod, not a bow | ×1 / ×2 |
| confused | `fzConfShift` head translate(−4,1) + `fzShakeX` face ±6px + brows inner-tilt ±14° + sweat drop 1.6s | shift .5s, shake .55s delayed .25s, hold 1800ms | shake ±6px max | ×1 |
| hinting | bulb `fzMascotPop` .45s + `fzHeadLean` + one-lid wink | hold 1900ms | — | ×1 |
| proud | `fzPuff` body scale(1.06,1.02) translateY(−4) + `fzChest` arm −40° + chin-up −3px + `fz-chest` scale 1→1.06 (P19) | .6–.65s `--fz-spring` forwards, hold 2200ms | puff ≤ +9% at overshoot | ×1, held pose |
| sad → gentle-concern | ears +9°/+9° back (was ±17° — soften per C table #14), lids 8, `fz-m-concern` mouth, `fzSlump` translateY 6px scale(1.02,.96), tail-tip −10°, tear 1.9s | .55–.6s `--fz-out` forwards, hold 2400ms → `then:'encouraging'` | slump ≤6px | tear loops during hold only |
| love | heart-eyes pop .4s + `fzHeartBeat` .9s + `fzLoveSway` translateX ±3px ×2 + hug arms ∓20° | hold 2000ms | sway ≤3px | heartbeat loops during hold |

### 1.3 CELEBRATION — "more expressive", 3 tiers by amplitude & repeats, never new moves

| Tier | Trigger | Spec |
|---|---|---|
| lv-1 | 1st correct | `fzJump` .85s ×1 (squash 1.1,.82 → air −40px → land 1.05,.92), arms `fzArmsUpL/R` ±96° ×1, ears −10/−10, tail-tip +18°, confetti 28 |
| lv-2 | 2 in a row | `fzJump` .8s ×2, arms ×2, confetti 38 |
| lv-3 | ≥3 in a row | `fzJumpBig` .9s ×2 (air **−58px**, rotate removed), arms literal L +110…+120° / R −110…−120° with pads (17 R-3), tail base +6° & tip +18°, confetti 48 |
| completion | lesson complete | `fzJumpBig` .95s ×2 + `fzStar` 1.2s stagger .2s + `fzRingGlow` 1s alternate + confetti 46, hold 3200ms |
| level-up *(new event)* | exam pass | completion choreography + both-ear −12° hold + tail base +8°; hold 2800ms, `then:'proud'` — fulfils the "PAW sampai lompat-lompat" copy (audit Task D) |
| milestone *(new event)* | badges/tiers | proud held 600ms → celebrating lv-3 burst → proud settle (`then` chain; 13 §4.3 binding) |

Loop policy: celebration NEVER loops indefinitely — max ×2 iterations of any jump; star/ring loops end with the hold.

### 1.4 THINKING — "subtle head/eye movement"

Pupils to upper corner via `--px:6px; --py:-5px` (replaces today's whole-`fz-eyes` translate at `:87` — gaze channel P8 now separate from lookAt channel P9), half-lids `--fz-lidup:10px` easing in 300ms `--fz-out`, head translate(2,−1)px, right arm +96° paw-to-chin (literal, 17 R-3; 700ms `--fz-spring`), dots `fzDot` 1.1s stagger .18s. Persistent until caller reverts (callers pass `hold`, e.g. ANALYZING 900ms). Blink allowed.

### 1.5 SPEAKING *(new state — the audit's biggest gap)*

- **Mouth**: JS beat cycle over the viseme shapes `sp1 → sp2 → open → sp1` (display toggles, P13), one swap per **`--fz-beat` = 140ms** (accept 110–160ms jitter ±20ms so it doesn't read metronomic); returns to `fz-m-soft` during inter-sentence gaps (>260ms, matching `FiezelProsody.GAP_MS`) and at end.
- **Timing source**: sentence begin/advance from `FiezelSubtitle` (already `currentTime`-driven, audit C.4) — mouth runs only while a sentence is live; **suppressed entirely** when `fiezel-neural-voice-degraded` fires (silent L5 text fallback must not show a talking mouth).
- **Face**: lids 4 (soft), brows hidden, blink allowed.
- **Body**: `fzSpeakBob` — `.fz-head` translateY 0→−1px→0, 1.6s `--fz-calm` infinite (sub-pixel liveliness, invisible as "bounce"); tail-tip +6° hold; NO arm/ear activity so the mouth stays the focal point.
- **Loop policy**: persistent (`hold:0`); ended by `speak-end` → idle 240ms cross-settle.

---

## 2. Enter / exit transition set (§18)

Principles: **never `display:none` cuts** — every appearance/disappearance is animated (min 120ms fade even at 28px); exits are ~0.6× the length of enters; enters may overshoot, exits never do; variant is chosen by context, not habit.

New keyframes (names collision-checked against `style.css` `fzPaw*`/`fzPop` and `fiezel-motion.css`):

| Class → keyframe | Spec | Use when |
|---|---|---|
| `.fz-m-enter-pop` → `fzMEnterPop` | scale .62→1.07→1 + opacity 0→1, **380ms `--fz-spring`** | first-ever appearance in a session (coach-bubble birth already has `fzPawForm`; this is the character-face equivalent), badge/level modals |
| `.fz-m-enter-rise` → `fzMEnterRise` | translateY 8px + scale .88→1, opacity .55→1, **240ms `--fz-spring`** | step/page repaint where PAW was already conceptually present — matches existing `fzm-ob-paw-in` (`style.css:1431-1435`); onboarding steps, home strip repaint |
| `.fz-m-enter-slide-l / -r` → `fzMEnterSlideX` | translateX ∓24px → 0, opacity 0→1, **320ms `--fz-out`** | directional flows: carousel steps, next-question panels — direction matches content travel |
| `.fz-m-enter-peek` → `fzMEnterPeek` | inside a head-crop dock: translateY 60%→0 (head rises into the circle), **420ms `--fz-settle`** | small cropped docks (result ring 52px, level-guard 56px, listening rows 38px) — the "peek over the edge" read |
| `.fz-m-enter-fade` → `fzMEnterFade` | opacity 0→1, **200ms ease-out** | ≤28px faces (map note) and the reduced-motion substitute for all of the above |
| `.fz-m-exit-sink` → `fzMExitSink` | translateY +10px + scale .92 + opacity→0, **200ms ease-in** | leaving a screen that scrolls/collapses downward; session teardown |
| `.fz-m-exit-fade` → `fzMExitFade` | opacity→0, **160ms ease-in** | small faces, modal dismiss, reduced-motion substitute |
| `.fz-m-exit-slide-l / -r` → `fzMExitSlideX` | translateX ∓20px + opacity→0, **200ms ease-in** | directional flows (pairs with slide enter, same axis) |

Context table:

| Context | Enter | Exit |
|---|---|---|
| Coach bubble (first mount) | existing `is-paw-born` `fzPawForm` 920ms (kept, once per session) | never exits (persistent) |
| Onboarding step change | `fzMEnterRise` (replaces/absorbs `fzm-ob-paw-in`) | `fzMExitFade` |
| Home "Kata FIEZEL" strip repaint | `fzMEnterRise` | none (repaint) — DOM swap masked by rise |
| Quiz/lesson panel faces | `fzMEnterSlideX` matching question travel | `fzMExitSlideX` same axis |
| Result-screen ring face | `fzMEnterPeek` delayed 120ms after score ring starts | `fzMExitSink` on dismiss |
| Level-guard / warning modals | `fzMEnterPop` | `fzMExitFade` |
| Listening player rows | `fzMEnterPeek` | `fzMExitFade` |
| Map note 28px face | `fzMEnterFade` | `fzMExitFade` |

Implementation rule: exit class is added, node removed on `animationend` **with a 400ms `setTimeout` fallback** (never trust the event alone), following the timer-hygiene pattern of `[P1-1]`.

---

## 3. Cross-screen continuity (§27)

**Model: one cat, many windows.** The coach bubble instance is the *persistent body* — it is `position:fixed`, lives outside `<main>`, and holds `_mem` (streak, greets) across renders (`fiezel-mascot.js:472-483`). Every per-screen face (strip, result ring, modals, listening rows) is an *ephemeral window onto the same cat* via the head-crop dock: container `has-mascot` + mascot at **178% width / top −8%** so exactly the head shows (derivation at `fiezel-motion.css:340-343`). Continuity is therefore not literal travel; it is **synchronized state + choreographed handoff through the dock that never leaves the screen**.

Handoff choreography on route change (screen A → screen B):

1. **t=0** — A's ephemeral faces play their exit variant (≤200ms).
2. **t=0** — coach bubble plays the existing `is-paw-shift` settle (620ms, `fiezel-coach-bubble.js:219-223`): the persistent dock "receives" PAW. If the target scene shrinks the bubble (map/skills 46px), the size transition rides the same settle.
3. **t≈80ms after B's content paints** — B's faces enter (`fzMEnterRise`/`fzMEnterPeek`), pre-stamped with the **current live state** so there is no idle flash (see `faceMarkup` extension, §5.3). The 178%/−8% crop guarantees the face that appears is pixel-identical to the bubble's.
4. State memory continuity is free: reactions fired mid-transition hit the bubble instance (always mounted), and B's new faces adopt the state at mount.

```
screen A ─────────┐            ┌───────── screen B
  strip face  ────┤fzMExitSink │ fzMEnterRise ├──── strip face
                  │  ≤200ms    │  240ms +80ms │
coach bubble ═════╪════ is-paw-shift 620ms ═══╪═════ (never unmounts)
                  t=0                        t≈300ms
```

Special cases:
- **Onboarding → Home**: last onboarding pose (`sleepy` step) exits `fzMExitFade`; coach bubble is born (`fzPawForm`, once); Home strip enters `fzMEnterRise` already in `st-greeting` (the `onboard` react fired at name submit, `app.js:3537`).
- **Quiz → Result**: on `lesson-complete` the bubble goes `completion` immediately; the result ring face `fzMEnterPeek`s **already mid-completion** (pre-stamped class) — PAW visibly "arrives celebrating", the strongest continuity moment in the product.
- **Any screen → map/skills**: bubble shrink 58→46px rides `is-paw-shift`; no other faces needed.

---

## 4. Motion principles checklist (§13) & anti-patterns

Every new or changed animation must pass all ten:

| # | Principle | Measurable rule |
|---|---|---|
| 1 | Elastic where appropriate | overshoot only via `--fz-spring`/`--fz-settle`; never on exits or ambient loops |
| 2 | Smooth | no linear easing anywhere; loops use `--fz-calm` |
| 3 | Responsive | reaction attack ≤200ms from event; state class applied synchronously in `setState` |
| 4 | Expressive | every state changes ≥2 channels (face + one of ear/tail/arm/head) so it reads even in 42px crops |
| 5 | Lightweight | transform/opacity only; zero layout/paint properties; no filters |
| 6 | Intentional | every animation is caused by a named event or state; no decorative loops beyond idle's four channels |
| 7 | No constant bouncing | ≤1 always-on translate loop (none in idle — breath is scale); jumps max ×2 |
| 8 | No excessive squash/stretch | scale bounds: body 0.78–1.14 during jumps, 0.985–1.015 at rest |
| 9 | No overly long animations | transient ≤2.6s incl. hold (completion 3.2s is the single sanctioned exception) |
| 10 | No distracting loops | infinite loops allowed only in: idle set, listening groove+notes, thinking dots, sleepy set, speaking bob — all amplitude-clamped ≤4px/±4.5° |

Anti-patterns (hard rejections in review):
- Whole-body/head **rotation or mirroring** (§0) — including "just 2 degrees".
- `display:none` cuts or `visibility` toggles for the character (§2).
- Animating `width/height/top/left/margin`, filters, or SVG path `d` (no morphs — poses are transform tuples).
- Re-triggering entrance animations on every repaint (the coach-bubble "born once" rule generalizes: entrances fire on *conceptual* arrival, not DOM churn).
- Two simultaneous focal moves (e.g., wave + jump) — one hero channel per state.
- Adding a `will-change` blanket — layer explosion with 3+ live instances.
- New global keyframe names without collision check against `style.css` (`fzPop` incident, ADAPTASI 4).
- Reactions that bypass `pawReact`/`pawSetState` wrappers (README.md:26-27 rule stands).

---

## 5. Implementation spec

### 5.1 Keyframe inventory (final names)

- **Changed in place** (same name, rotation removed / retargeted): `fzJumpBig`, `fzEarTwitch` (new pivot), `fzWave` `fzPoint` `fzArmsUpL/R` `fzChest` `fzHugL/R` (shoulder pivot).
- **Replaced** (old name deleted): `fzTilt`→`fzGreetShift`, `fzLean`→`fzHeadLean`, `fzGroove`→`fzGrooveSway`, `fzConf`→`fzConfShift`, `fzDrowse`→`fzDrowseCalm`, `fzLoveWiggle`→`fzLoveSway`, `fzTailProud/Sway/Droop`→`fzTailBaseSway`/`fzTailTipFlick`/`fzTailTipSettle` (2-bone).
- **New**: `fzSpeakBob`, `fzTailIdleSway`, `fzMEnterPop`, `fzMEnterRise`, `fzMEnterSlideX`, `fzMEnterPeek`, `fzMEnterFade`, `fzMExitSink`, `fzMExitFade`, `fzMExitSlideX`.
- **Untouched**: everything in §0.2 not listed above, plus confetti/micro-UI blocks.

### 5.2 CSS custom properties

| Property | Range / default | Writer |
|---|---|---|
| `--lx` / `--ly` | ±7px / ±5px, 0 | JS `lookAt()` (existing) |
| `--px` / `--py` *(new)* | ±6px / ±5px, 0 | JS micro-gaze + thinking/curious presets — `fz-pupil` reads `transform:translate(var(--px,0),var(--py,0))` |
| `--fz-lidup` *(new)* | 0…34px, 0 | JS/state CSS — `fz-lid-up` occluder translateY (P5/P6) |
| `--fz-beat` *(new)* | 140ms | speaking mouth beat base interval (JS reads it) |
| `--fz-calm`, `--fz-settle` *(new easings)* | §1 table | CSS only |
| `--fz-enter-dur` / `--fz-exit-dur` *(new)* | 320ms / 200ms | shared by §2 variants |

All live on `.fz-mascot, .fz-motion` (ADAPTASI 1 — never `:root`).

### 5.3 JS API additions (backward-compatible superset)

Component (`fiezel-mascot.js`):
- `STATES` += `"speaking"` (persistent; not in TRANSIENT; **not** in `NO_BLINK`).
- New `react()` events:
  - `speak-start` → `setState('speaking',{hold:0})`; `speak-end` → `setState('idle')` (names per 09 §3.2 / 17 R-2a; emitted by the `fiezel-speech-bridge` from `fiezel-speech` CustomEvent phases, 14 §2.1).
  - `level-up` → completion choreography + ear/tail hold, `{hold:2800, then:'proud'}`.
  - `milestone` → `proud {hold:600, then:'celebrating'}` with `level:3`, then settle (chain via `then`) — Act I = 600ms per 13 §4.3 (binding, 17 R-2d).
  - `welcome-back` → dedicated state `welcome-back {hold:2200}` per 09 §2.10 (recognition perk 300ms → wave + tail double-flick); no greeting shim (17 R-2b).
  - `lesson-start` → dedicated state `lesson-start {hold:1600}`: #4 Curious 600ms → #2 Happy rest → idle, per 09 §2.11 (17 R-2c).
  - `reward` → lv2 cheer + chest puff + tail-ring glint `{hold:1600}` (13 §1.3 choreography binding; fixes the dead event at `app.js:3836` via call-site change to `pawReact('reward')`; deprecation alias `correct-streak` → `reward` per 17 R-1, removed after one release).
- New method `speak(handle)` — subscribes to a `FiezelSubtitle`-shaped emitter (`{onSentence(cb), onGap(cb), onEnd(cb)}`), runs the §1.5 mouth beat with one `setInterval` per instance, cleared in `disconnectedCallback` (extend `[P1-1]` list with `_beatT`, `_gazeT`).
- Micro-gaze timer `_gazeLoop()` mirroring `_blinkLoop()` structure, gated by state and reduced-motion (§5.5).

Funnel (`self.FiezelPaw`): add `speak(handle)` fan-out, `currentState()` (reads the longest-lived instance — the bubble — falling back to first), and extend `faceMarkup(cls, fallback, opts)` with `opts.state` defaulting to `currentState()` so ephemeral faces mount pre-stamped (`st-<state>` in markup — the onboarding pattern at `fiezel-onboarding.js:393-397` generalized). No signature breaks: existing 2-arg calls still work.

App wrappers (`app.js`): `pawReact`/`pawSetState`/`pawFaceMarkup` unchanged; add `pawSpeak(handle)` that (a) gates on `pawMotionAllowed()`, (b) checks `fiezel-neural-voice-degraded` was not the active path, (c) forwards to `FiezelPaw.speak`. Voice hookup: `fiezel-voice-say.js` emits `fiezel-speech` CustomEvents (14 §2.1); the speech bridge translates them to `speak-start` on first audible progress and `speak-end` on end/interrupt/resolve (17 R-2a). Direct element calls remain forbidden.

### 5.4 GPU / performance budget

- **Properties**: transform + opacity only. Inner-SVG transforms repaint the SVG raster — acceptable because animated instances are small (28–200px); the 148px onboarding mascot is the largest animated surface.
- **Concurrency caps**: idle ≤4 animated nodes + 2 JS timers/instance; richest state (completion) ≤9 animated nodes + ≤46 confetti (`CONFETTI_MAX` 120 cap kept); speaking adds exactly 1 interval + display toggles (no animation nodes for the mouth).
- **Instances**: typical live count ≤3 (bubble + strip + one contextual). Budget assumes 4.
- **No `will-change`**, no forced reflow — new code must use the `[P2-1]` `getAnimations()` restart pattern, never `void offsetWidth` (the two legacy uses in `fiezel-coach-bubble.js` are grandfathered).
- **Frame budget**: state change ≤4ms style+paint on mid-range Android; steady-state idle ≤1ms/frame. Verify with the existing `tests/paw-mascot-test.js` amplitude guards plus a new assertion: no keyframe rule on `.fz-all/.fz-body/.fz-head` may contain `rotate`.

### 5.5 Reduced motion — 3 layers extended to new motions

1. **OS `prefers-reduced-motion`** (`fiezel-motion.css:38-42`, subtree-scoped): all new keyframes (enter/exit, speak-bob, tail bones) are automatically neutralized because they live under `.fz-mascot`/state classes. **JS-driven motions are not CSS animations and need explicit gates**: the blink loop (`_blinkLoop()`, 17 R-5), micro-gaze loop, speaking mouth beats, and confetti each check `matchMedia('(prefers-reduced-motion: reduce)')` and no-op (confetti additionally keeps its ≤8 cap); speaking renders a static `fz-m-soft` mouth instead of beats.
2. **App setting** (`body.reduce-motion` + wrapper early-return, `app.js:2697-2699`): unchanged — `pawSpeak` and all new events flow through the same wrappers, so they never fire when motion is off. The CSS backstop at `fiezel-motion.css:46-48` covers the new keyframes.
3. **Context freeze** (`.fiezel-ob-still`, `style.css:1701-1706`): unchanged; because every new state is **static-safe** (D3 — a readable pose without its animation: speaking freezes as soft-mouth + soft lids; level-up freezes as the proud pose), pre-applied `st-*` classes still communicate meaning. Rule for all future states: define the frozen pose first, the motion second (§33 — meaning must not depend on animation).

---

## 6. Timing choreography diagrams

### 6.1 idle → reaction (correct, lv-1) → idle

```
ms      0     100    200    300    400    500    600    700    850           1900
        |------|------|------|------|------|------|------|------|-- hold ----|
breath  ════ pauses (fz-all owned by fzJump) ═════════════════════ resumes ══
jump          squash  ▲ air −40px          ▼ land  settle
        |─18%─|──────45%──────|─────70%────|─100%──|
arms    0° ──────► ±96° (30%) ══ hold ══ (70%) ──────► 0°
ears    0° ─► −10°/−10° (300ms --fz-out) ══════════ hold ══════ ─► 0° (ease back
tail-tip 0° ─► +18° flick ═════════════════════════════════════   during revert)
eyes    open ─► happy-arc (opacity swap, instant at state entry)
mouth   smile ─► open (display toggle, instant)
confetti      ├ 28 particles, 1.25s fall, delay 0–120ms ┤
blink   SUPPRESSED (NO_BLINK)                                     resumes
        └─ TRANSIENT 1900ms ──────────────────────────► setState('idle')
                                                        240ms --fz-out settle
```

Revert is a cross-settle, not a cut: state-class removal + 240ms `--fz-out` transitions on ear/tail/lid channels (declared as `transition` on those groups, so any state exit settles for free).

### 6.2 State interrupt (thinking interrupted by correct)

```
event:            pawSetState('thinking',{hold:900})      pawReact('correct')
                  |                                       |
gen token         G=7 ──────────────────────────────────► G=8 (clearTimeout _stT)
ms       0        100      300       500       700  720   900        1620
thinking |st-thinking added                          |
lids     0 ───► 10 (300ms --fz-out)                  | class swap:
pupils   0 ───► (6,−5)                               | st-thinking removed,
arm-R    0° ──────────► +96° (700ms spring)     ─────┤ st-celebrating added
dots     ├ fzDot 1.1s loop, stagger .18s ┤           | SAME FRAME — no idle
                                                     | flash in between
celebr.                                              ├ fzJump from 0ms of its
                                                     | own timeline (class change
                                                     | restarts keyframes; re-enter
                                                     | uses _restartAnimations)
hold-900 timer                             ✗ cancelled (gen 7 ≠ 8) — never fires
```

Interrupt rules (all already enforced by `setState`, kept binding):
1. New state always wins immediately; no queueing, no blend — the generation token (`_stGen`) cancels the pending revert so the old `then` can never resurrect (`fiezel-mascot.js:296-301`).
2. Channels not owned by the new state settle to neutral via the 240ms exit transitions (lids/ears/tail), so an interrupt reads as "snaps attention", not teleportation.
3. Speaking is interrupt-tolerant: reactions may fire *over* speaking for face/limb channels, but the mouth beat owns P13 until `speak-end`; `setState` during speaking sets a `resume:'speaking'` intent — implemented as `then:'speaking'` on the transient.
4. `lookAt` is orthogonal (own CSS vars, own 2200ms recentre timer) and never blocked by states.

### 6.3 Enter → live → exit (result-screen ring face)

```
route: quiz ──► result
ms        0        120        540        …user reads…        dismiss   +200
bubble    is-paw-shift 620ms settle ═════════════ persistent ═══════════════
ring face          ├ fzMEnterPeek 420ms ┤
                   │ mounts pre-stamped st-completion (currentState)
                   │ head rises into 52px crop already celebrating
                   └ completion hold 3200ms ─► idle (in-crop: head+eyes only,
                                               shadow/confetti hidden per
                                               fiezel-motion.css:374-375)
                                                              ├ fzMExitSink ┤
                                                              node removed on
                                                              animationend ∥ 400ms
```

---

## 7. Acceptance checklist for the implementer

- [ ] No `rotate` on `.fz-all/.fz-body/.fz-head/.fz-face/.fz-eyes` in any keyframe or inline style (new test assertion).
- [ ] All §0.1 replacements landed; old keyframe names removed from **both** component copies (`features/mascot/`, `website/assets/mascot/`) and behavior re-exported to the 4 static SVG twins (E5 drift rule: `fiezel-mascot.js` is the one canonical rig).
- [ ] Every appearance/disappearance uses a §2 variant; grep confirms no `display:none` toggles on `fiezel-mascot` hosts.
- [ ] `speak-start/end`, `level-up`, `milestone`, `welcome-back`, `lesson-start`, `reward` events wired; `app.js:3836` call site changed to `pawReact('reward')`; deprecation alias `correct-streak`→`reward` in place (17 R-1).
- [ ] Reduced-motion: all three layers verified with the new JS timers (gaze, beat) — frozen poses still readable.
- [ ] `tests/paw-mascot-test.js` suite passes; amplitude guards updated to the §1 clamps.
- [ ] 60fps spot-check on a mid-range Android during completion with 3 live instances.
