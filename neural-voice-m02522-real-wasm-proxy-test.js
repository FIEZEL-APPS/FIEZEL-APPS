'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const adapterApi = require('./features/neural-voice/fiezel-kokoro-adapter.js');

function fakeTts(generateCalls) {
  return {
    tokenizer() { return { input_ids: { dims: [1, 8] } }; },
    async model() { return {}; },
    async generate(text, options) {
      generateCalls.push({ text, options: { ...options } });
      return { audio: new Float32Array(16) };
    },
    voices: { af_heart: {} }
  };
}

(async () => {
  const vendorUrl = pathToFileURL(path.resolve('vendor/kokoro-js/kokoro.web.js')).href + '?m02522-real-wasm-env';
  const vendor = await import(vendorUrl);

  assert.ok(vendor.env && typeof vendor.env === 'object', 'pinned Kokoro bundle must export env facade');
  assert.ok(vendor.env.wasmEnv && typeof vendor.env.wasmEnv === 'object', 'm025-22 bundle must expose the real Transformers/ORT WASM env through top-level env.wasmEnv');
  assert.ok('proxy' in vendor.env.wasmEnv, 'real WASM env must expose proxy control');
  assert.ok('numThreads' in vendor.env.wasmEnv, 'real WASM env must expose numThreads control');

  const patch = fs.readFileSync('vendor/kokoro-js/source-overrides/fiezel-integration.patch', 'utf8');
  assert.ok(patch.includes('get wasmEnv()'), 'source-locked integration patch must define the wasmEnv accessor rather than hand-editing minified runtime bytes');
  assert.ok(patch.includes('hf.backends.onnx.wasm'), 'wasmEnv accessor must point at the real Transformers ONNX WASM environment');

  const bootstrap = fs.readFileSync('features/neural-voice/fiezel-neural-voice-bootstrap.js', 'utf8');
  assert.ok(bootstrap.includes("kokoro.env?.wasmEnv"), 'bootstrap must consume the real top-level wasmEnv accessor');
  assert.ok(!bootstrap.includes("kokoro.env?.backends?.onnx?.wasm"), 'bootstrap must not return to the structurally absent env.backends facade path');
  assert.ok(bootstrap.includes("wasmEnv.proxy=true"), 'Apple standalone bootstrap must enable ORT proxy before Kokoro session creation');
  assert.ok(bootstrap.includes("kokoro.web.js?nv=m025-22"), 'm025-22 must use a fresh vendor URL so the stable neural cache cannot serve the old m025-5 bundle');

  vendor.env.wasmEnv.proxy = false;
  vendor.env.wasmEnv.numThreads = 4;

  const attempts = [];
  const stages = [];
  const generateCalls = [];
  const adapter = adapterApi.createKokoroAdapter({
    KokoroTTS: {
      async from_pretrained(modelId, options) {
        attempts.push({
          modelId,
          ...options,
          proxyAtSessionCreation: vendor.env.wasmEnv.proxy,
          threadsAtSessionCreation: vendor.env.wasmEnv.numThreads
        });
        return fakeTts(generateCalls);
      }
    },
    kokoroEnv: vendor.env,
    setVoiceDataUrl() {},
    modelId: 'kokoro-model',
    localModelPath: './vendor/',
    voiceBaseUrl: './vendor/kokoro-model/voices',
    wasmBasePath: './vendor/kokoro-js/wasm/',
    runtimeOrigin: 'https://example.test',
    runtime: {
      navigator: { standalone: true, gpu: {} },
      matchMedia() { return { matches: true }; },
      crossOriginIsolated: false
    },
    dtype: 'q8',
    device: 'wasm',
    onStage(entry) { stages.push(entry); }
  });

  await adapter.initialize();
  await adapter.generate('proxy fidelity check', { voice: 'af_heart' });

  assert.deepStrictEqual(attempts.map(x => [x.device, x.dtype]), [['wasm', 'q8']], 'm025-22 must retain the m025-21 no-WebGPU stabilization boundary');
  assert.strictEqual(attempts[0].proxyAtSessionCreation, true, 'real ORT proxy must be enabled before from_pretrained/session creation');
  assert.strictEqual(attempts[0].threadsAtSessionCreation, 1, 'Apple standalone proxy must remain single-thread WASM');
  assert.strictEqual(vendor.env.wasmEnv.proxy, true, 'real WASM env must read back proxy=true');
  assert.strictEqual(vendor.env.wasmEnv.numThreads, 1, 'real WASM env must read back numThreads=1');
  assert.ok(stages.some(x => x.phase === 'wasm_policy' && x.proxy === true && x.numThreads === 1 && x.readBack === true), 'diagnostics must report real proxy readback, not a computed fiction');
  assert.ok(stages.some(x => x.phase === 'adapter_backend_ready' && x.device === 'wasm' && x.dtype === 'q8'), 'backend telemetry must remain truthful');
  assert.ok(!stages.some(x => x.phase === 'adapter_backend_attempt' && x.device === 'webgpu'), 'm025-22 must never auto-attempt WebGPU');

  assert.strictEqual(generateCalls.length, 1, 'fidelity check must generate exactly once');
  assert.deepStrictEqual(generateCalls[0].options, { voice: 'af_heart', speed: 1 }, 'requested voice and normal default speed=1 must be preserved');

  console.log('neural-voice m025-22 real WASM proxy regression: PASS');
})().catch(error => {
  console.error(error && error.stack || error);
  process.exit(1);
});
