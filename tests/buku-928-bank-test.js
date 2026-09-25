'use strict';
/**
 * tests/buku-928-bank-test.js — GERBANG BANK BUKU 928/50 ( Fase D SMP ).
 *
 * Spesifikasi owner (otoritas, disalin verbatim ke SPEC di bawah, BUKAN diimpor
 * dari tool perakit): 50 Bab/Tema, 928 butir SOAL AUTENTIK buku siswa resmi
 * (IPA 250, ENG 244, IND 220, MAT 116, IPS 98), NOL soal buatan AI.
 *
 * Yang dijaga gerbang ini:
 *   B1 aritmetika spesifikasi  — 50 bab, target berjumlah 928 (IPA 250 / ENG 244 /
 *      IND 220 / MAT 116 / IPS 98). Salah ketik target = merah.
 *   B2 integritas bank         — tiap bab terintegrasi TIDAK PERNAH melebihi target
 *      (melebihi = ada filler/karangan). Kurang dari target DIIZINKAN dan dilaporkan
 *      sebagai PARSIAL/BELUM-ADA: cakupan bertumbuh lewat ekstraksi, bukan karangan.
 *   B3 bentuk butir            — prompt, 4 opsi distinct, kunci sah, why + 3 distractorWhy,
 *      dan tiap butir WAJIB membawa sumber.dokumen (jejak buku, anti-filler).
 *   B4 keunikan                — id butir unik global lintas 5 berkas (dedupe bawaan).
 *   B5 anti-sebut-posisi       — prompt/why/distractorWhy tidak boleh menyebut posisi
 *      pilihan ("pilihan A", "opsi di atas", ...): kunci diacak saat terbit.
 *   B6 konsistensi manifest    — kode/nama/grade/target bank = manifest = SPEC.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

/* Entri ganda independen terhadap tools/build_buku_bank.js: kalau tool salah
   ketik target, yang merah duluan adalah B1 di sini. */
