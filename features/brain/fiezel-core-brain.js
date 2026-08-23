/**
 * FIEZEL Core Brain v2 — lapisan penalaran belajar (m025-117).
 *
 * OWNER: "tingkatkan inti otak core FIEZEL agar lebih pintar dan semakin jenius dari pada
 * sebelumnya."
 *
 * APA YANG SUDAH ADA, DAN DI MANA BATASNYA
 * ----------------------------------------
 * `deriveAdaptivePolicy()` (app.js + fiezel-core-worker.js) sudah memilih mode sesi dari
 * bukti belajar. Tetapi seluruh keputusannya berdiri di atas RATA-RATA dan AMBANG TETAP:
 * akurasi rata-rata, jumlah salah, level ± 1. Empat hal yang tidak bisa dilihat oleh cara
 * itu, dan keempatnya adalah hal yang paling menentukan apakah murid benar-benar maju:
 *
 *   1. RATA-RATA TIDAK PUNYA ARAH. Akurasi 60% pada murid yang naik dari 40% dan pada murid
 *      yang turun dari 80% terlihat sama persis, padahal yang satu butuh dorongan dan yang
 *      satu butuh rem. Yang hilang adalah TREN.
 *   2. "LEVEL ± 1" BUKAN KESULITAN YANG TEPAT. Soal yang terlalu gampang tidak mengajarkan
 *      apa pun, soal yang terlalu sulit hanya mengajarkan rasa gagal. Yang hilang adalah
 *      MODEL KEMAMPUAN yang bisa menjawab "soal setingkat apa yang peluang benarnya ~85%".
 *   3. SKILL LEMAH BELUM TENTU AKAR MASALAH. Murid yang gagal di third conditional sering
 *      sebenarnya gagal di past perfect. Melatih gejalanya berulang kali tidak menyembuhkan
 *      penyebabnya. Yang hilang adalah GRAF PRASYARAT.
 *   4. LUPA TIDAK LINEAR DAN TIDAK SERAGAM. Rumus lama memakai satu "stability" yang naik
 *      pelan; ia tidak membedakan materi yang sudah diingat lima kali dari materi yang baru
 *      sekali benar. Yang hilang adalah MODEL PARUH-WAKTU INGATAN.
 *
 * APA YANG DITAMBAHKAN DI SINI
 * ----------------------------
 * Tujuh model kecil yang semuanya MURNI (tanpa DOM, tanpa jaringan, tanpa state global),
 * sehingga setiap keputusan Core Brain bisa diuji sebagai angka, bukan sebagai tampilan:
 *
 *   A. Model kemampuan laten (Rasch/1PL + pembaruan daring gaya Elo)
 *   B. Kesulitan optimal (aturan 85% / desirable difficulty)
 *   C. Model ingatan paruh-waktu (retrievability, jadwal ulang berbasis target retensi)
 *   D. Tren dan momentum (regresi kuadrat terkecil: maju / mandek / mundur)
 *   E. Graf prasyarat skill (akar masalah, bukan gejala)
 *   F. Profil waktu belajar (jam yang benar-benar produktif bagi murid ini)
 *   G. Beban kognitif dalam sesi (kelelahan terbaca dari waktu jawab dan akurasi)
 *
 * BATAS YANG DIJAGA
 * -----------------
 * 1. TIDAK PERNAH MENEBAK DI ATAS BUKTI TIPIS. Setiap model mengembalikan `confidence` dan
 *    `evidence`; pemanggil WAJIB boleh mengabaikannya saat buktinya kurang. Model yang
 *    percaya diri di atas tiga jawaban lebih berbahaya daripada tidak ada model sama sekali,
 *    karena ia terdengar meyakinkan.
 * 2. TIDAK ADA KEPUTUSAN YANG TIDAK BISA DIJELASKAN. Setiap keluaran membawa alasan dalam
 *    bentuk kode (`rationale`), supaya layar "kenapa FIEZEL menyuruh ini" tidak perlu
 *    mengarang ulang alasannya.
 * 3. TIDAK MENYENTUH APA PUN. Modul ini tidak membaca state, tidak menulis penyimpanan, dan
 *    tidak memanggil jaringan. Ia menerima angka dan mengembalikan angka.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelCoreBrain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-core-brain-v2';
  var LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

  // ---- dasar -------------------------------------------------------------------------

  function num(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, num(value, min))); }
  function str(value) { return value == null ? '' : String(value); }
  function round(value, digits) {
    var f = Math.pow(10, digits === undefined ? 2 : digits);
    return Math.round(num(value) * f) / f;
  }
  function levelIndex(level) {
    var at = LEVELS.indexOf(str(level).toUpperCase());
    return at === -1 ? 0 : at;
  }

  // =====================================================================================
  // A. MODEL KEMAMPUAN LATEN (Rasch / 1PL)
  // =====================================================================================
  /**
   * Peluang menjawab benar sebuah soal berkesulitan `difficulty` bagi murid berkemampuan
   * `ability`, keduanya pada skala yang sama (1..6, sejajar CEFR).
   *
   * Modelnya 3PL, BUKAN 1PL polos, dan alasannya menentukan: seluruh soal FIEZEL adalah
   * pilihan ganda EMPAT opsi. Murid yang sama sekali tidak tahu jawabannya tetap benar
   * seperempat kali. Model tanpa parameter tebakan akan menaksir kemampuan terlalu tinggi
   * pada murid pemula (25% benar terbaca sebagai "sedikit tahu", padahal itu nol), dan
   * kesalahan itu merambat ke SELURUH keputusan di berkas ini - kesulitan, jadwal ulang,
   * ukuran sesi.
   *
   *   P = c + (1 - c) · σ(a · (θ - b)),  c = 0.25 (lantai tebakan empat opsi)
   *
   * Dengan a = 1.5, model ini berbunyi: soal setingkat kemampuan sendiri ≈ 62% benar, satu
   * tingkat di bawah ≈ 86%, satu tingkat di atas ≈ 39%. Angka-angka itu sengaja ditulis di
   * sini supaya bisa dibantah dengan data, bukan disembunyikan di dalam rumus.
   */
  var DISCRIMINATION = 1.5;
  var GUESS_FLOOR = 0.25;
  function successProbability(ability, difficulty, discrimination) {
    var a = num(discrimination, DISCRIMINATION) || DISCRIMINATION;
    var latent = 1 / (1 + Math.exp(-a * (num(ability) - num(difficulty))));
    return GUESS_FLOOR + (1 - GUESS_FLOOR) * latent;
  }

  /**
   * Kemampuan laten dari riwayat jawaban, dengan dua sifat yang disengaja:
   *
   *   - PEMBARUAN DARING (gaya Elo). Setiap jawaban menggeser taksiran sebesar kejutannya:
   *     benar pada soal sulit menggeser jauh, benar pada soal gampang hampir tidak menggeser
   *     sama sekali. Ini yang membuat model tidak bisa dibohongi dengan mengulang soal mudah.
   *   - LANGKAH YANG MENGECIL. Faktor K turun seiring bukti bertambah, jadi taksiran awal
   *     bergerak cepat lalu mengendap - bukan berayun selamanya mengikuti jawaban terakhir.
   *
   * Bobot waktu: jawaban yang lebih tua dihitung lebih ringan (paruh-waktu 21 hari), karena
   * kemampuan bulan lalu bukan kemampuan hari ini.
   */
  var ABILITY_HALF_LIFE_DAYS = 21;
  function estimateAbility(attempts, options) {
    var opts = options || {};
    var now = num(opts.now, Date.now()) || Date.now();
    var rows = Array.isArray(attempts) ? attempts : [];
    var ability = num(opts.prior, 1.5);
    var seen = 0;
    var weighted = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || {};
      var difficulty = clamp(row.difficulty == null ? ability : row.difficulty, 1, 6);
      var ageDays = Math.max(0, (now - num(row.at, now)) / 86400000);
      var recency = Math.pow(0.5, ageDays / ABILITY_HALF_LIFE_DAYS);
      var expected = successProbability(ability, difficulty);
      var actual = row.ok ? 1 : 0;
      // K mengecil dengan akar jumlah bukti: cepat di awal, tenang setelahnya.
      var k = 0.62 / Math.sqrt(1 + seen);
      ability += k * recency * (actual - expected);
      ability = clamp(ability, 0.4, 6.6);
      seen++;
      weighted += recency;
    }
    // Keyakinan dari bukti BERBOBOT, bukan jumlah baris: 40 jawaban dari tiga bulan lalu
    // bukan bukti yang sama kuatnya dengan 40 jawaban minggu ini.
    var confidence = clamp(weighted / 24, 0, 1);
    return {
      ability: round(clamp(ability, 0.4, 6.6), 3),
      evidence: seen,
      effectiveEvidence: round(weighted, 2),
      confidence: round(confidence, 3),
      level: LEVELS[clamp(Math.round(ability) - 1, 0, 5)]
    };
  }

  // =====================================================================================
  // B. KESULITAN OPTIMAL (aturan 85%)
  // =====================================================================================
  /**
   * Kesulitan yang membuat peluang benar mendekati `targetSuccess`.
   *
   * 0.80 bukan angka karangan, dan bukan pula 0.85 yang biasa dikutip. Aturan 85% berlaku
   * untuk tugas TANPA tebakan; pada pilihan ganda empat opsi, 0.85 teramati hanya setara
   * ~0.80 pengetahuan sesungguhnya - dan mengejar 0.85 teramati akan menggeser latihan ke
   * soal yang terlalu mudah. Target di sini karena itu dinyatakan pada peluang TERAMATI dan
   * disetel 0.80: cukup sering benar untuk tetap berjalan, cukup sering salah untuk ada yang
   * dipelajari.
   *
   * Kebalikan dari successProbability, dengan lantai tebakan ikut dibuka:
   *
   *   b = θ - logit((p - c) / (1 - c)) / a
   *
   * Target di bawah lantai tebakan tidak punya arti (peluangnya tidak bisa turun di bawah c),
   * jadi ia dijepit dulu.
   */
  var TARGET_SUCCESS = 0.8;
  function optimalDifficulty(ability, targetSuccess, discrimination) {
    var p = clamp(num(targetSuccess, TARGET_SUCCESS), GUESS_FLOOR + 0.05, 0.97);
    var a = num(discrimination, DISCRIMINATION) || DISCRIMINATION;
    var latent = clamp((p - GUESS_FLOOR) / (1 - GUESS_FLOOR), 0.01, 0.99);
    return round(num(ability) - Math.log(latent / (1 - latent)) / a, 3);
  }

  /**
   * Pita kesulitan yang layak dipakai, dijepit ke tingkat soal yang benar-benar ada (1..6).
   *
   * Ketiga batasnya dinyatakan sebagai PELUANG, bukan sebagai "level ± 1", karena satu
   * tingkat CEFR berarti hal yang berbeda bagi murid yang berbeda:
   *
   *   - floor   p=0.90  latihan pemulihan; nyaris pasti bisa, dipakai saat ritme rapuh
   *   - target  p=0.80  titik belajar paling efisien
   *   - ceiling p=0.55  peregangan yang disengaja; masih jauh di atas lantai tebakan 0.25
   *
   * `band` memberi nama pedagogisnya supaya naskah untuk murid tidak perlu menerjemahkan
   * angka sendiri.
   */
  function challengeWindow(ability, options) {
    var opts = options || {};
    var target = optimalDifficulty(ability, opts.targetSuccess, opts.discrimination);
    var low = optimalDifficulty(ability, 0.9, opts.discrimination);
    var high = optimalDifficulty(ability, 0.55, opts.discrimination);
    var pick = clamp(Math.round(target), 1, 6);
    var window_ = {
      targetDifficulty: pick,
      exactDifficulty: target,
      floor: clamp(Math.round(low), 1, 6),
      ceiling: clamp(Math.round(high), 1, 6),
      floorExact: low,
      ceilingExact: high,
      predictedSuccess: round(successProbability(ability, pick, opts.discrimination), 3)
    };
    window_.band = difficultyBand(pick, window_);
    return window_;
  }

  /**
   * Nama pedagogis untuk sebuah tingkat kesulitan, dibandingkan terhadap PITA MURID INI.
   *
   * Dibandingkan terhadap batas PECAHAN (floorExact/ceilingExact), bukan batas yang sudah
   * dibulatkan. Skala CEFR cuma punya enam titik bulat, jadi pembulatan sering membuat
   * floor, target, dan ceiling jatuh ke angka yang sama - dan saat itu terjadi, setiap sesi
   * akan berlabel "foundation" tanpa peduli apa yang sebenarnya dipilih. Label yang selalu
   * sama adalah label yang tidak memberi tahu apa pun.
   */
  function difficultyBand(picked, window_) {
    var w = window_ || {};
    var pick = num(picked);
    if (w.floorExact != null && pick <= num(w.floorExact)) return 'foundation';
    if (w.ceilingExact != null && pick >= num(w.ceilingExact)) return 'stretch';
    return 'standard';
  }

  // =====================================================================================
  // C. MODEL INGATAN PARUH-WAKTU
  // =====================================================================================
  /**
   * Paruh-waktu ingatan sebuah materi, dalam hari.
   *
   * Rumus lama memakai satu `stability` yang naik pelan dan tidak membedakan apa pun. Model
   * ini memakai tiga hal yang memang berbeda pengaruhnya, dan arah pengaruhnya bisa
   * dipertahankan di depan siapa pun:
   *
   *   - PENGULANGAN BERHASIL menaikkan paruh-waktu secara EKSPONENSIAL (jarak antar-ulangan
   *     yang berhasil melebar, bukan bertambah tetap). Inilah inti spaced repetition.
   *   - KESALAHAN (lapse) memotongnya tajam. Materi yang baru saja dilupakan harus kembali
   *     ke jarak pendek, bukan melanjutkan jadwal seolah tidak terjadi apa-apa.
   *   - KESULITAN materi menekan paruh-waktunya. Materi sulit memang lebih cepat luntur.
   */
  var BASE_HALF_LIFE_DAYS = 1.6;
  function halfLife(item) {
    var it = item || {};
    var reps = clamp(it.successes, 0, 40);
    var lapses = clamp(it.lapses, 0, 40);
    var difficulty = clamp(it.difficulty == null ? 3 : it.difficulty, 1, 6);
    var growth = Math.pow(1.9, reps);
    var lapsePenalty = Math.pow(0.55, lapses);
    var difficultyPenalty = Math.pow(0.9, difficulty - 1);
    return round(clamp(BASE_HALF_LIFE_DAYS * growth * lapsePenalty * difficultyPenalty, 0.2, 365), 3);
  }

  /** Peluang materi masih bisa ditarik dari ingatan setelah `ageDays`. 2^(-t/h). */
  function retrievability(halfLifeDays, ageDays) {
    var h = Math.max(0.05, num(halfLifeDays, BASE_HALF_LIFE_DAYS));
    return round(Math.pow(2, -Math.max(0, num(ageDays)) / h), 4);
  }

  /**
   * Jarak sampai ulangan berikutnya, dipilih dari TARGET RETENSI, bukan dari tabel jarak.
   * Mengulang saat retensi masih 0.99 membuang waktu; menunggu sampai 0.5 berarti belajar
   * ulang dari awal. 0.9 adalah titik di mana satu pengulangan masih murah tetapi sudah
   * benar-benar memperkuat.
   */
  function nextReviewGapDays(halfLifeDays, targetRetention) {
    var target = clamp(num(targetRetention, 0.9), 0.5, 0.99);
    var h = Math.max(0.05, num(halfLifeDays, BASE_HALF_LIFE_DAYS));
    return round(-h * Math.log2(target), 3);
  }

  /**
   * Mengurutkan materi menurut MANFAAT mengulangnya sekarang, bukan menurut jatuh tempo.
   *
   * Manfaat tertinggi ada di materi yang berada di ambang lupa: retensi ~0.6-0.85. Materi
   * yang retensinya masih 0.98 belum perlu disentuh, dan materi yang sudah 0.2 praktis harus
   * dipelajari ulang - keduanya bukan "review" yang efisien. Puncak di 0.75 itulah yang
   * dikejar skor di bawah.
   */
  function reviewPriority(items, options) {
    var opts = options || {};
    var now = num(opts.now, Date.now()) || Date.now();
    return (Array.isArray(items) ? items : []).map(function (raw) {
      var item = raw || {};
      var h = item.halfLifeDays == null ? halfLife(item) : num(item.halfLifeDays, BASE_HALF_LIFE_DAYS);
      var ageDays = Math.max(0, (now - num(item.lastSeenAt, now)) / 86400000);
      var r = retrievability(h, ageDays);
      // Puncak di 0.75, turun mulus ke kedua arah.
      var urgency = Math.exp(-Math.pow((r - 0.75) / 0.22, 2));
      var weight = clamp(item.weight == null ? 1 : item.weight, 0.2, 3);
      return {
        id: str(item.id),
        domain: str(item.domain),
        skill: str(item.skill),
        halfLifeDays: h,
        ageDays: round(ageDays, 3),
        retrievability: r,
        dueInDays: round(nextReviewGapDays(h, opts.targetRetention) - ageDays, 3),
        score: round(urgency * weight, 4)
      };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  // =====================================================================================
  // D. TREN DAN MOMENTUM
  // =====================================================================================
  /** Regresi kuadrat terkecil pada deret berindeks 0..n-1. Mengembalikan slope dan r². */
  function trend(series) {
    var ys = (Array.isArray(series) ? series : []).map(function (v) { return num(v); });
    var n = ys.length;
    if (n < 2) return { slope: 0, intercept: n ? ys[0] : 0, r2: 0, n: n };
    var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (var i = 0; i < n; i++) { sumX += i; sumY += ys[i]; sumXY += i * ys[i]; sumXX += i * i; }
    var denom = n * sumXX - sumX * sumX;
    var slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    var intercept = (sumY - slope * sumX) / n;
    var mean = sumY / n;
    var ssTot = 0, ssRes = 0;
    for (var j = 0; j < n; j++) {
      var predicted = intercept + slope * j;
      ssTot += Math.pow(ys[j] - mean, 2);
      ssRes += Math.pow(ys[j] - predicted, 2);
    }
    return { slope: round(slope, 4), intercept: round(intercept, 4), r2: round(ssTot === 0 ? 0 : 1 - ssRes / ssTot, 4), n: n };
  }

  /**
   * Arah belajar pada satu skill, dibaca dari akurasi per blok jawaban.
   *
   * Dipotong menjadi BLOK, bukan per jawaban: satu jawaban adalah lemparan koin, blok lima
   * jawaban adalah sinyal. Tanpa pemblokan, slope akan didominasi derau dan setiap murid akan
   * terlihat "membaik" atau "memburuk" bergantian setiap sesi.
   */
  var MOMENTUM_BLOCK = 5;
  var MOMENTUM_MIN_ATTEMPTS = 10;
  function momentum(attempts, options) {
    var opts = options || {};
    var block = Math.max(3, Math.round(num(opts.block, MOMENTUM_BLOCK)));
    var rows = (Array.isArray(attempts) ? attempts : []).slice(-40);
    if (rows.length < MOMENTUM_MIN_ATTEMPTS) {
      return { state: 'unknown', slope: 0, r2: 0, blocks: 0, attempts: rows.length, confidence: 0 };
    }
    var series = [];
    for (var i = 0; i + block <= rows.length; i += block) {
      var chunk = rows.slice(i, i + block);
      var correct = 0;
      for (var j = 0; j < chunk.length; j++) if (chunk[j] && chunk[j].ok) correct++;
      series.push(correct / chunk.length);
    }
    if (series.length < 2) return { state: 'unknown', slope: 0, r2: 0, blocks: series.length, attempts: rows.length, confidence: 0 };
    var fit = trend(series);
    // Ambang 0.04 per blok ≈ 4 poin akurasi per lima soal: cukup besar untuk bukan derau.
    var state = fit.slope >= 0.04 ? 'improving' : fit.slope <= -0.04 ? 'declining' : 'plateau';
    return {
      state: state,
      slope: fit.slope,
      r2: fit.r2,
      blocks: series.length,
      attempts: rows.length,
      latest: round(series[series.length - 1], 3),
      confidence: round(clamp(series.length / 6, 0, 1) * clamp(0.35 + fit.r2 * 0.65, 0, 1), 3)
    };
  }

  // =====================================================================================
  // E. GRAF PRASYARAT SKILL
  // =====================================================================================
  /**
   * Prasyarat antar-KELUARGA grammar, bukan antar-129-subskill.
   *
   * Alasannya bukan kemalasan: daftar 129 baris akan basi pada penambahan materi berikutnya
   * dan tidak ada yang akan memeliharanya. Keluarga jauh lebih stabil, dan URUTAN CEFR DI
   * DALAM keluarga sudah menangani kedalaman (A2 sebelum B2) tanpa perlu ditulis satu per
   * satu. Dua lapis itu bersama-sama menjawab pertanyaan yang benar: "sebelum ini, apa yang
   * harus sudah bisa?"
   */
  var PREREQUISITES = Object.freeze({
    tense_aspect: Object.freeze([]),
    question_negation: Object.freeze(['tense_aspect']),
    articles_determiners: Object.freeze([]),
    prepositions: Object.freeze([]),
    comparison: Object.freeze(['articles_determiners']),
    modals: Object.freeze(['tense_aspect']),
    passive: Object.freeze(['tense_aspect']),
    conditionals: Object.freeze(['tense_aspect', 'modals']),
    reported_speech: Object.freeze(['tense_aspect', 'question_negation']),
    gerunds_infinitives: Object.freeze(['prepositions']),
    relative_clauses: Object.freeze(['question_negation']),
    linking_devices: Object.freeze(['relative_clauses']),
    emphasis_inversion: Object.freeze(['relative_clauses', 'question_negation']),
    error_correction: Object.freeze(['tense_aspect', 'articles_determiners']),
    core_grammar: Object.freeze([]),
    advanced_grammar: Object.freeze(['conditionals', 'passive', 'relative_clauses'])
  });

  /** Semua prasyarat sebuah keluarga, terdalam dulu. Siklus dipagari oleh daftar `seen`. */
  function prerequisiteChain(family) {
    var out = [];
    var seen = {};
    var queue = [str(family)];
    var guard = 0;
    while (queue.length && guard++ < 32) {
      var current = queue.shift();
      var parents = PREREQUISITES[current] || [];
      for (var i = 0; i < parents.length; i++) {
        if (seen[parents[i]]) continue;
        seen[parents[i]] = true;
        out.push(parents[i]);
        queue.push(parents[i]);
      }
    }
    return out;
  }

  /**
   * Akar masalah dari sebuah skill lemah.
   *
   * Aturannya sengaja konservatif: prasyarat hanya menggantikan gejala kalau ia TERUKUR
   * (punya cukup bukti) dan NYATA LEBIH LEMAH (selisih penguasaan berarti). Tanpa dua syarat
   * itu, sistem akan sibuk melatih materi dasar yang sebenarnya sudah dikuasai - dan bagi
   * murid itu terasa seperti dihukum karena salah di materi sulit.
   */
  var ROOT_CAUSE_MIN_ATTEMPTS = 4;
  var ROOT_CAUSE_MASTERY_GAP = 12;
  function rootCause(target, evidence) {
    var symptomFamily = str(target && target.family);
    var symptomSkill = str(target && target.skill);
    var rows = Array.isArray(evidence) ? evidence : [];
    var byFamily = {};
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || {};
      var family = str(row.family);
      if (!family) continue;
      var bucket = byFamily[family] || (byFamily[family] = { attempts: 0, mastery: 0, weight: 0, skill: '', worst: Infinity });
      var attempts = clamp(row.attempts, 0, 1e6);
      var mastery = clamp(row.mastery, 0, 100);
      bucket.attempts += attempts;
      bucket.mastery += mastery * Math.max(1, attempts);
      bucket.weight += Math.max(1, attempts);
      if (attempts >= ROOT_CAUSE_MIN_ATTEMPTS && mastery < bucket.worst) { bucket.worst = mastery; bucket.skill = str(row.skill); }
    }
    for (var key in byFamily) {
      if (Object.prototype.hasOwnProperty.call(byFamily, key)) byFamily[key].mastery = byFamily[key].mastery / (byFamily[key].weight || 1);
    }
    var symptomMastery = byFamily[symptomFamily] ? byFamily[symptomFamily].mastery : clamp(target && target.mastery, 0, 100);
    var chain = prerequisiteChain(symptomFamily);
    var best = null;
    for (var c = 0; c < chain.length; c++) {
      var candidate = byFamily[chain[c]];
      if (!candidate || candidate.attempts < ROOT_CAUSE_MIN_ATTEMPTS) continue;
      if (candidate.mastery > symptomMastery - ROOT_CAUSE_MASTERY_GAP) continue;
      if (!best || candidate.mastery < best.mastery) best = { family: chain[c], mastery: candidate.mastery, skill: candidate.skill, attempts: candidate.attempts };
    }
    if (!best) {
      return { family: symptomFamily, skill: symptomSkill, isRoot: true, via: 'symptom', chain: chain, rationale: chain.length ? 'prerequisites_healthy' : 'no_prerequisites' };
    }
    return {
      family: best.family,
      skill: best.skill || best.family,
      isRoot: false,
      via: 'prerequisite',
      symptomFamily: symptomFamily,
      symptomSkill: symptomSkill,
      gap: round(symptomMastery - best.mastery, 2),
      chain: chain,
      rationale: 'weaker_prerequisite'
    };
  }

  // =====================================================================================
  // F. PROFIL WAKTU BELAJAR
  // =====================================================================================
  /**
   * Jam berapa murid ini benar-benar produktif.
   *
   * Dipakai untuk memilih waktu pengingat. Syarat buktinya sengaja tinggi (MIN_PER_BUCKET):
   * memindahkan pengingat ke jam yang ternyata salah lebih merugikan daripada tidak
   * memindahkannya sama sekali - murid berhenti mempercayai pengingatnya.
   */
  var CHRONO_BUCKETS = Object.freeze([
    { id: 'pagi', from: 5, to: 11 },
    { id: 'siang', from: 11, to: 15 },
    { id: 'sore', from: 15, to: 19 },
    { id: 'malam', from: 19, to: 23 }
  ]);
  var CHRONO_MIN_PER_BUCKET = 12;
  function studyWindows(attempts, options) {
    var opts = options || {};
    var hourOf = typeof opts.hourOf === 'function' ? opts.hourOf : function (at) { return new Date(num(at)).getHours(); };
    var rows = Array.isArray(attempts) ? attempts : [];
    var buckets = CHRONO_BUCKETS.map(function (b) { return { id: b.id, from: b.from, to: b.to, attempts: 0, correct: 0 }; });
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || {};
      var hour = clamp(hourOf(row.at), 0, 23);
      for (var b = 0; b < buckets.length; b++) {
        if (hour >= buckets[b].from && hour < buckets[b].to) { buckets[b].attempts++; if (row.ok) buckets[b].correct++; break; }
      }
    }
    var scored = buckets.map(function (b) {
      return {
        id: b.id, from: b.from, to: b.to, attempts: b.attempts,
        accuracy: b.attempts ? round((b.correct / b.attempts) * 100, 1) : null,
        measured: b.attempts >= CHRONO_MIN_PER_BUCKET
      };
    });
    var measured = scored.filter(function (b) { return b.measured; });
    measured.sort(function (a, b) { return b.accuracy - a.accuracy; });
    return {
      buckets: scored,
      best: measured[0] || null,
      worst: measured.length > 1 ? measured[measured.length - 1] : null,
      // Selisih di bawah 8 poin bukan perbedaan waktu, hanya derau.
      confident: !!(measured.length >= 2 && measured[0].accuracy - measured[measured.length - 1].accuracy >= 8)
    };
  }

  // =====================================================================================
  // G. BEBAN KOGNITIF DALAM SESI
  // =====================================================================================
  /**
   * Kelelahan di dalam satu sesi, dari DUA sinyal sekaligus - dan itu penting.
   *
   * Waktu jawab yang memanjang saja bisa berarti murid sedang berpikir lebih dalam (itu bagus).
   * Akurasi yang turun saja bisa berarti soalnya kebetulan lebih sulit. Yang benar-benar
   * menandakan sesi harus disudahi adalah keduanya bergerak berlawanan: lebih lambat DAN
   * lebih sering salah.
   */
  var FATIGUE_MIN_ATTEMPTS = 8;
  function fatigue(sessionAttempts) {
    var rows = (Array.isArray(sessionAttempts) ? sessionAttempts : []).filter(Boolean);
    if (rows.length < FATIGUE_MIN_ATTEMPTS) return { state: 'unknown', level: 0, attempts: rows.length, rationale: 'insufficient_evidence' };
    var half = Math.floor(rows.length / 2);
    var first = rows.slice(0, half);
    var last = rows.slice(rows.length - half);
    var meanMs = function (xs) {
      var total = 0;
      for (var i = 0; i < xs.length; i++) total += clamp(xs[i].ms, 0, 300000);
      return xs.length ? total / xs.length : 0;
    };
    var accuracy = function (xs) {
      var correct = 0;
      for (var i = 0; i < xs.length; i++) if (xs[i].ok) correct++;
      return xs.length ? correct / xs.length : 0;
    };
    var msDrift = meanMs(first) > 0 ? (meanMs(last) - meanMs(first)) / meanMs(first) : 0;
    var accDrift = accuracy(last) - accuracy(first);
    var slowing = clamp(msDrift / 0.5, 0, 1);
    var slipping = clamp(-accDrift / 0.25, 0, 1);
    var level = round(slowing * slipping, 3);
    return {
      state: level >= 0.45 ? 'fatigued' : level >= 0.2 ? 'tiring' : 'fresh',
      level: level,
      responseDrift: round(msDrift, 3),
      accuracyDrift: round(accDrift, 3),
      attempts: rows.length,
      rationale: level >= 0.2 ? 'slower_and_less_accurate' : 'stable_within_session'
    };
  }

  // =====================================================================================
  // PERENCANA SESI — menyatukan ketujuhnya
  // =====================================================================================
  /**
   * Satu keputusan sesi dari seluruh model di atas.
   *
   * Bentuk keluarannya sengaja SEJAJAR dengan fiezel-adaptive-policy-v1 yang sudah dipakai
   * app.js dan Core Worker (sessionSize, targetDifficulty, difficultyBand, reviewShare,
   * pace), supaya lapisan ini bisa memperkuat kebijakan yang ada tanpa memaksa protokolnya
   * berubah - dan supaya ia bisa dimatikan tanpa mematikan aplikasi.
   */
  function planSession(signals) {
    var s = signals || {};
    var ability = s.ability || { ability: 1.5, confidence: 0 };
    var window_ = challengeWindow(ability.ability, { targetSuccess: s.targetSuccess });
    var move = s.momentum || { state: 'unknown', confidence: 0 };
    var tired = s.fatigue || { state: 'unknown', level: 0 };
    var dueCount = clamp(s.dueReviews, 0, 100000);
    var atRisk = clamp(s.atRiskReviews, 0, 100000);
    var abandonment = clamp(s.abandonmentRate, 0, 100);
    var rationale = [];

    // Ukuran sesi berangkat dari ritme yang terbukti diselesaikan murid ini, bukan dari
    // angka tetap: sesi yang tidak pernah selesai tidak menghasilkan bukti apa pun.
    var size = 12;
    if (ability.confidence < 0.25) { size = 10; rationale.push('building_evidence'); }
    if (abandonment >= 30) { size = Math.min(size, 7); rationale.push('abandonment_risk'); }
    if (tired.state === 'fatigued') { size = Math.min(size, 6); rationale.push('cognitive_load_high'); }
    else if (tired.state === 'tiring') { size = Math.min(size, 9); rationale.push('cognitive_load_rising'); }
    if (move.state === 'improving' && move.confidence >= 0.5 && tired.state !== 'fatigued') { size = Math.min(16, size + 2); rationale.push('momentum_positive'); }

    // Kesulitan: jendela optimal, lalu digeser oleh arah belajar. Plateau yang meyakinkan
    // adalah alasan untuk MENGUBAH kesulitan, bukan mengulang hal yang sama lebih banyak -
    // mengulang persis yang sudah mandek adalah definisi mandek itu sendiri.
    var difficulty = window_.targetDifficulty;
    if (move.state === 'declining' && move.confidence >= 0.4) { difficulty = Math.max(window_.floor, difficulty - 1); rationale.push('trend_declining'); }
    else if (move.state === 'plateau' && move.confidence >= 0.5) { difficulty = Math.min(window_.ceiling, difficulty + 1); rationale.push('plateau_break'); }
    else if (move.state === 'improving' && move.confidence >= 0.6) { difficulty = Math.min(window_.ceiling, difficulty + 1); rationale.push('trend_improving'); }
    difficulty = clamp(difficulty, 1, 6);
    // Label dihitung ULANG setelah pergeseran. Memakai label dari jendela awal berarti sesi
    // yang sengaja diturunkan tetap berbunyi "standard" kepada murid.
    var band = difficultyBand(difficulty, window_);

    // Porsi review dari materi yang BENAR-BENAR di ambang lupa, bukan dari jumlah jatuh tempo.
    // Seratus item "due" yang retensinya masih 0.95 bukan seratus alasan untuk mengulang.
    var reviewShare = 0.25;
    if (atRisk > 0) reviewShare = clamp(0.25 + atRisk / Math.max(6, dueCount || atRisk) * 0.4, 0.25, 0.65);
    if (atRisk >= 6) { reviewShare = Math.max(reviewShare, 0.55); rationale.push('memory_at_risk'); }
    if (ability.confidence < 0.25) { reviewShare = Math.min(reviewShare, 0.15); rationale.push('need_fresh_evidence'); }

    var pace = (tired.state === 'fatigued' || abandonment >= 30) ? 'calm' : 'normal';
    if (!rationale.length) rationale.push('steady_progression');

    return {
      schema: SCHEMA,
      sessionSize: clamp(Math.round(size), 5, 16),
      targetDifficulty: difficulty,
      difficultyBand: band,
      predictedSuccess: round(successProbability(ability.ability, difficulty), 3),
      reviewShare: round(reviewShare, 3),
      pace: pace,
      // Interleaving hanya dinyalakan saat ada cukup bukti bahwa dasarnya sudah berdiri:
      // mencampur materi terlalu dini menaikkan beban tanpa menaikkan retensi.
      interleave: ability.confidence >= 0.4 && move.state !== 'declining',
      confidence: round(Math.min(ability.confidence, 1), 3),
      rationale: rationale
    };
  }

  /**
   * Satu potret utuh: dari riwayat mentah ke keputusan sesi.
   *
   * `attempts` adalah baris riwayat aplikasi apa adanya ({at, ok, ms, type, skill, family,
   * difficulty}), sehingga pemanggil tidak perlu menyiapkan bentuk khusus - bentuk khusus
   * adalah tempat sinkronisasi diam-diam rusak.
   */
  function analyze(input) {
    var data = input || {};
    var now = num(data.now, Date.now()) || Date.now();
    var attempts = Array.isArray(data.attempts) ? data.attempts : [];
    var ability = estimateAbility(attempts, { now: now, prior: data.priorAbility });
    var byDomain = {};
    ['vocab', 'grammar', 'reading'].forEach(function (domain) {
      var rows = attempts.filter(function (row) { return row && str(row.type) === domain; });
      byDomain[domain] = {
        ability: estimateAbility(rows, { now: now, prior: ability.ability }),
        momentum: momentum(rows)
      };
    });
    var reviews = reviewPriority(data.memory || [], { now: now, targetRetention: data.targetRetention });
    var atRisk = reviews.filter(function (row) { return row.retrievability <= 0.85 && row.retrievability >= 0.35; });
    var plan = planSession({
      ability: ability,
      momentum: momentum(attempts),
      fatigue: fatigue(data.sessionAttempts || attempts.slice(-16)),
      dueReviews: reviews.length,
      atRiskReviews: atRisk.length,
      abandonmentRate: data.abandonmentRate,
      targetSuccess: data.targetSuccess
    });
    return {
      schema: SCHEMA,
      generatedAt: new Date(now).toISOString(),
      ability: ability,
      domains: byDomain,
      momentum: momentum(attempts),
      fatigue: fatigue(data.sessionAttempts || attempts.slice(-16)),
      challenge: challengeWindow(ability.ability, { targetSuccess: data.targetSuccess }),
      memory: { total: reviews.length, atRisk: atRisk.length, top: reviews.slice(0, 8) },
      chronotype: studyWindows(attempts, { hourOf: data.hourOf }),
      rootCause: data.weakTarget ? rootCause(data.weakTarget, data.skillEvidence) : null,
      plan: plan
    };
  }

  // =====================================================================================
  // PENYEMPURNAAN KEBIJAKAN — v2 memperkuat v1, tidak menggantikannya
  // =====================================================================================
  /**
   * Menyempurnakan kebijakan `fiezel-adaptive-policy-v1` dengan hasil penalaran v2.
   *
   * Disengaja sebagai LAPISAN, bukan pengganti, karena tiga alasan yang semuanya praktis:
   *
   *   1. Protokol 1.7 antara aplikasi dan Core Worker sudah berjalan di atas skema v1.
   *      Mengganti skemanya berarti satu rilis di mana klien lama dan worker baru saling
   *      tidak mengerti - dan murid yang aplikasinya belum sempat diperbarui berhenti
   *      mendapat kebijakan sama sekali.
   *   2. v1 memegang hal-hal yang TIDAK dilihat v2: mode pemulihan, riwayat hasil kebijakan
   *      sebelumnya, jatah materi baru. Membuangnya berarti mundur, bukan maju.
   *   3. Lapisan bisa dimatikan. Kalau v2 keliru pada suatu perangkat, kebijakan v1 tetap
   *      utuh di bawahnya - bukan aplikasi tanpa kebijakan.
   *
   * BUKTI TIPIS BERARTI HANYA MELAPOR. Di bawah ambang keyakinan, v2 tidak mengambil satu
   * keputusan pun; ia hanya menempelkan ringkasannya supaya layar diagnostik tetap bisa
   * menunjukkan apa yang sedang dikumpulkan.
   */
  var REFINE_MIN_CONFIDENCE = 0.25;
  function refinePolicy(policy, snapshot) {
    var base = policy || {};
    var out = {};
    for (var key in base) if (Object.prototype.hasOwnProperty.call(base, key)) out[key] = base[key];
    var brain = snapshot || {};
    var plan = brain.plan;
    var digest = {
      schema: SCHEMA,
      ability: brain.ability ? brain.ability.ability : null,
      abilityLevel: brain.ability ? brain.ability.level : null,
      confidence: plan ? num(plan.confidence) : 0,
      momentum: brain.momentum ? brain.momentum.state : 'unknown',
      fatigue: brain.fatigue ? brain.fatigue.state : 'unknown',
      predictedSuccess: plan ? num(plan.predictedSuccess) : null,
      atRiskReviews: brain.memory ? num(brain.memory.atRisk) : 0,
      rootCause: brain.rootCause && brain.rootCause.isRoot === false ? brain.rootCause.skill : '',
      applied: false
    };
    if (!plan || digest.confidence < REFINE_MIN_CONFIDENCE) {
      out.brain = digest;
      return out;
    }

    var codes = Array.isArray(base.rationaleCodes) ? base.rationaleCodes.slice() : [];
    var addCode = function (code) { if (codes.indexOf(code) === -1) codes.push(code); };

    // Kesulitan: v2 memegang model kemampuan, jadi di sinilah ia paling berhak. v1 hanya
    // punya "level ± 1" yang tidak pernah melihat peluang benar sesungguhnya.
    out.targetDifficulty = clamp(Math.round(num(plan.targetDifficulty, base.targetDifficulty)), 1, 6);
    out.difficultyBand = str(plan.difficultyBand) || base.difficultyBand;
    addCode('brain_optimal_challenge');

    // Ukuran sesi: yang LEBIH KECIL yang menang. Kedua lapisan hanya memperkecil karena
    // alasan yang nyata (kelelahan, sesi yang ditinggalkan), dan mengabaikan salah satunya
    // berarti mengabaikan alasan itu.
    out.sessionSize = clamp(Math.min(num(base.sessionSize, plan.sessionSize), num(plan.sessionSize)), 5, 16);

    // Porsi review: v2 tahu materi mana yang benar-benar di ambang lupa, v1 hanya tahu
    // jumlah jatuh tempo. Yang lebih besar dipakai supaya mode 'review' milik v1 tidak
    // pernah diperkecil diam-diam oleh lapisan ini.
    out.reviewShare = clamp(Math.max(num(base.reviewShare), num(plan.reviewShare)), 0, 1);

    if (plan.pace === 'calm' || base.pace === 'calm') out.pace = 'calm';
    if (brain.momentum && brain.momentum.state !== 'unknown') addCode('brain_trend_' + brain.momentum.state);
    if (brain.fatigue && brain.fatigue.state === 'fatigued') addCode('brain_cognitive_load');
    if (digest.atRiskReviews > 0) addCode('brain_memory_at_risk');

    // Akar masalah menggantikan gejala HANYA bila grafnya menemukan prasyarat yang memang
    // lebih lemah dan memang terukur - syaratnya dijaga di rootCause(), bukan di sini.
    if (brain.rootCause && brain.rootCause.isRoot === false && brain.rootCause.skill) {
      out.targetSkill = str(brain.rootCause.skill).slice(0, 80);
      addCode('brain_root_cause');
    }

    out.rationaleCodes = codes.slice(0, 12);
    out.estimatedMinutes = Math.max(5, Math.round(out.sessionSize * (out.pace === 'calm' ? 1.25 : 1)));
    digest.applied = true;
    out.brain = digest;
    return out;
  }

  return {
    schema: SCHEMA,
    REFINE_MIN_CONFIDENCE: REFINE_MIN_CONFIDENCE,
    refinePolicy: refinePolicy,
    LEVELS: LEVELS,
    DISCRIMINATION: DISCRIMINATION,
    GUESS_FLOOR: GUESS_FLOOR,
    TARGET_SUCCESS: TARGET_SUCCESS,
    PREREQUISITES: PREREQUISITES,
    MOMENTUM_BLOCK: MOMENTUM_BLOCK,
    levelIndex: levelIndex,
    successProbability: successProbability,
    estimateAbility: estimateAbility,
    optimalDifficulty: optimalDifficulty,
    challengeWindow: challengeWindow,
    difficultyBand: difficultyBand,
    halfLife: halfLife,
    retrievability: retrievability,
    nextReviewGapDays: nextReviewGapDays,
    reviewPriority: reviewPriority,
    trend: trend,
    momentum: momentum,
    prerequisiteChain: prerequisiteChain,
    rootCause: rootCause,
    studyWindows: studyWindows,
    fatigue: fatigue,
    planSession: planSession,
    analyze: analyze
  };
});
