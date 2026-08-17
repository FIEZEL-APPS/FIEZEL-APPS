'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const adapterApi = require('./features/neural-voice/fiezel-kokoro-adapter.js');

const EXPECTED_VENDOR_SHA = '91d849dc97a2e43edab1e576721792211bc240da4d086591d42b5356959dc32f';
const EXPECTED_VENDOR_SIZE = 2136728;
const EXPECTED_PATCH_SHA = 'a8a8163ecde6216685a09a52861e373d33b8be67031d675be31f9c50390f3444';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

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
  const vendorBytes = fs.readFileSync('vendor/kokoro-js/kokoro.web.js');
  assert.strictEqual(vendorBytes.length, EXPECTED_VENDOR_SIZE, 'committed m025-22 vendor size must equal the deterministic clean-room candidate');
  assert.strictEqual(sha256(vendorBytes), EXPECTED_VENDOR_SHA, 'committed m025-22 vendor SHA must equal the deterministic clean-room candidate');

  // The pinned web bundle can be parsed/imported by Node, but its browser-specific
  // Transformers backend handler is not initialized there. Inspect the accessor
  // descriptor without invoking the getter; browser readback is covered by the
  // m025-22 candidate workflow in real Chromium.
  const vendorUrl = pathToFileURL(path.resolve('vendor/kokoro-js/kokoro.web.js')).href + '?m02522-accessor-descriptor';
  const vendor = await import(vendorUrl);
  assert.ok(vendor.env && typeof vendor.env === 'object', 'pinned Kokoro bundle must export env facade');
  const wasmDescriptor = Object.getOwnPropertyDescriptor(vendor.env, 'wasmEnv');
  assert.ok(wasmDescriptor && typeof wasmDescriptor.get === 'function', 'm025-22 committed bundle must expose the source-derived wasmEnv getter');

  const patchBytes = fs.readFileSync('vendor/kokoro-js/source-overrides/fiezel-integration.patch');
  const patch = patchBytes.toString('utf8');
  assert.strictEqual(sha256(patchBytes), EXPECTED_PATCH_SHA, 'source-lock patch bytes must remain exact');
  assert.ok(patch.includes('get wasmEnv()'), 'source-locked integration patch must define the wasmEnv accessor rather than hand-editing minified runtime bytes');
  assert.ok(patch.includes('hf.backends.onnx.wasm'), 'wasmEnv accessor must point at the real Transformers ONNX WASM environment');

  const bootstrap = fs.readFileSync('features/neural-voice/fiezel-neural-voice-bootstrap.js', 'utf8');
  assert.ok(bootstrap.includes("kokoro.env?.wasmEnv"), 'bootstrap must consume the real top-level wasmEnv accessor');
  assert.ok(!bootstrap.includes("kokoro.env?.backends?.onnx?.wasm"), 'bootstrap must not return to the structurally absent Kokoro facade path');
  assert.ok(bootstrap.includes("wasmEnv.proxy=true"), 'Apple standalone bootstrap must enable ORT proxy before Kokoro session creation');
  assert.ok(bootstrap.includes("wasmEnv.numThreads=1"), 'Apple standalone bootstrap must keep single-thread WASM before Kokoro session creation');
  assert.ok(bootstrap.includes("kokoro.web.js?nv=m025-22"), 'm025-22 must use a fresh vendor URL so the stable neural cache cannot serve the old m025-5 bundle');
  // m025-26: the Kokoro proxy policy above is retained for the non-sherpa path, but the
  // download manifest now carries the active sherpa engine, so the Kokoro bundle is no
  // longer a declared asset. Pin the active engine payload instead.
  assert.ok(bootstrap.includes("{path:'vendor/sherpa-vits/sherpa-onnx-wasm-main-tts.data',bytes:96522474}"), 'bootstrap asset contract must match exact sherpa engine payload bytes');
  assert.ok(bootstrap.includes("throw new Error('Apple neural WASM proxy policy did not apply')"), 'Apple standalone must fail closed when proxy readback is false');
  assert.ok(bootstrap.includes("readBack:true"), 'bootstrap diagnostics must record real proxy readback');

  // Model the browser-visible top-level wasmEnv object. numThreads is deliberately
  // absent initially because the actual ORT object permits dynamic assignment.
  const wasmEnv = { proxy: false };
  const kokoroEnv = {
    allowRemoteModels: true,
    allowLocalModels: false,
    localModelPath: '',
    wasmPaths: '',
    wasmEnv
  };
  const attempts = [];
  const stages = [];
  const generateCalls = [];
  const adapter = adapterApi.createKokoroAdapter({
    KokoroTTS: {
      async from_pretrained(modelId, options) {
        attempts.push({
          modelId,
          ...options,
          proxyAtSessionCreation: wasmEnv.proxy,
          threadsAtSessionCreation: wasmEnv.numThreads
        });
        return fakeTts(generateCalls);
      }
    },
    kokoroEnv,
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
  assert.strictEqual(wasmEnv.proxy, true, 'real WASM env model must read back proxy=true');
  assert.strictEqual(wasmEnv.numThreads, 1, 'real WASM env model must read back dynamically assigned numThreads=1');
  assert.ok(stages.some(x => x.phase === 'wasm_policy' && x.proxy === true && x.numThreads === 1 && x.readBack === true), 'diagnostics must report real proxy readback, not a computed fiction');
  assert.ok(stages.some(x => x.phase === 'adapter_backend_ready' && x.device === 'wasm' && x.dtype === 'q8'), 'backend telemetry must remain truthful');
  assert.ok(!stages.some(x => x.phase === 'adapter_backend_attempt' && x.device === 'webgpu'), 'm025-22 must never auto-attempt WebGPU');

  assert.strictEqual(generateCalls.length, 1, 'fidelity check must generate exactly once');
  assert.deepStrictEqual(generateCalls[0].options, { voice: 'af_heart', speed: 1 }, 'requested voice and normal default speed=1 must be preserved');
  assert.strictEqual(kokoroEnv.allowRemoteModels, false, 'remote model routing must remain disabled');
  assert.strictEqual(kokoroEnv.allowLocalModels, true, 'local model routing must remain enabled');

  console.log('neural-voice m025-22 real WASM proxy regression: PASS');
})().catch(error => {
  console.error(error && error.stack || error);
  process.exit(1);
});
