/**
 * KEBIJAKAN INTERAKSI APLIKASI FIEZEL — satu tempat, bukan tambalan tersebar.
 *
 * m025-186: modul ini TIDAK dihapus meski namanya "zoom lock", dan itu keputusan sadar.
 * Audit interaksi app-like menemukan ia BUKAN kode mati: ia satu-satunya yang membatalkan
 * double-tap-zoom pada mesin yang mengabaikan `touch-action:manipulation`. Menghapusnya
 * berarti mengembalikan cacat yang sudah tertutup. Yang dilakukan sebaliknya: ia diperluas
 * menjadi SATU kebijakan interaksi, sehingga tidak lahir modul kedua yang mengatur hal yang
 * sama dari sudut lain.
 *
 * Dua hal yang dijaga, dan HANYA dua:
 *   1. Double-tap tidak memperbesar halaman  (sudah ada sejak m025-42)
 *   2. Menu konteks peramban tidak muncul di UI statis  (m025-186)
 *
 * Yang SENGAJA TIDAK dilakukan, supaya tidak ada yang "merapikannya" nanti:
 *   - pinch-zoom TIDAK diblok (WCAG 1.4.4/1.4.10 - hak murid low-vision)
 *   - ctrl+wheel dan Cmd/Ctrl +/-/0 TIDAK diblok (alasan sama)
 *   - seleksi teks TIDAK diurus di sini; itu murni CSS (`style.css` blok kebijakan).
 *     Mengurusnya dua kali di dua lapisan adalah cara termudah membuat input rusak.
 *
 * ---------------------------------------------------------------------------------------
 * m025-42 zoom lock — D16 (audit wave D, D5 T1): dilonggarkan menjadi double-tap lock.
 *
 * Versi lama menolak SEMUA gesture zoom (pinch WebKit via gesturestart/gesturechange/
 * gestureend, touchmove multi-jari, ctrl+wheel, dan Cmd/Ctrl +/-/0). Itu melanggar
 * WCAG 1.4.4 & 1.4.10: murid low-vision tidak bisa memperbesar teks sama sekali.
 * Viewport meta kini mengizinkan zoom sampai 5x, dan modul ini TIDAK lagi memblok pinch,
 * wheel, maupun keyboard zoom.
 *
 * Yang dipertahankan adalah tujuan asli yang sah: double-tap-zoom yang tidak disengaja
 * saat mengetuk tombol jawaban cepat-cepat. Dua ketukan di dalam DOUBLE_TAP_MS pada titik
 * yang sama tetap dibatalkan (cadangan untuk mesin yang mengabaikan
 * touch-action:manipulation di style.css).
 *
 * Listener touchend memakai passive: false karena listener pasif tidak bisa
 * preventDefault. Sentuhan satu jari selain double-tap tidak pernah disentuh, atau
 * scrolling dan semua tombol ikut mati.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelZoomLock = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DOUBLE_TAP_MS = 320;
  // A second tap further away than this is two separate taps, not a double tap.
  var DOUBLE_TAP_SLOP_PX = 40;

  function createGuard(now) {
    var clock = typeof now === 'function' ? now : function () { return Date.now(); };
    var lastTapAt = 0;
    var lastX = 0;
    var lastY = 0;

    /** True when this touchend completes a double tap and must be cancelled. */
    function isDoubleTap(x, y) {
      var at = clock();
      var near = Math.abs(x - lastX) <= DOUBLE_TAP_SLOP_PX && Math.abs(y - lastY) <= DOUBLE_TAP_SLOP_PX;
      var quick = at - lastTapAt <= DOUBLE_TAP_MS;
      lastTapAt = at;
      lastX = x;
      lastY = y;
      if (quick && near) {
        // Consume it: a third tap must start a fresh pair, or a triple tap would be
        // treated as another double tap and the user could never tap twice in a row.
        lastTapAt = 0;
        return true;
      }
      return false;
    }

    /** True when a touch event carries a pinch (more than one finger down). */
    function isPinch(touchCount) { return Number(touchCount) > 1; }

    return {
      isDoubleTap: isDoubleTap,
      isPinch: isPinch,
      DOUBLE_TAP_MS: DOUBLE_TAP_MS,
      DOUBLE_TAP_SLOP_PX: DOUBLE_TAP_SLOP_PX
    };
  }

  function install(env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : null);
    if (!target || !target.document || typeof target.document.addEventListener !== 'function') return false;
    if (target.__fiezelZoomLockInstalled) return true;
    target.__fiezelZoomLockInstalled = true;

    var doc = target.document;
    var guard = createGuard(target.Date && target.Date.now ? function () { return target.Date.now(); } : null);
    var stop = function (event) { if (event && typeof event.preventDefault === 'function') event.preventDefault(); };

    // D16: pinch (gesturestart/gesturechange/gestureend + touchmove multi-jari),
    // ctrl+wheel, dan Cmd/Ctrl +/-/0 TIDAK diblok lagi - pinch-zoom adalah hak murid
    // (WCAG 1.4.4). Hanya double-tap-zoom yang masih dibatalkan. Sebuah touchend yang
    // merupakan bagian pinch (masih ada jari lain menempel) dibiarkan lewat, dinilai
    // lewat guard.isPinch pada event.touches yang tersisa.
    doc.addEventListener('touchend', function (event) {
      if (guard.isPinch(event && event.touches && event.touches.length)) return;
      var touch = (event && event.changedTouches && event.changedTouches[0]) || null;
      if (guard.isDoubleTap(touch ? touch.clientX : 0, touch ? touch.clientY : 0)) stop(event);
    }, { passive: false });

    /* MENU KONTEKS (m025-186).
     *
     * `-webkit-touch-callout:none` di style.css sudah menutup gelembung "Copy / Look Up /
     * Translate" pada long-press iOS. Yang TIDAK ditutupnya: klik-kanan desktop dan menu
     * konteks Android - keduanya masih memunculkan menu dokumen di atas UI yang bukan
     * dokumen. Diukur sebelum perbaikan: contextmenu pada <h2>/<p>/<button> tidak pernah
     * dicegah.
     *
     * Yang dicegah HANYA menu tanpa fungsi. Elemen tempat menu itu benar-benar berguna
     * dikecualikan lewat `allowsContextMenu`, dan daftarnya sengaja pendek dan eksplisit:
     * kolom teks, area editable, tautan sungguhan (murid berhak "buka di tab baru" dan
     * "salin alamat"), serta gambar (simpan gambar). Satu selector meleset di sini berarti
     * murid kehilangan paste - jadi keputusannya dibuat per-elemen dari titik sentuh,
     * bukan dengan mematikan event di document lalu berharap.
     */
    doc.addEventListener('contextmenu', function (event) {
      var el = event && event.target;
      if (allowsContextMenu(el)) return;
      stop(event);
    });

    return true;
  }

  /** Elemen yang menu konteks perambannya PUNYA fungsi nyata dan wajib dibiarkan. */
  var CONTEXT_MENU_OK = 'input,textarea,select,option,[contenteditable="true"],[contenteditable=""],a[href],img,video,audio';

  function allowsContextMenu(el) {
    if (!el || typeof el.closest !== 'function') return true; // ragu = biarkan peramban
    try { return !!el.closest(CONTEXT_MENU_OK); } catch (_) { return true; }
  }

  var api = Object.freeze({
    schema: 'fiezel-zoom-lock-v1',
    CONTEXT_MENU_OK: CONTEXT_MENU_OK,
    allowsContextMenu: allowsContextMenu,
    DOUBLE_TAP_MS: DOUBLE_TAP_MS,
    DOUBLE_TAP_SLOP_PX: DOUBLE_TAP_SLOP_PX,
    createGuard: createGuard,
    install: install
  });

  if (typeof globalThis !== 'undefined' && globalThis.document) {
    try { install(globalThis); } catch (_) {}
  }
  return api;
}));
