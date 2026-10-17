import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pw = require('playwright');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

const NET_SLOW4G = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8
};

function createServer() {
  const gzCache = new Map();
  return http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.join(ROOT, rel.replace(/^\/+/, ''));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      const headers = { 'content-type': type, 'cache-control': 'no-cache' };
      if (/text|json|svg|javascript/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
        let gz = gzCache.get(file);
        if (!gz) { gz = zlib.gzipSync(buf, { level: 6 }); gzCache.set(file, gz); }
        headers['content-encoding'] = 'gzip';
        res.writeHead(200, headers); res.end(gz); return;
      }
      res.writeHead(200, headers); res.end(buf);
    });
  });
}

(async () => {
  const server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;

  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', NET_SLOW4G);

  await page.addInitScript(() => {
    window.__cProbe = {
      marks: {},
      networkLog: [],
      fetchErrors: [],
      recoveryText: '',
      watchdogFiredAt: null
    };
    const now = () => performance.now();

    // Hook fetch
    const nativeFetch = window.fetch;
    window.fetch = function(...args) {
      const u = String(args[0] && args[0].url || args[0] || '');
      const t0 = now();
      return nativeFetch.apply(this, args).then(r => {
        window.__cProbe.networkLog.push({ url: u.split('/').pop(), status: r.status, ms: Math.round(now() - t0) });
        return r;
      }).catch(err => {
        window.__cProbe.fetchErrors.push({ url: u.split('/').pop(), err: err.message || String(err), ms: Math.round(now() - t0) });
        throw err;
      });
    };

    // Watchdog listener
    const check = setInterval(() => {
      if (window.__fiezelBootWatchdogFired && !window.__cProbe.watchdogFiredAt) {
        window.__cProbe.watchdogFiredAt = Math.round(now());
      }
      const rec = document.getElementById('fiezelBootRecovery');
      if (rec && !window.__cProbe.recoveryText) {
        window.__cProbe.recoveryText = rec.innerText || rec.textContent;
      }
    }, 100);
  });

  console.log('Navigating in Slow 4G + CPU 4x...');
  await page.goto(url, { waitUntil: 'commit' });

  // Wait up to 30s to see when watchdog fires and what happens
  await page.waitForTimeout(25000);

  const probeData = await page.evaluate(() => {
    const P = window.__cProbe;
    const doc = document;
    return {
      watchdogFired: !!window.__fiezelBootWatchdogFired,
      watchdogFiredAt: P.watchdogFiredAt,
      recoveryInDom: !!doc.getElementById('fiezelBootRecovery'),
      recoveryText: P.recoveryText,
      splashInDom: !!doc.getElementById('fiezelBootSplash'),
      splashClaimed: doc.getElementById('fiezelBootSplash')?.getAttribute('data-fiezel-boot-claimed') || null,
      authInDom: !!doc.querySelector('.fz-auth'),
      homeInDom: !!doc.querySelector('.home-today, .home-page'),
      fetchErrors: P.fetchErrors,
      networkLogCount: P.networkLog.length,
      sampleFetches: P.networkLog.slice(0, 15)
    };
  });

  console.log('SLOW 4G DEEP AUDIT:');
  console.log(JSON.stringify(probeData, null, 2));

  await browser.close();
  server.close();
})();
