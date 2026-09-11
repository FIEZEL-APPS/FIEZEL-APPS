/* Menulis semua artboard .dc.html + canvas.json, lalu memeriksa kontras teks. */
import { writeFileSync } from 'node:fs';
import { T, DOM } from './kit.mjs';
import * as A from './screens-1-auth.mjs';
import * as B from './screens-2-app.mjs';
import * as C from './screens-3-sesi.mjs';
import * as D from './screens-4-web.mjs';

const PH = { w: 390, h: 844 };
const AUTH = A.AUTH_SIZE;

/* file, pembuat, halaman, ukuran */
const ART = [
  ['Login', A.Login, 'page-1', AUTH],
  ['Daftar', A.Daftar, 'page-1', AUTH],
  ['Splash', A.Splash, 'page-1', PH],
  ['Intro1', A.Intro1, 'page-1', PH],
  ['Intro2', A.Intro2, 'page-1', PH],
  ['Intro3', A.Intro3, 'page-1', PH],
  ['ObNama', A.ObNama, 'page-1', PH],
  ['ObTujuan', A.ObTujuan, 'page-1', PH],
  ['ObTes', A.ObTes, 'page-1', PH],
  ['ObSelesai', A.ObSelesai, 'page-1', PH],

  ['Main', B.Main, 'page-2', PH],
  ['MainThai', B.MainTH, 'page-2', PH],
  ['Latihan', B.Latihan, 'page-2', PH],
  ['KelasKu', B.KelasKu, 'page-2', PH],
  ['Progres', B.Progres, 'page-2', PH],
  ['Profil', B.Profil, 'page-2', PH],
  ['Pengaturan', B.Pengaturan, 'page-2', PH],

  ['Peta', C.Peta, 'page-3', PH],
  ['Soal', C.Soal, 'page-3', PH],
  ['Benar', C.Benar, 'page-3', PH],
  ['Salah', C.Salah, 'page-3', PH],
  ['Hasil', C.Hasil, 'page-3', PH],
  ['TanyaMira', C.TanyaMira, 'page-3', PH],

  ['Landing', D.Landing, 'page-4', D.LANDING],
  ['Sistem', D.Sistem, 'page-4', D.SISTEM]
];

/* ---------- tata letak kanvas ---------- */
const GAP_X = 90, GAP_Y = 140;
const pos = {};
function deret(nama, x0, y0) {
  let x = x0;
  for (const n of nama) {
    const it = ART.find((a) => a[0] === n);
    pos[n] = { x, y: y0, w: it[3].w, h: it[3].h };
    x += it[3].w + GAP_X;
  }
}
deret(['Login', 'Daftar'], 0, 0);
deret(['Splash', 'Intro1', 'Intro2', 'Intro3', 'ObNama', 'ObTujuan', 'ObTes', 'ObSelesai'], 0, AUTH.h + GAP_Y);
deret(['Main', 'MainThai', 'Latihan', 'KelasKu', 'Progres', 'Profil', 'Pengaturan'], 0, 0);
deret(['Peta', 'Soal', 'Benar', 'Salah', 'Hasil', 'TanyaMira'], 0, 0);
deret(['Landing', 'Sistem'], 0, 0);

const canvas = {
  pages: [
    { id: 'page-1', name: 'Masuk & Perkenalan' },
    { id: 'page-2', name: 'Menu utama' },
    { id: 'page-3', name: 'Sesi belajar' },
    { id: 'page-4', name: 'Landing & sistem' }
  ],
  artboards: ART.map(([nama, , page]) => ({
    file: nama + '.dc.html', page,
    x: pos[nama].x, y: pos[nama].y, w: pos[nama].w, h: pos[nama].h,
    ...(nama === 'Landing' ? { print: 'flow' } : {})
  })),
  annotations: [
    {
      id: 'catatan-arah', page: 'page-1', x: 0, y: -150, w: 620,
      text: 'Arah "Ekspedisi" — bahasa tata letak dari tiga referensi (panel terbelah, blok warna '
        + 'penuh, tombol pil, titik indikator) dipasang di atas merek FIEZEL yang sudah ada: '
        + 'marun + emas dari panduan merek, hijau rimba + krem dari seni Mira & Nusa.\n'
        + 'Isian form mengikuti auth yang benar-benar ada di kode: nama + kata sandi, Google, '
        + 'Puter, dan lanjut tanpa akun. Tombol Google di sini penampung — aset resminya menyusul.'
    },
    {
      id: 'catatan-dwibahasa', page: 'page-2', x: 0, y: -150, w: 560,
      text: 'Hari ini dan Hari ini (Thai) memakai satu tata letak dengan dua bank copy, cerminan '
        + 'pasangan copy-id dan copy-th di app. Nilai Thai diambil dari bank yang sudah ada '
        + 'kalau kuncinya tersedia.\nSetiap teks di semua artboard harus mendarat sebagai '
        + 'pasangan kunci ID+TH waktu diimplementasi — belum ada kunci yang dibuat di tahap mock ini.'
    },
    {
      id: 'catatan-klaim', page: 'page-4', x: 0, y: -150, w: 560,
      text: 'Angka di landing memakai angka resmi panduan merek (129 grammar lesson / 3.225 soal, '
        + '1.765 kosakata, 300 bacaan / 1.500 soal, 36 listening + 36 speaking) tanpa dibulatkan, '
        + 'dan bagian "Apa yang FIEZEL tidak janjikan" menjaga aturan klaim jujur: tidak ada '
        + 'klaim offline penuh, jaminan hasil, atau sertifikasi CEFR.'
    }
  ],
  launch: { view: 'canvas', page: 'page-1' }
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
  ...Object.entries(DOM).map(([k, d]) => [`${k}: tinta pada blok`, d.ink, d.bg]),
  ['teks utama pada krem', T.ink, T.cream],
  ['teks redup pada krem', T.ink2, T.cream],
  ['teks samar pada kertas', T.ink3, T.paper],
  ['teks samar pada krem', T.ink3, T.cream],
  ['krem pada marun', T.cream, T.marun],
  ['matahari pada rimba', T.sun, T.rimba],
  ['matahari pada rimba dalam', T.sun, T.rimbaDeep],
  ['rimba dalam pada matahari', T.rimbaDeep, T.sun],
  ['ok pada ok-soft', T.ok, T.okSoft],
  ['bad pada bad-soft', T.bad, T.badSoft]
];
let gagal = 0;
for (const [nama, fg, bg] of cek) {
  const r = rasio(fg, bg);
  const tanda = r >= 4.5 ? 'AA ' : r >= 3 ? 'AA-besar' : 'KURANG';
  if (r < 4.5) gagal++;
  console.log(`  ${tanda.padEnd(9)} ${r.toFixed(2).padStart(5)}  ${nama}`);
}

/* Gagal-keras: gerbang yang cuma mencetak angka bukan gerbang. Artboard TIDAK
   ditulis kalau ada pasangan yang jatuh - perbaiki tokennya di kit.mjs dulu. */
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
