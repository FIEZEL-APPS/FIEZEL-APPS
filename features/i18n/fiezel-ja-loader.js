/**
 * FIEZEL · features/i18n/fiezel-ja-loader.js — PEMUAT DINAMIS ASET LOCALE JEPANG (JA)
 *
 * MENGAPA BERKAS INI ADA:
 * Mengikuti arsitektur lazy-loading isolasi tinggi (mirip fiezel-th-loader.js):
 * Aset bahasa Jepang (ui, quiz, grammar, vocab, ±1,2 MB total) TIDAK dimuat lewat tag <script> statis
 * di index.html dan tidak membebani murid Indonesia maupun Thai.
 * Berkas kecil ini bertindak saat FiezelI18n.getLocale() === 'ja' — di boot ataupun saat murid
 * mengganti bahasa ke 日本語 di Onboarding / Pengaturan (onChange).
 *
 * Murid Indonesia & Thai:
 *   NOL fetch, NOL injeksi, window.FiezelJaData tetap undefined.
 *
 * KETIKA AKTIF:
 *   1. Fetch 4 katalog JSON: ui.json, quiz.json, grammar.json, vocab.json dari ./features/i18n/locales/ja/.
 *   2. Override copy ke FiezelI18n via FiezelI18n.overrideCopy('ja', map).
 *   3. Set root.FiezelJaData = { ready: true } dan panggil root.FiezelOnJaDataReady().
 *   4. Cache katalog ke CacheStorage (fiezel-locale-ja-v1) untuk mode offline.
 */
(function (root) {
  'use strict';
  if (!root || root.FiezelJaLoader) return;

  var doc = typeof document !== 'undefined' ? document : null;
  var CACHE_NAME = 'fiezel-locale-ja-v1';
  var NAMESPACES = ['ui', 'quiz', 'grammar', 'vocab'];
  var JA_BASE = './features/i18n/locales/ja/';

  var activated = false;
  var loadingPromise = null;

  function fireReady() {
    try {
      if (typeof root.FiezelOnJaDataReady === 'function') {
        root.FiezelOnJaDataReady(root.FiezelJaData);
      }
    } catch (_) {}
  }

  function fetchDatasets() {
    if (loadingPromise) return loadingPromise;
    var d = root.FiezelJaData;

    if (root.FiezelI18n && typeof root.FiezelI18n.loadLocale === 'function') {
      loadingPromise = Promise.resolve(root.FiezelI18n.loadLocale('ja')).then(function () {
        d.ready = true;
        fireReady();
      }, function () {
        d.ready = true;
        fireReady();
      });
      return loadingPromise;
    }

    var jobs = NAMESPACES.map(function (ns) {
      var url = JA_BASE + ns + '.json';
      return fetch(url, { credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) throw new Error(url + ': ' + r.status);
          return r.json();
        })
        .then(function (map) {
          if (root.FiezelI18n && typeof root.FiezelI18n.overrideCopy === 'function') {
            root.FiezelI18n.overrideCopy('ja', map);
          }
          return map;
        })
        .catch(function (_) {
          return null;
        });
    });

    loadingPromise = Promise.allSettled(jobs).then(function () {
      d.ready = true;
      fireReady();
    });
    return loadingPromise;
  }

  function fillLocaleCache() {
    if (typeof caches === 'undefined' || typeof fetch !== 'function') return;
    var assets = NAMESPACES.map(function (ns) { return JA_BASE + ns + '.json'; });
    caches.open(CACHE_NAME).then(function (c) {
      return Promise.allSettled(assets.map(function (p) { return c.add(p).catch(function () {}); }));
    }).catch(function () {});
  }

  function activate() {
    if (activated) return;
    activated = true;
    root.FiezelJaData = { ready: false };
    fetchDatasets();
    fillLocaleCache();
  }

  function maybeActivate() {
    try {
      if (root.FiezelI18n && root.FiezelI18n.getLocale() === 'ja') {
        activate();
      }
    } catch (_) {}
  }

  function isJaActive() {
    return activated;
  }

  function whenReady() {
    if (!activated) activate();
    return loadingPromise || Promise.resolve();
  }

  root.FiezelJaLoader = {
    maybeActivate: maybeActivate,
    isJaActive: isJaActive,
    whenReady: whenReady
  };

  maybeActivate();
  try {
    if (root.FiezelI18n && root.FiezelI18n.onChange) {
      root.FiezelI18n.onChange(maybeActivate);
    }
  } catch (_) {}
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this)));
