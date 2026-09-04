/**
 * FIEZEL gate — Post-Test Tertunda / probe retensi (Braincore v3, Wave E4).
 *
 * Penjadwal probe adalah tempat yang mudah salah diam-diam: jadwal yang terlihat masuk
 * akal bisa saja tidak deterministik (audit tidak bisa direproduksi), bocor untuk lesson
 * yang belum mastery (mengukur ketidaktahuan sebagai retensi), atau diam-diam memutasi
 * state pemanggil. Evaluatornya lebih berbahaya lagi: Brier yang salah rumus tetap
 * menghasilkan angka 0..1 yang tampak sah. Karena itu gate ini memeriksa KESIMPULAN
 * terhadap oracle manual, bukan sekadar "fungsinya ada":
 *
 *   - offset [3,7,21] hari + jitter terpagar ±0.75 hari, byte-identik antar run;
 *   - probe TIDAK PERNAH dijadwalkan untuk lesson tanpa mastery (properti, di-sweep);
 *   - Brier dicek angka-demi-angka terhadap hitungan tangan;
 *   - "mastery rapuh" menyala persis saat probe gagal padahal prediksi tinggi;
 *   - adjustments SELALU advisory dan TIDAK PERNAH menulis ke state memori;
 *   - argumen (state, events, results) tidak pernah dimutasi; masukan korup tidak
 *     melempar dan tidak menghasilkan jadwal siluman.
 */
const assert = require('assert');
const post = require('./features/brain/fiezel-retention-probe.js');

let failures = 0;
let asserts = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}
// Bungkus assert supaya jumlah pemeriksaan nyata terhitung (gerbang >= 25 assert).
function ok(cond, msg) { asserts++; assert.ok(cond, msg); }
function eq(a, b, msg) { asserts++; assert.strictEqual(a, b, msg); }
function deepEq(a, b, msg) { asserts++; assert.deepStrictEqual(a, b, msg); }

const DAY = 86400000;
const NOW = Date.parse('2026-08-28T00:00:00Z');
const SEED = 20260828;

function mastered(lesson, L) { return { lesson, L: L == null ? 0.97 : L, n: 6 }; }

// PRNG kecil untuk sweep properti — test sendiri juga wajib deterministik.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------
// (a) Penjadwal: bentuk jadwal, offset, jitter, determinisme
// ---------------------------------------------------------------------------------
test('lesson mastery mendapat tepat 3 probe pada offset [3,7,21] hari', () => {
  const r = post.schedule(null, [mastered('present_simple')], NOW, { userSeed: SEED });
  eq(r.scheduled.length, 3, 'tiga offset = tiga probe');
  deepEq(r.scheduled.map(p => p.offsetDays), [3, 7, 21]);
  for (const p of r.scheduled) {
    ok(Math.abs(p.jitterDays) <= post.JITTER_DAYS, 'jitter ' + p.jitterDays + ' keluar pagar ±' + post.JITTER_DAYS);
    const expected = NOW + (p.offsetDays + p.jitterDays) * DAY;
    ok(Math.abs(p.dueAt - expected) <= 1, 'dueAt harus = jangkar + (offset+jitter) hari');
    eq(p.rationale, 'brain3_post_test_scheduled');
  }
});

test('determinisme: dua run dengan masukan sama byte-identik', () => {
  const ev = [mastered('past_simple'), mastered('articles_a_an')];
  const a = post.schedule({ userSeed: SEED }, ev, NOW);
  const b = post.schedule({ userSeed: SEED }, ev, NOW);
  eq(JSON.stringify(a), JSON.stringify(b), 'jadwal wajib bisa direproduksi untuk audit');
});

test('jitter menyebar: lesson berbeda (seed sama) mendapat geseran berbeda', () => {
  const r = post.schedule(null, [mastered('present_simple'), mastered('past_simple')], NOW, { userSeed: SEED });
  const j1 = r.scheduled.filter(p => p.lesson === 'present_simple').map(p => p.jitterDays);
  const j2 = r.scheduled.filter(p => p.lesson === 'past_simple').map(p => p.jitterDays);
  ok(JSON.stringify(j1) !== JSON.stringify(j2), 'dua lesson tidak boleh menumpuk di menit yang sama');
});

