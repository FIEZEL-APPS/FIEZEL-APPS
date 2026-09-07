// tests/japanese-reading-bank-test.js — bacaan Jepang: setiap jawaban benar punya bukti
// yang BENAR-BENAR ADA di teksnya.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Soal bacaan adalah tempat kebohongan paling sunyi di seluruh aplikasi. Sebuah soal bisa
// punya pertanyaan wajar, empat pilihan wajar, dan kunci yang wajar — tanpa satu pun dari
// itu benar-benar bisa dijawab dari teks yang ada di layar. Murid membaca, tidak menemukan
// jawabannya, lalu menebak; yang dilatih bukan membaca, melainkan menebak. Tidak ada gerbang
// bentuk yang bisa melihatnya.
//
// Karena itu assert intinya cuma satu, dan bukan soal bentuk: `evidence` setiap soal harus
// substring PERSIS dari `text` bacaannya sendiri. Kalau buktinya ada di teks, jawabannya bisa
// ditemukan; kalau tidak, soalnya tidak punya dasar dan gerbang ini merah.
//
// Bank Inggris (reading-bank.json) sudah memakai medan `evidence` dengan cara yang sama, jadi
// yang dijaga di sini bukan aturan baru — hanya aturan lama yang akhirnya ditegakkan mesin.
//
// HAK CIPTA: seluruh teks bacaan dikarang untuk FIEZEL. Nol kalimat disalin dari Minna no
// Nihongo, Irodori, buku ajar, atau situs berita mana pun.
//
// YANG DIJAGA
//   1. Setiap `evidence` benar-benar ada di teksnya (assert inti).
//   2. Teks bacaan beraksara Jepang; pertanyaan dan pilihan TIDAK beraksara Jepang — murid
//      FIEZEL orang Indonesia, dan soal berbahasa Jepang tentang teks Jepang menguji dua hal
//      sekaligus di tingkat yang belum sampai ke situ.
//   3. Tepat 5 soal per bacaan, 4 pilihan berbeda, kunci di dalam jangkauan.
//   4. Kunci tidak menumpuk di satu posisi — pola yang bisa ditebak tanpa membaca.
//   5. Bentuknya identik dengan bank Inggris, jadi ia lewat jalur hidrasi yang sama.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const bacaJson = (p) => JSON.parse(fs.readFileSync(path.join(__fzRoot, p), 'utf8'));

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

const bank = bacaJson('content/ja/reading-bank-ja.json');
const bacaan = Array.isArray(bank) ? bank : bank.passages || [];
const JEPANG = /[぀-ゟ゠-ヿ一-龯]/;
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

test('bank berisi bacaan, dan tiap tingkat kebagian', () => {
  assert.ok(bacaan.length >= 100, 'bacaan terlalu sedikit: ' + bacaan.length);
  const per = {};
  bacaan.forEach((p) => { per[p.level] = (per[p.level] || 0) + 1; });
  const kosong = ['A1', 'A2', 'B1', 'B2', 'C1'].filter((l) => !per[l]);
  assert.deepStrictEqual(kosong, [], 'tingkat tanpa satu pun bacaan: ' + kosong.join(', '));
});

test('SETIAP bukti jawaban benar-benar ada di teks bacaannya', () => {
  const menggantung = [];
  for (const p of bacaan) {
    for (const q of p.qs || []) {
      const bukti = String(q[3]?.evidence || '');
      if (!bukti) { menggantung.push(p.id + ' — soal tanpa bukti'); continue; }
      if (String(p.text || '').indexOf(bukti) < 0) {
        menggantung.push(p.id + ' — bukti tidak ada di teks: ' + bukti.slice(0, 30));
      }
    }
  }
  assert.deepStrictEqual(menggantung.slice(0, 8), [],
    menggantung.length + ' soal tidak bisa dijawab dari teksnya — yang dilatih menebak, bukan membaca');
});

test('teks beraksara Jepang, pertanyaan dan pilihan berbahasa Indonesia', () => {
  // Soal tipe reference dan kosakata HARUS mengutip kata Jepang yang ditanyakan — melarangnya
  // berarti melarang dua tipe soal yang justru paling melatih membaca. Yang dilarang adalah
  // soal yang batang kalimatnya berbahasa Jepang. Ukurannya: buang potongan Jepang pendek
  // (kutipan), lalu pastikan yang tersisa masih kalimat Indonesia yang berdiri sendiri.
  const KUTIPAN_MAKS = 8;
  const batangJepang = (teks) => {
    const t = String(teks);
    // Tanpa satu pun aksara Jepang, tidak ada yang bisa dituduh — 'Mi' (makanan) pernah
    // ditandai merah oleh versi pertama pemeriksa ini semata karena pendek.
    if (!JEPANG.test(t)) return false;
    if (/[぀-ゟ゠-ヿ一-龯]{9,}/.test(t)) return true;      // runtun panjang = kalimat, bukan kutipan
    return !/[A-Za-z]{3,}/.test(t.replace(/[぀-ゟ゠-ヿ一-龯]{1,8}/g, ' '));
  };
  const salah = [];
  for (const p of bacaan) {
    if (!JEPANG.test(p.text || '')) salah.push(p.id + ' — teks bukan bahasa Jepang');
    for (const q of p.qs || []) {
      if (batangJepang(q[0])) salah.push(p.id + ' — batang pertanyaan berbahasa Jepang: ' + String(q[0]).slice(0, 30));
      for (const o of q[1] || []) if (batangJepang(o)) salah.push(p.id + ' — pilihan berbahasa Jepang: ' + String(o).slice(0, 30));
    }
    void KUTIPAN_MAKS;
  }
  assert.deepStrictEqual(salah.slice(0, 8), [], salah.length + ' cacat bahasa');
});

