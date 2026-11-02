/**
 * features/placement/fiezel-placement-bank-zh.js
 *
 * FIEZEL ADAPTIVE CAT PLACEMENT TEST BANK (MANDARIN - HSK 1 TO HSK 6)
 * Bank Soal Penempatan Adaptif Berbasis IRT 3PL & Kalibrasi Kemampuan Murid.
 *
 * 100% Proprietary Clean Native FIEZEL Assets — Zero External Third-Party Branding.
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FiezelPlacementBankZh = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var QUESTIONS = [
    {
      id: 'pl-zh-01',
      level: 'A1',
      hsk: 'HSK 1',
      difficulty: -1.8,
      discrimination: 1.2,
      guessing: 0.25,
      type: 'VOCAB',
      question: 'Pilihlah arti kata dari “苹果 (píngguǒ)”:',
      options: ['Apel', 'Pisang', 'Jeruk', 'Semangka'],
      answerIndex: 0,
      explanation: '“苹果” berarti buah apel.'
    },
    {
      id: 'pl-zh-02',
      level: 'A1',
      hsk: 'HSK 1',
      difficulty: -1.4,
      discrimination: 1.3,
      guessing: 0.25,
      type: 'GRAMMAR',
      question: 'Lengkapilah kalimat: “他____老师。”',
      options: ['是', '有', '在', '看'],
      answerIndex: 0,
      explanation: 'Kata kerja kopula “是” digunakan untuk menyatakan identitas (Dia adalah guru).'
    },
    {
      id: 'pl-zh-03',
      level: 'A2',
      hsk: 'HSK 2',
      difficulty: -0.6,
      discrimination: 1.4,
      guessing: 0.25,
      type: 'MEASURE_WORD',
      question: 'Pilihlah kata satuan (量词) yang tepat: “我买了一____书。”',
      options: ['本', '张', '个', '条'],
      answerIndex: 0,
      explanation: 'Kata satuan untuk buku berjilid adalah “本 (běn)”.'
    },
    {
      id: 'pl-zh-04',
      level: 'A2',
      hsk: 'HSK 2',
      difficulty: -0.2,
      discrimination: 1.5,
      guessing: 0.25,
      type: 'GRAMMAR',
      question: 'Lengkapilah kalimat perbandingan: “哥哥____我高。”',
      options: ['比', '跟', '像', '和'],
      answerIndex: 0,
      explanation: 'Pola perbandingan Mandarin menggunakan kata “比” (Kakak lebih tinggi daripada saya).'
    },
    {
      id: 'pl-zh-05',
      level: 'B1',
      hsk: 'HSK 3',
      difficulty: 0.4,
      discrimination: 1.5,
      guessing: 0.25,
      type: 'GRAMMAR',
      question: 'Pilihlah struktur yang tepat untuk kalimat penyelesaian (把字句):',
      options: [
        '请把你的作业给我看。',
        '请你的作业把我给看。',
        '请看把你的作业给我。',
        '请给我看把你的作业。'
      ],
      answerIndex: 0,
      explanation: 'Rumus 把: Subjek + 把 + Objek + Predikat/Hasil.'
    },
    {
      id: 'pl-zh-06',
      level: 'B2',
      hsk: 'HSK 4',
      difficulty: 1.1,
      discrimination: 1.6,
      guessing: 0.25,
      type: 'READING',
      question: '“塞翁失马，焉知非福” mengajarkan kita tentang apa?',
      options: [
        'Musibah dan keberuntungan saling berdampingan',
        'Jangan percaya pada orang asing',
        'Kehilangan barang adalah hal wajar',
        'Kuda adalah hewan yang berharga'
      ],
      answerIndex: 0,
      explanation: 'Peribahasa ini mengajarkan bahwa di balik kemalangan bisa tersimpan berkah.'
    }
  ];

  return {
    questions: QUESTIONS,
    getAll: function () { return QUESTIONS; }
  };
}));
