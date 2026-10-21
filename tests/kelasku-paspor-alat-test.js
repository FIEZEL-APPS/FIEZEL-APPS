'use strict';
/**
 * tests/kelasku-paspor-alat-test.js — PASPOR SEBAGAI ALAT, BUKAN RAPOR
 * (m025-349, temuan K3/K5/K6/K11/K13 + fitur F3/F4/F6).
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * Audit 20 September 2026 menemukan bahwa paspor kompetensi menjawab "berapa nilaimu",
 * padahal yang dibutuhkan murid adalah "apa langkah berikutnya". Lima cacat dan tiga
 * fitur yang hilang, semuanya berbagi satu akar: data yang sudah ada tidak pernah dipakai.
 *
 *   K3/F4 — "Tuntas" dari satu percobaan delapan soal, berlaku SELAMANYA. Tanpa peluruhan,
 *           stempelnya berarti "pernah bisa", bukan "masih bisa" — sementara kartu induknya
 *           menjanjikan "bukti penguasaan materi".
 *   K5    — Urutan soal misi tidak pernah diacak, jadi "Ulangi Misi" melatih ingatan urutan.
 *   K6/F3 — Sub-bab dipajang di kartu misi dan setiap butir soal membawa `subChapterId`,
 *           tetapi tidak ada satu pun layar yang memakainya: murid tidak bisa melatih
 *           bagian yang goyah saja.
 *   K11   — Misi memakai nama genre Inggris sebagai kunci skill, yang lalu tercetak mentah
 *           di peta skill murid.
 *   F6    — Lima belas kartu sejajar adalah katalog, bukan jalur.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');
const HUB = baca('features/class-hub/fiezel-class-hub.js');
const HARI = 24 * 60 * 60 * 1000;

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

function muat() {
  const store = new Map();
  const win = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    }
  };
  win.window = win; win.self = win;
  vm.runInContext(HUB, vm.createContext(win), { filename: 'fiezel-class-hub.js' });
  return win.FiezelClassHub;
}

/* ----------------------------------------------------- K3 + F4: stempel yang memudar */

test('K3/F4 — jarak ulang melebar: 7, 21, lalu 60 hari', () => {
  const P = muat()._passport, now = Date.now();
  const jarak = [];
  for (let i = 0; i < 4; i++) { P.record('u1', 8, 8, now); jarak.push(Math.round((P.of('u1').due - now) / HARI)); }
  assert.deepStrictEqual(jarak, [7, 21, 60, 60],
    'tuntas pertama harus 7 hari. Melompat ke 21 berarti off-by-one pada streak: jarak yang ' +
    'pantas untuk bab yang sudah DUA kali tuntas diberikan pada yang baru sekali.');
});

test('K3/F4 — bab yang lewat jadwal ulang ditandai, tanpa dicabut ketuntasannya', () => {
  const P = muat()._passport, now = Date.now();
  P.record('u1', 8, 8, now - 40 * HARI);
  const m = P.of('u1');
  assert.strictEqual(m.perluUlang, true, 'bab yang lewat jadwal harus ditandai perlu diulang');
  assert.strictEqual(m.tuntas, true, 'meluruh BUKAN gagal — ketuntasannya tidak dicabut');
});

test('K3/F4 — bab yang belum tuntas ditawarkan lagi jauh lebih cepat', () => {
  const P = muat()._passport, now = Date.now();
  P.record('u2', 2, 8, now);
  assert.strictEqual(Math.round((P.of('u2').due - now) / HARI), 2);
  assert.strictEqual(P.of('u2').tuntas, false);
});

test('K3/F4 — gagal mematahkan runtun, jadi jaraknya kembali ke awal', () => {
  const P = muat()._passport, now = Date.now();
  P.record('u3', 8, 8, now); P.record('u3', 8, 8, now);
  P.record('u3', 2, 8, now);
  P.record('u3', 8, 8, now);
  assert.strictEqual(Math.round((P.of('u3').due - now) / HARI), 7,
    'runtun harus patah saat gagal; kalau tidak, bab yang baru saja dilupakan tetap dijadwalkan dua bulan lagi.');
});

/* ------------------------------------------------------------ F3 + K6: per sub-bab */

