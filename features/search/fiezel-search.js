/**
 * m025-102 pencarian materi.
 *
 * OWNER: "user ingin belajar topik yang tidak dia mengerti, misalnya dia ketik 'did',
 * kemudian sistem melempar user ke materi terkait."
 *
 * KENAPA PENCOCOKAN TEKS SAJA TIDAK CUKUP. Kata "did" muncul 45 kali di dalam teks soal
 * grammar. Pencarian teks biasa akan mengembalikan soal-soal yang KEBETULAN memuat kata
 * itu - padahal yang dicari pelajar adalah materi TENTANG did, yaitu past simple dan kata
 * kerja bantu. Hasil yang penuh tetapi salah lebih buruk daripada hasil kosong, karena
 * pelajar menyimpulkan aplikasinya memang tidak punya materinya.
 *
 * Maka pencocokannya berlapis, dan lapisan yang menjawab kasus OWNER adalah yang kedua:
 *
 *   1. KONSEP. Peta dari apa yang benar-benar diketik pelajar ke subskill yang ada.
 *      Ditulis dua bahasa, karena "kata kerja bantu" akan diketik sesering "auxiliary".
 *   2. LABEL. Nama family dan subskill di bank materi sendiri - 16 dan 129 buah, semuanya
 *      sudah deskriptif, jadi mencocokkan ke sana hampir selalu tepat sasaran.
 *   3. TEKS. Barulah isi soal, kata, dan contoh kalimat. Paling akhir karena paling
 *      berisik.
 *
 * Peringkatnya mencerminkan urutan itu: kecocokan konsep selalu di atas kecocokan teks,
 * betapapun banyak kata yang cocok di lapis ketiga.
 *
 * Semuanya berjalan LOKAL dan sinkron. Tidak ada AI di sini: pencarian yang menunggu
 * jaringan akan terasa rusak, dan jatah AI 40 permintaan per jam akan habis oleh orang
 * yang sekadar mengetik.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelSearch = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-search-v1';
  var MAX_RESULTS = 20;

  /**
   * Kamus konsep: apa yang diketik pelajar -> penanda materi.
   *
   * Ditulis tangan dan sengaja pendek. Setiap entri harus menjawab pertanyaan "kalau
   * seseorang mengetik ini, materi mana yang dia maksud" - bukan "kata ini muncul di
   * mana". Entri yang meragukan lebih baik tidak ada: satu pemetaan salah mengirim
   * pelajar ke pelajaran yang keliru dan itu lebih merugikan daripada tidak menemukan.
   */
  var CONCEPTS = Object.freeze([
    // --- kata bantu & bentuk pertanyaan: kasus yang OWNER contohkan -------------
    { terms: ['did', 'didnt', "didn't", 'did not'], tags: ['past_simple', 'question_negation', 'tense_aspect'] },
    { terms: ['do', 'does', 'dont', "don't", 'doesnt', "doesn't"], tags: ['present_simple', 'question_negation'] },
    { terms: ['kata kerja bantu', 'kata bantu', 'auxiliary', 'auxiliaries'], tags: ['question_negation', 'modals'] },
    { terms: ['tanya', 'pertanyaan', 'question', 'questions'], tags: ['question_negation'] },
    { terms: ['question tag', 'tag question', 'kan'], tags: ['question_tag_polarity'] },

    // --- tense ------------------------------------------------------------------
    { terms: ['past simple', 'past tense', 'lampau', 'masa lalu', 'kemarin'], tags: ['past_simple', 'tense_aspect'] },
    { terms: ['present perfect', 'sudah', 'have', 'has', 'telah'], tags: ['present_perfect', 'tense_aspect'] },
    { terms: ['past perfect', 'had'], tags: ['past_perfect', 'tense_aspect'] },
    { terms: ['continuous', 'progressive', 'ing', 'sedang'], tags: ['continuous', 'tense_aspect'] },
    { terms: ['future', 'akan', 'will', 'going to'], tags: ['future', 'tense_aspect'] },

    // --- struktur lain ----------------------------------------------------------
    { terms: ['modal', 'modals', 'can', 'could', 'should', 'must', 'boleh', 'harus', 'bisa'], tags: ['modals'] },
    { terms: ['if', 'kalau', 'jika', 'seandainya', 'conditional', 'pengandaian'], tags: ['conditionals'] },
    { terms: ['passive', 'pasif', 'kalimat pasif', 'di-'], tags: ['passive'] },
    { terms: ['reported speech', 'kalimat tidak langsung', 'said that'], tags: ['reported_speech'] },
    { terms: ['a', 'an', 'the', 'article', 'artikel'], tags: ['articles_determiners'] },
    { terms: ['preposition', 'kata depan', 'in', 'on', 'at'], tags: ['prepositions'] },
    { terms: ['gerund', 'infinitive', 'to + verb'], tags: ['gerunds_infinitives'] },
    { terms: ['relative clause', 'who', 'which', 'that', 'whose'], tags: ['relative_clauses'] },
    { terms: ['comparative', 'superlative', 'perbandingan', 'lebih', 'paling', 'er', 'est'], tags: ['comparison'] },
    { terms: ['s es', 's/es', 'subject verb agreement', 'kesesuaian subjek'], tags: ['subject_verb_agreement'] },
    { terms: ['linking', 'penghubung', 'however', 'therefore', 'konjungsi'], tags: ['linking_devices'] },
    { terms: ['error correction', 'perbaiki kalimat', 'salah'], tags: ['error_correction'] }
  ]);

  /* ---- normalisasi ----------------------------------------------------- */

  function normalize(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[^a-z0-9'\/\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Label seperti past_simple_vs_present_perfect dipecah jadi kata yang bisa dicocokkan. */
  function labelWords(label) {
    return normalize(String(label || '').replace(/[_-]+/g, ' ')).split(' ').filter(Boolean);
  }

  /* ---- lapis 1: konsep -------------------------------------------------- */

  /**
   * Mencocokkan kueri ke penanda konsep. Kecocokan harus UTUH pada tingkat frasa atau
   * kata - bukan substring - karena "did" sebagai substring juga ada di dalam "middle"
   * dan "candidate", dan pemetaan konsep yang salah jauh lebih merugikan daripada
   * kehilangan satu hasil.
   */
  function conceptTags(query) {
    var q = normalize(query);
    if (!q) return [];
    var words = q.split(' ');
    var tags = [];
    CONCEPTS.forEach(function (entry) {
      var hit = entry.terms.some(function (term) {
        var t = normalize(term);
        if (!t) return false;
        if (t.indexOf(' ') !== -1) return q.indexOf(t) !== -1;   // frasa
        return words.indexOf(t) !== -1;                          // kata utuh
      });
      if (hit) entry.tags.forEach(function (tag) {
        if (tags.indexOf(tag) === -1) tags.push(tag);
      });
    });
    return tags;
  }

  /* ---- penilaian -------------------------------------------------------- */

  var WEIGHT = Object.freeze({ concept: 100, label: 40, title: 12, text: 3 });

  /**
   * Satu entri indeks: { id, view, title, label, text }
   *   view  - layar tujuan saat hasilnya ditekan
   *   label - family/subskill, dipakai lapis konsep dan lapis label
   *   text  - isi yang boleh dicari, digabung apa adanya
   */
  function scoreEntry(entry, query, tags) {
    var q = normalize(query);
    if (!q) return 0;
    var words = q.split(' ').filter(Boolean);
    var score = 0;

    var label = normalize(String(entry.label || '').replace(/[_-]+/g, ' '));
    var lw = labelWords(entry.label);

    // Lapis 1. Satu penanda konsep yang cocok mengalahkan berapa pun kecocokan teks -
    // itulah yang membuat "did" mendarat di past simple, bukan di soal yang kebetulan
    // memuat kata did.
    tags.forEach(function (tag) {
      var t = normalize(String(tag).replace(/[_-]+/g, ' '));
      if (!t) return;
      var parts = t.split(' ').filter(Boolean);
      var all = parts.every(function (p) { return lw.indexOf(p) !== -1; });
      if (all) score += WEIGHT.concept;
    });

    // Lapis 2. Kata kueri yang muncul di nama family/subskill.
    words.forEach(function (w) {
      if (lw.indexOf(w) !== -1) score += WEIGHT.label;
      else if (w.length > 3 && label.indexOf(w) !== -1) score += WEIGHT.label / 2;
    });

    // Lapis 3. Judul lalu isi. Kata utuh saja: substring membuat "do" cocok dengan
    // "door" dan hasilnya terlihat acak bagi pelajar.
    var title = normalize(entry.title);
    var text = normalize(entry.text);
    words.forEach(function (w) {
      var re = new RegExp('(^| )' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '( |$)');
      if (re.test(title)) score += WEIGHT.title;
      if (re.test(text)) score += WEIGHT.text;
    });

    return score;
  }

  /**
   * @param {Array} index entri materi
   * @param {string} query
   * @returns {{query:string, tags:string[], results:Array, empty:boolean}}
   */
  function search(index, query, activeLevel) {
    var q = String(query == null ? '' : query).trim();
    var tags = conceptTags(q);
    var level = String(activeLevel || '').trim().toUpperCase();
    var list = Array.isArray(index) ? index : [];
    if (/^(?:A1|A2|B1|B2|C1|C2)$/.test(level)) list = list.filter(function (entry) { return !entry.level || entry.level === level; });

    var scored = [];
    for (var i = 0; i < list.length; i++) {
      var s = scoreEntry(list[i], q, tags);
      if (s > 0) scored.push({ entry: list[i], score: s });
    }
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      // Seri diputus oleh judul, bukan urutan indeks, supaya hasilnya stabil antar
      // pemuatan dan tidak berubah-ubah untuk kueri yang sama.
      return String(a.entry.title || '').localeCompare(String(b.entry.title || ''));
    });

    var results = scored.slice(0, MAX_RESULTS).map(function (x) {
      return { id: x.entry.id, view: x.entry.view, title: x.entry.title, label: x.entry.label, score: x.score };
    });

    return { schema: SCHEMA, query: q, tags: tags, results: results, empty: results.length === 0 };
  }

  /* ---- pembangun indeks -------------------------------------------------- */

  function push(out, entry) {
    if (entry && entry.title) out.push(entry);
  }

  /**
   * Membangun indeks dari bank materi yang sudah ada. Bentuk banknya berbeda-beda, jadi
   * tiap sumber punya pembacanya sendiri - dan yang tidak dikenali dilewati diam-diam
   * alih-alih melempar, karena pencarian yang mati total gara-gara satu bank berubah
   * bentuk jauh lebih buruk daripada pencarian yang kehilangan satu sumber.
   */
  function buildIndex(sources) {
    var src = sources || {};
    var out = [];

    function collect(node, fn) {
      if (Array.isArray(node)) { node.forEach(function (x) { collect(x, fn); }); return; }
      if (node && typeof node === 'object') {
        fn(node);
        Object.keys(node).forEach(function (k) { collect(node[k], fn); });
      }
    }

    collect(src.grammar, function (n) {
      if (!n.subskill && !n.family) return;
      push(out, {
        id: String(n.id || n.subskill || ''),
        view: 'grammar',
        level: String(n.level || n.cefr || ''),
        title: String(n.subskill || n.family || '').replace(/[_-]+/g, ' '),
        label: [n.family, n.subskill].filter(Boolean).join(' '),
        text: [n.stem, n.pedagogicalObjective, n.explanation].filter(Boolean).join(' ')
      });
    });

    collect(src.vocabulary, function (n) {
      if (!n.word) return;
      push(out, {
        id: String(n.id || n.word),
        view: 'vocab',
        level: String(n.level || n.cefr || ''),
        title: String(n.word),
        label: String(n.partOfSpeech || ''),
        text: [n.meaning, n.example].filter(Boolean).join(' ')
      });
    });

    collect(src.reading, function (n) {
      if (!n.title && !n.passageId) return;
      push(out, {
        id: String(n.id || n.passageId || ''),
        view: 'reading',
        level: String(n.level || n.cefr || ''),
        title: String(n.title || n.passageId || ''),
        label: String(n.topic || n.cefr || ''),
        text: String(n.text || n.passage || '')
      });
    });

    // Entri sintetis untuk tiap family dan subskill. Ini yang membuat pelajar bisa
    // mendarat di TOPIK, bukan pada satu soal acak di dalamnya - dan yang membuat
    // pencarian tetap menjawab meski banknya belum punya soal untuk topik itu.
    var seen = {};
    out.slice().forEach(function (e) {
      String(e.label || '').split(' ').filter(Boolean).forEach(function (label) {
        if (seen[label]) return;
        seen[label] = true;
        push(out, {
          id: 'topic:' + label,
          view: 'grammar',
          level: String(e.level || ''),
          title: label.replace(/[_-]+/g, ' '),
          label: label,
          text: ''
        });
      });
    });

    return out;
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    MAX_RESULTS: MAX_RESULTS,
    CONCEPTS: CONCEPTS,
    WEIGHT: WEIGHT,
    normalize: normalize,
    conceptTags: conceptTags,
    scoreEntry: scoreEntry,
    buildIndex: buildIndex,
    search: search
  });
}));
