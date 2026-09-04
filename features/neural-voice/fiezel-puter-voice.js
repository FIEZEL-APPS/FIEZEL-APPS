/**
 * m025-92 mesin suara Inggris lewat Puter, menggantikan inferensi lokal.
 *
 * LATAR. Suara neural lama menjalankan model di perangkat, dan itu melahirkan dua
 * masalah yang saling terkait: pengguna wajib mengunduh ratusan megabita sebelum
 * aplikasi bisa bicara, dan keluarannya pecah di akhir kalimat serta di sambungan
 * antar potongan. Yang kedua sudah ditambal berlapis - worklet, fade, penjadwalan
 * seam, prefetch - dan tiap lapis menambal gejala lapis sebelumnya.
 *
 * Probe di tools/ menjalankan enam konfigurasi pada perangkat OWNER dan menjawabnya:
 *
 *   - cracking HILANG begitu render dipindah ke server. Seluruh lapisan tambalan itu
 *     tidak lagi punya alasan untuk ada.
 *   - teks telanjang di engine hemat terdengar DATAR.
 *   - SSML tidak dilayani, dan cara gagalnya diam: menggantung tanpa menolak.
 *   - engine 'generative' dengan TEKS APA ADANYA satu-satunya yang OWNER nilai bagus.
 *
 * Maka modul ini sengaja tidak pintar. Ia tidak membentuk teks, tidak menyusun SSML,
 * dan tidak memotong kalimat sebelum dikirim - tiga hal yang sudah diuji dan tidak
 * dipilih. Satu kalimat panjang dikirim utuh dalam satu panggilan, karena begitulah
 * konfigurasi yang menang berbunyi.
 *
 * Yang tetap dijaga ketat ada tiga, semuanya pelajaran dari kegagalan sebelumnya:
 *
 *   1. BATAS WAKTU. Panggilan yang menggantung harus menjadi kegagalan yang dilaporkan.
 *      Probe revisi 1 tidak memasangnya dan satu panggilan macet membekukan segalanya.
 *   2. SINGGAH SIMPAN. Kalimat yang sama diputar berkali-kali selama belajar. Merender
 *      ulang yang sudah pernah dirender itu membakar kuota tanpa menambah apa pun.
 *   3. SUPERSESI BUKAN GALAT. Berpindah dari soal A1 ke A2 membatalkan permintaan yang
 *      sedang berjalan. m025-29 mencatat kejadian ini diperlakukan sebagai kerusakan
 *      keras sehingga seluruh mesin terkunci sampai halaman dimuat ulang. Di sini
 *      pembatalan adalah alur kendali biasa dan tidak pernah melatch apa pun.
 *
 * Bentuk antarmukanya sengaja mengikuti FiezelVoiceRuntime (status/speak/stop/ensureReady)
 * supaya pemanggil yang ada tidak perlu tahu mesinnya berganti.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FiezelPuterVoice = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SCHEMA = 'fiezel-puter-voice-v1';
  var CACHE_NAME = 'fiezel-puter-voice-v1';

  // Konfigurasi yang menang di probe. Bukan bawaan yang bisa digeser sembarangan:
  // 'neural' sudah diuji dan dinilai datar, jadi menurunkannya diam-diam ke sana
  // berarti mengembalikan cacat yang baru saja dibuang.
  var ENGINE = 'generative';
  var LANG = 'en-US';

  var CALL_TIMEOUT_MS = 25000;
  var SDK_TIMEOUT_MS = 15000;
  // Melebihi ini, satu ucapan bukan lagi kalimat pelajaran melainkan salah pakai.
  var MAX_CHARS = 3000;

  var state = {
    lastError: '',
    calls: 0,
    cacheHits: 0,
    speaking: false
  };

  var current = null;
  var token = 0;

  /* ---- utilitas ------------------------------------------------------- */

  function errorText(e) {
    return String((e && e.message) || e || 'unknown_error').slice(0, 300);
  }

  /** Pembatalan yang disengaja tidak boleh terbaca sebagai kerusakan mesin. */
  function isSuperseded(e) {
    return /superseded|stopped|aborted/i.test(errorText(e));
  }

  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('puter_timeout:' + label));
      }, ms);
      promise.then(function (v) {
        if (settled) return; settled = true; clearTimeout(timer); resolve(v);
      }, function (e) {
        if (settled) return; settled = true; clearTimeout(timer); reject(e);
      });
    });
  }

  function sdkReady() {
    return !!(root.puter && root.puter.ai && typeof root.puter.ai.txt2speech === 'function');
  }

  function waitForSdk() {
    return new Promise(function (resolve, reject) {
      if (sdkReady()) return resolve(root.puter);
      var end = Date.now() + SDK_TIMEOUT_MS;
      (function poll() {
        if (sdkReady()) return resolve(root.puter);
        if (Date.now() > end) return reject(new Error('puter_sdk_unavailable'));
        setTimeout(poll, 120);
      })();
    });
  }

  /**
   * Kunci singgah simpan. Ikut menghitung engine dan bahasa, karena teks yang sama
   * pada engine berbeda adalah audio berbeda - menyamakannya akan menyajikan suara
   * lama setelah konfigurasi diganti, yaitu galat yang sangat sulit dilacak.
   */
  function cacheKey(text, opts) {
    var settings = opts || {};
    var raw = [
      SCHEMA,
      settings.engine || ENGINE,
      settings.lang || LANG,
      String(settings.speed || 1),
      String(text == null ? '' : text)
    ].join(' ');
    var h = 5381;
    for (var i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
    return 'https://fiezel.invalid/tts/' + (h >>> 0).toString(36) + '/' + raw.length;
  }

  function cacheStore() {
    try {
      if (!root.caches || typeof root.caches.open !== 'function') return null;
      return root.caches.open(CACHE_NAME);
    } catch (_) { return null; }
  }

  function cachedBlob(key) {
    var store = cacheStore();
    if (!store) return Promise.resolve(null);
    return store.then(function (c) { return c.match(key); })
      .then(function (res) { return res ? res.blob() : null; })
      .catch(function () { return null; });
  }

  function putBlob(key, blob) {
    var store = cacheStore();
    if (!store || !blob) return Promise.resolve(false);
    return store.then(function (c) {
      return c.put(key, new Response(blob, {
        headers: { 'Content-Type': blob.type || 'audio/mpeg' }
      }));
    }).then(function () { return true; }).catch(function () { return false; });
  }

  /**
   * Bentuk kembalian txt2speech tidak dijanjikan seragam; probe mencatat elemen audio,
   * Blob, dan URL semuanya mungkin. Ketiganya diterima, dan yang tak dikenal ditolak
   * dengan jelas alih-alih diam.
   */
  function toBlob(result) {
    if (!result) return Promise.reject(new Error('puter_empty_result'));
    if (typeof Blob !== 'undefined' && result instanceof Blob) return Promise.resolve(result);
    var url = null;
    if (typeof result === 'string') url = result;
    else if (root.HTMLAudioElement && result instanceof root.HTMLAudioElement) url = result.src;
    else if (result.src) url = result.src;
    if (!url) return Promise.reject(new Error('puter_unknown_result_shape'));
    return fetch(url).then(function (r) { return r.blob(); });
  }

  /* ---- memo kredit habis ---------------------------------------------- */

  /**
   * m026-02 AKAR POPUP BERULANG. Dialog "upgrade" itu BUKAN milik FIEZEL: SDK
   * js.puter.com memunculkannya sendiri untuk SETIAP panggilan yang kandas dengan
   * 402 insufficient_funds (docs.puter.com/rate-limits-and-quotas). Karena tiap item
   * listening adalah skrip unik, satu sesi 10 item = 10 panggilan kandas = 10 dialog.
   *
   * Satu-satunya cara andal mematikannya adalah TIDAK MEMANGGIL LAGI. Memo di bawah ini
   * berumur satu sesi halaman: begitu satu kegagalan berkode kredit terlihat, panggilan
   * berikutnya ditolak di sini - sebelum menyentuh SDK - sehingga pemanggil langsung
   * jatuh ke suara cadangan perangkat tanpa dialog pihak ketiga muncul sekali pun.
   *
   * Yang TIDAK dilakukan: menebak dari naskah pesan galat. Keberatan di
   * fiezel-voice-say.js:57-61 tetap dihormati - pemeriksaannya TERSTRUKTUR (status 402
   * atau code insufficient_funds/insufficient_credit, keduanya terdokumentasi resmi),
   * jadi ia tidak akan diam-diam salah pada hari Puter mengubah kalimatnya.
   */
  var creditExhausted = false;
  var pendingCreditNotice = false;

  function errorCodeOf(error) {
    if (!error || typeof error !== 'object') return '';
    var nested = error.error && typeof error.error === 'object' ? error.error : null;
    return String(error.code || (nested && nested.code) || '').toLowerCase();
  }

  function errorStatusOf(error) {
    if (!error || typeof error !== 'object') return 0;
    var nested = error.error && typeof error.error === 'object' ? error.error : null;
    var response = error.response && typeof error.response === 'object' ? error.response : null;
    return Number(
      error.status || error.statusCode ||
      (nested && (nested.status || nested.statusCode)) ||
      (response && response.status) || 0
    ) || 0;
  }

  function isInsufficientCredit(error) {
    if (errorStatusOf(error) === 402) return true;
    var code = errorCodeOf(error);
    return code === 'insufficient_funds' || code === 'insufficient_credit';
  }

  function outOfCreditError() {
    var e = new Error('puter_out_of_credit');
    e.code = 'insufficient_funds';
    e.outOfCredit = true;
    return e;
  }

  function noteCreditExhausted() {
    creditExhausted = true;
    // Benderanya hanya DINAIKKAN di sini; yang menampilkan pemberitahuan adalah app.js di
    // ujung sesi (maybePresentPuterCreditNotice), bukan di tengah item.
    pendingCreditNotice = true;
    state.lastError = 'puter_out_of_credit';
    return true;
  }

  /** Dikonsumsi app.js SEKALI di luar sesi; setelah diambil, benderanya turun. */
  function consumeCreditNotice() {
    var pending = pendingCreditNotice;
    pendingCreditNotice = false;
    return pending;
  }

  function creditStatus() {
    return { outOfCredit: creditExhausted, noticePending: pendingCreditNotice };
  }

  /* ---- render --------------------------------------------------------- */

  function render(text, settings) {
    var key = cacheKey(text, settings);
    return cachedBlob(key).then(function (hit) {
      if (hit) { state.cacheHits++; return hit; }
      // Singgah simpan diperiksa LEBIH DULU: audio yang sudah ada tidak memakai kredit,
      // jadi memo tidak boleh membisukan kalimat yang sebenarnya gratis.
      if (creditExhausted) return Promise.reject(outOfCreditError());
      return waitForSdk().then(function (p) {
        state.calls++;
        // Teks dikirim apa adanya. Lihat catatan kepala berkas: membentuknya lebih
        // dulu adalah konfigurasi yang sudah diuji dan tidak dipilih.
        return withTimeout(
          p.ai.txt2speech(text, { language: settings.lang, engine: settings.engine }),
          CALL_TIMEOUT_MS,
          'txt2speech'
        );
      }).catch(function (e) {
        if (isInsufficientCredit(e)) { noteCreditExhausted(); throw outOfCreditError(); }
        throw e;
      }).then(toBlob).then(function (blob) {
        return putBlob(key, blob).then(function () { return blob; });
      });
    });
  }

  /* ---- pemutaran ------------------------------------------------------ */

  function stop() {
    token++;
    var c = current;
    current = null;
    state.speaking = false;
    if (c && c.audio) {
      try { c.audio.pause(); } catch (_) {}
      try { if (c.objectUrl) URL.revokeObjectURL(c.objectUrl); } catch (_) {}
    }
    return true;
  }

  function play(blob, mine, onProgress, speed) {
    return new Promise(function (resolve, reject) {
      var objectUrl = URL.createObjectURL(blob);
      var audio = new Audio(objectUrl);

      // m025-96: kecepatan bicara diterapkan di pemutar, bukan dikirim ke penyedia.
      // Puter tidak menerimanya, dan tanpa baris ini penggeser kecepatan di pengaturan
      // menjadi kendali yang tidak mengendalikan apa pun - kalibrasi yang OWNER susun
      // lintas tiga build akan hilang diam-diam. Dibatasi karena di luar rentang ini
      // suaranya berhenti terdengar sebagai orang berbicara.
      var rate = Number(speed);
      if (rate > 0) audio.playbackRate = Math.min(1.6, Math.max(0.6, rate));

      current = { audio: audio, token: mine, objectUrl: objectUrl };

      function cleanup() {
        try { URL.revokeObjectURL(objectUrl); } catch (_) {}
        if (current && current.token === mine) { current = null; state.speaking = false; }
      }

      // Inilah kait yang dipakai subtitle: waktu putar nyata, bukan perkiraan timer.
      // Timer terpisah akan hanyut terhadap audio, dan itu terlihat sebagai subtitle
      // yang makin lama makin meleset.
      if (typeof onProgress === 'function') {
        audio.addEventListener('timeupdate', function () {
          if (mine !== token) return;
          onProgress(audio.currentTime || 0, audio.duration || 0);
        });
      }

      audio.addEventListener('ended', function () {
        var total = audio.duration || 0;
        cleanup();
        if (mine !== token) return resolve(false);
        if (typeof onProgress === 'function') onProgress(total, total);
        resolve(true);
      });
      audio.addEventListener('error', function () {
        cleanup();
        reject(new Error('puter_playback_failed'));
      });

      var started = audio.play();
      if (started && started.catch) started.catch(function (e) { cleanup(); reject(e); });
    });
  }

  /* ---- api ------------------------------------------------------------ */

  function status() {
    return Object.freeze({
      schema: SCHEMA,
      engine: ENGINE,
      lang: LANG,
      provider: 'puter-txt2speech',
      // Tidak ada yang perlu diunduh dan tidak ada yang perlu diinisialisasi: itu
      // seluruh alasan perpindahan ini, jadi keduanya benar tanpa syarat.
      prepared: true,
      ready: true,
      requiresDownload: false,
      totalBytes: 0,
      sdkPresent: sdkReady(),
      speaking: state.speaking,
      calls: state.calls,
      cacheHits: state.cacheHits,
      error: state.lastError,
      zeroPaidRuntime: true
    });
  }

  /**
   * Merender kalimat berikutnya ke singgah simpan tanpa memutarnya.
   *
   * m025-47 mencatat jeda 10-15 detik antar kalimat saat narasi buku, dan sebabnya
   * bukan kecepatan render melainkan antrian: kalimat berikutnya sempat memesan mesin
   * sebelum kalimat sekarang sampai. Di sini masalah itu tidak bisa terjadi karena
   * prefetch tidak menyentuh pemutar sama sekali - ia hanya mengisi singgah simpan,
   * sehingga speak() berikutnya menemukan audionya sudah ada dan langsung berbunyi.
   *
   * Gagalnya selalu diam: ini pekerjaan spekulatif, dan kegagalannya tidak boleh
   * terlihat oleh pembaca maupun melatch apa pun.
   */
  function prefetch(text, options) {
    var opts = options || {};
    var value = String(text == null ? '' : text).trim();
    if (!value || value.length > MAX_CHARS) return Promise.resolve(false);
    return render(value, {
      engine: opts.engine || ENGINE,
      lang: opts.lang || LANG,
      speed: opts.speed || opts.rate || 1
    }).then(function () { return true; }).catch(function () { return false; });
  }

  function prepare() { return Promise.resolve(status()); }
  function ensureReady() { return Promise.resolve(status()); }

  /**
   * @param {string} text  kalimat Inggris, dikirim apa adanya
   * @param {object} [options]
   *        options.onProgress(currentTimeSec, durationSec) - untuk subtitle berjalan
   */
  function speak(text, options) {
    var opts = options || {};
    var value = String(text == null ? '' : text).trim();
    if (!value) return Promise.resolve(false);
    if (value.length > MAX_CHARS) {
      return Promise.reject(new Error('puter_text_too_long:' + value.length));
    }

    // Ucapan baru menggantikan yang lama. stop() menaikkan token, sehingga hasil
    // permintaan lama yang datang terlambat tidak akan pernah ikut berbunyi.
    stop();
    var mine = token;
    state.speaking = true;

    var settings = {
      engine: opts.engine || ENGINE,
      lang: opts.lang || LANG,
      speed: opts.speed || opts.rate || 1
    };

    return render(value, settings).then(function (blob) {
      if (mine !== token) return false;   // sudah disalip; bukan galat
      return play(blob, mine, opts.onProgress, settings.speed);
    }).catch(function (e) {
      state.speaking = false;
      if (isSuperseded(e) || mine !== token) return false;
      state.lastError = errorText(e);
      throw e;
    });
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    ENGINE: ENGINE,
    LANG: LANG,
    CALL_TIMEOUT_MS: CALL_TIMEOUT_MS,
    MAX_CHARS: MAX_CHARS,
    status: status,
    creditStatus: creditStatus,
    consumeCreditNotice: consumeCreditNotice,
    isInsufficientCreditError: isInsufficientCredit,
    prepare: prepare,
    ensureReady: ensureReady,
    speak: speak,
    prefetch: prefetch,
    stop: stop,
    cacheKey: cacheKey
  });
}));
