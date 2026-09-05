/**
 * FIEZEL gate — Learning Metrics on-device (Braincore v3, mesin metrik longitudinal).
 *
 * Metrik pembelajaran adalah tempat kedua paling berbahaya untuk salah diam-diam setelah
 * model penguasaan: angka "learning gain +0.4" akan dipercaya guru dan orang tua, entah
 * jendelanya benar atau tumpang tindih. Gate ini karenanya tidak memeriksa "apakah ada
 * metriknya", melainkan:
 *
 *   - ANGKANYA BENAR pada fixture kecil yang bisa dihitung tangan (byte-stabil, exact);
 *   - GERBANG KEJUJURAN bekerja: n=0 dan n kecil menghasilkan insufficient/censored
 *     dengan nilai NULL — bukan angka karangan dari data tipis;
 *   - DETERMINISTIK: fixture sintetis besar (mulberry32 seed tetap) menghasilkan output
 *     yang identik byte-per-byte lintas pemanggilan (dan lintas commit, via arah semantik);
 *   - MURNI: input yang di-deep-freeze tidak membuat modul melempar ataupun memutasi.
 */
const assert = require('assert');
const M = require('../features/brain/fiezel-learning-metrics.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const DAY = 86400000;
const NOW = Date.parse('2026-08-28T00:00:00Z');
const T0 = NOW - 120 * DAY;

// PRNG seeded (mulberry32) — sesuai kontrak: tanpa Math.random tanpa seed di mana pun.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deepFreeze(x) {
  if (x && typeof x === 'object') {
    Object.getOwnPropertyNames(x).forEach(k => deepFreeze(x[k]));
    Object.freeze(x);
  }
  return x;
}

function row(atDays, ok, extra) {
  return Object.assign({
    at: T0 + atDays * DAY, ok: ok, ms: 4000, type: 'grammar',
    skill: 'articles', target: 'it-default', reviewKey: ''
  }, extra || {});
}

// ---------------------------------------------------------------------------------
// 1. learningGain — fixture hitung-tangan, byte-stabil.
// ---------------------------------------------------------------------------------
const gainFixture = deepFreeze([
  // lesson 'past_simple': 8 jawaban; jendela awal k=3 -> [0,0,1] = 0.3333;
  // jendela akhir -> [1,1,1] = 1.0; gain = +0.6667.
  row(0, false, { reviewKey: 'past_simple' }),
  row(1, false, { reviewKey: 'past_simple' }),
  row(2, true, { reviewKey: 'past_simple' }),
  row(3, false, { reviewKey: 'past_simple' }),
  row(4, true, { reviewKey: 'past_simple' }),
  row(5, true, { reviewKey: 'past_simple' }),
  row(6, true, { reviewKey: 'past_simple' }),
  row(7, true, { reviewKey: 'past_simple' }),
  // lesson 'articles': hanya 4 jawaban -> harus DISENSOR (n < 2k), bukan dihitung.
  row(0, true, { reviewKey: 'articles' }),
  row(1, true, { reviewKey: 'articles' }),
  row(2, true, { reviewKey: 'articles' }),
  row(3, true, { reviewKey: 'articles' })
]);

test('learningGain: akurasi jendela awal vs akhir dihitung persis (fixture tangan)', () => {
  const r = M.learningGain(gainFixture, 3, NOW);
  const ps = r.lessons.find(l => l.lesson === 'past_simple');
  assert.strictEqual(ps.n, 8);
  assert.strictEqual(ps.early.accuracy, 0.3333);
  assert.strictEqual(ps.late.accuracy, 1);
  assert.strictEqual(ps.gain, 0.6667);
  assert.strictEqual(ps.insufficient, false);
  assert.strictEqual(ps.confidence, 0.375); // 2k=6 bukti terpakai: 6/16
  assert.strictEqual(ps.rationale, 'brain3_metric_learning_gain');
});

