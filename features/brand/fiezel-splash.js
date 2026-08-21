/**
 * FIEZEL — splash pembuka (Step 0 pada FIEZEL_Complete_Design_Specification).
 *
 * Isinya persis yang diminta spesifikasi: wordmark dengan bintang berkelip, maskot melambai,
 * gelembung ucapan, dan satu tombol ajakan. Tayang 2,5 detik lalu menutup sendiri, atau
 * langsung ditutup begitu disentuh.
 *
 * Tiga batas yang dijaga di sini, dan semuanya punya alasan yang sudah dibayar mahal di
 * produk ini:
 *
 * 1. TIDAK PERNAH MENGHALANGI GERBANG NOTIFIKASI. Notifikasi wajib di FIEZEL, dan gerbangnya
 *    adalah syarat masuk. Splash menutup dirinya sendiri lewat pewaktu DAN lewat sentuhan,
 *    jadi tidak ada keadaan di mana ia tertinggal menutupi layar.
 * 2. SEKALI PER HARI. Splash yang muncul setiap kali membuka aplikasi berubah dari sambutan
 *    menjadi penghalang.
 * 3. MENGHORMATI KURANGI-GERAK. Kalau perangkat meminta kurangi gerak, animasinya tidak
 *    dijalankan - maskotnya tetap tampil, hanya diam.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelSplash = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_KEY = 'fiezel-splash-seen-v1';
  var VISIBLE_MS = 2500;
  var COPY = Object.freeze({
    word: 'FIEZEL',
    tagline: 'Your smart learning companion',
    bubble: 'Hai! Aku temanmu belajar di FIEZEL. Yuk, siap-siap!',
    cta: 'Mulai kenalan'
  });

  function dayKey(now) {
    // Hari WIB, sama seperti modul perjalanan belajar, supaya "sekali sehari" berarti hal yang
    // sama di seluruh aplikasi.
    return new Date(Number(now) + 7 * 3600000).toISOString().slice(0, 10);
  }

  function seenToday(env, now) {
    try {
      var store = env && env.localStorage;
      if (!store || typeof store.getItem !== 'function') return false;
      return String(store.getItem(STORAGE_KEY) || '') === dayKey(now);
    } catch (_) { return false; }
  }

  function markSeen(env, now) {
    try {
      var store = env && env.localStorage;
      if (store && typeof store.setItem === 'function') store.setItem(STORAGE_KEY, dayKey(now));
    } catch (_) { /* penyimpanan penuh tidak boleh menggagalkan pembukaan aplikasi */ }
  }

  function prefersReducedMotion(env) {
    try {
      return !!(env && env.matchMedia && env.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) { return false; }
  }

  function markup(env, options) {
    var mascot = env && env.FiezelMascot;
    // Logo dan maskot keduanya karya asli dari handoff; teks wordmark hanya dipakai bila
    // gambarnya belum tersedia, supaya splash tidak pernah kosong.
    // Tanda F saja, tanpa huruf: wordmark-nya sudah ditulis sebagai teks di bawah ini, jadi
    // memakai gambar berhuruf hanya menggandakan kata yang sama dan mengunci ukurannya.
    var logo = mascot && typeof mascot.markup === 'function'
      ? mascot.markup({ pose: 'mark', width: 76, decorative: true }) : '';
    var figure = mascot && typeof mascot.markup === 'function'
      ? mascot.markup({ pose: 'hero', width: (options && options.width) || 210, decorative: true })
      : '';
    return logo
      + '<p class="fiezel-splash-word">' + COPY.word + '</p>'
      + '<p class="fiezel-splash-tag">' + COPY.tagline + '</p>'
      + figure
      + '<div class="fiezel-splash-bubble">' + COPY.bubble + '</div>'
      + '<button type="button" class="fiezel-splash-cta" data-splash-cta>' + COPY.cta + '</button>';
  }

  /**
   * Menampilkan splash. Mengembalikan objek dengan `shown` supaya pemanggil - dan gate - bisa
   * tahu apakah ia benar-benar tampil, bukan menebak dari efek samping.
   */
  function show(env, options) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var opts = options || {};
    var now = Number(opts.now) || Date.now();
    var doc = target.document;
    if (!doc || typeof doc.createElement !== 'function') return { shown: false, reason: 'no_document' };
    if (!target.FiezelMascot) return { shown: false, reason: 'mascot_unavailable' };
    if (opts.force !== true && seenToday(target, now)) return { shown: false, reason: 'seen_today' };

    var host = doc.createElement('div');
    host.className = 'fiezel-splash';
    if (prefersReducedMotion(target)) host.className += ' fiezel-splash-still';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-label', 'Selamat datang di FIEZEL');
    host.innerHTML = markup(target, opts);

    var closed = false;
    var timer = null;
    function close() {
      if (closed) return;
      closed = true;
      if (timer && target.clearTimeout) target.clearTimeout(timer);
      markSeen(target, now);
      // Pemanggil perlu tahu KAPAN sapaan selesai, bukan menebaknya dengan pewaktu kedua:
      // splash bisa ditutup lebih awal oleh sentuhan, dan tebakan akan meleset setiap kali
      // itu terjadi. Dipanggil sebelum animasi keluar supaya langkah berikutnya menyambung.
      if (typeof opts.onClose === 'function') { try { opts.onClose({ via: 'close' }); } catch (_) {} }
      try { host.classList.add('is-leaving'); } catch (_) {}
      // Dilepas setelah animasi keluar; kalau timer tidak tersedia, dilepas seketika, karena
      // splash yang tertinggal di layar jauh lebih buruk daripada transisi yang terpotong.
      if (typeof target.setTimeout === 'function') target.setTimeout(remove, 320);
      else remove();
    }
    function remove() {
      try { if (host.parentNode) host.parentNode.removeChild(host); } catch (_) {}
    }

    try {
      host.addEventListener('click', close);
      var cta = host.querySelector ? host.querySelector('[data-splash-cta]') : null;
      if (cta) cta.addEventListener('click', close);
    } catch (_) { /* tanpa listener, pewaktu di bawah tetap menutupnya */ }

    try { doc.body.appendChild(host); } catch (_) { return { shown: false, reason: 'append_failed' }; }

    if (typeof target.setTimeout === 'function') {
      timer = target.setTimeout(close, Number(opts.visibleMs) > 0 ? Number(opts.visibleMs) : VISIBLE_MS);
    }
    return { shown: true, close: close, element: host };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    VISIBLE_MS: VISIBLE_MS,
    COPY: COPY,
    dayKey: dayKey,
    seenToday: seenToday,
    show: show
  };
});
