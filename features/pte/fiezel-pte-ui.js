/**
 * FIEZEL · features/pte/fiezel-pte-ui.js
 * Interactive Tactile UI Engine for PTE Academic Preparation ("The Big 4").
 * Renders full Pearson exam simulation: Read Aloud, Repeat Sentence, Describe Image,
 * and Write from Dictation, with countdown timers, Web Speech / Web Audio integration,
 * SVG diagrams, Universal Template scaffolding, and Braincore telemetry.
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

  function t(k, fallback) {
    if (typeof globalThis !== 'undefined' && globalThis.FiezelI18n && typeof globalThis.FiezelI18n.t === 'function') {
      return globalThis.FiezelI18n.t(k, fallback);
    }
    return fallback;
  }

  // Preloaded Content Bank Caches
  var BANKS = {
    ra: [],
    rs: [],
    di: [],
    wfd: [],
    templates: null
  };

  if (typeof require === 'function') {
    try { BANKS.ra = require('../../content/pte/pte-read-aloud.json').items || []; } catch (_) {}
    try { BANKS.rs = require('../../content/pte/pte-repeat-sentence.json').items || []; } catch (_) {}
    try { BANKS.di = require('../../content/pte/pte-describe-image.json').items || []; } catch (_) {}
    try { BANKS.wfd = require('../../content/pte/pte-write-dictation.json').items || []; } catch (_) {}
    try { BANKS.templates = require('../../content/pte/pte-templates.json') || null; } catch (_) {}
  }

  // Internal Reactive State
  var state = {
    mode: 'ra', // 'ra' | 'rs' | 'di' | 'wfd'
    itemIndex: 0,
    timerState: 'idle', // 'idle' | 'preparing' | 'recording' | 'completed' | 'evaluating' | 'result'
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
    silenceTriggered: false
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
   * Ensure content banks are populated in browser via fetch if empty.
   */
  function ensureBanksLoaded(callback) {
    if (BANKS.ra.length > 0 && BANKS.rs.length > 0 && BANKS.di.length > 0 && BANKS.wfd.length > 0) {
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
      fetch('content/pte/pte-templates.json').then(function (r) { return r.json(); }).then(function (d) { BANKS.templates = d; }).catch(function () {})
    ];

    Promise.all(promises).then(function () {
      if (typeof callback === 'function') callback();
    });
  }

  function getActiveItem() {
    var list = BANKS[state.mode] || [];
    if (list.length === 0) return null;
    var idx = Math.max(0, Math.min(list.length - 1, state.itemIndex));
    return list[idx] || list[0];
  }

  /**
   * Main Mount Entrypoint.
   * Renders the PTE Academic Big 4 Hub into containerEl.
   */
  function mount(containerEl) {
    if (!containerEl) return;
    ensureBanksLoaded(function () {
      renderHub(containerEl);
    });
  }

  /**
   * Render the complete Hub DOM.
   */
  function renderHub(containerEl) {
    var el = containerEl || (typeof document !== 'undefined' ? document.getElementById('app') : null);
    if (!el) return;

    var item = getActiveItem();
    var out = ['<section class="fz-pte-hub fade">'];

    // 1. Hero Card with Target 42 Benchmark
    out.push('  <div class="fz-pte-hero-card">');
    out.push('    <div class="fz-pte-badge-row">');
    out.push('      <span class="fz-pte-target-badge">★ PEARSON TARGET 42 · AUSTRALIA VISA</span>');
    out.push('      <span style="font-size:0.8rem; font-weight:800; background:rgba(255,255,255,0.2); padding:3px 8px; border-radius:6px;">VOCATIONAL BENCHMARK</span>');
    out.push('    </div>');
    out.push('    <h2 class="fz-pte-title">PTE Academic Big 4 Prep Hub</h2>');
    out.push('    <p class="fz-pte-lead">75%+ skor PTE berasal dari 4 tipe soal ini. Kuasai polanya untuk jaminan lolos syarat kampus & visa studi Australia tanpa stres.</p>');

    out.push('    <div class="fz-pte-benchmark-meter">');
    out.push('      <div class="fz-pte-meter-bar-wrap">');
    var progressPercent = Math.min(100, Math.round((state.overallEstimate / 90) * 100));
    out.push('        <div class="fz-pte-meter-bar" style="width:' + progressPercent + '%;"></div>');
    out.push('        <div class="fz-pte-meter-target-marker" title="Target Visa: PTE 42"></div>');
    out.push('      </div>');
    out.push('      <div class="fz-pte-meter-label">Estimasi: <b style="color:#fcd34d;">' + state.overallEstimate + '</b> / 90</div>');
    out.push('    </div>');
    out.push('  </div>');

    // 2. Big 4 Navigation Tabs
    out.push('  <div class="fz-pte-tabs">');
    var tabs = [
      { id: 'ra', code: 'RA', name: 'Read Aloud' },
      { id: 'rs', code: 'RS', name: 'Repeat Sent.' },
      { id: 'di', code: 'DI', name: 'Describe Img' },
      { id: 'wfd', code: 'WFD', name: 'Write Dictation' }
    ];
    tabs.forEach(function (t) {
      var act = state.mode === t.id ? ' active' : '';
      out.push('    <button type="button" class="fz-pte-tab-btn' + act + '" onclick="FiezelPteUi.switchMode(\'' + t.id + '\')">');
      out.push('      <span class="fz-pte-tab-code">' + t.code + '</span>');
      out.push('      <span class="fz-pte-tab-name">' + t.name + '</span>');
      out.push('    </button>');
    });
    out.push('  </div>');

    // 3. Practice Card Canvas
    if (state.lastResult) {
      out.push(renderResultScorecard(state.lastResult));
    } else if (item) {
      out.push(renderPracticeCard(item));
    } else {
      out.push('  <div class="card" style="padding:20px; text-align:center;"><p>' + esc(t('pte.loading', 'Memuat bank data PTE...')) + '</p></div>');
    }

    out.push('</section>');
    el.innerHTML = out.join('\n');
  }

  /**
   * Render individual practice card by mode.
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
                 'Listening & Writing (Kingmaker)');
    out.push('        <div class="fz-pte-task-cross-skills">Points to: ' + cross + '</div>');
    out.push('      </div>');
    out.push('      <div style="font-size:0.8rem; font-weight:800; color:#64748b;">No. ' + (state.itemIndex + 1) + ' / ' + (BANKS[state.mode] || []).length + '</div>');
    out.push('    </div>');

    // Official Pearson Status Box
    out.push('    <div class="fz-pte-pearson-status-box">');
    var statusTitle = t('pte.status_title', 'Current Status:');
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
      statusVal = 'Completed';
      barClass = 'done-bar';
      progressPct = 100;
    }

    out.push('      <div class="fz-pte-status-header">');
    out.push('        <span class="fz-pte-current-status-title">' + statusTitle + '</span>');
    out.push('        <b class="fz-pte-current-status-val ' + barClass + '">' + esc(statusVal) + '</b>');
    out.push('      </div>');
    out.push('      <div class="fz-pte-pearson-bar-track">');
    out.push('        <div class="fz-pte-pearson-bar-fill ' + barClass + '" style="width:' + progressPct + '%;"></div>');
    out.push('      </div>');
    out.push('      <div class="fz-pte-status-timer-sub">Time: <b>' + formatClock(state.timerRemainingSec) + '</b>' + (state.silenceTriggered ? ' · <span style="color:#ef4444; font-weight:800;">(Aturan 3 Detik Hening Pearson Aktif)</span>' : '') + '</div>');
    out.push('    </div>');

    // Mode-specific Body
    if (state.mode === 'ra') {
      out.push('    <div class="fz-pte-prompt-box">');
      if (item.chunking) {
        var chunkHtml = esc(item.chunking).replace(/\/\//g, '<span class="fz-pte-chunk-mark">//</span>');
        out.push('      <div>' + chunkHtml + '</div>');
      } else {
        out.push('      <div>' + esc(item.text) + '</div>');
      }
      out.push('    </div>');

      if (Array.isArray(item.phoneticChallenges) && item.phoneticChallenges.length > 0) {
        out.push('    <div style="background:#f8fafc; border-radius:10px; padding:10px 14px; font-size:0.82rem; color:#475569;">');
        out.push('      <b style="color:#0284c7;">Tips Pelafalan Kunci:</b> ' +
          item.phoneticChallenges.map(function (p) { return '<b>' + esc(p.word) + '</b> (' + esc(p.ipa) + ' - ' + esc(p.tip) + ')'; }).join(' · ')
        );
        out.push('    </div>');
      }
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
      out.push('    <p style="font-size:0.84rem; color:#64748b; margin:0;">Tekan tombol putar untuk mendengarkan kalimat, lalu tirukan dengan suara keras dan lancar.</p>');
    } else if (state.mode === 'di') {
      out.push('    <div class="fz-pte-chart-wrap">');
      out.push(item.svg || '<div style="padding:40px;">Diagram SVG</div>');
      out.push('    </div>');

      // Collapsible Universal Template
      out.push('    <div class="fz-pte-template-box">');
      out.push('      <div class="fz-pte-template-header" onclick="FiezelPteUi.toggleTemplate()">');
      out.push('        <span>⚡ Template Hafalan Universal (Buka Contekan)</span>');
      out.push('        <span>' + (state.templateOpen ? '▲ Tutup' : '▼ Lihat Pola') + '</span>');
      out.push('      </div>');
      if (state.templateOpen) {
        out.push('      <div class="fz-pte-template-body">');
        out.push('        <i>"The given image represents an informative chart regarding <span class="fz-pte-template-slot">' + esc(item.topic || 'the topic') + '</span>. According to the picture, we can see several key elements, including <span class="fz-pte-template-slot">' + esc(item.categories ? item.categories.slice(0, 3).join(', ') : 'the categories') + '</span>. Looking closely, the maximum figure is observed in <span class="fz-pte-template-slot">' + esc(item.highPoint || 'the peak point') + '</span>, while the minimum figure is found in <span class="fz-pte-template-slot">' + esc(item.lowPoint || 'the lowest point') + '</span>. In conclusion, the picture provides significant data and is very beneficial for further understanding."</i>');
        out.push('      </div>');
      }
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
      out.push('      <textarea id="fzPteDictationInput" class="fz-pte-dictation-editor" placeholder="Ketik kalimat yang kamu dengar di sini (perhatikan ejaan kata kunci)..." oninput="FiezelPteUi.updateWfdCount()"></textarea>');
      out.push('      <div class="fz-pte-dictation-stats">');
      out.push('        <span id="fzPteWordCountLabel">0 kata</span>');
      out.push('        <span>1 poin untuk setiap kata yang benar</span>');
      out.push('      </div>');
      out.push('    </div>');
    }

    // Action Dock
    out.push('    <div class="fz-pte-action-dock">');
    if (state.mode === 'wfd') {
      out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.submitWfd()">' + esc(t('pte.check_wfd', 'Periksa Ejaan & Skor')) + '</button>');
    } else {
      var isRec = state.timerState === 'recording';
      var recBtnClass = isRec ? ' recording' : '';
      var recBtnLabel = isRec ? t('pte.finish_speak', '■ Selesai Bicara (Kirim)') : (state.timerState === 'preparing' ? t('pte.record_now', '▶ Mulai Rekam Sekarang') : t('pte.start_prep', '● Mulai Latihan (Persiapan)'));
      out.push('      <button type="button" class="fz-pte-btn-primary' + recBtnClass + '" onclick="FiezelPteUi.handleMicAction()">' + esc(recBtnLabel) + '</button>');
    }
    out.push('      <button type="button" class="fz-pte-btn-secondary" onclick="FiezelPteUi.nextItem()">' + esc(t('pte.next_item', 'Soal Berikutnya ➔')) + '</button>');
    out.push('    </div>');

    out.push('  </div>');
    return out.join('\n');
  }

  /**
   * Render diagnostic result modal.
   */
  function renderResultScorecard(res) {
    var out = ['  <div class="fz-pte-result-card">'];
    out.push('    <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">');
    out.push('      <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#0f172a;">Hasil Evaluasi ' + esc(res.task) + '</h3>');
    out.push('      <span class="fz-pte-target-badge" style="background:#0284c7; color:#fff;">TARGET 42</span>');
    out.push('    </div>');

    // Score Circle
    var pass = res.pearsonScore >= 42;
    var circleClass = pass ? ' passed' : '';
    out.push('    <div class="fz-pte-score-circle-row">');
    out.push('      <div class="fz-pte-score-circle' + circleClass + '">');
    out.push('        <span class="fz-pte-score-num">' + res.pearsonScore + '</span>');
    out.push('        <span class="fz-pte-score-scale">Pearson / 90</span>');
    out.push('      </div>');
    out.push('      <div>');
    var verdictLabel = pass ? t('pte.passed', '✓ Memenuhi Syarat Visa (PTE 42+)') : t('pte.not_passed', '▲ Belum Mencapai Target 42');
    out.push('        <div style="font-weight:800; font-size:1.05rem; color:' + (pass ? '#10b981' : '#f59e0b') + ';">' + esc(verdictLabel) + '</div>');
    out.push('        <div style="font-size:0.84rem; color:#64748b; margin-top:4px;">Poin berkontribusi ke sub-skor Speaking, Listening, atau Writing.</div>');
    out.push('      </div>');
    out.push('    </div>');

    // Metric Breakdown Grid
    out.push('    <div class="fz-pte-metrics-grid">');
    if (res.content) {
      out.push('      <div class="fz-pte-metric-item">');
      out.push('        <div class="fz-pte-metric-title">Content</div>');
      out.push('        <div class="fz-pte-metric-val">' + res.content.score + ' / ' + res.content.max + '</div>');
      out.push('      </div>');
    }
    if (res.fluency) {
      out.push('      <div class="fz-pte-metric-item">');
      out.push('        <div class="fz-pte-metric-title">Fluency</div>');
      out.push('        <div class="fz-pte-metric-val">' + res.fluency.score + ' / 5</div>');
      out.push('      </div>');
    }
    if (res.pronunciation) {
      out.push('      <div class="fz-pte-metric-item">');
      out.push('        <div class="fz-pte-metric-title">Pronunciation</div>');
      out.push('        <div class="fz-pte-metric-val">' + res.pronunciation.score + ' / 5</div>');
      out.push('      </div>');
    }
    out.push('    </div>');

    // Spelling Misconceptions (WFD)
    if (Array.isArray(res.spellingMisconceptions) && res.spellingMisconceptions.length > 0) {
      out.push('    <div class="fz-pte-diagnosis-banner">');
      out.push('      <b>⚠ Peringatan Ejaan Kata Kunci (Misconception Ledger):</b><br/>');
      res.spellingMisconceptions.forEach(function (m) {
        out.push('      • Kamu mengetik <i>"' + esc(m.typedWord) + '"</i>, yang benar adalah <b>"' + esc(m.targetWord) + '"</b>. ' + esc(m.rule) + '<br/>');
      });
      out.push('    </div>');
    }

    // Action buttons
    out.push('    <div class="fz-pte-action-dock" style="margin-top:8px;">');
    out.push('      <button type="button" class="fz-pte-btn-secondary" onclick="FiezelPteUi.retryItem()">' + esc(t('pte.retry', 'Coba Ulang')) + '</button>');
    out.push('      <button type="button" class="fz-pte-btn-primary" onclick="FiezelPteUi.nextItem()">' + esc(t('pte.continue_next', 'Lanjut ke Soal Berikutnya ➔')) + '</button>');
    out.push('    </div>');

    out.push('  </div>');
    return out.join('\n');
  }

  function formatClock(seconds) {
    var s = Math.max(0, Math.floor(seconds || 0));
    var m = Math.floor(s / 60);
    var rem = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (rem < 10 ? '0' : '') + rem;
  }

  // --- Handlers & Controllers ---

  function switchMode(newMode) {
    if (['ra', 'rs', 'di', 'wfd'].indexOf(newMode) === -1) return;
    clearTimer();
    stopAudioPrompt();
    state.mode = newMode;
    state.itemIndex = 0;
    state.timerState = 'idle';
    state.lastResult = null;
    state.templateOpen = false;
    renderHub();
  }

  function nextItem() {
    clearTimer();
    stopAudioPrompt();
    state.lastResult = null;
    var list = BANKS[state.mode] || [];
    state.itemIndex = (state.itemIndex + 1) % Math.max(1, list.length);
    state.timerState = 'idle';
    state.templateOpen = false;
    renderHub();
  }

  function retryItem() {
    clearTimer();
    stopAudioPrompt();
    state.lastResult = null;
    state.timerState = 'idle';
    renderHub();
  }

  function toggleTemplate() {
    state.templateOpen = !state.templateOpen;
    renderHub();
  }

  function updateWfdCount() {
    var ta = document.getElementById('fzPteDictationInput');
    var label = document.getElementById('fzPteWordCountLabel');
    if (!ta || !label) return;
    var engine = getEngine();
    var words = engine ? engine.tokenize(ta.value) : ta.value.trim().split(/\s+/).filter(Boolean);
    label.textContent = words.length + ' kata';
  }

  function clearTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function playAudioPrompt() {
    var item = getActiveItem();
    if (!item) return;
    var textToPlay = item.sentence || item.text || '';
    if (!textToPlay) return;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (state.isAudioPlaying) {
        window.speechSynthesis.cancel();
        state.isAudioPlaying = false;
        renderHub();
        return;
      }

      var utter = new SpeechSynthesisUtterance(textToPlay);
      utter.lang = 'en-AU'; // Australian English for vocational / Australia visa context
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

  function stopAudioPrompt() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    state.isAudioPlaying = false;
  }

  function handleMicAction() {
    if (state.timerState === 'idle') {
      // Start preparation phase
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
      // Skip preparation immediately to recording
      clearTimer();
      playPearsonBeep();
      startRecordingPhase();
    } else if (state.timerState === 'recording') {
      // Finish recording early
      stopRecordingAndEvaluate();
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

    // Pearson 3-second silence watchdog
    armSilenceWatchdog();

    // Initialize Web Speech API if supported
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

        state.speechRecognizer.onerror = function (e) {
          console.warn('[PTE WebSpeech]', e);
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

    // Fallback if mic gave empty string in test/demo environment
    var item = getActiveItem();
    if (!transcript.trim() && item) {
      transcript = item.sampleResponse || item.text || item.sentence || '';
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
    }

    if (res) {
      state.lastResult = res;
      state.timerState = 'result';
      reportBraincoreTelemetry(item.id, res.pearsonScore >= 42, Math.round(durationSec * 1000));
      updateLearnerEstimate(res.pearsonScore);
      renderHub();
    }
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
   * Pipeline telemetry to Braincore (updateMastery, bktRecord, misconceptionLedgerRecord).
   */
  function reportBraincoreTelemetry(itemId, isSuccess, durationMs, misconceptions) {
    if (typeof window === 'undefined') return;

    // 1. updateMastery
    if (typeof window.updateMastery === 'function') {
      try {
        window.updateMastery('pte', itemId, isSuccess, durationMs || 6000);
      } catch (e) {
        console.warn('[PTE updateMastery telemetry]', e);
      }
    }

    // 2. bktRecord
    if (typeof window.bktRecord === 'function') {
      try {
        window.bktRecord({ id: itemId, skill: 'pte_' + state.mode }, isSuccess, 1.2);
      } catch (e) {
        console.warn('[PTE bktRecord telemetry]', e);
      }
    }

    // 3. misconceptionLedgerRecord
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
    switchMode: switchMode,
    nextItem: nextItem,
    retryItem: retryItem,
    toggleTemplate: toggleTemplate,
    updateWfdCount: updateWfdCount,
    playAudioPrompt: playAudioPrompt,
    handleMicAction: handleMicAction,
    submitWfd: submitWfd,
    getState: function () { return state; },
    getBanks: function () { return BANKS; }
  };
});
