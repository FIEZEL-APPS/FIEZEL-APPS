/**
 * features/i18n/fiezel-en-loader.js
 * Lazy loader for non-Indonesian localized content sidecars across all 9 locales
 * ('id', 'en', 'th', 'ms', 'vi', 'fil', 'ja', 'km', 'ru') plus FiezelLocPick() runtime helper.
 * - Locale 'id': zero bytes fetched, FiezelEnData is never activated.
 * - Locale 'th': core EN/TH banks handled by fiezel-th-loader.js; loads missing sidecars
 *   (writing-rubric, pte-bank, grammar-sentences, ui-extra) + JA/ZH course packs on demand.
 * - Locale 'en': fetches EN pivot sidecars + writing-rubric-en.json + pte-bank-en.json + active JA/ZH course packs.
 * - Locales 'ja','ms','vi','fil','km','ru': fetches full 16-file native sidecar bundle under features/i18n/sides/<loc>/.
 */
(function (root) {
  'use strict';

  var EN_CORE_PATHS = {
    vocab: './vocabulary-en.json',
    speaking: './features/i18n/speaking-bank-en.json',
    listening: './features/i18n/listening-bank-en.json',
    listeningExam: './features/i18n/listening-exam-en.json',
    speakingExam: './features/i18n/speaking-exam-en.json',
    reading: './features/i18n/reading-exam-en.json',
    cloze: './features/i18n/cloze-bank-en.json',
    readingBank: './features/i18n/reading-bank-en.json',
    writingRubric: './features/i18n/writing-rubric-en.json',
    pteBank: './features/i18n/pte-bank-en.json'
  };
  var EN_COURSE_PATHS = {
    ja: './features/i18n/japanese-en.json',
    jlpt: './features/i18n/jlpt-listening-en.json',
    zh: './features/i18n/mandarin-en.json'
  };

  function isFullSidecarLocale(loc) {
    return loc === 'ja' || loc === 'ms' || loc === 'vi' || loc === 'fil' || loc === 'km' || loc === 'ru';
  }

  function hasTierB1(loc) {
    return loc === 'ja' || loc === 'ms';
  }

  function corePathsFor(loc) {
    if (loc === 'th') {
      return {
        writingRubric: './features/i18n/sides/th/writing-rubric.json',
        pteBank: './features/i18n/sides/th/pte-bank.json',
        grammarSentences: './features/i18n/sides/th/grammar-sentences.json',
        uiExtra: './features/i18n/sides/th/ui-extra.json'
      };
    }
    if (isFullSidecarLocale(loc)) {
      var base = './features/i18n/sides/' + loc;
      var b1 = hasTierB1(loc);
      return {
        vocab: base + '/vocabulary.json',
        speaking: base + '/speaking-bank.json',
        listening: EN_CORE_PATHS.listening,
        listeningExam: base + '/listening-exam.json',
        speakingExam: base + '/speaking-exam.json',
        reading: base + '/reading-exam.json',
        cloze: b1 ? (base + '/cloze-bank.json') : EN_CORE_PATHS.cloze,
        readingBank: b1 ? (base + '/reading-bank.json') : EN_CORE_PATHS.readingBank,
        writingRubric: base + '/writing-rubric.json',
        pteBank: base + '/pte-bank.json',
        grammarExplanations: b1 ? (base + '/grammar-explanations.json') : null,
        misconception: base + '/misconception.json',
        grammarSentences: base + '/grammar-sentences.json',
        uiExtra: base + '/ui-extra.json'
      };
    }
    return EN_CORE_PATHS;
  }

  function coursePathsFor(loc) {
    if (loc === 'th') {
      var base = './features/i18n/sides/th';
      return {
        ja: base + '/japanese.json',
        jlpt: base + '/jlpt-listening.json',
        zh: base + '/mandarin.json'
      };
    }
    if (isFullSidecarLocale(loc)) {
      return {
        ja: EN_COURSE_PATHS.ja,
        jlpt: './features/i18n/sides/' + loc + '/jlpt-listening.json',
        zh: EN_COURSE_PATHS.zh
      };
    }
    return EN_COURSE_PATHS;
  }

  var coreActivated = false;
  var activatedLocale = '';
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

  function resetBag(loc) {
    root.FiezelEnData = {
      locale: loc || '',
      vocab: null,
      speaking: null,
      listening: null,
      listeningExam: null,
      speakingExam: null,
      reading: null,
      cloze: null,
      readingBank: null,
      writingRubric: null,
      pteBank: null,
      grammarExplanations: null,
      misconception: null,
      grammarSentences: null,
      uiExtra: null,
      ja: null,
      jlpt: null,
      mandarin: null,
      ready: false
    };
    return root.FiezelEnData;
  }

  function ensureBag() {
    return root.FiezelEnData || resetBag(curLocale());
  }

  function fireReady() {
    try {
      if (typeof root.FiezelOnEnDataReady === 'function') root.FiezelOnEnDataReady(root.FiezelEnData);
    } catch (_) {}
  }

  function fetchJson(url) {
    if (!url || typeof root.fetch !== 'function') return Promise.resolve(null);
    return root.fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(url + ': ' + r.status); return r.json(); })
      .catch(function () { return null; });
  }

  function warmOffline(paths, loc) {
    try {
      var valid = (paths || []).filter(Boolean);
      if (!valid.length || typeof caches === 'undefined' || typeof root.fetch !== 'function') return;
      var cacheName = 'fiezel-locale-' + (loc || 'en') + '-v1';
      caches.open(cacheName).then(function (c) {
        return Promise.allSettled(valid.map(function (p) { return c.add(p).catch(function () {}); }));
      }).catch(function () {});
    } catch (_) {}
  }

  function ensureCourse(course) {
    var loc = curLocale();
    if (loc === 'id') return Promise.resolve(null);
    if (activatedLocale && activatedLocale !== loc) {
      coreActivated = false;
      courseLoaded = { ja: false, zh: false };
      resetBag(loc);
    }
    var c = course || curTargetCourse();
    if (c !== 'ja' && c !== 'zh') return Promise.resolve(null);
    if (courseLoaded[c]) return Promise.resolve(root.FiezelEnData);
    courseLoaded[c] = true;
    var d = ensureBag();
    var cPaths = coursePathsFor(loc);
    var jobs = [];
    if (c === 'ja') {
      jobs.push(fetchJson(cPaths.ja).then(function (j) { if (j) d.ja = j; }));
      jobs.push(fetchJson(cPaths.jlpt).then(function (j) { if (j) d.jlpt = (j.items || j); }));
      warmOffline([cPaths.ja, cPaths.jlpt], loc);
    } else if (c === 'zh') {
      jobs.push(fetchJson(cPaths.zh).then(function (j) { if (j) d.mandarin = j; }));
      warmOffline([cPaths.zh], loc);
    }
    return Promise.allSettled(jobs).then(function () {
      fireReady();
      return d;
    });
  }

  function activateCore(locOverride) {
    var loc = locOverride || curLocale();
    if (loc === 'id') return Promise.resolve(null);
    if (coreActivated && activatedLocale === loc) {
      return root.__fzEnCorePromise || Promise.resolve(root.FiezelEnData);
    }
    coreActivated = true;
    activatedLocale = loc;
    courseLoaded = { ja: false, zh: false };
    var d = resetBag(loc);
    var paths = corePathsFor(loc);
    var jobs = [];
    if (paths.vocab) jobs.push(fetchJson(paths.vocab).then(function (j) { if (j) d.vocab = j; }));
    if (paths.speaking) jobs.push(fetchJson(paths.speaking).then(function (j) { if (j) d.speaking = (j.items || j); }));
    if (paths.listening) jobs.push(fetchJson(paths.listening).then(function (j) { if (j) d.listening = (j.items || j); }));
    if (paths.listeningExam) jobs.push(fetchJson(paths.listeningExam).then(function (j) { if (j) d.listeningExam = j; }));
    if (paths.speakingExam) jobs.push(fetchJson(paths.speakingExam).then(function (j) { if (j) d.speakingExam = j; }));
    if (paths.reading) jobs.push(fetchJson(paths.reading).then(function (j) { if (j) d.reading = j; }));
    if (paths.cloze) jobs.push(fetchJson(paths.cloze).then(function (j) { if (j) d.cloze = (j.items || j); }));
    if (paths.readingBank) jobs.push(fetchJson(paths.readingBank).then(function (j) { if (j) d.readingBank = (j.items || j); }));
    if (paths.writingRubric) jobs.push(fetchJson(paths.writingRubric).then(function (j) { if (j) d.writingRubric = j; }));
    if (paths.pteBank) jobs.push(fetchJson(paths.pteBank).then(function (j) { if (j) d.pteBank = j; }));
    if (paths.grammarExplanations) jobs.push(fetchJson(paths.grammarExplanations).then(function (j) { if (j) d.grammarExplanations = j; }));
    if (paths.misconception) jobs.push(fetchJson(paths.misconception).then(function (j) { if (j) d.misconception = j; }));
    if (paths.grammarSentences) jobs.push(fetchJson(paths.grammarSentences).then(function (j) { if (j) d.grammarSentences = j; }));
    if (paths.uiExtra) jobs.push(fetchJson(paths.uiExtra).then(function (j) { if (j) d.uiExtra = (j.items || j); }));

    var tc = curTargetCourse();
    if (tc === 'ja' || tc === 'zh') {
      jobs.push(ensureCourse(tc));
    }
    var p = Promise.allSettled(jobs).then(function () {
      d.ready = isFullSidecarLocale(loc)
        ? !!(d.vocab && d.readingBank)
        : (loc === 'th' ? !!(d.writingRubric || d.pteBank || d.uiExtra) : !!(d.vocab && d.readingBank));
      fireReady();
      return d;
    });
    root.__fzEnCorePromise = p;
    root.__fzLocaleBootPromise = p;
    warmOffline(Object.keys(paths).map(function (k) { return paths[k]; }), loc);
    return p;
  }

  function maybeActivate() {
    var loc = curLocale();
    if (loc === 'id') {
      coreActivated = false;
      activatedLocale = 'id';
      return;
    }
    activateCore(loc);
  }

  function isEnActive() { return coreActivated; }

  root.FiezelLocPick = function (enText, idText, thText, vars) {
    var loc = curLocale();
    var out = '';
    if (loc === 'id') {
      out = idText != null ? String(idText) : String(enText || '');
    } else if (loc === 'en') {
      out = enText != null ? String(enText) : String(idText || '');
    } else {
      var bag = root.FiezelEnData && root.FiezelEnData.locale === loc ? root.FiezelEnData : null;
      var extra = bag && bag.uiExtra && bag.uiExtra[enText];
      if (extra) out = String(extra);
      else if (loc === 'th' && thText != null) out = String(thText);
      else out = String(enText != null ? enText : (idText || ''));
    }
    if (vars && typeof vars === 'object') {
      out = out.replace(/\{([a-zA-Z0-9_]+)\}/g, function (m, k) {
        return Object.prototype.hasOwnProperty.call(vars, k) && vars[k] != null ? String(vars[k]) : m;
      });
    }
    return out;
  };

  root.FiezelEnLoader = {
    maybeActivate: maybeActivate,
    ensureCourse: ensureCourse,
    isEnActive: isEnActive
  };

  maybeActivate();
  try { root.FiezelI18n && root.FiezelI18n.onChange && root.FiezelI18n.onChange(maybeActivate); } catch (_) {}
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this)));
