// node stills.mjs <folder-keluar> <sampel> t1 t2 ... — render still untuk QA (JPEG).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from './serve.mjs';
import { launchOpts } from './chrome.mjs';

const [, , outDir = 'out/stills', samples = '1', ...times] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const port = Number(process.env.FZ_PORT || 8931) + 7;
const srv = await serve(port);
const browser = await chromium.launch(launchOpts());
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.text()); });
await page.goto(`http://127.0.0.1:${port}/web/index.html`);
await page.waitForFunction('window.ready === true', null, { timeout: 120000 });
for (const ts of times) {
  const f = Math.round(parseFloat(ts) * 30);
  const t0 = Date.now();
  await page.evaluate(([f, n]) => window.renderFrame(f, n), [f, Number(samples)]);
  const file = path.join(outDir, `t${String(ts).replace('.', '_')}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
  console.log(file, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
await browser.close(); srv.close();
