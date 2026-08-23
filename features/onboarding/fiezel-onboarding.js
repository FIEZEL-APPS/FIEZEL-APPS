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

  var CAROUSEL_SLIDES = Object.freeze([
    Object.freeze({
      art: 'book-a',
      title: 'Apa aja yang bisa kamu latih?',
      body: 'Di sini kita akan latihan bareng, sedikit demi sedikit tiap hari.',
      items: Object.freeze([
        { icon: 'book-a', label: 'Kosakata (Vocabulary)' },
        { icon: 'spell-check-2', label: 'Grammar (Grammar Patterns)' }
      ])
    }),
    Object.freeze({
      art: 'audio-lines',
      title: 'Apa aja yang bisa kamu latih?',
      body: 'Suara neural, bukan robot — kedengeran kayak orang beneran ngomong.',
      items: Object.freeze([
        { icon: 'book-open', label: 'Reading (Reading Comprehension)' },
        { icon: 'headphones', label: 'Listening (Listening with Neural Voice)' }
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

  function topbar(showBack, showSkip) {
    return '<div class="fiezel-topbar">'
      + '<button type="button" class="fiezel-back"' + (showBack ? '' : ' hidden') + ' data-ob-back>'
      + '<i data-lucide="chevron-left"></i>Kembali</button>'
      + (showSkip === false ? '<span class="fiezel-skip-spacer" aria-hidden="true"></span>'
        : '<button type="button" class="fiezel-skip" data-ob-skip>Lewati</button>')
      + '</div>';
  }

  // m025-80 OWNER: "maskot hilangkan saja". Setiap langkah dulu memakai satu pose maskot;
  // sekarang memakai satu lambang ikonik di atas piringan lembut. Tiap langkah tetap punya
  // gambar yang berbeda supaya perkenalan tidak terasa berulang, dan bentuknya sejalur
  // dengan ikon Lucide yang sudah dipakai di seluruh aplikasi - satu gaya, bukan campuran.
  function art(env, icon, width) {
    var size = Number(width) || 200;
    // Dekorasi murni: judul dan isi langkah sudah membawa maknanya, jadi lambang ini
    // disembunyikan dari pembaca layar supaya tidak dibacakan dua kali.
    return '<div class="fiezel-step-art" style="--fz-art:' + size + 'px" aria-hidden="true">'
      + '<i data-lucide="' + escapeHtml(String(icon || 'sparkles')) + '"></i>'
      + '</div>';
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
    return topbar(false, false)
      // Lambangnya harus ada di lucide.min.js yang benar-benar dikirim (57 ikon, bukan set
      // penuh). Ikon yang tidak ada tidak melempar - ia hanya menggambar piringan kosong,
      // dan itu terbaca sebagai gambar yang gagal dimuat.
      + '<div class="fiezel-stage"><div class="fiezel-stage-art">' + art(env, 'user-round', 180) + '</div></div>'
      + '<div class="fiezel-sheet" data-ob-step="name">'
      + '<h2 class="fiezel-title">Halo! Aku Fiezel. Nama kamu siapa?</h2>'
      + '<p class="fiezel-body">Aku pakai namamu buat nyapa kamu tiap hari, jadi belajarnya berasa punya kamu sendiri.</p>'
      + '<label class="fiezel-field"><span>Nama panggilan</span>'
      + '<input type="text" data-ob-name value="' + escapeHtml(typed || '') + '" maxlength="' + NAME_MAX + '"'
      + ' placeholder="Tulis nama kamu" autocomplete="given-name" autocapitalize="words"'
      + ' spellcheck="false" enterkeyhint="go" aria-label="Nama panggilan kamu"></label>'
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
      return '<div class="fiezel-carousel-item"><i data-lucide="' + escapeHtml(it.icon) + '"></i>'
        + '<span>' + escapeHtml(it.label) + '</span></div>';
    }).join('');
    var isLast = slideIndex === CAROUSEL_SLIDES.length - 1;
    return topbar(false)
      + '<div class="fiezel-stage"><div class="fiezel-stage-art">' + art(env, slide.art, 200) + '</div></div>'
      + '<div class="fiezel-sheet" data-ob-step="2">'
      + '<h2 class="fiezel-title">' + escapeHtml(slide.title) + '</h2>'
      + '<p class="fiezel-body">' + escapeHtml(slide.body) + '</p>'
      + '<div class="fiezel-carousel-track">' + items + '</div>'
      + '<div class="fiezel-carousel-arrows">'
      + '<button type="button" class="fiezel-carousel-arrow" data-ob-carousel-prev' + (slideIndex === 0 ? ' disabled' : '') + '>'
      + '<i data-lucide="chevron-left"></i></button>'
      + dots(CAROUSEL_SLIDES.length, slideIndex)
      + '<button type="button" class="fiezel-carousel-arrow" data-ob-carousel-next' + (isLast ? ' disabled' : '') + '>'
      + '<i data-lucide="chevron-right"></i></button>'
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
    return topbar(false)
      + '<div class="fiezel-stage"><div class="fiezel-stage-art">' + art(env, 'sparkles', 180) + '</div></div>'
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
    return topbar(true)
      + '<div class="fiezel-stage"><div class="fiezel-stage-art">' + art(env, 'book-open-text', 200) + '</div></div>'
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
    return topbar(true)
      + '<div class="fiezel-stage"><div class="fiezel-stage-art">' + art(env, 'clock-3', 200) + '</div></div>'
      + '<div class="fiezel-sheet" data-ob-step="5">'
      + '<h2 class="fiezel-title">Kapan kamu ingin belajar?</h2>'
      + '<p class="fiezel-body">Aku ingetin kamu belajar ya, biar streak-nya nggak putus.</p>'
      + '<p class="fiezel-note">Notifikasi belajar: Aktif. Waktunya aku yang pilih otomatis dari kebiasaan belajarmu sendiri, bukan jadwal tetap yang kamu atur manual - jadi pengingatnya selalu pas dengan caramu belajar, bukan jam yang dipilih sekali lalu dilupakan.</p>'
      + btn('Lanjut', 'data-ob-advance')
      + '</div>';
  }

  // ---------------------------------------------------------------------------------------
  // Step 6: Summary & Ready
  // ---------------------------------------------------------------------------------------
  function summaryMarkup(env, learnerName, selectedGoal, selectedLevel, reduceMotion) {
    var name = normalizeName(learnerName);
    var goals = goalOptions(env);
    var goalLabel = (goals.filter(function (g) { return g.id === selectedGoal; })[0] || {}).label || 'Belum dipilih';
    var confetti = '';
    if (!reduceMotion) {
      var pieces = '';
      for (var i = 0; i < 10; i++) {
        pieces += '<i style="left:' + (8 + i * 9) + '%;animation-delay:' + (i * 0.08).toFixed(2) + 's"></i>';
      }
      confetti = '<div class="fiezel-confetti" aria-hidden="true">' + pieces + '</div>';
    }
    return topbar(true)
      + '<div class="fiezel-stage"><div class="fiezel-stage-art">' + confetti + art(env, 'trophy', 220) + '</div></div>'
      + '<div class="fiezel-sheet" data-ob-step="6">'
      + '<h2 class="fiezel-title">' + (name ? escapeHtml(name) + ', siap belajar bersama Percik!' : 'Siap belajar bersama Percik!') + '</h2>'
      + '<div class="fiezel-summary-card">'
      + (name ? '<div class="fiezel-summary-row"><b>Nama</b><span>' + escapeHtml(name) + '</span></div>' : '')
      + '<div class="fiezel-summary-row"><b>Tujuan</b><span>' + escapeHtml(goalLabel) + '</span></div>'
      + '<div class="fiezel-summary-row"><b>Perkiraan level</b><span>' + escapeHtml(selectedLevel || 'Belum dipilih') + '</span></div>'
      + '<div class="fiezel-summary-row"><b>Pengingat</b><span>Aktif</span></div>'
      + '<div class="fiezel-summary-row"><b>Streak</b><span>0 hari · mulai sekarang!</span></div>'
      + '</div>'
      + btn('Mulai Belajar', 'data-ob-primary')
      + btn('Lewati', 'data-ob-step-skip', 'ghost')
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

    function paint() {
      var html;
      if (step === 1) html = nameMarkup(target, typedName);
      else if (step === 2) html = carouselMarkup(target, slide);
      else if (step === 3) html = goalMarkup(target, selectedGoal, selectedLevel);
      else if (step === 4) html = placementMarkup(target);
      else if (step === 5) html = scheduleMarkup(target);
      else html = summaryMarkup(target, typedName, selectedGoal, selectedLevel, reduceMotion);
      host.innerHTML = html;
      try { target.lucide && target.lucide.createIcons && target.lucide.createIcons({ attrs: { 'stroke-width': 1.8, 'aria-hidden': 'true' } }); } catch (_) {}
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
     */
    function finish(via) {
      if (closed) return;
      closed = true;
      markCompleted(target, { at: now, via: via, name: typedName, goal: selectedGoal, level: selectedLevel });
      try { host.classList.add('is-leaving'); } catch (_) {}
      if (typeof target.setTimeout === 'function') target.setTimeout(remove, 260);
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
          nameInput.addEventListener('input', sync);
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
        if (skipAll) skipAll.addEventListener('click', function () { finish('skip'); });
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
        if (primary) primary.addEventListener('click', step === PLACEMENT_STEP ? startPlacementNow : advance);
        var prev = host.querySelector('[data-ob-carousel-prev]');
        if (prev && !prev.hasAttribute('disabled')) prev.addEventListener('click', back);
        var nxt = host.querySelector('[data-ob-carousel-next]');
        if (nxt && !nxt.hasAttribute('disabled')) nxt.addEventListener('click', advance);
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
              paint();
            });
          })(levelButtons[j]);
        }
      } catch (_) { /* tanpa listener, tombol lewati global tetap ada lewat markup */ }
    }

    paint();
    try { doc.body.appendChild(host); } catch (_) { return { shown: false, reason: 'append_failed' }; }

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
