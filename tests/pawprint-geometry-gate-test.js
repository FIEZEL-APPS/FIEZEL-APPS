#!/usr/bin/env node
/**
 * Gerbang geometri tapak untuk redesign maskot PAW.
 *
 * assets/brand/fiezel-paw.svg adalah bentuk tapak arah 02 (empat balok wordmark +
 * satu bantalan), dan header berkasnya sendiri menyatakan kontraknya: sumber
 * bentuk TUNGGAL, dijaga agar identik dengan ICONS.paw (tests/paw-mascot-test.js).
 * Redesign memperluas kontrak itu ke DALAM rig (spec §35 "No random asset
 * substitutions"; direction-c): emblem dada memakai KOORDINAT fiezel-paw.svg apa
 * adanya, diskalakan hanya lewat transform pada grup pembungkus. Rig lama
 * menggambar motif tapak generik (elips + tiga lingkaran) di telapak tangan —
 * persis "digambar ulang berbeda-beda" yang dilarang brief A.6, hanya kali ini
 * di tubuh karakternya sendiri.
 *
 * KEPUTUSAN OWNER (papan edit, 28 Agu): "untuk logo ini jangan tempatkan di
 * tangannya, cukup di dada" — glyph HANYA di dada. Maka gerbang ini menuntut dua
 * hal sekaligus: fz-emblem ada di dada dengan koordinat kanon, dan bantalan
 * tangan (fz-pads / fz-pads-l, sanksi lama A-9 yang DICABUT keputusan itu)
 * TIDAK ADA lagi di rig maupun ekspor. Gerbang MERAH sampai rig Direction C
 * (subagent Rig komponen PAW, Wave I) mendarat.
 *
 * Kontrak penandaan yang ditagih ke pembangun rig: grup emblem dada berkelas
 * fz-emblem, dan ekspor badan-penuh membawa kelas yang sama (ekspor = hasil
 * generate, jadi ini gratis).
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(__fzRoot, f));

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + ': ' + e.message); }
}

/** Normalisasi bentuk — sama persis dengan shapeOf di tests/paw-mascot-test.js, supaya
 *  dua gerbang tidak pernah punya dua pendapat tentang "bentuk yang sama". */
function shapeOf(source) {
  const bars = (source.match(/x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" rx="[\d.]+"/g) || []);
  const pad = /d="(M12\.6 14[^"]*)"/.exec(source);
  return { bars: bars.map((b) => b.replace(/\s+/g, ' ')), pad: pad ? pad[1].replace(/\s+/g, ' ') : '' };
}

/** Potongan definisi ikon paw — logika pawBlock() tests/paw-mascot-test.js. */
function pawBlock(icons) {
  const start = icons.indexOf('paw:');
  const rest = icons.slice(start + 4);
  const next = /\n    [a-z][A-Za-z]*:\s/.exec(rest);
  return icons.slice(start, next ? start + 4 + next.index : icons.length);
}

/** Ambil grup <g ... class="...cls..."> lengkap dengan isi, sadar-nesting. */
function groupBlock(source, cls) {
  const at = source.search(new RegExp('<g[^>]*class="[^"]*\\b' + cls + '\\b[^"]*"'));
  if (at === -1) return null;
  let depth = 0, i = at;
  const tag = /<\/?g\b[^>]*>/g;
  tag.lastIndex = at;
  let m;
  while ((m = tag.exec(source))) {
    if (m[0][1] === '/') { depth--; if (!depth) return source.slice(at, m.index + m[0].length); }
    else if (!/\/>$/.test(m[0])) depth++;
  }
  return null;
}

