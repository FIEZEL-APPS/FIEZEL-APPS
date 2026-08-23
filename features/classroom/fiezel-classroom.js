/**
 * m025-33 FIEZEL Classroom Tutor.
 *
 * Flow is Category -> Topic -> Classroom, per the Classroom design. Fiezel explains in
 * English neural voice while an Indonesian subtitle runs as comprehension scaffolding.
 * The Indonesian bundle is NOT required: subtitles are authored text, so the lesson is
 * fully usable with only the mandatory English engine downloaded.
 *
 * Deliberately kept as a pure state machine plus a renderer, with no direct DOM or
 * runtime imports, so it is unit-testable in Node without a browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelClassroom = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PHASES = ['category', 'topic', 'teach', 'quiz', 'summary'];
  var LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  var DEFAULT_ACTIVE_LEVEL = 'A1';

  function normalizeLevel(value) {
    var level = String(value == null ? '' : value).trim().toUpperCase();
    return LEVELS.indexOf(level) > -1 ? level : null;
  }

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value || {}, key);
  }

  /*
   * The host owns the learner's level. Classroom accepts the same contract as
   * the Skills Lab: activeLevel for a current value, initialLevel as an alias
   * for first mount, and getActiveLevel for a host value that can change later.
   * A caller that provides no contract keeps the original all-lessons behavior.
   */
  function createLevelContract(options) {
    var source = options || {};
    var getter = typeof source.getActiveLevel === 'function' ? source.getActiveLevel : null;
    var explicit = hasOwn(source, 'activeLevel') || hasOwn(source, 'initialLevel') || !!getter;
    var candidate;
    try {
      candidate = getter ? getter() : (source.activeLevel != null ? source.activeLevel : source.initialLevel);
    } catch (_) {
      candidate = null;
    }
    return {
      external: explicit,
      getter: getter,
      level: explicit ? (normalizeLevel(candidate) || DEFAULT_ACTIVE_LEVEL) : null
    };
  }

  function createSession(pack, options) {
    if (!pack || pack.schema !== 'fiezel-classroom-lessons-v1') {
      throw new Error('classroom_pack_invalid');
    }
    var levelContract = createLevelContract(options);
    var activeLevel = levelContract.level;
    var state = {
      phase: 'category',
      categoryId: null,
      lessonId: null,
      segmentIndex: 0,
      questionIndex: 0,
      attempts: 0,
      correct: 0,
      wrong: 0,
      // A miss is remediated once, then retried. Two misses on the same item move on
      // rather than trapping the learner in a loop.
      remediating: false,
      finished: false
    };

    function resetState() {
      state.phase = 'category'; state.categoryId = null; state.lessonId = null;
      state.segmentIndex = 0; state.questionIndex = 0; state.attempts = 0;
      state.correct = 0; state.wrong = 0; state.remediating = false; state.finished = false;
    }

    function syncActiveLevel() {
      if (!levelContract.getter) return activeLevel;
      var candidate;
      try { candidate = levelContract.getter(); } catch (_) { candidate = null; }
      var next = normalizeLevel(candidate);
      if (next && next !== activeLevel) {
        activeLevel = next;
        resetState();
      }
      return activeLevel;
    }

    function isAllowedLesson(lesson) {
      var current = syncActiveLevel();
      return !current || normalizeLevel(lesson && lesson.level) === current;
    }

    function visibleLessons() {
      return pack.lessons.filter(isAllowedLesson);
    }

    function categories() {
      var lessons = visibleLessons();
      return pack.categories.filter(function (category) {
        return lessons.some(function (lesson) { return lesson.category === category.id; });
      });
    }
    function lessonsIn(categoryId) {
      return visibleLessons().filter(function (l) { return l.category === categoryId; });
    }
    function lesson() {
      syncActiveLevel();
      if (!state.lessonId) return null;
      return visibleLessons().filter(function (l) { return l.id === state.lessonId; })[0] || null;
    }

    function chooseCategory(id) {
      if (!categories().some(function (c) { return c.id === id; })) throw new Error('unknown_category');
      state.categoryId = id;
      state.phase = 'topic';
      return snapshot();
    }

    function chooseLesson(id) {
      syncActiveLevel();
      var found = pack.lessons.filter(function (l) { return l.id === id; })[0];
      if (!found) throw new Error('unknown_lesson');
      if (!isAllowedLesson(found)) throw new Error('lesson_not_in_active_level');
      // Selecting a lesson from another category is legitimate deep-linking; keep the
      // category in sync rather than rejecting it.
      state.lessonId = id;
      state.categoryId = found.category;
      state.phase = 'teach';
      state.segmentIndex = 0;
      state.questionIndex = 0;
      state.attempts = 0;
      state.correct = 0;
      state.wrong = 0;
      state.remediating = false;
      state.finished = false;
      return snapshot();
    }

    function currentSegment() {
      var l = lesson();
      if (!l || state.phase !== 'teach') return null;
      return l.segments[state.segmentIndex] || null;
    }

    function nextSegment() {
      var l = lesson();
      if (!l || state.phase !== 'teach') return snapshot();
      if (state.segmentIndex < l.segments.length - 1) state.segmentIndex++;
      else state.phase = 'quiz';
      return snapshot();
    }

    function currentQuestion() {
      var l = lesson();
      if (!l || state.phase !== 'quiz') return null;
      return l.questions[state.questionIndex] || null;
    }

    function answer(optionIndex) {
      var q = currentQuestion();
      if (!q) throw new Error('no_active_question');
      state.attempts++;
      var right = Number(optionIndex) === Number(q.answerIndex);
      var wasRemediating = state.remediating;
      var result = {
        correct: right,
        // Only the first pass counts toward the score, so a retry after remediation
        // cannot inflate it.
        scored: !wasRemediating,
        feedback: right ? q.explain : q.remediate,
        retry: false,
        advanced: false
      };
      if (right) {
        if (!wasRemediating) state.correct++;
        state.remediating = false;
        advanceQuestion();
        result.advanced = true;
      } else if (!wasRemediating) {
        if (!wasRemediating) state.wrong++;
        state.remediating = true;
        result.retry = true;
      } else {
        // Second miss: show the explanation and move on rather than looping.
        state.remediating = false;
        result.feedback = q.explain;
        advanceQuestion();
        result.advanced = true;
      }
      return { snapshot: snapshot(), result: result };
    }

    function advanceQuestion() {
      var l = lesson();
      if (state.questionIndex < l.questions.length - 1) state.questionIndex++;
      else { state.phase = 'summary'; state.finished = true; }
    }

    function snapshot() {
      syncActiveLevel();
      var l = lesson();
      return {
        phase: state.phase,
        categoryId: state.categoryId,
        lessonId: state.lessonId,
        topic: l ? l.topic : null,
        level: l ? l.level : null,
        activeLevel: activeLevel,
        levelLocked: !!levelContract.external,
        availableLessonCount: visibleLessons().length,
        board: l ? l.board : null,
        segmentIndex: state.segmentIndex,
        segmentCount: l ? l.segments.length : 0,
        questionIndex: state.questionIndex,
        questionCount: l ? l.questions.length : 0,
        correct: state.correct,
        wrong: state.wrong,
        attempts: state.attempts,
        remediating: state.remediating,
        finished: state.finished,
        scorePercent: (l && l.questions.length) ? Math.round((state.correct / l.questions.length) * 100) : 0
      };
    }

    function reset() {
      resetState();
      return snapshot();
    }

    function setActiveLevel(level) {
      var next = normalizeLevel(level);
      if (!next) throw new Error('invalid_level');
      activeLevel = next;
      levelContract.external = true;
      levelContract.level = next;
      levelContract.getter = null;
      resetState();
      return snapshot();
    }

    return {
      phases: PHASES.slice(),
      levels: LEVELS.slice(),
      activeLevel: function () { return syncActiveLevel(); },
      setActiveLevel: setActiveLevel,
      categories: categories,
      lessonsIn: lessonsIn,
      lesson: lesson,
      chooseCategory: chooseCategory,
      chooseLesson: chooseLesson,
      currentSegment: currentSegment,
      nextSegment: nextSegment,
      currentQuestion: currentQuestion,
      answer: answer,
      snapshot: snapshot,
      reset: reset
    };
  }

  return Object.freeze({ createSession: createSession, PHASES: PHASES.slice(), LEVELS: LEVELS.slice(), normalizeLevel: normalizeLevel });
}));
