/**
 * FIEZEL — pemuat malas untuk tumpukan fitur berat.
 *
 * OWNER: "App premium biasanya lazy-load fitur berat (voice, tutor) setelah home screen
 * tampil." Betul: dari ~908 KB JavaScript yang dimuat index.html, 265 KB adalah runtime
 * suara neural dan 81 KB adalah tumpukan tutor/Classroom - tidak satu pun dibutuhkan untuk
 * mencetak layar pertama, tetapi keduanya dulu ikut menahan pengurai dokumen.
 *
 * Cara kerjanya sengaja tetap berupa <script src> yang bisa dibaca manusia di index.html,
 * hanya dengan type="fiezel/lazy" - tipe yang tidak dikenal browser, jadi berkasnya TIDAK
 * diambil saat mengurai. Modul ini yang mengangkatnya menjadi <script> sungguhan nanti.
 * Konsekuensi yang disengaja: urutan berkas di dalam satu grup tetap terlihat dan tetap
 * dijaga (lihat catatan async=false di bawah) - beberapa berkas suara adalah tambalan yang
 * membungkus berkas sebelumnya, jadi urutan itu memang bagian dari kontraknya.
 */
(function (root) {
  'use strict';

  var SCHEMA = 'fiezel-lazy-loader-v1';
  var SELECTOR = 'script[type="fiezel/lazy"][data-fiezel-lazy]';

  function install(target) {
    var doc = target && target.document;
    if (!doc || typeof doc.querySelectorAll !== 'function') return null;

    var promises = {};
    var startedAt = {};

    function nodes() {
      var list = doc.querySelectorAll(SELECTOR);
      return Array.prototype.slice.call(list);
    }

    function groupNames() {
      var seen = [];
      nodes().forEach(function (node) {
        var name = node.getAttribute('data-fiezel-lazy') || '';
        if (name && seen.indexOf(name) === -1) seen.push(name);
      });
      return seen;
    }

    function sourcesFor(name) {
      return nodes()
        .filter(function (node) { return (node.getAttribute('data-fiezel-lazy') || '') === name; })
        .map(function (node) { return node; });
    }

    function loadOne(placeholder) {
      return new Promise(function (resolve) {
        var src = placeholder.getAttribute('src') || '';
        if (!src) return resolve(false);
        var el = doc.createElement('script');
        el.src = src;
        // async=false pada skrip yang disisipkan skrip berarti "eksekusi berurutan":
        // browser boleh mengunduh semuanya paralel tetapi menjalankannya sesuai urutan
        // penyisipan. Tanpa ini fiezel-m0281-prebootstrap-hotfix.js bisa menambal runtime
        // yang belum ada, dan fiezel-m0281-runtime-guard.js bisa merekam runtime yang
        // belum selesai ditambal - persis kelas kerusakan yang dua berkas itu obati.
        el.async = false;
        el.defer = false;
        el.setAttribute('data-fiezel-lazy-loaded', placeholder.getAttribute('data-fiezel-lazy') || '');
        el.onload = function () {
          try { placeholder.setAttribute('data-fiezel-lazy-state', 'loaded'); } catch (_) {}
          resolve(true);
        };
        el.onerror = function () {
          // Satu berkas gagal tidak boleh menggantung sisa grupnya selamanya: sisanya tetap
          // dijalankan, dan modul yang bergantung padanya sudah menjaga diri dengan `?.`.
          try { placeholder.setAttribute('data-fiezel-lazy-state', 'error'); } catch (_) {}
          resolve(false);
        };
        (doc.head || doc.documentElement).appendChild(el);
      });
    }

    function dependencyOf(placeholders) {
      for (var i = 0; i < placeholders.length; i++) {
        var need = placeholders[i].getAttribute('data-fiezel-lazy-needs') || '';
        if (need) return need;
      }
      return '';
    }

    function load(name) {
      var key = String(name || '');
      if (promises[key]) return promises[key];
      var placeholders = sourcesFor(key);
      if (!placeholders.length) return (promises[key] = Promise.resolve({ group: key, files: 0, ok: true }));
      // Ketergantungan antar-grup itu nyata, bukan kerapian: fiezel-m0281-runtime-guard.js
      // harus merekam runtime suara yang sudah selesai ditambal SEBELUM fiezel-tutor-v3.js
      // menimpanya (lihat neural-voice-m0281-regression-test.js). Kalau murid membuka
      // Classroom sebelum gelombang idle selesai, grup suara tetap dijalankan lebih dulu.
      var need = dependencyOf(placeholders);
      var gate = need && need !== key ? load(need) : Promise.resolve(null);
      return (promises[key] = gate.then(function () { return loadGroup(key, placeholders); }));
    }

    function loadGroup(key, placeholders) {
      startedAt[key] = Date.now();
      // Semua elemen disisipkan dalam satu putaran supaya unduhannya paralel; urutan
      // eksekusinya dijamin async=false, bukan oleh menunggu satu per satu.
      var all = placeholders.map(loadOne);
      return Promise.all(all).then(function (results) {
        var detail = {
          group: key,
          files: results.length,
          ok: results.every(Boolean),
          ms: Date.now() - (startedAt[key] || Date.now())
        };
        try {
          if (typeof target.CustomEvent === 'function' && typeof doc.dispatchEvent === 'function') {
            doc.dispatchEvent(new target.CustomEvent('fiezel:lazy-group', { detail: detail }));
          }
        } catch (_) {}
        return detail;
      });
    }

    function loaded(name) {
      return !!promises[String(name || '')];
    }

    // `timeout` bukan hiasan: sebagian browser menunda panggilan idle PERTAMA sampai
    // setelah event load, dan event load itulah yang sedang tidak boleh dipercaya di sini.
    // Dengan timeout, callback-nya tetap dijadwalkan walaupun tidak pernah ada masa idle.
    function whenIdle(fn) {
      if (typeof target.requestIdleCallback === 'function') {
        target.requestIdleCallback(fn, { timeout: 1500 });
        return;
      }
      if (typeof target.setTimeout === 'function') target.setTimeout(fn, 200);
      else fn();
    }

    /**
     * Gelombang idle: grup ber-`data-fiezel-lazy-when="idle"` diambil begitu penyurai
     * selesai dan layar pertama sudah tercat. Ini yang menjaga "berperilaku sama, hanya
     * lebih lambat": pada pemakaian normal berkasnya sudah ada jauh sebelum murid
     * menyentuh tombol suara atau membuka Classroom, sementara load() langsung tetap
     * tersedia kalau murid lebih cepat dari penjadwalnya.
     *
     * Penjadwalnya sengaja TIDAK menunggu event 'load'. Event itu menunggu SELURUH sumber
     * daya halaman termasuk js.puter.com yang async - jadi menggantungkan gelombang ini
     * padanya akan mengembalikan tepat penyakit yang sedang diobati: Puter yang lambat
     * menyandera bagian FIEZEL yang tidak ada hubungannya dengan Puter. Berkas ini sendiri
     * ber-defer, jadi ia baru berjalan saat DOM siap; sisanya diserahkan ke pewaktu idle
     * yang punya batas waktu sendiri dan tidak bergantung pada jaringan siapa pun.
     */
    function boot() {
      var idleGroups = [];
      nodes().forEach(function (node) {
        var name = node.getAttribute('data-fiezel-lazy') || '';
        if (!name || idleGroups.indexOf(name) !== -1) return;
        if ((node.getAttribute('data-fiezel-lazy-when') || 'idle') === 'idle') idleGroups.push(name);
      });
      if (!idleGroups.length) return;
      whenIdle(function () {
        // Berurutan antar-grup supaya suara (yang dipakai lebih dulu) tidak berebut pita
        // dengan tumpukan tutor pada jaringan seluler.
        idleGroups.reduce(function (chain, name) {
          return chain.then(function () { return load(name); });
        }, Promise.resolve());
      });
    }

    var api = Object.freeze({
      schema: SCHEMA,
      selector: SELECTOR,
      groups: groupNames,
      load: load,
      loaded: loaded,
      boot: boot
    });
    target.FiezelLazy = api;
    boot();
    return api;
  }

  var target = typeof globalThis !== 'undefined' ? globalThis : root;
  var api = install(target);
  if (typeof module === 'object' && module.exports) {
    module.exports = { schema: SCHEMA, selector: SELECTOR, install: install, api: api };
  }
}(typeof globalThis !== 'undefined' ? globalThis : this));