test('jitter menyebar: userSeed berbeda menggeser jadwal lesson yang sama', () => {
  const a = post.schedule(null, [mastered('present_simple')], NOW, { userSeed: 1 });
  const b = post.schedule(null, [mastered('present_simple')], NOW, { userSeed: 2 });
  ok(JSON.stringify(a.scheduled.map(p => p.dueAt)) !== JSON.stringify(b.scheduled.map(p => p.dueAt)),
    'murid berbeda tidak boleh mendapat jam probe identik');
});

test('userSeed yang sudah terekam di state menang atas opts (jadwal stabil antar sesi)', () => {
  const first = post.schedule(null, [mastered('present_simple')], NOW, { userSeed: SEED });
  const again = post.schedule(first.state, [mastered('past_simple')], NOW, { userSeed: 999 });
  eq(again.state.userSeed, SEED >>> 0, 'seed tidak boleh berubah karena pemanggil lupa/keliru');
});

test('idempoten: mastery event berulang tidak menggandakan probe', () => {
  const first = post.schedule(null, [mastered('present_simple')], NOW, { userSeed: SEED });
  const second = post.schedule(first.state, [mastered('present_simple')], NOW + DAY);
  eq(second.scheduled.length, 0, 'lesson yang sudah terjadwal tidak dijadwalkan ulang');
  eq(second.state.probes.present_simple.probes.length, 3);
});

test('jangkar `at` dipakai bila ada: probe dihitung dari momen mastery, bukan momen panggil', () => {
  const at = NOW - 2 * DAY;
  const r = post.schedule(null, [{ lesson: 'articles_a_an', L: 0.96, at }], NOW, { userSeed: SEED });
  const p0 = r.scheduled[0];
  ok(Math.abs(p0.dueAt - (at + (3 + p0.jitterDays) * DAY)) <= 1, 'jangkar harus `at`, bukan nowMs');
});

test('daftar due: hanya probe dengan dueAt <= now, terurut deterministik', () => {
  const r1 = post.schedule(null, [{ lesson: 'a', L: 0.97, at: NOW - 30 * DAY }, { lesson: 'b', L: 0.97, at: NOW - 5 * DAY }], NOW, { userSeed: SEED });
  for (const d of r1.due) {
    ok(d.dueAt <= NOW, 'probe belum jatuh tempo tidak boleh masuk daftar due');
  }
  // lesson 'a' mastery 30 hari lalu: ketiga probenya (maks 21.75 hari) sudah lewat semua.
  eq(r1.due.filter(d => d.lesson === 'a').length, 3);
  // lesson 'b' mastery 5 hari lalu: hanya probe offset 3 (±0.75) yang mungkin due.
  eq(r1.due.filter(d => d.lesson === 'b').length, 1);
  const sorted = r1.due.slice().sort((x, y) => x.dueAt - y.dueAt || (x.lesson < y.lesson ? -1 : 1));
  deepEq(r1.due, sorted, 'urutan due harus terurut waktu (deterministik)');
});

// ---------------------------------------------------------------------------------
// Properti keras: probe TIDAK PERNAH ada untuk lesson tanpa mastery
// ---------------------------------------------------------------------------------
test('L < 0.95 / L korup / L absen tidak pernah dijadwalkan (kasus manual)', () => {
  const events = [
    { lesson: 'l_low', L: 0.949 },
    { lesson: 'l_nan', L: NaN },
    { lesson: 'l_str', L: '0.99' },
    { lesson: 'l_null', L: null },
    { lesson: 'l_missing' },
    { lesson: 'l_ok', L: 0.95 }
  ];
  const r = post.schedule(null, events, NOW, { userSeed: SEED });
  deepEq(Object.keys(r.state.probes), ['l_ok'], 'hanya L >= 0.95 (angka sah) yang boleh diprobe');
});

