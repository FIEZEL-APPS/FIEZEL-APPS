#!/usr/bin/env node
/**
 * tests/misconception-taxonomy-test.js — Pemilik: A5
 *
 * KENAPA test ini ada:
 * Council (model-council-claude_opus_5_0.md T5) membuktikan 417 entri distraktor di
 * grammar-templates.json memakai 416 label miskonsepsi unik — tanpa taksonomi kanonik,
 * ledger miskonsepsi (A4) tidak pernah bisa mengakumulasi bukti lintas soal (nol daya
 * transfer). Gate di bawah menjaga tiga hal: (1) SETIAP label terpetakan (nol yatim),
 * (2) taksonomi tetap ringkas (<=50 kode), (3) setiap kode benar-benar dipakai lintas
 * label (>=3) sehingga akumulasi bukti bermakna — kecuali daftar pengecualian
 * eksplisit yang beralasan (maks 8 kode).
 */

'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var ROOT = __fzRoot;
var TAXONOMY_PATH = path.join(ROOT, 'misconception-taxonomy-v1.json');
var TEMPLATES_PATH = path.join(ROOT, 'grammar-templates.json');

/*
 * Pengecualian gate (c): kode yang boleh dipakai <3 label, WAJIB beralasan.
 * Saat ini KOSONG — semua 49 kode terpakai oleh >=3 label. Kalau konten baru
 * membuat sebuah kode menyusut di bawah 3, tambahkan di sini DENGAN alasan
 * pedagogis tertulis, maksimal 8 entri (dijaga oleh assert di bawah).
 * Format: { '<kode>': '<alasan kenapa kode ini tetap layak walau <3 label>' }
 */
var LOW_USE_EXCEPTIONS = {};

var failures = 0;
function ok(name, fn) {
  try {
    fn();
    console.log('ok - ' + name);
  } catch (e) {
    failures++;
    console.error('GAGAL - ' + name);
    console.error('  ' + (e && e.message ? e.message : e));
  }
}

var taxonomy = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf8'));
var templates = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));

/* ---------- (d) skema JSON valid ---------- */
ok('skema: schema id benar dan struktur atas lengkap', function () {
  assert.strictEqual(taxonomy.schema, 'fiezel-misconception-taxonomy-v1', 'schema id salah: ' + taxonomy.schema);
  assert.ok(taxonomy.codes && typeof taxonomy.codes === 'object' && !Array.isArray(taxonomy.codes), 'codes harus objek');
  assert.ok(taxonomy.map && typeof taxonomy.map === 'object' && !Array.isArray(taxonomy.map), 'map harus objek');
});

ok('skema: setiap kode berformat family.mechanism dan punya label+familyHint+description_id', function () {
  var codeRe = /^[a-z_]+\.[a-z_0-9]+$/;
  Object.keys(taxonomy.codes).forEach(function (code) {
    assert.ok(codeRe.test(code), 'format kode tidak valid: ' + code);
    var c = taxonomy.codes[code];
    assert.ok(c && typeof c.label === 'string' && c.label.length > 0, code + ': label kosong');
    assert.ok(typeof c.familyHint === 'string' && c.familyHint.length > 0, code + ': familyHint kosong');
    assert.ok(typeof c.description_id === 'string' && c.description_id.length >= 20, code + ': description_id kosong/terlalu pendek');
  });
});

ok('skema: setiap nilai map menunjuk ke kode yang terdefinisi', function () {
  Object.keys(taxonomy.map).forEach(function (label) {
    var code = taxonomy.map[label];
    assert.ok(Object.prototype.hasOwnProperty.call(taxonomy.codes, code),
      'map menunjuk kode tak dikenal: ' + JSON.stringify(label) + ' -> ' + code);
  });
});

/* ---------- (a) setiap label miskonsepsi di grammar-templates.json terpetakan ---------- */
ok('cakupan: SETIAP label misconception di grammar-templates.json terpetakan (nol yatim)', function () {
  var orphans = [];
  var totalEntries = 0;
  var uniqueLabels = {};
  (templates.templates || []).forEach(function (tpl) {
    (tpl.distractors || []).forEach(function (d) {
      if (!d || typeof d.misconception !== 'string' || !d.misconception.trim()) return;
      totalEntries++;
      uniqueLabels[d.misconception] = true;
      if (!Object.prototype.hasOwnProperty.call(taxonomy.map, d.misconception)) orphans.push(d.misconception);
    });
  });
  assert.ok(totalEntries >= 400, 'entri distraktor terlalu sedikit terbaca: ' + totalEntries);
  assert.strictEqual(orphans.length, 0,
    orphans.length + ' label yatim, contoh: ' + orphans.slice(0, 5).map(function (l) { return JSON.stringify(l); }).join(' | '));
  console.log('  (info: ' + totalEntries + ' entri distraktor, ' + Object.keys(uniqueLabels).length + ' label unik, semua terpetakan)');
});

