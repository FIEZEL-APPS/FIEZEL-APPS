'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const src=fs.readFileSync(path.join(__fzRoot,'sw.js'),'utf8');
const swRevMatch=src.match(/const SW_REV='([^']+)'/);
assert.ok(swRevMatch,'SW_REV must remain parseable for release coherence');
const expectedShellName=`fiezel-shell-${swRevMatch[1]}`;

class HeadersMock{
  constructor(init){
    this.map=new Map();
    if(init instanceof HeadersMock){for(const [k,v] of init.map)this.map.set(k,v);return}
    for(const [k,v] of Object.entries(init||{}))this.map.set(String(k).toLowerCase(),String(v));
  }
  get(k){return this.map.get(String(k).toLowerCase())||null}
  set(k,v){this.map.set(String(k).toLowerCase(),String(v))}
}
class ResponseMock{
  constructor(body,init={}){this.body=body;this.status=init.status??200;this.statusText=init.statusText||'';this.headers=init.headers instanceof HeadersMock?init.headers:new HeadersMock(init.headers);this.ok=this.status>=200&&this.status<300}
  clone(){return new ResponseMock(this.body,{status:this.status,statusText:this.statusText,headers:this.headers})}
}

function load(){
  const origin='https://fiezel-apps.github.io';
  const scope=origin+'/FIEZEL-APPS/';
  const listeners={};
  const stores=new Map();
  const deleted=[];
  const openCalls=[];
  const fetchCalls=[];
  let skipWaitingCalls=0;
  let claimCalls=0;
  let networkMode='ok';
  const abs=value=>new URL(typeof value==='string'?value:value.url,scope).href;
  const runtimeName='fiezel-v5.19.0';
  const oldShellName='fiezel-shell-m025-15-cache-integrity-repair-20260817-1';
  stores.set(runtimeName,new Map([
    [abs('./index.html'),new ResponseMock('legacy-index')],
    [abs('./vendor/kokoro-js/kokoro.web.js?nv=m025-5'),new ResponseMock('prepared-neural',{'headers':{'content-length':'900420'}})]
  ]));
  stores.set(oldShellName,new Map([[abs('./index.html'),new ResponseMock('old-shell-index')]]));
  const cacheFor=name=>({
    addAll:async requests=>{
      const store=stores.get(name)||new Map();stores.set(name,store);
      for(const request of requests)store.set(abs(request),new ResponseMock('shell:'+request.url));
    },
    put:async(request,response)=>{const store=stores.get(name)||new Map();stores.set(name,store);store.set(abs(request),response)},
    match:async request=>(stores.get(name)||new Map()).get(abs(request))||null
  });
  const RequestMock=class RequestMock{constructor(value,options={}){this.url=abs(value);this.cache=options.cache||'default';this.method=typeof value==='object'&&value.method?value.method:'GET';this.mode=typeof value==='object'&&value.mode?value.mode:options.mode||'same-origin'}};
  const sandbox={
    console,URL,Promise,Symbol,setTimeout,clearTimeout,
    Headers:HeadersMock,Response:ResponseMock,Request:RequestMock,
    fetch:async request=>{
      fetchCalls.push({url:abs(request),cache:request&&request.cache||'default',mode:request&&request.mode||null});
      if(networkMode==='throw')throw new Error('offline');
      if(networkMode==='bad')return new ResponseMock('network-bad',{status:503});
      return new ResponseMock('network:'+abs(request));
    },
    caches:{
      open:async name=>{openCalls.push(name);if(!stores.has(name))stores.set(name,new Map());return cacheFor(name)},
      keys:async()=>Array.from(stores.keys()),
      delete:async name=>{deleted.push(name);return stores.delete(name)},
      match:async(request,options={})=>{
        if(options&&options.cacheName)return (stores.get(options.cacheName)||new Map()).get(abs(request))||null;
        for(const store of stores.values()){const hit=store.get(abs(request));if(hit)return hit}
        return null;
      }
    },
    clients:{claim:async()=>{claimCalls++},matchAll:async()=>[]},
    importScripts:()=>{sandbox.self.FIEZEL_VERSION='5.19.0'},
    self:null,
    navigator:{userAgent:'Mozilla/5.0 AppleWebKit/605.1.15 Version/26.5 Safari/605.1.15'}
  };
  sandbox.self=sandbox;sandbox.globalThis=sandbox;
  sandbox.location={origin,href:scope};
  sandbox.registration={scope,showNotification:()=>{},update:async()=>{}};
  sandbox.skipWaiting=async()=>{skipWaitingCalls++};
  sandbox.addEventListener=(name,fn)=>(listeners[name]=listeners[name]||[]).push(fn);
  vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'sw.js'});
  return{listeners,stores,deleted,openCalls,fetchCalls,runtimeName,oldShellName,abs,setNetworkMode:v=>{networkMode=v},get skipWaitingCalls(){return skipWaitingCalls},get claimCalls(){return claimCalls}};
}
async function dispatchExtendable(listeners,name){
  let pending=Promise.resolve();
  for(const fn of listeners[name]||[])fn({waitUntil:value=>{pending=Promise.resolve(value)}});
  await pending;
}
async function dispatchFetch(t,request){
  let pending=null;
  for(const fn of t.listeners.fetch||[])fn({request,respondWith:value=>{pending=Promise.resolve(value)}});
  return pending?pending:null;
}