const SPEC = [
  ['IPA', 7, 'KOMP-IPA-D-7-BAB1-01', 'Hakikat Ilmu Sains dan Metode Ilmiah', 38],
  ['IPA', 7, 'KOMP-IPA-D-7-BAB2-01', 'Zat dan Perubahannya', 22],
  ['IPA', 7, 'KOMP-IPA-D-7-BAB3-01', 'Suhu, Kalor, dan Pemuaian', 21],
  ['IPA', 7, 'KOMP-IPA-D-7-BAB4-01', 'Gerak dan Gaya', 20],
  ['IPA', 7, 'KOMP-IPA-D-7-BAB5-01', 'Karakteristik dan Klasifikasi Makhluk Hidup', 16],
  ['IPA', 7, 'KOMP-IPA-D-7-BAB6-01', 'Ekologi dan Pelestarian Lingkungan', 16],
  ['IPA', 7, 'KOMP-IPA-D-7-BAB7-01', 'Bumi dan Tata Surya', 16],
  ['IPA', 8, 'KOMP-IPA-D-8-BAB1-01', 'Pengenalan Sel', 20],
  ['IPA', 8, 'KOMP-IPA-D-8-BAB2-01', 'Struktur dan Fungsi Tubuh Makhluk Hidup', 12],
  ['IPA', 8, 'KOMP-IPA-D-8-BAB3-01', 'Usaha, Energi, dan Pesawat Sederhana', 18],
  ['IPA', 8, 'KOMP-IPA-D-8-BAB4-01', 'Tekanan', 19],
  ['IPA', 8, 'KOMP-IPA-D-8-BAB5-01', 'Getaran, Gelombang, dan Cahaya', 12],
  ['IPA', 8, 'KOMP-IPA-D-8-BAB6-01', 'Unsur, Senyawa, dan Campuran', 20],
  ['ENG', 7, 'KOMP-ENG-D-7-BAB1-01', 'Chapter 1: About Me', 12],
  ['ENG', 7, 'KOMP-ENG-D-7-BAB2-01', 'Chapter 2: Culinary and Me', 20],
  ['ENG', 7, 'KOMP-ENG-D-7-BAB3-01', 'Chapter 3: Home Sweet Home', 12],
  ['ENG', 8, 'KOMP-ENG-D-8-BAB1-01', 'Chapter 1: Celebrating Independence Day', 20],
  ['ENG', 8, 'KOMP-ENG-D-8-BAB2-01', 'Chapter 2: Kindness Begins with Me', 20],
  ['ENG', 8, 'KOMP-ENG-D-8-BAB3-01', 'Chapter 3: Love Our World', 20],
  ['ENG', 8, 'KOMP-ENG-D-8-BAB4-01', 'Chapter 4: No Littering', 20],
  ['ENG', 8, 'KOMP-ENG-D-8-BAB5-01', 'Chapter 5: Embrace Yourself', 20],
  ['ENG', 9, 'KOMP-ENG-D-9-BAB1-01', 'Chapter 1: Exploring Fauna of Indonesia', 20],
  ['ENG', 9, 'KOMP-ENG-D-9-BAB2-01', 'Chapter 2: Taking Care of Yourself', 20],
  ['ENG', 9, 'KOMP-ENG-D-9-BAB3-01', 'Chapter 3: Journey to the Fantasy World', 20],
  ['ENG', 9, 'KOMP-ENG-D-9-BAB4-01', 'Chapter 4: Upcycling Used Materials', 20],
  ['ENG', 9, 'KOMP-ENG-D-9-BAB5-01', 'Chapter 5: Digital Life', 20],
  ['IND', 7, 'KOMP-IND-D-7-BAB1-01', 'Bab 1: Jelajah Nusantara', 20],
  ['IND', 7, 'KOMP-IND-D-7-BAB2-01', 'Bab 2: Kelana Cerita Unik', 20],
  ['IND', 7, 'KOMP-IND-D-7-BAB3-01', 'Bab 3: Hal yang Baik bagi Tubuh', 12],
  ['IND', 7, 'KOMP-IND-D-7-BAB4-01', 'Bab 4: Aksi Nyata Pelindung Bumi', 12],
  ['IND', 7, 'KOMP-IND-D-7-BAB5-01', 'Bab 5: Membuka Gerbang Dunia', 18],
  ['IND', 7, 'KOMP-IND-D-7-BAB6-01', 'Bab 6: Sampaikan Melalui Surat', 19],
  ['IND', 8, 'KOMP-IND-D-8-BAB1-01', 'Bab 1: Laporan Hasil Observasi', 20],
  ['IND', 8, 'KOMP-IND-D-8-BAB2-01', 'Bab 2: Iklan, Slogan, dan Poster', 20],
  ['IND', 8, 'KOMP-IND-D-8-BAB3-01', 'Bab 3: Artikel Ilmiah Populer', 20],
  ['IND', 8, 'KOMP-IND-D-8-BAB4-01', 'Bab 4: Teks Ulasan Karya Fiksi', 20],
  ['IND', 8, 'KOMP-IND-D-8-BAB5-01', 'Bab 5: Teks Drama', 20],
  ['IND', 8, 'KOMP-IND-D-8-BAB6-01', 'Bab 6: Menulis Teks Pidato', 19],
  ['MAT', 7, 'KOMP-MAT-D-7-BAB1-01', 'Bilangan Bulat', 20],
  ['MAT', 7, 'KOMP-MAT-D-7-BAB2-01', 'Aljabar', 20],
  ['MAT', 7, 'KOMP-MAT-D-7-BAB3-01', 'Rasio dan Proporsi', 12],
  ['MAT', 7, 'KOMP-MAT-D-7-BAB4-01', 'Bentuk Geometri dan Bangun Datar', 12],
  ['MAT', 7, 'KOMP-MAT-D-7-BAB5-01', 'Kesebangunan dan Hubungan Antar Garis', 20],
  ['MAT', 7, 'KOMP-MAT-D-7-BAB6-01', 'Data dan Diagram', 20],
  ['MAT', 8, 'KOMP-MAT-D-8-BAB1-01', 'Teorema Pythagoras dan Lingkaran', 12],
  ['IPS', 7, 'KOMP-IPS-D-7-BAB1-01', 'Tema 01: Keberadaan Diri dan Keluarga', 18],
  ['IPS', 7, 'KOMP-IPS-D-7-BAB2-01', 'Tema 02: Keberagaman Lingkungan Sekitar', 20],
  ['IPS', 7, 'KOMP-IPS-D-7-BAB3-01', 'Tema 03: Potensi Ekonomi Lingkungan', 20],
  ['IPS', 7, 'KOMP-IPS-D-7-BAB4-01', 'Tema 04: Pemberdayaan Masyarakat', 20],
  ['IPS', 8, 'KOMP-IPS-D-8-BAB1-01', 'Tema 01: Kondisi Geografis dan Pelestarian Sumber Daya Alam', 20],
];
const PER_SUBJECT = { IPA: 250, ENG: 244, IND: 220, MAT: 116, IPS: 98 };
const FORBIDDEN = ['pilihan A', 'pilihan B', 'pilihan C', 'pilihan D', 'jawaban A', 'jawaban B',
  'jawaban C', 'jawaban D', 'opsi A', 'opsi B', 'opsi C', 'opsi D', 'opsi di atas',
  'pilihan di atas', 'jawaban di atas'];
