'use strict';
/**
 * tests/kurikulum-luring-fase2-test.js — F9 FASE 2: BUKTI LURING = PAPARAN
 * (keputusan owner: paparan + aktivitas saja, TANPA gerakan mastery — kunci
 * jawaban ikut terkirim dalam bundle offline sehingga bukti luring pada
 * dasarnya bisa di-game).
 *
 * Kontrak yang dikunci gerbang ini di sisi backend + klien:
 *  1. POST /api/learning/offline-batch ada: validasi ketat, idempoten per
 *     event_id, kompetensi dipetakan server (peta eksak prompt), skor klien
 *     disimpan berlabel client_correct dan TIDAK PERNAH dinilai/diagnois/
 *     diterapkan ke mastery.
 *  2. Peta hanya berisi kecocokan eksak; parafasa tidak dipaksa ke kompetensi.
 *  3. Klien mengirim ke batch dulu, jatuh ke /events warisan bila backend tua
 *     (404) — antrean tidak terdampar oleh skew deploy.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

const BACK = baca('backend/learning.py');
const PETA = baca('backend/offline_static_map.py');
const MISI = baca('features/curriculum/learning-mission.js');

function badanEndpoint() {
  const i = BACK.indexOf('async def offline_batch');
  assert.ok(i > 0, 'endpoint offline_batch tidak ada di backend/learning.py.');
  const j = BACK.indexOf('@router.', i + 10);
  return BACK.slice(i, j > 0 ? j : undefined);
}

/* --------------------------------- 1. endpoint ada & jujur */

test('F9-f2 — offline-batch: hanya murid pemilik tiket, batch dibatasi', () => {
  const fn = badanEndpoint();
  assert.ok(/u\["role"\] != "student"/.test(fn), 'endpoint menerima peran selain murid — guru bisa mengarang bukti untuk murid.');
  assert.ok(/len\(items\) > 200/.test(fn), 'batch tanpa batas — satu request bisa menenggelamkan antrean.');
});

test('F9-f2 — offline-batch: validasi menolak bukti mustahil', () => {
  const fn = badanEndpoint();
  assert.ok(/masa depan/.test(fn), 'cap waktu masa depan tidak ditolak.');
  assert.ok(/lebih tua dari 60 hari/.test(fn), 'bukti basi tidak ditolak.');
  assert.ok(/event_id tidak sah/.test(fn) && /static_item_id tidak sah/.test(fn), 'identitas butir tidak divalidasi.');
});

test('F9-f2 — offline-batch: skor klien TIDAK PERNAH menyentuh mastery', () => {
  const fn = badanEndpoint();
  ['apply_attempt', 'diagnose(', 'grade(', 'db.attempts.insert', '$inc'].forEach((bahaya) => {
    assert.ok(!fn.includes(bahaya), 'handler memanggil ' + bahaya + ' — skor luring yang bisa di-game menggerakkan mastery.');
  });
  assert.ok(/bc\.mark_exposure/.test(fn), 'paparan tidak ditandai — bukti luring hilang tanpa jejak.');
  assert.ok(/client_correct/.test(fn), 'klaim klien tidak disimpan berlabel — guru tidak bisa membedakan klaim dari fakta.');
});

test('F9-f2 — offline-batch: idempoten per event_id', () => {
  const fn = badanEndpoint();
  assert.ok(/record_event\("question_answered", sid, \{/.test(fn), 'bukti tidak lewat record_event idempoten.');
  assert.ok(/"duplicates"/.test(fn) || /duplicates/.test(fn), 'respons tidak melaporkan duplikat — klien tidak tahu mana yang gugur.');
});

/* --------------------------------- 2. peta eksak */

test('F9-f2 — peta statis->kompetensi: eksak saja, parafasa tidak dipaksa', () => {
  assert.ok(/STATIC_COMPETENCY = \{/.test(PETA), 'peta tidak ada.');
  assert.ok(/rule.*exact-prompt/.test(PETA), 'aturan eksak tidak tercatat di peta.');
  const n = (PETA.match(/"cur_[a-z0-9_]+": "KOMP-/g) || []).length;
  assert.ok(n >= 1, 'peta kosong — tidak ada butir yang bisa menandai paparan.');
  assert.ok(/jangan sunting tangan|DIBANGKITKAN OTOMATIS/.test(PETA), 'peta tidak menandai dirinya sebagai hasil generator.');
  assert.ok(fs.existsSync(path.join(__fzRoot, 'tools/build-offline-map.mjs')), 'generator peta hilang — peta tidak bisa direproduksi.');
});

/* --------------------------------- 3. klien: batch dulu, warisan bila 404 */

test('F9-f2 — klien mengirim ke offline-batch dengan bentuk yang divalidasi server', () => {
  assert.ok(/api\('\/learning\/offline-batch', \{ body: \{\s*attempts:/.test(MISI), 'sinkronisasi tidak memakai offline-batch.');
  assert.ok(/static_item_id: e\.itemId/.test(MISI) && /client_correct: !!e\.correct/.test(MISI),
    'bentuk kiriman klien menyimpang dari skema server — batch ditolak massal.');
  assert.ok(/e\.status === 404/.test(MISI), 'tidak ada fallback saat backend tua (404) — antrean terdampar oleh skew deploy.');
  assert.ok(/function warisan\(\)/.test(MISI), 'jalur warisan /events hilang — kompatibilitas mundur putus.');
});

/* ------------------------------------------------------------------------------ jalan */

let pass = 0;
const gagal = [];
tests.forEach(([n, fn]) => {
  try { fn(); pass++; console.log('  ok   ' + n); }
  catch (e) { gagal.push(n); console.log('  FAIL ' + n + ' — ' + e.message); }
});
console.log('\nFIEZEL luring fase 2: ' + (gagal.length ? 'FAIL' : 'PASS') + ' (' + pass + ' pass, ' + gagal.length + ' fail)');
process.exit(gagal.length ? 1 : 0);
