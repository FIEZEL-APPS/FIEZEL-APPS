/**
 * m025-34 registration layer: wires each module's data source to its self-test.
 *
 * Loading happens here, inside try/catch, so a missing or corrupt data file becomes a
 * finding on that module instead of an exception nobody sees. Installs the global
 * error handlers as early as this script runs.
 */
(function (root) {
  'use strict';
  var bus = root.FiezelDiagnosticBus;
  var tests = root.FiezelModuleSelfTests;
  var targets = root.FiezelDiagnosticTargets;
  if (!bus || !tests || !targets) return;

  bus.installGlobalHandlers(root);

  var rootUrl = new URL('../../', (document.currentScript && document.currentScript.src) || location.href);
  function url(path) { return new URL(String(path).replace(/^\.\//, ''), rootUrl).href; }

  async function loadJson(path) {
    var response = await fetch(url(path), { credentials: 'same-origin' });
    if (!response || !response.ok) throw new Error('http_' + (response ? response.status : 'error'));
    return response.json();
  }

  // A data module's self-test always runs: if loading fails, that failure IS the result.
  function dataTest(moduleId, path, run) {
    bus.registerSelfTest(moduleId, async function () {
      var data;
      try {
        data = await loadJson(path);
      } catch (error) {
        var message = String((error && error.message) || error);
        bus.reportError(moduleId, 'error', 'DATA_LOAD_FAILED', path + ': ' + message);
        return { status: 'fail', findings: [bus.finding('DATA_LOAD_FAILED', 'error', 'Gagal memuat ' + path + ' (' + message + ').')] };
      }
      return { findings: run(data) };
    });
  }

  dataTest('vocabulary', './vocabulary-master.json', function (d) {
    return tests.vocabulary(Array.isArray(d) ? d : (d && d.items) || null, targets);
  });
  dataTest('reading', './reading-bank.json', function (d) {
    return tests.reading(Array.isArray(d) ? d : (d && d.items) || null, targets);
  });
  dataTest('grammar', './grammar-templates.json', function (d) { return tests.grammar(d, targets); });
  dataTest('listening', './features/speaking-listening/listening-bank-v1.json', function (d) {
    return tests.bank((d && (d.items || d)) || null, targets.listening.minItems, 'LISTENING');
  });
  dataTest('speaking', './features/speaking-listening/speaking-bank-v1.json', function (d) {
    return tests.bank((d && (d.items || d)) || null, targets.speaking.minItems, 'SPEAKING');
  });
  dataTest('classroom', './features/classroom/classroom-lessons-v1.json', function (d) { return tests.classroom(d, targets); });

  // m025-41: the layers that actually broke in production are probed directly. Every
  // probe is wrapped, because the one thing a scanner may never do is fail with the app.

  bus.registerSelfTest('prosody', function () {
    return { findings: tests.prosody(root.FiezelProsody || null, targets) };
  });

  bus.registerSelfTest('indonesianVoice', function () {
    var status = null;
    try {
      status = root.FiezelIndonesianVoice && root.FiezelIndonesianVoice.status
        ? root.FiezelIndonesianVoice.status() : null;
    } catch (_) {}
    return { findings: tests.indonesianVoice(status, targets) };
  });

  // The globals every screen depends on. Absence is checked directly rather than being
  // inferred later from a blank screen or a silent voice.
  var REQUIRED_MODULES = ['FiezelDiagnosticBus', 'FiezelClassroom', 'FiezelTutorV3', 'FiezelProsody',
    'FiezelVoiceRuntime', 'FiezelNeuralVoiceConfig', 'FiezelSherpaVitsAdapter', 'FiezelWebAudioPlayer'];
  var VIEWS = ['home', 'vocab', 'grammar', 'reading', 'skills', 'test', 'progress', 'classroom'];

  bus.registerSelfTest('runtime', function () {
    var probe = { modules: {}, browserTtsWired: false, frozenRuntimeProxied: false, missingViews: [] };
    REQUIRED_MODULES.forEach(function (name) { probe.modules[name] = !!root[name]; });
    try {
      // m025-40 was exactly this: a Proxy over the frozen runtime made every property
      // read throw, so the app lost all speech at once. Read the member the way a caller
      // would, and report the throw instead of waiting for a user to hear silence.
      var runtime = root.FiezelVoiceRuntime;
      if (runtime) { void runtime.speak; void runtime.stop; }
    } catch (_) { probe.frozenRuntimeProxied = true; }
    try {
      var log = JSON.parse(root.localStorage.getItem('fiezel-neural-voice-diagnostics-v1') || '[]');
      probe.browserTtsWired = log.some(function (entry) {
        return entry && String(entry.provider || '') === 'browser-speech-synthesis';
      });
    } catch (_) {}
    try {
      // m025-45: this used to hunt the DOM for a button per view and reported "test" as
      // missing on every healthy install - the placement screen opens from a Home card
      // that reads startAdaptive() once the learner is assessed. A destination is missing
      // when the router does not know it, not when no button happens to be on screen.
      var known = root.__fiezelValidViews ? root.__fiezelValidViews() : null;
      if (Array.isArray(known) && known.length) {
        probe.missingViews = VIEWS.filter(function (view) { return known.indexOf(view) === -1; });
      }
    } catch (_) {}
    return { findings: tests.runtime(probe) };
  });

  // Saved state that no longer parses renders as a blank or stuck screen, with nothing in
  // the console to explain it.
  var STATE_KEYS = ['fiezel-tutor-v3-session', 'fiezel-tutor-v3-evidence', 'fiezel-state',
    'fiezel-indonesian-voice-v1', 'fiezel-neural-voice-diagnostics-v1'];

  bus.registerSelfTest('storage', function () {
    var probe = { available: false, corruptKeys: [], usedPercent: 0 };
    try {
      root.localStorage.setItem('fiezel-diag-probe', '1');
      root.localStorage.removeItem('fiezel-diag-probe');
      probe.available = true;
    } catch (_) { return { findings: tests.storage(probe, targets) }; }
    var bytes = 0;
    STATE_KEYS.forEach(function (key) {
      var raw = null;
      try { raw = root.localStorage.getItem(key); } catch (_) { return; }
      if (raw == null) return;
      bytes += raw.length;
      try { JSON.parse(raw); } catch (_) { probe.corruptKeys.push(key); }
    });
    // 5MB is the ordinary localStorage budget; the number is a ratio, not a threshold,
    // so the target file still owns the limit that matters.
    probe.usedPercent = Math.round((bytes / (5 * 1024 * 1024)) * 100);
    return { findings: tests.storage(probe, targets) };
  });

  bus.registerSelfTest('ui', function () {
    var probe = { mounted: false, empty: true, view: '', destinations: 0, lastRenderMs: 0 };
    try {
      var app = root.document.getElementById('app');
      probe.mounted = !!app;
      probe.empty = !app || !String(app.innerHTML || '').trim();
      probe.view = String((root.__getFiezelState && root.__getFiezelState().view) || '');
      // The Home button carries the .nav class too, so the old "+ 1" counted it twice
      // and every healthy install reported 6 destinations against a target of 5.
      probe.destinations = root.document.querySelectorAll('.bottomnav .nav').length;
      probe.lastRenderMs = Number(root.__fiezelLastRenderMs || 0);
    } catch (error) {
      return { findings: [bus.finding('UI_PROBE_FAILED', 'error', String((error && error.message) || error))] };
    }
    return { findings: tests.ui(probe, targets) };
  });

  bus.registerSelfTest('leveltest', function () {
    var count = null;
    try { count = root.__fiezelLevelTestCount ? root.__fiezelLevelTestCount() : null; } catch (_) {}
    if (count == null) return { status: 'skip', findings: [bus.finding('LEVELTEST_NOT_EXPOSED', 'warning', 'Jumlah soal level test belum diekspos ke diagnostic.')] };
    return { findings: tests.leveltest(count, targets) };
  });

  bus.registerSelfTest('neuralVoice', function () {
    var status = null;
    try { status = root.FiezelVoiceRuntime && root.FiezelVoiceRuntime.status ? root.FiezelVoiceRuntime.status() : null; } catch (_) {}
    return { findings: tests.neuralVoice(status, targets) };
  });

  bus.registerSelfTest('chat', function () {
    var probe = { requiresApiKey: false, threw: null };
    try {
      // Full-local contract: the coach must be constructible without any key present.
      probe.requiresApiKey = !!(root.FIEZEL_CORE_CONFIG && root.FIEZEL_CORE_CONFIG.apiKeyRequired);
      if (typeof root.askCoachAI !== 'function') return { status: 'skip', findings: [bus.finding('CHAT_NOT_LOADED', 'warning', 'Modul chat belum dimuat.')] };
    } catch (error) { probe.threw = String((error && error.message) || error); }
    return { findings: tests.chat(probe) };
  });

  bus.registerSelfTest('adaptive', function () {
    var snapshot = null;
    try {
      var state = root.__getFiezelState ? root.__getFiezelState() : null;
      if (state) snapshot = { level: state.level || '', stuck: false };
    } catch (_) {}
    return { findings: tests.adaptive(snapshot, targets) };
  });

  bus.registerSelfTest('core', function () {
    var findings = [];
    try {
      if (!('caches' in root)) findings.push(bus.finding('CORE_NO_CACHE_API', 'warning', 'CacheStorage tidak tersedia.'));
      if (root.navigator && root.navigator.serviceWorker && !root.navigator.serviceWorker.controller) {
        findings.push(bus.finding('CORE_SW_UNCONTROLLED', 'warning', 'Halaman belum dikontrol service worker.'));
      }
      if (root.FIEZEL_REQUIRE_NOTIFICATIONS === true && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        findings.push(bus.finding('CORE_NOTIFICATION_NOT_GRANTED', 'warning', 'Notifikasi wajib tetapi izin belum granted: ' + Notification.permission));
      }
    } catch (error) {
      findings.push(bus.finding('CORE_PROBE_FAILED', 'error', String((error && error.message) || error)));
    }
    return { findings: findings };
  });
}(typeof globalThis !== 'undefined' ? globalThis : this));
