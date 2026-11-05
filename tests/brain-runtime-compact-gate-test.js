#!/usr/bin/env node
/**
 * FIEZEL Gate — Braincore Runtime Cold-Boot Compaction & Revision Integrity
 *
 * Memastikan seluruh 33 modul di features/brain/ tetap ringkas untuk cold-boot
 * PWA perangkat seluler (precache Service Worker < 240 KB total, turun dari ~593 KB),
 * memiliki header revisi runtime standar, dan mengekspor objek API UMD yang valid.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRAIN_DIR = path.join(ROOT, 'features', 'brain');
const MAX_TOTAL_BYTES = 240 * 1024;

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log('ok - ' + name);
  } catch (e) {
    failures++;
    console.error('FAIL - ' + name + '\n    ' + e.message);
  }
}

const files = fs.readdirSync(BRAIN_DIR).filter((f) => f.endsWith('.js')).sort();

test('seluruh 33 modul Braincore hadir di features/brain/', () => {
  assert.strictEqual(files.length, 33, 'jumlah modul Braincore berubah: ' + files.length);
});

test('ukuran total precache features/brain/ di bawah anggaran cold-boot 240 KB', () => {
  let total = 0;
  for (const f of files) {
    total += fs.statSync(path.join(BRAIN_DIR, f)).size;
  }
  assert.ok(
    total <= MAX_TOTAL_BYTES,
    `total ukuran features/brain/ (${(total / 1024).toFixed(1)} KB) melebihi anggaran cold-boot ${(MAX_TOTAL_BYTES / 1024).toFixed(0)} KB`
  );
});

test('setiap modul memiliki header revisi runtime dan dapat dimuat via UMD/CommonJS', () => {
  for (const f of files) {
    const abs = path.join(BRAIN_DIR, f);
    const src = fs.readFileSync(abs, 'utf8');
    assert.ok(
      /^\/\* FIEZEL Braincore Runtime v3\.14\.0 \| rev: [0-9a-f]{16}/.test(src),
      `${f}: header revisi runtime tidak ditemukan atau format tidak sah`
    );
    assert.ok(
      /var _fzR='[0-9a-f]{16}',_fzA=\d+;/.test(src) && /function _fzG\(g,m\)/.test(src),
      `${f}: token integritas revisi atau guard ekspor UMD (_fzG) tidak ditemukan`
    );
    const exported = require(abs);
    assert.ok(exported && typeof exported === 'object', `${f}: gagal diekspor sebagai objek UMD`);
  }
});

if (failures > 0) {
  console.error(`\nFIEZEL Braincore Runtime Compact Gate: FAIL (${failures})`);
  process.exit(1);
}
console.log('\nFIEZEL Braincore Runtime Compact Gate: PASS');
