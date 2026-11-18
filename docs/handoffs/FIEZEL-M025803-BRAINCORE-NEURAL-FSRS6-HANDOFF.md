# FIEZEL m025-803 Handoff Dossier: Unified BKT, Neural Free-Form & Acoustic Prosody Braincore Integration, and FSRS-6 Shadow Comparison

- **Status**: COMPLETE — Verified in Node VM/ESM/CJS harnesses, Python release audit, and real Headless Chromium Playwright on build `m025-803`.
- **Scope & Authority**: OWNER / MASTER directive — execute the 4 Braincore architecture upgrades in clean isolated worktree `C:\Users\hp\fiezel-braincore-neural-v2` (branch `feat/braincore-unified-neural-fsrs6` from `78f78152` `m025-802`) without collateral edits to protected Auth, Onboarding, or PWA shell logic.

## 1. Deliverables & Architecture Changes

### Task 1 — Post-Merge Integrity Verification (`m025-795`..`m025-802`)
- Audited the merged Solvely Whiteboard (`m025-802`), D1 `brain_attempts` wiring, SSW Sensei lazy KB & Worker pipeline, PTE diagnostics, and Kawan Bicara Studio. Zero regressions detected prior to modifications (`tests/braincore-nervous-system-wiring-test.js` 13/13 pass; `tests/ssw-sensei-mentor-probe.js` Playwright E2E `0 failures`).

### Task 2 — Unified BKT ("Satu Otak, Satu Penggaris") & Canonical Ledger Forwarding
- **Voice Studio (`features/voice-studio/src/lib/braincore.ts` & rebuilt `features/voice-studio/dist/voice-studio.js`)**:
  - Unified `BRAINCORE_PARAMS` from drifted constants (`0.25/0.18/0.20/0.80/3`) to canonical `lesson_mastery` parameters (`P_INIT=0.20`, `P_LEARN=0.15`, `P_SLIP=0.10`, `P_GUESS=0.25`, `MASTERY_T=0.95`, `MIN_CORRECT_FOR_MASTERY=5`, `DEVELOPING_T=0.55`).
  - Added `resolveCanonicalBktConfig()` dynamically reading `window.FiezelBrainConfig || window.parent?.FiezelBrainConfig` and `window.FiezelMasteryBKT || window.parent?.FiezelMasteryBKT` while keeping `call.html` sandbox-safe without `_fzG` host global bypasses.
  - Updated `successProbability()`, `optimalDifficulty()`, `abilityThetaFromMastery()`, `bktDecay()`, `bktStep()`, `bktUpdate()`, `deriveMasteryState()`, `createBlankCompetency()`, `syncCompetencyToHostBkt()`, `checkPrerequisiteStatus()`, `recordVocabPrereqMastery()`, `recordSpeakingAttempt()`, and PTE `updateBktSkill()`.
- **Interactive Chat Pedagogy (`features/interactive-chat/fiezel-voice-pedagogy.js` & `fiezel-interactive-chat.js`)**:
  - Aligned `BRAINCORE_PARAMS` and added dynamic `resolveCanonicalBktParams()` lookup against `FiezelBrainConfig` / `FiezelMasteryBKT`.
  - Added full 49-code `CANONICAL_TAXONOMY_CODES` (`misconception-taxonomy-v1`), `mapToCanonicalTaxonomyCode()`, and `canonicalCode` propagation into `root.misconceptionLedgerRecord()`.
- **Host Application (`app.js`)**:
  - Fixed `brainConfigAvailable()` to recognize `self.FiezelBrainConfig.sanitize` alongside `.resolve`.
  - Updated `misconceptionLedgerRecord()` to forward `canonical: diagnosis?.canonical || diagnosis?.canonicalCode` into `FiezelMisconceptionLedger.update()`.

