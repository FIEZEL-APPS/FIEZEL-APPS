'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=__dirname;
const bootstrap=fs.readFileSync(path.join(root,'features','neural-voice','fiezel-neural-voice-bootstrap.js'),'utf8');
const adapter=require(path.join(root,'features','neural-voice','fiezel-kokoro-adapter.js'));

assert.ok(bootstrap.includes("return'text/javascript; charset=utf-8'"),'cached JS modules must be normalized to a JavaScript MIME');
assert.ok(bootstrap.includes("return'application/wasm'"),'cached WebAssembly must be normalized to application/wasm');
assert.ok(bootstrap.includes("reason:'mime'"),'stale neural assets with a wrong MIME must be invalidated');
assert.ok(bootstrap.includes("new Response(fetched.body"),'large WASM/model responses must remain streaming');
assert.ok(bootstrap.includes("wasmBasePath:absolute('vendor/kokoro-js/wasm/')"),'ONNX WASM path must be an absolute same-origin URL');

const sameOrigin='https://example.test';
assert.equal(adapter.normalizeWasmPath('https://example.test/FIEZEL-APPS/vendor/kokoro-js/wasm/',sameOrigin),'https://example.test/FIEZEL-APPS/vendor/kokoro-js/wasm/');
assert.throws(()=>adapter.normalizeWasmPath('https://evil.test/wasm/',sameOrigin),/same-origin/);
assert.equal(adapter.normalizeWasmPath('./vendor/kokoro-js/wasm/',''),'./vendor/kokoro-js/wasm/');

console.log('FIEZEL iOS WASM module regression: PASS');