test('learningGain: lesson dengan n < 2k disensor jujur (gain null, confidence 0)', () => {
  const r = M.learningGain(gainFixture, 3, NOW);
  const ar = r.lessons.find(l => l.lesson === 'articles');
  assert.strictEqual(ar.insufficient, true);
  assert.strictEqual(ar.gain, null);
  assert.strictEqual(ar.early, null);
  assert.strictEqual(ar.confidence, 0);
  assert.strictEqual(ar.rationale, 'brain3_metric_learning_gain_insufficient');
  assert.strictEqual(r.censored, true);       // ada sub-hasil yang disensor
  assert.strictEqual(r.insufficient, false);  // tapi metrik utamanya tetap hidup
  assert.strictEqual(r.nReported, 1);
  assert.strictEqual(r.rationale, 'brain3_metric_learning_gain');
});

test('learningGain: riwayat kosong -> insufficient total, tanpa angka karangan', () => {
  const r = M.learningGain([], 10, NOW);
  assert.strictEqual(r.n, 0);
  assert.strictEqual(r.insufficient, true);
  assert.strictEqual(r.confidence, 0);
  assert.deepStrictEqual(r.lessons, []);
  assert.strictEqual(r.rationale, 'brain3_metric_learning_gain_insufficient');
});

test('learningGain: k di-clamp ke [3..50] dan default 10', () => {
  assert.strictEqual(M.learningGain([], 1, NOW).k, 3);
  assert.strictEqual(M.learningGain([], 999, NOW).k, 50);
  assert.strictEqual(M.learningGain([], undefined, NOW).k, 10);
});

// ---------------------------------------------------------------------------------
// 2. retentionAtGap — bucket kumulatif, hanya pasangan yang awalnya BENAR.
// ---------------------------------------------------------------------------------
const retentionFixture = deepFreeze([].concat(
  // 8 item: kemunculan pertama BENAR di hari 0, kemunculan ulang pada jeda tertentu.
  [['w1', 8, true], ['w2', 9, true], ['w3', 10, false], ['w4', 15, true],
   ['w5', 16, false], ['w6', 31, true], ['w7', 32, false], ['w8', 40, true]]
    .flatMap(([id, gap, ok2]) => [
      row(0, true, { target: id }),
      row(gap, ok2, { target: id })
    ]),
  // w9: kemunculan pertama SALAH -> pasangannya TIDAK dihitung (belum ada yang diretensi).
  [row(0, false, { target: 'w9' }), row(20, true, { target: 'w9' })]
));

test('retentionAtGap: akurasi per bucket persis hitungan tangan (7: 5/8, 14: 3/5)', () => {
  const r = M.retentionAtGap(retentionFixture, [7, 14, 30], NOW);
  assert.strictEqual(r.n, 8); // w9 tersingkir: awalnya salah
  const b7 = r.buckets.find(b => b.gapDays === 7);
  assert.strictEqual(b7.n, 8);
  assert.strictEqual(b7.accuracy, 0.625);
  assert.strictEqual(b7.insufficient, false);
  const b14 = r.buckets.find(b => b.gapDays === 14);
  assert.strictEqual(b14.n, 5);
  assert.strictEqual(b14.accuracy, 0.6);
  assert.strictEqual(b14.confidence, 0.333);
  assert.strictEqual(r.rationale, 'brain3_metric_retention_gap');
});

test('retentionAtGap: bucket 30 hanya punya 3 pasangan -> disensor (accuracy null)', () => {
  const r = M.retentionAtGap(retentionFixture, [7, 14, 30], NOW);
  const b30 = r.buckets.find(b => b.gapDays === 30);
  assert.strictEqual(b30.n, 3);
  assert.strictEqual(b30.accuracy, null);
  assert.strictEqual(b30.insufficient, true);
  assert.strictEqual(b30.confidence, 0);
  assert.strictEqual(r.censored, true);
});

test('retentionAtGap: riwayat kosong -> semua bucket insufficient', () => {
  const r = M.retentionAtGap([], [7, 14, 30], NOW);
  assert.strictEqual(r.n, 0);
  assert.strictEqual(r.insufficient, true);
  assert.ok(r.buckets.every(b => b.insufficient && b.accuracy === null));
});

