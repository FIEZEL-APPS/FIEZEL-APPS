// tests/japanese-surface-honesty-test.js — kursus Jepang tidak boleh menawarkan latihan
// yang isinya bahasa Inggris.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Murid memilih Bahasa Jepang di Pengaturan. Bank tata bahasa, kosakata, dan bacaan
// berganti. Tetapi tiga permukaan lain TIDAK punya versi Jepang sama sekali:
//
//   menyimak  -> features/speaking-listening/listening-bank-v1.json  (Inggris)
//   berbicara -> features/speaking-listening/speaking-bank-v1.json   (Inggris)
//   menulis   -> writing-prompts-v1.json  ("Describe your day...", fokus 'present simple')
//
// Sebelum gerbang ini, ketiganya tetap ditawarkan. Murid yang memilih Jepang membuka
// "Latihan bicara & dengar" lalu MENDENGAR BAHASA INGGRIS, atau diminta menulis kalimat
// Inggris dengan fokus tata bahasa Inggris — tanpa satu kalimat pun yang memberitahunya.
// Itu bukan fitur yang belum lengkap; itu aplikasi yang mengatakan satu hal dan melakukan
// hal lain.
//
// Peringatan di pemilih bahasa SUDAH berjanji "belum ada latihan menyimak" sejak m025-290.
// Layarnya yang tidak menepati janji itu. Gerbang ini menyatukan keduanya.
//
// YANG DIJAGA, DAN KENAPA DIIKAT KE DATA
//   Penjaga di app.js WAJIB ada selama bank Jepangnya belum ada — dan gerbang ini membaca
//   ADA-TIDAKNYA bank itu dari direktori content/ja/, bukan dari daftar tertulis. Jadi saat
//   suatu hari listening-bank-ja.json benar-benar dibuat, gerbang ini BERBALIK: ia menuntut
//   penjaganya dicabut. Penjaga yang ditinggalkan setelah kontennya ada adalah fitur yang
//   hilang diam-diam, dan itu sama buruknya dengan menawarkan yang kosong.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

const app = baca('app.js');
const isiJa = fs.existsSync(path.join(__fzRoot, 'content/ja'))
  ? fs.readdirSync(path.join(__fzRoot, 'content/ja'))
  : [];

/* m025-312: GERBANG INI BERBALIK, persis seperti yang dijanjikan versi sebelumnya.
   Dulu ia menuntut KETIGA permukaan disembunyikan. Sekarang menulis punya banknya
   (content/ja/writing-prompts-ja.json), jadi yang dijaga berbalik arah untuknya: kartunya
   WAJIB ditawarkan. Menyembunyikan permukaan yang isinya sudah siap adalah fitur yang
   hilang diam-diam, dan itu sama buruknya dengan menawarkan yang kosong.

   Menyimak dan berbicara tetap dijaga, dan alasannya BUKAN "banknya belum ditulis":
   tumpukan audio dipaku ke en-US (features/speaking-listening language:'en-US', dijaga
   tests/audio-locale-guard-test.js). Membuat banknya tanpa memperbaiki suaranya berarti
   aplikasi memutar suara Inggris dan mendengarkan ucapan Inggris sambil mengaku mengajar
   Jepang. Karena itu syarat pelepasannya di bawah menuntut DUA hal sekaligus: banknya ada
   DAN pakunya en-US sudah dicabut. Bank saja tidak cukup. */
const PERMUKAAN_DIJAGA = [
  { nama: 'menyimak/berbicara', bank: /listening-bank-ja|speaking-bank-ja/, kartu: 'skills' }
];
const PERMUKAAN_HIDUP = [
  { nama: 'menulis', bank: /writing-prompts-ja/, kartu: 'writing' }
];

