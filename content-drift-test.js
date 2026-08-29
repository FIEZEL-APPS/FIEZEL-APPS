#!/usr/bin/env node
/**
 * content-drift-test.js — Pemilik: F2 (wave F, gate anti-drift konten)
 *
 * ==========================================================================
 * KENAPA GATE INI ADA — tiga wave berturut, pola kerusakan yang sama
 * ==========================================================================
 * Berkas konten turunan tertinggal dari sumbernya, CI tetap hijau, dan
 * kerusakannya baru ketahuan berhari-hari kemudian lewat audit tangan:
 *
 *   (1) b0d983c (Wave D): 4 soal fatal (TA-006, GI-002, b4_003, b4_018)
 *       diperbaiki di grammar-templates.json — grammar-explanations-id.json
 *       0 baris berubah. Tidak ada gerbang yang merah.
 *   (2) c3e02f3 (E3, ±18 jam kemudian): 11 entri penjelasan basi (b4_018 dkk)
 *       ditemukan oleh AUDIT TANGAN 153 lesson, bukan oleh gerbang.
 *   (3) 5643a32 (wave2, 20 agen QA): menulis ulang puluhan whyFailsId
 *       langsung di bank; berkas sumber terakhir disentuh m025-162 —
 *       59 nilai distraktor melenceng diam-diam.
 *   (4) f87a39a (GEN-2, 29 Agu): 27 template baru (222→249). Entri sumber
 *       untuk 10 template (A1-008..A1-017) dibuat TANPA blok distractors,
 *       dan indonesianCoverage dibiarkan 222/222 padahal templates.length=249.
 *       Seluruh CI hijau — bank-soal-audit-test hanya memeriksa
 *       translated===total, bukan total===templates.length.
 *
 * Setiap assert di bawah menunjuk commit historis yang akan ia tangkap LEBIH
 * AWAL. Gate ini murni baca-JSON, deterministik, tanpa jaringan, < 5 detik.
 *
 * ==========================================================================
 * YANG SENGAJA TIDAK DIJAGA DI SINI — sudah dijaga gerbang lain (JANGAN duplikat)
 * ==========================================================================
 *   - Diagnosis yatim / label misconception tanpa diagnosis Indonesia
 *     (grammar-misconception-id.json): misconception-diagnosis-test.js,
 *     assert "petanya tidak menyimpan entri yatim" + "cakupan harus 100%"
 *     + "jumlah yang diumumkan berkas cocok" (terdaftar di Core validation).
 *   - Label misconception yatim terhadap taksonomi + regenerasi taksonomi
 *     identik: misconception-taxonomy-test.js, assert "cakupan: nol yatim",
 *     "kunci map mati", "generator ... meregenerasi peta yang identik".
 *   - Cloze bank sinkron dengan grammar-templates.json:
 *     cloze-bank-test.js, assert "build deterministik ... file di disk
 *     sinkron dengan rebuild"; kunci basi cloze-alternates-v1.json membuat
 *     build GAGAL KERAS di tools/build-cloze-bank.js (mergeAlternates).
 *   - grammar-templates.count === templates.length: grammar-quality-audit.js
 *     ("Grammar lesson inventory"). lessonCount/levelCounts kurikulum:
 *     grammar-curriculum-test.js. promptCount: writing-rubric-test.js.
 *     counts cloze: cloze-bank-test.js.
 *
 * ==========================================================================
 * INVARIAN YANG DIJAGA (celah yang terbukti belum dijaga siapa pun)
 * ==========================================================================
 *   A. Setiap template punya entri di grammar-explanations-id.json.
 *   B. Kunci distraktor entri itu = PERSIS himpunan opsi distraktor template
 *      SAAT INI (nol kunci basi, nol kunci hilang). — menangkap (1),(2),(4)
 *   C. Nilai berkas sumber identik dengan field ...Id bank (8 field template
 *      + 2 field per distraktor): sinkron dua arah, siapa pun yang diedit
 *      duluan. — menangkap (3)
 *   D. indonesianCoverage.translated === .total === templates.length ===
 *      jumlah entri sumber. — menangkap (4)
 *   E. vocabulary-th.count === jumlah entri — satu-satunya field count bank
 *      yang kehilangan penjaganya saat th-coverage-test.js dikecualikan dari
 *      CI (keputusan MASTER 9bf2e13, kelas gerbang-pra-rilis-fitur).
 *
 * Perbaikan bila merah:
 *   node tools/sync-grammar-explanations-id.js --write && node audit/merge-grammar-id.js
 *
 * Setiap detektor dibuktikan bisa MERAH lewat matriks racun in-memory di
 * bagian akhir (pola edge-proxy-hopbyhop-test) — bukan hanya hijau di data benar.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const sync = require('./tools/sync-grammar-explanations-id.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'grammar-templates.json'), 'utf8'));
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'grammar-explanations-id.json'), 'utf8'));
const vth = JSON.parse(fs.readFileSync(path.join(ROOT, 'vocabulary-th.json'), 'utf8'));

/* =========================================================================
 * DETEKTOR MURNI — dipakai pada data nyata DAN pada matriks racun di bawah.
 * ======================================================================= */

