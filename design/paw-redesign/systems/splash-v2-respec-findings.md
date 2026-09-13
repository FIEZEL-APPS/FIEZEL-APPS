# Splash v2 re-spec — subagent completion report (2026-08-28)

Task: apply the OWNER ruling (OA-4, 2026-08-28) rejecting the "PAW lights the logo" mascot splash and spec the binding "PAW STAMP" replacement. All 3 deliverables done. Repo checkout (`fiezel-repo/`) and `splash-prototype/` untouched.

## 1. systems/11-splash-onboarding.md — rewritten (COMPLETE)
- §0 ruling banner (OA-4); §1/§1.2/§1.6 marked **REJECTED BY OWNER 2026-08-28**, history kept struck-through.
- New binding **§1S "PAW STAMP"** spec: §1S.1 stage layout, §1S.2 beat/timeline table (≤2000ms: b1–b7 at 0.62× + s1 anticipation @900, s2 slam contact @1230, s3 spring settle @1320, s4 still @1580, exit 1700–2000; skippable; VISIBLE_MS 3400→2000), §1S.3 per-phase motion P1–P6 with easing curves, §1S.4 SFX (reused pitch motif + new STAMP THUD slot: F2 87→49Hz sine + noise, −6dB, ≤300ms tail), §1S.5 reduced-motion static composition, §1S.6 degradation ladder, §1S.7 glyph geometry lock + splash-only gold recolor (#FFDE59→#FFC700→#E6A800), §1S.8 asset/gate rows S-A1…S-G4, E7 flag retired.
- Wordmark reduction quantified: `min(52vw,238px)` → **`min(30vw,132px)`** (202.8→117px @390px ref, −42%, cap −45%); padding-bottom 17vh → `calc(max(6vh,44px)+env(safe-area-inset-bottom))`; tagline 12→9px; settle travel 15→9px.
- Timing consistency fix applied during boarding: b7 settle duration 560→**420ms** so the wordmark is fully seated at 1080ms, 150ms before slam contact (P2 header + table row + overlap-discipline sentence updated).
- §3 returning-user rows voided (SB-7 moot); §4.1/§4.2 superseded/retired; §4.4 decisions 1–2 DECIDED, 3–4 open; Storyboard v1 splash sheets marked SUPERSEDED; SB-1…5,7 MOOT (SB-6 stays); new "Storyboard v2 — PAW STAMP (BINDING)" appendix section.

## 2. systems/storyboard-splash-v2.svg / .png — built + verified (COMPLETE)
- 8 frames (letterform · gold bars · small wordmark · s1 anticipation · s2 SLAM+THUD · impact decay · s3/s4 settle+still · exit), timestamp + beat + SFX under every frame, same sheet style as v1.
- Uses ONLY the real actors: `logoMarkup()` F rects, `fiezel-wordmark.svg` rects (small, bottom), `fiezel-paw.svg` exact geometry (gold gradient per §1S.7). **No cat mascot anywhere.**
- Generator: `systems/gen_storyboard_splash_v2.py` (standalone; deliberately does NOT import gen_storyboards.py, which regenerates old sheets on import).
- Iterated 3 renders: fixed missing wordmark in F4, note/wordmark collisions in F4/F6/F7/F8, note/ring collision in F6. Final render visually verified clean.

## 3. FIEZEL-PAW-REDESIGN-SPECIFICATION.md — updated (COMPLETE)
- §19 rewritten: "PAW STAMP (OWNER-approved 2026-08-28, binding)" — no longer OWNER-gated; full design summary; storyboard v1 splash sheets superseded; SB/returning-user dispositions; points to 11 §1S.
- Top OWNER AMENDMENTS table: new **OA-4** row.
- Appendix B-1: OA-4 bullet (dated 2026-08-28) in the owner-amendments block.
- Appendix B-2: SB table converted to dispositions — SB-1…SB-5, SB-7 **MOOT (OA-4)**; SB-6 unchanged/informational. C-1 **CLOSED — DECIDED BY OWNER 2026-08-28**; residual items (chime under reduced motion, sleepy→calm) tracked as 11 §4.4 items 3–4.
- Consistency sweep: §30 R-4 allowlist + Appendix A-6 resolution annotated (Spark splash instance retired; effective allowlist = first greeting + level-up + milestone); §33 storyboard rows (v1 superseded, v2 BUILT+BINDING row added); Appendix A-3 resolved (Phase 5 un-gated, re-scoped to character-free PAW STAMP).

## Files
- Modified: `pau-redesign/systems/11-splash-onboarding.md`, `pau-redesign/FIEZEL-PAW-REDESIGN-SPECIFICATION.md`
- Created: `pau-redesign/systems/gen_storyboard_splash_v2.py`, `pau-redesign/systems/storyboard-splash-v2.svg`, `pau-redesign/systems/storyboard-splash-v2.png`, this report.
