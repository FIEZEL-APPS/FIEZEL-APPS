/**
 * FIEZEL — KARTU PEMBARUAN. Kabar versi baru yang benar-benar terlihat murid.
 *
 * KENAPA BERKAS TERPISAH, DAN KENAPA ITU JUSTRU INTINYA:
 *
 * Logika ini semula ditulis di dalam app.js. Di situ ia benar tetapi tidak berguna untuk
 * satu golongan pengguna yang paling penting: PWA yang SUDAH terpasang di perangkat murid.
 * `app.js` ada di daftar precache dan dilayani cache-first DARI generasi shell yang sedang
 * aktif, jadi selama service worker lama masih memegang dokumen, kode baru di app.js TIDAK
 * PERNAH dijalankan - kartunya ada di DOM, tidak ada satu pun kode yang memunculkannya. Dan
 * SW lama memang bertahan lama: ia hanya digantikan setelah semua kliennya tutup. Kabar
 * pembaruan yang cuma bekerja di instalasi baru adalah kabar yang tidak sampai ke orang yang
 * paling perlu mendengarnya.
 *
 * Nama berkas yang BARU membalik keadaan itu: berkas ini terdaftar di ASSETS sw.js, jadi
 * permintaannya masuk jalur shell - dan di shell cache generasi lama berkas ini tidak ada.
 * Cache miss berarti jatuh ke jaringan (sw.js, cabang aset cangkang non-navigasi), jadi
 * begitu dokumen yang memuatnya sampai, kode BARU ini yang berjalan, bukan salinan basi.
 *
 * Kapan dokumen itu sampai bergantung pada generasi SW yang dipegang murid, dan keduanya
 * berakhir sama-sama baik:
 *   - SW sebelum m025-211 (navigasi network-first): dokumen segar datang di peluncuran itu
 *     juga, jadi kartunya muncul pada peluncuran berikutnya.
 *   - SW m025-211 dan sesudahnya (navigasi shell-first): dokumen disajikan dari cangkang
 *     generasi itu, sementara `waitUntil` mengambil dokumen segar ke cache di latar. Kartunya
 *     muncul pada peluncuran sesudah itu.
 * Yang penting: tidak satu pun jalur menuntut murid menutup aplikasinya sampai habis lebih
 * dulu - dan itulah syarat yang dulu membuat kabar pembaruan tidak pernah tiba.
 *
 * Karena berkas ini bisa berjalan berdampingan dengan app.js LAMA (yang masih memegang jalur
 * pembaruan diam-diam), ia tidak menyentuh apa pun milik app.js dan tidak mengandalkan global
 * mana pun darinya. IIFE, karena berkas lepas bisa termuat dua kali.
 */
