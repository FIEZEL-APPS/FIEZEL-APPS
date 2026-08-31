/**
 * FIEZEL Braincore Item Governance — deterministic admission + empirical quarantine.
 *
 * This module decides whether a content item is eligible to enter a learner-facing pool.
 * It deliberately does NOT delete canonical content and does not perform I/O. A host supplies
 * an existing deterministic Content QA report and, later, privacy-preserving aggregate item
 * health metrics. The result is a versioned, auditable registry whose only learner-eligible
 * status is ACTIVE.
 *
 * Safety model:
 * - deterministic QA blockers can quarantine before first learner exposure;
 * - review findings are held for review rather than exposed optimistically;
 * - empirical signals require enough exposures AND independent learners;
 * - one learner/device can never quarantine an item through empirical evidence;
 * - a quarantine is sticky across later healthy aggregates and needs either a new content
 *   revision that passes QA or an explicit reviewed approval;
 * - unknown and stale-revision items fail closed in selector/filter APIs.
 */
'use strict';

const SCHEMA = 'fiezel-braincore-item-governance-v1';
const RECORD_SCHEMA = 'fiezel-braincore-item-record-v1';
const QA_SCHEMA = 'fiezel-content-qa-v1';
const AGGREGATE_SCHEMA = 'fiezel-item-health-aggregate-v1';
const EVENT_LIMIT = 64;
const MIN_EXPOSURES = 30;
const MIN_INDEPENDENT_LEARNERS = 10;
const NEGATIVE_DISCRIMINATION_EXPOSURES = 50;
const REVIEW_HEALTHY_WINDOWS = 2;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const STATUS = Object.freeze({
  CANDIDATE: 'candidate',
  ACTIVE: 'active',
  REVIEW_REQUIRED: 'review_required',
  QUARANTINED: 'quarantined',
  RETIRED: 'retired'
});
const KNOWN_STATUS = new Set(Object.values(STATUS));

function fail(message, code) {
  const err = new TypeError('BraincoreItemGovernance: ' + message);
  err.code = code || 'BRAINCORE_ITEM_GOVERNANCE_INVALID';
  throw err;
}

function finiteTime(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) fail((label || 'time') + ' must be a non-negative finite number');
  return n;
}

function boundedString(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > (max || 160)) {
    fail((label || 'value') + ' must be a non-empty bounded string');
  }
  if (FORBIDDEN_KEYS.has(value)) fail((label || 'value') + ' is forbidden');
  return value.trim();
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
    out = value.map((v, i) => cloneJson(v, here + '[' + i + ']', stack));
  } else {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) fail(here + ' must contain plain objects only');
    out = {};
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) fail(here + ' contains forbidden key ' + key);
      out[key] = cloneJson(value[key], here + '.' + key, stack);
    }
  }
  stack.delete(value);
  return out;
}

function createState() {
  return { schema: SCHEMA, revision: 0, items: {} };
}

function validateRate(v, label, optional) {
  if (v == null && optional) return null;
  if (!Number.isFinite(v) || v < 0 || v > 1) fail(label + ' must be in [0,1]');
  return v;
}

function validateCount(v, label) {
  if (!Number.isInteger(v) || v < 0) fail(label + ' must be a non-negative integer');
  return v;
}

function optionalCount(v, label) {
  return v == null ? 0 : validateCount(v, label);
}

function validateState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schema !== SCHEMA) {
    fail('unsupported or missing state schema');
  }
  validateCount(raw.revision, 'state.revision');
  if (!raw.items || typeof raw.items !== 'object' || Array.isArray(raw.items)) fail('state.items must be an object');
  for (const [key, rec] of Object.entries(raw.items)) {
    boundedString(key, 'item key');
    if (!rec || typeof rec !== 'object' || Array.isArray(rec) || rec.schema !== RECORD_SCHEMA) fail('invalid record for ' + key);
    if (rec.itemId !== key) fail('record key/itemId mismatch for ' + key);
    boundedString(rec.contentRevision, 'contentRevision', 128);
    if (!KNOWN_STATUS.has(rec.status)) fail('unknown status for ' + key);
    if (typeof rec.eligible !== 'boolean' || rec.eligible !== (rec.status === STATUS.ACTIVE)) fail('eligibility/status mismatch for ' + key);
    validateCount(rec.healthyQualifiedStreak, 'healthyQualifiedStreak');
    finiteTime(rec.updatedAt, 'updatedAt');
    if (!Array.isArray(rec.reasonCodes) || !Array.isArray(rec.history)) fail('record reason/history malformed for ' + key);
    if (rec.history.length > EVENT_LIMIT) fail('record history exceeds bound for ' + key);
  }
}

