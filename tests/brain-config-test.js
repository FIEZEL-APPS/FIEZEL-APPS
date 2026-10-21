/**
 * FIEZEL gate — Brain Config v1 (registry konfigurasi berversi, Braincore v3).
 *
 * Bahaya terbesar sebuah "registry salinan" adalah DRIFT DIAM-DIAM: modul sumber
 * di-tune, salinannya lupa diperbarui, dan sejak itu registry berbohong dengan percaya
 * diri. Karena itu gate ini tidak mempercayai angka yang tertulis di fiezel-brain-config
 * — ia MEMBACA ULANG konstanta dari modul sumber (lewat require untuk yang diekspor,
 * lewat parsing teks sumber untuk yang tidak diekspor, dan lewat perilaku fungsi untuk
 * yang tertanam di rumus) lalu menuntut kesetaraan persis.
 *
 * Yang kedua diuji adalah KEAMANAN sanitize(): registry yang menerima string "angka",
 * field tak dikenal, atau override schema adalah pintu injeksi, bukan alat tata kelola.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const cfg = require('../features/brain/fiezel-brain-config.js');
const bkt = require('../features/brain/fiezel-mastery-bkt.js');
const brain = require('../features/brain/fiezel-core-brain.js');
const ledger = require('../features/brain/fiezel-misconception-ledger.js');

const coreBrainSrc = fs.readFileSync(
  path.join(__fzRoot, 'features', 'brain', 'fiezel-core-brain.js'), 'utf8');
const configSrc = fs.readFileSync(
  path.join(__fzRoot, 'features', 'brain', 'fiezel-brain-config.js'), 'utf8');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

/** Baca konstanta numerik yang TIDAK diekspor, langsung dari teks sumbernya. */
function srcConst(source, name) {
  const m = source.match(new RegExp('var\\s+' + name + '\\s*=\\s*([0-9.]+)\\s*;'));
  assert.ok(m, 'konstanta ' + name + ' tidak ditemukan di sumber');
  return Number(m[1]);
}

// ======================================================================================
// A. DEFAULT = KONSTANTA MODUL SUMBER (anti-drift)
// ======================================================================================

test('bkt default identik dengan FiezelMasteryBKT.PARAMS (dibaca ulang saat test)', () => {
  assert.deepStrictEqual(
    { L0: cfg.bkt.L0, T: cfg.bkt.T, slip: cfg.bkt.slip, guess: cfg.bkt.guess },
    { L0: bkt.PARAMS.L0, T: bkt.PARAMS.T, slip: bkt.PARAMS.slip, guess: bkt.PARAMS.guess });
});

test('difficulty default identik dengan ekspor FiezelCoreBrain', () => {
  assert.strictEqual(cfg.difficulty.targetSuccess, brain.TARGET_SUCCESS);
  assert.strictEqual(cfg.difficulty.discrimination, brain.DISCRIMINATION);
  assert.strictEqual(cfg.difficulty.guessFloor, brain.GUESS_FLOOR);
});

test('band floor/ceiling identik dengan perilaku challengeWindow() sesungguhnya', () => {
  // Batas pita tidak diekspor sebagai konstanta — ia tertanam di challengeWindow().
  // Maka diuji lewat PERILAKU: floorExact/ceilingExact yang dikembalikan challengeWindow
  // harus sama dengan optimalDifficulty pada peluang yang diklaim registry.
  for (const ability of [0.5, 2.0, 3.7]) {
    const w = brain.challengeWindow(ability);
    assert.strictEqual(w.floorExact,
      brain.optimalDifficulty(ability, cfg.difficulty.band.floorSuccess),
      'floorSuccess menyimpang pada ability=' + ability);
    assert.strictEqual(w.ceilingExact,
      brain.optimalDifficulty(ability, cfg.difficulty.band.ceilingSuccess),
      'ceilingSuccess menyimpang pada ability=' + ability);
  }
});

