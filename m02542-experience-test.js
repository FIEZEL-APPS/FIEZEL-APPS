'use strict';
// m025-42 OWNER experience batch:
//   1. Classroom press-to-talk with varied, lesson-aware answers
//   2. a mandatory daily target that locks every in-app exit
//   3. zoom disabled everywhere, by tag AND by gesture
//   4. one batch download for both neural voices, offered once and never again
const assert = require('assert');
const fs = require('fs');

const zoom = require('./features/ui/fiezel-zoom-lock.js');
const gate = require('./features/neural-voice/fiezel-voice-bundle-gate.js');
const daily = require('./features/daily-target/fiezel-daily-target.js');
const dialog = require('./features/tutor-classroom/fiezel-tutor-dialog.js');
const music = require('./features/audio/fiezel-soundtrack.js');

const index = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const gateSrc = fs.readFileSync('features/neural-voice/fiezel-voice-bundle-gate.js', 'utf8');
const dailySrc = fs.readFileSync('features/daily-target/fiezel-daily-target.js', 'utf8');
const chatSrc = fs.readFileSync('features/tutor-classroom/fiezel-tutor-voice-chat.js', 'utf8');
const tutorSrc = fs.readFileSync('features/tutor-classroom/fiezel-tutor-v3.js', 'utf8');
const tutorCss = fs.readFileSync('features/tutor-classroom/tutor-v3.css', 'utf8');
const dialogSrc = fs.readFileSync('features/tutor-classroom/fiezel-tutor-dialog.js', 'utf8');

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('PASS', name); };

const LESSON = {
  topic: 'Present Perfect',
  level: 'B1',
  board: { title: 'Present Perfect', formula: 'Subject + have / has + V3', examples: ['I have finished my homework.', 'She has visited Singapore.'] }
};
const BEAT = { en: 'We use it when the result still matters now.', idText: 'Kita memakainya saat hasilnya masih terasa sekarang.' };

// ---- 3. zoom lock ------------------------------------------------------------------

test('the viewport is pinned to one scale', () => {
  const meta = (index.match(/<meta name="viewport"[^>]*>/) || [''])[0];
  assert.match(meta, /user-scalable=no/, 'user scaling must be refused');
  assert.match(meta, /maximum-scale=1/, 'no zoom in');
  assert.match(meta, /minimum-scale=1/, 'no zoom out');
  assert.match(css, /touch-action:manipulation/, 'double-tap zoom is removed in CSS too');
  assert.match(css, /text-size-adjust:100%/, 'the OS must not rescale text either');
});

test('pinch and double tap are refused at the event level, because iOS ignores the tag', () => {
  let now = 1000;
  const guard = zoom.createGuard(() => now);
  assert.strictEqual(guard.isPinch(2), true, 'two fingers is a pinch');
  assert.strictEqual(guard.isPinch(1), false, 'one finger must still scroll and tap');
  assert.strictEqual(guard.isDoubleTap(100, 100), false, 'a first tap is just a tap');
  now += 120;
  assert.strictEqual(guard.isDoubleTap(105, 104), true, 'a quick second tap nearby is a zoom gesture');
  now += 120;
  assert.strictEqual(guard.isDoubleTap(105, 104), false, 'the pair is consumed, so a third tap is free');
  now += 2000;
  assert.strictEqual(guard.isDoubleTap(105, 104), false, 'a slow second tap is two separate taps');
  now += 100;
  assert.strictEqual(guard.isDoubleTap(400, 400), false, 'a quick tap far away is not a double tap');
});

test('the zoom lock is loaded and precached, and never blocks single-finger input', () => {
  assert.ok(index.includes('./features/ui/fiezel-zoom-lock.js'), 'loaded by the document');
  assert.ok(sw.includes('./features/ui/fiezel-zoom-lock.js'), 'precached for offline');
  const src = fs.readFileSync('features/ui/fiezel-zoom-lock.js', 'utf8');
  assert.match(src, /passive: false/, 'a passive listener cannot cancel a gesture');
  assert.match(src, /gesturestart/, 'the WebKit pinch events are handled');
  // The single-touch path must never be cancelled or scrolling and every button dies.
  assert.ok(/isPinch\(event && event\.touches && event\.touches\.length\)/.test(src),
    'touchmove is only cancelled when more than one finger is down');
});

