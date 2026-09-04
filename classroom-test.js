'use strict';
// m025-37 Classroom v3 regression: preserve the deployed adaptive human tutor while
// correcting its spoken tutor language to the existing Indonesian neural bundle.
const assert = require('assert');
const fs = require('fs');

const Tutor = require('./features/tutor-classroom/fiezel-tutor-v3.js');
const Classroom = require('./features/classroom/fiezel-classroom.js');
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
    if (beat && beat.check && !(beat.id in session.snapshot().microAnswers)) session.answerMicro(beat.check.answerIndex);
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
  assert.strictEqual(s.snapshot().phase, 'category'); s.chooseCategory('grammar');
  assert.strictEqual(s.snapshot().phase, 'topic'); s.chooseLesson('grammar_present_perfect');
  assert.strictEqual(s.snapshot().phase, 'teach');
  assert.ok(s.snapshot().beatCount >= 4);
});
test('Present Perfect stays intuition-first', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack));
  const first = s.currentBeat();
  assert.strictEqual(first.id, 'intuition');
  assert.ok(/forget the grammar name/i.test(first.en));
  assert.ok(/lost my key/i.test(first.en));
  assert.ok(first.idText && first.board && first.board.title);
});
test('micro-check blocks progression until learner responds', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack)); s.nextBeat();
  const beat = s.currentBeat(); assert.ok(beat.check);
  assert.throws(() => s.nextBeat(), /micro_check_required/);
  assert.strictEqual(s.answerMicro(beat.check.answerIndex).correct, true);
  s.nextBeat(); assert.strictEqual(s.snapshot().phase, 'teach');
});
test('Ask Fiezel preserves exact checkpoint and resumes', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack)); s.nextBeat();
  const beat = s.currentBeat(); s.answerMicro(beat.check.answerIndex);
  const before = s.snapshot(); const asked = s.ask("Why can't I say I have went?");
  assert.strictEqual(asked.snapshot.phase, 'sideq');
  assert.ok(/have gone/i.test(asked.answer.en)); assert.ok(/went/i.test(asked.answer.id));
  s.resume(); const after = s.snapshot();
  assert.strictEqual(after.phase, before.phase); assert.strictEqual(after.beatIndex, before.beatIndex); assert.strictEqual(after.questionIndex, before.questionIndex);
});
test('confusion still changes strategy', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack));
  const one = s.confused(); const two = s.confused();
  assert.strictEqual(one.strategy, 'timeline'); assert.strictEqual(two.strategy, 'form-map'); assert.notStrictEqual(one.en, two.en);
});
test('wrong quiz answer keeps targeted remediation and retry scoring', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack)); advanceTeaching(s);
  const q = s.currentQuestion(); const wrong = q.options.findIndex((_, i) => i !== q.answerIndex);
  const first = s.answerQuiz(wrong); assert.strictEqual(first.result.retry, true); assert.strictEqual(first.result.advanced, false);
  assert.ok(first.result.feedback.strategy && first.result.feedback.board);
  const second = s.answerQuiz(q.answerIndex); assert.strictEqual(second.result.advanced, true); assert.strictEqual(second.snapshot.correct, 0);
});
test('clean run completes with bounded evidence', () => {
  const s = enterPresentPerfect(Tutor.createSession(pack)); advanceTeaching(s);
  let guard = 0; while (s.snapshot().phase === 'quiz' && guard++ < 50) s.answerQuiz(s.currentQuestion().answerIndex);
  assert.ok(guard < 50); assert.strictEqual(s.snapshot().scorePercent, 100);
  const evidence = s.evidence(); assert.strictEqual(evidence.schema, 'fiezel-tutor-evidence-v1');
  assert.ok(!('rawAudio' in evidence)); assert.ok(!('transcript' in evidence));
});

test('Classroom speaks authored Indonesian tutor line through neural-only bundle', () => {
  // m025-95: Classroom tidak lagi bersuara Indonesia. Yang dijaga sekarang adalah
  // tutor bicara Inggris lewat satu pintu bersama, dengan subtitle Indonesia diambil
  // dari pasangan {en, id} milik dialog - bukan dari terjemahan, supaya jatah AI aman.
  const chat = fs.readFileSync('features/tutor-classroom/fiezel-tutor-voice-chat.js', 'utf8');
  assert.ok(/FiezelVoiceSay/.test(chat), 'tutor bicara lewat pintu bersama');
  assert.ok(!/FiezelIndonesianVoice/.test(chat), 'tutor tidak boleh memanggil mesin Indonesia');
  assert.ok(!/lang:\s*'id-ID'/.test(chat), 'tidak ada lagi permintaan suara id-ID');
  assert.ok(/reply\.en|input\.en|\.en\b/.test(chat), 'sisi Inggris dialog yang diucapkan');
  assert.strictEqual(pack.voiceContract.speech, 'id-ID neural tutor');
  assert.strictEqual(pack.voiceContract.targetLanguage, 'en');
  assert.ok(/pair\.en/.test(tutorSource), 'English remains authored target-language content');
  assert.ok(!/MediaRecorder/.test(tutorSource));
});
// ---- m025-41 OWNER corrections ---------------------------------------------------

