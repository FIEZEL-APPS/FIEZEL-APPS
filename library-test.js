'use strict';
// m025-44 FIEZEL Library: nine books, audiobook narration, instant translation, Ask Fiezel.
const assert = require('assert');
const fs = require('fs');

const Library = require('./features/library/fiezel-library.js');
const pack = require('./features/library/library-books-v1.json');
const ui = fs.readFileSync('features/library/fiezel-library-ui.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('PASS', name); };

const EXPECTED = [
  'three_little_pigs', 'ugly_duckling', 'boy_who_cried_wolf', 'lion_and_mouse', 'hansel_and_gretel',
  'little_prince_guide', 'charlottes_web_guide', 'giving_tree_guide', 'matilda_guide'
];

test('every requested book is on the shelf', () => {
  assert.strictEqual(pack.schema, 'fiezel-library-v1');
  const ids = pack.books.map(b => b.id);
  for (const id of EXPECTED) assert.ok(ids.includes(id), `${id} is missing`);
  assert.strictEqual(new Set(ids).size, ids.length, 'book ids are unique');
});

test('every sentence carries its own Indonesian translation', () => {
  let total = 0;
  for (const book of pack.books) {
    assert.ok(book.chapters.length >= 2, `${book.id} needs chapters`);
    for (const chapter of book.chapters) {
      assert.ok(chapter.title, `${book.id} chapter needs a title`);
      for (const sentence of chapter.sentences) {
        total++;
        assert.ok(sentence.en.trim(), `${book.id} has an empty English line`);
        assert.ok(sentence.id.trim(), `${book.id} has an untranslated line`);
        assert.notStrictEqual(sentence.en.trim(), sentence.id.trim(), `${book.id} left a line untranslated`);
        // A sentence is the unit of narration and of translation; a wall of text would
        // break the highlight and the tap target alike.
        assert.ok(sentence.en.length <= 160, `${book.id} has a line too long to narrate: ${sentence.en}`);
      }
    }
  }
  assert.ok(total >= 200, `library should be substantial, found ${total} sentences`);
});

test('books still in copyright ship as a labelled FIEZEL retelling, never as the original', () => {
  const guides = pack.books.filter(b => b.kind === 'guide').map(b => b.id);
  assert.deepStrictEqual(guides.sort(),
    ['charlottes_web_guide', 'giving_tree_guide', 'little_prince_guide', 'matilda_guide'],
    'the four modern novels are the retold ones');
  for (const book of pack.books.filter(b => b.kind === 'guide')) {
    assert.ok(/still in copyright/i.test(book.source), `${book.id} must state why it is a retelling`);
    assert.ok(book.author, `${book.id} must credit its author`);
    assert.strictEqual(Library.bookSummary(book).original, false, 'a retelling is never marked as original');
  }
  for (const book of pack.books.filter(b => b.kind === 'tale')) {
    assert.ok(/public domain/i.test(book.source), `${book.id} must state its public-domain source`);
    assert.strictEqual(Library.bookSummary(book).original, true);
  }
  // The label has to reach the screen, not just the data file.
  assert.match(ui, /library-badge/, 'the retelling badge is rendered on the shelf');
  assert.match(ui, /summary\.original \? '' : '<p class="library-note">/, 'and the reason is shown inside the book');
});

test('reading position is one index, shared by the text, the narrator and the translation', () => {
  const s = Library.createSession(pack, null);
  s.open('lion_and_mouse');
  assert.strictEqual(s.snapshot().sentenceIndex, 0);
  const first = s.current();
  assert.ok(first.en && first.id && first.chapterTitle);
  s.next(); s.next();
  assert.strictEqual(s.snapshot().sentenceIndex, 2);
  assert.deepStrictEqual(s.translate(2), { en: s.current().en, id: s.current().id },
    'translation is a lookup at the same index, so it is instant and offline');
  s.previous();
  assert.strictEqual(s.snapshot().sentenceIndex, 1);
  s.goTo(999);
  assert.strictEqual(s.snapshot().sentenceIndex, s.sentences().length - 1, 'out of range clamps to the end');
  assert.strictEqual(s.next(), null, 'the end of the book stops the narrator');
  assert.strictEqual(s.snapshot().playing, false);
});

test('progress is remembered per book and resumes where the reader stopped', () => {
  const s = Library.createSession(pack, null);
  s.open('three_little_pigs');
  s.goTo(5);
  const saved = s.exportProgress();
  assert.strictEqual(saved.books.three_little_pigs.sentenceIndex, 5);
  const resumed = Library.createSession(pack, saved);
  resumed.open('three_little_pigs');
  assert.strictEqual(resumed.snapshot().sentenceIndex, 5, 'the reader continues where they left off');
  assert.strictEqual(resumed.progressFor('ugly_duckling').percent, 0, 'other books are untouched');
  // A finished book reopens at the start instead of on its last line.
  const finisher = Library.createSession(pack, null);
  finisher.open('lion_and_mouse');
  finisher.goTo(finisher.sentences().length - 1);
  const done = Library.createSession(pack, finisher.exportProgress());
  done.open('lion_and_mouse');
  assert.strictEqual(done.snapshot().sentenceIndex, 0);
});

test('tapping a sentence selects it for translation and for Ask Fiezel', () => {
  const s = Library.createSession(pack, null);
  s.open('matilda_guide');
  const picked = s.select(3);
  assert.strictEqual(picked.index, 3);
  assert.ok(picked.id, 'the Indonesian line comes with it');
  assert.strictEqual(s.snapshot().selected.index, 3);
  s.clearSelection();
  assert.strictEqual(s.snapshot().selected, null);
});

test('a corrupt or foreign pack is refused instead of half-rendered', () => {
  assert.throws(() => Library.createSession({ schema: 'something-else', books: [] }), /library_pack_invalid/);
  assert.throws(() => Library.createSession({ schema: 'fiezel-library-v1', books: [] }), /library_pack_empty/);
  const s = Library.createSession(pack, null);
  assert.throws(() => s.open('no_such_book'), /unknown_book/);
});

test('the audiobook is the neural voice, one sentence at a time, and never browser TTS', () => {
  assert.match(ui, /FiezelVoiceRuntime/, 'narration uses the shipped neural runtime');
  assert.match(ui, /allowFallback: false/, 'no browser speech synthesis, ever');
  assert.ok(!/speechSynthesis|SpeechSynthesisUtterance/.test(ui));
  assert.match(ui, /lang: 'en-US'/, 'the books are English, so narration is English');
  assert.match(ui, /narrationToken/, 'pausing or leaving must cancel queued sentences');
  assert.match(ui, /highlight\(sentence\.index/, 'the highlight follows the narrator');
  assert.match(ui, /if \(narrating && !doc\.querySelector\('\.library-reader'\)\) stopNarration\(\)/,
    'leaving the screen silences the book');
});

test('Ask Fiezel is on every reading, model first and local second', () => {
  assert.match(ui, /libraryAsk/, 'the reader carries an Ask Fiezel control');
  assert.match(ui, /libraryAskOne/, 'and so does a tapped sentence');
  assert.match(ui, /askFiezelAI/, 'the Core AI gateway is tried');
  assert.match(ui, /FiezelTutorDialog/, 'with the local engine behind it');
  assert.match(ui, /speakIndonesian/, 'the answer is spoken, not only printed');
});

test('the library is wired into the app, precached, and reachable from Home', () => {
  assert.match(app, /'library'/, 'the view is registered');
  assert.match(app, /if\(state\.view==='library'\)library\(\);/, 'and rendered');
  assert.match(app, /onclick="go\('library'\)"/, 'Home has a launch card');
  assert.ok(index.includes('./features/library/fiezel-library.js'), 'the engine is loaded');
  assert.ok(index.includes('./features/library/fiezel-library-ui.js'), 'the screen is loaded');
  assert.ok(index.indexOf('./features/library/fiezel-library.js') < index.indexOf('./features/library/fiezel-library-ui.js'),
    'the engine must load before the screen that uses it');
  for (const asset of ['./features/library/fiezel-library.js', './features/library/fiezel-library-ui.js', './features/library/library-books-v1.json']) {
    assert.ok(sw.includes(asset), `${asset} must be precached for offline reading`);
  }
  assert.match(css, /\.library-sentence/, 'sentences are styled as tap targets');
  // The bottom navigation stays at five destinations; the library arrives via Home.
  assert.strictEqual((index.match(/class="nav"/g) || []).length + 1, 5);
});

console.log(`FIEZEL library: PASS ${pass}/${pass}`);
