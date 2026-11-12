/**
 * FIEZEL · features/pte/fiezel-pte-ui.js
 * Interactive Tactile UI Engine for PTE Academic Preparation Hub across all 4 official sections:
 * Speaking (RA, RS, DI, RL), Writing (SWT, Essay, WFD), Reading (R&W Dropdown FIB, Drag & Drop, Re-order),
 * and Listening (SST, Listening FIB, HIW) + 30-Day Guided Plan.
 * Provides deep pedagogical feedback: 3-Second Grammar Formula, Patent Collocations, Linking Words,
 * Distractor Analysis, and Indonesian sentence translation.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FiezelPteUi = api;
    root.FiezelPteUI = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Preloaded Content Bank Caches (All 15 Banks)
  var BANKS = {
    ra: [],
    rs: [],
    di: [],
    wfd: [],
    rwFib: [],
    rDd: [],
    ro: [],
    swt: [],
    essay: [],
    rl: [],
    sst: [],
    lf: [],
    hiw: [],
    templates: null,
    roadmap: null
  };

  if (typeof require === 'function') {
    try { BANKS.ra = require('../../content/pte/pte-read-aloud.json').items || []; } catch (_) {}
    try { BANKS.rs = require('../../content/pte/pte-repeat-sentence.json').items || []; } catch (_) {}
    try { BANKS.di = require('../../content/pte/pte-describe-image.json').items || []; } catch (_) {}
    try { BANKS.wfd = require('../../content/pte/pte-write-dictation.json').items || []; } catch (_) {}
    try { BANKS.rwFib = require('../../content/pte/pte-reading-fib.json').items || []; } catch (_) {}
    try { BANKS.rDd = require('../../content/pte/pte-reading-drag-drop.json').items || []; } catch (_) {}
    try { BANKS.ro = require('../../content/pte/pte-reorder-paragraphs.json').items || []; } catch (_) {}
    try { BANKS.swt = require('../../content/pte/pte-summarize-written-text.json').items || []; } catch (_) {}
    try { BANKS.essay = require('../../content/pte/pte-essay-writing.json').items || []; } catch (_) {}
    try { BANKS.rl = require('../../content/pte/pte-retell-lecture.json').items || []; } catch (_) {}
    try { BANKS.sst = require('../../content/pte/pte-summarize-spoken-text.json').items || []; } catch (_) {}
    try { BANKS.lf = require('../../content/pte/pte-listening-fib.json').items || []; } catch (_) {}
    try { BANKS.hiw = require('../../content/pte/pte-highlight-incorrect-words.json').items || []; } catch (_) {}
    try { BANKS.templates = require('../../content/pte/pte-templates.json') || null; } catch (_) {}
    try { BANKS.roadmap = require('../../content/pte/pte-daily-roadmap.json') || null; } catch (_) {}
  }

  function getSavedDay() {
    if (typeof localStorage !== 'undefined') {
      try {
        var v = parseInt(localStorage.getItem('fz_pte_current_day'), 10);
        if (v >= 1 && v <= 30) return v;
      } catch (_) {}
    }
    return 1;
  }

  function getSavedCompletedTasks() {
    if (typeof localStorage !== 'undefined') {
      try {
        var raw = localStorage.getItem('fz_pte_completed_tasks');
        if (raw) return JSON.parse(raw);
      } catch (_) {}
    }
    return [];
  }

  // Internal Reactive State
  var state = {
    section: 'plan', // 'plan' | 'speaking' | 'writing' | 'reading' | 'listening'
    mode: 'ra', // 'ra'|'rs'|'di'|'rl' | 'swt'|'essay'|'wfd' | 'rwFib'|'rDd'|'ro' | 'sst'|'lf'|'hiw'
    itemIndex: 0,
    timerState: 'idle', // 'idle' | 'preparing' | 'recording' | 'completed' | 'result'
    timerRemainingSec: 0,
    timerTotalSec: 40,
    timerInterval: null,
    silenceWatchdogTimer: null,
    speechRecognizer: null,
    speechTranscript: '',
    speechConfidence: 0.88,
    speechStartTime: 0,
    isAudioPlaying: false,
    lastResult: null,
    overallEstimate: 42,
    templateOpen: false,
    silenceTriggered: false,
    selectedDay: getSavedDay(),
    completedTaskIds: getSavedCompletedTasks(),
    // Section-specific inputs
    rwFibSelections: {},
    rDdAssignments: {},
    rDdWordPool: [],
    roOrder: [],
    swtText: '',
    essayText: '',
    rlTranscript: '',
    sstText: '',
    wfdText: '',
    lfAnswers: {},
    hiwSelectedIndices: [],
    activeDeepFeedback: null,
    showGrammarGuide: false
  };

  function playPearsonBeep() {
    if (typeof window !== 'undefined') {
      try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          var ctx = new AudioCtx();
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1000, ctx.currentTime);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        }
      } catch (e) {
        console.warn('[PTE Beep]', e);
      }
    }
  }

  function armSilenceWatchdog() {
    if (state.silenceWatchdogTimer) clearTimeout(state.silenceWatchdogTimer);
    // Pearson Official Standard: If student doesn't speak within 3 seconds of the tone, recording halts
    state.silenceWatchdogTimer = setTimeout(function () {
      if (state.timerState === 'recording' && (!state.speechTranscript || !state.speechTranscript.trim())) {
        console.log('[PTE Official 3-Second Silence Rule Triggered: No Speech Detected]');
        state.silenceTriggered = true;
        stopRecordingAndEvaluate();
      }
    }, 3200);
  }

  function disarmSilenceWatchdog() {
    if (state.silenceWatchdogTimer) {
      clearTimeout(state.silenceWatchdogTimer);
      state.silenceWatchdogTimer = null;
    }
  }

  function getEngine() {
    if (typeof globalThis !== 'undefined' && globalThis.FiezelPteEngine) {
      return globalThis.FiezelPteEngine;
    }
    if (typeof require === 'function') {
      try { return require('./fiezel-pte-engine.js'); } catch (_) {}
    }
    return null;
  }

  /**
   * Ensure all 15 content banks are populated in browser via fetch if empty.
   */
  function ensureBanksLoaded(callback) {
    if (BANKS.ra.length > 0 && BANKS.rwFib.length > 0 && BANKS.swt.length > 0 && BANKS.sst.length > 0) {
      if (typeof callback === 'function') callback();
      return;
    }

    if (typeof fetch !== 'function') {
      if (typeof callback === 'function') callback();
      return;
    }

    var promises = [
      fetch('content/pte/pte-read-aloud.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.ra = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-repeat-sentence.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.rs = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-describe-image.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.di = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-write-dictation.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.wfd = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-reading-fib.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.rwFib = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-reading-drag-drop.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.rDd = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-reorder-paragraphs.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.ro = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-summarize-written-text.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.swt = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-essay-writing.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.essay = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-retell-lecture.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.rl = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-summarize-spoken-text.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.sst = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-listening-fib.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.lf = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-highlight-incorrect-words.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.hiw = d.items || []; }).catch(function () {}),
      fetch('content/pte/pte-templates.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.templates = d; }).catch(function () {}),
      fetch('content/pte/pte-daily-roadmap.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.roadmap = d; }).catch(function () {})
    ];

    Promise.all(promises).then(function () {
      initCurrentItemState();
      if (typeof callback === 'function') callback();
    });
  }

  function getActiveItem() {
    var list = BANKS[state.mode] || [];
    if (list.length === 0) return null;
    var idx = Math.max(0, Math.min(list.length - 1, state.itemIndex));
    return list[idx] || list[0];
  }

  function initCurrentItemState() {
    var item = getActiveItem();
    state.lastResult = null;
    state.activeDeepFeedback = null;
    state.speechTranscript = '';
    state.wfdText = '';
    state.showGrammarGuide = false;
    state.timerState = 'idle';
    state.isAudioPlaying = false;
    clearTimer();
    disarmSilenceWatchdog();
    stopPteAudio();
    stopPteMicBridge();

    if (state.mode === 'rwFib') {
      state.rwFibSelections = {};
    } else if (state.mode === 'rDd') {
      state.rDdAssignments = {};
      state.rDdWordPool = item && Array.isArray(item.wordPool) ? item.wordPool.slice() : [];
    } else if (state.mode === 'ro') {
      if (item && Array.isArray(item.paragraphs)) {
        // Shuffle or default copy
        state.roOrder = item.paragraphs.map(function (p) { return p.id; });
      } else {
        state.roOrder = [];
      }
    } else if (state.mode === 'swt') {
      state.swtText = '';
    } else if (state.mode === 'essay') {
      state.essayText = '';
    } else if (state.mode === 'rl') {
      state.rlTranscript = '';
    } else if (state.mode === 'sst') {
      state.sstText = '';
    } else if (state.mode === 'lf') {
      state.lfAnswers = {};
    } else if (state.mode === 'hiw') {
      state.hiwSelectedIndices = [];
    }
  }

  /**
   * Main Mount Entrypoint.
   */
  function mount(containerEl) {
    if (!containerEl) return;
    ensureBanksLoaded(function () {
      initCurrentItemState();
      renderHub(containerEl);
    });
  }

  function renderExamTopBar() {
    var secTitles = {
      speaking: 'Speaking',
      writing: 'Writing',
      reading: 'Reading',
      listening: 'Listening'
    };
    var modeTitles = {
      ra: 'Read Aloud',
      rs: 'Repeat Sentence',
      di: 'Describe Image',
      rl: 'Retell Lecture',
      swt: 'Summarize Text',
      essay: 'Write Essay',
      wfd: 'Write Dictation',
      rwFib: 'R&W Dropdown FIB',
      rDd: 'Reading Drag & Drop',
      ro: 'Re-order Paragraphs',
      sst: 'Spoken Summary',
      lf: 'Listening FIB',
      hiw: 'Highlight Incorrect Words'
    };
    var secName = secTitles[state.section] || 'PTE Exam';
    var modeName = modeTitles[state.mode] || (state.mode ? state.mode.toUpperCase() : 'Practice');
    var bank = BANKS[state.mode] || [];
    var totalCount = bank.length || 1;
    var currentNum = Math.min(totalCount, state.itemIndex + 1);

    var out = ['  <div class="fz-pte-exam-header">'];
    out.push('    <button type="button" class="fz-pte-back-btn" onclick="FiezelPteUi.switchSection(\'plan\')">‹ Hub</button>');
    out.push('    <div class="fz-pte-exam-center">');
    out.push('      <span class="fz-pte-mode-title">' + esc(modeName) + '</span>');
    out.push('      <span class="fz-pte-exam-count">#' + currentNum + ' / ' + totalCount + '</span>');
    out.push('    </div>');
    out.push('    <span class="fz-pte-target-chip">Target 42 🎯</span>');
    out.push('  </div>');
    return out.join('\n');
  }

  /**
   * Render the complete Hub DOM.
   */
  function renderHub(containerEl) {
    var el = containerEl || (typeof document !== 'undefined' ? document.getElementById('app') : null);
    if (!el) return;

    var out = ['<section class="fz-pte-hub fade">'];

    if (state.section === 'plan') {
      // 1. Hero Card with Target 42 Benchmark
      out.push('  <div class="fz-pte-hero-card">');
      out.push('    <div class="fz-pte-badge-row">');
      out.push('      <span class="fz-pte-target-badge">★ PEARSON TARGET 42 · AUSTRALIA VISA</span>');
      out.push('      <span style="font-size:0.8rem; font-weight:800; background:rgba(255,255,255,0.2); padding:3px 8px; border-radius:6px;">VOCATIONAL BENCHMARK</span>');
      out.push('    </div>');
      out.push('    <h2 class="fz-pte-title">PTE Academic Comprehensive Hub</h2>');
      out.push('    <p class="fz-pte-lead">Official preparation for all 4 Pearson sections (Speaking, Writing, Reading, Listening) with authentic test banks and deep pedagogical feedback.</p>');

      out.push('    <div class="fz-pte-benchmark-meter">');
      out.push('      <div class="fz-pte-meter-bar-wrap">');
      var progressPercent = Math.min(100, Math.round((state.overallEstimate / 90) * 100));
      out.push('        <div class="fz-pte-meter-bar" style="width:' + progressPercent + '%;"></div>');
      out.push('        <div class="fz-pte-meter-target-marker" title="Target Visa: PTE 42"></div>');
      out.push('      </div>');
      out.push('      <div class="fz-pte-meter-label">Estimasi: <b style="color:#fcd34d;">' + state.overallEstimate + '</b> / 90</div>');
      out.push('    </div>');
      out.push('  </div>');
    } else {
      // EXAM PRACTICE MODE: ZERO GIANT BANNER, COMPACT EXAM HEADER + TASK MODE PILLS
      out.push(renderExamTopBar());
    }

    // 2. Section Selector Tabs (Level 1 Navigation - Always Present)
    out.push('  <div class="fz-pte-section-bar">');
    var sections = [
      { id: 'plan', label: '🎯 30-Day Plan' },
      { id: 'speaking', label: '🗣️ Speaking' },
      { id: 'writing', label: '✍️ Writing' },
      { id: 'reading', label: '📖 Reading' },
      { id: 'listening', label: '🎧 Listening' }
    ];
    sections.forEach(function (s) {
      var act = state.section === s.id ? ' active' : '';
      out.push('    <button type="button" class="fz-pte-section-tab' + act + '" onclick="FiezelPteUi.switchSection(\'' + s.id + '\')">' + s.label + '</button>');
    });
    out.push('  </div>');

    // 3. Section Content
    if (state.section === 'plan') {
      // 30-Day Guided Plan
      if (BANKS.roadmap) {
        out.push(renderGuidedCoachCard(BANKS.roadmap));
      } else {
        out.push('  <div class="card" style="padding:20px; text-align:center;"><p>Loading 30-Day Guided Plan...</p></div>');
      }
    } else {
      out.push(renderModePills());

      var item = getActiveItem();
      if (state.lastResult) {
        out.push(renderResultScorecard(state.lastResult));
      } else if (item) {
        out.push(renderPracticeCard(item));
      } else {
        out.push('  <div class="card" style="padding:20px; text-align:center;"><p>Loading PTE Academic data banks...</p></div>');
      }
    }

    out.push('</section>');
    el.innerHTML = out.join('\n');
  }

  function renderModePills() {
    var out = ['  <div class="fz-pte-tabs">'];
    var modeMap = {
      speaking: [
        { id: 'ra', code: 'RA', name: 'Read Aloud' },
        { id: 'rs', code: 'RS', name: 'Repeat Sent.' },
        { id: 'di', code: 'DI', name: 'Describe Img' },
        { id: 'rl', code: 'RL', name: 'Retell Lecture' }
      ],
      writing: [
        { id: 'swt', code: 'SWT', name: 'Summarize Text' },
        { id: 'essay', code: 'WE', name: 'Write Essay' },
        { id: 'wfd', code: 'WFD', name: 'Write Dictation' }
      ],
      reading: [
        { id: 'rwFib', code: 'R&W FIB', name: 'Dropdown Blanks' },
        { id: 'rDd', code: 'R-FIB', name: 'Drag & Drop' },
        { id: 'ro', code: 'RO', name: 'Re-order' }
      ],
      listening: [
        { id: 'sst', code: 'SST', name: 'Spoken Summary' },
        { id: 'lf', code: 'L-FIB', name: 'Listening Blanks' },
        { id: 'hiw', code: 'HIW', name: 'Incorrect Words' }
      ]
    };

    var currentPills = modeMap[state.section] || [];
    currentPills.forEach(function (t) {
      var act = state.mode === t.id ? ' active' : '';
      out.push('    <button type="button" class="fz-pte-tab-btn' + act + '" onclick="FiezelPteUi.switchMode(\'' + t.id + '\')">');
      out.push('      <span class="fz-pte-tab-code">' + t.code + '</span>');
      out.push('      <span class="fz-pte-tab-name">' + t.name + '</span>');
      out.push('    </button>');
    });
    out.push('  </div>');
    return out.join('\n');
  }

  /**
   * Render Guided Daily Coach Card (30-Day Curriculum & Nakul Protocol).
   */
  function renderGuidedCoachCard(roadmap) {
    var rm = roadmap || BANKS.roadmap;
    if (!rm) return '';
    var engine = getEngine();
    var currentDay = state.selectedDay || 1;
    var dayData = engine && typeof engine.getDailyRoadmapDay === 'function'
      ? engine.getDailyRoadmapDay(currentDay, rm)
      : (rm.days ? rm.days.find(function (d) { return d.day === currentDay; }) || rm.days[0] : null);

    if (!dayData) return '';

    var tasks = Array.isArray(dayData.tasks) ? dayData.tasks : [];
    var progress = engine && typeof engine.calculateDailyProgress === 'function'
      ? engine.calculateDailyProgress(tasks, state.completedTaskIds)
      : { completedCount: 0, totalCount: tasks.length, percent: 0, isDayCompleted: false };

    var out = ['  <div class="fz-pte-daily-card">'];

    // Header with Day selector & Progress
    out.push('    <div class="fz-pte-daily-header">');
    out.push('      <div>');
    out.push('        <div class="fz-pte-daily-pill">30-DAY TARGET 42 ROADMAP</div>');
    var cleanDayTitle = dayData.title ? dayData.title.replace(/^Day\s+\d+:\s*/i, '') : '';
    out.push('        <h3 class="fz-pte-daily-title">Day ' + dayData.day + ': ' + esc(cleanDayTitle) + '</h3>');
    out.push('        <div class="fz-pte-daily-focus">Focus: <b>' + esc(dayData.focus) + '</b> (' + dayData.targetMinutes + ' min target)</div>');
    out.push('      </div>');

    // Day Selector Carousel
    out.push('      <div class="fz-pte-day-picker">');
    out.push('        <select id="fzPteDaySelect" class="fz-pte-select" onchange="FiezelPteUi.selectDay(this.value)">');
    for (var d = 1; d <= (rm.totalDays || 30); d++) {
      var sel = d === currentDay ? ' selected' : '';
      out.push('          <option value="' + d + '"' + sel + '>Day ' + d + '</option>');
    }
    out.push('        </select>');
    out.push('      </div>');
    out.push('    </div>');

    // Horizontal Day Pills Carousel for Fast Navigation
    out.push('    <div class="fz-pte-days-carousel-wrap">');
    out.push('      <div class="fz-pte-days-carousel">');
    for (var d2 = 1; d2 <= (rm.totalDays || 30); d2++) {
      var isDayAct = d2 === currentDay ? ' active' : '';
      out.push('        <button type="button" class="fz-pte-day-pill' + isDayAct + '" onclick="FiezelPteUi.selectDay(' + d2 + ')">Day ' + d2 + '</button>');
    }
    out.push('      </div>');
    out.push('    </div>');

    // Daily Progress Bar
    out.push('    <div class="fz-pte-daily-progress-wrap">');
    out.push('      <div class="fz-pte-daily-progress-label">');
    out.push('        <span>Daily Target Progress</span>');
    out.push('        <b>' + progress.completedCount + ' / ' + progress.totalCount + ' Tasks (' + progress.percent + '%)</b>');
    out.push('      </div>');
    out.push('      <div class="fz-pte-meter-bar-wrap" style="height:8px; background:#e2e8f0;">');
    out.push('        <div class="fz-pte-meter-bar" style="width:' + progress.percent + '%; background:#10b981;"></div>');
    out.push('      </div>');
    out.push('    </div>');

    // Nakul Master Secret Callout
    if (dayData.nakulSecret) {
      out.push('    <div class="fz-pte-nakul-callout">');
      out.push('      <div class="fz-pte-nakul-callout-title">💡 Nakul 7-Hour Master Rule (Secret Protocol)</div>');
      out.push('      <p class="fz-pte-nakul-callout-body">' + esc(dayData.nakulSecret) + '</p>');
      out.push('    </div>');
    }

    // Task Checklist
    out.push('    <div class="fz-pte-tasks-list">');
    tasks.forEach(function (t) {
      var isChecked = state.completedTaskIds.indexOf(t.id) !== -1;
      var rowClass = isChecked ? ' done' : '';
      var checkClass = isChecked ? ' checked' : '';

      out.push('      <div class="fz-pte-task-row' + rowClass + '">');
      out.push('        <div class="fz-pte-task-left">');
      out.push('          <button type="button" class="fz-pte-checkbox-btn' + checkClass + '" onclick="FiezelPteUi.toggleTaskComplete(\'' + esc(t.id) + '\')">' + (isChecked ? '✓' : '') + '</button>');
      out.push('          <div class="fz-pte-task-details">');
      out.push('            <div class="fz-pte-task-name">' + esc(t.title) + '</div>');
      out.push('            <div class="fz-pte-task-instruction">' + esc(t.instructions) + '</div>');
      out.push('          </div>');
      out.push('        </div>');

      if (t.type === 'kawan_bicara') {
        out.push('        <button type="button" class="fz-pte-task-action-btn" onclick="FiezelPteUi.openVoiceStudio(' + currentDay + ')">Call Coach 🎙</button>');
      } else {
        var modeMap = { read_aloud: 'ra', repeat_sentence: 'rs', describe_image: 'di', write_from_dictation: 'wfd' };
        var targetMode = modeMap[t.type] || 'ra';
        out.push('        <button type="button" class="fz-pte-task-action-btn" onclick="FiezelPteUi.launchTask(\'' + targetMode + '\', ' + JSON.stringify(t.itemIds || []).replace(/"/g, '&quot;') + ')">Practice ➔</button>');
      }

      out.push('      </div>');
    });
    out.push('    </div>');

    out.push('  </div>');
    return out.join('\n');
  }

  /**
   * Render 6 Rumus Grammar 3 Detik & Collocations Quick Guide Drawer.
   */
  function renderGrammarQuickGuide() {
    var out = ['  <div class="fz-pte-grammar-guide-card fade">'];
    out.push('    <div class="fz-pte-guide-header">');
    out.push('      <h4>💡 6 Rumus Grammar 3 Detik (PTE FIB Cheat-Sheet)</h4>');
    out.push('      <button type="button" class="fz-pte-close-guide" onclick="FiezelPteUi.toggleGrammarGuide()">✕ Close</button>');
    out.push('    </div>');

    out.push('    <div class="fz-pte-rules-grid">');

    // Rule 1
    out.push('      <div class="fz-pte-rule-item">');
    out.push('        <b>Rumus 1: Modal Auxiliary + V1</b>');
    out.push('        <p>Setelah modal (<code>can</code>, <code>could</code>, <code>will</code>, <code>would</code>, <code>must</code>, <code>should</code>, <code>may</code>), kata kerja wajib berbentuk dasar (V1 tanpa -s/-ed/-ing).<br>Contoh: <i>will <b>provide</b></i>, <i>must <b>ensure</b></i>.</p>');
    out.push('      </div>');

    // Rule 2
    out.push('      <div class="fz-pte-rule-item">');
    out.push('        <b>Rumus 2: Passive Voice (to be + V3)</b>');
    out.push('        <p>Setelah <code>is / are / was / were / been / being</code> jika subjek menerima aksi (di-/ter-), wajib gunakan Verb 3 (Past Participle).<br>Contoh: <i>was <b>conducted</b></i>, <i>is widely <b>regarded</b></i>.</p>');
    out.push('      </div>');

    // Rule 3
    out.push('      <div class="fz-pte-rule-item">');
    out.push('        <b>Rumus 3: Perfect Aspect (have/has/had + V3)</b>');
    out.push('        <p>Setelah <code>has / have / had</code>, kata kerja wajib Verb 3 (Past Participle).<br>Contoh: <i>has <b>developed</b></i>, <i>have <b>demonstrated</b></i>.</p>');
    out.push('      </div>');

    // Rule 4
    out.push('      <div class="fz-pte-rule-item">');
    out.push('        <b>Rumus 4: Adjective before Noun</b>');
    out.push('        <p>Jika titik-titik berada di antara Determiner (<code>a / an / the / their</code>) dan Noun (kata benda), wajib diisi Adjective (kata sifat).<br>Contoh: <i>a <b>vital</b> role</i>, <i><b>significant</b> impact</i>.</p>');
    out.push('      </div>');

    // Rule 5
    out.push('      <div class="fz-pte-rule-item">');
    out.push('        <b>Rumus 5: Adverb modifies Verb or Adjective</b>');
    out.push('        <p>Adverb berakhiran <code>-ly</code> menjelaskan cara kerja (Verb) atau kadar (Adjective).<br>Contoh: <i>increased <b>dramatically</b></i>, <i><b>substantially</b> more cost-effective</i>.</p>');
    out.push('      </div>');

    // Rule 6
    out.push('      <div class="fz-pte-rule-item">');
    out.push('        <b>Rumus 6: Preposition + Gerund (V-ing) / Noun</b>');
    out.push('        <p>Setelah preposisi (<code>by</code>, <code>in</code>, <code>of</code>, <code>for</code>, <code>through</code>, <code>without</code>), kata kerja wajib berbentuk <code>V-ing</code> (Gerund) atau Noun.<br>Contoh: <i>by <b>analyzing</b></i>, <i>in <b>determining</b></i>.</p>');
    out.push('      </div>');

    out.push('    </div>');

    // Collocation and Linking Words Quick Summary
    out.push('    <div class="fz-pte-collocation-summary">');
    out.push('      <b>🤝 Top Academic Collocation Pairs (ACL):</b><br>');
    out.push('      <code>play a key/vital role in</code> · <code>conduct research</code> · <code>take into account</code> · <code>wide range of</code> · <code>pose a serious threat to</code> · <code>meet the criteria</code> · <code>pave the way for</code>');
    out.push('    </div>');

    out.push('    <div class="fz-pte-collocation-summary" style="margin-top:8px;">');
    out.push('      <b>🧭 Linking Words &amp; Logic Connectors:</b><br>');
    out.push('      <b>Contrast:</b> <code>However,</code>, <code>Although</code>, <code>In contrast,</code>, <code>Conversely,</code> | <b>Addition:</b> <code>Furthermore,</code>, <code>Moreover,</code>, <code>In addition,</code> | <b>Cause &amp; Effect:</b> <code>Therefore,</code>, <code>Consequently,</code>, <code>As a result,</code>');
    out.push('    </div>');

    out.push('  </div>');
    return out.join('\n');
  }

  /**
   * Render individual practice card tailored to active mode.
   */
  function renderPracticeCard(item) {
    var out = ['  <div class="fz-pte-practice-card">'];

    // Header info
    out.push('    <div class="fz-pte-card-header">');
    out.push('      <div class="fz-pte-task-info">');
    out.push('        <div class="fz-pte-task-title">' + esc(item.title || item.id) + '</div>');
    var cross = (state.mode === 'ra' ? 'Speaking & Reading' :
                 state.mode === 'rs' ? 'Speaking & Listening' :
                 state.mode === 'di' ? 'Speaking (Fluency & Keywords)' :
                 state.mode === 'rl' ? 'Speaking & Listening' :
                 state.mode === 'swt' ? 'Reading & Writing' :
                 state.mode === 'essay' ? 'Writing (Structure & Vocabulary)' :
                 state.mode === 'wfd' ? 'Listening & Writing (Kingmaker)' :
                 state.mode === 'rwFib' ? 'Reading & Writing (Grammar & Collocations)' :
                 state.mode === 'rDd' ? 'Reading (Parts of Speech & Logic)' :
                 state.mode === 'ro' ? 'Reading (Adjacent Cohesion & Paragraph Pairs)' :
                 state.mode === 'sst' ? 'Listening & Writing' :
                 state.mode === 'lf' ? 'Listening & Writing' :
                 'Listening & Reading (Negative Marking Active)');
    out.push('        <div class="fz-pte-task-cross-skills">Points to: ' + cross + '</div>');
    out.push('      </div>');
    out.push('      <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:3px;">');
    out.push('        <div style="font-size:0.78rem; font-weight:800; color:#64748b;">#' + (state.itemIndex + 1) + ' / ' + (BANKS[state.mode] || []).length + '</div>');
    if (['ra', 'rs', 'di', 'rl'].indexOf(state.mode) !== -1 && state.timerState === 'idle') {
      var timingInfo = state.mode === 'rs' ? 'Listen & Repeat' : (state.mode === 'di' ? 'Prep 25s • Rec 40s' : 'Prep 35s • Rec 40s');
      out.push('        <span class="fz-pte-prep-pill">⏱ ' + timingInfo + '</span>');
    }
    out.push('      </div>');
    out.push('    </div>');

    // Official Pearson Status Box (Timer/Recording for audio modes - active only when running)
    if (['ra', 'rs', 'di', 'rl'].indexOf(state.mode) !== -1 && state.timerState !== 'idle') {
      out.push('    <div class="fz-pte-pearson-status-box">');
      var statusTitle = 'Current State:';
      var statusVal = 'Ready to begin';
      var barClass = 'ready-bar';
      var progressPct = 0;

      if (state.timerState === 'preparing') {
        statusVal = 'Beginning in ' + state.timerRemainingSec + ' seconds...';
        barClass = 'prep-bar';
        var totalPrep = state.timerTotalSec || 35;
        progressPct = Math.round(((totalPrep - state.timerRemainingSec) / totalPrep) * 100);
      } else if (state.timerState === 'recording') {
        statusVal = 'Recording... Speak now!';
        barClass = 'rec-bar';
        var totalRec = state.timerTotalSec || 40;
        progressPct = Math.round(((totalRec - state.timerRemainingSec) / totalRec) * 100);
      } else if (state.timerState === 'completed') {
        statusVal = 'Completed. Processing scoring...';
        barClass = 'ready-bar';
        progressPct = 100;
      }

      out.push('      <div class="fz-pte-status-text"><span>' + statusTitle + '</span> <b>' + esc(statusVal) + '</b></div>');
      out.push('      <div class="fz-pte-progress-rail">');
      out.push('        <div class="fz-pte-progress-fill ' + barClass + '" style="width:' + progressPct + '%;"></div>');
      if (state.mode === 'di') {
        out.push('        <div class="fz-pte-green-zone-marker" title="Optimal Duration Zone (25-28s)"></div>');
        out.push('        <div class="fz-pte-green-zone-label">Optimal 25-28s</div>');
      }
      out.push('      </div>');
      out.push('    </div>');

      if (state.timerState === 'recording') {
        out.push('    <div class="fz-pte-live-bubble">');
        out.push('      <span class="fz-pte-live-mic-pulse">🎙️</span>');
        out.push('      <div style="flex:1;">');
        out.push('        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">');
        out.push('          <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:#15803d; letter-spacing:0.04em;">Live Speech Recognition</span>');
        out.push('          <span style="font-size:0.72rem; font-weight:700; color:#16a34a;">● Live Mic Level</span>');
        out.push('        </div>');
        out.push('        <div class="fz-pte-mic-meter-bar" style="background:#dcfce7; height:6px; border-radius:999px; overflow:hidden; margin-bottom:6px;">');
        out.push('          <div id="fzPteMicMeterFill" style="width:0%; height:100%; background:#10b981; transition:width 0.08s ease, background-color 0.15s ease;"></div>');
        out.push('        </div>');
        out.push('        <div id="fzPteLiveSpeechText" style="font-size:0.92rem; font-weight:600; color:#166534; min-height:22px; word-break:break-word;">' + esc(state.speechTranscript || 'Listening to your voice... Speak now!') + '</div>');
        out.push('      </div>');
        out.push('    </div>');
      }
    }

    // BODY CANVAS PER MODE
    if (state.mode === 'ra') {
      out.push('    <div class="fz-pte-prompt-box">');
      out.push('      <div class="fz-pte-chunked-text">' + formatChunkedText(item.chunking || item.text) + '</div>');
      out.push('    </div>');
      out.push('    <div class="fz-pte-secret-tip">');
      out.push('      <b>💡 Nakul 7-Hour Secret:</b> Baca dengan tempo stabil 12-14 detik. Jangan terburu-buru, jangan ubah nada saat tanda titik! Bernafas hanya di tanda jeda ganda (//).');
      out.push('    </div>');
    } else if (state.mode === 'rs') {
      out.push('    <div class="fz-pte-audio-prompt-card">');
      out.push('      <div style="display:flex; align-items:center; gap:12px;">');
      out.push('        <button type="button" class="fz-pte-play-btn" onclick="FiezelPteUi.playRsAudioAndListen()">' + (state.isAudioPlaying ? '■' : '▶') + '</button>');
      out.push('        <div style="flex:1;">');
      out.push('          <div style="font-weight:800; font-size:0.92rem; color:#0f172a;">Repeat Sentence (Pearson Audio)</div>');
      out.push('          <div style="font-size:0.78rem; color:#64748b;">' + (state.isAudioPlaying ? '🔊 Playing prompt sentence...' : 'Click Play to hear prompt') + '</div>');
      out.push('        </div>');
      out.push('        <div class="fz-pte-audio-waveform">');
      for (var w = 0; w < 12; w++) {
        var hClass = state.isAudioPlaying ? ' active' : '';
        out.push('          <div class="fz-pte-wave-bar' + hClass + '" style="animation-delay:' + (w * 0.05) + 's;"></div>');
      }
      out.push('        </div>');
      out.push('      </div>');
      out.push('      <div class="fz-pte-rs-rule-note">🎧 <b>Pearson Rule:</b> Prompt text is hidden. Listen carefully and speak immediately after the tone.</div>');
      out.push('    </div>');
      out.push('    <div class="fz-pte-secret-tip">');
      out.push('      <b>💡 Nakul 50% Rule:</b> Tangkap 50-60% kata awal dengan lancar tanpa jeda. Jangan mengoreksi diri sendiri!');
      out.push('    </div>');
    } else if (state.mode === 'di') {
      if (item.svg) {
        out.push('    <div class="fz-pte-svg-frame">' + item.svg + '</div>');
      }
      out.push('    <div class="fz-pte-template-accord">');
      out.push('      <button type="button" class="fz-pte-accord-toggle" onclick="FiezelPteUi.toggleTemplate()">');
      out.push('        <span>📋 Nakul 5-Line Universal Template</span>');
      out.push('        <span>' + (state.templateOpen ? '▲ Hide' : '▼ View Scaffold') + '</span>');
      out.push('      </button>');
      if (state.templateOpen) {
        var tpl = (BANKS.templates && BANKS.templates.templates && BANKS.templates.templates.describe_image) || {};
        out.push('      <div class="fz-pte-accord-body">');
        out.push('        <pre class="fz-pte-template-text">' + esc(tpl.text || 'The given image represents...') + '</pre>');
        out.push('      </div>');
      }
      out.push('    </div>');
    } else if (state.mode === 'rl') {
      out.push('    <div class="fz-pte-audio-player-box">');
      out.push('      <button type="button" class="fz-pte-play-btn" onclick="FiezelPteUi.playAudioPrompt()">' + (state.isAudioPlaying ? '■' : '▶') + '</button>');
      out.push('      <div style="flex:1; margin-left:12px;">');
      out.push('        <div style="font-weight:700; font-size:0.9rem; color:#1e293b;">Listen to Academic Lecture</div>');
      out.push('        <div style="font-size:0.78rem; color:#64748b;">Domain: ' + esc(item.domain || 'Academic') + '</div>');
      out.push('      </div>');
      out.push('    </div>');
      out.push('    <div class="fz-pte-prompt-box" style="margin-top:12px;">');
      out.push('      <div style="font-weight:700; font-size:0.85rem; color:#334155; margin-bottom:6px;">Key Noun Chunks to Capture:</div>');
      out.push('      <div style="display:flex; flex-wrap:wrap; gap:6px;">');
      (item.keyNounChunks || []).forEach(function (chunk) {
        out.push('        <span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:12px; font-size:0.78rem; font-weight:700;">' + esc(chunk) + '</span>');
      });
      out.push('      </div>');
      out.push('    </div>');
      out.push('    <div class="fz-pte-secret-tip">');
      out.push('      <b>💡 Nakul 4-Sentence Rule:</b> "The lecture primarily discussed [Chunk 1]. He highlighted [Chunk 2]. Furthermore, he explained [Chunk 3]. Finally, the speaker concluded [Chunk 4]." Speak smoothly without pausing for 25-28 seconds!');
      out.push('    </div>');
    } else if (state.mode === 'wfd') {
      out.push('    <div class="fz-pte-audio-player-box">');
      out.push('      <button type="button" class="fz-pte-play-btn" onclick="FiezelPteUi.playAudioPrompt()">' + (state.isAudioPlaying ? '■' : '▶') + '</button>');
      out.push('      <div style="flex:1; margin-left:12px;">');
      out.push('        <div style="font-weight:700; font-size:0.9rem; color:#1e293b;">Listen to Sentence (Dictation Prompt)</div>');
      out.push('        <div style="font-size:0.78rem; color:#64748b;">Click Play to listen. Type exactly what you hear.</div>');
      out.push('      </div>');
      out.push('      <div class="fz-pte-audio-waveform">');
      for (var w2 = 0; w2 < 16; w2++) {
        var hClass2 = state.isAudioPlaying ? ' active' : '';
        out.push('        <div class="fz-pte-wave-bar' + hClass2 + '" style="animation-delay:' + (w2 * 0.05) + 's;"></div>');
      }
      out.push('      </div>');
      out.push('    </div>');
      out.push('    <div style="margin-top:12px;">');
      out.push('      <textarea id="fzPteDictationInput" class="fz-pte-dictation-editor" placeholder="Type the sentence you hear here (check keyword spelling)..." oninput="FiezelPteUi.updateWfdCount()">' + esc(state.wfdText || '') + '</textarea>');
      out.push('      <div class="fz-pte-dictation-stats">');
      var wfdWordCount = state.wfdText ? state.wfdText.trim().split(/\s+/).filter(Boolean).length : 0;
      out.push('        <span id="fzPteWordCountLabel">' + wfdWordCount + ' words</span>');
      out.push('        <span>1 point for each correct word (Listening + Writing)</span>');
      out.push('      </div>');
      out.push('      <div class="fz-pte-hack-badge">💡 <b>Nakul Extra Words Hack:</b> Unsure of singular or plural? Write both (e.g. <code>student students</code>). Pearson AI does not penalize extra words!</div>');
      out.push('    </div>');
    } else if (state.mode === 'rwFib') {
      out.push('    <div style="display:flex; justify-content:flex-end;">');
      out.push('      <button type="button" class="fz-pte-guide-toggle-btn" onclick="FiezelPteUi.toggleGrammarGuide()">');
      out.push('        <span>' + (state.showGrammarGuide ? '▲ Close Guide' : '💡 6 Rumus Grammar 3 Detik & Collocations') + '</span>');
      out.push('      </button>');
      out.push('    </div>');
      if (state.showGrammarGuide) {
        out.push(renderGrammarQuickGuide());
      }
      out.push('    <div class="fz-pte-prompt-box">');
      out.push('      <div class="fz-pte-reading-passage">' + renderRwFibPassage(item) + '</div>');
      out.push('    </div>');
    } else if (state.mode === 'rDd') {
      out.push('    <div style="display:flex; justify-content:flex-end;">');
      out.push('      <button type="button" class="fz-pte-guide-toggle-btn" onclick="FiezelPteUi.toggleGrammarGuide()">');
      out.push('        <span>' + (state.showGrammarGuide ? '▲ Close Guide' : '💡 6 Rumus Grammar 3 Detik & Collocations') + '</span>');
      out.push('      </button>');
      out.push('    </div>');
      if (state.showGrammarGuide) {
        out.push(renderGrammarQuickGuide());
      }
      out.push('    <div class="fz-pte-prompt-box">');
      out.push('      <div class="fz-pte-reading-passage">' + renderReadingDdPassage(item) + '</div>');
      out.push('    </div>');
      out.push('    <div class="fz-pte-word-pool-wrap">');
      out.push('      <div style="font-size:0.8rem; font-weight:800; color:#475569; margin-bottom:6px;">Word Pool (Click to assign):</div>');
      out.push('      <div class="fz-pte-word-pool">');
      state.rDdWordPool.forEach(function (word) {
        out.push('        <button type="button" class="fz-pte-pool-chip" onclick="FiezelPteUi.assignDdWord(\'' + esc(word) + '\')">' + esc(word) + '</button>');
      });
      out.push('      </div>');
      out.push('    </div>');
    } else if (state.mode === 'ro') {
      out.push('    <div class="fz-pte-prompt-box">');
      out.push('      <div style="font-size:0.82rem; color:#64748b; margin-bottom:8px;">Use ▲ and ▼ to reorder paragraphs into the correct sequence. Scored by official Pearson adjacent pairs.</div>');
      out.push('      <div class="fz-pte-ro-list">' + renderRoParagraphs(item) + '</div>');
      out.push('    </div>');
    } else if (state.mode === 'swt') {
      out.push('    <div class="fz-pte-prompt-box">');
      out.push('      <div style="max-height:220px; overflow-y:auto; line-height:1.6; font-size:0.92rem; color:#1e293b; padding-right:8px;">' + esc(item.text) + '</div>');
      out.push('    </div>');
      out.push('    <div style="margin-top:12px;">');
      out.push('      <textarea id="fzPteSwtInput" class="fz-pte-dictation-editor" placeholder="Write exactly ONE single sentence summary (35-45 words recommended, max 75 words)..." oninput="FiezelPteUi.updateSwtCount()">' + esc(state.swtText) + '</textarea>');
      out.push('      <div class="fz-pte-dictation-stats">');
      out.push('        <span id="fzPteSwtCountLabel">0 words</span>');
      out.push('        <span>Strict Pearson Rule: Exactly 1 single sentence</span>');
      out.push('      </div>');
      out.push('    </div>');
    } else if (state.mode === 'essay') {
      out.push('    <div class="fz-pte-prompt-box">');
      out.push('      <div style="font-weight:700; font-size:0.95rem; color:#0f172a; line-height:1.5;">' + esc(item.prompt) + '</div>');
      out.push('    </div>');
      out.push('    <div class="fz-pte-template-accord" style="margin-top:8px;">');
      out.push('      <button type="button" class="fz-pte-accord-toggle" onclick="FiezelPteUi.toggleEssayScaffold()">');
      out.push('        <span>📋 4-Paragraph Structure &amp; Scaffolding</span>');
      out.push('        <span>' + (state.templateOpen ? '▲ Hide' : '▼ View Structure') + '</span>');
      out.push('      </button>');
      if (state.templateOpen) {
        var plan = item.fourParagraphPlan || {};
        out.push('      <div class="fz-pte-accord-body">');
        out.push('        <div style="font-size:0.8rem; line-height:1.5; color:#334155;">');
        out.push('          <div><b>Para 1 (Introduction):</b> ' + esc(plan.introduction) + '</div>');
        out.push('          <div style="margin-top:4px;"><b>Para 2 (Body 1):</b> ' + esc(plan.bodyParagraph1) + '</div>');
        out.push('          <div style="margin-top:4px;"><b>Para 3 (Body 2):</b> ' + esc(plan.bodyParagraph2) + '</div>');
        out.push('          <div style="margin-top:4px;"><b>Para 4 (Conclusion):</b> ' + esc(plan.conclusion) + '</div>');
        out.push('        </div>');
        out.push('      </div>');
      }
      out.push('    </div>');
      out.push('    <div style="margin-top:10px;">');
      out.push('      <textarea id="fzPteEssayInput" class="fz-pte-dictation-editor" style="min-height:160px;" placeholder="Type your 4-paragraph academic essay here (target 200-300 words)..." oninput="FiezelPteUi.updateEssayCount()">' + esc(state.essayText) + '</textarea>');
      out.push('      <div class="fz-pte-dictation-stats">');
      out.push('        <span id="fzPteEssayCountLabel">0 words</span>');
      out.push('        <span>Target: 200-300 words · 4 paragraphs</span>');
      out.push('      </div>');
      out.push('    </div>');
    } else if (state.mode === 'sst') {
      out.push('    <div class="fz-pte-audio-player-box">');
      out.push('      <button type="button" class="fz-pte-play-btn" onclick="FiezelPteUi.playAudioPrompt()">' + (state.isAudioPlaying ? '■' : '▶') + '</button>');
      out.push('      <div style="flex:1; margin-left:12px;">');
      out.push('        <div style="font-weight:700; font-size:0.9rem; color:#1e293b;">Listen to Spoken Lecture</div>');
      out.push('        <div style="font-size:0.78rem; color:#64748b;">Target: 50-70 words summary strictly</div>');
      out.push('      </div>');
      out.push('    </div>');
      out.push('    <div style="margin-top:12px;">');
      out.push('      <textarea id="fzPteSstInput" class="fz-pte-dictation-editor" placeholder="Write your 50-70 word summary here (capture main points)..." oninput="FiezelPteUi.updateSstCount()">' + esc(state.sstText) + '</textarea>');
      out.push('      <div class="fz-pte-dictation-stats">');
      out.push('        <span id="fzPteSstCountLabel">0 words</span>');
      out.push('        <span>Strict Pearson Limit: 50-70 words</span>');
      out.push('      </div>');
      out.push('    </div>');
    } else if (state.mode === 'lf') {
      out.push('    <div class="fz-pte-audio-player-box">');
      out.push('      <button type="button" class="fz-pte-play-btn" onclick="FiezelPteUi.playAudioPrompt()">' + (state.isAudioPlaying ? '■' : '▶') + '</button>');
      out.push('      <div style="flex:1; margin-left:12px;">');
      out.push('        <div style="font-weight:700; font-size:0.9rem; color:#1e293b;">Listening Fill in the Blanks</div>');
      out.push('        <div style="font-size:0.78rem; color:#64748b;">Type the exact missing words as spoken.</div>');
      out.push('      </div>');
      out.push('    </div>');
      out.push('    <div class="fz-pte-prompt-box" style="margin-top:12px;">');
      out.push('      <div class="fz-pte-reading-passage">' + renderListeningFibPassage(item) + '</div>');
      out.push('    </div>');
    } else if (state.mode === 'hiw') {
      out.push('    <div class="fz-pte-audio-player-box">');
      out.push('      <button type="button" class="fz-pte-play-btn" onclick="FiezelPteUi.playAudioPrompt()">' + (state.isAudioPlaying ? '■' : '▶') + '</button>');
      out.push('      <div style="flex:1; margin-left:12px;">');
      out.push('        <div style="font-weight:700; font-size:0.9rem; color:#1e293b;">Highlight Incorrect Words</div>');
      out.push('        <div style="font-size:0.78rem; color:#b91c1c; font-weight:700;">⚠ Negative Marking Active: +1 correct error, -1 false alarm!</div>');
      out.push('      </div>');
      out.push('    </div>');
      out.push('    <div class="fz-pte-prompt-box" style="margin-top:12px;">');
      out.push('      <div class="fz-pte-hiw-tokens">' + renderHiwTokens(item) + '</div>');
      out.push('    </div>');
    }

    // Speech recognition & manual transcript helper for speaking modes
    if (['ra', 'rs', 'di', 'rl'].indexOf(state.mode) !== -1) {
      out.push('    <div class="fz-pte-vad-status-row">');
      out.push('      <span style="font-size:0.75rem; color:#64748b; font-weight:700;">🎙️ Live VAD Active</span>');
      out.push('      <button type="button" class="fz-pte-text-link-btn" onclick="FiezelPteUi.toggleManualSpeechInput()">' + (state.showManualSpeechInput ? '▲ Hide Input' : '⌨️ Type / Edit Transcript') + '</button>');
      out.push('    </div>');
      if (state.showManualSpeechInput) {
        out.push('    <div style="margin-top:6px; display:flex; gap:6px;">');
        out.push('      <input type="text" id="fzPteManualSpeechInput" style="flex:1; height:34px; padding:4px 10px; border-radius:8px; border:1.5px solid #cbd5e1; font-size:0.85rem;" value="' + esc(state.speechTranscript || '') + '" placeholder="Type spoken words..." oninput="FiezelPteUi.setManualSpeech(this.value)">');
        out.push('      <button type="button" style="padding:4px 12px; background:#0284c7; color:#fff; border:none; border-radius:8px; font-weight:700; font-size:0.82rem; cursor:pointer;" onclick="FiezelPteUi.evaluateManualSpeech()">Score</button>');
        out.push('    </div>');
      }
    }

    // Action Dock per mode
    out.push('    <div class="fz-pte-action-dock">');
    if (state.mode === 'wfd') {
      out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.submitWfd()">Check Spelling &amp; Score</button>');
    } else if (state.mode === 'rwFib') {
      out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.checkRwFib()">Check Answers &amp; Learn Formula</button>');
    } else if (state.mode === 'rDd') {
      out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.checkReadingDd()">Verify Placement</button>');
    } else if (state.mode === 'ro') {
      out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.checkReorder()">Verify Sequence</button>');
    } else if (state.mode === 'swt') {
      out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.checkSwt()">Evaluate Summary</button>');
    } else if (state.mode === 'essay') {
      out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.checkEssay()">Score Essay</button>');
    } else if (state.mode === 'sst') {
      out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.checkSst()">Check Spoken Summary</button>');
    } else if (state.mode === 'lf') {
      out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.checkListeningFib()">Check Spelling</button>');
    } else if (state.mode === 'hiw') {
      out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.checkHiw()">Submit Selections</button>');
    } else {
      // Audio Recording modes: RA, RS, DI, RL
      var isRec = state.timerState === 'recording';
      var recBtnClass = isRec ? ' recording' : '';
      var recBtnLabel = isRec ? '■ Finish Speaking (Submit)' :
                        (state.timerState === 'preparing' ? '▶ Record Now' :
                        (state.mode === 'rs' ? (state.isAudioPlaying ? '■ Stop Audio' : '▶ Play Prompt & Repeat') : '● Start Preparation'));
      var clickAction = (state.mode === 'rs' && state.timerState === 'idle') ? 'FiezelPteUi.playRsAudioAndListen()' : 'FiezelPteUi.handleMicAction()';
      out.push('      <button type="button" class="fz-pte-btn-primary' + recBtnClass + '" onclick="' + clickAction + '">' + esc(recBtnLabel) + '</button>');
    }
    out.push('      <button type="button" class="fz-pte-btn-secondary" onclick="FiezelPteUi.nextItem()">Next Question ➔</button>');
    out.push('    </div>');

    // Deep Pedagogical Feedback Drawer (if present)
    if (state.activeDeepFeedback) {
      out.push(renderDeepFeedbackDrawer(state.activeDeepFeedback));
    }

    out.push('  </div>');
    return out.join('\n');
  }

  function formatChunkedText(raw) {
    if (!raw) return '';
    return esc(raw).replace(/\/\//g, '<span class="fz-pte-breath-mark">//</span>');
  }

  function renderRwFibPassage(item) {
    var text = item.text || '';
    var blanks = item.blanks || [];
    var fbItems = (state.activeDeepFeedback && state.activeDeepFeedback.items) || [];
    var fbMap = {};
    fbItems.forEach(function (fb) { fbMap[fb.id] = fb; });

    blanks.forEach(function (b) {
      var chosen = state.rwFibSelections[b.id] || '';
      var fb = fbMap[b.id];
      var statusClass = '';
      if (fb) {
        statusClass = fb.isCorrect ? ' is-correct' : ' is-wrong';
      } else if (chosen) {
        statusClass = ' is-selected';
      }
      var selHtml = '<select class="fz-pte-fib-select' + statusClass + '" onchange="FiezelPteUi.selectRwFibOption(\'' + esc(b.id) + '\', this.value)">';
      selHtml += '<option value="">-- select --</option>';
      (b.options || []).forEach(function (opt) {
        var isSel = chosen === opt ? ' selected' : '';
        selHtml += '<option value="' + esc(opt) + '"' + isSel + '>' + esc(opt) + '</option>';
      });
      selHtml += '</select>';
      text = text.replace('{' + b.id + '}', selHtml);
      text = text.replace('[' + b.id + ']', selHtml);
    });
    return text;
  }

  function renderReadingDdPassage(item) {
    var text = item.text || '';
    var keys = Object.keys(item.correctAnswers || {});
    var fbItems = (state.activeDeepFeedback && state.activeDeepFeedback.items) || [];
    var fbMap = {};
    fbItems.forEach(function (fb) { fbMap[fb.id] = fb; });

    keys.forEach(function (k, idx) {
      var assigned = state.rDdAssignments[k] || '';
      var fb = fbMap[k];
      var statusClass = '';
      if (fb) {
        statusClass = fb.isCorrect ? ' is-correct' : ' is-wrong';
      } else if (assigned) {
        statusClass = ' filled';
      }
      var slotHtml = '<span class="fz-pte-drop-slot' + statusClass + '" onclick="FiezelPteUi.clearDdBlank(\'' + esc(k) + '\')">' + (assigned ? esc(assigned) : '[' + (idx + 1) + ']') + '</span>';
      text = text.replace('{' + k + '}', slotHtml);
      text = text.replace('[' + k + ']', slotHtml);
    });
    return text;
  }

  function renderRoParagraphs(item) {
    var paragraphs = item.paragraphs || [];
    var map = {};
    paragraphs.forEach(function (p) { map[p.id] = p; });

    var out = [];
    state.roOrder.forEach(function (pid, idx) {
      var p = map[pid];
      if (!p) return;
      out.push('  <div class="fz-pte-ro-card">');
      out.push('    <div class="fz-pte-ro-card-left">');
      out.push('      <span class="fz-pte-ro-badge">' + esc(p.id) + '</span>');
      out.push('      <div class="fz-pte-ro-text">' + esc(p.text) + '</div>');
      out.push('    </div>');
      out.push('    <div class="fz-pte-ro-controls">');
      out.push('      <button type="button" class="fz-pte-ro-btn" onclick="FiezelPteUi.moveRoParagraph(' + idx + ', -1)"' + (idx === 0 ? ' disabled' : '') + '>▲</button>');
      out.push('      <button type="button" class="fz-pte-ro-btn" onclick="FiezelPteUi.moveRoParagraph(' + idx + ', 1)"' + (idx === state.roOrder.length - 1 ? ' disabled' : '') + '>▼</button>');
      out.push('    </div>');
      out.push('  </div>');
    });
    return out.join('\n');
  }

  function renderListeningFibPassage(item) {
    var text = item.displayedText || '';
    var fbItems = (state.activeDeepFeedback && state.activeDeepFeedback.items) || [];
    var fbMap = {};
    fbItems.forEach(function (fb) { fbMap[fb.id] = fb; });

    (item.blanks || []).forEach(function (b) {
      var typed = state.lfAnswers[b.id] || '';
      var fb = fbMap[b.id];
      var statusClass = '';
      if (fb) {
        statusClass = fb.isCorrect ? ' is-correct' : ' is-wrong';
      } else if (typed) {
        statusClass = ' has-value';
      }
      var inputHtml = '<input type="text" class="fz-pte-lf-input' + statusClass + '" value="' + esc(typed) + '" oninput="FiezelPteUi.setLfAnswer(\'' + esc(b.id) + '\', this.value)" placeholder="(' + esc(b.id) + ')">';
      text = text.replace('{' + b.id + '}', inputHtml);
      text = text.replace('[' + b.id + ']', inputHtml);
    });
    return text;
  }

  function renderHiwTokens(item) {
    var text = item.displayedText || '';
    var words = text.split(/\s+/);
    var out = [];
    words.forEach(function (w, idx) {
      var isSel = state.hiwSelectedIndices.indexOf(idx) !== -1;
      var selClass = isSel ? ' selected' : '';
      out.push('<span class="fz-pte-hiw-token' + selClass + '" onclick="FiezelPteUi.toggleHiwWord(' + idx + ')">' + esc(w) + '</span>');
    });
    return out.join(' ');
  }

  /**
   * Render Deep Pedagogical Feedback Drawer.
   */
  function renderDeepFeedbackDrawer(data) {
    var out = ['  <div class="fz-pte-deep-feedback-card">'];
    out.push('    <div class="fz-pte-deep-feedback-title">🧠 Deep Pedagogical Feedback (Formula &amp; Collocations)</div>');

    if (Array.isArray(data.items)) {
      data.items.forEach(function (d, idx) {
        out.push('    <div class="fz-pte-feedback-blank-box">');
        out.push('      <div style="font-weight:800; font-size:0.9rem; color:#0f172a; margin-bottom:4px;">Blank ' + (idx + 1) + ': <span style="color:' + (d.isCorrect ? '#10b981' : '#ef4444') + ';">' + (d.isCorrect ? '✓ Correct' : '✗ Incorrect') + '</span> (Target: <b>' + esc(d.correct) + '</b>)</div>');
        if (d.feedback) {
          if (d.feedback.formula || d.feedback.grammarFormula) {
            out.push('      <div class="fz-pte-formula-line">💡 <b>3-Second Grammar Formula:</b> ' + esc(d.feedback.formula || d.feedback.grammarFormula) + '</div>');
          }
          if (d.feedback.collocation) {
            out.push('      <div class="fz-pte-collocation-line">🤝 <b>Collocation Pair:</b> <code>' + esc(d.feedback.collocation) + '</code></div>');
          }
          if (d.feedback.linkingWordType) {
            out.push('      <div class="fz-pte-linking-line">🧭 <b>Linking Word &amp; Logic Map:</b> ' + esc(d.feedback.linkingWordType) + '</div>');
          }
          if (d.feedback.distractorAnalysis || d.feedback.distractorTip) {
            out.push('      <div class="fz-pte-distractor-line">❌ <b>Distractor Analysis:</b> ' + esc(d.feedback.distractorAnalysis || d.feedback.distractorTip) + '</div>');
          }
          if (d.feedback.translation) {
            out.push('      <div class="fz-pte-translation-line">🇮🇩 <b>Indonesian Meaning:</b> <i>"' + esc(d.feedback.translation) + '"</i></div>');
          }
        }
        if (d.spellingTip) {
          out.push('      <div class="fz-pte-formula-line">✍ <b>Official Spelling Rule:</b> ' + esc(d.spellingTip) + '</div>');
        }
        out.push('    </div>');
      });
    } else if (data.reorderClues) {
      out.push('    <div class="fz-pte-feedback-blank-box">');
      out.push('      <div class="fz-pte-formula-line">👑 <b>Independent Sentence:</b> ' + esc(data.reorderClues.independentSentence) + '</div>');
      if (Array.isArray(data.reorderClues.pairingClues)) {
        out.push('      <div style="font-weight:700; margin-top:8px; font-size:0.85rem; color:#1e293b;">Pairing Clues:</div>');
        data.reorderClues.pairingClues.forEach(function (clue) {
          out.push('      <div class="fz-pte-collocation-line" style="margin-top:4px;">🔗 ' + esc(clue) + '</div>');
        });
      }
      out.push('    </div>');
    } else if (data.generalFeedback) {
      out.push('    <div class="fz-pte-feedback-blank-box">');
      (data.generalFeedback || []).forEach(function (line) {
        out.push('      <div class="fz-pte-formula-line">• ' + esc(line) + '</div>');
      });
      if (data.modelSummary) {
        out.push('      <div class="fz-pte-translation-line" style="margin-top:8px;">★ <b>Model Pearson 90 Summary:</b> "' + esc(data.modelSummary) + '"</div>');
      }
      out.push('    </div>');
    }

    out.push('  </div>');
    return out.join('\n');
  }

  function renderResultScorecard(res) {
    var out = ['  <div class="fz-pte-result-card">'];
    var item = getActiveItem();

    var pScore = typeof res.pearsonScore === 'number' ? res.pearsonScore : Math.round((res.score / (res.maxScore || 1)) * 90);
    var pass = pScore >= 42;
    var circleClass = pass ? ' passed' : '';
    var verdictLabel = pass ? '✓ Meets Australian Visa Benchmark (PTE 42+)' : '▲ Below Target 42 Benchmark';
    var scoreDetail = '';
    if (res.content && typeof res.content.score === 'number') {
      scoreDetail = 'Content: ' + res.content.score + ' / ' + res.content.max + ' points';
    } else if (typeof res.score === 'number' && typeof res.maxScore === 'number') {
      scoreDetail = 'Score: ' + res.score + ' / ' + res.maxScore + ' points (' + (res.percentage || Math.round((res.score / res.maxScore) * 100)) + '%)';
    }

    out.push('    <div class="fz-pte-score-circle-row" style="margin-top:0; padding-bottom:10px; border-bottom:1px solid #f1f5f9;">');
    out.push('      <div class="fz-pte-score-circle' + circleClass + '">');
    out.push('        <span class="fz-pte-score-num">' + pScore + '</span>');
    out.push('        <span class="fz-pte-score-scale">Pearson / 90</span>');
    out.push('      </div>');
    out.push('      <div style="flex:1;">');
    out.push('        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">');
    out.push('          <span style="font-weight:800; font-size:0.95rem; color:#0f172a;">' + esc(res.task || state.mode.toUpperCase()) + ' Evaluation</span>');
    out.push('          <span class="fz-pte-target-badge" style="background:' + (pass ? '#10b981' : '#0284c7') + '; color:#fff; font-size:0.7rem; padding:2px 8px;">TARGET 42 🎯</span>');
    out.push('        </div>');
    out.push('        <div style="font-weight:800; font-size:0.9rem; color:' + (pass ? '#10b981' : '#f59e0b') + '; margin-top:2px;">' + esc(verdictLabel) + '</div>');
    if (scoreDetail) {
      out.push('        <div style="font-size:0.8rem; color:#64748b; margin-top:2px;">' + esc(scoreDetail) + '</div>');
    }
    out.push('      </div>');
    out.push('    </div>');

    if (res.noSpeechDetected) {
      out.push('    <div style="background:#fee2e2; border:1.5px solid #fca5a5; color:#991b1b; padding:10px 12px; border-radius:10px; margin-top:10px; font-weight:700; font-size:0.84rem; line-height:1.45;">');
      out.push('      ⚠️ <b>No speech detected.</b> Please check your microphone, click "Retry Question", and speak clearly.');
      out.push('    </div>');
    }

    // Enabling Skills Breakdown
    if (res.fluency || res.pronunciation || (res.content && typeof res.content.score === 'number')) {
      out.push('    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px; margin-top:14px;">');
      out.push('      <div style="font-size:0.82rem; font-weight:800; color:#475569; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.04em;">Enabling Skills Breakdown</div>');

      if (res.content && typeof res.content.score === 'number') {
        var cPct = Math.min(100, Math.round((res.content.score / (res.content.max || 3)) * 100));
        out.push('      <div style="margin-bottom:8px;">');
        out.push('        <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; color:#334155;"><span>Content:</span> <span>' + res.content.score + ' / ' + res.content.max + ' (' + cPct + '%)</span></div>');
        out.push('        <div style="width:100%; height:6px; background:#e2e8f0; border-radius:999px; overflow:hidden; margin-top:3px;"><div style="width:' + cPct + '%; height:100%; background:#0284c7;"></div></div>');
        out.push('      </div>');
      }

      if (res.fluency) {
        var fPct = Math.min(100, Math.round((res.fluency.score / 5) * 100));
        out.push('      <div style="margin-bottom:8px;">');
        out.push('        <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; color:#334155;"><span>Oral Fluency:</span> <span>' + res.fluency.score + ' / 5 (' + esc(res.fluency.label || '') + ')</span></div>');
        out.push('        <div style="width:100%; height:6px; background:#e2e8f0; border-radius:999px; overflow:hidden; margin-top:3px;"><div style="width:' + fPct + '%; height:100%; background:#10b981;"></div></div>');
        out.push('      </div>');
      }

      if (res.pronunciation) {
        var pPct = Math.min(100, Math.round((res.pronunciation.score / 5) * 100));
        out.push('      <div>');
        out.push('        <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; color:#334155;"><span>Pronunciation:</span> <span>' + res.pronunciation.score + ' / 5 (' + esc(res.pronunciation.label || '') + ')</span></div>');
        out.push('        <div style="width:100%; height:6px; background:#e2e8f0; border-radius:999px; overflow:hidden; margin-top:3px;"><div style="width:' + pPct + '%; height:100%; background:#8b5cf6;"></div></div>');
        out.push('      </div>');
      }
      out.push('    </div>');
    }

    // Repeat Sentence (RS) Insight
    if (state.mode === 'rs') {
      var meets50 = res.content && res.content.meets50PercentRule;
      out.push('    <div class="fz-pte-rs-rule-badge ' + (meets50 ? 'pass' : 'fail') + '">');
      out.push('      <span>' + (meets50 ? '✅ Nakul 50% Rule Satisfied:' : '⚠️ Below 50% Rule Target:') + '</span>');
      out.push('      <span>' + (meets50 ? 'Repeated ≥50% words with smooth delivery. 2/3 Content + Fluency marks secured!' : 'Aim to capture at least first 5-6 words fluently without pausing!') + '</span>');
      out.push('    </div>');

      out.push('    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; margin-top:10px; font-size:0.84rem; line-height:1.5;">');
      out.push('      <div style="margin-bottom:4px;"><b>Original Sentence:</b> <span style="color:#0369a1;">' + esc((item && item.sentence) || '') + '</span></div>');
      out.push('      <div><b>You Spoke:</b> <span style="color:' + (res.studentTranscript ? '#0f172a' : '#ef4444') + ';">' + esc(res.studentTranscript || '(no speech detected)') + '</span></div>');
      out.push('    </div>');
    }

    // Write from Dictation (WFD) Insight
    if (state.mode === 'wfd') {
      if (res.extraWordsHackDetected) {
        out.push('    <div class="fz-pte-hack-badge">💡 <b>Nakul Extra Words Hack Active:</b> Detected pairs: ' + esc((res.variantPairs || []).join(', ')) + '. Pearson awards matching words without penalizing extras!</div>');
      }
      out.push('    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; margin-top:10px; font-size:0.84rem; line-height:1.5;">');
      out.push('      <div style="margin-bottom:4px;"><b>Target Sentence:</b> <span style="color:#0369a1;">' + esc((item && item.sentence) || '') + '</span></div>');
      out.push('      <div style="margin-bottom:6px;"><b>Your Submission:</b> <span style="color:#0f172a;">' + esc(res.studentAnswer || '') + '</span></div>');
      if (res.content && Array.isArray(res.content.matchedWords) && res.content.matchedWords.length > 0) {
        out.push('      <div style="color:#15803d; font-size:0.8rem;"><b>Matched Words (' + res.content.matchedWords.length + '):</b> ' + esc(res.content.matchedWords.join(', ')) + '</div>');
      }
      if (res.content && Array.isArray(res.content.missedWords) && res.content.missedWords.length > 0) {
        out.push('      <div style="color:#b91c1c; font-size:0.8rem; margin-top:2px;"><b>Missed Words (' + res.content.missedWords.length + '):</b> ' + esc(res.content.missedWords.join(', ')) + '</div>');
      }
      out.push('    </div>');
    }

    // Describe Image (DI) Insight
    if (state.mode === 'di') {
      var dSec = res.durationSec || 0;
      var inZone = dSec >= 25 && dSec <= 28;
      out.push('    <div class="fz-pte-rs-rule-badge ' + (inZone ? 'pass' : 'fail') + '">');
      out.push('      <span>' + (inZone ? '✅ Optimal Duration Zone Hit:' : '⏱ Duration Report:') + '</span>');
      out.push('      <span>Spoke for ' + dSec + 's. (Nakul Optimal Zone: 25–28 seconds).</span>');
      out.push('    </div>');
      if (Array.isArray(res.matchedKeywords) && res.matchedKeywords.length > 0) {
        out.push('    <div style="font-size:0.8rem; color:#0369a1; margin-top:8px;"><b>Keywords Captured:</b> ' + esc(res.matchedKeywords.join(', ')) + '</div>');
      }
      if (Array.isArray(res.templateMarkersDetected) && res.templateMarkersDetected.length > 0) {
        out.push('    <div style="font-size:0.8rem; color:#15803d; margin-top:4px;"><b>Template Lines Detected:</b> ' + esc(res.templateMarkersDetected.join(', ')) + '</div>');
      }
    }

    // Read Aloud (RA) Insight
    if (state.mode === 'ra') {
      out.push('    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; margin-top:10px; font-size:0.84rem; line-height:1.5;">');
      out.push('      <div><b>Word Error Rate (WER):</b> ' + (typeof res.wer === 'number' ? Math.round(res.wer * 100) + '%' : '0%') + '</div>');
      out.push('      <div><b>Pace:</b> ' + (res.durationSec || 0) + 's (Target: 12–14s steady rhythm)</div>');
      if (res.studentTranscript) {
        out.push('      <div style="margin-top:6px;"><b>Transcribed Speech:</b> <span style="color:#334155;">' + esc(res.studentTranscript) + '</span></div>');
      }
      out.push('    </div>');
    }

    out.push('    <div class="fz-pte-action-dock" style="margin-top:16px;">');
    out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.retryItem()">Retry Question ↺</button>');
    out.push('      <button type="button" class="fz-pte-btn-secondary" onclick="FiezelPteUi.nextItem()">Next Question ➔</button>');
    out.push('    </div>');

    out.push('  </div>');
    return out.join('\n');
  }

  // --- Handlers & Controllers ---
  function switchSection(secId) {
    state.section = secId;
    var defaultMode = {
      plan: 'ra',
      speaking: 'ra',
      writing: 'swt',
      reading: 'rwFib',
      listening: 'sst'
    };
    state.mode = defaultMode[secId] || 'ra';
    state.itemIndex = 0;
    initCurrentItemState();
    renderHub();
  }

  function switchMode(m) {
    state.mode = m;
    state.itemIndex = 0;
    initCurrentItemState();
    renderHub();
  }

  function nextItem() {
    var list = BANKS[state.mode] || [];
    if (state.itemIndex < list.length - 1) {
      state.itemIndex++;
    } else {
      state.itemIndex = 0;
    }
    initCurrentItemState();
    renderHub();
  }

  function prevItem() {
    if (state.itemIndex > 0) {
      state.itemIndex--;
      initCurrentItemState();
      renderHub();
    }
  }

  function retryItem() {
    initCurrentItemState();
    renderHub();
  }

  function selectDay(val) {
    var d = parseInt(val, 10);
    if (d >= 1 && d <= 30) {
      state.selectedDay = d;
      try { localStorage.setItem('fz_pte_current_day', String(d)); } catch (_) {}
      renderHub();
    }
  }

  function toggleTaskComplete(taskId) {
    var idx = state.completedTaskIds.indexOf(taskId);
    if (idx === -1) {
      state.completedTaskIds.push(taskId);
    } else {
      state.completedTaskIds.splice(idx, 1);
    }
    try { localStorage.setItem('fz_pte_completed_tasks', JSON.stringify(state.completedTaskIds)); } catch (_) {}
    renderHub();
  }

  function launchTask(mode, itemIds) {
    var targetSec = (mode === 'ra' || mode === 'rs' || mode === 'di') ? 'speaking' :
                    (mode === 'wfd') ? 'writing' : 'reading';
    state.section = targetSec;
    state.mode = mode;
    state.itemIndex = 0;
    initCurrentItemState();
    renderHub();
  }

  function openVoiceStudio(day, taskMode, itemId) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fz_persona_id', 'dr_julian');
        localStorage.setItem('fz_target_course', 'en');
        if (taskMode) localStorage.setItem('fz_pte_active_task', taskMode);
      } catch (_) {}
      if (typeof window.go === 'function') {
        window.go('chat');
      } else {
        window.location.href = './call.html?persona=dr_julian&course=en' + (taskMode ? '&task=' + encodeURIComponent(taskMode) : '');
      }
    }
  }

  function toggleTemplate() {
    state.templateOpen = !state.templateOpen;
    renderHub();
  }

  function toggleEssayScaffold() {
    state.templateOpen = !state.templateOpen;
    renderHub();
  }

  function toggleGrammarGuide() {
    state.showGrammarGuide = !state.showGrammarGuide;
    renderHub();
  }

  function updateWfdCount() {
    var ta = document.getElementById('fzPteDictationInput');
    var lbl = document.getElementById('fzPteWordCountLabel');
    if (!ta || !lbl) return;
    var words = ta.value.trim().split(/\s+/).filter(Boolean);
    lbl.textContent = words.length + ' words';
  }

  function updateSwtCount() {
    var ta = document.getElementById('fzPteSwtInput');
    var lbl = document.getElementById('fzPteSwtCountLabel');
    if (!ta || !lbl) return;
    state.swtText = ta.value;
    var words = ta.value.trim().split(/\s+/).filter(Boolean);
    var color = words.length > 75 ? '#ef4444' : (words.length >= 35 && words.length <= 45 ? '#10b981' : '#64748b');
    lbl.innerHTML = '<b style="color:' + color + ';">' + words.length + ' words</b> (Max: 75)';
  }

  function updateEssayCount() {
    var ta = document.getElementById('fzPteEssayInput');
    var lbl = document.getElementById('fzPteEssayCountLabel');
    if (!ta || !lbl) return;
    state.essayText = ta.value;
    var words = ta.value.trim().split(/\s+/).filter(Boolean);
    var pars = ta.value.split(/\n+/).filter(function (p) { return p.trim().length > 0; });
    var color = words.length >= 200 && words.length <= 300 ? '#10b981' : (words.length < 120 || words.length > 380 ? '#ef4444' : '#f59e0b');
    lbl.innerHTML = '<b style="color:' + color + ';">' + words.length + ' words</b> · ' + pars.length + ' paragraphs';
  }

  function updateSstCount() {
    var ta = document.getElementById('fzPteSstInput');
    var lbl = document.getElementById('fzPteSstCountLabel');
    if (!ta || !lbl) return;
    state.sstText = ta.value;
    var words = ta.value.trim().split(/\s+/).filter(Boolean);
    var color = words.length >= 50 && words.length <= 70 ? '#10b981' : '#ef4444';
    lbl.innerHTML = '<b style="color:' + color + ';">' + words.length + ' words</b> (Target: 50-70 words)';
  }

  // --- Neural Voice Pipeline (Wired from Kawan Bicara) ---
  function getChatVoice() {
    if (typeof window !== 'undefined' && window.FiezelChatVoice) return window.FiezelChatVoice;
    if (typeof require === 'function') {
      try { return require('../interactive-chat/fiezel-chat-voice.js'); } catch (_) {}
    }
    return null;
  }

  function playPteAudio(text, options, callback) {
    var cv = getChatVoice();
    var opts = options || {};
    var persona = opts.persona || 'aria';
    stopPteAudio();

    if (!text || !String(text).trim()) {
      if (typeof callback === 'function') callback(false);
      return;
    }

    state.isAudioPlaying = true;
    renderHub();

    if (cv && typeof cv.speak === 'function') {
      cv.speak(String(text).trim(), 'en', {
        persona: persona,
        onSentenceStart: function () {},
        onEnd: function (ok) {
          state.isAudioPlaying = false;
          renderHub();
          if (typeof callback === 'function') callback(ok);
        }
      }).catch(function (err) {
        console.warn('[PTE Audio Prompt Error]', err);
        state.isAudioPlaying = false;
        renderHub();
        if (typeof callback === 'function') callback(false);
      });
    } else {
      // Offline / Test fallback
      setTimeout(function () {
        state.isAudioPlaying = false;
        renderHub();
        if (typeof callback === 'function') callback(true);
      }, 300);
    }
  }

  function stopPteAudio() {
    var cv = getChatVoice();
    if (cv && typeof cv.stop === 'function') {
      try { cv.stop(); } catch (_) {}
    }
    state.isAudioPlaying = false;
  }

  function playAudioPrompt() {
    if (state.isAudioPlaying) {
      stopPteAudio();
      renderHub();
      return;
    }
    var item = getActiveItem();
    if (!item) return;
    var speechText = item.sentence || item.audioTranscript || item.text || '';
    if (!speechText) return;

    var persona = (state.mode === 'wfd' || state.mode === 'sst') ? 'guy' : 'aria';
    playPteAudio(speechText, { persona: persona });
  }

  function playRsAudioAndListen() {
    if (state.isAudioPlaying) {
      stopPteAudio();
      renderHub();
      return;
    }
    var item = getActiveItem();
    if (!item) return;
    var speechText = item.sentence || '';
    if (!speechText) return;

    state.timerState = 'idle';
    state.isAudioPlaying = true;
    renderHub();

    playPteAudio(speechText, { persona: item.persona || 'aria' }, function () {
      if (state.mode !== 'rs') return;
      state.isAudioPlaying = false;
      // Audio playback completed: 1-second preparation buffer before Pearson tone
      state.timerState = 'preparing';
      state.timerRemainingSec = 1;
      state.timerTotalSec = 1;
      renderHub();

      setTimeout(function () {
        if (state.mode !== 'rs') return;
        playPearsonBeep();
        setTimeout(function () {
          if (state.mode !== 'rs') return;
          startRecordingPhase();
        }, 500);
      }, 950);
    });
  }

  // --- Hardware Mic Bridge & Real-Time VAD (Wired from Kawan Bicara) ---
  var pteMicStream = null;
  var pteAudioCtx = null;
  var pteAnalyser = null;
  var pteDataArray = null;
  var pteRafId = null;
  var pteVadSilenceTimer = null;
  var pteHasUserSpoken = false;

  function initPteMicBridge() {
    if (typeof window === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      return Promise.resolve(null);
    }
    if (pteMicStream && pteMicStream.active) {
      return Promise.resolve(pteMicStream);
    }
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    }).then(function (stream) {
      pteMicStream = stream;
      try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          if (!pteAudioCtx || pteAudioCtx.state === 'closed') {
            pteAudioCtx = window.__fiezelSharedAudioContext || new AudioCtx();
            window.__fiezelSharedAudioContext = pteAudioCtx;
          }
          if (pteAudioCtx.state === 'suspended') {
            pteAudioCtx.resume().catch(function () {});
          }
          var srcNode = pteAudioCtx.createMediaStreamSource(stream);
          pteAnalyser = pteAudioCtx.createAnalyser();
          pteAnalyser.fftSize = 256;
          pteAnalyser.smoothingTimeConstant = 0.2;
          srcNode.connect(pteAnalyser);
          pteDataArray = new Uint8Array(pteAnalyser.fftSize);
        }
      } catch (e) {
        console.warn('[PTE MicBridge AudioCtx]', e);
      }
      return stream;
    }).catch(function (err) {
      console.warn('[PTE MicBridge getUserMedia]', err);
      return null;
    });
  }

  function startPteVadLoop() {
    stopPteVadLoop();
    pteHasUserSpoken = false;

    function vadTick() {
      if (state.timerState !== 'recording') return;
      var rms = 0;
      if (pteAnalyser && pteDataArray) {
        pteAnalyser.getByteTimeDomainData(pteDataArray);
        var sum = 0;
        for (var i = 0; i < pteDataArray.length; i++) {
          var val = (pteDataArray[i] - 128) / 128;
          sum += val * val;
        }
        rms = Math.sqrt(sum / pteDataArray.length);
      }

      if (typeof document !== 'undefined') {
        var fillEl = document.getElementById('fzPteMicMeterFill');
        if (fillEl) {
          var pct = Math.min(100, Math.max(0, Math.round(rms * 450)));
          fillEl.style.width = pct + '%';
          if (pct > 15) {
            fillEl.style.backgroundColor = '#10b981';
          } else {
            fillEl.style.backgroundColor = '#94a3b8';
          }
        }
      }

      if (rms > 0.035) {
        pteHasUserSpoken = true;
        disarmSilenceWatchdog();
        if (pteVadSilenceTimer) {
          clearTimeout(pteVadSilenceTimer);
          pteVadSilenceTimer = null;
        }
      } else if (pteHasUserSpoken && (state.speechTranscript || '').trim().length > 0) {
        if (!pteVadSilenceTimer) {
          pteVadSilenceTimer = setTimeout(function () {
            pteVadSilenceTimer = null;
            if (state.timerState === 'recording') {
              stopRecordingAndEvaluate();
            }
          }, 2400);
        }
      }

      if (typeof requestAnimationFrame === 'function') {
        pteRafId = requestAnimationFrame(vadTick);
      }
    }

    if (typeof requestAnimationFrame === 'function') {
      pteRafId = requestAnimationFrame(vadTick);
    }
  }

  function stopPteVadLoop() {
    if (pteRafId) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(pteRafId);
      pteRafId = null;
    }
    if (pteVadSilenceTimer) {
      clearTimeout(pteVadSilenceTimer);
      pteVadSilenceTimer = null;
    }
    if (typeof document !== 'undefined') {
      var fillEl = document.getElementById('fzPteMicMeterFill');
      if (fillEl) fillEl.style.width = '0%';
    }
  }

  function stopPteMicBridge() {
    stopPteVadLoop();
    if (pteMicStream) {
      try {
        var tracks = pteMicStream.getTracks();
        for (var t = 0; t < tracks.length; t++) tracks[t].stop();
      } catch (_) {}
      pteMicStream = null;
    }
  }

  function handleMicAction() {
    if (state.mode === 'rs' && state.timerState === 'idle') {
      playRsAudioAndListen();
      return;
    }
    if (state.timerState === 'idle') {
      var item = getActiveItem();
      var prepSec = (item && item.prepTimeSec) || (state.mode === 'di' ? 25 : 35);
      state.timerState = 'preparing';
      state.timerRemainingSec = prepSec;
      state.timerTotalSec = prepSec;
      state.silenceTriggered = false;
      renderHub();

      clearTimer();
      state.timerInterval = setInterval(function () {
        state.timerRemainingSec--;
        if (state.timerRemainingSec <= 0) {
          clearTimer();
          playPearsonBeep();
          startRecordingPhase();
        } else {
          renderHub();
        }
      }, 1000);
    } else if (state.timerState === 'preparing') {
      clearTimer();
      playPearsonBeep();
      startRecordingPhase();
    } else if (state.timerState === 'recording') {
      stopRecordingAndEvaluate();
    }
  }

  function clearTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function startRecordingPhase() {
    var item = getActiveItem();
    var recSec = (item && item.recordTimeSec) || (state.mode === 'rs' ? 15 : 40);
    state.timerState = 'recording';
    state.timerRemainingSec = recSec;
    state.timerTotalSec = recSec;
    state.speechStartTime = Date.now();
    state.speechTranscript = '';
    state.silenceTriggered = false;
    state.pausesCount = 0;
    state.speechConfidence = 0.85;

    armSilenceWatchdog();
    initPteMicBridge().then(function () {
      startPteVadLoop();
    });

    if (typeof window !== 'undefined' && (window.webkitSpeechRecognition || window.SpeechRecognition)) {
      try {
        var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.speechRecognizer = new SpeechRec();
        state.speechRecognizer.continuous = true;
        state.speechRecognizer.interimResults = true;
        state.speechRecognizer.lang = 'en-US';

        var lastResultTimestamp = Date.now();
        state.speechRecognizer.onresult = function (event) {
          disarmSilenceWatchdog();
          var now = Date.now();
          if (now - lastResultTimestamp > 1800 && (state.speechTranscript || '').trim().length > 0) {
            state.pausesCount = (state.pausesCount || 0) + 1;
          }
          lastResultTimestamp = now;

          var final = '';
          var interim = '';
          var confSum = 0;
          var confCount = 0;
          for (var i = 0; i < event.results.length; ++i) {
            var r0 = event.results[i][0];
            if (r0) {
              if (typeof r0.confidence === 'number' && r0.confidence > 0) {
                confSum += r0.confidence;
                confCount++;
              }
              if (event.results[i].isFinal) {
                final += r0.transcript + ' ';
              } else {
                interim += r0.transcript;
              }
            }
          }
          if (confCount > 0) {
            state.speechConfidence = confSum / confCount;
          }
          state.speechTranscript = (final + interim).trim();
          var liveEl = document.getElementById('fzPteLiveSpeechText');
          if (liveEl) {
            liveEl.textContent = state.speechTranscript || 'Listening...';
          }
        };

        state.speechRecognizer.onerror = function (event) {
          console.warn('[PTE Speech recognition error]', event.error);
        };

        state.speechRecognizer.start();
      } catch (err) {
        console.warn('[PTE Speech init error]', err);
      }
    }

    renderHub();

    clearTimer();
    state.timerInterval = setInterval(function () {
      state.timerRemainingSec--;
      if (state.timerRemainingSec <= 0) {
        clearTimer();
        stopRecordingAndEvaluate();
      } else {
        renderHub();
      }
    }, 1000);
  }

  function stopRecordingAndEvaluate() {
    disarmSilenceWatchdog();
    stopPteVadLoop();
    clearTimer();
    state.timerState = 'completed';

    if (state.speechRecognizer) {
      try { state.speechRecognizer.stop(); } catch (_) {}
      state.speechRecognizer = null;
    }

    var dur = (Date.now() - state.speechStartTime) / 1000;
    var transcript = (state.speechTranscript || '').trim();

    evaluateSpeechResult(transcript, dur);
  }

  function evaluateSpeechResult(transcript, durationSec) {
    var engine = getEngine();
    if (!engine) return;
    var item = getActiveItem();
    if (!item) return;

    var isEmpty = !transcript || !transcript.trim();
    var metrics = {
      durationSec: Math.max(1, durationSec || 1),
      confidenceAvg: isEmpty ? 0 : state.speechConfidence,
      pausesCount: state.pausesCount || 0
    };

    var res = null;
    if (state.mode === 'ra') {
      res = engine.evaluateReadAloud(item.text, transcript, metrics);
    } else if (state.mode === 'rs') {
      res = engine.evaluateRepeatSentence(item.sentence, transcript, metrics);
    } else if (state.mode === 'di') {
      res = engine.evaluateDescribeImage(item, transcript, metrics);
    } else if (state.mode === 'rl') {
      res = engine.evaluateRetellLecture(item, transcript, metrics);
    }

    if (res) {
      res.studentTranscript = transcript;
      res.durationSec = Math.round(durationSec * 10) / 10;
      if (isEmpty) {
        res.noSpeechDetected = true;
        res.pearsonScore = 10;
        res.passed = false;
        if (res.content) res.content.score = 0;
        if (res.fluency) res.fluency.score = 0;
        if (res.pronunciation) res.pronunciation.score = 0;
      }
      state.lastResult = res;
      state.timerState = 'result';
      reportBraincoreTelemetry(item.id, res.pearsonScore ? res.pearsonScore >= 42 : res.passed, Math.round(durationSec * 1000));
      updateLearnerEstimate(res.pearsonScore || Math.round((res.score / res.maxScore) * 90));
      renderHub();
    }
  }

  function toggleManualSpeechInput() {
    state.showManualSpeechInput = !state.showManualSpeechInput;
    renderHub();
  }

  function setManualSpeech(val) {
    state.speechTranscript = val;
  }

  function evaluateManualSpeech() {
    var ta = document.getElementById('fzPteManualSpeechInput');
    var text = (ta ? ta.value : (state.speechTranscript || '')).trim();
    if (!text) return;
    state.speechTranscript = text;
    var wordCount = text.split(/\s+/).filter(Boolean).length;
    var estimatedDuration = Math.max(3, Math.round(wordCount / 2.5));
    state.speechConfidence = 0.92;
    evaluateSpeechResult(text, estimatedDuration);
  }

  // Reading & Writing Handlers
  function selectRwFibOption(blankId, val) {
    state.rwFibSelections[blankId] = val;
  }

  function checkRwFib() {
    var engine = getEngine();
    var item = getActiveItem();
    if (!engine || !item) return;

    var evalRes = engine.evaluateReadingFib(item, state.rwFibSelections);
    state.activeDeepFeedback = {
      items: evalRes.blankResults.map(function (b) {
        return {
          id: b.id,
          correct: b.correct,
          isCorrect: b.isCorrect,
          feedback: b.deepFeedback
        };
      })
    };
    reportBraincoreTelemetry(item.id, evalRes.passed, 15000);
    renderHub();
  }

  function assignDdWord(word) {
    var item = getActiveItem();
    if (!item) return;
    var keys = Object.keys(item.correctAnswers || {});
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (!state.rDdAssignments[k]) {
        state.rDdAssignments[k] = word;
        var pIdx = state.rDdWordPool.indexOf(word);
        if (pIdx !== -1) state.rDdWordPool.splice(pIdx, 1);
        break;
      }
    }
    renderHub();
  }

  function clearDdBlank(k) {
    var existing = state.rDdAssignments[k];
    if (existing) {
      delete state.rDdAssignments[k];
      state.rDdWordPool.push(existing);
      renderHub();
    }
  }

  function checkReadingDd() {
    var engine = getEngine();
    var item = getActiveItem();
    if (!engine || !item) return;

    var evalRes = engine.evaluateReadingDragDrop(item, state.rDdAssignments);
    var keys = Object.keys(item.correctAnswers || {});
    state.activeDeepFeedback = {
      items: keys.map(function (k) {
        var r = evalRes.results[k] || {};
        return {
          id: k,
          correct: r.expected,
          isCorrect: r.isCorrect,
          feedback: r.feedback
        };
      })
    };
    reportBraincoreTelemetry(item.id, evalRes.passed, 15000);
    renderHub();
  }

  function moveRoParagraph(idx, delta) {
    var targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= state.roOrder.length) return;
    var temp = state.roOrder[idx];
    state.roOrder[idx] = state.roOrder[targetIdx];
    state.roOrder[targetIdx] = temp;
    renderHub();
  }

  function checkReorder() {
    var engine = getEngine();
    var item = getActiveItem();
    if (!engine || !item) return;

    var evalRes = engine.evaluateReorderParagraphs(item, state.roOrder);
    state.activeDeepFeedback = {
      reorderClues: item.deepFeedback
    };
    reportBraincoreTelemetry(item.id, evalRes.passed, 20000);
    renderHub();
  }

  function checkSwt() {
    var engine = getEngine();
    var item = getActiveItem();
    if (!engine || !item) return;

    var ta = document.getElementById('fzPteSwtInput');
    var text = ta ? ta.value : state.swtText;
    var evalRes = engine.evaluateSummarizeWrittenText(item, text);

    state.activeDeepFeedback = {
      generalFeedback: evalRes.feedback,
      modelSummary: evalRes.modelSummary
    };
    reportBraincoreTelemetry(item.id, evalRes.passed, 30000);
    renderHub();
  }

  function checkEssay() {
    var engine = getEngine();
    var item = getActiveItem();
    if (!engine || !item) return;

    var ta = document.getElementById('fzPteEssayInput');
    var text = ta ? ta.value : state.essayText;
    var evalRes = engine.evaluateWriteEssay(item, text);

    state.activeDeepFeedback = {
      generalFeedback: evalRes.feedback,
      modelSummary: item.nakulScaffold
    };
    reportBraincoreTelemetry(item.id, evalRes.passed, 60000);
    renderHub();
  }

  function checkSst() {
    var engine = getEngine();
    var item = getActiveItem();
    if (!engine || !item) return;

    var ta = document.getElementById('fzPteSstInput');
    var text = ta ? ta.value : state.sstText;
    var evalRes = engine.evaluateSummarizeSpokenText(item, text);

    state.activeDeepFeedback = {
      generalFeedback: evalRes.feedback,
      modelSummary: evalRes.modelSummary
    };
    reportBraincoreTelemetry(item.id, evalRes.passed, 30000);
    renderHub();
  }

  function setLfAnswer(blankId, val) {
    state.lfAnswers[blankId] = val;
  }

  function checkListeningFib() {
    var engine = getEngine();
    var item = getActiveItem();
    if (!engine || !item) return;

    var evalRes = engine.evaluateListeningFib(item, state.lfAnswers);
    state.activeDeepFeedback = {
      items: evalRes.blankResults.map(function (b) {
        return {
          id: b.id,
          correct: b.correct,
          isCorrect: b.isCorrect,
          spellingTip: b.spellingTip
        };
      })
    };
    reportBraincoreTelemetry(item.id, evalRes.passed, 15000);
    renderHub();
  }

  function toggleHiwWord(tokenIndex) {
    var pos = state.hiwSelectedIndices.indexOf(tokenIndex);
    if (pos === -1) {
      state.hiwSelectedIndices.push(tokenIndex);
    } else {
      state.hiwSelectedIndices.splice(pos, 1);
    }
    renderHub();
  }

  function checkHiw() {
    var engine = getEngine();
    var item = getActiveItem();
    if (!engine || !item) return;

    var evalRes = engine.evaluateHighlightIncorrectWords(item, state.hiwSelectedIndices);
    var errLines = [];
    evalRes.incorrectWords.forEach(function (err) {
      errLines.push('Spoken: "' + err.spoken + '" ➔ Displayed: "' + err.displayed + '"');
    });

    state.activeDeepFeedback = {
      generalFeedback: [
        'Correct Error Clicks: ' + evalRes.correctClicks + ' (+1 point each)',
        'False Alarms / Wrong Clicks: ' + evalRes.falseAlarms + ' (-1 point penalty each)',
        'Net Pearson Points: ' + evalRes.netScore + ' / ' + evalRes.maxScore
      ].concat(errLines)
    };
    reportBraincoreTelemetry(item.id, evalRes.passed, 20000);
    renderHub();
  }

  function submitWfd() {
    var engine = getEngine();
    if (!engine) return;
    var item = getActiveItem();
    if (!item) return;

    var ta = document.getElementById('fzPteDictationInput');
    var typed = ta ? ta.value : '';
    state.wfdText = typed;

    var res = engine.evaluateWriteFromDictation(item.sentence, typed, item.spellingChallenges);
    res.studentAnswer = typed;
    state.lastResult = res;
    state.timerState = 'result';
    reportBraincoreTelemetry(item.id, res.isTarget42Qualified, 8000, res.spellingMisconceptions);
    updateLearnerEstimate(res.pearsonScore);
    renderHub();
  }

  /**
   * Pipeline telemetry to Braincore.
   */
  function reportBraincoreTelemetry(itemId, isSuccess, durationMs, misconceptions) {
    if (typeof window === 'undefined') return;

    if (typeof window.__getFiezelState === 'function') {
      try {
        var rootState = window.__getFiezelState();
        if (rootState && !rootState.pte) rootState.pte = {};
      } catch (_) {}
    }

    if (typeof window.updateMastery === 'function') {
      try {
        window.updateMastery('pte', itemId, isSuccess, durationMs || 6000);
      } catch (e) {
        console.warn('[PTE updateMastery telemetry]', e);
      }
    }

    if (typeof window.bktRecord === 'function') {
      try {
        window.bktRecord({ id: itemId, skill: 'pte_' + state.mode }, isSuccess, 1.2);
      } catch (e) {
        console.warn('[PTE bktRecord telemetry]', e);
      }
    }

    if (Array.isArray(misconceptions) && misconceptions.length > 0 && typeof window.misconceptionLedgerRecord === 'function') {
      try {
        misconceptions.forEach(function (m) {
          window.misconceptionLedgerRecord('pte_session', { id: itemId, prompt: m.targetWord }, m, false);
        });
      } catch (e) {
        console.warn('[PTE misconception telemetry]', e);
      }
    }
  }

  function updateLearnerEstimate(latestScore) {
    var alpha = 0.25;
    state.overallEstimate = Math.round(state.overallEstimate * (1 - alpha) + latestScore * alpha);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fz_pte_estimate', String(state.overallEstimate));
      }
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    function autoTriggerPteFromUrl() {
      try {
        var sp = new URLSearchParams(window.location.search);
        var hash = window.location.hash;
        if (sp.has('pte') || hash === '#pte' || sp.get('view') === 'pte') {
          if (typeof window.go === 'function') {
            window.go('pte');
          } else {
            var appEl = document.getElementById('app');
            if (appEl) {
              mount(appEl);
            } else {
              setTimeout(autoTriggerPteFromUrl, 100);
            }
          }
        }
      } catch (_) {}
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoTriggerPteFromUrl);
    } else {
      setTimeout(autoTriggerPteFromUrl, 200);
    }
  }

  return {
    mount: mount,
    switchSection: switchSection,
    switchMode: switchMode,
    nextItem: nextItem,
    prevItem: prevItem,
    retryItem: retryItem,
    selectDay: selectDay,
    toggleTaskComplete: toggleTaskComplete,
    launchTask: launchTask,
    openVoiceStudio: openVoiceStudio,
    toggleTemplate: toggleTemplate,
    toggleEssayScaffold: toggleEssayScaffold,
    updateWfdCount: updateWfdCount,
    updateSwtCount: updateSwtCount,
    updateEssayCount: updateEssayCount,
    updateSstCount: updateSstCount,
    playPteAudio: playPteAudio,
    stopPteAudio: stopPteAudio,
    playAudioPrompt: playAudioPrompt,
    playRsAudioAndListen: playRsAudioAndListen,
    handleMicAction: handleMicAction,
    toggleGrammarGuide: toggleGrammarGuide,
    submitWfd: submitWfd,
    selectRwFibOption: selectRwFibOption,
    checkRwFib: checkRwFib,
    assignDdWord: assignDdWord,
    clearDdBlank: clearDdBlank,
    checkReadingDd: checkReadingDd,
    moveRoParagraph: moveRoParagraph,
    checkReorder: checkReorder,
    checkSwt: checkSwt,
    checkEssay: checkEssay,
    checkSst: checkSst,
    setLfAnswer: setLfAnswer,
    checkListeningFib: checkListeningFib,
    toggleHiwWord: toggleHiwWord,
    checkHiw: checkHiw,
    toggleManualSpeechInput: toggleManualSpeechInput,
    setManualSpeech: setManualSpeech,
    evaluateManualSpeech: evaluateManualSpeech,
    renderGuidedCoachCard: renderGuidedCoachCard,
    getState: function () { return state; },
    getBanks: function () { return BANKS; }
  };
});
