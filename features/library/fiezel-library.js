/**
 * m025-44 FIEZEL Library.
 *
 * Nine books: five public-domain tales retold in full, and four modern classics that are
 * still in copyright and therefore ship as FIEZEL's own graded retelling rather than the
 * author's text. The reading experience is identical either way.
 *
 * Three things the learner gets on every book, and how each is actually built:
 *
 *   reading      the text is stored as SENTENCES, not paragraphs. Everything below -
 *                translation, narration, progress - is addressed by sentence index, so
 *                there is exactly one source of truth for "where am I".
 *   audiobook    there is no audio file and no licence to buy: narration is the neural
 *                English voice the app already ships, driven one sentence at a time. That
 *                also makes the highlight free, because the player knows the index.
 *   translation  every sentence carries an authored Indonesian line. Tapping a sentence
 *                is a lookup, so it is instant and works with no connection. Machine
 *                translation would be slower, worse, and online-only.
 *
 * Pure state machine, no DOM, so the whole thing is testable in Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelLibrary = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-library-v1';
  var PROGRESS_KEY = 'fiezel-library-progress-v1';

  function validate(pack) {
    if (!pack || pack.schema !== SCHEMA) throw new Error('library_pack_invalid');
    if (!Array.isArray(pack.books) || !pack.books.length) throw new Error('library_pack_empty');
    return pack;
  }

  /** Flattens a book into the one list everything else indexes into. */
  function sentencesOf(book) {
    var out = [];
    (book && book.chapters || []).forEach(function (chapter, chapterIndex) {
      (chapter.sentences || []).forEach(function (sentence) {
        out.push({
          index: out.length,
          chapterIndex: chapterIndex,
          chapterTitle: chapter.title,
          en: String(sentence.en || ''),
          id: String(sentence.id || '')
        });
      });
    });
    return out;
  }

  function bookSummary(book) {
    var sentences = sentencesOf(book);
    return {
      id: book.id,
      title: book.title,
      kind: book.kind,
      level: book.level,
      minutes: Number(book.minutes) || 0,
      author: book.author || '',
      source: book.source || '',
      cover: book.cover || {},
      about: book.about || { en: '', id: '' },
      chapters: (book.chapters || []).length,
      sentences: sentences.length,
      // A retelling must be labelled as one wherever the book is shown, not only in a
      // credits screen nobody opens.
      original: book.kind !== 'guide'
    };
  }

  function createSession(pack, saved) {
    validate(pack);
    var state = {
      bookId: null,
      sentenceIndex: 0,
      playing: false,
      selected: null,
      progress: (saved && typeof saved === 'object' && saved.books) ? saved.books : {}
    };

    function books() { return pack.books.map(bookSummary); }
    function book() {
      if (!state.bookId) return null;
      return pack.books.filter(function (b) { return b.id === state.bookId; })[0] || null;
    }
    function sentences() { return book() ? sentencesOf(book()) : []; }

    function open(bookId) {
      var found = pack.books.filter(function (b) { return b.id === bookId; })[0];
      if (!found) throw new Error('unknown_book');
      state.bookId = bookId;
      // Resume where the learner stopped; a finished book restarts from the beginning
      // rather than reopening on its last line.
      var saved = state.progress[bookId];
      var total = sentencesOf(found).length;
      var at = saved && Number.isFinite(Number(saved.sentenceIndex)) ? Number(saved.sentenceIndex) : 0;
      state.sentenceIndex = at >= total - 1 ? 0 : Math.max(0, at);
      state.selected = null;
      state.playing = false;
      return snapshot();
    }

    function close() {
      state.bookId = null;
      state.playing = false;
      state.selected = null;
      return snapshot();
    }

    function current() {
      var list = sentences();
      return list[state.sentenceIndex] || null;
    }

    function goTo(index) {
      var list = sentences();
      if (!list.length) return snapshot();
      state.sentenceIndex = Math.max(0, Math.min(list.length - 1, Math.round(Number(index) || 0)));
      remember();
      return snapshot();
    }

    /** Advances the narration. Returns null at the end, which is how the player stops. */
    function next() {
      var list = sentences();
      if (state.sentenceIndex >= list.length - 1) {
        state.playing = false;
        remember(true);
        return null;
      }
      state.sentenceIndex++;
      remember();
      return current();
    }

    function previous() {
      state.sentenceIndex = Math.max(0, state.sentenceIndex - 1);
      remember();
      return current();
    }

    function play() { state.playing = !!book(); return state.playing; }
    function pause() { state.playing = false; return false; }

    /** Tap a sentence: the translation is already here, so this is a lookup. */
    function select(index) {
      var list = sentences();
      var at = Math.max(0, Math.min(list.length - 1, Math.round(Number(index) || 0)));
      state.selected = list[at] || null;
      return state.selected;
    }
    function clearSelection() { state.selected = null; return null; }

    function translate(index) {
      var picked = sentences()[Math.max(0, Math.round(Number(index) || 0))];
      return picked ? { en: picked.en, id: picked.id } : null;
    }

    function remember(finished) {
      if (!state.bookId) return;
      var list = sentences();
      state.progress[state.bookId] = {
        sentenceIndex: state.sentenceIndex,
        total: list.length,
        percent: list.length ? Math.round(((state.sentenceIndex + 1) / list.length) * 100) : 0,
        finished: finished === true || state.sentenceIndex >= list.length - 1,
        at: Date.now()
      };
    }

    function progressFor(bookId) {
      var saved = state.progress[bookId];
      if (!saved) return { sentenceIndex: 0, percent: 0, finished: false };
      return {
        sentenceIndex: Number(saved.sentenceIndex) || 0,
        percent: Number(saved.percent) || 0,
        finished: !!saved.finished
      };
    }

    function exportProgress() { return { schema: PROGRESS_KEY, books: state.progress }; }

    function snapshot() {
      var list = sentences();
      var b = book();
      return {
        schema: SCHEMA,
        bookId: state.bookId,
        title: b ? b.title : null,
        kind: b ? b.kind : null,
        sentenceIndex: state.sentenceIndex,
        sentenceCount: list.length,
        chapterTitle: current() ? current().chapterTitle : null,
        playing: state.playing,
        selected: state.selected,
        percent: list.length ? Math.round(((state.sentenceIndex + 1) / list.length) * 100) : 0
      };
    }

    return {
      books: books,
      open: open,
      close: close,
      sentences: sentences,
      current: current,
      goTo: goTo,
      next: next,
      previous: previous,
      play: play,
      pause: pause,
      select: select,
      clearSelection: clearSelection,
      translate: translate,
      progressFor: progressFor,
      exportProgress: exportProgress,
      snapshot: snapshot
    };
  }

  return Object.freeze({
    schema: SCHEMA,
    progressKey: PROGRESS_KEY,
    validate: validate,
    sentencesOf: sentencesOf,
    bookSummary: bookSummary,
    createSession: createSession
  });
}));
