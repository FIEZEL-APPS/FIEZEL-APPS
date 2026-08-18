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

  function lessonContext(lesson, beat) {
    var l = lesson || {};
    var board = l.board || {};
    var examples = Array.isArray(board.examples) ? board.examples : [];
    return {
      topic: String(l.topic || 'materi ini'),
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
      { id: 'Oke. {topic} intinya begini: {formula}. Jadi kalau kamu lihat pola itu, kamu sedang melihat {topic}.',
        en: 'Core idea: {formula}' },
      { id: 'Gampangnya begini. {topic} dipakai untuk pola {formula}. Contoh yang paling jelas: {firstExample}',
        en: '{firstExample}' },
      { id: 'Aku jelaskan dari sisi lain ya. Yang perlu kamu pegang dari {topic} cuma satu, yaitu {formula}. Sisanya hanya variasi.',
        en: '{formula}' }
    ],
    why: [
      { id: 'Alasannya ada di polanya. {topic} menuntut bentuk {formula}, jadi kalau bentuknya berubah, kalimatnya jadi salah.',
        en: '{formula}' },
      { id: 'Bukan hafalan, ini soal fungsi. {topic} dipakai supaya maknanya jelas, dan bentuk {formula} yang menjaga kejelasan itu.',
        en: '{formula}' },
      { id: 'Coba bandingkan dengan contohnya: {firstExample}. Kalau polanya diubah, maknanya ikut berubah, dan itulah kenapa aturannya ada.',
        en: '{firstExample}' }
    ],
    example: [
      { id: 'Contohnya: {firstExample}. Sekarang coba kamu ganti subjeknya, polanya tetap {formula}.',
        en: '{firstExample}' },
      { id: 'Ini satu lagi supaya makin jelas: {secondExample}. Perhatikan bagian yang mengikuti polanya.',
        en: '{secondExample}' },
      { id: 'Ambil dari kalimat yang tadi kita bahas: {beatEn}. Itu contoh {topic} yang hidup, bukan contoh buatan.',
        en: '{beatEn}' }
    ],
    difference: [
      { id: 'Bedanya ada di fungsi, bukan di kata. Yang satu mengikuti pola {formula}, yang lain tidak, jadi maknanya bergeser.',
        en: '{formula}' },
      { id: 'Cara membedakannya: lihat polanya dulu. Kalau cocok dengan {formula}, itu {topic}. Kalau tidak, itu bentuk lain.',
        en: '{formula}' },
      { id: 'Pakai contoh ini untuk memisahkan keduanya: {firstExample}. Ganti satu bagian saja, dan kamu langsung dengar bedanya.',
        en: '{firstExample}' }
    ],
    translate: [
      { id: 'Dalam bahasa Inggris, kalimat seperti itu mengikuti pola {formula}. Jadi bentuknya seperti ini: {firstExample}',
        en: '{firstExample}' },
      { id: 'Terjemahannya jangan kata per kata. Susun dulu polanya, {formula}, baru isi katanya. Hasilnya: {firstExample}',
        en: '{firstExample}' },
      { id: 'Kalau diterjemahkan dengan pola yang benar, jadinya {firstExample}. Perhatikan urutannya, karena bahasa Inggris ketat soal urutan.',
        en: '{firstExample}' }
    ],
    pronounce: [
      { id: 'Dengarkan aku dulu, lalu tiru: {firstExample}. Ucapkan pelan, jangan dikejar cepat.',
        en: '{firstExample}' },
      { id: 'Kuncinya di tekanan kata. Aku ucapkan sekali lagi: {firstExample}. Tirukan dengan ritme yang sama.',
        en: '{firstExample}' },
      { id: 'Ucapkan per potongan dulu, baru satu kalimat penuh: {firstExample}',
        en: '{firstExample}' }
    ],
    when: [
      { id: '{topic} dipakai saat maknanya menuntut pola {formula}. Kalau situasinya lain, bentuknya juga lain.',
        en: '{formula}' },
      { id: 'Patokannya sederhana: kalau kalimatmu cocok dengan {firstExample}, berarti ini waktunya memakai {topic}.',
        en: '{firstExample}' },
      { id: 'Jangan lihat waktunya saja, lihat maksudmu. Itu yang menentukan kapan {topic} dipakai.',
        en: '{formula}' }
    ],
    repeat: [
      { id: 'Baik, aku ulangi. {beatId}', en: '{beatEn}' },
      { id: 'Sekali lagi, pelan-pelan. {beatId}', en: '{beatEn}' },
      { id: 'Aku ulang dengan kalimat yang sama supaya kamu bisa mengikuti. {beatId}', en: '{beatEn}' }
    ],
    slower: [
      { id: 'Oke, aku pelankan. {beatId}', en: '{beatEn}' },
      { id: 'Aku turunkan kecepatannya ya. Dengarkan lagi: {beatId}', en: '{beatEn}' },
      { id: 'Pelan saja, tidak usah buru-buru. {beatId}', en: '{beatEn}' }
    ],
    confused: [
      { id: 'Tidak apa-apa, kita mundur satu langkah. Lupakan istilahnya, pegang polanya dulu: {formula}.',
        en: '{formula}' },
      { id: 'Wajar bingung di bagian ini. Kita pakai satu contoh konkret saja: {firstExample}. Dari situ aturannya akan masuk sendiri.',
        en: '{firstExample}' },
      { id: 'Kalau terasa berat, berarti terlalu banyak sekaligus. Ambil satu hal dulu: {formula}. Sisanya nanti.',
        en: '{formula}' }
    ],
    exam: [
      { id: 'Ini relevan untuk TOEFL dan IELTS. {topic} muncul di bagian structure dan writing, jadi polanya harus otomatis, bukan dipikir.',
        en: '{formula}' },
      { id: 'Di ujian, yang diuji bukan hafalan aturannya, tetapi kecepatanmu mengenali pola {formula} di dalam kalimat panjang.',
        en: '{formula}' },
      { id: 'Untuk target TOEFL dan IELTS, materi seperti {topic} adalah fondasi. Kalau ini goyah, bagian sulitnya akan ikut goyah.',
        en: '{formula}' }
    ],
    greeting: [
      { id: 'Halo Jahran. Aku siap. Mau aku jelaskan bagian mana dari {topic}?', en: 'Hello! Ready when you are.' },
      { id: 'Hai. Kita sedang di {topic}. Tanyakan apa saja, aku jawab.', en: 'Hi! We are on {topic}.' },
      { id: 'Halo. Kalau ada yang mengganjal di {topic}, sekarang waktunya bertanya.', en: 'Hello! Ask me anything about {topic}.' }
    ],
    open: [
      { id: 'Pertanyaanmu aku hubungkan ke materi ini dulu. Inti {topic} adalah {formula}, dan dari situ kita bisa uji kalimatmu.',
        en: '{formula}' },
      { id: 'Boleh. Aku jawab lewat contoh supaya tidak abstrak: {firstExample}. Kalau maksudmu berbeda, katakan bagian mana yang kamu maksud.',
        en: '{firstExample}' },
      { id: 'Aku tangkap arah pertanyaanmu. Yang relevan di sini pola {formula}. Coba sebutkan satu kalimatmu sendiri, nanti aku koreksi.',
        en: '{formula}' }
    ],
    empty: [
      { id: 'Aku belum menangkap suaranya. Tekan tombolnya lagi lalu bicara sedikit lebih dekat ya.', en: 'I did not catch that.' },
      { id: 'Suaranya belum masuk. Coba sekali lagi, agak pelan dan jelas.', en: 'Try once more, a little slower.' },
      { id: 'Belum ada yang terdengar. Tekan dan bicara setelah tombolnya menyala.', en: 'Nothing came through yet.' }
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
        kicker: 'TANYA FIEZEL',
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
      'Kamu adalah FIEZEL, asisten belajar berbahasa Indonesia milik Jahran.',
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