function exportState(state) {
  validateState(state);
  return cloneJson(state, '$.governance');
}

function importState(state) {
  validateState(state);
  return cloneJson(state, '$.governance');
}

function reason(category) {
  const safe = String(category || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'unknown';
  return 'brain3_item_qa_' + safe;
}

function uniq(values) {
  return [...new Set((values || []).map(String).filter(Boolean))].sort();
}

function findingMatches(itemId, findingId) {
  const item = String(itemId || '');
  const found = String(findingId || '');
  return found === item || item.startsWith(found + '#') || found.startsWith(item + '#');
}

function findingsFor(report, itemId) {
  if (!report || typeof report !== 'object' || report.schema !== QA_SCHEMA) fail('QA report must use ' + QA_SCHEMA);
  const all = [];
  for (const f of Array.isArray(report.blockingFindings) ? report.blockingFindings : []) all.push(f);
  for (const f of Array.isArray(report.reviewQueue) ? report.reviewQueue : []) all.push(f);
  return all.filter((f) => f && typeof f === 'object' && findingMatches(itemId, f.itemId));
}

function event(at, from, to, source, contentRevision, reasonCodes, evidence) {
  return {
    at,
    from: from || STATUS.CANDIDATE,
    to,
    source,
    contentRevision,
    reasonCodes: uniq(reasonCodes),
    evidence: cloneJson(evidence || {}, '$.event.evidence')
  };
}

function writeRecord(state, itemId, contentRevision, nextStatus, source, reasonCodes, evidence, at, options) {
  const next = importState(state);
  const previous = next.items[itemId] || null;
  const history = previous && Array.isArray(previous.history) ? previous.history.slice() : [];
  history.push(event(at, previous && previous.status, nextStatus, source, contentRevision, reasonCodes, evidence));
  while (history.length > EVENT_LIMIT) history.shift();
  const healthyQualifiedStreak = options && Number.isInteger(options.healthyQualifiedStreak)
    ? Math.max(0, options.healthyQualifiedStreak)
    : (previous ? previous.healthyQualifiedStreak : 0);
  next.items[itemId] = {
    schema: RECORD_SCHEMA,
    itemId,
    contentRevision,
    status: nextStatus,
    eligible: nextStatus === STATUS.ACTIVE,
    source,
    reasonCodes: uniq(reasonCodes),
    evidence: cloneJson(evidence || {}, '$.record.evidence'),
    healthyQualifiedStreak,
    updatedAt: at,
    history
  };
  next.revision += 1;
  return next;
}

function admitFromQa(state, item, report, now) {
  const at = finiteTime(now, 'admission time');
  const itemId = boundedString(item && item.id, 'item.id');
  const contentRevision = boundedString(item && item.contentRevision, 'item.contentRevision', 128);
  const matched = findingsFor(report, itemId);
  const blockers = matched.filter((f) => f.severity === 'blocker');
  const reviews = matched.filter((f) => f.severity === 'review');
  const previous = state && state.items ? state.items[itemId] : null;
  const sameRevisionSticky = previous && previous.status === STATUS.QUARANTINED && previous.contentRevision === contentRevision;

  let nextStatus;
  let reasonCodes;
  if (blockers.length) {
    nextStatus = STATUS.QUARANTINED;
    reasonCodes = blockers.map((f) => reason(f.category));
  } else if (reviews.length) {
    nextStatus = STATUS.REVIEW_REQUIRED;
    reasonCodes = reviews.map((f) => reason(f.category));
  } else if (sameRevisionSticky) {
    nextStatus = STATUS.QUARANTINED;
    reasonCodes = uniq([...(previous.reasonCodes || []), 'brain3_item_quarantine_sticky_same_revision']);
  } else {
    nextStatus = STATUS.ACTIVE;
    reasonCodes = ['brain3_item_qa_pass'];
  }

  return writeRecord(state, itemId, contentRevision, nextStatus, 'qa', reasonCodes, {
    qaSchema: report.schema,
    qaVersion: report.version == null ? '' : String(report.version),
    blockers: blockers.length,
    reviews: reviews.length,
    matched: matched.slice(0, 20).map((f) => ({ category: String(f.category || ''), severity: String(f.severity || ''), itemId: String(f.itemId || '') }))
  }, at, { healthyQualifiedStreak: 0 });
}

function normalizeAggregate(raw) {
  if (!raw || typeof raw !== 'object' || raw.schema !== AGGREGATE_SCHEMA) fail('aggregate must use ' + AGGREGATE_SCHEMA);
  const contentRevision = boundedString(raw.contentRevision, 'aggregate.contentRevision', 128);
  const exposures = validateCount(raw.exposures, 'aggregate.exposures');
  const independentLearners = validateCount(raw.independentLearners, 'aggregate.independentLearners');
  const graderDisagreements = optionalCount(raw.graderDisagreements, 'aggregate.graderDisagreements');
  const answerDisputes = optionalCount(raw.answerDisputes, 'aggregate.answerDisputes');
  const renderFailures = optionalCount(raw.renderFailures, 'aggregate.renderFailures');
  if (graderDisagreements > exposures || answerDisputes > exposures || renderFailures > exposures) fail('aggregate event counts cannot exceed exposures');
  const correctRate = validateRate(raw.correctRate, 'aggregate.correctRate', true);
  const expectedCorrectRate = validateRate(raw.expectedCorrectRate, 'aggregate.expectedCorrectRate', true);
  const distractorCoverage = validateRate(raw.distractorCoverage, 'aggregate.distractorCoverage', true);
  let discrimination = raw.discrimination;
  if (discrimination != null) {
    if (!Number.isFinite(discrimination) || discrimination < -1 || discrimination > 1) fail('aggregate.discrimination must be in [-1,1]');
  } else discrimination = null;
  return { contentRevision, exposures, independentLearners, graderDisagreements, answerDisputes, renderFailures, correctRate, expectedCorrectRate, distractorCoverage, discrimination };
}

function observeAggregate(state, itemIdInput, rawAggregate, now) {
  const at = finiteTime(now, 'aggregate time');
  const itemId = boundedString(itemIdInput, 'itemId');
  validateState(state);
  const previous = state.items[itemId];
  if (!previous) fail('item ' + itemId + ' has not passed admission', 'BRAINCORE_ITEM_NOT_ADMITTED');
  if (previous.status === STATUS.RETIRED) fail('retired item cannot accept health evidence', 'BRAINCORE_ITEM_RETIRED');
  const aggregate = normalizeAggregate(rawAggregate);
  if (aggregate.contentRevision !== previous.contentRevision) {
    fail('aggregate contentRevision is stale', 'BRAINCORE_ITEM_STALE_EVIDENCE');
  }

  const qualified = aggregate.exposures >= MIN_EXPOSURES && aggregate.independentLearners >= MIN_INDEPENDENT_LEARNERS;
  const evidence = { ...aggregate, qualified };
  if (!qualified) {
    return writeRecord(state, itemId, previous.contentRevision, previous.status, 'empirical', ['brain3_item_health_insufficient_evidence'], evidence, at, { healthyQualifiedStreak: 0 });
  }

  const strong = [];
  const review = [];
  const graderRate = aggregate.exposures ? aggregate.graderDisagreements / aggregate.exposures : 0;
  const disputeRate = aggregate.exposures ? aggregate.answerDisputes / aggregate.exposures : 0;
  const renderRate = aggregate.exposures ? aggregate.renderFailures / aggregate.exposures : 0;
  if (aggregate.graderDisagreements >= 5 && graderRate >= 0.15) strong.push('brain3_item_health_grader_disagreement');
  if (aggregate.answerDisputes >= 4 && disputeRate >= 0.10) strong.push('brain3_item_health_answer_dispute');
  if (aggregate.renderFailures >= 3 && renderRate >= 0.05) strong.push('brain3_item_health_render_failure');
  if (aggregate.exposures >= NEGATIVE_DISCRIMINATION_EXPOSURES && aggregate.discrimination != null && aggregate.discrimination <= -0.10) strong.push('brain3_item_health_negative_discrimination');
  if (aggregate.correctRate != null && aggregate.expectedCorrectRate != null && Math.abs(aggregate.correctRate - aggregate.expectedCorrectRate) >= 0.35) review.push('brain3_item_health_difficulty_mismatch');
  if (aggregate.exposures >= 50 && aggregate.distractorCoverage != null && aggregate.distractorCoverage < 0.34) review.push('brain3_item_health_distractor_collapse');

  if (strong.length) {
    return writeRecord(state, itemId, previous.contentRevision, STATUS.QUARANTINED, 'empirical', strong, { ...evidence, graderRate, disputeRate, renderRate }, at, { healthyQualifiedStreak: 0 });
  }

  if (previous.status === STATUS.QUARANTINED) {
    return writeRecord(state, itemId, previous.contentRevision, STATUS.QUARANTINED, 'empirical', ['brain3_item_quarantine_sticky_manual_review_required'], evidence, at, { healthyQualifiedStreak: 0 });
  }

  if (review.length) {
    return writeRecord(state, itemId, previous.contentRevision, STATUS.REVIEW_REQUIRED, 'empirical', review, evidence, at, { healthyQualifiedStreak: 0 });
  }

  if (previous.status === STATUS.REVIEW_REQUIRED) {
    const streak = previous.healthyQualifiedStreak + 1;
    if (streak < REVIEW_HEALTHY_WINDOWS) {
      return writeRecord(state, itemId, previous.contentRevision, STATUS.REVIEW_REQUIRED, 'empirical', ['brain3_item_health_recovery_pending'], evidence, at, { healthyQualifiedStreak: streak });
    }
    return writeRecord(state, itemId, previous.contentRevision, STATUS.ACTIVE, 'empirical', ['brain3_item_health_recovered'], evidence, at, { healthyQualifiedStreak: streak });
  }

  return writeRecord(state, itemId, previous.contentRevision, STATUS.ACTIVE, 'empirical', ['brain3_item_health_ok'], evidence, at, { healthyQualifiedStreak: previous.healthyQualifiedStreak + 1 });
}

function reviewItem(state, itemIdInput, decision, now) {
  const at = finiteTime(now, 'review time');
  const itemId = boundedString(itemIdInput, 'itemId');
  validateState(state);
  const previous = state.items[itemId];
  if (!previous) fail('item ' + itemId + ' has not passed admission', 'BRAINCORE_ITEM_NOT_ADMITTED');
  if (!decision || typeof decision !== 'object' || typeof decision.approved !== 'boolean') fail('review decision.approved must be boolean');
  const reviewRef = boundedString(decision.reviewRef, 'review.reviewRef', 160);
  const contentRevision = decision.contentRevision == null
    ? previous.contentRevision
    : boundedString(decision.contentRevision, 'review.contentRevision', 128);
  const nextStatus = decision.approved ? STATUS.ACTIVE : STATUS.QUARANTINED;
  const reasonCodes = [decision.approved ? 'brain3_item_manual_review_approved' : 'brain3_item_manual_review_rejected'];
  return writeRecord(state, itemId, contentRevision, nextStatus, 'manual_review', reasonCodes, {
    reviewRef,
    note: decision.note == null ? '' : String(decision.note).slice(0, 500)
  }, at, { healthyQualifiedStreak: 0 });
}

function retireItem(state, itemIdInput, retirementRef, now) {
  const at = finiteTime(now, 'retirement time');
  const itemId = boundedString(itemIdInput, 'itemId');
  validateState(state);
  const previous = state.items[itemId];
  if (!previous) fail('item ' + itemId + ' has not passed admission', 'BRAINCORE_ITEM_NOT_ADMITTED');
  const ref = boundedString(retirementRef, 'retirementRef', 160);
  return writeRecord(state, itemId, previous.contentRevision, STATUS.RETIRED, 'manual_retirement', ['brain3_item_retired'], { retirementRef: ref }, at, { healthyQualifiedStreak: 0 });
}

function statusFor(state, itemOrId) {
  validateState(state);
  const itemId = boundedString(typeof itemOrId === 'string' ? itemOrId : itemOrId && itemOrId.id, 'itemId');
  const suppliedRevision = typeof itemOrId === 'object' && itemOrId ? itemOrId.contentRevision : null;
  const rec = state.items[itemId];
  if (!rec) {
    return Object.freeze({ itemId, status: STATUS.CANDIDATE, eligible: false, reasonCodes: Object.freeze(['brain3_item_not_admitted']), contentRevision: '' });
  }
  if (suppliedRevision != null && String(suppliedRevision) !== rec.contentRevision) {
    return Object.freeze({ itemId, status: STATUS.CANDIDATE, eligible: false, reasonCodes: Object.freeze(['brain3_item_revision_not_admitted']), contentRevision: rec.contentRevision });
  }
  return Object.freeze({
    itemId,
    status: rec.status,
    eligible: rec.eligible,
    reasonCodes: Object.freeze(rec.reasonCodes.slice()),
    contentRevision: rec.contentRevision,
    updatedAt: rec.updatedAt
  });
}

function isEligible(state, itemOrId) {
  return statusFor(state, itemOrId).eligible === true;
}

function filterEligible(state, items) {
  if (!Array.isArray(items)) fail('items must be an array');
  return items.filter((item) => item && typeof item === 'object' && isEligible(state, item));
}

module.exports = Object.freeze({
  SCHEMA,
  RECORD_SCHEMA,
  QA_SCHEMA,
  AGGREGATE_SCHEMA,
  STATUS,
  EVENT_LIMIT,
  MIN_EXPOSURES,
  MIN_INDEPENDENT_LEARNERS,
  REVIEW_HEALTHY_WINDOWS,
  createState,
  exportState,
  importState,
  findingsFor,
  admitFromQa,
  observeAggregate,
  reviewItem,
  retireItem,
  statusFor,
  isEligible,
  filterEligible
});
