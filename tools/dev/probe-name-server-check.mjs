import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block'
  });

  await context.route('**/*', r => {
    const url = new URL(r.request().url());
    if (url.pathname.includes('/api/')) {
      console.log('[PROBE ROUTE API]:', r.request().method(), url.pathname);
    }
    if (url.pathname.includes('/api/social/profile/check')) {
      const raw = r.request().postData();
      console.log('profileCheck raw postData:', raw);
      let body = {};
      try { body = JSON.parse(raw); } catch (_) {}
      const handle = String(body.handle || '').toLowerCase();
      console.log('profileCheck parsed handle:', handle);
      // Handle 'fitra' is taken on server
      if (handle === 'fitra') {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: { available: false } })
        });
      }
      // Any other handle is available
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { available: true } })
      });
    }

    if (url.pathname.includes('/api/social/profile/me')) {
      return r.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'profile_required' })
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
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Clean overlays and set CF config base for mock API
  await page.evaluate(() => {
    window.FIEZEL_CF_CONFIG = { base: 'http://localhost:3000' };
    try { window.skipPuterSignIn?.(); } catch (_) {}
    try { window.dismissWelcome?.(); } catch (_) {}
    try { window.FiezelSplash?.dismiss?.(); } catch (_) {}
    try { window.FiezelTour?.end?.(); } catch (_) {}
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-splash-canvas, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour, .toast, #fiezelDiagHost, #fiezelDiagOpen').forEach(el => el.remove());
    document.documentElement.classList.remove('fz-booting');
    document.body.classList.remove('fz-booting', 'fz-auth-open');
  });

  // TEST 1: Direct function validation check
  console.log('--- TEST 1: validateLearnerNameAvailability ---');
  const resDuplicate = await page.evaluate(async () => {
    return await validateLearnerNameAvailability('Fitra');
  });
  console.log('Hasil untuk nama "Fitra" (handle @fitra sudah ada di server):', resDuplicate);

  const resNew = await page.evaluate(async () => {
    return await validateLearnerNameAvailability('Budi Pratama');
  });
  console.log('Hasil untuk nama "Budi Pratama" (handle @budi_pratama baru di server):', resNew);

  if (resDuplicate.ok !== false || resDuplicate.error !== 'handle_taken') {
    throw new Error('TEST 1 GAGAL: Nama duplikat harus ditolak dengan error handle_taken!');
  }
  if (resNew.ok !== true) {
    throw new Error('TEST 1 GAGAL: Nama baru harus diterima!');
  }

  // TEST 2: Onboarding DOM Validation UI
  console.log('\n--- TEST 2: Interaksi Onboarding Langkah Nama ---');
  const domTest = await page.evaluate(async () => {
    // Open onboarding explicitly
    const ob = self.FiezelOnboarding;
    let finishReached = false;
    let lastStep = null;
    ob.show(window, {
      now: Date.now(),
      force: true,
      validateName: window.validateLearnerNameAvailability,
      onName: ({ name }) => { window.setLearnerName(name); },
      onCourse: () => {},
      onGoal: () => {},
      onPlacement: () => {},
      onFinish: () => { finishReached = true; }
    });

    const host = document.querySelector('.fiezel-ob');
    if (!host) return { error: 'host_not_found' };

    // Select Indonesian locale if dialog is open
    const idBtn = host.querySelector('[data-ob-locale="id"]');
    if (idBtn) idBtn.click();
    await new Promise(r => setTimeout(r, 100));

    // Type name "Fitra"
    const inp = host.querySelector('[data-ob-name]');
    if (!inp) return { error: 'input_not_found' };
    inp.value = 'Fitra';
    inp.dispatchEvent(new Event('input', { bubbles: true }));

    // Advance
    const adv = host.querySelector('[data-ob-advance]');
    adv.click();

    // Wait for async validation
    await new Promise(r => setTimeout(r, 300));

    const errBox = host.querySelector('[data-ob-name-error]');
    const errorVisible = errBox && errBox.style.display !== 'none';
    const errorText = errBox ? errBox.textContent : '';
    const stillNameStep = !!host.querySelector('[data-ob-step="name"]');

    // Now change name to "Budi Pratama"
    inp.value = 'Budi Pratama';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    const errorHiddenOnType = errBox && errBox.style.display === 'none';

    // Advance again
    adv.click();
    for (let i = 0; i < 25; i++) {
      if (host.querySelector('[data-ob-step="course"]')) break;
      await new Promise(r => setTimeout(r, 100));
    }

    const advancedToCourse = !!host.querySelector('[data-ob-step="course"]');

    return {
      errorVisible,
      errorText,
      stillNameStep,
      errorHiddenOnType,
      advancedToCourse
    };
  });

  console.log('Error duplikat muncul:', domTest.errorVisible);
  console.log('Pesan penolakan:', domTest.errorText);
  console.log('Tertahan di langkah nama saat duplikat:', domTest.stillNameStep);
  console.log('Error otomatis hilang saat mengetik nama baru:', domTest.errorHiddenOnType);
  console.log('Berhasil lanjut saat nama baru:', domTest.advancedToCourse);

  if (!domTest.errorVisible || !domTest.stillNameStep || !domTest.advancedToCourse) {
    throw new Error('TEST 2 GAGAL: Onboarding harus menolak nama duplikat dan menerima nama baru!');
  }

  // TEST 3: registerStudentOnce rejection when handle_taken
  console.log('\n--- TEST 3: registerStudentOnce Server Check ---');
  const regDuplicate = await page.evaluate(async () => {
    return await registerStudentOnce({ name: 'Fitra' });
  });
  console.log('registerStudentOnce dengan nama "Fitra":', regDuplicate);

  const regNew = await page.evaluate(async () => {
    return await registerStudentOnce({ name: 'Budi Pratama' });
  });
  console.log('registerStudentOnce dengan nama baru "Budi Pratama":', regNew);

  if (regDuplicate.ok !== false || regDuplicate.error !== 'handle_taken') {
    throw new Error('TEST 3 GAGAL: registerStudentOnce harus menolak handle_taken!');
  }
  if (regNew.ok !== true) {
    throw new Error('TEST 3 GAGAL: registerStudentOnce harus berhasil untuk nama baru!');
  }

  console.log('\n=== SEMUA TES PROBE VALIDASI SERVER LULUS 100% ===');
  await browser.close();
}

runAudit().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});
