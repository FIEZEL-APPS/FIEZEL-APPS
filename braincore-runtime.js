/**
 * FIEZEL Braincore standalone runtime boundary.
 *
 * This is intentionally a thin orchestration/front-door layer over the already-tested
 * Braincore pipeline. It does not duplicate learning mathematics and it does not own storage,
 * network, DOM, telemetry or clocks. A host supplies inputs and time; this runtime owns one
 * learner state and makes state portability + diagnostics explicit.
 *
 * Sale-readiness properties:
 * - one object is the public front door instead of a host knowing every Braincore sidecar;
 * - export/import uses the versioned `fiezel-braincore-state-v1` contract;
 * - guard failures that the app-style pipeline deliberately degrades around are NEVER silent:
 *   they are retained in status(), returned with the answer, and optionally emitted to an
 *   injected callback. Learning still continues, preserving the local-first/fail-soft contract;
 * - no hidden I/O: grep is not the proof; braincore-local-first-test + runtime tests execute it.
 *
 * This file is a standalone runtime candidate. The browser app is not claimed to have migrated
 * to it until app.js wiring is explicitly moved and tested in a later step.
 */
'use strict';

const Pipeline = require('./braincore-pipeline.js');
const State = require('./braincore-state.js');
const Manifest = require('./features/brain/fiezel-brain-manifest.js');

const SCHEMA = 'fiezel-braincore-runtime-v1';

function finiteTime(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    const err = new TypeError('BraincoreRuntime: ' + label + ' must be a non-negative finite number');
    err.code = 'BRAINCORE_RUNTIME_INVALID_TIME';
    throw err;
  }
  return n;
}

function create(options) {
  const opts = options || {};
  let learner = opts.snapshot
    ? State.importState(opts.snapshot)
    : (opts.learner
        ? State.importState(State.exportState(opts.learner, { braincoreVersion: Manifest.bundleVersion }))
        : Pipeline.createLearner({
            level: opts.level || 'A2',
            now: opts.now == null ? 0 : finiteTime(opts.now, 'now'),
            baselineMs: opts.baselineMs || 0
          }));

  const onDiagnostic = typeof opts.onDiagnostic === 'function' ? opts.onDiagnostic : null;
  let guardErrorCount = 0;
  let lastGuardErrors = [];
  let lastDecision = null;
  let lastTrace = null;

  function emitGuardDiagnostics(errors, now, trace) {
    lastGuardErrors = Array.isArray(errors) ? errors.map(String) : [];
    if (!lastGuardErrors.length) return;
    guardErrorCount += lastGuardErrors.length;
    if (!onDiagnostic) return;
    for (const message of lastGuardErrors) {
      try {
        onDiagnostic(Object.freeze({
          schema: 'fiezel-braincore-diagnostic-v1',
          type: 'guard_error',
          severity: 'error',
          message,
          at: now,
          stateRevision: Number(learner.stateRevision) || 0,
          decision: trace && trace.decision ? String(trace.decision) : ''
        }));
      } catch (_) {
        // A reporting hook must never become a dependency of learning. The diagnostic is still
        // retained in status()/answer() even if the host callback itself is broken.
      }
    }
  }

  function answer(question, evidence, now) {
    const at = finiteTime(now, 'answer now');
    const result = Pipeline.answer(learner, question, evidence, at);
    learner = result.learner;
    lastDecision = result.decision || null;
    lastTrace = result.trace || null;
    emitGuardDiagnostics(result.guardErrors, at, result.trace);
    return {
      learner: State.importState(State.exportState(learner, { braincoreVersion: Manifest.bundleVersion })),
      decision: result.decision,
      trace: result.trace,
      guardErrors: lastGuardErrors.slice(),
      status: status()
    };
  }

  function newSession(now) {
    learner = Pipeline.newSession(learner, finiteTime(now, 'session now'));
    lastGuardErrors = [];
    return snapshot(now);
  }

  function snapshot(at) {
    const options = { braincoreVersion: Manifest.bundleVersion };
    if (at != null) options.at = finiteTime(at, 'snapshot at');
    return State.exportState(learner, options);
  }

  function importSnapshot(nextSnapshot) {
    learner = State.importState(nextSnapshot);
    lastGuardErrors = [];
    lastDecision = null;
    lastTrace = null;
    return snapshot();
  }

  function status() {
    return Object.freeze({
      schema: SCHEMA,
      braincoreVersion: Manifest.bundleVersion,
      stateSchema: State.SCHEMA,
      stateRevision: Number(learner.stateRevision) || 0,
      degraded: lastGuardErrors.length > 0,
      guardErrorCount,
      lastGuardErrors: Object.freeze(lastGuardErrors.slice()),
      lastDecision: lastTrace && lastTrace.decision ? String(lastTrace.decision) :
        (lastDecision && lastDecision.move ? String(lastDecision.move) : '')
    });
  }

  function currentLearner() {
    return State.importState(State.exportState(learner, { braincoreVersion: Manifest.bundleVersion }));
  }

  return Object.freeze({
    schema: SCHEMA,
    answer,
    newSession,
    snapshot,
    exportState: snapshot,
    importState: importSnapshot,
    status,
    learner: currentLearner
  });
}

function fromSnapshot(snapshot, options) {
  return create({ ...(options || {}), snapshot });
}

module.exports = Object.freeze({
  SCHEMA,
  create,
  fromSnapshot,
  stateSchema: State.SCHEMA,
  braincoreVersion: Manifest.bundleVersion
});
