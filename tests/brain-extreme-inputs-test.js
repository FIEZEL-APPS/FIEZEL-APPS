#!/usr/bin/env node
/**
 * tests/brain-extreme-inputs-test.js — GERBANG: MESIN TETAP HINGGA PADA INPUT EKSTREM.
 *
 * Audit Braincore 2026-09-28 (§2.2) menjalankan 308 input ekstrem (theta = ±4, ±1e6, ±1e308,
 * ±Infinity, NaN, null, teks): nol NaN, tetapi 22 kasus memberi ±Infinity. Penyebabnya helper
 * round(x) = Math.round(x * 10^d) / 10^d yang meluap bila |x| > 1,8e305. Ketajaman soal (a) juga
 * diterima apa adanya: a negatif membalik kurva, a nyaris 0 melempar kesulitan ke miliaran.
 *
 * YANG DIKUNCI
 *   E1  optimalDifficulty(±1e308) dan nextReviewGapDays(1e308) hingga;
 *   E2  a dijepit 0,2..4: a negatif tidak membalik kurva, a nyaris 0 tidak meledak, 0 = bawaan;
 *   E3  input normal memberi angka yang sama seperti sebelum perbaikan;
 *   E4  setiap helper round() di features/brain/ membawa penjaga 1e15.
 *
 * Konvensi repo: tanpa dependensi, exit 1 saat gagal, baris akhir '<Nama>: PASS'.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = __fzRoot;
const core = require(path.join(root, 'features/brain/fiezel-core-brain.js'));

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); } catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n    ') : e)); }
}

test('E1 · tidak ada ±Infinity pada ±1e308', () => {
  for (const v of [1e308, -1e308, Number.MAX_VALUE, -Number.MAX_VALUE]) {
    assert.ok(Number.isFinite(core.optimalDifficulty(v, 0.8)), 'optimalDifficulty(' + v + ')');
  }
  assert.ok(Number.isFinite(core.nextReviewGapDays(1e308, 0.9)));
});

test('E2 · ketajaman soal dijepit 0,2..4', () => {
  assert.ok(core.successProbability(4, 6, -2) < 0.625, 'a negatif membalik kurva');
  assert.ok(core.optimalDifficulty(3, 0.8, 1e-9) > -10, 'a nyaris 0 melempar kesulitan jauh');
  assert.strictEqual(core.successProbability(4, 6, 0), core.successProbability(4, 6), '0 = bawaan 1,5');
  assert.strictEqual(core.successProbability(4, 6, 1e9), core.successProbability(4, 6, 4));
});

test('E3 · input normal tidak berubah', () => {
  // Angka dari audit (dihitung sebelum perbaikan) dan rumus lama yang ditulis ulang di sini.
  assert.strictEqual(core.successProbability(4, 4), 0.625);
  assert.strictEqual(core.successProbability(-4, 1).toFixed(4), '0.2504');
  assert.strictEqual(core.successProbability(4, 1).toFixed(4), '0.9918');
  for (const t of [-4, 0, 1.5, 2.25, 3, 4.7, 6]) {
    for (const [p, a] of [[0.8, 1.5], [0.9, 2], [0.6, 0.7]]) {
      const pc = Math.max(0.3, Math.min(0.97, p));
      const lat = Math.max(0.01, Math.min(0.99, (pc - 0.25) / 0.75));
      const f = 1000;
      const old = Math.round((t - Math.log(lat / (1 - lat)) / a) * f) / f;
      assert.strictEqual(core.optimalDifficulty(t, p, a), old, `optimalDifficulty(${t}, ${p}, ${a})`);
    }
  }
});

test('E4 · setiap round() di features/brain/ membawa penjaga 1e15', () => {
  const dir = path.join(root, 'features/brain');
  let seen = 0;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const re = /function round\([^)]*\)\s*\{[\s\S]*?\n?\s*\}/g;
    let m;
    while ((m = re.exec(src))) {
      seen++;
      assert.ok(m[0].includes('1e15'), f + ': round() tanpa penjaga luapan');
    }
  }
  assert.ok(seen >= 7, 'helper round() yang ditemukan: ' + seen);
});

test('CI · gerbang ini terdaftar di quality.yml', () => {
  const wf = fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8');
  assert.ok(wf.includes('node tests/brain-extreme-inputs-test.js'));
});

if (failures) {
  console.error(`\nFIEZEL brain extreme inputs: FAIL (${failures}/${checks})`);
  process.exit(1);
}
console.log(`\nFIEZEL brain extreme inputs: PASS (${checks} uji · mesin tetap hingga pada input ekstrem)`);
