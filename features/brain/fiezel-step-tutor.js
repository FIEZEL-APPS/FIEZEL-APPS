/**
 * FIEZEL Step Tutor — tutoring step-based dari `reasoningOperation` (Braincore v3, A13).
 *
 * MASALAH YANG DIPERBAIKI (council model-council-claude_opus_5_0.md C10)
 * ----------------------------------------------------------------------
 * Meta-analisis VanLehn menunjukkan bahwa yang membuat tutoring efektif BUKAN kefasihan
 * bahasa alami si tutor, melainkan GRANULARITAS interaksinya: tutoring step-based mencapai
 * d ~ 0,76, sementara answer-based hanya d ~ 0,31. Artinya, jalan yang benar untuk FIEZEL
 * (PWA offline, zero runtime cost, tanpa LLM) bukan menambah model bahasa — melainkan
 * memecah SATU soal pilihan ganda menjadi 2-3 langkah keputusan kecil yang ditanyakan
 * berurutan. Nilai diagnostiknya juga lebih tajam: kalau murid gagal di langkah 1 kita tahu
 * masalahnya di DETEKSI CUE, kalau gagal di langkah 2 masalahnya di PEMETAAN ATURAN.
 * Satu pilihan ganda biasa tidak pernah bisa membedakan keduanya.
 *
 * Bahan bakunya SUDAH ada dan belum dipakai untuk apa pun: field `reasoningOperation` di
 * grammar-templates.json — 139 template, semuanya berisi rantai operasi penalaran seperti
 * "identify time-frame marker -> select aspect". Modul ini mem-parse rantai itu (pecah
 * pada '->' dan ';'), lalu menerjemahkan tiap frasa operasi menjadi pertanyaan berbahasa
 * Indonesia lewat kamus kategori operasi (identify / select / apply / compare / eliminate /
 * check). Frasa yang tidak dikenal TIDAK boleh menghentikan tutoring — ia jatuh ke fallback
 * generik "Langkah N: <frasa>?" supaya konten baru dengan verba baru tetap terlayani.
 *
 * BATAS YANG DIJAGA
 * -----------------
 * Modul MURNI: tanpa DOM, tanpa jaringan, tanpa storage, tanpa Math.random, tanpa waktu.
 * Masukan -> struktur langkah yang deterministik, sehingga bisa diuji sebagai teks & angka.
 * Objek operasi (mis. "time-frame marker") sengaja DIBIARKAN dalam bahasa Inggris: itu
 * metabahasa grammar yang memang muncul persis begitu di soal dan penjelasannya — yang
 * diterjemahkan adalah KERANGKA pertanyaannya, karena di situlah beban pemahaman murid.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelStepTutor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Maksimal langkah yang dirender. Lebih dari 3 langkah untuk SATU item pilihan ganda
  // justru memecah perhatian (beban memori kerja) — council C10 sengaja menyebut "2-3
  // langkah". Rantai yang lebih panjang dipadatkan, bukan dipotong asal: lihat parseOps.
  var MAX_STEPS = 3;

  // Kamus kategori operasi. Kunci = verba pertama frasa (huruf kecil, tanpa tanda baca),
  // nilai = salah satu dari 6 kategori inti. Sinonim dipetakan ke kategori terdekat
  // MENURUT FUNGSI PEDAGOGISNYA, bukan menurut arti kamusnya — mis. 'insert' dan 'fill'
  // sama-sama "terapkan bentuk", maka keduanya masuk 'apply'.
  var VERB_CATEGORY = Object.freeze({
    // Mengenali / menemukan cue di kalimat — langkah deteksi.
    identify: 'identify', detect: 'identify', spot: 'identify', find: 'identify',
    locate: 'identify', recognize: 'identify', notice: 'identify', track: 'identify',
    recall: 'identify',
    // Memilih bentuk/aturan dari kandidat — langkah keputusan.
    select: 'select', choose: 'select', pick: 'select', decide: 'select',
    determine: 'select',
    // Menerapkan aturan menjadi bentuk konkret — langkah produksi.
    apply: 'apply', insert: 'apply', fill: 'apply', add: 'apply', supply: 'apply',
    form: 'apply', generate: 'apply', convert: 'apply', complete: 'apply',
    combine: 'apply', place: 'apply', reposition: 'apply', substitute: 'apply',
    encode: 'apply', mark: 'apply', shift: 'apply', backshift: 'apply',
    restore: 'apply', revert: 'apply', punctuate: 'apply',
    // Menimbang dua kemungkinan / mengklasifikasi — langkah perbandingan.
    compare: 'compare', weigh: 'compare', count: 'compare', separate: 'compare',
    classify: 'compare', assess: 'compare', evaluate: 'compare', judge: 'compare',
    match: 'compare', align: 'compare',
    // Menyingkirkan kandidat yang salah — langkah eliminasi.
    eliminate: 'eliminate', avoid: 'eliminate', reject: 'eliminate',
    remove: 'eliminate', reduce: 'eliminate',
    // Memverifikasi hasil — langkah pemeriksaan.
    check: 'check', confirm: 'check', inspect: 'check', verify: 'check',
    keep: 'check', require: 'check'
  });

  /**
   * Kerangka pertanyaan Indonesia per kategori. Semua HARUS diakhiri '?' karena langkah
   * tutoring adalah PERTANYAAN, bukan instruksi — murid yang menjawab sendiri belajar
   * lebih dalam daripada murid yang disuruh (retrieval > telling).
   */
  function askFor(category, stepNo, obj) {
    var n = 'Langkah ' + stepNo + ': ';
    if (category === 'identify') return n + 'coba kenali dulu — ' + obj + ' — yang mana di kalimat ini?';
    if (category === 'select') return n + 'dari petunjuk tadi, ' + obj + ' mana yang paling cocok?';
    if (category === 'apply') return n + 'sekarang terapkan — ' + obj + ' — jadi bentuk apa?';
    if (category === 'compare') return n + 'timbang dulu — ' + obj + ' — mana yang lebih sesuai?';
    if (category === 'eliminate') return n + 'singkirkan yang tidak mungkin — ' + obj + ' — pilihan mana yang gugur?';
    if (category === 'check') return n + 'periksa lagi — ' + obj + ' — sudah benar?';
    // Fallback generik untuk frasa yang tidak dikenal: frasa asli dijadikan pertanyaan
    // apa adanya. Jelek tapi JUJUR — lebih baik daripada mengarang terjemahan yang salah,
    // dan lebih baik daripada melempar error yang mematikan seluruh sesi tutoring.
    return n + obj + '?';
  }

  /** Pecah rantai reasoningOperation pada '->' dan ';' menjadi frasa operasi bersih. */
  function parseOps(reasoningOperation) {
    if (typeof reasoningOperation !== 'string' || !reasoningOperation.trim()) return [];
    var ops = reasoningOperation
      .split(/->|;/)
      .map(function (s) { return s.trim().replace(/[.\s]+$/, ''); })
      .filter(function (s) { return s.length > 0; });
    if (ops.length <= MAX_STEPS) return ops;
    // Rantai > 3 operasi (langka: 1 dari 139 template): pertahankan DUA operasi pertama
    // (deteksi + transformasi awal) dan operasi TERAKHIR (keputusan akhir). Operasi tengah
    // dibuang karena titik keputusan akhirlah yang menentukan jawaban soal — memotong dari
    // belakang justru menghilangkan langkah yang paling diagnostik.
    return ops.slice(0, MAX_STEPS - 1).concat([ops[ops.length - 1]]);
  }

  /** Ambil verba pertama frasa (huruf kecil, tanpa tanda baca) untuk lookup kamus. */
  function leadVerb(op) {
    var m = String(op).toLowerCase().match(/^[a-z']+/);
    return m ? m[0] : '';
  }

  /** Sisa frasa setelah verba — dipakai sebagai "objek" yang disisipkan ke pertanyaan. */
  function objectOf(op, verb) {
    var rest = String(op).slice(verb.length).trim();
    // "whether/if ..." setelah verba periksa/deteksi hanya kata sambung Inggris —
    // dibuang supaya kalimat Indonesia tidak tersandung di tengah.
    rest = rest.replace(/^(whether|if|that)\s+/i, '');
    return rest || op;
  }

  /**
   * stepsFor(template) -> [{ask, expect, rationale}]
   *
   * Satu langkah per operasi hasil parse (maksimal 3). `ask` adalah naskah pertanyaan
   * Indonesia siap render; `expect` adalah frasa objek Inggris asli — app boleh memakainya
   * untuk pencocokan kata kunci pada jawaban bebas, atau sekadar menampilkannya sebagai
   * kunci setelah murid menjawab; `rationale` menandai kategori operasi sehingga telemetri
   * bisa membedakan kegagalan deteksi-cue dari kegagalan pemetaan-aturan (inti nilai C10).
   *
   * Aman untuk input null/kosong: mengembalikan [] tanpa melempar, karena absennya
   * dekomposisi harus berarti "tanya jawaban langsung seperti hari ini", bukan crash.
   */
  function stepsFor(template) {
    if (!template || typeof template !== 'object') return [];
    var ops = parseOps(template.reasoningOperation);
    var steps = [];
    for (var i = 0; i < ops.length; i++) {
      var verb = leadVerb(ops[i]);
      var category = VERB_CATEGORY[verb] || null;
      var obj = category ? objectOf(ops[i], verb) : ops[i];
      steps.push({
        ask: askFor(category, i + 1, obj),
        expect: obj,
        rationale: category ? 'brain3_step_' + category : 'brain3_step_fallback'
      });
    }
    return steps;
  }

  /**
   * coverage(templates) -> {total, withSteps, share}
   *
   * Audit: berapa banyak template yang benar-benar menghasilkan dekomposisi MULTI-langkah
   * (>= 2 langkah). Template ber-rantai tunggal ("identify intended meaning" saja) tetap
   * dapat 1 langkah dari stepsFor, tetapi TIDAK dihitung `withSteps` — satu langkah
   * bukanlah step-based tutoring, itu cuma soal biasa dengan kata pengantar. Kejujuran
   * angka ini penting: klaim "step-based" harus bisa diaudit terhadap data nyata.
   * Menerima array template ATAU objek grammar-templates.json utuh ({templates: [...]}).
   */
  function coverage(templates) {
    var list = Array.isArray(templates)
      ? templates
      : (templates && Array.isArray(templates.templates) ? templates.templates : []);
    var withSteps = 0;
    for (var i = 0; i < list.length; i++) {
      if (stepsFor(list[i]).length >= 2) withSteps++;
    }
    return {
      total: list.length,
      withSteps: withSteps,
      share: list.length ? withSteps / list.length : 0
    };
  }

  /**
   * decompose(question, template) -> {steps, finalAsk, rationale}
   *
   * Paket siap render untuk app.js: urutan langkah dari stepsFor, ditutup `finalAsk` yang
   * mengembalikan murid ke soal aslinya SETELAH scaffolding — supaya bukti akhirnya tetap
   * jawaban soal yang sama (kompatibel dengan grader dan telemetri yang ada), bukan
   * jawaban langkah. `question` boleh string soal yang sudah dirender app (stem yang
   * placeholder-nya sudah diisi); kalau kosong, jatuh ke template.stem; kalau dua-duanya
   * kosong, finalAsk tetap kalimat tanya Indonesia yang valid — tidak pernah undefined.
   */
  function decompose(question, template) {
    var steps = stepsFor(template);
    var stem = (typeof question === 'string' && question.trim())
      ? question.trim()
      : (template && typeof template.stem === 'string' ? template.stem.trim() : '');
    var finalAsk = steps.length
      ? 'Sekarang gabungkan langkah-langkah tadi' + (stem ? ' — jadi jawaban soalnya: "' + stem + '"' : '') + ' — apa jawabanmu?'
      : (stem ? 'Jawab soalnya: "' + stem + '" — apa jawabanmu?' : 'Apa jawabanmu untuk soal ini?');
    return {
      steps: steps,
      finalAsk: finalAsk,
      rationale: steps.length >= 2
        ? 'brain3_step_tutor_decomposed'
        : (steps.length === 1 ? 'brain3_step_tutor_single' : 'brain3_step_tutor_passthrough')
    };
  }

  return {
    MAX_STEPS: MAX_STEPS,
    VERB_CATEGORY: VERB_CATEGORY,
    parseOps: parseOps,
    stepsFor: stepsFor,
    coverage: coverage,
    decompose: decompose
  };
});
