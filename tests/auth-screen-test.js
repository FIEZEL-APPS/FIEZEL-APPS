'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: gerbang hidup di tests/, berkas produksi di root. */
/**
 * tests/auth-screen-test.js — GERBANG LAYAR MASUK WAJIB (m025-367).
 *
 * Owner, 24 September 2026: "user masih bisa masuk tanpa harus membuat akun, itu sangat
 * fatal". Lalu: pilihan murid/guru dan kode KelasKu pindah dari perkenalan ke layar masuk,
 * dan perkenalan menanyakan kursus (Bahasa Inggris / Bahasa Jepang).
 *
 * Yang dijaga, satu per satu:
 *   A. Modul features/auth/fiezel-auth-screen.js (Node, tanpa peramban):
 *      A1 penanda sesi hanya berisi {v, signedIn, at, role, via} — tanpa sandi/nama/token;
 *      A2 kode KelasKu dinormalkan, bentuk salah ditolak (null), kosong boleh ('');
 *      A3 markup tiap layar: tab Murid/Guru, Google + kode KelasKu hanya untuk murid,
 *         kode undangan hanya untuk aktivasi guru, demo Ruang Guru hanya di tab guru;
 *      A4 checkServer: "tidak tahu" (offline, server lama, galat) = null, BUKAN "belum masuk";
 *      A5 setiap kunci auth.layar.* yang dipakai punya id DAN th beraksara Thai.
 *   B. Kabel app.js / perkenalan / aset (pembacaan sumber):
 *      B1 gerbang dipasang SEBELUM perkenalan, demo guru melewatinya;
 *      B2 keluar menghapus penanda lalu memasang gerbang lagi;
 *      B3 hanya jawaban server signedIn:false yang mencabut penanda;
 *      B4 perkenalan tanpa pemilih peran/kode kelas; langkah kursus tepat sesudah nama;
 *      B5 ganti kursus di tengah perkenalan tidak memutar ulang ekor boot load();
 *      B6 skrip dimuat index.html dan di-precache sw.js.
 *   C. Chromium (SKIP bila Playwright/Chromium tidak ada — pola ui-render-audit-test):
 *      C1 perangkat baru mendarat di layar masuk, bukan di perkenalan atau aplikasi;
 *      C2 daftar murid + kode KelasKu → penanda tersimpan, kode kelas tersimpan, perkenalan
 *         terbuka tanpa pemilih peran; muat ulang tidak menampilkan layar masuk lagi;
 *      C3 kode KelasKu cacat ditahan dengan pesan, akun tidak dibuat;
 *      C4 ?teacher=preview tidak dihadang layar masuk.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');

const ROOT = __fzRoot;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

/* ------------------------------------------------------------------ muat modul */

function memStore(seed) {
  const m = new Map(Object.entries(seed || {}));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    _m: m
  };
}
function loadAuth(extra) {
  const self = Object.assign({ localStorage: memStore() }, extra || {});
  const sandbox = { self, window: self, console, setTimeout, clearTimeout, Promise, JSON, Date, Object, String, Array, RegExp, Math };
  vm.createContext(sandbox);
  vm.runInContext(read('features/auth/fiezel-auth-screen.js'), sandbox, { filename: 'fiezel-auth-screen.js' });
  assert.ok(self.FiezelAuthScreen, 'global FiezelAuthScreen terpasang');
  return self;
}

/* ------------------------------------------------------------------ A. modul */

