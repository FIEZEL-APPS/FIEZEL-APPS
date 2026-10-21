/**
 * FIEZEL m025-114 - integritas data yang dikirim ke perangkat.
 *
 * OWNER, 23 Agustus 2026: "COBA KAMU CEK FITUR AUDIOBOOK, LIBRARRYNYA TIDAK MEMUAT DATA
 * APAPUN".
 *
 * Sebabnya bukan kode Perpustakaan. `features/library/library-books-v1.json` sudah tidak
 * bisa diurai sejak commit 7ff64d3: satu dokumen JSON ditulis menimpa separuh berkas,
 * menyisakan penutup dini (`]` lalu `}`) di baris 1442-1443 sementara sisa buku lama
 * masih menggantung di bawahnya. `fetch(...).json()` melempar, dan seluruh rak buku
 * kosong - tanpa satu pun tes memerah, karena TIDAK ADA tes yang pernah membuka berkas
 * data ini. Enam puluh empat tes berjalan di CI dan tidak satu pun mengurai JSON yang
 * benar-benar dikirim ke perangkat.
 *
 * Berkas ini menutup celah itu untuk SEMUA data runtime, bukan hanya Perpustakaan:
 *
 *   1. Setiap .json yang ikut terkirim harus bisa diurai. Ini gerbang yang langsung
 *      memerah untuk kerusakan seperti di atas.
 *   2. Paket Perpustakaan harus memenuhi kontrak yang benar-benar dibaca runtime-nya
 *      (features/library/fiezel-library.js): schema, daftar buku, dan - yang paling
 *      penting untuk audiobook - setiap kalimat punya pasangan Inggris/Indonesia.
 *
 * Pemeriksaan kedua ada karena JSON yang valid pun bisa kosong isinya: berkas yang
 * teruraikan tetapi tanpa kalimat akan memberi rak buku yang terlihat penuh dan pemutar
 * yang tidak punya apa pun untuk dibacakan.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = __fzRoot;
let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + (e && e.message)); }
}

// vendor/ dan node_modules/ tidak ditulis di repo ini; .claude/ berisi worktree agen.
const SKIP_DIRS = new Set(['node_modules', 'vendor', '.git', '.claude', '.github']);

function collectJson(dir, out) {
  out = out || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') {
      if (SKIP_DIRS.has(entry.name)) continue;
    }
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectJson(full, out);
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

// BOM sengaja ditoleransi: peramban membuangnya saat mendekode UTF-8, jadi berkas ber-BOM
// TIDAK rusak di perangkat. Yang dijaga di sini kerusakan struktur, bukan gaya penulisan.
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));

test('setiap berkas .json yang ikut terkirim bisa diurai', () => {
  const broken = [];
  for (const file of collectJson(root)) {
    try { readJson(file); }
    catch (e) { broken.push(path.relative(root, file) + ' :: ' + e.message); }
  }
  assert.deepStrictEqual(broken, [],
    'JSON rusak - fitur yang membacanya akan kosong di perangkat, bukan error yang terlihat:\n    ' +
    broken.join('\n    '));
});

/* ------------------------------------------------------------------ *
 * Kontrak paket Perpustakaan, persis seperti yang dibaca runtime-nya
 * ------------------------------------------------------------------ */

const PACK = path.join(root, 'features', 'library', 'library-books-v1.json');

test('paket Perpustakaan memenuhi kontrak fiezel-library.js', () => {
  const pack = readJson(PACK);
  assert.strictEqual(pack.schema, 'fiezel-library-v1', 'schema paket tidak dikenali runtime');
  assert.ok(Array.isArray(pack.books) && pack.books.length >= 9,
    'rak buku kosong atau menyusut: ' + (pack.books ? pack.books.length : 'bukan array'));

  const ids = new Set();
  for (const book of pack.books) {
    const where = 'buku ' + (book && book.id ? book.id : '(tanpa id)');
    assert.ok(book.id && !ids.has(book.id), where + ': id kosong atau ganda');
    ids.add(book.id);
    for (const field of ['title', 'kind', 'level']) {
      assert.ok(typeof book[field] === 'string' && book[field].trim(), where + ': ' + field + ' kosong');
    }
    assert.ok(Number.isFinite(book.minutes) && book.minutes > 0, where + ': minutes tidak masuk akal');
    assert.ok(book.cover && book.cover.emoji, where + ': sampul tidak lengkap');
    assert.ok(Array.isArray(book.chapters) && book.chapters.length, where + ': tidak punya bab');
  }
});

test('setiap kalimat punya pasangan Inggris dan Indonesia', () => {
  // Inilah yang membuat audiobook dan terjemahan sekali ketuk bisa hidup: pemutar membaca
  // .en, dan ketukan menampilkan .id. Satu sisi yang kosong berarti kalimat bisu atau
  // ketukan yang tidak menjawab apa-apa - keduanya baru ketahuan setelah murid membukanya.
  const pack = readJson(PACK);
  const empty = [];
  let total = 0;
  for (const book of pack.books) {
    let count = 0;
    for (const chapter of book.chapters || []) {
      for (const sentence of chapter.sentences || []) {
        count++; total++;
        const en = String(sentence.en || '').trim();
        const id = String(sentence.id || '').trim();
        if (!en || !id) empty.push(book.id + ' #' + count + (en ? ' (terjemahan kosong)' : ' (teks Inggris kosong)'));
      }
    }
    assert.ok(count > 0, 'buku ' + book.id + ' tidak punya satu kalimat pun');
  }
  assert.deepStrictEqual(empty.slice(0, 12), [], 'kalimat tanpa pasangan:\n    ' + empty.slice(0, 12).join('\n    '));
  assert.ok(total >= 200, 'total kalimat menyusut drastis: ' + total);
});

test('paket Perpustakaan tetap satu dokumen, bukan dua yang ditempel', () => {
  // Bentuk persis kerusakan m025-114: dokumen kedua ditulis menimpa separuh berkas, jadi
  // ada penutup akar di tengah dan sisa dokumen lama menggantung sesudahnya. Diuraikan,
  // JSON.parse memang sudah menangkapnya - tetapi pemeriksaan ini menyebut namanya, supaya
  // yang membaca kegagalannya tahu harus mencari APA, bukan hanya "JSON tidak valid".
  const lines = fs.readFileSync(PACK, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const rootCloses = [];
  lines.forEach((line, i) => { if (/^\}\s*$/.test(line)) rootCloses.push(i + 1); });
  assert.strictEqual(rootCloses.length, 1,
    'ada ' + rootCloses.length + ' penutup akar (baris ' + rootCloses.join(', ') +
    ') - berkas ini berisi lebih dari satu dokumen JSON');
  let lastContent = lines.length;
  while (lastContent > 0 && !lines[lastContent - 1].trim()) lastContent--;
  assert.strictEqual(rootCloses[0], lastContent,
    'penutup akar ada di baris ' + rootCloses[0] + ' dari ' + lastContent +
    ' - ada isi yang menggantung sesudahnya');
});

process.on('exit', () => {
  if (failures) {
    console.error('FIEZEL m025-114 integritas data: FAIL (' + failures + ')');
    process.exitCode = 1;
  } else {
    console.log('FIEZEL m025-114 integritas data: PASS');
  }
});