test('memory default identik dengan konstanta FSRS-lite di sumber fiezel-core-brain.js', () => {
  assert.strictEqual(cfg.memory.baseHalfLifeDays, srcConst(coreBrainSrc, 'BASE_HALF_LIFE_DAYS'));
  assert.strictEqual(cfg.memory.gain, srcConst(coreBrainSrc, 'MEMORY_GAIN'));
  assert.strictEqual(cfg.memory.saturation, srcConst(coreBrainSrc, 'MEMORY_SATURATION'));
  assert.strictEqual(cfg.memory.spacing, srcConst(coreBrainSrc, 'MEMORY_SPACING'));
  assert.strictEqual(cfg.memory.lapseScale, srcConst(coreBrainSrc, 'LAPSE_SCALE'));
  assert.strictEqual(cfg.memory.lapseDifficulty, srcConst(coreBrainSrc, 'LAPSE_DIFFICULTY'));
  assert.strictEqual(cfg.memory.lapseRetain, srcConst(coreBrainSrc, 'LAPSE_RETAIN'));
  assert.strictEqual(cfg.memory.lapseFloor, srcConst(coreBrainSrc, 'LAPSE_FLOOR'));
});

test('clamp stabilitas 0.2..365 hari identik dengan perilaku halfLife() sesungguhnya', () => {
  // Batas clamp juga tidak diekspor — diuji lewat perilaku pada nilai ekstrem.
  assert.strictEqual(brain.halfLife({ stability: 1e9 }), cfg.memory.stabilityMaxDays);
  assert.strictEqual(brain.halfLife({ stability: 1e-9 }), cfg.memory.stabilityMinDays);
});

test('misconception default identik dengan ekspor FiezelMisconceptionLedger', () => {
  assert.strictEqual(cfg.misconception.halfLifeDays, ledger.DECAY_HALF_LIFE_DAYS);
  assert.strictEqual(cfg.misconception.minEvidence, ledger.MIN_EVIDENCE);
  assert.strictEqual(cfg.misconception.minSessions, ledger.MIN_SESSIONS);
  assert.strictEqual(cfg.misconception.minBelief, ledger.ACTIVE_BELIEF);
});

// ======================================================================================
// B. BOUNDS DITEGAKKAN
// ======================================================================================

test('bounds literatur degenerasi BKT: guess <= 0.3, slip <= 0.1; targetSuccess [0.70,0.90]', () => {
  assert.ok(cfg.BOUNDS.bkt.guess.max <= 0.3, 'guess max harus <= 0.3');
  assert.ok(cfg.BOUNDS.bkt.slip.max <= 0.1, 'slip max harus <= 0.1');
  assert.strictEqual(cfg.BOUNDS.difficulty.targetSuccess.min, 0.7);
  assert.strictEqual(cfg.BOUNDS.difficulty.targetSuccess.max, 0.9);
});

test('setiap default berada di dalam bounds-nya sendiri', () => {
  (function walk(defaults, bounds, prefix) {
    Object.keys(bounds).forEach((k) => {
      const b = bounds[k];
      const p = prefix + '.' + k;
      if (b.min === undefined) return walk(defaults[k], b, p);
      assert.ok(defaults[k] >= b.min && defaults[k] <= b.max,
        p + '=' + defaults[k] + ' di luar [' + b.min + ',' + b.max + ']');
      if (b.integer) assert.strictEqual(defaults[k], Math.round(defaults[k]), p + ' harus bilangan bulat');
    });
  })(cfg.DEFAULTS, cfg.BOUNDS, '');
});