test('retentionAtGap: bucket default [7,14,30] dan bucket cacat dibersihkan', () => {
  const r = M.retentionAtGap([], null, NOW);
  assert.deepStrictEqual(r.buckets.map(b => b.gapDays), [7, 14, 30]);
  const r2 = M.retentionAtGap([], [30, 7, 7, -1, 'x', 14], NOW);
  assert.deepStrictEqual(r2.buckets.map(b => b.gapDays), [7, 14, 30]);
});

// ---------------------------------------------------------------------------------
// 3. brierCalibration — skor dan band persis hitungan tangan.
// ---------------------------------------------------------------------------------
const brierFixture = deepFreeze([].concat(
  // band 0.8-1.0: p=0.9 lima kali, hasil [1,1,1,0,1] -> acc 0.8, gap -0.1 (overconfident)
  [true, true, true, false, true].map((ok, i) => row(i, ok, { predicted: 0.9, target: 'b' + i })),
  // band 0.2-0.4: p=0.3 lima kali, hasil [0,0,1,0,0] -> acc 0.2, gap -0.1
  [false, false, true, false, false].map((ok, i) => row(10 + i, ok, { predicted: 0.3, target: 'c' + i })),
  // baris TANPA predicted tidak boleh ikut dihitung sama sekali
  [row(20, true, { target: 'd0' })]
));

test('brierCalibration: Brier total, baseline, dan skill score persis hitungan tangan', () => {
  const r = M.brierCalibration(brierFixture, NOW);
  assert.strictEqual(r.n, 10); // baris tanpa predicted tersingkir
  // brier = (4*(0.1)^2 + 0.81 + 4*(0.09) + 0.49)/10 = 0.17
  assert.strictEqual(r.brier, 0.17);
  assert.strictEqual(r.baselineBrier, 0.25); // base rate 0.5
  assert.strictEqual(r.skillScore, 0.32);    // 1 - 0.17/0.25
  assert.strictEqual(r.confidence, 0.5);
  assert.strictEqual(r.insufficient, false);
  assert.strictEqual(r.rationale, 'brain3_metric_brier_calibration');
});

test('brierCalibration: band melaporkan arah bias (gap negatif = overconfident)', () => {
  const r = M.brierCalibration(brierFixture, NOW);
  const hi = r.bands.find(b => b.band === '0.8-1.0');
  assert.strictEqual(hi.n, 5);
  assert.strictEqual(hi.meanPredicted, 0.9);
  assert.strictEqual(hi.accuracy, 0.8);
  assert.strictEqual(hi.gap, -0.1);
  assert.strictEqual(hi.brier, 0.17);
  const lo = r.bands.find(b => b.band === '0.2-0.4');
  assert.strictEqual(lo.gap, -0.1);
  // band kosong bukan sensor - memang tidak ada prediksi di sana
  const mid = r.bands.find(b => b.band === '0.4-0.6');
  assert.strictEqual(mid.n, 0);
  assert.strictEqual(mid.insufficient, true);
});

test('brierCalibration: n=0 dan n<10 -> insufficient, brier null', () => {
  const empty = M.brierCalibration([], NOW);
  assert.strictEqual(empty.n, 0);
  assert.strictEqual(empty.insufficient, true);
  assert.strictEqual(empty.brier, null);
  // 9 prediksi = satu kurang dari gerbang: tetap jujur menolak
  const nine = M.brierCalibration(brierFixture.slice(0, 9), NOW);
  assert.strictEqual(nine.n, 9);
  assert.strictEqual(nine.insufficient, true);
  assert.strictEqual(nine.brier, null);
  assert.strictEqual(nine.confidence, 0);
  assert.strictEqual(nine.rationale, 'brain3_metric_brier_calibration_insufficient');
  // riwayat ada tapi TANPA field predicted sama dengan tidak ada prediksi
  const noPred = M.brierCalibration([row(0, true), row(1, false)], NOW);
  assert.strictEqual(noPred.n, 0);
  assert.strictEqual(noPred.insufficient, true);
});

