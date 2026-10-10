import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Simple static server
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

console.log(`[PROBE-LIVENESS] Server berjalan di ${localUrl}`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const consoleLogs = [];
page.on('console', msg => consoleLogs.push(msg.text()));

try {
  await page.goto(localUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const probeResults = await page.evaluate(async () => {
    const Hub = window.FiezelClassHub;
    const TS = window.FiezelTeacherStore;
    const FaceG = window.FiezelFaceGuard;
    const I18n = window.FiezelI18n;

    if (!Hub || !FaceG) {
      return { ok: false, error: 'Hub or FaceG not loaded' };
    }

    // 1. Check if checkLiveness and resetLiveness exist on FaceG
    const hasLivenessFns = typeof FaceG.checkLiveness === 'function' && typeof FaceG.resetLiveness === 'function';

    // 2. Setup mock assignment with faceGuard
    TS.acceptAssignmentPayload({
      v: 1,
      t: 'assign',
      id: 'ujian-liveness-probe',
      title: 'Ujian Nasional Bahasa Inggris',
      skills: ['past_tense'],
      itemIds: ['past-1', 'past-2'],
      minutes: 10,
      from: 'Guru Siti',
      cls: 'FZ-EXAM1',
      mode: 'ujian',
      faceGuard: true,
      timer: 10
    });

    // 3. Mount student UI
    const container = document.createElement('div');
    container.id = 'probe-student-root';
    document.body.appendChild(container);

    let toastMsg = '';
    Hub.mountStudent(container, {
      toast: (msg) => { toastMsg = msg; },
      go: () => {},
      afterRender: () => {}
    });

    // Open assignment
    Hub.openAssignment('ujian-liveness-probe');
    Hub.renderStudent();

    const initialPreflightHtml = container.innerHTML;
    const hasPreflight = initialPreflightHtml.includes('class-face-preflight');
    const hasBtnVerify = initialPreflightHtml.includes('btn-verify-face');

    // 4. Test liveness algorithm with canvas simulation
    function createSimCanvas(eyesOpen, shiftX = 0) {
      const cvs = document.createElement('canvas');
      cvs.width = 64; cvs.height = 48;
      const ctx = cvs.getContext('2d');
      const imgData = ctx.createImageData(64, 48);
      const d = imgData.data;

      for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 64; x++) {
          const idx = (y * 64 + x) * 4;
          const ax = x - shiftX;
          if (ax >= 18 && ax <= 46 && y >= 12 && y <= 36) {
            if (y >= 20 && y <= 26 && ax >= 22 && ax <= 42) {
              if (eyesOpen) {
                d[idx] = 40; d[idx + 1] = 30; d[idx + 2] = 25;
              } else {
                d[idx] = 180; d[idx + 1] = 130; d[idx + 2] = 100;
              }
            } else {
              d[idx] = 180; d[idx + 1] = 130; d[idx + 2] = 100;
            }
          } else {
            d[idx] = 80; d[idx + 1] = 85; d[idx + 2] = 90;
          }
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const vid = document.createElement('video');
      Object.defineProperty(vid, 'readyState', { value: 4 });
      return { vid, cvs, ctx };
    }

    // Step A: Static photo test
    FaceG.resetLiveness();
    const staticPhoto = createSimCanvas(true, 0);
    FaceG.checkLiveness(staticPhoto.vid, staticPhoto.cvs, staticPhoto.ctx);
    FaceG.checkLiveness(staticPhoto.vid, staticPhoto.cvs, staticPhoto.ctx);
    const staticCheckRes = FaceG.checkLiveness(staticPhoto.vid, staticPhoto.cvs, staticPhoto.ctx);
    const staticVerified = FaceG.isLivenessVerified();

    // Step B: Human Blink test
    FaceG.resetLiveness();
    const openFace = createSimCanvas(true, 0);
    const closedFace = createSimCanvas(false, 0);
    FaceG.checkLiveness(openFace.vid, openFace.cvs, openFace.ctx);
    FaceG.checkLiveness(openFace.vid, openFace.cvs, openFace.ctx);
    const challengeRes = FaceG.checkLiveness(openFace.vid, openFace.cvs, openFace.ctx);
    // Closed eyes (blink)
    FaceG.checkLiveness(closedFace.vid, closedFace.cvs, closedFace.ctx);
    await new Promise(r => setTimeout(r, 120));
    // Eyes reopen
    const reopenRes = FaceG.checkLiveness(openFace.vid, openFace.cvs, openFace.ctx);
    const blinkVerified = FaceG.isLivenessVerified();

    // Step C: Check i18n copy
    const panduanId = I18n.t('proctor.verifikasi-liveness-panduan');
    const suksesId = I18n.t('proctor.verifikasi-liveness-sukses');

    return {
      ok: true,
      hasLivenessFns,
      hasPreflight,
      hasBtnVerify,
      staticCheckStage: staticCheckRes.stage,
      staticVerified,
      challengeStage: challengeRes.stage,
      reopenStage: reopenRes.stage,
      blinkVerified,
      panduanId,
      suksesId
    };
  });

  console.log('[PROBE-LIVENESS] Hasil Evaluasi Playwright:', JSON.stringify(probeResults, null, 2));

  if (!probeResults.ok) {
    throw new Error('Probe evaluasi gagal: ' + probeResults.error);
  }
  if (!probeResults.hasLivenessFns) {
    throw new Error('Fungsi checkLiveness / resetLiveness tidak ditemukan di FiezelFaceGuard');
  }
  if (probeResults.staticVerified !== false) {
    throw new Error('Foto statis harus ditolak dan tidak boleh lolos liveness!');
  }
  if (probeResults.blinkVerified !== true) {
    throw new Error('Kedip mata manusia harus lolos verifikasi liveness!');
  }
  if (!probeResults.panduanId.includes('Kedipkan matamu')) {
    throw new Error('Panduan liveness copy text id tidak sesuai');
  }

  console.log('\n[PROBE-LIVENESS] EMPIRICAL PLAYWRIGHT AUDIT: 100% SUKSES!');
} finally {
  await browser.close();
  server.close();
}
