#!/usr/bin/env node
/**
 * Gerbang SENI KARAKTER NUSA & MIRA (m025-303).
 *
 * Berkas ini MENGGANTIKAN tiga gerbang yang dulu menjaga rig SVG PAW dan terangkat
 * bersamanya. Yang diwarisi bukan kodenya melainkan jaminannya, dan itu ditulis di
 * sini supaya perpindahan ini tidak pernah terbaca sebagai kelonggaran:
 *
 *   e5-checksum-gate-test      -> "satu sumber bentuk". Dulu: hash rig kanonik +
 *     manifest ekspor. Kini: peta state->seni dan warna moncong WAJIB hasil
 *     generate yang segar dari assets/characters/. Berkas yang disunting tangan
 *     atau basi terhadap asetnya memerahkan gerbang ini.
 *
 *   mascot-reduced-motion-test -> "setiap state punya bingkai statis". Dulu peta
 *     state->ekspresi. Kini lebih kuat: setiap state MEMANG bingkai statis, dan
 *     yang dituntut adalah kelengkapan peta (19 state, nol lubang) plus blok
 *     kurangi-gerak yang benar-benar mematikan animasi.
 *
 *   keyframe-rotation-gate     -> "tubuh tidak diputar". Aturan itu lahir karena
 *     memutar tubuh rig vektor merusak pivot anggota badannya. Seni gambar tidak
 *     punya pivot, jadi aturannya tidak bisa dipindahkan apa adanya; yang
 *     dipindahkan adalah maksudnya — gerak harus KECIL dan tertahan.
 *
 * Ditambah satu jaminan yang tidak punya pendahulu, karena cacatnya baru mungkin
 * ada di sistem gambar: setiap berkas seni yang ditunjuk peta harus BENAR-BENAR
 * ADA di disk dan ikut di-precache. Rig SVG inline tidak bisa 404; gambar bisa,
 * dan murid luring akan melihat lubang di tempat karakternya.
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

const COMP = 'features/mascot/fiezel-character.js';
const CSS = 'features/mascot/fiezel-character.css';
const TABLE = 'features/mascot/fiezel-character-art.js';

/** Memuat tabel seni hasil generate di luar DOM. */
function loadArt() {
  const sandbox = { self: {} };
  require('vm').runInNewContext(read(TABLE), sandbox, { filename: TABLE });
  const A = sandbox.self.FiezelCharacterArt;
  if (!A) throw new Error(TABLE + ' tidak memasang self.FiezelCharacterArt');
  return A;
}

/** 19 state dari komponen — sumbernya komponen, bukan daftar kedua di gerbang ini. */
function statesFromComponent() {
  const src = read(COMP);
  const m = /var STATES = \[([\s\S]*?)\];/.exec(src);
  if (!m) throw new Error('daftar STATES tidak ditemukan di ' + COMP);
  return [...m[1].matchAll(/'([\w-]+)'/g)].map((x) => x[1]);
}

/* ---------- 1. satu sumber bentuk: hasil generate wajib segar ---------- */