test('properti (sweep 200 event seeded): jadwal ⊆ {lesson dengan L >= 0.95}', () => {
  const rand = mulberry32(0xE4);
  const events = [];
  const trulyMastered = new Set();
  for (let i = 0; i < 200; i++) {
    const lesson = 'lesson_' + i;
    const roll = rand();
    // Campuran: L sah beragam, plus baris korup yang menyaru sebagai mastery.
    let L;
    if (roll < 0.25) L = 0.95 + rand() * 0.05;
    else if (roll < 0.5) L = rand() * 0.949;
    else if (roll < 0.65) L = NaN;
    else if (roll < 0.8) L = '0.99';
    else L = undefined;
    if (typeof L === 'number' && isFinite(L) && L >= 0.95) trulyMastered.add(lesson);
    events.push({ lesson, L });
  }
  const r = post.schedule(null, events, NOW, { userSeed: SEED });
  for (const id of Object.keys(r.state.probes)) {
    ok(trulyMastered.has(id), 'probe siluman untuk ' + id + ' yang tidak mastery');
  }
  eq(Object.keys(r.state.probes).length, trulyMastered.size, 'semua yang mastery harus terjadwal');
});

// ---------------------------------------------------------------------------------
// Ketahanan korup + tanpa mutasi argumen
// ---------------------------------------------------------------------------------
test('state korup (null/string/angka/array/objek cacat) tidak melempar', () => {
  const junk = [null, undefined, 'rusak', 42, [], { probes: 'bukan objek' },
    { probes: { x: { probes: [{ dueAt: 'nan' }, null, { dueAt: NOW, offsetDays: 3 }] } } }];
  for (const st of junk) {
    const r = post.schedule(st, [mastered('ok_lesson')], NOW, { userSeed: SEED });
    eq(r.state.schema, post.SCHEMA, 'state korup harus jatuh ke bentuk kanonik');
    const ev = post.evaluate(st, [{ lesson: 'ok_lesson', correct: true, predicted: 0.9 }]);
    eq(typeof ev, 'object');
  }
  // Baris probe cacat dibuang, baris sah dipertahankan.
  const norm = post.schedule({ probes: { x: { probes: [{ dueAt: 'nan' }, { dueAt: NOW, offsetDays: 3 }] } } }, [], NOW);
  eq(norm.state.probes.x.probes.length, 1, 'baris probe sah tidak ikut terbuang');
});

test('masteryEvents korup (bukan array / baris sampah) dilewati tanpa melempar', () => {
  eq(post.schedule(null, 'bukan array', NOW).scheduled.length, 0);
  eq(post.schedule(null, null, NOW).scheduled.length, 0);
  const r = post.schedule(null, [null, 7, 'x', {}, { lesson: '', L: 0.99 }, mastered('sah')], NOW, { userSeed: SEED });
  deepEq(Object.keys(r.state.probes), ['sah']);
});

test('schedule tidak memutasi state maupun masteryEvents milik pemanggil', () => {
  const st = post.schedule(null, [mastered('present_simple')], NOW, { userSeed: SEED }).state;
  const stSnap = JSON.stringify(st);
  const events = [mastered('past_simple')];
  const evSnap = JSON.stringify(events);
  Object.freeze(events[0]); Object.freeze(events);
  post.schedule(st, events, NOW + DAY);
  eq(JSON.stringify(st), stSnap, 'state argumen wajib utuh');
  eq(JSON.stringify(events), evSnap, 'masteryEvents argumen wajib utuh');
});

// ---------------------------------------------------------------------------------
// (b) Evaluator: oracle Brier manual, mastery rapuh, adjustments advisory
// ---------------------------------------------------------------------------------
function stateWith(lessons) {
  return post.schedule(null, lessons.map(l => mastered(l)), NOW, { userSeed: SEED }).state;
}

