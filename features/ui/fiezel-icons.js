/**
 * FIEZEL m025-115 - set ikon duotone milik FIEZEL sendiri.
 *
 * Brief redesign OWNER, bagian 4: "Ganti seluruh ikon generik (bottom nav, ikon modul
 * Grammar/Vocab/Reading) dari outline system-icon menjadi satu set ikon custom duotone
 * yang konsisten: garis + isian warna aksen, sudut membulat, terasa dirancang khusus
 * untuk FIEZEL - bukan dari icon library umum. Ini salah satu titik ungkit termurah untuk
 * mengubah kesan dari 'template' menjadi 'eksklusif' - prioritaskan."
 *
 * Aturan gambar, dipegang seluruh set supaya terbaca satu keluarga:
 *   - kanvas 24x24, semua bentuk hidup di dalam kotak 3..21 (tidak menyentuh tepi);
 *   - SATU bidang pastel (.fz-fill) per ikon, sisanya garis coklat (.fz-line);
 *   - tebal garis 1,7 dan seluruh ujung membulat - inilah yang membuat set ini terbaca
 *     hangat, bukan teknis;
 *   - tidak ada warna yang dipaku di dalam SVG. Warnanya datang dari CSS
 *     (--fz-i-fill / --fz-i-line), jadi ikon aktif di tab bar cukup ganti dua variabel,
 *     dan mode gelap ikut sendiri.
 *
 * Lucide TIDAK dilepas: ia masih dipakai untuk ikon sekali-pakai di dalam layar (panah,
 * centang, ikon pengaturan). Yang pindah ke set ini adalah kroma yang dilihat murid tiap
 * hari - tab bar, kartu modul, kartu skill, dan wajah pembimbing.
 */
