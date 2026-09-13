# 08 — PAW Pose System (16-pose library)

Pose System Designer · 2026-08-27 · Wave 3 of the FIEZEL PAW redesign.

**Binding base:** `directions/selected-direction.md` (Direction C rig, rotation-free body rule), parameter table in `directions/direction-c-expressive.md` §4, geometry in `directions/direction-c.svg`. Canonical rig source at implementation time is the ONE component `features/mascot/fiezel-mascot.js`; every static pose file (today's `assets/marketing/mascot-poses/`) becomes a **generated export** of a parameter tuple, never a hand-copied fork (selected-direction E5 note). **No repo files were modified.**

Proof sheet: `systems/poses-sheet.svg` (+ `poses-sheet.png`), 8 full-body poses generated from `direction-c.svg` geometry by `systems/gen_poses_sheet.py` — verified visually: every cell passes the same-character test (head r=88, triangular maroon-inner ears, blush r=11, cream muzzle + maroon triangle nose, chest paw emblem, tail capsule **with maroon ring**, closed palette).

---

## 0. Conventions

### 0.1 The rotation rule (hard, from selected-direction.md)

- The **body mass and whole figure are never rotated, tilted, or mirrored** — in static poses and in animation.
- Allowed: **translate + scale** on `fz-all`, `fz-head` (translate only), `fz-chest`, feet; **rotation only of limbs/ears/tail/brows around their own pivots** (ears @ (108,52)/(212,52), arms @ shoulders (115,185)/(198,182), tail bones @ (212,244)/(296,200), brows @ (125,67)/(195,67)).
- "Facing the other way" is a **parameter sign flip** (head tx, gaze, which arm raises), never a geometric mirror.

### 0.2 Parameters used below

All parameters are Direction C's P1–P20 (`direction-c-expressive.md` §4). Values are the literal SVG transform values as serialized in `direction-c.svg` (rotation clockwise-positive):

| Shorthand | Rig param | Meaning / range |
|---|---|---|
| `earL/earR` | P3/P4 | rotate deg @ ear base pivots; values in pose tuples are SEMANTIC (− = perk, + = droop, both ears); right-ear LITERAL serialized value = −(tuple value), mirror rule 17 R-3; semantic range −14…+18 (literal earR −18…+14) |
| `head(tx,ty)` | P2 | `fz-head` translate; ±6 / ±4 |
| `lidU` | P5/P6 | upper-lid ty; 0 open … 34 closed |
| `lidL` | P7 | lower-lid ty; 0 … −14 (smile squint) |
| `pupil(tx,ty)` | P8 | highlight cluster translate inside eye clip; ±6/±5 |
| `gaze(tx,ty)` | P9 | `fz-eyes` lookAt translate; ±7/±5 |
| `brows` | P11/P12 | hidden by default; when shown: ty −8…+6, rot ∓14° per side |
| `mouth` | P13 | one of smile · soft · open · o · sp1 · sp2 · wave · flat · concern · sad |
| `tailB/tailT` | P14/P15 | tail-base rotate ±8 / tail-tip rotate ±20; **ring lives inside `fz-tail-tip` and always follows** |
| `armL/armR` | P16/P17 | rotate @ shoulder; + sweeps left-arm out/up and right-arm inward-across; − the reverse |
| `pads` | P18 | pad opacity 0/1 — on only when a paw is raised palm-out |
| `chest` | P19 | scale 1…1.06 |
| `all(tx,ty · sx,sy)` | P1 + squash | `fz-all` translate + scale **about the ground point (160,284)** so feet stay planted; rotation-free |

**Range amendment (flagged):** the thinking/reading chin-reach needs the right arm to sweep **inward across the body to +96…+115** (SVG value), beyond §4's documented +30. It is still a rotation around the arm's own shoulder pivot — legal under the rule — so the R-arm range is amended to **−130…+115** (mirror for L: −115…+130). No other §4 range changes.

**New additive leg/feet params** (feet were only named `fz-foot-l/-r` in C11; poses need them addressable — translate/scale ONLY, no foot rotation):

| Param | Target | Transform | Range |
|---|---|---|---|
| F1/F2 foot L/R step | `fz-foot-l/-r` | translate | tx −10…+10, ty −14…0 |
| F3/F4 foot L/R shape | `fz-foot-l/-r` | scale about foot center | 0.9…1.15 per axis |

Feet are **pill capsules** (48×22, rx 11 — the Direction-B cleanup adopted in selected-direction.md; binding per 17 R-6, superseding Direction B §2's 42×18 rx9), and the left-arm 4%-black stain is removed in all pose exports (second adopted cleanup).

### 0.3 Closed palette (normative for every pose export)

`#FFD94F` body · `#EDB93A` shade/feet/tail · `#FFF4DA` cream · `#8C2233` maroon · `#33201F` face ink · `#F0A0AC` blush · `#D8B36B` gold accessories · `#D9536A` soft red — plus sanctioned exceptions `#9CC7E8` (sweat/tear, hidden by default), `#000` @ .08/.04 (shadow), `#fff` eye highlights. **Nothing else.** This normalizes the audit's off-palette pose defects (see §3).

### 0.4 Scale tiers (master prompt §29 mapped to product px, audit 02 §5.6 / audit 03 A.1)

| Tier | px anchors in product | What renders |
|---|---|---|
| **Tiny** | 22–28px (panel avatar, map-note face) | head crop only; coarse face reads (eyes/mouth/ears) |
| **Small** | 30–58px (coach strip 42, coach bubble 58/46/30) | head crop; lids/brows readable, lid-slivers ≥42px only |
| **Medium** | 88px dock, inline card slots | full body; limb poses readable, fine face detail coarse |
| **Large** | 120–200px (onboarding 148, component pin ~200) | full body, full expression detail |
| **Full** | 512px+ (completion overlay, marketing, share cards) | everything incl. accessories and jump choreography |

A pose "allowed" at tiny/small means its **head-crop fallback still communicates the pose intent**; body-driven poses list the fallback face explicitly.

---

## 1. The 16 poses

Neutral values are omitted (= 0 / hidden / smile / pads off / all(0,0 · 1,1)).

### 1.1 Idle standing
- **Params:** everything neutral; `mouth smile`; `tailT` slow sway ±4 (animated) / +4 (static export); breath P1 on.
- **Silhouette:** the canonical master silhouette — round head over capsule body, ear triangles up, tail curl right with ring tip. Readable because it *is* the identity reference; every other pose is a delta from it.
- **Staging:** none.
- **Reuse:** state IDLE (§11); production `idle`; every surface — dock, coach strip, hero, onboarding rest frames.
- **Tiers:** all five.

### 1.2 Waving
- **Params:** `head(2,−2)` · `earL −8, earR +4` · brows shown, raised (ty −3, rot −4/+4) · `mouth open` · `tailT +18` · `armL +105, padsL on` · `armR −14`. Wave beat = armL oscillates ±10° about +105 (own-pivot rotation, legal).
- **Silhouette:** raised paw with maroon pads breaks the left rim at head height; tail-tip flick balances the right side — a clear asymmetric "hello" triangle. Pads are the read: without them the yellow arm melts into the head (verified on proof sheet).
- **Staging:** none.
- **Reuse:** GREETING, WELCOME_BACK (bigger flick +20, two wave beats); production `greeting`; onboarding step 1, website hero cycle, coach bubble open.
- **Tiers:** medium/large/full. Tiny/small fallback: head crop with open mouth + raised brows (greeting face).

### 1.3 Pointing
- **Params:** `armL +88` (horizontal capsule toward screen-left content), **pads OFF** (back of paw shows — pads only for palm-out) · `head(−3,0)` · `gaze(−6,0)` · `pupil(−4,0)` · `earL −10, earR +2` · brow L shown raised · `mouth soft` · `tailT +8`. Content on the right ⇒ `armR −88` + sign-flipped head/gaze — parameter change, **not** a mirror.
- **Silhouette:** one horizontal capsule fully clear of the body at ±85…95°; head+gaze+ear all agree on one direction, so the vector reads even at 88px.
- **Staging:** the pointed-at thing is always an **existing UI element** (answer card, panel, CTA) — never a drawn arrow or new prop.
- **Reuse:** production `hinting`; LESSON_START call-to-action; directional ENCOURAGING variant; quiz hint moments (`react('hint')`).
- **Tiers:** medium+. Small fallback: looking pose (1.4) face.

### 1.4 Looking
- **Params:** `head(+4,0)` toward target (sign = direction) · `gaze(+6,−3)` · `pupil(+4,−3)` · near ear −10, far ear +4 (asym perk) · near brow raised · `mouth soft` · `tailT +14`.
- **Silhouette:** body mass unchanged; the offset head over the static body reads as a lean with zero rotation (Direction C §6 lean-in recipe). Asymmetric ears are what make it legible in silhouette.
- **Staging:** none; target supplied by the existing `lookAt` API.
- **Reuse:** production `curious`; LESSON_START, `question-shown`, LISTENING pre-roll; onboarding carousel.
- **Tiers:** **all five** — the pose is face-borne, survives head crop to 22px (gaze + ear asymmetry).

### 1.5 Thinking
- **Params:** `head(2,−1)` · `earL +2, earR −6` · `lidU 10` · `pupil(5,−4)` (up-corner) · brows shown low (ty +4, rot −6/+6) · `mouth flat` · `tailT −4`, tail still · `armR +96, padsR on` — paw capsule rests at the chin below the muzzle (verified on proof sheet; +96 keeps pads off the muzzle). Optional sanctioned accessory: `fz-dots` (maroon thinking dots).
- **Silhouette:** arm crossing the chest breaks the symmetric body line; stillness (tail parked) is part of the read.
- **Staging:** none.
- **Reuse:** THINKING; production `thinking`; coach bubble `ask()` hold; SPEAKING pre-compose beat.
- **Tiers:** all — tiny/small carry it with the face alone (half-lids + up-pupils + low brows).

### 1.6 Reading
- **Params:** sitting base (1.13) + `head(0,+3)` tucked · `gaze(0,+4)` · `pupil(0,+4)` · `lidU 8` · `earL/R +2` · `mouth soft` · brows hidden · `armL −18, armR +18` (both forward-inward, bracketing a "page") · `tailB −4, tailT −6` settled.
- **Silhouette:** bowed head (down-translate) + inward arms make a compact, focused mass; downward gaze is the primary read.
- **Staging:** **NO book prop** — a book is not in the sanctioned `fz-acc` vocabulary and no new accessories are allowed. In-app, the "page" is the adjacent lesson card PAW gazes down at (master prompt §28 panel relationship). Where a standalone composition needs a visible page (marketing), place a cream `#FFF4DA` rounded-rect card as a **decorative UI element outside the character group** (its own layer, never attached to the rig, never overlapping the chest emblem). Flagged per task rule.
- **Reuse:** LESSON_START on material screens; vocab/grammar intros; empty states ("materi" cards).
- **Tiers:** medium+. Small fallback: down-gaze face only.

### 1.7 Studying
- **Params:** reading base + focus deltas: brows shown low (ty +3, rot −5/+5) · `lidU 6` · occasional head bob ty +1↔+3 · aha-beat: swap `fz-dots` → `fz-bulb` (gold, sanctioned) with brows flipping to raised for 600ms.
- **Silhouette:** same as reading; the dots/bulb accessory above the head is the differentiator at distance.
- **Staging:** "desk" = the bottom edge of the host UI card — decorative context outside the character; no new props.
- **Reuse:** long-hold THINKING; practice/review screens; study-reminder notifications art.
- **Tiers:** medium+.

### 1.8 Listening
- **Params:** `fz-headphones` ON in **master colors** — `#D8B36B` band (14 stroke, round cap) + `#8C2233` cup capsules (38×54 rx18) — this is defect fix D2, see §3 · `earL/R −4` (tucked under band) · `lidL −8` (smile squint) · `mouth smile` · groove = `head` translateX ±3 alternating with `tailB ∓4` counter-sway (.62s, Direction C §6 — replaces the old body-rotate groove) · optional `fz-notes` (gold).
- **Silhouette:** headphone band + cups double the head's top width — the most distinctive prop silhouette in the library; readable to 22px.
- **Staging:** headphones are already sanctioned `fz-acc` — no new accessory.
- **Reuse:** LISTENING; production `listening` (skillsLab `listening-start`/`listening-stop`); onboarding carousel slide.
- **Tiers:** **all five** (head crop keeps band + cups + squint).

### 1.9 Presenting
- **Params:** `armL +60, armR −60` (open symmetric V, pads off) · `chest 1.04` · `head(0,−1)` · brows raised (ty −3) · `mouth open`; in SPEAKING, mouth cycles sp1→sp2→open on `FiezelSubtitle` sentence beats (Direction C §4 speaking driver) · `gaze(0,0)` at viewer · `tailT +10`.
- **Silhouette:** two open arm capsules widen the base into a stable "ta-da" trapezoid; chest puff pushes the cream patch + emblem forward.
- **Staging:** the presented thing is the **adjacent UI panel** (master prompt §16/§28) — PAW gestures at it, never holds it.
- **Reuse:** SPEAKING; LESSON_START intro beat; ACHIEVEMENT reveal; coach explanation moments.
- **Tiers:** medium+. Small fallback: speaking face (sp-mouth cycle).

### 1.10 Encouraging
- **Params:** `armR −90, padsR on` (point-out with pads = "you can do it" palm) · nod = `head` ty 0→+3→0 twice (no rotate) · brows raised (ty −3) · `mouth open` · `earL/R −6` · `tailT +10`.
- **Silhouette:** single horizontal capsule right + pads; nod animates within the silhouette.
- **Staging:** none.
- **Reuse:** ENCOURAGING; CORRECT (tier-1 acknowledgment); the recovery beat of INCORRECT — first the gentle-concern face (expression 14), then this pose; production `encouraging` (wrong-answer flow, coach bubble `ask()` resolve).
- **Tiers:** medium+. Small fallback: raised brows + open mouth face.

### 1.11 Celebrating
- **Params:** `earL/R −10` · `pupil(0,−2)` · brows raised (ty −4) · `mouth open` · `tailB +6, tailT +18` — **ring stays on the tip bone, always rendered** (defect fix D1, §3) · `armL +112, armR −112, both pads on` · jump on `fz-all`: ty −12, scale(0.97, 1.05) about ground point; shadow scale .85, opacity .06. Three tiers by amplitude only (BRAND-GUIDE 3-tier rule): t1 ty −6 / arms ±100, t2 ty −12 / ±112, t3 ty −18 / ±118 + existing confetti (capped).
- **Silhouette:** two pad-tipped capsules up beside the ears + lifted ground gap + high tail flick — unmistakable at 88px.
- **Staging:** confetti is the existing component effect, not a rig element.
- **Reuse:** CELEBRATING, LESSON_COMPLETE (t3 + completion stars), MILESTONE (held proud chest 1.06 then t2 burst); production `celebrating`×3 / `completion`.
- **Tiers:** medium/large/full. Small fallback: happy-arc eyes + open mouth.

### 1.12 Jumping
- **Params:** airborne frame: `fz-all` ty −22, scale(0.95, 1.06) · feet tuck F1/F2 (±2,−2), F3/F4 (0.95,0.9) · `armL +115, armR −115, pads on` · `earL/R −12` · `mouth open` · `tailB +8, tailT +20` · shadow stays grounded at scale .7 / opacity .05. Landing frame: `fz-all` ty 0, scale(1.06, 0.94) squash, feet neutral.
- **Silhouette:** vertical stretch + visible gap to the detached ground shadow = airborne without any rotation.
- **Staging:** none.
- **Reuse:** LEVEL_UP (single big jump + both-ears-up), CELEBRATING tier-3 peak frame.
- **Tiers:** medium+ (needs the ground shadow to read; head crop cannot carry it).

### 1.13 Sitting
- **Params:** `fz-all` scale(1.03, 0.95) about ground (settled squash) · `head(0,+2)` · `earL/R +4` · `lidU 14` (calm half-lid) · `mouth soft` · feet splay F1/F2 (−7,+3)/(+7,+3), F3/F4 (1.12, 0.9) — soles forward · `armL −10, armR +10` (rest inward toward lap) · tail wrap `tailB −8, tailT −12` (curls low around the body).
- **Silhouette:** wider, lower base with splayed capsule feet + low wrapped tail = grounded/settled; calm half-lids complete it.
- **Staging:** none (PAW's single-mass body already reads seated; this pose makes it explicit).
- **Reuse:** long-idle calm (expression 11), base for reading/studying, WELCOME_BACK settle-in; production `idle` extended holds.
- **Tiers:** medium+. Small fallback: calm face (half-lids + soft mouth).

### 1.14 Walking
- **Params (frame A):** F1 (7,−9) lifted forward, F2 (−4,0) planted · `armL +24, armR −18` counter-swing · `fz-all` ty −3 bob · `head(+4,0)` toward travel · `gaze(+5,0)` · `earL −4, earR +2` · `mouth soft` · `tailB +5, tailT +10`. **Frame B = same magnitudes, signs flipped per parameter** (foot roles swap) — a parameter flip, not a mirror of geometry.
- **Silhouette:** one lifted capsule foot + ground gap under it + counter-swung arms; head lean gives direction.
- **Staging:** none.
- **Reuse:** enter/exit motion (master prompt §18), screen transitions, WELCOME_BACK walk-in; not bound to a production state today (new capability).
- **Tiers:** medium+.

### 1.15 Running
- **Params:** amplified walk: F1 (10,−13), F2 (−8,−2) · `armL +45, armR −40` pumping · `fz-all` ty −5, scale(1.05, 0.96) (horizontal stretch = speed, no rotation) · `head(+6,+1)` · `earL +8, earR +10` swept back (wind) · `gaze(+6,0)` · `mouth sp2` (small open — effort, not distress) · `tailB −6, tailT −18` streaming low behind · shadow scale .8.
- **Silhouette:** stretched figure + both feet off baseline + swept ears + streaming tail — speed lines are NOT added (no new marks); the stretch carries it.
- **Staging:** none.
- **Reuse:** urgent enter/exit, countdown/timed moments, LEVEL_UP dash-in; new capability (no production state yet).
- **Tiers:** large/full preferred (needs travel room); medium acceptable for a 2-frame cycle.

### 1.16 Sleeping
- **Params:** closed eyes via the **`fz-lids` blink layer held visible** (its curved lash line is the sleep read; cheaper and warmer than lidU 34) · `head(0,+3)` · `earL +10, earR +12` droop · `mouth soft` · feet tuck F1/F2 (+4,+1)/(−4,+1) inward · `tailT −8` settled · `fz-zzz` ON (maroon z + gold z, sanctioned) · `fz-all` ty +2 · breath slowed to ~3.4s.
- **Silhouette:** drooped ear triangles + closed-lash face + zzz marks top-right; the lowered head-translate settles the whole mass.
- **Staging:** zzz is existing `fz-acc` — no new accessory.
- **Reuse:** production `sleepy` (idle-timeout, onboarding final slide); pre-`wake` state.
- **Tiers:** all — head crop keeps lashes + drooped ears (zzz sits outside the head-crop viewBox at tiny/small; the face alone still reads asleep).

---

## 2. Reuse matrix

### 2.1 The 15 character states (master prompt §11) → poses

| State | Primary pose | Secondary / sequence |
|---|---|---|
| IDLE | 1.1 idle standing | 1.13 sitting (long holds), 1.4 looking (micro-glances) |
| GREETING | 1.2 waving | — |
| LISTENING | 1.8 listening | 1.4 looking (pre-roll orient) |
| THINKING | 1.5 thinking | 1.7 studying (long holds) |
| SPEAKING | 1.9 presenting (sp-mouth cycle) | 1.5 thinking (compose beat) |
| CORRECT | 1.10 encouraging | 1.11 celebrating t1 (streaks) |
| INCORRECT | gentle-concern face on 1.1 | → 1.10 encouraging (recovery beat) |
| ENCOURAGING | 1.10 encouraging | 1.3 pointing (directional) |
| CELEBRATING | 1.11 celebrating (t1–t3) | 1.12 jumping (t3 peak) |
| WELCOME_BACK | 1.2 waving (flick +20) | 1.14 walking (walk-in) → 1.13 settle |
| LESSON_START | 1.4 looking → 1.9 presenting | 1.3 pointing (CTA), 1.6 reading (material) |
| LESSON_COMPLETE | 1.11 celebrating t3 + stars | 1.12 jumping |
| LEVEL_UP | 1.12 jumping | 1.11 celebrating (ears −12) |
| ACHIEVEMENT | 1.9 presenting + chest 1.06 | proud face (expression 8) |
| MILESTONE | proud hold on 1.1 (chest 1.06) | → 1.11 celebrating t2 burst |

### 2.2 Production 14 states (`fiezel-mascot.js`) → poses

idle→1.1 · greeting→1.2 · curious→1.4 · thinking→1.5 · listening→1.8 · encouraging→1.10 · celebrating→1.11/1.12 · confused→1.1 + wave mouth + sweat · hinting→1.3 · completion→1.11 t3 · proud→1.1 + chest 1.06 + soft mouth · sleepy→1.16 · sad→1.1 + gentle-concern face (expression 14) · love→1.1 + heart-eye swap.

### 2.3 App surfaces (audit 03 A.1/A.3)

| Surface | Size/tier | Poses used |
|---|---|---|
| Dock (bottom-right) | 88px · Medium | all except 1.15 running (space) |
| Home coach strip | 42px head crop · Small | 1.1, 1.4, 1.5, 1.8, 1.16 face reads |
| Coach bubble | 58/46/30px · Small | 1.1, 1.4, 1.5, 1.10 face reads |
| Onboarding | 120–148px · Large | 1.2, 1.4, 1.8, 1.5, 1.10, 1.16 |
| Learning map note | 28px · Tiny | 1.1, 1.4 face reads |
| Completion screen | full-body overlay · Full | 1.11, 1.12 |
| Website hero / install | large · Large/Full | 1.2, 1.1, 1.9; marketing statics from the full library |
| Empty/material states | inline card · Medium | 1.6, 1.7, 1.13 |

---

## 3. Audit defect fixes (normative)

- **D1 — Celebrating keeps the tail ring** (audit 01 §3a/3f-5: `paw-mascot-full-celebrating.svg` drops the maroon ring). Rule: the ring circle r=15 `#8C2233` **and its mask live inside `fz-tail-tip`** and follow every tail rotation; a pose export without the ring is invalid and must be regenerated from the rig. The old export's bottom-pivot arm transform `rotate(-38 122 236)` is also superseded by the shoulder-pivot arms (P16/P17). Verified fixed on the proof sheet (pose 5).
- **D2 — Closed palette in all poses** (audit 01 §3f-3/4/6):
  - Listening headphones: `#241A11` cups and `#FFC700` LEDs are **banned**; the one headphone design is the master's — `#8C2233` cups + `#D8B36B` band, no LEDs. Verified on proof sheet (pose 4).
  - Proud stars: `#FFC700`/`#E6A800` stroked stars are banned; stars are `fz-stars` gold `#D8B36B` (accent `#D9536A`), flat fill, no strokes.
  - Proud happy-eye arcs return to master coordinates (`M112 101 C 119 90 133 90 140 101`, stroke 7) — no face drift.
  - `#9CC7E8` stays the sanctioned hidden sweat/tear exception (documented, not expanded).
- **D3 — Single source**: pose statics in `assets/marketing/mascot-poses/` are regenerated as exports of parameter tuples from the canonical component rig; a pose-consistency gate (audit 01 §5 ADD) should hash them against the generator.

---

## 4. Compliance check

- **Rotation audit:** the only `rotate()` transforms in the whole library act on `fz-ear-l/-r`, `fz-arm-l/-r`, `fz-tail-base/-tip`, `fz-brow-l/-r` around their own pivots. `fz-all`, `fz-body`, `fz-head`, feet, chest use translate/scale only. No mirroring anywhere (walking frame B is a parameter sign flip). ✔ E4.
- **Palette audit of the proof sheet:** fills/strokes used = `#FFD94F #EDB93A #FFF4DA #8C2233 #33201F #F0A0AC #D8B36B` + `#fff` highlights + `#000` @ .08/.06/.05 shadow. Closed. ✔ B1.
- **Accessories:** only sanctioned `fz-acc` items appear (headphones, notes, dots, bulb, zzz, stars, sweat); reading/studying explicitly solved **without** a book prop (§1.6 staging flag). ✔ A5.
- **Tone:** no pose is punishing; INCORRECT routes through gentle-concern → encouraging; running uses sp2 effort mouth, not distress. ✔ E1/E2.
- **Static-safe:** every pose is specified as a readable static tuple (the proof sheet is static). ✔ D3.

## 5. Files

- `systems/08-poses.md` — this spec
- `systems/poses-sheet.svg` — proof sheet, 8 full-body poses from `direction-c.svg` geometry (idle, waving, thinking, listening, celebrating-with-ring, walking, sitting, sleeping)
- `systems/poses-sheet.png` — 1800px render used for the same-character verification
- `systems/gen_poses_sheet.py` — parameter-tuple generator (demonstrates poses-as-exports, D3)

---

## Proof sheet v2 (16/16)

Pose Sheet Extender · 2026-08-27 · extends the 8-pose proof sheet to the full 16-pose library. Official character name **PAW** per 17.

### Files

- `systems/poses-sheet-16.svg` + `systems/poses-sheet-16.png` (1800px) — title "FIEZEL PAW — Pose Library · 16 of 16", 4×4 grid, cream `#FFF9EE` background, all 16 poses of §1 in order (1.1–1.16). Supersedes `poses-sheet.svg/.png` (8/8) as the proof asset; the old files are kept as history.
- `systems/gen_poses_sheet.py` — extended to all 16 tuples; still the single parameter-tuple generator (D3); the chest emblem is the exact `fiezel-paw.svg` glyph instance (s=1.75 per 15 §2). **Hand pads retired per OWNER revision — see below.**
- Verified on the PNG: every cell passes the same-character test (head r=88, triangular maroon-inner ears, blush r=11, cream muzzle + maroon triangle nose, chest paw-glyph emblem, tail capsule **with maroon ring in all 16**, closed palette, no whole-body rotation/mirroring). Hands render as plain yellow capsules in all poses (OWNER revision below); the chest emblem glyph appears in all 16 cells.

### R-3 earR sign fix (17 R-3, manifest item 17) — applied

- `gen_poses_sheet.py` previously serialized the right-ear tuple value **raw** (`rotate({earR} 212 52)`); it now **negates** it (`rotate({-earR} 212 52)`), matching `build_sheet.py`'s mirror and the canonical literal-SVG clockwise-positive convention. Pose tuples remain authored in the semantic ear convention (− = perk, + = droop, both ears).
- Concrete effect (old → new serialized earR literal): celebrating **−10 → +10** (the hazard case named in 17 R-3), jumping −12 → +12, thinking −6 → +6, listening −4 → +4, encouraging −6 → +6; waving +4 → −4, looking +4 → −4, sitting +4 → −4, walking +2 → −2, pointing +2 → −2, reading/studying +2 → −2, running +10 → −10, sleeping +12 → −12.
- All 16 serialized earR literals verified against the 17 R-3 conversion table (literal column) and consistent with `build_sheet.py`'s renders. The waving/looking earR literal −4 vs `direction-c.svg`'s serialized +4 is the documented 17 R-3 **flag 1** cosmetic divergence (8°), unchanged here — this generator follows the build_sheet mirror as mandated by manifest item 17.

### R-6 feet (17 R-6) — verified

- Generator feet already emit **48×22, rx 11** pill capsules (`width="48" height="22" rx="11"`, 32 instances = 16 poses × 2 feet on the sheet). No change needed; value confirmed binding per 17 R-6 (Direction B's 42×18 rx9 rejected).

### Parameter notes for the 8 newly rendered poses (deltas/choices logged, old → new)

- **1.5 thinking:** chin-reach stays `armR +96` (literal, inward-across) per 17 R-3 — already correct in the generator; pads clear the muzzle as documented.
- **1.7 studying (static frame):** head bob ty +1↔+3 frozen at **ty +2**; `fz-dots` (maroon, sanctioned) rendered as the distance differentiator vs reading; the 600ms `fz-bulb` aha-beat is not a static-sheet frame.
- **1.4 looking (static frame):** rendered toward +x with the curious tuple `earL −10 / earR +4` (semantic; serialized literal −10 / −4 per R-3 table row "10 §1.2 curious"); near brow = browR raised (−3, +4).
- **1.9 presenting / 1.10 encouraging brows:** rendered exactly as specced — ty −3, **rotation 0** (first draft had added ±4° rot; corrected −4/+4 → 0 to match §1.9/§1.10 text).
- **1.12 jumping:** airborne frame as specced (`fz-all` ty −22, scale 0.95/1.06, feet tuck (±2,−2) scale (0.95,0.9), shadow .7/.05); grounded shadow stays outside `fz-all`, giving the visible air gap.
- **1.6/1.7 sitting base:** reading/studying compose §1.13's sitting base (feet splay (∓7,+3) scale (1.12,0.9), `fz-all` scale (1.03,0.95)) with their own overrides, per §1.6 "sitting base (1.13)".
- No other §1 parameter values were changed; all remaining tuples render correctly as written.

### Sheet-level checks

- Palette audit of `poses-sheet-16.svg`: `#FFD94F #EDB93A #FFF4DA #8C2233 #33201F #F0A0AC #D8B36B` + `#fff` highlights + `#000` @ .08/.06/.05 shadows + `#FFF9EE`/`#241A11` sheet chrome (background/labels, outside the character groups). Closed. `#D9536A` defined but unused on this sheet (no soft-red pose element).
- Chest emblem = `fz-pawprint` instance `translate(160,225) scale(1.75) translate(-12.6,-12.45)` in **all 16** cells; **zero** pad glyph instances anywhere (verified: no `scale(1.35)` in the SVG); no legacy dot-cluster signatures (15 §8 gate).

### OWNER revision — hand pads retired, chest-only glyph (2026-08-27, same day)

- **OWNER decision:** the `fiezel-paw` glyph appears **ONLY on the chest emblem — never on hand/paw pads**. All pawprint pad instances were removed from hands in every pose; hands are plain yellow capsules with no pad markings. The chest emblem remains the exact `fiezel-paw.svg` glyph instance (s=1.75, fixed maroon) in all 16 poses.
- Generator change: `gen_poses_sheet.py` `pads()` now emits nothing (old → new: `pawprint(cx, cy, 1.35)` → `""`); the P18 `padsL/padsR` flags stay in the pose tuples for spec traceability but render nothing. `poses-sheet-16.svg/.png` regenerated and re-verified: 0 pad instances, 16 chest emblems, 16 tail rings, feet 48×22 rx11 unchanged, all 16 silhouettes still distinct and readable (raised arms read as clear yellow capsules against the cream background).
- Spec fallout (not edited here, flagged for the owning subagents): 15-pawprint-alignment §1/§2/§4–§6/§8 pad-instance rules, §0.2 P18 pad semantics, and the §1 pose recipes' "pads on" reads (e.g. §1.2 "Pads are the read") now describe a retired visual and need a chest-only revision pass.
