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
  // Batas sabar jaring pengaman: kalau app.js belum sampai ke openApp() sesudah ini,
  // gelombangnya berangkat sendiri daripada tidak berangkat sama sekali.
  var FALLBACK_DELAY_MS = 8000;

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
        // yang belum ada, dan penjaga runtime bisa merekam runtime yang
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
      // Ketergantungan antar-grup itu nyata, bukan kerapian: penjaga runtime suara
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

    var waveStarted = false;
    var fallbackTimer = null;

    function idleGroups() {
      var out = [];
      nodes().forEach(function (node) {
        var name = node.getAttribute('data-fiezel-lazy') || '';
        if (!name || out.indexOf(name) !== -1) return;
        if ((node.getAttribute('data-fiezel-lazy-when') || 'idle') === 'idle') out.push(name);
      });
      return out;
    }

    /**
     * Gelombang malas: grup ber-`data-fiezel-lazy-when="idle"` diambil SETELAH layar utama
     * benar-benar tergambar. app.js memanggil start() dari openApp(), tepat sesudah
     * render() - itu momen yang paling jujur untuk "setelah home screen tampil".
     *
     * Ini bukan kerapian, ini pengukuran: pada jaringan seluler yang di-throttle, gelombang
     * yang berangkat lebih awal (mis. digantungkan pada pewaktu idle begitu berkas ini
     * dieksekusi) MEREBUT PITA dari app.js dan ~2,7 MB JSON kontennya, sehingga seluruh
     * penghematannya hilang - waktu sampai layar terisi tidak bergerak sama sekali.
     */
    function start() {
      if (waveStarted) return false;
      waveStarted = true;
      if (fallbackTimer && typeof target.clearTimeout === 'function') target.clearTimeout(fallbackTimer);
      fallbackTimer = null;
      var groups = idleGroups();
      if (!groups.length) return false;
      whenIdle(function () {
        // Berurutan antar-grup supaya suara (yang dipakai lebih dulu) tidak berebut pita
        // dengan tumpukan tutor.
        groups.reduce(function (chain, name) {
          return chain.then(function () { return load(name); });
        }, Promise.resolve());
      });
      return true;
    }

    /**
     * Jaring pengaman. start() dipanggil app.js, jadi app.js yang gagal memuat atau melempar
     * sebelum openApp() akan meninggalkan suara dan Classroom tidak pernah terambil sama
     * sekali. Pewaktu ini memastikan gelombangnya tetap berangkat.
     *
     * Sengaja digantungkan pada DOMContentLoaded, BUKAN pada event 'load': 'load' menunggu
     * seluruh sumber daya termasuk js.puter.com yang async, jadi Puter yang menggantung akan
     * menyandera bagian FIEZEL yang tidak ada hubungannya dengan Puter - persis penyakit
     * yang sedang diobati. DOMContentLoaded hanya menunggu rantai defer selesai.
     */
    function boot() {
      if (!idleGroups().length) return;
      var arm = function () {
        if (waveStarted || typeof target.setTimeout !== 'function') return;
        fallbackTimer = target.setTimeout(start, FALLBACK_DELAY_MS);
        if (fallbackTimer && fallbackTimer.unref) fallbackTimer.unref();
      };
      if (doc.readyState === 'loading' && typeof doc.addEventListener === 'function') {
        doc.addEventListener('DOMContentLoaded', arm, { once: true });
      } else arm();
    }

    var api = Object.freeze({
      schema: SCHEMA,
      selector: SELECTOR,
      groups: groupNames,
      load: load,
      loaded: loaded,
      start: start,
      started: function () { return waveStarted; },
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
