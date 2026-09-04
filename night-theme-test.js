#!/usr/bin/env node
/**
 * m025-246 — GERBANG TEMA MALAM.
 *
 * OWNER: "Tema Malam: pakai token --core* yang sudah ada, hormati prefers-color-scheme."
 *
 * RIWAYAT YANG MEMBUAT GERBANG INI PERLU. Mode gelap di FIEZEL sudah pernah dibuat, sudah
 * pernah rusak, dan sudah pernah dihapus:
 *   m025-120  OWNER: "MODE GELAP ATAU TIDAK GELAP TIDAK BERFUNGSI DI APLIKASI."
 *   m025-134  Mode gelap dicabut seluruhnya; pastel-field-contrast-test.js dipasang untuk
 *             menjaga keadaan itu.
 *   m025-246  OWNER membalikkannya, dengan dua syarat teknis yang eksplisit di atas.
 *
 * Yang RUSAK pada percobaan pertama bisa disebut persis: puluhan permukaan memaku warnanya
 * sendiri (#fff, #f6f4ed) sementara teks di atasnya memakai var(--text), jadi "gelap"
 * berarti tinta terang di atas bidang putih — 1,08:1. Gerbang ini menjaga agar percobaan
 * kedua tidak mengulanginya, dengan memeriksa hal-hal yang kalau dilanggar akan dilanggar
 * diam-diam:
 *
 *   T1  Dua pintu aktivasi (media query + atribut) berisi daftar token yang IDENTIK. CSS
 *       tidak bisa menggabungkan @media dan selektor atribut dalam satu aturan, jadi
 *       daftarnya memang ditulis dua kali — dan dua salinan yang menyimpang berarti murid
 *       yang MEMILIH malam mendapat palet yang berbeda dari murid yang perangkatnya malam.
 *   T2  Pintu media query dibatasi :not([data-theme="light"]). Tanpa itu, murid yang
 *       memilih terang di ponsel bertema gelap tetap mendapat malam — sakelar yang tidak
 *       melakukan apa-apa, persis keluhan m025-120.
 *   T3  Palet malam turun dari keluarga --core* yang sudah ada, bukan palet gelap kedua.
 *   T4  index.html tidak memaku data-theme="light" di <html>. Nilai statis itu menang atas
 *       @media selamanya, jadi Tema Malam tidak akan pernah menyala untuk siapa pun.
 *   T5  Kontras tinta terhadap bidang malam memenuhi WCAG AA (4,5:1 teks, 3:1 batas besar).
 *   T6  Pengelola tema punya tiga keadaan, dan 'system' benar-benar MENGHAPUS atributnya.
 *
 * Konvensi rumah: tanpa dependensi, exit 1 saat gagal, nama berakhiran -test.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CSS = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const INDEX = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const UI = fs.readFileSync(path.join(__dirname, 'features/ui/fiezel-ui-manager.js'), 'utf8');

let failures = 0;
function check(ok, name, detail) {
  if (ok) { console.log('ok - ' + name); return; }
  failures++;
  console.error('FAIL - ' + name + (detail ? '\n    ' + detail : ''));
}

/** Isi satu blok deklarasi CSS setelah selektor yang diberikan. */
function ruleBody(css, selector) {
  const at = css.indexOf(selector);
  if (at === -1) return '';
  const open = css.indexOf('{', at + selector.length);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) return css.slice(open + 1, i); }
  }
  return '';
}

/** Deklarasi `--x: y` sebagai peta, dengan spasi dinormalkan.
 *  Komentar DIBUANG lebih dulu: blok palet malam menulis alasannya di sebelah nilainya
 *  (`--n-panel:#2A2126; /* = --core-soft *\/`), dan komentar yang tertinggal membuat
 *  potongan BERIKUTNYA tidak lagi diawali `--` — token itu lalu hilang dari peta tanpa
 *  satu pun error, dan asersinya gagal dengan `undefined` alih-alih dengan nilai salah. */
