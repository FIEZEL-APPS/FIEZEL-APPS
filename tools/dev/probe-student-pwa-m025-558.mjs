import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Start a lightweight local static server
function startServer(port = 8124) {
  const rootDir = process.cwd();
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '/app/') reqPath = '/index.html';
    const filePath = path.join(rootDir, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimeMap = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.png': 'image/png'
      };
      res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'text/plain' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function run() {
  console.log('[PROBE MURID PWA m025-558] Menjalankan server lokal...');
  const server = await startServer(8124);

  console.log('[PROBE MURID PWA m025-558] Membuka Chromium headless ke http://localhost:8124/index.html...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  await page.goto('http://localhost:8124/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('[PROBE MURID PWA m025-558] Halaman termuat.');

  await page.waitForTimeout(2000);

  const evalData = await page.evaluate(async () => {
    const FG = window.FiezelFaceGuard;
    const FocusG = window.FiezelFocusGuard;

    let calibResult = null;
    let enrolledStatus = false;
    let enrolledProfile = null;

    if (FG) {
      FG.resetLiveness();
      FG.resetEnrolledProfile();

      // Buat mock canvas wajah
      const w = 64, h = 48;
      const cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      const ctx = cvs.getContext('2d');
      const imgData = ctx.createImageData(w, h);
      const d = imgData.data;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          if (x >= 18 && x <= 46 && y >= 12 && y <= 36) {
            if (y >= 20 && y <= 25 && x >= 22 && x <= 42) {
              d[idx] = 80; d[idx + 1] = 60; d[idx + 2] = 40; d[idx + 3] = 255;
            } else {
              d[idx] = 195; d[idx + 1] = 140; d[idx + 2] = 95; d[idx + 3] = 255;
            }
          } else {
            d[idx] = 70; d[idx + 1] = 75; d[idx + 2] = 80; d[idx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);

      cvs.readyState = 2;
      const t1 = FG.checkLiveness(cvs, cvs, ctx);
      const t2 = FG.checkLiveness(cvs, cvs, ctx);
      calibResult = { t1, t2 };
      enrolledStatus = FG.isEnrolled();
      enrolledProfile = FG.getEnrolledProfile();
    }

    return {
      pageBuild: window.FIEZEL_PAGE_BUILD || (window.self && window.self.FIEZEL_PAGE_BUILD),
      hasFaceGuard: typeof window.FiezelFaceGuard !== 'undefined',
      faceGuardWarnThreshold: FG ? FG.WARN_THRESHOLD_MS : null,
      faceGuardAbsentThreshold: FG ? FG.ABSENT_THRESHOLD_MS : null,
      focusGuardFaceGrace: FocusG ? FocusG.FACE_GRACE_MS : null,
      enrolledStatus,
      enrolledProfileValid: enrolledProfile ? enrolledProfile.valid : false,
      cbMean: enrolledProfile ? Math.round(enrolledProfile.cbMean) : null,
      crMean: enrolledProfile ? Math.round(enrolledProfile.crMean) : null
    };
  });

  console.log('[PROBE MURID PWA m025-558] Hasil Evaluasi:', JSON.stringify(evalData, null, 2));

  await page.screenshot({ path: 'tools/dev/pwa-student-m025-558.png' });
  console.log('[PROBE MURID PWA m025-558] Tangkapan layar tersimpan: tools/dev/pwa-student-m025-558.png');

  await browser.close();
  server.close();

  if (evalData.pageBuild === 'm025-558' && evalData.enrolledStatus && evalData.focusGuardFaceGrace === 3000) {
    console.log('✅ SUKSES MUTLAK: PWA Murid menjalankan build m025-558 dengan kalibrasi biometrik & FACE_GRACE_MS = 3000ms!');
  } else {
    console.error('❌ GAGAL VALIDASI EMPIRIS:', evalData);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('[PROBE MURID PWA m025-558] Error:', err);
  process.exit(1);
});
