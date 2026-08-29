/**
 * FIEZEL · features/i18n/fiezel-th-loader.js — PEMUAT DINAMIS ASET LOCALE THAI (W4-MERGE)
 *
 * MENGAPA BERKAS INI ADA. Audit multilingual v2 memutuskan aset Thai TIDAK boleh membebani
 * murid Indonesia: copy-map th, naskah brain th, dan dua dataset th (grammar-explanations-th,
 * vocabulary-th, total ±0,6 MB) tidak ikut precache shell (AI-13 F02/F05) dan tidak dimuat
 * lewat tag <script> statis di index.html. Berkas kecil ini satu-satunya yang selalu dimuat
 * (blok FIEZEL_I18N), dan ia baru bertindak saat FiezelI18n.getLocale() === 'th' — di boot
 * (locale ditarik dari state oleh app.js) ataupun saat murid mengganti bahasa di Pengaturan
 * (onChange). Murid Indonesia: NOL fetch, NOL injeksi, window.FiezelThData tetap undefined —
 * itu kontrak yang diverifikasi smoke test W4.
 *
 * YANG DILAKUKAN SAAT AKTIF (sekali saja — idempoten):
 *   1. Suntik <script> semua copy-th-<domain>.js + naskah-th-brain.js (fail-soft: sampai
 *      termuat, murid th melihat naskah id — pola brainNaskahTh(), handoff W3-BRAIN-TH).
 *   2. Fetch grammar-explanations-th.json + vocabulary-th.json → window.FiezelThData
 *      {grammar, vocab, ready} lalu panggil window.FiezelOnThDataReady() (dipasang app.js;
 *      re-hidrasi bank + invalidasi indeks pencarian, AI-06 F04/F10 + AI-07 F04).
 *   3. Isi CacheStorage locale th (fiezel-locale-th-v1) mengikuti protokol W1-SW §2 —
 *      HALAMAN yang mengisi, SW hanya melayani cache-first; kegagalan per-aset hanya
 *      berarti offline-th belum lengkap, BUKAN kegagalan boot.
 *
 * BATAS: tidak menyentuh zona audio (audio-locale-guard), tidak menulis state, tidak
 * mengubah locale — ia murni konsumen FiezelI18n. Daftar skrip di bawah WAJIB sejalan
 * dengan features/i18n/locale-assets-th.json (koordinasi impl/handoff/W1-SW.md).
 */
(function (root) {
  'use strict';
  if (!root || root.FiezelThLoader) return; // idempoten antar-injeksi ganda
  var doc = typeof document !== 'undefined' ? document : null;

  // Sejalan 1:1 dengan skrip th di locale-assets-th.json (dataset JSON di-fetch, bukan disuntik).
  var TH_SCRIPTS = [
    './features/i18n/copy-th-core.js',
    './features/i18n/copy-th-app-a.js',
    './features/i18n/copy-th-app-b.js',
    './features/i18n/copy-th-app-c.js',
    './features/i18n/copy-th-app-d.js',
    './features/i18n/copy-th-app-e.js',
    './features/i18n/copy-th-app-f.js',
    './features/i18n/copy-th-feat-a.js',
    './features/i18n/copy-th-feat-b.js',
    './features/i18n/copy-th-feat-c.js',
    './features/i18n/copy-th-feat-d.js',
    './features/i18n/copy-th-gems.js',
    './features/i18n/copy-th-quota.js',
    './features/i18n/copy-th-settings-locale.js',
    './features/i18n/copy-th-grammar-labels.js',
    './features/i18n/naskah-th-brain.js'
  ];
  var GRAMMAR_TH = './grammar-explanations-th.json';
  var VOCAB_TH = './vocabulary-th.json';
  var MANIFEST = './features/i18n/locale-assets-th.json';

  var activated = false;

  function fireReady() {
    // Boleh terpanggil berkali-kali (data siap, lalu tiap skrip th selesai dimuat) —
    // penerima di app.js idempoten: re-hidrasi bank + null-kan cache indeks pencarian.
    try { if (typeof root.FiezelOnThDataReady === 'function') root.FiezelOnThDataReady(root.FiezelThData); } catch (_) {}
  }

  function injectScripts() {
    if (!doc || !doc.head) return;
    TH_SCRIPTS.forEach(function (src) {
      // Guard idempoten per-skrip: registerCopy MELEMPAR pada kunci ganda per-locale,
      // jadi memuat copy-th dua kali = boot mati. Cek tag yang ada dulu.
      if (doc.querySelector('script[src="' + src + '"]')) return;
      var s = doc.createElement('script');
      s.src = src;
      s.async = false; // pertahankan urutan tulis, sama seperti defer di blok FIEZEL_I18N
      s.onload = fireReady; // copy yang baru mendarat baru terlihat setelah render ulang
      doc.head.appendChild(s);
    });
  }

  function fetchDatasets() {
    var d = root.FiezelThData;
    var jobs = [
      fetch(GRAMMAR_TH, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw Error(GRAMMAR_TH + ': ' + r.status); return r.json(); }).then(function (j) { d.grammar = j; }),
      fetch(VOCAB_TH, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw Error(VOCAB_TH + ': ' + r.status); return r.json(); }).then(function (j) { d.vocab = j; })
    ];
    // allSettled, bukan all: satu dataset gagal (offline parsial) tidak boleh menahan yang
    // lain — overlay per-dataset di app.js sudah fail-soft (null = tampilan id bertahan).
    return Promise.allSettled(jobs).then(function () {
      d.ready = !!(d.grammar && d.vocab);
      fireReady();
    });
  }

  function fillLocaleCache() {
    // Protokol W1-SW §2 (pola neural-prepare): halaman mengisi cache locale th di latar.
    if (typeof caches === 'undefined' || typeof fetch !== 'function') return;
    fetch(MANIFEST, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw Error('manifest ' + r.status); return r.json(); })
      .then(function (manifest) {
        var name = String(manifest && manifest.cacheName || '');
        var assets = Array.isArray(manifest && manifest.assets) ? manifest.assets : [];
        if (!name || !assets.length) return;
        return caches.open(name).then(function (c) {
          // add() per aset dengan catch sendiri-sendiri: satu font gagal ≠ semua batal
          // (addAll atomik justru perilaku yang W1-SW larang untuk lapisan ini).
          return Promise.allSettled(assets.map(function (p) { return c.add(p).catch(function () {}); }));
        });
      })
      .catch(function () { /* offline-th belum lengkap — coba lagi di aktivasi sesi berikutnya */ });
  }

  function activate() {
    if (activated) return;
    activated = true;
    // Baru di titik ini window.FiezelThData lahir — murid id tidak pernah sampai sini.
    root.FiezelThData = { grammar: null, vocab: null, ready: false };
    injectScripts();
    fetchDatasets();
    fillLocaleCache();
  }

  function maybeActivate() {
    try { if (root.FiezelI18n && root.FiezelI18n.getLocale() === 'th') activate(); } catch (_) {}
  }

  root.FiezelThLoader = { maybeActivate: maybeActivate };
  // Boot: skrip ini dieksekusi SETELAH fiezel-i18n.js (urutan blok FIEZEL_I18N) tapi SEBELUM
  // app.js menarik learnerLocale dari state — jadi jalur nyata aktivasi boot adalah listener
  // onChange di bawah. Pemeriksaan langsung tetap ada untuk harness/VM yang memuat terbalik.
  maybeActivate();
  try { root.FiezelI18n && root.FiezelI18n.onChange && root.FiezelI18n.onChange(maybeActivate); } catch (_) {}
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this)));
