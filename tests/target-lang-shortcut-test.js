// tests/target-lang-shortcut-test.js — kursus Jepang bisa dicapai dari LAYAR DEPAN,
// satu ketuk, bukan dengan menggali Pengaturan.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Sejak m025-290 kursus Jepang benar-benar bisa dipakai, tetapi satu-satunya jalan menuju
// ke sana adalah Pengaturan -> Profil -> "Bahasa yang dipelajari". Murid yang tidak tahu
// menu itu ada tidak akan pernah menemukannya, dan fitur yang tidak ditemukan sama
// nilainya dengan fitur yang tidak ada.
//
// YANG DIJAGA
//   1. Ada pintasan di markup layar depan yang memanggil setTargetLangPreference.
//   2. Pintasannya DUA ARAH: murid yang sudah di Jepang bisa kembali ke Inggris dari
//      tempat yang sama. Pintu masuk tanpa pintu keluar adalah perangkap.
//   3. Naskahnya lewat kunci i18n dan punya kembaran Thai — bukan kalimat telanjang.
//   4. Bahasa bawaan TETAP 'en'. Pintasan tidak boleh menggeser murid yang sudah ada.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

/* Komentar dibuang lebih dulu: berkas ini pernah dua kali menuduh kode sehat karena
   membaca prosa penjelasan sebagai kode (m025-285, m025-298). */
const appMentah = baca('app.js');
const app = appMentah.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

test('ada fungsi pintasan bahasa untuk layar depan', () => {
  assert.ok(/function targetLangChipMarkup\s*\(/.test(app),
    'targetLangChipMarkup() belum ada — tidak ada pintasan yang bisa dirender');
});

test('pintasannya BENAR-BENAR dipasang di markup layar depan', () => {
  const i = app.indexOf('function todayHomeMarkup');
  assert.ok(i > 0, 'todayHomeMarkup() tidak ditemukan');
  const blok = app.slice(i, i + 12000);
  assert.ok(/targetLangChipMarkup\s*\(\s*\)/.test(blok),
    'targetLangChipMarkup() ada tetapi tidak pernah dipanggil dari layar depan — ' +
    'fungsi yang tidak dipanggil sama dengan tidak ada');
});

test('pintasannya DUA ARAH: bisa masuk ke Jepang dan kembali ke Inggris', () => {
  const i = app.indexOf('function targetLangChipMarkup');
  const blok = app.slice(i, i + 2200);
  assert.ok(/setTargetLangPreference/.test(blok), 'pintasan tidak memanggil setTargetLangPreference');
  assert.ok(/'ja'/.test(blok) && /'en'/.test(blok),
    'pintasan hanya satu arah — murid yang sudah di Jepang terperangkap di sana');
});

test('naskah pintasan lewat kunci i18n dan punya kembaran Thai', () => {
  const i = appMentah.indexOf('function targetLangChipMarkup');
  const blok = appMentah.slice(i, i + 2200);
  const kunci = [...blok.matchAll(/FiezelI18n\.t\('([a-z0-9.\-]+)'/g)].map((m) => m[1]);
  assert.ok(kunci.length >= 2, 'pintasan menulis kalimat langsung, bukan lewat kunci i18n');
  const id = baca('features/i18n/copy-id-bahasa.js');
  const th = baca('features/i18n/copy-th-bahasa.js');
  const hilang = kunci.filter((k) => !id.includes("'" + k + "'") || !th.includes("'" + k + "'"));
  assert.deepStrictEqual(hilang, [],
    'kunci tanpa pasangan id+th lengkap: ' + hilang.join(', '));
});

test('bahasa bawaan TETAP en — pintasan tidak menggeser murid yang sudah ada', () => {
  const m = app.match(/targetLang\s*:\s*'([a-z-]+)'/);
  assert.ok(m && m[1] === 'en', 'bawaan targetLang bukan en');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(baca('.github/workflows/quality.yml').indexOf('target-lang-shortcut-test.js') >= 0,
    'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('target-lang-shortcut-test GAGAL: ' + failures.length + ' assert merah');
  console.log('target-lang-shortcut-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('target-lang-shortcut-test: ' + pass + '/' + total + ' assert PASS');
