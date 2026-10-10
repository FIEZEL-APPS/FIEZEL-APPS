import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

function startServer(port = 8125) {
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
  console.log('[PROBE MURID PWA m025-559] Menjalankan server lokal...');
  const server = await startServer(8125);

  console.log('[PROBE MURID PWA m025-559] Membuka Chromium headless ke http://localhost:8125/index.html...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  await page.goto('http://localhost:8125/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('[PROBE MURID PWA m025-559] Halaman termuat.');
  await page.waitForTimeout(2000);

  const evalData = await page.evaluate(async () => {
    const FG = window.FiezelFaceGuard;
    const Hub = window.FiezelClassHub;
    const FocusG = window.FiezelFocusGuard;

    let steadyVerified = false;
    let enrolledStatus = false;
    let enrolledProfile = null;

    if (FG) {
      FG.resetLiveness();
      FG.resetEnrolledProfile();

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
              d[idx] = 80; d[idx + 1] = 60; d[idx + 2] = 40; d[idx + 3] = 255; // mata
            } else {
              d[idx] = 195; d[idx + 1] = 140; d[idx + 2] = 95; d[idx + 3] = 255; // kulit
            }
          } else {
            d[idx] = 70; d[idx + 1] = 75; d[idx + 2] = 80; d[idx + 3] = 255; // latar
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);

      cvs.readyState = 2;

      // Simulasi 25 ticks steady hold
      let res = null;
      for (let i = 0; i < 25; i++) {
        res = FG.checkLiveness(cvs, cvs, ctx);
      }
      steadyVerified = (res && res.stage === 'verified') || FG.isLivenessVerified();
      enrolledStatus = FG.isEnrolled();
      enrolledProfile = FG.getEnrolledProfile();
    }

    return {
      pageBuild: window.FIEZEL_PAGE_BUILD,
      hasFaceGuard: !!FG,
      hasHub: !!Hub,
      hasFocusGuard: !!FocusG,
      steadyVerified: steadyVerified,
      enrolledStatus: enrolledStatus,
      enrolledProfileValid: !!(enrolledProfile && enrolledProfile.valid),
      cbMean: enrolledProfile ? Math.round(enrolledProfile.cbMean) : null,
      crMean: enrolledProfile ? Math.round(enrolledProfile.crMean) : null
    };
  });

  console.log('[PROBE MURID PWA m025-559] Hasil Evaluasi:', JSON.stringify(evalData, null, 2));

  await browser.close();
  server.close();

  if (evalData.pageBuild !== 'm025-559') {
    throw new Error(`Build tidak cocok! Diharapkan m025-559 tetapi mendapat ${evalData.pageBuild}`);
  }
  if (!evalData.steadyVerified) {
    throw new Error('Steady hold liveness verification gagal terverifikasi!');
  }
  if (!evalData.enrolledProfileValid) {
    throw new Error('Enrolled profile tidak valid setelah kalibrasi!');
  }

  console.log('[PROBE MURID PWA m025-559] SUKSES: Semua verifikasi empiris Playwright terpenuhi sempurna!');
}

run().catch((err) => {
  console.error('[PROBE MURID PWA m025-559] GAGAL:', err);
  process.exit(1);
});