// ---- 4. one-batch voice download ---------------------------------------------------

test('the download is mandatory: the sheet stays until both bundles exist', () => {
  assert.strictEqual(gate.shouldPrompt({ englishPrepared: false, indonesianPrepared: false }), true, 'fresh install asks');
  assert.strictEqual(gate.shouldPrompt({ englishPrepared: true, indonesianPrepared: false }), true, 'half installed still asks');
  assert.strictEqual(gate.shouldPrompt({ englishPrepared: true, indonesianPrepared: true }), false, 'gone for good once both exist');
  assert.strictEqual(gate.shouldPrompt({ englishPrepared: false, indonesianPrepared: false, downloading: true }), true,
    'the sheet remains on screen while the download runs');
  assert.strictEqual(gate.shouldPrompt({ englishPrepared: false, indonesianPrepared: false, dismissed: true }), true,
    'there is no dismissal path any more');
  assert.ok(!/voiceBundleLater|Nanti saja/.test(gateSrc), 'the "later" button must not exist');
  assert.match(gateSrc, /voice-bundle-locked/, 'the app is held while a bundle is missing');
});

test('progress is reported as one number across both bundles', () => {
  assert.deepStrictEqual(gate.progressOf([{ completed: 5, total: 5 }, { completed: 0, total: 5 }]),
    { completed: 5, total: 10, percent: 50 });
  assert.deepStrictEqual(gate.progressOf([]), { completed: 0, total: 0, percent: 0 }, 'no data is 0%, never NaN');
  assert.strictEqual(gate.progressOf([{ completed: 9, total: 5 }]).percent, 100, 'progress never exceeds 100%');
});

test('the batch is one download, sequential, and reports progress in place', () => {
  assert.match(gateSrc, /prepareEnglish\(\)\s*\n?\s*\.then\(function \(\) \{ return prepareIndonesian\(\); \}\)/,
    'English then Indonesian, never raced');
  assert.match(gateSrc, /voiceBundleBar/, 'progress is shown on the sheet itself');
  // A stored completion flag must never outlive the assets it claims exist.
  assert.match(gateSrc, /completed: english && indonesian && readFlag\(\)/,
    'the "never again" flag is only trusted while both engines report prepared');
  assert.ok(index.includes('./features/neural-voice/fiezel-voice-bundle-gate.js'), 'loaded by the document');
  assert.ok(sw.includes('./features/neural-voice/fiezel-voice-bundle-gate.js'), 'precached');
  assert.match(app, /FiezelVoiceBundleGate\?\.maybePrompt/, 'it is the third prompt after the notification gate');
});

// ---- 2. mandatory daily target -----------------------------------------------------

test('the target is derived from the learner, inside sane bounds', () => {
  assert.strictEqual(daily.targetFor({ sessionSize: 12, dueReviews: 0 }), 12);
  assert.strictEqual(daily.targetFor({ sessionSize: 12, dueReviews: 5 }), 17);
  assert.strictEqual(daily.targetFor({ sessionSize: 12, dueReviews: 99 }), daily.MAX_TARGET, 'a huge backlog cannot make the day impossible');
  assert.strictEqual(daily.targetFor({ sessionSize: 2, dueReviews: 0 }), daily.MIN_TARGET, 'a tiny session still means a real day');
  assert.strictEqual(daily.targetFor({}), 12, 'missing evidence falls back to the standard session');
});

test('the lock only engages for a learner who meets all three conditions', () => {
  const base = { sessionSize: 12, dueReviews: 0, todayAttempts: 0 };
  assert.strictEqual(daily.evaluate({ ...base, notificationsGranted: false, placementDone: true }).locked, false,
    'no notifications, no lock');
  assert.strictEqual(daily.evaluate({ ...base, notificationsGranted: true, placementDone: false }).locked, false,
    'not assessed yet, no lock');
  const locked = daily.evaluate({ ...base, notificationsGranted: true, placementDone: true });
  assert.strictEqual(locked.locked, true, 'assessed learner with an unfinished target is locked');
  assert.strictEqual(locked.remaining, 12);
  const met = daily.evaluate({ ...base, notificationsGranted: true, placementDone: true, todayAttempts: 12 });
  assert.strictEqual(met.locked, false, 'finishing the target unlocks the app');
  assert.strictEqual(met.met, true);
  assert.strictEqual(met.done, 12, 'overshooting is capped at the target for display');
});

