'use strict';
/**
 * tests/kurikulum-jangkauan-test.js — GELOMBANG 5: JANGKAUAN
 * (m025-351; temuan A1–A5, G2–G4, G6–G10, K12).
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * Audit 20 September 2026 membagi pekerjaan KelasKu–Kurikulum menjadi lima gelombang.
 * Empat gelombang pertama sudah terkunci di gerbangnya sendiri (paspor kompetensi,
 * paspor sebagai alat, pintu kurikulum, satu buku kompetensi). Gelombang 5 — jangkauan —
 * belum punya gerbangnya, jadi semua perbaikannya bisa diam-diam terurai lagi tanpa ada
 * yang memprotes.
 *
 * Isi gerbang ini satu-satu, jujur, dan berpola "penanda eksplisit":
 *   A1  tiap kata kosakata zona kurikulum masuk ID_WORDS penjaga th-ui-leak, dan
 *       konsol KelasKu (zona murid) tidak lagi memuat kata itu sebagai literal telanjang.
 *   A2  fmtDate mengikuti locale aktif (th-TH / id-ID).
 *   A3  naskah tenggat & status lewat t() dengan pasangan id+th.
 *   A4  label fase lewat phaseLabelOf(u); tidak ada lagi literal 'Fase D (SMP)' telanjang.
 *   A5  tablist murid DAN guru pakai role/aria-selected/aria-controls/tabindex + tabpanel.
 *   K12 layar kurikulum adalah lapisan FiezelBackNav, bukan modal kertas; Close campus
 *       dipasang dan dismiss dipanggil.
 *   G2  matriks cakupan digulir di dalam pembungkus .tbl-scroll, bukan dihancurkan.
 *   G3  drawer/modal: Escape menutup, fokus dikurung, scrim adalah tombol keyboard.
 *   G4  console.css punya blok prefers-reduced-motion sendiri (halaman tak memuat style.css).
 *   G6  judul asesmen bawaan mengikuti mapel aktif — 'Formatif Bilangan' sudah pensiun.
 *   G7  JSON mentah tidak lagi dicetak ke layar guru (blueprint availability, sinyal butir).
 *   G8  blueprint dan form soal sama-sama C1–C6, dan blueprintBody mengirim C5/C6.
 *   G9  batas 60 soal bank diberi penanda, tidak lagi berpura-pura jadi jumlah seluruh bank.
 *   G10 ruang guru memakai penanda asal data saat jatuh ke katalog cadangan lokal.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

const GAP = baca('tests/th-ui-leak-test.js');
const HUB = baca('features/class-hub/fiezel-class-hub.js');
const KONSOL = baca('features/curriculum/teacher-console.js');
const CSS = baca('features/curriculum/console.css');
const SHELL = baca('features/teacher/fiezel-teacher-shell.js');
const SHELL_CSS = baca('features/teacher/teacher-shell.css');
const ID_KUR = baca('features/i18n/copy-id-kurikulum.js');
const TH_KUR = baca('features/i18n/copy-th-kurikulum.js');
const ID_D = baca('features/i18n/copy-id-feat-d.js');
const TH_D = baca('features/i18n/copy-th-feat-d.js');
const ID_WORDS_SRC = GAP.slice(GAP.indexOf('const ID_WORDS'), GAP.indexOf('\n\n/* Buang komentar'));

/* -------------------------------------------------- A1: kosakata zona kurikulum diawasi */

test('A1 — 13 kata audit zona kurikulum masuk ID_WORDS penjaga th-leak', () => {
  ['Menunggu', 'Tenggat', 'Mapel', 'Fase', 'Kurikulum', 'Merdeka', 'Tuntas', 'Misi',
    'Paspor', 'Kompetensi', 'Lengkap', 'Terdaftar', 'Penugasan'].forEach((kata) => {
    assert.ok(new RegExp('\\b' + kata + '\\b').test(ID_WORDS_SRC),
      'ID_WORDS tidak memuat ' + kata + ' — titik buta konsol KelasKu kembali terbuka.');
  });
});

/* m025-364: 6 -> 5. Literal 'Latihan · ' di kartu tugas murid hilang bersama assignCard; baris
   tugas ringkas siklus Kerjakan/Terlewat/Selesai lewat t() seluruhnya. Alasannya juga tertulis
   di ALLOWLIST tests/th-ui-leak-test.js. */
test('A1 — anggaran class-hub pas 5: zona murid sudah dwibahasa, sisanya tercatat zona guru', () => {
  assert.ok(/'features\/class-hub\/fiezel-class-hub\.js': 5,/.test(GAP),
    'anggaran class-hub di ALLOWLIST tidak lagi pas 5 — perbaiki dengan alasan tertulis, jangan diam.');
});

