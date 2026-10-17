import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4514;
const ROOT = process.cwd();

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Shadowing probe server running at http://127.0.0.1:${PORT}`);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      localStorage.setItem('fz_user_name', 'Rian Pratama');
      localStorage.setItem('fiezel_course', 'ja');
      localStorage.setItem('fiezel_target_lang', 'ja');
      localStorage.setItem('fz_target_course', 'ja');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rian Pratama', goal: 'general', level: 'N5', role: 'murid', course: 'ja' }));
      sessionStorage.setItem('fiezel_boot_count', '2');
      setInterval(() => {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth').forEach(e => e.remove());
        document.documentElement.classList.remove('fz-booting');
      }, 50);
    });

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      document.getElementById('fiezelBootSplash')?.remove();
      document.documentElement.classList.remove('fz-booting');
      document.querySelector('.fiezel-ob')?.remove();
    });

    console.log('1. Navigating to Chat view...');
    await page.evaluate(() => window.go('chat'));
    await page.waitForTimeout(500);

    console.log('2. Injecting shadowing evaluation result with word-by-word comparison...');
    const resultDetails = await page.evaluate(() => {
      const chat = window.FiezelInteractiveChat;
      const st = chat.getState();
      const firstMsg = st.messages[0];
      const evalRes = chat.evaluatePronunciation(firstMsg.text, 'こんにちは！今日は話したいです', 'ja');
      firstMsg.shadowResult = evalRes;
      
      // Force UI re-render
      const app = document.getElementById('app');
      app.innerHTML = chat.createInitialState ? '' : ''; // trigger
      window.FiezelInteractiveChat.mount(app);

      const correctCount = document.querySelectorAll('.fzc-token.is-correct').length;
      const missedCount = document.querySelectorAll('.fzc-token.is-missed').length;
      const hasGuides = document.querySelectorAll('.fzc-token-guide').length > 0;
      const heardText = document.querySelector('.fzc-shadow-heard-val')?.textContent;

      return {
        score: evalRes.score,
        correctCount,
        missedCount,
        hasGuides,
        heardText
      };
    });

    console.log('Evaluation details in DOM:', resultDetails);
    if (resultDetails.correctCount === 0) throw new Error('No correct tokens found in DOM!');
    if (resultDetails.missedCount === 0) throw new Error('No missed tokens found in DOM!');

    await page.waitForTimeout(400);
    const screenshotPath = path.join(ROOT, 'tools', 'dev', 'shadowing-card-preview.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Screenshot captured to tools/dev/shadowing-card-preview.png');
    console.log('>>> SHADOWING EVALUATION CARD PROBE: PASS <<<');
    process.exitCode = 0;
  } catch (err) {
    console.error('Shadowing probe failed:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
