// tests/japanese-vocab-bank-test.js — bank kosakata Jepang: nol entri hilang dari data
// sumber, dan setiap kalimat contoh benar-benar memakai katanya.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Bank kosakata adalah tempat paling gampang untuk berbohong tanpa terlihat. Sebuah entri
// bisa punya kata, arti, tingkat, dan kalimat contoh yang semuanya terisi — dan kalimatnya
// tidak memakai kata itu sama sekali. Di layar, murid melihat kartu "たべる / makan" dengan
// contoh yang tidak memuat たべる. Tidak ada yang merah; hanya kartunya yang tidak mengajar
// apa pun. Assert "kalimat memuat katanya" adalah inti gerbang ini; sisanya penjaga bentuk.
//
// Sumbernya (docs/japanese/kosakata-jlpt.json, 1.371 entri) adalah DAFTAR KATA — fakta
// bahasa, bukan karya berhak cipta. Setiap KALIMAT di bank ini ditulis baru; tidak satu pun
// disalin dari Minna no Nihongo maupun Irodori. Gerbang menahan janji itu dari sisi yang bisa
// diperiksa mesin: nol kalimat sumber ikut terbawa, karena sumbernya memang tidak punya
// kalimat.
//
// YANG DIJAGA
//   1. Nol kata hilang: setiap romaji di data sumber muncul di bank.
//   2. Setiap kalimat contoh memuat kata targetnya (bentuk kana, kanji, atau akar konjugasi).
//   3. Kalimat contoh beraksara Jepang; terjemahannya TIDAK beraksara Jepang.
//   4. Tingkat CEFR sesuai pemetaan JLPT, dan termasuk yang diterima jalur hidrasi.
//   5. Setiap entri lolos saringan hidrasi app.js: status 'complete', word, meaning terisi.
//   6. Tidak ada id kembar.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const bacaJson = (p) => JSON.parse(fs.readFileSync(path.join(__fzRoot, p), 'utf8'));

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

const bank = bacaJson('content/ja/vocabulary-master-ja.json');
const sumber = bacaJson('docs/japanese/kosakata-jlpt.json');
const entri = Array.isArray(bank.words) ? bank.words : [];

// Saringan hidrasi app.js menerima hanya tingkat ini.
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PETA = { N5: 'A1', N4: 'A2', N3: 'B1', N2: 'B2', N1: 'C1' };
const JEPANG = /[぀-ゟ゠-ヿ一-龯]/;

test('nol kata hilang diam-diam: yang tidak masuk WAJIB punya alasan tertulis', () => {
  const punya = new Set(entri.map((e) => e.romaji));
  const beralasan = new Map((bank.dikecualikan || []).map((x) => [x.romaji, String(x.alasan || '')]));
  const hilang = [];
  for (const lv of Object.keys(sumber.tingkat)) {
    for (const s of sumber.tingkat[lv]) {
      if (punya.has(s.romaji)) continue;
      // Membuang baris sumber boleh — diam-diam tidak. Alasan kosong dihitung sebagai hilang.
      if (!beralasan.get(s.romaji)) hilang.push(lv + ':' + s.romaji);
    }
  }
  assert.deepStrictEqual(hilang.slice(0, 10), [],
    hilang.length + ' kata sumber tidak sampai ke bank tanpa alasan tertulis');
  assert.strictEqual(entri.length + (bank.dikecualikan || []).length, sumber.total,
    'entri bank (' + entri.length + ') + dikecualikan (' + (bank.dikecualikan || []).length +
    ') tidak menutup seluruh sumber (' + sumber.total + ')');
});

// Kunci pencarian dari bentuk kamus. Kata Jepang berkonjugasi, jadi mencocokkan bentuk
// kamus persis akan menolak justru kalimat yang paling wajar (言う → 言わなかった). Yang
// dibangun di sini: varian dipisah di ／, kurung （な）dibuang, bentuk frasa dipecah di
// partikel, lalu batang kata ditambah bentuk konjugasi baku godan/ichidan — termasuk
// perubahan bunyi て-form (く→い, つ/る/う→っ, ぬ/ぶ/む→ん). Kanji boleh dicocokkan sampai
// 1 aksara karena ia membawa maknanya sendiri; kana ditahan di 2 aksara supaya tidak
// cocok secara kebetulan, KECUALI lewat batang konjugasi yang memang dihitung di sini.
const I_ROW = { 'う': 'い', 'く': 'き', 'ぐ': 'ぎ', 'す': 'し', 'つ': 'ち', 'ぬ': 'に', 'ぶ': 'び', 'む': 'み', 'る': 'り' };
const TE_ROW = { 'く': 'い', 'ぐ': 'い', 'つ': 'っ', 'る': 'っ', 'う': 'っ', 'ぬ': 'ん', 'ぶ': 'ん', 'む': 'ん' };
function kunciCari(e) {
  const out = new Set();
  const tambah = (raw, minLen) => {
    for (let v of String(raw || '').split(/[／/]/)) {
      v = v.replace(/[（(][^）)]*[）)]/g, '').replace(/\s+/g, '').trim();
      if (!v) continue;
      const potongan = v.split(/[をがにへとはのや]/).filter((x) => x.length >= minLen);
      for (const p of [v, ...potongan]) {
        if (p.length < minLen) continue;
        for (let n = p.length; n >= minLen; n--) out.add(p.slice(0, n));
        // Batang konjugasi: する→し, つく→つき/つい, やる→やり, どく→どき/どい.
        const akhir = p.slice(-1), batang = p.slice(0, -1);
        if (batang && I_ROW[akhir]) out.add(batang + I_ROW[akhir]);
        if (batang && TE_ROW[akhir]) out.add(batang + TE_ROW[akhir]);
        if (batang && akhir === 'る') out.add(batang); // ichidan: たべる→たべ
      }
    }
  };
  tambah(e.kanji, 1); tambah(e.kana, 2);
  return [...out];
}

