#!/usr/bin/env node
/**
 * m025-246 — GERBANG BINGKAI STATIS MASKOT (kurangi-gerak).
 *
 * OWNER (edge case wajib): "Kurangi-gerak: 14 state maskot harus punya fallback statis —
 * verifikasi dengan test." Berkas ini adalah verifikasi yang diminta itu.
 *
 * APA YANG DIJAGA, DAN KENAPA IA BISA RUSAK DIAM-DIAM.
 *
 * Blok `prefers-reduced-motion` di features/mascot/fiezel-motion.css memampatkan SELURUH
 * animasi maskot ke 0,01 ms. Itu benar sebagai peredam gerak — tetapi animasi yang tidak
 * memakai `animation-fill-mode: forwards` lalu RUNTUH kembali ke pose dasarnya. Jadi murid
 * yang menyalakan kurangi-gerak bisa melihat wajah yang sama persis untuk "benar", "salah",
 * "berpikir", dan "mengantuk". Tidak ada yang error, tidak ada yang merah; hanya maskot yang
 * berhenti menyampaikan apa pun kepada murid yang paling butuh isyarat visual yang tenang.
 *
 * Cacat seperti itu tidak bisa dilihat oleh gerbang yang membaca animasi, karena animasinya
 * memang ada dan memang benar. Yang harus diperiksa adalah keberadaan jalur KEDUA: satu
 * bingkai statis per state.
 *
 * EMPAT ASERSI, dan tiap satu menutup satu cara jalur itu patah:
 *   T1  Setiap state di STATES punya entri di STATIC_FACE_FOR_STATE. Ini yang menangkap
 *       state yang ditambahkan besok tanpa bingkai statisnya.
 *   T2  Setiap ekspresi yang dirujuk peta itu BENAR-BENAR ada di pustaka EXPRESSIONS.
 *       Salah ketik nama ekspresi = applyFace() memperingatkan lalu tidak melakukan apa-apa,
 *       dan hasilnya identik dengan tidak punya bingkai statis sama sekali.
 *   T3  setState() benar-benar MEMANGGIL jalur itu, dan memanggilnya di bawah gerbang
 *       kurangi-gerak. Peta yang benar tetapi tidak pernah dipakai adalah dokumentasi,
 *       bukan perbaikan.
 *   T4  Gerbangnya membaca KEDUA sumber kurangi-gerak (media query sistem DAN
 *       body.reduce-motion dari Pengaturan aplikasi) — sama dengan yang dibaca CSS-nya.
 *       Membaca satu saja berarti separuh murid yang meminta kurangi-gerak tidak
 *       mendapatkannya.
 *
 * Konvensi rumah: tanpa dependensi, exit 1 saat gagal, nama berakhiran -test.js supaya
 * otomatis terdaftar oleh tests/gate-registry-test.js.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__fzRoot, 'features/mascot/fiezel-mascot.js'), 'utf8');
const CSS = fs.readFileSync(path.join(__fzRoot, 'features/mascot/fiezel-motion.css'), 'utf8');

let failures = 0;
function check(ok, name, detail) {
  if (ok) { console.log('ok - ' + name); return; }
  failures++;
  console.error('FAIL - ' + name + (detail ? '\n    ' + detail : ''));
}

/** Ambil isi satu literal array/objek bernama dari sumber, tanpa menjalankan berkasnya.
 *  Pembuka dicari sebagai YANG PERTAMA di antara `[` dan `{` — memaku salah satunya
 *  membuat sebuah array (STATES) dibaca sampai ke objek berikutnya di bawahnya, dan
 *  isinya lalu tercampur dengan tetangganya tanpa satu pun error. */
function literalBlock(source, declaration) {
  const at = source.indexOf(declaration);
  if (at === -1) return '';
  const from = at + declaration.length - 1;
  const bracket = source.indexOf('[', from);
  const brace = source.indexOf('{', from);
  const candidates = [bracket, brace].filter(i => i !== -1);
  if (!candidates.length) return '';
  const open = Math.min.apply(null, candidates);
  const closer = source[open] === '[' ? ']' : '}';
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === source[open]) depth++;
    else if (ch === closer) { depth--; if (depth === 0) return source.slice(open, i + 1); }
  }
  return '';
}

const statesBlock = literalBlock(SRC, 'const STATES =');
const mapBlock = literalBlock(SRC, 'const STATIC_FACE_FOR_STATE =');
const expressionsBlock = literalBlock(SRC, 'const EXPRESSIONS =');

const states = (statesBlock.match(/"([a-z-]+)"/g) || []).map(s => s.slice(1, -1));
/* Kunci peta ditulis berkutip ("idle": "neutral"), jadi pasangan pertama tiap baris adalah
   state dan yang kedua adalah nama ekspresi. */
