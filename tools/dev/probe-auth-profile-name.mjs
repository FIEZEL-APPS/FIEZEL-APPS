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
      if (url.pathname.includes('/api/auth/session')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, signedIn: true, role: 'murid' })
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

  const page = await context.newPage();
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Clean overlays
  await page.evaluate(() => {
    try { window.skipPuterSignIn?.(); } catch (_) {}
    try { window.dismissWelcome?.(); } catch (_) {}
    try { window.FiezelSplash?.dismiss?.(); } catch (_) {}
    try { window.FiezelTour?.end?.(); } catch (_) {}
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-splash-canvas, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour, .toast, #fiezelDiagHost, #fiezelDiagOpen').forEach(el => el.remove());
    document.documentElement.classList.remove('fz-booting');
    document.body.classList.remove('fz-booting', 'fz-auth-open');
  });

  // TEST SCENARIO A: Google email fitrah@gmail.com, onboarding name "Fitra"
  const scenarioA = await page.evaluate(async () => {
    localStorage.setItem('fz.google.email', 'fitrah@gmail.com');
    // Onboarding sets learner name
    setLearnerName('Fitra');

    const markup = tactileProfileCockpitMarkup({ flag: 'on' });
    const div = document.createElement('div');
    div.innerHTML = markup;

    return {
      name: div.querySelector('.profile-fullname')?.textContent?.trim(),
      handle: div.querySelector('.profile-handle')?.textContent?.trim(),
      myId: div.querySelector('.fz2-myid')?.textContent?.trim(),
      initials: div.querySelector('.profile-avatar-tactile')?.textContent?.trim()
    };
  });

  console.log('=== TEST SCENARIO A (Nama "Fitra", Email fitrah@gmail.com) ===');
  console.log('Full Name:', scenarioA.name);
  console.log('Handle:', scenarioA.handle);
  console.log('ID Kamu:', scenarioA.myId);
  console.log('Initials:', scenarioA.initials);

  // TEST SCENARIO B: Google email fitrah@gmail.com, onboarding name "Budi Pratama"
  const scenarioB = await page.evaluate(async () => {
    setLearnerName('Budi Pratama');

    const markup = tactileProfileCockpitMarkup({ flag: 'on' });
    const div = document.createElement('div');
    div.innerHTML = markup;

    return {
      name: div.querySelector('.profile-fullname')?.textContent?.trim(),
      handle: div.querySelector('.profile-handle')?.textContent?.trim(),
      myId: div.querySelector('.fz2-myid')?.textContent?.trim(),
      initials: div.querySelector('.profile-avatar-tactile')?.textContent?.trim()
    };
  });

  console.log('\n=== TEST SCENARIO B (Nama "Budi Pratama", Email fitrah@gmail.com) ===');
  console.log('Full Name:', scenarioB.name);
  console.log('Handle:', scenarioB.handle);
  console.log('ID Kamu:', scenarioB.myId);
  console.log('Initials:', scenarioB.initials);

  // TEST SCENARIO C: Settings / Ubah Nama to "Ahmad Fauzi"
  const scenarioC = await page.evaluate(async () => {
    setLearnerName('Ahmad Fauzi');

    const markup = tactileProfileCockpitMarkup({ flag: 'on' });
    const div = document.createElement('div');
    div.innerHTML = markup;

    return {
      name: div.querySelector('.profile-fullname')?.textContent?.trim(),
      handle: div.querySelector('.profile-handle')?.textContent?.trim(),
      myId: div.querySelector('.fz2-myid')?.textContent?.trim(),
      initials: div.querySelector('.profile-avatar-tactile')?.textContent?.trim()
    };
  });

  console.log('\n=== TEST SCENARIO C (Ubah Nama "Ahmad Fauzi") ===');
  console.log('Full Name:', scenarioC.name);
  console.log('Handle:', scenarioC.handle);
  console.log('ID Kamu:', scenarioC.myId);
  console.log('Initials:', scenarioC.initials);

  const passA = scenarioA.name === 'Fitra' && scenarioA.handle === '@fitra' && scenarioA.myId === '@fitra';
  const passB = scenarioB.name === 'Budi Pratama' && scenarioB.handle === '@budi_pratama' && scenarioB.myId === '@budi_pratama';
  const passC = scenarioC.name === 'Ahmad Fauzi' && scenarioC.handle === '@ahmad_fauzi' && scenarioC.myId === '@ahmad_fauzi';

  console.log('\n=== VERIFIKASI AKHIR ===');
  console.log('Scenario A (Fitra):', passA ? 'PASS' : 'FAIL');
  console.log('Scenario B (Budi Pratama):', passB ? 'PASS' : 'FAIL');
  console.log('Scenario C (Ahmad Fauzi):', passC ? 'PASS' : 'FAIL');

  await browser.close();

  if (!passA || !passB || !passC) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});
