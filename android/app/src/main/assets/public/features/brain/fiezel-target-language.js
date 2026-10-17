/**
 * fiezel-target-language.js — SUMBU BAHASA TARGET.
 *
 * Satu murid boleh belajar lebih dari satu bahasa, dan progres tiap bahasa berdiri sendiri:
 * bukti Braincore, jadwal ingatan, dan penguasaan keluarga tata bahasa tidak boleh saling
 * menimpa. Modul ini satu-satunya yang tahu bagaimana kunci penyimpanan sebuah bahasa
 * dibentuk.
 *
 * SATU ATURAN YANG MENENTUKAN SEGALANYA
 * -------------------------------------
 * Bahasa bawaan (Inggris) TIDAK PUNYA AWALAN SAMA SEKALI. Kunci Inggris sesudah modul ini
 * lahir wajib identik — byte per byte — dengan kunci Inggris sebelum modul ini lahir.
 *
 * Alasannya bukan kerapian. FIEZEL sudah dipakai murid yang sedang belajar Inggris. Kalau
 * semua kunci diberi awalan bahasa "supaya seragam", setiap murid yang sudah ada membuka
 * aplikasi dan menemukan dirinya kembali ke nol: progresnya tidak terhapus, ia hanya tidak
 * lagi dicari di tempat ia disimpan. Tidak ada error, tidak ada gejala, dan kerusakannya
 * baru terlihat dari keluhan murid — kelas kegagalan yang paling mahal di aplikasi ini.
 *
 * Jadi bahasa LAIN yang menumpang awalan, bukan sebaliknya. Konsekuensinya sengaja dipikul:
 * bahasa bawaan tidak akan pernah bisa dipindahkan tanpa migrasi, dan itu harga yang jauh
 * lebih murah daripada satu murid pun kehilangan jejak belajarnya.
 *
 * Dijaga tests/target-language-axis-test.js, yang membaca daftar kunci LANGSUNG DARI SUMBER
 * supaya ia ikut tumbuh saat kunci baru lahir dan tidak bisa basi diam-diam.
 *
 * MURNI: tanpa Date.now, tanpa Math.random, tanpa DOM, tanpa localStorage. Modul ini hanya
 * menghitung nama kunci; yang membaca dan menulis penyimpanan adalah pemanggilnya.
 */
(function (factory) {
  'use strict';
  var root = typeof globalThis !== 'undefined' ? globalThis
    : (typeof self !== 'undefined' ? self : this);
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.FiezelTargetLanguage = api;
}(function () {
  'use strict';

  var SCHEMA = 'fiezel-target-language-v1';
  var DEFAULT = 'en';

  // Daftar TERTUTUP dan sengaja pendek. Bahasa yang tidak ada di sini jatuh ke bawaan, bukan
  // melahirkan ruang kunci baru diam-diam — satu salah ketik tidak boleh diam-diam memisahkan
  // progres seorang murid ke tempat yang tidak pernah dibaca siapa pun lagi.
  var LANGS = Object.freeze(['en', 'ja']);

  // Pemisah dipilih '@' karena ia TIDAK PERNAH muncul di kunci `fiezel-*-v1` mana pun: kunci
  // yang ada hanya memakai huruf kecil, angka, dan tanda hubung. Memakai '-' akan membuat
  // `fiezel-olm-v1-ja` tidak bisa dibedakan dari kunci baru bernama sama.
  var SEP = '@';

  function isString(v) { return typeof v === 'string'; }

  /** Petakan masukan apa pun ke satu bahasa yang sah. Yang tidak dikenal jatuh ke bawaan. */
  function normalize(lang) {
    if (!isString(lang)) return DEFAULT;
    var v = lang.trim().toLowerCase();
    for (var i = 0; i < LANGS.length; i++) {
      if (LANGS[i] === v) return LANGS[i];
    }
    return DEFAULT;
  }

  function isDefault(lang) { return normalize(lang) === DEFAULT; }

  /**
   * Kunci penyimpanan untuk sebuah bahasa.
   * Bahasa bawaan mengembalikan kunci dasar TANPA perubahan apa pun — itu janji intinya.
   */
  function key(base, lang) {
    var b = isString(base) ? base : '';
    var l = normalize(lang);
    if (l === DEFAULT) return b;
    return b + SEP + l;
  }

  /** Kunci dasar dari sebuah kunci berbahasa. Kunci tanpa awalan dikembalikan apa adanya. */
  function baseOf(fullKey) {
    var k = isString(fullKey) ? fullKey : '';
    var at = k.lastIndexOf(SEP);
    if (at < 0) return k;
    var tail = k.slice(at + SEP.length);
    if (tail !== normalize(tail) || tail === DEFAULT) return k;
    return k.slice(0, at);
  }

  /** Bahasa sebuah kunci. Kunci tanpa awalan adalah bahasa bawaan. */
  function langOf(fullKey) {
    var k = isString(fullKey) ? fullKey : '';
    var at = k.lastIndexOf(SEP);
    if (at < 0) return DEFAULT;
    var tail = k.slice(at + SEP.length);
    if (tail !== normalize(tail) || tail === DEFAULT) return DEFAULT;
    return tail;
  }

  /** Salinan daftar bahasa yang sah. */
  function all() { return LANGS.slice(); }

  return {
    SCHEMA: SCHEMA,
    DEFAULT: DEFAULT,
    SEP: SEP,
    normalize: normalize,
    isDefault: isDefault,
    key: key,
    baseOf: baseOf,
    langOf: langOf,
    all: all
  };
}));
