import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const mimeMap = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(rootDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'text/plain' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const localUrl = `http://127.0.0.1:${port}/index.html`;

console.log(`[PROBE-ANTI-SPOOF] Server listening at ${localUrl}`);

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream'
  ]
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

try {
  await page.goto(localUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const evaluation = await page.evaluate(async () => {
    const results = [];
    const FaceG = window.FiezelFaceGuard;
    if (!FaceG) throw new Error('FiezelFaceGuard not loaded');

    const w = 64, h = 48;
    function makeFrame(fn) {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const [r, g, b] = fn(x, y);
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
        }
      }
      const cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      const ctx = cvs.getContext('2d');
      const img = ctx.createImageData(w, h);
      img.data.set(data);
      ctx.putImageData(img, 0, 0);

      const srcCvs = document.createElement('canvas');
      srcCvs.width = w; srcCvs.height = h;
      const sCtx = srcCvs.getContext('2d');
      const sImg = sCtx.createImageData(w, h);
      sImg.data.set(data);
      sCtx.putImageData(sImg, 0, 0);
      srcCvs.readyState = 2;
      return { video: srcCvs, cvs, ctx };
    }

    // Test 1: Sumber cahaya / lampu senter / lampu sorot
    const lamp = makeFrame((x, y) => {
      if (x >= 20 && x <= 44 && y >= 12 && y <= 36) return [245, 240, 220];
      return [40, 40, 45];
    });
    const lampResult = FaceG.fallbackCheck(lamp.video, lamp.cvs, lamp.ctx);
    results.push({ name: 'reject_bright_lamp', ok: lampResult === false, detail: `lampResult=${lampResult}` });

    // Test 2: Lampu neon putih / LED dingin
    const neon = makeFrame((x, y) => {
      if (x >= 20 && x <= 44 && y >= 12 && y <= 36) return [210, 215, 225];
      return [30, 30, 35];
    });
    const neonResult = FaceG.fallbackCheck(neon.video, neon.cvs, neon.ctx);
    results.push({ name: 'reject_neon_light', ok: neonResult === false, detail: `neonResult=${neonResult}` });

    // Test 3: Wajah manusia asli di ruangan redup malam hari (low-light)
    const dimFace = makeFrame((x, y) => {
      if (x >= 18 && x <= 46 && y >= 12 && y <= 36) {
        if (y >= 20 && y <= 25 && x >= 22 && x <= 42) return [28, 24, 18];
        return [42, 36, 26];
      }
      return [15, 15, 18];
    });
    const dimFaceResult = FaceG.fallbackCheck(dimFace.video, dimFace.cvs, dimFace.ctx);
    results.push({ name: 'accept_dim_human_face', ok: dimFaceResult === true, detail: `dimFaceResult=${dimFaceResult}` });

    // Test 4: Foto di layar HP / Laptop dengan pantulan kaca (glass specular glare)
    const screenGlare = makeFrame((x, y) => {
      if (x >= 18 && x <= 46 && y >= 12 && y <= 36) {
        if (x >= 28 && x <= 32 && y >= 16 && y <= 18) return [245, 245, 245];
        if (y >= 20 && y <= 26 && x >= 22 && x <= 42) return [40, 30, 25];
        return [180, 130, 100];
      }
      return [80, 85, 90];
    });
    const screenGlareResult = FaceG.fallbackCheck(screenGlare.video, screenGlare.cvs, screenGlare.ctx);
    results.push({ name: 'reject_screen_glass_glare', ok: screenGlareResult === false, detail: `screenGlareResult=${screenGlareResult}` });

    // Test 5: Layar LCD dengan backlight bleed di rongga mata
    const screenBacklight = makeFrame((x, y) => {
      if (x >= 18 && x <= 46 && y >= 12 && y <= 36) {
        if (y >= 20 && y <= 26 && x >= 22 && x <= 42) return [65, 58, 55];
        return [180, 130, 100];
      }
      return [80, 85, 90];
    });
    const screenBacklightResult = FaceG.fallbackCheck(screenBacklight.video, screenBacklight.cvs, screenBacklight.ctx);
    results.push({ name: 'reject_screen_backlight_bleed', ok: screenBacklightResult === false, detail: `screenBacklightResult=${screenBacklightResult}` });

    // Test 6: Foto di wallpaper / kertas statis (tertahan di challenge dan tidak pernah terverifikasi)
    FaceG.resetLiveness();
    const staticPaper = makeFrame((x, y) => {
      if (x >= 18 && x <= 46 && y >= 12 && y <= 36) {
        if (y >= 20 && y <= 26 && x >= 22 && x <= 42) return [40, 30, 25];
        return [180, 130, 100];
      }
      return [80, 85, 90];
    });
    FaceG.checkLiveness(staticPaper.video, staticPaper.cvs, staticPaper.ctx);
    FaceG.checkLiveness(staticPaper.video, staticPaper.cvs, staticPaper.ctx);
    let staticLiveOk = true;
    for (let i = 0; i < 4; i++) {
      const res = FaceG.checkLiveness(staticPaper.video, staticPaper.cvs, staticPaper.ctx);
      if (res.stage !== 'challenge') staticLiveOk = false;
    }
    const staticVerified = FaceG.isLivenessVerified();
    results.push({ name: 'reject_static_paper_wallpaper', ok: staticLiveOk && !staticVerified, detail: `staticVerified=${staticVerified}` });

    // Test 7: Kedipan mata biologis manusia asli (Lulus verifikasi instan dalam 1 kedipan)
    FaceG.resetLiveness();
    const openFace = makeFrame((x, y) => {
      if (x >= 18 && x <= 46 && y >= 12 && y <= 36) {
        if (y >= 20 && y <= 26 && x >= 22 && x <= 42) return [40, 30, 25];
        return [180, 130, 100];
      }
      return [80, 85, 90];
    });
    const closedFace = makeFrame((x, y) => {
      if (x >= 18 && x <= 46 && y >= 12 && y <= 36) {
        return [180, 130, 100]; // Mata tertutup (kelopak mata sewarna kulit)
      }
      return [80, 85, 90];
    });
    FaceG.checkLiveness(openFace.video, openFace.cvs, openFace.ctx);
    FaceG.checkLiveness(openFace.video, openFace.cvs, openFace.ctx);
    FaceG.checkLiveness(closedFace.video, closedFace.cvs, closedFace.ctx);
    await new Promise(r => setTimeout(r, 100));
    const blinkRes = FaceG.checkLiveness(openFace.video, openFace.cvs, openFace.ctx);
    results.push({ name: 'verify_real_human_blink', ok: blinkRes.stage === 'verified' && FaceG.isLivenessVerified(), detail: `stage=${blinkRes.stage}` });

    return results;
  });

  console.log('[PROBE-ANTI-SPOOF] Results:');
  let allPass = true;
  for (const r of evaluation) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'} - ${r.name} (${r.detail})`);
    if (!r.ok) allPass = false;
  }

  if (!allPass) {
    console.error('PROBE FAILED!');
    process.exit(1);
  } else {
    console.log('PROBE PASSED! Semua uji anti-spoofing & deteksi wajah nyata valid di browser.');
  }
} finally {
  await browser.close();
  server.close();
}
