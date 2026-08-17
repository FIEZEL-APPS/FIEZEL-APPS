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
    const runtime = options.runtime && typeof options.runtime === 'object'
      ? options.runtime
      : (typeof globalThis !== 'undefined' ? globalThis : {});
    let instancePromise = null;
    let backendState = Object.freeze({ id: 'uninitialized', device: '', dtype: '' });

    function stage(phase, detail) {
      if (!onStage) return;
      try { onStage(Object.freeze({ phase, ...(detail || {}) })); } catch (_) {}
    }

    function errorKind(error) {
      return String(error && (error.code || error.name) || 'error').slice(0, 80);
    }

    function runtimePolicyContext() {
      const standalone = runtime.navigator?.standalone === true || !!runtime.matchMedia?.('(display-mode: standalone)')?.matches;
      return {
        appleStandalone: standalone,
        isolated: runtime.crossOriginIsolated === true,
        webgpuAvailable: !!runtime.navigator?.gpu,
        wasm: kokoroEnv?.wasmEnv || null
      };
    }

    function effectiveWasmPolicy(candidateDevice) {
      const { appleStandalone, isolated, wasm } = runtimePolicyContext();
      const numThreads = Number.isFinite(Number(wasm?.numThreads)) ? Number(wasm.numThreads) : (isolated ? null : 1);
      const proxy = wasm?.proxy === true;
      if (appleStandalone && !isolated && candidateDevice === 'wasm') {
        return Object.freeze({
          policy: proxy ? 'apple-standalone-single-thread-proxy-worker' : 'apple-standalone-single-thread-direct-default',
          numThreads,
          proxy,
          source: 'onnxruntime-web-1.22-runtime-default',
          readBack: !!wasm,
          supersedes: 'apple-standalone-single-thread-direct-default'
        });
      }
      return Object.freeze({
        policy: isolated ? 'onnxruntime-default-isolated' : 'onnxruntime-default-single-thread',
        numThreads,
        proxy,
        source: 'onnxruntime-web-1.22-runtime-default',
        readBack: !!wasm
      });
    }

    function applyAppleStandaloneWorkerPolicy(candidateDevice) {
      const { appleStandalone, isolated, wasm } = runtimePolicyContext();
      if (!wasm || candidateDevice !== 'wasm' || !appleStandalone || isolated) return effectiveWasmPolicy(candidateDevice);
      // m025-22: wasmEnv is the source-derived Transformers/ORT WASM environment,
      // not a fabricated facade shape. Apply the single-thread proxy policy before
      // Kokoro creates the ONNX session, then report the values read back from it.
      wasm.numThreads = 1;
      wasm.proxy = true;
      return effectiveWasmPolicy(candidateDevice);
    }

    function backendCandidates() {
      const capability = runtimePolicyContext();
      const autoWebGpuSuppressed = device === 'wasm' && capability.appleStandalone && capability.webgpuAvailable;
      stage('adapter_backend_capability', {
        appleStandalone: capability.appleStandalone,
        webgpuAvailable: capability.webgpuAvailable,
        isolated: capability.isolated,
        configuredDevice: device,
        dtype,
        autoWebGpuSuppressed,
        stabilizationBuild: 'm025-22'
      });
      // m025-21+ stabilization: never auto-promote a configured WASM backend to
      // WebGPU merely because navigator.gpu exists. Explicit device configuration
      // remains respected; m025-22 only repairs the real WASM proxy binding.
      return [Object.freeze({ id: `configured-${device}-${dtype}`, device, dtype })];
    }

    function backendDetail(extra) {
      return {
        backendId: backendState.id,
        backendDevice: backendState.device,
        backendDtype: backendState.dtype,
        ...(extra || {})
      };
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
            stage('adapter_tokenizer_enter', backendDetail());
            try {
              const value = Reflect.apply(target, thisArg, args);
              stage('adapter_tokenizer_resolved', backendDetail({ elapsedMs: Date.now() - startedAt, tokenCount: tokenCount(value) }));
              return value;
            } catch (error) {
              stage('adapter_tokenizer_error', backendDetail({ elapsedMs: Date.now() - startedAt, errorKind: errorKind(error) }));
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
            stage('adapter_model_enter', backendDetail());
            let result;
            try {
              result = Reflect.apply(target, thisArg, args);
              stage('adapter_model_dispatched', backendDetail({ elapsedMs: Date.now() - startedAt }));
            } catch (error) {
              stage('adapter_model_error', backendDetail({ elapsedMs: Date.now() - startedAt, errorKind: errorKind(error) }));
              throw error;
            }
            return Promise.resolve(result).then((value) => {
              stage('adapter_model_resolved', backendDetail({ elapsedMs: Date.now() - startedAt }));
              return value;
            }, (error) => {
              stage('adapter_model_error', backendDetail({ elapsedMs: Date.now() - startedAt, errorKind: errorKind(error) }));
              throw error;
            });
          }
        });
        model = true;
      }

      try { Object.defineProperty(tts, '__fiezelStageProbeV1', { value: true, configurable: false }); } catch (_) {}
      stage('adapter_stage_probe_ready', backendDetail({ tokenizer, model }));
      return tts;
    }

    async function initializeCandidate(candidate, startedAt) {
      if (candidate.device === 'wasm') {
        const policy = applyAppleStandaloneWorkerPolicy(candidate.device);
        try {
          if (typeof globalThis !== 'undefined') globalThis.__fiezelNeuralWasmPolicy = policy.policy;
        } catch (_) {}
        stage('wasm_policy', policy);
      }
      stage('adapter_backend_attempt', {
        id: candidate.id,
        device: candidate.device,
        dtype: candidate.dtype
      });
      try {
        const value = await KokoroTTS.from_pretrained(modelId, { dtype: candidate.dtype, device: candidate.device });
        backendState = Object.freeze({ id: candidate.id, device: candidate.device, dtype: candidate.dtype });
        instrumentInstance(value);
        stage('adapter_backend_ready', {
          id: candidate.id,
          device: candidate.device,
          dtype: candidate.dtype,
          elapsedMs: Date.now() - startedAt
        });
        return value;
      } catch (error) {
        stage('adapter_backend_error', {
          id: candidate.id,
          device: candidate.device,
          dtype: candidate.dtype,
          elapsedMs: Date.now() - startedAt,
          errorKind: errorKind(error)
        });
        throw error;
      }
    }

    async function initializeBackends() {
      kokoroEnv.allowRemoteModels = false;
      if ('allowLocalModels' in kokoroEnv) kokoroEnv.allowLocalModels = true;
      kokoroEnv.localModelPath = localModelPath;
      kokoroEnv.wasmPaths = wasmBasePath;
      setVoiceDataUrl(voiceBaseUrl);

      const candidates = backendCandidates();
      const startedAt = Date.now();
      stage('adapter_instance_start', { dtype, device, candidateCount: candidates.length });
      let lastError = null;
      for (let index = 0; index < candidates.length; index++) {
        const candidate = candidates[index];
        try {
          const value = await initializeCandidate(candidate, startedAt);
          stage('adapter_instance_ready', backendDetail({ elapsedMs: Date.now() - startedAt }));
          return value;
        } catch (error) {
          lastError = error;
          const next = candidates[index + 1];
          if (next) {
            stage('adapter_backend_fallback', {
              fromId: candidate.id,
              fromDevice: candidate.device,
              toId: next.id,
              toDevice: next.device,
              dtype: next.dtype,
              errorKind: errorKind(error)
            });
          }
        }
      }
      throw lastError || new Error('Neural backend initialization failed');
    }

    async function getInstance() {
      if (!instancePromise) {
        instancePromise = initializeBackends().catch((error) => {
          instancePromise = null;
          backendState = Object.freeze({ id: 'uninitialized', device: '', dtype: '' });
          stage('adapter_instance_error', { errorKind: errorKind(error) });
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
      stage('adapter_generate_enter', backendDetail({ voice }));
      const tts = await getInstance();
      stage('adapter_generate_invoke', backendDetail({ voice, elapsedMs: Date.now() - startedAt }));
      try {
        const generated = Promise.resolve(tts.generate(text, { voice: opts.voice, speed }));
        stage('adapter_generate_dispatched', backendDetail({ voice, elapsedMs: Date.now() - startedAt }));
        const value = await generated;
        const samples = value && (value.audio || value.data);
        stage('adapter_generate_resolved', backendDetail({
          voice,
          elapsedMs: Date.now() - startedAt,
          samples: samples && typeof samples.length === 'number' ? samples.length : null
        }));
        return value;
      } catch (error) {
        stage('adapter_generate_error', backendDetail({ voice, elapsedMs: Date.now() - startedAt, errorKind: errorKind(error) }));
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
      initialize: getInstance, generate, listVoices,
      getBackendState: () => backendState
    });
  }

  return Object.freeze({ createKokoroAdapter, assertLocalPath, normalizeWasmPath });
});