test('A1 penanda sesi: bentuk tetap, tanpa rahasia, peran/via asing dinormalkan', () => {
  const self = loadAuth();
  const A = self.FiezelAuthScreen;
  assert.strictEqual(A.SESSION_KEY, 'fiezel-auth-v1');
  assert.strictEqual(A.readSession(self), null, 'perangkat baru: belum masuk');
  A.saveSession(self, { role: 'guru', via: 'akun', password: 'rahasia123', handle: 'bu.ani', token: 'x' });
  const raw = JSON.parse(self.localStorage.getItem('fiezel-auth-v1'));
  assert.deepStrictEqual(Object.keys(raw).sort(), ['at', 'role', 'signedIn', 'v', 'via'], 'hanya lima kunci');
  assert.ok(!/rahasia|bu\.ani/.test(self.localStorage.getItem('fiezel-auth-v1')), 'sandi/nama tidak pernah ditulis');
  assert.strictEqual(A.readSession(self).role, 'guru');
  A.saveSession(self, { role: 'admin', via: 'facebook' });
  const r2 = A.readSession(self);
  assert.strictEqual(r2.role, 'murid', 'peran asing → murid');
  assert.strictEqual(r2.via, 'akun', 'via asing → akun');
  self.localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 2, signedIn: true, role: 'murid' }));
  assert.strictEqual(A.readSession(self), null, 'versi asing tidak dipercaya');
  self.localStorage.setItem('fiezel-auth-v1', '{rusak');
  assert.strictEqual(A.readSession(self), null, 'JSON rusak tidak melempar');
  A.saveSession(self, { role: 'murid', via: 'google' });
  A.clearSession(self);
  assert.strictEqual(A.readSession(self), null, 'keluar menghapus penanda');
});

test('A2 kode KelasKu: dinormalkan, cacat = null, kosong = ""', () => {
  const A = loadAuth().FiezelAuthScreen;
  assert.strictEqual(A.normalizeClassCode(' fz-ab2c3d '), 'FZ-AB2C3D');
  assert.strictEqual(A.normalizeClassCode('ab2c3d'), 'FZ-AB2C3D', 'enam karakter tanpa awalan');
  assert.strictEqual(A.normalizeClassCode(''), '');
  assert.strictEqual(A.normalizeClassCode(null), '');
  for (const bad of ['FZ-AB2C', 'FZ-AB2C3D4', 'XX-AB2C3D', 'FZ_AB2C3D', 'FZ-AB2C3!']) {
    assert.strictEqual(A.normalizeClassCode(bad), null, 'ditolak: ' + bad);
  }
});

test('A3 markup: peran, Google, kode kelas, kode undangan, demo guru di tempat yang benar', () => {
  const self = loadAuth();
  const A = self.FiezelAuthScreen;
  const m = (screen, role) => A.markup(self, { screen, role, busy: false, error: '', forgot: false });

  const w = m('welcome', 'murid');
  assert.ok(/data-auth-go="masuk"/.test(w), 'selamat datang → Lanjut ke Masuk');
  assert.ok(!/data-auth-role=/.test(w), 'selamat datang belum menanyakan peran');
  assert.ok(/data-auth-locale="th"/.test(w) && /data-auth-locale="id"/.test(w), 'pemilih bahasa id/th di layar pertama');

  const mm = m('masuk', 'murid');
  assert.ok(/data-auth-role="murid"/.test(mm) && /data-auth-role="guru"/.test(mm), 'tab Murid + Guru');
  assert.ok(/data-auth-google/.test(mm), 'murid: slot Google');
  assert.ok(/name="classCode"/.test(mm), 'murid: kode KelasKu di layar masuk');
  assert.ok(/name="handle"/.test(mm) && /name="password"/.test(mm), 'akun FIEZEL sebagai cadangan');
  assert.ok(!/name="password2"/.test(mm) && !/name="code"/.test(mm), 'masuk: tanpa ulangi sandi / kode undangan');
  assert.ok(/data-auth-forgot/.test(mm), 'lupa kata sandi');

  const dm = m('daftar', 'murid');
  assert.ok(/name="password2"/.test(dm), 'daftar: ulangi sandi');
  assert.ok(/name="classCode"/.test(dm) && /data-auth-google/.test(dm), 'daftar murid: Google + kode KelasKu');
  assert.ok(/autocomplete="new-password"/.test(dm), 'pengelola sandi mengenali pendaftaran');

  const dg = m('daftar', 'guru');
  assert.ok(/name="code"/.test(dg), 'aktivasi guru: kode undangan');
  assert.ok(!/name="classCode"/.test(dg), 'guru tidak mengisi kode KelasKu');
  assert.ok(!/data-auth-google/.test(dg), 'guru tidak masuk lewat Google');
  assert.ok(/teacher=preview/.test(dg), 'demo Ruang Guru tetap bisa dicapai');

  const mg = m('masuk', 'guru');
  assert.ok(/teacher=preview/.test(mg) && !/name="classCode"/.test(mg), 'masuk guru: demo, tanpa kode kelas');
  assert.ok(!/teacher=preview/.test(mm), 'tab murid tidak menawarkan demo guru');

  const galat = A.markup(self, { screen: 'masuk', role: 'murid', busy: false, error: '<img src=x onerror=alert(1)>', forgot: false });
  assert.ok(!/<img src=x/.test(galat), 'pesan galat di-escape');
});

