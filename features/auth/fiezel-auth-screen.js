/**
 * features/auth/fiezel-auth-screen.js — LAYAR MASUK FIEZEL (Selamat datang · Masuk · Daftar).
 *
 * ==========================================================================
 * KENAPA LAYAR INI ADA (m025-367, keputusan OWNER 24 September 2026)
 * ==========================================================================
 * Audit login & onboarding (https://claude.ai/artifact/Ucq5fvGRYbrKVTJUGuv8c4) menemukan
 * bahwa FIEZEL bisa dipakai penuh tanpa akun: identitas anonim terbit otomatis, tombol
 * Google hanya blok sekunder di bawah pemilih bahasa, dan gerbang login lama tidak pernah
 * dipasang. Owner: "user masih bisa masuk tanpa harus membuat akun, itu sangat fatal —
 * data siswa yang penting harus tersimpan di server, dan user bisa login di HP mana saja
 * cukup menggunakan login dari Gmail."
 *
 * Owner juga memberi referensi tiga layar (Welcome → Sign in → Sign up) dan dua aturan:
 *   1. Pilihan MURID atau GURU tidak lagi ada di onboarding — ia ada di layar ini.
 *   2. Kode KelasKu juga dimasukkan di layar ini.
 *
 * ==========================================================================
 * SIAPA MASUK LEWAT APA
 * ==========================================================================
 *   MURID — "Masuk dengan Google" adalah aksi utama. Akun FIEZEL (nama pengguna + kata
 *           sandi, rute /api/account/register yang sudah ada) adalah jalur cadangan untuk
 *           murid tanpa Gmail dan untuk jaringan sekolah yang memblokir Google — tanpa
 *           cadangan ini, login wajib mengunci murid itu dari materinya sendiri.
 *   GURU  — akun FIEZEL guru. Guru baru mengaktifkan akunnya dengan kode undangan owner
 *           (rute /api/account/teacher-activate yang sudah ada), jadi "Daftar" guru sama
 *           dengan aktivasi.
 *
 * Layar ini TIDAK menyimpan kata sandi, token, atau nama. Yang ditulisnya ke perangkat
 * hanya satu penanda tampilan (SESSION_KEY): "perangkat ini sudah pernah masuk sebagai
 * murid/guru". Penanda itu bukan bukti — sesi yang sah tetap cookie HttpOnly milik server,
 * dan app.js memeriksanya ke /api/auth/session begitu online.
 *
 * Nol dependency. Satu global: `FiezelAuthScreen`.
 */
