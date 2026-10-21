'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. */
/**
 * tests/google-auth-ui-test.js — GERBANG SISI MURID UNTUK "MASUK DENGAN GOOGLE".
 *
 * Ia MENJALANKAN `features/auth/fiezel-google.js` di dalam vm dengan Google dan
 * `fetch` tiruan, bukan membaca kodenya dengan regex. Yang dijaga adalah apa yang
 * benar-benar berangkat dan apa yang benar-benar tersimpan:
 *
 *   1. Perangkat mengirim TOKEN saja. Nol `email`, nol `sub`, nol `userId` —
 *      kalau klien boleh mengirim identitas, seluruh verifikasi server jadi hiasan.
 *   2. Nonce yang dikirim ke Google SAMA dengan yang dikirim ke server, dan BEDA
 *      setiap kali tombol digambar. Nonce yang dipakai ulang bukan nonce.
 *   3. Token TIDAK PERNAH disimpan. Yang boleh menetap di perangkat hanya alamat
 *      email murid sendiri, untuk satu kalimat status.
 *   4. Skrip Google TIDAK disentuh kalau fitur tidak dipasang, dan kegagalan
 *      memuatnya berakhir pada pesan yang bisa dibaca — bukan layar mati, karena
 *      formulir akun FIEZEL berdiri di bawahnya.
 *   5. SETIAP kunci naskah yang dipakai modul ini ADA di copy-id-google.js DAN
 *      copy-th-google.js. Kunci salah ketik akan tampil sebagai kunci mentah di
 *      layar murid, dan tidak ada gerbang lain yang melihatnya.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __fzRoot;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const SRC = read('features/auth/fiezel-google.js');

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const BASE = 'https://api.test';

/** Lingkungan murid tiruan: dokumen kecil, localStorage nyata, fetch yang direkam. */
function bootstrap(opts) {
  const o = opts || {};
  const store = {};
  const injected = [];
  const posts = [];
  const gsi = { init: null, rendered: null, disabled: 0 };

  function makeScript() {
    const listeners = {};
    return {
      tagName: 'SCRIPT',
      src: '',
      async: false,
      defer: false,
      attrs: {},
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
      _fire(type) { (listeners[type] || []).forEach((fn) => fn()); }
    };
  }

  const ctx = {
    console, JSON, Object, Array, String, Number, Math, Promise, Uint8Array, Error,
    setTimeout: (fn) => { /* batas waktu tidak pernah dipicu di gerbang ini */ return 0; },
    clearTimeout: () => {},
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    FIEZEL_CF_CONFIG: { base: BASE },
    FiezelI18n: {
      t: (k, params) => 'T:' + k + (params ? ':' + JSON.stringify(params) : ''),
      getLocale: () => o.locale || 'id'
    },
    crypto: { getRandomValues: (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() * 256) | 0; return arr; } },
    navigator: { onLine: true },
    fetch: async (url, init) => {
      posts.push({ url, init });
      const answer = o.answer || { status: 200, body: { ok: true, signedIn: true, linked: true, userId: 'u1', email: 'murid@sekolah.sch.id' } };
      return {
        ok: answer.status >= 200 && answer.status < 300,
        status: answer.status,
        json: async () => answer.body
      };
    }
  };
  if (o.googleConfig !== null) {
    ctx.FIEZEL_GOOGLE_AUTH = o.googleConfig || { enabled: true, clientId: 'uji.apps.googleusercontent.com' };
  }
  ctx.document = {
    /* Peristiwa dipicu SETELAH frame ini selesai, persis seperti browser: modul
       memasang pendengarnya sesudah appendChild, dan tiruan yang memicu lebih
       awal akan "lulus" hanya karena pendengarnya belum ada. */
    head: {
      appendChild: (el) => {
        injected.push(el);
        setImmediate(() => {
          if (o.scriptLoads !== false) installGoogle();
          el._fire(o.scriptLoads === false ? 'error' : 'load');
        });
      }
    },
    querySelector: () => null,
    createElement: () => makeScript()
  };
  function installGoogle() {
    ctx.google = {
      accounts: {
        id: {
          initialize: (cfg) => { gsi.init = cfg; },
          renderButton: (host, cfg) => { gsi.rendered = { host, cfg }; },
          disableAutoSelect: () => { gsi.disabled += 1; }
        }
      }
    };
  }
  ctx.self = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'fiezel-google.js' });
  return { api: ctx.FiezelGoogle, ctx, store, injected, posts, gsi };
}

/**
 * Jalankan satu putaran login penuh dan TUNGGU sampai jawabannya sampai ke
 * pemanggil. Tanpa ini gerbang memeriksa keadaan setengah jalan: callback Google
 * mengembalikan undefined, jadi `await` atasnya selesai sebelum permintaan ke
 * server dijawab — dan setiap pemeriksaan sesudahnya melihat dunia sebelum login.
 */