test('every in-app exit is blocked while the lock is armed', () => {
  assert.match(dailySrc, /guarded\.__dailyTargetGuarded/, 'go() is wrapped so navigation is refused');
  assert.match(dailySrc, /popstate/, 'the in-app back gesture is swallowed');
  assert.match(dailySrc, /visibilitychange/, 'returning to the app re-evaluates the lock');
  assert.match(css, /body\.daily-locked \.bottomnav/, 'the bottom navigation is inert while locked');
  // Honesty requirement: the module must not pretend it can hold the OS gesture.
  assert.match(dailySrc, /CANNOT: stop the iOS home-screen swipe/,
    'the OS-level limit must be documented where the next maintainer will read it');
  assert.ok(index.includes('./features/daily-target/fiezel-daily-target.js'), 'loaded by the document');
  assert.ok(sw.includes('./features/daily-target/fiezel-daily-target.js'), 'precached');
  assert.match(app, /FiezelDailyTarget\?\.start/, 'armed once the app unlocks');
  assert.match(app, /window\.__fiezelDueReviews=/, 'the module reads real review evidence, not a guess');
});

// ---- 1. press-to-talk --------------------------------------------------------------

test('what the learner asks for is recognised, in Indonesian', () => {
  assert.strictEqual(dialog.classify('kenapa bukan I have went?'), 'why');
  assert.strictEqual(dialog.classify('kasih contoh dong'), 'example');
  assert.strictEqual(dialog.classify('apa bedanya went sama gone'), 'difference');
  assert.strictEqual(dialog.classify('tolong ulangi'), 'repeat');
  assert.strictEqual(dialog.classify('terlalu cepat, pelan dong'), 'slower');
  assert.strictEqual(dialog.classify('aku masih bingung'), 'confused');
  assert.strictEqual(dialog.classify('bahasa inggrisnya apa'), 'translate');
  assert.strictEqual(dialog.classify('ini keluar di TOEFL?'), 'exam');
  assert.strictEqual(dialog.classify(''), 'empty', 'silence is its own case, not an error');
  assert.strictEqual(dialog.classify('bagaimana kalau subjeknya jamak'), 'open', 'anything else still gets an answer');
});

test('answers are built from the lesson on screen, not from a canned string', () => {
  const memory = dialog.createMemory();
  const reply = dialog.respond('apa itu present perfect', { lesson: LESSON, beat: BEAT }, memory);
  assert.strictEqual(reply.intent, 'meaning');
  assert.ok(reply.id.includes('Present Perfect'), 'the live topic is named');
  assert.ok(reply.id.includes('have / has + V3'), 'the live formula is used');
  assert.ok(!/\{\w+\}/.test(reply.id), 'no placeholder may reach the learner');
  const repeatReply = dialog.respond('ulangi', { lesson: LESSON, beat: BEAT }, memory);
  assert.ok(repeatReply.id.includes(BEAT.idText), 'a repeat replays the actual teaching beat');
});

test('asking the same thing twice never returns the same sentence', () => {
  const memory = dialog.createMemory();
  const seen = new Set();
  for (let i = 0; i < 3; i++) {
    const reply = dialog.respond('kenapa begitu?', { lesson: LESSON, beat: BEAT }, memory);
    assert.ok(!seen.has(reply.id), `variant ${i} repeated a previous answer`);
    seen.add(reply.id);
  }
  assert.strictEqual(seen.size, 3, 'three asks, three phrasings');
  // Different learners/questions must not share one rotating counter.
  const other = dialog.createMemory();
  const first = dialog.respond('kenapa begitu?', { lesson: LESSON, beat: BEAT }, other);
  assert.ok(first.id.length > 0, 'a fresh memory answers from the top');
});

test('a missing lesson degrades to a usable answer instead of throwing', () => {
  const reply = dialog.respond('apa itu ini', {}, dialog.createMemory());
  assert.ok(reply.id.length > 0, 'still answers');
  assert.ok(!/\{\w+\}/.test(reply.id), 'still no placeholders');
  assert.ok(!/undefined|null/.test(reply.id), 'no debris from missing fields');
});

