// tests/japanese-th-parity-test.js — isi bank Jepang punya sensus Thai, dan sensus itu
// tidak boleh basi.
//
// KENAPA GERBANG INI ADA
// ----------------------
// CLAUDE.md mengikat satu aturan: setiap teks yang dilihat pengguna lahir DUA BAHASA.
// Aturan itu ditegakkan `th-coverage-test.js` dan `th-ui-leak-test.js` — tetapi keduanya
// hanya menjangkau naskah ANTARMUKA, yang lahir lewat `FiezelI18n.t()`. Isi bank lahir
// lewat jalur lain: ia dimuat sebagai JSON dan dirender apa adanya.
//
// Akibatnya diukur, bukan ditebak: naskah antarmuka 2.452/2.452 punya kembaran Thai,
// sementara isi bank Jepang NOL dari 15.364 medan. Murid Thai yang membuka kursus Jepang
// mendapat menu dan tombol berbahasa Thai, lalu arti kata, penjelasan tata bahasa, soal
// bacaan, dan petunjuk menulis semuanya Indonesia. Itu layar campur — persis yang aturan
// dua-bahasa ada untuk mencegah.
//
// Dan sebelum gerbang ini, TIDAK ADA yang bertanya. Lima gerbang membaca `content/ja/`;
// tiga tidak menyentuh Thai sama sekali, dua hanya memeriksa `copy-th-bahasa.js` — naskah
// tombol pemilih bahasa, bukan isi bank. Jadi hijaunya bukan bukti banknya dua bahasa,
// melainkan bukti tidak ada yang mengukur.
//
// APA YANG GERBANG INI LAKUKAN, DAN APA YANG TIDAK
// ------------------------------------------------
// Ia TIDAK menuntut 15.364 terjemahan Thai hari ini. Menuntut itu sekarang berarti merah
// permanen, dan gerbang yang merah permanen adalah gerbang yang dimatikan orang.
//
// Yang ia tuntut: SENSUS yang benar. Tiap bank mendaftarkan berapa medan Indonesia yang
// dilihat murid dan berapa yang sudah punya Thai, bertanggal. Lalu:
//
//   - menambah isi Indonesia tanpa Thai  -> `medan` tidak cocok -> MERAH.
//     Utangnya tidak bisa bertambah diam-diam; penulisnya harus melihat angkanya naik
//     dan menuliskannya sendiri.
//   - menulis Thai                        -> `berTh` tidak cocok -> MERAH.
//     Utang yang lunas wajib dicoret, sama seperti UTANG_TANPA_TH di th-coverage-test.
//   - bank Jepang baru lahir              -> tidak ada di sensus -> MERAH.
//     Ditemukan dari isi direktori, bukan dari daftar, jadi tidak ada yang bisa lolos
//     dengan cara tidak didaftarkan.
//
// Sensus yang cocok = hijau. Itu bukan klaim "sudah dua bahasa"; itu klaim "kami tahu
// persis seberapa jauh dari dua bahasa, dan angkanya tidak bergerak tanpa ada yang tahu".
//
// SIDECAR
// -------
// Terjemahan Thai boleh datang dua cara: medan Thai inline di banknya, atau berkas sidecar
// `content/ja/<nama-bank>-th.json` (pola yang sudah dipakai kursus Inggris lewat
// `vocabulary-th.json`). Keduanya dihitung, jadi gerbang ini tidak memaksa satu bentuk.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const DIR_JA = path.join(__fzRoot, 'content', 'ja');
const bacaJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

const THAI = /[฀-๿]/;
const berisi = (s) => typeof s === 'string' && s.trim().length > 0;

/*
 * SENSUS UTANG — bertanggal, dan BUKAN tempat pekerjaan baru.
 *
 * `medan` = jumlah medan Indonesia yang dilihat murid di bank itu.
 * `berTh` = berapa di antaranya yang sudah punya Thai (inline atau lewat sidecar).
 *
 * Menaikkan `medan` adalah keputusan sadar: ia berarti memilih mengirim lebih banyak layar
 * campur ke murid Thai. Boleh — asal tertulis, bertanggal, dan terlihat di diff.
 */
const SENSUS = new Map([
  ['vocabulary-master-ja.json', {
    sejak: '2026-09-14', medan: 5652, berTh: 0,
    catatan: 'arti + terjemahan kalimat contoh, 1.884 entri N5-N1',
  }],
  ['grammar-templates-ja.json', {
    sejak: '2026-09-14', medan: 5908, berTh: 0,
    catatan: 'tujuan, miskonsepsi, penalaran, penjelasan, dan sebab-gagal pengecoh; 422 butir N5+N4',
  }],
  ['reading-bank-ja.json', {
    sejak: '2026-09-14', medan: 3750, berTh: 0,
    catatan: 'pertanyaan + pilihan jawaban, 150 bacaan',
  }],
  ['writing-prompts-ja.json', {
    sejak: '2026-09-14', medan: 54, berTh: 0,
    catatan: 'petunjuk Indonesia tiap prompt, 54 prompt N5+N4',
  }],
]);

