// m025-201 — gerbang: peluncuran PWA tidak boleh tersandera jaringan yang MENGGANTUNG.
//
// LAPORAN OWNER: "kenapa PWA di iphone yang sudah terinstal harus terhubung ke internet baru
// bisa jalan? perasaanku sebelumnya tidak begitu."
//
// Ia benar pada kedua bagiannya. Sejak 2026-08-26 navigasi di sw.js menjadi network-first,
// dan bentuk itu menunggu jaringan TANPA BATAS WAKTU. Aman selama "tidak ada jaringan"
// berarti fetch MENOLAK - dan memang begitu di mode pesawat. Tetapi keadaan yang paling
// sering dialami murid bukan itu: Wi-Fi sekolah berhalaman-login, atau sinyal satu batang.
// Di sana koneksinya diterima lalu tidak pernah dijawab, jadi fetch MENGGANTUNG.
//
// TERUKUR di Chromium, dengan 181 berkas cangkang sudah tersimpan di cache:
//   jaringan benar-benar mati ..... aplikasi jalan dalam   21 ms
//   jaringan MENGGANTUNG ......... aplikasi TIDAK PERNAH jalan (habis waktu di 30 s)
//
// Gerbang ini MENJALANKAN pendengar fetch sungguhan dari sw.js di atas lingkungan tiruan,
// lalu menembakkan permintaan navigasi dengan fetch yang sengaja menggantung. Yang diuji
// PERILAKU-nya, bukan ada-tidaknya kata 'timeout' di dalam berkas: assert berbasis pola teks
// sudah dua kali dalam sesi ini hijau sementara cacat yang ia namai masih berdiri.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: details || '' });
  if (!ok) failed = true;
};

/* ---------------------------------------------------------------- lingkungan tiruan ------ */
function bikinSW(opsi) {
  const log = { fetches: [], puts: [], waitUntil: 0 };
  const pendengar = {};
  const CANGKANG = opsi.adaCangkang ? new ResponseStub('CANGKANG-DARI-CACHE', { ok: true }) : null;

  /* Response tiruan MEMBAWA penandanya lewat body, bukan lewat properti sendiri: sw.js
   * membungkus setiap jawaban navigasi dengan withCoopCoep() yang membangun Response BARU,
   * jadi properti apa pun yang ditempel di luar body akan hilang di perjalanan. Menguji
   * lewat body berarti menguji jawaban yang BENAR-BENAR sampai ke murid. */
  function HeadersStub(init) {
    this._h = new Map();
    if (init && typeof init.forEach === 'function') init.forEach((v, k) => this._h.set(k, v));
  }
  HeadersStub.prototype.set = function (k, v) { this._h.set(k, v); };
  HeadersStub.prototype.get = function (k) { return this._h.has(k) ? this._h.get(k) : null; };
  HeadersStub.prototype.forEach = function (fn) { this._h.forEach(fn); };
  function ResponseStub(body, init) {
    this.body = body;
    this.status = (init && init.status) || 200;
    this.statusText = (init && init.statusText) || '';
    this.headers = (init && init.headers) || new HeadersStub();
    this.ok = (init && init.ok) !== false;
  }
  /* clone() WAJIB ada. Tanpa itu `r.clone()` di jalur sukses melempar, jatuh ke .catch(),
   * dan cangkang tersaji walau jaringannya sehat - persis kegagalan yang kulihat lebih dulu
   * dan hampir kusangka cacat produk. Harness yang tidak meniru API sungguhan menghasilkan
   * tuduhan palsu, dan tuduhan palsu sama mahalnya dengan cacat yang terlewat. */
  ResponseStub.prototype.clone = function () {
    const c = new ResponseStub(this.body, { status: this.status, statusText: this.statusText, headers: this.headers });
    c.ok = this.ok;
    return c;
  };
  function RequestStub(input, init) {
    const dasar = typeof input === 'string' ? { url: input } : input;
    this.url = dasar.url; this.mode = dasar.mode; this.method = dasar.method || 'GET';
    this.destination = dasar.destination || '';
    this.cache = (init && init.cache) || dasar.cache;
  }

  const sandbox = {
    console, URL, Promise, Symbol, setTimeout, clearTimeout, Date,
    Request: RequestStub,
    Response: ResponseStub,
    Headers: HeadersStub,
    importScripts: () => {},
    caches: {
      open: () => Promise.resolve({ addAll: () => Promise.resolve(), put: (k, v) => { log.puts.push(k && k.url); return Promise.resolve(); }, keys: () => Promise.resolve([]) }),
      match: () => Promise.resolve(CANGKANG),
      keys: () => Promise.resolve([])
    },
    fetch: (req) => {
      log.fetches.push(req && req.url);
      if (opsi.jaringan === 'gantung') return new Promise(() => {});           // tidak pernah selesai
      if (opsi.jaringan === 'tolak') return Promise.reject(new Error('offline'));
      return new Promise(resolve => setTimeout(() => resolve(new ResponseStub('DOKUMEN-BARU-DARI-JARINGAN', { ok: true })), opsi.lambatMs || 0));
    },
    clients: { matchAll: () => Promise.resolve([]), openWindow: () => Promise.resolve() }
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.FIEZEL_VERSION = '5.19.0';
  sandbox.location = { origin: 'https://fiezel.my.id' };
  sandbox.registration = { scope: 'https://fiezel.my.id/app/', update: () => Promise.resolve() };
  sandbox.addEventListener = (jenis, fn) => { (pendengar[jenis] = pendengar[jenis] || []).push(fn); };

  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'sw.js' });

  const tembakNavigasi = () => {
    let dijawab = null;
    const event = {
      request: new RequestStub({ url: 'https://fiezel.my.id/app/index.html', mode: 'navigate' }),
      respondWith: (p) => { dijawab = p; },
      waitUntil: () => { log.waitUntil++; }
    };
    (pendengar.fetch || []).forEach(fn => fn(event));
    return dijawab;
  };
  return { tembakNavigasi, log };
}

