/**
 * m025-150 satu-satunya pintu FIEZEL menuju audio ElevenLabs.
 *
 * MANDAT V2 pasal 4 dan 6. Komponen tidak boleh memanggil ElevenLabs, dan di sini larangan
 * itu bukan sekadar kesepakatan: modul ini memang tidak punya cara melakukannya. Tidak ada
 * kunci API, tidak ada URL ElevenLabs, tidak ada jalur tulis. Yang bisa dilakukannya hanya
 * dua hal - mencari kunci di manifest, dan memutar berkas statis yang sudah disetujui.
 *
 * Konsekuensinya disengaja: menekan tombol putar TIDAK PERNAH menghabiskan kredit. Aset yang
 * belum ada dijawab ABSENT, dan produksinya adalah pekerjaan pipeline batch di
 * tools/audio-batch-generate.mjs yang berjalan di GitHub Actions dengan rahasia tersimpan.
 * Itulah satu-satunya tempat kredit bisa terpakai, dan tempat itu butuh persetujuan manusia.
 *
 * ABSENT BUKAN KEGAGALAN YANG HARUS DISEMBUNYIKAN. Pemanggil menerimanya sebagai jawaban sah
 * dan boleh memilih jalur lain (mis. mesin lokal). Yang dilarang keras adalah menampilkan
 * aset sebagai siap padahal berkasnya belum terbukti bisa diputar - pasal 7.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FiezelAudioResolver = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SCHEMA = 'fiezel-audio-resolver-v1';

  var STATE = Object.freeze({
    ABSENT: 'ABSENT',
    READY: 'READY',
    FAILED: 'FAILED'
  });

  var metrics = {
    lookups: 0,
    cacheHits: 0,
    misses: 0,
    plays: 0,
    playFailures: 0,
    manifestErrors: 0,
    clientGenerations: 0
  };

  var current = null;

  function keys() { return root.FiezelAudioKey || null; }
  function manifest() { return root.FiezelAudioManifest || null; }

  /**
   * Profil suara yang dipakai untuk menghitung kunci. Manifest adalah sumber yang benar -
   * ia ditulis oleh generator yang benar-benar memanggil ElevenLabs. Konfigurasi halaman
   * hanya dipakai sebelum manifest termuat, dan kalau keduanya berbeda, kunci yang dihitung
   * tidak akan ketemu; itu terbaca sebagai ABSENT, bukan sebagai aset yang salah suara.
   */
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

  /**
   * @param {string|object} request teks, atau {text, locale, contentType}
   * @returns {object|null} identitas kanonik, atau null bila profil suara belum diketahui
   */
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
    } catch (_) {
      return null;
    }
  }

  /**
   * Mencari aset. Selalu selesai dengan tenang; kegagalan jaringan dilaporkan sebagai FAILED
   * yang boleh dicoba ulang, bukan sebagai ABSENT yang terdengar seperti kesimpulan tetap.
   */
  function resolve(request) {
    metrics.lookups++;
    var m = manifest();
    if (!m) {
      metrics.misses++;
      return Promise.resolve(Object.freeze({ schema: SCHEMA, state: STATE.ABSENT, reason: 'manifest_module_missing' }));
    }

    // MANIFEST DIMUAT LEBIH DULU, baru identitas dihitung. Urutan ini bukan selera.
    //
    // Profil suara yang benar hidup DI DALAM manifest, sementara FIEZEL_AUDIO_CONFIG.voiceId
    // sengaja dibiarkan kosong sampai batch pertama berjalan. Menghitung identitas lebih dulu
    // berarti menanyakan profil kepada sumber yang belum dibuka: jawabannya null, resolve()
    // menyerah dengan 'no_voice_profile', dan karena ia menyerah, manifest tidak pernah
    // dimuat - buntu yang tidak bisa pulih sendiri. Semua aset yang sudah dibayar terbaca
    // ABSENT selamanya, tanpa satu pun galat yang terlihat.
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
      return Object.freeze({
        schema: SCHEMA, state: STATE.FAILED, retryable: true,
        reason: String(error && error.message ? error.message : error)
      });
    });
  }

  function stop() {
    if (!current) return false;
    var el = current;
    current = null;
    try { el.pause(); } catch (_) {}
    try { el.src = ''; } catch (_) {}
    // Janji pemutaran diselesaikan di sini, bukan diserahkan ke peristiwa error.
    // Menyetel src='' tidak dijamin memicu error di setiap browser, dan janji yang tidak
    // pernah selesai akan menahan pemanggil yang menunggunya - satu stop() lalu berhenti
    // selamanya, tepat di tengah pelajaran.
    if (typeof el.__fiezelSettle === 'function') { try { el.__fiezelSettle(false); } catch (_) {} }
    return true;
  }

  /**
   * Memutar MP3 statis. onProgress dipanggil dengan (detikBerjalan, totalDetik) supaya pita
   * subtitle yang sudah ada tetap bergerak seperti pada mesin lama - kontraknya sengaja
   * dibuat sama agar pemanggil tidak perlu tahu suaranya datang dari mana.
   */
  function playUrl(url, options) {
    var opts = options || {};
    var Ctor = root.Audio;
    if (typeof Ctor !== 'function') return Promise.resolve(false);
    stop();

    return new Promise(function (done) {
      var el;
      try { el = new Ctor(); } catch (_) { done(false); return; }
      current = el;
      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        try { root.clearTimeout(el.__fiezelGuard); } catch (_) {}
        if (current === el) current = null;
        if (ok) metrics.plays++; else metrics.playFailures++;
        done(ok);
      }
      el.__fiezelSettle = finish;

      // BATAS WAKTU, dan ini yang paling penting di fungsi ini.
      //
      // Pemuatan media lintas-origin bisa menggantung tanpa pernah memicu error - jaringan
      // setengah hidup, portal kampus, sinyal yang datang-pergi. Tanpa batas ini janjinya
      // tidak pernah selesai, say() tidak pernah kembali, dan mesin cadangan tidak pernah
      // sempat dicoba: FIEZEL diam total, tanpa satu pun pesan galat. Lebih baik menyerah
      // dalam sepuluh detik dan membiarkan mesin lain bicara.
      el.__fiezelGuard = root.setTimeout(function () { finish(false); }, 10000);
      el.addEventListener('playing', function () {
        // Sudah benar-benar berbunyi. Sejak titik ini durasinya yang menentukan, bukan jam.
        try { root.clearTimeout(el.__fiezelGuard); } catch (_) {}
      });

      el.preload = 'auto';
      if (typeof opts.speed === 'number' && opts.speed > 0) el.playbackRate = opts.speed;
      if (typeof opts.onProgress === 'function') {
        el.addEventListener('timeupdate', function () {
          try { opts.onProgress(el.currentTime || 0, el.duration || 0); } catch (_) {}
        });
      }
      el.addEventListener('ended', function () { finish(true); });
      el.addEventListener('error', function () { finish(false); });
      el.src = url;
      var started = null;
      try { started = el.play(); } catch (_) { finish(false); return; }
      if (started && typeof started.catch === 'function') {
        started.catch(function () { finish(false); });
      }
    });
  }

  /**
   * Jalur lengkap: cari lalu putar. Mengembalikan false bila asetnya belum ada, sehingga
   * pemanggil bisa memutuskan sendiri apa yang terjadi berikutnya.
   */
  function play(request, options) {
    return resolve(request).then(function (result) {
      if (result.state !== STATE.READY) return false;
      return playUrl(result.url, options);
    });
  }

  /**
   * Meminta browser mengunduh aset lebih awal. Tidak pernah memicu produksi apa pun.
   *
   * mode 'no-cors' dipilih dengan sengaja, dan bukan karena CORS-nya bermasalah. Elemen
   * <audio> memuat berkasnya sebagai permintaan no-cors; permintaan CORS ke URL yang sama
   * masuk ke kunci cache yang BERBEDA. Prefetch bermode cors karena itu akan berhasil,
   * melaporkan sukses, dan tidak mengisi entri yang beberapa detik kemudian dicari pemutar.
   */
  function prefetch(request) {
    return resolve(request).then(function (result) {
      if (result.state !== STATE.READY) return false;
      var f = root.fetch;
      if (typeof f !== 'function') return false;
      return f(result.url, { mode: 'no-cors', cache: 'force-cache' }).then(function (res) {
        // Respons opaque tidak punya status yang bisa dibaca, jadi 'opaque' dihitung
        // berhasil. Yang tidak boleh terjadi adalah 404 bermode cors dilaporkan sukses -
        // pemanggil akan melewati prefetch mesin runtime untuk kalimat yang tak punya aset.
        return !!res && (res.type === 'opaque' || res.ok);
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
      playing: !!current
    });
  }

  function resetMetrics() {
    metrics.lookups = 0; metrics.cacheHits = 0; metrics.misses = 0;
    metrics.plays = 0; metrics.playFailures = 0; metrics.manifestErrors = 0;
    metrics.clientGenerations = 0;
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
