# 18 — Naming Sweep & Rulings Application Log

Applicator: Naming & Rulings Applicator · Date: 2026-08-27
Scope: (1) application of every edit in `systems/17-open-issue-rulings.md`'s R-1…R-6 manifests; (2) project-wide "Pau" → **PAW** naming sweep; (3) master-spec rename; (4) master-spec naming block + Appendix A resolution marks.
Work confined to `pau-redesign/`; `fiezel-repo/` untouched (per 17 application note 4, the R-1/R-2a/R-5 code changes are implementation-wave work, not spec edits).

---

## 1. Rulings applied (Task 1) — 44/44 manifest edits in place

Every edit was applied by unique-substring match within the stated section (line numbers treated as advisory per 17 application note 1). "Applied exactly" = old text matched and was replaced with the manifest's new text verbatim, including the `17 R-n` traceability strings.

| Manifest edit | Target | Status |
|---|---|---|
| R-1 #1 (§5.3 `reward` line) | `systems/10-motion.md` | Applied exactly |
| R-1 #2 (§7 checklist) | `systems/10-motion.md` | Applied exactly |
| R-1 #3 (§6d call-site fix) | `systems/12-lesson-layer.md` | Applied exactly |
| R-1 #4 (§6 table row) | `systems/14-voice-sfx.md` | Applied exactly |
| R-2 #1 (`speak-start/end` react line) | `systems/10-motion.md` | Applied exactly |
| R-2 #2 (SPEAKING loop policy) | `systems/10-motion.md` | Applied exactly |
| R-2 #3 (voice hookup / bridge) | `systems/10-motion.md` | Applied exactly |
| R-2 #4 (interrupt rule P13) | `systems/10-motion.md` | Applied exactly |
| R-2 #5 (`welcome-back` 2200 ms) | `systems/10-motion.md` | Applied exactly |
| R-2 #6 (WELCOME_BACK 2200 ms) | `systems/11-splash-onboarding.md` | Applied exactly |
| R-2 #7 (`lesson-start` 1600 ms) | `systems/10-motion.md` | Applied exactly |
| R-2 #8 (`milestone` proud-hold 600 ms) | `systems/10-motion.md` | Applied exactly |
| R-2 #9 (§1.3 milestone row) | `systems/10-motion.md` | Applied exactly |
| R-2 #10 (speech-bridge handoff note) | `systems/09-states.md` | Applied exactly |
| R-3 #1 (§2 preamble, literal arm signs) | `systems/07-expressions.md` | Applied exactly |
| R-3 #2 (Thinking row armR +96) | `systems/07-expressions.md` | Applied exactly |
| R-3 #3 (§1.2 row 4) | `systems/09-states.md` | Applied exactly |
| R-3 #4 (§2.4 THINKING pose) | `systems/09-states.md` | Applied exactly |
| R-3 #5 (§2.7 CELEBRATING pose) | `systems/09-states.md` | Applied exactly |
| R-3 #6 (§1.4 THINKING) | `systems/10-motion.md` | Applied exactly |
| R-3 #7 (§6 diagram arm-R) | `systems/10-motion.md` | Applied exactly |
| R-3 #8 (§1.3 lv-3 row) | `systems/10-motion.md` | Applied exactly |
| R-3 #9 (§1.2 lv2 row) | `systems/13-reactions.md` | Applied exactly |
| R-3 #10 (§1.2 lv3 row) | `systems/13-reactions.md` | Applied exactly |
| R-3 #11 (§1.3 reward table) | `systems/13-reactions.md` | Applied exactly |
| R-3 #12 (§3.1 timeline) | `systems/13-reactions.md` | Applied exactly |
| R-3 #13 (§4.2 cheer −120°) | `systems/13-reactions.md` | Applied exactly |
| R-3 #14 (§4.3 Act II cheer −120°) | `systems/13-reactions.md` | Applied exactly (same cell text as #13; both occurrences replaced) |
| R-3 #15 (§5 table, 4 cells: lv2 / lv3 / LESSON_COMPLETE / level-up) | `systems/13-reactions.md` | Applied as 4 separate cell edits per 17 application note 2, each tagged `(17 R-3)` |
| R-3 #16 (§0.2 earL/earR row) | `systems/08-poses.md` | Applied exactly |
| R-3 #17 (earR serialization) | `systems/gen_poses_sheet.py` | **Found already applied** on arrival (concurrent editor had committed `rotate({-d["earR"]} 212 52)` with a `17 R-3` comment; text semantically identical to the manifest). Proof sheet regenerated per 17 application note 3: ran `gen_poses_sheet.py` → `systems/poses-sheet-16.svg` (the generator's current output) + rendered `systems/poses-sheet-16.png` (1800 px). |
| R-3 #18 (07 §2 footnote, flag 1) | `systems/07-expressions.md` | Applied exactly — footnote inserted directly under the §2 table |
| R-4 #1 (11 §1.3 heading/first sentence) | `systems/11-splash-onboarding.md` | Applied exactly |
| R-4 #2 (11 §1.3 reuse policy) | `systems/11-splash-onboarding.md` | Applied exactly |
| R-4 #3 (14 §4 heading) | `systems/14-voice-sfx.md` | Applied exactly |
| R-4 #4 (14 §4 Sound paragraph) | `systems/14-voice-sfx.md` | Applied exactly (rest of the sentence — "beats 1/2/3 … land exactly on the three notes" — kept, still true of the gesture/motif rhythm) |
| R-4 #5 (14 §4 allowlist block) | `systems/14-voice-sfx.md` | Applied exactly — header + 5 new bullets replace the old 3-bullet list |
| R-4 #6 (09 §2.15 SFX slot row) | `systems/09-states.md` | Applied exactly |
| R-4 #7 (13 §4.3 signature row) | `systems/13-reactions.md` | Applied exactly |
| R-5 #1 (09 §4.6 IDLE row) | `systems/09-states.md` | Applied exactly |
| R-5 #2 (10 §5.5 item 1) | `systems/10-motion.md` | Applied exactly |
| R-6 #1 (08 §0.2 feet sentence) | `systems/08-poses.md` | Applied exactly |