const mapPairs = (mapBlock.match(/"([a-z-]+)"\s*:\s*"([a-z-]+)"/g) || []).map(entry => {
  const m = /"([a-z-]+)"\s*:\s*"([a-z-]+)"/.exec(entry);
  return { state: m[1], face: m[2] };
});
/* Nama ekspresi di pustaka ditulis TANPA kutip (neutral: {...}), di awal barisnya. */
const expressions = (expressionsBlock.match(/^\s{4}([a-z]+)\s*:/gm) || [])
  .map(line => line.trim().replace(':', ''));

check(states.length >= 14, 'daftar STATES terbaca',
  'ditemukan ' + states.length + ' state');
check(expressions.length >= 14, 'pustaka 14 ekspresi terbaca',
  'ditemukan ' + expressions.length + ' ekspresi: ' + expressions.join(', '));

/* -- T1: tidak ada state tanpa bingkai statis --------------------------------------- */
{
  const mapped = new Set(mapPairs.map(p => p.state));
  const missing = states.filter(s => !mapped.has(s));
  check(missing.length === 0,
    'T1 setiap state maskot punya bingkai statis untuk kurangi-gerak',
    'state tanpa bingkai statis: ' + missing.join(', '));
}

/* -- T2: tidak ada bingkai statis yang menunjuk ekspresi yang tidak ada -------------- */
{
  const known = new Set(expressions);
  const dangling = mapPairs.filter(p => !known.has(p.face));
  check(dangling.length === 0,
    'T2 setiap bingkai statis menunjuk ekspresi yang benar-benar ada di pustaka',
    dangling.map(p => p.state + ' -> ' + p.face).join(', '));
}

/* -- T3: jalur itu benar-benar dipakai setState() ------------------------------------ */
{
  const setStateAt = SRC.indexOf('this.classList.add("st-" + name);');
  const choreoAt = SRC.indexOf('this._choreo(name, gen);');
  const applyAt = SRC.indexOf('STATIC_FACE_FOR_STATE[name]');
  check(setStateAt !== -1 && applyAt !== -1 && applyAt > setStateAt,
    'T3a setState() memasang bingkai statis sesudah kelas state terpasang',
    'setState@' + setStateAt + ' apply@' + applyAt);
  /* Dua state (level-up, milestone) punya koreografi JS yang memanggil applyFace sendiri;
     koreografi itu harus MENANG kalau ia berjalan, jadi bingkai statis wajib dipasang
     SEBELUM _choreo, bukan sesudahnya. */
  check(choreoAt !== -1 && applyAt < choreoAt,
    'T3b bingkai statis dipasang sebelum _choreo, supaya koreografi tetap bisa menimpanya',
    'apply@' + applyAt + ' choreo@' + choreoAt);
  check(/if \(this\._reducedMotion\(\)\)/.test(SRC),
    'T3c bingkai statis dipasang HANYA di bawah gerbang kurangi-gerak',
    'tidak ada percabangan _reducedMotion() di setState');
}

/* -- T4: gerbangnya membaca kedua sumber kurangi-gerak ------------------------------- */
{
  /* Jangkarnya `_reducedMotion() {` (dengan kurung kurawal), BUKAN `_reducedMotion()`:
     yang kedua lebih dulu cocok dengan TITIK PANGGILnya di setState, dan blok yang
     terbaca lalu jadi badan setState — asersi di bawah akan menguji fungsi yang salah. */
  const gate = literalBlock(SRC, '_reducedMotion() {');
  check(/prefers-reduced-motion: reduce/.test(gate),
    'T4a gerbang membaca preferensi kurangi-gerak SISTEM');
  check(/reduce-motion/.test(gate),
    'T4b gerbang membaca sakelar kurangi-gerak DI DALAM aplikasi (body.reduce-motion)');
  /* CSS-nya membaca dua sumber yang sama. Kalau salah satunya hilang dari CSS, gerbang JS
     ini akan memasang bingkai statis untuk keadaan yang animasinya masih berjalan penuh. */
  check(/@media \(prefers-reduced-motion: reduce\)/.test(CSS),
    'T4c fiezel-motion.css masih meredam gerak dari preferensi sistem');
  check(/body\.reduce-motion \.fz-mascot/.test(CSS),
    'T4d fiezel-motion.css masih meredam gerak dari sakelar aplikasi');
}

console.log('');
if (failures) {
  console.error('FIEZEL mascot reduced-motion: FAIL (' + failures + ')');
  process.exit(1);
}
console.log('FIEZEL mascot reduced-motion: PASS (' + states.length + ' state, ' + expressions.length + ' ekspresi)');
