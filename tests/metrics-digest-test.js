/**
 * FIEZEL gate — Metrics Digest v1 (metrics-digest-test).
 *
 * Digest ini kandidat UNGGAHAN, jadi gate-nya adalah gate privasi, bukan sekadar gate
 * kebenaran angka. Yang harus terbukti, bukan sekadar diyakini:
 *   (a) SETIAP string di seluruh output adalah anggota enum tertutup — tidak ada satu
 *       pun string input yang bisa menyeberang ke output (injeksi teks bebas mati);
 *   (b) n < kSuppress (default 20) -> sel disupresi TANPA nilai; semua sel kecil ->
 *       hasil top-level {suppressed:true, rationale:'brain3_digest_suppressed_small_n'};
 *   (c) tidak ada key di luar allowlist, dan validator MENOLAK digest berfield asing;
 *   (d) domain selain 'grammar' ditolak (scope council), interval <7d dibuang;
 *   (e) deterministik: input sama (walau urutan baris diacak) -> byte JSON sama;
 *   (f) tidak ada timestamp presisi dan tidak ada ID dalam bentuk apa pun.
 */
'use strict';
const assert = require('assert');
const MD = require('../features/brain/fiezel-metrics-digest.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

/* ------------------------- alat bantu pemeriksa privasi ------------------------- */

// Semua string yang SAH muncul di output digest: gabungan seluruh enum + schema + key.
const ALLOWED_STRINGS = new Set([MD.SCHEMA]);
for (const values of Object.values(MD.ENUMS)) for (const v of values) ALLOWED_STRINGS.add(v);
const ALLOWED_KEYS = new Set(['schema', 'domain', 'cells', 'rationale', 'confidence',
  'metric', 'interval_bucket', 'retention_bucket', 'n_bucket', 'gain_bucket',
  'brier_bucket', 'suppressed', 'ok', 'digest', 'confidence']);

// Jalan rekursif: setiap string harus anggota enum, setiap key harus di allowlist,
// setiap angka harus 0..1 (confidence) — tidak ada ruang untuk timestamp ms atau ID.
function assertEnumOnly(node, path) {
  if (node === null || typeof node === 'boolean') return;
  if (typeof node === 'number') {
    assert.ok(node >= 0 && node <= 1, path + ': angka di luar 0..1 (calon timestamp/ID?): ' + node);
    return;
  }
  if (typeof node === 'string') {
    assert.ok(ALLOWED_STRINGS.has(node), path + ': string di luar enum: "' + node + '"');
    return;
  }
  if (Array.isArray(node)) { node.forEach((v, i) => assertEnumOnly(v, path + '[' + i + ']')); return; }
  assert.strictEqual(typeof node, 'object', path + ': tipe tak dikenal');
  for (const [k, v] of Object.entries(node)) {
    assert.ok(ALLOWED_KEYS.has(k), path + ': key di luar allowlist: "' + k + '"');
    assertEnumOnly(v, path + '.' + k);
  }
}

/** Fixture sehat: semua sel di atas ambang supresi. */
function healthyInput() {
  return {
    domain: 'grammar',
    retention: [
      { intervalDays: 8, rate: 0.75, n: 30 },
      { intervalDays: 20, rate: 0.62, n: 55 },
      { intervalDays: 45, rate: 0.48, n: 120 }
    ],
    learningGain: { gain: 0.12, n: 60 },
    calibration: { brier: 0.17, n: 80 }
  };
}

/* ---------------- (a) enum-only pada seluruh permukaan output ---------------- */

test('(a) digest sehat: ok=true, dan SEMUA string/key/angka lolos pemeriksa enum-only', () => {
  const out = MD.buildDigest(healthyInput());
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.rationale, 'brain3_digest_built');
  assertEnumOnly(out, 'out');
});

test('(a) nilai bucket persis seperti hitungan tangan', () => {
  const out = MD.buildDigest(healthyInput());
  const cells = out.digest.cells;
  const ret = cells.filter(c => c.metric === 'retention');
  assert.deepStrictEqual(ret, [
    { metric: 'retention', interval_bucket: '7-14d', retention_bucket: '70-80%', n_bucket: '20-49' },
    { metric: 'retention', interval_bucket: '14-30d', retention_bucket: '60-70%', n_bucket: '50-99' },
    { metric: 'retention', interval_bucket: '30d+', retention_bucket: '<50%', n_bucket: '100+' }
  ]);
  assert.deepStrictEqual(cells.find(c => c.metric === 'learning_gain'),
    { metric: 'learning_gain', gain_bucket: '10-20pp', n_bucket: '50-99' });
  assert.deepStrictEqual(cells.find(c => c.metric === 'calibration_brier'),
    { metric: 'calibration_brier', brier_bucket: '0.15-0.20', n_bucket: '50-99' });
});

