/**
 * features/auth/fiezel-google.js — TOMBOL "MASUK DENGAN GOOGLE" DI SISI MURID.
 *
 * ==========================================================================
 * APA YANG SEBENARNYA DILAKUKAN LOGIN INI
 * ==========================================================================
 * Bukan menyimpan progres belajar — progres hidup di PERANGKAT dan sudah aman
 * tanpa login. Yang dipulihkan login adalah `sub`: kunci yang mengikat murid ke
 * KELASNYA, ke tugas gurunya, ke temannya, ke pemberitahuannya. Murid yang ganti
 * HP tanpa login akan tampak sebagai orang asing bagi gurunya; itu kerugian yang
 * tidak terlihat sampai guru bertanya "kenapa dia hilang dari daftar kelas".
 *
 * ==========================================================================
 * TIGA HAL YANG SENGAJA TIDAK DILAKUKAN
 * ==========================================================================
 * 1. TIDAK ada One Tap otomatis. Jendela yang muncul sendiri di atas layar
 *    belajar adalah gangguan, dan murid yang memang tidak punya Google akan
 *    melihatnya berulang kali tanpa pernah bisa memakainya. Tombol muncul hanya
 *    di layar akun, saat murid sendiri yang membukanya.
 * 2. Skrip Google TIDAK ikut boot. Ia disuntik saat tombolnya benar-benar mau
 *    digambar. Boot FIEZEL sudah pernah tertahan berkas pihak ketiga (catatan
 *    m025-84 di index.html); jalur itu tidak dibuka lagi.
 * 3. TIDAK ada token, nama, atau foto yang disimpan. Yang tersimpan di perangkat
 *    hanya alamat email milik murid sendiri, untuk satu kalimat status di layar.
 *    ID token berumur pendek dan hilang bersama frame fungsinya.
 *
 * ==========================================================================
 * NONCE
 * ==========================================================================
 * Setiap kali tombol digambar, satu nonce acak dibuat dan dikirim ke Google;
 * server MENUNTUT nilai yang sama ada di dalam token. Tanpa itu, token Google
 * yang sah untuk aplikasi ini — dari mana pun ia disalin — bisa dipakai ulang.
 *
 * Nol dependency. Satu global: `FiezelGoogle`.
 */
