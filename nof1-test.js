#!/usr/bin/env node
/**
 * GERBANG EKSPERIMEN N-of-1 (nof1-test.js)
 *
 * KEGAGALAN YANG GERBANG INI ADA UNTUK MENANGKAP
 * ----------------------------------------------
 * Versi pertama modul ini memakai `fnv1a(...) % 2` untuk memilih lengan, dan sebarannya
 * terlihat SEMPURNA: 5000/5000 pada 10.000 item, skew 0,0000. Angka itu justru gejalanya.
 *
 * FNV-1a mengalikan dengan bilangan ganjil, jadi bit terendahnya praktis paritas byte
 * masukan. Akibatnya lengan berselang-seling 0,1,0,1,0 mengikuti karakter terakhir id —
 * lengan berkorelasi dengan URUTAN item, bukan terbagi acak — dan mengganti experimentId
 * membalik 10.000 dari 10.000 item, artinya dua eksperimen adalah komplemen persis, bukan
 * dua partisi independen.
 *
 * Uji keseimbangan saja akan LULUS terhadap kedua cacat itu. Karena itu gerbang ini menguji
 * tiga sifat sekaligus, dan cacat di atas melanggar dua di antaranya sambil memuaskan yang
 * pertama dengan nilai sesempurna mungkin.
 *
 * YANG DI-ASSERT
 *   N1  determinisme: masukan sama -> lengan sama, lintas pemanggilan;
 *   N2  keseimbangan: selisih lengan < 2pp pada 10.000 item;
 *   N3  TIDAK berkorelasi dengan urutan: id berurutan tidak boleh berselang-seling sempurna;
 *   N4  INDEPENDENSI eksperimen: dua experimentId berbeda pada ~50% item, bukan 0% atau 100%;
 *   N5  tally hanya menghitung baris setelah startedAt, melewati yang tak ter-assign, dan
 *       melaporkan yang dilewat;
 *   N6  ketahanan masukan korup; modul tidak memutuskan promote/reject;
 *   RED ketiga detektor terbukti MERAH terhadap hash lama yang berat sebelah.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const N = require('./features/brain/fiezel-nof1.js');

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const IDS = Array.from({ length: 10000 }, (_, i) => 'item-' + i);

/** Tiruan versi cacat, dipakai blok BUKTI-BISA-MERAH. */
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
const assignCacat = (item, exp) => (fnv1a(exp + '::' + item) % 2 ? 'candidate' : 'control');

/** Run terpanjang dari lengan yang sama pada id berurutan. Alternasi sempurna -> 1. */
function runTerpanjang(fn) {
  let max = 0, run = 0, prev = null;
  for (const id of IDS) {
    const a = fn(id);
    if (a === prev) { run++; if (run > max) max = run; } else { run = 1; if (run > max) max = run; }
    prev = a;
  }
  return max;
}

test('N1 · deterministik: masukan sama menghasilkan lengan sama', () => {
  for (const id of ['item-42', 'grammar:present_perfect', 'a', 'x'.repeat(60)]) {
    const a = N.assign(id, 'exp-1');
    assert.strictEqual(N.assign(id, 'exp-1'), a, 'assignment berubah antar pemanggilan untuk ' + id);
    assert.ok(N.ARMS.includes(a), 'lengan di luar kosakata: ' + a);
  }
});

test('N2 · seimbang: selisih lengan < 2pp pada 10.000 item', () => {
  const b = N.balance(IDS, 'exp-1');
  assert.strictEqual(b.total, IDS.length, 'sebagian item tidak ter-assign');
  assert.ok(b.skew < 0.02, 'lengan berat sebelah, skew=' + b.skew.toFixed(4));
});

test('N3 · TIDAK berkorelasi dengan urutan item (alternasi sempurna adalah cacat)', () => {
  // Justru inilah yang lolos dari uji keseimbangan: 5000/5000 bisa dicapai dengan
  // berselang-seling sempurna, dan berselang-seling berarti lengan ditentukan urutan.
  const max = runTerpanjang((id) => N.assign(id, 'exp-1'));
  assert.ok(max >= 3,
    'lengan berselang-seling mengikuti urutan id (run terpanjang ' + max + ') — ' +
    'ini pembagian yang ditentukan posisi, bukan hash');
});

