/**
 * FIEZEL BOT — PROBE EKSEKUSI (verifikasi berbasis eksekusi, bukan hanya kutipan).
 * ----------------------------------------------------------------------------
 * AKAR MASALAH. Verifikasi temuan bot (verifyFindings) hanya mencocokkan kutipan
 * `evidence` dengan baris kode sumber. Itu membuktikan baris itu ADA, bukan bahwa
 * gejalanya NYATA. Temuan audit PR #506 (mis. keluhan padding pada `.view-container`
 * yang tidak pernah dibuat di JS/HTML) lolos karena kutipan CSS-nya memang ada.
 *
 * BERKAS INI menjalankan aplikasi di Chromium Playwright lalu merekam: exception
 * tak tertangkap, galat konsol, dan kebocoran nilai mentah ("[object Object]" /
 * "undefined" / "NaN") yang ter-render ke layar. Hasilnya dipakai bot untuk menandai
 * temuan runtime sebagai "terbukti eksekusi" atau "belum terlihat di peramban".
 *
 * BOLEH DILEWATI. Playwright tidak dipasang di semua lingkungan lokal. Bila modul
 * atau Chromium tidak ada, skrip menulis hasil kosong dan keluar 0 — bot lalu jujur
 * menandai temuan sebagai "belum diuji eksekusi" (bukan diam-diam dianggap terbukti).
 *
 * Pemakaian:
 *   node tools/fiezel-bot-probe.mjs --in=<jobs.json> --out=<rows.json>
 * jobs.json : [{ "id": "...", "file": "style.css", "line": 3, "target": "index.html" }]
 * rows.json : [{ "id": "...", "probed": true, "ok": false, "target": "index.html", "errors": [...] }]
 */
'use strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// ESM tidak punya `require`; sediakan hanya untuk pemuatan modul CJS Playwright.
const require = createRequire(import.meta.url);

function arg(name) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : '';
}
const IN = arg('in');
const OUT = arg('out');
if (!IN || !OUT) { console.error('probe: butuh --in dan --out'); process.exit(2); }

function writeRows(rows) {
  try { fs.writeFileSync(OUT, JSON.stringify(rows), 'utf8'); }
  catch (e) { console.error(`probe: gagal menulis ${OUT}: ${e.message}`); }
}

let jobs = [];
try { jobs = JSON.parse(fs.readFileSync(IN, 'utf8')); }
catch (e) { console.error(`probe: input tidak valid: ${e.message}`); writeRows([]); process.exit(0); }
if (!Array.isArray(jobs) || !jobs.length) { writeRows([]); process.exit(0); }

// ── Pemuat Playwright / Chromium (pola sama dengan tests/ui-render-audit-test.js) ──
function loadPlaywright() {
  const candidates = ['playwright', '/opt/node22/lib/node_modules/playwright',
    '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright'];
  for (const id of candidates) { try { return require(id); } catch (_) { /* coba berikutnya */ } }
  return null;
}
function findChromium(pw) {
  try { const p = pw.chromium.executablePath(); if (p && fs.existsSync(p)) return p; } catch (_) {}
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const dir of fs.readdirSync(base)) {
      if (!/^chromium-/.test(dir)) continue;
      const exe = path.join(base, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch (_) {}
  return null;
}

const pw = loadPlaywright();
const exe = pw ? findChromium(pw) : null;
if (!pw || !exe) {
  console.log(`SKIP - probe eksekusi dilewati (${!pw ? 'modul playwright tidak ada' : 'Chromium tidak ditemukan'}).`);
  writeRows([]);
  process.exit(0);
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.onnx': 'application/octet-stream', '.webmanifest': 'application/manifest+json',
};
function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(String(req.url || '/').split('?')[0]);
      if (rel === '/') rel = '/index.html';
      const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('nope'); return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function seedScript() {
  return () => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
    } catch (_) {}
  };
}

// Galat yang jelas berasal dari jaringan luar yang sengaja diblokir — bukan cacat kode.
const NOISE = /(Failed to load resource|net::ERR|ERR_BLOCKED|ERR_ABORTED|ERR_FAILED|ERR_CONNECTION|Puter|unpkg|cdn\.|jsdelivr|fonts\.googleapis|firebase|googleapis\.com|DoubleClick|manifest)/i;

async function probeTarget(browser, base, jobsForTarget) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: 'light' });
  const port = new URL(base).port;
  await ctx.route('**/*', route => route.request().url().startsWith(`http://127.0.0.1:${port}/`)
    ? route.continue() : route.abort());
  const page = await ctx.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e && e.message ? e.message : e).slice(0, 200)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = String(m.text() || '');
    if (!NOISE.test(t)) consoleErrors.push(t.slice(0, 200));
  });
  let leaks = [];
  try {
    await page.addInitScript(seedScript());
    await page.goto(base, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(3500);
    await page.evaluate(() => {
      try {
        document.getElementById('fiezelBootSplash')?.remove();
        document.documentElement.classList.remove('fz-booting');
        document.querySelector('.fiezel-ob')?.remove();
        ['welcome', 'authGate', 'fzRitual'].forEach(i => document.getElementById(i)?.remove());
      } catch (_) {}
    });
    leaks = await page.evaluate(() => {
      const t = document.getElementById('app')?.innerText || '';
      return ['[object Object]', 'undefined', 'NaN'].filter(k => t.includes(k));
    });
  } catch (e) {
    pageErrors.push(`gagal memuat halaman: ${e.message}`.slice(0, 200));
  }
  await ctx.close().catch(() => {});
  const errors = [...pageErrors, ...consoleErrors, ...leaks.map(l => `nilai mentah ter-render: ${l}`)];
  const ok = pageErrors.length === 0 && consoleErrors.length === 0 && leaks.length === 0;
  return jobsForTarget.map(j => ({ id: j.id, probed: true, ok, target: j.target, errors: errors.slice(0, 8) }));
}

const { server, port } = await serve();
const browser = await pw.chromium.launch({
  executablePath: exe,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-first-run',
    '--disable-features=Translate,OptimizationHints,MediaRouter'],
});
const rows = [];
try {
  const byTarget = new Map();
  for (const j of jobs) {
    if (!j.target) continue;
    if (!byTarget.has(j.target)) byTarget.set(j.target, []);
    byTarget.get(j.target).push(j);
  }
  for (const [target, group] of byTarget) {
    const base = `http://127.0.0.1:${port}/${target}`;
    rows.push(...await probeTarget(browser, base, group));
  }
} catch (e) {
  console.error(`probe: kegagalan tak terduga: ${e.message}`);
} finally {
  await browser.close().catch(() => {});
  server.close();
}
// ID tanpa target (tidak diuji) tidak dimasukkan — bot menandainya "belum diuji eksekusi".
writeRows(rows);
console.log(`PROBE_DONE: ${rows.length} temuan diuji eksekusi (${rows.filter(r => !r.ok).length} memunculkan galat).`);
