/**
 * FIEZEL Affect v3 — detektor afek bebas-sensor (Braincore v3, modul A9).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * `fatigue()` di Core Brain v2 hanya mengenal satu penyakit: beban kognitif. Padahal audit
 * council (opus C8, fable P7) menunjukkan empat keadaan yang intervensinya BERLAWANAN:
 *
 *   - FRUSTRASI: murid gagal beruntun, berjuang keras, dan menembak ulang terlalu cepat
 *     setelah salah. Obatnya menurunkan target kesulitan + scaffold lebih dini + breathe.
 *   - BOSAN: murid nyaris selalu benar, menjawab dari ingatan, materi monoton — dan mulai
 *     melambat karena tidak tertantang. Obatnya justru MENAIKKAN tantangan + interleaving.
 *     Riset Baker dkk. menunjukkan kebosanan lebih merusak hasil belajar daripada frustrasi,
 *     jadi memberi "breathe" kepada murid bosan adalah salah obat.
 *   - GAMING: murid menembak jawaban super cepat TANPA akurasi yang membenarkannya —
 *     ia sedang mengakali sistem, bukan belajar. Obatnya mode yang tidak bisa ditebak
 *     (teach_back, recall_memory_cue) + diskon bobot bukti.
 *   - LELAH: paruh kedua sesi melambat drastis DAN akurasi turun — dua sinyal wajib,
 *     persis logika fatigue() v2 (melambat saja bisa berarti berpikir lebih dalam,
 *     salah saja bisa berarti soal kebetulan sulit). Obatnya memperpendek sesi.
 *
 * Hari ini keempatnya memicu satu jalur yang sama. Itu satu obat untuk empat penyakit.
 *
 * BATAS YANG DIJAGA
 * -----------------
 * 1. MURNI. Tanpa DOM, tanpa jaringan, tanpa storage, tanpa Date.now(). Sinyal waktu
 *    seluruhnya datang dari argumen (ms, sinceMissMs).
 * 2. TIDAK MENEBAK DI ATAS BUKTI TIPIS. Di bawah MIN_ATTEMPTS (8) jawabannya selalu
 *    neutral dengan confidence 0 — detektor yang percaya diri pada lima jawaban lebih
 *    berbahaya daripada tidak ada detektor.
 * 3. HISTERESIS. Council menandai kapabilitas ini paling rawan osilasi kebijakan, maka
 *    keadaan hanya boleh berubah SEKALI per sesi: bila pemanggil menyatakan sudah pernah
 *    berubah (opts.changedAlready), keadaan sebelumnya dipertahankan apa pun kata sinyal.
 * 4. PRIORITAS DETEKSI TEGAS: gaming > frustrated > fatigued > bored. Gaming didahulukan
 *    karena ia mengkontaminasi BUKTI — sebelum bukti bisa dipercaya, keadaan lain tidak
 *    layak disimpulkan. Bored paling akhir karena paling murah risikonya bila keliru.
 * 5. SETIAP KEPUTUSAN MEMBAWA rationale (kode brain3_affect_*) dan suggestion yang
 *    BERBEDA per keadaan, supaya layar "kenapa" tidak mengarang ulang alasannya.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelAffect = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-affect-v1';

  // Ambang-ambang detektor. Diekspor supaya gate bisa menguji angkanya, bukan menebaknya.
  var MIN_ATTEMPTS = 8;          // di bawah ini: neutral, confidence 0 (kontrak council)
  var FAST_MS = 1800;            // batas "respons tembakan" dari C8 (respons < 1800ms)
  var GAMING_FAST_RATIO = 0.5;   // separuh sesi berupa tembakan cepat sudah mencurigakan
  var GAMING_MAX_ACCURACY = 0.8; // cepat + akurat = fluency, BUKAN gaming; batasnya di sini
  var FRUST_MISS_STREAK = 3;     // C8: frustration ∝ missStreak/3
  var FRUST_STRUGGLED_RATIO = 0.4; // rasio timing 'struggled' yang dianggap tinggi
  var FRUST_RETRY_MS = 3000;     // retry pasca-salah lebih cepat dari ini = menembak ulang
  var FATIGUE_SLOWDOWN = 1.5;    // paruh kedua >= 1.5x lebih lambat (sinyal wajib #1)
  var FATIGUE_ACC_DROP = 0.15;   // akurasi paruh kedua turun >= 15 poin (sinyal wajib #2)
  var BORED_ACCURACY = 0.92;     // C8: boredom butuh akurasi rata-rata > 0.92
  var BORED_RETRIEVED_RATIO = 0.6; // jawaban dominan 'retrieved' (hafal, tanpa usaha)
  var BORED_VARIETY_MAX = 0.34;  // konsep unik / attempt rendah = materi monoton
  var BORED_SLOWDOWN = 1.1;      // respons memanjang di item mudah = perhatian mengembara

  // ---- dasar ---------------------------------------------------------------------------

  function num(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, num(value, min))); }
  function round(value, digits) {
    var f = Math.pow(10, digits === undefined ? 2 : digits);
    return Math.round(num(value) * f) / f;
  }

  /**
   * Input dari dunia luar tidak pernah dipercaya mentah-mentah: baris yang bukan objek
   * dibuang, ms digenapkan ke rentang waras (0..5 menit), string aneh menjadi angka nol.
   * Detektor yang crash karena satu baris korup lebih buruk daripada detektor yang diam.
   */
  function sanitize(sessionAttempts) {
    var rows = Array.isArray(sessionAttempts) ? sessionAttempts : [];
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r || typeof r !== 'object') continue;
      out.push({
        ok: !!r.ok,
        ms: clamp(r.ms, 0, 300000),
        concept: r.concept == null ? '' : String(r.concept),
        timing: r.timing == null ? '' : String(r.timing),
        sinceMissMs: (r.sinceMissMs == null || !isFinite(Number(r.sinceMissMs)))
          ? null
          : clamp(r.sinceMissMs, 0, 3600000)
      });
    }
    return out;
  }

  // ---- fitur sesi ------------------------------------------------------------------------
  /**
   * Semua sinyal dihitung SEKALI di sini lalu dibaca oleh keempat detektor, supaya tidak
   * ada dua detektor yang diam-diam menghitung "akurasi" dengan cara berbeda.
   */
  function features(rows) {
    var n = rows.length;
    var correct = 0, fast = 0, struggled = 0, retrieved = 0;
    var missStreak = 0, maxMissStreak = 0;
    var retryCount = 0, fastRetryCount = 0;
    var concepts = {};
    var conceptCount = 0;
    for (var i = 0; i < n; i++) {
      var r = rows[i];
      if (r.ok) { correct++; missStreak = 0; }
      else { missStreak++; if (missStreak > maxMissStreak) maxMissStreak = missStreak; }
      if (r.ms < FAST_MS) fast++;
      if (r.timing === 'struggled') struggled++;
      if (r.timing === 'retrieved') retrieved++;
      if (r.sinceMissMs != null) {
        retryCount++;
        if (r.sinceMissMs < FRUST_RETRY_MS) fastRetryCount++;
      }
      if (r.concept && !concepts[r.concept]) { concepts[r.concept] = true; conceptCount++; }
    }

    // Paruh pertama vs paruh kedua — logika identik fatigue() v2: floor(n/2) di kedua sisi,
    // supaya sesi ganjil tidak membiarkan satu attempt tengah memihak salah satu paruh.
    var half = Math.floor(n / 2);
    var first = rows.slice(0, half);
    var last = rows.slice(n - half);
    var meanMs = function (xs) {
      var total = 0;
      for (var j = 0; j < xs.length; j++) total += xs[j].ms;
      return xs.length ? total / xs.length : 0;
    };
    var acc = function (xs) {
      var okCount = 0;
      for (var j = 0; j < xs.length; j++) if (xs[j].ok) okCount++;
      return xs.length ? okCount / xs.length : 0;
    };
    var firstMs = meanMs(first);

    return {
      n: n,
      accuracy: n ? correct / n : 0,
      fastRatio: n ? fast / n : 0,
      struggledRatio: n ? struggled / n : 0,
      retrievedRatio: n ? retrieved / n : 0,
      maxMissStreak: maxMissStreak,
      // Rasio retry cepat dihitung HANYA atas attempt yang punya sinceMissMs (attempt
      // pasca-salah); sesi tanpa kesalahan tidak boleh terbaca "retry cepat".
      fastRetryRatio: retryCount ? fastRetryCount / retryCount : 0,
      conceptVariety: n ? conceptCount / n : 0,
      slowdown: firstMs > 0 ? meanMs(last) / firstMs : 1,
      accDrop: acc(first) - acc(last)
    };
  }

  // ---- peta intervensi -------------------------------------------------------------------
  /**
   * Satu keadaan, satu obat — dan keempat obatnya HARUS berbeda (gate council C8).
   * Field-fieldnya sengaja sejajar dengan mekanisme yang sudah ada di app.js/Core Brain:
   * targetSuccess (Model B), move 'breathe' (decideMove), sessionSize (planSession),
   * modes (mode praktik), evidenceDiscount (kredibilitas bukti C6/P-fable).
   */
  function suggestionFor(state) {
    switch (state) {
      case 'frustrated':
        // Turunkan target kesulitan (= naikkan peluang sukses ke 0.90), scaffold lebih
        // dini, dan beri jeda napas. Murid yang gagal beruntun butuh bukti bahwa ia bisa.
        return { action: 'turunkan_target', targetSuccess: 0.90, scaffold: 'dini', move: 'breathe' };
      case 'bored':
        // Kebalikan frustrasi: naikkan tantangan (target sukses turun ke 0.75) dan
        // interleave konsep. "Breathe" untuk murid bosan mempercepat churn.
        return { action: 'naikkan_tantangan', targetSuccess: 0.75, interleave: true, stretch: true };
      case 'gaming':
        // Alihkan ke mode yang tidak bisa ditebak dengan menembak, dan diskon bobot bukti
        // sesi ini supaya tembakan tidak mencemari model penguasaan.
        return { action: 'mode_tak_tertebak', modes: ['teach_back', 'recall_memory_cue'], evidenceDiscount: 0.3 };
      case 'fatigued':
        // Dua sinyal kelelahan sudah tegak: sudahi lebih cepat, dominasi review ringan.
        return { action: 'perpendek_sesi', sessionSize: 6, reviewShare: 'tinggi' };
      default:
        // Netral = jangan sentuh apa pun. Intervensi tanpa alasan adalah osilasi.
        return { action: 'lanjutkan', targetSuccess: null };
    }
  }

  // ---- detektor --------------------------------------------------------------------------
  /**
   * Setiap detektor mengembalikan null (tidak terpicu) atau {state, confidence, rationale}.
   * Confidence dibangun dari seberapa jauh sinyal melewati ambangnya — bukan angka karangan —
   * supaya sesi yang nyaris-ambang tidak sama meyakinkannya dengan sesi yang ekstrem.
   */

  function detectGaming(f) {
    // Cepat + TIDAK akurat. Murid fasih juga cepat, tapi ia benar — karena itu akurasi
    // tinggi MEMBEBASKAN dari tuduhan gaming (kontrak: "TANPA akurasi tinggi").
    if (f.fastRatio < GAMING_FAST_RATIO || f.accuracy >= GAMING_MAX_ACCURACY) return null;
    var strength = clamp((f.fastRatio - GAMING_FAST_RATIO) / (1 - GAMING_FAST_RATIO), 0, 1);
    var inaccuracy = clamp((GAMING_MAX_ACCURACY - f.accuracy) / GAMING_MAX_ACCURACY, 0, 1);
    return {
      state: 'gaming',
      confidence: round(clamp(0.5 + 0.5 * (0.6 * strength + 0.4 * inaccuracy), 0, 1), 3),
      rationale: 'brain3_affect_gaming'
    };
  }

  function detectFrustrated(f) {
    // Tiga syarat sekaligus: gagal beruntun (>=3), berjuang keras (rasio struggled tinggi),
    // dan menembak ulang terlalu cepat setelah salah. Satu saja tidak cukup — murid yang
    // salah tiga kali tapi tenang sedang belajar, bukan sedang frustrasi.
    if (f.maxMissStreak < FRUST_MISS_STREAK) return null;
    if (f.struggledRatio < FRUST_STRUGGLED_RATIO) return null;
    if (f.fastRetryRatio < 0.5) return null;
    var streak = clamp(f.maxMissStreak / (FRUST_MISS_STREAK * 2), 0, 1);
    return {
      state: 'frustrated',
      confidence: round(clamp(0.5 + 0.5 * (0.4 * streak + 0.3 * f.struggledRatio + 0.3 * f.fastRetryRatio), 0, 1), 3),
      rationale: 'brain3_affect_frustrated'
    };
  }

  function detectFatigued(f) {
    // DUA sinyal wajib, konsisten fatigue() v2: melambat >= 1.5x DAN akurasi turun.
    // Melambat saja = mungkin berpikir lebih dalam. Turun saja = mungkin soal lebih sulit.
    if (f.slowdown < FATIGUE_SLOWDOWN) return null;
    if (f.accDrop < FATIGUE_ACC_DROP) return null;
    var slowing = clamp((f.slowdown - 1) / 1, 0, 1);
    var slipping = clamp(f.accDrop / 0.4, 0, 1);
    return {
      state: 'fatigued',
      confidence: round(clamp(0.5 + 0.5 * (0.5 * slowing + 0.5 * slipping), 0, 1), 3),
      rationale: 'brain3_affect_fatigued'
    };
  }

  function detectBored(f) {
    // Empat wajah kebosanan bersamaan: nyaris selalu benar, menjawab dari hafalan
    // (retrieved dominan), materi monoton (variasi konsep rendah), dan MELAMBAT justru
    // di item mudah — perhatian yang mengembara, bukan pikiran yang bekerja.
    if (f.accuracy < BORED_ACCURACY) return null;
    if (f.retrievedRatio < BORED_RETRIEVED_RATIO) return null;
    if (f.conceptVariety > BORED_VARIETY_MAX) return null;
    if (f.slowdown < BORED_SLOWDOWN) return null;
    var monotony = clamp(1 - f.conceptVariety / BORED_VARIETY_MAX, 0, 1);
    var drifting = clamp((f.slowdown - 1) / 0.5, 0, 1);
    return {
      state: 'bored',
      confidence: round(clamp(0.5 + 0.5 * (0.4 * f.retrievedRatio + 0.3 * monotony + 0.3 * drifting), 0, 1), 3),
      rationale: 'brain3_affect_bored'
    };
  }

  // ---- API utama ---------------------------------------------------------------------------
  /**
   * assess(sessionAttempts, opts) -> {state, confidence, rationale, suggestion}
   *
   * sessionAttempts: [{ok, ms, concept, timing?, sinceMissMs?}] — attempt sesi berjalan,
   *   urut waktu. sinceMissMs hanya ada pada attempt yang datang setelah sebuah kesalahan.
   * opts.previous: keadaan yang sedang berlaku (hasil assess sebelumnya di sesi ini).
   * opts.changedAlready: true bila keadaan SUDAH pernah berubah di sesi ini — histeresis
   *   council: satu perubahan per sesi, titik. Detektor afek yang berubah-ubah pikiran tiap
   *   tiga soal menghasilkan pengalaman yang lebih buruk daripada tanpa detektor.
   */
  var STATES = Object.freeze(['neutral', 'frustrated', 'bored', 'gaming', 'fatigued']);

  function assess(sessionAttempts, opts) {
    var options = (opts && typeof opts === 'object') ? opts : {};
    var previous = STATES.indexOf(options.previous) !== -1 ? options.previous : null;
    var rows = sanitize(sessionAttempts);

    // Gerbang bukti: di bawah 8 attempt, satu-satunya jawaban jujur adalah "belum tahu".
    if (rows.length < MIN_ATTEMPTS) {
      return {
        state: 'neutral',
        confidence: 0,
        rationale: 'brain3_affect_insufficient_evidence',
        suggestion: suggestionFor('neutral')
      };
    }

    var f = features(rows);

    // Urutan panggilan = urutan prioritas kontrak: gaming > frustrated > fatigued > bored.
    var detected = detectGaming(f) || detectFrustrated(f) || detectFatigued(f) || detectBored(f)
      || { state: 'neutral', confidence: round(clamp(0.3 + f.n / 40, 0, 0.8), 3), rationale: 'brain3_affect_neutral' };

    // Histeresis: bila keadaan sudah pernah berubah di sesi ini, TAHAN keadaan sebelumnya.
    // Sinyal boleh berteriak; kebijakan tetap hanya boleh berbelok sekali per sesi.
    if (options.changedAlready && previous && detected.state !== previous) {
      return {
        state: previous,
        confidence: round(clamp(num(options.previousConfidence, 0.5), 0, 1), 3),
        rationale: 'brain3_affect_hysteresis_hold',
        suggestion: suggestionFor(previous)
      };
    }

    return {
      state: detected.state,
      confidence: detected.confidence,
      rationale: detected.rationale,
      suggestion: suggestionFor(detected.state)
    };
  }

  return {
    SCHEMA: SCHEMA,
    MIN_ATTEMPTS: MIN_ATTEMPTS,
    FAST_MS: FAST_MS,
    STATES: STATES,
    assess: assess,
    suggestionFor: suggestionFor
  };
});
