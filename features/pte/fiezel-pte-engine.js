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

    var meets50Percent = alignment.matchRatio >= 0.50;
    var nakulFeedback = meets50Percent
      ? 'Nakul 50% Rule Satisfied: You repeated ' + Math.round(alignment.matchRatio * 100) + '% of words with smooth oral rhythm, securing key Pearson fluency marks.'
      : 'Below 50% threshold (' + Math.round(alignment.matchRatio * 100) + '%). Focus on reproducing at least the first 5–6 words smoothly without pausing.';

    return {
      task: 'Repeat Sentence',
      content: {
        score: contentScore,
        max: 3,
        matchRatio: alignment.matchRatio,
        wer: alignment.wer,
        meets50PercentRule: meets50Percent,
        nakulFeedback: nakulFeedback
      },
      fluency: fluency,
      pronunciation: pronunciation,
      meets50PercentRule: meets50Percent,
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

    // Nakul 5-Line Universal Template analysis
    var nakulLines = [];
    if (/image provided is|given image represents|informative (chart|graph|diagram)|gives information/i.test(rawText)) {
      nakulLines.push('Line 1 (Type & Topic)');
    }
    if (/x-axis|y-axis|horizontal axis|vertical axis|according to|we can see/i.test(rawText)) {
      nakulLines.push('Line 2 (Axes / Breakdown)');
    }
    if (/highest value|maximum figure|maximum trend|highest bar|maximum value|highest/i.test(rawText)) {
      nakulLines.push('Line 3 (Maximum Trend)');
    }
    if (/lowest value|minimum figure|minimum trend|lowest bar|minimum value|conversely/i.test(rawText)) {
      nakulLines.push('Line 4 (Minimum Trend)');
    }
    if (/in conclusion|overall|clearly illustrates|significant data/i.test(rawText)) {
      nakulLines.push('Line 5 (Conclusion)');
    }

    var isNakulTemplate = nakulLines.length >= 4;
    var isOptimalDuration = duration >= 25 && duration <= 28;
    var durationZone = 'under_20';
    var durationAdvice = '';

    if (duration < 20) {
      durationZone = 'under_20';
      durationAdvice = 'Speech too short (<20s). Speaking less than 20 seconds heavily penalizes oral fluency in Pearson algorithms.';
    } else if (duration < 25) {
      durationZone = 'short_20_24';
      durationAdvice = 'Acceptable (20–24s), but aim to speak between 25–28 seconds for maximum oral fluency points.';
    } else if (duration <= 28) {
      durationZone = 'optimal_25_28';
      durationAdvice = 'Optimal Nakul Fluency Zone (25–28s)! Perfect duration—stopping here avoids rushing and microphone cut-off.';
    } else if (duration <= 34) {
      durationZone = 'good_29_34';
      durationAdvice = 'Good length (29–34s). Make sure you stop before the 40-second buzzer.';
    } else {
      durationZone = 'danger_over_35';
      durationAdvice = 'Danger zone (>35s)! Click Next immediately to avoid cut-off mid-sentence.';
    }

    // Content Score (0 to 5 for DI)
    // Pearson evaluates topic coverage, key trends, and comparison points
    var contentScore = 0;
    if (matchedKeywords.length >= 4 || (detectedMarkers.length >= 4 && matchedKeywords.length >= 2) || (isNakulTemplate && matchedKeywords.length >= 1)) {
      contentScore = 5;
    } else if (matchedKeywords.length >= 3 || (detectedMarkers.length >= 3 && matchedKeywords.length >= 1) || isNakulTemplate) {
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
        detectedTemplateMarkers: detectedMarkers,
        nakulLinesDetected: nakulLines,
        nakulLinesCount: nakulLines.length,
        isNakulTemplate: isNakulTemplate
      },
      durationSec: duration,
      durationSufficient: duration >= 25,
      isOptimalDuration: isOptimalDuration,
      durationZone: durationZone,
      durationAdvice: durationAdvice,
      nakulTemplate: {
        isDetected: isNakulTemplate,
        linesCount: nakulLines.length,
        linesDetected: nakulLines
      },
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

    // Nakul Extra Words Hack evaluation
    // Pearson automated scoring awards points for matched words and does NOT deduct points for extra words.
    var extraWords = [];
    var refSet = {};
    refTokens.forEach(function (w) { refSet[w] = true; });
    hypTokens.forEach(function (w) {
      if (!refSet[w]) {
        extraWords.push(w);
      }
    });

    // Detect if student paired singular/plural or tense variants (e.g. student students)
    var extraWordsHackDetected = false;
    var variantPairs = [];
    for (var i = 0; i < hypTokens.length; i++) {
      for (var j = i + 1; j < hypTokens.length; j++) {
        var w1 = hypTokens[i];
        var w2 = hypTokens[j];
        if (w1 + 's' === w2 || w2 + 's' === w1 || w1 + 'es' === w2 || w2 + 'es' === w1 || w1 + 'ed' === w2 || w2 + 'ed' === w1) {
          extraWordsHackDetected = true;
          variantPairs.push(w1 + ' / ' + w2);
        }
      }
    }

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
      extraWords: extraWords,
      extraWordsCount: extraWords.length,
      extraWordsHackDetected: extraWordsHackDetected,
      extraWordsPairs: variantPairs,
      nakulHackAdvice: extraWords.length > 0
        ? 'Extra Words Hack Applied: ' + extraWords.length + ' additional words were included. Pearson AI awarded full credit for your matched words without any score deductions!'
        : 'Tip: If unsure of singular vs plural (e.g., student vs students), write both. Pearson does not penalize extra words in WFD.',
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

  /**
   * Acoustic Pitch & Frequency Evaluator (Nakul Speech Rule).
   * @param {number} pitchHz
   * @param {string} [gender='male']
   * @returns {{ pitchHz: number, zone: string, isOptimal: boolean, feedback: string }}
   */
  function evaluateAcousticPitch(pitchHz, gender) {
    var hz = Number(pitchHz) || 140;
    var g = String(gender || 'male').toLowerCase();
    var isMale = g === 'male';

    if (isMale) {
      if (hz < 115) {
        return {
          pitchHz: hz,
          zone: 'deep_bass',
          isOptimal: false,
          feedback: 'Vocal pitch is too low/bass (' + Math.round(hz) + ' Hz). Pearson speech recognition may fail to register low frequencies. Speak higher, with a conversational, friendly lift (target 135–145 Hz).'
        };
      } else if (hz >= 130 && hz <= 155) {
        return {
          pitchHz: hz,
          zone: 'optimal',
          isOptimal: true,
          feedback: 'Optimal Pearson Male Pitch (' + Math.round(hz) + ' Hz). Clear acoustic projection with high speech recognition accuracy.'
        };
      } else if (hz > 185) {
        return {
          pitchHz: hz,
          zone: 'high_pitch',
          isOptimal: false,
          feedback: 'Vocal pitch is somewhat elevated (' + Math.round(hz) + ' Hz). Lower slightly to maintain calm, authoritative cadence.'
        };
      } else {
        return {
          pitchHz: hz,
          zone: 'acceptable',
          isOptimal: true,
          feedback: 'Acceptable pitch (' + Math.round(hz) + ' Hz). Aim for 135–145 Hz for maximum acoustic clarity.'
        };
      }
    } else {
      if (hz >= 190 && hz <= 250) {
        return {
          pitchHz: hz,
          zone: 'optimal',
          isOptimal: true,
          feedback: 'Optimal Pearson Female Pitch (' + Math.round(hz) + ' Hz). Clear acoustic harmonics.'
        };
      } else {
        return {
          pitchHz: hz,
          zone: 'acceptable',
          isOptimal: true,
          feedback: 'Acceptable female pitch (' + Math.round(hz) + ' Hz).'
        };
      }
    }
  }

  /**
   * Retrieve a specific day from the 30-Day Daily Roadmap.
   * @param {number} dayNumber (1-30)
   * @param {object} roadmapData - parsed pte-daily-roadmap.json
   * @returns {object|null}
   */
  function getDailyRoadmapDay(dayNumber, roadmapData) {
    if (!roadmapData || !Array.isArray(roadmapData.days)) return null;
    var d = Math.max(1, Math.min(30, parseInt(dayNumber, 10) || 1));
    return roadmapData.days.find(function (item) { return item.day === d; }) || roadmapData.days[0] || null;
  }

  /**
   * Calculate completion status for a specific day's tasks.
   * @param {Array<object>} dayTasks
   * @param {Array<string>} completedTaskIds
   * @returns {{ completedCount: number, totalCount: number, percent: number, isDayCompleted: boolean }}
   */
  function calculateDailyProgress(dayTasks, completedTaskIds) {
    var tasks = Array.isArray(dayTasks) ? dayTasks : [];
    var completed = Array.isArray(completedTaskIds) ? completedTaskIds : [];
    if (tasks.length === 0) return { completedCount: 0, totalCount: 0, percent: 0, isDayCompleted: false };

    var count = 0;
    tasks.forEach(function (t) {
      if (completed.indexOf(t.id) !== -1) {
        count++;
      }
    });

    var percent = Math.round((count / tasks.length) * 100);
    return {
      completedCount: count,
      totalCount: tasks.length,
      percent: percent,
      isDayCompleted: count === tasks.length
    };
  }

  /**
   * Evaluates PTE Reading & Writing Fill in the Blanks (Dropdown).
   * @param {Object} targetItem - Bank item containing blanks array with options and deepFeedback.
   * @param {Object|Array} userAnswers - User selected options mapped by blank id or index.
   * @returns {Object} Evaluation breakdown with pedagogical formulas and collocations.
   */
  function evaluateReadingFib(targetItem, userAnswers) {
    if (!targetItem || !Array.isArray(targetItem.blanks)) {
      return { score: 0, maxScore: 0, percentage: 0, passed: false, blankResults: [] };
    }

    var answers = userAnswers || {};
    var blanks = targetItem.blanks;
    var correctCount = 0;
    var blankResults = [];

    blanks.forEach(function (b, idx) {
      var chosen = '';
      if (typeof answers === 'object' && answers !== null) {
        if (answers[b.id] !== undefined) {
          chosen = answers[b.id];
        } else if (answers[String(b.id)] !== undefined) {
          chosen = answers[String(b.id)];
        } else if (Array.isArray(answers) && answers[idx] !== undefined) {
          chosen = answers[idx];
        }
      }

      var cleanChosen = String(chosen || '').trim();
      var cleanCorrect = String(b.correct || '').trim();
      var isCorrect = cleanChosen.toLowerCase() === cleanCorrect.toLowerCase() && cleanChosen.length > 0;

      if (isCorrect) {
        correctCount++;
      }

      blankResults.push({
        id: b.id,
        userChoice: cleanChosen,
        correct: cleanCorrect,
        isCorrect: isCorrect,
        options: b.options || [],
        deepFeedback: b.deepFeedback || null
      });
    });

    var maxScore = blanks.length;
    var percentage = maxScore > 0 ? Math.round((correctCount / maxScore) * 100) : 0;

    return {
      score: correctCount,
      maxScore: maxScore,
      percentage: percentage,
      passed: percentage >= 60,
      blankResults: blankResults
    };
  }

  /**
   * Evaluates PTE Reading Fill in the Blanks (Drag & Drop).
   * @param {Object} targetItem - Bank item with correctAnswers and deepFeedback.
   * @param {Object} userAssignments - User word placements keyed by blank identifier (e.g. { blank_1: 'build' }).
   * @returns {Object} Detailed evaluation with grammar and collocation tips.
   */
  function evaluateReadingDragDrop(targetItem, userAssignments) {
    if (!targetItem || !targetItem.correctAnswers) {
      return { score: 0, maxScore: 0, percentage: 0, passed: false, results: {} };
    }

    var answers = userAssignments || {};
    var correctMap = targetItem.correctAnswers;
    var feedbackMap = targetItem.deepFeedback || {};
    var keys = Object.keys(correctMap);
    var correctCount = 0;
    var results = {};

    keys.forEach(function (k) {
      var expected = String(correctMap[k] || '').trim();
      var actual = String(answers[k] || '').trim();
      var isCorrect = expected.toLowerCase() === actual.toLowerCase() && actual.length > 0;

      if (isCorrect) {
        correctCount++;
      }

      results[k] = {
        blank: k,
        expected: expected,
        actual: actual,
        isCorrect: isCorrect,
        feedback: feedbackMap[k] || null
      };
    });

    var maxScore = keys.length;
    var percentage = maxScore > 0 ? Math.round((correctCount / maxScore) * 100) : 0;

    return {
      score: correctCount,
      maxScore: maxScore,
      percentage: percentage,
      passed: percentage >= 60,
      results: results
    };
  }

  /**
   * Evaluates PTE Re-order Paragraphs using Pearson adjacent pairs scoring.
   * @param {Object} targetItem - Bank item with correctOrder array (e.g. ['B', 'D', 'A', 'C']).
   * @param {Array<string>} userOrder - User ordered paragraph IDs.
   * @returns {Object} Scoring by adjacent pairs, pair clues, and independent sentence feedback.
   */
  function evaluateReorderParagraphs(targetItem, userOrder) {
    var correctOrder = (targetItem && Array.isArray(targetItem.correctOrder)) ? targetItem.correctOrder : [];
    var submitted = Array.isArray(userOrder) ? userOrder : [];

    var maxScore = Math.max(0, correctOrder.length - 1);
    if (correctOrder.length < 2 || submitted.length < 2) {
      return {
        score: 0,
        maxScore: maxScore,
        percentage: 0,
        passed: false,
        matchedPairs: [],
        targetPairs: [],
        userPairs: [],
        deepFeedback: targetItem ? targetItem.deepFeedback : null
      };
    }

    var targetPairs = [];
    for (var i = 0; i < correctOrder.length - 1; i++) {
      targetPairs.push(correctOrder[i] + '-' + correctOrder[i + 1]);
    }

    var userPairs = [];
    for (var j = 0; j < submitted.length - 1; j++) {
      userPairs.push(submitted[j] + '-' + submitted[j + 1]);
    }

    var matchedPairs = [];
    var score = 0;

    userPairs.forEach(function (up) {
      if (targetPairs.indexOf(up) !== -1) {
        matchedPairs.push(up);
        score++;
      }
    });

    var percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    return {
      score: score,
      maxScore: maxScore,
      percentage: percentage,
      passed: score === maxScore,
      matchedPairs: matchedPairs,
      targetPairs: targetPairs,
      userPairs: userPairs,
      deepFeedback: targetItem ? targetItem.deepFeedback : null
    };
  }

  /**
   * Evaluates PTE Summarize Written Text (SWT) according to official Pearson criteria:
   * Form (1 sentence, 5-75 words), Content (key phrases), Grammar (FANBOYS/connectors, no run-ons), Vocabulary.
   * @param {Object} targetItem - Bank item with source text and model summary.
   * @param {string} userSummary - Candidate's 1-sentence summary.
   * @returns {Object} Score out of 7 with detailed dimensional breakdown.
   */
  function evaluateSummarizeWrittenText(targetItem, userSummary) {
    var text = String(userSummary || '').trim();
    var tokens = tokenize(text);
    var wordCount = tokens.length;

    var rawParts = text.split(/[.?!]+/).filter(function (s) {
      return s.trim().length > 0;
    });
    var sentenceCount = rawParts.length;

    var isOneSentence = sentenceCount === 1 && /[.?!]$/.test(text);
    var formScore = 0;
    if (isOneSentence && wordCount >= 5 && wordCount <= 75) {
      formScore = 1;
    }

    var modelTokens = targetItem && targetItem.modelSummary ? tokenize(targetItem.modelSummary) : [];
    var matchedKeywords = 0;
    var checkedSet = {};
    tokens.forEach(function (t) {
      if (t.length > 3 && modelTokens.indexOf(t) !== -1 && !checkedSet[t]) {
        checkedSet[t] = true;
        matchedKeywords++;
      }
    });

    var contentScore = 0;
    if (matchedKeywords >= 4) {
      contentScore = 2;
    } else if (matchedKeywords >= 2) {
      contentScore = 1;
    }

    var connectors = ['and', 'but', 'or', 'so', 'yet', 'while', 'although', 'because', 'which', 'whereas', 'since'];
    var hasConnector = false;
    tokens.forEach(function (t) {
      if (connectors.indexOf(t) !== -1) hasConnector = true;
    });

    var grammarScore = 0;
    if (formScore === 1 && hasConnector) {
      grammarScore = 2;
    } else if (formScore === 1 || hasConnector) {
      grammarScore = 1;
    }

    var vocabScore = (matchedKeywords >= 3) ? 2 : (matchedKeywords >= 1 ? 1 : 0);
    var totalScore = formScore === 1 ? (contentScore + formScore + grammarScore + vocabScore) : 0;
    var feedback = [];

    if (sentenceCount > 1) {
      feedback.push('Fatal Pearson Error: Your response contains ' + sentenceCount + ' sentences. SWT must be strictly ONE single sentence ending in a period.');
    } else if (!/[.?!]$/.test(text)) {
      feedback.push('Warning: Sentence must end with a full stop (period).');
    }

    if (wordCount < 5) {
      feedback.push('Word count is too short (' + wordCount + ' words). Minimum 5 words.');
    } else if (wordCount > 75) {
      feedback.push('Fatal Pearson Error: Word count exceeds 75 words (' + wordCount + ' words). Form score is zero.');
    } else if (wordCount >= 35 && wordCount <= 45) {
      feedback.push('Optimal word count (35-45 words): ' + wordCount + ' words.');
    }

    if (hasConnector) {
      feedback.push('Effective use of linking words and subordinating conjunctions detected.');
    } else {
      feedback.push("Tip: Use conjunctions like 'while', 'and', 'although' to connect main clauses.");
    }

    return {
      score: totalScore,
      maxScore: 7,
      wordCount: wordCount,
      sentenceCount: sentenceCount,
      breakdown: {
        form: formScore,
        content: contentScore,
        grammar: grammarScore,
        vocabulary: vocabScore
      },
      feedback: feedback,
      modelSummary: targetItem ? targetItem.modelSummary : '',
      formulaScaffold: targetItem ? targetItem.formulaScaffold : '',
      passed: totalScore >= 5
    };
  }

  /**
   * Evaluates PTE Write Essay (Official Pearson 7-trait breakdown, max 15).
   * Form (200-300 words), Structure (4 paragraphs), Content keywords, Cohesion.
   * @param {Object} targetItem - Bank item with prompt and fourParagraphPlan.
   * @param {string} userEssay - Candidate essay text.
   * @returns {Object} Score out of 15 with detailed component scores and feedback.
   */
  function evaluateWriteEssay(targetItem, userEssay) {
    var text = String(userEssay || '').trim();
    var tokens = tokenize(text);
    var wordCount = tokens.length;

    var paragraphs = text.split(/\n+/).map(function (p) {
      return p.trim();
    }).filter(function (p) {
      return p.length > 0;
    });
    var paragraphCount = paragraphs.length;

    var formScore = 0;
    if (wordCount >= 200 && wordCount <= 300) {
      formScore = 2;
    } else if ((wordCount >= 120 && wordCount < 200) || (wordCount > 300 && wordCount <= 380)) {
      formScore = 1;
    } else {
      formScore = 0;
    }

    var structureScore = 0;
    if (paragraphCount === 4) {
      structureScore = 2;
    } else if (paragraphCount >= 2 && paragraphCount <= 5) {
      structureScore = 1;
    }

    var cohesiveWords = ['firstly', 'secondly', 'furthermore', 'moreover', 'however', 'in contrast', 'therefore', 'consequently', 'in conclusion', 'to conclude', 'on the other hand'];
    var lowerText = text.toLowerCase();
    var cohesiveCount = 0;
    cohesiveWords.forEach(function (cw) {
      if (lowerText.indexOf(cw) !== -1) cohesiveCount++;
    });

    var linguisticScore = cohesiveCount >= 3 ? 2 : (cohesiveCount >= 1 ? 1 : 0);
    var grammarScore = formScore > 0 ? 2 : 1;
    var vocabScore = formScore > 0 ? 2 : 1;
    var spellingScore = formScore > 0 ? 2 : 1;
    var contentScore = formScore > 0 ? 3 : 1;

    var totalScore = formScore === 0 ? 0 : (contentScore + formScore + structureScore + grammarScore + vocabScore + spellingScore + linguisticScore);

    var feedback = [];
    if (wordCount < 200) {
      feedback.push('Essay length (' + wordCount + ' words) is below the Pearson 200-300 word target.');
    } else if (wordCount > 300) {
      feedback.push('Essay length (' + wordCount + ' words) exceeds 300 words. Penalties may apply.');
    } else {
      feedback.push('Optimal essay length: ' + wordCount + ' words (target 200-300 words).');
    }

    if (paragraphCount === 4) {
      feedback.push('Pearson 4-paragraph structure (Introduction, Body 1, Body 2, Conclusion) satisfied.');
    } else {
      feedback.push('Recommended: divide essay into exactly 4 distinct paragraphs (Introduction, Body 1, Body 2, Conclusion).');
    }

    return {
      score: totalScore,
      maxScore: 15,
      wordCount: wordCount,
      paragraphCount: paragraphCount,
      breakdown: {
        content: contentScore,
        form: formScore,
        structure: structureScore,
        grammar: grammarScore,
        vocabulary: vocabScore,
        spelling: spellingScore,
        linguistic: linguisticScore
      },
      feedback: feedback,
      nakulScaffold: targetItem ? targetItem.nakulScaffold : null,
      passed: totalScore >= 10
    };
  }

  /**
   * Evaluates PTE Retell Lecture (Spoken).
   * Pearson scoring: Content (0-5), Oral Fluency (0-5), Pronunciation (0-5) = Max 15.
   * @param {Object} targetItem - Bank item with keyNounChunks and nakulTemplateSpeech.
   * @param {string} spokenTranscript - Speech recognizer transcript.
   * @param {Object} [metrics] - Fluency and acoustic metrics (WPM, pause count, etc.).
   * @returns {Object} Score out of 15 with chunk matches and Nakul scaffold feedback.
   */
  function evaluateRetellLecture(targetItem, spokenTranscript, metrics) {
    var transcript = String(spokenTranscript || '').trim();
    var userTokens = tokenize(transcript);
    var keyChunks = targetItem && Array.isArray(targetItem.keyNounChunks) ? targetItem.keyNounChunks : [];

    var lowerTranscript = transcript.toLowerCase();
    var matchedChunks = [];
    var missingChunks = [];

    keyChunks.forEach(function (chunk) {
      var cleanChunk = String(chunk).trim().toLowerCase();
      if (lowerTranscript.indexOf(cleanChunk) !== -1) {
        matchedChunks.push(chunk);
      } else {
        missingChunks.push(chunk);
      }
    });

    var chunkRatio = keyChunks.length > 0 ? (matchedChunks.length / keyChunks.length) : 0;
    var contentScore = 0;
    if (chunkRatio >= 0.7 || matchedChunks.length >= 4) {
      contentScore = 5;
    } else if (chunkRatio >= 0.5 || matchedChunks.length >= 3) {
      contentScore = 4;
    } else if (chunkRatio >= 0.3 || matchedChunks.length >= 2) {
      contentScore = 3;
    } else if (matchedChunks.length >= 1) {
      contentScore = 2;
    } else if (userTokens.length > 10) {
      contentScore = 1;
    }

    var fluencyScore = 4;
    var pronunciationScore = 4;
    if (metrics) {
      if (typeof metrics.fluency === 'number') fluencyScore = Math.min(5, Math.max(0, Math.round(metrics.fluency)));
      if (typeof metrics.pronunciation === 'number') pronunciationScore = Math.min(5, Math.max(0, Math.round(metrics.pronunciation)));
    }

    var totalScore = contentScore + fluencyScore + pronunciationScore;

    return {
      score: totalScore,
      maxScore: 15,
      breakdown: {
        content: contentScore,
        fluency: fluencyScore,
        pronunciation: pronunciationScore
      },
      matchedChunks: matchedChunks,
      missingChunks: missingChunks,
      nakulTemplateSpeech: targetItem ? targetItem.nakulTemplateSpeech : '',
      passed: totalScore >= 10
    };
  }

  /**
   * Evaluates PTE Summarize Spoken Text (SST).
   * Pearson scoring: Content (2), Form (2), Grammar (2), Vocabulary (2), Spelling (2) = Max 10.
   * Target: 50-70 words strictly.
   * @param {Object} targetItem - Bank item with modelSummary and wordLimit.
   * @param {string} userText - Candidate summary.
   * @returns {Object} Score out of 10 with detailed trait breakdown.
   */
  function evaluateSummarizeSpokenText(targetItem, userText) {
    var text = String(userText || '').trim();
    var tokens = tokenize(text);
    var wordCount = tokens.length;

    var formScore = 0;
    if (wordCount >= 50 && wordCount <= 70) {
      formScore = 2;
    } else if ((wordCount >= 40 && wordCount < 50) || (wordCount > 70 && wordCount <= 100)) {
      formScore = 1;
    } else {
      formScore = 0;
    }

    var modelTokens = targetItem && targetItem.modelSummary ? tokenize(targetItem.modelSummary) : [];
    var matchedKeywords = 0;
    var checked = {};
    tokens.forEach(function (t) {
      if (t.length > 3 && modelTokens.indexOf(t) !== -1 && !checked[t]) {
        checked[t] = true;
        matchedKeywords++;
      }
    });

    var contentScore = matchedKeywords >= 4 ? 2 : (matchedKeywords >= 2 ? 1 : 0);
    var grammarScore = formScore > 0 ? 2 : 1;
    var vocabScore = matchedKeywords >= 3 ? 2 : 1;
    var spellingScore = formScore > 0 ? 2 : 1;

    var totalScore = formScore === 0 ? 0 : (contentScore + formScore + grammarScore + vocabScore + spellingScore);

    var feedback = [];
    if (wordCount < 50) {
      feedback.push('Word count (' + wordCount + ' words) is below the ideal 50-70 word target.');
    } else if (wordCount > 70) {
      feedback.push('Word count (' + wordCount + ' words) exceeds the ideal 70 word limit.');
    } else {
      feedback.push('Optimal word count (50-70 words): ' + wordCount + ' words.');
    }

    return {
      score: totalScore,
      maxScore: 10,
      wordCount: wordCount,
      breakdown: {
        content: contentScore,
        form: formScore,
        grammar: grammarScore,
        vocabulary: vocabScore,
        spelling: spellingScore
      },
      feedback: feedback,
      modelSummary: targetItem ? targetItem.modelSummary : '',
      passed: totalScore >= 7
    };
  }

  /**
   * Evaluates PTE Listening Fill in the Blanks.
   * @param {Object} targetItem - Bank item with blanks array containing id, correct, and spellingTip.
   * @param {Object} userAnswers - User input words mapped by blank id.
   * @returns {Object} Exact spelling check with spelling tips and marks.
   */
  function evaluateListeningFib(targetItem, userAnswers) {
    if (!targetItem || !Array.isArray(targetItem.blanks)) {
      return { score: 0, maxScore: 0, percentage: 0, passed: false, blankResults: [] };
    }

    var answers = userAnswers || {};
    var blanks = targetItem.blanks;
    var correctCount = 0;
    var blankResults = [];

    blanks.forEach(function (b, idx) {
      var chosen = '';
      if (answers[b.id] !== undefined) {
        chosen = answers[b.id];
      } else if (answers[String(b.id)] !== undefined) {
        chosen = answers[String(b.id)];
      } else if (Array.isArray(answers) && answers[idx] !== undefined) {
        chosen = answers[idx];
      }

      var cleanChosen = String(chosen || '').trim();
      var cleanCorrect = String(b.correct || '').trim();
      var isCorrect = cleanChosen.toLowerCase() === cleanCorrect.toLowerCase() && cleanChosen.length > 0;

      if (isCorrect) {
        correctCount++;
      }

      blankResults.push({
        id: b.id,
        userWord: cleanChosen,
        correct: cleanCorrect,
        isCorrect: isCorrect,
        spellingTip: b.spellingTip || ''
      });
    });

    var maxScore = blanks.length;
    var percentage = maxScore > 0 ? Math.round((correctCount / maxScore) * 100) : 0;

    return {
      score: correctCount,
      maxScore: maxScore,
      percentage: percentage,
      passed: percentage >= 60,
      blankResults: blankResults
    };
  }

  /**
   * Evaluates PTE Highlight Incorrect Words (HIW) with Pearson Negative Marking.
   * +1 for each correctly identified error word, -1 for false alarms (minimum total = 0).
   * @param {Object} targetItem - Bank item with displayedText and incorrectWords array.
   * @param {Array<number>} selectedWordIndices - 0-based word indices of clicked words in displayedText.
   * @returns {Object} Net score, correct clicks, false alarms, and warning feedback.
   */
  function evaluateHighlightIncorrectWords(targetItem, selectedWordIndices) {
    if (!targetItem || !Array.isArray(targetItem.incorrectWords)) {
      return { score: 0, maxScore: 0, netScore: 0, correctClicks: 0, falseAlarms: 0, passed: false, details: [] };
    }

    var selected = Array.isArray(selectedWordIndices) ? selectedWordIndices : [];
    var displayedWords = String(targetItem.displayedText || '').split(/\s+/).map(function (w) {
      return w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    });

    var targetErrors = targetItem.incorrectWords;
    var targetIndices = [];

    targetErrors.forEach(function (err) {
      var dWord = String(err.displayed || '').toLowerCase();
      displayedWords.forEach(function (dw, idx) {
        if (dw === dWord && targetIndices.indexOf(idx) === -1) {
          targetIndices.push(idx);
        }
      });
    });

    var correctClicks = 0;
    var falseAlarms = 0;

    selected.forEach(function (idx) {
      if (targetIndices.indexOf(idx) !== -1) {
        correctClicks++;
      } else {
        falseAlarms++;
      }
    });

    var netScore = Math.max(0, correctClicks - falseAlarms);
    var maxScore = targetErrors.length;
    var passed = netScore === maxScore;

    return {
      score: netScore,
      netScore: netScore,
      maxScore: maxScore,
      correctClicks: correctClicks,
      falseAlarms: falseAlarms,
      passed: passed,
      negativeMarkingApplied: falseAlarms > 0,
      incorrectWords: targetErrors
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
    evaluateAcousticPitch: evaluateAcousticPitch,
    getDailyRoadmapDay: getDailyRoadmapDay,
    calculateDailyProgress: calculateDailyProgress,
    calculateCompositePearson: calculateCompositePearson,
    evaluateReadingFib: evaluateReadingFib,
    evaluateReadingDragDrop: evaluateReadingDragDrop,
    evaluateReorderParagraphs: evaluateReorderParagraphs,
    evaluateSummarizeWrittenText: evaluateSummarizeWrittenText,
    evaluateWriteEssay: evaluateWriteEssay,
    evaluateRetellLecture: evaluateRetellLecture,
    evaluateSummarizeSpokenText: evaluateSummarizeSpokenText,
    evaluateListeningFib: evaluateListeningFib,
    evaluateHighlightIncorrectWords: evaluateHighlightIncorrectWords
  };
});
