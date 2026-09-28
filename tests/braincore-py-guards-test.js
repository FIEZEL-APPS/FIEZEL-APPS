#!/usr/bin/env node
/**
 * tests/braincore-py-guards-test.js — GERBANG: MATEMATIKA backend/braincore.py TAHAN INPUT RUSAK.
 *
 * Temuan audit Braincore 2026-09-28 (§2.3) untuk layanan kelas FastAPI yang terpasang di cPanel:
 *   - success_probability(-1e6, 3) melempar OverflowError (math.exp di atas ~709): 500 di API;
 *   - NaN merambat, dan bkt_update(nan) / bkt_decay(0.9, nan) mengembalikan 0.99, karena
 *     min(0.99, nan) memilih 0.99: nilai rusak terbaca "sudah dikuasai";
 *   - komentar konstanta menyebut "paritas kanonik dengan client", padahal konstanta BKT dan
 *     kurva lupanya berbeda.
 *
 * YANG DIKUNCI
 *   G1  tidak ada OverflowError pada |theta - b| berapa pun, dan hasilnya tetap di [c, 1];
 *   G2  NaN / tak hingga / None tidak merambat dan tidak pernah menjadi 0.99;
 *   G3  input normal menghasilkan angka yang SAMA PERSIS dengan rumus lama;
 *   G4  ketajaman soal dijepit 0,2..4 (negatif tidak membalik kurva), 0 = bawaan 1,5;
 *   G5  berkas tidak lagi menyebut dirinya "paritas kanonik".
 *
 * backend/braincore.py mengimpor db (motor/MongoDB); gerbang ini memasang modul db tiruan,
 * jadi tidak butuh database. Konvensi repo: exit 1 saat gagal, baris akhir '<Nama>: PASS'.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs'), path = require('path'), assert = require('assert');
const { spawnSync } = require('child_process');
const root = __fzRoot;

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); } catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n    ') : e)); }
}

const PY = String.raw`
import json, math, sys, types
sys.modules['db'] = types.SimpleNamespace(db=None)
sys.path.insert(0, sys.argv[1])
import braincore as b
out = {}
def run(name, fn):
    try:
        v = fn()
        out[name] = {'ok': True, 'v': v if (v is None or math.isfinite(v)) else repr(v)}
    except Exception as e:
        out[name] = {'ok': False, 'err': type(e).__name__}
nan, inf = float('nan'), float('inf')
run('sp_neg_huge', lambda: b.success_probability(-1e6, 3))
run('sp_pos_huge', lambda: b.success_probability(1e6, 3))
run('sp_inf', lambda: b.success_probability(inf, 3))
run('sp_nan', lambda: b.success_probability(nan, 3))
run('sp_none', lambda: b.success_probability(None, 3))
run('sp_a_nan', lambda: b.success_probability(4, 3, nan))
run('sp_a_neg', lambda: b.success_probability(4, 6, -2))
run('sp_a_zero', lambda: b.success_probability(4, 6, 0))
run('sp_a_default', lambda: b.success_probability(4, 6))
run('od_nan', lambda: b.optimal_difficulty(nan))
run('od_a_tiny', lambda: b.optimal_difficulty(3, 0.8, 1e-9))
run('bkt_update_nan', lambda: b.bkt_update(nan, True))
run('bkt_update_init', lambda: b.bkt_update(b.P_INIT, True))
run('bkt_decay_nan_elapsed', lambda: b.bkt_decay(0.9, nan))
run('bkt_decay_nan_p', lambda: b.bkt_decay(nan, 5))
# Rumus lama untuk input normal, ditulis ulang di sini sebagai pembanding.
def old_sp(t, d, a=1.5):
    latent = 1.0 / (1.0 + math.exp(-a * (float(t) - float(d))))
    return b.GUESS_FLOOR + (1.0 - b.GUESS_FLOOR) * latent
def old_od(t, p=0.8, a=1.5):
    p = max(b.GUESS_FLOOR + 0.05, min(0.97, p))
    lat = max(0.01, min(0.99, (p - b.GUESS_FLOOR) / (1 - b.GUESS_FLOOR)))
    return round(t - math.log(lat / (1 - lat)) / a, 3)
def old_decay(p, e, h=b.BKT_HALF_LIFE_DAYS):
    if e <= 0 or p <= b.P_INIT:
        return p
    tau = max(1.0, h) / math.log(2.0)
    return round(max(0.01, min(0.99, b.P_INIT + (p - b.P_INIT) * math.exp(-e / tau))), 4)
same = True
for t in [-4, -1, 0, 1.5, 2.2, 3, 4, 6]:
    for d in [1, 2.5, 4, 6]:
        same = same and b.success_probability(t, d) == old_sp(t, d)
    same = same and b.optimal_difficulty(t) == old_od(t) and b.optimal_difficulty(t, 0.9, 2) == old_od(t, 0.9, 2)
for p in [0.1, 0.25, 0.5, 0.9, 0.99]:
    for e in [0, 1, 7, 30, 365]:
        same = same and b.bkt_decay(p, e) == old_decay(p, e)
out['same_on_normal_inputs'] = same
print(json.dumps(out))
`;

const res = spawnSync('python3', ['-c', PY, path.join(root, 'backend')], { encoding: 'utf8' });
let r = null;
test('P0 · python3 menjalankan backend/braincore.py dengan db tiruan', () => {
  assert.strictEqual(res.status, 0, (res.stderr || '').slice(-600));
  r = JSON.parse(res.stdout.trim().split('\n').pop());
});
const val = (k) => { assert.ok(r && r[k], k + ' tidak dijalankan'); assert.ok(r[k].ok, `${k}: ${r[k].err}`); return r[k].v; };

test('G1 · tidak ada OverflowError, hasil tetap di [c, 1]', () => {
  assert.ok(Math.abs(val('sp_neg_huge') - 0.25) < 1e-12);
  assert.strictEqual(val('sp_pos_huge'), 1);
  const inf = val('sp_inf');
  assert.ok(inf >= 0.25 && inf <= 1);
});

test('G2 · NaN / tak hingga / None tidak merambat dan tidak menjadi 0.99', () => {
  for (const k of ['sp_nan', 'sp_none', 'sp_a_nan', 'od_nan', 'bkt_update_nan', 'bkt_decay_nan_p']) {
    assert.strictEqual(typeof val(k), 'number', k + ' harus angka hingga');
  }
  assert.strictEqual(val('bkt_update_nan'), val('bkt_update_init'), 'bkt_update(nan) harus sama dengan mulai dari P_INIT');
  assert.ok(val('bkt_update_nan') < 0.99);
  assert.strictEqual(val('bkt_decay_nan_elapsed'), 0.9, 'elapsed NaN = tidak ada waktu berlalu');
  assert.strictEqual(val('bkt_decay_nan_p'), 0.25, 'p NaN kembali ke P_INIT');
});

test('G3 · input normal: angka sama persis dengan rumus lama', () => {
  assert.ok(r, 'python tidak berjalan');
  assert.strictEqual(r.same_on_normal_inputs, true);
});

test('G4 · ketajaman dijepit 0,2..4; 0 = bawaan 1,5', () => {
  assert.ok(val('sp_a_neg') < 0.625, 'a negatif tidak boleh membalik kurva: theta 4 di bawah b 6 harus di bawah titik tengah 0,625');
  assert.strictEqual(val('sp_a_zero'), val('sp_a_default'));
  assert.ok(val('od_a_tiny') > -10, 'a nyaris 0 tidak boleh melempar kesulitan ke miliaran');
});

test('G5 · komentar tidak lagi mengklaim paritas kanonik dengan client', () => {
  const src = fs.readFileSync(path.join(root, 'backend/braincore.py'), 'utf8');
  assert.ok(!/paritas kanonik/i.test(src));
  assert.ok(/BERBEDA dari client JS/.test(src));
});

test('CI · gerbang ini terdaftar di quality.yml', () => {
  const wf = fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8');
  assert.ok(wf.includes('node tests/braincore-py-guards-test.js'));
});

if (failures) {
  console.error(`\nFIEZEL braincore.py guards: FAIL (${failures}/${checks})`);
  process.exit(1);
}
console.log(`\nFIEZEL braincore.py guards: PASS (${checks} uji · matematika backend tahan input rusak)`);
