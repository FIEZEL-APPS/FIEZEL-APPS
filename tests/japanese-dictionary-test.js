#!/usr/bin/env node
'use strict';

/**
 * tests/japanese-dictionary-test.js
 * Comprehensive Verification Gate for FiezelJaDictionary.
 * Enforces Zero-Potemkin Invariant and Zero-Bare-Kanji Invariant.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const dictPath = path.join(ROOT, 'features', 'japanese', 'fiezel-ja-dictionary.js');

let passed = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  passed++;
  console.log('  ok - ' + msg);
}

console.log('=== FIEZEL JAPANESE DICTIONARY TEST SUITE ===');

// 1. Module import & structure
const dict = require(dictPath);
ok(dict && typeof dict === 'object', 'T1: Modul fiezel-ja-dictionary berhasil di-require CommonJS');
ok(dict.WORDS && typeof dict.WORDS === 'object', 'T1: Kamus WORDS tersedia');
ok(dict.STEMS && typeof dict.STEMS === 'object', 'T1: Kamus STEMS tersedia');
ok(dict.SINGLE && typeof dict.SINGLE === 'object', 'T1: Kamus SINGLE tersedia');
ok(dict.COUNTERS && typeof dict.COUNTERS === 'object', 'T1: Kamus COUNTERS tersedia');
ok(typeof dict.lookupWord === 'function', 'T1: lookupWord API tersedia');
ok(typeof dict.lookupStem === 'function', 'T1: lookupStem API tersedia');
ok(typeof dict.lookupSingle === 'function', 'T1: lookupSingle API tersedia');
ok(typeof dict.lookupCounter === 'function', 'T1: lookupCounter API tersedia');
ok(typeof dict.kanaToRomaji === 'function', 'T1: kanaToRomaji API tersedia');

// 2. Quantitative Size Gate (Zero-Potemkin)
const wordCount = Object.keys(dict.WORDS).length;
const stemCount = Object.keys(dict.STEMS).length;
const singleCount = Object.keys(dict.SINGLE).length;
const counterUnits = Object.keys(dict.COUNTERS).length;

console.log(`\nQuantitative Verification:`);
console.log(`  WORDS:    ${wordCount} (Target: >= 5,000)`);
console.log(`  STEMS:    ${stemCount} (Target: >= 1,000)`);
console.log(`  SINGLE:   ${singleCount} (Target: >= 1,640)`);
console.log(`  COUNTERS: ${counterUnits} (Target: >= 15)\n`);

ok(wordCount >= 5000, `T2: WORDS memuat ${wordCount} entri (>= 5,000)`);
ok(stemCount >= 1000, `T2: STEMS memuat ${stemCount} entri (>= 1,000)`);
ok(singleCount >= 1640, `T2: SINGLE memuat ${singleCount} kanji unik (>= 1,640)`);
ok(counterUnits >= 15, `T2: COUNTERS mencakup ${counterUnits} unit penghitung (>= 15)`);

// 3. Longest-First Ordering in WORDS
const keys = Object.keys(dict.WORDS);
let orderCorrect = true;
for (let i = 0; i < Math.min(100, keys.length - 1); i++) {
  if (keys[i].length < keys[i + 1].length) {
    orderCorrect = false;
    break;
  }
}
ok(orderCorrect, 'T3: Kunci WORDS terurut dari terpanjang ke terpendek untuk greedy matching');

// Test specific compound priorities
const idxOsewaLong = keys.indexOf('お世話になっております');
const idxOsewaShort = keys.indexOf('お世話');
ok(idxOsewaLong >= 0 && idxOsewaShort >= 0 && idxOsewaLong < idxOsewaShort,
  'T3: Frasa majemuk panjang (お世話になっております) mendahului pendek (お世話)');

const idxZaitaku = keys.indexOf('在宅勤務');
const idxKinmu = keys.indexOf('勤務');
ok(idxZaitaku >= 0 && (idxKinmu === -1 || idxZaitaku < idxKinmu),
  'T3: Compound reading bank (在宅勤務) terdaftar dan mendahului kata dasar');

// 4. Zero-Bare-Kanji Invariant for all repo unique kanji
const targetKanji = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'target-kanji-list.json'), 'utf8'));
let missingKanji = 0;
targetKanji.forEach(k => {
  const entry = dict.lookupSingle(k);
  if (!entry) missingKanji++;
});
ok(missingKanji === 0, `T4: Zero-Bare-Kanji Invariant: Semua ${targetKanji.length} kanji unik memiliki cara baca (0 missing)`);

// 5. Counter Resolution Verification
const c1 = dict.lookupCounter(4, '時');
ok(c1 && c1.kana === 'よじ' && c1.romaji === 'yoji', 'T5: Counter 4時 terbaca "よじ" (yoji)');

const c2 = dict.lookupCounter(1, '人');
ok(c2 && c2.kana === 'ひとり' && c2.romaji === 'hitori', 'T5: Counter 1人 terbaca "ひとり" (hitori)');

const c3 = dict.lookupCounter(2, '人');
ok(c3 && c3.kana === 'ふたり' && c3.romaji === 'futari', 'T5: Counter 2人 terbaca "ふたり" (futari)');

const c4 = dict.lookupCounter(1, '日');
ok(c4 && c4.kana === 'ついたち', 'T5: Counter 1日 terbaca "ついたち" (tsuitachi)');

const c5 = dict.lookupCounter(20, '日');
ok(c5 && c5.kana === 'はつか', 'T5: Counter 20日 terbaca "はつか" (hatsuka)');

const c6 = dict.lookupCounter(30, '分');
ok(c6 && c6.kana === 'さんじゅっぷん', 'T5: Counter 30分 terbaca "さんじゅっぷん"');

// 6. Okurigana Stem Verification
ok(dict.lookupStem('遊') === 'あそ', 'T6: Stem 遊 -> あそ (untuk konjugasi 遊びます)');
ok(dict.lookupStem('食') === 'た', 'T6: Stem 食 -> た (untuk konjugasi 食べます)');
ok(dict.lookupStem('行') === 'い', 'T6: Stem 行 -> い (untuk konjugasi 行きます)');
ok(dict.lookupStem('新') === 'あたら', 'T6: Stem 新 -> あたら (untuk konjugasi 新しい)');

// 7. Full Reading Bank Coverage
const rb = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'ja', 'reading-bank-ja.json'), 'utf8'));
const KANJI_RE = /[\u4e00-\u9fff\u3005]/;
let rbTotalKanji = 0;
let rbResolvedKanji = 0;
rb.forEach(p => {
  const t = (p.text || '') + (p.title || '');
  for (let c of t) {
    if (KANJI_RE.test(c)) {
      rbTotalKanji++;
      if (dict.lookupSingle(c)) rbResolvedKanji++;
    }
  }
});
ok(rbTotalKanji > 0 && rbTotalKanji === rbResolvedKanji,
  `T7: 100% Reading Bank Kanji Coverage (${rbResolvedKanji}/${rbTotalKanji} kanji resolved)`);

// 8. Dual Environment Compatibility (Browser simulation)
const simulatedWindow = {};
const scriptCode = fs.readFileSync(dictPath, 'utf8');
const runInBrowser = new Function('self', 'window', 'globalThis', scriptCode);
runInBrowser(simulatedWindow, simulatedWindow, simulatedWindow);
ok(simulatedWindow.FiezelJaDictionary && typeof simulatedWindow.FiezelJaDictionary.lookupWord === 'function',
  'T8: Browser environment simulation exports window.FiezelJaDictionary correctly');

console.log(`\nALL TESTS PASSED! (${passed}/${passed})`);