test('sanitize menjepit nilai valid yang keluar batas (clamp, bukan tolak)', () => {
  const r = cfg.sanitize({
    bkt: { guess: 0.9, slip: 0.0001 },
    difficulty: { targetSuccess: 0.5 },
    misconception: { minEvidence: 4.7 }
  });
  assert.ok(r.config.bkt.guess <= 0.3, 'guess harus dijepit ke <= 0.3');
  assert.strictEqual(r.config.bkt.slip, cfg.BOUNDS.bkt.slip.min);
  assert.strictEqual(r.config.difficulty.targetSuccess, 0.7);
  assert.strictEqual(r.config.misconception.minEvidence, 5, 'integer dibulatkan setelah clamp');
  assert.strictEqual(r.rejected.length, 0);
  assert.strictEqual(r.clamped.length, 4);
  assert.strictEqual(r.rationale, 'brain3_config_sanitized_clamped');
});

test('override valid di dalam bounds diterima apa adanya, field lain tetap default', () => {
  const r = cfg.sanitize({ bkt: { guess: 0.2 }, difficulty: { targetSuccess: 0.85 } });
  assert.strictEqual(r.config.bkt.guess, 0.2);
  assert.strictEqual(r.config.difficulty.targetSuccess, 0.85);
  assert.strictEqual(r.config.bkt.slip, cfg.bkt.slip);
  assert.strictEqual(r.config.memory.gain, cfg.memory.gain);
  assert.strictEqual(r.rationale, 'brain3_config_sanitized_clean');
  assert.strictEqual(r.confidence, 1);
});

// ======================================================================================
// C. SANITIZE MENOLAK INJEKSI / MASUKAN RUSAK
// ======================================================================================

test('sanitize menolak string — termasuk string yang kelihatan seperti angka atau kode', () => {
  const r = cfg.sanitize({
    bkt: {
      guess: '0.25',                                   // coercion trap
      slip: '0.05; require("child_process")',          // injeksi kode
      L0: '<script>alert(1)</script>'                  // injeksi markup
    }
  });
  assert.strictEqual(r.rejected.length, 3);
  r.rejected.forEach((x) => assert.strictEqual(x.reason, 'non_numeric'));
  assert.strictEqual(r.config.bkt.guess, cfg.bkt.guess, 'default tidak boleh tersentuh');
  assert.strictEqual(r.rationale, 'brain3_config_sanitized_rejected');
  assert.ok(r.confidence < 1);
});

test('sanitize menolak NaN, Infinity, fungsi, array, boolean, null', () => {
  const r = cfg.sanitize({
    bkt: { guess: NaN, slip: Infinity, T: () => 1, L0: [0.2] },
    memory: { gain: true, spacing: null }
  });
  assert.strictEqual(r.rejected.length, 6);
  assert.deepStrictEqual(r.config.bkt, cfg.DEFAULTS.bkt);
  assert.deepStrictEqual(r.config.memory, cfg.DEFAULTS.memory);
});

test('sanitize menolak field & section tak dikenal (typo tidak boleh jadi no-op diam)', () => {
  const r = cfg.sanitize({
    bkt: { gues: 0.2 },                     // typo field
    evilSection: { x: 1 },                  // section asing
    difficulty: { band: { floor: 0.9 } }    // typo field bertingkat
  });
  assert.strictEqual(r.rejected.length, 3);
  assert.ok(r.rejected.every((x) => x.reason === 'unknown_field'));
  assert.ok(r.rejected.some((x) => x.path === 'bkt.gues'));
  assert.ok(r.rejected.some((x) => x.path === 'evilSection'));
  assert.ok(r.rejected.some((x) => x.path === 'difficulty.band.floor'));
});

test('schema dan brainVersion tidak bisa di-override (immutable, hanya lewat commit)', () => {
  const r = cfg.sanitize({ schema: 'hacked', brainVersion: '99.0.0', bkt: { guess: 0.2 } });
  assert.strictEqual(r.config.schema, 'fiezel-brain-config-v1');
  assert.strictEqual(r.config.brainVersion, cfg.brainVersion);
  assert.strictEqual(r.rejected.length, 2);
  assert.ok(r.rejected.every((x) => x.reason === 'immutable_field'));
  assert.strictEqual(r.config.bkt.guess, 0.2, 'override sah tetap diterapkan');
});

