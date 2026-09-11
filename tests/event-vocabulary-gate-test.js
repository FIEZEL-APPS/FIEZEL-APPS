#!/usr/bin/env node
/**
 * Gerbang kosakata event react() untuk redesign maskot PAW.
 *
 * Bug yang melahirkan gerbang ini nyata: app.js pernah memanggil
 * pawReact('correct-streak') — event yang TIDAK PERNAH ada di switch react().
 * Komponen menjawabnya dengan console.warn lalu diam. Tidak ada yang gagal,
 * tidak ada yang bergerak, dan tidak ada tes yang melihatnya — event mati diam-
 * diam adalah cara maskot kehilangan reaksinya satu per satu (spec §35 "New
 * regression nets"; A-2). Call site-nya sudah diperbaiki (P0-3); gerbang ini
 * memastikan kelas bugnya tidak pernah kembali.
 *
 * Sumber kebenaran kosakata BUKAN daftar tulisan tangan di tes ini — melainkan
 * label `case "…":` di switch react() milik komponen itu sendiri. Saat Wave II
 * (subagent state+event+reaksi) menambah reward/welcome-back/lesson-start/
 * level-up/milestone/speak-*, gerbang ini mengikutinya tanpa disunting. Yang
 * dijaga: SETIAP call site di app.js memakai event yang komponen kenal, dan
 * setiap call site bisa diaudit statis.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + ': ' + e.message); }
}

const MASCOT = read('features/mascot/fiezel-character.js');
const APP = read('app.js');

/** Kosakata = kunci peta TARGET di komponen karakter.
 *
 *  m025-303: dulu kosakata dibaca sebagai label `case "x":` di dalam switch
 *  react(). Komponen Nusa & Mira menyimpannya sebagai PETA OBJEK (TARGET), bukan
 *  switch — bentuk kodenya berubah, KONTRAKNYA tidak: peta itu tetap satu-satunya
 *  tempat kosakata event hidup, dan gerbang ini tetap menuntut setiap event yang
 *  dipancarkan app.js ada di dalamnya.
 *
 *  Ambang 15 dipertahankan apa adanya, dan alasannya juga sama: kalau suatu hari
 *  strukturnya berubah lagi sehingga pemindai ini menjaring nyaris kosong,
 *  gerbangnya harus BERTERIAK, bukan diam-diam lulus dengan kosakata kosong. */
