#!/usr/bin/env node
/**
 * m025-128 gerbang maskot PAW.
 *
 * OWNER memilih arah 02 dari lima arah yang dieksplorasi, lalu meminta dua hal:
 * "animasinya buatkan lebih eksklusif lagi, dan authentic" dan "animasinya berubah
 * tergantung user masuk ke menu bagian apa".
 *
 * Yang dijaga di sini bukan selera - selera bukan urusan tes. Yang dijaga adalah
 * keputusan-keputusan yang kalau dilanggar, dilanggarnya diam-diam:
 *
 *   1. SATU sumber bentuk. Brief A.6 memintanya eksplisit: "dapat diproduksi sebagai
 *      aset tunggal yang dipakai identik di seluruh halaman aplikasi - bukan digambar
 *      ulang berbeda-beda di tiap halaman". Dua salinan yang menyimpang adalah cara
 *      paling umum sebuah maskot berhenti terlihat sama di mana-mana.
 *   2. Tidak ada emoji sebagai bentuk final (larangan A.5).
 *   3. Gerak yang benar-benar berbeda per halaman, bukan satu animasi untuk semua.
 *   4. Gerak yang tetap TERKENDALI - amplitudo kecil, durasi panjang. Inilah satu-satunya
 *      bagian "eksklusif" yang bisa diukur mesin, dan justru bagian yang paling gampang
 *      hilang saat seseorang menaikkan angka supaya "lebih kelihatan".
 *   5. Halaman tes tetap diam. Ini keputusan produk, bukan detail gaya.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const ICONS = read('features/ui/fiezel-icons.js');
const BUBBLE = read('features/ui/fiezel-coach-bubble.js');
const CSS = read('style.css');
const ASSET = read('assets/brand/fiezel-paw.svg');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + ': ' + e.message); }
}

/** Koordinat bentuk, dinormalkan supaya dua berkas bisa dibandingkan apa adanya. */
function shapeOf(source) {
  const bars = (source.match(/x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" rx="[\d.]+"/g) || []);
  const pad = /d="(M12\.6 14[^"]*)"/.exec(source);
  return { bars: bars.map((b) => b.replace(/\s+/g, ' ')), pad: pad ? pad[1].replace(/\s+/g, ' ') : '' };
}

