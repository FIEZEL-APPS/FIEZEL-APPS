'use strict';
/**
 * tests/kurikulum-satu-buku-test.js — KUIS GURU SAMPAI KE MURID, DAN MISI MANDIRI
 * TIDAK MENYAMAR JADI TUGAS GURU (m025-349, temuan X4/X5).
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * X4 — Guru menekan "Terbitkan Kuis untuk Murid" di konsol kurikulum, dan kuisnya mendarat
 *      di backend kurikulum tempat tidak ada satu pun layar murid yang melihatnya. Ada DUA
 *      jalur tugas yang tidak pernah bertemu: jalur KelasKu (D1 ->
 *      `fiezel-learner-assignments-v1`) dan jalur kurikulum (MongoDB `assessments` ->
 *      hanya misi.html).
 *
 * X5 — Misi kurikulum yang DIPILIH SENDIRI murid dicatat sebagai "Tugas dari guru", dengan
 *      "guru" bernama *Kurikulum Merdeka · English* yang tidak ada, dan ikut terkirim ke
 *      laporan yang dibaca gurunya sebagai tugas yang selesai.
 *
 * Gerbang ini menjaga dua hal yang paling mudah rusak tanpa sadar: bahwa jembatannya GAGAL
 * DENGAN DIAM (tab Tugas tidak boleh bergantung pada layanan lain yang hidup), dan bahwa
 * ia TIDAK menulis asesmen kurikulum ke kunci tugas lokal — soalnya hidup di server dan
 * dipilih adaptif per murid, jadi menyalinnya menjadi tugas lokal membuat kartu yang
 * begitu diketuk membuka runner tanpa satu soal pun.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

/* Komentar dibuang sebelum disisir. Berkas-berkas ini MENJELASKAN jalur lama dalam prosa
   ("penulisnya di seluruh repo hanya fiezel-learner-assignments-v1...") supaya pembaca
   berikutnya tahu apa yang ditutup — dan pemindai yang membaca prosa sebagai kode sudah
   dua kali salah menuduh di repo ini (m025-285, m025-298). */
function tanpaKomentar(teks) {
  return teks.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const INBOX = baca('features/curriculum/fiezel-curriculum-inbox.js');
const INBOX_KODE = tanpaKomentar(INBOX);
const HUB = baca('features/class-hub/fiezel-class-hub.js');
const FLOW = baca('features/learner-flow/fiezel-learner-flow.js');

function muatInbox(config) {
  const store = new Map();
  const win = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    }
  };
  if (config) win.FIEZEL_CURRICULUM_CONFIG = config;
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  vm.runInContext(INBOX, ctx, { filename: 'fiezel-curriculum-inbox.js' });
  return { M: win.FiezelCurriculumInbox, store };
}

/* ------------------------------------------------------------------- X4: jembatannya */

test('X4 — modul kotak masuk kurikulum ada dan dimuat aplikasi', () => {
  assert.ok(/FiezelCurriculumInbox/.test(INBOX), 'modul tidak mengekspor FiezelCurriculumInbox');
  assert.ok(/fiezel-curriculum-inbox\.js/.test(baca('index.html')),
    'index.html tidak memuat modul kotak masuk — kuis guru kembali tak terlihat murid.');
  assert.ok(/fiezel-curriculum-inbox\.js/.test(baca('sw.js')),
    'sw.js tidak men-cache modul kotak masuk — murid luring kehilangan bagian ini.');
});

