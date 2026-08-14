'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=__dirname;
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(root,'features','neural-voice','fiezel-neural-voice-bootstrap.js'),'utf8');

assert.ok(sw.includes("Cross-Origin-Opener-Policy"),'service worker must emit COOP');
assert.ok(sw.includes("Cross-Origin-Embedder-Policy"),'service worker must emit COEP');
assert.ok(sw.includes("const COOP='same-origin'"),'COOP must be same-origin');
assert.ok(sw.includes("const COEP='require-corp'"),'COEP must be require-corp for WebKit-compatible isolation');
assert.ok(sw.includes("e.request.mode==='navigate'"),'isolation headers must be applied to navigation responses');
assert.ok(sw.includes('withIsolationHeaders'),'navigation responses must be rebuilt with isolation headers');
assert.ok(sw.includes("self.clients.matchAll({type:'window',includeUncontrolled:true})"),'activation must find open window clients');
assert.ok(sw.includes('client.navigate(client.url)'),'activation must reload clients through the isolated navigation path');
assert.ok(bootstrap.includes('crossOriginIsolated:!!root.crossOriginIsolated'),'neural voice diagnostics must expose isolation state');
assert.ok(bootstrap.includes('ort-wasm-simd-threaded.jsep.wasm'),'neural runtime remains the pinned threaded WASM build');

console.log('FIEZEL cross-origin isolation regression: PASS');
