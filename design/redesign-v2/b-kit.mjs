/* SISTEM DESAIN "LEMBUT" — arah B, dipilih owner.

   Watak arah ini: tidak ada garis tepi sama sekali. Kedalaman datang dari
   bayangan halus dan ruang kosong, bukan dari garis. Huruf membulat
   (Quicksand untuk judul, Nunito untuk badan), pastel diredam, dan elemen
   per layar sengaja lebih sedikit daripada yang muat.

   Semua nilai warna di sini sudah lolos gerbang kontras di build.mjs. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ICONS = JSON.parse(readFileSync(join(HERE, 'icons.json'), 'utf8'));

/* ---------- token ---------- */
export const T = {
  bg: '#FBF7F3',
  kertas: '#FFFFFF',
  tinta: '#2E2724',
  redup: '#6E635C',
  samar: '#786D64',
  garis: '#EFE7DE',
  aksen: '#9B3A4A',
  aksenTekan: '#7E2D3B',
  aksenLembut: '#F6E9EB',
  ok: '#1D5C52',
  okLembut: '#D5EBE5',
  bad: '#A03A30',
  badLembut: '#F9E3DE',
  emas: '#7A5512',
  emasLembut: '#F7EACB'
};

/* Enam ranah keterampilan. Blok pastel diredam + tinta gelap yang lolos AA. */
export const D = {
  grammar: { bg: '#D8E8F4', ink: '#2A566F', icon: 'spell-check-2', label: 'Grammar' },
  vocab:   { bg: '#F7EACB', ink: '#7A5512', icon: 'book-a',        label: 'Kosakata' },
  listen:  { bg: '#F8DDE3', ink: '#963C54', icon: 'headphones',    label: 'Menyimak' },
  speak:   { bg: '#D5EBE5', ink: '#1D5C52', icon: 'mic',           label: 'Berbicara' },
  reading: { bg: '#E5DDF3', ink: '#523E86', icon: 'book-open',     label: 'Membaca' },
  write:   { bg: '#F8E2D2', ink: '#8C4C1D', icon: 'book-open-text', label: 'Menulis' }
};

/* Plus Jakarta Sans dan Quicksand sama-sama tidak punya glif Thai;
   Noto Sans Thai dipasang di belakangnya supaya layar Thai tidak jatuh
   ke huruf sistem yang beda watak. */
export const HURUF = [
  ['Quicksand', [500, 600, 700]],
  ['Nunito', [400, 500, 600, 700]],
  ['Noto Sans Thai', [400, 500, 600, 700]]
];
export const BADAN = "'Nunito','Noto Sans Thai',system-ui,sans-serif";
export const JUDUL = "'Quicksand','Noto Sans Thai','Nunito',system-ui,sans-serif";

export function tautanHuruf(keluarga = HURUF) {
  const q = keluarga.map(([n, b]) => 'family=' + n.replace(/\s+/g, '+') + ':wght@' + b.join(';'));
  return 'https://fonts.googleapis.com/css2?' + q.join('&') + '&display=swap';
}

/* ---------- bayangan: satu-satunya sumber kedalaman ---------- */
export const SH = {
  kartu: 'box-shadow: 0 14px 32px rgba(46,39,36,.07), 0 2px 6px rgba(46,39,36,.04);',
  kecil: 'box-shadow: 0 6px 16px rgba(46,39,36,.06);',
  angkat: 'box-shadow: 0 20px 44px rgba(46,39,36,.10), 0 3px 8px rgba(46,39,36,.05);',
  tombol: 'box-shadow: 0 10px 22px rgba(155,58,74,.26);'
};

export const R = { kartu: 28, besar: 34, ubin: 26, medan: 22, kecil: 18, pil: 999 };

/* ---------- tata letak ---------- */
export const S = {
  col: (gap, extra = '') => `display: flex; flex-direction: column; gap: ${gap}px;${extra}`,
  row: (gap, extra = '') => `display: flex; align-items: center; gap: ${gap}px;${extra}`,
  grid: (n, gap, extra = '') =>
    `display: grid; grid-template-columns: repeat(${n}, minmax(0, 1fr)); gap: ${gap}px;${extra}`
};

