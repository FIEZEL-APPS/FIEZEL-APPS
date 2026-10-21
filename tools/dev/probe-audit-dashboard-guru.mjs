import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'dashboard-guru-audit');
fs.mkdirSync(REPORT_DIR, { recursive: true });

async function createAuditBrowser() {
  const browser = await chromium.launch({ headless: true });
  return browser;
}

function setupContextRoutes(ctx) {
  return ctx.route('**/*', async route => {
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
        '.jpg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      return route.fulfill({
        status: 200,
        contentType: contentTypes[ext] || 'application/octet-stream',
        body: fs.readFileSync(p)
      });
    }

    if (u.pathname.includes('/api/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: [] })
      });
    }

    if (u.pathname.includes('fiezel-mochi.js')) {
      const alt = path.resolve(ROOT, 'mochi-mascot', 'fiezel-mochi.js');
      if (fs.existsSync(alt)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/javascript; charset=utf-8',
          body: fs.readFileSync(alt)
        });
      }
    }

    return route.fulfill({ status: 204, body: '' });
  });
}

async function runAudit() {
  console.log('=== STARTING EMPIRICAL PROBE FOR DASHBOARD GURU ===');
  const browser = await createAuditBrowser();
  const findings = [];
  const consoleErrors = [];
  const pageErrors = [];

  const viewports = [
    { name: 'desktop', width: 1280, height: 800, isMobile: false },
    { name: 'mobile', width: 390, height: 844, isMobile: true }
  ];

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      serviceWorkers: 'block',
      hasTouch: vp.isMobile,
      isMobile: vp.isMobile
    });
    await setupContextRoutes(ctx);

    const page = await ctx.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        console.error(`[CONSOLE ERROR][${vp.name}]`, text);
        consoleErrors.push({ vp: vp.name, text });
      }
    });

    page.on('pageerror', err => {
      console.error(`[PAGE ERROR][${vp.name}]`, err.message);
      pageErrors.push({ vp: vp.name, message: err.message, stack: err.stack });
    });

    // Visit ?teacher=preview
    await page.goto('http://localhost:4173/index.html?teacher=preview');
    await page.waitForTimeout(1500);

    const shellCount = await page.locator('#fzTeacherShell').count();
    console.log(`[${vp.name}] #fzTeacherShell rendered:`, shellCount > 0);

    if (shellCount === 0) {
      findings.push({
        severity: 'CRITICAL',
        title: 'Teacher Shell not rendered',
        detail: `Visiting ?teacher=preview did not render #fzTeacherShell on ${vp.name}`
      });
    }

    // Helper to evaluate DOM anomalies
    async function checkDomAnomalies(screenName) {
      const anomalies = await page.evaluate(sName => {
        const issues = [];
        const root = document.querySelector('#fzTeacherShell') || document.body;

        // 1. Text leaks
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const val = node.nodeValue?.trim();
          if (!val) continue;
          if (/\bNaN\b/.test(val) && !val.includes('NaNo')) {
            issues.push({ type: 'TEXT_LEAK_NAN', text: val.slice(0, 80), path: node.parentElement?.tagName });
          }
          if (val === 'undefined' || val.includes(' undefined ') || val.startsWith('undefined ')) {
            issues.push({ type: 'TEXT_LEAK_UNDEFINED', text: val.slice(0, 80), path: node.parentElement?.tagName });
          }
          if (val === 'null') {
            issues.push({ type: 'TEXT_LEAK_NULL', text: val.slice(0, 80), path: node.parentElement?.tagName });
          }
          if (val.includes('[object Object]')) {
            issues.push({ type: 'TEXT_LEAK_OBJECT', text: val.slice(0, 80), path: node.parentElement?.tagName });
          }
          if (/\{[a-zA-Z0-9_-]+\}/.test(val) && !val.includes('{css') && !val.includes('{font')) {
            issues.push({ type: 'TEXT_UNFILLED_PLACEHOLDER', text: val.slice(0, 80), path: node.parentElement?.tagName });
          }
          if (/\bguru\.[a-z0-9_-]+\b/.test(val) || /\bsekolah\.[a-z0-9_-]+\b/.test(val)) {
            issues.push({ type: 'RAW_I18N_KEY', text: val.slice(0, 80), path: node.parentElement?.tagName });
          }
        }

        // 2. Broken/Empty Icons
        const iconNodes = root.querySelectorAll('i[data-lucide], .tg-icon, svg.lucide');
        iconNodes.forEach(el => {
          if (el.closest('details:not([open])')) return;
          if (el.closest('.tg-mnav') && window.innerWidth > 820) return;
          const isVisible = typeof el.checkVisibility === 'function' ? el.checkVisibility() : (el.offsetParent !== null);
          if (!isVisible) return;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) {
            issues.push({ type: 'ZERO_SIZE_ICON', tag: el.tagName, cls: el.className, name: el.getAttribute('data-lucide') });
          }
          if (el.tagName === 'I' && el.getAttribute('data-lucide') && el.children.length === 0 && !el.textContent?.trim()) {
            issues.push({ type: 'UNRENDERED_LUCIDE_ICON', name: el.getAttribute('data-lucide'), cls: el.className });
          }
        });

        // 3. Horizontal Overflow
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        if (docWidth > winWidth + 3) {
          issues.push({ type: 'HORIZONTAL_OVERFLOW', docWidth, winWidth, diff: docWidth - winWidth });
        }

        // 4. Broken images
        const imgs = root.querySelectorAll('img');
        imgs.forEach(img => {
          if (!img.complete || img.naturalWidth === 0) {
            issues.push({ type: 'BROKEN_IMAGE', src: img.src });
          }
        });

        // 5. Overflowing elements within container (excluding intentional table horizontal scroll)
        const scrollContainers = root.querySelectorAll('.tg-content, .tg-main, .ch-main');
        scrollContainers.forEach(sc => {
          if (sc.scrollWidth > sc.clientWidth + 15) {
            issues.push({ type: 'CONTAINER_OVERFLOW', cls: sc.className, scrollWidth: sc.scrollWidth, clientWidth: sc.clientWidth });
          }
        });

        return issues;
      }, screenName);

      if (anomalies.length > 0) {
        console.log(`[${vp.name}][${screenName}] DOM Anomalies:`, anomalies);
        findings.push({ vp: vp.name, screen: screenName, anomalies });
      }
    }

    // 1. Initial screenshot
    await page.screenshot({ path: path.join(REPORT_DIR, `${vp.name}-01-landing-hub.png`), fullPage: false });
    await checkDomAnomalies('01-landing-hub');

    // 2. Sidebar Navigation Items
    const navItems = [
      { id: 'hub', label: 'Ruang Kelas' },
      { id: 'briefing', label: 'Ringkasan' },
      { id: 'classes', label: 'Siswa' },
      { id: 'assignments', label: 'Tugas' },
      { id: 'insights', label: 'Analitik' },
      { id: 'comms', label: 'Komunikasi' },
      { id: 'journal', label: 'Jurnal' },
      { id: 'settings', label: 'Profil' }
    ];

    for (const item of navItems) {
      console.log(`[${vp.name}] Navigating to: ${item.id} (${item.label})`);
      await page.evaluate(navId => {
        const btn = document.querySelector(`[data-tg="view"][data-view="${navId}"]`) ||
                    document.querySelector(`[data-testid="tg-nav-${navId}"]`);
        if (btn) btn.click();
      }, item.id);

      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(REPORT_DIR, `${vp.name}-nav-${item.id}.png`), fullPage: false });
      await checkDomAnomalies(`nav-${item.id}`);
    }

    // 3. ClassHub sub-tabs
    await page.evaluate(() => {
      const btn = document.querySelector('[data-tg="view"][data-view="hub"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);

    const hubTabs = ['kelas', 'tugas', 'buat', 'hasil', 'braincore', 'kurikulum'];
    for (const hTab of hubTabs) {
      console.log(`[${vp.name}] Testing Hub Tab: ${hTab}`);
      await page.evaluate(tName => {
        const btn = document.querySelector(`[data-tab="${tName}"]`) ||
                    document.querySelector(`[data-hub-tab="${tName}"]`) ||
                    document.querySelector(`.tg-tab[data-tab="${tName}"]`);
        if (btn) btn.click();
      }, hTab);

      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(REPORT_DIR, `${vp.name}-hub-tab-${hTab}.png`), fullPage: false });
      await checkDomAnomalies(`hub-tab-${hTab}`);
    }

    // 4. Test Modals
    const modalKinds = [
      'new-class',
      'add-students',
      'import-code',
      'assign',
      'share-assign',
      'assign-detail',
      'greet',
      'parent',
      'weekly-report',
      'announce',
      'attendance',
      'analisis-butir',
      'rapor-kktp',
      'warmup',
      'paper-scores'
    ];

    for (const mKind of modalKinds) {
      console.log(`[${vp.name}] Testing Modal: ${mKind}`);
      await page.evaluate(kind => {
        // Find existing assignment ID or student ID if needed
        const store = window.FiezelTeacherStore?.load?.() || {};
        const cls = store.classes?.[0] || null;
        const asgId = cls?.assignments?.[0]?.id || 'asg-demo';
        const stId = cls?.students?.[0]?.id || 'stu-demo';

        // Trigger modal state directly via shell event or state
        const btn = document.createElement('button');
        btn.setAttribute('data-tg', 'modal');
        btn.setAttribute('data-kind', kind);
        btn.setAttribute('data-id', kind.includes('assign') || kind === 'analisis-butir' || kind === 'paper-scores' ? asgId : stId);
        btn.setAttribute('data-target', stId);
        document.body.appendChild(btn);
        btn.click();
        btn.remove();
      }, mKind);

      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(REPORT_DIR, `${vp.name}-modal-${mKind}.png`), fullPage: false });
      await checkDomAnomalies(`modal-${mKind}`);

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

    // 5. Test Drawer
    console.log(`[${vp.name}] Testing Drawer: inbox`);
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.setAttribute('data-tg', 'drawer');
      btn.setAttribute('data-id', 'inbox');
      document.body.appendChild(btn);
      btn.click();
      btn.remove();
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(REPORT_DIR, `${vp.name}-drawer-inbox.png`), fullPage: false });
    await checkDomAnomalies('drawer-inbox');

    // Close drawer
    await page.evaluate(() => {
      const closeBtn = document.querySelector('[data-tg="close"], .tg-drawer-close');
      if (closeBtn) closeBtn.click();
    });
    await page.waitForTimeout(200);

    // 6. Mobile bottom nav test (only on mobile)
    if (vp.isMobile) {
      console.log(`[mobile] Testing mobile navigation bar and touch targets`);
      const mobileNavIssues = await page.evaluate(() => {
        const issues = [];
        const nav = document.querySelector('.tg-mnav');
        if (!nav) {
          issues.push({ type: 'MOBILE_NAV_MISSING', msg: '.tg-mnav not found in mobile viewport' });
          return issues;
        }
        const buttons = Array.from(nav.querySelectorAll('button, a'));
        buttons.forEach(b => {
          const r = b.getBoundingClientRect();
          if (r.height < 44 || r.width < 44) {
            issues.push({ type: 'TOUCH_TARGET_TOO_SMALL', el: b.textContent?.trim(), width: r.width, height: r.height });
          }
        });
        return issues;
      });

      if (mobileNavIssues.length > 0) {
        console.log(`[mobile] Mobile nav issues:`, mobileNavIssues);
        findings.push({ vp: 'mobile', screen: 'mobile-nav', anomalies: mobileNavIssues });
      }
    }

    await ctx.close();
  }

  await browser.close();

  // Summary Report
  const summary = {
    timestamp: new Date().toISOString(),
    totalConsoleErrors: consoleErrors.length,
    totalPageErrors: pageErrors.length,
    totalAnomaliesCount: findings.reduce((acc, f) => acc + (f.anomalies?.length || 0), 0),
    consoleErrors,
    pageErrors,
    findings
  };
  fs.writeFileSync(path.join(REPORT_DIR, 'probe-findings.json'), JSON.stringify(summary, null, 2));

  console.log('\n========================================');
  console.log('=== EMPIRICAL AUDIT FINISHED ===');
  console.log(`Total console errors: ${consoleErrors.length}`);
  console.log(`Total page errors: ${pageErrors.length}`);
  console.log(`Total screen anomaly groups: ${findings.length}`);
  console.log(`Results saved to: reports/dashboard-guru-audit/probe-findings.json`);
  console.log('========================================\n');
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
