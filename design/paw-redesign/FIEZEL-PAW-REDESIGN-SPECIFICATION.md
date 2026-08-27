# FIEZEL PAW REDESIGN SPECIFICATION

**Version 1.1 · Compiled 2026-08-27 (v1.0), updated 2026-08-27 (v1.1) · Single handoff document for implementers**

Compiled per master prompt §37 (`/home/user/workspace/fiezel-pau-mascot-redesign/references/master-prompt.md`) from the Wave 1–3 documents under `pau-redesign/`. **v1.1 integrates everything produced after v1.0 on the same day:** the three OWNER amendments (block below), the binding open-issue rulings `systems/17-open-issue-rulings.md` as applied by `systems/18-naming-and-rulings-log.md`, the pawprint alignment `systems/15` (as amended), the Duolingo benchmark `systems/16`, the outfit system `systems/19`, the built master asset `assets/paw-master.svg` (`assets/README.md`), proof sheets v2 (14/14 expressions, 16/16 poses), the splash/onboarding storyboards, and the engineering plan + QA harness under `implementation/`. Each section is an authoritative summary; the pointer line names the detailed source (relative to `pau-redesign/`). Where sources disagree, the disagreement is **not** silently resolved here — see **Appendix A: Open Issues & Reconciliations** (all A-2…A-8 now RESOLVED) and **Appendix B: v1.0→v1.1 change log & current open list**, both binding reading before implementation.

**Naming.** The character is officially **PAW** ("PAW si Kucing Geometris", repo `assets/brand/BRAND-GUIDE.md` §1). Earlier drafts of this redesign project called it **"Pau"** — a project-era misnomer, corrected to PAW throughout the document set on 2026-08-27 (naming sweep + rulings application, `systems/18-naming-and-rulings-log.md`); it is the same character throughout the project’s history. The 24×24 paw-print glyph `fiezel-paw.svg` is a *brand stamp*, not the mascot.

---

## OWNER AMENDMENTS (2026-08-27) — binding, same authority as m025-128

Three OWNER decisions were issued after v1.0 compiled (OA-1…OA-3); three further splash rulings followed on 2026-08-28 (OA-4, then OA-5, then OA-6 — all the same day), then a seventh the same day (OA-7 — total SFX redesign), then an eighth and ninth the same day (OA-8 — raw PAW textures; OA-9 — paw_greet = the FIEZEL signature sound, stamp_thud retired). They override any contrary sentence elsewhere in this document set; contrary sentences are annotated in place, never deleted (history preserved).

