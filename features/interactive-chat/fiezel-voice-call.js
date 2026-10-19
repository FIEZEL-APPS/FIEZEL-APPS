/**
 * FIEZEL · features/interactive-chat/fiezel-voice-call.js
 * Two-Way Voice Call / Phone Call Mode (GPT-4o Voice style) for FIEZEL.
 *
 * Implements:
 * 1. State Machine: 'idle', 'connecting', 'listening', 'thinking', 'speaking'.
 * 2. Hands-free loop: Autonomous turn-taking loop between learner and AI tutor.
 * 3. Smart Voice Activity Detection (VAD): Web Audio RMS + SpeechRecognition silence timeout.
 * 4. Polite Barge-In Interruption: Learner voice interrupts AI speech gracefully and immediately.
 * 5. Fullscreen cinematic Voice Call overlay with organic reactive 3D glowing orb.
 * 6. Zero-Loss message persistence & Braincore telemetry integration with FiezelInteractiveChat.
 * 7. Clean syntax without trailing whitespace.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.FiezelVoiceCall = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  'use strict';

  // State Machine Constants
  var STATE = {
    IDLE: 'idle',
    CONNECTING: 'connecting',
    LISTENING: 'listening',
    THINKING: 'thinking',
    SPEAKING: 'speaking'
  };

  var ALLOWED_TRANSITIONS = {
    idle: ['connecting'],
    connecting: ['listening', 'idle'],
    listening: ['thinking', 'speaking', 'idle'],
    thinking: ['speaking', 'listening', 'idle'],
    speaking: ['listening', 'idle']
  };

  // Default Configuration
  var CONFIG = {
    speechThreshold: 0.032,           // Normalized RMS amplitude to register speech
    interruptThreshold: 0.075,        // RMS saat AI bicara yang memicu PRE-DUCK (bukan potong langsung)
    interruptHoldMs: 150,             // Suara keras harus bertahan 150 ms (berbasis waktu, bukan frame rAF)
    interruptConfirmMs: 650,          // Tanpa token SR dalam 650 ms -> suara AI dikembalikan (gema speaker)
    minBargeInWords: 2,               // Satu kata / gema pendek tidak memotong AI
    finalGraceMs: 800,                // SR sudah isFinal -> giliran dikirim 800 ms kemudian (toleransi jeda napas 700ms)
    interimSilenceMs: 1100,           // SR masih interim -> tunggu lebih lama
    silenceTimeoutMs: 1350,           // Fallback silence timeout
    maxUtteranceMs: 12000,            // Pengaman: kirim paksa setelah 12 detik bicara terus-menerus
    naturalTurnPauseMs: 160,          // Jeda napas sebelum mic dibuka lagi
    recognitionRestartDelayMs: 80,    // Safe restart delay
    fftSize: 512,
    smoothingTimeConstant: 0.25
  };

  var _staticIcons = (function () {
    try {
      if (typeof require === 'function') return require('./fiezel-chat-icons.js');
    } catch (_) {}
    return null;
  })();

  function renderIcon(name, opts) {
    try {
      var mod = (root && root.FiezelChatIcons) ||
        (typeof globalThis !== 'undefined' && globalThis.FiezelChatIcons) ||
        (typeof window !== 'undefined' && window.FiezelChatIcons) ||
        _staticIcons;
      if (mod && typeof mod.icon === 'function') {
        return mod.icon(name, opts);
      }
    } catch (_) {}
    return '';
  }

  function t(k, fb) {
    var s;
    try {
      var I = (root && root.FiezelI18n) || (typeof self !== 'undefined' ? self.FiezelI18n : null);
      s = I && typeof I.t === 'function' ? I.t(k) : undefined;
    } catch (_) {}
    if (s === undefined || s === k) s = (fb == null ? k : fb);
    return s;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function stripFurigana(text) {
    return String(text || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
  }

  // Acoustic Echo Discriminator: identifies if mic transcription is an echo of the AI's own words
  function isAcousticEcho(heardText, aiSpokenText) {
    if (!heardText || !aiSpokenText) return false;
    var u = String(heardText).toLowerCase().replace(/[\s\p{P}\u3000-\u303F]/gu, '');
    var a = String(aiSpokenText).toLowerCase().replace(/[\s\p{P}\u3000-\u303F]/gu, '');
    if (!u || !a) return false;
    if (a.indexOf(u) >= 0 || u.indexOf(a) >= 0) return true;
    if (u.length >= 2) {
      if (a.indexOf(u.slice(0, Math.min(u.length, 6))) >= 0) return true;
      if (a.indexOf(u.slice(-Math.min(u.length, 6))) >= 0) return true;
    }
    return false;
  }

  // Pure Math RMS calculator for audio samples
  function computeRMS(dataArray) {
    if (!dataArray || dataArray.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < dataArray.length; i++) {
      var val = (dataArray[i] - 128) / 128;
      sum += val * val;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  // Canonical Voice Call Personas
  var PERSONAS = {
    en: {
      alex: {
        id: 'alex',
        name: 'Coach Alex',
        shortName: 'Alex',
        voice: 'en-US-GuyNeural',
        gender: 'male',
        role: 'Speaking & Confidence Coach',
        avatarIcon: 'coach',
        label: 'Coach Alex'
      },
      sarah: {
        id: 'sarah',
        name: 'Coach Sarah',
        shortName: 'Sarah',
        voice: 'en-US-AriaNeural',
        gender: 'female',
        role: 'Pronunciation & Fluency Coach',
        avatarIcon: 'coach',
        label: 'Coach Sarah'
      }
    },
    ja: {
      keita: {
        id: 'keita',
        name: 'フィゼル先生',
        shortName: 'Keita',
        voice: 'ja-JP-KeitaNeural',
        gender: 'male',
        role: 'Percakapan & Pola Kalimat',
        avatarIcon: 'sensei',
        label: 'Sensei Keita'
      },
      nanami: {
        id: 'nanami',
        name: 'ナナミ先生',
        shortName: 'Nanami',
        voice: 'ja-JP-NanamiNeural',
        gender: 'female',
        role: 'Percakapan Sehari-hari & Keigo',
        avatarIcon: 'sensei',
        label: 'Sensei Nanami'
      }
    }
  };

  function resolvePersona(course, val) {
    var s = (val && typeof val === 'object' && val.id) ? String(val.id) : String(val || '');
    s = s.toLowerCase().trim();

    var c = course;
    if (s === 'sarah' || s === 'aria' || s === 'alex' || s === 'guy' || /sarah|aria|coach/i.test(s)) {
      c = 'en';
    } else if (s === 'keita' || s === 'nanami' || /keita|nanami|sensei/i.test(s)) {
      c = 'ja';
    } else {
      c = (course === 'en') ? 'en' : 'ja';
    }

    var bank = PERSONAS[c];
    if (!s) {
      try {
        var stored = localStorage.getItem('fz_persona_' + c);
        if (stored && bank[stored]) return bank[stored];
      } catch (_) {}
      return bank[c === 'ja' ? 'keita' : 'alex'];
    }
    if (bank[s]) return bank[s];
    if (c === 'en') {
      if (/sarah|aria/i.test(s)) return bank.sarah;
      if (/alex|guy/i.test(s)) return bank.alex;
      return bank.alex;
    } else {
      if (/nanami/i.test(s)) return bank.nanami;
      if (/keita/i.test(s)) return bank.keita;
      return bank.keita;
    }
  }

  function renderPersonaSwitchHtml(course, activeId) {
    var c = course === 'ja' ? 'ja' : 'en';
    var bank = PERSONAS[c];
    var keys = Object.keys(bank);
    var btnsHtml = keys.map(function (k) {
      var p = bank[k];
      var isActive = p.id === activeId ? ' is-active' : '';
      var ariaChecked = p.id === activeId ? 'true' : 'false';
      return '<button type="button" class="fzc-call-persona-btn' + isActive + '" data-persona="' + esc(p.id) + '" role="radio" aria-checked="' + ariaChecked + '" title="' + esc(p.label + ' (' + p.voice + ')') + '">' +
        '<span class="fzc-persona-icon" aria-hidden="true">' + (p.gender === 'female' ? '👩‍🏫' : '👨‍🏫') + '</span> ' +
        '<span class="fzc-persona-name">' + esc(p.shortName || p.label) + '</span>' +
        '</button>';
    }).join('');

    return '<div class="fzc-call-persona-switch" id="fzcCallPersonaSwitch" role="radiogroup" aria-label="' + esc(t('call_choose_persona', 'Pilih Mitra Bicara')) + '">' + btnsHtml + '</div>';
  }

  // --- Voice Call Engine Instance ---
  function createVoiceCallEngine() {
    var state = {
      status: STATE.IDLE,
      course: 'ja',
      scenarioId: 'free',
      partnerName: 'フィゼル先生',
      partnerAvatar: renderIcon('sensei', { size: 24, filled: true }),
      isMuted: false,
      showSubtitles: true,
      currentTranscript: '',
      latestAiReply: null,
      callStartTime: 0,
      durationSeconds: 0,
      audioLevel: 0,
      interruptedCount: 0,
      persona: 'keita',
      partnerVoice: 'ja-JP-KeitaNeural',
      callTurns: []
    };

    var listeners = {};
    var mediaStream = null;
    var audioContext = null;
    var analyserNode = null;
    var callSourceNode = null;
    var vadRafId = null;
    var silenceTimer = null;
    var callTimerInterval = null;
    var recognition = null;
    var recognitionRestartTimer = null;
    var isRecognitionRunning = false;
    var isPermissionPending = false;
    var aiSpeechStartTime = 0;
    var aiCurrentSpeakingText = '';
    var mediaStreamToken = 0;
    var hasUserSpoken = false;
    var pendingTranscript = '';
    var overlayEl = null;
    var orbInstance = null;
    var loudFramesCount = 0;
    var isDestroyed = false;
    var resultOffset = 0;        // hasil SR (sesi berjalan) yang sudah dikirim sebagai giliran
    var lastResultsLength = 0;
    var sessionFinals = '';      // final yang belum dikirim pada sesi SR berjalan
    var transcriptCarry = '';    // final belum terkirim dari sesi SR sebelumnya (Chrome me-restart sesi)
    var lastTokenFinal = false;
    var utteranceStartedAt = 0;
    var loudSince = 0;
    var duckTimer = null;
    var currentAiText = '';

    function on(evt, fn) {
      if (typeof fn !== 'function') return;
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    }

    function off(evt, fn) {
      if (!listeners[evt]) return;
      listeners[evt] = listeners[evt].filter(function (f) { return f !== fn; });
    }

    function emit(evt, a, b, c) {
      var list = listeners[evt];
      if (list && list.length) {
        for (var i = 0; i < list.length; i++) {
          try { list[i](a, b, c); } catch (e) {
            if (typeof console !== 'undefined' && console.error) console.error('[VoiceCall Error]', e);
          }
        }
      }
    }

    function canTransition(to) {
      if (to === STATE.IDLE) return true;
      var allowed = ALLOWED_TRANSITIONS[state.status];
      return allowed ? allowed.indexOf(to) >= 0 : false;
    }

    function setStatus(nextStatus, meta, force) {
      if (state.status === nextStatus) return;
      if (!force && !canTransition(nextStatus)) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[VoiceCall] Illegal state transition:', state.status, '->', nextStatus);
        }
        return false;
      }
      var prevStatus = state.status;
      state.status = nextStatus;
      if (orbInstance && typeof orbInstance.setState === 'function') {
        orbInstance.setState(nextStatus);
      }
      emit('stateChange', nextStatus, prevStatus, meta);
      updateOverlayUI();
      return true;
    }

    // --- Web Audio Autoplay Policy & Neural Voice ---
    // Kanon m025-232/m025-246: TTS peramban mati total. Suara panggilan lewat FiezelChatVoice
    // (FiezelVoiceSay / Puter Voice / Cloudflare TTS); kalau semua lapisan gagal, panggilan
    // tetap berjalan tanpa suara dan balasan terbaca di subtitle.
    var speakPulseTimer = null;
    var currentAiSpeechLevel = 0;

    function chatVoice() {
      if (root.FiezelChatVoice) return root.FiezelChatVoice;
      try {
        if (typeof require === 'function') return require('./fiezel-chat-voice.js');
      } catch (_) {}
      return null;
    }

    function clearSpeakPulse() {
      if (speakPulseTimer) {
        clearInterval(speakPulseTimer);
        speakPulseTimer = null;
      }
    }

    // Pemutar neural tidak memberi peristiwa batas kata, jadi orb berdenyut halus selama
    // giliran AI berbunyi dan berhenti tepat saat audionya berhenti.
    function startSpeakPulse() {
      clearSpeakPulse();
      speakPulseTimer = setInterval(function () {
        currentAiSpeechLevel = 0.55 + Math.random() * 0.35;
        renderOrbLevel(currentAiSpeechLevel);
        if (orbInstance && typeof orbInstance.setVolume === 'function') {
          orbInstance.setVolume(currentAiSpeechLevel);
        }
        state.audioLevel = currentAiSpeechLevel;
        emit('audioLevel', currentAiSpeechLevel);
      }, 120);
    }

    // Web Audio & HTML5 Audio Autoplay Policy Unlock (iOS Safari / PWA Standalone / Android)
    function unlockAudio() {
      try {
        var AudioCtx = root.AudioContext || root.webkitAudioContext;
        if (AudioCtx) {
          if (!audioContext || audioContext.state === 'closed') {
            if (root.__fiezelSharedAudioContext && root.__fiezelSharedAudioContext.state === 'closed') {
              root.__fiezelSharedAudioContext = null;
            }
            audioContext = root.__fiezelSharedAudioContext || new AudioCtx();
            root.__fiezelSharedAudioContext = audioContext;
          }
          if (audioContext.state === 'suspended') {
            audioContext.resume().then(function () {
              try {
                var buf = audioContext.createBuffer(1, 1, 22050);
                var src = audioContext.createBufferSource();
                src.buffer = buf;
                src.connect(audioContext.destination);
                src.start(0);
              } catch (_) {}
            }).catch(function () {});
          }
        }
        // Prime HTML5 Audio element for iOS Safari & Android WebKit
        var AudioCtor = root.Audio;
        if (AudioCtor) {
          try {
            var silentAudio = new AudioCtor('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
            silentAudio.volume = 0.01;
            var p = silentAudio.play();
            if (p && typeof p.then === 'function') {
              p.then(function () {
                try { silentAudio.pause(); } catch (_) {}
              }).catch(function () {});
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    // --- Neural Voice Playback ---
    function stopAudioPlayback() {
      clearSpeakPulse();
      currentAiSpeechLevel = 0;
      aiCurrentSpeakingText = '';
      renderOrbLevel(0);
      if (orbInstance && typeof orbInstance.setVolume === 'function') {
        orbInstance.setVolume(0);
      }
      var cv = chatVoice();
      if (cv && typeof cv.stop === 'function') {
        try { cv.stop(); } catch (_) {}
      }
      try {
        if (root.FiezelNeuralVoice && typeof root.FiezelNeuralVoice.stop === 'function') {
          root.FiezelNeuralVoice.stop();
        }
      } catch (_) {}
      try {
        if (root.FiezelWebAudioPlayer && typeof root.FiezelWebAudioPlayer.stop === 'function') {
          root.FiezelWebAudioPlayer.stop();
        }
      } catch (_) {}
    }

    function playSpeech(text, course) {
      var cv = chatVoice();
      var clean = stripFurigana(text);
      if (!clean || !cv || typeof cv.speak !== 'function') return Promise.resolve(false);
      var isJa = course === 'ja';
      var started = false;

      aiSpeechStartTime = Date.now();
      aiCurrentSpeakingText = clean;

      try {
        unlockAudio();
        if (typeof cv.unlockAudio === 'function') cv.unlockAudio();
      } catch (_) {}

      // Pulse orb immediately as AI begins vocalization
      startSpeakPulse();

      return cv.speak(clean, isJa ? 'ja' : 'en', {
        voice: state.partnerVoice,
        persona: state.persona,
        onSentenceStart: function (i, sentence) {
          aiSpeechStartTime = Date.now();
          aiCurrentSpeakingText = stripFurigana(sentence || clean);
          if (!started) {
            started = true;
            emit('speechStart', { isJa: isJa, text: clean, persona: state.persona, voice: state.partnerVoice });
          }
          emit('speechBoundary', { index: i, text: sentence, persona: state.persona, voice: state.partnerVoice });
        },
        onEnd: function () {
          clearSpeakPulse();
          currentAiSpeechLevel = 0;
          aiCurrentSpeakingText = '';
          renderOrbLevel(0);
          if (orbInstance && typeof orbInstance.setVolume === 'function') {
            orbInstance.setVolume(0);
          }
        }
      }).then(function (spoke) {
        clearSpeakPulse();
        currentAiSpeechLevel = 0;
        aiCurrentSpeakingText = '';
        renderOrbLevel(0);
        if (orbInstance && typeof orbInstance.setVolume === 'function') {
          orbInstance.setVolume(0);
        }
        return spoke;
      }, function () {
        clearSpeakPulse();
        currentAiSpeechLevel = 0;
        aiCurrentSpeakingText = '';
        renderOrbLevel(0);
        if (orbInstance && typeof orbInstance.setVolume === 'function') {
          orbInstance.setVolume(0);
        }
        return false;
      });
    }

    // --- VAD & Audio Input Handling ---
    var kineticSpeechLevel = 0.05;

    function initMediaStream(preacquiredStream) {
      if (preacquiredStream) {
        mediaStream = preacquiredStream;
        setupAudioAnalyser(mediaStream);
        if (orbInstance && typeof orbInstance.attachStream === 'function') {
          try { orbInstance.attachStream(mediaStream); } catch (_) {}
        }
        return Promise.resolve(true);
      }

      var isIOS = (typeof navigator !== 'undefined') && (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      );

      var hasSpeechRec = Boolean(root.SpeechRecognition || root.webkitSpeechRecognition);

      // On iOS WebKit (Safari & Standalone PWA), running getUserMedia simultaneously with
      // webkitSpeechRecognition locks Apple's AVAudioSession hardware controller. Furthermore,
      // in iOS PWA standalone mode, getUserMedia is frequently restricted by WebKit permissions,
      // while webkitSpeechRecognition works flawlessly without locks (proven by Shadowing mode).
      // Therefore, if SpeechRecognition is available on iOS, we bypass mandatory getUserMedia
      // and let SpeechRecognition drive both transcription and speech-reactive kinetic levels!
      if (isIOS && hasSpeechRec) {
        startVadLoop();
        return Promise.resolve(true);
      }

      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        var constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };
        return navigator.mediaDevices.getUserMedia(constraints)
          .catch(function () {
            return navigator.mediaDevices.getUserMedia({ audio: true });
          })
          .then(function (stream) {
            if (isDestroyed || state.status === STATE.IDLE) {
              if (stream && typeof stream.getTracks === 'function') {
                var trks = stream.getTracks();
                for (var tIdx = 0; tIdx < trks.length; tIdx++) {
                  try { trks[tIdx].enabled = false; } catch (_) {}
                  try { trks[tIdx].stop(); } catch (_) {}
                }
              }
              return false;
            }
            mediaStream = stream;
            setupAudioAnalyser(stream);
            if (orbInstance && typeof orbInstance.attachStream === 'function') {
              try { orbInstance.attachStream(stream); } catch (_) {}
            }
            return true;
          })
          .catch(function (err) {
            if (isDestroyed || state.status === STATE.IDLE) return false;
            // Graceful resilience: If getUserMedia fails or is denied on any browser, BUT
            // SpeechRecognition is supported, DO NOT abort the call! SpeechRecognition can
            // capture the student's voice directly!
            if (hasSpeechRec) {
              if (typeof console !== 'undefined' && console.warn) {
                console.warn('[FiezelVoiceCall] getUserMedia failed, continuing with SpeechRecognition engine:', err);
              }
              startVadLoop();
              return true;
            }
            if (root.__FIEZEL_TEST_MOCK_STREAM__ || (typeof window !== 'undefined' && window.__FZ_TEST_CALL)) {
              return setupMockAudioStream();
            }
            throw err;
          });
      }

      if (hasSpeechRec) {
        startVadLoop();
        return Promise.resolve(true);
      }

      if (root.__FIEZEL_TEST_MOCK_STREAM__ || (typeof window !== 'undefined' && window.__FZ_TEST_CALL)) {
        return setupMockAudioStream();
      }
      return Promise.reject(new Error(t('call_no_mediadevices', 'Browser belum mendukung akses mikrofon langsung.')));
    }

    function setupMockAudioStream() {
      try {
        var AudioCtx = root.AudioContext || root.webkitAudioContext;
        if (AudioCtx) {
          audioContext = new AudioCtx();
          var dest = audioContext.createMediaStreamDestination();
          var osc = audioContext.createOscillator();
          osc.connect(dest);
          osc.start();
          mediaStream = dest.stream;
          analyserNode = audioContext.createAnalyser();
          analyserNode.fftSize = CONFIG.fftSize;
          analyserNode.smoothingTimeConstant = CONFIG.smoothingTimeConstant;
          osc.connect(analyserNode);
          startVadLoop();
          if (orbInstance && typeof orbInstance.attachStream === 'function') {
            try { orbInstance.attachStream(mediaStream); } catch (_) {}
          }
          return Promise.resolve(true);
        }
      } catch (_) {}
      return Promise.resolve(true);
    }

    function setupAudioAnalyser(stream) {
      try {
        var AudioCtx = root.AudioContext || root.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioContext || audioContext.state === 'closed') {
          if (root.__fiezelSharedAudioContext && root.__fiezelSharedAudioContext.state === 'closed') {
            root.__fiezelSharedAudioContext = null;
          }
          audioContext = root.__fiezelSharedAudioContext || new AudioCtx();
          root.__fiezelSharedAudioContext = audioContext;
        }
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(function () {});
        }
        if (callSourceNode) {
          try { callSourceNode.disconnect(); } catch (_) {}
          callSourceNode = null;
        }
        var source = audioContext.createMediaStreamSource(stream);
        callSourceNode = source;
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = CONFIG.fftSize;
        analyserNode.smoothingTimeConstant = CONFIG.smoothingTimeConstant;
        source.connect(analyserNode);

        startVadLoop();
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[VoiceCall] Audio analyser setup fallback:', err);
        }
      }
    }

    function startVadLoop() {
      if (vadRafId) {
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(vadRafId);
        else clearTimeout(vadRafId);
        vadRafId = null;
      }

      var dataArray = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;

      function vadTick() {
        if (isDestroyed || state.status === STATE.IDLE) return;

        var rms = 0;
        if (analyserNode && dataArray) {
          analyserNode.getByteTimeDomainData(dataArray);
          rms = computeRMS(dataArray);
        } else {
          // Synthetic speech-reactive level when running in SpeechRecognition-only pipeline (e.g. iOS)
          kineticSpeechLevel = Math.max(0.04, kineticSpeechLevel * 0.91);
          var ambientBreathing = 0.025 * Math.sin(Date.now() / 320);
          rms = Math.min(1, Math.max(0, kineticSpeechLevel + ambientBreathing));
        }

        if (state.status === STATE.SPEAKING) {
          // When AI is speaking, animate orb with AI speech level
          currentAiSpeechLevel = Math.max(0.28, currentAiSpeechLevel * 0.94);
          var cadence = 0.06 * Math.sin(Date.now() / 140);
          var displayLevel = Math.min(1, currentAiSpeechLevel + cadence);
          renderOrbLevel(displayLevel);
          state.audioLevel = displayLevel;
          if (orbInstance && typeof orbInstance.setVolume === 'function') {
            orbInstance.setVolume(displayLevel);
          }
        } else {
          // In listening or connecting state, animate orb with mic/speech input
          state.audioLevel = rms;
          emit('audioLevel', rms);
          if (orbInstance && typeof orbInstance.setVolume === 'function') {
            orbInstance.setVolume(Math.min(1, rms * 3.5));
          }
          renderOrbLevel(rms);
        }

        if (!state.isMuted) {
          // 1. Listening State: Detect user speaking & silence timeout (for analyserNode mode)
          if (state.status === STATE.LISTENING && analyserNode) {
            if (rms > CONFIG.speechThreshold) {
              hasUserSpoken = true;
              if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
              }
            } else if (hasUserSpoken && (pendingTranscript.trim().length > 0)) {
              if (!silenceTimer) {
                silenceTimer = setTimeout(function () {
                  silenceTimer = null;
                  commitUserTurn();
                }, CONFIG.silenceTimeoutMs);
              }
            }
          }

          // 2. Speaking State: Detect Polite Interruption (Barge-in via acoustic analyser)
          if (state.status === STATE.SPEAKING && analyserNode) {
            var timeSpeaking = Date.now() - (aiSpeechStartTime || 0);
            if (timeSpeaking >= (CONFIG.acousticRefractoryMs || 950)) {
              if (rms > CONFIG.interruptThreshold) {
                loudFramesCount++;
                if (loudFramesCount >= CONFIG.interruptConsecutiveFrames) {
                  loudFramesCount = 0;
                  interrupt('user_acoustic_barge_in');
                }
              } else {
                loudFramesCount = Math.max(0, loudFramesCount - 1);
              }
            } else {
              loudFramesCount = 0;
            }
          }
        }

        if (typeof requestAnimationFrame === 'function') {
          vadRafId = requestAnimationFrame(vadTick);
        } else {
          vadRafId = setTimeout(vadTick, 50);
        }
      }

      vadTick();
    }

    function armSilenceTimer(isFinal) {
      if (silenceTimer) clearTimeout(silenceTimer);
      var wait = isFinal ? CONFIG.finalGraceMs : CONFIG.interimSilenceMs;
      if (utteranceStartedAt && Date.now() - utteranceStartedAt > CONFIG.maxUtteranceMs) wait = 0;
      silenceTimer = setTimeout(function () {
        silenceTimer = null;
        commitUserTurn();
      }, wait);
    }

    function normalizeUnits(s, course) {
      var tx = String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
      if (course === 'ja') {
        tx = tx.replace(/\s+/g, '');
        var grams = [];
        for (var i = 0; i + 1 < tx.length; i++) grams.push(tx.slice(i, i + 2));
        return grams;
      }
      return tx.split(/\s+/).filter(Boolean);
    }

    function countWords(s, course) {
      return course === 'ja' ? String(s || '').replace(/\s+/g, '').length / 2 : normalizeUnits(s, 'en').length;
    }

    /** Transkrip yang ≥60% unitnya ada di balasan AI yang sedang diputar = gema speaker, bukan murid. */
    function isEchoOfAi(transcript) {
      if (!currentAiText) return false;
      var a = normalizeUnits(transcript, state.course);
      if (!a.length) return false;
      var b = normalizeUnits(currentAiText, state.course);
      var set = {};
      for (var i = 0; i < b.length; i++) set[b[i]] = true;
      var hit = 0;
      for (var j = 0; j < a.length; j++) if (set[a[j]]) hit++;
      return hit / a.length >= 0.6;
    }

    function clearDuck() {
      if (duckTimer) { clearTimeout(duckTimer); duckTimer = null; }
      var cv = chatVoice();
      if (cv && typeof cv.duck === 'function') { try { cv.duck(1); } catch (_) {} }
    }

    // --- Speech Recognition Setup ---
    function setupSpeechRecognition() {
      var Ctor = root.SpeechRecognition || root.webkitSpeechRecognition;
      if (!Ctor) return;

      try {
        var rec = new Ctor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = state.course === 'ja' ? 'ja-JP' : 'en-US';

        rec.onstart = function () {
          isRecognitionRunning = true;
        };
        rec.onaudiostart = function () {
          kineticSpeechLevel = Math.max(kineticSpeechLevel, 0.35);
        };
        rec.onsoundstart = function () {
          kineticSpeechLevel = Math.max(kineticSpeechLevel, 0.55);
        };
        rec.onspeechstart = function () {
          kineticSpeechLevel = Math.max(kineticSpeechLevel, 0.75);
        };
        rec.onspeechend = function () {
          kineticSpeechLevel = 0.12;
        };
        rec.onsoundend = function () {
          kineticSpeechLevel = 0.08;
        };
        rec.onaudioend = function () {
          kineticSpeechLevel = 0.05;
        };

        rec.onresult = function (event) {
          if (state.isMuted) return;
          var finals = '';
          var interim = '';
          var lastIsFinal = false;
          lastResultsLength = event.results.length;
          // Akumulasi SEMUA hasil sesi yang belum dikirim — bukan hanya dari resultIndex
          // (Chrome memajukan resultIndex setelah segmen difinalkan; dulu segmen awal tertimpa).
          for (var i = resultOffset; i < event.results.length; i++) {
            var item = event.results[i];
            if (!item || !item[0]) continue;
            if (item.isFinal) finals += item[0].transcript + ' ';
            else interim += item[0].transcript + ' ';
            lastIsFinal = !!item.isFinal;
          }
          sessionFinals = finals.trim();
          var fresh = (finals + ' ' + interim).replace(/\s+/g, ' ').trim();
          var combined = (transcriptCarry + ' ' + fresh).replace(/\s+/g, ' ').trim();
          if (!combined) return;
          kineticSpeechLevel = 0.70 + Math.random() * 0.25;
          lastTokenFinal = lastIsFinal;

          if (state.status === STATE.SPEAKING) {
            // Barge-in lewat token SR: tolak gema suara AI sendiri dan satu kata pendek.
            if (isEchoOfAi(fresh) || countWords(fresh, state.course) < CONFIG.minBargeInWords) return;
            interrupt('user_speech_token_barge_in');
            pendingTranscript = fresh;
            state.currentTranscript = fresh;
            utteranceStartedAt = Date.now();
            emit('transcript', fresh, lastIsFinal, 'user');
            updateSubtitleUI(fresh, 'user');
            armSilenceTimer(lastIsFinal);
            return;
          }

          if (state.status !== STATE.LISTENING) return;

          pendingTranscript = combined;
          state.currentTranscript = combined;
          if (!utteranceStartedAt) utteranceStartedAt = Date.now();
          hasUserSpoken = true;
          emit('transcript', combined, lastIsFinal, 'user');
          updateSubtitleUI(combined, 'user');
          armSilenceTimer(lastIsFinal);
        };

        rec.onerror = function (event) {
          // Gracefully ignore expected harmless events
          if (event && (event.error === 'no-speech' || event.error === 'aborted')) {
            return;
          }
          if (event && event.error === 'not-allowed') {
            isPermissionPending = true;
            showMicPermissionModal(function () {
              isPermissionPending = false;
              startRecognition();
            });
            return;
          }
          emit('error', event ? event.error : 'speech_recognition_error');
        };

        rec.onend = function () {
          isRecognitionRunning = false;
          if (sessionFinals) {
            transcriptCarry = (transcriptCarry + ' ' + sessionFinals).trim();
            sessionFinals = '';
          }
          resultOffset = 0;
          lastResultsLength = 0;
          if (!isDestroyed && state.status !== STATE.IDLE && !isPermissionPending) {
            if (recognitionRestartTimer) clearTimeout(recognitionRestartTimer);
            recognitionRestartTimer = setTimeout(function () {
              recognitionRestartTimer = null;
              if (!isDestroyed && state.status !== STATE.IDLE && !isPermissionPending && recognition) {
                try { recognition.start(); } catch (_) {}
              }
            }, 80);
          }
        };

        recognition = rec;
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[VoiceCall] Speech recognition fallback:', err);
        }
      }
    }

    function startRecognition() {
      if (!recognition || isRecognitionRunning) return;
      try {
        recognition.start();
      } catch (_) {}
    }

    function stopRecognition() {
      isRecognitionRunning = false;
      if (recognitionRestartTimer) {
        clearTimeout(recognitionRestartTimer);
        recognitionRestartTimer = null;
      }
      if (!recognition) return;
      var rec = recognition;
      recognition = null;
      try {
        rec.onstart = null;
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.onaudiostart = null;
        rec.onsoundstart = null;
        rec.onspeechstart = null;
        rec.onspeechend = null;
        rec.onsoundend = null;
        rec.onaudioend = null;
      } catch (_) {}
      try {
        if (typeof rec.abort === 'function') {
          rec.abort();
        } else if (typeof rec.stop === 'function') {
          rec.stop();
        }
      } catch (_) {}
    }

    function ensureRecognitionRunning() {
      if (!recognition || isDestroyed || state.status === STATE.IDLE) return;
      try {
        recognition.start();
      } catch (_) {}
    }

    // --- Turn Processing & Hands-free Loop ---
    function commitUserTurn() {
      if (state.status !== STATE.LISTENING) return;
      var text = pendingTranscript.trim();
      if (!text) {
        if (hasUserSpoken) {
          text = state.course === 'ja' ? 'もしもし、聞こえますか？' : 'Hello, can you hear me?';
        } else {
          hasUserSpoken = false;
          return;
        }
      }

      // Reset turn buffer (hasil SR sesi berjalan sampai di sini sudah dikirim)
      pendingTranscript = '';
      hasUserSpoken = false;
      transcriptCarry = '';
      sessionFinals = '';
      resultOffset = lastResultsLength;
      lastTokenFinal = false;
      utteranceStartedAt = 0;
      loudSince = 0;
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }

      // Bangunkan server neural voice SELAGI AI berpikir, bukan setelah teksnya tiba
      var cvWarm = chatVoice();
      if (cvWarm && typeof cvWarm.warmup === 'function') { try { cvWarm.warmup(); } catch (_) {} }

      // Transition to Thinking
      setStatus(STATE.THINKING, { query: text });
      updateSubtitleUI(t('call_thinking', 'Fiezel sedang berpikir...'), 'thinking');

      // Request reply from AI partner
      var chatEngine = root.FiezelInteractiveChat;
      var replyPromise = null;

      if (chatEngine && typeof chatEngine.requestReply === 'function') {
        // Teman di telepon ingat obrolan: riwayat chat sebelum panggilan + giliran panggilan ini.
        var callHistory = [];
        try {
          if (typeof chatEngine.buildHistory === 'function' && typeof chatEngine.getState === 'function') {
            callHistory = chatEngine.buildHistory(chatEngine.getState().messages);
          }
        } catch (_) { callHistory = []; }
        (state.callTurns || []).forEach(function (tn) {
          if (tn && tn.userText) callHistory.push('u: ' + String(tn.userText).slice(0, 300));
          if (tn && tn.reply && tn.reply.text) callHistory.push('a: ' + String(tn.reply.text).slice(0, 300));
        });
        replyPromise = chatEngine.requestReply(text, state.scenarioId, state.course, {
          isPhoneCall: true,
          history: callHistory.slice(-8)
        });
      } else if (typeof root.askFiezelAIResult === 'function') {
        var scTitle = state.scenarioId;
        var p = state.course === 'ja'
          ? 'Kamu adalah Fiezel-chan (フィゼル), partner percakapan bahasa Jepang yang ramah di Tokyo.\n' +
            'Konteks skenario: ' + scTitle + '. User input: "' + text + '".\n' +
            'Jawab dalam 1-2 kalimat bahasa Jepang yang natural dan sopan. Berikan terjemahan bahasa Indonesia.'
          : 'You are Fiezel Coach, a warm and encouraging English conversational tutor.\n' +
            'Scenario: ' + scTitle + '. User input: "' + text + '".\n' +
            'Reply naturally in 1-2 friendly English sentences and provide an Indonesian translation.';
        try {
          replyPromise = root.askFiezelAIResult(p, 'question', {
            question: text,
            lessonId: 'kaiwa_' + state.scenarioId
          }).then(function (res) {
            return {
              text: res.text,
              furigana: state.course === 'ja' ? res.text : null,
              translation: t('chat_ai_direct', 'Jawaban langsung dari AI Partner FIEZEL.')
            };
          });
        } catch (_) {
          replyPromise = null;
        }
      }

      if (!replyPromise) {
        replyPromise = Promise.resolve(
          (chatEngine && typeof chatEngine.generateOfflineReply === 'function')
            ? chatEngine.generateOfflineReply(text, state.scenarioId, state.course)
            : { text: state.course === 'ja' ? 'はい、分かりました！' : 'I hear you! That sounds interesting!', translation: 'Saya mengerti!' }
        );
      }

      replyPromise.then(function (replyObj) {
        if (state.status === STATE.IDLE || isDestroyed) return; // Call was ended while thinking

        state.latestAiReply = replyObj;

        // Record turn in state.callTurns
        var turn = {
          userText: text,
          reply: replyObj,
          timestamp: Date.now()
        };
        state.callTurns.push(turn);

        deliverAiTurn(replyObj);
      }).catch(function () {
        if (state.status === STATE.IDLE || isDestroyed) return;
        var fb = {
          text: state.course === 'ja' ? 'すみません、もう一度言ってください。' : 'Sorry, could you say that again?',
          translation: t('call_retry_ask', 'Maaf, bisa tolong katakan sekali lagi?')
        };
        deliverAiTurn(fb);
      });
    }

    function deliverAiTurn(replyObj) {
      if (!setStatus(STATE.SPEAKING, { reply: replyObj })) return;

      var speechText = (replyObj && replyObj.text) ? replyObj.text : '';
      currentAiText = stripFurigana(speechText);
      loudSince = 0;
      updateSubtitleUI(speechText, 'assistant', replyObj ? replyObj.translation : '');
      emit('transcript', speechText, true, 'assistant');

      // Speak AI response
      playSpeech(speechText, state.course).then(function () {
        currentAiText = '';
        clearDuck();
        // Hands-Free Loop: If still in speaking state, return to listening after natural pause
        if (state.status === STATE.SPEAKING && !isDestroyed) {
          setTimeout(function () {
            if (state.status === STATE.SPEAKING && !isDestroyed) {
              setStatus(STATE.LISTENING);
              updateSubtitleUI(t('call_listening_hint', 'Mendengarkan... Silakan bicara.'), 'status');
              ensureRecognitionRunning();
            }
          }, CONFIG.naturalTurnPauseMs);
        }
      });
    }

    // --- Polite Interruption (Barge-in) ---
    function interrupt(reason) {
      if (state.status !== STATE.SPEAKING) return;
      state.interruptedCount++;
      if (duckTimer) { clearTimeout(duckTimer); duckTimer = null; }
      currentAiText = '';
      stopAudioPlayback();
      emit('interrupt', { timestamp: Date.now(), reason: reason || 'barge_in' });

      // Immediate polite hand-off to listening
      setStatus(STATE.LISTENING, { interrupted: true });
      updateSubtitleUI(t('call_interrupted', 'Menyimakmu...'), 'status');
      ensureRecognitionRunning();
      if (pendingTranscript.trim()) armSilenceTimer(true);
    }

    // --- Microphone Permission Guidance Modal ---
    function showMicPermissionModal(onRetry) {
      if (typeof document === 'undefined') return;
      var existing = document.getElementById('fzcMicModal');
      if (existing) existing.remove();

      var isIOS = (typeof navigator !== 'undefined') && (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      );
      var isStandalone = (typeof window !== 'undefined') && (
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true
      );

      var overlay = document.createElement('div');
      overlay.className = 'fzc-mic-modal-overlay';
      overlay.id = 'fzcMicModal';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');

      var modalTitle = isIOS
        ? esc(t('mic_modal_title_ios', 'Izinkan Akses Mikrofon di iPhone'))
        : esc(t('mic_modal_title', 'Izinkan Akses Mikrofon'));

      var modalDesc = esc(t('mic_modal_desc', 'Fiezel memerlukan izin mikrofon agar kamu bisa mengobrol dua arah dengan partner AI seperti berteleponan sungguhan.'));

      var helpContentHtml = '';
      if (isIOS) {
        if (isStandalone) {
          helpContentHtml = (
            '<div class="fzc-mic-modal-help fzc-mic-modal-help-ios">' +
            '  <strong>📱 ' + esc(t('mic_modal_ios_pwa_title', 'Panduan Izin Mikrofon (PWA iPhone):')) + '</strong>' +
            '  <div class="fzc-ios-help-step">' +
            '    <span class="fzc-step-num">1</span>' +
            '    <span>' + esc(t('mic_modal_ios_pwa_step1', 'Ketuk tombol Aktifkan Mikrofon Sekarang di bawah. Jika iPhone memunculkan dialog sistem, pilih Izinkan (Allow).')) + '</span>' +
            '  </div>' +
            '  <div class="fzc-ios-help-step">' +
            '    <span class="fzc-step-num">2</span>' +
            '    <div>' +
            '      <span>' + esc(t('mic_modal_ios_pwa_step2_title', 'Jika dialog izin tidak muncul (terblokir di sistem iOS):')) + '</span>' +
            '      <div class="fzc-ios-substeps">' +
            '        <p>• ' + esc(t('mic_modal_ios_pwa_s1', 'Buka aplikasi Pengaturan (Settings) di iPhone.')) + '</p>' +
            '        <p>• ' + esc(t('mic_modal_ios_pwa_s2', 'Pilih menu Safari -> Pengaturan untuk Situs Web -> Mikrofon.')) + '</p>' +
            '        <p>• ' + esc(t('mic_modal_ios_pwa_s3', 'Ubah status menjadi Izinkan (Allow) atau Tanya (Ask).')) + '</p>' +
            '        <p>• ' + esc(t('mic_modal_ios_pwa_s4', 'Atau buka fiezel.my.id di Safari biasa, ketuk ikon aA di bilah alamat -> Pengaturan Situs Web -> Mikrofon: Izinkan.')) + '</p>' +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</div>'
          );
        } else {
          helpContentHtml = (
            '<div class="fzc-mic-modal-help fzc-mic-modal-help-ios">' +
            '  <strong>📱 ' + esc(t('mic_modal_ios_safari_title', 'Panduan Izin Mikrofon di Safari iPhone:')) + '</strong>' +
            '  <div class="fzc-ios-help-step">' +
            '    <span class="fzc-step-num">1</span>' +
            '    <span>' + esc(t('mic_modal_ios_step1', 'Ketuk tombol di bawah, lalu pilih Izinkan saat sistem iOS meminta akses.')) + '</span>' +
            '  </div>' +
            '  <div class="fzc-ios-help-step">' +
            '    <span class="fzc-step-num">2</span>' +
            '    <span>' + esc(t('mic_modal_ios_step2', 'Jika terblokir: ketuk ikon aA di kiri bilah alamat Safari -> Pengaturan Situs Web -> Mikrofon: ubah ke Izinkan.')) + '</span>' +
            '  </div>' +
            '</div>'
          );
        }
      } else {
        helpContentHtml = (
          '<div class="fzc-mic-modal-help">' +
          '  <strong>💡 ' + esc(t('mic_modal_help_title', 'Jika izin tidak muncul atau terblokir:')) + '</strong><br>' +
          '  ' + esc(t('mic_modal_help_body', 'Ketuk ikon gembok 🔒 atau setelan di bilah alamat browser kamu, pilih "Izin Situs", lalu ubah Mikrofon menjadi "Izinkan" (Allow).')) +
          '</div>'
        );
      }

      overlay.innerHTML = (
        '<div class="fzc-mic-modal-card">' +
        '  <div class="fzc-mic-modal-icon-wrap">' +
        '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>' +
        '      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>' +
        '      <line x1="12" y1="19" x2="12" y2="22"/>' +
        '      <line x1="8" y1="22" x2="16" y2="22"/>' +
        '    </svg>' +
        '  </div>' +
        '  <h3 class="fzc-mic-modal-title">' + modalTitle + '</h3>' +
        '  <p class="fzc-mic-modal-desc">' + modalDesc + '</p>' +
        helpContentHtml +
        '  <div class="fzc-mic-modal-actions">' +
        '    <button type="button" class="fzc-mic-modal-btn-allow" id="fzcMicModalAllowBtn">' +
        '      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>' +
        '        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>' +
        '      </svg>' +
        '      <span>' + esc(t('mic_modal_btn_allow', 'Aktifkan Mikrofon Sekarang')) + '</span>' +
        '    </button>' +
        '    <button type="button" class="fzc-mic-modal-btn-dismiss" id="fzcMicModalCancelBtn">' +
        '      ' + esc(t('mic_modal_btn_cancel', 'Nanti Saja')) +
        '    </button>' +
        '  </div>' +
        '</div>'
      );

      document.body.appendChild(overlay);

      var allowBtn = overlay.querySelector('#fzcMicModalAllowBtn');
      var cancelBtn = overlay.querySelector('#fzcMicModalCancelBtn');

      if (allowBtn) {
        allowBtn.addEventListener('click', function () {
          if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(function (stream) {
                overlay.remove();
                if (typeof onRetry === 'function') {
                  onRetry(stream);
                }
              })
              .catch(function (permErr) {
                console.warn('[FiezelVoiceCall] Permission still denied after prompt:', permErr);
                if (typeof root.showToast === 'function') {
                  root.showToast(t('call_permission_denied', 'Mikrofon masih belum diizinkan. Cek setelan browser / Safari kamu.'));
                }
              });
          } else {
            overlay.remove();
            if (typeof onRetry === 'function') onRetry();
          }
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
          overlay.remove();
        });
      }
    }

    var popStateListener = null;
    var pageHideListener = null;
    var BACKNAV_LAYER_ID = 'fzc-voice-call';

    function registerBackNav() {
      unregisterBackNav();
      if (root.FiezelBackNav && typeof root.FiezelBackNav.pushLayer === 'function') {
        try {
          root.FiezelBackNav.pushLayer({
            id: BACKNAV_LAYER_ID,
            close: function () {
              end();
              return true;
            }
          });
        } catch (_) {}
      }
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        popStateListener = function () {
          if (!isDestroyed && state.status !== STATE.IDLE) {
            end();
          }
        };
        window.addEventListener('popstate', popStateListener);
        pageHideListener = function () {
          if (!isDestroyed && state.status !== STATE.IDLE) {
            end();
          }
        };
        window.addEventListener('pagehide', pageHideListener);
        window.addEventListener('beforeunload', pageHideListener);
      }
    }

    function unregisterBackNav() {
      if (root.FiezelBackNav && typeof root.FiezelBackNav.dismiss === 'function') {
        try { root.FiezelBackNav.dismiss(BACKNAV_LAYER_ID); } catch (_) {}
      }
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        if (popStateListener) {
          window.removeEventListener('popstate', popStateListener);
          popStateListener = null;
        }
        if (pageHideListener) {
          window.removeEventListener('pagehide', pageHideListener);
          window.removeEventListener('beforeunload', pageHideListener);
          pageHideListener = null;
        }
      }
    }

    // --- Lifecycle Controls ---
    function start(arg1, arg2, arg3, arg4) {
      var opts = {};
      if (typeof arg1 === 'object' && arg1 !== null) {
        opts = arg1;
      } else if (typeof arg1 === 'string') {
        opts = {
          partnerName: arg1,
          partnerAvatar: arg2,
          course: arg3,
          scenarioId: arg4
        };
      }
      state.course = opts.course || 'ja';
      state.scenarioId = opts.scenarioId || 'free';
      var resolved = resolvePersona(state.course, opts.persona || opts.personaId || opts.partnerPersona || opts.partnerVoice || state.persona);
      state.persona = resolved.id;
      state.partnerVoice = resolved.voice;
      state.partnerName = opts.partnerName || (resolved.id === 'keita' && state.course === 'ja' ? 'フィゼル先生' : resolved.name);
      state.partnerAvatar = opts.partnerAvatar || (state.course === 'ja'
        ? renderIcon('sensei', { size: 24, filled: true })
        : renderIcon('coach', { size: 24, filled: true }));
      state.isMuted = false;
      state.currentTranscript = '';
      state.latestAiReply = null;
      state.callStartTime = Date.now();
      state.durationSeconds = 0;
      state.interruptedCount = 0;
      state.callTurns = [];
      pendingTranscript = '';
      hasUserSpoken = false;
      isDestroyed = false;

      // Web Audio Autoplay Policy: unlock audio context in synchronous user gesture turn
      unlockAudio();
      try {
        var cvBoot = chatVoice();
        if (cvBoot && typeof cvBoot.probeEndpoint === 'function') cvBoot.probeEndpoint();
        if (cvBoot && typeof cvBoot.warmup === 'function') cvBoot.warmup();
      } catch (_) {}

      // Ensure any previous or transition overlay is pruned cleanly
      closeCallUI(true);

      mountOverlay();
      setStatus(STATE.CONNECTING);
      registerBackNav();

      return initMediaStream(opts.preacquiredStream)
        .then(function () {
          setupSpeechRecognition();
          startRecognition();
          startCallTimer();
          setStatus(STATE.LISTENING);
          var hint = Boolean(root.SpeechRecognition || root.webkitSpeechRecognition)
            ? t('call_connected_greeting', 'Tersambung. Silakan mulai berbicara...')
            : t('call_no_speech_rec_hint', 'Mikrofon terhubung. Bicara atau sentuh bola untuk kirim giliran.');
          updateSubtitleUI(hint, 'status');
          return true;
        })
        .catch(function (err) {
          setStatus(STATE.IDLE);
          unregisterBackNav();
          unmountOverlay(true);
          emit('error', err);
          showMicPermissionModal(function (freshStream) {
            var nextOpts = Object.assign({}, opts);
            if (freshStream) nextOpts.preacquiredStream = freshStream;
            start(nextOpts).catch(function () {});
          });
          return false;
        });
    }

    function end() {
      if (state.status === STATE.IDLE && isDestroyed) return;
      isDestroyed = true;

      unregisterBackNav();
      stopAudioPlayback();
      stopRecognition();

      if (duckTimer) { clearTimeout(duckTimer); duckTimer = null; }
      transcriptCarry = '';
      sessionFinals = '';
      resultOffset = 0;
      lastResultsLength = 0;
      currentAiText = '';

      if (vadRafId) {
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(vadRafId);
        else clearTimeout(vadRafId);
        vadRafId = null;
      }

      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }

      if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
      }

      if (callSourceNode) {
        try { callSourceNode.disconnect(); } catch (_) {}
        callSourceNode = null;
      }

      if (analyserNode) {
        try { analyserNode.disconnect(); } catch (_) {}
        analyserNode = null;
      }

      if (orbInstance) {
        try { orbInstance.detachStream(); } catch (_) {}
        try { orbInstance.setVolume(0); } catch (_) {}
      }

      if (mediaStream) {
        try {
          var tracks = mediaStream.getTracks();
          for (var i = 0; i < tracks.length; i++) {
            try { tracks[i].enabled = false; } catch (_) {}
            try { tracks[i].stop(); } catch (_) {}
          }
        } catch (_) {}
        mediaStream = null;
      }

      if (audioContext) {
        if (audioContext !== root.__fiezelSharedAudioContext) {
          try { audioContext.close(); } catch (_) {}
        }
        audioContext = null;
      }
      if (root.__fiezelSharedAudioContext && root.__fiezelSharedAudioContext.state === 'closed') {
        root.__fiezelSharedAudioContext = null;
      }

      // Zero-Loss State: Commit any pending uncommitted student transcript
      var chatEngine = root.FiezelInteractiveChat;
      var uncommitted = (transcriptCarry + ' ' + sessionFinals + ' ' + pendingTranscript).trim();
      if (uncommitted) {
        var orphanTurn = {
          userText: uncommitted,
          reply: null,
          timestamp: Date.now()
        };
        state.callTurns.push(orphanTurn);
        pendingTranscript = '';
      }

      // Synchronize full call transcript to chat
      if (chatEngine && typeof chatEngine.syncVoiceCallTurns === 'function') {
        chatEngine.syncVoiceCallTurns(state.callTurns, state.scenarioId);
      }

      var finalDuration = state.durationSeconds > 0
        ? state.durationSeconds
        : (state.callStartTime ? Math.max(1, Math.floor((Date.now() - state.callStartTime) / 1000)) : 1);
      var turns = Array.isArray(state.callTurns) ? state.callTurns.length : 0;
      var wordsSpoken = 0;
      var userUtterances = [];

      if (Array.isArray(state.callTurns)) {
        for (var i = 0; i < state.callTurns.length; i++) {
          var uText = state.callTurns[i].userText ? String(state.callTurns[i].userText).trim() : '';
          if (uText) {
            userUtterances.push({ text: uText, at: state.callTurns[i].timestamp || Date.now() });
            var wCount = state.course === 'ja'
              ? Math.max(1, Math.round(uText.replace(/\s+/g, '').length / 2.5))
              : Math.max(1, uText.split(/\s+/).filter(Boolean).length);
            wordsSpoken += wCount;
          }
        }
      }

      var fluencyPace = finalDuration > 0
        ? Math.round((wordsSpoken / finalDuration) * 60)
        : 0;

      var summary = {
        durationSeconds: finalDuration,
        interruptedCount: state.interruptedCount,
        scenarioId: state.scenarioId,
        course: state.course,
        turnsCount: turns,
        turns: turns,
        turnsList: state.callTurns.slice(),
        wordsSpoken: wordsSpoken,
        fluencyPace: fluencyPace,
        userUtterances: userUtterances
      };

      setStatus(STATE.IDLE, summary);
      emit('end', summary);

      if (chatEngine && typeof chatEngine.recordCallSession === 'function') {
        try {
          chatEngine.recordCallSession(summary);
        } catch (_) {}
      }

      unmountOverlay(true);
    }

    function setMute(muted) {
      state.isMuted = Boolean(muted);
      if (mediaStream) {
        try {
          var tracks = mediaStream.getAudioTracks();
          for (var i = 0; i < tracks.length; i++) tracks[i].enabled = !state.isMuted;
        } catch (_) {}
      }
      if (orbInstance && typeof orbInstance.toggleMute === 'function' && orbInstance.isMuted !== state.isMuted) {
        orbInstance.toggleMute(state.isMuted);
      }
      updateOverlayUI();
      return state.isMuted;
    }

    function toggleMute() {
      return setMute(!state.isMuted);
    }

    function toggleSubtitles() {
      state.showSubtitles = !state.showSubtitles;
      var subCard = overlayEl ? overlayEl.querySelector('#fzcCallSubtitleCard') : null;
      if (subCard) {
        subCard.style.display = state.showSubtitles ? 'block' : 'none';
      }
      var subBtn = overlayEl ? overlayEl.querySelector('#fzcCallBtnSub') : null;
      if (subBtn) {
        subBtn.classList.toggle('is-active', state.showSubtitles);
      }
      return state.showSubtitles;
    }

    function startCallTimer() {
      if (callTimerInterval) clearInterval(callTimerInterval);
      callTimerInterval = setInterval(function () {
        if (state.status === STATE.IDLE) return;
        state.durationSeconds = Math.floor((Date.now() - state.callStartTime) / 1000);
        updateTimerDisplay();
      }, 1000);
    }

    function formatTime(sec) {
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function updateTimerDisplay() {
      var timeStr = formatTime(state.durationSeconds);
      if (orbInstance && typeof orbInstance.setTimer === 'function') {
        orbInstance.setTimer(timeStr);
      }
      if (!overlayEl) return;
      var el = overlayEl.querySelector('#fzcCallTimer');
      if (el) el.textContent = timeStr;
    }

    // --- Animated Sci-Fi Fiezel Topographic Telemetry Background ---
    function renderCyberTopoBg() {
      return '<div class="fzc-call-cyber-bg" aria-hidden="true">' +
        '<div class="fzc-cyber-grid"></div>' +
        '<div class="fzc-radar-sweep"></div>' +
        '<svg class="fzc-cyber-topo" viewBox="0 0 390 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        '<path class="topo-gold" d="M121 120C122 123 118 128 115 131C112 133 106 134 102 134C98 135 94 136 90 135C85 135 76 135 74 132C72 130 77 124 77 120C78 116 77 113 79 110C81 107 84 103 88 102C92 101 100 101 103 103C107 104 107 109 110 112C113 115 121 117 121 120Z"/>' +
        '<path class="topo-emerald" d="M146 120C147 126 140 137 134 141C127 146 116 144 107 147C98 149 90 155 82 155C73 154 59 149 55 143C52 137 57 127 58 120C59 113 59 107 63 101C66 95 72 83 80 81C88 79 101 86 109 89C117 93 120 98 127 103C133 108 145 114 146 120Z"/>' +
        '<path class="topo-cyan" d="M171 120C172 131 164 146 154 153C144 159 126 154 112 159C98 163 83 180 71 179C59 178 45 162 39 152C33 142 35 130 35 120C36 110 38 101 44 91C50 80 59 60 70 58C82 56 100 73 113 78C126 84 139 83 149 90C159 97 171 109 171 120Z"/>' +
        '<path class="topo-whisper" d="M197 120C197 135 188 156 175 165C161 173 137 166 118 173C99 180 75 210 60 208C44 205 33 175 25 161C16 146 10 134 9 120C9 106 14 93 22 78C31 64 44 35 60 34C76 32 98 61 118 68C137 75 163 66 177 74C190 83 198 105 197 120Z"/>' +
        '<path class="topo-gold" d="M225 120C223 140 209 163 193 175C177 187 151 183 126 193C102 203 67 240 48 236C28 232 21 188 10 169C-1 150 -16 138 -19 120C-21 102 -16 81 -4 63C7 45 30 13 51 12C72 11 97 47 123 55C149 62 190 46 207 57C224 68 228 100 225 120Z"/>' +
        '<path class="topo-emerald" d="M257 120C252 144 228 167 208 183C188 200 167 209 138 221C110 234 62 268 37 261C13 254 6 203 -8 179C-22 156 -42 142 -47 120C-52 98 -53 65 -38 44C-23 23 16 -3 44 -4C73 -6 99 28 131 35C163 43 217 26 238 40C259 54 262 96 257 120Z"/>' +
        '<path class="topo-cyan" d="M292 120C284 148 243 167 220 190C197 214 186 244 154 259C122 274 60 291 29 280C-1 269 -14 219 -31 192C-49 166 -69 148 -76 120C-84 92 -97 44 -77 22C-58 -1 4 -11 40 -14C77 -16 105 1 143 7C181 13 242 5 266 23C291 42 299 92 292 120Z"/>' +
        '<path class="topo-whisper" d="M328 120C318 152 259 167 233 197C207 228 208 289 173 305C138 320 63 309 24 293C-15 277 -38 237 -60 208C-82 180 -98 155 -108 120C-118 85 -144 21 -120 -2C-96 -26 -8 -14 38 -19C85 -24 116 -35 159 -30C201 -26 265 -17 293 8C321 34 338 88 328 120Z"/>' +
        '<path class="topo-gold" d="M349 70C349 73 346 76 344 78C341 80 338 79 334 81C331 82 325 88 323 88C320 87 319 80 318 77C316 74 314 73 313 70C313 67 313 64 315 61C316 59 320 54 323 54C326 54 330 60 334 61C338 62 344 59 347 60C350 62 350 67 349 70Z"/>' +
        '<path class="topo-emerald" d="M371 70C369 76 361 80 356 85C351 89 348 93 341 96C334 100 321 108 315 106C309 104 308 90 305 84C302 78 296 76 295 70C293 64 291 55 295 50C298 45 310 40 318 40C325 40 330 48 339 49C347 51 361 46 366 49C372 53 372 64 371 70Z"/>' +
        '<path class="topo-cyan" d="M395 70C392 79 374 82 367 91C359 99 360 114 351 119C341 124 319 125 309 121C299 116 295 102 289 93C283 85 278 80 275 70C272 60 263 42 269 36C276 29 301 31 314 30C326 30 334 30 346 32C358 33 378 32 386 38C394 45 398 61 395 70Z"/>' +
        '<path class="topo-whisper" d="M422 70C417 82 389 84 379 98C369 111 376 144 363 150C351 156 319 141 304 134C288 126 277 116 268 105C259 94 255 84 250 70C245 56 230 27 240 19C250 11 291 25 310 23C330 21 340 5 357 6C373 7 397 15 408 26C418 37 427 58 422 70Z"/>' +
        '<path class="topo-gold" d="M446 70C440 86 408 89 397 108C386 127 393 177 377 183C361 189 321 156 299 145C277 134 259 130 245 118C232 106 223 89 218 70C212 51 198 13 213 3C227 -6 280 18 307 14C333 9 349 -24 369 -24C390 -24 417 -2 430 13C442 29 451 54 446 70Z"/>' +
        '<path class="topo-emerald" d="M315 300C315 302 312 303 311 306C309 309 309 315 306 315C304 316 299 312 296 310C293 309 290 309 288 307C286 305 284 303 283 300C283 297 282 293 285 291C287 290 293 293 297 292C300 291 303 286 306 286C309 286 312 290 314 292C315 294 316 298 315 300Z"/>' +
        '<path class="topo-cyan" d="M328 300C328 305 330 310 327 316C325 321 319 329 313 330C307 331 297 324 291 321C285 319 280 318 275 314C269 311 261 305 260 300C260 295 267 288 272 284C278 281 285 282 292 280C298 278 306 270 312 271C318 271 327 278 330 283C332 288 329 295 328 300Z"/>' +
        '<path class="topo-whisper" d="M341 300C342 310 358 323 354 330C350 338 330 343 318 344C307 345 295 340 285 337C275 333 267 330 258 324C249 318 228 307 229 300C230 293 254 286 263 279C272 273 274 265 284 261C293 256 308 252 319 254C330 256 345 265 349 272C352 280 340 290 341 300Z"/>' +
        '</svg>' +
        '<div class="fzc-cyber-vignette"></div>' +
        '</div>';
    }

    // --- Overlay UI DOM Implementation ---
    function mountOverlay() {
      if (overlayEl) unmountOverlay();

      var course = state.course;
      var partnerName = state.partnerName || (course === 'ja' ? 'フィゼル先生' : 'Coach Alex');

      var div = document.createElement('div');
      div.id = 'fzcCallOverlay';
      div.className = 'fzc-call-overlay is-active';
      div.innerHTML = (
        renderCyberTopoBg() +
        '<div class="fzc-call-container">' +
        // Header Bar
        '<div class="fzc-call-topbar">' +
        '<div class="fzc-call-partner-info">' +
        '<div class="fzc-call-status-dot is-connecting" id="fzcCallStatusDot"></div>' +
        '<div class="fzc-call-partner-meta-wrap">' +
        '<div class="fzc-call-partner-name" id="fzcCallPartnerName">' + esc(partnerName) + '</div>' +
        '<div class="fzc-call-timer" id="fzcCallTimer">00:00</div>' +
        '</div>' +
        '</div>' +
        renderPersonaSwitchHtml(state.course, state.persona) +
        '<button type="button" class="fzc-call-btn-mini" id="fzcCallBtnClose" aria-label="' + esc(t('call_close', 'Tutup Panggilan')) + '">' + renderIcon('close', { size: 16 }) + '</button>' +
        '</div>' +

        // Center Voice Stage
        '<div class="fzc-call-stage is-active">' +
        '<div class="fzc-voice-orb-wrapper">' +
        '<div class="fzc-gyro-orbit fzc-gyro-outer"></div>' +
        '<div class="fzc-gyro-orbit fzc-gyro-mid"></div>' +
        '<div class="fzc-gyro-orbit fzc-gyro-inner"></div>' +
        '<div class="fzc-voice-halo" id="fzcVoiceHalo"></div>' +
        '<div class="fzc-voice-orb is-connecting" id="fzcVoiceOrb" role="button" tabindex="0" aria-label="' + esc(t('call_orb_aria', 'Sentuh bola untuk menyela suara')) + '">' +
        '<div class="fzc-voice-ring-outer"></div>' +
        '<div class="fzc-voice-ring-inner"></div>' +
        '<div class="fzc-voice-core"></div>' +
        '</div>' +
        '</div>' +
        '<div class="fzc-call-status-label" id="fzcCallStatusLabel">' + t('call_connecting', 'Menghubungkan...') + '</div>' +
        '<div class="fzc-call-interrupt-hint" id="fzcCallInterruptHint">' + t('call_interrupt_hint', 'Bicara atau sentuh bola untuk menyela') + '</div>' +
        '</div>' +

        // Live Subtitle Card
        '<div class="fzc-call-subtitle-card" id="fzcCallSubtitleCard">' +
        '<div class="fzc-call-sub-text fzc-call-transcript-text" id="fzcCallSubText">' + t('call_sub_connecting', 'Mempersiapkan audio...') + '</div>' +
        '<div class="fzc-call-sub-trans" id="fzcCallSubTrans"></div>' +
        '</div>' +

        // Bottom Action Dock
        '<div class="fzc-call-dock">' +
        '<button type="button" class="fzc-call-ctrl-btn" id="fzcCallBtnMute" aria-label="' + esc(t('call_mute_mic', 'Bisukan Mikrofon')) + '">' +
        '<span class="fzc-call-btn-circle">' + renderIcon('mic', { size: 22 }) + '</span>' +
        '<span class="fzc-call-btn-lbl" id="fzcCallMuteLabel">' + t('call_lbl_mute', 'Mute') + '</span>' +
        '</button>' +
        '<button type="button" class="fzc-call-ctrl-btn is-active" id="fzcCallBtnSub" aria-label="' + esc(t('call_toggle_sub', 'Teks Terjemahan')) + '">' +
        '<span class="fzc-call-btn-circle">' + renderIcon('translate', { size: 22 }) + '</span>' +
        '<span class="fzc-call-btn-lbl">' + t('call_lbl_sub', 'Teks') + '</span>' +
        '</button>' +
        '<button type="button" class="fzc-call-ctrl-btn is-end" id="fzcCallBtnEnd" aria-label="' + esc(t('call_end_aria', 'Akhiri Panggilan')) + '">' +
        '<span class="fzc-call-btn-circle is-end-btn">' + renderIcon('phone-off', { size: 26, color: '#FFFFFF' }) + '</span>' +
        '<span class="fzc-call-btn-lbl">' + t('call_lbl_end', 'Akhiri') + '</span>' +
        '</button>' +
        '</div>' +
        '</div>'
      );

      document.body.appendChild(div);
      overlayEl = div;
      bindOverlayEvents(div);
    }

    function closeCallUI(immediate) {
      if (orbInstance) {
        try { orbInstance.close(); } catch (_) {}
        try { orbInstance.destroy(); } catch (_) {}
        orbInstance = null;
      }
      var targets = [];
      if (typeof document !== 'undefined') {
        try {
          var found = document.querySelectorAll(
            '#fzcCallOverlay, .fzc-call-overlay, .fzc-call-stage, .fzc-call-screen, .fzc-voice-orb-canvas, #fzcMicModal'
          );
          for (var i = 0; i < found.length; i++) targets.push(found[i]);
        } catch (_) {}
        if (overlayEl && targets.indexOf(overlayEl) < 0) targets.push(overlayEl);

        try {
          var callContainers = document.querySelectorAll('.fzc-container.is-call-active, body.is-call-active');
          for (var c = 0; c < callContainers.length; c++) {
            callContainers[c].classList.remove('is-call-active');
          }
        } catch (_) {}
      } else if (overlayEl) {
        targets.push(overlayEl);
      }

      overlayEl = null;

      for (var tIdx = 0; tIdx < targets.length; tIdx++) {
        var el = targets[tIdx];
        if (!el) continue;
        if (immediate !== false) {
          if (el.parentNode) el.parentNode.removeChild(el);
        } else {
          el.classList.add('is-closing');
          (function (targetNode) {
            setTimeout(function () {
              if (targetNode && targetNode.parentNode) {
                targetNode.parentNode.removeChild(targetNode);
              }
            }, 220);
          })(el);
        }
      }
    }

    function unmountOverlay(immediate) {
      closeCallUI(immediate !== false);
    }

    function bindOverlayEvents(container) {
      if (!container) return;

      // Web Audio Autoplay Policy: unlock audio on touch/click
      container.addEventListener('click', unlockAudio, { passive: true });
      container.addEventListener('touchstart', unlockAudio, { passive: true });

      var btnEnd = container.querySelector('#fzcBtnEndCall') || container.querySelector('#fzcCallBtnEnd');
      if (btnEnd) btnEnd.onclick = function () { end(); };

      var btnClose = container.querySelector('#fzcCallBtnClose');
      if (btnClose) btnClose.onclick = function () { end(); };

      var btnMute = container.querySelector('#fzcCallBtnMute');
      if (btnMute) {
        btnMute.onclick = function () {
          var muted = toggleMute();
          btnMute.classList.toggle('is-muted', muted);
          var lbl = container.querySelector('#fzcCallMuteLabel');
          if (lbl) lbl.textContent = muted ? t('call_lbl_unmute', 'Buka Mic') : t('call_lbl_mute', 'Mute');
        };
      }

      var btnSub = container.querySelector('#fzcCallBtnSub');
      if (btnSub) btnSub.onclick = function () { toggleSubtitles(); };

      var orb = container.querySelector('#fzcVoiceOrb');
      if (orb) {
        orb.onclick = function () {
          unlockAudio();
          if (state.status === STATE.SPEAKING) {
            interrupt('user_tap_orb_barge_in');
          } else if (state.status === STATE.LISTENING && pendingTranscript.trim()) {
            commitUserTurn();
          }
        };
      }

      var personaBtns = container.querySelectorAll('.fzc-call-persona-btn');
      for (var pb = 0; pb < personaBtns.length; pb++) {
        (function (pBtn) {
          pBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var targetPersona = pBtn.getAttribute('data-persona');
            if (targetPersona) {
              setPersona(targetPersona);
            }
          });
        })(personaBtns[pb]);
      }
    }

    function setPersona(personaKey) {
      var resolved = resolvePersona(state.course, personaKey);
      if (!resolved) return null;
      if (PERSONAS.en && PERSONAS.en[resolved.id]) {
        state.course = 'en';
      } else if (PERSONAS.ja && PERSONAS.ja[resolved.id]) {
        state.course = 'ja';
      }
      state.persona = resolved.id;
      state.partnerVoice = resolved.voice;
      state.partnerName = (resolved.id === 'keita' && state.course === 'ja') ? 'フィゼル先生' : resolved.name;
      state.partnerAvatar = state.course === 'ja'
        ? renderIcon('sensei', { size: 24, filled: true })
        : renderIcon('coach', { size: 24, filled: true });

      try {
        localStorage.setItem('fz_persona_' + state.course, resolved.id);
      } catch (_) {}

      var chatEngine = root.FiezelInteractiveChat;
      if (chatEngine && typeof chatEngine.setPersona === 'function') {
        try { chatEngine.setPersona(resolved.id, state.course); } catch (_) {}
      }

      updatePersonaUI();
      emit('personaChange', {
        persona: resolved.id,
        partnerName: state.partnerName,
        voice: resolved.voice,
        course: state.course
      });
      return resolved;
    }

    function updatePersonaUI() {
      if (!overlayEl) return;
      var nameEl = overlayEl.querySelector('#fzcCallPartnerName') || overlayEl.querySelector('.fzc-call-partner-name');
      if (nameEl) {
        nameEl.textContent = state.partnerName;
      }
      var btns = overlayEl.querySelectorAll('.fzc-call-persona-btn');
      for (var i = 0; i < btns.length; i++) {
        var pId = btns[i].getAttribute('data-persona');
        var isActive = pId === state.persona;
        btns[i].classList.toggle('is-active', isActive);
        btns[i].setAttribute('aria-checked', isActive ? 'true' : 'false');
      }
    }

    function updateOverlayUI() {
      if (!overlayEl) return;

      var stage = overlayEl.querySelector('.fzc-call-stage');
      var orb = overlayEl.querySelector('#fzcVoiceOrb');
      var dot = overlayEl.querySelector('#fzcCallStatusDot');
      var label = overlayEl.querySelector('#fzcCallStatusLabel');
      var hint = overlayEl.querySelector('#fzcCallInterruptHint');

      updatePersonaUI();

      var statusClass = 'is-' + state.status;
      if (state.isMuted) statusClass += ' is-muted';

      if (stage) {
        stage.className = 'fzc-call-stage is-active fzc-orb--' + state.status;
      }
      if (orb) {
        orb.className = 'fzc-voice-orb ' + statusClass;
      }
      if (dot) {
        dot.className = 'fzc-call-status-dot ' + statusClass;
      }

      if (label) {
        label.className = 'fzc-call-status-label ' + statusClass;
        if (state.status === STATE.CONNECTING) label.textContent = t('call_connecting', 'Menghubungkan...');
        else if (state.status === STATE.LISTENING) label.textContent = t('call_listening', 'Mendengarkan...');
        else if (state.status === STATE.THINKING) label.textContent = t('call_thinking', 'Fiezel berpikir...');
        else if (state.status === STATE.SPEAKING) label.textContent = t('call_speaking', 'Fiezel berbicara...');
        else label.textContent = '';
      }

      if (hint) {
        hint.style.display = state.status === STATE.SPEAKING ? 'block' : 'none';
      }
    }

    function updateSubtitleUI(text, role, translation) {
      var displayText = stripFurigana(text);
      if (orbInstance && typeof orbInstance.setTranscript === 'function') {
        orbInstance.setTranscript(displayText, translation, role);
      }
      if (!overlayEl) return;
      var subText = overlayEl.querySelector('#fzcCallSubText');
      var subTrans = overlayEl.querySelector('#fzcCallSubTrans');

      if (subText) {
        subText.textContent = displayText || '';
      }

      if (subTrans) {
        if (translation) {
          subTrans.textContent = translation;
          subTrans.style.display = 'block';
        } else {
          subTrans.textContent = '';
          subTrans.style.display = 'none';
        }
      }
    }

    function renderOrbLevel(rms) {
      if (!overlayEl) return;
      var stage = overlayEl.querySelector('.fzc-call-stage');
      var orbWrapper = overlayEl.querySelector('.fzc-voice-orb-wrapper');
      var orb = overlayEl.querySelector('#fzcVoiceOrb');
      var halo = overlayEl.querySelector('#fzcVoiceHalo');
      if (!orb || !halo) return;

      var vol = Math.max(0, Math.min(1, Number(rms) || 0));
      var scale = 1 + Math.min(vol * 1.8, 0.45);
      var haloOpacity = Math.min(0.2 + vol * 1.5, 0.85);

      orb.style.transform = 'scale(' + scale.toFixed(3) + ')';
      halo.style.opacity = haloOpacity.toFixed(2);
      halo.style.transform = 'scale(' + (scale * 1.25).toFixed(3) + ')';

      if (orbWrapper) {
        orbWrapper.style.setProperty('--fzc-voice-level', vol.toFixed(3));
      }
      if (stage) {
        stage.style.setProperty('--fzc-voice-level', vol.toFixed(3));
      }
    }

    function testSimulateTurn(userText) {
      if (state.status !== STATE.LISTENING) {
        setStatus(STATE.LISTENING);
      }
      pendingTranscript = userText;
      state.currentTranscript = userText;
      emit('transcript', userText, true, 'user');
      updateSubtitleUI(userText, 'user');
      return new Promise(function (resolve) {
        commitUserTurn();
        var unlisten = function () {
          off('stateChange', onState);
        };
        var onState = function (next) {
          if (next === STATE.SPEAKING || next === STATE.LISTENING) {
            unlisten();
            resolve(next);
          }
        };
        on('stateChange', onState);
        setTimeout(function () {
          unlisten();
          resolve(state.status);
        }, 2500);
      });
    }

    return {
      STATE: STATE,
      getState: function () {
        return Object.assign({}, state);
      },
      on: on,
      off: off,
      start: start,
      startCall: start,
      end: end,
      endCall: end,
      endVoiceCall: end,
      closeCallUI: closeCallUI,
      interrupt: interrupt,
      toggleMute: toggleMute,
      setMute: setMute,
      toggleSubtitles: toggleSubtitles,
      commitUserTurn: commitUserTurn,
      computeRMS: computeRMS,
      unlockAudio: unlockAudio,
      playSpeech: playSpeech,
      setPersona: setPersona,
      getPersona: function () {
        return resolvePersona(state.course, state.persona);
      },
      getPersonas: function (c) {
        return PERSONAS[c || state.course || 'ja'];
      },
      PERSONAS: PERSONAS,
      showMicPermissionModal: showMicPermissionModal,
      _testSetStatus: function (status, meta) {
        if (status === STATE.SPEAKING && meta && meta.reply && meta.reply.text) {
          currentAiText = stripFurigana(meta.reply.text);
        }
        return setStatus(status, meta, true);
      },
      _testCommitTurn: commitUserTurn,
      _testSimulateTurn: testSimulateTurn,
      _testSetState: function (patch) { if (patch && typeof patch === 'object') Object.assign(state, patch); }
    };
  }

  // Singleton Instance for Application
  var defaultInstance = createVoiceCallEngine();

  // Root API Export
  var api = {
    STATE: STATE,
    PERSONAS: PERSONAS,
    createEngine: createVoiceCallEngine,
    start: function (options) { return defaultInstance.start(options); },
    startCall: function (options) { return defaultInstance.start(options); },
    end: function () { return defaultInstance.end(); },
    endCall: function () { return defaultInstance.end(); },
    endVoiceCall: function () { return defaultInstance.end(); },
    closeCallUI: function (immediate) { return defaultInstance.closeCallUI(immediate); },
    cleanup: function () { return defaultInstance.end(); },
    interrupt: function (reason) { return defaultInstance.interrupt(reason); },
    toggleMute: function () { return defaultInstance.toggleMute(); },
    setMute: function (muted) { return defaultInstance.setMute(muted); },
    toggleSubtitles: function () { return defaultInstance.toggleSubtitles(); },
    getState: function () { return defaultInstance.getState(); },
    setPersona: function (persona) { return defaultInstance.setPersona(persona); },
    getPersona: function () { return defaultInstance.getPersona(); },
    getPersonas: function (c) { return defaultInstance.getPersonas(c); },
    showMicPermissionModal: function (onRetry) { return defaultInstance.showMicPermissionModal(onRetry); },
    on: function (evt, fn) { defaultInstance.on(evt, fn); },
    off: function (evt, fn) { defaultInstance.off(evt, fn); },
    computeRMS: computeRMS,
    unlockAudio: function () { return defaultInstance.unlockAudio(); },
    playSpeech: function (text, course) { return defaultInstance.playSpeech(text, course); },
    _testSetStatus: function (status, meta) { return defaultInstance._testSetStatus(status, meta); },
    _testCommitTurn: function () { return defaultInstance._testCommitTurn(); },
    _testSimulateTurn: function (text) { return defaultInstance._testSimulateTurn(text); },
    _testSetState: function (patch) { return defaultInstance._testSetState(patch); }
  };

  // Auto-teardown on mobile app switch / page hide / back navigation
  function handleGlobalTeardown() {
    if (defaultInstance && typeof defaultInstance.end === 'function') {
      var curSt = defaultInstance.getState ? defaultInstance.getState().status : null;
      if (curSt && curSt !== STATE.IDLE) {
        defaultInstance.end();
      }
    }
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', handleGlobalTeardown);
    window.addEventListener('beforeunload', handleGlobalTeardown);
    window.addEventListener('popstate', handleGlobalTeardown);
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', function () {
        // Layar padam / pindah app sebentar: panggilan TIDAK diputus. Saat kembali, mic dihidupkan lagi.
        if (document.visibilityState === 'visible' && defaultInstance) {
          var st = defaultInstance.getState ? defaultInstance.getState().status : null;
          if (st && st !== STATE.IDLE) defaultInstance.unlockAudio();
        }
      });
    }
  }

  return api;
}));
