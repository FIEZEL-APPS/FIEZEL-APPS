'use strict';
/**
 * tests/kurikulum-wali-papan-test.js — F8+F10: WALI KELAS & PAPAN KELAS
 * (audit UI/UX KelasKu & Kurikulum 2026-09-20 §F8, §F10).
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * Matriks cakupan hari ini satu mapel per layar (F8), dan ia menjawab "TP mana
 * yang lemah" tetapi tidak menjawab "siapa yang tertinggal di TP mana" (F10).
 * Keduanya dibangun dari endpoint yang SUDAH ADA — /coverage per subject_id dan
 * /braincore/tp-detail — tanpa endpoint baru, tanpa kolom baru di basis data.
 *
 * Janji yang dijaga gerbang ini:
 *  F8  tab Wali Kelas: satu halaman 17+ mapel × status, dari /coverage per
 *      subject_id, antrean berbatas dengan kemajuan jujur, mapel tertinggal
 *      ditunjuk eksplisit, gagal-muat dan tanpa-data dibedakan.
 *  F10 tab Papan Kelas: TP di sumbu tegak × murid di sumbu datar, sel berupa
 *      tombol ber-aria-label (bukan warna saja), klik sel membuka drawer
 *      intervensi yang sudah ada, TP dibatasi 40 dengan penanda jujur.
 *  Keduanya: naskah lewat t() dwibahasa; resetCaches membuang kedua cache.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

const KONSOL = baca('features/curriculum/teacher-console.js');
const ID_KUR = baca('features/i18n/copy-id-kurikulum.js');
const TH_KUR = baca('features/i18n/copy-th-kurikulum.js');

/* ------------------------------------------------- F8: tab Wali Kelas */

