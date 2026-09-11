/* FIEZEL Redesign v2 "Ekspedisi" — kit bersama untuk semua artboard.
   Token diambil dari assets/brand/BRAND-GUIDE.md dan warna asli seni karakter
   (assets/characters/*). Ikon = Lucide, set yang sama dengan lucide.min.js app. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ICONS = JSON.parse(readFileSync(join(HERE, 'icons.json'), 'utf8'));

/* ---------- token ---------- */
export const T = {
  cream: '#FFF8EF', creamSoft: '#FBEEDC', paper: '#FFFFFF',
  ink: '#22190F', ink2: '#6F6047', ink3: '#7F6F52',
  line: '#EFE2CB', lineSoft: '#F7EFE1',
  rimba: '#1F4D3A', rimbaDeep: '#143326', daun: '#2E7D5B',
  onRimba: '#FDF6E8', onRimbaMuted: 'rgba(253,246,232,.72)',
  marun: '#8C2233', marunDeep: '#6D1926', marunSoft: '#FBE6E8',
  emas: '#D8B36B', emasTerang: '#EFCE8B',
  sun: '#FFC94F', sunDeep: '#E0A41A', sunSoft: '#FFF2CE',
  blush: '#F0A0AC',
  ok: '#1B6A4C', okSoft: '#E3F3EB',
  bad: '#B8352A', badSoft: '#FBE7E2'
};

/* Enam ranah keterampilan — satu warna blok pastel + satu tinta gelap masing-masing. */
export const DOM = {
  vocab:   { bg: '#FFE7A8', ink: '#7E5606', icon: 'book-a',          label: 'Kosakata' },
  grammar: { bg: '#C9E3F7', ink: '#14547E', icon: 'spell-check-2',   label: 'Grammar' },
  reading: { bg: '#DED5F7', ink: '#4E368F', icon: 'book-open',       label: 'Membaca' },
  listen:  { bg: '#FFCED9', ink: '#A22B49', icon: 'headphones',      label: 'Menyimak' },
  speak:   { bg: '#ACE1D9', ink: '#0B6056', icon: 'mic',             label: 'Berbicara' },
  write:   { bg: '#FFD3B3', ink: '#8E4211', icon: 'book-open-text',  label: 'Menulis' }
};

export const FONT = '"Plus Jakarta Sans","Noto Sans Thai","Trebuchet MS",system-ui,sans-serif';

/* ---------- ikon ---------- */
export function ic(name, size = 20, color = 'currentColor', sw = 2) {
  const inner = ICONS[name];
  if (!inner) throw new Error('ikon tidak ada di icons.json: ' + name);
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" `
    + `stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/* Cap kaki PAW — tanda merek, koordinat sama persis dengan assets/brand/fiezel-paw.svg */
export function paw(size = 20, color = T.marun) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><g fill="${color}">`
    + '<rect x="4.6" y="7.5" width="3.1" height="4.6" rx="1.55"/>'
    + '<rect x="8.9" y="5.1" width="3.1" height="7" rx="1.55"/>'
    + '<rect x="13.2" y="3.4" width="3.1" height="8.7" rx="1.55"/>'
    + '<rect x="17.5" y="6.2" width="3.1" height="5.9" rx="1.55"/>'
    + '<path d="M12.6 14c3.5 0 5.9 1.9 5.9 4.1 0 2-2 3.4-5.9 3.4s-5.9-1.4-5.9-3.4c0-2.2 2.4-4.1 5.9-4.1Z"/>'
    + '</g></svg>';
}

