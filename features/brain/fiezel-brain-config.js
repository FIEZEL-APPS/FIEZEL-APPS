/**
 * FIEZEL Brain Config — registry konfigurasi Brain berversi (Braincore v3; fable fase B,
 * opus fase C).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Angka-angka yang mengendalikan otak FIEZEL selama ini tersebar sebagai konstanta lokal
 * di tiga modul berbeda: parameter BKT di fiezel-mastery-bkt.js, target kesulitan dan
 * model ingatan FSRS-lite di fiezel-core-brain.js, dan ambang misconception di
 * fiezel-misconception-ledger.js. Itu benar untuk eksekusi (setiap modul memiliki
 * angkanya sendiri), tetapi buruk untuk TATA KELOLA: tidak ada satu tempat pun yang bisa
 * menjawab "berapa konfigurasi Brain saat ini, versi berapa, dan apa batas amannya?"
 *
 * Modul ini adalah jawaban untuk pertanyaan itu — sebuah SALINAN BACA-SAJA yang beku dari
 * konstanta-konstanta tersebut, plus batas keras (BOUNDS) per parameter dan satu fungsi
 * sanitize() untuk calon override. Registry versinya adalah GIT HISTORY berkas ini
 * sendiri, bukan layanan server: mengubah parameter Brain berarti mengubah berkas ini
 * (dan modul sumbernya) lewat commit yang bisa di-review dan di-revert — selaras dengan
 * arsitektur FIEZEL yang zero-runtime-cost dan offline penuh.
 *
 * KONTRAK SINKRONISASI: nilai default di sini WAJIB identik dengan konstanta aktual di
 * modul sumbernya. brain-config-test.js membaca ulang modul-modul sumber dan gagal keras
 * kalau ada satu angka pun yang menyimpang — jadi drift diam-diam tidak mungkin lolos CI.
 * Modul ini TIDAK dibaca oleh modul brain lain saat runtime (mereka tetap memakai
 * konstanta lokalnya); ia adalah sumber kebenaran untuk MANUSIA dan untuk tooling.
 *
 * KENAPA ADA BOUNDS
 * -----------------
 * Literatur degenerasi BKT (Baker, Corbett & Aleven 2008; van de Sande 2013) menunjukkan
 * model menjadi tak bermakna ketika slip/guess terlalu besar: dengan guess >= 0.3 sebuah
 * jawaban benar nyaris tidak membedakan "menguasai" dari "menebak", dan dengan
 * slip >= 0.1 (di luar ambang yang kami pakai) jawaban salah kehilangan daya diagnosisnya.
 * targetSuccess dikunci di [0.70, 0.90]: di bawah 0.70 sesi terasa seperti ujian yang
 * menghukum, di atas 0.90 sesi tidak mengajarkan apa-apa (zona nyaman). Bounds lain
 * mengikuti logika serupa — setiap batas adalah titik di mana parameter berhenti berarti.
 *
 * sanitize(overrides) memperlakukan setiap masukan sebagai TIDAK TEPERCAYA: hanya angka
 * finite pada field yang dikenal yang diterima; string (termasuk yang "kelihatan angka" —
 * jalur klasik injeksi), fungsi, NaN, Infinity, dan field tak dikenal DITOLAK dengan
 * alasan eksplisit; nilai valid yang keluar batas DIJEPIT ke bounds. schema dan
 * brainVersion tidak bisa di-override sama sekali — versi hanya berubah lewat commit.
 *
 * Modul MURNI: tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa sumber acak, tanpa
 * jam internal. Semua keluaran beku (deep-frozen) dan masukan tidak pernah dimutasi.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelBrainConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-brain-config-v1';

  // Versi semantik Brain v3. MAJOR naik saat perilaku keputusan berubah tak-kompatibel,
  // MINOR saat parameter di-tune, PATCH saat hanya dokumentasi/bounds yang berubah.
  var BRAIN_VERSION = '3.0.0';

  function deepFreeze(obj) {
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v && typeof v === 'object') deepFreeze(v);
    });
    return Object.freeze(obj);
  }

  // ====================================================================================
  // DEFAULT — salinan verbatim dari konstanta modul sumber. JANGAN mengubah angka di sini
  // tanpa mengubah modul sumbernya juga; brain-config-test.js menegakkan kesetaraan itu.
  // ====================================================================================
  var DEFAULTS = deepFreeze({
    schema: SCHEMA,
    brainVersion: BRAIN_VERSION,

    // Sumber: features/brain/fiezel-mastery-bkt.js -> PARAMS (BKT klasik Corbett & Anderson).
    bkt: {
      L0: 0.2,      // prior penguasaan sebelum bukti pertama
      T: 0.15,      // peluang transisi belajar per kesempatan
      slip: 0.1,    // murid yang menguasai tetap bisa salah
      guess: 0.25   // lantai tebakan pilihan-ganda 4 opsi
    },

    // Sumber: features/brain/fiezel-core-brain.js -> TARGET_SUCCESS, DISCRIMINATION,
    // GUESS_FLOOR, dan batas peluang pita challengeWindow() (floor p=0.90, ceiling p=0.55).
    difficulty: {
      targetSuccess: 0.8,     // titik belajar paling efisien
      discrimination: 1.5,    // slope IRT 2PL
      guessFloor: 0.25,       // lantai tebakan model IRT
      band: {
        floorSuccess: 0.9,    // latihan pemulihan: nyaris pasti bisa
        ceilingSuccess: 0.55  // peregangan disengaja, masih jauh di atas lantai tebakan
      }
    },

    // Sumber: features/brain/fiezel-core-brain.js -> BASE_HALF_LIFE_DAYS, MEMORY_*,
    // LAPSE_*, dan clamp stabilitas 0.2..365 hari di halfLife().
    memory: {
      baseHalfLifeDays: 1.6,   // paruh-waktu awal tanpa riwayat
      gain: 1.2,               // MEMORY_GAIN: skala gain sukses
      saturation: 0.15,        // MEMORY_SATURATION: S^-b, ingatan stabil tumbuh lambat
      spacing: 1.8,            // MEMORY_SPACING: e^(c·(1-R)), inti efek spacing
      lapseScale: 1.5,         // LAPSE_SCALE: skala stabilitas pasca-lapse
      lapseDifficulty: 0.6,    // LAPSE_DIFFICULTY: materi sulit runtuh lebih dalam
      lapseRetain: 0.35,       // LAPSE_RETAIN: sebagian riwayat penguatan dipertahankan
      lapseFloor: 0.1,         // LAPSE_FLOOR: lantai anti-keruntuhan total, S' >= 10% S
      stabilityMinDays: 0.2,   // clamp bawah halfLife()
      stabilityMaxDays: 365    // clamp atas halfLife()
    },

    // Sumber: features/brain/fiezel-misconception-ledger.js -> DECAY_HALF_LIFE_DAYS,
    // MIN_EVIDENCE, MIN_SESSIONS, ACTIVE_BELIEF.
    misconception: {
      halfLifeDays: 14,   // peluruhan belief menuju prior antar-sesi
      minEvidence: 3,     // minimal butir bukti distraktor
      minSessions: 2,     // minimal sessionId berbeda
      minBelief: 0.7      // gerbang masuk status aktif
    }
  });

  // ====================================================================================
  // BOUNDS — batas keras per parameter. Struktur mencerminkan DEFAULTS; setiap daun
  // adalah {min, max, integer?}. Batas dipilih pada titik di mana parameter kehilangan
  // makna, bukan sekadar "angka yang kelihatan aman":
  //   - guess max 0.3, slip max 0.1: ambang degenerasi BKT (lihat kepala berkas).
  //   - targetSuccess [0.70, 0.90]: di luar itu sesi jadi ujian atau jadi zona nyaman.
  //   - band.floorSuccess > band.ceilingSuccess selalu (pemulihan lebih mudah dari
  //     peregangan) — rentangnya sengaja tidak tumpang tindih.
  // ====================================================================================
  var BOUNDS = deepFreeze({
    bkt: {
      L0: { min: 0.05, max: 0.5 },      // prior 0 = menuduh, >0.5 = mengklaim tahu duluan
      T: { min: 0.01, max: 0.5 },       // T>0.5 berarti "sekali coba pasti bisa"
      slip: { min: 0.005, max: 0.1 },   // degenerasi BKT: slip harus < ~0.1
      guess: { min: 0.05, max: 0.3 }    // degenerasi BKT: guess harus < ~0.3
    },
    difficulty: {
      targetSuccess: { min: 0.7, max: 0.9 },
      discrimination: { min: 0.5, max: 2.5 },   // a<0.5 = soal tak membedakan; a>2.5 = tebing
      guessFloor: { min: 0.1, max: 0.3 },       // selaras batas guess BKT
      band: {
        floorSuccess: { min: 0.85, max: 0.97 },
        ceilingSuccess: { min: 0.4, max: 0.7 }
      }
    },
    memory: {
      baseHalfLifeDays: { min: 0.5, max: 7 },
      gain: { min: 0.5, max: 3 },
      saturation: { min: 0.05, max: 0.5 },
      spacing: { min: 0.5, max: 3 },
      lapseScale: { min: 0.5, max: 3 },
      lapseDifficulty: { min: 0.2, max: 1.2 },
      lapseRetain: { min: 0.1, max: 0.8 },
      lapseFloor: { min: 0.02, max: 0.3 },
      stabilityMinDays: { min: 0.05, max: 1 },
      stabilityMaxDays: { min: 30, max: 730 }
    },
    misconception: {
      halfLifeDays: { min: 3, max: 60 },
      minEvidence: { min: 2, max: 10, integer: true },   // <2 = menuduh dari satu slip
      minSessions: { min: 1, max: 6, integer: true },
      minBelief: { min: 0.5, max: 0.95 }                 // <0.5 = "lebih mungkin tidak"
    }
  });

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  /**
   * sanitize(overrides) -> {config, rejected, clamped, rationale, confidence}
   *
   * Membangun konfigurasi baru dari DEFAULTS + overrides yang sudah dibersihkan.
   * Aturan mainnya defensif, karena overrides bisa datang dari mana saja (URL param
   * eksperimen, berkas konfigurasi, tangan manusia yang salah ketik):
   *
   *   - hanya field yang ADA di DEFAULTS yang dikenal; sisanya masuk `rejected`
   *     dengan reason 'unknown_field' — typo tidak boleh diam-diam jadi no-op.
   *   - hanya `typeof === 'number'` yang finite diterima. String "0.25" pun ditolak
   *     ('non_numeric'): menerima string berarti membuka pintu coercion, dan coercion
   *     adalah tempat injeksi bersembunyi.
   *   - schema/brainVersion immutable ('immutable_field'): versi berubah lewat commit,
   *     bukan lewat override runtime.
   *   - nilai valid di luar bounds DIJEPIT (tercatat di `clamped`), bukan ditolak:
   *     niat eksperimennya dihormati, batas amannya tetap ditegakkan.
   *
   * `confidence` turun untuk setiap penjepitan dan (lebih tajam) setiap penolakan —
   * konfigurasi yang banyak dikoreksi adalah konfigurasi yang niat penulisnya tidak
   * tersampaikan utuh, dan pemanggil berhak tahu itu.
   */
  function sanitize(overrides) {
    var rejected = [];
    var clamped = [];

    if (overrides == null) {
      return deepFreeze({
        config: DEFAULTS,
        rejected: [],
        clamped: [],
        rationale: 'brain3_config_default',
        confidence: 1
      });
    }

    if (!isPlainObject(overrides)) {
      return deepFreeze({
        config: DEFAULTS,
        rejected: [{ path: '(root)', reason: 'overrides_not_object' }],
        clamped: [],
        rationale: 'brain3_config_overrides_invalid',
        confidence: 0.3
      });
    }

    // Salinan kerja mutable dari DEFAULTS (hanya section parameter, bukan schema/versi).
    var config = {
      schema: SCHEMA,
      brainVersion: BRAIN_VERSION,
      bkt: {}, difficulty: {}, memory: {}, misconception: {}
    };

    function copySection(dst, src) {
      Object.keys(src).forEach(function (k) {
        dst[k] = isPlainObject(src[k]) ? copySection({}, src[k]) : src[k];
      });
      return dst;
    }
    copySection(config.bkt, DEFAULTS.bkt);
    copySection(config.difficulty, DEFAULTS.difficulty);
    copySection(config.memory, DEFAULTS.memory);
    copySection(config.misconception, DEFAULTS.misconception);

    function applyLeaf(target, bounds, key, value, path) {
      if (typeof value !== 'number' || !isFinite(value)) {
        rejected.push({ path: path, reason: 'non_numeric' });
        return;
      }
      var b = bounds[key];
      var v = clamp(value, b.min, b.max);
      if (b.integer) v = Math.round(v);
      if (v !== value) clamped.push({ path: path, given: value, applied: v });
      target[key] = v;
    }

    function walk(target, bounds, over, prefix) {
      Object.keys(over).forEach(function (key) {
        var path = prefix ? prefix + '.' + key : key;
        if (!Object.prototype.hasOwnProperty.call(bounds, key)) {
          rejected.push({ path: path, reason: 'unknown_field' });
          return;
        }
        var b = bounds[key];
        var isBranch = isPlainObject(b) && b.min === undefined && b.max === undefined;
        if (isBranch) {
          if (!isPlainObject(over[key])) {
            rejected.push({ path: path, reason: 'non_object_section' });
            return;
          }
          walk(target[key], b, over[key], path);
          return;
        }
        applyLeaf(target, bounds, key, over[key], path);
      });
    }

    Object.keys(overrides).forEach(function (section) {
      if (section === 'schema' || section === 'brainVersion') {
        rejected.push({ path: section, reason: 'immutable_field' });
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(BOUNDS, section)) {
        rejected.push({ path: section, reason: 'unknown_field' });
        return;
      }
      if (!isPlainObject(overrides[section])) {
        rejected.push({ path: section, reason: 'non_object_section' });
        return;
      }
      walk(config[section], BOUNDS[section], overrides[section], section);
    });

    var rationale = 'brain3_config_sanitized_clean';
    if (rejected.length) rationale = 'brain3_config_sanitized_rejected';
    else if (clamped.length) rationale = 'brain3_config_sanitized_clamped';

    // 1.0 penuh hanya jika semua override diterima apa adanya; -0.1 per penjepitan
    // (niat tersampaikan tapi keluar batas), -0.15 per penolakan (niat tidak
    // tersampaikan sama sekali). Lantai 0.2: hasilnya tetap konfigurasi valid.
    var confidence = clamp(1 - 0.1 * clamped.length - 0.15 * rejected.length, 0.2, 1);

    return deepFreeze({
      config: deepFreeze(config),
      rejected: rejected,
      clamped: clamped,
      rationale: rationale,
      confidence: Math.round(confidence * 1000) / 1000
    });
  }

  return deepFreeze({
    schema: SCHEMA,
    brainVersion: BRAIN_VERSION,
    bkt: DEFAULTS.bkt,
    difficulty: DEFAULTS.difficulty,
    memory: DEFAULTS.memory,
    misconception: DEFAULTS.misconception,
    DEFAULTS: DEFAULTS,
    BOUNDS: BOUNDS,
    sanitize: sanitize
  });
});
