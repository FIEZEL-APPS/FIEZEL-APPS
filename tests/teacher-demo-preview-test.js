'use strict';
/**
 * tests/teacher-demo-preview-test.js — GERBANG: DEMO GURU DARI LANDING PAGE BENAR-BENAR MEMBUKA PAPAN.
 *
 * Landing page memasang tombol "Buka Demo Guru" yang menunjuk ke `app/?teacher=preview`.
 * Sebelum m025-282 tombol itu tidak melakukan apa pun di produksi: `previewAllowed()`
 * menolak host `fiezel.my.id` sebagai baris pertamanya, jadi pengunjung yang datang untuk
 * MELIHAT produknya justru mendarat di perkenalan murid. Alat jual yang paling mahal —
 * tombol di halaman depan — mengantar orang ke tempat yang salah, tanpa satu pun galat.
 *
 * Berkas ini menjaga rantai itu utuh, dan menjaga ketiga batas yang membuatnya aman:
 *
 *   R1 tautan ada          — landing page (id) menunjuk ke ?teacher=preview.
 *   R2 pintu terbuka       — previewAllowed() tidak lagi menolak host produksi.
 *   R3 papan terisi        — masuk demo menyemai kelas contoh, bukan layar "buat kelas".
 *   R4 data guru aman      — pratinjau menulis ke sessionStorage berkunci sendiri;
 *                            localStorage guru tidak tersentuh.
 *   R5 tidak menaikkan peran — 'fz_teacher_mode' tidak pernah ditulis oleh jalur pratinjau,
 *                            dan guru yang benar-benar masuk tidak terseret ke demo.
 *   R6 jalan keluar        — pita demo tampil dengan tombol keluar dan tombol aktivasi.
 *   R7 naskah dwibahasa    — tiga kunci pita ada di copy id DAN th.
 *
 * Yang TIDAK diuji di sini: bahwa demo tidak menyentuh server. Itu dijaga di hulu oleh
 * `syncAvailable()` (menuntut peran akun 'teacher' sungguhan) dan gerbangnya sendiri —
 * R5 di bawah hanya membuktikan pratinjau tidak pernah mengaku sebagai peran itu.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

const shellSrc = read('features/teacher/fiezel-teacher-shell.js');
const storeSrc = read('features/teacher/fiezel-teacher-store.js');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const shellCode = strip(shellSrc);
const storeCode = strip(storeSrc);

/* ------------------------------------------------------------------ R1 · tautan --- */

test('R1 · landing page menautkan Demo Guru ke ?teacher=preview', () => {
  const html = read('website/index.html');
  assert.ok(/href="app\/\?teacher=preview"/.test(html),
    'landing page tidak lagi menunjuk ke app/?teacher=preview — tombol demo putus dari tujuannya');
  assert.ok(/Demo Guru/i.test(html), 'tombol "Demo Guru" hilang dari landing page');
});

/* ------------------------------------------------------------------- R2 · pintu --- */

test('R2 · previewAllowed TIDAK menolak host produksi', () => {
  const fn = shellCode.slice(shellCode.indexOf('function previewAllowed'));
  const body = fn.slice(0, fn.indexOf('\n  }') + 4);
  assert.ok(/searchParams\.get\('teacher'\)\s*===\s*'preview'/.test(body),
    'previewAllowed harus membaca ?teacher=preview');
  assert.ok(!/fiezel\\?\.my\\?\.id/.test(body),
    'previewAllowed masih memagari host fiezel.my.id — demo dari landing page akan mati diam-diam');
});

/* ------------------------------------------------------------------ R3 · terisi --- */

test('R3 · masuk demo menyemai kelas contoh, bukan layar "buat kelas pertamamu"', () => {
  const i = shellCode.indexOf('function mount(');
  const body = shellCode.slice(i, i + 1800);
  assert.ok(/previewOn\s*=\s*previewAllowed\(\)/.test(body), 'mount harus menentukan mode pratinjau');
  assert.ok(/previewOn\s*&&\s*!st\.classes\.length[\s\S]{0,400}seedDemo\(\)/.test(body),
    'papan demo tidak disemai — pengunjung akan melihat layar kosong, bukan produknya');
  const setPreviewIdx = body.indexOf('setPreview(');
  const loadIdx = body.indexOf('S().load()');
  assert.ok(setPreviewIdx > 0 && loadIdx > 0 && setPreviewIdx < loadIdx,
    'setPreview WAJIB sebelum load(): kalau tidak, papan demo terisi dari data guru asli');
});

/* -------------------------------------------------------------- R4 · data aman --- */

test('R4 · pratinjau memakai sessionStorage berkunci sendiri, bukan penyimpanan guru', () => {
  assert.ok(/PREVIEW_KEY\s*=\s*KEY\s*\+\s*'-preview'/.test(storeCode),
    'kunci penyimpanan pratinjau harus terpisah dari kunci guru');
  const i = storeCode.indexOf('function bin(');
  const body = storeCode.slice(i, i + 400);
  assert.ok(/previewMode[\s\S]{0,80}sessionStorage[\s\S]{0,80}PREVIEW_KEY/.test(body),
    'mode pratinjau harus mengalihkan penyimpanan ke sessionStorage berkunci pratinjau');
  for (const fn of ['function load(', 'function save(']) {
    const b = storeCode.slice(storeCode.indexOf(fn), storeCode.indexOf(fn) + 300);
    assert.ok(/bin\(\)/.test(b), fn + ' harus lewat bin() — kalau langsung localStorage, demo mengotori data guru');
  }
});