test('sanitize menolak overrides non-objek dan tetap mengembalikan default yang valid', () => {
  for (const bad of ['{"bkt":{}}', 42, [1, 2], true]) {
    const r = cfg.sanitize(bad);
    assert.strictEqual(r.rationale, 'brain3_config_overrides_invalid');
    assert.deepStrictEqual(r.config, cfg.DEFAULTS);
  }
});

test('sanitize(null) = default utuh, rationale brain3_config_default, confidence 1', () => {
  const r = cfg.sanitize(null);
  assert.deepStrictEqual(r.config, cfg.DEFAULTS);
  assert.strictEqual(r.rationale, 'brain3_config_default');
  assert.strictEqual(r.confidence, 1);
});

test('setiap hasil sanitize membawa rationale brain3_ dan confidence dalam [0,1]', () => {
  const cases = [null, {}, { bkt: { guess: 0.9 } }, { junk: 1 }, 'x'];
  for (const c of cases) {
    const r = cfg.sanitize(c);
    assert.ok(/^brain3_config_/.test(r.rationale), 'rationale: ' + r.rationale);
    assert.ok(r.confidence >= 0 && r.confidence <= 1, 'confidence: ' + r.confidence);
  }
});

// ======================================================================================
// D. KEBEKUAN, SEMVER, KEMURNIAN
// ======================================================================================

test('objek konfigurasi beku total — mutasi dalam strict mode melempar', () => {
  assert.ok(Object.isFrozen(cfg));
  assert.ok(Object.isFrozen(cfg.bkt));
  assert.ok(Object.isFrozen(cfg.difficulty.band));
  assert.ok(Object.isFrozen(cfg.memory));
  assert.ok(Object.isFrozen(cfg.misconception));
  assert.ok(Object.isFrozen(cfg.BOUNDS.bkt.guess));
  assert.throws(() => { cfg.bkt.guess = 0.99; }, TypeError);
  assert.throws(() => { cfg.brainVersion = '0.0.0'; }, TypeError);
  assert.throws(() => { cfg.injected = true; }, TypeError);
});

test('hasil sanitize juga beku, dan DEFAULTS tidak pernah termutasi', () => {
  const before = JSON.stringify(cfg.DEFAULTS);
  const r = cfg.sanitize({ bkt: { guess: 0.1 } });
  assert.ok(Object.isFrozen(r));
  assert.ok(Object.isFrozen(r.config));
  assert.ok(Object.isFrozen(r.config.bkt));
  assert.ok(Object.isFrozen(r.config.difficulty.band));
  assert.throws(() => { r.config.bkt.guess = 0.99; }, TypeError);
  assert.strictEqual(JSON.stringify(cfg.DEFAULTS), before, 'DEFAULTS berubah setelah sanitize');
  assert.strictEqual(cfg.bkt.guess, bkt.PARAMS.guess);
});

test('brainVersion adalah semver valid dan schema berversi eksplisit', () => {
  assert.ok(/^\d+\.\d+\.\d+$/.test(cfg.brainVersion), 'bukan semver: ' + cfg.brainVersion);
  assert.strictEqual(cfg.schema, 'fiezel-brain-config-v1');
  assert.strictEqual(cfg.brainVersion, '3.0.0');
});

test('modul murni: tanpa DOM/jaringan/storage/jam internal/random di sumbernya', () => {
  for (const banned of ['Date.now', 'Math.random', 'localStorage', 'document.',
    'window.fetch', 'XMLHttpRequest', 'setTimeout', 'setInterval']) {
    assert.ok(configSrc.indexOf(banned) === -1, 'sumber mengandung ' + banned);
  }
});

// ======================================================================================

if (failures > 0) {
  console.error('\nBrainConfig: FAIL (' + failures + ' kegagalan)');
  process.exit(1);
}
console.log('BrainConfig: PASS');
