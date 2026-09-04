/**
 * FIEZEL — fiezel-invite-link.js · JEMBATAN UNDANGAN (deep link teman & duel).
 *
 * Pola berkas: gems-core / fiezel-social.js — modul mandiri TANPA import, TANPA
 * menyentuh state belajar app.js, semua yang bisa gagal (storage penuh, URL rusak,
 * lingkungan tanpa `location`) gagal DIAM.
 *
 * ==========================================================================
 * MASALAH YANG DITUTUP BERKAS INI
 * ==========================================================================
 * Sampai rilis ini, satu-satunya jalan seorang murid menerima undangan teman adalah:
 *
 *   1. pengundang menekan "Bagikan" → `navigator.share({text})` mengirim KALIMAT
 *      berisi tautan `…/app/?invite=KODE`;
 *   2. temannya mengetuk tautan itu di WhatsApp → peramban dalam-aplikasi terbuka
 *      di fiezel.my.id, BUKAN PWA yang sudah terpasang di HP-nya;
 *   3. di sana ia harus menemukan sendiri Online → tab Teman → kolom "Punya kode
 *      dari teman?" — `?invite=` hanya MENGISI kolom itu, tidak menukarkan apa pun;
 *   4. tidak ada satu pun notifikasi, di kedua sisi, pada titik mana pun.
 *
 * Empat ketukan buta untuk anak SMP, dan langkah 3 hanya terjadi kalau ia kebetulan
 * membuka layar yang benar. Berkas ini memindahkan seluruh pekerjaan itu ke mesin.
 *
 * ==========================================================================
 * YANG TIDAK BISA DIPERBAIKI DARI SINI — dan kenapa bentuknya begini
 * ==========================================================================
 * TIDAK ADA cara di web untuk MEMAKSA tautan WhatsApp membuka WebAPK (PWA
 * terpasang) alih-alih peramban. WebAPK buatan Chrome mendaftarkan intent filter
 * untuk URL dalam scope-nya, tetapi verifikasi App Links menuntut
 * berkas assetlinks.json di direktori well-known akar domain, dan berkas itu harus memuat
 * sidik jari paket WebAPK — paket yang
 * dicetak per-perangkat oleh server Google dan tidak diketahui pemilik situs.
 * Karena itu rancangan di sini TIDAK BERGANTUNG pada tautan yang membuka PWA:
 *
 *   • Kode disimpan di localStorage origin yang SAMA. Di Android/Chrome, WebAPK
 *     berbagi profil penyimpanan dengan tab peramban, jadi kode yang mendarat di
 *     tab akan DITEMUKAN oleh PWA saat murid membukanya sendiri.
 *   • `share_target` di manifest memberi jalan yang benar-benar bekerja: murid
 *     menekan-lama pesan WhatsApp → Bagikan → FIEZEL, dan pesan MENTAH masuk ke
 *     aplikasi. Karena itu `extract()` di bawah harus bisa membaca kode dari
 *     KALIMAT UTUH, bukan cuma dari URL yang rapi.
 *   • Kode juga tetap bisa diketik/ditempel. Jalur manual tidak pernah hilang.
 *
 * Satu-satunya yang boleh diklaim rilis ini: sesudah kodenya SAMPAI ke aplikasi —
 * lewat tautan, share sheet, tempel, atau ketik — murid tidak perlu tahu apa-apa
 * lagi. Itu yang dijamin `pending()` + lembar undangan di app.js.
 *
 * PRIVASI: berkas ini tidak mengirim apa pun ke mana pun. Ia hanya membaca URL,
 * menulis satu kunci localStorage, dan mengembalikan kode 8 karakter.
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ konstanta beku */

  // Cermin INVITE_RULES.ALPHABET di workers/api/social-config.js. Sengaja TANPA
  // 0/1/I/L/O/U: itulah yang membuat pemindaian kalimat bebas di bawah aman —
  // kata Indonesia biasa hampir tidak pernah menjadi 8 karakter dari alfabet ini.
  var MINT_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  var MINT_RE = /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{8}$/;
  // Cermin gerbang server `/^[A-Z0-9]{8}$/` (routeFriendsRedeem). Dipakai untuk kode
  // yang DIKETIK murid: server tetap yang memutuskan, klien tidak boleh lebih galak.
  var SERVER_RE = /^[A-Z0-9]{8}$/;

  var PENDING_KEY = 'fiezel-social-pending-invite-v1';
  var HANDLED_KEY = 'fiezel-social-invite-handled-v1';
  // Sama dengan INVITE_RULES.TTL_DAYS server (7 hari). Kode yang lebih tua dari ini
  // sudah pasti ditolak server, jadi menahannya hanya melahirkan lembar yang gagal.
  var PENDING_TTL_MS = 7 * 86400000;
  var HANDLED_MAX = 24;         // riwayat kode yang sudah dijawab; cukup untuk satu semester
  var KIND_FRIEND = 'friend';
  var KIND_DUEL = 'duel';

  /* ------------------------------------------------------------------ util dasar */

  function storage() {
    try { return root.localStorage || null; } catch (_) { return null; }
  }
  function readJson(key, fallback) {
    try {
      var s = storage(); if (!s) return fallback;
      var raw = s.getItem(key); if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (_) { return fallback; }
  }
  function writeJson(key, value) {
    try {
      var s = storage(); if (!s) return false;
      s.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) { return false; }   // storage penuh = undangan sesi ini saja; belajar utuh
  }
  function now(nowMs) {
    var t = Number(nowMs);
    return isFinite(t) && t > 0 ? t : Date.now();
  }

  /* ------------------------------------------------------------------ normalisasi kode */

  /**
   * Rapikan apa pun yang diketik/ditempel murid menjadi kandidat kode.
   * Spasi, tanda hubung, dan tanda baca dibuang; huruf dinaikkan.
   * TIDAK memvalidasi — itu tugas `isServerShaped`/`isMintShaped`.
   */
  function normalizeCode(raw) {
    return String(raw == null ? '' : raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  /** Bentuk yang server terima (kode yang diketik murid lewat jalur ini). */
  function isServerShaped(code) { return SERVER_RE.test(String(code || '')); }
  /** Bentuk yang MUNGKIN dicetak server — dipakai saat memindai kalimat bebas. */
  function isMintShaped(code) { return MINT_RE.test(String(code || '')); }

  /* ------------------------------------------------------------------ ekstraksi */

  function paramFrom(text, name) {
    // Menangkap `?invite=X`, `&invite=X`, dan `#invite=X` di mana pun dalam teks —
    // termasuk di tengah kalimat WhatsApp, di mana tidak ada URL yang bisa di-parse.
    var re = new RegExp('[?&#]' + name + '=([A-Za-z0-9_-]{1,64})');
    var hit = re.exec(String(text || ''));
    return hit ? hit[1] : '';
  }

  /**
   * Temukan undangan di dalam TEKS APA PUN: URL rapi, pesan WhatsApp utuh, isi
   * share sheet, atau kode telanjang yang ditempel murid.
   *
   * Urutan sengaja: parameter eksplisit menang atas pemindaian kalimat, dan duel
   * diperiksa lebih dulu karena kodenya panjang (base64) sehingga tidak pernah
   * tertukar dengan kode teman 8 karakter.
   *
   * @returns {{kind:string, code:string, source:string}|null}
   */
  function extract(text) {
    var s = String(text == null ? '' : text);
    if (!s) return null;

    var duel = paramFrom(s, 'duel');
    if (duel && duel.length >= 8) return { kind: KIND_DUEL, code: duel, source: 'param' };

    var invite = normalizeCode(paramFrom(s, 'invite'));
    if (isServerShaped(invite)) return { kind: KIND_FRIEND, code: invite, source: 'param' };

    // Pemindaian kalimat bebas: token berdiri sendiri, 8 karakter, SELURUHNYA dari
    // alfabet cetak. Batas token (\b tidak cukup untuk campuran angka) dijaga manual
    // supaya "BELAJAR12345" tidak melahirkan kode palsu dari potongan tengahnya.
    var tokens = s.toUpperCase().split(/[^A-Z0-9]+/);
    for (var i = 0; i < tokens.length; i += 1) {
      if (isMintShaped(tokens[i])) return { kind: KIND_FRIEND, code: tokens[i], source: 'scan' };
    }
    return null;
  }

  /**
   * Undangan yang dibawa alamat halaman saat ini (search + hash + payload
   * share_target). `href` boleh diisi untuk pengujian.
   */
  function fromLocation(href) {
    var url = href;
    if (url == null) { try { url = root.location ? root.location.href : ''; } catch (_) { url = ''; } }
    var s = String(url || '');
    if (!s) return null;

    var direct = extract(s);
    if (direct) return direct;

    // share_target GET menaruh pesan mentah di ?text= / ?url= / ?title=. Kalimat itu
    // yang dikirim WhatsApp, jadi di sinilah pemindaian kalimat bebas benar-benar dipakai.
    try {
      var q = s.indexOf('?');
      if (q < 0) return null;
      var params = new root.URLSearchParams(s.slice(q + 1).split('#')[0]);
      var fields = ['text', 'url', 'title'];
      for (var i = 0; i < fields.length; i += 1) {
        var value = params.get(fields[i]);
        if (!value) continue;
        var hit = extract(value);
        if (hit) return { kind: hit.kind, code: hit.code, source: 'share-target' };
      }
    } catch (_) { /* lingkungan tanpa URLSearchParams = jalur param saja */ }
    return null;
  }

  /* ------------------------------------------------------------------ antrean undangan */

  /**
   * Simpan undangan yang belum dijawab. Ia HARUS bertahan melewati:
   *   • lompatan tab peramban → PWA terpasang (origin sama, localStorage sama);
   *   • penutupan aplikasi sebelum murid sempat menjawab;
   *   • boot ulang setelah pembaruan service worker.
   * Undangan yang sudah pernah dijawab TIDAK pernah diantrekan lagi.
   */
  function setPending(invite, nowMs) {
    if (!invite || !invite.code) return null;
    if (isHandled(invite.code)) return null;
    var entry = {
      kind: invite.kind === KIND_DUEL ? KIND_DUEL : KIND_FRIEND,
      code: String(invite.code),
      source: String(invite.source || 'unknown'),
      at: now(nowMs)
    };
    return writeJson(PENDING_KEY, entry) ? entry : null;
  }
  /** Undangan tertunda yang MASIH berlaku, atau null. Yang hangus dibuang di sini. */
  function pending(nowMs) {
    var entry = readJson(PENDING_KEY, null);
    if (!entry || !entry.code) return null;
    if (now(nowMs) - Number(entry.at || 0) > PENDING_TTL_MS) { clearPending(); return null; }
    if (isHandled(entry.code)) { clearPending(); return null; }
    return entry;
  }
  function clearPending() {
    try { var s = storage(); if (s) s.removeItem(PENDING_KEY); return true; } catch (_) { return false; }
  }

  /**
   * Tandai kode SUDAH dijawab (ditukar, ditolak, atau gagal permanen). Ini yang
   * mencegah lembar undangan muncul lagi setiap boot untuk kode yang sama —
   * penyakit klasik deep link yang disimpan.
   */
  function markHandled(code, nowMs) {
    var clean = normalizeCode(code) || String(code || '');
    if (!clean) return false;
    var list = readJson(HANDLED_KEY, []);
    if (!Array.isArray(list)) list = [];
    list = list.filter(function (x) { return x && x.code !== clean; });
    list.push({ code: clean, at: now(nowMs) });
    if (list.length > HANDLED_MAX) list = list.slice(list.length - HANDLED_MAX);
    var entry = pending();
    if (entry && normalizeCode(entry.code) === clean) clearPending();
    else if (entry && entry.code === clean) clearPending();
    return writeJson(HANDLED_KEY, list);
  }
  function isHandled(code) {
    var clean = normalizeCode(code) || String(code || '');
    if (!clean) return false;
    var list = readJson(HANDLED_KEY, []);
    if (!Array.isArray(list)) return false;
    for (var i = 0; i < list.length; i += 1) if (list[i] && list[i].code === clean) return true;
    return false;
  }

  /* ------------------------------------------------------------------ sisi pengundang */

  /**
   * Alamat undangan. Dibangun dari lokasi app yang SEDANG BERJALAN, bukan hardcode,
   * supaya benar di fiezel.my.id/app/, mirror Pages, maupun preview.
   */
  function inviteUrl(code, href) {
    var base = '';
    try {
      var loc = href == null ? (root.location ? root.location.origin + root.location.pathname : '') : String(href);
      base = String(loc).split('?')[0].split('#')[0];
    } catch (_) { base = ''; }
    if (!base) base = './';
    return base + '?invite=' + encodeURIComponent(String(code || ''));
  }

  /**
   * Muatan share sheet. `navigator.share` diberi `url` TERPISAH — bukan hanya
   * kalimat berisi URL — karena WhatsApp/Telegram hanya membuat pratinjau yang bisa
   * diketuk untuk field `url`. Kodenya TETAP ikut di teks: kalau tautannya mati di
   * peramban dalam-aplikasi, kode telanjang itulah yang masih bisa ditempel murid,
   * dan `extract()` di sisi penerima memang dibuat untuk menemukannya di kalimat.
   */
  function sharePayload(code, opts) {
    var options = opts || {};
    var url = options.url || inviteUrl(code, options.href);
    var body = options.text != null
      ? String(options.text)
      : 'Ayo belajar bahasa Inggris bareng di FIEZEL. Buka tautan ini, undangannya terpasang sendiri.';
    return {
      title: String(options.title || 'FIEZEL'),
      text: body + '\n\nKode cadangan (kalau tautannya tidak jalan): ' + String(code || ''),
      url: url,
      code: String(code || '')
    };
  }

  /* ------------------------------------------------------------------ pembersih alamat */

  /**
   * Buang jejak undangan dari address bar setelah dibaca, supaya MUAT ULANG tidak
   * memunculkan lembar yang sama untuk kedua kalinya.
   *
   * `duel` SENGAJA TIDAK DIBUANG: alur Duel Belajar (app.js `home()` +
   * fiezel-learner-flow.js) membaca `?duel=` dari `location` setiap kali ia
   * menggambar. Membuangnya di sini akan mematikan kartu "Terima Duel Belajar"
   * sebelum murid sempat mengetuknya.
   */
  function cleanUrl(replaceState) {
    try {
      var loc = root.location; if (!loc) return false;
      var history = root.history;
      var replace = replaceState || (history && history.replaceState && history.replaceState.bind(history));
      if (typeof replace !== 'function') return false;
      var url = new root.URL(loc.href);
      var touched = false;
      ['invite', 'text', 'title', 'share-target'].forEach(function (name) {
        if (url.searchParams.has(name)) { url.searchParams.delete(name); touched = true; }
      });
      // ?url= hanya dibuang kalau ia memang muatan share sheet — bukan parameter lain
      // yang kebetulan bernama sama.
      if (url.searchParams.has('url') && url.searchParams.has('share-target') === false && /invite=/.test(String(url.searchParams.get('url') || ''))) {
        url.searchParams.delete('url'); touched = true;
      }
      if (/[?&#]invite=/.test(url.hash)) { url.hash = ''; touched = true; }
      if (!touched) return false;
      replace(null, '', url.pathname + (url.search || '') + (url.hash || ''));
      return true;
    } catch (_) { return false; }
  }

  /**
   * Satu panggilan untuk seluruh sisi masuk: baca alamat, antrekan kalau ada,
   * bersihkan alamat, kembalikan undangan tertunda (baru ATAU sisa boot sebelumnya).
   */
  function capture(opts) {
    var options = opts || {};
    var found = fromLocation(options.href);
    if (found && found.kind === KIND_FRIEND) {
      setPending(found, options.now);
      if (options.clean !== false) cleanUrl(options.replaceState);
    } else if (found && found.kind === KIND_DUEL && options.clean !== false) {
      // Duel dari share sheet: kodenya ada di ?text=, bukan di ?duel= yang dibaca
      // alur Duel. Alamat ditulis ulang ke bentuk yang alur itu mengerti.
      promoteDuelUrl(found.code, options.replaceState);
    }
    return pending(options.now);
  }

  function promoteDuelUrl(code, replaceState) {
    try {
      var loc = root.location; if (!loc) return false;
      var history = root.history;
      var replace = replaceState || (history && history.replaceState && history.replaceState.bind(history));
      if (typeof replace !== 'function') return false;
      var url = new root.URL(loc.href);
      if (url.searchParams.get('duel') === code) return false;
      ['text', 'title', 'url', 'share-target'].forEach(function (n) { url.searchParams.delete(n); });
      url.searchParams.set('duel', String(code || ''));
      replace(null, '', url.pathname + (url.search || '') + (url.hash || ''));
      return true;
    } catch (_) { return false; }
  }

  /* ------------------------------------------------------------------ ekspor */

  root.FiezelInviteLink = Object.freeze({
    KIND_FRIEND: KIND_FRIEND,
    KIND_DUEL: KIND_DUEL,
    MINT_ALPHABET: MINT_ALPHABET,
    PENDING_TTL_MS: PENDING_TTL_MS,
    normalizeCode: normalizeCode,
    isServerShaped: isServerShaped,
    isMintShaped: isMintShaped,
    extract: extract,
    fromLocation: fromLocation,
    capture: capture,
    pending: pending,
    setPending: setPending,
    clearPending: clearPending,
    markHandled: markHandled,
    isHandled: isHandled,
    inviteUrl: inviteUrl,
    sharePayload: sharePayload,
    cleanUrl: cleanUrl,
    _pendingKey: PENDING_KEY,
    _handledKey: HANDLED_KEY
  });
})(typeof self !== 'undefined' ? self : this);
