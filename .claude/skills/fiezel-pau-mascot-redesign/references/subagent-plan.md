# 15-Subagent Orchestration Plan — FIEZEL Pau Redesign

Spawn exactly 15 subagents via `run_subagent`, organized in 4 waves. Waves 1 runs first; later waves read the workspace files produced by earlier waves. Within a wave, spawn all subagents in parallel in one turn.

All outputs go under `/home/user/workspace/pau-redesign/`. Every subagent brief must include: the output file path, the relevant master-prompt sections, the repo (`FIEZEL-APPS/FIEZEL-APPS`, access via `bash` with `api_credentials=["github"]`), and the hard constraints (evolution not replacement; no game-mechanics work; vector/SVG production; reduced-motion accessibility).

## Wave 1 — Audit (subagents 1–3, parallel)

1. **Pau Asset Auditor** → `audit/01-pau-assets.md`
   Clone/inspect the repo. Fetch and read every Pau/paw-mascot SVG and PNG (see `repo-map.md`). Diff duplicate copies, determine the authoritative version (use `FIEZEL-BRAND-MASCOT-VECTOR-HANDOFF.md` + git history). Document current anatomy: silhouette, proportions, colors (exact hex), path structure, layer separation, animation readiness. Output the KEEP / EVOLVE / REMOVE / ADD table (master prompt §3 step 4, §5, §6).

2. **Brand & Design-System Auditor** → `audit/02-brand-system.md`
   Inspect `assets/brand/`, `DESIGN-SYSTEM.md`, `design/redesign-v1/` tokens. Document logo/wordmark relationships, color palette, typography, iconography, illustration style, and the constraints these place on a redesigned Pau (§3 step 2).

3. **App Usage & Motion-Code Auditor** → `audit/03-usage-and-motion.md`
   Find every place Pau appears in the app (splash, onboarding, home, lessons, vocabulary, grammar, reading, map, progress, empty/success/error/loading states). Read `features/mascot/fiezel-mascot.js`, `fiezel-motion.css`, and the existing voice/audio system (workflows `audio-*`, neural voice). Document current character states/triggers the code already emits, and how the voice system works (§3 step 3, §24).

## Wave 2 — Design Exploration (subagents 4–6, parallel; read Wave 1 outputs)

4. **Direction A — Pau Evolution** → `directions/direction-a-evolution.md` (+ concept SVG at `directions/direction-a.svg`)
   Minimal but highly polished improvement of the authoritative Pau (§36).

5. **Direction B — Pau Modernization** → `directions/direction-b-modernization.md` (+ `directions/direction-b.svg`)
   Cleaner, more contemporary shape language while keeping identity (§36).

6. **Direction C — Pau Expressive** → `directions/direction-c-expressive.md` (+ `directions/direction-c.svg`)
   Stronger facial and body language while maintaining identity (§36).

   Each direction subagent must: start from the authoritative SVG paths, keep the same-character test (§6), and score itself on recognizability, personality, scalability, animation potential, brand fit, implementation complexity.

**Gate:** after Wave 2, the orchestrator compares the three directions, selects the strongest (record the decision and rationale in `directions/selected-direction.md`), and passes the selection to Wave 3. Optionally confirm the direction with the user before proceeding.

## Wave 3 — Character Systems (subagents 7–14, parallel; read Wave 1–2 outputs + selected direction)

7. **Expression System Designer** → `systems/07-expressions.md`
   The 14-expression library (§8) + face design system: eyes, mouth, brows, gaze (§9). Define reusable facial components as SVG layers.

8. **Pose System Designer** → `systems/08-poses.md`
   The 16-pose library (§10), each pose consistent with the base model and animation-friendly.

9. **State System Designer** → `systems/09-states.md`
   The 15 character states (§11). For each: expression, pose, body/facial movement, gaze, transition, duration, optional SFX/voice behavior. Map states to the triggers found in audit 03 (ANSWER_CORRECT etc.) without touching game mechanics (§4).

10. **Motion System Designer** → `systems/10-motion.md`
    Idle/reaction/celebration/thinking/speaking motion language (§12), motion principles (§13), enter/exit transitions (§18), cross-screen continuity transitions (§27). Include concrete CSS/JS animation specs compatible with `fiezel-motion.css` conventions.

11. **Splash & Onboarding Designer** → `systems/11-splash-onboarding.md`
    Character-driven splash sequence with timings (§14) and onboarding companion behavior (§15). Keep splash short; never delay app access.

12. **Lesson Character-Layer Designer** → `systems/12-lesson-layer.md`
    The reusable PAU CHARACTER UI LAYER around question panels (§16), positioning system (§17), mascot↔panel relationships (§28), character scale tiers (§29), responsive rules (§32). Pau must never cover text/buttons or destabilize layout.

13. **Reaction Designer** → `systems/13-reactions.md`
    CORRECT (§19), INCORRECT — supportive, never punishing (§20), LESSON_COMPLETE (§21), MILESTONE tier (§22).

14. **Voice & SFX Integration Designer** → `systems/14-voice-sfx.md`
    Speech/viseme mouth animation (§23), integration mapping with the existing neural voice system — never replace it (§24), character SFX categories (§25), the FIEZEL Character Signature (§26), accessibility/reduced-motion behavior (§33).

## Wave 4 — Compile & QA (subagent 15; reads everything)

15. **Specification Compiler & QA** → `FIEZEL-PAU-REDESIGN-SPECIFICATION.md`
    Compile all workspace outputs into the single 35-section FIEZEL PAU REDESIGN SPECIFICATION (§37), including the required asset list (§38), 12-phase implementation plan (§39), P0/P1/P2 prioritization (§40), and QA checklist (§41). Cross-check every section against the success criteria (§42) and consistency rules (§34, §35). Flag contradictions between subagent outputs instead of papering over them. Consider `extended_context: true` for this subagent.

## Orchestrator responsibilities

- Verify each wave's output files exist and are non-trivial before launching the next wave; re-message a subagent that under-delivered instead of spawning replacements.
- Keep every objective under ~2000 characters — point subagents at workspace files and `references/` instead of pasting content.
- Preload this skill into every subagent via `preload_skills`.
- After Wave 4, review the final spec yourself against §41–§42 before sharing it with the user.
