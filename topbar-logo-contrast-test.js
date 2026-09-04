#!/usr/bin/env node
/**
 * m025-127 gerbang keterbacaan wordmark di topbar.
 *
 * KENAPA BERKAS INI ADA. Brief OWNER (FIEZEL_Brief_PAW_dan_Kontras_Logo.pdf, bagian B):
 * "logotype FIEZEL saat ini nyaris tidak terlihat karena warna logo terlalu dekat/serupa
 * dengan warna latar belakang topbar (kuning di atas kuning)."
 *
 * Terukur: gading #FFFBF3 di atas chrome cream #FFF9EE = 1,02:1. Itu bukan "kurang
 * kontras", itu tidak terlihat sama sekali.
 *
 * YANG MEMBUATNYA LOLOS SELAMA TIGA RILIS. Wordmark itu BUKAN teks - ia SVG dengan gradien
 * hex mati di dalamnya. Jadi ia tidak ikut --ambient-text, tidak ikut berbalik di mode
 * gelap, dan tidak terlihat oleh satu pun gerbang kontras yang sudah ada:
 *
 *   - contrast-test.js memeriksa PASANGAN TOKEN yang sudah diketahui. Hex di dalam SVG
 *     bukan token, jadi tidak pernah ikut diperiksa.
 *   - pastel-field-contrast-test.js memeriksa BIDANG yang memasang background dari token.
 *     Wordmark tidak memasang background apa pun.
 *
 * Sampai m025-118 keduanya benar dan logonya memang terbaca - topbarnya maroon gelap.
 * m025-119/120 mengganti dasarnya ke cream, dan logo yang tidak ikut sistem warna adalah
 * satu-satunya elemen yang tidak ikut pindah. Berkas ini menutup celah itu: ia membaca
 * warna DARI DALAM SVG-nya, bukan dari daftar token.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CSS = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + ': ' + e.message); }
}

function luminance(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const c = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Nilai token, dibaca dari blok CSS tertentu. */
function tokenIn(block, name) {
  const m = new RegExp('--' + name + '\\s*:\\s*([^;]+);').exec(block);
  return m ? m[1].trim() : '';
}
function blockFrom(startRe) {
  const at = CSS.search(startRe);
  if (at < 0) return '';
  let depth = 0, out = '';
  for (let i = at; i < CSS.length; i++) {
    if (CSS[i] === '{') depth++;
    else if (CSS[i] === '}') { depth--; if (depth === 0) { out += CSS[i]; break; } }
    out += CSS[i];
  }
  return out;
}

/**
 * Latar topbar. --chrome-bg semi-transparan di atas dasar halaman, jadi yang dipakai di
 * sini adalah hasil komposit terhadap --cream - bukan alpha-nya, yang akan melaporkan
 * kontras terhadap warna yang tidak pernah benar-benar terlihat.
 */
