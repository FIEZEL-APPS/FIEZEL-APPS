/**
 * tests/voice-pte-realtime-probe.js
 *
 * Headless Chromium Playwright Empirical Probe for BOTH:
 * 1) Kawan Bicara (`call.html`): 300-3300 Hz formant gate, noise-floor/rumble immunity,
 *    realtimeInputConfig setup, real-time speech burst -> audioStreamEnd < 900ms, zero SpeechRecognition contention.
 * 2) PTE Academic (`index.html?view=pte`): Prep-phase WS pre-warm & noiseFloor calibration,
 *    noise rejection during recording, zero OS SpeechRecognition contention when WS is open,
 *    incremental `inputTranscription` delta assembly, graceful 380ms stop flush (`audioStreamEnd`),
 *    automatic SpeechRecognition fallback when WS fails (capturing real alt.confidence),
 *    and non-hardcoded Retell Lecture fluency/pronunciation scoring.
 */
'use strict';

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.wasm': 'application/wasm',
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, 'http://127.0.0.1');
      let relPath = decodeURIComponent(reqUrl.pathname || '/');
      if (relPath === '/') relPath = '/index.html';
      const safePath = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
      let fullPath = path.join(ROOT, safePath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        fullPath = path.join(fullPath, 'index.html');
      }
      if (!fs.existsSync(fullPath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      fs.createReadStream(fullPath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function buildProbeInitScript(opts = {}) {
  return `
    (() => {
      const MODE = ${JSON.stringify(opts.mode || 'ok')};
      try {
        localStorage.setItem('fiezel-auth-v1', JSON.stringify({
          signedIn: true,
          sub: 'probe-user-001',
          name: 'Probe Student',
          email: 'probe@fiezel.test'
        }));
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Probe Student' }));
        localStorage.setItem('fz_target_course', 'en');
        localStorage.setItem('fz_gemini_api_key', 'AIzaProbeFakeKey1234567890');
      } catch (_) {}

      const probeState = {
        wsOpenCount: 0,
        sentSetups: [],
        sentTypes: [],
        pcmCount: 0,
        streamEndCount: 0,
        lastStreamEndAt: 0,
        speechRecStarts: 0,
        lastSpeechRecInstance: null,
        activeWsInstances: [],
        audioDrivers: [],
        audioDriverNames: []
      };
      window.__PROBE__ = probeState;

      // Keep Chromium's native fake MediaStream (--use-fake-device-for-media-stream)
      // so AudioContext.createMediaStreamSource(stream) always gets a genuine MediaStream!
      // Intercept AudioWorkletNode and ScriptProcessorNode handlers to suppress background fake-device tone
      // while allowing our deterministic window.__driveAudioFrames(...) injection.
      const OrigWorkletNode = window.AudioWorkletNode;
      if (OrigWorkletNode) {
        window.AudioWorkletNode = class ProbeAudioWorkletNode extends OrigWorkletNode {
          constructor(ctx, name, options) {
            super(ctx, name, options);
            const origPort = this.port;
            let userOnMsg = null;
            let sentWarmZero = false;
            origPort.onmessage = (ev) => {
              if (!userOnMsg) return;
              if (!sentWarmZero) {
                sentWarmZero = true;
                userOnMsg({ data: new Float32Array(ev && ev.data ? ev.data.length : 1024) });
                return;
              }
              if (window.__probeDrivingAudio) {
                userOnMsg(ev);
              }
            };
            Object.defineProperty(this, 'port', {
              value: {
                postMessage: (...a) => origPort.postMessage(...a),
                close: () => origPort.close(),
                get onmessage() { return userOnMsg; },
                set onmessage(fn) {
                  userOnMsg = fn;
                  if (typeof fn === 'function') {
                    probeState.audioDriverNames.push(name);
                    probeState.audioDrivers.push((samples) => fn({ data: samples }));
                  }
                }
              }
            });
          }
        };
      }

      const OrigAudioCtx = window.AudioContext || window.webkitAudioContext;
      if (OrigAudioCtx) {
        const origCreateSP = OrigAudioCtx.prototype.createScriptProcessor;
        if (origCreateSP) {
          OrigAudioCtx.prototype.createScriptProcessor = function (...args) {
            const node = origCreateSP.apply(this, args);
            let userCb = null;
            Object.defineProperty(node, 'onaudioprocess', {
              configurable: true,
              get() { return userCb; },
              set(fn) {
                userCb = fn;
                if (typeof fn === 'function') {
                  probeState.audioDrivers.push((samples) => {
                    fn({
                      inputBuffer: {
                        numberOfChannels: 1,
                        sampleRate: this.context ? this.context.sampleRate : 48000,
                        length: samples.length,
                        getChannelData: () => samples
                      }
                    });
                  });
                }
              }
            });
            return node;
          };
        }
      }

      // Mock SpeechRecognition to count contention vs fallback invocations
      window.webkitSpeechRecognition = window.SpeechRecognition = class MockSpeechRec {
        constructor() {
          this.lang = 'en-US';
          this.continuous = true;
          this.interimResults = true;
          this.onresult = null;
          this.onerror = null;
          this.onend = null;
        }
        start() {
          probeState.speechRecStarts += 1;
          probeState.lastSpeechRecInstance = this;
        }
        stop() {}
      };

      // Helper to synthesize frames in page context
      window.__driveAudioFrames = (kind, frameCount, sampleRate = 48000, frameLen = 1024) => {
        const fn = probeState.audioDrivers[probeState.audioDrivers.length - 1];
        if (!fn) throw new Error('No captured audio driver registered yet (count=' + probeState.audioDrivers.length + ')');
        for (let f = 0; f < frameCount; f++) {
          const buf = new Float32Array(frameLen);
          for (let i = 0; i < frameLen; i++) {
            const t = (f * frameLen + i) / sampleRate;
            if (kind === 'rumble') {
              buf[i] = 0.14 * Math.sin(2 * Math.PI * 72 * t);
            } else if (kind === 'hiss') {
              buf[i] = 0.12 * Math.sin(2 * Math.PI * 6400 * t);
            } else if (kind === 'speech') {
              buf[i] =
                0.22 * Math.sin(2 * Math.PI * 165 * t) +
                0.18 * Math.sin(2 * Math.PI * 560 * t) +
                0.12 * Math.sin(2 * Math.PI * 1450 * t) +
                0.08 * Math.sin(2 * Math.PI * 2400 * t);
            } else {
              buf[i] = 0;
            }
          }
          fn(buf);
        }
      };

      window.__emitWsTranscript = (text, turnComplete = false) => {
        const ws = probeState.activeWsInstances[probeState.activeWsInstances.length - 1];
        if (!ws || !ws.onmessage) return false;
        if (text) {
          ws.onmessage({ data: JSON.stringify({ serverContent: { inputTranscription: { text } } }) });
        }
        if (turnComplete) {
          ws.onmessage({ data: JSON.stringify({ serverContent: { turnComplete: true } }) });
        }
        return true;
      };

      // Deterministic Gemini Live WebSocket Mock
      window.WebSocket = class MockGeminiLiveWs {
        constructor(url) {
          this.url = url;
          this.readyState = 0; // CONNECTING
          this.onopen = null;
          this.onmessage = null;
          this.onerror = null;
          this.onclose = null;
          probeState.activeWsInstances.push(this);

          setTimeout(() => {
            if (MODE === 'fail_ws') {
              this.readyState = 3;
              if (this.onerror) this.onerror(new Error('Simulated network block'));
              if (this.onclose) this.onclose({ code: 1006, reason: 'blocked' });
              return;
            }
            this.readyState = 1; // OPEN
            probeState.wsOpenCount += 1;
            if (this.onopen) this.onopen({ type: 'open' });
          }, 25);
        }
        send(raw) {
          let parsed = null;
          try { parsed = JSON.parse(raw); } catch (_) {}
          if (!parsed) return;
          if (parsed.setup) {
            probeState.sentSetups.push(parsed.setup);
            setTimeout(() => {
              if (this.readyState === 1 && this.onmessage) {
                this.onmessage({ data: JSON.stringify({ setupComplete: {} }) });
                // Complete opening greeting immediately if in call studio mode
                if (parsed.setup.outputAudioTranscription) {
                  setTimeout(() => {
                    if (this.readyState === 1 && this.onmessage) {
                      this.onmessage({
                        data: JSON.stringify({
                          serverContent: {
                            outputTranscription: { text: 'Hello! Ready to speak.' },
                            turnComplete: true
                          }
                        })
                      });
                    }
                  }, 25);
                }
              }
            }, 20);
          } else if (parsed.realtimeInput) {
            if (parsed.realtimeInput.audio || (parsed.realtimeInput.mediaChunks && parsed.realtimeInput.mediaChunks.length)) {
              probeState.pcmCount += 1;
              probeState.sentTypes.push('pcm');
            }
            if (parsed.realtimeInput.audioStreamEnd === true) {
              probeState.streamEndCount += 1;
              probeState.lastStreamEndAt = Date.now();
              probeState.sentTypes.push('audioStreamEnd');
              if (MODE === 'auto_flush_transcript' && this.onmessage) {
                setTimeout(() => {
                  if (this.readyState === 1 && this.onmessage) {
                    this.onmessage({ data: JSON.stringify({ serverContent: { inputTranscription: { text: ' Right now.' } } }) });
                    this.onmessage({ data: JSON.stringify({ serverContent: { turnComplete: true } }) });
                  }
                }, 40);
              }
            }
          }
        }
        close(code, reason) {
          this.readyState = 3;
          if (this.onclose) this.onclose({ code, reason });
        }
      };
      window.WebSocket.CONNECTING = 0;
      window.WebSocket.OPEN = 1;
      window.WebSocket.CLOSING = 2;
      window.WebSocket.CLOSED = 3;
    })();
  `;
}

async function run() {
  console.log('--- Running Empirical Playwright Real-Time Voice & PTE Probe ---');
  const { server, baseUrl } = await startStaticServer();
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });

  try {
    // =========================================================================
    // SCENARIO 1: Kawan Bicara (`call.html`) Noise Immunity & Fast Turn-End
    // =========================================================================
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await ctx.route('**/api/voice/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            token: 'mock-token-kb',
            endpoint: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained',
          }),
        });
      });
      const page = await ctx.newPage();
      const pageErrors = [];
      const consoleLogs = [];
      const badResponses = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      page.on('console', (m) => consoleLogs.push(`[${m.type()}] ${m.text()}`));
      page.on('response', (res) => { if (res.status() >= 400) badResponses.push(`${res.status()} ${res.url()}`); });
      await page.addInitScript(buildProbeInitScript({ mode: 'ok' }));
      await page.goto(`${baseUrl}/call.html?lang=en&theme=light`, { waitUntil: 'domcontentloaded' });

      const startBtn = page.locator('button', { hasText: /Mulai Telepon FaceTime/i }).first();
      await startBtn.waitFor({ state: 'visible', timeout: 10000 });
      await startBtn.click();

      // Wait until setup + audio driver attached
      try {
        await page.waitForFunction(() => window.__PROBE__.sentSetups.length >= 1 && window.__PROBE__.audioDrivers.length >= 1, null, { timeout: 10000 });
      } catch (waitErr) {
        const snap = await page.evaluate(() => ({
          wsOpen: window.__PROBE__.wsOpenCount,
          setups: window.__PROBE__.sentSetups.length,
          drivers: window.__PROBE__.audioDrivers.length,
          wsUrls: window.__PROBE__.activeWsInstances.map((w) => w.url),
          bodySnippet: document.body ? document.body.innerText.slice(0, 300) : ''
        }));
        throw new Error(`Scenario 1 wait failed: ${waitErr.message} | snap=${JSON.stringify(snap)} | pageErrors=${JSON.stringify(pageErrors)}`);
      }
      await page.waitForTimeout(160);

      const setupPayload = await page.evaluate(() => window.__PROBE__.sentSetups[0]);
      assert.ok(setupPayload.realtimeInputConfig && setupPayload.realtimeInputConfig.automaticActivityDetection, 'Kawan Bicara WS setup must configure automaticActivityDetection');
      assert.strictEqual(setupPayload.realtimeInputConfig.automaticActivityDetection.silenceDurationMs, 400);
      assert.strictEqual(setupPayload.realtimeInputConfig.turnCoverage, 'TURN_INCLUDES_ONLY_ACTIVITY');

      // Pump 25 frames of 72 Hz room rumble + 6.4 kHz hiss (both > 0.05 RMS)
      await page.evaluate(() => {
        window.__driveAudioFrames('rumble', 15, 48000, 1024);
        window.__driveAudioFrames('hiss', 10, 48000, 1024);
      });
      await page.waitForTimeout(100);
      const afterNoise = await page.evaluate(() => ({
        pcm: window.__PROBE__.pcmCount,
        streamEnd: window.__PROBE__.streamEndCount,
        srStarts: window.__PROBE__.speechRecStarts,
      }));
      assert.strictEqual(afterNoise.pcm, 0, `Ambient rumble/hiss must send 0 PCM frames to Gemini Live (got ${afterNoise.pcm})`);
      assert.strictEqual(afterNoise.srStarts, 0, 'OS SpeechRecognition must remain inactive while Gemini Live mic pipeline runs');

      // Pump human vocal formant speech, then silence -> measure audioStreamEnd latency
      const endStart = Date.now();
      await page.evaluate(() => {
        window.__driveAudioFrames('speech', 22, 48000, 1024);
        window.__PROBE__.afterSpeechPcm = window.__PROBE__.pcmCount;
      });
      const afterSpeech = await page.evaluate(() => window.__PROBE__.pcmCount);
      assert.ok(afterSpeech >= 5, `Human vocal formants must stream PCM packets cleanly (sent=${afterSpeech})`);

      // Pump brief silence so hangover/burst timer settles
      await page.evaluate(() => {
        window.__driveAudioFrames('silence', 18, 48000, 1024);
        window.__PROBE__.afterSilencePcm = window.__PROBE__.pcmCount;
      });

      try {
        await page.waitForFunction(() => window.__PROBE__.streamEndCount >= 1, null, { timeout: 1500 });
      } catch (e2) {
        const diag = await page.evaluate(() => ({
          pcm: window.__PROBE__.pcmCount,
          afterSpeechPcm: window.__PROBE__.afterSpeechPcm,
          afterSilencePcm: window.__PROBE__.afterSilencePcm,
          streamEnd: window.__PROBE__.streamEndCount,
          drivers: window.__PROBE__.audioDrivers.length,
          driverNames: window.__PROBE__.audioDriverNames,
          sentTypesTail: window.__PROBE__.sentTypes.slice(-25),
          wsStates: window.__PROBE__.activeWsInstances.map((w) => w.readyState),
          setups: window.__PROBE__.sentSetups.length,
        }));
        throw new Error(`Scenario 1 streamEnd timeout: ${e2.message} | diag=${JSON.stringify(diag)} | badRes=${JSON.stringify(badResponses)} | console=${JSON.stringify(consoleLogs.slice(-15))} | errors=${JSON.stringify(pageErrors)}`);
      }
      const endState = await page.evaluate(() => ({
        streamEndCount: window.__PROBE__.streamEndCount,
        lastStreamEndAt: window.__PROBE__.lastStreamEndAt,
      }));
      const turnEndElapsedMs = Date.now() - endStart;
      assert.ok(turnEndElapsedMs < 950, `Kawan Bicara audioStreamEnd took ${turnEndElapsedMs}ms (must be < 950ms, no multi-second lag)`);
      console.log(`  ✓ Kawan Bicara E2E: noise rejected (0 PCM), speech streamed (${afterSpeech} PCM), audioStreamEnd fired in ${turnEndElapsedMs}ms, SpeechRec=0`);
      await ctx.close();
    }

    // =========================================================================
    // SCENARIO 2: PTE Hub Primary Gemini Live WS + Pre-Warm + Delta Flush
    // =========================================================================
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await ctx.route('**/api/voice/**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, token: 'mock-token-pte' }) });
      });
      const page = await ctx.newPage();
      await page.addInitScript(buildProbeInitScript({ mode: 'auto_flush_transcript' }));
      await page.goto(`${baseUrl}/index.html?view=pte`, { waitUntil: 'domcontentloaded' });

      await page.waitForFunction(() => window.FiezelPteUi && typeof window.FiezelPteUi.mount === 'function', null, { timeout: 10000 });
      await page.evaluate(() => {
        const host = document.getElementById('app') || document.body;
        window.FiezelPteUi.mount(host);
      });
      await page.waitForFunction(() => {
        const b = window.FiezelPteUi.getBanks();
        return b && Array.isArray(b.ra) && b.ra.length > 0;
      }, null, { timeout: 10000 });
      await page.evaluate(() => {
        window.FiezelPteUi.switchSection('speaking');
      });
      await page.waitForSelector('button.fz-pte-btn-primary', { timeout: 10000 });

      // Click "Start Preparation" -> triggers prep prewarm + noiseFloor calibration
      await page.click('button.fz-pte-btn-primary');
      await page.waitForFunction(() => window.__PROBE__.sentSetups.length >= 1 && window.__PROBE__.audioDrivers.length >= 1, null, { timeout: 10000 });
      await page.waitForTimeout(80);

      // Pump quiet noise during prep; must calibrate noiseFloor without streaming PCM
      await page.evaluate(() => {
        window.__driveAudioFrames('rumble', 8, 48000, 1024);
      });
      const prepStats = await page.evaluate(() => ({
        pcm: window.__PROBE__.pcmCount,
        setup: window.__PROBE__.sentSetups[0],
        timerState: window.FiezelPteUi.getState().timerState,
      }));
      assert.strictEqual(prepStats.timerState, 'preparing');
      assert.strictEqual(prepStats.pcm, 0, 'Pre-warm during prep must calibrate without streaming PCM');
      assert.ok(prepStats.setup.realtimeInputConfig.automaticActivityDetection, 'PTE WS setup must include automaticActivityDetection');

      // Click "Record Now"
      await page.click('button.fz-pte-btn-primary');
      await page.waitForFunction(() => window.FiezelPteUi.getState().timerState === 'recording', null, { timeout: 5000 });

      // Ensure zero OS SpeechRecognition contention while WS is healthy
      await page.waitForTimeout(120);
      await page.evaluate(() => {
        window.__driveAudioFrames('rumble', 10, 48000, 1024);
      });
      const afterPteNoise = await page.evaluate(() => ({
        pcm: window.__PROBE__.pcmCount,
        srStarts: window.__PROBE__.speechRecStarts,
      }));
      assert.strictEqual(afterPteNoise.pcm, 0, 'PTE HandyVad + BPF must drop 72Hz rumble during recording');
      assert.strictEqual(afterPteNoise.srStarts, 0, 'PTE must NOT spawn competing OS SpeechRecognition while Gemini Live WS is open');

      // Pump synthetic speech + emit incremental deltas
      await page.evaluate(() => {
        window.__driveAudioFrames('speech', 16, 48000, 1024);
        window.__emitWsTranscript('Climate ');
        window.__emitWsTranscript('change ');
        window.__emitWsTranscript('requ');
        window.__emitWsTranscript('ires urgent action.');
      });
      await page.waitForTimeout(50);

      const liveDomText = await page.locator('#fzPteLiveSpeechText').textContent();
      assert.strictEqual(liveDomText.trim(), 'Climate change requires urgent action.', 'Live DOM must assemble incremental deltas verbatim');

      // Click Finish Speaking -> mock auto_flush_transcript responds to audioStreamEnd with final delta (" Right now.") + turnComplete!
      const stopT0 = Date.now();
      await page.click('button.fz-pte-btn-primary.recording');
      await page.waitForFunction(() => window.FiezelPteUi.getState().timerState === 'result', null, { timeout: 3000 });
      const stopLatencyMs = Date.now() - stopT0;

      const pteResultState = await page.evaluate(() => ({
        st: window.FiezelPteUi.getState(),
        streamEnds: window.__PROBE__.streamEndCount,
      }));
      assert.ok(pteResultState.streamEnds >= 1, 'audioStreamEnd: true must be flushed to Gemini Live before closing WS');
      assert.strictEqual(
        pteResultState.st.lastResult.studentTranscript,
        'Climate change requires urgent action. Right now.',
        'Trailing post-stop Gemini delta must be recovered before evaluation'
      );
      assert.ok(
        pteResultState.st.speechConfidence > 0 && pteResultState.st.speechConfidence !== 0.94 && pteResultState.st.speechConfidence !== 0.92,
        `Confidence must be empirically calculated (got ${pteResultState.st.speechConfidence})`
      );
      console.log(`  ✓ PTE Primary WS E2E: prewarm OK, SpeechRec=0, rumble=0 PCM, incremental+flush transcript matched in ${stopLatencyMs}ms, conf=${pteResultState.st.speechConfidence}`);
      await ctx.close();
    }

    // =========================================================================
    // SCENARIO 3: PTE Hub SpeechRecognition Fallback & Dynamic Retell Scoring
    // =========================================================================
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await ctx.route('**/api/voice/**', (route) => {
        route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
      });
      const page = await ctx.newPage();
      await page.addInitScript(buildProbeInitScript({ mode: 'fail_ws' }));
      await page.goto(`${baseUrl}/index.html?view=pte`, { waitUntil: 'domcontentloaded' });

      await page.waitForFunction(() => window.FiezelPteUi && typeof window.FiezelPteUi.mount === 'function', null, { timeout: 10000 });
      await page.evaluate(() => {
        window.FiezelPteUi.mount(document.getElementById('app') || document.body);
      });
      await page.waitForFunction(() => {
        const b = window.FiezelPteUi.getBanks();
        return b && Array.isArray(b.rl) && b.rl.length > 0;
      }, null, { timeout: 10000 });
      await page.evaluate(() => {
        window.FiezelPteUi.switchSection('speaking');
        window.FiezelPteUi.switchMode('rl'); // Retell Lecture
      });
      await page.waitForSelector('button.fz-pte-btn-primary', { timeout: 10000 });
      await page.click('button.fz-pte-btn-primary'); // Start prep
      await page.click('button.fz-pte-btn-primary'); // Record Now

      // Wait for automatic SpeechRecognition fallback after WS failure
      await page.waitForFunction(() => window.__PROBE__.speechRecStarts >= 1, null, { timeout: 4000 });

      await page.evaluate(() => {
        const sr = window.__PROBE__.lastSpeechRecInstance;
        const r0 = [{ transcript: 'Um uh the lecture talked about solar energy grid.', confidence: 0.74 }];
        r0.isFinal = true;
        sr.onresult({ results: [r0] });
      });
      await page.click('button.fz-pte-btn-primary.recording');
      await page.waitForFunction(() => window.FiezelPteUi.getState().timerState === 'result', null, { timeout: 3000 });

      const fbRes = await page.evaluate(() => window.FiezelPteUi.getState());
      assert.strictEqual(fbRes.speechConfidence, 0.74, 'Fallback SpeechRecognition must preserve real alt.confidence (0.74)');
      assert.ok(
        fbRes.lastResult && typeof fbRes.lastResult.fluency.score === 'number' && fbRes.lastResult.fluency.score < 4,
        `Retell Lecture weak hesitant response must NOT receive hardcoded 4/5 fluency (got ${fbRes.lastResult && fbRes.lastResult.fluency && fbRes.lastResult.fluency.score})`
      );
      console.log(`  ✓ PTE Fallback E2E: WS fail triggered SpeechRec cleanly, preserved real confidence=${fbRes.speechConfidence}, dynamic RL fluency=${fbRes.lastResult.fluency.score}`);
      await ctx.close();
    }

    // =========================================================================
    // SCENARIO 4: PTE Hands-Free Per-Turn audioStreamEnd + Pearson 3s Auto-Close
    // =========================================================================
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await ctx.route('**/api/voice/**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, token: 'mock-token-pte-autoclose' }) });
      });
      const page = await ctx.newPage();
      await page.addInitScript(buildProbeInitScript({ mode: 'ok' }));
      await page.goto(`${baseUrl}/index.html?view=pte`, { waitUntil: 'domcontentloaded' });

      await page.waitForFunction(() => window.FiezelPteUi && typeof window.FiezelPteUi.mount === 'function', null, { timeout: 10000 });
      await page.evaluate(() => {
        window.FiezelPteUi.mount(document.getElementById('app') || document.body);
      });
      await page.waitForFunction(() => {
        const b = window.FiezelPteUi.getBanks();
        return b && Array.isArray(b.ra) && b.ra.length > 0;
      }, null, { timeout: 10000 });
      await page.evaluate(() => {
        window.FiezelPteUi.switchSection('speaking');
      });
      await page.waitForSelector('button.fz-pte-btn-primary', { timeout: 10000 });

      await page.click('button.fz-pte-btn-primary'); // preparing
      await page.waitForFunction(() => window.__PROBE__.audioDrivers.length >= 1 && window.__PROBE__.sentSetups.length >= 1, null, { timeout: 10000 });
      await page.waitForTimeout(80);
      await page.click('button.fz-pte-btn-primary'); // recording
      await page.waitForFunction(() => window.FiezelPteUi.getState().timerState === 'recording', null, { timeout: 5000 });
      await page.waitForTimeout(80);

      // Speak >= 450ms (26 frames * 21ms = 546ms) + stream transcript, then silence -> must emit audioStreamEnd immediately and auto-close at ~3s without clicking stop
      const silenceStart = Date.now();
      await page.evaluate(() => {
        window.__driveAudioFrames('speech', 26, 48000, 1024);
        window.__emitWsTranscript('Sustainable urban development improves long-term resilience.');
        window.__driveAudioFrames('silence', 24, 48000, 1024);
      });

      await page.waitForFunction(() => window.__PROBE__.streamEndCount >= 1, null, { timeout: 1000 });
      const immediateStreamEndMs = Date.now() - silenceStart;
      assert.ok(immediateStreamEndMs < 800, `PTE per-turn audioStreamEnd took ${immediateStreamEndMs}ms (must be < 800ms)`);

      await page.waitForFunction(() => window.FiezelPteUi.getState().timerState === 'result', null, { timeout: 4500 });
      const autoCloseMs = Date.now() - silenceStart;
      assert.ok(autoCloseMs >= 2700 && autoCloseMs < 4300, `Pearson 3s post-speech auto-close fired at ${autoCloseMs}ms (expected ~3000ms)`);
      const autoState = await page.evaluate(() => window.FiezelPteUi.getState());
      assert.strictEqual(autoState.lastResult.studentTranscript, 'Sustainable urban development improves long-term resilience.');
      console.log(`  ✓ PTE Auto-Close E2E: immediate audioStreamEnd (${immediateStreamEndMs}ms) + hands-free Pearson 3s close (${autoCloseMs}ms)`);
      await ctx.close();
    }

    console.log('\nALL HEADLESS CHROMIUM REAL-TIME VOICE & PTE PROBES PASSED!\n');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('\nPROBE FAILED:', err);
  process.exit(1);
});
