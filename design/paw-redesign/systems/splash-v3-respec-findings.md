# Splash v3 re-spec — findings & change log (2026-08-28)

Task: document the OWNER v3 ruling "PARTICLE FORMATION + PAW STAMP ON MULAI" (OA-5, 2026-08-28, same-day supersession of OA-4's design). Binding implementation record: `splash-prototype/CONTRACT.md`. No prototype code touched (js/css/index.html owned by other subagents); repo checkout untouched.

## The ruling (as documented)

1. Gold sheen/halo/glow after F+bars: **DELETED**, no replacement beat (`fz-logo-sheen`, slam halo flare, ambient halo pulse, all glow/bloom incl. canvas shadowBlur).
2. F + two bars form via a **futuristic particle point-cloud** — F completes first (~950ms) while bars are still particles; the instant the bars solidify (~1150ms, `bars-solid`) a dedicated **equalizer animation** takes them over, synced to the existing motif; settle to exact logo proportions 1900–2100ms.
3. Paw **slam-to-stamp no longer auto-plays** — fires on the user's **Mulai** press on the welcome card, ≤1400ms press→onboarding, stamp expands as the transition itself. Slam + SFX identity kept (thud retuned 110→48Hz per CONTRACT). Splash **rests** on the welcome card: close-timer/`VISIBLE_MS` model retired.
4. Wordmark stays small at the bottom per v2 (`min(30vw,132px)`), reveal 1200–1500ms.

## Files changed

1. **`systems/11-splash-onboarding.md`**
   - §0 banner: OWNER RULING v3 (OA-5) paragraph prepended above the OA-4 record.
   - §1S retitled "(auto-slam) — SUPERSEDED BY OWNER v3" with status blockquote; kept as history. Carried forward: wordmark sizing (§1S.3 P2), glyph geometry/recolor (§1S.7), slam choreography identity, thud identity.
   - New **§1S-v3** (binding): v3.1 concept/stage layout · v3.2 binding timeline table (0–950 F formation / 700–1150 bar gathering / 1150–1900 equalizer, wordmark 1200–1500 / 1900–2100 settle+welcome / Mulai→stamp ≤1400ms→onboarding) · v3.3 motion spec P1–P6 · v3.4 deleted-sheen negative spec · v3.5 SFX mapping (F2@0 · F3@300 · C4@520 · F4@950 · A4@1150 · C5@~1400 · G5@1900 + eq-tick + thud 110→48Hz) · v3.6 reduced motion · v3.7 skip behavior · v3.8 degradation ladder (5 tiers; fewer particles ~500–700 → static formation fallback) · v3.9 modules V3-A1…A5 + gates V3-G1…G5.
   - §1S.8, §3, §4.1, §4.4 annotated to v3; Storyboard v2 section marked superseded; new Storyboard v3 section (9-frame table).

2. **`systems/gen_storyboard_splash_v3.py`** (new, ~367 lines) — v2-style generator with particle point-cloud renderer (seeded lerp+swirl, targets from F/bar rects), equalizer mode on flogo(), welcome card + Mulai, paw glyph, no halo anywhere. Iterated twice (F3 bar-cluster tightening; F7 recomposed to v2-style anticipation over dimmed card).

3. **`systems/storyboard-splash-v3.svg` + `.png`** (new, binding) — 9 frames: F1 scatter (0ms) · F2 mid-convergence (~500) · F3 F locked, bars as particles (~950) · F4 bars solidify/handoff (1150) · F5 equalizer (1150–1900) · F6 settle+welcome (1900–2100) · F7 Mulai press (anticipation 240ms) · F8 slam contact (~press+330ms) · F9 stamp→onboarding (≤1400ms). PNG visually verified clean, style matches v2 sheet. v2 sheet kept as history.

4. **`FIEZEL-PAW-REDESIGN-SPECIFICATION.md`**
   - OWNER AMENDMENTS: intro updated (OA-1…OA-3 + two 2026-08-28 rulings); OA-4 row annotated "same-day supersession: see OA-5"; new **OA-5** row (ruling + effects).
   - **§19 rewritten to v3**: new title; OA-5 banner; §19.1 binding design (4 acts, timeline, deleted-sheen negative spec, SFX remap + thud 110→48Hz, resilience/degradation/reduced-motion/skip, storyboard v3 binding); §19.2 keeps the full OA-4 "PAW STAMP" auto-slam text verbatim as history ("do not implement") with a what-survives note.
   - §30 Spark allowlist note: OA-5 splash likewise character-free (allowlist unchanged).
   - §33: STORYBOARD SPLASH v2 row → SUPERSEDED (kept as history); new STORYBOARD SPLASH v3 row (BUILT + BINDING, 9 frames).
   - §34 Phase 5 row: re-scoped to §1S-v3 modules/gates, refs CONTRACT.md, un-gated (OA-4/OA-5).
   - Appendix A-3: OA-5 re-scope annotation (m025-80 undisturbed).
   - Appendix B B-1: OA-5 bullet (ruling, §19/§1S-v3 rewrites, VISIBLE_MS retirement, new v3 assets, v2 board superseded).
   - Appendix B C-1: OA-5 same-day update (design → §1S-v3; dwell question stays closed — autonomous motion ends 2100ms, splash rests).

## Consistency sweep result

- Grep for sheen/halo/VISIBLE_MS/auto-slam across the master spec: every remaining mention is inside §19.2 history (intentionally verbatim) or is the v3 negative spec itself. No live/binding text still claims the sheen or the auto-slam.
- `systems/splash-v2-respec-findings.md` left untouched (dated historical log).
- OA numbering consistent: 11-doc §0 banner, storyboard section, and master spec all say OA-5.