/* Bank yang memang TIDAK punya teks murid — bukan utang, jadi tidak masuk sensus. */
const TANPA_TEKS_MURID = new Set(['family-graph-ja.json']);

/**
 * Memungut medan Indonesia yang DILIHAT MURID dari satu bank. Bentuk tiap bank berbeda,
 * jadi pemungutnya per-bank — tetapi yang dipungut selalu hal yang sama: kalimat yang
 * mendarat di layar murid, bukan metadata.
 */
function medanMurid(nama, doc) {
  const keluar = [];
  const pungut = (s) => { if (berisi(s)) keluar.push(String(s)); };

  if (nama === 'vocabulary-master-ja.json') {
    for (const w of doc.words || []) {
      pungut(w.meaning);
      for (const m of w.meanings || []) pungut(m.meaning);
      for (const e of w.examples || []) pungut(e.id);
    }
  } else if (nama === 'grammar-templates-ja.json') {
    for (const t of doc.templates || []) {
      pungut(t.pedagogicalObjectiveId); pungut(t.misconceptionTargetedId); pungut(t.reasoningOperationId);
      const e = t.explanation || {};
      pungut(e.whyCorrectId); pungut(e.ruleId); pungut(e.whyOthersFailId);
      pungut(e.howToAvoidId); pungut(e.memoryCueId);
      for (const d of t.distractors || []) { pungut(d.misconceptionId); pungut(d.whyFailsId); }
    }
  } else if (nama === 'reading-bank-ja.json') {
    // Soal bacaan berbentuk array posisional: [pertanyaan, [pilihan], kunci, meta].
    for (const p of (Array.isArray(doc) ? doc : doc.passages || [])) {
      for (const q of p.qs || []) { pungut(q[0]); for (const o of q[1] || []) pungut(o); }
    }
  } else if (nama === 'writing-prompts-ja.json') {
    for (const p of doc.prompts || []) pungut(p.id_hint);
  }
  return keluar;
}

/** Semua bank Jepang, DITEMUKAN dari isi direktori — bukan dari daftar yang bisa lupa disunting. */
function bankJepang() {
  if (!fs.existsSync(DIR_JA)) return [];
  return fs.readdirSync(DIR_JA)
    .filter((f) => f.endsWith('.json') && !f.endsWith('-th.json'))
    .sort();
}

/** Terjemahan Thai dari sidecar `content/ja/<bank>-th.json`, kalau ada. */
function sidecarTh(nama) {
  const p = path.join(DIR_JA, nama.replace(/\.json$/, '-th.json'));
  if (!fs.existsSync(p)) return 0;
  let n = 0;
  const telusuri = (v) => {
    if (typeof v === 'string') { if (THAI.test(v)) n += 1; return; }
    if (Array.isArray(v)) { v.forEach(telusuri); return; }
    if (v && typeof v === 'object') Object.values(v).forEach(telusuri);
  };
  telusuri(bacaJson(p));
  return n;
}

const diukur = new Map();
for (const nama of bankJepang()) {
  if (TANPA_TEKS_MURID.has(nama)) continue;
  const medan = medanMurid(nama, bacaJson(path.join(DIR_JA, nama)));
  diukur.set(nama, {
    medan: medan.length,
    berTh: medan.filter((s) => THAI.test(s)).length + sidecarTh(nama),
  });
}

test('pemungut medan tidak hampa — gerbang yang tidak melihat apa-apa BUKAN gerbang hijau', () => {
  // Tanpa assert ini, satu perubahan bentuk bank membuat medanMurid() memungut nol,
  // dan seluruh gerbang lolos dengan diam sambil tidak memeriksa apa pun.
  assert.ok(diukur.size >= 4, 'hanya ' + diukur.size + ' bank Jepang terukur — pemungutnya kemungkinan patah');
  const total = [...diukur.values()].reduce((n, x) => n + x.medan, 0);
  assert.ok(total >= 1000,
    'hanya ' + total + ' medan murid terpungut dari seluruh bank Jepang — pemungutnya patah, ' +
    'bukan banknya yang kosong');
  // Nol medan punya DUA sebab yang berbeda jauh, dan menyebut sebab yang salah mengirim
  // pembaca berikutnya membongkar pemungut yang sebenarnya sehat.
  const kosong = [...diukur].filter(([, x]) => x.medan === 0).map(([n]) => n);
  const patah = kosong.filter((n) => SENSUS.has(n));
  const belumDikenal = kosong.filter((n) => !SENSUS.has(n));
  assert.deepStrictEqual(patah, [],
    'bank yang SUDAH disensus kini terpungut nol medan — bentuknya berubah dan medanMurid() ' +
    'belum menyusul: ' + patah.join(', '));
  assert.deepStrictEqual(belumDikenal, [],
    'bank Jepang ini belum punya cabang di medanMurid(), jadi isinya tidak terukur sama sekali: ' +
    belumDikenal.join(', ') + '\n    Tambahkan cabangnya DULU (supaya medan muridnya terhitung), ' +
    'baru daftarkan di SENSUS.');
});

