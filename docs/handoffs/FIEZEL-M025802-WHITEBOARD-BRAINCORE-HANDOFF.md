# FIEZEL-M025802: Solvely Whiteboard Tutor + Bi-Directional Braincore Wiring Handoff

- **Build Version**: `m025-802` (Hexa-Sync aligned with `origin/main` `m025-801`)
- **Branch**: `feat/solvely-whiteboard-tutor-local`
- **Authority**: OWNER / MASTER release protocol (`AGENTS.md` §0, §11, §12, Guardian A6–A14)
- **Status**: `READY_FOR_PR_AND_DEPLOY`

---

## 1. Executive Summary & Root Cause Resolved

Earlier local work on the Solvely Whiteboard (`LiveWhiteboardCanvas`, KaTeX math rendering, Dagre flow layout, Caveat/Kalam handwritten fonts, Kakijun stroke vectors, and Worker/server `wb_cache` + `tts_cache`) was stranded off `origin/main` and overwritten during a partial reset back to `m025-801`, leaving broken build artifacts (`voice-studio.js` built at `m025-801`, TS conflicts in `speechAlignment.ts`, and conflicting `InCallLearningWorkbenchModal.tsx` exports).

This release unifies the worktree cleanly onto `origin/main` (`a375f0bc`, `m025-801`) while preserving **100% of `origin/main` improvements** and integrating **100% of the Solvely Whiteboard + Braincore bi-directional loop**.

---

## 2. Architecture & Changes Delivered

### A. Preserved 100% of `origin/main` (`m025-795` – `m025-801`)
- **SSW Sensei (`Unit 0–9`)**: `SswTacticalBoardCanvas` inside `InCallLearningWorkbenchModal.tsx`, `SswSenseiWorkbenchPanel.tsx`, Priority-1 FastAPI bundle + Priority-2 `./content/ssw/*.json` lazy hydration, zero-spoiler quizzes, and `ssw_tactical_board` pill launch.
- **PTE Read Aloud & Ruby Display**: `PteReadAloudCanvas` (`latestAlignment`, `onActiveQuestionChange`), general `read_aloud` derivation in `deriveContextualPedagogicalBoard`, `JapaneseRubyDisplay` furigana/romaji/pinyin clarity.
- **Duplex Voice & D1 Persistence**: `handyVad.ts`, `sileroVadGate.ts`, `callScenarios.ts` kept verbatim at `origin/main`; `routeVoiceBraincoreSync` (`CORE_DB` `brain_attempts` persistence) + `schema.js` intact.

### B. Solvely Whiteboard UI/UX & Math/Diagram Engine
- Restored and compiled `LiveWhiteboardCanvas.tsx`, `WhiteboardVisualDiagrams.tsx`, `dagreLayout.ts`, `whiteboardDirector.ts`, `kakijunCoreVectors.ts`, `kakijunStrokeBank.ts` + `public/assets/kanji-vg-strokes.json`, Caveat/Kalam font packs, and KaTeX assets.
- Resolved `speechAlignment.ts` clean decoupling from `@dagrejs/dagre` so Node 24 CI tests load TypeScript modules without bundling `node_modules`.
- **KaTeX Inline Rendering Fix (`MathText.tsx`)**: Fixed `\bpi\b` matching after a backslash (`\pi` turning into LaTeX newline `\\pi` and stacking `2` over `pir`) and replaced trailing `\b` after Unicode `²/³` with `(?![A-Za-z0-9_])`. Verified in Chromium pixels (`πr²`, `2πr`).

### C. Bi-Directional Braincore Integration
1. **Outbound (Braincore -> AI Whiteboard Director)**:
   - `App.tsx` passes `learnerDossier: safeBuildDossier(brainStateRef.current, activeScenario, locale)` into all three `requestRealtimeWhiteboardAction` / `requestRealtimeWhiteboardStream` call sites.
   - `App.tsx` passes `topMisconceptionId` into `<InCallLearningWorkbenchModal />`.
   - `whiteboardDirector.ts` forwards `learnerDossier` in JSON requests and parses `trapReasonId` + `learnerWeaknesses`.
