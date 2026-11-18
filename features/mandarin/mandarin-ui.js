/**
 * features/mandarin/mandarin-ui.js
 *
 * FIEZEL MANDARIN ACADEMY UI & MODAL ENGINE (HSK 1 TO 6 COMPLETE)
 * 5-Step Interactive Lesson Player (Kosakata -> Grammar -> Percakapan & Shadowing -> Kuis -> AI Bicara),
 * Peta Jalur Belajar 192 Pelajaran (Level 0 + Level 1–8), Pelatih 4 Nada Pinyin,
 * Studio Goresan Hanzi Mi Zi Ge & 20 Radikal, 24 Can-Do Situasi Nyata Komunikatif,
 * Bank 192 Pola Tata Bahasa, 2.194 HSK Vocab Explorer, dan Pemilih Kursus 3 Bahasa.
 *
 * 100% Proprietary Clean Native FIEZEL Assets — Zero External Third-Party Branding.
 */

(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelMandarinUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mt(k, fb, params) {
    var s;
    try {
      var I = (typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this)).FiezelI18n;
      s = I && I.t ? I.t(k, params) : undefined;
    } catch (_) {}
    if (s === undefined || s === k) s = fb == null ? k : fb;
    if (params) s = String(s).replace(/\{(\w+)\}/g, function (m, n) { return Object.prototype.hasOwnProperty.call(params, n) ? String(params[n]) : m; });
    return s;
  }

  function curLoc() {
    try {
      var I = (typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this)).FiezelI18n;
      return (I && typeof I.getLocale === 'function' && I.getLocale()) || 'id';
    } catch (_) { return 'id'; }
  }

  function pickM(en, id, th) {
    var l = curLoc();
    if (l === 'id') return id;
    if (l === 'th' && th) return th;
    return en;
  }

  // Web Audio Synthesizer untuk 4 Kontur Nada Pinyin (55, 35, 214, 51)
  function playSynthesizedTone(toneNumber, baseFreq) {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = window.__fiezelSharedAudioContext;
      if (!ctx || ctx.state === 'closed') {
        ctx = new AudioCtx();
        window.__fiezelSharedAudioContext = ctx;
      }
      if (ctx.state === 'suspended') {
        try { ctx.resume(); } catch (_) {}
      }
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      var f0 = baseFreq || 220; // Nada dasar A3
      var now = ctx.currentTime;
      var dur = 0.45;

      osc.type = 'sine';

      if (toneNumber === 1) {
        // Nada 1: Datar tinggi [55]
        osc.frequency.setValueAtTime(f0 * 1.5, now);
        osc.frequency.linearRampToValueAtTime(f0 * 1.5, now + dur);
      } else if (toneNumber === 2) {
        // Nada 2: Naik tinggi [35]
        osc.frequency.setValueAtTime(f0 * 1.15, now);
        osc.frequency.exponentialRampToValueAtTime(f0 * 1.5, now + dur);
      } else if (toneNumber === 3) {
        // Nada 3: Turun-Naik [214]
        osc.frequency.setValueAtTime(f0 * 1.1, now);
        osc.frequency.exponentialRampToValueAtTime(f0 * 0.85, now + dur * 0.5);
        osc.frequency.exponentialRampToValueAtTime(f0 * 1.35, now + dur);
        dur = 0.55;
      } else if (toneNumber === 4) {
        // Nada 4: Turun tajam [51]
        osc.frequency.setValueAtTime(f0 * 1.6, now);
        osc.frequency.exponentialRampToValueAtTime(f0 * 0.9, now + 0.35);
        dur = 0.35;
      } else {
        // Nada Netral: Ringan dan pendek
        osc.frequency.setValueAtTime(f0 * 1.2, now);
        dur = 0.18;
      }

      // Envelope ADSR halus
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur + 0.05);
    } catch (_) {}
  }

  function playZhSpeech(text) {
    try {
      var clean = String(text || '').trim();
      if (!clean) return;
      if (window.FiezelVoiceSay && typeof window.FiezelVoiceSay.say === 'function') {
        var res = window.FiezelVoiceSay.say(clean, { locale: 'zh-CN', speed: 0.88, contentType: 'word' });
        if (res && typeof res.catch === 'function') res.catch(function () {});
        return;
      }
      if (window.audio && typeof window.audio.play === 'function') {
        var p = window.audio.play(clean, { locale: 'zh-CN', speed: 0.88 });
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
    } catch (_) {}
  }

  function playToneAudio(text, tone) {
    if (tone) playSynthesizedTone(Number(tone));
    if (text) playZhSpeech(text);
  }

  // --- TOGGLE PINYIN & KARAOKE SWITCHES ---
  function togglesMarkup() {
    if (typeof FiezelMandarinPinyinEngine !== 'undefined' && FiezelMandarinPinyinEngine.renderDisplayToggleBar) {
      return FiezelMandarinPinyinEngine.renderDisplayToggleBar();
    }
    var pinyinOn = (localStorage.getItem('fz_zh_pinyin') !== '0');
    return '<div class="fz-zh-toggles-bar" style="display:flex;align-items:center;justify-content:space-between;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:8px 14px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
      + '<div style="display:flex;align-items:center;gap:8px;">'
      + '<span style="font-size:16px;">🔤</span>'
      + '<span style="font-size:13px;font-weight:700;color:#0F172A;">Tampilkan Panduan Pinyin Bertanda Nada</span>'
      + '</div>'
      + '<button type="button" class="btn btn-sm" style="border-radius:8px;font-weight:800;font-size:12px;background:' + (pinyinOn ? '#FFE4E6;color:#BE123C;border:1px solid #FDA4AF;' : '#F1F5F9;color:#64748B;border:1px solid #CBD5E1;') + '" onclick="FiezelMandarinUI.togglePinyin()">'
      + (pinyinOn ? 'Aktif (On)' : 'Nonaktif (Off)')
      + '</button>'
      + '</div>';
  }

  function togglePinyin() {
    if (typeof FiezelMandarinPinyinEngine !== 'undefined' && FiezelMandarinPinyinEngine.togglePinyin) {
      var nextState = FiezelMandarinPinyinEngine.togglePinyin();
      localStorage.setItem('fz_zh_pinyin', nextState ? '1' : '0');
      return;
    }
    var cur = (localStorage.getItem('fz_zh_pinyin') !== '0');
    localStorage.setItem('fz_zh_pinyin', cur ? '0' : '1');
    if (typeof window.render === 'function') window.render();
  }

  // =========================================================================
  // --- 1. MODAL 5-STEP LESSON PLAYER (KOSAKATA -> GRAMMAR -> PERCAKAPAN -> KUIS -> AI) ---
  // =========================================================================
  var _activeLesson = null;
  var _activeStep = 1;
  var _quizState = {};
  var _quizTelemetryRecorded = {};

  function emitMandarinBraincoreTelemetry(lesson, qIdx, quizItem, isOk, details) {
    try {
      var d = details || {};
      var ok = Boolean(isOk);
      var rawSkill = String((quizItem && quizItem.skill) || (lesson && lesson.skill) || 'zh_grammar_svo_aspect').trim();
      var skillKey = rawSkill.indexOf('zh_') === 0 ? rawSkill : ('zh_' + rawSkill);
      var ms = Math.max(500, Math.min(120000, Number(d.ms) || 3500));
      var lessonId = String((lesson && lesson.id) || 'zh_lesson');
      var recKey = lessonId + ':' + qIdx;
      var firstTime = !_quizTelemetryRecorded[recKey];

      var misconceptionCode = '';
      if (!ok && quizItem) {
        if (quizItem.type === 'reorder') {
          misconceptionCode = 'ERR_SVO_TIME_PLACE_POSITION';
        } else if (Array.isArray(quizItem.distractors) && typeof d.chosenIdx === 'number' && quizItem.options) {
          var chosenOpt = quizItem.options[d.chosenIdx];
          var hit = quizItem.distractors.find(function (dist) { return dist && dist.option === chosenOpt; });
          if (hit && hit.misconceptionId) misconceptionCode = String(hit.misconceptionId);
        }
        if (!misconceptionCode) misconceptionCode = 'zh_syntax_or_lexical_gap';
      }

      if (typeof window.updateMastery === 'function') {
        try { window.updateMastery('grammar', skillKey, ok, ms); } catch (_) {}
      }

      var qPayload = {
        id: String((quizItem && quizItem.id) || (lessonId + '_q' + qIdx)),
        type: (quizItem && quizItem.type === 'reorder') ? 'token-order' : 'grammar',
        level: 'A' + Math.min(6, Math.max(1, Number(lesson && lesson.level) || 1)),
        skill: skillKey,
        lessonSkill: skillKey,
        target: skillKey
      };
      if (d.userText) qPayload.__userTokenAnswer = String(d.userText);

      if (firstTime && typeof window.record === 'function') {
        _quizTelemetryRecorded[recKey] = true;
        try {
          window.record(qPayload, ok, ms, typeof d.chosenIdx === 'number' ? d.chosenIdx : -1);
        } catch (_) {}
      } else if (typeof window.bktRecord === 'function') {
        try {
          window.bktRecord(
            { lessonSkill: skillKey, skill: skillKey },
            ok,
            firstTime ? 1.0 : 0.55,
            (quizItem && quizItem.type === 'reorder') ? 1.2 : 1.0
          );
        } catch (_) {}
      }

      if (typeof window.misconceptionLedgerRecord === 'function') {
        try {
          window.misconceptionLedgerRecord(
            'mandarin_' + lessonId,
            qPayload,
            ok ? null : { misconception: misconceptionCode, timing: 'normal' },
            ok
          );
        } catch (_) {}
      }
    } catch (_) {}
  }

  function stopMandarinLessonVoice() {
    try {
      if (window.FiezelGrammarUpgrade && typeof window.FiezelGrammarUpgrade.stopActiveVoice === 'function') {
        window.FiezelGrammarUpgrade.stopActiveVoice();
      }
    } catch (_) {}
  }

  function openLessonPlayer(lessonId, initialStep) {
    stopMandarinLessonVoice();
    var currModule = (typeof FiezelMandarinCurriculum !== 'undefined') ? FiezelMandarinCurriculum : null;
    if (!currModule) return;

    var lesson = currModule.getLessonById(lessonId);
    if (!lesson) return;

    _activeLesson = lesson;
    _activeStep = initialStep || 1;
    _quizState = {};
    _quizTelemetryRecorded = {};

    renderLessonPlayerModal();
  }

  function setLessonStep(stepNum) {
    stopMandarinLessonVoice();
    if (stepNum < 1) stepNum = 1;
    if (stepNum > 5) stepNum = 5;
    _activeStep = stepNum;
    renderLessonPlayerModal();
  }

  function renderLessonPlayerModal() {
    if (!_activeLesson) return;
    var l = _activeLesson;
    var step = _activeStep;

    var stepLabels = [
      { step: 1, label: mt('mandarin.step_1', '1. Vocabulary'), icon: '📖' },
      { step: 2, label: mt('mandarin.step_2', '2. Grammar'), icon: '📐' },
      { step: 3, label: mt('mandarin.step_3', '3. Conversation'), icon: '💬' },
      { step: 4, label: mt('mandarin.step_4', '4. Quiz'), icon: '✍️' },
      { step: 5, label: mt('mandarin.step_5', '5. AI Speaking'), icon: '🎙️' }
    ];

    var pillsHtml = '<div style="display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:14px;border-bottom:1px solid #F1F5F9;">'
      + stepLabels.map(function (s) {
        var isCur = (s.step === step);
        var isPassed = (s.step < step);
        return '<button type="button" onclick="FiezelMandarinUI.setLessonStep(' + s.step + ')" style="white-space:nowrap;font-size:11.5px;font-weight:700;padding:6px 10px;border-radius:20px;border:' + (isCur ? '1.5px solid #BE123C' : '1px solid #E2E8F0') + ';background:' + (isCur ? '#FFE4E6' : (isPassed ? '#F8FAFC' : '#FFFFFF')) + ';color:' + (isCur ? '#BE123C' : '#334155') + ';cursor:pointer;">'
          + s.icon + ' ' + s.label + (isPassed ? ' ✓' : '')
          + '</button>';
      }).join('')
      + '</div>';

    var bodyHtml = '';

    if (step === 1) {
      // Step 1: Vocabulary Cards
      var wordsList = (l.words || []).map(function (w, idx) {
        var hz = (typeof w === 'string') ? w : (w.hanzi || '');
        return '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.02);display:flex;align-items:center;justify-content:space-between;">'
          + '<div>'
          + '<div style="font-size:18px;font-weight:800;color:#0F172A;font-family:var(--fz-font-cjk);">' + esc(hz) + '</div>'
          + '<div style="font-size:12px;color:#BE123C;font-weight:700;font-family:var(--fz-font-pinyin);margin-top:2px;">' + esc(mt('mandarin.word_item_prefix', 'Core Lesson Character #')) + (idx + 1) + '</div>'
          + '</div>'
          + '<button type="button" class="btn btn-sm" style="background:#FFF1F2;border:1px solid #FDA4AF;color:#BE123C;border-radius:8px;font-weight:700;font-size:12px;padding:6px 12px;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(hz) + '\')">' + esc(mt('mandarin.voice_btn', '🔊 Audio')) + '</button>'
          + '</div>';
      }).join('');

      bodyHtml = '<div style="margin-bottom:14px;">'
        + '<h3 style="font-size:15px;font-weight:800;color:#0F172A;margin:0 0 6px 0;">' + esc(mt('mandarin.vocab_core_title', 'Core Lesson Vocabulary')) + '</h3>'
        + '<p style="font-size:12px;color:#475569;margin:0 0 12px 0;">' + esc(mt('mandarin.vocab_core_sub', 'Listen to standard Mandarin tone pronunciation and study each character form.')) + '</p>'
        + '<div>' + wordsList + '</div>'
        + '</div>';

    } else if (step === 2) {
      // Step 2: Grammar Focus
      bodyHtml = '<div style="margin-bottom:14px;">'
        + '<div style="background:#FFF1F2;border:1.5px solid #FDA4AF;border-radius:12px;padding:12px 14px;margin-bottom:12px;">'
        + '<span style="font-size:10px;font-weight:800;background:#BE123C;color:#FFFFFF;padding:2px 8px;border-radius:6px;">' + esc(mt('mandarin.grammar_badge', 'SYNTAX FORMULA')) + '</span>'
        + '<h3 style="font-size:16px;font-weight:800;color:#BE123C;margin:6px 0 4px 0;">' + esc(l.grammarTopic) + '</h3>'
        + '<div style="font-size:13px;font-weight:700;color:#0F172A;background:#FFFFFF;border:1px solid #FDA4AF;border-radius:8px;padding:8px 10px;margin-top:6px;font-family:monospace;">' + esc(l.grammarFormula) + '</div>'
        + '</div>'
        + '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;margin-bottom:12px;">'
        + '<h4 style="font-size:13px;font-weight:700;color:#0F172A;margin:0 0 4px 0;">' + esc(mt('mandarin.grammar_note_title', 'Contrastive Language Note')) + '</h4>'
        + '<p style="font-size:12px;color:#475569;margin:0;line-height:1.4;">' + esc(mt('mandarin.grammar_note_body', 'In Mandarin, time and place expressions typically precede the main verb.')) + '</p>'
        + '</div>'
        + '</div>';

    } else if (step === 3) {
      // Step 3: Dialogue Karaoke & Shadowing
      var dialogueTurns = (l.dialogue || []).map(function (d, idx) {
        var isMochi = d.speaker.indexOf('Mochi') >= 0;
        return '<div style="background:' + (isMochi ? '#FFF1F2' : '#F8FAFC') + ';border:1px solid ' + (isMochi ? '#FDA4AF' : '#E2E8F0') + ';border-radius:12px;padding:12px 14px;margin-bottom:10px;">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
          + '<strong style="font-size:12px;color:' + (isMochi ? '#BE123C' : '#0369A1') + ';font-weight:800;">' + esc(d.speaker) + '</strong>'
          + '<button type="button" class="btn btn-sm" style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:6px;font-size:11px;padding:2px 8px;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(d.hz) + '\')">' + esc(mt('mandarin.listen_line_btn', '🔊 Listen')) + '</button>'
          + '</div>'
          + '<div style="font-size:16px;font-weight:800;color:#0F172A;font-family:var(--fz-font-cjk);margin-bottom:2px;">' + esc(d.hz) + '</div>'
          + '<div style="font-size:12px;color:#BE123C;font-family:var(--fz-font-pinyin);margin-bottom:2px;">' + esc(d.py) + '</div>'
          + '<div style="font-size:12px;color:#475569;">' + esc(d.id) + '</div>'
          + '</div>';
      }).join('');

      bodyHtml = '<div style="margin-bottom:14px;">'
        + '<h3 style="font-size:15px;font-weight:800;color:#0F172A;margin:0 0 4px 0;">' + esc(mt('mandarin.dialogue_title', 'Conversation with Xiao Mochi')) + '</h3>'
        + '<p style="font-size:12px;color:#475569;margin:0 0 10px 0;">' + esc(mt('mandarin.dialogue_sub', 'Follow the contextual dialogue and practice aloud with shadowing.')) + '</p>'
        + '<div>' + dialogueTurns + '</div>'
        + '</div>';

    } else if (step === 4) {
      // Step 4: Braincore Quiz
      var quizzes = l.quiz || [];
      var quizHtml = quizzes.map(function (q, qIdx) {
        var answered = _quizState[qIdx];
        var isReorder = (q.type === 'reorder');
        var isAnswered = (answered !== undefined);
        var isCorrect = false;
        var chosenWrong = null;
        var whyFailsText = mt('quiz.wrong-default', 'This choice does not fit the sentence context.');
        var misconceptionText = '';

        if (isReorder) {
          isCorrect = Boolean(isAnswered && answered && answered.isCorrect);
          if (isAnswered && !isCorrect) {
            var userBuilt = answered && answered.userText ? ('("' + answered.userText + '")') : '';
            whyFailsText = userBuilt
              ? (userBuilt + ' — ' + mt('mandarin.reorder_hint', 'Follow Subject + Time + Place + Verb + Object.'))
              : mt('mandarin.reorder_hint', 'Follow Subject + Time + Place + Verb + Object.');
            misconceptionText = mt('mandarin.reorder_pattern_hint', 'Place time and place expressions before the verb.');
          }
        } else {
          isCorrect = isAnswered && (answered === q.answerIndex);
          chosenWrong = (!isCorrect && isAnswered && q.options && q.distractors)
            ? q.distractors.find(function (d) { return d.option === q.options[answered]; })
            : null;
          whyFailsText = chosenWrong ? chosenWrong.whyFailsId : mt('quiz.wrong-default', 'This choice does not fit the sentence context.');
          misconceptionText = chosenWrong ? chosenWrong.misconceptionId : '';
        }

        var tutorFeedback = '';
        if (isAnswered) {
          if (isCorrect) {
            tutorFeedback = '<div style="margin-top:10px;font-size:12px;color:#16A34A;background:#F0FDF4;border:1px solid #BBF7D0;padding:10px 12px;border-radius:10px;">'
              + '<div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:12.5px;margin-bottom:3px;"><span>🌟</span> ' + mt('quiz.verdict-correct', 'Correct Answer!') + '</div>'
              + (isReorder && q.sentenceHz ? '<div style="font-weight:800;font-family:var(--fz-font-cjk);margin-bottom:4px;">' + esc(q.sentenceHz) + '</div>' : '')
              + '<div>' + esc(q.explanation || mt('quiz.verdict-correct', 'Correct!')) + '</div>'
              + '</div>';
          } else {
            tutorFeedback = '<div style="margin-top:10px;font-size:12px;color:#991B1B;background:#FEF2F2;border:1.5px solid #FECACA;padding:10px 12px;border-radius:10px;">'
              + '<div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:12.5px;color:#DC2626;margin-bottom:4px;"><span>🎓</span> Tutor FIEZEL:</div>'
              + '<div style="line-height:1.4;margin-bottom:4px;">' + esc(whyFailsText) + '</div>'
              + (misconceptionText ? '<div style="font-size:11px;color:#BE123C;font-weight:700;background:#FFF1F2;padding:3px 8px;border-radius:6px;display:inline-block;margin-top:4px;">' + esc(mt('mandarin.pattern_prefix', '💡 Pattern:')) + ' ' + esc(misconceptionText) + '</div>' : '')
              + (q.reasoningOperationId ? (function () {
                  var steps = q.reasoningOperationId.split(/\s*->\s*/);
                  return '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #FDA4AF;">'
                    + '<div style="font-size:11px;font-weight:800;color:#0F172A;margin-bottom:4px;">' + esc(mt('mandarin.logic_title', 'STEP-BY-STEP REASONING:')) + '</div>'
                    + steps.map(function (s, sIdx) {
                        return '<div style="font-size:11.5px;color:#475569;margin-bottom:2px;"><b>' + esc(mt('mandarin.step_word', 'Step')) + ' ' + (sIdx + 1) + ':</b> ' + esc(s) + '</div>';
                      }).join('')
                    + '</div>';
                })() : '')
              + '</div>';
          }
        }

        var interactiveBody = '';
        if (q.type === 'cloze') {
          interactiveBody = '<div style="font-size:15px;font-weight:800;color:#BE123C;margin-bottom:10px;font-family:var(--fz-font-cjk);">' + esc(q.sentence || '') + '</div>'
            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">'
            + (q.options || []).map(function (opt, oIdx) {
              var isCor = (oIdx === q.answerIndex);
              var isSel = (answered === oIdx);
              var bg = isSel ? (isCor ? '#DCFCE7' : '#FEE2E2') : '#F8FAFC';
              var border = isSel ? (isCor ? '#16A34A' : '#DC2626') : '#E2E8F0';
              return '<button type="button" style="background:' + bg + ';border:1px solid ' + border + ';border-radius:8px;padding:8px;font-weight:700;font-size:13px;cursor:pointer;" onclick="FiezelMandarinUI.submitQuizAnswer(' + qIdx + ', ' + oIdx + ')">'
                + esc(opt)
                + '</button>';
            }).join('')
            + '</div>';
        } else {
          if (isCorrect) {
            interactiveBody = '<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px;font-size:15px;font-weight:800;color:#166534;font-family:var(--fz-font-cjk);">' + esc(q.sentenceHz || ((q.correctTokens || q.tokens || []).join(' '))) + '</div>';
          } else {
            interactiveBody = '<div class="mandarin-reorder-mount" data-qidx="' + qIdx + '" style="margin-top:4px;"></div>';
          }
        }

        return '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
          + '<div style="font-size:11px;font-weight:800;color:#BE123C;margin-bottom:4px;">Q #' + (qIdx + 1) + ' · ' + esc(isReorder ? mt('mandarin.q_reorder_badge', 'WORD ORDER') : mt('mandarin.q_cloze_badge', 'FILL IN BLANK')) + '</div>'
          + '<div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:8px;">' + esc(q.prompt) + '</div>'
          + interactiveBody
          + tutorFeedback
          + '</div>';
      }).join('');

      bodyHtml = '<div style="margin-bottom:14px;">'
        + '<h3 style="font-size:15px;font-weight:800;color:#0F172A;margin:0 0 4px 0;">' + esc(mt('mandarin.quiz_eval_title', 'Comprehension Check Quiz')) + '</h3>'
        + '<p style="font-size:12px;color:#475569;margin:0 0 10px 0;">' + esc(mt('mandarin.quiz_eval_sub', 'Test your grasp of vocabulary and sentence patterns from this lesson.')) + '</p>'
        + '<div>' + quizHtml + '</div>'
        + '</div>';

    } else if (step === 5) {
      // Step 5: AI Speaking Roleplay with Xiao Mochi
      var ai = l.aiSpeaking || {};
      bodyHtml = '<div style="margin-bottom:14px;">'
        + '<div style="background:#FFF1F2;border:1.5px solid #FDA4AF;border-radius:14px;padding:14px;margin-bottom:12px;text-align:center;">'
        + '<div style="font-size:36px;margin-bottom:4px;">🍡</div>'
        + '<h3 style="font-size:17px;font-weight:800;color:#BE123C;margin:0 0 4px 0;">Xiao Mochi (小麻薯)</h3>'
        + '<p style="font-size:12px;color:#475569;margin:0 0 10px 0;">' + esc(mt('mandarin.mochi_role', 'FIEZEL Mandarin AI Partner · Standard Beijing Putonghua')) + '</p>'
        + '<div style="background:#FFFFFF;border:1px solid #FDA4AF;border-radius:10px;padding:10px 12px;font-size:13.5px;font-weight:700;color:#0F172A;font-family:var(--fz-font-cjk);margin-bottom:10px;">'
        + '“' + esc(ai.openingLine || '你好！准备好练习了吗？') + '”'
        + '</div>'
        + '<button type="button" class="btn btn-sm" style="background:#BE123C;color:#FFFFFF;border-radius:8px;font-weight:800;font-size:13px;padding:8px 16px;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(ai.openingLine || '你好') + '\')">' + esc(mt('mandarin.listen_opening_btn', '🔊 Listen to Opening Line')) + '</button>'
        + '</div>'
        + '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;margin-bottom:12px;">'
        + '<h4 style="font-size:13px;font-weight:700;color:#0F172A;margin:0 0 6px 0;">' + esc(mt('mandarin.mission_card_title', 'Speaking Mission:')) + '</h4>'
        + '<div style="font-size:12.5px;color:#334155;line-height:1.4;">' + esc(ai.scenario || l.scenario) + '</div>'
        + '</div>'
        + '</div>';
    }

    var footerHtml = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #F1F5F9;padding-top:12px;margin-top:14px;">'
      + (step > 1
        ? '<button type="button" class="btn btn-secondary" style="border-radius:10px;font-weight:700;padding:8px 16px;" onclick="FiezelMandarinUI.setLessonStep(' + (step - 1) + ')">' + esc(mt('mandarin.btn_prev_step', '← Previous')) + '</button>'
        : '<div></div>')
      + (step < 5
        ? '<button type="button" class="btn btn-primary" style="background:#BE123C;border-radius:10px;font-weight:800;padding:8px 20px;" onclick="FiezelMandarinUI.setLessonStep(' + (step + 1) + ')">' + esc(mt('mandarin.btn_next_step', 'Next Step')) + ' ' + (step + 1) + ' →</button>'
        : '<button type="button" class="btn btn-primary" style="background:#16A34A;border-radius:10px;font-weight:800;padding:8px 20px;" onclick="closeModal()">' + esc(mt('mandarin.btn_finish_lesson', 'Finish & Save Progress ✓')) + '</button>')
      + '</div>';

    var modalHtml = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:560px;margin:auto;max-height:85vh;overflow-y:auto;padding:8px 4px;">'
      + '<button type="button" class="modal-close-corner" onclick="(window.FiezelGrammarUpgrade&&window.FiezelGrammarUpgrade.stopActiveVoice&&window.FiezelGrammarUpgrade.stopActiveVoice());closeModal()" aria-label="' + esc(mt('common.tutup', 'Close')) + '"><i data-lucide="x"></i></button>'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'
      + '<span style="font-size:10px;font-weight:800;background:#FFE4E6;color:#BE123C;padding:2px 8px;border-radius:6px;">LEVEL ' + l.level + ' · ' + esc(mt('mandarin.chapter_word', 'UNIT')) + ' ' + l.num + '</span>'
      + '<span style="font-size:11px;color:#64748B;font-weight:700;">⏱️ ' + esc(l.durationLabel) + ' · +' + l.exp + ' EXP</span>'
      + '</div>'
      + '<h2 style="font-size:18px;font-weight:800;color:#0F172A;margin:2px 0 10px 0;">' + esc(l.title) + ' · <span style="font-family:var(--fz-font-cjk);color:#BE123C;">' + esc(l.titleZh) + '</span></h2>'
      + pillsHtml
      + bodyHtml
      + footerHtml
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(modalHtml);

    if (step === 4 && typeof document !== 'undefined' && window.FiezelGrammarUpgrade && typeof window.FiezelGrammarUpgrade.renderTokenOrder === 'function') {
      var mounts = document.querySelectorAll('.mandarin-reorder-mount[data-qidx]');
      mounts.forEach(function (mountEl) {
        var idx = Number(mountEl.getAttribute('data-qidx'));
        var qObj = (l.quiz || [])[idx];
        if (!qObj) return;
        var correctToks = (Array.isArray(qObj.correctTokens) && qObj.correctTokens.length > 0)
          ? qObj.correctTokens
          : (Array.isArray(qObj.tokens) ? qObj.tokens : []);
        var widget = window.FiezelGrammarUpgrade.renderTokenOrder(
          {
            tokens: correctToks,
            distractors: Array.isArray(qObj.distractors) ? qObj.distractors : [],
            targetLang: 'zh',
            strictOrder: true
          },
          function (ok, details) {
            _quizState[idx] = {
              type: 'reorder',
              isCorrect: Boolean(ok),
              userText: (details && details.userText) || ''
            };
            emitMandarinBraincoreTelemetry(l, idx, qObj, Boolean(ok), {
              userText: (details && details.userText) || '',
              ms: (details && details.ms) || 4000
            });
            renderLessonPlayerModal();
          },
          { lang: 'zh' }
        );
        mountEl.innerHTML = '';
        mountEl.appendChild(widget);
      });
    }
  }

  function submitQuizAnswer(qIdx, oIdx) {
    _quizState[qIdx] = oIdx;
    var qObj = (_activeLesson && Array.isArray(_activeLesson.quiz)) ? _activeLesson.quiz[qIdx] : null;
    var isOk = Boolean(qObj && Number(oIdx) === Number(qObj.answerIndex));
    emitMandarinBraincoreTelemetry(_activeLesson, qIdx, qObj, isOk, { chosenIdx: Number(oIdx), ms: 3500 });
    renderLessonPlayerModal();
  }

  // =========================================================================
  // --- 2. MODAL PETA JALUR BELAJAR (192 PELAJARAN + LEVEL 0 FONDASI) ---
  // =========================================================================
  var _curriculumMapLevel = 1;

  function openCurriculumMapModal(initialLevel) {
    var currModule = (typeof FiezelMandarinCurriculum !== 'undefined') ? FiezelMandarinCurriculum : null;
    if (!currModule) return;

    if (initialLevel !== undefined) _curriculumMapLevel = initialLevel;
    renderCurriculumMapModal();
  }

  function setCurriculumMapLevel(lvl) {
    _curriculumMapLevel = lvl;
    renderCurriculumMapModal();
  }

  function renderCurriculumMapModal() {
    var currModule = (typeof FiezelMandarinCurriculum !== 'undefined') ? FiezelMandarinCurriculum : null;
    if (!currModule) return;

    var curLvl = _curriculumMapLevel;

    var levelTabs = [
      { lvl: 0, title: 'Fondasi (Lvl 0)' },
      { lvl: 1, title: 'Lvl 1 (HSK 1)' },
      { lvl: 2, title: 'Lvl 2 (HSK 2)' },
      { lvl: 3, title: 'Lvl 3 (HSK 3)' },
      { lvl: 4, title: 'Lvl 4 (HSK 4)' },
      { lvl: 5, title: 'Lvl 5 (HSK 5)' },
      { lvl: 6, title: 'Lvl 6 (HSK 5+)' },
      { lvl: 7, title: 'Lvl 7 (Wacana)' },
      { lvl: 8, title: 'Lvl 8 (Sastra)' }
    ];

    var tabsHtml = '<div style="display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:14px;border-bottom:1px solid #F1F5F9;">'
      + levelTabs.map(function (tab) {
        var isAct = (tab.lvl === curLvl);
        return '<button type="button" onclick="FiezelMandarinUI.setCurriculumMapLevel(' + tab.lvl + ')" style="white-space:nowrap;font-size:11.5px;font-weight:700;padding:6px 12px;border-radius:20px;border:' + (isAct ? '1.5px solid #BE123C' : '1px solid #E2E8F0') + ';background:' + (isAct ? '#FFE4E6' : '#FFFFFF') + ';color:' + (isAct ? '#BE123C' : '#334155') + ';cursor:pointer;">'
          + tab.title
          + '</button>';
      }).join('')
      + '</div>';

    var contentHtml = '';

    if (curLvl === 0) {
      // Level 0 Foundation Units
      var units = currModule.getFoundation ? currModule.getFoundation() : [];
      var unitList = units.map(function (u) {
        var actionCall = "FiezelMandarinUI.openPinyinModal()";
        if (u.unit === 4) actionCall = "FiezelMandarinUI.openSandhiModal()";
        if (u.unit === 6) actionCall = "FiezelMandarinUI.openStrokeModal()";

        return '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.02);display:flex;align-items:center;justify-content:space-between;">'
          + '<div>'
          + '<span style="font-size:10px;font-weight:800;background:#E0F2FE;color:#0369A1;padding:2px 6px;border-radius:4px;">UNIT ' + u.unit + '</span>'
          + '<h4 style="font-size:14px;font-weight:800;color:#0F172A;margin:4px 0 2px 0;">' + esc(u.title) + '</h4>'
          + '<p style="font-size:12px;color:#64748B;margin:0;">' + esc(u.description) + '</p>'
          + '</div>'
          + '<button type="button" class="btn btn-sm" style="background:#FFF1F2;border:1px solid #FDA4AF;color:#BE123C;border-radius:8px;font-weight:700;font-size:12px;padding:6px 12px;cursor:pointer;" onclick="' + actionCall + '">' + esc(mt('mandarin.btn-open-unit', 'Open Unit')) + '</button>'
          + '</div>';
      }).join('');

      contentHtml = '<div>' + unitList + '</div>';
    } else {
      // Levels 1 to 8 Lessons
      var lessons = currModule.getLessonsByLevel ? currModule.getLessonsByLevel(curLvl) : [];
      var lessonList = lessons.map(function (l) {
        return '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.02);display:flex;align-items:center;justify-content:space-between;">'
          + '<div>'
          + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">'
          + '<span style="font-size:10px;font-weight:800;background:#FFE4E6;color:#BE123C;padding:1px 6px;border-radius:4px;">BAB ' + l.num + '</span>'
          + '<span style="font-size:11px;color:#64748B;font-weight:700;">⏱️ ' + esc(l.durationLabel) + ' · +' + l.exp + ' EXP</span>'
          + '</div>'
          + '<h4 style="font-size:13.5px;font-weight:800;color:#0F172A;margin:0 0 2px 0;">' + esc(l.title) + ' <span style="font-family:var(--fz-font-cjk);color:#BE123C;font-size:13px;">(' + esc(l.titleZh) + ')</span></h4>'
          + '<p style="font-size:11.5px;color:#64748B;margin:0;">' + esc(mt('mandarin.label-grammar', 'Grammar')) + ': <b>' + esc(l.grammarTopic) + '</b></p>'
          + '</div>'
          + '<button type="button" class="btn btn-sm" style="background:#BE123C;color:#FFFFFF;border-radius:8px;font-weight:800;font-size:12px;padding:6px 14px;cursor:pointer;" onclick="FiezelMandarinUI.openLessonPlayer(\'' + l.id + '\')">' + esc(mt('mandarin.btn-study', 'Study')) + '</button>'
          + '</div>';
      }).join('');

      contentHtml = '<div>' + lessonList + '</div>';
    }

    var modalHtml = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:580px;margin:auto;max-height:85vh;overflow-y:auto;padding:8px 4px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="' + esc(mt('common.tutup', 'Close')) + '"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">' + esc(mt('mandarin.badge-syllabus', 'FULL 192-CHAPTER SYLLABUS')) + '</span>'
      + '<h2 style="font-size:18px;font-weight:800;color:#0F172A;margin:6px 0 2px 0;">' + esc(mt('mandarin.roadmap-title', 'Mandarin Learning Path Map')) + '</h2>'
      + '<p style="font-size:12px;color:#64748B;margin:0 0 12px 0;">' + esc(mt('mandarin.roadmap-sub', 'Select a level to view structured lessons from foundation to mastery.')) + '</p>'
      + tabsHtml
      + contentHtml
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(modalHtml);
  }

  // =========================================================================
  // --- 3. MODAL PELATIH 4 NADA PINYIN (MINIMALIS & INTUITIF) ---
  // =========================================================================
  function openPinyinModal() {
    var tones = [
      {
        num: 1,
        title: pickM('Tone 1 · High Flat', 'Nada 1 · Datar Tinggi', 'เสียง 1 · ระดับสูงคงที่'),
        py: 'mā', hz: '妈',
        meaning: pickM('Mother', 'Ibu', 'แม่'),
        desc: pickM('Steady, high-pitched pronunciation like holding a musical note.', 'Pelafalan stabil dan tinggi seperti bernyanyi.', 'ออกเสียงระดับสูงคงที่เหมือนลากโน้ตเพลง'),
        sample: 'mā',
        pair: pickM('bā (八 · Eight)', 'bā (八 · Delapan)', 'bā (八 · แปด)')
      },
      {
        num: 2,
        title: pickM('Tone 2 · Rising', 'Nada 2 · Naik Cepat', 'เสียง 2 · เสียงขึ้นสูง'),
        py: 'má', hz: '麻',
        meaning: pickM('Hemp', 'Rami', 'ปอ / ชา'),
        desc: pickM('Rising pitch quickly like an astonished question: "What?!"', 'Pelafalan naik cepat seperti nada heran: "Hah?!".', 'ออกเสียงพุ่งขึ้นเร็วเหมือนเสียงสงสัยว่า "หา?!"'),
        sample: 'má',
        pair: pickM('bá (拔 · Pull out)', 'bá (拔 · Mencabut)', 'bá (拔 · ถอน)')
      },
      {
        num: 3,
        title: pickM('Tone 3 · Dipping', 'Nada 3 · Turun-Naik', 'เสียง 3 · ลงแล้วขึ้น'),
        py: 'mǎ', hz: '马',
        meaning: pickM('Horse', 'Kuda', 'ม้า'),
        desc: pickM('Dips low in the throat then rises gently at the end.', 'Pelafalan turun rendah lalu mengayun lembut ke atas.', 'กดเสียงลงต่ำแล้วตวัดขึ้นเบา ๆ'),
        sample: 'mǎ',
        pair: pickM('bǎ (把 · Hold / Grasp)', 'bǎ (把 · Menggenggam)', 'bǎ (把 · จับถือ)')
      },
      {
        num: 4,
        title: pickM('Tone 4 · Sharp Falling', 'Nada 4 · Turun Tegas', 'เสียง 4 · ตกลงคมชัด'),
        py: 'mà', hz: '骂',
        meaning: pickM('Scold', 'Memarahi', 'ดุ / ตำหนิ'),
        desc: pickM('Sharp, decisive falling pitch like giving an order.', 'Pelafalan turun tajam dan tegas seperti instruksi.', 'ออกเสียงตกลงอย่างรวดเร็วและหนักแน่น'),
        sample: 'mà',
        pair: pickM('bà (爸 · Dad)', 'bà (爸 · Ayah)', 'bà (爸 · พ่อ)')
      },
      {
        num: 0,
        title: pickM('Neutral Tone · Light', 'Nada Netral · Ringan', 'เสียงเบา · ไร้เสียงวรรณยุกต์'),
        py: 'ma', hz: '吗',
        meaning: pickM('Question particle', 'Partikel tanya', 'คำลงท้ายคำถาม'),
        desc: pickM('Pronounced very lightly, briefly, and without stress.', 'Diucapkan sangat ringan, pendek, dan rileks.', 'ออกเสียงสั้น เบา และผ่อนคลาย'),
        sample: 'ma',
        pair: pickM('ba (吧 · Suggestion particle)', 'ba (吧 · Partikel ajakan)', 'ba (吧 · คำชวน)')
      }
    ];

    var cards = tones.map(function (tItem) {
      return '<div class="fz-tone-box" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">'
        + '<div style="display:flex;align-items:center;gap:8px;">'
        + '<span class="fz-tone-tag" style="font-size:11px;font-weight:800;background:#FFF1F2;color:#BE123C;padding:2px 8px;border-radius:6px;">' + esc(tItem.title) + '</span>'
        + '<strong style="font-size:16px;color:#0F172A;font-family:var(--fz-font-cjk);">' + esc(tItem.hz) + ' · ' + esc(tItem.py) + '</strong>'
        + '</div>'
        + '<button type="button" class="btn btn-sm" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#0F172A;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(tItem.sample) + '\', ' + tItem.num + ')">' + esc(mt('mandarin.btn-listen', '🔊 Listen')) + '</button>'
        + '</div>'
        + '<div style="font-size:12px;color:#334155;margin-bottom:4px;">' + esc(tItem.desc) + '</div>'
        + '<div style="font-size:11.5px;color:#64748B;">' + esc(mt('mandarin.label-meaning', 'Meaning')) + ': <b>' + esc(tItem.meaning) + '</b> · ' + esc(mt('mandarin.label-pair', 'Pair')) + ': <i>' + esc(tItem.pair) + '</i></div>'
        + '</div>';
    }).join('');

    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:520px;margin:auto;max-height:80vh;overflow-y:auto;padding:6px 2px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="' + esc(mt('common.tutup', 'Close')) + '"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">' + esc(mt('mandarin.badge-phonetics', 'MANDARIN PHONETICS')) + '</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:8px 0 4px 0;color:#0F172A;">' + esc(mt('mandarin.pinyin-title', '4 Core Pinyin Tones Trainer')) + '</h2>'
      + '<p style="font-size:12.5px;color:#475569;margin-bottom:12px;line-height:1.4;">' + esc(mt('mandarin.pinyin-sub', 'Mandarin is a tonal language. Changing the tone completely changes the word meaning.')) + '</p>'
      + '<div>' + cards + '</div>'
      + '<button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:800;margin-top:14px;background:#BE123C;padding:10px;" onclick="closeModal()">' + esc(mt('mandarin.btn-done', 'Done')) + '</button>'
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(html);
  }

  // =========================================================================
  // --- 4. MODAL STUDIO GORESAN HANZI (YONGZI BAFA & RADIKAL) ---
  // =========================================================================
  var _strokeCurrentTab = 'strokes';

  function openStrokeModal() {
    _strokeCurrentTab = 'strokes';
    renderStrokeModalContent();
  }

  function switchStrokeTab(tab) {
    _strokeCurrentTab = tab;
    renderStrokeModalContent();
  }

  function renderStrokeModalContent() {
    var strokes = [
      { name: 'Diǎn (点)', shape: '丶', desc: pickM('Slanted dot from top to bottom', 'Titik miring dari atas ke bawah', 'จุดเฉียงจากบนลงล่าง'), sample: '六 (Liù)' },
      { name: 'Héng (横)', shape: '一', desc: pickM('Flat horizontal stroke left to right', 'Garis horizontal datar kiri ke kanan', 'เส้นแนวนอนจากซ้ายไปขวา'), sample: '一 (Yī)' },
      { name: 'Shù (竖)', shape: '丨', desc: pickM('Straight vertical stroke', 'Garis vertikal tegak lurus', 'เส้นแนวตั้งตรง'), sample: '十 (Shí)' },
      { name: 'Piě (撇)', shape: '丿', desc: pickM('Sweeping curve down to the left', 'Goresan melengkung ke kiri bawah', 'ลากตวัดโค้งลงทางซ้าย'), sample: '人 (Rén)' },
      { name: 'Nà (捺)', shape: '乀', desc: pickM('Thick sweeping curve down to the right', 'Goresan melengkung tebal ke kanan bawah', 'ลากตวัดหนักลงทางขวา'), sample: '大 (Dà)' },
      { name: 'Tí (提)', shape: '㇀', desc: pickM('Quick upward stroke to the top right', 'Goresan menyodok cepat ke kanan atas', 'ตวัดเส้นขึ้นทางขวาบนอย่างเร็ว'), sample: '地 (Dì)' },
      { name: 'Zhé (折)', shape: '𠃍', desc: pickM('Turning stroke forming a sharp corner', 'Goresan berbelok menyudut', 'เส้นหักมุม'), sample: '口 (Kǒu)' },
      { name: 'Gōu (钩)', shape: '亅', desc: pickM('Stroke ending with a sharp hook', 'Goresan berujung kait tajam', 'เส้นที่มีตะขอปลาย'), sample: '小 (Xiǎo)' }
    ];

    var radicals = [
      { rad: '氵', name: 'Sān Diǎn Shuǐ', meaning: pickM('Water / Liquid', 'Air / Cairan', 'น้ำ / ของเหลว'), sample: pickM('河 (River), 海 (Sea)', '河 (Sungai), 海 (Laut)', '河 (แม่น้ำ), 海 (ทะเล)') },
      { rad: '亻', name: 'Dān Rén Páng', meaning: pickM('Person / Human', 'Manusia / Orang', 'คน / มนุษย์'), sample: pickM('你 (You), 他 (He)', '你 (Kamu), 他 (Dia)', '你 (คุณ), 他 (เขา)') },
      { rad: '讠', name: 'Yán Zì Páng', meaning: pickM('Speech / Language', 'Ucapan / Bahasa', 'คำพูด / ภาษา'), sample: pickM('说 (Speak), 话 (Word)', '说 (Bicara), 话 (Kata)', '说 (พูด), 话 (คำพูด)') },
      { rad: '口', name: 'Kǒu Zì Páng', meaning: pickM('Mouth / Oral action', 'Mulut / Aktivitas Mulut', 'ปาก / การกินพูด'), sample: pickM('吃 (Eat), 喝 (Drink)', '吃 (Makan), 喝 (Minum)', '吃 (กิน), 喝 (ดื่ม)') },
      { rad: '女', name: 'Nǚ Zì Páng', meaning: pickM('Woman / Female', 'Wanita / Keibuan', 'ผู้หญิง / มารดา'), sample: pickM('她 (She), 好 (Good)', '她 (Dia Pr), 好 (Baik)', '她 (เธอ), 好 (ดี)') },
      { rad: '木', name: 'Mù Zì Páng', meaning: pickM('Wood / Tree', 'Kayu / Tumbuhan', 'ไม้ / ต้นไม้'), sample: pickM('树 (Tree), 杯 (Cup)', '树 (Pohon), 杯 (Gelas)', '树 (ต้นไม้), 杯 (แก้ว)') },
      { rad: '心/忄', name: 'Xīn / Shù Xīn', meaning: pickM('Heart / Feeling', 'Hati / Perasaan', 'หัวใจ / ความรู้สึก'), sample: pickM('想 (Think/Miss), 快 (Fast)', '想 (Rindu), 快 (Cepat)', '想 (คิดถึง), 快 (เร็ว)') },
      { rad: '日', name: 'Rì Zì Páng', meaning: pickM('Sun / Time', 'Matahari / Waktu', 'ดวงอาทิตย์ / เวลา'), sample: pickM('明 (Bright), 早 (Morning)', '明 (Terang), 早 (Pagi)', '明 (สว่าง), 早 (เช้า)') }
    ];

    var isStrokes = (_strokeCurrentTab === 'strokes');

    var tabToggle = '<div style="display:flex;background:#F1F5F9;border-radius:10px;padding:3px;margin-bottom:12px;">'
      + '<button type="button" class="btn btn-sm" style="flex:1;border-radius:8px;font-weight:800;font-size:12px;background:' + (isStrokes ? '#FFFFFF;color:#BE123C;box-shadow:0 1px 3px rgba(0,0,0,0.06);' : 'transparent;color:#64748B;') + '" onclick="FiezelMandarinUI.switchStrokeTab(\'strokes\')">' + esc(mt('mandarin.tab-strokes', '8 Core Strokes')) + '</button>'
      + '<button type="button" class="btn btn-sm" style="flex:1;border-radius:8px;font-weight:800;font-size:12px;background:' + (!isStrokes ? '#FFFFFF;color:#BE123C;box-shadow:0 1px 3px rgba(0,0,0,0.06);' : 'transparent;color:#64748B;') + '" onclick="FiezelMandarinUI.switchStrokeTab(\'radicals\')">' + esc(mt('mandarin.tab-radicals', 'Essential Radicals')) + '</button>'
      + '</div>';

    var list = isStrokes
      ? strokes.map(function (s) {
        return '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">'
          + '<div style="display:flex;align-items:center;gap:12px;">'
          + '<span style="font-size:24px;color:#BE123C;font-family:var(--fz-font-cjk);width:32px;text-align:center;">' + s.shape + '</span>'
          + '<div>'
          + '<strong style="font-size:13.5px;color:#0F172A;">' + esc(s.name) + '</strong>'
          + '<div style="font-size:11.5px;color:#475569;">' + esc(s.desc) + '</div>'
          + '</div>'
          + '</div>'
          + '<span style="font-size:12px;font-weight:700;color:#64748B;font-family:var(--fz-font-cjk);">' + esc(s.sample) + '</span>'
          + '</div>';
      }).join('')
      : radicals.map(function (r) {
        return '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">'
          + '<div style="display:flex;align-items:center;gap:12px;">'
          + '<span style="font-size:22px;color:#0369A1;font-family:var(--fz-font-cjk);width:32px;text-align:center;">' + r.rad + '</span>'
          + '<div>'
          + '<strong style="font-size:13.5px;color:#0F172A;">' + esc(r.name) + ' · ' + esc(r.meaning) + '</strong>'
          + '<div style="font-size:11.5px;color:#475569;">' + esc(mt('mandarin.label-example', 'Example')) + ': ' + esc(r.sample) + '</div>'
          + '</div>'
          + '</div>'
          + '</div>';
      }).join('');

    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:520px;margin:auto;max-height:80vh;overflow-y:auto;padding:6px 2px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="' + esc(mt('common.tutup', 'Close')) + '"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">' + esc(mt('mandarin.badge-hanzi-anatomy', 'HANZI CHARACTER ANATOMY')) + '</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:8px 0 4px 0;color:#0F172A;">' + esc(mt('mandarin.stroke-title', 'Stroke & Radical Studio')) + '</h2>'
      + '<p style="font-size:12.5px;color:#475569;margin-bottom:12px;line-height:1.4;">' + esc(mt('mandarin.stroke-sub', 'Understanding strokes and radicals makes remembering and writing Hanzi characters accurately much easier.')) + '</p>'
      + tabToggle
      + '<div>' + list + '</div>'
      + '<button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:800;margin-top:14px;background:#BE123C;padding:10px;" onclick="closeModal()">' + esc(mt('mandarin.btn-done', 'Done')) + '</button>'
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(html);
  }

  // =========================================================================
  // --- 5. MODAL HUKUM SANDHI PERUBAHAN NADA ---
  // =========================================================================
  function openSandhiModal() {
    var sandhiIntro = pickM(
      'In natural, fluent speech, adjacent tones automatically shift to keep tongue articulation smooth.',
      'Dalam percakapan alami yang mengalir cepat, nada suku kata tertentu otomatis berubah demi efisiensi artikulasi lidah.',
      'ในการสนทนาจริงที่ไหลลื่น เสียงวรรณยุกต์บางพยางค์จะเปลี่ยนอัตโนมัติเพื่อให้ออกเสียงได้สะดวกขึ้น'
    );
    var s1Title = pickM('1. Double Tone 3 (3 + 3 ➔ 2 + 3)', '1. Nada 3 Kembar (3 + 3 ➔ 2 + 3)', '1. เสียง 3 ซ้อนกัน (3 + 3 ➔ 2 + 3)');
    var s1Desc = pickM(
      'When two Tone 3 syllables appear in a row, the first syllable shifts to Tone 2.',
      'Bila dua suku kata bernada 3 bertemu berturut-turut, suku kata pertama berubah jadi Nada 2.',
      'เมื่อพยางค์เสียง 3 สองตัวติดกัน พยางค์แรกจะเปลี่ยนเป็นเสียง 2'
    );
    var s2Desc = pickM(
      'Before another Tone 4 syllable, 不 (bù) shifts upward to Tone 2 (bú).',
      'Bila bertemu kata bernada 4 lain, kata 不 berubah jadi nada 2.',
      'เมื่ออยู่หน้าคำเสียง 4 คำว่า 不 จะเปลี่ยนเป็นเสียง 2 (bú)'
    );
    var s3Desc = pickM(
      'Before Tone 4 it shifts to Tone 2 (yí); before Tone 1, 2, or 3 it shifts to Tone 4 (yì).',
      'Sebelum nada 4 berubah jadi nada 2 (yí). Sebelum nada 1, 2, 3 jadi nada 4 (yì).',
      'หน้าเสียง 4 เปลี่ยนเป็นเสียง 2 (yí) ส่วนหน้าเสียง 1, 2, 3 เปลี่ยนเป็นเสียง 4 (yì)'
    );
    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:520px;margin:auto;max-height:80vh;overflow-y:auto;padding:6px 2px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="' + esc(mt('common.tutup', 'Close')) + '"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">' + esc(mt('mandarin.badge-sandhi', 'DYNAMIC PHONETICS')) + '</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:8px 0 4px 0;color:#0F172A;">' + esc(mt('mandarin.sandhi-title', 'Tone Change Rules (Tone Sandhi)')) + '</h2>'
      + '<p style="font-size:12.5px;color:#475569;margin-bottom:12px;line-height:1.4;">' + esc(sandhiIntro) + '</p>'
      + '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
      + '<strong style="font-size:13.5px;color:#BE123C;font-weight:700;">' + esc(s1Title) + '</strong>'
      + '<button type="button" class="btn btn-sm" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#0F172A;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'你好\')">' + esc(mt('mandarin.btn-listen', '🔊 Listen')) + '</button>'
      + '</div>'
      + '<p style="font-size:12px;color:#475569;margin:0 0 4px 0;line-height:1.35;">' + esc(s1Desc) + '</p>'
      + '<div style="font-size:12.5px;color:#0F172A;">' + esc(mt('mandarin.label-example', 'Example')) + ': 你好 (nǐ hǎo) ➔ <b>ní hǎo</b></div>'
      + '</div>'
      + '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
      + '<strong style="font-size:13.5px;color:#0284C7;font-weight:700;">2. "不" (bù ➔ bú)</strong>'
      + '<button type="button" class="btn btn-sm" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#0F172A;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'不是\')">' + esc(mt('mandarin.btn-listen', '🔊 Listen')) + '</button>'
      + '</div>'
      + '<p style="font-size:12px;color:#475569;margin:0 0 4px 0;line-height:1.35;">' + esc(s2Desc) + '</p>'
      + '<div style="font-size:12.5px;color:#0F172A;">' + esc(mt('mandarin.label-example', 'Example')) + ': 不是 (bù shì) ➔ <b>bú shì</b></div>'
      + '</div>'
      + '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
      + '<strong style="font-size:13.5px;color:#D97706;font-weight:700;">3. "一" (yī ➔ yí / yì)</strong>'
      + '<button type="button" class="btn btn-sm" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#0F172A;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'一个\')">' + esc(mt('mandarin.btn-listen', '🔊 Listen')) + '</button>'
      + '</div>'
      + '<p style="font-size:12px;color:#475569;margin:0 0 4px 0;line-height:1.35;">' + esc(s3Desc) + '</p>'
      + '<div style="font-size:12.5px;color:#0F172A;">' + esc(mt('mandarin.label-example', 'Example')) + ': 一个 (<b>yí gè</b>) · 一起 (<b>yì qǐ</b>)</div>'
      + '</div>'
      + '<button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:800;background:#BE123C;padding:10px;" onclick="closeModal()">' + esc(mt('mandarin.btn-done', 'Done')) + '</button>'
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(html);
  }

  // =========================================================================
  // --- 6. MODAL 24 CAN-DO SITUASI NYATA KOMUNIKATIF (INTERAKTIF & LENGKAP) ---
  // =========================================================================
  function openCanDoModal() {
    var candoScenarios = [
      { id: 'cd-1', hsk: 'HSK 1', hz: '点奶茶', py: 'Diǎn Nǎichá', title: pickM('Ordering Bubble Tea', 'Memesan Minuman Boba', 'สั่งชานมไข่มุก'), desc: pickM('Order milk tea with preferred sugar (半糖) and ice levels (去冰).', 'Bisa memesan teh susu boba dengan preferensi kadar gula (半糖) dan es (去冰).', 'สามารถสั่งชานมพร้อมเลือกระดับความหวาน (半糖) และน้ำแข็ง (去冰)') },
      { id: 'cd-2', hsk: 'HSK 1', hz: '问候介绍', py: 'Wènhòu Jièshào', title: pickM('Greetings & Self-Introduction', 'Salam & Perkenalan Diri', 'ทักทายและแนะนำตัว'), desc: pickM('Share your name, country, occupation, and greet others politely.', 'Bisa menyebutkan nama, asal negara, profesi, dan menyapa lawan bicara secara sopan.', 'สามารถบอกชื่อ ประเทศ อาชีพ และทักทายอย่างสุภาพ') },
      { id: 'cd-3', hsk: 'HSK 1', hz: '餐馆点菜', py: 'Cānguǎn Diǎncài', title: pickM('Ordering Food at a Restaurant', 'Pesan Makanan di Restoran', 'สั่งอาหารในร้าน'), desc: pickM('Request a menu, order favorite dishes, and ask for the check (买单).', 'Bisa meminta buku menu, memesan hidangan favorit, dan meminta bon pembayaran (买单).', 'สามารถขอดูเมนู สั่งอาหารจานโปรด และขอเช็กบิล (买单)') },
      { id: 'cd-4', hsk: 'HSK 2', hz: '问路打车', py: 'Wènlù Dǎchē', title: pickM('Asking Directions & Taking a Taxi', 'Tanya Arah & Naik Taksi', 'ถามทางและขึ้นแท็กซี่'), desc: pickM('Tell the driver your destination, left/right turns, and where to pull over (靠边停).', 'Bisa memberi tahu supir tujuan alamat, belokan kiri/kanan, dan tempat berhenti (靠边停).', 'บอกจุดหมายปลายทาง เลี้ยวซ้ายขวา และจุดจอด (靠边停) กับคนขับได้') },
      { id: 'cd-5', hsk: 'HSK 2', hz: '市场砍价', py: 'Shìchǎng Kǎnjià', title: pickM('Bargaining at the Market', 'Tawar-Menawar Belanja', 'ต่อรองราคาที่ตลาด'), desc: pickM('Ask prices, request a discount (便宜一点吧), and negotiate smoothly.', 'Bisa menanyakan harga, meminta diskon (便宜一点吧), dan menawar barang di pasar.', 'ถามราคา ขอลดราคา (便宜一点吧) และต่อรองอย่างเป็นธรรมชาติ') },
      { id: 'cd-6', hsk: 'HSK 2', hz: '乘坐地铁', py: 'Chéngzuò Dìtiě', title: pickM('Riding the MRT / Subway', 'Naik Kereta MRT / Subway', 'ขึ้นรถไฟใต้ดิน MRT'), desc: pickM('Read subway route maps, buy machine tickets, and transfer lines (换乘).', 'Bisa membaca peta jalur MRT, membeli tiket di mesin, dan berpindah jalur transit (换乘).', 'ดูแผนที่สายรถไฟ ซื้อตั๋วจากตู้ และเปลี่ยนสาย (换乘) ได้') },
      { id: 'cd-7', hsk: 'HSK 3', hz: '酒店入住', py: 'Jiǔdiàn Rùzhù', title: pickM('Hotel Room Check-in', 'Check-in Kamar Hotel', 'เช็กอินโรงแรม'), desc: pickM('Present your passport, confirm room reservation, and request WiFi password.', 'Bisa menunjukkan paspor, konfirmasi pesanan kamar, dan meminta kata sandi WiFi.', 'แสดงพาสปอร์ต ยืนยันการจอง และขอรหัส WiFi ได้') },
      { id: 'cd-8', hsk: 'HSK 3', hz: '看病买药', py: 'Kànbìng Mǎiyào', title: pickM('Doctor & Pharmacy Visit', 'Konsultasi Dokter & Apotek', 'พบแพทย์และซื้อยา'), desc: pickM('Describe flu, fever, and headache symptoms and understand dosage instructions.', 'Bisa menceritakan gejala flu, demam, sakit kepala, dan cara meminum dosis obat.', 'อธิบายอาการหวัด ไข้ ปวดศีรษะ และวิธีรับประทานยาได้') },
      { id: 'cd-9', hsk: 'HSK 3', hz: '银行开户', py: 'Yínháng Kāihù', title: pickM('Opening a Bank Account', 'Buka Rekening & Kartu Bank', 'เปิดบัญชีและบัตรธนาคาร'), desc: pickM('Fill out bank forms, activate a debit card, and link digital payment.', 'Bisa mengisi formulir bank, mengaktifkan kartu debit, dan menghubungkan pembayaran daring.', 'กรอกแบบฟอร์มธนาคาร เปิดใช้งานบัตร และเชื่อมระบบชำระเงินได้') },
      { id: 'cd-10', hsk: 'HSK 3', hz: '租房中介', py: 'Zūfáng Zhōngjiè', title: pickM('Renting an Apartment', 'Mencari Sewa Tempat Tinggal', 'ติดต่อเช่าที่พักอาศัย'), desc: pickM('Discuss monthly rent, home furnishings, and lease contract terms.', 'Bisa mendiskusikan biaya sewa bulanan, fasilitas perabotan rumah, dan menandatangani kontrak.', 'คุยเรื่องค่าเช่ารายเดือน เฟอร์นิเจอร์ และสัญญาเช่าได้') },
      { id: 'cd-11', hsk: 'HSK 3', hz: '退货换货', py: 'Tuìhuò Huànhuò', title: pickM('Returns & Exchanges', 'Retur & Tukar Barang Belanja', 'คืนและเปลี่ยนสินค้า'), desc: pickM('Explain product defects clearly and request a full refund or exchange.', 'Bisa menjelaskan alasan cacat barang pesanan dan meminta pengembalian dana penuh.', 'อธิบายตำหนิของสินค้าและขอคืนเงินหรือเปลี่ยนสินค้าได้') },
      { id: 'cd-12', hsk: 'HSK 4', hz: '职场面试', py: 'Zhíchǎng Miànshì', title: pickM('Professional Job Interview', 'Wawancara Kerja Profesional', 'สัมภาษณ์งานระดับมืออาชีพ'), desc: pickM('Present career history, specialized skills, and motivation cleanly.', 'Bisa memaparkan riwayat karir, keahlian khusus, dan motivasi bergabung ke perusahaan.', 'นำเสนอประวัติการทำงาน ทักษะเฉพาะทาง และแรงจูงใจได้อย่างชัดเจน') },
      { id: 'cd-13', hsk: 'HSK 4', hz: '商务谈判', py: 'Shāngwù Tánpàn', title: pickM('Business Deal Negotiation', 'Negosiasi Penawaran Bisnis', 'เจรจาข้อตกลงทางธุรกิจ'), desc: pickM('Negotiate wholesale prices, shipping deadlines, and partnership terms.', 'Bisa mendiskusikan harga grosir, batas waktu pengiriman kargo, dan klausul kerja sama.', 'ต่อรองราคาส่ง กำหนดเวลาจัดส่ง และเงื่อนไขความร่วมมือได้') },
      { id: 'cd-14', hsk: 'HSK 4', hz: '机场登机', py: 'Jīchǎng Dēngjī', title: pickM('Airport Check-in & Boarding', 'Check-in & Bagasi Pesawat', 'เช็กอินสนามบินและขึ้นเครื่อง'), desc: pickM('Confirm departure gate, baggage weight limit, and passport/visa inspection.', 'Bisa memeriksa nomor pintu keberangkatan, batas berat bagasi, dan paspor visa.', 'ตรวจสอบประตูขึ้นเครื่อง น้ำหนักกระเป๋า และเอกสารเดินทางได้') },
      { id: 'cd-15', hsk: 'HSK 4', hz: '快递收发', py: 'Kuàidì Shōufā', title: pickM('Parcel Pickup & Delivery', 'Pengiriman & Pengambilan Paket Ekspedisi', 'รับและส่งพัสดุ'), desc: pickM('Use smart parcel locker codes (快递柜) and schedule courier pickup.', 'Bisa memasukkan kode loker pintar (快递柜) dan menjadwalkan kurir penjemputan.', 'ใช้รหัสตู้รับพัสดุ (快递柜) และนัดหมายพนักงานขนส่งได้') },
      { id: 'cd-16', hsk: 'HSK 4', hz: '家电报修', py: 'Jiādiàn Bàoxiū', title: pickM('Reporting AC & Internet Repairs', 'Lapor Perbaikan AC & Internet', 'แจ้งซ่อมแอร์และอินเทอร์เน็ต'), desc: pickM('Contact repair technicians and schedule an apartment service visit.', 'Bisa menghubungi teknisi perbaikan dan menjadwalkan kunjungan servis ke apartemen.', 'ติดต่อช่างซ่อมบำรุงและนัดหมายเวลาเข้าซ่อมที่ห้องพักได้') },
      { id: 'cd-17', hsk: 'HSK 5', hz: '学术交流', py: 'Xuéshù Jiāoliú', title: pickM('Academic Seminars & Discussion', 'Diskusi Forum Ilmiah & Seminar', 'การเสวนาทางวิชาการ'), desc: pickM('Present research hypotheses, methodology, and answer audience questions.', 'Bisa memaparkan hipotesis penelitian, metodologi riset, dan menjawab pertanyaan audiens.', 'นำเสนอสมมติฐาน ระเบียบวิธีวิจัย และตอบคำถามผู้ฟังได้') },
      { id: 'cd-18', hsk: 'HSK 5', hz: '文化节庆', py: 'Wénhuà Jiéqìng', title: pickM('Lunar New Year Traditions', 'Tradisi Perayaan Tahun Baru Imlek', 'ประเพณีวันตรุษจีน'), desc: pickM('Explain festive greetings, family reunion dinners, and red envelopes.', 'Bisa menjelaskan makna ucapan selamat tahun baru, tradisi makan bersama, dan amplop merah.', 'อธิบายความหมายคำอวยพร มื้อค่ำรวมญาติ และซองอั่งเปาได้') },
      { id: 'cd-19', hsk: 'HSK 5', hz: '环保倡议', py: 'Huánbǎo Chàngyì', title: pickM('Environmental Sustainability', 'Kampanye Peduli Lingkungan Hidup', 'การรณรงค์รักษ์สิ่งแวดล้อม'), desc: pickM('Discuss recycling waste sorting and steps to cut carbon footprints.', 'Bisa berdiskusi mengenai pemilahan sampah daur ulang dan langkah pengurangan jejak karbon.', 'แลกเปลี่ยนความเห็นเรื่องการแยกขยะรีไซเคิลและการลดคาร์บอนฟุตพรินต์') },
      { id: 'cd-20', hsk: 'HSK 5', hz: '医疗急救', py: 'Yīliáo Jíjiù', title: pickM('Medical Emergencies & Ambulance', 'Situasi Darurat Medis & Ambulans', 'เหตุฉุกเฉินทางการแพทย์และรถพยาบาล'), desc: pickM('Report accident locations and patient vital condition to 120 dispatch.', 'Bisa melaporkan lokasi darurat kecelakaan dan kondisi vital pasien ke nomor 120.', 'แจ้งจุดเกิดเหตุฉุกเฉินและอาการผู้ป่วยแก่สายด่วน 120 ได้') },
      { id: 'cd-21', hsk: 'HSK 6', hz: '商务签约', py: 'Shāngwù Qiānyuē', title: pickM('Commercial Contract Signing', 'Penandatanganan Kontrak Dagang', 'การลงนามสัญญาทางการค้า'), desc: pickM('Confirm legal clauses, default penalties, and bilateral agreement terms.', 'Bisa mengonfirmasi klausul hukum, penalti wanprestasi, dan legalitas perjanjian bilateral.', 'ยืนยันข้อกฎหมาย ค่าปรับกรณีผิดสัญญา และความถูกต้องของข้อตกลงได้') },
      { id: 'cd-22', hsk: 'HSK 6', hz: '文史鉴赏', py: 'Wénshǐ Jiànshǎng', title: pickM('Classical Literature & Poetry', 'Apresiasi Sastra & Puisi Klasik', 'การชื่นชมวรรณคดีและกวีนิพนธ์คลาสสิก'), desc: pickM('Discuss Tang Dynasty poetic metaphors and four-character Chengyu idioms.', 'Bisa mendiskusikan metafora puisi Dinasti Tang dan filosofi peribahasa Chengyu empat karakter.', 'วิจารณ์อุปมาในบทกวีราชวงศ์ถังและสุภาษิตจีนสี่พยางค์ได้อย่างลึกซึ้ง') },
      { id: 'cd-23', hsk: 'HSK 6', hz: '哲学思辨', py: 'Zhéxué Sībiàn', title: pickM('Philosophical Discourse', 'Diskursus Dialektika Kehidupan', 'บทสนทนาเชิงปรัชญาชีวิต'), desc: pickM('Debate abstract concepts of fulfillment and human existence fluently.', 'Bisa berargumentasi secara abstrak mengenai makna kebahagiaan dan hakikat eksistensi manusia.', 'อภิปรายแนวคิดนามธรรมเรื่องความสุขและความหมายของการดำรงอยู่ได้') },
      { id: 'cd-24', hsk: 'HSK 6', hz: '外交礼仪', py: 'Wàijiāo Lǐyí', title: pickM('International Diplomatic Protocol', 'Protokoler Diplomasi Antarbangsa', 'พิธีการทูตระหว่างประเทศ'), desc: pickM('Use elevated formal register to welcome state guests and delegations.', 'Bisa menggunakan ragam bahasa formal tinggi untuk menyambut tamu kenegaraan dan delegasi.', 'ใช้ภาษาทางการระดับสูงเพื่อต้อนรับแขกบ้านแขกเมืองและคณะทูต') }
    ];

    var list = candoScenarios.map(function (c) {
      return '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
        + '<span style="font-size:10px;font-weight:800;background:#E0F2FE;color:#0369A1;padding:2px 8px;border-radius:6px;">' + c.hsk + '</span>'
        + '<strong style="font-size:14px;color:#BE123C;font-family:var(--fz-font-cjk);">' + esc(c.hz) + ' · ' + esc(c.py) + '</strong>'
        + '</div>'
        + '<h4 style="font-size:13.5px;font-weight:700;color:#0F172A;margin:2px 0 3px 0;">' + esc(c.title) + '</h4>'
        + '<p style="font-size:12px;color:#334155;margin:0 0 6px 0;line-height:1.4;">' + esc(c.desc) + '</p>'
        + '<button type="button" class="btn btn-sm" style="background:#FFF1F2;border:1px solid #FDA4AF;color:#BE123C;border-radius:8px;font-weight:700;font-size:11px;padding:4px 10px;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(c.hz) + '\')">' + esc(mt('mandarin.btn-pronounce', '🔊 Practice Pronunciation')) + '</button>'
        + '</div>';
    }).join('');

    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:540px;margin:auto;max-height:80vh;overflow-y:auto;padding:6px 2px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="' + esc(mt('common.tutup', 'Close')) + '"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">' + esc(mt('mandarin.badge-cando', 'COMMUNICATIVE SCENARIOS')) + '</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:8px 0 4px 0;color:#0F172A;">' + esc(mt('mandarin.cando-title', '24 Real-Life Conversation Can-Dos')) + '</h2>'
      + '<p style="font-size:12.5px;color:#475569;margin-bottom:12px;line-height:1.4;">' + esc(mt('mandarin.cando-sub', 'Practical communication skills for everyday life situations (HSK 1 to HSK 6).')) + '</p>'
      + '<div>' + list + '</div>'
      + '<button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:800;margin-top:14px;background:#BE123C;padding:10px;" onclick="closeModal()">' + esc(mt('mandarin.btn-done', 'Done')) + '</button>'
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(html);
  }

  // =========================================================================
  // --- 7. MODAL HSK VOCABULARY EXPLORER (2.194 KATA LENGKAP TANPA TRUNCATION) ---
  // =========================================================================
  var _vocabFilterLevel = 0; // 0 = all
  var _vocabSearchQuery = '';

  function openHskVocabModal() {
    _vocabFilterLevel = 0;
    _vocabSearchQuery = '';
    renderHskVocabModal();
  }

  function filterVocabByLevel(lvl) {
    _vocabFilterLevel = lvl;
    renderHskVocabModal();
  }

  function filterVocab(q) {
    _vocabSearchQuery = q || '';
    renderHskVocabModal();
  }

  function renderHskVocabModal() {
    var vModule = (typeof FiezelMandarinVocabBank !== 'undefined') ? FiezelMandarinVocabBank : null;
    var words = vModule ? vModule.getAll() : [];

    // Filter by level
    if (_vocabFilterLevel > 0) {
      words = words.filter(function (w) { return w.level === _vocabFilterLevel; });
    }

    // Filter by query
    if (_vocabSearchQuery.trim()) {
      var q = _vocabSearchQuery.trim().toLowerCase();
      words = words.filter(function (w) {
        return (w.hanzi && w.hanzi.indexOf(q) >= 0) ||
          (w.pinyin && w.pinyin.toLowerCase().indexOf(q) >= 0) ||
          (w.enMeaning && w.enMeaning.toLowerCase().indexOf(q) >= 0) ||
          (w.idMeaning && w.idMeaning.toLowerCase().indexOf(q) >= 0);
      });
    }

    var lvlTabs = [
      { lvl: 0, label: mt('mandarin.tab-all', 'All') },
      { lvl: 1, label: 'HSK 1' },
      { lvl: 2, label: 'HSK 2' },
      { lvl: 3, label: 'HSK 3' },
      { lvl: 4, label: 'HSK 4' },
      { lvl: 5, label: 'HSK 5' },
      { lvl: 6, label: 'HSK 6' }
    ];

    var tabsHtml = '<div style="display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;">'
      + lvlTabs.map(function (tab) {
        var isAct = (tab.lvl === _vocabFilterLevel);
        return '<button type="button" onclick="FiezelMandarinUI.filterVocabByLevel(' + tab.lvl + ')" style="white-space:nowrap;font-size:11px;font-weight:700;padding:4px 10px;border-radius:16px;border:' + (isAct ? '1.5px solid #BE123C' : '1px solid #E2E8F0') + ';background:' + (isAct ? '#FFE4E6' : '#FFFFFF') + ';color:' + (isAct ? '#BE123C' : '#334155') + ';cursor:pointer;">'
          + tab.label
          + '</button>';
      }).join('')
      + '</div>';

    var searchInput = '<div style="margin-bottom:12px;">'
      + '<input type="text" placeholder="' + esc(mt('mandarin.hsk-search-ph', 'Search Hanzi, Pinyin, or meaning...')) + '" value="' + esc(_vocabSearchQuery) + '" oninput="FiezelMandarinUI.filterVocab(this.value)" style="width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:10px;padding:8px 12px;font-size:13px;outline:none;" />'
      + '</div>';

    // Render cards (showing up to 80 per view with fast scroll)
    var cards = words.slice(0, 80).map(function (w) {
      return '<div class="fz-vocab-card" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:10px 12px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.02);display:flex;align-items:center;justify-content:space-between;">'
        + '<div style="display:flex;align-items:center;gap:12px;">'
        + '<div style="min-width:44px;text-align:center;">'
        + '<div style="font-size:20px;font-weight:800;color:#0F172A;font-family:var(--fz-font-cjk);">' + esc(w.hanzi) + '</div>'
        + '<div style="font-size:11px;color:#BE123C;font-family:var(--fz-font-pinyin);font-weight:700;">' + esc(w.pinyin) + '</div>'
        + '</div>'
        + '<div>'
        + '<div style="font-size:12.5px;font-weight:700;color:#0F172A;">' + esc(curLoc() === 'id' ? w.idMeaning : (w.enMeaning || w.idMeaning)) + '</div>'
        + (w.example && w.example.hz
          ? '<div style="font-size:11.5px;color:#64748B;font-family:var(--fz-font-cjk);">' + esc(w.example.hz) + (curLoc() === 'id' ? ' · <span style="font-family:sans-serif;">' + esc(w.example.id) + '</span>' : (w.example.en ? ' · <span style="font-family:sans-serif;">' + esc(w.example.en) + '</span>' : '')) + '</div>'
          : '')
        + '</div>'
        + '</div>'
        + '<button type="button" class="btn btn-sm" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(w.hanzi) + '\')">🔊</button>'
        + '</div>';
    }).join('');

    var countBadge = '<div style="font-size:11.5px;color:#64748B;margin-bottom:10px;">' + esc(mt('mandarin.hsk-showing', 'Showing {shown} of {total} words', { shown: Math.min(words.length, 80), total: words.length })) + '</div>';

    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:540px;margin:auto;max-height:85vh;overflow-y:auto;padding:6px 2px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="' + esc(mt('common.tutup', 'Close')) + '"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">' + esc(mt('mandarin.badge-hsk-dict', 'COMPLETE HSK DICTIONARY')) + '</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:6px 0 2px 0;color:#0F172A;">HSK Vocab Explorer (生词宝库)</h2>'
      + '<p style="font-size:12px;color:#475569;margin-bottom:10px;">' + esc(mt('mandarin.hsk-search-ph', 'Search Hanzi, Pinyin, or meaning...')) + '</p>'
      + tabsHtml
      + searchInput
      + countBadge
      + '<div>' + cards + '</div>'
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(html);
  }

  // =========================================================================
  // --- 8. MODAL BANK TATA BAHASA & MEASURE WORDS LAB ---
  // =========================================================================
  function openGrammarModal() {
    var gModule = (typeof FiezelMandarinGrammarBank !== 'undefined') ? FiezelMandarinGrammarBank : null;
    var patterns = gModule ? gModule.getAll() : [];

    var cards = patterns.slice(0, 30).map(function (g) {
      return '<div class="fz-grammar-card" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
        + '<span style="font-size:10px;font-weight:800;background:#E0F2FE;color:#0369A1;padding:2px 8px;border-radius:6px;">LEVEL ' + g.level + '</span>'
        + '<strong style="font-size:14px;color:#BE123C;font-weight:800;">' + esc(g.title) + '</strong>'
        + '</div>'
        + '<div style="font-size:12.5px;font-weight:700;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:6px 10px;color:#0F172A;font-family:monospace;margin:6px 0;">'
        + esc(g.formula)
        + '</div>'
        + '<p style="font-size:12px;color:#334155;margin:0 0 6px 0;line-height:1.4;">' + esc(g.explanationId) + '</p>'
        + (g.examples && g.examples[0]
          ? '<div style="font-size:12px;color:#BE123C;font-family:var(--fz-font-cjk);margin-bottom:2px;">' + esc(g.examples[0].hz) + '</div>'
            + '<div style="font-size:11.5px;color:#64748B;">' + esc(g.examples[0].id) + '</div>'
          : '')
        + '</div>';
    }).join('');

    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:540px;margin:auto;max-height:85vh;overflow-y:auto;padding:6px 2px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="' + esc(mt('common.tutup', 'Close')) + '"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">' + esc(mt('mandarin.badge-syntax', 'SYNTAX & FORMULAS')) + '</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:6px 0 2px 0;color:#0F172A;">' + esc(mt('mandarin.grammar-title', 'Grammar Bank (192 Patterns)')) + '</h2>'
      + '<p style="font-size:12px;color:#475569;margin-bottom:12px;">' + esc(mt('mandarin.grammar-sub', 'Sentence structures, verb aspects, and contrastive explanations.')) + '</p>'
      + '<div>' + cards + '</div>'
      + '<button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:800;margin-top:14px;background:#BE123C;padding:10px;" onclick="closeModal()">' + esc(mt('mandarin.btn-done', 'Done')) + '</button>'
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(html);
  }

  // =========================================================================
  // --- 9. RENDER LAUNCH CARDS DI DASHBOARD MANDARIN ---
  // =========================================================================
  function renderLatihanCards() {
    var cards = [
      {
        cls: 'zh-tone-card',
        glyph: '调',
        action: "FiezelMandarinUI.openPinyinModal()",
        title: mt('mandarin.card-pinyin-title', 'Pīnyīn (Tones)'),
        note: mt('mandarin.card-pinyin-note', '声调 · 4 tones & contours')
      },
      {
        cls: 'zh-stroke-card',
        glyph: '画',
        action: "FiezelMandarinUI.openStrokeModal()",
        title: mt('mandarin.card-stroke-title', 'Bǐhuà (Strokes)'),
        note: mt('mandarin.card-stroke-note', '笔画 · Hanzi strokes')
      },
      {
        cls: 'zh-sandhi-card',
        glyph: '变',
        action: "FiezelMandarinUI.openSandhiModal()",
        title: mt('mandarin.card-sandhi-title', 'Biàndiào (Tone Sandhi)'),
        note: mt('mandarin.card-sandhi-note', '变调 · tone change rules')
      },
      {
        cls: 'zh-cando-card',
        glyph: '景',
        action: "FiezelMandarinUI.openCanDoModal()",
        title: mt('mandarin.card-cando-title', 'Shíjǐng (Can-Do)'),
        note: mt('mandarin.card-cando-note', '实景 · 24 speaking situations')
      },
      {
        cls: 'zh-vocab-card',
        glyph: '词',
        action: "go('vocab')",
        title: mt('mandarin.card-vocab-title', 'Shēngcí (Vocabulary)'),
        note: mt('mandarin.card-vocab-note', '生词 · 2,194 words')
      },
      {
        cls: 'zh-grammar-card',
        glyph: '法',
        action: "go('grammar')",
        title: mt('mandarin.card-grammar-title', 'Yǔfǎ (Grammar)'),
        note: mt('mandarin.card-grammar-note', '语法 · 192 SVO patterns')
      },
      {
        cls: 'zh-mochi-card',
        glyph: '伴',
        action: "go('chat')",
        title: mt('mandarin.card-mochi-title', 'Xiao Mochi (Speaking)'),
        note: mt('mandarin.card-mochi-note', '小麻薯 · Speaking Partner')
      },
      {
        cls: 'zh-reading-card',
        glyph: '读',
        action: "go('reading')",
        title: mt('mandarin.card-reading-title', 'Yuèdú (Reading)'),
        note: mt('mandarin.card-reading-note', '阅读 · reading comprehension')
      },
      {
        cls: 'zh-writing-card',
        glyph: '写',
        action: "go('writing')",
        title: mt('mandarin.card-writing-title', 'Xiězì (Writing)'),
        note: mt('mandarin.card-writing-note', '汉字 · character writing')
      },
      {
        cls: 'zh-library-card',
        glyph: '馆',
        action: "go('library')",
        title: mt('mandarin.card-library-title', 'Túshūguǎn (Library)'),
        note: mt('mandarin.card-library-note', '图书 · reading library')
      }
    ];

    return cards.map(function (c) {
      return '<button type="button" class="launch-card ' + c.cls + '" onclick="' + c.action + '" aria-label="' + esc(c.title) + '">'
        + '<span class="launch-icon zh-glyph" aria-hidden="true">' + c.glyph + '</span>'
        + '<span><small>' + esc(c.note) + '</small><b>' + esc(c.title) + '</b></span>'
        + '<i data-lucide="arrow-up-right"></i>'
        + '</button>';
    }).join('');
  }

  // =========================================================================
  // --- 10. PEMILIH KURSUS 3 BAHASA (MANDARIN, JEPANG, INGGRIS) ---
  // =========================================================================
  function openCoursePickerModal() {
    var cur = (typeof window.activeTargetLang === 'function') ? window.activeTargetLang() : 'en';

    var courses = [
      {
        id: 'zh',
        flag: '🇨🇳',
        name: 'Bahasa Mandarin (Putonghua)',
        sub: 'HSK 1–6 · 192 Bab, Pinyin 4 Nada, Ruby Hanzi, Xiao Mochi & 24 Can-Do',
        badge: 'BARU · HSK ACADEMY'
      },
      {
        id: 'ja',
        flag: '🇯🇵',
        name: 'Bahasa Jepang (Nihongo)',
        sub: 'JLPT N5–N1 · Kana, 54 Can-Do Cards, 4.248 Pitch Accent & Chōkai',
        badge: 'LENGKAP JLPT'
      },
      {
        id: 'en',
        flag: '🇬🇧',
        name: 'Bahasa Inggris (English)',
        sub: 'CEFR A1–C2 · Vocabulary, Grammar, Reading, Speaking & Listening',
        badge: 'CEFR STANDARD'
      }
    ];

    var listHtml = courses.map(function (c) {
      var isAct = (c.id === cur);
      return '<div class="fz-course-option-card' + (isAct ? ' active' : '') + '" style="background:#FFFFFF;border:' + (isAct ? '2px solid #BE123C' : '1.5px solid #F1F5F9') + ';border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="FiezelMandarinUI.switchCourse(\'' + c.id + '\')">'
        + '<div style="display:flex;align-items:center;gap:12px;">'
        + '<div style="font-size:28px;">' + c.flag + '</div>'
        + '<div>'
        + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">'
        + '<h4 style="font-size:15px;font-weight:800;color:#0F172A;margin:0;">' + esc(c.name) + '</h4>'
        + '<span style="font-size:10px;font-weight:800;background:' + (isAct ? '#FFE4E6;color:#BE123C' : '#F1F5F9;color:#475569') + ';padding:2px 6px;border-radius:4px;">' + c.badge + '</span>'
        + '</div>'
        + '<p style="font-size:12px;color:#64748B;margin:0;">' + esc(c.sub) + '</p>'
        + '</div>'
        + '</div>'
        + (isAct
          ? '<span style="font-size:12px;font-weight:800;color:#BE123C;background:#FFE4E6;padding:4px 10px;border-radius:8px;">' + esc(mt('mandarin.course-active', 'Active ✓')) + '</span>'
          : '<button type="button" class="btn btn-sm btn-secondary" style="border-radius:8px;font-weight:700;">' + esc(mt('mandarin.course-choose', 'Select')) + '</button>')
        + '</div>';
    }).join('');

    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:520px;margin:auto;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="' + esc(mt('common.tutup', 'Close')) + '"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#E0F2FE;color:#0369A1;">MULTI-LANGUAGE ECOSYSTEM</span>'
      + '<h2 style="font-size:20px;font-weight:800;margin:6px 0 8px 0;">' + esc(mt('bahasa.judul', 'Choose Language')) + '</h2>'
      + '<p class="muted" style="font-size:13px;margin-bottom:16px;">' + esc(mt('mandarin.course-picker-sub', 'Each language course features its own tailored curriculum, tools, and native immersion.')) + '</p>'
      + '<div>' + listHtml + '</div>'
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(html);
  }

  async function switchCourse(nextCourse) {
    if (typeof window.closeModal === 'function') window.closeModal();
    if (typeof window.setTargetLangPreference === 'function') {
      await window.setTargetLangPreference(nextCourse);
    } else {
      localStorage.setItem('fz_target_course', nextCourse);
    }
    if (typeof window.render === 'function') window.render();
  }

  return {
    togglesMarkup: togglesMarkup,
    togglePinyin: togglePinyin,
    openPinyinModal: openPinyinModal,
    openStrokeModal: openStrokeModal,
    switchStrokeTab: switchStrokeTab,
    openSandhiModal: openSandhiModal,
    openCanDoModal: openCanDoModal,
    openHskVocabModal: openHskVocabModal,
    filterVocabByLevel: filterVocabByLevel,
    filterVocab: filterVocab,
    openGrammarModal: openGrammarModal,
    renderLatihanCards: renderLatihanCards,
    openCoursePickerModal: openCoursePickerModal,
    openCourseModal: openCoursePickerModal,
    switchCourse: switchCourse,
    playToneAudio: playToneAudio,
    openLessonPlayer: openLessonPlayer,
    setLessonStep: setLessonStep,
    submitQuizAnswer: submitQuizAnswer,
    openCurriculumMapModal: openCurriculumMapModal,
    setCurriculumMapLevel: setCurriculumMapLevel
  };
});
