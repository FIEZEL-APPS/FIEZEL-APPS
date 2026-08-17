'use strict';
// m025-35 Classroom v3 regression: adaptive human tutor, shared language bundle,
// interrupt/resume, strategy switching, release coherence, and UI integration.
const assert = require('assert');
const fs = require('fs');

const Tutor = require('./features/tutor-classroom/fiezel-tutor-v3.js');
const pack = require('./features/classroom/classroom-lessons-v1.json');
const app = fs.readFileSync('app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const tutorSource = fs.readFileSync('features/tutor-classroom/fiezel-tutor-v3.js', 'utf8');
const tutorCss = fs.readFileSync('features/tutor-classroom/tutor-v3.css', 'utf8');
const diag = fs.readFileSync('features/neural-voice/fiezel-diag-panel.js', 'utf8');

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('PASS', name); };

function enterPresentPerfect(session) {
  session.chooseCategory('grammar');
  session.chooseLesson('grammar_present_perfect');
  return session;
}

function advanceTeaching(session) {
  let guard = 0;
  while (session.snapshot().phase === 'teach' && guard++ < 50) {
    const beat = session.currentBeat();
    if (beat && beat.check && !(beat.id in session.snapshot().microAnswers)) {
      session.answerMicro(beat.check.answerIndex);
    }
    session.nextBeat();
  }
  assert.ok(guard < 50, 'teaching flow must terminate');
}

test('v3 exposes a deterministic human-tutor contract', () => {
  assert.strictEqual(Tutor.schema, 'fiezel-tutor-v3');
  assert.deepStrictEqual(Tutor.strategies, ['intuition', 'timeline', 'form-map']);
  assert.strictEqual(pack.schema, 'fiezel-classroom-lessons-v1');
  assert.ok(pack.categories.length >= 6);
});

test('routing remains Category -> Topic -> Classroom', () => {
  const s = Tutor.createSession(pack);
  assert.strictEqual(s.snapshot().phase, 'category');
  s.chooseCategory('grammar');
  assert.strictEqual(s.snapshot().phase, 'topic');
  s.chooseLesson('grammar_present_perfect');
  assert.strictEqual(s.snapshot().phase, 'teach');
  assert.ok(s.snapshot().beatCount >= 4, 'Present Perfect must use short teaching beats');
});

test('Present Perfect begins intuition-first, not textbook-first', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack));
  const first = s.currentBeat();
  assert.strictEqual(first.id, 'intuition');
  assert.ok(/forget the grammar name/i.test(first.en));
  assert.ok(/lost my key/i.test(first.en));
  assert.ok(first.idText && first.board && first.board.title);
});

test('micro-check blocks progression until learner responds', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack));
  s.nextBeat();
  const beat = s.currentBeat();
  assert.ok(beat.check, 'second beat is an active micro-check');
  assert.throws(() => s.nextBeat(), /micro_check_required/);
  const out = s.answerMicro(beat.check.answerIndex);
  assert.strictEqual(out.correct, true);
  s.nextBeat();
  assert.strictEqual(s.snapshot().phase, 'teach');
});

test('Ask Fiezel preserves exact lesson checkpoint and resumes', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack));
  s.nextBeat();
  const beat = s.currentBeat();
  s.answerMicro(beat.check.answerIndex);
  const before = s.snapshot();
  const asked = s.ask("Why can't I say I have went?");
  assert.strictEqual(asked.snapshot.phase, 'sideq');
  assert.ok(/have gone/i.test(asked.answer.en));
  assert.ok(/went/i.test(asked.answer.id));
  s.resume();
  const after = s.snapshot();
  assert.strictEqual(after.phase, before.phase);
  assert.strictEqual(after.beatIndex, before.beatIndex);
  assert.strictEqual(after.questionIndex, before.questionIndex);
});

test('confusion changes teaching strategy instead of repeating the same answer', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack));
  assert.strictEqual(s.snapshot().strategy, 'intuition');
  const one = s.confused();
  assert.strictEqual(one.strategy, 'timeline');
  assert.strictEqual(s.snapshot().strategy, 'timeline');
  const two = s.confused();
  assert.strictEqual(two.strategy, 'form-map');
  assert.notStrictEqual(one.en, two.en);
});

