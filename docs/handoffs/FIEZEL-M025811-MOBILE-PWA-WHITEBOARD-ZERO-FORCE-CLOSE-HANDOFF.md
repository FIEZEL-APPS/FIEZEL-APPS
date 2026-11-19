# FIEZEL m025-811 — Mobile PWA Whiteboard Zero-Force-Close Handoff Dossier

- **Build**: `m025-811` (from `m025-810`)
- **Authority**: OWNER/MASTER authority
- **Status**: Verified locally (empirical CDP mobile stress probe + 14/14 contract + 31/31 speed/quiz + offline-voice + update-prompt + boot-order + multi-device comfort + golden baseline); ready for PR merge & production deploy.

## 1. Forensic Audit Summary (Why Real Mobile PWA Still Force-Closed in Whiteboard)

Following `m025-810`, mobile PWA users (iOS Safari Standalone & Android Chrome PWA) could still hit an OS-level WebContent kill / splash reload while inside Whiteboard (`call.html` iframe) during active auto-slideshow & auto-scrolling. Empirical inspection and CDP profiling uncovered 7 concrete root causes:

1. **156 MB Host Background Autoload RAM Spike (`features/neural-voice/fiezel-voice-offline-autoload.js`)**:
   - On iOS Safari (no `BackgroundFetch`, no `navigator.connection`), `FiezelVoiceOfflineAutoload` remained unblocked (`blocked: ""`) 8 seconds after boot while inside Kawan Bicara / Whiteboard, fetching 20 MB chunks and merging 78 MB + 78 MB (`new Uint8Array(size)`) inside the same WebContent process.
2. **Split-Brain Forced Splash Reload (`features/ui/fiezel-boot-tail.js`, `features/ui/fiezel-update-prompt.js`)**:
   - `FiezelStage.lessonMode()` returned `false` inside `fz-view-chat` / `#fzMitraKaiwaStudioFrame`. Any `visibilitychange` (control center, notification, mic prompt, audio interruption) while a newer SW was active triggered `window.location.replace(bustUrl)` — instantaneously kicking the user back to the splash screen.
3. **Active Call `SileroNeuralVadGate` (25–40 MB WASM + 32ms `ScriptProcessor`) Never Paused (`sileroVadGate.ts`, `App.tsx`)**:
   - During an active voice call, `SileroNeuralVadGate` kept running ONNX inference on the main thread every 32ms and allocating `Float32Array` + base64 payloads even while Whiteboard owned 100% of audio.
4. **Duplicate Hardware `AudioContext` Spawning (`boardAudioUnlock.ts`, `App.tsx`)**:
   - `getSharedBoardAudioContext()` instantiated a separate `AudioContext` inside the iframe instead of adopting the already-unlocked Host/Live `AudioContext` (`__fzSharedLiveAudioCtx` / `liveAudioCtxRef`), violating strict iOS hardware AudioContext ceilings.
5. **5x Float32 PCM Allocation Spike, Leaked Base64 `dataUrl`, & `isMobileLowMem` TDZ (`InCallLearningWorkbenchModal.tsx`, `speechAlignment.ts`)**:
   - `isMobileLowMem` was declared at line 4594 after being referenced in `applyTrackFraction` (line 4455), creating a TDZ `ReferenceError` whenever `!fullScript` invoked `runSilentClock`.
   - `processSpeechBuffer` + `toMono` cloned Float32 PCM buffers 4–5x per chunk (~15 MB peak/chunk) and retained ~700 KB `dataUrl` strings even after WebAudio decoded cleanly or finished playing; `HTMLAudioElement` cleanup omitted `.load()`.
6. **70 MB Full-Canvas Idle Ink `<svg>` + Inline `transform: scale()` & `filter: drop-shadow()` GPU Layer Storms (`LiveWhiteboardCanvas.tsx`, `WhiteboardVisualDiagrams.tsx`, `index.css`)**:
   - A full-canvas `absolute inset-0 w-full h-full z-20` `<svg>` (~1170x15000px @ 3x DPR = ~70 MB GPU texture) stayed mounted even when the pen was idle (`strokes.length === 0`).
   - Inline `style={{ transform: 'scale(...)', filter: 'drop-shadow(...)' }}` on diagram cards/SVG `<g>` nodes and unthrottled `MutationObserver` + `<380ms` interrupted `scrollTo({ behavior: 'smooth' })` calls triggered CoreAnimation backing-store storms during auto-scrolling.
   - Far-queued future diagrams mounted all Rough.js `<path>` nodes + synchronous `getTotalLength()` reflows on Frame 1.
7. **Mochi Offscreen 2D Canvas Retention (`mochi-mascot/fiezel-mochi.js`)**:
   - `destroy()` released the WebGL context but left 4 offscreen `1024x1024` 2D canvases (`skinCanvas`, `faceCanvas`, `auraBackCanvas`, `fxCanvas`, ~16 MB CoreGraphics RAM) non-zeroed.

## 2. Empirical Before vs After Verification (iPhone 14 Pro 3x `390x844` CDP Stress Probe)

