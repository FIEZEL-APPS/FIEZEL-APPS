/**
 * FIEZEL Braincore standalone runtime boundary.
 *
 * Thin orchestration/front-door layer over the tested Braincore pipeline. It owns no storage,
 * network, DOM, telemetry transport or clock. A host supplies inputs and time; this runtime owns
 * learner state plus an optional content-governance registry.
 *
 * Item governance is deliberately separate from learner mathematics. A deterministic Content QA
 * report admits/rejects a content revision; privacy-preserving aggregate health evidence may later
 * hold/quarantine it. When `enforceItemGovernance:true`, answer() fails closed before learning if
 * a question revision is unknown or non-active. Existing hosts remain backward compatible until
 * they explicitly enable enforcement and bootstrap their bank through admission.
 */
'use strict';

const Pipeline = require('./braincore-pipeline.js');
const State = require('./braincore-state.js');
const Governance = require('./braincore-item-governance.js');
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

  const snapshotGovernance = opts.snapshot ? State.importGovernance(opts.snapshot) : null;
  let governance = snapshotGovernance
    ? Governance.importState(snapshotGovernance)
    : (opts.governance ? Governance.importState(opts.governance) : Governance.createState());
  const enforceItemGovernance = opts.enforceItemGovernance === true;

  const onDiagnostic = typeof opts.onDiagnostic === 'function' ? opts.onDiagnostic : null;
  let guardErrorCount = 0;
  let lastGuardErrors = [];
  let lastDecision = null;
  let lastTrace = null;

  function emitDiagnostic(payload) {
    if (!onDiagnostic) return;
    try { onDiagnostic(Object.freeze(payload)); }
    catch (_) {
      // Reporting is observational only. A broken host callback must never block learning or
      // content governance; durable status/history remains available from runtime APIs.
    }
  }

  function emitGuardDiagnostics(errors, now, trace) {
    lastGuardErrors = Array.isArray(errors) ? errors.map(String) : [];
    if (!lastGuardErrors.length) return;
    guardErrorCount += lastGuardErrors.length;
    for (const message of lastGuardErrors) {
      emitDiagnostic({
        schema: 'fiezel-braincore-diagnostic-v1',
        type: 'guard_error',
        severity: 'error',
        message,
        at: now,
        stateRevision: Number(learner.stateRevision) || 0,
        decision: trace && trace.decision ? String(trace.decision) : ''
      });
    }
  }

  function governedQuestion(question) {
    const q = question || {};
    if (typeof q.id !== 'string' || !q.id.trim() || typeof q.contentRevision !== 'string' || !q.contentRevision.trim()) {
      const err = new TypeError('BraincoreRuntime: governed question requires id + contentRevision');
      err.code = 'BRAINCORE_ITEM_IDENTITY_REQUIRED';
      throw err;
    }
    return { id: q.id.trim(), contentRevision: q.contentRevision.trim() };
  }

  function assertEligible(question) {
    const identity = governedQuestion(question);
    const item = Governance.statusFor(governance, identity);
    if (!item.eligible) {
      const err = new Error('BraincoreRuntime: item ' + identity.id + ' is not learner-eligible (' + item.status + ')');
      err.code = 'BRAINCORE_ITEM_INELIGIBLE';
      err.itemStatus = item;
      throw err;
    }
    return item;
  }

  function answer(question, evidence, now) {
    const at = finiteTime(now, 'answer now');
    if (enforceItemGovernance) assertEligible(question);
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

  function admitItem(item, qaReport, now) {
    const at = finiteTime(now, 'admission now');
    governance = Governance.admitFromQa(governance, item, qaReport, at);
    const current = Governance.statusFor(governance, item);
    if (!current.eligible) {
      emitDiagnostic({
        schema: 'fiezel-braincore-diagnostic-v1', type: 'item_governance', severity: 'warning',
        message: 'item held from learner pool', itemId: current.itemId, itemStatus: current.status,
        reasonCodes: current.reasonCodes, at, governanceRevision: governance.revision
      });
    }
    return current;
  }

  function observeItemHealth(itemId, aggregate, now) {
    const at = finiteTime(now, 'item health now');
    const before = Governance.statusFor(governance, itemId);
    governance = Governance.observeAggregate(governance, itemId, aggregate, at);
    const current = Governance.statusFor(governance, itemId);
    if (before.status !== current.status || !current.eligible) {
      emitDiagnostic({
        schema: 'fiezel-braincore-diagnostic-v1', type: 'item_governance',
        severity: current.status === Governance.STATUS.QUARANTINED ? 'error' : 'warning',
        message: 'item governance status evaluated', itemId: current.itemId, itemStatus: current.status,
        reasonCodes: current.reasonCodes, at, governanceRevision: governance.revision
      });
    }
    return current;
  }

  function reviewItem(itemId, decision, now) {
    const at = finiteTime(now, 'item review now');
    governance = Governance.reviewItem(governance, itemId, decision, at);
    return Governance.statusFor(governance, itemId);
  }

  function retireItem(itemId, retirementRef, now) {
    const at = finiteTime(now, 'item retirement now');
    governance = Governance.retireItem(governance, itemId, retirementRef, at);
    return Governance.statusFor(governance, itemId);
  }

  function itemStatus(itemOrId) {
    return Governance.statusFor(governance, itemOrId);
  }

  function isItemEligible(itemOrId) {
    return Governance.isEligible(governance, itemOrId);
  }

  function filterEligible(items) {
    return Governance.filterEligible(governance, items);
  }

  function governanceState() {
    return Governance.exportState(governance);
  }

  function snapshot(at) {
    const options = {
      braincoreVersion: Manifest.bundleVersion,
      governance: Governance.exportState(governance)
    };
    if (at != null) options.at = finiteTime(at, 'snapshot at');
    return State.exportState(learner, options);
  }

  function importSnapshot(nextSnapshot) {
    learner = State.importState(nextSnapshot);
    const importedGovernance = State.importGovernance(nextSnapshot);
    governance = importedGovernance ? Governance.importState(importedGovernance) : Governance.createState();
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
      itemGovernanceSchema: Governance.SCHEMA,
      itemGovernanceEnforced: enforceItemGovernance,
      governanceRevision: governance.revision,
      governedItems: Object.keys(governance.items).length,
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
    admitItem,
    observeItemHealth,
    reviewItem,
    retireItem,
    itemStatus,
    isItemEligible,
    filterEligible,
    assertEligible,
    governance: governanceState,
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
  itemGovernanceSchema: Governance.SCHEMA,
  itemHealthAggregateSchema: Governance.AGGREGATE_SCHEMA,
  braincoreVersion: Manifest.bundleVersion
});
