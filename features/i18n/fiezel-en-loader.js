/**
 * features/i18n/fiezel-en-loader.js
 * Lazy loader for non-Indonesian English-pivot content sidecars.
 * - Locale 'id' and 'th': zero bytes fetched, FiezelEnData is never created for core banks
 *   (Wait: if active target course is 'ja' or 'zh' under 'th', ensureCourse('ja'|'zh') loads JA/ZH EN fallback).
 * - Non-'id' non-'th' ('en', 'ja', 'vi', 'ms', 'fil', 'km', 'ru'): fetches core EN content sidecars
 *   plus active course sidecar ('ja' or 'zh') cleanly, caches in CacheStorage, and calls FiezelOnEnDataReady().
 */
(function (root) {
  'use strict';

  var doc = root.document;
  var CORE_PATHS = {
    vocab: './vocabulary-en.json',
    speaking: './features/i18n/speaking-bank-en.json',
    listening: './features/i18n/listening-bank-en.json',
    listeningExam: './features/i18n/listening-exam-en.json',
    speakingExam: './features/i18n/speaking-exam-en.json',
    reading: './features/i18n/reading-exam-en.json',
    cloze: './features/i18n/cloze-bank-en.json',
    readingBank: './features/i18n/reading-bank-en.json'
  };
  var COURSE_PATHS = {
    ja: './features/i18n/japanese-en.json',
    jlpt: './features/i18n/jlpt-listening-en.json',
    zh: './features/i18n/mandarin-en.json'
  };
  var CACHE_NAME = 'fiezel-locale-en-v1';

  var coreActivated = false;
  var courseLoaded = { ja: false, zh: false };

  function curLocale() {
    try {
      return (root.FiezelI18n && typeof root.FiezelI18n.getLocale === 'function' && root.FiezelI18n.getLocale()) || 'id';
    } catch (_) { return 'id'; }
  }

  function curTargetCourse() {
    try {
      var stored = root.localStorage && root.localStorage.getItem('fz_target_course');
      if (stored === 'ja' || stored === 'zh' || stored === 'en') return stored;
    } catch (_) {}
    try {
      if (typeof root.activeTargetLang === 'function') return root.activeTargetLang();
    } catch (_) {}
    return 'en';
  }

  function ensureBag() {
    if (!root.FiezelEnData) {
      root.FiezelEnData = {
        vocab: null,
        speaking: null,
        listening: null,
        listeningExam: null,
        speakingExam: null,
        reading: null,
        cloze: null,
        readingBank: null,
        ja: null,
        jlpt: null,
        mandarin: null,
        ready: false
      };
    }
    return root.FiezelEnData;
  }

  function fireReady() {
    try {
      if (typeof root.FiezelOnEnDataReady === 'function') root.FiezelOnEnDataReady(root.FiezelEnData);
    } catch (_) {}
  }

  function fetchJson(url) {
    if (typeof root.fetch !== 'function') return Promise.resolve(null);
    return root.fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(url + ': ' + r.status); return r.json(); })
      .catch(function () { return null; });
  }

  function warmOffline(paths) {
    try {
      if (typeof caches === 'undefined' || typeof root.fetch !== 'function') return;
      caches.open(CACHE_NAME).then(function (c) {
        return Promise.allSettled(paths.map(function (p) { return c.add(p).catch(function () {}); }));
      }).catch(function () {});
    } catch (_) {}
  }

  function ensureCourse(course) {
    var loc = curLocale();
    if (loc === 'id') return Promise.resolve(null);
    var c = course || curTargetCourse();
    if (c !== 'ja' && c !== 'zh') return Promise.resolve(null);
    if (courseLoaded[c]) return Promise.resolve(root.FiezelEnData);
    courseLoaded[c] = true;
    var d = ensureBag();
    var jobs = [];
    if (c === 'ja') {
      jobs.push(fetchJson(COURSE_PATHS.ja).then(function (j) { if (j) d.ja = j; }));
      jobs.push(fetchJson(COURSE_PATHS.jlpt).then(function (j) { if (j) d.jlpt = (j.items || j); }));
      warmOffline([COURSE_PATHS.ja, COURSE_PATHS.jlpt]);
    } else if (c === 'zh') {
      jobs.push(fetchJson(COURSE_PATHS.zh).then(function (j) { if (j) d.mandarin = j; }));
      warmOffline([COURSE_PATHS.zh]);
    }
    return Promise.allSettled(jobs).then(function () {
      fireReady();
      return d;
    });
  }

  function activateCore() {
    if (coreActivated) return root.__fzEnCorePromise || Promise.resolve(root.FiezelEnData);
    coreActivated = true;
    var d = ensureBag();
    var jobs = [
      fetchJson(CORE_PATHS.vocab).then(function (j) { if (j) d.vocab = j; }),
      fetchJson(CORE_PATHS.speaking).then(function (j) { if (j) d.speaking = (j.items || j); }),
      fetchJson(CORE_PATHS.listening).then(function (j) { if (j) d.listening = (j.items || j); }),
      fetchJson(CORE_PATHS.listeningExam).then(function (j) { if (j) d.listeningExam = j; }),
      fetchJson(CORE_PATHS.speakingExam).then(function (j) { if (j) d.speakingExam = j; }),
      fetchJson(CORE_PATHS.reading).then(function (j) { if (j) d.reading = j; }),
      fetchJson(CORE_PATHS.cloze).then(function (j) { if (j) d.cloze = (j.items || j); }),
      fetchJson(CORE_PATHS.readingBank).then(function (j) { if (j) d.readingBank = (j.items || j); })
    ];
    var tc = curTargetCourse();
    if (tc === 'ja' || tc === 'zh') {
      jobs.push(ensureCourse(tc));
    }
    var p = Promise.allSettled(jobs).then(function () {
      d.ready = !!(d.vocab && d.readingBank);
      fireReady();
      return d;
    });
    root.__fzEnCorePromise = p;
    if (!root.__fzLocaleBootPromise) root.__fzLocaleBootPromise = p;
    warmOffline(Object.keys(CORE_PATHS).map(function (k) { return CORE_PATHS[k]; }));
    return p;
  }

  function maybeActivate() {
    var loc = curLocale();
    if (loc === 'id') return;
    if (loc === 'th') {
      var tc = curTargetCourse();
      if (tc === 'ja' || tc === 'zh') ensureCourse(tc);
      return;
    }
    activateCore();
  }

  function isEnActive() { return coreActivated; }

  root.FiezelEnLoader = {
    maybeActivate: maybeActivate,
    ensureCourse: ensureCourse,
    isEnActive: isEnActive
  };

  maybeActivate();
  try { root.FiezelI18n && root.FiezelI18n.onChange && root.FiezelI18n.onChange(maybeActivate); } catch (_) {}
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this)));
