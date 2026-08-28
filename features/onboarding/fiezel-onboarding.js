/**
 * FIEZEL — onboarding enam langkah (Step 1-6). Step 0 (splash) hidup terpisah di
 * `fiezel-splash.js`. Step 2-6 mengikuti Step 1-5 pada
 * `FIEZEL_Complete_Design_Specification.pdf` bagian 3; Step 1 adalah tambahan m025-117.
 *
 * m025-78: dibangun ulang dari nol mengikuti spesifikasi lengkap, menggantikan versi m025-77
 * yang mengikuti sheet PDF berbeda (IELTS/TOEFL, tes panjang sebagai satu-satunya jalan).
 * Salinan teks di sini diambil sedekat mungkin dari spesifikasi. Empat tempat TIDAK diikuti
 * persis, dan bedanya ditulis terbuka karena setiap penyimpangan dari spesifikasi harus
 * bisa dijelaskan, bukan disembunyikan di balik tampilan yang meyakinkan:
 *
 * 1. GOAL SELECTION memakai profil tujuan ASLI aplikasi (Sekolah/IT/Beasiswa/Fondasi
 *    IELTS-TOEFL dari `FiezelPersonalJourney`), bukan "Travel/Work/Fun" seperti di
 *    spesifikasi. Tiga kategori itu tidak berkaitan dengan apa pun di produk - menampilkannya
 *    berarti mengumpulkan pilihan yang tidak akan pernah dipakai. Profil asli sudah py
 *    prasyarat kemampuan yang benar-benar dipakai R2-R4.
 * 2. LEVEL REVEAL adalah SELF-REPORT, bukan hasil pengukuran. Spesifikasi memintanya tampil
 *    "after goal select" tanpa menjelaskan dari mana angkanya - produk ini tidak punya cara
 *    menaksir level sebelum ada bukti jawaban. Karena itu diberi label eksplisit "perkiraan
 *    awal", disimpan terpisah dari `state.level` (yang hanya diisi tes penempatan asli), dan
 *    boleh dilewati.
 * 3. PLACEMENT TEST mengarah ke tes 25 soal yang sungguhan ada di produk, bukan "4-5
 *    pertanyaan cepat" seperti di spesifikasi. Membangun mesin kuis terpisah yang lebih
 *    ringan adalah fitur baru sendiri, bukan pekerjaan desain ulang - jumlah soal yang
 *    sebenarnya karena itu dituliskan di kartu, sama seperti m025-77.
 * 4. SCHEDULE SETUP tidak memasang pemilih hari/jam. FIEZEL belum punya jadwal yang diatur
 *    pengguna: pengingatnya dipilih mesin ALRS dari bukti belajar. Memasang pemilih yang
 *    tidak tersambung ke apa pun hanya akan menjadi tombol palsu - alasan yang sama yang
 *    sudah dipegang sejak m025-77. Pertanyaan spesifikasi "Kapan kamu ingin belajar?"
 *    dijawab jujur: dengan cara ALRS sebenarnya bekerja.
 *
 * m028-maskot OWNER: maskot PAW yang bergerak kembali ke perkenalan, ala Duolingo - satu
 * wajah besar di kepala tiap panel dengan pose yang MENJELASKAN langkahnya (bukan pose acak),
 * menggantikan lambang statis m025-80 yang terbukti bisa lahir kosong karena menunggu
 * lucide.min.js. Peta posenya:
 *
 *   Langkah 1 nama        -> greeting   (melambai sekali, lalu tenang)
 *   Langkah 2 slide 1     -> lesson-start (jatuh ke curious; isi latihan: menengok ke pilihan)
 *   Langkah 2 slide 2     -> listening  (suara neural: headphone + not + groove)
 *   Langkah 3 tanpa tujuan-> curious ; setelah tujuan dipilih -> observing (jatuh ke thinking)
 *   Langkah 4 tes         -> encouraging (varian menunjuk ke CTA tes; kelas is-pointing)
 *   Langkah 5 pengingat   -> calm       (jatuh ke sleepy; pose paling tenang, bukan ramai)
 *   Langkah 6 ringkasan   -> celebrating lalu MENETAP proud
 *
 * Fase 6 desain-ulang PAW (spesifikasi 11-splash-onboarding.md §2.2-§2.3): maskotnya bukan
 * lagi potret per langkah melainkan PENDAMPING - ia menatap apa yang murid tatap (lookAt ke
 * elemen kunci tiap langkah), bereaksi kecil pada apa yang murid lakukan (ketikan nama,
 * ketukan tujuan, chip level - dijeda ≥1,2 dtk antar-reaksi, selalu kembali ke pose dasar
 * langkahnya), menunjuk CTA tes penempatan dengan pose encouraging, dan menanggapi "Lewati"
 * dengan calm - TIDAK PERNAH sedih, melewati adalah jalan yang sah (audit 02 §2). Di ujung,
 * penyelesaian menyerahkan tongkat: PAW menyusut ke sudut dok gelembung pembimbing (§2.3)
 * dan memancarkan event 'fiezel-onboarding-paw-handoff' supaya kelahiran gelembung bisa
 * menyambungnya - kontrak eventnya didokumentasikan di emitHandoff() di bawah.
 *
 * Maskotnya adalah komponen yang sudah ada (features/mascot, <fiezel-mascot>); berkas ini
 * tidak menggambar maskot sendiri dan tidak menambah state baru ke sistem gerak. Nama state
 * baru (lesson-start, calm, excited, pointing, welcoming, welcome-back) ditulis sebagai NIAT
 * lewat MASCOT_CHAIN: begitu rig Direction C mendaratkan statenya, niat itu otomatis dipakai;
 * sebelum itu, penggantinya adalah state yang komponen benar-benar punya hari ini.
 *
 * m025-117 OWNER: "saat masuk tanya dulu nama mereka di onboarding (WAJIB)". Step 1 sekarang
 * menanyakan nama murid, dan nama itulah satu-satunya sumber sapaan di seluruh aplikasi -
 * tidak ada lagi nama yang dipaku di kode sebagai nilai bawaan. Langkah ini adalah SATU-
 * SATUNYA langkah yang tidak punya "Lewati", dan penyimpangan dari batas nomor 1 di bawah
 * itu ditulis di sini secara terbuka, bukan disembunyikan:
 *
 *   - Yang dijaga batas nomor 1 adalah "tidak ada jalan buntu", bukan "setiap langkah bisa
 *     dilewati". Step 1 tetap punya jalan keluar dan jalan keluarnya satu ketukan: isi nama,
 *     tekan Lanjut. Tombolnya menyala begitu ada satu huruf.
 *   - Melewatinya akan memaksa aplikasi kembali punya nama cadangan yang dipaku di kode -
 *     persis keadaan yang sedang diperbaiki, dan keadaan yang membuat murid lain disapa
 *     dengan nama orang lain.
 *   - Kalau murid menutup aplikasi di sini, perkenalan TIDAK ditandai selesai, jadi
 *     pertanyaannya datang lagi - bukan mengunci aplikasi selamanya.
 *
 * Tiga batas yang dijaga, sama seperti splash dan dengan alasan yang sama:
 *
 * 1. TIDAK PERNAH MENGURUNG. Tombol "Lewati" di kanan atas ada di setiap langkah kecuali
 *    Step 1 (lihat catatan m025-117 di atas) dan mengakhiri seluruh perkenalan (bukan hanya
 *    satu langkah) - gerbang notifikasi ada di bawah lapisan ini dan notifikasi wajib di
 *    produk ini. Langkah dengan aksi berat (pilih tujuan, tes penempatan) JUGA mendapat
 *    "Lewati langkah ini" supaya menunda satu langkah tidak memaksa mengakhiri semuanya.
 * 2. SEKALI SAJA, bukan sekali sehari. Sapaan yang terus datang berubah jadi penghalang.
 * 3. TIDAK MENYENTUH KEADAAN APLIKASI SENDIRI. Modul ini hanya membaca modul murni sejenis
 *    (`env.FiezelPersonalJourney`) dan memanggil balik
 *    (`onGoal`, `onPlacement`, `onFinish`) yang diberikan pemanggil, sehingga bisa diuji
 *    tanpa aplikasi dan tidak bisa diam-diam merusak state belajar.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelOnboarding = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // AI-02 F01: naskah murid diambil dari lapisan i18n (copy-id-feat-b.js). Di browser
  // runtime-nya dimuat lebih dulu (index.html); di Node (onboarding-test me-require modul
  // ini langsung) modul memuatnya sendiri supaya markup render tetap byte-identik.
  // Sebagian titik pakai MASIH literal: berada di zona yang dibekukan gerbang emas per
  // chunk (lihat impl/handoff/W2-FEAT-B.md) dan menunggu regenerasi baseline.
  var I18N = (typeof globalThis !== 'undefined' && globalThis.FiezelI18n) || null;
  if (!I18N && typeof require === 'function') {
    try {
      I18N = require('../i18n/fiezel-i18n.js');
      require('../i18n/copy-id-feat-b.js');
    } catch (loadError) { I18N = null; }
  }
  function T(key, params) { return I18N ? I18N.t(key, params) : String(key); }

  var STORAGE_KEY = 'fiezel-onboarding-v1';

  // Kerangka CEFR standar (bagian 2 spesifikasi: "CEFR Leveling: A1 hingga B2, dan beyond").
  // Aplikasi sendiri memakai enam tingkat ini (lihat LEVELS di app.js); didaftarkan di sini
  // apa adanya karena ini standar eksternal, bukan logika produk yang bisa berubah diam-diam.
  var CEFR_LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

  // Langkah terakhir (ringkasan). Ditulis sekali supaya penjepit di goStep() dan pemeriksaan
  // "sudah di ujung" pada tombol lewati-langkah tidak bisa menyimpang satu sama lain -
  // ketidaksamaan itulah yang membuat tombol di langkah terakhir mati diam-diam.
  var LAST_STEP = 6;
  // Step 1 (m025-117): nama murid. Langkah wajib, dan satu-satunya langkah tanpa "Lewati".
  var NAME_STEP = 1;
  // Langkah tes penempatan. Tombol utamanya BUKAN "Lanjut" melainkan "Mulai tes penempatan",
  // jadi nomornya harus punya nama - angka lepas di dalam bind() adalah persis yang patah
  // ketika penomoran bergeser.
  var PLACEMENT_STEP = 4;
  // Cukup panjang untuk nama panggilan apa pun, cukup pendek untuk muat di sapaan Home
  // tanpa memotong barisnya. Nama yang lebih panjang dipotong, bukan ditolak - menolak
  // masukan yang wajar hanya membuat langkah wajib terasa seperti dinding.
  var NAME_MAX = 24;

  /**
   * Nama yang bisa dipakai aplikasi, atau string kosong bila belum ada yang bisa dipakai.
   *
   * Yang dibuang di sini bukan "karakter yang tidak disukai" melainkan hal-hal yang membuat
   * sapaan rusak: karakter kendali, kurung sudut (nama masuk ke markup lewat escapeHtml,
   * tetapi juga ke title dokumen dan notifikasi), dan spasi berlebih. Huruf beraksen, tanda
   * kutip pada nama seperti O'Neil, dan tanda hubung sengaja DIBIARKAN - itu nama orang.
   */
  function normalizeName(value) {
    var raw = String(value == null ? '' : value);
    var clean = '';
    for (var i = 0; i < raw.length; i++) {
      var code = raw.charCodeAt(i);
      var ch = raw.charAt(i);
      if (code < 32 || code === 127) { clean += ' '; continue; }
      if (ch === '<' || ch === '>') continue;
      clean += ch;
    }
    return clean.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
  }

  // Dua slide, dan JUMLAHNYA yang menentukan pose maskot per slide (lihat MASCOT_SLIDES).
  // `paw` adalah state maskot yang dimaksudkan untuk slide itu - bukan nama ikon lagi.
  var CAROUSEL_SLIDES = Object.freeze([
    Object.freeze({
      paw: 'lesson-start',
      title: T('onboarding.carousel-title'),
      body: T('onboarding.carousel-1-body'),
      items: Object.freeze([
        { icon: 'vocab', label: 'Kosakata (Vocabulary)' },
        { icon: 'grammar', label: 'Grammar (Grammar Patterns)' }
      ])
    }),
    Object.freeze({
      paw: 'listening',
      title: T('onboarding.carousel-title'),
      body: T('onboarding.carousel-2-body'),
      items: Object.freeze([
        { icon: 'reading', label: 'Reading (Reading Comprehension)' },
        { icon: 'listening', label: 'Listening (Listening with Neural Voice)' }
      ])
    })
  ]);

  function prefersReducedMotion(env) {
    try {
      return !!(env && env.matchMedia && env.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) { return false; }
  }

  function readRecord(env) {
    try {
      var store = env && env.localStorage;
      if (!store || typeof store.getItem !== 'function') return null;
      var raw = JSON.parse(String(store.getItem(STORAGE_KEY) || 'null'));
      return raw && typeof raw === 'object' ? raw : null;
    } catch (_) { return null; }
  }

  /** Nama yang tercatat pada perkenalan sebelumnya, atau '' bila belum pernah ada. */
  function storedName(env) {
    var record = readRecord(env);
    return normalizeName(record && record.name);
  }

  /** Sudah pernah selesai ATAU pernah dilewati. Keduanya berarti jangan menghadang lagi. */
  function completed(env) {
    var record = readRecord(env);
    return !!(record && record.done === true);
  }

  /**
   * m025-117: murid yang menyelesaikan perkenalan SEBELUM rilis ini tidak pernah ditanya
   * namanya. Mereka tidak boleh dipaksa mengulang seluruh perkenalan hanya untuk satu
   * pertanyaan - dan juga tidak boleh dibiarkan disapa dengan nama orang lain. Jawabannya
   * ada di show(env,{nameOnly:true}): satu langkah saja, lalu selesai.
   */
  function needsName(env) {
    return !storedName(env);
  }

  function markCompleted(env, detail) {
    try {
      var store = env && env.localStorage;
      if (!store || typeof store.setItem !== 'function') return;
      var previous = readRecord(env) || {};
      var name = normalizeName((detail && detail.name) || previous.name);
      store.setItem(STORAGE_KEY, JSON.stringify({
        done: true,
        at: Number(detail && detail.at) || 0,
        via: String((detail && detail.via) || 'finish'),
        name: name,
        goal: String((detail && detail.goal) || ''),
        level: String((detail && detail.level) || '')
      }));
    } catch (_) { /* penyimpanan penuh tidak boleh mengurung murid di onboarding */ }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /** Daftar tujuan belajar ASLI aplikasi, dibaca dari FiezelPersonalJourney bila tersedia. */
  function goalOptions(env) {
    var journey = env && env.FiezelPersonalJourney;
    if (!journey || typeof journey.buildGoalProfile !== 'function' || !Array.isArray(journey.GOAL_IDS)) return [];
    return journey.GOAL_IDS.map(function (id) {
      var profile = journey.buildGoalProfile(id);
      return { id: profile.id, label: profile.label, description: (profile.prerequisites || []).join(' · ') };
    });
  }

  function dots(count, active) {
    var out = '';
    for (var i = 0; i < count; i++) out += '<span class="fiezel-dot' + (i === active ? ' is-active' : '') + '"></span>';
    return '<div class="fiezel-dots" aria-hidden="true">' + out + '</div>';
  }

  // -------------------------------------------------------------------------------------
  // m028 (rebrand "Warm Paper, Bright Mind"): tiga hiasan kepala yang BUKAN kontrol.
  //
  // Tidak ada langkah baru, tidak ada data baru, tidak ada cabang logika baru. Yang
  // ditambahkan hanya jawaban atas tiga pertanyaan yang selalu ditanyakan murid di layar
  // perkenalan mana pun: aplikasi apa ini, saya di langkah berapa dari berapa, dan siapa
  // yang sedang bicara. Sebelum ini ketiganya tidak dijawab sama sekali.
  // -------------------------------------------------------------------------------------

  // Nama langkah untuk breadcrumb stepper. Urutannya WAJIB mengikuti step 1..LAST_STEP di
  // render() - kalau suatu hari langkah ditambah, daftar ini yang pertama harus ikut.
  var STEP_LABELS = ['Nama', 'Kenalan', 'Tujuan', 'Level', 'Pengingat', 'Selesai'];

  // Band gelap pembawa merek. Warnanya sama dengan panggung splash yang baru saja tutup,
  // jadi peralihan splash -> onboarding terbaca sebagai satu gerakan, bukan dua layar yang
  // tidak saling kenal. Wordmark diambil dari sumber tunggalnya (FiezelSplash) dengan
  // awalan id sendiri: id gradien bersifat global di dokumen, dan splash boleh masih ada di
  // DOM saat onboarding menggambar.
  function reveal(env) {
    var brand = env && env.FiezelSplash && typeof env.FiezelSplash.wordmarkMarkup === 'function'
      ? env.FiezelSplash.wordmarkMarkup('fzob')
      : '<p class="fiezel-ob-word">FIEZEL</p>';
    return '<div class="fiezel-ob-reveal">' + brand
      + '<p class="fiezel-ob-tag">Adaptive English</p></div>';
  }

  // Stepper enam segmen. Murni turunan dari nomor langkah yang sudah ada - ia tidak
  // menyimpan keadaan apa pun, jadi tidak bisa melenceng dari langkah yang sebenarnya.
  function stepper(step) {
    var current = Math.min(STEP_LABELS.length, Math.max(1, Number(step) || 1));
    var bars = '';
    for (var i = 1; i <= STEP_LABELS.length; i++) {
      bars += '<i' + (i <= current ? ' class="is-done"' : '') + '></i>';
    }
    return '<div class="fiezel-stepper">'
      + '<span class="fiezel-stepper-eyebrow">' + T('onboarding.stepper-eyebrow', { current: current, total: STEP_LABELS.length }) + '</span>'
      + '<span class="fiezel-stepper-names"><b>' + escapeHtml(STEP_LABELS[current - 1]) + '</b>'
      + (current < STEP_LABELS.length ? ' · berikutnya: ' + escapeHtml(STEP_LABELS[current]) : ' · terakhir') + '</span>'
      + '<div class="fiezel-segments" role="progressbar" aria-valuemin="1" aria-valuemax="'
      + STEP_LABELS.length + '" aria-valuenow="' + current + '" aria-label="' + T('onboarding.stepper-aria') + '">'
      + bars + '</div></div>';
  }

  // Sapaan: maskot + gelembung. Teksnya berbeda tiap langkah supaya perkenalan terasa
  // ada yang menemani, bukan formulir enam halaman. Disembunyikan dari pembaca layar
  // HANYA maskotnya (di mascot()); kalimatnya tetap dibacakan karena ia informasi.
  function greet(env, pawState, text) {
    return '<div class="fiezel-stage"><div class="fiezel-stage-art">'
      + mascot(env, pawState)
      + '<p class="fiezel-greet-bubble">' + escapeHtml(text) + '</p>'
      + '</div></div>';
  }

  function topbar(showBack, showSkip) {
    // m028: kalau tidak ada satu pun kontrol yang tampak (langkah 1: tanpa Kembali, tanpa
    // Lewati), baris ini menyusut. Sebelumnya ia tetap memakan 44px kosong tepat di bawah
    // band merek, dan celah itu terbaca sebagai kesalahan tata letak, bukan sebagai ruang.
    var bare = !showBack && showSkip === false;
    return '<div class="fiezel-topbar' + (bare ? ' is-bare' : '') + '">'
      + '<button type="button" class="fiezel-back"' + (showBack ? '' : ' hidden') + ' data-ob-back>'
      + glyph('chevron-left') + T('onboarding.btn-back') + '</button>'
      + (showSkip === false ? '<span class="fiezel-skip-spacer" aria-hidden="true"></span>'
        : '<button type="button" class="fiezel-skip" data-ob-skip>Lewati</button>')
      + '</div>';
  }

  // ---------------------------------------------------------------------------------------
  // m028-maskot: MASKOT BERGERAK di tiap langkah, menggantikan lambang statis.
  //
  // Lambang Lucide di dalam piringan (m025-80) dilepas dari perkenalan sepenuhnya, dan
  // bersama itu percobaan-ulang createIcons() yang dulu dipasang khusus untuk layar ini:
  // begitu tidak ada satu pun <i data-lucide> di dalam perkenalan, tidak ada lagi ikon yang
  // bisa lahir kosong karena pustakanya belum sampai - jadi mekanisme penantinya menjadi
  // mubazir, bukan sekadar tidak terpakai. Lucide TIDAK disentuh di layar lain: aplikasi
  // masih memuatnya dan masih memakainya di luar berkas ini.
  //
  // Gantinya adalah <fiezel-mascot> dari features/mascot - komponen yang SUDAH ada, dengan
  // API setState() dan state yang sudah dipakai gelembung pembimbing. Perkenalan tidak
  // menggambar maskot sendiri dan tidak menambah state baru; ia hanya MEMILIH state yang
  // cocok dengan pekerjaan tiap langkah.
  // ---------------------------------------------------------------------------------------

  // Ukuran bawaan (px). CSS yang menjepitnya (clamp) supaya 390px tetap rapi; angka ini
  // hanya nilai awal --fz-ob-paw, bukan ukuran final.
  var MASCOT_SIZE = 148;

  /**
   * Pose yang DIMAKSUDKAN per langkah, dan rantai penggantinya.
   *
   * Rantai ini ada karena satu alasan yang jujur: state yang diminta desain tidak selalu
   * ada di komponen. 'observing' adalah contohnya - komponen punya 'thinking' (mata
   * mengarah ke atas-samping, kening naik) yang membawa arti sama "sedang mengamati
   * pilihanmu", dan menambah state baru ke sistem gerak adalah pekerjaan komponen, bukan
   * pekerjaan perkenalan. Jadi yang diminta ditulis apa adanya, dan penggantinya dipilih
   * dari daftar state yang komponen benar-benar punya - bukan dipaksa lalu gagal diam-diam
   * (setState() menolak state tak dikenal dan maskot akan tertinggal di 'idle').
   */
  var MASCOT_CHAIN = Object.freeze({
    idle: Object.freeze(['idle']),
    greeting: Object.freeze(['greeting']),
    curious: Object.freeze(['curious']),
    listening: Object.freeze(['listening']),
    thinking: Object.freeze(['thinking']),
    observing: Object.freeze(['observing', 'thinking']),
    encouraging: Object.freeze(['encouraging']),
    sleepy: Object.freeze(['sleepy']),
    celebrating: Object.freeze(['celebrating']),
    proud: Object.freeze(['proud']),
    // Fase 6 (spesifikasi 11 §2.2 + §4.1 A6): niat dari pustaka state master ditulis apa
    // adanya, penggantinya state yang sudah dikapalkan. Rantai inilah jembatan menuju rig
    // Direction C yang sedang dikerjakan paralel - bukan menunggu rignya selesai.
    'lesson-start': Object.freeze(['lesson-start', 'curious']),   // pembuka sesi (09 §1.2 #17)
    calm: Object.freeze(['calm', 'sleepy']),                      // langkah pengingat + respons "Lewati"
    excited: Object.freeze(['excited', 'encouraging']),           // letupan saat CTA tes ditekan (§2.2 langkah 4)
    pointing: Object.freeze(['pointing', 'encouraging']),         // varian encouraging yang menunjuk (§4.1 A7)
    welcoming: Object.freeze(['welcoming', 'greeting']),          // A6 - dipakai rig baru untuk sapaan langkah 1
    'welcome-back': Object.freeze(['welcome-back', 'greeting'])   // A6 - jalur wake/pengguna kembali (§3)
  });

  // Pose per slide carousel. Panjangnya MENGIKUTI jumlah slide yang benar-benar ada (dua):
  // slide isi latihan = curious, slide suara neural = listening. Slide "adaptif" yang
  // disebut brief tidak ada di produk ini, jadi tidak ada pose yang dipaksa untuknya.
  var MASCOT_SLIDES = Object.freeze(['lesson-start', 'listening']);

  /** State yang komponen maskot benar-benar punya, atau [] bila komponennya tidak ada. */
  function mascotStates(env) {
    try {
      var reg = env && env.customElements;
      var ctor = reg && typeof reg.get === 'function' ? reg.get('fiezel-mascot') : null;
      var list = ctor && ctor.states;
      return Array.isArray(list) ? list : [];
    } catch (_) { return []; }
  }

  /**
   * Pose yang dipakai untuk `wanted`. Tanpa komponen (mis. saat diuji di Node) yang
   * dikembalikan adalah pose yang DIMAKSUDKAN - markupnya tetap jujur menyebut niatnya.
   */
  function resolveMascotState(env, wanted) {
    var chain = MASCOT_CHAIN[wanted] || [wanted];
    var known = mascotStates(env);
    if (!known.length) return chain[0];
    for (var i = 0; i < chain.length; i++) {
      if (known.indexOf(chain[i]) >= 0) return chain[i];
    }
    return 'idle';
  }

  function mascotReady(env) {
    try {
      var api = env && env.FiezelPaw;
      return !!(api && typeof api.ready === 'function' && api.ready());
    } catch (_) { return false; }
  }

  /**
   * Cadangan bila motion system-nya tidak terdaftar (cache lama, berkas belum sampai,
   * peramban tanpa custom element): ikon paw dari SATU sumber bentuk yang sama
   * (features/ui/fiezel-icons.js). Yang tidak boleh terjadi adalah kotak kosong - itu
   * persis kegagalan yang sedang diperbaiki, hanya dengan penyebab lain.
   */
  function mascotFallback(env) {
    var svg = '';
    try {
      var lib = env && env.FiezelIcons;
      if (lib && typeof lib.markup === 'function') svg = String(lib.markup('paw') || '');
    } catch (_) { svg = ''; }
    return '<span class="fiezel-ob-paw-fallback fz-i" aria-hidden="true">' + svg + '</span>';
  }

  /**
   * Maskot satu langkah. Wadahnya membawa niat DAN pose terpilih sebagai atribut data,
   * jadi keduanya bisa diperiksa dari DOM (gate QA) tanpa membaca keadaan internal
   * komponen. Kelas st-<pose> juga sudah dipasang di markup supaya pose benar sejak cat
   * pertama - termasuk saat setState() tidak pernah jalan (kurangi-gerak, tanpa JS lanjutan).
   *
   * aria-hidden: judul dan gelembung sapaan sudah membawa seluruh maknanya. Maskot yang
   * ikut dibacakan hanya menggandakan kalimat yang sama.
   */
  function mascot(env, wanted, size) {
    var intent = String(wanted || 'idle');
    var state = resolveMascotState(env, intent);
    var px = Number(size) || MASCOT_SIZE;
    var body = mascotReady(env)
      ? '<fiezel-mascot class="fiezel-ob-paw st-' + state + '" data-ob-mascot-el aria-hidden="true"></fiezel-mascot>'
      : mascotFallback(env);
    return '<div class="fiezel-ob-mascot" data-ob-mascot'
      + ' data-ob-mascot-intent="' + escapeHtml(intent) + '"'
      + ' data-ob-mascot-state="' + escapeHtml(state) + '"'
      + ' style="--fz-ob-paw:' + px + 'px" aria-hidden="true">' + body + '</div>';
  }

  /**
   * Lambang kecil di dalam kartu perkenalan, digambar INLINE.
   *
   * Sebelumnya empat lambang ini adalah <i data-lucide> dan bergantung pada pustaka yang
   * dimuat `defer`, sementara perkenalan dicat dari jalur boot yang lebih dulu jalan -
   * itulah sebabnya mereka bisa lahir kosong. SVG inline tidak punya perlombaan itu sama
   * sekali. Bentuknya tetap satu keluarga: kanvas 24x24, garis currentColor, ujung membulat.
   */
  var GLYPHS = Object.freeze({
    'chevron-left': '<path d="M15 5 8 12l7 7"/>',
    'chevron-right': '<path d="M9 5l7 7-7 7"/>',
    vocab: '<path d="M5 5.6A2.6 2.6 0 0 1 7.6 3H19v18H7.6A2.6 2.6 0 0 1 5 18.4z"/>'
      + '<path d="m9.2 14.6 2.8-6.4 2.8 6.4"/><path d="M10.2 12.6h3.6"/>',
    grammar: '<path d="m6 15.4 3 3 6.6-9.4"/><path d="M14.6 18.4h4.6"/>'
      + '<path d="M4.6 6.4h8"/>',
    reading: '<path d="M12 7.4C10.4 5.9 8.2 5.3 5 5.5v12c3.2-.2 5.4.4 7 1.9 1.6-1.5 3.8-2.1 7-1.9v-12c-3.2-.2-5.4.4-7 1.9z"/>'
      + '<path d="M12 7.4v12"/>',
    listening: '<path d="M5 14.2v-1.4a7 7 0 0 1 14 0v1.4"/>'
      + '<rect x="3.4" y="13.6" width="4.2" height="6.4" rx="2.1"/>'
      + '<rect x="16.4" y="13.6" width="4.2" height="6.4" rx="2.1"/>'
  });

  function glyph(name, className) {
    var body = GLYPHS[name];
    if (!body) return '';
    return '<svg class="fiezel-glyph' + (className ? ' ' + className : '') + '" viewBox="0 0 24 24"'
      + ' fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"'
      + ' stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  function btn(label, attr, variant) {
    return '<button type="button" class="fiezel-btn fiezel-btn-' + (variant || 'primary') + '" ' + attr + '>'
      + escapeHtml(label) + '</button>';
  }

  // ---------------------------------------------------------------------------------------
  // Step 1 (m025-117): nama murid. WAJIB.
  //
  // Satu pertanyaan, satu kolom, satu tombol. Tidak ada "Lewati" di sini - lihat catatan di
  // kepala berkas. Tombol Lanjut dinonaktifkan sampai ada nama yang benar-benar bisa dipakai
  // (normalizeName mengembalikan sesuatu), sehingga spasi saja tidak lolos.
  // ---------------------------------------------------------------------------------------
  function nameMarkup(env, typed) {
    var clean = normalizeName(typed);
    return reveal(env)
      + topbar(false, false)
      + stepper(1)
      // Langkah nama = sapaan. Maskot melambaikan tangan sekali (greeting), lalu diam di
      // pose itu - bukan melambai terus-terusan di atas kolom yang sedang diisi.
      + greet(env, 'greeting', 'Senang ketemu kamu! Kita mulai dari yang paling gampang.')
      + '<div class="fiezel-sheet" data-ob-step="name">'
      + '<h2 class="fiezel-title">Halo! Aku Fiezel. Nama kamu siapa?</h2>'
      + '<p class="fiezel-body">Aku pakai namamu buat nyapa kamu tiap hari, jadi belajarnya berasa punya kamu sendiri.</p>'
      + '<label class="fiezel-field"><span>' + T('onboarding.name-field-label') + '</span>'
      + '<input type="text" data-ob-name value="' + escapeHtml(typed || '') + '" maxlength="' + NAME_MAX + '"'
      + ' placeholder="' + T('onboarding.name-placeholder') + '" autocomplete="given-name" autocapitalize="words"'
      + ' spellcheck="false" enterkeyhint="go" aria-label="' + T('onboarding.name-aria') + '"></label>'
      // Janji privasi harus benar apa adanya. Nama ini memang tinggal di perangkat, TETAPI
      // ia ikut ke Core Brain di akun FIEZEL murid sendiri supaya pengingat push bisa
      // menyapa namanya. Menuliskan "nggak dikirim ke mana-mana" akan menjadi janji yang
      // dilanggar oleh kode di app.js (remoteActivitySnapshot).
      + '<p class="fiezel-note">Nama ini disimpan di HP kamu, dan cuma ikut ke akun FIEZEL kamu sendiri supaya pengingat belajar bisa nyapa kamu. Nggak dibagi ke siapa pun.</p>'
      + btn('Lanjut', 'data-ob-advance' + (clean ? '' : ' disabled'))
      + '</div>';
  }

  // ---------------------------------------------------------------------------------------
  // Step 2: Feature Carousel
  // ---------------------------------------------------------------------------------------
  function carouselMarkup(env, slideIndex) {
    var slide = CAROUSEL_SLIDES[slideIndex];
    var items = slide.items.map(function (it) {
      return '<div class="fiezel-carousel-item">' + glyph(it.icon)
        + '<span>' + escapeHtml(it.label) + '</span></div>';
    }).join('');
    var isLast = slideIndex === CAROUSEL_SLIDES.length - 1;
    return reveal(env)
      + topbar(false)
      + stepper(2)
      // Pose mengikuti ISI slide: slide latihan = curious, slide suara neural = listening.
      // Sumbernya slide itu sendiri, jadi tidak bisa menyimpang dari apa yang tertulis.
      + greet(env, MASCOT_SLIDES[slideIndex] || slide.paw || 'curious',
        'Ini isi aplikasinya. Sebentar saja, dua layar.')
      + '<div class="fiezel-sheet" data-ob-step="2">'
      + '<h2 class="fiezel-title">' + escapeHtml(slide.title) + '</h2>'
      + '<p class="fiezel-body">' + escapeHtml(slide.body) + '</p>'
      + '<div class="fiezel-carousel-track">' + items + '</div>'
      + '<div class="fiezel-carousel-arrows">'
      + '<button type="button" class="fiezel-carousel-arrow" data-ob-carousel-prev' + (slideIndex === 0 ? ' disabled' : '') + '>'
      + glyph('chevron-left') + '</button>'
      + dots(CAROUSEL_SLIDES.length, slideIndex)
      + '<button type="button" class="fiezel-carousel-arrow" data-ob-carousel-next' + (isLast ? ' disabled' : '') + '>'
      + glyph('chevron-right') + '</button>'
      + '</div>'
      + btn('Lanjut', 'data-ob-advance')
      + '</div>';
  }

  // ---------------------------------------------------------------------------------------
  // Step 3: Goal Selection + CEFR self-report
  // ---------------------------------------------------------------------------------------
  function goalMarkup(env, selectedGoal, selectedLevel) {
    var goals = goalOptions(env);
    var cards = goals.map(function (g) {
      var selected = g.id === selectedGoal;
      return '<button type="button" class="fiezel-goal-card' + (selected ? ' is-selected' : '') + '" data-ob-goal="' + escapeHtml(g.id) + '">'
        + '<b>' + escapeHtml(g.label) + '</b><span>' + escapeHtml(g.description) + '</span></button>';
    }).join('');
    var levelRow = selectedGoal ? '<div class="fiezel-level-row">' + CEFR_LEVELS.map(function (lv) {
      var selected = lv === selectedLevel;
      return '<button type="button" class="fiezel-level-chip' + (selected ? ' is-selected' : '') + '" data-ob-level="' + lv + '">' + lv + '</button>';
    }).join('') + '</div>' : '';
    return reveal(env)
      + topbar(false)
      + stepper(3)
      // Selama tujuan belum dipilih maskot MENGAMATI pilihan (curious). Begitu tujuan
      // terpilih dan enam chip level muncul, pekerjaannya berubah: ia menimbang jawaban
      // murid, bukan lagi menawarkan pilihan - karena itu posenya juga berubah.
      + greet(env, selectedGoal ? 'observing' : 'curious',
        'Tujuanmu yang menentukan materi mana yang kamu dapat dulu.')
      + '<div class="fiezel-sheet" data-ob-step="3">'
      + '<h2 class="fiezel-title">Apa tujuan kamu belajar?</h2>'
      + '<div class="fiezel-goal-grid">' + cards + '</div>'
      + (selectedGoal ? '<p class="fiezel-note">Berapa perkiraan level bahasa Inggrismu sekarang?</p>' + levelRow
        + '<p class="fiezel-note">Ini cuma perkiraan awal darimu sendiri, akan disesuaikan otomatis setelah kamu mengerjakan latihan - bukan hasil tes.</p>' : '')
      + btn('Lanjut', 'data-ob-advance' + (selectedGoal ? '' : ' disabled'))
      + btn('Lewati langkah ini', 'data-ob-step-skip', 'ghost')
      + '</div>';
  }

  // ---------------------------------------------------------------------------------------
  // Step 4: Placement (mengarah ke tes 25 soal yang sungguhan, bukan versi 4-5 soal palsu)
  // ---------------------------------------------------------------------------------------
  function placementMarkup(env) {
    return reveal(env)
      + topbar(true)
      + stepper(4)
      + greet(env, 'encouraging', 'Santai, ini bukan ujian. Bisa kamu hentikan kapan saja.')
      + '<div class="fiezel-sheet" data-ob-step="4">'
      + '<h2 class="fiezel-title">Apa level bahasa kamu?</h2>'
      + '<p class="fiezel-body">Kerjakan santai aja, ini bukan ujian — cuma buat aku kenal kemampuanmu.</p>'
      + '<p class="fiezel-note">Isinya 25 soal listening, grammar, dan vocabulary - tanpa teks bacaan - dan bisa kamu hentikan kapan saja. Hasilnya menjadi levelmu yang sesungguhnya di FIEZEL, menggantikan perkiraan awal tadi.</p>'
      + btn('Mulai tes penempatan', 'data-ob-primary')
      + btn('Lewati langkah ini', 'data-ob-step-skip', 'ghost')
      + '</div>';
  }

  // ---------------------------------------------------------------------------------------
  // Step 5: Schedule & Reminders (jujur soal cara ALRS bekerja, bukan pemilih jam palsu)
  // ---------------------------------------------------------------------------------------
  function scheduleMarkup(env) {
    return reveal(env)
      + topbar(true)
      + stepper(5)
      // Langkah pengingat bicara soal waktu istirahat dan kembali lagi; posenya calm - "at
      // ease", bukan bosan (spesifikasi 11 §2.2 langkah 5). Sebelum rig Direction C mendarat,
      // rantainya jatuh ke sleepy: state paling tenang yang komponen punya hari ini.
      + greet(env, 'calm', T('onboarding.greet-schedule'))
      + '<div class="fiezel-sheet" data-ob-step="5">'
      + '<h2 class="fiezel-title">' + T('onboarding.schedule-title') + '</h2>'
      + '<p class="fiezel-body">' + T('onboarding.schedule-body') + '</p>'
      + '<p class="fiezel-note">' + T('onboarding.schedule-note') + '</p>'
      + btn('Lanjut', 'data-ob-advance')
      + '</div>';
  }

  // ---------------------------------------------------------------------------------------
  // Step 6: Summary & Ready
  // ---------------------------------------------------------------------------------------
  function summaryMarkup(env, learnerName, selectedGoal, selectedLevel, reduceMotion) {
    var name = normalizeName(learnerName);
    var goals = goalOptions(env);
    var goalLabel = (goals.filter(function (g) { return g.id === selectedGoal; })[0] || {}).label || T('onboarding.not-set');
    var confetti = '';
    if (!reduceMotion) {
      var pieces = '';
      for (var i = 0; i < 10; i++) {
        pieces += '<i style="left:' + (8 + i * 9) + '%;animation-delay:' + (i * 0.08).toFixed(2) + 's"></i>';
      }
      confetti = '<div class="fiezel-confetti" aria-hidden="true">' + pieces + '</div>';
    }
    return reveal(env)
      + topbar(true)
      + stepper(6)
      // Ringkasan: satu lompatan celebrating, lalu maskot MENETAP di pose proud (dipindah
      // oleh applyMascot() setelah lompatannya selesai). Dengan kurangi-gerak ia langsung
      // duduk di proud - pose yang sama, tanpa lompatan dan tanpa confetti.
      + '<div class="fiezel-stage"><div class="fiezel-stage-art">' + confetti
      + mascot(env, reduceMotion ? 'proud' : 'celebrating')
      + '<p class="fiezel-greet-bubble">' + T('onboarding.summary-bubble') + '</p>'
      + '</div></div>'
      + '<div class="fiezel-sheet" data-ob-step="6">'
      + '<h2 class="fiezel-title">' + (name ? T('onboarding.summary-ready-named', { name: escapeHtml(name) }) : T('onboarding.summary-ready')) + '</h2>'
      + '<div class="fiezel-summary-card">'
      + (name ? '<div class="fiezel-summary-row"><b>' + T('onboarding.summary-name-label') + '</b><span>' + escapeHtml(name) + '</span></div>' : '')
      + '<div class="fiezel-summary-row"><b>' + T('onboarding.summary-goal-label') + '</b><span>' + escapeHtml(goalLabel) + '</span></div>'
      + '<div class="fiezel-summary-row"><b>' + T('onboarding.summary-level-label') + '</b><span>' + escapeHtml(selectedLevel || T('onboarding.not-set')) + '</span></div>'
      + '<div class="fiezel-summary-row"><b>' + T('onboarding.summary-reminder-label') + '</b><span>' + T('onboarding.reminder-on') + '</span></div>'
      + '<div class="fiezel-summary-row"><b>Streak</b><span>' + T('onboarding.summary-streak-zero') + '</span></div>'
      + '</div>'
      + btn(T('onboarding.btn-start'), 'data-ob-primary')
      + btn(T('onboarding.btn-skip'), 'data-ob-step-skip', 'ghost')
      + '</div>';
  }

  /**
   * Menampilkan onboarding. Mengembalikan `{shown, reason}` supaya pemanggil dan gate tahu
   * apa yang terjadi, bukan menebaknya dari efek samping.
   *
   * @param {object} env global tempat DOM, modul maskot, dan modul perjalanan belajar berada
   * @param {{now?:number, force?:boolean, nameOnly?:boolean, onName?:Function, onGoal?:Function, onPlacement?:Function, onFinish?:Function}} options
   */
  function show(env, options) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var opts = options || {};
    var now = Number(opts.now) || 0;
    var doc = target.document;
    if (!doc || typeof doc.createElement !== 'function') return { shown: false, reason: 'no_document' };
    // m025-80: syarat FiezelMascot dilepas bersama maskotnya sendiri.
    // nameOnly: satu langkah saja, untuk murid yang sudah menyelesaikan perkenalan sebelum
    // pertanyaan nama ada. Ia tidak pernah ditahan oleh completed().
    var nameOnly = opts.nameOnly === true;
    if (!nameOnly && opts.force !== true && completed(target)) return { shown: false, reason: 'completed' };
    if (nameOnly && !needsName(target)) return { shown: false, reason: 'named' };

    var host = doc.createElement('div');
    host.className = 'fiezel-ob';
    var reduceMotion = prefersReducedMotion(target);
    if (reduceMotion) host.className += ' fiezel-ob-still';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', 'Perkenalan FIEZEL');

    var step = 1;
    var slide = 0;
    var typedName = storedName(target);
    var selectedGoal = '';
    var selectedLevel = '';
    var closed = false;

    /* ---------------------------------------------------------------------------------
     * MASKOT: satu wajah per langkah, state-nya ditentukan langkahnya sendiri.
     *
     * Percobaan-ulang createIcons() yang dulu ada di sini DIHAPUS bersama seluruh
     * <i data-lucide> di perkenalan: tidak ada lagi lambang yang menunggu pustaka, jadi
     * tidak ada lagi yang bisa lahir kosong. Lucide tetap dimuat aplikasi dan tetap
     * dipakai layar lain - yang dilepas hanya ketergantungan berkas ini padanya.
     *
     * Yang dijaga di sini: (1) niat state tinggal di DOM sebagai atribut, jadi bisa
     * diperiksa dari luar; (2) pergantian langkah = SATU morph state + satu entrance
     * 240ms, bukan rentetan reaksi; (3) kurangi-gerak berarti pose yang sama tanpa gerak
     * sama sekali - termasuk tanpa entrance dan tanpa lompatan celebrating.
     * --------------------------------------------------------------------------------- */
    var settleT = null;
    var entranceT = null;
    /* [ADAPTASI] OA-7 §4: dua bunyi karakter perkenalan, masing-masing SEKALI se-mount —
       applyMascot berjalan tiap paint() langkah, dan langkah bukanlah entrance. */
    var pawAppearSoundDone = false;
    var pawCelebrateSoundDone = false;
    function pawSound(name) {
      try {
        if (target.FiezelUiSfx && typeof target.FiezelUiSfx.play === 'function') {
          target.FiezelUiSfx.play(name, target);
        }
      } catch (_) { }
    }
    // Fase 6 - perkakas pendamping (spesifikasi 11 §2.1-§2.2):
    var microT = null;        // pengembali reaksi-mikro ke pose dasar langkah
    var pointT = null;        // pelepas kelas is-pointing (tunjukan lengan langkah 4)
    var slideGazeT = null;    // tatapan "memimpin lalu mengikuti" saat slide carousel berganti
    var lastMicroAt = 0;      // jeda antar reaksi-mikro; tugasnya menaikkan ambang spesifikasi 600ms -> 1200ms
    var MICRO_GAP_MS = 1200;
    var nameReacted = false;  // reaksi ketikan nama: sekali per sesi fokus, bukan per huruf
    var ackGoal = '';         // tujuan yang sudah diangguki, supaya cat ulang tidak mengangguk lagi
    var pendingChip = '';     // 'select' | 'deselect' - dicatat handler chip, dikonsumsi companion()
    var pendingSlideDir = 0;  // -1 mundur / +1 maju - arah tatapan pemimpin saat slide berganti

    function clearMascotTimers() {
      try {
        if (typeof target.clearTimeout === 'function') {
          if (settleT != null) target.clearTimeout(settleT);
          if (entranceT != null) target.clearTimeout(entranceT);
          if (microT != null) target.clearTimeout(microT);
          if (pointT != null) target.clearTimeout(pointT);
          if (slideGazeT != null) target.clearTimeout(slideGazeT);
        }
      } catch (_) {}
      settleT = null; entranceT = null; microT = null; pointT = null; slideGazeT = null;
    }

    function mascotBox() {
      try { return host.querySelector('[data-ob-mascot]'); } catch (_) { return null; }
    }

    /**
     * Memasang satu pose. Elemen maskot dipanggil LANGSUNG (bukan lewat corong global
     * FiezelPaw) dengan sengaja: corong itu mengenai SEMUA maskot yang hidup di halaman,
     * termasuk wajah di gelembung pembimbing yang sedang berada di belakang lapisan ini.
     * Pose langkah perkenalan tidak boleh menyeret wajah lain ikut berubah.
     */
    function pose(wanted) {
      var box = mascotBox();
      var resolved = resolveMascotState(target, wanted);
      if (box) {
        try {
          box.setAttribute('data-ob-mascot-state', resolved);
          var el = box.querySelector('[data-ob-mascot-el]');
          // hold 0 = tahan sampai langkah berikutnya menggantinya. Tanpa itu state
          // transien (greeting/encouraging/celebrating/proud) balik sendiri ke idle di
          // tengah langkah, dan maskotnya berhenti menjelaskan langkah yang sedang dibuka.
          if (el && typeof el.setState === 'function') el.setState(resolved, { hold: 0 });
        } catch (_) {}
      }
      return resolved;
    }

    function mascotEl() {
      var box = mascotBox();
      if (!box) return null;
      try { return box.querySelector('[data-ob-mascot-el]'); } catch (_) { return null; }
    }

    /**
     * Menatap elemen kunci langkah yang sedang dibuka. Pendamping memperhatikan apa yang
     * murid perhatikan - kolom nama, kartu tujuan, tombol tes - bukan menatap kamera terus.
     * Komponen maskot sendiri yang membatasi geser pupilnya (±7px) dan mengembalikannya ke
     * tengah 2,2 dtk kemudian, jadi tatapan ini melirik lalu rileks, bukan melotot.
     */
    function gazeAt(selector) {
      if (reduceMotion || closed) return;
      var el = mascotEl();
      if (!el || typeof el.lookAt !== 'function') return;
      var focusEl = null;
      try { focusEl = host.querySelector(selector); } catch (_) {}
      if (!focusEl) return;
      try { el.lookAt(focusEl); } catch (_) {}
    }

    /** Tatapan ke arah datangnya slide berikutnya - memimpin gerak halaman, bukan mengekor. */
    function gazeToward(dx) {
      if (reduceMotion || closed) return;
      var el = mascotEl();
      if (!el || typeof el.lookAt !== 'function') return;
      try {
        var rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
        if (!rect || !rect.width) return;
        el.lookAt({ x: rect.left + rect.width / 2 + dx, y: rect.top + rect.height * 0.6 });
      } catch (_) {}
    }

    /**
     * Reaksi-mikro: satu pose singkat sebagai pengakuan atas apa yang murid lakukan, lalu
     * kembali ke pose dasar langkahnya. Aturannya dari spesifikasi 11 §2.1: dijeda (di sini
     * ≥1,2 dtk antar-reaksi, satu ambang bersama untuk semua sumber), dibatasi timer (tidak
     * ada reaksi yang menetap), langsung ke elemen (pose() memang tidak memakai corong
     * global), dan NOL reaksi saat kurangi-gerak - pose statis per langkah saja.
     */
    function microReact(wanted, holdMs, backTo) {
      if (reduceMotion || closed) return false;
      var box = mascotBox();
      if (!box) return false;
      var t = 0;
      try { t = Date.now(); } catch (_) {}
      if (t && lastMicroAt && t - lastMicroAt < MICRO_GAP_MS) return false;
      lastMicroAt = t;
      pose(wanted);
      try { if (microT != null && typeof target.clearTimeout === 'function') target.clearTimeout(microT); } catch (_) {}
      if (typeof target.setTimeout !== 'function') return true;
      microT = target.setTimeout(function () {
        microT = null;
        if (closed) return;
        var live = mascotBox();
        if (!live) return;
        // Kembali ke pose dasar langkah - niat yang tertulis di DOM, bukan tebakan.
        pose(backTo || live.getAttribute('data-ob-mascot-intent') || 'idle');
      }, holdMs || 700);
      return true;
    }

    /**
     * Perilaku pendamping per langkah: tatapan ke elemen kunci + reaksi yang tertunda dari
     * handler input. Dipanggil dari applyMascot() SETELAH pose dasar terpasang, hanya pada
     * jalur gerak penuh - saat kurangi-gerak seluruh fungsi ini tidak pernah dipanggil.
     */
    function companion() {
      if (reduceMotion || closed) return;
      if (step === 1) {
        // Menatap kolom nama - memperhatikan yang murid isi, bukan kamera (storyboard P9).
        gazeAt('[data-ob-name]');
      } else if (step === 2) {
        if (pendingSlideDir) {
          // Tatapan memimpin ke arah datangnya slide, lalu turun ke daftar isinya.
          gazeToward(pendingSlideDir * 72);
          pendingSlideDir = 0;
          if (typeof target.setTimeout === 'function') {
            slideGazeT = target.setTimeout(function () {
              slideGazeT = null;
              if (!closed && step === 2) gazeAt('.fiezel-carousel-item');
            }, 280);
          }
        } else {
          gazeAt('.fiezel-carousel-item');
        }
      } else if (step === 3) {
        if (selectedGoal) {
          gazeAt('.fiezel-goal-card.is-selected');
          if (selectedGoal !== ackGoal) {
            // Anggukan pengakuan sekali per tujuan - BUKAN perayaan; celebrating disimpan
            // untuk penyelesaian (spesifikasi 11 §2.2 langkah 3).
            ackGoal = selectedGoal;
            microReact('encouraging', 620);
          } else if (pendingChip) {
            microReact(pendingChip === 'select' ? 'encouraging' : 'curious', 560);
          }
        } else {
          gazeAt('.fiezel-goal-grid');
          if (pendingChip) microReact(pendingChip === 'select' ? 'encouraging' : 'curious', 560);
        }
        pendingChip = '';
      } else if (step === 4) {
        // Dorongan yang menunjuk: mata ke CTA tes, niat pose 'pointing' (hari ini luruh ke
        // encouraging - varian menunjuknya milik rig Direction C), dan kelas is-pointing
        // sebagai kail CSS/rig. Ditahan 900ms lalu kembali rehat, tatapan tetap di tombol.
        gazeAt('[data-ob-primary]');
        var box = mascotBox();
        if (box) {
          pose('pointing');
          try { box.classList.add('is-pointing'); } catch (_) {}
          if (typeof target.setTimeout === 'function') {
            pointT = target.setTimeout(function () {
              pointT = null;
              if (closed) return;
              var live = mascotBox();
              if (!live) return;
              try { live.classList.remove('is-pointing'); } catch (_) {}
              if (step === PLACEMENT_STEP) {
                pose(live.getAttribute('data-ob-mascot-intent') || 'encouraging');
                gazeAt('[data-ob-primary]');
              }
            }, 900);
          }
        }
      } else if (step === 5) {
        // Calm menatap lembut ke lembar pengaturan - hadir menemani, tidak menuntut apa-apa.
        gazeAt('[data-ob-step="5"]');
      } else {
        // Langkah 6: perayaan menatap kartu ringkasan; tatapan ke "Mulai Belajar" menyusul
        // saat proud menetap (lihat timer settle di applyMascot).
        gazeAt('.fiezel-summary-card');
      }
    }

    function applyMascot() {
      clearMascotTimers();
      var box = mascotBox();
      if (!box) return;
      var intent = box.getAttribute('data-ob-mascot-intent') || 'idle';
      pose(intent);
      if (reduceMotion) return;
      // Micro-entrance: scale settle 240ms dengan --ease-spring (dipasang di style.css).
      // [ADAPTASI] OA-7 §4 baris ENTRANCE: paw_appear menemani kelahiran PERTAMA maskot
      // perkenalan saja. Jalur kurangi-gerak sudah keluar di atas — pop tanpa animasi
      // kelahiran adalah bunyi yatim (14 §3.1 aturan 3).
      if (!pawAppearSoundDone) {
        pawAppearSoundDone = true;
        pawSound('paw_appear');
      }
      try {
        box.classList.add('is-entering');
        entranceT = target.setTimeout(function () {
          entranceT = null;
          try { box.classList.remove('is-entering'); } catch (_) {}
        }, 260);
      } catch (_) {}
      // Ringkasan: lompat sekali, lalu MENETAP bangga. Dipindah di sini, bukan lewat
      // opts.then komponen - `then` memakai hold bawaannya sendiri dan proud akan luruh
      // ke idle 2,2 detik kemudian, jadi langkah terakhir berakhir dengan wajah kosong.
      if (intent === 'celebrating') {
        // [ADAPTASI] Perintah wiring + 20 §4: penyelesaian perkenalan (lompatan langkah 6)
        // dirayakan paw_celebrate SEKALI. Catatan 14 §4: yang default-DIKECUALIKAN dari
        // perkenalan adalah slot signature Spark/paw_greet — bukan vokalisasi perayaan
        // ini. Kurangi-gerak merender proud statis dan sudah keluar lebih awal, jadi di
        // jalur itu momen ini memang tanpa bunyi.
        if (!pawCelebrateSoundDone) {
          pawCelebrateSoundDone = true;
          pawSound('paw_celebrate');
        }
        try {
          settleT = target.setTimeout(function () {
            settleT = null;
            if (closed) return;
            var live = mascotBox();
            if (!live || live.getAttribute('data-ob-mascot-intent') !== 'celebrating') return;
            live.setAttribute('data-ob-mascot-intent', 'proud');
            pose('proud');
            // Proud yang menetap mengarahkan mata ke pintu berikutnya: tombol "Mulai Belajar".
            gazeAt('[data-ob-primary]');
          }, 1900);
        } catch (_) {}
      }
      companion();
    }

    function paint() {
      var html;
      if (step === 1) html = nameMarkup(target, typedName);
      else if (step === 2) html = carouselMarkup(target, slide);
      else if (step === 3) html = goalMarkup(target, selectedGoal, selectedLevel);
      else if (step === 4) html = placementMarkup(target);
      else if (step === 5) html = scheduleMarkup(target);
      else html = summaryMarkup(target, typedName, selectedGoal, selectedLevel, reduceMotion);
      host.innerHTML = html;
      applyMascot();
      bind();
    }

    /**
     * Mengakhiri perkenalan DAN menyerahkan kendali kembali - keduanya, lewat satu jalan.
     *
     * Penyerahan kendali dulu ditulis terpisah di setiap pemanggil, dan satu pemanggil
     * melewatkannya: tombol "Lewati" di kanan atas hanya memanggil finish('skip'), tanpa
     * callback. Akibatnya bukan sekadar satu callback yang hilang - afterOnboardingExit()
     * tidak pernah berjalan, dan satu-satunya render() pada jalur boot ada di dalamnya, jadi
     * murid yang menekan "Lewati" ditinggal di cangkang aplikasi dengan #app KOSONG sampai ia
     * memuat ulang halaman sendiri.
     *
     * Karena itu pemberitahuan sekarang menjadi tanggung jawab finish() sendiri: selama setiap
     * jalan keluar lewat sini, tidak ada lagi jalan keluar yang bisa lupa memanggilnya.
     * (finish() sendiri ada di bawah, setelah dua pembantu serah terimanya.)
     */
    /**
     * Serah terima ke gelembung pembimbing (spesifikasi 11 §2.3): PAW menyusut ke sudut dok
     * gelembung - transform + opacity saja, 320ms - supaya karakternya terbaca PINDAH ke
     * pojok, bukan mati lalu lahir kembar di tempat lain. Sasarannya pusat dok gelembung:
     * right 16px + jari-jari 29, bottom 104px + jari-jari 29 (style.css .fiezel-coach-bubble;
     * safe-area-inset diabaikan sadar - gerakannya kiasan arah, bukan penjajaran piksel).
     * Mengembalikan true hanya bila animasinya benar-benar terpasang; saat kurangi-gerak
     * atau ukuran layar tidak terbaca, jalan keluarnya tetap fade is-leaving yang lama.
     */
    function beginHandoff() {
      if (reduceMotion) return false;
      var box = mascotBox();
      if (!box) return false;
      try {
        var vw = Number(target.innerWidth);
        var vh = Number(target.innerHeight);
        var rect = typeof box.getBoundingClientRect === 'function' ? box.getBoundingClientRect() : null;
        if (!vw || !vh || !rect || !rect.width) return false;
        var dx = Math.round(vw - 45 - (rect.left + rect.width / 2));
        var dy = Math.round(vh - 133 - (rect.top + rect.height / 2));
        box.style.setProperty('--fz-ob-hx', dx + 'px');
        box.style.setProperty('--fz-ob-hy', dy + 'px');
        box.classList.add('is-handoff');
        return true;
      } catch (_) { return false; }
    }

    /**
     * KONTRAK EVENT SERAH TERIMA - satu-satunya jalur koordinasi dengan pemilik gelembung
     * pembimbing (berkas gelembung TIDAK disentuh dari sini):
     *   nama    : 'fiezel-onboarding-paw-handoff'
     *   dipancar: pada document, bubbles:true, tepat saat perkenalan mulai menutup lewat
     *             "Mulai Belajar" (via 'finish' SAJA - bukan skip/placement/close/name).
     *   detail  : { via:'finish',
     *               animated  : boolean  - true bila PAW benar-benar menyusut ke sudut,
     *               reduceMotion: boolean - preferensi murid saat itu,
     *               durationMs: 320|0    - lama animasi penyusutan (0 = fade saja),
     *               bubbleDelayMs: 120 } - saran jeda kelahiran gelembung (pop) setelah
     *                                      penyusutan dimulai, sesuai §2.3.
     * Pendengarnya (kelak: fiezel-coach-bubble) memutuskan sendiri bagaimana lahir; saat
     * belum ada pendengar, event ini tidak mengubah apa pun - alurnya tetap utuh.
     */
    function emitHandoff(animated) {
      try {
        var detail = {
          via: 'finish',
          animated: animated === true,
          reduceMotion: reduceMotion,
          durationMs: animated === true ? 320 : 0,
          bubbleDelayMs: 120
        };
        var evt = null;
        if (typeof target.CustomEvent === 'function') {
          evt = new target.CustomEvent('fiezel-onboarding-paw-handoff', { bubbles: true, detail: detail });
        } else if (typeof doc.createEvent === 'function') {
          evt = doc.createEvent('CustomEvent');
          evt.initCustomEvent('fiezel-onboarding-paw-handoff', true, false, detail);
        }
        if (evt && typeof doc.dispatchEvent === 'function') doc.dispatchEvent(evt);
      } catch (_) { /* tanpa pendengar atau tanpa CustomEvent, serah terima visual tetap jalan */ }
    }

    function finish(via) {
      if (closed) return;
      closed = true;
      clearMascotTimers();
      markCompleted(target, { at: now, via: via, name: typedName, goal: selectedGoal, level: selectedLevel });
      // Serah terima hanya pada penyelesaian sungguhan; skip/placement keluar lewat fade
      // lama (§2.3: dilewati pada kurangi-gerak dan pada jalur tes penempatan).
      var handedOff = via === 'finish' ? beginHandoff() : false;
      try { host.classList.add('is-leaving'); } catch (_) {}
      if (via === 'finish') emitHandoff(handedOff);
      // Penyusutan 320ms sedikit lebih panjang dari fade 260ms - pencabutan host menunggu
      // yang paling lambat selesai, supaya PAW tidak lenyap di tengah jalan ke sudut.
      if (typeof target.setTimeout === 'function') target.setTimeout(remove, handedOff ? 360 : 260);
      else remove();
      // Tes penempatan mengambil alih seluruh layar, jadi ia punya jalur lanjutannya sendiri;
      // semua jalan keluar lain berarti "lanjutkan alur pembukaan seperti biasa".
      var handler = via === 'placement' ? opts.onPlacement : opts.onFinish;
      if (typeof handler === 'function') {
        try { handler({ name: typedName, goal: selectedGoal, level: selectedLevel, via: via }); } catch (_) {}
      }
    }
    function remove() {
      try { if (host.parentNode) host.parentNode.removeChild(host); } catch (_) {}
    }

    function goStep(next) {
      step = Math.min(LAST_STEP, Math.max(1, next));
      paint();
    }

    /** Menyerahkan nama ke aplikasi. Dipanggil sekali, saat langkah nama ditinggalkan. */
    function commitName() {
      typedName = normalizeName(typedName);
      if (!typedName || typeof opts.onName !== 'function') return;
      try { opts.onName({ name: typedName }); } catch (_) {}
    }

    function advance() {
      if (step === NAME_STEP) {
        typedName = normalizeName(typedName);
        // Tombolnya memang sudah nonaktif tanpa nama; penjagaan kedua di sini menutup jalur
        // Enter pada papan ketik, yang tidak melewati tombol sama sekali.
        if (!typedName) return;
        commitName();
        if (nameOnly) { finish('name'); return; }
        goStep(step + 1);
        return;
      }
      if (step === 2 && slide < CAROUSEL_SLIDES.length - 1) { slide += 1; paint(); return; }
      if (step === LAST_STEP) { finish('finish'); return; }
      if (step === 3 && selectedGoal && typeof opts.onGoal === 'function') {
        try { opts.onGoal({ goal: selectedGoal, level: selectedLevel }); } catch (_) {}
      }
      goStep(step + 1);
    }

    function back() {
      if (step === 2 && slide > 0) { slide -= 1; paint(); return; }
      // Langkah nama tidak punya langkah sebelumnya, dan mundur ke sana dari Step 2 tidak
      // menghapus nama yang sudah diberikan - kolomnya terisi kembali apa adanya.
      goStep(step - 1);
    }

    function startPlacementNow() {
      // Tes penempatan mengambil alih seluruh layar. Onboarding harus SELESAI dulu, bukan
      // menunggu di belakangnya - lapisan yang tertinggal di atas kuis adalah jebakan.
      finish('placement');
    }

    function bind() {
      try {
        var nameInput = host.querySelector('[data-ob-name]');
        if (nameInput) {
          // Mengecat ulang seluruh langkah pada setiap ketikan akan mencabut fokus papan
          // ketik di tengah kata. Jadi hanya keadaan TOMBOL yang disegarkan di sini.
          var sync = function () {
            typedName = String(nameInput.value == null ? '' : nameInput.value);
            var next = host.querySelector('[data-ob-advance]');
            if (!next) return;
            if (normalizeName(typedName)) next.removeAttribute('disabled');
            else next.setAttribute('disabled', 'disabled');
          };
          nameInput.addEventListener('input', function () {
            sync();
            // Kuping tegak pada huruf PERTAMA tiap sesi fokus - bukan pada tiap ketukan;
            // maskot yang bereaksi per huruf bukan pendamping, itu gangguan (§2.2 langkah 1).
            // Kembalinya ke 'idle', bukan 'greeting': murid sedang menulis, lambaiannya
            // sudah lewat dan tidak perlu diputar ulang.
            if (!nameReacted && normalizeName(typedName)) {
              nameReacted = true;
              microReact('curious', 820, 'idle');
            }
          });
          nameInput.addEventListener('focus', function () { nameReacted = false; });
          nameInput.addEventListener('change', sync);
          nameInput.addEventListener('keydown', function (event) {
            if (event && (event.key === 'Enter' || event.keyCode === 13)) {
              if (typeof event.preventDefault === 'function') event.preventDefault();
              sync();
              advance();
            }
          });
          try { if (typeof nameInput.focus === 'function') nameInput.focus(); } catch (_) {}
        }
        var backBtn = host.querySelector('[data-ob-back]');
        if (backBtn) backBtn.addEventListener('click', back);
        var skipAll = host.querySelector('[data-ob-skip]');
        if (skipAll) skipAll.addEventListener('click', function () {
          // Calm, BUKAN sedih: melewati perkenalan adalah jalan yang sah, dan wajah terakhir
          // yang murid lihat tidak boleh menghukumnya (spesifikasi 11 §2.2, audit 02 §2).
          // Wajah tenangnya menumpang fade 260ms milik is-leaving.
          pose('calm');
          finish('skip');
        });
        var stepSkip = host.querySelector('[data-ob-step-skip]');
        if (stepSkip) stepSkip.addEventListener('click', function () {
          // Di langkah terakhir tidak ada langkah berikutnya untuk dilewati: goStep(6) dijepit
          // kembali ke 5 dan hanya mengecat ulang layar yang sama, jadi tombolnya mati persis
          // di tempat ia paling terbaca sebagai jalan keluar - di sebelah "Mulai Belajar".
          if (step >= LAST_STEP) { finish('skip'); return; }
          goStep(step + 1);
        });
        // m025-117: pada langkah nama tombol ini LAHIR nonaktif lalu menyala saat murid
        // mengetik. Memasang listener hanya ketika ia sudah aktif berarti tombol yang
        // menyala kemudian tidak pernah punya listener - tombol hidup yang tidak melakukan
        // apa-apa. Listener selalu dipasang; advance() sendiri yang menolak nama kosong,
        // dan atribut disabled tetap menahan klik di peramban.
        var adv = host.querySelector('[data-ob-advance]');
        if (adv) adv.addEventListener('click', function () {
          if (adv.hasAttribute('disabled')) return;
          advance();
        });
        // PLACEMENT_STEP, bukan angka lepas: penomoran langkah bergeser saat Step 1 (nama)
        // ditambahkan, dan angka yang tertinggal di sini akan membuat tombol "Mulai tes
        // penempatan" diam-diam berubah menjadi tombol "Lanjut" biasa.
        var primary = host.querySelector('[data-ob-primary]');
        if (primary) primary.addEventListener('click', step === PLACEMENT_STEP
          ? function () {
            // Letupan semangat mengantar murid masuk ke tes (§2.2 langkah 4): excited
            // menumpang fade keluar; hari ini ia luruh ke encouraging lewat MASCOT_CHAIN.
            pose('excited');
            startPlacementNow();
          }
          : advance);
        var prev = host.querySelector('[data-ob-carousel-prev]');
        if (prev && !prev.hasAttribute('disabled')) prev.addEventListener('click', function () {
          pendingSlideDir = -1; // tatapan memimpin ke kiri sebelum turun ke isi slide
          back();
        });
        var nxt = host.querySelector('[data-ob-carousel-next]');
        if (nxt && !nxt.hasAttribute('disabled')) nxt.addEventListener('click', function () {
          pendingSlideDir = 1; // tatapan memimpin ke kanan sebelum turun ke isi slide
          advance();
        });
        var goalButtons = host.querySelectorAll('[data-ob-goal]');
        for (var i = 0; i < goalButtons.length; i++) {
          (function (button) {
            button.addEventListener('click', function () {
              selectedGoal = button.getAttribute('data-ob-goal') || '';
              paint();
            });
          })(goalButtons[i]);
        }
        var levelButtons = host.querySelectorAll('[data-ob-level]');
        for (var j = 0; j < levelButtons.length; j++) {
          (function (button) {
            button.addEventListener('click', function () {
              var value = button.getAttribute('data-ob-level') || '';
              selectedLevel = selectedLevel === value ? '' : value;
              // Reaksinya dicatat di sini, dimainkan companion() SETELAH cat ulang - anggukan
              // untuk memilih, penasaran untuk membatalkan; keduanya kecil dan dijeda.
              pendingChip = selectedLevel === value ? 'select' : 'deselect';
              paint();
            });
          })(levelButtons[j]);
        }
      } catch (_) { /* tanpa listener, tombol lewati global tetap ada lewat markup */ }
    }

    paint();
    try { doc.body.appendChild(host); } catch (_) { return { shown: false, reason: 'append_failed' }; }
    // Cat pertama terjadi SEBELUM host masuk dokumen, jadi custom element-nya belum
    // ter-upgrade dan setState() waktu itu masih ditolak (komponen menolak sebelum
    // connect). Pose dipasang lagi di sini - sekali, bukan lewat penantian berulang.
    applyMascot();

    return {
      shown: true,
      element: host,
      close: function () { finish('close'); },
      stepIndex: function () { return step; },
      slideIndex: function () { return slide; }
    };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    CEFR_LEVELS: CEFR_LEVELS,
    CAROUSEL_SLIDES: CAROUSEL_SLIDES,
    MASCOT_SLIDES: MASCOT_SLIDES,
    MASCOT_CHAIN: MASCOT_CHAIN,
    MASCOT_SIZE: MASCOT_SIZE,
    resolveMascotState: resolveMascotState,
    LAST_STEP: LAST_STEP,
    NAME_STEP: NAME_STEP,
    PLACEMENT_STEP: PLACEMENT_STEP,
    NAME_MAX: NAME_MAX,
    normalizeName: normalizeName,
    goalOptions: goalOptions,
    nameMarkup: nameMarkup,
    carouselMarkup: carouselMarkup,
    goalMarkup: goalMarkup,
    placementMarkup: placementMarkup,
    scheduleMarkup: scheduleMarkup,
    summaryMarkup: summaryMarkup,
    completed: completed,
    storedName: storedName,
    needsName: needsName,
    show: show
  };
});