const BANK_FILE = { IPA: 'content/buku/buku-ipa-d.json', ENG: 'content/buku/buku-eng-d.json', IND: 'content/buku/buku-ind-d.json', MAT: 'content/buku/buku-mat-d.json', IPS: 'content/buku/buku-ips-d.json' };

const manifest = JSON.parse(read('content/buku/manifest-buku-928.json'));
const banks = {};
for (const s of Object.keys(BANK_FILE)) banks[s] = JSON.parse(read(BANK_FILE[s]));

test('B1 · spesifikasi berjumlah 50 bab / 928 soal (IPA 250, ENG 244, IND 220, MAT 116, IPS 98)', () => {
  assert.strictEqual(SPEC.length, 50, 'SPEC harus 50 bab, dapat ' + SPEC.length);
  const sum = SPEC.reduce((a, r) => a + r[4], 0);
  assert.strictEqual(sum, 928, 'target harus 928, dapat ' + sum);
  for (const [s, want] of Object.entries(PER_SUBJECT)) {
    const got = SPEC.filter((r) => r[0] === s).reduce((a, r) => a + r[4], 0);
    assert.strictEqual(got, want, s + ': harus ' + want + ', dapat ' + got);
  }
  assert.strictEqual(manifest.totalBab, 50, 'manifest.totalBab');
  assert.strictEqual(manifest.totalSoal, 928, 'manifest.totalSoal');
  assert.strictEqual(manifest.chapters.length, 50, 'manifest.chapters');
});

test('B6 · bank dan manifest setia pada SPEC (kode, nama, grade, target)', () => {
  const cacat = [];
  for (const [subj, grade, code, name, target] of SPEC) {
    const mc = manifest.chapters.filter((c) => c.code === code);
    if (mc.length !== 1) { cacat.push(code + ': di manifest ' + mc.length + 'x'); continue; }
    if (mc[0].name !== name) cacat.push(code + ': nama manifest menyimpang');
    if (mc[0].grade !== grade) cacat.push(code + ': grade manifest menyimpang');
    if (mc[0].target !== target) cacat.push(code + ': target manifest menyimpang');
    const bc = banks[subj].chapters.filter((c) => c.code === code);
    if (bc.length !== 1) { cacat.push(code + ': di bank ' + subj + ' ' + bc.length + 'x'); continue; }
    if (bc[0].name !== name || bc[0].grade !== grade || bc[0].target !== target) cacat.push(code + ': bank menyimpang dari SPEC');
  }
  assert.deepStrictEqual(cacat, [], cacat.slice(0, 8).join(' | '));
});

