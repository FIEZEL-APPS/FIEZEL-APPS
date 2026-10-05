/**
 * FIEZEL — probe kedipan transisi antar-layar (View Transition).
 *
 * Hampir semua murid memakai Chrome/Android yang MENDUKUNG `document.startViewTransition`,
 * jadi setiap pindah layar menjalankan cross-fade snapshot root. Kalau animasi lama (pageOut)
 * dan baru (pageIn) tidak seimbang, layar akan meredup di tengah transisi. Itulah "berkedip
 * seperti me-refresh".
 *
 * Probe ini menyampel opacity pseudo `::view-transition-old(root)` / `::view-transition-new(root)`
 * PLUS opacity `.fade` tiap frame selama transisi, lalu menghitung cakupan layar
 * = old + new*fade dan mencari titik TERMINIMUM.
 *
 * Pemakaian: node tools/dev/fiezel-vt-audit.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4322;
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

// Fungsi sampler yang ditanam di halaman (BUKAN langsung dipanggil).
const SAMPLER = `window.__vtSample = function () {
  const op = (sel, pe) => { try { return Number(getComputedStyle(document.querySelector(sel), pe).opacity); } catch (e) { return null; } };
  const oldOp = op(':root', '::view-transition-old(root)');
  const newOp = op(':root', '::view-transition-new(root)');
  let fadeOp = 1, repaint = false, dur = null, fadeAnim = '', appCls = '';
  const app = document.getElementById('app');
  if (app) appCls = app.className || '';
  try {
    const f = document.querySelector('#app .fade');
    if (f) { const cs = getComputedStyle(f); fadeOp = Number(cs.opacity); dur = cs.animationDuration; fadeAnim = cs.animationName; repaint = !!(app && app.classList.contains('is-repaint')); }
  } catch (e) {}
  return { t: Math.round(performance.now()), old: oldOp, new: newOp, fade: fadeOp, repaint, dur, fadeAnim, appCls,
    coverage: (oldOp == null ? 1 : oldOp) + (newOp == null ? 0 : newOp) * fadeOp,
    appLen: app ? app.innerHTML.length : -1 };
};`;

(async () => {
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
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { document.querySelectorAll('.fz-tour,.fz-tour-scrim,#fzRitual,#fzPrasasti,#fiezelBootSplash,#authGate').forEach((e) => e.remove()); document.documentElement.classList.remove('fz-booting'); });
  await page.waitForTimeout(300);

  console.log('=== FIEZEL VT FLICKER AUDIT ===   startViewTransition =', await page.evaluate(() => !!document.startViewTransition));
  await page.evaluate(SAMPLER);
  console.log('-- animationDuration .fade:', await page.evaluate(() => getComputedStyle(document.querySelector('#app .fade')).animationDuration));

  const results = [];
  for (const [sel, label] of [['[data-testid="nav-game"]', 'home->game'], ['[data-testid="nav-home"]', 'game->home'], ['[data-testid="nav-progress"]', 'home->progress'], ['[data-testid="nav-home"]', 'progress->home']]) {
    await page.evaluate(() => {
      window.__vt = []; window.__vtStop = false;
      const tick = () => { try { window.__vt.push(window.__vtSample()); } catch (e) {} if (!window.__vtStop) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    if (await page.locator(sel).count()) { try { await page.click(sel, { force: true, timeout: 3000 }); } catch (e) {} }
    await page.waitForTimeout(750);
    const series = await page.evaluate(() => { window.__vtStop = true; return window.__vt; });
    // ambil jendela transisi: dari frame pertama yg punya pseudo sampai +600ms
    const start = series.findIndex((x) => x.old != null || x.new != null);
    const win = start >= 0 ? series.slice(start, start + 26) : series.slice(0, 40);
    const cover = win.map((x) => Number(x.coverage.toFixed(3)));
    const min = cover.length ? Math.min(...cover) : null;
    const fadeMin = Math.min(...win.map((x) => x.fade));
    results.push({ label, min, fadeMin, cover, frames: win.map((x) => ({ o: x.old, n: x.new, f: Number(x.fade.toFixed(2)), r: x.repaint, a: x.fadeAnim })) });
  }

  for (const r of results) {
    console.log(`-- ${r.label}: coverage-min=${r.min}  fade-min=${r.fadeMin}`);
    console.log('   coverage seri:', r.cover.join(' '));
    console.log('   old/new/fade/anim/appCls:', r.frames.slice(0, 14).map((x) => `${x.o}/${x.n}/${x.f}/${x.a || 'none'}/${x.appCls || '(kosong)'}`).join('  '));
  }
  const allMin = results.map((r) => r.min).filter((x) => x != null);
  console.log('-- COVERAGE TERENDAH semua transisi:', Math.min(...allMin));
  console.log('-- (1.00 = layar penuh tertutup; makin <1 makin terlihat "berkedip"/meredup)');

  await browser.close();
  server.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
