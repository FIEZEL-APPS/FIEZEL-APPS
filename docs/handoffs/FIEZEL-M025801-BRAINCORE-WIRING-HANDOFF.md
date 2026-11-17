# FIEZEL m025-801 Handoff Dossier: Braincore Nervous System Full Wiring (P0 + P1 + P2)

- **Status**: COMPLETE — Empirically verified in real Chromium Playwright and real Node VM + Worker harnesses after build bump `m025-801`.
- **Scope & Authority**: OWNER / MASTER directive — full remediation of every broken, disconnected, crashing, or cross-course-leaking Braincore signal path discovered in the `m025-799` empirical audit, upgrading silent test mocks to real Braincore engine verification and persisting voice telemetry to Cloudflare D1.

## 1. Empirical Root Causes & Fixes Implemented

### P0 — Data Loss, Silent `TypeError` Crashes, & Course State Leakage
1. **`app.js` State Buckets, Reference Mutation, `token-order`, JA/ZH Curricula, Writing & Skills Lab**:
   - Added `'speaking'`, `'pte'`, `'kana'`, and `'writing'` to `defaultState`, `PROGRESS_STATE_FIELDS`, `sanitizeState()`, `studentProgressEvidenceScore()`, and `activateAccountStateFromPuter`'s `adaIsinya` check.
   - **Critical Reference-Cloning Fix (`clonePlainContainer` / `loadState` / `sanitizeBucket`)**: Fixed `pickProgress(defaultState)` and `sanitizeState` sharing `defaultState` nested bucket references across empty boots, preventing writes in English (`state.pte`, `state.kana`, etc.) from mutating `defaultState` and leaking into Japanese/Mandarin on `switchTargetLangStorage()`.
   - Added defensive `ensureStateBucket()` in `updateMastery()` and `markMastered()`.
   - Updated `record(q, ok, ms, selectedIndex)` so `q.type === 'token-order'` flows through `bktRecord()`, `confusionMatrixRecord()` (when `selectedIndex >= 0`), `itemCalibrationObserve()`, `itemPoolObserve()`, `itemPoolObserveProbe()`, `learningTelemetryEmitAnswer()`, and maps `reviewBucket: 'grammar'` + `reviewKey`.
   - Updated `load()` for `'ja'` and `'zh'` so `GRAMMAR_CURRICULUM` is assigned to `{ schema: 'fiezel-grammar-curriculum-v1', lessons }` alongside `GRAMMAR_CURRICULUM_INDEX` and `FiezelCoreBrain.setCurriculumGraph()`, enabling `zpdFrontierPick()` and `bktShadowMarkup()` in Japanese and Mandarin courses.
   - Wired `saveWritingEntry()` (metadata-only, zero raw essay text) and `recordSkillsLabBraincoreAttempt()` (mounted via `FiezelSpeakingListeningAddon` `onAttempt` hook, zero raw transcript/audio) into `updateMastery()`, `bktRecord()`, and `misconceptionLedgerRecord()`.
2. **`features/japanese/fiezel-kakijun-studio.js`**:
   - Replaced the crashing 2-arg call `updateMastery('ja_kana_' + data.char, true)` inside `onCharacterCompleted()` with `emitKakijunBraincoreTelemetry(data)` writing `updateMastery('kana', key, true, ms)`, `bktRecord({ lessonSkill: key, skill: key }, true, 0.9, 1.2)`, and `record({ id: key, type: 'kana', ... })`.
3. **`features/mandarin/mandarin-ui.js`**:
   - Replaced the shifted 3-arg reorder call `window.updateMastery(l.skill, Boolean(ok), 3000)` and silent `submitQuizAnswer()` with a shared deduplicated helper `emitMandarinBraincoreTelemetry()`, writing `updateMastery('grammar', 'zh_...', ...)`, `record()` (`grammar`/`token-order`), `bktRecord()` fallback, and `misconceptionLedgerRecord()` without double-counting retries.
