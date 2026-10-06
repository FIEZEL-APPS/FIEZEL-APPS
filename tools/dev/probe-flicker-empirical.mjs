import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4399;
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
  console.log(`Probe server running at http://127.0.0.1:${PORT}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    localStorage.setItem('fz_user_name', 'Budi Santoso');
    localStorage.setItem('fz_onboarding_done', '1');
    localStorage.setItem('fz_auth_skip', '1');
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
    sessionStorage.setItem('fiezel_boot_count', '2');
    setInterval(() => {
      document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual').forEach(e => e.remove());
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

  console.log('Testing Bottom Nav switching: home -> latihan -> classroom -> progress...');

  async function testTransition(navSelector, label) {
    console.log(`\n--- Transition: ${label} ---`);
    await page.evaluate(() => {
      window.__trace = [];
      const startTime = performance.now();
      const sampler = () => {
        const now = performance.now() - startTime;
        const app = document.getElementById('app');
        const fadeEl = app ? app.querySelector('.fade, .home-page, .ch, section') : null;
        let fadeOp = null, fadeAnim = null;
        if (fadeEl) {
          const cs = window.getComputedStyle(fadeEl);
          fadeOp = cs.opacity;
          fadeAnim = cs.animationName;
        }
        window.__trace.push({
          t: Math.round(now),
          appClass: app ? app.className : '',
          fadeTag: fadeEl ? fadeEl.tagName + '.' + fadeEl.className.split(' ').slice(0, 2).join('.') : 'none',
          fadeOp,
          fadeAnim
        });
        if (now < 1200) {
          requestAnimationFrame(sampler);
        }
      };
      requestAnimationFrame(sampler);
    });

    await page.click(navSelector, { force: true });
    await page.waitForTimeout(1300);

    const trace = await page.evaluate(() => window.__trace);
    // Find interesting moments (when opacity dips, or when appClass changes)
    let prevOp = null;
    let dips = [];
    for (let i = 0; i < trace.length; i++) {
      const item = trace[i];
      const op = parseFloat(item.fadeOp);
      if (prevOp !== null && op < prevOp && op < 0.95) {
        dips.push(item);
      }
      prevOp = op;
    }
    console.log(`Total samples: ${trace.length}. Opacity drops below 0.95: ${dips.length}`);
    trace.slice(0, 40).forEach(item => {
      console.log(`t=${item.t}ms | appCls="${item.appClass}" | fade="${item.fadeTag}" | op=${item.fadeOp} | anim=${item.fadeAnim}`);
    });
    if (dips.length > 0) {
      console.log('DIP DETECTED! Items with opacity drop:');
      dips.forEach(d => console.log(`  -> t=${d.t}ms | appCls="${d.appClass}" | op=${d.fadeOp} | anim=${d.fadeAnim}`));
    }
  }

  await testTransition('[data-testid="nav-latihan"]', 'home -> latihan');
  await testTransition('[data-testid="nav-classroom"]', 'latihan -> classroom');
  await testTransition('[data-testid="nav-progress"]', 'classroom -> progress');
  await testTransition('[data-testid="nav-home"]', 'progress -> home');

  // Now test KelasKu internal tabs
  console.log('\nTesting Classroom internal tab switching...');
  await page.click('[data-testid="nav-classroom"]', { force: true });
  await page.waitForTimeout(500);

  async function testClassroomTab(tabSelector, label) {
    console.log(`\n--- Classroom Tab: ${label} ---`);
    await page.evaluate(() => {
      window.__trace = [];
      const startTime = performance.now();
      const sampler = () => {
        const now = performance.now() - startTime;
        const panel = document.querySelector('.ch-tabpanel');
        const ch = document.querySelector('.ch');
        let panelOp = null, chOp = null, chAnim = null, panelAnim = null;
        if (panel) {
          const cs = window.getComputedStyle(panel);
          panelOp = cs.opacity;
          panelAnim = cs.animationName;
        }
        if (ch) {
          const cs = window.getComputedStyle(ch);
          chOp = cs.opacity;
          chAnim = cs.animationName;
        }
        window.__trace.push({
          t: Math.round(now),
          chClass: ch ? ch.className : '',
          chOp,
          chAnim,
          panelId: panel ? panel.id : '',
          panelOp,
          panelAnim
        });
        if (now < 800) {
          requestAnimationFrame(sampler);
        }
      };
      requestAnimationFrame(sampler);
    });

    if (await page.locator(tabSelector).count()) {
      await page.click(tabSelector, { force: true });
    }
    await page.waitForTimeout(900);

    const trace = await page.evaluate(() => window.__trace);
    trace.slice(0, 25).forEach(item => {
      console.log(`t=${item.t}ms | chCls="${item.chClass}" | chOp=${item.chOp} | chAnim=${item.chAnim} | panel=${item.panelId}`);
    });
  }

  await testClassroomTab('[data-testid="class-tab-progres"]', 'tugas -> papan kelas');
  await testClassroomTab('[data-testid="class-tab-kelas"]', 'papan kelas -> paspor');
  await testClassroomTab('[data-testid="class-tab-tugas"]', 'paspor -> tugas');

  await browser.close();
  server.close();
  process.exit(0);
});