test('peta state->seni adalah hasil generate yang segar dari manifest', () => {
  const r = spawnSync(process.execPath,
    [path.join(__fzRoot, 'tools/gen-character-art-table.mjs'), '--check'],
    { cwd: __fzRoot, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(((r.stdout || '') + (r.stderr || '')).trim()
      + '\n      Perbaikannya SELALU sama: jalankan `node tools/gen-character-art-table.mjs`, '
      + 'jangan menyunting tabelnya dengan tangan.');
  }
});

test('warna moncong adalah hasil UKUR dari aset, bukan angka tulisan tangan', () => {
  const r = spawnSync('python3',
    [path.join(__fzRoot, 'tools/sample-muzzle.py'), '--check'],
    { cwd: __fzRoot, encoding: 'utf8' });
  if (r.error && r.error.code === 'ENOENT') {
    console.log('     (python3 tidak ada di lingkungan ini — pemeriksaan kesegaran dilewati,'
      + ' tetapi keberadaan berkasnya tetap dituntut di bawah)');
    if (!exists('assets/characters/muzzle.json')) throw new Error('assets/characters/muzzle.json tidak ada');
    return;
  }
  if (r.status !== 0) {
    throw new Error(((r.stdout || '') + (r.stderr || '')).trim()
      + '\n      Jalankan: python3 tools/sample-muzzle.py');
  }
});

test('tabel seni tidak menyebut satu pun warna yang ditulis tangan', () => {
  /* Setiap hex di tabel WAJIB berasal dari muzzle.json. Kalau ada yang lain, ia
     lahir dari tangan seseorang dan akan menyimpang dari seninya diam-diam. */
  const diukur = new Set(Object.values(JSON.parse(read('assets/characters/muzzle.json')).warna)
    .map((v) => v.hex.toUpperCase()));
  const dipakai = [...read(TABLE).matchAll(/#([0-9a-fA-F]{6})\b/g)].map((m) => ('#' + m[1]).toUpperCase());
  const liar = [...new Set(dipakai)].filter((h) => !diukur.has(h));
  if (liar.length) throw new Error(liar.join(', ') + ' — tidak ada di assets/characters/muzzle.json');
});

/* ---------- 2. kelengkapan: 19 state, nol lubang ---------- */

test('setiap state komponen punya seni — tidak ada state yang tampil kosong', () => {
  const A = loadArt();
  const states = statesFromComponent();
  if (states.length < 19) throw new Error('hanya ' + states.length + ' state terbaca — pemindainya patah');
  const lubang = states.filter((s) => !A.forState(s));
  if (lubang.length) throw new Error(lubang.join(', ') + ' — state tanpa seni');
  const lebih = A.states.filter((s) => states.indexOf(s) < 0);
  if (lebih.length) throw new Error(lebih.join(', ') + ' — seni untuk state yang tidak ada di komponen');
});

test('state yang hidup lama punya frame kedip — karakter tidak membeku', () => {
  const A = loadArt();
  /* idle/listening/speaking/greeting bisa bertahan puluhan detik di layar. Tanpa
     kedip, karakternya terbaca sebagai stiker yang ditempel, bukan makhluk. */
  const wajib = ['idle', 'listening', 'speaking', 'greeting'];
  const tanpa = wajib.filter((s) => !(A.forState(s) || {}).blink);
  if (tanpa.length) throw new Error(tanpa.join(', ') + ' — state hidup-lama tanpa frame kedip');
});

test('setiap berkas seni yang ditunjuk peta benar-benar ada di disk', () => {
  const A = loadArt();
  const hilang = [];
  for (const s of A.states) {
    const a = A.forState(s);
    if (!exists(a.src)) hilang.push(s + ' -> ' + a.src);
    if (a.blink && !exists(a.blink)) hilang.push(s + ' (kedip) -> ' + a.blink);
  }
  if (hilang.length) throw new Error('\n      ' + hilang.join('\n      '));
});

test('seni yang dipakai ikut di-precache — murid luring tidak melihat lubang', () => {
  const A = loadArt();
  const sw = read('sw.js');
  const luput = [];
  for (const s of A.states) {
    const a = A.forState(s);
    if (sw.indexOf("'./" + a.src + "'") < 0) luput.push(s + ' -> ' + a.src);
    if (a.blink && sw.indexOf("'./" + a.blink + "'") < 0) luput.push(s + ' (kedip) -> ' + a.blink);
  }
  if (luput.length) {
    throw new Error('\n      ' + luput.join('\n      ')
      + '\n      — tidak ada di ASSETS sw.js. Rig SVG lama tidak bisa 404; gambar bisa.');
  }
});

/* ---------- 3. shell dan pemuatan ---------- */

test('komponen dan tabelnya dimuat index.html dengan urutan yang benar', () => {
  const html = read('index.html');
  const iTable = html.indexOf('features/mascot/fiezel-character-art.js');
  const iComp = html.indexOf('features/mascot/fiezel-character.js');
  const iCss = html.indexOf('features/mascot/fiezel-character.css');
  if (iTable === -1) throw new Error('fiezel-character-art.js tidak dimuat index.html');
  if (iComp === -1) throw new Error('fiezel-character.js tidak dimuat index.html');
  if (iCss === -1) throw new Error('fiezel-character.css tidak ditautkan index.html');
  if (iTable > iComp) {
    throw new Error('tabel seni dimuat SESUDAH komponen — komponen membacanya saat define, '
      + 'jadi urutan ini membuat setiap state jatuh ke seni kosong');
  }
});

test('rig PAW benar-benar pergi — tidak ada rujukan tersisa di shell', () => {
  const sisa = [];
  for (const f of ['index.html', 'sw.js']) {
    const src = read(f);
    for (const mati of ['fiezel-mascot.js', 'fiezel-motion.css', 'fiezel-paw-outfit.js']) {
      if (src.indexOf('/' + mati) >= 0) sisa.push(f + ' -> ' + mati);
    }
  }
  if (sisa.length) throw new Error(sisa.join(', ') + ' — berkas ini sudah dihapus; rujukannya akan 404');
});

/* ---------- 4. gerak: kecil, tertahan, dan bisa dimatikan ---------- */

test('kurangi-gerak benar-benar mematikan animasi, transisi, dan kedip', () => {
  const css = read(CSS);
  const blok = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  if (!blok) throw new Error('blok prefers-reduced-motion tidak ada di ' + CSS);
  if (!/animation:\s*none\s*!important/.test(blok)) throw new Error('animation tidak dimatikan di blok kurangi-gerak');
  if (!/transition:\s*none\s*!important/.test(blok)) throw new Error('transition tidak dimatikan di blok kurangi-gerak');
  const comp = read(COMP);
  if (!/_blink[\s\S]{0,400}?reducedMotion\(\)/.test(comp) && !/reducedMotion\(\)[\s\S]{0,200}?return/.test(comp)) {
    throw new Error('kedip tidak menghormati kurangi-gerak di ' + COMP
      + ' — CSS saja tidak cukup, kedip ditukar dari JavaScript');
  }
});

test('gerak karakter tertahan: amplitudo kecil, durasi tidak kilat', () => {
  const css = read(CSS);
  /* Warisan maksud keyframe-rotation-gate: yang dijaga bukan "tanpa rotasi"
     (seni gambar tidak punya pivot yang bisa rusak) melainkan bahwa geraknya
     tidak pernah menjadi guncangan. Angka di bawah sengaja longgar — yang
     ditangkap adalah kesalahan besar, bukan selera. */
  for (const m of css.matchAll(/rotate\((-?[\d.]+)deg\)/g)) {
    if (Math.abs(Number(m[1])) > 8) throw new Error('rotasi ' + m[1] + 'deg terlalu besar untuk karakter');
  }
  for (const m of css.matchAll(/scale\(([\d.]+)\)/g)) {
    const v = Number(m[1]);
    if (v > 1.2 || v < 0.85) throw new Error('skala ' + v + ' terlalu ekstrem untuk karakter');
  }
  for (const m of css.matchAll(/animation:\s*fzChar\w+\s+([\d.]+)s/g)) {
    if (Number(m[1]) < 0.2) throw new Error('durasi animasi ' + m[1] + 's terlalu kilat — terbaca sebagai kedutan');
  }
});

test('karakter tetap hiasan: aria-hidden dan alt kosong', () => {
  const comp = read(COMP);
  if (!/setAttribute\('aria-hidden', 'true'\)/.test(comp)) {
    throw new Error('elemen tidak menyetel aria-hidden — karakter hiasan tidak boleh dibaca pembaca layar');
  }
  if (!/_img\.alt = ''/.test(comp)) throw new Error('gambar karakter tidak ber-alt kosong');
});

console.log('\nFIEZEL gerbang seni karakter: ' + (failures.length ? 'FAIL (' + failures.length + ')' : 'PASS ' + pass));
process.exit(failures.length ? 1 : 0);
