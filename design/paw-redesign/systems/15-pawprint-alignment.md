# 15 — Pawprint Alignment (pads + chest emblem = fiezel-paw.svg instances)

> **⚠ SUPERSEDED IN PART — OWNER AMENDMENT OA-1 (2026-08-27, later the same day; recorded in `FIEZEL-PAW-REDESIGN-SPECIFICATION.md` v1.1 §OWNER AMENDMENTS):** the `fiezel-paw.svg` glyph instance is **CHEST-ONLY**. Every hand-pad rule in this document is **retired**: §1's "every visible palm pad", the §2 pads-L/R instance rows and their literal transforms, the §4 hand-pad column and pad drop rules, the §5 pad appearances per pose/expression, the §6 P18 geometry note and the F5/F6 locked pad-instance transforms, and the §8 pad-group gate checks. Arms are plain yellow capsules with **no pad markings of any kind**; P18 becomes a no-op (pose/state `pads on/off` flags render nothing). **Everything chest-emblem remains binding as written:** F7 (s=1.75, anchor (160,225), fill `#8C2233`), the §2 canonical transform, the §4 emblem subset-degradation ladder, and the §8 four-way geometry checksum `e52cf2302bdae8b790e633c8cf549228002b8214a081142b08f3f5bf0df86d22` (now also matched by `assets/paw-master.svg` — a five-way gate). One addition per 19 §9-8: outfit items must respect the chest-emblem keep-out (19 §4.3-2). Applied in `assets/paw-master.svg` (see `assets/README.md`) and `systems/poses-sheet-16.svg/.png` (08 appendix, 0 pad instances). The body below is kept unedited as history.

Wave 3 spec delta · 2026-08-27 · OWNER directive (incl. scope extension: chest emblem).
Binding base: `assets/brand/fiezel-paw.svg` (repo, read-only), `directions/direction-c.svg`,
`systems/08-poses.md`, `systems/07-expressions.md`, `audit/02-brand-system.md` §5.
**No repo files were modified.**

---

## 1. Binding rule (normative)

> **Every visible palm pad on PAW's paws AND PAW's chest emblem is an exact,
> uniformly scaled INSTANCE of the `assets/brand/fiezel-paw.svg` geometry —
> the same coordinates, scaled uniformly, translated, and rotated only by
> inheritance from a limb's own pivot. Never a hand-drawn approximation of dots.**

- **Source of truth:** `assets/brand/fiezel-paw.svg` (viewBox `0 0 24 24`), whose header
  declares it the single shape source together with `ICONS.paw` in
  `features/ui/fiezel-icons.js`, guarded by `tests/paw-mascot-test.js`. Verified: the five
  shape elements in `ICONS.paw` (`fz-paw-bar` ×4 + `fz-paw-pad`) carry **byte-identical
  coordinates** to the SVG. The mascot now joins that single source.
- **Glyph geometry** (the only legal coordinates):
  - toe capsules (`rx=1.55`, full capsules since rx = width/2):
    `(4.6, 7.5, 3.1×4.6)` · `(8.9, 5.1, 3.1×7)` · `(13.2, 3.4, 3.1×8.7)` · `(17.5, 6.2, 3.1×5.9)`
  - palm blob: `M12.6 14c3.5 0 5.9 1.9 5.9 4.1 0 2-2 3.4-5.9 3.4s-5.9-1.4-5.9-3.4c0-2.2 2.4-4.1 5.9-4.1Z`
  - **ink bbox** x `4.6…20.6`, y `3.4…21.5` → **16.0 × 18.1** glyph units;
    **ink center `(12.6, 12.45)`** (all instance transforms anchor here).
- **Allowed transforms per instance:** one uniform `scale(s)` + one `translate` (via the
  canonical form in §2). Rotation only by riding inside a limb group that rotates about
  its own pivot (arms P16/P17, tail bones — pads never attach to the tail). No
  non-uniform scale, no skew, no per-instance free rotation, no mirroring.