export const PHONE_W = 390;
export const PHONE_H = 844;
/* 52px teratas sengaja dikosongkan untuk status bar asli peranti.
   Tidak ada status bar palsu yang digambar di mana pun. */
export const TOP_SAFE = 52;

/* ---------- ikon ---------- */
export function ic(name, size = 20, color = 'currentColor', sw = 2) {
  const inner = ICONS[name];
  if (!inner) throw new Error('ikon tidak ada di icons.json: ' + name);
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" `
    + `stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/* Cap kaki PAW — koordinat sama persis dengan assets/brand/fiezel-paw.svg. */
export function paw(size = 20, color = T.aksen) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><g fill="${color}">`
    + '<rect x="4.6" y="7.5" width="3.1" height="4.6" rx="1.55"/>'
    + '<rect x="8.9" y="5.1" width="3.1" height="7" rx="1.55"/>'
    + '<rect x="13.2" y="3.4" width="3.1" height="8.7" rx="1.55"/>'
    + '<rect x="17.5" y="6.2" width="3.1" height="5.9" rx="1.55"/>'
    + '<path d="M12.6 14c3.5 0 5.9 1.9 5.9 4.1 0 2-2 3.4-5.9 3.4s-5.9-1.4-5.9-3.4c0-2.2 2.4-4.1 5.9-4.1Z"/>'
    + '</g></svg>';
}

