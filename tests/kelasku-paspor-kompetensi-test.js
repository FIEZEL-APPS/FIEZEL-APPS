'use strict';
/**
 * tests/kelasku-paspor-kompetensi-test.js — PASPOR KOMPETENSI TIDAK BOLEH BOCOR DAN
 * TIDAK BOLEH LUPA (m025-349).
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * Audit 20 September 2026 (reports/AUDIT-UIUX-KELASKU-KURIKULUM-KOMPETENSI-2026-09-20.md,
 * temuan K1 dan K2) menemukan dua cacat di satu-satunya dokumen yang isinya adalah KLAIM
 * tentang apa yang dikuasai murid:
 *
 *   K1 — BOCOR. Penguasaan dicocokkan lewat `u.genre`, dan genre BUKAN kunci unik. Tiga
 *        genre dipakai dua unit sekaligus, dua di antaranya MELINTASI TINGKAT KELAS:
 *        "Procedure Text" (Kelas 7 dan Kelas 9) dan "Narrative Text" (Kelas 8 dan Kelas
 *        10). Menuntaskan yang satu mencap yang lain "Tuntas" — termasuk bab dua tingkat
 *        di atasnya yang belum pernah dibuka murid.
 *
 *   K2 — LUPA. Stempel dihitung ulang dari daftar kiriman yang dipotong `slice(-30)`,
 *        jadi kiriman ke-31 mendorong keluar stempel bab pertama tanpa pemberitahuan.
 *        Murid yang paling rajin kehilangan buktinya paling cepat.
 *
 * Keduanya diperbaiki dengan memindahkan bukti ke buku sendiri (`fiezel-class-passport-v1`)
 * yang dikunci pada ID UNIT dan tidak pernah dipotong. Gerbang ini mengikat keduanya.
 *
 * Ia menguji FUNGSINYA, bukan hanya naskahnya. Klaim "stempel tidak bocor" adalah klaim
 * tentang perilaku, dan perilaku tidak bisa dibuktikan dengan grep — modul dimuat ke dalam
 * window tiruan berikut localStorage tiruan, lalu dijalankan sungguhan.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

/* Jendela tiruan seminimal mungkin: modul ini hanya menyentuh localStorage saat diuji di
   sini (render menuntut DOM, dan tidak ada render yang dipanggil gerbang ini). */
function muatClassHub() {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
  const win = { localStorage };
  win.window = win;
  win.self = win;
  win.document = undefined;
  const ctx = vm.createContext(win);
  vm.runInContext(baca('features/class-hub/fiezel-class-hub.js'), ctx, { filename: 'fiezel-class-hub.js' });
  return { hub: win.FiezelClassHub, store, localStorage };
}

/* ---------------------------------------------------------------- bahaya yang ditutup */

test('bahayanya nyata: genre dipakai bersama LINTAS TINGKAT KELAS di bank kurikulum', () => {
  const FC = require('../features/teacher/fiezel-teacher-curriculum.js');
  const perGenre = new Map();
  FC.allUnits().forEach((u) => {
    if (!perGenre.has(u.genre)) perGenre.set(u.genre, []);
    perGenre.get(u.genre).push(u);
  });
  const lintasKelas = [...perGenre.entries()].filter(([, list]) => new Set(list.map((u) => u.grade)).size > 1);
  assert.ok(
    lintasKelas.length >= 2,
    'Gerbang ini menjaga sesuatu yang harus tetap berbahaya. Kalau tidak ada lagi genre yang ' +
    'dipakai dua tingkat kelas berbeda, K1 sudah tidak bisa terjadi dan gerbang ini boleh dicabut — ' +
    'jangan dilonggarkan diam-diam.'
  );
});

/* --------------------------------------------------------------------------- K1: bocor */

test('K1 — unitMastery TIDAK BOLEH mencocokkan lewat genre', () => {
  const src = baca('features/class-hub/fiezel-class-hub.js');
  const fn = src.slice(src.indexOf('function unitMastery'), src.indexOf('function unitMastery') + 400);
  assert.ok(!/u\.genre/.test(fn), 'unitMastery kembali membaca u.genre — stempel akan bocor lintas kelas lagi.');
  assert.ok(/passportOf\(u\.id\)/.test(fn), 'unitMastery harus dikunci pada ID unit lewat passportOf(u.id).');
});

