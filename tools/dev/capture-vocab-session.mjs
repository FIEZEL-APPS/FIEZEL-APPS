import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4398;
const ROOT = process.cwd();
const ARTIFACT_DIR = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\e46a45bf-17a3-49ec-b208-7a2435556c0f';
const REPORT_DIR = path.join(ROOT, 'reports', 'vocab-session-screens');

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(ROOT, decodeURIComponent(reqPath).replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.woff2': 'font/woff2',
      '.mp3': 'audio/mpeg'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`[CAPTURE] Server aktif di http://127.0.0.1:${PORT}`);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    const page = await context.newPage();

    // Setup state mirip user Haiza
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('fz_user_name', 'Haiza');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Haiza', locale: 'id', course: 'en' }));
      localStorage.setItem('fiezel-v4-state', JSON.stringify({
        userName: 'Haiza',
        preferences: { learnerLocale: 'id', learnerLocaleExplicit: true, activeLevel: 'A1' },
        gems: { balance: 12, history: [] },
        streak: 2,
        xp: 320,
        toursSeen: { menu: true, library: true, listening: true }
      }));
      sessionStorage.setItem('fiezel_boot_count', '3');
      setInterval(() => {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, #fiezelBootSplash').forEach(e => e.remove());
      }, 50);
    });

    console.log('[CAPTURE] Membuka PWA...');
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.go === 'function' && typeof window.vocab === 'function' && typeof window.startVocabQuiz === 'function', null, { timeout: 20000 });
    await page.waitForTimeout(1500);

    // 1. Tangkap Layar Hub Kosakata (go('vocab'))
    console.log('[CAPTURE] Menavigasi ke Kosakata Hub...');
    await page.evaluate(() => {
      window.go('vocab');
    });
    await page.waitForTimeout(1000);
    const pHub = path.join(REPORT_DIR, '01-vocab-hub.png');
    const pHubArt = path.join(ARTIFACT_DIR, '01-vocab-hub.png');
    await page.screenshot({ path: pHub, fullPage: false });
    fs.copyFileSync(pHub, pHubArt);
    console.log('[CAPTURE] Tersimpan:', pHub);

    // 2. Tangkap Sesi Kuis Kosakata (startVocabQuiz()) - Soal Aktif
    console.log('[CAPTURE] Memulai sesi kuis kosakata...');
    await page.evaluate(() => {
      window.startVocabQuiz();
    });
    await page.waitForTimeout(1000);
    const pQuiz = path.join(REPORT_DIR, '02-vocab-quiz-session.png');
    const pQuizArt = path.join(ARTIFACT_DIR, '02-vocab-quiz-session.png');
    await page.screenshot({ path: pQuiz, fullPage: false });
    fs.copyFileSync(pQuiz, pQuizArt);
    console.log('[CAPTURE] Tersimpan:', pQuiz);

    // 3. Jawab salah satu pilihan untuk melihat umpan balik (feedback dialog)
    console.log('[CAPTURE] Memilih jawaban kuis untuk menangkap umpan balik...');
    const optionBtns = await page.$$('.quiz-option, .opt-btn, button.option, .quiz-choice');
    if (optionBtns.length > 0) {
      await optionBtns[0].click();
      await page.waitForTimeout(800);
      const pFeedback = path.join(REPORT_DIR, '03-vocab-quiz-feedback.png');
      const pFeedbackArt = path.join(ARTIFACT_DIR, '03-vocab-quiz-feedback.png');
      await page.screenshot({ path: pFeedback, fullPage: false });
      fs.copyFileSync(pFeedback, pFeedbackArt);
      console.log('[CAPTURE] Tersimpan:', pFeedback);
    }

    // 4. Tangkap Sesi Belajar Flashcards Depan (flashcards('A1'))
    console.log('[CAPTURE] Menavigasi ke sesi flashcards...');
    await page.evaluate(() => {
      try { window.closeConfidencePop(); } catch (_) {}
      document.querySelectorAll('.confidence-pop, #confidencePop, #quizFloatingBar').forEach(e => e.remove());
      window.flashcards('A1');
    });
    await page.waitForTimeout(800);
    const pFlashFront = path.join(REPORT_DIR, '04-vocab-flashcard-front.png');
    const pFlashFrontArt = path.join(ARTIFACT_DIR, '04-vocab-flashcard-front.png');
    await page.screenshot({ path: pFlashFront, fullPage: false });
    fs.copyFileSync(pFlashFront, pFlashFrontArt);
    console.log('[CAPTURE] Tersimpan:', pFlashFront);

    // 5. Balik kartu Flashcard untuk menangkap sisi belakang (arti & contoh kalimat)
    console.log('[CAPTURE] Membalik flashcard dengan touch tap...');
    const flashcard = await page.$('#flashcard');
    if (flashcard) {
      // Simulate real mobile touch tap
      await page.tap('#flashcard');
      await page.waitForTimeout(600);
      const isFlipped = await page.evaluate(() => document.querySelector('#flashcard')?.classList.contains('flipped'));
      console.log('[CAPTURE] Status flipped setelah tap:', isFlipped);
      const pFlashBack = path.join(REPORT_DIR, '05-vocab-flashcard-back.png');
      const pFlashBackArt = path.join(ARTIFACT_DIR, '05-vocab-flashcard-back.png');
      await page.screenshot({ path: pFlashBack, fullPage: false });
      fs.copyFileSync(pFlashBack, pFlashBackArt);
      console.log('[CAPTURE] Tersimpan:', pFlashBack);
    }

    console.log('[CAPTURE] Selesai mengambil seluruh screenshot sesi latihan vocabulary!');
    await browser.close();
  } catch (err) {
    console.error('[CAPTURE ERROR]', err);
    if (browser) await browser.close();
  } finally {
    server.close();
    process.exit(0);
  }
});
