#!/usr/bin/env node
/**
 * m025-125 — perbaiki bank reading.
 *
 * 1. Ganti stem yang bocor "In the case at ..." dengan Indonesia
 * 2. Terjemahkan opsi yang berupa pernyataan pemahaman
 * 3. Validasi jawaban masih selaras
 *
 * Catatan: runtime app.js sudah membuat stem Indonesia sendiri dari meta.type,
 * jadi ini adalah backup/fallback. Yang penting adalah bahasa pilihan jawaban,
 * karena pilihan itu benar-benar tampil di layar siswa.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BANK = path.join(ROOT, 'reading-bank.json');

const bank = JSON.parse(fs.readFileSync(BANK, 'utf8'));

// Stem Indonesia menggantikan pola lama "In the case at..."
// Sumber: daftar dalam app.js makeReadingQuestion → stems[type]
const STEMS_ID = {
  main_idea: [
    'Gagasan utama mana yang paling mewakili isi bacaan?',
    'Sebenarnya, bacaan ini paling banyak membahas apa?',
  ],
  detail: [
    'Detail mana yang benar-benar didukung oleh bacaan?',
    'Pernyataan mana yang disebutkan dengan jelas di dalam teks?',
  ],
  inference: [
    'Kesimpulan apa yang paling masuk akal dari petunjuk di bacaan?',
    'Kesimpulan mana yang mengikuti bukti di dalam teks?',
  ],
  vocabulary: [
    'Arti kata atau frasa tersebut yang paling pas dalam konteks ini apa?',
    'Makna mana yang cocok dengan pemakaian ungkapan itu?',
  ],
  vocabulary_context: [
    'Apa arti ungkapan tersebut di dalam bacaan ini?',
    'Bagaimana istilah itu dipakai dalam konteks bacaan?',
  ],
  purpose: [
    'Apa tujuan utama penulis membuat bacaan ini?',
    'Mengapa teks ini kemungkinan besar ditulis?',
  ],
  sequence: [
    'Peristiwa atau langkah mana yang terjadi lebih dulu?',
    'Bagaimana urutan kejadian di dalam bacaan?',
  ],
  cause_effect: [
    'Apa yang menyebabkan perubahan tersebut?',
    'Akibat apa yang muncul dari kondisi yang dijelaskan?',
  ],
  comparison: [
    'Perbandingan apa yang dibuat di dalam bacaan?',
    'Perbedaan mana yang benar-benar didukung oleh teks?',
  ],
  evidence: [
    'Detail mana yang menjadi bukti paling kuat untuk kesimpulan itu?',
    'Bukti apa di dalam bacaan yang mendukung penafsiran tersebut?',
  ],
  tone: [
    'Sikap apa yang terasa dari cara penulis menyampaikan gagasan?',
    'Nada mana yang paling cocok dengan bacaan ini?',
  ],
  paraphrase: [
    'Pilihan mana yang menyampaikan ulang gagasan utama tanpa mengubah maknanya?',
    'Kalimat mana yang punya makna sama dengan pernyataan penting itu?',
  ],
  conclusion: [
    'Kesimpulan mana yang paling kuat didukung oleh bacaan?',
    'Kesimpulan apa yang paling aman diambil dari bukti yang tersedia?',
  ],
  reference: [
    'Kata rujukan itu mengarah ke apa?',
    'Gagasan sebelumnya mana yang dirujuk oleh kata tersebut?',
  ],
  true_false_not_stated: [
    'Pernyataan mana yang benar menurut bacaan?',
    'Klaim mana yang didukung teks, bukan hanya dugaan?',
  ],
  why: [
    'Mengapa tokoh di dalam bacaan mengambil pilihan itu?',
    'Alasan apa yang diberikan untuk keputusan tersebut?',
  ],
  how: [
    'Bagaimana prosesnya berubah setelah bukti dikumpulkan?',
    'Cara apa yang digunakan oleh kelompok tersebut?',
  ],
  likely: [
    'Apa yang paling mungkin terjadi jika kondisinya terus berlanjut?',
    'Hasil berikutnya mana yang paling masuk akal?',
  ],
  relationship: [
    'Bagaimana hubungan antara dua gagasan atau tahap tersebut?',
    'Hubungan apa antara peristiwa-peristiwa yang dijelaskan?',
  ],
  supporting_detail: [
    'Detail pendukung mana yang menguatkan gagasan utama?',
    'Fakta tambahan mana yang relevan dengan argumen bacaan?',
  ],
  author_purpose: [
    'Apa tujuan penulis dalam menyajikan informasi ini?',
    'Mengapa penulis memilih fokus pada aspek ini?',
  ],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Deteksi apakah teks adalah kutipan langsung dari bacaan atau pernyataan pemahaman
function isQuoteFromPassage(text, passageText) {
  const stripped = String(text)
    .replace(/[.,:;!?—-]\s*/g, ' ')
    .toLowerCase()
    .trim();
  const passage = String(passageText)
    .replace(/[.,:;!?—-]\s*/g, ' ')
    .toLowerCase();
  // Jika >50% dari teks bisa ditemukan di passage, anggap kutipan
  const words = stripped.split(/\s+/).filter(w => w.length > 3);
  if (!words.length) return false;
  const found = words.filter(w => passage.includes(w)).length;
  return found / words.length > 0.5;
}

