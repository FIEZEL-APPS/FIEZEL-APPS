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

  function createKokoroAdapter(options) {
    options = options || {};
    const KokoroTTS = options.KokoroTTS;
    const kokoroEnv = options.kokoroEnv;
    const setVoiceDataUrl = options.setVoiceDataUrl;
    if (!KokoroTTS || typeof KokoroTTS.from_pretrained !== 'function') throw new Error('KokoroTTS implementation is required');
    if (!kokoroEnv || typeof kokoroEnv !== 'object') throw new Error('Patched kokoro env export is required');
    if (typeof setVoiceDataUrl !== 'function') throw new Error('setVoiceDataUrl export is required');
    if (!('allowRemoteModels' in kokoroEnv) || !('localModelPath' in kokoroEnv)) throw new Error('Patched local model routing controls are required');
    if (!('wasmPaths' in kokoroEnv)) throw new Error('Local WASM routing control is required');

    const modelId = assertLocalPath(options.modelId || 'kokoro-model', 'modelId');
    const localModelPath = assertLocalPath(options.localModelPath || './vendor/', 'localModelPath');
    const voiceBaseUrl = assertLocalPath(options.voiceBaseUrl || './vendor/kokoro-model/voices', 'voiceBaseUrl');
    const wasmBasePath = assertLocalPath(options.wasmBasePath || './vendor/kokoro-js/wasm/', 'wasmBasePath');
    const dtype = String(options.dtype || 'q8');
    const device = String(options.device || 'wasm');
    let instancePromise = null;

    async function getInstance() {
      if (!instancePromise) {
        kokoroEnv.allowRemoteModels = false;
        if ('allowLocalModels' in kokoroEnv) kokoroEnv.allowLocalModels = true;
        kokoroEnv.localModelPath = localModelPath;
        kokoroEnv.wasmPaths = wasmBasePath;
        setVoiceDataUrl(voiceBaseUrl);
        instancePromise = Promise.resolve(KokoroTTS.from_pretrained(modelId, { dtype, device })).catch((error) => {
          instancePromise = null;
          throw error;
        });
      }
      return instancePromise;
    }

    async function generate(text, generationOptions) {
      const tts = await getInstance();
      const opts = generationOptions || {};
      return tts.generate(text, { voice: opts.voice, speed: typeof opts.speed === 'number' ? opts.speed : 1 });
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

  return Object.freeze({ createKokoroAdapter, assertLocalPath });
});
