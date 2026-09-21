#!/usr/bin/env node
/**
 * tests/teacher-i18n-lazy-test.js — GERBANG BAHASA DASBOR GURU: KALIMAT TIDAK BOLEH
 * DIHITUNG SEBELUM BAHASANYA DIMUAT.
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * Sampai m025-359, dasbor KelasKu untuk Guru bocor bahasa dengan cara yang tidak bisa
 * dilihat oleh satu pun gerbang yang ada — termasuk th-coverage-test.js, yang hijau
 * sepanjang waktu cacat ini hidup.
 *
 * Bentuk cacatnya, dalam satu baris:
 *
 *     var NAV = [['hub', t('guru.nav-ruang-kelas', 'Ruang Kelas'), 'school'], ...];
 *
 * Baris itu berada di LINGKUP MODUL, jadi ia dievaluasi SEKALI saat berkas diurai.
 * Copy Thai dimuat DINAMIS sesudahnya (features/i18n/fiezel-th-loader.js, meniru pola
 * neural-prepare supaya murid Indonesia tidak membayar byte Thai). Urutannya karena itu
 * selalu sama, dan selalu kalah:
 *
 *     1. fiezel-teacher-shell.js diurai   -> NAV dihitung
 *     2. t('guru.nav-ruang-kelas') dipanggil -> registry Thai MASIH KOSONG
 *     3. t() jatuh ke cadangan            -> 'Ruang Kelas' (Indonesia)
 *     4. copy-th-feat-d.js tiba           -> TERLAMBAT; NAV sudah berupa nilai
 *
 * Yang dilihat murid Thai: sidebar berbahasa Indonesia utuh — Ruang Kelas, Ringkasan
 * Hari Ini, Kelas & Siswa, Tugas & Ujian, Analitik, Komunikasi, Jurnal Guru — sementara
 * judul di sebelahnya, yang dirender belakangan, SUDAH berbahasa Thai. Satu layar, dua
 * bahasa, berganti di tengah kalimat.
 *
 * KENAPA th-coverage-test.js TIDAK BISA MELIHATNYA: gerbang itu membandingkan KUNCI di
 * copy-id-* dengan copy-th-*. Ke-229 kunci dasbor guru SUDAH lengkap di keduanya. Yang
 * salah bukan terjemahannya melainkan WAKTU pemanggilannya, dan waktu tidak kelihatan
 * dari daftar kunci. Karena itu gerbang ini memeriksa BENTUK KODE, bukan isi copy-map.
 *
 * ==========================================================================
 * YANG DIPERIKSA
 * ==========================================================================
 *   (A) Tidak ada deklarasi di lingkup modul (var/let/const di luar semua fungsi) yang
 *       memanggil t(). Kalimat harus dihitung saat render, bukan saat berkas diurai.
 *   (B) Setiap kunci yang dipakai lewat t('kunci', ...) terdaftar di copy-id-* DAN
 *       copy-th-*. Ini menangkap kebocoran yang berlawanan: kunci baru yang lahir tanpa
 *       kembaran Thai-nya.
 *   (D) Tidak ada kalimat berbahasa Indonesia yang dicetak ke layar TANPA melewati t().
 *       Ini kelas kebocoran KEDUA, dan ia lolos dari (A) maupun (B): panel sambutan
 *       dasbor guru mencetak tujuh kalimat sebagai literal telanjang di dalam fungsi
 *       render. Tidak beku (jadi (A) diam), tidak punya kunci (jadi (B) diam), dan
 *       tetap berbahasa Indonesia untuk selamanya karena tidak ada terjemahan yang
 *       bisa menggantikan sesuatu yang tidak pernah bertanya.
 *
 *       Cara memeriksanya: buang dulu SELURUH panggilan t(...) dari sumber — cadangan
 *       Indonesia di dalamnya memang sah dan tidak boleh dihitung — lalu pindai sisa
 *       literal untuk kata fungsi bahasa Indonesia. Ambang dua kata berbeda dipilih
 *       supaya kata tunggal yang juga istilah kode ('data', 'menit') tidak memerahkan
 *       gerbang tanpa alasan.
 *
 *   (C) Gerbang ini benar-benar bisa menangkap cacatnya. Cek (A) dijalankan terhadap
 *       potongan kode sintetis yang MENGANDUNG cacat aslinya; kalau cek (A) menyatakan
 *       potongan itu bersih, gerbangnya sendiri yang rusak dan itu FAIL. Tanpa (C),
 *       gerbang yang salah-deteksi akan hijau selamanya dan memberi rasa aman palsu —
 *       persis keadaan yang melahirkan berkas ini.
 *
 * Nol jaringan, print-only: exit 1 bila ada FAIL.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');

const fs = require('fs');
const path = require('path');

const ROOT = __fzRoot;
const I18N_DIR = path.join(ROOT, 'features', 'i18n');

/* Berkas yang merender dasbor guru. Keduanya pernah membekukan kalimatnya. */
const TARGETS = [
  path.join('features', 'teacher', 'fiezel-teacher-shell.js'),
  path.join('features', 'class-hub', 'fiezel-class-hub.js')
];

