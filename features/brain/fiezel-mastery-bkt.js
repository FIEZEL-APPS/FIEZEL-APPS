/**
 * FIEZEL Mastery BKT — penguasaan per-lesson + ZPD frontier (Braincore v3, P3).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Core Brain v2 memodelkan kemampuan grammar sebagai SATU angka theta per domain. Itu
 * cukup untuk memilih kesulitan sesi, tetapi buta terhadap bentuk sebenarnya dari
 * pengetahuan murid: seseorang bisa kuat di tenses dan sekaligus lemah di conditionals,
 * dan rata-rata dari keduanya tidak menggambarkan siapa pun. Padahal graf prasyarat
 * 139-lesson sudah ada — yang hilang hanyalah pelacak penguasaan PER LESSON.
 *
 * Pilihan modelnya Bayesian Knowledge Tracing klasik (Corbett & Anderson 1995), bukan
 * model neural: BKT yang dirawat baik menyamai DKT pada benchmark umum, sepenuhnya bisa
 * dihitung di klien tanpa biaya runtime, dan setiap angkanya bisa dijelaskan — cocok
 * dengan budaya rationale-code FIEZEL.
 *
 * EMPAT PARAMETER, DAN KENAPA NILAINYA BEGITU
 * -------------------------------------------
 *   L0 = 0.20  peluang murid SUDAH menguasai lesson sebelum bukti pertama. Rendah,
 *              karena kurikulum menyajikan materi yang memang belum dikuasai.
 *   T  = 0.15  peluang transisi belajar per kesempatan: setiap latihan adalah momen
 *              belajar, terlepas dari benar-salahnya jawaban.
 *   s  = 0.10  slip: murid yang SUDAH menguasai tetap bisa salah (salah klik, terburu).
 *   g  = 0.25  guess: lantai tebakan pilihan-ganda 4 opsi. Tanpa g, satu jawaban benar
 *              hasil menebak akan terbaca sebagai bukti penguasaan — itulah kenapa
 *              heuristik akurasi-mentah v2 mudah tertipu.
 *
 * PEMBARUAN BAYES (per observasi pada lesson k):
 *   P(L|benar) = L(1-s) / (L(1-s) + (1-L)g)
 *   P(L|salah) = L·s    / (L·s    + (1-L)(1-g))
 *   L'         = P(L|obs) + (1 - P(L|obs))·T
 *
 * BOBOT BUKTI (weight, opsional 0..1.5)
 * -------------------------------------
 * Tidak semua bukti setara: jawaban produksi (mengetik sendiri) jauh lebih diagnostik
 * daripada recognition (weight 1.5), sedangkan jawaban yang tercium sebagai tebakan
 * hampir tidak membawa informasi (weight 0.3, selaras kappa FiezelEvidenceCredibility).
 * Penskalaan dilakukan di RUANG LOG-ODDS, bukan pada L langsung: langkah Bayes adalah
 * pergeseran logit, jadi menskalakan pergeseran itulah satu-satunya cara yang menjaga
 * weight=1 identik dengan BKT klasik dan weight=0 identik dengan "tidak ada bukti":
 *   L_baru = sigmoid( logit(L) + weight · (logit(L'_klasik) - logit(L)) )
 * Bukti dengan weight <= 0 tidak dihitung sama sekali (n tidak naik): bukti tanpa
 * kredibilitas tidak boleh ikut memenuhi gerbang kepercayaan >= 5 observasi.
 *
 * GERBANG MASTERY: L >= 0.95 (ambang kanonik Corbett & Anderson) DAN n >= 5. Syarat n
 * adalah gerbang kepercayaan: L=0.96 dari dua observasi belum boleh dipercaya
 * menggantikan heuristik v2 yang sudah teruji.
 *
 * ZPD FRONTIER: lesson layak-saji = SEMUA prasyaratnya lolos gerbang mastery DAN
 * prediksi peluang benar dari model kemampuan ada di [0.55, 0.90] — terlalu mudah tidak
 * mengajarkan apa pun, terlalu sulit hanya mengajarkan rasa gagal (Wood–Bruner–Ross).
 *
 * ROOT CAUSE: prasyarat (langsung maupun transitif) dengan L terendah yang gagal
 * gerbang — probabilistik, menggantikan ambang gap-12-poin v2 yang tidak membedakan
 * gap berbukti 4 attempt dari gap berbukti 40 attempt.
 *
 * Modul MURNI: tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa jam internal —
 * waktu selalu argumen. State milik pemanggil TIDAK PERNAH dimutasi.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelMasteryBKT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-mastery-bkt-v1';

  // Parameter BKT klasik — nilai dan alasannya di komentar kepala berkas.
  var PARAMS = Object.freeze({ L0: 0.2, T: 0.15, slip: 0.1, guess: 0.25 });

  // Gerbang mastery: ambang posterior + gerbang kepercayaan jumlah observasi.
  var GATE = Object.freeze({ L: 0.95, minN: 5 });

  // Jendela ZPD untuk frontier: peluang benar prediksi harus di dalam rentang ini.
  var ZPD = Object.freeze({ lo: 0.55, hi: 0.9 });

  // Batas bobot bukti. 1.5 = bukti produksi; 0.3 = tebakan; 1 = default recognition.
  var WEIGHT_MAX = 1.5;

  // Pagar numerik: logit(0) dan logit(1) tak hingga, jadi L dikurung sedikit dari tepi.
  var EPS = 1e-6;

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  function num(x, fallback) { return typeof x === 'number' && isFinite(x) ? x : fallback; }
  function str(x) { return typeof x === 'string' ? x.trim() : (x == null ? '' : String(x).trim()); }
  function logit(p) { var q = clamp(p, EPS, 1 - EPS); return Math.log(q / (1 - q)); }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  /**
   * Bentuk kanonik state. State boleh null/korup — pemanggil (localStorage bisa berisi
   * apa saja setelah update aplikasi) tidak boleh bisa membuat modul ini melempar.
   */
  function normalizeState(st) {
    var lessons = (st && typeof st === 'object' && st.lessons && typeof st.lessons === 'object') ? st.lessons : {};
    return { schema: SCHEMA, lessons: lessons };
  }

  /** Rekaman satu lesson dalam bentuk aman: angka korup jatuh ke default yang jujur. */
  function readLesson(lessons, id) {
    var row = lessons && typeof lessons === 'object' ? lessons[id] : null;
    if (!row || typeof row !== 'object') return { L: PARAMS.L0, n: 0, lastAt: 0 };
    return {
      L: clamp(num(row.L, PARAMS.L0), EPS, 1 - EPS),
      n: Math.max(0, Math.floor(num(row.n, 0))),
      lastAt: Math.max(0, num(row.lastAt, 0))
    };
  }

  /** Langkah BKT klasik: posterior Bayes lalu transisi belajar. */
  function bktStep(L, correct) {
    var s = PARAMS.slip, g = PARAMS.guess;
    var posterior = correct
      ? (L * (1 - s)) / (L * (1 - s) + (1 - L) * g)
      : (L * s) / (L * s + (1 - L) * (1 - g));
    return posterior + (1 - posterior) * PARAMS.T;
  }

  /**
   * update(st, {lesson, correct, weight}, nowMs) -> st'
   *
   * Murni dan immutable: st milik pemanggil tidak disentuh; salinan baru dikembalikan.
   * nowMs opsional (aturan v3: waktu selalu argumen, TANPA Date.now fallback) — tanpa
   * nowMs, lastAt lama dipertahankan agar tidak ada jam diam-diam.
   */
  function update(st, obs, nowMs) {
    var base = normalizeState(st);
    var lesson = str(obs && obs.lesson);
    // Observasi tanpa identitas lesson tidak bisa dibukukan; kembalikan salinan utuh
    // (tetap salinan, bukan referensi, supaya kontrak immutability tidak bercabang).
    var next = { schema: SCHEMA, lessons: {} };
    for (var k in base.lessons) next.lessons[k] = base.lessons[k];
    if (!lesson) return next;

    var weight = clamp(num(obs && obs.weight, 1), 0, WEIGHT_MAX);
    // Bukti berbobot nol = bukti tanpa kredibilitas (mis. evidence_mismatch). Ia tidak
    // menggeser L dan TIDAK menaikkan n: gerbang >= 5 observasi harus dihuni bukti nyata.
    if (weight <= 0) return next;

    var prev = readLesson(base.lessons, lesson);
    var classic = bktStep(prev.L, !!(obs && obs.correct));
    // Penskalaan bukti di ruang log-odds: weight=1 persis BKT klasik, weight=0 diam.
    var L2 = sigmoid(logit(prev.L) + weight * (logit(classic) - logit(prev.L)));

    next.lessons[lesson] = {
      L: clamp(L2, EPS, 1 - EPS),
      n: prev.n + 1,
      lastAt: num(nowMs, prev.lastAt)
    };
    return next;
  }

  /** mastery(st, lesson) -> {L, n}. Lesson tak dikenal = prior jujur {L0, 0}. */
  function mastery(st, lesson) {
    var base = normalizeState(st);
    var row = readLesson(base.lessons, str(lesson));
    return { L: row.L, n: row.n };
  }

  /** Gerbang mastery: posterior tinggi SAJA tidak cukup — buktinya juga harus cukup. */
  function masteryGate(st, lesson) {
    var m = mastery(st, lesson);
    return m.L >= GATE.L && m.n >= GATE.minN;
  }

  /**
   * graphRows -> peta lessonId -> [prasyarat]. Menerima dua bentuk yang sama dengan
   * yang di-inject app.js ke setCurriculumGraph: array baris lesson, atau objek
   * {lessons:[...]} persis grammar-curriculum-v1.json. Baris korup dilewati diam-diam.
   */
  function graphIndex(graphRows) {
    var list = Array.isArray(graphRows)
      ? graphRows
      : (graphRows && Array.isArray(graphRows.lessons) ? graphRows.lessons : []);
    var idx = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var row = list[i] || {};
      var id = str(row.lessonId || row.skill || row.subskill || row.id);
      if (!id) continue;
      var parents = [];
      var declared = Array.isArray(row.prerequisites) ? row.prerequisites : [];
      for (var p = 0; p < declared.length; p++) {
        var parent = str(declared[p]);
        if (parent && parent !== id) parents.push(parent);
      }
      idx[id] = parents;
    }
    return idx;
  }

  /** Rantai prasyarat transitif dengan pagar siklus — graf konten bisa saja korup. */
  function prerequisiteChain(idx, lesson) {
    var out = [];
    var seen = Object.create(null);
    var queue = (idx[lesson] || []).slice();
    var guard = 0;
    while (queue.length && guard++ < 512) {
      var current = queue.shift();
      if (seen[current]) continue;
      seen[current] = true;
      out.push(current);
      var parents = idx[current] || [];
      for (var i = 0; i < parents.length; i++) {
        if (!seen[parents[i]]) queue.push(parents[i]);
      }
    }
    return out;
  }

  /**
   * frontier(st, graphRows, predictFn) -> daftar lesson layak-saji (ZPD).
   *
   * Dua saringan, dua alasan:
   *   1. SEMUA prasyarat lolos gerbang mastery — menyajikan lesson di atas fondasi
   *      rapuh hanya melatih gejala, bukan kemampuan.
   *   2. predictFn(lessonId) di [0.55, 0.90] — jendela di mana bantuan tutor benar-benar
   *      mengubah hasil; di luar itu latihan terlalu mudah atau terlalu menghukum.
   * predictFn yang absen/melempar/berbalas non-angka membuat lesson itu dilewati:
   * tanpa prediksi yang sah, tidak ada dasar menyatakan lesson berada di ZPD.
   */
  function frontier(st, graphRows, predictFn) {
    var idx = graphIndex(graphRows);
    var out = [];
    for (var id in idx) {
      var parents = idx[id];
      var ready = true;
      for (var i = 0; i < parents.length; i++) {
        if (!masteryGate(st, parents[i])) { ready = false; break; }
      }
      if (!ready) continue;
      var p = NaN;
      if (typeof predictFn === 'function') {
        try { p = Number(predictFn(id)); } catch (e) { p = NaN; }
      }
      if (!isFinite(p) || p < ZPD.lo || p > ZPD.hi) continue;
      out.push({
        lesson: id,
        predicted: p,
        L: mastery(st, id).L,
        rationale: 'brain3_zpd_frontier'
      });
    }
    // Urutkan pada prediksi menurun: sajikan dulu yang paling dekat kesiapan penuh,
    // dan buat keluarannya deterministik terlepas dari urutan enumerasi properti.
    out.sort(function (a, b) { return b.predicted - a.predicted || (a.lesson < b.lesson ? -1 : 1); });
    return out;
  }

  /**
   * rootCause(st, graphRows, lesson) -> diagnosis akar masalah probabilistik.
   *
   * Menggantikan ambang gap-12-poin v2: alih-alih membandingkan skor mentah, kita cari
   * prasyarat (transitif) dengan posterior L TERENDAH yang gagal gerbang mastery.
   * Confidence diikat ke jumlah bukti prasyarat itu (n/minN, maks 1): diagnosis dari
   * satu observasi bukan diagnosis, itu tebakan.
   *
   * Tanpa prasyarat lemah -> null: gejala ini akarnya sendiri, dan berkata jujur soal
   * itu lebih berguna daripada memaksakan kambing hitam.
   */
  function rootCause(st, graphRows, lesson) {
    var target = str(lesson);
    if (!target) return null;
    var idx = graphIndex(graphRows);
    var chain = prerequisiteChain(idx, target);
    var worst = null;
    for (var i = 0; i < chain.length; i++) {
      var m = mastery(st, chain[i]);
      if (m.L >= GATE.L && m.n >= GATE.minN) continue; // prasyarat ini sehat
      if (!worst || m.L < worst.L) worst = { lesson: chain[i], L: m.L, n: m.n };
    }
    if (!worst) return null;
    return {
      lesson: worst.lesson,
      L: worst.L,
      n: worst.n,
      confidence: clamp(worst.n / GATE.minN, 0, 1),
      rationale: 'brain3_bkt_root_cause'
    };
  }

  return {
    SCHEMA: SCHEMA,
    PARAMS: PARAMS,
    GATE: GATE,
    ZPD: ZPD,
    update: update,
    mastery: mastery,
    masteryGate: masteryGate,
    frontier: frontier,
    rootCause: rootCause
  };
});
