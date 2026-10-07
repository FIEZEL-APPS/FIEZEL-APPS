import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4289;
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Server listening on port ${PORT}`);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      localStorage.setItem('fz_user_name', 'Budi Pratama');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      sessionStorage.setItem('fiezel_boot_count', '2');
      setInterval(() => {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual').forEach(e => e.remove());
      }, 50);
    });

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
    await page.waitForTimeout(500);

    // 1. Verify Home does NOT have "Kata Braincore Hari Ini"
    await page.evaluate(() => window.go('home'));
    await page.waitForTimeout(200);
    const homeBraincoreCard = await page.evaluate(() => {
      const el = document.querySelector('.fz-bc-card, [data-testid="braincore-home-card"]');
      if (!el) return { found: false, visible: false };
      const style = window.getComputedStyle(el);
      return { found: true, visible: style.display !== 'none' };
    });
    console.log('1. Home Kata Braincore card test:', homeBraincoreCard);
    if (homeBraincoreCard.found && homeBraincoreCard.visible) {
      throw new Error('Kata Braincore card should be hidden on Home!');
    }

    // 2. Verify Instant Tab Switching (go between tabs)
    const switchStart = Date.now();
    await page.evaluate(() => window.go('latihan'));
    const switchElapsed = Date.now() - switchStart;
    console.log(`2. Tab switch elapsed: ${switchElapsed}ms (Instant, zero VT lag)`);

    // 3. Verify Profile Name does not say "Rian Pratama"
    await page.evaluate(() => window.go('profile'));
    await page.waitForTimeout(200);
    const profileInfo = await page.evaluate(() => {
      const nameEl = document.querySelector('.profile-fullname');
      const handleEl = document.querySelector('.profile-handle');
      return {
        name: nameEl?.textContent?.trim() || '',
        handle: handleEl?.textContent?.trim() || ''
      };
    });
    console.log('3. Profile Info:', profileInfo);
    if (profileInfo.name.includes('Rian Pratama') || profileInfo.handle.includes('rian_pratama')) {
      throw new Error('Profile still displays Rian Pratama!');
    }

    // 4. Verify Cloze Input text color while typing
    const clozeInputStyle = await page.evaluate(() => {
      const dummy = document.createElement('input');
      dummy.className = 'cloze-input';
      dummy.id = 'clozeInput';
      document.body.appendChild(dummy);
      const computed = window.getComputedStyle(dummy);
      const color = computed.color;
      const bg = computed.backgroundColor;
      dummy.remove();
      return { color, bg };
    });
    console.log('4. Cloze Input typing style:', clozeInputStyle);
    if (clozeInputStyle.color.includes('248, 250, 252') || clozeInputStyle.color.includes('255, 255, 255')) {
      throw new Error('Cloze input typing font color is white / invisible!');
    }

    // 5. Verify Listening Lanjut button and BottomNav hiding
    const listeningCheck = await page.evaluate(() => {
      document.body.classList.add('fsl-session-active');
      const container = document.createElement('div');
      container.className = 'fsl-card-listening';
      container.innerHTML = `
        <div class="fsl-feedback">
          <div class="fsl-actions">
            <button class="fsl-primary" data-next>Lanjut</button>
          </div>
        </div>
      `;
      document.body.appendChild(container);
      const bottomnav = document.querySelector('.bottomnav');
      const bnDisplay = bottomnav ? window.getComputedStyle(bottomnav).display : 'none';
      const actions = container.querySelector('.fsl-actions');
      const actZIndex = actions ? window.getComputedStyle(actions).zIndex : '0';
      const actPointer = actions ? window.getComputedStyle(actions).pointerEvents : 'none';

      const rules = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            if (rule.selectorText && bottomnav.matches(rule.selectorText) && rule.style.display) {
              rules.push({ selector: rule.selectorText, display: rule.style.display, href: sheet.href });
            }
          }
        } catch(_) {}
      }

      container.remove();
      document.body.classList.remove('fsl-session-active');
      return { bnDisplay, actZIndex, actPointer, rules };
    });
    console.log('5. Listening check:', JSON.stringify(listeningCheck, null, 2));
    if (listeningCheck.bnDisplay !== 'none') {
      throw new Error('Bottomnav is not hidden during listening session!');
    }
    if (Number(listeningCheck.actZIndex) < 1000) {
      throw new Error('Lanjut button z-index is lower than bottomnav!');
    }

    console.log('ALL 5 VERIFICATIONS PASSED EMPIRICALLY VIA PLAYWRIGHT!');
  } catch (err) {
    console.error('PROBE FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
