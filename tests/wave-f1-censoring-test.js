/**
 * FIEZEL gate — Wave F1: gerbang overperformance berkelanjutan (regresi censoring mastery).
 *
 * Temuan (E2 forensik + research_hold adaptivity-simulation-v3): kebijakan shipped
 * v2_residual menahan murid yang membaik jauh lebih lama dari perlu — mastery 35 hari
 * hanya ~13% run vs v1 ~44%. Akar masalahnya jangkar targetDifficulty mengikuti taksiran
 * kemampuan yang TERTINGGAL dari kemampuan nyata (item mudah -> informasi Fisher kecil ->
 * taksiran makin lambat menyusul), dan tidak ada satu cabang pun di planSession yang
 * membaca bukti "murid terus mengalahkan prediksi model".
 *
 * Perbaikan yang dikawal gate ini (features/brain/fiezel-core-brain.js):
 *   1. momentum() basis residual mengekspor `residualPositiveShare` — porsi blok jendela
 *      yang mean residualnya positif (mengalahkan prediksi), 0..1;
 *   2. planSession menaikkan kesulitan satu tingkat DI DALAM pita (ceiling p=0.55) bila
 *      share >= 0.75 dan murid tidak sedang declining — rationale 'sustained_overperformance'.
 *
 * Gate ini memeriksa KEPUTUSAN, bukan keberadaan kode: kapan cabang boleh menyala, kapan
 * WAJIB diam (declining, basis accuracy, bukti tipis), dan bahwa pagar lama tidak bergeser.
 */
'use strict';
const assert = require('assert');
const brain = require('../features/brain/fiezel-core-brain.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-22T12:00:00Z');
const DAY = 86400000;

/** 40 baris deterministik; polaBlok = array 8 nilai true/false per blok-5 (true = blok mengalahkan prediksi). */
function rowsDenganBlok(polaBlok) {
  const rows = [];
  for (let b = 0; b < polaBlok.length; b++) {
    for (let i = 0; i < 5; i++) {
      const idx = b * 5 + i;
      rows.push({
        at: NOW - (40 - idx) * (DAY / 8),
        ok: !!polaBlok[b],
        ms: 6000,
        predicted: 0.5, // residual = ±0.5, tanda blok = polaBlok
        type: 'grammar',
        skill: 'past_simple_vs_present_perfect'
      });
    }
  }
  return rows;
}

test('momentum basis residual mengekspor residualPositiveShare yang benar', () => {
  const enamDariDelapan = brain.momentum(rowsDenganBlok([false, false, true, true, true, true, true, true]));
  assert.strictEqual(enamDariDelapan.basis, 'residual', 'basis harus residual saat semua baris membawa predicted');
  assert.strictEqual(enamDariDelapan.residualPositiveShare, 0.75, '6 dari 8 blok positif = share 0.75');
  assert.strictEqual(enamDariDelapan.residualStreak, 6, 'streak lama tetap utuh (6 blok terakhir positif)');

  const semuaPositif = brain.momentum(rowsDenganBlok([true, true, true, true, true, true, true, true]));
  assert.strictEqual(semuaPositif.residualPositiveShare, 1, 'semua blok positif = share 1');

  const semuaNegatif = brain.momentum(rowsDenganBlok([false, false, false, false, false, false, false, false]));
  assert.strictEqual(semuaNegatif.residualPositiveShare, 0, 'tak ada blok positif = share 0');
});

test('basis accuracy TIDAK memiliki residualPositiveShare (perilaku lama utuh)', () => {
  const tanpaPrediksi = rowsDenganBlok([true, true, true, true, true, true, true, true])
    .map((r) => { const c = Object.assign({}, r); delete c.predicted; return c; });
  const move = brain.momentum(tanpaPrediksi);
  assert.strictEqual(move.basis, 'accuracy');
  assert.strictEqual(move.residualPositiveShare, undefined, 'field baru hanya boleh ada di basis residual');
  assert.strictEqual(move.residualStreak, undefined, 'streak juga tetap khusus residual');
});

// Sinyal dasar planSession: kemampuan cukup yakin, plateau yang TIDAK meyakinkan
// (confidence < 0.5, jadi plateau_break tidak menyala) — persis rezim jebakan jangkar.
const dasar = {
  ability: { ability: 2.5, confidence: 0.6 },
  fatigue: { state: 'fresh', level: 0.1 },
  dueReviews: 4,
  atRiskReviews: 0,
  abandonmentRate: 5
};
const jendela = brain.challengeWindow(2.5, {});

