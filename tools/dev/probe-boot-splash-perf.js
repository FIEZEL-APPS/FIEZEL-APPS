#!/usr/bin/env node
/**
 * probe-boot-splash-perf.js — alat ukur boot + splash di profil HP (BUKAN gerbang CI).
 *
 * Dipakai untuk reports/AUDIT-PERFORMA-BOOT-SPLASH-2026-10-11.md. Menyalakan server statis
 * ber-gzip sendiri dari akar repo, lalu memuat aplikasi di Chromium Playwright dengan layar
 * 390x844 DPR 3 dan CPU yang diperlambat, dan mencatat:
 *   - kapan splash frame-pertama tercat (FCP), kapan animasinya benar-benar mulai
 *     (`data-fiezel-boot-claimed="shown"`), dan kapan ia lepas dari DOM;
 *   - frame rAF pada fase "splash diam" (FCP -> animasi mulai) dan fase animasi;
 *   - long task dan waktu tiba/terurai setiap fetch JSON.
 *
 * Pemakaian (dari akar repo):
 *   node tools/dev/probe-boot-splash-perf.js [mode] [cpu] [net]
 *     mode : warm  (default) SW terpasang + cangkang ter-cache, sesi baru = peluncuran dingin PWA
 *            cold  kunjungan pertama, cache kosong
 *            local SW diblokir, tanpa jaringan lambat (untuk A/B CSS lewat VARIANT)
 *     cpu  : faktor perlambatan CPU (4 = HP menengah, 6 = HP murah). Default 4.
 *     net  : none | fast4g | slow4g. Default none.
 *   env VARIANT=nofeaturecss|nocss  (hanya mode local) buang stylesheet fitur / semua stylesheet.
 *   env SWBUMP=1                    (hanya mode warm) sajikan sw.js dengan SW_REV lain sesudah
 *                                   pemanasan, meniru murid yang membuka app tepat sesudah rilis.
 *   env TRACE=path.json             rekam trace Chromium untuk atribusi per berkas.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const pw = (() => {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright']) {
    try { return require(id); } catch (_) {}
  }
  return null;
})();
if (!pw) { console.error('playwright tidak ditemukan'); process.exit(2); }

const ROOT = path.resolve(__dirname, '..', '..');
const mode = process.argv[2] || 'warm';
const cpu = Number(process.argv[3] || 4);
const net = process.argv[4] || 'none';
const VARIANT = process.env.VARIANT || '';
const NETS = {
  none: null,
  slow4g: { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 },
  fast4g: { offline: false, latency: 60, downloadThroughput: 9 * 1024 * 1024 / 8, uploadThroughput: 1.5 * 1024 * 1024 / 8 }
};
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg'
};

let swBump = false;
const gzCache = new Map();
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, rel.replace(/^\/+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const isSw = /[\\/]sw\.js$/.test(file);
    if (isSw && swBump) buf = Buffer.from(buf.toString('utf8').replace("const SW_REV='", "const SW_REV='bump-"));
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = { 'content-type': type, 'cache-control': 'no-cache' };
    if (/text|json|svg|javascript/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
      let gz = isSw ? null : gzCache.get(file);
      if (!gz) { gz = zlib.gzipSync(buf, { level: 6 }); if (!isSw) gzCache.set(file, gz); }
      headers['content-encoding'] = 'gzip';
      res.writeHead(200, headers); res.end(gz); return;
    }
    res.writeHead(200, headers); res.end(buf);
  });
});

/* Dijalankan di halaman sebelum skrip apa pun. */
function pageProbe() {
  const P = window.__probe = { frames: [], longtasks: [], marks: {}, fetches: [] };
  const now = () => performance.now();
  let last = 0;
  (function raf(t) {
    if (t) { if (last) P.frames.push([last, t - last]); last = t; }
    if (!P.marks.splashGone || last < P.marks.splashGone + 1500) requestAnimationFrame(raf);
  })();
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) P.longtasks.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch (_) {}
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') P.marks.fcp = e.startTime; }).observe({ type: 'paint', buffered: true }); } catch (_) {}
  document.addEventListener('DOMContentLoaded', () => { P.marks.dcl = now(); });
  new MutationObserver(() => {
    const el = document.getElementById('fiezelBootSplash');
    if (el && !P.marks.splashInDom) P.marks.splashInDom = now();
    if (el && el.getAttribute('data-fiezel-boot-claimed') === 'shown' && !P.marks.splashShow) P.marks.splashShow = now();
    if (P.marks.splashInDom && !el && !P.marks.splashGone) P.marks.splashGone = now();
    const sp2 = document.querySelector('.fiezel-splash:not(#fiezelBootSplash)');
    if (sp2 && !P.marks.secondSplash) P.marks.secondSplash = now();
    const app = document.getElementById('app');
    if (app && app.children.length && !P.marks.appFilled) P.marks.appFilled = now();
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-fiezel-boot-claimed'] });
  const nativeFetch = window.fetch;
  window.fetch = function (input) {
    const url = String((input && input.url) || input);
    const t0 = now();
    return nativeFetch.apply(this, arguments).then(r => {
      const headersAt = now();
      if (/\.json/.test(url) && r && typeof r.json === 'function') {
        const json = r.json.bind(r);
        r.json = () => json().then(v => { P.fetches.push({ url: url.replace(/^https?:\/\/[^/]+\//, '').split('?')[0], start: t0, headersAt, parsedAt: now() }); return v; });
      }
      return r;
    });
  };
}

function frameStats(frames) {
  if (!frames.length) return null;
  const d = frames.map(f => f[1]);
  const total = d.reduce((a, b) => a + b, 0);
  return { frames: frames.length, fps: +(frames.length / (total / 1000)).toFixed(1), maxGapMs: Math.round(Math.max(...d)),
    gapsOver100ms: d.filter(x => x > 100).length, frozenMs: Math.round(d.filter(x => x > 50).reduce((a, b) => a + b, 0)) };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const BASE = `http://127.0.0.1:${server.address().port}/`;
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({
    serviceWorkers: mode === 'local' ? 'block' : 'allow',
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true
  });
  let page = await ctx.newPage();
  if (mode === 'warm') {
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForFunction(async () => (await caches.keys()).some(k => k.startsWith('fiezel-shell-')), null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(4000);
    await page.close();
    if (process.env.SWBUMP) swBump = true;
    page = await ctx.newPage(); // tab baru = sessionStorage baru = peluncuran dingin (splash dipaksa)
  }
  if (mode === 'local' && VARIANT) {
    await page.route(BASE, async route => {
      const resp = await route.fetch();
      let html = await resp.text();
      html = html.replace(/<link rel="stylesheet" href="\.\/[^"]+\.css">/g, '');
      if (VARIANT === 'nocss') html = html.replace(/<link rel="preload" as="style" href="\.\/style\.css"[^>]*>/, '');
      route.fulfill({ response: resp, body: html, headers: { ...resp.headers(), 'content-encoding': 'identity' } });
    });
  }
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  if (NETS[net]) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', NETS[net]); }
  await page.addInitScript(pageProbe);
  if (process.env.TRACE) await browser.startTracing(page, { path: process.env.TRACE, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute', 'loading', 'disabled-by-default-v8.cpu_profiler'] });
  await page.goto(BASE, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__probe && window.__probe.marks.splashGone, null, { timeout: 120000, polling: 250 })
    .catch(() => console.error('splash tidak pernah lepas dalam 120 detik'));
  await page.waitForTimeout(1600);
  if (process.env.TRACE) await browser.stopTracing();
  const P = await page.evaluate(() => window.__probe);
  const m = P.marks;
  const inWin = (a, b) => P.frames.filter(f => f[0] >= a && f[0] < b);
  const lt = (a, b) => P.longtasks.filter(x => x[0] >= a && x[0] < b);
  const show = m.splashShow || m.secondSplash || 0;
  console.log(JSON.stringify({
    mode, cpu, net, variant: VARIANT, swBump,
    marks: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v)])),
    staticSplash: { ms: Math.round(show - (m.fcp || 0)), frames: frameStats(inWin(m.fcp || 0, show)),
      longtaskMs: Math.round(lt(0, show).reduce((s, x) => s + x[1], 0)) },
    animation: { ms: Math.round((m.splashGone || 0) - show), frames: frameStats(inWin(show, m.splashGone || 0)),
      longtasks: lt(show, m.splashGone || 0).map(x => [Math.round(x[0]), Math.round(x[1])]) },
    longestTasks: [...P.longtasks].sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => [Math.round(x[0]), Math.round(x[1])]),
    jsonFetches: P.fetches.map(f => ({ url: f.url, start: Math.round(f.start), headersAt: Math.round(f.headersAt), parsedAt: Math.round(f.parsedAt) }))
  }, null, 1));
  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
