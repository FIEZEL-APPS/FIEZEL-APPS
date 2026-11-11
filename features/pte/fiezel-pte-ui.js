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
    lfAnswers: {},
    hiwSelectedIndices: [],
    activeDeepFeedback: null
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
    state.silenceWatchdogTimer = setTimeout(function () {
      if (state.timerState === 'recording' && (!state.speechTranscript || !state.speechTranscript.trim())) {
        console.log('[PTE Official 3-Second Silence Rule Triggered: Recording Completed]');
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

  /**
   * Render the complete Hub DOM.
   */
  function renderHub(containerEl) {
    var el = containerEl || (typeof document !== 'undefined' ? document.getElementById('app') : null);
    if (!el) return;

    var out = ['<section class="fz-pte-hub fade">'];

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

    // 2. Section Selector Tabs (Level 1)
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
      out.push('    <button type="button" class="fz-pte-section-tab' + act + '" onclick="FiezelPteUi.switchSection(\' + s.id + \')">' + s.label + '</button>');
    });
    out.push('  </div>');

    // 3. Section Content
    if (state.section === 'plan') {
      if (BANKS.roadmap) {
        out.push(renderGuidedCoachCard(BANKS.roadmap));
      } else {
        out.push('  <div class="card" style="padding:20px; text-align:center;"><p>Loading 30-Day Guided Plan...</p></div>');
      }
    } else {
      // Level 2: Task Selector Pills
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
      out.push('    <button type="button" class="fz-pte-tab-btn' + act + '" onclick="FiezelPteUi.switchMode(\' + t.id + \')">');
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
    out.push('        <h3 class="fz-pte-daily-title">Day ' + dayData.day + ': ' + esc(dayData.title) + '</h3>');
    out.push('        <div class="fz-pte-daily-focus">Focus: <b>' + esc(dayData.focus) + '</b> (' + dayData.targetMinutes + ' min target)</div>');
    out.push('      </div>');

    // Day Selector Carousel
    out.push('      <div class="fz-pte-day-picker">');
    out.push('        <label for="fzPteDaySelect" style="font-size:0.75rem; font-weight:700; color:#475569;">Select Day:</label>');
    out.push('        <select id="fzPteDaySelect" class="fz-pte-select" onchange="FiezelPteUi.selectDay(this.value)">');
    for (var d = 1; d <= (rm.totalDays || 30); d++) {
      var sel = d === currentDay ? ' selected' : '';
      out.push('          <option value="' + d + '"' + sel + '>Day ' + d + '</option>');
    }
    out.push('        </select>');
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
      out.push('          <button type="button" class="fz-pte-checkbox-btn' + checkClass + '" onclick="FiezelPteUi.toggleTaskComplete(\' + esc(t.id) + \')">' + (isChecked ? '✓' : '') + '</button>');
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
    out.push('      <div style="font-size:0.8rem; font-weight:800; color:#64748b;">No. ' + (state.itemIndex + 1) + ' / ' + (BANKS[state.mode] || []).length + '</div>');
    out.push('    </div>');

    // Official Pearson Status Box (Timer/Recording for audio modes)
    if (['ra', 'rs', 'di', 'rl'].indexOf(state.mode) !== -1) {
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
        statusVal = 'Recording...';
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
      out.push('    <div class="fz-pte-audio-player-box">');
      out.push('      <button type="button" class="fz-pte-play-btn" onclick="FiezelPteUi.playAudioPrompt()">' + (state.isAudioPlaying ? '■' : '▶') + '</button>');
      out.push('      <div class="fz-pte-audio-waveform">');
      for (var w = 0; w < 16; w++) {
        var hClass = state.isAudioPlaying ? ' active' : '';
        out.push('        <div class="fz-pte-wave-bar' + hClass + '" style="animation-delay:' + (w * 0.05) + 's;"></div>');
      }
      out.push('      </div>');
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
      out.push('      <div class="fz-pte-audio-waveform">');
      for (var w2 = 0; w2 < 16; w2++) {
        var hClass2 = state.isAudioPlaying ? ' active' : '';
        out.push('        <div class="fz-pte-wave-bar' + hClass2 + '" style="animation-delay:' + (w2 * 0.05) + 's;"></div>');
      }
      out.push('      </div>');
      out.push('    </div>');
      out.push('    <div>');
      out.push('      <textarea id="fzPteDictationInput" class="fz-pte-dictation-editor" placeholder="Type the sentence you hear here (check keyword spelling)..." oninput="FiezelPteUi.updateWfdCount()"></textarea>');
      out.push('      <div class="fz-pte-dictation-stats">');
      out.push('        <span id="fzPteWordCountLabel">0 words</span>');
      out.push('        <span>1 point for each correct word</span>');
      out.push('      </div>');
      out.push('      <div style="font-size:0.78rem; color:#64748b; margin-top:4px; line-height:1.4;">💡 <b>Nakul Extra Words Hack:</b> Unsure of singular or plural? Write both (e.g. <code>student students</code>). Pearson AI does not penalize extra words!</div>');
      out.push('    </div>');
    } else if (state.mode === 'rwFib') {
      out.push('    <div class="fz-pte-prompt-box">');
      out.push('      <div class="fz-pte-reading-passage">' + renderRwFibPassage(item) + '</div>');
      out.push('    </div>');
    } else if (state.mode === 'rDd') {
      out.push('    <div class="fz-pte-prompt-box">');
      out.push('      <div class="fz-pte-reading-passage">' + renderReadingDdPassage(item) + '</div>');
      out.push('    </div>');
      out.push('    <div class="fz-pte-word-pool-wrap">');
      out.push('      <div style="font-size:0.8rem; font-weight:800; color:#475569; margin-bottom:6px;">Word Pool (Click to assign):</div>');
      out.push('      <div class="fz-pte-word-pool">');
      state.rDdWordPool.forEach(function (word) {
        out.push('        <button type="button" class="fz-pte-pool-chip" onclick="FiezelPteUi.assignDdWord(\' + esc(word) + \')">' + esc(word) + '</button>');
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
      var recBtnLabel = isRec ? '■ Finish Speaking (Submit)' : (state.timerState === 'preparing' ? '▶ Record Now' : '● Start Preparation');
      out.push('      <button type="button" class="fz-pte-btn-primary' + recBtnClass + '" onclick="FiezelPteUi.handleMicAction()">' + esc(recBtnLabel) + '</button>');
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
    blanks.forEach(function (b) {
      var chosen = state.rwFibSelections[b.id] || '';
      var selHtml = '<select class="fz-pte-fib-select" onchange="FiezelPteUi.selectRwFibOption(' + b.id + ', this.value)">';
      selHtml += '<option value="">-- select --</option>';
      (b.options || []).forEach(function (opt) {
        var isSel = chosen === opt ? ' selected' : '';
        selHtml += '<option value="' + esc(opt) + '"' + isSel + '>' + esc(opt) + '</option>';
      });
      selHtml += '</select>';
      text = text.replace('{' + b.id + '}', selHtml);
    });
    return text;
  }

  function renderReadingDdPassage(item) {
    var text = item.text || '';
    var keys = Object.keys(item.correctAnswers || {});
    keys.forEach(function (k, idx) {
      var assigned = state.rDdAssignments[k] || '';
      var slotHtml = '<span class="fz-pte-drop-slot' + (assigned ? ' filled' : '') + '" onclick="FiezelPteUi.clearDdBlank(\' + esc(k) + \')">' + (assigned ? esc(assigned) : '[' + (idx + 1) + ']') + '</span>';
      text = text.replace('{' + k + '}', slotHtml);
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
    (item.blanks || []).forEach(function (b) {
      var typed = state.lfAnswers[b.id] || '';
      var inputHtml = '<input type="text" class="fz-pte-lf-input" value="' + esc(typed) + '" oninput="FiezelPteUi.setLfAnswer(' + b.id + ', this.value)" placeholder="(' + b.id + ')">';
      text = text.replace('{' + b.id + '}', inputHtml);
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
    out.push('    <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">');
    out.push('      <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#0f172a;">Evaluation Results: ' + esc(res.task || state.mode.toUpperCase()) + '</h3>');
    out.push('      <span class="fz-pte-target-badge" style="background:#0284c7; color:#fff;">TARGET 42</span>');
    out.push('    </div>');

    var pScore = typeof res.pearsonScore === 'number' ? res.pearsonScore : Math.round((res.score / (res.maxScore || 1)) * 90);
    var pass = pScore >= 42;
    var circleClass = pass ? ' passed' : '';
    out.push('    <div class="fz-pte-score-circle-row">');
    out.push('      <div class="fz-pte-score-circle' + circleClass + '">');
    out.push('        <span class="fz-pte-score-num">' + pScore + '</span>');
    out.push('        <span class="fz-pte-score-scale">Pearson / 90</span>');
    out.push('      </div>');
    out.push('      <div>');
    var verdictLabel = pass ? '✓ Meets Australian Visa Benchmark (PTE 42+)' : '▲ Below Target 42 Benchmark';
    out.push('        <div style="font-weight:800; font-size:1.05rem; color:' + (pass ? '#10b981' : '#f59e0b') + ';">' + esc(verdictLabel) + '</div>');
    out.push('        <div style="font-size:0.84rem; color:#64748b; margin-top:4px;">Score: ' + res.score + ' / ' + res.maxScore + ' points (' + (res.percentage || Math.round((res.score / res.maxScore) * 100)) + '%)</div>');
    out.push('      </div>');
    out.push('    </div>');

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

  function playAudioPrompt() {
    var item = getActiveItem();
    if (!item) return;
    var speechText = item.sentence || item.audioTranscript || item.text || '';
    if (!speechText) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        state.isAudioPlaying = false;
        renderHub();
        return;
      }

      var utter = new SpeechSynthesisUtterance(speechText);
      utter.lang = 'en-US';
      utter.rate = 0.95;
      utter.onstart = function () {
        state.isAudioPlaying = true;
        renderHub();
      };
      utter.onend = function () {
        state.isAudioPlaying = false;
        renderHub();
      };
      utter.onerror = function () {
        state.isAudioPlaying = false;
        renderHub();
      };
      window.speechSynthesis.speak(utter);
    }
  }

  function handleMicAction() {
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
    var recSec = (item && item.recordTimeSec) || 40;
    state.timerState = 'recording';
    state.timerRemainingSec = recSec;
    state.timerTotalSec = recSec;
    state.speechStartTime = Date.now();
    state.speechTranscript = '';
    state.silenceTriggered = false;

    armSilenceWatchdog();

    if (typeof window !== 'undefined' && (window.webkitSpeechRecognition || window.SpeechRecognition)) {
      try {
        var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.speechRecognizer = new SpeechRec();
        state.speechRecognizer.continuous = true;
        state.speechRecognizer.interimResults = true;
        state.speechRecognizer.lang = 'en-US';

        state.speechRecognizer.onresult = function (event) {
          disarmSilenceWatchdog();
          var transcript = '';
          for (var i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          state.speechTranscript = transcript;
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
    clearTimer();
    state.timerState = 'completed';

    if (state.speechRecognizer) {
      try { state.speechRecognizer.stop(); } catch (_) {}
      state.speechRecognizer = null;
    }

    var dur = (Date.now() - state.speechStartTime) / 1000;
    var transcript = state.speechTranscript || '';
    var item = getActiveItem();
    if (!transcript.trim() && item) {
      transcript = item.sampleResponse || item.text || item.sentence || item.nakulTemplateSpeech || '';
    }

    evaluateSpeechResult(transcript, dur);
  }

  function evaluateSpeechResult(transcript, durationSec) {
    var engine = getEngine();
    if (!engine) return;
    var item = getActiveItem();
    if (!item) return;

    var metrics = {
      durationSec: Math.max(2, durationSec || 25),
      confidenceAvg: state.speechConfidence,
      pausesCount: 0
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
      state.lastResult = res;
      state.timerState = 'result';
      reportBraincoreTelemetry(item.id, res.pearsonScore ? res.pearsonScore >= 42 : res.passed, Math.round(durationSec * 1000));
      updateLearnerEstimate(res.pearsonScore || Math.round((res.score / res.maxScore) * 90));
      renderHub();
    }
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

    var res = engine.evaluateWriteFromDictation(item.sentence, typed, item.spellingChallenges);
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
    playAudioPrompt: playAudioPrompt,
    handleMicAction: handleMicAction,
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
    renderGuidedCoachCard: renderGuidedCoachCard,
    getState: function () { return state; },
    getBanks: function () { return BANKS; }
  };
});
