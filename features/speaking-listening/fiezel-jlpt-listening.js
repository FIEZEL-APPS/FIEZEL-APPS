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
  var audioPlaybackRate = 1.0;

  var curScriptMode = 'ruby'; // 'ruby' | 'kanji' | 'romaji'
  try {
    var savedScriptMode = localStorage.getItem('fiezel-jlpt-script-mode');
    if (savedScriptMode && ['ruby', 'kanji', 'romaji'].indexOf(savedScriptMode) !== -1) {
      curScriptMode = savedScriptMode;
    }
  } catch (_) {}

  var isExamMode = false;
  var examTimeRemaining = 0;
  var examTimerId = null;
  var currentSpeakingTurnIdx = -1;

  var JLPT_KANJI_DICT = [
    { k: '男の人', r: 'おとこのひと', ro: 'otoko no hito' },
    { k: '女の人', r: 'おんなのひと', ro: 'onna no hito' },
    { k: '男の子', r: 'おとこのこ', ro: 'otokonoko' },
    { k: '女の子', r: 'おんなのこ', ro: 'onnanoko' },
    { k: 'お母さん', r: 'おかあさん', ro: 'okaasan' },
    { k: 'お父さん', r: 'おとうさん', ro: 'otousan' },
    { k: '先生', r: 'せんせい', ro: 'sensei' },
    { k: '学生', r: 'がくせい', ro: 'gakusei' },
    { k: '店長', r: 'てんちょう', ro: 'tenchou' },
    { k: '医者', r: 'いしゃ', ro: 'isha' },
    { k: '患者', r: 'かんじゃ', ro: 'kanja' },
    { k: '駅員', r: 'えきいん', ro: 'ekiin' },
    { k: '部長', r: 'ぶちょう', ro: 'buchou' },
    { k: '山田', r: 'やまだ', ro: 'Yamada' },
    { k: '田中', r: 'たなか', ro: 'Tanaka' },
    { k: '電車', r: 'でんしゃ', ro: 'densha' },
    { k: '京都', r: 'きょうと', ro: 'Kyouto' },
    { k: '両方', r: 'りょうほう', ro: 'ryouhou' },
    { k: '受付', r: 'うけつけ', ro: 'uketsuke' },
    { k: '本屋', r: 'ほんや', ro: 'hon\'ya' },
    { k: '東口', r: 'ひがしぐち', ro: 'higashiguchi' },
    { k: '西口', r: 'にしぐち', ro: 'nishiguchi' },
    { k: '改札口', r: 'かいさつぐち', ro: 'kaisatsuguchi' },
    { k: '昼ご飯', r: 'ひるごはん', ro: 'hirugohan' },
    { k: '1時間', r: 'いちじかん', ro: 'ichijikan' },
    { k: '2時間', r: 'にじかん', ro: 'nijikan' },
    { k: '3時間', r: 'さんじかん', ro: 'sanjikan' },
    { k: '時間', r: 'じかん', ro: 'jikan' },
    { k: '時半', r: 'じはん', ro: 'jihan' },
    { k: '言っています', r: 'いっています', ro: 'itte imasu' },
    { k: '言います', r: 'いいます', ro: 'iimasu' },
    { k: '言って', r: 'いって', ro: 'itte' },
    { k: '言う', r: 'いう', ro: 'iu' },
    { k: '本', r: 'ほん', ro: 'hon' },
    { k: '時', r: 'じ', ro: 'ji' },
    { k: '半', r: 'はん', ro: 'han' },
    { k: '人', r: 'ひと', ro: 'hito' },
    { k: '友達', r: 'ともだち', ro: 'tomodachi' },
    { k: '友だち', r: 'ともだち', ro: 'tomodachi' },
    { k: '留学生', r: 'りゅうがくせい', ro: 'ryuugakusei' },
    { k: '店員', r: 'てんいん', ro: 'ten\'in' },
    { k: '家族', r: 'かぞく', ro: 'kazoku' },
    { k: '子ども', r: 'こども', ro: 'kodomo' },
    { k: '子供', r: 'こども', ro: 'kodomo' },
    { k: '皆さん', r: 'みなさん', ro: 'minasan' },
    { k: '駅', r: 'えき', ro: 'eki' },
    { k: '学校', r: 'がっこう', ro: 'gakkou' },
    { k: '教室', r: 'きょうしつ', ro: 'kyoushitsu' },
    { k: '病院', r: 'びょういん', ro: 'byouin' },
    { k: '会社', r: 'かいしゃ', ro: 'kaisha' },
    { k: '部屋', r: 'へや', ro: 'heya' },
    { k: '店', r: 'みせ', ro: 'mise' },
    { k: '東京', r: 'とうきょう', ro: 'Toukyou' },
    { k: '空港', r: 'くうこう', ro: 'kuukou' },
    { k: '飛行機', r: 'ひこうき', ro: 'hikouki' },
    { k: '特急', r: 'とっきゅう', ro: 'tokkyuu' },
    { k: '快速', r: 'かいそく', ro: 'kaisoku' },
    { k: '普通', r: 'ふつう', ro: 'futsuu' },
    { k: '今日', r: 'きょう', ro: 'kyou' },
    { k: '明日', r: 'あした', ro: 'ashita' },
    { k: '昨日', r: 'きのう', ro: 'kinou' },
    { k: '毎日', r: 'まいにち', ro: 'mainichi' },
    { k: '朝', r: 'あさ', ro: 'asa' },
    { k: '昼', r: 'ひる', ro: 'hiru' },
    { k: '夜', r: 'よる', ro: 'yoru' },
    { k: '晩', r: 'ばん', ro: 'ban' },
    { k: '何時', r: 'なんじ', ro: 'nanji' },
    { k: '何分', r: 'なんぷん', ro: 'nanpun' },
    { k: '勉強', r: 'べんきょう', ro: 'benkyou' },
    { k: '旅行', r: 'りょこう', ro: 'ryokou' },
    { k: '質問', r: 'しつもん', ro: 'shitsumon' },
    { k: '問題', r: 'もんだい', ro: 'mondai' },
    { k: '答え', r: 'こたえ', ro: 'kotae' },
    { k: '準備', r: 'じゅんび', ro: 'junbi' },
    { k: '大丈夫', r: 'だいじょうぶ', ro: 'daijoubu' },
    { k: '大変', r: 'たいへん', ro: 'taihen' }
  ];

  /* Single-Pass Regex Engine (Anti-Nested Ruby) */
  var JLPT_KANJI_DICT_SORTED = null;
  var JLPT_KANJI_REGEX = null;
  var JLPT_KANJI_MAP = {};

  function initKanjiDictionaryEngine() {
    if (JLPT_KANJI_REGEX) return;
    JLPT_KANJI_DICT_SORTED = JLPT_KANJI_DICT.slice().sort(function (a, b) {
      return b.k.length - a.k.length;
    });
    var keys = [];
    for (var i = 0; i < JLPT_KANJI_DICT_SORTED.length; i++) {
      var item = JLPT_KANJI_DICT_SORTED[i];
      JLPT_KANJI_MAP[item.k] = item;
      keys.push(item.k);
    }
    JLPT_KANJI_REGEX = new RegExp(keys.join('|'), 'g');
  }

  function formatMmSs(sec) {
    var s = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(s / 60);
    var rem = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (rem < 10 ? '0' : '') + rem;
  }

  function renderFuriganaText(textJa, mode) {
    if (!textJa) return '';
    if (mode === 'kanji') return escapeHtml(textJa);
    initKanjiDictionaryEngine();

    var lastIdx = 0;
    var out = '';
    textJa.replace(JLPT_KANJI_REGEX, function (match, offset) {
      out += escapeHtml(textJa.slice(lastIdx, offset));
      var entry = JLPT_KANJI_MAP[match];
      if (entry) {
        if (mode === 'romaji') {
          out += '<ruby class="jlpt-ruby">' + escapeHtml(entry.k) + '<rp>(</rp><rt class="jlpt-rt-ro">' + escapeHtml(entry.ro || entry.r) + '</rt><rp>)</rp></ruby>';
        } else {
          out += '<ruby class="jlpt-ruby">' + escapeHtml(entry.k) + '<rp>(</rp><rt>' + escapeHtml(entry.r) + '</rt><rp>)</rp></ruby>';
        }
      } else {
        out += escapeHtml(match);
      }
      lastIdx = offset + match.length;
      return match;
    });
    out += escapeHtml(textJa.slice(lastIdx));
    return out;
  }

  /* ---------- Precision Audio & Scrubber State ---------- */
  var rafSyncId = null;
  var isScrubbing = false;
  var wasPlayingBeforeScrub = false;
  var pendingSeekSec = null;

  function startAudioRafSync() {
    stopAudioRafSync();
    function step() {
      if (!audioObj || !audioPlaying) {
        stopAudioRafSync();
        return;
      }
      syncAudioScrubberAndTurns(audioObj.currentTime, audioObj.duration);
      rafSyncId = requestAnimationFrame(step);
    }
    rafSyncId = requestAnimationFrame(step);
  }

  function stopAudioRafSync() {
    if (rafSyncId) {
      cancelAnimationFrame(rafSyncId);
      rafSyncId = null;
    }
  }

  function syncAudioScrubberAndTurns(curTime, duration) {
    if (pendingSeekSec !== null) {
      if (curTime < pendingSeekSec - 0.2) {
        return;
      }
      pendingSeekSec = null;
    }

    var qs = getFilteredQuestions();
    if (qs && qs[curIndex]) {
      var q = qs[curIndex];
      var timestamps = q.turnTimestamps || [];
      if (timestamps.length > 0) {
        var activeIdx = -1;
        var dur = duration || 9999;
        for (var i = 0; i < timestamps.length; i++) {
          var start = timestamps[i];
          var next = (i < timestamps.length - 1) ? timestamps[i + 1] : dur;
          if (curTime >= (start - 0.05) && curTime < (next - 0.02)) {
            activeIdx = i;
            break;
          }
        }
        if (activeIdx !== currentSpeakingTurnIdx) {
          highlightTurn(activeIdx);
        }
      }
    }

    if (!isScrubbing) {
      var curEl = document.getElementById('jlptScrubTimeCur');
      var durEl = document.getElementById('jlptScrubTimeDur');
      var fillEl = document.getElementById('jlptScrubFill');
      var thumbEl = document.getElementById('jlptScrubThumb');
      var trackEl = document.getElementById('jlptScrubTrack');

      if (curEl) curEl.textContent = formatMmSs(curTime);
      if (durEl && duration && isFinite(duration) && duration > 0) {
        durEl.textContent = formatMmSs(duration);
      }

      var pct = (duration && isFinite(duration) && duration > 0)
        ? Math.min(100, Math.max(0, (curTime / duration) * 100))
        : 0;

      if (fillEl) fillEl.style.width = pct + '%';
      if (thumbEl) thumbEl.style.left = pct + '%';
      if (trackEl) trackEl.setAttribute('aria-valuenow', Math.round(pct));
    }
  }

  function highlightTurn(idx) {
    currentSpeakingTurnIdx = idx;
    var allTurns = document.querySelectorAll('.jlpt-dialogue-turn');
    allTurns.forEach(function (el, i) {
      var isNow = (i === idx);
      el.classList.toggle('speaking-now', isNow);
      if (isNow && sheetOpen) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (_) {}
      }
    });
  }

  function t(k, fallback) {
    try {
      var I = (typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)).FiezelI18n;
      if (I && typeof I.t === 'function') {
        var res = I.t(k);
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
    var wasOpen = !!(modal && modal.classList.contains('open'));
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      try {
        var appEl = document.getElementById('app');
        if (appEl) { appEl.setAttribute('aria-hidden', 'true'); if ('inert' in appEl) appEl.inert = true; }
        var nav = document.querySelector('.bottomnav,.nav-bar');
        if (nav) { nav.setAttribute('aria-hidden', 'true'); if ('inert' in nav) nav.inert = true; }
      } catch (_) {}
    }
    // m025-495: swipe back / tombol kembali menutup modal ini, bukan menembus ke belakangnya.
    if (modal && !wasOpen) {
      try { self.FiezelBackNav && self.FiezelBackNav.pushLayer && self.FiezelBackNav.pushLayer({ id: 'jlpt-listening', close: function () { closeListeningPanel(); return true; } }); } catch (_) {}
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

  function hideListeningPanel() {
    var modal = document.getElementById('listeningPanelModal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      try {
        var appEl = document.getElementById('app');
        if (appEl) { appEl.removeAttribute('aria-hidden'); if ('inert' in appEl) appEl.inert = false; }
        var nav = document.querySelector('.bottomnav,.nav-bar');
        if (nav) { nav.removeAttribute('aria-hidden'); if ('inert' in nav) nav.inert = false; }
      } catch (_) {}
    }
    closeJlptDetailSheet();
    stopJlptAudio();
  }

  function closeListeningPanel() {
    hideListeningPanel();
    try { self.FiezelBackNav && self.FiezelBackNav.dismiss && self.FiezelBackNav.dismiss('jlpt-listening'); } catch (_) {}
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
      if (playText) playText.textContent = isPrimaryPlaying ? t('jlpt.pause-audio', 'Jeda Audio') : t('jlpt.play-audio', 'Putar Audio');
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

    // Speed Button
    var speedBtn = document.getElementById('jlptSpeedBtn');
    if (speedBtn) {
      speedBtn.textContent = audioPlaybackRate.toFixed(1).replace(/\.0$/, '') + '×';
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

  function cycleAudioPlaybackRate() {
    if (audioPlaybackRate === 1.0) {
      audioPlaybackRate = 1.2;
    } else if (audioPlaybackRate === 1.2) {
      audioPlaybackRate = 0.8;
    } else {
      audioPlaybackRate = 1.0;
    }
    if (audioObj) {
      try {
        audioObj.playbackRate = audioPlaybackRate;
      } catch (_) {}
    }
    updateAudioUi();
  }

  /* ---------- Interactive Feature Engines ---------- */
  function startExamTimer(seconds) {
    stopExamTimer();
    examTimeRemaining = seconds;
    var banner = document.getElementById('jlptExamTimerBanner');
    var countdownEl = document.getElementById('jlptTimerCountdown');
    if (banner) {
      banner.style.display = 'flex';
      banner.classList.remove('timer-warning');
    }
    if (countdownEl) {
      countdownEl.textContent = formatMmSs(examTimeRemaining);
    }

    examTimerId = setInterval(function () {
      examTimeRemaining--;
      if (countdownEl) {
        countdownEl.textContent = formatMmSs(Math.max(0, examTimeRemaining));
      }
      if (banner && examTimeRemaining <= 10) {
        banner.classList.add('timer-warning');
      }
      if (examTimeRemaining <= 0) {
        stopExamTimer();
        handleExamTimeout();
      }
    }, 1000);
  }

  function stopExamTimer() {
    if (examTimerId) {
      clearInterval(examTimerId);
      examTimerId = null;
    }
    var banner = document.getElementById('jlptExamTimerBanner');
    if (banner) {
      banner.classList.remove('timer-warning');
      if (!isExamMode) banner.style.display = 'none';
    }
  }

  function handleExamTimeout() {
    if (selectedChoice !== null) return;
    var qs = getFilteredQuestions();
    if (!qs || !qs[curIndex]) return;
    var q = qs[curIndex];
    var correctOptId = (q.answerIndex !== undefined ? q.answerIndex + 1 : (q.correct_answer || 1));
    selectJlptChoice(-1, correctOptId);
  }

  function toggleJlptExamMode() {
    isExamMode = !isExamMode;
    stopExamTimer();
    stopJlptAudio();
    selectedChoice = null;
    replayCount = 0;
    closeJlptDetailSheet();

    var btn = document.getElementById('jlptExamToggleBtn');
    var txt = document.getElementById('jlptExamBtnText');
    var banner = document.getElementById('jlptExamTimerBanner');
    var modal = document.getElementById('listeningPanelModal');

    if (modal) {
      modal.classList.toggle('exam-mode-active', isExamMode);
    }
    if (btn) {
      btn.classList.toggle('active', isExamMode);
    }
    if (txt) {
      txt.textContent = isExamMode ? t('jlpt.exam-mode', 'Ujian') : t('jlpt.practice-mode', 'Latihan');
    }
    if (banner) {
      banner.style.display = isExamMode ? 'flex' : 'none';
    }

    renderListeningQuestion();
  }

  function setJlptScriptMode(mode) {
    if (['ruby', 'kanji', 'romaji'].indexOf(mode) === -1) return;
    curScriptMode = mode;
    try { localStorage.setItem('fiezel-jlpt-script-mode', mode); } catch (_) {}

    var modal = document.getElementById('listeningPanelModal');
    if (modal) {
      modal.classList.remove('jlpt-mode-ruby', 'jlpt-mode-kanji', 'jlpt-mode-romaji');
      modal.classList.add('jlpt-mode-' + mode);
    }

    var btnRuby = document.getElementById('btnModeRuby');
    var btnKanji = document.getElementById('btnModeKanji');
    var btnRomaji = document.getElementById('btnModeRomaji');
    if (btnRuby) btnRuby.classList.toggle('active', mode === 'ruby');
    if (btnKanji) btnKanji.classList.toggle('active', mode === 'kanji');
    if (btnRomaji) btnRomaji.classList.toggle('active', mode === 'romaji');

    var qs = getFilteredQuestions();
    if (qs && qs[curIndex]) {
      var correctOptId = (qs[curIndex].answerIndex !== undefined ? qs[curIndex].answerIndex + 1 : (qs[curIndex].correct_answer || 1));
      populateDetailSheet(qs[curIndex], correctOptId);
    }

    updateQuestionScriptMode();
  }

  function updateQuestionScriptMode() {
    var qs = getFilteredQuestions();
    if (!qs || !qs[curIndex]) return;
    var q = qs[curIndex];

    var qJaEl = document.querySelector('.jlpt-question-ja');
    if (qJaEl) {
      if (curScriptMode === 'romaji' && q.questionRomaji) {
        qJaEl.innerHTML = '<span class="jlpt-q-romaji" style="display:block;font-size:15px;font-weight:800;color:#0F172A;margin-bottom:4px;">' + escapeHtml(q.questionRomaji) + '</span>' +
          '<span class="jlpt-q-subja" style="font-size:12px;opacity:0.75;">' + renderFuriganaText(q.questionJapanese || q.question || '', 'ruby') + '</span>';
      } else {
        qJaEl.innerHTML = renderFuriganaText(q.questionJapanese || q.question || '', curScriptMode);
      }
    }

    var optJaEls = document.querySelectorAll('.jlpt-opt-ja');
    if (optJaEls && q.options) {
      optJaEls.forEach(function (el, idx) {
        var opt = q.options[idx];
        var textJa = (typeof opt === 'object') ? (opt.text || '') : String(opt);
        el.innerHTML = renderFuriganaText(textJa, curScriptMode);
      });
    }

    if (sheetOpen && q) {
      var correctOptId = (q.answerIndex !== undefined && q.options && q.options[q.answerIndex])
        ? (q.options[q.answerIndex].id || (q.answerIndex + 1))
        : 1;
      populateDetailSheet(q, correctOptId);
    }
  }

  function seekToJlptTurn(turnIdx) {
    if (isExamMode) {
      if (typeof window !== 'undefined' && window.toast) {
        window.toast(t('jlpt.exam-locked-note', 'Naskah Terkunci (Mode Ujian)'));
      }
      return;
    }

    var qs = getFilteredQuestions();
    if (!qs || !qs[curIndex]) return;
    var q = qs[curIndex];
    var timestamps = q.turnTimestamps || [];
    var targetSec = (timestamps[turnIdx] !== undefined) ? timestamps[turnIdx] : (turnIdx * 4.0);

    pendingSeekSec = targetSec;
    highlightTurn(turnIdx);

    if (audioObj) {
      var applyDirectSeek = function () {
        try {
          audioObj.currentTime = targetSec;
        } catch (e) {
          console.warn('[JLPT Audio] Seek error:', e);
        }
        if (audioObj.paused) {
          var p = audioObj.play();
          if (p && typeof p.catch === 'function') {
            p.catch(function () {});
          }
        }
        audioPlaying = true;
        updateAudioUi();
        startAudioRafSync();
      };

      if (audioObj.readyState >= 1) {
        applyDirectSeek();
      } else {
        audioObj.addEventListener('loadedmetadata', applyDirectSeek, { once: true });
        audioObj.addEventListener('canplay', applyDirectSeek, { once: true });
        try { audioObj.load(); } catch (_) {}
      }
      return;
    }

    var url = q.aiAudioUrl || q.audioUrl || ('./features/speaking-listening/audio-jlpt/' + q.id + '.mp3');
    var fallbackScript = q.scriptJapanese || q.script || '';
    playAudioStreamWithTarget(url, 'primary', fallbackScript, targetSec, turnIdx);
  }

  function safeNotifyMascot(event, data) {
    try {
      if (typeof window !== 'undefined' && typeof window.notifyMascot === 'function') {
        window.notifyMascot(event, data);
      }
    } catch (_) {}
  }

  function playAudioStreamWithTarget(url, source, fallbackScript, initialSec, targetTurnIdx) {
    if (audioPlaying && activeAudioSource === source && (initialSec === undefined || initialSec === null)) {
      stopJlptAudio();
      return;
    }

    if (isExamMode && replayCount >= 1) {
      if (typeof window !== 'undefined' && window.toast) {
        window.toast(t('jlpt.exam-audio-once', 'Audio hanya berputar 1 kali dalam mode ujian'));
      }
      updateAudioUi();
      return;
    }

    var hasTurn = (typeof targetTurnIdx === 'number' && targetTurnIdx >= 0);
    stopJlptAudio(hasTurn);
    if (hasTurn) {
      highlightTurn(targetTurnIdx);
    }
    pendingSeekSec = (typeof initialSec === 'number' && initialSec > 0) ? initialSec : null;

    if (!url) {
      if (fallbackScript) {
        playJlptSpeech(fallbackScript, source, hasTurn);
      }
      return;
    }

    try {
      audioObj = new Audio(url);
      audioObj.playbackRate = audioPlaybackRate;
      activeAudioSource = source;

      var onMetadataReady = function () {
        if (typeof initialSec === 'number' && initialSec > 0) {
          try {
            audioObj.currentTime = Math.min(initialSec, (audioObj.duration || initialSec));
          } catch (_) {}
        }
        if (hasTurn) {
          highlightTurn(targetTurnIdx);
        }
        renderScrubberMarkers();
      };

      audioObj.addEventListener('loadedmetadata', onMetadataReady, { once: true });

      audioObj.onended = function () {
        audioPlaying = false;
        activeAudioSource = null;
        currentSpeakingTurnIdx = -1;
        highlightTurn(-1);
        stopAudioRafSync();
        syncAudioScrubberAndTurns(audioObj ? audioObj.duration : 0, audioObj ? audioObj.duration : 0);
        updateAudioUi();
        safeNotifyMascot('listening-stop');
      };

      audioObj.onerror = function () {
        console.warn('[JLPT Audio] Gagal memuat audio ' + source + ':', url);
        audioPlaying = false;
        activeAudioSource = null;
        stopAudioRafSync();
        updateAudioUi();
        if (fallbackScript) playJlptSpeech(fallbackScript, source, hasTurn);
      };

      var playPromise = audioObj.play();
      if (playPromise !== undefined) {
        playPromise.then(function () {
          audioPlaying = true;
          activeAudioSource = source;
          replayCount++;
          updateAudioUi();
          if (hasTurn) {
            highlightTurn(targetTurnIdx);
          }
          startAudioRafSync();
          safeNotifyMascot('listening-start');
        }).catch(function (e) {
          console.warn('[JLPT Audio] Play error:', e);
          audioPlaying = false;
          activeAudioSource = null;
          stopAudioRafSync();
          updateAudioUi();
          safeNotifyMascot('listening-stop');
        });
      }
    } catch (err) {
      console.warn('[JLPT Audio] Init error:', err);
      if (fallbackScript) playJlptSpeech(fallbackScript, source, hasTurn);
    }
  }

  function playAudioStream(url, source, fallbackScript) {
    playAudioStreamWithTarget(url, source, fallbackScript, null);
  }

  function stopJlptAudio(keepHighlight) {
    stopAudioRafSync();
    if (!keepHighlight) {
      pendingSeekSec = null;
    }
    if (audioObj) {
      try {
        audioObj.pause();
        audioObj.currentTime = 0;
      } catch (_) {}
      audioObj = null;
    }
    if (typeof window !== 'undefined' && window.FiezelVoiceSay && typeof window.FiezelVoiceSay.stop === 'function') {
      try {
        window.FiezelVoiceSay.stop();
      } catch (_) {}
    }
    audioPlaying = false;
    activeAudioSource = null;
    if (!keepHighlight) {
      currentSpeakingTurnIdx = -1;
      highlightTurn(-1);
    }
    updateAudioUi();
    safeNotifyMascot('listening-stop');
  }

  function playJlptSpeech(text, source, keepHighlight) {
    if (!text) return;
    if (isExamMode && replayCount >= 1) {
      if (typeof window !== 'undefined' && window.toast) {
        window.toast(t('jlpt.exam-audio-once', 'Audio hanya berputar 1 kali dalam mode ujian'));
      }
      return;
    }

    stopJlptAudio(keepHighlight || (currentSpeakingTurnIdx >= 0));
    if (typeof window !== 'undefined' && window.FiezelVoiceSay && typeof window.FiezelVoiceSay.say === 'function') {
      try {
        activeAudioSource = source || 'voice';
        audioPlaying = true;
        replayCount++;
        updateAudioUi();
        safeNotifyMascot('listening-start');
        window.FiezelVoiceSay.say(text, { speed: audioPlaybackRate, suppressSubtitles: true })
          .then(function () {
            audioPlaying = false;
            activeAudioSource = null;
            updateAudioUi();
            safeNotifyMascot('listening-stop');
          })
          .catch(function () {
            audioPlaying = false;
            activeAudioSource = null;
            updateAudioUi();
            safeNotifyMascot('listening-stop');
          });
      } catch (_) {
        audioPlaying = false;
        activeAudioSource = null;
        updateAudioUi();
        safeNotifyMascot('listening-stop');
      }
    }
  }

  function initAudioScrubber() {
    var track = document.getElementById('jlptScrubTrack');
    if (!track || track._scrubberBound) return;
    track._scrubberBound = true;

    function getPercentageFromPointer(e) {
      var rect = track.getBoundingClientRect();
      var clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      var pos = (clientX - rect.left) / (rect.width || 1);
      return Math.min(1, Math.max(0, pos));
    }

    function onPointerDown(e) {
      if (isExamMode) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast(t('jlpt.exam-scrub-locked', 'Pencarian audio dinonaktifkan dalam Mode Ujian'));
        }
        return;
      }

      isScrubbing = true;
      wasPlayingBeforeScrub = audioPlaying;
      if (audioPlaying && audioObj) {
        try { audioObj.pause(); } catch (_) {}
      }

      try {
        if (track.setPointerCapture && e.pointerId !== undefined) {
          track.setPointerCapture(e.pointerId);
        }
      } catch (_) {}

      var pct = getPercentageFromPointer(e);
      updateScrubberPreview(pct);

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(e) {
      if (!isScrubbing) return;
      if (e.cancelable) e.preventDefault();
      var pct = getPercentageFromPointer(e);
      updateScrubberPreview(pct);
    }

    function onPointerUp(e) {
      if (!isScrubbing) return;
      isScrubbing = false;

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      try {
        if (track.releasePointerCapture && e.pointerId !== undefined && track.hasPointerCapture && track.hasPointerCapture(e.pointerId)) {
          track.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      var pct = getPercentageFromPointer(e);
      var duration = (audioObj && audioObj.duration && isFinite(audioObj.duration)) ? audioObj.duration : 0;
      var targetSec = pct * duration;

      if (audioObj) {
        try { audioObj.currentTime = targetSec; } catch (_) {}
        if (wasPlayingBeforeScrub) {
          var p = audioObj.play();
          if (p && typeof p.catch === 'function') p.catch(function () {});
          audioPlaying = true;
          startAudioRafSync();
        } else {
          syncAudioScrubberAndTurns(targetSec, duration);
        }
      } else {
        var qs = getFilteredQuestions();
        var q = (qs && qs[curIndex]) ? qs[curIndex] : null;
        if (q) {
          var url = q.aiAudioUrl || q.audioUrl || ('./features/speaking-listening/audio-jlpt/' + q.id + '.mp3');
          var fallback = q.scriptJapanese || q.script || '';
          playAudioStreamWithTarget(url, 'primary', fallback, targetSec);
        }
      }
      updateAudioUi();
    }

    function updateScrubberPreview(pct) {
      var fillEl = document.getElementById('jlptScrubFill');
      var thumbEl = document.getElementById('jlptScrubThumb');
      var curEl = document.getElementById('jlptScrubTimeCur');
      var duration = (audioObj && audioObj.duration && isFinite(audioObj.duration)) ? audioObj.duration : 0;
      var curSec = pct * duration;

      if (fillEl) fillEl.style.width = (pct * 100) + '%';
      if (thumbEl) thumbEl.style.left = (pct * 100) + '%';
      if (curEl) curEl.textContent = formatMmSs(curSec);

      var qs = getFilteredQuestions();
      if (qs && qs[curIndex]) {
        var timestamps = qs[curIndex].turnTimestamps || [];
        for (var i = 0; i < timestamps.length; i++) {
          var start = timestamps[i];
          var next = (i < timestamps.length - 1) ? timestamps[i + 1] : (duration || 9999);
          if (curSec >= start && curSec < next) {
            highlightTurn(i);
            break;
          }
        }
      }
    }

    track.addEventListener('pointerdown', onPointerDown);
  }

  function renderScrubberMarkers() {
    var markersEl = document.getElementById('jlptScrubMarkers');
    if (!markersEl) return;
    markersEl.innerHTML = '';

    var qs = getFilteredQuestions();
    if (!qs || !qs[curIndex]) return;
    var q = qs[curIndex];
    var timestamps = q.turnTimestamps || [];
    var duration = (audioObj && audioObj.duration && isFinite(audioObj.duration)) ? audioObj.duration : 0;
    if (!duration || timestamps.length === 0) return;

    timestamps.forEach(function (sec, idx) {
      var pct = Math.min(100, Math.max(0, (sec / duration) * 100));
      var dot = document.createElement('div');
      dot.className = 'jlpt-scrub-marker-dot';
      dot.style.left = pct + '%';
      dot.setAttribute('title', 'Giliran ' + (idx + 1) + ' (' + formatMmSs(sec) + ')');
      markersEl.appendChild(dot);
    });
  }

  function playAudioStream(url, source, fallbackScript) {
    if (audioPlaying && activeAudioSource === source) {
      stopJlptAudio();
      return;
    }

    if (isExamMode && replayCount >= 1 && (source === 'primary' || source === 'ai')) {
      if (typeof window !== 'undefined' && window.toast) {
        window.toast(t('jlpt.exam-audio-once', 'Audio hanya berputar 1 kali dalam mode ujian'));
      }
      return;
    }

    stopJlptAudio();

    if (!url) {
      if (fallbackScript) {
        playJlptSpeech(fallbackScript, source);
      }
      return;
    }

    try {
      audioObj = new Audio(url);
      audioObj.playbackRate = audioPlaybackRate;
      activeAudioSource = source;
      audioObj.ontimeupdate = syncPlayingTurnHighlight;

      audioObj.onended = function () {
        audioPlaying = false;
        activeAudioSource = null;
        currentSpeakingTurnIdx = -1;
        highlightTurn(-1);
        updateAudioUi();
        safeNotifyMascot('listening-stop');
      };

      audioObj.onerror = function () {
        console.warn('[JLPT Audio] Gagal memuat audio ' + source + ':', url);
        if (typeof window !== 'undefined' && window.caches && url && url.indexOf('blob:') !== 0) {
          window.caches.match(url).then(function (res) {
            if (res) return res.blob();
            return null;
          }).then(function (blob) {
            if (blob) {
              var blobUrl = URL.createObjectURL(blob);
              playAudioStream(blobUrl, source, fallbackScript);
              return;
            }
            audioPlaying = false;
            activeAudioSource = null;
            updateAudioUi();
            if (fallbackScript) playJlptSpeech(fallbackScript, source);
          }).catch(function () {
            audioPlaying = false;
            activeAudioSource = null;
            updateAudioUi();
            if (fallbackScript) playJlptSpeech(fallbackScript, source);
          });
          return;
        }
        audioPlaying = false;
        activeAudioSource = null;
        updateAudioUi();
        if (fallbackScript) playJlptSpeech(fallbackScript, source);
      };

      var playPromise = audioObj.play();
      if (playPromise !== undefined) {
        playPromise.then(function () {
          audioPlaying = true;
          activeAudioSource = source;
          replayCount++;
          updateAudioUi();
          safeNotifyMascot('listening-start');
        }).catch(function (e) {
          console.warn('[JLPT Audio] Play error:', e);
          audioPlaying = false;
          activeAudioSource = null;
          updateAudioUi();
          safeNotifyMascot('listening-stop');
          if (fallbackScript) playJlptSpeech(fallbackScript, source);
        });
      }
    } catch (err) {
      console.warn('[JLPT Audio] Init error:', err);
      if (fallbackScript) playJlptSpeech(fallbackScript, source);
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

  var JLPT_DISTRACTOR_KB = {
    'jlpt-n5-m1-04': {
      1: 'Ibu menegaskan payung biru rusak (こわれている) dan menyuruh memakai payung hitam.',
      2: 'Cuaca mendung dan akan turun hujan; ibu menyuruh membawa payung, bukan meninggalkannya.',
      3: 'Payung putih tidak pernah disebutkan dalam percakapan janji cuaca ini.'
    },
    'jlpt-n5-m2-01': {
      1: 'Pria sempat menduga sibuk bekerja, namun Tanaka membantah dan menegaskan ia sakit kepala.',
      3: 'Tanaka tidak lupa acara pesta; ia ingat tetapi terpaksa beristirahat di rumah karena sakit kepala.',
      4: 'Teman datang ke rumah sama sekali bukan alasan yang disebutkan dalam dialog.'
    },
    'jlpt-n5-m2-02': {
      1: 'Kunci tidak berada di atas meja melainkan terjatuh di lantai dekat tempat duduk.',
      2: 'Pria sempat memeriksa tasnya tetapi kunci tidak ada di dalam tas.',
      4: 'Area depan pintu tidak pernah disebutkan sebagai lokasi penemuan kunci.'
    },
    'jlpt-n5-m2-03': {
      1: 'Pukul 09:00 bukan jam mulai kelas pagi yang dipilih murid.',
      2: 'Pukul 18:30 (6時半) adalah jadwal kelas malam, bukan kelas pagi yang dipilih.',
      3: 'Pukul 11:30 adalah waktu kelas pagi selesai (おわります), bukan waktu mulai.'
    },
    'jlpt-n5-m2-04': {
      1: 'Wanita menolak kopi karena jarang meminumnya (あまり のまない).',
      2: 'Teh hijau tidak dipilih oleh wanita.',
      4: 'Air putih bukan minuman yang disepakati untuk dipesan.'
    },
    'jlpt-n5-m3-01': {
      2: '"じゃあ、また" adalah ungkapan berpamitan/sampai jumpa, bukan saat memasuki ruangan.',
      3: '"ごちそうさまでした" diucapkan setelah selesai makan, bukan saat bertamu/masuk ruangan.'
    },
    'jlpt-n5-m3-02': {
      1: '"ただいま" diucapkan oleh orang yang baru pulang ke rumah, bukan yang berangkat keluar.',
      3: '"おかえりなさい" diucapkan oleh orang di rumah menyambut yang pulang, bukan yang pergi.'
    },
    'jlpt-n5-m3-03': {
      2: '"いただきます" diucapkan oleh penerima sebelum makan/menerima sesuatu, bukan oleh pemberi.',
      3: '"どういたしまして" diucapkan membalas terima kasih, bukan saat menyerahkan kado.'
    },
    'jlpt-n5-m4-01': {
      2: '"どういたしまして" untuk membalas terima kasih, bukan menyetujui ucapan cuaca dingin.',
      3: '"さようなら" untuk berpisah/selamat tinggal, tidak sesuai untuk percakapan santai di tempat.'
    },
    'jlpt-n5-m4-02': {
      1: '"あそこです" menjawab lokasi (di mana), padahal pertanyaan menanyakan kepemilikan (だれのかさ).',
      3: '"いいえ、ちがいます" tidak menjawab pertanyaan siapa pemilik payung tersebut.'
    },
    'jlpt-n5-m4-03': {
      2: 'Bentuk lampau "のみました" tidak cocok untuk merespons ajakan minum teh bersama saat ini.',
      3: '"はい、おちゃです" hanya menyebutkan nama benda tanpa menyambut ajakan minum.'
    },
    'jlpt-n5-m4-04': {
      1: '"あしたです" menjawab waktu (kapan), bukan menjawab kesan tes yang sudah lewat (どうでしたか).',
      3: '"きょうしつに あります" menjawab keberadaan benda, bukan pengalaman mengikuti ujian.'
    },
    'jlpt-n4-m1-01': {
      1: 'Manajer menegaskan meja sudah dilap sebelumnya (テーブルは もう ふいたよ).',
      2: 'Menata menu dilakukan setelah menyiapkan gelas air minum di konter.',
      4: 'Membuka pintu restoran adalah langkah terakhir setelah semua persiapan selesai.'
    },
    'jlpt-n4-m1-02': {
      2: 'Obat merah diminum pagi dan malam hari saja, bukan siang hari.',
      3: 'Obat merah tidak boleh diminum siang hari; hanya obat putih yang diminum 3 kali sehari.',
      4: 'Dokter mewajibkan obat putih tetap diminum setelah makan siang.'
    },
    'jlpt-n4-m1-03': {
      1: 'Kereta tokkyuu memerlukan biaya tiket ekspres tambahan yang ingin dihindari penumpang.',
      2: 'Bus memerlukan waktu perjalanan terlalu lama dan ditolak oleh penumpang.',
      3: 'Taksi tidak dipilih karena biayanya mahal dan sudah ada kereta cepat.'
    },
    'jlpt-n4-m1-04': {
      1: 'Membeli kue dan camilan didelegasikan kepada rekan pria, bukan wanita.',
      2: 'Membeli minuman baru akan dilakukan setelah kartu ucapan terkumpul.',
      4: 'Membersihkan ruang rapat dilakukan nanti menjelang acara dimulai.'
    },
    'jlpt-n4-m2-01': {
      1: 'Yamada menegaskan ia bangun tepat waktu dan tidak bangun kesiangan.',
      3: 'Yamada tidak salah menaiki armada bus.',
      4: 'Yamada sudah hafal jalur perjalanan dan tidak tersesat di jalan.'
    },
    'jlpt-n4-m2-02': {
      1: 'Pria menganggap alur cerita film tersebut biasa saja dan mudah ditebak.',
      2: 'Adegan aksinya dinilai lumayan, namun aspek musik latarnya yang paling membuatnya kagum.',
      4: 'Kursi bioskop hanya fasilitas gedung bioskop, bukan bagian dari karya film.'
    },
    'jlpt-n4-m2-03': {
      1: 'Kuil Kiyomizudera sempat dikunjungi paling awal di pagi hari.',
      2: 'Wanita kehabisan waktu sehingga ada kuil yang batal dikunjungi.',
      3: 'Kuil Fushimi Inari sempat dikunjungi pada siang hari.'
    },
    'jlpt-n4-m2-04': {
      1: 'John menganggap tata bahasa bahasa Jepang menarik dan tidak terlalu menyulitkannya.',
      2: 'Percakapan (kaiwa) adalah kemampuan yang paling disenangi dan sering dilatih oleh John.',
      4: 'Mendengarkan memang menantang, tetapi menghafal kanji dinilai paling berat.'
    },
    'jlpt-n4-m3-01': {
      1: 'Kalimat ini menyuruh atasan pulang, bukan meminta izin bagi diri sendiri.',
      3: 'Kalimat bernada menuntut yang sangat tidak sopan digunakan kepada atasan/manajer.'
    },
    'jlpt-n4-m3-02': {
      1: 'Terlalu kasar dan blak-blakan untuk menolak ajakan rekan kerja.',
      3: 'Sangat konfrontatif dan melanggar kesantunan percakapan dalam budaya Jepang.'
    },
    'jlpt-n4-m3-03': {
      2: '"いただきます" diucapkan sebelum mulai makan, bukan saat selesai dan keluar restoran.',
      3: '"おねがいします" adalah permohonan tolong, bukan ungkapan apresiasi traktir makan.'
    },
    'jlpt-n4-m4-01': {
      2: 'Menolak tawaran bantuan secara kaku dan tidak wajar dalam etika Jepang.',
      3: '"どういたしまして" digunakan untuk membalas ucapan terima kasih, bukan tawaran bantuan.'
    },
    'jlpt-n4-m4-02': {
      1: '"きのうだったよ" merujuk waktu lampau kemarin, padahal rapat dijadwalkan hari ini.',
      2: '"かいぎしつだよ" menjawab tempat (di mana), bukan menjawab jam berapa rapat dimulai.'
    },
    'jlpt-n4-m4-03': {
      1: '"はい、いっぱいです" ambigu dan tidak sopan untuk menolak tawaran tambah minum.',
      3: '"ごちそうさまでした" digunakan saat pamit usai makan, bukan merespons tawaran minum.'
    },
    'jlpt-n4-m4-04': {
      2: '"はい、おしえました" berbentuk lampau (sudah memberi tahu), tidak menjawab pertanyaan saat ini.',
      3: '"いいえ、わかりません" terlalu kaku dan tidak informatif dalam memberikan petunjuk arah.'
    }
  };

  function resolveWhyFails(q, chosenOpt, optId, correctOptId) {
    if (!q || optId === correctOptId || optId <= 0) return '';
    if (chosenOpt && typeof chosenOpt === 'object' && chosenOpt.whyFails) {
      return String(chosenOpt.whyFails).trim();
    }
    var qId = q.id || q.itemId || '';
    if (qId && JLPT_DISTRACTOR_KB[qId] && JLPT_DISTRACTOR_KB[qId][optId]) {
      return JLPT_DISTRACTOR_KB[qId][optId];
    }
    if (q.explain || q.explanation) {
      var exp = q.explain || q.explanation;
      var regex = new RegExp('(?:Pilihan|Opsi)\\s*' + optId + '[^.]*\\.', 'i');
      var m = exp.match(regex);
      if (m && m[0]) return m[0].trim();
      return 'Bukan pilihan yang tepat berdasarkan keputusan akhir para tokoh dalam percakapan.';
    }
    return 'Opsi ini tidak sesuai dengan kesimpulan dan arahan tokoh dalam dialog audio.';
  }

  function submitAnswer(optId, correctOptId) {
    if (selectedChoice !== null) return;
    selectedChoice = optId;

    stopJlptAudio();
    stopExamTimer();

    var qs = getFilteredQuestions();
    var q = (qs && qs[curIndex]) ? qs[curIndex] : null;

    var btns = document.querySelectorAll('.jlpt-opt-btn');
    btns.forEach(function (btn) {
      btn.classList.add('locked');
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      var bId = parseInt(btn.getAttribute('data-opt-id'), 10);
      var bOpt = (q && q.options) ? q.options.find(function (o, idx) {
        var id = (typeof o === 'object' && o.id !== undefined) ? o.id : (idx + 1);
        return id === bId;
      }) : null;
      var bText = bOpt ? ((typeof bOpt === 'object' ? bOpt.text : bOpt) || '') : '';
      var bAria = 'Pilihan ' + bId + ': ' + bText;
      if (bId === correctOptId) {
        btn.classList.add('correct');
        bAria += ' (' + t('jlpt.kunci-tepat', 'KUNCI JAWABAN TEPAT') + ')';
      } else if (bId === optId && optId !== correctOptId) {
        btn.classList.add('wrong');
        bAria += ' (' + t('jlpt.not-quite-right', 'Kurang Tepat') + ')';
      }
      btn.setAttribute('aria-label', bAria);
    });

    var isRight = (optId === correctOptId);
    if (isRight) {
      if (window.uiSfx) { try { window.uiSfx('correct'); } catch (_) {} }
      safeNotifyMascot('correct');
    } else {
      if (window.uiSfx) { try { window.uiSfx('wrong'); } catch (_) {} }
      safeNotifyMascot('wrong');
    }

    var chosenOpt = (q && q.options) ? q.options.find(function (o, idx) {
      var id = (typeof o === 'object' && o.id !== undefined) ? o.id : (idx + 1);
      return id === optId;
    }) : null;
    var correctOpt = (q && q.options) ? q.options.find(function (o, idx) {
      var id = (typeof o === 'object' && o.id !== undefined) ? o.id : (idx + 1);
      return id === correctOptId;
    }) : null;

    var whyFailsNote = isRight ? '' : resolveWhyFails(q, chosenOpt, optId, correctOptId);

    if (typeof window !== 'undefined') {
      var itemKey = (q && (q.id || q.itemId)) || ('jlpt_' + curLevel.toLowerCase() + '_' + curIndex);
      var latencyMs = 6000;
      if (typeof window.updateMastery === 'function') {
        try {
          window.updateMastery('listening', itemKey, isRight, latencyMs, null, Date.now());
        } catch (_) {}
      }
      var recordFn = window.record || window.recordAnswer || (window.__fiezelAudit && window.__fiezelAudit.record);
      if (typeof recordFn === 'function') {
        try {
          var fakeQ = {
            id: itemKey,
            type: 'listening',
            level: curLevel,
            skill: 'listening_comprehension',
            target: itemKey,
            options: q && q.options ? q.options : [],
            answerIndex: (correctOptId - 1)
          };
          recordFn(fakeQ, isRight, latencyMs, optId > 0 ? (optId - 1) : null);
        } catch (_) {}
      }

      var chosenLabel = chosenOpt ? 
        ((chosenOpt.text || '') + (chosenOpt.textId ? ' (' + chosenOpt.textId + ')' : '')) : 
        (optId === -1 ? '(Waktu Habis)' : ('Pilihan ' + optId));
      var correctLabel = correctOpt ? 
        ((correctOpt.text || '') + (correctOpt.textId ? ' (' + correctOpt.textId + ')' : '')) : 
        ('Pilihan ' + correctOptId);

      if (typeof window.__getFiezelState === 'function') {
        try {
          var s = window.__getFiezelState();
          if (s && Array.isArray(s.history)) {
            s.totalAnswered = (s.totalAnswered || 0) + 1;
            if (isRight) s.totalCorrect = (s.totalCorrect || 0) + 1;
            var now = Date.now();
            s.history.push({
              attemptId: now.toString(36) + '-jlpt-' + Math.random().toString(36).slice(2, 6),
              id: itemKey,
              type: 'listening',
              level: curLevel,
              skill: 'listening_comprehension',
              target: itemKey,
              reviewBucket: 'listening',
              reviewKey: itemKey,
              difficulty: curLevel === 'N4' ? 2 : 1,
              ok: isRight,
              ms: latencyMs,
              confidence: null,
              selectedIndex: optId > 0 ? (optId - 1) : null,
              selectedChoice: optId,
              selectedAnswer: chosenLabel,
              correctAnswer: correctLabel,
              errorTag: isRight ? null : (whyFailsNote ? 'distractor_misconception' : 'jlpt_listening'),
              whyFails: isRight ? null : whyFailsNote,
              at: now
            });
            if (s.history.length > 1000) s.history.shift();

            if (typeof window.saveState === 'function') {
              try { window.saveState(); } catch (_) {}
            } else {
              try { localStorage.setItem('fiezel_state', JSON.stringify(s)); } catch (_) {}
            }
          }
        } catch (_) {}
      }
      if (window.bktRecord && typeof window.bktRecord === 'function') {
        try {
          window.bktRecord({ lessonSkill: 'listening_' + curLevel.toLowerCase(), skill: 'listening_' + curLevel.toLowerCase() }, isRight, 1);
        } catch (_) {}
      } else if (window.FiezelMasteryBKT && typeof window.FiezelMasteryBKT.update === 'function') {
        try {
          var rawBkt = localStorage.getItem('fiezel-mastery-bkt-v1');
          var bktData = rawBkt ? JSON.parse(rawBkt) : {};
          var updated = window.FiezelMasteryBKT.update(bktData, {
            lesson: 'listening_' + curLevel.toLowerCase(),
            correct: isRight,
            weight: 1
          }, Date.now());
          localStorage.setItem('fiezel-mastery-bkt-v1', JSON.stringify(updated));
        } catch (_) {}
      }
    }

    var optTexts = document.querySelectorAll('.jlpt-opt-texts');
    if (q && Array.isArray(q.options) && optTexts) {
      optTexts.forEach(function (el, idx) {
        var opt = q.options[idx];
        var textId = (typeof opt === 'object') ? (opt.textId || '') : '';
        if (textId && !el.querySelector('.jlpt-opt-id')) {
          var idDiv = document.createElement('div');
          idDiv.className = 'jlpt-opt-id';
          idDiv.textContent = textId;
          el.appendChild(idDiv);
        }
      });
    }
    var qBlock = document.querySelector('.jlpt-question-block');
    if (q && q.questionIndonesian && qBlock && !qBlock.querySelector('.jlpt-question-id')) {
      var qIdP = document.createElement('p');
      qIdP.className = 'jlpt-question-id';
      qIdP.textContent = q.questionIndonesian;
      qBlock.appendChild(qIdP);
    }

    renderFeedbackBanner(isRight, correctOptId, optId, whyFailsNote);
    var sheetTrigger = document.getElementById('jlptSheetTriggerBtn');
    if (sheetTrigger) {
      sheetTrigger.classList.add('pulse-hint');
    }

    if (qs && qs[curIndex]) {
      populateDetailSheet(qs[curIndex], correctOptId);
    }
  }

  function selectJlptChoice(optId, correctOptId) {
    return submitAnswer(optId, correctOptId);
  }

  function renderFeedbackBanner(isRight, correctOptId, optId, whyFails) {
    var container = document.getElementById('jlptFeedbackSlot');
    if (!container) return;

    var qs = getFilteredQuestions();
    var q = (qs && qs[curIndex]) ? qs[curIndex] : null;
    var chosenId = (optId !== undefined && optId !== null) ? optId : selectedChoice;
    var isTimeout = (chosenId === -1);

    var chosenOpt = (q && q.options) ? q.options.find(function (o, idx) {
      var id = (typeof o === 'object' && o.id !== undefined) ? o.id : (idx + 1);
      return id === chosenId;
    }) : null;
    var correctOpt = (q && q.options) ? q.options.find(function (o, idx) {
      var id = (typeof o === 'object' && o.id !== undefined) ? o.id : (idx + 1);
      return id === correctOptId;
    }) : null;

    var chosenText = chosenOpt ? 
      ((chosenOpt.text || '') + (chosenOpt.textId ? ' (' + chosenOpt.textId + ')' : '')) : 
      (isTimeout ? t('jlpt.timeout-label', 'Waktu Habis / Tidak Memilih') : ('Pilihan ' + chosenId));
    var correctText = correctOpt ? 
      ((correctOpt.text || '') + (correctOpt.textId ? ' (' + correctOpt.textId + ')' : '')) : 
      ('Pilihan ' + correctOptId);

    var failReason = whyFails || (!isRight ? resolveWhyFails(q, chosenOpt, chosenId, correctOptId) : '');

    var cls = isRight ? 'jlpt-feedback-banner correct' : 'jlpt-feedback-banner wrong';
    var icon = isRight ? '✓' : (isTimeout ? '⏱' : '✗');
    var title = isRight ? t('jlpt.correct-title', 'Jawaban Tepat!') : (isTimeout ? t('jlpt.timeout-title', 'Waktu Habis!') : t('jlpt.wrong-title', 'Belum Tepat'));

    var subHtml = '';
    if (isRight) {
      subHtml =
        '<div class="jlpt-fb-chosen"><b>' + t('jlpt.your-choice', 'Pilihan Anda:') + '</b> ' + escapeHtml(t('jlpt.choice-prefix', 'Pilihan ') + correctOptId + ': ' + chosenText) + '</div>' +
        '<div class="jlpt-fb-note" style="margin-top:2px;color:#15803D;">' + t('jlpt.correct-desc', 'Pemahaman dialog akurat.') + '</div>';
    } else if (isTimeout) {
      subHtml =
        '<div class="jlpt-fb-chosen" style="color:#991B1B;"><b>' + t('jlpt.status-label', 'Status:') + '</b> ' + t('jlpt.timeout-desc', 'Waktu menjawab habis sebelum memilih opsi.') + '</div>' +
        '<div class="jlpt-fb-key" style="margin-top:2px;"><b>' + t('jlpt.key-title', 'Kunci Jawaban:') + '</b> ' + escapeHtml(t('jlpt.choice-prefix', 'Pilihan ') + correctOptId + ': ' + correctText) + '</div>';
    } else {
      subHtml =
        '<div class="jlpt-fb-chosen" style="color:#991B1B;"><b>' + t('jlpt.your-choice', 'Pilihan Anda:') + '</b> ' + escapeHtml(t('jlpt.choice-prefix', 'Pilihan ') + chosenId + ': ' + chosenText) + '</div>' +
        (failReason ? ('<div class="jlpt-fb-why" style="margin-top:2px;color:#B91C1C;font-size:10px;line-height:1.25;"><b>' + t('jlpt.analysis-prefix', '⚠️ Analisis:') + '</b> ' + escapeHtml(failReason) + '</div>') : '') +
        '<div class="jlpt-fb-key" style="margin-top:2px;"><b>' + t('jlpt.key-title', 'Kunci Jawaban:') + '</b> ' + escapeHtml(t('jlpt.choice-prefix', 'Pilihan ') + correctOptId + ': ' + correctText) + '</div>';
    }

    var isLast = (curIndex >= qs.length - 1);

    container.innerHTML =
      '<div class="' + cls + '" role="alert" aria-live="assertive">' +
        '<div class="jlpt-fb-left">' +
          '<span class="jlpt-fb-badge" aria-hidden="true">' + icon + '</span>' +
          '<div class="jlpt-fb-text-col">' +
            '<div class="jlpt-fb-title">' + title + '</div>' +
            '<div class="jlpt-fb-sub">' + subHtml + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="jlpt-fb-actions">' +
          '<button type="button" class="jlpt-fb-key-btn" onclick="openJlptDetailSheet(\'explain\')">' + t('jlpt.lihat-kunci', 'Lihat Pembahasan ↗') + '</button>' +
          '<button type="button" class="jlpt-fb-next-btn" onclick="' + (isLast ? 'closeListeningPanel()' : 'nextListeningQuestion()') + '">' + (isLast ? t('jlpt.selesai', 'Selesai ✓') : (t('jlpt.maju', 'Lanjut') + ' →')) + '</button>' +
        '</div>' +
      '</div>';
  }

  // Helper formatting for Chat-Style Dialogue Turns
  function formatDialogueHtml(scriptJa, scriptRomaji, scriptId, q) {
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

      var personaType = 'neutral';
      var personaLabel = speaker || 'Instruktor';

      if (/インストラクター|ナレーション|アナウンス|問題|質問|放送|指示/.test(speaker)) {
        personaType = 'instructor';
        personaLabel = t('speaker.instructor', 'Instruktor');
      } else if (/女|女性|お母さん|母親|彼女|女子|妹|姉/.test(speaker)) {
        personaType = 'female';
        personaLabel = t('speaker.female', 'Wanita');
        if (/お母さん|母親/.test(speaker)) personaLabel = t('speaker.mother', 'Wanita (Ibu)');
      } else if (/男|男性|男の子|父親|彼|男子|山田|たけし|兄|弟/.test(speaker)) {
        personaType = 'male';
        personaLabel = t('speaker.male', 'Pria');
        if (/お父さん|父親/.test(speaker)) personaLabel = t('speaker.father', 'Pria (Ayah)');
      } else if (/先生|教授|講師/.test(speaker)) {
        personaType = 'teacher';
        personaLabel = t('speaker.teacher', 'Guru');
      } else if (/学生|生徒|留学生/.test(speaker)) {
        personaType = 'student';
        personaLabel = t('speaker.student', 'Murid');
      } else if (/店長|店員|受付|駅員|医者/.test(speaker)) {
        personaType = 'staff';
        personaLabel = t('speaker.instructor', 'Instruktor');
        if (/店員|店長/.test(speaker)) personaLabel = t('speaker.shopkeeper', 'Petugas Toko');
        else if (/受付/.test(speaker)) personaLabel = t('speaker.receptionist', 'Resepsionis');
        else if (/駅員/.test(speaker)) personaLabel = t('speaker.station_staff', 'Petugas Stasiun');
        else if (/医者/.test(speaker)) personaLabel = t('speaker.doctor', 'Dokter');
      } else if (!speaker) {
        personaType = 'instructor';
        personaLabel = t('speaker.instructor', 'Instruktor');
      }

      var safeLineJa = escapeJs(textJa);
      var safeTextJa = renderFuriganaText(textJa, curScriptMode);
      var turnTime = (q && q.turnTimestamps && q.turnTimestamps[idx] !== undefined)
        ? q.turnTimestamps[idx]
        : (idx * 4.0);
      var timeFormatted = formatMmSs(turnTime);

      return '<div class="jlpt-dialogue-turn speaker-' + personaType + '" id="jlptTurn_' + idx + '" onclick="seekToJlptTurn(' + idx + ')" role="button" tabindex="0" title="' + t('jlpt.seek-turn-hint', 'Ketuk untuk memutar dari bagian ini') + '">' +
        '<div class="jlpt-turn-meta">' +
          '<span class="jlpt-speaker-chip speaker-' + personaType + '">' +
            '<span class="jlpt-speaker-dot"></span>' +
            '<span class="jlpt-speaker-name">' + escapeHtml(personaLabel) + '</span>' +
            (speaker && speaker !== personaLabel ? ' <span class="jlpt-speaker-raw">(' + escapeHtml(speaker) + ')</span>' : '') +
          '</span>' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<button type="button" class="jlpt-turn-seek-pill" onclick="event.stopPropagation();seekToJlptTurn(' + idx + ')" title="Lompat ke detik ' + timeFormatted + '">' +
              '<span class="jlpt-seek-icon">▶</span>' +
              '<span>' + timeFormatted + '</span>' +
            '</button>' +
            '<button type="button" class="jlpt-line-speak-btn" onclick="event.stopPropagation();playJlptSpeech(\'' + safeLineJa + '\')" title="Dengarkan baris ini" aria-label="Audio Baris">🔊</button>' +
          '</div>' +
        '</div>' +
        '<div class="jlpt-turn-bubble">' +
          '<div class="jlpt-bubble-ja">' + safeTextJa + '</div>' +
          (textRo ? '<div class="jlpt-bubble-ro">' + escapeHtml(textRo) + '</div>' : '') +
          (textId ? '<div class="jlpt-bubble-id">' + escapeHtml(textId) + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  function formatExplainHtml(q, correctOptId) {
    if (selectedChoice === null) {
      return '<div class="jlpt-explain-panel">' +
        '<div class="jlpt-key-card" style="text-align:center;padding:24px 16px;">' +
          '<div style="font-size:28px;margin-bottom:8px;">🔒</div>' +
          '<div style="font-weight:700;font-size:15px;color:#2D241E;margin-bottom:6px;">' + t('jlpt.key-locked-title', 'Kunci & Pembahasan Terkunci') + '</div>' +
          '<p style="font-size:13px;color:#7A6F64;margin:0;line-height:1.5;">' + t('jlpt.key-locked-desc', 'Pilih salah satu jawaban pada kartu soal terlebih dahulu untuk membuka kunci resmi dan analisis lengkap.') + '</p>' +
        '</div>' +
      '</div>';
    }

    var options = q.options || [];
    var correctOpt = options.find(function (o, idx) {
      var id = (typeof o === 'object' && o.id !== undefined) ? o.id : (idx + 1);
      return id === correctOptId;
    });
    var correctText = correctOpt ? ((typeof correctOpt === 'object' ? correctOpt.text : correctOpt) + (correctOpt.textId ? ' (' + correctOpt.textId + ')' : '')) : ('Pilihan ' + correctOptId);
    var explanation = q.explain || q.explanation || 'Pembahasan belum tersedia untuk nomor ini.';

    var statusText = '';
    var statusClass = '';
    if (selectedChoice === correctOptId) {
      statusText = t('jlpt.status-correct', '✓ Jawaban Anda Benar!');
      statusClass = 'status-correct';
    } else {
      statusText = t('jlpt.status-wrong', '✗ Jawaban Anda: Pilihan ') + selectedChoice + ' (' + t('jlpt.not-quite-right', 'Kurang Tepat') + ')';
      statusClass = 'status-wrong';
    }

    var chosenOpt = options.find(function (o, idx) {
      var id = (typeof o === 'object' && o.id !== undefined) ? o.id : (idx + 1);
      return id === selectedChoice;
    });
    var distractorNote = resolveWhyFails(q, chosenOpt, selectedChoice, correctOptId);
    var distractorHtml = (distractorNote && selectedChoice !== correctOptId) ? (
      '<div class="jlpt-explain-distractor-card" style="margin-top:10px;background:#FFF1F2;border:1px solid #FECDD3;border-radius:10px;padding:9px 12px;font-size:12px;color:#9F1239;line-height:1.45;">' +
        '<b>⚠️ Analisis Pilihan ' + selectedChoice + ':</b> ' + escapeHtml(distractorNote) +
      '</div>'
    ) : '';

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
        distractorHtml +
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
    if (!sheetEl || sheetEl._dragInitialized) return;
    sheetEl._dragInitialized = true;

    var handleZone = sheetEl.querySelector('#jlptSheetHandleZone') || sheetEl.querySelector('.jlpt-sheet-handle-zone');
    var headerZone = sheetEl.querySelector('.jlpt-sheet-header') || sheetEl.querySelector('.jlpt-sheet-head');
    var container = sheetEl.querySelector('#jlptSheetContainer') || sheetEl.querySelector('.jlpt-sheet-container');
    var backdrop = sheetEl.querySelector('#jlptSheetBackdrop') || sheetEl.querySelector('.jlpt-sheet-backdrop');
    var scrollBody = sheetEl.querySelector('.jlpt-sheet-content') || sheetEl.querySelector('.jlpt-sheet-body');
    if (!container) return;

    var startY = 0;
    var lastY = 0;
    var lastTime = 0;
    var velocityY = 0;
    var isDragging = false;
    var pointerId = null;
    var currentSnap = 'full';

    function getSnapOffsets() {
      var vh = window.innerHeight;
      return {
        full: 0,
        half: Math.round(vh * 0.44),
        dismissThreshold: Math.round(vh * 0.28)
      };
    }

    function onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('button, a, input, select, textarea, [role="tab"]')) return;

      isDragging = true;
      pointerId = e.pointerId;
      startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      lastY = startY;
      lastTime = performance.now();
      velocityY = 0;

      container.style.transition = 'none';
      if (backdrop) backdrop.style.transition = 'none';

      try {
        if (handleZone && handleZone.setPointerCapture && pointerId !== null) {
          handleZone.setPointerCapture(pointerId);
        }
      } catch (_) {}

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(e) {
      if (!isDragging) return;

      var y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      var now = performance.now();
      var dt = Math.max(1, now - lastTime);
      var dyRaw = y - lastY;
      velocityY = dyRaw / dt;
      lastY = y;
      lastTime = now;

      var totalDy = y - startY;
      var snaps = getSnapOffsets();
      var baseOffset = (currentSnap === 'half') ? snaps.half : 0;
      var targetY = baseOffset + totalDy;

      if (targetY < 0) {
        targetY = targetY * 0.25;
      }

      if (e.cancelable) e.preventDefault();
      container.style.transform = 'translateY(' + targetY + 'px)';

      if (backdrop) {
        var screenH = window.innerHeight || 800;
        var progress = Math.max(0, Math.min(1, 1 - (targetY / (screenH * 0.85))));
        backdrop.style.opacity = progress.toFixed(3);
      }
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      try {
        if (handleZone && handleZone.releasePointerCapture && pointerId !== null) {
          handleZone.releasePointerCapture(pointerId);
        }
      } catch (_) {}

      var y = e.clientY || (e.changedTouches && e.changedTouches[0].clientY) || lastY;
      var totalDy = y - startY;
      var snaps = getSnapOffsets();
      var baseOffset = (currentSnap === 'half') ? snaps.half : 0;
      var finalY = baseOffset + totalDy;

      var projectedDist = velocityY * 160;
      var projectedY = finalY + projectedDist;

      container.style.transition = 'transform 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
      if (backdrop) {
        backdrop.style.transition = 'opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1)';
        backdrop.style.opacity = '';
      }

      if (velocityY > 0.65 || projectedY > (window.innerHeight * 0.65) || (currentSnap === 'half' && totalDy > 70)) {
        currentSnap = 'full';
        closeJlptDetailSheet();
      } else if (projectedY > snaps.half * 0.6) {
        currentSnap = 'half';
        container.style.transform = 'translateY(' + snaps.half + 'px)';
        container.classList.add('snap-half');
        container.classList.remove('snap-full');
      } else {
        currentSnap = 'full';
        container.style.transform = 'translateY(0)';
        container.classList.add('snap-full');
        container.classList.remove('snap-half');
      }
    }

    if (handleZone) {
      handleZone.addEventListener('pointerdown', onPointerDown);
    }
    if (headerZone) {
      headerZone.addEventListener('pointerdown', onPointerDown);
    }

    if (scrollBody) {
      var touchStartY = 0;
      scrollBody.addEventListener('touchstart', function (e) {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      scrollBody.addEventListener('touchmove', function (e) {
        if (scrollBody.scrollTop <= 0) {
          var touchY = e.touches[0].clientY;
          if (touchY - touchStartY > 24 && !isDragging) {
            onPointerDown(e.touches[0]);
          }
        }
      }, { passive: true });
    }
  }

  function populateDetailSheet(q, correctOptId) {
    ensureDetailSheet();
    var subEl = document.getElementById('jlptSheetSubtitle');
    if (subEl) {
      subEl.textContent = (q.level || 'JLPT') + ' · ' + (q.mondaiLabel || q.mondai || 'Mondai') + ' (No. ' + (curIndex + 1) + ')';
    }

    var bubblesEl = document.getElementById('jlptDialogueBubbles');
    if (bubblesEl) {
      bubblesEl.innerHTML = formatDialogueHtml(q.scriptJapanese || q.script, q.scriptRomaji, q.scriptIndonesian || q.script_translation, q);
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
    var qs = getFilteredQuestions();
    if (!qs || !qs[curIndex]) return;
    var q = qs[curIndex];

    var sheet = ensureDetailSheet();
    if (!sheet) return;

    var correctOptId = (q.answerIndex !== undefined && q.options && q.options[q.answerIndex])
      ? (q.options[q.answerIndex].id || (q.answerIndex + 1))
      : 1;
    populateDetailSheet(q, correctOptId);

    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    var modalEl = document.getElementById('listeningPanelModal') || document.querySelector('.listening-modal');
    if (modalEl) modalEl.classList.add('sheet-open');
    if (!sheetOpen) {
      try {
        self.FiezelBackNav && self.FiezelBackNav.pushLayer && self.FiezelBackNav.pushLayer({
          id: 'jlpt-sheet',
          close: function () { closeJlptDetailSheet(); return true; }
        });
      } catch (_) {}
    }
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
    var modalEl = document.getElementById('listeningPanelModal') || document.querySelector('.listening-modal');
    if (modalEl) modalEl.classList.remove('sheet-open');
    if (sheetOpen) {
      try { self.FiezelBackNav && self.FiezelBackNav.dismiss && self.FiezelBackNav.dismiss('jlpt-sheet'); } catch (_) {}
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

      // Pasang listener dinamis window saat gesture aktif (cegah memory leak)
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerEnd);
      window.addEventListener('pointercancel', onPointerEnd);
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
          // Gerakan vertikal lebih dominan -> serahkan sepenuhnya ke native vertical scroll seketika tanpa pointer capture atau tilt jitter
          isScrolling = true;
          directionLocked = true;
          isDragging = false;
          suppressClick = false;
          cardEl.classList.remove('swiping');
          cardEl.style.transition = '';
          cardEl.style.transform = '';
          cardEl.style.boxShadow = '';
          try {
            if (cardEl.releasePointerCapture && pointerId !== null && pointerId !== undefined && cardEl.hasPointerCapture && cardEl.hasPointerCapture(pointerId)) {
              cardEl.releasePointerCapture(pointerId);
            }
          } catch (_) {}
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
      // Lepas listener dinamis window seketika setelah pointer dilepas (cegah memory leak)
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);

      if (!isPointerDown) return;
      isPointerDown = false;

      try {
        if (cardEl.releasePointerCapture && pointerId !== null && pointerId !== undefined && cardEl.hasPointerCapture && cardEl.hasPointerCapture(pointerId)) {
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

      if (isScrolling) {
        isScrolling = false;
        directionLocked = false;
        suppressClick = false;
        cardEl.style.transition = '';
        cardEl.style.transform = '';
        cardEl.style.boxShadow = '';
        return;
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
  }

  function prevListeningQuestion(animClass) {
    var qs = getFilteredQuestions();
    if (curIndex > 0) {
      curIndex--;
      selectedChoice = null;
      replayCount = 0;
      currentSpeakingTurnIdx = -1;
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
      replayCount = 0;
      currentSpeakingTurnIdx = -1;
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
      var ariaLabel = 'Pilihan ' + optId + ': ' + textJa;
      var optTextFormatted = renderFuriganaText(textJa, curScriptMode);

      if (isAnswered) {
        cls += ' locked';
        if (optId === correctOptId) {
          cls += ' correct';
          ariaLabel += ' (' + t('jlpt.kunci-tepat', 'KUNCI JAWABAN TEPAT') + ')';
        } else if (optId === selectedChoice) {
          cls += ' wrong';
          ariaLabel += ' (' + t('jlpt.not-quite-right', 'Kurang Tepat') + ')';
        }
      }

      var disabledAttr = isAnswered ? ' disabled aria-disabled="true"' : '';
      return '<button type="button" class="' + cls + '" data-opt-id="' + optId + '"' + disabledAttr + ' aria-label="' + escapeHtml(ariaLabel) + '" onclick="selectJlptChoice(' + optId + ', ' + correctOptId + ')">' +
        '<span class="jlpt-opt-badge">' + optId + '</span>' +
        '<div class="jlpt-opt-texts">' +
          '<div class="jlpt-opt-ja">' + optTextFormatted + '</div>' +
          (isAnswered && textId ? '<div class="jlpt-opt-id">' + escapeHtml(textId) + '</div>' : '') +
        '</div>' +
      '</button>';
    }).join('');

    // Update Topbar status indicators
    var topCounterEl = document.getElementById('jlptTopCounter');
    if (topCounterEl) {
      topCounterEl.textContent = (curIndex + 1) + ' / ' + qs.length;
    }
    var topFilterLabelEl = document.getElementById('jlptTopFilterLabel');
    if (topFilterLabelEl) {
      var shortMondai = curMondai === 'all' ? t('jlpt.mondai-all', 'Semua') : mondaiShortLabel;
      topFilterLabelEl.textContent = curLevel + ' · ' + shortMondai;
    }

    // Sync Controls Bar: Script Mode & Exam Mode
    var btnRuby = document.getElementById('btnModeRuby');
    var btnKanji = document.getElementById('btnModeKanji');
    var btnRomaji = document.getElementById('btnModeRomaji');
    if (btnRuby) btnRuby.classList.toggle('active', curScriptMode === 'ruby');
    if (btnKanji) btnKanji.classList.toggle('active', curScriptMode === 'kanji');
    if (btnRomaji) btnRomaji.classList.toggle('active', curScriptMode === 'romaji');

    var examBtn = document.getElementById('jlptExamToggleBtn');
    var examTxt = document.getElementById('jlptExamBtnText');
    if (examBtn) examBtn.classList.toggle('active', isExamMode);
    if (examTxt) examTxt.textContent = isExamMode ? t('jlpt.exam-mode', 'Ujian') : t('jlpt.practice-mode', 'Latihan');

    var modal = document.getElementById('listeningPanelModal');
    if (modal) {
      modal.classList.remove('jlpt-mode-ruby', 'jlpt-mode-kanji', 'jlpt-mode-romaji');
      modal.classList.add('jlpt-mode-' + curScriptMode);
      modal.classList.toggle('exam-mode-active', isExamMode);
    }

    // Timed Exam Simulator
    if (isExamMode) {
      if (!isAnswered) {
        var allocSec = (q.mondai === 'mondai_3' || q.mondai === 'mondai_4') ? 30 : 45;
        startExamTimer(allocSec);
      } else {
        stopExamTimer();
      }
    } else {
      stopExamTimer();
    }

    // Question Text with Furigana/Romaji
    var qJaHtml = '';
    if (curScriptMode === 'romaji' && q.questionRomaji) {
      qJaHtml = '<span class="jlpt-q-romaji" style="display:block;font-size:15px;font-weight:800;color:#0F172A;margin-bottom:4px;">' + escapeHtml(q.questionRomaji) + '</span>' +
        '<span class="jlpt-q-subja" style="font-size:12px;opacity:0.75;">' + renderFuriganaText(qJa, 'ruby') + '</span>';
    } else {
      qJaHtml = renderFuriganaText(qJa, curScriptMode);
    }

    slot.innerHTML =
      '<div class="jlpt-mobile-wrapper">' +
        '<!-- Touch Card with Gestures -->' +
        '<div class="jlpt-mobile-card" id="jlptMobileCard">' +
          '<!-- 3D Volumetric Jelly Mochi Mascot Slot -->' +
          '<div class="jlpt-mascot-slot">' +
            '<fiezel-mascot class="jlpt-mascot"></fiezel-mascot>' +
          '</div>' +

          '<!-- Situasi Ringkas (1 Baris jika ada) -->' +
          (qSituation ?
            '<div class="jlpt-situation-chip">' +
              '<span class="jlpt-sit-icon">📌</span>' +
              '<span class="jlpt-sit-text">' + escapeHtml(qSituation) + '</span>' +
            '</div>'
          : '') +

          '<!-- Panggung Audio Tactile Pill (48-52px) -->' +
          '<div class="jlpt-audio-row">' +
            '<button type="button" class="jlpt-primary-play-btn" id="jlptMainPlayBtn" onclick="togglePlayJlptPrimaryAudio()" aria-label="' + escapeHtml(t('jlpt.play-audio', 'Putar Audio')) + '">' +
              '<span class="jlpt-play-icon" id="jlptPlayIcon">▶</span>' +
              '<span id="jlptPlayText">' + escapeHtml(t('jlpt.play-audio', 'Putar Audio')) + '</span>' +
              '<span class="jlpt-mini-wave" id="jlptMiniWave">' +
                '<span></span><span></span><span></span><span></span><span></span>' +
              '</span>' +
            '</button>' +
            (hasJees ?
              '<button type="button" class="jlpt-jees-chip" id="jlptJeesChip" onclick="togglePlayJlptJeesAudio()" title="Dengarkan rekaman siaran resmi JEES">' +
                '📻 JEES' +
              '</button>'
            : '') +
            '<button type="button" class="jlpt-speed-chip" id="jlptSpeedBtn" onclick="cycleAudioPlaybackRate()" title="Kecepatan Audio">' +
              audioPlaybackRate.toFixed(1).replace(/\.0$/, '') + '×' +
            '</button>' +
            '<span class="jlpt-replay-pill" id="jlptReplayPill"></span>' +
          '</div>' +

          '<!-- Typography Soal Jepang (Plus Jakarta Sans, Slate Gelap Kontras Tinggi) -->' +
          '<div class="jlpt-question-block">' +
            '<h3 class="jlpt-question-ja">' + qJaHtml + '</h3>' +
            (isAnswered && qId ? '<p class="jlpt-question-id">' + escapeHtml(qId) + '</p>' : '') +
          '</div>' +

          '<!-- 4 Kartu Pilihan Ganda Tactile Clay (48-54px) -->' +
          '<div class="jlpt-options-list">' +
            optionsHtml +
          '</div>' +

          '<!-- Sheet Trigger Button (Only enabled in Practice Mode) -->' +
          '<div class="jlpt-sheet-triggers" style="display:flex;justify-content:center;margin-top:6px;">' +
            (isExamMode ?
              '<button type="button" class="jlpt-sheet-trigger-btn locked" id="jlptSheetTriggerBtn" disabled title="' + t('jlpt.exam-locked-note', 'Naskah Terkunci (Mode Ujian)') + '">🔒 ' + t('jlpt.exam-locked-note', 'Naskah Terkunci (Mode Ujian)') + '</button>'
            :
              '<button type="button" class="jlpt-sheet-trigger-btn" id="jlptSheetTriggerBtn" onclick="openJlptDetailSheet(\'script\')">📝 ' + t('jlpt.sheet-trigger-label', 'Naskah & Pembahasan') + '</button>'
            ) +
          '</div>' +

          '<!-- Feedback Slot -->' +
          '<div id="jlptFeedbackSlot"></div>' +

          '<!-- Dynamic Swipe Cues -->' +
          '<div class="jlpt-swipe-cue jlpt-cue-prev" id="jlptCuePrev">' + t('jlpt.prev-question', '◀ Soal Sebelumnya') + '</div>' +
          '<div class="jlpt-swipe-cue jlpt-cue-next" id="jlptCueNext">' + t('jlpt.next-question', 'Soal Berikutnya ▶') + '</div>' +
        '</div>' +
      '</div>';

    // Initialize gestures on the newly rendered card
    var cardEl = document.getElementById('jlptMobileCard');
    if (cardEl) initCardGestures(cardEl);

    // Mount and update 3D Mochi companion
    if (window.FiezelMochiCompanion && typeof window.FiezelMochiCompanion.scan === 'function') {
      window.FiezelMochiCompanion.scan();
    }

    // Pre-populate bottom sheet with current item
    populateDetailSheet(q, correctOptId);
    updateAudioUi();
    safeNotifyMascot('question-shown');
  }

  // Filter Sheet Modal Toggles
  function toggleJlptFilterModal() {
    var modal = document.getElementById('jlptFilterModal');
    if (!modal) return;
    if (modal.style.display === 'none' || !modal.classList.contains('open')) {
      openJlptFilterModal();
    } else {
      closeJlptFilterModal();
    }
  }

  function openJlptFilterModal() {
    var modal = document.getElementById('jlptFilterModal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeJlptFilterModal() {
    var modal = document.getElementById('jlptFilterModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(function () {
      if (modal && !modal.classList.contains('open')) modal.style.display = 'none';
    }, 200);
  }

  // Keyboard Navigation Support
  function handleKeyDown(e) {
    var modal = document.getElementById('listeningPanelModal');
    if (!modal || !modal.classList.contains('open')) return;

    if (e.key === 'Escape') {
      var filterModal = document.getElementById('jlptFilterModal');
      if (filterModal && filterModal.classList.contains('open')) {
        closeJlptFilterModal();
      } else if (sheetOpen) {
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
  window.toggleJlptFilterModal = toggleJlptFilterModal;
  window.openJlptFilterModal = openJlptFilterModal;
  window.closeJlptFilterModal = closeJlptFilterModal;
  window.togglePlayJlptPrimaryAudio = togglePlayJlptPrimaryAudio;
  window.togglePlayJlptAiAudio = togglePlayJlptPrimaryAudio;
  window.togglePlayJlptJeesAudio = togglePlayJlptJeesAudio;
  window.togglePlayJlptAudio = togglePlayJlptAudio;
  window.playJlptSpeech = playJlptSpeech;
  window.stopJlptAudio = stopJlptAudio;
  window.selectJlptChoice = selectJlptChoice;
  window.openJlptDetailSheet = openJlptDetailSheet;
  window.closeJlptDetailSheet = closeJlptDetailSheet;
  window.cycleAudioPlaybackRate = cycleAudioPlaybackRate;
  window.switchJlptSheetTab = switchJlptSheetTab;
  window.prevListeningQuestion = prevListeningQuestion;
  window.nextListeningQuestion = nextListeningQuestion;
  window.setJlptScriptMode = setJlptScriptMode;
  window.toggleJlptExamMode = toggleJlptExamMode;
  window.submitAnswer = submitAnswer;
  window.renderFeedbackBanner = renderFeedbackBanner;
  window.seekToJlptTurn = seekToJlptTurn;

  window.FiezelJlptListening = {
    initBank: initBank,
    open: openListeningPanel,
    close: closeListeningPanel,
    playPrimary: togglePlayJlptPrimaryAudio,
    playAi: togglePlayJlptPrimaryAudio,
    playJees: togglePlayJlptJeesAudio,
    playSpeech: playJlptSpeech,
    cycleSpeed: cycleAudioPlaybackRate,
    stop: stopJlptAudio,
    openSheet: openJlptDetailSheet,
    closeSheet: closeJlptDetailSheet,
    setScriptMode: setJlptScriptMode,
    toggleExamMode: toggleJlptExamMode,
    seekToTurn: seekToJlptTurn
  };

  // Pre-fetch bank saat idle setelah splash selesai (dan hanya bila kursus aktif adalah bahasa Jepang)
  function maybePrefetchJlptListening() {
    try {
      var course = (window.FiezelI18n && typeof window.FiezelI18n.getCourse === 'function')
        ? window.FiezelI18n.getCourse()
        : '';
      if (course !== 'ja') return;
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(function () { initBank(); });
      } else {
        setTimeout(initBank, 1500);
      }
    } catch (_) {}
  }
  if (typeof window !== 'undefined') {
    if (window.__fiezelBootSplashDismissed) {
      maybePrefetchJlptListening();
    } else if (typeof window.addEventListener === 'function') {
      window.addEventListener('fiezel:splash-dismissed', maybePrefetchJlptListening, { once: true });
    }
  }
})();
