/**
 * FIEZEL gate — Confusion Matrix (Braincore v3, A7).
 *
 * Matriks kebingungan memberi makan keputusan KURIKULER: "lesson Y mungkin prasyarat
 * lesson X yang belum tercatat". Kesalahan arah di sini tidak terlihat di layar —
 * ia hanya membuat kurikulum diperbaiki ke arah yang salah dengan penuh keyakinan.
 * Karena itu gate ini memeriksa perilaku yang bisa dinilai tanpa berdebat:
 *   (a) hanya pilihan pinjaman yang SALAH yang menambah sel — dan sel yang BENAR;
 *   (b) jawaban benar tidak menambah apa pun;
 *   (c) C[X][Y] dan C[Y][X] hidup terpisah (arah substitusi adalah diagnosisnya);
 *   (d) topConfusions tidak berteriak di bawah ambang bukti;
 *   (e) suggestPrerequisiteEdges menemukan sisi yang hilang dan diam pada sisi yang ada;
 *   (f) state korup dari localStorage tidak membuat modul melempar atau menghitung ngawur.
 */
const assert = require('assert');
const fs = require('fs');
const cm = require('../features/brain/fiezel-confusion-matrix.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-27T12:00:00Z');
const DAY = 86400000;

/** Bukti standar: murid di present_perfect memilih opsi salah pinjaman dari simple_past. */
function ev(over) {
  return Object.assign({
    activeLesson: 'present_perfect',
    activeFamily: 'tense_aspect',
    sourceLesson: 'simple_past',
    sourceFamily: 'tense_aspect_past',
    picked: true,
    correct: false
  }, over || {});
}

// ---- (a) pilihan pinjaman salah menambah sel yang benar -------------------------------

test('(a) pilihan pinjaman yang salah menambah C[lessonAktif][lessonSumber] dan F[familyAktif][familySumber]', () => {
  let m = cm.record(null, ev(), NOW);
  m = cm.record(m, ev(), NOW + 1000);
  assert.strictEqual(Math.round(m.lessons.present_perfect.simple_past), 2,
    'dua pilihan salah = hitungan 2 pada sel lesson aktif -> lesson sumber');
  assert.strictEqual(Math.round(m.families.tense_aspect.tense_aspect_past), 2,
    'agregat keluarga ikut terisi pada arah yang sama');
  assert.ok(!m.lessons.simple_past, 'baris kebalikan TIDAK boleh ikut terisi');
  assert.strictEqual(m.schema, cm.SCHEMA);
});

test('(a2) opsi salah milik lesson SENDIRI bukan kebingungan antar-lesson', () => {
  const m = cm.record(null, ev({ sourceLesson: 'present_perfect', sourceFamily: 'tense_aspect' }), NOW);
  assert.strictEqual(Object.keys(m.lessons).length, 0,
    'salah pada opsi sendiri urusan ledger miskonsepsi, bukan matriks ini');
});

test('(a3) record murni: matriks masukan tidak dimutasi', () => {
  const before = cm.record(null, ev(), NOW);
  const frozen = JSON.stringify(before);
  cm.record(before, ev(), NOW + DAY);
  assert.strictEqual(JSON.stringify(before), frozen, 'masukan harus tetap utuh setelah record');
});

// ---- (b) jawaban benar tidak menambah --------------------------------------------------

test('(b) jawaban benar dan opsi yang tidak dipilih tidak menambah apa pun', () => {
  let m = cm.record(null, ev({ correct: true }), NOW);           // memilih kunci
  m = cm.record(m, ev({ picked: false }), NOW);                  // opsi salah tapi tidak dipilih
  m = cm.record(m, ev({ picked: false, correct: true }), NOW);   // kunci yang tidak dipilih
  assert.strictEqual(Object.keys(m.lessons).length, 0, 'tidak ada sel lesson yang terisi');
  assert.strictEqual(Object.keys(m.families).length, 0, 'tidak ada sel keluarga yang terisi');
  assert.strictEqual(m.totalEvents, 0);
});

// ---- (c) asimetri -----------------------------------------------------------------------

