/**
 * features/auth/fiezel-account.js — LAPIS AKUN DI SISI MURID (§21, §22, §27).
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * Seluruh backend akun sudah hidup sejak PR #330 (`workers/api/route-account.js`,
 * terpasang SLOT 10 di `route-slots.js`) dan dijaga tiga gerbang (auth-role,
 * role-security, auth-schema-contract). Yang TIDAK ada adalah pemanggilnya:
 * `app.js` tidak pernah menyentuh satu pun `/api/account/*`, jadi guru dan murid
 * tidak punya cara masuk sama sekali. Backend tanpa pemanggil adalah janji, bukan
 * fitur — dan janji itu tidak terlihat mati karena semua gerbangnya hijau.
 *
 * ==========================================================================
 * IDENTITAS vs AKUN — DAN KENAPA URUTANNYA TIDAK BOLEH DIBALIK
 * ==========================================================================
 * `POST /api/account/register` MENOLAK permintaan tanpa identitas terverifikasi
 * (`route-account.js:85`). Jadi cookie `fz_id` harus terbit LEBIH DULU lewat
 * `POST /api/auth/anon`. Itu bukan formalitas: `sub` dari cookie itulah yang
 * dipakai sebagai kunci akun, sehingga murid yang sudah belajar berminggu-minggu
 * secara anonim TIDAK kehilangan progresnya saat mendaftar. Kalau modul ini
 * mendaftar lebih dulu lalu menerbitkan identitas belakangan, setiap pendaftaran
 * akan mencetak `sub` baru dan membuang seluruh riwayat belajar — kegagalan
 * paling mahal dan paling tidak terlihat sampai murid pertama mengeluh.
 *
 * ==========================================================================
 * EMPAT INVARIAN YANG DIJAGA `account-auth-client-test.js`
 * ==========================================================================
 *  1. PERANGKAT TIDAK PERNAH MENGIRIM IDENTITAS. Body yang berangkat hanya
 *     `handle`, `password`, dan `code`. Tidak ada `sub`, `userId`, `role`, atau
 *     `plan` — kalau klien boleh mengirimnya, siapa pun bisa meminta peran guru.
 *     Server menurunkan identitas dari cookie HttpOnly yang kode ini secara
 *     harfiah tidak bisa baca.
 *  2. PERAN DATANG DARI SERVER, TITIK. `role`, `shell`, dan `navigation` selalu
 *     disalin apa adanya dari jawaban server. Modul ini TIDAK punya cabang yang
 *     menghitung peran sendiri — cangkang guru yang bisa disimpulkan klien adalah
 *     cangkang guru yang bisa dipaksa klien.
 *  3. KATA SANDI TIDAK PERNAH DISIMPAN. Ia hidup sebagai argumen fungsi, dikirim,
 *     lalu hilang bersama frame-nya. Nol localStorage, nol sessionStorage, nol
 *     variabel modul.
 *  4. GAGAL MASUK SELALU BERBUNYI SAMA. Server sudah menyamakan `invalid_credentials`
 *     untuk handle-tak-ada dan sandi-salah (termasuk menyamakan BIAYA WAKTU-nya
 *     lewat hash boneka). Kalau naskah di sini membedakan keduanya, seluruh
 *     pekerjaan anti-enumerasi di server dibatalkan oleh satu kalimat UI.
 *
 * Nol dependency. Nol kerangka kerja. Satu global: `FiezelAccount`.
 */
