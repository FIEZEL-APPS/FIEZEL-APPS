# PAW — Master Assets (animation-ready)

Master Asset Builder · 2026-08-27 · Official mascot name: **PAW** (never "Pau" — a project-era misnomer, corrected 2026-08-27).

> **OWNER REVISION (2026-08-27, applied):** the `fiezel-paw.svg` glyph instance appears **only on the chest emblem** — the hand/paw-pad instances specified in `systems/15-pawprint-alignment.md` are **retired**. Arms are plain yellow capsules with no pad markings of any kind. P18 (pads opacity) and the F5/F6 locked pad-instance transforms are retired with them; F7 (chest emblem, s=1.75, maroon `#8C2233` on the cream chest patch) remains binding. Additionally, an OWNER-approved **outfit/accessory layer** (backpack, hat, flower) is reserved as empty anchor groups — contract in §6.

| File | Purpose |
|---|---|
| `paw-master.svg` | Canonical animation-ready full-body master, viewBox `0 0 320 300`, **neutral state** |
| `paw-master-head.svg` | Head-only export twin, viewBox `56 -10 208 216` (production head-crop, same as `assets/brand/paw-mascot-head.svg`) |
| `renders/paw-master-{512,148,88,42,28}.png` | Verification renders (cream `#FFF9EC` background) |
| `renders/paw-master-head-{512,88}.png` | Head-crop verification renders |

All renders were visually verified: unmistakably PAW, neutral face identical in kind to today's default (smile, no brows, open eyes), pawprint emblem = true `fiezel-paw.svg` glyph, feet = 48×22 rx11 pills, nothing broken at any size.

---

## 1. Provenance / export note