test('wrong quiz answer uses targeted remediation and retry without first-pass score', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack));
  advanceTeaching(s);
  assert.strictEqual(s.snapshot().phase, 'quiz');
  const q = s.currentQuestion();
  const wrong = q.options.findIndex((_, i) => i !== q.answerIndex);
  const first = s.answerQuiz(wrong);
  assert.strictEqual(first.result.correct, false);
  assert.strictEqual(first.result.retry, true);
  assert.strictEqual(first.result.advanced, false);
  assert.ok(first.result.feedback.strategy);
  assert.ok(first.result.feedback.board);
  const second = s.answerQuiz(q.answerIndex);
  assert.strictEqual(second.result.advanced, true);
  assert.strictEqual(second.snapshot.correct, 0, 'retry answer is not first-pass credit');
});

test('clean run completes and writes bounded learner evidence', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack));
  advanceTeaching(s);
  let guard = 0;
  while (s.snapshot().phase === 'quiz' && guard++ < 50) {
    s.answerQuiz(s.currentQuestion().answerIndex);
  }
  assert.ok(guard < 50);
  assert.strictEqual(s.snapshot().phase, 'summary');
  assert.strictEqual(s.snapshot().scorePercent, 100);
  const evidence = s.evidence();
  assert.strictEqual(evidence.schema, 'fiezel-tutor-evidence-v1');
  assert.strictEqual(evidence.completed.grammar_present_perfect.scorePercent, 100);
  assert.ok(!('rawAudio' in evidence));
  assert.ok(!('transcript' in evidence));
});

test('Classroom shares the Indonesian language bundle but keeps English as teaching speech', () => {
  assert.ok(/FiezelIndonesianVoice/.test(tutorSource), 'shared bundle must reuse existing Indonesian runtime');
  assert.ok(/fiezel-learning-bundle-v1/.test(tutorSource));
  assert.ok(/classroomSpeech:\s*'en-US neural'/.test(tutorSource));
  assert.ok(/classroomSubtitle:\s*'id-ID semantic'/.test(tutorSource));
  assert.ok(/lang:\s*'en-US'/.test(tutorSource), 'Classroom spoken language stays English');
  assert.ok(/allowFallback:\s*false/.test(tutorSource), 'neural speech must not silently become robot TTS');
  assert.ok(!/MediaRecorder/.test(tutorSource), 'Tutor v3 must not persist raw learner audio');
});

test('human-tutor controls are implemented in the product sidecar', () => {
  for (const marker of ['Ask Fiezel', 'I don’t get it', 'Slower', 'Replay', 'Back to the exact lesson checkpoint']) {
    assert.ok(tutorSource.includes(marker), `missing human-tutor control: ${marker}`);
  }
  assert.ok(tutorSource.includes('data-route-skills'), 'Speaking/Listening category routes to existing capability');
  assert.ok(tutorSource.includes('tutor-board'), 'smart board renderer exists');
});

test('UI layer is coherent, responsive, and reduced-motion aware', () => {
  assert.ok(tutorCss.includes('--ui-accent'));
  assert.ok(tutorCss.includes('.tutor-classroom-grid'));
  assert.ok(tutorCss.includes('@media (max-width:620px)'));
  assert.ok(tutorCss.includes('@media (prefers-reduced-motion:reduce)'));
  assert.ok(tutorCss.includes('@media (min-width:1000px)'));
});

test('integration preserves five primary destinations and loads v3 after app.js', () => {
  assert.ok(app.includes("'classroom'"), 'Classroom remains a valid canonical app view');
  assert.ok(app.includes("onclick=\"go('classroom')\""), 'Home keeps a Classroom entry point');
  assert.strictEqual((index.match(/class="nav"/g) || []).length + 1, 5, 'primary navigation stays at five destinations');
  assert.ok(index.includes('./features/tutor-classroom/tutor-v3.css'));
  assert.ok(index.includes('./features/tutor-classroom/fiezel-tutor-v3.js'));
  assert.ok(index.indexOf('./features/tutor-classroom/fiezel-tutor-v3.js') > index.indexOf('./app.js'), 'v3 sidecar installs after canonical app.js');
  assert.ok(index.includes('./features/diagnostics/fiezel-diagnostic-bus.js'), 'm025-34 diagnostics integration is preserved');
});

test('PWA release coherence is m025-35 and caches Tutor v3 assets', () => {
  assert.ok(sw.includes("const SW_REV='m025-35-"));
  assert.ok(sw.includes('./features/tutor-classroom/fiezel-tutor-v3.js'));
  assert.ok(sw.includes('./features/tutor-classroom/tutor-v3.css'));
  assert.ok(sw.includes('./features/diagnostics/fiezel-diagnostic-register.js'), 'new main diagnostics assets stay cached');
  assert.ok(/var DIAG_BUILD = 'm025-35'/.test(diag));
});

console.log(`FIEZEL Classroom v3: PASS ${pass}/${pass}`);
