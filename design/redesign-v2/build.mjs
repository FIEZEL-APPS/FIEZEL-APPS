/* Menulis semua artboard .dc.html + canvas.json untuk arah "Lembut" (arah B,
   dipilih owner), lalu memeriksa kontras teks.

   Landing page website SENGAJA TIDAK ADA di sini — owner meminta redesain
   dibatasi ke aplikasi saja. */
import { writeFileSync } from 'node:fs';
import { T, D } from './b-kit.mjs';
import * as A from './b-auth.mjs';
import * as M from './b-menu.mjs';
import * as S from './b-sesi.mjs';
import * as Y from './b-sistem.mjs';

const PH = { w: 390, h: 844 };

/* file, pembuat, halaman, ukuran. Main.dc.html adalah artboard pintu masuk. */
const ART = [
  ['Main', M.Main, 'page-menu', PH],
  ['MainThai', M.MainThai, 'page-menu', PH],
  ['Latihan', M.Latihan, 'page-menu', PH],
  ['KelasKu', M.KelasKu, 'page-menu', PH],
  ['Progres', M.Progres, 'page-menu', PH],
  ['Profil', M.Profil, 'page-menu', PH],
  ['Pengaturan', M.Pengaturan, 'page-menu', PH],

  ['Login', A.Login, 'page-auth', A.AUTH],
  ['Daftar', A.Daftar, 'page-auth', A.AUTH],
  ['Splash', A.Splash, 'page-auth', PH],
  ['Intro1', A.Intro1, 'page-auth', PH],
  ['Intro2', A.Intro2, 'page-auth', PH],
  ['Intro3', A.Intro3, 'page-auth', PH],
  ['ObNama', A.ObNama, 'page-auth', PH],
  ['ObTujuan', A.ObTujuan, 'page-auth', PH],
  ['ObTes', A.ObTes, 'page-auth', PH],
  ['ObSelesai', A.ObSelesai, 'page-auth', PH],

  ['Peta', S.Peta, 'page-sesi', PH],
  ['Soal', S.Soal, 'page-sesi', PH],
  ['Benar', S.Benar, 'page-sesi', PH],
  ['Salah', S.Salah, 'page-sesi', PH],
  ['Hasil', S.Hasil, 'page-sesi', PH],
  ['TanyaMira', S.TanyaMira, 'page-sesi', PH],

  ['Sistem', Y.Sistem, 'page-sistem', Y.SISTEM]
];

/* ---------- tata letak kanvas ---------- */
const GAP_X = 90, GAP_Y = 150;
const pos = {};
function deret(nama, x0, y0) {
  let x = x0;
  for (const n of nama) {
    const it = ART.find((a) => a[0] === n);
    if (!it) throw new Error('artboard tidak dikenal di tata letak: ' + n);
    pos[n] = { x, y: y0, w: it[3].w, h: it[3].h };
    x += it[3].w + GAP_X;
  }
}
deret(['Main', 'MainThai', 'Latihan', 'KelasKu', 'Progres', 'Profil', 'Pengaturan'], 0, 0);
deret(['Login', 'Daftar'], 0, 0);
deret(['Splash', 'Intro1', 'Intro2', 'Intro3', 'ObNama', 'ObTujuan', 'ObTes', 'ObSelesai'],
  0, A.AUTH.h + GAP_Y);
deret(['Peta', 'Soal', 'Benar', 'Salah', 'Hasil', 'TanyaMira'], 0, 0);
deret(['Sistem'], 0, 0);