// ---------------------------------------------------------------------------------
// 4. hintDependency — tiga jalur deteksi bantuan + gerbang per-skill.
// ---------------------------------------------------------------------------------
const hintFixture = deepFreeze([
  // 4 jawaban berbantuan lewat TIGA jalur deteksi berbeda
  row(0, true, { hintUsed: true }),
  row(1, true, { hints: 2 }),
  row(2, true, { scaffold: 'hint' }),
  row(3, false, { scaffold: 'tell' }),
  // 6 jawaban mandiri ('probe' bukan bantuan - itu anak tangga dasar)
  row(4, true, { scaffold: 'probe' }),
  row(5, false, {}),
  row(6, true, {}),
  row(7, false, {}),
  row(8, true, {}),
  row(9, false, {})
]);

test('hintDependency: hintRate dan akurasi terbelah persis (fixture tangan)', () => {
  const r = M.hintDependency(hintFixture, NOW);
  assert.strictEqual(r.n, 10);
  assert.strictEqual(r.hintRate, 0.4);
  assert.strictEqual(r.dependency, 'moderate');
  assert.strictEqual(r.hinted.n, 4);
  assert.strictEqual(r.hinted.accuracy, 0.75);
  assert.strictEqual(r.unhinted.n, 6);
  assert.strictEqual(r.unhinted.accuracy, 0.5);
  assert.strictEqual(r.confidence, 0.5);
  assert.strictEqual(r.rationale, 'brain3_metric_hint_dependency');
  assert.strictEqual(r.perSkill.length, 1);
  assert.strictEqual(r.perSkill[0].skill, 'articles');
  assert.strictEqual(r.perSkill[0].hintRate, 0.4);
});

test('hintDependency: n<8 -> insufficient; skill tipis disensor dari rincian', () => {
  const thin = M.hintDependency(hintFixture.slice(0, 5), NOW);
  assert.strictEqual(thin.insufficient, true);
  assert.strictEqual(thin.hintRate, null);
  assert.strictEqual(thin.dependency, null);
  assert.strictEqual(thin.confidence, 0);
  // 8 baris skill A (lolos) + 2 baris skill B (n<5 -> disensor dari perSkill)
  const mixed = M.hintDependency(hintFixture.slice(0, 8).concat([
    row(10, true, { skill: 'tenses' }), row(11, false, { skill: 'tenses' })
  ]), NOW);
  assert.strictEqual(mixed.insufficient, false);
  assert.strictEqual(mixed.perSkill.length, 1);
  assert.strictEqual(mixed.perSkill[0].skill, 'articles');
  assert.strictEqual(mixed.censored, true);
});

// ---------------------------------------------------------------------------------
// 5. misconceptionPersistence — status dari snapshot ledger, decay 14 hari.
// ---------------------------------------------------------------------------------
const logitOf = p => Math.log(p / (1 - p));
const ledgerFixture = deepFreeze({
  schema: 'fiezel-misconception-ledger-v1',
  entries: {
    'articles::article-before-possessive': {
      concept: 'articles', misconception: 'article-before-possessive',
      logOdds: logitOf(0.9), lastMs: NOW, hits: 4, sessions: ['s1', 's2'], everActive: true
    },
    'tense::past-for-present': {
      concept: 'tense', misconception: 'past-for-present',
      logOdds: logitOf(0.2), lastMs: NOW, hits: 5, sessions: ['s1', 's2', 's3'], everActive: true
    },
    'plural::overgeneralization': {
      concept: 'plural', misconception: 'overgeneralization',
      logOdds: logitOf(0.5), lastMs: NOW, hits: 1, sessions: ['s1'], everActive: false
    },
    'rusak::': { concept: 'rusak', misconception: '' } // entri korup -> dibuang diam-diam
  }
});