| Metric | Before (`m025-810`) | After (`m025-811`) |
| --- | --- | --- |
| `autoloadStatus.blocked` in Chat/WB | `""` (158.9 MB unblocked!) | `"in_voice_studio"` (100% held) |
| Host `<canvas>` count in Chat/WB | `1` | `0` |
| Iframe WebGL `<canvas>` count in WB | `0` | `0` |
| Iframe extra `AudioContext`s created | `1` (3 total) | `0` (reuses shared Host/Live context) |
| Idle full-canvas ink `<svg>` mounted | `true` (~70 MB 3x texture) | `false` |
| Inline `transform: scale()` layers in WB | `4` | `0` |
| SVG `drop-shadow` filters in WB | `0` (guard active) | `0` (mobile-hardened across all diagrams) |
| Auto-scroll continuity (`scrollTop`) | `502px` (`wb_dynamic_mindmap`) | `499px` (`wb_dynamic_mindmap`, identical UX) |
| Audio playback mode | `webaudio` | `webaudio` |

## 3. Files Modified

- `features/neural-voice/fiezel-voice-offline-autoload.js`: Hold chunk download & pre-assembly merge (`in_voice_studio`) while `fz-view-chat` / `#fzMitraKaiwaStudioFrame` is active.
- `features/interactive-chat/fiezel-interactive-chat.js`: Resume deferred offline autoload cleanly on Kawan Bicara `unmount()`.
- `features/ui/fiezel-boot-tail.js`: Guard split-brain reloader (`inChatOrWb`) against reloading to splash during Kawan Bicara / Whiteboard.
- `features/ui/fiezel-update-prompt.js`: Treat Kawan Bicara / Whiteboard as `lessonActive() === true`.
- `mochi-mascot/fiezel-mochi.js`: Zero offscreen 2D canvases (`width = 0; height = 0`) and dispose all `CanvasTexture`s inside `destroy()`.
- `features/voice-studio/src/lib/boardAudioUnlock.ts`: Export `registerSharedBoardAudioContext()`, adopt existing `__fzSharedLiveAudioCtx`, and call `a.load()` on prime cleanup.
- `features/voice-studio/src/lib/sileroVadGate.ts`: Add `pause()` / `resume()` and short-circuit `onFrameProcessed` when `paused` or `isWorkbenchOpen?.()`.
- `features/voice-studio/src/lib/speechAlignment.ts`: Add zero-copy `toMonoView()` for read-only RMS alignment.
- `features/voice-studio/src/App.tsx`: Register `liveCtx` with `registerSharedBoardAudioContext(liveCtx)` and pause/resume `sileroVadGateRef` + separate `inputAudioCtxRef` around Whiteboard lifecycle.
- `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx`: Hoist `isMobileLowMem` (fixes TDZ bug), bypass Float32 copy via `processSpeechBuffer` on mobile, drop `dataUrl` when WebAudio decoded & running, evict played chunks on mobile, release HTMLAudio with `.load()`, and use `decodeAudioDataSafe` for quiz coach speech.
- `features/voice-studio/src/components/LiveWhiteboardCanvas.tsx`: Skip `getTotalLength()` path animations on mobile, eliminate mobile inline `transform: scale()` & SVG `filter: drop-shadow()`, add `380ms` smooth auto-scroll cooldown + throttled `MutationObserver` + `document.hidden` guard, defer far-queued heavy diagrams (`stepIdx > activeStepIndex + 1`), and mount full-canvas freehand ink `<svg>` only when pen/strokes are active.
- `features/voice-studio/src/components/WhiteboardVisualDiagrams.tsx`: Remove mobile inline `transform: scale()` and heavy shadow spreads while keeping crisp focus rings and opacity dimming.
- `features/voice-studio/src/index.css`: Disable mobile decorative infinite ping/pulse/nib animations and table-row transforms under `@media (max-width: 767px)`.
- `features/voice-studio/dist/voice-studio.js` & `dist/voice-studio.css`: Rebuilt production Voice Studio bundle.
- `tests/whiteboard-contract-test.js`: Added `PASS 14` locking all `m025-811` mobile PWA zero-force-close invariants.
- Build bump (`m025-811`) & `id-golden-baseline.json` refresh via `tools/bump-build.mjs`.

## 4. Verification Results

- `node tests/whiteboard-contract-test.js`: **PASS 14/14**
- `node tests/whiteboard-speed-quiz-probe.cjs --strict`: **PASS 31/31** (0 page errors)
- `node tests/voice-offline-fallback-test.js`: **PASS 17/17**
- `node tests/update-prompt-test.js`: **PASS 14/14**
- `node tests/boot-order-test.js`: **PASS**
- `node tests/pwa-cache-test.js`: **PASS**
- `node tests/multi-device-comfort-test.js`: **PASS 8/8**
- `node tests/id-golden-snapshot-test.js`: **PASS**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/curriculum-cache-version-test.js`: **PASS** (`m025-811`)
- `node tests/gate-registry-test.js`: **PASS 10/10**
- `node tools/bump-build.mjs --check`: **Selaras (`m025-811`)**

## 5. Next Steps

- Open PR from `fix/mobile-pwa-whiteboard-zero-force-close` to `main`, verify all 16 CI gates are 100% GREEN, squash-merge, monitor `FIEZEL Quality Gate` and `FIEZEL Deploy Site`, and verify `https://fiezel.my.id/app/coordination/BUILD-VERSION.json` serves `m025-811`.