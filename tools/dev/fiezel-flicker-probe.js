/**
 * FIEZEL — probe "berkedip seperti me-refresh" (audit empiris).
 *
 * OWNER: "perbaiki tampilan di PWA yang berkedip-kedip seperti sedang me-refresh halaman,
 * itu sangat mengganggu bagi murid."
 *
 * Probe ini TIDAK menyimpulkan dari membaca kode. Ia membuka aplikasi sungguhan di Chromium
 * dari server lokal, lalu:
 *   --boot   merekam garis waktu 11 dtk apa yang menutupi pusat layar saat boot;
 *   --nav    menekan tombol navigasi seperti murid, dan mengukur apakah isi #app menjadi
 *            KOSONG (0) di antara dua layar -> itulah "berkedip seperti me-refresh".
 *
 * --no-vt mensimulasikan PWA iOS (document.startViewTransition TIDAK ada), jalur yang
 * dipakai mayoritas murid: kalau kedipan itu hanya muncul di sini, akarnya adalah swap()
 * tanpa transisi.
 *
 * Pemakaian:
 *   node tools/dev/fiezel-flicker-probe.js --boot --fresh
 *   node tools/dev/fiezel-flicker-probe.js --boot --warm
 *   node tools/dev/fiezel-flicker-probe.js --nav  --warm [--no-vt]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4319;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.webm': 'video/webm', '.wasm': 'application/wasm'
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      if (rel === '/' || rel === '') rel = '/index.html';
      const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

// Sampel: apa yang menutupi pusat layar + panjang/isi #app. Dipanggil dari requestAnimationFrame
// hook (bukan setInterval) supaya tidak melewatkan frame kosong yang cuma hidup beberapa ms.
const SAMPLE = `(() => {
  try {
    const cx = Math.round(innerWidth / 2), cy = Math.round(innerHeight / 2);
    const top = document.elementFromPoint(cx, cy);
    const app = document.getElementById('app');
    const chain = [];
    let el = top;
    while (el && chain.length < 4) {
      const cs = getComputedStyle(el);
      chain.push((el.id || el.tagName) + (el.className ? '.' + String(el.className).split(/\\s+/)[0] : '') + '@' + Number(cs.opacity).toFixed(2));
      el = el.parentElement;
    }
    return {
      t: performance.now(),
      appLen: app ? app.innerHTML.length : -1,
      appChild: app && app.firstElementChild ? (app.firstElementChild.className || app.firstElementChild.tagName) : '',
      isEmpty: !!app && app.innerHTML.trim() === '',
      top: chain.join(' < ')
    };
  } catch (e) { return { t: performance.now(), error: String(e.message) }; }
})()`;

const INSTRUMENT = () => {
  const note = (m) => { try { window.__fzNote && window.__fzNote(m); } catch (e) {} };
  // Rekam setiap frame: apakah #app kosong? Ini mata jarum yang mencari "kedipan refresh".
  let rafId;
  const tick = () => {
    try {
      const app = document.getElementById('app');
      const len = app ? app.innerHTML.length : -1;
      note('FRAME ' + String(Math.round(performance.now())) + ' ' + len);
    } catch (e) {}
    rafId = requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__fzStopFrames = () => { try { cancelAnimationFrame(rafId); } catch (e) {} };
  addEventListener('DOMContentLoaded', () => {
    const origSVT = document.startViewTransition && document.startViewTransition.bind(document);
    window.__fzHadSVT = !!origSVT;
    if (origSVT) { document.startViewTransition = function (cb) { note('EVT startViewTransition'); return origSVT(cb); }; }
  });
};

async function launch(ctx, { noVt }) {
  const page = await ctx.newPage();
  await page.addInitScript(INSTRUMENT);
  await page.exposeFunction('__fzNote', (m) => { global.__events.push(m); });
  if (noVt) await page.addInitScript(() => { try { Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true }); } catch (e) {} });
  return page;
}

function timelineOfFrames(events) {
  // events berisi "FRAME <ms> <len>"; cari frame yang len 0 di antara dua frame berisi.
  const frames = events.map((e) => /^FRAME (\d+) (-?\d+)$/.exec(e)).filter(Boolean)
    .map((m) => ({ ms: Number(m[1]), len: Number(m[2]) }));
  const flashes = [];
  for (let i = 1; i < frames.length - 1; i++) {
    if (frames[i].len === 0 && frames[i - 1].len > 0 && frames[i + 1].len > 0) {
      flashes.push({ at: Math.round(frames[i].ms), blankMs: Math.round(frames[i + 1].ms - frames[i].ms), before: frames[i - 1].len, after: frames[i + 1].len });
    }
  }
  return { frames, flashes };
}

(async () => {
  global.__events = [];
  const mode = process.argv.includes('--fresh') ? 'fresh' : 'warm';
  const doNav = process.argv.includes('--nav');
  const noVt = process.argv.includes('--no-vt');
  const pw = require('playwright');
  const server = await serve();
  const browser = await pw.chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ORIGIN = `http://127.0.0.1:${PORT}`;
  await ctx.route('**/*', (route) => route.request().url().startsWith(ORIGIN) ? route.continue() : route.abort());

  await ctx.addInitScript((m) => {
    try {
      if (m === 'warm') {
        localStorage.setItem('fz_user_name', 'Budi Santoso');
        localStorage.setItem('fz_onboarding_done', '1');
        localStorage.setItem('fz_auth_skip', '1');
        localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Budi Santoso', classCode: 'FZ-12' }));
        localStorage.setItem('fiezel-splash-seen-v1', '1');
      }
    } catch (e) {}
  }, mode);

  const page = await launch(ctx, { noVt });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });

  const sampleRows = [];
  const rec = async (label, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try { sampleRows.push(Object.assign({ label }, await page.evaluate(SAMPLE))); } catch (e) {}
      await page.waitForTimeout(50);
    }
  };

  console.log(`=== FIEZEL FLICKER PROBE (${mode}${doNav ? ' nav' : ' boot'}${noVt ? ' no-vt' : ''}) ===`);
  await page.waitForTimeout(3500); // biarkan splash/perkenalan mendarat
  // Buang lapisan transien yang bukan objek uji (ritual/prasasti) supaya garis waktunya bersih.
  await page.evaluate(() => { ['fzRitual', 'fzPrasasti', 'fiezelBootSplash', 'authGate'].forEach((id) => document.getElementById(id)?.remove()); document.documentElement.classList.remove('fz-booting'); });

  if (!doNav) {
    for (let i = 0; i < 22; i++) { try { sampleRows.push(await page.evaluate(SAMPLE)); } catch (e) {} await page.waitForTimeout(100); }
  } else {
    const taps = [
      ['nav-latihan', 'latihan'], ['nav-home', 'home'], ['nav-game', 'game'], ['nav-home', 'home'],
      ['nav-progress', 'progress'], ['nav-home', 'home'], ['nav-classroom', 'classroom'], ['nav-home', 'home']
    ];
    for (const [tid, view] of taps) {
      const sel = `[data-testid="${tid}"]`;
      const ok = await page.locator(sel).count();
      await rec('before:' + view, 120);
      if (ok) { try { await page.click(sel, { force: true, timeout: 3000 }); } catch (e) { global.__events.push('EVT click-fail ' + tid); } }
      await rec('during:' + view, 700);
    }
  }

  const { frames, flashes } = timelineOfFrames(global.__events);
  console.log('-- startViewTransition ada:', await page.evaluate(() => !!window.__fzHadSVT));
  console.log('-- total frame direkam   :', frames.length);
  console.log('-- KEDIPAN #app KOSONG   :', flashes.length);
  for (const f of flashes) console.log(`     t=${f.at}ms kosong±${f.blankMs}ms (${f.before} -> ${f.after} chars)`);
  const ev = global.__events.filter((e) => !e.startsWith('FRAME'));
  console.log('-- EVT mulai transisi    :', ev.filter((e) => e.includes('startViewTransition')).length);
  const appChild = [];
  let last = null;
  for (const r of sampleRows) if (r.appChild !== last) { appChild.push(`t=${Math.round(r.t)} ${r.appChild || '(kosong)'}`); last = r.appChild; }
  console.log('-- pergantian layar #app :');
  console.log(appChild.map((x) => '     ' + x).join('\n'));
  if (noVt) {
    console.log('-- contoh topChain saat pergantian (durante):');
    for (const r of sampleRows.filter((x) => x.label.startsWith('during')).slice(0, 6)) console.log('     ', r.label, '|', r.appLen, '|', r.top);
  }
  console.log('-- PAGE ERRORS:', errors.slice(0, 8).join(' | ') || '(none)');

  await browser.close();
  server.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
