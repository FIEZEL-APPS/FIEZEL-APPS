/**
 * FIEZEL Production Grader — penilai jawaban ketik untuk mode cloze (Braincore v3, A14).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Semua bukti belajar FIEZEL hari ini berbentuk recognition: murid memilih dari opsi yang
 * sudah disediakan. Efek testing (Roediger & Karpicke) menunjukkan recall aktif — murid
 * MEMPRODUKSI jawabannya sendiri — adalah pengungkit retensi terbesar yang belum dipakai.
 * Tapi recall aktif hanya berguna kalau penilainya adil: terlalu ketat, dan typo satu huruf
 * dihukum seperti tidak paham; terlalu longgar, dan kesalahan grammar yang justru ingin kita
 * deteksi ikut lolos. Modul ini adalah garis tengah itu, dan karena keputusannya adalah
 * NILAI (bukan tampilan), ia bisa diuji sebagai angka.
 *
 * TIGA KEPUTUSAN DESAIN YANG PERLU DIJELASKAN
 * -------------------------------------------
 * 1. TOLERANSI EDIT-DISTANCE <=1, TAPI TIDAK DI HURUF PERTAMA DAN TIDAK UNTUK KATA PENDEK.
 *    Penelitian pengenalan kata menunjukkan huruf pertama membawa informasi identitas kata
 *    paling banyak; salah di huruf pertama hampir tidak pernah "typo", biasanya kata lain.
 *    Kata pendek (<4 huruf) juga tidak diberi toleransi: pada "the", satu huruf berbeda
 *    sudah kata lain ("she", "then"), bukan salah ketik.
 * 2. SELISIH MORFEMIK TIDAK DITOLERANSI, BERAPA PUN JARAKNYA. "walk" saat target "walked"
 *    berjarak 2, "walks" saat target "walk" berjarak 1 — dua-duanya BUKAN typo, melainkan
 *    sinyal grammar (tense/agreement) yang justru ingin dipelajari lesson-nya. Meloloskan
 *    "walks" karena "cuma beda satu huruf" berarti grader menghancurkan sinyal diagnostik
 *    paling berharga dari mode produksi. Karena itu selisih yang tepat berupa sufiks
 *    {s, es, ed, d, ing} selalu ditolak dengan rationale khusus, supaya tutor tahu ini
 *    kesalahan grammar dan bukan jari yang meleset.
 * 3. JAWABAN SALAH DICOCOKKAN KE DISTRAKTOR. Bank soal sudah membayar mahal untuk melabeli
 *    distraktor dengan miskonsepsi. Kalau murid MENGETIK distraktor itu sendiri (tanpa
 *    disodori opsi), itu bukti miskonsepsi yang jauh lebih kuat daripada memilihnya — maka
 *    kecocokan (distance<=1) dikembalikan sebagai matchedDistractor supaya ledger
 *    miskonsepsi (FiezelMisconceptionLedger) bisa diberi makan dari jalur produksi.
 *
 * BATAS YANG DIJAGA
 * -----------------
 * Modul MURNI: tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa waktu. Menerima string,
 * mengembalikan keputusan + rationale (prefix brain3_). Semua kegagalan input dikembalikan
 * sebagai keputusan "tolak yang aman", tidak pernah melempar exception ke pemanggil.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelProductionGrader = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-production-grader-v1';

  // Sufiks morfemik bahasa Inggris yang paling sering menjadi inti lesson grammar
  // (agreement -s/-es, past -ed/-d, progressive -ing). Diurutkan dari yang terpanjang
  // supaya "es" dicek sebelum "s" dan "ed" sebelum "d" — kalau tidak, "watches" vs "watch"
  // akan terdeteksi lewat "s" saja dan sisanya dianggap typo.
  var MORPHEME_SUFFIXES = ['ing', 'es', 'ed', 's', 'd'];

  /**
   * Normalisasi jawaban murid dan target ke bentuk yang bisa dibandingkan secara adil.
   * KENAPA: keyboard ponsel gemar "membantu" — autocapitalize, kutip tipografis (’ “ ”),
   * spasi ganda dari autocorrect. Semua itu bukan pengetahuan grammar, jadi tidak boleh
   * memengaruhi nilai. Yang TIDAK dinormalisasi: huruf itu sendiri — "walk" vs "walks"
   * harus tetap terlihat berbeda.
   */
  function normalize(text) {
    if (typeof text !== 'string') return '';
    var out = text;
    // Satukan bentuk unicode (mis. e + combining accent -> é) supaya perbandingan per-kode-poin adil.
    if (typeof out.normalize === 'function') out = out.normalize('NFC');
    return out
      .replace(/[\u2018\u2019\u201A\u02BC\u2032]/g, "'")   // kutip tunggal tipografis -> apostrof lurus
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"')          // kutip ganda tipografis -> lurus
      .replace(/[\u2010-\u2015]/g, '-')                      // aneka dash unicode -> tanda hubung biasa
      .replace(/[\u00A0\u2000-\u200B\u3000]/g, ' ')          // spasi unicode (nbsp dll) -> spasi biasa
      .toLowerCase()
      .replace(/\s+/g, ' ')                                  // rapikan spasi ganda/tab/newline
      .trim();
  }

  /**
   * Jarak Levenshtein klasik (sisip/hapus/ganti, masing-masing biaya 1).
   * KENAPA dua baris bergulir dan bukan matriks penuh: jawaban cloze pendek, tapi grader
   * dipanggil per ketukan "periksa" di perangkat murah — hemat alokasi itu sopan.
   */
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = new Array(b.length + 1);
    var curr = new Array(b.length + 1);
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (var k = 1; k <= b.length; k++) {
        var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
        curr[k] = Math.min(prev[k] + 1, curr[k - 1] + 1, prev[k - 1] + cost);
      }
      var swap = prev; prev = curr; curr = swap;
    }
    return prev[b.length];
  }

  /**
   * Deteksi selisih morfemik: apakah perbedaan kedua string TEPAT sebuah sufiks dari
   * MORPHEME_SUFFIXES? Dicek dua arah — sufiks hilang ("walk" saat target "walked") maupun
   * sufiks berlebih ("walks" saat target "walk") — karena dua-duanya sinyal grammar, bukan typo.
   * Perbandingan per kata terakhir juga dicoba, karena target cloze bisa berupa frasa
   * ("has walked") dan kesalahan morfemik hampir selalu di kata yang berubah bentuk.
   */
  function isMorphemeMiss(answer, target) {
    if (!answer || !target || answer === target) return false;
    var pairs = [[answer, target], [target, answer]];
    for (var p = 0; p < pairs.length; p++) {
      var shorter = pairs[p][0];
      var longer = pairs[p][1];
      if (longer.length <= shorter.length) continue;
      for (var i = 0; i < MORPHEME_SUFFIXES.length; i++) {
        var suf = MORPHEME_SUFFIXES[i];
        if (longer === shorter + suf) return true;
      }
    }
    return false;
  }

  /**
   * Aturan toleransi inti: apakah `answer` boleh dianggap sama dengan `candidate`?
   * Mengembalikan {ok, distance, rationale} TANPA melihat distraktor — pencocokan
   * distraktor adalah urusan grade(), karena hanya relevan saat semua kandidat sah gagal.
   */
  function matchAgainst(answer, candidate) {
    var distance = levenshtein(answer, candidate);
    if (distance === 0) {
      return { ok: true, distance: 0, rationale: 'brain3_production_exact' };
    }
    // Selisih morfemik ditolak SEBELUM aturan jarak, berapa pun jaraknya: ini sinyal
    // grammar yang ingin ditangkap lesson, bukan jari yang meleset.
    if (isMorphemeMiss(answer, candidate)) {
      return { ok: false, distance: distance, rationale: 'brain3_production_morpheme_miss' };
    }
    if (distance > 1) {
      return { ok: false, distance: distance, rationale: 'brain3_production_mismatch' };
    }
    // Dari sini distance === 1. Kata pendek tidak diberi toleransi: pada <4 huruf,
    // satu huruf berbeda hampir selalu kata lain, bukan salah ketik.
    if (candidate.length < 4) {
      return { ok: false, distance: 1, rationale: 'brain3_production_short_target_strict' };
    }
    // Huruf pertama membawa identitas kata; salah di sana bukan typo.
    if (answer.charAt(0) !== candidate.charAt(0)) {
      return { ok: false, distance: 1, rationale: 'brain3_production_initial_letter_miss' };
    }
    return { ok: true, distance: 1, rationale: 'brain3_production_near_match' };
  }

  /**
   * Nilai satu jawaban ketik terhadap satu target cloze.
   *
   * @param {string} answer  jawaban mentah murid (boleh kosong/null — dikembalikan tolak aman)
   * @param {string} target  jawaban kanonis dari template
   * @param {object} [opts]
   *   opts.alternates  : array string jawaban sah alternatif (mis. bentuk kontraksi).
   *   opts.distractors : [{text, misconception}] — distraktor berlabel dari bank soal.
   * @returns {{ok:boolean, distance:number|null, matchedDistractor:object|null,
   *            rationale:string, confidence:number}}
   *   distance = jarak ke kandidat yang diterima bila ok, selain itu jarak ke target utama.
   *   matchedDistractor = {text, misconception} bila jawaban salah cocok dengan distraktor,
   *   supaya pemanggil bisa memberi makan ledger miskonsepsi dari jalur produksi.
   */
  function grade(answer, target, opts) {
    opts = opts || {};
    var normTarget = normalize(target);
    // Target rusak adalah bug konten, bukan kesalahan murid — tolak aman + rationale sendiri
    // supaya audit konten bisa menangkapnya, dan jangan pernah melempar.
    if (!normTarget) {
      return { ok: false, distance: null, matchedDistractor: null, rationale: 'brain3_production_invalid_target', confidence: 0 };
    }
    var normAnswer = normalize(answer);
    if (!normAnswer) {
      // Jawaban kosong TIDAK dinilai sebagai "salah biasa": tidak boleh mencocokkan
      // distraktor mana pun, dan confidence 0 supaya bobot buktinya nol di hulu.
      return { ok: false, distance: normTarget.length, matchedDistractor: null, rationale: 'brain3_production_empty_answer', confidence: 0 };
    }

    // Kandidat sah = target utama + alternates. Yang diterima pertama menang; kalau tidak
    // ada yang menerima, keputusan dilaporkan terhadap TARGET UTAMA supaya rationale-nya
    // stabil (alternates adalah kemurahan hati, bukan sumber diagnosa).
    var candidates = [normTarget];
    var alternates = Array.isArray(opts.alternates) ? opts.alternates : [];
    for (var i = 0; i < alternates.length; i++) {
      var alt = normalize(alternates[i]);
      if (alt && candidates.indexOf(alt) === -1) candidates.push(alt);
    }

    // Pass 1 — kecocokan PERSIS pada kandidat sah selalu menang, apa pun isi distraktor.
    for (var e = 0; e < candidates.length; e++) {
      if (normAnswer === candidates[e]) {
        return {
          ok: true,
          distance: 0,
          matchedDistractor: null,
          rationale: e === 0 ? 'brain3_production_exact' : 'brain3_production_alternate_accepted',
          confidence: 1
        };
      }
    }

    // Pass 2 — jawaban yang PERSIS sama dengan distraktor berlabel adalah miskonsepsi yang
    // diketik sendiri, bukan typo. Ini dicek SEBELUM toleransi jarak-1 ke target: "these"
    // saat target "those" bukan jari meleset kalau "these" memang distraktor item itu
    // (A08-F1) — menerimanya sebagai near-match menghapus sinyal diagnostik paling kuat.
    var distractors = Array.isArray(opts.distractors) ? opts.distractors : [];
    for (var x = 0; x < distractors.length; x++) {
      var exactDis = distractors[x];
      if (!exactDis || typeof exactDis.text !== 'string') continue;
      var normExactDis = normalize(exactDis.text);
      if (normExactDis && normAnswer === normExactDis) {
        return {
          ok: false,
          distance: levenshtein(normAnswer, normTarget),
          matchedDistractor: { text: exactDis.text, misconception: exactDis.misconception },
          rationale: 'brain3_production_distractor_match',
          confidence: 0.9
        };
      }
    }

    var primary = null;
    for (var c = 0; c < candidates.length; c++) {
      var verdict = matchAgainst(normAnswer, candidates[c]);
      if (c === 0) primary = verdict;
      if (verdict.ok) {
        return {
          ok: true,
          distance: verdict.distance,
          matchedDistractor: null,
          rationale: c === 0 ? verdict.rationale : 'brain3_production_alternate_accepted',
          // Kecocokan persis = keyakinan penuh; toleransi typo sedikit lebih rendah karena
          // ada peluang kecil murid memang bermaksud kata lain.
          confidence: verdict.distance === 0 ? 1 : 0.85
        };
      }
    }

    // Jawaban salah: cocokkan ke distraktor berlabel supaya miskonsepsi yang DIKETIK
    // sendiri oleh murid bisa masuk ledger. Toleransi distance<=1 yang sama dipakai di sini
    // karena murid yang typo saat menulis miskonsepsinya tetap murid dengan miskonsepsi itu.
    var matchedDistractor = null;
    for (var d = 0; d < distractors.length; d++) {
      var item = distractors[d];
      if (!item || typeof item.text !== 'string') continue;
      var normDis = normalize(item.text);
      if (!normDis) continue;
      if (levenshtein(normAnswer, normDis) <= 1) {
        matchedDistractor = { text: item.text, misconception: item.misconception };
        break;
      }
    }

    return {
      ok: false,
      distance: primary.distance,
      matchedDistractor: matchedDistractor,
      rationale: matchedDistractor ? 'brain3_production_distractor_match' : primary.rationale,
      // Salah yang cocok distraktor adalah bukti diagnostik kuat; salah bebas lebih ambigu.
      confidence: matchedDistractor ? 0.9 : 0.7
    };
  }

  /**
   * Nilai kalimat multi-blank sekaligus.
   * KENAPA per-blank dan bukan satu string panjang: kalimat "She ___ to school and ___ home"
   * punya dua keputusan grammar independen; menyatukannya membuat satu typo menenggelamkan
   * satu miskonsepsi.
   *
   * @param {Array} answers  jawaban murid per blank (indeks sejajar dengan targets)
   * @param {Array} targets  target per blank
   * @param {object} [opts]
   *   opts.blanks : array opsi per-blank ({alternates, distractors}); bila absen, opts
   *                 dipakai bersama untuk semua blank (praktis saat distraktor berlaku umum).
   * @returns {{ok:boolean, results:Array, correctCount:number, total:number, rationale:string}}
   */
  function gradeSet(answers, targets, opts) {
    opts = opts || {};
    var ans = Array.isArray(answers) ? answers : [];
    var tgt = Array.isArray(targets) ? targets : [];
    var perBlank = Array.isArray(opts.blanks) ? opts.blanks : null;
    var results = [];
    var correct = 0;
    for (var i = 0; i < tgt.length; i++) {
      var blankOpts = perBlank ? (perBlank[i] || {}) : opts;
      var r = grade(ans[i], tgt[i], blankOpts);
      results.push(r);
      if (r.ok) correct++;
    }
    return {
      ok: tgt.length > 0 && correct === tgt.length,
      results: results,
      correctCount: correct,
      total: tgt.length,
      rationale: tgt.length === 0 ? 'brain3_production_empty_set'
        : (correct === tgt.length ? 'brain3_production_set_complete' : 'brain3_production_set_partial')
    };
  }

  return {
    SCHEMA: SCHEMA,
    MORPHEME_SUFFIXES: MORPHEME_SUFFIXES.slice(),
    normalize: normalize,
    levenshtein: levenshtein,
    grade: grade,
    gradeSet: gradeSet
  };
});
