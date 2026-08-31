#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const P = require('./brain-sync-protocol.js');
let checks = 0;
function assert(cond, msg) { checks++; if (!cond) throw new Error(msg); }
function eq(a, b, msg) { assert(JSON.stringify(a) === JSON.stringify(b), msg + '\n' + JSON.stringify(a) + '\n!=\n' + JSON.stringify(b)); }

const DEVICE = '11111111-1111-4111-8111-111111111111';
const EVENT1 = '22222222-2222-4222-8222-222222222222';
const EVENT2 = '33333333-3333-4333-8333-333333333333';
const ATTEMPT1 = '44444444-4444-4444-8444-444444444444';
const ATTEMPT2 = '55555555-5555-4555-8555-555555555555';

function event(overrides = {}) {
  return {
    schema: P.EVENT_SCHEMA,
    eventId: EVENT1,
    attemptId: ATTEMPT1,
    deviceId: DEVICE,
    deviceSeq: 7,
    baseRevision: 12,
    questionId: 'grammar.a1.q17',
    contentRevision: 'rev-3',
    domain: 'grammar',
    level: 'A1',
    skill: 'simple_present',
    practiceMode: 'apply_form',
    correct: true,
    kappa: 0.8,
    predicted: 0.72,
    responseMs: 4200,
    occurredAt: 1788170000123,
    brainBundle: '3.1.0',
    ...overrides
  };
}

{
  const r = P.normalizeEvent(event());
  assert(r.ok, 'valid event must pass');
  assert(r.value.attemptId === ATTEMPT1, 'attemptId retained');
  assert(r.value.questionId === 'grammar.a1.q17', 'questionId retained separately');
  assert(r.value.attemptId !== r.value.questionId, 'attempt identity must not collapse into question identity');
  assert(!Object.prototype.hasOwnProperty.call(r.value, 'userId'), 'event has no userId');
  console.log('ok - valid attempt separates attemptId from questionId');
}

{
  for (const key of ['userId', 'email', 'name', 'visitorToken', 'answerText', 'selectedAnswer']) {
    const raw = event(); raw[key] = 'forbidden';
    const r = P.normalizeEvent(raw);
    assert(!r.ok && r.reason === 'foreign_field' && r.detail === key, 'forbidden/foreign ' + key + ' must fail closed');
  }
  console.log('ok - identity, analytics token, and free-text fields rejected');
}

{
  const reversed = {
    brainBundle: '3.1.0', occurredAt: 1788170000123, responseMs: 4200, predicted: 0.72,
    kappa: 0.8, correct: true, practiceMode: 'apply_form', skill: 'simple_present', level: 'A1',
    domain: 'grammar', contentRevision: 'rev-3', questionId: 'grammar.a1.q17', baseRevision: 12,
    deviceSeq: 7, deviceId: DEVICE, attemptId: ATTEMPT1, eventId: EVENT1, schema: P.EVENT_SCHEMA
  };
  eq(P.normalizeEvent(event()).value, P.normalizeEvent(reversed).value, 'normalization must be deterministic across property order');
  console.log('ok - deterministic normalized shape');
}

{
  const r = P.dedupeEvents([event(), event()]);
  assert(r.ok && r.value.length === 1 && r.duplicates === 1, 'exact retransmission must be idempotent');
  console.log('ok - duplicate retransmission is idempotent');
}

{
  const r = P.dedupeEvents([event(), event({ questionId: 'grammar.a1.q18' })]);
  assert(!r.ok && r.reason === 'event_id_conflict', 'same eventId with different evidence must conflict');
  console.log('ok - eventId tamper conflict rejected');
}

{
  const r = P.dedupeEvents([
    event(),
    event({ eventId: EVENT2, attemptId: ATTEMPT2, questionId: 'grammar.a1.q18' })
  ]);
  assert(!r.ok && r.reason === 'device_seq_conflict', 'same device sequence cannot name two events');
  console.log('ok - same deviceSeq with different event is a hard conflict');
}

{
  const r = P.normalizeBatch({
    schema: P.BATCH_SCHEMA,
    protocol: P.PROTOCOL_VERSION,
    deviceId: DEVICE,
    baseRevision: 12,
    events: [
      event({ eventId: EVENT2, attemptId: ATTEMPT2, deviceSeq: 9, questionId: 'grammar.a1.q18' }),
      event({ deviceSeq: 7 })
    ]
  });
  assert(r.ok, 'valid batch must pass');
  assert(r.value.events[0].deviceSeq === 7 && r.value.events[1].deviceSeq === 9, 'batch output must be deterministic by device sequence');
  console.log('ok - out-of-order delivery normalizes deterministically without losing gaps');
}

