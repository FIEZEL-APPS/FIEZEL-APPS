/**
 * FIEZEL gate — SINYAL KARTU PEMBARUAN HARUS BENAR-BENAR BISA MAJU.
 *
 * Latar. Gerbang lama (update-prompt-test.js) hanya memeriksa BENTUK berkas: markup ada,
 * skipWaiting berpagar, muat ulang dijaga. Semuanya hijau sementara kartunya TIDAK PERNAH
 * muncul di perangkat yang sudah terpasang, karena sinyal "ada versi baru" dibangun di atas
 * ./VERSION.json yang di produksi TIDAK PERNAH berubah (isi semver beku '5.19.0'; hanya
 * content-adoption.js:84 yang menulisnya, dan itu ke direktori STAGING).
 *
 * Gerbang ini menjalankan modulnya di sandbox dan memeriksa EMPAT perilaku yang membedakan
 * "kode benar" dari "kode benar yang tidak pernah menyala":
 *   P1 build halaman live lebih baru -> kartu muncul walau VERSION.json beku;
 *   P2 kandidat SW menunggu tetapi sinyal remote tak terbaca -> kartu TETAP muncul;
 *   P3 tidak ada yang baru -> kartu TIDAK muncul (anti-vakum, dua arah);
 *   P4 muat ulang TIDAK pernah dipicu tanpa penekanan tombol murid.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'features', 'ui', 'fiezel-update-prompt.js'), 'utf8');

let failures = 0;
const hasil = [];
function check(name, ok, detail) {
  hasil.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
  if (!ok) failures++;
}

/**
 * Menjalankan modul di sandbox. `opts` mengendalikan dunia luar:
 *   version/build : isi VERSION.json & coordination/BUILD-VERSION.json (null = gagal unduh)
 *   waiting       : worker yang menunggu (atau null)
 *   swRev         : jawaban health-check worker aktif ('' = tidak menjawab)
 */
async function jalankan(opts) {
  const state = { shown: false, reload: 0, pinged: 0 };
  const banner = {
    hidden: false,
    classList: {
      _s: new Set(['hidden']),
      add(c) { this._s.add(c); if (c === 'show') state.shown = true; },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  const doc = {
    readyState: 'complete',
    getElementById(id) { return id === 'updateBanner' ? banner : null; },
    addEventListener() {},
    querySelectorAll() { return []; }
  };
  const controller = {
    state: 'activated',
    postMessage(msg, ports) {
      if (msg && msg.type === 'FIEZEL_HEALTH_PING') {
        state.pinged++;
        if (opts.swRev && ports && ports[0]) ports[0].postMessage({ type: 'FIEZEL_HEALTH_PONG', swRev: opts.swRev });
      }
    }
  };
  const reg = {
    waiting: opts.waiting || null,
    installing: null,
    active: { state: 'activated' },
    update: async () => {},
    addEventListener() {}
  };
  function MessageChannelStub() {
    const port1 = {}, port2 = {};
    port2.postMessage = (data) => { if (typeof port1.onmessage === 'function') port1.onmessage({ data }); };
    return { port1, port2 };
  }
  const sandbox = {
    console, Promise, Symbol, Date, Math, JSON, String, Number, parseInt,
    setTimeout, clearTimeout,
    setInterval: () => ({ unref() {} }),
    clearInterval: () => {},
    addEventListener() {},
    MessageChannel: MessageChannelStub,
    sessionStorage: { _m: new Map(), getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }, setItem(k, v) { this._m.set(k, String(v)); }, removeItem(k) { this._m.delete(k); } },
    location: { reload() { state.reload++; } },
    navigator: {
      onLine: true,
      serviceWorker: {
        controller,
        addEventListener() {},
        getRegistration: async () => reg
      }
    },
    document: doc,
    fetch: async (url) => {
      const u = String(url);
      /* UJI 'BUILD-VERSION.json' LEBIH DULU: '…VERSION.json'.includes('VERSION.json') juga
       * benar, jadi urutan terbalik akan salah mengarahkan permintaan build ke versi. */
      if (u.includes('BUILD-VERSION.json')) return opts.build === null ? { ok: false } : { ok: true, json: async () => ({ version: opts.build }) };
      if (u.includes('VERSION.json')) return opts.version === null ? { ok: false } : { ok: true, json: async () => ({ version: opts.version }) };
      return { ok: false };
    }
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  sandbox.self.FIEZEL_VERSION = '5.19.0';         // beku, sama seperti produksi
  sandbox.self.FIEZEL_PAGE_BUILD = 'm025-491';    // build halaman yang sedang berjalan
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'fiezel-update-prompt.js' });
  // Modul self-start -> check(true) berjalan async; beri waktu microtask + setTimeout(16ms).
  await new Promise((r) => setTimeout(r, 80));
  return state;
}

