# 07 — PAW Expression System (Direction C rig)

Role: Expression System Designer · Date: 2026-08-27
Binding inputs: `directions/selected-direction.md` (gate decision), `directions/direction-c-expressive.md` (rig + parameter list, §3–6), `directions/direction-c.svg` (geometry source), `audit/01-pau-assets.md`, `audit/02-brand-system.md`, master prompt §7–9, §33–34. Current production face states: `features/mascot/fiezel-mascot.js` (read only — **no repo files modified**).
Proof sheet: `systems/expressions-sheet.svg` (+ `expressions-sheet.png`, verified visually; small-size verification `smallsize-test.png`).

Canonical-source rule (E5, binding note from the gate): everything below is a spec for **one** rig — the inline SVG in `features/mascot/fiezel-mascot.js`. Static SVGs (brand master, poses, head icons, this proof sheet) are *generated exports* of that rig at fixed parameter values, never hand-edited forks.

Hard constraints inherited (audit 02 §5): closed 8-hex palette (+ sanctioned `#9CC7E8` sweat, `#000` @ .08/.04), circles/capsules/triangles only, no outlines, transform/opacity-only animation, no body rotation/mirroring, no new accessories, reduced-motion = zero motion.

---

## 1. Face design system — reusable components (master prompt §9)

All coordinates in the master viewBox `0 0 320 300`. All face layers live inside `.fz-face` inside the new `.fz-head` wrapper (Direction C §5 layer tree), so head leans (translate-only, P2) carry the whole face. Face strokes are cocoa `#33201F`, round caps, 5–5.5 weight (existing 5–7 family).

### 1.1 Eyes

**Shape (identity lock).** Solid cocoa `#33201F` discs, **r=16** at (126,98) / (194,98). No sclera, no iris ring — the solid-cocoa eye with a white highlight cluster *is* PAW's eye; adding whites would break the same-character test. Everything expressive happens with three clipped sub-layers per eye. Per-eye clipPaths (`fzcEyeL-<uid>` / `fzcEyeR-<uid>`, per-instance ids per the `[P0-1]` pattern) guarantee no sub-layer can ever escape the disc.

Layer stack per eye (bottom → top), from `direction-c.svg`:

| Layer | Geometry | Parameter | Range | Neutral |
|---|---|---|---|---|
| disc | circle r=16 cocoa | — (identity) | — | — |
| `.fz-pupil` | highlight cluster: white r=5.5 at (+4.5,−5.5 rel. center) + white r=2.8 @70% at (−4.5,+6) | P8 translate | tx ±6, ty ±5 | 0,0 |
| `.fz-lid-up` | yellow `#FFD94F` circle r=17, rest cy=62 (fully hidden above clip) | P5/P6 translateY | 0 (open) … 34 (closed) | 0 |
| `.fz-lid-low` | yellow circle r=17, rest cy=134 (hidden below clip) | P7 translateY | 0 … −14 (smile squint) | 0 |

**Lid occluders — openness vocabulary.** Because the lids are same-yellow circles sliding over the disc, a partially closed eye reads as a curved yellow lid with no extra linework (verified in the proof sheet: Thinking/Calm/Sleepy). Named openness levels used by the expression library:

| Level | lid-up value | Read |
|---|---|---|
| wide | 0 (+ eye pop P10 up to 1.12) | alert, surprised |
| open | 0 | default |
| soft | 6–10 | attentive-relaxed, proud, concern |
| half | 14 | calm, content |
| heavy | 26 | sleepy (thin cocoa sliver + one highlight dot remains) |
| shut | 34 | fully closed (slow close only — fast shut uses the blink layer) |

Lower lid (`lid-low`) is only for the **smile squint** (0…−14): Happy uses 6, Celebrating peaks may add 4–8 during motion. Never combine lid-low > 8 with lid-up > 10 (eyes vanish into a slit → off-model).

