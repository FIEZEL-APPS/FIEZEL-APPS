import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

async function run() {
  console.log('[PROBE] Memulai verifikasi otomatis Playwright untuk auto-sync handle...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block'
  });

  let serverHandle = 'fitrah'; // Server awalnya menyimpan handle 'fitrah' (residu email)
  let renameCalls = [];

  await context.route('**/*', r => {
    const url = new URL(r.request().url());

    if (url.origin.includes('api.test') || url.pathname.includes('/api/')) {
      if (url.pathname.includes('/api/config')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            flags: { cfSocialEnabled: true },
            enabled: { social: true }
          })
        });
      }

      if (url.pathname.includes('/api/auth/anon')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true })
        });
      }

      if (url.pathname.includes('/api/social/profile/me')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            profile: {
              handle: serverHandle,
              displayName: 'kargasasa',
              avatarId: 0,
              streakDays: 5,
              createdDay: '2026-08-01',
              flags: { friendsVisible: true, leagueOptIn: true, boardHidden: false }
            }
          })
        });
      }

      if (url.pathname.includes('/api/social/profile/rename')) {
        const postData = r.request().postDataJSON();
        renameCalls.push(postData);
        serverHandle = postData.handle;
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            profile: {
              handle: serverHandle,
              displayName: 'kargasasa',
              avatarId: 0,
              streakDays: 5,
              createdDay: '2026-08-01',
              flags: { friendsVisible: true, leagueOptIn: true, boardHidden: false }
            }
          })
        });
      }

      if (url.pathname.includes('/api/social/profile/check')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, available: true })
        });
      }

      if (url.pathname.includes('/api/social/rank/board/friends')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            rows: [],
            me: { handle: serverHandle, pb: 120 }
          })
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

  // Pasang state simulasi user lama: nama profil 'kargasasa', tapi login Google 'fitrah@gmail.com'
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('fz_user_name', 'kargasasa');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fz.google.email', 'fitrah@gmail.com');
      localStorage.setItem('fiezel-google-v1', JSON.stringify({
        email: 'fitrah@gmail.com',
        name: 'kargasasa',
        at: Date.now()
      }));
      localStorage.setItem('fiezel-v4-state', JSON.stringify({
        userName: 'kargasasa',
        streak: 7,
        xp: 340,
        preferences: { socialHandle: 'fitrah', dailyGoalMinutes: 15 }
      }));
      localStorage.setItem('fz_preferences', JSON.stringify({
        socialHandle: 'fitrah',
        dailyGoalMinutes: 15
      }));
      localStorage.setItem('fiezel-tour-v1', 'finish');
      window.FIEZEL_CF_CONFIG = { base: 'https://api.test' };
    } catch (_) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // 1. Verifikasi Cockpit Profil:
  await page.evaluate(() => {
    if (typeof window.go === 'function') window.go('profile');
  });
  await page.waitForTimeout(600);

  const cockpitText = await page.evaluate(() => {
    const el = document.getElementById('viewProfile');
    return el ? el.innerText : '';
  });

  console.log('[PROBE] Memeriksa teks Cockpit Profil...');
  if (!cockpitText.includes('@kargasasa')) {
    console.error('[PROBE FAIL] Cockpit tidak menampilkan @kargasasa! Teks cockpit:', cockpitText.slice(0, 300));
    process.exit(1);
  }
  if (cockpitText.includes('@fitrah')) {
    console.error('[PROBE FAIL] Cockpit masih membocorkan @fitrah!');
    process.exit(1);
  }
  console.log('[PROBE PASS] Cockpit langsung menampilkan @kargasasa tanpa bocoran @fitrah.');

  // 2. Verifikasi panggilan rename ke server:
  await page.waitForTimeout(600);
  console.log('[PROBE] Memeriksa panggilan auto-sync ke server...');
  if (renameCalls.length === 0) {
    console.error('[PROBE FAIL] /api/social/profile/rename tidak dipanggil untuk migrasi!');
    process.exit(1);
  }
  const lastCall = renameCalls[renameCalls.length - 1];
  if (lastCall.handle !== 'kargasasa') {
    console.error('[PROBE FAIL] Rename dipanggil dengan handle yang salah:', lastCall);
    process.exit(1);
  }
  console.log('[PROBE PASS] Server endpoint /api/social/profile/rename berhasil dipanggil dengan handle:', lastCall.handle);

  // 3. Verifikasi QR Modal:
  console.log('[PROBE] Membuka QR modal...');
  await page.evaluate(() => {
    if (typeof window.openProfileQr === 'function') window.openProfileQr();
  });
  await page.waitForTimeout(400);

  const qrIdText = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="profile-qr-id"]');
    return el ? el.innerText : '';
  });
  if (!qrIdText.includes('@kargasasa')) {
    console.error('[PROBE FAIL] QR modal tidak menampilkan @kargasasa! Ditemukan:', qrIdText);
    process.exit(1);
  }
  console.log('[PROBE PASS] QR modal menampilkan:', qrIdText);

  // 4. Verifikasi copy ID:
  const copiedHandle = await page.evaluate(() => {
    return window.effectiveLearnerSocialHandle();
  });
  if (copiedHandle !== 'kargasasa') {
    console.error('[PROBE FAIL] effectiveLearnerSocialHandle() mengembalikan:', copiedHandle);
    process.exit(1);
  }
  console.log('[PROBE PASS] effectiveLearnerSocialHandle() mengembalikan:', copiedHandle);

  console.log('[PROBE SUKSES] Seluruh pemeriksaan Playwright untuk migrasi handle otomatis LULUS!');
  await browser.close();
  process.exit(0);
}

run().catch(err => {
  console.error('[PROBE ERROR]', err);
  process.exit(1);
});
