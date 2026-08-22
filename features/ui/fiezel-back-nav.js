/**
 * FIEZEL — gestur dan tombol "kembali" (m025-84).
 *
 * OWNER: "tidak ada sistem swipe back, misalnya dari menu terus menuju ke fitur audiobook,
 * ketika ingin kembali dan swipe back, itu tidak berfungsi."
 *
 * Penyebabnya BUKAN pada gesturnya. go() di app.js hanya mengubah state.view lalu render
 * ulang; di seluruh aplikasi ini tidak pernah ada satu pun panggilan history.pushState.
 * Artinya sepanjang sesi, FIEZEL hidup di SATU entri riwayat. Konsekuensinya persis yang
 * dilaporkan owner, dan sebenarnya lebih buruk daripada "tidak berfungsi":
 *
 *   - gestur swipe-back sistem tidak punya tujuan, jadi ia diam saja;
 *   - tombol kembali Android tidak punya tujuan, jadi ia MENUTUP aplikasi terpasang -
 *     murid yang cuma ingin keluar dari audiobook malah keluar dari FIEZEL;
 *   - layar yang lebih dalam dari sebuah view (pembaca buku, modal pengaturan) tidak
 *     terwakili sama sekali di riwayat, jadi tidak ada urutan tutup yang bisa diandalkan.
 *
 * Modul ini memegang satu tumpukan yang SELALU 1:1 dengan entri riwayat yang ia dorong
 * sendiri. Setiap navigasi maju mendorong satu entri; setiap popstate mengambil tepat satu
 * entri dan melakukan tepat satu tindakan. Tumpukan itu juga menampung lapisan yang bukan
 * view (modal, pembaca perpustakaan), sehingga "kembali" menutup lapisan teratas dulu dan
 * baru sesudahnya berpindah view.
 *
 * Empat batas yang dijaga di sini, semuanya karena produk ini sudah pernah membayarnya:
 *
 * 1. TIDAK ADA GELUNG TAK BERUJUNG. Jalur popstate TIDAK PERNAH memanggil pushState untuk
 *    navigasi normal. Kesalahan klasik "back memicu push memicu back" tidak mungkin terjadi
 *    karena mendorong entri hanya dilakukan oleh jalur maju.
 * 2. GERBANG WAJIB TIDAK BISA DITEROBOS. Gerbang notifikasi dan gerbang akun Puter adalah
 *    syarat masuk FIEZEL. Selama salah satunya menutupi layar, popstate dikembalikan apa
 *    adanya (entrinya didorong ulang) dan tidak ada view yang berubah.
 * 3. TIDAK PERNAH MENDARAT DI LAYAR KOSONG. Setiap entri membawa view tujuannya sendiri,
 *    dan view itu diverifikasi ke daftar view sah sebelum dipakai; kalau tidak dikenal,
 *    tujuannya jatuh ke beranda, bukan ke layar kosong.
 * 4. GERAKAN DAN BUNYI TIDAK DIGANDAKAN. Modul ini tidak menganimasikan apa pun dan tidak
 *    membunyikan apa pun sendiri. Perpindahan view dikembalikan ke go() di app.js, yang
 *    sudah memegang document.startViewTransition, preferensi motion murid, DAN pemeriksaan
 *    prefers-reduced-motion - jadi kembali terasa sama seperti maju, dan uiSfx('nav') tetap
 *    berbunyi tepat satu kali. Menutup lapisan memakai penutup lapisan itu sendiri
 *    (closeModal sudah membunyikan uiSfx('close')), jadi tidak ada dua bunyi bertumpuk.
 *
 * Lapisan kedua: gestur tepi kiri. Di iOS mode standalone, Safari TIDAK menyediakan gestur
 * swipe-back miliknya - itu gestur milik chrome browser, dan di PWA terpasang chrome itu
 * tidak ada. Jadi tarikan mendatar dari tepi kiri dipakai sebagai penggantinya, dengan satu
 * syarat yang tidak boleh dilanggar: gestur yang dimulai di dalam elemen yang bisa digulung
 * mendatar (carousel, blok kode, tabel dengan overflow-x) TIDAK BOLEH dibajak, karena di
 * sana tarikan mendatar berarti "gulung isi ini", bukan "kembali".
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelBackNav = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Tepi kiri iOS sendiri kira-kira selebar ini. Lebih lebar dari ini dan tarikan mendatar
  // biasa di tengah konten akan ikut tertangkap.
  var EDGE_PX = 24;
  // Jarak minimum sebelum tarikan dianggap sungguh-sungguh, bukan sentuhan yang meleset.
  var MIN_DISTANCE_PX = 64;
  // dx harus sekian kali lebih besar dari dy; tanpa ini gulir vertikal yang sedikit miring
  // di dekat tepi kiri akan terbaca sebagai "kembali".
  var HORIZONTAL_RATIO = 1.6;
  // Setelah bergerak sejauh ini secara vertikal, gestur milik penggulung halaman.
  var VERTICAL_SLOP_PX = 24;
  // Selisih kurang dari ini bukan gulungan sungguhan, hanya pembulatan tata letak.
  var SCROLL_SLOP_PX = 2;
  // Batas penelusuran ke atas; pohon DOM yang dalam tidak boleh membuat satu sentuhan
  // berjalan sepanjang dokumen.
  var MAX_ANCESTORS = 24;
  // Jendela untuk mengabaikan popstate hasil dari history.go() yang KITA panggil sendiri.
  var SKIP_WINDOW_MS = 1200;
  // Entri mati (lapisan yang layarnya sudah ditinggalkan lewat jalan lain) boleh dilewati
  // berantai, tetapi harus ada batasnya supaya satu tekanan kembali tidak pernah bisa
  // menguras seluruh riwayat.
  var MAX_CHAIN = 3;
  // Jeda antar-pemicu gestur tepi. Lebih pendek dari ini dan satu tarikan jari yang terbaca
  // dua kali akan memundurkan dua layar sekaligus.
  var GESTURE_COOLDOWN_MS = 450;

  function str(value) { return value == null ? '' : String(value); }

  // ---- tumpukan lapisan ------------------------------------------------------------

  /**
   * Membuat pengendali tumpukan. Semua sentuhan ke dunia luar lewat `hooks`, sehingga
   * seluruh perilakunya bisa diuji di Node tanpa DOM maupun riwayat sungguhan.
   *
   * hooks:
   *   history      { pushState, go, back }  - riwayat yang dipakai
   *   currentView  ()        -> string      - view yang sedang tampil
   *   knownView    (v)       -> boolean     - apakah view itu sah
   *   homeView     string                   - tujuan darurat bila view tidak dikenal
   *   applyView    (v)       -> boolean     - pindah view TANPA mendorong entri baru
   *   locked       ()        -> boolean     - benar bila gerbang wajib menutupi layar
   *   now          ()        -> number
   */
  function createStack(hooks) {
    var h = hooks || {};
    var stack = [];
    var skips = 0;
    var skipsAt = 0;
    var chained = 0;

    function now() {
      try { return typeof h.now === 'function' ? Number(h.now()) : Date.now(); }
      catch (_) { return Date.now(); }
    }
    function history() { return h.history || null; }
    function currentView() {
      try { return typeof h.currentView === 'function' ? str(h.currentView()) : ''; }
      catch (_) { return ''; }
    }
    function locked() {
      try { return typeof h.locked === 'function' && h.locked() === true; }
      catch (_) { return false; }
    }
    /** View tujuan selalu diverifikasi: entri lama tidak boleh mendaratkan murid di layar kosong. */
    function safeView(view) {
      var wanted = str(view);
      if (!wanted) return str(h.homeView) || 'home';
      try {
        if (typeof h.knownView === 'function' && h.knownView(wanted) !== true) {
          return str(h.homeView) || 'home';
        }
      } catch (_) { return str(h.homeView) || 'home'; }
      return wanted;
    }
    function applyView(view) {
      if (typeof h.applyView !== 'function') return false;
      try { return h.applyView(view) !== false; }
      catch (_) { return false; }
    }
    function pushHistory() {
      var api = history();
      if (!api || typeof api.pushState !== 'function') return false;
      try { api.pushState({ fiezelBackNav: stack.length }, ''); return true; }
      catch (_) { return false; }
    }
    function noteSkip(at) {
      skips = (at - skipsAt > SKIP_WINDOW_MS ? 0 : skips) + 1;
      skipsAt = at;
    }
    function consumeSkip(at) {
      if (skips > 0 && at - skipsAt <= SKIP_WINDOW_MS) { skips--; return true; }
      skips = 0;
      return false;
    }

    /**
     * Navigasi maju ke sebuah view. WAJIB dipanggil SEBELUM state.view berubah: entri
     * menyimpan view asalnya, dan view asal itulah yang dipulihkan saat entri ini diambil
     * kembali nanti.
     */
    function pushView(view) {
      var wanted = str(view);
      var from = currentView();
      // Menekan tab yang sedang aktif bukan navigasi. Mendorong entri di sini akan membuat
      // satu tekanan kembali terbuang tanpa perubahan apa pun di layar.
      if (!wanted || wanted === from) return false;
      // Selama gerbang wajib menutupi layar, tidak ada perpindahan yang boleh terekam.
      if (locked()) return false;
      stack.push({ kind: 'view', id: 'view:' + wanted, view: wanted, fromView: from, close: null });
      pushHistory();
      return true;
    }

    /**
     * Lapisan di atas sebuah view: modal, pembaca perpustakaan, lembar tanya. `close`
     * dipanggil HANYA oleh jalur riwayat dan harus mengembalikan false bila tidak ada apa
     * pun yang benar-benar ditutup.
     */
    function pushLayer(layer) {
      var spec = layer || {};
      var id = str(spec.id);
      if (!id) return false;
      if (locked()) return false;
      var view = currentView();
      stack.push({
        kind: 'layer', id: id, view: view, fromView: view,
        close: typeof spec.close === 'function' ? spec.close : null
      });
      pushHistory();
      return true;
    }

    function closeEntry(entry) {
      if (!entry || typeof entry.close !== 'function') return false;
      try { return entry.close() !== false; }
      catch (_) { return false; }
    }

    /**
     * Satu popstate = satu entri = satu tindakan. Nilai kembaliannya adalah tindakan yang
     * diambil, supaya pengujian menilai perilaku, bukan efek samping.
     */
    function handlePop() {
      var at = now();
      // popstate ini adalah gema dari history.go() yang kita panggil sendiri di dismiss():
      // layarnya sudah ditutup, jadi tidak ada yang tersisa untuk dikerjakan.
      if (consumeSkip(at)) return { action: 'skipped', depth: stack.length };
      // Gerbang wajib diperiksa SEBELUM tumpukan kosong. m025-114: urutan lama memeriksa
      // tumpukan lebih dulu, jadi gerbang yang menyala di layar pertama - kunci target
      // harian, gerbang akun, undangan notifikasi - bisa ditembus oleh satu tekanan kembali
      // hanya karena belum ada navigasi apa pun yang terekam. Entrinya didorong ulang supaya
      // kedalaman riwayat tetap sama dan tekanan berikutnya tetap tertahan di sini.
      if (locked()) {
        pushHistory();
        return { action: 'blocked', depth: stack.length };
      }
      // Tumpukan kosong berarti murid memang sedang meninggalkan aplikasi. Menahan mereka
      // di sini akan mengurung mereka di dalam PWA tanpa jalan keluar.
      if (!stack.length) return { action: 'exit', depth: 0 };

      var entry = stack.pop();
      var view = currentView();

      // Lapisan teratas ditutup lebih dulu, dan hanya kalau layarnya memang masih layar yang
      // sama - lapisan yang view-nya sudah ditinggalkan lewat jalan lain bukan lagi lapisan.
      if (entry.kind === 'layer' && entry.view === view && closeEntry(entry)) {
        chained = 0;
        return { action: 'close', id: entry.id, depth: stack.length };
      }

      var target = safeView(entry.fromView);
      if (target && target !== view) {
        chained = 0;
        applyView(target);
        return { action: 'view', view: target, depth: stack.length };
      }

      // Entri mati: tidak ada yang ditutup dan view-nya sudah benar. Contohnya pembaca buku
      // yang ditinggalkan lewat navigasi bawah, bukan lewat tombol kembali. Satu tekanan
      // kembali tidak boleh terbuang di situ, jadi entri berikutnya diambil juga - dengan
      // batas, dan tidak pernah sampai mengosongkan tumpukan (yang berarti keluar aplikasi).
      if (stack.length > 0 && chained < MAX_CHAIN) {
        chained++;
        var api = history();
        if (api && typeof api.back === 'function') { try { api.back(); } catch (_) {} }
        return { action: 'chained', depth: stack.length };
      }
      chained = 0;
      // m025-114: jalan buntu yang sesungguhnya - tumpukan HABIS, tidak ada lapisan yang
      // tertutup, dan view-nya sudah benar. Sampai rilis ini baris di bawah berbunyi
      // `return {action:'noop'}` begitu saja: satu tekanan kembali yang menghabiskan entri
      // riwayat dan TIDAK mengubah apa pun di layar. Dari sisi murid itu tidak terbaca
      // sebagai "tidak ada tujuan" melainkan sebagai aplikasi yang macet - gesturnya jelas
      // jalan, layarnya diam. Contoh nyatanya: modal yang ditutup lewat jalan lain
      // meninggalkan satu entri mati di dasar tumpukan.
      //
      // Batas chained di atas TIDAK ikut jatuh ke sini, dan itu disengaja: di sana masih ada
      // entri tersisa dan `chained` sudah dinolkan, jadi tekanan berikutnya melanjutkan
      // penelusuran - murid tetap maju, hanya lebih pelan. Melompat ke beranda di situ
      // berarti membuang layar yang masih bisa dicapai satu per satu.
      if (!stack.length) {
        var home = str(h.homeView) || 'home';
        if (view !== home && applyView(home)) return { action: 'fallback', view: home, depth: 0 };
      }
      return { action: 'noop', depth: stack.length };
    }

    /**
     * Lapisan ditutup oleh aplikasi sendiri (tombol "Batal", "← Rak buku", tombol Escape).
     * Layarnya sudah berubah seketika; yang tersisa hanyalah membuang entri riwayatnya,
     * supaya tekanan kembali berikutnya tidak jatuh pada layar yang sudah tidak ada.
     */
    function dismiss(id) {
      var wanted = str(id);
      for (var i = stack.length - 1; i >= 0; i--) {
        if (stack[i].kind === 'layer' && stack[i].id === wanted) {
          var removed = stack.splice(i);
          noteSkip(now());
          var api = history();
          if (api && typeof api.go === 'function') { try { api.go(-removed.length); } catch (_) {} }
          return true;
        }
      }
      return false;
    }

    /**
     * Kembali secara terprogram (dipakai gestur tepi). Sengaja TIDAK melakukan apa-apa saat
     * tumpukan kosong: memanggil history.back() di situ akan melempar murid keluar dari PWA
     * ke halaman apa pun yang kebetulan ada sebelumnya.
     */
    function back() {
      if (!stack.length) return false;
      var api = history();
      if (!api || typeof api.back !== 'function') return false;
      try { api.back(); return true; }
      catch (_) { return false; }
    }

    function depth() { return stack.length; }
    function snapshot() {
      return stack.map(function (entry) {
        return { kind: entry.kind, id: entry.id, view: entry.view, fromView: entry.fromView };
      });
    }
    function reset() { stack.length = 0; skips = 0; skipsAt = 0; chained = 0; }

    return {
      pushView: pushView,
      pushLayer: pushLayer,
      handlePop: handlePop,
      dismiss: dismiss,
      back: back,
      depth: depth,
      snapshot: snapshot,
      reset: reset
    };
  }

  // ---- gestur tepi kiri ------------------------------------------------------------

  function overflowsX(node, env) {
    var style = null;
    try {
      if (env && typeof env.getComputedStyle === 'function') style = env.getComputedStyle(node);
    } catch (_) { style = null; }
    if (!style) style = node && node.style ? node.style : null;
    if (!style) return false;
    var value = str(style.overflowX || style.overflow);
    return value === 'auto' || value === 'scroll' || value === 'overlay';
  }

  /**
   * Benar bila sentuhan dimulai di dalam sesuatu yang bisa digulung mendatar. Di dalam
   * carousel, blok kode, atau tabel lebar, tarikan mendatar sudah punya arti sendiri;
   * membajaknya menjadi "kembali" membuat isi itu mustahil digulung.
   */
  function scrollsHorizontally(node, env) {
    var el = node;
    var depth = 0;
    while (el && depth++ < MAX_ANCESTORS) {
      var width = Number(el.scrollWidth || 0);
      var box = Number(el.clientWidth || 0);
      if (width - box > SCROLL_SLOP_PX && overflowsX(el, env)) return true;
      el = el.parentElement || el.parentNode || null;
    }
    return false;
  }

  /**
   * Pengenal gestur murni: diberi titik, mengembalikan keputusan. Tidak menyentuh DOM sama
   * sekali, jadi ambangnya bisa diuji apa adanya.
   */
  function createEdgeSwipe(options) {
    var opts = options || {};
    var env = opts.env || null;
    var edgePx = Number(opts.edgePx) > 0 ? Number(opts.edgePx) : EDGE_PX;
    var distancePx = Number(opts.distancePx) > 0 ? Number(opts.distancePx) : MIN_DISTANCE_PX;
    var ratio = Number(opts.ratio) > 0 ? Number(opts.ratio) : HORIZONTAL_RATIO;
    var tracking = false;
    var fired = false;
    var startX = 0;
    var startY = 0;

    function reset() { tracking = false; fired = false; startX = 0; startY = 0; }

    function start(point) {
      reset();
      if (!point) return false;
      var x = Number(point.x);
      var y = Number(point.y);
      if (!isFinite(x) || !isFinite(y)) return false;
      if (x < 0 || x > edgePx) return false;
      if (scrollsHorizontally(point.target, env)) return false;
      tracking = true;
      startX = x;
      startY = y;
      return true;
    }

    function move(point) {
      if (!tracking || fired || !point) return false;
      var dx = Number(point.x) - startX;
      var dy = Number(point.y) - startY;
      if (!isFinite(dx) || !isFinite(dy)) { tracking = false; return false; }
      // Menarik ke kiri dari tepi kiri bukan "kembali".
      if (dx < 0) { tracking = false; return false; }
      // Sudah cukup jauh ke atas/bawah: ini gulir halaman, dan gestur diserahkan seluruhnya.
      if (Math.abs(dy) > VERTICAL_SLOP_PX && Math.abs(dy) >= Math.abs(dx)) { tracking = false; return false; }
      if (dx < distancePx) return false;
      if (dx < Math.abs(dy) * ratio) return false;
      fired = true;
      tracking = false;
      return true;
    }

    function end() { var was = fired; reset(); return was; }

    return {
      start: start,
      move: move,
      end: end,
      reset: reset,
      isTracking: function () { return tracking; },
      hasFired: function () { return fired; },
      edgePx: edgePx,
      distancePx: distancePx,
      ratio: ratio
    };
  }

  /**
   * Benar hanya di aplikasi terpasang. Di dalam tab browser, gestur kembali milik browser
   * masih ada dan menambahkan gestur kedua di atasnya hanya membuat keduanya saling
   * mengganggu.
   */
  function standalone(env) {
    var target = env || null;
    if (!target) return false;
    try { if (target.navigator && target.navigator.standalone === true) return true; } catch (_) {}
    try {
      return !!(target.matchMedia && target.matchMedia('(display-mode: standalone)').matches);
    } catch (_) { return false; }
  }

  /**
   * Apakah platform ini benar-benar TIDAK punya gestur kembali sendiri.
   *
   * m025-114. Alasan gestur tepi ini ada hanya berlaku untuk satu platform: di iOS mode
   * standalone, gestur swipe-back adalah milik chrome Safari, dan di PWA terpasang chrome
   * itu tidak ada. Android terpasang BUKAN kasus yang sama - gestur kembali sistemnya tetap
   * berjalan di dalam PWA dan sudah memanggil history.back() sendiri. Memasang gestur kedua
   * di atasnya berarti satu tarikan jari bisa menghasilkan DUA langkah mundur: murid yang
   * ingin keluar dari satu folder terlempar dua layar sekaligus, atau langsung keluar dari
   * aplikasi. Karena itu pemasangannya sekarang dipagari ke platform yang memang
   * membutuhkannya, bukan ke "terpasang" secara umum.
   */
  function needsEdgeSwipe(env) {
    if (!standalone(env)) return false;
    try { if (env && env.navigator && env.navigator.standalone === true) return true; } catch (_) {}
    var ua = '';
    try { ua = str(env && env.navigator && env.navigator.userAgent); } catch (_) {}
    if (/Android/i.test(ua)) return false;
    return true;
  }

  function pointFrom(event) {
    if (!event) return null;
    var touches = event.touches;
    if (touches && typeof touches.length === 'number') {
      // Dua jari adalah cubit atau gulir, bukan gestur kembali.
      if (touches.length !== 1) return null;
      return { x: touches[0].clientX, y: touches[0].clientY, target: event.target || null };
    }
    var changed = event.changedTouches;
    if (changed && changed.length) {
      return { x: changed[0].clientX, y: changed[0].clientY, target: event.target || null };
    }
    if (typeof event.clientX === 'number') {
      return { x: event.clientX, y: event.clientY, target: event.target || null };
    }
    return null;
  }

  function installEdgeSwipe(env, onBack, options) {
    var target = env || null;
    var doc = target && target.document;
    if (!doc || typeof doc.addEventListener !== 'function') return false;
    var gesture = createEdgeSwipe({ env: target, edgePx: options && options.edgePx });
    var usePointer = typeof target.PointerEvent === 'function';

    // Satu tarikan jari = paling banyak satu langkah mundur. Tanpa jeda ini, gestur yang
    // terbaca dua kali (touchmove beruntun, atau gestur sistem yang ikut lewat) akan
    // menghasilkan dua history.back() dan melompati satu layar penuh.
    var lastFiredAt = -Infinity;
    function fire() {
      var at = 0;
      try { at = Date.now(); } catch (_) { at = 0; }
      if (at - lastFiredAt < GESTURE_COOLDOWN_MS) return;
      lastFiredAt = at;
      try { if (typeof onBack === 'function') onBack(); } catch (_) {}
    }
    function begin(event) {
      // Tetikus tidak boleh memicu ini: menyeret dari tepi kiri adalah hal biasa di desktop.
      if (usePointer && event && str(event.pointerType) === 'mouse') { gesture.reset(); return; }
      gesture.start(pointFrom(event));
    }
    function drag(event) {
      if (gesture.move(pointFrom(event))) fire();
    }
    function finish() { gesture.end(); }

    // Semua pendengar pasif: modul ini tidak pernah membatalkan gestur pengguna, ia hanya
    // mengamatinya. Pendengar non-pasif di touchmove akan ikut menahan gulir seluruh
    // aplikasi setiap kali jari menyentuh dekat tepi kiri.
    var passive = { passive: true };
    if (usePointer) {
      doc.addEventListener('pointerdown', begin, passive);
      doc.addEventListener('pointermove', drag, passive);
      doc.addEventListener('pointerup', finish, passive);
      doc.addEventListener('pointercancel', finish, passive);
    } else {
      doc.addEventListener('touchstart', begin, passive);
      doc.addEventListener('touchmove', drag, passive);
      doc.addEventListener('touchend', finish, passive);
      doc.addEventListener('touchcancel', finish, passive);
    }
    return true;
  }

  // ---- pemasangan ------------------------------------------------------------------

  var controller = null;

  function install(env, hooks) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : null);
    if (!target || !target.document) return null;
    if (target.__fiezelBackNavInstalled) return controller;
    target.__fiezelBackNavInstalled = true;

    var config = hooks || {};
    controller = createStack({
      history: config.history || target.history || null,
      currentView: config.currentView,
      knownView: config.knownView,
      homeView: config.homeView,
      applyView: config.applyView,
      locked: config.locked,
      now: config.now
    });

    if (typeof target.addEventListener === 'function') {
      target.addEventListener('popstate', function () { controller.handlePop(); });
    }
    if (config.edgeSwipe === true || (config.edgeSwipe !== false && needsEdgeSwipe(target))) {
      installEdgeSwipe(target, function () { controller.back(); }, config);
    }
    return controller;
  }

  function forward(name) {
    return function (value) {
      if (!controller) return false;
      return controller[name](value);
    };
  }

  return {
    schema: 'fiezel-back-nav-v1',
    EDGE_PX: EDGE_PX,
    MIN_DISTANCE_PX: MIN_DISTANCE_PX,
    HORIZONTAL_RATIO: HORIZONTAL_RATIO,
    VERTICAL_SLOP_PX: VERTICAL_SLOP_PX,
    SKIP_WINDOW_MS: SKIP_WINDOW_MS,
    MAX_CHAIN: MAX_CHAIN,
    GESTURE_COOLDOWN_MS: GESTURE_COOLDOWN_MS,
    createStack: createStack,
    createEdgeSwipe: createEdgeSwipe,
    scrollsHorizontally: scrollsHorizontally,
    standalone: standalone,
    needsEdgeSwipe: needsEdgeSwipe,
    installEdgeSwipe: installEdgeSwipe,
    install: install,
    controller: function () { return controller; },
    pushView: forward('pushView'),
    pushLayer: forward('pushLayer'),
    dismiss: forward('dismiss'),
    back: function () { return controller ? controller.back() : false; },
    depth: function () { return controller ? controller.depth() : 0; }
  };
});
