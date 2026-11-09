/**
 * tests/kawan-mic-update-probe.mjs
 *
 * Empirical Playwright Probe:
 * 1. Kawan Bicara (Zero Screen Touch inside call.html):
 *    - Modal opening pre-warms shared AudioContext & hardware microphone stream.
 *    - Green phone button click activates same-realm AudioContext ('running') & mic bridge.
 *    - Mochi speaks opening greeting automatically on entry.
 *    - User mic streams PCM 16kHz frames to Gemini Live in real-time.
 * 2. PWA Update Prompt & Cache Sanitation:
 *    - Visible update banner (#updateBanner) is displayed upon newer build discovery.
 *    - Stale shell caches (fiezel-shell-*) from prior builds are purged, leaving only active shell.
 *    - No silent auto-update without explicit learner consent.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
};

let simulatedRemoteBuild = null;

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname.toLowerCase().endsWith('/coordination/build-version.json') && simulatedRemoteBuild) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ version: simulatedRemoteBuild }));
    return;
  }
  let rel = decodeURIComponent(u.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.join(ROOT, rel);
  if (!filePath.startsWith(path.resolve(ROOT)) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;
console.log(`[Probe] Static server running at ${baseUrl}`);

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ],
});

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    permissions: ['microphone'],
  });

  await context.addInitScript(() => {
    localStorage.setItem(
      'fiezel-auth-v1',
      JSON.stringify({
        uuid: 'probe-user-786',
        email: 'probe@fiezel.my.id',
        name: 'Murid Probe',
        verified: true,
        at: Date.now(),
      })
    );
    localStorage.setItem(
      'fiezel-onboarding-v1',
      JSON.stringify({ completed: true, lang: 'en', goal: 'speaking', level: 'A1', at: Date.now() })
    );
    localStorage.setItem('fz_target_course', 'en');
    localStorage.setItem('fiezel-tour-v1', 'finish');
    localStorage.setItem(
      'fiezel-sl-v1-state',
      JSON.stringify({
        learnerName: 'Murid Probe',
        preferences: { feedbackSounds: true },
        gems: 50,
        history: [{ skill: 'vocab_hello', ok: true, at: Date.now() }],
      })
    );
    localStorage.setItem(
      'fiezel_braincore_voice_v2',
      JSON.stringify({
        version: 2,
        learnerLocale: 'id',
        targetLang: 'en',
        competencies: {
          comp_en_greeting_intro: {
            competencyId: 'comp_en_greeting_intro',
            pMastery: 0.85,
            pMasteryDecayed: 0.85,
            attempts: 5,
            correct: 5,
            lastPracticedAt: Date.now(),
          },
        },
        vocabPrereqMastered: {
          comp_en_greeting_intro: true,
          prereq_en_casual_free_talk: true,
        },
        misconceptionLedger: {},
        attemptQueue: [],
        turnsHistory: [],
      })
    );

    if (!navigator.mediaDevices) {
      navigator.mediaDevices = {};
    }
    const origGum = navigator.mediaDevices.getUserMedia
      ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      : null;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const synthCtx = new AC();
        if (synthCtx.state === 'suspended') {
          try { synthCtx.resume().catch(() => {}); } catch {}
        }
        const dest = synthCtx.createMediaStreamDestination();
        const osc1 = synthCtx.createOscillator();
        const osc2 = synthCtx.createOscillator();
        const gain = synthCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.value = 520;
        osc2.type = 'sine';
        osc2.frequency.value = 1180;
        gain.gain.value = 0.12;
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(dest);
        osc1.start();
        osc2.start();
        window.__probeSynthMicCtx = synthCtx;
        return dest.stream;
      } catch (e) {
        if (origGum) return origGum(constraints);
        throw e;
      }
    };

    const origFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.includes('/api/voice/live-session') || url.includes('/api/live-call')) {
        return new Response(
          JSON.stringify({
            ok: true,
            token: 'mock-live-token-786',
            endpoint: 'wss://mock-gemini-live.fiezel.local/ws',
            keyIndex: 0,
            totalKeys: 16,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/api/voice/copilot') || url.includes('/api/voice/translate')) {
        return new Response(
          JSON.stringify({
            ok: true,
            replies: [
              {
                text: 'I am doing great today!',
                phonetic: 'ai em duing greit tudei',
                translationId: 'Aku baik-baik saja hari ini!',
                isRealtimeAi: true,
              },
            ],
            aiMeaningId: 'Halo! Apa kabar hari ini?',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return origFetch(input, init);
    };

    const makePcm24kSineBase64 = (durationMs = 360) => {
      const sampleRate = 24000;
      const samples = Math.floor((sampleRate * durationMs) / 1000);
      const buf = new ArrayBuffer(samples * 2);
      const view = new DataView(buf);
      for (let i = 0; i < samples; i++) {
        const s = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.35;
        view.setInt16(i * 2, Math.max(-32768, Math.min(32767, Math.floor(s * 32767))), true);
      }
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    };

    const OrigWS = window.WebSocket;
    class MockGeminiLiveWS {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      constructor(url) {
        this.url = url;
        this.readyState = 0;
        this.binaryType = 'arraybuffer';
        window.__probeWsStats = window.__probeWsStats || {
          setupSent: 0,
          greetingPromptSent: 0,
          openingAudioDelivered: 0,
          pcmFramesSent: 0,
          audioStreamEndSent: 0,
          aiReplyDelivered: 0,
        };
        setTimeout(() => {
          this.readyState = 1;
          this.onopen?.({ type: 'open' });
        }, 25);
      }
      send(data) {
        try {
          const parsed = JSON.parse(data);
          const stats = window.__probeWsStats;
          if (parsed.setup) {
            stats.setupSent += 1;
            setTimeout(() => {
              this.onmessage?.({ data: JSON.stringify({ setupComplete: {} }) });
            }, 25);
          } else if (parsed.clientContent?.turns) {
            stats.greetingPromptSent += 1;
            setTimeout(() => {
              stats.openingAudioDelivered += 1;
              this.onmessage?.({
                data: JSON.stringify({
                  serverContent: {
                    modelTurn: {
                      parts: [
                        {
                          inlineData: {
                            mimeType: 'audio/pcm;rate=24000',
                            data: makePcm24kSineBase64(320),
                          },
                        },
                      ],
                    },
                    outputTranscription: { text: 'Hey there! How is your day going?' },
                  },
                }),
              });
              setTimeout(() => {
                this.onmessage?.({
                  data: JSON.stringify({
                    serverContent: { turnComplete: true },
                  }),
                });
              }, 120);
            }, 40);
          } else if (parsed.realtimeInput?.audio?.data) {
            stats.pcmFramesSent += 1;
            if (stats.pcmFramesSent === 8 && stats.aiReplyDelivered === 0) {
              stats.aiReplyDelivered += 1;
              setTimeout(() => {
                this.onmessage?.({
                  data: JSON.stringify({
                    serverContent: {
                      inputTranscription: { text: 'I am doing great today' },
                    },
                  }),
                });
                setTimeout(() => {
                  this.onmessage?.({
                    data: JSON.stringify({
                      serverContent: {
                        modelTurn: {
                          parts: [
                            {
                              inlineData: {
                                mimeType: 'audio/pcm;rate=24000',
                                data: makePcm24kSineBase64(320),
                              },
                            },
                          ],
                        },
                        outputTranscription: { text: 'Awesome! Tell me what you did today.' },
                        turnComplete: true,
                      },
                    }),
                  });
                }, 60);
              }, 50);
            }
          } else if (parsed.realtimeInput?.audioStreamEnd) {
            stats.audioStreamEndSent += 1;
          }
        } catch {}
      }
      close() {
        this.readyState = 3;
        this.onclose?.({ code: 1000, reason: 'normal' });
      }
    }
    window.WebSocket = function (url, protocols) {
      if (String(url).includes('mock-gemini-live') || String(url).includes('generativelanguage.googleapis.com')) {
        return new MockGeminiLiveWS(url);
      }
      return new OrigWS(url, protocols);
    };
    window.WebSocket.OPEN = 1;
    window.WebSocket.CONNECTING = 0;
    window.WebSocket.CLOSING = 2;
    window.WebSocket.CLOSED = 3;
  });

  const page = await context.newPage();
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  await page.waitForFunction(() => {
    const de = document.documentElement;
    const splash = document.getElementById('fiezelBootSplash');
    return de.classList.contains('fz-app-open') && !de.classList.contains('fz-booting') && (!splash || splash.classList.contains('is-leaving'));
  }, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    ['fiezelBootSplash', 'fzRitual'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  });

  console.log('\n[Probe 1] Testing 2-Stage Kawan Bicara Modal -> Call Studio (Zero Touch Inside call.html)...');

  await page.locator('[data-testid="kawan-bicara-home-card"]').first().tap({ force: true }).catch(async () => {
    await page.locator('[data-testid="kawan-bicara-home-card"]').first().click({ force: true });
  });
  await page.waitForSelector('#fzKawanModalPhone', { state: 'attached', timeout: 5000 });
  await page.waitForTimeout(350);

  const stage1State = await page.evaluate(() => {
    const ctx = window.__fzSharedLiveAudioCtx;
    const stream = window.__fzSharedMicStream;
    return {
      hasSharedCtx: Boolean(ctx),
      ctxState: ctx ? ctx.state : 'none',
      hasSharedMic: Boolean(stream && stream.getAudioTracks().some((t) => t.readyState === 'live')),
      hasSharedProcessor: Boolean(window.__fzSharedMicProcessor),
    };
  });
  console.log('  Stage 1 (Modal Opened) State:', stage1State);
  assert.strictEqual(stage1State.hasSharedCtx, true, 'Stage 1 wajib membuat __fzSharedLiveAudioCtx');
  assert.strictEqual(stage1State.hasSharedMic, true, 'Stage 1 wajib mengakuisisi __fzSharedMicStream');
  assert.strictEqual(stage1State.hasSharedProcessor, true, 'Stage 1 wajib menyambungkan __fzSharedMicProcessor same-realm');

  await page.evaluate(() => {
    let phase1 = 0;
    let phase2 = 0;
    window.__probeMicFeeder = setInterval(() => {
      const cb = window.__fzSharedMicPcmCallback;
      if (typeof cb === 'function') {
        const sr = (window.__fzSharedLiveAudioCtx && window.__fzSharedLiveAudioCtx.sampleRate) || 48000;
        const buf = new Float32Array(2048);
        for (let i = 0; i < 2048; i++) {
          phase1 += (2 * Math.PI * 520) / sr;
          phase2 += (2 * Math.PI * 1180) / sr;
          buf[i] = Math.sin(phase1) * 0.08 + Math.sin(phase2) * 0.04;
        }
        cb(buf, sr);
      }
    }, 45);
  });

  await page.locator('#fzKawanModalPhone').click({ force: true, noWaitAfter: true });

  const frameEl = await page.waitForSelector('#fzMitraKaiwaStudioFrame', { state: 'attached', timeout: 8000 });
  const callFrame = await frameEl.contentFrame();
  assert.ok(callFrame, 'Iframe call.html wajib termuat');

  for (let attempt = 0; attempt < 25; attempt++) {
    await page.waitForTimeout(250);
    const done = await callFrame.evaluate(() => Boolean(window.__probeWsStats?.aiReplyDelivered >= 1)).catch(() => false);
    if (done) break;
  }

  const callVerification = await callFrame.evaluate(() => {
    const parentWin = window.parent;
    const stats = window.__probeWsStats || {};
    return {
      frameStillMounted: Boolean(parentWin.document.getElementById('fzMitraKaiwaStudioFrame')),
      parentCtxState: parentWin.__fzSharedLiveAudioCtx?.state || 'none',
      parentMicLive: Boolean(
        parentWin.__fzSharedMicStream?.getAudioTracks?.().some((t) => t.readyState === 'live')
      ),
      hasPcmCallbackRegistered: typeof parentWin.__fzSharedMicPcmCallback === 'function',
      wsStats: stats,
      bodyText: document.body.innerText.slice(0, 600),
    };
  });

  console.log('  Stage 2 (Inside call.html with ZERO touch inside iframe):', {
    parentCtxState: callVerification.parentCtxState,
    parentMicLive: callVerification.parentMicLive,
    hasPcmCallbackRegistered: callVerification.hasPcmCallbackRegistered,
    wsStats: callVerification.wsStats,
  });

  assert.strictEqual(callVerification.frameStillMounted, true, 'Iframe call.html wajib tetap terpasang selama panggilan (tidak boleh di-remount)');
  assert.strictEqual(
    callVerification.parentCtxState,
    'running',
    'AudioContext wajib berstatus running seketika tanpa perlu menyentuh layar call.html'
  );
  assert.strictEqual(
    callVerification.parentMicLive,
    true,
    'Mikrofon user wajib tetap live saat masuk ke call.html'
  );
  assert.strictEqual(
    callVerification.hasPcmCallbackRegistered,
    true,
    'call.html wajib mendaftarkan __fzSharedMicPcmCallback ke jembatan same-realm induk'
  );
  assert.ok(
    callVerification.wsStats.openingAudioDelivered >= 1,
    'Suara pembuka Mochi wajib langsung diputar otomatis saat masuk Kawan Bicara'
  );
  assert.ok(
    callVerification.wsStats.pcmFramesSent >= 8,
    `Mikrofon user wajib mengalirkan frame PCM 16kHz ke Gemini Live (terkirim: ${callVerification.wsStats.pcmFramesSent})`
  );
  assert.ok(
    callVerification.wsStats.aiReplyDelivered >= 1,
    'Mochi wajib membalas ucapan mikrofon user secara full-duplex'
  );
  console.log('  ✓ [PASS] Mochi langsung bicara tanpa sentuh layar & mikrofon user langsung aktif mengalirkan PCM 16kHz!');
  await page.close();

  console.log('\n[Probe 2] Testing Shell Cache Pile-Up Purge & Visible #updateBanner Popup (production SW path)...');
  simulatedRemoteBuild = null;
  const context2 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  });
  await context2.addInitScript(() => {
    window.__FZ_FORCE_PROD_SW = true;
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ uuid: 'probe-786', verified: true }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ completed: true, lang: 'en', goal: 'speaking', level: 'A1' }));
    localStorage.setItem('fiezel-tour-v1', 'finish');
  });
  const p2 = await context2.newPage();
  await p2.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await p2.evaluate(async () => {
    await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 20000))]);
  });
  await p2.reload({ waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(1500);
  const p2Boot = await p2.evaluate(async () => ({
    controlled: Boolean(navigator.serviceWorker.controller),
    pageBuild: window.FIEZEL_PAGE_BUILD || '',
    shells: (await caches.keys()).filter((k) => k.startsWith('fiezel-shell-')),
  }));
  console.log('  Production SW boot:', p2Boot);
  assert.strictEqual(p2Boot.controlled, true, 'sw.js produksi wajib mengendalikan halaman');

  await p2.evaluate(async () => {
    for (const n of ['fiezel-shell-m025-780-old', 'fiezel-shell-m025-781-old', 'fiezel-shell-m025-782-old', 'fiezel-shell-m025-784-old']) {
      await caches.open(n);
    }
  });
  console.log('  Shell caches before sweep:', await p2.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('fiezel-shell-'))));

  simulatedRemoteBuild = 'm025-999';
  await p2.reload({ waitUntil: 'domcontentloaded' });

  let afterSweepAndPrompt = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    await p2.waitForTimeout(250);
    afterSweepAndPrompt = await p2.evaluate(async () => {
      try { await window.FiezelUpdatePrompt?.check?.(true); } catch (_) {}
      const afterKeys = (await caches.keys()).filter((k) => k.startsWith('fiezel-shell-'));
      const banner = document.getElementById('updateBanner');
      return {
        afterKeys,
        bannerVisible: Boolean(banner && banner.classList.contains('show') && !banner.classList.contains('hidden')),
        bannerTitle: document.getElementById('updateBannerTitle')?.textContent || '',
        stillControlledBySameBuild: window.FIEZEL_PAGE_BUILD || '',
      };
    });
    const stale = afterSweepAndPrompt.afterKeys.filter((k) => /m025-78[0-4]-old/.test(k));
    if (afterSweepAndPrompt.bannerVisible && stale.length === 0) break;
  }

  console.log('  Shell caches after boot sweep:', afterSweepAndPrompt.afterKeys);
  console.log('  Update Banner visible:', afterSweepAndPrompt.bannerVisible, '-', afterSweepAndPrompt.bannerTitle);
  console.log('  Page build still (no silent auto-update):', afterSweepAndPrompt.stillControlledBySameBuild);

  const staleLeft = afterSweepAndPrompt.afterKeys.filter((k) => /m025-78[0-4]-old/.test(k));
  assert.deepStrictEqual(staleLeft, [], `Cangkang lama wajib terhapus (tersisa: ${JSON.stringify(staleLeft)})`);
  assert.ok(
    afterSweepAndPrompt.afterKeys.length >= 1 && afterSweepAndPrompt.afterKeys.length <= 2,
    `Maksimal 1 cangkang aktif + 1 kandidat (tersisa: ${JSON.stringify(afterSweepAndPrompt.afterKeys)})`
  );
  assert.strictEqual(
    afterSweepAndPrompt.bannerVisible,
    true,
    'Pop-up pembaruan (#updateBanner) wajib tampil terlihat oleh user (tidak boleh auto-update diam-diam)'
  );
  assert.strictEqual(afterSweepAndPrompt.stillControlledBySameBuild, p2Boot.pageBuild, 'Tidak boleh auto-update diam-diam sebelum murid menekan tombol');
  console.log('  ✓ [PASS] Cangkang lama bersih & Pop-up Pembaruan (#updateBanner) tampil, tanpa auto-update diam-diam!');

  console.log('\n================================================================');
  console.log('ALL EMPIRICAL PLAYWRIGHT PROBES PASSED 100%!');
  console.log('================================================================');
} finally {
  await browser.close();
  server.close();
}
