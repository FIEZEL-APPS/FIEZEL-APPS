/**
 * FIEZEL · features/pte/fiezel-pte-engine.js
 * Master Deterministic Scoring Engine for PTE Academic Preparation ("The Big 4").
 * Implements Pearson algorithmic models: Levenshtein token alignment, Word Error Rate (WER),
 * speech cadence metrics, keyword extraction, and Pearson 10–90 concordance mapping.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FiezelPteEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Normalize text into comparable lowercase tokens without punctuation.
   * @param {string} text
   * @returns {string[]}
   */
  function tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[^a-z0-9'\s-]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  /**
   * Character-level Levenshtein edit distance.
   */
  function charLevenshtein(a, b) {
    var s1 = String(a || '');
    var s2 = String(b || '');
    var m = s1.length;
    var n = s2.length;
    if (m === 0) return n;
    if (n === 0) return m;

    var dp = [];
    for (var i = 0; i <= m; i++) {
      dp[i] = [i];
    }
    for (var j = 0; j <= n; j++) {
      dp[0][j] = j;
    }
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        var cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,       // deletion
          dp[i][j - 1] + 1,       // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return dp[m][n];
  }

  /**
   * Token-level sequence Levenshtein matrix returning operations (S, D, I).
   * @param {string[]} refTokens
   * @param {string[]} hypTokens
   * @returns {{ distance: number, substitutions: number, deletions: number, insertions: number, wer: number, matchRatio: number }}
   */
  function tokenAlignment(refTokens, hypTokens) {
    var ref = Array.isArray(refTokens) ? refTokens : [];
    var hyp = Array.isArray(hypTokens) ? hypTokens : [];
    var n = ref.length;
    var m = hyp.length;

    if (n === 0) {
      return {
        distance: m,
        substitutions: 0,
        deletions: 0,
        insertions: m,
        wer: m > 0 ? 1 : 0,
        matchRatio: m === 0 ? 1 : 0
      };
    }
    if (m === 0) {
      return {
        distance: n,
        substitutions: 0,
        deletions: n,
        insertions: 0,
        wer: 1,
        matchRatio: 0
      };
    }

    var dp = [];
    for (var i = 0; i <= n; i++) {
      dp[i] = [];
      for (var j = 0; j <= m; j++) {
        dp[i][j] = 0;
      }
      dp[i][0] = i;
    }
    for (var j = 0; j <= m; j++) {
      dp[0][j] = j;
    }

    for (var i = 1; i <= n; i++) {
      for (var j = 1; j <= m; j++) {
        var cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,       // deletion
          dp[i][j - 1] + 1,       // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    // Backtrack to count exact S, D, I
    var i = n;
    var j = m;
    var subs = 0;
    var dels = 0;
    var ins = 0;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0) {
        var cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
        if (dp[i][j] === dp[i - 1][j - 1] + cost) {
          if (cost > 0) subs++;
          i--;
          j--;
          continue;
        }
      }
      if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        dels++;
        i--;
        continue;
      }
      if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
        ins++;
        j--;
        continue;
      }
      i--;
      j--;
    }

    var totalDist = dp[n][m];
    var wer = Math.min(1.0, (subs + dels + ins) / n);
    var matchedTokens = Math.max(0, n - (subs + dels));
    var matchRatio = n > 0 ? matchedTokens / n : 0;

    return {
      distance: totalDist,
      substitutions: subs,
      deletions: dels,
      insertions: ins,
      wer: wer,
      matchRatio: Math.max(0, Math.min(1.0, matchRatio))
    };
  }

  /**
   * Oral Fluency Heuristic (Pearson 0–5 scale).
   * @param {number} durationSec - Actual duration of student speech
   * @param {number} wordCount - Number of recognized speech tokens
   * @param {number} pausesCount - Number of detected pauses > 2.0s
   * @returns {{ score: number, wpm: number, label: string }}
   */
  function evaluateOralFluency(durationSec, wordCount, pausesCount) {
    var dur = Math.max(1, Number(durationSec) || 0);
    var count = Math.max(0, Number(wordCount) || 0);
    var pauses = Math.max(0, Number(pausesCount) || 0);
    var wpm = Math.round((count / dur) * 60);

    // Target Pearson Cadence: 110 - 150 WPM
    var score = 5;
    if (wpm >= 115 && wpm <= 155 && pauses === 0) {
      score = 5; // Native-like / Smooth
    } else if ((wpm >= 95 && wpm <= 170) && pauses <= 1) {
      score = 4; // Advanced fluency
    } else if ((wpm >= 80 && wpm <= 185) && pauses <= 2) {
      score = 3; // Intermediate / Target 42 benchmark
    } else if (wpm >= 60 && pauses <= 3) {
      score = 2; // Limited fluency / hesitant
    } else if (count > 0) {
      score = 1; // Disfluent
    } else {
      score = 0;
    }

    var label = 'Native-like';
    if (score === 4) label = 'Advanced';
    if (score === 3) label = 'Competent (Target 42+)';
    if (score === 2) label = 'Hesitant';
    if (score === 1) label = 'Disfluent';
    if (score === 0) label = 'No speech detected';

    return { score: score, wpm: wpm, label: label };
  }

  /**
   * Pronunciation Heuristic (Pearson 0–5 scale).
   * Derived from average confidence of speech recognition tokens (0.0 to 1.0).
   * @param {number} confidenceAvg
   * @returns {{ score: number, confidence: number, label: string }}
   */
  function evaluatePronunciation(confidenceAvg) {
    var conf = Math.max(0, Math.min(1.0, Number(confidenceAvg) || 0.85));
    var score = 5;
    if (conf >= 0.92) {
      score = 5;
    } else if (conf >= 0.82) {
      score = 4;
    } else if (conf >= 0.70) {
      score = 3; // Target 42 benchmark
    } else if (conf >= 0.55) {
      score = 2;
    } else if (conf > 0.1) {
      score = 1;
    } else {
      score = 0;
    }

    var label = 'Native Clarity';
    if (score === 4) label = 'Clear & Intelligible';
    if (score === 3) label = 'Understandable (Target 42+)';
    if (score === 2) label = 'Intrusive Accent';
    if (score === 1) label = 'Hard to Understand';
    if (score === 0) label = 'Unintelligible';

    return { score: score, confidence: conf, label: label };
  }

  /**
   * 1. READ ALOUD (RA) Evaluation.
   * Cross-Skill: Speaking + Reading.
   * @param {string} referenceText
   * @param {string} studentTranscript
   * @param {object} [metrics] - { durationSec, confidenceAvg, pausesCount }
   */
  function evaluateReadAloud(referenceText, studentTranscript, metrics) {
    var m = metrics || {};
    var refTokens = tokenize(referenceText);
    var hypTokens = tokenize(studentTranscript);
    var alignment = tokenAlignment(refTokens, hypTokens);

    // Content: 0-3 scale based on matchRatio
    var contentScore = 0;
    if (alignment.matchRatio >= 0.90) {
      contentScore = 3;
    } else if (alignment.matchRatio >= 0.70) {
      contentScore = 2;
    } else if (alignment.matchRatio >= 0.50) {
      contentScore = 1;
    } else {
      contentScore = 0;
    }

    var fluency = evaluateOralFluency(m.durationSec || (hypTokens.length * 0.45), hypTokens.length, m.pausesCount || 0);
    var pronunciation = evaluatePronunciation(m.confidenceAvg != null ? m.confidenceAvg : 0.85);

    // Pearson item scale translation (0 to 90)
    // Content contributes equally to Reading and Speaking in Pearson model
    var totalRaw = contentScore + fluency.score + pronunciation.score; // 0 to 13
    var pearsonEquivalent = Math.round(10 + (totalRaw / 13) * 80);

    return {
      task: 'Read Aloud',
      content: {
        score: contentScore,
        max: 3,
        matchRatio: alignment.matchRatio,
        wer: alignment.wer,
        substitutions: alignment.substitutions,
        deletions: alignment.deletions,
        insertions: alignment.insertions
      },
      fluency: fluency,
      pronunciation: pronunciation,
      totalRaw: totalRaw,
      maxRaw: 13,
      pearsonScore: Math.min(90, Math.max(10, pearsonEquivalent)),
      crossCredits: {
        speaking: Math.round(pearsonEquivalent * 0.6),
        reading: Math.round(pearsonEquivalent * 0.4)
      },
      tokens: {
        reference: refTokens,
        student: hypTokens
      }
    };
  }

  /**
   * 2. REPEAT SENTENCE (RS) Evaluation.
   * Cross-Skill: Speaking + Listening.
   * @param {string} referenceSentence
   * @param {string} studentTranscript
   * @param {object} [metrics]
   */
  function evaluateRepeatSentence(referenceSentence, studentTranscript, metrics) {
    var m = metrics || {};
    var refTokens = tokenize(referenceSentence);
    var hypTokens = tokenize(studentTranscript);
    var alignment = tokenAlignment(refTokens, hypTokens);

    // Pearson Content Scoring Model for RS:
    // 3: 100% of words repeated in exact sequence (or matchRatio >= 0.90)
    // 2: >= 50% of words repeated in sequence
    // 1: < 50% but at least 1-2 words present
    // 0: 0 words or completely mismatched
    var contentScore = 0;
    if (alignment.matchRatio >= 0.90) {
      contentScore = 3;
    } else if (alignment.matchRatio >= 0.50) {
      contentScore = 2;
    } else if (hypTokens.length > 0 && alignment.matchRatio > 0) {
      contentScore = 1;
    } else {
      contentScore = 0;
    }

    var fluency = evaluateOralFluency(m.durationSec || (hypTokens.length * 0.4), hypTokens.length, m.pausesCount || 0);
    var pronunciation = evaluatePronunciation(m.confidenceAvg != null ? m.confidenceAvg : 0.85);

    var totalRaw = contentScore + fluency.score + pronunciation.score; // 0 to 13
    var pearsonEquivalent = Math.round(10 + (totalRaw / 13) * 80);

    return {
      task: 'Repeat Sentence',
      content: {
        score: contentScore,
        max: 3,
        matchRatio: alignment.matchRatio,
        wer: alignment.wer
      },
      fluency: fluency,
      pronunciation: pronunciation,
      totalRaw: totalRaw,
      maxRaw: 13,
      pearsonScore: Math.min(90, Math.max(10, pearsonEquivalent)),
      crossCredits: {
        speaking: Math.round(pearsonEquivalent * 0.5),
        listening: Math.round(pearsonEquivalent * 0.5)
      },
      tokens: {
        reference: refTokens,
        student: hypTokens
      }
    };
  }

  /**
   * 3. DESCRIBE IMAGE (DI) Evaluation.
   * Focus: Speaking (Fluency, Keywords, Minimum Speech Duration, Template Flow).
   * @param {object} chartData - { id, keywords, categories, highPoint, lowPoint }
   * @param {string} studentTranscript
   * @param {object} [metrics] - { durationSec, confidenceAvg, pausesCount }
   */
  function evaluateDescribeImage(chartData, studentTranscript, metrics) {
    var data = chartData || {};
    var m = metrics || {};
    var hypTokens = tokenize(studentTranscript);
    var rawText = String(studentTranscript || '').toLowerCase();
    var duration = Math.max(1, Number(m.durationSec) || (hypTokens.length * 0.45));

    // Keyword detection
    var keywords = Array.isArray(data.keywords) ? data.keywords : [];
    var matchedKeywords = [];
    keywords.forEach(function (kw) {
      var kLower = String(kw).toLowerCase().trim();
      if (kLower && rawText.indexOf(kLower) !== -1) {
        matchedKeywords.push(kw);
      }
    });

    var keywordRatio = keywords.length > 0 ? (matchedKeywords.length / keywords.length) : 1;

    // Template markers detection (Universal Template)
    var templateMarkers = [
      'given image',
      'according to',
      'we can see',
      'maximum',
      'minimum',
      'in conclusion'
    ];
    var detectedMarkers = templateMarkers.filter(function (marker) {
      return rawText.indexOf(marker) !== -1;
    });

    // Content Score (0 to 5 for DI)
    // Pearson evaluates topic coverage, key trends, and comparison points
    var contentScore = 0;
    if (matchedKeywords.length >= 4 || (detectedMarkers.length >= 4 && matchedKeywords.length >= 2)) {
      contentScore = 5;
    } else if (matchedKeywords.length >= 3 || (detectedMarkers.length >= 3 && matchedKeywords.length >= 1)) {
      contentScore = 4;
    } else if (matchedKeywords.length >= 2 || detectedMarkers.length >= 2) {
      contentScore = 3; // Target 42 benchmark
    } else if (matchedKeywords.length >= 1 || hypTokens.length >= 15) {
      contentScore = 2;
    } else if (hypTokens.length > 0) {
      contentScore = 1;
    } else {
      contentScore = 0;
    }

    // Duration penalty: Pearson penalizes stopping under 25 seconds
    if (duration < 20 && contentScore > 2) {
      contentScore = 2;
    } else if (duration < 15 && contentScore > 1) {
      contentScore = 1;
    }

    var fluency = evaluateOralFluency(duration, hypTokens.length, m.pausesCount || 0);
    var pronunciation = evaluatePronunciation(m.confidenceAvg != null ? m.confidenceAvg : 0.85);

    var totalRaw = contentScore + fluency.score + pronunciation.score; // 0 to 15
    var pearsonEquivalent = Math.round(10 + (totalRaw / 15) * 80);

    return {
      task: 'Describe Image',
      content: {
        score: contentScore,
        max: 5,
        matchedKeywords: matchedKeywords,
        totalKeywords: keywords.length,
        keywordRatio: keywordRatio,
        detectedTemplateMarkers: detectedMarkers
      },
      durationSec: duration,
      durationSufficient: duration >= 25,
      fluency: fluency,
      pronunciation: pronunciation,
      totalRaw: totalRaw,
      maxRaw: 15,
      pearsonScore: Math.min(90, Math.max(10, pearsonEquivalent)),
      crossCredits: {
        speaking: Math.min(90, Math.max(10, pearsonEquivalent))
      }
    };
  }

  /**
   * 4. WRITE FROM DICTATION (WFD) Evaluation.
   * Cross-Skill: Listening + Writing (The Kingmaker).
   * 1 point per correct word spelled and placed.
   * @param {string} targetSentence
   * @param {string} studentAnswer
   * @param {Array<{ word: string, commonErrors: string[], rule: string }>} [spellingChallenges]
   */
  function evaluateWriteFromDictation(targetSentence, studentAnswer, spellingChallenges) {
    var refTokens = tokenize(targetSentence);
    var hypTokens = tokenize(studentAnswer);
    var challenges = Array.isArray(spellingChallenges) ? spellingChallenges : [];

    // Exact word matching: Pearson rewards 1 point for every matching word in the sentence
    var matchedWords = [];
    var missedWords = [];
    var refCopy = refTokens.slice();

    hypTokens.forEach(function (token) {
      var foundIdx = refCopy.indexOf(token);
      if (foundIdx !== -1) {
        matchedWords.push(token);
        refCopy.splice(foundIdx, 1);
      }
    });

    missedWords = refCopy;
    var correctCount = matchedWords.length;
    var totalCount = refTokens.length;
    var matchRatio = totalCount > 0 ? (correctCount / totalCount) : 0;

    // Detect spelling misconceptions
    var detectedMisconceptions = [];
    var studentRaw = tokenize(studentAnswer);
    challenges.forEach(function (c) {
      var targetWord = String(c.word || '').toLowerCase();
      var errList = Array.isArray(c.commonErrors) ? c.commonErrors : [];
      studentRaw.forEach(function (w) {
        if (errList.indexOf(w) !== -1 || (w !== targetWord && charLevenshtein(w, targetWord) <= 2 && targetWord.length >= 6)) {
          detectedMisconceptions.push({
            typedWord: w,
            targetWord: targetWord,
            rule: c.rule || ('Spelling rule for ' + targetWord)
          });
        }
      });
    });

    // Score translation (Pearson 10-90)
    var pearsonEquivalent = Math.round(10 + matchRatio * 80);

    return {
      task: 'Write from Dictation',
      content: {
        score: correctCount,
        max: totalCount,
        matchRatio: matchRatio,
        matchedWords: matchedWords,
        missedWords: missedWords
      },
      spellingMisconceptions: detectedMisconceptions,
      pearsonScore: Math.min(90, Math.max(10, pearsonEquivalent)),
      crossCredits: {
        listening: Math.round(pearsonEquivalent * 0.5),
        writing: Math.round(pearsonEquivalent * 0.5)
      },
      isTarget42Qualified: pearsonEquivalent >= 42
    };
  }

  /**
   * Composite Big 4 Pearson Score Calculator.
   * Weights:
   * Read Aloud: 25%
   * Repeat Sentence: 35%
   * Describe Image: 15%
   * Write from Dictation: 25%
   * @param {{ ra?: number, rs?: number, di?: number, wfd?: number }} scores
   * @returns {{ overall: number, speaking: number, listening: number, reading: number, writing: number, target42Passed: boolean, bandLabel: string }}
   */
  function calculateCompositePearson(scores) {
    var s = scores || {};
    var ra = Number(s.ra != null ? s.ra : 10);
    var rs = Number(s.rs != null ? s.rs : 10);
    var di = Number(s.di != null ? s.di : 10);
    var wfd = Number(s.wfd != null ? s.wfd : 10);

    // Cross-skill calculations
    var speaking = Math.round((ra * 0.40) + (rs * 0.35) + (di * 0.25));
    var listening = Math.round((rs * 0.55) + (wfd * 0.45));
    var reading = Math.round((ra * 0.70) + (wfd * 0.30));
    var writing = Math.round(wfd * 0.90 + (ra * 0.10));

    var overall = Math.round((ra * 0.25) + (rs * 0.35) + (di * 0.15) + (wfd * 0.25));
    overall = Math.min(90, Math.max(10, overall));

    var passed = overall >= 42;
    var label = 'Vocational & Higher Ed Entry (PTE 42+)';
    if (overall >= 65) {
      label = 'Proficient English / Direct University Admission (PTE 65+)';
    } else if (overall >= 50) {
      label = 'Competent English / Diploma Admission (PTE 50+)';
    } else if (overall >= 42) {
      label = 'Australian Visa Subclass 500 Entry Qualified (PTE 42+)';
    } else {
      label = 'Developing Foundation (PTE < 42)';
    }

    return {
      overall: overall,
      speaking: Math.min(90, Math.max(10, speaking)),
      listening: Math.min(90, Math.max(10, listening)),
      reading: Math.min(90, Math.max(10, reading)),
      writing: Math.min(90, Math.max(10, writing)),
      target42Passed: passed,
      distanceToTarget42: Math.max(0, 42 - overall),
      bandLabel: label
    };
  }

  return {
    tokenize: tokenize,
    charLevenshtein: charLevenshtein,
    tokenAlignment: tokenAlignment,
    evaluateOralFluency: evaluateOralFluency,
    evaluatePronunciation: evaluatePronunciation,
    evaluateReadAloud: evaluateReadAloud,
    evaluateRepeatSentence: evaluateRepeatSentence,
    evaluateDescribeImage: evaluateDescribeImage,
    evaluateWriteFromDictation: evaluateWriteFromDictation,
    calculateCompositePearson: calculateCompositePearson
  };
});