/* Wordmark FIEZEL — geometri sama dengan assets/brand/fiezel-wordmark.svg, warna bisa diganti. */
export function wordmark(h = 22, huruf = T.ink, aksen = T.sun) {
  const w = Math.round((1000 / 260) * h);
  return `<svg width="${w}" height="${h}" viewBox="0 0 1000 260" role="img" aria-label="FIEZEL">`
    + `<g fill="${huruf}">`
    + '<rect x="30" y="30" width="42" height="200" rx="21"/><rect x="30" y="30" width="144" height="42" rx="21"/>'
    + '<rect x="30" y="109" width="116" height="42" rx="21"/><rect x="300" y="30" width="42" height="200" rx="21"/>'
    + '<rect x="300" y="30" width="144" height="42" rx="21"/><rect x="300" y="109" width="100" height="42" rx="21"/>'
    + '<rect x="300" y="188" width="130" height="42" rx="21"/><rect x="478" y="30" width="150" height="42" rx="21"/>'
    + '<rect x="478" y="188" width="150" height="42" rx="21"/>'
    + '<rect x="607" y="30" width="191.38" height="42" rx="21" transform="rotate(124.354 607 51)"/>'
    + '<rect x="662" y="30" width="42" height="200" rx="21"/><rect x="662" y="30" width="144" height="42" rx="21"/>'
    + '<rect x="662" y="109" width="100" height="42" rx="21"/><rect x="662" y="188" width="130" height="42" rx="21"/>'
    + '<rect x="840" y="30" width="42" height="200" rx="21"/><rect x="840" y="188" width="130" height="42" rx="21"/>'
    + '</g>'
    + `<g fill="${aksen}"><rect x="192" y="30" width="26" height="200" rx="13"/>`
    + '<rect x="240" y="106" width="26" height="124" rx="13"/></g></svg>';
}