(function () {
  'use strict';
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return;
  if (self.FiezelUpdatePrompt) return;

  var CHECK_MS = 30 * 60 * 1000;
  var APP_VERSION = String(self.FIEZEL_VERSION || '');
  var started = false, reloadBound = false, shown = false, pendingWorker = null;

  function el() { try { return document.getElementById('updateBanner'); } catch (_) { return null; } }
  function sfx(name) { try { if (typeof self.uiSfx === 'function') self.uiSfx(name); } catch (_) {} }
  function sess(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } }
  function setSess(key, val) { try { sessionStorage.setItem(key, val); } catch (_) {} }
  function dropSess(key) { try { sessionStorage.removeItem(key); } catch (_) {} }

  /* Muat ulang HANYA kalau penanda persetujuan murid ada. Penanda itu dipasang di jalur
   * tombol dan di situ saja - tidak ada jalur lain yang boleh memuat ulang halaman. */
  function reloadIfApproved() {
    if (sess('fiezel-apply-update') !== '1') return;
    dropSess('fiezel-apply-update');
    try { location.reload(); } catch (_) {}
  }
  function bindReload() {
    if (reloadBound || !navigator.serviceWorker || typeof navigator.serviceWorker.addEventListener !== 'function') return;
    reloadBound = true;
    navigator.serviceWorker.addEventListener('controllerchange', reloadIfApproved);
  }

  function t(k, params) {
    try {
      if (self.FiezelI18n && typeof self.FiezelI18n.t === 'function') return self.FiezelI18n.t(k, params);
    } catch (_) {}
    return k;
  }

  function hide() {
    var node = el();
    if (!node) return;
    node.classList.remove('show');
    setTimeout(function () { node.classList.add('hidden'); }, 260);
  }
  function later() { shown = false; hide(); setSess('fiezel-update-later', '1'); }

  function apply() {
    bindReload();
    var node = el(), btn = node && node.querySelector('#updateBannerApply');
    if (btn) {
      btn.disabled = true;
      var apText = t('update.applying-text');
      btn.textContent = (apText && apText !== 'update.applying-text') ? apText : 'Memperbarui...';
    }
    setSess('fiezel-apply-update', '1');
    if (pendingWorker && typeof pendingWorker.postMessage === 'function') {
      try { pendingWorker.postMessage({ type: 'FIEZEL_SKIP_WAITING' }); } catch (_) {}
      // Jaring pengaman. Kalau controllerchange tidak pernah datang - worker menolak
      // berpindah, atau pesannya hilang - murid tidak boleh tertinggal selamanya di kartu
      // yang bertuliskan "Memperbarui...".
      setTimeout(reloadIfApproved, 3500);
    } else {
      // Tidak ada worker menunggu: halaman baru cukup diambil dengan muat ulang biasa.
      reloadIfApproved();
    }
  }

  function show(worker, remoteVersion) {
    if (worker) pendingWorker = worker;
    if (shown) return false;
    if (sess('fiezel-update-later') === '1') return false;
    var node = el();
    if (!node) return false;
    shown = true;
    try {
      node.querySelectorAll('[data-i18n]').forEach(function (el) {
        var k = el.getAttribute('data-i18n');
        if (k) { var val = t(k); if (val && val !== k) el.textContent = val; }
      });
      node.querySelectorAll('[data-i18n-html]').forEach(function (el) {
        var k = el.getAttribute('data-i18n-html');
        if (k) { var val = t(k); if (val && val !== k) el.innerHTML = val; }
      });
    } catch (_) {}
    var line = node.querySelector('#updateBannerVersion');
    if (line) {
      if (remoteVersion && remoteVersion !== APP_VERSION) {
        var vText = t('update.version-text', { newVersion: remoteVersion, curVersion: APP_VERSION || '' });
        line.textContent = (vText && vText !== 'update.version-text')
          ? vText
          : ('Versi ' + remoteVersion + (APP_VERSION ? ' · kamu sekarang memakai ' + APP_VERSION : ''));
      } else {
        line.textContent = '';
      }
    }
    var applyBtn = node.querySelector('#updateBannerApply');
    var laterBtn = node.querySelector('#updateBannerLater');
    if (applyBtn && applyBtn.dataset.bound !== '1') { applyBtn.dataset.bound = '1'; applyBtn.addEventListener('click', apply); }
    if (laterBtn && laterBtn.dataset.bound !== '1') { laterBtn.dataset.bound = '1'; laterBtn.addEventListener('click', later); }
    node.classList.remove('hidden');
    // setTimeout, bukan requestAnimationFrame: rAF tidak berdetak di tab tersembunyi, dan
    // kartu ini bisa lahir persis saat murid sedang membuka aplikasi lain.
    setTimeout(function () { node.classList.add('show'); }, 16);
    sfx('open');
    return true;
  }

  function fetchRemoteVersion() {
    return fetch('./VERSION.json', { cache: 'no-store' })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (v) { return String((v && v.version) || ''); })
      .catch(function () { return ''; });
  }

  function watchRegistration(reg, remoteVersion) {
    if (!reg) return false;
    if (reg.waiting) { show(reg.waiting, remoteVersion); return true; }
    var track = function (w) {
      if (!w || typeof w.addEventListener !== 'function') return;
      w.addEventListener('statechange', function () {
        if (w.state === 'installed' && navigator.serviceWorker.controller) show(w, remoteVersion);
      });
    };
    track(reg.installing);
    if (!reg.__fiezelUpdateBound && typeof reg.addEventListener === 'function') {
      reg.__fiezelUpdateBound = true;
      reg.addEventListener('updatefound', function () { track(reg.installing); });
    }
    return false;
  }

  function check(force) {
    if (!force && typeof navigator.onLine === 'boolean' && !navigator.onLine) return Promise.resolve(false);
    if (!navigator.serviceWorker || typeof navigator.serviceWorker.getRegistration !== 'function') return Promise.resolve(false);
    return navigator.serviceWorker.getRegistration().catch(function () { return null; }).then(function (reg) {
      if (!reg) return false;
      bindReload();
      return fetchRemoteVersion().then(function (remote) {
        if (watchRegistration(reg, remote)) return true;
        return Promise.resolve(reg.update()).catch(function () {}).then(function () {
          if (reg.waiting) return show(reg.waiting, remote);
          // VERSION.json sudah maju tetapi service worker belum punya kandidat baru (mis.
          // hanya berkas non-precache yang berubah). Kartunya tetap muncul; jalur "tanpa
          // worker menunggu" di apply() menanganinya dengan muat ulang biasa.
          if (remote && APP_VERSION && remote !== APP_VERSION) return show(null, remote);
          return false;
        });
      });
    });
  }

  function start() {
    if (started || !navigator.serviceWorker) return;
    started = true;
    bindReload();
    check(true);
    var t = setInterval(function () { check(false); }, CHECK_MS);
    if (t && t.unref) t.unref();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') check(false);
    });
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      navigator.permissions.query({ name: 'periodic-background-sync' }).then(function (status) {
        if (!status || status.state !== 'granted') return;
        navigator.serviceWorker.getRegistration().then(function (reg) {
          if (reg && reg.periodicSync && reg.periodicSync.register) {
            reg.periodicSync.register('fiezel-update-check', { minInterval: 6 * 60 * 60 * 1000 }).catch(function () {});
          }
        }).catch(function () {});
      }).catch(function () {});
    }
  }

  self.FiezelUpdatePrompt = { start: start, check: check, show: show, dismiss: later, apply: apply };

  // Berjalan sendiri. app.js baru juga memanggil start(), tetapi app.js LAMA tidak tahu
  // berkas ini ada - dan justru instalasi lama itulah yang paling butuh kartunya.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}());
