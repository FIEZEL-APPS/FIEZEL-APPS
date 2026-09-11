#!/usr/bin/env node
/**
 * Gerbang SISTEM KARAKTER MEREK (assets/brand/character-system/).
 *
 * Yang dijaga di sini BUKAN selera, melainkan empat janji yang kalau patah
 * membuat pustaka ini berhenti jadi satu sistem dan berubah jadi 64 gambar lepas:
 *
 *  1. SATU SUMBER BENTUK. Setiap berkas adalah hasil generate dari rig
 *     features/mascot/fiezel-mascot.js (aturan E5/G11). Gerbang menjalankan
 *     `node tools/export-character-system.mjs --check`: kalau rig, glyph telapak,
 *     atau pustaka prop berubah tanpa regenerasi, ia MERAH. Aset yang disunting
 *     tangan juga merah, dan memang itu maksudnya.
 *  2. GLYPH TELAPAK ADALAH GLYPH MEREK. Lencana tidak boleh membawa telapak
 *     gambar sendiri: setiap koordinatnya wajib cocok byte-demi-byte dengan
 *     assets/brand/fiezel-paw.svg. Ini pasangan tests/pawprint-geometry-gate-test.js
 *     untuk jalur lencana.
 *  3. SATU BAHASA BENTUK. Palet tertutup G1 (dijaga juga oleh
 *     tests/palette-gate-test.js lewat SVG_DIRS), tanpa gradien, filter, raster,
 *     atau <style> — semuanya hal yang membuat aset berhenti jadi vektor yang
 *     bisa diwarnai ulang dan dianimasi.
 *  4. SATU KONTRAK BINGKAI. Ekspresi, pose, prop, badge, dan adegan masing-masing
 *     punya viewBox tetap, dan setiap adegan memuat karakter + aria-label.
 *     Kit yang bingkainya berbeda-beda tidak bisa ditumpuk di Figma maupun
 *     di-crossfade di Lottie.
 *
 * Yang SENGAJA tidak dijaga: apakah aset ini dikapalkan. Ia memang TIDAK —
 * pustaka ini sumber desain (Figma/Lottie/materi), bukan aset runtime; tidak ada
 * di index.html maupun ASSETS sw.js, jadi tidak ada ritual bump build. Gerbang
 * memeriksa justru fakta itu, supaya kalau suatu hari ia naik ke shell, keputusan
 * itu lewat orang, bukan lewat diam.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const read = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(__fzRoot, f));

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + ': ' + e.message); }
}

const DIR = 'assets/brand/character-system';
const MANIFEST = DIR + '/character-system.json';
const TOOL = 'tools/export-character-system.mjs';
const CONTACT = 'mockups/character-system.html';

function daftarSvg() {
  const out = [];
  (function sapu(d) {
    for (const e of fs.readdirSync(path.join(__fzRoot, d), { withFileTypes: true })) {
      const rel = d + '/' + e.name;
      if (e.isDirectory()) { sapu(rel); continue; }
      if (e.name.endsWith('.svg')) out.push(rel);
    }
  })(DIR);
  return out.sort();
}

/* ---------- 1. satu sumber bentuk ---------- */

test('pustaka ada dan lengkap (master + ekspresi + pose + prop + badge + kit)', () => {
  if (!exists(MANIFEST)) throw new Error(MANIFEST + ' tidak ada — jalankan: node ' + TOOL);
  const man = JSON.parse(read(MANIFEST));
  const r = man.ringkasan || {};
  const minimal = { master: 1, expressions: 14, poses: 16, props: 12, badge: 4, illustrations: 17 };
  for (const [k, n] of Object.entries(minimal)) {
    if (!(r[k] >= n)) throw new Error('ringkasan.' + k + ' = ' + r[k] + ', minimal ' + n);
  }
  const disk = daftarSvg();
  const terdaftar = Object.keys(man.files || {}).filter((f) => f.endsWith('.svg'));
  const yatim = disk.filter((f) => !terdaftar.includes(f));
  if (yatim.length) {
    throw new Error(yatim.join(', ') + ' — ada di disk tetapi tidak di manifest. '
      + 'Berkas yang tidak lahir dari pipeline tidak punya sumber, dan itu persis '
      + 'cara sistem karakter mulai menyimpang.');
  }
});

