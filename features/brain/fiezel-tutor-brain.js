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

  /**
   * Baseline waktu jawab yang BERGULIR, bukan beku di sampel pertama.
   *
   * Temuan council (gpt_5_6_sol §4.2): baseline lama diisi median SATU sampel lalu tidak
   * pernah diperbarui karena kondisi `if (!s.baselineMs)`. Murid yang kebetulan lambat di
   * soal pertama akan selamanya terbaca "cepat" sesudahnya. Di sini aturannya:
   *   - sebelum ada tiga sampel sesi ini, pegang baseline bawaan (median sesi-sesi lalu);
   *   - begitu sampelnya cukup, kebiasaan sesi INI yang dipercaya, dihitung ulang sebagai
   *     median bergulir setiap jawaban - median, supaya satu jeda ke dapur tidak menggeser
   *     seluruh sesi.
   */
  function currentBaseline(s) {
    var st = s || {};
    var times = Array.isArray(st.responseTimes) ? st.responseTimes : [];
    var rolled = median(times);
    if (times.length >= 3 && rolled > 0) return rolled;
    var seeded = num(st.baselineMs, 0);
    return seeded > 0 ? seeded : rolled;
  }

  // Kunci state miskonsepsi sesi adalah pasangan `konsep::miskonsepsi` (temuan council
  // gpt_5_6_sol §4.1): nama miskonsepsi datang dari bank soal dan BISA sama pada dua konsep
  // berbeda; kunci nama-saja membuat keduanya saling menimpa. Dua helper ini membaca kembali
  // bagian-bagiannya, dan tetap menerima kunci lama tanpa '::' untuk kompatibilitas mundur.
  function misKeyOf(concept, misconception) { return str(concept) + '::' + str(misconception); }
  function misNameOf(key) {
    var k = str(key);
    var i = k.indexOf('::');
    return i >= 0 ? k.slice(i + 2) : k;
  }
  function misConceptOf(key) {
    var k = str(key);
    var i = k.indexOf('::');
    return i >= 0 ? k.slice(0, i) : '';
  }
  function uniq(list) {
    var seen = {};
    return list.filter(function (x) { if (seen[x]) return false; seen[x] = true; return true; });
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
  // Dua keberhasilan mandiri berturut-turut pada satu konsep = bukti bahwa bantuannya sudah
  // boleh dikurangi. Kenapa DUA, bukan satu: satu jawaban benar pada pilihan ganda masih bisa
  // keberuntungan seperempat; dua berturut tanpa bantuan sudah bukan.
  var FADE_WINS_NEEDED = 2;
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
    // FADING (temuan Opus §3.4): tangga lama adalah eskalator satu arah - bantuan hanya bisa
    // naik, tidak pernah turun, sehingga murid yang sudah membaik tetap disodori bantuan
    // sebesar saat ia masih lemah. `fadeCredit` (dihitung record(): dua keberhasilan mandiri
    // berturut pada konsep ini) menurunkan TITIK MULAI tangga satu anak tangga per kredit -
    // tidak pernah di bawah `probe`, karena guru yang berhenti bertanya sama sekali bukan
    // sedang memudarkan bantuan, ia sedang berhenti mengajar.
    var fade = clamp(s.fadeCredit, 0, LADDER.length - 1);
    start = Math.max(0, start - fade);
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
      // Berapa kali tiap miskonsepsi muncul DALAM sesi ini, dikunci per pasangan
      // `konsep::miskonsepsi`. Dua kali berarti bukan kebetulan - dan nama yang sama pada
      // konsep berbeda TIDAK saling menimpa (temuan council gpt_5_6_sol §4.1).
      misconceptions: {},
      // Konsep tempat tiap kunci miskonsepsi muncul. Konsepnya memang sudah tertulis di kunci,
      // tetapi peta ini dipertahankan supaya pembaca state lama tidak perlu mem-parse kunci.
      misconceptionConcept: {},
      // Miskonsepsi yang sudah pernah muncul lalu berhasil dijawab benar - dipakai untuk
      // menamai terobosan, bukan sekadar menghitung skor.
      resolved: {},
      // Penjelasan (kunci `konsep::tangga`) yang sudah terbukti GAGAL: murid tetap salah
      // setelah penjelasan itu diberikan. composeTurn membacanya untuk memilih variasi frasa
      // yang berbeda - inilah yang membuat janji "tidak mengulang penjelasan yang gagal"
      // menjadi nyata (temuan council gpt_5_6_sol §4.3: dulu peta ini dibuat tapi tak dibaca).
      explanationsUsed: {},
      // Penjelasan terakhir yang dipakai composeTurn dan belum diketahui nasibnya. record()
      // pada jawaban berikutnya di konsep yang sama yang memutuskan: gagal atau berhasil.
      lastExplanation: null,
      attemptsOnConcept: {},
      // Kegagalan beruntun per konsep - dipakai tangga scaffolding, dan sengaja DIPISAH dari
      // attemptsOnConcept (yang dipakai selectNext untuk menyebar materi). Satu menghitung
      // kesulitan, satu menghitung paparan; menyatukannya membuat keduanya salah.
      missesOnConcept: {},
      lastConcept: '',
      // Pemudaran bantuan (scaffold fading, temuan Opus §3.4): berapa keberhasilan MANDIRI
      // (dinilai, tanpa bantuan tutor sebelumnya) beruntun per konsep, dan berapa anak tangga
      // titik mulai bantuan konsep itu sudah boleh diturunkan. Kegagalan menghapus keduanya:
      // kredit pemudaran adalah kepercayaan, dan kepercayaan yang baru saja dikhianati oleh
      // jawaban salah tidak dicicil kembali - ia dibangun ulang dari nol.
      fadeWins: {},
      fadeCredit: {},
      lastWinAt: num(opts.now, 0),
      interventions: 0,
      log: []
    };
    // Miskonsepsi persisten dari ledger lintas-sesi (options.priorMisconceptions =
    // [{concept, misconception}]). Di-seed dengan hitungan 1 supaya kemunculan PERTAMA di
    // sesi ini langsung terbaca sebagai yang kedua - persisten - bukan mulai dari nol lagi.
    // Guru sungguhan tidak melupakan kekeliruan minggu lalu hanya karena hari berganti.
    var prior = Array.isArray(opts.priorMisconceptions) ? opts.priorMisconceptions : [];
    for (var i = 0; i < prior.length; i++) {
      var p = prior[i] || {};
      var pc = str(p.concept), pm = str(p.misconception);
      if (!pc || !pm) continue;
      var key = misKeyOf(pc, pm);
      state.misconceptions[key] = 1;
      state.misconceptionConcept[key] = pc;
    }
    return state;
  }

  /** Mencatat satu jawaban ke dalam ingatan sesi, dan mengembalikan diagnosisnya. */
  function record(state, attempt) {
    var s = state;
    var a = attempt || {};
    var scored = a.scored !== false;
    var timing = classifyTiming(a.ms, currentBaseline(s));
    var d = diagnose({
      correct: a.correct, chosenOption: a.chosenOption, optionMisconceptions: a.optionMisconceptions,
      skill: a.skill, timing: timing
    });
    d.timing = timing;
    var concept = str(a.concept || a.skill);

    // Retry adalah bukti bahwa bantuan tutor bekerja atau belum bekerja, tetapi bukan
    // jawaban ujian kedua. Karena itu retry memperbarui ingatan konsep tanpa menaikkan
    // denominator akurasi dan tanpa menggeser baseline waktu jawab sesi.
    if (scored) s.answered++;
    if (scored && num(a.ms) > 0) s.responseTimes.push(num(a.ms));
    // "Mandiri" untuk pemudaran bantuan diputuskan SEBELUM lastExplanation dikonsumsi di
    // bawah: kalau jawaban ini datang tepat setelah tutor memberi penjelasan pada konsep yang
    // sama, keberhasilannya milik berdua - bukan bukti murid sudah bisa sendiri.
    var assisted = !!(s.lastExplanation && str(s.lastExplanation.concept) === concept);
    if (!s.fadeWins) s.fadeWins = {};
    if (!s.fadeCredit) s.fadeCredit = {};
    // Baseline dihitung ULANG setiap jawaban (median bergulir), bukan dibekukan di sampel
    // pertama - lihat currentBaseline() dan temuan council gpt_5_6_sol §4.2.
    s.baselineMs = currentBaseline(s);
    s.attemptsOnConcept[concept] = (s.attemptsOnConcept[concept] || 0) + 1;
    s.lastConcept = concept;

    // Nasib penjelasan terakhir pada konsep ini diputuskan SEKARANG: kalau murid tetap salah
    // setelah penjelasan itu diberikan, penjelasannya GAGAL dan kuncinya (konsep::tangga)
    // dicatat supaya composeTurn tidak mengulanginya dengan frasa yang persis sama. Kalau
    // murid benar, penjelasannya bekerja - tidak ada yang perlu dihindari.
    if (!s.explanationsUsed) s.explanationsUsed = {};
    if (s.lastExplanation && str(s.lastExplanation.concept) === concept) {
      if (a.correct !== true) {
        var expKey = str(s.lastExplanation.key);
        s.explanationsUsed[expKey] = (s.explanationsUsed[expKey] || 0) + 1;
      }
      s.lastExplanation = null;
    }

    if (d.correct) {
      if (scored) {
        s.correct++;
        s.streak++;
      }
      s.missStreak = 0;
      s.lastWinAt = num(a.now, s.lastWinAt);
      // Terobosan: miskonsepsi yang tadi bikin gagal PADA KONSEP INI, sekarang dilewati.
      // Ini yang layak disebut namanya kepada murid - "yang tadi bikin kamu keliru, barusan
      // kamu lewati". Konsepnya dibaca dari peta (atau dari kunci komposit untuk state lama),
      // bukan lewat teks nama miskonsepsi.
      var pending = Object.keys(s.misconceptions).filter(function (k) {
        var kc = s.misconceptionConcept[k] != null ? str(s.misconceptionConcept[k]) : misConceptOf(k);
        return s.misconceptions[k] > 0 && !s.resolved[k] && kc === concept;
      });
      for (var i = 0; i < pending.length; i++) s.resolved[pending[i]] = true;
      d.breakthrough = pending.length > 0;
      // Konsep yang sudah dilewati mengembalikan tangga bantuan ke awal: kalau nanti keliru
      // lagi, itu kesalahan pertama yang baru, bukan lanjutan dari episode yang sudah selesai.
      s.missesOnConcept[concept] = 0;
      // PEMUDARAN BANTUAN: hanya keberhasilan yang DINILAI dan TANPA bantuan yang dihitung.
      // Retry (scored:false) bukan bukti kemandirian - ia bukti bantuannya bekerja; dan
      // keberhasilan berbantuan justru MEMUTUS rentetan, karena "berturut-turut mandiri"
      // kehilangan maknanya kalau boleh diselingi keberhasilan yang dituntun.
      if (scored && !assisted) {
        s.fadeWins[concept] = (s.fadeWins[concept] || 0) + 1;
        if (s.fadeWins[concept] >= FADE_WINS_NEEDED) {
          s.fadeCredit[concept] = Math.min((s.fadeCredit[concept] || 0) + 1, LADDER.length - 1);
          // Rentetan mulai dari nol lagi: kredit berikutnya menuntut dua bukti BARU.
          s.fadeWins[concept] = 0;
        }
      } else if (assisted) {
        s.fadeWins[concept] = 0;
      }
    } else {
      if (scored) s.streak = 0;
      s.missStreak++;
      var misKey = misKeyOf(concept, d.misconception);
      s.misconceptions[misKey] = (s.misconceptions[misKey] || 0) + 1;
      s.misconceptionConcept[misKey] = concept;
      s.missesOnConcept[concept] = (s.missesOnConcept[concept] || 0) + 1;
      d.breakthrough = false;
      // Kegagalan menghapus SELURUH kredit pemudaran konsep ini, bukan sekadar rentetannya.
      // Bantuan yang sudah dipangkas ternyata dipangkas terlalu cepat - kembali ke titik
      // mulai semula sampai murid membuktikan kemandiriannya lagi.
      s.fadeWins[concept] = 0;
      s.fadeCredit[concept] = 0;
    }
    d.repeats = d.correct ? 0 : s.misconceptions[misKeyOf(concept, d.misconception)];
    // Kegagalan SEBELUM yang ini - itulah yang menentukan seberapa tinggi bantuannya.
    d.priorMisses = d.correct ? 0 : Math.max(0, s.missesOnConcept[concept] - 1);
    d.concept = concept;
    d.scored = scored;
    // Kredit pemudaran ikut keluar bersama diagnosis supaya pemanggil scaffoldLevel tidak
    // perlu membongkar state sesi sendiri. Rationale hanya muncul saat kreditnya nyata -
    // 'scaffold_faded' adalah klaim bahwa bantuan DITURUNKAN, bukan sekadar bisa diturunkan.
    d.fadeCredit = num(s.fadeCredit[concept], 0);
    if (d.fadeCredit > 0) d.scaffoldRationale = 'scaffold_faded';
    s.log.push({ concept: concept, correct: d.correct, timing: timing, misconception: d.misconception, scored: scored });
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
  /**
   * Di atas ambang ini, dua kali salah dibaca sebagai KESELEO, bukan miskonsepsi.
   *
   * 0,8 dipilih supaya lebih longgar daripada gerbang penguasaan BKT (L >= 0,95 DAN n >= 5):
   * murid tidak perlu sudah "lulus" sebuah konsep untuk berhak tidak diajari ulang gara-gara
   * dua jawaban meleset. Ambang yang sama ketatnya dengan gerbang penguasaan akan membuat
   * pagar ini hampir tidak pernah menyala.
   *
   * Yang TIDAK dilonggarkan: miskonsepsi yang memang ada buktinya tetap diajar ulang berapa
   * pun mastery-nya. Murid yang sudah mahir pun bisa memegang satu keyakinan keliru, dan
   * itulah justru yang paling layak disentuh.
   */
  var MASTERY_NO_RETEACH = 0.8;
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
    //
    //    DUA SYARAT, dan keduanya ditambahkan sesudah pengukuran — bukan sesudah dugaan.
    //
    //    (a) "Miskonsepsi" hanya boleh disebut bila memang ADA buktinya. Ketika soal tidak
    //        membawa optionMisconceptions (item vocabulary dan reading TIDAK membawanya;
    //        app.js:2799 mengirim null), diagnose() mengarang kunci `unclassified:<skill>`
    //        dan pengulangannya terhitung di sini. Yang sebenarnya kita tahu cuma "salah dua
    //        kali pada keterampilan yang sama" — dan diagnosisnya sendiri sudah jujur soal
    //        itu lewat `precision: 'skill'`. Cabang ini dulu membuang field itu lalu mengklaim
    //        ketepatan yang tidak dimilikinya.
    //
    //    (b) Dua kali salah dari murid yang SUDAH TERBUKTI BISA adalah keseleo, bukan
    //        miskonsepsi. Diukur pada 39 kejadian mengajar-ulang terhadap murid yang
    //        kemampuan sejatinya tinggi: mastery BKT mereka rata-rata 0,931 dengan 21 jawaban
    //        sebagai bukti, dan 85% di antaranya di atas 0,80. Jadi mesinnya SUDAH TAHU murid
    //        itu bisa — informasinya ada di sistem — dan tetap mengajar ulang, karena
    //        keputusan ini tidak pernah diberi tahu. Mengajar ulang orang yang sudah bisa
    //        bukan sekadar mubazir: ia membuang sesi belajar, dan ia memberi tahu murid bahwa
    //        mesinnya tidak memperhatikan.
    //
    //    `ctx.mastery` OPSIONAL: tanpa field itu (mastery < 0) perilakunya persis seperti
    //    sebelumnya, jadi pemanggil lama tidak berubah artinya.
    if (!d.correct && num(d.repeats) >= 2) {
      var berbukti = d.precision === 'misconception';
      if (berbukti) {
        return { move: 'reteach', reason: 'persistent_misconception', urgency: 'high', misconception: d.misconception };
      }
      var mastery = num(ctx.mastery, -1);
      if (mastery >= MASTERY_NO_RETEACH) {
        return { move: 'hint', reason: 'likely_slip_high_mastery', urgency: 'normal' };
      }
      return { move: 'reteach', reason: 'repeated_miss_same_skill', urgency: 'high' };
    }
    // 3. Tiga salah berturut-turut: berhenti menguji, mulai mengajar.
    if (num(s.missStreak) >= MISS_STREAK_STOP) {
      return { move: 'reteach', reason: 'miss_streak', urgency: 'high', misconception: d.misconception };
    }
    // 4. KEADAAN AFEKTIF (Fase 2, opts.affect dari FiezelAffect.assess). Empat keadaan,
    //    empat tindakan BERBEDA - karena penyebabnya berbeda:
    //      frustrated -> breathe : murid yang frustrasi tidak butuh soal berikutnya, ia butuh
    //                             jeda; melanjutkan hanya menumpuk bukti bahwa ia "tidak bisa".
    //      bored      -> stretch : bosan artinya soalnya di bawah kemampuan - dinaikkan, bukan
    //                             disemangati. Semangat tidak menyembuhkan kurang tantangan.
    //      gaming     -> continue + suggestModeSwitch : menebak-nebak sistematis tidak dihukum
    //                             dengan berhenti (itu hadiah untuk yang ingin cepat selesai);
    //                             sesinya jalan terus, tetapi mode soalnya disarankan diganti
    //                             ke bentuk yang tidak bisa ditebak (produksi, bukan pilihan).
    //      fatigued   -> wrapup  : lelah versi afek ditutup RAPI (bukan breathe darurat) dan
    //                             hanya bila sisa soal masih panjang (remaining>2) - dua soal
    //                             terakhir lebih baik diselesaikan daripada dipotong.
    //    Blok ini sengaja SESUDAH aturan keselamatan 1-3 (lelah kognitif, miskonsepsi
    //    persisten, rentetan salah) dan SEBELUM aturan stretch/continue: keselamatan tidak
    //    boleh kalah oleh mood, tetapi mood boleh mengalahkan optimisasi kesulitan.
    var affect = ctx.affect && typeof ctx.affect === 'object' ? str(ctx.affect.state) : str(ctx.affect);
    if (affect === 'frustrated') {
      return { move: 'breathe', reason: 'affect_frustrated', urgency: 'high' };
    }
    if (affect === 'bored') {
      return { move: 'stretch', reason: 'affect_bored', urgency: 'normal' };
    }
    if (affect === 'gaming') {
      return { move: 'continue', reason: 'affect_gaming', urgency: 'normal', suggestModeSwitch: true };
    }
    if (affect === 'fatigued' && remaining > 2) {
      return { move: 'wrapup', reason: 'affect_fatigued', urgency: 'normal' };
    }
    // ('neutral', absen, atau fatigued dengan sisa <=2 soal: tidak mengubah apa pun.)
    // 5. Satu salah: jangan langsung beri jawaban. Beri pijakan, lalu tanya lagi.
    if (!d.correct) {
      return { move: 'hint', reason: d.timing === 'guess' ? 'answered_too_fast' : 'first_miss', urgency: 'normal', misconception: d.misconception };
    }
    // 6. Benar tetapi tersendat: konsepnya belum otomatis. Jangan naikkan kesulitan; kokohkan.
    if (d.fragile) {
      return { move: 'consolidate', reason: 'correct_but_slow', urgency: 'low' };
    }
    // 7. Terobosan layak disebut namanya. Kemajuan yang tidak pernah diucapkan tidak terasa
    //    sebagai kemajuan.
    if (d.breakthrough) {
      return { move: 'celebrate', reason: 'misconception_resolved', urgency: 'normal' };
    }
    // 8. Beruntun benar dan cepat berarti soalnya sudah di bawah kemampuannya - TETAPI hanya
    //    bila cepatnya karena MENGINGAT. Empat tebakan benar bukan penguasaan (temuan council
    //    gpt_5_6_sol §4.2): pada empat opsi peluangnya seperempat per soal, dan menaikkan
    //    kesulitan justru menghadiahi kebiasaan menebak. Tebakan beruntun dijawab dengan terus
    //    berjalan sambil menamai polanya, bukan dengan stretch.
    if (num(s.streak) >= FAST_CORRECT_STRETCH && d.timing === 'guess') {
      return { move: 'continue', reason: 'streak_but_guessing', urgency: 'normal' };
    }
    if (num(s.streak) >= FAST_CORRECT_STRETCH && d.timing === 'retrieved') {
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
   *
   * Argumen kedua (session) OPSIONAL: bila diberikan, composeTurn membaca `explanationsUsed`
   * untuk MENGHINDARI frasa yang sudah terbukti gagal pada pasangan (konsep, tangga) ini,
   * dan mencatat penjelasan yang barusan dipakai supaya record() bisa menilai nasibnya.
   * Tanpa session perilakunya persis seperti sebelumnya - kompatibel mundur.
   */
  /**
   * Tiga cara berbeda menjelaskan hal yang sama, untuk rotasi "jangan ulangi yang gagal"
   * (temuan council gpt_5_6_sol §4.3): aturannya sendiri, kenapa pilihan tadi gagal, dan
   * bentuk kontras jawaban murid vs bentuk benar. Yang kosong dilewati, supaya rotasi tidak
   * pernah jatuh ke frasa hampa.
   */
  var NASKAH_ID = Object.freeze({
    'brain-tutor.concept-fallback': 'materi ini',
    'brain-tutor.compare-direct': 'Bandingkan langsung: jawabanmu "' + '{chosen}' + '" vs bentuk benar "' + '{right}' + '"',
    'brain-tutor.worked-step1': 'Langkah 1 - pegang aturannya: ' + '{rule}' + '.',
    'brain-tutor.worked-step2': 'Langkah 2 - terapkan ke kalimatnya: "' + '{sentence}' + '".',
    'brain-tutor.worked-step3': 'Langkah 3 - jadi bentuk yang dipakai: "' + '{answer}' + '".',
    'brain-tutor.worked-fallback': 'Inti ' + '{concept}' + ': ikuti bentuk yang diminta konteksnya.',
    'brain-tutor.timing-guess': 'Tadi cepat sekali jawabnya. Coba baca ulang kalimatnya pelan-pelan dulu ya - separuh soal ini dimenangkan di bacaannya, bukan di pilihannya.',
    'brain-tutor.why-fails': 'Ini yang bikin pilihan tadi gagal - ' + '{why}' + '.',
    'brain-tutor.not-yet': 'Belum tepat, dan itu wajar di bagian ini.',
    'brain-tutor.probe-rotated': '{rotated}' + '. Coba pikirkan lagi dari situ.',
    'brain-tutor.probe-default': 'Sebelum lihat pilihannya lagi - petunjuk waktu di kalimat itu yang mana?',
    'brain-tutor.hint-rotated': 'Cara lain melihatnya: ' + '{rotated}' + '. Sekarang coba lagi.',
    'brain-tutor.hint-cue': 'Pegangan singkatnya: ' + '{cue}' + '. Sekarang coba lagi.',
    'brain-tutor.hint-default': 'Petunjuknya ada di kata yang menunjukkan kapan kejadiannya. Coba lagi.',
    'brain-tutor.worked-intro': ' Aku kerjakan satu yang mirip dulu ya, biar kelihatan langkahnya.',
    'brain-tutor.reveal-intro': ' Oke, aku buka sekarang.',
    'brain-tutor.move-celebrate': 'Nah, itu dia. Yang tadi bikin kamu keliru, barusan kamu lewati - dan kamu melewatinya dengan alasan yang benar, bukan tebakan.',
    'brain-tutor.move-consolidate': 'Benar. Tapi tadi kamu perlu waktu lumayan, jadi kita mantapkan dulu di sini sebentar sebelum naik.',
    'brain-tutor.move-stretch': 'Beruntun dan cepat. Ini sudah di bawah kemampuanmu sekarang - aku naikkan sedikit.',
    'brain-tutor.move-breathe': 'Kita berhenti di sini dulu. Jawabanmu mulai melambat dan mulai meleset bareng, dan itu tanda capek, bukan tanda kamu tidak bisa. Lanjut nanti hasilnya jauh lebih nempel.',
    'brain-tutor.move-wrapup': 'Soalnya habis. Kita tutup sesi ini.',
    'brain-tutor.headline-resolved': 'Sesi ini kamu benar-benar melewati ' + '{count}' + ' hal yang tadinya bikin keliru.',
    'brain-tutor.headline-persistent': 'Ada ' + '{count}' + ' pola yang masih mengganjal - itu yang kita kejar sesi berikutnya.',
    'brain-tutor.headline-empty': 'Belum ada jawaban di sesi ini.',
    'brain-tutor.headline-clean': 'Sesi bersih, tanpa pola salah yang berulang.'
  });

  /* Injeksi naskah OPSIONAL (W2-FEAT-A, desain W1-FEAT-A): NASKAH_ID di bawah adalah
   * baseline byte-identik dengan naskah beku gerbang emas. Pemanggil boleh menitipkan
   * tabel pengganti per-kunci (mis. terjemahan th yang dirakit app dari copy-map i18n).
   * Fallback per-kunci: kunci yang tidak ada di tabel titipan jatuh ke NASKAH_ID —
   * modul ini TIDAK menyentuh lapisan i18n, kemurnian brain dipertahankan (AI-08 F01). */
  function lineFor(T, key) {
    return (T && typeof T[key] === 'string') ? T[key] : NASKAH_ID[key];
  }
  function fill(text, params) {
    return String(text).replace(/\{(\w+)\}/g, function (m, name) {
      return params && Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m;
    });
  }

  function explanationVariants(ex, it, T) {
    var list = [];
    if (clause(ex.rule)) list.push(clause(ex.rule));
    var why = clause(ex.whyFails) || clause(it.whyFails);
    if (why) list.push(why);
    var chosen = clause(it.chosenOption);
    var right = clause(it.correctAnswer || ex.correct);
    if (chosen && right) list.push(fill(lineFor(T, 'brain-tutor.compare-direct'), { chosen: chosen, right: right }));
    return list;
  }

  /**
   * Contoh yang BENAR-BENAR dikerjakan (temuan council gpt_5_6_sol §4.4): level `worked`
   * dulu hanya mengutip ex.rule - label "aku kerjakan dulu" tidak cocok dengan isinya. Di
   * sini langkahnya disusun sungguhan: pegang aturannya, terapkan ke kalimat contohnya, lalu
   * tunjukkan bentuk yang keluar. Payload-nya dengan sendirinya berbeda dari `tell`, yang
   * hanya membuka alasan jawaban benar tanpa langkah.
   */
  function workedExample(ex, it, ruleOverride, conceptLabel, T) {
    var steps = [];
    var rule = clause(ruleOverride) || clause(ex.rule);
    if (rule) steps.push(fill(lineFor(T, 'brain-tutor.worked-step1'), { rule: rule }));
    var contoh = clause(it.sentence || ex.example);
    if (contoh) steps.push(fill(lineFor(T, 'brain-tutor.worked-step2'), { sentence: contoh }));
    var benar = clause(it.correctAnswer || ex.correct);
    if (benar) steps.push(fill(lineFor(T, 'brain-tutor.worked-step3'), { answer: benar }));
    if (!steps.length) return fill(lineFor(T, 'brain-tutor.worked-fallback'), { concept: conceptLabel });
    return steps.join(' ');
  }

  function composeTurn(input, session, naskah) {
    var it = input || {};
    var s = session && typeof session === 'object' ? session : null;
    var T = (naskah && typeof naskah === 'object') ? naskah : null;
    var move = str(it.move);
    var level = str(it.scaffold) || 'hint';
    var ex = it.explanation && typeof it.explanation === 'object' ? it.explanation : {};
    var whyFails = str(it.whyFails);
    var concept = str(it.conceptLabel) || lineFor(T, 'brain-tutor.concept-fallback');
    // Kunci penjelasan memakai id konsep (bukan label tampilannya) supaya cocok dengan yang
    // dicatat record(); label hanya jatuh sebagai cadangan untuk pemanggil lama.
    var conceptKey = str(it.concept) || str(it.conceptLabel);
    var say = '';
    var ask = '';
    var reveal = false;

    // Berapa kali penjelasan pada (konsep, tangga) ini sudah GAGAL - menentukan variasi frasa.
    var expKey = conceptKey ? (conceptKey + '::' + level) : '';
    var failed = s && expKey && s.explanationsUsed ? num(s.explanationsUsed[expKey], 0) : 0;
    var variants = explanationVariants(ex, it, T);
    // Kegagalan pertama menggeser ke varian pertama, berikutnya berputar - tidak pernah
    // kembali ke frasa yang persis sama dua kali berturut-turut selama masih ada varian lain.
    var rotated = failed > 0 && variants.length ? variants[(failed - 1) % variants.length] : '';

    if (move === 'hint' || move === 'reteach') {
      if (it.timing === 'guess') {
        say = lineFor(T, 'brain-tutor.timing-guess');
      } else if (whyFails) {
        say = fill(lineFor(T, 'brain-tutor.why-fails'), { why: clause(whyFails) });
      } else {
        say = lineFor(T, 'brain-tutor.not-yet');
      }
      if (level === 'probe') {
        ask = rotated ? fill(lineFor(T, 'brain-tutor.probe-rotated'), { rotated: rotated })
          : (str(ex.howToAvoid) || lineFor(T, 'brain-tutor.probe-default'));
      } else if (level === 'hint') {
        ask = rotated ? fill(lineFor(T, 'brain-tutor.hint-rotated'), { rotated: rotated })
          : clause(ex.memoryCue) ? fill(lineFor(T, 'brain-tutor.hint-cue'), { cue: clause(ex.memoryCue) })
            : lineFor(T, 'brain-tutor.hint-default');
      } else if (level === 'worked') {
        say += lineFor(T, 'brain-tutor.worked-intro');
        ask = workedExample(ex, it, rotated, concept, T);
      } else {
        say += lineFor(T, 'brain-tutor.reveal-intro');
        ask = rotated || str(ex.whyCorrect) || str(ex.rule) || '';
        reveal = true;
      }
      // Catat penjelasan yang barusan dipakai. record() pada jawaban berikutnya di konsep
      // yang sama yang memutuskan nasibnya: murid tetap salah = penjelasan ini gagal.
      if (s && expKey) s.lastExplanation = { concept: conceptKey, scaffold: level, key: expKey };
    } else if (move === 'celebrate') {
      say = lineFor(T, 'brain-tutor.move-celebrate');
    } else if (move === 'consolidate') {
      say = lineFor(T, 'brain-tutor.move-consolidate');
    } else if (move === 'stretch') {
      say = lineFor(T, 'brain-tutor.move-stretch');
    } else if (move === 'breathe') {
      say = lineFor(T, 'brain-tutor.move-breathe');
    } else if (move === 'wrapup') {
      say = lineFor(T, 'brain-tutor.move-wrapup');
    } else {
      say = '';
    }
    return { say: say, ask: ask, reveal: reveal, scaffold: level, move: move };
  }

  /**
   * A11-03 — Eskalasi "Aku masih belum paham" yang menghormati tangganya sendiri.
   *
   * Kontrak probe→hint→worked→tell berarti: naik SATU anak tangga per permintaan, dan
   * jawaban baru boleh terbuka di `tell`. Pemanggil yang langsung membuka jawaban pada
   * anak tangga `worked` melanggar kontrak itu. Helper ini mengembalikan keputusan yang
   * benar sekali jalan: scaffold barunya, giliran tutur yang sudah dikomposisi, dan flag
   * `reveal` yang WAJIB dipatuhi — false berarti beri murid satu percobaan lagi dengan
   * contoh yang dikerjakan, true (hanya di `tell`) berarti jawaban boleh dibuka.
   */
  function escalate(current, input, session) {
    var at = LADDER.indexOf(str(current) || 'hint');
    var next = LADDER[Math.min(LADDER.length - 1, (at < 0 ? 1 : at) + 1)];
    var it = input || {};
    var merged = {};
    for (var k in it) {
      if (Object.prototype.hasOwnProperty.call(it, k)) merged[k] = it[k];
    }
    merged.scaffold = next;
    if (!merged.move) merged.move = 'hint';
    var turn = composeTurn(merged, session);
    return { scaffold: next, reveal: next === 'tell' && turn.reveal, turn: turn };
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
  /**
   * PRNG mulberry32 - deterministik untuk seed yang sama, dan itulah alasannya dipilih:
   * aturan keras modul melarang Math.random tanpa seed, karena keputusan yang tidak bisa
   * diulang adalah keputusan yang tidak bisa diuji. 32-bit, cukup untuk memilih satu dari
   * empat kandidat; bukan untuk kriptografi.
   */
  function mulberry32(seed) {
    var a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Suhu softmax untuk pemilihan berseed. Rendah dengan sengaja: variasi yang diinginkan
  // adalah "kadang soal terbaik KEDUA", bukan lotre - selisih skor 1 poin saja sudah membuat
  // kandidat teratas ~17x lebih mungkin terpilih (e^(1/0.35)), jadi forceConcept dan penalti
  // paparan tetap terasa deterministik dalam praktiknya.
  var SOFTMAX_TEMPERATURE = 0.35;
  var SOFTMAX_TOP_K = 4;

  function selectNext(pool, state, context) {
    var items = Array.isArray(pool) ? pool.filter(Boolean) : [];
    if (!items.length) return null;
    var s = state || {};
    var ctx = context || {};
    var predict = typeof ctx.predict === 'function' ? ctx.predict : null;
    var target = clamp(ctx.targetSuccess == null ? 0.8 : ctx.targetSuccess, 0.4, 0.95);
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

    // Fase 2: sampling berseed (temuan council: argmax murni membuat dua murid identik
    // menerima urutan soal yang identik selamanya - sesi terasa seperti rel, bukan guru).
    // Dengan opts.seed angka, pilihan diambil softmax bersuhu rendah di atas EMPAT kandidat
    // teratas: cukup untuk variasi antar sesi, terlalu sempit untuk pernah menyodorkan soal
    // yang buruk. Tanpa seed, jalurnya persis argmax lama - byte demi byte - supaya pemanggil
    // yang belum ikut Fase 2 tidak berubah perilaku sedikit pun.
    if (typeof ctx.seed === 'number' && isFinite(ctx.seed)) {
      var top = scored.slice(0, SOFTMAX_TOP_K);
      // Dikurangi skor tertinggi sebelum exp: matematis identik (ternormalisasi), numerik
      // aman - skor sangat negatif tidak pernah menghasilkan exp() overflow/underflow ganjil.
      var best = top[0].score;
      var weights = [], total = 0, k;
      for (k = 0; k < top.length; k++) {
        var w = Math.exp((top[k].score - best) / SOFTMAX_TEMPERATURE);
        weights.push(w);
        total += w;
      }
      var roll = mulberry32(ctx.seed)() * total;
      var acc = 0;
      for (k = 0; k < top.length; k++) {
        acc += weights[k];
        if (roll < acc) return top[k].item;
      }
      return top[top.length - 1].item;
    }

    return scored[0].item;
  }

  /**
   * Ringkasan sesi untuk layar akhir dan untuk bukti belajar - dalam bahasa guru, bukan
   * bahasa penilai. Yang dilaporkan bukan "12 dari 16", melainkan apa yang berubah.
   */
  function summarize(state, naskah) {
    var T = (naskah && typeof naskah === 'object') ? naskah : null;
    var s = state || {};
    var mis = s.misconceptions || {};
    var resolved = s.resolved || {};
    // Kunci internal berbentuk `konsep::miskonsepsi`; yang dilaporkan keluar tetap NAMA
    // miskonsepsinya saja, seperti sebelum kunci komposit - pembaca summarize tidak berubah.
    var persistent = uniq(Object.keys(mis).filter(function (k) { return mis[k] >= 2 && !resolved[k]; }).map(misNameOf));
    var fixed = uniq(Object.keys(resolved).map(misNameOf));
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
        ? fill(lineFor(T, 'brain-tutor.headline-resolved'), { count: fixed.length })
        : persistent.length
          ? fill(lineFor(T, 'brain-tutor.headline-persistent'), { count: persistent.length })
          : accuracy == null ? lineFor(T, 'brain-tutor.headline-empty')
            : lineFor(T, 'brain-tutor.headline-clean')
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
    escalate: escalate,
    selectNext: selectNext,
    summarize: summarize
  };
});