4. **`features/japanese/fiezel-story-reader.js` & `features/japanese/fiezel-story-brain-bridge.js`**:
   - Removed the crashing `updateMastery('reading_quiz_' + story.id, isCorrect)` call and duplicate BKT/mastery writes between `StoryReader.evaluateQuiz()` and `FiezelStoryBrainBridge.evaluateStoryQuiz()`.
   - Fixed `sanitizeId()` so Japanese characters in word keys (`vocab_着物`, `vocab_新幹線`) are preserved rather than flattened to `vocab___`.
   - Fixed typos/nonexistent APIs (`FiezelMasteryBkt` -> `FiezelMasteryBKT`, `.updateMastery`/`.record` -> real `.mastery()` / `.update()`, `FiezelMisconceptionLedger.update()` / host `misconceptionLedgerRecord()`).
   - Recorded **both** wrong and correct answers into `updateMastery`, `bktRecord`, `misconceptionLedgerRecord`, and `record()`, scoped through `sideStateKey`.
5. **`features/interactive-chat/fiezel-voice-pedagogy.js`, `features/interactive-chat/fiezel-interactive-chat.js`, & `features/voice-studio/src/lib/braincore.ts` (+ rebuilt `dist/`)**:
   - Updated `recordPedagogicalAttempt()` to pass canonical `{ lessonSkill, skill }` objects + calibrated `(kappa, boost)` to `root.bktRecord()`, report to `root.misconceptionLedgerRecord()`, use `sideStateKey()` when falling back, and avoid overwriting host `{ schema: 'fiezel-mastery-bkt-v1', lessons }` with `{ skills }`.
   - Fixed `'zh'` course tagging in `fiezel-interactive-chat.js` across turn telemetry (`zh_kaiwa_*`, `zh_speaking_fluency`), shadowing (`zh_speaking_shadowing`), and voice calls (`zh_kaiwa_call_*`), plus scoped BKT/Ledger fallbacks via `sideStateKey()`.
   - Updated standalone `w.bktRecord()` call in `features/voice-studio/src/lib/braincore.ts` to emit object payloads alongside `w.updateMastery('speaking', ...)` and `w.misconceptionLedgerRecord(...)`, and rebuilt `features/voice-studio/dist/voice-studio.js` via Vite.
6. **`features/pte/fiezel-pte-ui.js`**:
   - Updated `reportBraincoreTelemetry()` to pass canonical `{ id, type: 'pte', level: 'B2', skill, lessonSkill, target }` questions to `window.record`, `window.updateMastery`, `window.bktRecord`, and valid `{ misconception, timing }` diagnoses to `window.misconceptionLedgerRecord()` (fixing empty `entries: {}` drops).
7. **`features/speaking-listening/fiezel-jlpt-listening.js`**:
   - Eliminated double-counting `state.totalAnswered` / duplicate `state.history` pushes when host `window.record` already runs, removed nonexistent `window.saveState` / `'fiezel_state'` writes in favor of `window.save`, added `misconceptionLedgerRecord`, and scoped BKT fallback through `window.sideStateKey()`.

### P1 — Cloudflare D1 Persistence & Remaining Parallel Organs
1. **Real D1 Persistence for `POST /api/braincore/sync` (`workers/api/voice/route-voice-live.js`, `server.js`)**:
   - Replaced the no-op ack stub in `routeVoiceBraincoreSync()` with fail-closed `CORE_DB` persistence via `ensureLegacySchema(db)` + `INSERT OR REPLACE INTO brain_attempts` batched per verified `ctx.identity.sub`.
   - Normalized and filtered every item through `projectBrainAttempt()`, stripping `userTranscript` and raw utterance text to uphold school/student privacy guarantees.
   - Added local persistence parity in `server.js` (`/api/braincore/sync`).
2. **`features/nujum/fiezel-nujum.js`**:
   - Replaced hardcoded `skills?.grammar` (`0.0`) theta lookup with real `coreBrainSnapshot` / `FiezelCoreBrain.estimateAbility` calculation and live `FiezelMasteryBKT` sync.
   - Added `emitNujumBraincoreEvidence()` across `evaluateAnswer()`, `handleRoundTimeout()`, `handleSurrender()`, and `concludeDispute()` (`FiezelOLM.resolveDispute` + misconception decay on `3/3` win), while keeping `isDemo: true` isolated from host state.
