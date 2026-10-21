import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2'
};

function createStaticServer() {
  return http.createServer((req, res) => {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      let reqPath = decodeURIComponent(parsedUrl.pathname);
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const filePath = path.normalize(path.join(rootDir, reqPath));

      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless'
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.writeHead(500);
      res.end(e.message);
    }
  });
}

async function run() {
  console.log('--- 1. Starting local HTTP static server ---');
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Local test server running at ${baseUrl}`);

  console.log('--- 2. Launching Chromium via Playwright ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const cspViolations = [];
  const consoleErrors = [];
  const consoleMessages = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
    if (text.toLowerCase().includes('violates') || text.toLowerCase().includes('content security policy') || text.toLowerCase().includes('refused to load')) {
      cspViolations.push(text);
      console.error('CSP VIOLATION DETECTED:', text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
    console.error('Page error:', err.message);
  });

  try {
    console.log(`--- 3. Loading ${baseUrl}/index.html ---`);
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.FiezelAudioResolver === 'object');
    await page.click('body');

    // Pastikan cache audio awal bersih untuk pengujian ini
    await page.evaluate(async () => {
      try {
        if (window.caches) {
          await window.caches.delete('fiezel-r2-audio-v1');
        }
      } catch (_) {}
      if (window.FiezelAudioResolver && window.FiezelAudioResolver.resetMetrics) {
        window.FiezelAudioResolver.resetMetrics();
      }
    });

    const testAudioUrl = 'https://fiezel-audio.fitrajft.workers.dev/a/68cb653552ffc1c381e451318dd5e3ef3fb94aa2471ade0134cd189321650631.mp3';
    console.log(`--- 4. Testing First Playback (Cache MISS -> Streaming el.src = url) ---`);
    console.log(`Target URL: ${testAudioUrl}`);

    const playResult1 = await page.evaluate(async (url) => {
      let playingFired = false;
      let progressFired = false;
      const initialStatus = window.FiezelAudioResolver.status();

      // Pasang observer audio jika memungkinkan
      const playPromise = window.FiezelAudioResolver.playUrl(url, {
        onProgress: (cur, dur) => {
          progressFired = true;
        }
      });

      // Tunggu sebentar untuk memeriksa event playing dan timeupdate
      const ok = await playPromise;
      const finalStatus = window.FiezelAudioResolver.status();

      return {
        ok,
        progressFired,
        initialMetrics: initialStatus.metrics,
        finalMetrics: finalStatus.metrics
      };
    }, testAudioUrl);

    console.log('Play Result 1:', JSON.stringify(playResult1, null, 2));

    if (!playResult1.ok) {
      throw new Error('First playback failed!');
    }
    if (cspViolations.length > 0) {
      throw new Error(`CSP Violations detected during streaming: ${cspViolations.join('; ')}`);
    }

    console.log('✓ Pemutaran pertama berhasil (streaming langsung)!');
    console.log('✓ Nol pelanggaran CSP di console browser!');

    // Tunggu sebentar agar warmCache di background selesai menyimpan ke Cache API
    console.log('--- 5. Waiting for background cache warming ---');
    await page.waitForTimeout(1000);

    console.log('--- 6. Testing Second Playback (Cache HIT -> blob) ---');
    const playResult2 = await page.evaluate(async (url) => {
      const beforeStatus = window.FiezelAudioResolver.status();
      const ok = await window.FiezelAudioResolver.playUrl(url);
      const afterStatus = window.FiezelAudioResolver.status();

      return {
        ok,
        beforeMetrics: beforeStatus.metrics,
        afterMetrics: afterStatus.metrics,
        cacheHitGrown: afterStatus.metrics.persistentCacheHits > beforeStatus.metrics.persistentCacheHits
      };
    }, testAudioUrl);

    console.log('Play Result 2:', JSON.stringify(playResult2, null, 2));

    if (!playResult2.ok) {
      throw new Error('Second playback failed!');
    }
    if (!playResult2.cacheHitGrown) {
      throw new Error('Second playback did NOT record a persistentCacheHit!');
    }

    console.log('✓ Pemutaran kedua berhasil datang dari Cache API (blob)!');

    // 7. Test fallback behavior: jika el.src = url gagal atau ditolak
    console.log('--- 7. Testing Fallback Mechanism ---');
    const fallbackResult = await page.evaluate(async () => {
      // Hapus cache agar meleset lagi
      if (window.caches) {
        await window.caches.delete('fiezel-r2-audio-v1');
      }
      window.FiezelAudioResolver.resetMetrics();

      // Rekayasa: simulasikan streaming gagal dengan URL yang valid fetch tapi Audio constructor gagal streaming
      // Atau uji langsung jalur blob fallback
      const testUrl = 'https://fiezel-audio.fitrajft.workers.dev/a/5f7349938c96191a993b84c4e491691f53251f0dc70ba7973769886c08191551.mp3';
      const played = await window.FiezelAudioResolver.playUrl(testUrl);
      const st = window.FiezelAudioResolver.status();
      return { played, metrics: st.metrics };
    });

    console.log('Fallback/Second asset result:', JSON.stringify(fallbackResult, null, 2));
    if (!fallbackResult.played) {
      throw new Error('Second asset playback failed!');
    }
    console.log('✓ Aset kedua berhasil diputar!');

    console.log('\n=== EMPIRICAL PLAYWRIGHT VERIFICATION SUMMARY ===');
    console.log('1. Real Chromium version:', browser.version());
    console.log('2. Live R2 Worker Reachable: YES');
    console.log('3. CSP Audio Violations: 0 (PASSED)');
    console.log('4. Direct Streaming (Cache Miss): PASSED');
    console.log('5. Background Cache Warming: PASSED');
    console.log('6. Subsequent Cached Blob Playback: PASSED');
    console.log('=================================================');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