2. **Inbound (Whiteboard Interactions -> Braincore -> Host -> D1)**:
   - `InCallLearningWorkbenchModal.tsx` records both wrong and right answers in `handleSelectOption`, `handleSelectClozeChip`, and `handleAddBlock` (with `reportedQuizKeysRef` de-duplication).
   - Emits `circle_ask_confusion` (`ok: false`, carrying `topMisconceptionId` / `trapReasonId`) and `board_completed` (`ok: true`) through `onWhiteboardBraincoreEvent`.
   - `App.tsx` connects `onWhiteboardBraincoreEvent` to `recordSpeakingAttempt` and `brainSyncFlush`, propagating into host `updateMastery('speaking', ...)`, `bktRecord`, `misconceptionLedgerRecord`, and `POST /api/braincore/sync`.

### D. Caching & Runtime Backend (`workers/api/voice/route-voice-live.js`, `server.js`)
- Preserved `wb_cache` and `tts_cache` (`_boardMemoryCache`, `_ttsMemoryCache`, `readWorkerCache`, `writeWorkerCache`) alongside `routeVoiceBraincoreSync` and `routeVoiceHealth` (`v5-resilient-duo-stream`).

---

## 3. Empirical Verification Summary

1. **Chromium Playwright E2E (`probe-wb-braincore-e2e.mjs`)**:
   - Host `index.html` -> `#fzMitraKaiwaStudioFrame` -> Solvely Whiteboard (`hasDotGrid: true`, `hasScrubber: true`, `hasSvgDiagram: true`, `hasQuizCard: true`, `stepCount: 7`).
   - Verified real Braincore calls: `masteryCallsCount: 6`, `bktCallsCount: 6`, `ledgerCallsCount: 3`, `wrongMasteryRecorded: true`, `rightMasteryRecorded: true`, `wrongLedgerRecorded: true`, `syncPostsCount: 5`, `speakingBucketKeys: ["speak_en_free_talk", "en_speaking_fluency"]`.
   - Verified STEM KaTeX (`hasKatex: 7`, `hasSvg: 2`, `overflowX: false`), Mobile `390x844` (`mobileOverflow: false`), SSW Tactical Board (`hasSswPopup: true`, `hasSswQuizBtn: true`), and `pageErrors: []`.
   - Visually inspected screenshots for desktop whiteboard, quiz/puzzle cards, STEM KaTeX inline formulas & rough SVG geometry diagrams, mobile viewport, and SSW tactical board.
2. **Audio-Visual Lockstep & Cache (`probe-av-sync.mjs`, `probe-random-chaos.mjs`)**:
   - `WORD changes during silent pauses: 0 / 46 words`, `pageErrors: none`, `boardHit=HIT (18ms, cached=true)`, `ttsHit=HIT (6ms, cached=true)`, 12 multi-domain prompts (`en`, `ja`, `zh`, physics, biology, geometry, JS).
3. **SSW Sensei Regression (`tests/ssw-sensei-mentor-probe.js`)**:
   - `SSW_SENSEI_PROBE_PASS: ALL CHECKS GREEN (0 FAILURES)` across Unit 0–9, ruby, lazy hydration, quiz grading, `/api/ssw/bundle`, and Coach Sarah EN regression.
4. **Node CI & Governance Gates**:
   - Added `B9` in `tests/braincore-nervous-system-wiring-test.js` (`PASS: 13 uji end-to-end`).
   - Verified `voice-kawan-bicara-sync-test.js`, `voice-copilot-relevance-gate-test.js`, `voice-duplex-fullphone-contract-test.js`, `voice-studio-ui-architecture-test.js`, `kawan-bicara-hardening-test.js`, `deploy-site-gate-test.js`, `curriculum-cache-version-test.js`, `id-golden-snapshot-test.js`, `th-ui-leak-test.js`, `gate-registry-test.js`, and `release-audit.py`.

---

## 4. Next Steps / Roadmap

- Monitor PR CI workflows (`quality`, `A6`–`A14`, `Auto PR Review & Invariant Audit`) to 100% green before merge to `main`.
- Watch `FIEZEL Deploy Site` post-merge deployment and confirm live `https://fiezel.my.id/app/` reports `m025-802` via `coordination/BUILD-VERSION.json` and active Service Worker shell cache.
- Keep `features/voice-studio/node_modules` excluded from commits; source-level CI TypeScript suites remain dependency-free under Node 24.
