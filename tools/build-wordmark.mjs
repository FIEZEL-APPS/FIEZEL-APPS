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
const TOP = 30, BOT = TOP + CAP;
const MID = TOP + (CAP - W) / 2;
const BARROW = BOT - W;
const GAP = 34;          // jarak antarhuruf, lapang - ini yang membuatnya terbaca mewah
const LIG = 18;          // jarak F->I, dirapatkan supaya pasangannya mengulang lockup logo
const PAD = 30;

const bar = (x, y, w, h, r) =>
  `<rect x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${+h.toFixed(2)}" rx="${r === undefined ? R : r}"/>`;

function diagonal(x1, y1, x2, y2) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const deg = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  return `<rect x="${+x1.toFixed(2)}" y="${+(y1 - R).toFixed(2)}" width="${+len.toFixed(2)}" height="${W}" rx="${R}" transform="rotate(${+deg.toFixed(3)} ${+x1.toFixed(2)} ${+y1.toFixed(2)})"/>`;
}

/**
 * Menyusun seluruh huruf selain I, dan mengembalikan posisi serta lebar slot I.
 *
 * Lebar slot itu PARAMETER, bukan tetapan: varian hero mengisinya dengan dua batang yang
 * butuh ruang lebih lebar daripada satu batang biasa, dan seluruh huruf sesudahnya harus
 * bergeser mengikutinya. Versi sebelumnya melebarkan batangnya saja tanpa menggeser tata
 * letak, sehingga batang kedua nyaris menempel pada huruf E.
 */
function layout(iSlot) {
  const ivory = [];
  let x = PAD;

  // F — persis konstruksi logo: batang tegak, lengan atas panjang, lengan tengah lebih pendek.
  ivory.push(bar(x, TOP, W, CAP), bar(x, TOP, 144, W), bar(x, MID, 116, W));
  x += 144 + LIG;

  const iX = x;
  x += iSlot + GAP;

  // E — tiga lengan dengan panjang BERBEDA. Inilah detail yang tidak dimiliki siapa pun:
  // ketiganya terbaca sebagai batang level, dan FIEZEL memang aplikasi yang berbicara.
  const E = x0 => [bar(x0, TOP, W, CAP), bar(x0, TOP, 144, W), bar(x0, MID, 100, W), bar(x0, BARROW, 130, W)];
  ivory.push(...E(x));
  x += 144 + GAP;

  // Z — satu-satunya unsur miring. Ia yang memberi tenaga pada wordmark yang selebihnya tegak.
  const zw = 150;
  ivory.push(bar(x, TOP, zw, W), bar(x, BARROW, zw, W), diagonal(x + zw - R, TOP + R, x + R, BARROW + R));
  x += zw + GAP;

  ivory.push(...E(x));
  x += 144 + GAP;

  ivory.push(bar(x, TOP, W, CAP), bar(x, BARROW, 130, W));
  x += 130;

  return { ivory: ivory.join(''), iX, width: x + PAD, height: BOT + TOP };
}

/**
 * Huruf I versi HERO: motif logo - DUA batang emas dengan tinggi berbeda. Ide ini datang
 * dari owner sendiri ("di logo FIEZEL ada dua batang emas, itu terlihat seperti instrumen
 * musik").
 *
 * Lebar batang dan celahnya diuji, bukan ditebak. Percobaan pertama memakai 16 dan 10, dan
 * itu hanya bertahan di ukuran besar: pada 96px celahnya menjadi kurang dari satu piksel
 * sehingga kedua batang lumer jadi satu noda. Dilebarkan ke 26 dan 22, keduanya masih
 * terbaca terpisah pada 96px - selebar wordmark di topbar - sehingga varian ini tidak lagi
 * punya batas bawah praktis.
 */
const BAR_W = 26, BAR_GAP = 22, SHORT = 124;
const HERO_SLOT = BAR_W * 2 + BAR_GAP;

const defs = `<defs>
<linearGradient id="fzwIvory" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFBF3"/><stop offset="100%" stop-color="#EBDBC0"/></linearGradient>
<linearGradient id="fzwGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F7E3AE"/><stop offset="45%" stop-color="#DDB55F"/><stop offset="100%" stop-color="#B0812A"/></linearGradient>
</defs>`;

// UTAMA (hero). Dipakai di seluruh aplikasi.
const h = layout(HERO_SLOT);
const heroBars = bar(h.iX, TOP, BAR_W, CAP, BAR_W / 2)
               + bar(h.iX + BAR_W + BAR_GAP, BOT - SHORT, BAR_W, SHORT, BAR_W / 2);
const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${h.width} ${h.height}" role="img" aria-label="FIEZEL">
${defs}
<g fill="url(#fzwIvory)">${h.ivory}</g>
<g fill="url(#fzwGold)">${heroBars}</g>
</svg>`;

// MONO: satu warna diwarisi induknya, untuk stempel, sablon, atau di atas foto. Huruf I
// kembali menjadi satu batang biasa: tanpa perbedaan warna, dua batang berdampingan justru
// terbaca sebagai dua huruf.
const m = layout(W);
const mono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.width} ${m.height}" role="img" aria-label="FIEZEL">
<g fill="currentColor">${m.ivory}${bar(m.iX, TOP, W, CAP)}</g>
</svg>`;

const out = process.argv[2];
fs.writeFileSync(out + '/fiezel-wordmark.svg', hero + '\n');
fs.writeFileSync(out + '/fiezel-wordmark-mono.svg', mono + '\n');
console.log(`hero  viewBox 0 0 ${h.width} ${h.height}  (slot I ${HERO_SLOT})`);
console.log(`mono  viewBox 0 0 ${m.width} ${m.height}  (slot I ${W})`);
