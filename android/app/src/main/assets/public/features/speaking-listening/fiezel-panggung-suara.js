/**
 * features/speaking-listening/fiezel-panggung-suara.js
 * Modul Panggung Suara Live (Live Voice Stage) dan Mesin Deteksi Kilat Sarang Tabu.
 *
 * Menggabungkan:
 * 1. LightningTabooMatcher: Pencocokan kata terlarang on-device sub-milidetik (< 0.1ms).
 * 2. AudioSfxSynthesizer: Generator efek suara Web Audio API (nol aset eksternal).
 * 3. SpeechStreamController: Penjaga aliran suara Web Speech API dengan interim results streaming.
 * 4. LiveStageCoordinator: Mesin status ruang siaran panggung, ronde permainan, dan skor.
 * 5. BraincoreBridge: Aliran telemetri mastery circumlocution & misconception ledger.
 *
 * Pola berkas: modul mandiri TANPA import, TANPA menyentuh state belajar app.js. Seluruh
 * pemanggil membaca `self.FiezelPanggungSuara` di belakang try/catch; modul absen berarti
 * fitur diam, bukan aplikasi yang gagal.
 *
 * CATATAN NASKAH: seluruh teks Indonesia di berkas ini sengaja TANPA tanda hubung. Di mana
 * naskah butuh jeda, kata diulang dengan spasi ("kata kata", "giliran demi giliran").
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FiezelPanggungSuara = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Pembungkus i18n dengan cadangan kata. Kalimat aslinya sudah berbahasa Indonesia dan
  // menjadi cadangan `fb`; kunci `stage.*` tetap didaftarkan di copy-map supaya murid Thai
  // punya jalurnya (pola fiezel-class-hub.js).
  function t(k, fb, params) {
    var s;
    try {
      var I = (typeof self !== 'undefined' ? self : this).FiezelI18n;
      s = I && I.t ? I.t(k, params) : undefined;
    } catch (_) { s = undefined; }
    if (s === undefined || s === k) s = fb == null ? k : fb;
    if (params) s = String(s).replace(/\{(\w+)\}/g, function (m, n) {
      return Object.prototype.hasOwnProperty.call(params, n) ? String(params[n]) : m;
    });
    return s;
  }

  // Nama pengirim sistem yang NETRAL: tidak ada nama orang yang dipaku di mesin. Siapa pun
  // yang duduk di panggung digambarkan oleh lapisan UI, bukan oleh mesin ronde.
  var SYSTEM_SENDER = t('stage.system-sender', 'Panggung Suara');
  var JUDGE_SENDER = t('stage.judge-sender', 'Juri Fiezel');

  /** Kode bahasa pendek bank soal -> tag BCP 47 yang dimengerti Web Speech API. */
  function normalizeSpeechLang(code) {
    var c = String(code == null ? '' : code).trim();
    if (!c) return 'en-US';
    if (c === 'en') return 'en-US';
    if (c === 'ja') return 'ja-JP';
    if (c.indexOf('-') >= 0) return c;
    return c;
  }

  // =========================================================================
  // 1. LIGHTNING TABOO MATCHER (Sub-Milidetik Keyword Engine)
  // =========================================================================
  class LightningTabooMatcher {
    constructor() {
      this.compiledPatterns = [];
      this.currentCard = null;
    }

    /**
     * Mengompilasi kartu soal ke struktur pola regex boundary berkecepatan tinggi.
     * @param {Object} card Objek kartu dari taboo-bank-v1.json
     */
    setCard(card) {
      this.currentCard = card;
      this.compiledPatterns = [];

      if (!card || !Array.isArray(card.taboo)) {
        return;
      }

      var variantsMap = card.variants || {};
      var isCJK = (card.language === 'ja') || /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(card.secretWord);

      for (var t = 0; t < card.taboo.length; t++) {
        var tabooWord = card.taboo[t];
        var key = tabooWord.toLowerCase().trim();
        var expanded = variantsMap[key] || [key];
        var escaped = expanded.map(function (w) {
          return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        });

        var pattern;
        if (isCJK) {
          // Bahasa Jepang tidak memakai spasi atau ASCII boundary \b
          pattern = new RegExp('(' + escaped.join('|') + ')', 'i');
        } else {
          // Bahasa Latin dengan boundary dan fleksibilitas sufiks (s, es, d, ed, ing, er, ly)
          pattern = new RegExp('\\b(' + escaped.map(function (w) {
            return w + '(?:s|es|d|ed|ing|er|ly)?';
          }).join('|') + ')\\b', 'i');
        }

        this.compiledPatterns.push({
          word: tabooWord.toUpperCase ? tabooWord.toUpperCase() : tabooWord,
          pattern: pattern
        });
      }
    }

    /**
     * Memeriksa ujaran suara secara instan dalam pecahan milidetik.
     * @param {string} rawUtterance Teks transkrip suara sementara (interim)
     * @returns {Object} { caught: boolean, word: string|null, latencyMs: number }
     */
    evaluate(rawUtterance) {
      var startTime = (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now();

      if (!rawUtterance || this.compiledPatterns.length === 0) {
        return { caught: false, word: null, latencyMs: 0 };
      }

      var cleaned = String(rawUtterance).toLowerCase().trim();

      for (var i = 0; i < this.compiledPatterns.length; i++) {
        var item = this.compiledPatterns[i];
        if (item.pattern.test(cleaned)) {
          var endTime = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();
          return {
            caught: true,
            word: item.word,
            latencyMs: Math.round((endTime - startTime) * 100) / 100
          };
        }
      }

      var endAt = (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now();
      return {
        caught: false,
        word: null,
        latencyMs: Math.round((endAt - startTime) * 100) / 100
      };
    }
  }

  // =========================================================================
  // 2. AUDIO SFX SYNTHESIZER (Web Audio API Pure Synthesis)
  // =========================================================================
  class AudioSfxSynthesizer {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    getContext() {
      if (!this.ctx && typeof window !== 'undefined') {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(function () {});
      }
      return this.ctx;
    }

    play(type) {
      if (!this.enabled) return;
      var ctx = this.getContext();
      if (!ctx) return;

      try {
        var now = ctx.currentTime;

        if (type === 'ding') {
          // Lonceng nada riang (D5 -> A5)
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.45);
        } else if (type === 'buzzer') {
          var oscB = ctx.createOscillator();
          var gainB = ctx.createGain();
          oscB.type = 'sawtooth';
          oscB.frequency.setValueAtTime(140, now);
          oscB.frequency.setValueAtTime(110, now + 0.15);
          gainB.gain.setValueAtTime(0.25, now);
          gainB.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          oscB.connect(gainB);
          gainB.connect(ctx.destination);
          oscB.start(now);
          oscB.stop(now + 0.35);
        } else if (type === 'alarm') {
          // Sirene darurat dua nada menusuk (260Hz turun ke 140Hz ditemani 220Hz turun ke 110Hz)
          var osc1 = ctx.createOscillator();
          var osc2 = ctx.createOscillator();
          var gainA = ctx.createGain();
          osc1.type = 'sawtooth';
          osc2.type = 'square';
          osc1.frequency.setValueAtTime(260, now);
          osc1.frequency.exponentialRampToValueAtTime(140, now + 0.28);
          osc2.frequency.setValueAtTime(220, now);
          osc2.frequency.exponentialRampToValueAtTime(110, now + 0.28);
          gainA.gain.setValueAtTime(0.35, now);
          gainA.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
          osc1.connect(gainA);
          osc2.connect(gainA);
          gainA.connect(ctx.destination);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.32);
          osc2.stop(now + 0.32);
        } else if (type === 'cheer') {
          // Arpeggio akor C Mayor riang
          [523.25, 659.25, 783.99, 1046.50].forEach(function (freq, i) {
            var oscC = ctx.createOscillator();
            var gainC = ctx.createGain();
            oscC.type = 'triangle';
            oscC.frequency.value = freq;
            gainC.gain.setValueAtTime(0, now + (i * 0.08));
            gainC.gain.linearRampToValueAtTime(0.2, now + (i * 0.08) + 0.04);
            gainC.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.08) + 0.5);
            oscC.connect(gainC);
            gainC.connect(ctx.destination);
            oscC.start(now + (i * 0.08));
            oscC.stop(now + (i * 0.08) + 0.5);
          });
        } else if (type === 'tick') {
          var oscT = ctx.createOscillator();
          var gainT = ctx.createGain();
          oscT.type = 'sine';
          oscT.frequency.setValueAtTime(800, now);
          gainT.gain.setValueAtTime(0.25, now);
          gainT.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
          oscT.connect(gainT);
          gainT.connect(ctx.destination);
          oscT.start(now);
          oscT.stop(now + 0.04);
        }
      } catch (e) {
        // Abaikan jika peramban membatasi audio sebelum interaksi pengguna
      }
    }
  }

  // =========================================================================
  // 3. SPEECH STREAM CONTROLLER (On-Device Interim Voice Recognition)
  // =========================================================================
  class SpeechStreamController {
    constructor(onInterimUtterance) {
      this.recognizer = null;
      this.isListening = false;
      this.onInterimUtterance = onInterimUtterance || function () {};
      this.lang = 'en-US';

      this.initRecognizer();
    }

    initRecognizer() {
      if (typeof window === 'undefined') return;

      var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRec) {
        return;
      }

      var self = this;
      try {
        this.recognizer = new SpeechRec();
        this.recognizer.continuous = true;
        this.recognizer.interimResults = true; // KUNCI KECEPATAN KILAT: alirkan pecahan token
        this.recognizer.lang = this.lang;

        this.recognizer.onresult = function (event) {
          for (var i = event.resultIndex; i < event.results.length; ++i) {
            var transcript = event.results[i][0].transcript;
            if (transcript) {
              self.onInterimUtterance(transcript);
            }
          }
        };

        this.recognizer.onerror = function () {
          // Tangani secara senyap tanpa menghentikan ruang suara
        };

        this.recognizer.onend = function () {
          if (self.isListening) {
            // Sambung ulang otomatis bila terputus di tengah ronde aktif
            try { self.recognizer.start(); } catch (e) {}
          }
        };
      } catch (err) {
        this.recognizer = null;
      }
    }

    startListening(lang) {
      if (lang) this.lang = normalizeSpeechLang(lang);
      if (!this.recognizer) return false;

      try {
        this.recognizer.lang = this.lang;
        this.isListening = true;
        this.recognizer.start();
        return true;
      } catch (err) {
        return false;
      }
    }

    stopListening() {
      this.isListening = false;
      if (this.recognizer) {
        try { this.recognizer.stop(); } catch (err) {}
      }
    }
  }

  // =========================================================================
  // 4. LIVE STAGE COORDINATOR (State Machine, Timers, Scoring)
  // =========================================================================
  class LiveStageCoordinator {
    constructor(options) {
      options = options || {};
      this.state = 'OFFLINE'; // OFFLINE | PREPARING | STAGE_IDLE | TABOO_ROUND_ACTIVE | ROUND_SUMMARY
      this.matcher = new LightningTabooMatcher();
      this.sfx = new AudioSfxSynthesizer();
      this.cards = options.cards || [];
      this.cardIndex = 0;
      this.currentCard = null;

      this.roundTimeSeconds = options.roundTimeSeconds || 30;
      this.timeLeft = this.roundTimeSeconds;
      this.timerInterval = null;

      this.score = 0;
      this.streakDays = options.initialStreakDays || 1;
      this.cooldownViolation = false;

      this.listeners = {
        stateChange: [],
        cardChange: [],
        timeTick: [],
        tabooViolation: [],
        correctGuess: [],
        chatMessage: []
      };

      var self = this;
      this.speechController = new SpeechStreamController(function (utterance) {
        self.handleVoiceUtterance(utterance);
      });
    }

    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
    }

    emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(function (fn) { fn(data); });
      }
    }

    loadCards(cards) {
      this.cards = Array.isArray(cards) ? cards : [];
      if (this.cards.length > 0 && !this.currentCard) {
        this.setCard(0);
      }
    }

    setCard(index) {
      if (!this.cards || this.cards.length === 0) return;
      this.cardIndex = index % this.cards.length;
      this.currentCard = this.cards[this.cardIndex];
      this.matcher.setCard(this.currentCard);
      this.emit('cardChange', this.currentCard);
    }

    nextCard() {
      this.setCard(this.cardIndex + 1);
      this.resetRoundTimer();
    }

    startRound() {
      this.state = 'TABOO_ROUND_ACTIVE';
      this.resetRoundTimer();
      this.speechController.startListening(this.currentCard ? this.currentCard.language : 'en-US');
      this.emit('stateChange', this.state);
    }

    stopRound() {
      this.state = 'STAGE_IDLE';
      this.clearIntervalTimer();
      this.speechController.stopListening();
      this.emit('stateChange', this.state);
    }

    resetRoundTimer() {
      var self = this;
      this.clearIntervalTimer();
      this.timeLeft = this.roundTimeSeconds;
      this.emit('timeTick', this.timeLeft);

      this.timerInterval = setInterval(function () {
        self.timeLeft -= 1;
        self.emit('timeTick', self.timeLeft);

        if (self.timeLeft <= 5 && self.timeLeft > 0) {
          self.sfx.play('tick');
        }

        if (self.timeLeft <= 0) {
          self.clearIntervalTimer();
          // Guard: hanya lanjut kartu berikutnya bila ronde masih aktif.
          // Tanpa guard ini, timer yang sudah di-clearInterval() sebelumnya
          // bisa masih terpicu lalu memanggil nextCard() -> resetRoundTimer()
          // baru meski ronde sudah dihentikan manual (stopRound).
          if (self.state !== 'TABOO_ROUND_ACTIVE') return;
          self.sfx.play('buzzer');
          self.emit('chatMessage', {
            sender: SYSTEM_SENDER,
            kind: 'time_up',
            text: 'Waktu habis! Oper giliran.'
          });
          self.nextCard();
        }
      }, 1000);
    }

    clearIntervalTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }

    handleVoiceUtterance(utterance) {
      if (this.state !== 'TABOO_ROUND_ACTIVE' || this.cooldownViolation) {
        return;
      }

      var verdict = this.matcher.evaluate(utterance);
      if (verdict.caught) {
        this.triggerViolation(verdict.word, verdict.latencyMs);
      }
    }

    triggerViolation(tabooWord, latencyMs) {
      if (this.cooldownViolation) return;
      this.cooldownViolation = true;

      // Poin dipotong 10
      this.score = Math.max(0, this.score - 10);

      this.sfx.play('alarm');

      // Haptic feedback ponsel jika didukung
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 150]);
      }

      this.emit('tabooViolation', {
        word: tabooWord,
        latencyMs: latencyMs,
        score: this.score
      });

      this.emit('chatMessage', {
        sender: JUDGE_SENDER,
        kind: 'violation',
        text: 'Pelanggaran kilat! Keceplosan kata ' + tabooWord + ' dalam ' + latencyMs + ' ms. Poin dipotong 10.'
      });

      // Catat ke Braincore Misconception Ledger
      this.feedBraincoreMisconception(tabooWord);

      var self = this;
      setTimeout(function () {
        self.cooldownViolation = false;
      }, 2500);
    }

    triggerCorrectGuess() {
      this.score += 20;
      this.sfx.play('ding');

      this.emit('correctGuess', {
        card: this.currentCard,
        score: this.score
      });

      this.emit('chatMessage', {
        sender: SYSTEM_SENDER,
        kind: 'correct',
        text: t('stage.chat-benar', 'Jawaban benar: ') + (this.currentCard ? this.currentCard.secretWord : '') + t('stage.chat-benar-akhir', '! Berhasil!')
      });

      // Alirkan ke Braincore Mastery
      this.feedBraincoreMastery();

      this.nextCard();
    }

    // =======================================================================
    // 5. BRAINCORE INTEGRATION (Zero-Dumbing Telemetry Pipeline)
    // =======================================================================
    /**
     * Mengalirkan bukti penguasaan circumlocution ke Braincore NYATA.
     *
     * Versi lama memanggil `window.fiezelBrain.updateMastery(...)` — API yang TIDAK PERNAH
     * ada di peramban. Akibatnya gerbang "Zero-Dumbing" lolos secara palsu: telemetri
     * terformat rapi tetapi nol baris masuk ke model murid. Yang benar adalah dua fungsi
     * global milik app.js: `updateMastery(bucket, key, ok, ms, confidence, at)`.
     */
    feedBraincoreMastery() {
      if (!this.currentCard) return null;

      var word = String(this.currentCard.secretWord || '');
      var latencyMs = (this.roundTimeSeconds - this.timeLeft) * 1000;
      var telemetryEvent = {
        type: 'CIRCUMLOCUTION_SUCCESS',
        skillId: 'speaking_fluency',
        word: word,
        difficulty: this.currentCard.difficulty,
        timestamp: Date.now()
      };

      if (typeof window !== 'undefined' && typeof window.updateMastery === 'function') {
        try {
          window.updateMastery(
            'vocab',
            word.toLowerCase(),
            true,
            latencyMs > 0 ? latencyMs : 6000,
            null,
            Date.now()
          );
        } catch (e) { /* telemetri gagal tidak boleh menghentikan ronde */ }
      }

      return telemetryEvent;
    }

    /**
     * Mencatat pelanggaran kata tabu sebagai miskonsepsi di ledger NYATA.
     * API sebenarnya: `misconceptionLedgerRecord(session, q, diagnosis, ok)`.
     */
    feedBraincoreMisconception(violatedWord) {
      if (!this.currentCard) return null;

      var misconceptionRecord = {
        type: 'TABOO_VIOLATION',
        targetWord: this.currentCard.secretWord,
        forbiddenWord: violatedWord,
        category: this.currentCard.category,
        timestamp: Date.now()
      };

      if (typeof window !== 'undefined' && typeof window.misconceptionLedgerRecord === 'function') {
        try {
          window.misconceptionLedgerRecord(
            null,
            {
              id: 'taboo:' + String(this.currentCard.id || this.currentCard.secretWord || ''),
              target: this.currentCard.secretWord,
              type: 'speaking',
              lessonSkill: 'circumlocution'
            },
            { misconception: 'taboo_' + String(violatedWord || '').toLowerCase(), timing: 'fast' },
            false
          );
        } catch (e) { /* ledger gagal tidak boleh menghentikan ronde */ }
      }

      return misconceptionRecord;
    }
  }

  return {
    LightningTabooMatcher: LightningTabooMatcher,
    AudioSfxSynthesizer: AudioSfxSynthesizer,
    SpeechStreamController: SpeechStreamController,
    LiveStageCoordinator: LiveStageCoordinator,
    normalizeSpeechLang: normalizeSpeechLang,
    SYSTEM_SENDER: SYSTEM_SENDER,
    JUDGE_SENDER: JUDGE_SENDER
  };
});