test('(c) C[X][Y] dan C[Y][X] dicatat terpisah, tidak pernah dijumlahkan', () => {
  let m = null;
  // Tiga kali: di present_perfect murid memakai aturan simple_past.
  for (let i = 0; i < 3; i++) m = cm.record(m, ev(), NOW + i);
  // Sekali arah sebaliknya.
  m = cm.record(m, ev({
    activeLesson: 'simple_past', activeFamily: 'tense_aspect_past',
    sourceLesson: 'present_perfect', sourceFamily: 'tense_aspect'
  }), NOW + 10);
  assert.strictEqual(Math.round(m.lessons.present_perfect.simple_past), 3);
  assert.strictEqual(Math.round(m.lessons.simple_past.present_perfect), 1);
  const top = cm.topConfusions(m, { min: 1 });
  const fwd = top.find(x => x.from === 'present_perfect' && x.to === 'simple_past');
  const bwd = top.find(x => x.from === 'simple_past' && x.to === 'present_perfect');
  assert.ok(fwd && bwd, 'kedua arah tampil sebagai entri terpisah');
  assert.ok(fwd.count > bwd.count, 'arah substitusi yang dominan harus terbaca dominan');
});

// ---- (d) ambang min ---------------------------------------------------------------------

test('(d) topConfusions menghormati ambang min (default 3) dan mengurutkan hasil', () => {
  let m = null;
  for (let i = 0; i < 5; i++) m = cm.record(m, ev(), NOW + i);
  for (let i = 0; i < 2; i++) m = cm.record(m, ev({ sourceLesson: 'past_continuous', sourceFamily: 'tense_aspect_past' }), NOW + 100 + i);
  const def = cm.topConfusions(m);
  assert.strictEqual(def.length, 1, 'sel berhitungan 2 tidak boleh lolos ambang default 3');
  assert.strictEqual(def[0].to, 'simple_past');
  assert.strictEqual(def[0].rationale, 'brain3_lesson_confusion');
  assert.ok(def[0].share > 0.7 && def[0].share <= 1, 'share = porsi sel terhadap barisnya (5 dari 7)');
  const loose = cm.topConfusions(m, { min: 1 });
  assert.strictEqual(loose.length, 2);
  assert.ok(loose[0].count >= loose[1].count, 'terurut dari hitungan terbesar');
});

// ---- (e) sisi prasyarat yang hilang -----------------------------------------------------

test('(e) suggestPrerequisiteEdges menemukan sisi yang hilang dan diam pada sisi yang sudah ada', () => {
  // Fixture graf gaya grammar-curriculum-v1.json: possessive_adjectives SUDAH
  // menyatakan prasyaratnya; present_perfect dan simple_past TIDAK terhubung sama sekali.
  const graphRows = [
    { lessonId: 'subject_object_pronouns_and_possessives', prerequisites: [] },
    { lessonId: 'possessive_adjectives', prerequisites: ['subject_object_pronouns_and_possessives'] },
    { lessonId: 'simple_past', prerequisites: [] },
    { lessonId: 'present_perfect', prerequisites: [] }
  ];
  let m = null;
  // Kebingungan kuat pada pasangan yang TIDAK ada di graf.
  for (let i = 0; i < 5; i++) m = cm.record(m, ev(), NOW + i);
  // Kebingungan kuat pada pasangan yang SUDAH ada di graf (tidak boleh diusulkan lagi).
  for (let i = 0; i < 5; i++) m = cm.record(m, ev({
    activeLesson: 'possessive_adjectives', activeFamily: 'determiners',
    sourceLesson: 'subject_object_pronouns_and_possessives', sourceFamily: 'pronouns'
  }), NOW + 50 + i);
  const edges = cm.suggestPrerequisiteEdges(m, graphRows);
  assert.strictEqual(edges.length, 1, 'hanya pasangan yang hilang dari graf yang diusulkan');
  assert.strictEqual(edges[0].from, 'present_perfect');
  assert.strictEqual(edges[0].to, 'simple_past');
  assert.strictEqual(edges[0].inGraph, false);
  assert.strictEqual(edges[0].rationale, 'brain3_prereq_gap_candidate');
  assert.ok(edges[0].confidence > 0 && edges[0].confidence < 1, 'kandidat, bukan kepastian');
  // Bentuk {lessons:[...]} (persis grammar-curriculum-v1.json) juga harus diterima.
  assert.strictEqual(cm.suggestPrerequisiteEdges(m, { lessons: graphRows }).length, 1);
});