/** A: template tanpa entri sumber. */
function missingEntries(bankObj, srcObj) {
  const entries = (srcObj.templates || {});
  return (bankObj.templates || []).map((t) => String(t.id)).filter((id) => !entries[id]);
}

/** B: kunci distraktor basi/hilang per template. */
function distractorKeyDrift(bankObj, srcObj) {
  const out = [];
  const entries = srcObj.templates || {};
  for (const t of bankObj.templates || []) {
    const e = entries[String(t.id)];
    if (!e) continue; // sudah dilaporkan detektor A
    const options = new Set((t.distractors || []).map((d) => String(d.option)));
    const keys = new Set(Object.keys(e.distractors || {}));
    const stale = [...keys].filter((k) => !options.has(k));
    const missing = [...options].filter((o) => !keys.has(o));
    if (stale.length || missing.length) out.push({ id: t.id, stale, missing });
  }
  return out;
}

/** C: nilai sumber vs field ...Id bank (dua arah, per field). */
function valueDrift(bankObj, srcObj) {
  const out = [];
  const entries = srcObj.templates || {};
  for (const t of bankObj.templates || []) {
    const e = entries[String(t.id)];
    if (!e) continue;
    const expect = sync.entryFromBank(t);
    for (const k of sync.ENTRY_KEYS) {
      if (k === 'distractors') continue;
      if (String(e[k] || '') !== expect[k]) out.push({ id: t.id, field: k });
    }
    for (const [opt, want] of Object.entries(expect.distractors)) {
      const got = (e.distractors || {})[opt];
      if (!got) continue; // sudah dilaporkan detektor B
      if (String(got.whyFails || '') !== want.whyFails) out.push({ id: t.id, field: 'distractors["' + opt + '"].whyFails' });
      if (String(got.misconception || '') !== want.misconception) out.push({ id: t.id, field: 'distractors["' + opt + '"].misconception' });
    }
  }
  return out;
}

/** D: inventori cakupan terjemahan. */
function coverageDrift(bankObj, srcObj) {
  const out = [];
  const n = (bankObj.templates || []).length;
  const cov = bankObj.indonesianCoverage || {};
  const entries = Object.keys(srcObj.templates || {}).length;
  if (cov.translated !== n) out.push('indonesianCoverage.translated=' + cov.translated + ' != templates.length=' + n);
  if (cov.total !== n) out.push('indonesianCoverage.total=' + cov.total + ' != templates.length=' + n);
  if (entries !== n) out.push('entri grammar-explanations-id=' + entries + ' != templates.length=' + n);
  return out;
}

/** E: count vocabulary-th vs isi nyatanya. */
function vthCountDrift(vthObj) {
  const n = Object.keys(vthObj.entries || {}).length;
  return vthObj.count === n ? null : 'vocabulary-th.count=' + vthObj.count + ' != entri nyata=' + n;
}

/* =========================================================================
 * GATE — data nyata
 * ======================================================================= */

test('A. setiap template punya entri di grammar-explanations-id.json (bukti: f87a39a menambah 27 template; 10 entrinya lahir cacat)', () => {
  const missing = missingEntries(bank, source);
  assert.strictEqual(missing.length, 0, missing.length + ' template tanpa entri sumber: ' + missing.slice(0, 8).join(', ')
    + '\n    Perbaiki: node tools/sync-grammar-explanations-id.js --write && node audit/merge-grammar-id.js');
});

test('B. kunci distraktor sumber = persis opsi template SAAT INI (bukti: b0d983c memperbaiki TA-006/GI-002/b4_003/b4_018 di bank saja; 11 entri basi baru ketahuan di c3e02f3; 10 entri GEN-2 tanpa blok distractors lolos di f87a39a)', () => {
  const drift = distractorKeyDrift(bank, source);
  assert.strictEqual(drift.length, 0, drift.length + ' entri drift, mis. ' + JSON.stringify(drift.slice(0, 3))
    + '\n    Perbaiki: node tools/sync-grammar-explanations-id.js --write && node audit/merge-grammar-id.js');
});

test('C. nilai sumber identik dengan field ...Id bank — sinkron dua arah (bukti: 5643a32 menulis ulang whyFailsId di bank; 59 nilai sumber melenceng diam-diam sampai f87a39a)', () => {
  const drift = valueDrift(bank, source);
  assert.strictEqual(drift.length, 0, drift.length + ' field melenceng, mis. ' + JSON.stringify(drift.slice(0, 5))
    + '\n    Perbaiki: node tools/sync-grammar-explanations-id.js --write && node audit/merge-grammar-id.js');
});

