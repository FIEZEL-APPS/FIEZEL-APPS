import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pw = (() => {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright']) {
    try { return require(id); } catch (_) {}
  }
  return null;
})();
if (!pw) {
  console.error('Playwright not found');
  process.exit(2);
}

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

const NETS = {
  none: null,
  slow4g: { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
  fast4g: { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 }
};

function createStaticServer() {
  const gzCache = new Map();
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.join(ROOT, rel.replace(/^\/+/, ''));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404);
        res.end('not found: ' + rel);
        return;
      }
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      const headers = { 'content-type': type, 'cache-control': 'no-cache' };
      if (/text|json|svg|javascript/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
        let gz = gzCache.get(file);
        if (!gz) {
          gz = zlib.gzipSync(buf, { level: 6 });
          gzCache.set(file, gz);
        }
        headers['content-encoding'] = 'gzip';
        res.writeHead(200, headers);
        res.end(gz);
        return;
      }
      res.writeHead(200, headers);
      res.end(buf);
    });
  });
  return server;
}

// Injected into the page before ANY script runs
function pageProbeScript() {
  const P = window.__auditProbe = {
    events: [],
    errors: [],
    warnings: [],
    marks: {},
    longtasks: [],
    sfxCalls: [],
    domLog: []
  };

  const now = () => performance.now();
  const recordEvent = (type, detail) => {
    P.events.push({ t: Math.round(now()), type, detail });
  };

  window.addEventListener('error', (e) => {
    P.errors.push({ t: Math.round(now()), msg: e.message || String(e), filename: e.filename, lineno: e.lineno });
  });
  window.addEventListener('unhandledrejection', (e) => {
    P.errors.push({ t: Math.round(now()), type: 'unhandledrejection', reason: String(e.reason && e.reason.message || e.reason) });
  });

  const origError = console.error;
  console.error = function(...args) {
    P.errors.push({ t: Math.round(now()), args: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') });
    return origError.apply(this, args);
  };
  const origWarn = console.warn;
  console.warn = function(...args) {
    P.warnings.push({ t: Math.round(now()), args: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') });
    return origWarn.apply(this, args);
  };

  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.name === 'first-contentful-paint') {
          P.marks.fcp = Math.round(e.startTime);
          recordEvent('fcp', { fcp: P.marks.fcp });
        }
      }
    }).observe({ type: 'paint', buffered: true });
  } catch (_) {}

  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        P.longtasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch (_) {}

  document.addEventListener('DOMContentLoaded', () => {
    P.marks.dcl = Math.round(now());
    recordEvent('dcl', { dcl: P.marks.dcl });
  });

  window.addEventListener('load', () => {
    P.marks.load = Math.round(now());
    recordEvent('load', { load: P.marks.load });
  });

  // Watch DOM mutations for splash, recovery, auth, and onboarding
  const obs = new MutationObserver(() => {
    const splash = document.getElementById('fiezelBootSplash');
    if (splash) {
      if (!P.marks.splashFound) {
        P.marks.splashFound = Math.round(now());
        recordEvent('splash_found', {
          claimed: splash.getAttribute('data-fiezel-boot-claimed'),
          className: splash.className
        });
      }
      const claimed = splash.getAttribute('data-fiezel-boot-claimed');
      if (claimed === 'shown' && !P.marks.splashClaimed) {
        P.marks.splashClaimed = Math.round(now());
        recordEvent('splash_claimed', { t: P.marks.splashClaimed });
      }
      if (claimed === 'disposed' && !P.marks.splashDisposed) {
        P.marks.splashDisposed = Math.round(now());
        recordEvent('splash_disposed', { t: P.marks.splashDisposed });
      }
      if (splash.classList.contains('is-leaving') && !P.marks.splashLeaving) {
        P.marks.splashLeaving = Math.round(now());
        recordEvent('splash_leaving', { t: P.marks.splashLeaving });
      }
    } else {
      if (P.marks.splashFound && !P.marks.splashGone) {
        P.marks.splashGone = Math.round(now());
        recordEvent('splash_gone', { t: P.marks.splashGone });
      }
    }

    const rec = document.getElementById('fiezelBootRecovery');
    if (rec && !P.marks.recoveryShown) {
      P.marks.recoveryShown = Math.round(now());
      recordEvent('recovery_shown', { t: P.marks.recoveryShown });
    }

    const auth = document.querySelector('.fz-auth, [data-testid="auth-screen"]');
    if (auth && !P.marks.authShown) {
      P.marks.authShown = Math.round(now());
      recordEvent('auth_shown', { t: P.marks.authShown });
    }

    const ob = document.querySelector('.fiezel-ob');
    if (ob && !P.marks.onboardingShown) {
      P.marks.onboardingShown = Math.round(now());
      recordEvent('onboarding_shown', { t: P.marks.onboardingShown });
    }

    const app = document.getElementById('app');
    if (app && app.children.length > 0 && !P.marks.appPopulated) {
      P.marks.appPopulated = Math.round(now());
      recordEvent('app_populated', { t: P.marks.appPopulated });
    }
  });

  obs.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-fiezel-boot-claimed', 'class'] });

  // Hook SFX if available
  let sfxHooked = false;
  const sfxCheck = setInterval(() => {
    if (window.FiezelUiSfx && !sfxHooked) {
      sfxHooked = true;
      clearInterval(sfxCheck);
      const origPlay = window.FiezelUiSfx.play;
      const origPlayOnce = window.FiezelUiSfx.playOnce;
      if (origPlay) {
        window.FiezelUiSfx.play = function(name, ...args) {
          P.sfxCalls.push({ t: Math.round(now()), fn: 'play', sound: name });
          return origPlay.apply(this, [name, ...args]);
        };
      }
      if (origPlayOnce) {
        window.FiezelUiSfx.playOnce = function(name, ...args) {
          P.sfxCalls.push({ t: Math.round(now()), fn: 'playOnce', sound: name });
          return origPlayOnce.apply(this, [name, ...args]);
        };
      }
    }
  }, 20);
}