test('share >= 0.75 tanpa declining => kesulitan naik satu tingkat + rationale sustained_overperformance', () => {
  const plan = brain.planSession(Object.assign({}, dasar, {
    momentum: { state: 'plateau', confidence: 0.3, basis: 'residual', residualPositiveShare: 0.75, residualStreak: 1 }
  }));
  assert.ok(plan.rationale.indexOf('sustained_overperformance') !== -1, 'rationale harus menjelaskan alasannya');
  assert.strictEqual(plan.targetDifficulty, Math.min(jendela.ceiling, jendela.targetDifficulty + 1), 'naik 1 di dalam pita');
  assert.ok(plan.targetDifficulty <= jendela.ceiling, 'ceiling p=0.55 tetap pagar');
});

test('share di bawah ambang => jangkar lama, tidak ada bump', () => {
  const plan = brain.planSession(Object.assign({}, dasar, {
    momentum: { state: 'plateau', confidence: 0.3, basis: 'residual', residualPositiveShare: 0.625, residualStreak: 2 }
  }));
  assert.strictEqual(plan.rationale.indexOf('sustained_overperformance'), -1);
  assert.strictEqual(plan.targetDifficulty, jendela.targetDifficulty);
});

test('declining TIDAK pernah di-bump meski share tinggi (guard false-decline tak tersentuh)', () => {
  const plan = brain.planSession(Object.assign({}, dasar, {
    momentum: { state: 'declining', confidence: 0.8, basis: 'residual', residualPositiveShare: 0.875 }
  }));
  assert.strictEqual(plan.rationale.indexOf('sustained_overperformance'), -1);
  assert.ok(plan.rationale.indexOf('trend_declining') !== -1, 'cabang declining lama tetap menang');
  assert.strictEqual(plan.targetDifficulty, Math.max(jendela.floor, jendela.targetDifficulty - 1));
});

test('cabang lama tetap prioritas: improving meyakinkan memakai trend_improving, bukan cabang baru', () => {
  const plan = brain.planSession(Object.assign({}, dasar, {
    momentum: { state: 'improving', confidence: 0.8, basis: 'residual', residualPositiveShare: 1 }
  }));
  assert.ok(plan.rationale.indexOf('trend_improving') !== -1);
  assert.strictEqual(plan.rationale.indexOf('sustained_overperformance'), -1, 'else-if: tidak dobel');
  assert.strictEqual(plan.targetDifficulty, Math.min(jendela.ceiling, jendela.targetDifficulty + 1));
});

test('tanpa field share (payload lama / basis accuracy) => perilaku lama byte per byte', () => {
  const tanpaShare = brain.planSession(Object.assign({}, dasar, {
    momentum: { state: 'plateau', confidence: 0.3 }
  }));
  assert.strictEqual(tanpaShare.rationale.indexOf('sustained_overperformance'), -1);
  assert.strictEqual(tanpaShare.targetDifficulty, jendela.targetDifficulty);
});

test('bump terjepit ceiling saat jendela sempit', () => {
  const sempit = brain.challengeWindow(1.2, {});
  const plan = brain.planSession(Object.assign({}, dasar, {
    ability: { ability: 1.2, confidence: 0.6 },
    momentum: { state: 'plateau', confidence: 0.3, basis: 'residual', residualPositiveShare: 1 }
  }));
  assert.ok(plan.targetDifficulty <= sempit.ceiling, 'tidak boleh menembus ceiling');
  assert.ok(plan.targetDifficulty >= 1 && plan.targetDifficulty <= 6, 'clamp global 1..6');
});

test('deterministik: masukan identik -> keluaran identik', () => {
  const sig = Object.assign({}, dasar, {
    momentum: { state: 'plateau', confidence: 0.3, basis: 'residual', residualPositiveShare: 0.75 }
  });
  assert.strictEqual(JSON.stringify(brain.planSession(sig)), JSON.stringify(brain.planSession(sig)));
});

if (failures > 0) {
  console.error('\n' + failures + ' kegagalan.');
  process.exit(1);
}
console.log('\nSemua pemeriksaan Wave F1 lulus.');
