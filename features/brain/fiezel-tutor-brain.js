/**
 * FIEZEL Tutor Brain v3 — lapisan mengajar, bukan lapisan merencanakan.
 *
 * OWNER: "otak core adaptive belum sempurna, belum sepenuhnya adaptive terhadap user, belum
 * bisa berinteraksi realtime, belum seperti guru atau tutor sungguhan."
 *
 * APA YANG SUDAH ADA, DAN KENAPA ITU BUKAN GURU
 * ---------------------------------------------
 * Core Brain v2 (fiezel-core-brain.js) adalah PERENCANA SESI yang baik: ia menaksir
 * kemampuan, memilih kesulitan optimal, dan menyusun porsi review. Tetapi ia memutuskan
 * SEKALI, di awal sesi, lalu diam sampai sesi berakhir. Kolam soalnya dikunci di depan.
 *
 * Guru sungguhan tidak bekerja begitu. Gelung seorang guru berjalan pada SETIAP jawaban:
 *
 *      amati jawaban -> diagnosis KENAPA -> putuskan tindakan -> sampaikan -> amati lagi
 *
 * Perbedaannya bukan kecepatan, melainkan JENIS informasi yang dipakai. v2 tahu murid salah.
 * Guru tahu murid salah KARENA APA - dan itu dua hal yang sama sekali berbeda. Murid yang
 * memilih "prepares" pada soal "Look! She ___ dinner" tidak sekadar salah: ia sedang
 * memperlakukan penanda waktu sebagai hiasan. Sampai keyakinan itu disentuh, soal berikutnya
 * dengan pola yang sama akan salah lagi, dan latihan berubah menjadi latihan gagal.
 *
 * Untungnya bahan itu SUDAH ADA di grammar-templates.json dan selama ini dibuang: setiap
 * distraktor membawa nama miskonsepsinya sendiri ("habitual-aspect overgeneralization",
 * "confusing in-progress with completed result"). Berkas ini memakainya.
 *
 * ENAM HAL YANG DITAMBAHKAN
 * -------------------------
 *   A. Diagnosis miskonsepsi   - dari pilihan yang DIAMBIL, bukan dari benar/salah
 *   B. Model waktu jawab       - menebak, mengingat, menalar, atau tersendat
 *   C. Keputusan per-jawaban   - delapan tindakan, diputuskan ulang setiap kali
 *   D. Tangga scaffolding      - bantuan paling sedikit dulu, naik hanya bila gagal lagi
 *   E. Penyusun ucapan tutor   - apa yang DIKATAKAN, spesifik pada kesalahan barusan
 *   F. Ingatan kerja sesi      - apa yang sudah dicoba, penjelasan mana yang sudah gagal
 *
 * BATAS YANG DIJAGA
 * -----------------
 * 1. MURNI. Tanpa DOM, tanpa jaringan, tanpa state global, tanpa jam. Waktu masuk sebagai
 *    argumen. Seluruh keputusan mengajar bisa diuji sebagai nilai - dan gate-nya menguji
 *    KEPUTUSANNYA, bukan keberadaan fungsinya.
 * 2. TIDAK PERNAH MEMBERI JAWABAN TERLALU CEPAT. Momen belajar satu-satunya ada di antara
 *    "aku salah" dan "oh, begitu". Menyodorkan jawaban di detik pertama menghapus momen itu.
 * 3. TIDAK PERNAH MEMUJI ORANGNYA. "Kamu pintar" membuat kesalahan berikutnya terasa seperti
 *    kehilangan identitas. Yang dipuji selalu apa yang DILAKUKAN murid.
 * 4. TIDAK PERNAH MENGULANG PENJELASAN YANG SUDAH GAGAL. Kalau satu cara tidak nyantol,
 *    mengulanginya lebih keras bukan mengajar.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelTutorBrain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-tutor-brain-v3';

  function num(v, d) { var n = Number(v); return isFinite(n) ? n : (d === undefined ? 0 : d); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, num(v, a))); }
  function str(v) { return v == null ? '' : String(v); }
  function round(v, d) { var f = Math.pow(10, d === undefined ? 2 : d); return Math.round(num(v) * f) / f; }
  // Naskah tutor dirangkai dari potongan yang sebagian sudah berakhiran titik dan sebagian
  // belum. Tanpa ini kalimatnya keluar dengan titik ganda, dan tutor yang menulis ".." terbaca
  // seperti mesin - persis kesan yang sedang dihindari berkas ini.
  function clause(v) { return str(v).trim().replace(/[.,;:\s]+$/, ''); }

  // =====================================================================================
  // A. DIAGNOSIS MISKONSEPSI
  // =====================================================================================
  /**
   * Apa yang sebenarnya terjadi pada satu jawaban.
   *
   * Yang dikembalikan BUKAN benar/salah, melainkan nama keyakinan keliru yang dipakai murid.
   * Itu bedanya penilai dengan guru: penilai mencatat skor, guru mencatat sebabnya.
   *
   * `optionMisconceptions` adalah peta {teks pilihan -> nama miskonsepsi} yang datang dari
   * bank soal. Bila soalnya tidak membawa peta itu (vocabulary, reading), diagnosis jatuh ke
   * tingkat skill - masih berguna, hanya lebih kasar, dan itu dikatakan lewat `precision`.
   */
  function diagnose(attempt) {
    var a = attempt || {};
    var correct = a.correct === true;
    var chosen = str(a.chosenOption);
    var map = a.optionMisconceptions && typeof a.optionMisconceptions === 'object' ? a.optionMisconceptions : null;
    var named = map && chosen && Object.prototype.hasOwnProperty.call(map, chosen) ? str(map[chosen]) : '';
    if (correct) {
      return {
        correct: true,
        misconception: '',
        precision: named || map ? 'item' : 'skill',
        // Benar TETAPI lambat sekali berarti konsepnya belum otomatis - itu bukan penguasaan,
        // itu perhitungan ulang setiap kali. Guru menandainya, penilai tidak.
        fragile: str(a.timing) === 'struggled',
        skill: str(a.skill)
      };
    }
    return {
      correct: false,
      misconception: named || ('unclassified:' + (str(a.skill) || 'general')),
      precision: named ? 'misconception' : (map ? 'item' : 'skill'),
      fragile: false,
      skill: str(a.skill)
    };
  }

  // =====================================================================================
  // B. MODEL WAKTU JAWAB
  // =====================================================================================
  /**
   * Menerjemahkan lama menjawab menjadi CARA menjawab, relatif terhadap kebiasaan murid
   * sendiri - bukan terhadap ambang tetap. Murid yang memang lambat membaca tidak boleh
   * selamanya terbaca "tersendat".
   *
   *   guess     - terlalu cepat untuk sempat membaca pilihannya; pada pilihan ganda empat
   *               opsi, benar di sini sering hanya keberuntungan seperempat
   *   retrieved - cepat dan lancar: konsepnya sudah otomatis
   *   reasoned  - sekitar kebiasaannya: sedang benar-benar berpikir (ini yang paling sehat)
   *   struggled - jauh lebih lama: bebannya terlalu tinggi, atau ia menebak-nebak panjang
   *
   * Kenapa baseline pakai MEDIAN, bukan rata-rata: satu jeda karena ditinggal ke dapur akan
   * menggeser rata-rata cukup jauh untuk membuat seluruh sesi berikutnya terbaca "cepat".
   */
  var GUESS_FLOOR_MS = 1800;
  function classifyTiming(ms, baselineMs) {
    var t = num(ms, 0);
    var base = num(baselineMs, 0);
    if (t <= 0) return 'unknown';
    if (t < GUESS_FLOOR_MS) return 'guess';
    if (base <= 0) return 'reasoned';
    if (t < base * 0.55) return 'retrieved';
    if (t > base * 2.2) return 'struggled';
    return 'reasoned';
  }

  function median(values) {
    var xs = (Array.isArray(values) ? values : []).map(function (v) { return num(v); })
      .filter(function (v) { return v > 0; }).sort(function (a, b) { return a - b; });
    if (!xs.length) return 0;
    var mid = Math.floor(xs.length / 2);
    return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  }

  // =====================================================================================
  // D. TANGGA SCAFFOLDING
  // =====================================================================================
  /**
   * Empat anak tangga bantuan, dari paling sedikit ke paling banyak.
   *
   * Aturannya satu: BERI BANTUAN PALING SEDIKIT YANG MASIH MUNGKIN BERHASIL, dan naik satu
   * anak tangga hanya setelah gagal lagi. Melompat langsung ke `tell` memang menyelesaikan
   * soal itu, tetapi menghapus satu-satunya momen murid benar-benar belajar - jarak antara
   * "aku salah" dan "oh, begitu".
   *
   * Sebaliknya, bertahan di `probe` untuk murid yang sudah tiga kali gagal bukan kesabaran,
   * itu membiarkan orang tenggelam.
   */
  var LADDER = Object.freeze(['probe', 'hint', 'worked', 'tell']);
  function scaffoldLevel(input) {
    var s = input || {};
    // Yang dihitung adalah KEGAGALAN SEBELUMNYA pada konsep ini di episode ini, bukan berapa
    // kali konsepnya keluar. Bedanya menentukan: satu lesson grammar berisi belasan soal
    // dengan konsep yang sama, jadi menghitung kemunculan akan membuat murid yang menjawab
    // benar lima kali lalu keliru sekali langsung disodori jawaban - kesalahan pertamanya
    // dihukum seolah kesalahan ketiga. Hitungan ini nol lagi begitu konsepnya dijawab benar.
    var priorMisses = clamp(s.priorMisses, 0, 20);
    var mastery = clamp(s.mastery, 0, 100);
    var repeated = clamp(s.misconceptionRepeats, 0, 20);
    // Murid yang penguasaannya sudah tinggi mulai dari pertanyaan menggiring; yang masih
    // rendah mulai dari petunjuk, karena pertanyaan menggiring pada orang yang belum punya
    // bahan untuk digiring hanya terasa seperti ditebak-tebak.
    //
    // Titik mulai sengaja TIDAK PERNAH melewati `hint`, betapapun rendah penguasaannya.
    // Kesalahan PERTAMA pada sebuah konsep selalu dijawab dengan dorongan, bukan dengan
    // contoh yang sudah dikerjakan - bahkan untuk murid yang penguasaannya nol. Alasannya
    // bukan kepelitan: menyodorkan langkah lengkap pada percobaan pertama membuat murid tidak
    // pernah mencoba menyusun langkahnya sendiri, dan kesempatan itu tidak datang dua kali di
    // soal yang sama. Contoh yang dikerjakan datang setelah dorongannya gagal, dan di situ ia
    // justru berguna karena murid sudah punya pertanyaan yang ingin dijawabnya.
    var start = mastery >= 65 ? 0 : 1;
    var step = start + priorMisses + (repeated >= 2 ? 1 : 0);
    return LADDER[clamp(step, 0, LADDER.length - 1)];
  }

  // =====================================================================================
  // F. INGATAN KERJA SESI
  // =====================================================================================
  /**
   * Keadaan hidup satu sesi belajar. Objek ini yang membuat tutor punya INGATAN: apa yang
   * sudah dicoba, penjelasan mana yang sudah gagal, sudah berapa lama sejak kemenangan
   * terakhir. Tanpa itu setiap jawaban dinilai seolah yang pertama, dan tutor akan mengulang
   * penjelasan yang barusan tidak nyantol.
   */
  function createSession(options) {
    var opts = options || {};
    var state = {
      schema: SCHEMA,
      startedAt: num(opts.now, 0),
      answered: 0,
      correct: 0,
      streak: 0,
      missStreak: 0,
      responseTimes: [],
      baselineMs: num(opts.baselineMs, 0),
      // Berapa kali tiap miskonsepsi muncul DALAM sesi ini. Dua kali berarti bukan kebetulan.
      misconceptions: {},
      // Konsep tempat tiap miskonsepsi muncul. Dipisah karena NAMA miskonsepsi datang dari
      // bank soal ("habitual-aspect overgeneralization") dan sama sekali tidak memuat nama
      // konsepnya - mencocokkan keduanya lewat pencarian teks akan selalu gagal diam-diam,
      // dan terobosan murid tidak akan pernah terdeteksi.
      misconceptionConcept: {},
      // Miskonsepsi yang sudah pernah muncul lalu berhasil dijawab benar - dipakai untuk
      // menamai terobosan, bukan sekadar menghitung skor.
      resolved: {},
      // Penjelasan yang sudah dipakai untuk tiap konsep, supaya tidak diulang persis sama.
      explanationsUsed: {},
      attemptsOnConcept: {},
      // Kegagalan beruntun per konsep - dipakai tangga scaffolding, dan sengaja DIPISAH dari
      // attemptsOnConcept (yang dipakai selectNext untuk menyebar materi). Satu menghitung
      // kesulitan, satu menghitung paparan; menyatukannya membuat keduanya salah.
      missesOnConcept: {},
      lastConcept: '',
      lastWinAt: num(opts.now, 0),
      interventions: 0,
      log: []
    };
    return state;
  }

  /** Mencatat satu jawaban ke dalam ingatan sesi, dan mengembalikan diagnosisnya. */
  function record(state, attempt) {
    var s = state;
    var a = attempt || {};
    var timing = classifyTiming(a.ms, s.baselineMs || median(s.responseTimes));
    var d = diagnose({
      correct: a.correct, chosenOption: a.chosenOption, optionMisconceptions: a.optionMisconceptions,
      skill: a.skill, timing: timing
    });
    d.timing = timing;
    var concept = str(a.concept || a.skill);

    s.answered++;
    if (num(a.ms) > 0) s.responseTimes.push(num(a.ms));
    if (!s.baselineMs) s.baselineMs = median(s.responseTimes);
    s.attemptsOnConcept[concept] = (s.attemptsOnConcept[concept] || 0) + 1;
    s.lastConcept = concept;

    if (d.correct) {
      s.correct++;
      s.streak++;
      s.missStreak = 0;
      s.lastWinAt = num(a.now, s.lastWinAt);
      // Terobosan: miskonsepsi yang tadi bikin gagal PADA KONSEP INI, sekarang dilewati.
      // Ini yang layak disebut namanya kepada murid - "yang tadi bikin kamu keliru, barusan
      // kamu lewati". Pencocokannya lewat peta konsep, bukan lewat teks nama miskonsepsi.
      var pending = Object.keys(s.misconceptions).filter(function (k) {
        return s.misconceptions[k] > 0 && !s.resolved[k] && s.misconceptionConcept[k] === concept;
      });
      for (var i = 0; i < pending.length; i++) s.resolved[pending[i]] = true;
      d.breakthrough = pending.length > 0;
      // Konsep yang sudah dilewati mengembalikan tangga bantuan ke awal: kalau nanti keliru
      // lagi, itu kesalahan pertama yang baru, bukan lanjutan dari episode yang sudah selesai.
      s.missesOnConcept[concept] = 0;
    } else {
      s.streak = 0;
      s.missStreak++;
      s.misconceptions[d.misconception] = (s.misconceptions[d.misconception] || 0) + 1;
      s.misconceptionConcept[d.misconception] = concept;
      s.missesOnConcept[concept] = (s.missesOnConcept[concept] || 0) + 1;
      d.breakthrough = false;
    }
    d.repeats = d.correct ? 0 : s.misconceptions[d.misconception];
    // Kegagalan SEBELUM yang ini - itulah yang menentukan seberapa tinggi bantuannya.
    d.priorMisses = d.correct ? 0 : Math.max(0, s.missesOnConcept[concept] - 1);
    d.concept = concept;
    s.log.push({ concept: concept, correct: d.correct, timing: timing, misconception: d.misconception });
    if (s.log.length > 60) s.log.shift();
    return d;
  }

  // =====================================================================================
  // C. KEPUTUSAN PER-JAWABAN
  // =====================================================================================
  /**
   * Apa yang guru lakukan SEKARANG, diputuskan ulang setiap satu jawaban.
   *
   * Urutannya adalah urutan kegentingan, dan itu disengaja: murid yang sudah lelah tidak
   * butuh soal yang lebih mudah, ia butuh berhenti. Memeriksa "mudahkan" lebih dulu akan
   * membuat sesi yang seharusnya sudah selesai berjalan sepuluh soal lagi.
   */
  var MISS_STREAK_STOP = 3;
  var FAST_CORRECT_STRETCH = 4;
  function decideMove(state, diagnosis, context) {
    var s = state || {};
    var d = diagnosis || {};
    var ctx = context || {};
    var remaining = clamp(ctx.remaining, 0, 1000);
    var fatigue = str(ctx.fatigue);

    // 1. Lelah mengalahkan segalanya. Latihan di atas kelelahan tidak menempel, dan yang
    //    tertinggal justru ingatan bahwa belajar itu melelahkan.
    if (fatigue === 'fatigued' && s.answered >= 6) {
      return { move: 'breathe', reason: 'cognitive_load_high', urgency: 'high' };
    }
    // 2. Miskonsepsi yang sama dua kali bukan kebetulan. Soal berikutnya dengan pola yang
    //    sama akan salah lagi; yang perlu disentuh keyakinannya, bukan itemnya.
    if (!d.correct && num(d.repeats) >= 2) {
      return { move: 'reteach', reason: 'persistent_misconception', urgency: 'high', misconception: d.misconception };
    }
    // 3. Tiga salah berturut-turut: berhenti menguji, mulai mengajar.
    if (num(s.missStreak) >= MISS_STREAK_STOP) {
      return { move: 'reteach', reason: 'miss_streak', urgency: 'high', misconception: d.misconception };
    }
    // 4. Satu salah: jangan langsung beri jawaban. Beri pijakan, lalu tanya lagi.
    if (!d.correct) {
      return { move: 'hint', reason: d.timing === 'guess' ? 'answered_too_fast' : 'first_miss', urgency: 'normal', misconception: d.misconception };
    }
    // 5. Benar tetapi tersendat: konsepnya belum otomatis. Jangan naikkan kesulitan; kokohkan.
    if (d.fragile) {
      return { move: 'consolidate', reason: 'correct_but_slow', urgency: 'low' };
    }
    // 6. Terobosan layak disebut namanya. Kemajuan yang tidak pernah diucapkan tidak terasa
    //    sebagai kemajuan.
    if (d.breakthrough) {
      return { move: 'celebrate', reason: 'misconception_resolved', urgency: 'normal' };
    }
    // 7. Beruntun benar dan cepat berarti soalnya sudah di bawah kemampuannya.
    if (num(s.streak) >= FAST_CORRECT_STRETCH && (d.timing === 'retrieved' || d.timing === 'guess')) {
      return { move: 'stretch', reason: 'too_easy', urgency: 'low' };
    }
    if (remaining <= 0) return { move: 'wrapup', reason: 'pool_exhausted', urgency: 'normal' };
    return { move: 'continue', reason: 'on_track', urgency: 'low' };
  }

  // =====================================================================================
  // E. PENYUSUN UCAPAN TUTOR
  // =====================================================================================
  /**
   * Apa yang tutor KATAKAN. Tiga aturan yang dipegang setiap baris di bawah ini:
   *
   *   - Memuji apa yang DILAKUKAN, tidak pernah orangnya. "Kamu pintar" membuat kesalahan
   *     berikutnya terasa seperti kehilangan identitas; "cara bacamu barusan tepat" bisa
   *     diulang besok.
   *   - Menyebut kesalahannya dengan SPESIFIK. "Belum tepat" tidak mengajarkan apa pun.
   *   - Tidak pernah menyodorkan jawaban sebelum tangga scaffolding sampai di `tell`.
   *
   * Naskahnya memakai token {name} seperti seluruh naskah FIEZEL lainnya, dan pemanggil yang
   * menggantinya - modul ini tidak pernah menyentuh state murid.
   */
  function composeTurn(input) {
    var it = input || {};
    var move = str(it.move);
    var level = str(it.scaffold) || 'hint';
    var ex = it.explanation && typeof it.explanation === 'object' ? it.explanation : {};
    var whyFails = str(it.whyFails);
    var concept = str(it.conceptLabel) || 'materi ini';
    var say = '';
    var ask = '';
    var reveal = false;

    if (move === 'hint' || move === 'reteach') {
      if (it.timing === 'guess') {
        say = 'Tadi cepat sekali jawabnya. Coba baca ulang kalimatnya pelan-pelan dulu ya - separuh soal ini dimenangkan di bacaannya, bukan di pilihannya.';
      } else if (whyFails) {
        say = 'Ini yang bikin pilihan tadi gagal - ' + clause(whyFails) + '.';
      } else {
        say = 'Belum tepat, dan itu wajar di bagian ini.';
      }
      if (level === 'probe') {
        ask = str(ex.howToAvoid) || 'Sebelum lihat pilihannya lagi - petunjuk waktu di kalimat itu yang mana?';
      } else if (level === 'hint') {
        ask = clause(ex.memoryCue) ? ('Pegangan singkatnya: ' + clause(ex.memoryCue) + '. Sekarang coba lagi.')
          : 'Petunjuknya ada di kata yang menunjukkan kapan kejadiannya. Coba lagi.';
      } else if (level === 'worked') {
        say += ' Aku kerjakan satu yang mirip dulu ya, biar kelihatan langkahnya.';
        ask = str(ex.rule) || ('Inti ' + concept + ': ikuti bentuk yang diminta konteksnya.');
      } else {
        say += ' Oke, aku buka sekarang.';
        ask = str(ex.whyCorrect) || str(ex.rule) || '';
        reveal = true;
      }
    } else if (move === 'celebrate') {
      say = 'Nah, itu dia. Yang tadi bikin kamu keliru, barusan kamu lewati - dan kamu melewatinya dengan alasan yang benar, bukan tebakan.';
    } else if (move === 'consolidate') {
      say = 'Benar. Tapi tadi kamu perlu waktu lumayan, jadi kita mantapkan dulu di sini sebentar sebelum naik.';
    } else if (move === 'stretch') {
      say = 'Beruntun dan cepat. Ini sudah di bawah kemampuanmu sekarang - aku naikkan sedikit.';
    } else if (move === 'breathe') {
      say = 'Kita berhenti di sini dulu. Jawabanmu mulai melambat dan mulai meleset bareng, dan itu tanda capek, bukan tanda kamu tidak bisa. Lanjut nanti hasilnya jauh lebih nempel.';
    } else if (move === 'wrapup') {
      say = 'Soalnya habis. Kita tutup sesi ini.';
    } else {
      say = '';
    }
    return { say: say, ask: ask, reveal: reveal, scaffold: level, move: move };
  }

  // =====================================================================================
  // PEMILIHAN SOAL BERIKUTNYA — hidup, bukan dari kolam yang dikunci di awal
  // =====================================================================================
  /**
   * Memilih soal berikutnya DARI SISA KOLAM, berdasarkan keadaan sesi saat ini.
   *
   * Inilah bagian yang membuat sesi benar-benar adaptif, bukan sekadar terencana: v2 mengunci
   * urutan soal sebelum soal pertama dijawab, jadi murid yang jelas kesulitan di soal ketiga
   * tetap menerima soal kelima yang sudah disiapkan untuknya. Di sini urutan itu dihitung
   * ulang setiap kali.
   *
   * `predict` diberikan pemanggil (biasanya Core Brain v2 successProbability) supaya modul
   * ini tidak menduplikasi model kemampuan - satu model, dua pemakai.
   */
  function selectNext(pool, state, context) {
    var items = Array.isArray(pool) ? pool.filter(Boolean) : [];
    if (!items.length) return null;
    var s = state || {};
    var ctx = context || {};
    var predict = typeof ctx.predict === 'function' ? ctx.predict : null;
    var target = clamp(ctx.targetSuccess, 0.4, 0.95) || 0.8;
    var wanted = str(ctx.forceConcept);
    var avoid = str(ctx.avoidConcept);

    var scored = items.map(function (item) {
      var concept = str(item.concept || item.lessonSkill || item.skill);
      var p = predict ? clamp(predict(item), 0, 1) : target;
      // Jarak dari peluang ideal. Kuadrat, supaya soal yang jauh terlalu sulit dihukum lebih
      // keras daripada yang sedikit terlalu mudah - frustrasi lebih mahal daripada bosan.
      var score = -Math.pow(p - target, 2) * 10;
      // Setelah mengajar ulang sebuah konsep, soal berikutnya HARUS konsep itu. Mengajar lalu
      // menguji hal lain adalah cara tercepat membuat pengajaran barusan tidak terpakai.
      if (wanted && concept === wanted) score += 6;
      // Sebaliknya, dua soal berturut-turut pada konsep yang baru saja dikuasai membuang
      // giliran - interleaving yang membuat ingatan bertahan.
      if (avoid && concept === avoid) score -= 3;
      var seen = num(s.attemptsOnConcept && s.attemptsOnConcept[concept], 0);
      score -= seen * 0.6;
      return { item: item, score: score, concept: concept, predicted: round(p, 3) };
    }).sort(function (a, b) { return b.score - a.score; });

    return scored[0].item;
  }

  /**
   * Ringkasan sesi untuk layar akhir dan untuk bukti belajar - dalam bahasa guru, bukan
   * bahasa penilai. Yang dilaporkan bukan "12 dari 16", melainkan apa yang berubah.
   */
  function summarize(state) {
    var s = state || {};
    var mis = s.misconceptions || {};
    var resolved = s.resolved || {};
    var persistent = Object.keys(mis).filter(function (k) { return mis[k] >= 2 && !resolved[k]; });
    var fixed = Object.keys(resolved);
    var accuracy = s.answered ? Math.round((s.correct / s.answered) * 100) : null;
    var timings = (s.log || []).reduce(function (acc, row) { acc[row.timing] = (acc[row.timing] || 0) + 1; return acc; }, {});
    return {
      schema: SCHEMA,
      answered: num(s.answered),
      correct: num(s.correct),
      accuracy: accuracy,
      interventions: num(s.interventions),
      resolvedMisconceptions: fixed,
      persistentMisconceptions: persistent,
      timings: timings,
      // Satu kalimat yang boleh dibacakan apa adanya kepada murid.
      headline: fixed.length
        ? 'Sesi ini kamu benar-benar melewati ' + fixed.length + ' hal yang tadinya bikin keliru.'
        : persistent.length
          ? 'Ada ' + persistent.length + ' pola yang masih mengganjal - itu yang kita kejar sesi berikutnya.'
          : accuracy == null ? 'Belum ada jawaban di sesi ini.'
            : 'Sesi bersih, tanpa pola salah yang berulang.'
    };
  }

  return {
    schema: SCHEMA,
    LADDER: LADDER,
    GUESS_FLOOR_MS: GUESS_FLOOR_MS,
    MISS_STREAK_STOP: MISS_STREAK_STOP,
    diagnose: diagnose,
    classifyTiming: classifyTiming,
    median: median,
    scaffoldLevel: scaffoldLevel,
    createSession: createSession,
    record: record,
    decideMove: decideMove,
    composeTurn: composeTurn,
    selectNext: selectNext,
    summarize: summarize
  };
});
