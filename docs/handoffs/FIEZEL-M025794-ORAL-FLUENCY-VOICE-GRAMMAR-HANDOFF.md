# FIEZEL HANDOFF DOSSIER: M025-794
## Acoustic-Temporal Oral Fluency Engine (PTE & Voice Studio) + Cross-Lingual Voice-to-Tile Grammar Builder

- **Status**: READY FOR REVIEW / MERGE (`m025-794`)
- **Authority**: OWNER / MASTER release protocol (`AGENTS.md`, `tools/fiezel-guardians.mjs`)
- **Release Build**: `m025-794`
- **Branch**: `fix/oral-fluency-acoustic-engine`
- **Scope**: `fix(voice,pte,grammar): acoustic-temporal oral fluency engine and voice-to-tile grammar builder`

---

## 1. Root Cause Audit & Architecture Changes

### A. Acoustic-Temporal Oral Fluency Engine (PTE Academic & Kawan Bicara / Dr. Julian Voice Studio)
1. **True Speech Span vs Hangover Inflation**:
   - Replaced dummy / static timing (`durationSec: 30`, static scorecard defaults, and post-speech VAD hangover leakage) with acoustic onset-to-last-vocal-offset span (`spanDurationSec`) and true voiced phonation duration (`activeSpeechSec`, `phonationRatio`).
   - Updated `features/voice-studio/src/lib/handyVad.ts`, `sileroVadGate.ts`, `liveTransport.ts`, `App.tsx`, `InCallLearningWorkbenchModal.tsx`, `braincore.ts`, and rebuilt `features/voice-studio/dist/voice-studio.js` + `voice-studio.css`.
   - Updated `features/pte/fiezel-pte-engine.js` (`evaluateOralFluency`, `computeFluencyRatePoints`, `resolvePauseAndBurstTelemetry`, `countSpeechDisfluencies`, `countSelfCorrections`) and `features/pte/fiezel-pte-ui.js` (`createPteFluencyTracker`).
2. **Multi-Factor Fluency Telemetry & Braincore Propagation**:
   - Evaluates continuous speech cadence (WPM + articulation WPM), phonation ratio, intra-utterance pause tiers (`shortPausesCount <700ms`, `hesitationPausesCount 700–1999ms`, `longPausesCount >=2000ms`), burst stability (`rhythmScore`), fillers/hyphens/stutters, and verbal self-corrections.
   - Propagates structured Big-4 fluency telemetry into PTE Enabling Skills UI and Braincore BKT / theta tracking (`diagnosePteCandidateSpeech` and `evaluateConversationalOralFluency` in `features/voice-studio/src/lib/braincore.ts`).

### B. Voice-to-Tile Grammar Susun Kata Across EN (`en-US`), JA (`ja-JP`), and ZH (`zh-CN`)
1. **Cross-Lingual Token Matcher & Unicode Tokenizer**:
   - Fixed `makeGrammarTokenOrderQuestion` in `app.js` for Unicode/CJK punctuation stripping (`cleanWord`) and Japanese/Mandarin phrase tokenization with `targetLang` propagation.
   - Added `matchSpokenTranscriptToTokens`, `resolveTokenOrderSpeechLang`, and `stopActiveVoice` to `features/grammar/fiezel-grammar-upgrade.js` supporting:
     - English contractions/expansions (`cannot` ↔ `can't`, `where's` ↔ `where is`), number forms, fillers, and distractor-honest matching (Zero-Ghost-Answer invariant).
     - Japanese Hiragana/Katakana + Kanji reading normalization via `self.V` and built-in Kanji map.
     - Mandarin Hanzi + digit conversion (`2` → `两`/`二`) + Pinyin homophone fallback via `FiezelMandarinPinyinEngine`.
   - Integrated `#tokenVoiceBtn` / `#tokenVoiceStatus` into `FiezelGrammarUpgrade.renderTokenOrder` (`features/grammar/fiezel-grammar-upgrade.js`, `features/grammar/grammar-upgrade.css`), preserving interim-to-final non-duplicating tile updates across shuffled token banks.
2. **All Susun Kata Surfaces & 9-Locale i18n Parity**:
   - `features/grammar/grammar-vocab-bridge.js` & `grammar-vocab-bridge.css`: Added CJK-aware `tokenizePuzzleSentence` / `normPuzzleSentence`, `togglePuzzleVoice`, `stopPuzzleVoice`, `applyVoiceTranscriptToPuzzle`, and `#bridgePuzzleVoiceBtn` on Round 2 sentence puzzles.
   - `features/mandarin/mandarin-ui.js`: Mounted Step 4 `reorder` quizzes inside `.mandarin-reorder-mount` via `FiezelGrammarUpgrade.renderTokenOrder` with `targetLang: 'zh'` and lifecycle voice cleanup.
   - Synchronized 8 `grammar.token-voice-*` keys across `features/i18n/copy-id-grammar-labels.js`, `copy-th-grammar-labels.js`, and all 9 `features/i18n/locales/<loc>/grammar.json` catalogs.

