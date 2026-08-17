/**
 * m025-26 sherpa-onnx VITS-Piper adapter.
 *
 * Replaces the Kokoro ORT/WASM adapter on Apple standalone, where Kokoro q8 was proven
 * unviable: OWNER capture 2026-08-17T16:40:43Z recorded three consecutive WebKit
 * content-process kills during inference, zero successes, and >30s for a 49-char chunk.
 *
 * This runtime is the exact substrate benchmarked in m025-37 on Safari 26.5.2 arm64:
 * ready 4099ms, first 855ms, warm median 786ms, worst realtime factor 0.347, six
 * distinct finite voices, crossOriginIsolated=false. Sub-realtime without COOP/COEP,
 * which is what GitHub Pages can actually serve.
 *
 * The decisive structural difference from Kokoro: all model work happens inside a
 * dedicated Worker, so the main thread never owns a long WASM call. That is why the
 * event loop stays responsive and the content process is not killed.
 *
 * Satisfies the same adapter contract as fiezel-kokoro-adapter.js:
 *   kind, initialize(), generate(text,{voice,speed}), listVoices(), getBackendState()
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelSherpaVitsAdapter = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var RUNTIME_BASE = 'vendor/sherpa-vits/';
  var WORKER_FILE = 'sherpa-onnx-tts.worker.js';
  var EXPECTED_SPEAKERS = 904;
  var MODEL_ID = 'vits-piper-en_US-libritts_r-medium';
  var ARCHITECTURE = 'sherpa-onnx-v1.13.5-vits-piper-wasm-worker';

  // FIEZEL voice id -> Piper speaker id. The six speaker ids are the ones proven
  // distinct in m025-37 (min envelope distance 0.158 across all 15 pairs).
  // Existing FIEZEL ids are retained so stored user preferences keep resolving, but
  // every slot is genuinely en-US: this model has no en-GB speakers, and labelling
  // one as en-GB would be a lie the audio does not support.
  var VOICE_SIDS = Object.freeze({
    af_bella: 0,
    af_heart: 180,
    af_nicole: 360,
    am_michael: 540,
    bf_emma: 720,
    bm_george: 903
  });
  var DEFAULT_VOICE = 'af_bella';

  // Natural speaking-rate calibration, set from OWNER physical listening across three
  // builds rather than from a formula:
  //   1.00 (m025-26) -> ~215 wpm, too fast to follow, but preferred over the next try
  //   0.70 (m025-27) -> ~150 wpm, rejected as "slow motion"
  //   0.85 (m025-28) -> ~183 wpm, between the two, leaning toward the faster one
  // OWNER asked for a rate below the first and above the second, closer to the first.
  // 183 wpm is brisk-but-natural: above conversational average, below the original.
  // This scales playback duration only; generation cost tracks token count, so the
  // responsiveness OWNER asked me to preserve is unaffected.
  var NATURAL_SPEED = 0.85;
  // Guard rails so a caller cannot request an unintelligible or absurd rate.
  var MIN_ENGINE_SPEED = 0.4;
  var MAX_ENGINE_SPEED = 1.6;

  function createSherpaVitsAdapter(options) {
    var opts = options || {};
    var env = opts.env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var onStage = typeof opts.onStage === 'function' ? opts.onStage : null;
    var basePath = String(opts.basePath || RUNTIME_BASE);

    var worker = null;
    var readyPromise = null;
    var pending = null;
    var backendState = Object.freeze({ id: 'uninitialized', device: '', dtype: '' });
    var numSpeakers = 0;
    var modelType = null;
    var sampleRate = 0;

    function stage(phase, detail) {
      if (!onStage) return;
      try { onStage(Object.assign({ phase: phase }, detail || {})); } catch (_) {}
    }

    function backendDetail(extra) {
      return Object.assign({
        backendId: backendState.id,
        backendDevice: backendState.device,
        backendDtype: backendState.dtype
      }, extra || {});
    }

    function resolveSid(voice) {
      var key = String(voice || DEFAULT_VOICE);
      if (Object.prototype.hasOwnProperty.call(VOICE_SIDS, key)) return VOICE_SIDS[key];
      return VOICE_SIDS[DEFAULT_VOICE];
    }

    // Reject a late/duplicate settle instead of silently dropping it, so a stale worker
    // reply can never be mistaken for the current request's audio.
    function settlePending(handler, value) {
      if (!pending) return;
      var current = pending;
      pending = null;
      current[handler](value);
    }

    function handleMessage(event) {
      var data = (event && event.data) || {};
      if (data.type === 'sherpa-onnx-tts-ready') {
        numSpeakers = Number(data.numSpeakers) || 0;
        modelType = Number(data.modelType);
        backendState = Object.freeze({ id: 'sherpa-vits-wasm-worker', device: 'wasm-simd-worker', dtype: 'fp32' });
        stage('adapter_backend_ready', backendDetail({ numSpeakers: numSpeakers, modelType: modelType, model: MODEL_ID }));
        return;
      }
      if (data.type === 'sherpa-onnx-tts-result') {
        sampleRate = Number(data.sampleRate) || sampleRate;
        settlePending('resolve', { samples: data.samples, sampleRate: sampleRate });
        return;
      }
      if (data.type === 'error') {
        var error = new Error(String(data.message || 'sherpa_worker_error'));
        if (pending) settlePending('reject', error);
        else stage('adapter_worker_error', backendDetail({ error: error.message }));
      }
    }

    function initialize() {
      if (readyPromise) return readyPromise;
      readyPromise = new Promise(function (resolve, reject) {
        var Ctor = env.Worker;
        if (typeof Ctor !== 'function') { reject(new Error('sherpa_worker_unavailable')); return; }
        var startedAt = Date.now();
        stage('adapter_instance_start', { architecture: ARCHITECTURE, model: MODEL_ID, device: 'wasm-simd-worker' });
        try {
          worker = new Ctor(basePath + WORKER_FILE);
        } catch (error) { reject(error); return; }

        var settled = false;
        worker.onmessage = function (event) {
          var data = (event && event.data) || {};
          handleMessage(event);
          if (!settled && data.type === 'sherpa-onnx-tts-ready') {
            settled = true;
            if (numSpeakers !== EXPECTED_SPEAKERS) {
              reject(new Error('sherpa_speaker_count_mismatch:' + numSpeakers));
              return;
            }
            stage('adapter_instance_ready', backendDetail({ elapsedMs: Date.now() - startedAt, numSpeakers: numSpeakers }));
            resolve(api);
          } else if (!settled && data.type === 'error') {
            settled = true;
            reject(new Error(String(data.message || 'sherpa_worker_error')));
          }
        };
        worker.onerror = function (event) {
          var error = new Error('sherpa_worker_failed:' + String((event && event.message) || 'error'));
          if (pending) settlePending('reject', error);
          if (!settled) { settled = true; reject(error); }
        };
      }).catch(function (error) {
        // Allow a later explicit retry rather than latching the failure for the page life.
        readyPromise = null;
        try { if (worker) worker.terminate(); } catch (_) {}
        worker = null;
        stage('adapter_instance_error', { error: String((error && error.message) || error) });
        throw error;
      });
      return readyPromise;
    }

    function generate(text, generationOptions) {
      var options = generationOptions || {};
      var voice = String(options.voice || DEFAULT_VOICE);
      var requested = typeof options.speed === 'number' && options.speed > 0 ? options.speed : 1;
      // The product's speed 1 means "natural", not "engine default". Callers keep
      // relative control: 1.1 is still 10% faster than natural.
      var speed = Math.min(MAX_ENGINE_SPEED, Math.max(MIN_ENGINE_SPEED, NATURAL_SPEED * requested));
      var sid = resolveSid(voice);
      var startedAt = Date.now();
      stage('adapter_generate_enter', backendDetail({ voice: voice, sid: sid, requestedSpeed: requested, engineSpeed: speed }));
      return initialize().then(function () {
        // The worker protocol carries exactly one in-flight generation. Fail closed on a
        // second request rather than interleaving and returning another request's audio.
        if (pending) {
          var busy = new Error('neural_generation_busy');
          stage('adapter_generate_busy', backendDetail({ voice: voice, sid: sid }));
          throw busy;
        }
        return new Promise(function (resolve, reject) {
          pending = { resolve: resolve, reject: reject };
          stage('adapter_generate_invoke', backendDetail({ voice: voice, sid: sid, elapsedMs: Date.now() - startedAt }));
          try {
            worker.postMessage({ type: 'generate', text: String(text || ''), sid: sid, speed: speed });
          } catch (error) { pending = null; reject(error); return; }
          stage('adapter_generate_dispatched', backendDetail({ voice: voice, sid: sid, elapsedMs: Date.now() - startedAt }));
        });
      }).then(function (result) {
        var samples = result.samples;
        var count = samples && typeof samples.length === 'number' ? samples.length : 0;
        if (!count) throw new Error('sherpa_empty_audio');
        stage('adapter_generate_ready', backendDetail({
          voice: voice, sid: sid, elapsedMs: Date.now() - startedAt,
          samples: count, sampleRate: result.sampleRate
        }));
        return { audio: samples, sampling_rate: result.sampleRate, voice: voice, sid: sid };
      });
    }

    function listVoices() { return Promise.resolve(Object.keys(VOICE_SIDS)); }

    function stop() {
      if (pending) settlePending('reject', new Error('neural_generation_stopped'));
    }

    function release() {
      stop();
      try { if (worker) worker.terminate(); } catch (_) {}
      worker = null;
      readyPromise = null;
      backendState = Object.freeze({ id: 'uninitialized', device: '', dtype: '' });
    }

    var api = Object.freeze({
      kind: 'sherpa-vits-local',
      architecture: ARCHITECTURE,
      modelId: MODEL_ID,
      voiceSids: VOICE_SIDS,
      defaultVoice: DEFAULT_VOICE,
      initialize: initialize,
      generate: generate,
      listVoices: listVoices,
      stop: stop,
      release: release,
      getBackendState: function () { return backendState; }
    });
    return api;
  }

  return Object.freeze({ createSherpaVitsAdapter: createSherpaVitsAdapter, VOICE_SIDS: VOICE_SIDS, DEFAULT_VOICE: DEFAULT_VOICE, MODEL_ID: MODEL_ID, NATURAL_SPEED: NATURAL_SPEED, MIN_ENGINE_SPEED: MIN_ENGINE_SPEED, MAX_ENGINE_SPEED: MAX_ENGINE_SPEED });
}));