test('X4 — tab Tugas mencetak bagian tugas kurikulum', () => {
  assert.ok(/curriculumInboxSection\(\)/.test(HUB), 'tugasView tidak lagi memanggil curriculumInboxSection()');
  assert.ok(/data-testid="class-curriculum-inbox"/.test(HUB), 'bagian tugas kurikulum kehilangan data-testid-nya');
  assert.ok(/data-testid="class-curriculum-task-/.test(HUB), 'kartu tugas kurikulum kehilangan data-testid-nya');
});

test('X4 — asesmen kurikulum TIDAK ditulis ke kunci tugas lokal', () => {
  assert.ok(!/fiezel-learner-assignments-v1/.test(INBOX_KODE),
    'kotak masuk menulis ke fiezel-learner-assignments-v1. Soal asesmen kurikulum hidup di server ' +
    'dan dipilih adaptif per murid; menyalinnya menjadi tugas lokal membuat kartu yang, begitu ' +
    'diketuk, membuka runner yang tidak menemukan satu soal pun.');
  assert.ok(/misi\.html/.test(HUB), 'kartu tugas kurikulum harus menyerahkan pengerjaannya ke misi.html');
});

test('X4 — tanpa alamat backend, fitur ini tidak ada sama sekali', () => {
  const { M } = muatInbox(null);
  assert.strictEqual(M.siap(), false);
  const snap = M.snapshot();
  assert.strictEqual(snap.missions.length, 0);
  assert.strictEqual(snap.dueReviews, 0);
  assert.strictEqual(snap.at, 0);
  assert.strictEqual(M.perluRefresh(), false, 'tanpa backend ia tidak boleh menembak jaringan sama sekali');
});

test('X4 — gagal dengan diam: refresh tidak pernah menolak', () => {
  const { M } = muatInbox({ curriculumApiUrl: 'https://contoh.invalid' });
  assert.strictEqual(M.siap(), true);
  return M.refresh().then((hasil) => {
    assert.ok(Array.isArray(hasil.missions), 'refresh harus selalu menjawab bentuk yang sama');
    assert.strictEqual(hasil.missions.length, 0, 'kegagalan berakhir sebagai daftar kosong');
  });
});

test('X4 — jawaban server dirapikan ke bentuk sempit yang dipakai layar', () => {
  const { M } = muatInbox({ curriculumApiUrl: 'https://contoh.invalid' });
  const r = M._rapikan({
    assessment_id: 'as-1', title: 'Formatif Bilangan', type: 'formative', type_label: 'Formatif',
    goal: ['Memahami pecahan', 'Operasi pecahan'], deadline: '2026-10-01', minutes: 20,
    question_count: 10, session: { id: 's1', state: 'IN_PROGRESS', answered: 3 }
  });
  assert.strictEqual(r.id, 'as-1');
  assert.strictEqual(r.started, true);
  assert.strictEqual(r.finished, false);
  assert.strictEqual(r.goals.length, 2);
  assert.strictEqual(M._rapikan({ title: 'tanpa id' }), null, 'baris tanpa assessment_id dibuang');
});

/* ----------------------------------------------------- X5: misi mandiri bukan tugas guru */

test('X5 — misi tidak lagi memasang guru palsu', () => {
  assert.ok(!/teacher: 'Kurikulum Merdeka · '/.test(HUB),
    "misi kembali memasang 'Kurikulum Merdeka · <genre>' sebagai nama guru — guru yang tidak ada.");
  assert.ok(/selfDirected: !!a\.isMission/.test(HUB),
    'runner tidak lagi meneruskan bendera selfDirected ke learner-flow');
});

test('X5 — misi mandiri TIDAK masuk laporan tugas yang dibaca guru', () => {
  const i = FLOW.indexOf('function recordAssignmentResult');
  const fn = FLOW.slice(i, i + 2600);
  assert.ok(/var mandiri = !!res\.selfDirected/.test(fn), 'bendera selfDirected tidak dibaca');
  assert.ok(/if \(!mandiri\) \{[\s\S]*doneAssign/.test(fn),
    'doneAssign diisi tanpa memeriksa selfDirected. doneAssign adalah persis yang dikirim ke guru ' +
    '(lihat tutorCode: `assign`), dan guru berhak yakin setiap baris di situ adalah tugas yang IA kirim.');
});

test('X5 — jurnal murid menyebut misi mandiri dengan namanya sendiri', () => {
  assert.ok(/flow\.misi-mandiri/.test(FLOW), 'jurnal tidak lagi punya label khusus misi mandiri');
});

/* ------------------------------------------------------------------------------- jalan */

let pass = 0;
const gagal = [];
(async () => {
  for (const [n, fn] of tests) {
    try { await fn(); pass++; console.log('  ok   ' + n); }
    catch (e) { gagal.push(n); console.log('  FAIL ' + n + ' — ' + e.message); }
  }
  console.log('\nFIEZEL satu buku kompetensi: ' + (gagal.length ? 'FAIL' : 'PASS') + ' (' + pass + ' pass, ' + gagal.length + ' fail)');
  process.exit(gagal.length ? 1 : 0);
})();
