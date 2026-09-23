#!/usr/bin/env node
'use strict';
/**
 * tests/japanese-ja-ui-test.js — GERBANG PERMUKAAN KHUSUS KURSUS JEPANG
 *
 * Mengikat janji features/japanese/fiezel-ja-ui.js:
 *   J1  furigana: kata ber-kanji dibungkus <ruby> dengan kana di <rt>; kata tanpa kanji tidak.
 *   J2  baris bacaan hanya membawa romaji (kana sudah duduk di atas kanji).
 *   J3  preferensi furigana/romaji tersimpan dan menjadi kelas body, tanpa melukis ulang.
 *   J4  tabel kana: 46 huruf dasar + 25 dakuten/handakuten, katakana = hiragana + 0x60.
 *   J5  kartu "Segera hadir" TIDAK bisa diketuk (tanpa go()), jadi tidak menjanjikan isi yang
 *       belum ada — pasangan jujur dari japanese-surface-honesty-test.
 *   J6  label JLPT hanya tampilan: A1→N5 ... C1→N1.
 *   J7  kursus Inggris memblokir rute 'kana'; app.js memasang modul lewat index.html + sw.js.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');

const store = {};
const classes = new Set();
global.self = global;
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
global.document = {
  body: { classList: { toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); } } },
  querySelectorAll: () => [],
  getElementById: () => null
};
const J = require(path.join(__fzRoot, 'features/japanese/fiezel-ja-ui.js'));

let passed = 0;
function ok(cond, msg) { assert.ok(cond, msg); passed++; console.log('ok - ' + msg); }

// J1 + J2
ok(J.wordMarkup('青い', 'あおい · aoi') === '<ruby class="ja-word" lang="ja">青い<rp>(</rp><rt>あおい</rt><rp>)</rp></ruby>',
  'J1 kata ber-kanji mendapat furigana <ruby>');
ok(J.wordMarkup('ください', 'ください · kudasai').indexOf('<ruby') < 0, 'J1 kata tanpa kanji tidak diberi ruby');
ok(J.wordMarkup('<b>', 'x · y').indexOf('<b>') < 0, 'J1 kata di-escape');
ok(J.phoneticMarkup('あおい · aoi') === '<span class="ja-romaji">aoi</span>', 'J2 baris bacaan hanya romaji');
ok(J.phoneticMarkup('plain') === 'plain', 'J2 phonetic tanpa pola kana · romaji tidak diubah');

// J3
ok(J.readPrefs().furigana === true && J.readPrefs().romaji === true, 'J3 bawaan: furigana & romaji tampil');
J.toggle('furigana');
ok(classes.has('fz-ja-no-furigana') && JSON.parse(store['fiezel-ja-display-v1']).furigana === false, 'J3 furigana mati → kelas body + tersimpan');
J.toggle('romaji');
ok(classes.has('fz-ja-no-romaji'), 'J3 romaji mati → kelas body');
J.toggle('furigana'); J.toggle('romaji');
ok(!classes.has('fz-ja-no-furigana') && !classes.has('fz-ja-no-romaji'), 'J3 menyalakan lagi mencabut kelas');
ok(J.togglesMarkup('romaji').indexOf('data-ja-toggle="furigana"') < 0, 'J3 tabel kana hanya menawarkan romaji');

// J4
const chart = J.kanaChartMarkup();
const cells = (chart.match(/class="kana-cell"/g) || []).length;
ok(cells === 71, 'J4 tabel kana memuat 46 + 25 huruf (dapat ' + cells + ')');
ok(J.toKatakana('あいうえおん') === 'アイウエオン', 'J4 katakana diturunkan dari hiragana');

// J5
const soon = J.comingSoonMarkup();
ok((soon.match(/class="launch-card ja-soon"/g) || []).length === 4, 'J5 empat kartu segera hadir');
ok(soon.indexOf('go(') < 0 && soon.indexOf('<button') < 0 && soon.indexOf('aria-disabled="true"') >= 0,
  'J5 kartu segera hadir tidak bisa diketuk');

// J6
ok(J.jlptLabel('A1') === 'N5' && J.jlptLabel('B1') === 'N3' && J.jlptLabel('C1') === 'N1', 'J6 label JLPT');
ok(J.wordOfDay([{ word: 'a', meaning: 'x' }, { word: 'b', meaning: 'y' }], 86400000).word === 'b', 'J6 kata hari ini deterministik per hari');

// J7
const app = fs.readFileSync(path.join(__fzRoot, 'app.js'), 'utf8');
const index = fs.readFileSync(path.join(__fzRoot, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__fzRoot, 'sw.js'), 'utf8');
ok(/en:Object\.freeze\(\['kana'\]\)/.test(app), "J7 kursus Inggris memblokir rute 'kana'");
ok(/VALID_VIEWS=new Set\(\['kana',/.test(app) && app.indexOf("if(state.view==='kana')kanaView();") >= 0, 'J7 rute kana terdaftar dan dilukis');
ok(index.indexOf('./features/japanese/fiezel-ja-ui.js') >= 0 && sw.indexOf('./features/japanese/fiezel-ja-ui.js') >= 0,
  'J7 modul dimuat index.html dan di-cache sw.js');

console.log('FIEZEL japanese ja-ui: PASS (' + passed + ')');
