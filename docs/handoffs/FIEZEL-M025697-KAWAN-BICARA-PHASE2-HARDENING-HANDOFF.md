# FIEZEL HANDOFF DOSSIER: KAWAN BICARA (MITRA KAIWA) PHASE 2 HARDENING
**Build Target**: `m025-697`
**Date**: 2026-10-28
**Scope**: `fix(kawan-bicara): speech backoff, goal rules & adaptive speaking telemetry (m025-697)`
**Branch**: `feat/kawan-bicara-medium-hardening-m025-697`

---

## 1. Executive Summary & Audit Context
Phase 2 completes the resolution of medium-severity architectural findings and hardening recommendations (Bugs #16-#35) from the Kawan Bicara comprehensive audit:
1. **Bug #16 (Thinking Indicator Race Guard)**:
   - Guarded `state.isThinking = false` in `deliverAssistantReply` with `if (onScreen)` so replies intended for background scenarios do not prematurely turn off the thinking indicator of the actively rendered conversation.
2. **Bug #17 (Incremental Feed Patching - `patchFeed`)**:
   - Replaced unconditional destructive innerHTML replacement with `patchFeed(container)` when the container scenario and course match the active state.
   - Preserves active `#fzcInput` DOM node, keeping Japanese IME composition sessions (Kanji/Kana) intact and preventing draft loss, scroll jerking, or audio detachments.
3. **Bug #18 (SpeechRecognition Backoff & Circuit Breaker)**:
   - Added exponential backoff ladder `[80, 250, 600, 1200, 2000]ms` and `MAX_CONSECUTIVE_SR_ERRORS = 6` to eliminate the infinite 80ms CPU-hogging restart loop.
   - When 6 consecutive errors are encountered (e.g. microphone disconnected or permission revoked), the circuit breaker triggers and seamlessly surfaces the fallback text input dock.
4. **Bug #20 (Scenario Goal Rules & Anti-Fake Milestone)**:
   - Added verified linguistic patterns for `intro` scenario goals (`/はじめまして/`, `/から来ました|出身/`, `/よろしく/`).
   - Banned arbitrary fake milestone completions based on raw message count (`userMsgCount >= 1/2/3`), strictly adhering to the Zero-Dumbing Invariant.
5. **Bug #23 (Fallback Text Input in Voice Call Overlay)**:
   - Added `#fzcCallTextInputWrap` and toggle button `#fzcCallBtnKeyboard` (`#fzcCallBtnType`) to allow typing during calls.
   - Updated `commitUserTurn(overrideText)` to support typed turn commits when `SpeechRecognition` is absent (e.g. Android WebView / non-Chromium) or in loud environments.
6. **Bug #25 (Storage Debounce & Quota Protection)**:
   - Debounced `saveState()` (300ms) with `flushSaveState()` on unload.
   - Wrapped `localStorage.setItem` in try/catch to intercept `QuotaExceededError` (codes 22/1014) and automatically prune oldest inactive scenario histories.
7. **Bug #29 (Furigana Syntax Repair)**:
   - Fixed broken furigana bracket in ramen scenario (`[硬](かた)めで[願](ねが)いします！`).
8. **Bugs #30 & #31 (Persona DRY Canonical Unification)**:
   - Unified persona definitions by reading single source of truth `FiezelVoiceScenarios.VOICE_PERSONAS`.
   - Replaced all disparate occurrences of `フィゼル先生` with canonical `Keita Senpai (健太先輩)`.
9. **Bug #33 (Message ID Collision Guard)**:
   - Added monotonic counter `msgSeqCounter` and random alphanumeric suffix to message IDs (`msg-user-TIMESTAMP-SEQ-RANDOM`), preventing DOM ID collisions during rapid turns.
10. **Bug #35 (Speaking Adaptive Credibility Weight - $\kappa$)**:
    - Wired `computeSpeakingKappa` into `features/brain/fiezel-speaking-adaptive.js` (`FiezelSpeakingAdaptive.evidence`).
    - Computes dynamic evidence credibility weight ($\kappa \le 0.60$) based on coverage, acoustic noise floor (800ms), and prompt replay penalties instead of static scalars.

---

## 2. Empirical Verification & Test Suite
All test suites passed 100% locally before release bump and commit:
1. `node tests/kawan-bicara-hardening-test.js` - **10/10 PASS**
   - Tri-State verdicts, Prerequisite bypass, Nonce bridge, Audio ducking, Echo discrimination, VoiceOrb defensiveness, SpeechRecognition backoff ladder, Scenario goal patterns, Speaking adaptive kappa calculation, Persona DRY consistency.
2. `node tests/audio-latency-barge-in-test.js` - **PASS**
3. `node tests/voice-call-ai-studio-port-test.js` - **PASS**
4. `node tests/interactive-chat-braincore-telemetry-test.js` - **7/7 PASS**
5. `node tests/interactive-chat-test.js` - **11/11 PASS**
6. `node tests/id-golden-snapshot-test.js` - **PASS** (Baseline re-certified)
7. `node tests/th-ui-leak-test.js` - **PASS**
8. `node tests/curriculum-cache-version-test.js` - **33/33 PASS** (`m025-697`)
9. `node tests/gate-registry-test.js` - **10/10 PASS** (414 test files certified)

---

## 3. Touched Files
- `features/interactive-chat/fiezel-interactive-chat.js`
- `features/interactive-chat/fiezel-voice-call.js`
- `features/interactive-chat/interactive-chat.css`
- `tests/kawan-bicara-hardening-test.js`
- `id-golden-baseline.json`
- `coordination/BUILD-VERSION.json`
- `sw.js`
- `core-config.js`
- `features/neural-voice/fiezel-diag-panel.js`
- `kurikulum.html`
- `misi.html`
- `call.html`
- `features/voice-studio/call.html`
- `android/app/src/main/assets/public/*`
- `docs/handoffs/FIEZEL-M025697-KAWAN-BICARA-PHASE2-HARDENING-HANDOFF.md`
