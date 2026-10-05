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

  var CHECK_MS = 60 * 1000;
  var APP_VERSION = String(self.FIEZEL_VERSION || '');
  /* m025-492 — PENANDA YANG BENAR-BENAR MAJU ADALAH BUILD HALAMAN, BUKAN VERSI SEMVER.
   *
   * Kenapa ini ada. Kartu "Versi baru" dibangun di atas asumsi bahwa ./VERSION.json maju
   * setiap rilis. Asumsi itu TIDAK PERNAH BENAR: berkas itu berisi versi semver pedagogi
   * ('5.19.0') yang hanya berubah saat konten berubah, dan ia TIDAK PERNAH ditulis ulang di
   * produksi (content-adoption.js:84 hanya menulisnya ke direktori STAGING). Jadi di
   * perangkat yang sudah memasang build ini, fetchRemoteVersion() selalu mengembalikan
   * string yang sama dengan APP_VERSION, isNewerVersion() selalu false, dan kartu tidak
   * pernah muncul walau SW baru sudah menunggu - PWA yang sudah terpasang membeku diam-diam.
   *
   * Yang BENAR-BENAR berubah tiap rilis adalah nomor build halaman (m025-N). Ia sudah ada di
   * dua tempat yang bisa dibandingkan tanpa menyentuh apa pun:
   *   - salinan LOKAL yang dieksekusi  : self.FIEZEL_PAGE_BUILD  (core-config.js, di-precache)
   *   - salinan LIVE di server         : coordination/BUILD-VERSION.json (diambil jaringan)
   * Keduanya se-ruang (m025-N), jadi perbandingannya langsung dan tidak menyeret versi
   * semver yang justru jadi nama cache neural stabil `fiezel-v${FIEZEL_VERSION}`.
   *
   * VERSION.json TIDAK dibuang: ia tetap dibaca sebagai pensinyal cadangan, sehingga perilaku
   * kartu identik seperti sebelumnya bila suatu saat semver benar-benar maju. Yang berubah
   * hanyalah pensinyal UTAMA. */
  var APP_BUILD = String(self.FIEZEL_PAGE_BUILD || '');
  var started = false, reloadBound = false, shown = false, pendingWorker = null;
  /* Kandidat terakhir yang sudah DIKONFIRMASI lebih baru, supaya perayapan berkala (yang
   * sengaja dibuat ringan) tidak perlu membandingkan ulang setiap kali. */
  var bestBuild = null, bestRemote = '';

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
  function isNewerVersion(remote, cur) {
    if (!remote || !cur || remote === cur) return false;
    var r = remote.split('.').map(function (n) { return parseInt(n, 10) || 0; });
    var c = cur.split('.').map(function (n) { return parseInt(n, 10) || 0; });
    for (var i = 0; i < Math.max(r.length, c.length); i++) {
      var rv = r[i] || 0, cv = c[i] || 0;
      if (rv > cv) return true;
      if (rv < cv) return false;
    }
    return false;
  }
  /* Nomor build halaman ('m025-491') diparse jadi satu bilangan bulat supaya m025-1000
   * tetap dinilai lebih baru daripada m025-999 (perbandingan string akan salah). Nomor
   * build bertipe BEDA dari semver: keduanya tidak pernah dibandingkan silang. */
  function parseBuild(v) {
    var m = String(v == null ? '' : v).match(/^m(\d+)-(\d+)/i);
    return m ? (parseInt(m[1], 10) * 100000 + parseInt(m[2], 10)) : null;
  }
  function isNewerBuild(remote, cur) {
    var r = parseBuild(remote), c = parseBuild(cur);
    if (r === null || c === null) return false;
    return r > c;
  }
  /* Satu-satunya tempat "apakah ada yang lebih baru" diputuskan, supaya perayapan berkala,
   * pemeriksaan paksa, dan show() tidak bisa menyimpang. Build halaman diprioritaskan; semver
   * hanya dipakai bila build tidak diketahui di salah satu sisi (mis. berkas lama). */
  function newerKind(remote) {
    if (remote && remote.build && APP_BUILD) return isNewerBuild(remote.build, APP_BUILD) ? 'build' : '';
    if (remote && remote.version && APP_VERSION) return isNewerVersion(remote.version, APP_VERSION) ? 'semver' : '';
    return '';
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
  function later() {
    shown = false;
    hide();
    setSess('fiezel-update-later', '1');
    setSess('fiezel-update-later-time', String(Date.now()));
  }

  function apply() {
    bindReload();
    var node = el(), btn = node && node.querySelector('#updateBannerApply');
    if (btn) {
      btn.disabled = true;
      var apText = t('update.applying-text');
      btn.textContent = (apText && apText !== 'update.applying-text') ? apText : 'Memperbarui...';
    }
    setSess('fiezel-apply-update', '1');
    hide();
    if (pendingWorker && typeof pendingWorker.postMessage === 'function') {
      try { pendingWorker.postMessage({ type: 'FIEZEL_SKIP_WAITING' }); } catch (_) {}
      setTimeout(reloadIfApproved, 3500);
    } else {
      reloadIfApproved();
    }
  }

  /* m025-246 — KARTU "VERSI BARU" TIDAK PERNAH MEMOTONG SOAL.
     OWNER: "Prompt 'Versi baru': tunda ke akhir sesi, tidak muncul di tengah soal."

     Sebelum ini kartunya muncul begitu service worker punya kandidat baru, dan waktunya
     ditentukan oleh jaringan - artinya ia bisa (dan akan) mendarat di atas soal yang
     sedang dikerjakan. Kartu itu punya tombol "Perbarui sekarang" yang MEMUAT ULANG
     halaman; ditekan di tengah sesi, ia membuang jawaban yang sedang berjalan.

     Sumber kebenaran "sedang ada pelajaran" adalah FiezelStage.lessonMode() - kontrak
     yang sama yang sudah dipakai tur (fiezel-tour.js:183) dan toast infrastruktur
     (app.js), jadi tidak ada gerbang kedua yang bisa menyimpang.

     Ditunda, BUKAN dibuang: permintaannya diparkir dan dilepas oleh flush(), yang
     dipanggil app.js di akhir sesi. Kalau app.js tidak pernah memanggilnya (build lama,
     jalur keluar yang tidak terduga), pengecekan berkala berikutnya tetap akan
     memanggil show() lagi - jadi kegagalan terburuknya adalah kartu yang datang
     terlambat, bukan kartu yang hilang. */
  var deferred = null;
  function lessonActive() {
    try {
      var stage = (typeof globalThis !== 'undefined' && globalThis.FiezelStage) || null;
      return !!(stage && typeof stage.lessonMode === 'function' && stage.lessonMode() === true);
    } catch (_) { return false; }
  }
  /** Dipanggil di akhir sesi. Mengembalikan true kalau ada kartu tertunda yang jadi tampil. */
  function flush() {
    if (!deferred) return false;
    var pending = deferred;
    deferred = null;
    return show(pending.worker, pending.remoteVersion);
  }
  function show(worker, remoteVersion, force) {
    if (worker) pendingWorker = worker;
    if (!worker && remoteVersion && newerKind(remoteVersion)) {
      if (remoteVersion.build) bestBuild = remoteVersion.build;
      if (remoteVersion.version) bestRemote = remoteVersion.version;
    }
    if (!worker && !force && remoteVersion && !newerKind(remoteVersion) && !bestBuild && !bestRemote) return false;
    if (shown) return false;
    if (sess('fiezel-apply-update') === '1') {
      dropSess('fiezel-apply-update');
      return false;
    }
    if (sess('fiezel-update-later') === '1') {
      var laterTime = Number(sess('fiezel-update-later-time') || 0);
      var SNOOZE_MS = 10 * 60 * 1000;
      if (laterTime && (Date.now() - laterTime < SNOOZE_MS)) return false;
      dropSess('fiezel-update-later');
      dropSess('fiezel-update-later-time');
    }
    if (lessonActive()) {
      /* Versi terbaru yang menang: kalau dua kandidat mendarat selama satu sesi, yang
         dilepas di akhir adalah yang paling akhir diketahui. */
      deferred = { worker: worker || pendingWorker, remoteVersion: remoteVersion };
      return false;
    }
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
      var newLabel = (remoteVersion && (remoteVersion.build || remoteVersion.version)) || bestBuild || bestRemote || '';
      var curLabel = APP_BUILD || APP_VERSION || '';
      if (newLabel && curLabel && newLabel !== curLabel) {
        var vText = t('update.version-text', { newVersion: newLabel, curVersion: curLabel });
        line.textContent = (vText && vText !== 'update.version-text')
          ? vText
          : ('Versi ' + newLabel + (curLabel ? ' · kamu sekarang memakai ' + curLabel : ''));
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
    var out = { version: '', build: '' };
    return Promise.all([
      fetch('./VERSION.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (v) { out.version = String((v && v.version) || ''); })
        .catch(function () {}),
      /* Sinyal UTAMA: build halaman yang benar-benar terbit (lihat catatan APP_BUILD di atas).
       * Gagal mengambilnya bukan kegagalan - VERSION.json masih jadi cadangan. */
      fetch('./coordination/BUILD-VERSION.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (v) { out.build = String((v && v.version) || ''); })
        .catch(function () {})
    ]).then(function () { return out; });
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
        var kind = newerKind(remote);
        /* Ingat kandidat terbaru supaya perayapan berkala tak perlu membandingkan ulang. */
        if (kind === 'build') bestBuild = remote.build;
        if (kind === 'semver') bestRemote = remote.version;
        if (watchRegistration(reg, remote)) return true;
        return Promise.resolve(reg.update()).catch(function () {}).then(function () {
          if (reg.waiting) return show(reg.waiting, remote);
          // Sinyal REMOTE sudah lebih baru (build halaman atau VERSION.json) tetapi service
          // worker belum punya kandidat baru (mis. hanya berkas non-precache yang berubah).
          // Kartu tetap muncul; jalur "tanpa worker menunggu" di apply() menanganinya dengan
          // muat ulang biasa.
          if (kind) return show(null, remote);
          /* JARING PENGAMAN D3 (m025-492) - KEBALIKAN DARI BUG DI ATAS.
           *
           * Bila ada KANDIDAT SW yang menunggu tetapi sinyal remote tidak terbaca (jaringan
           * gagal, BUILD-VERSION.json tak terjangkau, atau perbandingan tidak meyakinkan),
           * kartu WAJIB tetap muncul. Membandingkan remote dengan penanda LOKAL yang basi
           * persis bug yang membuat PWA terpasang membeku: kandidat baru sudah ada di
           * perangkat, tetapi halaman menyimpulkan "tidak ada yang baru" dan diam.
           *
           * kandidat-pelanggan yang lebih baru daripada controller sudah cukup untuk
           * menyimpulkan ada build yang lebih baru; kita tidak perlu tahu angkanya untuk
           * menawarkannya. `reg.waiting` sudah ditangani di atas, jadi di sini hanya
           * `installing`/`installed` yang belum sempat menjadi waiting. */
          try {
            var cand = reg.installing;
            if (cand && cand !== navigator.serviceWorker.controller && cand.state && cand.state !== 'activated') {
              return show(cand, remote);
            }
          } catch (_) {}
          /* Jaring pengaman terakhir & paling murah: kita TAHU dari health-check bahwa revisi
           * shell yang aktif (SW_REV, berawalan 'm025-N') berbeda dari penanda halaman lokal.
           * Itu bukti langsung ada build lain yang memuat aplikasi ini. Tidak bergantung pada
           * jaringan sama sekali. */
          return shellRevisionMismatch().then(function (rev) {
            var revNum = parseBuild(rev), mine = parseBuild(APP_BUILD);
            /* parseBuild mengurai 'm025-491-unified-…' menjadi m025*100000+491, jadi awalan
             * 'm025' saja tidak pernah disalahartikan sebagai nomor build yang berbeda.
             * force=true: bukti ketakcocokan datang dari worker yang MELAYANI halaman, bukan
             * dari angka remote yang bisa saja tak terbaca - jadi penjaga di show() tak boleh
             * menolaknya karena kebetulan remote kosong. */
            if (revNum !== null && mine !== null && revNum !== mine) return show(null, remote, true);
            return false;
          });
        });
      });
    });
  }

  /* Menanyakan revisi shell ke worker yang SEDANG melayani halaman (kontrak install-health
   * yang sudah ada: pesan FIEZEL_HEALTH_PING -> balasan {swRev}). Selalu selesai (resolve),
   * tidak pernah menggantung, dan tidak melempar - ini jaring pengaman, bukan jalur utama. */
  function shellRevisionMismatch() {
    return new Promise(function (resolve) {
      try {
        var ctrl = navigator.serviceWorker && navigator.serviceWorker.controller;
        if (!ctrl || typeof MessageChannel === 'undefined') { resolve(''); return; }
        var ch = new MessageChannel();
        var done = false;
        var finish = function (v) { if (done) return; done = true; resolve(String(v || '')); };
        ch.port1.onmessage = function (e) { finish(e && e.data && e.data.swRev); };
        setTimeout(function () { finish(''); }, 1200);
        ctrl.postMessage({ type: 'FIEZEL_HEALTH_PING' }, [ch.port2]);
      } catch (_) { resolve(''); }
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
    window.addEventListener('focus', function () { check(false); });
    window.addEventListener('online', function () { check(true); });
    window.addEventListener('hashchange', function () { check(false); });
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

  self.FiezelUpdatePrompt = { start: start, check: check, show: show, flush: flush, dismiss: later, apply: apply };

  // Berjalan sendiri. app.js baru juga memanggil start(), tetapi app.js LAMA tidak tahu
  // berkas ini ada - dan justru instalasi lama itulah yang paling butuh kartunya.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}());
