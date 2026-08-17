'use strict';
// OWNER Classroom regression: subject routing, tutor state machine, and Indonesian
// neural tutor narration while English remains the target-language lesson content.
const assert = require('assert');
const fs = require('fs');

const C = require('./features/classroom/fiezel-classroom.js');
const pack = require('./features/classroom/classroom-lessons-v1.json');
const app = fs.readFileSync('app.js', 'utf8');
const ui = fs.readFileSync('features/ui/fiezel-owner-redesign-v1.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('PASS', name); };

(async () => {
  test('pack schema, categories and OWNER voice contract', () => {
    assert.strictEqual(pack.schema, 'fiezel-classroom-lessons-v1');
    assert.ok(pack.categories.length >= 6, 'six subject categories from the design');
    assert.ok(pack.lessons.length >= 1);
    assert.strictEqual(pack.voiceContract.speech, 'id-ID neural tutor');
    assert.strictEqual(pack.voiceContract.targetLanguage, 'en');
  });

  test('every teaching and feedback unit has English target plus Indonesian tutor line', () => {
    for (const lesson of pack.lessons) {
      assert.ok(lesson.segments.length > 0, `${lesson.id} has segments`);
      for (const seg of lesson.segments) {
        assert.ok(seg.en && seg.en.trim(), `${lesson.id} segment missing English target`);
        assert.ok(seg.id && seg.id.trim(), `${lesson.id} segment missing Indonesian tutor line`);
      }
      for (const q of lesson.questions) {
        assert.ok(q.explain.en && q.explain.id, `${lesson.id} explain needs target + tutor languages`);
        assert.ok(q.remediate.en && q.remediate.id, `${lesson.id} remediate needs target + tutor languages`);
        assert.ok(Number.isInteger(q.answerIndex) && q.options[q.answerIndex], `${lesson.id} answerIndex must point at a real option`);
        assert.strictEqual(new Set(q.options).size, q.options.length, `${lesson.id} options must be distinct`);
      }
    }
  });

  test('every lesson belongs to a declared category', () => {
    const ids = new Set(pack.categories.map(c => c.id));
    for (const l of pack.lessons) assert.ok(ids.has(l.category), `${l.id} has unknown category`);
  });

  test('routing runs category -> topic -> teach', () => {
    const s = C.createSession(pack);
    assert.strictEqual(s.snapshot().phase, 'category');
    s.chooseCategory('grammar');
    assert.strictEqual(s.snapshot().phase, 'topic');
    s.chooseLesson('grammar_present_perfect');
    assert.strictEqual(s.snapshot().phase, 'teach');
    assert.strictEqual(s.snapshot().segmentIndex, 0);
  });

  test('teaching advances to quiz only after the last segment', () => {
    const s = C.createSession(pack);
    s.chooseLesson('grammar_present_perfect');
    const total = s.snapshot().segmentCount;
    for (let i = 0; i < total - 1; i++) {
      s.nextSegment();
      assert.strictEqual(s.snapshot().phase, 'teach');
    }
    s.nextSegment();
    assert.strictEqual(s.snapshot().phase, 'quiz');
  });

  test('a wrong answer remediates in Indonesian and retries without scoring', () => {
    const s = C.createSession(pack);
    s.chooseLesson('grammar_present_perfect');
    while (s.snapshot().phase === 'teach') s.nextSegment();
    const q = s.currentQuestion();
    const wrongIndex = q.options.findIndex((_, i) => i !== q.answerIndex);
    const first = s.answer(wrongIndex);
    assert.strictEqual(first.result.correct, false);
    assert.strictEqual(first.result.retry, true, 'first miss must offer a retry');
    assert.strictEqual(first.result.advanced, false, 'first miss must not skip the question');
    assert.strictEqual(first.result.feedback.id, q.remediate.id, 'tutor remediation must be Indonesian');
    const second = s.answer(q.answerIndex);
    assert.strictEqual(second.result.advanced, true);
    assert.strictEqual(second.snapshot.correct, 0, 'a retry must not earn the point');
  });

  test('two misses move on instead of looping forever', () => {
    const s = C.createSession(pack);
    s.chooseLesson('grammar_present_perfect');
    while (s.snapshot().phase === 'teach') s.nextSegment();
    const q = s.currentQuestion();
    const wrongIndex = q.options.findIndex((_, i) => i !== q.answerIndex);
    s.answer(wrongIndex);
    const second = s.answer(wrongIndex);
    assert.strictEqual(second.result.advanced, true, 'second miss must advance, not trap the learner');
    assert.strictEqual(second.result.feedback.id, q.explain.id, 'second miss reveals Indonesian tutor explanation');
  });

  test('a clean run scores 100 and finishes', () => {
    const s = C.createSession(pack);
    s.chooseLesson('grammar_present_perfect');
    while (s.snapshot().phase === 'teach') s.nextSegment();
    let guard = 0;
    while (s.snapshot().phase === 'quiz' && guard++ < 50) s.answer(s.currentQuestion().answerIndex);
    const snap = s.snapshot();
    assert.strictEqual(snap.phase, 'summary');
    assert.strictEqual(snap.finished, true);
    assert.strictEqual(snap.scorePercent, 100);
  });

  test('invalid routing fails closed', () => {
    const s = C.createSession(pack);
    assert.throws(() => s.chooseCategory('nope'), /unknown_category/);
    assert.throws(() => s.chooseLesson('nope'), /unknown_lesson/);
    assert.throws(() => s.answer(0), /no_active_question/);
    assert.throws(() => C.createSession({ schema: 'wrong' }), /classroom_pack_invalid/);
  });

  test('Classroom is a first-class primary destination and assets remain cached', () => {
    assert.ok(app.includes("'classroom'"), 'legacy router still knows Classroom');
    assert.ok(index.includes('features/classroom/fiezel-classroom.js'), 'engine must be loaded');
    assert.ok(index.includes('data-view="classroom"'), 'Classroom must be a primary nav entry');
    assert.strictEqual((index.match(/class="nav/g) || []).length, 5, 'bottom nav stays exactly five destinations');
    assert.ok(sw.includes('./features/classroom/classroom-lessons-v1.json'), 'lesson pack must stay precached for offline use');
  });

  test('OWNER layer replaces English tutor speech with Indonesian neural-only narration', () => {
    assert.ok(index.indexOf('fiezel-owner-redesign-v1.js') > index.indexOf('./app.js'), 'owner override must load after legacy app');
    assert.ok(/FiezelIndonesianVoice/.test(ui), 'Classroom must call Indonesian neural bundle');
    assert.ok(/lang:'id-ID'/.test(ui), 'tutor narration must declare id-ID');
    assert.ok(/allowFallback:false/.test(ui), 'tutor narration must stay neural-only');
    assert.ok(/root\.classroomSpeak=ownerClassroomSpeak/.test(ui), 'owner layer must replace legacy Classroom speech boundary');
    assert.ok(!/speechSynthesis|SpeechSynthesisUtterance/.test(ui), 'owner Classroom layer must not use browser TTS');
  });

  console.log(`FIEZEL Classroom: PASS ${pass}/0`);
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
