# FIEZEL-M025785 — Kawan Bicara Mobile PWA Microphone Parity with Mochi SOS & 13-Point CI Quality Gate

## 1. Executive Summary
This release (`m025-785`) resolves the mobile PWA microphone regression in **Kawan Bicara** (`call.html` / `features/voice-studio`) so that user speech capture, VAD sensitivity, and full-duplex turn-taking operate with 100% architectural parity with **Mochi SOS** (`features/mascot/fiezel-mochi-voice-sos.js`). Furthermore, to prevent any future agent from re-introducing cross-realm `AudioContext`/`getUserMedia` hijacking or breaking the Kawan Bicara microphone pipeline, **6 new permanent contract checks (`[Test 8]` through `[Test 13]`)** have been added to `tests/voice-duplex-fullphone-contract-test.js` (which runs automatically in `.github/workflows/quality.yml` on every PR).

---

## 2. Root Causes Identified
1. **Cross-Realm Parent-to-Iframe `AudioContext` & `MediaStream` Hijacking (`app.js`, `fiezel-interactive-chat.js`, `App.tsx`)**:
   - When the user tapped **"Mulai Bicara"** on the Home card, `app.js` pre-created `window.__fzSharedLiveAudioCtx` and called `navigator.mediaDevices.getUserMedia` in the parent window (`window.__fzSharedMicStreamPromise`), then passed them into the `call.html` iframe (`#fzMitraKaiwaStudioFrame`).
   - On mobile Chrome / Android WebView / iOS Safari PWAs, attaching a `MediaStream` or `AudioContext` created in the parent realm to a `MediaStreamAudioSourceNode` / `AudioWorkletNode` / `ScriptProcessorNode` inside an iframe causes silent audio buffers (`rms = 0.0000`) or suspended audio graphs.
   - By contrast, **Mochi SOS** creates its own same-realm `AudioContext` and calls `navigator.mediaDevices.getUserMedia` directly inside the user's button tap inside the same window realm.
2. **Pre-Call Confirmation Modal Breaking User-Gesture Activation (`App.tsx`)**:
   - `requestStartLiveCall()` intercepted the user's tap to open a confirmation modal (`setShowStartCallConfirm(true)`) instead of starting the call synchronously inside the click handler when free daily quota or sufficient gems (`>= 5`) were available.
3. **Overly Aggressive VAD Noise Floor & Missing Formant-Band Voice Detection (`handyVad.ts`, `App.tsx`)**:
   - `handyVad.ts` initialized `INITIAL_NOISE_FLOOR_DB = -50.0` (RMS `0.00316`), which blinded the detector to normal mobile microphone levels (`rms ~ 0.0028–0.008`), whereas Mochi SOS uses a `300Hz–3300Hz` formant band analyzer (`analyzeHumanVoiceBandFrame`) and triggers at `rms >= 0.0022`.
   - `attachScriptProcessorFallback` used a `4096`-sample buffer (`~85.3ms` latency) instead of `2048` samples (`~42.6ms`).
4. **Ambient Mic Noise Interrupting AI Opening Greeting (`App.tsx`)**:
   - Ambient noise on initial mic connection triggered `userAudioBurstActiveRef` before the AI tutor finished its opening greeting (`awaitingOpeningTurnRef`), cutting off the opening prompt.
5. **AI Spoken Reply Dropped When `userAudioBurstActiveRef` remained `true` (`App.tsx`)**:
   - When Gemini Live responded fast (before the `1050ms` client silence timer expired), `userAudioBurstActiveRef.current` was still `true`, causing `ws.onmessage` to discard incoming AI audio chunks (`incomingAudioChunks.length = 0`).

---

## 3. Architectural Fixes Applied
1. **Zero Cross-Realm Audio/Mic Sharing (`app.js`, `features/interactive-chat/fiezel-interactive-chat.js`, `features/voice-studio/src/App.tsx`)**:
   - Removed all creation and forwarding of `__fzSharedLiveAudioCtx`, `__fzSharedMicStream`, and `__fzSharedMicStreamPromise`.
   - `call.html` exclusively creates and reuses its own same-realm `liveAudioCtxRef.current` (`new AudioContext()`) and warms it up with a 1-frame silent `AudioBuffer` inside `primeAudioPlayback()`.
   - `stopLiveCall()` keeps `liveAudioCtxRef.current` alive across calls (matching Mochi SOS `_sharedLiveAudioCtx`).
2. **Synchronous User-Gesture Call Start (`features/voice-studio/src/App.tsx`)**:
   - `requestStartLiveCall()` immediately calls `primeAudioPlayback()` and `startLiveCall()` inside the user click gesture whenever `hasDailyFree || balance >= KAWAN_BICARA_MIN_START_GEMS`.
