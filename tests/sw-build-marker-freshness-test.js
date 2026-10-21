/**
 * FIEZEL gate — PENANDA BUILD LIVE TIDAK BOLEH DIBEKUKAN OLEH CACHE CANGKANG.
 *
 * Latar. Kartu "Versi baru" (features/ui/fiezel-update-prompt.js) memakai
 * `coordination/BUILD-VERSION.json` sebagai sinyal UTAMA bahwa ada rilis lebih baru, karena
 * VERSION.json semver tidak pernah maju di produksi. Tetapi jalur aset cangkang sw.js bersifat
 * CACHE-FIRST + ignoreSearch: tanpa cabang khusus, permintaan itu akan dilayani salinan lama
 * dari SHELL_CACHE generasi lama SELAMANYA, dan pemeriksa pembaruan membaca ajakan basi -
 * persis kelas bug m025-492 yang hendak ditutup.
 *
 * Gerbang ini menjalankan sw.js SUNGGUHAN (vm, pola yang sama dengan
 * tests/pwa-release-coherence-test.js) dan menegakkan tiga sifat:
 *   1. permintaan build-version.json selalu MENCAPAI JARINGAN (bukan cache-first);
 *   2. saat jaringan gagal, jawabannya 503 - BUKAN salinan cache yang menyesatkan;
 *   3. tidak ada salinan yang DITULIS ke cache mana pun (tanpa itu, jaringan-dulu pun bisa
 *      meninggalkan salinan basi yang dipakai jalur lain).
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

class HeadersMock { constructor(init) { this.map = new Map(); for (const [k, v] of Object.entries(init || {})) this.map.set(String(k).toLowerCase(), String(v)); } get(k) { return this.map.get(String(k).toLowerCase()) || null; } }
class ResponseMock { constructor(body, init = {}) { this.body = body; this.status = init.status == null ? 200 : init.status; this.headers = new HeadersMock(init.headers); this.ok = this.status >= 200 && this.status < 300; } clone() { return new ResponseMock(this.body, { status: this.status, headers: this.headers }); } }

function load(networkMode) {
  const origin = 'https://fiezel-apps.github.io';
  const scope = origin + '/FIEZEL-APPS/';
  const listeners = {};
  const stores = new Map();
  const writes = [];     // {cache, url} setiap cache.put
  const fetches = [];    // url setiap fetch
  const abs = (v) => new URL(typeof v === 'string' ? v : v.url, scope).href;
  const cacheFor = (name) => ({
    addAll: async () => {},
    put: async (req, res) => { writes.push({ cache: name, url: abs(req) }); const s = stores.get(name) || new Map(); stores.set(name, s); s.set(abs(req), res); },
    match: async (req) => (stores.get(name) || new Map()).get(abs(req)) || null
  });
  const RequestMock = class { constructor(value, options = {}) { this.url = abs(value); this.cache = options.cache || 'default'; this.method = typeof value === 'object' && value.method ? value.method : 'GET'; this.mode = options.mode || 'same-origin'; } };
  const sandbox = {
    console, URL, Promise, Symbol, setTimeout, clearTimeout,
    Headers: HeadersMock, Response: ResponseMock, Request: RequestMock,
    fetch: async (request) => {
      const url = abs(request);
      fetches.push(url);
      if (networkMode === 'throw') throw new Error('offline');
      return new ResponseMock('network:' + url, { status: 200 });
    },
    caches: { open: async (name) => { if (!stores.has(name)) stores.set(name, new Map()); return cacheFor(name); }, match: async (req, o = {}) => { if (o && o.cacheName) return (stores.get(o.cacheName) || new Map()).get(abs(req)) || null; for (const st of stores.values()) { const h = st.get(abs(req)); if (h) return h; } return null; }, keys: async () => [...stores.keys()], delete: async () => true },
    clients: { claim: async () => {}, matchAll: async () => [] },
    importScripts: () => { sandbox.self.FIEZEL_VERSION = '5.19.0'; },
    self: null, navigator: { userAgent: 'node' }
  };
  sandbox.self = sandbox; sandbox.globalThis = sandbox;
  sandbox.location = { origin, href: scope };
  sandbox.registration = { scope, update: async () => {} };
  sandbox.addEventListener = (name, fn) => (listeners[name] = listeners[name] || []).push(fn);
  vm.createContext(sandbox); vm.runInContext(SRC, sandbox, { filename: 'sw.js' });
  return { listeners, stores, writes, fetches, abs };
}
async function dispatchFetch(t, request) {
  let pending = null;
  for (const fn of t.listeners.fetch || []) fn({ request, respondWith: (v) => { pending = Promise.resolve(v); } });
  return pending ? pending : null;
}

(async () => {
  /* Kasus 1: jaringan sehat - harus MENempuh jaringan, bukan dilayani cache. */
  {
    const t = load('ok');
    const req = { url: t.abs('./coordination/BUILD-VERSION.json?t=1'), method: 'GET', mode: 'same-origin' };
    const res = await dispatchFetch(t, req);
    assert.ok(res, 'permintaan build-version.json wajib punya jawaban');
    assert.ok(String(res.body).startsWith('network:'), 'build-version.json wajib datang dari jaringan, bukan cache cangkang');
    assert.ok(t.fetches.some((u) => u.includes('BUILD-VERSION.json')), 'jaringan benar-benar ditembak');
    assert.strictEqual(t.writes.length, 0, 'build-version.json tidak boleh ditulis ke cache mana pun (kalau ditulis, salinan basi bisa menang di jalur lain)');
    assert.strictEqual(res.status, 200, 'jaringan sehat -> 200');
  }

  /* Kasus 2: luring - 503, BUKAN salinan cache. Menjawab salinan basi akan membuat modul
   * mempercayai ajakan lama; 503 membuatnya jatuh ke jaring pengaman kandidat-worker. */
  {
    const t = load('throw');
    const req = { url: t.abs('./coordination/BUILD-VERSION.json?t=2'), method: 'GET', mode: 'same-origin' };
    const res = await dispatchFetch(t, req);
    assert.ok(res, 'luring tetap harus menjawab (bukan menggantung)');
    assert.strictEqual(res.status, 503, 'luring -> 503, bukan salinan cache yang menyesatkan');
    assert.strictEqual(t.writes.length, 0, 'luring pun tidak boleh menulis salinan');
  }

  console.log('FIEZEL build-marker freshness (SW): PASS');
})().catch((e) => { console.error(e.stack || e); process.exitCode = 1; });
