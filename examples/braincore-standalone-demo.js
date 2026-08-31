#!/usr/bin/env node
'use strict';

/**
 * Minimal standalone Braincore integration example.
 *
 * No DOM, browser storage, server, telemetry, or wall clock is required. The host owns time and
 * persistence. Run directly with:
 *
 *   node examples/braincore-standalone-demo.js
 */
const Runtime = require('../braincore-runtime.js');

const START = 1_700_000_000_000;
const DAY = 86_400_000;
const question = {
  id: 'demo-past-simple-1',
  concept: 'past-simple',
  lesson: 'past-simple',
  level: 'A2',
  domain: 'grammar',
  mode: 'complete_sentence',
  stemLength: 36
};

const diagnostics = [];
let runtime = Runtime.create({
  level: 'A2',
  now: START,
  onDiagnostic: event => diagnostics.push(event)
});

const session = [
  { correct: true,  ms: 6100, timing: 'normal' },
  { correct: false, ms: 7200, timing: 'normal', chosenMisconception: 'past-simple-vs-present-perfect' },
  { correct: true,  ms: 5700, timing: 'normal' },
  { correct: true,  ms: 4900, timing: 'normal' }
];

const decisionsBeforePersistence = [];
for (let i = 0; i < session.length; i++) {
  const result = runtime.answer(question, session[i], START + (i + 1) * DAY);
  decisionsBeforePersistence.push({
    revision: result.status.stateRevision,
    decision: result.trace.decision,
    reason: result.trace.decisionReason,
    mastery: result.trace.masteryAfter && result.trace.masteryAfter.L
  });
}

// The host persists this plain JSON snapshot wherever it chooses.
const persistedJson = JSON.stringify(runtime.exportState(START + 4 * DAY));

// Simulate another process/device shell loading the persisted learner.
runtime = Runtime.fromSnapshot(JSON.parse(persistedJson), {
  onDiagnostic: event => diagnostics.push(event)
});

const afterRestore = runtime.answer(
  question,
  { correct: false, ms: 6800, timing: 'normal', chosenMisconception: 'past-simple-vs-present-perfect' },
  START + 5 * DAY
);

const output = {
  runtimeSchema: Runtime.SCHEMA,
  braincoreVersion: Runtime.braincoreVersion,
  stateSchema: Runtime.stateSchema,
  decisionsBeforePersistence,
  restoredRevision: afterRestore.status.stateRevision,
  decisionAfterRestore: afterRestore.trace.decision,
  decisionReasonAfterRestore: afterRestore.trace.decisionReason,
  healthy: afterRestore.status.degraded === false && diagnostics.length === 0,
  persistedBytes: Buffer.byteLength(persistedJson, 'utf8')
};

process.stdout.write(JSON.stringify(output, null, 2) + '\n');