test('D. indonesianCoverage.translated === total === templates.length === jumlah entri sumber (bukti: 222/222 vs 249 template lolos hijau di f87a39a — gerbang lama hanya cek translated===total)', () => {
  const drift = coverageDrift(bank, source);
  assert.strictEqual(drift.length, 0, drift.join('; ')
    + '\n    Perbaiki: node audit/merge-grammar-id.js (menghitung ulang indonesianCoverage)');
});

test('E. vocabulary-th.count === jumlah entri nyata (bukti celah: th-coverage-test.js keluar dari CI per 9bf2e13 — sejak itu TIDAK ADA gerbang CI yang membaca count ini; kelas cacat sama dengan indonesianCoverage di f87a39a)', () => {
  const drift = vthCountDrift(vth);
  assert.strictEqual(drift, null, drift + '\n    Perbaiki: samakan field count dengan jumlah entri saat mengubah vocabulary-th.json');
});

test('alat perbaikan dan gate ini satu mata uang: tools/sync-grammar-explanations-id.js menilai SINKRON pada data nyata', () => {
  const { source: rebuilt } = sync.buildSynced(bank, source);
  /* m025-202: akhir baris dinormalkan sebelum dibandingkan. Di checkout Windows dengan
     core.autocrlf, berkas di disk ber-CRLF sementara serialize() selalu menulis LF, jadi
     assert byte-identik ini MERAH di mesin pemilik dan HIJAU di CI Linux - untuk data yang
     isinya sama persis (A-E semuanya hijau; selisihnya 5.981 byte = jumlah baris). Gerbang
     yang hanya bisa hijau di satu sistem operasi mengajari orang mengabaikan suite lokal,
     padahal CLAUDE.md justru mewajibkan suite itu hijau sebelum sesuatu disebut selesai.
     Yang dijaga tetap sama: ISI hasil buildSynced harus identik dengan isi di disk. */
  const norm = (s) => s.replace(/\r\n/g, '\n');
  assert.strictEqual(norm(sync.serialize(rebuilt)), norm(fs.readFileSync(sync.SOURCE_PATH, 'utf8')),
    'buildSynced menghasilkan berkas berbeda dari disk — jalankan: node tools/sync-grammar-explanations-id.js --write');
});

/* =========================================================================
 * MATRIKS RACUN — setiap detektor dibuktikan bisa MERAH (in-memory, nol I/O)
 * ======================================================================= */
const clone = (x) => JSON.parse(JSON.stringify(x));

test('racun A: menghapus satu entri sumber terdeteksi', () => {
  const p = clone(source);
  delete p.templates[String(bank.templates[0].id)];
  assert.strictEqual(missingEntries(bank, p).length, 1, 'detektor A buta');
});

test('racun B1: opsi template diganti (pola perbaikan b0d983c) → kunci sumber jadi basi + hilang', () => {
  const p = clone(bank);
  const t = p.templates.find((x) => (x.distractors || []).length > 0);
  t.distractors[0].option = '__opsi-baru-hasil-perbaikan__';
  const drift = distractorKeyDrift(p, source);
  const hit = drift.find((d) => d.id === t.id);
  assert.ok(hit && hit.stale.length === 1 && hit.missing.length === 1, 'detektor B buta terhadap opsi yang diganti');
});

test('racun B2: entri baru tanpa blok distractors (pola f87a39a A1-008..A1-017) terdeteksi', () => {
  const p = clone(source);
  const t = bank.templates.find((x) => (x.distractors || []).length > 0);
  delete p.templates[String(t.id)].distractors;
  const hit = distractorKeyDrift(bank, p).find((d) => d.id === t.id);
  assert.ok(hit && hit.missing.length === (t.distractors || []).length, 'detektor B buta terhadap blok distractors yang hilang');
});

test('racun C: whyFailsId diedit di bank tanpa backport (pola 5643a32) terdeteksi', () => {
  const p = clone(bank);
  const t = p.templates.find((x) => (x.distractors || []).length > 0);
  t.distractors[0].whyFailsId = 'nilai baru hasil QA yang lupa di-backport.';
  assert.ok(valueDrift(p, source).some((d) => d.id === t.id), 'detektor C buta terhadap nilai yang melenceng');
});

test('racun D: menambah template tanpa merge ulang (pola f87a39a, 222/222 vs 249) terdeteksi', () => {
  const p = clone(bank);
  p.templates.push(clone(p.templates[0]));
  p.templates[p.templates.length - 1].id = '__F2-racun__';
  assert.ok(coverageDrift(p, source).length >= 2, 'detektor D buta terhadap inventori basi');
});

test('racun E: count vocabulary-th digeser satu terdeteksi', () => {
  const p = clone(vth);
  p.count = p.count + 1;
  assert.ok(vthCountDrift(p), 'detektor E buta terhadap count basi');
});

if (failures) { console.error('\ncontent-drift: ' + failures + ' gate GAGAL.'); process.exit(1); }
console.log('\ncontent-drift: PASS (' + bank.templates.length + ' template sinkron dua arah dengan sumber terjemahannya).');
