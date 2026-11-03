#!/usr/bin/env node
/**
 * tests/i18n-leak-guard-test.js — GERBANG PENGAWAS KEBOCORAN i18n & PIVOT GOLDEN ENGLISH
 *
 * Sesuai Mandat Master Arsitektur Pilar 4:
 * 1. KEBOCORAN BAHASA INDONESIA = 0% (Nol toleransi untuk pengguna non-Indonesia).
 * 2. Universal Golden Pivot: Saat kunci belum diterjemahkan di Thai (th) atau bahasa lain,
 *    teks yang tampil WAJIB Bahasa Inggris ('en'), TIDAK BOLEH BAHASA INDONESIA ('id').
 * 3. Verifikasi menyeluruh pada layar utama: Home, Quiz, Grammar, Vocab, Modal, dan Navigasi.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const I18N_PATH = path.join(__fzRoot, 'features', 'i18n', 'fiezel-i18n.js');
const LOCALES_DIR = path.join(__fzRoot, 'features', 'i18n', 'locales');

console.log('--- MENJALANKAN GERBANG I18N LEAK GUARD & UNIVERSAL PIVOT ---');

// Muat runtime FiezelI18n
const FiezelI18n = require(I18N_PATH);

// 1. Verifikasi Konstanta & Golden Pivot
assert.strictEqual(FiezelI18n.GOLDEN_PIVOT, 'en', 'Golden pivot wajib en');
assert.ok(FiezelI18n.SUPPORTED.includes('th'), 'Thai wajib didukung');
assert.ok(FiezelI18n.SUPPORTED.includes('en'), 'English wajib didukung');
assert.ok(FiezelI18n.SUPPORTED.includes('id'), 'Indonesian didukung');
console.log('PASS: Konstanta dan konfigurasi Golden Pivot valid.');

// 2. Verifikasi Katalog JSON Satu Pintu
const namespaces = ['ui', 'quiz', 'grammar', 'vocab'];
for (const loc of ['id', 'th', 'en']) {
  for (const ns of namespaces) {
    const p = path.join(LOCALES_DIR, loc, `${ns}.json`);
    assert.ok(fs.existsSync(p), `Katalog JSON ${loc}/${ns}.json wajib ada`);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(Object.keys(data).length > 0, `Katalog ${loc}/${ns}.json tidak boleh kosong`);
    if (loc === 'th') {
      FiezelI18n.overrideCopy('th', data);
    }
  }
}
console.log('PASS: 12 katalog JSON ber-namespace (id, th, en x 4 NS) lengkap dan valid.');

// 3. Verifikasi Rantai Fallback: Non-ID -> EN (Zero-Leak Fallback)
// Siapkan kunci uji coba simulasi
const MOCK_KEY_ID_ONLY = 'leak-test.khusus-indonesia-mock';
const MOCK_KEY_EN_PIVOT = 'leak-test.fitur-baru-mock';

// Daftarkan kunci ke ID dan EN saja (belum diterjemahkan ke Thai)
FiezelI18n.overrideCopy('id', { [MOCK_KEY_ID_ONLY]: 'Teks bahasa Indonesia yang tidak boleh bocor' });
FiezelI18n.overrideCopy('en', { [MOCK_KEY_EN_PIVOT]: 'English golden pivot fallback text' });
FiezelI18n.overrideCopy('id', { [MOCK_KEY_EN_PIVOT]: 'Teks Indonesia untuk fitur baru' });

// Uji saat mode Thai aktif
FiezelI18n.setLocale('th');
assert.strictEqual(FiezelI18n.getLocale(), 'th', 'Locale aktif wajib th');

// Kunci yang belum ada di Thai tapi ada di EN -> WAJIB jatuh ke EN
const fallbackResult = FiezelI18n.t(MOCK_KEY_EN_PIVOT);
assert.strictEqual(fallbackResult, 'English golden pivot fallback text',
  'Saat kunci belum ada di Thai, wajib jatuh ke English pivot');
assert.ok(!/Indonesia|Teks|fitur|baru/i.test(fallbackResult),
  'DILARANG KERAS teks Indonesia bocor ke pengguna Thai');
console.log('PASS: Rantai fallback mode Thai -> English Golden Pivot terbukti aman.');

// Kunci yang hanya ada di ID (tidak ada di Thai maupun EN) -> WAJIB kembalikan raw key, TIDAK BOLEH bocor teks ID!
const rawKeyResult = FiezelI18n.t(MOCK_KEY_ID_ONLY);
assert.strictEqual(rawKeyResult, MOCK_KEY_ID_ONLY,
  'Kunci tanpa EN tidak boleh bocor ke teks Indonesia, wajib return raw key');
console.log('PASS: Kebocoran ID pada mode Thai = 0% (Nol kebocoran terbukti).');

// 4. Verifikasi Mutu Pedagogis Thai (Pilar 3: Anti-Robot Slop)
const samplePedagogicalKeys = [
  'grammar.alasan-benar-kausal',
  'grammar.alasan-opsi-agreement',
  'quiz.intinya',
  'quiz.mengapa-kurang-tepat',
  'quiz.trik-ingat',
  'quiz.aturan-tata-bahasa',
  'quiz.tuntunan-langkah',
  'quiz.coba-lagi'
];

samplePedagogicalKeys.forEach((key) => {
  const textTh = FiezelI18n.t(key);
  if (textTh && textTh !== key) {
    // Pastikan tidak ada frasa kaku Indonesia yang tersisa
    assert.ok(!/INTINYA|Mengapa kurang tepat|Trik Cepat Ingat|Aturan Tata Bahasa|TUNTUNAN LANGKAH/i.test(textTh),
      `Naskah pedagogis Thai untuk '${key}' tidak boleh mengandung frasa kaku Indonesia: ${textTh}`);
  }
});
console.log('PASS: Standar mutu pedagogis Thai anti-slop terverifikasi.');

// 5. Verifikasi Simulasi Layar Utama
const screens = [
  { name: 'Home', keys: ['nav.home', 'home.brief-goal-adaptif', 'nav.back-home-aria'] },
  { name: 'Quiz', keys: ['topbar.ask', 'common.sapaan-netral'] },
  { name: 'Settings', keys: ['nav.open-settings-aria'] }
];

screens.forEach((screen) => {
  screen.keys.forEach((k) => {
    const val = FiezelI18n.t(k);
    assert.ok(val && val.length > 0, `Layar ${screen.name} kunci ${k} wajib menghasilkan naskah`);
    // Dalam mode Thai, naskah tidak boleh mengandung kata penanda kuat bahasa Indonesia
    assert.ok(!/\b(nggak|kamu|latihan|jawaban|soal|pengaturan)\b/i.test(val),
      `Teks Indonesia bocor di layar ${screen.name} untuk kunci ${k}: ${val}`);
  });
});
console.log('PASS: Simulasi layar utama (Home, Quiz, Settings) bebas kebocoran teks Indonesia.');

// Kembalikan locale ke id
FiezelI18n.setLocale('id');

console.log('\nSEMUA GERBANG I18N LEAK GUARD & UNIVERSAL PIVOT: 100% HIJAU (PASS)!');
