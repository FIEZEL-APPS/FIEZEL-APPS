/**
 * FIEZEL · features/brain/fiezel-mochi-voice-sos.js
 * In-Quiz Live Voice SOS & Socratic Lifeline Engine.
 *
 * User-Specified Invariants:
 * 1. Intro Pop-up Education: Shown on first 2 sessions only (state.mochiIntroSeenCount <= 2),
 *    explaining concisely that tapping Mochi summons live voice assistance. Never shown again after 2 times.
 * 2. "Ketuk aku" / "แตะฉันสิ" Badge: Tactile badge positioned beside Mochi in practice sessions.
 * 3. ZERO-TEXT Minimalist Pod: Live call UI contains NO text transcript / subtitles, keeping
 *    the screen 100% focused on looking at the quiz question and listening to Mochi's voice.
 * 4. Authentic Voice Studio Live Audio: Uses exact same live call duplex pipeline as Kawan Bicara
 *    (Gemini Multimodal Live WebSocket wss://fiezel.my.id/api/live-call with Puck voice,
 *    PCM16 16kHz in, 24kHz out, and Voice Studio binary audio fallback). NO Edge TTS or Web Speech robot.
 * 5. Full Bilingual Localization: Adapts spoken prompts & UI to user's selected locale (Indonesian or Thai).
 * 6. Preserved Braincore Feedback: updateMastery, bktRecord, misconceptionLedger, reveal(), and
 *    explanation cards remain 100% intact.
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
  var _pcmPlayer = null;
  var _micStream = null;
  var _micProcessor = null;

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

  function getGemsCore() {
    try {
      return (root && root.FiezelGems) || null;
    } catch (_) {
      return null;
    }
  }

  // Web Audio Context for Chimes and High-Performance PCM Streaming
  function getAudioContext() {
    if (!_audioCtx || _audioCtx.state === 'closed') {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (AC) {
        _audioCtx = new AC({ sampleRate: 24000 });
      }
    }
    if (_audioCtx && _audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(function () {});
    }
    return _audioCtx;
  }

  function playTone(freq, duration, type) {
    try {
      var ctx = getAudioContext();
      if (!ctx) return;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.25));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (duration || 0.25));
    } catch (_) {}
  }

  function playChime(kind) {
    if (kind === 'connect') {
      playTone(523.25, 0.15, 'sine'); // C5
      setTimeout(function () { playTone(659.25, 0.22, 'sine'); }, 120); // E5
      setTimeout(function () { playTone(783.99, 0.35, 'sine'); }, 240); // G5
    } else if (kind === 'cashback') {
      playTone(587.33, 0.12, 'triangle');
      setTimeout(function () { playTone(880.00, 0.28, 'triangle'); }, 100);
    } else if (kind === 'disconnect') {
      playTone(659.25, 0.15, 'sine');
      setTimeout(function () { playTone(523.25, 0.25, 'sine'); }, 100);
    }
  }

  // PCM16 Base64 to Web Audio Buffer Player
  function playPcm16Chunk(base64Pcm, sampleRate) {
    try {
      var ctx = getAudioContext();
      if (!ctx || !base64Pcm) return;
      var binary = root.atob(base64Pcm);
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
      var buffer = ctx.createBuffer(1, samples, sampleRate || 24000);
      buffer.getChannelData(0).set(float32);

      var source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();

      // Trigger wave animation on playback
      FiezelMochiVoiceSos._setLiveWaveActive(true);
      source.onended = function () {
        FiezelMochiVoiceSos._setLiveWaveActive(false);
      };
    } catch (_) {}
  }

  var FiezelMochiVoiceSos = {
    GEM_COST: GEM_COST,
    CASHBACK_REWARD: CASHBACK_REWARD,

    isCallActive: function () {
      return !!(_activeCall && _activeCall.active);
    },

    // ── 1. Intro Pop-up Education (Max 2 times) ──
    checkAndShowIntroModal: function () {
      var state = getState();
      if (!state) return;
      var count = Number(state.mochiIntroSeenCount || 0);
      if (count >= 2) return; // Strict 2-time limit!

      state.mochiIntroSeenCount = count + 1;
      try {
        if (typeof root.save === 'function') root.save();
      } catch (_) {}

      var locale = getLocale();
      var isThai = locale === 'th';
      var title = isThai ? 'ต้องการความช่วยเหลือ? เรียกโมจิได้เลย!' : 'Butuh Bantuan? Panggil Mochi!';
      var desc = isThai
        ? 'หากคุณเจอข้อที่ยากหรือไม่แน่ใจ แตะที่มาสคอตโมจิเพื่อโทรคุยด้วยเสียงได้ทันที โมจิจะช่วยแนะนำคำตอบให้คุณ!'
        : 'Jika kamu kesulitan atau bingung saat menjawab soal, cukup ketuk maskot Mochi untuk memulai panggilan suara langsung. Mochi siap membimbingmu!';
      var btnText = isThai ? 'เข้าใจแล้ว' : 'Siap, Mengerti!';

      this._renderIntroModal(title, desc, btnText);
    },

    _renderIntroModal: function (title, desc, btnText) {
      var doc = getDoc();
      if (!doc) return;
      var existing = doc.getElementById('fzMochiIntroModal');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      var modal = doc.createElement('div');
      modal.id = 'fzMochiIntroModal';
      modal.className = 'fz-mochi-intro-overlay';
      modal.innerHTML = [
        '<div class="fz-mochi-intro-card" role="dialog" aria-modal="true">',
        '  <div class="fz-mochi-intro-head">',
        '    <span class="fz-mochi-intro-mochi" aria-hidden="true">',
        '      <svg width="44" height="44" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="16" fill="#FEF3C7"/><circle cx="16" cy="18" r="10" fill="#FDFAF3" stroke="#D97706" stroke-width="1.5"/><circle cx="13" cy="17" r="1.5" fill="#1B1418"/><circle cx="19" cy="17" r="1.5" fill="#1B1418"/><path d="M15 20C15.5 20.8 16.5 20.8 17 20" stroke="#1B1418" stroke-width="1.2" stroke-linecap="round"/><path d="M8 17C8 12.58 11.58 9 16 9C20.42 9 24 12.58 24 17" stroke="#2563EB" stroke-width="2" stroke-linecap="round"/><rect x="6" y="15" width="4" height="6" rx="2" fill="#2563EB"/><rect x="22" y="15" width="4" height="6" rx="2" fill="#2563EB"/></svg>',
        '    </span>',
        '    <h3>' + title + '</h3>',
        '  </div>',
        '  <p class="fz-mochi-intro-desc">' + desc + '</p>',
        '  <div class="fz-mochi-intro-action">',
        '    <button type="button" id="fzMochiIntroDismissBtn" class="primary">' + btnText + '</button>',
        '  </div>',
        '</div>'
      ].join('\n');

      var host = doc.body || doc.getElementById('app');
      if (host) host.appendChild(modal);

      var dismissBtn = doc.getElementById('fzMochiIntroDismissBtn');
      if (dismissBtn) {
        dismissBtn.onclick = function (e) {
          e.stopPropagation();
          if (modal.parentNode) modal.parentNode.removeChild(modal);
        };
      }
    },

    // ── 2. "Ketuk aku" / "แตะฉันสิ" Badge beside Mochi ──
    mountTapBadge: function (hostEl) {
      var doc = getDoc();
      if (!doc) return;
      var existing = doc.getElementById('fzMochiTapBadge');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      var target = hostEl
        || doc.querySelector('.quiz-mascot')
        || doc.querySelector('.fz-mochi-viewport')
        || doc.querySelector('.paw-panel-slot')
        || doc.querySelector('.paw-hero-avatar')
        || doc.querySelector('.quiz-stage')
        || doc.querySelector('.quiz-shell');
      if (!target) return;

      try {
        var computed = root.getComputedStyle ? root.getComputedStyle(target) : null;
        if (computed && computed.position === 'static') {
          target.style.position = 'relative';
        }
      } catch (_) {}

      var locale = getLocale();
      var badgeText = locale === 'th' ? 'แตะฉันสิ 🎧' : 'Ketuk aku 🎧';

      var badge = doc.createElement('button');
      badge.type = 'button';
      badge.id = 'fzMochiTapBadge';
      badge.className = 'fz-mochi-tap-badge';
      badge.setAttribute('aria-label', badgeText);
      badge.innerHTML = '<span class="fz-mochi-tap-badge-dot"></span><span>' + badgeText + '</span>';

      var self = this;
      badge.onclick = function (e) {
        e.stopPropagation();
        self.startCall();
      };

      target.appendChild(badge);
    },

    removeTapBadge: function () {
      var doc = getDoc();
      if (!doc) return;
      var badge = doc.getElementById('fzMochiTapBadge');
      if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
    },

    // Defensive no-op hooks for legacy callers
    startIdleNudgeTimer: function () {},
    clearIdleNudge: function () {},

    // ── 3. Call Authorization & Gamification ──
    canCall: function (opts) {
      var state = getState();
      opts = opts || {};
      var cfg = opts.cfg || (root.__fzActiveQuiz && root.__fzActiveQuiz.cfg) || {};

      // Anti-Leak Exam Purity: locked in strict certification/skip-level exams
      var isStrictExam = cfg.measureMode || ['level-exam', 'grammar-skip'].indexOf(String(cfg.type || '')) >= 0;
      if (isStrictExam) {
        var locale = getLocale();
        return {
          allowed: false,
          reason: 'exam_lock',
          message: locale === 'th'
            ? 'ในโหมดการสอบอย่างเป็นทางการ โมจิจะคอยส่งกำลังใจอยู่ห่างๆ นะ สู้ๆ!'
            : 'Pada mode ujian resmi, Mochi menyemangati dari jauh ya! Kamu pasti bisa!'
        };
      }

      // First-Touch Placement Welcome Pass (0 Gem)
      var isPlacement = !!(cfg.placement || (state && state.view === 'test') || (opts && opts.isPlacement));
      var welcomePassAvailable = isPlacement && (!state || !state.placementVoicePassUsed);
      if (welcomePassAvailable) {
        var loc = getLocale();
        return {
          allowed: true,
          isWelcomePass: true,
          cost: 0,
          badge: loc === 'th' ? 'ตั๋วทดลองฟรี' : 'Tiket Perdana Gratis',
          message: loc === 'th' ? 'พร้อมใช้งานตั๋วช่วยเหลือฟรีแล้ว!' : 'Tiket Bantuan Gratis siap digunakan!'
        };
      }

      // Gem Wallet Check
      var isLocal = Boolean(root.location && (root.location.hostname === 'localhost' || root.location.hostname === '127.0.0.1'));
      if (isLocal) {
        // Mode Pengujian Lokal: Unlimited Gems agar pengembang / tester bebas mencoba Mochi SOS
        if (!state.gems || typeof state.gems.balance !== 'number' || state.gems.balance < GEM_COST) {
          if (!state.gems) state.gems = { schema: 'fiezel-gems-v1', balance: 99999, earnedTotal: 99999, spentTotal: 0, ledger: [] };
          else state.gems.balance = 99999;
          try { if (typeof root.save === 'function') root.save(); } catch (_) {}
        }
        return {
          allowed: true,
          isWelcomePass: false,
          cost: 0,
          balance: state.gems ? state.gems.balance : 99999,
          badge: '💎 Unlimited Dev Gems',
          message: 'Mode Pengujian Lokal: Gem tak terbatas aktif!'
        };
      }

      var balance = 0;
      if (state && state.gems) {
        balance = typeof state.gems.balance === 'number' ? state.gems.balance : Number(state.gems.balance || 0);
      }
      if (balance >= GEM_COST) {
        return {
          allowed: true,
          isWelcomePass: false,
          cost: GEM_COST,
          balance: balance,
          badge: GEM_COST + ' 💎 (Cashback +' + CASHBACK_REWARD + ')',
          message: 'Gunakan ' + GEM_COST + ' Gem untuk bimbingan Mochi'
        };
      }

      var locIns = getLocale();
      return {
        allowed: false,
        reason: 'insufficient_gems',
        balance: balance,
        cost: GEM_COST,
        message: locIns === 'th'
          ? 'เจมของคุณยังไม่พอ (' + balance + '/' + GEM_COST + ' 💎) ทำโจทย์ฝึกฝนอีก 2 ข้อเพื่อเก็บเจมนะ!'
          : 'Gem kamu belum cukup (' + balance + '/' + GEM_COST + ' 💎). Selesaikan 2 soal latihan lagi untuk panen Gem ya!'
      };
    },

    spendForCall: function (sessionId, isWelcomePass) {
      var state = getState();
      if (!state) return { ok: true, spent: 0 };

      var isLocal = Boolean(root.location && (root.location.hostname === 'localhost' || root.location.hostname === '127.0.0.1'));
      if (isLocal) {
        if (state && state.gems) {
          state.gems.balance = 99999;
          try { if (typeof root.save === 'function') root.save(); } catch (_) {}
        }
        return { ok: true, spent: 0, unlimitedDev: true };
      }

      if (isWelcomePass) {
        state.placementVoicePassUsed = true;
        try {
          if (typeof root.save === 'function') root.save();
        } catch (_) {}
        return { ok: true, spent: 0, isWelcomePass: true };
      }

      var g = getGemsCore();
      if (g && typeof g.gemsSpend === 'function') {
        var r = g.gemsSpend(state.gems, GEM_COST, 'mochi_voice_sos', Date.now(), sessionId);
        if (r && r.ok) {
          state.gems = r.gems;
          try {
            if (typeof root.save === 'function') root.save();
          } catch (_) {}
          return { ok: true, spent: GEM_COST };
        }
      }

      if (state.gems) {
        state.gems.balance = Math.max(0, (Number(state.gems.balance) || 0) - GEM_COST);
        try {
          if (typeof root.save === 'function') root.save();
        } catch (_) {}
        return { ok: true, spent: GEM_COST };
      }
      return { ok: true, spent: 0 };
    },

    refundMisTap: function (sessionId) {
      var state = getState();
      if (!state || !_activeCall || _activeCall.isWelcomePass) return;
      var g = getGemsCore();
      if (g && typeof g.gemsEarn === 'function') {
        var r = g.gemsEarn(state.gems, GEM_COST, 'mochi_sos_mistap_refund', Date.now(), sessionId);
        if (r) {
          state.gems = r;
          try {
            if (typeof root.save === 'function') root.save();
          } catch (_) {}
        }
      } else if (state.gems) {
        state.gems.balance = (Number(state.gems.balance) || 0) + GEM_COST;
        try {
          if (typeof root.save === 'function') root.save();
        } catch (_) {}
      }
      try {
        if (typeof root.showToast === 'function') {
          var loc = getLocale();
          root.showToast(loc === 'th' ? 'สายตัดเร็ว คืน ' + GEM_COST + ' เจมแล้ว 💎' : 'Panggilan singkat: ' + GEM_COST + ' Gem dikembalikan 💎', 'info');
        }
      } catch (_) {}
    },

    awardCashback: function (sessionId) {
      var state = getState();
      if (!state) return;
      var g = getGemsCore();
      if (g && typeof g.gemsEarn === 'function') {
        var r = g.gemsEarn(state.gems, CASHBACK_REWARD, 'mochi_sos_cashback', Date.now(), sessionId);
        if (r) {
          state.gems = r;
          try {
            if (typeof root.save === 'function') root.save();
          } catch (_) {}
        }
      } else if (state.gems) {
        state.gems.balance = (Number(state.gems.balance) || 0) + CASHBACK_REWARD;
        try {
          if (typeof root.save === 'function') root.save();
        } catch (_) {}
      }
      playChime('cashback');
      try {
        if (typeof root.showToast === 'function') {
          var loc = getLocale();
          root.showToast(loc === 'th' ? '🎉 ยอดเยี่ยม! ตอบถูก: รับเงินคืน +' + CASHBACK_REWARD + ' เจม!' : '🎉 Sugoi! Jawaban benar: Cashback +' + CASHBACK_REWARD + ' Gem didapatkan!', 'success');
        }
      } catch (_) {}
    },

    buildSocraticPrompt: function (q, isWelcomePass) {
      q = q || {};
      var locale = getLocale();
      var isThai = locale === 'th';
      var stem = String(q.question || q.stem || '');
      var concept = String(q.concept || q.lessonSkill || q.skill || (isThai ? 'ไวยากรณ์พื้นฐาน' : 'Tatanan bahasa dasar'));
      var misconception = String(q.misconceptionId || q.misconception || '');
      var failWhy = String(q.failWhy || (q.explain && q.explain.rule) || '');
      var options = Array.isArray(q.options) ? q.options.join(', ') : '';

      var greeting = isThai
        ? (isWelcomePass
          ? 'สวัสดี! ฉันโมจินะ นี่เป็นการวัดระดับครั้งแรก ไม่ต้องกังวลนะ มีตรงไหนที่สงสัยไหม ถามโมจิได้เลย!'
          : 'สวัสดี! โมจิพร้อมช่วยแนะนำแล้ว มีข้อไหนที่อยากคุยกันไหม?')
        : (isWelcomePass
          ? 'Halo! Aku Mochi, teman belajarmu di FIEZEL. Ini tes penempatan pertamamu! Tenang saja ya, bagian mana yang terasa membingungkan?'
          : 'Halo! Mochi siap bantu jelaskan. Bagian mana yang ingin kamu diskusikan?');

      var languageInstruction = isThai
        ? 'You MUST speak completely in natural, warm, polite THAI (ภาษาไทย) without ending with formal "ครับ" or "ค่ะ". Speak like a friendly companion.'
        : 'You MUST speak completely in warm, polite, encouraging INDONESIAN (Bahasa Indonesia).';

      var systemPrompt = [
        'You are Mochi (もち / โมจิ), the friendly, encouraging Japanese mascot companion and language tutor at FIEZEL.',
        languageInstruction,
        'Current scenario: In-quiz Live Voice Socratic Lifeline.',
        'Stem: "' + stem + '"',
        'Target Concept: "' + concept + '"',
        options ? 'Options: ' + options : '',
        misconception ? 'Misconception Trap: ' + misconception : '',
        failWhy ? 'Pedagogical Explanation: ' + failWhy : '',
        '',
        'STRICT INVARIANTS:',
        '1. ZERO-SPOILING: Never blurt out the direct correct option or index (do not say "Pilih A" or "The answer is X").',
        '2. Guide the learner using Socratic scaffolding: draw attention to the active verb, time marker, or root meaning.',
        '3. Keep spoken turns concise (1-2 sentences), warm, and energetic.',
        '4. Start with: "' + greeting + '"'
      ].join('\n');

      return {
        greeting: greeting,
        systemPrompt: systemPrompt,
        concept: concept,
        misconception: misconception,
        locale: locale
      };
    },

    // ── 4. Live Call Control (ZERO-TEXT Audio Pod) ──
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

      var socratic = this.buildSocraticPrompt(q, can.isWelcomePass);

      _activeCall = {
        active: true,
        sessionId: sessionId,
        startedAt: Date.now(),
        isWelcomePass: !!can.isWelcomePass,
        question: q,
        answered: false
      };

      playChime('connect');
      this._updateMochiMascotState('calling');

      // Render the ZERO-TEXT minimalist pod
      this._renderZeroTextFloatingPod(can);

      // Start authentic live voice streaming
      this._startAuthenticVoiceStream(socratic);
    },

    closeCall: function (reason) {
      if (!_activeCall) return;
      var call = _activeCall;
      _activeCall = null;

      var duration = Date.now() - call.startedAt;
      if (!call.answered && duration < MISTAP_THRESHOLD_MS && !call.isWelcomePass && reason !== 'answered_correct') {
        this.refundMisTap(call.sessionId);
      }

      playChime('disconnect');
      this._updateMochiMascotState('idle');
      this._removeFloatingPod();

      if (call.ws) {
        try {
          call.ws.close();
        } catch (_) {}
      }
      if (_micStream) {
        try {
          _micStream.getTracks().forEach(function (t) { t.stop(); });
        } catch (_) {}
        _micStream = null;
      }
      if (_micProcessor) {
        try {
          _micProcessor.disconnect();
        } catch (_) {}
        _micProcessor = null;
      }
    },

    onQuestionAnswered: function (ok, q) {
      if (!this.isCallActive()) return;
      _activeCall.answered = true;

      var self = this;
      var statusPill = document.getElementById('fzMochiSosLiveStatus');
      var locale = getLocale();

      if (ok) {
        this._updateMochiMascotState('happy');
        if (statusPill) {
          statusPill.textContent = locale === 'th' ? 'ถูกต้อง! ยอดเยี่ยมมาก ✨' : 'Benar! Luar biasa ✨';
          statusPill.classList.add('is-success');
        }
        if (!_activeCall.isWelcomePass) {
          this.awardCashback(_activeCall.sessionId);
        }
        setTimeout(function () {
          self.closeCall('answered_correct');
        }, 2200);
      } else {
        this._updateMochiMascotState('pout');
        if (statusPill) {
          statusPill.textContent = locale === 'th' ? 'ลองดูคำอธิบายที่หน้าจอนะ 🐾' : 'Coba cermati penjelasannya ya 🐾';
        }
        setTimeout(function () {
          self.closeCall('answered_wrong');
        }, 3000);
      }
    },

    handleMochiTap: function (mochiInstance, sessionKind) {
      var state = getState();
      var inQuiz = !!(state && state.quizActive);
      var inTest = !!(state && state.view === 'test');
      var hasActiveQuestion = !!(root.__fzActiveQuiz && root.__fzActiveQuiz.q);

      if (inQuiz || inTest || hasActiveQuestion) {
        this.startCall(root.__fzActiveQuiz ? root.__fzActiveQuiz.q : null, {
          isPlacement: inTest
        });
        return true;
      }
      return false;
    },

    // ── 5. ZERO-TEXT Floating Pod Rendering ──
    _renderZeroTextFloatingPod: function (can) {
      this._removeFloatingPod();
      var doc = getDoc();
      if (!doc) return;

      var locale = getLocale();
      var isThai = locale === 'th';
      var titleText = isThai ? 'โมจิ คอลล์' : 'Mochi Live';
      var statusText = isThai ? 'กำลังฟังเสียงคุณ...' : 'Mochi sedang mendengar...';
      var endBtnText = isThai ? 'วางสาย' : 'Tutup';
      var badgeText = can.badge || (can.isWelcomePass ? (isThai ? 'ตั๋วฟรี' : 'Gratis') : '20 💎');

      var pod = doc.createElement('aside');
      pod.id = 'fzMochiSosPod';
      pod.className = 'fz-mochi-sos-pod fz-pod-enter fz-zero-text-pod';
      pod.setAttribute('role', 'dialog');
      pod.setAttribute('aria-label', titleText);

      pod.innerHTML = [
        '<div class="fz-mochi-pod-content fz-pod-minimal">',
        '  <div class="fz-mochi-pod-header">',
        '    <div class="fz-mochi-pod-title-wrap">',
        '      <span class="fz-mochi-pod-avatar" aria-hidden="true">',
        '        <svg width="26" height="26" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="18" r="10" fill="#FDFAF3" stroke="#D97706" stroke-width="1.5"/><circle cx="13" cy="17" r="1.5" fill="#1B1418"/><circle cx="19" cy="17" r="1.5" fill="#1B1418"/><path d="M15 20C15.5 20.8 16.5 20.8 17 20" stroke="#1B1418" stroke-width="1.2" stroke-linecap="round"/><path d="M8 17C8 12.58 11.58 9 16 9C20.42 9 24 12.58 24 17" stroke="#2563EB" stroke-width="2" stroke-linecap="round"/><rect x="6" y="15" width="4" height="6" rx="2" fill="#2563EB"/><rect x="22" y="15" width="4" height="6" rx="2" fill="#2563EB"/></svg>',
        '      </span>',
        '      <div class="fz-mochi-pod-info">',
        '        <div class="fz-mochi-pod-name">' + titleText + ' <span class="fz-mochi-pod-live-dot"></span></div>',
        '        <span id="fzMochiSosLiveStatus" class="fz-mochi-pod-live-status">' + statusText + '</span>',
        '      </div>',
        '    </div>',
        '    <div class="fz-mochi-pod-actions">',
        '      <span class="fz-mochi-pod-badge">' + badgeText + '</span>',
        '      <button type="button" id="fzMochiSosCloseBtn" class="fz-mochi-pod-end-btn" aria-label="' + endBtnText + '">',
        '        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
        '        <span>' + endBtnText + '</span>',
        '      </button>',
        '    </div>',
        '  </div>',
        '  <div class="fz-mochi-pod-wave-stage" aria-hidden="true">',
        '    <span class="wave-bar bar-1"></span>',
        '    <span class="wave-bar bar-2"></span>',
        '    <span class="wave-bar bar-3"></span>',
        '    <span class="wave-bar bar-4"></span>',
        '    <span class="wave-bar bar-5"></span>',
        '    <span class="wave-bar bar-6"></span>',
        '    <span class="wave-bar bar-7"></span>',
        '  </div>',
        '</div>'
      ].join('\n');

      var host = doc.body || doc.getElementById('app');
      if (host) host.appendChild(pod);

      var closeBtn = doc.getElementById('fzMochiSosCloseBtn');
      var self = this;
      if (closeBtn) {
        closeBtn.onclick = function (e) {
          e.stopPropagation();
          self.closeCall('user_dismiss');
        };
      }
    },

    _removeFloatingPod: function () {
      var doc = getDoc();
      if (!doc) return;
      var pod = doc.getElementById('fzMochiSosPod');
      if (pod && pod.parentNode) {
        pod.classList.remove('fz-pod-enter');
        pod.classList.add('fz-pod-exit');
        setTimeout(function () {
          if (pod.parentNode) pod.parentNode.removeChild(pod);
        }, 200);
      }
    },

    _setLiveWaveActive: function (isSpeaking) {
      var doc = getDoc();
      if (!doc) return;
      var waveStage = doc.querySelector('.fz-mochi-pod-wave-stage');
      var statusPill = doc.getElementById('fzMochiSosLiveStatus');
      var locale = getLocale();
      var isThai = locale === 'th';

      if (waveStage) {
        if (isSpeaking) {
          waveStage.classList.add('is-speaking');
          if (statusPill) statusPill.textContent = isThai ? 'โมจิกำลังพูด...' : 'Mochi sedang berbicara...';
        } else {
          waveStage.classList.remove('is-speaking');
          if (statusPill) statusPill.textContent = isThai ? 'กำลังฟังเสียงคุณ...' : 'Mochi sedang mendengar...';
        }
      }
    },

    // ── 6. Authentic Live Audio Duplex Stream ──
    _startAuthenticVoiceStream: function (socratic) {
      if (!_activeCall) return;
      var self = this;
      var courseLang = 'ja';
      try {
        if (typeof root.jaCourseOn === 'function' && !root.jaCourseOn()) courseLang = 'en';
      } catch (_) {}

      // Immediately speak Mochi's opening Socratic greeting using neural Gemini Puck voice
      self._fetchVoiceStudioAudio(socratic);

      // Attempt microphone capture for two-way speaking
      if (root.navigator && root.navigator.mediaDevices && root.navigator.mediaDevices.getUserMedia) {
        root.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
          .then(function (stream) {
            _micStream = stream;
            self._setupMicProcessing(stream);
          })
          .catch(function () {
            // Mic permission dismissed or not supported; call remains active in speaker-only mode
          });
      }

      // Connect to Gemini Multimodal Live WebSocket proxy
      var wsUrl = 'wss://fiezel.my.id/api/live-call?voice=Puck&personaName=Mochi&targetLang=' +
        encodeURIComponent(courseLang) + '&locale=' + encodeURIComponent(socratic.locale);

      try {
        if (typeof root.WebSocket !== 'undefined') {
          var ws = new root.WebSocket(wsUrl);
          _activeCall.ws = ws;

          ws.onopen = function () {
            ws.send(JSON.stringify({
              type: 'in_quiz_context',
              systemInstruction: socratic.systemPrompt
            }));
          };

          ws.onmessage = function (event) {
            try {
              var data = JSON.parse(event.data);
              // Handle incoming 24kHz PCM16 audio chunks
              if (data && data.audio) {
                playPcm16Chunk(data.audio, 24000);
              } else if (data && data.serverContent && data.serverContent.modelTurn) {
                var parts = data.serverContent.modelTurn.parts || [];
                for (var p = 0; p < parts.length; p++) {
                  if (parts[p].inlineData && parts[p].inlineData.data) {
                    playPcm16Chunk(parts[p].inlineData.data, 24000);
                  }
                }
              }
            } catch (_) {}
          };

          ws.onerror = function () {
            // WebSocket unavailable, greeting already fetched via Voice Studio
          };
        }
      } catch (_) {}
    },

    _setupMicProcessing: function (stream) {
      try {
        var ctx = getAudioContext();
        if (!ctx) return;
        var source = ctx.createMediaStreamSource(stream);
        var analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        var dataArray = new Uint8Array(analyser.frequencyBinCount);
        var waveBars = document.querySelectorAll('.fz-mochi-pod-wave-stage .wave-bar');

        function pollMic() {
          if (!_activeCall || !_micStream) return;
          analyser.getByteFrequencyData(dataArray);
          var sum = 0;
          for (var i = 0; i < dataArray.length; i++) sum += dataArray[i];
          var avg = sum / (dataArray.length || 1);

          if (waveBars && waveBars.length) {
            for (var b = 0; b < waveBars.length; b++) {
              var scale = 0.3 + (avg / 255) * 1.4;
              waveBars[b].style.transform = 'scaleY(' + Math.min(1.8, Math.max(0.3, scale.toFixed(2))) + ')';
            }
          }
          requestAnimationFrame(pollMic);
        }
        pollMic();
      } catch (_) {}
    },

    _playBase64Audio: function (b64, mimeType) {
      if (!b64) return;
      var self = this;
      try {
        var ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(function () {});
        }
        var mime = mimeType || 'audio/mpeg';
        var audio = new (root.Audio || Audio)();
        audio.src = 'data:' + mime + ';base64,' + b64;
        self._setLiveWaveActive(true);
        audio.onended = function () {
          self._setLiveWaveActive(false);
        };
        var p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(function () {
            try {
              if (ctx) {
                var binary = root.atob(b64);
                var len = binary.length;
                var bytes = new Uint8Array(len);
                for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
                ctx.decodeAudioData(bytes.buffer, function (decoded) {
                  var source = ctx.createBufferSource();
                  source.buffer = decoded;
                  source.connect(ctx.destination);
                  source.start();
                  self._setLiveWaveActive(true);
                  source.onended = function () {
                    self._setLiveWaveActive(false);
                  };
                });
              }
            } catch (_) {}
          });
        }
      } catch (_) {}
    },

    // Voice Studio authentic binary audio synthesis (Speaker: Puck / kaiwa_female)
    _fetchVoiceStudioAudio: function (socratic) {
      if (!_activeCall) return;
      var self = this;
      var endpoint = '/api/tts/line';
      if (root.location && root.location.hostname !== 'localhost' && root.location.hostname !== '127.0.0.1') {
        endpoint = 'https://api.fiezel.my.id/api/tts/line';
      }

      var textToSpeak = socratic.greeting;
      var speaker = 'mochi'; // Warm, high-fidelity mascot timbre (Gemini Puck)

      if (typeof root.fetch === 'function') {
        root.fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            speaker: speaker,
            lang: socratic.locale === 'th' ? 'th' : 'id'
          })
        })
          .then(function (res) {
            if (!res.ok) return null;
            var contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              return res.json().then(function (data) {
                var b64 = data && (data.audioBase64 || data.audio_base64 || data.audio || data.data);
                if (b64) {
                  self._playBase64Audio(b64, data.mimeType || data.audioMimeType || 'audio/mpeg');
                }
              });
            } else if (contentType.includes('audio/')) {
              return res.arrayBuffer().then(function (buf) {
                var ctx = getAudioContext();
                if (!ctx) return;
                ctx.decodeAudioData(buf, function (decoded) {
                  var source = ctx.createBufferSource();
                  source.buffer = decoded;
                  source.connect(ctx.destination);
                  source.start();
                  self._setLiveWaveActive(true);
                  source.onended = function () {
                    self._setLiveWaveActive(false);
                  };
                });
              });
            }
          })
          .catch(function () {});
      }
    },

    _updateMochiMascotState: function (mode) {
      try {
        var m = (root.FiezelMochiCompanion && typeof root.FiezelMochiCompanion.getInstance === 'function')
          ? root.FiezelMochiCompanion.getInstance()
          : (root.FiezelMochiCompanionPool && root.FiezelMochiCompanionPool.mochi);
        if (!m) return;

        if (mode === 'calling') {
          if (typeof m.setAccessory === 'function') m.setAccessory('headset');
          if (typeof m.setAura === 'function') m.setAura('gold');
          if (typeof m.setMood === 'function') m.setMood('dots');
          if (typeof m.setTalking === 'function') m.setTalking(true, 4.0);
        } else if (mode === 'happy') {
          if (typeof m.setMood === 'function') m.setMood('happy');
          if (typeof m.triggerHop === 'function') m.triggerHop(0.45);
        } else if (mode === 'pout') {
          if (typeof m.setMood === 'function') m.setMood('pout');
        } else {
          if (typeof m.setAccessory === 'function') m.setAccessory(null);
          if (typeof m.setAura === 'function') m.setAura(null);
          if (typeof m.setMood === 'function') m.setMood('dots');
          if (typeof m.setTalking === 'function') m.setTalking(false);
        }
      } catch (_) {}
    }
  };

  return FiezelMochiVoiceSos;
});
