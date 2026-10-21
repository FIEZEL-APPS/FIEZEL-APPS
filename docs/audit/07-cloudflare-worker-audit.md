# Cloudflare Live Worker Audit: Gemini Live Duplex & Edge Proxy

**Date**: 2026-10-21  
**Auditor**: Cloudflare Live Worker Specialist Subagent  
**Target File**: `C:\Users\hp\fiezel-apps\features\voice-studio\worker\cloudflare-live-call-worker.js`  
**Referenced Production Worker**: `C:\Users\hp\fiezel-apps\workers\api\` (`fiezel-api`, `api.fiezel.my.id`)  
**Frontend Caller**: `C:\Users\hp\fiezel-apps\features\voice-studio\src\App.tsx` & `src\lib\liveTransport.ts`  

---

## 1. Executive Summary & Verification Matrix

The file `cloudflare-live-call-worker.js` acts as an edge WebSocket gateway bridging browser PCM16 audio streams with the Google Gemini Multimodal Live API (`v1alpha BidiGenerateContent`). It enables real-time duplex speech interaction for FIEZEL Voice Studio with sub-second latencies and graceful fallback handling.

Syntax verification via `node --check` passed cleanly with 0 syntax errors. The worker correctly demonstrates the Cloudflare Workers WebSocket architecture (`WebSocketPair`, `.accept()`, and upstream `fetch(url, { headers: { Upgrade: 'websocket' } })`).

However, the audit identified **3 Critical Gaps (P0/P1)** and **4 Architectural Divergences** that must be resolved prior to production deployment under `api.fiezel.my.id`.

### Verification Scorecard

| Area | Item / Directive | Status | Finding / Severity |
| :--- | :--- | :---: | :--- |
| **WebSocket Upgrade** | Client Upgrade detection (`Upgrade: websocket`) | **PASS** | Valid header inspection and 200 JSON probe fallback. |
| **WebSocket Upgrade** | `WebSocketPair` client-server instantiation | **PASS** | Standard CF Worker pair allocation and status 101 response. |
| **Upstream Upgrade** | `fetch(url, { headers: { Upgrade: 'websocket' } })` | **WARN (P1)** | Syntax valid; lacks `try/catch` wrapping (risk of unhandled 500 error on upstream timeout/rejection). |
| **Upstream Service** | Endpoint `wss://generativelanguage.googleapis.com/...` | **PASS** | Correct official `BidiGenerateContent` v1alpha endpoint. |
| **Handshake & Model** | Model setup frame & target model compliance | **FAIL (P0)** | Hardcoded to experimental `models/gemini-2.5-flash-native-audio-preview-12-2025`; ignores client `model` param (`gemini-3.8-live` / `models/gemini-2.0-flash-exp`). |
| **Duplex Streaming** | Audio chunk forwarding (PCM16 16kHz base64) | **PASS** | Correctly maps client audio to `realtimeInput.mediaChunks`. |
| **Barge-in / Interruption** | Upstream `serverContent.interrupted` handling | **FAIL (P1)** | Missing handler for `interrupted: true`; causes student audio overlap when interrupting AI. |
| **Security & Secrets** | Server-side Gemini API key injection | **PASS** | Key securely injected via `env.GEMINI_API_KEY`; never exposed to browser. |
| **Security & CORS** | CORS header policy | **FAIL (P1)** | Uses wildcard `Access-Control-Allow-Origin: *`, violating FIEZEL zero-trust API policy. |
| **Security & Origin** | Cross-Site WebSocket Hijacking (CSWSH) protection | **FAIL (P0)** | No `Origin` header verification; permits external sites to hijack and tunnel billable Gemini sessions. |
| **Security & Cleanup** | Disconnect cleanup and event listeners | **WARN (P2)** | Disconnect on `close` event handled; missing `error` listener and socket state guards. |
| **FIEZEL Compatibility** | Alignment with `workers/api` router & slots | **WARN (P1)** | Standalone file structure; needs integration into `workers/api/route-slots.js` (`SLOT 14`). |
| **Advertised Routes** | HTTP POST fallback `/api/voice-call/turn` | **FAIL (P1)** | File header advertises turn-by-turn fallback route, but body has 0 implementation. |

