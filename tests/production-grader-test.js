/**
 * FIEZEL gate — Production Grader (Braincore v3, A14).
 *
 * Grader produksi adalah tempat paling mudah untuk salah dua arah sekaligus: terlalu ketat
 * (typo satu huruf dihukum seperti tidak paham -> murid berhenti mau mengetik) atau terlalu
 * longgar (kesalahan grammar "walks" diterima karena "cuma beda satu huruf" -> sinyal
 * diagnostik paling berharga dari mode produksi hancur). Gate ini memeriksa KEDUA arah itu
 * pada kasus yang bisa dinilai tanpa berdebat, plus jalur distraktor->ledger dan keselamatan
 * input rusak.
 */
const assert = require('assert');
const fs = require('fs');
const grader = require('../features/brain/fiezel-production-grader.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

// (a) Variasi ejaan sah diterima: typo satu huruf di TENGAH kata panjang adalah jari yang
// meleset, bukan pengetahuan yang bolong.
test('typo satu huruf di tengah kata diterima (recieved -> received)', () => {
  const r = grader.grade('recieved', 'received');
  // "recieved" vs "received": transposisi ie/ei = 2 substitusi Levenshtein? Tidak —
  // r-e-c-i-e-v-e-d vs r-e-c-e-i-v-e-d berjarak 2 substitusi klasik; pakai kasus jarak-1 murni.
  const r2 = grader.grade('grammer', 'grammar');
  assert.strictEqual(r2.ok, true, 'grammer vs grammar berjarak 1 di tengah, harus diterima');
  assert.strictEqual(r2.distance, 1);
  assert.strictEqual(r2.rationale, 'brain3_production_near_match');
  assert.strictEqual(r.ok, false, 'jarak 2 tetap ditolak — toleransi hanya 1');
});

test('kecocokan persis diterima dengan confidence penuh', () => {
  const r = grader.grade('walked', 'walked');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.distance, 0);
  assert.strictEqual(r.rationale, 'brain3_production_exact');
  assert.strictEqual(r.confidence, 1);
});

test('huruf hilang di tengah kata panjang diterima (beautful -> beautiful)', () => {
  const r = grader.grade('beautful', 'beautiful');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.distance, 1);
});

// (b) Huruf pertama salah -> tolak: huruf pertama membawa identitas kata; "talked" saat
// target "walked" bukan typo, itu kata lain.
test('kesalahan di huruf pertama ditolak walau jarak 1', () => {
  const r = grader.grade('talked', 'walked');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.distance, 1);
  assert.strictEqual(r.rationale, 'brain3_production_initial_letter_miss');
});

test('kata pendek (<4 huruf) tidak diberi toleransi typo', () => {
  // "the" vs "she"? itu huruf pertama; pakai kasus non-inisial: "cat" vs "cut".
  const r = grader.grade('cut', 'cat');
  assert.strictEqual(r.ok, false, 'pada kata 3 huruf, satu huruf berbeda adalah kata lain');
  assert.strictEqual(r.rationale, 'brain3_production_short_target_strict');
});

// (c) Selisih morfemik ditolak dengan rationale khusus, berapa pun jaraknya: ini sinyal
// grammar (tense/agreement) yang justru ingin ditangkap lesson, bukan salah ketik.
test('walk vs walked ditolak sebagai morpheme miss (sufiks -ed hilang)', () => {
  const r = grader.grade('walk', 'walked');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.rationale, 'brain3_production_morpheme_miss');
});

test('walks vs walk ditolak sebagai morpheme miss walau jarak hanya 1', () => {
  // Ini kasus yang paling berbahaya: tanpa aturan morfemik, "walks" lolos toleransi jarak-1
  // dan grader menghadiahi kesalahan agreement — kebalikan dari tujuan mode produksi.
  const r = grader.grade('walks', 'walk');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.distance, 1);
  assert.strictEqual(r.rationale, 'brain3_production_morpheme_miss');
});

test('use vs used dan go vs going juga morpheme miss (-d, -ing)', () => {
  assert.strictEqual(grader.grade('use', 'used').rationale, 'brain3_production_morpheme_miss');
  assert.strictEqual(grader.grade('go', 'going').rationale, 'brain3_production_morpheme_miss');
  assert.strictEqual(grader.grade('watch', 'watches').rationale, 'brain3_production_morpheme_miss');
});

// (d) Jawaban salah yang cocok distraktor berlabel -> matchedDistractor terisi, supaya
// ledger miskonsepsi bisa diberi makan dari jalur produksi (miskonsepsi yang DIKETIK
// sendiri adalah bukti lebih kuat daripada yang dipilih).
test('jawaban = distraktor mengembalikan matchedDistractor {text, misconception}', () => {
  const opts = { distractors: [{ text: 'goed', misconception: 'overgeneralisasi_past_ed' }] };
  const r = grader.grade('goed', 'went', opts);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.rationale, 'brain3_production_distractor_match');
  assert.ok(r.matchedDistractor, 'matchedDistractor wajib terisi');
  assert.strictEqual(r.matchedDistractor.text, 'goed');
  assert.strictEqual(r.matchedDistractor.misconception, 'overgeneralisasi_past_ed');
});