test('hasil generate segar: --check pipeline sistem karakter hijau', () => {
  const r = spawnSync(process.execPath, [path.join(__fzRoot, TOOL), '--check'],
    { cwd: __fzRoot, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error('`node ' + TOOL + ' --check` keluar ' + r.status + '\n      '
      + ((r.stdout || '') + (r.stderr || '')).trim().split('\n').join('\n      ')
      + '\n      Perbaikannya SELALU sama: jalankan `node ' + TOOL + '`, jangan menyunting SVG.');
  }
});

test('setiap SVG menyatakan dirinya hasil generate', () => {
  const liar = daftarSvg().filter((f) => !/HASIL GENERATE/.test(read(f)));
  if (liar.length) throw new Error(liar.join(', ') + ' — tanpa catatan kepala hasil generate');
});

/* ---------- 2. glyph telapak adalah glyph merek ---------- */

test('badge memakai glyph telapak merek, bukan gambar sendiri', () => {
  const m = /<g fill="[^"]*">([\s\S]*?)<\/g>/.exec(read('assets/brand/fiezel-paw.svg'));
  if (!m) throw new Error('assets/brand/fiezel-paw.svg: grup glyph tidak ditemukan');
  const kanon = m[1].trim().split('\n').map((l) => l.trim()).filter(Boolean);
  const badges = daftarSvg().filter((f) => f.includes('/badge/'));
  if (!badges.length) throw new Error('tidak ada berkas badge');
  for (const f of badges) {
    const src = read(f);
    for (const bentuk of kanon) {
      // bentuk disalin apa adanya; hanya indentasi yang boleh berbeda
      if (src.indexOf(bentuk) === -1) {
        throw new Error(f + ': bentuk telapak menyimpang dari fiezel-paw.svg — "'
          + bentuk.slice(0, 46) + '…" tidak ada');
      }
    }
  }
});

test('badge: kotak dan skala glyph identik di semua varian (bisa ditumpuk presisi)', () => {
  const badges = daftarSvg().filter((f) => f.includes('/badge/'));
  const kotak = new Set(), skala = new Set();
  for (const f of badges) {
    const src = read(f);
    kotak.add((/viewBox="([^"]*)"/.exec(src) || [])[1]);
    skala.add((/class="fz-badge-glyph"[^>]*transform="([^"]*)"/.exec(src) || [])[1]);
  }
  if (kotak.size !== 1) throw new Error('viewBox badge tidak seragam: ' + [...kotak].join(' | '));
  if (skala.size !== 1) throw new Error('penempatan glyph badge tidak seragam: ' + [...skala].join(' | '));
});

/* ---------- 3. satu bahasa bentuk ---------- */