---

## 2. Modified Files

- Core / Grammar / Mandarin / PTE:
  - `app.js`
  - `features/grammar/fiezel-grammar-upgrade.js`, `features/grammar/grammar-upgrade.css`
  - `features/grammar/grammar-vocab-bridge.js`, `features/grammar/grammar-vocab-bridge.css`
  - `features/mandarin/mandarin-ui.js`
  - `features/pte/fiezel-pte-engine.js`, `features/pte/fiezel-pte-ui.js`
- Voice Studio:
  - `features/voice-studio/vite.voice-studio.config.ts` (`sanitizeRegexQuotesForStaticScanners` for lodash/recharts property-path RegExp literals so vendor slices stay free of static quote-parity bleed into `id-golden-baseline.json`)
  - `features/voice-studio/src/App.tsx`, `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx`
  - `features/voice-studio/src/lib/braincore.ts`, `handyVad.ts`, `liveTransport.ts`, `sileroVadGate.ts`
  - `features/voice-studio/dist/voice-studio.js`, `features/voice-studio/dist/voice-studio.css`
- i18n & Build Sync:
  - `features/i18n/copy-id-grammar-labels.js`, `copy-th-grammar-labels.js`
  - `features/i18n/locales/{en,fil,id,ja,km,ms,ru,th,vi}/grammar.json`
  - `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `index.html`, `call.html`, `features/voice-studio/call.html`, `kurikulum.html`, `misi.html`
  - `id-golden-baseline.json`, `reports/th-ui-leak-report.json`
- Tests & Handoff:
  - `tests/pte-academic-engine-test.js`, `tests/pte-handy-vad-test.js`, `tests/voice-studio-reformulation-translation-test.js`, `tests/voice-pte-realtime-probe.js`
  - `docs/handoffs/FIEZEL-M025794-ORAL-FLUENCY-VOICE-GRAMMAR-HANDOFF.md`

---

## 3. Empirical & Automated Verification

- `npm --prefix features/voice-studio run build` (clean production build for `m025-794`)
- `node tests/pte-academic-engine-test.js` (35/35 PASS)
- `node tests/pte-handy-vad-test.js` (13/13 PASS)
- `node tests/pte-bank-integrity-test.js` (30/30 PASS)
- `npx --prefix features/voice-studio tsx tests/voice-studio-reformulation-translation-test.js` (9/9 PASS)
- `node tests/voice-pte-realtime-probe.js` (Headless Chromium Playwright E2E Scenarios 1–6 PASS)
- `node tests/voice-studio-ui-architecture-test.js` (8/8 PASS)
- `node tests/voice-duplex-fullphone-contract-test.js` (13/13 PASS)
- `node tests/grammar-8-upgrades-full-test.js` (PASS)
- `node tests/learning-integrity-2026-10-04-test.js` (36/36 PASS)
- `node tests/braincore-pedagogy-audit-2026-10-11-test.js` (15/15 PASS)
- `node tests/alasan-soal-test.js` (39/39 PASS)
- `node tests/japanese-bank-survives-load-test.js` (5/5 PASS)
- `node tests/grammar-vocab-leveling-test.js` (PASS)
- `node tests/th-ui-leak-test.js` (PASS)
- `node tests/i18n-global-purity-test.js` (11/11 PASS)
- `node tests/id-golden-snapshot-test.js` (PASS)
- `node tests/curriculum-cache-version-test.js` (33 checks PASS, build `m025-794`)
- `node tests/gate-registry-test.js` (10/10 PASS)
- `node tests/critical-surface-protection-test.js` (9/9 PASS)
- `node tests/secret-scan-test.js` (46/46 PASS, 0 findings)
- `node tools/bump-build.mjs --check` (`Selaras`)
- `node tools/fiezel-guardians.mjs self-test` (PASS)

---

## 4. Next Steps & Release Roadmap

1. Open Pull Request from `fix/oral-fluency-acoustic-engine` -> `main` (`m025-794`).
2. Monitor all required CI checks (`quality`, `A6`–`A14`, PR Review) to 100% green before merge.
3. Merge via squash after confirming no concurrent deployment run is in progress on `main`, watch `FIEZEL Deploy Site`, and verify production `https://fiezel.my.id/app/coordination/BUILD-VERSION.json` serves `m025-794`.
