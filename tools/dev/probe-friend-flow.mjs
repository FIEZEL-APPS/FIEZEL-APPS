/**
 * tools/dev/probe-friend-flow.mjs
 *
 * Probe Playwright Headless Chromium untuk verifikasi empiris alur pertemanan FIEZEL:
 * 1. Alur pembuatan kode undangan (minting) dan persistensi kode setelah reload halaman.
 * 2. Pencegahan double-click & race condition pada tombol penukaran kode (socialRedeem).
 * 3. Penanganan tautan profil ?friend=@handle dan pembersihan URL cleanFriendUrl().
 * 4. Pencegahan penambahan ID sendiri (self-add guard) baik via input maupun deep link.
 * 5. Audit rasio kontras WCAG 2.1 untuk elemen kode undangan dan handle murid di dalam modal.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

// Helper matematika WCAG 2.1 Contrast Ratio
function parseColor(str) {
  if (!str) return { r: 0, g: 0, b: 0, a: 1 };
  const s = str.trim().toLowerCase();
  if (s.startsWith('rgb')) {
    const m = s.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (m) {
      return {
        r: parseFloat(m[1]),
        g: parseFloat(m[2]),
        b: parseFloat(m[3]),
        a: m[4] !== undefined ? parseFloat(m[4]) : 1
      };
    }
  }
  if (s.startsWith('#')) {
    const hex = s.replace('#', '');
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1
      };
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

function channelLuminance(val) {
  const c = val / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function blendColor(fg, bg) {
  const alpha = fg.a;
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
    a: 1
  };
}

function calculateContrast(fgColorStr, bgColorStr, backdropStr = '#111118') {
  const fg = parseColor(fgColorStr);
  const bg = parseColor(bgColorStr);
  const backdrop = parseColor(backdropStr);

  const effectiveBg = bg.a < 1 ? blendColor(bg, backdrop) : bg;
  const effectiveFg = fg.a < 1 ? blendColor(fg, effectiveBg) : fg;

  const lum1 = relativeLuminance(effectiveFg.r, effectiveFg.g, effectiveFg.b);
  const lum2 = relativeLuminance(effectiveBg.r, effectiveBg.g, effectiveBg.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

async function runProbe() {
  console.log('================================================================');
  console.log('🚀 MEMULAI PROBE PLAYWRIGHT: EMPIRICAL FRIEND FLOW & QUALITY');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block'
  });

  // Pelacakan panggilan jaringan backend
  let inviteMintCalls = 0;
  let redeemCalls = 0;
  let addCalls = [];

  let simulatedMintedCode = 'K3JQ7W2A';
  let simulatedExpiresDay = '2026-10-23';

  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());

    if (url.origin.includes('api.test') || url.pathname.includes('/api/') || url.host.includes('api.fiezel.my.id')) {
      // 1. Config endpoint
      if (url.pathname.includes('/api/config')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            flags: { cfSocialEnabled: true },
            enabled: { social: true }
          })
        });
      }

      // 2. Auth anon
      if (url.pathname.includes('/api/auth/anon')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true })
        });
      }

      // 3. Auth session
      if (url.pathname.includes('/api/auth/session')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, signedIn: true, role: 'murid' })
        });
      }

      // 4. Profile Me
      if (url.pathname.includes('/api/social/profile/me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            profile: {
              handle: 'kargasasa',
              displayName: 'Kargasasa',
              avatarId: 0,
              streakDays: 7,
              createdDay: '2026-08-01',
              flags: { friendsVisible: true, leagueOptIn: false, boardHidden: false }
            }
          })
        });
      }

      // 5. Friends list & requests
      if (url.pathname.endsWith('/api/social/friends')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            friends: [],
            cheersToday: []
          })
        });
      }

      if (url.pathname.includes('/api/social/friends/requests')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            requests: []
          })
        });
      }

      // 6. Stage Active
      if (url.pathname.includes('/api/stage/active')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            stages: []
          })
        });
      }

      // 7. Mint Invite Code (/api/social/friends/invite)
      if (url.pathname.includes('/api/social/friends/invite')) {
        inviteMintCalls++;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: {
              code: simulatedMintedCode,
              expiresDay: simulatedExpiresDay
            },
            code: simulatedMintedCode,
            expiresDay: simulatedExpiresDay
          })
        });
      }

      // 8. Redeem Invite Code (/api/social/friends/redeem) dengan delay sintetis
      if (url.pathname.includes('/api/social/friends/redeem')) {
        redeemCalls++;
        // Sengaja tambahkan jeda 400ms untuk membuktikan pencegahan double-click
        await new Promise((resolve) => setTimeout(resolve, 400));
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: {
              friend: {
                handle: 'budi_temanku',
                visible: true,
                studiedToday: false
              }
            }
          })
        });
      }

      // 9. Add Friend (/api/social/friends/add)
      if (url.pathname.includes('/api/social/friends/add')) {
        const postData = route.request().postDataJSON() || {};
        addCalls.push(postData);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            status: 'pending',
            friend: {
              handle: postData.handle || 'teman_baru'
            }
          })
        });
      }

      // Fallback API
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: {} })
      });
    }

    // Melayani file lokal
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const p = path.resolve(ROOT, rel || 'index.html');
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) {
      return route.abort();
    }

    const contentType = p.endsWith('.css') ? 'text/css'
      : p.endsWith('.js') || p.endsWith('.mjs') ? 'text/javascript'
      : p.endsWith('.json') ? 'application/json'
      : p.endsWith('.png') ? 'image/png'
      : p.endsWith('.svg') ? 'image/svg+xml'
      : 'text/html';

    route.fulfill({
      body: fs.readFileSync(p),
      contentType
    });
  });

  // State inisial simulasi: murid @kargasasa terotentikasi (preservasi saat reload)
  await context.addInitScript(() => {
    try {
      if (!localStorage.getItem('fiezel-auth-v1')) {
        localStorage.setItem('fiezel-auth-v1', JSON.stringify({
          v: 1,
          signedIn: true,
          at: Date.now(),
          role: 'murid',
          via: 'google'
        }));
        localStorage.setItem('fz_user_name', 'Kargasasa');
        localStorage.setItem('fz_onboarding_done', '1');
        localStorage.setItem('fz_auth_skip', '1');
        localStorage.setItem('fz.google.email', 'kargasasa@example.com');
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({
          done: true,
          name: 'Kargasasa',
          step: 'done'
        }));
        localStorage.setItem('fiezel-v4-state', JSON.stringify({
          userName: 'Kargasasa',
          streak: 7,
          xp: 340,
          preferences: { socialHandle: 'kargasasa', dailyGoalMinutes: 15 }
        }));
        localStorage.setItem('fz_preferences', JSON.stringify({
          socialHandle: 'kargasasa',
          dailyGoalMinutes: 15
        }));
        localStorage.setItem('fiezel-tour-v1', 'finish');
      }
      window.FIEZEL_CF_CONFIG = {
        enabled: true,
        base: 'https://api.test',
        endpoints: { health: 'on', config: 'on', auth: 'on', quota: 'on', ai: 'on', tts: 'on', usage: 'on' }
      };
    } catch (_) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Bersihkan splash/overlay jika ada
  await page.evaluate(() => {
    try { window.skipPuterSignIn?.(); } catch (_) {}
    try { window.dismissWelcome?.(); } catch (_) {}
    try { window.FiezelSplash?.dismiss?.(); } catch (_) {}
    try { window.FiezelTour?.end?.(); } catch (_) {}
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, #authGate').forEach(el => el.remove());
    document.documentElement.classList.remove('fz-booting');
    document.body.classList.remove('fz-booting', 'fz-auth-open');
  });

  let testPassed = true;

  // =========================================================================
  // SKENARIO 1: PEMBUATAN KODE (MINTING) & PERSISTENSI SETELAH RELOAD
  // =========================================================================
  console.log('----------------------------------------------------------------');
  console.log('[TEST 1] Uji alur pembuatan kode (minting) & verifikasi persistensi');
  console.log('----------------------------------------------------------------');

  // Bersihkan tiket lama sebelum mulai test 1
  await page.evaluate(async () => {
    localStorage.removeItem('fiezel-social-invite-last-v1');
    if (typeof go === 'function') go('online');
    if (typeof switchOnlineTab === 'function') switchOnlineTab('teman');
  });

  // Tunggu tab teman selesai dimuat (attached di DOM)
  await page.waitForSelector('#socialMintBtn', { state: 'attached', timeout: 4000 });

  // Mint kode undangan
  await page.evaluate(async () => {
    await socialMintInvite();
  });

  // Tunggu kode render di DOM (setelah mint, <details> terbuka otomatis sehingga visible)
  await page.waitForSelector('#socialInviteCode', { state: 'attached', timeout: 4000 });

  const mintResult = await page.evaluate(() => {
    const stored = window.getStoredSocialInvite ? window.getStoredSocialInvite() : null;
    const storedRaw = localStorage.getItem('fiezel-social-invite-last-v1');
    const elText = document.getElementById('socialInviteCode')?.innerText?.trim() || null;
    return { stored, storedRaw, elText };
  });

  console.log('  Hasil mint stored:', mintResult.stored);
  console.log('  Hasil mint di localStorage:', mintResult.storedRaw);
  console.log('  Hasil teks elemen #socialInviteCode:', mintResult.elText);

  if (!mintResult.stored || mintResult.stored.code !== 'K3JQ7W2A') {
    console.error('  ❌ FAIL: getStoredSocialInvite() tidak memuat kode K3JQ7W2A!');
    testPassed = false;
  }
  if (!mintResult.storedRaw || !mintResult.storedRaw.includes('K3JQ7W2A')) {
    console.error('  ❌ FAIL: localStorage fiezel-social-invite-last-v1 tidak tersimpan!');
    testPassed = false;
  }
  if (mintResult.elText !== 'K3JQ7W2A') {
    console.error('  ❌ FAIL: DOM #socialInviteCode tidak menampilkan kode K3JQ7W2A!');
    testPassed = false;
  }

  // Reload halaman dan verifikasi persistensi
  console.log('  Melakukan page.reload() untuk menguji persistensi...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Buka tab online -> teman
  await page.evaluate(() => {
    if (typeof go === 'function') go('online');
    if (typeof switchOnlineTab === 'function') switchOnlineTab('teman');
  });

  // Tunggu DOM terhidrasi dengan kode persisten
  await page.waitForSelector('#socialInviteCode', { state: 'attached', timeout: 4000 });

  const persistedResult = await page.evaluate(() => {
    const stored = window.getStoredSocialInvite ? window.getStoredSocialInvite() : null;
    const elText = document.getElementById('socialInviteCode')?.innerText?.trim() || null;
    const detailsOpen = document.querySelector('details.fz2-more')?.hasAttribute('open');
    return { stored, elText, detailsOpen };
  });

  console.log('  Setelah reload - stored:', persistedResult.stored);
  console.log('  Setelah reload - DOM #socialInviteCode:', persistedResult.elText);
  console.log('  Setelah reload - <details class="fz2-more"> open:', persistedResult.detailsOpen);

  if (!persistedResult.stored || persistedResult.stored.code !== 'K3JQ7W2A') {
    console.error('  ❌ FAIL: getStoredSocialInvite() gagal memuat kode tersimpan setelah reload!');
    testPassed = false;
  } else if (persistedResult.elText !== 'K3JQ7W2A') {
    console.error('  ❌ FAIL: DOM #socialInviteCode tidak menampilkan kode persisten setelah reload!');
    testPassed = false;
  } else if (!persistedResult.detailsOpen) {
    console.error('  ❌ FAIL: <details class="fz2-more"> tidak dalam status open saat memiliki tiket aktif!');
    testPassed = false;
  } else {
    console.log('  ✅ PASS: Kode undangan berhasil dibuat, disimpan, dan bertahan setelah reload.');
  }

  // =========================================================================
  // SKENARIO 2: PENCEGAHAN DOUBLE-CLICK PADA TOMBOL PENUKARAN KODE
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('[TEST 2] Uji pencegahan double-click & busy lock pada socialRedeem');
  console.log('----------------------------------------------------------------');

  redeemCalls = 0; // reset counter

  // Pastikan berada di tab teman dan input telah ter-render
  await page.evaluate(async () => {
    go('online');
    if (typeof switchOnlineTab === 'function') switchOnlineTab('teman');
  });

  // Tunggu selector input redeem muncul (attached)
  await page.waitForSelector('#socialRedeemInput', { state: 'attached', timeout: 4000 });
  await page.evaluate(() => {
    const inp = document.getElementById('socialRedeemInput');
    if (inp) inp.value = 'M8NPQRST';
  });

  const doubleClickTest = await page.evaluate(async () => {
    const btn = document.getElementById('socialRedeemBtn') || document.querySelector('button[onclick*="socialRedeem"]');

    // Memicu klik pertama
    const p1 = socialRedeem();

    // Segera periksa status busy dan disabled tombol saat in-flight
    const isBusyDuring = window.socialRedeemBusy === true;
    const isDisabledDuring = btn ? btn.disabled === true : false;

    // Memicu klik kedua seketika saat in-flight (simulasi double-click agresif)
    const p2 = socialRedeem();

    await Promise.all([p1, p2]);

    const isBusyAfter = window.socialRedeemBusy === true;
    const isDisabledAfter = btn ? btn.disabled === true : false;

    return {
      isBusyDuring,
      isDisabledDuring,
      isBusyAfter,
      isDisabledAfter
    };
  });

  console.log('  Status busy saat request berlangsung:', doubleClickTest.isBusyDuring);
  console.log('  Status tombol disabled saat in-flight:', doubleClickTest.isDisabledDuring);
  console.log('  Status busy setelah request selesai:', doubleClickTest.isBusyAfter);
  console.log('  Jumlah panggilan network ke /api/social/friends/redeem:', redeemCalls);

  if (redeemCalls !== 1) {
    console.error(`  ❌ FAIL: Terjadi ${redeemCalls} panggilan API! Double-click gagal dicegah!`);
    testPassed = false;
  } else if (!doubleClickTest.isBusyDuring && !doubleClickTest.isDisabledDuring) {
    console.error('  ❌ FAIL: socialRedeemBusy atau tombol disabled tidak aktif selama request!');
    testPassed = false;
  } else {
    console.log('  ✅ PASS: Double-click berhasil diblokir total; hanya 1 panggilan API yang dieksekusi.');
  }

  // =========================================================================
  // SKENARIO 3: TAUTAN PROFIL ?friend=@handle & cleanFriendUrl()
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('[TEST 3] Uji penanganan tautan profil ?friend=@handle & cleanFriendUrl()');
  console.log('----------------------------------------------------------------');

  await page.goto('http://localhost:8080/index.html?friend=@andi_pratama', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Tunggu modal tombol kirim permintaan terbuka
  await page.waitForSelector('#socialFriendLinkBtn', { timeout: 3000 }).catch(() => {});

  const urlCleanupCheck = await page.evaluate(() => {
    const search = window.location.search;
    const modal = document.getElementById('modalPanel');
    const modalHtml = modal ? modal.innerHTML : '';
    const hasSendBtn = !!document.getElementById('socialFriendLinkBtn');
    return {
      search,
      modalOpen: modal && modalHtml.includes('andi_pratama'),
      hasSendBtn
    };
  });

  console.log('  URL search setelah boot:', urlCleanupCheck.search || '(kosong)');
  console.log('  Modal pertemanan terbuka untuk @andi_pratama:', urlCleanupCheck.modalOpen);
  console.log('  Tombol konfirmasi kirim tautan ada:', urlCleanupCheck.hasSendBtn);

  if (urlCleanupCheck.search.includes('friend=')) {
    console.error('  ❌ FAIL: Parameter ?friend= masih ada di address bar! cleanFriendUrl() gagal!');
    testPassed = false;
  } else if (!urlCleanupCheck.modalOpen && !urlCleanupCheck.hasSendBtn) {
    console.error('  ❌ FAIL: Lembar pertemanan tidak terbuka untuk tautan profil!');
    testPassed = false;
  } else {
    console.log('  ✅ PASS: Tautan profil ditangani, modal terbuka, dan URL dibersihkan via cleanFriendUrl().');
  }

  // Verifikasi reload tidak memunculkan modal loop karena URL sudah bersih
  await page.evaluate(() => { if (typeof closeModal === 'function') closeModal(); });
  await page.waitForTimeout(200);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const loopCheck = await page.evaluate(() => {
    const modal = document.getElementById('modalPanel');
    return modal && modal.innerHTML.includes('socialFriendLinkBtn');
  });

  if (loopCheck) {
    console.error('  ❌ FAIL: Modal muncul kembali setelah reload (modal loop regresi)!');
    testPassed = false;
  } else {
    console.log('  ✅ PASS: URL bersih terverifikasi; tidak ada loop modal saat muat ulang.');
  }

  // =========================================================================
  // SKENARIO 4: PENCEGAHAN PENAMBAHAN ID SENDIRI (SELF-ADD GUARD)
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('[TEST 4] Uji pencegahan penambahan ID sendiri (Self-Add Guard)');
  console.log('----------------------------------------------------------------');

  addCalls = []; // reset counter

  // 4A. Coba tambah ID sendiri via form input
  await page.evaluate(async () => {
    go('online');
    if (typeof switchOnlineTab === 'function') switchOnlineTab('teman');
  });
  await page.waitForSelector('#socialAddInput', { state: 'attached', timeout: 3000 });
  await page.fill('#socialAddInput', '@kargasasa');

  const selfAddFormResult = await page.evaluate(async () => {
    if (typeof socialAddByHandle === 'function') {
      await socialAddByHandle();
    }
    const toast = document.querySelector('.toast')?.innerText || '';
    return { toast };
  });

  console.log('  Hasil submit ID sendiri @kargasasa via form:', selfAddFormResult.toast);

  // 4B. Coba tambah ID sendiri via tautan friendLinkBoot
  const selfAddLinkResult = await page.evaluate(() => {
    history.pushState(null, '', '/index.html?friend=@kargasasa');
    const bootResult = friendLinkBoot();
    const toast = document.querySelector('.toast')?.innerText || '';
    return { bootResult, toast };
  });

  console.log('  Hasil tautan profil ID sendiri @kargasasa:', selfAddLinkResult.toast);
  console.log('  Panggilan network add friend yang terkirim ke server:', addCalls.length);

  if (addCalls.length > 0) {
    console.error('  ❌ FAIL: Server menerima permintaan add friend untuk ID sendiri!');
    testPassed = false;
  } else if (!selfAddFormResult.toast && !selfAddLinkResult.toast) {
    console.error('  ❌ FAIL: Tidak ada pesan toast pencegahan penambahan ID sendiri!');
    testPassed = false;
  } else {
    console.log('  ✅ PASS: Penambahan ID sendiri berhasil dicegah secara elegan di kedua jalur.');
  }

  // =========================================================================
  // SKENARIO 5: AUDIT RASIO KONTRAS ELEMEN KODE UNDANGAN & HANDLE DI MODAL
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('[TEST 5] Uji rasio kontras elemen kode undangan & handle murid di modal');
  console.log('----------------------------------------------------------------');

  // Buka modal profil QR untuk memeriksa kontras handle ID
  await page.evaluate(() => {
    if (typeof openProfileQr === 'function') openProfileQr();
  });
  await page.waitForTimeout(400);

  const modalHandleContrast = await page.evaluate(() => {
    const el = document.querySelector('#modalPanel .fz2-myid') || document.querySelector('.fz2-myid');
    if (!el) return null;
    const cs = window.getComputedStyle(el);
    return {
      color: cs.color,
      bgColor: cs.backgroundColor,
      text: el.innerText.trim()
    };
  });

  // Buka lembar kode undangan untuk memeriksa kontras kode
  await page.evaluate(() => {
    if (typeof openSocialInviteSheet === 'function') {
      openSocialInviteSheet({ code: 'K3JQ7W2A', kind: 'friend' });
    }
  });
  await page.waitForTimeout(400);

  const modalCodeContrast = await page.evaluate(() => {
    const el = document.querySelector('#modalPanel .social-code') || document.querySelector('.social-code');
    if (!el) return null;
    const cs = window.getComputedStyle(el);
    return {
      color: cs.color,
      bgColor: cs.backgroundColor,
      text: el.innerText.trim()
    };
  });

  // Uji kontras tombol Tolak
  const rejectBtnContrast = await page.evaluate(() => {
    const dummy = document.createElement('div');
    dummy.innerHTML = `
      <div id="modalPanel" class="modal-panel">
        <div id="connectRequestsList">
          <div class="social-request-row">
            <button type="button" class="text-button" id="testRejectBtn">Tolak</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(dummy);
    const btn = document.getElementById('testRejectBtn');
    const cs = window.getComputedStyle(btn);
    const result = {
      color: cs.color,
      bgColor: cs.backgroundColor
    };
    dummy.remove();
    return result;
  });

  console.log('  Data visual modal handle ID:', modalHandleContrast);
  console.log('  Data visual modal kode undangan:', modalCodeContrast);
  console.log('  Data visual tombol Tolak:', rejectBtnContrast);

  if (modalCodeContrast) {
    const ratioCode = calculateContrast(modalCodeContrast.color, modalCodeContrast.bgColor, '#111118');
    console.log(`  📊 Rasio Kontras Kode Undangan (.social-code): ${ratioCode.toFixed(2)}:1`);
    if (ratioCode < 7.0) {
      console.error(`  ❌ FAIL: Rasio kontras kode undangan (${ratioCode.toFixed(2)}:1) < 7:1 (Target AAA)!`);
      testPassed = false;
    } else {
      console.log(`  ✅ PASS: Kontras kode undangan memenuhi standar WCAG AAA (${ratioCode.toFixed(2)}:1 >= 7:1).`);
    }
  } else {
    console.error('  ❌ FAIL: Elemen .social-code tidak ditemukan di modal!');
    testPassed = false;
  }

  if (modalHandleContrast) {
    const ratioHandle = calculateContrast(modalHandleContrast.color, modalHandleContrast.bgColor, '#111118');
    console.log(`  📊 Rasio Kontras Handle Murid (.fz2-myid): ${ratioHandle.toFixed(2)}:1`);
    if (ratioHandle < 7.0) {
      console.error(`  ❌ FAIL: Rasio kontras handle murid (${ratioHandle.toFixed(2)}:1) < 7:1 (Target AAA)!`);
      testPassed = false;
    } else {
      console.log(`  ✅ PASS: Kontras handle murid memenuhi standar WCAG AAA (${ratioHandle.toFixed(2)}:1 >= 7:1).`);
    }
  } else {
    console.error('  ❌ FAIL: Elemen .fz2-myid tidak ditemukan di modal!');
    testPassed = false;
  }

  if (rejectBtnContrast) {
    const ratioReject = calculateContrast(rejectBtnContrast.color, '#F8FAFC');
    console.log(`  📊 Rasio Kontras Tombol Tolak: ${ratioReject.toFixed(2)}:1`);
    if (ratioReject < 4.5) {
      console.error(`  ❌ FAIL: Rasio kontras tombol Tolak (${ratioReject.toFixed(2)}:1) < 4.5:1 (Target AA)!`);
      testPassed = false;
    } else {
      console.log(`  ✅ PASS: Kontras tombol Tolak memenuhi standar WCAG AA (${ratioReject.toFixed(2)}:1 >= 4.5:1).`);
    }
  }

  await browser.close();

  console.log('\n================================================================');
  if (testPassed) {
    console.log('🎉 SEMUA 5 SKENARIO PENGUJIAN FRIEND FLOW PLAYWRIGHT: LULUS (PASS)');
    console.log('================================================================');
    process.exit(0);
  } else {
    console.error('💥 ADA SKENARIO YANG GAGAL (FAIL)');
    console.log('================================================================');
    process.exit(1);
  }
}

runProbe().catch((err) => {
  console.error('[PROBE UNCAUGHT ERROR]', err);
  process.exit(1);
});