3. **Mochi SOS Formant-Band VAD Parity (`features/voice-studio/src/App.tsx`, `features/voice-studio/src/lib/handyVad.ts`)**:
   - Added `analyzeHumanVoiceBandFrame(float32, inRate)` (`300Hz–3300Hz` human vocal band filter + ZCR check).
   - Reduced `ScriptProcessorNode` buffer size to `2048` samples (`liveCtx.createScriptProcessor(2048, 1, 1)`).
   - Lowered `INITIAL_NOISE_FLOOR_DB` in `handyVad.ts` from `-50.0` to `-65.0` and added `clearPreRoll()`.
   - Streamed continuous 16kHz PCM (`audio/pcm;rate=16000`) while `!aiActuallyPlaying` and scheduled `scheduleUserBurstEnd()` (`1050ms` silence hold) to send `audioStreamEnd: true`.
4. **Opening Turn Protection & Anti-Drop AI Audio (`features/voice-studio/src/App.tsx`)**:
   - Added `awaitingOpeningTurnRef` and `isAiServerTurnOpenRef` so initial ambient mic noise never aborts the AI's opening greeting.
   - Updated `ws.onmessage` so incoming AI audio chunks during normal listening immediately transition out of `userAudioBurstActiveRef` (`userAudioBurstActiveRef.current = false; clearUserBurstEndTimer();`) and play back without dropping packets.
5. **Cleaned `customVocabTerms` (`features/voice-studio/src/App.tsx`)**:
   - Removed internal persona names (`Fiezel`, `Mochi`, `Xiao Mochi`, `Sensei Nanami`, `Keita Senpai`) from `customVocabTerms` to prevent ASR hallucination on short utterances.

---

## 4. Permanent CI Quality Gate Protection (`tests/voice-duplex-fullphone-contract-test.js`)
Expanded `tests/voice-duplex-fullphone-contract-test.js` from 7 checks to **13 permanent checks (`[Test 1]`–`[Test 13]`)**:
- **`[Test 8]`**: Forbids `__fzSharedLiveAudioCtx`, `__fzSharedMicStream`, and `parentSharedCtx` across `app.js`, `fiezel-interactive-chat.js`, and `App.tsx`.
- **`[Test 9]`**: Enforces 1-frame silent `AudioBuffer` unlock in `primeAudioPlayback()`, persistent `liveAudioCtxRef` in `stopLiveCall()`, and synchronous `startLiveCall()` inside `requestStartLiveCall()`.
- **`[Test 10]`**: Enforces `analyzeHumanVoiceBandFrame` (`300Hz–3300Hz`), `2048`-sample `ScriptProcessorNode`, Mochi SOS `isListeningSpeech` sensitivity (`v.rms >= 0.0022`), and `INITIAL_NOISE_FLOOR_DB = -65.0` + `clearPreRoll()` in `handyVad.ts`.
- **`[Test 11]`**: Enforces `awaitingOpeningTurnRef` opening greeting protection and anti-drop AI reply handling (`incomingAudioChunks` never wiped by `userAudioBurstActiveRef`).
- **`[Test 12]`**: Enforces continuous `audio/pcm;rate=16000` streaming + `scheduleUserBurstEnd` (`1050ms`) + clean `customVocabTerms`.
- **`[Test 13]`**: Verifies compiled production bundle `features/voice-studio/dist/voice-studio.js` contains the live fixes and zero `parentSharedCtx` / `__fzSharedLiveAudioCtx`.

---

## 5. Empirical Verification Summary
- **Headless Chromium Playwright Live WebSocket & Synthetic Speech Probes (`kawan-mic-probe.mjs`)**:
  - `flow=inside` (Direct inside `call.html`): `sentAudioFrames=345`, `PARENT {"gum":[]}`, `IFRAME {"gum":[{"audio":true}]}`, `inputTranscription="Halo Sensei, saya dengar dengan jelas. Tolong jawab singkat ya."`, multi-turn AI spoken replies verified.
  - `flow=home` (Home card `"Mulai Bicara"` -> `#fzMitraKaiwaStudioFrame` -> tap call button): `sentAudioFrames=265`, `PARENT {"gum":[]}`, `IFRAME {"gum":[{"audio":true}]}`, `inputTranscription="Halo Sensei, saya dengar dengan jelas."`, multi-turn AI spoken replies verified.
- **Local Quality Gates**:
  - `node tests/voice-duplex-fullphone-contract-test.js` -> **13/13 PASSED**
  - `node tests/voice-studio-ui-architecture-test.js` -> **PASSED**
  - `node tests/home-kawan-bicara-card-test.js` -> **PASSED**
  - `node tests/kawan-bicara-hardening-test.js` -> **PASSED**
  - `node tests/kawan-bicara-neural-voice-test.js` -> **PASSED**
  - `node tests/id-golden-snapshot-test.js` -> **PASSED**
  - `node tests/th-ui-leak-test.js` -> **PASSED**
  - `node tests/curriculum-cache-version-test.js` -> **PASSED**
  - `node tests/gate-registry-test.js` -> **PASSED**