(async()=>{
  const t=load();
  const runtimeBefore=t.stores.get(t.runtimeName);
  const neuralKey=t.abs('./vendor/kokoro-js/kokoro.web.js?nv=m025-5');
  const neuralBefore=runtimeBefore.get(neuralKey);

  await dispatchExtendable(t.listeners,'install');
  const shellName=t.openCalls.find(name=>name===expectedShellName);
  assert.ok(shellName,'install must create the shell cache for the exact current SW revision');
  assert.notEqual(shellName,t.runtimeName,'shell cache must be separate from stable neural/runtime cache');
  assert.strictEqual(t.stores.get(t.runtimeName),runtimeBefore,'install must not replace the stable runtime cache object');
  assert.strictEqual(t.stores.get(t.runtimeName).get(neuralKey),neuralBefore,'install must not rewrite prepared neural runtime bytes/metadata');
  const installedUrls=Array.from(t.stores.get(shellName).keys());
  assert.ok(!installedUrls.some(url=>url.includes('/vendor/kokoro-')),'SW install must not precache query-versioned neural assets');
  assert.equal(t.skipWaitingCalls,0,'updated worker must not force activation over a live old document');

  await dispatchExtendable(t.listeners,'activate');
  assert.equal(t.claimCalls,0,'updated worker must not claim existing old-generation clients');
  assert.ok(t.stores.has(t.runtimeName),'activate must preserve stable neural/runtime cache');
  assert.ok(!t.stores.has(t.oldShellName),'activate may clean stale dedicated shell caches after old clients are gone');
  assert.ok(t.stores.has(shellName),'activate must retain current revisioned shell cache');

  const nav={url:t.abs('./'),method:'GET',mode:'navigate'};
  t.stores.get(shellName).set(t.abs('./'),new ResponseMock(''));
  const navResponse=await dispatchFetch(t,nav);
  /* m025-211: dulu assert ini berbunyi "dokumen jaringan harus menang atas entri cangkang
     yang kosong/usang". Itu benar untuk mekanisme lama dan SALAH sebagai sifat: dokumen dari
     jaringan berpasangan dengan aset cache-first generasi lama, sehingga murid menjalankan
     index.html build N+1 di atas JavaScript build N (terukur di peramban). Sekarang dokumen
     dilayani dari cangkang generasi ini, dan penyembuhannya pindah ke revalidasi latar -
     dua baris di bawah yang menegakkannya. PERTUKARAN YANG DISENGAJA dan ditulis terbuka:
     entri cangkang yang kosong tersaji SEKALI, lalu tergantikan pada peluncuran berikutnya. */
  assert.ok(navResponse&&String(navResponse.body)==='','startup must serve this generation shell entry, keeping document and assets on the same build');
  const navFetch=t.fetchCalls.find(call=>call.url===t.abs('./'));
  assert.ok(navFetch,'startup navigation must hit the network');
  assert.equal(navFetch.cache,'reload','startup navigation must bypass stale HTTP cache');
  assert.equal(navResponse.headers.get('Cross-Origin-Opener-Policy'),'same-origin-allow-popups','WebKit navigation COOP compatibility must be preserved');
  assert.equal(navResponse.headers.get('Cross-Origin-Embedder-Policy'),'credentialless','COEP must remain credentialless');
  assert.ok(String(t.stores.get(shellName).get(t.abs('./')).body).startsWith('network:'),'successful network startup must refresh the current shell navigation entry');

  t.setNetworkMode('throw');
  const offlineNav=await dispatchFetch(t,nav);
  /* m025-211: dulu assert ini menuntut awalan 'shell:' - yaitu entri hasil install. Itu
     mengunci artefak penyemaian harness, bukan sifat yang kita mau. Sesudah revalidasi latar
     bekerja, entri cangkang generasi ini MEMANG sudah tersegarkan, dan menyajikannya justru
     yang benar. Yang ditegakkan sekarang lebih kuat dan bebas mekanisme: luring dijawab dari
     cangkang GENERASI INI, dan yang dijawab sama persis dengan yang tersimpan di sana. */
  const tersimpanCangkang=t.stores.get(shellName).get(t.abs('./'));
  assert.ok(offlineNav,'offline startup must be answered from cache, not left to a network error');
  assert.equal(String(offlineNav.body),String(tersimpanCangkang.body),'offline startup must serve exactly this generation cached document');

  const neural={url:neuralKey,method:'GET',mode:'same-origin'};
  const neuralResponse=await dispatchFetch(t,neural);
  assert.equal(neuralResponse.body,'prepared-neural','neural request must still resolve from stable prepared runtime cache');

  console.log('FIEZEL PWA release coherence regression: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
