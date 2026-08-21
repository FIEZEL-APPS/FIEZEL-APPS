/**
 * FIEZEL — splash pembuka (Step 0 pada FIEZEL_Complete_Design_Specification.pdf).
 *
 * m025-78: direstyle penuh layar mengikuti spesifikasi lengkap (bagian 2 dan 14) - token
 * warna/tipografi persis, Percik ditampilkan besar, bintang F berkelip (bagian 14: "Star
 * Twinkle"). Isinya sendiri tidak berubah dari spesifikasi: wordmark, maskot melambai,
 * gelembung ucapan, satu tombol ajakan. Tayang 2,5 detik lalu menutup sendiri, atau
 * langsung ditutup begitu disentuh.
 *
 * Tiga batas yang dijaga di sini, dan semuanya punya alasan yang sudah dibayar mahal di
 * produk ini:
 *
 * 1. TIDAK PERNAH MENGHALANGI GERBANG NOTIFIKASI. Notifikasi wajib di FIEZEL, dan gerbangnya
 *    adalah syarat masuk - splash baru dipanggil SETELAH gerbang itu lolos. Splash menutup
 *    dirinya sendiri lewat pewaktu DAN lewat sentuhan, jadi tidak ada keadaan di mana ia
 *    tertinggal menutupi layar.
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
  var VISIBLE_MS = 2600;
  var COPY = Object.freeze({
    word: 'FIEZEL',
    tagline: 'ADAPTIVE ENGLISH'
  });

  // m025-80 OWNER: "undo pemakaian maskot saat splash, animasikan aja logo yang aku pilih".
  // Logo digambar sebagai SVG sebaris - bukan <img> - supaya setiap bagiannya bisa
  // dianimasikan sendiri: huruf F masuk lebih dulu, dua batang emas menyusul seperti
  // gelombang suara yang bereaksi pada nada pembuka.
  function logoMarkup() {
    return '<svg class="fiezel-logo" viewBox="0 0 512 512" role="img" aria-label="FIEZEL">'
      + '<defs>'
      + '<linearGradient id="fzsIvory" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#FFFBF3"/><stop offset="100%" stop-color="#EBDBC0"/></linearGradient>'
      + '<linearGradient id="fzsGold" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#F7E3AE"/><stop offset="45%" stop-color="#DDB55F"/>'
      + '<stop offset="100%" stop-color="#B0812A"/></linearGradient>'
      + '</defs>'
      + '<g fill="url(#fzsIvory)">'
      + '<rect class="fz-f fz-f1" x="136" y="148" width="42"  height="216" rx="20"/>'
      + '<rect class="fz-f fz-f2" x="136" y="148" width="128" height="42"  rx="20"/>'
      + '<rect class="fz-f fz-f3" x="136" y="230" width="102" height="40"  rx="19"/>'
      + '</g>'
      + '<g fill="url(#fzsGold)">'
      + '<rect class="fz-bar fz-bar1" x="298" y="200" width="34" height="112" rx="17"/>'
      + '<rect class="fz-bar fz-bar2" x="348" y="166" width="34" height="180" rx="17"/>'
      + '</g>'
      + '</svg>';
  }

  // Nada pembuka merek.
  //
  // m025-81 OWNER: "nadanya kurang dapat dan tidak membuat user akan mengingat". Versi
  // sebelumnya - dua nada sinus F4->C5 - digantikan motif merek F4 -> A4 -> D5 dengan
  // timbre bilah dipukul. Sintesisnya TIDAK lagi tinggal di berkas ini: ia dipindah ke
  // features/audio/fiezel-ui-sfx.js supaya sapaan pembuka dan seluruh SFX transisi
  // benar-benar memakai satu mesin yang sama, dan tidak bisa melenceng satu sama lain
  // seiring waktu. Modul itu dimuat lebih dulu di index.html.
  //
  // Kegagalan ditelan diam-diam: browser memblokir audio sebelum ada sentuhan pengguna,
  // dan splash harus tetap tampil utuh tanpa bunyi.
  function playChime(env) {
    try { return env && env.FiezelUiSfx ? env.FiezelUiSfx.playMotif(env) === true : false; }
    catch (_) { return false; }
  }

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

  // m025-80 OWNER: maskot dikeluarkan dari splash. Yang tampil sekarang hanya logo yang
  // dianimasikan, wordmark, dan tagline - satu bidang gelap yang tenang, seperti pembuka
  // aplikasi kelas atas. Gelembung ucapan dan tombol ajakan ikut dilepas: splash menutup
  // dirinya sendiri, jadi tidak ada yang perlu ditekan.
  function markup() {
    return '<div class="fiezel-splash-body fiezel-splash-brand">'
      + '<div class="fiezel-logo-stage">' + logoMarkup() + '</div>'
      + '<p class="fiezel-splash-word">' + COPY.word + '</p>'
      + '<p class="fiezel-splash-tag">' + COPY.tagline + '</p>'
      + '</div>';
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
    // m025-80: syarat FiezelMascot dilepas - splash tidak lagi memakai maskot, jadi modul
    // yang belum siap tidak boleh lagi membatalkan sapaan pembuka.
    if (opts.force !== true && seenToday(target, now)) return { shown: false, reason: 'seen_today' };

    var host = doc.createElement('div');
    // Bidang gelap dipasang di HOST, bukan hanya di anaknya: host punya padding-top untuk
    // safe-area, dan tanpa ini warna cream bawaan splash lama menyembul sebagai pita di
    // tepi atas layar.
    host.className = 'fiezel-splash fiezel-splash-dark';
    if (prefersReducedMotion(target)) host.className += ' fiezel-splash-still';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-label', 'Selamat datang di FIEZEL');
    host.innerHTML = markup();
    // Nada pembuka menyusul animasi logo.
    if (opts.silent !== true) playChime(target);

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