### Task 3 — Pre-Trained Neural & Acoustic Signals -> Braincore
- **3A — Free-Form Sentence Diagnosis -> Canonical `misconception-taxonomy-v1` (Closed 49-Code Taxonomy)**:
  - **`workers/api/ai/ai-tasks.js`**: Extended `conversation_correct` (`promptConversation`, `parseConversationTags`, `shapeConversationOutput`) to request and validate `CODE:` against `CANONICAL_MISCONCEPTION_CODES` (all 49 keys of `misconception-taxonomy-v1.json`) via `resolveCanonicalTaxonomyCode()`, keeping the existing 7-task Worker contract intact under `ModelCallGate.runReservedModel`.
  - **`workers/api/voice/route-voice-live.js`**: Extended `partner-turn` prompt and response parsing with `CANONICAL_TAXONOMY_SET` validation, returning structured `diagnosis` payloads.
  - **`features/voice-studio/src/lib/liveTransport.ts` & `features/voice-studio/src/App.tsx`**: Added `serverDiagnosis` on `FlexibleTurnEvaluationResult` and exported `requestNeuralUtteranceDiagnosis()`.
  - **`features/voice-studio/src/lib/braincore.ts` & `features/interactive-chat/fiezel-interactive-chat.js`**: Added non-double-counting `reconcileNeuralDiagnosis()` (recomputing posterior from `priorBktBefore` without incrementing `attempts`, updating `misconceptionLedger` and `dualBrainMemory.userBrain.chronicWeaknesses` with valid `ChronicGrammarWeakness` fields) and host ledger ingestion in `deliverAssistantReply()`.
- **3B — Real DSP YIN F0 Pitch Contour, Mandarin 4-Tone (+3+3 Sandhi), Japanese Pitch Accent, & English Prosody**:
  - Created pure TypeScript DSP module `features/voice-studio/src/lib/acousticProsodyAnalyzer.ts` implementing `estimateFramePitchYIN()` (YIN Normalized Difference Function + parabolic interpolation on 16 kHz PCM frames), Chao 5-level Mandarin 4-tone + Tone 3+3 sandhi evaluation (`extractExpectedMandarinTones`), Japanese Atamadaka/Heiban/pitch modulation scoring, and English stress/dynamic-energy analysis (`createAcousticProsodyTracker()`).
  - Wired raw 16 kHz PCM capture (`handleMicPcmData` & `onSpeechPcm16kBase64`), `consumeTurnAcousticProsody()`, `scheduleAsyncNeuralDiagnosis()`, PTT fallback handlers, SpeechRecognition fallback handlers, `commitLiveUserTurn()`, `submitStudentTurn()`, and `finalizeLiveServerTurn()` in `features/voice-studio/src/App.tsx`.
  - Fed acoustic metrics and tonal/accent/prosody flags into `recordSpeakingAttempt()` in `features/voice-studio/src/lib/braincore.ts`.

### Task 4 — `FiezelFsrsOracle` (21-Weight FSRS-6) Shadow & `FiezelStatGate` Comparison (`app.js`)
- Activated shadow tracking inside `scheduleNext()` and `updateMastery()` in `app.js` using `self.FiezelFsrsOracle.createFSRS6()` + `fiezelAttemptToFsrsRating()` alongside authoritative legacy `FiezelCoreBrain` (`b.nextReview` and `b.stabilityDays` remain unchanged in `'shadow'` mode).
- Stored idempotent per-account/per-language paired observations (`FSRS6_SHADOW_KEY = 'fiezel-fsrs6-shadow-v1'` scoped via `sideStateKey()`, capped at `400` entries) and implemented `fsrsShadowCompareSnapshot()` evaluating paired LogLoss and Brier scores via `self.FiezelStatGate.pairedBootstrap()`, `twoProportionTest()`, and `verdict()`.
- Enforced kill-switches in `fsrsShadowAllowed()` (`selfTune.halt === true`, `FiezelBrainManifest.authorityMap.fsrsOracle === 'off'`, `FIEZEL_FSRS6_SHADOW === false`, and remote `GET /api/config` `flags.cfApiEnabled === false` / `enabled.coach === false`).
- Updated `features/brain/fiezel-brain-manifest.js` (`statGate: 'shadow'`) while keeping `_fzG`/`_fzR`/`_fzA` intact, and registered `FSRS6_SHADOW_KEY` in `sideStateBaseKeys()`, `resetProgress()`, and `tests/reset-side-state-test.js` (`DIHAPUS_SAAT_RESET`).