- **Color:** the mascot instance is **fixed maroon `#8C2233`** on yellow `#FFD94F` /
  cream `#FFF4DA` — matching the chest emblem convention and audit 02 §5.1
  ("maroon for ears/nose/paw emblem/tail ring"). `fiezel-paw.svg`'s own fill `#2B2118`
  is **not** in the mascot's closed palette and is never used on PAW.
  **Flag (fine, by design):** in-app `ICONS.paw` deliberately bakes no fill and themes
  via `--fz-i-line`; the standalone brand file uses `#2B2118`. Both are sanctioned in
  their contexts. The rule here binds **geometry**, not fill; the **mascot** instance's
  fill is fixed maroon.
- Geometry-grammar compliance: 4 capsules + 1 rounded blob — inside the
  circle/capsule/triangle grammar (audit 02 §5.3).

## 2. Exact transform math (24×24 glyph → 320×300 rig space)

Canonical instance transform (as serialized in `direction-c.svg` and emitted by
`gen_poses_sheet.py`):

```
transform = translate(Cx, Cy) scale(s) translate(-12.6, -12.45)
```

A glyph point `(u, v)` maps to rig space as:

```
x = Cx + s·(u − 12.6)        y = Cy + s·(v − 12.45)
```

so the glyph's **ink center** lands exactly on `(Cx, Cy)` and the rendered ink box is
`16.0·s × 18.1·s` rig px, centered on `(Cx, Cy)`.

Normative instances (320×300 rig space):

| Instance | Anchor `(Cx,Cy)` | `s` | Rendered ink (rig px) | Ink extents | Rotation |
|---|---|---|---|---|---|
| Chest emblem (`fz-chest` → `fz-emblem`) | `(160, 225)` | **1.75** | 28.0 × 31.7 | x 146–174, y 209.2–240.8 (inside cream patch 124–196 × 198–254) | none, ever (body never rotates); P19 chest puff (×1…1.06) multiplies uniformly — legal |
| Left palm pads (`fz-pads-l`) | `(115, 233)` arm-local | **1.35** | 21.6 × 24.4 | pad tip at arm capsule end (arm ellipse c(115,211) r14×30) | inherited from `fz-arm-l` pivot `(115,185)` only |
| Right palm pads (`fz-pads-r`) | `(198, 228)` arm-local | **1.35** | 21.6 × 24.4 | ditto for arm c(198,206) | inherited from `fz-arm-r` pivot `(198,182)` only |

Resulting literal transforms:
- chest: `translate(160,225) scale(1.75) translate(-12.6,-12.45)` ≡ `matrix(1.75,0,0,1.75,137.95,203.2125)`
- pads L: `translate(115,233) scale(1.35) translate(-12.6,-12.45)` ≡ `matrix(1.35,0,0,1.35,97.99,216.1925)`
- pads R: `translate(198,228) scale(1.35) translate(-12.6,-12.45)` ≡ `matrix(1.35,0,0,1.35,180.99,211.1925)`

`s` values are **fixed constants**, chosen to preserve the visual weight of the old
clusters: the old chest cluster's ink width was 28 rig px → `s = 28/16 = 1.75` exactly;
the old pad cluster ≈21.4 wide → `s = 1.35` (21.6). Toes point along local −y ("up" in
arm-local space, i.e. toward the paw tip when the arm is raised) — the same orientation
convention the old dot clusters used.

### Implementation form

`direction-c.svg` now carries the geometry once in `<defs>` as **`<g id="fz-pawprint"
fill="#8C2233">`** and instantiates it three times via `<use href="#fz-pawprint">`
(pads L/R inside the arm groups; emblem inside `fz-chest`). At implementation time in
`features/mascot/fiezel-mascot.js`, the id must be per-instance-uid'd
(`fz-pawprint-<uid>`) per the existing `[P0-1]` clip/mask id rule.

## 3. Delta vs the canonical rig (documented, per OWNER request)