test('Brier cocok dengan hitungan tangan: [(0.9,1),(0.7,0)] -> 0.25', () => {
  const st = stateWith(['a', 'b']);
  const r = post.evaluate(st, [
    { lesson: 'a', correct: true, predicted: 0.9 },   // (0.9-1)^2 = 0.01
    { lesson: 'b', correct: false, predicted: 0.7 }   // (0.7-0)^2 = 0.49
  ]);
  eq(r.brier, 0.25, '(0.01 + 0.49) / 2 = 0.25');
  eq(r.n, 2);
  eq(r.perLesson.a.brier, 0.01);
  eq(r.perLesson.b.brier, 0.49);
});

test('Brier oracle kedua: prediksi sempurna -> 0; tebakan 0.5 terus -> 0.25', () => {
  const st = stateWith(['a', 'b']);
  eq(post.evaluate(st, [
    { lesson: 'a', correct: true, predicted: 1 },
    { lesson: 'b', correct: false, predicted: 0 }
  ]).brier, 0, 'kalibrasi sempurna = 0');
  eq(post.evaluate(st, [
    { lesson: 'a', correct: true, predicted: 0.5 },
    { lesson: 'b', correct: false, predicted: 0.5 }
  ]).brier, 0.25, 'lempar koin = 0.25');
});

test('mastery rapuh: probe gagal saat prediksi >= 0.8 -> flag + rekomendasi shrink', () => {
  const st = stateWith(['fragile_one', 'healthy']);
  const r = post.evaluate(st, [
    { lesson: 'fragile_one', correct: false, predicted: 0.9 },
    { lesson: 'healthy', correct: true, predicted: 0.9 }
  ]);
  eq(r.fragileLessons.length, 1);
  eq(r.fragileLessons[0].lesson, 'fragile_one');
  eq(r.fragileLessons[0].rationale, 'brain3_post_test_fragile_mastery');
  const adj = r.adjustments.find(a => a.lesson === 'fragile_one');
  eq(adj.action, 'shrink_half_life');
  ok(adj.factor < 1 && adj.factor >= 0.5, 'faktor shrink harus di [0.5, 1): ' + adj.factor);
  eq(adj.factor, 0.55, 'oracle: 1 - 0.9*0.5 = 0.55');
});

test('gagal saat prediksi rendah BUKAN rapuh (model sudah bilang akan lupa)', () => {
  const st = stateWith(['expected_fail']);
  const r = post.evaluate(st, [{ lesson: 'expected_fail', correct: false, predicted: 0.5 }]);
  eq(r.fragileLessons.length, 0, 'kegagalan yang diprediksi bukan kerapuhan');
  eq(r.adjustments.length, 0, 'tidak ada kejutan = tidak ada rekomendasi');
});

test('lulus saat prediksi <= 0.6 -> rekomendasi extend_half_life terpagar <= 1.5', () => {
  const st = stateWith(['stronger']);
  const r = post.evaluate(st, [{ lesson: 'stronger', correct: true, predicted: 0.4 }]);
  const adj = r.adjustments.find(a => a.lesson === 'stronger');
  eq(adj.action, 'extend_half_life');
  eq(adj.factor, 1.3, 'oracle: 1 + (1-0.4)*0.5 = 1.3');
  ok(adj.factor > 1 && adj.factor <= 1.5, 'faktor extend harus di (1, 1.5]');
});

test('lesson rapuh TIDAK menerima rekomendasi extend sekaligus (satu arah per evaluasi)', () => {
  const st = stateWith(['mixed']);
  const r = post.evaluate(st, [
    { lesson: 'mixed', correct: false, predicted: 0.95 },
    { lesson: 'mixed', correct: true, predicted: 0.3 }
  ]);
  const acts = r.adjustments.filter(a => a.lesson === 'mixed').map(a => a.action);
  deepEq(acts, ['shrink_half_life'], 'rapuh menang: dua rekomendasi bertolak belakang dilarang');
});

