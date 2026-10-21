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

console.log(`[PROBE-FAST-LIVENESS] Serving at ${localUrl}`);

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
  await page.waitForTimeout(800);

  const testResults = await page.evaluate(async () => {
    const FG = window.FiezelFaceGuard;
    if (!FG) return { ok: false, error: 'FiezelFaceGuard not found' };

    function makeMockCanvas(pixelFn) {
      const w = 64, h = 48;
      const cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      const ctx = cvs.getContext('2d', { willReadFrequently: true });
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const [r, g, b, a] = pixelFn(x, y);
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a != null ? a : 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const video = cvs;
      video.readyState = 2;
      return { video, cvs, ctx };
    }

    // 1. Uji deteksi wajah alami dan wajah dengan pantulan layar monitor cool-white
    const warmFace = makeMockCanvas((x, y) => {
      if (x >= 18 && x <= 46 && y >= 12 && y <= 36) return [180, 130, 100];
      return [80, 85, 90];
    });
    const coolScreenFace = makeMockCanvas((x, y) => {
      if (x >= 18 && x <= 46 && y >= 12 && y <= 36) return [155, 130, 132];
      return [80, 85, 90];
    });
    const emptyRoom = makeMockCanvas(() => [200, 202, 205]);
    const woodFurniture = makeMockCanvas(() => [160, 110, 65]);

    const warmOk = FG.fallbackCheck(warmFace.video, warmFace.cvs, warmFace.ctx);
    const coolOk = FG.fallbackCheck(coolScreenFace.video, coolScreenFace.cvs, coolScreenFace.ctx);
    const emptyRejected = !FG.fallbackCheck(emptyRoom.video, emptyRoom.cvs, emptyRoom.ctx);
    const woodRejected = !FG.fallbackCheck(woodFurniture.video, woodFurniture.cvs, woodFurniture.ctx);

    // 2. Uji Deteksi Kedipan Mata Cepat (Active Liveness Fast Blink < 300ms)
    FG.resetLiveness();
    function makeLivenessCanvas(open) {
      return makeMockCanvas((x, y) => {
        if (x >= 18 && x <= 46 && y >= 12 && y <= 36) {
          if (y >= 20 && y <= 26 && x >= 22 && x <= 42) {
            if (open) return [40, 30, 25]; // Iris gelap
            return [180, 130, 100]; // Kelopak mata tertutup
          }
          return [180, 130, 100];
        }
        return [80, 85, 90];
      });
    }

    const openC = makeLivenessCanvas(true);
    const closedC = makeLivenessCanvas(false);

    // Kalibrasi 2 tick
    FG.checkLiveness(openC.video, openC.cvs, openC.ctx);
    FG.checkLiveness(openC.video, openC.cvs, openC.ctx);

    // Mata menutup
    const tStart = performance.now();
    FG.checkLiveness(closedC.video, closedC.cvs, closedC.ctx);

    // Simulasi jeda kedipan manusiawi 100ms
    await new Promise(r => setTimeout(r, 100));

    // Mata terbuka kembali
    const resBlink = FG.checkLiveness(openC.video, openC.cvs, openC.ctx);
    const tBlink = performance.now() - tStart;

    const blinkVerified = resBlink.stage === 'verified' && FG.isLivenessVerified();

    // 3. Uji Gerakan Kepala / Toleh
    FG.resetLiveness();
    function makeTurnedCanvas(shiftX) {
      return makeMockCanvas((x, y) => {
        const adjX = x - shiftX;
        if (adjX >= 18 && adjX <= 46 && y >= 12 && y <= 36) {
          if (y >= 20 && y <= 26 && adjX >= 22 && adjX <= 42) return [40, 30, 25];
          return [180, 130, 100];
        }
        return [80, 85, 90];
      });
    }
    const centerC = makeTurnedCanvas(0);
    const turnedC = makeTurnedCanvas(4);

    FG.checkLiveness(centerC.video, centerC.cvs, centerC.ctx);
    FG.checkLiveness(centerC.video, centerC.cvs, centerC.ctx);
    const resTurn = FG.checkLiveness(turnedC.video, turnedC.cvs, turnedC.ctx);
    const turnVerified = resTurn.stage === 'verified' && resTurn.turn;

    return {
      ok: warmOk && coolOk && emptyRejected && woodRejected && blinkVerified && turnVerified,
      warmOk,
      coolOk,
      emptyRejected,
      woodRejected,
      blinkVerified,
      tBlinkMs: Math.round(tBlink),
      turnVerified
    };
  });

  console.log('[PROBE-RESULT]', JSON.stringify(testResults, null, 2));

  if (!testResults.ok) {
    console.error('[PROBE] GAGAL: Ada uji biometrik liveness yang tidak lolos!');
    process.exit(1);
  }

  console.log('[PROBE] SUKSES: Liveness kedip mata cepat & deteksi pantulan layar ujian 100% LULUS!');

} finally {
  await browser.close();
  server.close();
}
