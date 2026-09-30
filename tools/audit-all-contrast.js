const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Fitra' }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-tour-v1', JSON.stringify({ done: true, at: Date.now() }));
      localStorage.setItem('fz-tour-done', '1');
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
      localStorage.setItem('fiezel-active-level-v1', 'A1');
    } catch (_) {}
  });

  await page.goto('http://localhost:8080/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    try {
      document.getElementById('fiezelBootSplash')?.remove();
      document.documentElement.classList.remove('fz-booting');
      document.querySelector('.fiezel-ob')?.remove();
      document.getElementById('welcome')?.remove();
      document.getElementById('authGate')?.remove();
      document.getElementById('fzRitual')?.remove();
      document.querySelector('.fz-ritual-sheet')?.remove();
      document.querySelector('.modal-scrim')?.remove();
      document.querySelectorAll('.fz-tour, .fz-tour-card, [class*="fz-tour"]').forEach(e => e.remove());
      if (typeof window.go === 'function') window.go('home');
    } catch (_) {}
  });
  await page.waitForTimeout(1000);

  const list = await page.evaluate(() => {
    function parseRgb(colorStr) {
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!match) return null;
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1.0
      };
    }

    function getLuminance(r, g, b) {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function contrastRatio(lum1, lum2) {
      return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    const bad = [];

    while (walker.nextNode()) {
      const el = walker.currentNode;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) < 0.1) continue;

      let directText = '';
      for (let child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
          directText += ' ' + child.textContent.trim();
        }
      }
      directText = directText.trim();
      if (!directText) continue;

      let cur = el;
      let effectiveBg = 'rgb(255, 249, 238)';
      while (cur) {
        const curStyle = window.getComputedStyle(cur);
        const curBg = parseRgb(curStyle.backgroundColor);
        if (curBg && curBg.a > 0.8) {
          effectiveBg = curStyle.backgroundColor;
          break;
        }
        cur = cur.parentElement;
      }

      const c = parseRgb(style.color);
      const b = parseRgb(effectiveBg) || { r: 255, g: 249, b: 238, a: 1 };
      if (!c) continue;

      const lumText = getLuminance(c.r, c.g, c.b);
      const lumBg = getLuminance(b.r, b.g, b.b);
      const ratio = contrastRatio(lumText, lumBg);

      if (ratio < 4.5) {
        const clsStr = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
        let path = [];
        let p = el;
        while (p && p !== document.body) {
          path.push(p.tagName + (p.id ? '#' + p.id : '') + (p.className && typeof p.className === 'string' ? '.' + p.className.split(' ').filter(Boolean).join('.') : ''));
          p = p.parentElement;
        }
        bad.push({
          tag: el.tagName,
          id: el.id,
          cls: clsStr,
          text: directText,
          color: style.color,
          bg: effectiveBg,
          contrast: ratio.toFixed(2),
          path: path.reverse().join(' > ')
        });
      }
    }
    return bad;
  });

  console.log(`TOTAL BAD CONTRAST ELEMENTS: ${list.length}`);
  list.forEach((item, i) => {
    console.log(`${i+1}. [${item.contrast}:1] "${item.text}"`);
    console.log(`   Path: ${item.path}`);
    console.log(`   Color: ${item.color} on ${item.bg}`);
  });

  await browser.close();
}

main().catch(console.error);