async function runScenario({ serverUrl, name, storageSetup, cpuRate, networkKey, prefersReducedMotion, timeoutMs = 25000 }) {
  console.log(`\n======================================================`);
  console.log(`[TEST RUN] Starting ${name}...`);
  console.log(`Config: CPU Throttle=${cpuRate}x, Net=${networkKey}, ReducedMotion=${!!prefersReducedMotion}`);
  console.log(`======================================================`);

  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    reducedMotion: prefersReducedMotion ? 'reduce' : 'no-preference'
  });

  // Pre-seed storage before navigation if specified
  if (storageSetup) {
    await context.addInitScript(storageSetup);
  }

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  if (cpuRate > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  }

  if (NETS[networkKey]) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', NETS[networkKey]);
  }

  await page.addInitScript(pageProbeScript);

  const tStart = Date.now();
  try {
    await page.goto(serverUrl, { waitUntil: 'commit', timeout: timeoutMs });
  } catch (err) {
    console.error(`Page goto error in ${name}:`, err.message);
  }

  // Wait for either splashGone or authShown or recoveryShown or timeout
  const waitTimeout = timeoutMs;
  await page.waitForFunction(() => {
    const P = window.__auditProbe;
    if (!P) return false;
    return !!(P.marks.splashGone || P.marks.recoveryShown || P.marks.authShown || P.marks.onboardingShown);
  }, null, { timeout: waitTimeout, polling: 100 }).catch(() => {
    console.log(`[TIMEOUT] Wait reached in ${name}`);
  });

  // Extra settle time to observe DOM and remaining events
  await page.waitForTimeout(2000);

  // Collect final audit inspection from page
  const result = await page.evaluate(() => {
    const P = window.__auditProbe || {};
    const doc = document;
    const splashEl = doc.getElementById('fiezelBootSplash');
    const recoveryEl = doc.getElementById('fiezelBootRecovery');
    const authEl = doc.querySelector('.fz-auth, [data-testid="auth-screen"]');
    const obEl = doc.querySelector('.fiezel-ob');
    const htmlBooting = doc.documentElement.classList.contains('fz-booting');
    const bodyBooting = doc.body.classList.contains('fz-booting');
    const allSplashes = Array.from(doc.querySelectorAll('.fiezel-splash')).map(el => ({
      id: el.id,
      className: el.className,
      claimed: el.getAttribute('data-fiezel-boot-claimed')
    }));

    return {
      marks: P.marks || {},
      events: P.events || [],
      errors: P.errors || [],
      warnings: P.warnings || [],
      sfxCalls: P.sfxCalls || [],
      longtasksCount: (P.longtasks || []).length,
      longtasksTotalMs: (P.longtasks || []).reduce((acc, x) => acc + x.dur, 0),
      domState: {
        splashInDom: !!splashEl,
        splashClaimed: splashEl ? splashEl.getAttribute('data-fiezel-boot-claimed') : null,
        splashClasses: splashEl ? splashEl.className : null,
        recoveryInDom: !!recoveryEl,
        authInDom: !!authEl,
        authVisible: authEl ? (authEl.offsetWidth > 0 && authEl.offsetHeight > 0) : false,
        onboardingInDom: !!obEl,
        htmlBooting,
        bodyBooting,
        allSplashesCount: allSplashes.length,
        allSplashes,
        watchdogFired: !!window.__fiezelBootWatchdogFired,
        splashDismissed: !!window.__fiezelBootSplashDismissed
      }
    };
  });

  result.name = name;
  result.durationWallMs = Date.now() - tStart;

  await browser.close();
  return result;
}