- **Geometry source:** `directions/direction-c.svg` (final Direction C geometry), with:
  - Direction A structural repairs baked in (`fz-head` wrapper; ear-base fillets `Q104 66` / `Q216 66` so ±18° ear rotation never exposes the base chord; blink-lid layer present and hidden statically; namespaced mask/clip ids; stable `id` on every animatable node — `paw-*` id prefix alongside the untouched `fz-*` class contract).
  - **17 R-6:** feet are pill capsules **48×22, rx 11** (`<rect>`s at x 108/164, y 246 — same footprint as the shipped ellipses), grouped as `fz-legs`, rendered **in front of the chest**.
  - **selected-direction.md adopted cleanup:** the left-arm 4%-black stain is **removed**.
  - **systems/15-pawprint-alignment.md (as amended by the OWNER revision above):** the chest emblem is a `<use>` instance of the `fz-pawprint` def; hand-pad instances retired — chest-only glyph.
  - Neutral state: all rig parameters at their neutral values (the concept file's "welcoming spark" pose transforms removed).
- **Production integration:** this markup replaces the `svgMarkup()` template literal in `features/mascot/fiezel-mascot.js` per `implementation/code-plan.md` **Phase 1** (and is then byte-synced to `website/assets/mascot/`). At integration time every def id must be **per-instance-uid'd** per the `[P0-1]` rule: `fz-pawprint-<uid>`, `fzcEyeL-<uid>`, `fzcEyeR-<uid>`, `fzcTailTip-<uid>`. This standalone master uses the static `-master` / `-head` suffixes; if both files are ever inlined into one document, re-uid them.
- **Blink compatibility:** `.fz-lid` groups ship hidden via inline `transform="translate(0,80) scale(1,0)"` — the static equivalent of `fiezel-motion.css`'s `.fz-lid{transform:scale(1,0)}` — so the file is blink-correct with and without runtime CSS (runtime CSS overrides the presentation attribute). This is deliberate: `opacity:0` here would break the production scale-based blink loop.
- **Palette (closed):** `#FFD94F #EDB93A #FFF4DA #8C2233 #33201F #F0A0AC #D8B36B #D9536A` + documented extras `#9CC7E8` (sweat/tear, hidden), `#fff` (eye highlights, bulb sheen), `#000` @ .08 (ground shadow). No gradients, no outlines. `#2B2118` never appears on the mascot.
- **Small-size export rule** (15 §4, applies to *shipped* exports, not these verification renders): < 57 px full-body → emblem renders palm-path-only subset; < 34 px → emblem dropped. (The pad rows of 15 §4 are moot — pads retired per the OWNER revision.) Tiny/Small tiers use the head crop, which contains no emblem.

## 2. Pawprint geometry checksum

Canonical geometry string (normalization per `systems/15-pawprint-alignment.md` §8: rects as `x,y,w,h,rx` in document order, then path `d` verbatim, `|`-joined, type-prefixed):

```
SHA-256 = e52cf2302bdae8b790e633c8cf549228002b8214a081142b08f3f5bf0df86d22
```

Recomputed from the `#fz-pawprint-master` def in `paw-master.svg`: **match** ✔ (same hash as `assets/brand/fiezel-paw.svg`, `ICONS.paw`, `direction-c.svg`, `gen_poses_sheet.PAWPRINT`). The def is instantiated exactly once: `#paw-emblem` (chest). No other `<use>` of the glyph exists in the file (OWNER revision: chest-only).

## 3. Layer tree (`paw-master.svg`)

Classes are the animation-selector contract (production CSS/state machine); ids are the stable tooling/addressing contract. `-l`/`-r` = viewer's left/right.

```
svg (viewBox 0 0 320 300)
├─ defs: #fz-pawprint-master · #fzcEyeL-master · #fzcEyeR-master · #fzcTailTip-master
├─ #paw-shadow            .fz-shadow                (ground shadow, outside fz-all)
└─ #paw-all               .fz-all                   [P1 breath]
   ├─ #fz-outfit-back     .fz-outfit-back           (EMPTY outfit anchor — behind-body items; §6)
   ├─ #paw-tail           .fz-tail
   │  ├─ #paw-tail-base   .fz-tail-base             [P14]
   │  └─ #paw-tail-tip    .fz-tail-tip              [P15] (tip capsule + masked #paw-tail-ring .fz-ring — ring rides the tip bone)
   ├─ #paw-body           .fz-body                  (never rotated, never mirrored)
   │  ├─ #paw-torso       .fz-torso
   │  │  ├─ #paw-torso-shape                        (body capsule 116×96 rx42)
   │  │  ├─ #paw-chest    .fz-chest                 [P19] = #paw-chest-patch + #paw-emblem .fz-emblem (pawprint instance)
   │  │  └─ #paw-legs     .fz-legs                  (17 R-6; in front of chest)
   │  │     ├─ #paw-foot-l .fz-foot.fz-foot-l       (48×22 rx11)
   │  │     └─ #paw-foot-r .fz-foot.fz-foot-r
   │  ├─ #paw-head        .fz-head                  [P2, translate only]
   │  │  ├─ #paw-ear-l    .fz-ear.fz-ear-l          [P3] (-outer filleted triangle / -inner maroon)
   │  │  ├─ #paw-ear-r    .fz-ear.fz-ear-r          [P4]
   │  │  ├─ #paw-skull                              (head circle r88 @ 160,106)
   │  │  └─ #paw-face     .fz-face
   │  │     ├─ #paw-muzzle · #paw-nose · #paw-blush-l/-r (.fz-blush)
   │  │     ├─ #paw-eyes  .fz-eyes                  [P9 gaze]
   │  │     │  ├─ #paw-eye-open .fz-eye-open        [P10 eye pop]
   │  │     │  │  ├─ #paw-eye-l .fz-eye.fz-eye-l
   │  │     │  │  │  ├─ #paw-eye-l-disc             (cocoa r16)
   │  │     │  │  │  ├─ #paw-pupil-l  .fz-pupil     [P8, clipped]
   │  │     │  │  │  ├─ #paw-lid-up-l .fz-lid-up    [P5, clipped]
   │  │     │  │  │  └─ #paw-lid-low-l .fz-lid-low  [P7, clipped]
   │  │     │  │  └─ #paw-eye-r (mirror of -l)      [P6 = lid-up-r]
   │  │     │  ├─ #paw-eye-happy .fz-eye-happy      (opacity 0, unchanged signature arcs)
   │  │     │  ├─ #paw-eye-love  .fz-eye-love       (opacity 0, unchanged heart eyes)
   │  │     │  └─ #paw-lids .fz-lids                [P20] > #paw-lid-l/-r (.fz-lid/.fz-lid-r, hidden via inline scale(1,0))
   │  │     ├─ #paw-brows .fz-brows                 (opacity 0 at neutral) > #paw-brow-l/-r [P11/P12]
   │  │     ├─ #paw-mouth .fz-mouth                 [P13] > #paw-m-* (10 display-toggled shapes, §4)
   │  │     └─ #paw-sweat .fz-acc.fz-sweat          (opacity 0)
   │  ├─ #paw-arm-l       .fz-arm.fz-arm-l          [P16] > #paw-arm-l-shape (plain yellow capsule — no pads, OWNER revision)
   │  ├─ #paw-arm-r       .fz-arm.fz-arm-r          [P17] > #paw-arm-r-shape (plain yellow capsule — no pads)
   │  └─ #paw-headphones  .fz-acc.fz-headphones     (opacity 0; inside body to follow groove)
   ├─ free accessories (opacity 0, siblings of fz-body):
   │  #paw-notes · #paw-dots · #paw-bulb · #paw-stars · #paw-zzz · #paw-tear · #paw-hearts (.fz-acc.fz-*)
   └─ #fz-outfit          .fz-outfit                (LAST child — EMPTY outfit anchors; §6)
      ├─ #fz-outfit-head  .fz-outfit-head           (hats/flowers)
      └─ #fz-outfit-front .fz-outfit-front          (chest-level items)
```

Z-order (load-bearing): shadow < outfit-back < tail < torso (body < chest < feet) < head (ears < skull < face) < arms < headphones < free accessories < outfit (head/front). Arms after the head so raised gestures read.

`paw-master-head.svg` = the `#paw-head` subtree verbatim (byte-equal geometry, `-head`-suffixed clip ids), cropped to `56 -10 208 216`.

## 4. Animatable nodes — pivots, legal transforms, ranges

**Sign convention (binding, 17 R-3):** every value below is the **literal SVG value as serialized** — clockwise-positive, per element, exactly what goes into `transform="rotate(v cx cy)"`. No semantic/mirrored shorthand anywhere in this table. Body mass (`fz-body`) and whole figure are **never rotated or mirrored**; head leans are translate-only.

| Param | Node (id / class) | Pivot | Legal transform | Range (literal) | Neutral |
|---|---|---|---|---|---|
| P1 breath | `#paw-all` `.fz-all` | — | scale | 1 ↔ (1.015, .985), 2.6 s | 1 |
| P2 head lean | `#paw-head` `.fz-head` | — | **translate only** | tx −6…+6, ty −4…+4 px | 0,0 |
| P3 ear L | `#paw-ear-l` `.fz-ear-l` | (108,52) | rotate | −14…+18° (**− = perk, + = droop-back**) | 0 |
| P4 ear R | `#paw-ear-r` `.fz-ear-r` | (212,52) | rotate | −18…+14° (**+ = perk, − = droop-back**; mirror of P3) | 0 |
| P5 lid-up L | `#paw-lid-up-l` `.fz-lid-up` | — (clipped) | translateY | 0 (open) … +34 (closed) | 0 |
| P6 lid-up R | `#paw-lid-up-r` `.fz-lid-up` | — (clipped) | translateY | 0 … +34 | 0 |
| P7 lid-low pair | `#paw-lid-low-l/-r` `.fz-lid-low` | — (clipped) | translateY | 0 … −14 (smile squint) | 0 |
| P8 pupils | `#paw-pupil-l/-r` `.fz-pupil` | — (clipped) | translate | tx ±6, ty ±5 | 0,0 |
| P9 gaze | `#paw-eyes` `.fz-eyes` | — | translate (existing `--lx/--ly` lookAt) | tx ±7, ty ±5 | 0,0 |
| P10 eye pop | `#paw-eye-open` `.fz-eye-open` | eye centers | scale | 0.95…1.12 | 1 |
| P11 brow L | `#paw-brow-l` `.fz-brow-l` | brow center (125,~67) | translateY + rotate | ty −8…+6; rot −14…+14°; parent `.fz-brows` opacity 0/1 (120 ms fade) | hidden |
| P12 brow R | `#paw-brow-r` `.fz-brow-r` | brow center (195,~67) | translateY + rotate | ty −8…+6; rot −14…+14° | hidden |
| P13 mouth | `#paw-mouth` `.fz-m-*` | — | display toggle | one of 10 shapes (§5) | `fz-m-smile` |
| P14 tail base | `#paw-tail-base` `.fz-tail-base` | (212,244) | rotate | −8…+8° (**+ = up/flick, − = settle low**) | 0 |
| P15 tail tip | `#paw-tail-tip` `.fz-tail-tip` | (296,200) | rotate | −20…+20° (**+ = up/flick, − = settle low**) | 0 |
| P16 arm L | `#paw-arm-l` `.fz-arm-l` | shoulder (115,185) | rotate | **−115…+130°** (**+ = out/up-raise, − = inward-across**) | 0 |
| P17 arm R | `#paw-arm-r` `.fz-arm-r` | shoulder (198,182) | rotate | **−130…+115°** (**− = out/up-raise, + = inward-across**; e.g. thinking chin-reach = literal **+96**, never −95) | 0 |
| ~~P18 pads~~ | **RETIRED** (OWNER revision: glyph is chest-only; no pad nodes exist) | — | — | pose/state recipes referencing `pads on/off` (P18) become no-ops | — |
| P19 chest puff | `#paw-chest` `.fz-chest` | (160,226) | uniform scale | 1…1.06 | 1 |
| P20 blink | `#paw-lids` `.fz-lids` > `.fz-lid` | lid-top (transform-origin 50% 0%) | scale(1, 0→1), 70 ms | binary, existing JS loop | closed to 0 (hidden) |

Reference literal poses (R-3 anchors): wave = armL +105; two-arm cheer = armL +110…+120 / armR −110…−120; point = armR −90; thinking chin-reach = armR **+96**; curious ears = earL −10 / earR +4 (serialized concept-file value, R-3 flag 1).

**Locked, non-animatable inner transform** (change only by revising 15-pawprint-alignment.md / OWNER decision):

| Locked | Node | Value |
|---|---|---|
| F7 emblem instance | `#paw-emblem` | `translate(160,225) scale(1.75) translate(-12.6,-12.45)` |

*(F5/F6 pad-instance transforms retired with the pads — OWNER revision.)*

The emblem group contains **only** the `fz-pawprint` reference. It never rotates (the body never rotates); P19 chest puff multiplies it uniformly — legal. No non-uniform scale, no skew, no per-instance rotation, no mirroring. Mascot instance fill: fixed `#8C2233` (maroon on the cream chest patch).

## 5. Mouth-shape toggle contract (P13)

`#paw-mouth` (`.fz-mouth`) contains the full mouth set as sibling `fz-m-*` nodes. Contract:

1. **Exactly one shape visible at a time**; all others carry `style="display:none"` (production toggles `style.display` — display toggling, never opacity, so hidden shapes cost no paint).
2. **Neutral = `fz-m-smile`** (today's default face).
3. The serialized set (document order): `smile · soft · open · o · sp1 · sp2 · wave · flat · concern · sad`. Note: spec prose says "9 shapes" but the normative Direction C naming spec (§5) and `direction-c.svg` serialize these **10** — smile/open/o/wave/flat/sad (production 6) + soft/concern/sp1/sp2 (Direction C additions). The 10-shape serialized set is what this master carries.
4. **Speaking cycle:** sp1 → sp2 → open → sp1 on syllable-ish beats (~110–160 ms) driven from `FiezelSubtitle` per-sentence timing; rest shape `fz-m-smile`; suppressed on `fiezel-neural-voice-degraded` and under reduced motion. The mouth beat owns P13 until `speak-end`.
5. Mouth geometry is never transformed or morphed — expression comes from shape choice only.
6. State mapping (systems/07/09): smile=neutral/happy · soft=curious/proud/calm · open=excited/encouraging/welcoming/celebrating · o=surprised · sp1/sp2=speaking · wave=confused · flat=thinking/sleepy · concern=gentle-concern · sad=reserved harder read (kept gentler per guide-not-referee).

## 6. Outfit / accessory layer — anchor contract (OWNER-approved, reserved)

The OWNER has approved a future accessory/outfit system (backpack, hat, flower). The master reserves **empty** anchor groups — no outfit artwork ships in this asset; the groups exist so outfit items can be injected without restructuring the rig:

| Anchor | Position in tree | Renders | For | Contract |
|---|---|---|---|---|
| `#fz-outfit-back` `.fz-outfit-back` | **FIRST child of `fz-all`** | behind everything (tail, body) | backpack body/straps, anything behind or around the torso | Backpack z-order requires a behind-body layer, so this anchor sits as first child of `fz-all` rather than inside `fz-outfit` — the alternative sanctioned by the OWNER directive, documented here. Author items in body coords (torso rect 102,164–218,260). The body never rotates/mirrors, so this anchor never receives its own transforms; it inherits P1 breath from `fz-all` for free. |
| `#fz-outfit` `.fz-outfit` | **LAST child of `fz-all`** | above everything | wrapper for the two front anchors | Keep free of direct shapes; put items in the sub-anchors. |
| `#fz-outfit-head` `.fz-outfit-head` | inside `fz-outfit` | above everything | hats, flowers, head-worn items | Author items in head coords (skull circle r88 @ 160,106; ear tips at y≈0). Because it cannot live inside `fz-head` (it must render above the arms), the runtime **must mirror the P2 head-lean translate** (tx −6…+6, ty −4…+4) onto this group whenever it animates `fz-head`, so head-worn items track the head 1:1. Items must not intrude below y≈66 (the brows' travel ceiling) — the face rig stays unobstructed. |
| `#fz-outfit-front` `.fz-outfit-front` | inside `fz-outfit` | above everything | chest-level items (badges, bows, front straps) | Author items in chest coords (patch ellipse 160,226 rx36 ry28). If an item is visually attached to the chest patch, mirror **P19 chest puff** (uniform scale 1…1.06 @ 160,226) onto it. Items must never cover the chest emblem — it is an identity lock. |

General rules: outfit items obey the closed palette and circle/capsule/triangle grammar; transform/opacity animation only; the anchors stay empty in the master and in all exports until the outfit system ships; any ids introduced by outfit items must be per-instance-uid'd (`[P0-1]`).

## 7. Verification performed

- XML well-formed (both files); all ids unique (78 / 47).
- Pawprint checksum recomputed from the def: matches `e52cf230…f86d22` (§2).
- Gate greps green: no legacy approximation signatures (`rx="10" ry="8"`, `rx="9" ry="7"`, r4/r3.6 circle triples), no `#2B2118`, closed palette only, zero gradient elements, **exactly one** glyph instance (`#paw-emblem`, canonical transform, s = 1.75), **zero** `fz-pads` nodes (OWNER revision), no `rotate(` inside the emblem group, feet 48×22 rx11 ×2, all rig groups transform-free at neutral (except the documented lid-hide and the locked emblem transform), outfit anchors present and empty (`fz-outfit-back` first child / `fz-outfit` last child of `fz-all`).
- Visual: 512/148/88/42/28 px full-body + 512/88 px head renders inspected, re-rendered after the OWNER revision (neutral pixels unchanged — the retired pads were opacity-0 at neutral); side-by-side vs `audit/renders/full.png` — same cat, differences are exactly the adopted spec deltas (true pawprint emblem, pill feet, no left-arm stain, r16 eyes).
