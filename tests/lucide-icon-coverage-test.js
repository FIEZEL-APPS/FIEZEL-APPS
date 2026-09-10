#!/usr/bin/env node
/**
 * GERBANG CAKUPAN IKON LUCIDE (tests/lucide-icon-coverage-test.js)
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * `lucide.min.js` di repo ini BUKAN pustaka penuh - ia subset yang dikurasi
 * tangan (92 glyph). Menulis `data-lucide="nama"` untuk glyph yang tidak ada
 * di subset TIDAK melempar apa pun: createIcons() melewati simpul itu, dan
 * yang tersisa di layar adalah <i> kosong. Tidak ada error, tidak ada log,
 * tidak ada gerbang yang melihatnya.
 *
 * Itu bukan skenario hipotetis. Saat lonceng notifikasi mendarat (m025-254,
 * PR #341/#342), tiga ikonnya dipanggil dengan nama yang tidak pernah ada di
 * subset - `bell-off` (keadaan kosong lembar Notifikasi), `clipboard-list`
 * (tugas latihan dari guru), dan `party-popper` (sorakan teman). Ketiganya
 * merender kotak kosong di aplikasi sungguhan, dan tiga lagi yang lebih tua
 * (`check-circle-2`, `share-2`, `triangle-alert`) sudah lama begitu tanpa
 * ada yang tahu. Semuanya ditambahkan ke subset di commit yang sama dengan
 * gerbang ini; gerbang ini yang menahan kelas bugnya supaya tidak kembali.
 *
 * YANG DIJAGA: setiap nama ikon yang dipakai kode aplikasi ADA di subset.
 * YANG TIDAK DIJAGA: glyph di subset yang tidak dipakai siapa pun - itu
 * cadangan, bukan cacat.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');

const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');
let gagal = 0;
const ok = (m) => console.log('ok - ' + m);
const salah = (m) => { gagal++; console.error('GAGAL - ' + m); };

/* ---------------------------------------------------------------- subset ---- */
const SUBSET = read('lucide.min.js');
const tersedia = new Set([...SUBSET.matchAll(/"([a-z0-9-]+)":\[\["/g)].map((m) => m[1]));
if (tersedia.size >= 50) ok(`subset lucide terbaca: ${tersedia.size} glyph`);
else salah(`subset lucide hanya ${tersedia.size} glyph - ekstraktornya rusak, bukan repo-nya`);

/* ---------------------------------------------------------------- pemakaian -- */
/* Dua bentuk pemakaian, dan KEDUANYA harus ikut terbaca:
 *   1. literal   : data-lucide="trophy"
 *   2. ekspresi  : data-lucide="${e.mode==='ujian'?'shield-check':'clipboard-list'}"
 * Bentuk kedua adalah tempat bug ini bersembunyi - pemindai yang hanya membaca
 * bentuk pertama akan melaporkan "semua aman" sementara ikon di dalam ternary
 * tidak pernah ada. Nama di dalam ekspresi diambil dari literal string di
 * dalamnya; nilai yang datang dari variabel (`${icon}`) memang tidak bisa
 * diketahui secara statis dan sengaja dilewati - dicatat di bawah. */
const SUMBER = ['app.js', 'index.html'];
(function kumpulkanFeatures(dir) {
  for (const e of fs.readdirSync(path.join(__fzRoot, dir), { withFileTypes: true })) {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) kumpulkanFeatures(rel);
    else if (/\.(js|html)$/.test(e.name)) SUMBER.push(rel);
  }
}('features'));

const dipakai = new Map();               // nama -> Set(berkas)
const dinamis = [];                      // ${variabel} yang tidak bisa dibaca statis
function catat(nama, berkas) {
  if (!dipakai.has(nama)) dipakai.set(nama, new Set());
  dipakai.get(nama).add(berkas);
}
for (const f of SUMBER) {
  const src = read(f);
  for (const m of src.matchAll(/data-lucide\s*=\s*(?:\\?["'])([^"'`${}\\]+)(?:\\?["'])/g)) catat(m[1], f);
  for (const m of src.matchAll(/data-lucide\s*=\s*\\?["']\$\{([^}]*)\}/g)) {
    /* Literal yang berdiri di sisi kanan perbandingan (`e.mode==='ujian'`) adalah NILAI
     * yang dibandingkan, bukan nama ikon. Memasukkannya membuat gerbang menuduh 'ujian'
     * sebagai ikon hilang - persis jenis merah palsu yang membuat gerbang tidak dipercaya. */
    const literal = [...m[1].matchAll(/'([a-z0-9-]+)'/g)]
      .filter((x) => !/[=!]==?\s*$/.test(m[1].slice(0, x.index)))
      .map((x) => x[1]);
    if (literal.length) literal.forEach((n) => catat(n, f));
    else dinamis.push(f + ': ${' + m[1].slice(0, 40) + '}');
  }
}
if (dipakai.size >= 40) ok(`nama ikon yang dipakai kode: ${dipakai.size}`);
else salah(`hanya ${dipakai.size} nama ikon terbaca - pemindainya rusak, bukan repo-nya`);

/* ---------------------------------------------------------------- invarian --- */
const hilang = [...dipakai.keys()].filter((n) => !tersedia.has(n)).sort();
if (hilang.length === 0) {
  ok(`setiap ikon yang dipanggil ADA di subset (${dipakai.size} nama diperiksa)`);
} else {
  salah('ikon dipanggil tapi tidak ada di lucide.min.js - akan merender <i> KOSONG tanpa satu pun error: ' +
    hilang.map((n) => `${n} (${[...dipakai.get(n)].slice(0, 2).join(', ')})`).join(' | '));
}

/* Nama yang datang dari variabel dicatat, tidak dihukum: gerbang harus jujur soal
 * apa yang TIDAK bisa ia buktikan. */
console.log(`catatan - ${dinamis.length} pemanggilan memakai nama dari variabel (tidak bisa diperiksa statis)` +
  (dinamis.length ? ': ' + dinamis.slice(0, 4).join(' | ') : ''));

/* Ikon lonceng notifikasi (m025-254) disebut eksplisit: ia yang melahirkan gerbang ini. */
for (const n of ['bell', 'bell-off', 'clipboard-list', 'shield-check', 'party-popper', 'trophy', 'user-plus', 'mail-open']) {
  if (!tersedia.has(n)) salah(`ikon lembar Notifikasi hilang dari subset: ${n}`);
}
if (!gagal) ok('seluruh ikon lembar Notifikasi tersedia');

console.log(gagal ? `\nFIEZEL cakupan ikon lucide: GAGAL (${gagal})` : '\nFIEZEL cakupan ikon lucide: PASS');
process.exit(gagal ? 1 : 0);
