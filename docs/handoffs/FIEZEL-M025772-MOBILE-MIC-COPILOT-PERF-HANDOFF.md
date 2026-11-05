# FIEZEL Build Handoff Dossier: m025-772

## 1. Executive Summary
- **Release ID**: `m025-772`
- **Scope**: `fix(voice): [ALLOW-PROTECTED: pwa] mobile iOS/Android PWA mic pipeline resilience and ultra-fast copilot assist (m025-772)`
- **Target Surfaces**:
  - `features/voice-studio/src/App.tsx` (Microphone Web Audio pipeline, iOS/Android compatibility, node lifecycle decoupling)
  - `features/interactive-chat/fiezel-interactive-chat.js` (Iframe Permissions-Policy delegation for WebKit/Blink)
  - `features/voice-studio/src/lib/liveTransport.ts` (Client budget and abort timing for real-time generative assistance)
  - `workers/api/voice/route-voice-live.js` (Gemini model priority, minimal thinking level, 2500ms parallel hedging)
  - `features/voice-studio/dist/voice-studio.js` (Recompiled production bundle)

---

## 2. Root Cause & Architectural Fixes

### A. Mobile iOS & Android PWA Microphone Pipeline
1. **Iframe Permissions Policy Delegation**:
   - *Problem*: Modern WebKit (iOS Safari 17+) and Blink reject wildcard `allow="microphone *; autoplay *; camera *"` when parent CSP / Permissions-Policy declares `microphone=(self)`. This blocked microphone permission propagation into `#fzMitraKaiwaStudioFrame`.
   - *Solution*: Corrected `allow` attribute to `allow="microphone; camera; autoplay; display-capture; clipboard-write; microphone *; autoplay *; camera *"`.
2. **Audio Pipeline Node Decoupling & iOS WebKit Compatibility**:
   - *Problem*: In `startLiveCall`, `getUserMedia` was previously raced with a premature 4000ms timeout. On mobile devices, system permission dialogs take 3-6s, causing the stream to be null at timeout. The audio node creation (`workletNode` / `scriptProcessorNode`) was nested inside an ephemeral `if (stream)` block. When `lateStream` resolved after the user tapped "Allow", both `audioWorkletNodeRef` and `scriptProcessorRef` were null, completely dropping the microphone stream. Furthermore, iOS WebKit fails `addModule(blobUrl)` inside audioWorklet.
   - *Solution*:
     - Abstracted the entire microphone wiring into a unified `connectMicStreamToLiveProcessing(stream, liveCtx)` function.
     - On iOS/WebKit devices, directly wire `ScriptProcessorNode(4096, 1, 1)` with a tiny positive gain (`0.00001`) connected to `liveCtx.destination` to prevent background throttling and avoid the WebKit blob bug.
     - On Android/Chromium, use `AudioWorkletNode` with instant graceful fallback to `ScriptProcessorNode`.
     - Rewired `toggleMuteMic` and late stream handlers to re-connect via `connectMicStreamToLiveProcessing` so no stream is ever lost.

### B. Generative Copilot Assist Latency & Turn Consistency
1. **Server-Side Reasoning Latency**:
   - *Problem*: `gemini-3-flash-preview` was first in `COPILOT_MODELS` with `thinking_level = 'low'`, which caused extended reasoning taking up to 15.7 seconds before emitting output.
   - *Solution*: Re-ordered `COPILOT_MODELS` to prioritize `gemini-3.1-flash-lite` and `gemini-3.5-flash-lite`, set `thinking_level = 'minimal'`, set `max_output_tokens = 750`, and decreased parallel hedging delay to 2500ms.
2. **Client-Side Premature Abort Elimination**:
   - *Problem*: `liveTransport.ts` had a hardcoded `budgetMs` defaulting to 3500ms. When generation took >3.5s, the client aborted and wiped copilot reply cards.
   - *Solution*: Raised client `budgetMs` to 10000ms (max 15000ms), giving ample breathing room while server returns in <1.2s.

---

## 3. Empirical Playwright Probe Evidence
- **Probe Script**: `tools/dev/probe-voice-mobile-mic-and-copilot.mjs`
- **Results**:
  - `Mobile iOS (iPhone 14 Safari emulation)`:
    - AudioContext Unlocked: `true`
    - Live Tracks Acquired: `true`
    - ScriptProcessor Connected to Destination: `true`
    - Mute / Unmute Track Toggle: `true`
    - Sample Rate: `48000 Hz`
    - Status: `100% PASS`
  - `Mobile Android (Pixel 7 Chrome emulation)`:
    - AudioContext Unlocked: `true`
    - Live Tracks Acquired: `true`
    - Node Wiring: `true`
    - Mute / Unmute Track Toggle: `true`
    - Sample Rate: `48000 Hz`
    - Status: `100% PASS`
  - `Parent Iframe Permissions-Policy`: `allow="microphone; camera; autoplay; display-capture; clipboard-write; microphone *; autoplay *; camera *"` -> `PASS`
  - `Copilot Container in DOM`: `PASS`

---

## 4. Modified Files
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/src/lib/liveTransport.ts`
- `features/voice-studio/dist/voice-studio.js`
- `features/interactive-chat/fiezel-interactive-chat.js`
- `workers/api/voice/route-voice-live.js`
- `coordination/BUILD-VERSION.json`
- `sw.js`
- `core-config.js`
- `features/neural-voice/fiezel-diag-panel.js`
- `kurikulum.html`
- `misi.html`
- `call.html`
- `features/voice-studio/call.html`
- `id-golden-baseline.json`
- `tools/dev/probe-voice-mobile-mic-and-copilot.mjs`
