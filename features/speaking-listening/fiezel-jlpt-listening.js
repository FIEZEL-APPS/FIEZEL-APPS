/**
 * FIEZEL · features/speaking-listening/fiezel-jlpt-listening.js
 * Engine Interaktif Bank Soal Listening (Chōkai / 聴解) JLPT N5 & N4
 * Berdasarkan Data Ujian Resmi Japan Foundation & JEES
 */

(function () {
  'use strict';

  var JLPT_BANK = [];
  var curLevel = 'N5';
  var curMondai = 'all';
  var curIndex = 0;
  var audioPlaying = false;
  var audioObj = null;
  var selectedChoice = null;
  var replayCount = 0;
  var scriptOpen = false;
  var explainOpen = false;
  var vocabOpen = false;

  function getBankUrl() {
    try {
      var loc = window.location;
      var path = loc.pathname;
      if (!path.endsWith('/')) {
        path = path.substring(0, path.lastIndexOf('/') + 1);
      }
      return loc.origin + path + 'features/speaking-listening/jlpt-listening-bank-v1.json';
    } catch (_) {
      return './features/speaking-listening/jlpt-listening-bank-v1.json';
    }
  }

  // Muat bank soal dari JSON
  function initBank() {
    if (JLPT_BANK.length > 0) return Promise.resolve(JLPT_BANK);
    var url = getBankUrl();
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        JLPT_BANK = data.items || [];
        return JLPT_BANK;
      })
      .catch(function (err) {
        console.warn('[JLPT Listening] Gagal fetch bank JSON:', err);
        return fetch('./features/speaking-listening/jlpt-listening-bank-v1.json')
          .then(function (r) { return r.json(); })
          .then(function (d) {
            JLPT_BANK = d.items || [];
            return JLPT_BANK;
          })
          .catch(function (_) {
            return [];
          });
      });
  }

  function getFilteredQuestions() {
    return JLPT_BANK.filter(function (q) {
      if (q.level !== curLevel) return false;
      if (curMondai !== 'all' && q.mondai !== curMondai) return false;
      return true;
    });
  }

  function openListeningPanel() {
    var modal = document.getElementById('listeningPanelModal');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    curIndex = 0;
    selectedChoice = null;
    replayCount = 0;
    scriptOpen = false;
    explainOpen = false;
    vocabOpen = false;

    initBank().then(function () {
      renderListeningQuestion();
    });
  }

  function closeListeningPanel() {
    var modal = document.getElementById('listeningPanelModal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
    stopJlptAudio();
  }

  function setListeningLevel(lvl) {
    curLevel = lvl;
    var btnN5 = document.getElementById('btnLvlN5');
    var btnN4 = document.getElementById('btnLvlN4');
    if (btnN5) btnN5.classList.toggle('active', lvl === 'N5');
    if (btnN4) btnN4.classList.toggle('active', lvl === 'N4');

    curIndex = 0;
    selectedChoice = null;
    scriptOpen = false;
    explainOpen = false;
    vocabOpen = false;
    stopJlptAudio();
    renderListeningQuestion();
  }

  function setListeningMondai(m) {
    curMondai = m;
    var chips = document.querySelectorAll('.jlpt-mondai-chip');
    chips.forEach(function (c) {
      c.classList.toggle('active', c.getAttribute('data-mondai') === m);
    });

    curIndex = 0;
    selectedChoice = null;
    scriptOpen = false;
    explainOpen = false;
    vocabOpen = false;
    stopJlptAudio();
    renderListeningQuestion();
  }

  function playJlptSpeech(text) {
    if (!text) return;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        var utt = new SpeechSynthesisUtterance(text);
        utt.lang = 'ja-JP';
        utt.rate = 0.85;
        var eq = document.getElementById('jlptEqBars');
        var playBtn = document.getElementById('jlptPlayBtn');
        utt.onstart = function () {
          audioPlaying = true;
          if (eq) eq.classList.add('playing');
          if (playBtn) playBtn.innerHTML = '❚❚';
        };
        utt.onend = function () {
          audioPlaying = false;
          if (eq) eq.classList.remove('playing');
          if (playBtn) playBtn.innerHTML = '▶';
        };
        utt.onerror = function () {
          audioPlaying = false;
          if (eq) eq.classList.remove('playing');
          if (playBtn) playBtn.innerHTML = '▶';
        };
        window.speechSynthesis.speak(utt);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
      }
    }
  }

  function stopJlptAudio() {
    if (audioObj) {
      try {
        audioObj.pause();
        audioObj.currentTime = 0;
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    audioPlaying = false;
    var eq = document.getElementById('jlptEqBars');
    var playBtn = document.getElementById('jlptPlayBtn');
    if (eq) eq.classList.remove('playing');
    if (playBtn) playBtn.innerHTML = '▶';
  }

  function togglePlayJlptAudio(url, fallbackScript) {
    var eq = document.getElementById('jlptEqBars');
    var playBtn = document.getElementById('jlptPlayBtn');

    if (audioPlaying) {
      stopJlptAudio();
      return;
    }

    if (!url) {
      playJlptSpeech(fallbackScript);
      return;
    }

    if (!audioObj || audioObj.src !== url) {
      audioObj = new Audio(url);
      audioObj.onended = function () {
        audioPlaying = false;
        if (eq) eq.classList.remove('playing');
        if (playBtn) playBtn.innerHTML = '▶';
      };
      audioObj.onerror = function () {
        console.warn('[JLPT Audio] Fallback ke speech synthesis');
        audioPlaying = false;
        if (eq) eq.classList.remove('playing');
        if (playBtn) playBtn.innerHTML = '▶';
        playJlptSpeech(fallbackScript);
      };
    }

    audioObj.play().then(function () {
      audioPlaying = true;
      replayCount++;
      var counter = document.getElementById('jlptReplayBadge');
      if (counter) counter.innerText = 'Diputar ' + replayCount + 'x';
      if (eq) eq.classList.add('playing');
      if (playBtn) playBtn.innerHTML = '❚❚';
    }).catch(function (e) {
      console.warn('[JLPT Audio] Play error, beralih ke speech:', e);
      playJlptSpeech(fallbackScript);
    });
  }

  function selectJlptChoice(optId, correctOptId) {
    if (selectedChoice !== null) return;
    selectedChoice = optId;

    var btns = document.querySelectorAll('.jlpt-opt-btn');
    btns.forEach(function (btn) {
      btn.classList.add('locked');
      var bId = parseInt(btn.getAttribute('data-opt-id'), 10);
      if (bId === correctOptId) {
        btn.classList.add('correct');
      } else if (bId === optId && optId !== correctOptId) {
        btn.classList.add('wrong');
      }
    });

    // Buka pembahasan
    explainOpen = true;
    var exp = document.getElementById('jlptExplainBox');
    var expArr = document.getElementById('jlptExplainArrow');
    if (exp) exp.style.display = 'block';
    if (expArr) expArr.innerText = '▲';

    if (optId === correctOptId) {
      if (window.uiSfx) { try { window.uiSfx('correct'); } catch (_) {} }
    } else {
      if (window.uiSfx) { try { window.uiSfx('wrong'); } catch (_) {} }
    }
  }

  function toggleJlptAccordion(type) {
    if (type === 'script') {
      scriptOpen = !scriptOpen;
      var el = document.getElementById('jlptScriptBox');
      var arrow = document.getElementById('jlptScriptArrow');
      if (el) el.style.display = scriptOpen ? 'block' : 'none';
      if (arrow) arrow.innerText = scriptOpen ? '▲' : '▼';
    } else if (type === 'explain') {
      explainOpen = !explainOpen;
      var el2 = document.getElementById('jlptExplainBox');
      var arrow2 = document.getElementById('jlptExplainArrow');
      if (el2) el2.style.display = explainOpen ? 'block' : 'none';
      if (arrow2) arrow2.innerText = explainOpen ? '▲' : '▼';
    } else if (type === 'vocab') {
      vocabOpen = !vocabOpen;
      var el3 = document.getElementById('jlptVocabBox');
      var arrow3 = document.getElementById('jlptVocabArrow');
      if (el3) el3.style.display = vocabOpen ? 'block' : 'none';
      if (arrow3) arrow3.innerText = vocabOpen ? '▲' : '▼';
    }
  }

  function prevListeningQuestion() {
    var qs = getFilteredQuestions();
    if (curIndex > 0) {
      curIndex--;
      selectedChoice = null;
      scriptOpen = false;
      explainOpen = false;
      vocabOpen = false;
      stopJlptAudio();
      renderListeningQuestion();
    }
  }

  function nextListeningQuestion() {
    var qs = getFilteredQuestions();
    if (curIndex < qs.length - 1) {
      curIndex++;
      selectedChoice = null;
      scriptOpen = false;
      explainOpen = false;
      vocabOpen = false;
      stopJlptAudio();
      renderListeningQuestion();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeJs(str) {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, ' ')
      .replace(/\r/g, '');
  }

  function renderListeningQuestion() {
    var slot = document.getElementById('listeningQuestionSlot');
    if (!slot) return;

    var qs = getFilteredQuestions();
    if (qs.length === 0) {
      slot.innerHTML = '<div style="text-align:center;padding:32px 16px;color:var(--text-muted);">' +
        '<p style="font-size:14px;font-weight:600;">Tidak ada item untuk filter ini.</p>' +
        '</div>';
      return;
    }

    var q = qs[curIndex];
    var isAnswered = selectedChoice !== null;
    var correctOptId = (q.answerIndex !== undefined ? q.answerIndex + 1 : (q.correct_answer || 1));
    var qSituation = q.situation || '';
    var qJa = q.questionJapanese || q.question || '';
    var qId = q.questionIndonesian || '';
    var audioUrl = q.audioUrl || q.audio_url || '';
    var scriptJa = q.scriptJapanese || q.script || '';
    var scriptRomaji = q.scriptRomaji || '';
    var scriptId = q.scriptIndonesian || q.script_translation || '';
    var explanation = q.explain || q.explanation || '';
    var safeScriptJa = escapeJs(scriptJa);
    var safeQJa = escapeJs(qJa);

    var optionsHtml = (q.options || []).map(function (opt, i) {
      var optId = (typeof opt === 'object' && opt.id !== undefined) ? opt.id : (i + 1);
      var textJa = (typeof opt === 'object') ? (opt.text || '') : String(opt);
      var textId = (typeof opt === 'object') ? (opt.textId || '') : '';
      var cls = 'jlpt-opt-btn';
      if (isAnswered) {
        cls += ' locked';
        if (optId === correctOptId) cls += ' correct';
        else if (optId === selectedChoice) cls += ' wrong';
      }
      var safeTextJa = escapeJs(textJa);
      return '<button type="button" class="' + cls + '" data-opt-id="' + optId + '" onclick="selectJlptChoice(' + optId + ', ' + correctOptId + ')">' +
        '<span class="jlpt-opt-badge">' + optId + '</span>' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:3px;text-align:left;">' +
          '<div style="font-weight:700;font-size:14px;color:#241A11;">' + escapeHtml(textJa) + '</div>' +
          (textId ? '<div style="font-size:11.5px;color:#7A6F64;">' + escapeHtml(textId) + '</div>' : '') +
        '</div>' +
        '<span onclick="event.stopPropagation();playJlptSpeech(\'' + safeTextJa + '\')" title="Audio Pilihan" style="padding:4px 6px;cursor:pointer;font-size:15px;" aria-label="Audio Pilihan">🔊</span>' +
        '</button>';
    }).join('');

    var vocabs = q.vocabularyKey || q.vocab || [];
    var vocabListHtml = '';
    if (vocabs.length > 0) {
      vocabListHtml = '<ul style="margin:4px 0 0 16px;padding:0;font-size:12.5px;color:#241A11;">' +
        vocabs.map(function (v) {
          var ja = v.ja || (v.word + (v.reading ? ' (' + v.reading + ')' : ''));
          var id = v.id || v.meaning || '';
          return '<li style="margin-bottom:4px;"><b>' + escapeHtml(ja) + '</b> : ' + escapeHtml(id) + '</li>';
        }).join('') +
        '</ul>';
    }

    slot.innerHTML =
      '<!-- Audio Player -->' +
      '<div class="jlpt-player-card">' +
        '<div class="p-meta">' +
          '<span><b>' + q.level + ' · ' + (q.mondaiLabel || q.mondai) + '</b> (No. ' + (curIndex + 1) + ' dari ' + qs.length + ')</span>' +
          '<span id="jlptReplayBadge">' + (replayCount > 0 ? 'Diputar ' + replayCount + 'x' : 'Audio JEES / AI') + '</span>' +
        '</div>' +
        '<div class="p-controls">' +
          '<button type="button" class="jlpt-play-btn" id="jlptPlayBtn" onclick="togglePlayJlptAudio(\'' + audioUrl + '\', \'' + safeScriptJa + '\')" aria-label="Putar Audio">▶</button>' +
          '<div class="jlpt-eq-bars" id="jlptEqBars">' +
            '<div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div>' +
            '<div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div>' +
          '</div>' +
          '<button type="button" onclick="playJlptSpeech(\'' + safeScriptJa + '\')" style="background:#FFF3C4;border:1px solid #E8DFD3;border-radius:14px;padding:6px 10px;font-size:11.5px;font-weight:700;color:#7A5F1B;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px;">🔊 Audio Dialog</button>' +
        '</div>' +
      '</div>' +

      '<!-- Question Card -->' +
      '<div class="jlpt-q-card">' +
        (qSituation ? '<div style="font-size:12px;color:#7A5F1B;background:#FFF9E6;border:1px solid #FFEBAA;border-radius:8px;padding:7px 10px;margin-bottom:10px;line-height:1.4;">📌 <b>Situasi:</b> ' + escapeHtml(qSituation) + '</div>' : '') +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">' +
          '<span style="font-size:11.5px;color:var(--text-muted);font-weight:700;">PERTANYAAN:</span>' +
          '<button type="button" onclick="playJlptSpeech(\'' + safeQJa + '\')" style="background:transparent;border:none;color:#7A5F1B;font-size:12px;font-weight:600;cursor:pointer;" title="Audio Tanya">🔊 Audio Pertanyaan</button>' +
        '</div>' +
        '<h3 style="font-size:16px;color:var(--text);margin:0 0 4px;line-height:1.45;">' + escapeHtml(qJa) + '</h3>' +
        (qId ? '<div style="font-size:12.5px;color:#7A6F64;margin-bottom:10px;">' + escapeHtml(qId) + '</div>' : '') +

        '<div style="margin-top:12px;">' +
          '<div style="font-size:11.5px;font-weight:700;color:var(--text-muted);margin-bottom:6px;">OPSI:</div>' +
          optionsHtml +
        '</div>' +

        '<!-- Accordions -->' +
        '<div style="margin-top:14px;">' +
          '<!-- Script Accordion -->' +
          '<button type="button" class="jlpt-acc-btn" onclick="toggleJlptAccordion(\'script\')">' +
            '<span>📝 Naskah Dialog &amp; Terjemahan</span><span id="jlptScriptArrow">' + (scriptOpen ? '▲' : '▼') + '</span>' +
          '</button>' +
          '<div class="jlpt-acc-content" id="jlptScriptBox" style="display:' + (scriptOpen ? 'block' : 'none') + ';">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">' +
              '<span style="font-weight:700;color:#241A11;">Dialog Asli (Jepang):</span>' +
              '<button type="button" onclick="playJlptSpeech(\'' + safeScriptJa + '\')" style="background:transparent;border:none;color:#7A5F1B;font-size:12px;font-weight:600;cursor:pointer;">🔊 Audio Dialog</button>' +
            '</div>' +
            '<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.5;background:#FAF8F4;padding:8px 10px;border-radius:8px;margin:0 0 8px;">' + escapeHtml(scriptJa) + '</pre>' +
            (scriptRomaji ? '<div style="font-size:11.5px;font-style:italic;color:#7A6F64;margin-bottom:8px;line-height:1.4;">' + escapeHtml(scriptRomaji) + '</div>' : '') +
            '<div style="font-weight:700;margin-bottom:4px;color:#241A11;">Terjemahan Indonesia:</div>' +
            '<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;background:#FAF8F4;padding:8px 10px;border-radius:8px;margin:0;">' + escapeHtml(scriptId) + '</pre>' +
          '</div>' +

          '<!-- Explanation Accordion -->' +
          '<button type="button" class="jlpt-acc-btn" onclick="toggleJlptAccordion(\'explain\')">' +
            '<span>💡 Kunci &amp; Pembahasan</span><span id="jlptExplainArrow">' + (explainOpen ? '▲' : '▼') + '</span>' +
          '</button>' +
          '<div class="jlpt-acc-content" id="jlptExplainBox" style="display:' + (explainOpen ? 'block' : 'none') + ';">' +
            '<div style="margin-bottom:6px;"><b>Kunci Tepat:</b> Opsi No. ' + correctOptId + '</div>' +
            '<div><b>Pembahasan:</b> ' + escapeHtml(explanation) + '</div>' +
          '</div>' +

          (vocabListHtml ?
            '<!-- Vocab Accordion -->' +
            '<button type="button" class="jlpt-acc-btn" onclick="toggleJlptAccordion(\'vocab\')">' +
              '<span>📚 Kotoba Penting (' + vocabs.length + ' kata)</span><span id="jlptVocabArrow">' + (vocabOpen ? '▲' : '▼') + '</span>' +
            '</button>' +
            '<div class="jlpt-acc-content" id="jlptVocabBox" style="display:' + (vocabOpen ? 'block' : 'none') + ';">' +
              vocabListHtml +
            '</div>'
          : '') +
        '</div>' +

        '<!-- Navigation Row -->' +
        '<div class="jlpt-nav-row">' +
          '<button type="button" class="jlpt-nav-btn" ' + (curIndex === 0 ? 'disabled' : '') + ' onclick="prevListeningQuestion()">◀ Mundur</button>' +
          '<span style="font-size:12px;font-weight:700;color:var(--text-muted);">' + (curIndex + 1) + ' / ' + qs.length + '</span>' +
          '<button type="button" class="jlpt-nav-btn" ' + (curIndex === qs.length - 1 ? 'disabled' : '') + ' onclick="nextListeningQuestion()">Maju ▶</button>' +
        '</div>' +
      '</div>';
  }

  // Bind to global window
  window.openListeningPanel = openListeningPanel;
  window.closeListeningPanel = closeListeningPanel;
  window.setListeningLevel = setListeningLevel;
  window.setListeningMondai = setListeningMondai;
  window.togglePlayJlptAudio = togglePlayJlptAudio;
  window.playJlptSpeech = playJlptSpeech;
  window.stopJlptAudio = stopJlptAudio;
  window.selectJlptChoice = selectJlptChoice;
  window.toggleJlptAccordion = toggleJlptAccordion;
  window.prevListeningQuestion = prevListeningQuestion;
  window.nextListeningQuestion = nextListeningQuestion;

  window.FiezelJlptListening = {
    initBank: initBank,
    open: openListeningPanel,
    close: closeListeningPanel
  };

  // Pre-fetch bank saat idle
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(function () { initBank(); });
  } else {
    setTimeout(initBank, 1500);
  }
})();
