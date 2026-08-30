/**
 * FIEZEL · features/i18n/fiezel-th-loader.js — PEMUAT DINAMIS ASET LOCALE THAI (W4-MERGE)
 *
 * Aset Thai dimuat hanya ketika locale aktif adalah th. Dataset locale tetap fail-soft:
 * kegagalan satu berkas tidak boleh mematikan boot ataupun dataset Thai lain yang berhasil.
 */
(function (root) {
  'use strict';
  if (!root || root.FiezelThLoader) return;
  var doc = typeof document !== 'undefined' ? document : null;

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
    './features/i18n/naskah-th-brain.js',
    './features/i18n/th-bank-sanitizer.js'
  ];
  var GRAMMAR_TH = './grammar-explanations-th.json';
  var VOCAB_TH = './vocabulary-th.json';
  var SPEAKING_TH = './features/i18n/speaking-bank-th.json';
  var LISTENING_TH = './features/i18n/listening-bank-th.json';
  var WRITING_TH = './features/i18n/writing-prompts-th.json';
  var READING_TH = './features/i18n/reading-exam-th.json';
  var MANIFEST = './features/i18n/locale-assets-th.json';

  var activated = false;

  function fireReady() {
    try { if (typeof root.FiezelOnThDataReady === 'function') root.FiezelOnThDataReady(root.FiezelThData); } catch (_) {}
  }

  function sanitizeThaiData() {
    try {
      if (root.FiezelThBankSanitizer && typeof root.FiezelThBankSanitizer.sanitizeData === 'function') {
        root.FiezelThBankSanitizer.sanitizeData(root.FiezelThData);
      }
    } catch (_) {}
  }

  function injectScripts() {
    if (!doc || !doc.head) return;
    TH_SCRIPTS.forEach(function (src) {
      if (doc.querySelector('script[src="' + src + '"]')) return;
      var s = doc.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () { sanitizeThaiData(); fireReady(); };
      doc.head.appendChild(s);
    });
  }

  function fetchDatasets() {
    var d = root.FiezelThData;
    var jobs = [
      fetch(GRAMMAR_TH, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw Error(GRAMMAR_TH + ': ' + r.status); return r.json(); }).then(function (j) { d.grammar = j; }),
      fetch(VOCAB_TH, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw Error(VOCAB_TH + ': ' + r.status); return r.json(); }).then(function (j) { d.vocab = j; }),
      fetch(SPEAKING_TH, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw Error(SPEAKING_TH + ': ' + r.status); return r.json(); }).then(function (j) { d.speaking = j.items || j; }),
      fetch(LISTENING_TH, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw Error(LISTENING_TH + ': ' + r.status); return r.json(); }).then(function (j) { d.listening = j.items || j; }),
      fetch(WRITING_TH, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw Error(WRITING_TH + ': ' + r.status); return r.json(); }).then(function (j) { d.writing = j; }),
      fetch(READING_TH, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw Error(READING_TH + ': ' + r.status); return r.json(); }).then(function (j) { d.reading = j; })
    ];
    return Promise.allSettled(jobs).then(function () {
      sanitizeThaiData();
      d.ready = !!(d.grammar && d.vocab);
      fireReady();
    });
  }

  function fillLocaleCache() {
    if (typeof caches === 'undefined' || typeof fetch !== 'function') return;
    fetch(MANIFEST, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw Error('manifest ' + r.status); return r.json(); })
      .then(function (manifest) {
        var name = String(manifest && manifest.cacheName || '');
        var assets = Array.isArray(manifest && manifest.assets) ? manifest.assets : [];
        if (!name || !assets.length) return;
        return caches.open(name).then(function (c) {
          return Promise.allSettled(assets.map(function (p) { return c.add(p).catch(function () {}); }));
        });
      })
      .catch(function () {});
  }

  function activate() {
    if (activated) return;
    activated = true;
    root.FiezelThData = { grammar: null, vocab: null, speaking: null, listening: null, writing: null, reading: null, ready: false };
    injectScripts();
    fetchDatasets();
    fillLocaleCache();
  }

  function maybeActivate() {
    try { if (root.FiezelI18n && root.FiezelI18n.getLocale() === 'th') activate(); } catch (_) {}
  }

  root.FiezelThLoader = {
    maybeActivate: maybeActivate,
    isThActive: function () {
      try { return !!activated && root.FiezelI18n && root.FiezelI18n.getLocale() === 'th'; } catch (_) { return false; }
    }
  };
  maybeActivate();
  try { root.FiezelI18n && root.FiezelI18n.onChange && root.FiezelI18n.onChange(maybeActivate); } catch (_) {}
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this)));
