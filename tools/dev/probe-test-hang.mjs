import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, rel.replace(/^\/+/, ''));
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200); res.end(buf);
  });
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  const todayWib = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  await context.addInitScript(({ todayWib }) => {
    localStorage.setItem('fiezel-splash-seen-v1', todayWib);
    sessionStorage.setItem('fiezel-launch-session-v1', '1');
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, role: 'murid', at: Date.now() }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), name: 'Budi' }));
    localStorage.setItem('fiezel-learner-name-v1', 'Budi');
  }, { todayWib });

  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__timings = [];
    window.__splashHideStack = null;
    const t0 = performance.now();

    // Hook window.__fiezelBootSplash or DOM
    document.addEventListener('DOMContentLoaded', () => {
      const splash = document.getElementById('fiezelBootSplash');
      if (splash) {
        const obs = new MutationObserver(() => {
          if (splash.style.display === 'none' || !splash.parentNode) {
            if (!window.__splashHideStack) {
              window.__splashHideStack = new Error('SPLASH HIDDEN AT t=' + Math.round(performance.now() - t0)).stack;
            }
          }
        });
        obs.observe(splash, { attributes: true, attributeFilter: ['style', 'class'] });
        if (splash.parentNode) {
          obs.observe(splash.parentNode, { childList: true });
        }
      }
    });

    const interval = setInterval(() => {
      const now = performance.now();
      const splash = document.getElementById('fiezelBootSplash');
      const inDom = !!splash;
      const hasParent = !!(splash && splash.parentNode);
      const inlineDisplay = splash ? splash.style.display : 'no_el';
      const computedDisplay = splash ? window.getComputedStyle(splash).display : 'no_el';
      const splashVisible = inDom && hasParent && inlineDisplay !== 'none' && computedDisplay !== 'none';
      const app = document.getElementById('app');
      const appChildren = app ? app.children.length : 0;
      window.__timings.push({
        t: Math.round(now - t0),
        splashVisible,
        inDom,
        hasParent,
        inlineDisplay,
        computedDisplay,
        appChildren
      });
      if (appChildren > 0 && now - t0 > 4000) clearInterval(interval);
    }, 50);
  });

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(4000);

  const timings = await page.evaluate(() => window.__timings);
  const firstSplashHidden = timings.find(x => !x.splashVisible);
  const firstAppRender = timings.find(x => x.appChildren > 0);
  console.log('TIMINGS ANALYSIS:');
  console.log('First Splash Hidden at:', firstSplashHidden);
  console.log('First App Rendered at:', firstAppRender);
  if (firstSplashHidden && firstAppRender) {
    console.log('BLANK SCREEN DURATION (ms):', firstAppRender.t - firstSplashHidden.t);
  }
  console.log('SPLASH HIDE STACK:', await page.evaluate(() => window.__splashHideStack));
  const dom = await page.evaluate(() => ({
    appHtml: document.getElementById('app')?.innerHTML?.slice(0, 200),
    authGateDisplay: window.getComputedStyle(document.getElementById('authGate') || document.body).display,
    authGateClass: document.getElementById('authGate')?.className,
    stateView: typeof state !== 'undefined' ? state?.view : 'no state',
    appOpened: typeof appOpened !== 'undefined' ? appOpened : 'no appOpened',
    splashDisplay: document.getElementById('fiezelBootSplash') ? window.getComputedStyle(document.getElementById('fiezelBootSplash')).display : 'none',
    splashDismissed: !!window.__fiezelBootSplashDismissed,
    authGateNeeded: typeof authGateNeeded === 'function' ? authGateNeeded() : 'no fn',
    bootAuthVerdict: typeof bootAuthVerdict === 'function' ? bootAuthVerdict() : 'no fn',
    bootAuthVerdictValue: typeof bootAuthVerdictValue !== 'undefined' ? bootAuthVerdictValue : 'no val'
  }));
  console.log('DOM RESULT:', dom);

  await browser.close();
  server.close();
})();