test('tepat 5 soal, 4 pilihan berbeda, kunci di dalam jangkauan', () => {
  const cacat = [];
  for (const p of bacaan) {
    if ((p.qs || []).length !== 5) cacat.push(p.id + ' — ' + (p.qs || []).length + ' soal, bukan 5');
    for (const q of p.qs || []) {
      const opsi = q[1] || [];
      if (opsi.length !== 4) cacat.push(p.id + ' — ' + opsi.length + ' pilihan');
      if (new Set(opsi.map((x) => String(x).trim())).size !== opsi.length) cacat.push(p.id + ' — pilihan kembar');
      if (!Number.isInteger(q[2]) || q[2] < 0 || q[2] >= opsi.length) cacat.push(p.id + ' — kunci di luar jangkauan');
    }
  }
  assert.deepStrictEqual(cacat.slice(0, 8), [], cacat.length + ' soal cacat bentuk');
});

test('kunci tidak menumpuk di satu posisi — pola yang bisa ditebak tanpa membaca', () => {
  const hitung = [0, 0, 0, 0];
  let total = 0;
  for (const p of bacaan) for (const q of p.qs || []) { if (Number.isInteger(q[2]) && q[2] < 4) { hitung[q[2]]++; total++; } }
  const terbesar = Math.max(...hitung);
  assert.ok(terbesar / total < 0.45,
    'kunci menumpuk di satu posisi (' + hitung.join('/') + ' dari ' + total + ') — murid bisa benar tanpa membaca');
});

test('tingkat memakai skala CEFR yang sama dengan bank Inggris', () => {
  const asing = [...new Set(bacaan.map((p) => p.level))].filter((l) => !LEVELS.includes(l));
  assert.deepStrictEqual(asing, [], 'tingkat di luar skala: ' + asing.join(', '));
});

test('tidak ada id kembar', () => {
  const seen = new Set(); const kembar = [];
  for (const p of bacaan) { if (seen.has(p.id)) kembar.push(p.id); seen.add(p.id); }
  assert.deepStrictEqual(kembar.slice(0, 5), [], kembar.length + ' id kembar');
});

test('medan yang BENAR-BENAR dibaca aplikasi ada semua — satu jalur hidrasi, bukan dua', () => {
  // Bank Inggris punya medan author/setting/focus yang tidak pernah dibaca app.js. Menuntut
  // bank Jepang mengarangnya hanya menambah kebisingan yang terdengar spesifik padahal
  // ditebak. Yang dituntut di sini adalah medan yang jalur hidrasi benar-benar pakai —
  // termasuk `topic`, yang dibaca buildAcademicReadingPath untuk menyusun jalur bacaan.
  const wajib = ['id', 'level', 'title', 'text', 'topic', 'qs'];
  const kurang = [];
  for (const p of bacaan) for (const m of wajib) if (!p[m]) kurang.push(p.id + ':' + m);
  assert.deepStrictEqual(kurang.slice(0, 8), [], kurang.length + ' medan wajib kosong');
  // Struktur soal: [pertanyaan, opsi[], kunci, meta] persis seperti bank Inggris.
  const q = bacaan[0].qs[0];
  assert.ok(Array.isArray(q) && typeof q[0] === 'string' && Array.isArray(q[1]) && typeof q[2] === 'number' && q[3] && typeof q[3] === 'object',
    'bentuk soal berbeda dari bank Inggris — jalur hidrasi tidak akan bisa membacanya');
  const en = bacaJson('reading-bank.json');
  const qEn = en[0].qs[0];
  assert.strictEqual(q.length, qEn.length, 'panjang tupel soal berbeda dari bank Inggris');
});

test('bank diprecache sw.js', () => {
  const sw = fs.readFileSync(path.join(__fzRoot, 'sw.js'), 'utf8');
  assert.ok(sw.indexOf('content/ja/reading-bank-ja.json') >= 0, 'bank bacaan ja tidak ada di ASSETS sw.js');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(fs.readFileSync(path.join(__fzRoot, '.github/workflows/quality.yml'), 'utf8')
    .indexOf('japanese-reading-bank-test.js') >= 0, 'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('japanese-reading-bank-test GAGAL: ' + failures.length + ' assert merah');
  console.log('japanese-reading-bank-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('japanese-reading-bank-test: ' + pass + '/' + total + ' assert PASS');