test('F8 — tab Wali Kelas terdaftar di navigasi dan peta view', () => {
  assert.ok(/\['wali', t\('kurikulum\.nav-wali'/.test(KONSOL), 'NAV kehilangan entri wali.');
  assert.ok(/wali: vWali/.test(KONSOL), 'peta view() kehilangan wali: vWali — tab tanpa layar.');
});

test('F8 — daftar mapel mencakup pilihan nyata, bukan entri meta', () => {
  assert.ok(/function mapelWali\(\)/.test(KONSOL), 'mapelWali hilang.');
  assert.ok(/SUBJECT_CHOICES\.filter\(function \(c\) \{ return c\[0\] !== 'ALL'; \}\)/.test(KONSOL),
    'entri meta ALL ikut dihitung — wali kelas menerima kartu "Semua Mata Pelajaran" yang bukan mapel.');
});

test('F8 — muatan dibatasi 4 jalur dengan kemajuan jujur, bukan tembakan massal', () => {
  assert.ok(/lariBatch\(daftar, 4, function/.test(KONSOL), 'wali tidak memakai antrean berbatas 4.');
  assert.ok(/jalan--; selesaiHitung\+\+/.test(KONSOL), 'penghitung batch tidak pernah selesai — antrean macet setelah gelombang pertama.');
  assert.ok(/data-testid="wali-progress"/.test(KONSOL), 'kemajuan muat wali tidak terlihat di layar.');
  assert.ok(/kurikulum\.wali-loading/.test(KONSOL), 'teks kemajuan muat wali hilang.');
});

test('F8 — gagal-muat dibedakan dari tanpa-data; yang tertinggal ditunjuk', () => {
  assert.ok(/data-testid="wali-tertinggal"/.test(KONSOL), 'spanduk mapel tertinggal hilang — wali tetap harus menebak.');
  assert.ok(/kurikulum\.wali-gagal/.test(KONSOL) && /kurikulum\.wali-tanpa-data/.test(KONSOL),
    'gagal-muat dan tanpa-data tidak dibedakan — dua keadaan yang tindakannya berlawanan.');
  assert.ok(/data-testid="wali-card-'/.test(KONSOL), 'kartu per mapel kehilangan testid.');
});

/* ------------------------------------------------- F10: Papan Kelas */

test('F10 — tab Papan Kelas terdaftar di navigasi dan peta view', () => {
  assert.ok(/\['papan', t\('kurikulum\.nav-papan'/.test(KONSOL), 'NAV kehilangan entri papan.');
  assert.ok(/papan: vPapan/.test(KONSOL), 'peta view() kehilangan papan: vPapan — tab tanpa layar.');
});

test('F10 — sel adalah tombol ber-aria-label, bukan warna saja', () => {
  assert.ok(/<button class="pill ' \+ hs\[1\] \+ '"/.test(KONSOL), 'sel papan bukan tombol — papan ketik tidak bisa masuk ke grid.');
  assert.ok(/aria-label="' \+ esc\(label\)/.test(KONSOL), 'sel papan tanpa aria-label — pembaca layar hanya mendengar huruf.');
  assert.ok(/data-testid="papan-legend"/.test(KONSOL), 'legenda huruf→kata hilang — M/B/R/E/· tidak berarti apa-apa.');
  assert.ok(/data-a="tp-detail" data-tp="' \+ esc\(baris\.id\)/.test(KONSOL),
    'klik sel tidak membuka drawer intervensi — papan menjadi pajangan.');
});

test('F10 — TP dibatasi 40 dengan penanda jujur; grid bisa digulir', () => {
  assert.ok(/PAPAN_MAKS_TP = 40/.test(KONSOL), 'batas TP hilang — papan bisa melebar tanpa ujung.');
  assert.ok(/data-testid="papan-cap"/.test(KONSOL) && /kurikulum\.papan-cap-note/.test(KONSOL),
    'penanda batas TP hilang — guru mengira 40 TP adalah seluruh kurikulum.');
  assert.ok(/data-testid="papan-grid"><div class="tbl-scroll"><table>/.test(KONSOL),
    'grid papan tidak memakai pembungkus gulir G2 — hancur di ponsel seperti matriks dulu.');
});

test('F10 — data dari endpoint yang ada; roster & TP kosong berkata jujur', () => {
  assert.ok(/api\('\/braincore\/tp-detail\?class_id=' \+ S\.cls\.id \+ '&tp_id='/.test(KONSOL),
    'papan tidak membaca tp-detail per TP.');
  assert.ok(/api\('\/classes\/' \+ S\.cls\.id\)/.test(KONSOL), 'papan tidak membaca roster kelas.');
  assert.ok(/kurikulum\.papan-tanpa-murid/.test(KONSOL) && /kurikulum\.papan-tanpa-tp/.test(KONSOL),
    'keadaan kosong papan tidak ditangani — layar menggambar sumbu dari udara.');
  assert.ok(!/\/api\/papan|\/wali-kelas|\/coverage-summary/.test(KONSOL),
    'papan/wali memanggil endpoint yang tidak ada — pintunya digantung pada backend yang belum siap.');
});

/* ------------------------------------------------- bersama: cache + bahasa */

test('F8+F10 — resetCaches membuang kedua cache tampilan', () => {
  assert.ok(/S\.wali = null; S\.papan = null;/.test(KONSOL),
    'resetCaches tidak membuang wali/papan — ganti kelas menampilkan papan kelas lama.');
});

test('F8+F10 — seluruh naskah baru lahir dwibahasa (id+th)', () => {
  ['kurikulum.nav-wali', 'kurikulum.nav-papan', 'kurikulum.wali-title', 'kurikulum.wali-sub',
    'kurikulum.wali-loading', 'kurikulum.wali-tp', 'kurikulum.wali-rata', 'kurikulum.wali-terlemah',
    'kurikulum.wali-tanpa-data', 'kurikulum.wali-gagal', 'kurikulum.wali-tertinggal',
    'kurikulum.papan-title', 'kurikulum.papan-sub', 'kurikulum.papan-loading', 'kurikulum.papan-legend',
    'kurikulum.papan-sel-remedial', 'kurikulum.papan-sel-pengayaan', 'kurikulum.papan-sel-belum',
    'kurikulum.papan-cap-note', 'kurikulum.papan-tanpa-murid', 'kurikulum.papan-tanpa-tp'].forEach((k) => {
    assert.ok(ID_KUR.includes("'" + k + "'"), 'copy-id-kurikulum kehilangan ' + k + '.');
    assert.ok(TH_KUR.includes("'" + k + "'"), 'copy-th-kurikulum kehilangan ' + k + ' — paritas id/th robek.');
  });
});

/* ------------------------------------------------------------------------------ jalan */

let pass = 0;
const gagal = [];
tests.forEach(([n, fn]) => {
  try { fn(); pass++; console.log('  ok   ' + n); }
  catch (e) { gagal.push(n); console.log('  FAIL ' + n + ' — ' + e.message); }
});
console.log('\nFIEZEL wali & papan kelas: ' + (gagal.length ? 'FAIL' : 'PASS') + ' (' + pass + ' pass, ' + gagal.length + ' fail)');
process.exit(gagal.length ? 1 : 0);