(function (global) {
  'use strict';

  var ICONS = {
    /**
     * m025-128 PAW - maskot pembimbing FIEZEL. Arah 02, dipilih OWNER dari lima arah.
     *
     * KENAPA BENTUKNYA BEGINI. Keempat jarinya bukan bulatan melainkan balok bersudut
     * bulat dengan tinggi berbeda - bentuk yang sudah ada di logotype FIEZEL sendiri (dua
     * balok emas di antara hurufnya, yang juga jadi ikon "Tanya FIEZEL" di topbar). Itulah
     * klaim otentisitas yang diminta brief A.3: bentuknya tidak dipinjam dari icon library
     * mana pun, ia diambil dari wordmark FIEZEL. Sebagai bonus ia terbaca sebagai gelombang
     * suara naik - Listening dan Speaking - tanpa satu elemen tambahan.
     *
     * KENAPA PEKAT, BUKAN DUOTONE seperti ikon lain di berkas ini. PAW bukan ikon UI, ia
     * MARKA - sekelas wordmark, bukan sekelas tombol. Lagi pula bidangnya duduk di atas
     * lingkaran --yellow, dan .fz-fill default-nya juga --yellow: duotone di sini berarti
     * bantalannya hilang. Warnanya tetap tidak dipaku; ia mengikuti --fz-i-line.
     *
     * Tiap balok punya kelasnya sendiri karena sistem gerak per-halaman (style.css,
     * "PAW - gerak per halaman") menggerakkannya satu per satu.
     */
    paw: '<g class="fz-paw">' +
      '<rect class="fz-paw-bar" x="4.6" y="7.5" width="3.1" height="4.6" rx="1.55"/>' +
      '<rect class="fz-paw-bar" x="8.9" y="5.1" width="3.1" height="7" rx="1.55"/>' +
      '<rect class="fz-paw-bar" x="13.2" y="3.4" width="3.1" height="8.7" rx="1.55"/>' +
      '<rect class="fz-paw-bar" x="17.5" y="6.2" width="3.1" height="5.9" rx="1.55"/>' +
      '<path class="fz-paw-pad" d="M12.6 14c3.5 0 5.9 1.9 5.9 4.1 0 2-2 3.4-5.9 3.4s-5.9-1.4-5.9-3.4c0-2.2 2.4-4.1 5.9-4.1Z"/>' +
      '</g>',
    /* Tab bar */
    home: '<path class="fz-fill" d="M5 11.2 12 5.4l7 5.8V19a1.2 1.2 0 0 1-1.2 1.2H6.2A1.2 1.2 0 0 1 5 19z"/>' +
      '<path class="fz-line" d="M4 11.6 12 5l8 6.6"/><path class="fz-line" d="M6.2 11.4V19c0 .55.45 1 1 1h9.6c.55 0 1-.45 1-1v-7.6"/>' +
      '<path class="fz-line" d="M10.2 20v-4.3c0-.55.45-1 1-1h1.6c.55 0 1 .45 1 1V20"/>',
    vocab: '<path class="fz-fill" d="M6.4 4.6h9.4c1 0 1.8.8 1.8 1.8v11.4c0 1-.8 1.8-1.8 1.8H6.4z"/>' +
      '<path class="fz-line" d="M6.4 4.6h9.9c1 0 1.7.8 1.7 1.8v11.2c0 1-.7 1.8-1.7 1.8H6.4a1.6 1.6 0 0 1-1.6-1.6V6.2c0-.9.7-1.6 1.6-1.6z"/>' +
      '<path class="fz-line" d="M9 15.2 11.6 8.6l2.6 6.6M9.9 13.2h3.4"/>',
    grammar: '<rect class="fz-fill" x="4.6" y="6" width="14.8" height="10.4" rx="3.2"/>' +
      '<path class="fz-line" d="M4.8 9.2c0-1.8 1.4-3.2 3.2-3.2h8c1.8 0 3.2 1.4 3.2 3.2v4c0 1.8-1.4 3.2-3.2 3.2h-4.4L8 19.4v-3h-.2c-1.8 0-3.2-1.4-3.2-3.2z"/>' +
      '<path class="fz-line" d="M8.6 11.2h2.6M13.2 11.2h2.2"/>',
    reading: '<path class="fz-fill" d="M12 7.4C10.4 6.1 8.6 5.6 5.4 5.6v11.2c3.2 0 5 .5 6.6 1.8z"/>' +
      '<path class="fz-line" d="M12 7.4C10.4 6.1 8.6 5.6 5.4 5.6a.9.9 0 0 0-.9.9v9.6c0 .5.4.9.9.9 3.1 0 4.9.5 6.6 1.6"/>' +
      '<path class="fz-line" d="M12 7.4c1.6-1.3 3.4-1.8 6.6-1.8.5 0 .9.4.9.9v9.6c0 .5-.4.9-.9.9-3.1 0-4.9.5-6.6 1.6V7.4z"/>',
    map: '<path class="fz-fill" d="M8.6 4.8 15 7.4l4.4-2v11.8l-4.4 2L8.6 16.6l-4 1.8V6.6z"/>' +
      '<path class="fz-line" d="m9 4.8 6 2.6 4.2-1.9c.4-.2.8.1.8.5v10.7c0 .2-.1.4-.3.5L15 19.2l-6-2.6-4.2 1.9a.5.5 0 0 1-.8-.5V7.3c0-.2.1-.4.3-.5z"/>' +
      '<path class="fz-line" d="M9 4.8v11.8M15 7.4v11.8"/>',
    /* Empat skill inti tes */
    listening: '<path class="fz-fill" d="M7.6 10.6a4.4 4.4 0 1 1 8.8 0c0 2-1 2.7-1.8 3.6-.7.8-1 1.5-1 2.6a2.2 2.2 0 0 1-4.4 0z"/>' +
      '<path class="fz-line" d="M7.6 10.4a4.4 4.4 0 0 1 8.8.2c0 2-1 2.7-1.8 3.6-.7.8-1 1.5-1 2.6a2.2 2.2 0 0 1-4.3.5"/>' +
      '<path class="fz-line" d="M10.4 10.6a1.7 1.7 0 0 1 3.2.4"/><path class="fz-line" d="M19 8.2c.8 1.2 1.2 2.5 1.2 3.9"/>',
    speaking: '<rect class="fz-fill" x="9.4" y="3.6" width="5.2" height="9.4" rx="2.6"/>' +
      '<rect class="fz-line" x="9.4" y="3.6" width="5.2" height="9.4" rx="2.6"/>' +
      '<path class="fz-line" d="M6.4 11.4a5.6 5.6 0 0 0 11.2 0M12 17v3.2M9.4 20.2h5.2"/>',
    reading_skill: '<path class="fz-fill" d="M5.4 5.6h6.6v12.9c-1.6-1.1-3.4-1.6-6.6-1.6z"/>' +
      '<path class="fz-line" d="M12 7.4C10.4 6.1 8.6 5.6 5.4 5.6a.9.9 0 0 0-.9.9v9.6c0 .5.4.9.9.9 3.1 0 4.9.5 6.6 1.6 1.7-1.1 3.5-1.6 6.6-1.6.5 0 .9-.4.9-.9V6.5a.9.9 0 0 0-.9-.9c-3.2 0-5 .5-6.6 1.8z"/>' +
      '<path class="fz-line" d="M12 7.4v11.6"/>',
    writing: '<path class="fz-fill" d="m13.4 6.2 4.4 4.4-7.6 7.6-4.4.9.9-4.4z"/>' +
      '<path class="fz-line" d="m14.6 5 4.4 4.4M13.4 6.2l4.4 4.4-7.6 7.6-4.4.9.9-4.4z"/>' +
      '<path class="fz-line" d="M4.6 20.4h7.2"/>',
    /* Modul pendukung */
    library: '<path class="fz-fill" d="M5.4 6h4v13h-4zM11 6h3.4v13H11z"/>' +
      '<path class="fz-line" d="M5.4 6.9c0-.5.4-.9.9-.9h2.2c.5 0 .9.4.9.9v11.2c0 .5-.4.9-.9.9H6.3a.9.9 0 0 1-.9-.9z"/>' +
      '<path class="fz-line" d="M11 6.9c0-.5.4-.9.9-.9h1.6c.5 0 .9.4.9.9v11.2c0 .5-.4.9-.9.9h-1.6a.9.9 0 0 1-.9-.9z"/>' +
      '<path class="fz-line" d="m16.4 7.6 1.7-.4c.5-.1 1 .2 1.1.7l2 9.6c.1.5-.2 1-.7 1.1l-1.4.3"/>',
    classroom: '<rect class="fz-fill" x="4.4" y="5" width="15.2" height="10" rx="2.4"/>' +
      '<rect class="fz-line" x="4.4" y="5" width="15.2" height="10" rx="2.4"/>' +
      '<path class="fz-line" d="M12 15v3.4M8.6 18.4h6.8M8 9.2h5.6M8 11.8h3.4"/>',
    skills: '<path class="fz-fill" d="M6 10h2.2v4H6zM10.9 7.4h2.2v9.2h-2.2zM15.8 9h2.2v6h-2.2z"/>' +
      '<path class="fz-line" d="M6.9 9.4v5.2M12 6.6v10.8M17.1 8.4v7.2M3.6 11.2v1.6M20.4 11.2v1.6"/>',
    /* Wajah pembimbing FIEZEL - bentuknya milik FIEZEL sendiri, bukan maskot pihak lain:
       satu kotak membulat (huruf F yang dibulatkan), dua mata, satu percik. */
    coach: '<rect class="fz-fill" x="4.2" y="4.6" width="15.6" height="14.4" rx="5"/>' +
      '<rect class="fz-line" x="4.2" y="4.6" width="15.6" height="14.4" rx="5"/>' +
      '<path class="fz-line" d="M9.2 11.4v1.4M14.8 11.4v1.4M10.2 15.4c1.1.9 2.5.9 3.6 0"/>' +
      '<path class="fz-line" d="m18.6 3.2.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/>',
    /* Streak: dipakai badge, satu-satunya tempat koral jadi bidang penuh. */
    flame: '<path class="fz-fill" d="M12 3.8c3.4 3 5 5.3 5 7.9a5 5 0 0 1-10 0c0-1.5.6-2.9 1.8-4.4.5 1 .9 1.6 1.6 2 .2-2.1.7-3.9 1.6-5.5z"/>' +
      '<path class="fz-line" d="M12 3.8c3.4 3 5 5.3 5 7.9a5 5 0 0 1-10 0c0-1.5.6-2.9 1.8-4.4.5 1 .9 1.6 1.6 2 .2-2.1.7-3.9 1.6-5.5z"/>' +
      '<path class="fz-line" d="M12 12.6c1.2 1 1.8 1.9 1.8 2.8a1.8 1.8 0 0 1-3.6 0c0-.9.6-1.8 1.8-2.8z"/>'
  };

  var SVG_HEAD = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';

  function markup(name) {
    var body = ICONS[name];
    return body ? SVG_HEAD + body + '</svg>' : '';
  }

  /**
   * Mengisi setiap [data-fz-icon] yang belum terisi. Idempoten dengan sengaja: ia dipanggil
   * dari refreshIcons() setiap kali layar dicat ulang, dan mencat ulang SVG yang sudah benar
   * hanya membuang waktu render.
   */
  function hydrate(root) {
    var scope = root || (typeof document !== 'undefined' ? document : null);
    if (!scope || !scope.querySelectorAll) return 0;
    var nodes = scope.querySelectorAll('[data-fz-icon]');
    var filled = 0;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var name = el.getAttribute('data-fz-icon');
      if (el.getAttribute('data-fz-icon-done') === name) continue;
      var svg = markup(name);
      if (!svg) continue;
      el.innerHTML = svg;
      el.classList.add('fz-i');
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('data-fz-icon-done', name);
      filled++;
    }
    return filled;
  }

  global.FiezelIcons = { icons: ICONS, markup: markup, hydrate: hydrate, names: Object.keys(ICONS) };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.FiezelIcons;
})(typeof self !== 'undefined' ? self : this);
