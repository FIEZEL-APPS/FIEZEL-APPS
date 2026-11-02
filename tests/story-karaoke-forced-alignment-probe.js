#!/usr/bin/env node
/**
 * tests/story-karaoke-forced-alignment-probe.js
 *
 * PROBE HEADLESS EMPIRIS PLAYWRIGHT
 * Memverifikasi Integrasi Pre-Computed Character-Level Forced Alignment
 * pada Shinobi Story Reader Dokkai N5 (FIEZEL Story Karaoke Engine).
 *
 * Cakupan Uji:
 * 1. Tokenisasi Karakter Tepat: Tiap glif visual dibungkus .fz-karaoke-char dengan data-cidx presisi.
 * 2. Furigana & Ruby Invariant: <rt> dan token <ruby> Braincore BKT tetap utuh dan fungsional.
 * 3. 60 FPS Karaoke State Transitions: Karakter aktif (.fz-karaoke-active) dan lewat (.fz-karaoke-passed) sinkron waktu.
 * 4. Interactive Syllable Seeking: Mengetuk karakter melakukan seek audio langsung ke milidetik target.
 * 5. Zero-Crash & Zero-Console Error.
 */

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (_) {
  ({ chromium } = require('C:/Users/hp/fiezel-apps/node_modules/playwright'));
}
const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

