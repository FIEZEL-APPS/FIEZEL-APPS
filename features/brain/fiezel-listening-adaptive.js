/**
 * FIEZEL Listening Adaptive v3 — kesulitan listening tanpa model berat (Braincore v3, modul B6).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Audit council (fable P9, sol §7.10) menemukan bahwa listening adalah satu-satunya skill
 * yang bisa dibuat adaptif SEKARANG tanpa model apa pun: kesulitannya bukan pada "soal
 * lebih pintar", melainkan pada tiga tombol fisik yang sudah dimiliki pemutar audio —
 * KECEPATAN PUTAR, KUOTA REPLAY, dan PANJANG KLIP. Ketiganya nol biaya, offline, dan
 * sudah tercatat di sidecar fiezel-sl-v1-state (field `replays` per event).
 *
 * DUA PRINSIP YANG MEMBENTUK SELURUH LOGIKA
 * -----------------------------------------
 * 1. ATURAN 0.80. Kesulitan dikontrol supaya peluang sukses murid mendekati target
 *    (default 0.80) — terlalu mudah tidak mengajarkan apa pun, terlalu sulit hanya
 *    mengajarkan rasa gagal. Sama dengan targetSuccess di Tutor Brain.
 * 2. SATU DIMENSI PER LANGKAH (sol §7.10). Kalau dua tombol diputar sekaligus dan murid
 *    berubah hasilnya, kita tidak tahu tombol mana yang bekerja — diagnosis kehilangan
 *    identifiability. Maka setiap keputusan mengubah TEPAT SATU dimensi:
 *      naik : rateBand dulu (slow→natural→fast), lalu clipLength (short→medium→long),
 *             baru terakhir kuota replay diturunkan (3→0);
 *      turun: urutan kebalik — kuota replay dinaikkan dulu (paling murah, tidak
 *             mengubah materinya), lalu klip dipendekkan, baru kecepatan diperlambat.
 *    Urutan ini disengaja: kecepatan adalah tombol paling halus (materi sama, telinga
 *    diberi waktu), replay adalah jaring pengaman terakhir — mencabutnya paling keras,
 *    jadi ia dinaikkan paling akhir dan dikembalikan paling awal.
 *
 * SINYAL BEBAN TERSEMBUNYI
 * ------------------------
 * Akurasi tinggi TIDAK otomatis berarti murid siap naik. Murid yang menjawab benar
 * setelah memutar ulang audio 3 kali sedang bekerja jauh lebih keras daripada yang
 * terlihat di kolom "benar". Rata-rata replay >= 2 pada jendela terakhir dibaca sebagai
 * beban tersembunyi: kenaikan DITAHAN meski akurasi di atas target. Ini cermin dari
 * diskon kappa replay>=3 di FiezelEvidenceCredibility — sinyal yang sama, keputusan
 * di lapisan berbeda.
 *
 * BATAS YANG DIJAGA
 * -----------------
 * 1. MURNI. Tanpa DOM, tanpa jaringan, tanpa storage, tanpa Date.now, tanpa Math.random.
 *    Masukan yang sama SELALU menghasilkan keputusan yang sama (deterministik).
 * 2. TIDAK MENEBAK DI ATAS BUKTI TIPIS. Di bawah MIN_EVIDENCE (3) percobaan pada jendela,
 *    kebijakan menahan baseline — kebijakan yang berayun karena satu jawaban kebetulan
 *    lebih berbahaya daripada kebijakan yang diam.
 * 3. TAHAN INPUT KORUP. Riwayat bukan array, baris bukan objek, angka NaN/negatif,
 *    mastery di luar 0..100 — semuanya dinormalkan, tidak pernah melempar exception.
 *    Input kosong menghasilkan default aman: natural / kuota 2 / medium.
 * 4. SETIAP KEPUTUSAN MEMBAWA rationale (kode brain3_listening_*) supaya layar "kenapa"
 *    tidak mengarang ulang alasannya — explain() menerjemahkan kode ke kalimat Indonesia.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelListeningAdaptive = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-listening-adaptive-v1';

  // Tangga nilai tiap dimensi, dari termudah ke tersulit. Diekspor supaya gate menguji
  // angkanya, bukan menebaknya (pola yang sama dengan fiezel-affect.js).
  var RATE_BANDS = ['slow', 'natural', 'fast'];
  var CLIP_LENGTHS = ['short', 'medium', 'long'];
  var REPLAY_MAX = 3;   // kuota paling murah hati — jaring pengaman penuh
  var REPLAY_MIN = 0;   // kuota tersulit — sekali dengar, seperti ujian

  var WINDOW = 6;             // jendela bukti: 6 percobaan terakhir, cukup untuk arah,
                              // cukup pendek untuk tidak menyeret sesi minggu lalu
  var MIN_EVIDENCE = 3;       // di bawah ini: tahan baseline (kontrak "bukti tipis")
  var TARGET_DEFAULT = 0.80;  // aturan 0.80 — target peluang sukses
  var BAND_HALF_WIDTH = 0.1;  // pita mati ±0.1 di sekitar target: dalam pita = tahan,
                              // supaya kebijakan tidak berosilasi karena noise kecil
  var HIDDEN_LOAD_REPLAYS = 2; // rata-rata replay >= 2 = beban tersembunyi, jangan naik

  // Default aman untuk murid tanpa bukti atau input korup: titik tengah semua dimensi.
  var DEFAULTS = { rateBand: 'natural', replayQuota: 2, clipLength: 'medium' };

  // Ambang tier mastery untuk baseline. Mastery rendah mulai dari kombinasi termudah,
  // mastery tinggi dari kombinasi menantang — bukti akurasi lalu menggesernya satu langkah.
  var MASTERY_LOW = 35;
  var MASTERY_HIGH = 70;

  /** Kamus alasan — satu sumber kebenaran untuk explain(), bukan string tersebar. */
  var EXPLANATIONS = {
    brain3_listening_default: 'Belum ada bukti listening yang bisa dibaca, jadi kesulitan diset ke titik tengah yang aman: kecepatan natural, 2 replay, klip sedang.',
    brain3_listening_baseline_low: 'Mastery masih rendah, jadi titik awal diambil dari kombinasi termudah: pelan, replay penuh, klip pendek.',
    brain3_listening_baseline_mid: 'Mastery menengah, jadi titik awal di tengah tangga kesulitan.',
    brain3_listening_baseline_high: 'Mastery sudah tinggi, jadi titik awal langsung menantang: cepat, replay terbatas, klip panjang.',
    brain3_listening_insufficient_evidence: 'Bukti pada jendela terakhir terlalu tipis untuk dipercaya, jadi kesulitan ditahan dulu — kebijakan yang berayun karena satu jawaban lebih berbahaya daripada yang diam.',
    brain3_listening_step_up_rate: 'Akurasi jauh di atas target, jadi kecepatan putar dinaikkan satu pita — hanya kecepatan, supaya kalau hasil berubah kita tahu tombol mana penyebabnya.',
    brain3_listening_step_up_clip: 'Akurasi jauh di atas target dan kecepatan sudah maksimal, jadi giliran panjang klip yang dinaikkan satu tingkat.',
    brain3_listening_step_up_replay: 'Akurasi jauh di atas target pada kecepatan dan klip maksimal, jadi jaring pengaman terakhir dikurangi: kuota replay turun satu.',
    brain3_listening_step_down_replay: 'Akurasi di bawah target, jadi jaring pengaman dikembalikan dulu: kuota replay naik satu — tombol termurah, materi tidak berubah.',
    brain3_listening_step_down_clip: 'Akurasi di bawah target dan replay sudah penuh, jadi klip dipendekkan satu tingkat.',
    brain3_listening_step_down_rate: 'Akurasi di bawah target meski replay penuh dan klip pendek, jadi kecepatan diperlambat satu pita.',
    brain3_listening_hold_in_band: 'Akurasi berada di dalam pita target (±0.1), jadi kesulitan dipertahankan — di sinilah belajar paling efisien.',
    brain3_listening_hidden_load_replays: 'Akurasi memang tinggi, tetapi rata-rata replay >= 2 menandakan murid bekerja jauh lebih keras daripada yang terlihat — kenaikan ditahan sampai bebannya turun.',
    brain3_listening_ceiling: 'Semua dimensi sudah di tingkat tersulit; tidak ada yang bisa dinaikkan lagi.',
    brain3_listening_floor: 'Semua dimensi sudah di tingkat termudah; tidak ada yang bisa diturunkan lagi.'
  };

  /** Angka aman: kembalikan fallback bila bukan angka finite. */
  function num(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, lo, hi) {
    return Math.min(hi, Math.max(lo, value));
  }

  /**
   * Normalkan riwayat replay menjadi baris {replays>=0, correct boolean}.
   * Baris yang bukan objek dibuang — lebih jujur menganggapnya tidak ada daripada
   * menebak isinya. replays negatif/NaN dianggap 0 (tidak pernah ada replay minus).
   */
  function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];
    var rows = [];
    for (var i = 0; i < history.length; i++) {
      var row = history[i];
      if (!row || typeof row !== 'object') continue;
      rows.push({
        replays: clamp(num(row.replays, 0), 0, 99),
        correct: row.correct === true
      });
    }
    return rows;
  }

  /**
   * Statistik jendela: akurasi first-attempt dan rata-rata replay pada <=WINDOW baris
   * terakhir. "First-attempt" di sini berarti jawaban pertama murid pada item itu —
   * replay audio TIDAK membatalkannya (replay adalah beban, bukan percobaan kedua);
   * bebannya justru dibaca lewat meanReplays.
   */
  function windowStats(history) {
    var rows = sanitizeHistory(history).slice(-WINDOW);
    if (!rows.length) return { n: 0, accuracy: null, meanReplays: null };
    var correct = 0;
    var replays = 0;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].correct) correct++;
      replays += rows[i].replays;
    }
    return {
      n: rows.length,
      accuracy: correct / rows.length,
      meanReplays: replays / rows.length
    };
  }

  /**
   * Baseline dari mastery: titik awal tangga sebelum bukti akurasi menggesernya.
   * Mastery bukan pengganti bukti — ia hanya menentukan DARI MANA kita mulai mencari.
   */
  function baselineFor(mastery) {
    if (mastery === null) {
      return { dims: { rateBand: DEFAULTS.rateBand, replayQuota: DEFAULTS.replayQuota, clipLength: DEFAULTS.clipLength }, rationale: 'brain3_listening_default' };
    }
    if (mastery < MASTERY_LOW) {
      return { dims: { rateBand: 'slow', replayQuota: 3, clipLength: 'short' }, rationale: 'brain3_listening_baseline_low' };
    }
    if (mastery < MASTERY_HIGH) {
      return { dims: { rateBand: 'natural', replayQuota: 2, clipLength: 'medium' }, rationale: 'brain3_listening_baseline_mid' };
    }
    return { dims: { rateBand: 'fast', replayQuota: 1, clipLength: 'long' }, rationale: 'brain3_listening_baseline_high' };
  }

  /**
   * Naik SATU langkah. Urutan kontrak: rateBand dulu, lalu clipLength, terakhir kuota
   * replay dikurangi. Mengembalikan dims baru + kode alasan; bila sudah mentok semua,
   * dims tidak berubah dan alasannya ceiling.
   */
  function stepUp(dims) {
    var rateIdx = RATE_BANDS.indexOf(dims.rateBand);
    if (rateIdx >= 0 && rateIdx < RATE_BANDS.length - 1) {
      return { dims: { rateBand: RATE_BANDS[rateIdx + 1], replayQuota: dims.replayQuota, clipLength: dims.clipLength }, rationale: 'brain3_listening_step_up_rate' };
    }
    var clipIdx = CLIP_LENGTHS.indexOf(dims.clipLength);
    if (clipIdx >= 0 && clipIdx < CLIP_LENGTHS.length - 1) {
      return { dims: { rateBand: dims.rateBand, replayQuota: dims.replayQuota, clipLength: CLIP_LENGTHS[clipIdx + 1] }, rationale: 'brain3_listening_step_up_clip' };
    }
    if (dims.replayQuota > REPLAY_MIN) {
      return { dims: { rateBand: dims.rateBand, replayQuota: dims.replayQuota - 1, clipLength: dims.clipLength }, rationale: 'brain3_listening_step_up_replay' };
    }
    return { dims: { rateBand: dims.rateBand, replayQuota: dims.replayQuota, clipLength: dims.clipLength }, rationale: 'brain3_listening_ceiling' };
  }

  /**
   * Turun SATU langkah — urutan kebalik dari stepUp: kuota replay dinaikkan dulu
   * (paling murah), lalu klip dipendekkan, terakhir kecepatan diperlambat.
   */
  function stepDown(dims) {
    if (dims.replayQuota < REPLAY_MAX) {
      return { dims: { rateBand: dims.rateBand, replayQuota: dims.replayQuota + 1, clipLength: dims.clipLength }, rationale: 'brain3_listening_step_down_replay' };
    }
    var clipIdx = CLIP_LENGTHS.indexOf(dims.clipLength);
    if (clipIdx > 0) {
      return { dims: { rateBand: dims.rateBand, replayQuota: dims.replayQuota, clipLength: CLIP_LENGTHS[clipIdx - 1] }, rationale: 'brain3_listening_step_down_clip' };
    }
    var rateIdx = RATE_BANDS.indexOf(dims.rateBand);
    if (rateIdx > 0) {
      return { dims: { rateBand: RATE_BANDS[rateIdx - 1], replayQuota: dims.replayQuota, clipLength: dims.clipLength }, rationale: 'brain3_listening_step_down_rate' };
    }
    return { dims: { rateBand: dims.rateBand, replayQuota: dims.replayQuota, clipLength: dims.clipLength }, rationale: 'brain3_listening_floor' };
  }

  /**
   * Kebijakan utama (API FINAL kontrak Fase 2).
   *
   * @param {{mastery?:number, replayHistory?:Array<{replays:number,correct:boolean}>, targetSuccess?:number}} input
   * @returns {{rateBand:'slow'|'natural'|'fast', replayQuota:number, clipLength:'short'|'medium'|'long', rationale:string[], confidence:number}}
   *
   * Alur keputusan:
   *   1. Baseline dari mastery (atau default aman bila mastery tidak bisa dibaca).
   *   2. Bukti tipis (< MIN_EVIDENCE pada jendela 6) -> tahan baseline.
   *   3. Akurasi > target+0.1 -> naik SATU dimensi, KECUALI rata-rata replay >= 2
   *      (beban tersembunyi) -> tahan.
   *   4. Akurasi < target-0.1 -> turun SATU dimensi.
   *   5. Dalam pita -> tahan (di sinilah belajar paling efisien).
   */
  function policy(input) {
    var src = (input && typeof input === 'object') ? input : {};

    var masteryRaw = num(src.mastery, NaN);
    var mastery = Number.isFinite(masteryRaw) ? clamp(masteryRaw, 0, 100) : null;
    var target = clamp(num(src.targetSuccess, TARGET_DEFAULT), 0.5, 0.95);

    var base = baselineFor(mastery);
    var stats = windowStats(src.replayHistory);
    var rationale = [base.rationale];

    // Kepercayaan keputusan tumbuh dengan jumlah bukti pada jendela — 6 baris = penuh.
    var confidence = Math.round((stats.n / WINDOW) * 100) / 100;

    var dims = base.dims;

    if (stats.n < MIN_EVIDENCE) {
      // Bukti terlalu tipis: tahan baseline. Termasuk kasus riwayat kosong/korup.
      rationale.push(stats.n === 0 ? 'brain3_listening_default' : 'brain3_listening_insufficient_evidence');
      // Riwayat kosong pada mastery yang juga kosong sudah membawa kode default dari
      // baseline; hindari kode ganda yang sama berturut-turut.
      if (rationale[0] === rationale[1]) rationale = [rationale[0]];
      return finalize(dims, rationale, confidence);
    }

    if (stats.accuracy > target + BAND_HALF_WIDTH) {
      if (stats.meanReplays >= HIDDEN_LOAD_REPLAYS) {
        // Akurasi tinggi TAPI dibeli dengan banyak replay: beban tersembunyi. Tahan.
        rationale.push('brain3_listening_hidden_load_replays');
        return finalize(dims, rationale, confidence);
      }
      var up = stepUp(dims);
      rationale.push(up.rationale);
      return finalize(up.dims, rationale, confidence);
    }

    if (stats.accuracy < target - BAND_HALF_WIDTH) {
      var down = stepDown(dims);
      rationale.push(down.rationale);
      return finalize(down.dims, rationale, confidence);
    }

    rationale.push('brain3_listening_hold_in_band');
    return finalize(dims, rationale, confidence);
  }

  /** Bentuk keluaran final — satu tempat supaya bentuknya tidak menyimpang antar cabang. */
  function finalize(dims, rationale, confidence) {
    return {
      rateBand: dims.rateBand,
      replayQuota: clamp(dims.replayQuota, REPLAY_MIN, REPLAY_MAX),
      clipLength: dims.clipLength,
      rationale: rationale.slice(),
      confidence: confidence
    };
  }

  /**
   * Terjemahkan kode rationale ke kalimat Indonesia untuk layar "kenapa".
   * Menerima satu kode string ATAU keluaran policy() utuh (diambil rationale-nya).
   */
  // Parameter kedua OPSIONAL (W2-FEAT-A, desain W1-FEAT-A): tabel naskah pengganti
  // per-kode (mis. th yang dirakit app dari copy-map i18n). Fallback per-kunci ke
  // EXPLANATIONS beku — modul tetap murni, tidak menyentuh lapisan i18n (AI-08 F01).
  function explain(codeOrDecision, naskah) {
    var T = (naskah && typeof naskah === 'object') ? naskah : null;
    if (typeof codeOrDecision === 'string') {
      var line = (T && typeof T[codeOrDecision] === 'string') ? T[codeOrDecision] : EXPLANATIONS[codeOrDecision];
      return line || 'Keputusan listening adaptif tanpa penjelasan terdaftar (' + codeOrDecision + ').';
    }
    if (codeOrDecision && Array.isArray(codeOrDecision.rationale)) {
      return codeOrDecision.rationale.map(function (code) { return explain(code, T); }).join(' ');
    }
    return (T && typeof T.brain3_listening_default === 'string') ? T.brain3_listening_default : EXPLANATIONS.brain3_listening_default;
  }

  return {
    SCHEMA: SCHEMA,
    RATE_BANDS: RATE_BANDS,
    CLIP_LENGTHS: CLIP_LENGTHS,
    REPLAY_MAX: REPLAY_MAX,
    REPLAY_MIN: REPLAY_MIN,
    WINDOW: WINDOW,
    MIN_EVIDENCE: MIN_EVIDENCE,
    TARGET_DEFAULT: TARGET_DEFAULT,
    BAND_HALF_WIDTH: BAND_HALF_WIDTH,
    HIDDEN_LOAD_REPLAYS: HIDDEN_LOAD_REPLAYS,
    DEFAULTS: DEFAULTS,
    policy: policy,
    explain: explain,
    // Helper murni diekspor supaya gate bisa menguji URUTAN dimensi pada semua kombinasi,
    // bukan hanya kombinasi yang kebetulan dijangkau baseline mastery.
    stepUp: stepUp,
    stepDown: stepDown,
    windowStats: windowStats
  };
});