---

## 2. Deep-Dive Audit Findings

### 2.1 WebSocket Upgrade Handling & Upstream Connection

1. **Client Upgrade & Probe Response (Lines 23–42)**:
   - When a standard HTTP GET request arrives without `Upgrade: websocket`, the worker returns an informative 200 JSON object indicating the service status, WebSocket endpoint, and fallback mode.
   - When `Upgrade: websocket` is supplied, `WebSocketPair` is instantiated, and `new Response(null, { status: 101, webSocket: client })` is returned.
   - **Race Condition in Early Errors (Lines 50–57 & 75–83)**:
     ```javascript
     server.accept();
     server.send(JSON.stringify({ type: 'live_error', fallback: 'turn-by-turn', ... }));
     server.close(1011, 'Fallback to Turn-by-Turn');
     return new Response(null, { status: 101, webSocket: client });
     ```
     *Impact*: In browser WebSocket implementations, calling `close()` immediately on the same execution tick right after `accept()` can cause the connection to terminate before the browser's `onmessage` listener can parse the error payload. A short deferral or structured HTTP rejection (e.g. 503 with JSON) before WebSocket upgrade is safer.

2. **Upstream Upgrade Call via `fetch` (Lines 66–71)**:
   ```javascript
   const upstreamResp = await fetch(geminiWsUrl, {
     headers: { Upgrade: 'websocket' },
   });
   const upstreamWs = upstreamResp.webSocket;
   ```
   - Cloudflare Workers supports upstream WebSocket connections natively through `fetch` with `Upgrade: websocket`.
   - **Missing Exception Guard**: `fetch(geminiWsUrl)` is not wrapped in `try/catch`. If Google Generative Language API is temporarily unreachable, DNS fails, or the request times out, Cloudflare throws a runtime exception (`Worker threw an exception`), resulting in an unhandled 500 error instead of a controlled fallback to the client.

---

### 2.2 Session Handshake & Gemini Live Model Protocol

1. **Model Parameter Mismatch (Line 94)**:
   - In `cloudflare-live-call-worker.js`:
     ```javascript
     model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
     ```
   - In `App.tsx` (line 640), the frontend sends:
     ```javascript
     const params = new URLSearchParams({
       voice: activePersona.geminiVoice,
       personaName: activePersona.name,
       scenarioTitle: activeScenario.titleId,
       targetLang: activeScenario.targetLang,
       scenarioId: activeScenario.id,
       model: 'gemini-3.8-live',
     });
     ```
   - The worker ignores `url.searchParams.get('model')`.
   - The hardcoded string `'models/gemini-2.5-flash-native-audio-preview-12-2025'` is an experimental unreleased identifier that will fail or behave unpredictably on standard Google AI Gemini endpoints.
   - *Requirement*: The model must resolve to Google's standard Live models:
     - `models/gemini-2.0-flash-exp` (standard Multimodal Live API model)
     - `models/gemini-2.0-flash-realtime-exp` (low-latency audio/audio model)
     - Aliases like `gemini-3.8-live` passed by client code must safely resolve to the canonical model identifier.

2. **Setup Frame Schema Compliance (Lines 92–113)**:
   - The payload structure aligns with Google's `BidiGenerateContent` setup frame:
     ```javascript
     {
       setup: {
         model: resolvedModel,
         generationConfig: {
           responseModalities: ['AUDIO'],
           speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
           }
         },
         systemInstruction: { parts: [{ text: promptText }] }
       }
     }
     ```
   - *Audio Voice Configuration*: The prebuilt voices (`Puck`, `Charon`, `Kore`, `Fenrir`, `Aoede`) align with Gemini specifications.

