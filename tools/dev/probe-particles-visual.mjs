import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PORT = 8092;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ogg': 'audio/ogg'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    console.log('[Server 404/Fallback]', req.url, '-> index.html');
    filePath = path.join(ROOT, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, async () => {
  console.log(`[Probe Server] Serving on http://127.0.0.1:${PORT}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  page.on('console', msg => console.log('[Browser Console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[Browser Error]', err));

  // Bersihkan storage untuk simulasi cold launch pengguna baru
  await page.addInitScript(() => {
    try { window.localStorage.clear(); } catch (_) {}
    try { window.sessionStorage.clear(); } catch (_) {}
  });

  const milestones = [
    { name: '01-scatter-swirl-150ms', t: 150 },
    { name: '02-f-stem-converging-500ms', t: 500 },
    { name: '03-f-arms-crossfade-850ms', t: 850 },
    { name: '04-bars-solidifying-1100ms', t: 1100 },
    { name: '05-equalizer-active-1400ms', t: 1400 }
  ];

  const results = [];

  for (const m of milestones) {
    console.log(`[Probe] Testing milestone ${m.name} (?t=${m.t})...`);
    await page.goto(`http://127.0.0.1:${PORT}/?t=${m.t}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#fiezelBootSplash[data-fiezel-boot-claimed="shown"]', { timeout: 15000 });
    // Beri waktu 100ms agar rAF / canvas ter-render sempurna
    await page.waitForTimeout(100);

    const shotPath = path.join(ROOT, 'tools/dev', `splash-particle-${m.name}.png`);
    await page.screenshot({ path: shotPath });

    const state = await page.evaluate(() => {
      const cv = document.querySelector('.fz-splash-canvas');
      const fGroup = document.querySelector('.fz-fgroup');
      const barsGroup = document.querySelector('.fz-barsgroup');
      let canvasHasPixels = false;
      let pixelSample = 0;
      if (cv && cv.getContext) {
        try {
          const ctx = cv.getContext('2d');
          const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
          for (let i = 3; i < imgData.data.length; i += 16) {
            if (imgData.data[i] > 10) {
              pixelSample++;
              if (pixelSample > 50) { canvasHasPixels = true; break; }
            }
          }
        } catch (_) {}
      }
      return {
        canvasWidth: cv ? cv.width : 0,
        canvasHeight: cv ? cv.height : 0,
        canvasHasPixels,
        pixelSample,
        fGroupInlineStyle: fGroup ? fGroup.getAttribute('style') : null,
        fGroupComputedOpacity: fGroup ? window.getComputedStyle(fGroup).opacity : null,
        barsGroupComputedOpacity: barsGroup ? window.getComputedStyle(barsGroup).opacity : null,
        bootSplashClaimed: document.querySelector('#fiezelBootSplash')?.getAttribute('data-fiezel-boot-claimed'),
        splashState: window.__fiezelAuditSplashState || null
      };
    });

    results.push({ milestone: m.name, t: m.t, state });
    console.log(`[Probe] ${m.name}:`, JSON.stringify(state));
  }

  await browser.close();
  server.close();

  fs.writeFileSync(
    path.join(ROOT, 'tools/dev/probe-particles-result.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('[Probe] Completed! Result saved to tools/dev/probe-particles-result.json');
  process.exit(0);
});
