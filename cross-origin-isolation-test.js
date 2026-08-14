'use strict';
// FIEZEL cross-origin isolation regression gate (CI).
//
// Guards the parts of the service worker + neural voice bootstrap that make
// self.crossOriginIsolated === true reachable on the PWA, and keeps them from
// silently regressing:
//   1. COOP/COEP headers injected on same-origin navigation (and JS)
//      responses by the service worker.
//   2. The CORP wrapper for cross-origin no-cors traffic (js.puter.com) --
//      COEP:require-corp blocks it otherwise.
//   3. The client refresh on SW activation, which reloads already-open PWA
//      windows through the isolated navigation path so they no longer stay
//      at crossOriginIsolated === false until a manual refresh.
//   4. The neural voice bootstrap must expose isolation state in diagnostics
//      and keep using the pinned threaded WASM build.
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=__dirname;
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const bootstrap=fs.readFileSync(path.join(root,'features','neural-voice','fiezel-neural-voice-bootstrap.js'),'utf8');

// --- 1. COOP/COEP injection on same-origin responses ---
assert.ok(sw.includes("Cross-Origin-Opener-Policy"),'service worker must emit COOP');
assert.ok(sw.includes("Cross-Origin-Embedder-Policy"),'service worker must emit COEP');
assert.ok(sw.includes("'same-origin'"),'COOP must be same-origin (opens popups are not isolated)');
assert.ok(sw.includes("'require-corp'"),'COEP must be require-corp for WebKit-compatible isolation');
assert.ok(sw.includes('withCoopCoep'),'responses must be rebuilt with isolation headers');
assert.ok(sw.includes("e.request.mode==='navigate'"),'isolation headers must be applied to navigation responses');

// --- 2. CORP wrapper for cross-origin no-cors traffic (js.puter.com) ---
assert.ok(sw.includes('fetchCrossOriginWithCorp'),'cross-origin no-cors traffic must be re-wrapped with a synthetic CORP header');
assert.ok(sw.includes("headers.set('Cross-Origin-Resource-Policy','cross-origin')"),'synthetic CORP header must allow cross-origin resources');

// --- 3. Client refresh after COI activation (COI is only effective once the
//        top document is loaded through the isolated SW navigation path) ---
assert.ok(sw.includes('refreshWindowClients'),'activation must refresh open window clients after claiming');
assert.ok(sw.includes("self.clients.matchAll({type:'window',includeUncontrolled:true})"),'activation must find open window clients');
assert.ok(sw.includes('client.navigate(client.url)'),'activation must reload clients through the isolated navigation path');

// --- 4. Neural voice bootstrap must keep exposing isolation + threaded WASM ---
assert.ok(bootstrap.includes('crossOriginIsolated:!!root.crossOriginIsolated'),'neural voice diagnostics must expose isolation state');
assert.ok(bootstrap.includes('ort-wasm-simd-threaded.jsep.wasm'),'neural runtime remains the pinned threaded WASM build');

console.log('FIEZEL cross-origin isolation regression: PASS');
