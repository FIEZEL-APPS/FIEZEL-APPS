/**
 * FIEZEL Speaking Adaptive v3 — adaptivitas speaking tanpa ASR baru (Braincore v3, modul C2).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Konsensus council (sol §7.10, opus C10) tegas: TANPA model ONNX/ASR baru. Recognition
 * browser yang sudah ada di Speaking Lab TIDAK boleh dibaca sebagai skor pengucapan —
 * ia hanya jujur sebagai TARGET COVERAGE: berapa bagian dari konsep target yang muncul
 * dalam produksi lisan murid. Speaking Lab existing sudah menghitung itu (conceptCoverage
 * di fiezel-speaking-listening-addon.js, claim 'spoken_production_coverage_not_pronunciation')
 * dan hanya menyimpan agregat di sidecar fiezel-sl-v1-state: skor, responseMs, replays —
 * TANPA audio, TANPA transkrip. Modul ini bekerja HANYA di atas agregat itu.
 *
 * DUA KEJUJURAN YANG MEMBENTUK SELURUH LOGIKA
 * -------------------------------------------
 * 1. BUKTI SPEAKING SELALU DIDISKON. Recognizer browser bisa salah dengar, salah tangkap
 *    aksen, atau menangkap suara TV di belakang murid. Karena itu evidence() TIDAK PERNAH
 *    mengembalikan kappa > 0.6 — bukti speaking tidak pernah setara bukti ketikan, sekuat
 *    apa pun coverage-nya. Ini bukan pesimisme; ini mencegah satu sesi speaking yang
 *    "kebetulan bagus" menggeser mastery lebih jauh daripada yang pantas.
 * 2. SATU DIMENSI PER LANGKAH (sol §7.10, pola yang sama dengan listening). Kesulitan
 *    speaking punya dua tombol: KOMPLEKSITAS PROMPT (word -> phrase -> sentence -> open)
 *    dan SCAFFOLD (model_first -> cue_only -> free). Kalau keduanya diputar bersamaan,
 *    diagnosis kehilangan identifiability. Maka setiap keputusan mengubah TEPAT SATU:
 *      naik : scaffold dilepas dulu (model_first -> cue_only -> free) — murid dibebaskan
 *             pada materi yang sama sebelum materinya dinaikkan; baru setelah free,
 *             kompleksitas prompt naik satu tingkat;
 *      turun: scaffold dikembalikan dulu (free -> cue_only -> model_first) — tombol
 *             termurah, materinya tidak berubah; baru kalau model_first pun belum cukup,
 *             kompleksitas diturunkan.
 *    Urutan ini disengaja: scaffold adalah bantuan, bukan materi — memasang/melepasnya
 *    tidak mengubah apa yang sedang diukur, jadi ia selalu digerakkan lebih dulu.
 *
 * SINYAL DARI KOMBINASI COVERAGE & LATENCY
 * ----------------------------------------
 * Coverage sendirian bisa berbohong dua arah:
 *   - coverage tinggi + latency wajar   = STRONG: murid benar-benar memproduksi target;
 *   - coverage tinggi + latency SANGAT pendek = NOISE: manusia butuh waktu untuk mulai
 *     bicara dan menyelesaikan kalimat — "sempurna dalam sekejap" hampir pasti recognizer
 *     salah baca (menangkap gema audio model, misalnya). Bukti seperti ini justru
 *     kappa-nya paling rendah;
 *   - coverage rendah, ATAU coverage tinggi tapi latency sangat panjang = WEAK: murid
 *     berjuang, atau recognizer hanya menangkap sebagian.
 *
 * BATAS YANG DIJAGA
 * -----------------
 * 1. MURNI. Tanpa DOM, tanpa jaringan, tanpa storage, tanpa Date.now, tanpa Math.random.
 *    Masukan yang sama SELALU menghasilkan keputusan yang sama (deterministik).
 * 2. TIDAK MENGARANG SKOR PENGUCAPAN. Tidak ada satu pun jalur yang menafsirkan coverage
 *    sebagai kualitas fonem — nama field dan rationale menyebut coverage, bukan
 *    pronunciation.
 * 3. TIDAK MENEBAK DI ATAS BUKTI TIPIS. Di bawah MIN_EVIDENCE (3) percobaan pada jendela,
 *    kebijakan menahan baseline.
 * 4. TAHAN INPUT KORUP. Riwayat bukan array, baris bukan objek, angka NaN/negatif,
 *    weakLessons berisi sampah — semuanya dinormalkan, tidak pernah melempar exception.
 *    Input kosong menghasilkan default aman: phrase / cue_only / tanpa target khusus.
 * 5. SETIAP KEPUTUSAN MEMBAWA rationale (kode brain3_speaking_*) supaya layar "kenapa"
 *    tidak mengarang ulang alasannya — explain() menerjemahkan kode ke kalimat Indonesia.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelSpeakingAdaptive = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-speaking-adaptive-v1';

  // Tangga nilai tiap dimensi, dari termudah ke tersulit. Diekspor supaya gate menguji
  // angkanya, bukan menebaknya (pola yang sama dengan fiezel-listening-adaptive.js).
  var COMPLEXITIES = ['word', 'phrase', 'sentence', 'open'];
  var SCAFFOLDS = ['model_first', 'cue_only', 'free']; // model_first = bantuan terbesar

  var WINDOW = 6;             // jendela bukti: 6 percobaan terakhir — cukup untuk arah,
                              // cukup pendek untuk tidak menyeret sesi minggu lalu
  var MIN_EVIDENCE = 3;       // di bawah ini: tahan baseline (kontrak "bukti tipis")
  var TARGET_DEFAULT = 0.80;  // aturan 0.80 — target coverage, konsisten dengan listening
  var BAND_HALF_WIDTH = 0.1;  // pita mati ±0.1: dalam pita = tahan, mencegah osilasi

  // Batas latency untuk membaca kombinasi coverage & latency. Angka-angka ini kasar
  // dengan sengaja — mereka memisahkan "mustahil secara manusiawi" dari "berjuang",
  // bukan mengukur kefasihan.
  var LATENCY_FLOOR_MS = 800;    // di bawah ini, coverage tinggi = hampir pasti salah baca
  var LATENCY_CEIL_MS = 15000;   // di atas ini, coverage tinggi = usaha tersembunyi besar
  var NOISE_SHARE_MAX = 1 / 3;   // >= sepertiga jendela noise -> jangan percaya arah bukti

  // Diskon kappa. KAPPA_MAX adalah plafon KERAS: tidak ada jalur yang boleh melewatinya,
  // karena bukti speaking tidak pernah bisa dipercaya penuh (recognizer bukan penilai).
  var KAPPA_MAX = 0.6;
  var KAPPA_STRONG = 0.6;   // coverage tinggi + latency wajar — tetap di plafon diskon
  var KAPPA_WEAK = 0.35;    // coverage rendah / latency terlalu panjang
  var KAPPA_NOISE = 0.1;    // "sempurna dalam sekejap" — hampir tanpa nilai bukti
  var REPLAY_DISCOUNT = 2;  // replay model >= 2 kali: murid bergantung pada contoh,
                            // kappa dipotong setengah (cermin diskon replay listening)

  // Default aman untuk murid tanpa bukti atau input korup: titik tengah kedua tangga.
  var DEFAULTS = { promptComplexity: 'phrase', scaffold: 'cue_only' };

  // Ambang tier mastery untuk baseline — sama dengan listening supaya kedua kebijakan
  // membaca murid yang sama dengan cara yang sama.
  var MASTERY_LOW = 35;
  var MASTERY_HIGH = 70;

  /** Kamus alasan — satu sumber kebenaran untuk explain(), bukan string tersebar. */
  var EXPLANATIONS = {
    brain3_speaking_default: 'Belum ada bukti speaking yang bisa dibaca, jadi kesulitan diset ke titik tengah yang aman: prompt frasa dengan cue.',
    brain3_speaking_baseline_low: 'Mastery masih rendah, jadi titik awal diambil dari kombinasi termudah: satu kata, dengan model diucapkan dulu.',
    brain3_speaking_baseline_mid: 'Mastery menengah, jadi titik awal di tengah tangga: frasa dengan cue.',
    brain3_speaking_baseline_high: 'Mastery sudah tinggi, jadi titik awal langsung menantang: kalimat penuh tanpa bantuan.',
    brain3_speaking_insufficient_evidence: 'Bukti pada jendela terakhir terlalu tipis untuk dipercaya, jadi kesulitan ditahan dulu — kebijakan yang berayun karena satu percobaan lebih berbahaya daripada yang diam.',
    brain3_speaking_step_up_scaffold: 'Coverage stabil di atas target, jadi bantuan dilepas satu anak tangga — materi tidak berubah, supaya kita tahu murid yang bekerja, bukan scaffold-nya.',
    brain3_speaking_step_up_complexity: 'Coverage stabil di atas target dan murid sudah bicara tanpa bantuan, jadi kompleksitas prompt naik satu tingkat.',
    brain3_speaking_step_down_scaffold: 'Coverage di bawah target, jadi bantuan dikembalikan dulu satu anak tangga — tombol termurah, materinya tidak berubah.',
    brain3_speaking_step_down_complexity: 'Coverage di bawah target meski model sudah diucapkan lebih dulu, jadi kompleksitas prompt diturunkan satu tingkat.',
    brain3_speaking_hold_in_band: 'Coverage berada di dalam pita target (±0.1), jadi kesulitan dipertahankan — di sinilah latihan paling efisien.',
    brain3_speaking_noisy_evidence: 'Sebagian besar bukti terakhir mencurigakan (coverage tinggi dengan latency mustahil pendek) — kemungkinan recognizer salah baca, jadi kesulitan ditahan, bukan dinaikkan di atas bukti palsu.',
    brain3_speaking_hidden_effort: 'Coverage memang tinggi, tetapi latency sangat panjang menandakan murid bekerja jauh lebih keras daripada yang terlihat — kenaikan ditahan sampai produksinya lancar.',
    brain3_speaking_ceiling: 'Kedua dimensi sudah di tingkat tersulit; tidak ada yang bisa dinaikkan lagi.',
    brain3_speaking_floor: 'Kedua dimensi sudah di tingkat termudah; tidak ada yang bisa diturunkan lagi.',
    brain3_speaking_target_weak: 'Target latihan diambil dari lesson terlemah yang prasyaratnya sudah sehat — melatih produksi pada pondasi yang belum berdiri hanya melatih rasa gagal.',
    brain3_speaking_target_prereq_blocked: 'Semua lesson lemah prasyaratnya belum sehat, jadi tidak ada target khusus — perkuat dulu prasyaratnya lewat mode lain sebelum memaksakan produksi lisan.',
    brain3_speaking_target_none: 'Tidak ada lesson lemah yang terdata, jadi latihan speaking bebas tanpa target skill khusus.',
    brain3_speaking_evidence_strong: 'Coverage tinggi dengan latency yang wajar secara manusiawi — bukti produksi yang bisa dipakai, tetap dengan diskon speaking.',
    brain3_speaking_evidence_weak: 'Coverage rendah atau latency sangat panjang — murid berjuang atau recognizer hanya menangkap sebagian; bobot buktinya kecil.',
    brain3_speaking_evidence_noise: 'Coverage tinggi tetapi latency mustahil pendek untuk produksi manusia — hampir pasti recognizer salah baca; bukti ini nyaris tidak dihitung.',
    brain3_speaking_evidence_replay_discount: 'Murid memutar contoh berulang kali sebelum bicara — benar setelah banyak contoh bukan bukti kemampuan yang sama dengan benar sekali dengar; kappa dipotong lagi.'
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
   * Normalkan riwayat coverage menjadi baris {coverage 0..1, latencyMs>=0}.
   * Baris yang bukan objek dibuang — lebih jujur menganggapnya tidak ada daripada
   * menebak isinya. coverage NaN dianggap 0 (tidak ada bukti produksi), latency
   * NaN/negatif dianggap 0 (yang justru terbaca sebagai mencurigakan, bukan bagus —
   * data waktu yang rusak TIDAK boleh menguntungkan).
   */
  function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];
    var rows = [];
    for (var i = 0; i < history.length; i++) {
      var row = history[i];
      if (!row || typeof row !== 'object') continue;
      rows.push({
        coverage: clamp(num(row.coverage, 0), 0, 1),
        latencyMs: Math.max(0, num(row.latencyMs, 0)),
        scaffold: SCAFFOLDS.indexOf(row.scaffold) >= 0 ? row.scaffold : null
      });
    }
    return rows;
  }

  /** Satu baris dianggap noise bila coverage tinggi tapi latency mustahil pendek. */
  function isNoiseRow(row) {
    return row.coverage > TARGET_DEFAULT + BAND_HALF_WIDTH && row.latencyMs < LATENCY_FLOOR_MS;
  }

  /**
   * Statistik jendela: rata-rata coverage & latency plus porsi baris noise pada
   * <=WINDOW baris terakhir. Baris noise TIDAK dibuang dari rata-rata — porsinya
   * dilaporkan supaya policy bisa menolak SELURUH arah bukti bila terlalu banyak
   * yang mencurigakan (membuang lalu merata-rata sisanya menyembunyikan masalahnya).
   */
  function windowStats(history) {
    var rows = sanitizeHistory(history).slice(-WINDOW);
    if (!rows.length) return { n: 0, meanCoverage: null, meanLatencyMs: null, noiseShare: 0 };
    var coverage = 0;
    var latency = 0;
    var noise = 0;
    for (var i = 0; i < rows.length; i++) {
      coverage += rows[i].coverage;
      latency += rows[i].latencyMs;
      if (isNoiseRow(rows[i])) noise++;
    }
    return {
      n: rows.length,
      meanCoverage: coverage / rows.length,
      meanLatencyMs: latency / rows.length,
      noiseShare: noise / rows.length
    };
  }

  /**
   * Baseline dari mastery: titik awal tangga sebelum bukti coverage menggesernya.
   * Mastery bukan pengganti bukti — ia hanya menentukan DARI MANA kita mulai mencari.
   */
  function baselineFor(mastery) {
    if (mastery === null) {
      return { dims: { promptComplexity: DEFAULTS.promptComplexity, scaffold: DEFAULTS.scaffold }, rationale: 'brain3_speaking_default' };
    }
    if (mastery < MASTERY_LOW) {
      return { dims: { promptComplexity: 'word', scaffold: 'model_first' }, rationale: 'brain3_speaking_baseline_low' };
    }
    if (mastery < MASTERY_HIGH) {
      return { dims: { promptComplexity: 'phrase', scaffold: 'cue_only' }, rationale: 'brain3_speaking_baseline_mid' };
    }
    return { dims: { promptComplexity: 'sentence', scaffold: 'free' }, rationale: 'brain3_speaking_baseline_high' };
  }

  /**
   * Naik SATU langkah. Scaffold dilepas dulu (bantuan hilang, materi tetap), baru
   * kompleksitas prompt naik. Bila keduanya mentok, dims tidak berubah (ceiling).
   */
  function stepUp(dims) {
    var scafIdx = SCAFFOLDS.indexOf(dims.scaffold);
    if (scafIdx >= 0 && scafIdx < SCAFFOLDS.length - 1) {
      return { dims: { promptComplexity: dims.promptComplexity, scaffold: SCAFFOLDS[scafIdx + 1] }, rationale: 'brain3_speaking_step_up_scaffold' };
    }
    var compIdx = COMPLEXITIES.indexOf(dims.promptComplexity);
    if (compIdx >= 0 && compIdx < COMPLEXITIES.length - 1) {
      return { dims: { promptComplexity: COMPLEXITIES[compIdx + 1], scaffold: dims.scaffold }, rationale: 'brain3_speaking_step_up_complexity' };
    }
    return { dims: { promptComplexity: dims.promptComplexity, scaffold: dims.scaffold }, rationale: 'brain3_speaking_ceiling' };
  }

  /**
   * Turun SATU langkah — scaffold dikembalikan dulu SAMPAI model_first sebelum
   * kompleksitas boleh turun. Kontraknya eksplisit: murid yang gagal diberi contoh
   * dulu pada materi yang sama, bukan langsung diturunkan materinya.
   */
  function stepDown(dims) {
    var scafIdx = SCAFFOLDS.indexOf(dims.scaffold);
    if (scafIdx > 0) {
      return { dims: { promptComplexity: dims.promptComplexity, scaffold: SCAFFOLDS[scafIdx - 1] }, rationale: 'brain3_speaking_step_down_scaffold' };
    }
    var compIdx = COMPLEXITIES.indexOf(dims.promptComplexity);
    if (compIdx > 0) {
      return { dims: { promptComplexity: COMPLEXITIES[compIdx - 1], scaffold: dims.scaffold }, rationale: 'brain3_speaking_step_down_complexity' };
    }
    return { dims: { promptComplexity: dims.promptComplexity, scaffold: dims.scaffold }, rationale: 'brain3_speaking_floor' };
  }

  /**
   * Normalkan weakLessons menjadi baris {skill, prereqHealthy, mastery|null}.
   * Menerima string polos ('speaking_a1_ordering' -> prasyarat dianggap sehat, karena
   * pemanggil yang tidak tahu prasyarat tidak boleh membuat semuanya terblokir) atau
   * objek {skill, prereqHealthy, mastery}. Entri tanpa nama skill dibuang.
   */
  function sanitizeWeakLessons(weakLessons) {
    if (!Array.isArray(weakLessons)) return [];
    var rows = [];
    for (var i = 0; i < weakLessons.length; i++) {
      var entry = weakLessons[i];
      if (typeof entry === 'string' && entry) {
        rows.push({ skill: entry, prereqHealthy: true, mastery: null });
        continue;
      }
      if (entry && typeof entry === 'object' && typeof entry.skill === 'string' && entry.skill) {
        var m = num(entry.mastery, NaN);
        rows.push({
          skill: entry.skill,
          // Hanya false eksplisit yang memblokir — ketidaktahuan bukan larangan.
          prereqHealthy: entry.prereqHealthy !== false,
          mastery: Number.isFinite(m) ? clamp(m, 0, 100) : null
        });
      }
    }
    return rows;
  }

  /**
   * Pilih targetSkill: lesson terlemah yang prasyaratnya sehat. Di antara yang sehat,
   * mastery terendah menang (paling butuh latihan); tanpa angka mastery, urutan
   * pemanggil dihormati (deterministik). Yang prasyaratnya sakit TIDAK dipilih —
   * melatih produksi di atas pondasi yang belum berdiri hanya melatih rasa gagal.
   */
  function pickTarget(weakLessons) {
    var rows = sanitizeWeakLessons(weakLessons);
    if (!rows.length) return { targetSkill: null, rationale: 'brain3_speaking_target_none' };
    var best = null;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row.prereqHealthy) continue;
      if (!best) { best = row; continue; }
      // Mastery yang diketahui dan lebih rendah menggeser; null tidak pernah menggeser
      // pemenang yang sudah ada (urutan pemanggil = prioritas default).
      if (row.mastery !== null && (best.mastery === null || row.mastery < best.mastery)) best = row;
    }
    if (!best) return { targetSkill: null, rationale: 'brain3_speaking_target_prereq_blocked' };
    return { targetSkill: best.skill, rationale: 'brain3_speaking_target_weak' };
  }

  /**
   * Kebijakan utama (API FINAL kontrak Fase 3).
   *
   * @param {{coverageHistory?:Array<{coverage:number,latencyMs:number,scaffold?:string}>,
   *          weakLessons?:Array<string|{skill:string,prereqHealthy?:boolean,mastery?:number}>,
   *          mastery?:number, targetSuccess?:number}} input
   * @returns {{promptComplexity:'word'|'phrase'|'sentence'|'open', targetSkill:string|null,
   *            scaffold:'model_first'|'cue_only'|'free', rationale:string[], confidence:number}}
   *
   * Alur keputusan:
   *   1. Baseline dari mastery (atau default aman bila mastery tidak bisa dibaca).
   *   2. Bukti tipis (< MIN_EVIDENCE pada jendela 6) -> tahan baseline.
   *   3. Porsi noise >= 1/3 jendela -> tahan (jangan bergerak di atas bukti palsu).
   *   4. Coverage > target+0.1 -> naik SATU dimensi, KECUALI latency rata-rata sangat
   *      panjang (usaha tersembunyi) -> tahan.
   *   5. Coverage < target-0.1 -> turun SATU dimensi (scaffold dulu sampai model_first).
   *   6. Dalam pita -> tahan.
   *   Target skill dipilih terpisah dari weakLessons — kesulitan dan sasaran adalah
   *   dua keputusan yang tidak boleh saling menyandera.
   */
  function policy(input) {
    var src = (input && typeof input === 'object') ? input : {};

    var masteryRaw = num(src.mastery, NaN);
    var mastery = Number.isFinite(masteryRaw) ? clamp(masteryRaw, 0, 100) : null;
    var target = clamp(num(src.targetSuccess, TARGET_DEFAULT), 0.5, 0.95);

    var base = baselineFor(mastery);
    var stats = windowStats(src.coverageHistory);
    var picked = pickTarget(src.weakLessons);
    var rationale = [base.rationale];

    // Kepercayaan keputusan tumbuh dengan jumlah bukti pada jendela — 6 baris = penuh.
    var confidence = Math.round((stats.n / WINDOW) * 100) / 100;

    var dims = base.dims;

    if (stats.n < MIN_EVIDENCE) {
      // Bukti terlalu tipis: tahan baseline. Termasuk kasus riwayat kosong/korup.
      rationale.push(stats.n === 0 ? 'brain3_speaking_default' : 'brain3_speaking_insufficient_evidence');
      // Riwayat kosong pada mastery yang juga kosong sudah membawa kode default dari
      // baseline; hindari kode ganda yang sama berturut-turut.
      if (rationale[0] === rationale[1]) rationale = [rationale[0]];
      return finalize(dims, picked, rationale, confidence);
    }

    if (stats.noiseShare >= NOISE_SHARE_MAX) {
      // Terlalu banyak "sempurna dalam sekejap": arah bukti tidak bisa dipercaya.
      // Tahan — naik di atas bukti palsu lebih merusak daripada diam.
      rationale.push('brain3_speaking_noisy_evidence');
      return finalize(dims, picked, rationale, confidence);
    }

    if (stats.meanCoverage > target + BAND_HALF_WIDTH) {
      if (stats.meanLatencyMs > LATENCY_CEIL_MS) {
        // Coverage tinggi TAPI dibeli dengan waktu sangat panjang: usaha tersembunyi.
        rationale.push('brain3_speaking_hidden_effort');
        return finalize(dims, picked, rationale, confidence);
      }
      var up = stepUp(dims);
      rationale.push(up.rationale);
      return finalize(up.dims, picked, rationale, confidence);
    }

    if (stats.meanCoverage < target - BAND_HALF_WIDTH) {
      var down = stepDown(dims);
      rationale.push(down.rationale);
      return finalize(down.dims, picked, rationale, confidence);
    }

    rationale.push('brain3_speaking_hold_in_band');
    return finalize(dims, picked, rationale, confidence);
  }

  /** Bentuk keluaran final — satu tempat supaya bentuknya tidak menyimpang antar cabang. */
  function finalize(dims, picked, rationale, confidence) {
    return {
      promptComplexity: dims.promptComplexity,
      targetSkill: picked.targetSkill,
      scaffold: dims.scaffold,
      rationale: rationale.concat([picked.rationale]),
      confidence: confidence
    };
  }

  /**
   * Bobot bukti satu percobaan speaking (API FINAL kontrak Fase 3).
   *
   * @param {{coverage?:number, latencyMs?:number, replays?:number}} input
   * @returns {{kappa:number, signal:'strong'|'weak'|'noise', rationale:string[]}}
   *
   * kappa TIDAK PERNAH > 0.6 — plafon keras, karena recognizer tidak bisa dipercaya
   * penuh, sekuat apa pun coverage-nya. Sinyal dibaca dari kombinasi coverage & latency:
   *   strong: coverage tinggi + latency dalam rentang manusiawi;
   *   noise : coverage tinggi + latency mustahil pendek (kemungkinan salah baca);
   *   weak  : selainnya (coverage rendah, atau coverage tinggi dengan latency
   *           sangat panjang = produksi belum lancar).
   * Replay >= 2 memotong kappa setengah lagi: benar setelah banyak contoh bukan bukti
   * kemampuan yang sama dengan benar sekali dengar (cermin diskon replay listening).
   */
  function evidence(input) {
    var src = (input && typeof input === 'object') ? input : {};
    var coverage = clamp(num(src.coverage, 0), 0, 1);
    // Latency rusak/negatif dinormalkan ke 0 — yang justru terbaca mencurigakan
    // saat coverage tinggi; data waktu yang rusak tidak boleh menguntungkan.
    var latencyMs = Math.max(0, num(src.latencyMs, 0));
    var replays = clamp(num(src.replays, 0), 0, 99);

    var signal;
    var kappa;
    var rationale;
    var high = coverage > TARGET_DEFAULT + BAND_HALF_WIDTH;

    if (high && latencyMs < LATENCY_FLOOR_MS) {
      signal = 'noise';
      kappa = KAPPA_NOISE;
      rationale = ['brain3_speaking_evidence_noise'];
    } else if (high && latencyMs <= LATENCY_CEIL_MS) {
      signal = 'strong';
      kappa = KAPPA_STRONG;
      rationale = ['brain3_speaking_evidence_strong'];
    } else {
      signal = 'weak';
      kappa = KAPPA_WEAK;
      rationale = ['brain3_speaking_evidence_weak'];
    }

    if (replays >= REPLAY_DISCOUNT) {
      kappa = kappa / 2;
      rationale.push('brain3_speaking_evidence_replay_discount');
    }

    // Plafon keras terakhir — apa pun yang terjadi di atas, bukti speaking selalu didiskon.
    kappa = clamp(Math.round(kappa * 1000) / 1000, 0, KAPPA_MAX);

    return { kappa: kappa, signal: signal, rationale: rationale };
  }

  /**
   * Terjemahkan kode rationale ke kalimat Indonesia untuk layar "kenapa".
   * Menerima satu kode string ATAU keluaran policy()/evidence() utuh.
   */
  function explain(codeOrDecision) {
    if (typeof codeOrDecision === 'string') {
      return EXPLANATIONS[codeOrDecision] || 'Keputusan speaking adaptif tanpa penjelasan terdaftar (' + codeOrDecision + ').';
    }
    if (codeOrDecision && Array.isArray(codeOrDecision.rationale)) {
      return codeOrDecision.rationale.map(function (code) { return explain(code); }).join(' ');
    }
    return EXPLANATIONS.brain3_speaking_default;
  }

  return {
    SCHEMA: SCHEMA,
    COMPLEXITIES: COMPLEXITIES,
    SCAFFOLDS: SCAFFOLDS,
    WINDOW: WINDOW,
    MIN_EVIDENCE: MIN_EVIDENCE,
    TARGET_DEFAULT: TARGET_DEFAULT,
    BAND_HALF_WIDTH: BAND_HALF_WIDTH,
    LATENCY_FLOOR_MS: LATENCY_FLOOR_MS,
    LATENCY_CEIL_MS: LATENCY_CEIL_MS,
    NOISE_SHARE_MAX: NOISE_SHARE_MAX,
    KAPPA_MAX: KAPPA_MAX,
    DEFAULTS: DEFAULTS,
    policy: policy,
    evidence: evidence,
    explain: explain,
    // Helper murni diekspor supaya gate bisa menguji URUTAN dimensi pada semua kombinasi,
    // bukan hanya kombinasi yang kebetulan dijangkau baseline mastery.
    stepUp: stepUp,
    stepDown: stepDown,
    windowStats: windowStats
  };
});
