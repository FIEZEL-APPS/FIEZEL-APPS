// Harness untuk features/neural-voice/fiezel-diag-panel.js
// Menguji tiga jalur yang tidak bisa diuji di device: key tidak ada, API storage
// tidak tersedia, dan jalur normal. Tidak menyentuh jaringan atau file sistem.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = fs.readFileSync(
  path.join(__dirname, 'features/neural-voice/fiezel-diag-panel.js'), 'utf8');

let failures = 0;
function check(label, condition, detail) {
  if (condition) { console.log('  ok   ' + label); return; }
  failures++;
  console.log('  FAIL ' + label + (detail ? ' — ' + detail : ''));
}

function makeElement(tag) {
  return {
    tagName: tag, children: [], listeners: {}, style: {}, dataset: {},
    id: '', className: '', type: '', textContent: '', value: '',
    readOnly: false, spellcheck: true,
    classList: {
      _set: new Set(),
      add(name) { this._set.add(name); },
      remove(name) { this._set.delete(name); },
      contains(name) { return this._set.has(name); }
    },
    setAttribute(name, value) { this.dataset[name] = value; },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener(name, handler) { this.listeners[name] = handler; }
  };
}

function makeSandbox(options) {
  const body = makeElement('body');
  const store = options.store || {};
  const sandbox = {
    console,
    setTimeout,
    Promise,
    JSON,
    Date,
    Object,
    String,
    document: {
      readyState: 'complete',
      body,
      createElement: makeElement,
      addEventListener() {}
    },
    location: { origin: 'https://fiezel-apps.github.io', href: 'https://fiezel-apps.github.io/FIEZEL-APPS/' },
    navigator: options.navigator !== undefined ? options.navigator : { userAgent: 'test-ua' },
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; }
    },
    matchMedia: options.matchMedia || (() => ({ matches: false })),
    FIEZEL_VERSION: '5.19.0'
  };
  if (options.caches !== undefined) sandbox.caches = options.caches;
  if (options.crossOriginIsolated !== undefined) sandbox.crossOriginIsolated = options.crossOriginIsolated;
  if (options.FiezelVoiceRuntime !== undefined) sandbox.FiezelVoiceRuntime = options.FiezelVoiceRuntime;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return { sandbox, body };
}

function run(options) {
  const { sandbox, body } = makeSandbox(options);
  vm.runInContext(SOURCE, sandbox);
  const host = body.children.find(c => c.id === 'fiezelDiagHost');
  if (!host) return { host: null };
  const open = host.children.find(c => c.id === 'fiezelDiagOpen');
  const sheet = host.children.find(c => c.id === 'fiezelDiagSheet');
  const text = sheet && sheet.children.find(c => c.id === 'fiezelDiagText');
  const bar = sheet && sheet.children.find(c => c.id === 'fiezelDiagBar');
  return { host, open, sheet, text, bar, sandbox };
}