test('setiap bank Jepang terdaftar di sensus — yang baru tidak boleh lolos tanpa dihitung', () => {
  const asing = [...diukur.keys()].filter((n) => !SENSUS.has(n));
  assert.deepStrictEqual(asing, [],
    asing.length + ' bank Jepang tanpa baris sensus: ' + asing.join(', ') +
    '\n    Tambahkan ke SENSUS dengan tanggal hari ini. Bank baru berbahasa Indonesia saja ' +
    'adalah keputusan yang boleh diambil — tetapi tidak boleh diambil diam-diam.');
});

test('sensus tidak menyebut bank yang sudah tidak ada', () => {
  const hantu = [...SENSUS.keys()].filter((n) => !diukur.has(n));
  assert.deepStrictEqual(hantu, [],
    'baris sensus menunjuk bank yang tidak ada lagi: ' + hantu.join(', ') + ' — coret barisnya');
});

test('UTANG TIDAK BERTAMBAH DIAM-DIAM: jumlah medan Indonesia cocok sensus', () => {
  const meleset = [];
  for (const [nama, x] of diukur) {
    const s = SENSUS.get(nama);
    if (!s || s.medan === x.medan) continue;
    const arah = x.medan > s.medan ? 'BERTAMBAH ' + (x.medan - s.medan) : 'berkurang ' + (s.medan - x.medan);
    meleset.push(nama + ': sensus ' + s.medan + ', nyata ' + x.medan + ' (' + arah + ')');
  }
  assert.deepStrictEqual(meleset, [],
    meleset.length + ' bank menyimpang dari sensus:\n    ' + meleset.join('\n    ') +
    '\n\n    Kalau kamu menambah isi Jepang: tulis Thai-nya, ATAU perbarui `medan` di SENSUS ' +
    '\n    dengan tanggal hari ini. Angkanya naik berarti lebih banyak layar campur sampai ke ' +
    '\n    murid Thai — itu boleh diputuskan, tidak boleh tidak terlihat.');
});

test('UTANG YANG LUNAS WAJIB DICORET: jumlah medan ber-Thai cocok sensus', () => {
  const meleset = [];
  for (const [nama, x] of diukur) {
    const s = SENSUS.get(nama);
    if (!s || s.berTh === x.berTh) continue;
    meleset.push(nama + ': sensus ' + s.berTh + ' ber-Thai, nyata ' + x.berTh);
  }
  assert.deepStrictEqual(meleset, [],
    meleset.length + ' bank menyimpang:\n    ' + meleset.join('\n    ') +
    '\n    Terjemahan Thai yang sudah ditulis wajib tercatat — sensus yang menyebut nol padahal ' +
    '\n    sudah ada isinya menyembunyikan kemajuan, persis seperti yang menyebut nol utang ' +
    '\n    padahal masih berutang.');
});

test('tiap baris sensus bertanggal dan beralasan', () => {
  const cacat = [];
  for (const [nama, s] of SENSUS) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.sejak || ''))) cacat.push(nama + ': tanggal `sejak` hilang/cacat');
    if (!berisi(s.catatan)) cacat.push(nama + ': tanpa catatan isi');
    if (!Number.isInteger(s.medan) || s.medan < 0) cacat.push(nama + ': `medan` bukan bilangan sah');
    if (!Number.isInteger(s.berTh) || s.berTh < 0 || s.berTh > s.medan) cacat.push(nama + ': `berTh` di luar jangkauan');
  }
  assert.deepStrictEqual(cacat, [], cacat.join(' | '));
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(fs.readFileSync(path.join(__fzRoot, '.github/workflows/quality.yml'), 'utf8')
    .indexOf('japanese-th-parity-test.js') >= 0, 'gerbang belum terdaftar di quality.yml');
});

const totMedan = [...diukur.values()].reduce((n, x) => n + x.medan, 0);
const totTh = [...diukur.values()].reduce((n, x) => n + x.berTh, 0);
const persen = totMedan ? ((totTh / totMedan) * 100).toFixed(1) : '0.0';

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('japanese-th-parity-test GAGAL: ' + failures.length + ' assert merah');
  console.log('japanese-th-parity-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('japanese-th-parity-test: ' + pass + '/' + total + ' assert PASS — paritas Thai isi bank Jepang ' +
  totTh + '/' + totMedan + ' medan (' + persen + '%), sensus cocok');
