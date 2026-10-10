import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

// Simple static server for testing
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  const ext = path.extname(filePath);
  const mimeMap = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png'
  };
  res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

async function runEmpiricalProbe() {
  await new Promise(r => server.listen(8999, r));
  console.log('[PROBE] Server berjalan di http://localhost:8999');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  await page.goto('http://localhost:8999/index.html');
  await page.waitForTimeout(1000);

  const results = await page.evaluate(async () => {
    const fg = window.FiezelFaceGuard;
    if (!fg) return { error: 'FiezelFaceGuard tidak ditemukan' };

    const sampleInterval = fg.SAMPLE_INTERVAL_MS;
    const warnThreshold = fg.WARN_THRESHOLD_MS;

    function makeCanvas(pixelFn) {
      const w = 64, h = 48;
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      const imgData = ctx.createImageData(w, h);
      const d = imgData.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const [r, g, b] = pixelFn(x, y);
          d[idx] = r; d[idx + 1] = g; d[idx + 2] = b; d[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      ctx.drawImage = function () {};
      const vid = document.createElement('video');
      Object.defineProperty(vid, 'readyState', { value: 4 });
      return { vid, cv, ctx };
    }

    // 1. Dark room
    const dark = makeCanvas(() => [5, 5, 5]);
    const darkRes = fg.fallbackCheck(dark.vid, dark.cv, dark.ctx);

    // 2. Wall
    const wall = makeCanvas(() => [200, 202, 205]);
    const wallRes = fg.fallbackCheck(wall.vid, wall.cv, wall.ctx);

    // 3. Real face
    const face = makeCanvas((x, y) => {
      if (x >= 18 && x <= 46 && y >= 12 && y <= 36) return [180, 130, 100];
      return [80, 85, 90];
    });
    const faceRes = fg.fallbackCheck(face.vid, face.cv, face.ctx);

    // 4. Wood desk
    const wood = makeCanvas(() => [160, 110, 65]);
    const woodRes = fg.fallbackCheck(wood.vid, wood.cv, wood.ctx);

    // 5. Palm covering
    const palm = makeCanvas(() => [175, 125, 95]);
    const palmRes = fg.fallbackCheck(palm.vid, palm.cv, palm.ctx);

    // 6. User looked away
    const away = makeCanvas((x, y) => {
      if (x >= 55 && y >= 40) return [40, 35, 30];
      return [130, 130, 130];
    });
    const awayRes = fg.fallbackCheck(away.vid, away.cv, away.ctx);

    return {
      sampleInterval,
      warnThreshold,
      darkRes,
      wallRes,
      faceRes,
      woodRes,
      palmRes,
      awayRes
    };
  });

  console.log('[PROBE] Hasil evaluasi empiris di Chromium Playwright:', results);

  await browser.close();
  server.close();

  if (results.sampleInterval !== 250) throw new Error('SAMPLE_INTERVAL_MS bukan 250: ' + results.sampleInterval);
  if (results.warnThreshold !== 750) throw new Error('WARN_THRESHOLD_MS bukan 750: ' + results.warnThreshold);
  if (results.darkRes !== false) throw new Error('Dark room gagal ditolak: ' + results.darkRes);
  if (results.wallRes !== false) throw new Error('Wall gagal ditolak: ' + results.wallRes);
  if (results.woodRes !== false) throw new Error('Wood desk gagal ditolak: ' + results.woodRes);
  if (results.palmRes !== false) throw new Error('Palm gagal ditolak: ' + results.palmRes);
  if (results.awayRes !== false) throw new Error('Away gagal ditolak: ' + results.awayRes);
  if (results.faceRes !== true) throw new Error('Human face gagal diterima: ' + results.faceRes);

  console.log('[PROBE] >>> SEMUA PENGUJIAN EMPIRIS CV REALTIME LULUS 100%! <<<');
}

runEmpiricalProbe().catch(err => {
  console.error('[PROBE-ERROR]', err);
  process.exit(1);
});