| # | Amendment | Effect |
|---|---|---|
| **OA-1** | **Pawprint glyph is CHEST-ONLY.** The chest emblem — and any pawprint mark on the mascot, ever — is an **exact `fiezel-paw.svg` glyph instance** (uniform s=1.75, anchor (160,225), fill `#8C2233`, locked transform `translate(160,225) scale(1.75) translate(-12.6,-12.45)`). **Hand pads are retired**: arms are plain yellow capsules with no pad markings of any kind; rig param P18 and the F5/F6 locked pad-instance transforms retire with them (pose/state `pads on/off` flags become no-ops, kept only for tuple traceability). | Supersedes `systems/15-pawprint-alignment.md`'s hand-pad rules — a supersession note now sits at the top of 15 (its chest-emblem rules, subset-degradation ladder, and §8 checksum gate remain binding). Constraint **G13** added below. Applied in `assets/paw-master.svg` (0 pad nodes, 1 emblem instance) and `systems/poses-sheet-16.*` (0 pad instances × 16 poses). Pad wordings in §8/§9/§16/§20/§24/§26/§30 amended in place. |
| **OA-2** | **Outfit system APPROVED** ("PAW as shipped is too plain"; OWNER-named examples: ransel/backpack, topi/hat, bunga/flower, "and so on"). Blanket constraint G5 is **replaced by G5′**: a closed, versioned, OWNER-gated **outfit registry** (8 starter items OF-01…OF-08, `systems/19-outfit-system.md` §5), selected by a deterministic context function — never random, never user-equipped, never bought/earned/monetized (G7 intact); the emotive `fz-acc` set is untouched; max 1 item worn (hard max 2 as sanctioned Large/Full combos); "and so on" is licensed only through new OWNER-approved registry rows. Attachment = 3 new empty anchor groups `fz-outfit-back/-head/-front` (already reserved in `paw-master.svg`). | G5 row replaced by G5′ below; new outfit subsection in §8; asset rows in §33. **OWNER-PENDING inside 19 §3.2:** proposed accessory-only token `--fz-leaf` (hijau daun) `#8A9A5B` for the OF-03 flower stem — never rendered before sign-off; fallback = gold `#D8B36B` stem. |
| **OA-3** | **Official naming: PAW** (never "Pau"). | Applied project-wide 2026-08-27: 280 word replacements, master-spec file renamed to `FIEZEL-PAW-REDESIGN-SPECIFICATION.md`, `fz-pau-*` → `fz-paw-*` identifier renames — full log + sanctioned historical exceptions in `systems/18-naming-and-rulings-log.md` §2–§3. |
| **OA-4** | **Splash ruling (2026-08-28): "PAW lights the logo" + splash-lite REJECTED; m025-80 (no mascot on splash) stands PERMANENTLY; the "PAW STAMP" splash is APPROVED and binding** — F logo + gold bars first, wordmark small at the bottom (`min(30vw,132px)`, was `min(52vw,238px)`), closer = the real `fiezel-paw.svg` glyph slam-to-stamp; ≤2000ms; animation quality bar maximum. | §19 rewritten to the binding design; normative spec 11 §1S (former §1.2/§1.6 struck, kept as history); splash config flag E7 retired; storyboards v1 splash sheets superseded by `systems/storyboard-splash-v2.svg/.png`; SB-1…SB-5/SB-7 MOOT, C-1 CLOSED (Appendix B); the PAW Spark's splash instance is retired from the §30 allowlist. *(Same-day supersession: see OA-5.)* |
| **OA-5** | **Splash ruling v3 (2026-08-28, same day, supersedes OA-4's design — "PARTICLE FORMATION + PAW STAMP ON MULAI"):** (1) the **gold sheen/halo/glow after the F and bars is DELETED** entirely ("bayangan emas" — `fz-logo-sheen`, halo flare, hero glow: gone, no replacement); (2) the F + two gold bars **form via a futuristic particle point-cloud** — F completes first while the bars are still particles; the instant the bars solidify they hand off to a dedicated **equalizer animation** synced to the existing motif; (3) the paw **slam-to-stamp no longer auto-plays** — it fires on the user's **Mulai** press on the welcome card and transitions directly into onboarding (same slam + SFX identity, ≤1400ms press→onboarding); (4) wordmark stays **small at the bottom** per v2. Quality bar: first impression — 60fps, transform/opacity/canvas only, one clock. | §19 rewritten to v3; normative spec **11 §1S-v3** (former §1S kept as history); module contract `splash-prototype/CONTRACT.md`; storyboard v2 superseded by `systems/storyboard-splash-v3.svg/.png` (+ `gen_storyboard_splash_v3.py`); the fixed close-timer/`VISIBLE_MS` model is retired (splash rests on the welcome card); Appendix B updated. *(Same-day supersession of the Mulai gating: see OA-6.)* |
| **OA-6** | **Splash ruling v4 (2026-08-28, same day, supersedes OA-5's Mulai gating — "AUTO-FLOW: REMOVE MULAI"):** the **Mulai button and welcome card are REMOVED ENTIRELY** — the splash flows automatically into onboarding. Unchanged: particle F formation, bars equalizer, small bottom wordmark, slam/stamp grammar + SFX identity, no-sheen rule, m025-80. New: after the equalizer settle (done 2140ms) the **PAW slam-to-stamp plays AUTOMATICALLY at 2200ms** (≤120ms gap, no dead beat) as the closing transition — `onboarding-enter` ~3030ms, motion ends and onboarding legible **≤3600ms from t0**. No stop, no button, no user gesture; tap/Enter = skip forward (pre-settle → settle; settle window → stamp start; during stamp → instant completion). Reduced motion: static composition → auto reduced stamp → onboarding ≈800ms. | §19 rewritten to v4 (§19.2 keeps the v3 design as history); normative spec **11 §1S-v4** (11 §1S-v3's Mulai clauses marked superseded, gate V3-G3 replaced by V4-G1…G5); module contract `splash-prototype/CONTRACT.md` v4 banner; `js/pawstamp.js` gains `skip()`, `arm(null)` becomes the standard path; storyboard v3 frames F6–F7 marked superseded; Appendix B updated. |
| **OA-7** | **Total SFX redesign (2026-08-28, OWNER brief `FIEZEL-SFX-Brief-2.pdf`):** a full produced SFX library replaces runtime-synthesized sound design — brand audio identity (playful-premium mallet+synth-bell, major key, layered shimmer), ONE locked signature motif ("Ascent & Crown" F4→A4→C5→G5, `sfx/lib/MOTIF.md`), 26 brief-named sounds + `stamp_thud` produced as WAV masters + web OGG (`sfx/masters/`, `sfx/web/`), PAW sounds via the §G cat-texture morphing pipeline (procedurally synthesized textures — honesty note in 20 §5), loudness bands enforced by independent audit (27/27 PASS). | **Supersedes the motif-quotation character-SFX design** in §29 / `systems/14-voice-sfx.md` §3 (supersession notes added in place, history kept; 14 §3.1's engine/mute/rationing rules and 14 §5 accessibility survive). New binding spec **`systems/20-sfx-system.md`** (identity, motif, catalog, event mapping incl. retired sounds, morphing documentation, loudness/format standards, implementation plan, QA gates); §29 rewritten to point there; 27 asset rows added to §33; splash SFX identity (OA-4…OA-6 "slam + SFX identity") now concretely = `splash_intro` + `stamp_thud`. Open items 20 §9 (MP3 fallback, human blind test, x30 sign-off, Spark re-sync, audition page). *(Same-day supersession of the PAW morphing: see OA-8.)* |
| **OA-8** | **PAW raw-texture ruling (2026-08-28, same day, supersedes OA-7's §G deep-morph for the 4 PAW SFX):** the OWNER prefers the **RAW cat textures, lightly polished** ("pakai yang mentah aja, tapi polish sedikit aja") — chirp/trill/purr/meow character stays clearly audible and charming; polish limited to gentle EQ, soft fades, a hint of shimmer/reverb tail, loudness normalization; **NO** spectral morphing / formant shifting / 1-3 kHz carve / instrument dominance. The textures are also the OWNER's **permanent raw material for promo content**. | `sfx/masters/` + `sfx/web/` paw files overwritten with raw-polished renders (greet 0.88s two-chirp F4→A4, appear 0.68s trill = splash_paw_appear, encourage 1.48s purr, celebrate 1.78s meow + light shimmer accent; metrics in `sfx/reports/paw.md` v3); morphed v2 renders archived `sfx/qa/paw/morphed-v1/` (history, `--mode morph-history` re-renders); new promo library **`sfx/textures/`** (raw + polished + OGG + Indonesian README with provenance/determinism); 20 §1/§3/§5 amended in place (§G morph docs kept as history); §G.7 blind test MOOT (20 OI-2 → character audition `sfx/qa/paw_final_audition.wav`); QA tuple refresh tracked as 20 OI-6. |
| **OA-9** | **FIEZEL signature sound + stamp retirement (2026-08-28, same day):** **`paw_greet` is declared THE signature sound of FIEZEL ("suara khas FIEZEL")** — the most important sound in the app, crafted with extra care (raw double chirp F4→A4 = motif notes 1-2, premium shimmer sheen 0.04, snappy −54 dB tail trim); and **`stamp_thud` is RETIRED** — the splash stamp moment now plays `paw_greet`. | 20 §1 signature bullet + catalog row 17 + event-mapping SLAM row updated; `sfx/masters/stamp_thud.wav` archived → `sfx/qa/retired/` (`web/stamp_thud.ogg` kept in place for compatibility only, marked RETIRED, no active trigger); `splash-prototype/js/sfx.js` `MANIFEST.thud` remapped `stamp_thud.ogg` → `paw_greet.ogg` (API name `'thud'` kept — `pawstamp.js` untouched); OA-4…OA-6's splash "slam + SFX identity" now concretely = `splash_intro` + **`paw_greet`**; Spark re-sync note 20 OI-4 updated to the 0.88s two-chirp profile. |

**Global hard constraints (inherited by every section below):**

| # | Constraint | Source of authority |
|---|---|---|
| G1 | Closed palette: `#FFD94F #EDB93A #FFF4DA #8C2233 #33201F #F0A0AC #D8B36B #D9536A` + sanctioned `#9CC7E8` (sweat/tear), `#fff` highlights, `#000` @ .08/.04. Nothing else, ever. | audit/02 §5.1; audit/01 §5 |
| G2 | Circles/capsules/triangles only; flat fills; no outlines, gradients, textures. | audit/02 §5.3–5.4 |
| G3 | Transform/opacity-only animation (sole repo exception: `stroke-dashoffset`). | audit/02 §5.8 |
| G4 | **Rotation-free body**: `rotate()` only on limbs/ears/tail-bones/brows/detached accessories around documented pivots; never on `fz-all`/`fz-body`/`fz-head`/`fz-face`/`fz-eyes`. No mirroring anywhere. Stricter than current production CSS. | directions/selected-direction.md; systems/10 §0 |
| G5′ | *(replaces G5 per OA-2)* PAW may wear items **only from the curated OUTFIT REGISTRY** (19 §5: OF-01…OF-08) — closed + versioned, OWNER-gated, deterministic context selection (never random/user-driven), never a reward economy; the emotive `fz-acc` set (headphones, notes, dots, bulb, stars, zzz, tear, hearts, sweat) is untouched and separate; max 1 item, hard max 2 (sanctioned Large/Full combos only); all other constraints (G1/G2/G4/G6/G9, keep-out zones, chest-only glyph) bind every item. Historical G5 ("no new accessories… no hats") stands only for its authorship date. | systems/19 §1.2 (OWNER amendment record); audit/02 §5.5 (superseded in part) |
| G6 | Tail = capsule stroke ending in the maroon ring r=15; the ring **and its mask live inside `fz-tail-tip`** and follow every tail move. An export without the ring is invalid. | systems/08 §3 D1; systems/13 §3.1 |
| G7 | No game-mechanics changes: no reward/XP/streak/progression rule may change; the character only *reacts* to events the game already emits. | master prompt §4; systems/09 §0 |
| G8 | The FIEZEL neural voice system (`FiezelVoiceSay` 5-layer ladder) is **never replaced** — integrate at existing seams only. | systems/14 §0 |
| G9 | Reduced motion (3 layers: OS `prefers-reduced-motion`; app `body.reduce-motion` + wrapper early-return; context freeze classes) fully covered; every state/pose/reaction must read as a static frame. | audit/03 B.6; systems/07 §4, 09 §4.6, 10 §5.5, 13 §6 |
| G10 | Zero CLS: character slots reserve their box at render; presence decided before paint; enter/exit stay inside the box via transform/opacity. | systems/12 §2c C3 |
| G11 | One canonical rig source: the inline SVG in `features/mascot/fiezel-mascot.js`. All static SVGs, pose files, and the `website/assets/mascot/` copy are **generated exports**, never hand-edited forks (E5 rule). | directions/selected-direction.md; audit/01 §2c |
| G12 | All mascot traffic through `FiezelPaw` / the `pawReact`/`pawSetState`/`pawFaceMarkup` wrappers; `fz-*` class contract preserved; additions are additive only. | audit/03 §B; systems/09 §1.1 |
| G13 | *(new, OA-1)* The pawprint glyph on the mascot = **exactly ONE exact `fiezel-paw.svg` instance: the chest emblem** (`fz-emblem`, s=1.75, fill `#8C2233`, locked transform; P19 chest puff multiplies it uniformly — legal; it never rotates). Hand pads retired; no other glyph instance may exist on the character. Geometry checksum SHA-256 `e52cf2302bdae8b790e633c8cf549228002b8214a081142b08f3f5bf0df86d22` must match across `fiezel-paw.svg`, `ICONS.paw`, `direction-c.svg`, `gen_poses_sheet.PAWPRINT`, and `paw-master.svg`; `#2B2118` never appears on the mascot; emblem degrades by palm-only subset (<57px) and drops (<34px), never by redraw. | systems/15 §2/§4/§8 (as amended by OA-1); assets/README.md §2 |
| G14 | *(new)* Duolingo is **reference-only**: technique-level principles (16 §2 P1–P12) may be adopted; every asset-level element is on the binding blocklist (16 §3.1: no owl/wings/beak, no `#58CC02`/`#89E219` or ±20° high-sat hues, no Duo poses/gags/transformations, no guilt mechanics, no copied animations/sounds/UI compositions, no side-cast ensemble, no Rive-asset reuse — plus 19 §8's outfit-catalogue additions). Every new PAW asset/animation/sound must pass the 16 §5 **same-test rubric** (10 tests; any single ✗ fails QA). | systems/16 §3/§5 (binding); master prompt §35/§43 |

---

## 1. Existing PAW Audit

The production PAW is an OWNER-approved (m025-128) **geometric yellow cat**: head circle r=88 at (160,106) ≈ 60% of total height, triangular ears with maroon inners, single-mass capsule body 116×96 rx=42, cream muzzle + chest patch, maroon triangle nose, blush r=11, maroon chest **paw emblem** (visual rhyme with the `fiezel-paw.svg` brand stamp), and a 25px capsule tail ending in a maroon ring r=15. Rendering is pure flat vector — no outlines, no gradients — so the asset survives 22px→512px. The **geometry source of truth is the inline SVG inside `features/mascot/fiezel-mascot.js`** (the production `<fiezel-mascot>` element with 14 states, per-instance mask IDs, and a blink layer the static files lack); `assets/brand/paw-mascot-full.svg` is the authoritative standalone file. An older painterly cat (`cat_mascot.png`) is legacy marketing art from the pre-m025-128 era and must never be used as an identity reference.

The runtime is production-hardened: 14 states, `FiezelPaw.react()` event API, escalation memory (`_mem.streak/wrongRow`), 3-layer reduced-motion gates, confetti caps, and guardrail tests (`paw-mascot-test.js`). The redesign evolves this system rather than replacing it.

> Source: `audit/01-pau-assets.md` (full audit, renders in `audit/renders/`); `audit/03-usage-and-motion.md` §B (runtime).

## 2. Existing Asset Inventory

22 asset entries were catalogued (audit/01 §4). Highlights:

| Status | Assets |
|---|---|
| **ACTIVE / AUTHORITATIVE** | `features/mascot/fiezel-mascot.js` (inline SVG, 14 states) — the one canonical rig |
| **ACTIVE, defective** | `assets/brand/paw-mascot-full.svg` (broken group nesting, no blink lids); `paw-mascot-head.svg` (unrigged icon); 3 pose SVGs in `assets/marketing/mascot-poses/` (celebrating **drops the tail ring**; listening + proud use off-palette hexes and face drift) |
| **ACTIVE support** | `fiezel-motion.css` (375 lines, 14-state keyframes), `BRAND-GUIDE.md`, 512px PNG exports (faithful), `fiezel-paw.svg` stamp (healthy, test-guarded) |
| **DUPLICATES** | 3+5 byte-identical copies of full/head SVG under `design/redesign-v1/` (unguarded fork risk) + a **second full copy of the component** at `website/assets/mascot/` that must be kept in sync |
| **LEGACY** | `cat_mascot.png` (conflicting painterly identity); `FIEZEL-BRAND-MASCOT-VECTOR-HANDOFF.md` (superseded raster-era doc) |

Usage map: mascot appears on 16 surfaces (onboarding 148px, coach bubble 58/46/30px, home coach strip 42px, result ring 52px, level modals 56px, map note 28px, listening rows 38px, website hero, …) — full per-screen table in audit/03 §A.1. **No mascot on splash** (OWNER decision m025-80).

> Source: `audit/01-pau-assets.md` §2–4; `audit/03-usage-and-motion.md` §A.

## 3. What Must Be Preserved

- **Identity locks:** species and silhouette (round head ~60% height, triangular maroon-inner ears, single-mass body), cream muzzle + chest patch, maroon triangle nose, blush `#F0A0AC` r=11, maroon chest paw emblem (since OA-1/G13: an **exact `fiezel-paw.svg` glyph instance**, upgraded from "visual rhyme" to literal identity — 15 §7), tail capsule + maroon ring, solid-cocoa eyes with white highlight cluster (no sclera), happy-arc and heart-eye variant sets.
- **Closed palette** (G1) and flat no-outline rendering (G2); facial strokes `#33201F` ~5.5 round-cap.
- **System contracts:** `fz-*` class rig, `FiezelPaw.react()` API and its 14 existing state names (additive growth only), TRANSIENT/hold/then machinery, `_mem` escalation, head-crop placement pattern (178% width / top −8%), 3-layer reduced-motion gates, `paw-mascot-test.js` and sibling test gates, mascot token scoping to `.fz-mascot`/`.fz-motion` (never `:root`).
- **Identity behaviors:** no body rotation/tilt/mirroring; uniform scaling only; no claim-bearing speech bubbles; guide-not-referee tone ("pembimbing, bukan wasit").
- **Audio:** the voice ladder (G8) and the single SFX engine `fiezel-ui-sfx.js`.

> Source: `audit/01-pau-assets.md` §5 (KEEP table); `audit/02-brand-system.md` §5 (11 hard constraints).

## 4. Problems With Current PAW

1. **Static master is a mis-export**: a stray `</g>` orphans brows/mouth/sweat from `.fz-face` and arms/headphones from `.fz-body` — face/body transforms would leave parts behind (audit/01 §3a-1).
2. **No blink lids** in any standalone SVG; **no `.fz-head` group** (head tilt needs 3 targets); global mask ID collision risk; ears expose their base chord if rotated far.
3. **Pose-library drift**: celebrating export lost the tail ring; two conflicting headphone colorways; off-palette hexes `#241A11 #FFC700 #E6A800`; proud-pose eye-coordinate drift.
4. **Doc/art color drift**: BRAND-GUIDE says shade `#F8CF4D`, art uses `#EDB93A` everywhere (resolved: `#EDB93A` is ground truth).
5. **Expression ceiling**: 3 eye states × 6 mouths, opacity-toggled brows, fixed ears/tail — no degrees of emotion, no speaking mouth despite a rich voice runtime with per-sentence timing available.
6. **Runtime defects/gaps** (audit/03 Task D): invalid `pawReact('correct-streak')` silent no-op; **no reaction on level-exam pass** despite UI copy promising "PAW sampai lompat-lompat"; seven supported events with zero callers (`hint`, `favorite`, `badge-earned`, `idle-timeout`, `wake`, `hover-answer`, `answer-picked`); states `proud`/`love` never fire; missing states SPEAKING, WELCOME_BACK, LESSON_START, LEVEL_UP, MILESTONE.
7. **Multi-copy fork risk**: 8 unguarded byte-copies + a second component copy on the website.

> Source: `audit/01-pau-assets.md` §3; `audit/03-usage-and-motion.md` Task D & takeaways.

## 5. Redesign Goals

1. Keep PAW unmistakably PAW (evolution, not replacement — master prompt §6).
2. Repair the broken toolchain (nesting, lids, head group, mask IDs, pose regeneration, palette truth).
3. Raise expression bandwidth from sprite-swaps to a **parametric, transform-only rig** so 14 expressions, 16 poses, and 15+ states become parameter tuples with legal in-betweens.
4. Close the runtime gaps: SPEAKING (voice-synced mouth), WELCOME_BACK, LESSON_START, LEVEL_UP, MILESTONE; fix the dead `correct-streak`; wire the seven orphan events.
5. Integrate PAW into lessons via a reusable, collision-safe, zero-CLS panel layer.
6. Make motion calmer and more principled than today (rotation-free body, tier-entry celebrations, anti-spam cooldowns).
7. All of the above inside the hard constraints G1–G12 and without touching game mechanics or the voice system.

> Source: synthesis of `audit/*` findings and master prompt §5–13.

## 6. Design Exploration

Three directions were produced per master prompt §36:

| Direction | Essence | Self-scores (Recog / Personality / Scale / Anim / Brand-fit / Complexity-ease) |
|---|---|---|
| **A — Evolution** (`directions/direction-a-evolution.md`) | Zero visible geometry change (0.02% pixel diff, ear-base fillet only). Repairs: nesting, lids, `fz-head`, pupil groups, torso group, mask namespacing, pose regeneration, `#EDB93A` unification. "Do no harm" baseline. | 5 / 3 / 4 / 4 / 42-of-42 / 5 |
| **B — Modernization** (`directions/direction-b-modernization.md`) | One rounding system echoing UI radii; head ratio 0.66→0.64; wider body; capsule limbs/feet; arm-stain removal; single eye highlight. Widest blast radius (head-crop constants, all copies). | 4.5 / 4 / 5 / 4.5 / 39-of-42 / 3 |
| **C — Expressive** (`directions/direction-c-expressive.md`) | Identity geometry untouched; articulation rebuilt: per-eye lid/pupil sub-layers, first-class brows, 9-shape mouth incl. sp1/sp2 visemes, ±14–18° ear channel, 2-bone tail, shoulder-pivot arms, `fz-head` translate channel, rotation-free body language. ~20 rig parameters; 14 expressions + 5 missing states as tuples. | 4.5 / 5 / 4 / 5 / 40-of-42 / 2.5 |

> Source: the three direction documents + renders in `directions/`.

## 7. Selected Direction

**Direction C — PAW EXPRESSIVE, built on Direction A's structural repairs, plus two Direction-B cleanups** (remove left-arm 4%-black stain; rebuild feet as pill capsules). B's proportion rebalance was **not** adopted (deferred). Rationale: the master prompt's center of gravity is the character *system* (expressions, states, motion, reactions, speech), which depends on rig bandwidth only C delivers; A's repairs are included in C by construction. Binding notes for all downstream specs: rotation-free body language; closed palette; no new accessories (as of the gate date — superseded 2026-08-27 by OA-2/G5′: registry-governed outfits); cuteness guard (companion, not infantile); single canonical rig source (E5).

> Source: `directions/selected-direction.md` (gate decision, decision matrix, binding notes).

## 8. Final Character Specification

Geometry base: `directions/direction-c.svg` + the Direction C parameter table, on viewBox `0 0 320 300`. At rest, the character is visually today's PAW (default face byte-equal in spirit: brows hidden, smile mouth, lids retracted). The rig:

| Param | Target | Transform | Range | Neutral |
|---|---|---|---|---|
| P1 breath | `fz-all` | scale | 1↔(1.015,.985), 2.6s | as today |
| P2 head lean | `fz-head` | **translate only** | x ±6, y ±4 px | 0,0 |
| P3/P4 ears | `fz-ear-l/-r` | rotate @ (108,52)/(212,52) | −14…+18° (semantic: − perk, + droop) | 0 |
| P5/P6 lid-up | `fz-lid-up` (clipped yellow occluder) | translateY | 0 (open)…34 (closed) | 0 |
| P7 lid-low | `fz-lid-low` | translateY | 0…−14 (smile squint) | 0 |
| P8 pupils | `fz-pupil` (highlight cluster) | translate | ±6 / ±5 px | 0,0 |
| P9 gaze | `fz-eyes` (existing `--lx/--ly` lookAt) | translate | ±7 / ±5 px | 0,0 |
| P10 eye pop | `fz-eye-open` | scale | 0.95–1.12 | 1 |
| P11/P12 brows | `fz-brow-l/-r` | translateY + rotate | ty −8…+6; rot ∓14°; opacity 0/1 | hidden |
| P13 mouth | `fz-m-*` | display toggle | 9 active shapes + legacy `sad` | smile |
| P14/P15 tail | `fz-tail-base` / `fz-tail-tip` | rotate @ (212,244)/(296,200) | ±8° / ±20° | 0 |
| P16/P17 arms | `fz-arm-l/-r` | rotate @ shoulders (115,185)/(198,182) | amended: L −115…+130, R −130…+115 (see Appendix A-5) | 0 |
| ~~P18 pads~~ | **RETIRED (OA-1)** — no pad nodes exist; hands are plain yellow capsules; pose/state `pads on/off` flags are no-ops kept for tuple traceability | — | — | — |
| P19 chest | `fz-chest` | scale | 1…1.06 | 1 |
| P20 blink | `fz-lids` | scale hack, JS loop | binary, 70ms | open |
| F1–F4 feet (pose addition) | `fz-foot-l/-r` | translate/scale only | tx ±10, ty −14…0; scale 0.9–1.15 | 0 |

Includes all Direction A repairs (correct nesting, static lids, `fz-head` wrapper, per-instance clip/mask IDs) and the two B cleanups. Eyes grow r=14.5→16 (+10%, the only face-size delta). Feet = pill capsules **48×22 rx 11**, grouped `fz-legs`, in front of the chest (17 R-6). All published rotation values are **literal serialized SVG values** (clockwise-positive, per element — 17 R-3); 07 §2 expression tuples alone stay semantic for ears per its §1.4 mirror rule. Layer tree: `directions/direction-c-expressive.md` §5 (backward-compatible superset of the `fz-*` contract), realized as `assets/paw-master.svg` §3.

**The rig is now a built asset:** `assets/paw-master.svg` (canonical animation-ready master, neutral state, viewBox 0 0 320 300) + `assets/paw-master-head.svg` (production head-crop twin, viewBox 56 −10 208 216), verified at 512/148/88/42/28px — checksum-verified glyph emblem (G13), 0 pad nodes, pill feet, stain removed, blink-lid layer statically hidden the production-compatible way, stable `paw-*` ids alongside the `fz-*` class contract, mouth set serialized as **10** shapes (the 9 active + legacy `sad`). At integration it replaces the `svgMarkup()` template literal per `implementation/code-plan.md` Phase 1, with every def id per-instance-uid'd. Full provenance + animatable-node table: `assets/README.md` §1–§5.

### 8.1 Outfit system (G5′, OA-2) — new

Summary of `systems/19-outfit-system.md` (normative source):

- **Registry (§5), the entire legal wardrobe as of 2026-08-27:** OF-01 ransel/backpack · OF-02 topi/cap · OF-03 bunga/flower (stemless; stem = the OWNER-PENDING `--fz-leaf` `#8A9A5B` token, 19 §3.2) · OF-04 syal/scarf · OF-05 toga (milestone-rare by nature) · OF-06 beret · OF-07 pensil/pencil · OF-08 topi tidur/nightcap. Each row carries exact rig-coordinate geometry, anchor, allowed/banned poses, context states, and tier survival.
- **Attachment (§4):** three anchor groups — `fz-outfit-back` (behind body, first child of `fz-all`), `fz-outfit-head`, `fz-outfit-front` — carrying no transforms of their own; items track motion by transform inheritance (zero new animation nodes). `paw-master.svg` reserves them **empty**, with one documented deviation: because head items must render above the arms, `fz-outfit-head` lives in the top-level `fz-outfit` wrapper and the runtime must mirror the P2 head-lean translate onto it (assets/README §6). Ear-adjacent items anchor ≤14px from the ear pivot, never inside `fz-ear-*`. Optional micro-motion: ≤1 rotating subgroup, ≤8°, existing timers only; OFF under reduced motion (items stay visible — static-safe by construction).
- **Hard keep-outs (§4.3):** face organs, chest emblem ink box +6px (G13), tail ring +4px, ear inner triangles (≤30% overlap, tuck items only). Any hit = invalid export.
- **Rules (§6):** `outfitFor(state, surface, tier, scenePhase)` deterministic context function, default **none** ("a rarer PAW is a stronger PAW" applies to wardrobe); max 1 item, hard max 2 only as the two sanctioned Large/Full combos (OF-01+OF-02, OF-01+OF-03); `fz-headphones` counts as a HEAD-slot occupant (listening never combines with hats); drop ladder ends at Tiny = **all outfits drop** (identity floor is naked PAW); tone guards (no claim-bearing props, no guilt costumes, no seasonal-religious items without OWNER decision).
- **Anti-Duolingo (§8, extends G14):** Duo's outfits were a gem-priced shop with full costumes; PAW's are never acquired, never user-equipped, single small worn items, learning-context signals. Blocklist additions: no tuxedo/monocle/tracksuit/cape+mask/dragon-holiday costume/subscription recolor.
- **Proof:** `systems/outfit-sheet.svg/.png` (8 variants on Direction C geometry, same-character-verified, G1-only palette scan clean); generator `systems/gen_outfit_sheet.py` is the reference implementation of anchors + registry geometry.
- **Open follow-ups:** 19 §9 items — tracked as the OF-F list in Appendix B.

> Source: `directions/direction-c-expressive.md` §2, §4–5; `directions/selected-direction.md`; `systems/08-poses.md` §0.2 (arm amendment, feet params); `assets/paw-master.svg` + `assets/README.md`; `systems/19-outfit-system.md`.

## 9. Silhouette

Unchanged by design: big head circle → two sharp ear triangles → seated capsule body → curled tail with the ring bulb → feet. The ear tips and tail-ring bulb are the two highest-salience features and are preserved exactly. The only silhouette-adjacent edit is Direction A's ear-base fillet, which removes an accidental notch and makes ear rotation overlap-safe (bases extend 6px under the head rim). Poses alter silhouette only through limb/ear/tail positions and translate/scale of masses (raised open paw = greeting read — pads retired per OA-1, the arm capsule silhouette alone carries it, verified on `poses-sheet-16.png`; headphone band = listening read; ground-shadow gap = airborne read). A worn outfit item (G5′) may extend the silhouette only per its registry row; the same-character test must still pass with the item on (19 §6.3).

> Source: `directions/direction-a-evolution.md` §4; `directions/direction-c-expressive.md` §8; `systems/08-poses.md` §1 (per-pose silhouette notes).

## 10. Proportions

Locked at current values: head r=88 at (160,106), ≈60% of ~290px total height (chibi companion proportion); body 116×96 rx=42; eyes r=16 (up from 14.5) at (126/194, 98); muzzle 72×50 at (160,140); blush r=11 at (102/218, 126); tail stroke 25, ring r=15; facial strokes 5.5 round-cap. These numbers are the coordinate contract for the head-crop placement pattern (178%/−8%) and must not move (Direction B's rebalance was deferred). Scale tiers: Tiny 22–28px (head crop, coarse reads) · Small 30–58px (head crop) · Medium 88px dock (full body) · Large 120–148px (onboarding) · Full ≥200/512px.

> Source: `directions/direction-a-evolution.md` §4; `systems/08-poses.md` §0.4; `audit/02-brand-system.md` §5.6.

## 11. Face

The face is a component system inside `.fz-face` inside the new `.fz-head` wrapper, so head leans (translate-only) carry the whole face. Channels: eyes (§12), mouth (§13), **brows** — first-class curved capsule arcs (cocoa w5, round caps), hidden in neutral, 120ms fade; per-side ty −8…+6 and rot ∓14°; named poses *raised*, *focus-low* (inner-down ≤6° only — steeper reads angry and is **banned**), *inner-up* (worried/asking), *asym-ask*. **Ears** are an emotion channel (symmetric perk = interest, droop = calm/sleepy, **asymmetric = curiosity** — PAW's most characterful move, reserved for Curious/Welcoming/Thinking). **Blush** is an identity lock: always visible, never recolored; only behavior = scale ≤1.15 at celebration peaks. Sweat (`#9CC7E8`) is Confused-only. Accessories are state dressing, never expression parameters — every expression must read with accessories off.

> Source: `systems/07-expressions.md` §1 (full component spec with geometry).

## 12. Eyes

Solid cocoa `#33201F` discs r=16 — **no sclera ever** (adding whites breaks the same-character test). Per eye, three clipped sub-layers (per-instance clipPath ids): `fz-pupil` (white highlight cluster, translates ±6/±5 — an *accent* signaling attention/mood, both eyes always share one value), `fz-lid-up` (yellow occluder, 0→34 = open→shut; named levels wide/open/soft 6–10/half 14/heavy 26/shut 34), `fz-lid-low` (0→−14, smile-squint only; never combine lid-low >8 with lid-up >10). Fast blink stays the existing cheap `fz-lids` JS loop (70ms, 1.8–5.6s random, 20% double); slow emotional lid moves use P5/P6 with 240–420ms easing. Gaze layering: coarse = P9 lookAt (existing contract untouched, ±7/±5, 2200ms auto-recenter); fine = P8 pupils at ~60% of the same direction; head lean P2 may follow — order pupils → eyes → head, never head opposite to gaze. Eye pop P10: 1.1 for Surprised only. Variant sets `fz-eye-happy`/`fz-eye-love` unchanged (terminal states; P5–P10 ignored while active).

> Source: `systems/07-expressions.md` §1.1; `directions/direction-c-expressive.md` C1–C3.

## 13. Mouth

Display-toggle library inside `.fz-mouth` (no path morphs, ever). Nine active shapes: `smile` (default), `soft` (calm contentment), `open` (excited/encouraging/celebrating), `o` (surprise), `sp1`/`sp2` (speaking visemes, small/mid aperture), `wave` (confusion), `flat` (thinking/sleepy), `concern` (shallow inverted arc — **the wrong-answer mouth**, the deepest negative PAW ever shows). Legacy `sad` remains in the DOM for backward compatibility but is demoted: the expression library never calls it. Speaking cycles sp1→sp2→open on subtitle sentence beats (~110–160ms jittered), closing to `smile` at pauses; suppressed under reduced motion and on degraded audio. Exact path geometry: 07 §1.2 table.

> Source: `systems/07-expressions.md` §1.2; `systems/14-voice-sfx.md` §1.2.

## 14. Color

One closed palette (G1), with `#EDB93A` confirmed as the shade truth (BRAND-GUIDE's `#F8CF4D` is doc drift to be corrected). Gold `#D8B36B` = accessories only; soft red `#D9536A` = hearts/star accent; `#9CC7E8` sweat/tear documented as the sanctioned exception. Off-palette `#241A11 #FFC700 #E6A800` in old pose exports are **banned** and eliminated when poses regenerate. No gradients or textures on the character. Context surfaces to design/test against: cream `#FFF9EE`/`#FFF3DC`, white panels, sun-gradient hero cards (panel anchors disallowed there — yellow-on-yellow), and dark `#1B1418` core panels. There is **no dark app theme** (removed at m025-134). Mascot color tokens stay scoped to `.fz-mascot`/`.fz-motion`. Zero green, ever, on character or celebrations — G14 bans `#58CC02`/`#89E219` and any ±20° high-saturation neighbor (16 §3.1-2). One proposed extension is **OWNER-PENDING and never rendered before sign-off**: accessory-only `--fz-leaf` `#8A9A5B` (muted olive, deliberately far outside the banned-green zone; ΔE check required with the sign-off request), sole use = OF-03 flower stem; fallback = gold stem (19 §3.2).

> Source: `audit/02-brand-system.md` §1, §5; `directions/direction-a-evolution.md` §3-E; `systems/08-poses.md` §0.3, §3-D2.

## 15. Expression Library

All 14 required expressions (master prompt §8) are defined as rig-parameter tuples — points in a continuous space, so any linear blend of two tuples is a valid PAW face (transitions pass through plausible faces). The full tuple table (ears/lids/pupils/pop/brows/mouth/tail/arms/chest/head/blush/accessory per expression) is normative in 07 §2. The set: Neutral · Happy · Excited · Curious (signature: asym ears + single brow + pupil lead + head lean) · Thinking · Confused · Encouraging · Proud (closed mouth — pride doesn't gloat) · Surprised (≤1.2s, always resolves onward) · Celebrating (3 tiers by amplitude, never new drawings) · Calm (dedicated half-lid face) · Sleepy · Welcoming (the Direction C concept pose) · **Gentle concern** (the wrong-answer face, deliberately gentler than `sad`; hold ≤2s, always followed by Encouraging).

Cuteness guard: no expression maxes more than two channels at once; brows hidden wherever warmth alone carries the read; the negativity range is asymmetric by design (this restraint discipline independently exceeds the published Duolingo bar — 16 §2 P4, §4 "meets or beats"). The five missing states reuse these tuples (SPEAKING = Happy + viseme cycle; WELCOME_BACK = Welcoming + tail flick; LESSON_START = Curious→Happy; LEVEL_UP = Celebrating + full ear perk; MILESTONE = Proud hold → Celebrating burst). Small-size degradation is a **render-time parameter filter**, not separate artwork: at 42px quantize (3 lid levels, brow presence only, 6 mouth classes); at 28px the 14 expressions collapse to 5 honest reads (never attempt Confused/Gentle-concern at 28px).

Sign conventions per 17 R-3: the §2 tuples stay **semantic** for ears (right-ear literal = −tuple value); arm values are **literal** (thinking chin-reach = armR **+96**, the corrected value — the old −95 would swing the arm outward, confirmed visually on the v2 sheet).

**Proof sheets (v2 current):** `systems/expressions-sheet-14.svg/.png` — all **14/14** expressions as canonical head crops, all distinct at a glance, same-character verified, R-3-corrected serialization — plus `systems/smallsize-test-v2.png` (42/28px strip for the 6 previously untested; results match §5's quantized sets exactly, incl. confirming the 28px Confused ban). v1 sheets (`expressions-sheet.svg/.png`, `smallsize-test.png`, 8/14) kept as history. Notes: `systems/proof-sheet-v2-notes.md`.

> Source: `systems/07-expressions.md` §2–§6 + its "Proof sheet v2 (14/14)" appendix (tuples, personality mapping, degradation tables).

## 16. Pose Library

16 poses (master prompt §10's minimum plus Presenting spread across it), each specified as a parameter tuple with silhouette rationale, staging rule, reuse targets and scale tiers: **idle standing · waving · pointing · looking · thinking · reading · studying · listening · presenting · encouraging · celebrating · jumping · sitting · walking · running · sleeping.** Key rules:

- Rotation audit clean: `rotate()` appears only on ears/arms/tail-bones/brows about their own pivots; walking/running frame B is a **parameter sign flip, never a mirror**; "facing the other way" = sign flip of head-tx/gaze/arm choice.
- ~~Pads shown only palm-out (wave/encourage/celebrate); pointing shows the back of the paw (pads off).~~ **Superseded by OA-1:** hands are plain yellow capsules in every pose — the palm-out/back-of-paw distinction is retired; tuple `pads` flags remain as no-op traceability. Raised-arm reads verified pad-free on `poses-sheet-16.png`.
- Reading/studying use **no book prop** (G5): the "page" is the adjacent UI card; marketing compositions may place a cream card as a decorative element outside the character group.
- Listening headphones exist in exactly one colorway: `#D8B36B` band + `#8C2233` cups, **no LEDs** (defect fix D2).
- Celebrating always carries the tail ring (G6, defect fix D1); the old bottom-pivot arm transform is superseded by shoulder pivots.
- Reuse matrices map every pose to the 15 canonical states, the 14 runtime states, and every app surface.
- Flagged amendment: thinking/reading chin-reach extends the R-arm range to +115 (Appendix A-5 — RESOLVED, 17 R-3: canonical literal value **armR +96**).
- Poses-as-parameter-tuples with reuse matrices exceed Duolingo's published "geometric building blocks" construction guidance (16 §4 "meets or beats", P9).

**Proof sheet (v2 current):** `systems/poses-sheet-16.svg/.png` — all **16/16** poses, 4×4 grid, same-character verified per cell, tail ring present in all 16 (G6), chest glyph emblem in all 16 and **zero** pad instances (G13/OA-1), feet 48×22 rx11 (17 R-6), `gen_poses_sheet.py` earR mirror fix applied (17 R-3 item 17). v1 sheet (`poses-sheet.svg/.png`, 8/8) kept as history.

> Source: `systems/08-poses.md` (full tuples §1, reuse matrix §2, defect fixes §3, compliance §4, "Proof sheet v2 (16/16)" appendix incl. the OWNER pad-retirement record).

## 17. Character State Library

The 14 runtime states grow to **19** (additive; no deletions, every existing caller keeps working), expressing the **15 canonical states** of master prompt §11 plus 5 retained supporting states:

| Canonical (15) | Runtime state | New? |
|---|---|---|
| IDLE / GREETING / LISTENING / THINKING / ENCOURAGING | `idle` / `greeting` / `listening` / `thinking` / `encouraging` | kept |
| CORRECT / CELEBRATING | `celebrating` lv1 / lv2–3 (one state, split by existing `_mem.streak` tiering) | kept |
| INCORRECT | `confused` (first miss; wrongRow≥2 → straight `encouraging`) — wears the Gentle-concern costume per 13-reactions | kept, re-costumed |
| LESSON_COMPLETE / ACHIEVEMENT | `completion` / `proud` | kept |
| SPEAKING / WELCOME_BACK / LESSON_START / LEVEL_UP / MILESTONE | `speaking` / `welcome-back` / `lesson-start` / `level-up` / `milestone` | **NEW ×5** |
| Supporting (not in the 15, load-bearing) | `curious`, `hinting`, `sleepy`, `sad` (re-expressed as Gentle concern), `love` | kept |

Each of the 15 canonical states is fully specified with all ten required fields (expression, pose, body movement, facial movement, gaze, entry/exit, duration/loop, interrupt priority, SFX slot, voice slot) in 09 §2. State-machine rules (09 §4): priority ladder P0–P4 (MILESTONE/LEVEL_UP/LESSON_COMPLETE at P4; SPEAKING owns the mouth channel — P3+ events overlay gesture-only, P2− dropped); legal-transition table (e.g. `milestone` only from ≥600ms of idle/proud; INCORRECT→celebration requires ≥300ms idle gap); escalation memory extensions (`lastFire`, persisted `milestoneKeys`, `lastSeenAt`); anti-spam cooldowns (WELCOME_BACK ≤1/4h; MILESTONE once-ever per key; encouragement SFX ≥60s; sleepy timer 90s ambient-screens-only). Trigger wiring maps **every** event from the audit inventory, fixes the three named defects, and gives all seven orphan events real callers (09 §3). Reaction *timing* for CORRECT/INCORRECT/COMPLETE/MILESTONE is refined by 13-reactions — see §24–27 and Appendix A-1. Rulings now fixed (17 R-2): WELCOME_BACK = 2200ms; LESSON_START = 1600ms (Curious 600ms → Happy rest → idle); milestone proud-hold = 600ms. Canonical `react()` vocabulary = **22 events** (existing 15 + `reward`, `level-up`, `milestone`, `welcome-back`, `lesson-start`, `speak-start`, `speak-end`), with exactly one deprecation alias `correct-streak` → `reward` (17 R-1). The state-machine architecture (named states + explicit transition/priority logic, driven programmatically) is the same technique Duolingo validates with Rive state machines — already met, with stricter interrupt/cooldown discipline than anything Duolingo has published (16 §2 P1, §4). Outfit hook: 19 §9-7 asks these state tables to carry the `outfitFor` context column (open — Appendix B, OF-F7).

> Source: `systems/09-states.md` (migration §1, definitions §2, wiring §3, machine rules §4); `systems/17-open-issue-rulings.md` R-1/R-2.

## 18. Character Motion System

Motion language on four easing tokens: `--fz-spring` (reactions/entrances with overshoot), `--fz-out` (settles/exits), new `--fz-calm` (ambient loops), new `--fz-settle` (cross-screen handoffs). Key content:

- **The rotation rule bites existing CSS**: 7 shipped keyframes contain body rotation and must be replaced (`fzTilt`→`fzGreetShift`, `fzLean`→`fzHeadLean`, `fzGroove`→`fzGrooveSway`, `fzConf`→`fzConfShift`, `fzDrowse`→`fzDrowseCalm`, `fzLoveWiggle`→`fzLoveSway`, rotate term deleted from `fzJumpBig`); tail keyframes remap to the 2-bone rig; arm keyframes re-anchor to shoulder pivots (10 §0.1–0.2).
- **Idle budget**: max 4 animated nodes (breath, 2 ears, tail-tip) + 2 JS timers (blink, new micro-gaze every 6–11s). **Benchmark amendment 16 §4-B (adopted as proposal):** combinatorial idle variety *within* this budget — randomize parameters, not nodes: jitter the micro-gaze target among 3 zones, vary blink single/double (~1:5), offset ear-sway phase per mount. Zero new nodes; variation rides the JS timers PAW already owns (the technique-level answer to Duolingo's 8×8 idle-combination system).
- **Reactions**: attack ≤200ms, total ≤1.6s, auto-revert; exact per-state values in 10 §1.2.
- **Celebrations**: 3 tiers by amplitude/repeats only; max ×2 of any jump; never loop indefinitely.
- **Speaking motion**: JS viseme beat (~140ms ±jitter) + sub-pixel head bob; one interval, no animation nodes for the mouth.
- **10-point motion-principles checklist** and hard anti-patterns (no `display:none` cuts, no `will-change` blanket, no keyframe-name collisions, one hero channel per state, entrances on conceptual arrival not DOM churn).
- **Implementation spec**: keyframe inventory (changed/replaced/new), CSS vars (`--px/--py`, `--fz-lidup`, `--fz-beat`, enter/exit durations — all scoped, never `:root`), JS API additions (`speak(handle)`, `currentState()`, `faceMarkup(opts.state)` pre-stamping), GPU budget (≤9 nodes at completion, ≤4 instances, no forced reflow), and timing choreography diagrams.

> Source: `systems/10-motion.md` (all sections; acceptance checklist §7).

## 19. Splash — "AUTO-FLOW: PARTICLE FORMATION → PAW STAMP → ONBOARDING" (v4, OWNER-approved 2026-08-28, binding)

**OWNER RULING 2026-08-28 (OA-6, supersedes OA-5's Mulai gating the same day):** the **Mulai button is REMOVED ENTIRELY** — the splash flows automatically into onboarding. The v3 formation/equalizer/wordmark acts and the slam grammar are unchanged; the welcome-card rest state and the user-triggered closer are retired. Normative spec: **11 §1S-v4**; implementation contract: `splash-prototype/CONTRACT.md` (v4 banner); prototype + QA evidence: `splash-prototype/` (`dev/qa-v4/`). m025-80 (no mascot on the splash) remains permanent; the splash stays character-free.

### 19.1 Binding design (v4)

Three autonomous acts and one **automatic closer**, one clock (`FZSplash.clock`; one-clock rule m025-86 carries to the port):

1. **Acts 1–3 (0–2140ms) — unchanged from v3 (§19.2 items 1–2 + settle):** particle formation of the F (crisp by ~950, SVG crossfade 820–944) → bar gathering → `bars-solid` @1150 → equalizer takeover (scaleY-only, motif-synced) → wordmark small/bottom 1200–1500 → `equalizer.settle()` 1900–2140 easing the bars to the exact logo proportions. **No welcome card**: the centered logo + wordmark composition simply holds (the v3 card-lift is retired).
2. **Closer — AUTO PAW STAMP (2200ms):** `pawstamp.play()` fires from the orchestrator schedule **60ms after the settle completes** (≤120ms max gap — no dead beat). The slam lands **center-stage** over the logo composition (no button target); choreography identical in identity to v2/v3 (anticipation → contact squash 1.12/0.84, double rings, ≤3px Y shake, 3 debris, −6° ink-spread seal → **stamp expands as the transition**); the two-stage scrim keeps the composition readable under the slam, then goes opaque before exit. `onboarding-enter` at ~3030ms (2200 + EXIT 830); overlay released ~3560ms; **motion ends and onboarding step 1 is legible ≤3600ms from t0.**
3. **Skip (tap/click/Enter/Space anywhere):** pre-settle → jump to 1900 (settle plays, stamp still auto-fires — the closer is always seen); 1900–2200 → jump to stamp start; during the stamp → `pawstamp.skip()` completes it instantly (exit phase + `onboarding-enter` now, still behind the scrim). No focusable elements remain inside the splash; the onboarding surface stays `inert` until entry.
4. **Reduced motion:** static formed composition, then the reduced stamp (seated glyph fade-in, soft thud) plays **automatically** after ~180ms → onboarding ≈800ms from boot. Degradation ladder and SFX identity carry from v3 unchanged (audio being rebuilt in parallel; `js/sfx.js` wiring untouched).

Gates: **V4-G1** no-Mulai (no welcome card / `Mulai` / `.fz-welcome` / `.fz-mulai` anywhere in splash code) · **V4-G2** budgets (t0→`onboarding-enter` ≤3100ms; legible ≤3600ms) · **V4-G3** no dead beat at the settle→slam handoff (≤120ms) · **V4-G4** v3 gates V3-G1/G2/G5 carry forward · **V4-G5** skip semantics per 11 §1S-v4.3.

> Source: `systems/11-splash-onboarding.md` §0 (OA-6 banner), §1S-v4 (binding spec); `splash-prototype/CONTRACT.md` (v4 banner + v4 master timeline), `splash-prototype/NOTES.md` §7.

### 19.2 History — v3 "PARTICLE FORMATION + PAW STAMP ON MULAI" (OA-5, Mulai gating superseded by OA-6 the same day; formation/equalizer/slam text remains the base of §19.1; kept verbatim, do not implement the card/Mulai clauses)

**OWNER RULING 2026-08-28 (OA-5, supersedes OA-4's design the same day):** the gold sheen/halo after the F and bars is **DELETED**; the F + bars now **form from a futuristic particle point-cloud** with an **equalizer takeover** of the bars; the paw slam-to-stamp **no longer auto-plays** — it fires on the user's **Mulai** press and transitions directly into onboarding. Normative spec: **11 §1S-v3**; implementation contract: `splash-prototype/CONTRACT.md`. m025-80 (no mascot on the splash) remains permanent; the splash stays character-free. *(OA-6 note: "no longer auto-plays" is itself superseded — v4 auto-plays the stamp at 2200ms with no button.)*

#### 19.2.1 The v3 design (verbatim)

Three autonomous acts, one user-triggered closer, one clock (`FZSplash.clock` in the prototype; one-clock rule m025-86 carries to the port):

1. **Particle formation of the F (0–950ms):** ~1400–2200 gold `#F0C241`/`#FFD94F` + cream `#FFF4DA` points (1–2.5px, adaptive, canvas-only, **no glow/bloom**) converge with a curl-noise swirl onto targets sampled from the real SVG geometry; stem biased earlier than arms; at ~950 the particles snap and crossfade (≤120ms) to the crisp SVG F. **The F completes first while the two bars are still particles** — the OWNER's explicit ordering beat.
2. **Bar gathering → equalizer handoff (700–1150 → 1150–1900ms):** bar particles gather 700–1150; the instant both bars solidify, `bars-solid` fires and a dedicated **equalizer animation** takes the two bars over — scaleY-only, pivot bottom, choreographed to the motif beat table (`eq-tick` accents); the A4 colour tone lands on the bars-solid frame (gold + major third on the same frame, signature kept, relocated). Wordmark reveals at the bottom 1200–1500, **small per v2** (`min(30vw,132px)` — all OA-4 sizing unchanged).
3. **Settle + welcome (1900–2100ms):** `equalizer.settle()` eases the bars to the exact logo proportions; the splash crossfades to the **welcome card** (logo persists above it) and **rests** — the fixed close-timer/`VISIBLE_MS` model is retired; there is no auto-exit and no auto-slam.
4. **Closer — PAW STAMP ON MULAI (user-triggered, ≤1400ms press→onboarding):** pressing **Mulai** fires the v2 slam sequence unchanged in identity (anticipation 240ms → contact: squash 1.12/0.84, double shockwave rings, ≤3px Y-only shake, 3 debris dots → seal settle −6° ink-spread) and the **stamp expands as the transition itself** into onboarding step 1 — no dead time. Glyph = exact `fiezel-paw.svg` geometry, splash gold recolor `#FFDE59→#FFC700→#E6A800` (unchanged from v2; G13 checksum intact).

**Deleted sheen (binding negative spec):** the `fz-logo-sheen` sweep, the slam halo flare, the ambient halo pulse, and every glow/bloom layer — including canvas `shadowBlur` — are **gone with no replacement beat** (11 §1S-v3.4; greppable no-sheen gate V3-G1).

**Sound (identity unchanged):** motif F2·F3·C4·F4·A4·C5·G5 remapped to the v3 events (F2 @0 ignition · F4 @950 F-lock · A4 @1150 bars-solid · G5 @1900 settle) + low-level `eq-tick` accents + the **STAMP THUD** at Mulai-slam contact (F2 sub **110→48Hz** sine + noise transient per the CONTRACT, −6dB under motif, tail ≤300ms). WebAudio only, single engine, muted-by-default hook.

**Resilience:** tap-skip pre-welcome jumps to the welcome card (no auto-exit to race); reduced motion = static formed composition, **Mulai still works** with a reduced stamped-glyph fade-in (no slam); degradation ladder: adaptive particle count → **~500–700 points on low-end** → **static formation fallback** (no canvas; equalizer still runs) → static markup + plain crossfade if JS is dead; app boots behind at every tier (11 §1S-v3.6–v3.8).

**Storyboard v3 (binding):** `systems/storyboard-splash-v3.svg/.png` (9 frames: scatter cloud · mid-convergence · F locked + bars-as-particles · bars solidify/handoff · equalizer · settle+welcome · Mulai press · slam contact · stamp→onboarding; timestamp/trigger + phase + SFX per frame); generator `systems/gen_storyboard_splash_v3.py`. **`storyboard-splash-v2.svg/.png` is superseded** (kept as history — it boards the auto-slam design incl. the deleted sheen/halo-flare). `storyboard-onboarding.svg/.png` remains current.

> Source: `systems/11-splash-onboarding.md` §0 (OA-5 banner), §1S-v3 (~~binding spec~~ *v4 note: Mulai clauses superseded, see §1S-v4*), Storyboard v3 appendix; `splash-prototype/CONTRACT.md`.

### 19.3 History — v2 "PAW STAMP" auto-slam (OA-4, superseded by OA-5 the same day; kept verbatim, do not implement)

**OWNER RULING 2026-08-28 (OA-4):** the "PAW lights the logo" mascot-splash proposal (former 11 §1.2) and the splash-lite variant (former 11 §1.6) are **REJECTED**; **m025-80 ("undo pemakaian maskot saat splash") stands permanently** — the cat mascot never appears on the splash. The OWNER approved a replacement design, **"PAW STAMP"**, which is **binding and no longer OWNER-gated** (splash config flag E7 retired — one splash only). Normative spec: **11 §1S**.

Three actors, zero characters, ≤**2000ms** hard budget, one `FiezelChoreography` clock:

1. **F logo first** (0–830ms): the existing letterform build + two rising gold bars, exact `logoMarkup()` geometry, retimed to a 0.62× beat table (b1–b7); the gold-on-screen + A4-in-the-chord colour beat is kept.
2. **Small wordmark at the bottom** (660–1080ms): OWNER — the current wordmark is too big. Binding size `width:min(30vw,132px)` (was `min(52vw,238px)`; 202.8→117px at the 390px reference, −42%, cap −45%), grid padding-bottom `17vh` → `calc(max(6vh,44px) + env(safe-area-inset-bottom))`, tagline 12→9px, settle travel 15→9px; fully seated 150ms before the slam contact.
3. **Closer — the paw slam-to-stamp** (900–1700ms): the **real paw glyph** (`assets/brand/fiezel-paw.svg` exact geometry — the paw-print mark, NOT the mascot) fades in raised 44px at scale 1.16 (s1 anticipation, deliberate silence), **slams down in 90ms** (contact = the beat at 1230ms: squash 1.12/0.84, gold shockwave ring to `min(60vw,320px)`, ≤3px Y-only micro screen-shake 180ms, halo flare) and **spring-settles as a seal** (`cubic-bezier(.34,1.56,.64,1)` through 1.02), then a 120ms still — the stamp is the closing beat that hands off to onboarding (exit fade 1700–2000ms). Glyph recolored splash-only to the gold gradient `#FFDE59→#FFC700→#E6A800` (source `#2B2118` is invisible on the `#1B1418` field); geometry stays checksum-exact per G13's source file.

Sound: the retimed pitch motif F2·F3·C4·F4·A4·C5·G5 (reused beat motif) plus **one new STAMP THUD slot** at contact — F2 87→49Hz sine + band-limited noise burst inside the single `FiezelUiSfx` engine, −6dB under the motif, tail ≤300ms. Quality bar: **maximum** — this is the first impression. Tap-skippable at any time; the app boots behind it (the paw is inline SVG in the static first-frame markup, CSS-only, no JS dependency); 4-step degradation ladder, reduced-motion = the settled F7 composition fading in on the same beats, `VISIBLE_MS` 3400→2000 (the m025-88 dwell accounting is settled in 11 §1S.2). Consequence for §30: the PAW Spark's *splash instance* is retired with the rejected design — the Spark allowlist no longer contains a splash entry.

**Storyboard v2 (~~binding~~ superseded by OA-5 — storyboard v3 binds):** `systems/storyboard-splash-v2.svg/.png` (8 frames, timestamp/beat/SFX per frame, real glyph + real wordmark, no mascot anywhere); generator `systems/gen_storyboard_splash_v2.py`. **Superseded by OA-4 (kept as history):** `storyboard-splash.svg/.png`, `storyboard-splash-lite.svg/.png`, and `gen_storyboards.py`'s splash sheets; `storyboard-onboarding.svg/.png` remains current. The v1 boarding ambiguities SB-1…SB-5 and SB-7 existed only inside the rejected design and are **MOOT**; SB-6 (onboarding-side) stays informational — dispositions in Appendix B. Returning-user beat-trim rows (former 11 §3) are void with the rejected design; WELCOME_BACK trims, if ever wanted, need a new OWNER-reviewed row set against the §1S table.

> Source (historical): `systems/11-splash-onboarding.md` §0 (OA-4 ruling banner), §1S (superseded, kept as history), §4.4 (decisions 1–2 DECIDED; 3–4 open), "Storyboard v2" appendix. What survives OA-5 unchanged: the small bottom wordmark sizing, the glyph geometry + gold recolor, the slam choreography identity (now Mulai-triggered), the thud role, m025-80, E7 retirement.

## 20. Onboarding

The existing 6-step onboarding mascot machinery (148px, `st-<pose>` pre-applied, direct-element `setState` sanctioned here, `MASCOT_CHAIN` fallbacks, reduced-motion freeze) is kept wholesale; the **content** upgrades from per-step portrait to companion: PAW gazes at what the learner works on (name field, carousel items, goal grid, CTA buttons), micro-reacts to input (first keystroke ear-perk, selection nods — throttled ≥600ms, never celebrating selections), points (plain open paw — pads retired, OA-1) at the placement-test CTA, treats "skip" with Calm (never concern — skipping is sanctioned), and celebrates step 6 exactly as shipped (jump → proud settle). Step 5 upgrades intent `sleepy → calm` via chain `['calm','sleepy']`. This companion-not-guilt design is the ethically-correct version of Duolingo's relationship-first onboarding (16 §2 P8; guilt mechanics are blocklisted, G14). **Benchmark amendment 16 §4-E (optional, OWNER decision only):** one 2–3s "PAW introduces himself by name" beat inside existing step 1 — no new screens, no added friction, explicitly guilt-free; adding screens is out of scope. Storyboard: `systems/storyboard-onboarding.svg/.png` (6 frames). **Handoff moment** (§27 continuity): on finish, onboarding PAW shrinks toward the coach-bubble corner and the bubble's existing birth pop fires ~120ms later — the companion visibly *becomes* the everyday coach; skipped under reduced motion and on the placement exit.

> Source: `systems/11-splash-onboarding.md` §2 (per-step table §2.2, handoff §2.3, assets/events §4).

## 21. Lesson Character Layer

The PAW CHARACTER UI LAYER is deliberately small: (1) a pointer-transparent, space-reserving **slot element** `.fz-paw-slot` rendered in the same paint as its panel; (2) a **markup helper** `pawPanelMarkup(slot, size, pose)` that returns empty string if the component isn't ready (no icon fallback at panel scale); (3) a ~15-line **wiring shim** that finally emits the three orphaned lesson events. It never draws PAW (mounts the one rig), is never a second floating PAW (the coach bubble owns the dock), and is never interactive (`pointer-events:none` + `aria-hidden`). Presence policy: **PAW appears where a companion helps and is absent where he'd be wallpaper** — max one panel-PAW per screen; hub/list screens, flashcards, error states, progress charts get none; question cards (peek), teach-pause and result and empty states (above-anchor) get one. Tie-breaker: absent — a rarer PAW is a stronger PAW. Full per-screen decision table: 12 §4. CSS/JS integration sketch (repo-convention compliant, `[ADAPTASI 5]` block): 12 §6.

> Source: `systems/12-lesson-layer.md` §1, §4, §6.

## 22. Question Panel Interaction

Positioning: six anchors — **Above** (88–148px, teaching surfaces), **Upper-left/right corner** (48–58px), **Side column** (148px, ≥980w), **Floating** (= the existing coach bubble), **Peek** (56px head+ears rising from behind the card's top border, z below the card — the phone-portrait default). Selection rules: density first (>70% viewport interactive ⇒ peek/bubble only); teaching beats decorating; never anchor to reading passages; corner side avoids existing chips. Hard collision invariants C1–C7: pointer transparency; protected content box (no PAW pixel from first text node to last interactive, 12px inset); **zero CLS** (box reserved at render, presence decided before paint, exit = opacity inside the box); reaction headroom (jump clamped to slot, confetti hidden <88px); fixed-UI avoid zones (quiz topbar, bubble lane, subtitle band, voice pill, bottom nav; slot z ≤5); feedback never obscured; no panel anchors on sun-yellow surfaces. Question lifecycle: `question-shown` → curious+lookAt(stem); `hover-answer` (throttled ≥250ms, idle-gated, keyboard-focus parity) → glance; `answer-picked` → thinking 700ms; reveal → correct/wrong (already wired); leaning is the rig's job (head translate toward the real element rect), the slot only supplies direction. **Benchmark amendment 16 §4-C (adopted as proposal):** one added trigger row — on existing per-word audio playback events, `lookAt(wordRect)` + speaking micro-state for the clip duration, throttled with the existing ≥250ms hover throttle; no new UI, no new voice behavior (G8 intact). ASCII layout plates: 12 §5.

> Source: `systems/12-lesson-layer.md` §2–3, §5–7 (acceptance checklist).

## 23. Character Enter / Exit

Never `display:none` cuts; every appearance ≥120ms even at 28px; exits ≈0.6× enter length; enters may overshoot, exits never. Variant chosen by context: `fzMEnterPop` (first-ever appearance, modals) · `fzMEnterRise` (repaint where PAW was conceptually present — onboarding steps, home strip) · `fzMEnterSlideX` (directional flows, matches content travel) · `fzMEnterPeek` (head rises into cropped docks — result ring, level modals, listening rows) · `fzMEnterFade` (≤28px + the reduced-motion substitute) · exits `fzMExitSink/Fade/SlideX`. Node removal on `animationend` **with a 400ms timeout fallback**. Cross-screen continuity ("one cat, many windows", master prompt §27): the coach bubble is the persistent body holding `_mem`; per-screen faces are ephemeral windows pre-stamped with the current live state (`faceMarkup` `opts.state`), so e.g. the result-ring face *arrives already celebrating* — the strongest continuity moment in the product.

> Source: `systems/10-motion.md` §2–3 (keyframe table, context table, handoff choreography and diagrams).

## 24. Correct Reaction

Trigger unchanged: `answerFeedbackSignal(true)` → `pawReact('correct')`. Canonical lv1 timeline (≤**1200ms** trigger→idle): verdict channels at t=0 (app-owned, never late) → notice (pupils snap, ears perk, 80ms) → happy-arc cross-fade 120ms → smile→open toggle → single squash-stretch hop `fzJump` .85s with one arm raised (armR literal −80°; pads retired, OA-1) + tail-tip flick → return → idle. Confetti 28. Sound: the existing success arpeggio owns the moment (optional motif tail-note default **off** — never double-score an answer).

**Escalation with the tier-entry anti-inflation rule** (binding refinement of 09 — Appendix A-1): full tier choreography plays only when the streak *crosses into* lv2 (1600ms, double hop, 38 confetti) or lv3 (1900ms, `fzJumpBig` ×2, 48 confetti); every correct beyond that replays the compact ≤1200ms form wearing lv3 garnish, confetti 0 (24 every 5th). Anti-spam: 250ms coalesce window; interrupts forfeit confetti; ≥28-particle bursts max once/3s; 300ms whiplash guard after any INCORRECT. The **`reward` event** (fix for the dead `correct-streak`, Appendix A-2) is the mid-tier gems reaction: lv2 cheer + chest puff + one tail-ring glint, 1600ms, confetti 38, `char.reward` SFX, 4s cooldown, does **not** touch `_mem.streak`.

> Source: `systems/13-reactions.md` §1 (timelines, tiers, `reward` spec, anti-spam); `systems/09-states.md` §2.6–2.7.

## 25. Incorrect Reaction

"That's okay. Let's learn." — never "You failed." Trigger unchanged (`pawReact('wrong')`). The wrong-answer face is **#14 Gentle concern** (binding, refines 09's Confused-with-sweat — Appendix A-1): ears soft +9/+9 back, lids 8, inner-up brows ±8°, `concern` mouth, head translate(−2,+1), tail settled low, arms drifting forward "here with you". ≤**1000ms**, easing always `--fz-out` (concern never bounces), then a designed **melt** through in-between faces into `encouraging` (1500ms): point at the *question*, never at the mistake; translate-only nod; final gaze centered on the learner. wrongRow≥2 skips concern entirely → straight encouraging (shipped logic kept). Hard prohibitions: no head-shake, no sweat, no tear, no slump, no `sad` mouth, no ear droop past +9°, no red flash; total amplitude stays below CORRECT lv1 — wrong is always visually quieter than right. SFX: silent (the existing soft error tone is the whole score). `sad` is unreachable from `wrong` (reserved for streak-lost/demotion, itself re-expressed as Gentle concern).

> Source: `systems/13-reactions.md` §2 (binding); `systems/09-states.md` §2.8–2.9 (state plumbing).

## 26. Lesson Completion

Trigger unchanged: `finishQuiz` → `uiSfx('celebrate')` → `pawReact('lesson-complete')`, hold 3200ms. Authored arc **#9 Surprised flash → #10 Celebrating → #8 Proud → #1 Neutral** — a story, not a loop: eyes brighten (pop 1.1) → `fzJumpBig` ×2 with the two-arm cheer (literal L +115° / R −115° per 17 R-3; pads retired, OA-1), tip-toe feet, tail base +6/tip +18 (**ring intact by construction** — G6), stars loop + ring glow → 400ms Proud settle (chest 1.06, soft mouth) → idle. Confetti **46, single burst per completion** — no per-jump re-bursts. Sound: `uiSfx('celebrate')` IS the celebration; the mascot adds no second audio layer; the first jump lands on the chord's C5. **Level-exam pass replaces this** with `level-up` (never both); failed exams get `encouraging` beside the verdict — never a celebration, never sadness; placement-test completion routes to `milestone` key `placement-complete`.

> Source: `systems/13-reactions.md` §3; `systems/09-states.md` §2.12.

## 27. Milestone Celebration

One reserved top tier, two rungs — everything below must stay visibly smaller or the tier stops meaning anything:

- **`level-up`** (2800ms, repeatable per promotion, 10s cooldown): stunned notice (#9, ears snap −12/−12) → triple jump "PAW sampai lompat-lompat" with full clamps, confetti 60 single burst → proud settle with gaze to the new level badge → proud-flavored return. SFX: extended motif phrase ~700ms; praise-persona voice line justified here.
- **`milestone`** (3400ms, **once ever per key**, persisted; keys `placement-complete`, `streak-7/30/100`, `level-c2`): three acts — Proud hold (the restraint IS the signature's micro-expression) → full-clamp Celebrating burst (eye pop 1.12, confetti 80) with the signature SFX (opening chord an octave up, ≤700ms, one sound never layered) → Proud settle. Priority P4; never chained from another celebration (≥600ms idle/proud gap).

Explicit **does-NOT-qualify** blocklist: answer streaks (CORRECT tiers), gems (`reward`), session completes (LESSON_COMPLETE), maintained day-streaks/badges/mastered cards (`proud`/`love`), gems spends (nothing). Rule of thumb: if it can happen more than ~once a week for an active learner, it is not this tier.

Frequency-tiered celebration economics (common = wear-proof, rare = enormous) is the same principle Duolingo's sound design documents; PAW's tier-entry anti-inflation rule and once-ever milestone keys are *stricter* (16 §2 P5, §4). Character *transformation* as celebration currency (Fire Duo / Buff Duo) is blocklisted — amplitude tiers of the same PAW only (G14). **Benchmark amendment 16 §4-F (recorded, out of scope for the character system):** the milestone-tier Proud-hold frame should be *exported* at share-card-usable resolution so the product team could build a share card without new character work; share cards themselves are product/UI features.

> Source: `systems/13-reactions.md` §4; `systems/09-states.md` §2.13, §2.15, §3.1; `systems/16-duolingo-benchmark.md` §2/§4.

## 28. Voice Integration

**G8: the voice system is never replaced.** Integration is one new seam — a small **speech bridge** module listening to ~6 one-line `fiezel-speech` CustomEvent emissions added at existing `fiezel-voice-say.js` seams (start/progress/end/interrupt/silent), plus the two existing events (`fiezel-neural-voice-progress` = model download, never speaking; `fiezel-neural-voice-degraded` = immediately end speaking). The bridge drives the mascot only through the sanctioned wrappers, so speech animation inherits all three reduced-motion layers for free.

**Ground truth about timing:** L1/L2 give a ~4Hz audio-clocked `onProgress`; L3 gives promise-only; L4 gives start/end; L5 is silence. No phoneme/word timing exists anywhere. Therefore the mouth is a free-running jittered 110–160ms flap cycle (weighted 55% sp1 / 30% sp2 / 15% open; never same shape twice; punctuation choreography from subtitle cue text) **gated and corrected by the audio clock**: a stall gate closes the mouth within ≤900ms of any silence; estimated-duration caps close it on clock-less layers; degraded events close it; promise resolution always closes it — the failure mode is always "mouth stops too early", never "flaps over silence". `FiezelSubtitle`'s cue index is the one timing brain (never a second clock). L5 = no mouth animation at all. Below ~42px the cycle collapses to smile↔open. Persona overlay: *hype* (sid 5) sentences add brow raise + doubled tail sway + open-weight 22%. Micro-motion during speech (all rotation-free, all rationed): per-sentence talk bob, micro-saccades, punctuation ear/brow accents, ≤3 beat gestures per utterance, 180ms "inhale" on confirmed start. Wire format per 17 R-2a: the voice facade emits **`fiezel-speech` CustomEvents** (`phase ∈ start|progress|end|interrupt|silent` + timing payload); one bridge module `fiezel-speech-bridge.js` translates them into the `react()` vocabulary `speak-start`/`speak-end` (10's `speech-start/end` names superseded).

Future upgrades (optional, non-baseline): amplitude follower (AnalyserNode); CI forced-alignment viseme tracks as an optional `audio/manifest.json` field — **promoted by benchmark amendment 16 §4-A from "optional future" to a named P1 backlog item** (Duolingo's phoneme→viseme factory validates the upgrade path; the flap cycle stays the permanent fallback; no new runtime clock — alignment data feeds the existing `FiezelSubtitle` cue brain). **Benchmark amendment 16 §4-D (adopted as proposal):** map `fiezel-neural-voice-progress` (model download — never a speaking signal) to a capped `thinking` presentation (≤3s, then plain idle), so long TTS loads read as PAW considering, not the app hanging. Interruption correctness ("mouth stops too early, never flaps over silence") meets the Duolingo bar as-is (16 §2 P2/P6). The full five-layer mapping table (VOICE → SPEECH STATE → MOUTH → FACE → BODY → GESTURE per L1–L5): 14 §2.2.

> Source: `systems/14-voice-sfx.md` §0–2; `systems/09-states.md` §2.5, §3.4 (SPEAKING state + wiring); `systems/17-open-issue-rulings.md` R-2a; `systems/16-duolingo-benchmark.md` §4.

## 29. SFX System

**SUPERSEDED BY OA-7 (2026-08-28) — the binding SFX spec is now `systems/20-sfx-system.md`.** The OWNER SFX brief (`FIEZEL-SFX-Brief-2.pdf`) ordered a total SFX redesign: a produced 27-file library (26 brief-named sounds + `stamp_thud`; WAV masters `sfx/masters/`, web OGG `sfx/web/`) built on the locked "Ascent & Crown" motif (F4→A4→C5→G5, `sfx/lib/MOTIF.md`) replaces the runtime-synthesized motif-quotation design below. 20 §4 maps every file to its app trigger and names each old sound it replaces or retires (the success/error oscillator arpeggios, `uiSfx('celebrate')`, the six motif-quote categories, the splash beats and oscillator thud). **What survives from this section:** the single-engine rule (`FiezelUiSfx` remains the only audio engine — refitted from synth `VOICES` to a sample manifest, 20 §7), the mute/speech-priority/motion-coupling/rationing rules, the "most movements stay silent" doctrine, and G14's Duolingo-imitation blocklist. Independent QA acceptance: 27/27 PASS (`sfx/qa/acceptance_audit_results.json`, `sfx/qa/loudness_ladder.png`). The paragraph below is the superseded design, kept as history.

*(Historical — superseded by OA-7):* All character SFX **extend `FiezelUiSfx`** (new `VOICES` entries) — never a second engine; every sound quotes the brand motif (F2 F3 C4 F4 A4 C5 G5, struck-bar timbre) — the "one musical idea, escalating levels" discipline, met more restrainedly than Duolingo's published sound system (16 §2 P10; imitating Duolingo's chimes/vocalizations is blocklisted, G14). Global rules: the existing "Suara jawaban" preference mutes everything (no new settings row); SFX never play while speaking (skipped, not queued; celebration/milestone excepted post-quiz, ducked); an SFX whose paired animation is suppressed does not fire; **most movements stay silent** — curious/thinking/listening/hover/blink/idle/sleepy earn nothing. Six categories: **Entrance** (two soft taps F4→C5, coach-bubble birth + onboarding enter only, ≥8s apart) · **Reaction** (single A4 "hm", hinting + first-wrong only, ≥6s) · **Correct** (existing success arpeggio unchanged; one G5 glint at lv3 only, ≤1/60s, never a second melody) · **Encouragement** (falling third A4→F4, wrongRow≥2 + streak-lost, max 2/session ≥20s apart) · **Celebration** (the existing `uiSfx('celebrate')` chord IS the sound; fix = choreography sync, not a new asset) · **Level/Milestone** (full ta-ta-TAAA flourish with F2 sub-root, ≤1.1s, max once/session, suppressed during placement tests). Audition home: `sfx-preview.html`.

> Source: `systems/14-voice-sfx.md` §3; `audit/03-usage-and-motion.md` C.4 (single-engine directive).

## 30. Character Signature

The FIEZEL Character Signature is one selective combination of gesture + micro-expression + sound + timing. Two sibling definitions existed and **were unified by ruling (Appendix A-6 — RESOLVED, 17 R-4; canonical name: the PAW Spark)**:

- **"The PAW Spark"** (14 §4): ≈900ms — left arm to literal +105° (pads retired per OA-1 — plain open paw; R-4's residual "pads shown" wording is flagged for cleanup, Appendix B) + asym ear perk (0ms) → double-blink into happy-arcs + open smile (~105ms) → tail-tip flick + head translate (~210ms) → hold → release; sound = F4→A4→C5 short form ≤420ms, the three gesture beats landing exactly on the three notes. Allowlist as originally drafted: first greeting of a session, level-exam pass/promotion, onboarding completion *(historical — the canonical post-R-4 allowlist is in the resolution paragraph below)*. Never during questions/assessments, near wrong answers, while speech is active, in <42px crops, or under reduced motion; ≤2 occurrences per session.
- **"Gold Beat"** (11 §1.3): the same welcoming-spark pose landing on the splash's A4 gold-bar beat; reuse policy splash + LEVEL_UP + MILESTONE only, explicitly never in onboarding steps; no new audio (the existing motif beats are the sound).

Both agree on the core: **welcoming-spark gesture + happy-arc micro-expression + the motif's F4/A4/C5 DNA, used scarcely.** The allowlist and audio-asset conflicts were resolved 2026-08-27 by `systems/17-open-issue-rulings.md` R-4 (see Appendix A-6): one signature, the PAW Spark — 14 §4 choreography canonical, context-dependent audio, allowlist = splash (OWNER-gated) + first greeting + level-up + milestone; onboarding completion OWNER-gated, default excluded. *(OA-4, 2026-08-28: the splash entry is **retired** — the mascot-splash was rejected and the PAW STAMP splash has no character; effective allowlist = first greeting + level-up + milestone. OA-5's v3 splash is likewise character-free — unchanged.)*

> Source: `systems/14-voice-sfx.md` §4; `systems/11-splash-onboarding.md` §1.3; `systems/09-states.md` §2.15; `systems/13-reactions.md` §4.3.

## 31. Responsive Behavior

Breakpoints follow the repo's existing cut lines (640px / 860px / 980px; `.app` max 800/1120px). Anchor availability matrix (12 §2d): narrow phones ≤420w portrait get peek-or-bubble only; A-anchors need real free space (never manufactured by shrinking content); side columns are ≥980w; any landscape under 480px height forbids above-anchors. Orientation change re-anchors only on the next render — between renders the slot keeps its box (never a layout jump). Scale-tier ladder (Tiny 28 → Full ≥200) aligns to existing product sizes; head-first rendering ≤58px; expressive fine detail is known-invisible <42px and nothing depends on it. Splash and onboarding sizes clamp responsively (`clamp(160px,44vw,220px)`, `clamp(120px,34vw,148px)`).

> Source: `systems/12-lesson-layer.md` §2d–2e; `systems/08-poses.md` §0.4; `systems/07-expressions.md` §5.

## 32. Accessibility

- **Reduced motion (G9), three shipped layers kept exactly:** OS `prefers-reduced-motion` (mascot-subtree-scoped CSS + explicit gates on JS-driven timers: blink loop `_blinkLoop()` per 17 R-5, micro-gaze, speaking beats, confetti ≤8); app setting → `body.reduce-motion` + wrapper early-return (**reactions never fire**); context freezes (`.fiezel-ob-still`, modal `is-static`) with pre-applied `st-*` poses. Every state/expression/pose/reaction is authored static-safe — the tuple IS the frame; each reaction's *peak* frame must be its most legible frame (verified at 42px). Blink under any reduced-motion gate: strict no-blink — Appendix A-7, RESOLVED (17 R-5).
- **No information by animation, sound, or color alone:** every verdict survives with the mascot removed, muted, motionless, and the screen grayscale — persistent text ("Benar!" / "Belum tepat" + explanation / score numbers / verdict sentences), distinct icon *shapes* (check vs X), `aria-live` flow, distinct haptic rhythms. Mascot instances stay `aria-hidden`; the speaking state adds no ARIA announcements; captions (`FiezelSubtitle`) are the primary speech channel and run in every layer including silent L5. Flag for the UI team: exam-verdict pass/fail styling must not be color-only.
- Reactions never move focus, steal announcements, or block input; SFX volumes sit at/below UI gain and never duck the voice.
- Outfit items (G5′) are static geometry — they render identically with all motion off; item micro-motion is decorative-only and disabled under all three reduced-motion layers (19 §6.4).

> Source: `systems/13-reactions.md` §6 (per-reaction tables); `systems/14-voice-sfx.md` §5; `systems/09-states.md` §4.6; `systems/07-expressions.md` §4.

## 33. Asset Requirements

The required asset list (master prompt §38), mapped to this specification:

| Category | Asset | Status / source |
|---|---|---|
| **CHARACTER** | PAW master SVG (animation-ready, Direction C rig, correct nesting, lids, `fz-head`, per-instance ids) | **BUILT (v1.1)** — `assets/paw-master.svg` (neutral, checksum-verified G13 emblem, 0 pads, pill feet, outfit anchors reserved empty, R-3 literal convention). Integration: replaces `svgMarkup()` in `fiezel-mascot.js` per code-plan Phase 1, then re-exported to `assets/brand/paw-mascot-full.svg` (§8; assets/README) |
| | PAW rigged head SVG (avatars / head crops) | **BUILT (v1.1)** — `assets/paw-master-head.svg` (viewBox 56 −10 208 216, byte-equal geometry to the master's `#paw-head` subtree) |
| | Verification raster renders | **BUILT (v1.1)** — `assets/renders/paw-master-{512,148,88,42,28}.png` + `paw-master-head-{512,88}.png`, visually verified vs `audit/renders/full.png` |
| | PAW simplified static SVG (hidden layers stripped, for pure `<img>` use) | NEW — to generate in Phase 1 as `assets/brand/paw-mascot-simple.svg` (audit/01 §5 ADD; Direction A E3; code-plan §1.2) |
| | PAW full-body SVG + 512/1024 raster exports | regenerate from rig via `tools/export-mascot.mjs` + lock file (audit/01 §5; code-plan §1.3) |
| **EXPRESSIONS** | neutral, happy, excited, thinking, confused, encouraging, surprised, proud, celebrating, calm, sleepy (+ curious, welcoming, gentle-concern = the full 14) | Parameter tuples, no per-expression artwork — §15. **Proof v2 BUILT:** `systems/expressions-sheet-14.svg/.png` (14/14) + `smallsize-test-v2.png`; generator `systems/build_sheet.py` |
| **POSES** | idle, wave, point, think, read, study, listen, encourage, celebrate, jump, sit, walk (+ look, present, run, sleep = 16) | Parameter tuples — §16. **Proof v2 BUILT:** `systems/poses-sheet-16.svg/.png` (16/16, 0 pads, 16 emblems/rings); generator `systems/gen_poses_sheet.py`. `assets/marketing/mascot-poses/` regenerated as rig exports + checksum gate (Phase 1) |
| **OUTFITS (new, OA-2)** | OF-01…OF-08 registry items + `fz-outfit-*` anchors + `outfitFor` hook | Registry geometry normative in 19 §5. **Proof BUILT:** `systems/outfit-sheet.svg/.png` (8 variants); reference implementation `systems/gen_outfit_sheet.py`; anchors reserved empty in `paw-master.svg`; component hook + test-gate extensions open (Appendix B OF-F4/F5) |
| **STATES** | greeting, lesson start, correct, incorrect, completion, milestone, achievement, welcome back (+ the rest of the 19) | Runtime states — §17 |
| **MOTION** | entrance, exit, idle, blink, look, point, correct, incorrect, celebration, speaking, transition | Keyframe inventory — §18/§23; new+replaced keyframes listed in 10 §5.1 |
| **STORYBOARDS (v1.1)** | splash (8 frames), splash-lite (4 frames), onboarding (6 frames) | **BUILT** — `systems/storyboard-splash.svg/.png`, `storyboard-splash-lite.svg/.png`, `storyboard-onboarding.svg/.png`; generator `systems/gen_storyboards.py`; 7 flagged ambiguities → Appendix B. **OA-4: both splash sheets SUPERSEDED (kept as history); onboarding sheet remains current** |
| **STORYBOARD SPLASH v2 (new, OA-4)** | PAW STAMP splash (8 frames: letterform · gold bars · small wordmark · anticipation · slam · decay · still · exit) | **BUILT — SUPERSEDED by OA-5 (kept as history)** — `systems/storyboard-splash-v2.svg/.png`; generator `systems/gen_storyboard_splash_v2.py`; boards the superseded 11 §1S auto-slam design (incl. the deleted sheen/halo-flare) |
| **STORYBOARD SPLASH v3 (new, OA-5)** | PARTICLE FORMATION + PAW STAMP ON MULAI (9 frames: scatter cloud · mid-convergence · F locked + bars-as-particles · bars solidify/handoff · equalizer · settle+welcome · Mulai press · slam contact · stamp→onboarding) | **BUILT — frames F6–F7 SUPERSEDED by OA-6** (v4 auto-flow: no card, no press; F1–F5 + F8–F9 remain the visual reference) — `systems/storyboard-splash-v3.svg/.png`; generator `systems/gen_storyboard_splash_v3.py`; particles as scattered gold dots, no sheen/halo/glow anywhere, no mascot; boards 11 §1S-v3 (closer timings now per 11 §1S-v4.2) |
| **AUDIO / SFX (new, OA-7)** | The 27-file produced SFX library — splash/UI: `splash_intro`, `stamp_thud`, `button_tap`, `lesson_start`, `page_transition`, `error_system` · answers: `answer_correct`, `answer_correct_perfect`, `answer_wrong`, `answer_wrong_retry` · exams: `exam_complete`, `exam_pass`, `exam_result_reveal`, `exam_score_tick` · progress: `xp_gain`, `streak_5`, `streak_10`, `lesson_complete`, `level_up` · notifs: `notif_general`, `notif_streak_reminder`, `notif_achievement` · PAW (§G morphed): `paw_greet`, `paw_appear`, `splash_paw_appear` (byte-identical to `paw_appear`; RESERVED — m025-80), `paw_encourage`, `paw_celebrate` | **BUILT** — WAV 44.1kHz/16-bit masters `sfx/masters/*.wav` + web OGG `sfx/web/*.ogg` (~325 KB total); deterministic generators `sfx/generators/*_gen.py` + shared DSP lib `sfx/lib/fzsynth.py`; locked motif `sfx/lib/MOTIF.md`; spectrograms `sfx/spectrograms/`; QA evidence `sfx/qa/` (x30 fatigue renders, phone-speaker sims, overlay renders, morph A/B demo, `acceptance_audit.py` 27/27 PASS + `loudness_ladder.png`); reports `sfx/reports/`. Binding spec: `systems/20-sfx-system.md`. Open: MP3 fallback renders (20 §9 OI-1) |
| **QA HARNESS (new, v1.1)** | 5 automated gate drafts + coverage README | **BUILT (drafts)** — `implementation/tests/{e5-checksum,keyframe-rotation,pawprint-geometry,event-vocabulary,palette}-gate-test.js` + `README.md` (red→green schedule) |
| **Support** | Splash PAW layer + choreography rows (OWNER-gated), onboarding micro-react helper, `MASCOT_CHAIN` additions, panel-slot CSS/JS (`fz-paw-*`), speech bridge, 6 SFX `VOICES` entries *(OA-7: superseded — now the 27-file sample manifest, 20 §7)*, optional manifest `visemes` field, pose-consistency test gate | 11 §4.1; 12 §6; 14 §6; code-plan Phases 5–11 |

All assets derive from the one canonical rig (G11); every geometry change propagates to the `website/assets/mascot/` copy and the static twins. Every new asset must clear the 16 §5 same-test rubric (G14) and — if dressed — the 19 §7 outfit QA checklist.

## 34. Implementation Plan

Twelve phases (master prompt §39) mapped to priorities (§40). Do not implement everything at once; P0 items are the highest-impact character experiences.

**Engineering elaboration (new, v1.1): `implementation/code-plan.md`** — phase-by-phase code changes with repo line anchors verified against the checkout on 2026-08-27 (app.js 5507 lines, fiezel-mascot.js 526, …), a PR breakdown (PR-1…PR-12, each independently revert-safe), the dependency graph (critical path **1 → 2 → 3 → 4(+8)**; splash skippable; Phases 6/7/9/10/11 parallelize after), per-phase test gates, blast radius, and rollback. Highlights: Phase 1 = Direction A repairs + `RIG` const + `tools/export-mascot.mjs` exporter with `mascot-exports.lock.json` checksum gate (closes A-10-1) + BRAND-GUIDE/DESIGN-SYSTEM doc fixes — the built `assets/paw-master.svg` is the markup Phase 1 integrates; Phase 4 = 5 new states + `reward` + orphan wiring at verified app.js anchors; Phase 7 implements the `fz-paw-*` slot classes; Phase 11 = `fiezel-speech-bridge.js` + ~6 one-line facade emissions (G8). Notes on the plan's markers: every *"pending ruling 17-open-issue-rulings.md"* marker is now **resolved** exactly as the plan recommended (R-1 reward+alias, R-2 durations/wire format, R-3 literal convention, R-5 strict no-blink, R-6 feet 48×22 rx11); one genuinely new open item it surfaced — **confetti palette** `CONF_COLORS` `#F8CF4D`/`#4FC79B` vs G1 — remains open (Appendix B). Phase 1/4 additionally gain the OA-2 outfit anchors + `outfitFor` hook (19 §9-4, additive/G12-safe).

| Phase | Content | Spec sources | Priority |
|---|---|---|---|
| **1 — Clean PAW master asset** | Direction A repairs + Direction C rig into `fiezel-mascot.js`; re-export static twins; palette/doc reconciliation; checksum gate; sync website copy | §8; direction-a §3; direction-c §2–5 | **P0-1** (PAW redesign) |
| **2 — Expression system** | 14 tuples, lid/pupil/brow channels, small-size filters | §11–15; systems/07 | **P0-2** (core expressions) |
| **3 — Pose system** | 16 poses, feet params, pose exports regenerated (ring + one headphone colorway) | §16; systems/08 | **P0** for poses used by P0 states (idle, wave, point, listen, encourage, celebrate); **P1-13** for the rest (walk, run, sit, read, study…) |
| **4 — Animation / state system** | Keyframe replacements (rotation removal), 19-state machine, priorities/cooldowns, enter/exit set, wiring of orphan events | §17–18, §23; systems/09, 10 | **P0-3** (core idle) + P0 state plumbing; **P1-14** advanced transitions |
| **5 — Splash** | ~~OWNER decision first (full / lite / logo); then A1–A5 assets + choreography rows + test updates~~ *(decided 2026-08-28: OA-4 then OA-5 then OA-6 — re-scoped to the character-free §1S-v4 auto-flow splash: modules V3-A1…V3-A5 + gates V4-G1…V4-G5, prototyped in `splash-prototype/`)* | §19; systems/11 §1S-v4; splash-prototype/CONTRACT.md | **P0-4** — *un-gated (OA-4/OA-5/OA-6)* |
| **6 — Onboarding** | Companion upgrades per step, calm chain, handoff keyframe + bubble delay | §20; systems/11 §2 | **P0-5** |
| **7 — Lesson / question-panel layer** | Slots, `pawPanelMarkup`, lesson-event shim, per-screen decision table | §21–22; systems/12 | **P0-6** |
| **8 — Correct / incorrect reactions** | 13-reactions timelines (binding), tier-entry rule, `reward` event, gentle-concern costume | §24–25; systems/13 §1–2 | **P0-7 / P0-8** |
| **9 — Completion / milestone animations** | LESSON_COMPLETE arc; `level-up`; `milestone` + once-ever keys; WELCOME_BACK wiring | §26–27; systems/13 §3–4; 09 §2.10/2.13/2.15 | **P0-9** (lesson completion); **P1-12** (achievement/milestone states, welcome-back) |
| **10 — SFX integration** | 6 `VOICES` entries + cooldown table + `sfx-preview.html` audition | §29; systems/14 §3 | Correct/Celebration = existing sounds (already P0); new entries **P1** |
| **11 — Voice / viseme integration** *(if approved)* | `speaking` state + flap engine, speech bridge, `fiezel-speech` emissions, persona overlay; optional manifest visemes | §28; systems/14 §1–2; 09 §2.5/3.4 | **P1-10 / P1-11** (speaking animation, voice sync) |
| **12 — Final polish & QA** | §35 checklist + all acceptance checklists (10 §7, 12 §7); Appendix A resolutions verified; the 5 drafted gates adopted into `quality.yml` (each in the PR that turns it green) | §35; Appendix A; implementation/tests | closes every phase |

**P1 backlog addition (16 §4-A):** CI forced-alignment viseme tracks (`audio/manifest.json` `visemes` field) — named under master prompt §40 P1 "voice synchronization"; flap cycle stays the permanent fallback.

**P2** (only after P0+P1 are stable): advanced character interactions (hover/gaze extras beyond the shim), additional environmental animations (walk/run screen transitions, scene-ambient beats), experimental behaviors (amplitude-follower or phoneme viseme upgrade, Direction B proportion rebalance if ever revisited).

Sequencing rules embedded in the specs: Direction A repairs ship first even if anything else slips; the tier/anti-inflation rules ship with Phase 8 (not later — shipping the new rig with the old every-answer-max-celebration would worsen inflation); the splash phase may be skipped entirely without affecting any other phase.

## 35. QA Requirements

Master prompt §41 verification list, made concrete for this repo.

**Automated harness (new, v1.1): `implementation/tests/`** — five drafted Node gates + `README.md` (drift-hazard coverage map, per-gate pass/fail rules, current red/green status, red→green schedule; each gate enters `.github/workflows/quality.yml` in the same PR as the change that turns it green): `e5-checksum-gate-test.js` (A-10-1; twin byte-identity green today, manifest layer red until Phase 1), `keyframe-rotation-gate-test.js` (G4; red on the 9 shipped body rotations Phase 4 removes), `pawprint-geometry-gate-test.js` (G13; red on the shipped approximation emblem), `event-vocabulary-gate-test.js` (red on exactly `correct-streak` @ app.js:3836 — flips green with the R-1 fix), `palette-gate-test.js` (G1; red on the 2 off-palette poses + confetti `#F8CF4D`/`#4FC79B`). **OA-1 erratum:** the pawprint gate and its README were drafted before the pad retirement and still assert glyph coordinates *inside `fz-pads`/`fz-pads-l`*; on adoption those assertions flip to **zero pad instances** (the 15 §8 gate as amended — exactly one `fz-emblem` instance, `s=1.75` only). Tracked in Appendix B.

| §41 item | Concrete check |
|---|---|
| Correct proportions always | Same-character side-by-side at 22/42/88/148/512px vs `audit/renders/`; head-crop constants (178%/−8%) unchanged |
| Expressions consistent | All 14 tuples within Direction C clamps; ≤2 channels at max; proof-sheet regression vs `systems/expressions-sheet-14.png` (v2, 14/14; v1 `expressions-sheet.png` kept as history) |
| Animations don't get stuck | Generation-token interrupt tests (10 §6.2); transient auto-revert; `speak-end`/promise always closes the mouth; 400ms removal fallback on every exit |
| Enter/exit transitions work | No `display:none` toggles on mascot hosts (grep gate); every §23 variant fires on its context |
| PAW doesn't cover content / block buttons | C1–C7 invariants; tap-through over every anchor; protected-content-box audit at all breakpoints; `#quizNext` always reachable |
| SFX doesn't duplicate | One character-SFX voice per reaction; celebrate/success arpeggio never double-layered; cooldown table honored (14 §3.2) |
| Voice doesn't desynchronize | Stall gate ≤900ms; est-duration caps; degraded-event close; fail-early-never-flap verified per L1–L5 |
| Reduced-motion works | All three layers × every new JS timer (gaze, beat, confetti); frozen poses legible at 42px; wrappers early-return under app setting |
| Responsive layout works | Anchor matrix at 390×844, 844×390, 768×1024, ≥980w; zero CLS (Lighthouse) on question advance/reveal/teach/rotate |
| Performance acceptable | Idle ≤4 animated nodes; completion ≤9 + 46 confetti; 60fps spot-check mid-range Android with 3 live instances; no `will-change` blanket; no forced reflow (use `getAnimations()` restart) |
| No random asset substitutions | E5 gate: checksum/pose-consistency test across static twins + website copy; `paw-mascot-test.js` suite green; no new hex outside G1 (grep) |
| New regression nets | Keyframe assertion: no `rotate` on `fz-all/fz-body/fz-head/fz-face/fz-eyes`; `react()` warns on unknown events AND `app.js` contains no call outside the documented 22-event vocabulary (one sanctioned alias `correct-streak`→`reward`, 17 R-1); `splash-choreography-test.js` updated with any timing change; `onboarding-test.js` green |
| Pawprint glyph integrity (G13, new) | Five-way SHA-256 `e52cf230…f86d22` across `fiezel-paw.svg` / `ICONS.paw` / `direction-c.svg` / `gen_poses_sheet.PAWPRINT` / `paw-master.svg`; exactly ONE `fz-emblem` instance with the canonical transform; ZERO pad instances (OA-1); no legacy approximation signatures; no `#2B2118`; <74px exports need no pad check (moot), <57px use the palm-only emblem subset |
| Anti-copy (G14, new) | 16 §5 same-test rubric (10 rows) run per new asset/animation/sound — any single ✗ fails; palette scan ΔE<15 vs `#58CC02`/`#89E219` = zero pixels; derivation audit cites PAW spec sections, never "Duolingo does it this way" |
| Outfit QA (G5′, new) | Per item × pose × tier: 19 §7 checklist — grammar decomposition, G1-only scan (+`--fz-leaf` guard while OWNER-PENDING), keep-out overlap, same-character test with item ON at 88/512px, chest-glyph gate (1 emblem, 0 pads), tail ring, static-render identity, 16 §5 rubric rows 1–3/7/8 re-run dressed |

Success criteria (§42): IDENTITY · QUALITY · EXPRESSIVENESS · MOTION · INTEGRATION · SPLASH · ONBOARDING · LESSONS · FEEDBACK · CELEBRATION · SCALABILITY — each maps directly to sections 8–27 above and is testable through the acceptance checklists in `systems/10-motion.md` §7, `systems/12-lesson-layer.md` §7, and `systems/13-reactions.md` §5–6.

---

# Appendix A — Open Issues & Reconciliations (binding QA record)

Cross-check of the 8 system specs against each other and the audits. Items marked **RESOLVED** carry an explicit precedence declared by the specs themselves; items marked **OPEN** need one ruling (owner named) before the affected phase ships. Rulings for A-2, A-4 (secondary), A-5, A-6, A-7 and A-8 were issued 2026-08-27 in `systems/17-open-issue-rulings.md` and have been applied to the system specs; the original issue text below is kept as history. Nothing here is papered over in the body above.

**v1.1 status:** all rulings verified applied — 44/44 manifest edits landed per `systems/18-naming-and-rulings-log.md` §1 (application log + verification greps). **No A-item remains OPEN.** Remaining open work lives in Appendix B's current open list (storyboard ambiguities, outfit follow-ups, OWNER gates, confetti palette).

### A-1. 13-reactions deliberately refines 09-states (INCORRECT face, CORRECT holds) — RESOLVED by declaration
- 09 §2.6–2.8 keeps the shipped 1900ms hold for CORRECT lv1 and keeps **#6 Confused (with sweat, "sweat pop kept")** for the first wrong answer.
- 13 §1–2 and §7 tightens CORRECT lv1 to **≤1200ms** (1600/1900 reserved for lv2/lv3 *tier entries* only, with the tier-entry anti-inflation rule) and re-costumes the wrong-answer path as **#14 Gentle concern** (no sweat, no head-shake, ears +9/+9, ≤1000ms → encouraging).
- **Precedence:** 13 declares "reactions own timing/choreography of the four §19–22 moments" and lists these deltas explicitly in its §7. **13-reactions is binding** for the four reaction moments; 09 remains binding for state-machine plumbing (names, priorities, transitions, `wrongRow` logic — which 13 keeps). Direct contradiction eliminated: implementers must NOT ship 09 §2.8's sweat-pop on the wrong path.

### A-2. The `correct-streak` fix appears in 09, 10, 13 (and 12, 14) — RESOLVED (17 R-1)
- 09 §3.3 and 13 §1.3 **agree**: change the call site `app.js:3836` to a new first-class **`react('reward')`** event → Celebrating-lv2-with-Proud-accent, 1600ms, confetti 38, no `_mem.streak` touch, 4s cooldown; interim hotfix `badge-earned`. 13 supplies the full choreography.
- 10 §5.3 instead proposes a **component-side alias**: `correct-streak` → alias of `badge-earned` (→ `proud`), keeping the old event name.
- 12 §6d and 14 §6 record the defect loosely ("→ celebrating/proud").
- **These disagree in mechanism and resulting state.** Recommended resolution (consistent with the two most detailed and mutually-aligned specs): implement **09/13's `reward` event + call-site change**; if a defensive component-side alias is still wanted, alias `correct-streak` → `reward` (not `badge-earned`). 10 §5.3's alias line and the loose wordings in 12/14 are superseded. *Owner: state-machine implementer, Phase 4/8.*
- **RESOLVED (2026-08-27, 17 R-1):** `reward` event + call-site change to `pawReact('reward', {kind:'gems'})` wins; 13 §1.3 choreography binding; exactly one deprecation alias `correct-streak` → `reward`, removed one release after telemetry is clean; 10 §5.3's `badge-earned` alias rejected.

### A-3. Splash is a PROPOSAL requiring OWNER approval — CONFIRMED CONSISTENT
- 11 §0 states it in full (reverses **m025-80**; also touches m025-88's dwell); default config `logo` until sign-off; four open OWNER decisions listed in 11 §4.4.
- 12 §4's decision table independently agrees ("Splash: Absent — m025-80 stands; reintroduction needs sign-off"). No spec anywhere assumes the splash PAW exists. **Status: consistent; Phase 5 is gated.** **RESOLVED (2026-08-28, OA-4): the OWNER rejected reintroduction — m025-80 is permanent; Phase 5 is un-gated and re-scoped to the character-free PAW STAMP splash (11 §1S, §19).** *(OA-5, same day: re-scoped again to the §1S-v3 particle-formation design — still character-free, m025-80 undisturbed.)*

### A-4. State count 14 → 19 vs the master prompt's 15 states — RECONCILED; secondary discrepancies RESOLVED (17 R-2)
The master's 15 are a *canonical product vocabulary*; the runtime keeps 19 states because (a) 5 legacy states (`curious`, `hinting`, `sleepy`, `sad`, `love`) are load-bearing supporting states, and (b) CORRECT and CELEBRATING deliberately share one runtime state split by level. Mapping table in §17 is complete and lossless. **However, three secondary discrepancies inside the new-state definitions were OPEN (resolved below):**
- **Event naming:** 09 §3.2 says `speak-start`/`speak-end`; 10 §5.3 says `speech-start`/`speech-end`; 14 §2.1 uses `fiezel-speech` CustomEvents with `phase` values. One canonical wire format must be picked (recommended: 14's single `fiezel-speech` event at the facade + 09's `speak-start/end` as the `react()` vocabulary the bridge emits). *Owner: speech-bridge implementer, Phase 11.*
- **WELCOME_BACK duration:** 09 §1.2/2.10 = transient **2200ms** new state; 10 §5.3 implements it as `greeting {hold:1900}` + flick class; 11 §3 = **1400ms** transient. Recommend 09's 2200ms as the state-spec of record; 10/11 values superseded. *Owner: state implementer, Phase 4.*
- **LESSON_START:** 09 §2.11 = 1600ms, chain Curious→Happy, revert to idle; 10 §5.3 = `curious {hold:1100, then:'encouraging'}`. Recommend 09 (the state owner). Similarly `milestone` proud-hold: 10 §1.3/5.3 = 1200ms vs 13 §4.3 = 600ms — 13 wins per A-1 precedence.
- **RESOLVED (2026-08-27, 17 R-2):** wire format = 14's `fiezel-speech` CustomEvent at the voice facade + 09's `speak-start`/`speak-end` as the `react()` vocabulary, bridged by one `fiezel-speech-bridge` module (R-2a); WELCOME_BACK = 2200 ms per 09 §2.10 (R-2b); LESSON_START = 1600 ms per 09 §2.11 (R-2c); milestone proud-hold = 600 ms per 13 §4.3 (R-2d).

### A-5. Rotation-free rule vs 08-poses' R-arm +115 amendment — LEGAL; sign convention RESOLVED (17 R-3)
The amendment itself does not violate G4 (it is rotation of a limb around its own shoulder pivot; the rotation-free rule bans *body-mass* rotation only). 08 §0.2 formally extends Direction C's arm ranges to L −115…+130 / R −130…+115 for the chin-reach. **But the sign conventions collide:** 07 §2, 09 §2.4, and 10 §1.4 all write the thinking chin-paw as **armR −95** (semantic "raise = negative"), while 08 §1.5 writes the same gesture as **armR +96** ("literal SVG clockwise-positive values as serialized in `direction-c.svg`"). These are almost certainly the same physical pose expressed in two conventions, not two poses — but a rig built naïvely from mixed tables would raise the wrong arm direction. **Resolution required:** declare one canonical serialization (recommended: 08's literal-SVG values, since pose exports are generated from them) and republish the 07/09/10/13 arm values in that convention during Phase 1. *Owner: rig builder.*
**RESOLVED (2026-08-27, 17 R-3):** canonical = literal SVG clockwise-positive values as serialized (per element); the thinking chin-reach is armR literal +96° (07/09/10 corrected); symmetric cheer shorthands restated per side; 07 §2 tuples stay semantic per its §1.4 with the mirror rule (right-ear literal = −tuple); `gen_poses_sheet.py` earR serialization fixed; full conversion table in 17 R-3.

### A-6. Character Signature: two definitions (14 §4 "Pau Spark" vs 11 §1.3 "Gold Beat") — RESOLVED (17 R-4)
Same gesture DNA (welcoming spark + happy arcs + F4/A4/C5 motif), but conflicting allowlists and audio:
- 11 §1.3: splash + LEVEL_UP + MILESTONE only; **never in onboarding steps**; **no new audio asset** (the existing splash motif beats are the sound).
- 14 §4: first-greeting-of-session + level-pass/promotion + **onboarding completion**; a **new short-form SFX entry** (F4→A4→C5, ≤420ms) in the `VOICES` table.
- 09 §2.15 / 13 §4.3 additionally treat the milestone burst + one-octave-up chord as "the full Character Signature".
**Resolution required:** one allowlist and one audio decision (recommended reconciliation: gesture = the Spark everywhere; on the splash the audio is the existing b4/b5 beats per 11; elsewhere the 14 §4 short form; allowlist = union minus onboarding *steps*, with onboarding *completion* an OWNER taste call). *Owner: OWNER + audio lead, Phases 5/9/10.*
**RESOLVED (2026-08-27, 17 R-4):** one signature, named the **PAW Spark** (14 §4 choreography canonical; "Gold Beat" name retired); audio: splash = existing b4/b5 A4 beat (no new asset), first greeting = short form ≤420 ms, level-up/milestone = category-6 long form — one sound per occurrence; allowlist = splash (OWNER-gated) + first greeting + level-up + milestone; onboarding completion OWNER taste call, default EXCLUDED. **OA-4 update (2026-08-28): splash entry retired with the rejected mascot-splash — effective allowlist = first greeting + level-up + milestone.**

### A-7. Blink under OS reduced motion — RESOLVED (17 R-5)
07 §4 says reduced motion = "**zero motion — no blink loop**"; 09 §4.6 says IDLE under gate 1 allows a gentle single blink ("blinking is not vestibular motion"); 10 §5.5's explicit JS-gate list (micro-gaze, speaking beats, confetti) omits blink, implicitly siding with 09. Production BRAND-GUIDE §4 language is "the mascot does not react at all". **Resolution required:** pick one (recommended: the stricter 07/BRAND-GUIDE reading — no blink loop under any reduced-motion gate — since it matches shipped expectations and costs nothing). *Owner: motion implementer, Phase 4.*
**RESOLVED (2026-08-27, 17 R-5):** strict no-blink under any reduced-motion gate (OS, app setting, context freeze); 09 §4.6's IDLE single-blink allowance superseded; `_blinkLoop()` gains an explicit `matchMedia` gate on 10 §5.5's JS-gate list.

### A-8. Feet-capsule dimensions — RESOLVED (17 R-6)
selected-direction adopts B's "feet as clean pill capsules" without dimensions; 08 §0.2 uses **48×22 rx11** (current footprint, capsule-ized); Direction B §2 specified **42×18 rx9**. Recommend 08's values (preserves the current silhouette footprint; B's smaller feet belonged to B's rejected proportion set). *Owner: rig builder, Phase 1.*
**RESOLVED (2026-08-27, 17 R-6):** feet = pill capsules 48×22, rx 11, grouped `fz-legs`, rendered in front of the chest; Direction B §2's 42×18 rx9 rejected.

### A-9. Constraint sweep across all 8 system specs — VERIFIED
| Constraint | 07 | 08 | 09 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|
| Closed palette (G1) | ✔ §0/§6 | ✔ §0.3/§3 | ✔ §5 | ✔ (no color work) | ✔ §0 | ✔ C7 | ✔ §0 (no red flash) | ✔ (no visual assets) |
| No new accessories (G5) | ✔ (dressing only) | ✔ (no book/desk; verified §4) | ✔ | ✔ | ✔ (no new artwork) | ✔ | ✔ | ✔ |
| Tail ring inside `fz-tail-tip` (G6) | ✔ | ✔ D1 (proof sheet) | ✔ | ✔ §0.1 remap | ✔ | n/a | ✔ §3.1 | n/a |
| No game-mechanics changes (G7) | ✔ | ✔ | ✔ §0 scope guard | ✔ | ✔ | ✔ (wiring only) | ✔ | ✔ |
| Voice system never replaced (G8) | ✔ | n/a | ✔ §3.4 | ✔ | n/a | n/a | ✔ | ✔ §0.1 |
| Reduced-motion coverage (G9) | ✔ §4 | ✔ static-safe | ✔ §4.6 per state | ✔ §5.5 incl. JS timers | ✔ §1.5/§2.1 | ✔ §3b/§6a | ✔ §6 per reaction | ✔ §5.2 |
| No CLS (G10) | n/a | n/a | n/a | ✔ (transform/opacity enter/exit) | ✔ (overlay only) | ✔ C3 core invariant | ✔ (in-slot clamps) | n/a |
| Rotation-free body (G4) | ✔ | ✔ §4 audit | ✔ | ✔ §0 (+ fixes legacy CSS) | ✔ | ✔ | ✔ §0 | ✔ §0.2 |

One deliberate extension noted, sanctioned by the gate decision: Direction C adds pads to the **left** paw (`fz-pads-l`), argued as reuse of the existing pad motif (checklist A5 scored 2). Not a new accessory. *(v1.1 note: **moot** — OA-1 retired all hand pads; `fz-pads-*` nodes no longer exist. And the G5 column of this sweep now reads against G5′: the sweep stays valid because no system spec 07–14 introduces an item outside the 19 §5 registry.)*

### A-10. Known future-drift hazards (watch list)
1. The `website/assets/mascot/` component copy and the 8 static byte-copies have **no checksum gate yet** — every spec assumes the E5 gate ships in Phase 1; until it does, every geometry change is a manual 10-file sync. *(v1.1: gate drafted — `implementation/tests/e5-checksum-gate-test.js`; twin layer already green, manifest layer red until Phase 1 writes the lock file.)*
2. `fzPawSettle` in `style.css` rotates the paw-print *icon* −5° — legal (a mark, not the body) but flagged if OWNER wants total rotation hygiene (10 §0.2).
3. BRAND-GUIDE §2's `#F8CF4D` and DESIGN-SYSTEM §8's stale "no mascot" note must be corrected in the same change as Phase 1, or the docs will contradict the shipped art again.
4. `fz-m-sad` stays in the DOM as legacy; any future spec that resurrects it for the answer loop violates 13 §2.3. *(v1.1: not yet auto-gated — recommended 5-line addition to the Phase-8 reactions test, per tests/README "Gaps".)*
5. *(new, v1.1)* Confetti `CONF_COLORS` ships `#F8CF4D` + `#4FC79B` — outside G1. Untouched in Phase 1 (zero behavioral risk), allowlisted "confetti-only" in the palette gate, **pending an OWNER/spec ruling**: retint confetti to G1 (recommended — `#F8CF4D` is the exact doc-drift hex of item 3) or grow a sanctioned confetti sub-palette (code-plan §1.1; tests/README Gate 5).
6. *(new, v1.1)* `implementation/tests/pawprint-geometry-gate-test.js` + tests/README were drafted pre-OA-1 and still assert glyph coordinates inside `fz-pads*` groups; flip to zero-pads assertions on adoption (§35).

---

# Appendix B — v1.0 → v1.1 change log & CURRENT open list

## B-1. What changed in v1.1 (all dated 2026-08-27)

**Owner amendments (new top-of-document block):**
- **OA-1** chest-only pawprint glyph, hand pads retired → G13 added; P18/F5/F6 retired; supersession note added at the top of `systems/15-pawprint-alignment.md`; pad wordings amended in §8/§9/§16/§20/§24/§26/§30.
- **OA-2** outfit system approved → G5 replaced by G5′; new §8.1; §33 outfit rows; leaf-green `#8A9A5B` recorded OWNER-PENDING (§14).
- **OA-3** official naming PAW → sweep confirmed applied (18 §2–§3).
- **OA-4** *(added 2026-08-28)* splash ruling: mascot-splash proposal (11 §1.2) + splash-lite (11 §1.6) **REJECTED**, m025-80 permanent; **"PAW STAMP" approved and binding** (F logo → small bottom wordmark `min(30vw,132px)` → real-glyph paw slam-to-stamp closer; ≤2000ms; max quality bar) → §19 rewritten (no longer OWNER-gated), 11 §1S added as the normative spec, E7 flag retired, new assets `systems/storyboard-splash-v2.svg/.png` + `gen_storyboard_splash_v2.py` (v1 splash boards superseded, kept as history), SB/C dispositions below.
- **OA-5** *(added 2026-08-28, same day — supersedes OA-4's design)* splash ruling v3 **"PARTICLE FORMATION + PAW STAMP ON MULAI"**: gold sheen/halo after F+bars **DELETED** (no replacement); F + bars form via **particle point-cloud** (F first, bars still particles → solidify → dedicated **equalizer** takeover synced to the motif); paw slam-to-stamp **no longer auto-plays** — fires on the **Mulai** press, ≤1400ms press→onboarding, same slam/SFX identity; wordmark small/bottom unchanged → §19 rewritten to v3 (§19.2 keeps the OA-4 design as history), 11 §1S-v3 added as the normative spec (11 §1S marked superseded), close-timer/`VISIBLE_MS` model retired (splash rests on the welcome card), new assets `systems/storyboard-splash-v3.svg/.png` + `gen_storyboard_splash_v3.py` (v2 board superseded, kept as history), module contract `splash-prototype/CONTRACT.md`.
- **OA-6** *(added 2026-08-28, same day — supersedes OA-5's Mulai gating)* splash ruling v4 **"AUTO-FLOW: REMOVE MULAI"**: Mulai button + welcome card **REMOVED ENTIRELY** — splash flows automatically into onboarding; after settle (2140) the paw stamp **auto-plays @2200** (≤120ms gap, no dead beat), `onboarding-enter` ~3030, motion ends + onboarding legible ≤3600ms from t0; tap/Enter = skip forward (pre-settle→settle, settle-window→stamp start, during-stamp→instant completion via new `pawstamp.skip()`); reduced motion auto-plays the reduced stamp (~800ms) → §19 rewritten to v4 (§19.2/§19.3 keep v3/v2 as history), 11 §1S-v4 added as the normative spec (11 §1S-v3 Mulai clauses marked superseded; gate V3-G3 → V4-G1…G5), `splash-prototype/` reworked (CONTRACT.md v4 banner, NOTES.md §7, welcome card/`.fz-mulai` deleted from index.html + css, `pawstamp.arm(null)` standard path), storyboard v3 frames F6–F7 marked superseded, QA suite `dev/qa_v4*.py` + `dev/qa-v4/`.
- **OA-7** *(added 2026-08-28)* **total SFX redesign** per OWNER brief `FIEZEL-SFX-Brief-2.pdf`: 27 produced audio files (26 brief names + `stamp_thud`) under `sfx/` (masters WAV + web OGG, deterministic generators, locked "Ascent & Crown" motif `sfx/lib/MOTIF.md`), PAW sounds via the §G morphing pipeline (procedural cat textures — honesty note 20 §5), independent acceptance audit 27/27 PASS → new binding spec **`systems/20-sfx-system.md`**; §29 rewritten to point there (old motif-quotation design kept as history); supersession note added at 14 §3; §33 AUDIO/SFX row added; splash "slam + SFX identity" concretized as `splash_intro` + `stamp_thud`; open items in 20 §9 tracked as C-7/C-8 below.
- **OA-8** *(added 2026-08-28, same day — supersedes OA-7's §G deep-morph for the 4 PAW SFX)* **raw PAW textures, lightly polished** ("pakai yang mentah aja, tapi polish sedikit aja"): paw_greet/paw_appear(+splash alias)/paw_encourage/paw_celebrate re-rendered from the RAW cat textures with gentle-EQ/fades/hint-of-tail polish only — character fully retained (AM fingerprints ≈0.94-1.42 vs raw); morphed renders archived `sfx/qa/paw/morphed-v1/`; new permanent promo texture library `sfx/textures/` (raw+polished+OGG, Indonesian README, deterministic seeds 901-904); 20 §1/§3/§5 amended (§G kept as history), blind test MOOT → character audition `sfx/qa/paw_final_audition.wav`; QA tuple refresh = 20 OI-6; full v3 report `sfx/reports/paw.md`.
- **OA-9** *(added 2026-08-28, same day)* **`paw_greet` = THE FIEZEL SIGNATURE SOUND ("suara khas FIEZEL")**, crafted with extra care (two-chirp F4→A4 motif gesture, shimmer sheen, snappy tail); **`stamp_thud` RETIRED** — splash stamp plays `paw_greet` (js/sfx.js MANIFEST remap; master archived `sfx/qa/retired/`; `web/stamp_thud.ogg` kept for compatibility only); splash "slam + SFX identity" now = `splash_intro` + `paw_greet`.

**Rulings applied (17 R-1…R-6, via 18 §1 — 44/44 manifest edits):** `reward` event + one alias (R-1); `fiezel-speech` wire + `speak-start/end` vocabulary, WELCOME_BACK 2200ms, LESSON_START 1600ms, milestone proud-hold 600ms (R-2); literal-SVG sign convention + armR +96 chin-reach + `gen_poses_sheet.py` earR mirror fix (R-3); one signature "the PAW Spark" (R-4); strict no-blink under reduced motion (R-5); feet 48×22 rx11 (R-6). Appendix A headings A-2/A-4/A-5/A-6/A-7/A-8 carry the resolution lines; body sections §8/§15–§18/§24/§26/§28/§30/§32 updated to match.

**Naming sweep (18):** 280 word replacements across 19 files; master spec renamed `FIEZEL-PAU-…` → `FIEZEL-PAW-REDESIGN-SPECIFICATION.md`; `fz-pau-*` → `fz-paw-*` (44+ identifier renames in 12-lesson-layer); sanctioned historical exceptions logged in 18 §2.3 (directory/file names, `direction-a.svg` node ids, quoted misnomer mentions, `PAUSE_MS`).

**New assets registered (§33):** `assets/paw-master.svg` + `paw-master-head.svg` + 7 verification renders; `systems/expressions-sheet-14.svg/.png` + `smallsize-test-v2.png` (14/14); `systems/poses-sheet-16.svg/.png` (16/16, pad-free); `systems/outfit-sheet.svg/.png` + `gen_outfit_sheet.py`; `systems/storyboard-splash{,-lite}.svg/.png` + `storyboard-onboarding.svg/.png` + `gen_storyboards.py`; `systems/16-duolingo-landing-screenshot.png` (evidence capture); `implementation/code-plan.md`; `implementation/tests/` (5 gate drafts + README).

**New/updated spec surfaces:** OWNER AMENDMENTS block; G5′/G13/G14 in the constraint table; §8.1 outfit subsection; benchmark principles/amendments woven into §15–§30 per 16 §4's owning-spec map (A→§28, B→§18, C→§22, D→§28, E→§20, F→§27); §33 statuses; §34 code-plan integration; §35 harness + 3 new QA rows; Appendix A v1.1 annotations (A-9 pads note, A-10 items 5–6).

## B-2. CURRENT open list (the only open items as of v1.1) — with owners

**Storyboard ambiguities (source: 11 "Storyboard v1" appendix) — dispositions per OA-4, 2026-08-28.** SB-1…SB-5 and SB-7 lived entirely inside the rejected mascot-splash design and are **MOOT/RESOLVED-BY-REJECTION**; only SB-6 (onboarding-side) remains, and it is informational:

| # | Ambiguity | Disposition (2026-08-28) |
|---|---|---|
| SB-1 | ~~p3 `lookAt (+6,−3)` sign vs stage layout~~ | **MOOT (OA-4)** — no gaze rig on the splash; the rejected design's P9 never ships |
| SB-2 | ~~b6 arm-return spill into b8's still window~~ | **MOOT (OA-4)** — no arm, no Spark on the splash; the §1S table has no such overlap |
| SB-3 | ~~p4 eye treatment for the Spark's splash instance~~ | **MOOT (OA-4)** — the Spark's splash instance is retired with the design (§19, §30) |
| SB-4 | ~~F7 "optional second blink @ ~1620" vs still window~~ | **MOOT (OA-4)** — no eyes on the splash; nothing blinks in §1S |
| SB-5 | ~~Splash-lite has no absolute timestamps~~ | **MOOT (OA-4)** — splash-lite rejected outright; the A-3 variant question is closed (C-1) |
| SB-6 | Step-6 handoff timing is user-dependent (fires on "Mulai Belajar" tap after the 1900ms settle) | **UNCHANGED — informational**; onboarding-side, unaffected by OA-4 (Onboarding implementer, Phase 6) |
| SB-7 | ~~Returning-user −250ms trim has no per-beat split~~ | **MOOT (OA-4)** — former 11 §3 trim rows are void; any future WELCOME_BACK trim needs a new OWNER-reviewed row set against the §1S table |

**Outfit follow-ups (source: 19 §9):**

| # | Item | Status | Owner |
|---|---|---|---|
| OF-F1 | Master-spec G5→G5′ replacement + cross-reference | **DONE in v1.1** (constraint table, §8.1, OA-2) | Spec compiler |
| OF-F2 | `audit/02` §5.5 + checklist A5 and `08` §1.6 "no book prop" / §4 accessories line still state blanket no-new-accessories | Amendment pointers to 19 needed (the "no book" ruling itself stays valid until a buku registry row is proposed) | Doc maintainer, next doc pass |
| OF-F3 | Repo `BRAND-GUIDE.md` §1 "no hats" wording | OWNER-signed edit when the repo change lands (repo read-only this cycle) | OWNER + Phase 1 doc pass |
| OF-F4 | `fiezel-mascot.js`: add the 3 empty `fz-outfit-*` anchors + `outfitFor` context hook (additive, G12-safe; `gen_outfit_sheet.py` = reference; anchor contract incl. head-lean mirroring in assets/README §6) | Open | Component implementer, Phase 1/4 |
| OF-F5 | `paw-mascot-test.js` gate extensions: anchors present, ≤2 items, head-slot exclusivity incl. headphones, keep-out checks, `--fz-leaf` guard | Open | QA, Phase 12 |
| OF-F6 | OWNER sign-offs: (a) `--fz-leaf` `#8A9A5B` (+ΔE evidence vs banned greens); (b) curator additions OF-07 pensil / OF-08 topi tidur + beret-over-sun-hat choice; (c) the two Large/Full combos | **OWNER-PENDING** | OWNER |
| OF-F7 | Wire 19 §5 context columns into 09-states / 12-lesson-layer tables (which surfaces call `outfitFor`; outfit chosen before paint, G10) | Open | State + lesson-layer owners, Phase 4/7 |
| OF-F8 | 15-pawprint chest-only revision note + outfit emblem keep-out cross-reference | **DONE in v1.1** (supersession note at top of 15 includes the 19 §4.3-2 pointer) | Spec compiler |

**Carried-over OWNER gates & rulings (unchanged from v1.0 or newly surfaced):**

| # | Item | Owner |
|---|---|---|
| C-1 | ~~Splash: full PAW / splash-lite / logo-only (reverses m025-80); ≤2000ms budget vs m025-88 dwell~~ **CLOSED — DECIDED BY OWNER 2026-08-28 (OA-4):** full-PAW and splash-lite REJECTED, m025-80 permanent; "PAW STAMP" approved binding at ≤2000ms (the m025-88 dwell question is settled by the §1S accounting). **OA-5 same-day update:** design superseded by §1S-v3 (particle formation, equalizer, stamp on Mulai; autonomous motion ends 2100ms, splash rests on the welcome card — the dwell question stays closed). **OA-6 same-day update:** Mulai gating removed — §1S-v4 auto-flow (stamp auto-plays @2200, onboarding legible ≤3600ms; no rest state — the dwell question stays closed). Still open from the old bundle, now tracked as 11 §4.4 items 3–4: chime under reduced motion; step-5 `sleepy→calm` intent | ~~OWNER~~ residual items: OWNER (§4.4-3) + onboarding owner (§4.4-4) |
| C-2 | PAW Spark on onboarding completion — OWNER taste call, **default EXCLUDED** (17 R-4) | OWNER |
| C-3 | Confetti palette `#F8CF4D`/`#4FC79B` vs G1 (A-10-5) | OWNER + spec compiler, Phase 1/12 |
| C-4 | 16 §4-E optional "PAW introduces himself" beat in onboarding step 1 | OWNER |
| C-5 | R-4 residual "pads shown" wording in the Spark gesture + any remaining pad phrasing in 07/09/13 pose recipes (OA-1 makes them no-ops; textual cleanup pass) | Doc maintainer, next doc pass |
| C-6 | Pawprint/tests README pad assertions → zero-pads flip on adoption (A-10-6) | QA, Phase 1 |
| C-7 | *(OA-7)* SFX integration items: MP3 fallback renders for Safari/iOS + `canPlayType` pick (20 §9 OI-1); `sfx-preview.html` audition page update to the 27 files (OI-5); PAW Spark choreography re-sync to `paw_greet`'s two-chirp 0.88s profile (OA-8; OI-4) | Integrator + component implementer |
| C-8 | *(OA-7, amended by OA-8)* Human-ear sign-offs: ~~blind test of the 4 PAW morphs (§G.7)~~ **MOOT under OA-8** — replaced by the raw-character audition (`sfx/qa/paw_final_audition.wav`, 20 §8-4); x30 repetition-fatigue audition still pending (renders ready in `sfx/qa/`) | OWNER/QA at integration |

---

*End of specification (v1.1). Detailed sources: `audit/01-pau-assets.md`, `audit/02-brand-system.md`, `audit/03-usage-and-motion.md`; `directions/direction-a-evolution.md`, `direction-b-modernization.md`, `direction-c-expressive.md`, `selected-direction.md`; `systems/07-expressions.md` … `14-voice-sfx.md`; v1.1 additions `systems/15-pawprint-alignment.md` (as amended), `16-duolingo-benchmark.md`, `17-open-issue-rulings.md`, `18-naming-and-rulings-log.md`, `19-outfit-system.md`, `assets/README.md` (+ `paw-master.svg`), `implementation/code-plan.md`, `implementation/tests/README.md`. Master requirements: `fiezel-pau-mascot-redesign/references/master-prompt.md` §1–43.*
