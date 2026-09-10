/* F6 — matriks: apa yang membuat `GET /api/quota` dari Chromium tidak pernah dijawab.
 * Halaman kosong di origin https://fiezel.my.id (host-resolver ke server loopback), tanpa
 * aplikasi FIEZEL sama sekali: jadi yang teruji transport browser, bukan kode aplikasi. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { spawnSync } from 'node:child_process';

const BRIDGE = 'https://api.fiezel.my.id';
const APP_HOST = 'fiezel.my.id';
const FZ = fs.readFileSync('/tmp/fzid.txt', 'utf8').trim();
const { chromium } = await import('playwright');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'f6m-'));
const k = path.join(tmp, 'k.pem'), c = path.join(tmp, 'c.pem');
spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', k, '-out', c, '-days', '2', '-subj', `/CN=${APP_HOST}`, '-addext', `subjectAltName=DNS:${APP_HOST},IP:127.0.0.1`]);
const server = https.createServer({ key: fs.readFileSync(k), cert: fs.readFileSync(c) }, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end('<!doctype html><title>f6</title><p>kosong');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const cases = [
  { nama: 'quota + credentials=include + cookie', path: '/api/quota', creds: 'include', seed: true },
  { nama: 'quota + credentials=omit + cookie di jar', path: '/api/quota', creds: 'omit', seed: true },
  { nama: 'quota + credentials=include TANPA cookie', path: '/api/quota', creds: 'include', seed: false },
  { nama: 'config + credentials=include + cookie', path: '/api/config', creds: 'include', seed: true },
  { nama: 'auth/anon POST lalu quota include (cookie dari server sendiri)', path: '/api/quota', creds: 'include', seed: false, anonFirst: true }
];

for (const kasus of cases) {
  const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${APP_HOST}:443 127.0.0.1:${port}`, '--ignore-certificate-errors'] });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  if (kasus.seed) await ctx.addCookies([{ name: 'fz_id', value: FZ, domain: '.fiezel.my.id', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
  const page = await ctx.newPage();
  const ev = [];
  page.on('response', r => { if (r.url().startsWith(BRIDGE)) ev.push('response ' + r.status() + ' ' + r.url().replace(BRIDGE, '')); });
  page.on('requestfailed', r => { if (r.url().startsWith(BRIDGE)) ev.push('requestfailed ' + (r.failure()?.errorText || '') + ' ' + r.url().replace(BRIDGE, '')); });
  page.on('requestfinished', r => { if (r.url().startsWith(BRIDGE)) ev.push('requestfinished ' + r.url().replace(BRIDGE, '')); });
  await page.goto(`https://${APP_HOST}/`, { waitUntil: 'domcontentloaded' });
  if (kasus.anonFirst) {
    const a = await page.evaluate(async b => {
      try { const r = await fetch(b + '/api/auth/anon', { method: 'POST', credentials: 'include', mode: 'cors', cache: 'no-store' }); return { status: r.status }; } catch (e) { return { err: String(e.message) }; }
    }, BRIDGE);
    ev.push('anon ' + JSON.stringify(a));
  }
  const out = await page.evaluate(async ([b, p, creds]) => {
    const t0 = Date.now();
    try {
      const r = await fetch(b + p, { credentials: creds, mode: 'cors', cache: 'no-store' });
      const head = Date.now() - t0;
      let bodyMs = -1, len = -1;
      try { const txt = await r.text(); bodyMs = Date.now() - t0; len = txt.length; } catch (e) { bodyMs = -2; }
      return { status: r.status, headerMs: head, bodyMs, len, ce: r.headers.get('content-encoding') || '' };
    } catch (e) { return { err: String(e.name) + ':' + String(e.message), ms: Date.now() - t0 }; }
  }, [BRIDGE, kasus.path, kasus.creds]).catch(e => ({ evalErr: String(e.message).slice(0, 120) }));
  console.log('===', kasus.nama, JSON.stringify(out), '|', ev.join(' ; '));
  await browser.close();
}
await new Promise(r => server.close(r));
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* temp */ }
