/**
 * FIEZEL — ekor boot: pendaftaran service worker.
 *
 * Berkas ini dimuat ber-`defer` sesudah app.js; urutannya dijaga tests/boot-order-test.js.
 * Dulu ia juga menyuntikkan baris "Mode gelap" ke Pengaturan dengan membungkus
 * window.openSettings. m025-134 menghapus mode gelap, jadi pembungkus itu ikut hilang
 * dan yang tersisa hanyalah pendaftaran service worker.
 *
 * Isinya tetap dibungkus IIFE: berkas lepas bisa termuat dua kali (mis. dipulihkan dari
 * cache lama), dan pengikatan `const` global yang sama dua kali adalah SyntaxError yang
 * mematikan boot.
 */
(function () {
  'use strict';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}());

/**
 * m025-132 kelahiran wordmark topbar.
 *
 * BUG m025-131, dan bentuknya patut dicatat: animasinya berjalan sempurna, hanya saja
 * tidak ada seorang pun yang bisa melihatnya. Ia dipicu 60 ms setelah DOM siap dan
 * selesai pada ~1.160 ms, sementara splash boot menutupi seluruh layar selama 3.400 ms.
 * Jadi ledakan itu memang terjadi - di balik tirai.
 *
 * Ini kelas kesalahan yang tidak akan pernah ditangkap tes statis dan tidak akan pernah
 * dilaporkan sebagai galat: tidak ada yang gagal. Yang salah cuma WAKTUNYA, dan waktu
 * hanya terlihat oleh mata di perangkat sungguhan.
 *
 * Pemicunya kini kepergian splash itu sendiri, bukan jam. Kalau splash-nya memang tidak
 * pernah muncul (sudah disapa hari ini), pengamatnya menyerah setelah tenggat dan tetap
 * menjalankan kelahirannya - lebih baik terlambat daripada tidak pernah.
 */
(function () {
  'use strict';
  var doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return;

  var fired = false;
  function birth() {
    if (fired) return;
    fired = true;
    var mark = doc.getElementById('fzTopMark');
    if (!mark) return;
    mark.classList.add('is-mark-born');
    setTimeout(function () { mark.classList.remove('is-mark-born'); }, 1100);
  }

  /** Splash sudah pergi bila kelas boot dilepas DAN elemennya tidak lagi di halaman. */
  function curtainGone() {
    if (doc.documentElement && doc.documentElement.classList.contains('fz-booting')) return false;
    var splash = doc.getElementById('fiezelBootSplash');
    return !splash || splash.classList.contains('is-leaving');
  }

  function watch() {
    if (curtainGone()) { setTimeout(birth, 120); return; }
    var stop = null;
    try {
      var obs = new MutationObserver(function () {
        if (!curtainGone()) return;
        obs.disconnect();
        if (stop) clearTimeout(stop);
        // Jeda pendek supaya kelahiran mulai SESUDAH splash benar-benar memudar, bukan
        // bertumpuk dengan animasi perginya.
        setTimeout(birth, 200);
      });
      obs.observe(doc.documentElement, { attributes: true, attributeFilter: ['class'] });
      obs.observe(doc.body || doc.documentElement, { childList: true, subtree: false });
      // Tenggat. Kalau splash-nya tidak pernah ada, tidak ada mutasi yang akan datang.
      stop = setTimeout(function () { try { obs.disconnect(); } catch (_) {} birth(); }, 5000);
    } catch (_) { setTimeout(birth, 3600); }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', watch, { once: true });
  else watch();
}());