ok('cakupan: tidak ada kunci map yang mati (label yang sudah tidak ada di templates)', function () {
  var live = {};
  (templates.templates || []).forEach(function (tpl) {
    (tpl.distractors || []).forEach(function (d) {
      if (d && typeof d.misconception === 'string') live[d.misconception] = true;
    });
  });
  var dead = Object.keys(taxonomy.map).filter(function (l) { return !live[l]; });
  assert.strictEqual(dead.length, 0, dead.length + ' kunci map mati, contoh: ' + dead.slice(0, 5).join(' | '));
});

/* ---------- (b) jumlah kode <= 50 ---------- */
ok('ringkas: jumlah kode <= 50 (dan cukup kaya, >= 30)', function () {
  var n = Object.keys(taxonomy.codes).length;
  assert.ok(n <= 50, 'terlalu banyak kode: ' + n);
  assert.ok(n >= 30, 'terlalu sedikit kode untuk membedakan mekanisme: ' + n);
});

/* ---------- (c) setiap kode dipakai >= 3 label, kecuali pengecualian eksplisit ---------- */
ok('transfer: setiap kode dipakai >= 3 label (pengecualian eksplisit maks 8, beralasan)', function () {
  var exceptions = Object.keys(LOW_USE_EXCEPTIONS);
  assert.ok(exceptions.length <= 8, 'daftar pengecualian melebihi 8: ' + exceptions.length);
  exceptions.forEach(function (code) {
    assert.ok(Object.prototype.hasOwnProperty.call(taxonomy.codes, code), 'pengecualian menunjuk kode tak dikenal: ' + code);
    assert.ok(typeof LOW_USE_EXCEPTIONS[code] === 'string' && LOW_USE_EXCEPTIONS[code].length >= 10,
      'pengecualian ' + code + ' wajib punya alasan tertulis');
  });
  var usage = {};
  Object.keys(taxonomy.codes).forEach(function (c) { usage[c] = 0; });
  Object.keys(taxonomy.map).forEach(function (label) { usage[taxonomy.map[label]]++; });
  var thin = Object.keys(usage).filter(function (c) {
    return usage[c] < 3 && !Object.prototype.hasOwnProperty.call(LOW_USE_EXCEPTIONS, c);
  });
  assert.strictEqual(thin.length, 0, 'kode dipakai <3 label tanpa pengecualian: ' +
    thin.map(function (c) { return c + '(' + usage[c] + ')'; }).join(', '));
  var unused = Object.keys(usage).filter(function (c) { return usage[c] === 0; });
  assert.strictEqual(unused.length, 0, 'kode tidak terpakai sama sekali: ' + unused.join(', '));
});

/* ---------- generator sinkron dengan artefak ---------- */
ok('generator: tools/build-misconception-taxonomy.js meregenerasi peta yang identik', function () {
  var builder = require('../tools/build-misconception-taxonomy.js');
  var built = builder.buildMap();
  assert.strictEqual(built.orphans.length, 0, 'generator menghasilkan yatim: ' + built.orphans.join(' | '));
  var regenerated = { schema: builder.SCHEMA, codes: builder.CODES, map: built.map };
  assert.strictEqual(JSON.stringify(regenerated), JSON.stringify(taxonomy),
    'misconception-taxonomy-v1.json tidak sinkron; jalankan: node tools/build-misconception-taxonomy.js --write');
});

/* ---------- transfer L1 Indonesia hadir sesuai mandat council ---------- */
ok('mandat: kode transfer.id_l1_pattern ada dan terpakai', function () {
  assert.ok(taxonomy.codes['transfer.id_l1_pattern'], 'kode transfer.id_l1_pattern hilang');
  var used = Object.keys(taxonomy.map).filter(function (l) { return taxonomy.map[l] === 'transfer.id_l1_pattern'; });
  assert.ok(used.length >= 3, 'transfer.id_l1_pattern dipakai < 3 label: ' + used.length);
});

if (failures > 0) {
  console.error('Misconception Taxonomy: GAGAL (' + failures + ' gate)');
  process.exit(1);
}
console.log('Misconception Taxonomy: PASS');
