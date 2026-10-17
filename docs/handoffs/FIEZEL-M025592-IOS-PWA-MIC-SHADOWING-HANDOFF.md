# FIEZEL Handoff Dossier: m025-592

## Scope & Objective
- **Build Version**: `m025-592`
- **Component**: `features/interactive-chat/` (`fiezel-voice-call.js`, `fiezel-interactive-chat.js`, `interactive-chat.css`)
- **Focus**:
  1. Fix iPhone PWA (iOS Standalone WebClip / Safari WebKit) microphone permission dialog failure & provide dedicated iPhone settings guidance.
  2. Implement responsive kinetic soundwave visualizer in Shadowing & Pronunciation practice mode that dynamically bounces to the learner's voice on both Android and iPhone.
  3. Prevent AVAudioSession hardware collision between Web Audio capture and speech recognition on iOS WebKit.
  4. Ensure zero trailing whitespace and 100% green local test suite.

---

## Root Causes Diagnosed
1. **iOS WebKit Asynchronous User Gesture Expiration**:
   - In `initMediaStream()`, passing complex dictionary audio constraints (`{ echoCancellation: true, noiseSuppression: true, autoGainControl: true }`) triggered `OverconstrainedError` / rejection on iOS WebClips.
   - The `.catch()` fallback called `getUserMedia({ audio: true })` inside a microtask. In iOS WebKit, the synchronous user gesture token had already expired, causing immediate `NotAllowedError` without presenting the iOS permission dialog.
2. **Premature Track Destruction & Redundant Media Requests**:
   - Inside the microphone permission modal (`#fzcMicModal`), clicking "Aktifkan Mikrofon Sekarang" immediately stopped the freshly acquired stream (`tr.stop()`) and invoked `onRetry()`, which requested `getUserMedia` again in an async loop.
   - On iOS, stopping the track and re-requesting in an async context frequently threw permission errors or failed to reopen the audio device.
3. **PWA Standalone UX Mismatch**:
   - The modal told users to tap the lock icon (🔒) in the address bar. In iOS Standalone PWA, there is no address bar and no lock icon.
4. **Suspended AudioContext in Shadowing**:
   - `startShadowingAudioVisualizer` instantiated `new AudioContext()` in an asynchronous promise turn without calling `.resume()`. WebKit & Chromium held it in `suspended` state, resulting in all frequency bins returning zero and freezing the visualizer bars flat at 4px.
5. **iOS AVAudioSession Capture Collision**:
   - Opening both `getUserMedia` and `webkitSpeechRecognition` simultaneously caused WebKit audio session locking.

---

## Architectural Solutions Delivered
1. **iOS-First Direct Audio Constraints (`fiezel-voice-call.js`)**:
   - On iOS / iPadOS, `initMediaStream()` immediately requests `{ audio: true }` synchronously within the user gesture turn without passing unsupported complex dictionaries.
   - Supported preacquired stream reuse: `initMediaStream(opts.preacquiredStream)` bypasses secondary calls and binds the granted stream directly.
2. **Dedicated iPhone PWA Settings Guidance (`fiezel-voice-call.js`)**:
   - Detects `isIOS` and `isStandalone`.
   - If Standalone PWA: guides learner to iPhone **Settings (Pengaturan) $\rightarrow$ Safari $\rightarrow$ Mikrofon: Izinkan (Allow) / Tanya (Ask)** or via Safari `aA` website settings.
   - The modal retry handler now passes the active stream directly to `start({ preacquiredStream: stream })`.
3. **Kinetic Soundwave & Resumed Audio Engine (`fiezel-interactive-chat.js`)**:
   - Automatically resumes `AudioContext` (`shadowingAudioCtx.resume()`).
   - Added `runShadowingVisualizerLoop` with dual telemetry: real Web Audio frequency bins when available, plus speech activity energy boosted by `SpeechRecognition` events (`onaudiostart`, `onsoundstart`, `onspeechstart`, `onresult`).
   - On iOS, avoids `getUserMedia` collision while shadowing and lets recognition events drive the kinetic sinusoidal soundwave equalizer.
4. **CSS Polish (`interactive-chat.css`)**:
   - Added styles for `.fzc-mic-modal-help-ios`, `.fzc-ios-help-step`, `.fzc-step-num`, and `.fzc-ios-substeps`.

---

## Verification & Quality Gates
- `node tests/id-golden-snapshot-test.js`: PASS
- `node tests/th-ui-leak-test.js`: PASS
- `node tests/curriculum-cache-version-test.js`: PASS (m025-592)
- `node tests/gate-registry-test.js`: PASS
- `node tests/voice-call-two-way-test.js`: PASS (6/6)
- `node tests/ios-pwa-mic-shadowing-test.js`: PASS (4/4)
- `git diff --check`: 0 trailing whitespace violations.
