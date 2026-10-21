import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const ARTIFACT_DIR = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\33e21b9d-1f1e-4b8a-9310-d7efe77d2aa2';

async function main() {
  console.log('--- START PROBE: VERIFIKASI LONCENG NOTIFIKASI DI TOPBAR HOME ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block'
  });

  let friendRequestsList = [
    { handle: 'siti_zahra', displayName: 'Siti Zahra', at: Date.now() - 180000 }
  ];

  await context.route('**/*', r => {
    const url = new URL(r.request().url());
    if (url.origin.includes('api.test') || url.pathname.includes('/api/')) {
      if (url.pathname.includes('/api/auth/session')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, signedIn: true, role: 'murid', handle: 'budi_pratama', name: 'Budi Pratama' })
        });
      }
      if (url.pathname.includes('/api/auth/anon')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true })
        });
      }
      if (url.pathname.includes('/api/config')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, flags: { cfSocialEnabled: true } })
        });
      }
      if (url.pathname.includes('/api/social/friends/requests')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: { requests: friendRequestsList } })
        });
      }
      if (url.pathname.includes('/api/social/friends/accept')) {
        friendRequestsList = friendRequestsList.filter(x => x.handle !== 'siti_zahra');
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: { status: 'friends', friend: { handle: 'siti_zahra' } } })
        });
      }
      if (url.pathname.includes('/api/social/friends/reject')) {
        friendRequestsList = friendRequestsList.filter(x => x.handle !== 'siti_zahra');
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: { status: 'rejected' } })
        });
      }
      if (url.pathname.includes('/api/social/friends')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: { friends: [{ handle: 'rian_p', displayName: 'Rian Pratama' }], cheersToday: [{ handle: 'rian_p', cnt: 3 }] } })
        });
      }
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: {} })
      });
    }

    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const p = path.resolve(ROOT, rel || 'index.html');
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return r.abort();

    const contentType = p.endsWith('.css') ? 'text/css'
      : p.endsWith('.js') ? 'text/javascript'
      : p.endsWith('.json') ? 'application/json'
      : p.endsWith('.png') ? 'image/png'
      : p.endsWith('.svg') ? 'image/svg+xml'
      : 'text/html';

    r.fulfill({
      body: fs.readFileSync(p),
      contentType
    });
  });

  await context.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.FIEZEL_CF_CONFIG = { base: 'http://localhost:3000' };
      localStorage.setItem('fz_user_name', 'Budi Pratama');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fz-tour-done', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Budi Pratama', at: Date.now(), via: 'finish', locale: 'id' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-tour-v1', 'finish');
      localStorage.setItem('fz_today_vocab_visit', '1');
      localStorage.setItem('fz_welcome_dismissed', 'true');
      sessionStorage.setItem('fiezel_boot_count', '2');

      const stateObj = {
        version: '5.19.0',
        userName: 'Budi Pratama',
        view: 'home',
        toursSeen: { menu: true, library: true, listening: true },
        daily: { date: '2026-10-08', count: 5, attempts: 5, meaningful: true },
        streak: 5,
        xp: 150,
        level: 'A1',
        preferences: { learnerLocale: 'id', learnerLocaleExplicit: true, activeLevel: 'A1', motion: false, haptics: true }
      };
      localStorage.setItem('fiezel-v4-state', JSON.stringify(stateObj));
    } catch (_) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Nonaktifkan splash boot screen dan segala tur / backdrop pengganggu click
  await page.evaluate(() => {
    document.getElementById('fiezelBootSplash')?.remove();
    document.documentElement.classList.remove('fz-booting');
  });
  await page.addStyleTag({
    content: '#fiezelBootSplash, .fiezel-splash, .fz-tour, .fz-tour-scrim, [data-tour-card], .fz-ritual-sheet, #fzRitual { display: none !important; pointer-events: none !important; }'
  });

  // Injeksi data notifikasi agar lonceng memiliki tugas guru, permintaan pertemanan, dan sorakan teman
  await page.evaluate(() => {
    // 1. Tugas dari guru via FiezelInbox
    if (self.FiezelInbox) {
      self.FiezelInbox.add({
        id: 'ta-tugas-101',
        kind: 'teacher_assignment',
        aid: 'tugas-101',
        title: 'Persiapan Kuis Unit 3: Phrasal Verbs',
        from: 'Pak Rudi',
        mode: 'latihan',
        count: 10,
        minutes: 15,
        deadline: '10 Okt',
        at: Date.now() - 3600000,
        read: false
      });
    }

    // 2. Permintaan pertemanan
    window.notifCachedRequests = [
      { handle: 'siti_zahra', displayName: 'Siti Zahra', at: Date.now() - 180000 }
    ];
    window.socialRequestCount = 1;

    // 3. Kabar dari teman via FiezelSocialNotify
    if (self.FiezelSocialNotify) {
      self.FiezelSocialNotify.push([
        { kind: 'cheer_received', handle: 'rian_p', count: 3, at: Date.now() - 7200000 }
      ]);
    }

    render();
    refreshNotifBadge();
    updateTemanBadge();
  });

  await page.waitForTimeout(500);

  // 1. Verifikasi Lonceng di Topbar Home
  const notifBtnInfo = await page.evaluate(() => {
    const el = document.getElementById('fzNotifBtn');
    const fr = document.getElementById('topProfileFriendBtn');
    return {
      notifInline: el?.style?.display,
      notifComputed: el ? window.getComputedStyle(el).display : null,
      friendInline: fr?.style?.display,
      friendComputed: fr ? window.getComputedStyle(fr).display : null,
      view: typeof state !== 'undefined' ? state?.view : null
    };
  });
  console.log('[DEBUG NOTIF INFO]', notifBtnInfo);

  const notifBtn = page.locator('#fzNotifBtn');
  const isNotifVisible = await notifBtn.isVisible();
  const badgeText = await page.locator('#fzNotifBadge').textContent();
  console.log(`[TEST 1] fzNotifBtn visible di Home: ${isNotifVisible}, badgeText: ${badgeText}`);

  const shot1 = path.join(ARTIFACT_DIR, '01_home_topbar_lonceng_notifikasi.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log(`[CAPTURED] 01_home_topbar_lonceng_notifikasi.png`);

  // 2. Buka Lembar Notifikasi via Klik Tombol Lonceng
  console.log('[TEST 2] Mengklik tombol lonceng #fzNotifBtn...');
  await notifBtn.click();
  await page.waitForSelector('.notif-sheet', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(600);

  const sheetText = await page.locator('.notif-sheet').textContent();
  const hasTeacher = sheetText.includes('Pak Rudi') || sheetText.includes('Persiapan Kuis');
  const hasFriendReq = sheetText.includes('Siti Zahra') || sheetText.includes('siti_zahra');
  const hasCheer = sheetText.includes('rian_p');
  console.log(`[TEST 2] Sheet terbuka. Mengandung tugas guru: ${hasTeacher}, mengandung permintaan Siti: ${hasFriendReq}, mengandung sorakan Rian: ${hasCheer}`);

  const shot2 = path.join(ARTIFACT_DIR, '02_lembar_notifikasi_semua_kabar.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log(`[CAPTURED] 02_lembar_notifikasi_semua_kabar.png`);

  // 3. Uji Aksi Terima Teman di dalam Notifikasi
  const acceptBtn = page.locator('[data-testid="notif-accept-siti_zahra"]');
  if (await acceptBtn.isVisible()) {
    console.log('[TEST 3] Menekan tombol Terima untuk permintaan Siti Zahra...');
    await acceptBtn.click();
    await page.waitForTimeout(800);
    const postSheetText = await page.locator('.notif-sheet').textContent();
    console.log(`[TEST 3] Setelah diterima, Siti Zahra di pending request: ${postSheetText.includes('siti_zahra')}`);
  }

  // Tutup lembar notifikasi
  const closeBtn = page.locator('[data-testid="notif-close"]');
  if (await closeBtn.isVisible()) {
    console.log('[TEST 3] Menutup lembar notifikasi...');
    await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // 4. Verifikasi Navigasi ke Profil: Lonceng sembunyi, tombol teman+QR muncul
  console.log('[TEST 4] Navigasi ke panel Profil...');
  await page.evaluate(() => {
    go('profile');
  });
  await page.waitForTimeout(800);

  const isNotifOnProfile = await page.locator('#fzNotifBtn').isVisible();
  const isFriendBtnOnProfile = await page.locator('#topProfileFriendBtn').isVisible();
  console.log(`[TEST 4] fzNotifBtn di Profil: ${isNotifOnProfile} (harus false), topProfileFriendBtn di Profil: ${isFriendBtnOnProfile} (harus true)`);

  const shot3 = path.join(ARTIFACT_DIR, '03_profil_topbar_slot_teman_qr.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log(`[CAPTURED] 03_profil_topbar_slot_teman_qr.png`);

  await browser.close();
  console.log('--- SUKSES PROBE EMPIRIS PLAYWRIGHT ---');
}

main().catch(err => {
  console.error('PROBE GAGAL:', err);
  process.exit(1);
});