test('opening Classroom lands on the subjects, not on a download interstitial', () => {
  // m025-41 menuntut kartu unduhan tidak boleh mendahului daftar subjek. m025-124 memenuhi
  // tuntutan yang sama dengan cara yang lebih kuat: kartunya dihapus seluruhnya, karena
  // paket yang ia tawarkan sudah tidak ada dan penyiapannya tidak pernah benar-benar
  // berjalan. Yang dijaga sekarang adalah ketiadaannya - kalau ia kembali, ia kembali
  // sebagai tawaran palsu lagi.
  assert.ok(tutorSource.indexOf('tutor-subject-grid') > -1, 'the subject grid must exist');
  assert.ok(!/data-tutor-bundle/.test(tutorSource),
    'kartu "Siapkan paket Indonesia" tidak boleh hidup lagi: paketnya tidak ada dan tombolnya tidak menyiapkan apa pun');
  assert.ok(!/indonesianVoicePrepared/.test(tutorSource),
    'status paket Indonesia tidak pernah diisi siapa pun sejak m025-100');
  assert.strictEqual(Tutor.createSession(pack).snapshot().phase, 'category',
    'a fresh session opens on the subject list');
});

test('the A1 foundation is complete across every subject', () => {
  const A1 = pack.lessons.filter(l => l.level === 'A1');
  assert.ok(A1.length >= 24, `A1 track must be complete, found ${A1.length}`);
  for (const category of pack.categories.map(c => c.id)) {
    const inCategory = A1.filter(l => l.category === category);
    assert.ok(inCategory.length >= 2, `${category} must carry A1 material, found ${inCategory.length}`);
  }
  // Every lesson must be playable end to end, or a learner meets a dead subject.
  for (const lesson of pack.lessons) {
    assert.ok(lesson.segments.length >= 3, `${lesson.id} needs teaching beats`);
    assert.ok(lesson.questions.length >= 1, `${lesson.id} needs practice`);
    for (const q of lesson.questions) {
      assert.ok(q.options[q.answerIndex], `${lesson.id} has an unanswerable question`);
      assert.ok(q.explain.id && q.remediate.id, `${lesson.id} must explain in Indonesian`);
    }
  }
  assert.strictEqual(new Set(pack.lessons.map(l => l.id)).size, pack.lessons.length, 'lesson ids are unique');
});

test('every A1 lesson is reachable through the session state machine', () => {
  for (const lesson of pack.lessons) {
    const s = Tutor.createSession(pack);
    s.chooseCategory(lesson.category);
    s.chooseLesson(lesson.id);
    const snap = s.snapshot();
    assert.strictEqual(snap.phase, 'teach', `${lesson.id} must open its classroom`);
    assert.ok(snap.beatCount >= 3, `${lesson.id} must have teaching beats`);
    assert.ok(s.currentBeat().idText, `${lesson.id} must carry the spoken Indonesian line`);
  }
});

