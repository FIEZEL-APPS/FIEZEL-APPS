/**
 * m025-42 Classroom free-question engine.
 *
 * OWNER: pressing the round button and speaking must get a real answer, and the answers
 * must not be the same sentence every time.
 *
 * Two sources, in this order:
 *
 *   1. The Core AI gateway, when it is reachable. That is a genuine language model and is
 *      what makes an open question ("kenapa bukan I have went?") answerable at all.
 *   2. This engine, when the app is offline or the gateway is down - which on an offline-first PWA is
 *      most of the time. It is not a chatbot: it recognises what the learner is asking
 *      FOR (a meaning, a reason, an example, a comparison, a repeat) and builds the answer
 *      out of the lesson actually on screen.
 *
 * The anti-repetition rule is structural, not decorative. Each intent carries several
 * openings, bodies and closings, and `respond` refuses the variant it used last time for
 * that intent. So asking the same thing twice produces the same FACT in different words -
 * which is what a human teacher does, and the opposite of a canned string.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelTutorDialog = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // AI-02 F01: naskah murid diambil dari lapisan i18n (copy-id-feat-b.js). Di browser
  // runtime-nya dimuat lebih dulu (index.html); di Node modul memuatnya sendiri supaya
  // keluaran render tetap byte-identik dengan sebelumnya.
  var I18N = (typeof globalThis !== 'undefined' && globalThis.FiezelI18n) || null;
  if (!I18N && typeof require === 'function') {
    try {
      I18N = require('../i18n/fiezel-i18n.js');
      require('../i18n/copy-id-feat-b.js');
    } catch (loadError) { I18N = null; }
  }
  function T(key, params) { return I18N ? I18N.t(key, params) : String(key); }

  var SCHEMA = 'fiezel-tutor-dialog-v1';

  // Indonesian first, because the learner speaks Indonesian to the tutor. English cues are
  // kept because A1 learners mix the two constantly.
  var INTENT_CUES = [
    ['repeat', ['ulangi', 'ulang lagi', 'sekali lagi', 'repeat', 'gimana tadi', 'apa tadi']],
    ['slower', ['pelan', 'lambat', 'terlalu cepat', 'slower', 'kecepetan']],
    ['example', ['contoh', 'misal', 'example', 'kasih contoh', 'contohnya']],
    ['difference', ['beda', 'bedanya', 'perbedaan', 'difference', 'versus', ' atau ', 'dibanding']],
    ['translate', ['bahasa inggrisnya', 'artinya apa', 'terjemah', 'translate', 'apa artinya', 'dalam bahasa inggris']],
    ['pronounce', ['cara baca', 'bacanya', 'ucap', 'pronounce', 'pelafalan', 'dibacanya']],
    ['why', ['kenapa', 'mengapa', 'why', 'kok ', 'alasan']],
    ['when', ['kapan', 'when', 'dipakai saat', 'digunakan kapan']],
    ['meaning', ['apa itu', 'maksudnya', 'arti', 'meaning', 'apa maksud', 'jelaskan', 'jelasin']],
    ['exam', ['toefl', 'ielts', 'ujian', 'tes ', 'exam', 'skor']],
    ['confused', ['belum paham', 'gak paham', 'nggak paham', 'bingung', 'susah', 'tidak mengerti', 'gak ngerti']],
    ['greeting', ['halo', 'hai', 'hello', 'assalam', 'selamat pagi', 'selamat siang', 'selamat malam']]
  ];

  function normalize(text) {
    return ' ' + String(text == null ? '' : text).toLowerCase().replace(/[^\w\s'-]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  }

  /** What the learner is asking for. Falls back to `open`, never to an error. */
  function classify(text) {
    var value = normalize(text);
    if (!value.trim()) return 'empty';
    for (var i = 0; i < INTENT_CUES.length; i++) {
      var intent = INTENT_CUES[i][0];
      var cues = INTENT_CUES[i][1];
      for (var c = 0; c < cues.length; c++) {
        if (value.indexOf(cues[c]) !== -1) return intent;
      }
    }
    return 'open';
  }

  /**
   * m025-117: nama murid sekarang menjadi salah satu token seperti {topic} dan {formula}.
   * Sampai rilis ini naskah sapaan menuliskan satu nama sungguhan apa adanya, sehingga
   * setiap murid lain disapa dengan nama orang lain. Nilainya dibaca dari aplikasi bila
   * ada; kalau tidak, token {name} menghilang dan kalimatnya tetap utuh - fill() memang
   * membuang token kosong beserta spasi berlebihnya.
   */
  function learnerName(env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : null);
    try {
      var state = target && typeof target.__getFiezelState === 'function' ? target.__getFiezelState() : null;
      return String((state && state.userName) || '').trim();
    } catch (_) { return ''; }
  }

  function lessonContext(lesson, beat) {
    var l = lesson || {};
    var board = l.board || {};
    var examples = Array.isArray(board.examples) ? board.examples : [];
    return {
      name: learnerName(),
      topic: String(l.topic || T('tutor.topic-fallback')),
      level: String(l.level || ''),
      formula: String(board.formula || ''),
      examples: examples,
      firstExample: String(examples[0] || ''),
      secondExample: String(examples[1] || examples[0] || ''),
      beatEn: String((beat && beat.en) || ''),
      beatId: String((beat && (beat.idText || beat.id)) || '')
    };
  }

  // Each entry is a list of complete answers, phrased differently but carrying the same
  // teaching content. Placeholders are filled from the live lesson.
  var ANSWERS = {
    meaning: [
      { id: T('tutor.ans-meaning-1'),
        en: 'Core idea: {formula}' },
      { id: T('tutor.ans-meaning-2'),
        en: '{firstExample}' },
      { id: T('tutor.ans-meaning-3'),
        en: '{formula}' }
    ],
    why: [
      { id: T('tutor.ans-why-1'),
        en: '{formula}' },
      { id: T('tutor.ans-why-2'),
        en: '{formula}' },
      { id: T('tutor.ans-why-3'),
        en: '{firstExample}' }
    ],
    example: [
      { id: T('tutor.ans-example-1'),
        en: '{firstExample}' },
      { id: T('tutor.ans-example-2'),
        en: '{secondExample}' },
      { id: T('tutor.ans-example-3'),
        en: '{beatEn}' }
    ],
    difference: [
      { id: T('tutor.ans-difference-1'),
        en: '{formula}' },
      { id: T('tutor.ans-difference-2'),
        en: '{formula}' },
      { id: T('tutor.ans-difference-3'),
        en: '{firstExample}' }
    ],
    translate: [
      { id: T('tutor.ans-translate-1'),
        en: '{firstExample}' },
      { id: T('tutor.ans-translate-2'),
        en: '{firstExample}' },
      { id: T('tutor.ans-translate-3'),
        en: '{firstExample}' }
    ],
    pronounce: [
      { id: T('tutor.ans-pronounce-1'),
        en: '{firstExample}' },
      { id: T('tutor.ans-pronounce-2'),
        en: '{firstExample}' },
      { id: T('tutor.ans-pronounce-3'),
        en: '{firstExample}' }
    ],
    when: [
      { id: T('tutor.ans-when-1'),
        en: '{formula}' },
      { id: T('tutor.ans-when-2'),
        en: '{firstExample}' },
      { id: T('tutor.ans-when-3'),
        en: '{formula}' }
    ],
    repeat: [
      { id: T('tutor.ans-repeat-1'), en: '{beatEn}' },
      { id: T('tutor.ans-repeat-2'), en: '{beatEn}' },
      { id: T('tutor.ans-repeat-3'), en: '{beatEn}' }
    ],
    slower: [
      { id: T('tutor.ans-slower-1'), en: '{beatEn}' },
      { id: T('tutor.ans-slower-2'), en: '{beatEn}' },
      { id: T('tutor.ans-slower-3'), en: '{beatEn}' }
    ],
    confused: [
      { id: T('tutor.ans-confused-1'),
        en: '{formula}' },
      { id: T('tutor.ans-confused-2'),
        en: '{firstExample}' },
      { id: T('tutor.ans-confused-3'),
        en: '{formula}' }
    ],
    exam: [
      { id: T('tutor.ans-exam-1'),
        en: '{formula}' },
      { id: T('tutor.ans-exam-2'),
        en: '{formula}' },
      { id: T('tutor.ans-exam-3'),
        en: '{formula}' }
    ],
    greeting: [
      { id: T('tutor.ans-greeting-1'), en: 'Hello! Ready when you are.' },
      { id: T('tutor.ans-greeting-2'), en: 'Hi! We are on {topic}.' },
      { id: T('tutor.ans-greeting-3'), en: 'Hello! Ask me anything about {topic}.' }
    ],
    open: [
      { id: T('tutor.ans-open-1'),
        en: '{formula}' },
      { id: T('tutor.ans-open-2'),
        en: '{firstExample}' },
      { id: T('tutor.ans-open-3'),
        en: '{formula}' }
    ],
    empty: [
      { id: T('tutor.ans-empty-1'), en: 'I did not catch that.' },
      { id: T('tutor.ans-empty-2'), en: 'Try once more, a little slower.' },
      { id: T('tutor.ans-empty-3'), en: 'Nothing came through yet.' }
    ]
  };

  function fill(template, ctx) {
    return String(template || '').replace(/\{(\w+)\}/g, function (match, key) {
      var value = ctx[key];
      return value == null || value === '' ? '' : String(value);
    }).replace(/\s+([.,!?])/g, '$1')
      // An example already ends in a full stop, so the template's own stop would double it.
      .replace(/([.!?])[.]+/g, '$1')
      .replace(/\s{2,}/g, ' ').trim();
  }

  /**
   * Picks a variant that is not the one used last time for this intent.
   * @param {object} memory mutable {intentIndex: {intent: number}}
   */
  function pick(list, intent, memory) {
    var used = (memory && memory.lastVariant && memory.lastVariant[intent]);
    var index = 0;
    if (list.length > 1) {
      index = (typeof used === 'number' ? used + 1 : 0) % list.length;
    }
    if (memory) {
      memory.lastVariant = memory.lastVariant || {};
      memory.lastVariant[intent] = index;
    }
    return { value: list[index], index: index };
  }

  function createMemory() { return { lastVariant: {}, turns: 0 }; }

  /**
   * @param {string} text learner's question, as spoken or typed
   * @param {{lesson?:object, beat?:object}} context the lesson currently on screen
   * @param {object} memory from createMemory(); carries the anti-repetition state
   */
  function respond(text, context, memory) {
    var ctx = lessonContext(context && context.lesson, context && context.beat);
    var intent = classify(text);
    var bank = ANSWERS[intent] || ANSWERS.open;
    var chosen = pick(bank, intent, memory);
    if (memory) memory.turns = (Number(memory.turns) || 0) + 1;
    var idText = fill(chosen.value.id, ctx);
    var enText = fill(chosen.value.en, ctx);
    return Object.freeze({
      schema: SCHEMA,
      intent: intent,
      variant: chosen.index,
      question: String(text == null ? '' : text).trim(),
      id: idText,
      en: enText || ctx.firstExample || ctx.formula,
      board: Object.freeze({
        kicker: T('tutor.ask-kicker'),
        title: ctx.topic,
        formula: ctx.formula,
        examples: ctx.examples.slice(0, 3)
      })
    });
  }

  /**
   * The prompt handed to the Core AI gateway.
   *
   * m025-43: this used to instruct the model to answer about the open lesson, which made
   * every reply orbit the same subject - OWNER's "gagal jika disebut AI". The lesson is
   * now optional background only, and the model is explicitly told to answer ANY question,
   * including ones with nothing to do with English.
   */
  function aiPrompt(text, context) {
    var ctx = lessonContext(context && context.lesson, context && context.beat);
    return [
      ctx.name ? ('Kamu adalah FIEZEL, asisten belajar berbahasa Indonesia milik ' + ctx.name + '.')
        : 'Kamu adalah FIEZEL, asisten belajar berbahasa Indonesia.',
      'Jawab pertanyaan APA PUN yang ditanyakan, termasuk yang tidak berhubungan dengan pelajaran bahasa Inggris.',
      'Jangan menolak pertanyaan hanya karena berada di luar materi, dan jangan mengalihkan balik ke materi kecuali memang diminta.',
      'Gaya bicara hangat dan wajar seperti orang yang sedang menjelaskan langsung, bukan daftar aturan.',
      'Maksimal 4 kalimat. Kalau pertanyaannya tentang bahasa Inggris, sertakan satu contoh kalimat.',
      'Kalau kamu tidak tahu jawabannya, katakan tidak tahu dengan jujur.',
      'Jangan mengulang kalimat pembuka yang sama setiap jawaban.',
      '',
      ctx.topic && ctx.topic !== 'materi ini'
        ? 'Konteks opsional, hanya dipakai bila relevan - materi yang sedang dibuka: ' + ctx.topic + (ctx.formula ? ' (pola: ' + ctx.formula + ')' : '')
        : '',
      '',
      'Pertanyaan: ' + String(text || '')
    ].filter(Boolean).join('\n');
  }

  return Object.freeze({
    schema: SCHEMA,
    classify: classify,
    respond: respond,
    aiPrompt: aiPrompt,
    createMemory: createMemory,
    intents: Object.keys(ANSWERS)
  });
}));
