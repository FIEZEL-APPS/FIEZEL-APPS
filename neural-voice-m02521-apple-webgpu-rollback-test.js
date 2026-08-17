'use strict';

const assert = require('assert');
const fs = require('fs');
const adapterApi = require('./features/neural-voice/fiezel-kokoro-adapter.js');

function makeRealPinnedFacade() {
  return {
    allowRemoteModels: true,
    allowLocalModels: false,
    localModelPath: '',
    wasmPaths: ''
  };
}

function makeTts(generateCalls) {
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
  const attempts = [];
  const stages = [];
  const generateCalls = [];
  const env = makeRealPinnedFacade();
  const runtime = {
    navigator: { standalone: true, gpu: {} },
    matchMedia() { return { matches: true }; },
    crossOriginIsolated: false
  };
  const KokoroTTS = {
    async from_pretrained(modelId, options) {
      attempts.push({ modelId, ...options });
      return makeTts(generateCalls);
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
  await adapter.generate('rollback audio fidelity check', { voice: 'af_heart' });

  assert.deepStrictEqual(
    attempts.map(x => [x.device, x.dtype]),
    [['wasm', 'q8']],
    'm025-21 rollback must suppress Apple-standalone WebGPU-first routing even when navigator.gpu exists'
  );
  assert.strictEqual(attempts.length, 1, 'rollback must initialize exactly one configured backend');
  assert.ok(!stages.some(x => x.phase === 'adapter_backend_attempt' && x.device === 'webgpu'), 'rollback must not attempt WebGPU on Apple standalone');
  assert.ok(!stages.some(x => x.phase === 'adapter_backend_fallback' && x.fromDevice === 'webgpu'), 'rollback must not enter WebGPU fallback path');
  assert.ok(stages.some(x => x.phase === 'adapter_backend_ready' && x.device === 'wasm' && x.dtype === 'q8'), 'rollback diagnostics must truthfully report WASM/q8 ready');
  assert.deepStrictEqual(adapter.getBackendState(), { id: 'configured-wasm-q8', device: 'wasm', dtype: 'q8' }, 'rollback backend state must remain truthful');

  assert.strictEqual(generateCalls.length, 1, 'fidelity probe must generate exactly once');
  assert.strictEqual(generateCalls[0].text, 'rollback audio fidelity check');
  assert.deepStrictEqual(generateCalls[0].options, { voice: 'af_heart', speed: 1 }, 'rollback must preserve requested voice and the normal default speed=1');

  assert.strictEqual(env.allowRemoteModels, false, 'rollback must preserve local/offline routing');
  assert.strictEqual(env.allowLocalModels, true, 'rollback must preserve local model enablement');
  assert.strictEqual(env.localModelPath, './vendor/');
  assert.strictEqual(env.wasmPaths, './vendor/kokoro-js/wasm/');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(env, 'backends'), false, 'rollback test must keep the real pinned facade shape without fabricated env.backends');

  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.ok(!/\bskipWaiting\s*\(/.test(sw), 'rollback release must not force eager service-worker takeover of a live PWA');
  assert.ok(sw.includes("'same-origin-allow-popups'"), 'rollback must preserve WebKit popup-compatible navigation policy');
  assert.ok(sw.includes("const COEP_POLICY='credentialless'"), 'rollback must preserve credentialless COEP policy');

  const diag = fs.readFileSync('features/neural-voice/fiezel-diag-panel.js', 'utf8');
  assert.ok(diag.includes("String(location.origin || '') + String(location.pathname || '')"), 'rollback must preserve Diagnostics URL privacy redaction');
  assert.ok(!/href:\s*safe\(function\(\)\{\s*return\s+location\.href/.test(diag), 'rollback must not restore raw location.href export');

  console.log('neural-voice m025-21 Apple WebGPU rollback + fidelity/lifecycle regression: PASS');
})().catch(error => {
  console.error(error && error.stack || error);
  process.exit(1);
});
