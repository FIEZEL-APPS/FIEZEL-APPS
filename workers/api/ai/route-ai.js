/**
 * E5 — POST /api/ai/task (cf-b4 §1.1). Ekspor `registerAiRoutes(router)`.
 *
 * PEMASANGAN (instruksi lengkap ada di reports/exec-e5-ai-tts.md):
 *   // workers/api/index.js — BUKAN berkas ini; jangan disunting oleh paket kerja E5
 *   const { registerAiRoutes } = require('./ai/route-ai.js');
 *   const { registerTtsRoutes } = require('./tts/route-tts.js');
 *   registerAiRoutes(app);   // app = Hono() atau router manual dengan .post(path, handler)
 *   registerTtsRoutes(app);
 *
 * Tiga hal yang berkas ini jaga dan tidak boleh dilunakkan:
 *
 * 1. KLIEN TIDAK PERNAH MENGIRIM PROMPT. Field `prompt`/`system`/`messages`/`model`/`temperature`
 *    adalah 400, bukan field yang diabaikan. Mengabaikannya diam-diam membuat penyerang tidak
 *    tahu bahwa ia gagal, dan membuat kita tidak tahu bahwa ia mencoba.
 *
 * 2. GALAT PROVIDER TIDAK PERNAH DITERUSKAN. Pesan galat Workers AI bisa memuat nama model,
 *    nama akun, ID permintaan, dan kalimat Inggris teknis. Tiga-tiganya salah untuk murid SMP
 *    (`renderAIError` `app.js:5272` hari ini mencetak galat mentah), dan yang pertama adalah
 *    kebocoran informasi. Semua kegagalan keluar sebagai 200 + `degraded:true` + teks fallback
 *    deterministik, atau 429 + `retryAfter` untuk kuota. TIDAK ADA 5xx ke klien: bab 15 melarang
 *    kegagalan AI menghentikan murid mengerjakan soal.
 *
 * 3. TIMEOUT ADA DI SERVER. Hari ini timeout hanya di klien (`app.js:5130` 30 s, `:3880` 25 s),
 *    yang berarti Worker tetap menunggu — dan tetap membayar — sesudah klien menyerah.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelRouteAi = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var AiTasks = (function () {
    if (typeof module === 'object' && module.exports && typeof require === 'function') return require('./ai-tasks.js');
    return (typeof globalThis !== 'undefined' ? globalThis : {}).FiezelAiTasks;
  }());

  var Breaker = (function () {
    if (typeof module === 'object' && module.exports && typeof require === 'function') return require('../breaker/breaker.js');
    return (typeof globalThis !== 'undefined' ? globalThis : {}).FiezelBreaker;
  }());

  /**
   * KUOTA DIMUAT OPSIONAL, dan itu bukan kemalasan — ia syarat agar paket kerja E5 dan paket
   * kuota bisa di-merge dalam urutan apa pun tanpa satu pun dari keduanya rusak. Tiga jalur,
   * berurutan:
   *   (a) `deps.enforceQuota` disuntik pemanggil (jalur yang dipakai gerbang uji);
   *   (b) `globalThis.FIEZEL_ENFORCE_QUOTA` dipasang index.js;
   *   (c) `require`/`import` ../quota/route-quota.js — specifier DIRAKIT saat runtime supaya
   *       bundler tidak gagal build ketika berkas itu belum ada di branch ini.
   * Kalau ketiganya kosong: `enforceQuota` menjadi izin-lolos yang DICATAT (`quotaChecked:false`),
   * bukan penolakan senyap. Menolak semua permintaan karena modul kuota belum di-merge akan
   * mematikan fitur; melewatkannya tanpa jejak akan menyembunyikan biaya. Jejaknya wajib.
   */
  function resolveEnforceQuota(deps) {
    var d = deps || {};
    if (typeof d.enforceQuota === 'function') return d.enforceQuota;
    var g = typeof globalThis !== 'undefined' ? globalThis : {};
    if (typeof g.FIEZEL_ENFORCE_QUOTA === 'function') return g.FIEZEL_ENFORCE_QUOTA;
    if (typeof require === 'function') {
      try {
        var spec = '../quota/route-' + 'quota.js';
        var mod = require(spec);
        if (mod && typeof mod.enforceQuota === 'function') return mod.enforceQuota;
      } catch (_) { /* modul kuota belum ada di branch ini; lanjut dengan jejak */ }
    }
    return null;
  }

  var POLITE = Object.freeze({
    schema_mismatch: 'Permintaan tidak dikenali. Muat ulang halaman lalu coba lagi.',
    unknown_task: 'Bantuan yang kamu minta belum tersedia.',
    client_prompt_forbidden: 'Permintaan tidak dikenali. Muat ulang halaman lalu coba lagi.',
    input_required: 'Isi dulu bagian yang diminta.',
    invalid_input: 'Ada bagian yang belum sesuai. Periksa lagi isinya.',
    too_long: 'Tulisanmu terlalu panjang untuk sekali kirim. Coba potong sebagian.',
    quota_exceeded: 'Jatah bantuan AI hari ini sudah habis. Coba lagi besok.',
    breaker_open: 'Bantuan AI sedang istirahat sebentar. FIEZEL tetap menjawab dari materi.',
    degraded: 'Mode hemat — jawaban ini dari FIEZEL, bukan AI.',
    body_too_big: 'Permintaan terlalu besar.',
    bad_json: 'Permintaan tidak dikenali. Muat ulang halaman lalu coba lagi.'
  });

  var MAX_BODY_BYTES = 16000; // di atas payload terbesar (context_coach 8.000 B) dengan margin

  function json(payload, status, headers) {
    var h = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
    if (headers) Object.keys(headers).forEach(function (k) { h[k] = headers[k]; });
    return new Response(JSON.stringify(payload), { status: status || 200, headers: h });
  }

  function firstErrorCode(errors) {
    var e = (errors && errors[0]) || 'invalid_input';
    var head = String(e).split(':')[0];
    if (POLITE[head]) return head;
    if (head === 'missing' || head === 'enum' || head === 'type' || head === 'unknown_field' ||
        head === 'privacy' || head === 'item') return 'invalid_input';
    if (head === 'too_big' || head === 'too_many' || head === 'payload_too_big' ||
        head === 'input_tokens_exceeded') return 'too_long';
    return 'invalid_input';
  }

  function baseResponse(task, extra) {
    var out = {
      schema: AiTasks.RESPONSE_SCHEMA,
      task: task || '',
      text: '',
      source: 'deterministic-fallback',
      degraded: true,
      breaker: 'CLOSED',
      usage: { inputTokens: 0, outputTokens: 0, ms: 0 },
      protocol: '2.0'
    };
    if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }

  /** Membaca teks dari bentuk keluaran Workers AI yang berbeda-beda antar model. */
  function readProviderText(result) {
    if (result == null) return '';
    if (typeof result === 'string') return result;
    if (typeof result.response === 'string') return result.response;
    if (typeof result.result === 'string') return result.result;
    if (result.result && typeof result.result.response === 'string') return result.result.response;
    if (Array.isArray(result.choices) && result.choices[0]) {
      var c = result.choices[0];
      if (c.message && typeof c.message.content === 'string') return c.message.content;
      if (typeof c.text === 'string') return c.text;
    }
    return '';
  }

  /**
   * Memanggil provider dengan timeout NYATA. `AbortSignal.timeout` dipakai bila ada; kalau
   * tidak, `Promise.race` menjadi jaring terakhir supaya batas waktu tetap berlaku di runtime
   * lama. Yang tidak boleh terjadi: menunggu tanpa batas, karena itu tagihan yang tak terlihat.
   */
  async function callProvider(env, modelId, payload, timeoutMs) {
    var options = {};
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      options.signal = AbortSignal.timeout(timeoutMs);
    }
    var run = env.AI.run(modelId, payload, options);
    var timer;
    var guard = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        var err = new Error('provider_timeout');
        err.fiezelTimeout = true;
        reject(err);
      }, timeoutMs + 250);
    });
    try {
      return await Promise.race([run, guard]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Peta galat mentah → sinyal breaker. Tidak menebak dari naskah pesan bila ada status. */
  function signalFromError(error) {
    var e = error || {};
    if (e.fiezelTimeout === true || e.name === 'TimeoutError' || e.name === 'AbortError') return { timeout: true };
    var status = Number(e.status || (e.response && e.response.status) || 0);
    if (status) return { status: status };
    return { networkError: true };
  }

  /**
   * Handler inti — bebas dari bentuk router supaya bisa diuji tanpa framework.
   * @param {{request:Request, env:object, ctx:object, deps:object}} args
   */
  async function handleAiTask(args) {
    var a = args || {};
    var env = a.env || {};
    var deps = a.deps || {};
    var now = typeof deps.now === 'function' ? deps.now : function () { return Date.now(); };
    var started = now();

    var raw;
    try {
      raw = await a.request.text();
    } catch (_) {
      return json(baseResponse('', { error: 'bad_request', message: POLITE.bad_json }), 400);
    }
    if (AiTasks.byteLength(raw || '') > MAX_BODY_BYTES) {
      return json(baseResponse('', { error: 'body_too_big', message: POLITE.body_too_big }), 413);
    }
    var body;
    try { body = JSON.parse(raw || '{}'); } catch (_) {
      return json(baseResponse('', { error: 'bad_json', message: POLITE.bad_json }), 400);
    }

    var verdict = AiTasks.validate(body);
    if (!verdict.ok) {
      var code = firstErrorCode(verdict.errors);
      // Daftar galat rinci TIDAK dikirim ke klien; ia hanya untuk log server-side. Yang dikirim
      // satu kode + satu kalimat sopan.
      return json(baseResponse(verdict.task || '', {
        error: code, message: POLITE[code], degraded: true
      }), 400);
    }

    var spec = verdict.spec;
    var taskName = verdict.task;
    var fallbackText = AiTasks.fallbackFor(taskName, verdict.input);

    // --- BREAKER SEBELUM KUOTA. Provider yang sudah terbukti mati tidak boleh memakan satu pun
    // jatah murid: OPEN artinya jawabannya sudah diketahui tanpa memanggil apa pun.
    var breakerTarget = 'ai:' + AiTasks.pickModel(taskName, { breaker: 'CLOSED' }).id;
    var store = deps.breakerStore || null;
    var breakerState = store ? await store.load(breakerTarget, started) : Breaker.initialState(started);
    var gate = Breaker.beforeRequest(breakerState, started);
    if (store) await store.save(breakerTarget, gate.state, started, { changed: gate.changed });

    if (!gate.allow) {
      return json(baseResponse(taskName, {
        text: fallbackText,
        source: 'deterministic-fallback',
        degraded: true,
        breaker: gate.phase,
        message: POLITE.breaker_open,
        retryAfter: Math.max(1, Math.ceil(gate.retryAfterMs / 1000)),
        usage: { inputTokens: 0, outputTokens: 0, ms: now() - started }
      }), 200);
    }

    // --- KUOTA. Satu-satunya titik pemeriksaan, dan hanya untuk permintaan yang benar-benar
    // akan memanggil provider.
    var enforceQuota = resolveEnforceQuota(deps);
    var quotaChecked = false;
    if (enforceQuota) {
      var quota;
      try {
        quota = await enforceQuota({
          env: env, ctx: a.ctx, request: a.request,
          kind: 'ai', task: taskName,
          estimatedInputTokens: AiTasks.estimateTokens(JSON.stringify(verdict.input)),
          maxOutputTokens: spec.maxOutputTokens,
          rateLimit: spec.rateLimit
        });
        quotaChecked = true;
      } catch (_) {
        // Modul kuota yang meledak tidak boleh menjadi 500 bagi murid; ia menjadi mode hemat.
        quota = { allowed: false, reason: 'quota_unavailable', retryAfter: 60 };
        quotaChecked = true;
      }
      if (quota && quota.allowed === false) {
        return json(baseResponse(taskName, {
          text: fallbackText,
          source: 'deterministic-fallback',
          degraded: true,
          breaker: gate.phase,
          error: 'quota_exceeded',
          message: POLITE.quota_exceeded,
          retryAfter: Number(quota.retryAfter) || 3600,
          quotaChecked: true,
          usage: { inputTokens: 0, outputTokens: 0, ms: now() - started }
        }), 429, { 'retry-after': String(Number(quota.retryAfter) || 3600) });
      }
    }

    // --- PROVIDER
    var model = AiTasks.pickModel(taskName, {
      breaker: gate.phase,
      neuronsUsedToday: Number(deps.neuronsUsedToday || 0)
    });
    var prompt = AiTasks.buildPrompt(taskName, verdict.input, verdict.locale);
    var payload = { prompt: prompt, max_tokens: spec.maxOutputTokens };
    if (spec.jsonMode) payload.response_format = { type: 'json_object' };

    var text = '';
    var failureKind = '';
    try {
      var result = await callProvider(env, model.id, payload, spec.timeoutMs);
      text = String(readProviderText(result) || '').trim();
      if (!text) failureKind = 'empty_body';
    } catch (error) {
      failureKind = Breaker.classify(signalFromError(error)) || 'unavailable';
    }

    var inTokens = AiTasks.estimateTokens(prompt);
    var outTokens = AiTasks.estimateTokens(text);

    if (failureKind) {
      var failed = Breaker.onFailure(gate.state, failureKind, now(), 0);
      if (store) await store.save(breakerTarget, failed, now(), { changed: true, transition: true });
      var snap = Breaker.snapshot(failed, now());
      var body429 = baseResponse(taskName, {
        text: fallbackText,
        source: 'deterministic-fallback',
        degraded: true,
        breaker: snap.breaker,
        message: POLITE.degraded,
        retryAfter: snap.retryAfter,
        quotaChecked: quotaChecked,
        usage: { inputTokens: inTokens, outputTokens: 0, ms: now() - started }
      });
      // Tetap 200: murid mendapat jawaban, hanya jawabannya bukan dari AI.
      return json(body429, 200);
    }

    var healthy = Breaker.onSuccess(gate.state, now());
    if (store) await store.save(breakerTarget, healthy, now(), { changed: gate.phase !== 'CLOSED' });

    if (typeof deps.recordUsage === 'function' && a.ctx && typeof a.ctx.waitUntil === 'function') {
      // Dicatat server-side, lewat waitUntil, supaya tidak menambah latensi dan tidak bisa
      // dipalsukan klien (KONTRAK ANALYTICS di EXEC-BRIEF-CF.md).
      a.ctx.waitUntil(Promise.resolve(deps.recordUsage({
        kind: 'ai', task: taskName, model: model.id,
        inputTokens: inTokens, outputTokens: outTokens,
        neurons: model.neuronsPerRequest,
        costUsd: AiTasks.estimateCostUsd(taskName, inTokens, outTokens),
        ms: now() - started
      })).catch(function () { /* telemetri gagal bukan alasan menggagalkan jawaban */ }));
    }

    return json(baseResponse(taskName, {
      text: text,
      source: 'provider',
      degraded: false,
      breaker: Breaker.snapshot(healthy, now()).breaker,
      quotaChecked: quotaChecked,
      usage: { inputTokens: inTokens, outputTokens: outTokens, ms: now() - started }
    }), 200);
  }

  /** Adapter: menerima Hono (`c.req.raw`, `c.env`) maupun router manual `(request, env, ctx)`. */
  function adapt(handler, deps) {
    return function (first, second, third) {
      if (first && first.req && first.env !== undefined) {
        return handler({
          request: first.req.raw || first.req,
          env: first.env,
          ctx: first.executionCtx || first.ctx || null,
          deps: deps
        });
      }
      return handler({ request: first, env: second || {}, ctx: third || null, deps: deps });
    };
  }

  function registerAiRoutes(router, deps) {
    if (!router || typeof router.post !== 'function') throw new Error('router_required');
    router.post('/api/ai/task', adapt(handleAiTask, deps || {}));
    return router;
  }

  return Object.freeze({
    ROUTE: '/api/ai/task',
    POLITE: POLITE,
    MAX_BODY_BYTES: MAX_BODY_BYTES,
    registerAiRoutes: registerAiRoutes,
    handleAiTask: handleAiTask,
    resolveEnforceQuota: resolveEnforceQuota,
    readProviderText: readProviderText,
    signalFromError: signalFromError
  });
}));
