/**
 * FIEZEL — splash pembuka (Step 0 pada FIEZEL_Complete_Design_Specification.pdf).
 *
 * m025-78: direstyle penuh layar mengikuti spesifikasi lengkap (bagian 2 dan 14) - token
 * warna/tipografi persis, Percik ditampilkan besar, bintang F berkelip (bagian 14: "Star
 * Twinkle"). Isinya sendiri tidak berubah dari spesifikasi: wordmark, maskot melambai,
 * gelembung ucapan, satu tombol ajakan. Tayang 2,5 detik lalu menutup sendiri, atau
 * langsung ditutup begitu disentuh.
 *
 * m025-84 OWNER: "sebelum muncul splash ada jeda sekitar kurang lebih 3 detik dan muncul
 * layar putih seluruh layar". Sebabnya bukan splash-nya lambat, melainkan splash-nya baru
 * DIBUAT jauh di ujung boot: showBrandSplash() dipanggil di akhir load() di app.js, setelah
 * ~50 <script> (termasuk js.puter.com dari jaringan) selesai dieksekusi DAN setelah ~2,7 MB
 * JSON konten diunduh serta diolah. Selama itu yang tampil adalah body kosong dengan
 * background var(--sky-bottom) = #fdf6f5, yaitu layar putih yang dilaporkan.
 *
 * Perbaikannya tidak mempercepat boot - boot memang perlu waktu itu - melainkan memindahkan
 * splash ke FRAME PERTAMA: markup-nya sekarang statis di index.html, di atas seluruh
 * <script>, dengan CSS kritisnya disisipkan di <head>. Modul ini tidak lagi selalu membuat
 * elemen baru; kalau splash frame-pertama itu ada, ia MENGADOPSINYA - animasi yang sudah
 * berjalan diteruskan, bukan diulang, dan tidak pernah ada dua splash bertumpuk.
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
  // Splash frame-pertama yang dipasang statis di index.html. Atribut inilah kontraknya:
  // selama namanya sama, modul ini mengadopsi elemen itu alih-alih membuat yang kedua.
  var BOOT_ATTR = 'data-fiezel-boot-splash';
  var BOOT_SELECTOR = '[' + BOOT_ATTR + ']';
  var BOOT_CLAIMED_ATTR = 'data-fiezel-boot-claimed';
  var BOOTING_CLASS = 'fz-booting';
  // Sisa waktu minimum setelah splash diadopsi. Boot yang lambat sudah "memakai" sebagian
  // besar VISIBLE_MS sebelum modul ini sempat berjalan; tanpa lantai ini splash akan
  // menutup tepat di detik app siap dan terbaca sebagai kedipan, bukan sambutan.
  var MIN_TAIL_MS = 700;
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
  //
  // m025-84 OWNER: "sfx sounds muncul belakangan saat user menekan tombol apapun di menu".
  // Itu bukan bunyi yang telat dipanggil - itu bunyi splash yang TERANTRE. Web Audio yang
  // dibuat tanpa sentuhan pengguna lahir dalam keadaan `suspended`, dan pada keadaan itu
  // ctx.currentTime BERHENTI. Motif yang dijadwalkan pada t0 = currentTime + 5ms karena itu
  // tidak dibuang, ia menunggu; begitu tombol pertama di menu ditekan dan konteksnya
  // di-resume, jam berjalan lagi dan seluruh motif splash meledak di sana. Sekarang jendela
  // hidupnya dibatasi ke umur splash lewat windowMs: kalau audio tidak sempat terbuka
  // selama splash tampil, motifnya DIBUANG, bukan diantre.
  function playChime(env, windowMs) {
    try {
      if (!env || !env.FiezelUiSfx || typeof env.FiezelUiSfx.playMotif !== 'function') return false;
      return env.FiezelUiSfx.playMotif(env, { windowMs: windowMs }) === true;
    } catch (_) { return false; }
  }

  function cancelChime(env) {
    try { if (env && env.FiezelUiSfx && typeof env.FiezelUiSfx.cancelPending === 'function') env.FiezelUiSfx.cancelPending(); }
    catch (_) { /* membatalkan bunyi tidak boleh menggagalkan penutupan splash */ }
  }

  /**
   * Splash frame-pertama dari index.html, kalau ada dan belum diklaim. Dikembalikan apa
   * adanya supaya pemanggil yang memutuskan mau mengadopsi atau membuangnya.
   */
  function bootSplashElement(env) {
    try {
      var doc = env && env.document;
      if (!doc || typeof doc.querySelector !== 'function') return null;
      var node = doc.querySelector(BOOT_SELECTOR);
      if (!node) return null;
      if (typeof node.getAttribute === 'function' && node.getAttribute(BOOT_CLAIMED_ATTR)) return null;
      return node;
    } catch (_) { return null; }
  }

  /** Melepas latar gelap boot supaya warna aplikasi yang asli kembali saat splash memudar. */
  function endBootBackground(env) {
    try {
      var root = env && env.document && env.document.documentElement;
      if (root && root.classList && typeof root.classList.remove === 'function') root.classList.remove(BOOTING_CLASS);
    } catch (_) { /* tanpa ini aplikasi tetap jalan, hanya latarnya gelap sebentar */ }
  }

  /**
   * Membuang splash frame-pertama tanpa menampilkannya sebagai sambutan. Dipakai saat modul
   * memutuskan TIDAK menyapa (sudah disapa hari ini) - tanpa ini elemen statis itu akan
   * tertinggal menutupi layar selamanya, yang jauh lebih buruk daripada kehilangan sapaan.
   */
  function disposeBootSplash(env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var node = bootSplashElement(target);
    endBootBackground(target);
    if (!node) return false;
    try { if (typeof node.setAttribute === 'function') node.setAttribute(BOOT_CLAIMED_ATTR, 'disposed'); } catch (_) {}
    try { if (node.parentNode) node.parentNode.removeChild(node); } catch (_) {}
    return true;
  }

  /**
   * Berapa lama splash frame-pertama sudah tampil. index.html mencatat stempelnya di
   * `__fiezelBootSplashAt` pada frame pertama; tanpa itu hasilnya 0 dan splash memakai
   * durasi penuh, persis seperti perilaku sebelum m025-84.
   */
  function bootSplashElapsed(env) {
    try {
      var startedAt = Number(env && env.__fiezelBootSplashAt);
      if (!isFinite(startedAt)) return 0;
      var perf = env && env.performance;
      if (!perf || typeof perf.now !== 'function') return 0;
      var elapsed = Number(perf.now()) - startedAt;
      return isFinite(elapsed) && elapsed > 0 ? elapsed : 0;
    } catch (_) { return 0; }
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
    if (opts.force !== true && seenToday(target, now)) {
      // Splash frame-pertama TIDAK boleh tertinggal hanya karena sapaan hari ini dilewati.
      disposeBootSplash(target);
      return { shown: false, reason: 'seen_today' };
    }

    // Splash frame-pertama diadopsi kalau ada: animasinya sudah berjalan sejak frame
    // pertama, jadi membuat elemen kedua berarti mengulang animasi yang baru saja selesai
    // dan menumpuk dua lapisan penuh layar di atas satu sama lain.
    var adopted = bootSplashElement(target);
    var host = adopted;
    if (host) {
      try { host.setAttribute(BOOT_CLAIMED_ATTR, 'shown'); } catch (_) {}
    } else {
      host = doc.createElement('div');
      // Bidang gelap dipasang di HOST, bukan hanya di anaknya: host punya padding-top untuk
      // safe-area, dan tanpa ini warna cream bawaan splash lama menyembul sebagai pita di
      // tepi atas layar.
      host.className = 'fiezel-splash fiezel-splash-dark';
      if (prefersReducedMotion(target)) host.className += ' fiezel-splash-still';
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-label', 'Selamat datang di FIEZEL');
      host.innerHTML = markup();
    }

    // Ketukan koreografi dipasang sebagai custom property. CSS membaca jeda animasinya dari
    // sini, dan fiezel-ui-sfx.js menjadwalkan nadanya dari tabel yang sama - jadi gerak dan
    // bunyi tidak bisa lagi bergeser sendiri-sendiri. index.html menuliskan nilai yang sama
    // sebagai default supaya splash frame-pertama tetap bergerak sebelum JavaScript jalan.
    try { if (target.FiezelChoreography) target.FiezelChoreography.applyTo(host); } catch (_) {}

    // Sisa waktu tayang. Untuk splash yang diadopsi, waktu yang sudah dipakai boot ikut
    // dihitung supaya sapaan tidak menjadi VISIBLE_MS DITAMBAH lamanya boot.
    var visibleMs = Number(opts.visibleMs) > 0 ? Number(opts.visibleMs) : VISIBLE_MS;
    if (adopted) visibleMs = Math.max(MIN_TAIL_MS, visibleMs - bootSplashElapsed(target));

    var closed = false;
    var timer = null;
    function close() {
      if (closed) return;
      closed = true;
      if (timer && target.clearTimeout) target.clearTimeout(timer);
      markSeen(target, now);
      // Motif yang belum sempat berbunyi mati bersama splash. Inilah yang mencegahnya
      // muncul lagi nanti sebagai bunyi liar di tekanan tombol pertama pengguna.
      cancelChime(target);
      // Latar gelap boot dilepas di AWAL penutupan, bukan setelah animasi keluar: splash
      // memudar dan yang tersingkap harus sudah berwarna aplikasi, bukan hitam boot.
      endBootBackground(target);
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

    if (!adopted) {
      try { doc.body.appendChild(host); } catch (_) { return { shown: false, reason: 'append_failed' }; }
    }
    // Nada pembuka menyusul animasi logo. Dibunyikan SETELAH host masuk DOM, bukan sebelum:
    // jadwal Web Audio mulai berjalan begitu playChime() dipanggil (lihat schedule() di
    // fiezel-ui-sfx.js, t0 = ctx.currentTime + 0.005s), sedangkan animasi CSS baru mulai
    // begitu elemen benar-benar ada di render tree. Memanggilnya lebih dulu membuat bunyi
    // mendahului gerakan logo walau hanya beberapa milidetik - cukup untuk terasa "tidak
    // sinkron" pada transisi yang jaraknya sendiri cuma seperseratus detik.
    //
    // Jendela hidup motif diikat ke sisa waktu tayang splash. Browser memblokir audio
    // sebelum sentuhan pertama; kalau sentuhan itu datang selagi splash masih tampil,
    // motifnya berbunyi di sana - kalau tidak datang, motifnya dibuang di penutupan.
    if (opts.silent !== true) playChime(target, visibleMs);

    if (typeof target.setTimeout === 'function') {
      timer = target.setTimeout(close, visibleMs);
    }
    return { shown: true, close: close, element: host, adopted: !!adopted, visibleMs: visibleMs };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    VISIBLE_MS: VISIBLE_MS,
    MIN_TAIL_MS: MIN_TAIL_MS,
    BOOT_ATTR: BOOT_ATTR,
    BOOT_SELECTOR: BOOT_SELECTOR,
    BOOTING_CLASS: BOOTING_CLASS,
    COPY: COPY,
    dayKey: dayKey,
    seenToday: seenToday,
    // Diekspor supaya markup statis di index.html bisa diuji identik dengan sumber ini,
    // bukan disalin sekali lalu menyimpang diam-diam pada perubahan berikutnya.
    logoMarkup: logoMarkup,
    markup: markup,
    disposeBootSplash: disposeBootSplash,
    show: show
  };
});
