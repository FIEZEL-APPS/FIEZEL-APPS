/**
 * FIEZEL A2 — modul analytics SISI KLIEN (privasi-maksimal).
 *
 * OTORITAS: `EXEC-BRIEF-CF.md` bagian "KONTRAK ANALYTICS PRIVASI-MAKSIMAL".
 * Pasangan sisi Worker: `workers/api/analytics/analytics-core.js`,
 * `workers/api/analytics/route-events.js`, `workers/api/analytics/PRIVACY.md`.
 * Sisi Worker sudah lengkap (tabel agregat, rollup harian, rotasi pepper,
 * penolakan event server-only). Berkas ini menutup satu-satunya lubang yang
 * tersisa: NOL dari 15 event bab 19 pernah benar-benar dikirim perangkat, jadi
 * DAU dan retensi mustahil dihitung walau servernya siap.
 *
 * ===========================================================================
 * CARA PAKAI (satu baris)
 * ===========================================================================
 *
 *   FiezelAnalytics.track('lesson_completed', { domain: 'grammar', level: 'B1' });
 *
 * Selebihnya opsional:
 *   FiezelAnalytics.start();          // app_open + day_active + retention_ping
 *   FiezelAnalytics.flush();          // paksa kirim antrean sekarang
 *   FiezelAnalytics.createClient(dep) // instance terisolasi (dipakai gerbang)
 *
 * `track()` TIDAK PERNAH melempar dan TIDAK PERNAH menahan jalur belajar: ia
 * hanya menaruh satu baris kecil ke antrean lokal lalu kembali. Pengiriman
 * dilakukan berkelompok, lebih lambat, dan kegagalan jaringan tidak terlihat
 * oleh murid.
 *
 * ===========================================================================
 * LIMA JAMINAN YANG DIJAGA GERBANG `analytics-client-test.js`
 * ===========================================================================
 *
 * 1. `installId` TIDAK PERNAH DIKIRIM. Ia UUID acak (`crypto.randomUUID`) yang
 *    hidup hanya di penyimpanan lokal. Yang dikirim adalah
 *    `visitor_token = HMAC-SHA256(pepper_hari_ini, installId)` dipotong 128 bit
 *    (32 karakter hex), dihitung DI PERANGKAT dengan WebCrypto. Pepper diambil
 *    dari `GET /api/usage/pepper`. Karena server tidak pernah memegang
 *    `installId`, server tidak bisa membalik token walau mau.
 *
 * 2. DAFTAR HITAM EKSPLISIT, BUKAN ASUMSI. Delapan event boleh dari klien;
 *    semua event server-only (seluruh jalur AI/TTS/kuota/breaker +
 *    `user_created`) DITOLAK di sini, sebelum menyentuh antrean, walau ada kode
 *    lain yang memanggilnya. Alasannya bukan kerapian: event yang bisa dipalsukan
 *    dari perangkat tidak bernilai apa pun sebagai angka (satu skrip bisa
 *    mengarang ribuan pengguna baru atau menyembunyikan kegagalan AI).
 *
 * 3. ALLOWLIST FIELD KETAT. Field di luar daftar per-event DIBUANG di klien.
 *    Tidak ada satu pun field teks bebas. DILARANG dan tidak punya jalan masuk:
 *    nama, email, uuid Puter, IP, teks jawaban murid, isi percakapan AI, lokasi,
 *    User-Agent lengkap. `platform` hanya tiga nilai kasar: android/ios/desktop.
 *    Sebelum dikirim, seluruh payload dipindai ulang (pola email/UUID/installId);
 *    kalau ada yang lolos, batch DIBUANG, bukan dikirim.
 *
 * 4. GERBANG FLAG BERSIFAT MUTLAK. Kalau
 *    `FIEZEL_CF_CONFIG.enabled !== true` atau
 *    `FIEZEL_CF_CONFIG.endpoints.usage !== 'on'`, modul ini tidak mengirim apa
 *    pun DAN tidak membuka penyimpanan sama sekali — tidak ada `installId` yang
 *    dibuat, tidak ada antrean yang ditulis. Flag mati berarti modul ini tidak
 *    meninggalkan jejak apa pun di perangkat murid, bukan sekadar diam.
 *
 * 5. ANTREAN OFFLINE BERBATAS. Antrean disimpan lokal dengan cap jumlah DAN cap
 *    byte; saat penuh yang TERTUA dibuang. Analytics tidak boleh menjadi
 *    kebocoran penyimpanan di ponsel murah, dan data lama bernilai paling kecil.
 *
 * ===========================================================================
 * KONSEKUENSI JUJUR (wajib ikut ke dokumentasi, jangan dipoles)
 * ===========================================================================
 * DAU/retensi dari modul ini adalah estimasi PERANGKAT, bukan orang. Satu orang
 * dua perangkat = dua hitungan. Hapus data browser = perangkat baru (installId
 * baru, cohort baru). Event sesi/pelajaran/jawaban bersifat SELF-REPORTED.
 *
 * ===========================================================================
 * TITIK PEMANGGIL YANG DISARANKAN (BELUM dipasang — sengaja)
 * ===========================================================================
 * `RECOMMENDED_CALL_SITES` di bawah adalah usulan, bukan pemasangan. Paket kerja
 * ini TIDAK menyentuh `app.js` maupun `features/neural-voice/**`; daftar lengkap
 * beserta alasannya ada di `reports/add-a2-analytics-client.md`.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelAnalytics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  /* =====================================================================
   * 1. KONSTANTA KONTRAK (harus cocok dengan sisi Worker)
   * ===================================================================== */

  var SCHEMA_ID = 'fiezel-analytics-v1';

  var PATHS = Object.freeze({
    events: '/api/usage/events',
    retention: '/api/usage/retention',
    pepper: '/api/usage/pepper'
  });

  // Kunci penyimpanan diberi awalan sendiri supaya tidak pernah bertabrakan
  // dengan `fiezel-v4-state` (state belajar) — analytics tidak boleh bisa
  // membaca atau menulis state murid.
  var STORAGE_KEYS = Object.freeze({
    install: 'fiezel-analytics-install-v1',
    queue: 'fiezel-analytics-queue-v1',
    meta: 'fiezel-analytics-meta-v1'
  });

  var LIMITS = Object.freeze({
    MAX_QUEUE_EVENTS: 60,        // cap jumlah; yang tertua dibuang saat penuh
    MAX_QUEUE_BYTES: 12 * 1024,  // cap byte; yang tertua dibuang saat penuh
    MAX_EVENTS_PER_BATCH: 20,    // = LIMITS.MAX_EVENTS di route-events.js
    MAX_BODY_BYTES: 8 * 1024,    // = LIMITS.MAX_BODY_BYTES di route-events.js
    MAX_RETENTION_PINGS: 3,
    PEPPER_TTL_MS: 6 * 60 * 60 * 1000 // ambil ulang pepper maksimal 4x sehari
  });

  /**
   * DAFTAR HITAM EKSPLISIT. Disalin dari `SERVER_ONLY_EVENTS` di
   * `workers/api/analytics/analytics-core.js` dan diperiksa kesamaannya oleh
   * gerbang. Ditulis apa adanya (bukan "semua yang bukan client_events") supaya
   * penolakannya bisa dibaca manusia dan tidak berubah diam-diam saat ada event
   * baru: event baru yang tidak dikenal ditolak juga, tapi yang ini ditolak
   * dengan alasan yang tepat (`server_only`).
   */
  var SERVER_ONLY_EVENTS = Object.freeze([
    'user_created',
    'ai_request', 'ai_success', 'ai_failure',
    'tts_request', 'tts_success', 'tts_failure',
    'quota_exhausted',
    'circuit_opened', 'circuit_recovered'
  ]);

  var LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  var DOMAINS = Object.freeze(['vocabulary', 'grammar', 'reading', 'listening', 'speaking', 'writing']);
  var MODES = Object.freeze(['adaptive', 'lesson', 'exam', 'practice', 'listening', 'library']);
  var PLATFORMS = Object.freeze(['android', 'ios', 'desktop']);
  var ATTEMPT_BUCKETS = Object.freeze(['5-9', '10-29', '30+']);
  var DURATION_BUCKETS = Object.freeze(['<2m', '2-10m', '10-30m', '30m+']);

  var DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  // Sengaja LEBIH KETAT daripada sisi Worker (yang mengizinkan empat komponen):
  // versi empat komponen seperti `5.19.0.1` tidak bisa dibedakan dari alamat IPv4
  // oleh pemindai PII di bawah, dan jaring PII tidak boleh dilonggarkan demi
  // sebuah nomor versi. Tiga komponen sudah cukup untuk semua rilis FIEZEL.
  var VERSION_PATTERN = /^[0-9]{1,3}(\.[0-9]{1,4}){0,2}$/;
  var TOKEN_PATTERN = /^[0-9a-f]{32}$/;

  function T(kind, extra) {
    var spec = { kind: kind };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) spec[k] = extra[k];
    return Object.freeze(spec);
  }

  /**
   * Delapan event yang boleh berasal dari perangkat, dengan allowlist field
   * per event. Semua string berenum tertutup; tidak ada `kind:'text'` di mana
   * pun, dan itu disengaja — teks bebas adalah pintu masuk nama, email, isi
   * soal, dan transkrip.
   *
   * `managed:true` = field yang DIISI MODUL, bukan pemanggil. Nilai dari
   * pemanggil untuk field ini dibuang seperti field asing: kalau UI boleh
   * mengirim `visitor_token` sendiri, jaminan "token selalu HMAC hari ini"
   * berhenti menjadi sifat sistem.
   */
  var CLIENT_EVENT_SPEC = Object.freeze({
    app_open: Object.freeze({
      visitor_token: T('token', { managed: true }),
      has_identity: T('bool'),
      platform: T('platform'),
      app_version: T('version')
    }),
    day_active: Object.freeze({
      visitor_token: T('token', { managed: true }),
      attempts_bucket: T('enum', { values: ATTEMPT_BUCKETS }),
      platform: T('platform')
    }),
    session_started: Object.freeze({
      mode: T('enum', { values: MODES }),
      level: T('enum', { values: LEVELS })
    }),
    session_ended: Object.freeze({
      mode: T('enum', { values: MODES }),
      level: T('enum', { values: LEVELS }),
      completed: T('bool'),
      answered: T('int', { min: 0, max: 200 }),
      duration_bucket: T('enum', { values: DURATION_BUCKETS })
    }),
    lesson_started: Object.freeze({
      domain: T('enum', { values: DOMAINS }),
      level: T('enum', { values: LEVELS })
    }),
    lesson_completed: Object.freeze({
      domain: T('enum', { values: DOMAINS }),
      level: T('enum', { values: LEVELS })
    }),
    question_answered: Object.freeze({
      domain: T('enum', { values: DOMAINS }),
      level: T('enum', { values: LEVELS }),
      ok: T('bool')
    }),
    retention_ping: Object.freeze({
      cohort_day: T('day', { managed: true }),
      day_index: T('int', { min: 0, max: 400, managed: true })
    })
  });

  var CLIENT_EVENTS = Object.freeze(Object.keys(CLIENT_EVENT_SPEC));

  /** Event yang butuh `visitor_token` untuk berguna (penyumbang DAU). */
  var TOKEN_EVENTS = Object.freeze(['app_open', 'day_active']);

  /**
   * Usulan titik pemanggil. TIDAK dipasang oleh paket kerja ini (dilarang
   * menyentuh app.js / features/neural-voice/**). Dipakai gerbang untuk
   * memastikan notes dan kode menyebut daftar yang sama.
   */
  var RECOMMENDED_CALL_SITES = Object.freeze([
    Object.freeze({ event: 'app_open', where: 'app.js boot (sesudah shell tampil)', how: "FiezelAnalytics.start()" }),
    Object.freeze({ event: 'day_active', where: 'app.js saat jawaban ke-5 hari itu', how: "FiezelAnalytics.markActive(attempts)" }),
    Object.freeze({ event: 'session_started', where: 'app.js startSession()', how: "track('session_started',{mode,level})" }),
    Object.freeze({ event: 'session_ended', where: 'app.js endSession()/abandonSession()', how: "track('session_ended',{mode,level,completed,answered,duration_bucket})" }),
    Object.freeze({ event: 'lesson_started', where: 'app.js openLesson()', how: "track('lesson_started',{domain,level})" }),
    Object.freeze({ event: 'lesson_completed', where: 'app.js finishLesson()', how: "track('lesson_completed',{domain,level})" }),
    Object.freeze({ event: 'question_answered', where: 'app.js recordAnswer()', how: "track('question_answered',{domain,level,ok})" }),
    Object.freeze({ event: 'retention_ping', where: 'otomatis di start(), maksimal sekali per hari', how: "FiezelAnalytics.start()" })
  ]);

  /* =====================================================================
   * 2. UTILITAS MURNI
   * ===================================================================== */

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function dayKeyFromMs(ms) {
    var d = new Date(Number(ms));
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  function daysBetween(fromDay, toDay) {
    var a = Date.parse(fromDay + 'T00:00:00Z');
    var b = Date.parse(toDay + 'T00:00:00Z');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  function byteLength(text) {
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(text).length;
    return unescape(encodeURIComponent(text)).length;
  }

  function coerce(spec, value) {
    switch (spec.kind) {
      case 'bool':
        return typeof value === 'boolean' ? value : null;
      case 'int':
        if (typeof value !== 'number' || !isFinite(value)) return null;
        var n = Math.trunc(value);
        if (n < spec.min || n > spec.max) return null;
        return n;
      case 'enum':
        return typeof value === 'string' && spec.values.indexOf(value) >= 0 ? value : null;
      case 'platform':
        return typeof value === 'string' && PLATFORMS.indexOf(value) >= 0 ? value : null;
      case 'day':
        return typeof value === 'string' && DAY_PATTERN.test(value) ? value : null;
      case 'version':
        return typeof value === 'string' && VERSION_PATTERN.test(value) ? value : null;
      case 'token':
        return typeof value === 'string' && TOKEN_PATTERN.test(value) ? value : null;
      default:
        return null;
    }
  }

  /**
   * Jaring terakhir sebelum byte meninggalkan perangkat. Ia tidak menggantikan
   * allowlist — ia mengasumsikan allowlist bisa salah suatu hari (satu field
   * baru, satu `Object.assign` yang tidak diperiksa) dan memeriksa HASILNYA.
   * Kalau menyala, batch dibuang; kegagalan analytics jauh lebih murah daripada
   * satu email murid yang terkirim.
   */
  var PII_PATTERNS = Object.freeze([
    Object.freeze({ name: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ }),
    Object.freeze({ name: 'uuid', re: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/ }),
    Object.freeze({ name: 'ipv4', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/ }),
    Object.freeze({ name: 'user_agent', re: /Mozilla\/|AppleWebKit|Gecko\/|Chrome\/|Safari\// }),
    Object.freeze({ name: 'bearer', re: /(?:Bearer\s|eyJ[A-Za-z0-9_-]{10,})/ })
  ]);

  function scanForPii(text, extraSecrets) {
    var hits = [];
    for (var i = 0; i < PII_PATTERNS.length; i++) {
      if (PII_PATTERNS[i].re.test(text)) hits.push(PII_PATTERNS[i].name);
    }
    var secrets = extraSecrets || [];
    for (var j = 0; j < secrets.length; j++) {
      if (secrets[j] && text.indexOf(secrets[j]) >= 0) hits.push('install_id');
    }
    return hits;
  }

  /* =====================================================================
   * 3. INSTANCE
   * ===================================================================== */

  /**
   * createClient(deps) — instance terisolasi.
   *
   * Semua ketergantungan pada dunia luar masuk lewat satu pintu supaya gerbang
   * bisa menjalankan modul ini tanpa browser, tanpa jaringan, dan tanpa
   * penyimpanan nyata:
   *   config      objek gaya FIEZEL_CF_CONFIG (default: global)
   *   storage     antarmuka gaya localStorage (default: global)
   *   cryptoImpl  WebCrypto (default: global)
   *   now         () => ms
   *   sendBeacon  (url, body) => boolean
   *   fetchImpl   (url, opts) => Promise
   *   platform    'android' | 'ios' | 'desktop'
   *   appVersion  string gaya '5.19.0'
   */
  function createClient(deps) {
    var d = deps || {};

    var memory = {
      queue: null,          // cache antrean; null = belum dibaca
      meta: null,
      installId: null,
      pepper: null,
      pepperDay: null,
      pepperFetchedAt: 0,
      token: null,
      tokenPepper: null,
      dropped: 0,           // event yang dibuang karena antrean penuh
      rejected: 0,          // event yang ditolak (server-only / tak dikenal)
      storageTouches: 0,    // dipakai gerbang: flag off harus tetap 0
      sent: 0,
      flushing: null,       // janji kirim yang sedang berjalan (single-flight)
      lastError: null
    };

    function config() {
      if (d.config) return d.config;
      return root && root.FIEZEL_CF_CONFIG ? root.FIEZEL_CF_CONFIG : null;
    }

    /**
     * SATU-SATUNYA gerbang. Dipanggil di awal setiap jalur publik, sebelum
     * apa pun yang menyentuh penyimpanan atau jaringan. `enabled:false`
     * mematikan seluruh jalur CF walau `usage` bernilai 'on' (rollback satu
     * nilai, lihat core-config.js).
     */
    function gateOpen() {
      var cfg = config();
      if (!isPlainObject(cfg)) return false;
      if (cfg.enabled !== true) return false;
      if (!isPlainObject(cfg.endpoints)) return false;
      return cfg.endpoints.usage === 'on';
    }

    function baseUrl() {
      var cfg = config();
      var base = cfg && typeof cfg.base === 'string' ? cfg.base : '';
      return base.replace(/\/+$/, '');
    }

    function endpoint(path) {
      return baseUrl() + path;
    }

    function now() {
      return typeof d.now === 'function' ? Number(d.now()) : Date.now();
    }

    function today() {
      return dayKeyFromMs(now());
    }

    /* ---------------- penyimpanan (hanya dibuka bila gerbang terbuka) ------ */

    function storage() {
      if (!gateOpen()) return null;
      var s = d.storage || (root && root.localStorage) || null;
      if (!s || typeof s.getItem !== 'function' || typeof s.setItem !== 'function') return null;
      return s;
    }

    function readJson(key, fallback) {
      var s = storage();
      if (!s) return fallback;
      memory.storageTouches += 1;
      try {
        var raw = s.getItem(key);
        if (!raw) return fallback;
        var parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallback : parsed;
      } catch (e) {
        return fallback;
      }
    }

    function writeJson(key, value) {
      var s = storage();
      if (!s) return false;
      memory.storageTouches += 1;
      try {
        s.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        // Kuota penyimpanan penuh: buang antrean, JANGAN melempar ke pemanggil.
        memory.lastError = 'storage_full';
        try { if (typeof s.removeItem === 'function') s.removeItem(STORAGE_KEYS.queue); } catch (e2) { /* diam */ }
        return false;
      }
    }

    function meta() {
      if (memory.meta) return memory.meta;
      if (!gateOpen()) return null;
      var m = readJson(STORAGE_KEYS.meta, null);
      if (!isPlainObject(m)) m = {};
      if (!DAY_PATTERN.test(String(m.cohort_day || ''))) {
        // Tanggal pertama perangkat ini. Dihitung DI KLIEN — server tidak pernah
        // tahu kapan seseorang mulai, ia hanya menerima {cohort_day, day_index}.
        m.cohort_day = today();
        writeJson(STORAGE_KEYS.meta, m);
      }
      memory.meta = m;
      return m;
    }

    function saveMeta() {
      if (!memory.meta) return false;
      return writeJson(STORAGE_KEYS.meta, memory.meta);
    }

    /**
     * installId — dibuat sekali, disimpan lokal, TIDAK PERNAH DIKIRIM.
     * Nilainya tidak pernah masuk ke antrean, ke payload, atau ke log; satu-satunya
     * pemakaiannya adalah masukan HMAC di `visitorToken()`.
     */
    function installId() {
      if (memory.installId) return memory.installId;
      if (!gateOpen()) return null;
      var s = storage();
      if (!s) return null;
      memory.storageTouches += 1;
      var existing = null;
      try { existing = s.getItem(STORAGE_KEYS.install); } catch (e) { existing = null; }
      if (typeof existing === 'string' && existing.length >= 8) {
        memory.installId = existing;
        return existing;
      }
      var c = d.cryptoImpl || (root && root.crypto) || null;
      var fresh = null;
      if (c && typeof c.randomUUID === 'function') fresh = c.randomUUID();
      else if (c && typeof c.getRandomValues === 'function') {
        var bytes = new Uint8Array(16);
        c.getRandomValues(bytes);
        fresh = hex(bytes);
      }
      if (!fresh) return null;
      memory.storageTouches += 1;
      try { s.setItem(STORAGE_KEYS.install, fresh); } catch (e) { /* tetap dipakai untuk sesi ini */ }
      memory.installId = fresh;
      return fresh;
    }

    /* ---------------- token pengunjung ----------------------------------- */

    function hex(bytes) {
      var out = '';
      for (var i = 0; i < bytes.length; i++) out += (bytes[i] & 0xff).toString(16).padStart(2, '0');
      return out;
    }

    function subtleCrypto() {
      var c = d.cryptoImpl || (root && root.crypto) || null;
      return c && c.subtle ? c : null;
    }

    /** Ambil pepper hari ini dari Worker. Tidak ada pepper = tidak ada token. */
    function fetchPepper() {
      if (!gateOpen()) return Promise.resolve(null);
      var stamp = now();
      if (memory.pepper && memory.pepperDay === today() && stamp - memory.pepperFetchedAt < LIMITS.PEPPER_TTL_MS) {
        return Promise.resolve(memory.pepper);
      }
      var doFetch = d.fetchImpl || (root && root.fetch ? root.fetch.bind(root) : null);
      if (!doFetch) return Promise.resolve(null);
      return Promise.resolve()
        .then(function () {
          return doFetch(endpoint(PATHS.pepper), { method: 'GET', credentials: 'include', cache: 'no-store' });
        })
        .then(function (res) {
          if (!res || res.ok === false) return null;
          return res.json();
        })
        .then(function (body) {
          if (!isPlainObject(body) || typeof body.pepper !== 'string' || body.pepper.length < 32) return null;
          if (memory.pepper !== body.pepper) {
            // Pepper berganti => token WAJIB dihitung ulang. Token lama tidak
            // pernah dipakai lagi; itulah yang memutus hari-1 dari hari-2.
            memory.token = null;
            memory.tokenPepper = null;
          }
          memory.pepper = body.pepper;
          memory.pepperDay = DAY_PATTERN.test(String(body.day || '')) ? body.day : today();
          memory.pepperFetchedAt = stamp;
          return memory.pepper;
        })
        .catch(function () {
          memory.lastError = 'pepper_unavailable';
          return null;
        });
    }

    /**
     * visitorToken() -> Promise<string|null>, 32 hex = 128 bit.
     * HMAC dihitung DI SINI, di perangkat. Server hanya menerima hasilnya.
     */
    function visitorToken() {
      if (!gateOpen()) return Promise.resolve(null);
      var id = installId();
      if (!id) return Promise.resolve(null);
      return fetchPepper().then(function (pepper) {
        if (!pepper) return null;
        if (memory.token && memory.tokenPepper === pepper) return memory.token;
        var c = subtleCrypto();
        if (!c) return null;
        var enc = new TextEncoder();
        return c.subtle
          .importKey('raw', enc.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
          .then(function (key) { return c.subtle.sign('HMAC', key, enc.encode(id)); })
          .then(function (mac) {
            var full = new Uint8Array(mac);
            var token = hex(full.subarray(0, 16)); // dipotong 128 bit
            memory.token = token;
            memory.tokenPepper = pepper;
            return token;
          })
          .catch(function () { return null; });
      });
    }

    /* ---------------- antrean ------------------------------------------- */

    function queue() {
      if (memory.queue) return memory.queue;
      if (!gateOpen()) return null;
      var q = readJson(STORAGE_KEYS.queue, []);
      memory.queue = Array.isArray(q) ? q.filter(isPlainObject) : [];
      return memory.queue;
    }

    /**
     * Terapkan cap. Dua cap sekaligus karena keduanya gagal berbeda: cap jumlah
     * menahan banjir event kecil, cap byte menahan antrean yang panjang setelah
     * berhari-hari offline. Yang dibuang selalu yang TERTUA (`shift`).
     */
    function trim(q) {
      while (q.length > LIMITS.MAX_QUEUE_EVENTS) { q.shift(); memory.dropped += 1; }
      while (q.length > 1 && byteLength(JSON.stringify(q)) > LIMITS.MAX_QUEUE_BYTES) {
        q.shift();
        memory.dropped += 1;
      }
      return q;
    }

    function persistQueue() {
      if (!memory.queue) return false;
      return writeJson(STORAGE_KEYS.queue, memory.queue);
    }

    /* ---------------- sanitasi ------------------------------------------ */

    /**
     * sanitize(name, fields) -> {ok, reason?, event?, dropped[], invalid[]}
     *
     * Urutan penolakan disengaja: server-only DULU, supaya pesannya jujur
     * ("event ini memang ada, tapi bukan milik klien") sebelum jatuh ke
     * "unknown_event" yang menyembunyikan sebabnya.
     */
    function sanitize(name, fields) {
      var droppedKeys = [];
      var invalidKeys = [];
      if (typeof name !== 'string' || !name) {
        return { ok: false, reason: 'bad_name', dropped: droppedKeys, invalid: invalidKeys };
      }
      if (SERVER_ONLY_EVENTS.indexOf(name) >= 0) {
        return { ok: false, reason: 'server_only', dropped: droppedKeys, invalid: invalidKeys };
      }
      if (!Object.prototype.hasOwnProperty.call(CLIENT_EVENT_SPEC, name)) {
        return { ok: false, reason: 'unknown_event', dropped: droppedKeys, invalid: invalidKeys };
      }
      var spec = CLIENT_EVENT_SPEC[name];
      var event = { name: name, day: today() };
      var input = isPlainObject(fields) ? fields : {};
      for (var key in input) {
        if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
        if (!Object.prototype.hasOwnProperty.call(spec, key)) { droppedKeys.push(key); continue; }
        if (spec[key].managed === true) { droppedKeys.push(key); continue; }
        var clean = coerce(spec[key], input[key]);
        if (clean === null) { invalidKeys.push(key); continue; }
        event[key] = clean;
      }
      return { ok: true, event: event, dropped: droppedKeys, invalid: invalidKeys };
    }

    /**
     * resanitize(entry) — sanitasi ULANG satu baris yang datang dari PENYIMPANAN.
     *
     * Antrean hidup di localStorage, dan localStorage bukan wilayah yang bisa
     * dipercaya: skrip lain di origin yang sama bisa menulisnya, dan versi modul
     * yang lebih tua bisa meninggalkan bentuk lain di sana. Kalau `flush()`
     * memercayai isi antrean, seluruh allowlist bisa dilewati hanya dengan
     * menulis satu kunci penyimpanan. Jadi baris dari penyimpanan diperlakukan
     * sama seperti masukan pemanggil: dibangun ulang dari nol.
     *
     * Satu-satunya yang dipertahankan dari baris lama adalah `day`-nya (kalau
     * sah), karena itulah gunanya antrean offline — hari kejadian, bukan hari
     * pengiriman. Baris di luar toleransi ±2 hari DIBUANG di klien: server akan
     * menolak SELURUH batch karena satu baris kedaluwarsa, dan antrean yang
     * tidak pernah bisa terkirim akan menahan semua data sesudahnya.
     */
    function resanitize(entry) {
      if (!isPlainObject(entry)) return null;
      var res = sanitize(entry.name, entry);
      if (!res.ok) return null;
      if (DAY_PATTERN.test(String(entry.day || ''))) {
        var skew = daysBetween(entry.day, today());
        if (skew === null || skew < 0 || skew > 2) return null;
        res.event.day = entry.day;
      }
      return res.event;
    }

    /* ---------------- API publik instance ------------------------------- */

    /**
     * track(name, fields) -> boolean (true = masuk antrean).
     * Tidak pernah melempar. Tidak pernah menunggu jaringan.
     */
    function track(name, fields) {
      if (!gateOpen()) return false;
      var res = sanitize(name, fields);
      if (!res.ok) { memory.rejected += 1; memory.lastError = res.reason; return false; }
      // retention_ping punya jalurnya sendiri (endpoint terpisah, field dihitung
      // modul); ia tidak boleh masuk batch event biasa lewat track().
      if (name === 'retention_ping') return sendRetention() !== false;
      var q = queue();
      if (!q) return false;
      q.push(res.event);
      trim(q);
      persistQueue();
      return true;
    }

    /** Kirim satu payload. sendBeacon dulu, fetch keepalive sebagai cadangan. */
    function transmit(url, payload) {
      var body = JSON.stringify(payload);
      var hits = scanForPii(body, [memory.installId]);
      if (hits.length > 0) {
        // Ini bukan situasi yang boleh "dicoba lagi": payloadnya sendiri salah.
        memory.lastError = 'pii_blocked:' + hits.join(',');
        return Promise.resolve(false);
      }
      if (byteLength(body) > LIMITS.MAX_BODY_BYTES) {
        memory.lastError = 'body_too_large';
        return Promise.resolve(false);
      }
      var beacon = d.sendBeacon || (root && root.navigator && typeof root.navigator.sendBeacon === 'function'
        ? root.navigator.sendBeacon.bind(root.navigator)
        : null);
      if (beacon) {
        var ok = false;
        try { ok = beacon(url, body) !== false; } catch (e) { ok = false; }
        if (ok) { memory.sent += 1; return Promise.resolve(true); }
      }
      var doFetch = d.fetchImpl || (root && root.fetch ? root.fetch.bind(root) : null);
      if (!doFetch) return Promise.resolve(false);
      return Promise.resolve()
        .then(function () {
          return doFetch(url, {
            method: 'POST',
            body: body,
            keepalive: true,
            credentials: 'include',
            headers: { 'content-type': 'application/json' }
          });
        })
        .then(function (res) {
          var ok2 = Boolean(res) && res.ok !== false;
          if (ok2) memory.sent += 1;
          return ok2;
        })
        .catch(function () { memory.lastError = 'network'; return false; });
    }

    /**
     * flush() -> Promise<boolean>.
     * Gagal kirim = event TETAP di antrean (dan tetap dibatasi cap), jadi hari
     * offline tidak hilang begitu saja. Berhasil kirim = event dibuang dari
     * antrean sebelum batch berikutnya, supaya tidak pernah dikirim dua kali.
     */
    function flush() {
      // SEKALI-JALAN (single-flight). TEMUAN A1: tanpa kunci ini, dua pemanggil
      // yang tumpang-tindih (mis. `start()` yang masih menunggu pepper, lalu
      // `flush()` dari akhir sesi) sama-sama memotret antrean yang SAMA,
      // sama-sama menunggu `visitorToken()`, lalu sama-sama mengirim batch yang
      // sama. Antrean baru dibuang SETELAH kirim sukses, jadi jendela itu nyata
      // dan akibatnya bukan sepele: server menghitung satu sesi dua kali, DAU
      // dan pemakaian jadi gembung. Angka gembung lebih buruk daripada tidak
      // ada angka, karena ia dipercaya. Pemanggil kedua ikut menunggu hasil
      // pemanggil pertama, tidak memulai pengiriman baru.
      if (memory.flushing) return memory.flushing;
      var p = flushOnce();
      memory.flushing = p;
      var lepas = function (v) { memory.flushing = null; return v; };
      return p.then(lepas, function (e) { lepas(null); throw e; });
    }

    function flushOnce() {
      if (!gateOpen()) return Promise.resolve(false);
      var q = queue();
      if (!q || q.length === 0) return Promise.resolve(true);
      var batch = q.slice(0, LIMITS.MAX_EVENTS_PER_BATCH);
      // Sisipkan token hanya untuk event yang membutuhkannya.
      var needsToken = batch.some(function (e) { return TOKEN_EVENTS.indexOf(e.name) >= 0 && !e.visitor_token; });
      return (needsToken ? visitorToken() : Promise.resolve(null)).then(function (token) {
        var ready = [];
        for (var i = 0; i < batch.length; i++) {
          var e = resanitize(batch[i]);
          if (!e) continue; // baris rusak/kedaluwarsa dari penyimpanan: dibuang, bukan dikirim
          if (TOKEN_EVENTS.indexOf(e.name) >= 0) {
            if (!token) continue; // tanpa token event ini tidak berguna; tahan dulu
            e = Object.assign({}, e, { visitor_token: token });
          }
          ready.push(e);
        }
        if (ready.length === 0) return false;
        return transmit(endpoint(PATHS.events), { schema: SCHEMA_ID, events: ready }).then(function (ok) {
          if (ok) {
            memory.queue = q.slice(batch.length);
            persistQueue();
          }
          return ok;
        });
      });
    }

    /**
     * sendRetention() — satu-satunya jalur retensi, maksimal sekali per hari.
     * Yang dikirim HANYA {cohort_day, day_index}: tidak ada token, tidak ada
     * identitas. Server cuma menaikkan satu penghitung agregat.
     */
    function sendRetention() {
      if (!gateOpen()) return Promise.resolve(false);
      var m = meta();
      if (!m) return Promise.resolve(false);
      var day = today();
      if (m.last_retention_day === day) return Promise.resolve(true);
      var index = daysBetween(m.cohort_day, day);
      if (index === null || index < 0 || index > 400) return Promise.resolve(false);
      m.last_retention_day = day;
      saveMeta();
      return transmit(endpoint(PATHS.retention), {
        schema: SCHEMA_ID,
        pings: [{ day: day, cohort_day: m.cohort_day, day_index: index }]
      });
    }

    function coarsePlatform() {
      if (typeof d.platform === 'string' && PLATFORMS.indexOf(d.platform) >= 0) return d.platform;
      // HANYA tiga nilai kasar. String User-Agent tidak pernah disimpan atau
      // dikirim — ia dibaca sekali, diperas jadi satu kata, lalu dilupakan.
      var nav = d.navigatorImpl || (root && root.navigator) || null;
      var ua = nav && typeof nav.userAgent === 'string' ? nav.userAgent : '';
      if (/android/i.test(ua)) return 'android';
      if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
      if (/\biOS\b/.test(ua)) return 'ios';
      return 'desktop';
    }

    function appVersion() {
      var v = typeof d.appVersion === 'string' ? d.appVersion : (root && root.FIEZEL_VERSION) || '';
      return VERSION_PATTERN.test(String(v)) ? String(v) : null;
    }

    /**
     * start(opts) — app_open + retention_ping. Aman dipanggil berkali-kali:
     * app_open sekali per pemuatan halaman, retention sekali per hari.
     */
    function start(opts) {
      if (!gateOpen()) return Promise.resolve(false);
      var o = opts || {};
      if (!memory.started) {
        memory.started = true;
        var fields = { platform: coarsePlatform() };
        if (typeof o.hasIdentity === 'boolean') fields.has_identity = o.hasIdentity;
        var version = appVersion();
        if (version) fields.app_version = version;
        track('app_open', fields);
      }
      return sendRetention().then(function () { return flush(); });
    }

    /**
     * markActive(attempts) — `day_active` maksimal sekali per hari, dan hanya
     * kalau hari itu sudah cukup berarti (>= 5 percobaan). Ambang itu bukan
     * hiasan: "membuka aplikasi" bukan "belajar", dan DAU yang menghitung
     * pembukaan tanpa aktivitas adalah angka yang menipu ownernya sendiri.
     */
    function markActive(attempts) {
      if (!gateOpen()) return false;
      var m = meta();
      if (!m) return false;
      var day = today();
      if (m.last_day_active === day) return false;
      var n = Number(attempts);
      if (!isFinite(n) || n < 5) return false;
      var bucket = n < 10 ? '5-9' : (n < 30 ? '10-29' : '30+');
      m.last_day_active = day;
      saveMeta();
      return track('day_active', { attempts_bucket: bucket, platform: coarsePlatform() });
    }

    /** Pasang pelampung: kirim antrean saat halaman disembunyikan/ditutup. */
    function attachLifecycle() {
      if (!gateOpen()) return false;
      var target = d.eventTarget || root;
      if (!target || typeof target.addEventListener !== 'function') return false;
      var onHide = function () { flush(); };
      target.addEventListener('pagehide', onHide);
      target.addEventListener('visibilitychange', onHide);
      return true;
    }

    function stats() {
      return {
        queued: memory.queue ? memory.queue.length : 0,
        dropped: memory.dropped,
        rejected: memory.rejected,
        sent: memory.sent,
        storageTouches: memory.storageTouches,
        lastError: memory.lastError,
        hasToken: Boolean(memory.token),
        gateOpen: gateOpen()
      };
    }

    /** Hanya untuk gerbang: kosongkan cache memori tanpa menyentuh penyimpanan. */
    function _resetMemory() {
      memory.queue = null;
      memory.meta = null;
      memory.installId = null;
      memory.pepper = null;
      memory.pepperDay = null;
      memory.pepperFetchedAt = 0;
      memory.token = null;
      memory.tokenPepper = null;
      memory.flushing = null;
      memory.started = false;
    }

    return {
      track: track,
      flush: flush,
      start: start,
      markActive: markActive,
      sendRetention: sendRetention,
      attachLifecycle: attachLifecycle,
      visitorToken: visitorToken,
      sanitize: sanitize,
      stats: stats,
      isEnabled: gateOpen,
      _resetMemory: _resetMemory
    };
  }

  /* =====================================================================
   * 4. SINGLETON MALAS
   * ===================================================================== */
  // Dibuat saat dipakai, BUKAN saat berkas dimuat. Modul yang membuka
  // penyimpanan pada waktu muat akan melanggar jaminan #4 tanpa ada satu pun
  // pemanggil di aplikasi.
  var singleton = null;
  function instance() {
    if (!singleton) singleton = createClient({});
    return singleton;
  }

  return {
    // API bersih untuk aplikasi
    track: function (name, fields) { return instance().track(name, fields); },
    flush: function () { return instance().flush(); },
    start: function (opts) { return instance().start(opts); },
    markActive: function (attempts) { return instance().markActive(attempts); },
    sendRetention: function () { return instance().sendRetention(); },
    attachLifecycle: function () { return instance().attachLifecycle(); },
    isEnabled: function () { return instance().isEnabled(); },
    stats: function () { return instance().stats(); },

    // Untuk gerbang dan pemakaian terisolasi
    createClient: createClient,
    scanForPii: scanForPii,

    // Kontrak yang dibaca gerbang
    SCHEMA_ID: SCHEMA_ID,
    PATHS: PATHS,
    LIMITS: LIMITS,
    STORAGE_KEYS: STORAGE_KEYS,
    CLIENT_EVENTS: CLIENT_EVENTS,
    CLIENT_EVENT_SPEC: CLIENT_EVENT_SPEC,
    SERVER_ONLY_EVENTS: SERVER_ONLY_EVENTS,
    TOKEN_EVENTS: TOKEN_EVENTS,
    RECOMMENDED_CALL_SITES: RECOMMENDED_CALL_SITES
  };
});
