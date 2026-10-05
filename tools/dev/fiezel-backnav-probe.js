/**
 * FIEZEL — probe "kedipan blackscreen" (relaunch dokumen) saat kembali.
 *
 * Hipotesis yang diuji: tekanan kembali (tombol Android / swipe back PWA) menjatuhkan
 * penunjuk riwayat KELUAR dokumen. Kalau itu terjadi, `framenavigated`/`close` muncul dan
 * halaman memulai ulang dari splash — persis "berkedip seperti me-refresh".
 *
 * Probe ini menavigasi seperti murid, lalu menekan kembali berkali-kali dan mencatat:
 *   - apakah dokumen pernah di-unload (navigation / close / url about:blank)
 *   - history.length dan state penanda sebelum/sesudah
 *   - toast "tekan kembali sekali lagi untuk keluar"
 *
 * Pemakaian: node tools/dev/fiezel-backnav-probe.js [--no-vt]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4321;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      if (rel === '/' || rel === '') rel = '/index.html';
      const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('404'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const noVt = process.argv.includes('--no-vt');
  const pw = require('playwright');
  const server = await serve();
  const browser = await pw.chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ORIGIN = `http://127.0.0.1:${PORT}`;
  await ctx.route('**/*', (r) => r.request().url().startsWith(ORIGIN) ? r.continue() : r.abort());
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('fz_user_name', 'Budi Santoso');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Budi Santoso', classCode: 'FZ-12' }));
      localStorage.setItem('fiezel-splash-seen-v1', '1');
    } catch (e) {}
  });

  const page = await ctx.newPage();
  const log = [];
  page.on('close', () => log.push('PAGE CLOSE (dokumen mati)'));
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) log.push('NAV ' + f.url().slice(0, 80)); });
  page.on('pageerror', (e) => log.push('ERR ' + String(e.message).slice(0, 140)));
  if (noVt) await page.addInitScript(() => { try { Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true }); } catch (e) {} });

  await page.goto(ORIGIN + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { ['fzRitual', 'fzPrasasti', 'fiezelBootSplash', 'authGate', 'fz-tour', 'fz-tour-scrim'].forEach((id) => document.getElementById(id)?.remove()); document.querySelectorAll('.fz-tour,.fz-tour-scrim,#fzRitual,#fzPrasasti').forEach((e) => e.remove()); });

  const snap = () => page.evaluate(() => ({
    url: location.href.slice(-30), len: history.length,
    hs: String((history.state && history.state.fiezelBackNav) || ''),
    view: (function () { try { return window.state && state.view; } catch (e) { return '?'; } })(),
    stack: (function () { try { return window.FiezelBackNav ? 'n/a' : 'n/a'; } catch (e) { return ''; } })(),
    appChild: (document.getElementById('app')?.firstElementChild?.className || '')
  }));

  console.log('=== FIEZEL BACKNAV PROBE ===   no-vt =', noVt, ' startViewTransition =', await page.evaluate(() => !!document.startViewTransition));
  log.push('START ' + JSON.stringify(await snap()));

  // Navigasi seperti murid.
  for (const t of ['nav-latihan', 'nav-game', 'nav-progress', 'nav-home']) {
    const sel = `[data-testid="${t}"]`;
    if (await page.locator(sel).count()) { try { await page.click(sel, { force: true, timeout: 3000 }); } catch (e) {} }
    await page.waitForTimeout(700);
    log.push('after ' + t + ' ' + JSON.stringify(await snap()));
  }

  // Tekan kembali 12 kali; berhenti kalau dokumen mati.
  for (let i = 1; i <= 12; i++) {
    let alive = true;
    try { await page.evaluate(() => history.back()); } catch (e) { alive = false; }
    await page.waitForTimeout(600);
    try {
      const s = await snap();
      log.push(`back#${i} ${JSON.stringify(s)}`);
    } catch (e) { log.push(`back#${i} DOKUMEN TIDAK BISA DIBACA: ${String(e.message).slice(0, 80)}`); break; }
  }

  console.log(log.join('\n'));
  try {
    const toast = await page.evaluate(() => document.getElementById('toast')?.textContent || '');
    console.log('toast terakhir:', JSON.stringify(toast));
  } catch (e) {}

  await browser.close();
  server.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
