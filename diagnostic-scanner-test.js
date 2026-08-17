'use strict';
// m025-34 universal diagnostic scanner regression (Master Prompt V10).
//
// The acceptance criterion that matters most: a deliberately broken module must be
// reported, not allowed to break the scan. Everything else is detail.
const assert = require('assert');
const fs = require('fs');

const bus = require('./features/diagnostics/fiezel-diagnostic-bus.js');
const tests = require('./features/diagnostics/fiezel-module-selftests.js');
const targets = require('./features/diagnostics/fiezel-diagnostic-targets.js');
const panel = fs.readFileSync('features/neural-voice/fiezel-diag-panel.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const register = fs.readFileSync('features/diagnostics/fiezel-diagnostic-register.js', 'utf8');

const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
let pass = 0;
const test = async (name, fn) => { await fn(); pass++; console.log('PASS', name); };

(async () => {
  await test('targets are centralised, not hardcoded per module', () => {
    assert.strictEqual(targets.schema, 'fiezel-diag-targets-v1');
    assert.strictEqual(targets.leveltest.totalQuestions, 150);
    const selftests = fs.readFileSync('features/diagnostics/fiezel-module-selftests.js', 'utf8');
    assert.ok(!/\b2000\b/.test(selftests), 'vocab target must not be inlined');
    assert.ok(!/totalQuestions\s*[:=]\s*150/.test(selftests), 'leveltest target must not be inlined');
  });

  await test('severity and module ids are normalised, never trusted raw', () => {
    bus.reset();
    const e = bus.reportError('not-a-module', 'not-a-severity', 'X', 'msg');
    assert.strictEqual(e.module, 'core', 'unknown module falls back to core');
    assert.strictEqual(e.severity, 'error', 'unknown severity falls back to error');
  });

  await test('status is derived from findings, so badge and detail cannot disagree', () => {
    assert.strictEqual(bus.statusFor([]), 'pass');
    assert.strictEqual(bus.statusFor([bus.finding('A', 'warning', 'w')]), 'warn');
    assert.strictEqual(bus.statusFor([bus.finding('A', 'warning', 'w'), bus.finding('B', 'error', 'e')]), 'fail');
    assert.strictEqual(bus.statusFor([bus.finding('C', 'fatal', 'f')]), 'fail');
  });

  // THE acceptance test: break one module on purpose.
  await test('a module that throws is reported and does not stop the others', async () => {
    bus.reset();
    bus.registerSelfTest('vocabulary', () => ({ findings: tests.vocabulary(J('vocabulary-master.json'), targets) }));
    bus.registerSelfTest('reading', () => { throw new Error('module exploded'); });
    bus.registerSelfTest('classroom', () => ({ findings: tests.classroom(J('features/classroom/classroom-lessons-v1.json')) }));
    const report = await bus.getFullReport();
    assert.strictEqual(report.moduleHealth.reading.status, 'fail', 'broken module reported as fail');
    assert.strictEqual(report.moduleHealth.reading.findings[0].code, 'SELFTEST_THREW');
    assert.strictEqual(report.moduleHealth.vocabulary.status, 'pass', 'other modules still ran');
    assert.strictEqual(report.moduleHealth.classroom.status, 'pass', 'modules after the broken one still ran');
    assert.ok(report.errors.some(e => e.code === 'SELFTEST_THREW'), 'the throw is also logged as an error');
  });

  await test('injected errors surface with correct module, severity and code', async () => {
    bus.reset();
    bus.reportError('grammar', 'fatal', 'GRAMMAR_TEST_INJECTION', 'injected for testing');
    const report = await bus.getFullReport();
    const hit = report.errors.find(e => e.code === 'GRAMMAR_TEST_INJECTION');
    assert.ok(hit, 'injected error present');
    assert.strictEqual(hit.module, 'grammar');
    assert.strictEqual(hit.severity, 'fatal');
    assert.strictEqual(report.summary.errorCounts.fatal, 1);
  });

  await test('empty or corrupt data is a finding, never a crash', () => {
    assert.strictEqual(tests.vocabulary(null, targets)[0].code, 'VOCAB_UNAVAILABLE');
    assert.strictEqual(tests.vocabulary([], targets)[0].code, 'VOCAB_EMPTY');
    assert.strictEqual(tests.reading(null, targets)[0].code, 'READING_UNAVAILABLE');
    assert.strictEqual(tests.grammar(null, targets)[0].code, 'GRAMMAR_UNAVAILABLE');
    assert.strictEqual(tests.classroom(null)[0].code, 'CLASSROOM_UNAVAILABLE');
    assert.strictEqual(tests.bank(null, 1, 'X')[0].code, 'X_UNAVAILABLE');
  });

  await test('self-tests detect real defects when injected', () => {
    const badVocab = [{ word: 'a', meaning: '', level: 'Z9' }, { word: 'a', meaning: 'x', level: 'A1' }];
    const codes = tests.vocabulary(badVocab, targets).map(x => x.code);
    assert.ok(codes.includes('VOCAB_EMPTY_MEANING'), 'empty meaning detected');
    assert.ok(codes.includes('VOCAB_INVALID_LEVEL'), 'invalid level detected');
    assert.ok(codes.includes('VOCAB_DUPLICATE'), 'duplicate word detected');

    const dupReading = [{ text: 'same text', qs: [1] }, { text: 'same  text ', qs: [1] }];
    assert.ok(tests.reading(dupReading, targets).map(x => x.code).includes('READING_DUPLICATE_TEXT'),
      'duplicate passages detected after whitespace normalisation');

    assert.ok(tests.leveltest(149, targets).map(x => x.code).includes('LEVELTEST_COUNT_MISMATCH'));
    assert.ok(tests.neuralVoice({ prepared: true, circuitOpen: true, assetCount: 5 }, targets)
      .map(x => x.code).includes('VOICE_CIRCUIT_OPEN'));
    assert.ok(tests.classroom({ lessons: [{ segments: [{ en: 'x' }], questions: [{ options: ['a'], answerIndex: 9 }] }] })
      .map(x => x.code).sort().join(',').includes('CLASSROOM_BAD_ANSWER'));
  });

  await test('shipped data passes its own self-tests', () => {
    assert.deepStrictEqual(tests.vocabulary(J('vocabulary-master.json'), targets), [], 'vocabulary clean');
    assert.deepStrictEqual(tests.reading(J('reading-bank.json'), targets), [], 'reading clean');
    assert.deepStrictEqual(tests.grammar(J('grammar-templates.json'), targets), [], 'grammar clean');
    assert.deepStrictEqual(tests.classroom(J('features/classroom/classroom-lessons-v1.json')), [], 'classroom clean');
  });

  await test('summary text stands alone for pasting into a chat', async () => {
    bus.reset();
    bus.registerSelfTest('reading', () => ({ findings: [bus.finding('READING_X', 'error', 'contoh masalah', 3)] }));
    const report = await bus.getFullReport({ diagBuild: 'm025-34', appVersion: '5.19.0', standalone: true });
    const text = bus.summaryText(report);
    assert.ok(text.includes('FIEZEL DIAGNOSTIC'), 'has a title');
    assert.ok(text.includes('m025-34'), 'names the build');
    assert.ok(text.includes('FAIL reading'), 'names the failing module');
    assert.ok(text.includes('READING_X'), 'includes the code');
    assert.ok(!text.includes('{'), 'must be plain text, not JSON');
  });

  await test('global handlers are installed for uncaught errors and rejections', () => {
    assert.match(register, /installGlobalHandlers/);
    const src = fs.readFileSync('features/diagnostics/fiezel-diagnostic-bus.js', 'utf8');
    assert.match(src, /addEventListener\('error'/);
    assert.match(src, /addEventListener\('unhandledrejection'/);
    assert.match(src, /UNCAUGHT_ERROR/);
    assert.match(src, /UNHANDLED_PROMISE_REJECTION/);
  });

  await test('data load failure is reported against its own module', () => {
    assert.match(register, /DATA_LOAD_FAILED/);
    assert.match(register, /catch \(error\)/, 'loading is wrapped');
  });

  await test('the button runs the universal scan and exposes badges plus copy summary', () => {
    assert.match(panel, /runUniversalScan/);
    assert.match(panel, /FiezelDiagnosticBus/);
    assert.match(panel, /renderBadges/);
    assert.match(panel, /Copy ringkasan/);
    assert.match(panel, /dump\.universalSummary/);
    // Order matters: diagnostics modules must load before the panel that consumes them.
    assert.ok(index.indexOf('fiezel-diagnostic-bus.js') < index.indexOf('fiezel-diag-panel.js'),
      'bus must load before the diagnostic panel');
    assert.ok(index.includes('fiezel-diagnostic-register.js'), 'self-tests must be registered');
    assert.ok(sw.includes('./features/diagnostics/fiezel-diagnostic-bus.js'), 'diagnostics must be precached');
  });

  console.log(`FIEZEL diagnostic scanner: PASS ${pass}/0`);
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
