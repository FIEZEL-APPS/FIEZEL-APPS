/**
 * E5 — circuit breaker CLOSED / OPEN / HALF-OPEN nyata (cf-b4 §4).
 *
 * Berkas ini SENGAJA dipecah dua: fungsi murni (tanpa I/O, tanpa waktu tersembunyi) dan
 * satu penyimpan ringan. Alasannya bukan kerapian. Pertanyaan yang harus dijawab gerbang uji
 * — "apakah OPEN benar-benar menahan panggilan provider selama 60 detik, lalu 120, lalu 300,
 * lalu 900" — tidak bisa dijawab kalau jamnya datang dari `Date.now()` di dalam fungsi. Setiap
 * fungsi di bawah menerima `now` sebagai argumen, jadi seluruh mesin state bisa diuji tanpa
 * satu `setTimeout` pun.
 *
 * PENYIMPANANNYA RINGAN, dan itu keputusan free-tier (EXEC-BRIEF-CF.md: plan GRATIS dulu).
 * cf-b4 §4.3 memilih Durable Object sebagai sumber kebenaran; DO butuh Workers Paid. Karena
 * itu di fase ini kebenaran breaker hidup di KV/D1:
 *   - KV `breaker:<target>` dengan `expirationTtl` 60 s untuk jalur panas (baca murah, tulis
 *     dibatasi: hanya saat state BERUBAH, bukan tiap request — KV Free hanya 1.000 tulis/hari).
 *   - D1 opsional sebagai catatan tahan lama supaya dashboard owner bisa melihat riwayat.
 * Konsekuensi jujur yang harus ditulis di dokumentasi: KV eventual (≤60 s), jadi beberapa
 * request ekstra bisa lolos ke provider yang sudah mati. Untuk breaker itu murah — yang mahal
 * adalah kuota bocor, dan kuota TIDAK memakai jalur ini.
 *
 * Satu breaker PER TARGET (`ai:<model>`, `tts:<engine>`), bukan per kategori: `aura-1` yang
 * mati tidak boleh mematikan `melotts`, dan 70b yang overload tidak boleh mematikan 8b.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelBreaker = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-breaker-v2';

  /** Ambang dari cf-b4 §4.2 — dipaku di sini, bukan dikirim pemanggil. */
  var CONFIG = Object.freeze({
    schema: SCHEMA,
    failureWindowMs: 60000,   // jendela geser
    failureThreshold: 5,      // ≥5 gagal dalam jendela ⇒ OPEN
    consecutive429: 3,        // ≥3 429 berurutan ⇒ OPEN
    errorRateSamples: 10,     // error-rate >50% atas ≥10 sampel ⇒ OPEN
    errorRateLimit: 0.5,
    backoffMs: Object.freeze([60000, 120000, 300000, 900000]), // 60→120→300→900 s (plafon)
    halfOpenProbeIntervalMs: 10000, // 1 probe per 10 s
    halfOpenProbeConcurrency: 1,
    halfOpenSuccessesToClose: 2,
    // Probe yang tidak pernah melaporkan hasilnya (isolate mati, klien tutup tab, waitUntil
    // dipotong) akan menahan probesInFlight selamanya dan breaker tidak pernah pulih sendiri.
    // 30 s > TTS_TIMEOUT_MS 25 s: probe yang lewat batas ini pasti sudah mati, bukan lambat.
    staleProbeMs: 30000,
    cleanCloseResetMs: 600000, // 10 menit CLOSED bersih ⇒ tangga backoff kembali ke 60 s
    mirrorTtlSeconds: 60
  });

  /**
   * Kegagalan yang DIHITUNG. Daftar tertutup: menebak dari naskah pesan galat provider adalah
   * cara paling mudah membuat breaker yang tidak pernah membuka (cf-b4 §4.2).
   */
  var FAILURE_KINDS = Object.freeze(['rate_limit', 'server_error', 'timeout', 'unavailable', 'empty_body', 'quota_exhaustion']);

  function isFailureKind(kind) { return FAILURE_KINDS.indexOf(String(kind)) !== -1; }

  /**
   * Memetakan respons/galat mentah menjadi salah satu `FAILURE_KINDS` — atau `null` bila itu
   * bukan kegagalan yang layak membuka breaker (400 karena input murid salah, misalnya, adalah
   * masalah kita sendiri; membuka breaker karenanya akan mematikan fitur untuk semua orang).
   */
  function classify(signal) {
    var s = signal || {};
    if (s.timeout === true) return 'timeout';
    var status = Number(s.status || 0);
    if (status === 429) return 'rate_limit';
    if (status === 402 || s.quotaExhausted === true) return 'quota_exhaustion';
    if (status >= 500) return 'server_error';
    if (s.networkError === true) return 'unavailable';
    if (status === 200 && s.emptyBody === true) return 'empty_body';
    return null;
  }

  function initialState(now) {
    return {
      schema: SCHEMA,
      state: 'CLOSED',
      failures: [],            // timestamp kegagalan dalam jendela
      samples: [],             // {at, ok} untuk error-rate
      consecutive429: 0,
      openings: 0,             // berapa kali sudah membuka ⇒ indeks tangga backoff
      openedAt: 0,
      openedUntil: 0,
      lastProbeAt: 0,
      probesInFlight: 0,
      halfOpenSuccesses: 0,
      closedSince: Number(now) || 0,
      lastFailureKind: ''
    };
  }

  function clone(state, now) {
    if (!state || state.schema !== SCHEMA) return initialState(now);
    return {
      schema: SCHEMA,
      state: state.state === 'OPEN' || state.state === 'HALF_OPEN' ? state.state : 'CLOSED',
      failures: Array.isArray(state.failures) ? state.failures.slice() : [],
      samples: Array.isArray(state.samples) ? state.samples.slice(-CONFIG.errorRateSamples * 2) : [],
      consecutive429: Number(state.consecutive429) || 0,
      openings: Number(state.openings) || 0,
      openedAt: Number(state.openedAt) || 0,
      openedUntil: Number(state.openedUntil) || 0,
      lastProbeAt: Number(state.lastProbeAt) || 0,
      probesInFlight: Number(state.probesInFlight) || 0,
      halfOpenSuccesses: Number(state.halfOpenSuccesses) || 0,
      closedSince: Number(state.closedSince) || 0,
      lastFailureKind: String(state.lastFailureKind || '')
    };
  }

  function prune(state, now) {
    var floor = now - CONFIG.failureWindowMs;
    state.failures = state.failures.filter(function (t) { return t > floor; });
    state.samples = state.samples.filter(function (s) { return s.at > floor; });
    return state;
  }

  function backoffFor(openings) {
    var idx = Math.max(0, Math.min(CONFIG.backoffMs.length - 1, openings));
    return CONFIG.backoffMs[idx];
  }

  function openNow(state, now, retryAfterMs) {
    var wait = Math.max(backoffFor(state.openings), Number(retryAfterMs) || 0);
    state.state = 'OPEN';
    state.openedAt = now;
    state.openedUntil = now + wait;
    state.openings = state.openings + 1;
    state.halfOpenSuccesses = 0;
    state.probesInFlight = 0;
    state.failures = [];
    state.samples = [];
    return state;
  }

  /**
   * Satu-satunya pintu masuk sebelum provider dipanggil.
   *
   * @returns {{allow:boolean, state:object, phase:'CLOSED'|'OPEN'|'HALF_OPEN', probe:boolean,
   *            reason:string, retryAfterMs:number, changed:boolean}}
   */
  function beforeRequest(prev, now) {
    var t = Number(now) || 0;
    var state = prune(clone(prev, t), t);
    var before = state.state;

    if (state.state === 'OPEN') {
      if (t < state.openedUntil) {
        return {
          allow: false, state: state, phase: 'OPEN', probe: false,
          reason: 'breaker_open', retryAfterMs: state.openedUntil - t, changed: false
        };
      }
      // OPEN → HALF-OPEN otomatis begitu openedUntil lewat. Tidak ada timer, tidak ada alarm:
      // waktu yang lewat sudah cukup menjadi pemicu, dan itu satu row-write lebih murah.
      state.state = 'HALF_OPEN';
      state.halfOpenSuccesses = 0;
      state.probesInFlight = 0;
      state.lastProbeAt = 0;
    }

    if (state.state === 'HALF_OPEN') {
      var sinceProbe = t - state.lastProbeAt;
      // Lepaskan probe yang sudah mati sebelum menghitung kesibukan.
      if (state.probesInFlight > 0 && state.lastProbeAt > 0 && sinceProbe >= CONFIG.staleProbeMs) {
        state.probesInFlight = 0;
      }
      var busy = state.probesInFlight >= CONFIG.halfOpenProbeConcurrency;
      if (busy || (state.lastProbeAt > 0 && sinceProbe < CONFIG.halfOpenProbeIntervalMs)) {
        return {
          allow: false, state: state, phase: 'HALF_OPEN', probe: false,
          reason: busy ? 'probe_in_flight' : 'probe_cooldown',
          retryAfterMs: busy ? CONFIG.halfOpenProbeIntervalMs : (CONFIG.halfOpenProbeIntervalMs - sinceProbe),
          changed: state.state !== before
        };
      }
      state.lastProbeAt = t;
      state.probesInFlight = state.probesInFlight + 1;
      return {
        allow: true, state: state, phase: 'HALF_OPEN', probe: true,
        reason: 'probe', retryAfterMs: 0, changed: true
      };
    }

    return { allow: true, state: state, phase: 'CLOSED', probe: false, reason: '', retryAfterMs: 0, changed: state.state !== before };
  }

  /** Provider menjawab dengan benar. */
  function onSuccess(prev, now) {
    var t = Number(now) || 0;
    var state = prune(clone(prev, t), t);
    state.consecutive429 = 0;
    state.samples.push({ at: t, ok: true });
    if (state.state === 'HALF_OPEN') {
      state.probesInFlight = Math.max(0, state.probesInFlight - 1);
      state.halfOpenSuccesses = state.halfOpenSuccesses + 1;
      if (state.halfOpenSuccesses >= CONFIG.halfOpenSuccessesToClose) {
        state.state = 'CLOSED';
        state.closedSince = t;
        state.openedUntil = 0;
        state.halfOpenSuccesses = 0;
        state.failures = [];
      }
      return state;
    }
    if (state.state === 'CLOSED') {
      // Tangga backoff hanya direset setelah CLOSED bersih cukup lama. Tanpa syarat itu,
      // provider yang gagal-sembuh-gagal setiap menit selamanya membuka dengan 60 s.
      if (state.openings > 0 && state.closedSince > 0 && (t - state.closedSince) >= CONFIG.cleanCloseResetMs) {
        state.openings = 0;
      }
      if (!state.closedSince) state.closedSince = t;
    }
    return state;
  }

  /**
   * Provider gagal. `kind` wajib anggota FAILURE_KINDS; apa pun di luar itu diabaikan supaya
   * galat validasi input kita sendiri tidak pernah membuka breaker.
   */
  function onFailure(prev, kind, now, retryAfterMs) {
    var t = Number(now) || 0;
    var state = prune(clone(prev, t), t);
    if (!isFailureKind(kind)) return state;

    state.lastFailureKind = String(kind);
    state.samples.push({ at: t, ok: false });
    state.failures.push(t);
    state.consecutive429 = kind === 'rate_limit' ? state.consecutive429 + 1 : 0;

    if (state.state === 'HALF_OPEN') {
      // Satu kegagalan di HALF-OPEN cukup: probe adalah pertanyaan, dan jawabannya "belum".
      state.probesInFlight = Math.max(0, state.probesInFlight - 1);
      return openNow(state, t, retryAfterMs);
    }

    // Kuota provider habis ⇒ OPEN langsung. Retry tidak akan pernah berhasil sebelum
    // seseorang membayar, jadi mencobanya hanya menambah latensi bagi murid.
    if (kind === 'quota_exhaustion') return openNow(state, t, retryAfterMs);
    if (state.consecutive429 >= CONFIG.consecutive429) return openNow(state, t, retryAfterMs);
    if (state.failures.length >= CONFIG.failureThreshold) return openNow(state, t, retryAfterMs);

    if (state.samples.length >= CONFIG.errorRateSamples) {
      var bad = state.samples.filter(function (s) { return !s.ok; }).length;
      if ((bad / state.samples.length) > CONFIG.errorRateLimit) return openNow(state, t, retryAfterMs);
    }
    return state;
  }

  /** Bentuk yang boleh dikirim ke klien — tanpa timestamp internal, tanpa pesan provider. */
  function snapshot(state, now) {
    var t = Number(now) || 0;
    var s = clone(state, t);
    if (s.state === 'OPEN' && t >= s.openedUntil) s.state = 'HALF_OPEN';
    return Object.freeze({
      breaker: s.state,
      retryAfter: s.state === 'OPEN' ? Math.max(1, Math.ceil((s.openedUntil - t) / 1000)) : 0
    });
  }

  /**
   * Penyimpan ringan. `kv` = KV namespace (get/put), `d1` opsional (catatan riwayat).
   * Menulis HANYA saat state berubah — batas KV Free 1.000 tulis/hari nyata, dan breaker yang
   * menulis tiap request akan menghabiskannya sebelum tengah hari.
   */
  function createStore(deps) {
    var d = deps || {};
    var kv = d.kv || null;
    var d1 = d.d1 || null;
    var ttl = Number(d.mirrorTtlSeconds) || CONFIG.mirrorTtlSeconds;
    var local = new Map(); // cermin dalam-isolate: gratis, dan menghapus mayoritas baca KV

    function key(target) { return 'breaker:' + String(target); }

    async function load(target, now) {
      var cached = local.get(target);
      if (cached && (now - cached.at) < 5000) return clone(cached.state, now);
      if (kv && typeof kv.get === 'function') {
        try {
          var raw = await kv.get(key(target), 'json');
          if (raw) {
            local.set(target, { at: now, state: raw });
            return clone(raw, now);
          }
        } catch (_) { /* KV mati bukan alasan mematikan fitur; anggap CLOSED */ }
      }
      return initialState(now);
    }

    async function save(target, state, now, opts) {
      local.set(target, { at: now, state: state });
      var o = opts || {};
      if (o.changed === false) return;
      if (kv && typeof kv.put === 'function') {
        try {
          await kv.put(key(target), JSON.stringify(state), { expirationTtl: ttl });
        } catch (_) { /* sama seperti di atas */ }
      }
      if (d1 && typeof d1.prepare === 'function' && o.transition) {
        try {
          await d1.prepare(
            'INSERT INTO breaker_events (day, target, state, kind, at) VALUES (?,?,?,?,?)'
          ).bind(o.day || '', String(target), state.state, state.lastFailureKind || '', now).run();
        } catch (_) { /* riwayat adalah kenyamanan, bukan kebenaran */ }
      }
    }

    return {
      load: load,
      save: save,
      /** Membaca cermin tanpa menyentuh jaringan — untuk jalur panas yang cuma butuh label. */
      peek: function (target, now) {
        var cached = local.get(target);
        return snapshot(cached ? cached.state : initialState(now), now);
      }
    };
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    CONFIG: CONFIG,
    FAILURE_KINDS: FAILURE_KINDS,
    classify: classify,
    isFailureKind: isFailureKind,
    initialState: initialState,
    beforeRequest: beforeRequest,
    onSuccess: onSuccess,
    onFailure: onFailure,
    snapshot: snapshot,
    backoffFor: backoffFor,
    createStore: createStore
  });
}));
