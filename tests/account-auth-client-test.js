/**
 * tests/account-auth-client-test.js — GERBANG LAPIS AKUN SISI MURID.
 *
 * Ia menjalankan `features/auth/fiezel-account.js` SUNGGUHAN di dalam `vm`
 * (tanpa jaringan, tanpa DOM, dengan `fetch` tiruan yang MENCATAT setiap
 * permintaan), lalu menuntut lima invarian yang tidak boleh hilang diam-diam.
 * Memeriksanya dengan regex atas teks sumber tidak cukup untuk empat dari lima:
 * yang dijaga adalah PERILAKU (apa yang benar-benar berangkat ke server), bukan
 * ejaan kodenya.
 *
 * A. PERANGKAT TIDAK PERNAH MENGIRIM IDENTITAS. Body yang berangkat hanya boleh
 *    memuat `handle`, `password`, `code`. Satu field `sub`/`userId`/`role`/`plan`
 *    saja sudah cukup untuk mengubah "daftar" menjadi "minta jadi guru".
 * B. SETIAP PANGGILAN MEMBAWA COOKIE (`credentials:'include'`). Tanpa itu server
 *    menjawab 401 dan seluruh lapis akun mati diam — kelas cacat yang hijau di
 *    semua gerbang lain karena tidak ada yang memeriksa opsi fetch.
 * C. PERAN DATANG DARI SERVER. Modul tidak boleh punya cabang yang menghitung
 *    peran/cangkang sendiri; cangkang guru yang bisa disimpulkan klien adalah
 *    cangkang guru yang bisa dipaksa klien.
 * D. KATA SANDI TIDAK PERNAH DISIMPAN. localStorage/sessionStorage tiruan
 *    merekam SEMUA tulisan; tidak satu pun boleh memuat kata sandinya.
 * E. ATURAN KLIEN = ATURAN SERVER. Angka panjang sandi, jumlah kelas karakter,
 *    bentuk handle, dan peta cangkang dibaca dari SUMBER SERVER lalu diadu dengan
 *    nilai di modul. Cermin yang menyimpang menolak sandi yang sebenarnya sah —
 *    lebih buruk daripada tidak punya cermin sama sekali.
 *
 * Nol jaringan, nol dependency.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __fzRoot;
const MODULE_REL = 'features/auth/fiezel-account.js';
const MODULE_SRC = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');

let pass = 0;
const failures = [];
function check(name, ok, details) {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { failures.push({ name, details: String(details) }); console.log('  FAIL ' + name + ' — ' + details); }
}

/* ---------------------------------------------------------------------------
 * Harness: modul dijalankan di sandbox dengan fetch tiruan yang mencatat.
 * ------------------------------------------------------------------------- */
function loadModule(responder) {
  const calls = [];
  const stored = [];
  const storage = () => ({
    getItem() { return null; },
    setItem(k, v) { stored.push(String(k) + '=' + String(v)); },
    removeItem() {}, clear() {}
  });
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    FIEZEL_CF_CONFIG: { enabled: true, base: 'https://api.example.invalid' },
    navigator: { onLine: true },
    localStorage: storage(),
    sessionStorage: storage(),
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' },
    setTimeout, clearTimeout,
    fetch(url, init) {
      calls.push({ url: String(url), init: init || {} });
      return Promise.resolve(responder(String(url), init || {}, calls.length));
    }
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(MODULE_SRC, sandbox, { filename: MODULE_REL });
  return { api: sandbox.FiezelAccount, calls, stored, sandbox };
}

function reply(status, body) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}
function bodyOf(call) {
  try { return JSON.parse(call.init.body || '{}'); } catch { return {}; }
}

/* ---------------------------------------------------------------------------
 * 0. Modul termuat dan permukaannya utuh
 * ------------------------------------------------------------------------- */
const base = loadModule(() => reply(200, { ok: true }));
check('Modul mengekspor FiezelAccount', !!base.api, 'global FiezelAccount');
if (!base.api) { report(); process.exit(1); }

