// Gate untuk fetchCrossOriginWithCorp di sw.js (M-021).
//
// Bug yang diperbaiki: versi lama mengambil resource cross-origin dalam mode
// no-cors lalu menyalurkan response.body ke Response baru ber-status 200.
// Menurut spesifikasi Fetch, opaque filtered response punya body null, jadi
// hasilnya adalah 200 OK dengan body KOSONG. https://js.puter.com/v2/ dimuat
// tanpa atribut crossorigin (mode no-cors), sehingga SDK Puter jadi skrip kosong.
//
// Harness ini menjalankan sw.js di sandbox vm dengan fetch tiruan yang meniru
// semantik opaque yang benar, lalu memeriksa hasilnya.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
function check(label, condition, detail) {
  if (condition) { console.log('  ok   ' + label); return; }
  failures++;
  console.log('  FAIL ' + label + (detail ? ' — ' + detail : ''));
}

const SW_SRC = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
const PUTER = 'https://js.puter.com/v2/';

// --- Headers / Response minimal ---------------------------------------------
class FakeHeaders {
  constructor(init) {
    this.map = new Map();
    if (init instanceof FakeHeaders) for (const [k, v] of init.map) this.map.set(k, v);
    else if (init) for (const k of Object.keys(init)) this.map.set(k.toLowerCase(), init[k]);
  }
  get(name) { const v = this.map.get(String(name).toLowerCase()); return v === undefined ? null : v; }
  set(name, value) { this.map.set(String(name).toLowerCase(), value); }
  [Symbol.iterator]() { return this.map[Symbol.iterator](); }
}
class FakeResponse {
  constructor(body, init) {
    init = init || {};
    this.body = body === undefined ? null : body;
    this.status = init.status === undefined ? 200 : init.status;
    this.statusText = init.statusText || '';
    this.headers = init.headers instanceof FakeHeaders ? init.headers : new FakeHeaders(init.headers);
    this.type = init.type || 'default';
    this.ok = this.status >= 200 && this.status < 300;
  }
}
const opaque = () => {
  // Sesuai spesifikasi: status 0, header kosong, body null.
  const r = new FakeResponse(null, { status: 0, type: 'opaque' });
  r.ok = false;
  return r;
};

function runSw(fetchImpl) {
  const listeners = {};
  const sandbox = {
    console, setTimeout, clearTimeout, Promise, URL, Symbol,
    Headers: FakeHeaders,
    Response: FakeResponse,
    fetch: fetchImpl,
    caches: { open: () => Promise.resolve({ addAll: () => Promise.resolve(), put: () => Promise.resolve(), match: () => Promise.resolve(undefined) }), keys: () => Promise.resolve([]), delete: () => Promise.resolve(true), match: () => Promise.resolve(undefined) },
    clients: { matchAll: () => Promise.resolve([]) },
    importScripts: () => { sandbox.self.FIEZEL_VERSION = '5.19.0'; },
    self: null
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.location = { origin: 'https://fitrajft-ux.github.io' };
  sandbox.registration = { showNotification: () => {}, update: () => Promise.resolve() };
  sandbox.addEventListener = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); };
  vm.createContext(sandbox);
  vm.runInContext(SW_SRC, sandbox);
  return { sandbox, listeners };
}

// Panggil handler fetch dengan request cross-origin no-cors, tangkap responsnya.
function callFetchHandler(listeners, request) {
  let captured = null;
  const event = { request, respondWith: (p) => { captured = p; } };
  (listeners.fetch || []).forEach(fn => fn(event));
  return captured;
}

