/**
 * FIEZEL — maskot dalam bentuk vektor.
 *
 * Sumbernya render 3D berbulu dari sheet desain. Vektor tidak bisa dan tidak seharusnya
 * meniru bulu itu helai per helai: yang ditiru adalah CIRI PENGENALNYA, karena itulah yang
 * membuat sebuah karakter dikenali di ukuran 24 piksel maupun 240 piksel.
 *
 * Ciri yang dipegang, sesuai sheet dan spesifikasi:
 * - telinga kiri terlipat, asimetris terhadap telinga kanan;
 * - bandana merah dengan liontin huruf F emas;
 * - ekor lebat berujung krem;
 * - mata amber besar dengan kilau;
 * - bintang emas kecil di dekat telinga;
 * - siluet bulu bergerigi lembut, bukan lingkaran halus - itu yang menyisakan kesan berbulu.
 *
 * Kenapa SVG inline dan bukan berkas gambar: aplikasi ini offline-first dengan CSP ketat,
 * dan maskotnya harus ikut tema serta bisa dianimasikan per bagian. Sebagai markup, tiap
 * bagian punya kelas sendiri sehingga telinga, ekor, tangan, dan kelopak mata dapat digerakkan
 * tanpa memuat aset tambahan.
 *
 * Warna diambil dari spesifikasi resmi, bukan dikira-kira dari gambar.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelMascot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Palet resmi FIEZEL_Complete_Design_Specification.
  var PALETTE = Object.freeze({
    maroon: '#7a1e2e',
    maroonDark: '#4a1119',
    cream: '#fdf3e2',
    white: '#ffffff',
    gold: '#d9a441',
    blush: '#f3e0e0',
    textPrimary: '#2c1b1c'
  });

  var POSES = Object.freeze(['wave', 'study', 'cheer', 'sleep', 'idle']);

  function escapeAttribute(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function normalizePose(pose) {
    var value = String(pose || '').toLowerCase();
    return POSES.indexOf(value) === -1 ? 'idle' : value;
  }

  /** Siluet badan bergerigi lembut: yang menyisakan kesan bulu tanpa menggambar bulu. */
  function bodyPath() {
    return 'M120 214c-33 0-58-9-70-27-9-13-11-30-6-47 4-15 6-28 4-41-2-14 2-27 12-37 3-3 4-7 3-11'
      + '-3-11 0-21 8-28 6-5 14-5 20 0 4 4 8 5 13 4 11-3 22-3 33 0 5 1 9 0 13-4 6-5 14-5 20 0'
      + '8 7 11 17 8 28-1 4 0 8 3 11 10 10 14 23 12 37-2 13 0 26 4 41 5 17 3 34-6 47-12 18-37 27-70 27z';
  }

  function chestPath() {
    return 'M120 212c-19 0-33-5-41-15-6-8-7-19-4-31 3-11 4-21 3-31 0-9 4-16 11-20 8-4 14-4 22-4'
      + 's14 0 22 4c7 4 11 11 11 20-1 10 0 20 3 31 3 12 2 23-4 31-8 10-22 15-41 15z';
  }

  /**
   * Satu maskot, satu markup. Bagian yang bergerak diberi kelas supaya animasi hidup di CSS -
   * lebih ringan daripada SMIL dan otomatis tunduk pada preferensi kurangi-gerak.
   */
  function svg(options) {
    var opts = options || {};
    var pose = normalizePose(opts.pose);
    var size = Number(opts.size) > 0 ? Math.round(Number(opts.size)) : 240;
    var title = escapeAttribute(opts.title || 'Maskot FIEZEL');
    var idPrefix = escapeAttribute(opts.idPrefix || ('fzm-' + pose));
    var decorative = opts.decorative === true;
    var accessibility = decorative
      ? 'role="presentation" aria-hidden="true"'
      : 'role="img" aria-label="' + title + '"';

    return '<svg class="fiezel-mascot fiezel-mascot-' + pose + '" viewBox="0 0 240 240" width="' + size + '" height="' + size + '"'
      + ' xmlns="http://www.w3.org/2000/svg" ' + accessibility + ' focusable="false">'
      + (decorative ? '' : '<title>' + title + '</title>')
      + '<defs>'
      + '<radialGradient id="' + idPrefix + '-fur" cx="42%" cy="34%" r="72%">'
      + '<stop offset="0%" stop-color="#9c2c40"/><stop offset="62%" stop-color="' + PALETTE.maroon + '"/>'
      + '<stop offset="100%" stop-color="' + PALETTE.maroonDark + '"/></radialGradient>'
      + '<radialGradient id="' + idPrefix + '-chest" cx="50%" cy="30%" r="70%">'
      + '<stop offset="0%" stop-color="' + PALETTE.white + '"/><stop offset="100%" stop-color="' + PALETTE.cream + '"/></radialGradient>'
      + '<radialGradient id="' + idPrefix + '-eye" cx="35%" cy="30%" r="70%">'
      + '<stop offset="0%" stop-color="#f0c979"/><stop offset="55%" stop-color="' + PALETTE.gold + '"/>'
      + '<stop offset="100%" stop-color="#a9721f"/></radialGradient>'
      + '</defs>'

      // Ekor lebat berujung krem. Diayun dari pangkalnya, jadi titik putarnya di badan.
      + '<g class="fzm-tail">'
      + '<path d="M186 196c22-6 33-24 30-45-3-19-18-31-33-28-11 2-17 12-15 22 2 8 9 13 16 11 5-1 8-6 7-11"'
      + ' fill="none" stroke="url(#' + idPrefix + '-fur)" stroke-width="26" stroke-linecap="round"/>'
      + '<path d="M191 141c-6 2-9 8-8 14" fill="none" stroke="' + PALETTE.cream + '" stroke-width="22" stroke-linecap="round"/>'
      + '</g>'

      // Badan dan dada.
      + '<path class="fzm-body" d="' + bodyPath() + '" fill="url(#' + idPrefix + '-fur)"/>'
      + '<path class="fzm-chest" d="' + chestPath() + '" fill="url(#' + idPrefix + '-chest)"/>'

      // Telinga kanan tegak.
      + '<g class="fzm-ear-right">'
      + '<path d="M156 74c6-16 15-27 24-25 9 2 12 16 8 32-2 9-6 16-11 20z" fill="url(#' + idPrefix + '-fur)"/>'
      + '<path d="M163 74c4-11 9-19 14-18 5 1 6 11 3 22z" fill="' + PALETTE.blush + '"/>'
      + '</g>'
      // Telinga kiri TERLIPAT - ciri asimetris yang membuat karakter ini dikenali.
      + '<g class="fzm-ear-left">'
      + '<path d="M84 74c-7-15-17-25-26-22-8 3-10 15-5 29 2 6 5 11 9 15z" fill="url(#' + idPrefix + '-fur)"/>'
      + '<path d="M62 60c-5 6-4 15 2 21 5 5 13 6 18 2-8-2-15-10-20-23z" fill="' + PALETTE.maroonDark + '"/>'
      + '</g>'

      // Kepala.
      + '<path class="fzm-head" d="M120 40c-30 0-52 19-56 45-2 12 1 24 8 34 11 15 28 23 48 23s37-8 48-23'
      + 'c7-10 10-22 8-34-4-26-26-45-56-45z" fill="url(#' + idPrefix + '-fur)"/>'
      + '<path class="fzm-muzzle" d="M120 92c-19 0-33 11-36 27-2 12 4 23 15 29 6 3 13 5 21 5s15-2 21-5'
      + 'c11-6 17-17 15-29-3-16-17-27-36-27z" fill="url(#' + idPrefix + '-chest)"/>'

      // Mata. Kelopaknya elemen tersendiri supaya berkedip tanpa menggambar ulang mata.
      + '<g class="fzm-eyes">'
      + '<ellipse class="fzm-eye" cx="100" cy="96" rx="15" ry="17" fill="url(#' + idPrefix + '-eye)"/>'
      + '<ellipse class="fzm-eye" cx="140" cy="96" rx="15" ry="17" fill="url(#' + idPrefix + '-eye)"/>'
      + '<ellipse cx="100" cy="98" rx="8" ry="11" fill="' + PALETTE.textPrimary + '"/>'
      + '<ellipse cx="140" cy="98" rx="8" ry="11" fill="' + PALETTE.textPrimary + '"/>'
      + '<circle cx="95" cy="90" r="4" fill="' + PALETTE.white + '"/>'
      + '<circle cx="135" cy="90" r="4" fill="' + PALETTE.white + '"/>'
      + '<g class="fzm-lids">'
      + '<path class="fzm-lid" d="M85 96a15 17 0 0 1 30 0z" fill="url(#' + idPrefix + '-fur)"/>'
      + '<path class="fzm-lid" d="M125 96a15 17 0 0 1 30 0z" fill="url(#' + idPrefix + '-fur)"/>'
      + '</g>'
      + '</g>'

      // Hidung, mulut, pipi.
      + '<path d="M120 112c-5 0-9 3-9 7 0 4 4 7 9 7s9-3 9-7c0-4-4-7-9-7z" fill="#e79aa4"/>'
      + '<path class="fzm-mouth" d="M110 128c4 6 16 6 20 0" fill="none" stroke="' + PALETTE.maroonDark
      + '" stroke-width="3" stroke-linecap="round"/>'
      + '<circle class="fzm-blush" cx="82" cy="116" r="8" fill="' + PALETTE.blush + '" opacity=".85"/>'
      + '<circle class="fzm-blush" cx="158" cy="116" r="8" fill="' + PALETTE.blush + '" opacity=".85"/>'

      // Bandana dan liontin huruf F.
      + '<path class="fzm-bandana" d="M88 150c10 8 21 12 32 12s22-4 32-12l-8 20c-7 5-15 8-24 8s-17-3-24-8z"'
      + ' fill="' + PALETTE.maroon + '"/>'
      + '<circle cx="120" cy="176" r="11" fill="' + PALETTE.gold + '"/>'
      + '<text x="120" y="181" text-anchor="middle" font-family="Fredoka, Segoe UI, sans-serif"'
      + ' font-size="14" font-weight="700" fill="' + PALETTE.maroonDark + '">F</text>'

      // Kaki depan.
      + '<ellipse cx="96" cy="206" rx="16" ry="11" fill="url(#' + idPrefix + '-chest)"/>'
      + '<ellipse cx="144" cy="206" rx="16" ry="11" fill="url(#' + idPrefix + '-chest)"/>'

      // Tangan melambai - hanya bermakna pada pose wave, tetapi selalu ada supaya markupnya
      // satu dan animasinya cukup diatur lewat kelas.
      + '<g class="fzm-arm">'
      + '<path d="M64 150c-12-6-20-18-19-30" fill="none" stroke="url(#' + idPrefix + '-fur)"'
      + ' stroke-width="20" stroke-linecap="round"/>'
      + '<circle cx="44" cy="116" r="14" fill="url(#' + idPrefix + '-chest)"/>'
      + '<circle cx="44" cy="116" r="6" fill="#e79aa4" opacity=".8"/>'
      + '</g>'

      // Bintang emas: penanda merek yang berkelip.
      + '<path class="fzm-star" d="M176 54l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="' + PALETTE.gold + '"/>'

      // Tanda tidur, hanya terlihat pada pose sleep.
      + '<g class="fzm-zzz" aria-hidden="true">'
      + '<text x="176" y="86" font-family="Fredoka, Segoe UI, sans-serif" font-size="18" font-weight="600"'
      + ' fill="' + PALETTE.maroon + '">z</text>'
      + '<text x="192" y="70" font-family="Fredoka, Segoe UI, sans-serif" font-size="14" font-weight="600"'
      + ' fill="' + PALETTE.maroon + '" opacity=".8">z</text>'
      + '</g>'
      + '</svg>';
  }

  return {
    PALETTE: PALETTE,
    POSES: POSES,
    svg: svg,
    normalizePose: normalizePose
  };
});