(function (root) {
  'use strict';
  if (!root) return;

  var SESSION_KEY = 'fiezel-auth-v1';
  var ROLES = ['murid', 'guru'];
  var googleGagal = false; // GSI gagal dimuat di sesi ini (jaringan sekolah, adblock)

  function I() { return root.FiezelI18n || null; }
  function t(key, fallback, params) {
    var s;
    try { var i18n = I(); s = i18n && i18n.t ? i18n.t(key, params) : undefined; } catch (_) {}
    if (s === undefined || s === key) s = fallback == null ? key : fallback;
    if (params) s = String(s).replace(/\{(\w+)\}/g, function (m, n) { return Object.prototype.hasOwnProperty.call(params, n) ? String(params[n]) : m; });
    return s;
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function locale() { try { var i = I(); return (i && i.getLocale && i.getLocale()) === 'th' ? 'th' : 'id'; } catch (_) { return 'id'; } }

  /* ----------------------------------------------------------------- penanda sesi */

  function readSession(env) {
    try {
      var raw = JSON.parse((env || root).localStorage.getItem(SESSION_KEY) || 'null');
      if (raw && raw.v === 1 && raw.signedIn === true && ROLES.indexOf(raw.role) !== -1) return raw;
    } catch (_) {}
    return null;
  }
  function saveSession(env, detail) {
    var d = detail || {};
    var rec = {
      v: 1, signedIn: true, at: Date.now(),
      role: ROLES.indexOf(d.role) !== -1 ? d.role : 'murid',
      via: d.via === 'google' ? 'google' : 'akun'
    };
    try { (env || root).localStorage.setItem(SESSION_KEY, JSON.stringify(rec)); } catch (_) {}
    return rec;
  }
  function clearSession(env) { try { (env || root).localStorage.removeItem(SESSION_KEY); } catch (_) {} }

  /**
   * Tanya server: apakah cookie perangkat ini memang sudah masuk? (GET /api/auth/session)
   * null = tidak tahu (offline, server lama, galat) — pemanggil TIDAK boleh menganggapnya
   * "belum masuk", supaya server yang belum diperbarui tidak mengunci semua murid.
   */
  function checkServer(env) {
    var w = env || root, base = '';
    try { base = String(((w.FIEZEL_CF_CONFIG || {}).base) || '').trim().replace(/\/$/, ''); } catch (_) {}
    if (!base || typeof w.fetch !== 'function') return Promise.resolve(null);
    return w.fetch(base + '/api/auth/session', { credentials: 'include', mode: 'cors', cache: 'no-store' })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (d) { return d && d.ok === true && typeof d.signedIn === 'boolean' ? d : null; })
      .catch(function () { return null; });
  }

  /** Kode KelasKu: FZ- + enam karakter. Bentuk saja — kebenarannya urusan server/guru. */
  function normalizeClassCode(v) {
    var s = String(v == null ? '' : v).toUpperCase().replace(/\s+/g, '');
    if (!s) return '';
    if (/^[A-Z0-9]{6}$/.test(s)) s = 'FZ-' + s;
    return /^FZ-[A-Z0-9]{6}$/.test(s) ? s : null;
  }

  /* ----------------------------------------------------------------- gambar */

  /* Kontur topografi (referensi owner) — pola dekoratif murni, dihitung sekali dari
     titik-titik yang diganggu sinus, jadi berkasnya tidak memuat gambar apa pun. */
  var TOPO = 'M121 120C122 123 118 128 115 131C112 133 106 134 102 134C98 135 94 136 90 135C85 135 76 135 74 132C72 130 77 124 77 120C78 116 77 113 79 110C81 107 84 103 88 102C92 101 100 101 103 103C107 104 107 109 110 112C113 115 121 117 121 120Z|M146 120C147 126 140 137 134 141C127 146 116 144 107 147C98 149 90 155 82 155C73 154 59 149 55 143C52 137 57 127 58 120C59 113 59 107 63 101C66 95 72 83 80 81C88 79 101 86 109 89C117 93 120 98 127 103C133 108 145 114 146 120Z|M171 120C172 131 164 146 154 153C144 159 126 154 112 159C98 163 83 180 71 179C59 178 45 162 39 152C33 142 35 130 35 120C36 110 38 101 44 91C50 80 59 60 70 58C82 56 100 73 113 78C126 84 139 83 149 90C159 97 171 109 171 120Z|M197 120C197 135 188 156 175 165C161 173 137 166 118 173C99 180 75 210 60 208C44 205 33 175 25 161C16 146 10 134 9 120C9 106 14 93 22 78C31 64 44 35 60 34C76 32 98 61 118 68C137 75 163 66 177 74C190 83 198 105 197 120Z|M225 120C223 140 209 163 193 175C177 187 151 183 126 193C102 203 67 240 48 236C28 232 21 188 10 169C-1 150 -16 138 -19 120C-21 102 -16 81 -4 63C7 45 30 13 51 12C72 11 97 47 123 55C149 62 190 46 207 57C224 68 228 100 225 120Z|M257 120C252 144 228 167 208 183C188 200 167 209 138 221C110 234 62 268 37 261C13 254 6 203 -8 179C-22 156 -42 142 -47 120C-52 98 -53 65 -38 44C-23 23 16 -3 44 -4C73 -6 99 28 131 35C163 43 217 26 238 40C259 54 262 96 257 120Z|M292 120C284 148 243 167 220 190C197 214 186 244 154 259C122 274 60 291 29 280C-1 269 -14 219 -31 192C-49 166 -69 148 -76 120C-84 92 -97 44 -77 22C-58 -1 4 -11 40 -14C77 -16 105 1 143 7C181 13 242 5 266 23C291 42 299 92 292 120Z|M328 120C318 152 259 167 233 197C207 228 208 289 173 305C138 320 63 309 24 293C-15 277 -38 237 -60 208C-82 180 -98 155 -108 120C-118 85 -144 21 -120 -2C-96 -26 -8 -14 38 -19C85 -24 116 -35 159 -30C201 -26 265 -17 293 8C321 34 338 88 328 120Z|M349 70C349 73 346 76 344 78C341 80 338 79 334 81C331 82 325 88 323 88C320 87 319 80 318 77C316 74 314 73 313 70C313 67 313 64 315 61C316 59 320 54 323 54C326 54 330 60 334 61C338 62 344 59 347 60C350 62 350 67 349 70Z|M371 70C369 76 361 80 356 85C351 89 348 93 341 96C334 100 321 108 315 106C309 104 308 90 305 84C302 78 296 76 295 70C293 64 291 55 295 50C298 45 310 40 318 40C325 40 330 48 339 49C347 51 361 46 366 49C372 53 372 64 371 70Z|M395 70C392 79 374 82 367 91C359 99 360 114 351 119C341 124 319 125 309 121C299 116 295 102 289 93C283 85 278 80 275 70C272 60 263 42 269 36C276 29 301 31 314 30C326 30 334 30 346 32C358 33 378 32 386 38C394 45 398 61 395 70Z|M422 70C417 82 389 84 379 98C369 111 376 144 363 150C351 156 319 141 304 134C288 126 277 116 268 105C259 94 255 84 250 70C245 56 230 27 240 19C250 11 291 25 310 23C330 21 340 5 357 6C373 7 397 15 408 26C418 37 427 58 422 70Z|M446 70C440 86 408 89 397 108C386 127 393 177 377 183C361 189 321 156 299 145C277 134 259 130 245 118C232 106 223 89 218 70C212 51 198 13 213 3C227 -6 280 18 307 14C333 9 349 -24 369 -24C390 -24 417 -2 430 13C442 29 451 54 446 70Z|M315 300C315 302 312 303 311 306C309 309 309 315 306 315C304 316 299 312 296 310C293 309 290 309 288 307C286 305 284 303 283 300C283 297 282 293 285 291C287 290 293 293 297 292C300 291 303 286 306 286C309 286 312 290 314 292C315 294 316 298 315 300Z|M328 300C328 305 330 310 327 316C325 321 319 329 313 330C307 331 297 324 291 321C285 319 280 318 275 314C269 311 261 305 260 300C260 295 267 288 272 284C278 281 285 282 292 280C298 278 306 270 312 271C318 271 327 278 330 283C332 288 329 295 328 300Z|M341 300C342 310 358 323 354 330C350 338 330 343 318 344C307 345 295 340 285 337C275 333 267 330 258 324C249 318 228 307 229 300C230 293 254 286 263 279C272 273 274 265 284 261C293 256 308 252 319 254C330 256 345 265 349 272C352 280 340 290 341 300Z'.split('|');
  function topo() {
    return '<svg class="fz-auth-topo" viewBox="0 0 390 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'
      + TOPO.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</svg>';
  }
  function wave() {
    return '<svg class="fz-auth-wave" viewBox="0 0 390 72" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
      + '<path d="M0 34C62 4 128 0 186 22s118 50 204 8V72H0Z"/></svg>';
  }
  function icon(name) {
    var p = {
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
      hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
      key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2"/>',
      eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
      arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>'
    }[name] || '';
    return '<svg class="fz-auth-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + p + '</svg>';
  }
  function brand(env) {
    var S = env && env.FiezelSplash;
    var wm = S && typeof S.wordmarkMarkup === 'function' ? S.wordmarkMarkup('fzauth') : '<p class="fz-auth-word">FIEZEL</p>';
    return '<div class="fz-auth-brand">' + wm + '</div>';
  }
  function paw(env, pose) {
    return '';
  }
  function langSwitch() {
    var cur = locale();
    return '<div class="fz-auth-lang" role="group" aria-label="Bahasa · ภาษา">'
      + [['id', 'ID'], ['th', 'ไทย']].map(function (l) {
        return '<button type="button" data-auth-locale="' + l[0] + '" aria-pressed="' + (cur === l[0] ? 'true' : 'false') + '"'
          + ' class="fz-plain' + (cur === l[0] ? ' is-on' : '') + '" lang="' + l[0] + '">' + l[1] + '</button>';
      }).join('') + '</div>';
  }
  function hero(env, screen) {
    return '<header class="fz-auth-hero is-' + screen + '">' + topo() + langSwitch() + brand(env)
      + wave() + '</header>';
  }
  function field(o) {
    return '<label class="fz-auth-field">'
      + '<span class="fz-auth-label">' + esc(o.label) + (o.optional ? ' <small>' + esc(t('auth.layar.opsional', '(opsional)')) + '</small>' : '') + '</span>'
      + '<span class="fz-auth-input">' + icon(o.icon)
      + '<input name="' + o.name + '" type="' + (o.type || 'text') + '"' + (o.auto ? ' autocomplete="' + o.auto + '"' : '')
      + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '')
      + ' autocapitalize="' + (o.caps || 'none') + '" spellcheck="false" data-testid="auth-' + o.name + '"' + (o.required ? ' required' : '') + '>'
      + (o.type === 'password' ? '<button type="button" class="fz-auth-eye fz-plain" data-auth-eye aria-label="' + esc(t('auth.layar.lihat-sandi', 'Tampilkan kata sandi')) + '">' + icon('eye') + '</button>' : '')
      + '</span></label>';
  }
  function roleTabs(role) {
    return '<div class="fz-auth-roles" role="tablist" aria-label="' + esc(t('auth.layar.peran-aria', 'Masuk sebagai')) + '">'
      + [['murid', t('auth.layar.murid', 'Murid')], ['guru', t('auth.layar.guru', 'Guru')]].map(function (r) {
        var on = r[0] === role;
        return '<button type="button" role="tab" aria-selected="' + (on ? 'true' : 'false') + '" class="fz-auth-role fz-plain' + (on ? ' is-on' : '') + '" data-auth-role="' + r[0] + '" data-testid="auth-role-' + r[0] + '">' + esc(r[1]) + '</button>';
      }).join('') + '</div>';
  }
  function or(text) { return '<p class="fz-auth-or" data-auth-or><span>' + esc(text) + '</span></p>'; }
  function submit(label, busy) {
    return '<button type="submit" class="primary fz-auth-submit" data-testid="auth-submit"' + (busy ? ' disabled aria-busy="true"' : '') + '>'
      + esc(busy ? t('auth.layar.memproses', 'Memproses…') : label) + '</button>';
  }

  function welcomeBody() {
    return '<h1 class="fz-auth-title">' + esc(t('auth.layar.selamat-datang', 'Selamat datang')) + '</h1>'
      + '<p class="fz-auth-lead">' + esc(t('auth.layar.welcome-lead', 'Belajar Bahasa Inggris dan Bahasa Jepang adaptif. Masuk sekali, progresmu ikut ke HP mana pun.')) + '</p>'
      + '<div class="fz-auth-next-row"><button type="button" class="fz-auth-next fz-plain" data-auth-go="masuk" data-testid="auth-continue">'
      + '<span>' + esc(t('auth.layar.lanjut', 'Lanjut')) + '</span><span class="fz-auth-next-dot">' + icon('arrow') + '</span></button></div>';
  }
  function formBody(ui) {
    var daftar = ui.screen === 'daftar', guru = ui.role === 'guru';
    var html = '<h1 class="fz-auth-title is-underlined">' + esc(daftar ? t('auth.layar.daftar', 'Daftar') : t('auth.layar.masuk', 'Masuk')) + '</h1>'
      + roleTabs(ui.role);
    if (!guru) {
      html += '<div class="fz-auth-google" data-auth-google data-testid="auth-google"></div>'
        + '<p class="fz-auth-note" data-auth-google-note role="status"></p>'
        + or(daftar ? t('auth.layar.atau-buat', 'atau buat akun FIEZEL') : t('auth.layar.atau-akun', 'atau pakai akun FIEZEL'));
    } else {
      html += '<p class="fz-auth-hint">' + esc(daftar
        ? t('auth.layar.guru-daftar-hint', 'Akun guru dibuat dengan kode undangan dari admin FIEZEL.')
        : t('auth.layar.guru-masuk-hint', 'Masuk dengan akun guru yang sudah kamu aktifkan.')) + '</p>';
    }
    html += '<form class="fz-auth-form" data-auth-form novalidate>';
    if (guru && daftar) html += field({ name: 'code', label: t('auth.layar.kode-undangan', 'Kode undangan'), icon: 'key', caps: 'characters', max: 40, required: true, auto: 'one-time-code' });
    html += field({ name: 'handle', label: t('auth.layar.nama-pengguna', 'Nama pengguna'), icon: 'user', auto: 'username', max: 50, required: true });
    html += field({ name: 'password', type: 'password', label: t('auth.layar.kata-sandi', 'Kata sandi'), icon: 'lock', auto: daftar ? 'new-password' : 'current-password', max: 128, required: true });
    if (daftar) html += field({ name: 'password2', type: 'password', label: t('auth.layar.ulangi-sandi', 'Ulangi kata sandi'), icon: 'lock', auto: 'new-password', max: 128, required: true });
    if (!guru) html += field({ name: 'classCode', label: t('auth.layar.kode-kelasku', 'Kode KelasKu'), icon: 'hash', caps: 'characters', max: 9, placeholder: 'FZ-XXXXXX', optional: true });
    if (!daftar) {
      html += '<div class="fz-auth-row"><button type="button" class="fz-auth-link fz-plain" data-auth-forgot>' + esc(t('auth.layar.lupa', 'Lupa kata sandi?')) + '</button></div>'
        + (ui.forgot ? '<p class="fz-auth-note is-info" data-testid="auth-forgot-note">' + esc(guru
          ? t('auth.layar.lupa-guru', 'Hubungi admin FIEZEL untuk mengatur ulang kata sandi guru.')
          : t('auth.layar.lupa-murid', 'Belum ada pemulihan otomatis. Masuk dengan Google bila akunmu tertaut, atau minta bantuan gurumu.')) + '</p>' : '');
    }
    html += '<p class="fz-auth-error" role="alert" data-auth-error>' + esc(ui.error || '') + '</p>'
      + submit(daftar ? (guru ? t('auth.layar.aktifkan', 'Aktifkan akun guru') : t('auth.layar.daftar', 'Daftar')) : t('auth.layar.masuk', 'Masuk'), ui.busy)
      + '</form>'
      + '<p class="fz-auth-alt">' + esc(daftar
        ? (guru ? t('auth.layar.sudah-guru', 'Sudah punya akun guru?') : t('auth.layar.sudah-akun', 'Sudah punya akun?'))
        : (guru ? t('auth.layar.belum-guru', 'Guru baru?') : t('auth.layar.belum-akun', 'Belum punya akun?')))
      + ' <button type="button" class="fz-auth-link fz-plain" data-auth-go="' + (daftar ? 'masuk' : 'daftar') + '" data-testid="auth-switch">'
      + esc(daftar ? t('auth.layar.masuk', 'Masuk') : (guru ? t('auth.layar.aktifkan-singkat', 'Aktifkan akun') : t('auth.layar.daftar', 'Daftar'))) + '</button></p>'
      + (guru ? '<p class="fz-auth-alt"><a class="fz-auth-link" href="./?teacher=preview" data-testid="auth-teacher-demo">' + esc(t('auth.layar.demo-guru', 'Lihat demo Ruang Guru')) + '</a></p>' : '');
    return html;
  }
  function markup(env, ui) {
    return hero(env, ui.screen) + '<main class="fz-auth-body" data-auth-body>'
      + (ui.screen === 'welcome' ? welcomeBody() : formBody(ui)) + '</main>';
  }

  /* ----------------------------------------------------------------- pesan galat */

  function accountError(res) {
    var e = String((res && (res.error || res.problem)) || '');
    var map = {
      invalid_credentials: t('auth.layar.galat-kredensial', 'Nama pengguna atau kata sandi salah.'),
      handle_taken: t('auth.layar.galat-nama-dipakai', 'Nama pengguna itu sudah dipakai. Coba nama lain.'),
      handle_invalid: t('auth.layar.galat-nama', 'Nama pengguna hanya boleh huruf, angka, titik, garis bawah, atau tanda hubung.'),
      account_exists: t('auth.layar.galat-sudah-ada', 'Perangkat ini sudah punya akun. Masuk dengan akun itu.'),
      rate_limited: t('auth.layar.galat-cepat', 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.'),
      account_locked: t('auth.layar.galat-cepat', 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.'),
      password_empty: t('auth.layar.galat-kosong', 'Isi nama pengguna dan kata sandi.'),
      password_mismatch: t('auth.layar.galat-beda', 'Kedua kata sandi belum sama.'),
      password_common: t('auth.layar.galat-sandi-mudah', 'Kata sandi itu terlalu mudah ditebak. Pilih yang lain.'),
      offline: t('auth.layar.galat-offline', 'Tidak ada sambungan internet. Masuk butuh internet sekali saja.'),
      unavailable: t('auth.layar.galat-server', 'Server belum bisa dihubungi. Coba lagi sebentar lagi.')
    };
    if (map[e]) return map[e];
    if (/^invite|code_/.test(e)) return t('auth.layar.galat-undangan', 'Kode undangan tidak berlaku atau sudah dipakai.');
    if (/password/.test(e)) return t('auth.layar.galat-sandi', 'Kata sandi itu belum bisa dipakai. Coba kata sandi lain.');
    return (res && res.message) || t('auth.layar.galat-umum', 'Belum berhasil. Coba lagi, ya.');
  }

  /* ----------------------------------------------------------------- layar */

  /**
   * @param {Window} env
   * @param {{screen?:string, role?:string, onLocale?:Function, onDone:Function}} opts
   *        onDone({role:'murid'|'guru', via:'google'|'akun', classCode:string})
   */
  function show(env, opts) {
    var o = opts || {};
    var doc = env && env.document;
    if (!doc || !doc.body) return { shown: false };
    var existing = doc.querySelector('.fz-auth');
    if (existing) existing.parentNode.removeChild(existing);
    var ui = { screen: o.screen === 'masuk' || o.screen === 'daftar' ? o.screen : 'welcome', role: o.role === 'guru' ? 'guru' : 'murid', busy: false, error: '', forgot: false };
    var host = doc.createElement('div');
    host.className = 'fz-auth';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('data-testid', 'auth-screen');
    doc.body.appendChild(host);
    try { doc.body.classList.add('fz-auth-open'); } catch (_) {}
    var closed = false, draft = {};

    function keepDraft() {
      var f = host.querySelector('[data-auth-form]'); if (!f) return;
      /* Kata sandi ikut dijaga HANYA di memori dan hanya di layar yang sama: salah ketik kode
         KelasKu tidak boleh menghapus dua kolom sandi yang sudah diisi. Ganti layar/peran
         mengosongkannya (lupakanSandi). */
      ['code', 'handle', 'classCode', 'password', 'password2'].forEach(function (k) { var i = f.querySelector('[name="' + k + '"]'); if (i) draft[k] = i.value; });
    }
    function lupakanSandi() {
      var f = host.querySelector('[data-auth-form]');
      if (f) ['password', 'password2'].forEach(function (k) { var i = f.querySelector('[name="' + k + '"]'); if (i) i.value = ''; });
      delete draft.password; delete draft.password2;
    }
    function paint() {
      keepDraft();
      host.setAttribute('data-auth-screen', ui.screen);
      host.setAttribute('aria-label', 'FIEZEL · ' + (ui.screen === 'welcome' ? t('auth.layar.selamat-datang', 'Selamat datang') : ui.screen === 'daftar' ? t('auth.layar.daftar', 'Daftar') : t('auth.layar.masuk', 'Masuk')));
      host.innerHTML = markup(env, ui);
      var f = host.querySelector('[data-auth-form]');
      if (f) Object.keys(draft).forEach(function (k) { var i = f.querySelector('[name="' + k + '"]'); if (i && draft[k]) i.value = draft[k]; });
      mountGoogle();
    }
    function finish(detail) {
      if (closed) return;
      closed = true;
      saveSession(env, detail);
      try { host.classList.add('is-leaving'); } catch (_) {}
      try { doc.body.classList.remove('fz-auth-open'); } catch (_) {}
      (env.setTimeout || setTimeout)(function () { try { if (host.parentNode) host.parentNode.removeChild(host); } catch (_) {} }, 240);
      if (typeof o.onDone === 'function') { try { o.onDone(detail); } catch (_) {} }
    }
    function classCodeFromForm() {
      var f = host.querySelector('[data-auth-form]'), i = f && f.querySelector('[name="classCode"]');
      return normalizeClassCode(i ? i.value : '');
    }
    function mountGoogle() {
      var slot = host.querySelector('[data-auth-google]'), note = host.querySelector('[data-auth-google-note]');
      var G = env.FiezelGoogle;
      if (!slot) return;
      if (!G || typeof G.available !== 'function' || !G.available()) {
        // Tanpa Client ID tidak ada Google sama sekali: sembunyikan slot DAN garis "atau".
        slot.hidden = true;
        var garis = host.querySelector('[data-auth-or]');
        if (garis) garis.hidden = true;
        return;
      }
      var gagal = function () {
        googleGagal = true;
        slot.hidden = true;
        if (note) note.textContent = t('auth.layar.google-diblokir', 'Tombol Google tidak bisa dimuat di jaringan ini. Pakai akun FIEZEL di bawah.');
      };
      // Sekali gagal dimuat di sesi ini, jangan sisakan kotak kosong di tiap ganti tab.
      if (googleGagal) { gagal(); return; }
      try {
        G.renderButton(slot, function (res) {
          if (res && res.ok) {
            var code = classCodeFromForm();
            finish({ role: 'murid', via: 'google', classCode: code || '' });
          } else if (note) note.textContent = (res && res.message) || t('auth.layar.galat-umum', 'Belum berhasil. Coba lagi, ya.');
        }, { locale: locale(), text: ui.screen === 'daftar' ? 'signup_with' : 'signin_with', width: Math.min(360, Math.max(240, (slot.clientWidth || 320))) })
          .then(function (r) { if (r && !r.ok) gagal(); }, gagal);
      } catch (_) {}
    }

    function onSubmit(e) {
      var f = e.target && e.target.closest ? e.target.closest('[data-auth-form]') : null;
      if (!f) return;
      e.preventDefault();
      if (ui.busy) return;
      var val = function (k) { var i = f.querySelector('[name="' + k + '"]'); return i ? String(i.value || '') : ''; };
      var daftar = ui.screen === 'daftar', guru = ui.role === 'guru';
      var A = env.FiezelAccount;
      var handle = val('handle').trim(), pass = val('password');
      var err = '';
      if (!handle || !pass) err = t('auth.layar.galat-kosong', 'Isi nama pengguna dan kata sandi.');
      else if (daftar && pass !== val('password2')) err = t('auth.layar.galat-beda', 'Kedua kata sandi belum sama.');
      else if (daftar && guru && !val('code').trim()) err = t('auth.layar.galat-kode-kosong', 'Isi kode undangan dari admin FIEZEL.');
      var code = guru ? '' : classCodeFromForm();
      if (!err && code === null) err = t('auth.layar.galat-kode-kelas', 'Kode KelasKu berbentuk FZ- lalu enam huruf/angka, misalnya FZ-AB2C3D.');
      if (!err && !A) err = t('auth.layar.galat-server', 'Server belum bisa dihubungi. Coba lagi sebentar lagi.');
      if (err) { ui.error = err; paint(); return; }

      ui.busy = true; ui.error = ''; paint();
      var job;
      try {
        job = guru
          ? (daftar ? A.activateTeacher({ code: val('code').trim(), handle: handle, password: pass }) : A.login(handle, pass))
          /* register() sendiri menerbitkan identitas lebih dulu dan memeriksa bentuk nama/sandi —
             aturan servernya dicerminkan di fiezel-account.js, bukan disalin ke sini. */
          : (daftar ? A.register({ handle: handle, password: pass, confirmPassword: val('password2') }) : A.login(handle, pass));
      } catch (x) { job = Promise.reject(x); }
      Promise.resolve(job).then(function (res) {
        ui.busy = false;
        if (!res || !res.ok) { ui.error = accountError(res); paint(); return; }
        var role = (A.role && A.role()) === 'teacher' ? 'guru' : 'murid';
        if (guru && role !== 'guru') { ui.error = t('auth.layar.galat-bukan-guru', 'Akun ini akun murid. Pilih tab Murid untuk masuk.'); paint(); return; }
        finish({ role: role, via: 'akun', classCode: role === 'murid' ? (code || '') : '' });
      }, function () {
        ui.busy = false; ui.error = accountError({ error: 'unavailable' }); paint();
      });
    }
    function onClick(e) {
      var b = e.target && e.target.closest ? e.target.closest('button,a') : null;
      if (!b || !host.contains(b)) return;
      if (b.hasAttribute('data-auth-go')) { lupakanSandi(); ui.screen = b.getAttribute('data-auth-go'); ui.error = ''; ui.forgot = false; paint(); focusFirst(); return; }
      if (b.hasAttribute('data-auth-role')) { lupakanSandi(); ui.role = b.getAttribute('data-auth-role') === 'guru' ? 'guru' : 'murid'; ui.error = ''; ui.forgot = false; paint(); return; }
      if (b.hasAttribute('data-auth-forgot')) { ui.forgot = !ui.forgot; paint(); return; }
      if (b.hasAttribute('data-auth-eye')) {
        var inp = b.parentNode && b.parentNode.querySelector('input');
        if (inp) { var show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', show ? 'true' : 'false'); }
        return;
      }
      if (b.hasAttribute('data-auth-locale')) {
        var loc = b.getAttribute('data-auth-locale');
        if (typeof o.onLocale === 'function') { try { o.onLocale(loc); } catch (_) {} }
        paint();
        try {
          var i18n = I();
          if (i18n && typeof i18n.whenAvailable === 'function') {
            i18n.whenAvailable(loc, 'auth.layar.selamat-datang').then(function () {
              if (!closed && !ui.busy) paint();
            });
          }
        } catch (_) {}
      }
    }
    function focusFirst() {
      try { var i = host.querySelector('[data-auth-body] input, [data-auth-body] button'); if (i) i.focus({ preventScroll: true }); } catch (_) {}
    }
    host.addEventListener('click', onClick);
    host.addEventListener('submit', onSubmit);
    /* Naskah Thai dimuat malas (fiezel-th-loader). Begitu locale berganti, layar dicat
       ulang supaya murid Thai tidak membaca layar pertamanya dalam bahasa Indonesia. */
    try { var i18n = I(); if (i18n && i18n.onChange) i18n.onChange(function () { if (!closed && !ui.busy) paint(); }); } catch (_) {}
    paint();
    return {
      shown: true,
      screen: function () { return ui.screen; },
      close: function () { if (!closed) { closed = true; try { host.parentNode.removeChild(host); doc.body.classList.remove('fz-auth-open'); } catch (_) {} } }
    };
  }

  root.FiezelAuthScreen = Object.freeze({
    SESSION_KEY: SESSION_KEY,
    readSession: readSession,
    saveSession: saveSession,
    clearSession: clearSession,
    checkServer: checkServer,
    normalizeClassCode: normalizeClassCode,
    markup: markup,
    show: show
  });
}(typeof self !== 'undefined' ? self : this));
