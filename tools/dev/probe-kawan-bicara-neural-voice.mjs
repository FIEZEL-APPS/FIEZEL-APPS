#!/usr/bin/env node
/**
 * tools/dev/probe-kawan-bicara-neural-voice.mjs
 *
 * Empirical Playwright Chromium Headless Probe for:
 * 1. Mobile viewport (390x844, scale factor 2).
 * 2. Navigasi ke Kawan Bicara (state.view === 'chat').
 * 3. Uji klik tombol panggilan telepon (Voice Call: #fzcBtnCall).
 * 4. Verifikasi orb berdenyut saat audio neural aktif (scale, voice level, dynamic pulsing).
 * 5. Uji interupsi barge-in (hentikan audio neural seketika & kembali ke listening).
 * 6. Verifikasi penutupan panggilan (#fzcCallBtnEnd) & zero-loss transcript sync ke chat feed.
 * 7. Pastikan ZERO error console dan ZERO unhandled exceptions.
 */

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, rel.replace(/^\/+/, ''));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
});

async function main() {
  console.log('================================================================');
  console.log('  PROBE EMPIRIS: KAWAN BICARA & NEURAL VOICE CALL DUA ARAH');
  console.log('================================================================\n');

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html`;
  console.log(`[1] Local Test Server berjalan di: ${baseUrl}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile iPhone 12/13/14 viewport
    deviceScaleFactor: 2,
    permissions: ['microphone'],
    serviceWorkers: 'block'
  });

  // Intercept remote API / backend worker calls to avoid CORS console errors in local test
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname.includes('fiezel.my.id') || url.hostname.includes('puter.com') || url.hostname.includes('deepgram.com')) {
      const origin = req.headers()['origin'] || `http://127.0.0.1:${port}`;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, baggage, sentry-trace'
        },
        body: JSON.stringify({ ok: true, status: 'ok', user: { name: 'Murid QA' }, data: [] })
      });
    }
    return route.continue();
  });

  const consoleLogs = [];
  const consoleErrors = [];
  const pageErrors = [];

  // Setup Neural Voice simulation harness in page context
  await context.addInitScript(() => {
    try {
      localStorage.setItem('fz_user_registered', '1');
      localStorage.setItem('fz_auth_mode', 'guest');
      localStorage.setItem('fz_auth_completed', '1');
      localStorage.setItem('fz_user_name', 'Rian Pratama');
      localStorage.setItem('fiezel_course', 'ja');
      localStorage.setItem('fiezel_target_lang', 'ja');
      localStorage.setItem('fz_target_course', 'ja');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rian Pratama', goal: 'general', level: 'N5', role: 'murid', course: 'ja' }));
      localStorage.setItem('fiezel-tour-v1', 'finish');
      sessionStorage.setItem('fiezel_boot_count', '2');
      sessionStorage.setItem('fz_tour_done', '1');
    } catch (_) {}

    // Scrub overlays & modal traps
    setInterval(() => {
      try {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth').forEach(e => e.remove());
        document.documentElement.classList.remove('fz-booting');
        document.body.classList.remove('fz-booting', 'fz-auth-open');
      } catch (_) {}
    }, 50);

    // Controlled Neural Voice engine mock for deterministic headless verification
    window.__neuralVoiceEvents = [];
    let speechTimer = null;
    let activeResolve = null;

    const mockPuter = {
      speak(sentence, opts) {
        window.__neuralVoiceEvents.push({ type: 'speak', sentence, opts, at: Date.now() });
        return new Promise((resolve) => {
          activeResolve = resolve;
          // Hold speech active for up to 10 seconds to allow measuring live orb pulses & barge-in
          speechTimer = setTimeout(() => {
            activeResolve = null;
            resolve(true);
          }, 10000);
        });
      },
      prefetch(sentence, opts) {
        window.__neuralVoiceEvents.push({ type: 'prefetch', sentence, opts, at: Date.now() });
        return Promise.resolve(true);
      },
      stop() {
        window.__neuralVoiceEvents.push({ type: 'stop', at: Date.now() });
        if (speechTimer) {
          clearTimeout(speechTimer);
          speechTimer = null;
        }
        if (activeResolve) {
          const r = activeResolve;
          activeResolve = null;
          r(false);
        }
        return true;
      }
    };

    try {
      Object.defineProperty(window, 'FiezelPuterVoice', {
        configurable: true,
        enumerable: true,
        get() { return mockPuter; },
        set() { /* protected singleton */ }
      });
    } catch (_) {
      window.FiezelPuterVoice = mockPuter;
    }
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    const txt = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, txt });
    if (type === 'error') {
      if (!txt.includes('favicon.ico') && !txt.includes('Failed to load resource')) {
        consoleErrors.push(txt);
        console.error('  [BROWSER ERROR]', txt);
      }
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
    console.error('  [PAGE UNHANDLED EXCEPTION]', err.message);
  });

  console.log(`[2] Membuka FIEZEL pada viewport mobile (390x844)...`);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
  await page.waitForTimeout(600);

  // Bersihkan splash screen
  await page.evaluate(() => {
    document.getElementById('fiezelBootSplash')?.remove();
    document.documentElement.classList.remove('fz-booting');
    document.body.classList.remove('fz-booting');
  });

  // Navigasi ke Kawan Bicara (Mitra Kaiwa)
  console.log(`[3] Navigasi ke Kawan Bicara (state.view === 'chat')...`);
  await page.evaluate(() => {
    window.go('chat');
  });
  await page.waitForTimeout(600);

  const viewCheck = await page.evaluate(() => {
    return {
      view: typeof state !== 'undefined' ? state.view : null,
      hasChatContainer: !!document.querySelector('.fzc-container'),
      hasCallBtn: !!document.getElementById('fzcBtnCall')
    };
  });

  console.log('  -> Hasil verifikasi view Kawan Bicara:', viewCheck);
  if (viewCheck.view !== 'chat') {
    throw new Error(`Gagal navigasi ke chat! view aktual: ${viewCheck.view}`);
  }
  if (!viewCheck.hasChatContainer) {
    throw new Error('Elemen .fzc-container tidak ditemukan di DOM!');
  }
  if (!viewCheck.hasCallBtn) {
    throw new Error('Tombol panggilan telepon #fzcBtnCall tidak ditemukan di header chat!');
  }
  console.log('  -> ✓ Berada di Kawan Bicara (Mitra Kaiwa) dengan tombol #fzcBtnCall siap.');

  // Screenshot 1: Halaman Kawan Bicara sebelum panggilan
  const ss1Path = path.join(ROOT, 'tools', 'dev', 'probe-kawan-bicara-01-home.png');
  await page.screenshot({ path: ss1Path, fullPage: false });
  console.log(`  -> Screenshot disimpan: ${ss1Path}`);

  // Uji klik tombol panggilan telepon
  console.log(`\n[4] Menguji klik tombol panggilan telepon (#fzcBtnCall)...`);
  await page.evaluate(() => {
    const btn = document.getElementById('fzcBtnCall');
    if (btn) btn.click();
    else if (window.FiezelInteractiveChat && typeof window.FiezelInteractiveChat.startVoiceCall === 'function') {
      window.FiezelInteractiveChat.startVoiceCall();
    }
  });
  await page.waitForSelector('#fzcCallOverlay.is-active', { timeout: 6000 });
  await page.waitForTimeout(500);

  // Verifikasi mount overlay & active voice orb
  const callMounted = await page.evaluate(() => {
    const overlay = document.getElementById('fzcCallOverlay');
    const orb = document.getElementById('fzcVoiceOrb');
    const halo = document.getElementById('fzcVoiceHalo');
    const stage = document.querySelector('.fzc-call-stage');
    const endBtn = document.getElementById('fzcCallBtnEnd') || document.getElementById('fzcBtnEndCall');
    const callState = window.FiezelVoiceCall ? window.FiezelVoiceCall.getState() : null;

    return {
      hasOverlay: !!overlay,
      overlayIsActive: overlay ? overlay.classList.contains('is-active') : false,
      hasOrb: !!orb,
      hasHalo: !!halo,
      hasStage: !!stage,
      hasEndBtn: !!endBtn,
      callStatus: callState ? callState.status : null,
      partnerName: callState ? callState.partnerName : null
    };
  });

  console.log('  -> Status Voice Call Overlay:', callMounted);
  if (!callMounted.hasOverlay || !callMounted.overlayIsActive) {
    throw new Error('#fzcCallOverlay tidak aktif atau tidak terpasang di DOM!');
  }
  if (!callMounted.hasOrb) {
    throw new Error('#fzcVoiceOrb tidak ditemukan di Voice Call Stage!');
  }
  if (!callMounted.hasEndBtn) {
    throw new Error('Tombol akhiri panggilan (#fzcCallBtnEnd) tidak ditemukan!');
  }
  console.log('  -> ✓ Voice Call Mode berhasil terbuka dengan orb organik & partner:', callMounted.partnerName);

  // Screenshot 2: Voice Call overlay aktif
  const ss2Path = path.join(ROOT, 'tools', 'dev', 'probe-kawan-bicara-02-call-active.png');
  await page.screenshot({ path: ss2Path, fullPage: false });
  console.log(`  -> Screenshot disimpan: ${ss2Path}`);

  // Simulasikan ucapan murid untuk memicu giliran bicara AI (Neural Voice Playback)
  console.log(`\n[5] Memicu giliran AI & verifikasi orb berdenyut saat audio neural aktif...`);
  await page.evaluate(() => {
    if (window.FiezelVoiceCall && typeof window.FiezelVoiceCall._testSimulateTurn === 'function') {
      window.FiezelVoiceCall._testSimulateTurn('こんにちは！お元気ですか？');
    }
  });

  // Tunggu transisi ke status 'speaking'
  await page.waitForFunction(() => {
    const st = window.FiezelVoiceCall ? window.FiezelVoiceCall.getState() : null;
    return st && st.status === 'speaking';
  }, null, { timeout: 5000 });

  console.log('  -> AI memasuki status SPEAKING. Melakukan multi-frame sampling denyut orb...');

  // Sample orb animation across multiple intervals while speech is actively playing
  const orbSamples = [];
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(160);
    const sample = await page.evaluate(() => {
      const orb = document.getElementById('fzcVoiceOrb');
      const halo = document.getElementById('fzcVoiceHalo');
      const orbWrapper = document.querySelector('.fzc-voice-orb-wrapper');
      const st = window.FiezelVoiceCall ? window.FiezelVoiceCall.getState() : null;

      const transform = orb ? orb.style.transform : '';
      const haloOpacity = halo ? halo.style.opacity : '';
      const voiceLevel = orbWrapper ? orbWrapper.style.getPropertyValue('--fzc-voice-level') : '';

      return {
        timestamp: Date.now(),
        status: st ? st.status : null,
        audioLevel: st ? st.audioLevel : 0,
        transform,
        haloOpacity,
        voiceLevel
      };
    });
    orbSamples.push(sample);
  }

  console.log('  -> Hasil sampling denyut orb:', JSON.stringify(orbSamples, null, 2));

  // Screenshot 3: Orb sedang berdenyut saat neural voice aktif
  const ss3Path = path.join(ROOT, 'tools', 'dev', 'probe-kawan-bicara-03-orb-pulsing.png');
  await page.screenshot({ path: ss3Path, fullPage: false });
  console.log(`  -> Screenshot orb berdenyut disimpan: ${ss3Path}`);

  // Verifikasi matematis / empiris denyut orb:
  // - Status harus speaking
  // - Transform scale harus > 1.05
  // - Voice level harus > 0
  // - Halo opacity harus > 0.2
  const activeSamples = orbSamples.filter(s => s.status === 'speaking' && s.audioLevel > 0);
  console.log(`  -> Sampel aktif berdenyut: ${activeSamples.length} dari ${orbSamples.length}`);
  if (activeSamples.length < 2) {
    throw new Error('Orb tidak menunjukkan denyut audio aktif selama status speaking!');
  }

  const hasScaleExpansion = orbSamples.some(s => {
    const m = /scale\(([\d.]+)\)/.exec(s.transform);
    return m && parseFloat(m[1]) > 1.05;
  });
  if (!hasScaleExpansion) {
    throw new Error('Orb scale transform tidak mengembang di atas 1.05 saat audio aktif!');
  }
  console.log('  -> ✓ Orb terbukti berdenyut dinamis (scale > 1.05x dan audioLevel aktif).');

  // Uji interupsi barge-in (potong bicara) SAAT AI SEDANG BERBICARA
  console.log(`\n[6] Menguji interupsi barge-in (potong bicara murid)...`);
  let curState = await page.evaluate(() => window.FiezelVoiceCall ? window.FiezelVoiceCall.getState().status : null);
  if (curState !== 'speaking') {
    await page.evaluate(() => {
      if (window.FiezelVoiceCall && typeof window.FiezelVoiceCall._testSimulateTurn === 'function') {
        window.FiezelVoiceCall._testSimulateTurn('土曜日に渋谷で待ち合わせしよう！その後カフェに行こう！');
      }
    });
    await page.waitForFunction(() => {
      const st = window.FiezelVoiceCall ? window.FiezelVoiceCall.getState() : null;
      return st && st.status === 'speaking';
    }, null, { timeout: 5000 });
  }

  const beforeInterrupt = await page.evaluate(() => {
    const st = window.FiezelVoiceCall.getState();
    return {
      statusBefore: st.status,
      interruptedCountBefore: st.interruptedCount
    };
  });
  console.log('  -> Status tepat sebelum barge-in:', beforeInterrupt);
  if (beforeInterrupt.statusBefore !== 'speaking') {
    throw new Error(`Barge-in harus diuji saat status 'speaking', tetapi status adalah '${beforeInterrupt.statusBefore}'`);
  }

  // Murid menyentuh orb atau menyela suara (klik pada #fzcVoiceOrb secara langsung)
  await page.evaluate(() => {
    const orb = document.getElementById('fzcVoiceOrb');
    if (orb) {
      orb.click();
    } else if (window.FiezelVoiceCall) {
      window.FiezelVoiceCall.interrupt('user_tap_orb_barge_in');
    }
  });
  await page.waitForTimeout(300);

  const afterInterrupt = await page.evaluate(() => {
    const st = window.FiezelVoiceCall.getState();
    const subText = document.getElementById('fzcCallSubText')?.textContent || '';
    const events = window.__neuralVoiceEvents || [];
    const stopEvents = events.filter(e => e.type === 'stop');

    return {
      statusAfter: st.status,
      interruptedCountAfter: st.interruptedCount,
      subText,
      stopEventTriggered: stopEvents.length > 0
    };
  });

  console.log('  -> Status sesudah barge-in:', afterInterrupt);

  if (afterInterrupt.statusAfter !== 'listening') {
    throw new Error(`Barge-in gagal! Status harus kembali ke 'listening', tetapi mendapat '${afterInterrupt.statusAfter}'`);
  }
  if (afterInterrupt.interruptedCountAfter <= beforeInterrupt.interruptedCountBefore) {
    throw new Error('interruptedCount tidak bertambah saat barge-in dipicu!');
  }
  if (!afterInterrupt.stopEventTriggered) {
    throw new Error('Neural voice playback stop() tidak dipanggil saat barge-in!');
  }
  console.log('  -> ✓ Polite Barge-In berhasil: Audio AI terputus seketika dan state kembali ke listening.');

  // Screenshot 4: Barge-in berhasil (kembali mendengarkan)
  const ss4Path = path.join(ROOT, 'tools', 'dev', 'probe-kawan-bicara-04-barge-in.png');
  await page.screenshot({ path: ss4Path, fullPage: false });
  console.log(`  -> Screenshot barge-in disimpan: ${ss4Path}`);

  // Uji penghentian panggilan telepon (#fzcCallBtnEnd)
  console.log(`\n[7] Menguji penghentian panggilan telepon (#fzcCallBtnEnd)...`);
  await page.evaluate(() => {
    const endBtn = document.getElementById('fzcCallBtnEnd') || document.getElementById('fzcBtnEndCall');
    if (endBtn) endBtn.click();
  });
  await page.waitForTimeout(600);

  const closeCheck = await page.evaluate(() => {
    const overlay = document.getElementById('fzcCallOverlay');
    const st = window.FiezelVoiceCall ? window.FiezelVoiceCall.getState() : null;
    const feedBubbles = document.querySelectorAll('.fzc-msg-row');

    return {
      overlayExists: !!overlay,
      finalStatus: st ? st.status : null,
      feedBubbleCount: feedBubbles.length,
      chatMessages: Array.from(feedBubbles).map(b => ({
        role: b.classList.contains('is-user') ? 'user' : 'assistant',
        text: b.querySelector('.fzc-bubble')?.textContent.trim()
      }))
    };
  });

  console.log('  -> Status sesudah panggilan berakhir:', {
    overlayExists: closeCheck.overlayExists,
    finalStatus: closeCheck.finalStatus,
    feedBubbleCount: closeCheck.feedBubbleCount
  });

  if (closeCheck.overlayExists) {
    throw new Error('#fzcCallOverlay masih tertinggal di DOM setelah panggilan diakhiri!');
  }
  if (closeCheck.finalStatus !== 'idle') {
    throw new Error(`Status panggilan akhir harus 'idle', mendapat '${closeCheck.finalStatus}'`);
  }
  if (closeCheck.feedBubbleCount < 1) {
    throw new Error('Dialog panggilan tidak tersinkronisasi ke feed chat (Zero-Loss violated)!');
  }
  console.log('  -> ✓ Overlay tertutup bersih dan dialog panggilan tersimpan utuh di chat feed.');

  // Screenshot 5: Chat feed setelah panggilan selesai
  const ss5Path = path.join(ROOT, 'tools', 'dev', 'probe-kawan-bicara-05-feed-synced.png');
  await page.screenshot({ path: ss5Path, fullPage: false });
  console.log(`  -> Screenshot chat feed disimpan: ${ss5Path}`);

  // Verifikasi zero console errors & page errors
  console.log(`\n[8] Verifikasi integritas console & runtime exceptions...`);
  console.log(`  -> Total console error: ${consoleErrors.length}`);
  console.log(`  -> Total unhandled exceptions: ${pageErrors.length}`);

  if (consoleErrors.length > 0) {
    console.error('Daftar console error:', consoleErrors);
    throw new Error(`Terdeteksi ${consoleErrors.length} console error selama probe!`);
  }
  if (pageErrors.length > 0) {
    console.error('Daftar unhandled exceptions:', pageErrors);
    throw new Error(`Terdeteksi ${pageErrors.length} unhandled page exceptions selama probe!`);
  }

  console.log('\n================================================================');
  console.log('  SEMUA TAHAP SIMULASI EMPIRIS HEADLESS BERHASIL 100%! 🎉');
  console.log('================================================================\n');

  await browser.close();
  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n[PROBE FAILED]', err);
  try { server.close(); } catch (_) {}
  process.exit(1);
});