test('bank Jepang untuk menyimak/berbicara belum ada DAN suaranya masih dipaku en-US', () => {
  const sudahAda = PERMUKAAN_DIJAGA.filter((p) => isiJa.some((f) => p.bank.test(f))).map((p) => p.nama);
  const slDir = 'features/speaking-listening';
  let slSrc = '';
  if (fs.existsSync(path.join(__fzRoot, slDir))) {
    for (const e of fs.readdirSync(path.join(__fzRoot, slDir))) {
      if (e.endsWith('.js')) slSrc += baca(slDir + '/' + e);
    }
  }
  const masihEnUs = /language\s*:\s*'en-US'/.test(slSrc);
  assert.ok(sudahAda.length === 0 || !masihEnUs,
    'bank Jepang untuk ' + sudahAda.join(', ') + ' SUDAH ADA tetapi suaranya MASIH en-US — ' +
    'menawarkannya sekarang berarti memutar dan mendengarkan bahasa Inggris sambil mengaku ' +
    'mengajar Jepang. Perbaiki locale audionya dulu, baru cabut penjaganya.');
  assert.ok(masihEnUs || sudahAda.length > 0,
    'paku en-US sudah dicabut tetapi bank Jepangnya belum ada — permukaan menyimak/berbicara ' +
    'kini tidak dijaga apa pun; buat banknya atau kembalikan penjaganya');
});

test('kartu menyimak/berbicara DIJAGA saat bahasa target ja', () => {
  const i = app.indexOf('function latihanCards()');
  assert.ok(i > 0, 'latihanCards() tidak ditemukan di app.js');
  const blok = app.slice(i, i + 3500);
  PERMUKAAN_DIJAGA.forEach((p) => {
    const j = blok.indexOf("view:'" + p.kartu + "'");
    assert.ok(j > 0, 'kartu ' + p.kartu + ' tidak ditemukan di latihanCards()');
    const sekitar = blok.slice(Math.max(0, j - 900), j + 200);
    assert.ok(/targetLang|activeTargetLang|punyaSkillsJa|punyaKontenJa/.test(sekitar),
      'kartu ' + p.kartu + ' (' + p.nama + ') ditawarkan tanpa memeriksa bahasa target — ' +
      'murid Jepang mendapat latihan berbahasa Inggris tanpa diberi tahu');
  });
});