test('PAW ada, dan bentuknya arah 02 — empat balok, satu bantalan', () => {
  if (!/paw:\s*'/.test(ICONS)) throw new Error('ikon paw tidak ada di fiezel-icons.js');
  const shape = shapeOf(ICONS.slice(ICONS.indexOf("paw:"), ICONS.indexOf("/* Tab bar */")));
  if (shape.bars.length !== 4) throw new Error('balok berjumlah ' + shape.bars.length + ', arah 02 punya empat');
  if (!shape.pad) throw new Error('bantalan tidak ditemukan');
  // Tinggi keempat balok harus BERBEDA - itu yang membedakannya dari empat jari bulat
  // generik, dan yang membuatnya terbaca sebagai balok wordmark FIEZEL.
  const heights = shape.bars.map((b) => Number(/height="([\d.]+)"/.exec(b)[1]));
  if (new Set(heights).size !== 4) {
    throw new Error('tinggi balok tidak semuanya berbeda (' + heights.join(', ')
      + ') — balok seragam adalah equalizer, bukan bentuk yang diambil dari wordmark');
  }
});

test('hanya ada SATU sumber bentuk PAW, dan keduanya identik', () => {
  // Brief A.6: aset tunggal, dipakai identik di seluruh halaman.
  const inline = shapeOf(ICONS.slice(ICONS.indexOf("paw:"), ICONS.indexOf("/* Tab bar */")));
  const asset = shapeOf(ASSET);
  if (asset.bars.length !== 4) throw new Error('assets/brand/fiezel-paw.svg bukan bentuk arah 02');
  for (let i = 0; i < 4; i++) {
    if (inline.bars[i] !== asset.bars[i]) {
      throw new Error('balok ' + (i + 1) + ' menyimpang antara ikon dan berkas aset:\n      ikon  '
        + inline.bars[i] + '\n      aset  ' + asset.bars[i]);
    }
  }
  if (inline.pad !== asset.pad) throw new Error('bantalan menyimpang antara ikon dan berkas aset');
});

test('tidak ada emoji sebagai bentuk PAW', () => {
  // Larangan brief A.5. Emoji hanya boleh jadi placeholder eksplorasi.
  const face = /icon\('([a-z]+)'\)/g;
  let m, used = [];
  while ((m = face.exec(BUBBLE))) used.push(m[1]);
  if (!used.length || used.some((n) => n !== 'paw')) {
    throw new Error('wajah pembimbing memakai ' + [...new Set(used)].join(', ') + ', bukan paw');
  }
  if (/[\u{1F300}-\u{1FAFF}]/u.test(BUBBLE.replace(/^\s*[*/].*$/gm, ''))) {
    throw new Error('ada emoji di jalur render pembimbing');
  }
});

test('gerak benar-benar berganti mengikuti halaman', () => {
  const scenes = [...CSS.matchAll(/\[data-fz-scene="([a-z]+)"\]/g)].map((m) => m[1]);
  const unique = [...new Set(scenes)];
  if (unique.length < 6) {
    throw new Error('hanya ' + unique.length + ' karakter gerak (' + unique.join(', ')
      + ') — OWNER meminta geraknya berubah tergantung menu, bukan satu animasi untuk semua');
  }
  if (!/PAGE_SCENES\s*=/.test(BUBBLE)) throw new Error('tidak ada peta halaman ke karakter gerak');
  // Dibatasi ke blok PAGE_SCENES saja; membaca lebih jauh akan menyeret string lain di
  // berkas ini dan melaporkan karakter gerak yang tidak pernah ada.
  const scenesBlock = BUBBLE.slice(BUBBLE.indexOf('PAGE_SCENES'), BUBBLE.indexOf('PAGE_LINES'));
  const mapped = [...scenesBlock.matchAll(/:\s*'([a-z]+)'/g)].map((m) => m[1]);
  const missing = [...new Set(mapped)].filter((s) => !unique.includes(s));
  if (missing.length) {
    throw new Error('halaman dipetakan ke karakter yang tidak punya gerak di CSS: ' + missing.join(', '));
  }
});

test('setiap halaman punya karakter gerak, tidak ada yang mati diam-diam', () => {
  const valid = ['home', 'vocab', 'grammar', 'reading', 'skills', 'listening', 'speaking',
    'writing', 'test', 'progress', 'classroom', 'library', 'ask', 'search'];
  const block = BUBBLE.slice(BUBBLE.indexOf('PAGE_SCENES'), BUBBLE.indexOf('PAGE_LINES'));
  const missing = valid.filter((v) => !new RegExp('(^|[\\s{,])' + v + '\\s*:').test(block));
  if (missing.length) {
    throw new Error('halaman tanpa karakter gerak: ' + missing.join(', ')
      + ' — halaman yang tidak terdaftar jatuh ke default, dan default yang tidak disengaja '
      + 'adalah cara maskot ini kehilangan pendapatnya satu per satu');
  }
});

test('geraknya terkendali: amplitudo kecil, durasi panjang', () => {
  // Bagian "eksklusif" yang bisa diukur. Yang dijaga bukan angka spesifik, melainkan
  // bahwa tidak ada yang menaikkannya diam-diam supaya "lebih kelihatan".
  const paw = CSS.slice(CSS.indexOf('PAW — gerak per halaman'));
  const loud = [];
  for (const m of paw.matchAll(/@keyframes\s+fzPaw\w+\{([^@]*?)\}\s*\n/g)) {
    for (const s of m[1].matchAll(/scale[XY]?\(([\d.]+)\)/g)) {
      if (Math.abs(Number(s[1]) - 1) > 0.25) loud.push('scale ' + s[1]);
    }
    for (const t of m[1].matchAll(/translateY\((-?[\d.]+)px\)/g)) {
      if (Math.abs(Number(t[1])) > 1.6) loud.push('translateY ' + t[1] + 'px');
    }
  }
  if (loud.length) throw new Error('amplitudo terlalu besar: ' + loud.join(', '));

  const fast = [...paw.matchAll(/animation:\s*fzPaw\w+\s+([\d.]+)s/g)]
    .map((m) => Number(m[1])).filter((d) => d < 2.5 && d > 0.9);
  if (fast.length) throw new Error('durasi terlalu pendek: ' + fast.join('s, ') + 's — gerak cepat menarik perhatian ke dirinya sendiri');
});

test('halaman tes sengaja nyaris diam', () => {
  if (!/\[data-fz-scene="test"\]\s*\.fz-paw-bar\{animation:none\}/.test(CSS)) {
    throw new Error('balok masih bergerak di halaman tes; saat murid diukur, maskot yang bergerak adalah gangguan');
  }
});

test('gerak mati sepenuhnya bila murid memintanya', () => {
  if (!/prefers-reduced-motion:reduce\)\{\s*\.fz-paw,\.fz-paw-bar\{animation:none !important\}/.test(CSS)) {
    throw new Error('prefers-reduced-motion tidak dihormati');
  }
  // Dan tidak boleh ada state yang HANYA bisa dibedakan lewat gerak.
  if (!/\.fz-coach-dot\{/.test(CSS)) throw new Error('titik notifikasi hilang; tanpa itu notifikasi hanya terbaca lewat gerak');
});

test('tiap balok berputar dari alasnya sendiri', () => {
  // Tanpa transform-box:fill-box, transform-origin dihitung terhadap viewBox dan keempat
  // balok bergerak seperti satu papan - persis yang membuat animasi SVG terlihat kaku.
  if (!/\.fz-paw-bar\{transform-box:fill-box;transform-origin:50% 100%\}/.test(CSS)) {
    throw new Error('balok tidak berputar dari alasnya; geraknya akan terbaca sebagai satu papan');
  }
});

test('warna PAW tidak dipaku di dalam ikon', () => {
  const block = ICONS.slice(ICONS.indexOf("paw:"), ICONS.indexOf("/* Tab bar */"));
  if (/#[0-9a-f]{3,6}/i.test(block)) throw new Error('ada warna mati di dalam ikon paw; mode gelap tidak akan mengikutinya');
  if (!/\.fz-paw-bar,\.fz-i \.fz-paw-pad\{fill:var\(--fz-i-line/.test(CSS)) {
    throw new Error('PAW tidak mengambil warna dari --fz-i-line');
  }
});

console.log('');
if (failures.length) {
  console.log('FIEZEL maskot PAW: FAIL (' + failures.length + ')');
  process.exit(1);
}
console.log('FIEZEL maskot PAW: PASS ' + pass);
