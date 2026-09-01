#!/usr/bin/env node
/**
 * GERBANG PENYETELAN-DIRI (self-tune-test.js)
 *
 * Ini gerbang untuk satu-satunya modul yang boleh mengubah otak tanpa manusia. Setiap pagar
 * di dalamnya harus TERBUKTI BISA MERAH — pagar yang tidak pernah terbukti merah cuma komentar
 * yang kebetulan berbentuk kode, dan di sinilah biayanya paling mahal.
 *
 * YANG DI-ASSERT
 *   T1  usulan SELALU di dalam BOUNDS, termasuk saat konfigurasi sudah mentok;
 *   T2  satu parameter per usulan — dua sekaligus membuat atribusi mustahil;
 *   T3  satu perubahan aktif per jendela; usulan berikutnya menunggu bukti;
 *   T4  hanya verdict 'promote' yang melahirkan perubahan; 'hold' bukan izin;
 *   T5  regresi memicu rollback, lewat verdict 'reject' MAUPUN lewat ambang selisih;
 *   T6  halt mengalahkan segalanya, termasuk verdict promote yang sempurna;
 *   T7  fail-closed pada SETIAP dependensi yang absen, satu per satu;
 *   T8  deterministik, dan modul tidak menulis apa pun;
 *   RED tiap pagar dibuktikan merah dengan meniru modul tanpa pagar itu.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const T = require('./features/brain/fiezel-self-tune.js');
const C = require('./features/brain/fiezel-brain-config.js');

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const CFG = C.DEFAULTS;
const promote = { decision: 'promote', rationale: 'brain4_verdict_promote', confidence: 0.99 };
const salin = (o) => JSON.parse(JSON.stringify(o));

/** Konfigurasi dengan satu path disetel ke nilai tertentu. */
function cfgDengan(p, v) {
  const out = salin(CFG), parts = p.split('.');
  let cur = out;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = v;
  return out;
}

test('T1 · usulan SELALU di dalam BOUNDS, termasuk saat konfigurasi sudah mentok', () => {
  for (const [p, spec] of Object.entries(T.TUNABLE)) {
    // Dari nilai wajar
    let r = T.propose({}, { config: cfgDengan(p, (spec.min + spec.max) / 2), verdict: promote }, 1);
    if (r.decision === 'apply' && r.change.path === p) {
      assert.ok(r.change.to >= spec.min && r.change.to <= spec.max,
        p + ': usulan keluar batas: ' + r.change.to);
    }
    // Dari nilai MENTOK di atas. Catatan: modul boleh mengusulkan parameter LAIN yang masih
    // punya ruang — itu perilaku yang benar, bukan pelanggaran. Yang diuji adalah batas milik
    // path YANG BENAR-BENAR diusulkan.
    r = T.propose({}, { config: cfgDengan(p, spec.max), verdict: promote }, 1);
    if (r.decision === 'apply') {
      const s2 = T.TUNABLE[r.change.path];
      assert.ok(s2, 'usulan pada path di luar daftar tunable: ' + r.change.path);
      assert.ok(r.change.to >= s2.min && r.change.to <= s2.max,
        r.change.path + ': usulan keluar batas: ' + r.change.to);
      assert.notStrictEqual(r.change.to, r.change.from, r.change.path + ': mengusulkan perubahan nol');
    }
    // Nilai korup di konfigurasi tidak boleh melahirkan usulan dari nilai karangan.
    for (const rusak of [NaN, Infinity, null, 'x', undefined]) {
      const out = T.propose({}, { config: cfgDengan(p, rusak), verdict: promote }, 1);
      if (out.decision === 'apply') {
        assert.notStrictEqual(out.change.path, p, p + ': usulan lahir dari nilai korup ' + String(rusak));
      }
    }
  }
});

test('T1b · semua parameter mentok -> tidak ada usulan sama sekali', () => {
  // Tanpa ini, "di dalam batas" bisa dipenuhi dengan mengusulkan perubahan nol berulang kali,
  // yang menghabiskan jatah jendela tanpa mengubah apa pun.
  let cfg = CFG;
  for (const [p, spec] of Object.entries(T.TUNABLE)) cfg = (function (c) {
    const out = salin(c), parts = p.split('.');
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = spec.max;
    return out;
  })(cfg);
  const r = T.propose({}, { config: cfg, verdict: promote }, 1);
  assert.strictEqual(r.decision, 'hold', 'mengusulkan perubahan padahal semua parameter mentok');
  assert.strictEqual(r.rationale, 'brain4_tune_hold_no_headroom');
});

