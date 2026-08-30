'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
const fetchBlock=src.slice(src.indexOf("self.addEventListener('fetch'"));
assert.ok(fetchBlock.length>0,'service-worker fetch handler must exist');
/* m025-211: assert urutan teks "fetch( harus muncul sebelum caches.match(" DIHAPUS, dan
 * penggantinya lebih ketat, bukan lebih longgar.
 *
 * Assert lama mengunci satu MEKANISME (network-first) alih-alih sifat yang ingin dijaga. Ketika
 * mekanisme itu sendiri terbukti keliru - dokumen dari jaringan berpasangan dengan aset
 * cache-first generasi lama, terukur di peramban - gerbangnya justru membela kekeliruan itu.
 * Perilaku navigasi kini diuji dengan MENJALANKAN sw.js di `sw-nav-shell-first-test.js`
 * (13 assert: tidak menunggu jaringan, koherensi generasi, penyembuhan diri, 500 tidak
 * meracuni cangkang, luring, pemasangan pertama). Yang tersisa di sini adalah syarat
 * struktural yang tetap harus benar apa pun mekanismenya. */
const navBranch=fetchBlock.match(/if\s*\(e\.request\.mode===['"]navigate['"]\)[\s\S]{0,1200}/);
assert.ok(navBranch,'startup recovery must have an explicit navigation branch');
const navSource=navBranch[0];
assert.match(navSource,/fetch\s*\(/,'navigation must still reach the network so a stale document can be replaced');
assert.match(navSource,/cache\s*:\s*['"]reload['"]/,'navigation revalidation must bypass the stale HTTP cache');
assert.match(navSource,/caches\.match\s*\([^)]*SHELL_CACHE|cacheName\s*:\s*SHELL_CACHE/,'navigation must read the document from THIS generation shell cache, never an unnamed cache');
assert.match(navSource,/waitUntil\s*\(/,'background revalidation must be kept alive past the response, or a stale document never heals');
assert.match(navSource,/\.ok\b/,'only a successful response may overwrite the cached shell document');
assert.match(src,/const CACHE=`fiezel-v\$\{self\.FIEZEL_VERSION\}`/,'stable neural/runtime cache namespace must remain unchanged');
assert.match(src,/same-origin-allow-popups/,'WebKit COOP opener compatibility must remain preserved');
assert.match(src,/const COEP_POLICY=['"]credentialless['"]/,'COEP credentialless must remain preserved');
/* Komentar dibuang dulu: sebuah komentar yang MENJELASKAN kenapa skipWaiting() tidak dipakai
   bukan pemanggilan skipWaiting(), dan gerbang yang tidak bisa membedakannya akan memerah
   karena prosanya sendiri. Yang diuji PEMANGGILAN, bukan kemunculan kata. */
const kodeSaja=src.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/[^\n]*/g,'$1 ');
assert.doesNotMatch(kodeSaja,/skipWaiting\s*\(/,'startup recovery must not force eager worker takeover');
assert.doesNotMatch(kodeSaja,/clients\.claim\s*\(/,'startup recovery must not claim live old-generation clients');
console.log('FIEZEL PWA white-screen startup recovery regression: PASS');
