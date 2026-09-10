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
 * m025-237 - BENTUK RIWAYATNYA BERUBAH TOTAL, dan inilah inti perbaikan boot-loop.
 *
 * OWNER: "saat user masuk ke menu, atau panel, setting, sesi soal listening, audio book,
 * dan lain lain, saat melakukan swipe back, selalu melakukan force boot loop ke splash,
 * dan sering berkedip blackscreen."
 *
 * Penyebabnya ditemukan dengan menjalankan modul ini di Chromium sungguhan sambil mencatat
 * setiap pushState/go/popstate. Sampai rilis sebelumnya dismiss() - tombol "Batal" milik
 * modal, tombol "<- Rak buku" milik pembaca, leaveStage() milik sub-layar - membuang entri
 * riwayat dengan MENELUSURI riwayat mundur: history.go(-n). Penelusuran riwayat bersifat
 * ASINKRON. Setiap pushState yang berjalan SINKRON sebelum penelusuran itu sempat diproses
 * akan memotong cabang riwayat di depan penunjuk, dan penelusuran yang tertunda kemudian
 * mendarat di entri yang SAMA SEKALI BUKAN entri yang diperhitungkan tumpukan. Jejak
 * sungguhannya, dari sesi Chromium:
 *
 *     PUSH #1            (masuk Perpustakaan)
 *     PUSH #2            (masuk rak buku)
 *     GO -1              (tombol "<- Rak buku": dismiss, ASINKRON, belum diproses)
 *     PUSH #3            (langsung membuka pembaca - SINKRON, memotong cabang)
 *     popstate -> mendarat di state #1     <-- tumpukan mengira masih ada 2 entri
 *
 * Sejak baris terakhir itu tumpukan SATU LANGKAH LEBIH DALAM daripada riwayat sungguhan.
 * Tekanan kembali berikutnya mendarat di entri dokumen itu sendiri, dan tekanan sesudahnya
 * JATUH KELUAR DARI DOKUMEN: url menjadi about:blank (itulah "kedipan blackscreen"-nya),
 * PWA diluncurkan ulang, dan murid mendarat kembali di splash. Persis laporan owner. Pola
 * "tutup lalu langsung buka sesuatu yang lain" ada di mana-mana di aplikasi ini - tutup
 * modal lalu pindah view, tutup modal lalu mulai kuis, keluar satu sub-layar lalu masuk
 * sub-layar lain - jadi bug ini bisa dipicu dari hampir setiap layar.
 *
 * Karena itu modul ini TIDAK LAGI MEMAKAI RIWAYAT SEBAGAI TEMPAT PENYIMPANAN. Kedalaman
 * layar hanya hidup di tumpukan JavaScript di bawah ini, dan riwayat sungguhan dipakai
 * hanya sebagai SATU ENTRI PENANDA ("sentinel") yang selalu duduk tepat satu langkah di
 * atas entri dokumen:
 *
 *     [entri dokumen] [penanda]   <- penunjuk selalu di sini selama masih ada layar
 *
 * Navigasi maju menambah entri di tumpukan; penanda sudah ada, jadi TIDAK ada pushState
 * kedua. Tekanan kembali menjatuhkan penunjuk ke entri dokumen, modul mengerjakan tepat
 * satu tindakan, lalu MEMASANG ULANG penanda. Akibatnya:
 *
 *   - kedalaman riwayat KONSTAN, jadi tumpukan tidak punya apa pun untuk didesinkronisasi;
 *   - dismiss() sekarang murni bedah tumpukan - nol sentuhan History API, nol penelusuran
 *     asinkron, jadi balapan yang menyebabkan boot loop TIDAK BISA DIWAKILI LAGI;
 *   - selama masih ada satu layar pun di tumpukan, tekanan kembali MUSTAHIL menjatuhkan
 *     murid keluar dari dokumen.
 *
 * Empat batas yang dijaga di sini, semuanya karena produk ini sudah pernah membayarnya:
 *
 * 1. TIDAK ADA GELUNG TAK BERUJUNG. Jalur popstate memang memasang ulang penanda, tetapi ia
 *    TIDAK PERNAH menelusuri riwayat (tidak ada history.back()/go() dari dalam handler).
 *    Gelung "back memicu push memicu back" butuh KEDUANYA; mendorong saja tidak bisa
 *    memicu popstate berikutnya, jadi setiap tekanan kembali tetap tepat satu tindakan.
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

  // m025-238: 24px terlalu sempit untuk ibu jari sungguhan. Titik sentuh ibu jari di iPhone
  // gampang mendarat 26-30px dari tepi walau si murid merasa menarik "dari pinggir", dan
  // tarikan seperti itu ditolak MENTAH-MENTAH di sentuhan pertama - tidak ada apa pun di
  // layar yang menjelaskan kenapa. Zona sendiri milik iOS lebih lebar dari 24pt; 32px masih
  // jauh dari tengah konten, jadi tarikan mendatar biasa tetap tidak tertangkap.
  var EDGE_PX = 32;
  // Jarak minimum sebelum tarikan dianggap sungguh-sungguh, bukan sentuhan yang meleset.
  var MIN_DISTANCE_PX = 64;
  // dx harus sekian kali lebih besar dari dy. m025-238: 1.6 menuntut tarikan yang hampir
  // datar; ibu jari berputar pada pangkalnya, jadi tarikan "mendatar" yang sesungguhnya
  // selalu melengkung. 1.2 masih menolak gulir miring, tetapi tidak lagi menuntut penggaris.
  var HORIZONTAL_RATIO = 1.2;
  // Setelah bergerak sejauh ini secara vertikal, gestur BOLEH dianggap milik penggulung -
  // tetapi hanya kalau ia memang DIDOMINASI gerakan vertikal; lihat VERTICAL_DOMINANCE.
  var VERTICAL_SLOP_PX = 24;
  // m025-238 - INI PENYEBAB "swipe back diam lalu tiba-tiba pindah" DI iOS.
  //
  // Aturan lama menyerahkan gestur ke penggulung begitu |dy| > 24 DAN |dy| >= dx. Ibu jari
  // yang menarik dari tepi kiri bergerak pada busur: di awal tarikan ia sudah naik ~30px
  // sementara dx baru ~14px, jadi syarat itu terpenuhi PADA GERAKAN PERTAMA - dan karena
  // penyerahannya permanen (tracking=false, tidak bisa dijemput lagi), sisa tarikan sejauh
  // 200px ke kanan tidak berarti apa-apa. Dari sisi murid: gesturnya benar, layarnya diam.
  // Ia menarik lagi, diam lagi, sampai kebetulan ada satu tarikan yang cukup lurus untuk
  // lolos - lalu layar tiba-tiba pindah. Itulah "jeda sekitar 10 detik" yang dilaporkan.
  //
  // Sekarang penyerahan hanya terjadi kalau gerakannya benar-benar DIDOMINASI vertikal:
  // |dy| lebih dari 2,5x dx. Gulir halaman sungguhan (dx nyaris nol) tetap diserahkan, busur
  // ibu jari tidak.
  var VERTICAL_DOMINANCE = 2.5;
  // Selisih kurang dari ini bukan gulungan sungguhan, hanya pembulatan tata letak.
  var SCROLL_SLOP_PX = 2;
  // Batas penelusuran ke atas; pohon DOM yang dalam tidak boleh membuat satu sentuhan
  // berjalan sepanjang dokumen.
  var MAX_ANCESTORS = 24;
  // Entri mati (lapisan yang layarnya sudah ditinggalkan lewat jalan lain) dilewati dalam
  // SATU tekanan kembali, tetapi harus ada batasnya supaya satu tekanan tidak pernah bisa
  // menguras seluruh tumpukan sekaligus. m025-237: penelusuran ini sekarang gelung biasa di
  // dalam satu handler - dulu ia memanggil history.back() berulang kali, yaitu satu-satunya
  // tempat modul ini pernah menelusuri riwayat dari dalam jalur popstate.
  var MAX_CHAIN = 3;
  // Jeda antar-pemicu gestur tepi. m025-238: 450ms diturunkan ke 250ms. Perlindungan yang
  // SEBENARNYA terhadap satu tarikan yang terbaca dua kali ada di createEdgeSwipe sendiri -
  // sekali `fired`, tracking mati sampai sentuhan berikutnya, jadi satu tarikan mustahil
  // memicu dua kali. Jeda ini hanya menjaring gema peristiwa. 450ms cukup panjang untuk
  // MENELAN tarikan kedua yang disengaja murid ketika layar sebelumnya belum selesai
  // digambar - dan menelan tarikan yang disengaja persis seperti tidak berfungsi.
  var GESTURE_COOLDOWN_MS = 250;

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
   *   onExit       ()        -> void         - dipanggil saat tekanan kembali berikutnya
   *                                            benar-benar akan meninggalkan aplikasi
   */
  function createStack(hooks) {
    var h = hooks || {};
    var stack = [];
    // m025-237: benar bila kita SEDANG memegang entri penanda satu langkah di atas entri
    // dokumen. Ini satu-satunya pembukuan riwayat yang tersisa di modul ini - tidak ada
    // lagi hitungan entri, tidak ada lagi jendela penelan popstate, karena tidak ada lagi
    // penelusuran riwayat yang kita mulai sendiri untuk dicocokkan.
    var holding = false;

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
    /**
     * Memasang entri penanda bila belum terpasang. Dipanggil oleh SETIAP jalur maju dan di
     * ujung SETIAP popstate yang tidak berakhir keluar aplikasi.
     *
     * Yang penting di sini adalah kata "bila belum": kedalaman riwayat tidak boleh tumbuh
     * mengikuti kedalaman layar. Sepuluh sub-layar bersarang tetap satu entri penanda, jadi
     * riwayat tidak pernah bisa lebih dangkal maupun lebih dalam daripada yang dikira modul
     * ini - tidak ada lagi yang bisa desinkron. Ini juga menjauhkan aplikasi dari batas
     * pushState Safari (100 panggilan / 30 detik): satu sesi belajar penuh hanya mendorong
     * satu entri per tekanan kembali, bukan satu per layar.
     */
    function holdMarker() {
      if (holding) return true;
      var api = history();
      if (!api || typeof api.pushState !== 'function') return false;
      try { api.pushState({ fiezelBackNav: 1 }, ''); holding = true; return true; }
      catch (_) { return false; }
    }
    /** Dipanggil saat kita SENGAJA melepas penanda, yaitu ketika murid memang akan keluar. */
    function notifyExit() {
      if (typeof h.onExit !== 'function') return;
      try { h.onExit(); } catch (_) {}
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
      holdMarker();
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
      holdMarker();
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
     *
     * m025-237: begitu handler ini berjalan, penunjuk riwayat SUDAH turun ke entri dokumen -
     * penanda kita habis. Setiap cabang yang tidak berakhir "keluar aplikasi" karena itu
     * WAJIB memasangnya kembali di ujung; itulah yang membuat murid tidak pernah bisa
     * terjatuh keluar dari dokumen selama masih ada satu layar pun di tumpukan.
     */
    function handlePop() {
      holding = false;
      // Gerbang wajib diperiksa SEBELUM tumpukan kosong. m025-117: urutan lama memeriksa
      // tumpukan lebih dulu, jadi gerbang yang menyala di layar pertama - kunci target
      // harian, gerbang akun, undangan notifikasi - bisa ditembus oleh satu tekanan kembali
      // hanya karena belum ada navigasi apa pun yang terekam. Penandanya dipasang ulang
      // supaya tekanan berikutnya tetap tertahan di sini.
      if (locked()) {
        holdMarker();
        return { action: 'blocked', depth: stack.length };
      }
      // Tumpukan kosong berarti murid memang sedang meninggalkan aplikasi. Menahan mereka
      // di sini akan mengurung mereka di dalam PWA tanpa jalan keluar, jadi penanda TIDAK
      // dipasang ulang: penunjuk dibiarkan beristirahat di entri dokumen, dan tekanan
      // kembali berikutnya benar-benar keluar. Satu tekanan jeda itu disengaja - ia
      // mengubah "swipe tak sengaja langsung membunuh aplikasi" menjadi pola tekan-lagi
      // yang sudah dikenal murid Android, dan onExit() memberi aplikasi kesempatan
      // mengatakannya dengan kata-kata.
      if (!stack.length) { notifyExit(); return { action: 'exit', depth: 0 }; }

      var view = currentView();
      var skipped = 0;
      // Entri mati - lapisan yang layarnya sudah ditinggalkan lewat jalan lain, misalnya
      // pembaca buku yang ditutup lewat navigasi bawah - tidak boleh memakan tekanan
      // kembali. Dulu penelusurannya dilakukan dengan memanggil history.back() lagi dari
      // dalam handler ini, satu entri riwayat per entri mati. Sekarang kedalaman layar tidak
      // lagi tersimpan di riwayat, jadi penelusuran itu cukup gelung biasa: nol penelusuran
      // riwayat, nol balapan, dan tekanan kembali selesai dalam satu tindakan yang sama.
      while (stack.length) {
        var entry = stack.pop();

        // Lapisan teratas ditutup lebih dulu, dan hanya kalau layarnya memang masih layar
        // yang sama - lapisan yang view-nya sudah ditinggalkan bukan lagi lapisan.
        if (entry.kind === 'layer' && entry.view === view && closeEntry(entry)) {
          holdMarker();
          return { action: 'close', id: entry.id, depth: stack.length };
        }

        var target = safeView(entry.fromView);
        if (target && target !== view) {
          applyView(target);
          holdMarker();
          return { action: 'view', view: target, depth: stack.length };
        }

        // Batasnya tetap ada: satu tekanan kembali tidak boleh menelan tumpukan sedalam apa
        // pun sekaligus. Sisa entri matinya diteruskan ke tekanan berikutnya - murid tetap
        // maju, hanya lebih pelan, dan tidak ada layar terjangkau yang dibuang diam-diam.
        if (++skipped >= MAX_CHAIN && stack.length) {
          holdMarker();
          return { action: 'chained', depth: stack.length };
        }
      }

      // Jalan buntu yang sesungguhnya: tumpukan HABIS, tidak ada lapisan yang tertutup, dan
      // view-nya sudah benar. m025-117: dulu baris ini berbunyi `return {action:'noop'}`
      // begitu saja - satu tekanan kembali yang tidak mengubah apa pun di layar, yang dari
      // sisi murid tidak terbaca sebagai "tidak ada tujuan" melainkan sebagai aplikasi yang
      // macet. Beranda adalah jawaban yang jujur; dari beranda sendiri, diam memang benar.
      var home = str(h.homeView) || 'home';
      if (view !== home && applyView(home)) {
        holdMarker();
        return { action: 'fallback', view: home, depth: 0 };
      }
      // Penanda tetap dipasang ulang: tumpukan memang habis, tetapi tekanan INI sudah
      // terpakai untuk menjawab. Keluar aplikasi diputuskan oleh tekanan BERIKUTNYA, lewat
      // cabang 'exit' di atas, supaya jalan buntu tidak pernah langsung berubah menjadi
      // aplikasi tertutup.
      holdMarker();
      return { action: 'noop', depth: stack.length };
    }

    /**
     * W1 P1-3 (06-001): tukar lapisan TERATAS dengan lapisan lain DI TEMPAT.
     *
     * Dipakai ketika sebuah modal langsung digantikan oleh stage (mulai ujian dari modal
     * instruksinya). Pola lama — dismiss() lalu pushLayer() — memanggil history.go(-1)
     * yang ASINKRON tepat sebelum pushState yang sinkron, jadi penunjuk riwayat nyata
     * mendarat SATU entri di bawah yang dicatat tumpukan: satu tekanan kembali di tengah
     * ujian meng-unload seluruh dokumen (about:blank), hook leave stage tidak pernah
     * berjalan, dan penalti ujian bisa dilompati. Menukar entri di tempat tidak menyentuh
     * riwayat sama sekali (jumlah entri tidak berubah), jadi tidak ada balapan yang mungkin.
     * Hanya sah bila entri teratas memang lapisan; selain itu pemanggil harus memakai
     * pushLayer biasa.
     */
    function replaceTopLayer(layer) {
      var spec = layer || {};
      var id = str(spec.id);
      if (!id) return false;
      if (locked()) return false;
      var top = stack[stack.length - 1];
      if (!top || top.kind !== 'layer') return false;
      stack[stack.length - 1] = {
        kind: 'layer', id: id, view: top.view, fromView: top.fromView,
        close: typeof spec.close === 'function' ? spec.close : null
      };
      return true;
    }

    /**
     * Lapisan ditutup oleh aplikasi sendiri (tombol "Batal", "← Rak buku", tombol Escape).
     * Layarnya sudah berubah seketika; yang tersisa hanyalah membuang pembukuannya, supaya
     * tekanan kembali berikutnya tidak jatuh pada layar yang sudah tidak ada.
     *
     * m025-237 - INI FUNGSI YANG DULU MENYEBABKAN BOOT LOOP, dan sekarang ia tidak menyentuh
     * History API sama sekali. Versi lama membuang entri riwayatnya dengan history.go(-n).
     * Penelusuran riwayat bersifat asinkron, sementara pemanggilnya hampir selalu langsung
     * melakukan sesuatu yang SINKRON sesudahnya - closeModal() lalu go(), closeModal() lalu
     * enterStage(), leaveStage() lalu enterStage(). pushState yang sinkron itu memotong
     * cabang riwayat di depan penunjuk, dan penelusuran yang tertunda kemudian mendarat di
     * entri yang bukan entri yang dihitung tumpukan. Sejak saat itu tumpukan lebih dalam
     * daripada riwayat, dan tekanan kembali berikutnya jatuh keluar dari dokumen: about:blank,
     * lalu splash. Lihat jejak Chromium di kepala berkas.
     *
     * Karena kedalaman layar tidak lagi disimpan di riwayat, membuang lapisan cukup dengan
     * memotong tumpukan. Penanda tetap di tempatnya, kedalaman riwayat tidak berubah, dan
     * tidak ada satu pun operasi asinkron yang bisa dibalap.
     */
    function dismiss(id) {
      var wanted = str(id);
      for (var i = stack.length - 1; i >= 0; i--) {
        if (stack[i].kind === 'layer' && stack[i].id === wanted) {
          stack.splice(i);
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
      // m025-237: tanpa layar tersisa, penanda adalah satu-satunya hal di atas entri
      // dokumen; menelusurinya di sini berarti gestur tepi bisa menutup PWA tanpa satu pun
      // tekanan kembali yang terlihat mengerjakan sesuatu.
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
    function reset() { stack.length = 0; holding = false; }

    return {
      pushView: pushView,
      pushLayer: pushLayer,
      replaceTopLayer: replaceTopLayer,
      handlePop: handlePop,
      dismiss: dismiss,
      back: back,
      /** Memasang entri penanda bila belum ada. Dipanggil sekali saat pemasangan. */
      hold: holdMarker,
      depth: depth,
      snapshot: snapshot,
      /** Benar bila entri penanda sedang terpasang. Dipakai gerbang untuk membuktikan
       *  bahwa kedalaman riwayat tetap konstan berapa pun dalamnya layar. */
      holdsMarker: function () { return holding; },
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
      // Gulir halaman: gerakannya DIDOMINASI vertikal, bukan sekadar tidak lurus. Busur ibu
      // jari (dy 30 / dx 14) tidak lagi jatuh ke sini; gulir sungguhan (dy 100 / dx 14)
      // tetap jatuh ke sini dan gestur diserahkan seluruhnya.
      if (Math.abs(dy) > VERTICAL_SLOP_PX && Math.abs(dy) > Math.abs(dx) * VERTICAL_DOMINANCE) { tracking = false; return false; }
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
   * m025-117. Alasan gestur tepi ini ada hanya berlaku untuk satu platform: di iOS mode
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
      onExit: config.onExit
    });

    // m025-237: penanda dipasang SEKARANG, sebelum navigasi apa pun. Tanpa ini, tekanan
    // kembali pertama di beranda mendarat langsung di entri dokumen dan menutup PWA - satu
    // gestur tepi yang meleset, dan murid sudah keluar dari aplikasi.
    controller.hold();

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
    VERTICAL_DOMINANCE: VERTICAL_DOMINANCE,
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
    replaceTopLayer: forward('replaceTopLayer'),
    dismiss: forward('dismiss'),
    back: function () { return controller ? controller.back() : false; },
    depth: function () { return controller ? controller.depth() : 0; },
    holdsMarker: function () { return controller ? controller.holdsMarker() : false; }
  };
});
