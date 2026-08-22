/**
 * FIEZEL — generator wordmark. Jalankan: node tools/build-wordmark.mjs assets/brand
 *
 * Wordmark ini DIBANGUN DARI SISTEM, bukan digambar bebas dan bukan diketik dengan font.
 * Seluruh angkanya diturunkan dari konstruksi logo yang sudah ada di
 * features/brand/fiezel-splash.js: monoline 42 unit dengan ujung membulat penuh (rx =
 * separuh tebal). Itu sebabnya wordmark dan tanda terlihat berasal dari satu tangan -
 * keduanya memang memakai satu sistem huruf yang sama.
 *
 * Disimpan sebagai generator, bukan hanya sebagai berkas SVG jadi, supaya proporsinya bisa
 * diubah sekali di sini lalu seluruh varian diproduksi ulang konsisten. SVG hasilnya ikut
 * di-commit karena aplikasi tidak punya langkah build.
 */
import fs from 'node:fs';

const W = 42;            // tebal garis, sama persis dengan batang huruf F di logo
const R = W / 2;         // ujung membulat penuh
const CAP = 200;         // tinggi huruf kapital
const TOP = 30, BOT = TOP + CAP;         // 30 -> 230
const MID = TOP + (CAP - W) / 2;         // palang tengah, 109
const BARROW = BOT - W;                  // palang bawah, 188
const GAP = 34;          // jarak antarhuruf, lapang - ini yang membuatnya terbaca mewah
const LIG = 18;          // jarak F->I, dirapatkan supaya pasangannya mengulang lockup logo
const PAD = 30;

const bar = (x, y, w, h, r) => `<rect x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${+h.toFixed(2)}" rx="${r === undefined ? R : r}"/>`;

function diagonal(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const deg = Math.atan2(dy, dx) * 180 / Math.PI;
  return `<rect x="${+x1.toFixed(2)}" y="${+(y1 - R).toFixed(2)}" width="${+len.toFixed(2)}" height="${W}" rx="${R}" transform="rotate(${+deg.toFixed(3)} ${+x1.toFixed(2)} ${+y1.toFixed(2)})"/>`;
}

let x = PAD;
let iSlot = 0;
const ivory = [];

// F — persis konstruksi logo: batang tegak, lengan atas panjang, lengan tengah lebih pendek.
ivory.push(bar(x, TOP, W, CAP), bar(x, TOP, 140, W), bar(x, MID, 112, W));
x += 140 + LIG;

// I — jaraknya ke F sengaja DIRAPATKAN (18, bukan 34): pasangan "FI" dengan begitu
// mengulang lockup logonya sendiri, huruf F diikuti batang. Tandanya adalah dua huruf
// pertama namanya.
iSlot = x;
x += W + GAP;

// E — tiga lengan dengan panjang BERBEDA. Inilah detail yang tidak dimiliki siapa pun:
// ketiganya terbaca sebagai batang level, dan FIEZEL memang aplikasi yang berbicara.
const E = (x0) => [bar(x0, TOP, W, CAP), bar(x0, TOP, 140, W), bar(x0, MID, 100, W), bar(x0, BARROW, 130, W)];
ivory.push(...E(x));
x += 140 + GAP;

// Z — satu-satunya unsur miring. Ia yang memberi tenaga pada wordmark yang selebihnya tegak.
const zw = 150;
ivory.push(bar(x, TOP, zw, W), bar(x, BARROW, zw, W));
ivory.push(diagonal(x + zw - R, TOP + R, x + R, BARROW + R));
x += zw + GAP;

ivory.push(...E(x));
x += 140 + GAP;

// L
ivory.push(bar(x, TOP, W, CAP), bar(x, BARROW, 132, W));
x += 132;

const VB_W = x + PAD, VB_H = BOT + TOP;

const defs = `<defs>
<linearGradient id="fzwIvory" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFBF3"/><stop offset="100%" stop-color="#EBDBC0"/></linearGradient>
<linearGradient id="fzwGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F7E3AE"/><stop offset="45%" stop-color="#DDB55F"/><stop offset="100%" stop-color="#B0812A"/></linearGradient>
</defs>`;

// Huruf I punya dua bentuk, dan itulah inti sistem ini.
//
// UTAMA: satu batang gading biasa. Dipakai di mana pun ukurannya tidak terjamin.
const iPlain = bar(iSlot, TOP, W, CAP);

// DISPLAY: batang I diganti motif logo - DUA batang emas dengan tinggi berbeda, ide yang
// datang dari owner sendiri ("di logo FIEZEL ada dua batang emas, itu terlihat seperti
// instrumen musik"). Lebar totalnya tetap 42 supaya irama wordmark tidak bergeser: 16+10+16.
//
// Varian ini HANYA untuk ukuran besar, dan batasnya diuji bukan ditebak: dirender pada 560,
// 230, dan 132 piksel. Di 132px, batang 16 unit menjadi ~2 piksel dan keduanya lumer jadi
// satu noda - wordmark-nya berhenti terbaca "FIEZEL". Itu batas fisik, bukan soal kerajinan.
// Di bawah sekitar 280px, pakai versi utama.
const BAR_W = 16, BAR_R = BAR_W / 2, BAR_GAP = 10, SHORT = 124;
const iBars = bar(iSlot, TOP, BAR_W, CAP, BAR_R) + bar(iSlot + BAR_W + BAR_GAP, BOT - SHORT, BAR_W, SHORT, BAR_R);

const color = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" role="img" aria-label="FIEZEL">
${defs}
<g fill="url(#fzwIvory)">${ivory.join('')}${iPlain}</g>
</svg>`;

const display = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" role="img" aria-label="FIEZEL">
${defs}
<g fill="url(#fzwIvory)">${ivory.join('')}</g>
<g fill="url(#fzwGold)">${iBars}</g>
</svg>`;

// MONO: satu warna yang diwarisi dari induknya, untuk konteks satu warna - stempel, sablon,
// favicon, atau di atas foto.
const mono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" role="img" aria-label="FIEZEL">
<g fill="currentColor">${ivory.join('')}${iPlain}</g>
</svg>`;

fs.writeFileSync(process.argv[2] + '/fiezel-wordmark.svg', color + '\n');
fs.writeFileSync(process.argv[2] + '/fiezel-wordmark-mono.svg', mono + '\n');
fs.writeFileSync(process.argv[2] + '/fiezel-wordmark-display.svg', display + '\n');
console.log('viewBox 0 0 ' + VB_W + ' ' + VB_H + '  | tebal', W, '| cap', CAP, '| jarak', GAP);