(function (root) {
  'use strict';
  if (!root) return;

  var I18N = root.FiezelI18n;
  function t(key, fallback, params) { return I18N ? I18N.t(key, params) : fallback; }

  /* ------------------------------------------------------------------ kontrak */

  var API_PATHS = Object.freeze({
    anon: '/api/auth/anon',
    register: '/api/account/register',
    login: '/api/account/login',
    logout: '/api/account/logout',
    me: '/api/account/me',
    teacherActivate: '/api/account/teacher-activate'
  });

  /**
   * Cermin ATURAN SERVER, bukan aturan kedua. Angka-angka ini disalin dari
   * `workers/api/auth/password-core.js` (PASSWORD_RULES) dan `route-account.js`
   * (HANDLE_RE) supaya murid mendapat koreksi SEBELUM satu permintaan pun
   * berangkat. Server tetap satu-satunya otoritas: pemeriksaan di sini murni
   * kenyamanan, dan `account-auth-client-test.js` menuntut keduanya tetap sama
   * persis — cermin yang menyimpang lebih buruk daripada tidak ada cermin, karena
   * ia menolak sandi yang sebenarnya sah.
   */
  var HANDLE_RE = /^[a-z0-9_.\s-]{1,50}$/;
  var PASSWORD_MIN = 1;
  var PASSWORD_MAX = 200;
  var PASSWORD_MIN_CLASSES = 1;

  /** Peran dan cangkangnya — cermin `role-core.js` SHELL. */
  var SHELL = Object.freeze({ owner: '/owner/', teacher: '/teacher/', learner: '/learner/' });

  /* ------------------------------------------------------------------ naskah */

  /**
   * Naskah murid untuk setiap kode galat tertutup dari server. Ditulis dalam
   * bahasa yang dipakai murid ("nggak", bukan "tidak dapat"), tanpa istilah
   * teknis, dan tanpa satu pun kalimat yang membocorkan apakah sebuah handle
   * terdaftar (lihat invarian 4 di kepala berkas).
   */
  var ERROR_COPY = Object.freeze({
    offline: t('account.err-offline', 'Kamu lagi offline. Coba lagi kalau sudah ada internet ya.'),
    unavailable: t('account.err-unavailable', 'Servernya lagi nggak bisa dihubungi. Coba lagi sebentar lagi.'),
    account_disabled: t('account.err-disabled', 'Fitur akun belum aktif di aplikasi ini.'),
    // SATU kalimat untuk dua sebab yang berbeda. Itu disengaja.
    invalid_credentials: t('account.err-invalid', 'Nama atau kata sandinya nggak cocok. Coba cek lagi.'),
    account_locked: t('account.err-locked', 'Terlalu banyak percobaan. Tunggu sebentar sebelum coba lagi.'),
    handle_invalid: t('account.err-handle-invalid', 'Nama pengguna tidak boleh kosong (maksimal 50 karakter).'),
    handle_taken: t('account.err-handle-taken', 'Nama itu sudah dipakai orang lain. Coba nama lain ya.'),
    account_exists: t('account.err-exists', 'Perangkat ini sudah punya akun. Masuk saja pakai akun itu.'),
    invite_unusable: t('account.err-invite', 'Kode undangannya nggak bisa dipakai. Minta kode baru ke pengelola.'),
    code_malformed: t('account.err-code', 'Bentuk kode undangannya nggak benar. Cek lagi ketikannya.'),
    password_empty: t('account.err-pass-empty', 'Kata sandinya belum diisi.'),
    password_too_short: t('account.err-pass-short', 'Kata sandi minimal 1 karakter.'),
    password_too_long: t('account.err-pass-long', 'Kata sandinya kepanjangan (maksimal 200 karakter).'),
    password_too_simple: t('account.err-pass-simple', 'Kata sandi tidak boleh kosong.'),
    password_common: t('account.err-pass-common', 'Kata sandi itu terlalu gampang ditebak. Pilih yang lain ya.'),
    password_mismatch: t('account.err-pass-mismatch', 'Konfirmasi kata sandi tidak cocok. Cek lagi ya.'),
    unauthorized: t('account.err-unauthorized', 'Sesimu sudah habis. Masuk lagi ya.'),
    forbidden: t('account.err-forbidden', 'Akun ini nggak punya akses ke sana.'),
    unknown: t('account.err-unknown', 'Ada yang nggak beres. Coba lagi sebentar lagi.')
  });

  function copyFor(code, retryAfter) {
    var key = String(code || 'unknown');
    var line = ERROR_COPY[key] || ERROR_COPY.unknown;
    if (key === 'account_locked' && retryAfter > 0) {
      var minutes = Math.max(1, Math.ceil(Number(retryAfter) / 60));
      return line + ' (±' + minutes + ' menit)';
    }
    return line;
  }

  /* ------------------------------------------------------------------ util */

  function baseUrl() {
    try {
      var cfg = root.FIEZEL_CF_CONFIG || {};
      return String(cfg.base || '').trim().replace(/\/$/, '');
    } catch (_) { return ''; }
  }
  function online() {
    try { return !(root.navigator && root.navigator.onLine === false); } catch (_) { return true; }
  }
  function normalizeHandle(raw) {
    return typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ').toLowerCase() : '';
  }
  /** Cermin `characterClasses()` server: huruf kecil, huruf besar, angka, sisanya. */
  function characterClasses(raw) {
    var s = String(raw || ''), n = 0;
    if (/[a-z]/.test(s)) n++;
    if (/[A-Z]/.test(s)) n++;
    if (/[0-9]/.test(s)) n++;
    if (/[^a-zA-Z0-9]/.test(s)) n++;
    return n;
  }
  /**
   * Pemeriksaan sandi SEBELUM kirim. Mengembalikan kode galat tertutup yang sama
   * dengan server, jadi naskahnya satu peta untuk dua sumber. `null` = lolos.
   * CATATAN JUJUR: daftar sandi umum ada di server, bukan di sini — menyalin
   * daftarnya ke bundel murid berarti mengirim kamus tebakan ke setiap perangkat.
   * Jadi `password_common` hanya bisa datang dari server, dan itu benar.
   */
  function passwordProblem(raw) {
    if (typeof raw !== 'string' || raw.length === 0) return 'password_empty';
    if (raw.length < PASSWORD_MIN) return 'password_too_short';
    if (raw.length > PASSWORD_MAX) return 'password_too_long';
    if (characterClasses(raw) < PASSWORD_MIN_CLASSES) return 'password_too_simple';
    return null;
  }
  function handleProblem(raw) {
    return HANDLE_RE.test(normalizeHandle(raw)) ? null : 'handle_invalid';
  }

  function fail(code, status, retryAfter) {
    return { ok: false, status: status || 0, data: null, error: code, message: copyFor(code, retryAfter) };
  }

  /* ------------------------------------------------------------------ transport */

  var anonReady = false;

  /**
   * `POST /api/auth/anon` — idempoten (409 = sudah punya). Ini SATU-SATUNYA cara
   * modul ini memperoleh identitas; ia tidak pernah membaca, menyimpan, atau
   * mengirim `sub`, karena cookie `fz_id` HttpOnly dan kode ini tidak bisa
   * melihat isinya. Pola dan alasannya sama persis dengan lane sosial
   * (`features/social/fiezel-social.js:196`) — sengaja tidak dibuat versi kedua.
   */
  async function ensureAnon() {
    if (anonReady) return true;
    var base = baseUrl();
    if (!base) return false;
    try {
      var r = await fetch(base + API_PATHS.anon, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store'
      });
      anonReady = !!(r && (r.ok || r.status === 409));
      return anonReady;
    } catch (_) { return false; }
  }

  /**
   * Satu pintu semua panggilan akun. Jawabannya SERAGAM dan tidak pernah melempar:
   * {ok, status, data, error, message} dengan `message` sudah siap tampil.
   *
   * `credentials:'include'` WAJIB di setiap panggilan: tanpa cookie `fz_id`,
   * register/logout/me dijawab 401 oleh server dan seluruh lapis akun mati diam.
   *
   * Retry 401 dilakukan TEPAT SEKALI (`retried`), bukan perulangan: server yang
   * menjawab 401 terus-menerus akan membuat klien yang mengulang tanpa batas
   * memukul endpoint identitas selamanya dari perangkat murid.
   */
  async function call(path, body, method, retried) {
    if (!online()) return fail('offline');
    var base = baseUrl();
    if (!base) return fail('account_disabled');
    var m = method || (body === undefined ? 'GET' : 'POST');
    var opts = { method: m, credentials: 'include', mode: 'cors', cache: 'no-store' };
    if (m !== 'GET') {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body || {});
    }
    try {
      var r = await fetch(base + path, opts);
      var data = null;
      try { data = await r.json(); } catch (_) { data = null; }
      if (r.ok) return { ok: true, status: r.status, data: data, error: '', message: '' };

      var code = data && data.error ? String(data.error)
        : (r.status === 401 ? 'unauthorized'
          : r.status === 403 ? 'forbidden'
            : r.status === 503 ? 'unavailable' : 'unknown');

      if (r.status === 401 && !retried) {
        if (await ensureAnon()) return call(path, body, method, true);
      }
      return {
        ok: false,
        status: r.status,
        data: data,
        error: code,
        message: copyFor(code, data && data.retryAfter)
      };
    } catch (_) {
      return fail(online() ? 'unavailable' : 'offline');
    }
  }

  /* ------------------------------------------------------------------ sesi */

  /**
   * Potret sesi terakhir yang DIBERIKAN SERVER. Disimpan hanya di memori: peran
   * yang dicermin ke localStorage akan bertahan melewati logout dan bisa disunting
   * murid lewat DevTools, dan cangkang yang dipilih dari nilai yang bisa disunting
   * bukan gerbang sama sekali. Hilang saat reload adalah harga yang benar —
   * `me()` murah dan server tetap satu-satunya sumber kebenaran.
   */
  var session = null;

  function adoptAccount(data) {
    var acc = data && data.account ? data.account : null;
    if (!acc) return null;
    session = Object.freeze({
      handle: String(acc.handle || ''),
      role: String(acc.role || ''),
      shell: acc.shell || null,
      navigation: acc.navigation || null,
      institutionId: acc.institutionId || null
    });
    return session;
  }

  function state() { return session; }
  function signedIn() { return !!(session && session.handle); }
  function roleOf() { return session ? session.role : ''; }

  /* ------------------------------------------------------------------ API */

  /**
   * Muat sesi saat boot. 401 di sini BUKAN galat yang perlu diteriakkan: ia
   * keadaan normal murid yang memang belum punya akun. Karena itu jawabannya
   * dipetakan ke `{ok:false, error:'anonymous'}` yang senyap, bukan ke naskah
   * "sesimu habis" yang akan muncul di layar setiap kali aplikasi dibuka.
   */
  async function refresh() {
    var res = await call(API_PATHS.me);
    if (res.ok) { adoptAccount(res.data); return { ok: true, account: session }; }
    if (res.status === 401 || res.status === 403) { session = null; return { ok: false, error: 'anonymous', message: '' }; }
    return { ok: false, error: res.error, message: res.message };
  }

  async function register(arg1, arg2) {
    var handle, password, confirmPassword;
    if (arg1 && typeof arg1 === 'object') {
      handle = arg1.handle;
      password = arg1.password;
      confirmPassword = arg1.confirmPassword;
    } else {
      handle = arg1;
      password = arg2;
    }
    if (confirmPassword !== undefined && confirmPassword !== null && String(confirmPassword) !== String(password)) {
      return fail('password_mismatch', 400);
    }
    var hp = handleProblem(handle);
    if (hp) return fail(hp, 400);
    var pp = passwordProblem(password);
    if (pp) return fail(pp, 400);
    // Identitas HARUS ada sebelum daftar (lihat kepala berkas). Gagal menerbitkan
    // identitas dilaporkan apa adanya, bukan diteruskan menjadi 401 yang
    // membingungkan.
    if (!await ensureAnon()) return fail(online() ? 'unavailable' : 'offline');
    var res = await call(API_PATHS.register, { handle: normalizeHandle(handle), password: String(password) });
    if (res.ok) {
      adoptAccount(res.data);
      res.account = session;
    }
    return res;
  }

  async function login(arg1, arg2) {
    var handle, password;
    if (arg1 && typeof arg1 === 'object') {
      handle = arg1.handle;
      password = arg1.password;
    } else {
      handle = arg1;
      password = arg2;
    }
    // TIDAK ada pemeriksaan bentuk handle di sini. Menolak lebih awal karena
    // "bentuknya salah" memberi tahu penebak bahwa handle sah punya bentuk lain —
    // dan lebih penting lagi, server sudah menjawab seragam untuk semua kasus.
    if (!await ensureAnon()) { /* lanjut saja: login tidak menuntut identitas dulu */ }
    var res = await call(API_PATHS.login, { handle: normalizeHandle(handle), password: String(password || '') });
    if (res.ok) {
      adoptAccount(res.data);
      res.account = session;
    }
    return res;
  }

  async function logout() {
    var res = await call(API_PATHS.logout, {});
    // Sesi lokal dibuang APA PUN jawaban server: kalau server tidak bisa dihubungi,
    // murid yang menekan "keluar" tetap harus melihat dirinya keluar. Cookie fz_id
    // sengaja TIDAK disentuh — ia pembawa progres anonim, bukan sesi akun.
    session = null;
    return res;
  }

  async function activateTeacher(arg1, arg2, arg3) {
    var code, handle, password;
    if (arg1 && typeof arg1 === 'object') {
      code = arg1.code;
      handle = arg1.handle;
      password = arg1.password;
    } else {
      code = arg1;
      handle = arg2;
      password = arg3;
    }
    var body = { code: String(code || '').trim() };
    if (handle !== undefined && handle !== null && String(handle).trim() !== '') {
      var hp = handleProblem(handle);
      if (hp) return fail(hp, 400);
      body.handle = normalizeHandle(handle);
    }
    if (password !== undefined && password !== null && String(password) !== '') {
      var pp = passwordProblem(password);
      if (pp) return fail(pp, 400);
      body.password = String(password);
    }
    if (!await ensureAnon()) return fail(online() ? 'unavailable' : 'offline');
    var res = await call(API_PATHS.teacherActivate, body);
    if (res.ok) {
      adoptAccount(res.data);
      res.account = session;
    }
    return res;
  }

  function validateHandle(raw) {
    var h = normalizeHandle(raw);
    var prob = handleProblem(h);
    return { ok: !prob, handle: h, error: prob };
  }

  function validatePassword(raw) {
    var prob = passwordProblem(raw);
    return { ok: !prob, error: prob };
  }

  function validateCode(raw) {
    var code = String(raw || '').trim().toUpperCase();
    var ok = code.length === 32 && /^[2-9A-HJ-KM-NP-TV-Z]{32}$/.test(code);
    return { ok: ok, code: code, error: ok ? null : 'code_malformed' };
  }

  root.FiezelAccount = Object.freeze({
    PATHS: API_PATHS,
    SHELL: SHELL,
    RULES: Object.freeze({
      handle: HANDLE_RE,
      passwordMin: PASSWORD_MIN,
      passwordMax: PASSWORD_MAX,
      passwordMinClasses: PASSWORD_MIN_CLASSES
    }),
    copyFor: copyFor,
    normalizeHandle: normalizeHandle,
    handleProblem: handleProblem,
    passwordProblem: passwordProblem,
    validateHandle: validateHandle,
    validatePassword: validatePassword,
    validateCode: validateCode,
    ensureAnon: ensureAnon,
    api: call,
    refresh: refresh,
    getMe: refresh,
    register: register,
    login: login,
    logout: logout,
    activateTeacher: activateTeacher,
    state: state,
    getAccount: state,
    signedIn: signedIn,
    isLoggedIn: signedIn,
    role: roleOf,
    getRole: roleOf,
    isLearner: function() { return roleOf() === 'learner'; },
    isTeacher: function() { return roleOf() === 'teacher'; }
  });
})(typeof self !== 'undefined' ? self : this);
