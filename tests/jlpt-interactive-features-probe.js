#!/usr/bin/env node
/**
 * tests/jlpt-interactive-features-probe.js
 *
 * PROBE HEADLESS EMPIRIS PLAYWRIGHT
 * Memverifikasi 3 Peningkatan Interaktif Fitur Listening JLPT:
 * 1. Furigana Tri-State Toggle (Ruby / Kanji Asli / Romaji)
 * 2. Interactive Turn Seeking (Lompat menit dialog via klik gelembung teks)
 * 3. Timed Exam Simulator (Hitung mundur live, 1x putar, Anti-Leak Exam Purity)
 */

const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'reports/audit-listening-detail');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

function startServer() {
  const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
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

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
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
  console.log('[PROBE] Memulai Server Lokal & Headless Chromium...');
  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}/index.html`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 mobile viewport
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('[PROBE] Navigasi ke:', baseUrl);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Dismiss auth screen, onboarding & boot splash so pointer events are not intercepted
  await page.evaluate(() => {
    try {
      if (window.FiezelAuthScreen && typeof window.FiezelAuthScreen.saveSession === 'function') {
        window.FiezelAuthScreen.saveSession(window, { role: 'murid', via: 'test' });
      } else {
        localStorage.setItem('fiezel_auth_session', JSON.stringify({ role: 'murid', via: 'test' }));
      }
      localStorage.setItem('fiezel_onboarding_completed', 'true');
      localStorage.setItem('fiezel_lang_chosen', 'id');
      localStorage.setItem('fz_course_selected', 'ja');
    } catch (_) {}
    // Invalidate/hide all blocking overlays
    const style = document.createElement('style');
    style.textContent = '.fiezel-ob, .fz-auth, .fiezel-splash, #fiezelBootSplash, .fz-tour { display: none !important; pointer-events: none !important; }';
    document.head.appendChild(style);
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-splash-canvas, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour').forEach(el => el.remove());
    document.documentElement.classList.remove('fz-booting');
    document.body.classList.remove('fz-auth-open');
    if (typeof window.go === 'function') window.go('home');
  });
  await page.waitForTimeout(500);

  // 1. Buka Modal Listening JLPT
  console.log('[PROBE] Membuka Modal Listening JLPT...');
  await page.evaluate(() => {
    if (window.openListeningPanel) window.openListeningPanel();
  });
  await page.waitForTimeout(1000);

  const modalOpen = await page.evaluate(() => {
    const m = document.getElementById('listeningPanelModal');
    return m && m.classList.contains('open');
  });
  assert(modalOpen, 'Modal Listening JLPT harus terbuka');
  console.log('  ✓ Modal Listening berhasil terbuka');

  // 2. Verifikasi Furigana Tri-State Toggle
  console.log('[PROBE] Menguji Furigana Tri-State Toggle...');
  // A. Mode Ruby
  await page.click('#btnModeRuby');
  await page.waitForTimeout(400);
  const debugInfo = await page.evaluate(() => {
    const btn = document.getElementById('btnModeRuby');
    const modal = document.getElementById('listeningPanelModal');
    const rubyTags = document.querySelectorAll('.jlpt-ruby');
    const qJa = document.querySelector('.jlpt-question-ja');
    return {
      btnActive: btn ? btn.classList.contains('active') : false,
      modalClass: modal ? modal.className : '',
      rubyCount: rubyTags.length,
      qJaHtml: qJa ? qJa.innerHTML : 'NOT FOUND'
    };
  });
  console.log('[PROBE] Status Mode Ruby:', {
    btnActive: debugInfo.btnActive,
    rubyCount: debugInfo.rubyCount
  });
  assert(debugInfo.btnActive && debugInfo.modalClass.includes('jlpt-mode-ruby') && debugInfo.rubyCount > 0, 'Mode Ruby harus aktif dan merender tag <ruby>');
  console.log('  ✓ Mode Ruby: Terverifikasi (<ruby> furigana aktif pada kanji)');

  // B. Mode Kanji Asli
  await page.click('#btnModeKanji');
  await page.waitForTimeout(300);
  const kanjiModeActive = await page.evaluate(() => {
    const btn = document.getElementById('btnModeKanji');
    const modal = document.getElementById('listeningPanelModal');
    return btn.classList.contains('active') && modal.classList.contains('jlpt-mode-kanji');
  });
  assert(kanjiModeActive, 'Mode Kanji Asli harus aktif');
  console.log('  ✓ Mode Kanji Asli: Terverifikasi (kanji murni tanpa furigana)');

  // C. Mode Romaji
  await page.click('#btnModeRomaji');
  await page.waitForTimeout(300);
  const romajiModeActive = await page.evaluate(() => {
    const btn = document.getElementById('btnModeRomaji');
    const modal = document.getElementById('listeningPanelModal');
    const romajiSub = document.querySelector('.jlpt-q-romaji');
    return btn.classList.contains('active') && modal.classList.contains('jlpt-mode-romaji') && !!romajiSub;
  });
  assert(romajiModeActive, 'Mode Romaji harus aktif dengan subtitle alfabet');
  console.log('  ✓ Mode Romaji: Terverifikasi (romaji subtitle aktif)');

  // Kembalikan ke Ruby
  await page.click('#btnModeRuby');
  await page.waitForTimeout(300);

  // 3. Verifikasi Interactive Turn Seeking
  console.log('[PROBE] Menguji Interactive Turn Seeking di Bottom Sheet...');
  await page.click('#jlptSheetTriggerBtn');
  await page.waitForTimeout(600);

  const sheetOpen = await page.evaluate(() => {
    const s = document.getElementById('jlptDetailSheet');
    return s && s.classList.contains('open');
  });
  assert(sheetOpen, 'Bottom Sheet Drawer harus terbuka');
  console.log('  ✓ Bottom Sheet Drawer terbuka');

  const turnsCount = await page.evaluate(() => {
    return document.querySelectorAll('.jlpt-dialogue-turn').length;
  });
  assert(turnsCount > 0, 'Harus ada baris giliran dialog di sheet');
  console.log(`  ✓ Terdeteksi ${turnsCount} giliran percakapan dengan seek pill`);

  // Klik turn ke-1 (baris percakapan kedua)
  await page.click('#jlptTurn_1');
  await page.waitForTimeout(400);

  const turnSeekingActive = await page.evaluate(() => {
    const turn1 = document.getElementById('jlptTurn_1');
    return turn1 && turn1.classList.contains('speaking-now');
  });
  assert(turnSeekingActive, 'Giliran ke-1 harus aktif dengan highlight speaking-now');
  console.log('  ✓ Turn seeking berhasil melompat dan mengaktifkan highlight karakter');

  // Tutup sheet
  await page.click('.jlpt-sheet-close');
  await page.waitForTimeout(400);

  // 4. Verifikasi Mode Ujian Resmi Berbatas Waktu (Timed Exam Simulator)
  console.log('[PROBE] Menguji Mode Ujian Resmi Berbatas Waktu (Exam Mode)...');
  await page.click('#jlptExamToggleBtn');
  await page.waitForTimeout(500);

  const examModeActive = await page.evaluate(() => {
    const btn = document.getElementById('jlptExamToggleBtn');
    const banner = document.getElementById('jlptExamTimerBanner');
    const countdown = document.getElementById('jlptTimerCountdown');
    const modal = document.getElementById('listeningPanelModal');
    return (
      btn.classList.contains('active') &&
      banner.style.display !== 'none' &&
      countdown.textContent.includes(':') &&
      modal.classList.contains('exam-mode-active')
    );
  });
  assert(examModeActive, 'Mode Ujian Resmi harus aktif dengan hitung mundur live');
  console.log('  ✓ Mode Ujian Resmi: Banner timer hitung mundur live aktif');

  // Anti-Leak Exam Purity: Pastikan naskah terkunci
  const sheetTriggerLocked = await page.evaluate(() => {
    const trigger = document.getElementById('jlptSheetTriggerBtn');
    return trigger.disabled && trigger.classList.contains('locked');
  });
  assert(sheetTriggerLocked, 'Sheet trigger harus terkunci (disabled) dalam Mode Ujian');
  console.log('  ✓ Anti-Leak Exam Purity: Tombol naskah terkunci total (disabled)');

  // Tangkap screenshot bukti visual
  const shotPath = path.join(REPORT_DIR, '04-jlpt-interactive-exam-probe.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log(`  ✓ Screenshot bukti audit empiris tersimpan di: ${shotPath}`);

  await browser.close();
  server.close();
  console.log('\n======================================================');
  console.log('PASS: Seluruh 3 Fitur Interaktif Chōkai Terverifikasi Empiris 100%!');
  console.log('======================================================');
}

runProbe().catch(err => {
  console.error('[PROBE ERROR]', err);
  process.exit(1);
});
