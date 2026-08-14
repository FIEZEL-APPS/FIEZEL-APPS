'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=__dirname;
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const bootstrap=fs.readFileSync(path.join(root,'features','neural-voice','fiezel-neural-voice-bootstrap.js'),'utf8');

assert.ok(sw.includes("Cross-Origin-Opener-Policy"),'service worker must emit COOP');
assert.ok(sw.includes("Cross-Origin-Embedder-Policy"),'service worker must emit COEP');
assert.ok(sw.includes("const COOP='same-origin'"),'COOP must be same-origin');
assert.ok(sw.includes("const COEP='require-corp'"),'COEP must be require-corp for WebKit-compatible isolation');
assert.ok(sw.includes("e.request.mode==='navigate'"),'isolation headers must be applied to navigation responses');
assert.ok(sw.includes('withIsolationHeaders'),'navigation responses must be rebuilt with isolation headers');
assert.ok(index.includes("navigator.serviceWorker.addEventListener('controllerchange'"),'page must reload once when the new service worker takes control');
assert.ok(index.includes('fiezel-coi-reload-v1'),'reload loop guard must be present');
assert.ok(bootstrap.includes('crossOriginIsolated:!!root.crossOriginIsolated'),'neural voice diagnostics must expose isolation state');
assert.ok(bootstrap.includes('ort-wasm-simd-threaded.jsep.wasm'),'neural runtime remains the pinned threaded WASM build');

console.log('FIEZEL cross-origin isolation regression: PASS');