for (const fn of ['register', 'login', 'logout', 'refresh', 'activateTeacher', 'ensureAnon', 'state', 'signedIn', 'role']) {
  check('API punya ' + fn + '()', typeof base.api[fn] === 'function', typeof base.api[fn]);
}

/* ---------------------------------------------------------------------------
 * A. Nol field identitas yang berangkat
 * ------------------------------------------------------------------------- */
const FORBIDDEN_FIELDS = ['sub', 'userId', 'user_id', 'role', 'plan', 'shell', 'institutionId', 'class'];
const ALLOWED_FIELDS = ['handle', 'password', 'code'];

(async () => {
  {
    const m = loadModule((url) => url.endsWith('/api/auth/anon')
      ? reply(200, { ok: true })
      : reply(200, { ok: true, account: { handle: 'budi', role: 'learner', shell: '/learner/', navigation: [] } }));
    await m.api.register('budi', 'RahasiaKuat9');
    await m.api.login('budi', 'RahasiaKuat9');
    await m.api.activateTeacher('ABC-DEF-GHJ', 'bu_ani', 'RahasiaKuat9');

    const offenders = [];
    const strays = [];
    for (const c of m.calls) {
      const b = bodyOf(c);
      for (const f of FORBIDDEN_FIELDS) if (Object.prototype.hasOwnProperty.call(b, f)) offenders.push(c.url + ':' + f);
      for (const k of Object.keys(b)) if (!ALLOWED_FIELDS.includes(k)) strays.push(c.url + ':' + k);
    }
    check('A1 nol field identitas di body (sub/userId/role/plan/…)', offenders.length === 0, offenders.join(', ') || '0');
    check('A2 nol field di luar {handle,password,code}', strays.length === 0, strays.join(', ') || '0');

    /* B. credentials:'include' di SETIAP panggilan, termasuk /api/auth/anon */
    const noCreds = m.calls.filter(c => c.init.credentials !== 'include').map(c => c.url);
    check('B1 setiap panggilan memakai credentials:include', noCreds.length === 0, noCreds.join(', ') || m.calls.length + ' panggilan');
    const noStore = m.calls.filter(c => c.init.cache !== 'no-store').map(c => c.url);
    check('B2 setiap panggilan cache:no-store (jawaban sesi tidak boleh di-cache)', noStore.length === 0, noStore.join(', ') || 'ok');

    /* Urutan: identitas DULU, baru daftar (kontrak route-account.js:85) */
    const idxAnon = m.calls.findIndex(c => c.url.endsWith('/api/auth/anon'));
    const idxReg = m.calls.findIndex(c => c.url.endsWith('/api/account/register'));
    check('A3 /api/auth/anon dipanggil SEBELUM register', idxAnon >= 0 && idxAnon < idxReg, 'anon@' + idxAnon + ' register@' + idxReg);

    /* D. kata sandi tidak pernah masuk penyimpanan */
    const leaked = m.stored.filter(s => s.includes('RahasiaKuat9'));
    check('D1 kata sandi tidak pernah ditulis ke storage', leaked.length === 0, leaked.join(' | ') || m.stored.length + ' tulisan');
  }

  /* -------------------------------------------------------------------------
   * C. Peran datang dari server — dan HANYA dari server
   * ----------------------------------------------------------------------- */
  {
    const m = loadModule((url) => url.endsWith('/api/auth/anon')
      ? reply(200, { ok: true })
      : reply(200, { ok: true, account: { handle: 'bu_ani', role: 'teacher', shell: '/teacher/', navigation: ['kelas'], institutionId: 'inst123' } }));
    await m.api.login('bu_ani', 'RahasiaKuat9');
    const st = m.api.state();
    check('C1 peran diadopsi apa adanya dari server', st && st.role === 'teacher', st ? st.role : 'null');
    check('C2 cangkang diadopsi apa adanya dari server', st && st.shell === '/teacher/', st ? String(st.shell) : 'null');
    check('C3 institutionId diadopsi dari server', st && st.institutionId === 'inst123', st ? String(st.institutionId) : 'null');
  }
  {
    // Jawaban sukses TANPA `account` tidak boleh menghasilkan sesi karangan.
    const m = loadModule(() => reply(200, { ok: true }));
    await m.api.login('budi', 'RahasiaKuat9');
    check('C4 sukses tanpa objek account = sesi tetap kosong', m.api.state() === null, JSON.stringify(m.api.state()));
  }
  {
    // Modul tidak boleh MENGARANG peran: nol literal peran di sisi penetapan.
    const assignsRole = /\brole\s*[:=]\s*['"](owner|teacher|learner)['"]/.test(MODULE_SRC);
    check('C5 nol penetapan peran berupa literal di dalam modul', !assignsRole, assignsRole ? 'ada literal peran yang ditetapkan' : 'bersih');
  }

  /* -------------------------------------------------------------------------
   * D2. Nol penyimpanan sama sekali di modul (bukan cuma "tidak bocor")
   * ----------------------------------------------------------------------- */
  {
    const usesStorage = /(localStorage|sessionStorage|indexedDB)\s*\./.test(MODULE_SRC);
    check('D2 modul tidak menyentuh localStorage/sessionStorage/indexedDB', !usesStorage, usesStorage ? 'ada akses penyimpanan' : 'bersih');
  }

  /* -------------------------------------------------------------------------
   * 401 ditangani SEKALI, bukan berulang
   * ----------------------------------------------------------------------- */
  {
    const m = loadModule(() => reply(401, { error: 'unauthorized' }));
    const res = await m.api.refresh();
    check('E0 401 beruntun berhenti (bukan loop tak berbatas)', m.calls.length <= 4, m.calls.length + ' panggilan');
    check('E0b 401 pada me() dilaporkan senyap sebagai anonymous', res && res.error === 'anonymous', JSON.stringify(res));
  }

  /* -------------------------------------------------------------------------
   * Logout membuang sesi APA PUN jawaban server
   * ----------------------------------------------------------------------- */
  {
    const m = loadModule((url) => url.endsWith('/api/account/logout')
      ? reply(503, { error: 'unavailable' })
      : reply(200, { ok: true, account: { handle: 'budi', role: 'learner', shell: '/learner/', navigation: [] } }));
    await m.api.login('budi', 'RahasiaKuat9');
    check('F1 sesi terisi sesudah login', m.api.signedIn() === true, String(m.api.signedIn()));
    await m.api.logout();
    check('F2 logout membuang sesi walau server 503', m.api.signedIn() === false, String(m.api.signedIn()));
  }

  /* -------------------------------------------------------------------------
   * Naskah gagal-masuk SERAGAM (anti-enumerasi akun)
   * ----------------------------------------------------------------------- */
  {
    const copy = base.api.copyFor('invalid_credentials');
    check('G1 naskah invalid_credentials ada dan satu kalimat', typeof copy === 'string' && copy.length > 0, copy);
    const suspicious = /tidak terdaftar|belum terdaftar|tidak ditemukan|akun tidak ada|handle tidak ada/i.test(MODULE_SRC);
    check('G2 nol naskah yang membocorkan keberadaan akun', !suspicious, suspicious ? 'ada naskah pembeda' : 'bersih');
  }

  /* -------------------------------------------------------------------------
   * E. Cermin aturan server — dibaca dari SUMBER server, bukan ditulis ulang
   * ----------------------------------------------------------------------- */
  {
    const pwSrc = fs.readFileSync(path.join(ROOT, 'workers/api/auth/password-core.js'), 'utf8');
    const acctSrc = fs.readFileSync(path.join(ROOT, 'workers/api/route-account.js'), 'utf8');
    const roleSrc = fs.readFileSync(path.join(ROOT, 'workers/api/auth/role-core.js'), 'utf8');

    const num = (src, key) => {
      const m = new RegExp(key + '\\s*:\\s*(\\d+)').exec(src);
      return m ? Number(m[1]) : NaN;
    };
    const srvMin = num(pwSrc, 'MIN_LENGTH');
    const srvMax = num(pwSrc, 'MAX_LENGTH');
    const srvClasses = num(pwSrc, 'MIN_CLASSES');
    const rules = base.api.RULES;

    check('E1 panjang minimum sandi sama dengan server', rules.passwordMin === srvMin, 'klien=' + rules.passwordMin + ' server=' + srvMin);
    check('E2 panjang maksimum sandi sama dengan server', rules.passwordMax === srvMax, 'klien=' + rules.passwordMax + ' server=' + srvMax);
    check('E3 jumlah kelas karakter sama dengan server', rules.passwordMinClasses === srvClasses, 'klien=' + rules.passwordMinClasses + ' server=' + srvClasses);

    const srvHandle = /HANDLE_RE\s*=\s*(\/[^;\n]+\/)/.exec(acctSrc);
    check('E4 bentuk handle sama persis dengan server', !!srvHandle && String(rules.handle) === srvHandle[1],
      'klien=' + String(rules.handle) + ' server=' + (srvHandle ? srvHandle[1] : 'tak terbaca'));

    // Peta cangkang: setiap peran server harus punya cangkang identik di klien.
    const shellPairs = [...roleSrc.matchAll(/\[ROLE\.(OWNER|TEACHER|LEARNER)\]\s*:\s*'([^']+)'/g)]
      .map(m => [m[1].toLowerCase(), m[2]]);
    check('E5 peta cangkang server terbaca', shellPairs.length === 3, shellPairs.length + ' pasangan');
    const shellDrift = shellPairs.filter(([role, p]) => base.api.SHELL[role] !== p)
      .map(([role, p]) => role + ':' + p + '!=' + base.api.SHELL[role]);
    check('E6 peta cangkang klien identik dengan server', shellDrift.length === 0, shellDrift.join(', ') || 'identik');
  }

  /* -------------------------------------------------------------------------
   * Pemeriksaan awal menolak SEBELUM permintaan berangkat (hemat kuota + UX)
   * ----------------------------------------------------------------------- */
  {
    const m = loadModule(() => reply(200, { ok: true }));
    const empty = await m.api.register('budi', '');
    check('H1 sandi kosong ditolak tanpa permintaan', empty.error === 'password_empty' && m.calls.length === 0,
      empty.error + ' / ' + m.calls.length + ' panggilan');
    const bad = await m.api.register('B!', 'RahasiaKuat9');
    check('H2 handle salah bentuk ditolak tanpa permintaan', bad.error === 'handle_invalid', bad.error);
    const simple = await m.api.register('budi', 'aaaaaaaaaaaa');
    check('H3 sandi sederhana diizinkan lolos di kebijakan santai', simple.ok === true, simple.error || 'ok');
  }
  {
    // Login TIDAK boleh menolak lebih awal karena bentuk handle: server menjawab
    // seragam, dan penolakan awal justru memberi tahu penebak bentuk yang sah.
    const m = loadModule((url) => url.endsWith('/api/auth/anon') ? reply(200, {}) : reply(401, { error: 'invalid_credentials' }));
    const res = await m.api.login('X!', 'apa saja');
    const hitLogin = m.calls.some(c => c.url.endsWith('/api/account/login'));
    check('H4 login tetap dikirim walau bentuk handle aneh (anti-oracle)', hitLogin, JSON.stringify(res.error));
  }

  /* -------------------------------------------------------------------------
   * Terdaftar di CI — gerbang yang tidak dipanggil tidak pernah merah
   * ----------------------------------------------------------------------- */
  {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/quality.yml'), 'utf8');
    check('I1 gerbang ini terdaftar di quality.yml', wf.includes('node tests/account-auth-client-test.js'), 'quality.yml');
    const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    check('I2 modul dimuat index.html', idx.includes('features/auth/fiezel-account.js'), 'index.html');
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    check('I3 modul ikut precache sw.js', sw.includes('./features/auth/fiezel-account.js'), 'sw.js ASSETS');
  }

  report();
})().catch(err => {
  console.error('account-auth-client-test: GALAT ALAT —', err && err.stack ? err.stack : err);
  process.exit(1);
});

function report() {
  console.log('');
  if (failures.length) {
    console.log('account-auth-client-test: FAIL (' + pass + ' pass, ' + failures.length + ' fail)');
    process.exitCode = 1;
  } else {
    console.log('account-auth-client-test: PASS (' + pass + ' assert)');
  }
}
