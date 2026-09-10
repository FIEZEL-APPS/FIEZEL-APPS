/**
 * FIEZEL · features/i18n/fiezel-i18n.js — RUNTIME I18N (window.FiezelI18n)
 *
 * MENGAPA BERKAS INI ADA. Audit multilingual v2 menemukan bahwa FIEZEL tidak punya lapisan
 * string sama sekali (AI-02 F01): setiap kalimat Indonesia adalah literal di titik pakainya,
 * dan tidak ada satu pun jahitan untuk menyuntikkan bahasa Thai. Berkas ini adalah jahitan
 * itu — SATU aplikasi, SATU CoreBrain, SATU kurikulum Inggris, DUA learner locale (id, th).
 *
 * KONTRAK (dari brief implementasi + register keputusan audit §22):
 *   - Locale murid adalah STATE, bukan route (AI-14: navigasi murni state, tanpa URL).
 *   - 'id' adalah baseline emas. Fallback: locale aktif → 'id' → kunci mentah. Murid
 *     Indonesia TIDAK PERNAH melihat perubahan apa pun selama copy-map 'id' berisi kalimat
 *     yang byte-identik dengan naskah hari ini — dan itu dijaga gerbang
 *     tests/id-golden-snapshot-test.js, yang menghitung himpunan literal dari app.js + features/**
 *     (termasuk folder ini; karena itu copy-map WAJIB tinggal di features/i18n/).
 *   - Placeholder BERNAMA ({nama}, {waktuReset}) — pola rumah yang sudah terbukti di
 *     features/quota/quota-copy.js dan GEMS_COPY — bukan urutan posisi, karena sintaks Thai
 *     menyusun ulang kalimat.
 *   - TANPA pluralization engine: audit AI-03 menegaskan tidak ada pluralisasi di naskah
 *     (bahasa Indonesia dan Thai sama-sama tanpa infleksi jamak). Kompleksitas yang tidak
 *     dibutuhkan kedua bahasa ini tidak boleh masuk.
 *
 * BATAS YANG TIDAK BOLEH DILANGGAR, dan alasannya:
 *   - JANGAN PERNAH meneruskan locale UI ini ke opsi audio/voice-say. Kunci cache audio
 *     memuat locale; kalau locale UI bocor ke sana, SELURUH korpus berbayar (1.170 aset
 *     ElevenLabs + korpus Deepgram) yatim diam-diam — aset tetap di R2, kuncinya tidak
 *     pernah cocok lagi (AI-17 F02, P0). Gerbang tests/audio-locale-guard-test.js menegakkan ini.
 *   - setLocale() TIDAK menulis state sendiri. Pemanggil (layar Pengaturan) yang menulis
 *     preferences.learnerLocale lewat jalur penulisan state yang sudah ada, lalu wajib
 *     leaveAllStages() + render() — stage stack menyimpan closure gambar berbahasa lama
 *     (AI-14 F03). Listener onChange dipakai untuk: set <html lang>, ganti kelas :lang CSS,
 *     refresh recognizer tutor id-ID → th-TH (AI-17 F03).
 *   - registerCopy() MELEMPAR pada kunci ganda. Tabrakan kunci antar copy-map per-domain
 *     adalah bug ekstraksi yang harus meledak saat boot dev, bukan menimpa diam-diam.
 *
 * GAYA MODUL: UMD-lite tanpa dependensi, tanpa build step — konvensi yang sama dengan ±25
 * modul features/* yang ada (AI-01 F01/F02: buildless, urutan <script defer> di index.html
 * adalah graf dependensinya; berkas ini karenanya dimuat SEBELUM modul mana pun yang
 * memanggil t()).
 *
 * YANG BELUM DIPUTUSKAN OWNER (dicatat, bukan ditebak): kalender Thai (Buddhist Era ±543)
 * → sementara Intl default (Gregorian); persona copy Thai → draft AI wajib review penutur
 * asli sebelum rilis (keputusan provisional orkestrator).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelI18n = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SUPPORTED = ['id', 'th'];          // enum tertutup — HARUS sama dengan enum di server
  var DEFAULT_LOCALE = 'id';             // baseline emas
  var BCP47 = { id: 'id-ID', th: 'th-TH' };
  var STATE_FIELD = 'learnerLocale';     // ditulis ADDITIF ke preferences di state murid
                                         // (pola sanitizeState merge-with-defaults, AI-11 F05)

  var registry = { id: Object.create(null), th: Object.create(null) };
  var current = DEFAULT_LOCALE;
  var listeners = [];
  var availabilityWaiters = [];

  function normalize(loc) {
    return SUPPORTED.indexOf(loc) >= 0 ? loc : DEFAULT_LOCALE;
  }

  /** Daftarkan copy-map untuk satu locale. Dipanggil oleh berkas copy per-domain
   *  (copy-id-<domain>.js, copy-th-<domain>.js) saat boot, sebelum app.js. */
  function registerCopy(locale, map) {
    var normalizedLocale = normalize(locale);
    var box = registry[normalizedLocale];
    Object.keys(map).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(box, k)) {
        throw new Error('fiezel-i18n: kunci ganda "' + k + '" (locale ' + locale + ')');
      }
      box[k] = map[k];
    });
    // Copy Thai dimuat dinamis. Konsumen yang harus menunggu satu permukaan tertentu
    // (mis. onboarding setelah pengguna memilih Thai) tidak boleh menebak waktu jaringan
    // atau menampilkan fallback Indonesia lebih dulu. Bangunkan hanya penunggu yang
    // kuncinya benar-benar sudah terdaftar; kegagalan skrip lain tetap fail-soft.
    for (var i = availabilityWaiters.length - 1; i >= 0; i--) {
      var waiter = availabilityWaiters[i];
      if (waiter.locale !== normalizedLocale || !hasCopy(waiter.locale, waiter.key)) continue;
      availabilityWaiters.splice(i, 1);
      try { waiter.resolve(box[waiter.key]); } catch (_) {}
    }
  }

  /** Timpa kalimat yang sudah terdaftar (lapisan "bahasa murid"). Tidak melempar pada kunci ganda. */
  function overrideCopy(locale, map) {
    var box = registry[normalize(locale)];
    Object.keys(map).forEach(function (k) { box[k] = map[k]; });
  }

  function hasCopy(locale, key) {
    var box = registry[normalize(locale)];
    return Object.prototype.hasOwnProperty.call(box, String(key));
  }

  /**
   * Promise yang selesai saat satu kunci tersedia pada locale ASLINYA (tanpa fallback id).
   * Dipakai layar yang memilih locale sebelum bundle dinamis locale itu sempat mendarat.
   */
  function whenAvailable(locale, key) {
    var normalizedLocale = normalize(locale);
    var normalizedKey = String(key);
    if (hasCopy(normalizedLocale, normalizedKey)) {
      return Promise.resolve(registry[normalizedLocale][normalizedKey]);
    }
    return new Promise(function (resolve) {
      availabilityWaiters.push({ locale: normalizedLocale, key: normalizedKey, resolve: resolve });
    });
  }

  /** Ambil kalimat. Fallback: locale aktif → id → kunci mentah. Setiap lubang tercatat,
   *  supaya gerbang th-coverage kelak bisa menghitungnya — audit AI-07 F08: Thai parsial
   *  yang lolos diam-diam adalah mode kegagalan paling realistis. */
  var misses = Object.create(null);
  function t(key, params) {
    var s = registry[current][key];
    if (s === undefined && current !== DEFAULT_LOCALE) {
      misses[key] = (misses[key] || 0) + 1;
      s = registry[DEFAULT_LOCALE][key];
    }
    if (s === undefined) { misses[key] = (misses[key] || 0) + 1; s = key; }
    if (params) {
      s = s.replace(/\{(\w+)\}/g, function (m, name) {
        return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m;
      });
    }
    return s;
  }

  function getLocale() { return current; }
  function getBcp47() { return BCP47[current]; }

  /** Ganti locale runtime. Idempoten; listener yang melempar tidak boleh mematikan render. */
  function setLocale(loc) {
    var next = normalize(loc);
    if (next === current) return current;
    current = next;
    listeners.forEach(function (fn) {
      try { fn(current); } catch (e) { /* listener rusak ≠ boot rusak */ }
    });
    return current;
  }

  function onChange(fn) { listeners.push(fn); }

  /** Untuk gerbang & panel Diagnostics: lubang terjemahan yang tersentuh runtime. */
  function coverageReport() {
    return { locale: current, misses: Object.assign({}, misses) };
  }

  return {
    SUPPORTED: SUPPORTED.slice(),
    STATE_FIELD: STATE_FIELD,
    registerCopy: registerCopy,
    overrideCopy: overrideCopy,
    hasCopy: hasCopy,
    whenAvailable: whenAvailable,
    t: t,
    getLocale: getLocale,
    getBcp47: getBcp47,
    setLocale: setLocale,
    onChange: onChange,
    coverageReport: coverageReport
  };
}));
