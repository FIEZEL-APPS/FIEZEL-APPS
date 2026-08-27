/* Isolasi: kenapa skenario D (hop) menggantung sementara C tidak.
 * Empat varian, satu browser baru per varian, semuanya lewat coreWorkerExec aplikasi. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { spawnSync } from 'node:child_process';

const BRIDGE = 'https://api.fiezel.my.id';
const APP_DIR = '/home/user/workspace/wt-f6client';
const APP_HOST = 'fiezel.my.id';
const FZ = fs.readFileSync('/tmp/fzid.txt', 'utf8').trim();
const { chromium } = await import('playwright');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'f6h-'));
const k = path.join(tmp, 'k.pem'), c = path.join(tmp, 'c.pem');
spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', k, '-out', c, '-days', '2', '-subj', `/CN=${APP_HOST}`, '-addext', `subjectAltName=DNS:${APP_HOST},DNS:localhost,IP:127.0.0.1`]);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8' };
const server = https.createServer({ key: fs.readFileSync(k), cert: fs.readFileSync(c) }, (req, res) => {
  let p = '/';
  try { p = decodeURIComponent(new URL(req.url, 'https://l').pathname); } catch {}
  const t = path.resolve(APP_DIR, p === '/' ? 'index.html' : p.replace(/^\/+/, ''));
  fs.readFile(t, (e, b) => { if (e) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(t)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(b); });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const INIT = ({ cfg, bridge }) => {
  let v = cfg;
  Object.defineProperty(window, 'FIEZEL_CF_CONFIG', { configurable: true, get: () => v, set: () => {} });
  const log = []; window.__F6 = { t0: Date.now(), log };
  const rf = window.fetch;
  window.fetch = function (i, init) {
    const url = String(typeof i === 'string' ? i : (i && i.url) || '');
    if (!url.startsWith(bridge)) return rf.apply(this, arguments);
    const e = { url: url.replace(bridge, ''), mulai: Date.now() - window.__F6.t0, selesai: 0, status: 0, galat: '' };
    log.push(e);
    return rf.apply(this, arguments).then(r => { e.selesai = Date.now() - window.__F6.t0; e.status = r.status; return r; }, err => { e.selesai = Date.now() - window.__F6.t0; e.galat = String(err && err.message || err); throw err; });
  };
  window.__CALL = async (p, ms) => {
    const s = Date.now();
    const call = (async () => { try { const r = await window.coreWorkerExec(p, {}); let b = ''; try { b = String(await r.text()).slice(0, 80); } catch {} return { status: r.status, ok: r.ok, b }; } catch (e) { return { error: String(e && e.message || e) }; } })();
    const g = new Promise(res => setTimeout(() => res({ timeout: true }), ms));
    const o = await Promise.race([call, g]);
    return { ...o, ms: Date.now() - s };
  };
  window.__STATE = () => (window.FiezelCfKillSwitch ? { st: window.FiezelCfKillSwitch.state(), quota: window.FiezelCfKillSwitch.mode('quota') } : null);
};
const OFF = { health: 'off', config: 'off', auth: 'off', quota: 'off', ai: 'off', tts: 'off', usage: 'off' };

async function variant(name, { endpoints, seed, waitMs, hops = 3, extraArgs = [] }) {
  const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${APP_HOST}:443 127.0.0.1:${port}`, '--ignore-certificate-errors', ...extraArgs] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  if (seed) await ctx.addCookies([{ name: 'fz_id', value: FZ, domain: '.fiezel.my.id', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
  const page = await ctx.newPage();
  await page.addInitScript(INIT, { cfg: { enabled: true, base: BRIDGE, endpoints: { ...OFF, ...endpoints } }, bridge: BRIDGE });
  await page.goto(`https://${APP_HOST}/`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(waitMs);
  const out = [];
  for (let i = 0; i < hops; i += 1) out.push(await page.evaluate(ms => window.__CALL('/api/quota', ms), 8000));
  const st = await page.evaluate(() => ({ state: window.__STATE(), log: window.__F6.log }));
  console.log('===', name, JSON.stringify({ hops: out, quotaMode: st.state && st.state.quota, cfStatus: st.state && st.state.st.status, reason: st.state && st.state.st.reason, log: st.log }));
  await browser.close();
}

try {
  await variant('A1 D-persis', { endpoints: { quota: 'on' }, seed: true, waitMs: 3500 });
  await variant('A2 D-persis ulang', { endpoints: { quota: 'on' }, seed: true, waitMs: 3500 });
  await variant('B1 D-persis + QUIC mati', { endpoints: { quota: 'on' }, seed: true, waitMs: 3500, extraArgs: ['--disable-quic'] });
  await variant('B2 D-persis + QUIC mati ulang', { endpoints: { quota: 'on' }, seed: true, waitMs: 3500, extraArgs: ['--disable-quic'] });
} finally { await new Promise(r => server.close(r)); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {} }
