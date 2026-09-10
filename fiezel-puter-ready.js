/**
 * FIEZEL — kesiapan SDK Puter.
 *
 * OWNER: "Ketergantungan ke js.puter.com (script eksternal pihak ketiga) untuk auth/report
 * - kalau Puter down/lambat, splash/loading ikut ketahan."
 *
 * Itu benar, dan penyebabnya persis satu baris: <script src="https://js.puter.com/v2/">
 * berdiri PALING ATAS di antara ~50 berkas skrip TANPA async/defer, jadi ia parser-blocking.
 * Selama permintaan pihak ketiga itu belum selesai, pengurai HTML berhenti dan tidak ada
 * satu pun berkas FIEZEL yang boleh dieksekusi - jaringan orang lain menyandera boot kita.
 *
 * Skripnya sekarang async. Konsekuensinya: `puter` bisa datang KAPAN SAJA - sebelum app.js,
 * jauh sesudahnya, atau tidak sama sekali (offline, diblokir, layanan mati). Karena itu
 * TIDAK ADA lagi kode yang boleh menyimpulkan "Puter tidak ada" hanya karena globalnya
 * belum terlihat saat ia kebetulan dibaca; itu akan mematikan login dan Creator Report
 * pada boot yang sehat, hanya karena urutannya berubah. Setiap pemakai menunggu di sini.
 *
 * Modul ini sengaja tidak memuat, menambal, atau membungkus SDK-nya. Ia hanya menjawab
 * satu pertanyaan: "sudah ada belum?" - sekali, untuk semua pemanggil.
 */
(function (root) {
  'use strict';

  var SCHEMA = 'fiezel-puter-ready-v1';
  // Batas tunggu bawaan. Lewat dari ini kesiapan dijawab "tidak tersedia" dan pemanggil
  // mengambil jalur non-Puter-nya, bukan menggantung selamanya di layar tunggu.
  var DEFAULT_TIMEOUT_MS = 12000;
  var POLL_MS = 60;
  // Beberapa SDK memasang globalnya satu tick SETELAH skripnya dieksekusi, jadi event
  // 'load' saja tidak cukup: sesudahnya masih ada masa tenggang pendek untuk menjaring itu.
  var GRACE_AFTER_LOAD_MS = 1500;
  var SDK_ELEMENT_ID = 'fiezelPuterSdk';

  function sdkGlobal(target) {
    try {
      var value = target && target.puter;
      return value && typeof value === 'object' ? value : null;
    } catch (_) { return null; }
  }

  function now(target) {
    try {
      var perf = target && target.performance;
      if (perf && typeof perf.now === 'function') return perf.now();
    } catch (_) {}
    return Date.now();
  }

  function install(target) {
    if (!target) return null;

    var settled = null;          // objek puter kalau sudah siap
    var failed = false;          // skripnya gagal dimuat / batas tunggu lewat
    var startedAt = now(target);
    var waiters = [];
    var pollTimer = null;
    var deadline = 0;

    function finish(value) {
      if (settled || failed) return;
      if (value) settled = value; else failed = true;
      if (pollTimer && typeof target.clearInterval === 'function') target.clearInterval(pollTimer);
      pollTimer = null;
      var list = waiters; waiters = [];
      for (var i = 0; i < list.length; i++) {
        try { list[i](settled); } catch (_) {}
      }
    }

    function poll() {
      var value = sdkGlobal(target);
      if (value) return finish(value);
      if (deadline && now(target) > deadline) finish(null);
    }

    function startPolling(timeoutMs) {
      var limit = Number(timeoutMs);
      if (!isFinite(limit) || limit <= 0) limit = DEFAULT_TIMEOUT_MS;
      var candidate = now(target) + limit;
      // Batas tunggu terpanjang yang diminta pemanggil mana pun yang berlaku: satu penunggu
      // yang tidak sabar tidak boleh menutup pintu bagi penunggu lain yang masih mau sabar.
      if (candidate > deadline) deadline = candidate;
      if (pollTimer || typeof target.setInterval !== 'function') return;
      pollTimer = target.setInterval(poll, POLL_MS);
      if (pollTimer && pollTimer.unref) pollTimer.unref();
    }

    function bindScriptElement() {
      var doc = target.document;
      if (!doc || typeof doc.getElementById !== 'function') return;
      var el = doc.getElementById(SDK_ELEMENT_ID);
      if (!el || typeof el.addEventListener !== 'function') return;
      el.addEventListener('load', function () {
        poll();
        if (settled || failed) return;
        if (typeof target.setTimeout !== 'function') return;
        var t = target.setTimeout(function () {
          if (!sdkGlobal(target)) finish(null); else poll();
        }, GRACE_AFTER_LOAD_MS);
        if (t && t.unref) t.unref();
      });
      // Diblokir pemblokir iklan, jaringan mati, atau layanan Puter sedang down: jawabannya
      // "tidak tersedia" SEKARANG, bukan setelah 12 detik layar tunggu yang sia-sia.
      el.addEventListener('error', function () { finish(null); });
    }

    function ready(timeoutMs) {
      var immediate = sdkGlobal(target);
      if (immediate) settled = settled || immediate;
      if (settled) return Promise.resolve(settled);
      if (failed) return Promise.resolve(null);
      startPolling(timeoutMs);
      return new Promise(function (resolve) { waiters.push(resolve); });
    }

    var api = Object.freeze({
      schema: SCHEMA,
      elementId: SDK_ELEMENT_ID,
      defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
      /** Sudah terlihat SEKARANG? Hanya untuk keputusan yang tidak boleh menunggu. */
      available: function () { return !!(settled || sdkGlobal(target)); },
      /** Sudah pernah dijawab (siap atau menyerah)? Dipakai untuk memilih jalur cepat. */
      resolved: function () { return !!(settled || failed); },
      ready: ready,
      whenReady: function (fn, timeoutMs) {
        return ready(timeoutMs).then(function (value) {
          if (value && typeof fn === 'function') { try { return fn(value); } catch (_) { return null; } }
          return null;
        });
      },
      /** Menyerah lebih awal - dipakai tes dan jalur offline yang tahu Puter tidak akan datang. */
      giveUp: function () { finish(null); return true; },
      status: function () {
        return {
          schema: SCHEMA,
          state: settled ? 'ready' : (failed ? 'unavailable' : 'pending'),
          waitedMs: Math.round(now(target) - startedAt)
        };
      }
    });

    target.FiezelPuterReady = api;
    // Kalau SDK-nya kebetulan sudah tiba sebelum berkas ini dieksekusi, tidak perlu polling.
    var early = sdkGlobal(target);
    if (early) settled = early;
    else {
      bindScriptElement();
      startPolling(DEFAULT_TIMEOUT_MS);
    }
    return api;
  }

  var target = typeof globalThis !== 'undefined' ? globalThis : root;
  var api = install(target);
  if (typeof module === 'object' && module.exports) {
    module.exports = { schema: SCHEMA, install: install, api: api };
  }
}(typeof globalThis !== 'undefined' ? globalThis : this));
