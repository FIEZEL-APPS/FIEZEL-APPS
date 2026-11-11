# FIEZEL · PTE Academic Guided Daily Coach & Nakul Masterclass Protocol Handoff

**Build Version**: `m025-802`
**Branch**: `feat/pte-academic-prep-hub`
**Pull Request**: #864 (`https://github.com/FIEZEL-APPS/FIEZEL-APPS/pull/864`)
**Target Learner**: Fitra Rusdiawan (Target: PTE Academic 42 for Australian Student Visa Subclass 500 at AILFE Perth)
**Coordinator Session**: `a91b3a79-13cf-443d-8f8f-d3a0860668c8`
**Executor Agent**: `8979cd84-d320-4043-80cf-c591935cf8b2`
**Compliance**: AGENTS.md (Rule 0 Scope Isolation, Rule 0-B Live SSOT, Rule 0-C CSS Integrity, Rule 4 Handoff Dossier, Rule 12 Anti-Collision)<br/>
**Status**: Production Ready & Fully Verified.

---

## 1. Executive Summary & Nakul Masterclass Integration

Based on the 7-hour masterclass blueprint by Nakul (Skills PTE Academic 2025/2026) and synthesis provided by Coordinator `a91b3a79-13cf-443d-8f8f-d3a0860668c8`, this release upgrades the PTE Academic Prep Hub from a passive practice utility into a fully structured, 30-day **Guided Daily Coach**.

Target PTE 42 requires ~45% to 50% total raw score across "The Big 4" (Read Aloud, Repeat Sentence, Describe Image, Write From Dictation). By eliminating cognitive overload and focusing strictly on algorithmic computer-grading patterns, Fitra Rusdiawan is guided step-by-step through high-yield daily exercises.

---

## 2. Deliverables & Technical Changes

### A. Nakul Official Templates (`content/pte/pte-templates.json`)
* **Describe Image (`di_nakul_v1`)**: 5-line structural template (Intro -> X/Y Axes -> Highest Trend -> Lowest Trend -> Logical Conclusion) targeting optimal duration of 25–28 seconds.
* **Retell Lecture (`rl_nakul_v1`)**: 5-sentence phrase-slot scaffold.
* **Summarize Written Text (`swt_nakul_v1`)**: Strict single-sentence compound rule (35–45 words, 1 capital letter, 1 full stop).
* **Summarize Spoken Text (`sst_nakul_v1`)**: 50–70 words structure utilizing concise transition connectors (Firstly, Secondly, Furthermore, In conclusion).
* **Write From Dictation (`wfd_extra_words_v1`)**: Official Extra Words Hack documentation (Pearson AI awards points for matched words with zero negative marking for alternative guesses).

### B. 30-Day Guided Daily Curriculum (`content/pte/pte-daily-roadmap.json`)
* Complete 30-day curriculum calibrated for PTE 42 entry level.
* Organized across 4 progressive weeks:
  * Week 1 (Days 1–7): Acoustic Foundations, Pitch Control (135–145 Hz), and Describe Image 5-Line Template.
  * Week 2 (Days 8–14): Listening & Writing Dual-Scoring Core (RS 50% Rule & WFD High-Frequency Bank).
  * Week 3 (Days 15–21): Reading Collocations, SWT Compound Sentence, and SST Connectors.
  * Week 4 (Days 22–30): Timed Rapid-Fire Sprints, Mini-Mock Assessments, and Readiness Certification.
* Each day specifies 5 structured tasks (Read Aloud, Repeat Sentence, Describe Image, Write From Dictation, and Kawan Bicara AI Coach Call) with exact target counts, estimated completion minutes, and daily Nakul secrets.

### C. Algorithmic Scoring Engine (`features/pte/fiezel-pte-engine.js`)
* **Nakul Describe Image Analysis**: Detects the 5 template lines and classifies duration zones (`under_20`, `short_20_24`, `optimal_25_28`, `good_29_34`, `danger_over_35`).
* **Repeat Sentence 50% Rule**: Evaluates whether learner repeated >= 50% of content words without hesitations, flagging `meets50PercentRule: true`.
* **WFD Extra Words Hack Evaluator**: Matches target words without deducting marks for extra guesses, returning `extraWordsCount`, `extraWordsHackDetected`, and pedagogical feedback.
* **Acoustic Pitch Heuristic (`evaluateAcousticPitch`)**: Validates fundamental frequency (135–145 Hz for male speakers) to avoid Pearson bass speech-recognition failure (<115 Hz).
* **Curriculum Helpers**: `getDailyRoadmapDay(dayNum)` and `calculateDailyProgress(tasks, completedIds)`.

### D. Interactive UI & Tactile Styling (`features/pte/fiezel-pte-ui.js` & `features/pte/pte-tactile.css`)
* **Guided Daily Coach Card**: Rendered prominently on the PTE Hub with Day 1–30 horizontal carousel pills, daily completion badges, and Nakul secret advice.
* **Interactive Task Checklist**: Checkboxes persist state to `localStorage` (`fz_pte_completed_tasks`) and stream telemetry to Braincore (`bktRecord`).
* **Task Action Launchers**: Direct navigation buttons to specific exercise banks and Kawan Bicara Voice Studio (`call.html`).
* **Describe Image Green Zone (25–28s)**: Live visual indicator on the timer track (`.fz-pte-green-zone-marker`) and real-time glowing alert (`.fz-pte-green-zone-banner`) guiding the learner to stop speaking within the golden window.
* **Scorecard Diagnostics**: Enhanced with Nakul protocol guidance for all 4 modes.

---

## 3. Test Verification & Mutu Gate Results

1. **PTE Bank Integrity Suite (`tests/pte-bank-integrity-test.js`)**:
   * 12/12 tests PASS (Read Aloud, Repeat Sentence, Describe Image, Write From Dictation, Templates, and 30-Day Roadmap schema).
2. **PTE Academic Engine Unit Test Suite (`tests/pte-academic-engine-test.js`)**:
   * 18/18 tests PASS (Tokenization, WER alignment, RA, RS 50% rule, DI 5-line template & 25–28s zone, WFD extra word hack, acoustic pitch, composite Pearson, roadmap helpers).
3. **Curriculum Cache Version (`tests/curriculum-cache-version-test.js`)**:
   * PASS (33 assertions, 3 pages, build `m025-802`).
4. **Gate Registry (`tests/gate-registry-test.js`)**:
   * PASS (10 pass, 0 fail).
5. **Hexa-Sync Arbiter (`tools/bump-build.mjs --check`)**:
   * PASS (`Selaras` across `BUILD-VERSION.json`, `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`).

---

## 4. Protected Surfaces & Scope Statement

* Zero touch on `features/auth/**` (Compliant with Rule 0).
* Zero touch on `features/onboarding/**` (Compliant with Rule 0).
* Zero touch on `manifest.json` (Compliant with Rule 0).
* All changes scoped strictly to `features/pte/`, `content/pte/`, tests, and build sync.