/* Wordmark FIEZEL — geometri sama dengan assets/brand/fiezel-wordmark.svg. */
export function wordmark(h = 22, huruf = T.tinta, aksen = T.aksen) {
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

/* ==========================================================================
   ATURAN MASKOT
   ==========================================================================
   Owner menemukan maskot yang "warnanya atau badannya bocor" di rancangan
   pertama. Sebabnya: gambar dipasang dengan offset negatif di dalam wadah
   ber-overflow:hidden, jadi kaki dan ekornya terpotong tepi kartu; dan hiasan
   lingkaran PADAT yang ikut terpotong wadah terbaca sebagai bercak bersudut.

   Empat aturan yang mengikat seluruh berkas ini:
     1. Maskot berdiri di PANGGUNG miliknya sendiri — kotak yang ukurannya
        dihitung dari rasio aspek gambar, jadi tidak ada sisi yang terpotong.
     2. Tidak ada offset negatif. Tidak pernah.
     3. Wadah yang memuat panggung tidak boleh lebih pendek dari panggungnya.
     4. Hiasan warna memakai radial-gradient yang meluruh ke transparan.

   preview.mjs memeriksa tiap gambar terhadap wadah pemotongnya dan menolak
   build kalau ada sisi yang jatuh di luar. */
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

/* Ambang yang lahir dari temuan owner: maskot di Tanya Mira "jelek sekali".
   Sebabnya bukan seninya — pose head-explain komposisinya LEBAR (topi lebar,
   tangan menunjuk, sanggul di luar kepala), jadi begitu dipaksa masuk lingkaran
   34px, wajahnya tinggal belasan piksel dan jadi bubur.

   Karena itu: maskot TIDAK BOLEH dirender lebih kecil dari 72px pada sisi
   panjangnya. Untuk tempat yang lebih sempit dari itu, pakai tanda yang memang
   dirancang untuk ukuran kecil — cap kaki paw() atau inisial() — bukan wajah
   yang diperkecil. preview.mjs menolak build kalau ada yang melanggar. */
export const MIN_MASKOT = 72;

export function lebarMaskot(src, tinggi) {
  const r = RASIO[src];
  if (!r) throw new Error('rasio maskot tidak dikenal: ' + src);
  return Math.round(tinggi * r);
}

/** Maskot utuh: kotak seukuran gambar, tanpa potongan, tanpa offset negatif. */
export function maskot(src, tinggi, extra = '') {
  const w = lebarMaskot(src, tinggi);
  if (Math.max(w, tinggi) < MIN_MASKOT) {
    throw new Error(`maskot ${src} dirender ${w}x${tinggi} — di bawah ambang `
      + `${MIN_MASKOT}px. Pakai paw() atau inisial() untuk tempat sesempit ini.`);
  }
  return `<img src="${src}" alt="" style="width: ${w}px; height: ${tinggi}px; `
    + `display: block; flex: none; ${extra}">`;
}

/** Potret bulat — gambar dimuat UTUH (contain), tidak pernah dipotong jadi lingkaran.
    Tunduk pada ambang yang sama: di bawah 72px pakai inisial() atau paw(). */
export function potret(src, size, opt = {}) {
  const { bg = T.aksenLembut, pad = 3 } = opt;
  if (size < MIN_MASKOT) {
    throw new Error(`potret ${src} diminta ${size}px — di bawah ambang ${MIN_MASKOT}px.`);
  }
  const dalam = size - pad * 2;
  const r = RASIO[src];
  if (!r) throw new Error('rasio maskot tidak dikenal: ' + src);
  const [w, h] = r >= 1 ? [dalam, Math.round(dalam / r)] : [Math.round(dalam * r), dalam];
  return `<span style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${bg};`
    + ' display: flex; align-items: flex-end; justify-content: center; overflow: hidden; flex: none;">'
    + `<img src="${src}" alt="" style="width: ${w}px; height: ${h}px; display: block;"></span>`;
}

/** Bayangan lembut di bawah maskot — menambatkannya ke lantai tanpa memotong. */
export function bayangan(w, opacity = 0.15) {
  return `<span style="display: block; width: ${w}px; height: ${Math.round(w * 0.13)}px;`
    + ` border-radius: 50%; background: radial-gradient(closest-side,`
    + ` rgba(46,39,36,${opacity}), rgba(46,39,36,0));"></span>`;
}

/** Cahaya yang meluruh — pengganti bentuk padat yang terbaca sebagai bercak. */
export function cahaya(x, y, d, warna) {
  return `<span style="position: absolute; left: ${x}px; top: ${y}px; width: ${d}px; height: ${d}px;`
    + ` border-radius: 50%; background: radial-gradient(closest-side, ${warna}, transparent);`
    + ' pointer-events: none;"></span>';
}

/** Avatar MURID. Sengaja bukan maskot: yang disapa di Home adalah muridnya,
    dan inisial tetap terbaca di 40px sementara wajah tidak. */
export function inisial(teks, size = 46, opt = {}) {
  const { bg = T.aksenLembut, warna = T.aksen } = opt;
  return `<span style="${S.row(0, ` justify-content: center; width: ${size}px; height: ${size}px;`
    + ` border-radius: 50%; background: ${bg}; color: ${warna}; flex: none;`
    + ` font-family: ${JUDUL}; font-weight: 700; font-size: ${Math.round(size * 0.36)}px;`)}">`
    + `${teks}</span>`;
}

/* ---------- pembungkus artboard ---------- */
export function dc({ w = PHONE_W, h = PHONE_H, bg = T.bg, css = '', body }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="${tautanHuruf()}">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: ${BADAN}; color: ${T.tinta}; -webkit-font-smoothing: antialiased; }
    a { color: ${T.aksen}; text-decoration: none; }
    a:hover { color: ${T.aksenTekan}; }
    p { margin: 0; }
    h1, h2, h3 { margin: 0; font-family: ${JUDUL}; font-weight: 700;
      letter-spacing: -0.015em; line-height: 1.18; }
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

/** Isi layar dengan ruang status bar asli dibiarkan kosong. */
export function isi(body, pad = 24, top = TOP_SAFE) {
  return `<div style="position: absolute; inset: ${top}px ${pad}px 0 ${pad}px;">${body}</div>`;
}

/* ---------- komponen ---------- */
export function eyebrow(teks, warna = T.samar) {
  return `<span style="font-size: 11px; font-weight: 700; letter-spacing: 0.09em;`
    + ` text-transform: uppercase; color: ${warna};">${teks}</span>`;
}

export function kartu(dalam, opt = {}) {
  const { bg = T.kertas, pad = 18, radius = R.kartu, bayang = SH.kartu, extra = '' } = opt;
  return `<div style="background: ${bg}; border-radius: ${radius}px; padding: ${pad}px;`
    + ` ${bayang} ${extra}">${dalam}</div>`;
}

/** Tombol. Tinggi bawaan 54px — di atas ambang sentuh 44px. */
export function tombol(label, opt = {}) {
  const {
    jenis = 'utama', h = 54, icon = 'arrow-right', lebar = '100%', fs = 16, extra = ''
  } = opt;
  const gaya = {
    utama: `background: ${T.aksen}; color: #FFFFFF; ${SH.tombol}`,
    lembut: `background: ${T.kertas}; color: ${T.tinta}; ${SH.kecil}`,
    kalem: `background: ${T.aksenLembut}; color: ${T.aksen};`,
    hantu: `background: transparent; color: ${T.redup};`
  }[jenis];
  const warnaIkon = jenis === 'utama' ? '#FFFFFF' : jenis === 'kalem' ? T.aksen : T.redup;
  return `<span style="${S.row(9, ` justify-content: center; width: ${lebar}; height: ${h}px;`
    + ` padding: 0 22px; border-radius: ${R.pil}px; font-family: ${JUDUL}; font-weight: 700;`
    + ` font-size: ${fs}px; ${gaya} ${extra}`)}">`
    + `<span>${label}</span>${icon ? ic(icon, 18, warnaIkon, 2.4) : ''}</span>`;
}

export function chip(label, opt = {}) {
  const { bg = T.kertas, warna = T.tinta, icon = null, fs = 12.5, pad = '8px 14px',
    bayang = SH.kecil } = opt;
  return `<span style="${S.row(7, ` padding: ${pad}; border-radius: ${R.pil}px; background: ${bg};`
    + ` color: ${warna}; font-size: ${fs}px; font-weight: 700; white-space: nowrap; ${bayang}`)}">`
    + `${icon ? ic(icon, 14, warna, 2.2) : ''}<span>${label}</span></span>`;
}

export function ikonTombol(nama, opt = {}) {
  const { bg = T.kertas, warna = T.redup, size = 44, bayang = SH.kecil } = opt;
  return `<span style="${S.row(0, ` justify-content: center; width: ${size}px; height: ${size}px;`
    + ` border-radius: 50%; background: ${bg}; flex: none; ${bayang}`)}">`
    + `${ic(nama, 19, warna, 2.2)}</span>`;
}

export function bar(pct, opt = {}) {
  const { jalur = '#ECE3DA', isiWarna = T.aksen, h = 6 } = opt;
  return `<span style="display: block; height: ${h}px; border-radius: ${R.pil}px;`
    + ` background: ${jalur}; overflow: hidden;">`
    + `<span style="display: block; width: ${pct}%; height: 100%; background: ${isiWarna};"></span></span>`;
}

/** Cincin progres. stroke-dashoffset adalah satu-satunya properti non-transform
    yang disepakati boleh dianimasikan (lihat BRAND-GUIDE bagian token gerak). */
export function cincin(pct, teks, opt = {}) {
  const { size = 48, sw = 5, warna = T.aksen, jalur = '#ECE3DA', tinta = T.tinta } = opt;
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return `<span style="position: relative; width: ${size}px; height: ${size}px; display: block; flex: none;">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${jalur}" stroke-width="${sw}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${warna}" stroke-width="${sw}"
        stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}"
        stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"/>
    </svg>
    <span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-family: ${JUDUL}; font-size: 12.5px; font-weight: 700; color: ${tinta};">${teks}</span>
  </span>`;
}

export function judulBagian(teks, kanan = '') {
  return `<div style="${S.row(0, ' justify-content: space-between; align-items: baseline;')}">
    <h3 style="font-size: 18px;">${teks}</h3>
    ${kanan ? `<span style="font-size: 12.5px; font-weight: 700; color: ${T.aksen};">${kanan}</span>` : ''}
  </div>`;
}

export function sakelar(on) {
  return `<span style="width: 48px; height: 28px; border-radius: ${R.pil}px; flex: none;
    background: ${on ? T.aksen : '#E4DAD0'}; position: relative; display: block;">
    <span style="position: absolute; top: 3px; ${on ? 'right: 3px;' : 'left: 3px;'}
      width: 22px; height: 22px; border-radius: 50%; background: ${T.kertas};
      box-shadow: 0 1px 3px rgba(46,39,36,.22);"></span>
  </span>`;
}

export function titik(n, aktif, opt = {}) {
  const { on = T.aksen, off = 'rgba(46,39,36,.18)' } = opt;
  const d = Array.from({ length: n }, (_, i) =>
    `<span style="width: ${i === aktif ? 24 : 8}px; height: 8px; border-radius: ${R.pil}px;`
    + ` background: ${i === aktif ? on : off}; display: block;"></span>`).join('');
  return `<div style="${S.row(7)}">${d}</div>`;
}

/** Baris daftar bergaya B: tanpa garis pemisah, jarak yang bicara. */
export function barisDaftar(icon, judul, opt = {}) {
  const { isi: sub = '', kanan = '', warna = T.tinta, bgIkon = T.aksenLembut, warnaIkon = T.aksen } = opt;
  return `<div style="${S.row(13, ' padding: 8px 0;')}">
    <span style="${S.row(0, ` justify-content: center; width: 36px; height: 36px; border-radius: 50%;`
      + ` background: ${bgIkon}; flex: none;`)}">${ic(icon, 17, warnaIkon, 2.1)}</span>
    <span style="${S.col(2, ' flex: 1; min-width: 0;')}">
      <b style="font-size: 14.5px; font-weight: 700; color: ${warna};">${judul}</b>
      ${sub ? `<span style="font-size: 11.5px; font-weight: 600; color: ${T.samar};">${sub}</span>` : ''}
    </span>
    ${kanan ? `<span style="font-size: 12.5px; font-weight: 700; color: ${T.samar};">${kanan}</span>` : ''}
    ${ic('chevron-right', 18, T.samar, 2.1)}
  </div>`;
}

/* ---------- navigasi bawah ---------- */
const NAV = [
  { icon: 'zap', label: 'Latihan' },
  { icon: 'school', label: 'KelasKu' },
  { icon: 'house', label: 'Hari ini' },
  { icon: 'route', label: 'Progres' },
  { icon: 'user-round', label: 'Profil' }
];
export const NAV_TH = ['ฝึกฝน', 'ห้องเรียน', 'วันนี้', 'คืบหน้า', 'โปรไฟล์'];

/* Label ditulis di bawah ikon — sengaja menyimpang dari sketsa arah B yang
   hanya berikon. Lima tujuan dengan ikon yang tidak jelas sendirinya
   (KelasKu vs Progres) tidak boleh bergantung pada tebakan, apalagi di aplikasi
   yang dipakai dua bahasa. */
export function nav(aktif, label = null) {
  const item = NAV.map((n, i) => {
    const on = i === aktif;
    const teks = label ? label[i] : n.label;
    return `<div style="${S.col(4, ' align-items: center; flex: 1; min-width: 0;')}">
      ${ic(n.icon, 21, on ? T.aksen : T.samar, on ? 2.4 : 1.9)}
      <span style="font-size: 9.5px; font-weight: ${on ? 700 : 600};
        color: ${on ? T.aksen : T.samar}; white-space: nowrap;">${teks}</span>
    </div>`;
  }).join('');
  return `<div style="position: absolute; left: 20px; right: 20px; bottom: 20px; height: 68px;
    background: ${T.kertas}; border-radius: 32px; ${SH.angkat}
    ${S.row(0, ' justify-content: space-between; padding: 0 8px;')}">${item}</div>`;
}
export const NAV_H = 88;
