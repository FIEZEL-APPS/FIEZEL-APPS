/**
 * FIEZEL — maskot resmi (Percik).
 *
 * m025-78: OWNER mengirim tujuh gambar produksi baru (`D:\png`) - kualitas jauh di atas
 * potongan sheet PDF yang dipakai m025-76/77, latar sudah transparan, dan menyertakan
 * pose yang sebelumnya harus digambar ulang dengan tangan. Enam pose dan tiga ukuran ikon
 * aplikasi di bawah berasal dari situ. Empat pose (`hero`, `belajar`, `mark`, `mengintip`)
 * TIDAK ada penggantinya di kiriman baru, jadi tetap memakai potongan sheet PDF lama -
 * kualitasnya tidak seragam dengan yang lain, dan itu ditulis di sini supaya tidak
 * dilupakan, bukan disembunyikan. Kalau OWNER mengirim penggantinya, keempatnya tinggal
 * diganti tanpa mengubah API modul ini.
 *
 * Proses aset baru: potong rapat (trim latar transparan), perkecil dengan Lanczos-3
 * (bukan bilinear - tepi ilustrasi bergaris tetap tegas, bukan lembek) dengan alpha
 * dikalikan dulu sebelum diskalakan supaya warna piksel transparan tidak merembes ke
 * tepi karakter, lalu dipalet 256 warna (PNG-8) karena ilustrasi ini bidang warna rata -
 * bentuk yang paling rugi disimpan sebagai RGBA penuh. Hasilnya turun tujuh kali lipat
 * dari sumbernya tanpa kehilangan yang terlihat mata, dan seluruh aset ini ikut ke shell
 * offline sehingga ukurannya dibayar ulang oleh setiap pemasangan.
 *
 * Konsekuensi yang harus tetap diketahui:
 *
 * - Aset ini RASTER, bukan vektor. Spesifikasi desain (`FIEZEL_Complete_Design_Specification.pdf`,
 *   bagian 15) menggambarkan `percik-mascot.svg` dengan bagian tubuh terkelompok terpisah
 *   (mata, telinga, tangan) supaya bisa dianimasikan sendiri-sendiri - kedip mata, telinga
 *   bergoyang, tangan melambai per bagian. Yang kita punya adalah gambar utuh yang sudah
 *   digabung, jadi animasi di sini SELALU menggerakkan seluruh gambar (mengambang, miring,
 *   memantul, menskala), tidak pernah bagian tunggal. Ini didokumentasikan lagi di
 *   `style.css`, bukan diam-diam dilewati.
 * - Untuk ikon aplikasi 1024x1024 dan animasi per-bagian yang sesungguhnya, dibutuhkan
 *   berkas master vektor (AI/EPS/SVG). Sampai itu ada, `fiezel-icon-512.png` (512x512,
 *   dipotong penuh bidang tanpa transparansi, aman jadi ikon maskable) adalah yang
 *   paling tinggi resolusinya yang tersedia.
 *
 * Aturan produksi yang dijaga di sini: jangan merentangkan, jangan mewarnai ulang, jangan
 * mencerminkan, jangan memotong wajah. Karena itu gambar selalu ditampilkan dengan rasio
 * aslinya dan tanpa filter warna.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelMascot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Palet resmi dari FIEZEL_Complete_Design_Specification.pdf, bagian 2 (Color Palette).
  // Dipakai UI di sekitar maskot; maskotnya sendiri tidak pernah diwarnai ulang oleh kode.
  var PALETTE = Object.freeze({
    bg: '#efe3d3',
    primary: '#7a1e2e',
    deep: '#4a1119',
    paper: '#fdf3e2',
    cream: '#fdf3e2',
    gold: '#d9a441',
    soft: '#f3e0e0',
    line: '#ecdec0',
    ink: '#2c1b1c',
    inkMuted: '#6e5a4f',
    white: '#ffffff'
  });

  var BASE = './assets/brand/';

  var POSES = Object.freeze({
    // --- Kiriman baru (m025-78), langsung dari D:\png ---
    semangat: { file: 'fiezel-semangat.png', width: 620, height: 712, label: 'Percik melambai sambil memegang pensil' },
    coding: { file: 'fiezel-coding.png', width: 620, height: 737, label: 'Percik berlatih di depan laptop' },
    istirahat: { file: 'fiezel-istirahat.png', width: 620, height: 492, label: 'Percik tidur nyenyak di atas bantal' },
    jadwal: { file: 'fiezel-jadwal.png', width: 620, height: 703, label: 'Percik membawa jam dan kalender' },
    pencapaian: { file: 'fiezel-pencapaian.png', width: 620, height: 808, label: 'Percik membawa piala kemenangan' },
    menulis: { file: 'fiezel-menulis.png', width: 620, height: 828, label: 'Percik mengerjakan soal' },
    icon: { file: 'fiezel-icon-512.png', width: 512, height: 512, label: 'Ikon FIEZEL' },
    // --- Potongan sheet PDF lama (m025-76/77) - belum ada penggantinya ---
    hero: { file: 'fiezel-hero.png', width: 240, height: 311, label: 'Percik melambai menyapa' },
    belajar: { file: 'fiezel-belajar.png', width: 170, height: 180, label: 'Percik sedang membaca' },
    mark: { file: 'fiezel-mark.png', width: 92, height: 106, label: 'Tanda F FIEZEL' },
    mengintip: { file: 'fiezel-mengintip.png', width: 96, height: 71, label: 'Percik mengintip' }
  });

  var DEFAULT_POSE = 'hero';

  function normalizePose(pose) {
    var value = String(pose || '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(POSES, value) ? value : DEFAULT_POSE;
  }

  function escapeAttribute(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /**
   * Markup satu maskot. Lebar boleh diatur; tingginya selalu mengikuti rasio asli, karena
   * aturan produksi melarang merentangkan karakter ini.
   */
  function markup(options) {
    var opts = options || {};
    var pose = normalizePose(opts.pose);
    var art = POSES[pose];
    var width = Number(opts.width) > 0 ? Math.round(Number(opts.width)) : art.width;
    var height = Math.round(width * (art.height / art.width));
    var decorative = opts.decorative === true;
    var alt = decorative ? '' : escapeAttribute(opts.alt || art.label);
    var extraClass = opts.className ? ' ' + escapeAttribute(opts.className) : '';

    return '<img class="fiezel-mascot fiezel-mascot-' + pose + extraClass + '"'
      + ' src="' + BASE + art.file + '"'
      + ' width="' + width + '" height="' + height + '"'
      + ' alt="' + alt + '"'
      + (decorative ? ' aria-hidden="true" role="presentation"' : '')
      + ' draggable="false" decoding="async">';
  }

  /** Daftar berkas, dipakai gate rilis untuk memastikan semuanya ikut ke shell offline. */
  function files() {
    return Object.keys(POSES).map(function (key) { return BASE + POSES[key].file; });
  }

  return {
    PALETTE: PALETTE,
    POSES: POSES,
    BASE: BASE,
    normalizePose: normalizePose,
    markup: markup,
    files: files
  };
});