test('(a) batas bucket: 0.5 masuk 50-60%, 0.9 masuk 90%+, 14 hari masuk 14-30d, n=20 masuk 20-49', () => {
  assert.strictEqual(MD.bucketRetention(0.5), '50-60%');
  assert.strictEqual(MD.bucketRetention(0.49999), '<50%');
  assert.strictEqual(MD.bucketRetention(0.9), '90%+');
  assert.strictEqual(MD.bucketInterval(14), '14-30d');
  assert.strictEqual(MD.bucketInterval(30), '30d+');
  assert.strictEqual(MD.bucketN(20), '20-49');
  assert.strictEqual(MD.bucketN(19), '<20');
  assert.strictEqual(MD.bucketGain(-0.01), '<0pp');
  assert.strictEqual(MD.bucketBrier(0.25), '0.25+');
});

/* ---------------- (b) supresi sel kecil ---------------- */

test('(b) satu sel n<20 -> sel itu tersupresi tanpa nilai, sel lain tetap rilis', () => {
  const input = healthyInput();
  input.retention[0].n = 12; // bucket 7-14d jatuh di bawah k
  const out = MD.buildDigest(input);
  assert.strictEqual(out.ok, true);
  const sup = out.digest.cells.find(c => c.suppressed === true);
  assert.deepStrictEqual(sup, {
    metric: 'retention', interval_bucket: '7-14d',
    suppressed: true, rationale: 'brain3_digest_suppressed_small_n'
  });
  // Sel tersupresi TIDAK boleh membawa nilai apa pun.
  assert.ok(!('retention_bucket' in sup) && !('n_bucket' in sup));
  assertEnumOnly(out, 'out');
});

test('(b) dua baris kecil pada bucket SAMA digabung dulu: 15+15=30 -> rilis, bukan supresi', () => {
  const out = MD.buildDigest({
    domain: 'grammar',
    retention: [
      { intervalDays: 8, rate: 0.8, n: 15 },
      { intervalDays: 10, rate: 0.6, n: 15 }
    ]
  });
  assert.strictEqual(out.ok, true);
  assert.deepStrictEqual(out.digest.cells, [
    { metric: 'retention', interval_bucket: '7-14d', retention_bucket: '70-80%', n_bucket: '20-49' }
  ]);
});

test('(b) SEMUA sel kecil -> top-level {suppressed:true, rationale:brain3_digest_suppressed_small_n}', () => {
  const out = MD.buildDigest({
    domain: 'grammar',
    retention: [{ intervalDays: 9, rate: 0.7, n: 5 }],
    learningGain: { gain: 0.1, n: 3 },
    calibration: { brier: 0.2, n: 7 }
  });
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.suppressed, true);
  assert.strictEqual(out.rationale, 'brain3_digest_suppressed_small_n');
  assert.ok(!('digest' in out), 'tidak boleh ada digest saat semua tersupresi');
});

test('(b) kSuppress dari opts dihormati, tapi tidak bisa diturunkan di bawah lantai privasi 5', () => {
  const base = { domain: 'grammar', learningGain: { gain: 0.1, n: 25 } };
  // k=30: n=25 sekarang kecil -> supresi total.
  const strict = MD.buildDigest(base, { kSuppress: 30 });
  assert.strictEqual(strict.suppressed, true);
  // k=1 diminta, tapi lantai 5 menang: n=4 tetap tersupresi.
  const weak = MD.buildDigest({ domain: 'grammar', learningGain: { gain: 0.1, n: 4 } }, { kSuppress: 1 });
  assert.strictEqual(weak.suppressed, true);
});

/* ---------------- (c) allowlist key + validator menolak field asing ---------------- */

test('(c) tidak ada key di luar allowlist pada digest dan sel-selnya', () => {
  const out = MD.buildDigest(healthyInput());
  assert.deepStrictEqual(Object.keys(out.digest).sort(), [...MD.DIGEST_KEYS].sort());
  for (const cell of out.digest.cells) {
    if (cell.suppressed) continue;
    assert.deepStrictEqual(Object.keys(cell).sort(), [...MD.CELL_SPEC[cell.metric]].sort());
  }
});

test('(c) validateDigest MENOLAK field asing di level digest', () => {
  const out = MD.buildDigest(healthyInput());
  const tampered = JSON.parse(JSON.stringify(out.digest));
  tampered.user_email = 'a@b.c';
  const check = MD.validateDigest(tampered);
  assert.strictEqual(check.ok, false);
  assert.ok(check.errors.some(e => e.indexOf('allowlist') !== -1), check.errors.join(','));
});