async function main() {
  console.log('sw-corp-test');

  console.log('\n1 — server MENGIRIM header CORS (jalur yang diperbaiki)');
  {
    let corsCalls = 0, noCorsCalls = 0;
    const fetchImpl = (input, init) => {
      const mode = init && init.mode;
      if (mode === 'cors') {
        corsCalls++;
        return Promise.resolve(new FakeResponse('window.puter={workers:{}};', {
          status: 200, statusText: 'OK', type: 'cors',
          headers: { 'content-type': 'application/javascript' }
        }));
      }
      noCorsCalls++;
      return Promise.resolve(opaque());
    };
    const { listeners } = runSw(fetchImpl);
    const response = await callFetchHandler(listeners, { url: PUTER, method: 'GET', mode: 'no-cors' });
    check('handler merespons request cross-origin', !!response);
    check('CORS dicoba lebih dulu', corsCalls === 1, 'corsCalls=' + corsCalls);
    check('body TIDAK kosong', response.body === 'window.puter={workers:{}};', String(response.body));
    check('header CORP sintetis dipasang', response.headers.get('Cross-Origin-Resource-Policy') === 'cross-origin');
    check('Content-Type asli dipertahankan', response.headers.get('Content-Type') === 'application/javascript');
    check('status asli dipertahankan', response.status === 200);
    check('tidak jatuh ke no-cors saat CORS berhasil', noCorsCalls === 0, 'noCorsCalls=' + noCorsCalls);
  }

  console.log('\n2 — server TIDAK mengirim header CORS (jalur mundur)');
  {
    let noCorsCalls = 0;
    const fetchImpl = (input, init) => {
      if (init && init.mode === 'cors') return Promise.reject(new TypeError('Failed to fetch'));
      noCorsCalls++;
      return Promise.resolve(opaque());
    };
    const { listeners } = runSw(fetchImpl);
    const response = await callFetchHandler(listeners, { url: PUTER, method: 'GET', mode: 'no-cors' });
    check('tetap merespons, tidak melempar', !!response);
    check('diteruskan sebagai opaque apa adanya', response.type === 'opaque', String(response.type));
    check('REGRESI UTAMA: bukan 200 dengan body kosong',
      !(response.status === 200 && (response.body === null || response.body === '')),
      'status=' + response.status + ' body=' + String(response.body));
    check('mundur ke no-cors sekali', noCorsCalls >= 1);
  }

  console.log('\n3 — CORS balas non-OK (mis. 403) juga tidak dipalsukan jadi 200');
  {
    const fetchImpl = (input, init) => {
      if (init && init.mode === 'cors') return Promise.resolve(new FakeResponse('forbidden', { status: 403, type: 'cors' }));
      return Promise.resolve(opaque());
    };
    const { listeners } = runSw(fetchImpl);
    const response = await callFetchHandler(listeners, { url: PUTER, method: 'GET', mode: 'no-cors' });
    check('403 tidak dibungkus jadi 200 OK', response.status !== 200, 'status=' + response.status);
  }

  console.log('\n4 — lalu lintas mode CORS tidak disentuh (header auth harus utuh)');
  {
    let touched = false;
    const fetchImpl = () => { touched = true; return Promise.resolve(new FakeResponse('x', { status: 200 })); };
    const { listeners } = runSw(fetchImpl);
    const response = callFetchHandler(listeners, { url: 'https://fiezel-core.puter.work/api', method: 'GET', mode: 'cors' });
    check('request mode cors dilewatkan tanpa respondWith', response === null);
    check('tidak ada fetch tambahan yang dipicu', touched === false);
  }

  console.log('\n5 — gate sumber');
  {
    check('tidak ada lagi new Response(response.body, {status:200}) dari opaque',
      !/const response=await fetch\(request,\{mode:'no-cors'[\s\S]{0,400}new Response\(response\.body,\{status:200/.test(SW_SRC));
    check('mode cors dicoba di dalam wrapper', /mode:'cors'/.test(SW_SRC));
    check('install/activate tetap satu listener masing-masing',
      (SW_SRC.match(/addEventListener\('install'/g) || []).length === 1 &&
      (SW_SRC.match(/addEventListener\('activate'/g) || []).length === 1);
    check('version.js tidak ikut diubah',
      fs.readFileSync(path.join(__dirname, 'version.js'), 'utf8').indexOf("'5.19.0'") !== -1);
  }

  console.log('');
  if (failures) { console.log(failures + ' gate GAGAL'); process.exit(1); }
  console.log('semua gate sw-corp LOLOS');
}

main().catch(error => { console.error(error); process.exit(1); });