const canvas = {
  pages: [
    { id: 'page-menu', name: 'Menu utama' },
    { id: 'page-auth', name: 'Masuk & Perkenalan' },
    { id: 'page-sesi', name: 'Sesi belajar' },
    { id: 'page-sistem', name: 'Sistem desain' }
  ],
  artboards: ART.map(([nama, , page]) => ({
    file: nama + '.dc.html', page,
    x: pos[nama].x, y: pos[nama].y, w: pos[nama].w, h: pos[nama].h
  })),
  annotations: [
    {
      id: 'catatan-arah', page: 'page-menu', x: 0, y: -190, w: 700,
      text: 'Arah "Lembut" (arah B) — dipilih owner dari empat arah.\n'
        + 'Tidak ada garis tepi di mana pun: kedalaman datang dari bayangan halus dan ruang '
        + 'kosong. Huruf Quicksand untuk judul, Nunito untuk badan, Noto Sans Thai di '
        + 'belakangnya karena keduanya tidak punya glif Thai. Pastel diredam, dan elemen per '
        + 'layar sengaja lebih sedikit daripada yang muat.\n'
        + 'Landing page website tidak ada di kanvas ini — redesain dibatasi ke aplikasi.'
    },
    {
      id: 'catatan-maskot', page: 'page-sesi', x: 0, y: -190, w: 660,
      text: 'Lima aturan maskot, lahir dari dua temuan owner.\n'
        + '"Badannya bocor": gambar dipasang dengan offset negatif di dalam wadah pemotong. '
        + 'Sekarang maskot berdiri di panggung seukuran rasio aspeknya sendiri, tanpa offset '
        + 'negatif, dan wadahnya tidak boleh lebih pendek dari panggungnya. Hiasan warna '
        + 'memakai gradasi yang meluruh, bukan bentuk padat yang dipotong wadah.\n'
        + '"Mascot di Tanya Mira jelek sekali": pose head-explain dipakai sebagai avatar 34px '
        + 'di tiap gelembung — komposisinya lebar, jadi wajahnya tinggal belasan piksel. '
        + 'Sekarang ada ambang keras 72px: di bawah itu dipakai cap kaki atau inisial, bukan '
        + 'wajah yang diperkecil. Tanya Mira menampilkan Mira SEKALI di kartu pembuka pada '
        + '118px, dan gelembung sesudahnya tidak memakai wajah sama sekali.'
    },
    {
      id: 'catatan-dwibahasa', page: 'page-menu', x: 780, y: -190, w: 520,
      text: 'Hari ini dan Hari ini (Thai) memakai satu tata letak dengan dua bank copy, '
        + 'cerminan pasangan berkas copy-id dan copy-th di app.\n'
        + 'Setiap teks di semua artboard harus mendarat sebagai pasangan kunci ID+TH waktu '
        + 'diimplementasi — belum ada kunci yang dibuat di tahap mock ini.'
    }
  ],
  launch: { view: 'canvas', page: 'page-menu' }
};

/* ---------- kontras ---------- */
function lum(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function rasio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const cek = [
  ...Object.entries(D).map(([k, d]) => [`${k}: tinta pada blok`, d.ink, d.bg]),
  ['tinta pada latar', T.tinta, T.bg],
  ['tinta pada kertas', T.tinta, T.kertas],
  ['redup pada latar', T.redup, T.bg],
  ['redup pada kertas', T.redup, T.kertas],
  ['samar pada latar', T.samar, T.bg],
  ['samar pada kertas', T.samar, T.kertas],
  ['aksen pada kertas', T.aksen, T.kertas],
  ['putih pada aksen', '#FFFFFF', T.aksen],
  ['aksen pada aksen-lembut', T.aksen, T.aksenLembut],
  ['ok pada ok-lembut', T.ok, T.okLembut],
  ['bad pada bad-lembut', T.bad, T.badLembut],
  ['emas pada emas-lembut', T.emas, T.emasLembut],
  ['emas pada kertas', T.emas, T.kertas]
];
let gagal = 0;
for (const [nama, fg, bg] of cek) {
  const r = rasio(fg, bg);
  const tanda = r >= 4.5 ? 'AA ' : r >= 3 ? 'AA-besar' : 'KURANG';
  if (r < 4.5) gagal++;
  console.log(`  ${tanda.padEnd(9)} ${r.toFixed(2).padStart(5)}  ${nama}`);
}

/* Gagal-keras: gerbang yang cuma mencetak angka bukan gerbang. Artboard TIDAK
   ditulis kalau ada pasangan yang jatuh — perbaiki tokennya di b-kit.mjs dulu. */
if (gagal > 0) {
  console.error(`\nGAGAL: ${gagal} pasangan warna di bawah 4.5:1. Artboard tidak ditulis.`);
  process.exit(1);
}

/* ---------- tulis ---------- */
/* Spasi di ujung baris ditanggalkan saat menulis: `git diff --check` di gerbang
   A9/A10 menolaknya, dan template literal gampang meninggalkannya. */
const rapikan = (teks) => teks.split('\n').map((b) => b.replace(/[ \t]+$/, '')).join('\n');

for (const [nama, buat] of ART) writeFileSync(nama + '.dc.html', rapikan(buat()));
writeFileSync('canvas.json', JSON.stringify(canvas, null, 2) + '\n');
console.log(`\n${ART.length} artboard + canvas.json ditulis. ${gagal} pasangan di bawah 4.5:1.`);