const tunggu = (ms) => new Promise(r => setTimeout(r, ms));
const balapan = (p, ms) => Promise.race([p.then(v => ({ v })), tunggu(ms).then(() => ({ habis: true }))]);

(async () => {
  /* (A) INTI LAPORAN OWNER. */
  {
    const sw = bikinSW({ jaringan: 'gantung', adaCangkang: true });
    const jawaban = sw.tembakNavigasi();
    check('A pendengar fetch menjawab permintaan navigasi', !!jawaban);
    const hasil = await balapan(jawaban, 4000);
    check('A jaringan MENGGANTUNG + cangkang ada => cangkang tetap disajikan (tidak menunggu selamanya)',
      !hasil.habis && hasil.v && hasil.v.body === 'CANGKANG-DARI-CACHE',
      hasil.habis ? 'masih menggantung sesudah 4 detik' : 'body=' + (hasil.v && hasil.v.body));
    check('A permintaan jaringan TIDAK dibatalkan - ia dijaga hidup lewat waitUntil supaya cache tetap segar',
      sw.log.waitUntil >= 1, 'waitUntil dipanggil ' + sw.log.waitUntil + 'x');
  }

  /* (B) Jalur sehat WAJIB tidak berubah: jaringan menang, dokumen barunya yang dipakai. */
  {
    const sw = bikinSW({ jaringan: 'sehat', lambatMs: 20, adaCangkang: true });
    const hasil = await balapan(sw.tembakNavigasi(), 3000);
    check('B jaringan sehat => dokumen BARU yang disajikan, bukan cangkang (pemulihan-otomatis utuh)',
      !hasil.habis && hasil.v && hasil.v.body === 'DOKUMEN-BARU-DARI-JARINGAN',
      hasil.habis ? 'habis waktu' : 'body=' + (hasil.v && hasil.v.body));
  }

  /* (C) Luring sungguhan tetap seperti sebelumnya. */
  {
    const sw = bikinSW({ jaringan: 'tolak', adaCangkang: true });
    const hasil = await balapan(sw.tembakNavigasi(), 3000);
    check('C luring sungguhan (fetch menolak) => cangkang, seperti sebelum m025-201',
      !hasil.habis && hasil.v && hasil.v.body === 'CANGKANG-DARI-CACHE',
      hasil.habis ? 'habis waktu' : 'body=' + (hasil.v && hasil.v.body));
  }

  /* (D) Batas jujur: perangkat yang BELUM punya cangkang memang harus menunggu jaringan.
   *     Menyajikan "sesuatu" yang tidak ada bukan perbaikan, dan berpura-pura punya
   *     cangkang akan menghasilkan layar kosong permanen pada pemasangan pertama. */
  {
    const sw = bikinSW({ jaringan: 'gantung', adaCangkang: false });
    const hasil = await balapan(sw.tembakNavigasi(), 3500);
    check('D belum punya cangkang (pemasangan pertama) => tetap menunggu jaringan, bukan menyajikan kosong',
      hasil.habis === true, 'ini batasnya, dan ia disengaja');
  }

  /* (E) Anggarannya nyata dan tidak kelewat longgar. */
  {
    const m = /const NAV_NETWORK_BUDGET_MS=(\d+);/.exec(src);
    check('E anggaran navigasi dideklarasikan sebagai konstanta bernama, bukan angka telanjang', !!m,
      m ? m[1] + ' ms' : 'tidak ketemu');
    check('E anggarannya di bawah 5 detik (di atas itu murid sudah menyerah lebih dulu)',
      !!m && Number(m[1]) > 0 && Number(m[1]) <= 5000, m ? m[1] + ' ms' : '');
  }

  fs.writeFileSync(path.join(ROOT, 'SW-NAV-BUDGET-REPORT.json'),
    JSON.stringify({ schema: 'fiezel-sw-nav-budget-v1', pass: !failed, checks }, null, 2));
  for (const c of checks) if (c.status === 'FAIL') console.error('FAIL ' + c.name + (c.details ? ' — ' + c.details : ''));
  console.log('sw-nav-budget-test: ' + checks.filter(c => c.status === 'PASS').length + '/' + checks.length +
    ' assert ' + (failed ? 'ADA YANG FAIL' : 'PASS'));
  process.exit(failed ? 1 : 0);
})();
