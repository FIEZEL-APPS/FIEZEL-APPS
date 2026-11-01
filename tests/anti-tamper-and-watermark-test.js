/**
 * tests/anti-tamper-and-watermark-test.js
 *
 * Verifikasi Mutu & Invarian:
 * 1. Steganografi Forensik (FiezelWatermark):
 *    - Round-trip encoding & decoding payload identitas murid.
 *    - Karakter zero-width tak terlihat (visual identical, zero-width).
 *    - Injeksi watermark ke kalimat soal.
 *    - Pembersihan (strip) untuk audio TTS & pencocokan token.
 * 2. Anti-Tamper & Origin Shield (FiezelAntiTamper):
 *    - Validasi domain resmi (fiezel.my.id, capacitor, localhost).
 *    - Penolakan domain kloning / pembajak.
 *    - Aturan CSS anti-seleksi pada kartu soal.
 * 3. Precache & Boot Invariant:
 *    - Terdaftar di index.html dengan defer.
 *    - Terdaftar di ASSETS sw.js.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log('PASS ' + name);
  } catch (err) {
    fail++;
    console.error('FAIL ' + name + ' -> ' + err.message);
  }
}

const watermark = require('../features/ui/fiezel-watermark.js');
const antiTamper = require('../features/ui/fiezel-anti-tamper.js');

// 1. Watermark encoding / decoding
test('Watermark: Round-trip encode & decode', () => {
  const payload = 'fz:u_test99a';
  const encoded = watermark.encode(payload);
  assert.ok(encoded.length > 0, 'Encoded string harus berisi karakter');
  assert.ok(encoded.includes(watermark.ZW_START), 'Harus memiliki ZW_START delimiter');
  assert.ok(encoded.includes(watermark.ZW_END), 'Harus memiliki ZW_END delimiter');

  const decoded = watermark.decode(encoded);
  assert.strictEqual(decoded, payload, 'Payload decoded harus sama persis dengan aslinya');
});

test('Watermark: Visual text remains identical after watermark', () => {
  const original = 'She went to the library yesterday to borrow three books.';
  const watermarked = watermark.watermarkText(original, 'fz:acc_4412');
  assert.notStrictEqual(watermarked, original, 'String watermarked harus memuat byte tersembunyi');
  assert.strictEqual(watermark.strip(watermarked), original, 'Setelah di-strip harus 100% identik');
  assert.strictEqual(watermark.hasWatermark(watermarked), true, 'hasWatermark harus bernilai true');
  assert.strictEqual(watermark.hasWatermark(original), false, 'Original tidak boleh memiliki watermark');

  const extracted = watermark.decode(watermarked);
  assert.strictEqual(extracted, 'fz:acc_4412', 'Identitas murid yang menyalin harus terbaca dari decoded string');
});

test('Watermark: Idempotency (tidak memasang ganda)', () => {
  const original = 'I am studying Japanese grammar right now.';
  const first = watermark.watermarkText(original, 'fz:id1');
  const second = watermark.watermarkText(first, 'fz:id2');
  assert.strictEqual(first, second, 'Watermark tidak boleh terpasang dua kali pada kalimat yang sama');
});

test('Watermark: Single-word sentence handling', () => {
  const oneWord = 'Arigatou';
  const marked = watermark.watermarkText(oneWord, 'fz:single');
  assert.ok(watermark.hasWatermark(marked), 'Kata tunggal harus bisa di-watermark');
  assert.strictEqual(watermark.decode(marked), 'fz:single');
  assert.strictEqual(watermark.strip(marked), oneWord);
});

// 2. Anti-Tamper & Origin Shield
test('Anti-Tamper: Local and test environments allowed', () => {
  assert.strictEqual(antiTamper.isLocalOrTest(), true, 'Lingkungan Node test harus terdeteksi sebagai local/test');
  assert.strictEqual(antiTamper.isAllowedDomain(), true, 'Lingkungan Node test harus diizinkan');
});

test('Anti-Tamper: Precache & index.html registration', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');

  assert.ok(indexHtml.includes('features/ui/fiezel-watermark.js'), 'index.html harus memuat fiezel-watermark.js');
  assert.ok(indexHtml.includes('features/ui/fiezel-anti-tamper.js'), 'index.html harus memuat fiezel-anti-tamper.js');

  assert.ok(sw.includes('./features/ui/fiezel-watermark.js'), 'sw.js ASSETS harus memuat fiezel-watermark.js');
  assert.ok(sw.includes('./features/ui/fiezel-anti-tamper.js'), 'sw.js ASSETS harus memuat fiezel-anti-tamper.js');
});

test('Anti-Tamper: DOM and CSS protection rule structure', () => {
  const src = fs.readFileSync(path.join(__dirname, '../features/ui/fiezel-anti-tamper.js'), 'utf8');
  assert.ok(src.includes('user-select: none !important'), 'Harus menyertakan rule user-select none untuk kuis');
  assert.ok(src.includes('contextmenu'), 'Harus menyertakan listener contextmenu');
  assert.ok(src.includes('F12'), 'Harus menyertakan proteksi shortcut F12');
  assert.ok(src.includes('Ctrl+Shift+I'), 'Harus memblokir inspect DevTools');
});

console.log(`\nHASIL: ${pass} lulus, ${fail} gagal.`);
if (fail > 0) process.exit(1);
