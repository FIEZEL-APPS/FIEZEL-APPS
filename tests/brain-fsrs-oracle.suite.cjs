#!/usr/bin/env node
'use strict';
/**
 * tests/brain-fsrs-oracle-test.js
 *
 * Menguji modul murni features/brain/fiezel-fsrs-bridge.js (FiezelFsrsOracle):
 *   1. Identitas matematika eksak: R(S, S) === 0.90, R(stabilityToHalfLife(S), S) === 0.50,
 *      serta round-trip halfLifeToStability(stabilityToHalfLife(S)) === S (presisi < 1e-12).
 *   2. Monotonisitas & pemulihan lupa FSRS-6: Good/Easy meningkatkan Stability, Again menurunkan
 *      Stability ke bawah nilai sebelumnya, dan tebakan cepat ('guess') tidak mendapat bonus Easy.
 *   3. Pagar keamanan Optimizer Personal:
 *      - Menolak optimasi bila ulasan lintas-hari < 200 (fail-closed ke FSRS6_DEFAULT_WEIGHTS).
 *      - Menghormati kill-switch halt: true.
 *      - Menerima bobot personal pada data sintetis >= 200 ulasan lintas-hari HANYA bila
 *        out-of-sample time-series logLoss membaik nyata, serta mencatat ke FiezelParamLedger.
 *      - optimizePersonalWeightsAsync berjalan bersih dan mengembalikan hasil konsisten.
 */
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const Oracle = require(path.join(ROOT, 'features/brain/fiezel-fsrs-bridge.js'));
const ParamLedger = require(path.join(ROOT, 'features/brain/fiezel-param-ledger.js'));

let passed = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  passed++;
  console.log('  ok - ' + msg);
}

console.log('[TEST] Braincore FSRS-6 Reference Oracle & Bounded Personal Optimizer');

// 1. Exact Mathematical Identities (Stability R=0.9 <-> Half-Life R=0.5)
for (const s of [0.5, 2.3065, 10, 45.7, 180]) {
  const rAtS = Oracle.forgettingCurve(s, s);
  ok(Math.abs(rAtS - 0.9) < 1e-12, `R(S=${s}, S=${s}) === 0.90 eksak (dapat ${rAtS})`);
  const h = Oracle.stabilityToHalfLife(s);
  const rAtH = Oracle.forgettingCurve(h, s);
  ok(Math.abs(rAtH - 0.5) < 1e-12, `R(h=${h.toFixed(4)}, S=${s}) === 0.50 eksak (dapat ${rAtH})`);
  const sBack = Oracle.halfLifeToStability(h);
  ok(Math.abs(sBack - s) < 1e-12, `Round-trip S -> h -> S identik untuk S=${s}`);
}

// 2. FSRS-6 State Transitions & Rating Mapping
const fsrs = Oracle.createFSRS6();
const st0 = fsrs.step(null, 0, Oracle.Rating.Good);
ok(Math.abs(st0.stability - Oracle.FSRS6_DEFAULT_WEIGHTS[2]) < 1e-9, 'Initial Good stability = w[2] (2.3065)');
const st1 = fsrs.step(st0, 3, Oracle.Rating.Good);
ok(st1.stability > st0.stability, 'Recall Good setelah 3 hari meningkatkan Stability');
const stEasy = fsrs.step(st0, 3, Oracle.Rating.Easy);
ok(stEasy.stability > st1.stability, 'Recall Easy meningkatkan Stability lebih tinggi daripada Good');
const stFail = fsrs.step(st1, 5, Oracle.Rating.Again);
ok(stFail.stability < st1.stability, 'Lapse Again menurunkan Stability di bawah nilai sebelumnya');

ok(Oracle.fiezelAttemptToFsrsRating({ ok: false, timing: 'fluent' }) === Oracle.Rating.Again, 'Attempt salah -> Again');
ok(Oracle.fiezelAttemptToFsrsRating({ ok: true, timing: 'struggled' }) === Oracle.Rating.Hard, 'Attempt struggled -> Hard');
ok(Oracle.fiezelAttemptToFsrsRating({ ok: true, timing: 'guess', streak: 10 }) === Oracle.Rating.Good, 'Tebakan cepat tidak pernah diberi Easy');