(async () => {
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const serverUrl = `http://127.0.0.1:${port}/`;
  console.log(`Test server running at ${serverUrl}`);

  const results = {};

  // SKENARIO A: Cold launch pengguna baru (tanpa auth, storage bersih)
  results.scenarioA = await runScenario({
    serverUrl,
    name: 'Skenario A: Cold launch pengguna baru (Storage Bersih, CPU 1x, Net Normal)',
    storageSetup: () => {
      localStorage.clear();
      sessionStorage.clear();
    },
    cpuRate: 1,
    networkKey: 'none',
    prefersReducedMotion: false
  });

  // SKENARIO B: Warm launch / refresh halaman (sessionStorage terisi, seenToday true)
  // WIB Day key
  const todayWib = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  results.scenarioB = await runScenario({
    serverUrl,
    name: 'Skenario B: Warm launch / refresh (sessionStorage terisi, seenToday true)',
    storageSetup: `
      sessionStorage.setItem('fiezel-launch-session-v1', '1');
      localStorage.setItem('fiezel-splash-seen-v1', '${todayWib}');
      localStorage.setItem('fiezel-auth-token-v1', 'mock-user-session');
    `,
    cpuRate: 1,
    networkKey: 'none',
    prefersReducedMotion: false
  });

  // SKENARIO C: Simulasi koneksi lambat (Slow 4G + 4x CPU throttle)
  results.scenarioC = await runScenario({
    serverUrl,
    name: 'Skenario C: Koneksi lambat (Slow 4G + 4x CPU throttle)',
    storageSetup: () => {
      localStorage.clear();
      sessionStorage.clear();
    },
    cpuRate: 4,
    networkKey: 'slow4g',
    prefersReducedMotion: false,
    timeoutMs: 35000
  });

  // SKENARIO D: Mode prefers-reduced-motion
  results.scenarioD = await runScenario({
    serverUrl,
    name: 'Skenario D: prefers-reduced-motion (Cold launch)',
    storageSetup: () => {
      localStorage.clear();
      sessionStorage.clear();
    },
    cpuRate: 1,
    networkKey: 'none',
    prefersReducedMotion: true
  });

  server.close();

  // Print results summary
  console.log('\n\n======================================================');
  console.log('AUDIT EMPIRIS HASIL PENGUJIAN PLAYWRIGHT (SUMMARY)');
  console.log('======================================================\n');
  console.log(JSON.stringify(results, null, 2));

  // Save report JSON for deep analysis
  fs.writeFileSync(path.join(ROOT, 'tools', 'dev', 'empirical-audit-results.json'), JSON.stringify(results, null, 2));
  console.log('\nWrote full empirical report to tools/dev/empirical-audit-results.json');
})().catch((err) => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
