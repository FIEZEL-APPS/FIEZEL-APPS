/**
 * features/mandarin/mandarin-braincore-bridge.js
 *
 * FIEZEL BRAINCORE ADAPTIVE ENGINE BRIDGE FOR MANDARIN ('zh')
 * Bayesian Knowledge Tracing (BKT), FSRS Spaced Repetition, Misconception Ledger,
 * dan Penegakan Invarian Pelafalan Merek FIEZEL (/fiːzəl/ "Fee-zel").
 */

(function (factory) {
  'use strict';
  var root = typeof globalThis !== 'undefined' ? globalThis
    : (typeof self !== 'undefined' ? self : this);
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.FiezelMandarinBraincoreBridge = api;
}(function () {
  'use strict';

  var SCHEMA = 'fiezel-mandarin-braincore-bridge-v1';

  // 1. Definisi Skill Nodes BKT untuk Bahasa Mandarin
  var MANDARIN_SKILLS = {
    'zh_tone_recognition': {
      id: 'zh_tone_recognition',
      name: 'Diskriminasi & Pengenalan 4 Nada',
      pL0: 0.20,
      pT: 0.15,
      pG: 0.15, // P(G) rendah: probabilitas tebak nada murni hanya 25%
      pS: 0.12, // Toleransi slip nada
      description: 'Kemampuan membedakan nada 1 (tinggi datar), nada 2 (naik), nada 3 (turun-naik), dan nada 4 (turun tajam).'
    },
    'zh_pinyin_orthography': {
      id: 'zh_pinyin_orthography',
      name: 'Ortografi Pinyin & Pasangan Minimal',
      pL0: 0.30,
      pT: 0.18,
      pG: 0.18,
      pS: 0.10,
      description: 'Penguasaan inisial kontras (zh/z, ch/c, sh/s, j/q/x) dan final hidung (an/ang, en/eng).'
    },
    'zh_hanzi_recognition': {
      id: 'zh_hanzi_recognition',
      name: 'Pengenalan Visual & Radikal Hanzi',
      pL0: 0.15,
      pT: 0.12,
      pG: 0.10,
      pS: 0.08,
      description: 'Pengenalan bentuk glif, radikal semantik, dan jumlah goresan karakter HSK 1–5.'
    },
    'zh_measure_words': {
      id: 'zh_measure_words',
      name: 'Kata Bantu Bilangan / Satuan (量词)',
      pL0: 0.25,
      pT: 0.15,
      pG: 0.20,
      pS: 0.10,
      description: 'Pemasangan kata bantu satuan yang tepat untuk berbagai kategori benda (本, 张, 条, 只, 件).'
    },
    'zh_grammar_svo_aspect': {
      id: 'zh_grammar_svo_aspect',
      name: 'Sintaksis SVO & Partikel Aspek (了/着/过/把)',
      pL0: 0.22,
      pT: 0.14,
      pG: 0.15,
      pS: 0.11,
      description: 'Penyusunan kalimat dengan keterangan waktu/tempat pra-verbal serta konstruksi partikel aspek.'
    }
  };

  // 2. Misconception Ledger Khusus Bahasa Mandarin
  var MISCONCEPTION_REGISTRY = {
    'ERR_TONE_SANDHI_3_3': {
      id: 'ERR_TONE_SANDHI_3_3',
      name: 'Pelesetan Sandhi Nada 3+3 (Tone Sandhi)',
      remediationId: 'Ketika dua nada 3 bertemu berturutan, nada pertama WAJIB berubah menjadi nada 2 saat diucapkan (contoh: 你好 nǐ hǎo dilafalkan ní hǎo).',
      exampleHz: '你好 (ní hǎo)'
    },
    'ERR_TONE_SANDHI_BU_YI': {
      id: 'ERR_TONE_SANDHI_BU_YI',
      name: 'Perubahan Nada Partikel 不 (bù) dan 一 (yī)',
      remediationId: 'Kata 不 (bù) berubah menjadi nada 2 (bú) bila diikuti nada 4 (contoh: 不是 bú shì). Kata 一 (yī) berubah menjadi nada 4 sebelum nada 1, 2, 3, dan nada 2 sebelum nada 4.',
      exampleHz: '不是 (bú shì), 一天 (yì tiān)'
    },
    'ERR_MEASURE_WORD_MISMATCH': {
      id: 'ERR_MEASURE_WORD_MISMATCH',
      name: 'Penyalahgunaan Kata Satuan Umum 个 (gè)',
      remediationId: 'Jangan menggunakan kata bantu umum "个" untuk benda yang memiliki satuan spesifik (seperti buku = 本, benda pipih/lembaran = 张, benda panjang berliku = 条).',
      exampleHz: '两本书 (bukan 两个书)'
    },
    'ERR_SVO_TIME_PLACE_POSITION': {
      id: 'ERR_SVO_TIME_PLACE_POSITION',
      name: 'Kesalahan Posisi Keterangan Waktu & Tempat',
      remediationId: 'Keterangan waktu dan tempat di bahasa Mandarin WAJIB diletakkan sebelum kata kerja (Subjek + Waktu + Tempat + Kata Kerja + Objek).',
      exampleHz: '我明天在学校学习 (bukan 我学习在学校明天)'
    }
  };

  // 3. FSRS Memory Calibration Weights untuk Karakter Hanzi
  function calculateHanziDifficulty(strokeCount, radicalCount) {
    var strokes = parseInt(strokeCount, 10) || 5;
    var radicals = parseInt(radicalCount, 10) || 1;
    // Semakin banyak guratan dan komponen radikal, semakin tinggi kesulitan awal (D0)
    var d = 0.3 + (strokes * 0.03) + (radicals * 0.05);
    return Math.min(Math.max(d, 0.1), 0.95);
  }

  // 4. Invarian Global Pelafalan Merek FIEZEL (/fiːzəl/ "Fee-zel")
  var LIVE_STUDIO_PRONUNCIATION_CLAUSE =
    "CRITICAL PRONUNCIATION RULE: The brand name 'Fiezel' must ALWAYS be pronounced phonetically as a single unified word 'Fee-zel' (/fiːzəl/, rhyming with 'diesel'). NEVER pronounce it as 'Faizel' (/faɪzəl/) and NEVER spell out individual letters F-I-E-Z-E-L.";

  function sanitizeBrandPronunciation(text, lang) {
    if (!text || typeof text !== 'string') return '';
    var l = (lang || 'zh').toLowerCase();
    if (l === 'ja' || l === 'ja-jp') {
      return text.replace(/\bFIEZEL\b|\bFizel\b/gi, 'フィーゼル');
    }
    // Untuk Mandarin (zh), Inggris (en), dan Indonesia (id), gunakan 'Feezel'
    return text.replace(/\bFIEZEL\b|\bFizel\b/gi, 'Feezel');
  }

  return {
    schema: SCHEMA,
    getSkills: function () { return MANDARIN_SKILLS; },
    getSkill: function (id) { return MANDARIN_SKILLS[id] || null; },
    getMisconceptions: function () { return MISCONCEPTION_REGISTRY; },
    getMisconception: function (id) { return MISCONCEPTION_REGISTRY[id] || null; },
    calculateHanziDifficulty: calculateHanziDifficulty,
    sanitizeBrandPronunciation: sanitizeBrandPronunciation,
    LIVE_STUDIO_PRONUNCIATION_CLAUSE: LIVE_STUDIO_PRONUNCIATION_CLAUSE
  };
}));
