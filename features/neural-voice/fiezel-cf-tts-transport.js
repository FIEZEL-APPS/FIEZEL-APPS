/**
 * S6 — lapisan suara Cloudflare untuk sisi klien: `POST /api/tts/render`.
 *
 * KENAPA BERKAS INI BERDIRI SENDIRI. Tangga suara di `fiezel-voice-say.js` baru selesai
 * diperbaiki dua kali (m026-BUG2 kebisuan murid baru, v5 prefetch neural) dan kontrak
 * `fiezel-web-audio-player.js` / `fiezel-prosody.js` / `fiezel-neural-voice.js` juga baru
 * dipulihkan. Menyisipkan transport jaringan ke dalam berkas-berkas itu berarti mencampur
 * satu jalur yang sudah terbukti dengan satu jalur yang belum pernah hidup. Jadi seluruh
 * pengetahuan tentang Cloudflare tinggal DI SINI, dan `fiezel-voice-say.js` hanya memanggil
 * dua fungsi (`cachedUrl`, `render`) di antara dua lapisan yang sudah ada.
 *
 * TANGGA SAAT `FIEZEL_CF_CONFIG.endpoints.tts === 'on'` (dan `enabled:true` + `base` terisi):
 *
 *   C0 cache Cache API klien ....... cachedUrl()      → URL R2 yang pernah berhasil diputar
 *   L1 manifest aset R2 ............ (tetap di fiezel-voice-say.js, tidak diubah)
 *   C1 POST /api/tts/render ........ render()         → BERKAS INI
 *   L2 Puter ....................... (tidak diubah)
 *   L3 neural lokal, hanya prepared  (tidak diubah, pagar 152 MB utuh)
 *   L4 speechSynthesis ............. (tidak diubah)
 *   L5 teks saja ................... (tidak diubah)
 *
 * Saat flag bukan 'on', `mode()` menjawab 'off' dan SETIAP fungsi di sini pulang tanpa
 * menyentuh jaringan sama sekali: nol fetch, nol Cache API, nol perubahan perilaku.
 *
 * EMPAT ATURAN YANG TIDAK BOLEH DILONGGARKAN, dan alasannya masing-masing sudah dibayar:
 *
 *  1. KUNCI CACHE DIHITUNG DI SERVER. Klien tidak mengirim `audioKey` dan tidak mempercayai
 *     kunci dari mana pun (`workers/api/tts/route-tts.js` langkah 1). Kunci yang dipercaya
 *     adalah kunci yang bisa dikarang: satu klien nakal bisa memaksa produksi berbayar untuk
 *     teks yang sudah ada di R2, atau menuliskan teks lain ke atas nama kunci kalimat sah.
 *     Tag lokal yang dipakai C0 (`localTag()`) SENGAJA bukan sha256 dan hanya 16 heksa,
 *     supaya mustahil tertukar dengan `audioKey` 64-heksa milik server, dan ia tidak pernah
 *     ikut dikirim.
 *  2. `speed` TIDAK PERNAH MASUK BADAN PERMINTAAN. Kecepatan adalah urusan pemutaran
 *     (`playbackRate`), bukan identitas suara. Ini persis bug bayar-ulang cf-a5/cf-a10 yang
 *     sudah ditutup di `tts-key.js` (satu kalimat dibayar tiga kali untuk SPEED_STEPS
 *     [0.75, 1, 1.25], dan dua kali lagi antara Listening `ttsRate` 0.86 dan Library).
 *     Menyalakannya kembali dari sisi klien akan membatalkan perbaikan itu tanpa satu pun
 *     galat yang terlihat — karena itu `stripPlaybackFields()` membuang seluruh keluarga
 *     field pemutar, termasuk yang diselipkan di dalam `settings`.
 *  3. CACHE HIT BENAR-BENAR GRATIS. Kalau server menjawab dengan URL objek R2 yang sudah
 *     ada, audionya diambil LANGSUNG dari `audio.fiezel.my.id` — bukan lewat jembatan PHP
 *     origin (`deploy/edge/api-index.php`). Jembatan itu ada untuk cookie pihak pertama pada
 *     JSON kecil; melewatkan MP3 melaluinya berarti byte audio menumpang origin ArenHost
 *     yang justru sedang dihindari (wrangler.toml: "cache-hit dijawab dengan URL publik,
 *     BUKAN dengan mem-proxy byte: nol CPU, nol subrequest, egress gratis").
 *  4. 429 TIDAK PERNAH MENJADI KEBISUAN YANG DIAM. Kuota habis mengembalikan
 *     `{ok:false, status:429}` dan pemanggil MENURUNI tangga (Puter → neural → peramban),
 *     sehingga murid tetap mendengar sesuatu bila mungkin. Berkas ini tidak menyentuh state
 *     pelajaran: ia tidak mengunci item, tidak menaikkan hitungan replay, tidak menulis
 *     progres (bug m025-170 yang baru diperbaiki di addon listening).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FiezelCfTtsTransport = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SCHEMA = 'fiezel-cf-tts-transport-v1';
  var RENDER_PATH = '/api/tts/render';
  var CACHE_NAME = 'fiezel-cf-tts-url-v1';
  // Alamat sintetis, tidak pernah di-fetch: ia hanya nama entri Cache API. `.local` dipilih
  // supaya jelas bahwa ini bukan asal yang bisa dihubungi.
  var LOCAL_CACHE_ORIGIN = 'https://cf-tts.fiezel.local/v1/';
  var RENDER_TIMEOUT_MS = 12000;
  // Prerender korpus memakai voiceId ini (tools/prerender-tts.mjs:56). Memakai nilai lain di
  // klien berarti kunci server berbeda dan seluruh korpus yang sudah dibayar dianggap belum
  // ada — jadi nilai bawaannya WAJIB sama, dan hanya boleh diubah bersama pra-render.
  var DEFAULT_VOICE_ID = 'aura-asteria-en';

  /**
   * Field yang DILARANG masuk badan permintaan render, sekalipun diselipkan di `settings`.
   * Daftarnya cermin `PLAYBACK_ONLY` di `workers/api/tts/tts-key.js:48` — larangan yang sama
   * ditegakkan di dua sisi, karena satu sisi saja tidak cukup: server membuangnya dari kunci,
   * tetapi klien yang tetap mengirimnya membuat badan permintaan berbohong tentang identitas
   * suara dan membuat perbaikan cf-a5 terlihat "tidak berlaku" pada log.
   */
  var FORBIDDEN_FIELDS = Object.freeze([
    'speed', 'rate', 'playbackRate', 'pitch', 'volume', 'gain'
  ]);
  /** Kunci cache tidak pernah datang dari klien — nama-nama ini dibuang tanpa kecuali. */
  var KEY_FIELDS = Object.freeze(['audioKey', 'key', 'cacheKey', 'objectName', 'hash']);
  /** Allowlist tertutup: hanya ini yang boleh berangkat. */
  var BODY_ALLOWLIST = Object.freeze(['text', 'locale', 'contentType', 'voiceId', 'settings']);
  /** Allowlist `settings`, sama dengan `tts-key.js:41`. */
  var SETTINGS_ALLOWLIST = Object.freeze(['bitRate', 'container', 'sampleRate']);

  var metrics = {
    renders: 0,
    cacheHits: 0,
    clientCacheHits: 0,
    clientCacheStores: 0,
    quotaBlocked: 0,
    breakerBlocked: 0,
    networkFailures: 0,
    rejectedUrls: 0,
    skippedByMemo: 0
  };

  /**
   * Memo kuota habis — pola yang sama dengan `creditStatus().outOfCredit` milik Puter
   * (`fiezel-voice-say.js:199-201`). Sesudah SATU 429, jalur CF tidak dipanggil lagi di sesi
   * ini. Tanpa memo ini setiap kalimat berikutnya membayar satu permintaan sia-sia dan murid
   * menunggu timeout jaringan sebelum mendengar suara cadangan.
   */
  var memo = { outOfQuota: false, until: 0, copyKey: '', resetAt: 0 };

  function cfConfig() {
    var cfg = root.FIEZEL_CF_CONFIG;
    return cfg && typeof cfg === 'object' ? cfg : {};
  }

  function base() {
    return String(cfConfig().base || '').trim().replace(/\/+$/, '');
  }

  /**
   * Satu-satunya gerbang. 'shadow' DIPERLAKUKAN SEBAGAI 'off' di jalur suara, dan itu
   * keputusan yang disengaja: mode shadow (`app.js` CF-TRANSPORT) mengirim salinan permintaan
   * lalu MEMBUANG hasilnya. Untuk JSON kecil itu murah, tetapi render TTS adalah panggilan
   * berbayar yang menghasilkan objek R2 — membuang hasilnya berarti membayar untuk sesuatu
   * yang tidak pernah didengar siapa pun. Nilai asing juga jatuh ke 'off': flag yang tidak
   * dikenali harus berarti aman, bukan berarti hidup.
   */
  function mode() {
    var cfg = cfConfig();
    if (cfg.enabled !== true) return 'off';
    if (!base()) return 'off';
    var endpoints = cfg.endpoints && typeof cfg.endpoints === 'object' ? cfg.endpoints : {};
    return String(endpoints.tts || 'off') === 'on' ? 'on' : 'off';
  }

  function isOn() { return mode() === 'on'; }

  /**
   * Basis URL publik objek audio (`AUDIO_PUBLIC_BASE`, wrangler.toml:59 =
   * `https://audio.fiezel.my.id`). Urutan pembacaan, dari yang paling berwenang:
   *
   *   1. `FIEZEL_CF_CONFIG.audioBase` — bila owner memasangnya di core-config.js;
   *   2. nilai yang pernah diberikan `GET /api/config` lewat `setConfig()` (kebenaran runtime;
   *      berkas core-config.js ikut precache service worker jadi ia hanya lapis kedua);
   *   3. `assetBaseUrl` di manifest audio yang SUDAH ADA (`audio/manifest.json`) — konstanta
   *      yang hari ini sudah dipakai resolver untuk memutar 1.170 objek yang sama.
   *
   * Kosong bukan kegagalan fatal: `playableUrl()` masih menolak jembatan origin, jadi
   * ketiadaan basis berarti "lebih hati-hati", bukan "lebih longgar".
   */
  var configured = { audioBase: '' };
  function setConfig(payload) {
    var p = payload && typeof payload === 'object' ? payload : {};
    var candidate = p.audioPublicBase || p.audioBase || (p.limits && p.limits.audioPublicBase) || '';
    configured.audioBase = String(candidate || '').trim().replace(/\/+$/, '');
    return configured.audioBase;
  }

  function manifestBase() {
    var m = root.FiezelAudioManifest;
    try {
      var st = m && typeof m.status === 'function' ? m.status() : null;
      return String((st && st.assetBaseUrl) || '').trim().replace(/\/+$/, '');
    } catch (_) { return ''; }
  }

  function audioBase() {
    var fromFlag = String(cfConfig().audioBase || '').trim().replace(/\/+$/, '');
    return fromFlag || configured.audioBase || manifestBase() || '';
  }

  /**
   * URL yang boleh diputar langsung. Tiga penolakan, dan masing-masing menutup satu cara
   * byte audio bisa kembali menumpang origin:
   *
   *   - bukan absolut https ⇒ tolak (URL relatif diselesaikan terhadap origin aplikasi, yaitu
   *     tepat jembatan yang sedang dihindari);
   *   - satu asal dengan aplikasi ⇒ tolak (itu origin ArenHost/PHP, bukan R2);
   *   - path berbau jembatan (`/api/`, `.php`) ⇒ tolak walau host-nya berbeda.
   *
   * Kalau basis audio diketahui, URL WAJIB berada di bawahnya. Kalau tidak diketahui, URL
   * lintas-asal https masih diterima — server yang menyusunnya sudah memakai
   * `AUDIO_PUBLIC_BASE`, dan menolak semuanya berarti mematikan cache hit gratis hanya karena
   * klien belum pernah membaca `/api/config`.
   */
  function playableUrl(url) {
    var raw = String(url == null ? '' : url).trim();
    if (!raw) return '';
    if (!/^https:\/\//i.test(raw)) { metrics.rejectedUrls++; return ''; }
    var lower = raw.toLowerCase();
    if (lower.indexOf('/api/') !== -1 || lower.indexOf('.php') !== -1) { metrics.rejectedUrls++; return ''; }
    var host = '';
    try { host = String(raw).split('/')[2] || ''; } catch (_) { host = ''; }
    if (!host) { metrics.rejectedUrls++; return ''; }
    var here = '';
    try { here = String((root.location && root.location.host) || ''); } catch (_) { here = ''; }
    if (here && host.toLowerCase() === here.toLowerCase()) { metrics.rejectedUrls++; return ''; }
    var allowed = audioBase();
    if (allowed && lower.indexOf(allowed.toLowerCase() + '/') !== 0) { metrics.rejectedUrls++; return ''; }
    return raw;
  }

  /* ------------------------------------------------------------------ badan permintaan --- */

  function canonicalText(value) {
    var s = String(value == null ? '' : value);
    if (typeof s.normalize === 'function') { try { s = s.normalize('NFC'); } catch (_) {} }
    return s.replace(/[\u200b\u200c\u200d\ufeff]/g, '')
      .replace(/[\u00a0\u2007\u202f]/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function cleanSettings(settings) {
    var src = settings && typeof settings === 'object' ? settings : null;
    if (!src) return null;
    var out = null;
    for (var i = 0; i < SETTINGS_ALLOWLIST.length; i++) {
      var name = SETTINGS_ALLOWLIST[i];
      if (src[name] == null) continue;
      if (!out) out = {};
      out[name] = typeof src[name] === 'number' ? src[name] : String(src[name]);
    }
    return out;
  }

  /**
   * Badan permintaan render. Dibangun dari NOL, bukan disalin lalu dibersihkan: menyalin
   * seluruh `opts` lalu `delete opts.speed` adalah pola yang selalu bocor pada penambahan
   * field berikutnya. `engineId` dan `engineVersion` sengaja TIDAK dikirim — versi mesin
   * adalah bagian identitas yang harus diputuskan server (`tts-key.js:195-198`), dan klien
   * yang boleh memilihnya bisa memaksa produksi ulang seluruh katalog.
   */
  function renderBody(request) {
    var req = request && typeof request === 'object' ? request : {};
    var body = {
      text: canonicalText(req.text),
      locale: String(req.locale || 'en-US'),
      contentType: String(req.contentType || 'sentence'),
      voiceId: String(req.voiceId || cfConfig().ttsVoiceId || DEFAULT_VOICE_ID)
    };
    var settings = cleanSettings(req.settings);
    if (settings) body.settings = settings;
    return body;
  }

  /** Penjaga yang bisa diuji: badan yang menyeleweng dibuang, bukan diperbaiki diam-diam. */
  function bodyIsClean(body) {
    if (!body || typeof body !== 'object') return false;
    var keys = Object.keys(body);
    for (var i = 0; i < keys.length; i++) {
      if (BODY_ALLOWLIST.indexOf(keys[i]) === -1) return false;
      if (FORBIDDEN_FIELDS.indexOf(keys[i]) !== -1) return false;
      if (KEY_FIELDS.indexOf(keys[i]) !== -1) return false;
    }
    if (body.settings) {
      var sub = Object.keys(body.settings);
      for (var j = 0; j < sub.length; j++) {
        if (SETTINGS_ALLOWLIST.indexOf(sub[j]) === -1) return false;
      }
    }
    return !!body.text;
  }

  /* --------------------------------------------------------------- C0 cache klien -------- */

  /**
   * Tag LOKAL, bukan kunci cache. Ia hanya menamai entri Cache API di perangkat ini dan tidak
   * pernah dikirim ke mana pun. Sengaja bukan sha256 dan hanya 16 heksa: `audioKey` server
   * selalu 64 heksa, jadi keduanya mustahil tertukar walau ada yang menyalin baris ini.
   */
  function localTag(request) {
    var req = request && typeof request === 'object' ? request : {};
    var material = [
      canonicalText(req.text).toLowerCase(),
      String(req.locale || 'en-US'),
      String(req.contentType || 'sentence'),
      String(req.voiceId || cfConfig().ttsVoiceId || DEFAULT_VOICE_ID)
    ].join('\u001f');
    var h1 = 0x811c9dc5, h2 = 0x1000193;
    for (var i = 0; i < material.length; i++) {
      var c = material.charCodeAt(i);
      h1 = (h1 ^ c) * 16777619 >>> 0;
      h2 = ((h2 << 5) + h2 + c) >>> 0;
    }
    var hex = ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8);
    return hex;
  }

  function cacheSupported() {
    return !!(root.caches && typeof root.caches.open === 'function');
  }

  function localRequest(tag) {
    var url = LOCAL_CACHE_ORIGIN + tag;
    try { return new root.Request(url, { method: 'GET' }); } catch (_) { return url; }
  }

  /**
   * C0 — lapisan paling atas saat flag 'on'. Ia menjawab URL R2 yang PERNAH berhasil dipakai
   * untuk kalimat ini, tanpa satu pun permintaan jaringan. Tidak ada audio di sini: yang
   * disimpan hanya alamatnya. Byte audionya sendiri sudah dipegang cache resolver
   * (`fiezel-audio-resolver.js` CACHE_NAME `fiezel-r2-audio-v1`), jadi menyimpannya dua kali
   * hanya akan menggandakan pemakaian penyimpanan murid.
   */
  function cachedUrl(request) {
    if (!isOn() || !cacheSupported()) return Promise.resolve('');
    var tag = localTag(request);
    return root.caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(localRequest(tag)).then(function (hit) {
        if (!hit || typeof hit.json !== 'function') return '';
        return hit.json().then(function (payload) {
          var url = playableUrl(payload && payload.url);
          if (url) metrics.clientCacheHits++;
          return url;
        }).catch(function () { return ''; });
      });
    }).catch(function () { return ''; });
  }

  /** Mengingat URL yang berhasil. Gagal dengan tenang: cache adalah bonus, bukan syarat. */
  function remember(request, url) {
    var safe = playableUrl(url);
    if (!isOn() || !cacheSupported() || !safe) return Promise.resolve(false);
    var tag = localTag(request);
    var payload = JSON.stringify({ schema: SCHEMA, url: safe, at: Date.now() });
    return root.caches.open(CACHE_NAME).then(function (cache) {
      var body;
      try { body = new root.Response(payload, { headers: { 'content-type': 'application/json' } }); }
      catch (_) { return false; }
      return cache.put(localRequest(tag), body).then(function () {
        metrics.clientCacheStores++;
        return true;
      });
    }).catch(function () { return false; });
  }

  /* ------------------------------------------------------------------ C1 render ---------- */

  function timeoutRace(promise, ms) {
    if (typeof root.setTimeout !== 'function') return promise;
    var timer = null;
    var guard = new Promise(function (resolve) {
      timer = root.setTimeout(function () { resolve({ __fiezelTimeout: true }); }, ms);
    });
    return Promise.race([promise, guard]).then(function (value) {
      if (timer) { try { root.clearTimeout(timer); } catch (_) {} }
      return value;
    }, function (error) {
      if (timer) { try { root.clearTimeout(timer); } catch (_) {} }
      throw error;
    });
  }

  function result(extra) {
    var out = {
      schema: SCHEMA, ok: false, status: 0, source: 'none', url: '',
      copyKey: '', retryAfter: 0, resetAt: 0, degraded: true, quotaExhausted: false
    };
    if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }

  /**
   * C1 — satu permintaan, tanpa retry. Tidak pernah melempar: pemanggil ada di tengah tangga
   * suara, dan tangga yang bisa dilempari galat akan berhenti di lapisan yang salah.
   *
   * @returns {Promise<object>} `{ok, status, source, url, copyKey, retryAfter, quotaExhausted}`
   *          `ok:true` HANYA bila ada URL yang lolos `playableUrl()`.
   */
  function render(request) {
    if (!isOn()) return Promise.resolve(result({ source: 'off' }));
    if (memo.outOfQuota) {
      metrics.skippedByMemo++;
      return Promise.resolve(result({ status: 429, source: 'quota-memo', copyKey: memo.copyKey || 'quota.tts.exhausted', quotaExhausted: true, resetAt: memo.resetAt }));
    }
    var body = renderBody(request);
    if (!bodyIsClean(body)) return Promise.resolve(result({ source: 'invalid' }));
    var f = root.fetch;
    if (typeof f !== 'function') return Promise.resolve(result({ source: 'no-fetch' }));

    var call;
    try {
      call = f(base() + RENDER_PATH, {
        method: 'POST',
        // `credentials:'include'` sama dengan jalur CF di app.js: identitas murid adalah
        // cookie pihak pertama di `fiezel.my.id`, dan kuota harian melekat padanya.
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (_) {
      metrics.networkFailures++;
      return Promise.resolve(result({ source: 'network' }));
    }
    metrics.renders++;

    return timeoutRace(Promise.resolve(call), RENDER_TIMEOUT_MS).then(function (response) {
      if (!response || response.__fiezelTimeout === true) {
        metrics.networkFailures++;
        return result({ source: 'timeout' });
      }
      var status = Number(response.status || 0);
      var read = typeof response.json === 'function' ? response.json().catch(function () { return {}; }) : Promise.resolve({});
      return read.then(function (payload) {
        var data = payload && typeof payload === 'object' ? payload : {};
        // 429 — kuota habis. Bukan galat, bukan kebisuan: pemanggil turun satu lapisan dan
        // naskahnya ditampilkan oleh FiezelCfVoiceNotice. Memo menyala supaya kalimat
        // berikutnya tidak menunggu permintaan yang sudah pasti ditolak.
        if (status === 429) {
          metrics.quotaBlocked++;
          memo.outOfQuota = true;
          memo.copyKey = String(data.copyKey || 'quota.tts.exhausted');
          memo.resetAt = Number(data.resetAt || 0) || 0;
          return result({
            status: 429, source: 'quota', copyKey: memo.copyKey, quotaExhausted: true,
            retryAfter: Number(data.retryAfter || 0) || 0, resetAt: memo.resetAt
          });
        }
        if (status !== 200) {
          metrics.networkFailures++;
          return result({ status: status, source: 'error', copyKey: String(data.copyKey || '') });
        }
        // 200 + degraded ⇒ breaker terbuka atau provider gagal. Server sengaja tidak 5xx di
        // sini (route-tts.js langkah 3), dan artinya tetap sama bagi tangga: turun.
        var url = playableUrl(data.url);
        if (!url) {
          if (data.degraded) metrics.breakerBlocked++;
          return result({
            status: 200, source: String(data.source || 'unavailable'),
            copyKey: data.breaker && data.breaker !== 'CLOSED' ? 'service.degraded' : String(data.copyKey || ''),
            retryAfter: Number(data.retryAfter || 0) || 0
          });
        }
        if (String(data.source || '') === 'cache') metrics.cacheHits++;
        return result({
          ok: true, status: 200, url: url, source: String(data.source || 'render'),
          degraded: data.degraded === true
        });
      });
    }, function () {
      metrics.networkFailures++;
      return result({ source: 'network' });
    });
  }

  /** Untuk diagnostik dan gerbang. Tidak ada state pelajaran di sini, hanya angka. */
  function status() {
    return Object.freeze({
      schema: SCHEMA,
      mode: mode(),
      base: base(),
      audioBase: audioBase(),
      voiceId: String(cfConfig().ttsVoiceId || DEFAULT_VOICE_ID),
      outOfQuota: memo.outOfQuota,
      metrics: Object.freeze({
        renders: metrics.renders, cacheHits: metrics.cacheHits,
        clientCacheHits: metrics.clientCacheHits, clientCacheStores: metrics.clientCacheStores,
        quotaBlocked: metrics.quotaBlocked, breakerBlocked: metrics.breakerBlocked,
        networkFailures: metrics.networkFailures, rejectedUrls: metrics.rejectedUrls,
        skippedByMemo: metrics.skippedByMemo
      })
    });
  }

  /** Memo dilepas hanya oleh gerbang/diagnostik; di produksi ia hidup selama satu sesi. */
  function resetMemo() { memo = { outOfQuota: false, until: 0, copyKey: '', resetAt: 0 }; return true; }

  return Object.freeze({
    SCHEMA: SCHEMA,
    RENDER_PATH: RENDER_PATH,
    CACHE_NAME: CACHE_NAME,
    DEFAULT_VOICE_ID: DEFAULT_VOICE_ID,
    FORBIDDEN_FIELDS: FORBIDDEN_FIELDS,
    KEY_FIELDS: KEY_FIELDS,
    BODY_ALLOWLIST: BODY_ALLOWLIST,
    mode: mode,
    isOn: isOn,
    setConfig: setConfig,
    audioBase: audioBase,
    playableUrl: playableUrl,
    renderBody: renderBody,
    bodyIsClean: bodyIsClean,
    localTag: localTag,
    cachedUrl: cachedUrl,
    remember: remember,
    render: render,
    status: status,
    resetMemo: resetMemo
  });
}));