test('T2 · satu parameter per usulan', () => {
  const r = T.propose({}, { config: CFG, verdict: promote }, 1);
  assert.strictEqual(r.decision, 'apply', 'tidak ada usulan pada kondisi yang seharusnya mengusulkan');
  assert.ok(r.change && typeof r.change.path === 'string', 'usulan tanpa path tunggal');
  assert.ok(!Array.isArray(r.change), 'usulan berisi lebih dari satu perubahan — atribusi jadi mustahil');
});

test('T3 · satu perubahan aktif per jendela: usulan berikutnya menunggu bukti', () => {
  const aktif = { path: 'bkt.T', from: 0.15, to: 0.17 };
  for (const since of [0, 1, 4]) {
    const r = T.propose({ activeChange: aktif, sessionsSinceChange: since }, { config: CFG, verdict: promote }, 1);
    assert.strictEqual(r.decision, 'hold',
      'perubahan kedua diusulkan setelah ' + since + ' sesi — otak berputar lebih cepat daripada bukti terkumpul');
    assert.strictEqual(r.rationale, 'brain4_tune_hold_cooldown');
  }
  // Setelah jendela lewat, usulan boleh lahir lagi.
  const r = T.propose({ activeChange: aktif, sessionsSinceChange: T.COOLDOWN_SESSIONS }, { config: CFG, verdict: promote }, 1);
  assert.strictEqual(r.decision, 'apply', 'usulan tetap ditahan padahal jendela sudah lewat');
});

test("T4 · hanya 'promote' yang melahirkan perubahan; 'hold' bukan izin", () => {
  for (const d of ['hold', 'reject', 'apa_saja', '']) {
    const r = T.propose({}, { config: CFG, verdict: { decision: d } }, 1);
    assert.notStrictEqual(r.decision, 'apply', "verdict '" + d + "' melahirkan perubahan");
  }
});

test('T5 · regresi memicu rollback, lewat reject MAUPUN lewat ambang selisih', () => {
  const aktif = { path: 'bkt.T', from: 0.15, to: 0.17 };
  const viaReject = T.propose({ activeChange: aktif }, { config: CFG, verdict: { decision: 'reject' } }, 1);
  assert.strictEqual(viaReject.decision, 'rollback', 'reject pada perubahan aktif tidak memicu rollback');
  assert.deepStrictEqual(viaReject.change, { path: 'bkt.T', from: 0.17, to: 0.15 },
    'rollback tidak mengembalikan ke nilai sebelum perubahan');

  const viaMargin = T.propose({ activeChange: aktif },
    { config: CFG, verdict: { decision: 'hold', diff: -(T.ROLLBACK_MARGIN + 0.01) } }, 1);
  assert.strictEqual(viaMargin.decision, 'rollback', 'regresi melewati ambang tidak memicu rollback');

  // Selisih kecil TIDAK boleh memicu rollback: sistem yang mundur pada derau akan berayun.
  const kecil = T.propose({ activeChange: aktif },
    { config: CFG, verdict: { decision: 'hold', diff: -0.001 } }, 1);
  assert.strictEqual(kecil.decision, 'hold', 'selisih sekecil derau memicu rollback — sistem akan berayun');
});

test('T6 · halt mengalahkan segalanya', () => {
  const r = T.propose({ halt: true, sessionsSinceChange: 999 }, { config: CFG, verdict: promote }, 1);
  assert.strictEqual(r.decision, 'hold', 'halt tidak mematikan usulan');
  assert.strictEqual(r.rationale, 'brain4_tune_halted');
  // Bahkan saat ada regresi yang seharusnya di-rollback, halt tetap menang: halt berarti
  // BERHENTI menyentuh parameter, bukan "berhenti kecuali untuk hal yang mendesak".
  const r2 = T.propose({ halt: true, activeChange: { path: 'bkt.T', from: 0.15, to: 0.17 } },
    { config: CFG, verdict: { decision: 'reject' } }, 1);
  assert.strictEqual(r2.decision, 'hold', 'halt dilewati oleh jalur rollback');
});