function assertShapeMatches(label, block, canon) {
  if (!block) {
    throw new Error(label + ' tidak ditemukan — rig Direction C wajib menandai grupnya '
      + '(kontrak penandaan di kepala berkas tes ini)');
  }
  const got = shapeOf(block);
  if (got.bars.length !== 4 || !got.pad) {
    throw new Error(label + ' bukan bentuk arah 02 (' + got.bars.length
      + ' balok, bantalan ' + (got.pad ? 'ada' : 'tidak ada')
      + ') — tapak generik elips+lingkaran adalah bentuk yang diganti redesign ini');
  }
  for (let i = 0; i < 4; i++) {
    if (got.bars[i] !== canon.bars[i]) {
      throw new Error(label + ' balok ' + (i + 1) + ' menyimpang dari fiezel-paw.svg:\n      punya '
        + got.bars[i] + '\n      kanon ' + canon.bars[i]
        + '\n      — skala hanya boleh lewat transform grup, koordinatnya tidak disentuh');
    }
  }
  if (got.pad !== canon.pad) throw new Error(label + ' bantalan menyimpang dari fiezel-paw.svg');
}

const ASSET = read('assets/brand/fiezel-paw.svg');
const CANON = shapeOf(ASSET);

// Badan-penuh yang wajib membawa emblem dada. Kembar website dijaga byte demi
// byte oleh e5-checksum-gate, jadi tidak perlu diulang di sini. Ekspor kepala
// saja bebas — tidak ada dada di bingkainya.
const FULL_BODY = [
  'assets/brand/paw-mascot-full.svg',
  'assets/marketing/mascot-poses/paw-mascot-full-celebrating.svg',
];

test('fiezel-paw.svg masih bentuk arah 02 — empat balok beda tinggi, satu bantalan', () => {
  if (CANON.bars.length !== 4 || !CANON.pad) throw new Error('berkas kanon rusak');
  const heights = CANON.bars.map((b) => Number(/height="([\d.]+)"/.exec(b)[1]));
  if (new Set(heights).size !== 4) throw new Error('tinggi balok tidak semuanya berbeda');
});

test('ICONS.paw identik dengan berkas kanon (perpanjangan gerbang lama)', () => {
  assertShapeMatches('ICONS.paw', pawBlock(read('features/ui/fiezel-icons.js')), CANON);
});

test('emblem dada rig memakai koordinat fiezel-paw.svg', () => {
  const rig = read('features/mascot/fiezel-mascot.js');
  assertShapeMatches('grup fz-emblem di rig', groupBlock(rig, 'fz-emblem'), CANON);
});

test('bantalan tangan TIDAK ADA — glyph hanya di dada (keputusan OWNER)', () => {
  // Sanksi lama A-9 (fz-pads kanan + perluasan fz-pads-l kiri) dicabut oleh
  // keputusan OWNER di papan edit: "untuk logo ini jangan tempatkan di
  // tangannya, cukup di dada". Bantalan yang muncul kembali — dengan koordinat
  // kanon sekalipun — adalah pelanggaran keputusan itu, bukan detail gaya.
  const offenders = [];
  const scan = (label, src) => {
    for (const cls of ['fz-pads-l', 'fz-pads']) {
      if (new RegExp('class="[^"]*\\b' + cls + '\\b').test(src)) offenders.push(label + ' → ' + cls);
    }
  };
  scan('features/mascot/fiezel-mascot.js', read('features/mascot/fiezel-mascot.js'));
  for (const f of FULL_BODY) if (exists(f)) scan(f, read(f));
  if (offenders.length) {
    throw new Error('bantalan tangan masih ada: ' + offenders.join(', ')
      + ' — hapus grupnya; ekspor menyusul saat di-generate ulang dari rig');
  }
});

test('ekspor badan-penuh membawa emblem dengan koordinat yang sama', () => {
  for (const f of FULL_BODY) {
    if (!exists(f)) throw new Error(f + ' hilang');
    assertShapeMatches('emblem di ' + f, groupBlock(read(f), 'fz-emblem'), CANON);
  }
});

console.log('');
if (failures.length) {
  console.log('FIEZEL gerbang geometri tapak: FAIL (' + failures.length + ')');
  process.exit(1);
}
console.log('FIEZEL gerbang geometri tapak: PASS ' + pass);