test('kartu menulis TIDAK BOLEH lagi disembunyikan dari murid Jepang', () => {
  const i = app.indexOf('function latihanCards()');
  const blok = app.slice(i, i + 3500);
  PERMUKAAN_HIDUP.forEach((p) => {
    assert.ok(isiJa.some((f) => p.bank.test(f)),
      'bank Jepang untuk ' + p.nama + ' hilang dari content/ja/ — kalau ia memang dicabut, ' +
      'kembalikan penjaganya di app.js supaya kartunya tidak menawarkan bank Inggris');
    const j = blok.indexOf("view:'" + p.kartu + "'");
    assert.ok(j > 0, 'kartu ' + p.kartu + ' tidak ditemukan di latihanCards()');
    /* Kartunya harus berada DI LUAR blok penjaga, dan itu diukur dengan MENCOCOKKAN KURUNG,
       bukan menebak dari indentasi. Versi pertama assert ini memakai pola indentasi dan
       TIDAK menggigit sama sekali: kartu yang dikembalikan ke dalam penjaga tetap lolos.
       Gerbang yang hijau karena assert-nya tidak bekerja lebih berbahaya daripada tidak ada
       gerbang, jadi yang dipakai sekarang adalah posisi sungguhan terhadap penutup if(). */
    const g = blok.search(/if\s*\(\s*punya[A-Za-z]*Ja\s*\)\s*\{/);
    assert.ok(g >= 0, 'blok penjaga if(punya…Ja){ tidak ditemukan di latihanCards()');
    let depth = 0, tutup = -1;
    for (let k = blok.indexOf('{', g); k < blok.length; k += 1) {
      if (blok[k] === '{') depth += 1;
      else if (blok[k] === '}') { depth -= 1; if (depth === 0) { tutup = k; break; } }
    }
    assert.ok(tutup > 0, 'penutup blok penjaga tidak ditemukan');
    assert.ok(j > tutup,
      'kartu ' + p.kartu + ' masih berada DI DALAM penjaga bahasa — banknya sudah ada, ' +
      'jadi murid Jepang berhak melihatnya');
  });
});

test('bank menulis Jepang sehat: skema, jumlah, dan cakupan silabus', () => {
  const w = JSON.parse(baca('content/ja/writing-prompts-ja.json'));
  const g = JSON.parse(baca('content/ja/grammar-templates-ja.json'));
  assert.strictEqual(w.schema, 'fiezel-writing-prompts-v1', 'skema bank menulis Jepang menyimpang');
  assert.strictEqual(w.promptCount, w.prompts.length, 'promptCount berbohong tentang isinya');
  assert.strictEqual(new Set(w.prompts.map((p) => p.id)).size, w.prompts.length, 'ada id prompt kembar');
  assert.ok(w.prompts.every((p) => p.en && p.id_hint && p.focus),
    'ada prompt tanpa naskah, petunjuk Indonesia, atau fokus');
  assert.ok(w.prompts.every((p) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(p.en)),
    'ada prompt yang naskahnya TIDAK ber-aksara Jepang — itu bank Inggris yang menyamar');
  /* Cakupan diikat ke silabusnya, bukan ke angka yang diketik: tiap keluarga tata bahasa
     N5 wajib punya latihan menulisnya. Keluarga baru di bank tata bahasa otomatis menuntut
     prompt barunya di sini. */
  const keluargaSilabus = [...new Set((g.templates || []).map((t) => t.family))].sort();
  const keluargaLatih = [...new Set(w.prompts.map((p) => p.family))].sort();
  const belum = keluargaSilabus.filter((f) => !keluargaLatih.includes(f));
  assert.deepStrictEqual(belum, [],
    'keluarga N5 tanpa latihan menulis: ' + belum.join(', '));
  const liar = keluargaLatih.filter((f) => !keluargaSilabus.includes(f));
  assert.deepStrictEqual(liar, [],
    'prompt menulis menunjuk keluarga yang tidak ada di silabus: ' + liar.join(', '));
});

test('blok dengar/bicara di rencana harian juga dijaga', () => {
  const i = app.indexOf('function todayPlanBlocks(');
  assert.ok(i > 0, 'todayPlanBlocks() tidak ditemukan');
  const blok = app.slice(i, i + 2500);
  const j = blok.indexOf("latihan.bicara-dengar");
  assert.ok(j > 0, 'blok bicara-dengar tidak ditemukan di todayPlanBlocks()');
  const sekitar = blok.slice(Math.max(0, j - 700), j + 120);
  assert.ok(/targetLang|activeTargetLang|punyaKontenJa/.test(sekitar),
    'rencana harian tetap menyelipkan blok dengar/bicara untuk murid Jepang');
});

test('peringatan pemilih bahasa jujur: menyebut yang belum ada, TIDAK menyebut yang sudah ada', () => {
  const id = baca('features/i18n/copy-id-bahasa.js');
  const th = baca('features/i18n/copy-th-bahasa.js');
  const kalimat = ((id.match(/'bahasa\.ja-peringatan':\s*'([^']*)'/) || [])[1] || '').toLowerCase();
  ['menyimak', 'berbicara'].forEach((kata) => {
    assert.ok(kalimat.includes(kata),
      'peringatan tidak menyebut "' + kata + '" — murid tidak diberi tahu apa yang belum ada');
  });
  /* m025-312: arah kedua, dan inilah yang membuat peringatan ini tetap jujur seiring waktu.
     Menulis sudah ada. Peringatan yang masih mendaftarnya sebagai "belum ada" membuat murid
     melewatkan latihan yang sebenarnya tersedia - salah ke arah yang berlawanan, tetapi
     tetap salah. */
  assert.ok(!/latihan[^.]*menulis[^.]*belum ada|menulis[^.]*belum ada/.test(kalimat),
    'peringatan masih mengatakan latihan menulis belum ada, padahal banknya sudah dibuat ' +
    'dan kartunya sudah ditawarkan');
  assert.ok(/'bahasa\.ja-peringatan'/.test(th), 'peringatan kehilangan kembaran Thai');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(baca('.github/workflows/quality.yml').indexOf('japanese-surface-honesty-test.js') >= 0,
    'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('japanese-surface-honesty-test GAGAL: ' + failures.length + ' assert merah');
  console.log('japanese-surface-honesty-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('japanese-surface-honesty-test: ' + pass + '/' + total + ' assert PASS');