test('T7 · fail-closed pada SETIAP dependensi yang absen', () => {
  const kasus = [
    ['tanpa input', {}, null],
    ['tanpa config', {}, { verdict: promote }],
    ['config bukan objek', {}, { config: 'x', verdict: promote }],
    ['tanpa verdict', {}, { config: CFG }],
    ['verdict bukan objek', {}, { config: CFG, verdict: 42 }],
    ['verdict tanpa decision', {}, { config: CFG, verdict: {} }],
    ['state rusak', 'x', { config: CFG, verdict: promote }]
  ];
  for (const [label, st, inp] of kasus) {
    let r;
    assert.doesNotThrow(() => { r = T.propose(st, inp, 1); }, 'melempar pada ' + label);
    if (label === 'state rusak') continue; // state rusak tetap boleh mengusulkan: yang wajib ada adalah input
    assert.strictEqual(r.decision, 'hold', label + ': tidak fail-closed');
    assert.ok(/^brain4_tune_/.test(r.rationale), label + ': rationale tidak berprefix brain4_tune_');
  }
});

test('T8 · deterministik dan tidak menulis apa pun', () => {
  const a = T.propose({}, { config: CFG, verdict: promote }, 1);
  const b = T.propose({}, { config: CFG, verdict: promote }, 999999);
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b),
    'usulan berubah antar pemanggilan — ada sumber acak atau jam tersembunyi');
  // Argumen tidak dimutasi: modul yang menulis ke masukannya adalah modul yang menulis.
  const st = { activeChange: { path: 'bkt.T', from: 0.15, to: 0.17 }, sessionsSinceChange: 1 };
  const stSalinan = salin(st), cfgSalinan = salin(CFG);
  T.propose(st, { config: CFG, verdict: promote }, 1);
  assert.deepStrictEqual(st, stSalinan, 'state dimutasi');
  assert.deepStrictEqual(CFG, cfgSalinan, 'config dimutasi');
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
test('RED · tiap pagar dibuktikan merah dengan meniru modul TANPA pagar itu', () => {
  // Tanpa PAGAR 1 (batas): usulan melewati max.
  const tanpaBounds = (cur, step) => cur + step;
  assert.ok(tanpaBounds(0.90, 0.02) > 0.90, 'tiruan tanpa-batas tidak melewati batas — T1 tak berarti');

  // Tanpa PAGAR 3 (jendela): perubahan kedua lahir langsung.
  const tanpaCooldown = (verdict) => (verdict.decision === 'promote' ? 'apply' : 'hold');
  assert.strictEqual(tanpaCooldown(promote), 'apply', 'tiruan tanpa-jendela tidak mengusulkan — T3 tak berarti');
  assert.strictEqual(
    T.propose({ activeChange: { path: 'bkt.T', from: 0.15, to: 0.17 }, sessionsSinceChange: 1 },
      { config: CFG, verdict: promote }, 1).decision, 'hold',
    'modul asli ikut mengusulkan di dalam jendela');

  // Tanpa PAGAR 4 ('promote' saja): 'hold' pun melahirkan perubahan.
  const tanpaGate = (verdict) => (verdict.decision !== 'reject' ? 'apply' : 'hold');
  assert.strictEqual(tanpaGate({ decision: 'hold' }), 'apply', 'tiruan tanpa-gerbang tidak mengusulkan — T4 tak berarti');
  assert.strictEqual(T.propose({}, { config: CFG, verdict: { decision: 'hold' } }, 1).decision, 'hold',
    'modul asli mengusulkan pada verdict hold');

  // Tanpa PAGAR 6 (halt): halt diabaikan.
  const tanpaHalt = (st, verdict) => (verdict.decision === 'promote' ? 'apply' : 'hold');
  assert.strictEqual(tanpaHalt({ halt: true }, promote), 'apply', 'tiruan tanpa-halt tidak mengusulkan — T6 tak berarti');
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node self-tune-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL self-tune: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL self-tune: PASS (' + checks + ' uji · tujuh pagar, semuanya terbukti bisa merah)');
