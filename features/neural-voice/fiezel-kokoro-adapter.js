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

    async function getInstance() {
      if (!instancePromise) {
        kokoroEnv.allowRemoteModels = false;
        if ('allowLocalModels' in kokoroEnv) kokoroEnv.allowLocalModels = true;
        kokoroEnv.localModelPath = localModelPath;
        kokoroEnv.wasmPaths = wasmBasePath;
        setVoiceDataUrl(voiceBaseUrl);
        const startedAt = Date.now();
        stage('adapter_instance_start', { dtype, device });
        instancePromise = Promise.resolve()
          .then(() => KokoroTTS.from_pretrained(modelId, { dtype, device }))
          .then((value) => {
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