test('the AI prompt carries the lesson and forbids repetitive phrasing', () => {
  const prompt = dialog.aiPrompt('kenapa bukan I have went?', { lesson: LESSON, beat: BEAT });
  assert.ok(prompt.includes('Present Perfect'), 'the model is told what is on screen');
  assert.ok(prompt.includes('Jangan mengulang kalimat pembuka yang sama'), 'variation is required of the model too');
  assert.ok(prompt.includes('kenapa bukan I have went?'), 'the question is passed through');
});

test('the round button exists, answers by voice, and never falls back to browser TTS', () => {
  assert.match(tutorCss, /\.tutor-talk-button\{[^}]*border-radius:50%/, 'the button is round');
  assert.match(tutorCss, /\.tutor-talk-dock\{[^}]*left:50%/, 'and centred');
  assert.match(chatSrc, /SpeechRecognition \|\| root\.webkitSpeechRecognition/, 'speech input where the platform has it');
  assert.match(chatSrc, /openTypeSheet/, 'and a typing fallback where it does not, so the button is never dead');
  // OWNER: the chat log covered the lesson. It must be gone, and the answer goes to the
  // tutor's own subtitle line instead.
  assert.ok(!/tutorTalkLog/.test(chatSrc), 'no chat box may cover the material');
  assert.ok(!/tutor-talk-log/.test(tutorCss), 'and no styles for one may linger');
  assert.match(chatSrc, /function showAnswer/, 'the answer lands in the lesson subtitle');
  assert.ok(!/speechSynthesis|SpeechSynthesisUtterance/.test(chatSrc), 'browser TTS is never used');
  assert.match(chatSrc, /allowFallback: false/, 'neural only, both paths');
  // AI first, local engine second: an offline learner must still get an answer.
  const answerFn = chatSrc.slice(chatSrc.indexOf('function answer(question)'));
  assert.ok(answerFn.indexOf('aiAnswer(') < answerFn.indexOf('localAnswer('),
    'the gateway is tried before the local engine');
  assert.match(chatSrc, /if \(aiText\) return/, 'the local engine answers whenever the gateway does not');
  assert.match(tutorSrc, /__fiezelTutorContext/, 'the live lesson checkpoint is exposed to the talk layer');
  assert.ok(index.includes('./features/tutor-classroom/fiezel-tutor-dialog.js'), 'dialog engine loaded');
  assert.ok(index.includes('./features/tutor-classroom/fiezel-tutor-voice-chat.js'), 'talk layer loaded');
  assert.ok(sw.includes('./features/tutor-classroom/fiezel-tutor-voice-chat.js'), 'precached for offline use');
  assert.ok(index.indexOf('./features/tutor-classroom/fiezel-tutor-dialog.js') < index.indexOf('./features/tutor-classroom/fiezel-tutor-voice-chat.js'),
    'the engine must load before the layer that consumes it');
});


// ---- m025-43 OWNER repair batch ----------------------------------------------------