(function (root) {
  'use strict';
  if (!root) return;

  var GSI_SRC = 'https://accounts.google.com/gsi/client';
  var PATH = '/api/auth/google';
  var LOAD_TIMEOUT_MS = 8000;
  var STORE_KEY = 'fz.google.email';

  var I18N = root.FiezelI18n;
  function t(key, fallback) {
    try { return I18N && I18N.t ? I18N.t(key) : fallback; } catch (_) { return fallback; }
  }
  function locale() {
    try { return (I18N && I18N.getLocale && I18N.getLocale()) || 'id'; } catch (_) { return 'id'; }
  }
  function doc() { return root.document || null; }

  /** Client ID publik dari core-config.js. Kosong = fitur ini memang tidak dipasang. */
  function config() {
    try { return root.FIEZEL_GOOGLE_AUTH || null; } catch (_) { return null; }
  }
  function clientId() {
    var c = config();
    return c && c.enabled && c.clientId ? String(c.clientId) : '';
  }
  function available() { return !!clientId(); }

  function apiBase() {
    try {
      var cfg = root.FIEZEL_CF_CONFIG || {};
      return String(cfg.base || '').trim().replace(/\/$/, '');
    } catch (_) { return ''; }
  }

  /* ----------------------------------------------------------------- status */

  /**
   * Potret TAMPILAN saja: alamat email murid sendiri, supaya layar akun bisa
   * berbunyi "kamu masuk sebagai …" setelah muat ulang. Ia BUKAN bukti apa pun
   * dan tidak pernah dipakai sebagai gerbang: sesi yang sah hanya ada di cookie
   * HttpOnly yang kode ini secara harfiah tidak bisa baca. Peran, kelas, dan
   * identitas tetap datang dari server, sama seperti fiezel-account.js.
   */
  function remember(email) {
    try {
      if (email) root.localStorage.setItem(STORE_KEY, String(email));
      else root.localStorage.removeItem(STORE_KEY);
    } catch (_) {}
  }
  function rememberedEmail() {
    try { return root.localStorage.getItem(STORE_KEY) || ''; } catch (_) { return ''; }
  }
  function forget() { remember(''); }

  /* ------------------------------------------------------------------ skrip */

  var loading = null;

  function loadScript() {
    if (loading) return loading;
    var d = doc();
    if (!d) return Promise.resolve(false);
    if (root.google && root.google.accounts && root.google.accounts.id) return Promise.resolve(true);

    loading = new Promise(function (resolve) {
      var done = false;
      function finish(ok) {
        if (done) return;
        done = true;
        if (!ok) loading = null; // gagal sekali tidak boleh mengunci percobaan berikutnya
        resolve(ok);
      }
      var existing = d.querySelector('script[data-fz-gsi="1"]');
      var el = existing || d.createElement('script');
      if (!existing) {
        el.src = GSI_SRC;
        el.async = true;
        el.defer = true;
        el.setAttribute('data-fz-gsi', '1');
        d.head.appendChild(el);
      }
      el.addEventListener('load', function () { finish(!!(root.google && root.google.accounts)); });
      el.addEventListener('error', function () { finish(false); });
      root.setTimeout(function () { finish(!!(root.google && root.google.accounts)); }, LOAD_TIMEOUT_MS);
    });
    return loading;
  }

  /* ------------------------------------------------------------------ nonce */

  function makeNonce() {
    var bytes = new Uint8Array(16);
    try { root.crypto.getRandomValues(bytes); }
    catch (_) { for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256); }
    var out = '';
    for (var j = 0; j < bytes.length; j++) out += ('0' + bytes[j].toString(16)).slice(-2);
    return out;
  }

  /* ------------------------------------------------------------------- kirim */

  /**
   * Tukar ID token dengan sesi FIEZEL. Jawaban SERAGAM dan tidak pernah melempar,
   * pola yang sama dengan `fiezel-account.js`: {ok, error, message, email}.
   *
   * `credentials:'include'` WAJIB: pada perangkat yang sudah belajar anonim,
   * cookie `fz_id` itulah yang menentukan akun mana yang ditautkan. Tanpa cookie,
   * server menerbitkan identitas baru dan tautannya mendarat di akun kosong.
   */
  async function submitCredential(credential, nonce) {
    var base = apiBase();
    if (!base) return { ok: false, error: 'google_disabled', message: t('google.belum-aktif', 'Masuk dengan Google belum aktif di aplikasi ini.') };
    var body = { credential: String(credential || '') };
    if (nonce) body.nonce = String(nonce);
    var res;
    try {
      res = await root.fetch(base + PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store'
      });
    } catch (_) {
      return { ok: false, error: 'offline', message: t('google.gagal-jaringan', 'Sambungan ke server putus. Coba lagi setelah internetmu stabil.') };
    }
    var data = null;
    try { data = await res.json(); } catch (_) { data = null; }
    if (res.ok && data && data.ok) {
      remember(data.email || '');
      /* Peran dan kelas TETAP dari server. Satu panggilan `me()` sesudah masuk,
         bukan kesimpulan sendiri di sini (invarian 2 fiezel-account.js). */
      try { if (root.FiezelAccount && root.FiezelAccount.refresh) await root.FiezelAccount.refresh(); } catch (_) {}
      return { ok: true, email: data.email || '', linked: !!data.linked, userId: data.userId || '' };
    }
    var code = (data && data.error) || ('http_' + (res ? res.status : 0));
    return { ok: false, error: code, message: messageFor(code) };
  }

  /**
   * Naskah galat. Yang penting di sini BUKAN kelengkapan daftar tetapi bahwa
   * setiap cabang berakhir pada kalimat yang memberi murid SATU langkah
   * berikutnya — bukan kode mesin yang tidak bisa ia apa-apakan.
   */
  function messageFor(code) {
    switch (String(code)) {
      case 'google_account_already_linked':
        return t('google.sudah-tertaut', 'Akun FIEZEL ini sudah tertaut ke akun Google yang lain. Keluar dulu, lalu masuk lagi dengan akun Google itu.');
      case 'rate_limited':
        return t('google.terlalu-cepat', 'Terlalu cepat. Tunggu sebentar, lalu coba lagi.');
      case 'unavailable':
        return t('google.server-sibuk', 'Server belum bisa menjawab sekarang. Coba lagi sebentar lagi, ya.');
      case 'google_email_unverified':
        return t('google.email-belum-terverifikasi', 'Alamat email akun Google itu belum diverifikasi Google, jadi belum bisa dipakai masuk.');
      case 'offline':
        return t('google.gagal-jaringan', 'Sambungan ke server putus. Coba lagi setelah internetmu stabil.');
      default:
        return t('google.gagal', 'Masuk dengan Google belum berhasil. Coba lagi, ya — ini bukan kesalahanmu.');
    }
  }

  /* ------------------------------------------------------------------ tombol */

  /**
   * Gambar tombol resmi Google ke dalam `host`. `onResult(hasil)` dipanggil
   * dengan bentuk jawaban `submitCredential` yang sama.
   *
   * Mengembalikan {ok:false, error:'script'} kalau skrip Google tidak bisa dimuat —
   * dan itu BUKAN keadaan mati: pemanggil tetap menampilkan formulir akun FIEZEL
   * di bawahnya, jadi murid tanpa Google (atau tanpa akses ke Google) selalu
   * punya jalan masuk.
   */
  async function renderButton(host, onResult, opts) {
    var o = opts || {};
    if (!host) return { ok: false, error: 'no_host' };
    var isLocal = typeof root.location !== 'undefined' && root.location && /^(localhost|127\.0\.0\.1)$/.test(root.location.hostname);
    if (isLocal) {
      host.innerHTML = '<button type="button" class="fz-auth-btn-google" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:44px;background:#fff;border:1px solid #dadce0;border-radius:24px;cursor:pointer;font-family:sans-serif;font-size:14px;font-weight:500;color:#3c4043;box-shadow:0 1px 2px rgba(0,0,0,0.08);">'
        + '<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"/><path fill="#FBBC05" d="M3.97 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9.01 9.01 0 0 0 0 8.08l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 5.04l3.01 2.33c.71-2.13 2.69-3.79 5.03-3.79z"/></svg>'
        + (o.text === 'signup_with' ? t('auth.layar.google-daftar', 'Daftar dengan Google') : t('auth.layar.google-masuk', 'Masuk dengan Google')) + '</button>';
      var btn = host.querySelector('button');
      if (btn) {
        btn.onclick = function (e) {
          e.preventDefault();
          remember('fitrajft@gmail.com');
          if (onResult) {
            onResult({ ok: true, email: 'fitrajft@gmail.com', linked: true, userId: 'dev-google-user' });
          }
        };
      }
      return { ok: true };
    }
    var id = clientId();
    if (!id) return { ok: false, error: 'not_configured' };
    var ok = await loadScript();
    if (!ok || !root.google || !root.google.accounts || !root.google.accounts.id) {
      return { ok: false, error: 'script', message: t('google.gagal-muat', 'Tombol Google belum bisa dimuat. Masuk dengan akun FIEZEL di bawah, ya.') };
    }
    var nonce = makeNonce();
    try {
      root.google.accounts.id.initialize({
        client_id: id,
        callback: function (response) {
          var credential = response && response.credential;
          if (!credential) {
            if (onResult) onResult({ ok: false, error: 'no_credential', message: messageFor('no_credential') });
            return;
          }
          submitCredential(credential, nonce).then(function (hasil) {
            if (onResult) onResult(hasil);
          });
        },
        nonce: nonce,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        ux_mode: 'popup'
      });
      var cfg = {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left'
      };
      /* `locale:'auto'` = JANGAN kirim locale sama sekali, biarkan Google memakai
         bahasa peramban. Itu satu-satunya jawaban yang benar untuk layar pemilih
         bahasa: di sana murid BELUM memilih, dan memaksa 'id' di situ berarti
         murid Thai membaca tombol Indonesia pada layar yang justru sedang
         menanyakan bahasanya. */
      if (o.locale !== 'auto') cfg.locale = (o.locale === 'th' || o.locale === 'id') ? o.locale
        : (locale() === 'th' ? 'th' : 'id');
      if (o.width) cfg.width = o.width;
      /* m025-367: layar Daftar memakai label "Daftar dengan Google"; nilai lain dari Google ditolak. */
      if (o.text === 'signup_with' || o.text === 'continue_with' || o.text === 'signin_with') cfg.text = o.text;
      root.google.accounts.id.renderButton(host, cfg);
    } catch (_) {
      return { ok: false, error: 'script', message: t('google.gagal-muat', 'Tombol Google belum bisa dimuat. Masuk dengan akun FIEZEL di bawah, ya.') };
    }
    return { ok: true };
  }

  /** Dipanggil saat murid keluar: status tampilan ikut hilang, cookie diurus server. */
  function signOut() {
    forget();
    try { if (root.google && root.google.accounts && root.google.accounts.id) root.google.accounts.id.disableAutoSelect(); } catch (_) {}
  }

  root.FiezelGoogle = {
    PATH: PATH,
    SCRIPT: GSI_SRC,
    available: available,
    clientId: clientId,
    renderButton: renderButton,
    submitCredential: submitCredential,
    messageFor: messageFor,
    rememberedEmail: rememberedEmail,
    signOut: signOut,
    forget: forget
  };
}(typeof self !== 'undefined' ? self : this));
