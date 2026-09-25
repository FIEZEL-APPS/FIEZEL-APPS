/**
 * FIEZEL · features/speaking-listening/fiezel-jlpt-listening.js
 * Engine Interaktif Bank Soal Listening (Chōkai / 聴解) JLPT N5 & N4
 * Berdasarkan Data Ujian Resmi Japan Foundation & JEES
 * Redesigned Mobile-First Card UX with Bottom Sheet Drawer
 */

(function () {
  'use strict';

  var JLPT_BANK = [];
  var curLevel = 'N5';
  var curMondai = 'all';
  var curIndex = 0;
  var audioPlaying = false;
  var audioObj = null;
  var activeAudioSource = null; // 'primary' | 'jees' | 'speech'
  var selectedChoice = null;
  var replayCount = 0;
  var curSheetTab = 'script';
  var sheetOpen = false;

  function t(k, fallback) {
    try {
      if (typeof window !== 'undefined' && window.FiezelI18n && window.FiezelI18n.t) {
        var res = window.FiezelI18n.t(k);
        if (res && res !== k) return res;
      }
    } catch (_) {}
    return fallback !== undefined ? fallback : k;
  }

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
    sheetOpen = false;
    closeJlptDetailSheet();

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
    closeJlptDetailSheet();
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
    closeJlptDetailSheet();
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
    closeJlptDetailSheet();
    stopJlptAudio();
    renderListeningQuestion();
  }

  function updateAudioUi() {
    var mainBtn = document.getElementById('jlptMainPlayBtn');
    var playIcon = document.getElementById('jlptPlayIcon');
    var playText = document.getElementById('jlptPlayText');
    var miniWave = document.getElementById('jlptMiniWave');
    var jeesChip = document.getElementById('jlptJeesChip');
    var replayPill = document.getElementById('jlptReplayPill');

    // Backward-compat elements if present
    var legacyAiBtn = document.getElementById('jlptPlayAiBtn') || document.getElementById('jlptPlayBtn');
    var legacyJeesBtn = document.getElementById('jlptPlayJeesBtn');
    var legacyEq = document.getElementById('jlptEqBars');

    if (legacyEq) {
      legacyEq.classList.toggle('playing', audioPlaying);
    }

    // Streamlined Primary Button State
    var isPrimaryPlaying = audioPlaying && (activeAudioSource === 'primary' || activeAudioSource === 'ai');
    if (mainBtn) {
      mainBtn.classList.toggle('playing', isPrimaryPlaying);
      if (playIcon) playIcon.textContent = isPrimaryPlaying ? '❚❚' : '▶';
      if (playText) playText.textContent = isPrimaryPlaying ? 'Jeda Audio' : 'Putar Audio';
      if (miniWave) miniWave.classList.toggle('playing', isPrimaryPlaying);
    }
    if (legacyAiBtn) {
      legacyAiBtn.classList.toggle('playing', isPrimaryPlaying);
      legacyAiBtn.innerHTML = isPrimaryPlaying ? '❚❚ Jeda Audio AI' : '▶ Putar Audio AI';
    }

    // Secondary JEES Chip State
    var isJeesPlaying = audioPlaying && activeAudioSource === 'jees';
    if (jeesChip) {
      jeesChip.classList.toggle('playing', isJeesPlaying);
      jeesChip.innerHTML = isJeesPlaying ? '❚❚ JEES' : '📻 JEES';
    }
    if (legacyJeesBtn) {
      legacyJeesBtn.classList.toggle('playing', isJeesPlaying);
      legacyJeesBtn.innerHTML = isJeesPlaying ? '❚❚ Jeda Rekaman JEES' : '📻 Rekaman JEES';
    }

    // Replay Pill
    if (replayPill) {
      if (replayCount > 0) {
        replayPill.textContent = replayCount + '×';
        replayPill.classList.add('visible');
      } else {
        replayPill.classList.remove('visible');
      }
    }
  }

  function stopJlptAudio() {
    if (audioObj) {
      try {
        audioObj.pause();
        audioObj.currentTime = 0;
      } catch (_) {}
      audioObj = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    audioPlaying = false;
    activeAudioSource = null;
    updateAudioUi();
  }

  function playJlptSpeech(text, source) {
    if (!text) return;
    if (audioObj) {
      try {
        audioObj.pause();
        audioObj.currentTime = 0;
      } catch (_) {}
      audioObj = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        var utt = new SpeechSynthesisUtterance(text);
        utt.lang = 'ja-JP';
        utt.rate = 0.85;

        activeAudioSource = source || 'speech';

        utt.onstart = function () {
          audioPlaying = true;
          updateAudioUi();
        };
        utt.onend = function () {
          audioPlaying = false;
          activeAudioSource = null;
          updateAudioUi();
        };
        utt.onerror = function () {
          audioPlaying = false;
          activeAudioSource = null;
          updateAudioUi();
        };
        window.speechSynthesis.speak(utt);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
        audioPlaying = false;
        activeAudioSource = null;
        updateAudioUi();
      }
    }
  }

  function playAudioStream(url, source, fallbackScript) {
    if (audioPlaying && activeAudioSource === source) {
      stopJlptAudio();
      return;
    }

    stopJlptAudio();

    if (!url) {
      playJlptSpeech(fallbackScript, source);
      return;
    }

    try {
      audioObj = new Audio(url);
      activeAudioSource = source;

      audioObj.onended = function () {
        audioPlaying = false;
        activeAudioSource = null;
        updateAudioUi();
      };

      audioObj.onerror = function () {
        console.warn('[JLPT Audio] Gagal memuat audio ' + source + ', fallback ke Web Speech:', url);
        audioPlaying = false;
        activeAudioSource = null;
        updateAudioUi();
        playJlptSpeech(fallbackScript, source);
      };

      var playPromise = audioObj.play();
      if (playPromise !== undefined) {
        playPromise.then(function () {
          audioPlaying = true;
          activeAudioSource = source;
          replayCount++;
          updateAudioUi();
        }).catch(function (e) {
          console.warn('[JLPT Audio] Play error, fallback ke Web Speech:', e);
          audioPlaying = false;
          activeAudioSource = null;
          updateAudioUi();
          playJlptSpeech(fallbackScript, source);
        });
      }
    } catch (err) {
      console.warn('[JLPT Audio] Init error, fallback ke Web Speech:', err);
      playJlptSpeech(fallbackScript, source);
    }
  }

  // Primary stream: Studio audio (highest quality multi-voice) with fallback to JEES/Speech
  function togglePlayJlptPrimaryAudio() {
    var qs = getFilteredQuestions();
    if (!qs || qs.length === 0) return;
    var q = qs[curIndex];
    if (!q) return;

    var url = q.aiAudioUrl || q.audioUrl || ('./features/speaking-listening/audio-jlpt/' + q.id + '.mp3');
    var fallbackScript = q.scriptJapanese || q.script || '';
    playAudioStream(url, 'primary', fallbackScript);
  }

  // Legacy alias
  function togglePlayJlptAiAudio() {
    togglePlayJlptPrimaryAudio();
  }

  // Secondary stream: Official JEES broadcast audio
  function togglePlayJlptJeesAudio() {
    var qs = getFilteredQuestions();
    if (!qs || qs.length === 0) return;
    var q = qs[curIndex];
    if (!q) return;

    var url = q.audioUrl || q.audio_url || '';
    var fallbackScript = q.scriptJapanese || q.script || '';
    playAudioStream(url, 'jees', fallbackScript);
  }

  function togglePlayJlptAudio(url, fallbackScript) {
    var qs = getFilteredQuestions();
    var q = (qs && qs[curIndex]) ? qs[curIndex] : null;
    if (q && url && url === (q.audioUrl || q.audio_url)) {
      togglePlayJlptJeesAudio();
    } else {
      togglePlayJlptPrimaryAudio();
    }
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

    var isRight = (optId === correctOptId);
    if (isRight) {
      if (window.uiSfx) { try { window.uiSfx('correct'); } catch (_) {} }
    } else {
      if (window.uiSfx) { try { window.uiSfx('wrong'); } catch (_) {} }
    }

    // Refresh feedback and highlight sheet button
    renderFeedbackBanner(isRight, correctOptId);
    var sheetTrigger = document.getElementById('jlptSheetTriggerBtn');
    if (sheetTrigger) {
      sheetTrigger.classList.add('pulse-hint');
    }

    // Populate bottom sheet so it is ready
    var qs = getFilteredQuestions();
    if (qs && qs[curIndex]) {
      populateDetailSheet(qs[curIndex], correctOptId);
    }
  }

  function renderFeedbackBanner(isRight, correctOptId) {
    var container = document.getElementById('jlptFeedbackSlot');
    if (!container) return;
    var cls = isRight ? 'jlpt-feedback-banner correct' : 'jlpt-feedback-banner wrong';
    var icon = isRight ? '🎉' : '💡';
    var title = isRight ? t('jlpt.correct-title', 'Jawaban Benar!') : t('jlpt.wrong-title', 'Belum Tepat');
    var sub = isRight ? 'Hebat, pemahaman dialogmu akurat.' : ('Kunci tepat: Pilihan ' + correctOptId);

    container.innerHTML =
      '<div class="' + cls + '">' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<span style="font-size:16px;">' + icon + '</span>' +
          '<div>' +
            '<div class="jlpt-fb-title">' + title + '</div>' +
            '<div class="jlpt-fb-sub">' + sub + '</div>' +
          '</div>' +
        '</div>' +
        '<button type="button" onclick="openJlptDetailSheet(\'explain\')" style="background:transparent;border:none;font-weight:800;font-size:11.5px;color:currentColor;cursor:pointer;text-decoration:underline;">Lihat Kunci ↗</button>' +
      '</div>';
  }

  // Helper formatting for Chat-Style Dialogue Turns
  function formatDialogueHtml(scriptJa, scriptRomaji, scriptId) {
    if (!scriptJa) return '<p style="color:var(--text-muted);font-size:13px;">Naskah belum tersedia.</p>';

    var linesJa = scriptJa.split('\n').filter(function (l) { return l.trim().length > 0; });
    var linesRo = (scriptRomaji || '').split('\n').filter(function (l) { return l.trim().length > 0; });
    var linesId = (scriptId || '').split('\n').filter(function (l) { return l.trim().length > 0; });

    return linesJa.map(function (lineJa, idx) {
      var rawJa = lineJa.trim();
      var rawRo = linesRo[idx] ? linesRo[idx].trim() : '';
      var rawId = linesId[idx] ? linesId[idx].trim() : '';

      var speaker = '';
      var textJa = rawJa;
      var m = rawJa.match(/^([^:：]{1,15})[:：]\s*(.*)$/);
      if (m) {
        speaker = m[1].trim();
        textJa = m[2].trim();
      }

      var textRo = rawRo;
      var mRo = rawRo.match(/^([^:：]{1,15})[:：]\s*(.*)$/);
      if (mRo) textRo = mRo[2].trim();

      var textId = rawId;
      var mId = rawId.match(/^([^:：]{1,15})[:：]\s*(.*)$/);
      if (mId) textId = mId[2].trim();

      var avatarIcon = '💬';
      var badgeClass = 'speaker-neutral';
      var speakerLabel = speaker || 'Percakapan';

      if (/女|女性|お母さん|母親|彼女|女子/.test(speaker)) {
        avatarIcon = '👩';
        badgeClass = 'speaker-female';
      } else if (/男|男性|男の子|父親|彼|男子|山田|たけし/.test(speaker)) {
        avatarIcon = '👨';
        badgeClass = 'speaker-male';
      } else if (/先生|教授|講師/.test(speaker)) {
        avatarIcon = '👨‍🏫';
        badgeClass = 'speaker-teacher';
      } else if (/学生|生徒|留学生/.test(speaker)) {
        avatarIcon = '🧑';
        badgeClass = 'speaker-student';
      } else if (/店長|店員|受付|駅員|医者/.test(speaker)) {
        avatarIcon = '👔';
        badgeClass = 'speaker-staff';
      }

      var safeLineJa = escapeJs(textJa);

      return '<div class="jlpt-dialogue-turn ' + badgeClass + '">' +
        '<div class="jlpt-turn-meta">' +
          '<span class="jlpt-speaker-chip">' + avatarIcon + ' ' + escapeHtml(speakerLabel) + '</span>' +
          '<button type="button" class="jlpt-line-speak-btn" onclick="playJlptSpeech(\'' + safeLineJa + '\')" title="Dengarkan baris ini" aria-label="Audio Baris">🔊</button>' +
        '</div>' +
        '<div class="jlpt-turn-bubble">' +
          '<div class="jlpt-bubble-ja">' + escapeHtml(textJa) + '</div>' +
          (textRo ? '<div class="jlpt-bubble-ro">' + escapeHtml(textRo) + '</div>' : '') +
          (textId ? '<div class="jlpt-bubble-id">' + escapeHtml(textId) + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  function formatExplainHtml(q, correctOptId) {
    var options = q.options || [];
    var correctOpt = options.find(function (o, idx) {
      var id = (typeof o === 'object' && o.id !== undefined) ? o.id : (idx + 1);
      return id === correctOptId;
    });
    var correctText = correctOpt ? ((typeof correctOpt === 'object' ? correctOpt.text : correctOpt) + (correctOpt.textId ? ' (' + correctOpt.textId + ')' : '')) : ('Pilihan ' + correctOptId);
    var explanation = q.explain || q.explanation || 'Pembahasan belum tersedia untuk nomor ini.';

    var statusText = '';
    var statusClass = '';
    if (selectedChoice === null) {
      statusText = t('jlpt.status-pending', 'Belum Dijawab');
      statusClass = 'status-pending';
    } else if (selectedChoice === correctOptId) {
      statusText = t('jlpt.status-correct', '✓ Jawaban Anda Benar!');
      statusClass = 'status-correct';
    } else {
      statusText = t('jlpt.status-wrong', '✗ Jawaban Anda: Pilihan ') + selectedChoice + ' (' + t('jlpt.not-quite-right', 'Kurang Tepat') + ')';
      statusClass = 'status-wrong';
    }

    return '<div class="jlpt-explain-panel">' +
      '<div class="jlpt-key-card">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
          '<span class="jlpt-key-badge">✓ KUNCI JAWABAN RESMI</span>' +
          '<span class="jlpt-status-badge ' + statusClass + '">' + statusText + '</span>' +
        '</div>' +
        '<div class="jlpt-key-choice">Pilihan ' + correctOptId + ': <b>' + escapeHtml(correctText) + '</b></div>' +
      '</div>' +
      '<div class="jlpt-explain-body">' +
        '<h4 class="jlpt-explain-title">' + t('jlpt.explain-title', '💡 Analisis & Pembahasan Soal:') + '</h4>' +
        '<p class="jlpt-explain-desc">' + escapeHtml(explanation) + '</p>' +
      '</div>' +
      '<div class="jlpt-explain-tip-card" style="background:#F0F7FF;border:1px solid #D0E4FA;border-radius:10px;padding:9px 12px;font-size:12px;color:#1E40AF;line-height:1.45;">' +
        '<b>🎯 Tips Menyimak:</b> Perhatikan kata penunjuk instruksi, waktu, serta kata sambung (<i>しかし</i>, <i>でも</i>, <i>じゃあ</i>) yang kerap membalik atau menegaskan keputusan tokoh.' +
      '</div>' +
    '</div>';
  }

  function formatVocabHtml(vocabs) {
    if (!vocabs || vocabs.length === 0) {
      return '<div class="jlpt-vocab-empty">Tidak ada daftar kosakata khusus untuk nomor ini.</div>';
    }
    var cardsHtml = vocabs.map(function (v) {
      var ja = v.ja || (v.word + (v.reading ? ' (' + v.reading + ')' : ''));
      var id = v.id || v.meaning || '';
      var safeJa = escapeJs(ja);
      return '<div class="jlpt-vocab-item">' +
        '<div class="jlpt-vocab-left">' +
          '<div class="jlpt-vocab-word">' + escapeHtml(ja) + '</div>' +
          '<div class="jlpt-vocab-meaning">' + escapeHtml(id) + '</div>' +
        '</div>' +
        '<button type="button" class="jlpt-vocab-speak" onclick="playJlptSpeech(\'' + safeJa + '\')" title="Lafalkan" aria-label="Audio Kosakata">🔊</button>' +
      '</div>';
    }).join('');

    return '<div class="jlpt-vocab-grid">' + cardsHtml + '</div>';
  }

  // BOTTOM SHEET ENGINE
  function ensureDetailSheet() {
    var existing = document.getElementById('jlptDetailSheet');
    if (existing) {
      if (!existing._dragInit) {
        existing._dragInit = true;
        initSheetPullDrag(existing);
      }
      return existing;
    }
    var box = document.querySelector('.listening-modal-box') || document.body;
    if (!box) return null;

    var sheet = document.createElement('div');
    sheet.id = 'jlptDetailSheet';
    sheet.className = 'jlpt-detail-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-hidden', 'true');
    sheet.setAttribute('aria-label', t('jlpt.sheet-dialog-aria', 'Naskah dan Pembahasan Soal JLPT'));
    sheet.innerHTML =
      '<div id="jlptSheetBackdrop" class="jlpt-sheet-backdrop" onclick="closeJlptDetailSheet()" aria-hidden="true"></div>' +
      '<div class="jlpt-sheet-container" id="jlptSheetContainer">' +
        '<div class="jlpt-sheet-handle-zone sheet-drag-handle-wrapper" id="jlptSheetHandleZone" onclick="closeJlptDetailSheet()" title="Geser ke bawah untuk menutup" aria-label="Geser ke bawah untuk menutup">' +
          '<span class="sheet-drag-handle jlpt-sheet-handle-bar"></span>' +
        '</div>' +
        '<div class="jlpt-sheet-header">' +
          '<div>' +
            '<h3 class="jlpt-sheet-title">Naskah & Pembahasan</h3>' +
            '<span class="jlpt-sheet-subtitle" id="jlptSheetSubtitle">JLPT Listening</span>' +
          '</div>' +
          '<button type="button" class="jlpt-sheet-close" onclick="closeJlptDetailSheet()" aria-label="' + t('jlpt.close-sheet', 'Tutup Sheet') + '">✕</button>' +
        '</div>' +
        '<div class="jlpt-sheet-tabs" role="tablist">' +
          '<button type="button" role="tab" class="jlpt-tab-chip active" id="tabChipScript" onclick="switchJlptSheetTab(\'script\')">📝 Naskah</button>' +
          '<button type="button" role="tab" class="jlpt-tab-chip" id="tabChipExplain" onclick="switchJlptSheetTab(\'explain\')">💡 Pembahasan</button>' +
          '<button type="button" role="tab" class="jlpt-tab-chip" id="tabChipVocab" onclick="switchJlptSheetTab(\'vocab\')">' + t('jlpt.tab-vocab', '📚 Kosakata') + ' (<span id="jlptVocabCount">0</span>)</button>' +
        '</div>' +
        '<div class="jlpt-sheet-content">' +
          '<div class="jlpt-sheet-pane active" id="paneScript" role="tabpanel">' +
            '<div class="jlpt-transcript-header">' +
              '<span class="jlpt-transcript-tag">Dialog Percakapan Asli</span>' +
              '<button type="button" class="jlpt-transcript-play-btn" onclick="togglePlayJlptPrimaryAudio()">▶ Putar Dialog</button>' +
            '</div>' +
            '<div class="jlpt-dialogue-bubbles" id="jlptDialogueBubbles"></div>' +
          '</div>' +
          '<div class="jlpt-sheet-pane" id="paneExplain" role="tabpanel" style="display:none;">' +
            '<div id="jlptExplainContent"></div>' +
          '</div>' +
          '<div class="jlpt-sheet-pane" id="paneVocab" role="tabpanel" style="display:none;">' +
            '<div id="jlptVocabContent"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    box.appendChild(sheet);
    sheet._dragInit = true;
    initSheetPullDrag(sheet);
    return sheet;
  }

  function initSheetPullDrag(sheetEl) {
    var handleZone = sheetEl.querySelector('#jlptSheetHandleZone');
    var container = sheetEl.querySelector('#jlptSheetContainer');
    if (!handleZone || !container) return;

    var startY = 0;
    var isDragging = false;

    function onStart(e) {
      isDragging = true;
      startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      container.style.transition = 'none';
    }

    function onMove(e) {
      if (!isDragging) return;
      var y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      var dy = y - startY;
      if (dy > 0) {
        if (e.cancelable) e.preventDefault();
        container.style.transform = 'translateY(' + dy + 'px)';
      }
    }

    function onEnd(e) {
      if (!isDragging) return;
      isDragging = false;
      var y = e.clientY || (e.changedTouches && e.changedTouches[0].clientY) || 0;
      var dy = y - startY;
      container.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)';
      if (dy > 65) {
        closeJlptDetailSheet();
      } else {
        container.style.transform = 'translateY(0)';
      }
    }

    handleZone.addEventListener('pointerdown', onStart);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  }

  function populateDetailSheet(q, correctOptId) {
    ensureDetailSheet();
    var subEl = document.getElementById('jlptSheetSubtitle');
    if (subEl) {
      subEl.textContent = (q.level || 'JLPT') + ' · ' + (q.mondaiLabel || q.mondai || 'Mondai') + ' (No. ' + (curIndex + 1) + ')';
    }

    var bubblesEl = document.getElementById('jlptDialogueBubbles');
    if (bubblesEl) {
      bubblesEl.innerHTML = formatDialogueHtml(q.scriptJapanese || q.script, q.scriptRomaji, q.scriptIndonesian || q.script_translation);
    }

    var explainEl = document.getElementById('jlptExplainContent');
    if (explainEl) {
      explainEl.innerHTML = formatExplainHtml(q, correctOptId);
    }

    var vocabs = q.vocabularyKey || q.vocab || [];
    var countEl = document.getElementById('jlptVocabCount');
    if (countEl) countEl.textContent = vocabs.length;

    var vocabEl = document.getElementById('jlptVocabContent');
    if (vocabEl) {
      vocabEl.innerHTML = formatVocabHtml(vocabs);
    }
  }

  function openJlptDetailSheet(tabName) {
    var sheet = ensureDetailSheet();
    if (!sheet) return;

    var qs = getFilteredQuestions();
    if (qs && qs[curIndex]) {
      var q = qs[curIndex];
      var correctOptId = (q.answerIndex !== undefined ? q.answerIndex + 1 : (q.correct_answer || 1));
      populateDetailSheet(q, correctOptId);
    }

    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    sheetOpen = true;

    var targetTab = tabName || (selectedChoice !== null ? 'explain' : 'script');
    switchJlptSheetTab(targetTab);
  }

  function closeJlptDetailSheet() {
    var sheet = document.getElementById('jlptDetailSheet');
    if (sheet) {
      sheet.classList.remove('open');
      sheet.setAttribute('aria-hidden', 'true');
      var container = sheet.querySelector('#jlptSheetContainer');
      if (container) container.style.transform = '';
    }
    sheetOpen = false;
  }

  function switchJlptSheetTab(tabName) {
    curSheetTab = tabName;
    var chips = {
      script: document.getElementById('tabChipScript'),
      explain: document.getElementById('tabChipExplain'),
      vocab: document.getElementById('tabChipVocab')
    };
    var panes = {
      script: document.getElementById('paneScript'),
      explain: document.getElementById('paneExplain'),
      vocab: document.getElementById('paneVocab')
    };

    ['script', 'explain', 'vocab'].forEach(function (t) {
      if (chips[t]) chips[t].classList.toggle('active', t === tabName);
      if (panes[t]) {
        panes[t].style.display = (t === tabName) ? 'block' : 'none';
        panes[t].classList.toggle('active', t === tabName);
      }
    });
  }

  // TOUCH / POINTER CARD GESTURE ENGINE: HOLD & SWIPE PHYSICS
  function initCardGestures(cardEl) {
    if (!cardEl) return;

    var SWIPE_THRESHOLD = 60; // Threshold dalam px
    var startX = 0;
    var startY = 0;
    var currentX = 0;
    var currentY = 0;
    var isPointerDown = false;
    var isDragging = false;
    var isScrolling = false;
    var directionLocked = false;
    var suppressClick = false;
    var pointerId = null;

    var cuePrev = cardEl.querySelector('#jlptCuePrev') || document.getElementById('jlptCuePrev');
    var cueNext = cardEl.querySelector('#jlptCueNext') || document.getElementById('jlptCueNext');

    function onPointerDown(e) {
      // Hanya izinkan tombol kiri mouse jika pointer adalah mouse
      if (e.pointerType === 'mouse' && e.button !== 0) {
        return;
      }

      isPointerDown = true;
      isDragging = false;
      isScrolling = false;
      directionLocked = false;
      suppressClick = false;
      pointerId = e.pointerId;

      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      currentX = startX;
      currentY = startY;

      cardEl.style.transition = 'none';
    }

    function onPointerMove(e) {
      if (!isPointerDown) return;

      var x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      var y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      var dx = x - startX;
      var dy = y - startY;

      // Cegah konflik dengan scroll vertikal: Kunci arah gerakan
      if (!directionLocked) {
        var absX = Math.abs(dx);
        var absY = Math.abs(dy);

        // Abaikan jitter kecil di bawah 6px
        if (absX < 6 && absY < 6) return;

        if (absY >= absX) {
          // Gerakan vertikal lebih dominan -> serahkan ke native vertical scroll
          isScrolling = true;
          directionLocked = true;
          return;
        } else {
          // Gerakan horizontal lebih dominan -> kunci sebagai gesture card swipe
          isDragging = true;
          directionLocked = true;
          suppressClick = true;
          cardEl.classList.add('swiping');

          try {
            if (cardEl.setPointerCapture && pointerId !== null && pointerId !== undefined) {
              cardEl.setPointerCapture(pointerId);
            }
          } catch (_) {}
        }
      }

      if (isScrolling) {
        return;
      }

      if (isDragging) {
        if (e.cancelable) e.preventDefault();
        currentX = x;
        currentY = y;

        // Hardware-accelerated CSS transform: translate3d(deltaX px, 0, 0) rotate(deltaX * 0.05deg)
        var rot = dx * 0.05;
        cardEl.style.transform = 'translate3d(' + dx + 'px, 0, 0) rotate(' + rot + 'deg)';

        var qs = getFilteredQuestions();
        var atStart = (curIndex === 0);
        var atEnd = (curIndex >= qs.length - 1);

        // Indikator visual swipe & glow halus
        if (dx < 0) {
          // Geser ke kiri (Next)
          var progressNext = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD);
          if (cueNext) {
            if (atEnd) {
              cueNext.textContent = t('jlpt.last-question', 'Soal Terakhir (') + (curIndex + 1) + '/' + qs.length + ')';
              cueNext.style.background = '#F6EFE3';
              cueNext.style.color = '#7A6F64';
              cueNext.style.borderColor = '#DFC89D';
            } else {
              cueNext.innerHTML = t('jlpt.next-question', 'Soal Berikutnya ▶');
              cueNext.style.background = '#FFF3C4';
              cueNext.style.color = '#7A5F1B';
              cueNext.style.borderColor = '#E6A800';
            }
            cueNext.style.opacity = progressNext;
            cueNext.classList.toggle('active', Math.abs(dx) >= SWIPE_THRESHOLD);
          }
          if (cuePrev) cuePrev.style.opacity = '0';

          // Glow halus pada kartu sisi kanan
          cardEl.style.boxShadow = '0 16px 36px rgba(36,26,17,0.18), -8px 0 24px rgba(255, 199, 0, ' + (0.15 + 0.35 * progressNext) + ')';
        } else if (dx > 0) {
          // Geser ke kanan (Prev)
          var progressPrev = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD);
          if (cuePrev) {
            if (atStart) {
              cuePrev.textContent = t('jlpt.first-question', 'Soal Pertama (1/') + qs.length + ')';
              cuePrev.style.background = '#F6EFE3';
              cuePrev.style.color = '#7A6F64';
              cuePrev.style.borderColor = '#DFC89D';
            } else {
              cuePrev.innerHTML = t('jlpt.prev-question', '◀ Soal Sebelumnya');
              cuePrev.style.background = '#E8F5E9';
              cuePrev.style.color = '#1B5E20';
              cuePrev.style.borderColor = '#2E8B69';
            }
            cuePrev.style.opacity = progressPrev;
            cuePrev.classList.toggle('active', dx >= SWIPE_THRESHOLD);
          }
          if (cueNext) cueNext.style.opacity = '0';

          // Glow halus pada kartu sisi kiri
          cardEl.style.boxShadow = '0 16px 36px rgba(36,26,17,0.18), 8px 0 24px rgba(46, 139, 105, ' + (0.15 + 0.35 * progressPrev) + ')';
        } else {
          if (cueNext) cueNext.style.opacity = '0';
          if (cuePrev) cuePrev.style.opacity = '0';
          cardEl.style.boxShadow = '';
        }
      }
    }

    function onPointerEnd(e) {
      if (!isPointerDown) return;
      isPointerDown = false;

      try {
        if (cardEl.releasePointerCapture && pointerId !== null && pointerId !== undefined) {
          cardEl.releasePointerCapture(pointerId);
        }
      } catch (_) {}

      if (cueNext) {
        cueNext.style.opacity = '0';
        cueNext.classList.remove('active');
      }
      if (cuePrev) {
        cuePrev.style.opacity = '0';
        cuePrev.classList.remove('active');
      }

      if (!isDragging) {
        // Hanya tap atau scroll vertikal biasa selesai
        setTimeout(function () {
          suppressClick = false;
        }, 80);
        return;
      }

      isDragging = false;
      cardEl.classList.remove('swiping');

      var dx = currentX - startX;
      var qs = getFilteredQuestions();

      // Teruskan posisi dx terakhir ke CSS variable agar transisi slide-out tidak meloncat
      cardEl.style.setProperty('--swipe-x', dx + 'px');

      if (dx <= -SWIPE_THRESHOLD) {
        // Swipe out ke kiri -> Next Question
        if (curIndex < qs.length - 1) {
          cardEl.classList.add('slide-out-left');
          setTimeout(function () {
            nextListeningQuestion('slide-in-right');
            suppressClick = false;
          }, 200);
          return;
        }
      } else if (dx >= SWIPE_THRESHOLD) {
        // Swipe out ke kanan -> Prev Question
        if (curIndex > 0) {
          cardEl.classList.add('slide-out-right');
          setTimeout(function () {
            prevListeningQuestion('slide-in-left');
            suppressClick = false;
          }, 200);
          return;
        }
      }

      // Jika jarak geser < threshold atau mencapai batas (soal pertama/terakhir):
      // Kartu membal kembali ke tengah dengan spring transition (cubic-bezier(0.175, 0.885, 0.32, 1.275))
      cardEl.style.transition = 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease';
      cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
      cardEl.style.boxShadow = '';

      setTimeout(function () {
        cardEl.style.transition = '';
        cardEl.style.transform = '';
        cardEl.style.boxShadow = '';
        suppressClick = false;
      }, 360);
    }

    // Tangkap klik saat drag terjadi agar opsi/tombol tidak terpilih secara tidak sengaja
    cardEl.addEventListener('click', function (e) {
      if (suppressClick) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);

    // Pasang Pointer Events yang mencakup mouse drag dan touch swipe
    cardEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
  }

  function prevListeningQuestion(animClass) {
    var qs = getFilteredQuestions();
    if (curIndex > 0) {
      curIndex--;
      selectedChoice = null;
      closeJlptDetailSheet();
      stopJlptAudio();
      renderListeningQuestion(animClass || 'slide-in-left');
    }
  }

  function nextListeningQuestion(animClass) {
    var qs = getFilteredQuestions();
    if (curIndex < qs.length - 1) {
      curIndex++;
      selectedChoice = null;
      closeJlptDetailSheet();
      stopJlptAudio();
      renderListeningQuestion(animClass || 'slide-in-right');
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
      slot.innerHTML =
        '<div style="text-align:center;padding:32px 16px;color:var(--text-muted);">' +
          '<p style="font-size:14px;font-weight:700;">Tidak ada soal untuk kategori ini.</p>' +
        '</div>';
      return;
    }

    if (curIndex >= qs.length) curIndex = 0;
    var q = qs[curIndex];
    var isAnswered = selectedChoice !== null;
    var correctOptId = (q.answerIndex !== undefined ? q.answerIndex + 1 : (q.correct_answer || 1));
    var qSituation = q.situation || '';
    var qJa = q.questionJapanese || q.question || '';
    var qId = q.questionIndonesian || '';
    var hasJees = !!(q.audioUrl || q.audio_url);
    var mondaiShortLabel = q.mondaiLabel ? q.mondaiLabel.replace(/Mondai\s*\d+\s*:\s*/i, '') : (q.mondai || 'Mondai');

    var optionsHtml = (q.options || []).map(function (opt, i) {
      var optId = (typeof opt === 'object' && opt.id !== undefined) ? opt.id : (i + 1);
      var textJa = (typeof opt === 'object') ? (opt.text || '') : String(opt);
      var textId = (typeof opt === 'object') ? (opt.textId || '') : '';
      var cls = 'jlpt-opt-btn';

      if (isAnswered) {
        cls += ' locked';
        if (optId === correctOptId) {
          cls += ' correct';
        } else if (optId === selectedChoice) {
          cls += ' wrong';
        }
      }

      return '<button type="button" class="' + cls + '" data-opt-id="' + optId + '" onclick="selectJlptChoice(' + optId + ', ' + correctOptId + ')">' +
        '<span class="jlpt-opt-badge">' + optId + '</span>' +
        '<div class="jlpt-opt-texts">' +
          '<div class="jlpt-opt-ja">' + escapeHtml(textJa) + '</div>' +
          (textId ? '<div class="jlpt-opt-id">' + escapeHtml(textId) + '</div>' : '') +
        '</div>' +
      '</button>';
    }).join('');

    slot.innerHTML =
      '<div class="jlpt-mobile-wrapper">' +
        '<!-- Touch Card with Gestures -->' +
        '<div class="jlpt-mobile-card" id="jlptMobileCard">' +
          '<!-- Header Row -->' +
          '<div class="jlpt-card-header">' +
            '<div class="jlpt-badge-mondai">' +
              '<span class="jlpt-badge-dot"></span>' +
              '<span>' + escapeHtml(q.level) + ' · ' + escapeHtml(mondaiShortLabel) + '</span>' +
            '</div>' +
            '<div class="jlpt-counter-pill">' + (curIndex + 1) + ' / ' + qs.length + '</div>' +
          '</div>' +

          '<!-- Compact Situation Info Chip -->' +
          (qSituation ?
            '<div class="jlpt-situation-chip">' +
              '<span class="jlpt-sit-icon">📌</span>' +
              '<span class="jlpt-sit-text">' + escapeHtml(qSituation) + '</span>' +
            '</div>'
          : '') +

          '<!-- Streamlined Single Audio Player Strip -->' +
          '<div class="jlpt-audio-row">' +
            '<button type="button" class="jlpt-primary-play-btn" id="jlptMainPlayBtn" onclick="togglePlayJlptPrimaryAudio()" aria-label="Putar Audio">' +
              '<span class="jlpt-play-icon" id="jlptPlayIcon">▶</span>' +
              '<span id="jlptPlayText">Putar Audio</span>' +
              '<span class="jlpt-mini-wave" id="jlptMiniWave">' +
                '<span></span><span></span><span></span><span></span>' +
              '</span>' +
            '</button>' +
            (hasJees ?
              '<button type="button" class="jlpt-jees-chip" id="jlptJeesChip" onclick="togglePlayJlptJeesAudio()" title="Dengarkan rekaman siaran resmi JEES">' +
                '📻 JEES' +
              '</button>'
            : '') +
            '<span class="jlpt-replay-pill" id="jlptReplayPill"></span>' +
          '</div>' +

          '<!-- Question Typography (No clunky labels) -->' +
          '<div class="jlpt-question-block">' +
            '<h3 class="jlpt-question-ja">' + escapeHtml(qJa) + '</h3>' +
            (qId ? '<p class="jlpt-question-id">' + escapeHtml(qId) + '</p>' : '') +
          '</div>' +

          '<!-- Tactile Options -->' +
          '<div class="jlpt-options-list">' +
            optionsHtml +
          '</div>' +

          '<!-- Feedback Slot -->' +
          '<div id="jlptFeedbackSlot"></div>' +

          '<!-- Quick Bottom Sheet Triggers (Ergonomis, Multi-Device) -->' +
          '<div class="jlpt-sheet-triggers">' +
            '<button type="button" class="jlpt-sheet-trigger-btn" onclick="openJlptDetailSheet(\'script\')" aria-label="' + t('jlpt.tab-script-aria', 'Buka Naskah Dialog') + '">' +
              '<span>' + t('jlpt.tab-script', '📝 Naskah') + '</span>' +
            '</button>' +
            '<button type="button" class="jlpt-sheet-trigger-btn" id="jlptSheetTriggerBtn" onclick="openJlptDetailSheet(\'explain\')" aria-label="' + t('jlpt.tab-explain-aria', 'Buka Kunci dan Pembahasan') + '">' +
              '<span>' + t('jlpt.tab-explain-btn', '💡 Pembahasan') + '</span>' +
            '</button>' +
            '<button type="button" class="jlpt-sheet-trigger-btn" onclick="openJlptDetailSheet(\'vocab\')" aria-label="' + t('jlpt.open-vocab-aria', 'Buka Daftar Kosakata') + '">' +
              '<span>' + t('jlpt.tab-vocab', '📚 Kosakata') + '</span>' +
            '</button>' +
          '</div>' +

          '<!-- Dynamic Swipe Cues -->' +
          '<div class="jlpt-swipe-cue jlpt-cue-prev" id="jlptCuePrev">' + t('jlpt.prev-question', '◀ Soal Sebelumnya') + '</div>' +
          '<div class="jlpt-swipe-cue jlpt-cue-next" id="jlptCueNext">' + t('jlpt.next-question', 'Soal Berikutnya ▶') + '</div>' +
        '</div>' +

        '<!-- Bottom Clickable Navigation with Multi-Device Indicators -->' +
        '<div class="jlpt-bottom-nav">' +
          '<button type="button" class="jlpt-nav-pill" ' + (curIndex === 0 ? 'disabled' : '') + ' onclick="prevListeningQuestion()" aria-label="' + t('jlpt.soal-sebelumnya', '◀ Soal Sebelumnya') + '">← ' + t('jlpt.mundur', 'Mundur') + '</button>' +
          '<div class="jlpt-nav-status">' +
            '<span class="jlpt-nav-counter">' + (curIndex + 1) + ' / ' + qs.length + '</span>' +
            '<span class="jlpt-swipe-subhint"><span class="jlpt-hint-arrows">↔</span> ' + t('jlpt.geser-kartu', 'Geser kartu') + '</span>' +
          '</div>' +
          '<button type="button" class="jlpt-nav-pill" ' + (curIndex === qs.length - 1 ? 'disabled' : '') + ' onclick="nextListeningQuestion()" aria-label="' + t('jlpt.soal-berikutnya', 'Soal Berikutnya ▶') + '">' + t('jlpt.maju', 'Maju') + ' →</button>' +
        '</div>' +
      '</div>';

    // Initialize gestures on the newly rendered card
    var cardEl = document.getElementById('jlptMobileCard');
    if (cardEl) initCardGestures(cardEl);

    // Pre-populate bottom sheet with current item
    populateDetailSheet(q, correctOptId);
    updateAudioUi();
  }

  // Keyboard Navigation Support
  function handleKeyDown(e) {
    var modal = document.getElementById('listeningPanelModal');
    if (!modal || !modal.classList.contains('open')) return;

    if (e.key === 'Escape') {
      if (sheetOpen) {
        closeJlptDetailSheet();
      } else {
        closeListeningPanel();
      }
    } else if (e.key === 'ArrowRight' && !sheetOpen) {
      nextListeningQuestion();
    } else if (e.key === 'ArrowLeft' && !sheetOpen) {
      prevListeningQuestion();
    } else if (e.key === ' ' && !sheetOpen && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      togglePlayJlptPrimaryAudio();
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }

  // Bind to global window
  window.openListeningPanel = openListeningPanel;
  window.closeListeningPanel = closeListeningPanel;
  window.setListeningLevel = setListeningLevel;
  window.setListeningMondai = setListeningMondai;
  window.togglePlayJlptPrimaryAudio = togglePlayJlptPrimaryAudio;
  window.togglePlayJlptAiAudio = togglePlayJlptPrimaryAudio;
  window.togglePlayJlptJeesAudio = togglePlayJlptJeesAudio;
  window.togglePlayJlptAudio = togglePlayJlptAudio;
  window.playJlptSpeech = playJlptSpeech;
  window.stopJlptAudio = stopJlptAudio;
  window.selectJlptChoice = selectJlptChoice;
  window.openJlptDetailSheet = openJlptDetailSheet;
  window.closeJlptDetailSheet = closeJlptDetailSheet;
  window.switchJlptSheetTab = switchJlptSheetTab;
  window.prevListeningQuestion = prevListeningQuestion;
  window.nextListeningQuestion = nextListeningQuestion;

  window.FiezelJlptListening = {
    initBank: initBank,
    open: openListeningPanel,
    close: closeListeningPanel,
    playPrimary: togglePlayJlptPrimaryAudio,
    playAi: togglePlayJlptPrimaryAudio,
    playJees: togglePlayJlptJeesAudio,
    playSpeech: playJlptSpeech,
    stop: stopJlptAudio,
    openSheet: openJlptDetailSheet,
    closeSheet: closeJlptDetailSheet
  };

  // Pre-fetch bank saat idle
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(function () { initBank(); });
  } else {
    setTimeout(initBank, 1500);
  }
})();
