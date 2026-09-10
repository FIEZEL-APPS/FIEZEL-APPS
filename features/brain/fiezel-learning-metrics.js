/**
 * FIEZEL Learning Metrics — mesin metrik pembelajaran longitudinal ON-DEVICE (Braincore v3).
 *
 * KENAPA MODUL INI ADA (resolusi paradoks linkability)
 * ----------------------------------------------------
 * Council menemukan paradoks: metrik pembelajaran yang berarti (learning gain, retensi
 * lintas minggu, kalibrasi prediksi) membutuhkan MENAUTKAN jawaban murid lintas waktu —
 * persis jenis linkability yang dilarang keras pada jalur analytics server (agregat
 * k-anon, tanpa ID stabil). Resolusinya bukan melemahkan privasi server, melainkan
 * memindahkan perhitungan ke tempat riwayat lengkap MEMANG sudah berada: perangkat murid
 * sendiri (state.history di localStorage). Di perangkat, linkability bukan kebocoran —
 * itu memang riwayat milik murid. Modul ini menghitung metrik longitudinal itu secara
 * MURNI: riwayat masuk sebagai argumen, angka keluar sebagai nilai; tidak ada satu byte
 * pun yang dikirim atau disimpan oleh modul ini.
 *
 * BENTUK DATA MASUK
 * -----------------
 * Baris riwayat mengikuti bentuk yang ditulis record() di app.js (lihat juga
 * POLICY_OUTCOME_SCHEMA untuk agregat sesinya): { at, ok, ms, type, skill, target, id,
 * reviewKey, difficulty, predicted?, kappa?, confidence?, scaffold?/hintUsed? }.
 * Field opsional dibaca hanya bila ada; baris tanpa `at` yang sah DIBUANG diam-diam
 * (riwayat lama/korup tidak boleh mematikan metrik, tapi juga tidak boleh dihitung
 * dengan waktu karangan).
 *
 * GERBANG KEPERCAYAAN ala FIEZEL (anti angka karangan)
 * -----------------------------------------------------
 * Setiap keluaran membawa `n` (jumlah bukti), `rationale` (kode 'brain3_metric_*'),
 * `confidence` (0..1, saturasi bukti n/(n+10) — pseudo-count Bayesian: 10 bukti = 0.5,
 * 40 bukti = 0.8; monoton, terjelaskan, tanpa klaim asimptotik palsu), serta dua bendera
 * kejujuran:
 *   - `insufficient` : bukti terlalu tipis untuk metrik utama — angkanya NULL, bukan
 *                      tebakan. Nol data harus terbaca sebagai "belum tahu", bukan "nol".
 *   - `censored`     : sebagian sub-hasil (lesson/bucket/band/skill) disensor karena
 *                      n kecil, meski metrik utamanya sendiri lolos gerbang.
 * Ambang gerbang adalah konstanta bernama (GATES) supaya bisa dibantah dengan data,
 * bukan disembunyikan di dalam rumus.
 *
 * KEMURNIAN & DETERMINISME
 * ------------------------
 * Tanpa DOM, tanpa jaringan, tanpa storage, tanpa Math.random, tanpa Date.now() —
 * waktu SELALU argumen (nowMs), dan hanya dipakai metrik yang memang butuh "sekarang"
 * (peluruhan keyakinan miskonsepsi). Input tidak pernah dimutasi. Hasil diurutkan dan
 * dibulatkan (4 desimal) supaya byte-stabil untuk gate regresi.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelLearningMetrics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-learning-metrics-v1';
  var DAY_MS = 86400000;

  // Gerbang kepercayaan — konstanta bernama, bukan angka gaib di tengah rumus.
  var GATES = Object.freeze({
    gainKDefault: 10,        // lebar jendela awal/akhir learning gain (bila k tak diberikan)
    gainKMin: 3,             // < 3 jawaban per jendela = akurasi jendela cuma lempar koin
    gainKMax: 50,            // jendela terlalu lebar mencampur era belajar yang berbeda
    retentionMinPairs: 5,    // < 5 pasangan kemunculan-ulang per bucket: akurasi tak bermakna
    brierMinTotal: 10,       // Brier dari < 10 prediksi lebih banyak derau daripada sinyal
    brierMinBand: 5,         // band kalibrasi tipis disensor, bukan dilaporkan
    hintMinTotal: 8,         // selaras gerbang minimum FiezelAffect (8-10 attempt)
    hintMinSkill: 5,         // rincian per-skill butuh bukti sendiri, bukan warisan total
    persistenceMinDecided: 3,// rasio persistensi butuh >= 3 entri berstatus jelas
    confidencePrior: 10      // pseudo-count saturasi confidence: n/(n+10)
  });

  // Konstanta peluruhan keyakinan miskonsepsi — DISALIN dari kontrak beku
  // FiezelMisconceptionLedger (docs/BRAINCORE-V3-CONTRACTS.md: prior logit(0.1), half-life 14
  // hari, gerbang aktif 0.7 / resolved 0.3, >=3 bukti, >=2 sesi). Disalin, bukan
  // di-require: modul murni UMD tidak boleh bergantung pada urutan pemuatan global di
  // browser, dan kontraknya memang FINAL sehingga duplikasi ini aman dan teruji di gate.
  var LEDGER = Object.freeze({
    schema: 'fiezel-misconception-ledger-v1',
    priorBelief: 0.1,
    halfLifeDays: 14,
    activeBelief: 0.7,
    resolvedBelief: 0.3,
    minEvidence: 3,
    minSessions: 2
  });

  // Band prediksi tetap untuk kalibrasi Brier. Lima band selebar 0.2: cukup halus untuk
  // melihat overconfidence, cukup kasar agar tiap band punya peluang lolos gerbang n>=5.
  var BRIER_BANDS = Object.freeze([
    Object.freeze({ label: '0.0-0.2', lo: 0.0, hi: 0.2 }),
    Object.freeze({ label: '0.2-0.4', lo: 0.2, hi: 0.4 }),
    Object.freeze({ label: '0.4-0.6', lo: 0.4, hi: 0.6 }),
    Object.freeze({ label: '0.6-0.8', lo: 0.6, hi: 0.8 }),
    Object.freeze({ label: '0.8-1.0', lo: 0.8, hi: 1.0 + 1e-9 })
  ]);

  // ---- dasar ---------------------------------------------------------------------------

  function num(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }
  function str(value) { return value == null ? '' : String(value).trim(); }
  function round(value, digits) {
    var f = Math.pow(10, digits === undefined ? 4 : digits);
    return Math.round(num(value) * f) / f;
  }
  function logit(p) { return Math.log(p / (1 - p)); }
  function sigmoid(l) { return 1 / (1 + Math.exp(-l)); }

  /** Saturasi bukti n/(n+prior): kepercayaan tumbuh dengan bukti tapi tidak pernah
   *  mengklaim kepastian. insufficient -> 0, karena kami menolak berpendapat, bukan
   *  berpendapat dengan ragu. */
  function evidenceConfidence(n) {
    return round(n / (n + GATES.confidencePrior), 3);
  }

  /** Baris riwayat yang layak dihitung: objek dengan stempel waktu sah. Baris tanpa `at`
   *  dibuang — menghitung urutan waktu dari waktu karangan lebih buruk daripada tidak
   *  menghitung sama sekali. TIDAK memutasi input: hasilnya salinan ringkas. */
  function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];
    var rows = [];
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      if (!h || typeof h !== 'object') continue;
      var at = num(h.at, NaN);
      if (!isFinite(at) || at <= 0) continue;
      var predicted = num(h.predicted, NaN);
      rows.push({
        at: at,
        idx: i, // pemecah seri pengurutan: dua jawaban pada milidetik sama tetap deterministik
        ok: h.ok === true,
        type: str(h.type),
        skill: str(h.skill),
        lesson: str(h.reviewKey) || str(h.target) || str(h.skill),
        item: str(h.target) || str(h.id) || str(h.reviewKey),
        predicted: (isFinite(predicted) && predicted >= 0 && predicted <= 1) ? predicted : null,
        // Deteksi bantuan: eksplisit (hintUsed), berhitung (hints>0), atau jejak scaffold
        // tutor ('hint'/'choice'/'tell' — semua anak tangga di atas probe adalah bantuan).
        hinted: h.hintUsed === true || num(h.hints, 0) > 0 ||
          (function (s) { return s === 'hint' || s === 'choice' || s === 'tell'; })(str(h.scaffold))
      });
    }
    rows.sort(function (a, b) { return a.at - b.at || a.idx - b.idx; });
    return rows;
  }

  function accuracyOf(rows) {
    if (!rows.length) return null;
    var ok = 0;
    for (var i = 0; i < rows.length; i++) if (rows[i].ok) ok++;
    return ok / rows.length;
  }

  function groupBy(rows, keyFn) {
    var map = {};
    for (var i = 0; i < rows.length; i++) {
      var key = keyFn(rows[i]);
      if (!key) continue;
      (map[key] || (map[key] = [])).push(rows[i]);
    }
    return map;
  }

  function sortedKeys(map) {
    var keys = [];
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) keys.push(k);
    keys.sort();
    return keys;
  }

  // ---- 1. learning gain ------------------------------------------------------------------

  /**
   * Learning gain per lesson: akurasi jendela k-jawaban TERAKHIR dikurangi akurasi jendela
   * k-jawaban PERTAMA. Ini pre/post-test alami dari riwayat sendiri — kalau murid memang
   * belajar, jendela akhir harus lebih baik dari jendela awal pada lesson yang sama.
   * Gerbang: n >= 2k supaya kedua jendela TIDAK tumpang tindih; jendela yang berbagi
   * jawaban akan mengukur dirinya sendiri dan selalu tampak "stabil".
   */
  function learningGain(history, k, nowMs) {
    var kk = Math.max(GATES.gainKMin, Math.min(GATES.gainKMax,
      Math.floor(num(k, GATES.gainKDefault)) || GATES.gainKDefault));
    var rows = sanitizeHistory(history);
    var byLesson = groupBy(rows, function (r) { return r.lesson; });
    var keys = sortedKeys(byLesson);
    var lessons = [];
    var usable = 0, gated = 0, totalN = 0;
    for (var i = 0; i < keys.length; i++) {
      var xs = byLesson[keys[i]];
      var n = xs.length;
      totalN += n;
      if (n < 2 * kk) {
        gated++;
        lessons.push({
          lesson: keys[i], n: n, k: kk, early: null, late: null, gain: null,
          confidence: 0, insufficient: true,
          rationale: 'brain3_metric_learning_gain_insufficient'
        });
        continue;
      }
      usable++;
      var earlyAcc = accuracyOf(xs.slice(0, kk));
      var lateAcc = accuracyOf(xs.slice(n - kk));
      lessons.push({
        lesson: keys[i], n: n, k: kk,
        early: { n: kk, accuracy: round(earlyAcc) },
        late: { n: kk, accuracy: round(lateAcc) },
        gain: round(lateAcc - earlyAcc),
        // Hanya 2k jawaban ujung yang menginformasikan gain — jawaban tengah tidak ikut,
        // jadi confidence dihitung dari bukti yang benar-benar dipakai.
        confidence: evidenceConfidence(2 * kk),
        insufficient: false,
        rationale: 'brain3_metric_learning_gain'
      });
    }
    var insufficient = usable === 0;
    return {
      schema: SCHEMA, metric: 'learning_gain',
      rationale: insufficient ? 'brain3_metric_learning_gain_insufficient' : 'brain3_metric_learning_gain',
      k: kk, n: totalN, nLessons: keys.length, nReported: usable,
      confidence: insufficient ? 0 : evidenceConfidence(totalN),
      insufficient: insufficient,
      censored: gated > 0,
      lessons: lessons
    };
  }

  // ---- 2. retention at gap -----------------------------------------------------------------

  /**
   * Retensi setelah jeda: dari pasangan kemunculan BERURUTAN item yang sama, ambil pasangan
   * yang kemunculan awalnya BENAR (retensi mengukur bertahannya materi yang sudah dikuasai;
   * salah-lalu-salah tidak bercerita apa pun tentang lupa). Untuk tiap bucket b, semua
   * kemunculan-ulang dengan jeda >= b hari dihitung: bucket bersifat kumulatif sesuai
   * kontrak "muncul lagi setelah jeda >= bucket" — jeda 30 hari adalah bukti untuk bucket
   * 7, 14, DAN 30 sekaligus.
   */
  function retentionAtGap(history, gapBucketsDays, nowMs) {
    var defaults = [7, 14, 30];
    var raw = Array.isArray(gapBucketsDays) && gapBucketsDays.length ? gapBucketsDays : defaults;
    var days = [];
    for (var i = 0; i < raw.length; i++) {
      var d = num(raw[i], NaN);
      if (isFinite(d) && d > 0 && days.indexOf(d) === -1) days.push(d);
    }
    if (!days.length) days = defaults.slice();
    days.sort(function (a, b) { return a - b; });

    var rows = sanitizeHistory(history);
    var byItem = groupBy(rows, function (r) { return r.item; });
    var tallies = days.map(function () { return { n: 0, ok: 0 }; });
    var pairs = 0;
    var keys = sortedKeys(byItem);
    for (var ki = 0; ki < keys.length; ki++) {
      var xs = byItem[keys[ki]];
      for (var j = 1; j < xs.length; j++) {
        if (!xs[j - 1].ok) continue; // materi belum pernah benar = belum ada yang bisa "diretensi"
        pairs++;
        var gapDays = (xs[j].at - xs[j - 1].at) / DAY_MS;
        for (var b = 0; b < days.length; b++) {
          if (gapDays >= days[b]) {
            tallies[b].n++;
            if (xs[j].ok) tallies[b].ok++;
          }
        }
      }
    }
    var buckets = [];
    var reported = 0, gated = 0;
    for (var bi = 0; bi < days.length; bi++) {
      var t = tallies[bi];
      var thin = t.n < GATES.retentionMinPairs;
      if (thin) gated++; else reported++;
      buckets.push({
        gapDays: days[bi], n: t.n,
        accuracy: thin ? null : round(t.ok / t.n),
        confidence: thin ? 0 : evidenceConfidence(t.n),
        insufficient: thin,
        rationale: thin ? 'brain3_metric_retention_gap_insufficient' : 'brain3_metric_retention_gap'
      });
    }
    var insufficient = reported === 0;
    return {
      schema: SCHEMA, metric: 'retention_at_gap',
      rationale: insufficient ? 'brain3_metric_retention_gap_insufficient' : 'brain3_metric_retention_gap',
      n: pairs,
      confidence: insufficient ? 0 : evidenceConfidence(pairs),
      insufficient: insufficient,
      censored: gated > 0,
      buckets: buckets
    };
  }

  // ---- 3. brier calibration -----------------------------------------------------------------

  /**
   * Kalibrasi prediksi: Brier score antara `predicted` (peluang benar saat PENYAJIAN,
   * ditulis draw() ke baris riwayat — Fase 2 B3 butir 1) dan hasil sebenarnya. Selain skor
   * total, dilaporkan per band prediksi supaya arah biasnya terlihat: band 0.8-1.0 dengan
   * akurasi nyata 0.6 berarti model terlalu percaya diri, bukan sekadar "kurang akurat".
   * Skill score = 1 - Brier/BrierBaseline (baseline = selalu memprediksi base-rate):
   * positif berarti prediksi lebih informatif daripada tidak memprediksi sama sekali.
   */
  function brierCalibration(history, nowMs) {
    var rows = sanitizeHistory(history).filter(function (r) { return r.predicted !== null; });
    var n = rows.length;
    var thin = n < GATES.brierMinTotal;
    var sum = 0, okSum = 0;
    for (var i = 0; i < n; i++) {
      var o = rows[i].ok ? 1 : 0;
      sum += Math.pow(rows[i].predicted - o, 2);
      okSum += o;
    }
    var brier = null, baseline = null, skillScore = null;
    if (!thin) {
      brier = sum / n;
      var baseRate = okSum / n;
      var bsum = 0;
      for (var j = 0; j < n; j++) bsum += Math.pow(baseRate - (rows[j].ok ? 1 : 0), 2);
      baseline = bsum / n;
      skillScore = baseline > 0 ? 1 - brier / baseline : null;
    }
    var bands = [];
    var gatedBands = 0;
    for (var b = 0; b < BRIER_BANDS.length; b++) {
      var band = BRIER_BANDS[b];
      var xs = rows.filter(function (r) { return r.predicted >= band.lo && r.predicted < band.hi; });
      var bn = xs.length;
      var bandThin = bn < GATES.brierMinBand;
      if (bandThin && bn > 0) gatedBands++;
      var meanP = 0, acc = 0, bBrier = 0;
      for (var x = 0; x < bn; x++) {
        var oo = xs[x].ok ? 1 : 0;
        meanP += xs[x].predicted; acc += oo;
        bBrier += Math.pow(xs[x].predicted - oo, 2);
      }
      bands.push({
        band: band.label, n: bn,
        meanPredicted: bandThin ? null : round(meanP / bn),
        accuracy: bandThin ? null : round(acc / bn),
        // gap > 0: murid lebih sering benar dari prediksi (model underconfident);
        // gap < 0: overconfident. Nilai, bukan cerita — supaya bisa di-assert.
        gap: bandThin ? null : round(acc / bn - meanP / bn),
        brier: bandThin ? null : round(bBrier / bn),
        confidence: bandThin ? 0 : evidenceConfidence(bn),
        insufficient: bandThin,
        rationale: bandThin ? 'brain3_metric_brier_calibration_insufficient' : 'brain3_metric_brier_calibration'
      });
    }
    return {
      schema: SCHEMA, metric: 'brier_calibration',
      rationale: thin ? 'brain3_metric_brier_calibration_insufficient' : 'brain3_metric_brier_calibration',
      n: n,
      brier: thin ? null : round(brier),
      baselineBrier: thin ? null : round(baseline),
      skillScore: (thin || skillScore === null) ? null : round(skillScore),
      confidence: thin ? 0 : evidenceConfidence(n),
      insufficient: thin,
      censored: gatedBands > 0,
      bands: bands
    };
  }

  // ---- 4. hint dependency ---------------------------------------------------------------------

  /**
   * Ketergantungan bantuan: berapa porsi jawaban yang lahir dengan hint/scaffold, dan
   * apakah akurasi TANPA bantuan ikut sehat. hintRate tinggi + akurasi mandiri rendah
   * adalah "ilusi kompetensi": skor sesi bagus karena tangga scaffold, bukan karena
   * penguasaan. Label ambang: < 0.25 low, < 0.50 moderate, selebihnya high — selaras
   * titik tengah tangga scaffold tutor (satu dari dua jawaban dibantu = separuh bukti
   * penguasaan sebenarnya hilang).
   */
  function hintDependency(history, nowMs) {
    var rows = sanitizeHistory(history);
    var n = rows.length;
    var thin = n < GATES.hintMinTotal;
    var hinted = rows.filter(function (r) { return r.hinted; });
    var unhinted = rows.filter(function (r) { return !r.hinted; });
    var rate = n ? hinted.length / n : null;
    var label = null;
    if (!thin && rate !== null) label = rate < 0.25 ? 'low' : rate < 0.5 ? 'moderate' : 'high';

    var bySkill = groupBy(rows, function (r) { return r.skill; });
    var keys = sortedKeys(bySkill);
    var perSkill = [];
    var gatedSkills = 0;
    for (var i = 0; i < keys.length; i++) {
      var xs = bySkill[keys[i]];
      if (xs.length < GATES.hintMinSkill) { gatedSkills++; continue; } // disensor, bukan dikarang
      var hs = xs.filter(function (r) { return r.hinted; });
      perSkill.push({
        skill: keys[i], n: xs.length,
        hintRate: round(hs.length / xs.length),
        accuracy: round(accuracyOf(xs)),
        confidence: evidenceConfidence(xs.length)
      });
    }
    // Urut deterministik: paling bergantung dulu, seri dipecah abjad — byte-stabil.
    perSkill.sort(function (a, b) {
      return b.hintRate - a.hintRate || (a.skill < b.skill ? -1 : a.skill > b.skill ? 1 : 0);
    });
    return {
      schema: SCHEMA, metric: 'hint_dependency',
      rationale: thin ? 'brain3_metric_hint_dependency_insufficient' : 'brain3_metric_hint_dependency',
      n: n,
      hintRate: thin ? null : round(rate),
      dependency: label,
      hinted: { n: hinted.length, accuracy: thin || !hinted.length ? null : round(accuracyOf(hinted)) },
      unhinted: { n: unhinted.length, accuracy: thin || !unhinted.length ? null : round(accuracyOf(unhinted)) },
      confidence: thin ? 0 : evidenceConfidence(n),
      insufficient: thin,
      censored: gatedSkills > 0,
      perSkill: perSkill
    };
  }

  // ---- 5. misconception persistence --------------------------------------------------------------

  /** Peluruhan log-odds persis kontrak ledger: menuju PRIOR dengan paruh-waktu 14 hari.
   *  nowMs tidak sah -> tanpa peluruhan (jangan mengarang waktu), sama seperti ledger. */
  function decayedBelief(entry, nowMs) {
    var priorLogit = logit(LEDGER.priorBelief);
    var lo = num(entry.logOdds, priorLogit);
    var now = num(nowMs, NaN);
    var last = num(entry.lastMs, 0);
    if (isFinite(now) && now > last) {
      var keep = Math.pow(2, -((now - last) / DAY_MS) / LEDGER.halfLifeDays);
      lo = priorLogit + (lo - priorLogit) * keep;
    }
    return sigmoid(lo);
  }

  /**
   * Persistensi miskonsepsi: dari snapshot ledger (FiezelMisconceptionLedger v1, dibaca
   * SAJA — modul ini tidak pernah menulis ledger), klasifikasikan tiap entri pada nowMs:
   *   - 'active'   : belief >= 0.7 DAN >= 3 bukti DAN >= 2 sesi (gerbang ganda ledger) —
   *                  miskonsepsi yang BERTAHAN meski waktu berlalu;
   *   - 'resolved' : pernah aktif (everActive) lalu belief <= 0.3 — sudah teratasi;
   *   - 'watch'    : sisanya — ada jejak tapi belum layak dituduh ataupun dinyatakan pulih.
   * persistenceRate = active / (active + resolved): dari semua miskonsepsi yang pernah
   * mencapai status jelas, berapa porsi yang masih bertahan. Rasio ini disensor bila
   * entri berstatus jelas < 3 — rasio dari dua entri hanyalah anekdot.
   */
  function misconceptionPersistence(ledgerSnapshot, nowMs) {
    var valid = ledgerSnapshot && typeof ledgerSnapshot === 'object' &&
      !Array.isArray(ledgerSnapshot) && ledgerSnapshot.schema === LEDGER.schema &&
      ledgerSnapshot.entries && typeof ledgerSnapshot.entries === 'object' &&
      !Array.isArray(ledgerSnapshot.entries);
    var entries = [];
    if (valid) {
      var keys = sortedKeys(ledgerSnapshot.entries);
      for (var i = 0; i < keys.length; i++) {
        var e = ledgerSnapshot.entries[keys[i]];
        if (!e || typeof e !== 'object') continue;
        var concept = str(e.concept), mis = str(e.misconception);
        if (!concept || !mis) continue;
        var hits = Math.max(0, Math.floor(num(e.hits, 0)));
        var sessions = Array.isArray(e.sessions) ? e.sessions.length : 0;
        var belief = decayedBelief(e, nowMs);
        var status = 'watch';
        if (belief >= LEDGER.activeBelief && hits >= LEDGER.minEvidence && sessions >= LEDGER.minSessions) {
          status = 'active';
        } else if (e.everActive === true && belief <= LEDGER.resolvedBelief) {
          status = 'resolved';
        }
        entries.push({
          concept: concept, misconception: mis, belief: round(belief),
          hits: hits, sessions: sessions, status: status
        });
      }
    }
    // Urut deterministik: belief tertinggi (paling mendesak) dulu, seri dipecah kunci.
    entries.sort(function (a, b) {
      return b.belief - a.belief ||
        ((a.concept + '::' + a.misconception) < (b.concept + '::' + b.misconception) ? -1 : 1);
    });
    var active = 0, resolved = 0, watch = 0;
    for (var j = 0; j < entries.length; j++) {
      if (entries[j].status === 'active') active++;
      else if (entries[j].status === 'resolved') resolved++;
      else watch++;
    }
    var decided = active + resolved;
    var thinRate = decided < GATES.persistenceMinDecided;
    var insufficient = entries.length === 0;
    return {
      schema: SCHEMA, metric: 'misconception_persistence',
      rationale: insufficient ? 'brain3_metric_misconception_persistence_insufficient' : 'brain3_metric_misconception_persistence',
      n: entries.length,
      activeCount: active, resolvedCount: resolved, watchCount: watch,
      persistenceRate: thinRate ? null : round(active / decided),
      confidence: insufficient ? 0 : evidenceConfidence(decided),
      insufficient: insufficient,
      censored: !insufficient && thinRate,
      entries: entries
    };
  }

  return {
    SCHEMA: SCHEMA,
    GATES: GATES,
    LEDGER: LEDGER,
    BRIER_BANDS: BRIER_BANDS,
    learningGain: learningGain,
    retentionAtGap: retentionAtGap,
    brierCalibration: brierCalibration,
    hintDependency: hintDependency,
    misconceptionPersistence: misconceptionPersistence
  };
});
