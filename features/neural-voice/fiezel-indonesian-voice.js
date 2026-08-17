/**
 * m025-32 Indonesian neural voice — optional, separately downloaded bundle.
 *
 * sherpa-onnx WASM bakes exactly one model into its .data payload, so Indonesian
 * cannot be a slot inside the English bundle: it needs its own runtime. OWNER chose
 * to ship both while keeping the app working normally, so English stays mandatory and
 * Indonesian is fetched only when the learner asks for it.
 *
 * Nothing here runs at startup. If the Indonesian bundle is absent the app behaves
 * exactly as before; only the Indonesian option reports itself as not downloaded.
 *
 * Substrate proven in m025-31id on Safari 26 arm64: model
 * vits-piper-id_ID-news_tts-medium, single speaker, first generation 1546ms,
 * worst realtime factor 0.361, finite audio at 22050Hz.
 */
(function (root) {
  'use strict';

  var STATUS_KEY = 'fiezel-indonesian-voice-v1';
  var SCHEMA = 'fiezel-indonesian-voice-status-v1';
  var version = String(root.FIEZEL_VERSION || '5.19.0');
  var cacheName = 'fiezel-v' + version;
  var rootUrl = new URL('../../', (document.currentScript && document.currentScript.src) || location.href);
  var absolute = function (path) { return new URL(String(path).replace(/^\.\//, ''), rootUrl).href; };

  var VOICE_ID = 'id_natural';
  var MODEL_ID = 'vits-piper-id_ID-news_tts-medium';
  var BASE = 'vendor/sherpa-vits-id/';

  // Declared byte counts are asserted against the vendored files in CI. A mismatch here
  // is what makes a prepare layer re-download forever, so it must never drift.
  var assets = Object.freeze([
    { path: BASE + 'sherpa-onnx-wasm-main-tts.js', bytes: 109876 },
    { path: BASE + 'sherpa-onnx-tts.js', bytes: 33227 },
    { path: BASE + 'sherpa-onnx-tts.worker.js', bytes: 2677 },
    { path: BASE + 'sherpa-onnx-wasm-main-tts.wasm', bytes: 13474133 },
    { path: BASE + 'sherpa-onnx-wasm-main-tts.data', bytes: 80939086 }
  ]);

  var adapter = null;
  var service = null;
  var readyPromise = null;
  var preparePromise = null;
  var lastError = '';

  function diag(entry) {
    try {
      var key = 'fiezel-neural-voice-diagnostics-v1';
      var list = JSON.parse(root.localStorage.getItem(key) || '[]');
      list.push(Object.assign({ t: Date.now(), v: version, engine: 'sherpa-vits-id' }, entry));
      root.localStorage.setItem(key, JSON.stringify(list.slice(-200)));
    } catch (_) {}
  }

  function readPrepared() {
    try {
      var value = JSON.parse(root.localStorage.getItem(STATUS_KEY) || 'null');
      return !!(value && value.schema === SCHEMA && value.version === version && value.prepared === true);
    } catch (_) { return false; }
  }
  function writePrepared(prepared) {
    try {
      root.localStorage.setItem(STATUS_KEY, JSON.stringify({
        schema: SCHEMA, version: version, prepared: prepared === true, preparedAt: prepared ? Date.now() : 0
      }));
    } catch (_) {}
  }

  function status() {
    return Object.freeze({
      schema: SCHEMA,
      version: version,
      engine: 'sherpa-vits-id',
      model: MODEL_ID,
      voice: VOICE_ID,
      optional: true,
      prepared: readPrepared(),
      ready: !!service,
      error: lastError,
      assetCount: assets.length,
      totalBytes: 94558999
    });
  }

  // Downloads into the same stable neural cache the English bundle uses, so a shell
  // release never evicts it and a reload never refetches it.
  async function warmAssets(onProgress) {
    if (!('caches' in root)) throw new Error('cache_storage_unavailable');
    var cache = await caches.open(cacheName);
    var done = 0;
    for (var i = 0; i < assets.length; i++) {
      var url = absolute(assets[i].path);
      var hit = await cache.match(url);
      if (!hit) {
        var response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
        if (!response || !response.ok) throw new Error('indonesian_asset_failed:' + assets[i].path);
        await cache.put(url, response.clone());
      }
      done++;
      if (typeof onProgress === 'function') {
        try { onProgress({ completed: done, total: assets.length, path: assets[i].path }); } catch (_) {}
      }
    }
    return true;
  }

  async function verifyCached() {
    if (!('caches' in root)) return false;
    try {
      var cache = await caches.open(cacheName);
      for (var i = 0; i < assets.length; i++) {
        if (!(await cache.match(absolute(assets[i].path)))) return false;
      }
      return true;
    } catch (_) { return false; }
  }

  function initialize() {
    if (readyPromise) return readyPromise;
    readyPromise = (async function () {
      if (!root.FiezelSherpaVitsAdapter || !root.FiezelNeuralVoice || !root.FiezelWebAudioPlayer) {
        throw new Error('indonesian_runtime_modules_missing');
      }
      adapter = root.FiezelSherpaVitsAdapter.createSherpaVitsAdapter({
        env: root,
        basePath: absolute(BASE),
        expectedSpeakers: 1,
        modelId: MODEL_ID,
        voiceSids: { id_natural: 0 },
        defaultVoice: VOICE_ID,
        kind: 'sherpa-vits-id',
        onStage: function (entry) { diag(entry); }
      });
      await adapter.initialize();
      var player = root.FiezelWebAudioPlayer.createPlayer(root);
      service = root.FiezelNeuralVoice.createVoiceService({
        config: root.FiezelNeuralVoiceConfig,
        adapter: adapter,
        env: root,
        playAudio: player.play,
        generationTimeoutMs: 30000
      });
      diag({ phase: 'indonesian_ready', model: MODEL_ID });
      return service;
    })().catch(function (error) {
      // Clear so a later retry works without a page reload.
      readyPromise = null; service = null; adapter = null;
      lastError = String((error && error.message) || error);
      diag({ phase: 'indonesian_init_error', error: lastError });
      throw error;
    });
    return readyPromise;
  }

  function prepare(options) {
    if (preparePromise) return preparePromise;
    var opts = options || {};
    lastError = '';
    preparePromise = (async function () {
      diag({ phase: 'indonesian_prepare_start' });
      await warmAssets(opts.onProgress);
      writePrepared(true);
      await initialize();
      diag({ phase: 'indonesian_prepared' });
      return status();
    })().catch(function (error) {
      lastError = String((error && error.message) || error);
      writePrepared(false);
      diag({ phase: 'indonesian_prepare_error', error: lastError });
      throw error;
    }).finally(function () { preparePromise = null; });
    return preparePromise;
  }

  // Indonesian is neural or nothing: allowFallback stays false so a failure can never
  // become a browser-TTS substitution.
  async function speak(text, options) {
    var opts = options || {};
    if (!readPrepared()) throw new Error('indonesian_voice_not_downloaded');
    var live = await initialize();
    return live.speak(String(text || ''), {
      voice: VOICE_ID,
      speed: typeof opts.speed === 'number' ? opts.speed : 1,
      lang: 'id-ID',
      allowFallback: false
    });
  }

  function stop() { try { if (service && service.stop) service.stop(); } catch (_) {} }

  async function release() {
    stop();
    try { if (adapter && adapter.release) adapter.release(); } catch (_) {}
    adapter = null; service = null; readyPromise = null;
  }

  root.FiezelIndonesianVoice = Object.freeze({
    schema: SCHEMA,
    voiceId: VOICE_ID,
    modelId: MODEL_ID,
    status: status,
    prepare: prepare,
    speak: speak,
    stop: stop,
    release: release,
    verifyCached: verifyCached,
    assets: function () { return assets.map(function (a) { return Object.assign({}, a); }); }
  });
}(typeof globalThis !== 'undefined' ? globalThis : this));
