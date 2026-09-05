// Local reproduction of the m025-26 Safari proof harness, driven by Chromium instead of
// SafariDriver (no macOS runner in this sandbox). Same probe page, same two visits.
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'http://127.0.0.1:8000/m02526-probe.html';

const ctxDir = '/home/user/workspace/m02526-profile2';
const browser = await chromium.launchPersistentContext(ctxDir, {
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--enable-features=SharedArrayBuffer'],
});

async function visit(tag) {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  await page.goto(URL, { waitUntil: 'load' });
  let result = null;
  for (let i = 0; i < 900; i++) {
    const s = await page.evaluate(() => ({ status: window.__probeStatus || null, result: window.__probeResult || null }));
    if (s.status === 'done' || s.status === 'error') { result = s.result; break; }
    await new Promise(r => setTimeout(r, 1000));
  }
  fs.writeFileSync(`/tmp/rep2-${tag}.json`, JSON.stringify(result, null, 2));
  fs.writeFileSync(`/tmp/rep2-${tag}.log`, logs.join('\n'));
  console.log(`=== ${tag} ===`);
  console.log(JSON.stringify(result, null, 2));
  console.log(`--- console (${logs.length} lines, first 40) ---`);
  console.log(logs.slice(0, 40).join('\n'));
  await page.close();
}

await visit('run1');
await visit('run2');
await browser.close();
