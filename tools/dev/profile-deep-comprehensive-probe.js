#!/usr/bin/env node
'use strict';
/**
 * tools/dev/profile-deep-comprehensive-probe.js
 *
 * PROBE EMPIRIS MENDALAM UI & UX PANEL PROFIL FIEZEL:
 * 1. Functional Controls & State Persistence (Goal pills, Speed pills, Toggles, Card Collapse, Name Edit, Logout)
 * 2. Multi-Viewport Responsiveness & Overflow Audit (320px, 360px, 390px, 412px, 768px)
 * 3. Bottom Navigation Safe Zone & Visibility Audit
 * 4. Offline Resilience Audit (navigator.onLine = false)
 * 5. Internationalization & Thai Locale Leak Audit
 * 6. WCAG Color Contrast & Accessibility (a11y) Metrics
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'scratch', 'audit-profile-deep');
fs.mkdirSync(OUT_DIR, { recursive: true });

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.error('Playwright tidak ditemukan:', e.message);
  process.exit(1);
}

const ORIGIN = 'http://localhost:4173';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2'
};

// Formula luminansi WCAG 2.1
function parseRgb(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return [255, 255, 255];
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function relativeLuminance([r, g, b]) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(rgb1, rgb2) {
  const lum1 = relativeLuminance(rgb1);
  const lum2 = relativeLuminance(rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

async function runComprehensiveAudit() {
  console.log('=== MEMULAI AUDIT MENDALAM UI/UX PANEL PROFIL TINGKAT LANJUT ===\n');

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-first-run']
  });

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
    serviceWorkers: 'block'
  });

  await ctx.route('**/*', route => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.origin === ORIGIN) {
      const rel = u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname).slice(1);
      const target = path.resolve(ROOT, rel);
      if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
        return route.fulfill({ status: 404, body: '' });
      }
      return route.fulfill({
        status: 200,
        contentType: MIME[path.extname(target)] || 'application/octet-stream',
        body: fs.readFileSync(target)
      });
    }
    return route.abort();
  });

  // Setup seed storage awal
  await ctx.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({
      done: true,
      at: Date.now(),
      via: 'finish',
      locale: 'id',
      name: 'Rian Pratama'
    }));

    const mockHistory = [];
    for (let i = 0; i < 20; i++) {
      mockHistory.push({
        attemptId: 'att_' + i,
        at: Date.now() - (20 - i) * 60000,
        ok: i % 4 !== 0,
        level: 'A1',
        skill: 'basic_phrases',
        type: 'grammar'
      });
    }

    const initState = {
      view: 'online',
      userName: 'Rian Pratama',
      level: 'A1',
      streak: 5,
      xp: 260,
      totalAnswered: 20,
      history: mockHistory,
      preferences: {
        learnerLocale: 'id',
        learnerLocaleExplicit: true,
        dailyGoalMinutes: 15,
        dailyReminder: true,
        speechRate: 1.0,
        feedbackSounds: true,
        autoAudio: true,
        motion: true,
        haptics: true
      }
    };
    localStorage.setItem('fiezel-state-v1', JSON.stringify(initState));
    localStorage.setItem('fiezel-v5-legacy-owner', JSON.stringify(initState));
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun', handle: 'rian_pratama' }));
    localStorage.setItem('fz_tour_completed', '1');
    localStorage.setItem('fiezel-tour-v1', 'finish');
  });

  const page = await ctx.newPage();

  const auditReport = {
    timestamp: new Date().toISOString(),
    suite1_functionalControls: {},
    suite2_viewports: {},
    suite3_bottomNavSafeZone: {},
    suite4_offlineResilience: {},
    suite5_thaiLocaleAudit: {},
    suite6_colorContrast: []
  };

  await page.goto(ORIGIN + '/');
  await page.waitForTimeout(1000);

  // Masuk ke online tab profil dan bersihkan overlay
  await page.evaluate(() => {
    document.getElementById('fiezelBootSplash')?.remove();
    document.documentElement.classList.remove('fz-booting');
    document.querySelectorAll('.fiezel-ob, .fz-coach-bubble, .coach-step-modal, .fz-auth, #welcome, #authGate').forEach(el => el.remove());
    if (window.go) window.go('online');
    if (window.switchOnlineTab) window.switchOnlineTab('profil');
  });
  await page.waitForTimeout(600);

  // =========================================================================
  // SUITE 1: FUNCTIONAL CONTROLS & PERSISTENCE
  // =========================================================================
  console.log('--- Menjalankan Suite 1: Uji Interaktivitas & Persistensi State ---');

  // 1a. Test Goal Pill selection (Click 30 Mnt)
  const goalPillResult = await page.evaluate(() => {
    const btn30 = document.querySelectorAll('#profileGoalPills .goal-pill-btn')[2];
    if (!btn30) return { error: 'goal pill 30 not found' };
    btn30.click();
    const stateObj = JSON.parse(localStorage.getItem('fiezel-state-v1') || '{}');
    return {
      clicked: true,
      hasActiveClass: btn30.classList.contains('active'),
      savedGoalMinutes: stateObj.preferences?.dailyGoalMinutes
    };
  });
  auditReport.suite1_functionalControls.goalPills = goalPillResult;

  // 1b. Test Speed Pill selection (Click 0.85x)
  const speedPillResult = await page.evaluate(() => {
    const btn085 = document.querySelector('#profileAudioSpeedPills .speed-btn:nth-child(1)');
    if (!btn085) return { error: 'speed pill 0.85 not found' };
    btn085.click();
    const stateObj = JSON.parse(localStorage.getItem('fiezel-state-v1') || '{}');
    const pillSummary = document.getElementById('pillAudioSummary')?.textContent || '';
    return {
      clicked: true,
      hasActiveClass: btn085.classList.contains('active'),
      savedSpeechRate: stateObj.preferences?.speechRate,
      summaryText: pillSummary
    };
  });
  auditReport.suite1_functionalControls.speedPills = speedPillResult;

  // 1c. Test Toggle Daily Reminder
  const reminderToggleResult = await page.evaluate(() => {
    const toggle = document.getElementById('toggleDailyReminder');
    if (!toggle) return { error: 'toggleDailyReminder not found' };
    const prev = toggle.checked;
    toggle.click();
    const stateObj = JSON.parse(localStorage.getItem('fiezel-state-v1') || '{}');
    return {
      toggledFrom: prev,
      toggledTo: toggle.checked,
      savedState: stateObj.preferences?.dailyReminder
    };
  });
  auditReport.suite1_functionalControls.reminderToggle = reminderToggleResult;

  // 1d. Test Toggle Chime
  const chimeToggleResult = await page.evaluate(() => {
    const toggle = document.getElementById('toggleAudioChime');
    if (!toggle) return { error: 'toggleAudioChime not found' };
    const prev = toggle.checked;
    toggle.click();
    const stateObj = JSON.parse(localStorage.getItem('fiezel-state-v1') || '{}');
    return {
      toggledFrom: prev,
      toggledTo: toggle.checked,
      savedState: stateObj.preferences?.feedbackSounds
    };
  });
  auditReport.suite1_functionalControls.chimeToggle = chimeToggleResult;

  // 1e. Test Toggle Auto Audio
  const autoAudioToggleResult = await page.evaluate(() => {
    const toggle = document.getElementById('toggleAutoAudio');
    if (!toggle) return { error: 'toggleAutoAudio not found' };
    const prev = toggle.checked;
    toggle.click();
    const stateObj = JSON.parse(localStorage.getItem('fiezel-state-v1') || '{}');
    return {
      toggledFrom: prev,
      toggledTo: toggle.checked,
      savedState: stateObj.preferences?.autoAudio
    };
  });
  auditReport.suite1_functionalControls.autoAudioToggle = autoAudioToggleResult;

  // 1f. Test Card Collapse on Suara & Audio
  const cardCollapseResult = await page.evaluate(() => {
    const card = document.getElementById('cardSuaraAudio');
    const header = card?.querySelector('.section-card-header.is-collapsible');
    if (!card || !header) return { error: 'cardSuaraAudio or header not found' };
    const initialCollapsed = card.classList.contains('is-collapsed');
    header.click();
    const afterClickCollapsed = card.classList.contains('is-collapsed');
    header.click(); // revert back to open
    const restored = !card.classList.contains('is-collapsed');
    return {
      initialCollapsed,
      afterClickCollapsed,
      restored
    };
  });
  auditReport.suite1_functionalControls.cardCollapse = cardCollapseResult;

  // 1g. Test Edit Profile Name Validation & Propagation
  const nameEditTestResult = await page.evaluate(async () => {
    const editBtn = document.querySelector('.profile-btn-edit');
    if (!editBtn) return { error: 'editBtn not found' };
    editBtn.click();

    await new Promise(r => setTimeout(r, 60));
    const input = document.getElementById('editProfileNameInput');
    const saveBtn = document.getElementById('btnEditProfileSave');
    const errEl = document.getElementById('editProfileNameErr');

    if (!input || !saveBtn || !errEl) return { error: 'modal elements not found' };

    // Case 1: Empty input validation
    input.value = '   ';
    saveBtn.click();
    await new Promise(r => setTimeout(r, 60));
    const emptyValidationShows = errEl.style.display !== 'none' && errEl.textContent.length > 0;
    const emptyValidationMsg = errEl.textContent;

    // Case 2: Valid new name input
    input.value = 'Rian Kusuma';
    saveBtn.click();
    await new Promise(r => setTimeout(r, 120));

    const stateObj = JSON.parse(localStorage.getItem('fiezel-state-v1') || '{}');
    const nameInDOM = document.querySelector('.profile-fullname')?.textContent?.trim();
    const avatarInDOM = document.querySelector('.profile-avatar-tactile')?.textContent?.trim();

    return {
      emptyValidationShows,
      emptyValidationMsg,
      savedNameInState: stateObj.userName,
      nameInDOM,
      avatarInitials: avatarInDOM
    };
  });
  auditReport.suite1_functionalControls.nameEdit = nameEditTestResult;

  // =========================================================================
  // SUITE 2: MULTI-VIEWPORT RESPONSIVENESS & OVERFLOW AUDIT
  // =========================================================================
  console.log('--- Menjalankan Suite 2: Audit Responsivitas Multi-Viewport ---');
  const viewports = [
    { name: '320px_compact_mobile', width: 320, height: 600 },
    { name: '360px_android_standard', width: 360, height: 740 },
    { name: '390px_iphone14_standard', width: 390, height: 844 },
    { name: '412px_pixel_wide', width: 412, height: 915 },
    { name: '768px_tablet', width: 768, height: 1024 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    const vpMetrics = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const clientW = document.documentElement.clientWidth;
      const hasHorizontalScroll = scrollW > clientW;

      const profileW = document.getElementById('viewProfile')?.clientWidth || 0;
      const heroW = document.querySelector('.profile-hero-card')?.clientWidth || 0;
      const tabsW = document.querySelector('.progress-tabs')?.clientWidth || 0;

      return {
        clientWidth: clientW,
        scrollWidth: scrollW,
        hasHorizontalScroll,
        profileWidth: profileW,
        heroCardWidth: heroW,
        tabsWidth: tabsW
      };
    });

    const shotPath = path.join(OUT_DIR, `vp-${vp.name}.png`);
    await page.screenshot({ path: shotPath });
    auditReport.suite2_viewports[vp.name] = { ...vpMetrics, screenshot: path.basename(shotPath) };
  }

  // Kembalikan ke 390x844 untuk sisa pengujian
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);

  // =========================================================================
  // SUITE 3: BOTTOM NAVIGATION SAFE ZONE & VISIBILITY
  // =========================================================================
  console.log('--- Menjalankan Suite 3: Audit Safe Zone Bottom Navigation ---');
  const safeZoneResult = await page.evaluate(() => {
    const bottomNav = document.querySelector('.bottomnav, nav.bottomnav, .bottom-nav, nav.fz-bottom-bar, #bottomNav');
    const logoutBtn = document.querySelector('.profile-action-btn.danger');
    const syncCard = document.getElementById('cardSyncAkun');
    const appEl = document.getElementById('app');

    const bottomNavRect = bottomNav ? bottomNav.getBoundingClientRect() : null;
    const logoutRect = logoutBtn ? logoutBtn.getBoundingClientRect() : null;
    const syncRect = syncCard ? syncCard.getBoundingClientRect() : null;

    // Scroll paling bawah
    window.scrollTo(0, document.body.scrollHeight);

    const logoutRectScrolled = logoutBtn ? logoutBtn.getBoundingClientRect() : null;
    const isObscuredByNav = (bottomNavRect && logoutRectScrolled) ? (logoutRectScrolled.bottom > bottomNavRect.top) : false;

    return {
      bottomNavFound: !!bottomNav,
      bottomNavHeight: bottomNavRect ? Math.round(bottomNavRect.height) : 0,
      appPaddingBottom: window.getComputedStyle(appEl || document.body).paddingBottom,
      logoutBtnFound: !!logoutBtn,
      logoutBtnVisible: logoutBtn ? window.getComputedStyle(logoutBtn).display !== 'none' : false,
      isObscuredByNavAtBottom: isObscuredByNav
    };
  });
  auditReport.suite3_bottomNavSafeZone = safeZoneResult;

  // Tangkap full page screenshot setelah scroll ke paling bawah
  const bottomScrollPath = path.join(OUT_DIR, '08-profile-scrolled-bottom.png');
  await page.screenshot({ path: bottomScrollPath });
  console.log('[CAPTURE] 08-profile-scrolled-bottom.png tersimpan.');

  // =========================================================================
  // SUITE 4: OFFLINE RESILIENCE AUDIT
  // =========================================================================
  console.log('--- Menjalankan Suite 4: Audit Ketahanan Mode Offline ---');
  await ctx.setOffline(true);
  await page.evaluate(() => {
    // Re-render tab profil dalam keadaan offline
    if (window.renderOnlineTab) window.renderOnlineTab();
  });
  await page.waitForTimeout(400);

  const offlineAudit = await page.evaluate(() => {
    const syncStatusEl = document.querySelector('.sync-status-row');
    const syncText = syncStatusEl?.textContent?.trim() || '';
    const dotColor = syncStatusEl?.style?.color || '';
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

    return {
      isNavigatorOffline: isOffline,
      syncStatusText: syncText,
      syncDotColor: dotColor,
      isShowingOfflineMessage: syncText.includes('offline')
    };
  });
  auditReport.suite4_offlineResilience = offlineAudit;

  const offlineShotPath = path.join(OUT_DIR, '09-profile-offline-mode.png');
  await page.screenshot({ path: offlineShotPath });
  console.log('[CAPTURE] 09-profile-offline-mode.png tersimpan.');

  // Kembalikan ke status online
  await ctx.setOffline(false);
  await page.evaluate(() => {
    if (window.renderOnlineTab) window.renderOnlineTab();
  });
  await page.waitForTimeout(400);

  // =========================================================================
  // SUITE 5: INTERNATIONALIZATION & THAI LOCALE LEAK AUDIT
  // =========================================================================
  console.log('--- Menjalankan Suite 5: Audit Kebocoran Bahasa (Mode Thai) ---');
  await page.evaluate(() => {
    if (window.FiezelI18n && window.FiezelI18n.setLocale) {
      window.FiezelI18n.setLocale('th');
    }
    if (window.renderOnlineTab) window.renderOnlineTab();
  });
  await page.waitForTimeout(500);

  const thaiAudit = await page.evaluate(() => {
    const view = document.getElementById('viewProfile');
    if (!view) return { error: 'viewProfile not found' };

    const rawText = view.innerText;
    const ID_WORDS = /\b(Akun|Masuk|Daftar|Pengaturan|Simpan|Batal|Lanjut|Kembali|Selesai|Silakan|Memuat|Jawaban|Pilih|Kirim|Aktifkan|Aktivasi|Nama|Kelas|Guru|Murid|Suara|Notifikasi|Riwayat|Belajar|Undangan|Coba lagi|Status|Belum|Sudah|Hapus|Tambah|Ubah|Buat|Tutup|Cari|Ruang|Tugas|Soal|Materi|Metrik|Lanjutkan|Selesaikan|Kosakata|Latihan|Akurasi|Ritme|Dengar|Runtun|Tingkat|Sekarang|Kemahiran|Disarankan|Direkomendasikan|Menunggu|Tenggat|Mapel|Fase|Kurikulum|Merdeka|Tuntas|Misi|Paspor|Kompetensi|Lengkap|Terdaftar|Penugasan|Kesempatan|KESEMPATAN|Intip)\b/g;

    const matches = rawText.match(ID_WORDS) || [];

    // Periksa judul dan elemen kunci dalam bahasa Thai
    const heroTitle = document.querySelector('.profile-level-chip')?.textContent || '';
    const streakLabel = document.querySelector('.profile-stat-lbl')?.textContent || '';
    const audioCardTitle = document.querySelector('#cardSuaraAudio .section-card-title')?.textContent || '';
    const syncCardTitle = document.querySelector('#cardSyncAkun .section-card-title')?.textContent || '';

    return {
      leakedIndonesianWords: matches,
      isCleanFromIndonesian: matches.length === 0,
      thaiSampleElements: {
        levelChip: heroTitle,
        streakLabel: streakLabel,
        audioCardTitle: audioCardTitle,
        syncCardTitle: syncCardTitle
      }
    };
  });
  auditReport.suite5_thaiLocaleAudit = thaiAudit;

  const thaiShotPath = path.join(OUT_DIR, '10-profile-thai-mode.png');
  await page.screenshot({ path: thaiShotPath });
  console.log('[CAPTURE] 10-profile-thai-mode.png tersimpan.');

  // Kembalikan ke ID
  await page.evaluate(() => {
    if (window.FiezelI18n && window.FiezelI18n.setLocale) {
      window.FiezelI18n.setLocale('id');
    }
    if (window.renderOnlineTab) window.renderOnlineTab();
  });
  await page.waitForTimeout(400);

  // =========================================================================
  // SUITE 6: WCAG COLOR CONTRAST & ACCESSIBILITY AUDIT
  // =========================================================================
  console.log('--- Menjalankan Suite 6: Audit Rasio Kontras Warna WCAG ---');
  const contrastElements = await page.evaluate(() => {
    const items = [
      { name: 'Nama Murid', selector: '.profile-fullname' },
      { name: 'Handle Murid', selector: '.profile-handle' },
      { name: 'Chip Level', selector: '.profile-level-chip' },
      { name: 'Chip Status Pelajar', selector: '.profile-status-chip' },
      { name: 'Label Stat Streak', selector: '.profile-stat-box:nth-child(1) .profile-stat-lbl' },
      { name: 'Judul Kartu Audio', selector: '#cardSuaraAudio .section-card-title' },
      { name: 'Deskripsi Kartu Audio', selector: '#cardSuaraAudio .section-card-desc' },
      { name: 'Judul Setting Tempo', selector: '.setting-item-name' },
      { name: 'Deskripsi Setting Tempo', selector: '.setting-item-desc' },
      { name: 'Tombol Speed 1.0x', selector: '.speed-btn.active' },
      { name: 'Tombol Ubah Nama', selector: '.profile-btn-edit' },
      { name: 'Tombol Salin ID', selector: '.btn-copy-code' },
      { name: 'Tombol Pengaturan', selector: '.profile-action-btn:not(.danger)' },
      { name: 'Tombol Logout', selector: '.profile-action-btn.danger' }
    ];

    return items.map(item => {
      const el = document.querySelector(item.selector);
      if (!el) return { name: item.name, found: false };
      const style = window.getComputedStyle(el);
      let bg = style.backgroundColor;
      let parent = el.parentElement;
      while (parent && (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)')) {
        bg = window.getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
      }
      return {
        name: item.name,
        selector: item.selector,
        found: true,
        color: style.color,
        bgColor: bg || 'rgb(255, 255, 255)',
        fontSize: style.fontSize,
        fontWeight: style.fontWeight
      };
    });
  });

  for (const item of contrastElements) {
    if (!item.found) continue;
    const fg = parseRgb(item.color);
    const bg = parseRgb(item.bgColor);
    const ratio = Math.round(contrastRatio(fg, bg) * 100) / 100;
    const meetsAA = ratio >= 4.5;
    const meetsAALarge = ratio >= 3.0;
    auditReport.suite6_colorContrast.push({
      name: item.name,
      ratio: `${ratio}:1`,
      meetsAA: meetsAA,
      meetsAALarge: meetsAALarge,
      fgColor: item.color,
      bgColor: item.bgColor,
      fontSize: item.fontSize,
      fontWeight: item.fontWeight
    });
  }

  // Tulis berkas laporan lengkap
  const reportPath = path.join(OUT_DIR, 'comprehensive-deep-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf8');
  console.log(`\n=== LAPORAN AUDIT MENDALAM SELESAI DITULIS: ${reportPath} ===`);
  console.log(JSON.stringify(auditReport, null, 2));

  await browser.close();
}

runComprehensiveAudit().catch(err => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