(async () => {
  /* P1: VERSION.json BEKU (5.19.0 == APP_VERSION) tetapi build halaman live lebih baru.
   * Inilah kegagalan aslinya: sebelum m025-492 ini tampil sebagai "tidak ada yang baru". */
  {
    const s = await jalankan({ version: '5.19.0', build: 'm025-500', waiting: null, swRev: '' });
    check('P1 build live lebih baru -> kartu muncul walau VERSION.json beku', s.shown, 'shown=' + s.shown);
  }

  /* P1b: build live SAMA -> tidak boleh muncul (anti-vakum pada sumbu yang sama). */
  {
    const s = await jalankan({ version: '5.19.0', build: 'm025-491', waiting: null, swRev: 'm025-491-unified-grammar-20261002' });
    check('P1b build live sama -> kartu TIDAK muncul', !s.shown, 'shown=' + s.shown);
  }

  /* P2: kandidat SW menunggu, tetapi kedua sinyal remote tak terbaca (jaringan gagal).
   * Kartu WAJIB muncul - kandidat baru sudah ada di perangkat; menyimpulkan "tak ada yang
   * baru" dari penanda lokal yang basi persis bug yang membuat PWA terpasang membeku. */
  {
    const s = await jalankan({ version: null, build: null, waiting: { state: 'installed' }, swRev: '' });
    check('P2 kandidat SW menunggu + remote tak terbaca -> kartu muncul', s.shown, 'shown=' + s.shown);
  }

  /* P3: benar-benar tidak ada yang baru, tidak ada kandidat, revisi shell cocok -> senyap. */
  {
    const s = await jalankan({ version: '5.19.0', build: 'm025-491', waiting: null, swRev: 'm025-491-unified-grammar-20261002' });
    check('P3 tidak ada yang baru -> kartu TIDAK muncul', !s.shown, 'shown=' + s.shown);
  }

  /* P4: apa pun yang terjadi, modul tidak boleh memuat ulang sendiri tanpa tombol murid. */
  {
    const s = await jalankan({ version: '5.19.0', build: 'm025-500', waiting: null, swRev: '' });
    check('P4 muat ulang tidak dipicu tanpa penekanan tombol murid', s.reload === 0, 'reload=' + s.reload);
  }

  /* P5: jaring pengaman terakhir - sinyal remote tak terbaca, tak ada kandidat terlihat,
   * TETAPI worker aktif melaporkan revisi shell yang berbeda dari build halaman lokal. */
  {
    const s = await jalankan({ version: null, build: null, waiting: null, swRev: 'm025-480-unified-grammar-20260930' });
    check('P5 revisi shell aktif beda dari build halaman -> kartu muncul', s.shown, 'shown=' + s.shown);
    check('P5b health-check benar-benar ditanyakan (bukan ditebak)', s.pinged > 0, 'pinged=' + s.pinged);
  }

  for (const h of hasil) {
    console.log((h.ok ? '  ok  ' : 'FAIL  ') + h.name + (h.detail ? '   [' + h.detail + ']' : ''));
  }
  console.log('\n' + (hasil.length - failures) + '/' + hasil.length + ' lulus');
  process.exit(failures ? 1 : 0);
})();
