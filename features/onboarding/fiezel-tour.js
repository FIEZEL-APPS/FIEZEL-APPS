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

  // AI-02 F01: naskah tur diambil dari lapisan i18n (copy-id-feat-b.js), bukan literal di
  // titik pakai. Di browser runtime-nya dimuat lebih dulu (index.html); di Node (tour-test
  // dan tours-test me-require modul ini langsung) modul memuatnya sendiri supaya nilai
  // runtime tetap byte-identik dengan copy di reports/copy-tour-gems.md.
  var I18N = (typeof globalThis !== 'undefined' && globalThis.FiezelI18n) || null;
  if (!I18N && typeof require === 'function') {
    try {
      I18N = require('../i18n/fiezel-i18n.js');
      require('../i18n/copy-id-feat-b.js');
    } catch (loadError) { I18N = null; }
  }
  function T(key, params) { return I18N ? I18N.t(key, params) : String(key); }

  // Copy Thai dimuat setelah pemilih bahasa pertama selesai. Menyimpan hasil T() langsung
  // saat modul dievaluasi membekukan copy Indonesia untuk seluruh umur halaman, walaupun
  // locale kemudian sudah berubah ke `th`. Getter menjaga selector/identitas langkah tetap
  // beku, tetapi mengambil judul dan isi dari locale AKTIF setiap kali tur dicat.
  function localizedStep(id, target, titleKey, bodyKey) {
    var step = { id: id, target: target };
    Object.defineProperties(step, {
      title: { enumerable: true, get: function () { return T(titleKey); } },
      body: { enumerable: true, get: function () { return T(bodyKey); } }
    });
    return Object.freeze(step);
  }

  var STORAGE_KEY = 'fiezel-tour-v1';

  /**
   * Langkah tur. `target` adalah selector ke elemen SUNGGUHAN di layar.
   *
   * Urutannya mengikuti urutan keputusan murid, bukan urutan tata letak: apa yang harus
   * kutekan sekarang -> di mana materinya -> bagaimana pindah -> siapa yang mengatur ini.
   * Nada bahasanya sengaja santai; brief redesign bagian 3.1 mempertahankan gaya itu sebagai
   * identitas suara FIEZEL, jadi tur tidak boleh terdengar seperti manual.
   */
  /**
   * REGISTRY TUR BERSESI (m026-03).
   *
   * Satu kunci "sudah pernah lihat" untuk seluruh aplikasi adalah sumber dua penyakit yang
   * sudah terbukti di produk ini:
   *
   *   1. TUR MENU MENYERET MURID KE FITUR. Tur tunggal harus memilih antara menjelaskan menu
   *      atau menjelaskan isi fitur; yang terjadi adalah keduanya setengah-setengah.
   *   2. SELECTOR BASI TIDAK PERNAH TERLIHAT GAGAL. `resolveSteps` membuang langkah yang
   *      targetnya tidak ada - diam-diam. Baseline 27 Agustus 2026 membuktikannya: dari empat
   *      langkah bawaan, dua dibuang (`.launcher-actions .primary` dan `.coach-preview` sudah
   *      tidak dirender Home sejak redesign), jadi tur yang tampil hanya 2 kartu dan murid
   *      tidak pernah diberi tahu soal tombol coach maupun chip level.
   *
   * Karena itu tur dipecah PER SESI, masing-masing dengan daftar langkahnya sendiri:
   *
   *   menu       7 langkah, semuanya navigasi, dan BERHENTI di kartu penutup. Tidak satu pun
   *              targetnya berada di dalam fitur - itu tugas tur kontekstual.
   *   library    4 langkah di dalam pembaca buku, dipicu saat buku pertama dibuka.
   *   listening  4 langkah di dalam sesi listening, dipicu saat sesi pertama tergambar.
   *
   * Bendera "sudah lihat" TIDAK lagi di localStorage lepas melainkan di `state.toursSeen`
   * (app.js), supaya ikut backup/restore dan tidak bocor antar akun Puter.
   *
   * Semua teks di bawah ini VERBATIM dari reports/copy-tour-gems.md (§1 menu, §2 audiobook,
   * §3 listening). Gate `tours-test.js` membandingkannya karakter demi karakter; kalau copy
   * berubah, ubah laporan copy-nya dan gate-nya sekaligus, bukan diam-diam di sini.
   *
   * Semua selector di bawah ini DIVERIFIKASI hidup pada 390x844 lewat serve+Playwright
   * (reports/fix-tour.md §selector), bukan dibaca dari CSS.
   */
  var MENU_STEPS = Object.freeze([
    localizedStep('home', '.learning-launcher', 'tour.menu-home-title', 'tour.menu-home-body'),
    /* m025-246: dua langkah ini dulu menunjuk tab Vocab dan tab Reading. Tab bar sekarang
       berisi empat tujuan (Hari ini . Latihan . Progres . Pengaturan), jadi kedua selector
       itu tidak menunjuk apa pun - dan resolveSteps akan MEMBUANGnya diam-diam, sehingga
       tur menyusut tanpa ada yang tahu. Keduanya dipindahkan ke tab yang benar-benar
       menampung tujuannya sekarang: Vocab/Grammar/Reading hidup di dalam Latihan, dan Peta
       berganti nama jadi Progres. Naskahnya ikut diperbarui di copy-id-feat-b.js /
       copy-th-feat-b.js supaya kalimatnya menyebut tab yang benar-benar dilihat murid. */
    localizedStep('vocab-grammar', '.bottomnav [data-view="latihan"]', 'tour.menu-vocab-title', 'tour.menu-vocab-body'),
    localizedStep('reading-peta', '.bottomnav [data-view="progress"]', 'tour.menu-reading-title', 'tour.menu-reading-body'),
    localizedStep('notif', '.topbar .notif-button', 'tour.menu-notif-title', 'tour.menu-notif-body'),
    localizedStep('level', '.home-level-context', 'tour.menu-level-title', 'tour.menu-level-body'),
    localizedStep('settings', '.topbar-actions [aria-label="Buka pengaturan"]', 'tour.menu-settings-title', 'tour.menu-settings-body'),
    // PENUTUP. Targetnya wordmark FIEZEL - benda paling netral di layar, dan bukan pintu ke
    // fitur apa pun. Di sinilah tur menu berhenti: tidak ada langkah kedelapan yang membuka
    // Perpustakaan atau Listening, karena tur yang memindahkan layar sendiri berhenti menjadi
    // penjelasan dan berubah menjadi remote control.
    localizedStep('penutup', '.topbar .brand-button', 'tour.menu-end-title', 'tour.menu-end-body')
  ]);

  // Pembaca buku. Langkah 2 TIDAK menunjuk pita subtitle `#fiezelSubtitle`: pita itu `hidden`
  // sampai narasi benar-benar berbunyi, jadi kotaknya 0x0 dan resolveSteps membuangnya (diukur
  // di probe: exists=false saat reader baru dibuka). Yang ditunjuk adalah kalimat pertama
  // `.library-sentence` (364x72) - kontainer yang BENAR-BENAR terlihat dan memang yang nanti
  // ikut disorot saat dibacakan.
  var LIBRARY_STEPS = Object.freeze([
    localizedStep('putar', '#libraryPlay', 'tour.lib-play-title', 'tour.lib-play-body'),
    localizedStep('subtitle', '.library-sentence', 'tour.lib-subtitle-title', 'tour.lib-subtitle-body'),
    // Toggle Gem Terjemahan adalah ID KONTRAK BERSAMA dengan pekerjaan gems yang berjalan
    // paralel (#fslTranslateToggle). Selama elemennya belum ada, resolveSteps melewatinya -
    // itu memang perilaku yang diinginkan, bukan kegagalan: tur menunjukkan apa yang ada.
    localizedStep('terjemahan', '#fslTranslateToggle, #libraryTranslateToggle', 'tour.lib-translate-title', 'tour.lib-translate-body'),
    localizedStep('kecepatan', '.topbar-actions [aria-label="Buka pengaturan"]', 'tour.lib-speed-title', 'tour.lib-speed-body')
  ]);

  // Sesi listening. Langkah 2 menunjuk `.fsl-privacy` (baris kejujuran di atas blok feedback)
  // dan bukan `[data-feedback]`: blok feedback ADA di DOM tetapi tingginya 0 px sampai jawaban
  // dinilai (diukur di probe: 326x0), jadi menyorotnya berarti menyorot garis tak terlihat.
  var LISTENING_STEPS = Object.freeze([
    localizedStep('sekali-dengar', '#speakingListeningRoot .fsl-card', 'tour.listen-once-title', 'tour.listen-once-body'),
    localizedStep('meleset', '#speakingListeningRoot .fsl-privacy', 'tour.listen-miss-title', 'tour.listen-miss-body'),
    localizedStep('terjemahan', '#fslTranslateToggle', 'tour.listen-translate-title', 'tour.listen-translate-body'),
    localizedStep('kecepatan', '.topbar-actions [aria-label="Buka pengaturan"]', 'tour.listen-speed-title', 'tour.listen-speed-body')
  ]);

  var TOURS = Object.freeze({
    menu: Object.freeze({ id: 'menu', scope: 'home', steps: MENU_STEPS }),
    library: Object.freeze({ id: 'library', scope: 'library', steps: LIBRARY_STEPS }),
    listening: Object.freeze({ id: 'listening', scope: 'listening', steps: LISTENING_STEPS })
  });

  var TOUR_NAMES = Object.freeze(['menu', 'library', 'listening']);

  /** Daftar langkah sebuah tur, atau daftar kosong untuk nama yang tidak dikenal. */
  function stepsFor(name) {
    var def = TOURS[String(name || '')];
    return def ? def.steps : [];
  }

  // STEPS tetap ada sebagai nama lama, tetapi ia BUKAN salinan: ia menunjuk langkah menu yang
  // sama. Duplikat daftar langkah adalah cara selector menjadi basi tanpa ada yang tahu.
  var STEPS = MENU_STEPS;

  function prefersReducedMotion(env) {
    try {
      return !!(env && env.matchMedia && env.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) { return false; }
  }

  /**
   * I11 (O1-003): mode pelajaran aktif. Tur TIDAK BOLEH mulai, maju, atau tercat di atas
   * pelajaran yang sedang berjalan - lapisan apa pun di atas soal melanggar hukum hierarki
   * (pertanyaan > opsi > segalanya). Sumber kebenarannya ekspor FiezelStage.lessonMode()
   * dari app.js (turunan murni stageStack, dipasang khusus untuk penjaga ini); kelas
   * body.fz-lesson-mode dipakai sebagai cadangan kalau ekspornya belum termuat.
   */
  function lessonModeActive(env) {
    try {
      var stage = env && env.FiezelStage;
      if (!stage && typeof self !== 'undefined') stage = self.FiezelStage;
      if (stage && typeof stage.lessonMode === 'function') return stage.lessonMode() === true;
    } catch (_) {}
    try {
      var body = env && env.document && env.document.body;
      return !!(body && body.classList && typeof body.classList.contains === 'function'
        && body.classList.contains('fz-lesson-mode'));
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

    // I11 (O1-003): PELAJARAN MENANG ATAS TUR. Diperiksa SEBELUM resolveSteps, dan alasannya
    // bukan gaya: mode pelajaran menyembunyikan topbar/bottomnav (display:none), jadi
    // resolveSteps akan membuang target-target itu dan menyegel tur sebagai 'no_target' -
    // jatah sekali-tampilnya hangus di tengah pelajaran murid. Kembali TANPA markCompleted:
    // tur yang tertunda pelajaran BERHAK ditawarkan lagi nanti (adil untuk pemanggil yang
    // membaca completed() maupun untuk bendera state.toursSeen milik app.js, yang hanya
    // dicatat ketika shown/no_target).
    if (lessonModeActive(target)) return { shown: false, reason: 'lesson_active' };

    var resolved = resolveSteps(target, Array.isArray(opts.steps) ? opts.steps : STEPS);
    // Tidak ada yang bisa ditunjuk berarti tidak ada yang bisa diajarkan. Ditandai selesai
    // supaya tur tidak mencoba lagi setiap kali Home dirender ulang.
    if (!resolved.length) { markCompleted(target, 'no_target'); return { shown: false, reason: 'no_target' }; }

    var host = doc.createElement('div');
    host.className = 'fz-tour';
    if (prefersReducedMotion(target)) host.className += ' fz-tour-still';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-label', T('tour.dialog-aria'));

    var index = 0;
    var closed = false;
    // I11 penahanan lapisan (O1-003): tur lama tidak punya kait perubahan layar - renderInner
    // mengganti seluruh #app dan kartunya tetap tercat di atas layar baru (terbukti live:
    // kartu tur listening menutupi Peta, Pengaturan, bahkan soal grammar di 320px).
    //   - paused: pelajaran mulai di tengah tur -> tur DITUNDA sopan (disembunyikan), bukan
    //     dibakar; kalau layarnya kembali setelah pelajaran usai, tur dilanjutkan.
    //   - jangkar lingkup: target langkah PERTAMA yang lolos resolve. Ia selalu elemen di
    //     dalam view yang dijelaskan tur (`.learning-launcher`, `.fsl-card`, `#libraryPlay`),
    //     jadi hilangnya jangkar = view berganti = tur ditutup, bukan dibiarkan bocor di
    //     atas layar lain.
    var paused = false;
    var anchorSel = resolved[0] ? resolved[0].target : null;
    var contextTimer = null;
    var resumeTimer = null;
    var bodyObserver = null;
    var appObserver = null;

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
      // I11: tidak pernah mengecat di atas pelajaran - kalau mode pelajaran menyala di antara
      // dua cat (resize, orientasi, lanjut), turnya menunda dirinya alih-alih menimpa soal.
      if (lessonModeActive(target)) { pauseTour(); return; }
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
        + '<button type="button" class="fz-tour-skip" data-tour-skip>' + escapeHtml(T('tour.skip')) + '</button>'
        + '<button type="button" class="fz-tour-next" data-tour-next>' + escapeHtml(isLast ? T('tour.ready') : T('tour.next')) + '</button>'
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
      // I11: tur tidak pernah MAJU di atas pelajaran - Enter/klik yang nyasar saat mode
      // pelajaran menunda, tidak memajukan.
      if (lessonModeActive(target)) { pauseTour(); return; }
      if (index >= resolved.length - 1) { finish('finish'); return; }
      index += 1;
      paint();
    }

    /* ---- I11: tunda / lanjut / tutup-sopan (tanpa membakar jatah tampil) ---- */

    function anchorAlive() {
      if (!anchorSel) return false;
      var node = null;
      try { node = doc.querySelector(anchorSel); } catch (_) { node = null; }
      if (!node) return false;
      try {
        var box = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : null;
        return !box || (box.width > 0 && box.height > 0);
      } catch (_) { return true; }
    }

    function pauseTour() {
      if (closed || paused) return;
      paused = true;
      // Inline, bukan kelas CSS: style.css milik agen lain, dan penundaan ini harus bekerja
      // apa pun isi stylesheet-nya.
      try { host.style.display = 'none'; } catch (_) {}
    }

    function resumeTour() {
      if (closed || !paused) return;
      paused = false;
      try { host.style.display = ''; } catch (_) {}
      paint();
    }

    // Ditutup karena DIINTERUPSI (ganti view / pelajaran tidak kembali ke layar tur), bukan
    // karena murid menolaknya - jadi TANPA markCompleted: kelayakan tampil tidak dibakar.
    // Pemanggil tetap diberi tahu lewat onFinish supaya tidak ada yang menebak dari efek samping.
    function dismissQuietly(via) {
      if (closed) return;
      closed = true;
      detach();
      try { if (host.parentNode) host.parentNode.removeChild(host); } catch (_) {}
      if (typeof opts.onFinish === 'function') {
        try { opts.onFinish({ via: via, step: index }); } catch (_) {}
      }
    }

    function onContextChange() {
      if (closed) return;
      if (lessonModeActive(target)) { pauseTour(); return; }
      if (paused) {
        // Pelajaran usai. Layar berikutnya digambar SETELAH kelas body berganti, jadi beri
        // satu jeda pendek sebelum memutuskan: jangkar kembali -> lanjut; tidak -> tutup sopan.
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(function () {
          if (closed || lessonModeActive(target)) return;
          if (anchorAlive()) resumeTour();
          else dismissQuietly('lesson_interrupt');
        }, 360);
        if (resumeTimer && typeof resumeTimer.unref === 'function') resumeTimer.unref();
        return;
      }
      if (!anchorAlive()) dismissQuietly('view_change');
    }

    function scheduleContextCheck() {
      if (closed) return;
      // Pelajaran menunda SEKETIKA; keputusan lain menunggu render-nya selesai dulu.
      if (lessonModeActive(target)) { pauseTour(); return; }
      if (contextTimer) clearTimeout(contextTimer);
      contextTimer = setTimeout(onContextChange, 240);
      if (contextTimer && typeof contextTimer.unref === 'function') contextTimer.unref();
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
      if (paused) return; /* I11: keyboard milik pelajaran selama tur tertunda */
      var key = event && event.key;
      if (key === 'Escape') finish('escape');
      else if (key === 'Enter' || key === ' ') next();
    }
    function onReflow() { if (!closed && !paused) paint(); }

    function detach() {
      try { host.removeEventListener('click', onOverlayClick); } catch (_) {}
      try { if (target.removeEventListener) target.removeEventListener('resize', onReflow); } catch (_) {}
      try { if (target.removeEventListener) target.removeEventListener('orientationchange', onReflow); } catch (_) {}
      try { if (doc.removeEventListener) doc.removeEventListener('keydown', onKey); } catch (_) {}
      try { if (bodyObserver) bodyObserver.disconnect(); } catch (_) {}
      try { if (appObserver) appObserver.disconnect(); } catch (_) {}
      try { if (contextTimer) clearTimeout(contextTimer); } catch (_) {}
      try { if (resumeTimer) clearTimeout(resumeTimer); } catch (_) {}
    }

    try { host.addEventListener('click', onOverlayClick); } catch (_) {}
    try { if (target.addEventListener) target.addEventListener('resize', onReflow); } catch (_) {}
    try { if (target.addEventListener) target.addEventListener('orientationchange', onReflow); } catch (_) {}
    try { if (doc.addEventListener) doc.addEventListener('keydown', onKey); } catch (_) {}

    // I11: dua pengamat penahanan. (1) kelas <body> - fz-lesson-mode disetel syncLessonMode
    // SEBELUM layar pelajaran digambar, jadi turnya sudah tersembunyi saat soal muncul.
    // (2) anak-anak #app - renderInner/setApp mengganti seluruh isinya pada tiap navigasi;
    // begitu jangkar lingkupnya hilang, tur menutup dirinya alih-alih bocor ke layar lain.
    // Keduanya opsional (MutationObserver tidak ada di harness Node murni) - tanpa pengamat,
    // penjaga di paint()/next()/show() tetap berdiri.
    try {
      var MO = target.MutationObserver
        || (typeof MutationObserver !== 'undefined' ? MutationObserver : null);
      if (typeof MO === 'function' && doc.body) {
        bodyObserver = new MO(scheduleContextCheck);
        bodyObserver.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
        var appHost = doc.querySelector('#app');
        if (appHost) {
          appObserver = new MO(scheduleContextCheck);
          appObserver.observe(appHost, { childList: true });
        }
      }
    } catch (_) { bodyObserver = null; appObserver = null; }

    paint();
    try { doc.body.appendChild(host); } catch (_) { detach(); return { shown: false, reason: 'append_failed' }; }

    return {
      shown: true,
      element: host,
      steps: resolved.length,
      stepIndex: function () { return index; },
      next: next,
      paused: function () { return paused; },
      close: function () { return finish('close'); }
    };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    STEPS: STEPS,
    TOURS: TOURS,
    TOUR_NAMES: TOUR_NAMES,
    stepsFor: stepsFor,
    completed: completed,
    reset: reset,
    resolveSteps: resolveSteps,
    show: show
  };
});