function loginPenuh(env, credential) {
  return new Promise(async (resolve) => {
    await env.api.renderButton({}, (hasil) => resolve(hasil));
    env.gsi.init.callback({ credential: credential });
  });
}

/* ------------------------------------------------------------------ kasus */

test('fitur tidak dipasang: skrip Google TIDAK PERNAH disuntik', async () => {
  const env = bootstrap({ googleConfig: { enabled: false, clientId: '' } });
  assert.strictEqual(env.api.available(), false, 'available() false');
  const hasil = await env.api.renderButton({}, () => {});
  assert.strictEqual(hasil.error, 'not_configured', 'ditolak sebagai tidak dipasang');
  assert.strictEqual(env.injected.length, 0, 'nol <script> Google disuntik');
});

test('skrip Google gagal dimuat: pesan terbaca, bukan lemparan', async () => {
  const env = bootstrap({ scriptLoads: false });
  const hasil = await env.api.renderButton({}, () => {});
  assert.strictEqual(hasil.ok, false, 'gagal dilaporkan');
  assert.strictEqual(hasil.error, 'script', 'kode galat script');
  assert.ok(hasil.message && hasil.message.length > 0, 'ada pesan untuk murid');
});

test('KUNCI: yang berangkat ke server hanya token + nonce', async () => {
  const env = bootstrap();
  const hasil = await loginPenuh(env, 'token.abc.def');
  assert.ok(env.gsi.init, 'Google diinisialisasi');
  assert.strictEqual(env.posts.length, 1, 'tepat satu permintaan');
  const req = env.posts[0];
  assert.strictEqual(req.url, BASE + '/api/auth/google', 'path benar');
  assert.strictEqual(req.init.credentials, 'include', 'cookie fz_id ikut — tanpa ini tautan mendarat di akun kosong');
  const body = JSON.parse(req.init.body);
  assert.deepStrictEqual(Object.keys(body).sort(), ['credential', 'nonce'], 'HANYA credential + nonce');
  for (const dilarang of ['email', 'sub', 'userId', 'role', 'handle']) {
    assert.ok(!(dilarang in body), 'nol field identitas: ' + dilarang);
  }
  assert.ok(hasil && hasil.ok, 'jawaban sukses diteruskan ke pemanggil');
});

test('KUNCI: nonce yang dikirim ke Google sama dengan yang dikirim ke server', async () => {
  const env = bootstrap();
  await new Promise(async (resolve) => {
    await env.api.renderButton({}, () => resolve());
    assert.ok(env.gsi.init.nonce && env.gsi.init.nonce.length >= 16, 'nonce dikirim ke Google');
    env.gsi.init.callback({ credential: 'token.abc.def' });
  });
  assert.strictEqual(JSON.parse(env.posts[0].init.body).nonce, env.gsi.init.nonce, 'nonce identik');
});

test('KUNCI: nonce BERBEDA setiap kali tombol digambar', async () => {
  const env = bootstrap();
  await env.api.renderButton({}, () => {});
  const a = env.gsi.init.nonce;
  await env.api.renderButton({}, () => {});
  const b = env.gsi.init.nonce;
  assert.notStrictEqual(a, b, 'nonce yang dipakai ulang bukan nonce');
});

test('KUNCI: token tidak pernah menetap di perangkat; hanya email', async () => {
  const env = bootstrap();
  await loginPenuh(env, 'token.rahasia.jangan-disimpan');
  const isi = JSON.stringify(env.store);
  assert.ok(!/token\.rahasia/.test(isi), 'token TIDAK tersimpan');
  assert.ok(!/credential/i.test(isi), 'nol kunci bernama credential');
  assert.strictEqual(env.api.rememberedEmail(), 'murid@sekolah.sch.id', 'email tersimpan untuk kalimat status');
});

test('keluar akun melupakan status tampilan dan mematikan pilih-otomatis', async () => {
  const env = bootstrap();
  await loginPenuh(env, 'token.abc.def');
  assert.ok(env.api.rememberedEmail(), 'ada email dulu');
  env.api.signOut();
  assert.strictEqual(env.api.rememberedEmail(), '', 'email dilupakan');
  assert.strictEqual(env.gsi.disabled, 1, 'disableAutoSelect dipanggil');
});

test('galat server dipetakan ke kalimat yang BERBEDA per sebab', async () => {
  const env = bootstrap({ answer: { status: 409, body: { error: 'google_account_already_linked' } } });
  const hasil = await env.api.submitCredential('token.abc.def', 'n1');
  assert.strictEqual(hasil.ok, false, 'gagal');
  assert.strictEqual(hasil.error, 'google_account_already_linked', 'kode diteruskan apa adanya');
  const pesan = new Set(['google_account_already_linked', 'rate_limited', 'unavailable',
    'google_email_unverified', 'offline', 'entah_apa'].map((c) => env.api.messageFor(c)));
  assert.strictEqual(pesan.size, 6, 'enam sebab, enam kalimat berbeda — bukan satu "terjadi kesalahan"');
});