function fakeCaches(entries) {
  return {
    keys: () => Promise.resolve(Object.keys(entries)),
    open: (name) => Promise.resolve({
      keys: () => Promise.resolve((entries[name] || []).map(e => ({ url: e.url }))),
      match: (request) => {
        const found = (entries[name] || []).find(e => e.url === request.url);
        return Promise.resolve(found ? {
          headers: { get: (h) => found.headers[h.toLowerCase()] || null }
        } : undefined);
      }
    })
  };
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

async function main() {
  console.log('diag-panel-test');

  console.log('\nkasus 1 — key diagnostics TIDAK ADA, semua API storage hilang');
  {
    const ui = run({ store: {}, caches: undefined, navigator: { userAgent: 'ua' } });
    check('panel ter-mount', !!ui.host);
    check('tombol Diagnostics ada', ui.open && ui.open.textContent === 'Diagnostics');
    ui.open.listeners.click();
    await settle(); await settle();
    check('sheet terbuka', ui.sheet.classList.contains('open'));
    const dump = JSON.parse(ui.text.value);
    check('target = null, bukan throw', dump.target === null, JSON.stringify(dump.target));
    check('storageEstimate menjelaskan ketidaktersediaan',
      String(dump.storageEstimate).indexOf('tidak tersedia') !== -1, String(dump.storageEstimate));
    check('cacheInventory menjelaskan ketidaktersediaan',
      String(dump.cacheInventory).indexOf('tidak tersedia') !== -1, String(dump.cacheInventory));
    check('runtimeStatus tidak meledak',
      String(dump.runtimeStatus).indexOf('tidak ada') !== -1, String(dump.runtimeStatus));
  }

  console.log('\nkasus 2 — jalur normal: key ada, kuota habis, cache separuh terisi');
  {
    const diagLog = JSON.stringify([
      { t: 1, v: '5.19.0', phase: 'bootstrap_loaded' },
      { t: 2, v: '5.19.0', patch: 'ios-cache-v1', phase: 'wasm_prime_failed', error: 'QuotaExceededError' }
    ]);
    const ui = run({
      store: { 'fiezel-neural-voice-diagnostics-v1': diagLog },
      crossOriginIsolated: true,
      navigator: {
        userAgent: 'iPhone',
        standalone: true,
        storage: { estimate: () => Promise.resolve({ quota: 52428800, usage: 51000000 }) },
        serviceWorker: { controller: { scriptURL: 'https://x/sw.js', state: 'activated' } }
      },
      caches: fakeCaches({
        'fiezel-v5.19.0': [
          { url: 'https://x/FIEZEL-APPS/index.html', headers: {} },
          { url: 'https://x/FIEZEL-APPS/vendor/kokoro-js/wasm/ort-wasm-simd-threaded.jsep.wasm',
            headers: { 'content-length': '21596019', 'content-type': 'application/wasm' } }
        ]
      }),
      FiezelVoiceRuntime: {
        diagnostics: () => JSON.parse(diagLog),
        status: () => ({ phase: 'error', prepared: false })
      }
    });
    ui.open.listeners.click();
    await settle(); await settle(); await settle();
    const dump = JSON.parse(ui.text.value);
    check('target terbaca utuh', dump.target === diagLog);
    check('runtimeDiagnostics terparse jadi array', Array.isArray(dump.runtimeDiagnostics));
    check('standalone terdeteksi true', dump.standalone === true);
    check('crossOriginIsolated terbaca', dump.crossOriginIsolated === true);
    check('quota & usage terisi angka',
      dump.storageEstimate.quota === 52428800 && dump.storageEstimate.usage === 51000000);
    check('available terhitung', dump.storageEstimate.available === 1428800);
    check('swController terbaca', dump.swController && dump.swController.state === 'activated');
    const cache = dump.cacheInventory[0];
    check('entryCount cache benar', cache.entryCount === 2, String(cache.entryCount));
    check('hanya aset kokoro yang didaftar', cache.neuralAssets.length === 1);
    check('WASM tercatat lengkap dengan MIME',
      cache.neuralAssets[0].contentLength === '21596019' &&
      cache.neuralAssets[0].contentType === 'application/wasm');
    check('model 92MB memang TIDAK ada di cache',
      !cache.neuralAssets.some(a => a.asset.indexOf('model_quantized.onnx') !== -1));
    check('diagBuild tampil', typeof dump.diagBuild === 'string' && dump.diagBuild.length > 0);
  }

  console.log('\nkasus 3 — estimate() dan caches.keys() menolak');
  {
    const ui = run({
      store: { 'fiezel-neural-voice-diagnostics-v1': '[]' },
      navigator: {
        userAgent: 'ua',
        storage: { estimate: () => Promise.reject(new Error('boom-estimate')) }
      },
      caches: { keys: () => Promise.reject(new Error('boom-caches')) }
    });
    ui.open.listeners.click();
    await settle(); await settle();
    const dump = JSON.parse(ui.text.value);
    check('error estimate tertangkap, bukan crash',
      String(dump.storageEstimate).indexOf('boom-estimate') !== -1, String(dump.storageEstimate));
    check('error caches tertangkap, bukan crash',
      String(dump.cacheInventory).indexOf('boom-caches') !== -1, String(dump.cacheInventory));
    check('target tetap terbaca meski sisanya gagal', dump.target === '[]');
  }

  console.log('\nkasus 4 — mount dua kali tidak menduplikasi tombol');
  {
    const { sandbox, body } = makeSandbox({ store: {} });
    vm.runInContext(SOURCE, sandbox);
    vm.runInContext(SOURCE, sandbox);
    check('hanya satu host di body',
      body.children.filter(c => c.id === 'fiezelDiagHost').length === 1,
      String(body.children.length));
  }

  console.log('\nkasus 5 — m025-124: panelnya bisa digulir, dan bank tombol basi tidak kembali');
  {
    // OWNER: "PANELNYA PENUH, DAN GA BISA DI GERAKIN ATAU DI SCROLL SAMA SEKALI".
    // Sebabnya aritmetika flexbox: kolom setinggi layar tanpa overflow, dengan textarea
    // flex:1 yang menyusut sampai nyaris nol begitu isi di atasnya melebihi layar. Kedua
    // sisi perbaikannya dijaga, karena memperbaiki satu saja tidak menyelesaikan apa pun.
    check('sheet diagnostik menggulir sendiri',
      /#fiezelDiagSheet\{[^]*?overflow-y:auto/.test(SOURCE) || SOURCE.indexOf('overflow-y:auto;-webkit-overflow-scrolling:touch') !== -1,
      'sheet tanpa overflow: isi yang melebihi layar terpotong tanpa jalan menggulirnya');
    check('kotak diagnostik berhenti menyusut sampai nol',
      SOURCE.indexOf('min-height:46vh') !== -1,
      'textarea masih flex:1 dengan min-height:0, jadi ia yang mengorbankan diri lebih dulu');
    check('bank tombol PCM dan LANGKAH tidak kembali',
      !/PCM: NADA UJI|LANGKAH: 16|setPcmDiagnosticMode\(mode/.test(SOURCE),
      'tombol penyelidikan m025-64..72 hidup lagi dan memenuhi seluruh layar panel');
    check('sisa setelan uji lama dibersihkan, bukan ditinggal tanpa jalan keluar',
      SOURCE.indexOf("setPcmDiagnosticMode('', root)") !== -1 && SOURCE.indexOf('setDenoiseSteps(0, root)') !== -1,
      'tombolnya hilang tanpa ada yang mematikan arm yang tersimpan di localStorage');
  }

  console.log('');
  if (failures) { console.log(failures + ' gate GAGAL'); process.exit(1); }
  console.log('semua gate diag-panel LOLOS');
}

main().catch(error => { console.error(error); process.exit(1); });
