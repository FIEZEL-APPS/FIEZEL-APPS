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

  // Web Audio Synthesizer untuk 4 Kontur Nada Pinyin (55, 35, 214, 51)
  function playSynthesizedTone(toneNumber, baseFreq) {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
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
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-CN';
        u.rate = 0.88;
        window.speechSynthesis.speak(u);
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

  function openLessonPlayer(lessonId, initialStep) {
    var currModule = (typeof FiezelMandarinCurriculum !== 'undefined') ? FiezelMandarinCurriculum : null;
    if (!currModule) return;

    var lesson = currModule.getLessonById(lessonId);
    if (!lesson) return;

    _activeLesson = lesson;
    _activeStep = initialStep || 1;
    _quizState = {};

    renderLessonPlayerModal();
  }

  function setLessonStep(stepNum) {
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
      { step: 1, label: '1. Kosakata', icon: '📖' },
      { step: 2, label: '2. Tata Bahasa', icon: '📐' },
      { step: 3, label: '3. Percakapan', icon: '💬' },
      { step: 4, label: '4. Kuis', icon: '✍️' },
      { step: 5, label: '5. AI Bicara', icon: '🎙️' }
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
          + '<div style="font-size:12px;color:#BE123C;font-weight:700;font-family:var(--fz-font-pinyin);margin-top:2px;">Karakter Inti Pelajaran #' + (idx + 1) + '</div>'
          + '</div>'
          + '<button type="button" class="btn btn-sm" style="background:#FFF1F2;border:1px solid #FDA4AF;color:#BE123C;border-radius:8px;font-weight:700;font-size:12px;padding:6px 12px;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(hz) + '\')">🔊 Suara</button>'
          + '</div>';
      }).join('');

      bodyHtml = '<div style="margin-bottom:14px;">'
        + '<h3 style="font-size:15px;font-weight:800;color:#0F172A;margin:0 0 6px 0;">Kosakata Inti Pelajaran</h3>'
        + '<p style="font-size:12px;color:#475569;margin:0 0 12px 0;">Dengarkan pelafalan nada Mandarin baku dan cermati bentuk karakternya.</p>'
        + '<div>' + wordsList + '</div>'
        + '</div>';

    } else if (step === 2) {
      // Step 2: Grammar Focus
      bodyHtml = '<div style="margin-bottom:14px;">'
        + '<div style="background:#FFF1F2;border:1.5px solid #FDA4AF;border-radius:12px;padding:12px 14px;margin-bottom:12px;">'
        + '<span style="font-size:10px;font-weight:800;background:#BE123C;color:#FFFFFF;padding:2px 8px;border-radius:6px;">RUMUS SINTAKSIS</span>'
        + '<h3 style="font-size:16px;font-weight:800;color:#BE123C;margin:6px 0 4px 0;">' + esc(l.grammarTopic) + '</h3>'
        + '<div style="font-size:13px;font-weight:700;color:#0F172A;background:#FFFFFF;border:1px solid #FDA4AF;border-radius:8px;padding:8px 10px;margin-top:6px;font-family:monospace;">' + esc(l.grammarFormula) + '</div>'
        + '</div>'
        + '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;margin-bottom:12px;">'
        + '<h4 style="font-size:13px;font-weight:700;color:#0F172A;margin:0 0 4px 0;">Analisis Kontrastif Bahasa Indonesia</h4>'
        + '<p style="font-size:12px;color:#475569;margin:0;line-height:1.4;">Di bahasa Mandarin, keterangan waktu dan tempat diletakkan secara teratur sebelum kata kerja utama. Berbeda dengan bahasa Indonesia yang lebih fleksibel di akhir kalimat.</p>'
        + '</div>'
        + '</div>';

    } else if (step === 3) {
      // Step 3: Dialogue Karaoke & Shadowing
      var dialogueTurns = (l.dialogue || []).map(function (d, idx) {
        var isMochi = d.speaker.indexOf('Mochi') >= 0;
        return '<div style="background:' + (isMochi ? '#FFF1F2' : '#F8FAFC') + ';border:1px solid ' + (isMochi ? '#FDA4AF' : '#E2E8F0') + ';border-radius:12px;padding:12px 14px;margin-bottom:10px;">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
          + '<strong style="font-size:12px;color:' + (isMochi ? '#BE123C' : '#0369A1') + ';font-weight:800;">' + esc(d.speaker) + '</strong>'
          + '<button type="button" class="btn btn-sm" style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:6px;font-size:11px;padding:2px 8px;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(d.hz) + '\')">🔊 Dengarkan</button>'
          + '</div>'
          + '<div style="font-size:16px;font-weight:800;color:#0F172A;font-family:var(--fz-font-cjk);margin-bottom:2px;">' + esc(d.hz) + '</div>'
          + '<div style="font-size:12px;color:#BE123C;font-family:var(--fz-font-pinyin);margin-bottom:2px;">' + esc(d.py) + '</div>'
          + '<div style="font-size:12px;color:#475569;">' + esc(d.id) + '</div>'
          + '</div>';
      }).join('');

      bodyHtml = '<div style="margin-bottom:14px;">'
        + '<h3 style="font-size:15px;font-weight:800;color:#0F172A;margin:0 0 4px 0;">Percakapan Bersama Xiao Mochi</h3>'
        + '<p style="font-size:12px;color:#475569;margin:0 0 10px 0;">Simak alur percakapan kontekstual dan ikuti teknik *shadowing* bersuara.</p>'
        + '<div>' + dialogueTurns + '</div>'
        + '</div>';

    } else if (step === 4) {
      // Step 4: Braincore Quiz
      var quizzes = l.quiz || [];
      var quizHtml = quizzes.map(function (q, qIdx) {
        var answered = _quizState[qIdx];
        var isAnswered = (answered !== undefined);
        var isCorrect = isAnswered && (answered === q.answerIndex);
        var chosenWrong = (!isCorrect && isAnswered && q.options && q.distractors)
          ? q.distractors.find(function (d) { return d.option === q.options[answered]; })
          : null;
        var whyFailsText = chosenWrong ? chosenWrong.whyFailsId : 'Pilihan ini belum tepat untuk konteks kalimat.';
        var misconceptionText = chosenWrong ? chosenWrong.misconceptionId : '';

        var tutorFeedback = '';
        if (isAnswered) {
          if (isCorrect) {
            tutorFeedback = '<div style="margin-top:10px;font-size:12px;color:#16A34A;background:#F0FDF4;border:1px solid #BBF7D0;padding:10px 12px;border-radius:10px;">'
              + '<div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:12.5px;margin-bottom:3px;"><span>🌟</span> ' + (typeof FiezelI18n !== 'undefined' && FiezelI18n.t ? FiezelI18n.t('quiz.verdict-correct') : 'Jawaban Tepat!') + '</div>'
              + '<div>' + esc(q.explanation || 'Susunan dan pilihan jawaban sudah tepat!') + '</div>'
              + '</div>';
          } else {
            tutorFeedback = '<div style="margin-top:10px;font-size:12px;color:#991B1B;background:#FEF2F2;border:1.5px solid #FECACA;padding:10px 12px;border-radius:10px;">'
              + '<div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:12.5px;color:#DC2626;margin-bottom:4px;"><span>🎓</span> Tutor FIEZEL:</div>'
              + '<div style="line-height:1.4;margin-bottom:4px;">' + esc(whyFailsText) + '</div>'
              + (misconceptionText ? '<div style="font-size:11px;color:#BE123C;font-weight:700;background:#FFF1F2;padding:3px 8px;border-radius:6px;display:inline-block;margin-top:4px;">💡 Pola: ' + esc(misconceptionText) + '</div>' : '')
              + (q.reasoningOperationId ? (function () {
                  var steps = q.reasoningOperationId.split(/\s*->\s*/);
                  return '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #FDA4AF;">'
                    + '<div style="font-size:11px;font-weight:800;color:#0F172A;margin-bottom:4px;">TUNTUNAN LANGKAH LOGIS:</div>'
                    + steps.map(function (s, sIdx) {
                        return '<div style="font-size:11.5px;color:#475569;margin-bottom:2px;"><b>Langkah ' + (sIdx + 1) + ':</b> ' + esc(s) + '</div>';
                      }).join('')
                    + '</div>';
                })() : '')
              + '</div>';
          }
        }

        return '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
          + '<div style="font-size:11px;font-weight:800;color:#BE123C;margin-bottom:4px;">SOAL #' + (qIdx + 1) + ' · ' + (q.type === 'reorder' ? 'SUSUN KATA' : 'MELENGKAPI') + '</div>'
          + '<div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:8px;">' + esc(q.prompt) + '</div>'
          + (q.type === 'cloze'
            ? '<div style="font-size:15px;font-weight:800;color:#BE123C;margin-bottom:10px;font-family:var(--fz-font-cjk);">' + esc(q.sentence || '') + '</div>'
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
              + '</div>'
            : '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px;font-size:14px;font-weight:700;color:#0F172A;font-family:var(--fz-font-cjk);">' + esc(q.sentenceHz || '') + '</div>')
          + tutorFeedback
          + '</div>';
      }).join('');

      bodyHtml = '<div style="margin-bottom:14px;">'
        + '<h3 style="font-size:15px;font-weight:800;color:#0F172A;margin:0 0 4px 0;">Kuis Evaluasi Pemahaman</h3>'
        + '<p style="font-size:12px;color:#475569;margin:0 0 10px 0;">Uji penguasaan kosakata dan rumus sintaksis pelajaran ini.</p>'
        + '<div>' + quizHtml + '</div>'
        + '</div>';

    } else if (step === 5) {
      // Step 5: AI Speaking Roleplay with Xiao Mochi
      var ai = l.aiSpeaking || {};
      bodyHtml = '<div style="margin-bottom:14px;">'
        + '<div style="background:#FFF1F2;border:1.5px solid #FDA4AF;border-radius:14px;padding:14px;margin-bottom:12px;text-align:center;">'
        + '<div style="font-size:36px;margin-bottom:4px;">🍡</div>'
        + '<h3 style="font-size:17px;font-weight:800;color:#BE123C;margin:0 0 4px 0;">Xiao Mochi (小麻薯)</h3>'
        + '<p style="font-size:12px;color:#475569;margin:0 0 10px 0;">Mitra AI Bahasa Mandarin FIEZEL · Putonghua Standar Beijing</p>'
        + '<div style="background:#FFFFFF;border:1px solid #FDA4AF;border-radius:10px;padding:10px 12px;font-size:13.5px;font-weight:700;color:#0F172A;font-family:var(--fz-font-cjk);margin-bottom:10px;">'
        + '“' + esc(ai.openingLine || '你好！准备好练习了吗？') + '”'
        + '</div>'
        + '<button type="button" class="btn btn-sm" style="background:#BE123C;color:#FFFFFF;border-radius:8px;font-weight:800;font-size:13px;padding:8px 16px;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(ai.openingLine || '你好') + '\')">🔊 Dengarkan Kalimat Pembuka</button>'
        + '</div>'
        + '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;margin-bottom:12px;">'
        + '<h4 style="font-size:13px;font-weight:700;color:#0F172A;margin:0 0 6px 0;">Misi Percakapan Murid:</h4>'
        + '<div style="font-size:12.5px;color:#334155;line-height:1.4;">' + esc(ai.scenario || l.scenario) + '</div>'
        + '</div>'
        + '</div>';
    }

    var footerHtml = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #F1F5F9;padding-top:12px;margin-top:14px;">'
      + (step > 1
        ? '<button type="button" class="btn btn-secondary" style="border-radius:10px;font-weight:700;padding:8px 16px;" onclick="FiezelMandarinUI.setLessonStep(' + (step - 1) + ')">← Sebelumnya</button>'
        : '<div></div>')
      + (step < 5
        ? '<button type="button" class="btn btn-primary" style="background:#BE123C;border-radius:10px;font-weight:800;padding:8px 20px;" onclick="FiezelMandarinUI.setLessonStep(' + (step + 1) + ')">Lanjut Langkah ' + (step + 1) + ' →</button>'
        : '<button type="button" class="btn btn-primary" style="background:#16A34A;border-radius:10px;font-weight:800;padding:8px 20px;" onclick="closeModal()">Selesai &amp; Catat Kemajuan ✓</button>')
      + '</div>';

    var modalHtml = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:560px;margin:auto;max-height:85vh;overflow-y:auto;padding:8px 4px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="Tutup"><i data-lucide="x"></i></button>'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'
      + '<span style="font-size:10px;font-weight:800;background:#FFE4E6;color:#BE123C;padding:2px 8px;border-radius:6px;">LEVEL ' + l.level + ' · BAB ' + l.num + '</span>'
      + '<span style="font-size:11px;color:#64748B;font-weight:700;">⏱️ ' + esc(l.durationLabel) + ' · +' + l.exp + ' EXP</span>'
      + '</div>'
      + '<h2 style="font-size:18px;font-weight:800;color:#0F172A;margin:2px 0 10px 0;">' + esc(l.title) + ' · <span style="font-family:var(--fz-font-cjk);color:#BE123C;">' + esc(l.titleZh) + '</span></h2>'
      + pillsHtml
      + bodyHtml
      + footerHtml
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(modalHtml);
  }

  function submitQuizAnswer(qIdx, oIdx) {
    _quizState[qIdx] = oIdx;
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
          + '<button type="button" class="btn btn-sm" style="background:#FFF1F2;border:1px solid #FDA4AF;color:#BE123C;border-radius:8px;font-weight:700;font-size:12px;padding:6px 12px;cursor:pointer;" onclick="' + actionCall + '">Buka Unit</button>'
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
          + '<p style="font-size:11.5px;color:#64748B;margin:0;">Tata bahasa: <b>' + esc(l.grammarTopic) + '</b></p>'
          + '</div>'
          + '<button type="button" class="btn btn-sm" style="background:#BE123C;color:#FFFFFF;border-radius:8px;font-weight:800;font-size:12px;padding:6px 14px;cursor:pointer;" onclick="FiezelMandarinUI.openLessonPlayer(\'' + l.id + '\')">Belajar</button>'
          + '</div>';
      }).join('');

      contentHtml = '<div>' + lessonList + '</div>';
    }

    var modalHtml = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:580px;margin:auto;max-height:85vh;overflow-y:auto;padding:8px 4px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="Tutup"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">SILABUS LENGKAP 192 BAB</span>'
      + '<h2 style="font-size:18px;font-weight:800;color:#0F172A;margin:6px 0 2px 0;">Peta Jalur Belajar Mandarin</h2>'
      + '<p style="font-size:12px;color:#64748B;margin:0 0 12px 0;">Pilih tingkatan untuk melihat daftar materi berjenjang dari fondasi hingga mahir.</p>'
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
      { num: 1, title: 'Nada 1 · Datar Tinggi', py: 'mā', hz: '妈', meaning: 'Ibu', desc: 'Pelafalan stabil dan tinggi seperti bernyanyi.', sample: 'mā', pair: 'bā (八 · Delapan)' },
      { num: 2, title: 'Nada 2 · Naik Cepat', py: 'má', hz: '麻', meaning: 'Rami', desc: 'Pelafalan naik cepat seperti nada heran: "Hah?!".', sample: 'má', pair: 'bá (拔 · Mencabut)' },
      { num: 3, title: 'Nada 3 · Turun-Naik', py: 'mǎ', hz: '马', meaning: 'Kuda', desc: 'Pelafalan turun rendah lalu mengayun lembut ke atas.', sample: 'mǎ', pair: 'bǎ (把 · Menggenggam)' },
      { num: 4, title: 'Nada 4 · Turun Tegas', py: 'mà', hz: '骂', meaning: 'Memarahi', desc: 'Pelafalan turun tajam dan tegas seperti instruksi.', sample: 'mà', pair: 'bà (爸 · Ayah)' },
      { num: 0, title: 'Nada Netral · Ringan', py: 'ma', hz: '吗', meaning: 'Partikel tanya', desc: 'Diucapkan sangat ringan, pendek, dan rileks.', sample: 'ma', pair: 'ba (吧 · Partikel ajakan)' }
    ];

    var cards = tones.map(function (tItem) {
      return '<div class="fz-tone-box" style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">'
        + '<div style="display:flex;align-items:center;gap:8px;">'
        + '<span class="fz-tone-tag" style="font-size:11px;font-weight:800;background:#FFF1F2;color:#BE123C;padding:2px 8px;border-radius:6px;">' + esc(tItem.title) + '</span>'
        + '<strong style="font-size:16px;color:#0F172A;font-family:var(--fz-font-cjk);">' + esc(tItem.hz) + ' · ' + esc(tItem.py) + '</strong>'
        + '</div>'
        + '<button type="button" class="btn btn-sm" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#0F172A;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(tItem.sample) + '\', ' + tItem.num + ')">🔊 Dengarkan</button>'
        + '</div>'
        + '<div style="font-size:12px;color:#334155;margin-bottom:4px;">' + esc(tItem.desc) + '</div>'
        + '<div style="font-size:11.5px;color:#64748B;">Arti: <b>' + esc(tItem.meaning) + '</b> · Pasangan: <i>' + esc(tItem.pair) + '</i></div>'
        + '</div>';
    }).join('');

    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:520px;margin:auto;max-height:80vh;overflow-y:auto;padding:6px 2px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="Tutup"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">FONETIK MANDARIN</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:8px 0 4px 0;color:#0F172A;">Pelatih 4 Nada Utama Pinyin</h2>'
      + '<p style="font-size:12.5px;color:#475569;margin-bottom:12px;line-height:1.4;">Bahasa Mandarin adalah bahasa bernada. Perubahan nada mengubah makna kata secara total.</p>'
      + '<div>' + cards + '</div>'
      + '<button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:800;margin-top:14px;background:#BE123C;padding:10px;" onclick="closeModal()">Selesai</button>'
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
      { name: 'Diǎn (点)', shape: '丶', desc: 'Titik miring dari atas ke bawah', sample: '六 (Liù)' },
      { name: 'Héng (横)', shape: '一', desc: 'Garis horizontal datar kiri ke kanan', sample: '一 (Yī)' },
      { name: 'Shù (竖)', shape: '丨', desc: 'Garis vertikal tegak lurus', sample: '十 (Shí)' },
      { name: 'Piě (撇)', shape: '丿', desc: 'Goresan melengkung ke kiri bawah', sample: '人 (Rén)' },
      { name: 'Nà (捺)', shape: '乀', desc: 'Goresan melengkung tebal ke kanan bawah', sample: '大 (Dà)' },
      { name: 'Tí (提)', shape: '㇀', desc: 'Goresan menyodok cepat ke kanan atas', sample: '地 (Dì)' },
      { name: 'Zhé (折)', shape: '𠃍', desc: 'Goresan berbelok menyudut', sample: '口 (Kǒu)' },
      { name: 'Gōu (钩)', shape: '亅', desc: 'Goresan berujung kait tajam', sample: '小 (Xiǎo)' }
    ];

    var radicals = [
      { rad: '氵', name: 'Sān Diǎn Shuǐ', meaning: 'Air / Cairan', sample: '河 (Sungai), 海 (Laut)' },
      { rad: '亻', name: 'Dān Rén Páng', meaning: 'Manusia / Orang', sample: '你 (Kamu), 他 (Dia)' },
      { rad: '讠', name: 'Yán Zì Páng', meaning: 'Ucapan / Bahasa', sample: '说 (Bicara), 话 (Kata)' },
      { rad: '口', name: 'Kǒu Zì Páng', meaning: 'Mulut / Aktivitas Mulut', sample: '吃 (Makan), 喝 (Minum)' },
      { rad: '女', name: 'Nǚ Zì Páng', meaning: 'Wanita / Keibuan', sample: '她 (Dia Pr), 好 (Baik)' },
      { rad: '木', name: 'Mù Zì Páng', meaning: 'Kayu / Tumbuhan', sample: '树 (Pohon), 杯 (Gelas)' },
      { rad: '心/忄', name: 'Xīn / Shù Xīn', meaning: 'Hati / Perasaan', sample: '想 (Rindu), 快 (Cepat)' },
      { rad: '日', name: 'Rì Zì Páng', meaning: 'Matahari / Waktu', sample: '明 (Terang), 早 (Pagi)' }
    ];

    var isStrokes = (_strokeCurrentTab === 'strokes');

    var tabToggle = '<div style="display:flex;background:#F1F5F9;border-radius:10px;padding:3px;margin-bottom:12px;">'
      + '<button type="button" class="btn btn-sm" style="flex:1;border-radius:8px;font-weight:800;font-size:12px;background:' + (isStrokes ? '#FFFFFF;color:#BE123C;box-shadow:0 1px 3px rgba(0,0,0,0.06);' : 'transparent;color:#64748B;') + '" onclick="FiezelMandarinUI.switchStrokeTab(\'strokes\')">8 Goresan Utama</button>'
      + '<button type="button" class="btn btn-sm" style="flex:1;border-radius:8px;font-weight:800;font-size:12px;background:' + (!isStrokes ? '#FFFFFF;color:#BE123C;box-shadow:0 1px 3px rgba(0,0,0,0.06);' : 'transparent;color:#64748B;') + '" onclick="FiezelMandarinUI.switchStrokeTab(\'radicals\')">Radikal Esensial</button>'
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
          + '<div style="font-size:11.5px;color:#475569;">Contoh: ' + esc(r.sample) + '</div>'
          + '</div>'
          + '</div>'
          + '</div>';
      }).join('');

    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:520px;margin:auto;max-height:80vh;overflow-y:auto;padding:6px 2px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="Tutup"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">ANATOMI KARAKTER HANZI</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:8px 0 4px 0;color:#0F172A;">Studio Goresan & Radikal</h2>'
      + '<p style="font-size:12.5px;color:#475569;margin-bottom:12px;line-height:1.4;">Memahami goresan dan radikal mempermudah mengingat serta menulis karakter Hanzi secara presisi.</p>'
      + tabToggle
      + '<div>' + list + '</div>'
      + '<button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:800;margin-top:14px;background:#BE123C;padding:10px;" onclick="closeModal()">Selesai</button>'
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(html);
  }

  // =========================================================================
  // --- 5. MODAL HUKUM SANDHI PERUBAHAN NADA ---
  // =========================================================================
  function openSandhiModal() {
    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:520px;margin:auto;max-height:80vh;overflow-y:auto;padding:6px 2px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="Tutup"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">FONETIK DINAMIS</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:8px 0 4px 0;color:#0F172A;">Hukum Perubahan Nada (Tone Sandhi)</h2>'
      + '<p style="font-size:12.5px;color:#475569;margin-bottom:12px;line-height:1.4;">Dalam percakapan alami yang mengalir cepat, nada suku kata tertentu otomatis berubah demi efisiensi artikulasi lidah.</p>'
      + '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
      + '<strong style="font-size:13.5px;color:#BE123C;font-weight:700;">1. Nada 3 Kembar (3 + 3 ➔ 2 + 3)</strong>'
      + '<button type="button" class="btn btn-sm" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#0F172A;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'你好\')">🔊 Dengarkan</button>'
      + '</div>'
      + '<p style="font-size:12px;color:#475569;margin:0 0 4px 0;line-height:1.35;">Bila dua suku kata bernada 3 bertemu berturut-turut, suku kata pertama berubah jadi Nada 2.</p>'
      + '<div style="font-size:12.5px;color:#0F172A;">Contoh: 你好 (nǐ hǎo) ➔ dibaca <b>ní hǎo</b></div>'
      + '</div>'
      + '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
      + '<strong style="font-size:13.5px;color:#0284C7;font-weight:700;">2. Kata Tidak "不" (bù ➔ bú)</strong>'
      + '<button type="button" class="btn btn-sm" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#0F172A;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'不是\')">🔊 Dengarkan</button>'
      + '</div>'
      + '<p style="font-size:12px;color:#475569;margin:0 0 4px 0;line-height:1.35;">Bila bertemu kata bernada 4 lain, kata 不 berubah jadi nada 2.</p>'
      + '<div style="font-size:12.5px;color:#0F172A;">Contoh: 不是 (bù shì) ➔ dibaca <b>bú shì</b></div>'
      + '</div>'
      + '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
      + '<strong style="font-size:13.5px;color:#D97706;font-weight:700;">3. Kata Satu "一" (yī ➔ yí / yì)</strong>'
      + '<button type="button" class="btn btn-sm" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#0F172A;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'一个\')">🔊 Dengarkan</button>'
      + '</div>'
      + '<p style="font-size:12px;color:#475569;margin:0 0 4px 0;line-height:1.35;">Sebelum nada 4 berubah jadi nada 2 (yí). Sebelum nada 1, 2, 3 jadi nada 4 (yì).</p>'
      + '<div style="font-size:12.5px;color:#0F172A;">Contoh: 一个 (<b>yí gè</b>) · 一起 (<b>yì qǐ</b>)</div>'
      + '</div>'
      + '<button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:800;background:#BE123C;padding:10px;" onclick="closeModal()">Selesai</button>'
      + '</div>';

    if (typeof window.openModal === 'function') window.openModal(html);
  }

  // =========================================================================
  // --- 6. MODAL 24 CAN-DO SITUASI NYATA KOMUNIKATIF (INTERAKTIF & LENGKAP) ---
  // =========================================================================
  function openCanDoModal() {
    var candoScenarios = [
      { id: 'cd-1', hsk: 'HSK 1', hz: '点奶茶', py: 'Diǎn Nǎichá', title: 'Memesan Minuman Boba', desc: 'Bisa memesan teh susu boba dengan preferensi kadar gula (半糖) dan es (去冰).' },
      { id: 'cd-2', hsk: 'HSK 1', hz: '问候介绍', py: 'Wènhòu Jièshào', title: 'Salam & Perkenalan Diri', desc: 'Bisa menyebutkan nama, asal negara, profesi, dan menyapa lawan bicara secara sopan.' },
      { id: 'cd-3', hsk: 'HSK 1', hz: '餐馆点菜', py: 'Cānguǎn Diǎncài', title: 'Pesan Makanan di Restoran', desc: 'Bisa meminta buku menu, memesan hidangan favorit, dan meminta bon pembayaran (买单).' },
      { id: 'cd-4', hsk: 'HSK 2', hz: '问路打车', py: 'Wènlù Dǎchē', title: 'Tanya Arah & Naik Taksi', desc: 'Bisa memberi tahu supir tujuan alamat, belokan kiri/kanan, dan tempat berhenti (靠边停).' },
      { id: 'cd-5', hsk: 'HSK 2', hz: '市场砍价', py: 'Shìchǎng Kǎnjià', title: 'Tawar-Menawar Belanja', desc: 'Bisa menanyakan harga, meminta diskon (便宜一点吧), dan menawar barang di pasar.' },
      { id: 'cd-6', hsk: 'HSK 2', hz: '乘坐地铁', py: 'Chéngzuò Dìtiě', title: 'Naik Kereta MRT / Subway', desc: 'Bisa membaca peta jalur MRT, membeli tiket di mesin, dan berpindah jalur transit (换乘).' },
      { id: 'cd-7', hsk: 'HSK 3', hz: '酒店入住', py: 'Jiǔdiàn Rùzhù', title: 'Check-in Kamar Hotel', desc: 'Bisa menunjukkan paspor, konfirmasi pesanan kamar, dan meminta kata sandi WiFi.' },
      { id: 'cd-8', hsk: 'HSK 3', hz: '看病买药', py: 'Kànbìng Mǎiyào', title: 'Konsultasi Dokter & Apotek', desc: 'Bisa menceritakan gejala flu, demam, sakit kepala, dan cara meminum dosis obat.' },
      { id: 'cd-9', hsk: 'HSK 3', hz: '银行开户', py: 'Yínháng Kāihù', title: 'Buka Rekening & Kartu Bank', desc: 'Bisa mengisi formulir bank, mengaktifkan kartu debit, dan menghubungkan pembayaran daring.' },
      { id: 'cd-10', hsk: 'HSK 3', hz: '租房中介', py: 'Zūfáng Zhōngjiè', title: 'Mencari Sewa Tempat Tinggal', desc: 'Bisa mendiskusikan biaya sewa bulanan, fasilitas perabotan rumah, dan menandatangani kontrak.' },
      { id: 'cd-11', hsk: 'HSK 3', hz: '退货换货', py: 'Tuìhuò Huànhuò', title: 'Retur & Tukar Barang Belanja', desc: 'Bisa menjelaskan alasan cacat barang pesanan dan meminta pengembalian dana penuh.' },
      { id: 'cd-12', hsk: 'HSK 4', hz: '职场面试', py: 'Zhíchǎng Miànshì', title: 'Wawancara Kerja Profesional', desc: 'Bisa memaparkan riwayat karir, keahlian khusus, dan motivasi bergabung ke perusahaan.' },
      { id: 'cd-13', hsk: 'HSK 4', hz: '商务谈判', py: 'Shāngwù Tánpàn', title: 'Negosiasi Penawaran Bisnis', desc: 'Bisa mendiskusikan harga grosir, batas waktu pengiriman kargo, dan klausul kerja sama.' },
      { id: 'cd-14', hsk: 'HSK 4', hz: '机场登机', py: 'Jīchǎng Dēngjī', title: 'Check-in & Bagasi Pesawat', desc: 'Bisa memeriksa nomor pintu keberangkatan, batas berat bagasi, dan paspor visa.' },
      { id: 'cd-15', hsk: 'HSK 4', hz: '快递收发', py: 'Kuàidì Shōufā', title: 'Kirim & Ambil Paket Ekspedisi', desc: 'Bisa memasukkan kode loker pintar (快递柜) dan menjadwalkan kurir penjemputan.' },
      { id: 'cd-16', hsk: 'HSK 4', hz: '家电报修', py: 'Jiādiàn Bàoxiū', title: 'Lapor Perbaikan AC & Internet', desc: 'Bisa menghubungi teknisi perbaikan dan menjadwalkan kunjungan servis ke apartemen.' },
      { id: 'cd-17', hsk: 'HSK 5', hz: '学术交流', py: 'Xuéshù Jiāoliú', title: 'Diskusi Forum Ilmiah & Seminar', desc: 'Bisa memaparkan hipotesis penelitian, metodologi riset, dan menjawab pertanyaan audiens.' },
      { id: 'cd-18', hsk: 'HSK 5', hz: '文化节庆', py: 'Wénhuà Jiéqìng', title: 'Tradisi Perayaan Tahun Baru Imlek', desc: 'Bisa menjelaskan makna ucapan selamat tahun baru, tradisi makan bersama, dan amplop merah.' },
      { id: 'cd-19', hsk: 'HSK 5', hz: '环保倡议', py: 'Huánbǎo Chàngyì', title: 'Kampanye Peduli Lingkungan Hidup', desc: 'Bisa berdiskusi mengenai pemilahan sampah daur ulang dan langkah pengurangan jejak karbon.' },
      { id: 'cd-20', hsk: 'HSK 5', hz: '医疗急救', py: 'Yīliáo Jíjiù', title: 'Situasi Darurat Medis & Ambulans', desc: 'Bisa melaporkan lokasi darurat kecelakaan dan kondisi vital pasien ke nomor 120.' },
      { id: 'cd-21', hsk: 'HSK 6', hz: '商务签约', py: 'Shāngwù Qiānyuē', title: 'Penandatanganan Kontrak Dagang', desc: 'Bisa mengonfirmasi klausul hukum, penalti wanprestasi, dan legalitas perjanjian bilateral.' },
      { id: 'cd-22', hsk: 'HSK 6', hz: '文史鉴赏', py: 'Wénshǐ Jiànshǎng', title: 'Apresiasi Sastra & Puisi Klasik', desc: 'Bisa mendiskusikan metafora puisi Dinasti Tang dan filosofi peribahasa Chengyu empat karakter.' },
      { id: 'cd-23', hsk: 'HSK 6', hz: '哲学思辨', py: 'Zhéxué Sībiàn', title: 'Diskursus Dialektika Kehidupan', desc: 'Bisa berargumentasi secara abstrak mengenai makna kebahagiaan dan hakikat eksistensi manusia.' },
      { id: 'cd-24', hsk: 'HSK 6', hz: '外交礼仪', py: 'Wàijiāo Lǐyí', title: 'Protokoler Diplomasi Antarbangsa', desc: 'Bisa menggunakan ragam bahasa formal tinggi untuk menyambut tamu kenegaraan dan delegasi.' }
    ];

    var list = candoScenarios.map(function (c) {
      return '<div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">'
        + '<span style="font-size:10px;font-weight:800;background:#E0F2FE;color:#0369A1;padding:2px 8px;border-radius:6px;">' + c.hsk + '</span>'
        + '<strong style="font-size:14px;color:#BE123C;font-family:var(--fz-font-cjk);">' + esc(c.hz) + ' · ' + esc(c.py) + '</strong>'
        + '</div>'
        + '<h4 style="font-size:13.5px;font-weight:700;color:#0F172A;margin:2px 0 3px 0;">' + esc(c.title) + '</h4>'
        + '<p style="font-size:12px;color:#334155;margin:0 0 6px 0;line-height:1.4;">' + esc(c.desc) + '</p>'
        + '<button type="button" class="btn btn-sm" style="background:#FFF1F2;border:1px solid #FDA4AF;color:#BE123C;border-radius:8px;font-weight:700;font-size:11px;padding:4px 10px;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(c.hz) + '\')">🔊 Latihan Pelafalan</button>'
        + '</div>';
    }).join('');

    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:540px;margin:auto;max-height:80vh;overflow-y:auto;padding:6px 2px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="Tutup"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">SITUASI KOMUNIKATIF</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:8px 0 4px 0;color:#0F172A;">24 Can-Do Percakapan Nyata</h2>'
      + '<p style="font-size:12.5px;color:#475569;margin-bottom:12px;line-height:1.4;">Kecakapan komunikatif praktis untuk situasi kehidupan sehari-hari di Tiongkok (HSK 1 hingga HSK 6).</p>'
      + '<div>' + list + '</div>'
      + '<button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:800;margin-top:14px;background:#BE123C;padding:10px;" onclick="closeModal()">Selesai</button>'
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
          (w.idMeaning && w.idMeaning.toLowerCase().indexOf(q) >= 0);
      });
    }

    var lvlTabs = [
      { lvl: 0, label: 'Semua' },
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
      + '<input type="text" placeholder="Cari Hanzi, Pinyin, atau arti kata..." value="' + esc(_vocabSearchQuery) + '" oninput="FiezelMandarinUI.filterVocab(this.value)" style="width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:10px;padding:8px 12px;font-size:13px;outline:none;" />'
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
        + '<div style="font-size:12.5px;font-weight:700;color:#0F172A;">' + esc(w.idMeaning) + '</div>'
        + (w.example && w.example.hz
          ? '<div style="font-size:11.5px;color:#64748B;font-family:var(--fz-font-cjk);">' + esc(w.example.hz) + ' · <span style="font-family:sans-serif;">' + esc(w.example.id) + '</span></div>'
          : '')
        + '</div>'
        + '</div>'
        + '<button type="button" class="btn btn-sm" style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;" onclick="FiezelMandarinUI.playToneAudio(\'' + esc(w.hanzi) + '\')">🔊</button>'
        + '</div>';
    }).join('');

    var countBadge = '<div style="font-size:11.5px;color:#64748B;margin-bottom:10px;">Menampilkan <b>' + Math.min(words.length, 80) + '</b> dari <b>' + words.length + '</b> kata</div>';

    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:540px;margin:auto;max-height:85vh;overflow-y:auto;padding:6px 2px;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="Tutup"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">KAMUS HSK LENGKAP</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:6px 0 2px 0;color:#0F172A;">HSK Vocab Explorer (生词宝库)</h2>'
      + '<p style="font-size:12px;color:#475569;margin-bottom:10px;">Jelajahi perbendaharaan kosakata Mandarin lengkap dengan pelafalan audio baku.</p>'
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
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="Tutup"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#FFE4E6;color:#BE123C;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;">SINTAKSIS & FORMULA</span>'
      + '<h2 style="font-size:18px;font-weight:800;margin:6px 0 2px 0;color:#0F172A;">Bank Tata Bahasa (192 Pola)</h2>'
      + '<p style="font-size:12px;color:#475569;margin-bottom:12px;">Struktur kalimat, aspek kata kerja, dan analisis kontrastif terhadap bahasa Indonesia.</p>'
      + '<div>' + cards + '</div>'
      + '<button class="btn btn-primary" style="width:100%;border-radius:12px;font-weight:800;margin-top:14px;background:#BE123C;padding:10px;" onclick="closeModal()">Selesai</button>'
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
        title: 'Pīnyīn (Nada)',
        note: '声调 · 4 nada & kontur'
      },
      {
        cls: 'zh-stroke-card',
        glyph: '画',
        action: "FiezelMandarinUI.openStrokeModal()",
        title: 'Bǐhuà (Goresan)',
        note: '笔画 · goresan Hanzi'
      },
      {
        cls: 'zh-sandhi-card',
        glyph: '变',
        action: "FiezelMandarinUI.openSandhiModal()",
        title: 'Biàndiào (Sandhi)',
        note: '变调 · hukum sandhi nada'
      },
      {
        cls: 'zh-cando-card',
        glyph: '景',
        action: "FiezelMandarinUI.openCanDoModal()",
        title: 'Shíjǐng (Can-Do)',
        note: '实景 · 24 situasi bicara'
      },
      {
        cls: 'zh-vocab-card',
        glyph: '词',
        action: "go('vocab')",
        title: 'Shēngcí (Kosakata)',
        note: '生词 · 2.194 kosakata'
      },
      {
        cls: 'zh-grammar-card',
        glyph: '法',
        action: "go('grammar')",
        title: 'Yǔfǎ (Tata Bahasa)',
        note: '语法 · 192 rumus SVO'
      },
      {
        cls: 'zh-mochi-card',
        glyph: '伴',
        action: "go('chat')",
        title: 'Xiao Mochi (Bicara)',
        note: '小麻薯 · Kawan Bicara'
      },
      {
        cls: 'zh-reading-card',
        glyph: '读',
        action: "go('reading')",
        title: 'Yuèdú (Membaca)',
        note: '阅读 · pemahaman teks'
      },
      {
        cls: 'zh-writing-card',
        glyph: '写',
        action: "go('writing')",
        title: 'Xiězì (Menulis)',
        note: '汉字 · latihan menulis'
      },
      {
        cls: 'zh-library-card',
        glyph: '馆',
        action: "go('library')",
        title: 'Túshūguǎn (Perpus)',
        note: '图书 · perpustakaan'
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
          ? '<span style="font-size:12px;font-weight:800;color:#BE123C;background:#FFE4E6;padding:4px 10px;border-radius:8px;">Sedang Aktif ✓</span>'
          : '<button type="button" class="btn btn-sm btn-secondary" style="border-radius:8px;font-weight:700;">Pilih</button>')
        + '</div>';
    }).join('');

    var html = '<div class="skill-help-panel fz-mandarin-modal-content" style="max-width:520px;margin:auto;">'
      + '<button type="button" class="modal-close-corner" onclick="closeModal()" aria-label="' + esc(typeof FiezelI18n !== 'undefined' && FiezelI18n.t ? FiezelI18n.t('modal.tutup') : 'Tutup') + '"><i data-lucide="x"></i></button>'
      + '<span class="skill-badge" style="background:#E0F2FE;color:#0369A1;">MULTI-LANGUAGE ECOSYSTEM</span>'
      + '<h2 style="font-size:20px;font-weight:800;margin:6px 0 8px 0;">' + (typeof FiezelI18n !== 'undefined' && FiezelI18n.t ? FiezelI18n.t('bahasa.judul') : 'Pilih Bahasa') + '</h2>'
      + '<p class="muted" style="font-size:13px;margin-bottom:16px;">Setiap bahasa memiliki kurikulum, fitur, dan nuansa tersendiri yang disesuaikan secara khusus.</p>'
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
    switchCourse: switchCourse,
    playToneAudio: playToneAudio,
    openLessonPlayer: openLessonPlayer,
    setLessonStep: setLessonStep,
    submitQuizAnswer: submitQuizAnswer,
    openCurriculumMapModal: openCurriculumMapModal,
    setCurriculumMapLevel: setCurriculumMapLevel
  };
});
