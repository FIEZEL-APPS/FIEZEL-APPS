'use strict';
/**
 * tests/kurikulum-pintu-test.js — PERMUKAAN YANG SUDAH JADI HARUS PUNYA PINTU
 * (m025-349, temuan X2/X3/K10/G1).
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * Audit 20 September 2026 menemukan tiga permukaan yang selesai dibangun, diuji, dan
 * tidak bisa dibuka siapa pun dari dalam produk:
 *
 *   X2 — kurikulum.html (konsol Kurikulum & Kompetensi: rekomendasi mengajar, matriks
 *        cakupan per TP, learning graph, bank soal, blueprint asesmen, draf narasi
 *        e-Rapor). Satu-satunya tautan menujunya ada di layar MURID.
 *   X3 — misi.html (mesin misi adaptif). Satu-satunya tautan menujunya ada di layar GURU.
 *   K10 — progresView() di fiezel-class-hub.js. Tidak ada satu pun tab yang membukanya.
 *
 * Ketiganya adalah nilai yang sudah dibayar dan belum diambil. Gerbang ini menjaga
 * pintunya tetap terpasang — dan menjaga SYARAT pintunya tetap benar, karena pintu yang
 * terbuka ke ruangan kosong lebih merugikan daripada fitur yang belum ada (pelajaran
 * m025-296, tercatat di fiezel-ux-flags.js).
 *
 * G1 ikut dijaga di sini karena ia satu paket dengan X2: membuka pintu ke konsol yang
 * menghapus ketikan gurunya adalah urutan yang salah.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

const SHELL = baca('features/teacher/fiezel-teacher-shell.js');
const HUB = baca('features/class-hub/fiezel-class-hub.js');
const KONSOL = baca('features/curriculum/teacher-console.js');

/* ------------------------------------------------------------------- X2: pintu guru */

test('X2 — Ruang Guru menautkan konsol Kurikulum & Kompetensi', () => {
  assert.ok(/href="\.\/kurikulum\.html"/.test(SHELL),
    'features/teacher/fiezel-teacher-shell.js tidak lagi menautkan kurikulum.html — konsol terlengkap di repo ini kembali tanpa pintu.');
  assert.ok(/data-testid="tg-curriculum-console-door"/.test(SHELL), 'pintu konsol kehilangan data-testid-nya');
});

test('X2 — pintunya digantung pada alamat backend, bukan dipajang tanpa syarat', () => {
  const i = SHELL.indexOf('var pintuKonsol');
  assert.ok(i > 0, 'pintuKonsol tidak ditemukan');
  const blok = SHELL.slice(i, i + 200);
  assert.ok(/konsolKurikulumSiap\(\)/.test(blok),
    'pintu konsol tidak lagi memeriksa konsolKurikulumSiap() — ia bisa membuka ruangan kosong saat backend mati.');
});

/* ------------------------------------------------------------------ X3: pintu murid */

test('X3 — KelasKu menautkan misi belajar adaptif', () => {
  assert.ok(/href="\.\/misi\.html"/.test(HUB),
    'features/class-hub/fiezel-class-hub.js tidak lagi menautkan misi.html — mesin misi adaptif kembali tanpa pintu untuk murid.');
  assert.ok(/data-testid="class-adaptive-mission-door"/.test(HUB), 'pintu misi adaptif kehilangan data-testid-nya');
});

test('X3 — syaratnya alamat backend, BUKAN kurikulumTersedia()', () => {
  const i = HUB.indexOf('function misiAdaptifSiap');
  assert.ok(i > 0, 'misiAdaptifSiap tidak ditemukan');
  assert.ok(/misiAdaptifSiap\(\)\s*\{\s*return konsolKurikulumSiap\(\);/.test(HUB.slice(i, i + 160)),
    'misiAdaptifSiap harus bersandar pada alamat backend. kurikulumTersedia() juga benar saat hanya modul lokal yang ada, ' +
    'dan misi.html tanpa backend adalah pintu ke ruangan kosong.');
  assert.ok(/misiAdaptifSiap\(\)\s*\n?\s*\?/.test(HUB) || /\(misiAdaptifSiap\(\)/.test(HUB),
    'pintu misi adaptif tidak dijaga misiAdaptifSiap()');
});

/* ------------------------------------------------------- K10: peta skill punya pintu */

test('K10 — tab "Progres" ada di bilah tab murid', () => {
  assert.ok(/\['progres',/.test(HUB),
    'tab progres hilang dari bilah tab — progresView() kembali menjadi kode mati.');
});

test('K10 — progresView benar-benar terpanggil oleh tab itu', () => {
  assert.ok(/u\.tab === 'progres' \? progresView\(\)/.test(HUB),
    'tab progres tidak lagi menunjuk progresView()');
});

/* ------------------------------------------- G1: konsol tidak menghapus ketikan guru */

test('G1 — render() memotret lalu memulihkan isian guru', () => {
  const i = KONSOL.indexOf('function render()');
  assert.ok(i > 0, 'render() tidak ditemukan');
  const fn = KONSOL.slice(i, KONSOL.indexOf('function view()'));
  assert.ok(/potretIsian\(\)/.test(fn), 'render() tidak lagi memotret isian sebelum mengecat ulang');
  assert.ok(/pulihkanIsian\(potret\)/.test(fn), 'render() tidak lagi memulihkan isian sesudah mengecat ulang');
});

test('G1 — isian berkas TIDAK ikut dipulihkan', () => {
  const i = KONSOL.indexOf('function potretIsian');
  const fn = KONSOL.slice(i, KONSOL.indexOf('function pulihkanIsian'));
  assert.ok(/type === 'file'/.test(fn),
    "input[type=file] harus dilewati: nilainya tidak bisa - dan tidak boleh - disetel dari JavaScript.");
});

test('G1 — kotak tempel & simpul kurikulum punya id yang bisa dipotret', () => {
  /* Potretnya mencari elemen ber-id. Isian termahal di konsol ini wajib punya id, kalau
     tidak perbaikan G1 diam-diam melewatinya justru pada kotak yang paling menyakitkan
     untuk hilang. */
  ['pasteText', 'ndName', 'mqStem', 'roster'].forEach((id) => {
    assert.ok(new RegExp('id="' + id + '"').test(KONSOL), 'isian ' + id + ' kehilangan id-nya');
  });
});

/* ------------------------------------------------------------------------------ jalan */

let pass = 0;
const gagal = [];
tests.forEach(([n, fn]) => {
  try { fn(); pass++; console.log('  ok   ' + n); }
  catch (e) { gagal.push(n); console.log('  FAIL ' + n + ' — ' + e.message); }
});
console.log('\nFIEZEL pintu kurikulum: ' + (gagal.length ? 'FAIL' : 'PASS') + ' (' + pass + ' pass, ' + gagal.length + ' fail)');
process.exit(gagal.length ? 1 : 0);
