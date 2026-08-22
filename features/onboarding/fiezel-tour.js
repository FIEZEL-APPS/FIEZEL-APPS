/**
 * FIEZEL — tur pengenalan (coach marks di atas UI yang sungguhan).
 *
 * OWNER m025-101: "anggaplah ada user baru, dan dia baru buka apps, dan ga ngerti cara pake,
 * seharusnya ada tutorial seperti apps terkenal".
 *
 * Yang sudah ada sebelum berkas ini adalah SAMBUTAN, bukan cara pakai. `fiezel-onboarding.js`
 * menanyakan tujuan belajar dan perkiraan level lalu selesai - dan murid dilepas ke Home
 * berisi puluhan kontrol tanpa satu pun petunjuk tentang mana yang harus disentuh lebih dulu.
 *
 * KENAPA COACH MARK, BUKAN SLIDE TAMBAHAN
 *
 * Menambah slide di perkenalan berarti menjelaskan aplikasi memakai gambar aplikasi. Yang
 * dilakukan aplikasi yang benar-benar dipakai orang - dan yang diminta OWNER dengan menyebut
 * "apps terkenal" - adalah menunjuk BENDA ASLINYA: layar tetap layar yang sesungguhnya, satu
 * bagian disorot, sisanya diredupkan. Murid melihat tombol yang akan ia tekan nanti, di tempat
 * ia akan berada nanti, bukan gambarnya.
 *
 * TIGA BATAS YANG DIJAGA, dan semuanya sudah dibayar mahal di produk ini
 *
 * 1. TIDAK PERNAH MENGURUNG. Ini pelajaran m025-88, ketika tombol "Lewati" di perkenalan
 *    tidak menyerahkan kendali kembali dan murid ditinggal di cangkang kosong. Di sini setiap
 *    jalan keluar - "Lewati", tombol kembali, sentuhan di luar sorotan, tenggat, bahkan target
 *    yang hilang dari layar - berakhir di finish() yang sama. Satu jalan keluar, tidak ada
 *    cabang yang bisa lupa memanggilnya.
 *
 * 2. TARGET YANG TIDAK ADA DILEWATI, BUKAN DITUNGGU. Home berbeda isinya untuk murid baru dan
 *    murid lama; kartu yang disorot bisa saja tidak dirender. Langkah yang targetnya tidak
 *    ditemukan dibuang dari daftar sebelum tur dimulai, dan kalau semuanya hilang tur tidak
 *    jadi tampil sama sekali. Menunggu elemen yang tidak akan pernah datang adalah cara paling
 *    mudah membuat layar mati.
 *
 * 3. SEKALI SAJA. Tur yang datang lagi berubah dari bantuan menjadi gangguan - alasan yang
 *    sama dengan splash "sekali per hari" dan perkenalan "sekali selesai".
 *
 * Modul ini murni: ia hanya menyentuh DOM lewat `env` yang diberikan pemanggil, jadi ia bisa
 * diuji tanpa peramban dan tidak bisa diam-diam merusak keadaan belajar.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelTour = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_KEY = 'fiezel-tour-v1';

  /**
   * Langkah tur. `target` adalah selector ke elemen SUNGGUHAN di layar.
   *
   * Urutannya mengikuti urutan keputusan murid, bukan urutan tata letak: apa yang harus
   * kutekan sekarang -> di mana materinya -> bagaimana pindah -> siapa yang mengatur ini.
   * Nada bahasanya sengaja santai; brief redesign bagian 3.1 mempertahankan gaya itu sebagai
   * identitas suara FIEZEL, jadi tur tidak boleh terdengar seperti manual.
   */
  var STEPS = Object.freeze([
    Object.freeze({
      id: 'mulai',
      target: '.launcher-actions .primary',
      title: 'Mulai dari tombol ini',
      body: 'Bingung mau ngapain? Tekan ini aja. FIEZEL yang mikirin langkah berikutnya buat kamu.'
    }),
    Object.freeze({
      id: 'materi',
      target: '.learning-launcher',
      title: 'Semua materi ada di sini',
      body: 'Kosakata, grammar, bacaan, perpustakaan, sampai latihan ngomong. Ketuk yang kamu mau.'
    }),
    Object.freeze({
      id: 'navigasi',
      target: '.bottomnav',
      title: 'Pindah-pindah lewat sini',
      body: 'Bar bawah ini nempel terus. Tab Peta buat lihat sejauh mana kamu udah jalan.'
    }),
    Object.freeze({
      id: 'coach',
      target: '.coach-preview',
      title: 'Ini pelatihmu',
      body: 'Dia baca hasil latihanmu terus nyusun rencana. Makin sering latihan, makin pas sarannya.'
    })
  ]);

  function prefersReducedMotion(env) {
    try {
      return !!(env && env.matchMedia && env.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) { return false; }
  }

  /** Sudah pernah selesai ATAU pernah dilewati. Keduanya berarti jangan menawarkan lagi. */
  function completed(env) {
    try {
      var store = env && env.localStorage;
      if (!store || typeof store.getItem !== 'function') return false;
      return String(store.getItem(STORAGE_KEY) || '') !== '';
    } catch (_) { return false; }
  }

  function markCompleted(env, via) {
    try {
      var store = env && env.localStorage;
      if (store && typeof store.setItem === 'function') store.setItem(STORAGE_KEY, String(via || 'finish'));
    } catch (_) { /* penyimpanan penuh tidak boleh mengurung murid di dalam tur */ }
  }

  /** Melupakan tur, supaya bisa diputar ulang dari Pengaturan. */
  function reset(env) {
    try {
      var store = env && env.localStorage;
      if (store && typeof store.removeItem === 'function') { store.removeItem(STORAGE_KEY); return true; }
    } catch (_) {}
    return false;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /**
   * Langkah yang targetnya benar-benar ada DAN punya ukuran. Elemen yang ada di DOM tetapi
   * berukuran nol (belum dirender, disembunyikan display:none) tidak bisa disorot - menyorot
   * kotak 0x0 menghasilkan lubang yang tidak menunjuk apa pun.
   */
  function resolveSteps(env, steps) {
    var doc = env && env.document;
    if (!doc || typeof doc.querySelector !== 'function') return [];
    var out = [];
    for (var i = 0; i < steps.length; i++) {
      var node = null;
      try { node = doc.querySelector(steps[i].target); } catch (_) { node = null; }
      if (!node) continue;
      var box = null;
      try { box = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : null; } catch (_) { box = null; }
      if (box && (box.width <= 0 || box.height <= 0)) continue;
      // Yang disimpan SELECTOR-nya, bukan simpulnya. setApp() mengganti seluruh innerHTML
      // #app pada setiap render, jadi simpul yang dipegang di sini akan menjadi yatim -
      // getBoundingClientRect()-nya lalu mengembalikan nol dan sorotannya menunjuk sudut kiri
      // atas layar. Ini bukan kemungkinan teoretis: langkah kedua sudah melakukannya persis
      // begitu saat pertama diuji.
      out.push(steps[i]);
    }
    return out;
  }

  function dots(count, active) {
    var out = '';
    for (var i = 0; i < count; i++) out += '<span class="fz-tour-dot' + (i === active ? ' is-active' : '') + '"></span>';
    return out;
  }

  /**
   * Menampilkan tur. Mengembalikan `{shown, reason}` supaya pemanggil tahu apa yang terjadi,
   * bukan menebaknya dari efek samping.
   */
  function show(env, options) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var opts = options || {};
    var doc = target.document;
    if (!doc || typeof doc.createElement !== 'function') return { shown: false, reason: 'no_document' };
    if (opts.force !== true && completed(target)) return { shown: false, reason: 'completed' };

    var resolved = resolveSteps(target, Array.isArray(opts.steps) ? opts.steps : STEPS);
    // Tidak ada yang bisa ditunjuk berarti tidak ada yang bisa diajarkan. Ditandai selesai
    // supaya tur tidak mencoba lagi setiap kali Home dirender ulang.
    if (!resolved.length) { markCompleted(target, 'no_target'); return { shown: false, reason: 'no_target' }; }

    var host = doc.createElement('div');
    host.className = 'fz-tour';
    if (prefersReducedMotion(target)) host.className += ' fz-tour-still';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-label', 'Kenalan cepat dengan FIEZEL');

    var index = 0;
    var closed = false;

    function finish(via) {
      if (closed) return false;
      closed = true;
      markCompleted(target, via);
      detach();
      try { if (host.parentNode) host.parentNode.removeChild(host); } catch (_) {}
      if (typeof opts.onFinish === 'function') {
        try { opts.onFinish({ via: via, step: index }); } catch (_) {}
      }
      return true;
    }

    function paint() {
      var current = resolved[index];
      var node = null;
      try { node = doc.querySelector(current.target); } catch (_) { node = null; }
      // Target yang hilang di tengah tur dilewati, tidak ditunggu. Kalau tidak ada lagi yang
      // tersisa, tur berakhir - bukan menggantung di lapisan gelap tanpa yang disorot.
      if (!node) {
        if (index >= resolved.length - 1) { finish('target_gone'); return; }
        index += 1; paint(); return;
      }
      var box = { top: 0, left: 0, width: 0, height: 0 };
      // Guliran DIHITUNG SENDIRI, bukan diserahkan ke scrollIntoView, dan alasannya dua:
      //
      // 1. style.css:61 memasang html{scroll-behavior:smooth}, jadi scrollIntoView
      //    menganimasikan gulirannya - sementara kotak target diukur beberapa baris di bawah
      //    ini, sebelum animasi itu selesai. Sorotan lalu mendarat di posisi lama dan halaman
      //    menggeser di bawahnya.
      // 2. behavior:'instant' pun tidak selalu menggulir; saat diuji, target setinggi 636px di
      //    y=2408 tetap tidak dibawa ke layar dan lubangnya digambar jauh di luar pandang.
      //    Sorotan yang tidak terlihat lebih buruk daripada tidak ada sorotan sama sekali.
      //
      // Karena itu: hitung posisi absolut target, gulir ke sana tanpa animasi, LALU ukur.
      // Target yang lebih tinggi dari layar disandarkan ke tepi atas, bukan dipusatkan -
      // memusatkan yang kepanjangan justru membuang kepalanya keluar layar.
      try {
        var pre = node.getBoundingClientRect();
        var viewH = Number(target.innerHeight) || 0;
        var pageY = Number(target.scrollY || target.pageYOffset || 0);
        if (viewH && (pre.top < 0 || pre.top + pre.height > viewH)) {
          var absTop = pre.top + pageY;
          var wanted = pre.height >= viewH - 120 ? absTop - 72 : absTop - (viewH - pre.height) / 2;
          wanted = Math.max(0, wanted);
          if (typeof target.scrollTo === 'function') {
            try { target.scrollTo({ top: wanted, behavior: 'instant' }); }
            catch (__) { target.scrollTo(0, wanted); }
          }
        }
      } catch (_) {}
      try {
        var r = node.getBoundingClientRect();
        box = { top: r.top, left: r.left, width: r.width, height: r.height };
      } catch (_) {}

      // Sorotan dibuat dengan box-shadow raksasa, bukan dengan empat panel peredup: satu
      // elemen, satu lapis cat, dan lubangnya selalu pas mengikuti kotak targetnya.
      var pad = 8;
      var isLast = index === resolved.length - 1;
      host.innerHTML =
        '<div class="fz-tour-hole" style="top:' + (box.top - pad) + 'px;left:' + (box.left - pad)
          + 'px;width:' + (box.width + pad * 2) + 'px;height:' + (box.height + pad * 2) + 'px"></div>'
        + '<div class="fz-tour-card" data-tour-card>'
        + '<div class="fz-tour-dots">' + dots(resolved.length, index) + '</div>'
        + '<h2>' + escapeHtml(current.title) + '</h2>'
        + '<p>' + escapeHtml(current.body) + '</p>'
        + '<div class="fz-tour-actions">'
        + '<button type="button" class="fz-tour-skip" data-tour-skip>Lewati</button>'
        + '<button type="button" class="fz-tour-next" data-tour-next>' + (isLast ? 'Siap!' : 'Lanjut') + '</button>'
        + '</div></div>';

      // Kartu penjelasan diletakkan di paruh layar yang BERLAWANAN dengan target, supaya ia
      // tidak pernah menutupi benda yang sedang ditunjuk.
      try {
        var viewportH = Number(target.innerHeight) || 0;
        var card = host.querySelector('[data-tour-card]');
        if (card && viewportH) {
          var targetBelowMiddle = (box.top + box.height / 2) > viewportH / 2;
          card.className = 'fz-tour-card ' + (targetBelowMiddle ? 'is-top' : 'is-bottom');
        }
      } catch (_) {}

      bind();
    }

    function next() {
      if (index >= resolved.length - 1) { finish('finish'); return; }
      index += 1;
      paint();
    }

    function bind() {
      try {
        var skip = host.querySelector('[data-tour-skip]');
        if (skip) skip.addEventListener('click', function (e) { stop(e); finish('skip'); });
        var go = host.querySelector('[data-tour-next]');
        if (go) go.addEventListener('click', function (e) { stop(e); next(); });
      } catch (_) { /* tanpa listener, sentuhan di lapisan tetap memajukan tur */ }
    }

    function stop(event) {
      try { if (event && typeof event.stopPropagation === 'function') event.stopPropagation(); } catch (_) {}
    }

    // Sentuhan di mana pun pada lapisan gelap memajukan tur. Ini jalan keluar cadangan kalau
    // tombolnya sendiri gagal terpasang - lapisan penuh layar tanpa cara maju adalah jebakan.
    function onOverlayClick() { next(); }
    function onKey(event) {
      var key = event && event.key;
      if (key === 'Escape') finish('escape');
      else if (key === 'Enter' || key === ' ') next();
    }
    function onReflow() { if (!closed) paint(); }

    function detach() {
      try { host.removeEventListener('click', onOverlayClick); } catch (_) {}
      try { if (target.removeEventListener) target.removeEventListener('resize', onReflow); } catch (_) {}
      try { if (target.removeEventListener) target.removeEventListener('orientationchange', onReflow); } catch (_) {}
      try { if (doc.removeEventListener) doc.removeEventListener('keydown', onKey); } catch (_) {}
    }

    try { host.addEventListener('click', onOverlayClick); } catch (_) {}
    try { if (target.addEventListener) target.addEventListener('resize', onReflow); } catch (_) {}
    try { if (target.addEventListener) target.addEventListener('orientationchange', onReflow); } catch (_) {}
    try { if (doc.addEventListener) doc.addEventListener('keydown', onKey); } catch (_) {}

    paint();
    try { doc.body.appendChild(host); } catch (_) { detach(); return { shown: false, reason: 'append_failed' }; }

    return {
      shown: true,
      element: host,
      steps: resolved.length,
      stepIndex: function () { return index; },
      next: next,
      close: function () { return finish('close'); }
    };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    STEPS: STEPS,
    completed: completed,
    reset: reset,
    resolveSteps: resolveSteps,
    show: show
  };
});