test('typo satu huruf pada distraktor tetap terdeteksi sebagai distraktor', () => {
  const opts = { distractors: [{ text: 'goed', misconception: 'overgeneralisasi_past_ed' }] };
  const r = grader.grade('goedd', 'went', opts);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.matchedDistractor.misconception, 'overgeneralisasi_past_ed');
});

test('jawaban benar TIDAK pernah membawa matchedDistractor', () => {
  const opts = { distractors: [{ text: 'went', misconception: 'label_salah_desain' }] };
  const r = grader.grade('went', 'went', opts);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.matchedDistractor, null);
});

// (e) Alternates: jawaban sah alternatif (kontraksi, varian ejaan) diterima.
test('alternates diterima (kontraksi do not / don\'t)', () => {
  const r = grader.grade("don't", 'do not', { alternates: ["don't"] });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.rationale, 'brain3_production_alternate_accepted');
});

test('alternates juga mendapat toleransi typo non-inisial', () => {
  const r = grader.grade('colour', 'color', { alternates: ['colour'] });
  assert.strictEqual(r.ok, true);
  const r2 = grader.grade('colouur', 'color', { alternates: ['colour'] });
  assert.strictEqual(r2.ok, true, 'typo 1 huruf tengah pada alternate harus diterima');
});

// (f) Unicode/kutip tipografis dinormalisasi: keyboard ponsel gemar mengganti apostrof
// lurus dengan kutip tipografis; itu bukan pengetahuan grammar.
test('kutip tipografis dan spasi ganda dinormalisasi', () => {
  const r = grader.grade('\u2019Don\u2019t  Go\u2019'.replace(/^\u2019|\u2019$/g, ''), "don't go");
  assert.strictEqual(r.ok, true, 'kutip tipografis + kapital + spasi ganda harus lolos normalisasi');
  assert.strictEqual(grader.normalize('\u201Chello\u201D  WORLD'), '"hello" world');
  assert.strictEqual(grader.normalize('caf\u00e9'), grader.normalize('cafe\u0301'), 'bentuk unicode NFC disatukan');
});

test('spasi non-breaking dan trim aman', () => {
  const r = grader.grade('  has\u00A0gone ', 'has gone');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.distance, 0);
});

// (g) Input kosong/rusak aman: tolak yang aman, tanpa exception, tanpa mencocokkan
// distraktor, confidence 0 supaya bobot buktinya nol di hulu.
test('jawaban kosong/null/undefined/non-string ditolak aman', () => {
  for (const bad of ['', '   ', null, undefined, 42, {}, []]) {
    const r = grader.grade(bad, 'walked', { distractors: [{ text: '', misconception: 'x' }] });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.rationale, 'brain3_production_empty_answer');
    assert.strictEqual(r.matchedDistractor, null, 'jawaban kosong tidak boleh cocok distraktor');
    assert.strictEqual(r.confidence, 0);
  }
});

test('target kosong = bug konten, ditolak dengan rationale sendiri', () => {
  const r = grader.grade('walked', '');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.rationale, 'brain3_production_invalid_target');
});

// gradeSet: multi-blank dinilai per blank supaya satu typo tidak menenggelamkan satu miskonsepsi.
test('gradeSet menilai per blank dan merangkum', () => {
  const out = grader.gradeSet(
    ['goes', 'walk'],
    ['goes', 'walked'],
    { blanks: [{}, { distractors: [{ text: 'walk', misconception: 'past_tanpa_ed' }] }] }
  );
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.total, 2);
  assert.strictEqual(out.correctCount, 1);
  assert.strictEqual(out.results[0].ok, true);
  assert.strictEqual(out.results[1].rationale, 'brain3_production_distractor_match');
  assert.strictEqual(out.results[1].matchedDistractor.misconception, 'past_tanpa_ed');
  assert.strictEqual(out.rationale, 'brain3_production_set_partial');
});

test('gradeSet semua benar -> ok, set kosong -> tolak aman', () => {
  const all = grader.gradeSet(['a\u2019s', 'walked'], ["a's", 'walked']);
  assert.strictEqual(all.ok, true);
  assert.strictEqual(all.rationale, 'brain3_production_set_complete');
  const empty = grader.gradeSet([], []);
  assert.strictEqual(empty.ok, false);
  assert.strictEqual(empty.rationale, 'brain3_production_empty_set');
});

test('gradeSet aman terhadap panjang jawaban yang tidak sejajar', () => {
  const out = grader.gradeSet(['goes'], ['goes', 'walked']);
  assert.strictEqual(out.total, 2);
  assert.strictEqual(out.correctCount, 1);
  assert.strictEqual(out.results[1].rationale, 'brain3_production_empty_answer');
});

// Kemurnian modul: grader dipanggil di jalur nilai; ia tidak boleh menyentuh apa pun
// selain argumennya, kalau tidak keputusannya berhenti bisa diuji sebagai angka.
test('modul murni: tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa waktu', () => {
  const source = fs.readFileSync('./features/brain/fiezel-production-grader.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['document', 'localStorage', 'fetch(', 'XMLHttpRequest', 'window.', 'Date.now', 'Math.random']) {
    assert.ok(!source.includes(forbidden), 'grader menyentuh ' + forbidden + ' — itu membuatnya tidak murni');
  }
});

console.log('');
if (failures) { console.error('FIEZEL Production Grader: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL Production Grader: PASS');
