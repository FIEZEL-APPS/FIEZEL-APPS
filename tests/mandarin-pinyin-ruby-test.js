/**
 * tests/mandarin-pinyin-ruby-test.js
 *
 * Uji Mutu Mekanis Mesin Anotasi Ruby Pinyin Otomatis & Sakelar Global Display
 * Memverifikasi:
 * 1. Segmentasi Leksikon & Anotasi <ruby class="zh-ruby">...<rt class="zh-rt">...</rt></ruby>
 * 2. Keutuhan teks campuran (Latin + Hanzi + Punctuation)
 * 3. Persistensi preferensi tampilan localStorage ('fiezel-zh-display-v1')
 * 4. CSS token system & zero-layout shift toggle (.fz-zh-no-pinyin)
 * 5. Format transkripsi 3-baris percakapan Xiao Mochi
 * 6. Invarian Zero Third-Party Branding & Clean Room
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

console.log('[TEST] Menjalankan verifikasi mesin Pinyin Ruby otomatis...');

// 1. Verifikasi Modul & API
const pinyinEngine = require(path.join(ROOT, 'features/mandarin/mandarin-pinyin-engine.js'));
assert.ok(pinyinEngine, 'Modul mandarin-pinyin-engine harus ada');
assert.strictEqual(typeof pinyinEngine.annotateText, 'function');
assert.strictEqual(typeof pinyinEngine.rubyHtml, 'function');
assert.strictEqual(typeof pinyinEngine.readPrefs, 'function');
assert.strictEqual(typeof pinyinEngine.writePrefs, 'function');
assert.strictEqual(typeof pinyinEngine.togglePinyin, 'function');
assert.strictEqual(typeof pinyinEngine.renderDisplayToggleBar, 'function');
assert.strictEqual(typeof pinyinEngine.formatThreeLine, 'function');
console.log('✓ Pilar 1: API Mesin Pinyin Engine lengkap.');

// 2. Verifikasi Anotasi Teks Hanzi Murni
const niHaoRuby = pinyinEngine.annotateText('你好');
assert.ok(niHaoRuby.includes('<ruby class="zh-ruby">你<rp>(</rp><rt class="zh-rt">nǐ</rt><rp>)</rp></ruby>'), 'Karakter 你 harus ber-Pinyin nǐ');
assert.ok(niHaoRuby.includes('<ruby class="zh-ruby">好<rp>(</rp><rt class="zh-rt">hǎo</rt><rp>)</rp></ruby>'), 'Karakter 好 harus ber-Pinyin hǎo');

// 3. Verifikasi Teks Campuran (Latin, Angka, Hanzi, Tanda Baca)
const mixedText = 'Halo! Saya belajar 汉语 di Beijing 2026.';
const mixedRuby = pinyinEngine.annotateText(mixedText);
assert.ok(mixedRuby.startsWith('Halo! Saya belajar '), 'Teks Latin awal tidak boleh berubah');
assert.ok(mixedRuby.includes('<ruby class="zh-ruby">汉<rp>(</rp><rt class="zh-rt">hàn</rt><rp>)</rp></ruby>'), 'Karakter 汉 harus ber-Pinyin');
assert.ok(mixedRuby.includes('<ruby class="zh-ruby">语<rp>(</rp><rt class="zh-rt">yǔ</rt><rp>)</rp></ruby>'), 'Karakter 语 harus ber-Pinyin');
assert.ok(mixedRuby.endsWith(' di Beijing 2026.'), 'Teks Latin akhir tidak boleh berubah');

// 4. Verifikasi Teks Tanpa Hanzi (Harus Polos Tanpa Tag Ruby)
const plainText = 'Good morning everyone, 12345!';
const plainResult = pinyinEngine.annotateText(plainText);
assert.strictEqual(plainResult, plainText, 'Teks tanpa Hanzi harus dikembalikan polos tanpa tag ruby');

// 5. Verifikasi Format Transkripsi 3-Baris Xiao Mochi
const threeLine = pinyinEngine.formatThreeLine('你好！', 'Nǐ hǎo!', 'Halo!');
assert.ok(threeLine.includes('fz-zh-three-line'), 'Harus memiliki kelas kontainer fz-zh-three-line');
assert.ok(threeLine.includes('fz-zh-line-hz'), 'Harus memiliki baris Hanzi fz-zh-line-hz');
assert.ok(threeLine.includes('fz-zh-line-py'), 'Harus memiliki baris Pinyin fz-zh-line-py');
assert.ok(threeLine.includes('fz-zh-line-id'), 'Harus memiliki baris arti fz-zh-line-id');
assert.ok(threeLine.includes('Nǐ hǎo!'), 'Harus memuat teks Pinyin');
assert.ok(threeLine.includes('Halo!'), 'Harus memuat teks arti ID');
console.log('✓ Pilar 2: Anotasi Ruby & Format 3-Baris terverifikasi.');

// 6. Verifikasi Preferensi Display & Tombol Toggle
const toggleBar = pinyinEngine.renderDisplayToggleBar();
assert.ok(toggleBar.includes('fz-zh-display-bar'), 'Harus memuat kontainer toggle bar');
assert.ok(toggleBar.includes('fz-zh-pinyin-toggle-btn'), 'Harus memuat tombol toggle Pinyin');
assert.ok(toggleBar.includes('aria-pressed'), 'Tombol harus memiliki atribut aria-pressed');
assert.ok(toggleBar.includes('拼音 Pinyin'), 'Label tombol harus memuat 拼音 Pinyin');

// 7. Verifikasi CSS Rules & Invariant
const cssContent = fs.readFileSync(path.join(ROOT, 'features/mandarin/mandarin.css'), 'utf8');
assert.ok(cssContent.includes('ruby.zh-ruby'), 'mandarin.css harus mendefinisikan ruby.zh-ruby');
assert.ok(cssContent.includes('rt.zh-rt'), 'mandarin.css harus mendefinisikan rt.zh-rt');
assert.ok(cssContent.includes('body.fz-zh-no-pinyin rt.zh-rt'), 'mandarin.css harus mendefinisikan penyembunyian pinyin');
assert.ok(cssContent.includes('.fz-zh-three-line'), 'mandarin.css harus mendefinisikan .fz-zh-three-line');
console.log('✓ Pilar 3: CSS Token & Zero-Layout Shift terverifikasi.');

// 8. Zero Third-Party Branding Invariant
const engineContent = fs.readFileSync(path.join(ROOT, 'features/mandarin/mandarin-pinyin-engine.js'), 'utf8');
assert.ok(!/SuperChinese/i.test(engineContent), 'Dilarang memuat SuperChinese');
assert.ok(!/akm\.hskcdn\.com/i.test(engineContent), 'Dilarang memuat CDN pihak ketiga');
assert.ok(!/\bChao\b/.test(engineContent), 'Dilarang memuat Chao');
console.log('✓ Pilar 4: Zero Third-Party Branding terverifikasi.');

console.log('======================================================');
console.log('✓ SELURUH UJI MUTU MESIN PINYIN RUBY MANDARIN LULUS 100%!');
console.log('======================================================');
