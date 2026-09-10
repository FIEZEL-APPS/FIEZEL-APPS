#!/usr/bin/env node
/**
 * GERBANG LEDGER PARAMETER (tests/param-ledger-test.js)
 *
 * KENAPA GERBANG INI ADA SEBELUM PENYETELAN-DIRI
 * ----------------------------------------------
 * Langkah 5 akan membiarkan otak mengubah parameternya sendiri. Sistem yang bisa mengubah
 * dirinya tanpa catatan yang bisa diperiksa bukan sistem otonom — ia sistem yang tidak bisa
 * dipertanggungjawabkan. Rantai ini adalah syaratnya, jadi ia harus terbukti benar SEBELUM
 * ada satu parameter pun yang boleh bergerak sendiri.
 *
 * YANG DI-ASSERT
 *   L1  rantai utuh terverifikasi, dan nilai efektifnya sesuai catatan;
 *   L2  penyuntingan DI TENGAH rantai terdeteksi, dan brokenAt menunjuk entri yang tepat —
 *       rantai yang cuma bilang "rusak" tidak memberi tahu apa yang disunting;
 *   L3  rollback MENAMBAH sejarah, tidak memotongnya, dan hasilnya tetap terverifikasi;
 *   L4  rollback mengembalikan tepat parameter yang berubah SESUDAH titik target, dan tidak
 *       menyentuh yang berubah sebelumnya;
 *   L5  pemangkasan panjang MERANTAI ULANG — rantai terpangkas yang selalu merah adalah
 *       gerbang yang akan dimatikan orang, dan jaminannya hilang bersamanya;
 *   L6  peristiwa di luar kosakata dan masukan rusak DITOLAK, tanpa pernah melempar;
 *   L7  determinisme: rantai yang sama menghasilkan hash yang sama, dan hash tidak bergantung
 *       urutan properti objek;
 *   RED detektor tamper terbukti MERAH; tanpa itu L2 hijau tanpa membuktikan apa pun.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const L = require('../features/brain/fiezel-param-ledger.js');

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

function rantaiContoh() {
  let c = L.genesis(1000);
  c = L.append(c, { event: 'param_applied', path: 'bkt.T', from: 0.15, to: 0.18, reason: 'verdict promote' }, 2000);
  c = L.append(c, { event: 'param_applied', path: 'difficulty.targetSuccess', from: 0.8, to: 0.82, reason: 'verdict promote' }, 3000);
  return c;
}

test('L1 · rantai utuh terverifikasi dan nilai efektifnya sesuai catatan', () => {
  const c = rantaiContoh();
  const v = L.verify(c);
  assert.strictEqual(v.ok, true, 'rantai utuh dinyatakan rusak: ' + JSON.stringify(v));
  assert.deepStrictEqual(L.effective(c), { 'bkt.T': 0.18, 'difficulty.targetSuccess': 0.82 });
});

test('L2 · penyuntingan di TENGAH rantai terdeteksi, dan brokenAt menunjuk entri yang tepat', () => {
  const c = JSON.parse(JSON.stringify(rantaiContoh()));
  c.entries[1].to = 0.99;
  const v = L.verify(c);
  assert.strictEqual(v.ok, false, 'penyuntingan di tengah rantai TIDAK terdeteksi');
  assert.strictEqual(v.brokenAt, 1, 'brokenAt menunjuk entri yang salah: ' + v.brokenAt);

  // Menyunting entri TERAKHIR juga harus tertangkap — bukan hanya yang di tengah.
  const d = JSON.parse(JSON.stringify(rantaiContoh()));
  d.entries[d.entries.length - 1].reason = 'disunting';
  assert.strictEqual(L.verify(d).ok, false, 'penyuntingan entri terakhir tidak terdeteksi');
});

test('L3 · rollback MENAMBAH sejarah, tidak memotongnya, dan tetap terverifikasi', () => {
  const c = rantaiContoh();
  const sebelum = c.entries.length;
  const r = L.rollbackTo(c, 1, 4000);
  assert.ok(r.chain.entries.length > sebelum,
    'rollback memotong sejarah — percobaan yang gagal adalah bukti paling berharga tentang apa yang tidak berhasil');
  assert.strictEqual(L.verify(r.chain).ok, true, 'rantai setelah rollback tidak terverifikasi');
  assert.ok(r.chain.entries.some((e) => e.event === 'param_rolled_back'), 'pengembalian tidak dicatat');
});

test('L4 · rollback mengembalikan tepat yang berubah SESUDAH titik target', () => {
  const c = rantaiContoh();
  const r = L.rollbackTo(c, 1, 4000);
  const eff = L.effective(r.chain);
  assert.strictEqual(eff['difficulty.targetSuccess'], 0.8, 'parameter sesudah target tidak dikembalikan');
  assert.strictEqual(eff['bkt.T'], 0.18, 'parameter SEBELUM target ikut dikembalikan — rollback terlalu jauh');
  assert.deepStrictEqual(r.restored.map((x) => x.path), ['difficulty.targetSuccess']);
});

test('L5 · pemangkasan panjang merantai ulang, bukan memotong jadi rantai rusak', () => {
  let c = L.genesis(0);
  for (let i = 0; i < L.MAX_ENTRIES + 60; i++) {
    c = L.append(c, { event: 'param_applied', path: 'bkt.T', from: i, to: i + 1, reason: 'r' + i }, i + 1);
  }
  assert.ok(c.entries.length <= L.MAX_ENTRIES, 'rantai tumbuh tanpa batas: ' + c.entries.length);
  const v = L.verify(c);
  assert.strictEqual(v.ok, true,
    'rantai terpangkas gagal verifikasi — gerbang yang selalu merah akan dimatikan orang, ' +
    'dan jaminannya hilang bersamanya: ' + JSON.stringify(v));
});

test('L6 · peristiwa asing dan masukan rusak ditolak, tanpa pernah melempar', () => {
  const c = rantaiContoh();
  const n = c.entries.length;
  for (const bad of [null, undefined, 42, 'x', [], {}, { event: 'apa_saja' }, { event: '' }]) {
    let out;
    assert.doesNotThrow(() => { out = L.append(c, bad, 5000); }, 'melempar pada ' + JSON.stringify(bad));
    assert.strictEqual(out.entries.length, n, 'entri tak sah tetap masuk rantai: ' + JSON.stringify(bad));
  }
  for (const bad of [null, undefined, 42, 'x', {}, { entries: [] }, { schema: 'lain', entries: [{}] }]) {
    const v = L.verify(bad);
    assert.strictEqual(v.ok, false, 'rantai tak sah dinyatakan sah: ' + JSON.stringify(bad));
  }
});

test('L7 · deterministik, dan hash tidak bergantung urutan properti objek', () => {
  assert.strictEqual(JSON.stringify(rantaiContoh()), JSON.stringify(rantaiContoh()),
    'dua rantai dari langkah yang sama berbeda — ada sumber acak atau jam tersembunyi');
  // Entri yang sama dengan urutan properti berbeda harus menghasilkan hash yang sama:
  // bentuk kanonik mengunci urutannya, bukan urutan penulisan pemanggil.
  const a = L.append(L.genesis(0), { event: 'param_applied', path: 'p', from: 1, to: 2, reason: 'r' }, 10);
  const b = L.append(L.genesis(0), { reason: 'r', to: 2, from: 1, path: 'p', event: 'param_applied' }, 10);
  assert.strictEqual(a.entries[1].hash, b.entries[1].hash,
    'hash berubah karena urutan properti — data yang sama menghasilkan bukti berbeda');
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
test('RED · detektor tamper terbukti merah pada setiap field yang di-hash', () => {
  const fields = ['event', 'path', 'from', 'to', 'reason', 'at'];
  for (const f of fields) {
    const c = JSON.parse(JSON.stringify(rantaiContoh()));
    const e = c.entries[1];
    e[f] = typeof e[f] === 'number' ? e[f] + 1 : (e[f] === 'param_applied' ? 'param_rolled_back' : String(e[f]) + 'x');
    assert.strictEqual(L.verify(c).ok, false,
      'menyunting field "' + f + '" TIDAK terdeteksi — field itu tidak ikut di-hash');
  }
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(__fzRoot, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node tests/param-ledger-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL param ledger: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL param ledger: PASS (' + checks + ' uji · perubahan parameter punya alasan, hasil, dan jalur balik)');