test('human-tutor controls remain intact', () => {
  for (const marker of ['Ask Fiezel', 'I don’t get it', 'Slower', 'Replay', 'Back to the exact lesson checkpoint']) assert.ok(tutorSource.includes(marker));
  assert.ok(tutorSource.includes('data-route-skills')); assert.ok(tutorSource.includes('tutor-board'));
});
test('UI layer stays responsive and reduced-motion aware', () => {
  assert.ok(tutorCss.includes('--ui-accent')); assert.ok(tutorCss.includes('.tutor-classroom-grid'));
  assert.ok(tutorCss.includes('@media (max-width:620px)')); assert.ok(tutorCss.includes('@media (prefers-reduced-motion:reduce)')); assert.ok(tutorCss.includes('@media (min-width:1000px)'));
});
test('integration loads correction after Tutor v3 and preserves five primary destinations', () => {
  // R2-3 (IMPLEMENTATION-R2-REPORT.md): pintu Classroom di Home DIKUNCI "Coming Soon" atas
  // permintaan owner — tombolnya disabled tanpa onclick, jadi ekspektasi lama
  // onclick="go('classroom')" sengaja diganti: view-nya harus tetap terdaftar, kartunya
  // harus tetap ada (terkunci), dan tidak boleh ada navigasi dari kartu itu.
  assert.ok(app.includes("'classroom'"));
  assert.ok(app.includes('classroom-launch is-coming-soon'), 'kartu Classroom harus tampil terkunci Coming Soon');
  assert.ok(!app.includes("onclick=\"go('classroom')\""), 'kartu Classroom tidak boleh lagi bernavigasi');
  // m025-246: tab bar dipangkas ke empat tujuan (Hari ini / Latihan / Progres / Pengaturan).
  // Pola lama menghitung `class="nav"` lalu menambah 1 untuk tab aktif; pola ini langsung
  // menghitung keduanya, jadi ia tidak lagi bergantung pada asumsi "tepat satu tab aktif".
  assert.strictEqual((index.match(/class="nav(?: active)?"/g) || []).length, 4);
  assert.ok(index.includes('./features/tutor-classroom/fiezel-tutor-v3.js'));
  // m025-95: tambalan suara Indonesia dihapus; Classroom kini bicara Inggris bersubtitle.
  assert.ok(!index.includes('fiezel-tutor-indonesian-voice-fix.js'),
    'tambalan suara Indonesia tidak boleh dimuat lagi');
  assert.ok(index.includes('./features/neural-voice/fiezel-voice-say.js'),
    'jalur bicara Inggris + subtitle harus dimuat');
});
test('PWA release identity is coherent and caches correction layer', () => {
  const diagBuild = (diag.match(/DIAG_BUILD\s*=\s*'([^']+)'/)||[])[1];
  assert.ok(diagBuild); assert.ok(sw.includes("const SW_REV='" + diagBuild + "-"));
  assert.ok(sw.includes('./features/tutor-classroom/fiezel-tutor-v3.js'));
  assert.ok(!sw.includes('fiezel-tutor-indonesian-voice-fix.js'),
    'berkas yang sudah dihapus tidak boleh tersisa di daftar shell')
  assert.ok(sw.includes('./features/neural-voice/fiezel-voice-say.js'),
    'pintu bicara bersama harus ikut tersimpan di shell');
  assert.ok(sw.includes('./features/tutor-classroom/tutor-v3.css'));
});

test('Classroom filters every category and lesson by the host active level', () => {
  const a1 = Classroom.createSession(pack, { activeLevel: 'a1' });
  assert.strictEqual(a1.snapshot().activeLevel, 'A1');
  assert.strictEqual(a1.snapshot().levelLocked, true);
  assert.ok(a1.categories().length > 0);
  assert.ok(a1.categories().every(category => a1.lessonsIn(category.id).every(lesson => lesson.level === 'A1')));
  const b1 = pack.lessons.find(lesson => lesson.level === 'B1');
  assert.ok(b1, 'fixture must contain a B1 lesson');
  assert.throws(() => a1.chooseLesson(b1.id), /lesson_not_in_active_level/);
});

test('Classroom level switching resets stale lesson state and keeps one global level', () => {
  const first = pack.lessons.find(lesson => lesson.level === 'A1');
  const second = pack.lessons.find(lesson => lesson.level === 'B1');
  const session = Classroom.createSession(pack, { initialLevel: 'A1' });
  session.chooseCategory(first.category);
  session.chooseLesson(first.id);
  assert.strictEqual(session.snapshot().phase, 'teach');
  session.setActiveLevel('B1');
  const after = session.snapshot();
  assert.strictEqual(after.phase, 'category');
  assert.strictEqual(after.activeLevel, 'B1');
  assert.strictEqual(after.lessonId, null);
  assert.ok(session.lessonsIn(second.category).every(lesson => lesson.level === 'B1'));
  assert.throws(() => session.chooseLesson(first.id), /lesson_not_in_active_level/);
});

test('Classroom follows a dynamic host level callback without a second picker', () => {
  let selected = 'A1';
  const session = Classroom.createSession(pack, { getActiveLevel: () => selected });
  assert.strictEqual(session.activeLevel(), 'A1');
  selected = 'B1';
  assert.strictEqual(session.activeLevel(), 'B1');
  assert.strictEqual(session.snapshot().phase, 'category');
  assert.strictEqual(session.snapshot().availableLessonCount, pack.lessons.filter(lesson => lesson.level === 'B1').length);
  assert.strictEqual(session.snapshot().levelLocked, true);
});

test('Classroom legacy callers remain unrestricted when no level contract is supplied', () => {
  const session = Classroom.createSession(pack);
  assert.strictEqual(session.snapshot().activeLevel, null);
  assert.strictEqual(session.snapshot().levelLocked, false);
  assert.strictEqual(session.snapshot().availableLessonCount, pack.lessons.length);
});
console.log(`FIEZEL Classroom Indonesian tutor: PASS ${pass}/${pass}`);
