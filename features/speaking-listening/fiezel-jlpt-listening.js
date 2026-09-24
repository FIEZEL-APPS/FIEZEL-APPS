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

  // Muat bank soal dari JSON
  function initBank() {
    if (JLPT_BANK.length > 0) return Promise.resolve(JLPT_BANK);
    return fetch('./features/speaking-listening/jlpt-listening-bank-v1.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        JLPT_BANK = data.items || [];
        return JLPT_BANK;
      })
      .catch(function (err) {
        console.warn('[JLPT Listening] Gagal fetch bank JSON:', err);
        return [];
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

  function stopJlptAudio() {
    if (audioObj) {
      try {
        audioObj.pause();
        audioObj.currentTime = 0;
      } catch (_) {}
    }
    audioPlaying = false;
    var eq = document.getElementById('jlptEqBars');
    var playBtn = document.getElementById('jlptPlayBtn');
    if (eq) eq.classList.remove('playing');
    if (playBtn) playBtn.innerHTML = '▶';
  }

  function togglePlayJlptAudio(url) {
    var eq = document.getElementById('jlptEqBars');
    var playBtn = document.getElementById('jlptPlayBtn');

    if (audioPlaying) {
      stopJlptAudio();
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
        audioPlaying = false;
        if (eq) eq.classList.remove('playing');
        if (playBtn) playBtn.innerHTML = '▶';
        if (window.showToast) window.showToast('Gagal memuat audio resmi. Silakan coba kembali.');
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
      console.warn('Audio play error:', e);
    });
  }

  function selectJlptChoice(idx, correctIdx) {
    if (selectedChoice !== null) return; // sudah dijawab
    selectedChoice = idx;

    var btns = document.querySelectorAll('.jlpt-opt-btn');
    btns.forEach(function (btn, i) {
      btn.classList.add('locked');
      if (i + 1 === correctIdx) {
        btn.classList.add('correct');
      } else if (i + 1 === idx && idx !== correctIdx) {
        btn.classList.add('wrong');
      }
    });

    // Otomatis buka pembahasan
    explainOpen = true;
    var exp = document.getElementById('jlptExplainBox');
    if (exp) exp.style.display = 'block';

    if (idx === correctIdx) {
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

  function renderListeningQuestion() {
    var slot = document.getElementById('listeningQuestionSlot');
    if (!slot) return;

    var qs = getFilteredQuestions();
    if (qs.length === 0) {
      slot.innerHTML = '<div style="text-align:center;padding:32px 16px;color:var(--text-muted);">' +
        '<p style="font-size:14px;font-weight:600;">Belum ada soal untuk kategori ini.</p>' +
        '</div>';
      return;
    }

    var q = qs[curIndex];
    var isAnswered = selectedChoice !== null;

    var optionsHtml = (q.options || []).map(function (opt, i) {
      var optNum = i + 1;
      var cls = 'jlpt-opt-btn';
      if (isAnswered) {
        cls += ' locked';
        if (optNum === q.correct_answer) cls += ' correct';
        else if (optNum === selectedChoice) cls += ' wrong';
      }
      return '<button type="button" class="' + cls + '" onclick="selectJlptChoice(' + optNum + ', ' + q.correct_answer + ')">' +
        '<span class="jlpt-opt-badge">' + optNum + '</span>' +
        '<span>' + opt + '</span>' +
        '</button>';
    }).join('');

    var vocabListHtml = '';
    if (q.vocab && q.vocab.length > 0) {
      vocabListHtml = '<ul style="margin:4px 0 0 16px;padding:0;">' +
        q.vocab.map(function (v) {
          return '<li style="margin-bottom:3px;"><b>' + v.word + '</b> (' + v.reading + '): ' + v.meaning + '</li>';
        }).join('') +
        '</ul>';
    }

    slot.innerHTML =
      '<!-- Audio Player -->' +
      '<div class="jlpt-player-card">' +
        '<div class="p-meta">' +
          '<span><b>' + q.level + ' · ' + (q.mondai_name || q.mondai) + '</b> (No. ' + (curIndex + 1) + ' dari ' + qs.length + ')</span>' +
          '<span id="jlptReplayBadge">' + (replayCount > 0 ? 'Diputar ' + replayCount + 'x' : 'Audio Asli JEES') + '</span>' +
        '</div>' +
        '<div class="p-controls">' +
          '<button type="button" class="jlpt-play-btn" id="jlptPlayBtn" onclick="togglePlayJlptAudio(\'' + q.audio_url + '\')" aria-label="Putar Audio">▶</button>' +
          '<div class="jlpt-eq-bars" id="jlptEqBars">' +
            '<div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div>' +
            '<div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div>' +
          '</div>' +
          '<span style="font-size:11px;color:#D6CBC2;white-space:nowrap;">Putar Rekaman</span>' +
        '</div>' +
      '</div>' +

      '<!-- Question Card -->' +
      '<div class="jlpt-q-card">' +
        '<div style="font-size:11.5px;color:var(--text-muted);margin-bottom:4px;font-weight:700;">PERTANYAAN SOAL:</div>' +
        '<h3 style="font-size:15px;color:var(--text);margin:0 0 10px;line-height:1.4;">' + q.question + '</h3>' +
        (q.instruction ? '<div style="font-size:12px;color:#7A6F64;margin-bottom:8px;font-style:italic;">💡 ' + q.instruction + '</div>' : '') +

        '<div style="margin-top:12px;">' +
          '<div style="font-size:11.5px;font-weight:700;color:var(--text-muted);margin-bottom:4px;">PILIHAN JAWABAN:</div>' +
          optionsHtml +
        '</div>' +

        '<!-- Accordions -->' +
        '<div style="margin-top:14px;">' +
          '<!-- Script Accordion -->' +
          '<button type="button" class="jlpt-acc-btn" onclick="toggleJlptAccordion(\'script\')">' +
            '<span>📝 Naskah Dialog &amp; Terjemahan</span><span id="jlptScriptArrow">' + (scriptOpen ? '▲' : '▼') + '</span>' +
          '</button>' +
          '<div class="jlpt-acc-content" id="jlptScriptBox" style="display:' + (scriptOpen ? 'block' : 'none') + ';">' +
            '<div style="font-weight:700;margin-bottom:4px;color:#241A11;">Naskah Asli (Jepang):</div>' +
            '<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;background:#FAF8F4;padding:8px 10px;border-radius:8px;margin:0 0 8px;">' + q.script + '</pre>' +
            '<div style="font-weight:700;margin-bottom:4px;color:#241A11;">Terjemahan Indonesia:</div>' +
            '<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;background:#FAF8F4;padding:8px 10px;border-radius:8px;margin:0;">' + q.script_translation + '</pre>' +
          '</div>' +

          '<!-- Explanation Accordion -->' +
          '<button type="button" class="jlpt-acc-btn" onclick="toggleJlptAccordion(\'explain\')">' +
            '<span>💡 Kunci Jawaban &amp; Penjelasan</span><span id="jlptExplainArrow">' + (explainOpen ? '▲' : '▼') + '</span>' +
          '</button>' +
          '<div class="jlpt-acc-content" id="jlptExplainBox" style="display:' + (explainOpen ? 'block' : 'none') + ';">' +
            '<div style="margin-bottom:6px;"><b>Jawaban Benar:</b> Pilihan No. ' + q.correct_answer + '</div>' +
            '<div><b>Pembahasan:</b> ' + q.explanation + '</div>' +
          '</div>' +

          (vocabListHtml ?
            '<!-- Vocab Accordion -->' +
            '<button type="button" class="jlpt-acc-btn" onclick="toggleJlptAccordion(\'vocab\')">' +
              '<span>📚 Kosakata Kunci (' + q.vocab.length + ' kata)</span><span id="jlptVocabArrow">' + (vocabOpen ? '▲' : '▼') + '</span>' +
            '</button>' +
            '<div class="jlpt-acc-content" id="jlptVocabBox" style="display:' + (vocabOpen ? 'block' : 'none') + ';">' +
              vocabListHtml +
            '</div>'
          : '') +
        '</div>' +

        '<!-- Navigation Row -->' +
        '<div class="jlpt-nav-row">' +
          '<button type="button" class="jlpt-nav-btn" ' + (curIndex === 0 ? 'disabled' : '') + ' onclick="prevListeningQuestion()">◀ Soal Sebelumnya</button>' +
          '<span style="font-size:12px;font-weight:700;color:var(--text-muted);">' + (curIndex + 1) + ' / ' + qs.length + '</span>' +
          '<button type="button" class="jlpt-nav-btn" ' + (curIndex === qs.length - 1 ? 'disabled' : '') + ' onclick="nextListeningQuestion()">Soal Berikutnya ▶</button>' +
        '</div>' +
      '</div>';
  }

  // Bind to global window
  window.openListeningPanel = openListeningPanel;
  window.closeListeningPanel = closeListeningPanel;
  window.setListeningLevel = setListeningLevel;
  window.setListeningMondai = setListeningMondai;
  window.togglePlayJlptAudio = togglePlayJlptAudio;
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
