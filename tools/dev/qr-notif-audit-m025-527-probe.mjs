import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

async function runProbe() {
  console.log('[PROBE] Memulai audit empiris Playwright untuk Scanner QR, Polling Notif, dan Parser Handle...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['camera']
  });

  // Local static mock router
  await context.route('**/*', r => {
    const url = new URL(r.request().url());
    if (url.pathname.includes('/api/social/friends/requests')) {
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { requests: [] } })
      });
    }
    if (url.pathname.includes('/api/')) {
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

  const page = await context.newPage();
  page.on('pageerror', err => console.error('PAGE ERROR:', err));
  await page.goto('http://localhost/index.html');
  await page.waitForTimeout(1000);

  const results = await page.evaluate(async () => {
    const report = { tests: [] };

    // 1. Uji Regex Parser QR
    const testCases = [
      { input: 'https://fiezel.my.id/app/?friend=rian_guru', expected: 'rian_guru' },
      { input: 'https://fiezel.my.id/app/#friend/siti_pintar', expected: 'siti_pintar' },
      { input: '@dian_pertiwi', expected: 'dian_pertiwi' },
      { input: 'budi_123', expected: 'budi_123' },
      { input: 'halo@gmail.com', expected: null }, // Email TIDAK boleh diekstrak sebagai @gmail
      { input: 'https://google.com/search?q=@test', expected: null },
      { input: 'a'.repeat(25), expected: null } // Lebih dari 20 karakter (panjang batas server 20)
    ];

    for (const tc of testCases) {
      const parsed = window.parseFriendHandleFromQr ? window.parseFriendHandleFromQr(tc.input) : 'fn_missing';
      report.tests.push({
        name: `parseFriendHandleFromQr("${tc.input}")`,
        got: parsed,
        expected: tc.expected,
        pass: parsed === tc.expected
      });
    }

    // 2. Uji Feedback Audio & Debounce pada Scan Invalid
    let sfxCalls = [];
    const origUiSfx = window.uiSfx;
    window.uiSfx = (name) => { sfxCalls.push(name); };

    let toastCalls = [];
    const origToast = window.showToast;
    window.showToast = (msg) => { toastCalls.push(msg); };

    try {
      if (typeof window.handleScannedQrResult === 'function') {
        window.handleScannedQrResult('halo@gmail.com');
      }
    } catch (_) {}

    report.tests.push({
      name: 'handleScannedQrResult(invalid) tidak memutar sfx success',
      sfxCalls: [...sfxCalls],
      pass: !sfxCalls.includes('success')
    });

    window.uiSfx = origUiSfx;
    window.showToast = origToast;

    // 3. Uji Polling Throttle refreshFriendRequestCount
    let apiFetchCount = 0;
    const origSocial = window.FiezelSocial;
    window.FiezelSocial = {
      api: {
        friendRequests: async () => {
          apiFetchCount++;
          return { ok: true, data: { requests: [] } };
        }
      }
    };

    if (typeof window.refreshFriendRequestCount === 'function') {
      await window.refreshFriendRequestCount(); // Panggilan 1
      await window.refreshFriendRequestCount(); // Panggilan 2 (seharusnya kena throttle)
      await window.refreshFriendRequestCount(); // Panggilan 3 (seharusnya kena throttle)
    }

    report.tests.push({
      name: 'refreshFriendRequestCount() throttling (3 panggilan beruntun)',
      apiFetchCount,
      pass: apiFetchCount === 1
    });

    window.FiezelSocial = origSocial;

    // 4. Uji Camera Leak saat Navigasi/Tutup Cepat (Race Condition)
    let tracksCreated = [];
    const origGUM = navigator.mediaDevices ? navigator.mediaDevices.getUserMedia : null;
    let trackStopped = false;
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => {
        // Simulasi latensi getUserMedia
        await new Promise(r => setTimeout(r, 60));
        const track = {
          stop: () => { trackStopped = true; },
          kind: 'video',
          enabled: true
        };
        tracksCreated.push(track);
        return {
          getTracks: () => [track],
          getVideoTracks: () => [track]
        };
      };

      // Panggil modal scan resmi
      const modalPromise = typeof window.openFriendConnectModal === 'function' ? window.openFriendConnectModal('scan') : Promise.resolve();
      // Segera tutup modal sebelum getUserMedia selesai (mensimulasikan race condition murid menutup modal)
      if (typeof window.closeModal === 'function') {
        window.closeModal();
      }
      await modalPromise;
      // Tunggu buffer mikro agar getUserMedia promise selesai dan track dihentikan
      await new Promise(r => setTimeout(r, 100));

      report.tests.push({
        name: 'startQrVideoScan() race condition menutup modal menghentikan track kamera',
        trackStopped,
        pass: trackStopped === true
      });

      if (origGUM) navigator.mediaDevices.getUserMedia = origGUM;
    }

    return report;
  });

  console.log('\n=== HASIL PROBE EMPIRIS ===');
  for (const t of results.tests) {
    console.log(`${t.pass ? 'PASS' : 'FAIL'}: ${t.name} -> dapat=${JSON.stringify(t.got ?? t.sfxCalls ?? t.apiFetchCount ?? t.trackStopped)}, harap=${JSON.stringify(t.expected ?? (t.pass ? 'lulus' : 'gagal'))}`);
  }

  await browser.close();
  return results;
}

runProbe().catch(err => {
  console.error('[PROBE ERROR]', err);
  process.exit(1);
});