test('K1 — menuntaskan satu unit TIDAK mencap unit lain bergenre sama', () => {
  const { hub } = muatClassHub();
  hub._passport.record('d_g7_procedure_culinary', 8, 8, Date.now());
  assert.ok(hub._passport.of('d_g7_procedure_culinary'), 'unit yang dikerjakan harus punya stempel');
  assert.strictEqual(
    hub._passport.of('d_g9_procedure_manual'), null,
    'Procedure Kelas 9 ikut tercap padahal yang dikerjakan Procedure Kelas 7 — K1 kembali.'
  );
  assert.strictEqual(
    hub._passport.of('e_g10_narrative_legend'), null,
    'Narrative Kelas 10 ikut tercap — K1 kembali.'
  );
});

/* --------------------------------------------------------------------------- K2: lupa  */

test('K2 — stempel bertahan melewati 30 kiriman', () => {
  const { hub } = muatClassHub();
  hub._passport.record('d_g7_descriptive_me', 9, 9, Date.now());
  for (let i = 0; i < 40; i++) hub._passport.record('unit_pengisi_' + i, 5, 8, Date.now());
  const m = hub._passport.of('d_g7_descriptive_me');
  assert.ok(m, 'stempel bab pertama hilang setelah 40 kiriman berikutnya — K2 kembali.');
  assert.strictEqual(m.c, 9);
  assert.strictEqual(m.t, 9);
});

test('K2 — buku paspor punya kuncinya sendiri, terpisah dari riwayat kiriman', () => {
  const { hub } = muatClassHub();
  assert.strictEqual(hub.PASS_KEY, 'fiezel-class-passport-v1');
  assert.notStrictEqual(hub.PASS_KEY, hub.SUB_KEY, 'bukti dan riwayat tidak boleh berbagi satu kunci yang dipotong');
});

test('K2 — buku paspor tidak pernah dipotong di penulisnya', () => {
  const src = baca('features/class-hub/fiezel-class-hub.js');
  const fn = src.slice(src.indexOf('function passportRecord'), src.indexOf('function passportOf'));
  assert.ok(!/slice\(-\d+\)/.test(fn), 'passportRecord memotong isinya — itu persis cacat K2.');
});

/* ------------------------------------------------- K4: mengulang tidak boleh merugikan */

test('K4 — "Ulangi Misi" dengan nilai lebih buruk TIDAK menurunkan stempel', () => {
  const { hub } = muatClassHub();
  hub._passport.record('d_g8_recount_independence', 8, 8, 1000);
  hub._passport.record('d_g8_recount_independence', 3, 8, 2000);
  const m = hub._passport.of('d_g8_recount_independence');
  assert.strictEqual(m.c, 8, 'stempel memakai percobaan TERBAIK, bukan yang terakhir');
  assert.strictEqual(Math.round(m.acc * 100), 100);
  assert.strictEqual(m.lastC, 3, 'percobaan terakhir tetap dicatat supaya layar bisa jujur');
  assert.strictEqual(m.n, 2, 'jumlah percobaan dihitung');
});

test('K4 — percobaan yang lebih baik menggantikan yang terbaik', () => {
  const { hub } = muatClassHub();
  hub._passport.record('d_g9_report_fauna', 4, 8, 1000);
  hub._passport.record('d_g9_report_fauna', 7, 8, 2000);
  const m = hub._passport.of('d_g9_report_fauna');
  assert.strictEqual(m.c, 7);
  assert.strictEqual(m.lastC, 7);
});

/* ------------------------------------------------------------------------- migrasi lama */

test('migrasi — stempel lama di riwayat kiriman ikut terbawa, tugas guru TIDAK', () => {
  const { hub, localStorage } = muatClassHub();
  localStorage.setItem(hub.SUB_KEY, JSON.stringify([
    { id: 'misi_d_g7_descriptive_me', c: 8, t: 9, at: 111 },
    { id: 'tugas-guru-42', skills: ['Descriptive Text'], c: 9, t: 9, at: 222 }
  ]));
  assert.ok(hub._passport.of('d_g7_descriptive_me'), 'kiriman misi lama harus terbawa ke buku baru');
  const semua = hub._passport.all().units;
  assert.strictEqual(
    Object.keys(semua).length, 1,
    'tugas guru ikut termigrasi menjadi bukti unit kurikulum — itu jalur kebocoran K1 lewat pintu belakang.'
  );
});

/* ------------------------------------------------------------------------------- jalan */

let pass = 0;
const gagal = [];
tests.forEach(([n, fn]) => {
  try { fn(); pass++; console.log('  ok   ' + n); }
  catch (e) { gagal.push(n + ' — ' + e.message); console.log('  FAIL ' + n + ' — ' + e.message); }
});
console.log('\nFIEZEL paspor kompetensi: ' + (gagal.length ? 'FAIL' : 'PASS') + ' (' + pass + ' pass, ' + gagal.length + ' fail)');
process.exit(gagal.length ? 1 : 0);
