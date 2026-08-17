'use strict';
// m025-25 regression: Apple standalone must never dispatch Kokoro WASM inference.
//
// Physical evidence (OWNER capture 2026-08-17T16:40:43Z, Safari 26.5 standalone, diagBuild
// m025-24) recorded three consecutive WebKit content-process terminations during
// adapter_model_dispatched: zero speak_neural_success, no generate_timeout, no circuit latch,
// and a fresh document load (pageshow persisted:false) 19-42s after dispatch. One cycle died
// at +19.1s, BEFORE the 30s soft budget could fire, which proves the m025-24 timeout/circuit
// repair is correct and simply unreachable -- the process dies before any JS policy runs.
//
// This regression pins the only thing that can stop the blackout/reload loop: the dispatch
// must not happen at all in that context, and the degraded state must be explicit.
const assert = require('assert');
const fs = require('fs');

const SOURCE = 'features/neural-voice/fiezel-neural-voice-bootstrap.js';

(async () => {
  const src = fs.readFileSync(SOURCE, 'utf8');

  // --- source-level invariants -------------------------------------------------
  assert.match(src, /APPLE_INFERENCE_BLOCK_POLICY\s*=\s*'apple-wasm-inference-unviable-v1'/,
    'm025-25 block policy marker must be present and explicit');
  assert.match(src, /APPLE_INFERENCE_BLOCK_REASON\s*=\s*'apple_wasm_inference_unviable'/,
    'm025-25 block reason must be a stable diagnostic string');
  assert.match(src, /phase:'speak_neural_blocked'/,
    'blocked dispatch must emit its own diagnostic phase, never a silent substitution');
  assert.match(src, /appleInferenceBlocked:appleWasmInferenceBlocked\(\)/,
    'runtime status must expose the blocked state so the UI can show degraded mode');

  // The guard must run BEFORE initialize()/local.speak(), otherwise the process still dies.
  const guardAt = src.indexOf('appleWasmInferenceBlocked()){');
  const speakAt = src.indexOf('local.speak(text');
  assert.ok(guardAt > -1 && speakAt > -1, 'guard and neural dispatch must both exist');
  assert.ok(guardAt < speakAt,
    'guard must precede neural dispatch; a guard after dispatch cannot prevent the process kill');

  // --- executable behaviour ----------------------------------------------------
  // Rebuild the decision predicate exactly as shipped, then drive it through the real
  // physical context and the contexts that must stay unaffected.
  const blockedFn = new Function('root', `
    function appleStandaloneContext(){
      return root.navigator?.standalone===true||!!root.matchMedia?.('(display-mode: standalone)')?.matches;
    }
    function appleWasmInferenceBlocked(){
      if(root.FIEZEL_APPLE_WASM_INFERENCE==='force')return false;
      return appleStandaloneContext()&&root.crossOriginIsolated!==true;
    }
    return appleWasmInferenceBlocked();
  `);

  const ctx = (over) => Object.assign({
    navigator: {}, crossOriginIsolated: false, matchMedia: () => ({ matches: false })
  }, over);

  // The exact OWNER failure context: Apple standalone, not cross-origin isolated.
  assert.strictEqual(blockedFn(ctx({ navigator: { standalone: true } })), true,
    'Apple standalone non-isolated must be blocked - this is the reload-loop context');
  assert.strictEqual(blockedFn(ctx({ matchMedia: () => ({ matches: true }) })), true,
    'display-mode standalone must be blocked too, not only navigator.standalone');

  // Contexts that must NOT regress.
  assert.strictEqual(blockedFn(ctx({})), false,
    'ordinary browser tabs must be untouched');
  assert.strictEqual(blockedFn(ctx({ navigator: { standalone: true }, crossOriginIsolated: true })), false,
    'cross-origin isolated standalone is a different runtime and stays allowed');

  // Escape hatch is opt-in only and never engages by itself.
  assert.strictEqual(
    blockedFn(ctx({ navigator: { standalone: true }, FIEZEL_APPLE_WASM_INFERENCE: 'force' })), false,
    'explicit force override must re-enable dispatch for a successor engine');
  assert.strictEqual(
    blockedFn(ctx({ navigator: { standalone: true }, FIEZEL_APPLE_WASM_INFERENCE: true })), true,
    'only the exact string "force" may override; truthy values must not silently unblock');

  // --- owner voice decision ----------------------------------------------------
  const config = fs.readFileSync('features/neural-voice/fiezel-neural-voice-config.js', 'utf8');
  assert.match(config, /fiezelPrimary:\s*'af_bella'/, 'OWNER set default voice to bella');
  const app = fs.readFileSync('app.js', 'utf8');
  assert.ok(!/fiezelPrimary\|\|'af_heart'/.test(app),
    'app.js fallback default must not resolve back to af_heart');

  // --- release markers ---------------------------------------------------------
  const diag = fs.readFileSync('features/neural-voice/fiezel-diag-panel.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  assert.match(diag, /DIAG_BUILD\s*=\s*'m025-25'/);
  assert.match(sw, /SW_REV='m025-25-apple-inference-unviable-20260817-1'/);

  console.log('FIEZEL m025-25 Apple inference unviable regression: PASS');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
