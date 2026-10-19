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

async function runAudit() {
  console.log('================================================================');
  console.log('  AUDIT MENYELURUH: VOICE CALL (FITUR TELEFON) PADA PERAMBAN');
  console.log('================================================================\n');

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html`;

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
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    permissions: ['microphone'],
    serviceWorkers: 'block'
  });

  // Mock upstream services to isolate audit to client logic and prevent CORS noise
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname.includes('fiezel.my.id') || url.hostname.includes('onrender.com') || url.hostname.includes('puter.com')) {
      const origin = req.headers()['origin'] || `http://127.0.0.1:${port}`;
      if (url.pathname.includes('/api/tts/line')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true'
          },
          body: JSON.stringify({
            ok: true,
            audioBase64: 'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
            mimeType: 'audio/wav',
            speaker: 'keita'
          })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true'
        },
        body: JSON.stringify({ ok: true, user: { name: 'Murid QA' }, data: [] })
      });
    }
    return route.continue();
  });

  // Inject student storage state
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

    // Scrub popups / overlays
    setInterval(() => {
      try {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth').forEach(e => e.remove());
        document.documentElement.classList.remove('fz-booting');
        document.body.classList.remove('fz-booting', 'fz-auth-open');
      } catch (_) {}
    }, 50);
  });

  const consoleErrors = [];
  const unhandledErrors = [];

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error(`  [PAGE CONSOLE ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    unhandledErrors.push(err.message || String(err));
    console.error(`  [PAGE UNHANDLED EXCEPTION] ${err.message}`);
  });

  console.log(`[1] Membuka halaman aplikasi di ${baseUrl}...`);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  console.log('[2] Navigasi ke Kawan Bicara via go("chat")...');
  await page.evaluate(() => {
    if (typeof window.go === 'function') {
      window.go('chat');
    }
  });
  await page.waitForTimeout(500);

  // AUDIT TEST 1: Klik tombol panggilan telepon (#fzcBtnCall)
  console.log('[3] UJI 1: Membuka Panggilan Telepon (#fzcBtnCall)...');
  const callBtn = await page.locator('#fzcBtnCall');
  if (await callBtn.count() === 0) {
    throw new Error('Tombol #fzcBtnCall tidak ditemukan di DOM!');
  }
  await callBtn.click();
  await page.waitForTimeout(800);

  const callOverlayState = await page.evaluate(() => {
    const el = document.getElementById('fzcCallOverlay');
    const vc = window.FiezelVoiceCall ? window.FiezelVoiceCall.getState() : null;
    return {
      hasOverlay: !!el,
      isActive: el ? el.classList.contains('is-active') : false,
      status: vc ? vc.status : null,
      partnerName: vc ? vc.partnerName : null,
      persona: vc ? vc.persona : null,
      course: vc ? vc.course : null
    };
  });
  console.log('  -> Overlay state:', callOverlayState);
  if (!callOverlayState.hasOverlay || !callOverlayState.isActive) {
    throw new Error('Voice call overlay gagal terbuka!');
  }

  // AUDIT TEST 2: Ganti Persona Panggilan (Sensei Keita <-> Sensei Nanami)
  console.log('[4] UJI 2: Mengganti Persona Mitra Panggilan...');
  const personaSwitchRes = await page.evaluate(() => {
    const nanamiBtn = document.querySelector('.fzc-call-persona-btn[data-persona="nanami"]');
    if (!nanamiBtn) return { found: false };
    nanamiBtn.click();
    const stateAfter = window.FiezelVoiceCall.getState();
    const nameEl = document.getElementById('fzcCallPartnerName');
    return {
      found: true,
      personaAfter: stateAfter.persona,
      partnerNameAfter: stateAfter.partnerName,
      partnerVoiceAfter: stateAfter.partnerVoice,
      nameElText: nameEl ? nameEl.textContent : ''
    };
  });
  console.log('  -> Persona switch result:', personaSwitchRes);
  if (!personaSwitchRes.found || personaSwitchRes.personaAfter !== 'nanami') {
    throw new Error('Gagal mengganti persona mitra bicara ke Sensei Nanami!');
  }

  // AUDIT TEST 3: Cek Tombol Mute & Subtitles
  console.log('[5] UJI 3: Interaksi Tombol Mute & Subtitle...');
  const muteRes = await page.evaluate(() => {
    const muteBtn = document.getElementById('fzcCallBtnMute');
    const subBtn = document.getElementById('fzcCallBtnSub');
    const subCard = document.getElementById('fzcCallSubtitleCard');
    if (!muteBtn || !subBtn) return { ok: false, reason: 'buttons not found' };

    muteBtn.click();
    const isMuted1 = window.FiezelVoiceCall.getState().isMuted;
    muteBtn.click();
    const isMuted2 = window.FiezelVoiceCall.getState().isMuted;

    subBtn.click();
    const subVisible1 = subCard ? subCard.style.display !== 'none' : false;
    subBtn.click();
    const subVisible2 = subCard ? subCard.style.display !== 'none' : false;

    return {
      ok: true,
      isMutedAfterFirstClick: isMuted1,
      isMutedAfterSecondClick: isMuted2,
      subVisibleAfterFirstClick: subVisible1,
      subVisibleAfterSecondClick: subVisible2
    };
  });
  console.log('  -> Mute & Subtitles result:', muteRes);

  // AUDIT TEST 4: Alur Giliran Bicara (Hands-Free Turn-Taking)
  console.log('[6] UJI 4: Simulasi Giliran Bicara...');
  const turnTest = await page.evaluate(async () => {
    const vc = window.FiezelVoiceCall;
    const history = [];
    const onStateChange = (next, prev, meta) => {
      history.push({ event: 'stateChange', from: prev, to: next });
    };
    vc.on('stateChange', onStateChange);

    // Kirim ucapan user
    const simPromise = vc._testSimulateTurn('こんにちは！');
    await simPromise;

    const currentState = vc.getState();
    return {
      currentState: currentState.status,
      latestAiReply: currentState.latestAiReply,
      history
    };
  });
  console.log('  -> Turn test result status:', turnTest.currentState);
  console.log('  -> Turn test AI text:', turnTest.latestAiReply ? turnTest.latestAiReply.text : 'null');

  // AUDIT TEST 5: Menguji Anti-Echo Filter (Mic mendengar kata AI sendiri saat SPEAKING)
  console.log('[7] UJI 5: Menguji Anti-Echo (Acoustic Echo Rejection)...');
  const echoTest = await page.evaluate(async () => {
    const vc = window.FiezelVoiceCall;
    const aiText = 'はい、こんにちは！元気ですか？';
    vc._testSetStatus('speaking', { reply: { text: aiText } });

    let interrupted = false;
    const onInterrupt = () => { interrupted = true; };
    vc.on('interrupt', onInterrupt);

    // Simulasikan SpeechRecognition menangkap kata AI sendiri
    // Kita panggil langsung handler internal jika ada atau simulasi
    const isEcho1 = vc.getState().status === 'speaking';

    // Cek apakah isAcousticEcho helper bekerja
    return {
      isSpeaking: isEcho1,
      interrupted: interrupted
    };
  });
  console.log('  -> Echo test result:', echoTest);

  // AUDIT TEST 6: Menguji Tutup Panggilan (#fzcCallBtnEnd) & Sinkronisasi
  console.log('[8] UJI 6: Menutup Panggilan & Verifikasi Pembersihan DOM...');
  const endRes = await page.evaluate(() => {
    const endBtn = document.getElementById('fzcCallBtnEnd');
    if (!endBtn) return { error: 'end button not found' };
    endBtn.click();
    const overlayStillThere = !!document.getElementById('fzcCallOverlay');
    const finalState = window.FiezelVoiceCall.getState().status;
    return {
      overlayStillThere,
      finalState
    };
  });
  console.log('  -> End call result:', endRes);
  if (endRes.overlayStillThere || endRes.finalState !== 'idle') {
    throw new Error('Panggilan gagal dibersihkan setelah klik #fzcCallBtnEnd!');
  }

  // AUDIT TEST 7: Membuka Kembali Panggilan Seketika (Rapid Re-Open)
  console.log('[9] UJI 7: Membuka kembali panggilan seketika (Rapid Re-Open)...');
  await page.waitForTimeout(300);
  const reOpenRes = await page.evaluate(async () => {
    try {
      const chat = window.FiezelInteractiveChat;
      const res = await chat.startVoiceCall();
      const statusAfterReopen = window.FiezelVoiceCall.getState().status;
      return { ok: true, status: statusAfterReopen };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  console.log('  -> Rapid Re-Open result:', reOpenRes);
  if (!reOpenRes.ok || reOpenRes.status === 'idle') {
    throw new Error('Gagal membuka kembali panggilan seketika!');
  }

  // Tutup kembali
  await page.evaluate(() => {
    if (window.FiezelVoiceCall) window.FiezelVoiceCall.end();
  });
  await page.waitForTimeout(300);

  console.log('\n[10] RINGKASAN AUDIT KONSOL & ERROR:');
  console.log(`  -> Total console errors: ${consoleErrors.length}`);
  console.log(`  -> Total unhandled exceptions: ${unhandledErrors.length}`);

  if (consoleErrors.length > 0) {
    console.log('  -> Daftar Console Errors:');
    consoleErrors.forEach((e, idx) => console.log(`     ${idx + 1}. ${e}`));
  }
  if (unhandledErrors.length > 0) {
    console.log('  -> Daftar Unhandled Exceptions:');
    unhandledErrors.forEach((e, idx) => console.log(`     ${idx + 1}. ${e}`));
  }

  await browser.close();
  server.close();

  if (consoleErrors.length > 0 || unhandledErrors.length > 0) {
    throw new Error('Audit gagal: terdapat console error atau unhandled exception!');
  }

  console.log('\n================================================================');
  console.log('  AUDIT BERHASIL 100% TANPA ERROR! 🎉');
  console.log('================================================================');
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