test('B2 · tak ada bab melebihi target (melebihi = filler); cakupan dilaporkan', () => {
  const lebih = [];
  let tuntas = 0, terisi = 0;
  for (const c of manifest.chapters) {
    if (c.integrated > c.target) lebih.push(c.code + ': ' + c.integrated + '/' + c.target);
    if (c.integrated === c.target) tuntas++;
    terisi += c.integrated;
  }
  assert.deepStrictEqual(lebih, [], lebih.join(' | '));
  assert.strictEqual(terisi, manifest.integratedTotal, 'integratedTotal konsisten');
  console.log('    cakupan autentik: ' + terisi + '/928 butir, ' + tuntas + '/50 bab tuntas (sisa via ekstraksi, bukan karangan)');
});

test('B3+B4 · tiap butir sah, bersumber, id unik global', () => {
  const cacat = [];
  const seen = new Set();
  const dup = [];
  const manByCode = {};
  for (const c of manifest.chapters) manByCode[c.code] = c;
  for (const s of Object.keys(banks)) {
    const b = banks[s];
    assert.strictEqual(b.schema, 'fiezel-buku-bank-v1', s + ': schema');
    assert.strictEqual(b.phase, 'fase_d', s + ': phase');
    for (const c of b.chapters) {
      if (!Array.isArray(c.items)) { cacat.push(c.code + ': items bukan larik'); continue; }
      if (manByCode[c.code] && c.items.length !== manByCode[c.code].integrated) {
        cacat.push(c.code + ': items(' + c.items.length + ') != manifest(' + manByCode[c.code].integrated + ')');
      }
      for (const it of c.items) {
        const at = c.code + '/' + (it.id || '?');
        if (!it.id) { cacat.push(at + ': tanpa id'); continue; }
        if (seen.has(it.id)) dup.push(it.id);
        seen.add(it.id);
        if (!it.prompt || String(it.prompt).length < 8) cacat.push(at + ': prompt');
        if (!Array.isArray(it.options) || it.options.length !== 4) cacat.push(at + ': opsi');
        else if (new Set(it.options).size !== 4) cacat.push(at + ': opsi kembar');
        if (typeof it.answer !== 'number' || !it.options[it.answer]) cacat.push(at + ': kunci');
        if (!it.why || !it.why['0']) cacat.push(at + ': why.0');
        for (const k of ['1', '2', '3']) if (!it.distractorWhy || !it.distractorWhy[k]) cacat.push(at + ': dw.' + k);
        if (!it.sumber || !it.sumber.dokumen) cacat.push(at + ': tanpa sumber buku');
      }
    }
  }
  assert.deepStrictEqual(dup, [], 'id kembar: ' + dup.slice(0, 5).join(', '));
  assert.deepStrictEqual(cacat.slice(0, 1), [], cacat.slice(0, 5).join(' | '));
});

test('B5 · nol penyebutan posisi pilihan di bank buku', () => {
  const kena = [];
  for (const s of Object.keys(banks)) {
    for (const c of banks[s].chapters) {
      for (const it of (c.items || [])) {
        const full = it.prompt + ' ' + it.why['0'] + ' ' + Object.values(it.distractorWhy).join(' ');
        for (const p of FORBIDDEN) {
          if (new RegExp('\\b' + p.replace(/ /g, '\\s+') + '\\b', 'i').test(full)) kena.push(it.id + ':"' + p + '"');
        }
      }
    }
  }
  assert.deepStrictEqual(kena, [], kena.slice(0, 5).join(' | '));
});

let failures = 0;
for (const [n, fn] of tests) {
  try { fn(); console.log('ok - ' + n); }
  catch (e) { failures++; console.error('FAIL - ' + n + '\n    ' + e.message); }
}
process.exit(failures ? 1 : 0);