test('A4 checkServer: galat/offline/server lama = null, jawaban sah diteruskan', async () => {
  const calls = [];
  const mk = (impl) => loadAuth({ FIEZEL_CF_CONFIG: { base: 'https://api.contoh.test/' }, fetch: (u, o) => { calls.push([u, o]); return impl(); } });
  let self = mk(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, signedIn: false, via: null, role: null }) }));
  const r = await self.FiezelAuthScreen.checkServer(self);
  assert.strictEqual(r.signedIn, false);
  assert.strictEqual(calls[0][0], 'https://api.contoh.test/api/auth/session', 'path tepat, garis miring ganda dibuang');
  assert.strictEqual(calls[0][1].credentials, 'include', 'cookie fz_id ikut');
  self = mk(() => Promise.reject(new Error('offline')));
  assert.strictEqual(await self.FiezelAuthScreen.checkServer(self), null, 'offline → null');
  self = mk(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
  assert.strictEqual(await self.FiezelAuthScreen.checkServer(self), null, '404 server lama → null');
  self = mk(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }));
  assert.strictEqual(await self.FiezelAuthScreen.checkServer(self), null, 'bentuk asing → null');
  const tanpaBase = loadAuth({ fetch: () => { throw new Error('tidak boleh dipanggil'); } });
  assert.strictEqual(await tanpaBase.FiezelAuthScreen.checkServer(tanpaBase), null, 'tanpa base → null');
});

test('A5 setiap kunci auth.layar.* yang dipakai ada di id DAN th (aksara Thai)', () => {
  const src = read('features/auth/fiezel-auth-screen.js');
  const used = [...new Set([...src.matchAll(/t\('(auth\.layar\.[a-z0-9-]+)'/g)].map((x) => x[1]))];
  assert.ok(used.length >= 40, 'kunci terbaca dari sumber (' + used.length + ')');
  const idSrc = read('features/i18n/copy-id-google.js');
  const thSrc = read('features/i18n/copy-th-google.js');
  for (const k of used) {
    const re = new RegExp("['\"]" + k.replace(/\./g, '\\.') + "['\"]\\s*:\\s*(['\"])((?:\\\\.|(?!\\1).)*)\\1");
    const id = re.exec(idSrc); const th = re.exec(thSrc);
    assert.ok(id, 'id punya ' + k);
    assert.ok(th, 'th punya ' + k);
    assert.ok(/[฀-๿]/.test(th[2]) || /^[A-Z0-9 ·().\-]+$/.test(th[2]), 'th beraksara Thai: ' + k + ' = ' + th[2]);
  }
});

/* ------------------------------------------------------------------ B. kabel */

test('B1 gerbang dipasang sebelum perkenalan; demo guru melewatinya', () => {
  const app = read('app.js');
  const i = app.indexOf('function startWelcomeExperience(){');
  const body = app.slice(i, app.indexOf('\n}\n', i));
  const gate = body.indexOf('if(authGateNeeded()){showAuthGate(at,proceed);return null}');
  const ob = body.indexOf('showOnboarding(at)');
  assert.ok(gate > 0 && ob > gate, 'authGateNeeded() diperiksa SEBELUM showOnboarding()');
  const need = app.slice(app.indexOf('function authGateNeeded(){'), app.indexOf('function showAuthGate('));
  assert.ok(/if\(teacherPreviewActive\(\)\)return false/.test(need), 'demo guru tidak dihadang');
  assert.ok(/readSession\(self\)\)return false/.test(need), 'penanda sesi yang ada meloloskan');
  assert.ok(/FiezelAccount\?\.signedIn\?\.\(\)/.test(need), 'akun FIEZEL yang sudah masuk (rilis lama) tidak dipaksa masuk ulang');
  assert.ok(/return true;\s*\}$/.test(need.trim()), 'bawaannya: hadang');
});