test('(e2) hubungan transitif di graf juga dihitung sebagai "sudah ada"', () => {
  const graphRows = [
    { lessonId: 'a', prerequisites: [] },
    { lessonId: 'b', prerequisites: ['a'] },
    { lessonId: 'c', prerequisites: ['b'] }
  ];
  let m = null;
  for (let i = 0; i < 4; i++) m = cm.record(m, ev({ activeLesson: 'c', sourceLesson: 'a', activeFamily: '', sourceFamily: '' }), NOW + i);
  assert.strictEqual(cm.suggestPrerequisiteEdges(m, graphRows).length, 0,
    'c sudah bergantung pada a lewat b; graf tidak salah, jangan menggugatnya');
});

// ---- (f) state korup --------------------------------------------------------------------

test('(f) state korup tidak melempar dan tidak menghitung ngawur', () => {
  const corrupt = [
    undefined, null, 42, 'rusak', [], { lessons: 'bukan objek' },
    { lessons: { present_perfect: { simple_past: 'NaN' } }, families: 7, totalEvents: -3, updatedAt: 'kemarin' },
    { lessons: { present_perfect: { simple_past: Infinity } } },
    JSON.parse('{"lessons":{"__proto__":{"x":5},"a":{"constructor":2,"b":-1}}}')
  ];
  for (const bad of corrupt) {
    const m = cm.record(bad, ev(), NOW);
    assert.strictEqual(Math.round(m.lessons.present_perfect.simple_past), 1,
      'setelah sanitasi, bukti baru tetap tercatat bersih');
    assert.ok(Array.isArray(cm.topConfusions(bad)), 'topConfusions pada state korup tetap mengembalikan array');
    assert.ok(Array.isArray(cm.suggestPrerequisiteEdges(bad, null)), 'suggest pada state korup tetap mengembalikan array');
  }
  // Kunci beracun tidak boleh menembus ke hasil.
  const poisoned = cm.sanitize(JSON.parse('{"lessons":{"a":{"__proto__":9,"b":2}}}'));
  assert.strictEqual(poisoned.lessons.a.b, 2);
  const cleaned = cm.topConfusions(poisoned, { min: 1 });
  assert.ok(cleaned.every(x => x.from !== '__proto__' && x.to !== '__proto__' && x.to !== 'constructor'),
    'kunci warisan tidak boleh muncul sebagai nama lesson di hasil');
  assert.strictEqual(cleaned.length, 1);
  assert.strictEqual(cleaned[0].to, 'b');
  // Bukti korup juga tidak boleh melempar.
  const m2 = cm.record(null, { picked: 1, correct: 'salah' }, NOW);
  assert.strictEqual(m2.totalEvents, 0, 'bukti tanpa bentuk yang benar diabaikan, bukan ditebak');
});

// ---- decay ------------------------------------------------------------------------------

test('decay ringan: half-life 60 hari, dan jam mundur tidak menggelembungkan hitungan', () => {
  assert.strictEqual(cm.HALF_LIFE_DAYS, 60);
  assert.ok(Math.abs(cm.decayFactor(60 * DAY) - 0.5) < 1e-9, 'tepat setengah pada 60 hari');
  assert.strictEqual(cm.decayFactor(-5 * DAY), 1, 'selang negatif dijepit: tanpa decay, bukan penggelembungan');
  let m = null;
  for (let i = 0; i < 4; i++) m = cm.record(m, ev(), NOW + i);
  // 60 hari kemudian satu bukti baru: 4 lama meluruh jadi ~2, plus 1 baru = ~3.
  const later = cm.record(m, ev(), NOW + 60 * DAY);
  const count = later.lessons.present_perfect.simple_past;
  assert.ok(Math.abs(count - 3) < 0.01, 'bukti lama kehilangan setengah bobot, bukti baru penuh: ' + count);
});

// ---- kontrak modul murni ----------------------------------------------------------------

test('modul murni: tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa Date.now', () => {
  const source = fs.readFileSync('./features/brain/fiezel-confusion-matrix.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['document', 'localStorage', 'fetch(', 'XMLHttpRequest', 'window.', 'Date.now', 'Math.random']) {
    assert.ok(!source.includes(forbidden),
      'modul menyentuh ' + forbidden + ' - itu membuatnya tidak bisa diuji sebagai angka');
  }
});

console.log('');
if (failures) { console.error('FiezelConfusionMatrix: FAIL (' + failures + ')'); process.exit(1); }
console.log('FiezelConfusionMatrix: PASS');
