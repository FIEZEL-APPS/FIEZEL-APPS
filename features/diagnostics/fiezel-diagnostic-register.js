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
  dataTest('classroom', './features/classroom/classroom-lessons-v1.json', function (d) { return tests.classroom(d); });

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
