(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FiezelKokoroAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function assertLocalPath(value, name) {
    const text = String(value || '').trim();
    if (!text) throw new Error(name + ' is required');
    if (/^(?:https?:)?\/\//i.test(text) || /^[a-z][a-z0-9+.-]*:/i.test(text)) {
      throw new Error(name + ' must be same-origin/local');
    }
    return text;
  }

  function normalizeWasmPath(value, runtimeOrigin) {
    const text = String(value || '').trim();
    if (!text) throw new Error('wasmBasePath is required');
    if (/^https?:\/\//i.test(text)) {
      const expectedOrigin = String(runtimeOrigin || '').trim();
      if (!expectedOrigin) throw new Error('runtimeOrigin is required for an absolute wasmBasePath');
      const parsed = new URL(text);
      if (parsed.origin !== expectedOrigin) throw new Error('wasmBasePath must be same-origin/local');
      return parsed.href;
    }
    return assertLocalPath(text, 'wasmBasePath');
  }

  function createKokoroAdapter(options) {
    options = options || {};
    const KokoroTTS = options.KokoroTTS;
    const kokoroEnv = options.kokoroEnv;
    const setVoiceDataUrl = options.setVoiceDataUrl;
    const onStage = typeof options.onStage === 'function' ? options.onStage : null;
    if (!KokoroTTS || typeof KokoroTTS.from_pretrained !== 'function') throw new Error('KokoroTTS implementation is required');
    if (!kokoroEnv || typeof kokoroEnv !== 'object') throw new Error('Patched kokoro env export is required');
    if (typeof setVoiceDataUrl !== 'function') throw new Error('setVoiceDataUrl export is required');
    if (!('allowRemoteModels' in kokoroEnv) || !('localModelPath' in kokoroEnv)) throw new Error('Patched local model routing controls are required');
    if (!('wasmPaths' in kokoroEnv)) throw new Error('Local WASM routing control is required');

    const modelId = assertLocalPath(options.modelId || 'kokoro-model', 'modelId');
    const localModelPath = assertLocalPath(options.localModelPath || './vendor/', 'localModelPath');
    const voiceBaseUrl = assertLocalPath(options.voiceBaseUrl || './vendor/kokoro-model/voices', 'voiceBaseUrl');
    const wasmBasePath = normalizeWasmPath(options.wasmBasePath || './vendor/kokoro-js/wasm/', options.runtimeOrigin);
    const dtype = String(options.dtype || 'q8');
    const device = String(options.device || 'wasm');
    let instancePromise = null;

    function stage(phase, detail) {
      if (!onStage) return;
      try { onStage(Object.freeze({ phase, ...(detail || {}) })); } catch (_) {}
    }

    function errorKind(error) {
      return String(error && (error.code || error.name) || 'error').slice(0, 80);
    }

    function runtimePolicyContext() {
      const runtime = typeof globalThis !== 'undefined' ? globalThis : {};
      return {
        appleStandalone: runtime.navigator?.standalone === true,
        isolated: runtime.crossOriginIsolated === true,
        wasm: kokoroEnv?.backends?.onnx?.wasm || null
      };
    }

    function effectiveWasmPolicy() {
      const { appleStandalone, isolated, wasm } = runtimePolicyContext();
      const numThreads = Number.isFinite(Number(wasm?.numThreads)) ? Number(wasm.numThreads) : (isolated ? null : 1);
      const proxy = wasm?.proxy === true;
      if (appleStandalone && !isolated && device === 'wasm') {
        return Object.freeze({
          policy: proxy ? 'apple-standalone-single-thread-proxy-worker' : 'apple-standalone-single-thread-direct-default',
          numThreads,
          proxy,
          source: 'onnxruntime-web-1.22-runtime-default',
          readBack: false,
          supersedes: 'apple-standalone-single-thread-direct-default'
        });
      }
      return Object.freeze({
        policy: isolated ? 'onnxruntime-default-isolated' : 'onnxruntime-default-single-thread',
        numThreads,
        proxy,
        source: 'onnxruntime-web-1.22-runtime-default',
        readBack: false
      });
    }

    function applyAppleStandaloneWorkerPolicy() {
      const { appleStandalone, isolated, wasm } = runtimePolicyContext();
      if (!wasm || device !== 'wasm' || !appleStandalone || isolated) return effectiveWasmPolicy();
      // m025-18: physical m025-17 evidence showed each 49-79 char model call
      // blocking the document event loop for the full ~10-16 s inference interval.
      // ORT's shipped proxy worker keeps the same single WASM inference thread while
      // moving that blocking run off the PWA document/UI thread. This is not WASM
      // multithreading and does not require crossOriginIsolated.
      wasm.numThreads = 1;
      wasm.proxy = true;
      return effectiveWasmPolicy();
    }

    function tokenCount(value) {
      const dims = value && value.input_ids && value.input_ids.dims;
      if (!dims || typeof dims.length !== 'number' || dims.length < 1) return null;
      const last = Number(dims[dims.length - 1]);
      return Number.isFinite(last) ? last : null;
    }

    function instrumentInstance(tts) {
      if (!tts || tts.__fiezelStageProbeV1) return tts;
      let tokenizer = false;
      let model = false;

      if (typeof Proxy === 'function' && typeof tts.tokenizer === 'function') {
        const originalTokenizer = tts.tokenizer;
        tts.tokenizer = new Proxy(originalTokenizer, {
          apply(target, thisArg, args) {
            const startedAt = Date.now();
            stage('adapter_tokenizer_enter');
            try {
              const value = Reflect.apply(target, thisArg, args);
              stage('adapter_tokenizer_resolved', { elapsedMs: Date.now() - startedAt, tokenCount: tokenCount(value) });
              return value;
            } catch (error) {
              stage('adapter_tokenizer_error', { elapsedMs: Date.now() - startedAt, errorKind: errorKind(error) });
              throw error;
            }
          }
        });
        tokenizer = true;
      }

      if (typeof Proxy === 'function' && typeof tts.model === 'function') {
        const originalModel = tts.model;
        tts.model = new Proxy(originalModel, {
          apply(target, thisArg, args) {
            const startedAt = Date.now();
            stage('adapter_model_enter');
            let result;
            try {
              result = Reflect.apply(target, thisArg, args);
              stage('adapter_model_dispatched', { elapsedMs: Date.now() - startedAt });
            } catch (error) {
              stage('adapter_model_error', { elapsedMs: Date.now() - startedAt, errorKind: errorKind(error) });
              throw error;
            }
            return Promise.resolve(result).then((value) => {
              stage('adapter_model_resolved', { elapsedMs: Date.now() - startedAt });
              return value;
            }, (error) => {
              stage('adapter_model_error', { elapsedMs: Date.now() - startedAt, errorKind: errorKind(error) });
              throw error;
            });
          }
        });
        model = true;
      }

      try { Object.defineProperty(tts, '__fiezelStageProbeV1', { value: true, configurable: false }); } catch (_) {}
      stage('adapter_stage_probe_ready', { tokenizer, model });
      return tts;
    }

    async function getInstance() {
      if (!instancePromise) {
        kokoroEnv.allowRemoteModels = false;
        if ('allowLocalModels' in kokoroEnv) kokoroEnv.allowLocalModels = true;
        kokoroEnv.localModelPath = localModelPath;
        kokoroEnv.wasmPaths = wasmBasePath;
        setVoiceDataUrl(voiceBaseUrl);
        const policy = applyAppleStandaloneWorkerPolicy();
        try {
          if (typeof globalThis !== 'undefined') globalThis.__fiezelNeuralWasmPolicy = policy.policy;
        } catch (_) {}
        stage('wasm_policy', policy);
        const startedAt = Date.now();
        stage('adapter_instance_start', { dtype, device });
        instancePromise = Promise.resolve()
          .then(() => KokoroTTS.from_pretrained(modelId, { dtype, device }))
          .then((value) => {
            instrumentInstance(value);
            stage('adapter_instance_ready', { elapsedMs: Date.now() - startedAt });
            return value;
          })
          .catch((error) => {
            instancePromise = null;
            stage('adapter_instance_error', { elapsedMs: Date.now() - startedAt, errorKind: errorKind(error) });
            throw error;
          });
      }
      return instancePromise;
    }

    async function generate(text, generationOptions) {
      const opts = generationOptions || {};
      const voice = String(opts.voice || '');
      const speed = typeof opts.speed === 'number' ? opts.speed : 1;
      const startedAt = Date.now();
      stage('adapter_generate_enter', { voice });
      const tts = await getInstance();
      stage('adapter_generate_invoke', { voice, elapsedMs: Date.now() - startedAt });
      try {
        const generated = Promise.resolve(tts.generate(text, { voice: opts.voice, speed }));
        stage('adapter_generate_dispatched', { voice, elapsedMs: Date.now() - startedAt });
        const value = await generated;
        const samples = value && (value.audio || value.data);
        stage('adapter_generate_resolved', {
          voice,
          elapsedMs: Date.now() - startedAt,
          samples: samples && typeof samples.length === 'number' ? samples.length : null
        });
        return value;
      } catch (error) {
        stage('adapter_generate_error', { voice, elapsedMs: Date.now() - startedAt, errorKind: errorKind(error) });
        throw error;
      }
    }

    async function listVoices() {
      const tts = await getInstance();
      if (tts.voices && typeof tts.voices === 'object') return Object.keys(tts.voices);
      if (typeof tts.list_voices === 'function') return tts.list_voices() || [];
      return [];
    }

    return Object.freeze({
      kind: 'kokoro-local', modelId, localModelPath, voiceBaseUrl, wasmBasePath, dtype, device,
      initialize: getInstance, generate, listVoices
    });
  }

  return Object.freeze({ createKokoroAdapter, assertLocalPath, normalizeWasmPath });
});