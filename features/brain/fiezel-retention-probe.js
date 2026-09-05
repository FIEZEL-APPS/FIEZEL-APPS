/**
 * FIEZEL Post-Test Tertunda — probe retensi setelah mastery (Braincore v3, Wave E4).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Gerbang mastery BKT (fiezel-mastery-bkt.js) menjawab satu pertanyaan: "apakah murid
 * menguasai lesson ini SEKARANG, di dalam sesi latihan?" Ia tidak menjawab pertanyaan
 * yang sebenarnya dijanjikan kata 'mastery': apakah penguasaan itu masih ada BESOK,
 * MINGGU DEPAN, TIGA MINGGU LAGI. Dua murid bisa sama-sama menembus L >= 0.95 — yang
 * satu lewat pemahaman, yang lain lewat pola jawaban yang menguap semalam — dan tanpa
 * pengukuran tertunda keduanya tercatat identik. Literatur pembelajaran menyebut alat
 * ukurnya post-test tertunda (delayed post-test): probe kecil pada jarak waktu yang
 * disengaja, jauh setelah sesi belajarnya selesai.
 *
 * Modul ini mengerjakan dua hal, dua-duanya MURNI:
 *   (a) PENJADWAL — untuk setiap lesson yang mencapai mastery, jadwalkan tiga probe
 *       pada offset [3, 7, 21] hari. Tiga titik itu memotong kurva lupa di rezim yang
 *       berbeda: 3 hari menangkap keruntuhan cepat (mastery semu), 7 hari menangkap
 *       retensi jangka menengah, 21 hari membuktikan konsolidasi jangka panjang.
 *   (b) EVALUATOR — bandingkan HASIL probe dengan PREDIKSI retrievability FSRS pada
 *       saat probe disajikan. Kalau model memprediksi R=0.92 dan murid gagal, ada dua
 *       tersangka: mastery-nya rapuh, atau model memorinya terlalu optimis. Keduanya
 *       informasi berharga; keduanya dilaporkan (flag "mastery rapuh" + skor kalibrasi
 *       Brier + rekomendasi penyesuaian half-life).
 *
 * KENAPA JITTER, DAN KENAPA HARUS SEEDED
 * --------------------------------------
 * Tanpa jitter, semua lesson yang dikuasai pada hari yang sama jatuh tempo probe pada
 * hari yang sama — sesi murid berubah menjadi ujian beruntun, dan probe berhenti
 * mengukur retensi karena item-item bertetangga saling memberi konteks. Jitter ±0.75
 * hari per (lessonId, userSeed) menyebarkan jatuh tempo antar lesson TANPA merusak
 * determinisme: hash FNV-1a dari "lessonId|userSeed" menjadi seed mulberry32, sehingga
 * dua run dengan masukan sama menghasilkan jadwal byte-identik (kontrak audit v3),
 * tetapi lesson berbeda — atau murid berbeda — mendapat geseran berbeda.
 *
 * KENAPA ADJUSTMENTS HANYA REKOMENDASI (ADVISORY)
 * -----------------------------------------------
 * Penulis TUNGGAL memori FSRS adalah jalur updateMemory di core brain (kontrak
 * single-writer B3). Modul ini TIDAK PERNAH menulis stability/half-life ke state
 * memori — ia hanya mengembalikan rekomendasi {lesson, action, factor, advisory:true}
 * yang boleh dipakai atau diabaikan pemanggil. Dua penulis pada satu angka memori
 * adalah resep drift yang tidak bisa diaudit; satu penulis + satu penasihat bisa.
 *
 * ATURAN KERAS v3 (docs/BRAINCORE-V3-CONTRACTS.md): modul murni — tanpa DOM, tanpa jaringan,
 * tanpa penyimpanan, tanpa Math.random, tanpa Date.now internal; waktu selalu argumen;
 * state milik pemanggil TIDAK PERNAH dimutasi; masukan korup tidak boleh melempar.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelPostTest = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-post-test-v1';

  var DAY_MS = 86400000;

  // Offset probe dalam HARI sejak momen mastery. Tiga titik, tiga rezim kurva lupa
  // (alasan pemilihannya di komentar kepala berkas). Dibekukan: penjadwal yang
  // offsetnya bisa digeser diam-diam oleh pemanggil bukan penjadwal deterministik.
  var OFFSETS_DAYS = Object.freeze([3, 7, 21]);

  // Gerbang penjadwalan: HANYA lesson dengan posterior mastery L >= 0.95 (ambang
  // kanonik yang sama dengan FiezelMasteryBKT.GATE.L). Probe retensi untuk lesson
  // yang belum dikuasai tidak mengukur retensi — ia mengukur ketidaktahuan, dan
  // datanya akan meracuni kalibrasi.
  var MASTERY_L = 0.95;

  // Amplitudo jitter: ±0.75 hari (±18 jam). Cukup untuk memecah penumpukan probe
  // antar lesson di satu sesi, terlalu kecil untuk mengubah rezim kurva lupa yang
  // sedang diukur (3 hari tetap "awal", 21 hari tetap "jauh").
  var JITTER_DAYS = 0.75;

  // Ambang evaluator. FRAGILE_R: prediksi retrievability yang tergolong "yakin ingat" —
  // kegagalan probe di atas ambang ini berarti mastery rapuh ATAU model terlalu optimis,
  // dan dua-duanya layak flag. SURPRISE_R: prediksi yang tergolong "mungkin sudah lupa" —
  // keberhasilan probe di bawahnya berarti model terlalu pesimis (half-life boleh
  // direkomendasikan naik).
  var FRAGILE_R = 0.8;
  var SURPRISE_R = 0.6;

  // Pagar faktor rekomendasi half-life. Penyusutan tidak pernah di bawah 0.5 (satu
  // probe gagal bukan alasan membuang separuh lebih riwayat penguatan) dan perpanjangan
  // tidak pernah di atas 1.5 (satu probe sukses bukan bukti konsolidasi permanen).
  var FACTOR_MIN = 0.5;
  var FACTOR_MAX = 1.5;

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  function num(x, fallback) { return typeof x === 'number' && isFinite(x) ? x : fallback; }
  function str(x) { return typeof x === 'string' ? x.trim() : ''; }
  function round(x, digits) {
    var f = Math.pow(10, digits);
    return Math.round(x * f) / f;
  }

  // =================================================================================
  // PRNG BERSEED — kontrak determinisme v3 (pola yang sama dengan fiezel-stat-gate.js)
  // =================================================================================

  /**
   * mulberry32: PRNG 32-bit kecil dengan state tunggal — seed sama, deret sama, titik.
   * Bukan kriptografi dan tidak perlu: yang dibutuhkan hanyalah geseran yang tersebar
   * merata dan BISA DIREPRODUKSI di test maupun di audit ulang.
   */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * FNV-1a 32-bit di atas string "lessonId|userSeed" — cara murah dan deterministik
   * mengubah identitas (lesson, murid) menjadi seed PRNG. Lesson berbeda atau murid
   * berbeda menghasilkan seed berbeda, sehingga jadwal probenya tidak saling menumpuk;
   * pasangan yang sama SELALU menghasilkan jitter yang sama.
   */
  function hashSeed(lessonId, userSeed) {
    var s = String(lessonId) + '|' + String(userSeed >>> 0);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /**
   * Jitter deterministik per (lessonId, userSeed, indeks offset) dalam HARI, rentang
   * [-JITTER_DAYS, +JITTER_DAYS]. Satu PRNG per pasangan identitas, ditarik berurutan
   * per offset supaya ketiga probe satu lesson pun tidak menempel di jam yang sama.
   */
  function jitterFor(lessonId, userSeed) {
    var rand = mulberry32(hashSeed(lessonId, userSeed));
    var out = [];
    for (var i = 0; i < OFFSETS_DAYS.length; i++) {
      out.push(round((rand() * 2 - 1) * JITTER_DAYS, 4));
    }
    return out;
  }

  // =================================================================================
  // STATE — bentuk kanonik, tahan korup
  // =================================================================================

  /**
   * Bentuk kanonik state. localStorage bisa berisi apa saja setelah update aplikasi,
   * jadi state null/string/array/objek-cacat semuanya jatuh ke bentuk kosong yang sah
   * alih-alih melempar. userSeed direkatkan ke state supaya jadwal seorang murid tetap
   * konsisten antar panggilan meskipun pemanggil lupa meneruskannya lagi.
   */
  function normalizeState(st) {
    var ok = st && typeof st === 'object' && !Array.isArray(st);
    var probes = ok && st.probes && typeof st.probes === 'object' && !Array.isArray(st.probes) ? st.probes : {};
    var clean = {};
    for (var id in probes) {
      var row = probes[id];
      if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
      var list = Array.isArray(row.probes) ? row.probes : [];
      var keep = [];
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p || typeof p !== 'object') continue;
        var dueAt = num(p.dueAt, NaN);
        var offsetDays = num(p.offsetDays, NaN);
        if (!isFinite(dueAt) || !isFinite(offsetDays)) continue;
        keep.push({ offsetDays: offsetDays, jitterDays: num(p.jitterDays, 0), dueAt: dueAt });
      }
      if (keep.length) clean[id] = { masteredAt: Math.max(0, num(row.masteredAt, 0)), probes: keep };
    }
    return {
      schema: SCHEMA,
      userSeed: (ok ? num(st.userSeed, 0) : 0) >>> 0,
      probes: clean
    };
  }

  /** Salinan dalam (state kecil, JSON-safe) — kontrak "tanpa mutasi argumen". */
  function cloneState(st) {
    return JSON.parse(JSON.stringify(st));
  }

  // =================================================================================
  // (a) PENJADWAL — schedule(state, masteryEvents, nowMs, opts) -> jadwal
  // =================================================================================

  /**
   * schedule(state, masteryEvents, nowMs, opts) -> {state, scheduled, due, rationale}
   *
   * masteryEvents: [{lesson, L, n?, at?}] — biasanya hasil FiezelMasteryBKT.mastery()
   * per lesson yang baru menembus gerbang. HANYA baris dengan L >= 0.95 yang dijadwalkan
   * (invariansi keras: probe tidak pernah ada untuk lesson tanpa mastery). `at` opsional
   * = momen mastery dalam ms; tanpa `at`, nowMs dipakai sebagai jangkar.
   *
   * opts.userSeed: bilangan identitas murid LOKAL (bukan ID stabil yang dikirim ke
   * server — lihat docs/BRAIN-DATA-PRIVACY.md) untuk menyebar jitter antar murid. Sekali
   * terekam di state, seed di state yang menang supaya jadwal tidak berubah-ubah.
   *
   * Idempoten per lesson: lesson yang sudah punya jadwal TIDAK dijadwalkan ulang —
   * mastery yang di-update berkali-kali dalam satu sesi bukan tiga momen mastery.
   *
   * Keluaran:
   *   state     — state BARU (argumen tidak disentuh) berisi semua jadwal.
   *   scheduled — probe yang baru dibuat pada panggilan INI.
   *   due       — semua probe (lama+baru) yang dueAt <= nowMs, terurut dueAt lalu
   *               lesson (deterministik terlepas dari urutan enumerasi properti).
   */
  function schedule(state, masteryEvents, nowMs, opts) {
    var base = normalizeState(state);
    var now = num(nowMs, 0);
    var seedOpt = opts && typeof opts === 'object' ? num(opts.userSeed, NaN) : NaN;
    // Seed di state menang (jadwal murid tidak boleh berubah karena pemanggil lupa
    // meneruskan opts); opts.userSeed hanya mengisi saat state belum menyimpannya.
    var userSeed = (base.userSeed || (isFinite(seedOpt) ? seedOpt : 0)) >>> 0;

    var next = cloneState(base);
    next.userSeed = userSeed;

    var scheduled = [];
    var events = Array.isArray(masteryEvents) ? masteryEvents : [];
    for (var e = 0; e < events.length; e++) {
      var ev = events[e];
      if (!ev || typeof ev !== 'object') continue;
      var lesson = str(ev.lesson);
      if (!lesson) continue;
      // INVARIANSI KERAS: tanpa L >= 0.95 tidak ada probe. L korup/absen = belum
      // mastery — berprasangka "belum" selalu lebih aman daripada "sudah".
      var L = num(ev.L, NaN);
      if (!isFinite(L) || L < MASTERY_L) continue;
      // Idempoten: jadwal yang sudah ada tidak ditimpa (momen mastery pertama yang sah).
      if (next.probes[lesson]) continue;

      var anchor = num(ev.at, now);
      var jit = jitterFor(lesson, userSeed);
      var rows = [];
      for (var i = 0; i < OFFSETS_DAYS.length; i++) {
        var dueAt = Math.round(anchor + (OFFSETS_DAYS[i] + jit[i]) * DAY_MS);
        rows.push({ offsetDays: OFFSETS_DAYS[i], jitterDays: jit[i], dueAt: dueAt });
        scheduled.push({
          lesson: lesson,
          offsetDays: OFFSETS_DAYS[i],
          jitterDays: jit[i],
          dueAt: dueAt,
          rationale: 'brain3_post_test_scheduled'
        });
      }
      next.probes[lesson] = { masteredAt: anchor, probes: rows };
    }

    // Daftar jatuh tempo: gabungan lama+baru, urut waktu lalu nama — deterministik.
    var due = [];
    for (var id in next.probes) {
      var row = next.probes[id];
      for (var d = 0; d < row.probes.length; d++) {
        if (row.probes[d].dueAt <= now) {
          due.push({
            lesson: id,
            offsetDays: row.probes[d].offsetDays,
            dueAt: row.probes[d].dueAt,
            rationale: 'brain3_post_test_due'
          });
        }
      }
    }
    due.sort(function (a, b) {
      return a.dueAt - b.dueAt || (a.lesson < b.lesson ? -1 : (a.lesson > b.lesson ? 1 : 0)) || a.offsetDays - b.offsetDays;
    });

    return { state: next, scheduled: scheduled, due: due, rationale: 'brain3_post_test_schedule' };
  }

  // =================================================================================
  // (b) EVALUATOR — evaluate(state, probeResults) -> {brier, fragileLessons, adjustments}
  // =================================================================================

  /**
   * evaluate(state, probeResults) -> {brier, n, skipped, perLesson, fragileLessons,
   *                                   adjustments, rationale}
   *
   * probeResults: [{lesson, correct, predicted}] — `predicted` adalah retrievability
   * FSRS pada momen probe DISAJIKAN (pemanggil menghitungnya dari
   * FiezelCoreBrain.retrievability(halfLife(item), umur) — modul ini tidak menyentuh
   * state memori, sesuai kontrak single-writer).
   *
   * Tiga keluaran inti:
   *   brier          — mean (predicted - hasil)^2 di semua probe sah. 0 = kalibrasi
   *                    sempurna; 0.25 = setara menebak "50%" terus-menerus. Ini skor
   *                    KALIBRASI MODEL, bukan skor murid: murid yang gagal saat model
   *                    memprediksi gagal justru menyumbang skor bagus.
   *   fragileLessons — "mastery rapuh": probe GAGAL padahal prediksi >= 0.8. BKT bilang
   *                    'menguasai', FSRS bilang 'masih ingat', kenyataan bilang tidak —
   *                    lesson ini butuh perhatian, bukan sekadar review terjadwal.
   *   adjustments    — REKOMENDASI penyesuaian half-life (advisory:true, selalu).
   *                    shrink saat rapuh (model terlalu optimis), extend saat murid
   *                    lulus probe yang diprediksi <= 0.6 (model terlalu pesimis).
   *                    Faktor dihitung dari besarnya kejutan |predicted - hasil| dan
   *                    dipagari [0.5, 1.5]. PENERAPANNYA milik jalur single-writer
   *                    FSRS di core brain — modul ini TIDAK menulis ke memori.
   *
   * Baris korup dilewati dan dihitung di `skipped`; baris untuk lesson yang TIDAK punya
   * jadwal probe di state juga dilewati (hasil "probe" untuk lesson yang tidak pernah
   * diprobe bukan data — kemungkinan besar sisa state lama atau bug pemanggil).
   * Tanpa satu pun baris sah: brier = null (bukan NaN — NaN menular dan bohong).
   */
  function evaluate(state, probeResults) {
    var base = normalizeState(state);
    var rows = Array.isArray(probeResults) ? probeResults : [];

    var n = 0, skipped = 0, sumSq = 0;
    var per = {}; // lesson -> {n, sumSq, fails, passes, minPredFail, maxSurprisePass}

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row || typeof row !== 'object') { skipped++; continue; }
      var lesson = str(row.lesson);
      var predicted = num(row.predicted, NaN);
      if (!lesson || !base.probes[lesson] || !isFinite(predicted) || predicted < 0 || predicted > 1
        || typeof row.correct !== 'boolean') { skipped++; continue; }

      var y = row.correct ? 1 : 0;
      var sq = (predicted - y) * (predicted - y);
      n++; sumSq += sq;

      if (!per[lesson]) per[lesson] = { n: 0, sumSq: 0, fragile: false, worstOptimism: 0, bestSurprise: 0 };
      var agg = per[lesson];
      agg.n++; agg.sumSq += sq;
      if (!row.correct && predicted >= FRAGILE_R) {
        // Gagal saat model yakin ingat: rapuh. Simpan kejutan terbesar untuk faktor.
        agg.fragile = true;
        if (predicted > agg.worstOptimism) agg.worstOptimism = predicted;
      }
      if (row.correct && predicted <= SURPRISE_R) {
        // Lulus saat model sudah pesimis: half-life nyata lebih panjang dari model.
        var surprise = 1 - predicted;
        if (surprise > agg.bestSurprise) agg.bestSurprise = surprise;
      }
    }

    var perLesson = {};
    var fragileLessons = [];
    var adjustments = [];
    var lessonIds = Object.keys(per).sort(); // urutan keluaran deterministik
    for (var k = 0; k < lessonIds.length; k++) {
      var id = lessonIds[k];
      var a = per[id];
      perLesson[id] = { brier: round(a.sumSq / a.n, 6), n: a.n };
      if (a.fragile) {
        fragileLessons.push({
          lesson: id,
          predicted: round(a.worstOptimism, 4),
          rationale: 'brain3_post_test_fragile_mastery'
        });
        // Semakin yakin model saat gagal, semakin dalam rekomendasi penyusutan:
        // predicted 0.8 -> 0.9, predicted 1.0 -> 0.5 (linear pada kejutan, dipagari).
        var shrink = clamp(1 - a.worstOptimism * 0.5, FACTOR_MIN, 1);
        adjustments.push({
          lesson: id,
          action: 'shrink_half_life',
          factor: round(shrink, 4),
          advisory: true,
          rationale: 'brain3_post_test_advise_shrink'
        });
      } else if (a.bestSurprise > 0) {
        // Hanya bila TIDAK rapuh: satu lesson tidak boleh menerima dua rekomendasi
        // yang saling bertolak belakang dalam satu evaluasi.
        var extend = clamp(1 + a.bestSurprise * 0.5, 1, FACTOR_MAX);
        adjustments.push({
          lesson: id,
          action: 'extend_half_life',
          factor: round(extend, 4),
          advisory: true,
          rationale: 'brain3_post_test_advise_extend'
        });
      }
    }

    return {
      brier: n > 0 ? round(sumSq / n, 6) : null,
      n: n,
      skipped: skipped,
      perLesson: perLesson,
      fragileLessons: fragileLessons,
      adjustments: adjustments,
      rationale: 'brain3_post_test_evaluate'
    };
  }

  return {
    SCHEMA: SCHEMA,
    OFFSETS_DAYS: OFFSETS_DAYS,
    MASTERY_L: MASTERY_L,
    JITTER_DAYS: JITTER_DAYS,
    FRAGILE_R: FRAGILE_R,
    SURPRISE_R: SURPRISE_R,
    schedule: schedule,
    evaluate: evaluate
  };
});