3. **`features/learner-flow/fiezel-learner-flow.js` & `features/speaking-listening/fiezel-speaking-listening-addon.js`**:
   - Added `forwardToHostBraincore()` inside Learner Flow `record()` across diagnostic answers, lesson items, and assignments.
   - Added `options.onAttempt` dispatch inside Skills Lab `Controller.finishItem()` consumed by `app.js:recordSkillsLabBraincoreAttempt()`.

### P2 — Real Engine Quality Tests (Zero Fake Mocks)
- Upgraded `tests/story-brain-bridge-test.js` and `tests/interactive-chat-braincore-telemetry-test.js` to validate real `FiezelMasteryBKT`, `FiezelMisconceptionLedger`, `sideStateKey` scoping, and Mandarin `'zh'` course tagging.
- Added `tests/braincore-nervous-system-wiring-test.js` (12 end-to-end assertions across real `app.js` VM, P0/P1 UI/bridge modules, and real D1 `routeVoiceBraincoreSync` persistence + privacy allowlist) and registered it additively in `.github/workflows/quality.yml`.

## 2. Empirical Verification & Gates Run (`m025-801`)
- Chromium Playwright verification (`scratch/probe-worktree-verify.mjs`) on live `index.html`: W1–W7 confirmed green with zero `pageErrors`.
- Node regression gates executed after final edits & `m025-801` bump:
  - `node tools/bump-build.mjs --check` (Hexa-Sync aligned at `m025-801`)
  - `node tests/curriculum-cache-version-test.js`
  - `node tests/braincore-nervous-system-wiring-test.js`
  - `node tests/story-brain-bridge-test.js`
  - `node tests/interactive-chat-braincore-telemetry-test.js`
  - `node tests/id-golden-snapshot-test.js` & `node tests/th-ui-leak-test.js`
  - `node tests/gate-registry-test.js`
  - `node tests/target-lang-progress-isolation-test.js`, `tests/progress-legacy-upgrade-gate-test.js`, `tests/side-state-scope-test.js`, `tests/brain-manifest-test.js`, `tests/brain-page-wiring-test.js`, `tests/brain-sync-failclosed-test.js`, `tests/brain-sync-rebuild-test.js`, `tests/progress-sync-test.js`, `tests/anti-tamper-and-watermark-test.js`, `tests/tri-core-invariants-gate-test.js`.

## 3. Touched Files (`m025-801`)
- Core runtime & server: `app.js`, `server.js`, `workers/api/voice/route-voice-live.js`
- Features: `features/japanese/fiezel-kakijun-studio.js`, `features/japanese/fiezel-story-reader.js`, `features/japanese/fiezel-story-brain-bridge.js`, `features/mandarin/mandarin-ui.js`, `features/interactive-chat/fiezel-voice-pedagogy.js`, `features/interactive-chat/fiezel-interactive-chat.js`, `features/voice-studio/src/lib/braincore.ts`, `features/voice-studio/dist/voice-studio.js`, `features/pte/fiezel-pte-ui.js`, `features/speaking-listening/fiezel-jlpt-listening.js`, `features/speaking-listening/fiezel-speaking-listening-addon.js`, `features/nujum/fiezel-nujum.js`, `features/learner-flow/fiezel-learner-flow.js`
- Tests & CI: `tests/braincore-nervous-system-wiring-test.js`, `tests/story-brain-bridge-test.js`, `tests/interactive-chat-braincore-telemetry-test.js`, `.github/workflows/quality.yml`, `id-golden-baseline.json`, `reports/th-ui-leak-report.json`
- Build & Handoff: `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `index.html`, `docs/handoffs/FIEZEL-M025801-BRAINCORE-WIRING-HANDOFF.md`

## 4. Next Steps & Roadmap
1. Open Pull Request targeting `main` and monitor all required CI checks (`quality` shards, `A6`, `A7`, `A9`, `A10`, `A11`, `A13`, `A14`, `Auto PR Review & Invariant Audit`) until 100% green.
2. Verify any active `main` deploy workflow completes sequentially per `AGENTS.md` §12 before merging PR to `main`.
3. Confirm `https://fiezel.my.id/app/` serves `m025-801` live after deploy completes.