test('F3/K6 — hasil per sub-bab tersimpan, dan yang goyah bisa ditemukan', () => {
  const P = muat();
  P._passport.record('u1', 5, 8, Date.now(), { sc1: { c: 4, t: 4 }, sc2: { c: 1, t: 4 } });
  const m = P._passport.of('u1');
  assert.strictEqual(m.sub.sc1.c, 4);
  assert.strictEqual(m.sub.sc2.c, 1);
});

test('F3/K6 — sub-bab dipakai percobaan TERAKHIR, bukan terbaik', () => {
  const P = muat()._passport;
  P.record('u1', 8, 8, 1000, { sc1: { c: 4, t: 4 } });
  P.record('u1', 4, 8, 2000, { sc1: { c: 1, t: 4 } });
  assert.strictEqual(P.of('u1').sub.sc1.c, 1,
    'sub-bab yang dulu benar lalu kini salah justru yang paling perlu diulang — memakai ' +
    '"terbaik" di sini menyembunyikan persis apa yang dicari layarnya.');
});

test('F3/K6 — misi bisa disaring ke sub-bab tertentu, dan tidak pernah kosong', () => {
  const src = HUB.slice(HUB.indexOf('function startMissionAssignment'), HUB.indexOf('function curriculumModalView'));
  assert.ok(/hanyaSub/.test(src), 'startMissionAssignment tidak lagi menerima saringan sub-bab');
  assert.ok(/if \(saring\.length\) sumber = saring/.test(src),
    'penyaringan yang menyisakan nol soal harus jatuh kembali ke bab penuh — sesi kosong lebih buruk daripada latihan terlalu banyak.');
  assert.ok(/data-ch="start-weak"/.test(HUB), 'tombol "latih yang belum kuat" hilang dari kartu paspor');
});

/* --------------------------------------------------------------- K5: urutan diacak */

test('K5 — misi diacak urutannya', () => {
  const src = HUB.slice(HUB.indexOf('function startMissionAssignment'), HUB.indexOf('function curriculumModalView'));
  assert.ok(/shuffle: true/.test(src),
    'misi kembali memakai urutan tetap — mengulangnya melatih ingatan urutan, bukan kompetensinya.');
});

/* ------------------------------------------------------ K11: peta skill tidak tercemar */

test('K11 — misi memakai kunci mesin, bukan nama genre Inggris', () => {
  const src = HUB.slice(HUB.indexOf('function startMissionAssignment'), HUB.indexOf('function curriculumModalView'));
  assert.ok(/skills: \['curriculum'\]/.test(src), "misi harus memakai kunci skill 'curriculum'");
  assert.ok(!/skills: \[u\.genre/.test(src), 'nama genre Inggris kembali menjadi kunci skill');
  assert.ok(/k === 'curriculum'/.test(HUB), "skillLabel harus menerjemahkan kunci 'curriculum'");
});

/* --------------------------------------------------------------- F6: satu langkah */

test('F6 — target minggu ini ada, dan selalu menyebut alasannya', () => {
  assert.ok(/function targetMingguIni/.test(HUB), 'pemilih target hilang');
  assert.ok(/data-testid="class-target-card"/.test(HUB), 'kartu target hilang dari tab Tugas');
  const src = HUB.slice(HUB.indexOf('function targetMingguIni'), HUB.indexOf('function targetCard'));
  assert.ok(/alasan:/.test(src), 'setiap target wajib membawa alasan — tanpa itu ia hanya memindahkan pilihan');
  assert.ok(src.indexOf('perluUlang') < src.indexOf('baru'),
    'pengulangan harus didahulukan di atas materi baru: bab yang meluruh tidak terlihat sampai ia benar-benar hilang.');
});

/* ------------------------------------------------------------------------------ jalan */

let pass = 0;
const gagal = [];
tests.forEach(([n, fn]) => {
  try { fn(); pass++; console.log('  ok   ' + n); }
  catch (e) { gagal.push(n); console.log('  FAIL ' + n + ' — ' + e.message); }
});
console.log('\nFIEZEL paspor sebagai alat: ' + (gagal.length ? 'FAIL' : 'PASS') + ' (' + pass + ' pass, ' + gagal.length + ' fail)');
process.exit(gagal.length ? 1 : 0);
