/**
 * FIEZEL Arena Bot — lawan Braincore untuk PAW ARENA (m025-276).
 *
 * MENGAPA BERKAS INI ADA
 * ----------------------
 * PAW ARENA wajib bisa dimainkan SENDIRIAN, offline, tanpa teman dan tanpa jaringan
 * (tugas §3.1.1). Itu berarti lawannya harus lahir di perangkat murid. Bot yang selalu
 * benar bukan lawan, ia dinding (tugas §3.2) — jadi modul ini memodelkan lawan yang
 * KADANG ragu, KADANG salah, punya nama dan gaya. "Salah"-nya bukan acak buta: ia fungsi
 * dari kesulitan soal dan watak persona, sehingga terasa seperti orang, bukan dadu.
 *
 * KENAPA DI features/brain/ (dan konsekuensinya)
 * ----------------------------------------------
 * Keputusan lawan harus bisa DIPUTAR ULANG untuk gerbang: soal yang sama + seed yang sama
 * = langkah bot yang sama, selalu. Karena itu modul ini tunduk pada kontrak kemurnian
 * Braincore (tests/braincore-purity-test.js): TANPA Math.random, TANPA jam tersembunyi,
 * TANPA DOM/storage/jaringan. RNG di-seed dan dioper; waktu, kalau perlu, argumen. Semua
 * keputusan adalah fungsi murni dari argumennya.
 *
 * BATAS: modul ini TIDAK merender apa pun dan TIDAK tahu soal apa pun isinya — ia hanya
 * memilih INDEKS/taruhan dari bahan yang diberikan pemanggil (arena orchestrator). Itu
 * menjaga bank soal, i18n, dan animasi tetap di luar jalur keputusan yang harus murni.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelArenaBot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-arena-bot-v1';

  /**
   * RNG deterministik (mulberry32). Di-seed dari argumen — bukan jam, bukan Math.random —
   * supaya gerbang bisa membekukan urutan langkah bot dan simulasi bisa memutarnya ulang.
   */
  function makeRng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Tiga watak. `skill` = akurasi dasar (0..1), `nerve` = kecenderungan bertaruh besar,
   * `haste` = kecenderungan menjawab tanpa ragu (memengaruhi hanya ANIMASI "berpikir",
   * bukan kebenaran). Nama dwibahasa-netral (nama diri) supaya sama di id & th.
   */
  var PERSONAS = Object.freeze([
    Object.freeze({ id: 'bumi', name: 'Bumi', skill: 0.62, nerve: 0.35, haste: 0.30, blurb: 'careful' }),
    Object.freeze({ id: 'kira', name: 'Kira', skill: 0.74, nerve: 0.80, haste: 0.85, blurb: 'reckless' }),
    Object.freeze({ id: 'rusa', name: 'Pak Rusa', skill: 0.83, nerve: 0.50, haste: 0.45, blurb: 'wise' })
  ]);

  function clamp01(x) { return Math.min(1, Math.max(0, x)); }

  function pickPersona(seed) {
    var rng = makeRng((seed >>> 0) + 101);
    return PERSONAS[Math.floor(rng() * PERSONAS.length) % PERSONAS.length];
  }

  /**
   * Peluang bot MENJAWAB BENAR untuk satu soal. Turun saat soal makin sulit; persona yang
   * lebih terampil turun lebih lambat. Dijepit 0.05..0.97 supaya bot tidak pernah menjadi
   * dinding (selalu benar) maupun lelucon (selalu salah).
   *
   * @param {number} difficulty  kesulitan 1..7 (skala item-prior); default 3.
   */
  function correctProbability(persona, difficulty) {
    var p = persona || PERSONAS[0];
    var d = Number(difficulty);
    if (!(d >= 0)) d = 3;
    var norm = (d - 1) / 6; // 0 (mudah) .. 1 (sulit)
    var prob = p.skill - norm * (0.55 - p.skill * 0.35);
    return clamp01(Math.min(0.97, Math.max(0.05, prob)));
  }

  /**
   * Bot memilih jawaban pilihan-ganda. Kalau "memutuskan benar", memilih correctIndex;
   * kalau tidak, memilih salah satu distraktor (bukan jawaban benar) secara deterministik.
   * @returns {{choice:number, correct:boolean, hesitated:boolean, p:number}}
   */
  function chooseAnswer(opts) {
    var o = opts || {};
    var persona = o.persona || PERSONAS[0];
    var rng = typeof o.rng === 'function' ? o.rng : makeRng((o.seed >>> 0) + 7);
    var count = Math.max(2, Number(o.optionCount) || 4);
    var correctIndex = Number(o.correctIndex);
    if (!(correctIndex >= 0)) correctIndex = 0;
    var p = correctProbability(persona, o.difficulty);
    var willBeCorrect = rng() < p;
    var choice;
    if (willBeCorrect) {
      choice = correctIndex;
    } else {
      // pilih distraktor: geser dari correctIndex sebanyak 1..count-1 posisi.
      var shift = 1 + Math.floor(rng() * (count - 1));
      choice = (correctIndex + shift) % count;
    }
    var hesitated = rng() > persona.haste; // makin tidak tergesa, makin sering "berpikir".
    return { choice: choice, correct: willBeCorrect, hesitated: hesitated, p: p };
  }

  /**
   * STORY CHAIN: bot memilih SATU kalimat lanjutan dari daftar opsi yang ditawarkan sistem.
   * Persona terampil condong ke opsi ber-skor tata bahasa lebih tinggi (options[i].fit),
   * persona gegabah lebih mudah tergoda opsi menarik tapi kurang tepat.
   * @returns {number} indeks opsi terpilih.
   */
  function chooseSentence(opts) {
    var o = opts || {};
    var persona = o.persona || PERSONAS[0];
    var rng = typeof o.rng === 'function' ? o.rng : makeRng((o.seed >>> 0) + 13);
    var options = Array.isArray(o.options) ? o.options : [];
    if (!options.length) return 0;
    // Skor tiap opsi: kelayakan tata bahasa (fit 0..1) dibobot skill, plus derau kecil.
    var best = 0, bestScore = -Infinity;
    for (var i = 0; i < options.length; i++) {
      var fit = Number(options[i] && options[i].fit);
      if (!(fit >= 0)) fit = 0.5;
      var noise = (rng() - 0.5) * (1 - persona.skill);
      var score = fit * persona.skill + noise;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  /**
   * SIGNAL: bot sebagai penebak. Diberi kekuatan jejak petunjuk (clueStrength 0..1) dan
   * jumlah opsi; makin kuat petunjuk + makin terampil persona, makin besar peluang tepat.
   * @returns {{choice:number, correct:boolean}}
   */
  function guessFromClues(opts) {
    var o = opts || {};
    var persona = o.persona || PERSONAS[0];
    var rng = typeof o.rng === 'function' ? o.rng : makeRng((o.seed >>> 0) + 17);
    var count = Math.max(2, Number(o.optionCount) || 4);
    var correctIndex = Number(o.correctIndex); if (!(correctIndex >= 0)) correctIndex = 0;
    var strength = Number(o.clueStrength); if (!(strength >= 0)) strength = 0.5;
    var p = clamp01(0.2 + 0.6 * strength * (0.6 + persona.skill * 0.4));
    var ok = rng() < p;
    var choice = ok ? correctIndex : (correctIndex + 1 + Math.floor(rng() * (count - 1))) % count;
    return { choice: choice, correct: ok };
  }

  /**
   * SIGNAL: bot sebagai pemberi petunjuk. Memilih n kartu petunjuk (indeks) dari bank;
   * persona terampil memilih kartu ber-clarity tinggi, gegabah lebih acak.
   * @returns {number[]} indeks kartu terpilih (terurut, unik).
   */
  function chooseClues(opts) {
    var o = opts || {};
    var persona = o.persona || PERSONAS[0];
    var rng = typeof o.rng === 'function' ? o.rng : makeRng((o.seed >>> 0) + 19);
    var cards = Array.isArray(o.clueCards) ? o.clueCards : [];
    var n = Math.max(1, Math.min(Number(o.n) || 2, cards.length));
    var scored = cards.map(function (c, i) {
      var clarity = Number(c && c.clarity); if (!(clarity >= 0)) clarity = 0.5;
      return { i: i, s: clarity * persona.skill + (rng() - 0.5) * (1 - persona.skill) };
    }).sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, n).map(function (x) { return x.i; }).sort(function (a, b) { return a - b; });
  }

  /**
   * HIGH STAKES: bot memasang taruhan SEBELUM tahu jawabannya benar/salah — jadi ia bisa
   * overconfident. `nerve` menaikkan kecenderungan taruhan besar; persona gegabah (Kira)
   * lebih sering "all-in" lalu bangkrut — persis lawan yang menyenangkan (§3.2).
   * @returns {'low'|'mid'|'high'}
   */
  function chooseWager(opts) {
    var o = opts || {};
    var persona = o.persona || PERSONAS[0];
    var rng = typeof o.rng === 'function' ? o.rng : makeRng((o.seed >>> 0) + 23);
    var roll = rng() * (0.5 + persona.nerve);
    if (roll > 0.85) return 'high';
    if (roll > 0.45) return 'mid';
    return 'low';
  }

  return {
    SCHEMA: SCHEMA,
    PERSONAS: PERSONAS,
    makeRng: makeRng,
    pickPersona: pickPersona,
    correctProbability: correctProbability,
    chooseAnswer: chooseAnswer,
    chooseSentence: chooseSentence,
    guessFromClues: guessFromClues,
    chooseClues: chooseClues,
    chooseWager: chooseWager
  };
});