const checks = [];
function ok(name) { checks.push({ name, pass: true }); }
function fail(name, detail) { checks.push({ name, pass: false, detail }); }

/* --------------------------------------------------------------------------
 * Pemindai kedalaman kurung kurawal.
 *
 * Membuang string, komentar, dan literal regex lebih dulu — kurung di DALAM string
 * ('}' dalam sebuah pesan, misalnya) akan menggeser hitungan dan membuat seluruh
 * gerbang ini mengarang. Penggantinya spasi, bukan kosong, supaya nomor kolom tidak
 * bergeser dan pesan galatnya tetap bisa ditunjuk.
 * ------------------------------------------------------------------------ */
function stripNonCode(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let inS = null;        // kutip yang sedang dibuka
  let inLine = false, inBlock = false;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (inLine) { if (c === '\n') { inLine = false; out += c; } else out += ' '; i++; continue; }
    if (inBlock) { if (c === '*' && d === '/') { inBlock = false; out += '  '; i += 2; } else { out += (c === '\n' ? c : ' '); i++; } continue; }
    if (inS) {
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === inS) { inS = null; out += ' '; i++; continue; }
      out += (c === '\n' ? c : ' '); i++; continue;
    }
    if (c === '/' && d === '/') { inLine = true; out += '  '; i += 2; continue; }
    if (c === '/' && d === '*') { inBlock = true; out += '  '; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') { inS = c; out += ' '; i++; continue; }
    out += c; i++;
  }
  return out;
}

/* Buang komentar saja, pertahankan string — cek (D) justru memeriksa isi string,
   tetapi komentar berbahasa Indonesia di repo ini melimpah dan bukan kebocoran. */
function stripNonComments(src) {
  let out = '', i = 0, inS = null, inLine = false, inBlock = false;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (inLine) { if (c === '\n') { inLine = false; out += c; } else out += ' '; i++; continue; }
    if (inBlock) { if (c === '*' && d === '/') { inBlock = false; out += '  '; i += 2; } else { out += (c === '\n' ? c : ' '); i++; } continue; }
    if (inS) {
      if (c === '\\') { out += src[i] + (src[i + 1] || ''); i += 2; continue; }
      if (c === inS) inS = null;
      out += c; i++; continue;
    }
    if (c === '/' && d === '/') { inLine = true; out += '  '; i += 2; continue; }
    if (c === '/' && d === '*') { inBlock = true; out += '  '; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') inS = c;
    out += c; i++;
  }
  return out;
}

/* Kembalikan nomor baris (1-based) deklarasi lingkup modul yang memanggil t().
 *
 * "Lingkup modul" = kedalaman kurung kurawal MINIMUM yang pernah dicapai berkas pada
 * sebuah deklarasi. Berkas-berkas ini dibungkus IIFE, jadi lantainya bukan 0; dihitung
 * dari isi berkas itu sendiri, bukan ditebak. */
