#!/usr/bin/env node
/**
 * m025-125 — perbaiki listening bank untuk bahasa.
 *
 * Listening items punya 3 masalah:
 * 1. question dan options masih Inggris (perlu terjemahan)
 * 2. semua item tanpa penjelasan (explain/rationale) setelah siswa menjawab
 *
 * Strategi:
 * - Terjemahkan question + options ke Indonesia berdasarkan pedagogy focus
 * - Tambahkan penjelasan framework yang mereferensi pedagogy
 * - Ditandai untuk review lebih detail kemudian
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BANK = path.join(ROOT, 'features/speaking-listening/listening-bank-v1.json');

const data = JSON.parse(fs.readFileSync(BANK, 'utf8'));

// Peta terjemahan untuk mode + fokus + jawaban
const FOCUS_LABEL = {
  'main idea': 'gagasan utama',
  'detailed information': 'informasi rinci',
  'specific detail': 'detail spesifik',
  'accurate decoding': 'pengucapan akurat',
  'word segmentation': 'segmentasi kata',
  'conversation flow': 'aliran percakapan',
};

const MODE_PROMPT = {
  dictation: 'Ketik kalimat yang kamu dengar.',
  gist: 'Apa yang paling ingin disampaikan pembicara?',
  detail: 'Apa detail yang ditanyakan?',
};

const MODE_PROMPT_ID = {
  dictation: 'Dengarkan dan ketik dengan akurat. Teks jawaban tidak disimpan setelah penilaian.',
  gist: 'Dengarkan dan pilih apa yang paling ingin disampaikan pembicara.',
  detail: 'Dengarkan dan cari detail yang ditanyakan dengan cermat.',
};

// Terjemahan pernyataan pemahaman umum
const COMPREHENSION_DICT = {
  'A new umbrella': 'Payung baru',
  'a new umbrella': 'payung baru',
  'school shop': 'toko sekolah',
  'school gate': 'pintu gerbang sekolah',
  'the rain': 'hujan',
  'A game': 'Sebuah permainan',
  'a game': 'permainan',
  'plays at': 'dimainkan di',
  'Bringing': 'Membawa',
  'bringing': 'membawa',
  'every day': 'setiap hari',
  'Waiting for': 'Menunggu',
  'waiting for': 'menunggu',
  'because of': 'karena',
  'friend': 'teman',
  'umbrella': 'payung',
  'forgetting': 'lupa',
  'Forgetting': 'Lupa',
  'homework': 'pekerjaan rumah',
  'assignment': 'tugas',
  'teacher': 'guru',
  'school': 'sekolah',
  'rain': 'hujan',
  'sun': 'matahari',
};

function translateComprehension(text) {
  let result = String(text);
  // Sort by length (longest first) to avoid partial replacements
  const sorted = Object.entries(COMPREHENSION_DICT).sort((a, b) => b[0].length - a[0].length);
  for (const [en, id] of sorted) {
    const pattern = new RegExp('\\b' + en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
    result = result.replace(pattern, id);
  }
  return result;
}

function generateExplanationFramework(item) {
  const focus = FOCUS_LABEL[item.pedagogy?.focus] || item.pedagogy?.focus || 'fokus soal';
  const scenario = item.pedagogy?.scenario || '';
  const character = item.pedagogy?.character || 'pembicara';

  if (item.mode === 'dictation') {
    return `Dengarkan sekali lagi dan perhatikan setiap kata. Fokus pada ${focus}. ` +
           `Dalam skenario ini (${scenario}), ${character} mengucapkan kalimat dengan jelas.`;
  }

  const answerText = item.options?.[item.answerIndex] || '';
  return `Jawaban yang benar adalah "${answerText}" karena dalam skenario "${scenario}", ` +
         `itu adalah informasi yang paling relevan. Fokus soal adalah ${focus}. ` +
         `Dengarkan lagi dan perhatikan bagian yang mendukung jawaban ini.`;
}

let patched = 0;
let warnings = [];

for (const item of data.items) {
  // Perbaiki question
  if (item.question && !/^[a-z]/.test(item.question)) {
    // Terjemahkan jika masih Inggris
    const translated = translateComprehension(item.question);
    if (translated !== item.question) {
      item.question = translated;
      patched++;
    }
  }

  // Perbaiki options (untuk gist dan detail mode)
  if (item.options && Array.isArray(item.options)) {
    for (let i = 0; i < item.options.length; i++) {
      const translated = translateComprehension(item.options[i]);
      if (translated !== item.options[i]) {
        item.options[i] = translated;
      }
    }
  }

  // Tambahkan explanation jika tidak ada
  if (!item.explain && !item.rationale) {
    item.explain = generateExplanationFramework(item);
  }
}

fs.writeFileSync(BANK, JSON.stringify(data, null, 2) + '\n');
console.log('Perbaiki listening-bank:');
console.log('- Question + options diterjemahkan:', patched);
console.log('- Framework penjelasan ditambahkan untuk semua ' + data.items.length + ' item');
console.log('Catatan: penjelasan masih framework; perlu review lebih detail.');
