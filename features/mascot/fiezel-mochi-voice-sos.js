/**
 * features/mascot/fiezel-mochi-voice-sos.js — In-Quiz Live Mochi Voice SOS & Socratic Lifeline
 *
 * Implements an interactive live voice tutor companion inside quiz and practice stages:
 * 1. Comic Thought Bubble: Floats gracefully beside Mochi's head without overlapping face.
 * 2. Authentic Two-Way Audio Duplex via Gemini Multimodal Live API:
 *    - Model: `models/gemini-3.8-live` on `GenerativeService.BidiGenerateContentConstrained`
 *    - Voice: `Puck` (high-clarity playful Daifuku companion voice)
 *    - Dual-Key Protocol: Reads user key from `localStorage` (`fz_gemini_api_key`) or fetches
 *      ephemeral session token from `/api/voice/live-session` (16-key rotation pool).
 *    - Live Duplex Streaming: Streams 16kHz PCM16 mic frames (`realtimeInput.audio`) and
 *      plays scheduled 24kHz PCM16 audio chunks with duplex barge-in interruption.
 *    - Socratic Scaffolding: Guides student with grammar concepts without revealing answer letters.
 * 3. Minimalist Visualizer: Small, elegant soundwave pulses directly under Mochi's feet (Zero-Text Card).
 * 4. Gem Wallet & Dev Mode: Non-destructive local dev mode with authentic balance display (Zero-State-Pollution).
 * 5. Full Bilingual Localization: Indonesian (id) and Thai (th) via FiezelI18n.
 * 6. Anti-Leak Exam Invariant: Strictly locked on placement tests and official certification exams.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FiezelMochiVoiceSos = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function (root) {
  'use strict';

  var GEM_COST = 20;
  var CASHBACK_REWARD = 5;
  var MISTAP_THRESHOLD_MS = 6000;

  var _activeCall = null;
  var _audioCtx = null;
  var _micStream = null;
  var _micProcessor = null;
  var _ws = null;
  var _activeAudioSources = [];
  var _nextAudioPlayTime = 0;
  var _currentAudio = null;
  var _silenceTimer = null;

  var COPY_ID = {
    'mochi-sos.bubble-tap': 'Ketuk aku',
    'mochi-sos.bubble-title': 'Diskusi suara langsung dengan Mochi',
    'mochi-sos.badge-free': 'Gratis',
    'mochi-sos.call-title': 'Bantuan Suara Mochi',
    'mochi-sos.call-listening': 'Mochi sedang mendengar...',
    'mochi-sos.call-speaking': 'Mochi sedang menjelaskan...',
    'mochi-sos.call-close-title': 'Ketuk untuk tutup panggilan',
    'mochi-sos.toast-insufficient': 'Gem belum cukup ({balance}/{cost} 💎). Selesaikan latihan untuk kumpulkan Gem!',
    'mochi-sos.toast-refund': 'Panggilan singkat: {cost} Gem dikembalikan 💎',
    'mochi-sos.toast-cashback': 'Sugoi! Jawaban benar: Cashback +{reward} Gem didapatkan! 🎉',
    'mochi-sos.intro-title': 'Bantuan Suara Langsung Mochi! ✨',
    'mochi-sos.intro-body': 'Jika merasa bingung saat latihan, cukup ketuk Mochi untuk berdiskusi dan meminta panduan suara tanpa merusak kuis!',
    'mochi-sos.intro-btn': 'Paham, Mulai Latihan!',
    'mochi-sos.guide-rule-prefix': 'Tips dari Mochi: ',
    'mochi-sos.guide-concept-prefix': 'Pertanyaan ini melatih konsep "{concept}". Perhatikan pola kata kerja atau partikel penanda ya!',
    'mochi-sos.guide-default': 'Mochi siap bantu! Coba perhatikan partikel penunjuk waktu atau arah di kalimat ini ya!',
    'mochi-sos.exam-locked': 'Tes mandiri: Mochi istirahat dulu saat ujian/tes awal ya!'
  };

  var COPY_TH = {
    'mochi-sos.bubble-tap': 'แตะฉันสิ',
    'mochi-sos.bubble-title': 'คุยสดกับโมจิเพื่อขอคำแนะนำ',
    'mochi-sos.badge-free': 'ฟรี',
    'mochi-sos.call-title': 'โมจิคอลล์',
    'mochi-sos.call-listening': 'โมจิกำลังฟังอยู่...',
    'mochi-sos.call-speaking': 'โมจิกำลังอธิบาย...',
    'mochi-sos.call-close-title': 'แตะเพื่อวางสาย',
    'mochi-sos.toast-insufficient': 'เจมไม่พอ ({balance}/{cost} 💎) ฝึกฝนต่อเพื่อสะสมเจมนะ!',
    'mochi-sos.toast-refund': 'สายสั้น: คืน {cost} เจมแล้ว 💎',
    'mochi-sos.toast-cashback': 'สุดยอด! ตอบถูก: รับเงินคืน +{reward} เจม! 🎉',
    'mochi-sos.intro-title': 'ตัวช่วยเสียงสดโมจิ! ✨',
    'mochi-sos.intro-body': 'หากสงสัยข้อไหน แตะโมจิเพื่อรับคำอธิบายเสียงแบบไม่บอกคำตอบตรงๆ ได้เลย!',
    'mochi-sos.intro-btn': 'เข้าใจแล้ว เริ่มฝึกเลย!',
    'mochi-sos.guide-rule-prefix': 'คำแนะนำจากโมจิ: ',
    'mochi-sos.guide-concept-prefix': 'ข้อนี้ทดสอบแนวคิด "{concept}" ลองดูรูปแบบคำหรือคำช่วยนะ!',
    'mochi-sos.guide-default': 'โมจิพร้อมช่วย! ลองสังเกตคำช่วยบอกเวลาหรือทิศทางในประโยคนี้นะ!',
    'mochi-sos.exam-locked': 'ทำด้วยตัวเองนะ โมจิพักผ่อนระหว่างทำแบบทดสอบจ้า!'
  };

  // Safe registration in canonical FiezelI18n
  if (root && root.FiezelI18n && typeof root.FiezelI18n.registerCopy === 'function') {
    try {
      root.FiezelI18n.registerCopy('id', COPY_ID);
      root.FiezelI18n.registerCopy('th', COPY_TH);
    } catch (_) {}
  }

  function getDoc() {
    return typeof document !== 'undefined' ? document : null;
  }

  function getState() {
    try {
      if (typeof root.__getFiezelState === 'function') return root.__getFiezelState();
      if (root.state) return root.state;
    } catch (_) {}
    return null;
  }

  function getLocale() {
    try {
      if (root.FiezelI18n && typeof root.FiezelI18n.getLocale === 'function') {
        return root.FiezelI18n.getLocale();
      }
      var state = getState();
      if (state && state.preferences && state.preferences.learnerLocale) {
        return state.preferences.learnerLocale;
      }
    } catch (_) {}
    return 'id';
  }

  function getGemBalance() {
    var state = getState();
    if (!state) return 120;
    if (state.gems != null) {
      if (typeof state.gems === 'number') return state.gems;
      if (typeof state.gems.balance === 'number') return state.gems.balance;
    }
    return 120;
  }

  function t(key, fallback, vars) {
    var s;
    try {
      var I = (typeof self !== 'undefined' ? self : (typeof root !== 'undefined' ? root : this)).FiezelI18n;
      s = I && I.t ? I.t(key, vars) : undefined;
    } catch (_) {}
    if (s === undefined || s === key) {
      var loc = 'id';
      try {
        if (typeof getLocale === 'function') loc = getLocale();
        else {
          var I2 = (typeof self !== 'undefined' ? self : (typeof root !== 'undefined' ? root : this)).FiezelI18n;
          if (I2 && typeof I2.getLocale === 'function') loc = I2.getLocale();
        }
      } catch (_) {}
      var map = loc === 'th' ? (typeof COPY_TH !== 'undefined' ? COPY_TH : {}) : (typeof COPY_ID !== 'undefined' ? COPY_ID : {});
      s = map[key] || (fallback == null ? key : fallback);
    }
    if (vars && typeof vars === 'object') {
      s = String(s).replace(/\{(\w+)\}/g, function (m, n) {
        return Object.prototype.hasOwnProperty.call(vars, n) ? String(vars[n]) : m;
      });
    }
    return s;
  }

  function isLocalEnv() {
    try {
      if (!root.location) return false;
      var h = root.location.hostname;
      return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local');
    } catch (_) {
      return false;
    }
  }

  function getAudioContext() {
    if (!_audioCtx && (root.AudioContext || root.webkitAudioContext)) {
      var AC = root.AudioContext || root.webkitAudioContext;
      _audioCtx = new AC();
    }
    return _audioCtx;
  }

  function playTone(freq, durationSec, type) {
    try {
      var ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(function () {});
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationSec);
    } catch (_) {}
  }

  function playChime(kind) {
    if (kind === 'connect') {
      playTone(523.25, 0.12, 'sine'); // C5
      setTimeout(function () { playTone(659.25, 0.18, 'sine'); }, 110); // E5
      setTimeout(function () { playTone(783.99, 0.25, 'sine'); }, 220); // G5
    } else if (kind === 'disconnect') {
      playTone(783.99, 0.12, 'sine');
      setTimeout(function () { playTone(523.25, 0.22, 'sine'); }, 120);
    } else if (kind === 'cashback') {
      playTone(659.25, 0.1, 'triangle');
      setTimeout(function () { playTone(880.00, 0.12, 'triangle'); }, 90);
      setTimeout(function () { playTone(1174.66, 0.25, 'triangle'); }, 180);
    }
  }

  // --- AUDIO PROCESSING & DUPLEX HELPERS ---

  function float32ToPcm16Base64(float32) {
    var int16 = new Int16Array(float32.length);
    for (var i = 0; i < float32.length; i++) {
      var s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    var bytes = new Uint8Array(int16.buffer);
    var binary = '';
    var len = bytes.byteLength;
    for (var j = 0; j < len; j++) {
      binary += String.fromCharCode(bytes[j]);
    }
    if (typeof btoa === 'function') return btoa(binary);
    if (root && typeof root.btoa === 'function') return root.btoa(binary);
    if (typeof Buffer !== 'undefined') return Buffer.from(binary, 'binary').toString('base64');
    return '';
  }

  function resampleAndConvertToPcm16Base64(float32, fromRate, toRate) {
    toRate = toRate || 16000;
    fromRate = fromRate || toRate;
    if (fromRate === toRate) {
      return float32ToPcm16Base64(float32);
    }
    var ratio = fromRate / toRate;
    var newLength = Math.max(1, Math.floor(float32.length / ratio));
    var int16 = new Int16Array(newLength);
    for (var i = 0; i < newLength; i++) {
      var originIdx = i * ratio;
      var low = Math.floor(originIdx);
      var high = Math.min(low + 1, float32.length - 1);
      var weight = originIdx - low;
      var sample = (1 - weight) * float32[low] + weight * float32[high];
      var s = Math.max(-1, Math.min(1, sample));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    var bytes = new Uint8Array(int16.buffer);
    var binary = '';
    var len = bytes.byteLength;
    for (var j = 0; j < len; j++) {
      binary += String.fromCharCode(bytes[j]);
    }
    if (typeof btoa === 'function') return btoa(binary);
    if (root && typeof root.btoa === 'function') return root.btoa(binary);
    if (typeof Buffer !== 'undefined') return Buffer.from(binary, 'binary').toString('base64');
    return '';
  }

  function pcm16Base64ToAudioBuffer(ctx, base64, sampleRate) {
    sampleRate = sampleRate || 24000;
    var decodeFn = typeof atob === 'function' ? atob : (root && typeof root.atob === 'function' ? root.atob : null);
    var binary = '';
    if (decodeFn) {
      binary = decodeFn(base64);
    } else if (typeof Buffer !== 'undefined') {
      binary = Buffer.from(base64, 'base64').toString('binary');
    }
    if (!binary) return null;

    var len = binary.length;
    var samples = Math.floor(len / 2);
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    var view = new DataView(bytes.buffer, bytes.byteOffset, samples * 2);
    var float32 = new Float32Array(samples);
    for (var j = 0; j < samples; j++) {
      float32[j] = view.getInt16(j * 2, true) / 32768.0;
    }
    var buffer = ctx.createBuffer(1, samples, sampleRate);
    buffer.getChannelData(0).set(float32);
    return buffer;
  }

  function getUserGeminiApiKey() {
    try {
      if (typeof localStorage !== 'undefined') {
        var k = localStorage.getItem('fz_gemini_api_key') ||
                localStorage.getItem('gemini_api_key') ||
                localStorage.getItem('GEMINI_API_KEY');
        if (k && k.trim().length > 10) return k.trim();
      }
    } catch (_) {}
    return '';
  }

  function resolveVoiceApiBases() {
    var bases = [];
    var isLocal = isLocalEnv();
    if (isLocal) {
      bases.push('');
    }
    var cfBase = (root.FIEZEL_CF_CONFIG && root.FIEZEL_CF_CONFIG.base) || 'https://api.fiezel.my.id';
    if (cfBase) {
      bases.push(cfBase.replace(/\/$/, ''));
    }
    return Array.from(new Set(bases));
  }

  function fetchLiveSessionToken() {
    var userKey = getUserGeminiApiKey();
    if (userKey) {
      return Promise.resolve({
        ok: true,
        directKey: true,
        endpoint: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?key=' + encodeURIComponent(userKey)
      });
    }

    var bases = resolveVoiceApiBases();
    var tryBase = function (index) {
      if (index >= bases.length) {
        return Promise.resolve({ ok: false });
      }
      var base = bases[index];
      var url = (base ? base : '') + '/api/voice/live-session';
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }).then(function (res) {
        if (!res.ok) return tryBase(index + 1);
        return res.json().then(function (data) {
          if (data && data.ok && data.token) {
            var ep = data.endpoint || 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';
            return {
              ok: true,
              directKey: false,
              endpoint: ep + '?access_token=' + encodeURIComponent(data.token)
            };
          }
          return tryBase(index + 1);
        });
      }).catch(function () {
        return tryBase(index + 1);
      });
    };

    return tryBase(0);
  }

  function buildMochiSystemPrompt(q, locale) {
    q = q || {};
    var rule = String(q.explain && q.explain.rule ? q.explain.rule : '');
    var concept = String(q.concept || q.skill || '');
    var stem = String(q.stem || q.prompt || q.question || '');
    var opts = Array.isArray(q.options) ? q.options.map(function(o, idx) {
      return String.fromCharCode(65 + idx) + ': ' + (typeof o === 'string' ? o : (o.text || JSON.stringify(o)));
    }).join(' | ') : '';

    return [
      'Kamu adalah Mochi, maskot Daifuku bulat putih yang imut, ceria, hangat, dan sangat cerdas dari FIEZEL.',
      'Suaramu ramah, bersemangat, menggemaskan, dan sabar (Prebuilt Puck Voice). Berbicaralah dalam Bahasa ' + (locale === 'th' ? 'Thailand' : 'Indonesia') + '.',
      '',
      '[Situasi Saat Ini]: Murid sedang mengerjakan kuis dan mengetuk kamu (Mochi Voice SOS) untuk meminta bantuan suara.',
      '[Quiz Item]: "' + stem + '"',
      opts ? ('[Pilihan di Layar]: ' + opts) : '',
      concept ? ('[Konsep Target]: ' + concept) : '',
      rule ? ('[Aturan Tata Bahasa / Petunjuk Inti]: ' + rule) : '',
      '',
      '[INVARIAN SOKRATIK MUTLAK - ZERO SPOILING]:',
      '1. DILARANG KERAS membocorkan atau menyebutkan huruf pilihan jawaban (misal "jawabannya B", "pilih C", "huruf D").',
      '2. DILARANG menyebutkan kalimat jawaban lengkap secara langsung.',
      '3. Berikan bimbingan sokratik bertahap: Jelaskan fungsi partikel, makna kata kunci, atau perbedaan nuansa kalimat dalam 1-2 kalimat pendek dan ceria.',
      '4. Dorong murid untuk berpikir dan memilih sendiri.',
      '5. Jika murid berbicara ke mikrofon ("artinya apa Mochi?", "aku bingung", "kenapa bukan yang ini?"), dengarkan baik-baik dan jawab dengan ramah, hangat, dan membantu.',
      '6. Jaga durasi setiap respon kamu tetap ringkas (15-30 kata) agar murid tidak lelah mendengarkan.'
    ].filter(Boolean).join('\n');
  }

  function stopAllActiveAudioSources() {
    for (var i = 0; i < _activeAudioSources.length; i++) {
      try {
        _activeAudioSources[i].stop();
        _activeAudioSources[i].disconnect();
      } catch (_) {}
    }
    _activeAudioSources = [];
    var ctx = getAudioContext();
    if (ctx) {
      _nextAudioPlayTime = ctx.currentTime;
    }
    apiInstance._setVoiceVisualizerSpeaking(false);
  }

  var apiInstance = {
    isCallActive: function () {
      return !!(_activeCall && _activeCall.active);
    },

    canCall: function (opts) {
      opts = opts || {};
      var state = getState();

      // Rule 4 §5: Anti-Leak Exam Invariant
      if (opts.isPlacement || opts.measureMode || opts.examLock) {
        return {
          allowed: false,
          reason: 'exam_lock',
          cost: 0,
          badge: 'Lock',
          message: t('mochi-sos.exam-locked', 'Tes mandiri: Mochi istirahat dulu saat ujian/tes awal ya!')
        };
      }

      var currentBalance = getGemBalance();

      // Local development mode: allow testing without corrupting persistent state
      if (isLocalEnv()) {
        return {
          allowed: true,
          isWelcomePass: false,
          cost: 0,
          balance: currentBalance,
          badge: String(currentBalance)
        };
      }

      if (!state) {
        return { allowed: true, cost: 0, isWelcomePass: true, badge: t('mochi-sos.badge-free', 'Gratis') };
      }

      // Welcome Pass for placement or first sessions
      var isWelcomePass = !state.placementVoicePassUsed && (state.level === undefined || state.level <= 1);
      if (isWelcomePass) {
        return {
          allowed: true,
          isWelcomePass: true,
          cost: 0,
          balance: currentBalance,
          badge: t('mochi-sos.badge-free', 'Gratis')
        };
      }

      if (currentBalance >= GEM_COST) {
        return {
          allowed: true,
          isWelcomePass: false,
          cost: GEM_COST,
          balance: currentBalance,
          badge: GEM_COST + ' 💎'
        };
      }

      return {
        allowed: false,
        reason: 'insufficient_gems',
        balance: currentBalance,
        cost: GEM_COST,
        message: t('mochi-sos.toast-insufficient', 'Gem belum cukup ({balance}/{cost} 💎). Selesaikan latihan untuk kumpulkan Gem!', {
          balance: currentBalance,
          cost: GEM_COST
        })
      };
    },

    spendForCall: function (sessionId, isWelcomePass) {
      var state = getState();
      if (!state || isLocalEnv() || isWelcomePass) return { ok: true, spent: 0 };

      var current = getGemBalance();
      if (current >= GEM_COST) {
        if (state.gems && typeof state.gems.balance === 'number') {
          state.gems.balance -= GEM_COST;
        } else if (typeof state.gems === 'number') {
          state.gems -= GEM_COST;
        } else {
          state.gems = { balance: Math.max(0, current - GEM_COST) };
        }
        try { if (typeof root.save === 'function') root.save(); } catch (_) {}
        this.updateTopbarGem();
        return { ok: true, spent: GEM_COST };
      }
      return { ok: true, spent: 0 };
    },

    refundMisTap: function () {
      var state = getState();
      if (!state || isLocalEnv() || !_activeCall || _activeCall.isWelcomePass) return;
      var current = getGemBalance();
      if (state.gems && typeof state.gems.balance === 'number') {
        state.gems.balance += GEM_COST;
      } else if (typeof state.gems === 'number') {
        state.gems += GEM_COST;
      } else {
        state.gems = { balance: current + GEM_COST };
      }
      try { if (typeof root.save === 'function') root.save(); } catch (_) {}
      this.updateTopbarGem();
      try {
        if (typeof root.showToast === 'function') {
          root.showToast(t('mochi-sos.toast-refund', 'Panggilan singkat: {cost} Gem dikembalikan 💎', { cost: GEM_COST }), 'info');
        }
      } catch (_) {}
    },

    awardCashback: function () {
      var state = getState();
      if (!state) return;
      var current = getGemBalance();
      if (state.gems && typeof state.gems.balance === 'number') {
        state.gems.balance += CASHBACK_REWARD;
      } else if (typeof state.gems === 'number') {
        state.gems += CASHBACK_REWARD;
      } else {
        state.gems = { balance: current + CASHBACK_REWARD };
      }
      try { if (typeof root.save === 'function') root.save(); } catch (_) {}
      this.updateTopbarGem();
      playChime('cashback');
      try {
        if (typeof root.showToast === 'function') {
          root.showToast(t('mochi-sos.toast-cashback', 'Sugoi! Jawaban benar: Cashback +{reward} Gem didapatkan! 🎉', { reward: CASHBACK_REWARD }), 'success');
        }
      } catch (_) {}
    },

    updateTopbarGem: function () {
      var doc = getDoc();
      if (!doc) return;
      var el = doc.getElementById('quizTopbarGemCount');
      if (!el) return;
      var balance = getGemBalance();
      el.textContent = balance.toLocaleString('id-ID');
    },

    buildSocraticGuidance: function (q, learnerSpoken) {
      q = q || {};
      var rule = String(q.explain && q.explain.rule ? q.explain.rule : '');
      var concept = String(q.concept || q.skill || '');

      if (rule) {
        return t('mochi-sos.guide-rule-prefix', 'Tips dari Mochi: ') + rule;
      }
      if (concept) {
        return t('mochi-sos.guide-concept-prefix', 'Pertanyaan ini melatih konsep "{concept}". Perhatikan pola kata kerja atau partikel penanda ya!', { concept: concept });
      }
      return t('mochi-sos.guide-default', 'Mochi siap bantu! Coba perhatikan partikel penunjuk waktu atau arah di kalimat ini ya!');
    },

    startCall: function (q, opts) {
      if (this.isCallActive()) {
        this.closeCall('toggle');
        return;
      }

      q = q || (root.__fzActiveQuiz && root.__fzActiveQuiz.q) || null;
      var can = this.canCall(opts);
      if (!can.allowed) {
        playTone(330, 0.2, 'sawtooth');
        try {
          if (typeof root.showToast === 'function') {
            root.showToast(can.message, 'warn');
          }
        } catch (_) {}
        return;
      }

      var sessionId = 'sos-' + Date.now().toString(36);
      this.spendForCall(sessionId, can.isWelcomePass);

      _activeCall = {
        active: true,
        sessionId: sessionId,
        startedAt: Date.now(),
        isWelcomePass: !!can.isWelcomePass,
        question: q,
        answered: false
      };

      playChime('connect');
      this.renderUnderMochiVoiceVisualizer(true);
      this._updateMochiMascotPose('happy');

      // Hide thought bubble cleanly when active call starts (Zero Overlap & Status Invariant)
      var bubble = getDoc() ? getDoc().getElementById('fzMochiThoughtBubble') : null;
      if (bubble) {
        bubble.classList.add('is-call-active');
      }

      // Resume Web Audio context immediately inside user gesture click
      var ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }

      // Start authentic Gemini Multimodal Live duplex audio session
      this._startGeminiLiveDuplex(q);
    },

    _startGeminiLiveDuplex: function (q) {
      var self = this;
      var ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }

      // 1. Microphone acquisition
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        }).then(function (stream) {
          if (!self.isCallActive()) {
            stream.getTracks().forEach(function (t) { t.stop(); });
            return;
          }
          _micStream = stream;
          self._wireMicrophoneStream(stream);
        }).catch(function (err) {
          console.warn('[Mochi Voice SOS] Mic permission unavailable (listen-only mode):', err);
        });
      }

      // 2. Fetch Gemini Live token / endpoint
      fetchLiveSessionToken().then(function (session) {
        if (!self.isCallActive()) return;
        if (!session || !session.ok || !session.endpoint) {
          console.warn('[Mochi Voice SOS] Gemini Live endpoint unavailable, fallback to speech.');
          self._fallbackSpeechTurn(q);
          return;
        }

        self._connectLiveWebSocket(session.endpoint, q);
      }).catch(function (err) {
        console.warn('[Mochi Voice SOS] Error fetching live token:', err);
        self._fallbackSpeechTurn(q);
      });
    },

    _wireMicrophoneStream: function (stream) {
      var ctx = getAudioContext();
      if (!ctx) return;

      try {
        var micSource = ctx.createMediaStreamSource(stream);
        var proc = ctx.createScriptProcessor ? ctx.createScriptProcessor(4096, 1, 1) : null;
        if (!proc) return;
        _micProcessor = proc;

        proc.onaudioprocess = function (e) {
          if (!_activeCall || !_activeCall.active) return;
          if (!_ws || _ws.readyState !== 1) return; // WebSocket.OPEN === 1

          var float32 = e.inputBuffer.getChannelData(0);

          // Energy detection for duplex barge-in (interruption)
          var sum = 0;
          for (var i = 0; i < float32.length; i++) {
            sum += float32[i] * float32[i];
          }
          var rms = Math.sqrt(sum / float32.length);

          if (rms > 0.015 && _activeAudioSources.length > 0) {
            // Student started speaking -> barge in immediately locally
            stopAllActiveAudioSources();
          }

          var pcmBase64 = resampleAndConvertToPcm16Base64(float32, ctx.sampleRate || 48000, 16000);
          if (pcmBase64) {
            try {
              _ws.send(JSON.stringify({
                realtimeInput: {
                  audio: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: pcmBase64
                  }
                }
              }));
            } catch (_) {}
          }
        };

        micSource.connect(proc);
        var silentGain = ctx.createGain();
        silentGain.gain.value = 0.00001;
        proc.connect(silentGain);
        silentGain.connect(ctx.destination);
      } catch (err) {
        console.warn('[Mochi Voice SOS] Mic wiring error:', err);
      }
    },

    _connectLiveWebSocket: function (endpoint, q) {
      var self = this;
      var WS = root.WebSocket || (typeof window !== 'undefined' ? window.WebSocket : null);
      if (!WS) {
        self._fallbackSpeechTurn(q);
        return;
      }

      try {
        var ws = new WS(endpoint);
        ws.binaryType = 'arraybuffer';
        _ws = ws;

        ws.onopen = function () {
          var locale = getLocale();
          var sysPrompt = buildMochiSystemPrompt(q, locale);

          // Standard Gemini Multimodal Live setup frame
          ws.send(JSON.stringify({
            setup: {
              model: 'models/gemini-3.8-live',
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: 'Puck'
                    }
                  }
                }
              },
              outputAudioTranscription: {},
              inputAudioTranscription: {},
              systemInstruction: {
                parts: [{ text: sysPrompt }]
              }
            }
          }));
        };

        ws.onmessage = function (event) {
          self._handleLiveWsMessage(event, q);
        };

        ws.onerror = function (e) {
          console.warn('[Mochi Voice SOS] WebSocket error:', e);
        };

        ws.onclose = function () {
          stopAllActiveAudioSources();
        };
      } catch (err) {
        console.warn('[Mochi Voice SOS] WebSocket creation error:', err);
        self._fallbackSpeechTurn(q);
      }
    },

    _handleLiveWsMessage: function (event, q) {
      var self = this;
      var parseAndHandle = function (rawText) {
        try {
          var msg = JSON.parse(rawText);

          // Setup confirmation -> send opening turn so Mochi speaks greeting & initial hint immediately
          if (msg.setupComplete) {
            if (_ws && _ws.readyState === 1) {
              _ws.send(JSON.stringify({
                clientContent: {
                  turns: [{
                    role: 'user',
                    parts: [{
                      text: '[Instruksi: Sapa murid dengan ceria sebagai Mochi dan berikan petunjuk awal sokratik singkat untuk soal ini tanpa menyebutkan pilihan jawaban benar!]'
                    }]
                  }],
                  turnComplete: true
                }
              }));
            }
          }

          // Barge-in interruption from Gemini Live server
          if (msg.serverContent && msg.serverContent.interrupted) {
            stopAllActiveAudioSources();
          }

          // Incoming audio chunks (24kHz PCM16)
          if (msg.serverContent && msg.serverContent.modelTurn && msg.serverContent.modelTurn.parts) {
            for (var i = 0; i < msg.serverContent.modelTurn.parts.length; i++) {
              var part = msg.serverContent.modelTurn.parts[i];
              if (part.inlineData && part.inlineData.data) {
                self._scheduleAudioChunk(part.inlineData.data);
              }
            }
          }
        } catch (_) {}
      };

      if (typeof event.data === 'string') {
        parseAndHandle(event.data);
      } else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
        if (typeof event.data.text === 'function') {
          event.data.text().then(parseAndHandle).catch(function () {});
        } else {
          var reader = new FileReader();
          reader.onload = function () {
            parseAndHandle(reader.result);
          };
          reader.readAsText(event.data);
        }
      } else if (typeof ArrayBuffer !== 'undefined' && event.data instanceof ArrayBuffer) {
        try {
          var decoded = (typeof TextDecoder !== 'undefined') ? new TextDecoder().decode(event.data) : '';
          if (decoded) parseAndHandle(decoded);
        } catch (_) {}
      }
    },

    _scheduleAudioChunk: function (base64Pcm16) {
      try {
        console.log('[Mochi Voice SOS] Received audio chunk from Gemini Live Puck voice (length: ' + base64Pcm16.length + ')');
      } catch (_) {}
      var ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }

      var buffer = pcm16Base64ToAudioBuffer(ctx, base64Pcm16, 24000);
      if (!buffer) return;

      var source = ctx.createBufferSource();
      source.buffer = buffer;

      // 80ms jitter buffer lead for smooth audio continuity
      var now = ctx.currentTime;
      if (_nextAudioPlayTime < now + 0.02) {
        _nextAudioPlayTime = now + 0.08;
      }
      var startAt = _nextAudioPlayTime;
      _nextAudioPlayTime = startAt + buffer.duration;

      source.connect(ctx.destination);
      source.start(startAt);
      _activeAudioSources.push(source);
      this._setVoiceVisualizerSpeaking(true);

      var self = this;
      source.onended = function () {
        _activeAudioSources = _activeAudioSources.filter(function (s) { return s !== source; });
        if (_activeAudioSources.length === 0) {
          self._setVoiceVisualizerSpeaking(false);
        }
      };
    },

    _fallbackSpeechTurn: function (q) {
      var initialAdvice = this.buildSocraticGuidance(q);
      this.speakMochiTurn(initialAdvice);
    },

    closeCall: function (reason) {
      if (!_activeCall) return;
      var call = _activeCall;
      _activeCall = null;

      var duration = Date.now() - call.startedAt;
      if (!call.answered && duration < MISTAP_THRESHOLD_MS && !call.isWelcomePass && reason !== 'answered_correct') {
        this.refundMisTap();
      }

      playChime('disconnect');
      this.renderUnderMochiVoiceVisualizer(false);
      this._updateMochiMascotPose('idle');

      // Restore thought bubble visibility
      var bubble = getDoc() ? getDoc().getElementById('fzMochiThoughtBubble') : null;
      if (bubble && reason !== 'answered_correct') {
        bubble.classList.remove('is-call-active');
      }

      // Teardown live duplex streams & audio
      stopAllActiveAudioSources();

      if (_micStream) {
        try {
          _micStream.getTracks().forEach(function (t) { t.stop(); });
        } catch (_) {}
        _micStream = null;
      }

      if (_micProcessor) {
        try { _micProcessor.disconnect(); } catch (_) {}
        _micProcessor = null;
      }

      if (_ws) {
        try {
          if (_ws.readyState === 1) _ws.close(1000, 'call_closed');
        } catch (_) {}
        _ws = null;
      }

      if (_currentAudio) {
        try { _currentAudio.pause(); } catch (_) {}
        _currentAudio = null;
      }
    },

    toggleCall: function (q, opts) {
      if (this.isCallActive()) {
        this.closeCall('user_tapped');
      } else {
        this.startCall(q, opts);
      }
    },

    onQuestionAnswered: function (ok, q) {
      if (!this.isCallActive()) return;
      _activeCall.answered = true;
      var self = this;

      if (ok) {
        this._updateMochiMascotPose('happy');
        if (!_activeCall.isWelcomePass) {
          this.awardCashback();
        }
        setTimeout(function () {
          self.closeCall('answered_correct');
          self.removeThoughtBubble();
        }, 1800);
      } else {
        this._updateMochiMascotPose('pout');
        setTimeout(function () {
          self.closeCall('answered_wrong');
        }, 2600);
      }
    },

    speakMochiTurn: function (text, onComplete) {
      if (!this.isCallActive()) return;
      var self = this;
      self._setVoiceVisualizerSpeaking(true);

      // Web Speech Synthesis (Graceful fallback)
      if (root.speechSynthesis && root.SpeechSynthesisUtterance) {
        try {
          root.speechSynthesis.cancel();
          var isThai = getLocale() === 'th';
          var ut = new root.SpeechSynthesisUtterance(text);
          ut.lang = isThai ? 'th-TH' : 'id-ID';
          ut.rate = 1.05;
          ut.pitch = 1.15;

          ut.onend = function () {
            self._setVoiceVisualizerSpeaking(false);
            if (typeof onComplete === 'function') onComplete();
          };
          ut.onerror = function () {
            self._setVoiceVisualizerSpeaking(false);
            if (typeof onComplete === 'function') onComplete();
          };

          root.speechSynthesis.speak(ut);
          return;
        } catch (_) {}
      }

      // Fallback timer when speech synthesis unavailable
      setTimeout(function () {
        self._setVoiceVisualizerSpeaking(false);
        if (typeof onComplete === 'function') onComplete();
      }, 2200);
    },

    _setVoiceVisualizerSpeaking: function (isSpeaking) {
      var doc = getDoc();
      if (!doc) return;
      var el = doc.getElementById('fzMochiVoiceUnder');
      if (el) {
        if (isSpeaking) el.classList.add('is-speaking');
        else el.classList.remove('is-speaking');
      }
    },

    _updateMochiMascotPose: function (pose) {
      try {
        if (typeof root.pawStagePose === 'function') {
          root.pawStagePose('.quiz-stage fiezel-mascot, .fz-paw-above fiezel-mascot', pose);
        }
      } catch (_) {}
    },

    // UI Mount: Comic Thought Bubble
    mountThoughtBubble: function (q) {
      var doc = getDoc();
      if (!doc) return;

      var slot = doc.querySelector('.fz-paw-side fiezel-mascot, .quiz-stage fiezel-mascot, .quiz-shell fiezel-mascot, fiezel-mascot');
      if (!slot) {
        slot = doc.querySelector('.fz-paw-side .fz-paw-slot, .quiz-stage .fz-paw-slot, .quiz-shell .fz-paw-slot, .fz-paw-slot, .quiz-mascot');
      }
      if (!slot) {
        slot = doc.querySelector('.quiz-stage');
      }
      if (!slot) return;

      slot.style.position = 'relative';
      slot.style.overflow = 'visible';

      var existing = doc.getElementById('fzMochiThoughtBubble');
      if (existing) {
        if (slot.contains(existing)) {
          if (this.isCallActive()) existing.classList.add('is-call-active');
          else existing.classList.remove('is-call-active');
          return;
        } else {
          existing.remove();
        }
      }

      var bubble = doc.createElement('button');
      bubble.type = 'button';
      bubble.id = 'fzMochiThoughtBubble';
      bubble.className = 'fz-mochi-thought-bubble' + (this.isCallActive() ? ' is-call-active' : '');
      bubble.setAttribute('aria-label', t('mochi-sos.bubble-tap', 'Ketuk aku'));
      bubble.setAttribute('title', t('mochi-sos.bubble-title', 'Diskusi suara langsung dengan Mochi'));

      bubble.innerHTML = [
        '<span class="fz-thought-trail-2" aria-hidden="true"></span>',
        '<span class="fz-thought-trail-1" aria-hidden="true"></span>',
        '<span class="fz-thought-dot" aria-hidden="true"></span>',
        '<span class="fz-thought-text">' + t('mochi-sos.bubble-tap', 'Ketuk aku') + '</span>'
      ].join('');

      var self = this;
      bubble.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        self.toggleCall(q);
      };

      slot.appendChild(bubble);
    },

    removeThoughtBubble: function () {
      var doc = getDoc();
      if (!doc) return;
      var existing = doc.getElementById('fzMochiThoughtBubble');
      if (existing) existing.remove();
    },

    // UI Mount: Minimalist Under-Mochi Soundwave
    renderUnderMochiVoiceVisualizer: function (visible) {
      var doc = getDoc();
      if (!doc) return;

      var existing = doc.getElementById('fzMochiVoiceUnder');
      if (!visible) {
        if (existing) existing.remove();
        return;
      }

      if (existing) return;

      var slot = doc.querySelector('.fz-paw-side fiezel-mascot, .quiz-stage fiezel-mascot, .quiz-shell fiezel-mascot, fiezel-mascot');
      if (!slot) {
        slot = doc.querySelector('.fz-paw-side .fz-paw-slot, .quiz-stage .fz-paw-slot, .quiz-shell .fz-paw-slot, .fz-paw-slot, .quiz-mascot');
      }
      if (!slot) {
        slot = doc.querySelector('.quiz-stage');
      }
      if (!slot) return;

      slot.style.position = 'relative';
      slot.style.overflow = 'visible';

      var wave = doc.createElement('div');
      wave.id = 'fzMochiVoiceUnder';
      wave.className = 'fz-mochi-voice-under';
      wave.setAttribute('aria-label', t('mochi-sos.call-title', 'Bantuan Suara Mochi'));
      wave.setAttribute('title', t('mochi-sos.call-close-title', 'Ketuk untuk tutup panggilan'));

      wave.innerHTML = [
        '<span class="sw-bar b-1"></span>',
        '<span class="sw-bar b-2"></span>',
        '<span class="sw-bar b-3"></span>',
        '<span class="sw-bar b-4"></span>',
        '<span class="sw-bar b-5"></span>',
        '<span class="sw-bar b-6"></span>',
        '<span class="sw-bar b-7"></span>'
      ].join('');

      var self = this;
      wave.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        self.closeCall('user_tapped');
      };

      slot.appendChild(wave);
    },

    // UI Mount: Welcome Educational Modal
    showIntroIfNeeded: function () {
      var state = getState();
      if (!state) return;

      var seen = Number(state.mochiIntroSeenCount || 0);
      if (seen >= 2) return;

      var doc = getDoc();
      if (!doc || doc.getElementById('fzMochiSosIntroModal')) return;

      var scrim = doc.createElement('div');
      scrim.id = 'fzMochiSosIntroModal';
      scrim.className = 'fz-mochi-sos-intro-scrim';

      scrim.innerHTML = [
        '<div class="fz-mochi-sos-intro-card" role="dialog" aria-modal="true">',
        '  <div class="fz-mochi-sos-intro-icon">',
        '    <svg width="40" height="40" viewBox="0 0 100 100" fill="none">',
        '      <ellipse cx="50" cy="85" rx="30" ry="7" fill="rgba(217,119,6,0.15)"/>',
        '      <path d="M50 18C30 18 18 34 18 58C18 78 32 82 50 82C68 82 82 78 82 58C82 34 70 18 50 18Z" fill="#FFFDF8" stroke="#F59E0B" stroke-width="2.5"/>',
        '      <ellipse cx="32" cy="60" rx="6" ry="4" fill="#FDA4AF"/>',
        '      <ellipse cx="68" cy="60" rx="6" ry="4" fill="#FDA4AF"/>',
        '      <circle cx="37" cy="50" r="4.5" fill="#0F172A"/>',
        '      <circle cx="63" cy="50" r="4.5" fill="#0F172A"/>',
        '      <path d="M46 58C48 60 52 60 54 58" stroke="#0F172A" stroke-width="2" stroke-linecap="round"/>',
        '      <path d="M22 44C22 28 32 18 50 18C68 18 78 28 78 44" stroke="#3B82F6" stroke-width="3" stroke-linecap="round"/>',
        '      <rect x="18" y="40" width="6" height="12" rx="3" fill="#2563EB"/>',
        '      <rect x="76" y="40" width="6" height="12" rx="3" fill="#2563EB"/>',
        '    </svg>',
        '  </div>',
        '  <h3 class="fz-mochi-sos-intro-title">' + t('mochi-sos.intro-title', 'Bantuan Suara Langsung Mochi! ✨') + '</h3>',
        '  <p class="fz-mochi-sos-intro-body">' + t('mochi-sos.intro-body', 'Jika merasa bingung saat latihan, cukup ketuk Mochi untuk berdiskusi dan meminta panduan suara tanpa merusak kuis!') + '</p>',
        '  <button type="button" class="fz-mochi-sos-intro-btn" id="fzMochiSosIntroClose">' + t('mochi-sos.intro-btn', 'Paham, Mulai Latihan!') + '</button>',
        '</div>'
      ].join('');

      doc.body.appendChild(scrim);

      doc.getElementById('fzMochiSosIntroClose').onclick = function () {
        state.mochiIntroSeenCount = (Number(state.mochiIntroSeenCount) || 0) + 1;
        try { if (typeof root.save === 'function') root.save(); } catch (_) {}
        scrim.remove();
      };
    }
  };

  // Safe auto-mounting & self-healing observer for quiz lifecycle
  function checkAndAutoMount() {
    var doc = getDoc();
    if (!doc) return;
    var quizShell = doc.querySelector('.quiz-shell');
    if (!quizShell) return;

    var state = getState();
    // Rule 4 §5: Anti-Leak Exam Invariant
    if (state && (state.placementActive || state.examActive || (root.__fzActiveQuiz && (root.__fzActiveQuiz.isPlacement || root.__fzActiveQuiz.measureMode || root.__fzActiveQuiz.noHints)))) {
      apiInstance.removeThoughtBubble();
      return;
    }

    var bubble = doc.getElementById('fzMochiThoughtBubble');
    if (!bubble) {
      apiInstance.mountThoughtBubble();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(checkAndAutoMount, 60);
      });
    } else {
      setTimeout(checkAndAutoMount, 60);
    }

    try {
      var appEl = document.getElementById('app') || document.body;
      if (appEl && typeof MutationObserver !== 'undefined') {
        var autoObs = new MutationObserver(function () {
          checkAndAutoMount();
        });
        autoObs.observe(appEl, { childList: true, subtree: true });
      }
    } catch (_) {}
  }

  return apiInstance;
});
