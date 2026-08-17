'use strict';

const assert = require('assert');
const adapterApi = require('./features/neural-voice/fiezel-kokoro-adapter.js');

function makeRealFacadeShape() {
  // Deliberately mirrors the pinned FIEZEL Kokoro facade: routing controls are
  // top-level and there is NO fabricated env.backends.onnx.wasm object.
  return {
    allowRemoteModels: true,
    allowLocalModels: false,
    localModelPath: '',
    cacheDir: '',
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

function appleRuntime(webgpu) {
  return {
    navigator: { standalone: true, ...(webgpu ? { gpu: {} } : {}) },
    matchMedia() { return { matches: true }; },
    crossOriginIsolated: false
  };
}

function browserRuntime(webgpu) {
  return {
    navigator: { standalone: false, ...(webgpu ? { gpu: {} } : {}) },
    matchMedia() { return { matches: false }; },
    crossOriginIsolated: false
  };
}

async function preferredWebGpuOnRealFacade() {
  const attempts = [];
  const stages = [];
  const env = makeRealFacadeShape();
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
    dtype: 'q8',
    device: 'wasm',
    runtime: appleRuntime(true),
    onStage(entry) { stages.push(entry); }
  });

  await adapter.initialize();
  assert.deepStrictEqual(attempts.map(x => [x.device, x.dtype]), [['webgpu', 'q8']], 'Apple standalone with navigator.gpu must prefer WebGPU using the existing pinned q8 model');
  assert.strictEqual(adapter.getBackendState().id, 'apple-webgpu-q8');
  assert.strictEqual(adapter.getBackendState().device, 'webgpu');
  assert.strictEqual(adapter.getBackendState().dtype, 'q8');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(env, 'backends'), false, 'test must exercise the real facade shape, not fabricate env.backends');
  assert.strictEqual(env.allowRemoteModels, false, 'accelerator must preserve local/offline model routing');
  assert.strictEqual(env.allowLocalModels, true);
  assert.strictEqual(env.localModelPath, './vendor/');
  assert.ok(stages.some(x => x.phase === 'adapter_backend_capability' && x.webgpuAvailable === true));
  assert.ok(stages.some(x => x.phase === 'adapter_backend_attempt' && x.device === 'webgpu'));
  assert.ok(stages.some(x => x.phase === 'adapter_backend_ready' && x.device === 'webgpu'));
}

async function exactlyOnceWasmFallback() {
  const attempts = [];
  const stages = [];
  const env = makeRealFacadeShape();
  const KokoroTTS = {
    async from_pretrained(modelId, options) {
      attempts.push({ modelId, ...options });
      if (options.device === 'webgpu') throw Object.assign(new Error('webgpu init rejected'), { code: 'webgpu_init_rejected' });
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
    dtype: 'q8',
    device: 'wasm',
    runtime: appleRuntime(true),
    onStage(entry) { stages.push(entry); }
  });

  await adapter.initialize();
  assert.deepStrictEqual(attempts.map(x => [x.device, x.dtype]), [['webgpu', 'q8'], ['wasm', 'q8']], 'WebGPU init failure must fall back exactly once to existing q8/WASM');
  assert.strictEqual(adapter.getBackendState().id, 'wasm-q8-fallback');
  assert.strictEqual(adapter.getBackendState().device, 'wasm');
  assert.ok(stages.some(x => x.phase === 'adapter_backend_error' && x.device === 'webgpu'));
  assert.ok(stages.some(x => x.phase === 'adapter_backend_fallback' && x.fromDevice === 'webgpu' && x.toDevice === 'wasm'));
  assert.ok(stages.some(x => x.phase === 'adapter_backend_ready' && x.device === 'wasm'));
}

async function capabilityBoundary() {
  for (const runtime of [appleRuntime(false), browserRuntime(true)]) {
    const attempts = [];
    const env = makeRealFacadeShape();
    const adapter = adapterApi.createKokoroAdapter({
      KokoroTTS: { async from_pretrained(modelId, options) { attempts.push({ modelId, ...options }); return makeTts(); } },
      kokoroEnv: env,
      setVoiceDataUrl() {},
      modelId: 'kokoro-model',
      localModelPath: './vendor/',
      voiceBaseUrl: './vendor/kokoro-model/voices',
      wasmBasePath: './vendor/kokoro-js/wasm/',
      runtimeOrigin: 'https://example.test',
      dtype: 'q8',
      device: 'wasm',
      runtime
    });
    await adapter.initialize();
    assert.deepStrictEqual(attempts.map(x => x.device), ['wasm'], 'WebGPU must not be selected without both Apple standalone and navigator.gpu capability');
  }
}

(async () => {
  await preferredWebGpuOnRealFacade();
  await exactlyOnceWasmFallback();
  await capabilityBoundary();
  console.log('neural-voice m025-20 real-facade WebGPU acceleration regression: PASS');
})().catch(error => {
  console.error(error && error.stack || error);
  process.exit(1);
});
