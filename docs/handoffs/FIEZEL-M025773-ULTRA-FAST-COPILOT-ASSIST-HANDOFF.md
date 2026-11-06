# FIEZEL m025-773 Handoff Dossier: Ultra-Fast Streaming Copilot Assist & Zero-Cooldown Pool Routing

## 1. Executive Summary
- **Identifier**: `m025-773`
- **Scope**: Voice Studio (`features/voice-studio/`), API Gateway Worker (`workers/api/voice/route-voice-live.js`), and PWA Hexa-Sync cache.
- **Problem Solved**:
  - Learners experienced lingering skeleton loading screens ("Meracik Jawaban...") for multiple seconds on mobile iOS/Android after partner AI spoke.
  - Root cause investigation revealed:
    1. A single 429 on any model set `${key}::ALL_REST` for 300,000ms, completely locking out healthy models across that API key.
    2. Pool rotation rotated model index (`startIdx % COPILOT_MODELS.length`), attempting non-existent/heavy models first.
    3. REST lockout forced calls into `invokeGeminiLiveStructuredJson` (WebSocket) which took 8.5 seconds or failed with `live_json_closed_1011` (HTTP 503).
    4. HTTP 503 caused client-side `fallback()` with `isOfflineFallback: true` and `source: 'loading'`, which was filtered out by `!c.isOfflineFallback`, leaving `copilotCards: []` permanently stuck in skeleton state.
    5. Client-side fetch was strictly reactive (waited until after `turnComplete`), adding network latency to perceived wait time.
- **Solution Delivered**:
  1. **Strict Lite-First Priority**: Always attempts `gemini-3.1-flash-lite` across rotating keys first (fastest model, highest RPM, ~600-900ms response).
  2. **Eliminated `ALL_REST` Lockout**: Independent per-model cooldowns (45s max) so rate limits on one model never lock out healthy models.
  3. **Hedge Latency Reduction**: Cut hedge timer from 2500ms to 1200ms and max deadline from 10000ms to 8000ms.
  4. **Universal REST Fallback**: `invokeSingleGeminiJson` falls back smoothly to standard Google `generateContent` API if `interactions` endpoint returns 404/400.
  5. **Speculative Streaming Pre-Fetch**: When AI output transcription forms a closing question clause (`?`, `？`, `.`) with $\ge 3$ words, copilot generation initiates in the background while audio is still playing, resulting in **0ms perceived latency** upon `turnComplete`.
  6. **Zero Blank Screen Flickering**: Existing cards remain gracefully visible during generation rather than instantly resetting to empty skeleton placeholders.

---

## 2. File Invariant & Modifications
1. `workers/api/voice/route-voice-live.js`:
   - Updated `COPILOT_MODELS` to valid, high-speed flash models: `['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview', 'gemini-2.5-flash']`.
   - Separated `_ttsCooldownMap` from `_copilotCooldownMap` to prevent cross-contamination.
   - Removed `${key}::ALL_REST` everywhere.
   - Implemented strict lite-first candidate ordering across rotating keys.
2. `features/voice-studio/src/App.tsx`:
   - Preserved existing cards in `triggerRealtimeCopilotForAi` (only shows skeleton if screen has 0 cards).
   - Added speculative pre-fetch on streaming `outputTranscription` closure.
   - Guaranteed non-empty card fallback to prevent permanent skeleton freeze.
3. `features/voice-studio/src/lib/liveTransport.ts`:
   - Changed fallback return `source` from `'loading'` to `'ai-realtime'`.
4. `features/voice-studio/dist/voice-studio.js`:
   - Rebuilt with Vite 6.4.5 for production.
5. PWA Hexa-Sync & CI:
   - Synchronized build version across 6 core endpoints to `m025-773`.

---

## 3. Verification & Empirical Proof
- `node tests/voice-copilot-relevance-gate-test.js`: 26/26 passed 100%.
- `node tests/voice-duplex-fullphone-contract-test.js`: 7/7 passed 100%.
- `node tests/th-ui-leak-test.js`: 4751 keys verified, 0 leaks.
- `node tests/curriculum-cache-version-test.js`: 33 assertions, 3 pages, build m025-773 passed.
- `node tests/id-golden-snapshot-test.js`: 13 locked files, 8218 Indonesian literals intact.
- `node tools/fiezel-guardians.mjs a10`: `PASS_WITH_RISK_REPORT`, 0 errors, 0 warnings.
