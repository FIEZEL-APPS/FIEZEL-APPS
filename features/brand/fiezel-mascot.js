/**
 * FIEZEL — maskot resmi.
 *
 * Modul ini memakai KARYA ASLI dari `FIEZEL_Design_Handoff_Detail.pdf`, dipotong langsung
 * dari sheet-nya, bukan digambar ulang.
 *
 * Versi sebelumnya (m025-75) mencoba menuliskan ulang karakter ini sebagai jalur SVG buatan
 * sendiri. OWNER menolaknya, dan penolakan itu benar: ilustrasi bergaya lukis dengan bulu,
 * gradasi, dan garis tangan tidak bisa disamai dengan jalur yang ditulis manual, dan hasil
 * yang "mirip-mirip" justru merusak merek. Yang bisa persis hanyalah pikselnya sendiri.
 *
 * Konsekuensi yang harus diketahui, bukan disembunyikan:
 *
 * - Aset ini RASTER, bukan vektor. Sumber di PDF berukuran terbatas (hero 286 px pada
 *   kualitas tertinggi yang tersedia), jadi pada layar 3x ia akan terlihat sedikit lembut
 *   bila ditampilkan jauh lebih besar dari ukuran tayang yang direncanakan.
 * - Untuk vektor sejati dan ikon 1024x1024, dibutuhkan berkas master (AI/EPS/SVG) - dan
 *   handoff itu sendiri sudah memintanya pada halaman logo. Sampai master itu ada, ini
 *   adalah kemiripan paling tinggi yang mungkin: karyanya sendiri.
 *
 * Aturan produksi dari handoff yang dijaga di sini: jangan merentangkan, jangan mewarnai
 * ulang, jangan mencerminkan, jangan memotong wajah. Karena itu gambar selalu ditampilkan
 * dengan rasio aslinya dan tanpa filter warna.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelMascot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Palet resmi handoff. Dipakai UI di sekitar maskot; maskotnya sendiri tidak pernah diwarnai
  // ulang oleh kode.
  var PALETTE = Object.freeze({
    primary: '#7a1e2e',
    deep: '#4a1119',
    cream: '#fdf3e8',
    gold: '#d9a441',
    white: '#ffffff'
  });

  var BASE = './assets/brand/';

  // Setiap pose adalah potongan nyata dari sheet, dengan ukuran aslinya. Rasio disimpan supaya
  // markup bisa memesan ruang sebelum gambar termuat - tanpa itu layar akan tersentak.
  //
  // Semua teks anotasi dari sheet (judul baris, keterangan pose, "WARNA PALET") sudah dipotong
  // keluar: yang tersisa hanya karakter dan tanda mereknya, dengan latar transparan.
  var POSES = Object.freeze({
    hero: { file: 'fiezel-hero.png', width: 240, height: 311, label: 'Maskot FIEZEL melambai' },
    belajar: { file: 'fiezel-belajar.png', width: 78, height: 87, label: 'Maskot FIEZEL sedang membaca' },
    semangat: { file: 'fiezel-semangat.png', width: 73, height: 95, label: 'Maskot FIEZEL memegang pensil' },
    coding: { file: 'fiezel-coding.png', width: 70, height: 88, label: 'Maskot FIEZEL di depan laptop' },
    pencapaian: { file: 'fiezel-pencapaian.png', width: 78, height: 99, label: 'Maskot FIEZEL membawa piala' },
    istirahat: { file: 'fiezel-istirahat.png', width: 73, height: 66, label: 'Maskot FIEZEL beristirahat' },
    mark: { file: 'fiezel-mark.png', width: 92, height: 106, label: 'Tanda F FIEZEL' },
    icon: { file: 'fiezel-icon.png', width: 64, height: 64, label: 'Ikon FIEZEL' }
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
   * handoff melarang merentangkan karakter ini.
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