Compared `features/mascot/fiezel-mascot.js` (chest emblem, "dada + emblem paw" block)
against `fiezel-paw.svg`: **they do NOT match.** The rig's emblem is a hand-drawn
approximation — `translate(160,224)` with `ellipse (0,5) rx10 ry8` + **three** circles
r4 at `(−10,−7) (0,−10) (10,−7)` — i.e. 3 toes vs the glyph's **4 staggered capsule
toes**, circles vs capsules, and a symmetric ellipse vs the glyph's asymmetric palm
blob. `direction-c.svg` had inherited that approximation for both the emblem and the
pad clusters (`ellipse rx9 ry7` + 3× r3.6 circles at scale .85). All of these are now
replaced by true instances (§2). Strictly read, the old emblem under-delivered checklist
A2's "visual rhyme with `fiezel-paw.svg` stamp intact" — this spec closes that gap.
New ink box (146–174 × 209–241) keeps the old 28 px width exactly and extends ~4 rig px
lower; still comfortably inside the cream patch, clear of the muzzle and feet.

## 4. Scale sizes & small-size degradation (320-rig rendered at D display px)

Rendered ink width of an instance = `16·s·(D/320)`.

| Full-body render D | Hand pads (s=1.35) | Chest emblem (s=1.75) |
|---|---|---|
| ≥ 88 px (Medium/dock and up) | **full glyph** (≥ 5.9 px) | **full glyph** (≥ 7.7 px) |
| 74–88 px | full glyph (5.0–5.9 px) | full glyph |
| 57–74 px | **pads dropped** (P18 → 0) | full glyph (5.0–6.5 px) |
| 34–57 px | dropped | **palm-only subset**: render only the palm path of the glyph (same coordinates, toes omitted) |
| < 34 px | dropped | **emblem dropped** |

Rules:
- **Pads are binary** — full glyph or opacity 0 (the existing P18 contract). They are
  never simplified or redrawn. Threshold: rendered ink width < 5 px → drop
  (`D < 74` px for s=1.35).
- **Chest emblem degrades by subset, never by redraw**: full glyph ≥ 5 px ink width
  (`D ≥ 57`); palm path alone at 3–5 px (`34 ≤ D < 57`) — a strict subset of the master
  coordinates, sanctioned by the existing small-size simplification allowance
  (audit 02 §5.6 size ladder); dropped < 3 px. **The master geometry is always the
  glyph**; the subset is a rendering fallback, not a second shape source.
- Tiny/Small tiers (22–58 px) use the head crop, which contains neither chest nor pads —
  unchanged from 08-poses §0.4; the table above only matters for rare sub-88 px
  full-body uses (thumbnails, marketing grids).

## 5. Affected poses / expressions / states

- **08-poses:** pads appear in 1.2 waving (padsL), 1.5 thinking (padsR at chin),
  1.10 encouraging (padsR), 1.11 celebrating (both), 1.12 jumping (both) — all now
  render the glyph instance. 1.3 pointing stays pads-OFF (back of paw). The **chest
  emblem instance appears in all 16 poses** (it is part of the never-rotated body mass).
- **07-expressions:** expressions 5 thinking, 7 encouraging, 10 celebrating,
  13 welcoming reference pads — same substitution; `E` tuple syntax unchanged
  (pads remain the on/off flag).
- **Production states (08-poses §2.2 mapping):** greeting, thinking, encouraging,
  celebrating, completion, hinting-adjacent coach beats.
- Proof assets regenerated from the new geometry: `directions/direction-c.svg/.png`,
  `systems/poses-sheet.svg/.png` (via `systems/gen_poses_sheet.py`). Verified visually:
  pads and emblem read as the FIEZEL paw glyph; everything else unchanged.

## 6. Updated F-param notes for 08-poses (§0.2 additive amendment)

| Param | Target | Transform | Range / value |
|---|---|---|---|
| P18 pads (amended) | `fz-pads-l/-r` | opacity | 0/1 as before; **geometry inside the group is the `fz-pawprint` instance at s=1.35 — not overridable per pose** |
| **F5/F6 pad instance scale L/R (new, locked)** | `fz-pads-l/-r` inner transform | uniform scale | **fixed 1.35**; not animatable; changes only by revising this spec |
| **F7 emblem instance scale (new, locked)** | `fz-emblem` | uniform scale | **fixed 1.75** (×P19 chest puff 1…1.06 uniformly) |

