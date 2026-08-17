'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const adapterApi = require('./features/neural-voice/fiezel-kokoro-adapter.js');

function makeEnv() {
  return {
    allowRemoteModels: true,
    allowLocalModels: false,
    localModelPath: '',
    wasmPaths: '',
    backends: { onnx: { wasm: { numThreads: 0, proxy: false } } }
  };
}

function makeTts() {
  const tts = {
    tokenizer() { return { input_ids: { dims: [1, 8] } }; },
    async model() { return {}; },
    async generate() { return { audio: new Float32Array(16) }; },
    voices: { af_heart: {} }
  };
  return tts;
}

async function preferredWebGpuContract() {
  const attempts = [];
  const stages = [];
  const env = makeEnv();
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
    backendCandidates: [
      { id: 'apple-webgpu-q8', device: 'webgpu', dtype: 'q8' },
      { id: 'wasm-q8-fallback', device: 'wasm', dtype: 'q8' }
    ],
    onStage(entry) { stages.push(entry); }
  });

  await adapter.initialize();
  assert.deepStrictEqual(attempts.map(x => [x.device, x.dtype]), [['webgpu', 'q8']], 'WebGPU must be the first and only initialized backend when it succeeds');
  assert.strictEqual(adapter.getBackendState().id, 'apple-webgpu-q8');
  assert.strictEqual(adapter.getBackendState().device, 'webgpu');
  assert.strictEqual(env.allowRemoteModels, false, 'accelerator must preserve local/offline model routing');
  assert.strictEqual(env.allowLocalModels, true);
  assert.ok(stages.some(x => x.phase === 'adapter_backend_attempt' && x.device === 'webgpu'));
  assert.ok(stages.some(x => x.phase === 'adapter_backend_ready' && x.device === 'webgpu'));
}

async function fallbackContract() {
  const attempts = [];
  const stages = [];
  const env = makeEnv();
  const KokoroTTS = {
    async from_pretrained(modelId, options) {
      attempts.push({ modelId, ...options });
      if (options.device === 'webgpu') throw Object.assign(new Error('webgpu unavailable'), { code: 'webgpu_unavailable' });
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
    backendCandidates: [
      { id: 'apple-webgpu-q8', device: 'webgpu', dtype: 'q8' },
      { id: 'wasm-q8-fallback', device: 'wasm', dtype: 'q8' }
    ],
    onStage(entry) { stages.push(entry); }
  });

  await adapter.initialize();
  assert.deepStrictEqual(attempts.map(x => [x.device, x.dtype]), [['webgpu', 'q8'], ['wasm', 'q8']], 'a WebGPU initialization failure must fall back exactly once to the existing q8/WASM backend');
  assert.strictEqual(adapter.getBackendState().id, 'wasm-q8-fallback');
  assert.strictEqual(adapter.getBackendState().device, 'wasm');
  assert.ok(stages.some(x => x.phase === 'adapter_backend_error' && x.device === 'webgpu'));
  assert.ok(stages.some(x => x.phase === 'adapter_backend_fallback' && x.fromDevice === 'webgpu' && x.toDevice === 'wasm'));
}

function bootstrapContract() {
  const source = fs.readFileSync(path.join(__dirname, 'features/neural-voice/fiezel-neural-voice-bootstrap.js'), 'utf8');
  assert.match(source, /navigator\?\.gpu|navigator\.gpu/, 'bootstrap must probe WebGPU capability rather than hard-code WASM for Apple standalone');
  assert.match(source, /apple-webgpu-q8/, 'bootstrap must identify the preferred Apple WebGPU candidate');
  assert.match(source, /wasm-q8-fallback/, 'bootstrap must retain the current q8/WASM backend as a named fallback');
  assert.match(source, /backendCandidates/, 'bootstrap must pass an ordered backend candidate list to the adapter');
  assert.doesNotMatch(source, /crossOriginIsolated\s*===\s*true[^\n]{0,120}webgpu/i, 'WebGPU selection must not require cross-origin isolation');
}

(async () => {
  await preferredWebGpuContract();
  await fallbackContract();
  bootstrapContract();
  console.log('neural-voice m025-18 WebGPU acceleration regression: PASS');
})().catch(error => {
  console.error(error && error.stack || error);
  process.exit(1);
});
