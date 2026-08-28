/**
 * FIEZEL gate — Mastery BKT per-lesson + ZPD frontier (Braincore v3, P3).
 *
 * Model penguasaan adalah tempat paling berbahaya untuk salah diam-diam: angka L yang
 * naik selalu terlihat seperti kemajuan, entah rumusnya benar atau terbalik. Karena itu
 * gate ini tidak memeriksa "apakah ada BKT-nya", melainkan APAKAH KESIMPULANNYA BENAR
 * pada kasus yang bisa dinilai tanpa berdebat:
 *
 *   - lima jawaban benar berturut HARUS mencapai mastery (murid yang belajar diakui);
 *   - benar-salah selang-seling TIDAK boleh lolos gerbang (osilasi bukan penguasaan);
 *   - satu slip di antara sembilan benar TIDAK boleh membatalkan mastery (slip
 *     dimodelkan, bukan dihukum);
 *   - frontier TIDAK pernah menyajikan lesson yang fondasinya rapuh;
 *   - bobot bukti menskalakan langkah di log-odds persis seperti kontrak;
 *   - dan state milik pemanggil TIDAK PERNAH dimutasi.
 */
const assert = require('assert');
const fs = require('fs');
const bkt = require('./features/brain/fiezel-mastery-bkt.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-28T00:00:00Z');

/** Jalankan serangkaian observasi benar/salah pada satu lesson. */
function run(pattern, lesson, weight) {
  let st = null;
  for (const ok of pattern) {
    st = bkt.update(st, { lesson, correct: ok, weight }, NOW);
  }
  return st;
}

// Replika BKT klasik sebagai oracle independen dari implementasi modul.
function oracleStep(L, correct) {
  const { slip: s, guess: g, T } = bkt.PARAMS;
  const post = correct ? (L * (1 - s)) / (L * (1 - s) + (1 - L) * g)
                       : (L * s) / (L * s + (1 - L) * (1 - g));
  return post + (1 - post) * T;
}
const logit = p => Math.log(p / (1 - p));
const sigmoid = z => 1 / (1 + Math.exp(-z));

// ---------------------------------------------------------------------------------
// (a) Lima benar berturut dari L0 harus menembus gerbang L >= 0.95 dengan n = 5.
// ---------------------------------------------------------------------------------
test('5 benar berturut dari L0 mencapai mastery (L >= 0.95, n >= 5)', () => {
  const st = run([true, true, true, true, true], 'possessive_adjectives');
  const m = bkt.mastery(st, 'possessive_adjectives');
  assert.ok(m.L >= 0.95, 'L=' + m.L + ' — murid yang 5x benar berturut harus diakui menguasai');
  assert.strictEqual(m.n, 5);
  assert.ok(bkt.masteryGate(st, 'possessive_adjectives'), 'gerbang mastery harus terbuka');
});

test('angka L cocok dengan oracle BKT klasik langkah demi langkah', () => {
  let st = null, L = bkt.PARAMS.L0;
  for (const ok of [true, true, false, true, false, true]) {
    st = bkt.update(st, { lesson: 'x', correct: ok }, NOW);
    L = oracleStep(L, ok);
    assert.ok(Math.abs(bkt.mastery(st, 'x').L - L) < 1e-9,
      'implementasi menyimpang dari rumus kontrak pada langkah dengan ok=' + ok);
  }
});

// ---------------------------------------------------------------------------------
// (b) Benar-salah selang-seling: osilasi, bukan penguasaan — harus stagnan di bawah gate.
// ---------------------------------------------------------------------------------
test('benar-salah selang-seling stagnan di bawah gerbang', () => {
  const pattern = [];
  for (let i = 0; i < 20; i++) pattern.push(i % 2 === 0);
  const st = run(pattern, 'alternator');
  const m = bkt.mastery(st, 'alternator');
  assert.ok(m.L < 0.95, 'L=' + m.L + ' — jawaban acak 50% tidak boleh terbaca sebagai mastery');
  assert.ok(!bkt.masteryGate(st, 'alternator'));
});

// ---------------------------------------------------------------------------------
// (c) Slip: 1 salah di antara 9 benar tetap mencapai mastery — slip dimodelkan (s=0.1),
// satu kecelakaan tidak boleh menghapus bukti sembilan keberhasilan.
// ---------------------------------------------------------------------------------
test('1 salah di antara 9 benar (slip) tetap mencapai mastery', () => {
  const pattern = [true, true, true, true, false, true, true, true, true, true];
  const st = run(pattern, 'slipper');
  const m = bkt.mastery(st, 'slipper');
  assert.ok(m.L >= 0.95, 'L=' + m.L + ' — satu slip tidak boleh membatalkan mastery');
  assert.strictEqual(m.n, 10);
  assert.ok(bkt.masteryGate(st, 'slipper'));
});