test('SETIAP kalimat contoh benar-benar memakai kata targetnya', () => {
  const meleset = [];
  for (const e of entri) {
    const kalimat = e.examples?.[0]?.en || '';
    if (!kunciCari(e).some((k) => k && kalimat.indexOf(k) >= 0)) {
      meleset.push(e.romaji + ' (' + (e.kanji || e.kana) + ') → ' + kalimat);
    }
  }
  assert.deepStrictEqual(meleset.slice(0, 8), [],
    meleset.length + ' kalimat contoh tidak memuat kata targetnya — kartunya tidak mengajar apa pun');
});

test('kalimat contoh beraksara Jepang, terjemahannya tidak', () => {
  const salah = [];
  for (const e of entri) {
    const kal = e.examples?.[0]?.en || '';
    const arti = e.examples?.[0]?.id || '';
    if (!JEPANG.test(kal)) salah.push('bukan Jepang: ' + e.romaji + ' → ' + kal);
    else if (!arti.trim()) salah.push('tanpa terjemahan: ' + e.romaji);
    else if (JEPANG.test(arti)) salah.push('terjemahan beraksara Jepang: ' + e.romaji + ' → ' + arti);
  }
  assert.deepStrictEqual(salah.slice(0, 8), [], salah.length + ' kalimat cacat');
});

test('tingkat CEFR sesuai pemetaan JLPT dan diterima jalur hidrasi', () => {
  const salah = entri.filter((e) => PETA[e.jlpt] !== e.level).map((e) => e.romaji + ':' + e.jlpt + '→' + e.level);
  assert.deepStrictEqual(salah.slice(0, 8), [], salah.length + ' entri salah petakan JLPT→CEFR');
  const asing = [...new Set(entri.map((e) => e.level))].filter((l) => !LEVELS.includes(l));
  assert.deepStrictEqual(asing, [], 'tingkat di luar yang diterima hidrasi: ' + asing.join(', '));
});

test('setiap entri lolos saringan hidrasi app.js', () => {
  const gugur = entri.filter((e) => {
    const meaning = e.meaning || e.meanings?.[0]?.meaning || '';
    return !(e.status === 'complete' && e.word && meaning && LEVELS.includes(e.level));
  }).map((e) => e.romaji);
  assert.deepStrictEqual(gugur.slice(0, 8), [],
    gugur.length + ' entri akan disaring habis oleh app.js dan tidak pernah sampai ke murid');
});

test('tidak ada id kembar', () => {
  const seen = new Set(); const kembar = [];
  for (const e of entri) { if (seen.has(e.id)) kembar.push(e.id); seen.add(e.id); }
  assert.deepStrictEqual(kembar.slice(0, 5), [], kembar.length + ' id kembar');
});

test('bank diprecache sw.js — tanpa itu kosakata mati saat murid offline', () => {
  const sw = fs.readFileSync(path.join(__fzRoot, 'sw.js'), 'utf8');
  assert.ok(sw.indexOf('content/ja/vocabulary-master-ja.json') >= 0, 'bank kosakata ja tidak ada di ASSETS sw.js');
});

test('provenans menyatakan status draf dan asal silabus', () => {
  assert.ok(bank.provenans, 'bank tanpa blok provenans');
  assert.ok(/DRAFT/i.test(JSON.stringify(bank.provenans)),
    'provenans tidak menyatakan status draf — naskah yang belum ditinjau penutur asli harus mengaku');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(fs.readFileSync(path.join(__fzRoot, '.github/workflows/quality.yml'), 'utf8')
    .indexOf('japanese-vocab-bank-test.js') >= 0, 'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('japanese-vocab-bank-test GAGAL: ' + failures.length + ' assert merah');
  console.log('japanese-vocab-bank-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('japanese-vocab-bank-test: ' + pass + '/' + total + ' assert PASS');
