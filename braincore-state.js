/**
 * FIEZEL Braincore state boundary.
 *
 * Braincore's calculation modules are deliberately pure: they do not own storage. The
 * integration layer therefore needs one explicit, portable state object that can cross a
 * persistence boundary without teaching the engine about localStorage, IndexedDB, a server,
 * or a particular application shell.
 *
 * This module is that boundary. It has no clock, no I/O, no network and no dependency on
 * FIEZEL UI. `exportState()` accepts the learner object used by the Braincore orchestration
 * layer and returns a versioned JSON-safe snapshot. `importState()` validates that snapshot
 * and returns a detached learner object ready to continue learning.
 *
 * Deliberate non-goals:
 * - no migration guessing: unknown schema versions fail closed;
 * - no hidden defaults for missing required state: corrupt/incomplete snapshots fail loudly;
 * - no JSON stringification as validation: unsupported values are rejected before data can be
 *   silently dropped by JSON.stringify();
 * - no mutation: both directions return fresh object graphs.
 */
'use strict';

const SCHEMA = 'fiezel-braincore-state-v1';
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const REQUIRED_LEARNER_KEYS = Object.freeze([
  'level', 'stateRevision', 'bkt', 'ledger', 'calibration', 'memory', 'history',
  'affectRows', 'affectState', 'affectConfidence', 'affectChanged', 'tutor'
]);

function fail(message) {
  const err = new TypeError('BraincoreState: ' + message);
  err.code = 'BRAINCORE_STATE_INVALID';
  throw err;
}

function cloneJson(value, path, seen) {
  const here = path || '$';
  const stack = seen || new Set();

  if (value === null) return null;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') {
    if (!Number.isFinite(value)) fail(here + ' contains a non-finite number');
    return value;
  }
  if (type === 'undefined' || type === 'function' || type === 'symbol' || type === 'bigint') {
    fail(here + ' contains unsupported value type ' + type);
  }
  if (type !== 'object') fail(here + ' contains unsupported value');
  if (stack.has(value)) fail(here + ' contains a cycle');

  stack.add(value);
  let out;
  if (Array.isArray(value)) {
    out = value.map((item, i) => cloneJson(item, here + '[' + i + ']', stack));
  } else {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      stack.delete(value);
      fail(here + ' must contain plain objects only');
    }
    out = {};
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) {
        stack.delete(value);
        fail(here + ' contains forbidden key ' + key);
      }
      out[key] = cloneJson(value[key], here + '.' + key, stack);
    }
  }
  stack.delete(value);
  return out;
}

function validateLearner(learner) {
  if (!learner || typeof learner !== 'object' || Array.isArray(learner)) {
    fail('learner must be an object');
  }
  for (const key of REQUIRED_LEARNER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(learner, key)) fail('learner.' + key + ' is required');
  }
  if (typeof learner.level !== 'string' || learner.level.length < 1 || learner.level.length > 16) {
    fail('learner.level must be a short non-empty string');
  }
  if (!Number.isInteger(learner.stateRevision) || learner.stateRevision < 0) {
    fail('learner.stateRevision must be a non-negative integer');
  }
  if (!learner.bkt || typeof learner.bkt !== 'object' || Array.isArray(learner.bkt)) {
    fail('learner.bkt must be an object');
  }
  if (!learner.memory || typeof learner.memory !== 'object' || Array.isArray(learner.memory)) {
    fail('learner.memory must be an object');
  }
  if (!Array.isArray(learner.history)) fail('learner.history must be an array');
  if (!Array.isArray(learner.affectRows)) fail('learner.affectRows must be an array');
  if (typeof learner.affectState !== 'string') fail('learner.affectState must be a string');
  if (!Number.isFinite(learner.affectConfidence) || learner.affectConfidence < 0 || learner.affectConfidence > 1) {
    fail('learner.affectConfidence must be in [0,1]');
  }
  if (typeof learner.affectChanged !== 'boolean') fail('learner.affectChanged must be boolean');
  if (!learner.tutor || typeof learner.tutor !== 'object' || Array.isArray(learner.tutor)) {
    fail('learner.tutor must be an object');
  }
  if (learner.ledger !== null && (typeof learner.ledger !== 'object' || Array.isArray(learner.ledger))) {
    fail('learner.ledger must be null or object');
  }
  if (learner.calibration !== null && (typeof learner.calibration !== 'object' || Array.isArray(learner.calibration))) {
    fail('learner.calibration must be null or object');
  }
}

function exportState(learner, options) {
  validateLearner(learner);
  const opts = options || {};
  const snapshot = {
    schema: SCHEMA,
    braincoreVersion: opts.braincoreVersion == null ? '' : String(opts.braincoreVersion),
    learner: cloneJson(learner, '$.learner')
  };
  if (opts.at != null) {
    const at = Number(opts.at);
    if (!Number.isFinite(at) || at < 0) fail('options.at must be a non-negative finite number');
    snapshot.at = at;
  }
  return snapshot;
}

function importState(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) fail('snapshot must be an object');
  if (snapshot.schema !== SCHEMA) fail('unsupported schema ' + JSON.stringify(snapshot.schema));
  if (typeof snapshot.braincoreVersion !== 'string') fail('braincoreVersion must be a string');
  if (snapshot.at != null && (!Number.isFinite(snapshot.at) || snapshot.at < 0)) fail('snapshot.at is invalid');
  validateLearner(snapshot.learner);
  return cloneJson(snapshot.learner, '$.learner');
}

function serialize(snapshotOrLearner, options) {
  const snapshot = snapshotOrLearner && snapshotOrLearner.schema === SCHEMA
    ? { ...snapshotOrLearner, learner: importState(snapshotOrLearner) }
    : exportState(snapshotOrLearner, options);
  return JSON.stringify(snapshot);
}

function parse(text) {
  if (typeof text !== 'string') fail('serialized state must be a string');
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (_) { fail('serialized state is not valid JSON'); }
  return importState(parsed);
}

module.exports = Object.freeze({
  SCHEMA,
  REQUIRED_LEARNER_KEYS,
  exportState,
  importState,
  serialize,
  parse
});