{
  let r = P.normalizeBatch({ schema: P.BATCH_SCHEMA, protocol: P.PROTOCOL_VERSION, deviceId: DEVICE, baseRevision: 99, events: [event()] });
  assert(!r.ok && r.reason === 'batch_revision_mismatch', 'event baseRevision must match batch');
  r = P.normalizeBatch({ schema: P.BATCH_SCHEMA, protocol: P.PROTOCOL_VERSION, deviceId: EVENT2, baseRevision: 12, events: [event()] });
  assert(!r.ok && r.reason === 'batch_device_mismatch', 'event device must match batch');
  console.log('ok - batch cannot mix device or base revision authority');
}

{
  const same = P.planRevision({ baseRevision: 12, canonicalRevision: 12 });
  const stale = P.planRevision({ baseRevision: 12, canonicalRevision: 14 });
  const future = P.planRevision({ baseRevision: 15, canonicalRevision: 14 });
  assert(same.ok && same.value.action === 'APPLY', 'equal revision applies');
  assert(stale.ok && stale.value.action === 'REBASE_REQUIRED', 'stale revision must rebase');
  assert(future.ok && future.value.action === 'INVALID_FUTURE_BASE', 'future revision cannot overwrite server');
  assert(stale.rationale === 'brain_sync_revision_rebase_required', 'stale conflict has explicit rationale');
  console.log('ok - stale base never falls through to last-write-wins');
}

{
  for (const patch of [
    { deviceSeq: NaN }, { deviceSeq: Infinity }, { baseRevision: -1 }, { kappa: NaN },
    { predicted: 1.01 }, { responseMs: Infinity }, { occurredAt: NaN }
  ]) {
    const r = P.normalizeEvent(event(patch));
    assert(!r.ok, 'non-finite/out-of-range input must fail: ' + JSON.stringify(patch));
  }
  console.log('ok - malformed and non-finite inputs fail closed');
}

{
  const cp = P.normalizeCheckpoint({
    schema: P.CHECKPOINT_SCHEMA,
    revision: 40,
    serverSeq: 101,
    stateHash: 'A'.repeat(64),
    createdAt: 1788170000999,
    brainBundle: '3.1.0'
  });
  assert(cp.ok && cp.value.stateHash === 'a'.repeat(64), 'checkpoint metadata canonicalized');
  const bad = P.normalizeCheckpoint({ ...cp.value, userId: 'forged' });
  assert(!bad.ok && bad.reason === 'foreign_field', 'checkpoint cannot carry user identity');
  console.log('ok - checkpoint is versioned and identity-free');
}

{
  const source = fs.readFileSync(path.join(__dirname, 'brain-sync-protocol.js'), 'utf8');
  const banned = ['Date' + '.now', 'Math' + '.random', 'fetch' + '(', 'local' + 'Storage', 'indexed' + 'DB', 'document' + '.', 'window' + '.'];
  for (const token of banned) assert(!source.includes(token), 'pure protocol must not contain hidden I/O/time/random token: ' + token);
  console.log('ok - pure module owns no I/O, storage, clock, or RNG');
}

{
  const built = P.buildAttemptEvent({
    eventId: EVENT1, attemptId: ATTEMPT1, deviceId: DEVICE, deviceSeq: 1, baseRevision: 0,
    questionId: 'q1', contentRevision: 'r1', domain: 'grammar', correct: false, occurredAt: 1
  });
  assert(built.ok && built.value.schema === P.EVENT_SCHEMA, 'builder supplies canonical schema');
  const forged = P.buildAttemptEvent({
    eventId: EVENT1, attemptId: ATTEMPT1, deviceId: DEVICE, deviceSeq: 1, baseRevision: 0,
    questionId: 'q1', contentRevision: 'r1', domain: 'grammar', correct: false, occurredAt: 1,
    userId: 'victim'
  });
  assert(!forged.ok && forged.reason === 'foreign_field', 'builder must reject body identity authority');
  console.log('ok - builder cannot be used to smuggle user identity');
}

console.log(`brain-sync-protocol-test: ${checks}/${checks} assertions PASS`);
