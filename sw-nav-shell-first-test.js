// m025-211 — gerbang: peluncuran PWA terpasang dilayani CANGKANG generasi ini, bukan jaringan.
//
// SEJARAH BERKAS INI. Ia lahir sebagai `sw-nav-budget-test.js` (m025-201), yang menjaga satu
// anggaran waktu 2,5 detik supaya navigasi tidak tersandera jaringan yang MENGGANTUNG. Anggaran
// itu bekerja - tetapi ia menjawab keluhan yang salah. Sesudahnya OWNER melapor lagi:
// "aman tapi sedikit lambat", dan pengukurannya membenarkan dia:
//
//   dengan 181 berkas cangkang SUDAH tersimpan di perangkat
//   jaringan sehat ......... FCP    60 ms
//   jaringan lambat ........ FCP   752 ms
//   jaringan menggantung ... FCP  2556 ms
//
// Setiap peluncuran membayar satu perjalanan jaringan penuh untuk dokumen yang salinannya
// sudah ada di perangkat.
//
// DAN ADA YANG LEBIH SERIUS DARIPADA LAMBAT. Seluruh aset cangkang non-navigasi dilayani
// cache-first di dalam generasinya; hanya DOKUMEN yang diambil dari jaringan. Jadi ketika
// build baru terbit sementara SW lama masih aktif - dan ia memang masih aktif, karena sw.js
// sengaja tidak pernah memanggil skipWaiting() - murid menerima index.html build N+1 yang
// berjalan di atas JavaScript build N. Terukur di peramban: dokumen membawa penanda terbitan
// baru sementara core-config.js masih membawa penanda lama. Cabang yang dimaksudkan mencegah
// cangkang tak sepadan justru MEMBUATNYA.
//
// KENAPA GERBANG LAMA TIDAK MELIHATNYA. Ia meng-assert MEKANISME, bukan sifat: "posisi
// `fetch(` harus lebih kecil daripada posisi `caches.match(`". Assert semacam itu mengunci
// SATU cara menulis kode, dan ketika cara itu sendiri yang keliru, gerbangnya ikut membela
// kekeliruan. Karena itu berkas ini MENJALANKAN pendengar fetch sungguhan dari sw.js di atas
// cache tiruan yang benar-benar menyimpan, lalu menguji SIFAT yang ingin kita punya - bukan
// urutan kata di dalam berkas.
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
  const log = { fetches: [], puts: [], waitUntil: 0, matchArgs: [] };

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
  /* clone() WAJIB ada. Tanpa itu `r.clone()` di jalur sukses melempar dan seluruh cabang
   * jatuh ke penanganan galat - dulu itu membuatku hampir menuduh cacat produk yang tidak
   * ada. Harness yang tidak meniru API sungguhan menghasilkan tuduhan palsu, dan tuduhan
   * palsu sama mahalnya dengan cacat yang terlewat. */
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

  /* Cache tiruan yang BENAR-BENAR menyimpan, dan menyimpan per NAMA cache. Tanpa itu
   * "dokumen dan aset segenerasi" tidak bisa diuji sama sekali - dan justru itu sifat yang
   * paling mahal kalau hilang. */
  const gudang = new Map();                       // namaCache -> Map(url -> ResponseStub)
  const ambilCache = (nama) => {
    if (!gudang.has(nama)) gudang.set(nama, new Map());
    return gudang.get(nama);
  };
  if (opsi.adaCangkang) {
    ambilCache(opsi.namaShell).set('https://fiezel.my.id/app/index.html',
      new ResponseStub('CANGKANG-GENERASI-INI', { ok: true }));
    /* Halaman shell KEDUA. Tanpa ini, gerbang tidak bisa melihat cabang navigasi yang
     * menyajikan index.html untuk setiap navigasi - dan bentuk pertama perbaikan m025-211
     * melakukan tepat itu, yang akan membuat dasbor kreator tidak pernah bisa dibuka. */
    ambilCache(opsi.namaShell).set('https://fiezel.my.id/app/creator-report-dashboard.html',
      new ResponseStub('CANGKANG-DASBOR-KREATOR', { ok: true }));
  }

  const sandbox = {
    console, URL, Promise, Symbol, setTimeout, clearTimeout, Date,
    Request: RequestStub, Response: ResponseStub, Headers: HeadersStub,
    importScripts: () => {},
    caches: {
      open: (nama) => Promise.resolve({
        addAll: () => Promise.resolve(),
        put: (k, v) => { log.puts.push({ cache: nama, url: k && k.url, body: v && v.body }); ambilCache(nama).set(k && k.url, v); return Promise.resolve(); },
        keys: () => Promise.resolve([])
      }),
      match: (req, opt) => {
        const nama = opt && opt.cacheName;
        log.matchArgs.push(nama);
        const url = typeof req === 'string'
          ? new URL(req, 'https://fiezel.my.id/app/').toString()
          : (req && req.url);
        if (!nama) return Promise.resolve(undefined);
        return Promise.resolve(ambilCache(nama).get(url));
      },
      keys: () => Promise.resolve([...gudang.keys()])
    },
    fetch: (req) => {
      log.fetches.push(req && req.url);
      if (opsi.jaringan === 'gantung') return new Promise(() => {});
      if (opsi.jaringan === 'tolak') return Promise.reject(new Error('offline'));
      if (opsi.jaringan === 'rusak') {
        return new Promise(r => setTimeout(() => r(new ResponseStub('GALAT-SERVER-500', { ok: false, status: 500 })), opsi.lambatMs || 0));
      }
      return new Promise(r => setTimeout(() => r(new ResponseStub('DOKUMEN-BARU-DARI-JARINGAN', { ok: true })), opsi.lambatMs || 0));
    },
    clients: { matchAll: () => Promise.resolve([]), openWindow: () => Promise.resolve() }
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.FIEZEL_VERSION = '5.19.0';
  sandbox.location = { origin: 'https://fiezel.my.id' };
  sandbox.registration = { scope: 'https://fiezel.my.id/app/', update: () => Promise.resolve() };
  const pendengar = {};
  sandbox.addEventListener = (jenis, fn) => { (pendengar[jenis] = pendengar[jenis] || []).push(fn); };

  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'sw.js' });

  const tembakNavigasi = (url) => {
    let dijawab = null;
    const event = {
      request: new RequestStub({ url: url || 'https://fiezel.my.id/app/index.html', mode: 'navigate' }),
      respondWith: (p) => { dijawab = p; },
      waitUntil: (p) => { log.waitUntil++; if (p && p.catch) p.catch(() => {}); }
    };
    (pendengar.fetch || []).forEach(fn => fn(event));
    return dijawab;
  };
  return { tembakNavigasi, log, gudang, namaShell: sandbox.SHELL_CACHE };
}

