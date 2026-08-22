/**
 * FIEZEL — koreografi pembuka: SATU jam untuk gerak dan bunyi.
 *
 * m025-86 OWNER: "yang aku inginkan adalah sfx nya mengikuti ritme animasi ... animasinya
 * harus lebih eksklusif dan harus selaras dengan ritme animasinya".
 *
 * Sebelum berkas ini ada, ritmenya disalin dengan tangan di dua tempat: jeda animasi
 * ditulis sebagai angka di style.css, dan waktu nada ditulis sebagai angka lain di
 * fiezel-ui-sfx.js. Keduanya HARUS sama, tidak ada yang menjaganya, dan pada m025-84
 * memang sudah melenceng - hasil pengukurannya:
 *
 *      0ms  batang F tumbuh          -> ada bunyi
 *    105ms  lengan F atas            -> ada bunyi
 *    155ms  lengan F bawah           -> SENYAP
 *    210ms  batang emas naik         -> ada bunyi
 *    250ms  batang emas kedua        -> SENYAP
 *    420ms  kilau emas menyapu       -> SENYAP
 *    540ms  wordmark naik            -> SENYAP
 *    680ms  tagline naik             -> SENYAP
 *
 * Animasi berakhir di 1160ms, bunyi terakhir dipicu di 210ms: 950 milidetik terakhir
 * pembukaan berjalan tanpa suara sama sekali. Itulah yang terasa "tidak selaras" - bukan
 * nadanya yang salah, melainkan separuh gerakan yang tidak pernah dibunyikan.
 *
 * Sekarang ritmenya hidup DI SINI saja. style.css membaca ketukan lewat custom property
 * (--fz-b1 dst) yang dipasang modul splash dari tabel di bawah, dan fiezel-ui-sfx.js
 * membaca tabel yang sama untuk menjadwalkan nada. Menggeser satu ketukan menggeser
 * gerak DAN bunyi sekaligus; tidak ada lagi cara untuk menggeser salah satunya saja.
 *
 * PILIHAN NADANYA
 *
 * Motifnya bukan melodi lepas melainkan satu akor F mayor add9 yang DIURAI naik, satu
 * nada per ketukan visual: F2 - F3 - C4 - F4 - A4 - C5 - G5.
 *
 * - F sebagai pusat karena F adalah huruf mereknya sendiri.
 * - Nada terts besar (A4) sengaja jatuh TEPAT saat batang emas naik. Emas adalah warna
 *   aksen merek, dan terts besar adalah nada yang memberi warna pada sebuah akor: warna
 *   di layar dan warna di akor tiba pada frame yang sama. Ini kaitan yang bisa diingat
 *   orang tanpa pernah menyadarinya.
 * - Nada penutup G5 adalah nada KESEMBILAN, bukan tonika. Ia berbunyi terbuka dan
 *   menggantung - aplikasi belajar tidak sedang mengucapkan titik. Add9 juga yang
 *   membedakan akor "mahal" dari trinada polos yang terdengar seperti bunyi bawaan.
 * - F2 di ketukan pertama nyaris tidak terdengar sebagai nada; ia terasa sebagai bobot.
 *   Netflix memakai prinsip yang sama pada "ta-dum": yang melekat adalah dorongan rendah
 *   di dada, bukan pitch-nya.
 *
 * Prinsip yang dipinjam dari logo bunyi yang benar-benar melekat (Netflix, THX, Apple,
 * Intel): sedikit kejadian, satu jangkar rendah, timbre taklaras yang tetap konsonan,
 * satu nada warna, dan ekor panjang. Yang murah terdengar sibuk; yang mahal terdengar
 * lapang.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelChoreography = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Frekuensi akor F mayor add9, ditulis sekali.
  var PITCH = Object.freeze({
    F2: 87.31, F3: 174.61, C4: 261.63, F4: 349.23,
    A4: 440.00, C5: 523.25, G5: 783.99
  });

  /**
   * Ketukan pembukaan. `at` dan `dur` dalam milidetik.
   *
   * `css` adalah nama custom property yang dipasang ke elemen splash; style.css
   * memakainya sebagai animation-delay. `pitch` null berarti ketukan itu tidak menambah
   * nada baru - lihat b8, yang hanya membuka ekor ruang.
   *
   * Jarak antarketukan sengaja TIDAK rata. Jarak rata terdengar seperti bip dan terlihat
   * seperti daftar; jarak timpang bisa ditirukan orang dan terbaca sebagai gerakan.
   *
   * m025-88 OWNER: "animasinya terlalu cepat dan singkat". Seluruh tabel direntangkan
   * sekitar 1,7x - gerakan kini selesai di 2180ms, bukan 1380ms. Yang membuat pembukaan
   * terasa mahal bukan jumlah gerakannya melainkan waktu yang diberikan kepada tiap
   * gerakan untuk mendarat; versi sebelumnya menyelesaikan seluruh susunan sebelum mata
   * sempat mengikutinya.
   */
  var BEATS = Object.freeze([
    Object.freeze({ id: 'b1', css: '--fz-b1', at: 0,    dur: 700,  pitch: PITCH.F2, role: 'sub',     moves: 'batang tegak huruf F tumbuh ke bawah' }),
    Object.freeze({ id: 'b2', css: '--fz-b2', at: 190,  dur: 560,  pitch: PITCH.F3, role: 'strike',  moves: 'lengan atas huruf F memanjang' }),
    Object.freeze({ id: 'b3', css: '--fz-b3', at: 285,  dur: 560,  pitch: PITCH.C4, role: 'strike',  moves: 'lengan bawah huruf F memanjang' }),
    Object.freeze({ id: 'b4', css: '--fz-b4', at: 430,  dur: 760,  pitch: PITCH.F4, role: 'strike',  moves: 'batang emas pertama naik' }),
    Object.freeze({ id: 'b5', css: '--fz-b5', at: 530,  dur: 760,  pitch: PITCH.A4, role: 'colour',  moves: 'batang emas kedua naik' }),
    Object.freeze({ id: 'b6', css: '--fz-b6', at: 820,  dur: 1200, pitch: PITCH.C5, role: 'shimmer', moves: 'kilau emas menyapu logo' }),
    Object.freeze({ id: 'b7', css: '--fz-b7', at: 1060, dur: 820,  pitch: PITCH.G5, role: 'add9',    moves: 'wordmark FIEZEL naik' }),
    Object.freeze({ id: 'b8', css: '--fz-b8', at: 1360, dur: 820,  pitch: null,     role: 'bloom',   moves: 'tagline naik' })
  ]);

  /** Milidetik saat gerakan terakhir selesai. Ekor bunyi tidak boleh berhenti sebelum ini. */
  function motionEndsAt() {
    var end = 0;
    for (var i = 0; i < BEATS.length; i++) end = Math.max(end, BEATS[i].at + BEATS[i].dur);
    return end;
  }

  /** Ketukan sebagai detik, bentuk yang dipakai penjadwal Web Audio. */
  function audioBeats() {
    var out = [];
    for (var i = 0; i < BEATS.length; i++) {
      if (BEATS[i].pitch === null) continue;
      out.push({ id: BEATS[i].id, freq: BEATS[i].pitch, at: BEATS[i].at / 1000, role: BEATS[i].role });
    }
    return out;
  }

  /**
   * Memasang ketukan sebagai custom property. style.css memakainya lewat
   * animation-delay:var(--fz-b4) dan seterusnya, jadi menggeser tabel di atas menggeser
   * animasinya tanpa menyentuh CSS sama sekali.
   *
   * Nilai yang sama juga tertulis sebagai default di CSS kritis index.html, karena splash
   * frame-pertama tercat SEBELUM JavaScript apa pun berjalan. Kalau keduanya menyimpang,
   * splash-choreography-test.js gagal.
   */
  function applyTo(el) {
    if (!el || !el.style || typeof el.style.setProperty !== 'function') return false;
    for (var i = 0; i < BEATS.length; i++) {
      try { el.style.setProperty(BEATS[i].css, BEATS[i].at + 'ms'); } catch (_) { return false; }
    }
    return true;
  }

  /** Blok CSS default, dipakai berkas uji untuk membandingkan dengan index.html. */
  function cssDefaults() {
    var parts = [];
    for (var i = 0; i < BEATS.length; i++) parts.push(BEATS[i].css + ':' + BEATS[i].at + 'ms');
    return parts.join(';');
  }

  return {
    PITCH: PITCH,
    BEATS: BEATS,
    motionEndsAt: motionEndsAt,
    audioBeats: audioBeats,
    applyTo: applyTo,
    cssDefaults: cssDefaults
  };
});
