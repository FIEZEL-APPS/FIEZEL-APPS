/**
 * FIEZEL Metrics Digest — ringkasan metrik belajar ber-bucket yang aman privasi (Braincore v3).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Council (Opus/Fable, disepakati sintesis) memutuskan: metrik longitudinal (learning
 * gain, retention-at-interval, kalibrasi Brier) dihitung DI PERANGKAT, tempat riwayat
 * lengkap memang sah berada. Yang boleh naik ke server hanyalah AGREGAT TURUNAN yang
 * sudah di-bucket — karena pepper harian analytics dirotasi dan pepper N-2 dihapus
 * permanen, server memang tidak bisa (dan tidak boleh bisa) menyambungkan hari-1 ke
 * hari-2. Modul ini adalah jembatan satu arah itu: dari keluaran mesin metrik lokal
 * menjadi digest enum-only yang layak diunggah lewat event `metrics_digest`.
 *
 * DISIPLIN YANG DITIRU DARI workers/api/analytics/analytics-core.js (EVENT_SPEC)
 * ------------------------------------------------------------------------------
 *   1. TIDAK ADA teks bebas. Semua string keluaran berasal dari enum tertutup di file
 *      ini. String dari INPUT tidak pernah disalin ke output — bahkan `domain` hanya
 *      diloloskan setelah dicocokkan persis dengan enum. Teks bebas adalah pintu masuk
 *      nama, email, isi soal, dan transkrip; menutupnya secara struktural lebih kuat
 *      daripada menyaringnya.
 *   2. TIDAK ADA timestamp presisi. Pola kehadiran (jam belajar seseorang) adalah data
 *      pribadi; interval hanya muncul sebagai bucket kasar ('7-14d', dst.).
 *   3. TIDAK ADA ID apa pun: bukan lessonId, bukan sessionId, bukan installId. Digest
 *      menceritakan BENTUK belajar, bukan SIAPA yang belajar.
 *   4. Field asing DITOLAK saat validasi — bukan sekadar dibuang diam-diam, karena
 *      digest ini kandidat unggahan: satu field liar yang lolos berarti kebocoran.
 *
 * SUPRESI SEL KECIL (k-suppression)
 * ---------------------------------
 * Bucket dengan n lokal < kSuppress (default 20) TIDAK dikeluarkan nilainya. Alasannya:
 * pada sel kecil, bucket nilai + bucket n bersama-sama bisa mengidentifikasi ulang
 * perilaku individu begitu beberapa digest dibandingkan di sisi server. Sel kecil
 * diganti penanda {suppressed:true} tanpa nilai — keberadaan supresi sendiri aman
 * karena setara dengan mengumumkan "n < 20", informasi yang memang sudah dibawa oleh
 * batas bawah enum n_bucket.
 *
 * SCOPE: domain 'grammar' SAJA. Council menemukan hanya konten grammar yang tepercaya
 * (domain lain masih punya opsi tak-terlokalisasi dan evidence_mismatch); metrik dari
 * konten cacat adalah "sampah yang teraudit rapi", jadi domain lain ditolak di gerbang.
 *
 * Modul murni: tanpa DOM, network, storage, Math.random, dan tanpa kebutuhan waktu —
 * semua interval sudah berupa angka hari dari mesin metrik, jadi nowMs tidak diperlukan.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelMetricsDigest = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-metrics-digest-v1';

  /* ==========================================================================
   * 1. ENUM TERTUTUP — satu-satunya sumber string keluaran
   * ========================================================================== */

  // Grammar-only sesuai keputusan council; menambah domain = keputusan governance,
  // bukan patch teknis, maka enum ini sengaja sekaku itu.
  var DOMAINS = Object.freeze(['grammar']);

  var METRICS = Object.freeze(['retention', 'learning_gain', 'calibration_brier']);

  // Interval < 7 hari sengaja TIDAK punya bucket: retensi jangka-super-pendek terlalu
  // dekat dengan pola kehadiran harian; membuangnya lebih murah daripada menyamarkannya.
  var INTERVAL_BUCKETS = Object.freeze(['7-14d', '14-30d', '30d+']);

  var RETENTION_BUCKETS = Object.freeze(['<50%', '50-60%', '60-70%', '70-80%', '80-90%', '90%+']);

  // Batas bawah '<20' sama dengan default kSuppress: sel yang lolos supresi tidak
  // pernah memakai bucket '<20', tapi bucket itu tetap ada agar enum jujur & lengkap.
  var N_BUCKETS = Object.freeze(['<20', '20-49', '50-99', '100+']);

  // Gain dalam poin persentase (pp) selisih akurasi jendela akhir vs awal.
  var GAIN_BUCKETS = Object.freeze(['<0pp', '0-5pp', '5-10pp', '10-20pp', '20pp+']);

  // Brier: makin kecil makin terkalibrasi; 0.25 = tebak koin dengan confidence 0.5.
  var BRIER_BUCKETS = Object.freeze(['<0.10', '0.10-0.15', '0.15-0.20', '0.20-0.25', '0.25+']);

  var RATIONALES = Object.freeze([
    'brain3_digest_built',
    'brain3_digest_suppressed_small_n',
    'brain3_digest_invalid_input',
    'brain3_digest_domain_out_of_scope',
    'brain3_digest_internal_invalid'
  ]);

  var ENUMS = Object.freeze({
    domain: DOMAINS,
    metric: METRICS,
    interval_bucket: INTERVAL_BUCKETS,
    retention_bucket: RETENTION_BUCKETS,
    n_bucket: N_BUCKETS,
    gain_bucket: GAIN_BUCKETS,
    brier_bucket: BRIER_BUCKETS,
    rationale: RATIONALES
  });

  /* ==========================================================================
   * 2. SKEMA SEL — allowlist key per metric (gaya EVENT_SPEC analytics-core)
   * ========================================================================== */

  // Setiap jenis sel punya daftar key WAJIB yang juga daftar key MAKSIMAL: tidak ada
  // key opsional, karena "opsional" adalah tempat field liar bersembunyi.
  var CELL_SPEC = Object.freeze({
    retention: Object.freeze(['metric', 'interval_bucket', 'retention_bucket', 'n_bucket']),
    learning_gain: Object.freeze(['metric', 'gain_bucket', 'n_bucket']),
    calibration_brier: Object.freeze(['metric', 'brier_bucket', 'n_bucket'])
  });

  // Sel tersupresi: metric tetap disebut (enum), nilai TIDAK. interval_bucket ikut
  // hanya untuk retention agar konsumen tahu SEL MANA yang ditahan, bukan berapa isinya.
  var SUPPRESSED_KEYS_BASE = Object.freeze(['metric', 'suppressed', 'rationale']);
  var SUPPRESSED_KEYS_RETENTION = Object.freeze(['metric', 'interval_bucket', 'suppressed', 'rationale']);

  var DIGEST_KEYS = Object.freeze(['schema', 'domain', 'cells', 'rationale', 'confidence']);

  // Ambang supresi tidak boleh diturunkan di bawah lantai ini oleh opts: menurunkannya
  // adalah pelemahan privasi, dan pelemahan privasi tidak boleh semudah satu argumen.
  var K_SUPPRESS_DEFAULT = 20;
  var K_SUPPRESS_FLOOR = 5;
  var K_SUPPRESS_CEIL = 1000;

  /* ==========================================================================
   * 3. BUCKETIZER — angka masuk, anggota enum (atau null) keluar
   * ========================================================================== */

  function isFiniteNumber(v) { return typeof v === 'number' && isFinite(v); }

  // null = "di luar cakupan, buang barisnya" — bukan error, karena mesin metrik lokal
  // sah menghitung interval pendek untuk dirinya sendiri; hanya unggahannya yang tidak.
  function bucketInterval(days) {
    if (!isFiniteNumber(days) || days < 7) return null;
    if (days < 14) return '7-14d';
    if (days < 30) return '14-30d';
    return '30d+';
  }

  function bucketRetention(rate) {
    if (!isFiniteNumber(rate) || rate < 0 || rate > 1) return null;
    if (rate < 0.5) return '<50%';
    if (rate < 0.6) return '50-60%';
    if (rate < 0.7) return '60-70%';
    if (rate < 0.8) return '70-80%';
    if (rate < 0.9) return '80-90%';
    return '90%+';
  }

  function bucketN(n) {
    if (!isFiniteNumber(n) || n < 0) return null;
    if (n < 20) return '<20';
    if (n < 50) return '20-49';
    if (n < 100) return '50-99';
    return '100+';
  }

  function bucketGain(gain) {
    if (!isFiniteNumber(gain) || gain < -1 || gain > 1) return null;
    if (gain < 0) return '<0pp';
    if (gain < 0.05) return '0-5pp';
    if (gain < 0.10) return '5-10pp';
    if (gain < 0.20) return '10-20pp';
    return '20pp+';
  }

  function bucketBrier(brier) {
    if (!isFiniteNumber(brier) || brier < 0 || brier > 1) return null;
    if (brier < 0.10) return '<0.10';
    if (brier < 0.15) return '0.10-0.15';
    if (brier < 0.20) return '0.15-0.20';
    if (brier < 0.25) return '0.20-0.25';
    return '0.25+';
  }

  /* ==========================================================================
   * 4. VALIDASI OUTPUT — gerbang terakhir sebelum digest boleh dianggap sah
   * ========================================================================== */

  function sameKeySet(obj, allowed) {
    var keys = Object.keys(obj);
    if (keys.length !== allowed.length) return false;
    for (var i = 0; i < keys.length; i++) {
      if (allowed.indexOf(keys[i]) === -1) return false;
    }
    return true;
  }

  /**
   * validateDigest(digest) -> {ok:boolean, errors:string[]}
   *
   * Kenapa buildDigest memvalidasi keluarannya SENDIRI: digest ini kandidat unggahan,
   * dan bug di masa depan (refactor, merge) tidak boleh bisa menyelundupkan field baru
   * tanpa membunyikan alarm. Validator menolak — bukan membuang — key asing: pada data
   * yang akan meninggalkan perangkat, "buang diam-diam" menyembunyikan bug yang
   * seharusnya menghentikan rilis.
   */
  function validateDigest(digest) {
    var errors = [];
    if (!digest || typeof digest !== 'object' || Array.isArray(digest)) {
      return { ok: false, errors: ['digest_bukan_objek'] };
    }
    if (!sameKeySet(digest, DIGEST_KEYS)) errors.push('key_digest_di_luar_allowlist');
    if (digest.schema !== SCHEMA) errors.push('schema_salah');
    if (DOMAINS.indexOf(digest.domain) === -1) errors.push('domain_di_luar_enum');
    if (RATIONALES.indexOf(digest.rationale) === -1) errors.push('rationale_di_luar_enum');
    if (!isFiniteNumber(digest.confidence) || digest.confidence < 0 || digest.confidence > 1) {
      errors.push('confidence_di_luar_0_1');
    }
    if (!Array.isArray(digest.cells)) {
      errors.push('cells_bukan_array');
      return { ok: errors.length === 0, errors: errors };
    }
    for (var i = 0; i < digest.cells.length; i++) {
      var cell = digest.cells[i];
      var tag = 'cell_' + i + '_';
      if (!cell || typeof cell !== 'object' || Array.isArray(cell)) { errors.push(tag + 'bukan_objek'); continue; }
      if (METRICS.indexOf(cell.metric) === -1) { errors.push(tag + 'metric_di_luar_enum'); continue; }
      if (cell.suppressed === true) {
        var allowedSup = cell.metric === 'retention' && Object.prototype.hasOwnProperty.call(cell, 'interval_bucket')
          ? SUPPRESSED_KEYS_RETENTION : SUPPRESSED_KEYS_BASE;
        if (!sameKeySet(cell, allowedSup)) errors.push(tag + 'key_supresi_di_luar_allowlist');
        if (cell.rationale !== 'brain3_digest_suppressed_small_n') errors.push(tag + 'rationale_supresi_salah');
        if (Object.prototype.hasOwnProperty.call(cell, 'interval_bucket') &&
            INTERVAL_BUCKETS.indexOf(cell.interval_bucket) === -1) errors.push(tag + 'interval_di_luar_enum');
        continue;
      }
      var allowed = CELL_SPEC[cell.metric];
      if (!sameKeySet(cell, allowed)) { errors.push(tag + 'key_di_luar_allowlist'); continue; }
      for (var j = 0; j < allowed.length; j++) {
        var key = allowed[j];
        if (key === 'metric') continue;
        var enumValues = ENUMS[key];
        if (!enumValues || enumValues.indexOf(cell[key]) === -1) errors.push(tag + key + '_di_luar_enum');
      }
    }
    return { ok: errors.length === 0, errors: errors };
  }

  /* ==========================================================================
   * 5. buildDigest — dari keluaran mesin metrik menjadi digest enum-only
   * ========================================================================== */

  function clampKSuppress(opts) {
    var k = opts && isFiniteNumber(opts.kSuppress) ? Math.trunc(opts.kSuppress) : K_SUPPRESS_DEFAULT;
    if (k < K_SUPPRESS_FLOOR) k = K_SUPPRESS_FLOOR;
    if (k > K_SUPPRESS_CEIL) k = K_SUPPRESS_CEIL;
    return k;
  }

  function suppressedCell(metric, intervalBucket) {
    var cell = { metric: metric, suppressed: true, rationale: 'brain3_digest_suppressed_small_n' };
    if (metric === 'retention' && intervalBucket) {
      // interval_bucket disebut supaya konsumen tahu sel mana yang ditahan; nilainya
      // sendiri anggota enum, jadi tidak menambah bocoran apa pun di atas fakta supresi.
      return { metric: metric, interval_bucket: intervalBucket, suppressed: true, rationale: 'brain3_digest_suppressed_small_n' };
    }
    return cell;
  }

  /* --------------------------------------------------------------------------
   * Adaptor bentuk input: menerima keluaran ASLI FiezelLearningMetrics maupun
   * bentuk sederhana. Adaptor hanya MEMBACA ANGKA — string input tidak pernah
   * disalin, jadi menambah bentuk yang diterima tidak menambah permukaan bocor.
   * -------------------------------------------------------------------------- */

  // retentionAtGap engine memakai bucket KUMULATIF (jeda >= ambang 7/14/30 hari).
  // Digest memetakan tiap ambang ke bucket enum yang DIMULAI di ambang itu
  // (7->'7-14d', 14->'14-30d', 30->'30d+'). Ini penyederhanaan yang disengaja:
  // enum interval digest tetap tiga nilai, dan pemetaan ambang->bucket-awal
  // deterministik serta tidak pernah menambah presisi (hanya mengurangi).
  function adaptRetention(src) {
    if (Array.isArray(src)) return src;
    if (src && typeof src === 'object' && Array.isArray(src.buckets)) return src.buckets;
    return [];
  }

  // learningGain engine melapor PER LESSON; digest tidak boleh membawa lessonId,
  // jadi adaptor merangkum jadi satu angka: rata-rata gain berbobot bukti yang
  // benar-benar dipakai (2k jawaban ujung per lesson), lesson insufficient dilewati.
  function adaptLearningGain(src) {
    if (!src || typeof src !== 'object') return null;
    if (Array.isArray(src.lessons)) {
      var weighted = 0; var evidence = 0;
      for (var i = 0; i < src.lessons.length; i++) {
        var ls = src.lessons[i];
        if (!ls || typeof ls !== 'object' || !isFiniteNumber(ls.gain)) continue;
        var w = isFiniteNumber(ls.k) && ls.k > 0 ? 2 * Math.trunc(ls.k)
          : (isFiniteNumber(ls.n) && ls.n > 0 ? Math.trunc(ls.n) : 0);
        if (w <= 0) continue;
        weighted += ls.gain * w;
        evidence += w;
      }
      if (evidence <= 0) return null;
      return { gain: weighted / evidence, n: evidence };
    }
    return src; // bentuk sederhana {gain|delta, n}
  }

  /**
   * buildDigest(metricsResult, opts) -> hasil.
   *
   * Kontrak input (dibaca DEFENSIF — field yang bentuknya tidak dikenal DIABAIKAN,
   * tidak pernah diteruskan). Dua bentuk diterima per field:
   *   metricsResult = {
   *     domain: 'grammar',
   *     retention:    [{ intervalDays|gapDays: number, rate|successRate|accuracy: 0..1, n: int }, ...]
   *                   ATAU keluaran FiezelLearningMetrics.retentionAtGap ({buckets:[...]})
   *     learningGain: { gain|delta: -1..1, n: int }
   *                   ATAU keluaran FiezelLearningMetrics.learningGain ({lessons:[...]})
   *     calibration:  { brier: 0..1, n: int }   // alias: metricsResult.brier;
   *                   keluaran FiezelLearningMetrics.brierCalibration cocok langsung
   *   }
   *   opts = { kSuppress?: number }  // default 20, lantai 5 (privasi tidak bisa
   *                                  // dilemahkan lewat argumen), plafon 1000.
   *
   * Hasil:
   *   { ok:true,  digest, rationale:'brain3_digest_built', confidence }
   *   { ok:false, suppressed:true, rationale:'brain3_digest_suppressed_small_n', confidence:0 }
   *     (semua sel tersupresi — TIDAK ADA yang layak unggah)
   *   { ok:false, rationale:'brain3_digest_invalid_input'|'brain3_digest_domain_out_of_scope', confidence:0 }
   *
   * Determinisme: tanpa waktu, tanpa random; urutan sel mengikuti urutan enum, bukan
   * urutan input, supaya dua pemanggilan dengan data sama menghasilkan byte yang sama.
   */
  function buildDigest(metricsResult, opts) {
    if (!metricsResult || typeof metricsResult !== 'object' || Array.isArray(metricsResult)) {
      return { ok: false, rationale: 'brain3_digest_invalid_input', confidence: 0 };
    }
    // Domain dicek dengan strictEqual terhadap enum — string input TIDAK pernah
    // disalin; yang dipakai selalu literal dari enum kita sendiri. Inilah alasan
    // injeksi string bebas mati di sini secara struktural.
    var domainIdx = DOMAINS.indexOf(metricsResult.domain);
    if (domainIdx === -1) {
      return { ok: false, rationale: 'brain3_digest_domain_out_of_scope', confidence: 0 };
    }
    var domain = DOMAINS[domainIdx];
    var kSuppress = clampKSuppress(opts);

    var released = [];
    var suppressed = [];

    // --- retention: gabungkan baris per interval_bucket (rata-rata berbobot n) ----
    // Digabung DULU baru disupresi: dua baris n=15 pada bucket sama adalah n=30 yang
    // sah dirilis; mensupresi per-baris akan membuang sinyal yang sebenarnya cukup.
    var retRows = adaptRetention(metricsResult.retention);
    var perBucket = {};
    for (var i = 0; i < retRows.length; i++) {
      var row = retRows[i];
      if (!row || typeof row !== 'object') continue;
      var days = isFiniteNumber(row.intervalDays) ? row.intervalDays : row.gapDays;
      var rate = isFiniteNumber(row.rate) ? row.rate
        : (isFiniteNumber(row.successRate) ? row.successRate : row.accuracy);
      var ib = bucketInterval(days);
      if (ib === null) continue; // interval di luar cakupan (mis. <7d) dibuang
      if (!isFiniteNumber(rate) || rate < 0 || rate > 1) continue;
      if (!isFiniteNumber(row.n) || row.n <= 0) continue;
      var acc = perBucket[ib] || (perBucket[ib] = { n: 0, weighted: 0 });
      acc.n += Math.trunc(row.n);
      acc.weighted += rate * Math.trunc(row.n);
    }
    for (var b = 0; b < INTERVAL_BUCKETS.length; b++) {
      var bucketName = INTERVAL_BUCKETS[b];
      var agg = perBucket[bucketName];
      if (!agg) continue;
      if (agg.n < kSuppress) {
        suppressed.push(suppressedCell('retention', bucketName));
        continue;
      }
      var rb = bucketRetention(agg.weighted / agg.n);
      var nb = bucketN(agg.n);
      if (rb === null || nb === null) continue;
      released.push({ metric: 'retention', interval_bucket: bucketName, retention_bucket: rb, n_bucket: nb });
    }

    // --- learning gain -------------------------------------------------------
    var lg = adaptLearningGain(metricsResult.learningGain);
    if (lg && typeof lg === 'object') {
      var gain = isFiniteNumber(lg.gain) ? lg.gain : lg.delta;
      if (isFiniteNumber(gain) && isFiniteNumber(lg.n) && lg.n > 0) {
        if (lg.n < kSuppress) {
          suppressed.push(suppressedCell('learning_gain'));
        } else {
          var gb = bucketGain(gain);
          var gnb = bucketN(lg.n);
          if (gb !== null && gnb !== null) {
            released.push({ metric: 'learning_gain', gain_bucket: gb, n_bucket: gnb });
          }
        }
      }
    }

    // --- kalibrasi Brier -----------------------------------------------------
    var cal = metricsResult.calibration || metricsResult.brier;
    if (cal && typeof cal === 'object') {
      if (isFiniteNumber(cal.brier) && isFiniteNumber(cal.n) && cal.n > 0) {
        if (cal.n < kSuppress) {
          suppressed.push(suppressedCell('calibration_brier'));
        } else {
          var bb = bucketBrier(cal.brier);
          var bnb = bucketN(cal.n);
          if (bb !== null && bnb !== null) {
            released.push({ metric: 'calibration_brier', brier_bucket: bb, n_bucket: bnb });
          }
        }
      }
    }

    // --- keputusan akhir -----------------------------------------------------
    if (released.length === 0) {
      if (suppressed.length > 0) {
        // Ada data, tapi semuanya di bawah k: jangan unggah apa pun. Ini keputusan
        // dengan rationale sendiri karena "tidak ada digest" harus bisa dibedakan
        // dari "tidak ada data" oleh pemanggil, tanpa membawa nilai apa pun keluar.
        return { ok: false, suppressed: true, rationale: 'brain3_digest_suppressed_small_n', confidence: 0 };
      }
      return { ok: false, rationale: 'brain3_digest_invalid_input', confidence: 0 };
    }

    // Urutan deterministik: released (urut enum karena loop di atas urut enum),
    // lalu suppressed (retention dulu urut interval, lalu metric lain urut enum).
    suppressed.sort(function (a, b2) {
      var ma = METRICS.indexOf(a.metric); var mb = METRICS.indexOf(b2.metric);
      if (ma !== mb) return ma - mb;
      var ia = INTERVAL_BUCKETS.indexOf(a.interval_bucket); var ib2 = INTERVAL_BUCKETS.indexOf(b2.interval_bucket);
      return ia - ib2;
    });
    released.sort(function (a, b3) {
      var ma = METRICS.indexOf(a.metric); var mb = METRICS.indexOf(b3.metric);
      if (ma !== mb) return ma - mb;
      var ia = INTERVAL_BUCKETS.indexOf(a.interval_bucket); var ib3 = INTERVAL_BUCKETS.indexOf(b3.interval_bucket);
      return ia - ib3;
    });

    // Confidence = proporsi sel yang layak rilis. Bukan ukuran kebenaran metrik —
    // itu urusan mesin metrik — melainkan ukuran seberapa utuh potret yang diunggah.
    var total = released.length + suppressed.length;
    var confidence = Math.round((released.length / total) * 1000) / 1000;

    var digest = {
      schema: SCHEMA,
      domain: domain,
      cells: released.concat(suppressed),
      rationale: 'brain3_digest_built',
      confidence: confidence
    };

    // Gerbang terakhir: keluaran sendiri harus lolos validator. Kalau tidak, fail
    // closed — lebih baik tidak ada digest daripada digest yang bocor field.
    var check = validateDigest(digest);
    if (!check.ok) {
      return { ok: false, rationale: 'brain3_digest_internal_invalid', confidence: 0 };
    }
    return { ok: true, digest: digest, rationale: 'brain3_digest_built', confidence: confidence };
  }

  return {
    SCHEMA: SCHEMA,
    ENUMS: ENUMS,
    CELL_SPEC: CELL_SPEC,
    DIGEST_KEYS: DIGEST_KEYS,
    K_SUPPRESS_DEFAULT: K_SUPPRESS_DEFAULT,
    K_SUPPRESS_FLOOR: K_SUPPRESS_FLOOR,
    bucketInterval: bucketInterval,
    bucketRetention: bucketRetention,
    bucketN: bucketN,
    bucketGain: bucketGain,
    bucketBrier: bucketBrier,
    validateDigest: validateDigest,
    buildDigest: buildDigest
  };
});
