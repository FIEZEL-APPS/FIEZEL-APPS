// Server statis untuk pratinjau lokal FIEZEL (bukan produksi). Tanpa cache supaya perubahan langsung terlihat.
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

function readCurrentSwRev() {
  try {
    const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const m = swSrc.match(/const\s+SW_REV\s*=\s*['"]([^'"]+)['"]/);
    return m ? m[1] : 'dev-local';
  } catch {
    return 'dev-local';
  }
}

const DEV_CACHE_PURGE_SNIPPET = `<script>
(function(){
  try {
    if ('caches' in window) {
      caches.keys().then(function(keys){
        keys.forEach(function(k){
          if (k.indexOf('fiezel-shell-') === 0) caches.delete(k);
        });
      });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs){
        regs.forEach(function(r){ r.update(); });
      });
    }
  } catch (_) {}
})();
</script>`;

http.createServer((req, res) => {
  // 1. Reverse-proxy untuk endpoint /api/* ke Cloudflare API resmi (https://api.fiezel.my.id)
  // Menyuntikkan Origin: https://fiezel.my.id agar token sesi Gemini Live & TTS dapat diterbitkan tanpa CORS forbidden_origin
  if (req.url && req.url.startsWith('/api/')) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      return res.end();
    }
    const targetUrl = new URL(req.url, 'https://api.fiezel.my.id');
    const proxyHeaders = {
      ...req.headers,
      host: 'api.fiezel.my.id',
      origin: 'https://fiezel.my.id',
      referer: 'https://fiezel.my.id/',
    };
    delete proxyHeaders['content-length'];

    const proxyReq = https.request(targetUrl, {
      method: req.method,
      headers: proxyHeaders,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*',
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.warn('[preview-server proxy error]:', err?.message);
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: false, error: 'proxy_failed', message: err?.message }));
    });

    req.pipe(proxyReq);
    return;
  }

  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  // 2. Di server pratinjau lokal, pastikan /sw.js selalu network-first & membersihkan SHELL_CACHE basi
  if (urlPath === '/sw.js') {
    const swRev = readCurrentSwRev();
    const devSw = `// FIEZEL Local Preview Dev Service Worker (Zero-Stale-Cache)
const SW_REV = ${JSON.stringify(swRev)};
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('fiezel-shell-')).map(k => caches.delete(k)));
    } catch (_) {}
    await self.clients.claim();
  })());
});
self.addEventListener('message', (event) => {
  if (event?.data?.type === 'FIEZEL_SKIP_WAITING') { self.skipWaiting(); return; }
  if (event?.data?.type === 'FIEZEL_HEALTH_PING') {
    const reply = { type: 'FIEZEL_HEALTH_PONG', swRev: SW_REV };
    if (event.ports && event.ports[0]) event.ports[0].postMessage(reply);
    else event.source?.postMessage?.(reply);
  }
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)));
});
`;
    res.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Service-Worker-Allowed': '/',
    });
    return res.end(devSw);
  }

  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Service-Worker-Allowed': '/',
    };
    if (ext === '.html') {
      fs.readFile(file, 'utf8', (readErr, html) => {
        if (readErr) { res.writeHead(500); return res.end('read error'); }
        const injected = html.includes('</head>')
          ? html.replace('</head>', `${DEV_CACHE_PURGE_SNIPPET}\n</head>`)
          : `${DEV_CACHE_PURGE_SNIPPET}\n${html}`;
        res.writeHead(200, headers);
        res.end(injected);
      });
      return;
    }
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, '0.0.0.0', () => console.log('FIEZEL preview on http://0.0.0.0:' + PORT));