**Pupil behavior (P8).** The highlight cluster translates inside the clip; the disc never moves relative to the head. Rules:
- The cluster is an *accent*, not a literal pupil: offsets signal attention direction and mood (up = engaged/hopeful, down = settled/drowsy, lateral = target-tracking or doubt).
- Clamp ±6/±5. Beyond that the big highlight touches the disc rim and reads as a broken eye.
- Both eyes always share one pupil value (no wall-eye; asymmetry budget is spent on ears/brows instead).

**Blink (P20) — unchanged from production.** Fast blink stays the cheap `.fz-lids` layer (yellow discs r=18 with a cocoa closed-lash arc, toggled by the `blink` class), driven by the existing JS loop in `fiezel-mascot.js`: blink shows ~130ms, interval 1800–5600ms randomized, 20% chance of a double blink 200ms later (second show ~110ms). Suppression list (NO_BLINK) extends to: `sleepy` (lids already heavy), any state showing `fz-eye-happy`/`fz-eye-love` variants, and everything under reduced motion. Slow, emotional lid moves (calm settling, drowsy droop) use P5/P6 lid-up with 240–420ms `--fz-out` easing — never the blink layer.

**Gaze / lookAt integration (P9 + P8).** The existing `lookAt(target)` contract is untouched: it sets `--lx` (±7px) / `--ly` (±5px) on the host, consumed as a translate on `.fz-eyes`, with the 2200ms auto-return. Direction C layering:
- **Coarse gaze** = P9 whole-`.fz-eyes` translate (`--lx/--ly`) — points attention at questions, answer chips, buttons, coach bubble, rewards (master prompt §9 "Gaze").
- **Fine gaze** = P8 pupil offset at ~60% of the same direction, applied *on top of* P9 when an expression wants extra commitment (Curious, Thinking). Expression pupil values in §2 are authored offsets; a live `lookAt` call adds to them and re-clamps to ±6/±5.
- Head lean (P2) may add ±4–6px translate toward the same target for full-body attention (curious lean). Order of intensity: pupils → eyes → head. Never move head opposite to gaze.

**Eye pop (P10).** `.fz-eye-open` scale 0.95–1.12 about the face center: 1.1 only for Surprised (plus micro-pops ≤1.06 on beat hits). Below 0.98 reads as squinting-suspicious — not in PAW's register; 0.95 exists only as an in-between during transitions.

**Variant eye sets (unchanged, identity continuity):** `fz-eye-happy` arcs (celebration peaks, love of the current rig) and `fz-eye-love` hearts swap in via opacity exactly as today. When a variant is on, P5–P8/P10 are ignored (variants are terminal face states).

### 1.2 Mouth — the 9-shape set (P13)

Display-toggle library inside `.fz-mouth`, geometry verbatim from `direction-c.svg`; one shape visible at a time. Cocoa strokes, round caps.

| # | Class | Geometry | Use |
|---|---|---|---|
| 1 | `fz-m-smile` | arc `M148 148 C 154 155 166 155 172 148`, w5.5 | default; neutral/happy/idle |
| 2 | `fz-m-soft` | smaller arc `M152 149 C 156 153 164 153 168 149`, w5 | calm, proud, curious — contentment without a grin |
| 3 | `fz-m-open` | filled open-smile `M145 146 C 148 162 172 162 175 146 C 165 150 155 150 145 146 Z` | excited, encouraging, celebrating, welcoming |
| 4 | `fz-m-o` | circle r=6.5 filled | surprise, "oh" |
| 5 | `fz-m-sp1` | ellipse 5×3.4 filled | speaking viseme, small aperture |
| 6 | `fz-m-sp2` | ellipse 7.5×6 filled | speaking viseme, mid aperture |
| 7 | `fz-m-wave` | `M147 150 Q 153 145 160 150 Q 167 155 173 150`, w5.5 | confusion, uncertainty |
| 8 | `fz-m-flat` | `M150 150 L 170 150`, w5.5 | thinking, sleepy — effort/lowness without negativity |
| 9 | `fz-m-concern` | shallow inverted arc `M150 152 C 155 148.5 165 148.5 170 152`, w5 | gentle concern — the "wrong answer" mouth |