The `pads` shorthand in 08-poses §0.2 and every pose recipe keep their meaning; only the
group's inner geometry changed. No pose parameter values change.

## 7. Chest emblem relationship

The chest emblem is the identity bridge between mascot and brand mark (checklist A2).
With this spec the relationship is upgraded from "visual rhyme" to **literal identity**:
emblem, palm pads, `fiezel-paw.svg`, and `ICONS.paw` are now four instances of ONE
coordinate set. The emblem stays maroon-on-cream inside `fz-chest` (so P19 proud puff
scales it uniformly with the patch); the pads are maroon-on-yellow at the paw tips.
Pads (s=1.35) are deliberately smaller than the emblem (s=1.75): the emblem is the
primary stamp, the pads its echo on gesture.

## 8. QA additions (pad/emblem geometry checksum)

Add to the pose-consistency gate (08-poses D3 / audit 01 §5 ADD):

1. **Canonical geometry string** (normalize: rects as `x,y,w,h,rx` in document order,
   then path `d` verbatim, `|`-joined, prefix per element type):

   ```
   rect:4.6,7.5,3.1,4.6,1.55|rect:8.9,5.1,3.1,7,1.55|rect:13.2,3.4,3.1,8.7,1.55|rect:17.5,6.2,3.1,5.9,1.55|path:M12.6 14c3.5 0 5.9 1.9 5.9 4.1 0 2-2 3.4-5.9 3.4s-5.9-1.4-5.9-3.4c0-2.2 2.4-4.1 5.9-4.1Z
   ```

   **SHA-256 = `e52cf2302bdae8b790e633c8cf549228002b8214a081142b08f3f5bf0df86d22`**

2. **Gate checks (fail = asset invalid, regenerate from source):**
   - extract the five shapes from `assets/brand/fiezel-paw.svg`, from `ICONS.paw`, from
     `direction-c.svg`'s `#fz-pawprint` def, and from `gen_poses_sheet.PAWPRINT`;
     normalize as above; all four hashes must equal the checksum. (This extends the
     existing `tests/paw-mascot-test.js` two-way gate to a four-way gate; the repo test itself
     is updated at implementation time, not in this cycle.)
   - every `fz-pads-*` / `fz-emblem` group must contain ONLY a `fz-pawprint` reference
     (or the verbatim inlined geometry in generated exports) — grep-reject the legacy
     approximation signatures (`rx="10" ry="8"`, `rx="9" ry="7"`, `r="4"`/`r="3.6"`
     maroon circle triples).
   - instance transforms must parse to exactly `translate(Cx,Cy) scale(s) translate(-12.6,-12.45)`
     with a single scale value (uniform) and `s ∈ {1.35, 1.75}`; no `rotate(` inside
     pad/emblem groups (rotation only on ancestor limb groups at their documented pivots).
   - fill of the mascot instance resolves to `#8C2233`; `#2B2118` must not appear in any
     mascot asset.
   - small-size exports: any full-body export < 74 px must have pads at opacity 0; any
     < 57 px must use the palm-only emblem subset (§4).

## 9. Files changed in this delta

- `directions/direction-c.svg` — `fz-pawprint` def + 3 `<use>` instances (pads L/R,
  chest emblem); everything else byte-identical. Re-rendered `direction-c.png`.
- `systems/gen_poses_sheet.py` — `PAWPRINT` constant + `pawprint()` instance emitter;
  `pads()` and chest emblem now emit the glyph instance. Regenerated
  `systems/poses-sheet.svg` / `.png` (all 8 poses verified).
- `systems/15-pawprint-alignment.md` — this spec.
- Repo checkout untouched (read-only inputs: `assets/brand/fiezel-paw.svg`,
  `features/ui/fiezel-icons.js`, `features/mascot/fiezel-mascot.js`).