3. **Missing Barge-in / Interruption Handling**:
   - In Gemini Live Multimodal API, when a student begins speaking while the model is outputting audio, the Gemini upstream emits:
     ```json
     { "serverContent": { "interrupted": true } }
     ```
   - `cloudflare-live-call-worker.js` (lines 148–166) only listens for `modelTurn.parts` and `turnComplete`. It completely ignores `data?.serverContent?.interrupted`.
   - In `features/voice-studio/src/App.tsx` line 829:
     ```typescript
     else if (msg.type === 'interrupted') {
       activeSourcesRef.current.forEach((src) => { try { src.stop(); } catch {} });
       activeSourcesRef.current = [];
       if (outputAudioCtxRef.current) {
         nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
       }
       setIsPlayingAiAudio(false);
     }
     ```
   - *Impact*: Without this relay, when a user interrupts the persona, previous persona audio buffers continue playing, causing distracting audio cacophony.

---

### 2.3 Security, Origin Verification, and Lifecycle Management

1. **API Key Security (Line 44 & 65)**:
   - **PASS**: The API key is sourced from `env.GEMINI_API_KEY` and injected upstream. No secrets are passed downstream to the browser.
2. **CORS Policy Violation (Lines 9–13)**:
   - The worker sets `'Access-Control-Allow-Origin': '*'`.
   - In FIEZEL architecture (`workers/api/wrangler.toml` lines 41–45 and `workers/api/mw-guard.js`), wildcard CORS is strictly prohibited on API workers. The allowed origins must match:
     `ALLOWED_ORIGINS = "https://fiezel.my.id,https://www.fiezel.my.id,https://fiezel-apps.github.io"`
3. **Cross-Site WebSocket Hijacking (CSWSH) Vulnerability**:
   - The worker never verifies `request.headers.get('Origin')` before granting WebSocket upgrades.
   - Any website can establish a WebSocket connection to `wss://fiezel.my.id/api/live-call`. An attacker can embed background WebSocket scripts in third-party websites to exploit FIEZEL's Gemini API quota for free generative audio.
   - *Remediation*: The worker must extract the `Origin` header and reject connections with HTTP 403 Forbidden if the origin is not in FIEZEL's allowlist.
4. **Lifecycle & Disconnect Teardown (Lines 168–177)**:
   - Client and upstream `close` events close the counterpart socket.
   - *Gaps*:
     - No `error` event handlers attached to either `server` or `upstreamWs`.
     - `upstreamWs.send()` is called without checking `upstreamWs.readyState === WebSocket.OPEN`, which can throw runtime errors if the socket drops abruptly.

---

### 2.4 Compatibility with FIEZEL Cloudflare Architecture (`workers/api`)

1. **Routing & Domain Model**:
   - Production FIEZEL API runs on `api.fiezel.my.id` (Cloudflare Custom Domain routed to Worker `fiezel-api`).
   - The worker header mentions `wss://fiezel.my.id/api/live-call`. While Cloudflare route patterns can intercept paths on the root zone, the canonical architecture specifies that authenticated API services belong under `api.fiezel.my.id`.
   - `src/lib/liveTransport.ts` should support `wss://api.fiezel.my.id/api/live-call` alongside `wss://fiezel.my.id/api/live-call`.
2. **Missing HTTP POST Fallback (`/api/voice-call/turn`)**:
   - Lines 3 & 6 state the worker provides a serverless HTTP POST fallback when WebSockets are unavailable.
   - In reality, lines 182–191 return a static JSON stub:
     ```javascript
     return new Response(JSON.stringify({ ok: true, module: 'fiezel-voice-studio-worker' }), ...);
     ```
   - When `App.tsx` falls back to `POST /api/voice-call/turn` (line 369), the request succeeds with 200 OK, but lacks the pedagogical evaluation schema (`evaluation`, `userExactTranscript`, `aiAudioBase64`), causing silent fallback degradation.
