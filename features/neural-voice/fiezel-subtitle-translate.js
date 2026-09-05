/**
 * m025-93 penerjemah subtitle Indonesia, saat berjalan.
 *
 * OWNER memilih menerjemahkan online alih-alih menyiapkan bank terjemahan lebih dulu.
 * Konsekuensinya harus ditanggung di sini, bukan diserahkan ke pemanggil.
 *
 * BATAS PERMINTAAN ADALAH KENDALA UTAMANYA. Worker membatasi 40 permintaan AI per jam
 * per pengguna (AI_RATE_LIMIT_PER_HOUR). Satu sesi membaca bisa melewati angka itu
 * sebelum setengah jalan, dan begitu terlampaui subtitle mati untuk sisa jam tersebut.
 * Maka dua hal berikut bukan optimasi melainkan syarat agar fiturnya hidup sama sekali:
 *
 *   1. SATU BACAAN SATU PERMINTAAN. Yang diterjemahkan adalah seluruh teks yang akan
 *      diucapkan, sekali jalan - bukan per kalimat. Pemecahan kalimatnya dikerjakan
 *      FiezelSubtitle di sisi tampilan, yang memang sudah membaginya untuk penjadwalan.
 *   2. SINGGAH SIMPAN PERMANEN. Kalimat pelajaran diulang berkali-kali selama belajar.
 *      Menerjemahkan ulang yang sudah pernah diterjemahkan hanya menghabiskan jatah
 *      tanpa mengubah hasilnya - teks yang sama selalu menghasilkan terjemahan yang
 *      dianggap sama. Simpanan bertahan lintas sesi, jadi ongkosnya menurun terus.
 *
 * GAGAL HARUS SELALU TENANG. Setelah suara Indonesia dihapus, subtitle adalah satu-
 * satunya jalur bahasa ibu - tetapi ia tetap pelengkap, bukan penghalang. Setiap
 * kegagalan mengembalikan string kosong, dan pemanggil memutar kalimat Inggrisnya
 * seperti biasa tanpa baris di bawahnya. Tidak ada yang boleh melempar ke atas.
 *
 * Terjemahan berjalan lewat Worker terautentikasi, tidak pernah memanggil AI langsung
 * dari client - aturan yang ditegakkan tests/ai-integration-test.js dan tests/core-brain-test.js.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.FiezelSubtitleTranslate = factory(root);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SCHEMA = 'fiezel-subtitle-translate-v1';
  var STORE_KEY = 'fiezel-subtitle-cache-v1';
  var ENDPOINT = '/api/ai/translate';

  var TIMEOUT_MS = 12000;
  var MAX_CHARS = 3000;
  // Simpanan tinggal di localStorage yang lapang tapi tidak tak terbatas. Saat penuh,
  // yang terlama dibuang lebih dulu.
  var MAX_ENTRIES = 400;

  var memory = null;
  var inflight = {};

  /* ---- kunci ----------------------------------------------------------- */

  function normalize(text) {
    return String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  }

  /**
   * Locale sasaran terjemahan, dibaca dari atribut <html lang> yang diset app.js
   * (m025-182 W2-STATE). SENGAJA bukan dari modul i18n: berkas ini tinggal di zona audio
   * dan gerbang audio-locale-guard melarang zona ini menyentuh plumbing locale UI supaya
   * tidak ada jalur yang membocorkannya ke opsi audio (AI-17 F02). Nilai ini hanya
   * menentukan BAHASA SUBTITLE (teks), tidak pernah menyentuh kunci audio.
   */
  function docLocale() {
    try {
      var raw = root.document && root.document.documentElement && root.document.documentElement.lang;
      return /^th(-|$)/i.test(String(raw || '')) ? 'th' : 'id';
    } catch (_) { return 'id'; }
  }

  /**
   * Kunci dihitung dari teks yang sudah dinormalkan, sehingga perbedaan spasi atau
   * baris baru tidak melahirkan dua entri untuk kalimat yang sama.
   *
   * AI-11 F07 (audit v2): simpanan ini device-global, sedangkan ISINYA kalimat berbahasa
   * murid — tanpa dimensi locale, murid Thai di perangkat yang sama akan disuguhi kalimat
   * Indonesia dari simpanan selamanya. Maka kunci diberi dimensi locale secara ADDITIF:
   * bentuk lama TANPA awalan adalah milik id (baseline emas), sehingga seluruh entri lama
   * murid Indonesia tetap terbaca tanpa migrasi; locale lain memakai awalan '<locale>:'.
   * Nama kunci localStorage (STORE_KEY) dan schema TIDAK berubah.
   */
  function keyOf(text, locale) {
    var raw = normalize(text);
    var h = 5381;
    for (var i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
    var base = (h >>> 0).toString(36) + '-' + raw.length;
    var loc = String(locale || docLocale());
    return loc === 'id' ? base : loc + ':' + base;
  }

  /* ---- simpanan -------------------------------------------------------- */

  function load() {
    if (memory) return memory;
    memory = { entries: {}, order: [] };
    try {
      var raw = root.localStorage && root.localStorage.getItem(STORE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.schema === SCHEMA && parsed.entries) {
        memory.entries = parsed.entries;
        memory.order = Array.isArray(parsed.order) ? parsed.order : Object.keys(parsed.entries);
      }
    } catch (_) {}
    return memory;
  }

  function persist() {
    try {
      root.localStorage && root.localStorage.setItem(STORE_KEY, JSON.stringify({
        schema: SCHEMA, entries: memory.entries, order: memory.order
      }));
    } catch (_) {
      // Kuota penuh tidak boleh menjatuhkan subtitle: simpanan dalam memori tetap
      // berlaku untuk sesi ini, dan sesi berikutnya sekadar mulai dari kosong.
    }
  }

  function remember(key, value) {
    var store = load();
    if (!store.entries[key]) store.order.push(key);
    store.entries[key] = value;
    while (store.order.length > MAX_ENTRIES) {
      var oldest = store.order.shift();
      delete store.entries[oldest];
    }
    persist();
  }

  function cached(text, locale) {
    var store = load();
    var hit = store.entries[keyOf(text, locale)];
    return typeof hit === 'string' ? hit : '';
  }

  /* ---- pemanggilan ----------------------------------------------------- */

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return; settled = true;
        reject(new Error('subtitle_translate_timeout'));
      }, ms);
      promise.then(function (v) {
        if (settled) return; settled = true; clearTimeout(timer); resolve(v);
      }, function (e) {
        if (settled) return; settled = true; clearTimeout(timer); reject(e);
      });
    });
  }

  /**
   * Pemanggil Worker disuntikkan supaya modul ini bisa diuji tanpa jaringan, dan
   * supaya jalur autentikasi tetap satu pintu di app.js.
   */
  function workerExec() {
    if (typeof root.coreWorkerExec === 'function') return root.coreWorkerExec;
    if (root.FiezelCore && typeof root.FiezelCore.exec === 'function') return root.FiezelCore.exec;
    return null;
  }

  function readText(response) {
    if (!response) return '';
    if (typeof response === 'string') return response.trim();
    if (typeof response.text === 'string') return response.text.trim();
    // puter.workers.exec mengembalikan objek serupa Response pada jalur galat.
    if (typeof response.json === 'function') {
      return response.json().then(function (d) { return String((d && d.text) || '').trim(); });
    }
    return '';
  }

  /**
   * @param {string} english teks Inggris yang akan diucapkan
   * @returns {Promise<string>} terjemahan Indonesia, atau '' bila tidak tersedia
   */
  function translate(english) {
    var source = normalize(english);
    if (!source) return Promise.resolve('');
    if (source.length > MAX_CHARS) return Promise.resolve('');

    // Sasaran dibekukan SEKALI di awal supaya kunci simpanan, penggabungan inflight,
    // dan badan permintaan selalu memakai locale yang sama meski murid berganti bahasa
    // di tengah permintaan yang sedang berjalan.
    var target = docLocale();

    var hit = cached(source, target);
    if (hit) return Promise.resolve(hit);

    var key = keyOf(source, target);
    // Satu bacaan bisa memicu dua pemanggil sekaligus (mulai memutar dan menyiapkan
    // tampilan). Tanpa penggabungan ini keduanya akan memakan dua jatah untuk hasil
    // yang sama persis.
    if (inflight[key]) return inflight[key];

    var exec = workerExec();
    if (!exec) return Promise.resolve('');

    var request = withTimeout(Promise.resolve().then(function () {
      // Untuk id badan permintaan byte-identik dengan jalur lama (tanpa bidang baru) —
      // baseline emas tidak berubah sedikit pun. Bidang `target` hanya ikut untuk locale
      // non-id, additive terhadap kontrak Worker: server hari ini mengabaikannya dan tetap
      // menjawab Indonesia; dukungan sisi Worker adalah milik W3-PROMPTS-CF
      // (lihat impl/handoff/W3-PROMPTS-CF.md).
      var payload = target === 'id' ? { text: source } : { text: source, target: target };
      return exec(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }), TIMEOUT_MS).then(readText).then(function (text) {
      var value = String(text || '').trim();
      if (value) remember(key, value);
      return value;
    }).catch(function () {
      // Sengaja bisu: subtitle adalah pelengkap, dan kalimat Inggrisnya tetap berbunyi.
      return '';
    }).then(function (value) {
      delete inflight[key];
      return value;
    });

    inflight[key] = request;
    return request;
  }

  function clear() {
    memory = { entries: {}, order: [] };
    try { root.localStorage && root.localStorage.removeItem(STORE_KEY); } catch (_) {}
    return true;
  }

  function stats() {
    var store = load();
    return Object.freeze({
      schema: SCHEMA,
      endpoint: ENDPOINT,
      cached: store.order.length,
      maxEntries: MAX_ENTRIES,
      maxChars: MAX_CHARS,
      timeoutMs: TIMEOUT_MS
    });
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    ENDPOINT: ENDPOINT,
    MAX_CHARS: MAX_CHARS,
    MAX_ENTRIES: MAX_ENTRIES,
    TIMEOUT_MS: TIMEOUT_MS,
    keyOf: keyOf,
    cached: cached,
    translate: translate,
    clear: clear,
    stats: stats
  });
}));