test('misconceptionPersistence: klasifikasi active/resolved/watch sesuai gerbang ledger', () => {
  const r = M.misconceptionPersistence(ledgerFixture, NOW);
  assert.strictEqual(r.n, 3); // entri korup tidak dihitung
  const by = {};
  r.entries.forEach(e => { by[e.concept] = e; });
  assert.strictEqual(by.articles.status, 'active');   // belief 0.9, 4 bukti, 2 sesi
  assert.strictEqual(by.articles.belief, 0.9);
  assert.strictEqual(by.tense.status, 'resolved');    // pernah aktif, belief 0.2 <= 0.3
  assert.strictEqual(by.plural.status, 'watch');      // bukti/sesi belum cukup dituduh
  assert.strictEqual(r.activeCount, 1);
  assert.strictEqual(r.resolvedCount, 1);
  assert.strictEqual(r.watchCount, 1);
  // hanya 2 entri berstatus jelas (< 3): rasio persistensi DISENSOR, bukan dikarang
  assert.strictEqual(r.persistenceRate, null);
  assert.strictEqual(r.censored, true);
  assert.strictEqual(r.rationale, 'brain3_metric_misconception_persistence');
});

test('misconceptionPersistence: decay half-life 14 hari persis kontrak ledger', () => {
  const snap = {
    schema: 'fiezel-misconception-ledger-v1',
    entries: {
      'x::y': { concept: 'x', misconception: 'y', logOdds: logitOf(0.9),
        lastMs: NOW - 14 * DAY, hits: 4, sessions: ['s1', 's2'], everActive: true }
    }
  };
  const r = M.misconceptionPersistence(snap, NOW);
  // prior logit(0.1) = -logit(0.9): setelah tepat satu paruh-waktu, log-odds jatuh ke
  // titik tengah = 0 -> belief 0.5. Angka bulat ini sengaja dipilih agar exact.
  assert.strictEqual(r.entries[0].belief, 0.5);
  assert.strictEqual(r.entries[0].status, 'watch'); // 0.5 < 0.7: tidak lagi dituduh aktif
});

test('misconceptionPersistence: snapshot null/asing -> insufficient n=0', () => {
  for (const bad of [null, undefined, 42, 'x', [], { schema: 'lain-v9', entries: {} }]) {
    const r = M.misconceptionPersistence(bad, NOW);
    assert.strictEqual(r.n, 0);
    assert.strictEqual(r.insufficient, true);
    assert.strictEqual(r.persistenceRate, null);
    assert.strictEqual(r.confidence, 0);
  }
});

// ---------------------------------------------------------------------------------
// Kemurnian: input beku tidak melempar dan tidak termutasi; baris cacat dibuang.
// ---------------------------------------------------------------------------------
test('kemurnian: semua fungsi menerima input deep-frozen tanpa melempar/memutasi', () => {
  const before = JSON.stringify(gainFixture);
  M.learningGain(gainFixture, 3, NOW);
  M.retentionAtGap(retentionFixture, [7, 14, 30], NOW);
  M.brierCalibration(brierFixture, NOW);
  M.hintDependency(hintFixture, NOW);
  M.misconceptionPersistence(ledgerFixture, NOW);
  assert.strictEqual(JSON.stringify(gainFixture), before, 'riwayat pemanggil termutasi');
});

test('sanitasi: baris tanpa stempel waktu sah dibuang, bukan diberi waktu karangan', () => {
  const r = M.learningGain([{ ok: true }, { at: 'x', ok: true }, null, 7], 3, NOW);
  assert.strictEqual(r.n, 0);
  assert.strictEqual(r.insufficient, true);
});

// ---------------------------------------------------------------------------------
// Fixture sintetis besar (seeded) — determinisme byte-per-byte + arah semantik.
// ---------------------------------------------------------------------------------
function syntheticHistory(seed) {
  const rand = mulberry32(seed);
  const rows = [];
  // Murid MEMBAIK di past_simple: p naik 0.35 -> 0.90 sepanjang 60 jawaban / 90 hari.
  for (let i = 0; i < 60; i++) {
    const p = 0.35 + 0.55 * (i / 59);
    rows.push(row(i * 1.5, rand() < p, {
      reviewKey: 'past_simple', skill: 'tense_aspect',
      target: 'ps-' + (i % 8),                    // item berulang ~12 hari -> bucket retensi 7
      predicted: Math.min(0.95, p + 0.12),        // model sengaja overconfident +0.12
      hintUsed: rand() < 0.2
    }));
  }
  // Murid STAGNAN di conditionals: p tetap 0.5 sepanjang 40 jawaban.
  for (let i = 0; i < 40; i++) {
    rows.push(row(2 + i * 2, rand() < 0.5, {
      reviewKey: 'conditionals', skill: 'conditionals',
      target: 'cd-' + (i % 5),
      predicted: 0.5, scaffold: rand() < 0.5 ? 'hint' : ''
    }));
  }
  return rows;
}

