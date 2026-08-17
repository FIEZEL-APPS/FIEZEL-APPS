'use strict';
// m025-32 regression: Indonesian is a genuinely optional second bundle.
//
// OWNER chose to ship both engines while the app keeps working normally. That means
// two properties must hold together: Indonesian must be reachable, and its absence
// must never degrade or block anything English.
const assert = require('assert');
const fs = require('fs');

const MODULE = 'features/neural-voice/fiezel-indonesian-voice.js';
const src = fs.readFileSync(MODULE, 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const boot = fs.readFileSync('features/neural-voice/fiezel-neural-voice-bootstrap.js', 'utf8');

(async () => {
  // --- 1. optional: nothing runs at startup, English never depends on it ----------
  assert.ok(!/sherpa-vits-id/.test(boot),
    'the English bootstrap must not reference the Indonesian bundle at all');
  const englishAssets = boot.slice(boot.indexOf('const assets=Object.freeze(['),
                                   boot.indexOf('const totalBytes='));
  assert.ok(!/sherpa-vits-id/.test(englishAssets),
    'Indonesian must never enter the mandatory English download manifest');
  assert.match(app, /function indonesianPrepared\(\)/, 'app must expose an Indonesian readiness helper');
  assert.ok(/try\{return self\.FiezelIndonesianVoice\?\.status\?\.\(\)\.prepared===true\}catch\{return false\}/.test(app),
    'readiness check must fail soft when the module is absent');
  assert.match(app, /if\(!rt\)return 'Modul suara Indonesia tidak tersedia pada build ini\.'/,
    'UI must degrade gracefully when the module is missing');

  // --- 2. neural-only: no browser TTS substitution, ever --------------------------
  assert.match(src, /allowFallback: false/, 'Indonesian speech must never fall back to browser TTS');
  assert.ok(!/SpeechSynthesis/.test(src), 'the Indonesian module must not touch SpeechSynthesis');
  assert.match(src, /indonesian_voice_not_downloaded/,
    'speaking before download must fail explicitly rather than substituting');

  // --- 3. declared bytes must match the vendored files ----------------------------
  const declared = [...src.matchAll(/BASE \+ '([^']+)', bytes: (\d+)/g)]
    .map(m => ({ path: 'vendor/sherpa-vits-id/' + m[1], bytes: Number(m[2]) }));
  assert.strictEqual(declared.length, 5, 'Indonesian runtime is exactly five files');
  for (const item of declared) {
    const actual = fs.statSync(item.path).size;
    assert.strictEqual(actual, item.bytes,
      `${item.path} declared ${item.bytes} but is ${actual} on disk`);
  }
  const total = declared.reduce((sum, a) => sum + a.bytes, 0);
  assert.ok(new RegExp('totalBytes: ' + total).test(src),
    'reported totalBytes must equal the sum of the declared assets');

  // --- 4. download-once: same stable cache, and the SW must know the path ----------
  assert.match(src, /caches\.open\(cacheName\)/, 'must reuse the stable neural cache');
  assert.match(src, /var cacheName = 'fiezel-v' \+ version/,
    'Indonesian cache must be keyed to app version, not to SW_REV');
  assert.match(sw, /vendor\/sherpa-vits-id\//,
    'service worker must classify the Indonesian bundle as a neural asset');
  const matcher = sw.slice(sw.indexOf('const isNeuralAsset='), sw.indexOf('const shellScope='));
  assert.match(matcher, /sherpa-vits-id/,
    'isNeuralAsset must match the Indonesian path or it is refetched on every release');

  // --- 5. the shared adapter stayed language-agnostic without breaking English -----
  const adapter = require('./features/neural-voice/fiezel-sherpa-vits-adapter.js');
  const english = adapter.createSherpaVitsAdapter({ env: {} });
  assert.strictEqual(english.kind, 'sherpa-vits-local', 'English default kind must be unchanged');
  assert.strictEqual(english.defaultVoice, 'af_bella', 'English default voice must be unchanged');
  assert.deepStrictEqual(Object.keys(english.voiceSids), ['af_bella', 'af_heart'],
    'English keeps exactly the two voices OWNER chose');

  const indo = adapter.createSherpaVitsAdapter({
    env: {}, expectedSpeakers: 1, modelId: 'vits-piper-id_ID-news_tts-medium',
    voiceSids: { id_natural: 0 }, defaultVoice: 'id_natural', kind: 'sherpa-vits-id'
  });
  assert.strictEqual(indo.kind, 'sherpa-vits-id');
  assert.strictEqual(indo.modelId, 'vits-piper-id_ID-news_tts-medium');
  assert.deepStrictEqual(Object.keys(indo.voiceSids), ['id_natural']);
  // Both must be independent instances, or one language would clobber the other.
  assert.notStrictEqual(english.voiceSids, indo.voiceSids);

  // --- 6. release markers ---------------------------------------------------------
  assert.match(fs.readFileSync('features/neural-voice/fiezel-diag-panel.js', 'utf8'),
    /DIAG_BUILD\s*=\s*'m025-32'/);
  assert.match(sw, /SW_REV='m025-32-indonesian-optional-20260818-1'/);

  console.log('FIEZEL m025-32 Indonesian optional bundle regression: PASS');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