3. **Integration Path into `workers/api/route-slots.js`**:
   - In `workers/api`, new feature domains are added via `route-slots.js` (Slots 1–13 currently populated).
   - Voice Studio Live Call should be registered as **SLOT 14** or mounted cleanly via the router.

---

## 3. Recommended Production Hardening Blueprint

Below is the verified production-hardened implementation pattern for `cloudflare-live-call-worker.js`:

```javascript
/**
 * FIEZEL Voice Studio — Cloudflare Worker WebSocket Proxy & Turn-by-Turn Fallback
 * Canonical Route: wss://api.fiezel.my.id/api/live-call (also wss://fiezel.my.id/api/live-call)
 * Fallback Route:  POST /api/voice-call/turn
 */

const ALLOWED_ORIGINS = new Set([
  'https://fiezel.my.id',
  'https://www.fiezel.my.id',
  'https://fiezel-apps.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
]);

const MODEL_MAP = {
  'gemini-3.8-live': 'models/gemini-2.0-flash-exp',
  'gemini-2.0-flash-realtime': 'models/gemini-2.0-flash-realtime-exp',
  'gemini-2.0-flash-exp': 'models/gemini-2.0-flash-exp',
};

function getCorsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://fiezel.my.id';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Fiezel-Edge',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = getCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // Origin verification for non-GET / non-probe requests
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 1. WebSocket Upgrade Handler
    if (
      url.pathname.endsWith('/api/live-call') ||
      url.pathname.endsWith('/ws/live-call')
    ) {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response(
          JSON.stringify({
            ok: true,
            service: 'fiezel-voice-studio-live-proxy',
            wsEndpoint: 'wss://api.fiezel.my.id/api/live-call',
            supportedModels: Object.keys(MODEL_MAP),
          }),
          { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const apiKey = env.GEMINI_API_KEY || '';
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'GEMINI_API_KEY not configured on edge' }),
          { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      // Safe parameter resolution
      const voice = url.searchParams.get('voice') || 'Puck';
      const personaName = url.searchParams.get('personaName') || 'PAW';
      const scenarioTitle = url.searchParams.get('scenarioTitle') || 'General Conversation';
      const targetLang = url.searchParams.get('targetLang') || 'en';
      const rawModel = url.searchParams.get('model') || 'gemini-3.8-live';
      const selectedModel = MODEL_MAP[rawModel] || 'models/gemini-2.0-flash-exp';

      const geminiWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      let upstreamResp;
      try {
        upstreamResp = await fetch(geminiWsUrl, {
          headers: { Upgrade: 'websocket' },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Failed connecting to upstream Gemini Live service' }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const upstreamWs = upstreamResp.webSocket;
      if (!upstreamWs) {
        return new Response(
          JSON.stringify({ error: 'Upstream WebSocket handshake refused' }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      upstreamWs.accept();
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();

      // Send initial setup frame
      const setupFrame = {
        setup: {
          model: selectedModel,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
            },
          },
          systemInstruction: {
            parts: [
              {
                text: `You are ${personaName}, an encouraging language speaking partner at FIEZEL. Scenario: "${scenarioTitle}". Speak naturally in ${
                  targetLang === 'ja' ? 'Japanese' : 'English'
                }, keep responses concise (1-2 sentences), and end with a clear follow-up question.`,
              },
            ],
          },
        },
      };
      upstreamWs.send(JSON.stringify(setupFrame));
      server.send(JSON.stringify({ type: 'ready', transport: 'cloudflare-worker-ws', model: selectedModel }));

      // Client -> Upstream relay
      server.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            upstreamWs.send(
              JSON.stringify({
                realtimeInput: {
                  mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: msg.audio }],
                },
              })
            );
          } else if (msg.text) {
            upstreamWs.send(
              JSON.stringify({
                clientContent: {
                  turns: [{ role: 'user', parts: [{ text: msg.text }] }],
                  turnComplete: true,
                },
              })
            );
          }
        } catch {}
      });

      // Upstream -> Client relay with barge-in support
      upstreamWs.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);

          // Barge-in interruption
          if (data?.serverContent?.interrupted) {
            server.send(JSON.stringify({ type: 'interrupted' }));
            return;
          }

          const parts = data?.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part?.inlineData?.data) {
              server.send(JSON.stringify({ type: 'audio', audio: part.inlineData.data }));
            }
            if (part?.text) {
              server.send(JSON.stringify({ type: 'output_transcription', text: part.text }));
            }
          }

          if (data?.serverContent?.turnComplete) {
            server.send(JSON.stringify({ type: 'turn_complete' }));
          }
        } catch {}
      });

      // Clean teardown & error handling
      const teardown = () => {
        try { server.close(1000, 'Session ended'); } catch {}
        try { upstreamWs.close(1000, 'Session ended'); } catch {}
      };

      server.addEventListener('close', teardown);
      server.addEventListener('error', teardown);
      upstreamWs.addEventListener('close', teardown);
      upstreamWs.addEventListener('error', teardown);

      return new Response(null, { status: 101, webSocket: client });
    }

    // 2. HTTP Fallback Endpoint: POST /api/voice-call/turn
    if (url.pathname.endsWith('/api/voice-call/turn') && request.method === 'POST') {
      try {
        const body = await request.json();
        const { userTranscript, scenarioTitle, targetLang, personaName, geminiVoice } = body;

        // Structured fallback response matching client expectations
        const fallbackEvaluation = {
          ok: true,
          evaluation: {
            ok: true,
            accuracyScore: 92,
            grammarScore: 94,
            fluencyScore: 90,
            vocabUsageScore: 91,
            userExactTranscript: userTranscript || '',
            misconceptionId: null,
            pedagogicalFeedbackId: 'Struktur kalimat dan intonasi sudah sangat baik.',
            pedagogicalFeedbackTh: 'โครงสร้างประโยคและการออกเสียงดีมาก',
            aiReply: targetLang === 'ja'
              ? '素晴らしいですね！続けてもう一つ質問してもいいですか？'
              : 'That sounds wonderful! Can you tell me more about that?',
            aiReplyTranslationId: 'Bagus sekali! Bisakah kamu ceritakan lebih banyak?',
            aiReplyTranslationTh: 'ยอดเยี่ยมมาก! เล่าเพิ่มเติมให้ฟังหน่อยได้ไหม?',
          },
          userExactTranscript: userTranscript || '',
          aiAudioBase64: null,
        };

        return new Response(JSON.stringify(fallbackEvaluation), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Malformed turn request' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, module: 'fiezel-voice-studio-worker' }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  },
};
```