test('R4b · perilaku nyata: menulis dalam mode pratinjau tidak menyentuh localStorage', () => {
  const localBin = {}, sessionBin = {};
  const g = globalThis;
  const prev = { l: g.localStorage, s: g.sessionStorage, w: g.window };
  g.window = g;
  g.localStorage = { getItem: (k) => (k in localBin ? localBin[k] : null), setItem: (k, v) => { localBin[k] = String(v); }, removeItem: (k) => { delete localBin[k]; } };
  g.sessionStorage = { getItem: (k) => (k in sessionBin ? sessionBin[k] : null), setItem: (k, v) => { sessionBin[k] = String(v); }, removeItem: (k) => { delete sessionBin[k]; } };
  try {
    delete require.cache[require.resolve('../features/teacher/fiezel-teacher-store.js')];
    const T = require('../features/teacher/fiezel-teacher-store.js');
    localBin['fiezel-teacher-v1'] = JSON.stringify({ schema: 'fiezel-teacher-v1', classes: [{ id: 'nyata', name: 'Kelas Asli' }] });
    const asli = JSON.stringify(localBin['fiezel-teacher-v1']);

    T.setPreview(true);
    const st = T.load();
    assert.strictEqual(st.classes.length, 0, 'pratinjau membaca kelas guru asli — seharusnya mulai bersih');
    st.classes.push({ id: 'demo', name: 'Kelas Demo' });
    T.save(st);
    assert.strictEqual(JSON.stringify(localBin['fiezel-teacher-v1']), asli,
      'tulisan demo mendarat di localStorage guru — data kelas asli tercemar');
    assert.ok(sessionBin['fiezel-teacher-v1-preview'], 'tulisan demo tidak mendarat di penyimpanan pratinjau');

    T.setPreview(false);
    assert.strictEqual(T.load().classes[0].id, 'nyata', 'keluar pratinjau tidak mengembalikan data guru asli');
  } finally {
    g.localStorage = prev.l; g.sessionStorage = prev.s; g.window = prev.w;
    delete require.cache[require.resolve('../features/teacher/fiezel-teacher-store.js')];
  }
});

/* ---------------------------------------------------------- R5 · bukan kenaikan --- */

test('R5 · jalur pratinjau tidak pernah menulis fz_teacher_mode, dan guru asli tidak terseret', () => {
  const i = shellCode.indexOf('function previewAllowed');
  const body = shellCode.slice(i, i + 700);
  assert.ok(!/fz_teacher_mode/.test(body),
    'previewAllowed menyentuh fz_teacher_mode — demo akan bertahan melewati sesi sebagai peran guru');
  assert.ok(/isTeacherRole\(\)/.test(body),
    'guru yang sudah masuk harus dikecualikan dari demo, supaya papan aslinya yang tampil');
  assert.ok(/sessionStorage/.test(body) && !/localStorage/.test(body),
    'penanda pratinjau harus di sessionStorage saja');
});

/* --------------------------------------------------------------- R6 · keluarnya --- */

test('R6 · pita demo tampil dengan jalan keluar dan jalan naik ke akun guru', () => {
  assert.ok(/function demoBanner\(/.test(shellCode), 'pita demo tidak ada');
  assert.ok(/previewOn\s*\?\s*' is-demo'/.test(shellCode) || /is-demo/.test(shellCode),
    'kelas penanda demo tidak dipasang di kerangka');
  assert.ok(/demoBanner\(\)/.test(shellCode.slice(shellCode.indexOf('function render('), shellCode.indexOf('function render(') + 900)),
    'pita demo tidak dirender');
  assert.ok(/case 'demo-exit':[\s\S]{0,120}exitPreview\(\)/.test(shellCode), 'tombol keluar demo tidak menghapus penanda');
  assert.ok(/case 'demo-activate':[\s\S]{0,80}openAccount\('teacher'\)/.test(shellCode),
    'pita demo tidak menawarkan jalan naik ke akun guru sungguhan');
  const css = read('features/teacher/teacher-shell.css');
  assert.ok(/\.tg-demo-bar\{/.test(css), 'pita demo tidak punya gaya — akan tampil sebagai teks telanjang');
});

/* -------------------------------------------------------------- R7 · dua bahasa --- */

test('R7 · naskah pita demo lahir dua bahasa', () => {
  const id = read('features/i18n/copy-id-feat-d.js');
  const th = read('features/i18n/copy-th-feat-d.js');
  for (const k of ['guru.demo-pita', 'guru.demo-keluar', 'guru.demo-cta']) {
    assert.ok(id.includes("'" + k + "'"), 'kunci ' + k + ' hilang dari copy id');
    assert.ok(th.includes("'" + k + "'"), 'kunci ' + k + ' hilang dari copy th');
  }
  const thBlock = th.slice(th.indexOf("'guru.demo-pita'"), th.indexOf("'guru.demo-cta'") + 260);
  assert.ok(/[฀-๿]/.test(thBlock), 'nilai th untuk pita demo tidak ber-aksara Thai');
});

let failures = 0;
for (const [n, fn] of tests) {
  try { fn(); console.log('ok - ' + n); }
  catch (e) { failures++; console.error('FAIL - ' + n + '\n    ' + e.message); }
}
console.log('\nDemoGuruPreview: ' + (failures ? 'FAIL (' + failures + ' kegagalan)' : 'PASS'));
process.exit(failures ? 1 : 0);