test('(c) validateDigest MENOLAK field asing di level sel dan nilai di luar enum', () => {
  const out = MD.buildDigest(healthyInput());
  const t1 = JSON.parse(JSON.stringify(out.digest));
  t1.cells[0].session_id = 'abc-123';
  assert.strictEqual(MD.validateDigest(t1).ok, false);
  const t2 = JSON.parse(JSON.stringify(out.digest));
  t2.cells[0].retention_bucket = '73.5%'; // presisi bebas = bukan enum
  assert.strictEqual(MD.validateDigest(t2).ok, false);
  const t3 = JSON.parse(JSON.stringify(out.digest));
  t3.domain = 'listening'; // di luar scope grammar-only
  assert.strictEqual(MD.validateDigest(t3).ok, false);
});

/* ---------------- (d) injeksi string bebas + scope ---------------- */

test('(d) injeksi: field liar berisi PII/teks bebas di input TIDAK pernah muncul di output', () => {
  const input = healthyInput();
  input.userEmail = 'siswa@example.com';
  input.note = 'lesson-42 <script>alert(1)</script>';
  input.retention[0].lessonId = 'grammar-L042';
  input.retention[0].timestamp = 1787264000000;
  input.learningGain.sessionId = 'sess-9f8e7d';
  const out = MD.buildDigest(input);
  assert.strictEqual(out.ok, true);
  const json = JSON.stringify(out);
  for (const dirty of ['siswa@example.com', 'lesson-42', 'script', 'grammar-L042', 'sess-9f8e7d', '1787264000000']) {
    assert.strictEqual(json.indexOf(dirty), -1, 'string input bocor ke output: ' + dirty);
  }
  assertEnumOnly(out, 'out');
});

test('(d) domain selain grammar ditolak (scope council), termasuk domain hasil injeksi', () => {
  for (const bad of ['listening', 'grammar ', 'GRAMMAR', 'grammar<script>', '', null, 42]) {
    const out = MD.buildDigest({ domain: bad, learningGain: { gain: 0.1, n: 50 } });
    assert.strictEqual(out.ok, false, 'domain seharusnya ditolak: ' + String(bad));
    assert.strictEqual(out.rationale, 'brain3_digest_domain_out_of_scope');
    assert.ok(!('digest' in out));
  }
});

test('(d) interval <7 hari dibuang — retensi super-pendek terlalu dekat pola kehadiran', () => {
  const out = MD.buildDigest({
    domain: 'grammar',
    retention: [{ intervalDays: 3, rate: 0.9, n: 100 }],
    learningGain: { gain: 0.1, n: 50 }
  });
  assert.strictEqual(out.ok, true);
  assert.ok(out.digest.cells.every(c => c.metric !== 'retention'));
});

test('(d) input rusak aman: null, array, angka, objek kosong -> tolak dengan rationale, tanpa lempar', () => {
  for (const bad of [null, undefined, [], 7, 'grammar', {}]) {
    const out = MD.buildDigest(bad);
    assert.strictEqual(out.ok, false);
    assert.ok(out.rationale === 'brain3_digest_invalid_input' || out.rationale === 'brain3_digest_domain_out_of_scope');
  }
  // Domain benar tapi tidak ada metrik valid sama sekali -> invalid_input, bukan crash.
  const out2 = MD.buildDigest({ domain: 'grammar', retention: 'bukan-array', learningGain: { gain: 'x', n: 'y' } });
  assert.strictEqual(out2.ok, false);
  assert.strictEqual(out2.rationale, 'brain3_digest_invalid_input');
});

/* ---------------- (d2) interop dengan bentuk keluaran FiezelLearningMetrics ---------------- */