function frozenDeclLines(src) {
  const code = stripNonCode(src);
  const codeLines = code.split('\n');
  const rawLines = src.split('\n');

  // depth pada AWAL tiap baris
  const depthAt = new Array(codeLines.length).fill(0);
  let depth = 0;
  for (let i = 0; i < codeLines.length; i++) {
    depthAt[i] = depth;
    for (const ch of codeLines[i]) { if (ch === '{') depth++; else if (ch === '}') depth--; }
  }

  // lantai = depth terkecil pada baris yang benar-benar punya deklarasi var/let/const
  const declIdx = [];
  for (let i = 0; i < codeLines.length; i++) {
    if (/^\s*(var|let|const)\s/.test(codeLines[i])) declIdx.push(i);
  }
  if (!declIdx.length) return [];
  let floor = Infinity;
  for (const i of declIdx) floor = Math.min(floor, depthAt[i]);

  const hits = [];
  for (const i of declIdx) {
    if (depthAt[i] !== floor) continue;              // di dalam fungsi -> dievaluasi saat dipanggil
    if (!/\bt\(\s*['"]/.test(rawLines[i])) continue; // tidak memanggil t() -> bukan urusan gerbang ini
    hits.push({ line: i + 1, text: rawLines[i].trim().slice(0, 120) });
  }
  return hits;
}

/* ---- (C) uji-diri: gerbangnya harus menangkap cacat aslinya -------------- */
const SPESIMEN_CACAT = [
  '(function (root) {',
  "  var CHIP_TICK_MS = 1000;",
  "  var NAV = [['hub', t('guru.nav-ruang-kelas', 'Ruang Kelas'), 'school']];",
  '  function render() {',
  "    var judul = t('guru.judul-ringkasan', 'Ringkasan hari ini');",
  '    return judul;',
  '  }',
  '}(this));'
].join('\n');

const spesimen = frozenDeclLines(SPESIMEN_CACAT);
if (spesimen.length === 1 && spesimen[0].line === 3) {
  ok('(C) gerbang menangkap spesimen cacat (NAV beku) dan TIDAK menyalahkan t() di dalam fungsi');
} else {
  fail('(C) gerbang gagal menguji dirinya sendiri',
    'diharapkan tepat 1 temuan di baris 3, didapat: ' + JSON.stringify(spesimen));
}

/* ---- kumpulkan kunci copy-map ------------------------------------------- */
function keysOf(file) {
  const s = fs.readFileSync(file, 'utf8');
  const out = new Set();
  for (const m of s.matchAll(/^\s*'([a-z0-9][a-z0-9.\-]*)'\s*:/gim)) out.add(m[1]);
  return out;
}
const idKeys = new Set(), thKeys = new Set();
for (const f of fs.readdirSync(I18N_DIR)) {
  if (/^copy-id-.*\.js$/.test(f)) for (const k of keysOf(path.join(I18N_DIR, f))) idKeys.add(k);
  if (/^copy-th-.*\.js$/.test(f)) for (const k of keysOf(path.join(I18N_DIR, f))) thKeys.add(k);
}

/* ---- (A) + (B) per berkas ----------------------------------------------- */
for (const rel of TARGETS) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { fail('berkas ada: ' + rel, 'tidak ditemukan'); continue; }
  const src = fs.readFileSync(abs, 'utf8');

  const frozen = frozenDeclLines(src);
  if (frozen.length === 0) {
    ok('(A) ' + rel + ': nol kalimat dihitung di lingkup modul');
  } else {
    fail('(A) ' + rel + ': ' + frozen.length + ' kalimat dihitung sebelum copy Thai dimuat',
      frozen.map(h => '    L' + h.line + '  ' + h.text).join('\n') +
      '\n    Jadikan fungsi yang dipanggil saat render (lihat navItems()/viewTitles()).');
  }

  const used = new Set();
  for (const m of src.matchAll(/\bt\(\s*'([a-z0-9][a-z0-9.\-]*)'/gi)) used.add(m[1]);
  const missId = [...used].filter(k => !idKeys.has(k)).sort();
  const missTh = [...used].filter(k => !thKeys.has(k)).sort();
  if (!missId.length && !missTh.length) {
    ok('(B) ' + rel + ': ' + used.size + ' kunci lengkap di id dan th');
  } else {
    fail('(B) ' + rel + ': kunci dipakai tetapi tidak terdaftar',
      (missId.length ? '    hilang di id: ' + missId.join(', ') + '\n' : '') +
      (missTh.length ? '    hilang di th: ' + missTh.join(', ') : ''));
  }
}

/* --------------------------------------------------------------------------
 * (D) literal berbahasa Indonesia yang tidak pernah lewat t()
 * ------------------------------------------------------------------------ */

/* Kata fungsi — bukan kata benda domain. Sengaja: 'kelas', 'guru', 'siswa' muncul di
   nama kunci, selector CSS, dan data-testid, jadi memakainya akan memerahkan gerbang
   pada kode yang benar. Kata fungsi hampir tidak pernah muncul di luar kalimat. */
const KATA_FUNGSI = ['yang', 'dan', 'untuk', 'dengan', 'tidak', 'dari', 'atau', 'sudah',
  'belum', 'akan', 'bisa', 'boleh', 'harus', 'saat', 'tanpa', 'lalu', 'juga', 'setiap',
  'supaya', 'karena', 'kalau', 'agar', 'pada', 'oleh', 'lebih', 'masih', 'hanya'];

/* Buang seluruh panggilan t(...) berikut isinya. Cadangan Indonesia di argumen kedua
   memang sah; menghitungnya akan membuat gerbang ini menyalahkan justru kode yang
   sudah benar. Penghapusan dilakukan dengan menghitung kurung supaya panggilan
   bersarang ikut terbuang utuh. */
function stripTCalls(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const m = /\bt\(/.exec(src.slice(i));
    if (!m) { out += src.slice(i); break; }
    const start = i + m.index;
    out += src.slice(i, start);
    let j = start + m[0].length, depth = 1, inS = null;
    while (j < src.length && depth > 0) {
      const c = src[j];
      if (inS) {
        if (c === '\\') { j += 2; continue; }
        if (c === inS) inS = null;
      } else if (c === "'" || c === '"' || c === '`') inS = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      j++;
    }
    /* Ganti panggilan t(...) dengan spasi SEPANJANG aslinya, bukan menghapusnya.
       Menghapus akan menggeser seluruh offset sesudahnya, dan nomor baris yang
       dilaporkan gerbang ini akan menunjuk baris yang salah — persis kesalahan yang
       membuat laporan gerbang tidak bisa dipercaya. Baris baru dipertahankan apa
       adanya supaya hitungan barisnya tetap benar. */
    for (const ch of src.slice(start, j)) out += (ch === '\n' ? '\n' : ' ');
    i = j;
  }
  return out;
}

for (const rel of TARGETS) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = stripNonComments(fs.readFileSync(abs, 'utf8'));
  const scan = stripTCalls(src);
  const bocor = [];
  for (const m of scan.matchAll(/'((?:\\.|[^'\\\n]){12,})'/g)) {
    const lit = m[1];
    if (!/[a-z]{3}/i.test(lit)) continue;
    /* HANYA literal yang membawa markup HTML. Itulah pemisah yang tepat antara
       "kalimat yang dicetak ke layar" dan "data".

       Berkas dasbor guru juga memuat BANK SOAL 17 mata pelajaran — ratusan medan
       prompt/options/why berbahasa Indonesia (Matematika, IPA, IPS, ...). Itu KONTEN
       mata pelajaran, bukan chrome antarmuka: menerjemahkannya adalah proyek konten
       (docs/PILOT-SEKOLAH-SMP.md menaksir ~2.400 soal), dan 17 mapel itu sendiri belum
       layak dipakai di kelas. Memerahkan gerbang karenanya akan menyandera setiap PR
       pada proyek yang sama sekali berbeda, jadi gerbang ini tidak berpura-pura
       mengurusnya. Kebocoran antarmuka SELALU lahir di dalam potongan HTML, dan itu
       yang dijaga di sini. */
    if (!/<\/?[a-z][a-z0-9]*(\s|>|\/)/i.test(lit)) continue;
    const kata = new Set();
    for (const w of lit.toLowerCase().match(/[a-z]+/g) || []) if (KATA_FUNGSI.indexOf(w) >= 0) kata.add(w);
    if (kata.size < 2) continue;
    const line = scan.slice(0, m.index).split('\n').length;
    bocor.push('    L' + line + '  ' + lit.slice(0, 90));
  }
  if (!bocor.length) ok('(D) ' + rel + ': nol kalimat Indonesia di luar t()');
  else fail('(D) ' + rel + ': ' + bocor.length + ' kalimat dicetak tanpa lewat t()',
    bocor.join('\n') + '\n    Daftarkan lewat copy-id-*/copy-th-* lalu panggil dengan t().');
}

/* ---- laporan ------------------------------------------------------------- */
let bad = 0;
for (const c of checks) {
  console.log((c.pass ? 'PASS  ' : 'FAIL  ') + c.name);
  if (!c.pass) { bad++; if (c.detail) console.log(c.detail); }
}
console.log('\nteacher-i18n-lazy-test: ' + (checks.length - bad) + '/' + checks.length + (bad ? ' PASS, ' + bad + ' FAIL' : ' PASS'));
process.exit(bad ? 1 : 0);