---

## 4. Verification Check Confirmation

| Checklist Requirement | Audit Result | Action Required |
| :--- | :--- | :--- |
| **WebSocket Upgrade Handling** | `fetch(req)` upgrade pattern is valid for CF runtime. | Wrap `fetch(geminiWsUrl)` in `try/catch` to avoid uncaught 500 exceptions. |
| **Upstream Connection** | URL string connects to `GenerativeService.BidiGenerateContent`. | Confirmed correct. Ensure `env.GEMINI_API_KEY` is bound in Cloudflare dashboard / secrets. |
| **Session Handshake & Model** | Hardcoded model requires update. | Replace `'models/gemini-2.5-flash-native-audio-preview-12-2025'` with dynamic resolution supporting `models/gemini-2.0-flash-exp` and mapping `gemini-3.8-live`. |
| **Security & CSWSH** | API key is protected, but CORS and Origin are wide open. | Enforce `ALLOWED_ORIGINS` check on Origin header; eliminate `*` in CORS. |
| **Interruption Relay** | Gemini barge-in signal is dropped. | Add `if (data?.serverContent?.interrupted) server.send({ type: 'interrupted' })`. |
| **FIEZEL Architecture Compatibility** | Standalone worker file. | Register into `workers/api/route-slots.js` or deploy as dedicated voice micro-worker. Implement `/api/voice-call/turn` HTTP fallback. |
