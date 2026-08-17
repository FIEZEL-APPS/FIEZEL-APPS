'use strict';

const assert = require('assert');
const adapterApi = require('./features/neural-voice/fiezel-kokoro-adapter.js');

function makeRealPinnedFacade() {
  return {
    allowRemoteModels: true,
    allowLocalModels: false,
    localModelPath: '',
    wasmPaths: ''
  };
}

function makeTts() {
  return {
    tokenizer() { return { input_ids: { dims: [1, 8] } }; },
    async model() { return {}; },
    async generate() { return { audio: new Float32Array(16) }; },
    voices: { af_heart: {} }
  };
}

(async () => {
  const attempts = [];
  const stages = [];
  const env = makeRealPinnedFacade();
  const runtime = {
    navigator: { standalone: true, gpu: {} },
    matchMedia() { return { matches: true }; },
    crossOriginIsolated: false
  };
  const KokoroTTS = {
    async from_pretrained(modelId, options) {
      attempts.push({ modelId, ...options });
      return makeTts();
    }
  };

  const adapter = adapterApi.createKokoroAdapter({
    KokoroTTS,
    kokoroEnv: env,
    setVoiceDataUrl() {},
    modelId: 'kokoro-model',
    localModelPath: './vendor/',
    voiceBaseUrl: './vendor/kokoro-model/voices',
    wasmBasePath: './vendor/kokoro-js/wasm/',
    runtimeOrigin: 'https://example.test',
    runtime,
    dtype: 'q8',
    device: 'wasm',
    onStage(entry) { stages.push(entry); }
  });

  await adapter.initialize();

  assert.deepStrictEqual(
    attempts.map(x => [x.device, x.dtype]),
    [['wasm', 'q8']],
    'm025-21 rollback must suppress Apple-standalone WebGPU-first routing even when navigator.gpu exists'
  );
  assert.ok(!stages.some(x => x.phase === 'adapter_backend_attempt' && x.device === 'webgpu'), 'rollback must not attempt WebGPU on Apple standalone');
  assert.ok(!stages.some(x => x.phase === 'adapter_backend_fallback' && x.fromDevice === 'webgpu'), 'rollback must not enter WebGPU fallback path');
  assert.strictEqual(env.allowRemoteModels, false, 'rollback must preserve local/offline routing');
  assert.strictEqual(env.allowLocalModels, true, 'rollback must preserve local model enablement');
  assert.strictEqual(env.localModelPath, './vendor/');
  assert.strictEqual(env.wasmPaths, './vendor/kokoro-js/wasm/');

  console.log('neural-voice m025-21 Apple WebGPU rollback regression: PASS');
})().catch(error => {
  console.error(error && error.stack || error);
  process.exit(1);
});