// ---------------------------------------------------------------------------------
// (d) Frontier tidak pernah menyajikan lesson dengan prasyarat yang gagal gerbang —
// format graf sama persis dengan grammar-curriculum-v1.json yang di-inject app.js.
// ---------------------------------------------------------------------------------
const GRAPH = {
  schema: 'fiezel-grammar-curriculum-v1',
  lessons: [
    { lessonId: 'pron', level: 'A1', sequence: 1, prerequisites: [] },
    { lessonId: 'poss', level: 'A1', sequence: 2, prerequisites: ['pron'] },
    { lessonId: 'kepemilikan_lanjut', level: 'A1', sequence: 3, prerequisites: ['poss'] }
  ]
};

test('frontier tidak menyajikan lesson berprasyarat lemah', () => {
  // 'pron' dikuasai penuh; 'poss' baru 2 observasi (L tinggi tapi n < 5 -> gagal gate).
  let st = run([true, true, true, true, true, true], 'pron');
  st = bkt.update(st, { lesson: 'poss', correct: true }, NOW);
  st = bkt.update(st, { lesson: 'poss', correct: true }, NOW);
  const predict = () => 0.7; // semua lesson pura-pura ada di jendela ZPD
  const rows = bkt.frontier(st, GRAPH, predict);
  const served = rows.map(r => r.lesson);
  assert.ok(served.includes('poss'), 'prasyarat pron sudah mastery -> poss layak saji');
  assert.ok(!served.includes('kepemilikan_lanjut'),
    'kepemilikan_lanjut berdiri di atas poss yang belum lolos gate — menyajikannya melatih gejala');
  for (const row of rows) assert.strictEqual(row.rationale, 'brain3_zpd_frontier');
});

test('frontier menghormati jendela ZPD [0.55, 0.90] dari predictFn', () => {
  const st = run([true, true, true, true, true, true], 'pron');
  const tooEasy = bkt.frontier(st, GRAPH, () => 0.97).map(r => r.lesson);
  const tooHard = bkt.frontier(st, GRAPH, () => 0.30).map(r => r.lesson);
  const inZone = bkt.frontier(st, GRAPH, id => (id === 'poss' ? 0.72 : 0.2)).map(r => r.lesson);
  assert.strictEqual(tooEasy.length, 0, 'p=0.97 terlalu mudah — tidak mengajarkan apa pun');
  assert.strictEqual(tooHard.length, 0, 'p=0.30 terlalu sulit — hanya mengajarkan rasa gagal');
  assert.deepStrictEqual(inZone, ['poss']);
});

// ---------------------------------------------------------------------------------
// (e) Weight menskalakan langkah di RUANG LOG-ODDS: produksi 1.5 > default 1 > guess 0.3,
// dan nilainya persis sigmoid(logit(L) + w * delta) — bukan interpolasi linear pada L.
// ---------------------------------------------------------------------------------
test('weight menskalakan langkah dalam log-odds (1.5 produksi, 0.3 guess)', () => {
  const L0 = bkt.PARAMS.L0;
  const classic = oracleStep(L0, true);
  const delta = logit(classic) - logit(L0);
  for (const w of [0.3, 1, 1.5]) {
    const st = bkt.update(null, { lesson: 'w', correct: true, weight: w }, NOW);
    const expected = sigmoid(logit(L0) + w * delta);
    assert.ok(Math.abs(bkt.mastery(st, 'w').L - expected) < 1e-9,
      'weight=' + w + ' tidak menskalakan langkah log-odds sesuai kontrak');
  }
  const heavy = bkt.mastery(bkt.update(null, { lesson: 'w', correct: true, weight: 1.5 }, NOW), 'w').L;
  const light = bkt.mastery(bkt.update(null, { lesson: 'w', correct: true, weight: 0.3 }, NOW), 'w').L;
  const plain = bkt.mastery(bkt.update(null, { lesson: 'w', correct: true }, NOW), 'w').L;
  assert.ok(light < plain && plain < heavy, 'bukti produksi harus menggeser lebih jauh daripada tebakan');
});

test('weight 0 tidak menggeser L dan tidak menaikkan n (bukti tanpa kredibilitas)', () => {
  const st = bkt.update(null, { lesson: 'z', correct: true, weight: 0 }, NOW);
  const m = bkt.mastery(st, 'z');
  assert.strictEqual(m.n, 0, 'bukti berbobot nol tidak boleh menghuni gerbang >= 5 observasi');
  assert.ok(Math.abs(m.L - bkt.PARAMS.L0) < 1e-9);
});

// ---------------------------------------------------------------------------------
// (f) Immutability: argumen pemanggil tidak boleh berubah sedikit pun.
// ---------------------------------------------------------------------------------
test('update tidak memutasi state maupun observasi milik pemanggil', () => {
  const st = bkt.update(null, { lesson: 'a', correct: true }, NOW);
  const frozenSnapshot = JSON.stringify(st);
  const obs = { lesson: 'a', correct: false, weight: 1.5 };
  const obsSnapshot = JSON.stringify(obs);
  const st2 = bkt.update(st, obs, NOW + 1000);
  assert.strictEqual(JSON.stringify(st), frozenSnapshot, 'state lama termutasi');
  assert.strictEqual(JSON.stringify(obs), obsSnapshot, 'observasi termutasi');
  assert.notStrictEqual(st2, st);
  assert.notStrictEqual(st2.lessons, st.lessons);
  assert.notStrictEqual(st2.lessons.a, st.lessons.a);
});