// 3. Guardrail 1 & 2: Sample Floor (< 200 cross-day reviews) & Kill Switch
const DAY = 86400000;
const smallAttempts = [];
for (let i = 0; i < 30; i++) {
  smallAttempts.push({ item: 'k-' + i, at: 1000000 + i * 1000, ok: true, timing: 'fluent' });
  smallAttempts.push({ item: 'k-' + i, at: 1000000 + i * 1000 + 3 * DAY, ok: true, timing: 'fluent' });
}
const heldSmall = Oracle.optimizePersonalWeights(smallAttempts, { nowMs: 9000000 });
ok(heldSmall.accepted === false && heldSmall.reason === 'insufficient_crossDayReviews'.replace('DayR', '_day_r'),
  'Menolak optimasi bila ulasan lintas-hari < 200 (dapat ' + heldSmall.crossDayReviews + ')');
ok(JSON.stringify(heldSmall.weights) === JSON.stringify(Array.from(Oracle.FSRS6_DEFAULT_WEIGHTS)),
  'Bobot tetap FSRS6_DEFAULT_WEIGHTS saat sampel belum cukup');

const halted = Oracle.optimizePersonalWeights(smallAttempts, { halt: true });
ok(halted.accepted === false && halted.reason === 'halt_active', 'Kill-switch halt:true menghentikan optimasi seketika');

// 4. Guardrail 3, 4 & 5: Out-of-Sample Promotion on >= 200 Cross-Day Reviews + ParamLedger Chain
// Bangun riwayat deterministik murid dengan daya ingat jauh lebih cepat meluruh (decay tinggi = 0.42, S0 rendah = 0.8)
// sehingga bobot bawaan FSRS-6 terlalu optimistis dan bobot personal terbukti menurunkan OOS logLoss secara signifikan.
const fastForgetterModel = Oracle.createFSRS6([
  0.15, 0.65, 0.90, 3.2,
  6.4133, 0.8334, 3.0194, 0.001,
  1.25, 0.1666, 0.796, 0.85,
  0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658,
  0.42
]);

const richAttempts = [];
let baseTime = 1700000000000;
for (let cardIdx = 0; cardIdx < 80; cardIdx++) {
  let state = null;
  let cursor = baseTime + cardIdx * 3600000;
  // 5 review lintas-hari per item -> 80 * 4 = 320 transisi lintas-hari (>= 200)
  const intervals = [0, 2, 4, 7, 12];
  for (let r = 0; r < intervals.length; r++) {
    const dt = intervals[r];
    cursor += dt * DAY;
    let okOutcome = true;
    if (r > 0 && state) {
      const pTrue = fastForgetterModel.forgettingCurve(dt, state.stability);
      // Deterministik terkalibrasi tanpa Math.random: kuantil seragam per kartu & langkah
      const u = ((cardIdx * 17 + r * 31) % 100) / 100;
      okOutcome = u < pTrue;
    }
    richAttempts.push({
      item: 'vocab-ja-' + cardIdx,
      at: cursor,
      ok: okOutcome,
      timing: okOutcome ? 'fluent' : 'struggled'
    });
    state = fastForgetterModel.step(state, dt, okOutcome ? Oracle.Rating.Good : Oracle.Rating.Again);
  }
}

const genesisChain = ParamLedger.genesis(1700000000000);
const promoted = Oracle.optimizePersonalWeights(richAttempts, {
  paramLedger: ParamLedger,
  ledgerChain: genesisChain,
  nowMs: 1705000000000
});

ok(promoted.crossDayReviews >= 200, `Dataset memiliki >= 200 ulasan lintas-hari (${promoted.crossDayReviews})`);
ok(promoted.accepted === true && promoted.reason === 'promoted_out_of_sample',
  'Bobot personal diterima setelah terbukti menurunkan out-of-sample logLoss');
ok(promoted.metrics.outOfSample.candidate.logLoss < promoted.metrics.outOfSample.baseline.logLoss,
  `OOS logLoss membaik (${promoted.metrics.outOfSample.baseline.logLoss.toFixed(4)} -> ${promoted.metrics.outOfSample.candidate.logLoss.toFixed(4)})`);
ok(promoted.ledgerChain && ParamLedger.verify(promoted.ledgerChain).ok === true && promoted.ledgerChain.entries.length === 2,
  'Perubahan parameter tercatat sah dan terverifikasi di rantai hash FiezelParamLedger');

// 5. Async Worker Wrapper Parity
Oracle.optimizePersonalWeightsAsync(richAttempts, { nowMs: 1705000000000 }).then((asyncRes) => {
  ok(asyncRes.accepted === true && JSON.stringify(asyncRes.weights) === JSON.stringify(promoted.weights),
    'optimizePersonalWeightsAsync menghasilkan bobot identik secara deterministik');
  console.log(`\nFIEZEL brain FSRS-6 oracle & personal optimizer: PASS (${passed} assertions)`);
}).catch((err) => {
  console.error('FAIL async optimizer:', err);
  process.exit(1);
});