test('(d2) keluaran engine (retentionAtGap.buckets, learningGain.lessons, brierCalibration) diterima', () => {
  // Fixture berbentuk PERSIS seperti keluaran fiezel-learning-metrics.js — termasuk
  // field yang tidak boleh bocor (lesson, rationale engine, schema engine).
  const out = MD.buildDigest({
    domain: 'grammar',
    retention: {
      schema: 'fiezel-learning-metrics-v1', metric: 'retention_at_gap', n: 90,
      buckets: [
        { gapDays: 7, n: 60, accuracy: 0.75, confidence: 0.8, insufficient: false, rationale: 'brain3_metric_retention_gap' },
        { gapDays: 14, n: 25, accuracy: 0.55, confidence: 0.6, insufficient: false, rationale: 'brain3_metric_retention_gap' },
        { gapDays: 30, n: 3, accuracy: null, confidence: 0, insufficient: true, rationale: 'brain3_metric_retention_gap_insufficient' }
      ]
    },
    learningGain: {
      schema: 'fiezel-learning-metrics-v1', metric: 'learning_gain', k: 10, n: 80,
      lessons: [
        { lesson: 'grammar-L001', n: 40, k: 10, gain: 0.15, insufficient: false },
        { lesson: 'grammar-L002', n: 30, k: 10, gain: 0.05, insufficient: false },
        { lesson: 'grammar-L003', n: 4, k: 10, gain: null, insufficient: true }
      ]
    },
    calibration: {
      schema: 'fiezel-learning-metrics-v1', metric: 'brier_calibration', n: 45,
      brier: 0.22, baselineBrier: 0.24, skillScore: 0.083, bands: [{ band: '0.8-1.0', n: 45 }]
    }
  });
  assert.strictEqual(out.ok, true);
  assertEnumOnly(out, 'out');
  // lessonId dan string engine TIDAK boleh menyeberang ke digest.
  const json = JSON.stringify(out);
  for (const dirty of ['grammar-L001', 'grammar-L002', 'fiezel-learning-metrics-v1', 'brain3_metric_retention_gap']) {
    assert.strictEqual(json.indexOf(dirty), -1, 'bocor: ' + dirty);
  }
  // Ambang kumulatif engine dipetakan ke bucket-awal enum: 7->'7-14d', 14->'14-30d'.
  assert.deepStrictEqual(out.digest.cells.filter(c => c.metric === 'retention'), [
    { metric: 'retention', interval_bucket: '7-14d', retention_bucket: '70-80%', n_bucket: '50-99' },
    { metric: 'retention', interval_bucket: '14-30d', retention_bucket: '50-60%', n_bucket: '20-49' }
  ]);
  // Gain agregat berbobot 2k: (0.15*20 + 0.05*20)/40 = 0.10 -> '10-20pp', n=40 -> '20-49'.
  assert.deepStrictEqual(out.digest.cells.find(c => c.metric === 'learning_gain'),
    { metric: 'learning_gain', gain_bucket: '10-20pp', n_bucket: '20-49' });
  // Brier engine cocok langsung: 0.22 -> '0.20-0.25', n=45 -> '20-49'.
  assert.deepStrictEqual(out.digest.cells.find(c => c.metric === 'calibration_brier'),
    { metric: 'calibration_brier', brier_bucket: '0.20-0.25', n_bucket: '20-49' });
});

test('(d2) engine yang seluruhnya insufficient (nilai null) -> tidak ada yang dirilis', () => {
  const out = MD.buildDigest({
    domain: 'grammar',
    retention: { metric: 'retention_at_gap', buckets: [{ gapDays: 7, n: 2, accuracy: null, insufficient: true }] },
    learningGain: { metric: 'learning_gain', lessons: [{ lesson: 'grammar-L001', n: 4, k: 10, gain: null, insufficient: true }] },
    calibration: { metric: 'brier_calibration', n: 5, brier: null, insufficient: true }
  });
  assert.strictEqual(out.ok, false);
  assert.ok(!('digest' in out));
});

/* ---------------- (e) determinisme ---------------- */

test('(e) dua pemanggilan dengan input sama -> byte JSON identik', () => {
  const a = JSON.stringify(MD.buildDigest(healthyInput()));
  const b = JSON.stringify(MD.buildDigest(healthyInput()));
  assert.strictEqual(a, b);
});

test('(e) urutan baris retention diacak -> output tetap byte-identik (urutan enum, bukan input)', () => {
  const shuffled = healthyInput();
  shuffled.retention.reverse();
  const a = JSON.stringify(MD.buildDigest(healthyInput()));
  const b = JSON.stringify(MD.buildDigest(shuffled));
  assert.strictEqual(a, b);
});

/* ---------------- (f) keluaran valid menurut validator sendiri ---------------- */

test('(f) digest yang dirilis selalu lolos validateDigest (gerbang internal aktif)', () => {
  const out = MD.buildDigest(healthyInput());
  const check = MD.validateDigest(out.digest);
  assert.strictEqual(check.ok, true, check.errors.join(','));
});

test('(f) confidence = proporsi sel rilis: 4 rilis + 1 supresi -> 0.8', () => {
  const input = healthyInput();
  input.retention[0].n = 10;
  const out = MD.buildDigest(input);
  assert.strictEqual(out.confidence, 0.8);
  assert.strictEqual(out.digest.confidence, 0.8);
});

if (failures > 0) {
  console.error(failures + ' kegagalan');
  process.exit(1);
}
console.log('MetricsDigest: PASS');
