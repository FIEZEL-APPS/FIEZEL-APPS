'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const adapterApi = require('./features/neural-voice/fiezel-kokoro-adapter.js');

const STANDARD_MJS = 'vendor/kokoro-js/wasm/ort-wasm-simd-threaded.mjs';
const STANDARD_WASM = 'vendor/kokoro-js/wasm/ort-wasm-simd-threaded.wasm';
const EXPECTED_MJS_SHA = '43c25054b6b9ac000f786c65545ff83a45f871e0e310e8c2f4d48a363bb66db4';
const EXPECTED_WASM_SHA = 'f061472c6e77d6d50d079aacdc0ff9b63fee287ddd2cbf46cf62438d3891de2b';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function fakeTts(generateCalls) {
  return {
    tokenizer() { return { input_ids: { dims: [1, 8] } }; },
    async model() { return {}; },
    async generate(text, options) {
      generateCalls.push({ text, options: { ...options } });
      return { audio: new Float32Array(24) };
    },
    voices: { af_heart: {} }
  };
}

function makeEnv() {
  return {
    allowRemoteModels: true,
    allowLocalModels: false,
    localModelPath: '',
    wasmPaths: '',
    wasmEnv: { proxy: false }
  };
}

(async () => {
  assert.strictEqual(sha256(fs.readFileSync(STANDARD_MJS)), EXPECTED_MJS_SHA, 'standard non-JSEP mjs must be exact source-locked ORT bytes');
  assert.strictEqual(sha256(fs.readFileSync(STANDARD_WASM)), EXPECTED_WASM_SHA, 'standard non-JSEP wasm must be exact source-locked ORT bytes');

  const appleEnv = makeEnv();
  const appleAttempts = [];
  const stages = [];
  const generateCalls = [];
  const adapter = adapterApi.createKokoroAdapter({
    KokoroTTS: {
      async from_pretrained(modelId, options) {
        appleAttempts.push({
          modelId,
          options: { ...options },
          wasmPaths: typeof appleEnv.wasmPaths === 'object' ? { ...appleEnv.wasmPaths } : appleEnv.wasmPaths,
          proxy: appleEnv.wasmEnv.proxy,
          numThreads: appleEnv.wasmEnv.numThreads
        });
        return fakeTts(generateCalls);
      }
    },
    kokoroEnv: appleEnv,
    setVoiceDataUrl() {},
    modelId: 'kokoro-model',
    localModelPath: './vendor/',
    voiceBaseUrl: './vendor/kokoro-model/voices',
    wasmBasePath: 'https://example.test/FIEZEL-APPS/vendor/kokoro-js/wasm/',
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
  await adapter.generate('normal speed', { voice: 'af_heart' });
  await adapter.generate('explicit speed', { voice: 'af_heart', speed: 0.92 });

  assert.strictEqual(appleAttempts.length, 1, 'model/session must initialize only once');
  assert.deepStrictEqual(appleAttempts[0].options, { dtype: 'q8', device: 'wasm' }, 'candidate must retain q8/WASM backend');
  assert.deepStrictEqual(appleAttempts[0].wasmPaths, {
    mjs: 'https://example.test/FIEZEL-APPS/vendor/kokoro-js/wasm/ort-wasm-simd-threaded.mjs',
    wasm: 'https://example.test/FIEZEL-APPS/vendor/kokoro-js/wasm/ort-wasm-simd-threaded.wasm'
  }, 'Apple standalone must select the standard non-JSEP pair explicitly before session creation');
  assert.ok(!appleAttempts[0].wasmPaths.mjs.includes('.jsep.'), 'Apple mjs must not select JSEP');
  assert.ok(!appleAttempts[0].wasmPaths.wasm.includes('.jsep.'), 'Apple wasm must not select JSEP');
  assert.strictEqual(appleAttempts[0].proxy, true, 'm025-24 proxy-worker safety must remain enabled');
  assert.strictEqual(appleAttempts[0].numThreads, 1, 'non-isolated Apple standalone must remain single-thread');
  assert.ok(stages.some(x => x.phase === 'wasm_artifact_variant' && x.variant === 'standard-non-jsep'), 'diagnostics must expose the selected WASM artifact variant');
  assert.ok(stages.some(x => x.phase === 'wasm_policy' && x.proxy === true && x.numThreads === 1), 'proxy policy telemetry must remain intact');
  assert.ok(!stages.some(x => x.phase === 'adapter_backend_attempt' && x.device === 'webgpu'), 'm025-25 must not auto-promote WebGPU');
  assert.deepStrictEqual(generateCalls[0].options, { voice: 'af_heart', speed: 1 }, 'default voice speed must remain 1');
  assert.deepStrictEqual(generateCalls[1].options, { voice: 'af_heart', speed: 0.92 }, 'explicit speed must propagate unchanged');
  assert.strictEqual(appleEnv.allowRemoteModels, false, 'remote model routing must remain disabled');
  assert.strictEqual(appleEnv.allowLocalModels, true, 'local model routing must remain enabled');

  const browserEnv = makeEnv();
  const browserAttempts = [];
  const browserAdapter = adapterApi.createKokoroAdapter({
    KokoroTTS: {
      async from_pretrained(modelId, options) {
        browserAttempts.push({ modelId, options: { ...options }, wasmPaths: browserEnv.wasmPaths });
        return fakeTts([]);
      }
    },
    kokoroEnv: browserEnv,
    setVoiceDataUrl() {},
    modelId: 'kokoro-model',
    localModelPath: './vendor/',
    voiceBaseUrl: './vendor/kokoro-model/voices',
    wasmBasePath: './vendor/kokoro-js/wasm/',
    runtimeOrigin: 'https://example.test',
    runtime: { navigator: { standalone: false }, crossOriginIsolated: false },
    dtype: 'q8',
    device: 'wasm'
  });
  await browserAdapter.initialize();
  assert.strictEqual(browserAttempts[0].wasmPaths, './vendor/kokoro-js/wasm/', 'non-Apple/control route must retain the previous runtime-default WASM prefix');

  const bootstrap = fs.readFileSync('features/neural-voice/fiezel-neural-voice-bootstrap.js', 'utf8');
  assert.ok(bootstrap.includes("{path:'vendor/kokoro-js/wasm/ort-wasm-simd-threaded.mjs',bytes:20856}"), 'offline asset set must include standard non-JSEP mjs');
  assert.ok(bootstrap.includes("{path:'vendor/kokoro-js/wasm/ort-wasm-simd-threaded.wasm',bytes:11133407}"), 'offline asset set must include standard non-JSEP wasm');

  const diagPanel = fs.readFileSync('features/neural-voice/fiezel-diag-panel.js', 'utf8');
  assert.ok(diagPanel.includes("DIAG_BUILD = 'm025-25'"), 'm025-25 must carry a fresh diagnostic build marker');
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.ok(sw.includes("SW_REV='m025-25-"), 'm025-25 must carry a matching fresh service-worker revision');

  const sourceLock = JSON.parse(fs.readFileSync('NEURAL-VOICE-SOURCE-LOCK.json', 'utf8'));
  assert.strictEqual(sourceLock.runtime.standardWasmModule.sha256, EXPECTED_MJS_SHA, 'source lock must preserve exact non-JSEP mjs provenance');
  assert.strictEqual(sourceLock.runtime.standardWasmBinary.sha256, EXPECTED_WASM_SHA, 'source lock must preserve exact non-JSEP wasm provenance');

  console.log('neural-voice m025-25 Safari non-JSEP routing regression: PASS');
})().catch(error => {
  console.error(error && error.stack || error);
  process.exit(1);
});