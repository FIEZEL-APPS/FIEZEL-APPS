import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4398;
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
  console.log(`Subtabs probe server running at http://127.0.0.1:${PORT}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    localStorage.setItem('fz_user_name', 'Budi Santoso');
    localStorage.setItem('fz_onboarding_done', '1');
    localStorage.setItem('fz_auth_skip', '1');
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Budi Santoso', goal: 'general', level: 'A1', role: 'murid', course: 'en' }));
    localStorage.setItem('fiezel-tour-v1', 'finish');
    sessionStorage.setItem('fiezel_boot_count', '2');
    setInterval(() => {
      document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth').forEach(e => e.remove());
      document.documentElement.classList.remove('fz-booting');
      document.body.classList.remove('fz-auth-open');
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
    document.getElementById('authGate')?.remove();
    document.getElementById('fzRitual')?.remove();
  });

  // 1. Test Progress internal tabs
  console.log('Navigating to progress...');
  await page.click('[data-testid="nav-progress"]', { force: true });
  await page.waitForTimeout(1000);

  console.log('Testing Progress subtabs...');
  const progressDips = await page.evaluate(async () => {
    const tabs = Array.from(document.querySelectorAll('.progress-tabs .progress-tab'));
    if (tabs.length < 2) return { error: 'Tabs not found' };

    // Sample frames on click
    const results = [];
    for (let i = 1; i < Math.min(tabs.length, 3); i++) {
      const tab = tabs[i];
      const trace = [];
      const startTime = performance.now();
      let stop = false;
      const sample = () => {
        const t = Math.round(performance.now() - startTime);
        const fadeEl = document.querySelector('#app .fade');
        const tabEl = document.querySelector('.progress-tabs');
        trace.push({
          t,
          fadeOp: fadeEl ? window.getComputedStyle(fadeEl).opacity : null,
          fadeAnim: fadeEl ? window.getComputedStyle(fadeEl).animationName : null,
          tabsOp: tabEl ? window.getComputedStyle(tabEl).opacity : null,
          tabsAnim: tabEl ? window.getComputedStyle(tabEl).animationName : null
        });
        if (!stop && t < 600) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      tab.click();
      await new Promise(r => setTimeout(r, 650));
      stop = true;
      const minFade = Math.min(...trace.map(x => parseFloat(x.fadeOp) || 1));
      const minTabs = Math.min(...trace.map(x => parseFloat(x.tabsOp) || 1));
      results.push({ tabIndex: i, minFade, minTabs, trace: trace.slice(0, 15) });
    }
    return results;
  });
  console.log('Progress subtabs results:', JSON.stringify(progressDips, null, 2));

  console.log('\nNavigating to classroom...');
  await page.evaluate(() => window.go('classroom'));
  await page.waitForTimeout(1000);

  const appHtml = await page.evaluate(() => document.getElementById('app').innerHTML);
  console.log('App HTML in classroom (first 300 chars):', appHtml.slice(0, 300));

  const classroomDips = await page.evaluate(async () => {
    const tabs = Array.from(document.querySelectorAll('.ch-tabs .ch-tab'));
    if (tabs.length < 2) return { error: 'Classroom tabs not found', count: tabs.length, html: document.getElementById('app')?.innerHTML?.slice(0, 200) };
    const results = [];
    for (let i = 1; i < tabs.length; i++) {
      const tab = tabs[i];
      const trace = [];
      const startTime = performance.now();
      let stop = false;
      const sample = () => {
        const t = Math.round(performance.now() - startTime);
        const ch = document.querySelector('.ch-student');
        const tabsEl = document.querySelector('.ch-tabs');
        const panel = document.querySelector('.ch-tabpanel');
        trace.push({
          t,
          chOp: ch ? window.getComputedStyle(ch).opacity : null,
          chAnim: ch ? window.getComputedStyle(ch).animationName : null,
          tabsOp: tabsEl ? window.getComputedStyle(tabsEl).opacity : null,
          panelOp: panel ? window.getComputedStyle(panel).opacity : null
        });
        if (!stop && t < 600) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      tab.click();
      await new Promise(r => setTimeout(r, 650));
      stop = true;
      const minCh = Math.min(...trace.map(x => parseFloat(x.chOp) || 1));
      results.push({ tabIndex: i, minCh, trace: trace.slice(0, 15) });
    }
    return results;
  });
  console.log('Classroom subtabs results:', JSON.stringify(classroomDips, null, 2));

  await browser.close();
  server.close();
  process.exit(0);
});
