#!/usr/bin/env node
// Pemindai kebocoran bahasa Indonesia di bank soal Thai. Print-only; exit 1 bila ada temuan.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.env.FIEZEL_ROOT || path.join(__dirname, '..');

const FILES = [
  'grammar-explanations-th.json',
  'vocabulary-th.json',
  'features/i18n/speaking-bank-th.json',
  'features/i18n/listening-bank-th.json',
  'features/i18n/reading-exam-th.json',
  'features/i18n/writing-prompts-th.json',
  'features/i18n/listening-exam-th.json',
  'features/i18n/speaking-exam-th.json',
  'features/i18n/misconception-th.json',
  'features/i18n/cloze-bank-th.json',
  'features/i18n/reading-bank-th.json',
];
const SKIP_KEYS = new Set(['schema', 'status', 'catatan', 'version', 'count', 'generatedFrom', 'id']);

// Kata Indonesia yang hampir tidak pernah muncul di teks Inggris.
const ID_WORDS = new Set(('yang dan untuk dengan ini itu adalah tidak karena dari pada akan sudah bisa kamu ' +
  'kata kalimat jawaban benar salah pilihan arti contoh gunakan pakai bentuk kerja subjek objek ' +
  'kalau jika maka agar supaya atau tetapi tapi namun juga masih belum sedang telah harus perlu ' +
  'dalam luar atas bawah setelah sebelum ketika saat waktu hari tahun bulan minggu jam menit ' +
  'orang anak sekolah guru murid siswa rumah kota negara dunia hidup kerja belajar makan minum ' +
  'pergi datang pulang tinggal punya mempunyai memiliki menjadi membuat memberi mengambil melihat ' +
  'mendengar berbicara bicara menulis membaca berpikir tahu mengerti paham ingin mau suka ' +
  'sangat sekali lebih paling kurang banyak sedikit semua setiap beberapa lain lainnya sama ' +
  'apa siapa mana kapan mengapa kenapa bagaimana berapa dimana kemana ' +
  'saya aku kami kita mereka dia ia kalian anda beliau ' +
  'ya tidak bukan jangan sudah nanti tadi kemarin besok sekarang dulu lagi pernah ' +
  'pertanyaan soal teks bacaan pembicara penutur dialog percakapan cerita paragraf bagian ' +
  'pilih pilihlah lengkapi isilah tentukan tulis tuliskan jelaskan sebutkan dengarkan bacalah ' +
  'berikut tersebut sesuai tepat cocok paling ' +
  'pengertian penjelasan alasan tujuan kesalahan konsep aturan ingat perhatikan ' +
  'bahasa inggris indonesia thailand ' +
  'ke di dengan oleh tentang terhadap antara sebagai seperti hingga sampai sejak selama ' +
  'kalimat pasif aktif lampau kini mendatang kebiasaan keterangan kepemilikan ' +
  'sedangkan padahal meskipun walaupun sehingga bahkan hanya cuma saja pun ' +
  'ia nya lah kah dong sih kok').split(/\s+/).filter(Boolean));

const RE_THAI = /[\u0E00-\u0E7F]/;
const RE_LATIN_WORD = /[A-Za-z][A-Za-z'-]*/g;

const hits = [];
function scan(value, keyPath, key) {
  if (typeof value === 'string') {
    if (SKIP_KEYS.has(key)) return;
    const words = (value.match(RE_LATIN_WORD) || []).map((w) => w.toLowerCase());
    const idHits = words.filter((w) => ID_WORDS.has(w));
    // Toleransi: kata Indonesia tunggal yang juga bisa nama/kata Inggris (mis. "kita", "ia") tidak dihitung sendirian.
    const strong = idHits.filter((w) => !['ia', 'kita', 'lain', 'dia', 'mana', 'ya', 'pun', 'jam', 'kota', 'nya', 'lah', 'kah'].includes(w));
    if (strong.length >= 1 && (strong.length >= 2 || idHits.length >= 2 || !RE_THAI.test(value) || words.length <= 4)) {
      hits.push({ path: keyPath, words: [...new Set(idHits)], value });
    }
    return;
  }
  if (Array.isArray(value)) value.forEach((v, i) => scan(v, keyPath + '[' + i + ']', key));
  else if (value && typeof value === 'object') Object.keys(value).forEach((k) => scan(value[k], keyPath + '.' + k, k));
}

for (const f of FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  scan(JSON.parse(fs.readFileSync(p, 'utf8')), f, '');
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(hits, null, 2));
} else {
  hits.forEach((h) => console.log(`${h.path}\n  [${h.words.join(', ')}] ${h.value}\n`));
  console.log(`${hits.length} temuan kebocoran bahasa Indonesia di bank soal Thai.`);
}
process.exit(hits.length ? 1 : 0);