test('tidak ada gradien, filter, raster, atau <style> di seluruh pustaka', () => {
  const larangan = [
    [/<linearGradient|<radialGradient|url\(#[^)]*[Gg]radient/, 'gradien'],
    [/<filter|filter="/, 'filter'],
    [/<image\b|data:image\//, 'raster tertanam'],
    [/<style\b/, '<style> (aset harus bisa diwarnai konsumennya)'],
    [/<script\b/, '<script>'],
  ];
  const drift = [];
  for (const f of daftarSvg()) {
    const src = read(f);
    for (const [re, apa] of larangan) if (re.test(src)) drift.push(f + ': ' + apa);
  }
  if (drift.length) throw new Error('\n      ' + drift.join('\n      '));
});

test('setiap aset punya aria-label dan role="img"', () => {
  const drift = [];
  for (const f of daftarSvg()) {
    const src = read(f);
    if (!/role="img"/.test(src)) drift.push(f + ': role="img" hilang');
    if (!/aria-label="[^"]+"/.test(src)) drift.push(f + ': aria-label kosong/hilang');
  }
  if (drift.length) throw new Error('\n      ' + drift.join('\n      '));
});

/* ---------- 4. satu kontrak bingkai ---------- */

test('bingkai seragam per kelompok (ekspresi/pose/prop/badge/adegan)', () => {
  const harap = {
    '/expressions/': '22 -22 276 244',
    '/poses/': '0 -32 320 332',
    '/props/': '0 0 100 100',
    '/badge/': '0 0 96 96',
    '/illustrations/': '0 0 480 360',
  };
  const drift = [];
  for (const f of daftarSvg()) {
    const pre = Object.keys(harap).find((k) => f.includes(k));
    if (!pre) continue;
    const vb = (/viewBox="([^"]*)"/.exec(read(f)) || [])[1];
    if (vb !== harap[pre]) drift.push(f + ': viewBox "' + vb + '", seharusnya "' + harap[pre] + '"');
  }
  if (drift.length) throw new Error('\n      ' + drift.join('\n      '));
});

test('setiap adegan memuat karakter, dan badge tidak pernah menutupi karakter', () => {
  const adegan = daftarSvg().filter((f) => f.includes('/illustrations/'));
  if (!adegan.length) throw new Error('kit ilustrasi kosong');
  const drift = [];
  for (const f of adegan) {
    const src = read(f);
    if (!/class="fz-scene-pau"/.test(src)) { drift.push(f + ': tanpa karakter'); continue; }
    if (!/class="fz-head"/.test(src)) drift.push(f + ': karakter tanpa kepala (pohon rig terpotong)');
    const b = /class="fz-scene-badge" transform="translate\((\d+),(\d+)\)/.exec(src);
    if (b && Number(b[1]) < 320) {
      drift.push(f + ': badge di x=' + b[1] + ' — masuk kolom karakter (x<320), '
        + 'aturan kit: badge selalu di pojok kanan atas');
    }
  }
  if (drift.length) throw new Error('\n      ' + drift.join('\n      '));
});

test('kelompok adegan menutup lima keadaan UI yang dijanjikan', () => {
  const man = JSON.parse(read(MANIFEST));
  const grup = new Set((man.adegan || []).map((a) => a.grup));
  for (const g of ['empty', 'success', 'error', 'onboarding', 'marketing']) {
    if (!grup.has(g)) throw new Error('kit ilustrasi tidak punya adegan kelompok "' + g + '"');
  }
});

/* ---------- 5. pustaka desain, bukan aset runtime ---------- */

test('pustaka tidak diam-diam dikapalkan (kalau naik, itu keputusan orang)', () => {
  const bersih = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/(^|[\s;{}])\/\/[^\n]*/g, '$1 ');
  const shell = bersih(read('index.html')) + bersih(read('sw.js'));
  if (shell.indexOf('brand/character-system') >= 0) {
    throw new Error('assets/brand/character-system/ disebut index.html atau sw.js. '
      + 'Itu boleh — tetapi begitu murid mengunduhnya, ia ikut ritual rilis: daftarkan '
      + 'di ASSETS sw.js DAN naikkan FIEZEL_PAGE_BUILD/DIAG_BUILD/SW_REV bersama, lalu '
      + 'perbarui gerbang ini menjadi pemeriksaan precache, bukan pemeriksaan "tidak ada".');
  }
});

test('lembar kontak hanya menunjuk berkas yang benar-benar ada', () => {
  if (!exists(CONTACT)) throw new Error(CONTACT + ' tidak ada — jalankan: node ' + TOOL);
  const html = read(CONTACT);
  const hilang = [...html.matchAll(/src="\.\.\/([^"]+)"/g)]
    .map((m) => m[1]).filter((f) => !exists(f));
  if (hilang.length) throw new Error(hilang.join(', ') + ' — dirujuk lembar kontak tetapi tidak ada');
  const disk = daftarSvg();
  const dirujuk = new Set([...html.matchAll(/src="\.\.\/([^"]+)"/g)].map((m) => m[1]));
  const tak = disk.filter((f) => !dirujuk.has(f));
  if (tak.length) throw new Error(tak.join(', ') + ' — ada di pustaka tetapi tidak tampil di lembar kontak');
});

console.log('\nFIEZEL gerbang sistem karakter: ' + (failures.length ? 'FAIL (' + failures.length + ')' : 'PASS ' + pass));
process.exit(failures.length ? 1 : 0);