function chromeOver(block, fallbackBase) {
  const chrome = tokenIn(block, 'chrome-bg');
  const base = (tokenIn(block, 'cream') || fallbackBase).replace('#', '');
  const rgba = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/.exec(chrome);
  if (!rgba) return chrome || fallbackBase;
  const a = rgba[4] === undefined ? 1 : Number(rgba[4]);
  const b = [0, 2, 4].map((i) => parseInt(base.substr(i, 2), 16));
  const out = [1, 2, 3].map((i, k) => Math.round(Number(rgba[i]) * a + b[k] * (1 - a)));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Semua stop-color di dalam SVG wordmark topbar, apa adanya. */
function topbarStops() {
  const span = /<span class="brand">([\s\S]*?)<\/span>/.exec(HTML);
  if (!span) throw new Error('wordmark topbar tidak ditemukan di index.html');
  return (span[1].match(/stop-color="([^"]+)"/g) || []).map((s) => s.slice(12, -1));
}

/**
 * SEMUA blok :root digabung. style.css punya lebih dari satu, dan palet pastelnya hidup di
 * blok KEDUA - membaca yang pertama saja adalah cara bug palet terus lolos sebelumnya.
 */
function allLightBlocks() {
  const lines = CSS.split('\n');
  let out = '';
  lines.forEach((line, i) => {
    if (!/^:root\s*\{/.test(line)) return;
    let depth = 0;
    for (let j = i; j < lines.length; j++) {
      depth += (lines[j].match(/\{/g) || []).length;
      depth -= (lines[j].match(/\}/g) || []).length;
      out += lines[j] + '\n';
      if (depth <= 0) break;
    }
  });
  return out;
}

const LIGHT = allLightBlocks();

test('wordmark topbar tidak lagi memakai hex mati', () => {
  // Inilah akar masalahnya: warna yang tidak ikut sistem tidak ikut pindah ketika
  // dasarnya berubah, dan tidak ada gerbang mana pun yang bisa melihatnya.
  const hard = topbarStops().filter((v) => /^#/.test(v));
  if (hard.length) {
    throw new Error('masih ada warna mati di dalam SVG topbar: ' + hard.join(', ')
      + ' — warna yang tidak ikut token tidak ikut berubah saat dasarnya berubah');
  }
});

test('setiap warna wordmark punya nilai di tema terang', () => {
  // m025-134: mode gelap dihapus, jadi yang dijaga tinggal satu - tokennya benar-benar
  // ADA. Token yang tidak punya nilai sama sekali adalah bug m025-119 dalam bentuk lain:
  // logo diam-diam kehilangan warnanya tanpa satu pun galat.
  const names = topbarStops().map((v) => (/var\(\s*(--[a-z0-9-]+)/.exec(v) || [])[1]).filter(Boolean);
  if (!names.length) throw new Error('tidak ada token warna di wordmark topbar');
  const missing = names.filter((n) => !tokenIn(LIGHT, n.slice(2)));
  if (missing.length) {
    throw new Error('token tanpa nilai: ' + missing.join(', '));
  }
});

test('logo terbaca di atas topbar', () => {
  // Brief B: "perlakukan logo seperti elemen teks penting ... setara ambang keterbacaan
  // teks UI pada umumnya, bukan sekadar masih kelihatan kalau diperhatikan".
  const MIN = 4.5;
  const names = topbarStops().map((v) => (/var\(\s*(--[a-z0-9-]+)/.exec(v) || [])[1]).filter(Boolean);
  const weak = [];
  for (const [label, blocks, fallback] of [['terang', [LIGHT], '#FFF9EE']]) {
    const merged = blocks.join('\n');
    const bg = chromeOver(label === 'terang' ? LIGHT : merged + LIGHT, fallback);
    for (const n of names) {
      const hex = (tokenIn(merged, n.slice(2)) || '').match(/#[0-9a-f]{3,8}/i);
      if (!hex) continue;
      const r = ratio(hex[0], bg);
      if (r < MIN) weak.push(n + ' ' + hex[0] + ' @' + label + ' = ' + r.toFixed(2) + ':1 (latar ' + bg + ')');
    }
  }
  if (weak.length) throw new Error('di bawah ' + MIN + ':1 terhadap latar topbar:\n    ' + weak.join('\n    '));
});

test('wordmark splash sengaja TIDAK ikut bertema', () => {
  // Panggung splash memang selalu gelap (.fiezel-splash-dark). Menyeretnya ikut token tema
  // akan membalik gading menjadi coklat di atas panggung gelap - memperbaiki satu tempat
  // dengan merusak tempat lain.
  const splash = /id="fiezelBootSplash"[\s\S]*?<\/div><\/div>/.exec(HTML);
  if (!splash) throw new Error('splash tidak ditemukan');
  if (!/fiezel-splash-dark/.test(splash[0])) throw new Error('panggung splash tidak lagi gelap; warna wordmark di sana perlu ditinjau ulang');
  if (/stop-color="var\(/.test(splash[0])) {
    throw new Error('wordmark splash ikut bertema; di atas panggung gelap ia akan berbalik jadi coklat dan hilang');
  }
});

console.log('');
if (failures.length) {
  console.log('FIEZEL kontras logo topbar: FAIL (' + failures.length + ')');
  process.exit(1);
}
console.log('FIEZEL kontras logo topbar: PASS ' + pass);
