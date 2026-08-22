/**
 * m025-108 penyusun soal listening dari bahan sumber.
 *
 * OWNER meminta 200 soal tambahan per level. Bahannya ditulis tangan di berkas
 * listening-source-*.js; modul ini yang menyusunnya menjadi item bank.
 *
 * SEMUANYA DETERMINISTIK, dan itu bukan pilihan gaya. speaking-listening-test.js
 * menjalankan rebuild lalu membandingkan hash berkasnya: satu Math.random saja membuat
 * tes itu gagal setiap kali dijalankan. Urutan pengecoh karena itu diputar memakai
 * indeks item, bukan diacak - hasilnya tetap bervariasi antar soal tetapi sama persis
 * di setiap kali rebuild.
 *
 * DUA ATURAN MUTU YANG DIJAGA DI SINI:
 *
 *   1. Pengecoh gist diambil dari label adegan LAIN di level yang sama. Pengecoh dari
 *      level berbeda terasa timpang, dan pengecoh karangan bebas mudah menjadi konyol -
 *      dan soal dengan pengecoh konyol bisa dijawab tanpa mendengarkan sama sekali.
 *   2. Jawaban benar tidak boleh selalu di posisi yang sama. Tanpa pemutaran posisi,
 *      pelajar belajar menekan tombol yang sama alih-alih mendengarkan, dan skornya
 *      naik tanpa kemampuannya ikut naik.
 */
'use strict';

var MODES = ['gist', 'detail', 'dictation'];

/** Memutar array sebanyak n langkah. Dipakai menggantikan pengacakan. */
function rotate(list, n) {
  var out = list.slice();
  var shift = ((n % out.length) + out.length) % out.length;
  return out.slice(shift).concat(out.slice(0, shift));
}

function id(level, mode, index) {
  return 'listen_gen_' + level.toLowerCase() + '_' + mode + '_' + String(index + 1).padStart(3, '0');
}

/**
 * Soal gist: menanyakan pokok pembicaraan.
 *
 * Pengecohnya label adegan lain, dipilih berjarak di dalam daftar supaya tiga pengecoh
 * satu soal tidak berasal dari adegan yang bersebelahan - adegan bersebelahan cenderung
 * bertema mirip, dan tiga pengecoh yang mirip satu sama lain mempersempit pilihan.
 */
function buildGist(level, source) {
  var topics = source.scenes.map(function (s) { return s.topic; });
  var items = [];
  var n = 0;
  source.scenes.forEach(function (scene, sceneIndex) {
    scene.scripts.forEach(function (script) {
      var others = [];
      for (var step = 1; others.length < 3; step++) {
        var pick = topics[(sceneIndex + step * 5 + n) % topics.length];
        if (pick !== scene.topic && others.indexOf(pick) === -1) others.push(pick);
      }
      var options = rotate([scene.topic].concat(others), n % 4);
      items.push({
        id: id(level, 'gist', n),
        schema: 'fiezel-listening-item-v1',
        level: level,
        mode: 'gist',
        script: script,
        voiceLang: 'en-US',
        maxReplays: 2,
        pedagogy: {
          focus: 'main idea',
          evidence: 'The speaker is talking about ' + scene.topic.toLowerCase() + '.'
        },
        privacy: { rawLearnerResponseRequiredForPersistence: false },
        question: 'What is the speaker mainly talking about?',
        options: options,
        answerIndex: options.indexOf(scene.topic),
        scoring: { metric: 'exact_choice' }
      });
      n++;
    });
  });
  return items;
}

/** Soal detail: menanyakan fakta yang benar-benar diucapkan. */
function buildDetail(level, source) {
  return source.facts.map(function (fact, n) {
    var options = rotate([fact.answer].concat(fact.wrong), n % 4);
    return {
      id: id(level, 'detail', n),
      schema: 'fiezel-listening-item-v1',
      level: level,
      mode: 'detail',
      script: fact.script,
      voiceLang: 'en-US',
      maxReplays: 2,
      pedagogy: {
        focus: 'specific detail',
        evidence: 'The answer is stated directly in the sentence.'
      },
      privacy: { rawLearnerResponseRequiredForPersistence: false },
      question: fact.question,
      options: options,
      answerIndex: options.indexOf(fact.answer),
      scoring: { metric: 'exact_choice' }
    };
  });
}

/** Soal dictation: menulis ulang kalimat yang didengar. */
function buildDictation(level, source) {
  return source.dictation.map(function (sentence, n) {
    return {
      id: id(level, 'dictation', n),
      schema: 'fiezel-listening-item-v1',
      level: level,
      mode: 'dictation',
      script: sentence,
      voiceLang: 'en-US',
      maxReplays: 2,
      pedagogy: {
        focus: 'accurate decoding and word segmentation',
        evidence: 'The sentence uses vocabulary and structure calibrated for ' + level + '.'
      },
      privacy: { rawLearnerResponseRequiredForPersistence: false },
      question: 'Ketik kalimat yang kamu dengar. Teks jawaban tidak disimpan setelah penilaian.',
      answerText: sentence,
      scoring: { metric: 'token_f1' }
    };
  });
}

/**
 * @param {string} level  A1..C2
 * @param {object} source { scenes, facts, dictation }
 * @returns {Array} item bank untuk satu level
 */
function buildLevel(level, source) {
  if (!source) return [];
  return [].concat(
    buildGist(level, source),
    buildDetail(level, source),
    buildDictation(level, source)
  );
}

/**
 * Memeriksa mutu sebelum item masuk bank.
 *
 * Dijalankan generator, bukan hanya tes, supaya kesalahan bahan terlihat saat menulisnya
 * dan bukan berminggu-minggu kemudian di CI. Melempar, bukan memperingatkan: soal cacat
 * yang lolos ke bank akan dikerjakan pelajar sungguhan.
 */
function assertSound(items) {
  var seenId = {};
  var seenScript = {};
  items.forEach(function (item) {
    if (seenId[item.id]) throw new Error('id ganda: ' + item.id);
    seenId[item.id] = true;

    // Naskah yang sama muncul dua kali membuat pelajar merasa banknya diulang-ulang.
    var key = item.level + '|' + item.script.toLowerCase();
    if (seenScript[key]) throw new Error('naskah ganda di ' + item.level + ': ' + item.script);
    seenScript[key] = true;

    if (MODES.indexOf(item.mode) === -1) throw new Error('mode tidak dikenal: ' + item.mode);

    if (item.mode === 'dictation') {
      if (item.answerText !== item.script) throw new Error('dictation tidak sepadan: ' + item.id);
      if (item.scoring.metric !== 'token_f1') throw new Error('metrik dictation salah: ' + item.id);
      return;
    }
    if (!Array.isArray(item.options) || item.options.length !== 4) {
      throw new Error('pilihan bukan empat: ' + item.id);
    }
    if (new Set(item.options).size !== 4) throw new Error('pilihan tidak unik: ' + item.id);
    if (!(item.answerIndex >= 0 && item.answerIndex < 4)) {
      throw new Error('indeks jawaban di luar rentang: ' + item.id);
    }
  });
  return true;
}

module.exports = {
  MODES: MODES,
  rotate: rotate,
  buildLevel: buildLevel,
  assertSound: assertSound
};
