// m025-142 — gate perilaku untuk B-11: model neural tidak boleh masuk cache runtime
// sebelum lapisan neural memintanya sendiri.
//
// Gate ini MENJALANKAN fetch handler sw.js yang asli di atas CacheStorage tiruan, bukan
// mencocokkan teks. Alasannya langsung: bug ini pernah lolos justru karena kodenya terbaca
// benar - `const isNeuralAsset=()=>false` disertai komentar yang menjelaskan kenapa itu aman.
// Yang membantahnya bukan pembacaan, melainkan menjalankannya dan melihat apa yang tertulis
// ke cache.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const ORIGIN = 'https://fiezel.test';

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details });
  if (!ok) failed = true;
};

function makeWorker() {
  const stores = new Map();
  const network = [];
  const openCache = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      put: async (req, res) => { store.set(String(req.url || req), res); },
      match: async req => store.get(String(req.url || req)) || undefined,
      addAll: async () => {},
      keys: async () => [...store.keys()]
    };
  };
  const caches = {
    open: async name => openCache(name),
    match: async (req, opts) => {
      const url = String(req.url || req);
      if (opts && opts.cacheName) return (stores.get(opts.cacheName) || new Map()).get(url);
      for (const store of stores.values()) if (store.has(url)) return store.get(url);
      return undefined;
    },
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name)
  };
  class FakeHeaders {
    constructor(init) { this.map = new Map(Object.entries(init || {})); }
    set(k, v) { this.map.set(k, v); }
    get(k) { return this.map.get(k); }
    entries() { return this.map.entries(); }
  }
  class FakeResponse {
    constructor(body, init) { this.body = body; this.status = (init && init.status) || 200; this.statusText = (init && init.statusText) || 'OK'; this.headers = new FakeHeaders(init && init.headers); this.ok = this.status >= 200 && this.status < 300; }
    clone() { return new FakeResponse(this.body, { status: this.status, statusText: this.statusText }); }
  }
  class FakeRequest {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : input.url;
      this.mode = (init && init.mode) || (typeof input === 'object' && input.mode) || 'no-cors';
      this.method = (init && init.method) || 'GET';
      this.destination = (typeof input === 'object' && input.destination) || '';
    }
  }
  const handlers = {};
  const self_ = {
    FIEZEL_VERSION: '5.19.0',
    location: { origin: ORIGIN, href: `${ORIGIN}/sw.js` },
    registration: { scope: `${ORIGIN}/`, update: async () => {} },
    addEventListener: (type, fn) => { (handlers[type] = handlers[type] || []).push(fn); },
    skipWaiting: () => {},
    clients: { claim: async () => {}, matchAll: async () => [] }
  };
  const sandbox = {
    self: self_, caches, console,
    importScripts: () => {},
    fetch: async req => { network.push(String(req.url || req)); return new FakeResponse('bytes', { status: 200 }); },
    URL, Request: FakeRequest, Response: FakeResponse, Headers: FakeHeaders,
    clients: self_.clients, Promise, Date, Math, JSON, setTimeout, clearTimeout
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(swSource, sandbox);
  return { handlers, stores, network, sandbox, FakeRequest };
}

async function fetchThrough(worker, url, mode = 'no-cors') {
  const handler = worker.handlers.fetch && worker.handlers.fetch[0];
  if (!handler) throw new Error('sw.js did not register a fetch handler');
  let responded = null;
  const event = {
    request: new worker.FakeRequest(url, { mode }),
    respondWith: promise => { responded = promise; },
    waitUntil: () => {}
  };
  handler(event);
  if (responded) await responded;
  // beri kesempatan pada penulisan cache yang tidak ditunggu respondWith
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
  return event;
}
const cachedUrls = (worker, cacheName) => [...(worker.stores.get(cacheName) || new Map()).keys()];
const runtimeCacheName = '`fiezel-v5.19.0`'.replace(/`/g, '');

(async () => {
  // 1. Aset neural besar: tidak boleh ditulis ke cache mana pun tanpa diminta.
  const modelUrl = `${ORIGIN}/vendor/supertonic-3/vocoder.int8.onnx`;
  const w1 = makeWorker();
  await fetchThrough(w1, modelUrl);
  const wroteModel = [...w1.stores.values()].some(store => store.has(modelUrl));
  check('A neural model is never written to cache by an ordinary fetch', !wroteModel,
    wroteModel ? `model masuk cache: ${[...w1.stores.keys()].join(', ')}` : 'tidak ada cache yang menyentuhnya');
  check('The neural model is still served to the page', w1.network.includes(modelUrl), 'permintaannya tetap diteruskan ke jaringan');

  // 2. Setelah lapisan neural menyiapkannya sendiri, permintaan dilayani dari cache runtime
  //    tanpa mengunduh ulang - itulah gunanya cache stabil terpisah.
  const w2 = makeWorker();
  const prepared = await w2.sandbox.caches.open(runtimeCacheName);
  await prepared.put({ url: modelUrl }, { body: 'warm', ok: true, status: 200, clone() { return this; }, headers: new Map() });
  const before = w2.network.length;
  await fetchThrough(w2, modelUrl);
  check('A prepared neural asset is served from the stable cache without refetching', w2.network.length === before,
    `permintaan jaringan setelah warmup: ${w2.network.length - before}`);

  // 3. Penjaganya tidak boleh terlalu lebar: aset biasa TETAP boleh masuk cache runtime.
  const w3 = makeWorker();
  const ordinaryUrl = `${ORIGIN}/some-runtime-asset.json`;
  await fetchThrough(w3, ordinaryUrl);
  check('Ordinary runtime assets are still cached', cachedUrls(w3, runtimeCacheName).includes(ordinaryUrl),
    cachedUrls(w3, runtimeCacheName));

  // 4. Aset shell tetap dilayani dari cache shell, bukan dari cache neural.
  const w4 = makeWorker();
  await fetchThrough(w4, `${ORIGIN}/app.js`);
  const shellCache = [...w4.stores.keys()].find(name => name.startsWith('fiezel-shell-'));
  check('Shell assets stay in the revisioned shell cache', Boolean(shellCache) && cachedUrls(w4, shellCache).includes(`${ORIGIN}/app.js`),
    shellCache ? cachedUrls(w4, shellCache).length + ' entri' : 'tidak ada shell cache');

  // 5. Kontrak sumbernya: pencocok yang selalu false adalah bug, bukan penyederhanaan.
  check('isNeuralAsset actually inspects the request', !/const isNeuralAsset\s*=\s*\(\s*\)\s*=>\s*false/.test(swSource) && /isNeuralAsset\s*=\s*request\s*=>/.test(swSource),
    'pencocok tanpa argumen berarti tidak ada aset neural yang pernah dikenali');
  check('No vendor asset is precached into the shell', !/'\.\/vendor\//.test(swSource),
    'precache shell tidak boleh memuat model; setiap kenaikan SW_REV akan mengunduh ulang seluruhnya');

  const report = {
    status: failed ? 'NOT READY' : 'PASS',
    counts: { pass: checks.filter(i => i.status === 'PASS').length, fail: checks.filter(i => i.status === 'FAIL').length },
    checks
  };
  fs.writeFileSync(path.join(root, 'NEURAL-CACHE-ISOLATION-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
