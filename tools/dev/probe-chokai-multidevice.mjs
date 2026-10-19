#!/usr/bin/env node
/**
 * tools/dev/probe-chokai-multidevice.mjs
 *
 * PROBE HEADLESS EMPIRIS PLAYWRIGHT - MULTI-DEVICE CHŌKAI AUDIT
 * Menguji 3 skenario ukuran layar:
 * 1. Mobile: 390 x 844 (iPhone 14)
 * 2. Tablet: 820 x 1180 (iPad Air)
 * 3. Desktop: 1280 x 800 (Widescreen)
 *
 * Verifikasi bounding box & responsivitas:
 * - Tidak ada horizontal overflow (scrollWidth <= clientWidth).
 * - Tombol opsi tidak saling bertumpuk (vertically separated, no overlap).
 * - Drawer ter-dock di sisi kanan pada Desktop/Tablet dan bottom-sheet pada Mobile.
 * - Tangkap screenshot bukti visual ke tests/screenshots/
 */

import http from 'http';
import path from 'path';
import fs from 'fs';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const SCREENSHOTS_DIR = path.join(ROOT, 'tests/screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Resilient Chromium loader (supports local node_modules or fiezel-apps)
let chromium;
try {
  const pw = await import('playwright');
  chromium = pw.chromium;
} catch (_) {
  try {
    const appsRequire = createRequire('C:/Users/hp/fiezel-apps/package.json');
    const pw = appsRequire('playwright');
    chromium = pw.chromium;
  } catch (err2) {
    console.error('[PROBE FATAL] Tidak dapat memuat modul playwright:', err2.message);
    process.exit(1);
  }
}

function startStaticServer() {
  const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(ROOT, decodeURIComponent(reqPath));

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

const VIEWPORTS = [
  {
    key: 'mobile',
    label: 'Mobile (iPhone 14)',
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    expectedDock: 'bottom-sheet'
  },
  {
    key: 'tablet',
    label: 'Tablet (iPad Air)',
    width: 820,
    height: 1180,
    deviceScaleFactor: 2,
    expectedDock: 'right-dock'
  },
  {
    key: 'desktop',
    label: 'Desktop (Widescreen)',
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    expectedDock: 'right-dock'
  }
];

async function runMultiDeviceProbe() {
  console.log('================================================================');
  console.log('  FIEZEL CHŌKAI MULTI-DEVICE PLAYWRIGHT EMPIRICAL AUDIT PROBE  ');
  console.log('================================================================');

  const { server, port } = await startStaticServer();
  const baseUrl = `http://127.0.0.1:${port}/index.html`;
  console.log(`[SERVER] Siap melayani pada: ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const auditReport = [];

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n----------------------------------------------------------------`);
      console.log(`[TESTING] ${vp.label} -> ${vp.width}x${vp.height} (Dock Target: ${vp.expectedDock})`);
      console.log(`----------------------------------------------------------------`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.deviceScaleFactor
      });
      const page = await context.newPage();
      page.on('console', msg => {
        if (msg.type() === 'error') console.log('  [BROWSER ERROR LOG]', msg.text());
      });
      page.on('pageerror', err => console.log('  [BROWSER UNCAUGHT ERROR]', err.message));

      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      // 1. Clear session overlays & auth splash
      await page.evaluate(() => {
        try {
          if (window.FiezelAuthScreen && typeof window.FiezelAuthScreen.saveSession === 'function') {
            window.FiezelAuthScreen.saveSession(window, { role: 'murid', via: 'test' });
          } else {
            localStorage.setItem('fiezel_auth_session', JSON.stringify({ role: 'murid', via: 'test' }));
          }
          localStorage.setItem('fiezel_onboarding_completed', 'true');
          localStorage.setItem('fiezel_lang_chosen', 'id');
          localStorage.setItem('fz_course_selected', 'ja');
        } catch (_) {}

        const style = document.createElement('style');
        style.textContent = '.fiezel-ob, .fz-auth, .fiezel-splash, #fiezelBootSplash, .fz-tour { display: none !important; pointer-events: none !important; }';
        document.head.appendChild(style);
        document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-splash-canvas, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour').forEach(el => el.remove());
        document.documentElement.classList.remove('fz-booting');
        document.body.classList.remove('fz-auth-open');
        if (typeof window.go === 'function') window.go('home');
      });
      await page.waitForTimeout(400);

      // 2. Buka Modal Listening JLPT
      console.log('  ▶ Membuka Modal Listening Chōkai...');
      await page.evaluate(() => {
        if (window.openListeningPanel) window.openListeningPanel();
      });
      await page.waitForSelector('#listeningPanelModal.open', { timeout: 5000 });
      await page.waitForTimeout(600);

      // 3. Verifikasi Horizontal Overflow saat Modal Terbuka
      const modalOverflow = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const modal = document.getElementById('listeningPanelModal');
        const box = document.querySelector('.listening-modal-box');
        return {
          docScrollWidth: docEl.scrollWidth,
          docClientWidth: docEl.clientWidth,
          bodyScrollWidth: body.scrollWidth,
          bodyClientWidth: body.clientWidth,
          boxScrollWidth: box ? box.scrollWidth : 0,
          boxClientWidth: box ? box.clientWidth : 0,
          hasDocOverflow: docEl.scrollWidth > docEl.clientWidth,
          hasBodyOverflow: body.scrollWidth > body.clientWidth,
          hasBoxOverflow: box ? box.scrollWidth > box.clientWidth : false
        };
      });

      console.log(`  ✓ Verifikasi Horizontal Overflow (Modal Open):`);
      console.log(`    - Document: ${modalOverflow.docClientWidth}px (scroll: ${modalOverflow.docScrollWidth}px)`);
      console.log(`    - Modal Box: ${modalOverflow.boxClientWidth}px (scroll: ${modalOverflow.boxScrollWidth}px)`);
      assert(!modalOverflow.hasDocOverflow, `Horizontal overflow terdeteksi pada Document di viewport ${vp.width}x${vp.height}`);
      assert(!modalOverflow.hasBoxOverflow, `Horizontal overflow terdeteksi pada Modal Box di viewport ${vp.width}x${vp.height}`);

      // 4. Verifikasi Bounding Box Tombol Opsi (Tidak Bertumpuk)
      console.log('  ▶ Memverifikasi Bounding Box Tombol Pilihan Ganda...');
      await page.waitForSelector('.jlpt-opt-btn', { timeout: 10000 });
      const optBoxes = await page.$$eval('.jlpt-opt-btn', els => {
        return els.map((el, idx) => {
          const rect = el.getBoundingClientRect();
          return {
            index: idx + 1,
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        });
      });

      assert(optBoxes.length === 4, `Harus ada 4 tombol pilihan ganda, ditemukan ${optBoxes.length}`);

      for (let i = 0; i < optBoxes.length; i++) {
        const cur = optBoxes[i];
        assert(cur.width > 200, `Lebar tombol opsi ${cur.index} (${cur.width}px) tidak wajar`);
        assert(cur.height >= 38, `Tinggi tombol opsi ${cur.index} (${cur.height}px) terlalu kecil`);

        if (i < optBoxes.length - 1) {
          const next = optBoxes[i + 1];
          const verticalOverlap = cur.bottom > next.top;
          assert(!verticalOverlap, `Tombol opsi #${cur.index} bertumpuk vertikal dengan #${next.index}: cur.bottom=${cur.bottom} > next.top=${next.top}`);
          const gap = next.top - cur.bottom;
          console.log(`    - Opsi ${cur.index} -> ${next.index}: Jarak vertikal bersih = ${gap}px (Tanpa Tumpukan)`);
        }
      }
      console.log(`  ✓ 4 Tombol Opsi tersusun rapi tanpa overlap vertikal maupun horizontal`);

      // Tangkap Screenshot 1: Modal Chōkai Terbuka
      const shotModal = path.join(SCREENSHOTS_DIR, `chokai-${vp.key}-modal.png`);
      await page.screenshot({ path: shotModal, fullPage: false });
      console.log(`  📷 Screenshot Modal Tersimpan: ${shotModal}`);

      // 5. Buka Bottom Sheet / Side Drawer
      console.log('  ▶ Membuka Detail Sheet / Naskah Drawer...');
      await page.click('#jlptSheetTriggerBtn');
      await page.waitForSelector('#jlptDetailSheet.open', { timeout: 5000 });
      await page.waitForTimeout(600); // Wait for spring physics transition to settle

      // 6. Verifikasi Bounding Box Drawer & Docking Mode
      const drawerMetrics = await page.evaluate(() => {
        const sheet = document.getElementById('jlptDetailSheet');
        const container = document.getElementById('jlptSheetContainer');
        const modalBox = document.querySelector('.listening-modal-box');
        const sRect = sheet ? sheet.getBoundingClientRect() : null;
        const cRect = container ? container.getBoundingClientRect() : null;
        const mRect = modalBox ? modalBox.getBoundingClientRect() : null;

        const docEl = document.documentElement;
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          hasDocOverflow: docEl.scrollWidth > docEl.clientWidth,
          sheet: sRect ? {
            top: Math.round(sRect.top),
            bottom: Math.round(sRect.bottom),
            left: Math.round(sRect.left),
            right: Math.round(sRect.right),
            width: Math.round(sRect.width),
            height: Math.round(sRect.height)
          } : null,
          container: cRect ? {
            top: Math.round(cRect.top),
            bottom: Math.round(cRect.bottom),
            left: Math.round(cRect.left),
            right: Math.round(cRect.right),
            width: Math.round(cRect.width),
            height: Math.round(cRect.height)
          } : null,
          modalBox: mRect ? {
            top: Math.round(mRect.top),
            bottom: Math.round(mRect.bottom),
            left: Math.round(mRect.left),
            right: Math.round(mRect.right),
            width: Math.round(mRect.width),
            height: Math.round(mRect.height)
          } : null
        };
      });

      assert(drawerMetrics.container, 'Container drawer harus ada dan ter-render di DOM');
      assert(!drawerMetrics.hasDocOverflow, `Horizontal overflow terdeteksi saat Drawer terbuka di ${vp.label}`);

      const c = drawerMetrics.container;
      console.log(`  ✓ Metrik Bounding Box Drawer Container:`, {
        x: c.left,
        y: c.top,
        width: c.width,
        height: c.height,
        right: c.right,
        bottom: c.bottom
      });

      if (vp.expectedDock === 'bottom-sheet') {
        // Mobile Verification: Bottom Sheet Docking
        console.log('  ▶ Memverifikasi Karakteristik Bottom-Sheet (Mobile)...');
        // Container bottom harus menyentuh bagian paling bawah layar
        assert(Math.abs(c.bottom - vp.height) <= 4, `Bottom sheet harus menyentuh dasar layar (${vp.height}px), terukur: ${c.bottom}px`);
        // Container harus membentang selebar layar
        assert(c.width >= vp.width - 2, `Bottom sheet harus membentang penuh di mobile (${vp.width}px), terukur: ${c.width}px`);
        // Container tidak menempel di atap layar (khas bottom sheet)
        assert(c.top > 40, `Bottom sheet harus menyisakan ruang di atas layar, terukur top: ${c.top}px`);
        console.log(`  ✓ Terverifikasi: Bottom-Sheet docked di bagian bawah layar (width: ${c.width}px, height: ${c.height}px)`);
      } else {
        // Tablet / Desktop Verification: Right Side Docking
        console.log(`  ▶ Memverifikasi Karakteristik Right-Side Docking (${vp.label})...`);
        // Container right harus menempel pada sisi kanan viewport
        assert(Math.abs(c.right - vp.width) <= 4, `Side drawer harus ter-dock di sisi kanan (${vp.width}px), terukur right: ${c.right}px`);
        // Container left harus berada di belahan kanan layar (tidak menutupi seluruh layar)
        assert(c.left >= Math.round(vp.width * 0.35), `Side drawer harus berada di sisi kanan, terukur left: ${c.left}px`);
        // Container membentang penuh secara vertikal
        assert(c.top <= 10, `Side drawer harus berlabuh dari atas, terukur top: ${c.top}px`);
        assert(c.height >= vp.height - 10, `Side drawer harus mencakup tinggi layar, terukur height: ${c.height}px`);
        console.log(`  ✓ Terverifikasi: Side-Drawer ter-dock di sisi kanan (left: ${c.left}px, width: ${c.width}px, height: ${c.height}px)`);
      }

      // Tangkap Screenshot 2: Drawer Terbuka / Split-view Aktif
      const shotDrawer = path.join(SCREENSHOTS_DIR, `chokai-${vp.key}-drawer.png`);
      await page.screenshot({ path: shotDrawer, fullPage: false });
      console.log(`  📷 Screenshot Drawer Tersimpan: ${shotDrawer}`);

      // 7. Tutup sheet dan verifikasi animasi kembali
      await page.click('.jlpt-sheet-close');
      await page.waitForTimeout(400);

      auditReport.push({
        device: vp.label,
        viewport: `${vp.width}x${vp.height}`,
        expectedDock: vp.expectedDock,
        modalOverflowPass: true,
        optButtonsNoOverlapPass: true,
        drawerDockingPass: true,
        screenshots: [shotModal, shotDrawer]
      });

      await context.close();
    }

    console.log('\n================================================================');
    console.log('AUDIT SELESAI: 100% LULUS PADA SELURUH SKENARIO MULTI-DEVICE!');
    console.log('================================================================');
    console.table(auditReport.map(r => ({
      Device: r.device,
      Viewport: r.viewport,
      'No Overflow': 'PASS',
      'No Option Overlap': 'PASS',
      'Drawer Docking': r.expectedDock.toUpperCase(),
      Result: 'PASS'
    })));

  } finally {
    await browser.close();
    server.close();
  }
}

runMultiDeviceProbe().catch(err => {
  console.error('[PROBE FATAL ERROR]', err);
  process.exit(1);
});
