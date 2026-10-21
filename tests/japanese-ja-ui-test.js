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
 *   J8  soal & jawaban: teks Jepang di dalam kuis diberi furigana + romaji dari bank kosakata;
 *       romaji hanya ditulis bila SELURUH potongan terbaca, partikel は/を/へ dibaca wa/o/e.
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
ok(J.wordMarkup('青い', 'あおい · aoi') === '<span class="ja-word-wrap" lang="ja"><ruby class="ja-word">青<rp>(</rp><rt>あお</rt><rp>)</rp></ruby>い</span>',
  'J1 kata ber-kanji mendapat furigana <ruby> hanya di atas kanjinya');
ok(J.wordMarkup('教室', 'きょうしつ · kyoushitsu').indexOf('<rt>きょうしつ</rt>') >= 0, 'J1 kata kanji penuh: furigana utuh');
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

// J8
const bank = JSON.parse(fs.readFileSync(path.join(__fzRoot, 'content/ja/vocabulary-master-ja.json'), 'utf8'))
  .words.map((w) => ({ word: w.word, phonetic: w.phonetic }));
function romajiOf(text) {
  const m = J.annotateText(text, bank).match(/class="ja-romaji ja-run-romaji"[^>]*>([^<]*)</);
  return m ? m[1] : null;
}
ok(romajiOf('私は学生です。') === 'watashi wa gakusei desu.', 'J8 partikel は dibaca wa');
ok(romajiOf('そちらはいかがですか。') === 'sochira wa ikaga desu ka.', 'J8 はい tidak menelan partikel は');
ok(romajiOf('学校へ行きます。') === 'gakkou e ikimasu.', 'J8 batang kanji + okurigana (行きます) terbaca');
ok(/<rt>がっこう<\/rt>/.test(J.annotateText('学校へ行きます。', bank)), 'J8 furigana untuk kata utuh dari bank');
ok(/<rt>あそ<\/rt>.*<\/ruby>び/.test(J.annotateText('遊びました。', bank)), 'J8 furigana batang kanji untuk bentuk berkonjugasi (遊びました)');
ok(romajiOf('日曜日は友だちと遊ぶ。') === null, 'J8 potongan yang tak terbaca utuh tidak diberi romaji setengah jadi');
ok(J.annotateText('Dalam kalimat "他の色", apa?', bank).indexOf('Dalam kalimat &quot;') === 0, 'J8 teks non-Jepang dibiarkan (di-escape)');
ok(J.kanaToRomaji('きょうしつ') === 'kyoushitsu' && J.kanaToRomaji('がっこう') === 'gakkou' && J.kanaToRomaji('じゃあ') === 'jyaa',
  'J8 kana → romaji mengikuti gaya bank (ou, jyo, konsonan ganda)');
ok(app.indexOf("self.FiezelJaUi?.observe?.($('app'),()=>V)") >= 0, 'J8 pengamat anotasi dipasang saat kursus Jepang aktif');

console.log('FIEZEL japanese ja-ui: PASS (' + passed + ')');
