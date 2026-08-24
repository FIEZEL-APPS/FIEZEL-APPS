/**
 * m025-150 satu-satunya pintu FIEZEL menuju audio ElevenLabs.
 *
 * MANDAT V2 pasal 4 dan 6. Komponen tidak boleh memanggil ElevenLabs, dan di sini larangan
 * itu bukan sekadar kesepakatan: modul ini memang tidak punya cara melakukannya. Tidak ada
 * kunci API, tidak ada URL ElevenLabs, tidak ada jalur tulis. Yang bisa dilakukannya hanya
 * dua hal - mencari kunci di manifest, dan memutar berkas statis yang sudah disetujui.
 *
 * m025-151: asset R2 yang sudah diambil sekarang juga dicache secara persistent di browser.
 * Cache ini hanya mengurangi pembacaan ulang dari R2; ia tidak mengubah manifest atau pipeline
 * generator. Jika cache tidak tersedia/rusak, playback tetap kembali ke URL R2.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FiezelAudioResolver = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SCHEMA = 'fiezel-audio-resolver-v1';
  var CACHE_NAME = 'fiezel-r2-audio-v1';
  var STATE = Object.freeze({ ABSENT: 'ABSENT', READY: 'READY', FAILED: 'FAILED' });

  var metrics = {
    lookups: 0,
    cacheHits: 0,
    misses: 0,
    plays: 0,
    playFailures: 0,
    manifestErrors: 0,
    clientGenerations: 0,
    persistentCacheHits: 0,
    persistentCacheStores: 0,
    persistentCacheMisses: 0
  };

  var current = null;

  function keys() { return root.FiezelAudioKey || null; }
  function manifest() { return root.FiezelAudioManifest || null; }

  function voiceProfile() {
    var m = manifest();
    var fromManifest = m && m.status ? m.status().voiceProfile : null;
    if (fromManifest && fromManifest.voiceId && fromManifest.modelId) return fromManifest;
    var cfg = root.FIEZEL_AUDIO_CONFIG;
    if (cfg && cfg.voiceId && cfg.modelId) {
      return { voiceId: cfg.voiceId, modelId: cfg.modelId, settings: cfg.settings || {} };
    }
    return null;
  }

  function identify(request) {
    var k = keys();
    if (!k) return null;
    var profile = voiceProfile();
    if (!profile) return null;
    var req = typeof request === 'string' ? { text: request } : (request || {});
    try {
      return k.build({
        text: req.text,
        locale: req.locale || 'en-US',
        contentType: req.contentType || 'sentence',
        voiceId: profile.voiceId,
        modelId: profile.modelId,
        settings: profile.settings
      });
    } catch (_) { return null; }
  }

  function resolve(request) {
    metrics.lookups++;
    var m = manifest();
    if (!m) {
      metrics.misses++;
      return Promise.resolve(Object.freeze({ schema: SCHEMA, state: STATE.ABSENT, reason: 'manifest_module_missing' }));
    }

    return m.load().then(function () {
      var identity = identify(request);
      if (!identity) {
        metrics.misses++;
        return Object.freeze({ schema: SCHEMA, state: STATE.ABSENT, reason: 'no_voice_profile' });
      }
      var entry = m.lookup(identity.audioKey);
      if (!entry) {
        metrics.misses++;
        return Object.freeze({ schema: SCHEMA, state: STATE.ABSENT, reason: 'not_generated', audioKey: identity.audioKey, identity: identity });
      }
      metrics.cacheHits++;
      return Object.freeze({ schema: SCHEMA, state: STATE.READY, audioKey: identity.audioKey, url: entry.url, entry: entry, identity: identity });
    }).catch(function (error) {
      metrics.manifestErrors++;
      return Object.freeze({ schema: SCHEMA, state: STATE.FAILED, retryable: true, reason: String(error && error.message ? error.message : error) });
    });
  }

  function stop() {
    if (!current) return false;
    var el = current;
    current = null;
    try { el.pause(); } catch (_) {}
    try { el.src = ''; } catch (_) {}
    if (typeof el.__fiezelSettle === 'function') { try { el.__fiezelSettle(false); } catch (_) {} }
    return true;
  }

  function cacheSupported() {
    return !!(root.caches && typeof root.caches.open === 'function');
  }

  function cacheKey(url) {
    try { return new root.Request(url, { method: 'GET' }); }
    catch (_) { return url; }
  }

  function cachedResponse(url) {
    if (!cacheSupported()) {
      metrics.persistentCacheMisses++;
      return Promise.resolve(null);
    }
    return root.caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(cacheKey(url)).then(function (response) {
        if (response) metrics.persistentCacheHits++;
        else metrics.persistentCacheMisses++;
        return response || null;
      });
    }).catch(function () {
      metrics.persistentCacheMisses++;
      return null;
    });
  }

  function storeResponse(url, response) {
    if (!cacheSupported() || !response) return Promise.resolve(false);
    var copy;
    try { copy = response.clone(); } catch (_) { return Promise.resolve(false); }
    return root.caches.open(CACHE_NAME).then(function (cache) {
      return cache.put(cacheKey(url), copy).then(function () {
        metrics.persistentCacheStores++;
        return true;
      });
    }).catch(function () { return false; });
  }

  /**
   * Mode CORS, BUKAN no-cors, dan perbedaannya menentukan hidup-matinya pemutaran.
   *
   * no-cors menghasilkan respons opaque: statusnya 0 dan badannya tidak bisa dibaca, jadi
   * .blob() mengembalikan blob berukuran 0 byte. Lapisan cache ini membangun object URL dari
   * blob itu, sehingga setiap aset gagal diputar tanpa satu pun galat - resolve() menjawab
   * READY, play() menjawab false, dan seluruh katalog berbayar diam-diam jatuh kembali ke
   * mesin lama. Diukur di produksi: no-cors memberi 0 byte, cors memberi 10.075 byte untuk
   * berkas yang sama.
   *
   * CORS aman di sini karena Worker R2 memang menyajikan 'access-control-allow-origin: *'
   * beserta 'vary: origin'. Aset ini publik dan tidak membawa kredensial.
   */
  function loadForPlayback(url) {
    return cachedResponse(url).then(function (cached) {
      if (cached) return cached;
      var f = root.fetch;
      if (typeof f !== 'function') return null;
      return f(url, { cache: 'force-cache' }).then(function (response) {
        if (!response || !response.ok) return null;
        storeResponse(url, response);
        return response;
      }).catch(function () { return null; });
    });
  }

  function responseToObjectUrl(response) {
    if (!response || typeof response.blob !== 'function') return Promise.resolve(null);
    return response.blob().then(function (blob) {
      if (!blob || !blob.size) return null;
      try { return root.URL.createObjectURL(blob); } catch (_) { return null; }
    }).catch(function () { return null; });
  }

  function playUrl(url, options) {
    var opts = options || {};
    var Ctor = root.Audio;
    if (typeof Ctor !== 'function') return Promise.resolve(false);
    stop();

    return loadForPlayback(url).then(function (response) {
      if (!response) return false;
      return responseToObjectUrl(response).then(function (objectUrl) {
        if (!objectUrl) return false;
        return new Promise(function (done) {
          var el;
          try { el = new Ctor(); } catch (_) { try { root.URL.revokeObjectURL(objectUrl); } catch (_) {} done(false); return; }
          current = el;
          var settled = false;
          function finish(ok) {
            if (settled) return;
            settled = true;
            try { root.clearTimeout(el.__fiezelGuard); } catch (_) {}
            try { root.URL.revokeObjectURL(objectUrl); } catch (_) {}
            if (current === el) current = null;
            if (ok) metrics.plays++; else metrics.playFailures++;
            done(ok);
          }
          el.__fiezelSettle = finish;
          el.__fiezelGuard = root.setTimeout(function () { finish(false); }, 10000);
          el.addEventListener('playing', function () { try { root.clearTimeout(el.__fiezelGuard); } catch (_) {} });
          el.preload = 'auto';
          if (typeof opts.speed === 'number' && opts.speed > 0) el.playbackRate = opts.speed;
          if (typeof opts.onProgress === 'function') {
            el.addEventListener('timeupdate', function () {
              try { opts.onProgress(el.currentTime || 0, el.duration || 0); } catch (_) {}
            });
          }
          el.addEventListener('ended', function () { finish(true); });
          el.addEventListener('error', function () { finish(false); });
          el.src = objectUrl;
          var started = null;
          try { started = el.play(); } catch (_) { finish(false); return; }
          if (started && typeof started.catch === 'function') started.catch(function () { finish(false); });
        });
      });
    });
  }

  function play(request, options) {
    return resolve(request).then(function (result) {
      if (result.state !== STATE.READY) return false;
      return playUrl(result.url, options);
    });
  }

  function prefetch(request) {
    return resolve(request).then(function (result) {
      if (result.state !== STATE.READY) return false;
      var f = root.fetch;
      if (typeof f !== 'function') return false;
      // Mode yang sama dengan loadForPlayback. Kalau keduanya berbeda, prefetch mengisi
      // entri cache yang tidak akan pernah dicari pemutar - sukses semu yang membuat
      // pemanggil melewati prefetch mesin runtime untuk kalimat yang tetap belum siap.
      return f(result.url, { cache: 'force-cache' }).then(function (res) {
        if (!res || !res.ok) return false;
        storeResponse(result.url, res);
        return true;
      }).catch(function () { return false; });
    });
  }

  function status() {
    var m = manifest();
    return Object.freeze({
      schema: SCHEMA,
      manifest: m && m.status ? m.status() : null,
      voiceProfile: voiceProfile(),
      metrics: Object.freeze(Object.assign({}, metrics)),
      playing: !!current,
      persistentCache: Object.freeze({ name: CACHE_NAME, supported: cacheSupported() })
    });
  }

  function resetMetrics() {
    metrics.lookups = 0; metrics.cacheHits = 0; metrics.misses = 0;
    metrics.plays = 0; metrics.playFailures = 0; metrics.manifestErrors = 0;
    metrics.clientGenerations = 0; metrics.persistentCacheHits = 0;
    metrics.persistentCacheStores = 0; metrics.persistentCacheMisses = 0;
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    STATE: STATE,
    identify: identify,
    resolve: resolve,
    play: play,
    playUrl: playUrl,
    prefetch: prefetch,
    stop: stop,
    status: status,
    resetMetrics: resetMetrics
  });
}));