function declarations(body) {
  const out = {};
  for (const line of String(body).replace(/\/\*[\s\S]*?\*\//g, ' ').split(';')) {
    const m = /^\s*(--[a-z0-9-]+)\s*:\s*(.+?)\s*$/i.exec(line);
    if (m) out[m[1]] = m[2].replace(/\s+/g, ' ');
  }
  return out;
}

const mediaBody = ruleBody(CSS, '@media (prefers-color-scheme:dark)');
const mediaInner = ruleBody(mediaBody, ':root:not([data-theme="light"])');
const attrInner = ruleBody(CSS, ':root[data-theme="dark"]');

/* -- T1: dua pintu, daftar identik ---------------------------------------------------- */
{
  const a = declarations(mediaInner);
  const b = declarations(attrInner);
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  check(keysA.length > 20, 'T1a pintu media query benar-benar berisi palet malam',
    'hanya ' + keysA.length + ' token');
  check(keysA.join(',') === keysB.join(','),
    'T1b kedua pintu memasang token yang sama',
    'hanya di media: ' + keysA.filter(k => !(k in b)).join(', ') +
    ' | hanya di atribut: ' + keysB.filter(k => !(k in a)).join(', '));
  const differing = keysA.filter(k => k in b && a[k] !== b[k])
    .map(k => k + ' (' + a[k] + ' vs ' + b[k] + ')');
  check(differing.length === 0,
    'T1c kedua pintu memberi NILAI yang sama untuk tiap token',
    differing.join('; '));
  check(/color-scheme\s*:\s*dark/.test(mediaInner) && /color-scheme\s*:\s*dark/.test(attrInner),
    'T1d kedua pintu menyatakan color-scheme:dark, supaya kontrol bawaan peramban ikut gelap');
}

/* -- T2: pilihan murid menang atas preferensi perangkat -------------------------------- */
{
  check(mediaInner !== '',
    'T2a pintu media query dibatasi :root:not([data-theme="light"])',
    'selektor itu tidak ditemukan di dalam @media (prefers-color-scheme:dark)');
  check(!/@media \(prefers-color-scheme:dark\)\s*\{\s*:root\s*\{/.test(CSS.replace(/\s+/g, ' ')),
    'T2b tidak ada :root telanjang di dalam @media gelap (itu akan mengabaikan pilihan murid)');
}

/* -- T3: palet malam turun dari keluarga --core* --------------------------------------- */
{
  const root = declarations(ruleBody(CSS, ':root{\n  --bg:#FFF9EE'));
  const night = declarations(CSS.slice(CSS.indexOf('--n-bg:'), CSS.indexOf('--n-scrim-soft:') + 60));
  check(String(night['--n-bg'] || '').toUpperCase() === '#1B1418',
    'T3a bidang malam = --core (#1B1418)', 'dapat: ' + night['--n-bg']);
  check(String(night['--n-panel'] || '').toUpperCase() === '#2A2126',
    'T3b permukaan malam = --core-soft (#2A2126)', 'dapat: ' + night['--n-panel']);
  check(String(night['--n-line'] || '').toUpperCase() === '#3A3038',
    'T3c garis malam = --core-line (#3A3038)', 'dapat: ' + night['--n-line']);
  check(String(night['--n-text'] || '').toUpperCase() === '#FDFAF3',
    'T3d tinta malam = --on-core (#FDFAF3)', 'dapat: ' + night['--n-text']);
  /* Keluarga --core* harus MASIH ada di :root; kalau ia dihapus, nilai di atas berhenti
     menjadi "token yang sudah ada" dan berubah jadi palet kedua yang kebetulan mirip. */
  for (const token of ['--core:', '--core-soft:', '--core-line:', '--on-core:']) {
    check(CSS.indexOf(token) !== -1, 'T3e keluarga ' + token.slice(0, -1) + ' masih hidup di :root');
  }
  void root;
}

/* -- T4: <html> tidak memaku tema ------------------------------------------------------ */
{
  const htmlTag = (/<html[^>]*>/.exec(INDEX) || [''])[0];
  check(!/data-theme=/.test(htmlTag),
    'T4a <html> tidak memaku data-theme (nilai statis akan menang atas @media selamanya)',
    'tag: ' + htmlTag);
  check(/<meta name="color-scheme" content="light dark">/.test(INDEX),
    'T4b meta color-scheme mengumumkan KEDUA skema didukung');
}

/* -- T5: kontras AA pada palet malam ---------------------------------------------------- */
{
  const rgb = (hex) => {
    const h = String(hex).replace('#', '');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  };
  const lum = (hex) => {
    const [r, g, b] = rgb(hex).map(v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const night = declarations(CSS.slice(CSS.indexOf('--n-bg:'), CSS.indexOf('--n-scrim-soft:') + 60));
  const bg = night['--n-bg'];
  const pairs = [
    ['--n-text', 4.5], ['--n-info', 4.5], ['--n-good', 4.5], ['--n-bad', 4.5]
  ];
  for (const [token, need] of pairs) {
    const value = night[token];
    if (!/^#[0-9a-f]{6}$/i.test(String(value))) { check(false, 'T5 ' + token + ' bukan hex', String(value)); continue; }
    const r = ratio(value, bg);
    check(r >= need,
      'T5 ' + token + ' >= ' + need + ':1 di atas bidang malam',
      value + ' vs ' + bg + ' = ' + r.toFixed(2) + ':1');
  }
}

/* -- T6: pengelola tema punya tiga keadaan, dan 'system' menghapus atributnya ----------- */
{
  check(/THEME_CHOICES\(\)\s*\{\s*return\s*\['system',\s*'light',\s*'dark'\]/.test(UI),
    'T6a tiga keadaan tema dideklarasikan (system / light / dark)');
  check(/if \(want === 'system'\) root\.removeAttribute\('data-theme'\)/.test(UI),
    "T6b pilihan 'system' MENGHAPUS atribut, bukan menulis data-theme=\"system\"");
  check(/prefers-color-scheme: dark/.test(UI),
    'T6c getCurrentTheme() menyelesaikan "system" lewat preferensi perangkat');
}

console.log('');
if (failures) {
  console.error('FIEZEL night theme: FAIL (' + failures + ')');
  process.exit(1);
}
console.log('FIEZEL night theme: PASS');
