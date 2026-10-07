import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');

const ORIGIN = 'http://localhost:4173';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp'
};

async function loadPlaywright() {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return await import(id); } catch (_) {}
  }
  return null;
}

async function run() {
  const pw = await loadPlaywright();
  if (!pw) {
    console.error('Playwright not found');
    process.exit(1);
  }

  const browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });

  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
    } catch (_) {}
  });

  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.abort();
    const target = path.resolve(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, ''));
    if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      console.log('404 NOT FOUND:', url.pathname, 'target:', target, 'exists:', fs.existsSync(target));
      return route.fulfill({ status: 404, body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: MIME[path.extname(target)] || 'application/octet-stream',
      body: fs.readFileSync(target)
    });
  });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const debugState = await page.evaluate(() => {
    return {
      hasTranslations: typeof self.FiezelGrammarTranslations !== 'undefined',
      translationsCount: self.FiezelGrammarTranslations ? Object.keys(self.FiezelGrammarTranslations).length : 0,
      hasUpgrade: typeof self.FiezelGrammarUpgrade !== 'undefined',
      hasG: typeof G !== 'undefined'
    };
  });
  console.log('Debug state:', debugState);

  const result = await page.evaluate(() => {
    let q = null;
    for (const sk of Object.keys(G)) {
      for (let i = 0; i < G[sk].length; i++) {
        const candidate = makeGrammarTokenOrderQuestion(sk, G[sk][i], i, 'A1');
        if (candidate) {
          q = candidate;
          break;
        }
      }
      if (q) break;
    }
    return {
      hasTranslationsObj: !!self.FiezelGrammarTranslations,
      translationsCount: self.FiezelGrammarTranslations ? Object.keys(self.FiezelGrammarTranslations).length : 0,
      sampleTA001: self.FiezelGrammarTranslations?.['TA-001'],
      qInstruction: q?.instruction,
      qQuestion: q?.question,
      qTokens: q?.tokens,
      qSourceId: q?.sourceId,
      qObject: q
    };
  });

  console.log('Result from live browser:', JSON.stringify(result, null, 2));

  // Launch quiz and take screenshot
  await page.evaluate((targetQ) => {
    document.getElementById('fiezelBootSplash')?.remove();
    document.documentElement.classList.remove('fz-booting');
    document.querySelector('.fiezel-ob')?.remove();
    quizLoop({ type: 'grammar', count: 10, pool: [targetQ], factory: x => x, preserveOrder: true });
  }, result.qObject);

  await page.waitForTimeout(1000);
  const shotPath = path.join(ROOT, 'reports', 'audit-user-bugs', 'token-order-translation-live.png');
  fs.mkdirSync(path.dirname(shotPath), { recursive: true });
  await page.screenshot({ path: shotPath });
  console.log('Screenshot saved to:', shotPath);

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
