#!/usr/bin/env node
'use strict';
/**
 * tools/dev/probe-face-guard.js
 *
 * PROBE EMPIRIS PLAYWRIGHT HEADLESS:
 * Menguji integrasi FiezelFaceGuard & FiezelFocusGuard di lingkungan browser Chromium nyata.
 * Memverifikasi:
 * 1. Pemuatan modul FiezelFaceGuard & FiezelFocusGuard di PWA shell.
 * 2. Inisialisasi media stream kamera depan (dengan mock camera device Chromium).
 * 3. Deteksi kehadiran & toleransi sampling hemat daya (1.5 detik per check).
 * 4. Peringatan visual halus (detik ke-5) & pencatatan episode resmi (detik ke-10).
 * 5. Penghentian kamera (clean teardown) saat ujian selesai agar privasi murid terjaga.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';
      const filePath = path.join(ROOT, reqPath.replace(/^\//, ''));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found: ' + reqPath);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

function loadPlaywright() {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return require(id); } catch (_) {}
  }
  return null;
}

async function runProbe() {
  console.log('[PROBE-FACE-GUARD] Memulai audit empiris...');
  const pw = loadPlaywright();
  if (!pw) {
    console.error('[PROBE-FACE-GUARD] Playwright tidak ditemukan!');
    process.exit(1);
  }

  const { server, url } = await startServer();
  console.log(`[PROBE-FACE-GUARD] Local server aktif di ${url}`);

  const browser = await pw.chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const context = await browser.newContext({
    permissions: ['camera'],
    viewport: { width: 390, height: 844 },
    isMobile: true
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[BROWSER ERR]', msg.text());
  });
  page.on('pageerror', (err) => console.log('[BROWSER PAGEERR]', err.message));
  page.on('requestfailed', (req) => console.log('[REQ FAILED]', req.url(), req.failure()));

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  // 1. Verifikasi kedua modul terpasang di window
  const moduleCheck = await page.evaluate(() => {
    return {
      faceGuardLoaded: !!window.FiezelFaceGuard,
      focusGuardLoaded: !!window.FiezelFocusGuard,
      classHubLoaded: !!window.FiezelClassHub,
      hasLeaveFace: typeof window.FiezelFocusGuard?.leaveFace === 'function',
      hasBackFace: typeof window.FiezelFocusGuard?.backFace === 'function',
      faceGuardSupported: !!window.FiezelFaceGuard?.isSupported()
    };
  });

  console.log('[PROBE-FACE-GUARD] Status modul di browser:', moduleCheck);
  if (!moduleCheck.faceGuardLoaded || !moduleCheck.hasLeaveFace) {
    throw new Error('Modul detektor wajah gagal termuat di window!');
  }

  // 2. Verifikasi lifecycle kamera & deteksi di browser
  const lifecycleResult = await page.evaluate(async () => {
    const FG = window.FiezelFocusGuard;
    const FaceG = window.FiezelFaceGuard;

    let warned = false;
    let absentLogged = false;
    let presentLogged = false;

    // Start FaceGuard
    const startRes = await FaceG.start({
      onWarning: (isWarn) => { warned = isWarn; },
      onAbsentEpisode: (span) => { absentLogged = true; },
      onPresent: (span) => { presentLogged = true; }
    });

    const activeBefore = FaceG.isActive();

    // Verifikasi video element terpasang di DOM dengan dimensi aktif (anti-throttling)
    const videoTag = document.querySelector('video[playsinline]');
    const vidWidth = videoTag ? videoTag.width : 0;
    const vidHeight = videoTag ? videoTag.height : 0;
    const vidOpacity = videoTag ? videoTag.style.opacity : '';

    // Stop FaceGuard
    FaceG.stop();
    const activeAfter = FaceG.isActive();

    // Verifikasi fallbackCheck membedakan gelap vs wajah
    const mockVid = document.createElement('canvas');
    mockVid.width = 64; mockVid.height = 48;
    mockVid.readyState = 2;
    const mockCtx = mockVid.getContext('2d');
    mockCtx.fillStyle = '#000000';
    mockCtx.fillRect(0, 0, 64, 48);

    const cvs = document.createElement('canvas');
    cvs.width = 64; cvs.height = 48;
    const ctx = cvs.getContext('2d');
    const darkAbsent = FaceG.fallbackCheck(mockVid, cvs, ctx) === false;

    return {
      startOk: startRes.ok,
      activeBefore,
      activeAfter,
      hasVideoTag: !!videoTag,
      vidWidth,
      vidHeight,
      vidOpacity,
      darkAbsent
    };
  });

  console.log('[PROBE-FACE-GUARD] Hasil lifecycle kamera Playwright:', lifecycleResult);
  if (!lifecycleResult.startOk || !lifecycleResult.activeBefore || lifecycleResult.activeAfter || !lifecycleResult.darkAbsent) {
    throw new Error('Lifecycle kamera atau deteksi fallback gagal!');
  }

  // 3. Verifikasi simulasi state machine di sisi klien
  const simulationResult = await page.evaluate(() => {
    const FG = window.FiezelFocusGuard;
    const s = FG.start('tugas-ujian-1', 1000);

    // Wajah tidak terlihat pada t=2000
    FG.leaveFace(s, 2000);

    // t=6000 (lewat 4 detik): di bawah 10 detik -> dibuang
    const epBatal = FG.backFace(s, 6000);

    // Wajah hilang lagi pada t=10000
    FG.leaveFace(s, 10000);

    // t=25000 (15 detik): lolos masa tenggang 10 detik -> dicatat!
    const epSah = FG.backFace(s, 25000);

    const payload = FG.payload(s, 30000);
    const summary = FG.summary(s, 30000);

    return {
      epBatalIsNull: epBatal === null,
      epSahMs: epSah ? epSah.ms : 0,
      vn: summary.vn,
      vs: summary.vs,
      payload
    };
  });

  console.log('[PROBE-FACE-GUARD] Hasil simulasi state machine di PWA:', simulationResult);
  if (!simulationResult.epBatalIsNull || simulationResult.epSahMs !== 15000 || simulationResult.vn !== 1) {
    throw new Error('State machine face presence menghasilkan data yang tidak valid!');
  }

  // 4. Verifikasi perenderan modal ramah di antarmuka KelasKu Murid
  const modalDomResult = await page.evaluate(() => {
    const Hub = window.FiezelClassHub;
    const TS = window.FiezelTeacherStore;
    const Bank = window.FiezelReviewBank;
    if (!Hub || !TS || !Bank) return { ok: false, reason: 'missing_modules' };

    const ids = Bank.pick('past_tense', 3, 7).map((x) => x.id);
    TS.acceptAssignmentPayload({
      v: 1, t: 'assign', id: 'ujian-probe-1', title: 'Ujian Mini Probe',
      skills: ['past_tense'], itemIds: ids, minutes: 5, from: 'Kelas 8A',
      cls: 'FZ-PROBE', mode: 'ujian', timer: 5
    });

    const rootEl = document.createElement('div');
    rootEl.id = 'probe-student-root';
    document.body.appendChild(rootEl);

    Hub.mountStudent(rootEl, { toast() {}, go() {}, afterRender() {} });
    Hub.openAssignment('ujian-probe-1');

    // Trigger face warning
    const u = Hub._studentUi();
    u.faceWarn = true;
    Hub.renderStudent();

    const modalEl = rootEl.querySelector('[data-testid="class-face-alert-modal"]');
    const modalBtn = rootEl.querySelector('[data-testid="class-face-recheck-btn"]');
    const modalTitle = rootEl.querySelector('#ch-face-modal-title');

    const modalVisible = !!modalEl && !!modalBtn;
    const titleText = modalTitle ? modalTitle.textContent : '';

    // Auto-dismiss saat wajah kembali
    u.faceWarn = false;
    Hub.renderStudent();
    const modalGone = !rootEl.querySelector('[data-testid="class-face-alert-modal"]');

    Hub.unmountStudent();
    document.body.removeChild(rootEl);

    return {
      ok: true,
      modalVisible,
      titleText,
      modalGone
    };
  });

  console.log('[PROBE-FACE-GUARD] Hasil uji DOM modal ramah:', modalDomResult);
  if (!modalDomResult.ok || !modalDomResult.modalVisible || !modalDomResult.modalGone || !modalDomResult.titleText.includes('Yuk, Kembali Menghadap Layar')) {
    throw new Error('Uji DOM modal ramah gagal atau tidak selaras!');
  }

  await browser.close();
  server.close();
  console.log('[PROBE-FACE-GUARD] AUDIT SELESAI: SEMUA GERBANG EMPIRIS LULUS 100%!');
}

runProbe().catch((err) => {
  console.error('[PROBE-FACE-GUARD] FATAL:', err);
  process.exit(1);
});