test('tombol digambar dengan locale murid', async () => {
  const th = bootstrap({ locale: 'th' });
  await th.api.renderButton({}, () => {});
  assert.strictEqual(th.gsi.rendered.cfg.locale, 'th', 'murid Thai melihat tombol Thai');
  const id = bootstrap({ locale: 'id' });
  await id.api.renderButton({}, () => {});
  assert.strictEqual(id.gsi.rendered.cfg.locale, 'id', 'murid Indonesia melihat tombol Indonesia');
});

test('KUNCI: setiap kunci naskah yang dipakai ADA di copy id DAN th', async () => {
  const appSrc = read('app.js');
  const dipakai = new Set();
  for (const src of [SRC, appSrc]) {
    for (const m of src.matchAll(/['"](google\.[a-z0-9-]+)['"]/g)) dipakai.add(m[1]);
  }
  assert.ok(dipakai.size >= 10, 'gerbang menemukan kunci google.* (' + dipakai.size + ')');

  function kunciDari(rel) {
    const tangkapan = {};
    const stub = { registerCopy: (loc, map) => Object.assign(tangkapan, map || {}), overrideCopy: (loc, map) => Object.assign(tangkapan, map || {}) };
    const sandbox = { FiezelI18n: stub, console };
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    vm.runInContext(read(rel), vm.createContext(sandbox), { filename: rel });
    return tangkapan;
  }
  const idMap = kunciDari('features/i18n/copy-id-google.js');
  const thMap = kunciDari('features/i18n/copy-th-google.js');
  for (const kunci of dipakai) {
    assert.ok(kunci in idMap, 'kunci dipakai tapi tidak ada di copy-id-google.js: ' + kunci);
    assert.ok(kunci in thMap, 'kunci dipakai tapi tidak ada di copy-th-google.js: ' + kunci);
  }
});

test('halaman: CSP melebar TEPAT untuk Google, skrip terdaftar, precache lengkap', async () => {
  const html = read('index.html');
  const csp = (/content="(default-src[^"]*)"/.exec(html) || [])[1] || '';
  assert.ok(csp, 'CSP ditemukan');
  assert.ok(/script-src[^;]*https:\/\/accounts\.google\.com/.test(csp), 'script-src mengizinkan accounts.google.com');
  assert.ok(/frame-src[^;]*https:\/\/accounts\.google\.com/.test(csp), 'frame-src mengizinkan accounts.google.com');
  assert.ok(!/script-src[^;]*\*/.test(csp), 'CSP TIDAK dilonggarkan dengan wildcard');
  assert.ok(html.includes('./features/auth/fiezel-google.js'), 'modul dimuat halaman');
  assert.ok(html.includes('./features/i18n/copy-id-google.js'), 'naskah id dimuat halaman');
  assert.ok(!/<script[^>]*copy-th-google\.js/.test(html), 'naskah th TIDAK dimuat statis (murid id nol byte th)');
  const sw = read('sw.js');
  for (const aset of ['./features/auth/fiezel-google.js', './features/i18n/copy-id-google.js']) {
    assert.ok(sw.includes("'" + aset + "'"), 'ikut precache: ' + aset);
  }
  const loader = read('features/i18n/fiezel-th-loader.js');
  assert.ok(loader.includes('./features/i18n/copy-th-google.js'), 'naskah th disuntik pemuat th');
});

test('halaman: tombol Google TIDAK PERNAH menggantikan formulir akun FIEZEL', async () => {
  const appSrc = read('app.js');
  const i = appSrc.indexOf('const googleBlock=');
  assert.ok(i > 0, 'blok Google ditemukan di app.js');
  const blok = appSrc.slice(i, i + 1400);
  /* Blok hanya boleh MENAMBAH: kalau ia dirakit di cabang yang membuang tabContent,
     murid tanpa Google kehilangan satu-satunya jalan masuknya. */
  const html = appSrc.slice(appSrc.indexOf('const html=`<div class="modal-mark">FIEZEL AUTH'), appSrc.indexOf('openModal(html);'));
  assert.ok(html.includes('${googleBlock}'), 'blok Google ikut dirender');
  assert.ok(html.includes('${tabContent}'), 'formulir akun FIEZEL tetap dirender di layar yang sama');
  assert.ok(blok.includes("currentTab!=='teacher'"), 'tidak muncul di tab guru (jalurnya token undangan)');
});

(async () => {
  let pass = 0; let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('PASS ' + name); pass++; }
    catch (e) { console.error('FAIL ' + name + ' — ' + e.message); fail++; }
  }
  console.log('\ngoogle-auth-ui: ' + pass + '/' + (pass + fail) + ' lulus');
  process.exit(fail ? 1 : 0);
})();
