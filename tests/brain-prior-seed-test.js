#!/usr/bin/env node
/**
 * tests/brain-prior-seed-test.js — GERBANG: KEMAMPUAN AWAL DIAMBIL DARI LEVEL MURID.
 *
 * Temuan audit Braincore 2026-09-28 (§2.4): app.js memanggil FiezelCoreBrain.analyze() tanpa
 * priorAbility, jadi SEMUA murid mulai dari 1,5. Penaksir Elo-nya bergerak pelan, sehingga murid
 * C1 masih terbaca sekitar B1 setelah 100 jawaban, dengan sd yang terlalu yakin (0% cakupan ±2 sd).
 * Soal yang dipilih untuk target 80% pun jauh terlalu mudah baginya.
 *
 * Perbaikannya: coreBrainPriorAbility() di app.js mengambil prior dari level aktif murid
 * (A2 = 2 ... C2 = 6), tidak pernah di bawah 1,5 supaya murid A1 tidak berubah sama sekali.
 *
 * YANG DIKUNCI
 *   S1  app.js meneruskan priorAbility: coreBrainPriorAbility() ke analyze(), dan kunci cache
 *       potretnya ikut level (ganti level = potret baru);
 *   S2  pemetaan: A1 1,5 (= bawaan mesin), A2 2, B1 3, B2 4, C1 5, C2 6, level lain undefined;
 *   R1  level benar: bias |b| < 0,1 setelah 20 jawaban dan cakupan ±2 sd >= 90%;
 *   R2  level salah satu tingkat (terlalu tinggi / terlalu rendah): bias < 0,35 setelah 50 jawaban;
 *   R3  RED: dengan prior bawaan 1,5, murid C1 masih meleset lebih dari 1 level setelah 50 jawaban
 *       (membuktikan gerbang ini mengukur masalah yang nyata).
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

const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('S1 · app.js meneruskan prior dari level ke analyze(), dan cache ikut level', () => {
  assert.match(appSrc, /FiezelCoreBrain\.analyze\(\{\s*now,\s*priorAbility:coreBrainPriorAbility\(\),/);
  assert.match(appSrc, /const key=`\$\{state\.stateRevision\|\|0\}:\$\{Math\.floor\(now\/60000\)\}:\$\{getActiveLevel\(\)\}`;/);
});

// Fungsi aslinya diambil dari app.js dan dijalankan di sini, supaya yang diuji adalah kode produksi.
const fnMatch = appSrc.match(/function coreBrainPriorAbility\(level=getActiveLevel\(\)\)\{[\s\S]*?\n\}/);
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const priorFor = fnMatch
  ? new Function('LEVELS', 'getActiveLevel', fnMatch[0] + '\nreturn coreBrainPriorAbility;')(LEVELS, () => 'A1')
  : null;

test('S2 · pemetaan level -> prior (A1 tetap 1,5 seperti bawaan mesin)', () => {
  assert.ok(priorFor, 'coreBrainPriorAbility tidak ditemukan di app.js');
  assert.deepStrictEqual(LEVELS.map((l) => priorFor(l)), [1.5, 2, 3, 4, 5, 6]);
  assert.strictEqual(priorFor('N5'), undefined);
  assert.strictEqual(priorFor(''), undefined);
  assert.strictEqual(priorFor(), 1.5, 'tanpa argumen memakai getActiveLevel()');
  assert.strictEqual(core.estimateAbility([], { now: 1 }).ability, 1.5, 'bawaan mesin berubah: sesuaikan prior A1');
});

// Simulasi: murid menjawab menurut model 3PL mesin sendiri; tiap soal dipilih pada target 0,80
// dari taksiran saat itu (sama seperti evidence/estimator-recovery.js di paket uji tuntas).
const NOW0 = 1790000000000;
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function simulate(trueAbility, answers, seed, prior) {
  const r = rng(seed);
  const rows = [];
  for (let n = 0; n < answers; n++) {
    const now = NOW0 + n * 60000;
    const est = core.estimateAbility(rows, { now, prior });
    const b = Math.max(0.5, Math.min(6.9, core.optimalDifficulty(est.ability, 0.8)));
    rows.push({ ok: r() < core.successProbability(trueAbility, b), difficulty: b, at: now });
  }
  return core.estimateAbility(rows, { now: NOW0 + answers * 60000, prior });
}
const RUNS = 80;
function cell(trueAbility, answers, prior) {
  let sum = 0, inside = 0;
  for (let k = 0; k < RUNS; k++) {
    const e = simulate(trueAbility, answers, 1000 + k * 7919, prior);
    sum += e.ability;
    if (Math.abs(e.ability - trueAbility) <= 2 * e.sd) inside++;
  }
  return { bias: sum / RUNS - trueAbility, coverage: inside / RUNS };
}
// Murid di tengah level (level benar = pembulatan kemampuan, sama seperti analyze()).
const CASES = [[2.0, 'A2'], [3.0, 'B1'], [3.8, 'B2'], [5.0, 'C1'], [5.8, 'C2']];

test('R1 · level benar: bias < 0,1 setelah 20 jawaban, cakupan ±2 sd >= 90%', () => {
  for (const [t, lvl] of CASES) {
    const c = cell(t, 20, priorFor(lvl));
    assert.ok(Math.abs(c.bias) < 0.1, `${lvl} (kemampuan ${t}): bias ${c.bias.toFixed(3)}`);
    assert.ok(c.coverage >= 0.9, `${lvl} (kemampuan ${t}): cakupan ${(100 * c.coverage).toFixed(0)}%`);
  }
});

test('R2 · level meleset satu tingkat: bias < 0,35 setelah 50 jawaban', () => {
  for (const [t, lvl] of CASES) {
    const i = LEVELS.indexOf(lvl);
    for (const j of [i - 1, i + 1]) {
      if (j < 0 || j > 5) continue;
      const c = cell(t, 50, priorFor(LEVELS[j]));
      assert.ok(Math.abs(c.bias) < 0.35, `kemampuan ${t} dipasang di ${LEVELS[j]}: bias ${c.bias.toFixed(3)}`);
    }
  }
});

test('R3 · RED: prior bawaan 1,5 membuat murid C1 meleset > 1 level setelah 50 jawaban', () => {
  const c = cell(5.0, 50, 1.5);
  assert.ok(c.bias < -1, `bias ${c.bias.toFixed(3)}: kalau sudah kecil, mesinnya berubah dan gerbang ini perlu ditinjau`);
});

test('CI · gerbang ini terdaftar di quality.yml', () => {
  const wf = fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8');
  assert.ok(wf.includes('node tests/brain-prior-seed-test.js'));
});

if (failures) {
  console.error(`\nFIEZEL brain prior seed: FAIL (${failures}/${checks})`);
  process.exit(1);
}
console.log(`\nFIEZEL brain prior seed: PASS (${checks} uji · kemampuan awal dari level murid)`);