// ---------------------------------------------------------------------------------
// Root cause probabilistik: prasyarat dengan L terendah di bawah gerbang.
// ---------------------------------------------------------------------------------
test('rootCause menunjuk prasyarat transitif dengan L terendah di bawah gerbang', () => {
  // pron lemah (banyak salah), poss sedang belum lolos gate; keduanya prasyarat
  // (langsung + transitif) dari kepemilikan_lanjut. Akar = yang L-nya TERENDAH.
  let st = run([false, false, false, true, false], 'pron');
  for (let i = 0; i < 3; i++) st = bkt.update(st, { lesson: 'poss', correct: true }, NOW);
  const rc = bkt.rootCause(st, GRAPH, 'kepemilikan_lanjut');
  assert.ok(rc, 'harus ada diagnosis saat prasyarat gagal gerbang');
  assert.strictEqual(rc.lesson, 'pron', 'pron punya posterior terendah — dialah akarnya');
  assert.strictEqual(rc.rationale, 'brain3_bkt_root_cause');
  assert.ok(rc.confidence >= 0 && rc.confidence <= 1);
});

test('rootCause jujur bilang null saat semua prasyarat sehat', () => {
  let st = run([true, true, true, true, true, true], 'pron');
  for (let i = 0; i < 6; i++) st = bkt.update(st, { lesson: 'poss', correct: true }, NOW);
  assert.strictEqual(bkt.rootCause(st, GRAPH, 'kepemilikan_lanjut'), null,
    'tanpa prasyarat lemah, gejala adalah akarnya sendiri — jangan mengarang kambing hitam');
});

// ---------------------------------------------------------------------------------
// Ketahanan input korup + graf kurikulum asli 139 lesson.
// ---------------------------------------------------------------------------------
test('tahan input korup: state sampah, observasi sampah, graf sampah', () => {
  for (const junk of [null, undefined, 42, 'rusak', { lessons: 'bukan-objek' }, { lessons: { a: { L: 'NaN', n: -3 } } }]) {
    const st = bkt.update(junk, { lesson: 'a', correct: true }, NOW);
    assert.strictEqual(st.schema, bkt.SCHEMA);
    const m = bkt.mastery(junk, 'a');
    assert.ok(isFinite(m.L) && isFinite(m.n));
  }
  assert.strictEqual(bkt.update(null, null, NOW).schema, bkt.SCHEMA);
  assert.strictEqual(bkt.mastery(null, 'tak_dikenal').n, 0);
  assert.deepStrictEqual(bkt.frontier(null, null, () => 0.7), []);
  assert.deepStrictEqual(bkt.frontier(null, { lessons: [{}] }, null), []);
  assert.strictEqual(bkt.rootCause(null, 'graf-rusak', 'x'), null);
});

test('frontier bekerja pada grammar-curriculum-v1.json asli (153 lesson)', () => {
  const graph = JSON.parse(fs.readFileSync('./grammar-curriculum-v1.json', 'utf8'));
  /* m025-182: 153, bukan 139 - kurikulum tumbuh dan angka ini tidak ikut. Yang diuji tetap
     sama: frontier atas graf ASLI, bukan atas fixture yang dibuat pas supaya lulus. */
  assert.strictEqual(graph.lessons.length, 153);
  // Murid baru: hanya lesson TANPA prasyarat yang layak saji (gerbang vacuous).
  const roots = graph.lessons.filter(l => !(l.prerequisites || []).length).map(l => l.lessonId);
  const served = bkt.frontier(null, graph, () => 0.7).map(r => r.lesson);
  assert.deepStrictEqual(served.sort(), roots.slice().sort(),
    'murid tanpa riwayat hanya boleh disajikan akar kurikulum');
  for (const row of bkt.frontier(null, graph, () => 0.7)) {
    for (const parent of (graph.lessons.find(l => l.lessonId === row.lesson).prerequisites || [])) {
      assert.ok(bkt.masteryGate(null, parent), 'frontier menyajikan lesson berprasyarat lemah');
    }
  }
});

test('modul murni: tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa jam internal', () => {
  const source = fs.readFileSync('./features/brain/fiezel-mastery-bkt.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['document', 'localStorage', 'fetch(', 'XMLHttpRequest', 'window.', 'Date.now', 'Math.random']) {
    assert.ok(!source.includes(forbidden), 'modul penguasaan menyentuh ' + forbidden + ' — itu membuatnya tidak bisa diuji sebagai angka');
  }
});

console.log('');
if (failures) { console.error('FIEZEL Mastery BKT: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL Mastery BKT: PASS');
