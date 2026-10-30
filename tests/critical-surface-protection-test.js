'use strict';
/**
 * tests/critical-surface-protection-test.js
 *
 * GERBANG PERLINDUNGAN PERMUKAAN KRITIS ANTI-REGRESI (Auth, Boot, PWA Standalone, CSS, & Mitra Kaiwa)
 *
 * Menutup kelas kerusakan "perbaiki A -> permukaan C ikut rusak diam-diam":
 *  1. Auth & Boot Production Purity:
 *     - `isLocalTestServer()` WAJIB `false` 100% di seluruh domain produksi (`fiezel.my.id`).
 *     - `?fz_real_auth=1` di localhost WAJIB menonaktifkan bypass agar probe E2E lokal/CI dapat
 *       menguji layar login & onboarding asli tanpa menyentuh kode auth, sementara localhost
 *       bawaan tetap mempertahankan kenyamanan uji lokal owner (m025-723).
 *     - Pengguna kembali tanpa sesi di produksi WAJIB dihadang `authGateNeeded() === true`.
 *     - Nol tombol bypass tamu (`guest` / `Pengunjung` / `local_bypass`) pada markup layar masuk.
 *  2. PWA Standalone Ecosystem Lock:
 *     - `manifest.json` (/app/) dan `website/manifest.json` (/) keduanya valid, `display: "standalone"`,
 *       seluruh ikon tersedia di disk, dan halaman landing menjaga redirect guard standalone.
 *  3. CSS & Shell Anti-Corruption Gate:
 *     - `node --check` di CI hanya memeriksa berkas `.js`; satu kurung kurawal `{` atau `}` yang
 *       tidak seimbang di `style.css` (13.600+ baris) menghancurkan tata letak UI/UX layar lain
 *       tanpa pesan error. Gerbang ini memverifikasi keseimbangan `{` dan `}` serta ketiadaan
 *       penanda konflik git pada seluruh berkas `.css` yang dimuat `index.html`.
 *  4. Core Shell & Mitra Kaiwa Voice Studio Purity:
 *     - `index.html` seimbang, `#app` tersedia, `call.html` dimuat melalui `#fzMitraKaiwaStudioFrame`.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    failed++;
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

function extractTopFunction(src, signature) {
  const start = src.indexOf(signature);
  assert.ok(start >= 0, `Fungsi tidak ditemukan di app.js: ${signature}`);
  let depth = 0;
  let started = false;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
      if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    }
    if (ch === '\\' && (inSingle || inDouble || inTemplate)) { i++; continue; }
    if (!inDouble && !inTemplate && ch === "'") { inSingle = !inSingle; continue; }
    if (!inSingle && !inTemplate && ch === '"') { inDouble = !inDouble; continue; }
    if (!inSingle && !inDouble && ch === '`') { inTemplate = !inTemplate; continue; }
    if (inSingle || inDouble || inTemplate) continue;
    if (ch === '{') { depth++; started = true; }
    else if (ch === '}') {
      depth--;
      if (started && depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`Kurung fungsi tidak tertutup untuk: ${signature}`);
}

function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    _map: map
  };
}

function createAuthGateHarness(appSrc, urlStr, opts = {}) {
  const u = new URL(urlStr);
  const localStorage = makeStorage(opts.localSeed || {});
  const sessionStorage = makeStorage(opts.sessionSeed || {});
  const state = { level: 1, streak: 0, view: 'home' };
  const selfObj = {
    localStorage,
    sessionStorage,
    FiezelOnboarding: {
      completed: () => Boolean(opts.onboardingDone)
    },
    FiezelAuthScreen: {
      show: () => {},
      readSession: () => {
        const raw = localStorage.getItem('fiezel-auth-v1');
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (_) { return null; }
      },
      saveSession: (_env, detail) => {
        localStorage.setItem('fiezel-auth-v1', JSON.stringify({
          v: 1, signedIn: true, at: 1, role: detail.role || 'murid', via: detail.via || 'akun'
        }));
      }
    },
    FiezelAccount: { signedIn: () => Boolean(opts.accountSignedIn) },
    FiezelGoogle: { rememberedEmail: () => opts.googleEmail || '' }
  };

  const fn1 = extractTopFunction(appSrc, 'function isLocalTestServer(){');
  const fn2 = extractTopFunction(appSrc, 'function teacherPreviewActive(){');
  const fn3 = extractTopFunction(appSrc, 'function authGateNeeded(){');

  const ctx = {
    location: {
      href: u.href,
      hostname: u.hostname,
      port: u.port,
      search: u.search,
      pathname: u.pathname
    },
    URL,
    localStorage,
    sessionStorage,
    self: selfObj,
    window: selfObj,
    state,
    setLearnerName: (n) => { state.userName = n; },
    save: () => {},
    isVerifiedTeacher: () => false
  };
  vm.createContext(ctx);
  vm.runInContext(`${fn1}\n${fn2}\n${fn3}\nthis.__out={isLocalTestServer,teacherPreviewActive,authGateNeeded};`, ctx);
  return { ...ctx.__out, localStorage, state };
}

const appSrc = read('app.js');
const indexHtml = read('index.html');

// 1. Auth & Boot Production Purity
check('S1.1 isLocalTestServer() WAJIB false di seluruh URL produksi fiezel.my.id', () => {
  for (const prodUrl of [
    'https://fiezel.my.id/app/',
    'https://fiezel.my.id/app/index.html',
    'https://www.fiezel.my.id/app/',
    'https://fiezel.my.id/'
  ]) {
    const h = createAuthGateHarness(appSrc, prodUrl);
    assert.strictEqual(h.isLocalTestServer(), false, `Bocor di URL produksi: ${prodUrl}`);
  }
});

check('S1.2 Localhost mendukung ?fz_real_auth=1 untuk uji E2E login asli sekaligus menjaga mode dev lokal', () => {
  const devDefault = createAuthGateHarness(appSrc, 'http://127.0.0.1:4173/');
  assert.strictEqual(devDefault.isLocalTestServer(), true, 'Mode dev lokal bawaan m025-723 harus tetap aktif');

  const realAuth1 = createAuthGateHarness(appSrc, 'http://127.0.0.1:4173/?fz_real_auth=1', { onboardingDone: true });
  assert.strictEqual(realAuth1.isLocalTestServer(), false, '?fz_real_auth=1 harus mematikan bypass lokal');
  assert.strictEqual(realAuth1.authGateNeeded(), true, '?fz_real_auth=1 dengan onboarding selesai wajib membuka gerbang login');

  const realAuth2 = createAuthGateHarness(appSrc, 'http://localhost:3000/index.html?view=home&fz_real_auth=1', { onboardingDone: true });
  assert.strictEqual(realAuth2.isLocalTestServer(), false, '&fz_real_auth=1 harus mematikan bypass lokal di localhost:3000');
  assert.strictEqual(realAuth2.authGateNeeded(), true);
});

check('S1.3 Pengguna produksi tanpa sesi TIDAK PERNAH disuntikkan sesi Pengguna Uji palsu', () => {
  const returningProd = createAuthGateHarness(appSrc, 'https://fiezel.my.id/app/', { onboardingDone: true });
  assert.strictEqual(returningProd.authGateNeeded(), true, 'Pengguna kembali tanpa sesi di produksi wajib masuk layar login');
  assert.strictEqual(returningProd.localStorage.getItem('fiezel-auth-v1'), null, 'Sesi palsu tidak boleh tersimpan');

  const brandNewProd = createAuthGateHarness(appSrc, 'https://fiezel.my.id/app/', { onboardingDone: false });
  brandNewProd.authGateNeeded();
  assert.strictEqual(brandNewProd.localStorage.getItem('fiezel-auth-v1'), null, 'Murid baru di produksi tidak boleh diberi sesi palsu');
  assert.strictEqual(brandNewProd.localStorage.getItem('fiezel-onboarding-v1'), null, 'Murid baru di produksi tidak boleh dilompati onboarding-nya');
});

check('S1.4 Layar masuk (fiezel-auth-screen.js) bersih 100% dari tombol bypass tamu / pengunjung', () => {
  const authSrc = read('features/auth/fiezel-auth-screen.js');
  const sb = { self: { localStorage: makeStorage() }, console, setTimeout, clearTimeout, Promise, JSON, Date, Object, String, Array, RegExp, Math };
  sb.window = sb.self;
  vm.createContext(sb);
  vm.runInContext(authSrc, sb);
  const A = sb.self.FiezelAuthScreen;
  assert.ok(A && typeof A.markup === 'function', 'FiezelAuthScreen.markup harus tersedia');
  for (const screen of ['welcome', 'masuk', 'daftar']) {
    for (const role of ['murid', 'guru']) {
      const html = A.markup(sb.self, { screen, role, busy: false, error: '', forgot: false });
      assert.ok(!/data-auth-guest|local_bypass|Masuk sebagai (?:Tamu|Pengunjung)/i.test(html),
        `Ditemukan tombol bypass terlarang pada layar ${screen}/${role}`);
    }
  }
});

// 2. PWA Standalone Ecosystem Integrity
check('S2.1 Manifest /app/ dan root website/ menjaga kontrak PWA Standalone penuh', () => {
  const appManifest = JSON.parse(read('manifest.json'));
  assert.strictEqual(appManifest.display, 'standalone', 'manifest.json display harus standalone');

  const webManifest = JSON.parse(read('website/manifest.json'));
  assert.strictEqual(webManifest.display, 'standalone', 'website/manifest.json display harus standalone');
  assert.strictEqual(webManifest.id, '/app/', 'website/manifest.json id harus /app/');
  assert.strictEqual(webManifest.start_url, '/app/', 'website/manifest.json start_url harus /app/');
  assert.strictEqual(webManifest.scope, '/', 'website/manifest.json scope harus /');

  for (const page of ['website/index.html', 'website/th/index.html', 'website/install/index.html', 'website/th/install/index.html']) {
    const h = read(page);
    assert.ok(/<link[^>]*rel=["']manifest["']/i.test(h), `${page} kehilangan link manifest`);
    assert.ok(h.includes('(display-mode: standalone)'), `${page} kehilangan standalone redirect guard`);
  }
});

// 3. CSS & Stylesheet Anti-Corruption Gate
function countCssBraces(cssText) {
  let open = 0;
  let close = 0;
  let inComment = false;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < cssText.length; i++) {
    const ch = cssText[i];
    const next = cssText[i + 1];
    if (inComment) {
      if (ch === '*' && next === '/') { inComment = false; i++; }
      continue;
    }
    if (!inSingle && !inDouble && ch === '/' && next === '*') {
      inComment = true; i++; continue;
    }
    if (ch === '\\' && (inSingle || inDouble)) { i++; continue; }
    if (!inDouble && ch === "'") { inSingle = !inSingle; continue; }
    if (!inSingle && ch === '"') { inDouble = !inDouble; continue; }
    if (inSingle || inDouble) continue;
    if (ch === '{') open++;
    else if (ch === '}') close++;
  }
  return { open, close, inComment, inSingle, inDouble };
}

check('S3.1 Seluruh berkas CSS yang dimuat index.html ada, bebas konflik git, dan kurung { } seimbang 100%', () => {
  const cssLinks = [...indexHtml.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"'?]+)(?:\?[^"']*)?["']/gi)]
    .map((m) => m[1].replace(/^\.\//, ''))
    .filter((href) => !/^https?:\/\//i.test(href));
  assert.ok(cssLinks.length >= 3, `Harus menemukan minimal 3 berkas CSS lokal di index.html (ditemukan ${cssLinks.length})`);

  for (const relCss of cssLinks) {
    assert.ok(exists(relCss), `Berkas CSS yang dirujuk index.html hilang: ${relCss}`);
    const content = read(relCss);
    assert.ok(content.trim().length > 50, `Berkas CSS kosong atau terpotong: ${relCss}`);
    assert.ok(!/^(?:<{7}|={7}|>{7})\s/m.test(content), `Penanda konflik merge git ditemukan di ${relCss}`);
    const b = countCssBraces(content);
    assert.strictEqual(b.inComment, false, `Komentar CSS tidak tertutup di ${relCss}`);
    assert.strictEqual(b.open, b.close, `Kurung kurawal CSS tidak seimbang di ${relCss}: {=${b.open} vs }=${b.close}`);
    assert.ok(b.open > 0, `Tidak ada aturan CSS terbaca di ${relCss}`);
  }
});

check('S3.2 Selektor pelindung cangkang boot (fz-app-open) dan kontainer utama tetap utuh', () => {
  const clayCss = read('features/ui/fiezel-tactile-clay.css');
  assert.ok(clayCss.includes('fz-app-open'), 'fiezel-tactile-clay.css harus menjaga pelindung cangkang fz-app-open (m025-576)');
  assert.ok(/id=["']app["']/.test(indexHtml), 'index.html wajib memiliki kontainer #app');
});

// 4. Core Views & Mitra Kaiwa Voice Studio Lock
check('S4.1 Kawan Bicara (chat) tetap me-mount AI Voice Studio call.html melalui #fzMitraKaiwaStudioFrame', () => {
  assert.ok(exists('call.html'), 'call.html wajib ada di root aplikasi');
  assert.ok(exists('features/interactive-chat/fiezel-interactive-chat.js'), 'fiezel-interactive-chat.js wajib ada');
  const chatSrc = read('features/interactive-chat/fiezel-interactive-chat.js');
  assert.ok(chatSrc.includes('fzMitraKaiwaStudioFrame'), 'fiezel-interactive-chat.js wajib mempertahankan #fzMitraKaiwaStudioFrame');
  assert.ok(chatSrc.includes('call.html'), 'fiezel-interactive-chat.js wajib me-mount call.html untuk Kawan Bicara');
  assert.ok(appSrc.includes('FiezelInteractiveChat'), 'app.js wajib menghubungkan view chat ke FiezelInteractiveChat');
});

// 5. CI Registration Self-Check
check('S5.1 Gerbang ini terdaftar di quality.yml dan a9-a14-autonomous-guardians.yml', () => {
  const q = read('.github/workflows/quality.yml');
  const g = read('.github/workflows/a9-a14-autonomous-guardians.yml');
  assert.ok(q.includes('node tests/critical-surface-protection-test.js'), 'Belum terdaftar di quality.yml');
  assert.ok(g.includes('node tests/critical-surface-protection-test.js'), 'Belum terdaftar di a9-a14-autonomous-guardians.yml');
});

console.log(`\ncritical-surface-protection-test: ${passed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