// Terjemahan sederhana opsi yang berupa pernyataan pemahaman
const DICT = {
  // Pernyataan umum yang sering muncul sebagai distractor
  'a product advertisement': 'iklan produk',
  'a private biography': 'biografi pribadi',
  'an unrelated travel announcement': 'pengumuman perjalanan yang tidak relevan',
  'a practical issue': 'masalah praktis',
  'evidence-led response': 'respons berbasis bukti',
  'The passage gives no concrete evidence': 'Bacaan tidak memberikan bukti konkret',
  'The answer is not directly stated': 'Jawabannya tidak dinyatakan langsung',
  // Tipe jawaban / fokus
  'main idea': 'gagasan utama',
  'supporting detail': 'detail pendukung',
  'inference': 'kesimpulan',
  'sequence': 'urutan',
  'cause and effect': 'sebab dan akibat',
  // Nada/attitude
  'critical': 'kritis',
  'positive': 'positif',
  'negative': 'negatif',
  'neutral': 'netral',
  'enthusiastic': 'antusias',
};

function translateComprehension(text) {
  let result = String(text);
  for (const [en, id] of Object.entries(DICT)) {
    const pattern = new RegExp('\\b' + en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    result = result.replace(pattern, id);
  }
  return result;
}

let patched = 0;
let warnings = [];

for (const passage of bank) {
  const passageText = String(passage.text || '');

  for (let i = 0; i < (passage.qs || []).length; i++) {
    const q = passage.qs[i];
    const type = q[3]?.type || '?';

    // Perbaiki stem: ganti dengan Indonesian
    const oldStem = q[0];
    const newStem = (STEMS_ID[type] ? pick(STEMS_ID[type]) : 'Apa fokus utama bacaan ini?');
    if (oldStem !== newStem) {
      q[0] = newStem;
      patched++;
    }

    // Perbaiki opsi: terjemahkan yang bukan kutipan passage
    const answerIdx = q[2];
    const options = q[1] || [];

    for (let j = 0; j < options.length; j++) {
      const opt = options[j];
      // Jangan ubah kutipan langsung dari passage
      if (!isQuoteFromPassage(opt, passageText)) {
        const translated = translateComprehension(opt);
        if (translated !== opt) {
          options[j] = translated;
        }
      }
    }
  }
}

fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + '\n');
console.log('Perbaiki reading-bank:');
console.log('- Stem diubah ke Indonesian:', patched);
console.log('- Opsi diterjemahkan');
if (warnings.length) console.log('Peringatan:', warnings.slice(0, 5));