function startServer() {
  const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(ROOT, decodeURIComponent(reqPath));

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const stat = fs.statSync(filePath);
    const totalSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const range = req.headers.range;

    if (range && (ext === '.mp3' || ext === '.ogg')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      fileStream.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Length': totalSize,
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

async function runProbe() {
  console.log('[PROBE] Memulai probe empiris Playwright Story Karaoke Forced-Alignment...');
  const { server, port } = await startServer();
  console.log(`[PROBE] Test server aktif di http://127.0.0.1:${port}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required']
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Pixel 7 Mobile Viewport
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Injeksi state awal sebelum memuat halaman
    await page.addInitScript(() => {
      try {
        localStorage.setItem('fz_target_course', 'ja');
        localStorage.setItem('fiezel-auth-v1', JSON.stringify({
          user: { id: 'probe-tester', name: 'Tester', email: 'test@fiezel.app' },
          token: 'probe-token'
        }));
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true }));
      } catch (_) {}
    });

    console.log('[PROBE] Mengakses aplikasi utama...');
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Singkirkan modal ritual/tour jika ada
    await page.evaluate(() => {
      const modals = document.querySelectorAll('#fzRitual, .modal-backdrop, #modal, .fiezel-ob, .fz-tour');
      modals.forEach(m => m.remove());
    });

    // 2. Navigasi ke Cerita Bergambar N5 (Shinobi Story Reader)
    console.log('[PROBE] Membuka modul Cerita Dokkai N5 (Mizuki)...');
    await page.evaluate(() => {
      if (typeof window.japaneseStoryView === 'function') {
        window.japaneseStoryView('mizuki-maiko');
      }
    });

    await page.waitForSelector('.fz-story-bento', { timeout: 8000 });
    console.log('✓ Antarmuka Bento Shinobi Story Reader berhasil ter-mount.');

    // 3. Verifikasi tokenisasi karakter
    const karaokeCharsCount = await page.evaluate(() => {
      const chars = document.querySelectorAll('.fz-sentence-jp .fz-karaoke-char');
      return chars.length;
    });

    console.log(`[PROBE] Jumlah elemen .fz-karaoke-char ter-render: ${karaokeCharsCount}`);
    assert.strictEqual(karaokeCharsCount, 26, 'Scene 0 Mizuki wajib memiliki tepat 26 karakter karaoke');

    // 4. Verifikasi keutuhan Furigana & Ruby
    const rubyTokensCount = await page.evaluate(() => {
      const rubies = document.querySelectorAll('.fz-sentence-jp ruby');
      const rts = document.querySelectorAll('.fz-sentence-jp rt');
      return { ruby: rubies.length, rt: rts.length };
    });
    console.log(`[PROBE] Jumlah elemen <ruby>: ${rubyTokensCount.ruby}, <rt>: ${rubyTokensCount.rt}`);
    assert.ok(rubyTokensCount.ruby >= 5, 'Tag <ruby> wajib tetap utuh di dalam teks karaoke');
    assert.ok(rubyTokensCount.rt >= 5, 'Tag <rt> furigana wajib tetap utuh');

    // 5. Uji Karaoke Sync State (Simulasi playback pada 300 ms)
    console.log('[PROBE] Menguji transisi status karaoke pada t = 300 ms...');
    await page.evaluate(() => {
      window.FiezelStoryReader.updateKaraokeState(300, 'mizuki-maiko', 0);
    });

    const stateAt300 = await page.evaluate(() => {
      const activeEl = document.querySelector('.fz-sentence-jp .fz-karaoke-char.fz-karaoke-active');
      const passedEls = document.querySelectorAll('.fz-sentence-jp .fz-karaoke-char.fz-karaoke-passed');
      return {
        activeChar: activeEl ? activeEl.textContent : null,
        activeCidx: activeEl ? activeEl.getAttribute('data-cidx') : null,
        passedCount: passedEls.length
      };
    });

    console.log(`[PROBE] Hasil pada 300ms: Karakter Aktif: "${stateAt300.activeChar}" (idx: ${stateAt300.activeCidx}), Jumlah Passed: ${stateAt300.passedCount}`);
    assert.strictEqual(stateAt300.activeChar, 'ズ', 'Pada 300ms karakter kedua (ズ) wajib aktif');
    assert.strictEqual(stateAt300.passedCount, 1, 'Pada 300ms tepat 1 karakter (ミ) telah dilewati');

    // 6. Uji Interactive Seeking via Klik Karakter
    console.log('[PROBE] Menguji seek audio interaktif dengan mengetuk karakter "舞" (idx 8)...');
    await page.evaluate(() => {
      window.FiezelStoryReader.playSceneAudio(0);
    });
    await page.waitForTimeout(400);

    // Klik karakter '舞' (idx 8)
    const stateImmediate = await page.evaluate(() => {
      const charEl = document.querySelector('.fz-sentence-jp .fz-karaoke-char[data-cidx="8"]');
      if (charEl) charEl.click();
      const activeEl = document.querySelector('.fz-sentence-jp .fz-karaoke-char.fz-karaoke-active');
      const passedEls = document.querySelectorAll('.fz-sentence-jp .fz-karaoke-char.fz-karaoke-passed');
      return {
        activeChar: activeEl ? activeEl.textContent : null,
        activeCidx: activeEl ? activeEl.getAttribute('data-cidx') : null,
        passedCount: passedEls.length
      };
    });

    console.log(`[PROBE] Hasil tepat saat klik: Karakter Aktif: "${stateImmediate.activeChar}" (idx: ${stateImmediate.activeCidx}), Passed: ${stateImmediate.passedCount}`);
    assert.strictEqual(stateImmediate.activeChar, '舞', 'Tepat saat klik, karakter "舞" (idx 8) wajib aktif seketika');
    assert.strictEqual(stateImmediate.passedCount, 8, 'Tepat saat klik, 8 karakter sebelumnya (0-7) wajib berstatus passed');

    // Biarkan audio berputar maju selama 450 ms untuk memvalidasi kemajuan 60 FPS live
    await page.waitForTimeout(450);

    const stateAfterProgress = await page.evaluate(() => {
      const activeEl = document.querySelector('.fz-sentence-jp .fz-karaoke-char.fz-karaoke-active');
      const audio = window.FiezelStoryReader.getCurrentAudio();
      return {
        activeChar: activeEl ? activeEl.textContent : null,
        activeCidx: activeEl ? activeEl.getAttribute('data-cidx') : null,
        currentTime: audio ? audio.currentTime : 0
      };
    });

    console.log(`[PROBE] Hasil kemajuan audio live: Karakter Aktif: "${stateAfterProgress.activeChar}" (idx: ${stateAfterProgress.activeCidx}), currentTime: ${stateAfterProgress.currentTime.toFixed(3)}s`);
    assert.ok(stateAfterProgress.currentTime >= 1.8, 'Audio currentTime wajib berada di rentang karakter target atau setelahnya');
    assert.ok(['舞', '妓', 'で'].includes(stateAfterProgress.activeChar), 'Karakter aktif wajib mengikuti alur pengucapan live audio');

    // 7. Ambil screenshot bukti pengujian
    const shotPath = path.join(REPORT_DIR, 'story-karaoke-forced-alignment.png');
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`✓ Screenshot bukti visual tersimpan: ${shotPath}`);

    // 8. Pastikan nol error console kritis
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('404') && !e.includes('CORS') && !e.includes('ERR_FAILED'));
    assert.strictEqual(criticalErrors.length, 0, `Nol error console kritis diizinkan, ditemukan: ${criticalErrors.join('; ')}`);

    console.log('\n======================================================');
    console.log('✓ SELURUH GERBANG PROBE STORY KARAOKE LULUS 100%!');
    console.log('======================================================');
  } finally {
    await browser.close();
    server.close();
  }
}

runProbe().catch(err => {
  console.error('✗ GAGAL DALAM PROBE:', err);
  process.exit(1);
});
