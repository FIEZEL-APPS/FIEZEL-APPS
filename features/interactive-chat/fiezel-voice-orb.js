/**
 * FIEZEL · features/interactive-chat/fiezel-voice-orb.js
 * Dynamic Soundwave Orb / Breathing Aurora Sphere ala GPT-4o & Siri.
 * Hybrid CSS3 + Canvas Fluid Engine for Mode Panggilan Suara Teleponan.
 *
 * Capabilities:
 * - 4 States: connecting | listening | thinking | speaking
 * - 3-tier travertine-luxury palette (#FDFAF3, #E8E0D5, #1B1418 with #10B981 & #E04858)
 * - 60 FPS Canvas Aurora Fluid ribbon rendering (Retina/OLED aware)
 * - Live Web Audio API AnalyserNode binding & volume reactivity (--fzc-voice-level)
 * - Automatic battery saving (pauses when hidden or stage inactive)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FiezelVoiceOrb = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STATES = {
    CONNECTING: 'connecting',
    LISTENING: 'listening',
    THINKING: 'thinking',
    SPEAKING: 'speaking'
  };

  function t(k, fb) {
    var s;
    try {
      var I = (typeof root !== 'undefined' && root && root.FiezelI18n) || (typeof self !== 'undefined' ? self.FiezelI18n : null);
      s = I && typeof I.t === 'function' ? I.t(k) : undefined;
    } catch (_) {}
    if (s === undefined || s === k) s = (fb == null ? k : fb);
    return s;
  }

  function getStatusLabel(st) {
    switch (st) {
      case STATES.CONNECTING:
        return t('call_status_connecting', 'Menghubungkan...');
      case STATES.LISTENING:
        return t('call_status_listening', 'Mendengarkan kamu...');
      case STATES.THINKING:
        return t('call_status_thinking', 'Sedang berpikir...');
      case STATES.SPEAKING:
        return t('call_status_speaking', 'Sedang berbicara...');
      default:
        return st;
    }
  }

  /**
   * VoiceOrb Instance
   */
  function VoiceOrb(options) {
    options = options || {};
    this.container = options.container || document.body;
    this.partnerName = options.partnerName || 'Tutor Fiezel';
    this.partnerAvatar = options.partnerAvatar || '';
    this.onHangup = typeof options.onHangup === 'function' ? options.onHangup : null;
    this.onToggleMute = typeof options.onToggleMute === 'function' ? options.onToggleMute : null;
    this.onOrbTap = typeof options.onOrbTap === 'function' ? options.onOrbTap : null;
    this.enableCanvas = options.enableCanvas !== false; // Canvas fluid layer enabled by default

    this.state = options.initialState || STATES.CONNECTING;
    this.volume = 0;
    this.isMuted = false;
    this.rafId = null;
    this.audioContext = null;
    this.analyser = null;
    this.audioSource = null;
    this.dataArray = null;

    // Canvas fluid animation parameters
    this.phase = 0;
    this.targetVolume = 0;
    this.smoothedVolume = 0;

    this._initDOM();
    if (this.enableCanvas) {
      this._initCanvas();
    }
    this.setState(this.state);
  }

  /**
   * DOM Architecture Initialization
   */
  VoiceOrb.prototype._initDOM = function () {
    var stage = document.createElement('div');
    stage.className = 'fzc-call-stage';
    stage.setAttribute('role', 'dialog');
    stage.setAttribute('aria-label', t('call_mode_aria', 'Mode Panggilan Suara'));

    var avatarHtml = '';
    if (this.partnerAvatar) {
      if (this.partnerAvatar.indexOf('<svg') >= 0 || this.partnerAvatar.indexOf('<img') >= 0) {
        avatarHtml = '<div class="fzc-call-partner-avatar" style="display:flex;align-items:center;justify-content:center;">' + this.partnerAvatar + '</div>';
      } else if (this.partnerAvatar.startsWith('http') || this.partnerAvatar.startsWith('./') || this.partnerAvatar.startsWith('/')) {
        avatarHtml = '<img class="fzc-call-partner-avatar" src="' + this.partnerAvatar + '" alt="' + this.partnerName + '">';
      } else {
        avatarHtml = '<div class="fzc-call-partner-avatar" style="display:flex;align-items:center;justify-content:center;font-size:1.8rem;">' + this.partnerAvatar + '</div>';
      }
    } else {
      avatarHtml = '<div class="fzc-call-partner-avatar" style="display:flex;align-items:center;justify-content:center;background:#1B1418;color:#FDFAF3;font-weight:800;font-size:1.4rem;">F</div>';
    }

    stage.innerHTML = [
      '<header class="fzc-call-header">',
      '  <div class="fzc-call-partner-avatar-wrap">' + avatarHtml + '</div>',
      '  <h2 class="fzc-call-partner-name">' + this._escapeHtml(this.partnerName) + '</h2>',
      '  <div class="fzc-call-status-pill">',
      '    <span class="fzc-call-status-dot"></span>',
      '    <span class="fzc-call-status-label">' + getStatusLabel(this.state) + '</span>',
      '  </div>',
      '  <div class="fzc-call-timer" id="fzcCallTimer" style="font-size:0.88rem;opacity:0.75;margin-top:6px;font-variant-numeric:tabular-nums;letter-spacing:0.04em;">00:00</div>',
      '</header>',
      '<main class="fzc-orb-centerpiece" role="button" tabindex="0" aria-label="' + t('call_orb_tap_aria', 'Sentuh bola untuk menyela') + '">',
      '  <div class="fzc-voice-orb-wrapper">',
      '    <!-- Radar Rings (Connecting) -->',
      '    <div class="fzc-radar-rings">',
      '      <div class="fzc-radar-ring"></div>',
      '      <div class="fzc-radar-ring"></div>',
      '      <div class="fzc-radar-ring"></div>',
      '    </div>',
      '    <div class="fzc-radar-sweep"></div>',
      '    <!-- Aura Glow (Listening) -->',
      '    <div class="fzc-listening-aurora"></div>',
      '    <!-- Orbital Gyro Rings (Thinking) -->',
      '    <div class="fzc-orbital-container">',
      '      <div class="fzc-orbital-ring"></div>',
      '      <div class="fzc-orbital-ring"></div>',
      '      <div class="fzc-orbital-ring"></div>',
      '    </div>',
      '    <!-- Acoustic Crests (Speaking) -->',
      '    <div class="fzc-speaking-wavefronts">',
      '      <div class="fzc-speaking-crest"></div>',
      '      <div class="fzc-speaking-crest"></div>',
      '      <div class="fzc-speaking-crest"></div>',
      '    </div>',
      '    <!-- Core CSS3 Orb -->',
      '    <div class="fzc-voice-orb">',
      '      <div class="fzc-orb-inner-core"></div>',
      '    </div>',
      '    <!-- Fluid 2D Canvas Layer -->',
      '    <canvas class="fzc-voice-orb-canvas"></canvas>',
      '  </div>',
      '  <!-- Equalizer Dock -->',
      '  <div class="fzc-orb-eq-dock">',
      '    <div class="fzc-orb-eq-bar"></div>',
      '    <div class="fzc-orb-eq-bar"></div>',
      '    <div class="fzc-orb-eq-bar"></div>',
      '    <div class="fzc-orb-eq-bar"></div>',
      '    <div class="fzc-orb-eq-bar"></div>',
      '  </div>',
      '</main>',
      '<div class="fzc-call-transcript-box">',
      '  <p class="fzc-call-transcript-text"></p>',
      '</div>',
      '<footer class="fzc-call-controls-dock">',
      '  <button type="button" class="fzc-call-btn fzc-call-btn--mute" aria-label="' + t('call_btn_mute', 'Bisukan Mikrofon') + '" title="' + t('call_btn_mute', 'Bisukan Mikrofon') + '">',
      '    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>',
      '  </button>',
      '  <button type="button" class="fzc-call-btn fzc-call-btn--hangup" id="fzcBtnEndCall" aria-label="' + t('call_btn_hangup', 'Akhiri Panggilan') + '" title="' + t('call_btn_hangup', 'Akhiri Panggilan') + '">',
      '    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>',
      '  </button>',
      '</footer>'
    ].join('');

    this.container.appendChild(stage);
    this.stageEl = stage;
    this.wrapperEl = stage.querySelector('.fzc-voice-orb-wrapper');
    this.centerpieceEl = stage.querySelector('.fzc-orb-centerpiece');
    this.statusLabelEl = stage.querySelector('.fzc-call-status-label');
    this.timerEl = stage.querySelector('#fzcCallTimer');
    this.transcriptTextEl = stage.querySelector('.fzc-call-transcript-text');
    this.muteBtnEl = stage.querySelector('.fzc-call-btn--mute');
    this.hangupBtnEl = stage.querySelector('#fzcBtnEndCall') || stage.querySelector('.fzc-call-btn--hangup');
    this.canvasEl = stage.querySelector('.fzc-voice-orb-canvas');

    // Bind Controls
    var self = this;
    if (this.hangupBtnEl) {
      this.hangupBtnEl.addEventListener('click', function () {
        if (self.onHangup) self.onHangup();
        else self.close();
      });
    }

    if (this.muteBtnEl) {
      this.muteBtnEl.addEventListener('click', function () {
        self.toggleMute();
      });
    }

    if (this.centerpieceEl) {
      this.centerpieceEl.addEventListener('click', function () {
        if (self.onOrbTap) self.onOrbTap();
      });
    }
  };

  /**
   * Canvas Fluid Aurora Wave Renderer
   */
  VoiceOrb.prototype._initCanvas = function () {
    if (!this.canvasEl) return;
    this.ctx = this.canvasEl.getContext('2d');
    if (!this.ctx) return;

    var self = this;
    this._resizeCanvas();
    this._onResize = function () { self._resizeCanvas(); };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', this._onResize);
    }

    this._startLoop();
  };

  VoiceOrb.prototype._resizeCanvas = function () {
    if (!this.canvasEl) return;
    var rect = this.canvasEl.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    this.canvasWidth = (rect.width || 236) * dpr;
    this.canvasHeight = (rect.height || 236) * dpr;
    this.canvasEl.width = this.canvasWidth;
    this.canvasEl.height = this.canvasHeight;
  };

  VoiceOrb.prototype._startLoop = function () {
    var self = this;
    function loop() {
      self._renderFrame();
      self.rafId = requestAnimationFrame(loop);
    }
    this.rafId = requestAnimationFrame(loop);
  };

  VoiceOrb.prototype._renderFrame = function () {
    if (!this.ctx || !this.stageEl || !this.stageEl.classList.contains('is-active')) return;
    if (document.hidden) return; // Battery saving when tab/app hidden

    // Audio volume smoothing (inertial interpolation)
    this.smoothedVolume += (this.targetVolume - this.smoothedVolume) * 0.15;
    this.phase += 0.035 + (this.smoothedVolume * 0.05);

    var ctx = this.ctx;
    var w = this.canvasWidth;
    var h = this.canvasHeight;
    var cx = w / 2;
    var cy = h / 2;
    var r = (Math.min(w, h) / 2) * 0.76;

    ctx.clearRect(0, 0, w, h);

    // Render fluid aurora harmonic ribbons
    if (this.state === STATES.LISTENING || this.state === STATES.SPEAKING) {
      var ribbons = 3;
      var baseColor = this.state === STATES.LISTENING
        ? [16, 185, 129]   // Emerald #10B981
        : [224, 72, 88];   // Coral #E04858

      for (var k = 0; k < ribbons; k++) {
        ctx.beginPath();
        var kPhase = this.phase + (k * 1.8);
        var kAmp = (12 + (this.smoothedVolume * 35)) * (k === 0 ? 1 : 0.7);
        var points = 48;

        for (var i = 0; i <= points; i++) {
          var angle = (i / points) * Math.PI * 2;
          var wave = Math.sin(angle * 3 + kPhase) * Math.cos(angle * 2 - kPhase);
          var currentR = r + (wave * kAmp);
          var x = cx + Math.cos(angle) * currentR;
          var y = cy + Math.sin(angle) * currentR;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        var alpha = (0.28 - (k * 0.08)) * (0.6 + this.smoothedVolume * 0.4);
        ctx.strokeStyle = 'rgba(' + baseColor[0] + ',' + baseColor[1] + ',' + baseColor[2] + ',' + alpha + ')';
        ctx.lineWidth = (2.5 + (this.smoothedVolume * 3)) * (window.devicePixelRatio || 1);
        ctx.stroke();
      }
    }
  };

  /**
   * Set Status State
   * @param {'connecting' | 'listening' | 'thinking' | 'speaking'} nextState
   */
  VoiceOrb.prototype.setState = function (nextState) {
    if (!STATES[nextState.toUpperCase()] && nextState !== this.state) return;
    this.state = nextState;

    if (this.centerpieceEl) {
      this.centerpieceEl.classList.remove(
        'fzc-orb--connecting',
        'fzc-orb--listening',
        'fzc-orb--thinking',
        'fzc-orb--speaking'
      );
      this.centerpieceEl.classList.add('fzc-orb--' + nextState);
    }

    if (this.statusLabelEl) {
      this.statusLabelEl.textContent = getStatusLabel(nextState);
    }

    // Default resting volume per state
    if (nextState === STATES.THINKING || nextState === STATES.CONNECTING) {
      this.setVolume(0);
    } else if (nextState === STATES.SPEAKING) {
      this.setVolume(0.4);
    }
  };

  /**
   * Set Real-Time Audio Level (0.0 to 1.0)
   */
  VoiceOrb.prototype.setVolume = function (vol) {
    vol = Math.max(0, Math.min(1, Number(vol) || 0));
    this.targetVolume = vol;
    if (this.wrapperEl) {
      this.wrapperEl.style.setProperty('--fzc-voice-level', vol.toFixed(3));
    }
  };

  /**
   * Attach Live Web Audio Stream (Microphone or Voice synthesizer)
   */
  VoiceOrb.prototype.attachStream = function (mediaStream) {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;
      this.audioSource = this.audioContext.createMediaStreamSource(mediaStream);
      this.audioSource.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      var self = this;
      function pollAudio() {
        if (!self.analyser) return;
        self.analyser.getByteFrequencyData(self.dataArray);
        var sum = 0;
        for (var i = 0; i < self.dataArray.length; i++) {
          sum += self.dataArray[i];
        }
        var avg = sum / self.dataArray.length;
        var normalized = Math.min(1, avg / 128);
        self.setVolume(normalized);

        if (self.audioSource) {
          requestAnimationFrame(pollAudio);
        }
      }
      requestAnimationFrame(pollAudio);
    } catch (e) {
      console.warn('[FiezelVoiceOrb] Audio stream attach error:', e);
    }
  };

  /**
   * Detach Audio Stream & Free Audio Nodes
   */
  VoiceOrb.prototype.detachStream = function () {
    try {
      if (this.audioSource) {
        this.audioSource.disconnect();
        this.audioSource = null;
      }
      this.analyser = null;
      this.dataArray = null;
      this.setVolume(0);
    } catch (_) {}
  };

  /**
   * Update Real-Time Subtitle / Transcription
   */
  VoiceOrb.prototype.setTranscript = function (text, translation, role) {
    if (this.transcriptTextEl) {
      var main = this._escapeHtml(text || '');
      if (translation) {
        this.transcriptTextEl.innerHTML = main + '<span class="fzc-call-transcript-trans" style="display:block;font-size:0.82rem;opacity:0.85;margin-top:6px;font-weight:500;">' + this._escapeHtml(translation) + '</span>';
      } else {
        this.transcriptTextEl.textContent = (text || '');
      }
    }
  };

  /**
   * Update Real-Time Call Timer Display
   */
  VoiceOrb.prototype.setTimer = function (text) {
    if (this.timerEl) {
      this.timerEl.textContent = text || '00:00';
    }
  };

  /**
   * Mute Toggle
   */
  VoiceOrb.prototype.toggleMute = function (forceVal) {
    if (typeof forceVal === 'boolean') {
      this.isMuted = forceVal;
    } else {
      this.isMuted = !this.isMuted;
    }
    if (this.muteBtnEl) {
      this.muteBtnEl.classList.toggle('is-muted', this.isMuted);
    }
    if (this.onToggleMute) {
      this.onToggleMute(this.isMuted);
    }
    return this.isMuted;
  };

  /**
   * Show / Open Call Overlay
   */
  VoiceOrb.prototype.open = function () {
    if (this.stageEl) {
      this.stageEl.classList.add('is-active');
      if (this.enableCanvas) {
        this._resizeCanvas();
        if (!this.rafId) {
          this._startLoop();
        }
      }
    }
  };

  /**
   * Hide / Close Call Overlay
   */
  VoiceOrb.prototype.close = function () {
    if (this.stageEl) {
      this.stageEl.classList.remove('is-active');
    }
    if (this.rafId) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.rafId);
      else clearTimeout(this.rafId);
      this.rafId = null;
    }
    this.detachStream();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
    }
    this.setVolume(0);
  };

  /**
   * Clean UI teardown alias
   */
  VoiceOrb.prototype.closeCallUI = function () {
    this.destroy();
  };

  /**
   * Destroy & Cleanup
   */
  VoiceOrb.prototype.destroy = function () {
    this.close();
    if (this.rafId) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.rafId);
      else clearTimeout(this.rafId);
      this.rafId = null;
    }
    if (this._onResize && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('resize', this._onResize);
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
    }
    if (this.stageEl && this.stageEl.parentNode) {
      this.stageEl.parentNode.removeChild(this.stageEl);
      this.stageEl = null;
    }
  };

  VoiceOrb.prototype._escapeHtml = function (str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  return {
    STATES: STATES,
    getStatusLabel: getStatusLabel,
    VoiceOrb: VoiceOrb,
    create: function (options) {
      return new VoiceOrb(options);
    }
  };
}));