test('both gates start themselves, because the app.js call site runs too early', () => {
  // The original call sat inside unlockAppAfterNotification, which executes while app.js
  // is still parsing - every <script> after it was undefined, so the optional call was a
  // silent no-op. That is why OWNER saw no popup at all.
  assert.match(gateSrc, /DOMContentLoaded/, 'the voice gate arms itself');
  assert.match(gateSrc, /setInterval\(function \(\) \{/, 'and keeps checking');
  assert.match(dailySrc, /DOMContentLoaded/, 'the daily target arms itself');
  assert.ok(app.indexOf('FiezelVoiceBundleGate?.maybePrompt') > -1, 'app.js still nudges it, harmlessly');
  // Two blocking sheets must never stack.
  assert.match(dailySrc, /voiceBundleSheet/, 'the target sheet waits for the mandatory download');
});

test('long press can no longer select or copy the interface', () => {
  assert.match(css, /-webkit-touch-callout:none/, 'the iOS copy callout is disabled');
  assert.match(css, /user-select:none/, 'selection is off for the interface');
  assert.match(css, /input,textarea,select,\[contenteditable="true"\]\{-webkit-user-select:text/,
    'real text fields keep selection, or typing breaks');
});

test('wrong answers buzz hard and sound wrong, everywhere', () => {
  assert.match(app, /error:\[90,60,90,60,140\]/, 'a wrong answer is a long, unmistakable pattern');
  assert.ok(!/error:\[28,45,28\]/.test(app), 'the old 28ms flutter is gone');
  // A stored preference that was never written must not read as "off".
  assert.match(app, /function feedbackSoundsOn\(\)\{return state\.preferences\?\.feedbackSounds!==false\}/,
    'only an explicit false disables sound');
  assert.match(app, /state\.preferences\?\.haptics===false/, 'same for haptics');
  assert.match(app, /bindAudioUnlockGestures/, 'the audio context is resumed on the first gesture');
  assert.match(app, /window\.answerFeedbackSignal=answerFeedbackSignal/, 'other layers can fire the same feedback');
  assert.match(tutorSrc, /answerFeedbackSignal/, 'Classroom answers are no longer silent');
  // iOS has no Vibration API at all; the code must say so rather than pretend.
  assert.match(app, /iOS Safari has NO Vibration API/, 'the platform limit is documented where it bites');
});

test('the soundtrack is an arrangement, not a chord ping', () => {
  assert.ok(music.BPM > 0 && music.BAR > 0, 'it has tempo');
  assert.ok(music.PROGRESSION.length >= 4, 'and a chord progression');
  const plan = music.barPlan(0, 0);
  const voices = new Set(plan.notes.map(n => n.voice));
  for (const voice of ['pad', 'bass', 'arp', 'hat', 'kick']) {
    assert.ok(voices.has(voice), `the arrangement must include ${voice}`);
  }
  assert.ok(plan.notes.length >= 15, 'a bar carries real note density');
  // Notes are placed on the audio clock, in order, inside the bar.
  const times = plan.notes.map(n => n.at);
  assert.ok(Math.min(...times) >= 0 && Math.max(...times) < music.BAR, 'every note lands inside its bar');
  assert.strictEqual(music.chordAt(4).name, music.PROGRESSION[0].name, 'the progression loops');
  const second = music.barPlan(1, music.BAR);
  assert.notStrictEqual(second.chord, plan.chord, 'consecutive bars change chord');
  assert.match(app, /FiezelSoundtrack\?\.create/, 'app.js uses the engine');
  assert.ok(!/playAmbientChord/.test(app), 'the old three-oscillator ping is gone');
  assert.ok(index.includes('./features/audio/fiezel-soundtrack.js'), 'loaded by the document');
  assert.ok(sw.includes('./features/audio/fiezel-soundtrack.js'), 'precached');
});

test('Fiezel AI answers anything, and says plainly when it cannot', () => {
  const prompt = dialog.aiPrompt('siapa penemu listrik?', { lesson: LESSON, beat: BEAT });
  assert.ok(/APA PUN/.test(prompt), 'the model is told to answer any question');
  assert.ok(/Jangan menolak pertanyaan hanya karena berada di luar materi/.test(prompt),
    'and told not to deflect back to the lesson');
  assert.ok(/Konteks opsional/.test(prompt), 'the lesson is background, not the subject');
  assert.ok(!/Kamu adalah FIEZEL, tutor bahasa Inggris untuk pelajar Indonesia level/.test(dialogSrc),
    'the lesson-locked persona is gone');
  // Offline honesty: an off-topic question without the gateway says why.
  assert.match(chatSrc, /function unavailableReason/, 'the reason is surfaced to the learner');
  assert.match(chatSrc, /login Puter dulu/, 'and it names the actual fix');
});

test('Speaking and Listening no longer carries an optional voice setup', () => {
  const skills = app.slice(app.indexOf('async function skillsLab'), app.indexOf('async function startAdaptive'));
  assert.ok(!/neuralVoiceStatusMarkup\(\)/.test(skills), 'the optional card is out of Skills Lab');
  assert.ok(!/prepareIndonesianVoice\)/.test(skills), 'and so are its buttons');
  // Nothing is lost: the same controls now live in Settings, where setup belongs.
  const settings = app.slice(app.indexOf('function openSettings()'), app.indexOf('function saveSettings()'));
  assert.ok(/neuralVoiceStatusMarkup\(\)/.test(settings), 'the controls moved to Settings');
  assert.ok(/prepareNeuralVoice/.test(settings), 'with their handlers');
});

console.log(`FIEZEL m025-42/43 experience batch: PASS ${pass}/${pass}`);