/* ---------- pembungkus artboard ---------- */
export function dc({ w, h, bg = T.cream, css = '', body }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Thai:wght@400;500;700;800&display=swap">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: ${FONT}; color: ${T.ink}; -webkit-font-smoothing: antialiased; }
    a { color: ${T.marun}; text-decoration: none; }
    a:hover { color: ${T.marunDeep}; }
    p { margin: 0; }
    h1, h2, h3, h4 { margin: 0; font-weight: 800; letter-spacing: -0.02em; line-height: 1.12; }
    img { display: block; }
    .fz-clip { overflow: hidden; }
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

/* ---------- komponen kecil ---------- */
export const S = {
  col: (gap, extra = '') => `display: flex; flex-direction: column; gap: ${gap}px;${extra}`,
  row: (gap, extra = '') => `display: flex; align-items: center; gap: ${gap}px;${extra}`,
  grid: (n, gap, extra = '') =>
    `display: grid; grid-template-columns: repeat(${n}, minmax(0, 1fr)); gap: ${gap}px;${extra}`
};

export function eyebrow(text, color = T.ink3) {
  return `<span style="font-size: 11px; font-weight: 800; letter-spacing: 0.1em; `
    + `text-transform: uppercase; color: ${color};">${text}</span>`;
}

/* Tombol utama — tinggi 54px, di atas ambang sentuh 44px. */
export function btn(label, opt = {}) {
  const {
    fill = T.marun, color = T.cream, shadow = T.marunDeep, h = 54,
    icon = null, width = '100%', fs = 16, radius = 999, border = 'none', extra = ''
  } = opt;
  const sh = shadow ? `box-shadow: 0 4px 0 ${shadow};` : '';
  return `<div style="${S.row(9, ` justify-content: center; width: ${width}; height: ${h}px;`
    + ` background: ${fill}; color: ${color}; border-radius: ${radius}px; border: ${border};`
    + ` font-weight: 800; font-size: ${fs}px; letter-spacing: -0.01em; ${sh}${extra}`)}">`
    + `<span>${label}</span>${icon ? ic(icon, 19, color, 2.4) : ''}</div>`;
}

export function chip(label, opt = {}) {
  const { bg = T.paper, color = T.ink, icon = null, border = T.line, fs = 12.5, pad = '7px 12px' } = opt;
  const style = S.row(6, ` padding: ${pad}; border-radius: 999px; background: ${bg};`
    + ` color: ${color}; border: 1px solid ${border}; font-size: ${fs}px; font-weight: 700;`
    + ` white-space: nowrap;`);
  return `<span style="${style}">${icon ? ic(icon, 14, color, 2.4) : ''}<span>${label}</span></span>`;
}

export function card(inner, opt = {}) {
  const { bg = T.paper, pad = 18, radius = 24, border = T.line, extra = '' } = opt;
  return `<div style="background: ${bg}; border-radius: ${radius}px; padding: ${pad}px;`
    + ` border: 1px solid ${border}; ${extra}">${inner}</div>`;
}

/* Bar progres tipis. */
export function bar(pct, opt = {}) {
  const { track = T.lineSoft, fill = T.marun, h = 8 } = opt;
  return `<div style="height: ${h}px; border-radius: 999px; background: ${track}; overflow: hidden;">`
    + `<div style="width: ${pct}%; height: 100%; border-radius: 999px; background: ${fill};"></div></div>`;
}

/* Avatar bulat berisi seni karakter. */
export function avatar(src, size = 44, bg = T.sunSoft, scale = 1.55, dy = 12) {
  return `<span style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${bg};`
    + ` display: block; position: relative; overflow: hidden; flex: none;">`
    + `<img src="${src}" alt="" style="position: absolute; left: 50%; top: ${dy}%;`
    + ` width: ${Math.round(size * scale)}px; transform: translateX(-50%);"></span>`;
}

/* ---------- cangkang telepon ---------- */
export const PHONE_W = 390;
export const PHONE_H = 844;
/* Tanpa status bar palsu: 52px teratas sengaja dibiarkan kosong untuk status bar asli. */
export const TOP_SAFE = 52;
export const NAV_H = 92;

const NAV_ITEMS = [
  { key: 'latihan', icon: 'zap', label: 'Latihan' },
  { key: 'kelas', icon: 'school', label: 'KelasKu' },
  { key: 'home', icon: 'house', label: 'Hari ini' },
  { key: 'progres', icon: 'route', label: 'Progres' },
  { key: 'profil', icon: 'user-round', label: 'Profil' }
];

export function navBar(active, labels = null) {
  const items = NAV_ITEMS.map((it, i) => {
    const teks = labels ? labels[i] : it.label;
    const on = it.key === active;
    const col = on ? T.marun : T.ink3;
    return `<div style="${S.col(4, ' align-items: center; flex: 1; min-width: 0;')}">`
      + `<span style="${S.row(0, ` justify-content: center; width: 46px; height: 30px; border-radius: 12px;`
        + ` background: ${on ? T.marunSoft : 'transparent'};`)}">${ic(it.icon, 20, col, on ? 2.5 : 2)}</span>`
      + `<span style="font-size: 10.5px; font-weight: ${on ? 800 : 600}; color: ${col};`
      + ` letter-spacing: -0.01em;">${teks}</span></div>`;
  }).join('');
  return `<div style="position: absolute; left: 16px; right: 16px; bottom: 18px; height: 68px;`
    + ` background: ${T.paper}; border: 1px solid ${T.line}; border-radius: 26px;`
    + ` box-shadow: 0 8px 24px rgba(34,25,15,.10); ${S.row(0, ' justify-content: space-between; padding: 9px 6px;')}">`
    + `${items}</div>`;
}

/* Kepala halaman di dalam app (judul + aksi kanan). */
export function appHeader(title, right = '') {
  return `<div style="${S.row(0, ' justify-content: space-between;')}">`
    + `<h1 style="font-size: 27px;">${title}</h1>${right}</div>`;
}

export function iconBtn(name, opt = {}) {
  const { bg = T.paper, color = T.ink, size = 40, border = T.line } = opt;
  return `<span style="${S.row(0, ` justify-content: center; width: ${size}px; height: ${size}px;`
    + ` border-radius: 14px; background: ${bg}; border: 1px solid ${border}; flex: none;`)}">`
    + `${ic(name, 19, color, 2.2)}</span>`;
}

/* Titik indikator carousel. */
export function dots(n, active, opt = {}) {
  const { on = T.ink, off = 'rgba(34,25,15,.22)' } = opt;
  const d = Array.from({ length: n }, (_, i) =>
    `<span style="width: ${i === active ? 22 : 7}px; height: 7px; border-radius: 999px;`
    + ` background: ${i === active ? on : off}; display: block;"></span>`).join('');
  return `<div style="${S.row(6)}">${d}</div>`;
}