test('B2 keluar menghapus penanda lalu memasang gerbang lagi', () => {
  const app = read('app.js');
  const hits = [...app.matchAll(/FiezelAuthScreen\?\.clearSession\?\.\(self\)/g)].map((m) => m.index);
  assert.ok(hits.length >= 2, 'kedua jalur keluar menghapus penanda (' + hits.length + ')');
  for (const at of hits) {
    const after = app.slice(at, at + 600);
    assert.ok(/showAuthGate\(/.test(after), 'sesudah keluar, layar masuk dipasang lagi');
  }
});

test('B3 hanya jawaban server signedIn:false yang mencabut penanda', () => {
  const app = read('app.js');
  const v = app.slice(app.indexOf('async function verifyAuthSession(){'), app.indexOf('function dismissWelcome('));
  assert.ok(/r&&r\.ok&&r\.signedIn===false/.test(v), 'syarat pencabutan tepat');
  assert.ok(/navigator\.onLine===false\)return/.test(v), 'offline tidak mencabut');
  assert.ok(/teacherPreviewActive\(\)\)return/.test(v), 'demo guru tidak dicek');
});

test('B4 perkenalan: tanpa pemilih peran/kode kelas; kursus tepat sesudah nama', () => {
  const src = read('features/onboarding/fiezel-onboarding.js');
  assert.ok(!/data-ob-role=/.test(src), 'tidak ada kartu peran di perkenalan');
  assert.ok(!/data-ob-classcode[\s">=]/.test(src.replace(/\/\/.*$/gm, '')), 'tidak ada kolom kode kelas di perkenalan');
  const self = { localStorage: memStore() };
  const O = require(path.join(ROOT, 'features/onboarding/fiezel-onboarding.js'));
  assert.ok(O, 'FiezelOnboarding terpasang');
  assert.strictEqual(O.roleMarkup, undefined, 'pemilih peran tidak diekspor lagi');
  assert.deepStrictEqual(O.COURSES.map((c) => c.id), ['en', 'ja'], 'dua kursus: Inggris + Jepang');
  const html = O.courseMarkup(self, '');
  assert.ok(/data-ob-course="en"/.test(html) && /data-ob-course="ja"/.test(html), 'kedua kartu kursus');
  assert.ok(/data-ob-advance disabled/.test(html), 'tanpa pilihan bawaan: Lanjut nonaktif');
  assert.ok(/aria-checked="true"[^>]*data-ob-course="ja"/.test(O.courseMarkup(self, 'ja')), 'pilihan ja tertandai');
  assert.ok(/LEAN_SEQUENCE = Object\.freeze\(\[NAME_STEP, COURSE_STEP,/.test(src), 'alur ringkas: nama → kursus');
  assert.ok(/FULL_SEQUENCE = Object\.freeze\(\[1, COURSE_STEP,/.test(src), 'alur penuh: nama → kursus');
});

test('B5 ganti kursus di tengah perkenalan tidak memutar ulang ekor boot', () => {
  const app = read('app.js');
  assert.ok(/async function load\(opts\)\{/.test(app), 'load() menerima opsi');
  assert.ok(/if\(opts&&opts\.kontenSaja\)return;\s*startCelestialClock\(\);startRoleResolution\(\);startWelcomeExperience\(\)/.test(app),
    'kontenSaja berhenti SEBELUM startWelcomeExperience() — kalau tidak, perkenalan kedua terbuka di atas yang pertama');
  const oc = app.slice(app.indexOf('onCourse:({course})=>{'), app.indexOf('onPlacement:'));
  assert.ok(/await load\(\{kontenSaja:true\}\)/.test(oc), 'onCourse memuat bank kursus saja');
});

test('B6 skrip dimuat index.html sebelum app.js dan di-precache sw.js', () => {
  const html = read('index.html');
  const a = html.indexOf('features/auth/fiezel-auth-screen.js');
  const b = html.search(/<script[^>]+src="\.\/app\.js/);
  assert.ok(a > 0, 'index.html memuat layar masuk');
  assert.ok(b < 0 || a < b, 'dimuat sebelum app.js');
  assert.ok(read('sw.js').includes("'./features/auth/fiezel-auth-screen.js'"), 'ada di ASSETS service worker');
});

/* ------------------------------------------------------------------ C. Chromium */

function loadPlaywright() {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return require(id); } catch (_) {}
  }
  return null;
}
function findChromium(pw) {
  try { const p = pw.chromium.executablePath(); if (p && fs.existsSync(p)) return p; } catch (_) {}
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const dir of fs.readdirSync(base)) {
      if (!/^chromium-/.test(dir)) continue;
      const exe = path.join(base, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch (_) {}
  return null;
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(String(req.url || '/').split('?')[0]);
      if (rel === '/') rel = '/index.html';
      const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('nope'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function browserGates() {
  const pw = loadPlaywright();
  if (!pw) { console.log('SKIP C1-C4 - playwright tidak terpasang (bukan kegagalan).'); return; }
  const exe = findChromium(pw);
  if (!exe) { console.log('SKIP C1-C4 - Chromium Playwright tidak ditemukan (bukan kegagalan).'); return; }
  const { server, port } = await serve();
  const browser = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--no-first-run'] });
  const origin = `http://127.0.0.1:${port}`;
  async function open(url) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    /* Jaringan luar diblokir: gerbang CI tidak boleh menembak api.fiezel.my.id atau Google. */
    await ctx.route('**/*', (r) => (r.request().url().startsWith(origin + '/') ? r.continue() : r.abort()));
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(origin + url, { waitUntil: 'load', timeout: 60000 });
    return { ctx, page, errors };
  }
  const where = (page) => page.evaluate(() => ({
    auth: document.querySelector('.fz-auth:not(.is-leaving)')?.getAttribute('data-auth-screen') || null,
    ob: !!document.querySelector('.fiezel-ob'),
    role: !!document.querySelector('[data-ob-role]'),
    session: localStorage.getItem('fiezel-auth-v1')
  }));
  const until = async (page, fn, ms) => {
    const end = Date.now() + (ms || 15000);
    for (;;) {
      const s = await where(page);
      if (fn(s)) return s;
      if (Date.now() > end) return s;
      await page.waitForTimeout(250);
    }
  };
  /* Splash boot bisa menahan layar masuk; ketukan melewatinya seperti murid sungguhan. */
  const tapSplash = async (page) => { try { await page.mouse.click(195, 420); } catch (_) {} };

  try {
    {
      const { ctx, page, errors } = await open('/index.html');
      await page.waitForTimeout(2500); await tapSplash(page);
      const s = await until(page, (x) => x.auth === 'welcome');
      assert.strictEqual(s.auth, 'welcome', 'C1 perangkat baru mendarat di layar Selamat datang, bukan ' + JSON.stringify(s));
      assert.ok(!s.ob, 'C1 perkenalan belum terbuka di bawah layar masuk');
      console.log('PASS C1 perangkat baru → layar masuk');

      await page.click('[data-auth-go="masuk"]');
      await page.click('[data-auth-go="daftar"]');
      assert.strictEqual((await where(page)).auth, 'daftar');
      /* FiezelAccount diganti tiruan: gerbang ini menguji layar, bukan server akun. */
      await page.evaluate(() => {
        window.__reg = [];
        window.FiezelAccount = Object.freeze({
          register: (o) => { window.__reg.push(o); return Promise.resolve({ ok: true }); },
          login: () => Promise.resolve({ ok: true }),
          activateTeacher: () => Promise.resolve({ ok: true }),
          role: () => 'learner', signedIn: () => true, refresh: () => Promise.resolve({ ok: true })
        });
      });
      await page.fill('[name="handle"]', 'sari.uji');
      await page.fill('[name="password"]', 'kucingoranye42');
      await page.fill('[name="password2"]', 'kucingoranye42');
      await page.fill('[name="classCode"]', 'fz-12');
      await page.click('[data-testid="auth-submit"]');
      const bad = await page.evaluate(() => document.querySelector('[data-auth-error]')?.textContent || '');
      assert.ok(/FZ-/.test(bad), 'C3 kode KelasKu cacat ditahan dengan contoh bentuknya: ' + bad);
      assert.strictEqual(await page.evaluate(() => window.__reg.length), 0, 'C3 akun tidak dibuat saat kode cacat');
      assert.strictEqual(await page.inputValue('[name="password2"]'), 'kucingoranye42', 'C3 salah ketik kode kelas tidak menghapus kolom sandi');
      console.log('PASS C3 kode KelasKu cacat ditahan');

      await page.fill('[name="classCode"]', 'fz-ab2c3d');
      await page.click('[data-testid="auth-submit"]');
      const s2 = await until(page, (x) => !x.auth && x.ob);
      assert.strictEqual(await page.evaluate(() => window.__reg.length), 1, 'C2 register() dipanggil sekali');
      assert.ok(s2.session && JSON.parse(s2.session).role === 'murid', 'C2 penanda sesi murid tersimpan');
      assert.ok(s2.ob, 'C2 perkenalan terbuka sesudah masuk: ' + JSON.stringify(s2));
      assert.ok(!s2.role, 'C2 perkenalan tanpa pemilih peran');
      const code = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('fiezel-onboarding-v1') || '{}').classCode; } catch (_) { return null; } });
      assert.strictEqual(code, 'FZ-AB2C3D', 'C2 kode KelasKu dari layar masuk tersimpan');

      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(2500); await tapSplash(page);
      const s3 = await until(page, (x) => x.ob, 12000);
      assert.strictEqual(s3.auth, null, 'C2 muat ulang tidak menampilkan layar masuk lagi');
      assert.deepStrictEqual(errors, [], 'C1-C2 tanpa galat halaman');
      console.log('PASS C2 daftar murid + kode KelasKu → perkenalan tanpa peran; muat ulang tetap masuk');
      await ctx.close();
    }
    {
      const { ctx, page } = await open('/index.html?teacher=preview');
      await page.waitForTimeout(4000); await tapSplash(page);
      await page.waitForTimeout(1500);
      const s = await where(page);
      assert.strictEqual(s.auth, null, 'C4 demo guru tidak dihadang layar masuk: ' + JSON.stringify(s));
      console.log('PASS C4 ?teacher=preview melewati layar masuk');
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

(async () => {
  let pass = 0; let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('PASS ' + name); pass++; }
    catch (e) { console.error('FAIL ' + name + ' — ' + e.message); fail++; }
  }
  try { await browserGates(); }
  catch (e) { console.error('FAIL gerbang Chromium — ' + e.message); fail++; }
  console.log('\nauth-screen: ' + pass + '/' + (pass + fail) + ' gerbang Node lulus' + (fail ? ', ' + fail + ' gagal' : ''));
  process.exit(fail ? 1 : 0);
})();