No edit required content adjustment; every old-text string matched its target file uniquely (R-3 #13/#14 intentionally as a pair). `directions/direction-b-modernization.md` untouched per the R-6 note (historical record).

---

## 2. PAW naming sweep (Task 2)

Rule: standalone character name `Pau` → `PAW`, `PAU` → `PAW`, `Paus` (plural) → `PAWs`, case-sensitive with word boundaries (so `pause`/`PAUSE_MS`, lowercase file/id tokens, and `pawReact` etc. were never touched).

### 2.1 Word replacements per file (Pau/PAU/Paus → PAW)

| File | Replacements |
|---|---|
| `FIEZEL-PAW-REDESIGN-SPECIFICATION.md` | 37 (34 `Pau`, 3 `PAU`) |
| `assets/README.md` | 1 |
| `audit/01-pau-assets.md` | 7 |
| `audit/02-brand-system.md` | 15 |
| `audit/03-usage-and-motion.md` | 3 |
| `directions/direction-a-evolution.md` | 3 (2 `Pau`, 1 `PAU`) |
| `directions/direction-b-modernization.md` | 2 (1 `Pau`, 1 `PAU`) |
| `directions/direction-c-expressive.md` | 10 (9 `Pau`, 1 `PAU`) |
| `directions/selected-direction.md` | 2 (1 `Pau`, 1 `PAU`) |
| `systems/07-expressions.md` | 13 |
| `systems/08-poses.md` | 5 |
| `systems/09-states.md` | 6 |
| `systems/10-motion.md` | 4 |
| `systems/11-splash-onboarding.md` | 53 (52 `Pau`, 1 `Paus`→`PAWs`) |
| `systems/12-lesson-layer.md` | 47 (44 `Pau`, 3 `PAU`) |
| `systems/13-reactions.md` | 11 |
| `systems/14-voice-sfx.md` | 9 |
| `systems/15-pawprint-alignment.md` | 3 |
| `systems/16-duolingo-benchmark.md` | 49 |
| **Total** | **280** |

`'Pau Spark'` → `'PAW Spark'` per R-4 wherever it was a live use (14 §4 via manifest; master spec §30).

### 2.2 Identifier renames per the code-plan Phase 7 errata (`fz-pau-*` → `fz-paw-*`)

Verified against `implementation/code-plan.md` §7.1: no `fz-pau-*` string exists in the real repo, so the rename is zero-cost and the paw names are the implementable ones.

| File | Rename | Count |
|---|---|---|
| `systems/12-lesson-layer.md` | `fz-pau-` → `fz-paw-` (slot/above/corner/side/peek/panel + `--fz-pau-size`/`--fz-pau-headroom` vars) | 44 |
| `systems/12-lesson-layer.md` | `has-pau-` → `has-paw-` | 4 |
| `systems/12-lesson-layer.md` | `fzPauSlot` → `fzPawSlot` (In/Out keyframes) | 4 |
| `systems/12-lesson-layer.md` | `PAU_SLOTS` → `PAW_SLOTS` (JS const) | 2 |
| `FIEZEL-PAW-REDESIGN-SPECIFICATION.md` | `fz-pau-slot` → `fz-paw-slot` | 1 |
| `systems/11-splash-onboarding.md` | proposed config enum `splash: 'pau'` → `'paw'` (E7 row; constant not yet in repo) | 1 |

### 2.3 Sanctioned exceptions — deliberately NOT changed

- `pau-redesign/` directory path and every reference to it (real directory).
- `/home/user/workspace/fiezel-pau-mascot-redesign/…` references (real directory, verified to exist).
- `audit/01-pau-assets.md` filename and all references to it (real file, not in rename scope).
- All `pau-*` SVG node ids quoted in `directions/direction-a-evolution.md` (`pau-all`, `pau-torso`, `pau-head`, `pau-eye-l/r`, `pau-tail-*`, `pau-notes`, …): these are the literal ids serialized inside the real file `directions/direction-a.svg`; renaming the prose would break the correspondence with the shipped asset. (Its "stable `id` with prefix `pau-`" rule statement kept for the same reason.)
- `implementation/code-plan.md` §7.1 errata quotes of the old class names (`fz-pau-slot`, `has-pau-corner`, `fzPauSlotIn/Out`, `fz-pau-*` ×3): kept as the historical record of the deviation; surrounding prose adjusted to past tense (see §5).
- `systems/17-open-issue-rulings.md`: excluded from the word sweep — its remaining "Pau" strings are deliberate historical quotes (the "Pau Spark" renamed-from record and manifest old-text cells). Its reference to the old spec filename WAS updated (see §3).
- `'PAW si Kucing Geometris'` kept as-is everywhere (already correct).
- Quoted repo asset names (`paw-mascot-*.svg`, `fiezel-paw.svg`) untouched (already correct).
- Historical-mention "Pau" retained inside the three rewritten naming notes and the Appendix A-6 issue title (see §4/§5) — mentions of the misnomer, not uses.
- `PAUSE_MS` / `GAP_MS` prosody constants in `audit/03-usage-and-motion.md` (real repo code, `PAU` here is part of "PAUSE").

---

## 3. Master-spec rename (Task 3)

- `FIEZEL-PAU-REDESIGN-SPECIFICATION.md` → **`FIEZEL-PAW-REDESIGN-SPECIFICATION.md`** (file moved).
- Title line `# FIEZEL PAU REDESIGN SPECIFICATION` → `# FIEZEL PAW REDESIGN SPECIFICATION`.
- Old-filename references fixed (1 each): `systems/17-open-issue-rulings.md`, `implementation/code-plan.md`, `implementation/tests/README.md`. Grep confirms zero remaining `FIEZEL-PAU-REDESIGN` strings under `pau-redesign/`.

---

## 4. Master-spec updates (Task 4)

- **Naming block (line 7) rewritten:** PAW is the official name; "Pau" declared a project-era misnomer, corrected throughout the document set on 2026-08-27, with a pointer to this log. Same-character continuity and the `fiezel-paw.svg` brand-stamp note preserved.
- **Appendix A preamble:** one sentence added noting the 2026-08-27 rulings in `systems/17-open-issue-rulings.md` and that the original issue text is kept as history.
- **A-2** heading → `RESOLVED (17 R-1)` + one-line ruling (reward event + call-site change; one deprecation alias; badge-earned alias rejected).
- **A-4** heading → `RECONCILED; secondary discrepancies RESOLVED (17 R-2)` + one-line ruling (fiezel-speech CustomEvent + speak-start/end vocabulary via one bridge; WELCOME_BACK 2200 ms; LESSON_START 1600 ms; milestone proud-hold 600 ms); "are OPEN" → "were OPEN (resolved below)".
- **A-5** heading → `LEGAL; sign convention RESOLVED (17 R-3)` + one-line ruling (literal SVG clockwise-positive canonical; armR +96 chin-reach; mirror rule; 07 tuples stay semantic; generator fixed).
- **A-6** heading → `RESOLVED (17 R-4)` + one-line ruling (one signature, the PAW Spark; context-dependent audio; union allowlist; onboarding completion OWNER-gated default excluded). Historical issue title's `"Pau Spark" vs "Gold Beat"` kept verbatim (it names the two retired labels).
- **A-7** heading → `RESOLVED (17 R-5)` + one-line ruling (strict no-blink under all reduced-motion gates; `_blinkLoop()` gate).
- **A-8** heading → `RESOLVED (17 R-6)` + one-line ruling (48×22 rx 11 capsules, `fz-legs`, Direction B's 42×18 rejected).
- All original A-2…A-8 bullets/history left intact; resolutions appended, nothing deleted.

---

## 5. Minimal adjustments beyond the literal manifests (each logged with reason)

| File | Adjustment | Reason |
|---|---|---|
| `FIEZEL-PAW-REDESIGN-SPECIFICATION.md` §30 | "Two sibling definitions exist and **must be unified before implementation (Appendix A-6)**" → "existed and **were unified by ruling (Appendix A-6 — RESOLVED, 17 R-4…)**"; closing "recorded … for one OWNER/lead ruling" sentence → resolution summary | §30 would otherwise contradict the now-RESOLVED Appendix A-6 |
| `FIEZEL-PAW-REDESIGN-SPECIFICATION.md` §32 | "One unresolved nuance on blink under OS reduced motion: Appendix A-7." → "strict no-blink — Appendix A-7, RESOLVED (17 R-5)." | Same: body said "unresolved" after A-7 was resolved |
| `audit/01-pau-assets.md` naming note | `"Pau" in this project is the same character.` → misnomer-corrected wording | Blind sweep would have produced the false statement `"PAW" in this project is the same character`; the quoted old name is a mention, not a use |
| `audit/02-brand-system.md` naming note | `the redesign brief calls it **Pau**` → `earlier redesign-brief drafts called it **"Pau"** — a project-era misnomer, corrected…` | Same mention-vs-use reason |
| `assets/README.md` | Sweep initially produced `never "PAW"`; corrected to `never "Pau" — a project-era misnomer, corrected 2026-08-27` | The quoted forbidden spelling is a mention of the misnomer; regression caught in verification |
| `implementation/code-plan.md` intro + §7.1 | "uses `fz-pau-*` … renames" → past tense + "rename has been applied / republished (2026-08-27 naming sweep)" | The errata's premise ("12-lesson-layer should be republished") is now satisfied; quoted old names kept as record |
| `systems/11-splash-onboarding.md` E7 | `splash: 'pau'` → `splash: 'paw'` | Proposed (not-yet-shipped) config value named after the character; follows the same errata logic as `fz-paw-*` |

---

## 6. Verification

- `grep -rnE "\bPaus?\b|\bPAU\b" pau-redesign/**/*.md` → remaining hits are exactly the sanctioned exceptions of §2.3: 4 historical quotes in `systems/17-open-issue-rulings.md`, the three rewritten naming notes (master spec, audit/01, audit/02, assets/README), and the A-6 historical issue title. **No stray standalone `Pau ` remains outside sanctioned exceptions.**
- `grep -rn "FIEZEL-PAU-REDESIGN"` → 0 hits; renamed file present, old file gone.
- `grep -n "correct-streak" systems/10-motion.md` → only inside the two R-1 replacement texts (deprecation-alias wording), as mandated.
- `speech-start`/`speech-end` survive only as history: Appendix A-4's original issue text (kept intact per Task 4) and audit/03's repo-observation ("No speech-start/speech-end event … exists"), which describes real code.
- `fz-pau-*` survives only inside code-plan §7.1's errata quotes (historical record, §2.3); all live spec text uses `fz-paw-*`.
- All 44 manifest edits verified present in their targets; `fiezel-repo/` has zero modifications.
- Proof sheet regenerated after the `gen_poses_sheet.py` earR fix (`poses-sheet-16.svg` / `poses-sheet-16.png`).

Working artifacts kept alongside this log: `systems/_apply_rulings.py` (manifest applier), `systems/_naming_sweep.py` (sweep script), `systems/_sweep_log.json` (raw machine-readable counts).
