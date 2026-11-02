/**
 * FIEZEL · features/i18n/fiezel-i18n.js — RUNTIME I18N (window.FiezelI18n)
 *
 * MENGAPA BERKAS INI ADA.
 * Arsitektur i18n modern FIEZEL: Universal English Golden Pivot, Zero-Leak Fallback,
 * konsolidasi katalog JSON satu pintu, integrasi i18next & i18next-parser, serta
 * penyelarasan mutu pedagogis Thai dan global (en, id, th, vi, ms, fil, ja, km, ru).
 *
 * KONTRAK ARSITEKTUR:
 *   - Universal Golden Pivot: 'en' (Bahasa Inggris).
 *   - Rantai Fallback Wajib:
 *       * Non-Indonesian (mis. 'th'): activeLocale -> 'en' -> [Kunci Mentah]
 *         (DILARANG KERAS jatuh ke 'id' untuk murid non-Indonesia)
 *       * Indonesian ('id'): 'id' -> 'en' -> [Kunci Mentah]
 *   - Interpolasi parameter bernama: {nama}, {score}, {waktuReset}, dll.
 *   - Dukungan katalog JSON satu pintu: locales/{locale}/{ui,quiz,grammar,vocab}.json.
 *   - Integrasi i18next core: kompatibilitas penuh dengan standar industri i18next.
 *
 * BATAS YANG TIDAK BOLEH DILANGGAR:
 *   - JANGAN PERNAH meneruskan locale UI ini ke opsi audio/voice-say (tests/audio-locale-guard-test.js).
 *   - setLocale() TIDAK menulis state sendiri; pemanggil menulis preferences.learnerLocale.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelI18n = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SUPPORTED = ['id', 'th', 'en', 'vi', 'ms', 'fil', 'ja', 'km', 'ru'];
  var DEFAULT_LOCALE = 'id';             // Locale awal untuk murid domestik
  var GOLDEN_PIVOT = 'en';               // Universal Golden Pivot untuk fallback
  var BCP47 = {
    id: 'id-ID',
    th: 'th-TH',
    en: 'en-US',
    vi: 'vi-VN',
    ms: 'ms-MY',
    fil: 'fil-PH',
    ja: 'ja-JP',
    km: 'km-KH',
    ru: 'ru-RU'
  };
  var STATE_FIELD = 'learnerLocale';

  var registry = {};
  SUPPORTED.forEach(function (loc) {
    registry[loc] = Object.create(null);
  });

  var current = DEFAULT_LOCALE;
  var listeners = [];
  var availabilityWaiters = [];
  var misses = Object.create(null);
  var course = null;

  function normalize(loc) {
    return SUPPORTED.indexOf(loc) >= 0 ? loc : DEFAULT_LOCALE;
  }

  function registerCopy(locale, map) {
    var normalizedLocale = normalize(locale);
    var box = registry[normalizedLocale];
    Object.keys(map).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(box, k)) {
        if (box[k] === map[k]) return;
        box[k] = map[k];
        return;
      }
      box[k] = map[k];
    });

    for (var i = availabilityWaiters.length - 1; i >= 0; i--) {
      var waiter = availabilityWaiters[i];
      if (waiter.locale !== normalizedLocale || !hasCopy(waiter.locale, waiter.key)) continue;
      availabilityWaiters.splice(i, 1);
      try { waiter.resolve(box[waiter.key]); } catch (_) {}
    }
    if (normalizedLocale === current) {
      listeners.forEach(function (fn) {
        try { fn(current); } catch (e) {}
      });
    }
  }

  function overrideCopy(locale, map) {
    var normalized = normalize(locale);
    var box = registry[normalized];
    Object.keys(map).forEach(function (k) { box[k] = map[k]; });
  }

  function hasCopy(locale, key) {
    var box = registry[normalize(locale)];
    return Object.prototype.hasOwnProperty.call(box, String(key));
  }

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

  function setCourse(next) {
    var normalized = next === 'ja' ? 'ja' : null;
    if (normalized === course) return course;
    course = normalized;
    listeners.forEach(function (fn) {
      try { fn(current); } catch (e) {}
    });
    return course;
  }

  function getCourse() { return course; }

  /**
   * PIVOT FALLBACK ENGINE (ZERO-LEAK INVARIANT)
   * Non-ID users: current -> 'en' -> raw key.
   * ID users: 'id' -> 'en' -> raw key.
   * Murid non-Indonesia TIDAK AKAN PERNAH melihat bocoran teks Indonesia!
   */
  function t(key, params) {
    var s;
    if (course) {
      var ck = 'kursus-' + course + '.' + key;
      if (registry[current]) s = registry[current][ck];
      if (s === undefined && current !== GOLDEN_PIVOT && registry[GOLDEN_PIVOT]) {
        s = registry[GOLDEN_PIVOT][ck];
      }
      if (s === undefined && current === 'id' && registry['id']) {
        s = registry['id'][ck];
      }
    }

    if (s === undefined && registry[current]) {
      s = registry[current][key];
    }

    // Fallback universal ke Golden Pivot 'en' (bukan 'id')
    if (s === undefined && current !== GOLDEN_PIVOT && registry[GOLDEN_PIVOT]) {
      misses[key] = (misses[key] || 0) + 1;
      s = registry[GOLDEN_PIVOT][key];
    }

    // Jika pengguna 'id' dan belum ditemukan, fallback ke 'en'
    if (s === undefined) {
      misses[key] = (misses[key] || 0) + 1;
      s = key;
    }

    if (params && typeof s === 'string') {
      s = s.replace(/\{(\w+)\}/g, function (m, name) {
        return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m;
      });
    }
    return s;
  }

  function getLocale() { return current; }
  function getBcp47() { return BCP47[current] || 'en-US'; }

  function setLocale(loc) {
    var next = normalize(loc);
    if (next === current) return current;
    current = next;
    if (typeof fetch === 'function' && next !== 'id') {
      try { loadLocale(next); } catch (_) {}
    }
    listeners.forEach(function (fn) {
      try { fn(current); } catch (e) {}
    });
    if (root && root.i18next && typeof root.i18next.changeLanguage === 'function') {
      try { root.i18next.changeLanguage(current); } catch (_) {}
    }
    return current;
  }

  function onChange(fn) { listeners.push(fn); }

  function coverageReport() {
    return { locale: current, misses: Object.assign({}, misses) };
  }

  /**
   * Pemuatan katalog otomatis di lingkungan Node.js (untuk test suite, SSR, tooling)
   */
  if (typeof require === 'function' && typeof module === 'object' && module.exports) {
    try {
      var path = require('path');
      var fs = require('fs');
      var localesDir = path.join(__dirname, 'locales');
      if (fs.existsSync(localesDir)) {
        SUPPORTED.forEach(function (loc) {
          var dir = path.join(localesDir, loc);
          if (fs.existsSync(dir)) {
            ['ui', 'quiz', 'grammar', 'vocab'].forEach(function (ns) {
              var file = path.join(dir, ns + '.json');
              if (fs.existsSync(file)) {
                try {
                  var data = JSON.parse(fs.readFileSync(file, 'utf8'));
                  overrideCopy(loc, data);
                } catch (_) {}
              }
            });
          }
        });
      }
    } catch (_) {}
  }

  /**
   * Pemuatan katalog dinamis via fetch di browser
   */
  function loadLocale(loc) {
    var target = normalize(loc);
    if (typeof fetch !== 'function') return Promise.resolve();
    var namespaces = ['ui', 'quiz', 'grammar', 'vocab'];
    return Promise.all(namespaces.map(function (ns) {
      var url = './features/i18n/locales/' + target + '/' + ns + '.json';
      return fetch(url).then(function (r) {
        if (!r.ok) return {};
        return r.json();
      }).then(function (map) {
        overrideCopy(target, map);
      }).catch(function () {});
    })).then(function () {
      if (target === current) {
        listeners.forEach(function (fn) {
          try { fn(current); } catch (_) {}
        });
      }
    });
  }

  /**
   * Inisialisasi runtime i18next bila modul i18next terpasang di window/global
   */
  function initI18next(customI18next) {
    var inst = customI18next || (root && root.i18next);
    if (!inst || typeof inst.init !== 'function') return null;
    var res = {};
    SUPPORTED.forEach(function (loc) {
      res[loc] = {
        ui: registry[loc] || {},
        quiz: registry[loc] || {},
        grammar: registry[loc] || {},
        vocab: registry[loc] || {}
      };
    });
    try {
      inst.init({
        lng: current,
        fallbackLng: GOLDEN_PIVOT,
        supportedLngs: SUPPORTED.slice(),
        defaultNS: 'ui',
        fallbackNS: ['quiz', 'grammar', 'vocab'],
        resources: res,
        interpolation: {
          escapeValue: false
        }
      });
    } catch (_) {}
    return inst;
  }

  if (root && root.i18next) {
    initI18next(root.i18next);
  }

  return {
    SUPPORTED: SUPPORTED.slice(),
    STATE_FIELD: STATE_FIELD,
    GOLDEN_PIVOT: GOLDEN_PIVOT,
    registerCopy: registerCopy,
    overrideCopy: overrideCopy,
    hasCopy: hasCopy,
    whenAvailable: whenAvailable,
    t: t,
    getLocale: getLocale,
    setCourse: setCourse,
    getCourse: getCourse,
    getBcp47: getBcp47,
    setLocale: setLocale,
    onChange: onChange,
    coverageReport: coverageReport,
    loadLocale: loadLocale,
    initI18next: initI18next
  };
}));
