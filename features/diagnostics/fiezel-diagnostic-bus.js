/**
 * m025-34 FIEZEL universal diagnostic bus (Master Prompt V10).
 *
 * One registry every module reports into, plus a self-test orchestrator, so the
 * Diagnostic button reports the health of the whole app rather than just Neural Voice.
 * The output is meant to be pasted straight into a chat with no explanation from the
 * user, so the summary is written for a reader who has not seen the code.
 *
 * Hard rule from the spec: a broken module must never break diagnostics. Every
 * self-test is invoked through a try/catch at the orchestrator level and a thrown
 * module is reported as a finding, not propagated.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelDiagnosticBus = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MODULES = ['core', 'vocabulary', 'reading', 'grammar', 'leveltest', 'listening', 'speaking',
    'chat', 'neuralVoice', 'classroom', 'adaptive',
    // m025-41: the scan covers the layers that actually broke in production -
    // speech shaping, the optional Indonesian bundle, module wiring, saved state and
    // what the learner sees on screen.
    'prosody', 'indonesianVoice', 'runtime', 'storage', 'ui'];
  var SEVERITIES = ['fatal', 'error', 'warning'];
  var MAX_ENTRIES = 500;

  var registry = {
    meta: { schema: 'fiezel-diag-v2', bootedAt: Date.now() },
    errors: [],
    events: [],
    moduleHealth: {}
  };

  var selfTests = {};
  var handlersInstalled = false;

  function normaliseModule(id) {
    var value = String(id || 'core');
    return MODULES.indexOf(value) === -1 ? 'core' : value;
  }
  function normaliseSeverity(value) {
    var v = String(value || 'error');
    return SEVERITIES.indexOf(v) === -1 ? 'error' : v;
  }
  // Errors are truncated from the front: the newest are the ones worth keeping when a
  // loop floods the registry.
  function push(list, entry) {
    list.push(entry);
    if (list.length > MAX_ENTRIES) list.splice(0, list.length - MAX_ENTRIES);
  }

  function reportError(moduleId, severity, code, message, extra) {
    var e = extra || {};
    var entry = {
      t: Date.now(),
      module: normaliseModule(moduleId),
      severity: normaliseSeverity(severity),
      code: String(code || 'UNSPECIFIED'),
      message: String(message == null ? '' : message).slice(0, 500),
      stack: e.stack ? String(e.stack).slice(0, 2000) : null,
      context: e.context == null ? null : e.context
    };
    push(registry.errors, entry);
    return entry;
  }

  function reportEvent(moduleId, phase, data) {
    var entry = { t: Date.now(), module: normaliseModule(moduleId), phase: String(phase || 'event'), data: data || null };
    push(registry.events, entry);
    return entry;
  }

  function registerSelfTest(moduleId, fn) {
    if (typeof fn !== 'function') throw new Error('selftest_must_be_function');
    selfTests[normaliseModule(moduleId)] = fn;
  }

  function installGlobalHandlers(target) {
    var g = target || root;
    if (handlersInstalled || !g || typeof g.addEventListener !== 'function') return false;
    handlersInstalled = true;
    g.addEventListener('error', function (e) {
      reportError('core', 'fatal', 'UNCAUGHT_ERROR', (e && e.message) || 'uncaught error', {
        stack: e && e.error && e.error.stack,
        context: e ? String(e.filename || '') + ':' + String(e.lineno || '') : null
      });
    });
    g.addEventListener('unhandledrejection', function (e) {
      var reason = e && e.reason;
      reportError('core', 'fatal', 'UNHANDLED_PROMISE_REJECTION', String(reason && reason.message ? reason.message : reason), {
        stack: reason && reason.stack
      });
    });
    return true;
  }

  function finding(code, severity, detail, count) {
    return { code: String(code), severity: normaliseSeverity(severity), detail: String(detail), count: count == null ? null : Number(count) };
  }

  // Status is derived, never authored: any fatal/error finding fails the module, any
  // warning degrades it. That keeps badge colour and findings from disagreeing.
  function statusFor(findings) {
    if (!findings.length) return 'pass';
    for (var i = 0; i < findings.length; i++) {
      if (findings[i].severity === 'fatal' || findings[i].severity === 'error') return 'fail';
    }
    return 'warn';
  }

  async function runSelfTest(moduleId) {
    var fn = selfTests[moduleId];
    if (!fn) return { module: moduleId, status: 'skip', findings: [finding('NO_SELFTEST', 'warning', 'Modul belum punya self-test.', null)] };
    try {
      var raw = await fn();
      var findings = (raw && Array.isArray(raw.findings)) ? raw.findings : [];
      return { module: moduleId, status: (raw && raw.status) || statusFor(findings), findings: findings };
    } catch (error) {
      // The whole point of the orchestrator: a module that throws is a finding.
      var message = String((error && error.message) || error);
      reportError(moduleId, 'error', 'SELFTEST_THREW', message, { stack: error && error.stack });
      return { module: moduleId, status: 'fail', findings: [finding('SELFTEST_THREW', 'error', 'Self-test gagal dijalankan: ' + message, null)] };
    }
  }

  async function getFullReport(environment) {
    var health = {};
    var ids = Object.keys(selfTests);
    for (var i = 0; i < ids.length; i++) health[ids[i]] = await runSelfTest(ids[i]);
    registry.moduleHealth = health;

    var counts = { fatal: 0, error: 0, warning: 0 };
    registry.errors.forEach(function (e) { counts[e.severity] = (counts[e.severity] || 0) + 1; });

    return {
      meta: {
        schema: registry.meta.schema,
        bootedAt: registry.meta.bootedAt,
        generatedAt: Date.now(),
        generatedAtIso: new Date().toISOString()
      },
      environment: environment || null,
      summary: {
        modules: Object.keys(health).length,
        failing: Object.keys(health).filter(function (k) { return health[k].status === 'fail'; }),
        warning: Object.keys(health).filter(function (k) { return health[k].status === 'warn'; }),
        errorCounts: counts
      },
      moduleHealth: health,
      errors: registry.errors.slice(),
      events: registry.events.slice()
    };
  }

  // Human-readable digest: this is what the user copies into a chat, so it must stand
  // alone without the JSON and without the user explaining anything.
  function summaryText(report) {
    var lines = [];
    lines.push('FIEZEL DIAGNOSTIC ' + (report.meta.generatedAtIso || ''));
    if (report.environment) {
      lines.push('build ' + String(report.environment.diagBuild || '?') + ' · v' + String(report.environment.appVersion || '?') +
        ' · standalone=' + String(!!report.environment.standalone));
    }
    var c = report.summary.errorCounts;
    lines.push('errors: ' + (c.fatal || 0) + ' fatal, ' + (c.error || 0) + ' error, ' + (c.warning || 0) + ' warning');
    lines.push('');
    var health = report.moduleHealth;
    Object.keys(health).forEach(function (key) {
      var m = health[key];
      var mark = m.status === 'pass' ? 'OK  ' : m.status === 'warn' ? 'WARN' : m.status === 'skip' ? 'SKIP' : 'FAIL';
      lines.push(mark + ' ' + key);
      m.findings.forEach(function (f) {
        lines.push('     - [' + f.severity + '] ' + f.code + ': ' + f.detail + (f.count == null ? '' : ' (' + f.count + ')'));
      });
    });
    if (report.errors.length) {
      lines.push('');
      lines.push('recent errors:');
      report.errors.slice(-10).forEach(function (e) {
        lines.push('  [' + e.severity + '] ' + e.module + '/' + e.code + ': ' + e.message);
      });
    }
    return lines.join('\n');
  }

  function reset() {
    registry.errors.length = 0;
    registry.events.length = 0;
    registry.moduleHealth = {};
    // Registrations are part of the state a caller resets; leaving them behind makes
    // isolated runs observe another run's modules.
    Object.keys(selfTests).forEach(function (k) { delete selfTests[k]; });
  }

  return Object.freeze({
    MODULES: MODULES.slice(),
    SEVERITIES: SEVERITIES.slice(),
    reportError: reportError,
    reportEvent: reportEvent,
    registerSelfTest: registerSelfTest,
    installGlobalHandlers: installGlobalHandlers,
    runSelfTest: runSelfTest,
    getFullReport: getFullReport,
    summaryText: summaryText,
    finding: finding,
    statusFor: statusFor,
    registry: function () { return { errors: registry.errors.slice(), events: registry.events.slice(), moduleHealth: registry.moduleHealth }; },
    reset: reset
  });
}));