## 2. Empirical Verification & Gates Run (`m025-803`)
- **TypeScript Strict Check**: `tsc --noEmit --allowImportingTsExtensions --jsx react-jsx --moduleResolution bundler --target es2022 --module esnext --skipLibCheck` on `acousticProsodyAnalyzer.ts`, `braincore.ts`, `liveTransport.ts` -> exit `0`.
- **Vite Production Build**: `npm run build` in `features/voice-studio` -> built `dist/voice-studio.js` (`4,368.91 kB`) & `dist/voice-studio.css` cleanly in `12.52s`.
- **Hexa-Sync Build Arbiter**: `node tools/bump-build.mjs` + `node tools/bump-build.mjs --check` -> `m025-803`, `Selaras: true`.
- **New Upgrade Regression Gate**: `node tests/braincore-neural-fsrs6-upgrade-test.js` -> `11 passed, 0 failed` (`BraincoreNeuralFsrs6Upgrade: PASS`), registered additively in `.github/workflows/quality.yml`.
- **All Core & Audit Gates (exit `0`)**:
  - `node tests/id-golden-snapshot-test.js` (updated baseline -> `8139` literals `PASS`)
  - `node tests/braincore-nervous-system-wiring-test.js` (`13/13 PASS`)
  - `node tests/brain-manifest-test.js` (`BrainManifest: PASS`)
  - `node tests/brain-page-wiring-test.js`
  - `node tests/brain-runtime-compact-gate-test.js`
  - `node tests/brain-config-test.js`, `tests/braincore-contract-test.js`, `tests/brain-authority-wave2-test.js`
  - `node tests/brain-fsrs-oracle.suite.cjs`, `tests/fiezel-stat-gate-test.js`
  - `node tests/reset-side-state-test.js` (`7/7 PASS`), `tests/side-state-scope-test.js` (`12/12 PASS`), `tests/self-tune-retention-test.js` (`15/15 PASS`)
  - `node tests/policy-evidence-window-test.js`, `tests/core-policy-parity-test.js`, `tests/content-promotion-test.js`, `tests/target-lang-progress-isolation-test.js`
  - `node tests/ai-task-contract-test.js`, `tests/ai-conversation-task-test.js`, `node tests/ai-account-cap-gate-test.js` (`81/81 PASS`)
  - `node tests/interactive-chat-braincore-telemetry-test.js`, `tests/voice-call-ai-studio-port-test.js`, `tests/kawan-bicara-lock-in-gate-test.js` (`36 invariants`)
  - `node tests/curriculum-cache-version-test.js`, `node tests/th-ui-leak-test.js`, `node tests/gate-registry-test.js` (`10/10 PASS`)
  - `node tests/release-audit-gate-test.js` (`1256` Python `release-audit.py` checks, `0` blockers, `status=PASS`)
- **Headless Chromium Playwright Live Verification**:
  - `node tests/ssw-sensei-mentor-probe.js` -> `SSW_SENSEI_PROBE_PASS: ALL CHECKS GREEN (0 FAILURES)`
  - Live `index.html` + `call.html?lang=en&v=m025-803` probe -> `CHROMIUM_LIVE_PROBE_PASS` (`build: "m025-803"`, `brainConfigOk: true`, `statGateAuth: "shadow"`, `fsrsAuth: "shadow"`, `shadowCount: 2`, `pageErrors: 0`).

## 3. Touched Files (`m025-803`)
- Core & Worker: `app.js`, `workers/api/ai/ai-tasks.js`, `workers/api/voice/route-voice-live.js`, `features/brain/fiezel-brain-manifest.js`
- Voice Studio & Interactive Chat: `features/voice-studio/src/lib/acousticProsodyAnalyzer.ts`, `features/voice-studio/src/lib/braincore.ts`, `features/voice-studio/src/lib/liveTransport.ts`, `features/voice-studio/src/App.tsx`, `features/voice-studio/dist/voice-studio.js`, `features/voice-studio/dist/voice-studio.css`, `features/interactive-chat/fiezel-voice-pedagogy.js`, `features/interactive-chat/fiezel-interactive-chat.js`
- Tests, Baseline, Reports, Build & CI: `tests/braincore-neural-fsrs6-upgrade-test.js`, `tests/reset-side-state-test.js`, `.github/workflows/quality.yml`, `id-golden-baseline.json`, `reports/AI-ACCOUNT-CAP-GATE.json`, `reports/th-ui-leak-report.json`, `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `index.html`, `call.html`, `features/voice-studio/call.html`, `kurikulum.html`, `misi.html`, `docs/handoffs/FIEZEL-M025803-BRAINCORE-NEURAL-FSRS6-HANDOFF.md`

## 4. Next Steps & Roadmap
1. Commit changes on `feat/braincore-unified-neural-fsrs6`, verify Guardians `A9`/`A10`/`A11`/`A13` cleanly, push branch, and open Pull Request targeting `main`.
2. Monitor all CI checks (`quality`, `A6`..`A14`, `Auto PR Review & Invariant Audit`) until 100% green and ensure `main` deploy queue is clear per `AGENTS.md` §12 before merging.
3. Verify live production `https://fiezel.my.id/app/coordination/BUILD-VERSION.json` serves `m025-803`.