test('N4 · eksperimen berbeda menghasilkan partisi INDEPENDEN, bukan komplemen', () => {
  let beda = 0;
  for (const id of IDS) if (N.assign(id, 'exp-1') !== N.assign(id, 'exp-2')) beda++;
  const rasio = beda / IDS.length;
  assert.ok(rasio > 0.45 && rasio < 0.55,
    'dua eksperimen berbeda pada ' + (rasio * 100).toFixed(1) + '% item — ' +
    'mendekati 0% berarti identik, mendekati 100% berarti komplemen persis; keduanya bukan independen');
});

test('N5 · tally: hanya setelah startedAt, yang tak ter-assign dilewat DAN dilaporkan', () => {
  const exp = { id: 'exp-1', startedAt: 1000, minPerArm: 2 };
  const riwayat = [
    { item: 'item-1', at: 500, ok: true },      // sebelum mulai -> dilewat
    { item: 'item-1', at: 1500, ok: true },
    { item: 'item-2', at: 1600, ok: false },
    { item: 'item-3', at: 1700, ok: true },
    { item: 'item-4', at: 1800, ok: true },
    { item: '', at: 1900, ok: true },           // tanpa item -> dilewat
    { at: 2000, ok: true },                     // tanpa item -> dilewat
    null                                        // rusak -> dilewat
  ];
  const t = N.tally(riwayat, exp);
  assert.strictEqual(t.skipped, 4, 'jumlah baris yang dilewat salah: ' + t.skipped);
  assert.strictEqual(t.control.n + t.candidate.n, 4, 'jumlah yang dihitung salah');
  assert.ok(t.control.ok <= t.control.n && t.candidate.ok <= t.candidate.n, 'benar melebihi total');
  assert.ok(t.spanMs > 0, 'rentang waktu tidak dihitung');
});

test('N6 · tahan masukan korup, dan TIDAK pernah memutuskan promote/reject', () => {
  for (const bad of [[undefined, 'e'], ['i', undefined], ['', 'e'], ['i', ''], [null, null], [42, 'e']]) {
    assert.strictEqual(N.assign(bad[0], bad[1]), null, 'masukan tak sah dipaksa masuk lengan: ' + JSON.stringify(bad));
  }
  for (const bad of [null, undefined, 'x', 42, {}, { id: 'e' }, { startedAt: 1 }]) {
    const t = N.tally([{ item: 'item-1', at: 5000, ok: true }], bad);
    assert.strictEqual(t.control.n + t.candidate.n, 0, 'eksperimen tak sah tetap menghitung bukti');
  }
  const keys = Object.keys(N.tally([], { id: 'e', startedAt: 1 }));
  assert.ok(!keys.includes('decision') && !keys.includes('verdict'),
    'modul ini memutuskan sesuatu — keputusan milik FiezelPolicyVerdict, bukan pembagi lengan');
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
test('RED · N3 dan N4 terbukti MERAH terhadap hash lama, sementara N2 tetap hijau', () => {
  // Inilah inti berkas ini: cacatnya LULUS uji keseimbangan dengan nilai sesempurna mungkin.
  const b = { control: 0, candidate: 0 };
  for (const id of IDS) b[assignCacat(id, 'exp-1')]++;
  const skew = Math.abs(b.control - b.candidate) / IDS.length;
  assert.ok(skew < 0.02, 'prasyarat racun tidak terpenuhi: hash cacat seharusnya terlihat seimbang');

  // N3 harus merah: alternasi. Run maksimumnya 2, bukan 1 — alternasinya sempurna hanya di
  // dalam id yang panjangnya sama, lalu pecah sekali di batas panjang (item-9 -> item-10).
  // Angka pastinya diukur, bukan ditebak; yang penting ia JAUH di bawah ambang N3.
  const max = runTerpanjang((id) => assignCacat(id, 'exp-1'));
  assert.ok(max <= 2, 'hash cacat tidak beralternasi (run terpanjang ' + max + ') — perbandingannya tidak berarti');
  assert.ok(max < 3, 'hash cacat lolos ambang N3 — N3 tidak akan menangkapnya');

  // N4 harus merah: komplemen persis.
  let beda = 0;
  for (const id of IDS) if (assignCacat(id, 'exp-1') !== assignCacat(id, 'exp-2')) beda++;
  assert.strictEqual(beda, IDS.length, 'hash cacat tidak menghasilkan komplemen persis');
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node nof1-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL N-of-1: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL N-of-1: PASS (' + checks + ' uji · pembagian lengan yang tidak bisa dibohongi keseimbangan)');
