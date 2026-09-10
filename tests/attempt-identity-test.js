#!/usr/bin/env node
/**
 * GERBANG IDENTITAS PERCOBAAN (tests/attempt-identity-test.js)
 *
 * LUBANG YANG DITUTUP
 * -------------------
 * Penggabung progres memakai `row.id` sebagai kunci dedup riwayat — dan `row.id` adalah id
 * SOAL, bukan id percobaan. Menjawab soal yang sama dua kali menghasilkan dua baris ber-kunci
 * sama, dan yang kedua dibuang tanpa suara. Latihan berulang adalah inti spaced repetition,
 * jadi yang paling mungkin hilang justru bukti yang paling bernilai. Cacat ini sudah berlaku
 * pada restore backup hari ini, sebelum sinkron antar-perangkat ada sama sekali, dan ia akan
 * memburuk begitu dua perangkat aktif: setiap pengulangan di perangkat kedua lenyap saat
 * digabung.
 *
 * Gerbang ini menjalankan mergeProgress SUNGGUHAN dan nextAttemptId SUNGGUHAN (diambil dari
 * app.js dengan pencocokan kurung), bukan tiruannya.
 *
 * YANG DI-ASSERT
 *   T1  dua percobaan pada SOAL YANG SAMA sama-sama selamat dari merge;
 *   T2  merge idempoten — menggabungkan dua kali tidak menambah/mengurangi apa pun;
 *   T3  percobaan yang benar-benar sama dari dua sumber digabung jadi satu (bukan digandakan);
 *   T4  baris LAMA tanpa attemptId tetap dedup antar-sumber lewat sidik isi;
 *   T5  nextAttemptId menghasilkan id unik, terurut waktu, dan berbeda antar "perangkat";
 *   RED setiap detektor terbukti MERAH terhadap kunci dedup yang sengaja dikembalikan ke row.id.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = __fzRoot;
const continuity = require('../features/continuity/fiezel-continuity.js');
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

function ambilFungsi(source, nama) {
  const mulai = source.indexOf('function ' + nama + '(');
  if (mulai < 0) return '';
  let depth = 0;
  for (let j = source.indexOf('{', mulai); j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}') { depth--; if (depth === 0) return source.slice(mulai, j + 1); }
  }
  return '';
}

/** nextAttemptId sungguhan, dengan penanda "perangkat" yang kita tentukan. */
function pembuatId(tag) {
  const src = ambilFungsi(appSource, 'nextAttemptId');
  assert.ok(src, 'nextAttemptId() tidak ditemukan — pola gerbang sudah basi');
  return new Function('ATTEMPT_TAG', 'attemptSeq',
    'return (function(){ ' + src + '; return nextAttemptId; })();')(tag, 0);
}

const baris = (over) => Object.assign({
  id: 'soal-1', type: 'grammar', skill: 'present_perfect', ok: true, ms: 4200, at: 1700000000000
}, over);

test('T1 · dua percobaan pada SOAL yang sama sama-sama selamat dari merge', () => {
  // Inti cacatnya: keduanya ber-id soal 'soal-1'. Yang membedakan hanya attemptId dan waktu.
  const lokal = { history: [baris({ attemptId: 'a1', at: 1700000000000 })] };
  const cadangan = { history: [baris({ attemptId: 'a2', at: 1700000600000, ok: false })] };
  const hasil = continuity.mergeProgress(lokal, cadangan);
  assert.strictEqual(hasil.history.length, 2,
    'pengulangan soal yang sama hilang saat merge — bukti spaced repetition dibuang');
  assert.deepStrictEqual(hasil.history.map((h) => h.attemptId), ['a1', 'a2'], 'urutan waktu tidak dipertahankan');
});

test('T2 · merge idempoten: menggabungkan dua kali tidak mengubah apa pun', () => {
  const lokal = { history: [baris({ attemptId: 'a1' }), baris({ attemptId: 'a2', at: 1700000600000 })] };
  const cadangan = { history: [baris({ attemptId: 'a2', at: 1700000600000 })] };
  const sekali = continuity.mergeProgress(lokal, cadangan);
  const duakali = continuity.mergeProgress(sekali, cadangan);
  assert.strictEqual(sekali.history.length, 2);
  assert.deepStrictEqual(duakali.history.map((h) => h.attemptId), sekali.history.map((h) => h.attemptId),
    'merge tidak idempoten — menjalankannya berulang mengubah riwayat');
});

test('T3 · percobaan yang benar-benar sama dari dua sumber digabung jadi satu', () => {
  const satu = baris({ attemptId: 'a9' });
  const hasil = continuity.mergeProgress({ history: [satu] }, { history: [Object.assign({}, satu)] });
  assert.strictEqual(hasil.history.length, 1, 'percobaan yang sama tergandakan — merge menggelembungkan riwayat');
});

test('T4 · baris LAMA tanpa attemptId tetap dedup antar-sumber lewat sidik isi', () => {
  // Versi lama memasukkan INDEKS array ke kunci cadangan, sehingga baris lama tanpa id tidak
  // pernah dedup antar-sumber: posisinya berbeda di tiap sisi.
  const lama = { id: '', type: 'vocab', skill: 'general', ok: true, ms: 1000, at: 1699999999000 };
  const hasil = continuity.mergeProgress(
    { history: [baris({ attemptId: 'a1' }), Object.assign({}, lama)] },
    { history: [Object.assign({}, lama)] }
  );
  assert.strictEqual(hasil.history.length, 2, 'baris lama identik tergandakan saat merge');
});

test('T5 · nextAttemptId unik, terurut waktu, dan berbeda antar perangkat', () => {
  const hp = pembuatId('hpaaa');
  const ids = [hp(1700000000000), hp(1700000000000), hp(1700000000001)];
  assert.strictEqual(new Set(ids).size, 3,
    'dua percobaan pada milidetik yang sama menghasilkan id sama — union akan membuang salah satunya');
  assert.ok(ids[0] < ids[2], 'id tidak terurut menurut waktu');
  const laptop = pembuatId('ltbbb');
  assert.notStrictEqual(hp(1700000000000), laptop(1700000000000),
    'dua perangkat pada milidetik yang sama menghasilkan id sama — tabrakan lintas perangkat');
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
function expectRed(label, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert.ok(threw, 'detektor TIDAK merah pada racun: ' + label);
}

test('RED · detektor merah bila kunci dedup dikembalikan ke id SOAL', () => {
  // Tiru persis perilaku lama pada data T1, lalu buktikan T1 akan gagal terhadapnya.
  const lama = (a, b) => {
    const byId = {}, order = [];
    for (const src of [a, b]) for (let i = 0; i < src.length; i++) {
      const row = src[i];
      const id = String(row.id || ('' + (row.at || '') + (row.skill || '') + i));
      if (!byId[id]) { byId[id] = row; order.push(id); }
    }
    return order.map((k) => byId[k]);
  };
  expectRed('dedup memakai id soal membuang pengulangan', () => {
    const hasil = lama([baris({ attemptId: 'a1' })], [baris({ attemptId: 'a2', at: 1700000600000 })]);
    assert.strictEqual(hasil.length, 2);
  });
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node tests/attempt-identity-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL attempt identity: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL attempt identity: PASS (' + checks + ' uji)');
