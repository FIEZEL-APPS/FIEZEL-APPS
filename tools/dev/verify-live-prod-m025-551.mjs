import { chromium } from 'playwright';

const LIVE_URL = 'https://fiezel.my.id/app/';

async function verifyLiveProduction() {
  console.log('[PROD-VERIFY-551] Membuka browser Playwright untuk inspeksi live https://fiezel.my.id/app/ ...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block'
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  await page.goto(LIVE_URL + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const evaluation = await page.evaluate(async () => {
    const build = window.FIEZEL_PAGE_BUILD || self.FIEZEL_PAGE_BUILD;
    const fg = typeof window.FiezelFaceGuard !== 'undefined';
    const hub = typeof window.FiezelClassHub !== 'undefined';

    const results = {
      build,
      faceGuardAvailable: fg,
      hubAvailable: hub,
      fallbackCheckEnhanced: false,
      emptyRoomRefused: false,
      turnedHeadRefused: false
    };

    if (fg && window.FiezelFaceGuard.fallbackCheck) {
      const FG = window.FiezelFaceGuard;

      // Mock canvas test
      function makeCanvas(drawFn) {
        const cvs = document.createElement('canvas');
        cvs.width = 64; cvs.height = 48;
        const ctx = cvs.getContext('2d');
        const img = ctx.createImageData(64, 48);
        const d = img.data;
        for (let y = 0; y < 48; y++) {
          for (let x = 0; x < 64; x++) {
            const [r, g, b] = drawFn(x, y);
            const idx = (y * 64 + x) * 4;
            d[idx] = r; d[idx + 1] = g; d[idx + 2] = b; d[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
        const vid = { readyState: 4 };
        return { vid, cvs, ctx };
      }

      const emptyRoom = makeCanvas((x, y) => {
        if (y < 28) return [210, 180, 150];
        return [160, 110, 70];
      });
      const turned = makeCanvas((x, y) => {
        if (x >= 44 && x <= 60 && y >= 14 && y <= 36) return [175, 125, 95];
        return [190, 175, 150];
      });

      const resRoom = FG.fallbackCheck(emptyRoom.vid, emptyRoom.cvs, emptyRoom.ctx);
      const resTurned = FG.fallbackCheck(turned.vid, turned.cvs, turned.ctx);

      results.emptyRoomRefused = (resRoom === false);
      results.turnedHeadRefused = (resTurned === false);
      results.fallbackCheckEnhanced = (results.emptyRoomRefused && results.turnedHeadRefused);
    }

    return results;
  });

  console.log('[PROD-VERIFY-RESULT]', JSON.stringify(evaluation, null, 2));

  await browser.close();
  return evaluation;
}

verifyLiveProduction().catch(err => {
  console.error('[PROD-VERIFY-ERROR]', err);
  process.exit(1);
});
