/**
 * A8 · pengambil bukti 390px. Sekali jalan, bukan gerbang CI (Playwright nggak tersedia di
 * runner). Selain memotret, ia MENGUKUR hal-hal yang diklaim di reports/add-a8-a11y.md
 * langsung dari DOM nyata: tinggi/lebar target sentuh, dan ketiadaan elemen <a>/<button> di
 * panel jatah. Hasil ukurnya dicetak supaya laporan nggak perlu percaya pada mata saja.
 */
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const dir = __dirname;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('file://' + path.join(dir, 'notice-harness.html'));
  await page.waitForSelector('body[data-ready="1"]');

  const ukur = await page.evaluate(() => {
    const out = { notices: [], plan: null, buttons: [] };
    document.querySelectorAll('[data-fz-notice]').forEach((n) => {
      out.notices.push({
        key: n.getAttribute('data-fz-notice'),
        role: n.getAttribute('role') || '',
        ariaLive: n.getAttribute('aria-live'),
        ariaAtomic: n.getAttribute('aria-atomic'),
        readOrder: Array.from(n.querySelectorAll('h2,p,button')).map((e) => e.tagName.toLowerCase())
      });
    });
    document.querySelectorAll('.fz-notice-btn').forEach((b) => {
      const r = b.getBoundingClientRect();
      out.buttons.push({ text: b.textContent.trim(), h: Math.round(r.height), w: Math.round(r.width) });
    });
    const plan = document.querySelector('[data-fz-plan]');
    if (plan) out.plan = { links: plan.querySelectorAll('a').length, buttons: plan.querySelectorAll('button').length };
    out.activeElement = document.activeElement ? document.activeElement.tagName.toLowerCase() : null;
    return out;
  });

  const targets = [
    ['a8-notice-tts-exhausted-silent.png', '[data-fz-notice="quota.tts.exhausted"]'],
    ['a8-notice-offline.png', '[data-fz-notice="network.offline"]'],
    ['a8-notice-quota-unavailable.png', '[data-fz-notice="quota.unavailable"]'],
    ['a8-plan-panel-no-payment.png', '[data-fz-plan]']
  ];
  for (const [file, sel] of targets) {
    const el = await page.$(sel);
    if (!el) { errors.push('selector nggak ketemu: ' + sel); continue; }
    await el.screenshot({ path: path.join(dir, file) });
  }
  await page.screenshot({ path: path.join(dir, 'a8-all-notices-390px.png'), fullPage: true });
  await browser.close();
  console.log(JSON.stringify({ ukur, errors }, null, 2));
  if (errors.length) process.exitCode = 1;
})();