test('determinisme: seed sama -> keluaran identik byte-per-byte di semua metrik', () => {
  const h1 = syntheticHistory(20260828);
  const h2 = syntheticHistory(20260828);
  assert.strictEqual(JSON.stringify(h1), JSON.stringify(h2), 'fixture seeded harus identik');
  const runs = [h1, h2].map(h => JSON.stringify([
    M.learningGain(h, 10, NOW),
    M.retentionAtGap(h, [7, 14, 30], NOW),
    M.brierCalibration(h, NOW),
    M.hintDependency(h, NOW)
  ]));
  assert.strictEqual(runs[0], runs[1], 'output metrik harus byte-stabil');
});

test('arah semantik pada fixture seeded: gain positif utk murid membaik, ~nol utk stagnan', () => {
  const h = syntheticHistory(20260828);
  const g = M.learningGain(h, 10, NOW);
  const ps = g.lessons.find(l => l.lesson === 'past_simple');
  const cd = g.lessons.find(l => l.lesson === 'conditionals');
  assert.ok(ps.gain > 0.15, 'murid membaik harus terbaca gain positif, dapat ' + ps.gain);
  assert.ok(Math.abs(cd.gain) < 0.35, 'murid stagnan tidak boleh terbaca melejit, dapat ' + cd.gain);
  const b = M.brierCalibration(h, NOW);
  assert.strictEqual(b.insufficient, false);
  const hi = b.bands.filter(x => !x.insufficient && x.n >= 10);
  assert.ok(hi.length > 0, 'harus ada band kalibrasi yang lolos gerbang');
  const ret = M.retentionAtGap(h, [7, 14, 30], NOW);
  const b7 = ret.buckets.find(x => x.gapDays === 7);
  assert.ok(b7.n >= 5 && b7.accuracy !== null, 'item berulang 12 harian harus mengisi bucket 7');
  const hint = M.hintDependency(h, NOW);
  assert.strictEqual(hint.insufficient, false);
  assert.ok(hint.hintRate > 0.15 && hint.hintRate < 0.6, 'hintRate campuran 20%/50% harus di tengah');
});

// Ekspektasi TERPATRI (pinned) dari fixture seeded — kalau angka ini berubah, ada yang
// mengubah semantik metrik, dan itu harus terlihat di code review, bukan lolos senyap.
const EXPECTED_PINNED = { psGain: 0.8, cdGain: -0.1, brier: 0.2454, skillScore: 0.015, ret7: 0.5135, ret7n: 37, hintRate: 0.22, hintedN: 22 };
test('ekspektasi terpatri: nilai kunci fixture seeded 20260828 tidak bergeser', () => {
  const h = syntheticHistory(20260828);
  const g = M.learningGain(h, 10, NOW);
  const ps = g.lessons.find(l => l.lesson === 'past_simple');
  const cd = g.lessons.find(l => l.lesson === 'conditionals');
  const b = M.brierCalibration(h, NOW);
  const ret = M.retentionAtGap(h, [7, 14, 30], NOW);
  const hint = M.hintDependency(h, NOW);
  const pinned = {
    psGain: ps.gain, cdGain: cd.gain,
    brier: b.brier, skillScore: b.skillScore,
    ret7: ret.buckets[0].accuracy, ret7n: ret.buckets[0].n,
    hintRate: hint.hintRate, hintedN: hint.hinted.n
  };
  assert.deepStrictEqual(pinned, EXPECTED_PINNED,
    'nilai terpatri bergeser: ' + JSON.stringify(pinned));
});

// ---------------------------------------------------------------------------------
if (failures) {
  console.error(failures + ' kegagalan');
  process.exit(1);
}
console.log('LearningMetrics: PASS');