test('adjustments SELALU advisory dan TIDAK menulis ke memori/half-life mana pun', () => {
  const st = stateWith(['fragile_one']);
  const snap = JSON.stringify(st);
  const r = post.evaluate(st, [{ lesson: 'fragile_one', correct: false, predicted: 0.9 }]);
  for (const adj of r.adjustments) {
    eq(adj.advisory, true, 'setiap rekomendasi wajib bertanda advisory');
    ok(!('stability' in adj) && !('halfLifeDays' in adj) && !('nextReview' in adj),
      'rekomendasi tidak boleh menyaru sebagai nilai memori jadi (single-writer FSRS)');
  }
  ok(!('state' in r) && !('memory' in r) && !('stability' in r),
    'evaluate() bersifat baca-saja: tidak mengembalikan state memori apa pun');
  eq(JSON.stringify(st), snap, 'evaluate tidak memutasi state argumen');
});

test('probeResults korup / lesson tanpa jadwal dilewati (skipped), tanpa melempar', () => {
  const st = stateWith(['sah']);
  const rows = [
    null, 42, 'x', {},
    { lesson: 'sah', correct: 'ya', predicted: 0.9 },        // correct bukan boolean
    { lesson: 'sah', correct: true, predicted: 1.7 },         // prediksi di luar [0,1]
    { lesson: 'sah', correct: true, predicted: NaN },
    { lesson: 'tak_terjadwal', correct: true, predicted: 0.9 }, // tidak pernah diprobe
    { lesson: 'sah', correct: true, predicted: 0.8 }          // satu-satunya baris sah
  ];
  const snap = JSON.stringify(rows);
  const r = post.evaluate(st, rows);
  eq(r.n, 1, 'hanya satu baris sah');
  eq(r.skipped, 8);
  eq(r.brier, Math.round((0.8 - 1) ** 2 * 1e6) / 1e6);
  eq(JSON.stringify(rows), snap, 'probeResults argumen wajib utuh');
  eq(post.evaluate(st, 'bukan array').n, 0);
});

test('tanpa baris sah: brier = null, bukan NaN (NaN menular dan berbohong)', () => {
  const r = post.evaluate(null, []);
  eq(r.brier, null);
  deepEq(r.fragileLessons, []);
  deepEq(r.adjustments, []);
});

test('evaluate deterministik: urutan keluaran stabil terlepas urutan masukan', () => {
  const st = stateWith(['b_lesson', 'a_lesson']);
  const rows1 = [
    { lesson: 'b_lesson', correct: false, predicted: 0.9 },
    { lesson: 'a_lesson', correct: false, predicted: 0.85 }
  ];
  const rows2 = [rows1[1], rows1[0]];
  const r1 = post.evaluate(st, rows1);
  const r2 = post.evaluate(st, rows2);
  deepEq(r1.fragileLessons.map(f => f.lesson), ['a_lesson', 'b_lesson'], 'urutan leksikal, bukan urutan tiba');
  eq(JSON.stringify(r1.adjustments), JSON.stringify(r2.adjustments), 'keluaran tidak boleh bergantung urutan masukan');
});

test('konstanta kontrak terekspor dan dibekukan', () => {
  eq(post.SCHEMA, 'fiezel-post-test-v1');
  deepEq(Array.from(post.OFFSETS_DAYS), [3, 7, 21]);
  ok(Object.isFrozen(post.OFFSETS_DAYS), 'offset wajib beku — penjadwal yang bisa digeser diam-diam bukan penjadwal');
  eq(post.MASTERY_L, 0.95, 'ambang harus sama dengan gerbang FiezelMasteryBKT.GATE.L');
});

console.log('assert total: ' + asserts);
if (asserts < 25) { console.error('FAIL - jumlah assert ' + asserts + ' < 25'); failures++; }
if (failures > 0) { console.error('fiezel-post-test-test: ' + failures + ' kegagalan'); process.exit(1); }
console.log('FiezelPostTest gate: PASS');
