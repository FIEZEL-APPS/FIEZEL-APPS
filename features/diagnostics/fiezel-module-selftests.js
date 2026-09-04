/**
 * m025-34 per-module self-tests for the universal diagnostic scanner.
 *
 * Each test is pure: it takes already-loaded data and returns findings. Loading lives
 * in the registration layer so a fetch failure is itself reported as a finding rather
 * than throwing somewhere unobservable.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelModuleSelfTests = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // i18n (AI-02 F01): naskah murid modul ini pindah ke features/i18n/copy-id-feat-a.js.
  // Di browser, fiezel-i18n.js + copy-map dimuat lebih dulu lewat urutan <script defer>
  // di index.html (AI-01 F02), jadi FiezelI18n dipakai langsung tanpa guard. Di Node
  // (tes print-only me-require modul ini), copy-map dimuat lewat require supaya nilai
  // 'id' tetap SATU sumber yang byte-identik dengan naskah beku gerbang emas.
  var I18N = (typeof FiezelI18n !== 'undefined') ? FiezelI18n
    : ((typeof module === 'object' && module.exports) ? require('../i18n/copy-id-feat-a.js') : null);
  function t(key, params) { return I18N.t(key, params); }

  function f(code, severity, detail, count) {
    return { code: code, severity: severity, detail: detail, count: count == null ? null : count };
  }
  function pct(part, total) { return total ? Math.round((part / total) * 1000) / 10 : 0; }

  function vocabulary(entries, targets) {
    var out = [];
    if (!Array.isArray(entries)) return [f('VOCAB_UNAVAILABLE', 'fatal', t('diag.vocab-unavailable'))];
    if (!entries.length) return [f('VOCAB_EMPTY', 'fatal', t('diag.vocab-empty'), 0)];
    if (entries.length < targets.vocabulary.minEntries) {
      out.push(f('VOCAB_BELOW_TARGET', 'warning', t('diag.vocab-below-target', { min: targets.vocabulary.minEntries }), entries.length));
    }
    var noMeaning = 0, noPhonetic = 0, badLevel = 0, seen = Object.create(null), dupes = 0;
    entries.forEach(function (e) {
      var word = String((e && (e.word || e.term || e.en)) || '').toLowerCase();
      var meaning = (e && (e.meaning || e.id || e.translation)) || '';
      var phonetic = (e && (e.phonetic || e.ipa)) || '';
      var level = (e && e.level) || '';
      if (!String(meaning).trim()) noMeaning++;
      if (!String(phonetic).trim()) noPhonetic++;
      if (level && targets.validLevels.indexOf(String(level)) === -1) badLevel++;
      if (word) { if (seen[word]) dupes++; else seen[word] = 1; }
    });
    if (pct(noMeaning, entries.length) > targets.vocabulary.maxEmptyMeaningPercent) {
      out.push(f('VOCAB_EMPTY_MEANING', 'error', t('diag.vocab-empty-meaning', { pct: pct(noMeaning, entries.length) }), noMeaning));
    }
    if (pct(noPhonetic, entries.length) > targets.vocabulary.maxEmptyPhoneticPercent) {
      out.push(f('VOCAB_EMPTY_PHONETIC', 'warning', t('diag.vocab-empty-phonetic', { pct: pct(noPhonetic, entries.length) }), noPhonetic));
    }
    if (badLevel) out.push(f('VOCAB_INVALID_LEVEL', 'error', t('diag.vocab-invalid-level'), badLevel));
    if (dupes) out.push(f('VOCAB_DUPLICATE', 'warning', t('diag.vocab-duplicate'), dupes));
    return out;
  }

  function reading(passages, targets) {
    var out = [];
    if (!Array.isArray(passages)) return [f('READING_UNAVAILABLE', 'fatal', t('diag.reading-unavailable'))];
    if (!passages.length) return [f('READING_EMPTY', 'fatal', t('diag.reading-empty'), 0)];
    if (passages.length < targets.reading.minPassages) {
      out.push(f('READING_BELOW_TARGET', 'warning', t('diag.reading-below-target', { min: targets.reading.minPassages }), passages.length));
    }
    var seen = Object.create(null), dupes = 0, noQuestions = 0;
    passages.forEach(function (p) {
      var text = String((p && (p.text || p.passage || p.body)) || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (text) { if (seen[text]) dupes++; else seen[text] = 1; }
      var qs = (p && (p.qs || p.questions || p.items)) || [];
      if (!Array.isArray(qs) || !qs.length) noQuestions++;
    });
    if (pct(dupes, passages.length) > targets.reading.maxDuplicatePercent) {
      out.push(f('READING_DUPLICATE_TEXT', 'error', t('diag.reading-duplicate-pct', { pct: pct(dupes, passages.length) }), dupes));
    } else if (dupes) {
      out.push(f('READING_DUPLICATE_TEXT', 'warning', t('diag.reading-duplicate-some'), dupes));
    }
    if (noQuestions) out.push(f('READING_NO_QUESTIONS', 'warning', t('diag.reading-no-questions'), noQuestions));
    return out;
  }

  function grammar(pack, targets) {
    var out = [];
    if (!pack) return [f('GRAMMAR_UNAVAILABLE', 'fatal', t('diag.grammar-unavailable'))];
    var templates = pack.templates || pack.items || [];
    var list = Array.isArray(templates) ? templates : Object.keys(templates).map(function (k) { return templates[k]; });
    if (!list.length) return [f('GRAMMAR_EMPTY', 'fatal', t('diag.grammar-empty'), 0)];
    if (list.length < targets.grammar.minTemplates) {
      out.push(f('GRAMMAR_BELOW_TARGET', 'warning', t('diag.grammar-below-target', { min: targets.grammar.minTemplates }), list.length));
    }
    // A template IS one item (stem + options), so "empty" means it carries no usable
    // question, not that it lacks a nested items array.
    var malformed = 0, skills = Object.create(null);
    list.forEach(function (t) {
      var stem = t && (t.stem || t.prompt || t.question);
      var options = (t && (t.options || t.choices)) || [];
      var answer = t ? (t.correctIndex == null ? t.answerIndex : t.correctIndex) : null;
      if (!stem || !Array.isArray(options) || !options.length || !Number.isInteger(Number(answer)) || !options[Number(answer)]) malformed++;
      var skill = t && (t.subskill || t.family);
      if (skill) skills[skill] = (skills[skill] || 0) + 1;
    });
    if (malformed) out.push(f('GRAMMAR_MALFORMED_ITEM', 'error', t('diag.grammar-malformed-item'), malformed));
    var thin = Object.keys(skills).filter(function (k) { return skills[k] < targets.grammar.minItemsPerSkill; });
    if (thin.length) out.push(f('GRAMMAR_THIN_SKILL', 'warning', t('diag.grammar-thin-skill', { list: thin.join(', ') }), thin.length));
    return out;
  }

  function leveltest(count, targets) {
    var out = [];
    if (!Number.isFinite(Number(count))) return [f('LEVELTEST_UNAVAILABLE', 'error', t('diag.leveltest-unavailable'))];
    if (Number(count) !== targets.leveltest.totalQuestions) {
      out.push(f('LEVELTEST_COUNT_MISMATCH', 'error', t('diag.leveltest-count-mismatch', { count: count, target: targets.leveltest.totalQuestions }), Number(count)));
    }
    return out;
  }

  function bank(items, minItems, prefix) {
    var out = [];
    if (!Array.isArray(items)) return [f(prefix + '_UNAVAILABLE', 'fatal', t('diag.bank-unavailable'))];
    if (!items.length) return [f(prefix + '_EMPTY', 'fatal', t('diag.bank-empty'), 0)];
    if (items.length < minItems) out.push(f(prefix + '_BELOW_TARGET', 'warning', t('diag.bank-below-target', { min: minItems }), items.length));
    var noId = items.filter(function (i) { return !(i && i.id); }).length;
    if (noId) out.push(f(prefix + '_MISSING_ID', 'error', t('diag.bank-missing-id'), noId));
    var ids = {}, dupes = 0;
    items.forEach(function (i) { var id = i && i.id; if (id) { if (ids[id]) dupes++; else ids[id] = 1; } });
    if (dupes) out.push(f(prefix + '_DUPLICATE_ID', 'error', t('diag.bank-duplicate-id'), dupes));
    return out;
  }

  function neuralVoice(status, targets) {
    var out = [];
    if (!status) return [f('VOICE_RUNTIME_MISSING', 'error', t('diag.voice-runtime-missing'))];
    if (!status.prepared) out.push(f('VOICE_NOT_DOWNLOADED', 'warning', t('diag.voice-not-downloaded')));
    if (status.circuitOpen) out.push(f('VOICE_CIRCUIT_OPEN', 'error', t('diag.voice-circuit-open', { reason: String(status.lastFallbackReason || status.error || '') })));
    if (status.prepared && Number(status.assetCount) !== targets.neuralVoice.expectedAssetCount) {
      out.push(f('VOICE_ASSET_COUNT', 'error', t('diag.voice-asset-count', { count: status.assetCount, target: targets.neuralVoice.expectedAssetCount }), Number(status.assetCount)));
    }
    if (status.lastFallbackReason) out.push(f('VOICE_LAST_FALLBACK', 'warning', t('diag.voice-last-fallback', { reason: String(status.lastFallbackReason) })));
    return out;
  }

  // m025-41: the pack is no longer three demo lessons, so structural validity is not
  // enough on its own. A curriculum with holes in it is a product defect the learner
  // meets as "materinya kurang", and the scanner now names it before they do.
  function classroom(pack, targets) {
    var out = [];
    if (!pack) return [f('CLASSROOM_UNAVAILABLE', 'error', t('diag.classroom-unavailable'))];
    var lessons = pack.lessons || [];
    if (!lessons.length) return [f('CLASSROOM_EMPTY', 'error', t('diag.classroom-empty'), 0)];
    var missingSubtitle = 0, badAnswer = 0, thinLesson = 0, noQuestions = 0, badLevel = 0;
    var seen = Object.create(null), dupes = 0;
    var validLevels = (targets && targets.validLevels) || null;
    var rules = (targets && targets.classroom) || null;
    lessons.forEach(function (l) {
      var segments = (l && l.segments) || [];
      var questions = (l && l.questions) || [];
      segments.forEach(function (s) { if (!s || !s.en || !s.id) missingSubtitle++; });
      questions.forEach(function (q) {
        if (!q || !Array.isArray(q.options) || !q.options[q.answerIndex]) badAnswer++;
      });
      if (l && l.id) { if (seen[l.id]) dupes++; else seen[l.id] = 1; }
      if (validLevels && l && l.level && validLevels.indexOf(String(l.level)) === -1) badLevel++;
      if (rules && segments.length < rules.minSegmentsPerLesson) thinLesson++;
      if (rules && questions.length < rules.minQuestionsPerLesson) noQuestions++;
    });
    if (missingSubtitle) out.push(f('CLASSROOM_MISSING_SUBTITLE', 'error', t('diag.classroom-missing-subtitle'), missingSubtitle));
    if (badAnswer) out.push(f('CLASSROOM_BAD_ANSWER', 'error', t('diag.classroom-bad-answer'), badAnswer));
    if (dupes) out.push(f('CLASSROOM_DUPLICATE_ID', 'error', t('diag.classroom-duplicate-id'), dupes));
    if (badLevel) out.push(f('CLASSROOM_INVALID_LEVEL', 'error', t('diag.classroom-invalid-level'), badLevel));
    if (thinLesson) out.push(f('CLASSROOM_THIN_LESSON', 'warning', t('diag.classroom-thin-lesson'), thinLesson));
    if (noQuestions) out.push(f('CLASSROOM_NO_QUESTIONS', 'error', t('diag.classroom-no-questions'), noQuestions));
    if (!rules) return out;

    var byCategory = Object.create(null);
    var foundation = 0;
    lessons.forEach(function (l) {
      var cat = l && l.category;
      if (cat) byCategory[cat] = (byCategory[cat] || 0) + 1;
      if (l && String(l.level) === rules.foundationLevel) foundation++;
    });
    var emptyCategories = rules.requiredCategories.filter(function (c) { return !byCategory[c]; });
    var thinCategories = rules.requiredCategories.filter(function (c) {
      return byCategory[c] && byCategory[c] < rules.minLessonsPerCategory;
    });
    if (emptyCategories.length) {
      out.push(f('CLASSROOM_CATEGORY_EMPTY', 'error', t('diag.classroom-category-empty', { list: emptyCategories.join(', ') }), emptyCategories.length));
    }
    if (thinCategories.length) {
      out.push(f('CLASSROOM_CATEGORY_THIN', 'warning', t('diag.classroom-category-thin', { list: thinCategories.join(', ') }), thinCategories.length));
    }
    if (foundation < rules.minFoundationLessons) {
      out.push(f('CLASSROOM_FOUNDATION_INCOMPLETE', 'error',
        t('diag.classroom-foundation-incomplete', { level: rules.foundationLevel, count: foundation, target: rules.minFoundationLessons }), foundation));
    }
    return out;
  }

  /**
   * m025-41 prosody self-test.
   *
   * OWNER reported the Indonesian tutor as flat and browser-like twice. Both times the
   * evidence was audio, which nothing in CI can hear. These three properties are the
   * measurable part of that complaint: Indonesian must get Indonesian clause punctuation,
   * the contour must actually move across an utterance, and the closing phrase must fall.
   */
  function prosody(module, targets) {
    var out = [];
    if (!module) return [f('PROSODY_UNAVAILABLE', 'error', t('diag.prosody-unavailable'))];
    var required = ['punctuate', 'phrases', 'pauseAfter', 'padSilence', 'contour', 'resample'];
    var missing = required.filter(function (name) { return typeof module[name] !== 'function'; });
    if (missing.length) {
      return [f('PROSODY_API_INCOMPLETE', 'error', t('diag.prosody-api-incomplete', { list: missing.join(', ') }), missing.length)];
    }
    var languages = (targets && targets.prosody && targets.prosody.languages) || [];
    if (languages.indexOf('id') !== -1) {
      var shaped = module.punctuate('Kita memakai pola ini karena hasilnya masih terasa sekarang', 'id-ID');
      if (!/,/.test(shaped)) {
        out.push(f('PROSODY_ID_NOT_SHAPED', 'error', t('diag.prosody-id-not-shaped')));
      }
    }
    var units = ['Mari kita lihat polanya,', 'lalu kita coba contohnya,', 'dan sekarang selesai.'];
    var shapes = units.map(function (u, i) { return module.contour(u, i, units.length); });
    var pitches = shapes.map(function (x) { return Number(x && x.pitch); });
    var spread = Math.max.apply(null, pitches) - Math.min.apply(null, pitches);
    var minSpread = (targets && targets.prosody && targets.prosody.minContourSpread) || 0;
    if (!(spread > minSpread)) {
      out.push(f('PROSODY_CONTOUR_FLAT', 'error', t('diag.prosody-contour-flat', { spread: spread })));
    }
    var closing = shapes[shapes.length - 1];
    if (!(closing.pitch < 1 && closing.speed <= 1)) {
      out.push(f('PROSODY_NO_FINAL_FALL', 'warning', t('diag.prosody-no-final-fall')));
    }
    return out;
  }

  // m025-124: pemeriksaan indonesianVoice DIHAPUS. Suara Indonesia dihapus dari produk di
  // m025-95, dan m025-100 menghapus mesin lokal yang menyediakannya. Yang tersisa hanyalah
  // pemeriksaan yang mencari paket 94 MB yang tidak akan pernah ada lagi - diarahkan ke
  // FiezelPuterVoice yang tidak punya field prepared maupun assetCount, sehingga ia SELALU
  // melapor "belum diunduh" dan menyalakan lencana merah di panel. Alarm yang tidak pernah
  // bisa dimatikan mengajari orang mengabaikan lencana, dan itu membuat alarm yang SUNGGUHAN
  // ikut terabaikan.

  /**
   * Module wiring. Two of the three fatal outages this app has shipped were a global that
   * silently failed to install, so absence is checked directly instead of being inferred
   * from a downstream symptom.
   */
  function runtime(probe) {
    var out = [];
    if (!probe) return [f('RUNTIME_UNAVAILABLE', 'error', t('diag.runtime-unavailable'))];
    var modules = probe.modules || {};
    var missing = Object.keys(modules).filter(function (name) { return !modules[name]; });
    if (missing.length) {
      out.push(f('RUNTIME_MODULE_MISSING', 'error', t('diag.runtime-module-missing', { list: missing.join(', ') }), missing.length));
    }
    // OWNER's standing rule: neural or nothing. A browser-TTS path in the live runtime is
    // a fatal product defect, not a graceful degradation.
    if (probe.browserTtsWired) {
      out.push(f('RUNTIME_BROWSER_TTS_WIRED', 'fatal', t('diag.runtime-browser-tts')));
    }
    if (probe.frozenRuntimeProxied) {
      out.push(f('RUNTIME_FROZEN_PROXY', 'fatal', t('diag.runtime-frozen-proxy')));
    }
    if (Array.isArray(probe.missingViews) && probe.missingViews.length) {
      out.push(f('RUNTIME_VIEW_MISSING', 'error', t('diag.runtime-view-missing', { list: probe.missingViews.join(', ') }), probe.missingViews.length));
    }
    return out;
  }

  /** Corrupt saved state is invisible until a screen renders blank; this names it. */
  function storage(probe, targets) {
    var out = [];
    if (!probe) return [f('STORAGE_UNAVAILABLE', 'warning', t('diag.storage-unavailable'))];
    if (!probe.available) return [f('STORAGE_BLOCKED', 'error', t('diag.storage-blocked'))];
    var corrupt = probe.corruptKeys || [];
    if (corrupt.length) {
      out.push(f('STORAGE_CORRUPT_JSON', 'error', t('diag.storage-corrupt-json', { list: corrupt.join(', ') }), corrupt.length));
    }
    var max = (targets && targets.storage && targets.storage.maxUsedPercent) || 0;
    if (max && Number(probe.usedPercent) > max) {
      out.push(f('STORAGE_NEAR_QUOTA', 'warning', t('diag.storage-near-quota', { used: probe.usedPercent, max: max }), Number(probe.usedPercent)));
    }
    return out;
  }

  /**
   * What the learner actually sees. A blank #app and a render that takes seconds are both
   * defects OWNER has hit and neither leaves a console error behind.
   */
  function ui(probe, targets) {
    var out = [];
    if (!probe) return [f('UI_UNAVAILABLE', 'warning', t('diag.ui-unavailable'))];
    if (!probe.mounted) return [f('UI_NOT_MOUNTED', 'error', t('diag.ui-not-mounted'))];
    if (probe.empty) out.push(f('UI_EMPTY_RENDER', 'error', t('diag.ui-empty-render', { view: String(probe.view || 'unknown') })));
    var expected = (targets && targets.ui && targets.ui.primaryDestinations) || 0;
    if (expected && Number(probe.destinations) !== expected) {
      out.push(f('UI_DESTINATION_COUNT', 'error', t('diag.ui-destination-count', { count: probe.destinations, target: expected }), Number(probe.destinations)));
    }
    var maxRender = (targets && targets.ui && targets.ui.maxRenderMs) || 0;
    if (maxRender && Number(probe.lastRenderMs) > maxRender) {
      out.push(f('UI_SLOW_RENDER', 'warning', t('diag.ui-slow-render', { ms: probe.lastRenderMs, max: maxRender }), Number(probe.lastRenderMs)));
    }
    return out;
  }

  function chat(probe) {
    var out = [];
    if (!probe) return [f('CHAT_UNAVAILABLE', 'warning', t('diag.chat-unavailable'))];
    if (probe.requiresApiKey) out.push(f('CHAT_REQUIRES_KEY', 'error', t('diag.chat-requires-key')));
    if (probe.threw) out.push(f('CHAT_INIT_THREW', 'error', t('diag.chat-init-threw', { error: String(probe.threw) })));
    return out;
  }

  function adaptive(snapshot, targets) {
    var out = [];
    if (!snapshot) return [f('ADAPTIVE_UNAVAILABLE', 'warning', t('diag.adaptive-unavailable'))];
    // state.level is a 1-based index into the CEFR ladder (LEVELS[state.level-1]), not a
    // CEFR string. An earlier revision compared it to 'A1'-'C2' and reported every
    // healthy install as failing; a scanner that cries wolf is worse than none.
    var levels = targets.validLevels;
    var raw = snapshot.level;
    if (raw !== '' && raw != null) {
      var asIndex = Number(raw);
      var known = (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= levels.length) ||
                  levels.indexOf(String(raw)) !== -1;
      if (!known) out.push(f('ADAPTIVE_INVALID_LEVEL', 'error', t('diag.adaptive-invalid-level', { level: String(raw) })));
    }
    if (snapshot.stuck === true) out.push(f('ADAPTIVE_STUCK', 'error', t('diag.adaptive-stuck')));
    return out;
  }

  return Object.freeze({
    vocabulary: vocabulary, reading: reading, grammar: grammar, leveltest: leveltest,
    bank: bank, neuralVoice: neuralVoice, classroom: classroom, chat: chat, adaptive: adaptive,
    prosody: prosody, runtime: runtime,
    storage: storage, ui: ui
  });
}));