function vocabulary() {
  const start = MASCOT.indexOf('var TARGET = {');
  if (start === -1) throw new Error('peta TARGET tidak ditemukan di fiezel-character.js');
  const end = MASCOT.indexOf('};', start);
  const body = MASCOT.slice(start, end === -1 ? MASCOT.length : end);
  /* Kunci boleh ber-kutip ('speak-start') atau telanjang (correct). */
  const vocab = [...body.matchAll(/(?:^|[{,])\s*'([\w-]+)'\s*:/g)].map((m) => m[1])
    .concat([...body.matchAll(/(?:^|[{,])\s*([A-Za-z_]\w*)\s*:/g)].map((m) => m[1]));
  const uniq = [...new Set(vocab)];
  if (uniq.length < 15) {
    throw new Error('hanya ' + uniq.length + ' event terbaca dari peta TARGET react() — '
      + 'strukturnya berubah dan gerbang ini buta');
  }
  return new Set(uniq);
}


/** Benar-benar kode, bukan komentar? app.js menulis komentar panjang yang ikut
 *  menyebut pawReact (mis. "…lewat corong pawReact (gerbang…)" di dekat 'wake') —
 *  saat porting, pemindai naif menjaring baris itu sebagai call site tak
 *  teraudit. Dua pemeriksaan murah dan deterministik: di dalam blok komentar
 *  (/* terakhir belum ditutup), atau di belakang // pada baris yang sama
 *  (dengan :// milik URL dikecualikan). */
function inComment(src, at) {
  const before = src.slice(0, at);
  if (before.lastIndexOf('/*') > before.lastIndexOf('*/')) return true;
  const line = before.slice(before.lastIndexOf('\n') + 1);
  return /(^|[^:])\/\//.test(line);
}

/** Semua call site pawReact(...) di app.js, tanpa definisi fungsinya sendiri.
 *  Argumen diambil sadar-kurung; regex sampai ')' pertama akan salah begitu
 *  ada detail objek atau ternary bersarang. */
function callSites() {
  const sites = [];
  const re = /pawReact\s*\(/g;
  let m;
  while ((m = re.exec(APP))) {
    const before = APP.slice(Math.max(0, m.index - 12), m.index);
    if (/function\s+$/.test(before)) continue; // definisi wrapper, bukan call site
    if (inComment(APP, m.index)) continue;      // prosa, bukan kode
    let depth = 1, i = re.lastIndex;
    while (i < APP.length && depth) {
      if (APP[i] === '(') depth++;
      else if (APP[i] === ')') depth--;
      i++;
    }
    const line = APP.slice(0, m.index).split('\n').length;
    sites.push({ line, args: APP.slice(re.lastIndex, i - 1) });
  }
  return sites;
}

/** Literal event di posisi event: string di argumen PERTAMA, minus operand
 *  pembanding. `domain==='listening'?'listening-start':…` — 'listening' adalah
 *  pembanding (didahului =), bukan event; dua lainnya event. */
function eventLiterals(args) {
  let depth = 0, cut = args.length;
  for (let i = 0; i < args.length; i++) {
    if ('([{'.includes(args[i])) depth++;
    else if (')]}'.includes(args[i])) depth--;
    else if (args[i] === ',' && !depth) { cut = i; break; }
  }
  const first = args.slice(0, cut);
  const out = [];
  for (const m of first.matchAll(/'([\w-]+)'/g)) {
    const prev = first.slice(0, m.index).replace(/\s+$/, '').slice(-1);
    if (prev === '=' || prev === '!' || prev === '<' || prev === '>') continue;
    out.push(m[1]);
  }
  return out;
}

test('react() masih memperingatkan event tak dikenal, bukan diam', () => {
  /* m025-303: dulu dicari sebagai `default: console.warn` di switch. Komponen
     Nusa & Mira memakai peta objek, jadi cabang "tak dikenal" adalah penjaga
     `if (!tgt)`. Yang dituntut gerbang ini TIDAK berubah: cabang itu wajib
     berteriak, bukan diam. */
  const start = MASCOT.indexOf('El.prototype.react');
  if (start === -1) throw new Error('metode react() tidak ditemukan di fiezel-character.js');
  const end = MASCOT.indexOf('El.prototype.applyFace', start);
  const body = MASCOT.slice(start, end === -1 ? MASCOT.length : end);
  if (!/if\s*\(!tgt\)[\s\S]{0,600}?console\.warn/.test(body)) {
    throw new Error('cabang event tak dikenal di react() tidak memanggil console.warn — '
      + 'tanpa peringatan, event mati berikutnya juga akan mati diam-diam');
  }
});

test('app.js hanya bicara ke maskot lewat corong pawReact', () => {
  // Call site .react() langsung lolos dari gerbang ini DAN dari pawMotionAllowed().
  // Satu-satunya yang sah: baris definisi wrapper-nya sendiri.
  const bad = APP.split('\n')
    .map((line, i) => ({ line, no: i + 1 }))
    .filter((x) => /FiezelPaw\??\.react/.test(x.line) && !/function pawReact\(/.test(x.line));
  if (bad.length) {
    throw new Error('panggilan .react() langsung di luar wrapper pawReact (baris '
      + bad.map((x) => x.no).join(', ')
      + ') — jalur itu melompati pawMotionAllowed() dan audit kosakata');
  }
});

test('setiap call site bisa diaudit: event-nya literal, bukan variabel lepas', () => {
  const sites = callSites();
  if (!sites.length) throw new Error('nol call site pawReact terbaca — pemindainya buta');
  const blind = sites.filter((s) => !eventLiterals(s.args).length);
  if (blind.length) {
    throw new Error('call site tanpa literal event (tak teraudit statis): baris '
      + blind.map((s) => s.line).join(', ')
      + " — tulis event-nya sebagai literal ('correct') atau ternary literal");
  }
});

test('semua event yang dipakai app.js ada di kosakata react()', () => {
  const vocab = vocabulary();
  const unknown = [];
  for (const s of callSites()) {
    for (const evt of eventLiterals(s.args)) {
      if (!vocab.has(evt)) unknown.push("'" + evt + "' (baris " + s.line + ')');
    }
  }
  if (unknown.length) {
    throw new Error('event di luar kosakata: ' + unknown.join(', ')
      + ' — komponen hanya akan console.warn lalu diam; inilah kelas bug correct-streak (A-2)');
  }
});

console.log('');
if (failures.length) {
  console.log('FIEZEL gerbang kosakata event: FAIL (' + failures.length + ')');
  process.exit(1);
}
console.log('FIEZEL gerbang kosakata event: PASS ' + pass);
