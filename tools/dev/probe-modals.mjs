import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: 'block'
  });

  await ctx.route('**/*', async route => {
    const u = new URL(route.request().url());
    let pathname = decodeURIComponent(u.pathname);
    if (pathname.startsWith('/app/')) pathname = pathname.slice(4);
    if (pathname.startsWith('/')) pathname = pathname.slice(1);
    if (!pathname || pathname === 'index.html') pathname = 'index.html';

    const p = path.resolve(ROOT, pathname);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      const ext = path.extname(p).toLowerCase();
      const contentTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml'
      };
      return route.fulfill({
        status: 200,
        contentType: contentTypes[ext] || 'application/octet-stream',
        body: fs.readFileSync(p)
      });
    }

    if (u.pathname.includes('/api/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: [] }) });
    }
    if (u.pathname.includes('fiezel-mochi.js')) {
      const alt = path.resolve(ROOT, 'mochi-mascot', 'fiezel-mochi.js');
      if (fs.existsSync(alt)) {
        return route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(alt) });
      }
    }
    return route.fulfill({ status: 204, body: '' });
  });

  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/index.html?teacher=preview');
  await page.waitForTimeout(1500);

  const modalKinds = [
    'assign',
    'new-class',
    'add-students',
    'import-code',
    'board',
    'analisis-butir',
    'rapor-kktp',
    'paper-scores',
    'warmup'
  ];

  for (const mKind of modalKinds) {
    console.log('Testing real modal open for:', mKind);
    await page.evaluate(kind => {
      const root = document.querySelector('#fzTeacherShell') || document.body;
      const store = window.FiezelTeacherStore?.load?.() || {};
      const cls = store.classes?.[0] || null;
      const asgId = cls?.assignments?.[0]?.id || 'asg-demo';
      const stId = cls?.students?.[0]?.id || 'stu-demo';

      const btn = document.createElement('button');
      btn.setAttribute('data-tg', 'modal');
      btn.setAttribute('data-kind', kind);
      btn.setAttribute('data-id', kind.includes('assign') || kind === 'analisis-butir' || kind === 'paper-scores' ? asgId : stId);
      btn.setAttribute('data-target', stId);
      root.appendChild(btn);
      btn.click();
      btn.remove();
    }, mKind);

    await page.waitForTimeout(500);
    const isOpen = await page.evaluate(() => {
      const modal = document.querySelector('.tg-modal, .tg-board');
      return modal ? { visible: modal.offsetParent !== null, cls: modal.className, text: modal.innerText.slice(0, 100) } : null;
    });
    console.log(`Modal ${mKind} status:`, isOpen);
    await page.screenshot({ path: `reports/dashboard-guru-audit/real-modal-${mKind}.png` });

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('[data-tg="close"], .tg-modal-close, [data-tg="modal-close"]');
      if (closeBtn) closeBtn.click();
      else {
        const escEv = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true });
        document.dispatchEvent(escEv);
      }
    });
    await page.waitForTimeout(200);
  }

  await browser.close();
}

run().catch(console.error);
