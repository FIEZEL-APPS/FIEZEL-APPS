/**
 * probe-update-card.js — BUKTI EMPIRIS PERAMBAN (Playwright Chromium).
 *
 * Membuktikan keluhan "PWA terpasang membeku diam-diam" benar-benar tertutup, dengan
 * memuat halaman SUNGGUHAN lalu membandingkan dua dunia:
 *
 *   KONTEKS 1 (perangkat lama)  : halaman menjalankan build m025-491 (core-config dipalsukan),
 *                                 server menyajikan build live m025-492.
 *                                 HARAPAN: kartu "Versi baru" MUNCUL, dan check(true) = true.
 *   KONTEKS 2 (perangkat mutakhir): halaman menjalankan m025-492, server juga m025-492.
 *                                 HARAPAN: kartu TIDAK muncul (anti-vakum), check(true) = false.
 *
 * Keduanya memakai VERSION.json semver yang BEKU ('5.19.0' di kedua sisi) — persis keadaan
 * produksi. Perbedaan hasil antara konteks 1 dan 2 karena itu HANYA bisa datang dari sinyal
 * build halaman yang baru, bukan dari VERSION.json.
 *
 * Jalankan: node tools/dev/probe-update-card.js
 */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BASE = process.env.FIEZEL_PROBE_BASE || 'http://127.0.0.1:8123';
const OUT = path.join(ROOT, '.audit-tmp');

function coreConfigFor(build) {
  const src = fs.readFileSync(path.join(ROOT, 'core-config.js'), 'utf8');
  return src.replace(/FIEZEL_PAGE_BUILD='m025-\d+'/, "FIEZEL_PAGE_BUILD='" + build + "'");
}

async function jalankan(browser, { pageBuild, liveBuild, label }) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  // SW no-op lokal: menghindari precache nyata yang bisa membekukan penanda (yang justru
  // diuji terpisah oleh tests/sw-build-marker-freshness-test.js). Fokus probe ini adalah
  // PERILAKU KARTU di halaman, bukan SW.
  await context.route('**/sw.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* probe no-op */\n' }));
  await context.route('**/core-config.js*', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: coreConfigFor(pageBuild) }));
  await context.route('**/coordination/BUILD-VERSION.json*', (r) => r.fulfill(json({ version: liveBuild })));
  await context.route('**/VERSION.json*', (r) => r.fulfill(json({ version: '5.19.0' })));

  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !!window.FiezelUpdatePrompt, null, { timeout: 15000 }).catch(() => {});

  // Daftarkan SW no-op agar getRegistration() punya balikan, lalu periksa lewat API resmi.
  await page.evaluate(async () => { try { await navigator.serviceWorker.register('./sw.js'); } catch (e) {} });
  const hasilCheck = await page.evaluate(async () => {
    try { return await window.FiezelUpdatePrompt.check(true); } catch (e) { return 'ERR:' + e.message; }
  });
  await page.waitForTimeout(500);

  const banner = await page.evaluate(() => {
    const el = document.getElementById('updateBanner');
    if (!el) return null;
    const visible = el.classList.contains('show') && !el.classList.contains('hidden');
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      visible,
      opacity: cs.opacity,
      display: cs.display,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      versionText: (document.getElementById('updateBannerVersion') || {}).textContent || ''
    };
  });

  fs.mkdirSync(OUT, { recursive: true });
  const shot = path.join(OUT, 'probe-m025-492-' + label + '.png');
  try { await page.screenshot({ path: shot, fullPage: false }); } catch (e) {}

  await context.close();
  return { label, pageBuild, liveBuild, hasilCheck, banner, screenshot: shot };
}

(async () => {
  const browser = await chromium.launch();
  const lama = await jalankan(browser, { pageBuild: 'm025-491', liveBuild: 'm025-492', label: 'perangkat-lama' });
  const mutakhir = await jalankan(browser, { pageBuild: 'm025-492', liveBuild: 'm025-492', label: 'perangkat-mutakhir' });
  await browser.close();

  const hasil = {
    konteks1_perangkatLama: lama,
    konteks2_perangkatMutakhir: mutakhir,
    P1_kartuMunculSaatBuildLiveLebihBaru: lama.hasilCheck === true && !!lama.banner && lama.banner.visible,
    P2_kartuTidakMunculSaatSudahMutakhir: mutakhir.hasilCheck === false && !!mutakhir.banner && !mutakhir.banner.visible
  };
  console.log(JSON.stringify(hasil, null, 2));
  const lulus = hasil.P1_kartuMunculSaatBuildLiveLebihBaru && hasil.P2_kartuTidakMunculSaatSudahMutakhir;
  console.log('\n' + (lulus ? 'PROBE PASS' : 'PROBE FAIL'));
  process.exit(lulus ? 0 : 1);
})().catch((e) => { console.error(e.stack || e); process.exit(1); });