/* ---------------------------------------------------------- A2: tanggal mengikuti locale */

test('A2 — fmtDate memakai locale aktif FiezelI18n (th-TH vs id-ID)', () => {
  assert.ok(/I\.getLocale\(\) === 'th' \? 'th-TH' : 'id-ID'/.test(HUB),
    'fmtDate tidak lagi menanya locale — kembali memaksa id-ID untuk murid Thai.');
});

/* ------------------------------------------------- naskah tenggat & status via t() (A3) */

test('A3 — naskah tenggat & status lewat t() dengan pasangan id+th', () => {
  ['kelas.status-terlambat', 'kelas.tanpa-tenggat', 'kelas.lewat-n-hari',
    'kelas.tenggat-hari-ini', 'kelas.tenggat-besok', 'kelas.tenggat-n-hari'].forEach((k) => {
    assert.ok(HUB.includes(k), 'class-hub tidak lagi memakai ' + k);
    assert.ok(ID_D.includes("'" + k + "'"), 'copy-id-feat-d kehilangan ' + k);
    assert.ok(TH_D.includes("'" + k + "'"), 'copy-th-feat-d kehilangan ' + k + ' — paritas id/th robek.');
  });
});

/* ------------------------------------------------------------------ label fase (A4) */

test('A4 — phaseLabelOf(u) dipakai di dua titik; literal fase telanjang sudah pensiun', () => {
  assert.ok(/function phaseLabelOf\(u\)/.test(HUB), 'phaseLabelOf hilang.');
  const pakai = (HUB.match(/phaseLabelOf\(u\)/g) || []).length;
  assert.ok(pakai >= 2, 'phaseLabelOf(u) hanya dipakai ' + pakai + ' kali (harus 2: kartu murid dan progres).');
  const telanjang = (HUB.match(/['"]Fase D \(SMP\)['"]/g) || []).length;
  assert.ok(telanjang === 1,
    'literal Fase D (SMP) telanjang muncul ' + telanjang + ' kali — hanya boleh yang di dalam t() fallback.');
  assert.ok(/t\('kelas\.fase-d', 'Fase D \(SMP\)'\)/.test(HUB), 'fallback fase-d tidak lagi lewat t().');
});

/* ------------------------------------------------------ aria tablist murid & guru (A5) */

test('A5 — tablist murid & guru dapat dibaca pembaca layar (role, aria-selected, tabpanel)', () => {
  assert.ok((HUB.match(/role="tablist"/g) || []).length >= 2,
    'harus ada dua tablist (murid ch-tab, guru chg-tab).');
  assert.ok((HUB.match(/role="tabpanel"/g) || []).length >= 2,
    'harus ada dua tabpanel (murid ch-panel, guru chg-panel).');
  assert.ok((HUB.match(/aria-selected="' \+ \(active/g) || []).length >= 2,
    'aria-selected tidak terpasang di kedua tablist.');
  assert.ok(/id="ch-tab-'/.test(HUB) && /aria-controls="ch-panel-'/.test(HUB),
    'tab murid tidak menautkan aria-controls ke panelnya (ch-panel-*).');
  assert.ok(/id="chg-tab-'/.test(HUB) && /aria-controls="chg-panel-'/.test(HUB),
    'tab guru tidak menautkan aria-controls ke panelnya (chg-panel-*).');
  assert.ok(/tabindex="' \+ \(active \? '0' : '-1'\)/.test(HUB),
    'roving tabindex hilang — tab yang tidak aktif menerima fokus Tab lagi.');
});

/* ------------------------------------------- K12: layar kurikulum adalah lapisan BackNav */

test('K12 — layar kurikulum terdaftar sebagai lapisan FiezelBackNav dengan pemulih', () => {
  assert.ok(/CURRICULUM_LAYER = 'kelasku-curriculum'/.test(HUB), 'CURRICULUM_LAYER hilang.');
  assert.ok(/function openCurriculumLayer\(/.test(HUB), 'pembuka lapisan kurikulum hilang.');
  assert.ok(/function closeCurriculumLayer\(/.test(HUB), 'penutup lapisan kurikulum hilang.');
  assert.ok(/nav\.pushLayer\(\{ id: CURRICULUM_LAYER, close: closeCurriculumLayer \}\)/.test(HUB),
    'lapisan tidak didaftarkan ke pushLayer beserta close-nya — Back perangkat tidak tahu harus ke mana.');
  assert.ok(/nav\.dismiss\(CURRICULUM_LAYER\)/.test(HUB),
    'tutup terprogram tidak memanggil dismiss — lapisan mengendap di tumpukan riwayat.');
  assert.ok(/case 'open-curriculum':/.test(HUB) && /case 'close-curriculum':/.test(HUB),
    'aksi open/close-curriculum tidak lagi ditangani.');
});

/* ----------------------------------------------------------- G2: matriks tidak hancur */

test('G2 — matriks cakupan digulir di dalam .tbl-scroll, CSS membungkusnya', () => {
  assert.ok(/<div class="tbl-scroll"><table>/.test(KONSOL), 'tabel coverage kehilangan pembungkus gulir.');
  assert.ok(/\.tbl-scroll \{/.test(CSS), 'console.css kehilangan .tbl-scroll.');
  assert.ok(/\.tbl-scroll table \{ min-width: 680px; \}/.test(CSS),
    'tabel dalam pembungkus kehilangan lebar minimum — enam kolomnya bebas remuk di ponsel.');
});

/* ------------------------------------------------------------ G3: keyboard untuk overlay */

test('G3 — Escape menutup drawer/modal, fokus dikurung, scrim adalah tombol', () => {
  assert.ok(/addEventListener\('keydown'/.test(KONSOL), 'tidak ada pendengar keydown di konsol.');
  assert.ok(/ev\.key === 'Escape' && \(S\.drawer \|\| S\.modal\)/.test(KONSOL),
    'Escape tidak lagi menutup overlay.');
  assert.ok(/ev\.key === 'Tab' && \(S\.drawer \|\| S\.modal\)/.test(KONSOL),
    'tidak ada focus trap di dalam drawer/modal.');
  assert.ok(/function focusOverlay\(\)/.test(KONSOL), 'pemindah fokus ke dalam overlay hilang.');
  assert.ok(/function tutupOverlay\(\)/.test(KONSOL), 'penutup overlay + pemulih fokus hilang.');
  assert.ok(/<button type="button" class="scrim" data-a="close"/.test(KONSOL),
    'scrim bukan lagi tombol — papan ketik tidak bisa menutupnya.');
  assert.ok(/\.scrim:focus-visible/.test(CSS), 'skrim tombol kehilangan penanda fokus.');
});

/* ------------------------------------------------------------- G4: kurangi-gerak di konsol */

test('G4 — console.css punya blok prefers-reduced-motion sendiri', () => {
  assert.ok(/@media \(prefers-reduced-motion: reduce\)/.test(CSS),
    'console.css tidak memuat blok kurangi-gerak — halaman ini tidak memuat style.css sehingga tidak ada penutup lain.');
  assert.ok(/animation-duration: \.01ms !important/.test(CSS),
    'blok kurangi-gerak tidak benar-benar mematikan animasi (rise/slide/pop/fade).');
});

/* ------------------------------------------------------------- G6: judul asesmen per mapel */

test('G6 — judul asesmen bawaan mengikuti mapel aktif; "Formatif Bilangan" pensiun', () => {
  assert.ok(/function defaultAssessTitle\(\)/.test(KONSOL), 'defaultAssessTitle hilang.');
  assert.ok(/subjName\(activeSubj\(\)\)/.test(KONSOL.slice(KONSOL.indexOf('function defaultAssessTitle'), KONSOL.indexOf('function fmtAvailability'))),
    'defaultAssessTitle tidak lagi membaca mapel aktif.');
  assert.ok(/<input id="bpTitle" value="' \+ esc\(defaultAssessTitle\(\)\)/.test(KONSOL),
    'bpTitle tidak lagi memakai defaultAssessTitle().');
  assert.ok(!/Formatif Bilangan/.test(KONSOL),
    'literal "Formatif Bilangan" masih ada di konsol — judul kaku yang ditolak audit G6 belum hilang.');
  assert.ok(ID_KUR.includes("'kurikulum.bp-default-title': 'Formatif {mapel}'"),
    'copy-id-kurikulum tidak memuat pola {mapel} untuk judul bawaan.');
  assert.ok(TH_KUR.includes("'kurikulum.bp-default-title': 'แบบทดสอบระหว่างเรียน {mapel}'"),
    'copy-th-kurikulum tidak memuat padanan Thai pola {mapel} untuk judul bawaan.');
});

/* ----------------------------------------------------------------- G7: JSON mentah pensiun */

test('G7 — JSON mentah tidak lagi dicetak ke layar guru', () => {
  assert.ok(/function fmtAvailability\(/.test(KONSOL), 'fmtAvailability hilang.');
  assert.ok(/function fmtConfidence\(/.test(KONSOL), 'fmtConfidence hilang.');
  assert.ok(!/JSON\.stringify\(S\.blueprintCheck\.availability\)/.test(KONSOL),
    'JSON.stringify(blueprintCheck.availability) masih dicetak — audit G7 menolak dump mentah.');
  assert.ok(!/JSON\.stringify\(an\.confidence_signals\)/.test(KONSOL),
    'JSON.stringify(confidence_signals) masih dicetak — audit G7 menolak dump mentah.');
});

/* ---------------------------------------------- G8: blueprint & form sama-sama C1–C6 */

test('G8 — blueprint dan form soal sama-sama C1–C6, blueprintBody mengirim C5/C6', () => {
  assert.ok(/\[\s*'C5', t\('kurikulum\.cog-c5-label'/.test(KONSOL),
    'distribusi blueprint kehilangan C5.');
  assert.ok(/\[\s*'C6', t\('kurikulum\.cog-c6-label'/.test(KONSOL),
    'distribusi blueprint kehilangan C6.');
  assert.ok(/C1: \+val\('cogC1'\).*C2: \+val\('cogC2'\).*C3: \+val\('cogC3'\).*C4: \+val\('cogC4'\).*C5: \+val\('cogC5'\).*C6: \+val\('cogC6'\)/s.test(KONSOL),
    'blueprintBody tidak lagi mengirim distribusi C5/C6 — guru menentukan, form manual C1–C6, blueprint C1–C4.');
  assert.ok(ID_KUR.includes("'kurikulum.cog-c5-label'") && ID_KUR.includes("'kurikulum.cog-c6-label'"),
    'label C5/C6 belum lahir di copy-id-kurikulum.');
  assert.ok(TH_KUR.includes("'kurikulum.cog-c5-label'") && TH_KUR.includes("'kurikulum.cog-c6-label'"),
    'label C5/C6 belum lahir dwibahasa di copy-th-kurikulum.');
});

/* --------------------------------------------------------- G9: batas 60 diberi penanda */

test('G9 — batas 60 bank diberi penanda, tidak berpura-pura jadi seluruh bank', () => {
  assert.ok(/S\.questions\.length === 60/.test(KONSOL),
    'penanda batas 60 hilang — angka 60 kembali dibaca guru sebagai jumlah seluruh bank.');
  assert.ok(/kurikulum\.bank-capped-note/.test(KONSOL), 'label penanda batas tidak lagi dipakai.');
  assert.ok(ID_KUR.includes("'kurikulum.bank-capped-note'") && TH_KUR.includes("'kurikulum.bank-capped-note'"),
    'penanda batas belum lahir dwibahasa di copy kurikulum.');
});

/* ----------------------------------------------- G10: asal data pohon kurikulum ditandai */

test('G10 — jatuh ke katalog cadangan lokal selalu diberi penanda asal data', () => {
  assert.ok(/var sumberLokal = false;/.test(SHELL), 'penanda sumber lokal hilang.');
  assert.ok(/sumberLokal = true;/.test(SHELL),
    'fallback katalog lokal tidak lagi menandai dirinya sebagai cadangan perangkat.');
  assert.ok(/guru\.kurikulum-sumber-lokal/.test(SHELL), 'penanda sumber cadangan tidak dipakai di shell.');
  assert.ok(/guru\.kurikulum-sumber-server/.test(SHELL), 'penanda sumber server tidak dipakai di shell.');
  assert.ok(/\.tg-curriculum-source\.is-local/.test(SHELL_CSS),
    'gaya penanda sumber cadangan hilang dari teacher-shell.css.');
  assert.ok(ID_D.includes("'guru.kurikulum-sumber-lokal'") && TH_D.includes("'guru.kurikulum-sumber-lokal'"),
    'penanda sumber cadangan belum lahir dwibahasa (id+th).');
  assert.ok(ID_D.includes("'guru.kurikulum-sumber-server'") && TH_D.includes("'guru.kurikulum-sumber-server'"),
    'penanda sumber server belum lahir dwibahasa (id+th).');
});

/* ------------------------------------------------------------------------------ jalan */

let pass = 0;
const gagal = [];
tests.forEach(([n, fn]) => {
  try { fn(); pass++; console.log('  ok   ' + n); }
  catch (e) { gagal.push(n); console.log('  FAIL ' + n + ' — ' + e.message); }
});
console.log('\nFIEZEL jangkauan kurikulum: ' + (gagal.length ? 'FAIL' : 'PASS') + ' (' + pass + ' pass, ' + gagal.length + ' fail)');
process.exit(gagal.length ? 1 : 0);