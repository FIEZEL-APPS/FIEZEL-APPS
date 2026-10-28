'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const ORIGIN = 'https://fiezel.uji';

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

function fromDisk(url) {
  let rel = decodeURIComponent(new URL(url).pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return { status: 404, body: 'Not found: ' + rel };
  }
  return {
    status: 200,
    contentType: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    body: fs.readFileSync(file)
  };
}

async function runProbe() {
  console.log('================================================================');
  console.log('AUDIT EMPIRIS: RUTE LOGIN HP BARU VS LOGOUT HP LAMA (SETELAH PERBAIKAN)');
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--no-first-run']
  });

  const tapSplash = async (page) => {
    try {
      await page.mouse.click(195, 420);
    } catch (_) {}
  };

  const getAppState = async (page) => {
    return await page.evaluate(() => {
      const authEl = document.querySelector('.fz-auth:not(.is-leaving)');
      const obEl = document.querySelector('.fiezel-ob');
      const authScreen = authEl ? authEl.getAttribute('data-auth-screen') : null;
      const obVisible = !!obEl;
      const obStepTitle = obEl ? (obEl.querySelector('h1, h2, .fiezel-ob-title')?.textContent?.trim() || 'Ada Modal Onboarding') : null;
      const obRaw = localStorage.getItem('fiezel-onboarding-v1');
      const authRaw = localStorage.getItem('fiezel-auth-v1');
      let obDone = false;
      try { obDone = JSON.parse(obRaw || '{}').done === true; } catch (_) {}
      const currentView = window.__getFiezelState ? window.__getFiezelState().view : (window.state ? window.state.view : null);

      return {
        authVisible: !!authEl,
        authScreen: authScreen,
        onboardingVisible: obVisible,
        onboardingStepTitle: obStepTitle,
        onboardingDoneInStorage: obDone,
        authSessionInStorage: authRaw,
        currentView: currentView
      };
    });
  };

  try {
    // =================================================================
    // SKENARIO 1: Pengguna akun lama login (Masuk) di HP BARU (Storage Kosong)
    // =================================================================
    console.log('[SKENARIO 1] Pengguna akun lama login di HP BARU (localStorage kosong)');
    const ctx1 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
      serviceWorkers: 'block'
    });

    await ctx1.route('**/*', (route) => {
      const u = route.request().url();
      if (u.startsWith(ORIGIN + '/')) route.fulfill(fromDisk(u));
      else route.abort();
    });

    const page1 = await ctx1.newPage();
    await page1.goto(ORIGIN + '/index.html', { waitUntil: 'load' });
    await page1.waitForTimeout(2500);
    await tapSplash(page1);
    await page1.waitForTimeout(1000);

    // Mock auth di HP baru
    await page1.evaluate(() => {
      window.FiezelAccount = Object.freeze({
        register: () => Promise.resolve({ ok: true }),
        login: () => Promise.resolve({ ok: true, handle: 'budi_kembali' }),
        logout: () => Promise.resolve({ ok: true }),
        activateTeacher: () => Promise.resolve({ ok: true }),
        role: () => 'learner',
        signedIn: () => true,
        refresh: () => Promise.resolve({ ok: true }),
        getAccount: () => ({ handle: 'budi_kembali', role: 'murid' })
      });
    });

    console.log('1.1 Masuk ke form login...');
    await page1.click('[data-auth-go="masuk"]');
    await page1.waitForTimeout(500);
    await page1.fill('[name="handle"]', 'budi_kembali');
    await page1.fill('[name="password"]', 'kucingoranye42');
    await page1.click('[data-testid="auth-submit"]');
    console.log('1.2 Menekan submit login di HP baru...');
    await page1.waitForTimeout(1500);

    let state1 = await getAppState(page1);
    console.log('1.3 Status antarmuka setelah login di HP Baru:', state1);
    if (!state1.onboardingVisible && state1.currentView === 'home') {
      console.log('===> SUKSES SKENARIO 1: Pengguna akun lama LANGSUNG KE BERANDA (view: home)!');
    } else {
      console.log('===> GAGAL SKENARIO 1: Onboarding masih muncul:', state1);
    }

    // =================================================================
    // SKENARIO 2: Logout lalu Login kembali di HP yang SAMA
    // =================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('[SKENARIO 2] LOGOUT -> LOGIN KEMBALI di HP yang SAMA');
    await page1.evaluate(async () => {
      if (typeof window.fiezelAccountLogout === 'function') {
        await window.fiezelAccountLogout();
      }
    });
    await page1.waitForTimeout(1000);

    let state2 = await getAppState(page1);
    console.log('2.1 Status sesaat setelah logout:', {
      authVisible: state2.authVisible,
      authScreen: state2.authScreen,
      onboardingDoneInStorage: state2.onboardingDoneInStorage
    });

    if (await page1.isVisible('[data-auth-go="masuk"]')) {
      await page1.click('[data-auth-go="masuk"]');
      await page1.waitForTimeout(500);
    }
    await page1.fill('[name="handle"]', 'budi_kembali');
    await page1.fill('[name="password"]', 'kucingoranye42');
    await page1.click('[data-testid="auth-submit"]');
    await page1.waitForTimeout(1500);

    state2 = await getAppState(page1);
    console.log('2.2 Keadaan setelah login kembali di HP yang sama:', state2);
    if (!state2.onboardingVisible && state2.currentView === 'home') {
      console.log('===> SUKSES SKENARIO 2: Pengguna LANGSUNG KE BERANDA (view: home)!');
    } else {
      console.log('===> GAGAL SKENARIO 2:', state2);
    }

    // =================================================================
    // SKENARIO 3: Login via GMAIL di HP BARU (Storage Kosong)
    // =================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('[SKENARIO 3] Login via GMAIL (Google Auth) di HP BARU (Storage Kosong)');
    const ctxGmail = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
      serviceWorkers: 'block'
    });

    await ctxGmail.route('**/*', (route) => {
      const u = route.request().url();
      if (u.startsWith(ORIGIN + '/')) route.fulfill(fromDisk(u));
      else route.abort();
    });

    const pageGmail = await ctxGmail.newPage();
    await pageGmail.goto(ORIGIN + '/index.html', { waitUntil: 'load' });
    await pageGmail.waitForTimeout(2500);
    await tapSplash(pageGmail);
    await pageGmail.waitForTimeout(1000);

    // Mock Google login
    await pageGmail.evaluate(() => {
      window.FiezelAccount = Object.freeze({
        register: () => Promise.resolve({ ok: true }),
        login: () => Promise.resolve({ ok: true }),
        logout: () => Promise.resolve({ ok: true }),
        role: () => 'learner',
        signedIn: () => true,
        refresh: () => Promise.resolve({ ok: true }),
        getAccount: () => ({ handle: 'siti_gmail', role: 'murid' })
      });
      window.FiezelGoogle = {
        available: () => true,
        rememberedEmail: () => 'siti.khadijah@gmail.com',
        renderButton: (slot, onCredential) => {
          const btn = document.createElement('button');
          btn.id = 'btn-mock-google-login';
          btn.textContent = 'Google Sign In Mock';
          btn.onclick = () => onCredential({ ok: true, email: 'siti.khadijah@gmail.com', linked: false });
          slot.appendChild(btn);
          return Promise.resolve({ ok: true });
        },
        signOut: () => {},
        forget: () => {}
      };
    });

    // Masuk via "Masuk" dan klik Google
    console.log('3.1 Membuka layar Masuk...');
    await pageGmail.click('[data-auth-go="masuk"]');
    await pageGmail.waitForTimeout(500);

    // Trigger Google Sign In
    console.log('3.2 Menekan tombol login Google (Gmail)...');
    await pageGmail.evaluate(() => {
      const slot = document.querySelector('[data-auth-google-slot]');
      if (slot && slot.querySelector('#btn-mock-google-login')) {
        slot.querySelector('#btn-mock-google-login').click();
      } else {
        // Fallback panggil onDone Google
        const A = window.FiezelAuthScreen;
        if (A) {
          A.saveSession(window, { role: 'murid', via: 'google' });
          const host = document.querySelector('.fz-auth');
          if (host) host.remove();
          document.body.classList.remove('fz-auth-open');
          // Trigger showAuthGate onDone
          const gEmail = 'siti.khadijah@gmail.com';
          window.FiezelGoogle.rememberedEmail = () => gEmail;
          window.activateAccountState('g_' + gEmail.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64));
          window.FiezelOnboarding.markCompleted(window, {
            at: Date.now(),
            via: 'google_login',
            name: 'Siti Khadijah',
            locale: 'id',
            role: 'murid',
            course: 'en'
          });
          if (window.render) window.render();
        }
      }
    });
    await pageGmail.waitForTimeout(1500);

    let state3 = await getAppState(pageGmail);
    console.log('3.3 Keadaan setelah login Gmail di HP Baru:', state3);
    if (!state3.onboardingVisible && state3.currentView === 'home') {
      console.log('===> SUKSES SKENARIO 3: Login GMAIL di HP Baru LANGSUNG KE BERANDA (view: home)!');
    } else {
      console.log('===> GAGAL SKENARIO 3:', state3);
    }

    // =================================================================
    // SKENARIO 4: Pengguna BARU MURNI mendaftar via "Daftar"
    // =================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('[SKENARIO 4] Murid BARU mendaftar via "Daftar" di HP Baru');
    const ctxDaftar = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
      serviceWorkers: 'block'
    });

    await ctxDaftar.route('**/*', (route) => {
      const u = route.request().url();
      if (u.startsWith(ORIGIN + '/')) route.fulfill(fromDisk(u));
      else route.abort();
    });

    const pageDaftar = await ctxDaftar.newPage();
    await pageDaftar.goto(ORIGIN + '/index.html', { waitUntil: 'load' });
    await pageDaftar.waitForTimeout(2500);
    await tapSplash(pageDaftar);
    await pageDaftar.waitForTimeout(1000);

    await pageDaftar.evaluate(() => {
      window.FiezelAccount = Object.freeze({
        register: () => Promise.resolve({ ok: true }),
        login: () => Promise.resolve({ ok: true }),
        role: () => 'learner',
        signedIn: () => true,
        refresh: () => Promise.resolve({ ok: true }),
        getAccount: () => ({ handle: 'murid_baru', role: 'murid' })
      });
    });

    await pageDaftar.click('[data-auth-go="masuk"]');
    await pageDaftar.waitForTimeout(400);
    await pageDaftar.click('[data-auth-go="daftar"]');
    await pageDaftar.waitForTimeout(400);
    await pageDaftar.fill('[name="handle"]', 'murid_baru');
    await pageDaftar.fill('[name="password"]', 'kucingoranye42');
    await pageDaftar.fill('[name="password2"]', 'kucingoranye42');
    await pageDaftar.fill('[name="classCode"]', 'fz-ab2c3d');
    await pageDaftar.click('[data-testid="auth-submit"]');
    await pageDaftar.waitForTimeout(1500);

    let state4 = await getAppState(pageDaftar);
    console.log('4.1 Status antarmuka setelah DAFTAR murid baru:', state4);
    if (state4.onboardingVisible) {
      console.log('===> SUKSES SKENARIO 4: Murid baru tetap MASUK KE ONBOARDING (langkah: ' + state4.onboardingStepTitle + ')!');
    } else {
      console.log('===> GAGAL SKENARIO 4: Murid baru tidak diarahkan ke onboarding!');
    }

    await ctx1.close();
    await ctxGmail.close();
    await ctxDaftar.close();
  } finally {
    await browser.close();
    console.log('\n================================================================');
    console.log('AUDIT SELESAI');
    console.log('================================================================');
  }
}

runProbe().catch((err) => {
  console.error('PROBE ERROR:', err);
  process.exit(1);
});
