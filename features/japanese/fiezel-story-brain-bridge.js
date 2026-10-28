/**
 * FIEZEL · features/japanese/fiezel-story-brain-bridge.js
 *
 * JEMBATAN PEDAGOGIS: MEMBACA CERITA BERGAMBAR → BRAINCORE ENGINE BKT & MISCONCEPTION LEDGER
 *
 * Filosofi Desain (Anti-Dumbing Invariant & Zero-Loss Input):
 * -----------------------------------------------------------
 * Berbeda dari aplikasi konvensional yang hanya membuang kata ke dalam kartu hafalan terisolasi,
 * FIEZEL menghubungkan setiap interaksi membaca cerita (comprehensible input) langsung ke
 * jantung kognitif Braincore:
 *
 * 1. BKT Mastery Injection:
 *    Setiap kata kanji/frasa yang dibaca dan diketuk murid mengalirkan telemetri ke BKT
 *    (Bayesian Knowledge Tracing). Murid yang telah menguasai kosakata (P(Lt) >= 0.60)
 *    otomatis mendapat status "Telah Dikuasai" (Smart Prerequisite Bypass).
 *
 * 2. Strict Misconception Tracking:
 *    Evaluasi kuis akhir cerita menganalisis akar penyebab kesalahan (distractor misconception),
 *    bukan sekadar penanda benar/salah boolean statis.
 *
 * 3. Timezone-Hardened Activity:
 *    Mencatat zona waktu klien (Intl.DateTimeFormat) untuk melindungi runtunan (streak) belajar
 *    murid di berbagai belahan dunia dari anomali reset server.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FiezelStoryBrainBridge = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-story-brain-bridge-v1';
  var MASTERED_THRESHOLD = 0.60;

  function getTimezone() {
    try {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      }
    } catch (_) {}
    return 'UTC';
  }

  function getLocalDateStr(ts) {
    try {
      var d = new Date(ts || Date.now());
      var yr = d.getFullYear();
      var mo = String(d.getMonth() + 1).padStart(2, '0');
      var da = String(d.getDate()).padStart(2, '0');
      return yr + '-' + mo + '-' + da;
    } catch (_) {
      return '';
    }
  }

  function sanitizeId(id) {
    return String(id || '').trim().replace(/[^a-zA-Z0-9._:@#-]/g, '_');
  }

  /**
   * Catat interaksi kosa kata saat murid mengetuk kata dalam cerita.
   * Mengalirkan event ke model BKT / OLM untuk memutakhirkan P(Lt).
   */
  function recordWordInteraction(wordData, opts) {
    opts = opts || {};
    var root = typeof globalThis !== 'undefined' ? globalThis : {};
    var ja = String(wordData && (wordData.ja || wordData.kanji || wordData.word) || '').trim();
    var meaning = String(wordData && (wordData.id || wordData.meaning || wordData.en) || '').trim();
    var reading = String(wordData && (wordData.reading || wordData.kana || wordData.romaji) || '').trim();
    if (!ja) return null;

    var wordKey = sanitizeId('vocab_' + ja);
    var now = Date.now();
    var tz = getTimezone();
    var dateStr = getLocalDateStr(now);

    // Periksa status penguasaan awal via Braincore BKT bila ada
    var currentPLt = 0.10;
    var bktModule = root.FiezelMasteryBkt;
    if (bktModule && typeof bktModule.getConceptState === 'function') {
      try {
        var st = bktModule.getConceptState(wordKey);
        if (st && typeof st.pLt === 'number') currentPLt = st.pLt;
      } catch (_) {}
    }

    // Bila interaksi adalah 'look up' (membuka arti karena belum paham) vs 'self-test'
    var isLookup = opts.isLookup !== false;
    var updatedPLt = currentPLt;
    if (bktModule && typeof bktModule.updateMastery === 'function') {
      try {
        // Look up berarti murid butuh bantuan perancah (scaffolding) -> prior tetap dihitung objektif
        var result = bktModule.updateMastery(wordKey, !isLookup, {
          source: 'story_reading',
          timing: isLookup ? 'struggled' : 'normal'
        });
        if (result && typeof result.pLt === 'number') updatedPLt = result.pLt;
      } catch (_) {}
    }

    return {
      schema: SCHEMA,
      wordKey: wordKey,
      ja: ja,
      reading: reading,
      meaning: meaning,
      isMastered: updatedPLt >= MASTERED_THRESHOLD,
      pLt: Math.round(updatedPLt * 1000) / 1000,
      timezone: tz,
      activityDate: dateStr,
      timestamp: now
    };
  }

  /**
   * Evaluasi kuis akhir cerita secara ketat dan jujur.
   * Menolak manipulasi index fiktif (Anti-Ghost Answer).
   */
  function evaluateStoryQuiz(qData, userSelectedIndex, userSelectedText) {
    if (!qData || typeof qData !== 'object') return null;
    var targetIdx = Number(qData.answerIndex);
    var isCorrect = userSelectedIndex === targetIdx;
    var now = Date.now();
    var tz = getTimezone();
    var dateStr = getLocalDateStr(now);

    var options = Array.isArray(qData.options) ? qData.options : [];
    var targetOption = options[targetIdx] || null;
    var chosenOption = options[userSelectedIndex] || null;

    var targetText = targetOption && (targetOption.text || targetOption.textId || targetOption) || '';
    var actualUserText = userSelectedText || (chosenOption && (chosenOption.text || chosenOption.textId || chosenOption)) || '';

    // Tangkap miskonsepsi bila murid salah
    var misconceptionId = null;
    var failWhy = null;
    if (!isCorrect && chosenOption) {
      if (chosenOption.misconceptionId) misconceptionId = chosenOption.misconceptionId;
      if (chosenOption.failWhy) failWhy = chosenOption.failWhy;
    }
    if (!isCorrect && !misconceptionId && qData.misconceptionId) {
      misconceptionId = qData.misconceptionId;
    }
    if (!isCorrect && !failWhy && qData.failWhy) {
      failWhy = qData.failWhy;
    }

    var storyId = sanitizeId(qData.storyId || qData.id || 'story_quiz');

    var record = {
      schema: SCHEMA,
      storyId: storyId,
      question: String(qData.questionJapanese || qData.stem || ''),
      userSelectedIndex: userSelectedIndex,
      userSelectedText: String(actualUserText),
      targetIndex: targetIdx,
      targetText: String(targetText),
      ok: isCorrect,
      misconceptionId: misconceptionId,
      failWhy: failWhy,
      explain: String(qData.explain || ''),
      timezone: tz,
      activityDate: dateStr,
      timestamp: now
    };

    var root = typeof globalThis !== 'undefined' ? globalThis : {};

    // Alirkan ke Misconception Ledger global bila tersedia
    var ledger = root.FiezelMisconceptionLedger;
    if (!isCorrect && misconceptionId && ledger && typeof ledger.record === 'function') {
      try {
        ledger.record({
          misconception: misconceptionId,
          target: storyId,
          at: now
        });
      } catch (_) {}
    }

    // Alirkan ke BKT dan OLM bila jawaban benar
    if (isCorrect) {
      if (typeof root.updateMastery === 'function') {
        try {
          root.updateMastery('reading', 'story_' + storyId, true);
        } catch (_) {}
      }
      if (typeof root.bktRecord === 'function') {
        try {
          root.bktRecord({
            lessonSkill: 'reading_' + storyId,
            skill: 'reading_' + storyId,
            toString: function () { return 'reading_' + storyId; }
          }, true, 1.0);
        } catch (_) {}
      }
      var bktModule = root.FiezelMasteryBkt || root.FiezelMasteryBKT;
      if (bktModule && typeof bktModule.updateMastery === 'function') {
        try {
          bktModule.updateMastery('story_' + storyId, true, {
            source: 'story_quiz'
          });
        } catch (_) {}
      }
    }

    return record;
  }

  /**
   * Helper untuk merender teks Jepang dengan tag <ruby> dan atribut interaktif.
   */
  function renderRubySentence(sentenceTokens) {
    if (!Array.isArray(sentenceTokens)) return '';
    var html = '<span class="fz-story-sentence">';
    for (var i = 0; i < sentenceTokens.length; i++) {
      var tok = sentenceTokens[i];
      if (typeof tok === 'string') {
        html += '<span class="fz-story-plain">' + tok + '</span>';
      } else if (tok && tok.kanji && tok.furigana) {
        html += '<ruby class="fz-story-token" data-word="' + (tok.kanji || '') + '" data-reading="' + (tok.furigana || '') + '" data-meaning="' + (tok.meaning || tok.id || '') + '">'
              + tok.kanji
              + '<rp>(</rp><rt>' + tok.furigana + '</rt><rp>)</rp>'
              + '</ruby>';
      } else if (tok && tok.text) {
        html += '<span class="fz-story-plain">' + tok.text + '</span>';
      }
    }
    html += '</span>';
    return html;
  }

  return {
    SCHEMA: SCHEMA,
    MASTERED_THRESHOLD: MASTERED_THRESHOLD,
    getTimezone: getTimezone,
    getLocalDateStr: getLocalDateStr,
    recordWordInteraction: recordWordInteraction,
    evaluateStoryQuiz: evaluateStoryQuiz,
    renderRubySentence: renderRubySentence
  };
}));