const tunggu = (ms) => new Promise(r => setTimeout(r, ms));
const balapan = (p, ms) => Promise.race([
  Promise.resolve(p).then(v => ({ v }), e => ({ tolak: e })),
  tunggu(ms).then(() => ({ habis: true }))
]);

/* Nama cache generasi ini dibaca dari sw.js sendiri, bukan diketik ulang: kalau pola
 * penamaannya berubah, gerbang ini harus ikut tahu, bukan diam-diam menguji nama mati. */
/* Komentar dibuang SEBELUM memindai pemanggilan. Kalau tidak, satu komentar yang MENJELASKAN
 * kenapa skipWaiting() tidak dipakai akan dibaca sebagai pemanggilan skipWaiting() - dan
 * gerbang ini memerah karena prosanya, bukan karena kodenya. Itu terjadi pada percobaan
 * pertama berkas ini, tepat seperti sebelumnya di sesi ini ketika sebuah komentar HTML
 * memerahkan gerbang splash. Yang ingin diuji adalah PEMANGGILAN, bukan kemunculan kata. */
const kodeSaja = src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const revMatch = /const SW_REV='([^']+)';/.exec(src);
const NAMA_SHELL = 'fiezel-shell-' + (revMatch ? revMatch[1] : '???');

(async () => {
  /* (A) KELUHAN OWNER SEBAGAI SIFAT: peluncuran TIDAK BOLEH menunggu jaringan.
   *     Jaringannya sengaja SEHAT tapi lambat (800 ms). Bentuk network-first yang lama
   *     LULUS uji "menggantung" namun GAGAL di sini - dan justru inilah yang dirasakan
   *     murid setiap hari, karena jaringan yang lambat jauh lebih umum daripada yang mati. */
  {
    const sw = bikinSW({ jaringan: 'sehat', lambatMs: 800, adaCangkang: true, namaShell: NAMA_SHELL });
    const mulai = Date.now();
    const hasil = await balapan(sw.tembakNavigasi(), 3000);
    const lama = Date.now() - mulai;
    check('A cangkang ada => dijawab TANPA menunggu jaringan (< 200 ms walau jaringan 800 ms)',
      !hasil.habis && hasil.v && hasil.v.body === 'CANGKANG-GENERASI-INI' && lama < 200,
      'lama=' + lama + 'ms body=' + (hasil.v && hasil.v.body));
  }

  /* (B) Jaringan menggantung: sifat yang sama, sekarang gratis. */
  {
    const sw = bikinSW({ jaringan: 'gantung', adaCangkang: true, namaShell: NAMA_SHELL });
    const mulai = Date.now();
    const hasil = await balapan(sw.tembakNavigasi(), 3000);
    check('B jaringan MENGGANTUNG => cangkang tetap disajikan, dan seketika',
      !hasil.habis && hasil.v && hasil.v.body === 'CANGKANG-GENERASI-INI' && (Date.now() - mulai) < 200,
      hasil.habis ? 'masih menggantung' : 'body=' + (hasil.v && hasil.v.body));
    check('B permintaan jaringan tetap dijaga hidup lewat waitUntil (cache disegarkan)',
      sw.log.waitUntil >= 1, 'waitUntil ' + sw.log.waitUntil + 'x');
  }

  /* (C) KOHERENSI GENERASI - cacat yang gerbang lama tidak bisa lihat.
   *     Dokumen HARUS dibaca dari cache yang SAMA dengan aset lain, yaitu SHELL_CACHE yang
   *     berkunci SW_REV. Selama itu benar, dokumen dan aset tidak mungkin berselisih
   *     generasi, karena activate menghapus setiap generasi lain. */
  {
    const sw = bikinSW({ jaringan: 'sehat', lambatMs: 5, adaCangkang: true, namaShell: NAMA_SHELL });
    const hasil = await balapan(sw.tembakNavigasi(), 3000);
    check('C dokumen dibaca dari SHELL_CACHE generasi ini, bukan dari jaringan',
      !hasil.habis && hasil.v && hasil.v.body === 'CANGKANG-GENERASI-INI',
      'body=' + (hasil.v && hasil.v.body));
    check('C pencarian cangkang memang menyebut nama cache generasi ini',
      sw.log.matchArgs.includes(NAMA_SHELL),
      'nama yang dipakai: ' + JSON.stringify(sw.log.matchArgs.slice(0, 4)));
  }

  /* (D) Penyembuhan diri: setiap peluncuran menimpa dokumen cache dengan yang segar, jadi
   *     dokumen usang atau rusak hilang pada peluncuran BERIKUTNYA. Ini pengganti yang jujur
   *     untuk penyembuhan-di-peluncuran-yang-sama milik bentuk lama. */
  {
    const sw = bikinSW({ jaringan: 'sehat', lambatMs: 5, adaCangkang: true, namaShell: NAMA_SHELL });
    await balapan(sw.tembakNavigasi(), 3000);
    await tunggu(120);
    const tersimpan = sw.gudang.get(NAMA_SHELL);
    const isi = tersimpan && tersimpan.get('https://fiezel.my.id/app/index.html');
    check('D revalidasi latar menimpa dokumen cache dengan yang baru (sembuh di peluncuran berikutnya)',
      !!isi && isi.body === 'DOKUMEN-BARU-DARI-JARINGAN', 'isi cache=' + (isi && isi.body));
    check('D tulisannya masuk ke SHELL_CACHE, bukan cache lain',
      sw.log.puts.some(p => p.cache === NAMA_SHELL), JSON.stringify(sw.log.puts.map(p => p.cache)));
  }

  /* (E) Respons TIDAK ok tidak boleh meracuni cangkang. Satu 502 dari hosting yang sedang
   *     bermasalah akan terbawa ke setiap peluncuran berikutnya kalau ini bocor. */
  {
    const sw = bikinSW({ jaringan: 'rusak', lambatMs: 5, adaCangkang: true, namaShell: NAMA_SHELL });
    await balapan(sw.tembakNavigasi(), 3000);
    await tunggu(120);
    const isi = sw.gudang.get(NAMA_SHELL).get('https://fiezel.my.id/app/index.html');
    check('E respons 500 TIDAK ditulis ke cangkang (cangkang lama yang benar dipertahankan)',
      !!isi && isi.body === 'CANGKANG-GENERASI-INI', 'isi cache=' + (isi && isi.body));
  }

  /* (F) Pemasangan pertama: belum ada cangkang => jaringan, dan dokumennya disajikan. */
  {
    const sw = bikinSW({ jaringan: 'sehat', lambatMs: 10, adaCangkang: false, namaShell: NAMA_SHELL });
    const hasil = await balapan(sw.tembakNavigasi(), 3000);
    check('F belum punya cangkang => dokumen jaringan disajikan (pemasangan pertama jalan)',
      !hasil.habis && hasil.v && hasil.v.body === 'DOKUMEN-BARU-DARI-JARINGAN',
      hasil.habis ? 'habis waktu' : 'body=' + (hasil.v && hasil.v.body));
  }

  /* (G) Luring + sudah punya cangkang => cangkang. Inti sebuah PWA. */
  {
    const sw = bikinSW({ jaringan: 'tolak', adaCangkang: true, namaShell: NAMA_SHELL });
    const hasil = await balapan(sw.tembakNavigasi(), 3000);
    check('G luring + punya cangkang => cangkang disajikan',
      !hasil.habis && hasil.v && hasil.v.body === 'CANGKANG-GENERASI-INI',
      hasil.habis ? 'habis waktu' : 'body=' + (hasil.v && hasil.v.body));
  }

  /* (H) Batas jujur: luring DAN belum punya cangkang. Tidak ada yang bisa disajikan, dan
   *     berpura-pura punya sesuatu akan menghasilkan layar kosong permanen. Ia harus MENOLAK
   *     supaya peramban menampilkan galat jaringannya sendiri - jujur, bukan diam. */
  {
    const sw = bikinSW({ jaringan: 'tolak', adaCangkang: false, namaShell: NAMA_SHELL });
    const hasil = await balapan(sw.tembakNavigasi(), 3000);
    check('H luring + belum punya cangkang => menolak jujur, bukan menyajikan kosong',
      !!hasil.tolak, hasil.habis ? 'menggantung' : (hasil.v ? 'body=' + hasil.v.body : 'menolak'));
  }

  /* (J) Setiap navigasi menerima HALAMANNYA SENDIRI. `creator-report-dashboard.html` dan
   *     `creator-report-setup.html` ada di ASSETS dan keduanya halaman sungguhan; cabang
   *     yang menyajikan index.html untuk semua navigasi membuat keduanya hilang diam-diam. */
  {
    const sw = bikinSW({ jaringan: 'gantung', adaCangkang: true, namaShell: NAMA_SHELL });
    const hasil = await balapan(sw.tembakNavigasi('https://fiezel.my.id/app/creator-report-dashboard.html'), 3000);
    check('J navigasi ke halaman shell lain menerima HALAMAN ITU, bukan index.html',
      !hasil.habis && hasil.v && hasil.v.body === 'CANGKANG-DASBOR-KREATOR',
      'body=' + (hasil.v && hasil.v.body));
  }

  /* (K) Rute yang tidak ada di cangkang tetap jatuh ke index.html - itu perilaku SPA yang
   *     benar, dan tanpa cadangan ini tautan dalam yang belum diprecache jadi layar galat. */
  {
    const sw = bikinSW({ jaringan: 'gantung', adaCangkang: true, namaShell: NAMA_SHELL });
    const hasil = await balapan(sw.tembakNavigasi('https://fiezel.my.id/app/rute/tak-dikenal'), 3000);
    check('K rute tak dikenal jatuh ke index.html (cadangan SPA tetap ada)',
      !hasil.habis && hasil.v && hasil.v.body === 'CANGKANG-GENERASI-INI',
      'body=' + (hasil.v && hasil.v.body));
  }

  /* (I) Model generasi tidak boleh bergeser: dokumen lama tidak boleh direbut paksa. */
  {
    check('I tidak ada skipWaiting() - dokumen yang sedang terbuka tidak direbut generasi baru',
      !/skipWaiting\s*\(/.test(kodeSaja));
    check('I tidak ada clients.claim() - klien generasi lama tidak diambil alih di tengah jalan',
      !/clients\.claim\s*\(/.test(kodeSaja));
  }

  fs.writeFileSync(path.join(ROOT, 'SW-NAV-SHELL-FIRST-REPORT.json'),
    JSON.stringify({ schema: 'fiezel-sw-nav-shell-first-v1', pass: !failed, checks }, null, 2));
  for (const c of checks) if (c.status === 'FAIL') console.error('FAIL ' + c.name + (c.details ? ' — ' + c.details : ''));
  console.log('sw-nav-shell-first-test: ' + checks.filter(c => c.status === 'PASS').length + '/' + checks.length +
    ' assert ' + (failed ? 'ADA YANG FAIL' : 'PASS'));
  process.exit(failed ? 1 : 0);
})();
