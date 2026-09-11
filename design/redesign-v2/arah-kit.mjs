/* Perkakas bersama untuk empat ARAH DESAIN yang sedang dipilih owner.
   Sengaja tipis: tiap arah menulis tata letaknya sendiri, bukan menukar token
   di atas kerangka yang sama — empat varian dari satu kerangka bukan pilihan. */
import { ic } from './kit.mjs';

export { ic };
export const PHONE_W = 390;
export const PHONE_H = 844;
/* 52px teratas dibiarkan kosong untuk status bar asli; tidak ada chrome palsu. */
export const TOP_SAFE = 52;

/* ==========================================================================
   ATURAN MASKOT — jawaban atas "badannya bocor"
   ==========================================================================
   Cacat di versi sebelumnya: gambar maskot dipasang dengan offset negatif di
   dalam wadah ber-overflow:hidden, jadi kaki dan ekornya terpotong tepi kartu.
   Aturan sekarang, dipakai keempat arah:

     1. Maskot berdiri di PANGGUNG miliknya sendiri — kotak yang ukurannya
        mengikuti rasio aspek gambar, jadi tidak ada sisi yang terpotong.
     2. Tidak ada offset negatif. Tidak pernah.
     3. Wadah yang memuat panggung tidak boleh lebih pendek dari panggungnya.
     4. Hiasan warna memakai radial-gradient yang meluruh ke transparan —
        bentuk padat yang dipotong wadah terbaca sebagai bercak bersudut.

   RASIO dipakai untuk menghitung lebar dari tinggi, supaya panggungnya pas. */
export const RASIO = {
  'shoulder-wave.webp': 772 / 1104,
  'hat-peek.webp': 657 / 1105,
  'teaching.webp': 937 / 761,
  'highfive.webp': 783 / 864,
  'head-happy.webp': 816 / 927,
  'full-thinking.webp': 650 / 838,
  'full-oops.webp': 736 / 1052,
  'full-cheer.webp': 775 / 1102,
  'head-explain.webp': 1024 / 1104
};

export function lebarMaskot(src, tinggi) {
  const r = RASIO[src];
  if (!r) throw new Error('rasio maskot tidak dikenal: ' + src);
  return Math.round(tinggi * r);
}

/** Maskot utuh: kotak seukuran gambar, tanpa potongan, tanpa offset negatif. */
export function maskot(src, tinggi, extra = '') {
  const w = lebarMaskot(src, tinggi);
  return `<img src="${src}" alt="" style="width: ${w}px; height: ${tinggi}px; `
    + `display: block; flex: none; ${extra}">`;
}

/** Potret maskot di dalam bingkai bulat — gambar DIMUAT UTUH (contain), bukan dipotong. */
export function potret(src, size, opt = {}) {
  const { bg = '#FFFFFF', ring = 'none', pad = 3 } = opt;
  const dalam = size - pad * 2;
  const r = RASIO[src];
  const [w, h] = r >= 1 ? [dalam, Math.round(dalam / r)] : [Math.round(dalam * r), dalam];
  return `<span style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${bg};`
    + ` border: ${ring}; display: flex; align-items: flex-end; justify-content: center;`
    + ` overflow: hidden; flex: none;">`
    + `<img src="${src}" alt="" style="width: ${w}px; height: ${h}px; display: block;"></span>`;
}

/** Bayangan lembut di bawah maskot — menambatkannya ke lantai tanpa memotong. */
export function bayangan(w, opacity = 0.13, warna = '34,25,15') {
  return `<span style="display: block; width: ${w}px; height: ${Math.round(w * 0.13)}px;`
    + ` border-radius: 50%; background: radial-gradient(closest-side,`
    + ` rgba(${warna},${opacity}), rgba(${warna},0));"></span>`;
}

/** Hiasan yang meluruh — pengganti bentuk padat yang terbaca sebagai bercak. */
export function cahaya(x, y, d, warna) {
  return `<span style="position: absolute; left: ${x}px; top: ${y}px; width: ${d}px; height: ${d}px;`
    + ` border-radius: 50%; background: radial-gradient(closest-side, ${warna}, transparent);`
    + ` pointer-events: none;"></span>`;
}

export const S = {
  col: (gap, extra = '') => `display: flex; flex-direction: column; gap: ${gap}px;${extra}`,
  row: (gap, extra = '') => `display: flex; align-items: center; gap: ${gap}px;${extra}`,
  grid: (n, gap, extra = '') =>
    `display: grid; grid-template-columns: repeat(${n}, minmax(0, 1fr)); gap: ${gap}px;${extra}`
};

/** Pembungkus artboard dengan tautan huruf per arah. */
export function dcArah({ w = PHONE_W, h = PHONE_H, bg, huruf, tautan, css = '', body }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="${tautan}">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: ${huruf}; -webkit-font-smoothing: antialiased; }
    a { color: #8C2233; text-decoration: none; }
    a:hover { color: #6D1926; }
    p { margin: 0; }
    h1, h2, h3 { margin: 0; }
    img { display: block; }
${css}
  </style>
</helmet>
<div style="width: ${w}px; height: ${h}px; background: ${bg}; position: relative; overflow: hidden;">
${body}
</div>
</x-dc>
</body>
</html>
`;
}

export function tautanHuruf(keluarga) {
  const q = keluarga.map(([n, b]) => 'family=' + n.replace(/\s+/g, '+') + ':wght@' + b.join(';'));
  return 'https://fonts.googleapis.com/css2?' + q.join('&') + '&display=swap';
}

/** Isi layar dengan ruang status bar asli dibiarkan kosong. */
export function isi(body, pad = 20, top = TOP_SAFE) {
  return `<div style="position: absolute; inset: ${top}px ${pad}px 0 ${pad}px;">${body}</div>`;
}

export const NAV = [
  { icon: 'zap', label: 'Latihan' },
  { icon: 'school', label: 'KelasKu' },
  { icon: 'house', label: 'Hari ini' },
  { icon: 'route', label: 'Progres' },
  { icon: 'user-round', label: 'Profil' }
];
