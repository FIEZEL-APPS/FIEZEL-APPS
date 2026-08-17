'use strict';
// m025-26 regression: sherpa VITS worker engine is the live neural engine.
//
// Pins the five properties OWNER required: neural actually runs (no browser-TTS
// substitution anywhere), one download only, no re-download on reload or release,
// no blackout/rollback path, and single-flight so playback cannot overlap.
const assert = require('assert');
const fs = require('fs');

const BOOTSTRAP = fs.readFileSync('features/neural-voice/fiezel-neural-voice-bootstrap.js', 'utf8');
const SW = fs.readFileSync('sw.js', 'utf8');
const CONFIG = fs.readFileSync('features/neural-voice/fiezel-neural-voice-config.js', 'utf8');
const INDEX = fs.readFileSync('index.html', 'utf8');
const ADAPTER_PATH = 'features/neural-voice/fiezel-sherpa-vits-adapter.js';

(async () => {
  // --- 1. neural runs; the m025-25 block is gone -------------------------------
  assert.ok(!/appleWasmInferenceBlocked/.test(BOOTSTRAP),
    'm025-25 Apple dispatch block must be fully removed, not merely bypassed');
  assert.ok(!/apple_wasm_inference_unviable/.test(BOOTSTRAP),
    'the block reason must not survive anywhere in the bootstrap');
  assert.match(BOOTSTRAP, /FiezelSherpaVitsAdapter\.createSherpaVitsAdapter/,
    'sherpa engine must be wired into initialization');
  assert.match(BOOTSTRAP, /engine:NEURAL_ENGINE_ID/,
    'runtime status must report engine identity truthfully');

  // The sherpa branch must be selected BEFORE any Kokoro/ORT work, otherwise the
  // dynamic import and proxy handshake that killed the process still run.
  const sherpaAt = BOOTSTRAP.indexOf('FiezelSherpaVitsAdapter.createSherpaVitsAdapter');
  const kokoroImportAt = BOOTSTRAP.indexOf("dynamicImport(absolute('vendor/kokoro-js");
  assert.ok(sherpaAt > -1 && kokoroImportAt > -1, 'both engine paths must be present');
  assert.ok(sherpaAt < kokoroImportAt,
    'sherpa must be selected before the Kokoro dynamic import runs');

  assert.match(INDEX, /fiezel-sherpa-vits-adapter\.js/, 'adapter must be loaded by the document');

  // --- 2. exactly one download, and it is the sherpa set ------------------------
  const assetBlock = BOOTSTRAP.slice(BOOTSTRAP.indexOf('const assets=Object.freeze(['),
                                     BOOTSTRAP.indexOf('const totalBytes='));
  assert.ok(!/kokoro/i.test(assetBlock),
    'no Kokoro asset may remain in the download manifest; it would be downloaded and never used');
  const declared = [...assetBlock.matchAll(/path:'([^']+)',bytes:(\d+)/g)]
    .map(m => ({ path: m[1], bytes: Number(m[2]) }));
  assert.strictEqual(declared.length, 5, 'sherpa runtime is exactly five files');

  // Declared byte counts must match the vendored files exactly, or the prepare layer
  // will report a size mismatch and re-download on every attempt.
  for (const item of declared) {
    const actual = fs.statSync(item.path).size;
    assert.strictEqual(actual, item.bytes,
      `${item.path} declared ${item.bytes} but is ${actual} on disk`);
  }

  // Every speaker lives inside the single .data payload, so changing voice must not
  // add a per-voice asset the way Kokoro's six .bin voice files did.
  assert.ok(!declared.some(a => /voices?\//.test(a.path)),
    'no per-voice asset may exist; switching voice must never trigger a download');

  // --- 3. no re-download on reload or on a new release --------------------------
  assert.match(SW, /vendor\/sherpa-vits\//,
    'service worker must classify the sherpa runtime as a neural asset');
  const neuralMatcher = SW.slice(SW.indexOf('const isNeuralAsset='), SW.indexOf('const shellScope='));
  assert.match(neuralMatcher, /sherpa-vits/,
    'isNeuralAsset must match sherpa so it is served from the stable cache');
  // The stable cache must stay bound to app version, never to SW_REV, or every release
  // wipes the 92MB model and forces a fresh download.
  assert.match(SW, /const CACHE=`fiezel-v\$\{self\.FIEZEL_VERSION\}`/,
    'stable neural cache must not be bound to SW_REV');
  assert.match(SW, /keys\.filter\(k=>k\.startsWith\('fiezel-shell-'\)/,
    'activate may only delete shell caches, never the stable neural cache');

  // --- 4. no blackout / rollback path ------------------------------------------
  // Strip comments first: sw.js documents why it avoids these, and a naive match would
  // read its own explanation as a violation.
  const swCode = SW.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/skipWaiting\s*\(/.test(swCode), 'no eager SW takeover of a live document');
  assert.ok(!/clients\.claim\s*\(/.test(swCode), 'no uncontrolled client claim');

  // --- 5. single-flight, and failure stays retryable ----------------------------
  const adapter = fs.readFileSync(ADAPTER_PATH, 'utf8');
  assert.match(adapter, /neural_generation_busy/,
    'a second concurrent generation must fail closed, not interleave');
  assert.match(adapter, /readyPromise\s*=\s*null/,
    'a failed init must clear the ready promise so retry works without a page reload');

  // Executable: the voice map must be six distinct speaker ids with bella default.
  const mod = require('./' + ADAPTER_PATH);
  const sids = Object.values(mod.VOICE_SIDS);
  assert.strictEqual(sids.length, 6, 'six voices');
  assert.strictEqual(new Set(sids).size, 6, 'speaker ids must be distinct');
  assert.strictEqual(mod.DEFAULT_VOICE, 'af_bella', 'OWNER set bella as default');
  assert.strictEqual(mod.VOICE_SIDS.af_bella, 0, 'bella maps to the proven default speaker');
  assert.match(CONFIG, /fiezelPrimary:\s*'af_bella'/, 'config default must agree with the adapter');

  // Config catalog and adapter map must not drift apart, or a listed voice resolves
  // silently to the default and the user hears the wrong speaker.
  const catalogIds = [...CONFIG.matchAll(/id:\s*'([a-z]{2}_[a-z]+)'/g)].map(m => m[1]);
  for (const id of new Set(catalogIds)) {
    assert.ok(Object.prototype.hasOwnProperty.call(mod.VOICE_SIDS, id),
      `catalog voice ${id} has no speaker mapping`);
  }
  // This model is en-US only; an en-GB label would promise an accent it cannot produce.
  assert.ok(!/locale:\s*'en-GB'/.test(CONFIG),
    'no en-GB locale may be advertised for an en_US-only model');

  // --- release markers ----------------------------------------------------------
  assert.match(fs.readFileSync('features/neural-voice/fiezel-diag-panel.js', 'utf8'),
    /DIAG_BUILD\s*=\s*'m025-26'/);
  assert.match(SW, /SW_REV='m025-26-sherpa-vits-engine-20260818-1'/);

  console.log('FIEZEL m025-26 sherpa VITS engine regression: PASS');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
