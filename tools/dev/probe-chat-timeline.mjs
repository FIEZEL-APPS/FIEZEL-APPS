import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4522;

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
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    await context.addInitScript(() => {
      localStorage.setItem('fz_user_name', 'Rian Pratama');
      localStorage.setItem('fiezel_course', 'ja');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      sessionStorage.setItem('fiezel_boot_count', '2');
      setInterval(() => {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth').forEach(e => e.remove());
        document.documentElement.classList.remove('fz-booting');
      }, 50);
    });

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
    await page.waitForTimeout(300);

    await page.evaluate(() => window.go('chat'));
    await page.waitForSelector('#fzcFeed');
    await page.waitForTimeout(300);

    // Add 10 messages so feed is definitely tall
    await page.evaluate(() => {
      const chat = window.FiezelInteractiveChat;
      const state = chat.getState();
      for (let i = 1; i <= 8; i++) {
        state.messages.push({ id: 'u' + i, role: 'user', text: 'Pesan user ' + i });
        state.messages.push({ id: 'a' + i, role: 'assistant', text: 'Pesan bot ' + i, translation: 'Terjemahan ' + i });
      }
      chat.deliverAssistantReply({ text: 'Pesan terakhir', translation: 'Arti' }, state.scenarioId, null, state.course);
    });
    await page.waitForTimeout(500);

    const initialStats = await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      return {
        scrollHeight: feed.scrollHeight,
        clientHeight: feed.clientHeight,
        scrollTop: feed.scrollTop
      };
    });
    console.log('Tall feed stats:', initialStats);

    // Now scroll student up to 100px from top
    await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      feed.scrollTop = 100;
      feed.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(100);

    console.log('\n--- State right after scrolling student up to 100px ---');
    const scrollUpState = await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      const btn = document.getElementById('fzcNewMsgBtn');
      return {
        scrollTop: feed.scrollTop,
        btnDisplay: btn ? btn.style.display : null,
        btnComputedDisplay: btn ? window.getComputedStyle(btn).display : null
      };
    });
    console.log('Scroll up state:', scrollUpState);

    // Now deliver a new assistant reply while student is reading at scrollTop=100
    console.log('\n--- Triggering deliverAssistantReply while student is at scrollTop=100 ---');
    await page.evaluate(() => {
      window.__timeline = [];
      const record = (label) => {
        const feed = document.getElementById('fzcFeed');
        const btn = document.getElementById('fzcNewMsgBtn');
        window.__timeline.push({
          label,
          t: performance.now(),
          scrollTop: feed ? feed.scrollTop : null,
          btnDisplay: btn ? btn.style.display : null,
          btnComputed: btn ? window.getComputedStyle(btn).display : null
        });
      };
      record('before-deliver');

      const st = window.FiezelInteractiveChat.getState();
      window.FiezelInteractiveChat.deliverAssistantReply({
        text: 'Halo kawan, ini pesan baru saat kamu membaca riwayat!',
        translation: 'Arti baru',
        source: 'probe'
      }, st.scenarioId, null, st.course);

      record('sync-after-deliver');

      let count = 0;
      const interval = setInterval(() => {
        count++;
        record('tick-' + (count * 20) + 'ms');
        if (count >= 20) clearInterval(interval);
      }, 20);
    });

    await page.waitForTimeout(600);

    const timeline = await page.evaluate(() => window.__timeline);
    console.log('Timeline of scroll & button:');
    timeline.forEach(item => {
      console.log(`[${item.label}] scrollTop=${item.scrollTop}, btnDisplay="${item.btnDisplay}", computed="${item.btnComputed}"`);
    });

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
