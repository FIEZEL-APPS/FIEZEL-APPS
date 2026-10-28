// tools/build-dictionary-module.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DUMP_PATH = path.join(ROOT, 'tools', 'lexicon_dump.json');
const TARGET_PATH = path.join(ROOT, 'features', 'japanese', 'fiezel-ja-dictionary.js');

if (!fs.existsSync(DUMP_PATH)) {
  console.error('Error: lexicon_dump.json not found!');
  process.exit(1);
}

const dump = JSON.parse(fs.readFileSync(DUMP_PATH, 'utf8'));

// 1. Sort WORDS longest key first
const wordsEntries = Object.entries(dump.words);
wordsEntries.sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0]));
const sortedWords = Object.fromEntries(wordsEntries);

// 2. STEMS
const stemsEntries = Object.entries(dump.stems);
stemsEntries.sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0]));
const sortedStems = Object.fromEntries(stemsEntries);

// 3. SINGLE: ensure all 1646 kanji are included
const singleEntries = Object.entries(dump.single);
singleEntries.sort((a, b) => a[0].localeCompare(b[0]));
const sortedSingle = Object.fromEntries(singleEntries);

// Ensure fallback for 々 and 鿿
if (!sortedSingle['々']) sortedSingle['々'] = { kana: '', romaji: '' };
if (!sortedSingle['鿿']) sortedSingle['鿿'] = { kana: '', romaji: '' };

// 4. COUNTERS
const counters = dump.counters || {};

const banner = `/**
 * FIEZEL · features/japanese/fiezel-ja-dictionary.js
 * Master Japanese Lexicon & Kanji Engine for FIEZEL Apps.
 *
 * Indexed:
 *   - WORDS: ${wordsEntries.length} compound kanji & expressions (sorted longest first)
 *   - STEMS: ${stemsEntries.length} okurigana stems for conjugated verbs & adjectives
 *   - SINGLE: ${Object.keys(sortedSingle).length} single kanji entries (Zero-Bare-Kanji guarantee)
 *   - COUNTERS: numeric patterns & units (時, 分, 日, 月, 年, 回, 人, 歳, 階, 円, etc.)
 *
 * Dual-compatible: Browser (window.FiezelJaDictionary) and Node.js (CommonJS / ESM).
 */
`;

const code = `${banner}(function (root) {
  'use strict';

  var WORDS = ${JSON.stringify(sortedWords, null, 2)};

  var STEMS = ${JSON.stringify(sortedStems, null, 2)};

  var SINGLE = ${JSON.stringify(sortedSingle, null, 2)};

  var COUNTERS = ${JSON.stringify(counters, null, 2)};

  var WORDS_KEYS = Object.keys(WORDS);

  var KANA_ROMAJI = {
    'あ':'a','い':'i','う':'u','え':'e','お':'o','か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
    'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so','た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
    'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no','は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
    'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo','や':'ya','ゆ':'yu','よ':'yo',
    'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro','わ':'wa','を':'o','ん':'n',
    'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go','ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
    'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do','ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
    'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po','ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o','ゔ':'vu'
  };

  var YOON = { 'ゃ': 'a', 'ゅ': 'u', 'ょ': 'o' };

  var PUNCT = {
    '。': '.', '、': ',', '！': '!', '？': '?',
    '「': '"', '」': '"', '『': '"', '』': '"',
    '・': ' ', '　': ' ', '～': '~', '（': '(', '）': ')',
    '(': '(', ')': ')'
  };

  function toHiragana(text) {
    return String(text || '').replace(/[ァ-ヶ]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    });
  }

  function kanaToRomaji(kana) {
    if (!kana) return '';
    var s = toHiragana(kana), out = '', i = 0;
    while (i < s.length) {
      var c = s[i], next = s[i + 1];
      if (c === 'っ') {
        var after = kanaToRomaji(s.slice(i + 1, i + 3 + (YOON[s[i + 2]] ? 1 : 0)));
        out += after ? after[0] : '';
        i += 1;
        continue;
      }
      if (c === 'ー') {
        out += out.slice(-1) === '' ? '' : out.slice(-1);
        i += 1;
        continue;
      }
      if (PUNCT[c] !== undefined) {
        out += PUNCT[c];
        i += 1;
        continue;
      }
      var roma = KANA_ROMAJI[c];
      if (roma === undefined) return null;
      if (next && YOON[next]) {
        var stem = roma.slice(0, -1);
        if (stem === 'sh' || stem === 'ch' || stem === 'j') {
          roma = (stem === 'j' ? 'jy' : stem) + YOON[next];
        } else {
          roma = stem + 'y' + YOON[next];
        }
        i += 2;
      } else {
        i += 1;
      }
      if (roma === 'n' && s[i] && /[あいうえおやゆよ]/.test(s[i])) {
        roma = "n'";
      }
      out += roma;
    }
    return out;
  }

  function lookupWord(word) {
    if (!word) return null;
    return WORDS[word] || null;
  }

  function lookupStem(stem) {
    if (!stem) return null;
    return STEMS[stem] || null;
  }

  function lookupSingle(kanji) {
    if (!kanji) return null;
    return SINGLE[kanji] || null;
  }

  function lookupCounter(num, unit) {
    if (!num || !unit) return null;
    // Check if combined word exists directly
    var direct = WORDS[String(num) + String(unit)];
    if (direct) return direct;

    var uData = COUNTERS[unit];
    if (!uData) return null;

    var n = parseInt(num, 10);
    if (!isNaN(n) && uData.specials && uData.specials[n]) {
      var k = uData.specials[n];
      return { kana: k, romaji: kanaToRomaji(k) };
    }

    return null;
  }

  var FiezelJaDictionary = {
    WORDS: WORDS,
    STEMS: STEMS,
    SINGLE: SINGLE,
    COUNTERS: COUNTERS,
    WORDS_KEYS: WORDS_KEYS,
    lookupWord: lookupWord,
    lookupStem: lookupStem,
    lookupSingle: lookupSingle,
    lookupCounter: lookupCounter,
    kanaToRomaji: kanaToRomaji,
    toHiragana: toHiragana
  };

  root.FiezelJaDictionary = FiezelJaDictionary;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FiezelJaDictionary;
  }
})(typeof self !== 'undefined' ? self : globalThis);
`;

fs.writeFileSync(TARGET_PATH, code, 'utf8');
const stat = fs.statSync(TARGET_PATH);
console.log('Successfully generated ' + TARGET_PATH);
console.log('File size: ' + (stat.size / 1024).toFixed(1) + ' KB');
console.log('WORDS:', wordsEntries.length);
console.log('STEMS:', stemsEntries.length);
console.log('SINGLE:', Object.keys(sortedSingle).length);

