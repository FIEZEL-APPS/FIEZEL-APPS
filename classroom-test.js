'use strict';
// m025-36 Classroom v3 regression: adaptive human tutor, Indonesian neural tutor,
// English target content, interrupt/resume, strategy switching, and UI integration.
const assert = require('assert');
const fs = require('fs');

const Tutor = require('./features/tutor-classroom/fiezel-tutor-v3.js');
const pack = require('./features/classroom/classroom-lessons-v1.json');
const app = fs.readFileSync('app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const tutorSource = fs.readFileSync('features/tutor-classroom/fiezel-tutor-v3.js', 'utf8');
const voiceFix = fs.readFileSync('features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js', 'utf8');
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

test('Classroom correction routes authored Indonesian tutor line to Indonesian neural bundle', () => {
  assert.ok(/FiezelIndonesianVoice/.test(voiceFix), 'correction must reuse the existing Indonesian neural runtime');
  assert.ok(/FiezelIndonesianVoice\.speak|indo\.speak/.test(voiceFix), 'Classroom correction must call Indonesian neural speak');
  assert.ok(/lang:\s*'id-ID'/.test(voiceFix), 'Classroom spoken tutor language must be Indonesian');
  assert.ok(/allowFallback:\s*false/.test(voiceFix), 'neural tutor must never silently become browser TTS');
  assert.ok(/tutorSubtitle/.test(voiceFix), 'spoken tutor text must come from the authored Indonesian pair');
  assert.ok(/classroomSpeech:\s*'id-ID neural tutor'/.test(voiceFix));
  assert.ok(/targetLanguage:\s*'en-US'/.test(voiceFix));
  assert.ok(!/SpeechSynthesisUtterance|speechSynthesis\.speak/.test(voiceFix), 'correction must not use browser TTS');
  assert.ok(!/MediaRecorder/.test(tutorSource), 'Tutor v3 must not persist raw learner audio');
  assert.strictEqual(pack.voiceContract.speech, 'id-ID neural tutor');
  assert.strictEqual(pack.voiceContract.targetLanguage, 'en');
  assert.ok(/pair\.en/.test(tutorSource), 'English teaching copy remains authored target-language content in Tutor v3');
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

test('integration preserves five primary destinations and loads Indonesian correction after v3', () => {
  assert.ok(app.includes("'classroom'"), 'Classroom remains a valid canonical app view');
  assert.ok(app.includes("onclick=\"go('classroom')\""), 'Home keeps a Classroom entry point');
  assert.strictEqual((index.match(/class="nav"/g) || []).length + 1, 5, 'primary navigation stays at five destinations');
  assert.ok(index.includes('./features/tutor-classroom/tutor-v3.css'));
  assert.ok(index.includes('./features/tutor-classroom/fiezel-tutor-v3.js'));
  assert.ok(index.includes('./features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js'));
  assert.ok(index.indexOf('./features/tutor-classroom/fiezel-tutor-v3.js') > index.indexOf('./app.js'), 'v3 sidecar installs after canonical app.js');
  assert.ok(index.indexOf('./features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js') > index.indexOf('./features/tutor-classroom/fiezel-tutor-v3.js'), 'OWNER voice correction must load after Tutor v3');
  assert.ok(index.includes('./features/diagnostics/fiezel-diagnostic-bus.js'), 'universal diagnostics integration is preserved');
});

test('PWA release coherence advances to m025-36 and caches Tutor correction', () => {
  assert.ok(sw.includes("const SW_REV='m025-36-"));
  assert.ok(sw.includes('./features/tutor-classroom/fiezel-tutor-v3.js'));
  assert.ok(sw.includes('./features/tutor-classroom/tutor-v3.css'));
  assert.ok(sw.includes('./features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js'));
  assert.ok(sw.includes('./features/diagnostics/fiezel-diagnostic-register.js'), 'diagnostics assets stay cached');
  assert.ok(/var DIAG_BUILD = 'm025-36'/.test(diag));
});

console.log(`FIEZEL Classroom v3 m025-36: PASS ${pass}/${pass}`);
