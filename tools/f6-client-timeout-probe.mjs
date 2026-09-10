/* F6 — INSTRUMENTASI SEMENTARA (bukan gerbang, tidak didaftarkan di CI).
 *
 * Tujuan tunggal: membuktikan SIAPA yang memutus permintaan `/api/config` di sisi klien,
 * dengan cap waktu, bukan dengan tafsiran. Ia menyalakan Chromium sungguhan atas worktree
 * ini (persis pola tools/fiezel-e2e-bridge.mjs: HTTPS loopback + --host-resolver-rules,
 * supaya Origin tetap https://fiezel.my.id dan cookie Domain=.fiezel.my.id first-party),
 * lalu MEMBUNGKUS `window.fetch` dan `AbortController.prototype.abort` sebelum satu pun
 * skrip aplikasi berjalan.
 *
 * Yang dicatat per permintaan CF: mulai, selesai/gagal, durasi, nama galat, dan — kalau ia
 * di-abort — jejak tumpukan pemanggil `abort()`. Itu satu-satunya cara menjawab
 * "diputus oleh aplikasi atau oleh jaringan" tanpa menebak.
 *
 * Jalankan:
 *   FIEZEL_E2E_BRIDGE_BASE=https://api.fiezel.my.id node tools/f6-client-timeout-probe.mjs
 * Env opsional: F6_CONFIG_DELAY (ms tunda buatan di depan /api/config), F6_HOPS (jumlah
 * panggilan /api/quota beruntun), F6_OUT (tujuan JSON).
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const env = process.env;
const BASE = String(env.FIEZEL_E2E_BRIDGE_BASE || '').trim();
if (!BASE) { console.log('SKIP — FIEZEL_E2E_BRIDGE_BASE tidak diset.'); process.exit(0); }
const BRIDGE = new URL(BASE).origin;
const APP_DIR = path.resolve(env.F6_APP_DIR || REPO);
const APP_HOST = 'fiezel.my.id';
const CONFIG_DELAY = Number(env.F6_CONFIG_DELAY || 0);
const HOPS = Number(env.F6_HOPS || 4);
const OUT = path.resolve(env.F6_OUT || '/tmp/f6-probe.json');

const { chromium } = await import('playwright');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'f6-probe-'));
const keyPath = path.join(tmpDir, 'k.pem'), certPath = path.join(tmpDir, 'c.pem');
const ossl = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath, '-out', certPath,
  '-days', '2', '-subj', `/CN=${APP_HOST}`, '-addext', `subjectAltName=DNS:${APP_HOST},DNS:localhost,IP:127.0.0.1`], { encoding: 'utf8' });
if (ossl.status !== 0) { console.error('openssl gagal:', ossl.stderr); process.exit(1); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8' };
const server = https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, (req, res) => {
  let pathname = '/';
  try { pathname = decodeURIComponent(new URL(req.url, 'https://l').pathname); } catch { /* biarkan */ }
  const target = path.resolve(APP_DIR, pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
  if (target !== APP_DIR && !target.startsWith(APP_DIR + path.sep)) { res.writeHead(403); return res.end('no'); }
  fs.readFile(target, (e, c) => {
    if (e) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(c);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const INSTRUMENT = ({ cfg, bridge }) => {
  let value = cfg;
  Object.defineProperty(window, 'FIEZEL_CF_CONFIG', { configurable: true, get: () => value, set: () => {} });
  const log = [];
  window.__F6 = { t0: Date.now(), log, aborts: [] };
  const stamp = () => Date.now() - window.__F6.t0;
  const realFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = String(typeof input === 'string' ? input : (input && input.url) || '');
    if (!url.startsWith(bridge)) return realFetch.apply(this, arguments);
    const entry = { url, mulaiMs: stamp(), selesaiMs: 0, status: 0, galat: '', signalAda: !!(init && init.signal) };
    log.push(entry);
    const p = realFetch.apply(this, arguments);
    return p.then(r => { entry.selesaiMs = stamp(); entry.status = r.status; return r; },
      e => { entry.selesaiMs = stamp(); entry.galat = String((e && e.name) || '') + ':' + String((e && e.message) || e); throw e; });
  };
  const realAbort = AbortController.prototype.abort;
  AbortController.prototype.abort = function (reason) {
    let stack = '';
    try { stack = String(new Error('abort').stack || '').split('\n').slice(1, 6).join(' | '); } catch (e) { stack = ''; }
    window.__F6.aborts.push({ padaMs: stamp(), alasan: String(reason || '(tanpa alasan)'), pemanggil: stack });
    return realAbort.apply(this, arguments);
  };
  window.__F6_CALL = async (path, options, ms) => {
    const started = Date.now();
    const call = (async () => {
      if (typeof window.coreWorkerExec !== 'function') return { error: 'coreWorkerExec tidak ada' };
      try {
        const r = await window.coreWorkerExec(path, options || {});
        let body = '';
        try { body = String(await r.text()).slice(0, 200); } catch { body = ''; }
        return { ok: !!r.ok, status: Number(r.status || 0), body };
      } catch (e) { return { error: String((e && e.name) || '') + ':' + String((e && e.message) || e) }; }
    })();
    const guard = new Promise(res => setTimeout(() => res({ timeout: true }), ms || 15000));
    const out = await Promise.race([call, guard]);
    return { ...out, ms: Date.now() - started };
  };
};

const OFFSET = { health: 'off', config: 'off', auth: 'off', quota: 'off', ai: 'off', tts: 'off', usage: 'off' };
const hasil = { bridge: BRIDGE, appDir: APP_DIR, configDelayMs: CONFIG_DELAY, skenario: [] };

async function run(name, cfg, { delay = 0, hops = 0 } = {}) {
  const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${APP_HOST}:443 127.0.0.1:${port}`, '--ignore-certificate-errors'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await context.newPage();
  await page.addInitScript(INSTRUMENT, { cfg, bridge: BRIDGE });
  if (delay > 0) {
    await page.route(u => u.href.startsWith(BRIDGE) && u.pathname.startsWith('/api/config'), async route => {
      await new Promise(r => setTimeout(r, delay));
      try { await route.continue(); } catch { /* halaman sudah membatalkan */ }
    });
  }
  const konsol = [];
  page.on('console', m => { if (konsol.length < 40) konsol.push(m.type() + ': ' + m.text().slice(0, 200)); });
  await page.goto(`https://${APP_HOST}/`, { waitUntil: 'domcontentloaded' }).catch(e => konsol.push('navError: ' + e.message));
  await page.waitForTimeout(delay > 0 ? delay + 6000 : 9000);
  const panggilan = [];
  for (let i = 0; i < hops; i += 1) {
    panggilan.push(await page.evaluate(([p, ms]) => window.__F6_CALL(p, {}, ms), ['/api/quota', 8000]));
  }
  const dump = await page.evaluate(() => ({
    log: window.__F6.log, aborts: window.__F6.aborts,
    cfState: (window.FiezelCfKillSwitch && window.FiezelCfKillSwitch.state) ? window.FiezelCfKillSwitch.state() : null,
    mode: (window.FiezelCfKillSwitch && window.FiezelCfKillSwitch.mode) ? { config: window.FiezelCfKillSwitch.mode('config'), quota: window.FiezelCfKillSwitch.mode('quota') } : null
  }));
  hasil.skenario.push({ nama: name, cfg, delay, ...dump, panggilanQuota: panggilan, konsol });
  console.log('===', name);
  console.log('  fetch CF:', JSON.stringify(dump.log));
  console.log('  aborts  :', JSON.stringify(dump.aborts));
  console.log('  cfState :', JSON.stringify(dump.cfState));
  console.log('  mode    :', JSON.stringify(dump.mode));
  if (hops) console.log('  quota   :', JSON.stringify(panggilan));
  await browser.close();
}

try {
  await run('1-config-on-tanpa-tunda', { enabled: true, base: BRIDGE, endpoints: { ...OFFSET, config: 'on', quota: 'on' } });
  if (CONFIG_DELAY > 0) await run('2-config-ditunda', { enabled: true, base: BRIDGE, endpoints: { ...OFFSET, config: 'on', quota: 'on' } }, { delay: CONFIG_DELAY });
  if (HOPS > 0) await run('3-hop-beruntun', { enabled: true, base: BRIDGE, endpoints: { ...OFFSET, auth: 'on', quota: 'on' } }, { hops: HOPS });
} finally {
  await new Promise(r => server.close(r));
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* temp */ }
  fs.writeFileSync(OUT, JSON.stringify(hasil, null, 2) + '\n');
  console.log('JSON:', OUT);
}