`fz-m-sad` (`M148 154 C 154 147 166 147 172 154`) is **retained in the DOM for backward compatibility** but demoted: the expression library never calls it. `concern` supersedes it as the deepest negative PAW ever shows (guide-not-referee, checklist E1). Speaking cycles sp1→sp2→open→sp1 on `FiezelSubtitle` sentence beats (~110–160ms), returning to the state's authored mouth at rest; suppressed under reduced motion and on `fiezel-neural-voice-degraded`.

Coverage of master prompt §9 mouth requirements: neutral=smile, smile=smile/soft, excited=open, surprised=o, speaking=sp1/sp2/open, encouraging=open (+ point gesture).

### 1.3 Brows

First-class curved capsule arcs (warmer than the current straight strokes), cocoa w5, round caps, **hidden in neutral** (group opacity 0, 120ms fade in/out — brows appearing *is* the emote cue; the default face stays today's face).

- Geometry: left `M115 70 Q 125 63.5 135 66.5`, right `M185 66.5 Q 195 63.5 205 70` (inner ends sit higher — a built-in friendly arch).
- Per-side transforms (P11/P12): `translateY` −8 (raised) … +6 (lowered), `rotate` −14°…+14° about the brow's own center (125,67)/(195,67).
- Rotation semantics: for the **left** brow, negative rotation lifts the *inner* end; for the **right** brow, positive rotation lifts the *inner* end. "Inner-up ±θ" in the tuples below therefore means `browL rot −θ, browR rot +θ` — the worried/asking shape. The mirrored pair (inner-down) is the focus/effort shape, used at low angles (≤6°) only; steeper inner-down reads angry and is **banned** (PAW is never stern).
- Named poses used by the library: **raised** (ty −3…−7, rot 0), **focus-low** (ty +3…+4, inner-down ≤6°), **inner-up** (ty 0…+2, inner-up 8–10°), **asym-ask** (one raised, one at rest).

### 1.4 Ears (emotion channel)

Per-ear rotation about deep base pivots (108,52) / (212,52); triangle bases extend 6px below the head rim so no chord is exposed at extremes (fixes audit §3a-5).

- **Semantic parameter** (used in all tuples): **negative = perk** (alert, toward-target), **positive = droop-back** (relaxed → settled → sleepy), range −14…+18 per ear.
- **Implementation mapping:** left ear SVG rotation = semantic value; **right ear SVG rotation = −(semantic value)** (mirror about x=160). This is why the concept file's right-ear comment shows the mirrored range −18…+14. The proof-sheet generator (`systems/build_sheet.py`) encodes this mapping and the renders confirm symmetric reads.
- Vocabulary: symmetric perk −4…−12 (interest→alert), symmetric droop +4…+12 (calm→sleepy), **asymmetric** (one perked, one relaxed) = curiosity/attention split — PAW's single most characterful move; reserve it for Curious/Welcoming/Thinking so it stays special.

### 1.5 Blush

Pink `#F0A0AC` circles r=11 at (102,126)/(218,126) — an identity lock (checklist A4), **always visible, never recolored**. One behavior parameter only: scale 1→1.15 about each circle's own center (transform-only), used at ≤1.1 for Proud/Happy peaks and 1.15 momentarily in Celebrating/love. No opacity dips below 1 (a fading blush reads as ill). At ≤42px the blush is one of the few surviving color signals — never remove it from crops.

### 1.6 Supporting face channels

- **Head lean (P2):** `.fz-head` translate x ±6 / y ±4 — translate only, never rotate (binding rule). Down-y = grounded/settled, up-y = lift/energy, x = toward target.
- **Sweat (`fz-acc fz-sweat`)**: `#9CC7E8` drop at the left temple, opacity 0/1 — Confused only.
- Other accessories (`fz-notes`, `fz-bulb`, `fz-stars`, `fz-zzz`, `fz-hearts`, `fz-tear`, `fz-dots`, `fz-headphones`) are **state dressing, not expression parameters**; expressions must read with all accessories off.

---

## 2. The 14-expression library (master prompt §8)

Tuple format (Direction C parameter list, §4 of `direction-c-expressive.md`; omitted params = neutral):

`E = { earL, earR (semantic °) · lidUp 0–34 · lidLow 0–−14 · pupil (x,y) · pop · browL (ty,rot°) · browR (ty,rot°) · mouth · tailBase° · tailTip° · armL°, armR° (+pads) · chest · head (tx,ty) · blush · acc }`

Arm signs per P16/P17 are LITERAL serialized values (17 R-3): armL + = out/up-raise, − = inward-across; armR − = out/up-raise, + = inward-across. Ear tuple values remain semantic per §1.4 (right-ear literal = −value). "brows —" = hidden (opacity 0).

| # | Expression | earL/R | lidUp | lidLow | pupil | pop | browL / browR | mouth | tail B/T | arms L/R (pads) | chest | head | blush | acc |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Neutral | 0 / 0 | 0 | 0 | 0,0 | 1 | — | smile | 0 / 0 (idle sway ±4) | 0 / 0 | 1 | 0,0 | 1 | — |
| 2 | Happy | −4 / −4 | 0 | 6 | 0,0 | 1 | — | smile | 0 / +8 | 0 / 0 | 1 | 0,0 | 1.05 | — |
| 3 | Excited | −8 / −8 | 0 | 0 | 0,−2 | 1.04 | (−4,0) / (−4,0) | open | 0 / +16 | +60 / −60 (on) | 1 | 0,−2 | 1.1 | — |
| 4 | Curious | **−10 / +4** | 0 | 0 | +4,−3 | 1 | (−6,−4) / (0,0) | soft | 0 / +14 | 0 / 0 | 1 | +4,0 | 1 | — |
| 5 | Thinking | +2 / −6 | 10 | 0 | +6,−5 | 1 | (+4,+6) / (+4,−6) | flat | 0 / −4 | 0 / +96 (on) — literal; inward-across chin-reach per 08 §1.5 / 17 R-3 | 1 | +2,−1 | 1 | — |
| 6 | Confused | +8 / −8 | 6 | 0 | −3,0 | 1 | (0,−10) / (0,+10) | wave | 0 / −8 | 0 / 0 | 1 | −3,0 | 1 | sweat |
| 7 | Encouraging | −6 / −6 | 0 | 0 | 0,0 | 1 | (−3,0) / (−3,0) | open | 0 / +10 | 0 / −90 (on) | 1 | 0,−1 | 1 | — |
| 8 | Proud | −6 / −6 | 8 | 0 | 0,0 | 1 | — | soft | 0 / +12 | −10 / +10 | 1.06 | 0,−2 | 1.1 | — |
| 9 | Surprised | −12 / −12 | 0 | 0 | 0,0 | **1.1** | (−7,0) / (−7,0) | o | 0 / +20 | +20 / −20 | 1 | 0,−3 | 1 | — |
| 10 | Celebrating | −10 / −10 | 0 | 0 | 0,−2 | 1.04 | (−5,0) / (−5,0) | open | +6 / +18 | +115 / −115 (on) | 1 | 0,0 (jump on fz-all) | 1.15 | stars (state) |
| 11 | Calm | +4 / +4 | **14** | 0 | 0,+1 | 1 | — | soft | 0 / 0 (slow ±3) | 0 / 0 | 1 | 0,0 | 1 | — |
| 12 | Sleepy | +10 / +12 | **26** | 0 | 0,+3 | 1 | — | flat | 0 / −6 | 0 / 0 | 1 | 0,+2 | 1 | zzz (state) |
| 13 | Welcoming | −8 / +4 | 0 | 0 | 0,0 | 1 | (−4,0) / (−4,0) | open | 0 / +18 | +105 (on) / −14 | 1 | +2,−2 | 1.05 | — |
| 14 | Gentle concern | +9 / +9 | 8 | 0 | −2,+1 | 1 | (+2,−8) / (+2,+8) | concern | 0 / −10 | +12 / −12 | 1 | −2,+1 | 1 | — |

Note (17 R-3 flag 1): direction-c.svg serializes the Curious/Welcoming right ear as literal +4 (perk 4°), i.e. semantic −4; the semantic +4 in rows 4/13 is an 8° cosmetic divergence. Exports follow the serialized concept file.

### Personality notes & usage (companion, not infantile — cuteness guard E2)

Guard applied throughout: no expression uses maximum values on more than **two** channels at once; brows stay hidden wherever warmth alone carries the read (Neutral, Happy, Proud, Calm, Sleepy); the deepest negative is a shallow concern arc, never despair. PAW emotes like a calm adult companion who happens to be a small cat — measured, legible, never begging to be adored.

1. **Neutral** — Present and available, quietly attentive; the face 95% of users see 95% of the time, so it *is* the brand. Byte-equal in spirit to today's idle. *Use:* `idle` state, docked 88px slot, any waiting context. *Static frame:* the default face itself.
2. **Happy** — Warm contentment, not a grin; the squint sliver (lid-low 6) does the smiling so the mouth doesn't have to try harder. *Use:* `listening`, correct-answer soft acknowledgment, post-lesson resting, WELCOME screens after the greeting settles.
3. **Excited** — Leaning into the moment; energy shown with raised arms and a tail flick, eyes stay open and focused (not vibrating). *Use:* `hinting` (+bulb), streak building, "let's go" lesson moments, LEVEL_UP wind-up.
4. **Curious** — The signature: asymmetric ears + single raised brow + off-center pupils + head lean toward the target. Reads as *interested in you*, not baby-bird cute. *Use:* `curious` state, new question presented, user hesitates, LESSON_START beat 1; always paired with `lookAt(question)`.
5. **Thinking** — Inward focus: half-lids, pupils up-corner, low brows, paw toward chin. Effort without distress. *Use:* `thinking` (AI latency), grading pause, "let me check" moments; dots accessory optional per state.
6. **Confused** — Honest "I didn't get that": tilted brow pair, wave mouth, sweat. Self-directed, never blaming the user. *Use:* `confused` — ASR failure, ambiguous input, error recovery. Keep ≤3s then return to Encouraging.
7. **Encouraging** — Coach beat: open mouth, raised brows, pointing paw with pads shown, small ty nod. Confidence transfer, not cheerleading. *Use:* `encouraging` — before a retry, after a wrong answer (following Gentle concern), during exercises. The default "you can do this" face of the grammar flow.
8. **Proud** — Of the *user*: chest puff 1.06, soft mouth (closed — pride doesn't gloat), soft lids, arms back. *Use:* `proud` — streak milestones, ACHIEVEMENT, personal-best moments, MILESTONE hold phase.
9. **Surprised** — Clean spike: eye pop 1.1 + o mouth + high brows + perked ears, ≤1.2s, always resolving into Happy/Celebrating/Curious. *Use:* unexpected correct answer, big score reveal, easter-egg reactions.
10. **Celebrating** — The loudest PAW gets; both arms up with pads, open smile, tail high. Tiers by amplitude/repeat (existing 3-tier contract), never by new drawings. *Use:* `celebrating`/`completion`, LESSON_COMPLETE, LEVEL_UP burst, confetti moments.
11. **Calm** — Half-lids + soft smile + settled ears: reassuring stillness. This is the "guide, not referee" face at rest. *Use:* review screens, reading/audio playback, settings, wind-down after celebration, breathing exercises before speaking drills.
12. **Sleepy** — Heavy lids (one highlight dot left), drooped ears, settled head. Cozy, not neglected-tamagotchi. *Use:* `sleepy` — long inactivity, late-night nudge-free presence, app-resume "waking" transition start.
13. **Welcoming** — The concept pose: raised open paw with pads, asymmetric ears, open smile. Greeting a *person*, not performing. *Use:* `greeting`, WELCOME_BACK (bigger tail flick), onboarding first appearance, session start.
14. **Gentle concern** — The wrong-answer face: shallow concern arc, inner-up brows, ears back, soft lids, slight settle. Says "hm — let's look at that together"; deliberately gentler than the current `sad`. *Use:* `sad` state replacement — incorrect answers, failed audio, streak break. Hold ≤2s, always followed by Encouraging (the pair is the pedagogical signature).

**In-betweens are legal by construction:** any linear blend of two tuples above is a valid PAW face (that is the point of the rig — transitions pass through plausible faces, master prompt §13). The five audit-03 missing states reuse these: SPEAKING = Happy + sp1/sp2/open cycle + lidUp 4; WELCOME_BACK = Welcoming + tailTip +20; LESSON_START = Curious→Happy; LEVEL_UP = Celebrating + both ears −12 + tailBase +8; MILESTONE = Proud (hold) → Celebrating (burst).

---

## 3. Personality through the face (master prompt §7)

Target traits → facial encoding; anti-traits → hard bans:

| Trait | How the face says it |
|---|---|
| **Curious** | Asymmetric ears + single brow + pupil lead + head lean-in (Curious, Thinking). Curiosity is PAW's default reaction to anything new — the first frame toward any target is a `lookAt` + near-ear perk. |
| **Cheerful** | Smile family at rest; squint-slivers instead of wider grins; blush micro-scale. Cheer is a *baseline*, so it never has to shout. |
| **Encouraging** | Raised brows + open mouth + pointing paw; and structurally: every negative face (Confused, Gentle concern) is contractually followed by Encouraging within 2–3s. |
| **Playful / clever** | Tail-tip flicks and ear play carry playfulness so the face can stay composed; Surprised→Celebrating chains give wit without mugging. |
| **Supportive** | Gentle concern replaces sad; concern mouth is shallower than the smile is deep — PAW's negativity range is asymmetric on purpose. |
| **Calm when appropriate** | A dedicated half-lid Calm face exists so "quiet" is a designed state, not an absence of animation. |
| **Not hyperactive / annoying** | Hard clamps on every parameter; ≤2 channels at max per expression; Surprised ≤1.2s; brows hidden at rest. |
| **Not childish / overly silly** (E2) | No sparkle-eyes beyond the existing highlight cluster, no wobble mouths, no tongue, no tears except the sanctioned `fz-tear` accessory, closed mouths for Proud/Calm (adults don't grin at their own success). |
| **Not aggressive / overly emotional** | Inner-down brows capped at 6° (no anger shape reachable); sad mouth demoted; no trembling/shaking motion vocabulary. |

Net effect: PAW reads as a **friendly learning companion** — a peer who is glad you showed up, interested in what you're doing, and unbothered when you're wrong.

---

## 4. Reduced-motion variants (master prompt §33)

Contract (inherited, stricter side of BRAND-GUIDE §4): under `prefers-reduced-motion` **or** `body.reduce-motion` (`pawMotionAllowed()` gate), the mascot performs **zero motion** — no blink loop, no idle breath, no tail sway, no speaking mouth cycle, no transitions animated.

Every expression above is therefore designed to **read as a single static frame**:

- The tuple *is* the static frame. State changes apply the full tuple instantly (or a single ≤120ms opacity cross-fade if the platform requires paint smoothing — no transforms tween).
- Loop-dependent cues are re-expressed statically: Neutral's tail sway freezes at 0; Celebrating's jump freezes at arms-up + tailTip +18 (peak frame, feet on ground — never freeze mid-air); Encouraging's nod freezes at head (0,−1) with the pointing paw doing the work; SPEAKING freezes on `sp2` while audio plays, returning to the state mouth after.
- Nothing depends on motion for meaning: every expression is distinguishable in the proof sheet, which is itself a set of static frames (checklist D3 evidence).
- Accessories that imply motion (stars burst, confetti) render at fixed opacity 1 in their final layout, capped count, or are skipped entirely at ≤88px.
- The Gentle-concern→Encouraging sequence becomes two discrete frames with the same total duration — the pedagogy survives without tweens.

---

## 5. Small-size degradation rules (28 / 42px head crops)

Empirically verified (`systems/smallsize-test.png`: all 8 proof-sheet expressions rendered at 42px and 28px). Survival table — which parameters still communicate at each size:

| Parameter | 88px full body | 42px head crop (coach avatar) | 28px head crop (chips/lists) |
|---|---|---|---|
| Lid openness (P5/6) | full 6-level vocabulary | **survives** at 3 levels: open / half (≥10) / heavy (≥22) | 2 levels only: open / closed-ish (≥20) |
| Lid-low squint (P7) | survives | **invisible** — drop | drop |
| Pupil offset (P8) | survives | marginal — only ±5+ reads; use full clamp or none | **drop** (center pupils) |
| Eye pop (P10) | survives | survives (1.1 clearly bigger) | marginal — pair with o-mouth or drop |
| Brows (P11/12) | full poses | **presence** survives, tilt ≤6° does not → quantize to raised / inner-up / hidden (skip focus-low) | **drop entirely** (2px smudge; renders muddy) |
| Mouth (P13) | all 9 | 4 classes: line-arc (smile/soft/flat/concern merge within class) / open / o / wave — pick the class representative: smile, open, o, flat | 3 classes: arc / open-blob / dot — smile, open, o only |
| Ear rotation (P3/4) | full | **survives**, incl. asymmetry — strongest small-size channel; use ≥8° amplitudes | survives at ≥10°; asymmetry still legible |
| Blush | survives | survives (key identity color) | survives — never crop out |
| Head lean (P2) | survives | drop (crop frame hides it) | drop |
| Sweat acc | survives | survives (blue = high contrast) | drop |

**Quantized small-size sets** (what the runtime should actually apply, mirroring the ≤42px "head derivative" rule from BRAND-GUIDE §1):

- **42px:** keep {earL, earR (quantized to −10/0/+10 with asymmetry allowed), lidUp ∈ {0,14,26}, pupil ∈ {0, full-clamp toward target}, pop ∈ {1, 1.1}, brows ∈ {hidden, raised−6, inner-up 10}, mouth ∈ {smile, open, o, flat, wave, concern→flat if muddy}, blush}. Drop: lid-low, head lean, arm/tail params (out of crop).
- **28px:** keep {ears ∈ {perk −12, 0, droop +12}, lidUp ∈ {0, 26}, mouth ∈ {smile, open, o}, blush}. Everything else neutral. The 14 expressions collapse to **5 honest reads**: content (smile), excited/celebrating (open + perk), surprised (o + pop), calm/sleepy (lids 26 + droop), attentive (perk + smile) — which is the correct amount of information for a 28px chip. Never attempt Confused/Gentle-concern at 28px; escalate those to a larger slot or text.
- Degradation is a **render-time parameter filter**, not separate artwork — one rig, one geometry, filtered tuples (E5).

---

## 6. Proof sheet & verification

`systems/expressions-sheet.svg` — 8 of 14 expressions (Happy, Curious, Thinking, Surprised, Celebrating, Calm, Sleepy, Gentle concern) as head crops (viewBox `56 −10 208 216`, the canonical head-icon crop), geometry reused verbatim from `direction-c.svg`, closed palette only (`#FFD94F #EDB93A #FFF4DA #8C2233 #33201F #F0A0AC` + cocoa labels on cream). Generator: `systems/build_sheet.py` (encodes the ear sign-mirroring and lid occluder math; kept in workspace as the reproducible export path).

Verified on the rendered `expressions-sheet.png`:
- **Same-character test:** every face keeps the identical head circle, ear triangles + maroon inners, cream muzzle, maroon triangle nose, blush pair, cocoa disc eyes with highlight cluster — unmistakably PAW in all 8 tiles.
- **Distinctness:** all 8 are tellable apart at a glance; nearest pair (Happy vs Calm) separates cleanly via lids + ears.
- **Cuteness guard:** no tile reads infantile; Thinking/Concern/Calm read distinctly adult-companion.
- **Small sizes:** `smallsize-test.png` confirms the §5 survival table at 42px and 28px.

No files in `/home/user/workspace/fiezel-repo` were modified.

---

## Proof sheet v2 (14/14)

Appended 2026-08-27 (proof-sheet subagent; body above owned by the ruling-edit pass — no other edits made here). Character name per 17: **PAW**.

**New files:** `systems/expressions-sheet-14.svg` + `.png` (title "PAW — Expression System · 14 of 14", 2×7 grid, cream, closed palette) — all 14 §2 expressions as canonical head crops (viewBox `56 −10 208 216`), generated by the extended `systems/build_sheet.py`. Small-size: `systems/smallsize-test-v2.png` (42px/28px strip for the 6 expressions the original `smallsize-test.png` did not cover).

**Tuple/serialization corrections applied (17 R-3):**
1. **Thinking armR −95 → literal +96** (R-3 manifest item 2). Rendered in-crop: at +96 the paw lands at the chin (the intended chin-reach); at −95 it would swing outward — the render confirms the ruling.
2. **Curious & Welcoming earR** (rows 4/13): 07 prints semantic +4 (droop); exports serialize **literal +4 = perk 4°** (semantic −4) per R-3 flag 1 — the serialized `direction-c.svg` wins for exports.
3. Ear sign convention verified: `build_sheet.py` serializes right ear as `rotate(−semantic)` and is R-3's correct witness; `gen_poses_sheet.py`'s missing earR negation remains with the manifest-applier (R-3 item 17).
4. Arm values rendered as **literal** degrees (Encouraging −90 point, Celebrating +115/−115 cheer, Welcoming +105 wave) where the raised gesture enters the head crop; Excited's +60/−60 sits below the crop frame and is omitted with the body. Left-arm 4%-black stain removed per the adopted export cleanup.
5. Minor render fix vs v1: eye pop (P10) now scales about the face center per §1.1 (v1 scaled per-eye).

**Visual verification (expressions-sheet-14.png):** all 14 distinct at a glance — the open-mouth cluster (Excited / Encouraging / Celebrating / Welcoming) separates via the in-crop arm gestures + ear symmetry; nearest quiet pair (Proud vs Calm) separates via ear perk-vs-droop + lid depth. Same-character test passes in all 14 tiles; none reads infantile or angry (Thinking's inner-down 6° stays within the §1.3 anti-anger cap). R-5 note: every tile is a static frame — exactly what strict no-blink reduced motion displays.

**Small-size survival, the 6 newly tested (per §5 rules):**

| Expression | 42px | 28px |
|---|---|---|
| Neutral | ✔ default read | ✔ content |
| Excited | ✔ open + brows + perk ("positive-open") | ✔ collapses to honest excited/celebrating class |
| Confused | ✔ sweat + wave + asym ears survive | ✘ wave→smudge, sweat→speck — confirms the §5 28px ban |
| Encouraging | ~ survives as positive-open but **merges with Excited** (pointing arm out of crop) | ✘ collapses into excited class |
| Proud | ✘ as distinct — lidUp 8 quantizes to open, soft→smile-arc, blush Δ invisible → reads content | ✘ collapses to content (smile) |
| Welcoming | ~ open survives; ear asymmetry 8°/4° marginal (right ear below the ≥8° rule) | ~ excited-class read, asymmetry barely legible |

Net: results match §5's quantized sets exactly — no rule changes needed; the "5 honest reads at 28px" claim now stands verified across all 14.

**OWNER revision (2026-08-27, applied post-delivery):** the fiezel-paw glyph appears **only on the chest emblem — never on hand/paw pads**. All in-crop arms in `expressions-sheet-14.svg/.png` are now plain yellow capsules with no pad markings (`build_sheet.py` updated; pad-glyph rendering removed). Re-verified on the regenerated PNG: the four gestures still read via arm silhouette — Encouraging (right point-bump), Celebrating (twin cheer-bumps), Welcoming (left wave-bump) stay mutually distinct, and Thinking's chin-reach tucks largely behind the head but its face channels (half-lids + corner pupils + flat mouth + focus brows) carry the read, as in the v1 8-sheet. The §2 tuples' "(pads: on)" flags remain body-emblem/full-body concerns, not hand markings, for rig implementers. `smallsize-test-v2.png` regenerated unchanged in content (arm params were already filtered at 42/28px per §5).
