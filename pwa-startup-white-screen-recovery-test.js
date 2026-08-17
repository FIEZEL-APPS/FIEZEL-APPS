'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');

// P0 physical startup regression: an installed app whose current revisioned shell
// contains a blank/stale document must have a network recovery path before that
// cached document is returned. This test is intentionally source-contract only at
// RED stage; pwa-release-coherence-test.js remains the executable cache lifecycle gate.
const fetchBlock=src.slice(src.indexOf("self.addEventListener('fetch'"));
assert.ok(fetchBlock.length>0,'service-worker fetch handler must exist');

const navBranch=fetchBlock.match(/if\s*\(e\.request\.mode===['"]navigate['"]\)[\s\S]{0,1200}/);
assert.ok(navBranch,'startup recovery must have an explicit navigation branch');
const navSource=navBranch[0];

assert.match(navSource,/fetch\s*\(/,'navigation recovery must attempt network before accepting cached shell');
assert.match(navSource,/cache\s*:\s*['"]reload['"]/,'navigation recovery must bypass stale HTTP cache');
assert.match(navSource,/caches\.match\s*\(/,'navigation recovery must retain an offline shell fallback');
assert.ok(navSource.indexOf('fetch(')<navSource.indexOf('caches.match('),'navigation must be network-first, then shell fallback');
assert.match(navSource,/\.ok\b/,'network navigation must only replace/favor shell on a successful response');

// Guard the invariants that the startup repair is not allowed to change.
assert.match(src,/const CACHE=`fiezel-v\$\{self\.FIEZEL_VERSION\}`/,'stable neural/runtime cache namespace must remain unchanged');
assert.match(src,/same-origin-allow-popups/,'WebKit COOP opener compatibility must remain preserved');
assert.match(src,/const COEP_POLICY=['"]credentialless['"]/,'COEP credentialless must remain preserved');
assert.doesNotMatch(src,/skipWaiting\s*\(/,'startup recovery must not force eager worker takeover');
assert.doesNotMatch(src,/clients\.claim\s*\(/,'startup recovery must not claim live old-generation clients');

console.log('FIEZEL PWA white-screen startup recovery regression: PASS');
