# Proof sheet v2 (14/14) — subagent completion notes

Date: 2026-08-27 · Scope: /home/user/workspace/pau-redesign/systems/ only (repo checkout untouched).

## Deliverables
- `systems/expressions-sheet-14.svg` + `.png` — all 14 expressions, title "PAW — Expression System · 14 of 14", 2×7 grid, cream bg, closed palette, canonical head crop viewBox `56 −10 208 216`.
- `systems/smallsize-test-v2.png` — 42px/28px degradation strip for the 6 previously untested expressions (Neutral, Excited, Confused, Encouraging, Proud, Welcoming), raw tuples with arm/tail params filtered per 07 §5, nearest-neighbor 4× upscale.
- `systems/build_sheet.py` — extended generator (now emits both artifacts; renders PNGs via cairosvg).
- `systems/07-expressions.md` — "## Proof sheet v2 (14/14)" section appended at end; body untouched (ruling-edit subagent owns it).

## R-3 verification & corrections
- Confirmed `build_sheet.py` is R-3's correct ear-sign witness: right ear serialized `rotate(−semantic)`. `gen_poses_sheet.py`'s earR negation (R-3 item 17) is left to the manifest-applier.
- Thinking armR −95 → literal **+96** (R-3 item 2); rendered in-crop, paw lands at chin — visually confirms the ruling.
- Curious/Welcoming earR: serialized **literal +4** (perk) per R-3 flag 1, i.e. semantic −4, not 07's printed +4.
- Arms rendered as literal degrees only where pads-on gestures enter the crop (Thinking +96, Encouraging −90, Celebrating ±115, Welcoming +105); Excited ±60 sits below the frame → omitted. 4%-black arm stain removed (08 §0.2 cleanup).
- Minor fix: eye pop scales about face center (160,98) per 07 §1.1 (v1 scaled per-eye).

## Visual QA (iterated)
- v1 render: Excited/Encouraging/Celebrating/Welcoming were near-identical (identity lives in arm channels) → added in-crop arm gestures → all 14 now distinct at a glance.
- Excited's clipped arms looked cut → removed (below-frame policy) → clean.
- Same-character test passes; none infantile or angry; Proud vs Calm separate via ear perk/droop + lids.
- R-5: statics only — sheet doubles as the reduced-motion evidence set.

## Small-size survival (new 6)
- 42px: Neutral ✔, Excited ✔, Confused ✔ (sweat+wave+asym ears), Encouraging ~ (merges with Excited without arm), Proud ✘ (reads content), Welcoming ~ (asymmetry marginal).
- 28px: Neutral ✔, Excited ✔ (excited-class), Confused ✘ (confirms §5 ban), Encouraging ✘, Proud ✘, Welcoming ~.
- All consistent with 07 §5's quantized sets — no rule changes needed.

## OWNER revision applied (2026-08-27, 23:55)
- Directive: fiezel-paw glyph ONLY on the chest emblem, NEVER on hand/paw pads.
- `build_sheet.py`: pad-glyph (PAWPRINT) rendering removed; all in-crop arms are plain yellow capsules.
- `expressions-sheet-14.svg/.png` regenerated and visually re-verified: zero pad glyphs (SVG grep confirms only ear-inner/nose maroon fills); Encouraging / Celebrating / Welcoming still mutually distinct via arm silhouettes; Thinking reads via face channels as in v1.
- `smallsize-test-v2.png` regenerated (content unchanged — arms already filtered at small sizes).
- `07-expressions.md` "## Proof sheet v2 (14/14)" section updated with the OWNER revision note; no other edits to 07's body.
