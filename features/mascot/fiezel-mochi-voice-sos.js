/**
 * features/mascot/fiezel-mochi-voice-sos.js — In-Quiz Live Mochi Voice SOS & Socratic Lifeline
 *
 * Implements an interactive live voice tutor companion inside quiz and practice stages:
 * 1. Comic Thought Bubble: Floats gracefully beside Mochi's head without overlapping face.
 * 2. Direct Mascot Tap-to-Voice: Tap anywhere on 3D/2D Mochi mascot to start instant live voice duplex.
 * 3. Proactive Entry Greeting: Greets student warmly on session entry with audio cue & speech bubble.
 * 4. Deep Quiz-Context Awareness: Full snapshot of grammar, listening scripts, reading passages, focus words, and attempts.
 * 5. Authentic Two-Way Audio Duplex via Gemini Multimodal Live API:
 *    - Model: `models/gemini-3.8-live` on `GenerativeService.BidiGenerateContentConstrained`
 *    - Voice: `Puck` (high-clarity playful Daifuku companion voice)
 *    - Dual-Key Protocol: Reads user key from `localStorage` (`fz_gemini_api_key`) or fetches
 *      ephemeral session token from `/api/voice/live-session` (16-key rotation pool).
 *    - Sub-Second Latency Engine: Pre-warmed tokens, hot WebSocket handshake on pointerdown, fast PCM16.
 *    - Socratic Scaffolding & Zero-Spoiling Invariant: Guided reasoning with runtime leak-guard.
 * 6. Minimalist Visualizer: Small, elegant soundwave pulses directly under Mochi's feet (Zero-Text Card).
 * 7. Gem Wallet & Dev Mode: Non-destructive local dev mode with authentic balance display (Zero-State-Pollution).
 * 8. Full Bilingual Localization: Indonesian (id) and Thai (th) via FiezelI18n.
 * 9. Anti-Leak Exam Invariant: Strictly locked on placement tests and official certification exams.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FiezelMochiVoiceSos = api;
    root.FiezelMochiVoiceSOS = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function (root) {
  'use strict';

  var GEM_COST = 2;
  var GEM_COST_OPENING_TURN = 2;
  var GEM_COST_FOLLOWUP_TURN = 1;
  var GEM_MAX_PER_QUESTION = 6;
  var GEM_MIN_START_BALANCE = 2;
  var GEM_COST_PER_QUESTION = 2;
  var GEM_COST_PER_SESSION = 6;
  var CASHBACK_REWARD = 2;
  var DAILY_FREE_SOS_LIMIT = 2;
  var MISTAP_THRESHOLD_MS = 6000;
  var LIVE_MODEL = 'models/gemini-3.8-live';
  var LIVE_VOICE = 'Puck';
  var TOKEN_REFRESH_MS = 95000;      // worker: newSessionExpireTime = 120s
  var TOKEN_STALE_MS = 110000;
  var HOT_WS_IDLE_MS = 55000;
  var TAP_DEDUPE_MS = 450;
  var TAP_MAX_DIST = 12;
  var TAP_MAX_MS = 600;
  var GREETING_VISIBLE_MS = 5500;
  var MASCOT_SELECTOR = 'fiezel-mascot, .fz-paw-slot, .fz-paw-above, .fz-paw-side, .quiz-mascot, .fz-mochi-viewport, .fz-mochi-viewport canvas, .coach-strip-face.has-mascot, .fz-mochi-avatar';
  var NON_TAP_SELECTOR = '#fzMochiThoughtBubble, #fzMochiVoiceUnder, #fzMochiCardToggle, #fzMochiConnBanner, .fz-mochi-card-toggle, .fz-mochi-conn-banner, .quiz-topbar, .options, .option';
  var MOCHI_ENABLED_STORAGE_KEY = 'fz_mochi_sos_enabled';
  var DIRECT_KEY_COOLDOWN_MS = 65000;
  var OPENING_AUDIO_WATCHDOG_MS = 7000;

  function getDailySosUsage() {
    try {
      var ls = (root && root.localStorage) || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!ls || typeof ls.getItem !== 'function') return { date: '', count: 0 };
      var today = new Date().toISOString().slice(0, 10);
      var storedDate = ls.getItem('fz_mochi_sos_daily_date') || '';
      var storedCount = parseInt(ls.getItem('fz_mochi_sos_daily_count') || '0', 10);
      if (storedDate !== today) {
        return { date: today, count: 0 };
      }
      return { date: today, count: isNaN(storedCount) ? 0 : storedCount };
    } catch (_) {
      return { date: '', count: 0 };
    }
  }

  function incrementDailySosUsage() {
    try {
      var ls = (root && root.localStorage) || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!ls || typeof ls.setItem !== 'function') return;
      var today = new Date().toISOString().slice(0, 10);
      var usage = getDailySosUsage();
      var nextCount = usage.date === today ? (usage.count + 1) : 1;
      ls.setItem('fz_mochi_sos_daily_date', today);
      ls.setItem('fz_mochi_sos_daily_count', String(nextCount));
    } catch (_) {}
  }

  var _activeCall = null;
  var _audioCtx = null;
  var _ttsAnalyser = null;
  var _ttsAnalyserCtx = null;
  var _micStream = null;
  var _micProcessor = null;
  var _micSource = null;
  var _sileroVad = null;
  var _sileroVadActive = false;
  var _sileroBundlePromise = null;
  var _sileroLastSpeechProbAt = 0;
  var _directKeyCooldownUntil = 0;
  var _openingWatchdogTimer = null;
  var _connStatus = { state: 'idle', message: '', updatedAt: 0 };
  var _connBannerHideTimer = null;
  var _ws = null;
  var _activeAudioSources = [];
  var _nextAudioPlayTime = 0;
  var _firstChunkPending = true;
  var _currentAudio = null;
  var _silenceTimer = null;

  var _currentQ = null;
  var _currentCtx = null;
  var _session = { active: false, key: '', locked: false, cfg: null, greeted: false };
  var _attempts = [];
  var _prewarm = { session: null, fetchedAt: 0, promise: null, timer: null };
  var _hotWs = null;
  var _hotWsIdleTimer = null;
  var _hotWsSetupComplete = false;
  var _lastTapAt = 0;
  var _pendingPointer = null;
  var _tapBound = false;
  var _audioWarmBound = false;
  var _outTranscript = '';
  var _leakGuardHits = 0;
  var _silenceTimer = null;
  var _turnEndFallbackTimer = null;
  var _shellGoneTimer = null;
  var _reconnectTimer = null;
  var _reconnectAttempts = 0;
  var _lastUserSpeechAt = 0;
  var _lastMochiAudioEndedAt = 0;
  var _modelTurnInProgress = false;
  var _awaitingOpeningModelTurn = false;
  var _openingModelTurnTimer = null;
  var _userSpeakVisualTimer = null;
  var _userSpeakingNow = false;
  var _greetingPcmCache = null;
  var _greetingWarmInFlight = false;
  var _inFlightGreetChunks = [];
  var _pipeWarmToActiveCall = false;
  var _noiseFloorRms = 0;
  var _consecutiveSpeechFrames = 0;
  var _userAudioBurstActive = false;
  var _audioStreamEndTimer = null;
  var _lastBargeInAt = 0;
  var _speechRec = null;
  var _speechRecActive = false;
  var _speechRecSubmitTimer = null;
  var _silencePromptFired = false;
  var _lastSilencePromptText = '';
  var _userAskedConceptOnCurrent = false;
  var _openingTurnCompletedForQ = false;
  var _questionGemsMap = {};
  var _freeQuestionSigs = {};
  var _sessionGemsSpent = 0;
  var _sessionVoiceTurns = 0;
  var _sessionFreeQuestions = 0;
  var _pendingBillingMode = 'auto';
  var _currentTurnMetered = false;
  var _isSilenceNudgeTurn = false;
  var _pendingFollowupBillable = false;
  var SILENCE_PROMPT_MS = 2000;

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
    'mochi-sos.exam-locked': 'Tes mandiri: Mochi istirahat dulu saat ujian/tes awal ya!',
    'mochi-sos.greet-1': 'Halo! Mochi siap temani latihanmu hari ini! Kalau bingung, ketuk aku langsung ya! ✨',
    'mochi-sos.greet-2': 'Semangat! Ada Mochi di sini. Jangan ragu ketuk aku kalau butuh petunjuk!',
    'mochi-sos.greet-3': 'Yuk mulai! Aku di sini kalau kamu mau diskusi soalnya. Ketuk aku kapan saja!',
    'mochi-sos.greet-listening': 'Halo! Sesi mendengarkan nih. Dengarkan dulu baik-baik, kalau ada yang samar ketuk aku ya!',
    'mochi-sos.greet-reading': 'Halo! Ada bacaan hari ini. Baca santai dulu, kalau ada kata sulit ketuk aku!',
    'mochi-sos.greet-vocab': 'Halo! Waktunya kosakata! Kalau ada kata yang asing, ketuk aku, kita bahas maknanya!',
    'mochi-sos.greet-grammar': 'Halo! Sesi tata bahasa dimulai! Perhatikan partikel dan bentuk kata kerja. Ketuk aku kalau bingung!',
    'mochi-sos.greet-kanji': 'Halo! Sesi kanji! Lihat bentuk dan bunyinya pelan-pelan. Ketuk aku kalau butuh petunjuk!',
    'mochi-sos.greet-build': 'Halo! Ayo susun kalimatnya! Mulai dari subjek dan partikelnya. Ketuk aku kalau macet!',
    'mochi-sos.greet-cue': 'Halo! Mochi siap menemani. Ketuk aku kalau bingung ya!',
    'mochi-sos.leak-correction': '[SISTEM FIEZEL: Kamu hampir membocorkan kunci jawaban. DILARANG menyebut huruf pilihan atau teks jawaban benar. Ulangi dalam 1 kalimat sebagai petunjuk sokratik saja.]',
    'mochi-sos.connecting': 'Menyambungkan Mochi...',
    'mochi-sos.conn-connecting': 'Sedang menghubungkan Mochi...',
    'mochi-sos.conn-reconnecting': 'Menyambungkan ulang koneksi suara Mochi...',
    'mochi-sos.conn-offline': 'Koneksi internet terputus — Mochi menunggu jaringan kembali',
    'mochi-sos.conn-quota': 'Kuota API AI penuh — mengalihkan jalur koneksi...',
    'mochi-sos.conn-error': 'Koneksi AI bermasalah — Ketuk untuk coba lagi',
    'mochi-sos.conn-retry': 'Coba lagi',
    'mochi-sos.toggle-on-title': 'Nonaktifkan bantuan suara Mochi',
    'mochi-sos.toggle-off-title': 'Aktifkan bantuan suara Mochi',
    'mochi-sos.toggle-label': 'Bantuan Mochi',
    'mochi-sos.toggle-on-badge': 'ON',
    'mochi-sos.toggle-off-badge': 'OFF',
    'mochi-sos.toast-disabled': 'Bantuan suara Mochi dinonaktifkan',
    'mochi-sos.toast-enabled': 'Bantuan suara Mochi aktif (0 💎 saat sambung · bayar sesuai suara AI)',
    'mochi-sos.toast-zero-audio-safe': 'Belum ada suara AI yang diputar — 0 Gem terpakai! 💎',
    'mochi-sos.toast-session-receipt': 'Bantuan Mochi selesai: {turns} respon suara · {gems} Gem terpakai 💎',
    'mochi-sos.toast-session-free-receipt': 'Bantuan Mochi selesai: {turns} respon suara · Kuota Gratis Harian (0 💎)',
    'mochi-sos.toast-out-of-gems': 'Gem belum cukup untuk soal berikutnya. Bantuan Mochi ditutup aman.',
    'mochi-sos.modal-free-title': 'Bantuan Suara Mochi (Kuota Gratis)',
    'mochi-sos.modal-gem-title': 'Bantuan Suara Mochi (Sesuai Kuota Suara)',
    'mochi-sos.modal-free-body': 'Kamu punya {remaining}x bantuan suara gratis hari ini ({limit} soal/hari). Kuota hanya terpakai saat suara AI benar-benar keluar.',
    'mochi-sos.modal-gem-body': 'Gem dihitung sesuai pemakaian suara AI (0 Gem saat menyambung/gagal suara). Saldo kamu: {balance} 💎.',
    'mochi-sos.modal-free-btn': 'Mulai Gratis (0 💎)',
    'mochi-sos.modal-gem-btn': 'Aktifkan (Mulai 0 💎)',
    'mochi-sos.modal-cancel-btn': 'Batal',
    'mochi-sos.modal-row-free-quota': 'Kuota Gratis Hari Ini',
    'mochi-sos.modal-row-connect-safe': 'Menyambung / Gagal Suara',
    'mochi-sos.modal-row-connect-anti': 'Sambung (Anti-Hangus)',
    'mochi-sos.modal-row-opening-ai': 'Bedah Soal Suara AI',
    'mochi-sos.modal-row-followup': 'Tanya Lanjutan (Maks. {max} 💎)',
    'mochi-sos.modal-row-cashback': 'Jawab Benar Soal Ini',
    'mochi-sos.modal-unit-questions': 'soal',
    'mochi-sos.modal-insufficient-title': 'Gem Belum Cukup 💎',
    'mochi-sos.modal-insufficient-body': 'Kamu membutuhkan minimal 2 Gem untuk membedah soal dengan suara AI Mochi (Saldo saat ini: {balance} 💎). Selesaikan soal latihan untuk kumpulkan Gem gratis atau gunakan kuota gratis harian besok!',
    'mochi-sos.modal-insufficient-btn': 'Mengerti',
    'mochi-sos.bubble-wrong-hint': 'Psst, bingung di bagian ini? Ketuk Mochi untuk bedah kalimatnya bareng yuk!',
    'mochi-sos.bubble-correct-praise': 'Hebat! Analisis kamu tepat sekali! 🎉'
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
    'mochi-sos.exam-locked': 'ทำด้วยตัวเองนะ โมจิพักผ่อนระหว่างทำแบบทดสอบจ้า!',
    'mochi-sos.greet-1': 'สวัสดี! โมจิพร้อมอยู่เป็นเพื่อนฝึกวันนี้แล้ว ถ้าสงสัยแตะฉันได้เลยนะ! ✨',
    'mochi-sos.greet-2': 'สู้ๆ! โมจิอยู่ตรงนี้ อยากได้คำใบ้เมื่อไหร่ก็แตะฉันเลย!',
    'mochi-sos.greet-3': 'เริ่มกันเลย! ถ้าอยากคุยเรื่องโจทย์ แตะฉันได้ตลอดนะ!',
    'mochi-sos.greet-listening': 'สวัสดี! รอบนี้เป็นการฟัง ตั้งใจฟังก่อนนะ ถ้าไม่ชัดค่อยแตะฉัน!',
    'mochi-sos.greet-reading': 'สวัสดี! วันนี้มีบทอ่าน อ่านสบายๆ ก่อน เจอคำยากก็แตะฉันนะ!',
    'mochi-sos.greet-vocab': 'สวัสดี! ได้เวลาคำศัพท์! เจอคำแปลกๆ แตะฉันแล้วมาคุยความหมายกัน!',
    'mochi-sos.greet-grammar': 'สวัสดี! เริ่มฝึกไวยากรณ์! สังเกตคำช่วยกับรูปกริยานะ สงสัยก็แตะฉัน!',
    'mochi-sos.greet-kanji': 'สวัสดี! รอบคันจิ! ดูรูปและเสียงช้าๆ ต้องการคำใบ้ก็แตะฉันนะ!',
    'mochi-sos.greet-build': 'สวัสดี! มาเรียงประโยคกัน! เริ่มจากประธานและคำช่วย ติดตรงไหนแตะฉัน!',
    'mochi-sos.greet-cue': 'สวัสดี! โมจิพร้อมแล้ว สงสัยก็แตะฉันนะ!',
    'mochi-sos.leak-correction': '[SYSTEM FIEZEL: คุณเกือบเฉลยคำตอบ ห้ามพูดตัวอักษรตัวเลือกหรือข้อความคำตอบที่ถูก พูดใหม่เป็นคำใบ้แบบโสเครติส 1 ประโยค]',
    'mochi-sos.connecting': 'กำลังเชื่อมต่อโมจิ...',
    'mochi-sos.conn-connecting': 'กำลังเชื่อมต่อเสียงโมจิ...',
    'mochi-sos.conn-reconnecting': 'กำลังเชื่อมต่อเสียงโมจิใหม่...',
    'mochi-sos.conn-offline': 'อินเทอร์เน็ตขาดหาย — โมจิรอสัญญาณกลับมา',
    'mochi-sos.conn-quota': 'โควตา AI เต็ม — กำลังสลับช่องทางเชื่อมต่อ...',
    'mochi-sos.conn-error': 'การเชื่อมต่อ AI ขัดข้อง — แตะเพื่อลองใหม่',
    'mochi-sos.conn-retry': 'ลองใหม่',
    'mochi-sos.toggle-on-title': 'ปิดผู้ช่วยเสียงโมจิ',
    'mochi-sos.toggle-off-title': 'เปิดผู้ช่วยเสียงโมจิ',
    'mochi-sos.toggle-label': 'ตัวช่วยโมจิ',
    'mochi-sos.toggle-on-badge': 'ON',
    'mochi-sos.toggle-off-badge': 'OFF',
    'mochi-sos.toast-disabled': 'ปิดผู้ช่วยเสียงโมจิแล้ว',
    'mochi-sos.toast-enabled': 'เปิดผู้ช่วยเสียงโมจิแล้ว (เชื่อมต่อ 0 💎 · คิดตามเสียง AI)',
    'mochi-sos.toast-zero-audio-safe': 'ยังไม่มีเสียง AI เล่นออกมา — ใช้ 0 Gem! 💎',
    'mochi-sos.toast-session-receipt': 'จบเซสชันโมจิ: เสียงตอบกลับ {turns} ครั้ง · ใช้ไป {gems} Gem 💎',
    'mochi-sos.toast-session-free-receipt': 'จบเซสชันโมจิ: เสียงตอบกลับ {turns} ครั้ง · สิทธิ์ฟรีรายวัน (0 💎)',
    'mochi-sos.toast-out-of-gems': 'เจมไม่พอสำหรับข้อถัดไป ปิดผู้ช่วยเสียงโมจิอย่างปลอดภัยแล้ว',
    'mochi-sos.modal-free-title': 'ตัวช่วยเสียงโมจิ (โควตาฟรี)',
    'mochi-sos.modal-gem-title': 'ตัวช่วยเสียงโมจิ (คิดตามโควตาเสียง)',
    'mochi-sos.modal-free-body': 'คุณมีสิทธิ์ตัวช่วยเสียงฟรีเหลือ {remaining} ครั้งในวันนี้ ({limit} ข้อ/วัน) สิทธิ์จะถูกนับเมื่อเสียง AI ดังขึ้นจริงเท่านั้น',
    'mochi-sos.modal-gem-body': 'คิดเจมตามเสียง AI ที่ใช้งานจริง (เชื่อมต่อ/เสียงไม่ติด = 0 Gem) ยอดของคุณ: {balance} 💎',
    'mochi-sos.modal-free-btn': 'เริ่มฟรี (0 💎)',
    'mochi-sos.modal-gem-btn': 'เปิดใช้งาน (เริ่ม 0 💎)',
    'mochi-sos.modal-cancel-btn': 'ยกเลิก',
    'mochi-sos.modal-row-free-quota': 'โควตาฟรีวันนี้',
    'mochi-sos.modal-row-connect-safe': 'เชื่อมต่อ / เสียงไม่ติด',
    'mochi-sos.modal-row-connect-anti': 'เชื่อมต่อ (ป้องกันเจมเสียฟรี)',
    'mochi-sos.modal-row-opening-ai': 'อธิบายโจทย์ด้วยเสียง AI',
    'mochi-sos.modal-row-followup': 'ถามต่อ (สูงสุด {max} 💎)',
    'mochi-sos.modal-row-cashback': 'ตอบถูกในข้อนี้',
    'mochi-sos.modal-unit-questions': 'ข้อ',
    'mochi-sos.modal-insufficient-title': 'เจมไม่พอ 💎',
    'mochi-sos.modal-insufficient-body': 'คุณต้องมีอย่างน้อย 2 Gem เพื่อวิเคราะห์โจทย์ด้วยเสียง AI ของโมจิ (ยอดปัจจุบัน: {balance} 💎) ฝึกทำแบบฝึกหัดเพื่อสะสม Gem ฟรี หรือใช้สิทธิ์ฟรีรายวันในวันพรุ่งนี้!',
    'mochi-sos.modal-insufficient-btn': 'เข้าใจแล้ว',
    'mochi-sos.bubble-wrong-hint': 'ข้อนี้ติดตรงไหนไหม? แตะโมจิให้ช่วยวิเคราะห์ได้นะ!',
    'mochi-sos.bubble-correct-praise': 'ยอดเยี่ยมมาก! ตอบถูกแล้ว 🎉'
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
      if (typeof state !== 'undefined' && state) return state;
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

  function isGenericPlaceholderName(n) {
    var s = String(n || '').trim().toLowerCase();
    return !s || s === 'pengguna uji' || s === 'teman' || s === 'เพื่อน';
  }

  function snapshotRealLearnerNameFromStorage() {
    try {
      var ls = (root && root.localStorage) || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!ls || typeof ls.getItem !== 'function') return '';
      var cached = ls.getItem('fz_registered_learner_name');
      if (cached && !isGenericPlaceholderName(cached)) return String(cached).trim();
      var keys = ['fiezel-onboarding-v1', 'fiezel-auth-v1', 'fz_state_v1', 'fz_state_v1@en', 'fz_state_v1@ja', 'fiezel-v5'];
      for (var i = 0; i < keys.length; i++) {
        var raw = ls.getItem(keys[i]);
        if (!raw) continue;
        try {
          var obj = JSON.parse(raw);
          var cand = (obj && (obj.userName || obj.name || (obj.user && (obj.user.name || obj.user.handle)) || (obj.profile && obj.profile.name))) || '';
          if (cand && !isGenericPlaceholderName(cand)) {
            var clean = String(cand).trim();
            try { ls.setItem('fz_registered_learner_name', clean); } catch (_) {}
            return clean;
          }
        } catch (_) {}
      }
    } catch (_) {}
    return '';
  }

  // Tangkap nama asli murid saat skrip dimuat & pasang pelindung pada setLearnerName
  var _bootRealLearnerName = snapshotRealLearnerNameFromStorage();
  try {
    if (typeof root.setLearnerName === 'function' && !root.setLearnerName.__fzMochiWrapped) {
      var _origSetLearnerName = root.setLearnerName;
      var wrappedSetLearnerName = function (val) {
        var s = String(val == null ? '' : val).trim();
        var ls = (root && root.localStorage) || (typeof localStorage !== 'undefined' ? localStorage : null);
        if (s && !isGenericPlaceholderName(s)) {
          _bootRealLearnerName = s;
          try { if (ls) ls.setItem('fz_registered_learner_name', s); } catch (_) {}
          return _origSetLearnerName.call(this, s);
        }
        var preserved = _bootRealLearnerName || snapshotRealLearnerNameFromStorage();
        if (preserved && !isGenericPlaceholderName(preserved)) {
          return _origSetLearnerName.call(this, preserved);
        }
        return _origSetLearnerName.call(this, val);
      };
      wrappedSetLearnerName.__fzMochiWrapped = true;
      root.setLearnerName = wrappedSetLearnerName;
    }
  } catch (_) {}

  function getRegisteredLearnerName() {
    var fallbackCandidate = '';
    try {
      var st = getState();
      if (st && st.userName && String(st.userName).trim()) {
        var stName = String(st.userName).trim();
        if (!isGenericPlaceholderName(stName)) return stName;
        fallbackCandidate = stName;
      }
      if (st && st.profile && st.profile.name && String(st.profile.name).trim()) {
        var pName = String(st.profile.name).trim();
        if (!isGenericPlaceholderName(pName)) return pName;
        if (!fallbackCandidate) fallbackCandidate = pName;
      }
      var storedReal = _bootRealLearnerName || snapshotRealLearnerNameFromStorage();
      if (storedReal && !isGenericPlaceholderName(storedReal)) return storedReal;
      if (root.FiezelAccount && typeof root.FiezelAccount.current === 'function') {
        var acc = root.FiezelAccount.current();
        var accName = (acc && (acc.name || acc.handle)) ? String(acc.name || acc.handle).trim() : '';
        if (accName && !isGenericPlaceholderName(accName)) return accName;
      }
      var ls = (root && root.localStorage) || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (ls && typeof ls.getItem === 'function') {
        var obRaw = ls.getItem('fiezel-onboarding-v1');
        if (obRaw) {
          var ob = JSON.parse(obRaw);
          if (ob && ob.name && String(ob.name).trim() && !isGenericPlaceholderName(ob.name)) {
            return String(ob.name).trim();
          }
        }
        var authRaw = ls.getItem('fiezel-auth-v1');
        if (authRaw) {
          var au = JSON.parse(authRaw);
          var auName = (au && au.name) || (au && au.user && (au.user.name || au.user.handle)) || (au && au.handle) || '';
          if (auName && String(auName).trim() && !isGenericPlaceholderName(auName)) {
            return String(auName).trim();
          }
        }
      }
      if (typeof root.learnerName === 'function') {
        var ln = String(root.learnerName() || '').trim();
        if (ln && !isGenericPlaceholderName(ln)) return ln;
        if (ln && !fallbackCandidate) fallbackCandidate = ln;
      }
    } catch (_) {}
    if (fallbackCandidate) return fallbackCandidate;
    return getLocale() === 'th' ? 'เพื่อน' : 'Teman';
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

  function getActiveQuestion(q) {
    if (q && typeof q === 'object') return q;
    if (_currentQ) return _currentQ;
    try { if (root.__activeQuizQuestion) return root.__activeQuizQuestion; } catch (_) {}
    return null;
  }

  var _sessionMochiEnabled = false;
  var _chargedQuestionSigs = {};

  function isMochiEnabledFromStorage() {
    return !!_sessionMochiEnabled;
  }

  function writeMochiEnabledToStorage(enabled) {
    _sessionMochiEnabled = !!enabled;
    try {
      var ls = (root && root.localStorage) || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (ls && typeof ls.setItem === 'function') {
        ls.setItem(MOCHI_ENABLED_STORAGE_KEY, enabled ? '1' : '0');
      }
    } catch (_) {}
  }

  var INELIGIBLE_SESSION_TYPES = {
    vocab: true,
    vocabulary: true,
    tango: true,
    flashcard: true,
    flashcards: true,
    listening: true,
    chokai: true,
    kana: true,
    hiragana: true,
    katakana: true,
    kanji: true,
    kakijun: true,
    speaking: true,
    pronunciation: true,
    chat: true
  };

  // Sesi latihan yang dimulai langsung dari halaman depan Home (home-today) & Tes Penempatan Pertama (placement):
  // startLevelPractice -> 'level', startAdaptive -> 'adaptive', startQuickWinLesson -> 'quick_win', startPlacement -> 'placement'.
  var HOME_SESSION_TYPES = {
    level: true,
    adaptive: true,
    quick_win: true,
    'quick-win': true,
    daily: true,
    home: true,
    placement: true
  };

  function isSessionTypeIneligible(type) {
    var s = String(type || '').trim().toLowerCase();
    if (!s) return false;
    if (INELIGIBLE_SESSION_TYPES[s]) return true;
    if (/^(vocab|listening|chokai|kana|hiragana|katakana|kanji|kakijun|flashcard|speaking)/.test(s)) return true;
    return false;
  }

  function isMochiSosEligible(q, ctx) {
    ctx = ctx || _currentCtx || {};
    if (isExamLocked(ctx)) return false;
    var cfgType = String((ctx && ctx.cfgType) || (_session.cfg && _session.cfg.type) || '').trim().toLowerCase();
    if (isSessionTypeIneligible(cfgType)) return false;

    var st = getState();
    var view = String((st && st.view) || '').trim().toLowerCase();
    if (isSessionTypeIneligible(view)) return false;

    // Jika sesi latihan dimulai dari halaman depan Home (level / adaptive / quick_win),
    // aktifkan Mochi Voice SOS secara penuh di sepanjang sesi tersebut.
    if (HOME_SESSION_TYPES[cfgType]) {
      return true;
    }

    if (!q) {
      if (cfgType === 'grammar' || cfgType === 'reading' || cfgType === 'writing' || cfgType === 'build' || cfgType === 'sentence-build' || cfgType === 'token-order' || cfgType === 'cloze') {
        return true;
      }
      if (view === 'grammar' || view === 'reading' || view === 'writing' || view === 'story') {
        return true;
      }
      return false;
    }

    var qType = String(q.type || '').trim().toLowerCase();
    var skill = String(q.skill || q.concept || q.domain || '').trim().toLowerCase();
    if (isSessionTypeIneligible(qType)) return false;
    if (/^(vocabulary|vocab|listening|chokai|kana|hiragana|katakana|kanji|kakijun|speaking)\b/.test(skill)) return false;

    if (q.passage || qType === 'reading' || cfgType === 'reading' || view === 'reading' || view === 'story' || /^reading\b/.test(skill)) {
      return true;
    }
    if (qType === 'writing' || cfgType === 'writing' || view === 'writing' || /^writing\b/.test(skill)) {
      return true;
    }
    if (qType === 'grammar' || qType === 'token-order' || qType === 'sentence-build' || qType === 'cloze' ||
        cfgType === 'grammar' || view === 'grammar' || /^grammar\b/.test(skill)) {
      return true;
    }
    // Standard multiple-choice grammar item where q.type is omitted or 'mcq'/'choice'
    if ((!qType || qType === 'mcq' || qType === 'choice') && !q.script && !q.audioUrl) {
      return true;
    }
    return false;
  }

  function syncCompanionStrictMode() {
    try {
      var comp = root && root.FiezelMochiCompanion;
      var mochi = comp && typeof comp.getInstance === 'function' ? comp.getInstance() : null;
      if (mochi && typeof mochi.setVoiceCompanionStrictMode === 'function') {
        var active = isSosSurfaceActiveInternal();
        var st = getState();
        if (st && st.view === 'chat') active = true;
        mochi.setVoiceCompanionStrictMode(active);
      }
    } catch (_) {}
  }

  function isSosSurfaceActiveInternal() {
    if (!_session.active || _session.locked || isExamLocked()) return false;
    if (!isMochiEnabledFromStorage()) return false;
    var q = getActiveQuestion(null);
    if (q) return isMochiSosEligible(q, _currentCtx);
    var cfgType = String((_session.cfg && _session.cfg.type) || '').trim().toLowerCase();
    if (isSessionTypeIneligible(cfgType)) return false;
    return !!(HOME_SESSION_TYPES[cfgType] || cfgType === 'grammar' || cfgType === 'reading' || cfgType === 'writing');
  }

  function getConnectionStatusInternal() {
    return {
      state: _connStatus.state || 'idle',
      message: _connStatus.message || '',
      updatedAt: _connStatus.updatedAt || 0
    };
  }

  function isLocalEnv() {
    try {
      if (typeof root.isLocalTestServer === 'function' && root.isLocalTestServer()) return true;
      if (typeof location !== 'undefined') {
        var h = (location.hostname || '').toLowerCase();
        if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local')) return true;
      }
    } catch (_) {}
    return false;
  }

  function removeConnectionBannerInternal() {
    if (_connBannerHideTimer) {
      clearTimeout(_connBannerHideTimer);
      _connBannerHideTimer = null;
    }
    var doc = getDoc();
    if (!doc) return;
    var existing = doc.getElementById('fzMochiConnBanner');
    if (existing) {
      try { existing.remove(); } catch (_) {}
    }
  }

  function renderConnectionBannerInternal() {
    var doc = getDoc();
    if (!doc) return null;
    var st = _connStatus.state || 'idle';
    if (st === 'idle' || st === 'connected' || !isMochiEnabledFromStorage() || isExamLocked()) {
      removeConnectionBannerInternal();
      return null;
    }
    if (isLocalEnv() && (st === 'error' || st === 'reconnecting')) {
      removeConnectionBannerInternal();
      return null;
    }
    var host = doc.querySelector('.quiz-shell > .card:not(.card-reading):not(.card-flashcard)') ||
               doc.querySelector('.quiz-shell') ||
               doc.querySelector('.writing-page .card.writing-prompt, .writing-stage .card, .writing-stage') ||
               doc.querySelector('#fzStoryContainer .card, #fzStoryContainer') ||
               doc.querySelector('.grammar-lesson-page .card, .grammar-lesson-page');
    if (!host) {
      removeConnectionBannerInternal();
      return null;
    }
    var msg = _connStatus.message || '';
    if (!msg) {
      if (st === 'connecting') msg = t('mochi-sos.conn-connecting', 'Sedang menghubungkan Mochi...');
      else if (st === 'reconnecting') msg = t('mochi-sos.conn-reconnecting', 'Menyambungkan ulang koneksi suara Mochi...');
      else if (st === 'offline') msg = t('mochi-sos.conn-offline', 'Koneksi internet terputus — Mochi menunggu jaringan kembali');
      else if (st === 'quota') msg = t('mochi-sos.conn-quota', 'Kuota API AI penuh — mengalihkan jalur koneksi...');
      else if (st === 'error') msg = t('mochi-sos.conn-error', 'Koneksi AI bermasalah — Ketuk untuk coba lagi');
    }
    var banner = doc.getElementById('fzMochiConnBanner');
    if (!banner) {
      banner = doc.createElement('div');
      banner.id = 'fzMochiConnBanner';
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      if (doc.body) {
        doc.body.appendChild(banner);
      } else if (host.firstChild) {
        try { host.insertBefore(banner, host.firstChild); } catch (_) { host.appendChild(banner); }
      } else {
        host.appendChild(banner);
      }
    }
    var showRetry = (st === 'error' || st === 'offline' || st === 'quota');
    var retryLabel = t('mochi-sos.conn-retry', 'Coba lagi');
    banner.className = 'fz-mochi-conn-banner is-' + st;
    banner.setAttribute('data-conn-state', st);
    banner.innerHTML = [
      '<span class="fz-mcb-dot" aria-hidden="true"></span>',
      '<span class="fz-mcb-text">' + String(msg).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>',
      (showRetry ? '<button type="button" class="fz-mcb-retry" id="fzMochiConnRetryBtn">' + String(retryLabel).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</button>' : '')
    ].join('');
    banner.onclick = function (e) {
      if (e && e.target && e.target.id === 'fzMochiConnRetryBtn') return;
      removeConnectionBannerInternal();
    };
    var retryBtn = doc.getElementById('fzMochiConnRetryBtn');
    if (retryBtn) {
      retryBtn.onclick = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        _reconnectAttempts = 0;
        setConnectionStatusInternal('reconnecting', t('mochi-sos.conn-reconnecting', 'Menyambungkan ulang koneksi suara Mochi...'));
        var activeQ = getActiveQuestion(null);
        if (apiInstance.isCallActive()) {
          apiInstance._startGeminiLiveDuplex(activeQ);
        } else {
          apiInstance.startCall(activeQ, { autoEntry: true });
        }
      };
    }
    return banner;
  }

  function setConnectionStatusInternal(state, customMessage) {
    var nextState = String(state || 'idle').trim().toLowerCase();
    _connStatus = {
      state: nextState,
      message: customMessage ? String(customMessage) : '',
      updatedAt: Date.now()
    };
    if (_connBannerHideTimer) {
      clearTimeout(_connBannerHideTimer);
      _connBannerHideTimer = null;
    }
    if (nextState === 'idle' || nextState === 'connected') {
      removeConnectionBannerInternal();
      return _connStatus;
    }
    if (isLocalEnv() && (nextState === 'error' || nextState === 'reconnecting')) {
      removeConnectionBannerInternal();
      return _connStatus;
    }
    renderConnectionBannerInternal();
    if (nextState === 'error' || nextState === 'quota' || nextState === 'connecting' || nextState === 'reconnecting') {
      _connBannerHideTimer = setTimeout(function () {
        removeConnectionBannerInternal();
      }, 4000);
    }
    return _connStatus;
  }

  function isPlacementSession(opts) {
    opts = opts || {};
    if (opts.isPlacement || opts.placement) return true;
    var cfgType = String((opts && opts.cfgType) || (_session.cfg && _session.cfg.type) || '').trim().toLowerCase();
    if (cfgType === 'placement' || (_session.cfg && _session.cfg.placement)) return true;
    var state = getState();
    if (state && String(state.quizType || '') === 'placement') return true;
    try {
      if (root && root.FiezelExamLock && typeof root.FiezelExamLock.kind === 'function' && root.FiezelExamLock.kind() === 'placement') {
        return true;
      }
    } catch (_) {}
    return false;
  }

  function isExamLocked(opts) {
    opts = opts || {};
    if (opts.measureMode || opts.examLock || opts.noHints) return true;
    if (opts.examKind && String(opts.examKind).toLowerCase() !== 'placement') return true;
    if (isPlacementSession(opts)) return false;
    if (_session.locked) return true;
    try { if (typeof root.examLockActive === 'function' && root.examLockActive()) return true; } catch (_) {}
    var state = getState();
    if (state) {
      var qt = String(state.quizType || '');
      if (qt === 'level-exam' || qt === 'grammar-skip') return true;
    }
    return false;
  }

  function hapticTap(ms) {
    try {
      var state = getState();
      if (state && state.preferences && state.preferences.haptics === false) return;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms || 12);
    } catch (_) {}
  }

  function findMascotHost() {
    var doc = getDoc();
    if (!doc) return null;
    return doc.querySelector('.fz-paw-side fiezel-mascot, .quiz-stage fiezel-mascot, .quiz-shell fiezel-mascot, .writing-stage fiezel-mascot, .writing-page fiezel-mascot, #fzStoryContainer fiezel-mascot') ||
           doc.querySelector('.fz-paw-side .fz-paw-slot, .quiz-stage .fz-paw-slot, .quiz-shell .fz-paw-slot, .fz-paw-slot, .quiz-mascot, .writing-stage .lesson-stage-paw, .coach-strip-face.has-mascot, .fz-mochi-avatar') ||
           doc.querySelector('.quiz-stage, .quiz-shell, .writing-stage, .writing-page, #fzStoryContainer');
  }

  function bounceMascot() {
    var host = findMascotHost();
    if (!host) return;
    try {
      host.classList.remove('fz-mochi-tap-bounce');
      void host.offsetWidth;
      host.classList.add('fz-mochi-tap-bounce');
      setTimeout(function () { try { host.classList.remove('fz-mochi-tap-bounce'); } catch (_) {} }, 420);
    } catch (_) {}
  }

  function isInsideQuiz(target) {
    try {
      return !!(target && target.closest && target.closest('.quiz-shell, .quiz-stage, .writing-stage, .writing-page, #fzStoryContainer'));
    } catch (_) { return false; }
  }

  function isMascotTarget(target) {
    try {
      if (!target || !target.closest) return false;
      if (target.closest(NON_TAP_SELECTOR)) return false;
      return !!target.closest(MASCOT_SELECTOR) && isInsideQuiz(target);
    } catch (_) { return false; }
  }

  function getAudioContext() {
    if (!_audioCtx && (root.AudioContext || root.webkitAudioContext)) {
      var AC = root.AudioContext || root.webkitAudioContext;
      try { _audioCtx = new AC({ latencyHint: 'interactive' }); } catch (_) { _audioCtx = new AC(); }
    }
    return _audioCtx;
  }

  function getOrCreateTtsAnalyser(ctx) {
    if (!ctx || typeof ctx.createAnalyser !== 'function') return null;
    if (_ttsAnalyser && _ttsAnalyserCtx === ctx) return _ttsAnalyser;
    try {
      var an = ctx.createAnalyser();
      an.fftSize = 2048;
      an.smoothingTimeConstant = 0.5;
      an.connect(ctx.destination);
      _ttsAnalyser = an;
      _ttsAnalyserCtx = ctx;
      return an;
    } catch (_) {
      return null;
    }
  }

  function attachAnalyserToMochi(ctx) {
    try {
      var an = getOrCreateTtsAnalyser(ctx);
      if (!an) return null;
      var comp = root && root.FiezelMochiCompanion;
      var mochi = comp && typeof comp.getInstance === 'function' ? comp.getInstance() : null;
      if (mochi && typeof mochi.attachAudioAnalyser === 'function') {
        mochi.attachAudioAnalyser(an, ctx.sampleRate || 24000);
      }
      return an;
    } catch (_) {
      return null;
    }
  }

  function warmAudioContext() {
    var ctx = getAudioContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      try { ctx.resume().catch(function () {}); } catch (_) {}
    }
    // Buffer kosong 1 frame: memaksa graph audio 'hidup' di iOS/Safari dalam gesture.
    try {
      var b = ctx.createBuffer(1, 1, ctx.sampleRate);
      var s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (_) {}
    return ctx;
  }

  function armAudioWarmup() {
    var doc = getDoc();
    if (!doc || _audioWarmBound) return;
    _audioWarmBound = true;
    var onGesture = function () {
      var ctx = warmAudioContext();
      try {
        if (isMochiEnabledFromStorage() && isSosSurfaceActiveInternal()) {
          prewarmLiveSession(false);
          if (hasSessionStorage() && !_hotWs && !(_activeCall && _activeCall.active)) {
            openHotSocket();
          }
        }
      } catch (_) {}
      if (ctx && ctx.state === 'running') {
        doc.removeEventListener('pointerdown', onGesture, true);
        doc.removeEventListener('touchstart', onGesture, true);
        doc.removeEventListener('click', onGesture, true);
        doc.removeEventListener('keydown', onGesture, true);
        _audioWarmBound = false;
      }
    };
    doc.addEventListener('pointerdown', onGesture, true);
    doc.addEventListener('touchstart', onGesture, true);
    doc.addEventListener('click', onGesture, true);
    doc.addEventListener('keydown', onGesture, true);
  }

  function playTone() {
    // Mochi SOS unique synthetic tones/chimes disabled per user directive.
  }

  function playChime() {
    // Mochi SOS unique character SFX/chimes disabled per user directive.
  }

  function resolveSileroVendorBase() {
    try {
      if (root && root.location && root.location.href) {
        return new URL('vendor/silero-vad/', root.location.href).href;
      }
    } catch (_) {}
    return './vendor/silero-vad/';
  }

  function warmSileroVendorCache(baseHref) {
    try {
      var cachesApi = (root && root.caches) || (typeof caches !== 'undefined' ? caches : null);
      if (!cachesApi || typeof cachesApi.open !== 'function') return;
      var ver = (root && root.FIEZEL_VERSION) || 'silero-v5';
      var cacheName = 'fiezel-v' + ver;
      var files = [
        'bundle.min.js',
        'vad.worklet.bundle.min.js',
        'silero_vad_v5.onnx',
        'ort-wasm-simd-threaded.js',
        'ort-wasm-simd-threaded.wasm'
      ];
      cachesApi.open(cacheName).then(function (cache) {
        files.forEach(function (f) {
          var u = baseHref + f;
          cache.match(u).then(function (hit) {
            if (!hit) {
              fetch(u).then(function (res) {
                if (res && res.ok) cache.put(u, res.clone()).catch(function () {});
              }).catch(function () {});
            }
          }).catch(function () {});
        });
      }).catch(function () {});
    } catch (_) {}
  }

  function ensureSileroVadBundle() {
    if (root && root.vad && typeof root.vad.MicVAD === 'object' || (root && root.vad && root.vad.MicVAD && typeof root.vad.MicVAD.new === 'function')) {
      return Promise.resolve(root.vad);
    }
    if (_sileroBundlePromise) return _sileroBundlePromise;
    var doc = getDoc();
    if (!doc || typeof doc.createElement !== 'function' || typeof WebAssembly === 'undefined') {
      return Promise.resolve(null);
    }
    var baseHref = resolveSileroVendorBase();
    _sileroBundlePromise = new Promise(function (resolve) {
      try {
        var existing = doc.querySelector('script[data-fz-silero-vad="1"]');
        if (existing) {
          if (root.vad && root.vad.MicVAD) { resolve(root.vad); return; }
          existing.addEventListener('load', function () { resolve(root.vad || null); }, { once: true });
          existing.addEventListener('error', function () { _sileroBundlePromise = null; resolve(null); }, { once: true });
          return;
        }
        var s = doc.createElement('script');
        s.src = baseHref + 'bundle.min.js';
        s.async = true;
        s.setAttribute('data-fz-silero-vad', '1');
        s.onload = function () {
          warmSileroVendorCache(baseHref);
          resolve((root && root.vad) ? root.vad : null);
        };
        s.onerror = function () {
          _sileroBundlePromise = null;
          resolve(null);
        };
        (doc.head || doc.documentElement || doc.body).appendChild(s);
      } catch (_) {
        _sileroBundlePromise = null;
        resolve(null);
      }
    });
    return _sileroBundlePromise;
  }

  // Fallback vocal-formant DSP analyzer (300-3200 Hz band vs low-freq engine rumble & high-freq hiss)
  // Used only during the ~120ms WASM boot or in non-WASM unit test sandboxes.
  var _dspBiquadState = { lp1: 0, hp1: 0 };
  function analyzeHumanVoiceBandFrame(float32, sampleRate) {
    var n = float32 ? float32.length : 0;
    if (!n) return { isHumanSpeech: false, rms: 0, vocalRatio: 0, zcr: 0 };
    var sr = sampleRate || 48000;
    var dt = 1 / sr;
    var rcHp = 1 / (2 * Math.PI * 285);
    var alphaHp = rcHp / (rcHp + dt);
    var rcLp = 1 / (2 * Math.PI * 3300);
    var alphaLp = dt / (rcLp + dt);

    var totalSq = 0;
    var vocalSq = 0;
    var zc = 0;
    var prev = float32[0];
    var hpPrevY = _dspBiquadState.hp1 || 0;
    var hpPrevX = prev;
    var lpPrevY = _dspBiquadState.lp1 || 0;

    for (var i = 0; i < n; i++) {
      var x = float32[i];
      totalSq += x * x;
      if ((x >= 0 && prev < 0) || (x < 0 && prev >= 0)) zc++;
      prev = x;
      var hp = alphaHp * (hpPrevY + x - hpPrevX);
      hpPrevX = x;
      hpPrevY = hp;
      var bp = lpPrevY + alphaLp * (hp - lpPrevY);
      lpPrevY = bp;
      vocalSq += bp * bp;
    }
    _dspBiquadState.hp1 = hpPrevY;
    _dspBiquadState.lp1 = lpPrevY;

    var rms = Math.sqrt(totalSq / n);
    var vocalRms = Math.sqrt(vocalSq / n);
    var vocalRatio = totalSq > 1e-9 ? (vocalSq / totalSq) : 0;
    var zcr = zc / n;
    // Reject low-frequency vehicle/engine rumble (<285 Hz -> vocalRatio < 0.52) and broadband wind/hiss (zcr > 0.25)
    var isHumanSpeech = (rms >= 0.009) && (vocalRms >= 0.0065) && (vocalRatio >= 0.54) && (zcr >= 0.012 && zcr <= 0.24);
    return { isHumanSpeech: isHumanSpeech, rms: rms, vocalRatio: vocalRatio, zcr: zcr };
  }

  function bytesToBase64(bytes) {
    var binary = '';
    var CHUNK = 8192;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
    }
    if (typeof btoa === 'function') return btoa(binary);
    if (root && typeof root.btoa === 'function') return root.btoa(binary);
    if (typeof Buffer !== 'undefined') return Buffer.from(binary, 'binary').toString('base64');
    return '';
  }

  function float32ToPcm16Base64(float32) {
    var int16 = new Int16Array(float32.length);
    for (var i = 0; i < float32.length; i++) {
      var s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return bytesToBase64(new Uint8Array(int16.buffer));
  }

  function resampleAndConvertToPcm16Base64(float32, fromRate, toRate) {
    toRate = toRate || 16000;
    fromRate = fromRate || toRate;
    if (fromRate === toRate) return float32ToPcm16Base64(float32);
    var ratio = fromRate / toRate;
    var newLength = Math.max(1, Math.floor(float32.length / ratio));
    var int16 = new Int16Array(newLength);
    // Box-average per jendela rasio = low-pass ringan anti-aliasing sebelum desimasi.
    for (var i = 0; i < newLength; i++) {
      var start = Math.floor(i * ratio);
      var end = Math.min(float32.length, Math.floor((i + 1) * ratio));
      if (end <= start) end = Math.min(float32.length, start + 1);
      var acc = 0;
      for (var k = start; k < end; k++) acc += float32[k];
      var sample = acc / (end - start);
      var s = Math.max(-1, Math.min(1, sample));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return bytesToBase64(new Uint8Array(int16.buffer));
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
      var ls = (root && root.localStorage) || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (ls && typeof ls.getItem === 'function') {
        var k = ls.getItem('fz_gemini_api_key') ||
                ls.getItem('gemini_api_key') ||
                ls.getItem('GEMINI_API_KEY');
        if (k && k.trim().length > 10) return k.trim();
      }
    } catch (_) {}
    return '';
  }

  function isDirectKeyAvailable() {
    var k = getUserGeminiApiKey();
    if (!k) return false;
    return Date.now() >= _directKeyCooldownUntil;
  }

  function markDirectKeyQuotaCooldown() {
    _directKeyCooldownUntil = Date.now() + DIRECT_KEY_COOLDOWN_MS;
    _prewarm.session = null;
    _prewarm.fetchedAt = 0;
    if (_activeCall && _activeCall.active) {
      setConnectionStatusInternal('quota', t('mochi-sos.conn-quota', 'Kuota API AI penuh — mengalihkan jalur koneksi...'));
    }
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

  function fetchLiveSessionToken(opts) {
    opts = opts || {};
    if (!opts.skipDirectKey && isDirectKeyAvailable()) {
      var userKey = getUserGeminiApiKey();
      return Promise.resolve({
        ok: true,
        directKey: true,
        keyIndex: 0,
        endpoint: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=' + encodeURIComponent(userKey)
      });
    }

    var bases = resolveVoiceApiBases();
    var tryBase = function (index) {
      if (index >= bases.length) {
        return Promise.resolve({ ok: false });
      }
      var base = bases[index];
      var url = (base ? base : '') + '/api/voice/live-session';
      var fetchFn = (root && typeof root.fetch === 'function') ? root.fetch.bind(root) : (typeof fetch === 'function' ? fetch : null);
      if (!fetchFn) return Promise.resolve({ ok: false });
      return fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }).then(function (res) {
        if (!res || !res.ok) return tryBase(index + 1);
        return res.json().then(function (data) {
          if (data && data.ok && data.token) {
            var ep = data.endpoint || 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';
            return {
              ok: true,
              directKey: false,
              keyIndex: data.keyIndex || 0,
              expireAt: data.expireAt || (Date.now() + 30 * 60e3),
              newSessionExpireAt: data.newSessionExpireAt || (Date.now() + 2 * 60e3),
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

  function hasSessionStorage() {
    try {
      var ss = (root && root.sessionStorage) || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
      return !!(ss && typeof ss.getItem === 'function');
    } catch (_) {
      return false;
    }
  }

  function getGreetingCacheKey() {
    return 'fz_mochi_greet_pcm_v1_' + getLocale() + '_' + String(getRegisteredLearnerName() || '').toLowerCase();
  }

  function getPrewarmedGreetingChunks() {
    try {
      var key = getGreetingCacheKey();
      if (_greetingPcmCache && _greetingPcmCache.key === key && Array.isArray(_greetingPcmCache.chunks) && _greetingPcmCache.chunks.length > 0) {
        return _greetingPcmCache.chunks;
      }
      var ss = (root && root.sessionStorage) || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
      if (ss && typeof ss.getItem === 'function') {
        var raw = ss.getItem(key);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.chunks) && parsed.chunks.length > 0) {
            _greetingPcmCache = { key: key, chunks: parsed.chunks };
            return parsed.chunks;
          }
        }
      }
      if (hasSessionStorage()) {
        var ls = (root && root.localStorage) || (typeof localStorage !== 'undefined' ? localStorage : null);
        if (ls && typeof ls.getItem === 'function') {
          var rawLs = ls.getItem(key);
          if (rawLs) {
            var parsedLs = JSON.parse(rawLs);
            if (parsedLs && Array.isArray(parsedLs.chunks) && parsedLs.chunks.length > 0) {
              _greetingPcmCache = { key: key, chunks: parsedLs.chunks };
              return parsedLs.chunks;
            }
          }
        }
      }
    } catch (_) {}
    return null;
  }

  function warmGreetingAudioInBackground() {
    // Ghost traffic elimination: background WebSocket connections and token minting
    // are completely disabled to prevent 429 quota exhaustion and policy violations.
    return;
  }

  function prewarmLiveSession(force) {
    // Ghost traffic elimination: background WebSocket and token pre-fetching are disabled.
    // Audio calls are connected on-demand when user explicitly initiates/confirms a call.
    return Promise.resolve(null);
  }

  function takePrewarmedSession() {
    var s = _prewarm.session;
    var fresh = s && s.ok && (Date.now() - _prewarm.fetchedAt) < TOKEN_STALE_MS;
    if (s && s.directKey && !isDirectKeyAvailable()) fresh = false;
    _prewarm.session = null;
    _prewarm.fetchedAt = 0;
    return fresh ? s : null;
  }

  function schedulePrewarmRefresh() {
    if (_prewarm.timer) { clearInterval(_prewarm.timer); _prewarm.timer = null; }
  }

  function clearPrewarm() {
    if (_prewarm.timer) { clearInterval(_prewarm.timer); _prewarm.timer = null; }
    _prewarm.session = null;
    _prewarm.fetchedAt = 0;
    _prewarm.promise = null;
    discardHotSocket();
  }

  var MOCHI_SOS_TOOLS = [{
    functionDeclarations: [
      {
        name: 'highlight_quiz_clue',
        description: 'Highlight a Socratic clue word, time marker, or particle inside the passage or prompt on screen without revealing the winning answer.',
        parameters: {
          type: 'OBJECT',
          properties: {
            clue_text: {
              type: 'STRING',
              description: 'Exact substring from the stem or passage (never from the answer options) that serves as a grammar or reading clue.'
            },
            pedagogical_reason: {
              type: 'STRING',
              description: 'Brief pedagogical reason why this token guides reasoning.'
            }
          },
          required: ['clue_text']
        }
      },
      {
        name: 'clear_quiz_highlights',
        description: 'Clear all clue highlights on the current practice card.',
        parameters: {
          type: 'OBJECT',
          properties: {}
        }
      }
    ]
  }];

  function getQuestionSig(q) {
    if (!q || typeof q !== 'object') return '';
    return String(q.id || q.question || q.stem || q.prompt || (q.focus && q.focus.word) || '').trim();
  }

  // PENTING: Jangan sertakan `tools` di dalam payload `setup` Gemini 3.8 Live karena
  // ketika model memanggil `highlight_quiz_clue`, Gemini 3.8 Live memutus giliran bicara
  // (`turnComplete: true`) setelah 2 kata ("Halo Haiza!") tanpa membacakan pembahasan soal.
  // Sorotan kata petunjuk dilakukan otomatis di sisi klien oleh `autoHighlightQuestionClue(q)`.
  function buildSetupFrame(q, ctx) {
    return JSON.stringify({
      setup: {
        model: LIVE_MODEL,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE_VOICE } } }
        },
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        systemInstruction: { parts: [{ text: buildMochiSystemPrompt(q, getLocale(), ctx) }] }
      }
    });
  }

  // Membuka WS + kirim setup di latar belakang dinonaktifkan demi perlindungan kuota Gemini API.
  function openHotSocket() {
    return;
  }

  function discardHotSocket() {
    if (_hotWsIdleTimer) { clearTimeout(_hotWsIdleTimer); _hotWsIdleTimer = null; }
    if (_hotWs) {
      try { if (_hotWs.readyState <= 1) _hotWs.close(1000, 'hot_idle'); } catch (_) {}
      _hotWs = null;
    }
    _hotWsSetupComplete = false;
  }

  function reportDrop(code, reason, keyIndex) {
    try {
      var bases = resolveVoiceApiBases();
      var base = bases.length ? bases[bases.length - 1] : '';
      fetch(base + '/api/voice/report-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code, reason: String(reason || ''), keyIndex: keyIndex || 0 }),
        keepalive: true
      }).catch(function () {});
    } catch (_) {}
  }

  function clip(s, n) {
    s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function optionText(o) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    return String(o.text || o.label || o.value || JSON.stringify(o));
  }

  function detectExerciseType(q, ctx) {
    var t = String((q && q.type) || '').toLowerCase();
    var skill = String((q && (q.skill || q.concept)) || '').toLowerCase();
    if (t === 'writing' || skill.indexOf('writing') === 0 || (ctx && ctx.cfgType === 'writing')) return 'writing';
    if (t === 'listening' || skill.indexOf('listening') === 0) return 'listening';
    if (q && q.passage) return 'reading';
    if (t === 'reading' || skill.indexOf('reading') === 0) return 'reading';
    if (t === 'token-order' || t === 'sentence-build' || t === 'cloze') return 'build';
    if (t === 'vocab' || t === 'vocabulary' || skill.indexOf('vocabulary') === 0) return 'vocab';
    if (t === 'kanji' || skill.indexOf('kanji') === 0) return 'kanji';
    if (ctx && ctx.cfgType === 'reading') return 'reading';
    return 'grammar';
  }

  function escapeRegExp(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getWinningAnswerTokens(q) {
    var tokens = [];
    if (!q || typeof q !== 'object') return tokens;
    var idxKey = 'answer' + 'Index';
    var ansIdx = q[idxKey];
    if (Array.isArray(q.options) && typeof ansIdx === 'number' && q.options[ansIdx] != null) {
      var rawOpt = String(optionText(q.options[ansIdx]) || '').trim();
      if (rawOpt) {
        tokens.push(rawOpt);
        var stripped = rawOpt.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
        if (stripped && stripped !== rawOpt) tokens.push(stripped);
      }
    }
    var extras = [q.clozeAnswer, q.correctAnswer, q.expected, q.answerText];
    for (var i = 0; i < extras.length; i++) {
      var ex = String(extras[i] || '').trim();
      if (ex) tokens.push(ex);
    }
    if (Array.isArray(q.targetTokens) && q.targetTokens.length > 0) {
      tokens.push(q.targetTokens.join(' '));
      tokens.push(q.targetTokens.join(''));
    }
    return tokens;
  }

  function redactAnswerFromHint(rawText, q) {
    var out = String(rawText || '').trim();
    if (!out || !q) return out;
    var winners = getWinningAnswerTokens(q);
    for (var i = 0; i < winners.length; i++) {
      var w = String(winners[i] || '').trim();
      if (!w) continue;
      var hasNonAscii = /[^\u0000-\u007F]/.test(w);
      if (hasNonAscii) {
        out = out.split(w).join('[...]');
      } else if (w.length >= 2) {
        var re = new RegExp('\\b' + escapeRegExp(w) + '\\b', 'gi');
        out = out.replace(re, '[...]');
      } else if (w.length === 1) {
        var qRe = new RegExp('(["\'“”‘’`])' + escapeRegExp(w) + '\\1', 'gi');
        out = out.replace(qRe, '[...]');
      }
    }
    // Scrub explicit letter-key mentions like "opsi B" / "pilihan C" / "jawaban A"
    out = out.replace(/\b(opsi|pilihan|huruf|option)\s+[A-D]\b/gi, '[...]');
    return out;
  }

  // Ekstraksi langsung dari DOM yang sedang dilihat murid di layar (.quiz-shell / .grammar-lesson-page)
  function extractLiveDomQuestionDetails(doc) {
    var out = {
      instruction: '',
      stem: '',
      focusWord: '',
      focusPhonetic: '',
      options: [],
      tokenChips: [],
      passageTitle: '',
      passageText: '',
      visibleFeedback: '',
      visibleNudge: ''
    };
    if (!doc || typeof doc.querySelector !== 'function') return out;
    try {
      var stemEl = doc.getElementById ? doc.getElementById('quizStem') : doc.querySelector('#quizStem');
      if (stemEl) {
        var instEl = stemEl.querySelector ? stemEl.querySelector('.question-instruction') : null;
        var mainEl = stemEl.querySelector ? stemEl.querySelector('.question-main') : null;
        if (instEl && instEl.textContent) out.instruction = instEl.textContent.replace(/\s+/g, ' ').trim();
        if (mainEl && mainEl.textContent) {
          out.stem = mainEl.textContent.replace(/\s+/g, ' ').trim();
        } else if (stemEl.textContent) {
          out.stem = stemEl.textContent.replace(/\s+/g, ' ').trim();
        }
      }
      var vfWord = doc.querySelector('.vocab-focus .vocab-focus-word');
      var vfPhon = doc.querySelector('.vocab-focus .phonetic');
      if (vfWord && vfWord.textContent) out.focusWord = vfWord.textContent.replace(/\s+/g, ' ').trim();
      if (vfPhon && vfPhon.textContent) out.focusPhonetic = vfPhon.textContent.replace(/\s+/g, ' ').trim();

      var optBtns = doc.querySelectorAll ? doc.querySelectorAll('#options .option') : [];
      for (var i = 0; i < optBtns.length; i++) {
        var txt = (optBtns[i].textContent || '').replace(/\s+/g, ' ').trim();
        if (txt) out.options.push(txt);
      }

      var chipEls = doc.querySelectorAll ? doc.querySelectorAll('#options .token-chip, .token-bank .token-chip') : [];
      for (var c = 0; c < chipEls.length; c++) {
        var cTxt = (chipEls[c].textContent || '').replace(/\s+/g, ' ').trim();
        if (cTxt) out.tokenChips.push(cTxt);
      }

      var passEl = doc.getElementById ? doc.getElementById('quizPassage') : doc.querySelector('#quizPassage');
      if (passEl) {
        var pTitle = passEl.querySelector ? passEl.querySelector('h3, b') : null;
        var pBody = passEl.querySelector ? passEl.querySelector('p') : null;
        if (pTitle && pTitle.textContent) out.passageTitle = pTitle.textContent.replace(/\s+/g, ' ').trim();
        if (pBody && pBody.textContent) out.passageText = pBody.textContent.replace(/\s+/g, ' ').trim();
      }

      var fbEl = doc.getElementById ? doc.getElementById('feedback') : doc.querySelector('#feedback');
      if (fbEl && (!fbEl.classList || !fbEl.classList.contains('hidden')) && fbEl.textContent) {
        var fbTxt = fbEl.textContent.replace(/\s+/g, ' ').trim();
        if (fbTxt) out.visibleFeedback = fbTxt;
      }

      var nudgeEl = doc.getElementById ? doc.getElementById('quizScaffoldNudge') : doc.querySelector('#quizScaffoldNudge');
      if (nudgeEl && nudgeEl.textContent) {
        var nTxt = nudgeEl.textContent.replace(/\s+/g, ' ').trim();
        if (nTxt) out.visibleNudge = nTxt;
      }
    } catch (_) {}
    return out;
  }

  function buildQuizContextSnapshot(q, ctx) {
    q = getActiveQuestion(q) || q || {};
    ctx = ctx || _currentCtx || {};
    var state = getState() || {};
    var dom = extractLiveDomQuestionDetails(getDoc());
    var kind = detectExerciseType(q, ctx);
    var rawOpts = (Array.isArray(q.options) && q.options.length > 0) ? q.options : dom.options;
    var opts = Array.isArray(rawOpts) ? rawOpts.map(function (o, i) {
      return String.fromCharCode(65 + i) + ') ' + clip(optionText(o), 160);
    }) : [];
    var tokenList = (Array.isArray(q.tokens) && q.tokens.length > 0) ? q.tokens : dom.tokenChips;
    var explain = (q.explain && typeof q.explain === 'object') ? q.explain : {};
    var tried = _attempts.filter(function (a) { return a.qid === (q.id || q.target || q.question); });

    // Berikan penjelasan pedagogis UTUH (tanpa disensor '[...]') kepada otak AI Mochi
    // agar Mochi memahami 100% soal, pilihan, aturan tata bahasa, dan alasan pengecoh
    // yang sedang dilihat murid di layar, sambil tetap dijaga Invarian Sokratik & transcriptLeaks!
    var fullRule = String(explain.rule || q.rule || '').trim();
    var fullWhy = String(explain.why || (typeof q.explain === 'string' ? q.explain : '') || '').trim();
    var fullDistractor = String(explain.distractor || '').trim();
    var fullMemory = String(explain.memory || '').trim();
    var fullAvoid = String(explain.avoid || '').trim();
    var fullEvidence = String(explain.evidence || '').trim();

    var distractorNotes = [];
    if (Array.isArray(explain.distractors)) {
      for (var di = 0; di < explain.distractors.length; di++) {
        var dRow = explain.distractors[di];
        if (dRow && dRow.option && dRow.reason && dRow.own === false) {
          distractorNotes.push('"' + clip(dRow.option, 60) + '": ' + clip(dRow.reason, 180));
        } else if (dRow && dRow.option && dRow.reason) {
          distractorNotes.push('"' + clip(dRow.option, 60) + '": ' + clip(redactAnswerFromHint(dRow.reason, q), 180));
        }
      }
    } else if (explain.distractors && typeof explain.distractors === 'object') {
      var dKeys = Object.keys(explain.distractors);
      for (var dk = 0; dk < dKeys.length; dk++) {
        var optKey = dKeys[dk];
        var dVal = explain.distractors[optKey];
        if (dVal) {
          var reasonStr = typeof dVal === 'string' ? dVal : (dVal.reason || dVal.why || '');
          if (reasonStr) {
            distractorNotes.push('"' + clip(optKey, 60) + '": ' + clip(reasonStr, 180));
          }
        }
      }
    }

    var rawQuestion = String(q.question || q.stem || q.prompt || '').trim();
    var resolvedInstruction = String(q.instruction || dom.instruction || '').trim();
    var resolvedStem = dom.stem || rawQuestion;
    if (!resolvedInstruction && rawQuestion.indexOf('\n') !== -1) {
      var qParts = rawQuestion.split('\n');
      resolvedInstruction = qParts[0].trim();
      resolvedStem = qParts.slice(1).join(' ').trim() || resolvedStem;
    }

    return {
      kind: kind,
      targetLang: String(ctx.targetLang || (state.preferences && state.preferences.targetLang) || state.targetLang || 'en'),
      level: String(ctx.level || state.level || ''),
      progress: (ctx.asked != null && ctx.planned != null) ? ((Number(ctx.asked) + 1) + '/' + ctx.planned) : '',
      instruction: clip(resolvedInstruction, 220),
      stem: clip(resolvedStem, 650),
      options: opts,
      tokens: Array.isArray(tokenList) ? tokenList.map(function (tk) { return clip(String(tk), 40); }) : [],
      focusWord: clip((q.focus && q.focus.word) || dom.focusWord || '', 80),
      focusPhonetic: clip((q.focus && q.focus.phonetic) || dom.focusPhonetic || '', 80),
      targetWord: clip(q.targetWord || q.repairWord || '', 80),
      writingDraft: clip(q.writingDraft || '', 600),
      writingHint: clip(q.writingHint || '', 260),
      concept: clip(q.concept || q.skill || '', 140),
      rule: clip(fullRule, 450),
      why: clip(fullWhy, 450),
      distractor: clip(fullDistractor, 350),
      distractorNotes: distractorNotes.slice(0, 4),
      memory: clip(fullMemory, 240),
      avoid: clip(fullAvoid, 240),
      evidence: clip(fullEvidence, 350),
      passageTitle: clip((q.passage && q.passage.title) || dom.passageTitle || '', 140),
      passageText: clip((q.passage && q.passage.text) || (typeof q.passage === 'string' ? q.passage : '') || dom.passageText || '', 1400),
      visibleFeedback: clip(dom.visibleFeedback || '', 500),
      visibleNudge: clip(dom.visibleNudge || '', 320),
      script: kind === 'listening' ? clip(q.script || q.transcript || q.dialogue || '', 1200) : '',
      scenario: clip(q.scenario || (q.meta && q.meta.scenario) || '', 160),
      attempts: tried.map(function (a) {
        return { letter: String.fromCharCode(65 + a.idx), text: clip(a.text, 120), ok: !!a.ok };
      }),
      firstTry: tried.length === 0
    };
  }

  // ─── Kolaborasi Aktif Braincore × Mochi SOS (3-Tahap Eskalasi Pedagogis SMP) ───
  function evaluateBraincoreStruggleState(q) {
    q = getActiveQuestion(q) || q || {};
    var state = getState() || {};
    var qid = q.id || q.target || q.question || q.stem || '';
    var qAttempts = _attempts.filter(function (a) { return qid && a.qid === qid; });
    var wrongAttempts = qAttempts.filter(function (a) { return !a.ok; });
    var wrongAttemptsOnCurrent = wrongAttempts.length;
    var triedOptions = wrongAttempts.map(function (a) { return clip(a.text, 60); }).filter(Boolean);

    var skillKey = String(q.skill || q.concept || q.grammarId || q.patternId || q.type || 'general').trim();
    var pKnown = null;
    var bktAttempts = 0;
    try {
      var bktMap = state.bkt || (state.brain && state.brain.bkt) || null;
      if (bktMap && typeof bktMap === 'object') {
        var entry = bktMap[skillKey] || (q.concept && bktMap[q.concept]) || (q.skill && bktMap[q.skill]) || null;
        if (entry != null) {
          if (typeof entry === 'number') {
            pKnown = entry;
          } else if (typeof entry === 'object') {
            if (typeof entry.pKnown === 'number') pKnown = entry.pKnown;
            else if (typeof entry.p === 'number') pKnown = entry.p;
            else if (typeof entry.mastery === 'number') pKnown = entry.mastery;
            if (typeof entry.attempts === 'number') bktAttempts = entry.attempts;
            else if (typeof entry.n === 'number') bktAttempts = entry.n;
            else if (typeof entry.count === 'number') bktAttempts = entry.count;
          }
        }
      }
      if (pKnown === null && root && root.FiezelOLM && typeof root.FiezelOLM.getSkillMastery === 'function') {
        var olmVal = root.FiezelOLM.getSkillMastery(skillKey);
        if (typeof olmVal === 'number') pKnown = olmVal;
        else if (olmVal && typeof olmVal.pKnown === 'number') {
          pKnown = olmVal.pKnown;
          bktAttempts = Number(olmVal.attempts || olmVal.n || 0);
        }
      }
    } catch (_) {}

    var lowBktMastery = (pKnown !== null && pKnown < 0.42 && bktAttempts >= 2);

    var misconceptionId = String(q.misconceptionId || q.whyFailsId || '').trim();
    var misconceptionCount = 0;
    try {
      var ledger = (root && root.FiezelMisconceptionLedger) || state.misconceptionLedger || state.misconceptions || null;
      if (ledger) {
        if (typeof ledger.getForSkill === 'function') {
          var listBySkill = ledger.getForSkill(skillKey) || [];
          if (Array.isArray(listBySkill) && listBySkill.length > 0) {
            misconceptionCount = listBySkill.length;
            if (!misconceptionId && listBySkill[0]) {
              misconceptionId = String(listBySkill[0].id || listBySkill[0].misconceptionId || listBySkill[0].code || '');
            }
          }
        } else if (typeof ledger.getTopMisconceptions === 'function') {
          var topM = ledger.getTopMisconceptions(3) || [];
          if (Array.isArray(topM) && topM.length > 0) {
            for (var tm = 0; tm < topM.length; tm++) {
              var itemM = topM[tm];
              if (itemM && (!itemM.skill || itemM.skill === skillKey)) {
                misconceptionCount += Number(itemM.count || itemM.hits || 1);
                if (!misconceptionId) misconceptionId = String(itemM.id || itemM.misconceptionId || itemM.code || '');
              }
            }
          }
        } else if (typeof ledger === 'object') {
          var entries = ledger.entries || ledger.byId || ledger;
          if (entries && typeof entries === 'object') {
            var mKeys = Object.keys(entries);
            for (var mk = 0; mk < mKeys.length; mk++) {
              var mRow = entries[mKeys[mk]];
              if (mRow && (mKeys[mk] === skillKey || mKeys[mk] === misconceptionId || mRow.skill === skillKey)) {
                var cnt = typeof mRow === 'number' ? mRow : Number(mRow.count || mRow.hits || 1);
                if (cnt > 0) {
                  misconceptionCount += cnt;
                  if (!misconceptionId) misconceptionId = String(mRow.id || mKeys[mk]);
                }
              }
            }
          }
        }
      }
    } catch (_) {}

    var recentWrongStreak = 0;
    var skillWrongCount = 0;
    try {
      var hist = Array.isArray(state.history) ? state.history : [];
      for (var hi = hist.length - 1; hi >= 0 && hi >= hist.length - 6; hi--) {
        var h = hist[hi];
        if (!h) continue;
        var hOk = !!(h.ok || h.correct || h.isCorrect);
        if (!hOk && hi >= hist.length - 3) {
          recentWrongStreak++;
        }
        var hSkill = String(h.skill || h.concept || h.type || '').trim();
        if (!hOk && hSkill && hSkill === skillKey) {
          skillWrongCount++;
        }
        if (!misconceptionId && !hOk && (h.misconceptionId || h.whyFailsId)) {
          misconceptionId = String(h.misconceptionId || h.whyFailsId);
        }
      }
    } catch (_) {}

    var repeatedMisconception = (misconceptionCount >= 2 || skillWrongCount >= 2 || recentWrongStreak >= 2);
    var isStruggling = !!(wrongAttemptsOnCurrent >= 2 || lowBktMastery || repeatedMisconception);

    var stage = 1;
    var stageName = 'independent_think';
    if (isStruggling) {
      stage = 3;
      stageName = 'braincore_intensive_rescue';
    } else if (wrongAttemptsOnCurrent === 1 || _userAskedConceptOnCurrent) {
      stage = 2;
      stageName = 'smp_concept_scaffold';
    }

    var reasons = [];
    if (wrongAttemptsOnCurrent >= 2) reasons.push('wrong_attempts_' + wrongAttemptsOnCurrent);
    if (lowBktMastery) reasons.push('low_bkt_pknown_' + Math.round(pKnown * 100));
    if (repeatedMisconception) reasons.push('repeated_misconception');

    var diagnosticPacket = '';
    if (stage === 3) {
      diagnosticPacket =
        '[KOLABORASI BRAINCORE × MOCHI SOS AKTIF: Tahap=3 (Pendampingan Intensif) | Skill=' + skillKey +
        (pKnown !== null ? ' | pKnown=' + pKnown.toFixed(2) : '') +
        ' | PercobaanKeliru=' + wrongAttemptsOnCurrent + 'x' +
        (misconceptionId ? ' | Miskonsepsi=' + misconceptionId : '') +
        (triedOptions.length ? ' | OpsiDicoba=' + triedOptions.join(', ') : '') +
        ' — Braincore mendeteksi peserta sedang kesulitan memahami butir ini. Bimbing selangkah demi selangkah dengan bahasa anak SMP yang sangat sabar, kalimat pendek, dan perumpamaan sehari-hari. Urai mengapa pilihan sebelumnya kurang cocok, lalu bantu arahkan perhatiannya ke petunjuk di kalimat/bacaan TANPA membocorkan kunci!]';
    } else if (stage === 2) {
      diagnosticPacket =
        '[TAHAP 2 — PENJELASAN KONSEP DASAR BAHASA SMP: Peserta butuh bekal pemahaman konsep dasar agar bisa berpikir sendiri. Jelaskan cara kerja aturan kalimat atau cara menemukan ide pokok secara umum dengan bahasa anak SMP yang jernih dan perumpamaan sehari-hari (TANPA istilah linguistik rumit dan TANPA menunjuk langsung kata/kalimat kunci di teks), supaya peserta bisa memakai konsep itu untuk menemukan jawabannya sendiri!]';
    } else {
      diagnosticPacket =
        '[TAHAP 1 — BERPIKIR MANDIRI DAHULU: Peserta baru membuka butir ini. Sapa dengan hangat, ajak memahami maksud pertanyaan secara umum dengan bahasa anak SMP yang santai. DILARANG KERAS langsung memberi tahu hint sempit atau menunjuk kata/kalimat tertentu di bacaan/butir yang membuat opsi gampang ditebak! Biarkan peserta membaca dan mencoba berpikir sendiri dulu.]';
    }

    return {
      isStruggling: isStruggling,
      stage: stage,
      stageName: stageName,
      allowClueHighlight: isStruggling,
      skillKey: skillKey,
      pKnown: pKnown,
      bktAttempts: bktAttempts,
      wrongAttemptsOnCurrent: wrongAttemptsOnCurrent,
      misconceptionId: misconceptionId,
      misconceptionCount: misconceptionCount,
      recentWrongStreak: recentWrongStreak,
      triedOptions: triedOptions,
      reasons: reasons,
      diagnosticPacket: diagnosticPacket
    };
  }

  function buildMochiSystemPrompt(q, locale, ctx) {
    var s = buildQuizContextSnapshot(q, ctx);
    var bc = evaluateBraincoreStruggleState(q);
    var learnerName = getRegisteredLearnerName();
    var lang = locale === 'th' ? 'Thailand' : 'Indonesia';
    var target = s.targetLang === 'ja' ? 'Bahasa Jepang (JLPT)' : 'Bahasa Inggris (CEFR)';
    var kindLabel = {
      grammar: 'Tata bahasa (Grammar)', listening: 'Menyimak (Listening/Chokai)', vocab: 'Vocabulary (Tango)',
      reading: 'Membaca pemahaman (Reading)', kanji: 'Kanji', build: 'Menyusun kalimat / melengkapi (Sentence Building/Cloze)',
      writing: 'Menulis terarah (Writing)'
    }[s.kind] || 'Session';

    var lines = [
      'Kamu adalah Mochi, maskot Daifuku bulat putih berpipi merah muda dari FIEZEL. Kamu kakak mentor Sokratik yang ramah dan membimbing peserta bernama "' + learnerName + '" supaya BERPIKIR SENDIRI sepanjang sesi.',
      'GAYA BICARA SETARA ANAK SMP (JERNIH, SEDERHANA, & MUDAH DIMENGERTI): Berbicaralah HANYA dalam Bahasa ' + lang + ' dengan gaya seperti kakak kelas / mentor yang ngobrol santai bersama anak SMP: kalimat pendek, hangat, logis, membumi, dan pakai perumpamaan sehari-hari yang langsung kebayang. Maksimal 2-3 kalimat singkat (20-35 kata) per giliran bicara.',
      'PANTANGAN ISTILAH RUMIT: DILARANG KERAS memakai istilah linguistik/akademik rumit seperti "klausa subordinatif", "morfologi", "predikat transitif", "konjugasi afirmatif", "anteseden", atau "nomina abstrak". Ganti semua istilah teknis dengan logika sederhana anak SMP!',
      'Identitas peserta yang sedang kamu bimbing: "' + learnerName + '". Panggil namanya secara natural.',
      '',
      '=== BUTIR, OPSI, & PENJELASAN PEDAGOGIS DI LAYAR (PEGANGAN MENTOR) ===',
      'Kategori: ' + kindLabel + (s.progress ? ' | Butir: ' + s.progress : '') + (s.level ? ' | Level: ' + s.level : '') + ' | Bahasa Target: ' + target,
      s.instruction ? 'Instruksi di layar: "' + s.instruction + '"' : '',
      s.focusWord ? 'Kata Fokus di layar: "' + s.focusWord + '"' + (s.focusPhonetic ? ' (' + s.focusPhonetic + ')' : '') : '',
      s.stem ? 'Teks utama soal di layar: "' + s.stem + '"' : 'Teks utama: (belum tersedia)',
      s.targetWord ? 'Kata yang sedang diuji/diperbaiki di soal: "' + s.targetWord + '"' : '',
      s.writingHint ? 'Panduan penulisan: "' + s.writingHint + '"' : '',
      s.writingDraft ? 'Draf tulisan peserta saat ini: "' + s.writingDraft + '"' : '',
      s.options.length ? 'Pilihan jawaban di layar (JANGAN PERNAH sebut huruf A/B/C/D atau membocorkan pilihan yang benar):\n' + s.options.join('\n') : '',
      s.tokens.length ? 'Kepingan kata untuk disusun di layar: ' + s.tokens.join(' | ') : '',
      s.passageText ? 'Teks bacaan acuan' + (s.passageTitle ? ' ("' + s.passageTitle + '")' : '') + ':\n"' + s.passageText + '"' : '',
      (s.kind !== 'reading' && ctx && ctx.context && ctx.context.text) ? 'Konteks set ("' + clip(ctx.context.title, 120) + '"): "' + clip(ctx.context.text, 800) + '"' : '',
      s.script ? 'NASKAH AUDIO (hanya untuk pemahamanmu, peserta TIDAK melihat teks ini): "' + s.script + '"' : '',
      s.scenario ? 'Situasi percakapan: ' + s.scenario : '',
      s.concept ? 'Konsep yang dilatih: ' + s.concept : '',
      s.rule ? 'Aturan / Rumus Resmi Butir Ini (terjemahkan ke bahasa anak SMP saat menjelaskan): ' + s.rule : '',
      s.why ? 'Logika Mengapa Bentuk Itu Tepat (pegangan mentor, JANGAN bocorkan kata kuncinya): ' + s.why : '',
      s.evidence ? 'Kalimat Bukti di Bacaan (JANGAN tunjuk di Tahap 1/2 agar peserta membaca dulu): "' + s.evidence + '"' : '',
      s.distractor ? 'Mengapa Pilihan Pengecoh Kurang Tepat: ' + s.distractor : '',
      s.distractorNotes.length ? 'Rincian Analisis Pilihan di Layar:\n' + s.distractorNotes.join('\n') : '',
      s.memory ? 'Jembatan Ingatan (Memory Tip): ' + s.memory : '',
      s.avoid ? 'Kesalahan Umum yang Harus Dihindari: ' + s.avoid : '',
      s.visibleNudge ? 'Petunjuk yang sedang muncul di layar peserta: "' + s.visibleNudge + '"' : '',
      s.visibleFeedback ? 'Kartu Pembahasan yang sedang tampil di layar peserta: "' + s.visibleFeedback + '"' : '',
      s.attempts.length
        ? 'Percobaan peserta pada soal ini: ' + s.attempts.map(function (a) { return a.letter + ' ("' + a.text + '") → ' + (a.ok ? 'tepat' : 'kurang cocok'); }).join('; ') + '.'
        : 'Peserta baru membuka butir ini dan belum memilih opsi.',
      '',
      '=== PROTOKOL 3-TAHAP BERPIKIR & KOLABORASI BRAINCORE × MOCHI SOS ===',
      bc.diagnosticPacket,
      '1. ANTI-BOCORAN HINT AWAL (KHUSUSNYA READING & GRAMMAR): Saat peserta baru melihat butir soal (Tahap 1), DILARANG KERAS langsung menunjuk kata penanda waktu, menunjuk kalimat di dalam bacaan Reading, atau memberikan hint sempit yang membuat jawaban langsung mudah ditebak tanpa membaca! Ajak peserta memahami apa yang ditanyakan secara umum dan biarkan ia membaca/berpikir sendiri dulu.',
      '2. BEKAL KONSEP DASAR BAHASA SMP (Tahap 2): Bila peserta bertanya atau baru keliru 1 kali, berikan penjelasan konsep dasar secara umum dengan bahasa anak SMP yang gampang dipahami (ibaratkan dengan contoh sehari-hari), TETAP tanpa menunjuk kata/kalimat kunci di teks soal.',
      '3. INTERVENSI KOLABORASI BRAINCORE × MOCHI SOS (Tahap 3): Hanya ketika Braincore mendeteksi peserta selalu kesusahan menjawab (Tahap 3 aktif), bimbing peserta secara intensif selangkah demi selangkah dengan bahasa SMP yang sabar, jelaskan letak kekeliruan pilihannya, dan arahkan ke petunjuk konteks di kalimat/bacaan.',
      '4. HARAM MUTLAK menyebut huruf opsi ("A", "B", "C", "D"), posisi ("pertama", "kedua", "ketiga", "terakhir", "atas", "bawah"), atau mengucapkan/mengeja kata/frasa jawaban yang benar sebelum peserta menjawab!',
      '5. Jika peserta menebak secara lisan ("apakah yang ini?"), JANGAN langsung membenarkan ("iya betul!"). Ajak ia menguji: "Coba cek pakai konsep tadi, apakah bentuk itu sudah pas dengan kalimatnya? Kalau yakin, langsung ketuk pilihannya di layar ya!"',
      '6. Pada sesi Writing (menulis): jangan menuliskan kalimat jadi untuk disalin peserta; tanyakan ide kalimatnya dengan bahasa anak SMP dan ajak ia menyusun kata-katanya sendiri.'
    ];
    return lines.filter(Boolean).join('\n');
  }

  function autoHighlightQuestionClue(q) {
    q = getActiveQuestion(q);
    if (!q) return null;
    try {
      var targetW = String(q.targetWord || q.repairWord || '').trim();
      if (targetW && targetW.length >= 2) {
        var rTarget = highlightClueInDom(targetW, q);
        if (rTarget && rTarget.status === 'highlighted') return rTarget;
      }
      var stemText = String(q.question || q.stem || '').trim();
      if (!stemText) return null;
      var cluePatterns = [
        /\b(yesterday|last\s+(?:night|week|month|year|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|ago|in\s+\d{4}|this\s+morning)\b/i,
        /\b(every\s+(?:day|morning|week|month|year|night|weekend)|usually|always|often|sometimes|never|rarely|on\s+(?:mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|sundays))\b/i,
        /\b(right\s+now|at\s+the\s+moment|currently|listen!|look!|now)\b/i,
        /\b(tomorrow|next\s+(?:week|month|year|weekend|summer)|soon|tonight)\b/i,
        /\b(since|for|already|yet|just|ever|never|recently|lately|by\s+the\s+time|while|when|if|unless|although|because)\b/i,
        /(きのう|昨日|あした|明日|まいにち|毎日|いま|今|せんしゅう|先週|らいしゅう|来週|きょねん|去年|らいねん|来年|けさ|今朝|こんばん|今晩)/
      ];
      for (var i = 0; i < cluePatterns.length; i++) {
        var m = stemText.match(cluePatterns[i]);
        if (m && m[1]) {
          var res = highlightClueInDom(m[1], q);
          if (res && res.status === 'highlighted') return res;
        }
      }
    } catch (_) {}
    return null;
  }

  function normalizeForLeak(s) {
    return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function transcriptLeaks(text, q) {
    var tx = normalizeForLeak(text);
    if (!tx) return false;
    var letterRe = /\b(jawaban(?:nya)?|kuncinya|pilih(?:lah)?|pilihan|opsi|huruf|yang benar|benarnya|tepat adalah|answer|choose|option|letter|คำตอบ|เลือก|ข้อ|ตัวเลือก)\s*(?:adalah|itu|yaitu|ya|is|คือ)?\s*(?:yang\s+)?([a-d])(?:\b|$)/i;
    if (letterRe.test(tx)) return true;
    var ordinalRe = /\b(jawaban(?:nya)?|pilih(?:lah)?|opsi|pilihan|yang benar|yang tepat)\s*(?:adalah|itu|yaitu)?\s*(?:yang\s+)?(pertama|kedua|ketiga|keempat|terakhir|paling atas|paling bawah|first|second|third|fourth|last)\b/i;
    if (ordinalRe.test(tx)) return true;
    var winners = getWinningAnswerTokens(q);
    var affirmRe = /(jawaban|benar|tepat|pilih|kunci|pakai|gunakan|isi dengan|harusnya|seharusnya|answer|correct|choose|use|ถูก|คำตอบ|เลือก|ใช้)/i;
    for (var i = 0; i < winners.length; i++) {
      var correct = normalizeForLeak(winners[i]);
      if (!correct) continue;
      if (correct.length >= 4 && tx.indexOf(correct) !== -1 && affirmRe.test(tx)) {
        return true;
      }
      if (correct.length >= 1 && correct.length < 4) {
        var paddedTx = ' ' + tx + ' ';
        if (paddedTx.indexOf(' ' + correct + ' ') !== -1 && affirmRe.test(tx)) {
          return true;
        }
      }
    }
    return false;
  }

  function clearQuizClueHighlights() {
    var doc = getDoc();
    if (!doc || typeof doc.querySelectorAll !== 'function') return 0;
    var marks = doc.querySelectorAll('mark.fz-mochi-clue-highlight');
    var count = 0;
    for (var i = 0; i < marks.length; i++) {
      var mk = marks[i];
      var parent = mk.parentNode;
      if (parent) {
        parent.replaceChild(doc.createTextNode(mk.textContent || ''), mk);
        if (typeof parent.normalize === 'function') parent.normalize();
        count++;
      }
    }
    return count;
  }

  function highlightClueInDom(clueText, q) {
    var doc = getDoc();
    if (!doc) return { status: 'no_dom' };
    var clue = String(clueText || '').trim();
    if (!clue) return { status: 'empty_clue' };

    // Anti-spoiler invariant: never highlight text matching the winning answer key!
    var clueNorm = normalizeForLeak(clue);
    var winners = getWinningAnswerTokens(q);
    for (var w = 0; w < winners.length; w++) {
      var wNorm = normalizeForLeak(winners[w]);
      if (!wNorm) continue;
      if (clueNorm === wNorm || (wNorm.length >= 2 && clueNorm.indexOf(wNorm) !== -1)) {
        return {
          status: 'rejected_spoiler',
          guidance: 'Clue matches winning answer token; highlight context words in the stem or passage instead.'
        };
      }
    }

    clearQuizClueHighlights();

    var containers = [];
    var selectors = ['#quizStem', '#quizPassage', '.card-reading', '#fzStoryContainer', '.writing-prompt'];
    for (var s = 0; s < selectors.length; s++) {
      var found = doc.querySelectorAll ? doc.querySelectorAll(selectors[s]) : [];
      for (var f = 0; f < found.length; f++) {
        if (containers.indexOf(found[f]) === -1) containers.push(found[f]);
      }
    }
    if (!containers.length) return { status: 'no_target_surface' };

    var lowerClue = clue.toLowerCase();
    for (var c = 0; c < containers.length; c++) {
      var rootEl = containers[c];
      if (!rootEl || typeof doc.createTreeWalker !== 'function') continue;
      var walker = doc.createTreeWalker(rootEl, 4 /* NodeFilter.SHOW_TEXT */, null);
      var node;
      while ((node = walker.nextNode())) {
        var pEl = node.parentElement || node.parentNode;
        if (pEl && pEl.closest && pEl.closest('.options, .option, button, script, style, #fzMochiCardToggle, mark.fz-mochi-clue-highlight')) {
          continue;
        }
        var val = node.nodeValue || '';
        var idx = val.indexOf(clue);
        if (idx === -1) idx = val.toLowerCase().indexOf(lowerClue);
        if (idx !== -1) {
          var before = val.slice(0, idx);
          var matchStr = val.slice(idx, idx + clue.length);
          var after = val.slice(idx + clue.length);
          var frag = doc.createDocumentFragment();
          if (before) frag.appendChild(doc.createTextNode(before));
          var mark = doc.createElement('mark');
          mark.className = 'fz-mochi-clue-highlight';
          mark.setAttribute('data-mochi-clue', '1');
          mark.textContent = matchStr;
          frag.appendChild(mark);
          if (after) frag.appendChild(doc.createTextNode(after));
          node.parentNode.replaceChild(frag, node);
          return { status: 'highlighted', clue_text: matchStr };
        }
      }
    }
    return { status: 'not_found_in_stem', clue_text: clue };
  }

  function enforceLeakGuard(q) {
    if (!_ws || _ws.readyState !== 1) return;
    _leakGuardHits++;
    stopAllActiveAudioSources();
    try {
      _ws.send(JSON.stringify({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text: t('mochi-sos.leak-correction') }] }],
          turnComplete: true
        }
      }));
    } catch (_) {}
    _outTranscript = '';
  }

  function sendContextUpdate(text) {
    if (!_ws || _ws.readyState !== 1) return false;
    _currentTurnMetered = false;
    _isSilenceNudgeTurn = false;
    try {
      _ws.send(JSON.stringify({
        clientContent: { turns: [{ role: 'user', parts: [{ text: text }] }], turnComplete: true }
      }));
      return true;
    } catch (_) { return false; }
  }

  function stopAllActiveAudioSources() {
    for (var i = 0; i < _activeAudioSources.length; i++) {
      try {
        _activeAudioSources[i].onended = null;
        _activeAudioSources[i].stop();
        _activeAudioSources[i].disconnect();
      } catch (_) {}
    }
    _activeAudioSources = [];
    _firstChunkPending = true;
    var ctx = _audioCtx;
    if (ctx) _nextAudioPlayTime = ctx.currentTime;
    apiInstance._setVoiceVisualizerSpeaking(false);
    try {
      var comp = root && root.FiezelMochiCompanion;
      var mochi = comp && typeof comp.getInstance === 'function' ? comp.getInstance() : null;
      if (mochi && typeof mochi.setTalking === 'function') mochi.setTalking(false);
    } catch (_) {}
  }

  var apiInstance = {
    _LIVE_VOICE: LIVE_VOICE,
    _LIVE_MODEL: LIVE_MODEL,
    _SILENCE_PROMPT_MS: SILENCE_PROMPT_MS,
    getRegisteredLearnerName: getRegisteredLearnerName,
    getLastSilencePrompt: function () { return _lastSilencePromptText; },
    isMochiEnabled: isMochiEnabledFromStorage,
    isMochiSosEligible: isMochiSosEligible,
    isSosSurfaceActive: isSosSurfaceActiveInternal,
    setConnectionStatus: setConnectionStatusInternal,
    getConnectionStatus: getConnectionStatusInternal,
    renderConnectionBanner: renderConnectionBannerInternal,
    removeConnectionBanner: removeConnectionBannerInternal,
    buildQuizContextSnapshot: buildQuizContextSnapshot,
    buildMochiSystemPrompt: buildMochiSystemPrompt,
    evaluateBraincoreStruggleState: evaluateBraincoreStruggleState,
    getBraincoreCollaborationState: evaluateBraincoreStruggleState,
    transcriptLeaks: transcriptLeaks,
    redactAnswerFromHint: redactAnswerFromHint,
    analyzeHumanVoiceBandFrame: analyzeHumanVoiceBandFrame,
    clearQuizClueHighlights: clearQuizClueHighlights,
    markDirectKeyQuotaCooldown: markDirectKeyQuotaCooldown,
    isSileroVadActive: function () { return !!_sileroVadActive; },
    isCallActive: function () {
      return !!(_activeCall && _activeCall.active);
    },

    setMochiEnabled: function (enabled, opts) {
      opts = opts || {};
      var next = !!enabled;

      if (next) {
        var currentBalance = getGemBalance();
        var hasFreeQuota = getDailySosUsage().count < DAILY_FREE_SOS_LIMIT;
        if (!isLocalEnv() && !hasFreeQuota && !opts.useDailyFree && currentBalance < GEM_MIN_START_BALANCE) {
          if (!opts.silent) {
            try {
              if (typeof root.showToast === 'function') {
                root.showToast(t('mochi-sos.toast-insufficient', 'Gem belum cukup ({balance}/{cost} 💎). Selesaikan latihan untuk kumpulkan Gem!', {
                  balance: currentBalance,
                  cost: GEM_MIN_START_BALANCE
                }), 'warn');
              }
            } catch (_) {}
          }
          var docDeny = getDoc();
          var btnDeny = docDeny ? docDeny.getElementById('fzMochiCardToggle') : null;
          if (btnDeny) this._syncCardToggleUi(btnDeny, false);
          return false;
        }
      }

      writeMochiEnabledToStorage(next);
      syncCompanionStrictMode();
      var doc = getDoc();
      var btn = doc ? doc.getElementById('fzMochiCardToggle') : null;
      if (btn) this._syncCardToggleUi(btn, next);

      var activeQ = getActiveQuestion(null);
      var stage = doc ? (doc.querySelector('.quiz-stage') || (doc.getElementById('quizStem') ? doc.getElementById('quizStem').closest('.quiz-stage') : null)) : null;
      var shell = doc ? doc.querySelector('.quiz-shell') : null;
      var comp = root && root.FiezelMochiCompanion;
      var mochiInst = comp && typeof comp.getInstance === 'function' ? comp.getInstance() : null;

      if (!next) {
        this.closeCall('user_disabled');
        this.removeThoughtBubble();
        this.renderUnderMochiVoiceVisualizer(false);
        clearQuizClueHighlights();
        clearPrewarm();
        if (stage) stage.classList.remove('is-teaching');
        if (shell) shell.classList.remove('is-call-active');
        if (mochiInst) {
          try {
            if (typeof mochiInst.setAccessory === 'function') mochiInst.setAccessory(null);
            if (typeof mochiInst.setTalking === 'function') mochiInst.setTalking(false);
            if (typeof mochiInst.retractHands === 'function') mochiInst.retractHands();
            if (typeof mochiInst.startEarTwitchLoop === 'function') mochiInst.startEarTwitchLoop(3200);
          } catch (_) {}
        }
        if (!opts.silent) {
          try {
            if (typeof root.showToast === 'function') {
              root.showToast(t('mochi-sos.toast-disabled', 'Bantuan suara Mochi dinonaktifkan'), 'info');
            }
          } catch (_) {}
        }
        return false;
      }

      // Next is true: 0 Gem dipotong saat aktivasi (Anti-Hangus; Gem dipotong hanya saat audio AI benar-benar terdengar!)
      if (stage) stage.classList.add('is-teaching');
      if (shell) shell.classList.add('is-call-active');
      if (mochiInst) {
        try {
          if (typeof mochiInst.setVoiceCompanionStrictMode === 'function') mochiInst.setVoiceCompanionStrictMode(true);
          if (typeof mochiInst.stopEarTwitchLoop === 'function') mochiInst.stopEarTwitchLoop();
          if (typeof mochiInst.setAccessory === 'function') mochiInst.setAccessory('teacher');
          if (typeof mochiInst.triggerHandGesture === 'function') mochiInst.triggerHandGesture('wave', 2.4);
        } catch (_) {}
      }
      this.renderUnderMochiVoiceVisualizer(true);

      if (!opts.silent && !opts.userConfirmed) {
        try {
          if (typeof root.showToast === 'function') {
            root.showToast(t('mochi-sos.toast-enabled', 'Bantuan suara Mochi aktif (0 💎 saat sambung · bayar sesuai suara AI)'), 'success');
          }
        } catch (_) {}
      }

      if (!opts.skipAutoStart && _session.active && !_session.locked && !isExamLocked() && isMochiSosEligible(activeQ, _currentCtx)) {
        prewarmLiveSession(true);
        if (!this.isCallActive()) {
          this.startCall(activeQ, { autoEntry: true });
        }
      }
      return true;
    },

    toggleMochiEnabled: function () {
      return this.setMochiEnabled(!this.isMochiEnabled());
    },

    _executeSocraticToolCall: function (fc, q) {
      if (!fc || !fc.name) return { status: 'ignored' };
      if (fc.name === 'highlight_quiz_clue') {
        var args = fc.args || {};
        var activeQ = getActiveQuestion(q) || q;
        var clue = String(args.clue_text || '').trim();
        if (!clue) return { status: 'empty_clue' };
        var clueNorm = normalizeForLeak(clue);
        var winners = getWinningAnswerTokens(activeQ);
        for (var w = 0; w < winners.length; w++) {
          var wNorm = normalizeForLeak(winners[w]);
          if (!wNorm) continue;
          if (clueNorm === wNorm || (wNorm.length >= 2 && clueNorm.indexOf(wNorm) !== -1)) {
            return {
              status: 'rejected_spoiler',
              guidance: 'Clue matches winning answer token; highlight context words in the stem or passage instead.'
            };
          }
        }
        var bc = evaluateBraincoreStruggleState(activeQ);
        if (!bc.isStruggling) {
          return {
            status: 'deferred_think_first',
            stage: bc.stage,
            guidance: 'Tahap ' + bc.stage + ': Jangan menyorot kata/kalimat di awal agar peserta membaca dan berpikir mandiri terlebih dahulu.'
          };
        }
        return highlightClueInDom(clue, activeQ);
      }
      if (fc.name === 'clear_quiz_highlights') {
        var cleared = clearQuizClueHighlights();
        return { status: 'cleared', count: cleared };
      }
      return { status: 'unknown_tool' };
    },

    canCall: function (opts) {
      opts = opts || {};
      var state = getState();

      // Rule 4 §5: Anti-Leak Exam Invariant
      if (isExamLocked(opts)) {
        return {
          allowed: false,
          reason: 'exam_lock',
          cost: 0,
          badge: 'Lock',
          message: t('mochi-sos.exam-locked', 'Tes mandiri: Mochi istirahat dulu saat ujian/tes awal ya!')
        };
      }

      if (opts.requireEnabled && !isMochiEnabledFromStorage()) {
        return {
          allowed: false,
          reason: 'mochi_disabled',
          cost: 0,
          badge: 'OFF',
          message: t('mochi-sos.toast-disabled', 'Bantuan suara Mochi dinonaktifkan')
        };
      }

      var currentBalance = getGemBalance();

      // Proactive auto-entry or Placement Test Welcome Pass (First Impression after Onboarding)
      if (isPlacementSession(opts) || opts.isPlacement) {
        return {
          allowed: true,
          isWelcomePass: true,
          cost: 0,
          balance: currentBalance,
          badge: t('mochi-sos.badge-free', 'Gratis')
        };
      }

      // Local development mode: allow inspection without corrupting persistent state unless checking cost
      if (isLocalEnv() && !opts.requireGems && !opts.realGems) {
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

      var dailyUsage = getDailySosUsage();
      var hasDailyFree = dailyUsage.count < DAILY_FREE_SOS_LIMIT;
      if (opts.useDailyFree && hasDailyFree) {
        return {
          allowed: true,
          isDailyFree: true,
          isWelcomePass: false,
          remainingDailyFree: DAILY_FREE_SOS_LIMIT - dailyUsage.count,
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
          remainingDailyFree: Math.max(0, DAILY_FREE_SOS_LIMIT - dailyUsage.count),
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

    getMeteredSessionStats: function () {
      return {
        gemsSpent: _sessionGemsSpent,
        voiceTurns: _sessionVoiceTurns,
        freeQuestions: _sessionFreeQuestions,
        openingCost: GEM_COST_OPENING_TURN,
        followupCost: GEM_COST_FOLLOWUP_TURN,
        maxPerQuestion: GEM_MAX_PER_QUESTION,
        cashbackReward: CASHBACK_REWARD
      };
    },

    meterDeliveredAiTurn: function (q, turnKind) {
      if (_isSilenceNudgeTurn) {
        return { ok: true, spent: 0, reason: 'silence_nudge' };
      }
      var activeQ = getActiveQuestion(q) || q;
      var qSig = getQuestionSig(activeQ) || '__default_q__';
      _sessionVoiceTurns++;
      if (_activeCall) {
        _activeCall.turnsDelivered = (_activeCall.turnsDelivered || 0) + 1;
      }

      if (_activeCall && _activeCall.isWelcomePass) {
        return { ok: true, spent: 0, isWelcomePass: true };
      }

      // Daily Free SOS Pass covers all voice turns on that free question (only consumed once real audio plays!)
      if (_freeQuestionSigs[qSig]) {
        this._refreshLiveToggleBadge();
        return { ok: true, spent: 0, isDailyFree: true };
      }
      var dailyUsage = getDailySosUsage();
      if ((_pendingBillingMode === 'daily_free' || (_activeCall && _activeCall.useDailyFree)) && dailyUsage.count < DAILY_FREE_SOS_LIMIT) {
        _freeQuestionSigs[qSig] = true;
        incrementDailySosUsage();
        _sessionFreeQuestions++;
        this._refreshLiveToggleBadge();
        return { ok: true, spent: 0, isDailyFree: true };
      }

      var state = getState();
      if (!state) return { ok: true, spent: 0 };

      var alreadyOnQ = _questionGemsMap[qSig] || 0;
      if (alreadyOnQ >= GEM_MAX_PER_QUESTION) {
        this._refreshLiveToggleBadge();
        return { ok: true, spent: 0, capped: true };
      }

      var desiredCost = (alreadyOnQ === 0 || turnKind === 'opening') ? GEM_COST_OPENING_TURN : GEM_COST_FOLLOWUP_TURN;
      if (alreadyOnQ > 0 && turnKind === 'opening') {
        // Already metered opening turn on this question (e.g. mid-question WS reconnect) -> 0 extra Gem!
        return { ok: true, spent: 0, alreadyChargedOpening: true };
      }
      var cost = Math.min(desiredCost, GEM_MAX_PER_QUESTION - alreadyOnQ);
      var current = getGemBalance();
      var spent = Math.min(cost, Math.max(0, current));
      if (spent <= 0) {
        return { ok: false, spent: 0, reason: 'insufficient_gems' };
      }

      if (state.gems && typeof state.gems.balance === 'number') {
        state.gems.balance = Math.max(0, state.gems.balance - spent);
        if (typeof state.gems.spentTotal === 'number') state.gems.spentTotal += spent;
        if (Array.isArray(state.gems.ledger)) {
          state.gems.ledger.push({
            at: Date.now(),
            delta: -spent,
            reason: alreadyOnQ === 0 ? 'mochi_sos_opening_voice' : 'mochi_sos_followup_voice',
            sessionId: (_activeCall && _activeCall.sessionId) || (_session && _session.key) || 'quiz'
          });
          if (state.gems.ledger.length > 60) state.gems.ledger.shift();
        }
      } else if (typeof state.gems === 'number') {
        state.gems = Math.max(0, state.gems - spent);
      } else {
        state.gems = { balance: Math.max(0, current - spent) };
      }

      _questionGemsMap[qSig] = alreadyOnQ + spent;
      _chargedQuestionSigs[qSig] = true;
      _sessionGemsSpent += spent;
      if (_activeCall) {
        _activeCall.gemsSpent = (_activeCall.gemsSpent || 0) + spent;
      }
      try { if (typeof root.save === 'function') root.save(); } catch (_) {}
      this.updateTopbarGem();
      this._refreshLiveToggleBadge();
      return { ok: true, spent: spent };
    },

    _refreshLiveToggleBadge: function () {
      var doc = getDoc();
      if (!doc) return;
      var btn = doc.getElementById('fzMochiCardToggle');
      if (btn && isMochiEnabledFromStorage()) {
        btn.removeAttribute('data-mochi-sig');
        this._syncCardToggleUi(btn, true);
      }
    },

    spendForQuestion: function (q) {
      return this.meterDeliveredAiTurn(q, 'opening');
    },

    spendForCall: function (sessionId, isWelcomePass, customCost) {
      var state = getState();
      if (!state || isWelcomePass) return { ok: true, spent: 0 };
      var activeQ = getActiveQuestion(null);
      var qSig = getQuestionSig(activeQ);
      if (qSig && _chargedQuestionSigs[qSig]) {
        return { ok: true, spent: 0, alreadyChargedForQuestion: true };
      }
      var cost = (customCost != null && Number.isFinite(Number(customCost))) ? Number(customCost) : GEM_COST;
      var current = getGemBalance();
      if (current < cost) return { ok: false, spent: 0 };
      if (state.gems && typeof state.gems.balance === 'number') {
        state.gems.balance = Math.max(0, state.gems.balance - cost);
        if (typeof state.gems.spentTotal === 'number') state.gems.spentTotal += cost;
        if (Array.isArray(state.gems.ledger)) {
          state.gems.ledger.push({
            at: Date.now(),
            delta: -cost,
            reason: 'mochi_sos_opening_voice',
            sessionId: sessionId || (_session && _session.key) || 'quiz'
          });
          if (state.gems.ledger.length > 60) state.gems.ledger.shift();
        }
      } else if (typeof state.gems === 'number') {
        state.gems = Math.max(0, state.gems - cost);
      } else {
        state.gems = { balance: Math.max(0, current - cost) };
      }
      if (qSig) {
        _chargedQuestionSigs[qSig] = true;
        _questionGemsMap[qSig] = (_questionGemsMap[qSig] || 0) + cost;
      }
      _sessionGemsSpent += cost;
      try { if (typeof root.save === 'function') root.save(); } catch (_) {}
      this.updateTopbarGem();
      return { ok: true, spent: cost };
    },

    spendForSession: function (customCost) {
      // Deprecated upfront lump-sum charge replaced by post-audio-delivery metering (0 upfront burn).
      if (customCost != null && Number(customCost) === 0) return { ok: true, spent: 0 };
      return { ok: true, spent: 0, meteredMode: true };
    },

    refundMisTap: function (explicitAmount) {
      var state = getState();
      if (!state) return;
      if (_activeCall && _activeCall.isWelcomePass) return;
      var refundAmt = (typeof explicitAmount === 'number' && explicitAmount > 0)
        ? explicitAmount
        : ((_activeCall && typeof _activeCall.gemsSpent === 'number') ? _activeCall.gemsSpent : GEM_COST);
      if (refundAmt <= 0) return;
      var current = getGemBalance();
      if (state.gems && typeof state.gems.balance === 'number') {
        state.gems.balance += refundAmt;
        if (typeof state.gems.spentTotal === 'number') {
          state.gems.spentTotal = Math.max(0, state.gems.spentTotal - refundAmt);
        }
      } else if (typeof state.gems === 'number') {
        state.gems += refundAmt;
      } else {
        state.gems = { balance: current + refundAmt };
      }
      try { if (typeof root.save === 'function') root.save(); } catch (_) {}
      this.updateTopbarGem();
      try {
        if (typeof root.showToast === 'function') {
          root.showToast(t('mochi-sos.toast-refund', 'Panggilan singkat: {cost} Gem dikembalikan 💎', { cost: refundAmt }), 'info');
        }
      } catch (_) {}
    },

    awardCashback: function () {
      var state = getState();
      if (!state) return;
      var current = getGemBalance();
      if (state.gems && typeof state.gems.balance === 'number') {
        state.gems.balance += CASHBACK_REWARD;
        if (typeof state.gems.earnedTotal === 'number') {
          state.gems.earnedTotal += CASHBACK_REWARD;
        }
        if (Array.isArray(state.gems.ledger)) {
          state.gems.ledger.push({
            at: Date.now(),
            delta: CASHBACK_REWARD,
            reason: 'mochi_sos_correct_cashback',
            sessionId: (_activeCall && _activeCall.sessionId) || (_session && _session.key) || 'quiz'
          });
          if (state.gems.ledger.length > 60) state.gems.ledger.shift();
        }
      } else if (typeof state.gems === 'number') {
        state.gems += CASHBACK_REWARD;
      } else {
        state.gems = { balance: current + CASHBACK_REWARD };
      }
      try { if (typeof root.save === 'function') root.save(); } catch (_) {}
      this.updateTopbarGem();
      try {
        if (typeof root.showToast === 'function') {
          root.showToast(t('mochi-sos.toast-cashback', 'Sugoi! Jawaban benar: Cashback +{reward} Gem didapatkan! 🎉', { reward: CASHBACK_REWARD }), 'success');
        }
      } catch (_) {}
    },

    updateTopbarGem: function () {
      var doc = getDoc();
      if (!doc) return;
      var balance = getGemBalance();
      var formatted = balance.toLocaleString('id-ID');
      var el = doc.getElementById('quizTopbarGemCount');
      if (el) el.textContent = formatted;
      var modalBal = doc.getElementById('fzMochiModalBalance');
      if (modalBal) modalBal.textContent = formatted;
      var allGems = doc.querySelectorAll('.quiz-topbar-gem .gem-count, [data-gem-count]');
      for (var i = 0; i < allGems.length; i++) {
        allGems[i].textContent = formatted;
      }
    },

    buildSocraticGuidance: function (q, learnerSpoken) {
      q = q || {};
      var rule = redactAnswerFromHint(String(q.explain && q.explain.rule ? q.explain.rule : ''), q);
      var concept = redactAnswerFromHint(String(q.concept || q.skill || ''), q);

      if (rule) {
        return t('mochi-sos.guide-rule-prefix', 'Tips dari Mochi: ') + rule;
      }
      if (concept) {
        return t('mochi-sos.guide-concept-prefix', 'Pertanyaan ini melatih konsep "{concept}". Perhatikan pola kata kerja atau partikel penanda ya!', { concept: concept });
      }
      return t('mochi-sos.guide-default', 'Mochi siap bantu! Coba perhatikan partikel penunjuk waktu atau arah di kalimat ini ya!');
    },

    // ─── Lifecycle hooks dari app.js ────────────────────────────────────────
    onQuizSessionStart: function (cfg) {
      cfg = cfg || {};
      if (_shellGoneTimer) { clearTimeout(_shellGoneTimer); _shellGoneTimer = null; }
      var cfgType = String(cfg.type || '').trim().toLowerCase();
      var isPlacement = !!(cfg.placement || cfgType === 'placement');
      var locked = !isPlacement && !!(cfg.measure || cfg.noHints || (cfg.examKind && String(cfg.examKind).toLowerCase() !== 'placement') ||
        ['level-exam', 'level_exam', 'grammar-skip', 'assignment', 'reading_exam', 'listening_exam', 'speaking_exam', 'writing_exam'].indexOf(cfgType) !== -1);
      var ineligible = isSessionTypeIneligible(cfgType);
      _session = {
        active: !ineligible,
        key: 'qs-' + Date.now().toString(36),
        locked: locked,
        cfg: cfg,
        greeted: false
      };
      _sessionMochiEnabled = false;
      writeMochiEnabledToStorage(false);
      _chargedQuestionSigs = {};
      _questionGemsMap = {};
      _freeQuestionSigs = {};
      _sessionGemsSpent = 0;
      _sessionVoiceTurns = 0;
      _sessionFreeQuestions = 0;
      _pendingBillingMode = 'auto';
      _currentTurnMetered = false;
      _isSilenceNudgeTurn = false;
      _pendingFollowupBillable = false;
      _attempts = [];
      _currentQ = null;
      _currentCtx = null;
      _leakGuardHits = 0;
      clearQuizClueHighlights();
      if (locked || ineligible) {
        this.closeCall(locked ? 'exam_mode' : 'ineligible_domain');
        this.removeThoughtBubble();
        this.removeCardToggle();
        clearPrewarm();
        syncCompanionStrictMode();
        return false;
      }
      syncCompanionStrictMode();
      this.bindMascotTap();
      armAudioWarmup();
      return true;
    },

    onQuizSessionEnd: function (reason) {
      if (_shellGoneTimer) { clearTimeout(_shellGoneTimer); _shellGoneTimer = null; }
      if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
      if (_turnEndFallbackTimer) { clearTimeout(_turnEndFallbackTimer); _turnEndFallbackTimer = null; }
      if (_openingWatchdogTimer) { clearTimeout(_openingWatchdogTimer); _openingWatchdogTimer = null; }
      this.closeCall(reason || 'session_end');
      this.removeThoughtBubble();
      this.removeCardToggle();
      this.renderUnderMochiVoiceVisualizer(false);
      removeConnectionBannerInternal();
      _connStatus = { state: 'idle', message: '', updatedAt: 0 };
      clearQuizClueHighlights();
      clearPrewarm();
      if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
      _session = { active: false, key: '', locked: false, cfg: null, greeted: false };
      _sessionMochiEnabled = false;
      writeMochiEnabledToStorage(false);
      _chargedQuestionSigs = {};
      _questionGemsMap = {};
      _freeQuestionSigs = {};
      _sessionGemsSpent = 0;
      _sessionVoiceTurns = 0;
      _sessionFreeQuestions = 0;
      _currentTurnMetered = false;
      _isSilenceNudgeTurn = false;
      _pendingFollowupBillable = false;
      _attempts = [];
      _currentQ = null;
      _currentCtx = null;
      syncCompanionStrictMode();
    },

    setActiveQuestion: function (q, ctx) {
      if (_shellGoneTimer) { clearTimeout(_shellGoneTimer); _shellGoneTimer = null; }
      if (!_session.active) {
        var started = this.onQuizSessionStart({ type: ctx && ctx.cfgType });
        if (!started && isSessionTypeIneligible(ctx && ctx.cfgType)) return false;
      }
      if (_session.locked || isExamLocked(ctx)) {
        this.removeThoughtBubble();
        this.removeCardToggle();
        removeConnectionBannerInternal();
        syncCompanionStrictMode();
        return false;
      }
      if (!isMochiSosEligible(q, ctx)) {
        this.closeCall('ineligible_domain');
        this.removeThoughtBubble();
        this.removeCardToggle();
        removeConnectionBannerInternal();
        clearQuizClueHighlights();
        clearPrewarm();
        syncCompanionStrictMode();
        return false;
      }
      var prevSig = getQuestionSig(_currentQ);
      var nextSig = getQuestionSig(q);
      var hadPrevQ = !!prevSig;
      var changed = !!(q && (q !== _currentQ || (nextSig && nextSig !== prevSig)));
      _currentQ = q || _currentQ || null;
      _currentCtx = ctx || _currentCtx || null;

      if (changed) {
        _userAskedConceptOnCurrent = false;
        _openingTurnCompletedForQ = false;
        _currentTurnMetered = false;
        _pendingFollowupBillable = false;
        _isSilenceNudgeTurn = false;
        clearQuizClueHighlights();
        if (evaluateBraincoreStruggleState(_currentQ).isStruggling) {
          autoHighlightQuestionClue(_currentQ);
        }
      }
      this.mountCardToggle(_currentQ);
      syncCompanionStrictMode();

      var doc = getDoc();
      var stage = doc ? (doc.querySelector('.quiz-stage') || (doc.getElementById('quizStem') ? doc.getElementById('quizStem').closest('.quiz-stage') : null)) : null;
      var shell = doc ? doc.querySelector('.quiz-shell') : null;
      var comp = root && root.FiezelMochiCompanion;
      var mochiInst = comp && typeof comp.getInstance === 'function' ? comp.getInstance() : null;

      if (!isMochiEnabledFromStorage()) {
        this.closeCall('user_disabled');
        this.removeThoughtBubble();
        this.renderUnderMochiVoiceVisualizer(false);
        removeConnectionBannerInternal();
        if (stage) stage.classList.remove('is-teaching');
        if (shell) shell.classList.remove('is-call-active');
        if (mochiInst) {
          try {
            if (typeof mochiInst.setAccessory === 'function') mochiInst.setAccessory(null);
            if (typeof mochiInst.setTalking === 'function') mochiInst.setTalking(false);
            if (typeof mochiInst.retractHands === 'function') mochiInst.retractHands();
            if (typeof mochiInst.startEarTwitchLoop === 'function') mochiInst.startEarTwitchLoop(3200);
          } catch (_) {}
        }
        return false;
      }

      // Check balance on new question transition (only disable if neither free daily pass nor >= 2 Gems remain)
      var qSigCheck = getQuestionSig(_currentQ);
      var alreadyCovered = !!(qSigCheck && (_questionGemsMap[qSigCheck] || _freeQuestionSigs[qSigCheck]));
      var hasDailyFreeRemain = (_pendingBillingMode === 'daily_free') && (getDailySosUsage().count < DAILY_FREE_SOS_LIMIT);
      var currentBalance = getGemBalance();
      if (!alreadyCovered && !hasDailyFreeRemain && !isLocalEnv() && currentBalance < GEM_COST_OPENING_TURN) {
        this.setMochiEnabled(false, { silent: true });
        try {
          if (typeof root.showToast === 'function') {
            root.showToast(t('mochi-sos.toast-out-of-gems', 'Gem belum cukup untuk soal berikutnya. Bantuan Mochi ditutup aman.'), 'warn');
          }
        } catch (_) {}
        return false;
      }

      // 0 Gem deducted upfront on question switch! Metering occurs ONLY when AI audio starts playing for the new question.
      if (stage) stage.classList.add('is-teaching');
      if (shell) shell.classList.add('is-call-active');
      if (mochiInst) {
        try {
          if (typeof mochiInst.setVoiceCompanionStrictMode === 'function') mochiInst.setVoiceCompanionStrictMode(true);
          if (typeof mochiInst.stopEarTwitchLoop === 'function') mochiInst.stopEarTwitchLoop();
          if (typeof mochiInst.setAccessory === 'function') mochiInst.setAccessory('teacher');
        } catch (_) {}
      }
      this.renderUnderMochiVoiceVisualizer(true);

      // Panggilan masih hidup saat soal berganti → tetap aktif sepanjang sesi latihan & bimbing soal baru secara presisi.
      if (changed && this.isCallActive()) {
        _activeCall.question = _currentQ;
        _activeCall.answered = false;
        _activeCall.cashbackAwardedForQ = false;
        _silencePromptFired = false;
        _lastUserSpeechAt = Date.now();
        stopAllActiveAudioSources();
        this.renderUnderMochiVoiceVisualizer(true);
        var snap = buildQuizContextSnapshot(_currentQ, _currentCtx);
        var bcNext = evaluateBraincoreStruggleState(_currentQ);
        var learnerName = getRegisteredLearnerName();
        sendContextUpdate(
          '[PEMBARUAN BUTIR BARU DI LAYAR BERSAMA "' + learnerName + '"]\n' +
          bcNext.diagnosticPacket + '\n' +
          'Kategori: ' + snap.kind + '\n' +
          (snap.instruction ? 'Instruksi di layar: "' + snap.instruction + '"\n' : '') +
          'Kalimat Butir (#quizStem): "' + snap.stem + '"\n' +
          (snap.focusWord ? 'Kata Fokus/Target: "' + snap.focusWord + '"\n' : '') +
          (snap.options.length ? 'Pilihan Opsi di layar: ' + snap.options.join(' | ') + '\n' : '') +
          (snap.rule ? 'Konsep/Aturan (Pegangan Mentor): ' + snap.rule + '\n' : '') +
          (snap.why ? 'Logika Ilmiah (Pegangan Mentor): ' + snap.why + '\n' : '') +
          'INSTRUKSI: Gunakan bahasa anak SMP yang santai dan hangat. Sapa "' + learnerName + '" singkat, ajak memahami maksud butir di layar secara umum tanpa menunjuk kata/kalimat kunci di awal agar "' + learnerName + '" membaca dan berpikir sendiri dulu!'
        );
      }
      // Jika hot socket terikat pada soal berbeda (atau kosong), buang dan siapkan ulang untuk soal aktif ini.
      if (_hotWs && _hotWs.__fzBoundQSig !== getQuestionSig(_currentQ)) {
        discardHotSocket();
        if (!this.isCallActive()) prewarmLiveSession(true);
      } else if (changed && hadPrevQ && _hotWs) {
        discardHotSocket();
        if (!this.isCallActive()) prewarmLiveSession(true);
      }
      return true;
    },

    noteAttempt: function (q, idx, ok, meta) {
      q = getActiveQuestion(q);
      if (!q || typeof idx !== 'number' || idx < 0) return;
      var text = Array.isArray(q.options) ? optionText(q.options[idx]) : '';
      _attempts.push({ qid: q.id || q.target || q.question, idx: idx, text: text, ok: !!ok, at: Date.now() });
      if (_attempts.length > 40) _attempts.shift();
      if (this.isCallActive() && !ok) {
        _silencePromptFired = false;
        _lastUserSpeechAt = Date.now();
        _pendingFollowupBillable = true;
        var learnerName = getRegisteredLearnerName();
        var snap = buildQuizContextSnapshot(q, _currentCtx);
        var bc = evaluateBraincoreStruggleState(q);
        if (bc.isStruggling) {
          autoHighlightQuestionClue(q);
        }
        var whyWrong = '';
        if (q.explain && q.explain.distractors && typeof q.explain.distractors === 'object') {
          whyWrong = cleanText(q.explain.distractors[text] || q.explain.distractors[idx] || '');
        }
        if (!whyWrong && snap.distractor) whyWrong = snap.distractor;
        sendContextUpdate(
          '[PEMBARUAN PERCOBAAN PESERTA: "' + learnerName + '" baru saja memilih opsi "' + clip(text, 120) + '" pada butir "' + snap.stem + '" dan opsi itu kurang tepat.]\n' +
          bc.diagnosticPacket + '\n' +
          (whyWrong ? 'Alasan mengapa "' + clip(text, 80) + '" kurang tepat: ' + whyWrong + '\n' : '') +
          (snap.rule ? 'Prinsip dasar kalimat ini (terjemahkan ke bahasa anak SMP): ' + snap.rule + '\n' : '') +
          (bc.isStruggling
            ? 'INSTRUKSI TAHAP 3 (KOLABORASI BRAINCORE × MOCHI SOS): Peserta sedang kesulitan. Gunakan bahasa anak SMP yang sangat sabar, uraikan selangkah demi selangkah mengapa opsi "' + clip(text, 80) + '" kurang pas, dan arahkan perhatiannya ke petunjuk di kalimat tanpa membocorkan kunci!'
            : 'INSTRUKSI TAHAP 2 (KONSEP DASAR SMP): Semangati "' + learnerName + '" dengan hangat, jelaskan konsep dasarnya memakai bahasa anak SMP dan perumpamaan sehari-hari (tanpa menunjuk langsung kata/kalimat kunci di teks), lalu ajak ia mencoba berpikir lagi!')
        );
      }
    },

    prewarm: function () { return prewarmLiveSession(false); },

    // ─── Binding tap maskot (sekali per dokumen, capture-phase) ─────────────
    bindMascotTap: function () {
      var doc = getDoc();
      if (!doc || _tapBound) return;
      _tapBound = true;
      var self = this;

      // 1) Event resmi dari renderer 3D (fiezel-mochi.js:2244) — bubbles:true.
      doc.addEventListener('mochi-tap', function (e) {
        if (!isInsideQuiz(e.target)) return;
        self.handleMascotTap('mochi-tap');
      }, true);

      // 2) Fallback capture-phase: berjalan SEBELUM stopPropagation di canvas.
      doc.addEventListener('pointerdown', function (e) {
        if (!isMascotTarget(e.target)) { _pendingPointer = null; return; }
        _pendingPointer = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
        if (!isMochiEnabledFromStorage() || !isMochiSosEligible(getActiveQuestion(null), _currentCtx)) return;
        warmAudioContext();
        if (!self.isCallActive()) openHotSocket(); // intent → handshake dimulai sekarang
      }, true);

      doc.addEventListener('pointerup', function (e) {
        var p = _pendingPointer;
        _pendingPointer = null;
        if (!p || p.id !== e.pointerId) return;
        var dx = Math.abs(e.clientX - p.x), dy = Math.abs(e.clientY - p.y);
        if (dx > TAP_MAX_DIST || dy > TAP_MAX_DIST || (Date.now() - p.t) > TAP_MAX_MS) return;
        if (!isMascotTarget(e.target)) return;
        self.handleMascotTap('pointer');
      }, true);

      doc.addEventListener('pointercancel', function () { _pendingPointer = null; }, true);

      // 3) Keyboard a11y bila host bisa fokus (tabindex di CSS/markup).
      doc.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && isMascotTarget(e.target)) {
          e.preventDefault();
          self.handleMascotTap('keyboard');
        }
      }, true);
    },

    handleMascotTap: function (source) {
      var now = Date.now();
      if (now - _lastTapAt < TAP_DEDUPE_MS) return false; // anti double-fire mochi-tap + pointerup
      _lastTapAt = now;
      var activeQ = getActiveQuestion(null);
      if (!isMochiSosEligible(activeQ, _currentCtx)) {
        return false;
      }
      if (isExamLocked()) {
        playTone(330, 0.2, 'sawtooth');
        try { if (typeof root.showToast === 'function') root.showToast(t('mochi-sos.exam-locked', 'Tes mandiri: Mochi istirahat dulu saat ujian/tes awal ya!'), 'warn'); } catch (_) {}
        return false;
      }
      if (!isMochiEnabledFromStorage()) {
        var doc = getDoc();
        var toggleBtn = doc ? doc.getElementById('fzMochiCardToggle') : null;
        if (toggleBtn) {
          try {
            toggleBtn.classList.remove('is-nudge');
            void toggleBtn.offsetWidth;
            toggleBtn.classList.add('is-nudge');
            setTimeout(function () { try { toggleBtn.classList.remove('is-nudge'); } catch (_) {} }, 650);
          } catch (_) {}
        }
        return false;
      }
      // Umpan balik instan (<30ms) sebelum apa pun yang async.
      warmAudioContext();
      playChime('tap');
      hapticTap(12);
      bounceMascot();
      this._updateMochiMascotPose('greet');
      if (this.isCallActive()) {
        if (!_ws || _ws.readyState !== 1) {
          this._startGeminiLiveDuplex(activeQ);
        } else {
          _silencePromptFired = false;
          _lastUserSpeechAt = Date.now();
          _userAskedConceptOnCurrent = true;
          _pendingFollowupBillable = true;
          var bcTap = evaluateBraincoreStruggleState(activeQ);
          if (bcTap.isStruggling) {
            autoHighlightQuestionClue(activeQ);
          }
          var snap = buildQuizContextSnapshot(activeQ, _currentCtx);
          var learnerName = getRegisteredLearnerName();
          sendContextUpdate(
            '[SISTEM: Peserta "' + learnerName + '" baru saja mengetuk Mochi untuk meminta penjelasan pada butir "' + snap.stem + '".]\n' +
            bcTap.diagnosticPacket + '\n' +
            (snap.rule ? 'Konsep dasar (terjemahkan ke bahasa anak SMP): ' + snap.rule + '\n' : '') +
            'Jelaskan konsep dasarnya dengan bahasa anak SMP yang jernih dan perumpamaan sehari-hari tanpa membocorkan kunci, lalu tanyakan pendapat "' + learnerName + '"!'
          );
        }
      } else {
        this.startCall(activeQ, { autoEntry: true });
      }
      return true;
    },

    playInstantGreeting: function () {
      var self = this;
      var ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }

      this.renderUnderMochiVoiceVisualizer(true);
      this._updateMochiMascotPose('greet');
      try {
        var comp = root && root.FiezelMochiCompanion;
        var mochiInst = comp && typeof comp.getInstance === 'function' ? comp.getInstance() : null;
        if (mochiInst && typeof mochiInst.triggerHandGesture === 'function') {
          mochiInst.triggerHandGesture('wave', 2.4);
        }
      } catch (_) {}

      var markSpeakingState = function (speaking) {
        self._setVoiceVisualizerSpeaking(speaking);
        if (!speaking && _activeAudioSources.length === 0) {
          self._updateMochiMascotPose('idle');
        }
        try {
          var c = root && root.FiezelMochiCompanion;
          var m = c && typeof c.getInstance === 'function' ? c.getInstance() : null;
          if (m && typeof m.setTalking === 'function') m.setTalking(speaking);
        } catch (_) {}
      };

      var loc = getLocale();
      var audioSrc = loc === 'th' ? './assets/audio/sfx/mochi_greet_th.mp3' : './assets/audio/sfx/mochi_greet_id.mp3';

      if (ctx && typeof fetch === 'function') {
        fetch(audioSrc).then(function (res) {
          if (!res || !res.ok) throw new Error('http_' + (res ? res.status : 0));
          var ct = (res.headers && typeof res.headers.get === 'function' ? res.headers.get('content-type') : '') || '';
          if (ct.indexOf('text/html') !== -1) throw new Error('html_response');
          return res.arrayBuffer();
        }).then(function (buf) {
          if (!buf || buf.byteLength < 64) throw new Error('empty_audio');
          return ctx.decodeAudioData(buf);
        }).then(function (decoded) {
          var source = ctx.createBufferSource();
          source.buffer = decoded;
          var targetNode = attachAnalyserToMochi(ctx) || ctx.destination;
          source.connect(targetNode);
          source.start(0);
          _activeAudioSources.push(source);
          markSpeakingState(true);
          source.onended = function () {
            _activeAudioSources = _activeAudioSources.filter(function (s) { return s !== source; });
            if (_activeAudioSources.length === 0) {
              markSpeakingState(false);
            }
          };
        }).catch(function () {
          try {
            var audio = new Audio(audioSrc);
            audio.currentTime = 0;
            audio.onended = function () {
              if (_activeAudioSources.length === 0) markSpeakingState(false);
            };
            audio.onerror = function () {
              if (_activeAudioSources.length === 0) markSpeakingState(false);
            };
            var p = audio.play();
            if (p && typeof p.then === 'function') {
              p.then(function () {
                markSpeakingState(true);
              }).catch(function () {
                if (_activeAudioSources.length === 0) markSpeakingState(false);
              });
            }
          } catch (_) {
            if (_activeAudioSources.length === 0) markSpeakingState(false);
          }
        });
        return;
      }

      try {
        var audioFallback = new Audio(audioSrc);
        audioFallback.currentTime = 0;
        audioFallback.onended = function () {
          if (_activeAudioSources.length === 0) markSpeakingState(false);
        };
        audioFallback.onerror = function () {
          if (_activeAudioSources.length === 0) markSpeakingState(false);
        };
        var pf = audioFallback.play();
        if (pf && typeof pf.then === 'function') {
          pf.then(function () { markSpeakingState(true); }).catch(function () {});
        }
      } catch (_) {}
    },

    showConfirmationModal: function (activeQ) {
      var doc = getDoc();
      if (!doc) return;
      var existing = doc.getElementById('fzMochiSosConfirmModal');
      if (existing) existing.remove();

      var self = this;
      var currentBalance = getGemBalance();
      var dailyUsage = getDailySosUsage();
      var remainingFree = Math.max(0, DAILY_FREE_SOS_LIMIT - dailyUsage.count);
      var hasDailyFree = remainingFree > 0;

      if (!hasDailyFree && currentBalance < GEM_MIN_START_BALANCE) {
        this.showInsufficientGemModal(currentBalance);
        return;
      }

      var modal = doc.createElement('div');
      modal.id = 'fzMochiSosConfirmModal';
      modal.className = 'fz-mochi-sos-intro-scrim';

      var isTh = getLocale() === 'th';
      var titleText = hasDailyFree
        ? t('mochi-sos.modal-free-title', 'Bantuan Suara Mochi (Kuota Gratis)')
        : t('mochi-sos.modal-gem-title', 'Bantuan Suara Mochi (Sesuai Kuota Suara)');
      var bodyText = hasDailyFree
        ? t('mochi-sos.modal-free-body', 'Kamu punya {remaining}x bantuan suara gratis hari ini ({limit} soal/hari). Kuota hanya terpakai saat suara AI benar-benar keluar.', { remaining: remainingFree, limit: DAILY_FREE_SOS_LIMIT })
        : t('mochi-sos.modal-gem-body', 'Gem dihitung sesuai pemakaian suara AI (0 Gem saat menyambung/gagal suara). Saldo kamu: {balance} 💎.', { balance: currentBalance });
      var cancelBtnText = t('mochi-sos.modal-cancel-btn', 'Batal');
      var confirmBtnText = hasDailyFree
        ? t('mochi-sos.modal-free-btn', 'Mulai Gratis (0 💎)')
        : t('mochi-sos.modal-gem-btn', 'Aktifkan (Mulai 0 💎)');

      var breakdownHtml = hasDailyFree
        ? [
            '<div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:8px 10px;margin:0 0 12px;text-align:left;font-size:11px;line-height:1.5;color:#065F46;">',
            '  <div style="display:flex;justify-content:space-between;font-weight:700;"><span>' + t('mochi-sos.modal-row-free-quota', 'Kuota Gratis Hari Ini') + '</span><span>' + remainingFree + '/' + DAILY_FREE_SOS_LIMIT + ' ' + t('mochi-sos.modal-unit-questions', 'soal') + '</span></div>',
            '  <div style="display:flex;justify-content:space-between;"><span>' + t('mochi-sos.modal-row-connect-safe', 'Menyambung / Gagal Suara') + '</span><strong>0 💎</strong></div>',
            '</div>'
          ].join('')
        : [
            '<div style="background:#FEFCE8;border:1px solid #FDE68A;border-radius:12px;padding:8px 10px;margin:0 0 12px;text-align:left;font-size:11px;line-height:1.55;color:#334155;">',
            '  <div style="display:flex;justify-content:space-between;"><span>' + t('mochi-sos.modal-row-connect-anti', 'Sambung (Anti-Hangus)') + '</span><strong style="color:#059669;">0 💎</strong></div>',
            '  <div style="display:flex;justify-content:space-between;"><span>' + t('mochi-sos.modal-row-opening-ai', 'Bedah Soal Suara AI') + '</span><strong>' + GEM_COST_OPENING_TURN + ' 💎</strong></div>',
            '  <div style="display:flex;justify-content:space-between;"><span>' + t('mochi-sos.modal-row-followup', 'Tanya Lanjutan (Maks. {max} 💎)', { max: GEM_MAX_PER_QUESTION }) + '</span><strong>+' + GEM_COST_FOLLOWUP_TURN + ' 💎</strong></div>',
            '  <div style="display:flex;justify-content:space-between;color:#059669;font-weight:700;"><span>' + t('mochi-sos.modal-row-cashback', 'Jawab Benar Soal Ini') + '</span><span>Cashback +' + CASHBACK_REWARD + ' 💎</span></div>',
            '</div>'
          ].join('');

      modal.innerHTML = [
        '<div class="fz-mochi-sos-intro-card" role="dialog" aria-modal="true" style="background:#FFFDF9;border:2px solid #FDE047;border-radius:20px;padding:16px 14px 14px;max-width:296px;width:calc(100% - 32px);box-shadow:0 12px 32px rgba(0,0,0,0.18);text-align:center;box-sizing:border-box;">',
        '  <div class="fz-mochi-sos-intro-icon" style="width:46px;height:46px;margin:0 auto 6px;background:#FEF3C7;border-radius:14px;display:flex;align-items:center;justify-content:center;">',
        '    <svg width="32" height="32" viewBox="0 0 100 100" fill="none">',
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
        '  <h3 class="fz-mochi-sos-intro-title" style="font-size:15px;font-weight:800;color:#0F172A;margin:0 0 4px;line-height:1.25;">' + titleText + '</h3>',
        '  <p class="fz-mochi-sos-intro-body" style="font-size:11.5px;line-height:1.45;color:#475569;margin:0 0 10px;font-weight:500;">' + bodyText + '</p>',
        breakdownHtml,
        '  <div style="display:flex;gap:8px;justify-content:center;">',
        '    <button type="button" class="fz-mochi-sos-btn-cancel" id="fzMochiSosConfirmCancel" style="flex:1;height:36px;padding:0 10px;background:#FFFFFF;color:#0F172A;border:1.5px solid #CBD5E1;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 0 #CBD5E1;transition:all 0.15s ease;">' + cancelBtnText + '</button>',
        '    <button type="button" class="fz-mochi-sos-btn-confirm" id="fzMochiSosConfirmOk" style="flex:1.5;height:36px;padding:0 10px;background:#FDE047;color:#0F172A;border:1.5px solid #EAB308;border-radius:10px;font-size:11.5px;font-weight:800;cursor:pointer;box-shadow:0 2px 0 #CA8A04;white-space:nowrap;transition:all 0.15s ease;">' + confirmBtnText + '</button>',
        '  </div>',
        '</div>'
      ].join('');

      doc.body.appendChild(modal);

      var btnCancel = doc.getElementById('fzMochiSosConfirmCancel');
      if (btnCancel) {
        btnCancel.onclick = function (e) {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          modal.remove();
        };
      }

      var btnOk = doc.getElementById('fzMochiSosConfirmOk');
      if (btnOk) {
        btnOk.onclick = function (e) {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          var bal = getGemBalance();
          var freshDaily = getDailySosUsage();
          var useFreeNow = freshDaily.count < DAILY_FREE_SOS_LIMIT;
          if (!useFreeNow && bal < GEM_MIN_START_BALANCE) {
            modal.remove();
            self.showInsufficientGemModal(bal);
            return;
          }

          // 0 Gem dipotong saat klik! Gem / kuota gratis hanya terhitung saat audio suara AI benar-benar diputar.
          _pendingBillingMode = useFreeNow ? 'daily_free' : 'metered_gems';
          modal.remove();

          self.setMochiEnabled(true, { userConfirmed: true, useDailyFree: useFreeNow, skipAutoStart: true });
          self.playInstantGreeting();
          self.startCall(activeQ, { autoEntry: true, userConfirmed: true, useDailyFree: useFreeNow });
        };
      }
    },

    showInsufficientGemModal: function (currentBalance) {
      var doc = getDoc();
      if (!doc) return;
      var existing = doc.getElementById('fzMochiSosInsufficientModal');
      if (existing) existing.remove();

      var modal = doc.createElement('div');
      modal.id = 'fzMochiSosInsufficientModal';
      modal.className = 'fz-mochi-sos-intro-scrim';

      var titleText = t('mochi-sos.modal-insufficient-title', 'Gem Belum Cukup 💎');
      var bodyHtml = t('mochi-sos.modal-insufficient-body', 'Kamu membutuhkan minimal 2 Gem untuk membedah soal dengan suara AI Mochi (Saldo saat ini: {balance} 💎). Selesaikan soal latihan untuk kumpulkan Gem gratis atau gunakan kuota gratis harian besok!', { balance: currentBalance });
      var closeBtnText = t('mochi-sos.modal-insufficient-btn', 'Mengerti');

      modal.innerHTML = [
        '<div class="fz-mochi-sos-intro-card" role="dialog" aria-modal="true" style="background:#FFFDF9;border:2px solid #FCA5A5;border-radius:20px;padding:16px 14px 14px;max-width:270px;width:calc(100% - 36px);box-shadow:0 12px 32px rgba(0,0,0,0.18);text-align:center;box-sizing:border-box;">',
        '  <div class="fz-mochi-sos-intro-icon" style="width:46px;height:46px;margin:0 auto 6px;background:#FEE2E2;border-radius:14px;display:flex;align-items:center;justify-content:center;">',
        '    <span style="font-size:22px;">💎</span>',
        '  </div>',
        '  <h3 class="fz-mochi-sos-intro-title" style="font-size:15px;font-weight:800;color:#0F172A;margin:0 0 4px;">' + titleText + '</h3>',
        '  <p class="fz-mochi-sos-intro-body" style="font-size:11.5px;line-height:1.45;color:#475569;margin:0 0 14px;">' + bodyHtml + '</p>',
        '  <button type="button" class="fz-mochi-sos-intro-btn" id="fzMochiSosInsufficientClose" style="width:100%;height:36px;padding:0 12px;background:#0F172A;color:#FFF;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;">' + closeBtnText + '</button>',
        '</div>'
      ].join('');

      doc.body.appendChild(modal);

      var btnClose = doc.getElementById('fzMochiSosInsufficientClose');
      if (btnClose) {
        btnClose.onclick = function () {
          modal.remove();
        };
      }
    },

    // ─── Masuk sesi latihan: Sapaan visual hangat Mochi siap menemani murid ───
    greetOnEntry: function (q, ctx) {
      if (_session.locked || isExamLocked(ctx)) return false;
      if (q) _currentQ = q;
      if (ctx) _currentCtx = ctx;
      var activeQ = getActiveQuestion(q);
      if (!isMochiSosEligible(activeQ, ctx || _currentCtx)) return false;
      this.mountCardToggle(activeQ);
      if (!isMochiEnabledFromStorage()) return false;
      _session.greeted = true;
      try { this._updateMochiMascotPose('greet'); } catch (_) {}
      if (this.isCallActive()) {
        this.renderUnderMochiVoiceVisualizer(true);
      } else {
        this.mountThoughtBubble(activeQ);
      }
      return true;
    },

    // ─── Panggilan ──────────────────────────────────────────────────────────
    startCall: function (q, opts) {
      opts = opts || {};
      if (this.isCallActive()) {
        if (opts.autoEntry) {
          if (q) this.setActiveQuestion(q, _currentCtx);
          this.renderUnderMochiVoiceVisualizer(true);
          return;
        }
        this.closeCall('toggle');
        return;
      }
      q = getActiveQuestion(q);
      if (!isMochiSosEligible(q, _currentCtx)) return;
      this.mountCardToggle(q);
      if (opts.userConfirmed) {
        writeMochiEnabledToStorage(true);
      }
      if (!isMochiEnabledFromStorage()) return;

      var useDailyFreeOpt = !!(opts.useDailyFree || _pendingBillingMode === 'daily_free');
      var can = this.canCall({
        isPlacement: opts.isPlacement,
        requireGems: opts.requireGems,
        realGems: opts.realGems,
        requireEnabled: opts.requireEnabled,
        useDailyFree: useDailyFreeOpt
      });
      if (!can.allowed) {
        playTone(330, 0.2, 'sawtooth');
        try { if (typeof root.showToast === 'function') root.showToast(can.message, 'warn'); } catch (_) {}
        return;
      }

      var sessionId = 'sos-' + Date.now().toString(36);
      // 0 Gem dipotong saat startCall! Gem/kuota dihitung HANYA ketika audio suara AI benar-benar diputar.

      _reconnectAttempts = 0;
      _silencePromptFired = false;
      _lastUserSpeechAt = Date.now();
      _openingTurnCompletedForQ = false;
      _userAudioBurstActive = false;
      _currentTurnMetered = false;
      _isSilenceNudgeTurn = false;
      _pendingFollowupBillable = false;
      _activeCall = {
        active: true,
        sessionId: sessionId,
        startedAt: Date.now(),
        isWelcomePass: !!can.isWelcomePass,
        useDailyFree: !!(useDailyFreeOpt || can.isDailyFree),
        autoEntry: !!opts.autoEntry,
        question: q,
        answered: false,
        cashbackAwardedForQ: false,
        firstAudioAt: 0,
        turnsDelivered: 0,
        gemsSpent: 0,
        lastSilencePrompt: ''
      };
      _outTranscript = '';
      _firstChunkPending = true;

      syncCompanionStrictMode();
      warmAudioContext();
      this.renderUnderMochiVoiceVisualizer(true);
      this._updateMochiMascotPose('greet');

      var doc = getDoc();
      if (doc) {
        var stage = doc.querySelector('.quiz-stage');
        if (stage) stage.classList.add('is-teaching');
        var shell = doc.querySelector('.quiz-shell');
        if (shell) shell.classList.add('is-call-active');
      }
      this.setRestingPawsVisible(false);
      try {
        var comp = root && root.FiezelMochiCompanion;
        var mochiInst = comp && typeof comp.getInstance === 'function' ? comp.getInstance() : null;
        if (mochiInst) {
          if (typeof mochiInst.stopEarTwitchLoop === 'function') mochiInst.stopEarTwitchLoop();
          if (typeof mochiInst.setAccessory === 'function') mochiInst.setAccessory('teacher');
          if (typeof mochiInst.triggerHandGesture === 'function') mochiInst.triggerHandGesture('wave', 2.4);
        }
      } catch (_) {}

      var bubble = doc ? doc.getElementById('fzMochiThoughtBubble') : null;
      if (bubble) bubble.classList.add('is-call-active');

      this._startGeminiLiveDuplex(q);
    },

    _startGeminiLiveDuplex: function (q) {
      var self = this;
      q = getActiveQuestion(q);
      if (evaluateBraincoreStruggleState(q).isStruggling) {
        autoHighlightQuestionClue(q);
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setConnectionStatusInternal('offline', t('mochi-sos.conn-offline', 'Koneksi internet terputus — Mochi menunggu jaringan kembali aktif'));
      }

      // 0. Putar sapaan suara AI Gemini Live (Puck 24kHz PCM) SECARA INSTAN (<100ms) bila sudah siap utuh di cache;
      //    jika belum ada di cache, sapaan hangat diucapkan langsung pada openingTurn utama tanpa terpotong!
      var prewarmedGreet = getPrewarmedGreetingChunks();
      if (prewarmedGreet && prewarmedGreet.length >= 4) {
        if (_activeCall) _activeCall.playedInstantGreeting = true;
        for (var gi = 0; gi < prewarmedGreet.length; gi++) {
          this._scheduleAudioChunk(prewarmedGreet[gi]);
        }
      }

      // 1. Mikrofon + Parallel Web Speech Recognition — paralel, dipagari Silero Neural VAD v5.
      this._startParallelSpeechRecognition();
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        }).catch(function () {
          return navigator.mediaDevices.getUserMedia({ audio: true });
        }).then(function (stream) {
          if (!stream) return;
          if (!self.isCallActive()) { stream.getTracks().forEach(function (tr) { tr.stop(); }); return; }
          _micStream = stream;
          self._wireMicrophoneStream(stream);
        }).catch(function (err) {
          console.warn('[Mochi Voice SOS] Mic permission unavailable (listen-only mode):', err);
        });
      }

      // 2. Jalur tercepat: adopsi hot socket HANYA jika terikat pada soal aktif yang sama (__fzBoundQSig cocok).
      var wantSig = getQuestionSig(q);
      if (_hotWs && _hotWs.readyState <= 1 && wantSig && _hotWs.__fzBoundQSig === wantSig) {
        var ws = _hotWs;
        _hotWs = null;
        if (_hotWsIdleTimer) { clearTimeout(_hotWsIdleTimer); _hotWsIdleTimer = null; }
        this._adoptLiveWebSocket(ws, q, _hotWsSetupComplete);
        _hotWsSetupComplete = false;
        prewarmLiveSession(true); // siapkan token untuk panggilan berikutnya
        return;
      } else if (_hotWs) {
        discardHotSocket();
      }

      // 3. Jalur kedua: token pre-warmed (tanpa RTT ke worker).
      var pre = takePrewarmedSession();
      if (pre && (!pre.isDirectKey || isDirectKeyAvailable())) {
        this._connectLiveWebSocket(pre.endpoint, q, pre.keyIndex, !!pre.isDirectKey);
        prewarmLiveSession(true);
        return;
      }

      // 3b. Jalur sinkron instan jika kunci API langsung tersedia & tidak sedang cooldown kuota
      if (isDirectKeyAvailable()) {
        var directKey = getUserGeminiApiKey();
        if (directKey) {
          this._connectLiveWebSocket(
            'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=' + encodeURIComponent(directKey),
            q,
            0,
            true
          );
          return;
        }
      }

      // 4. Jalur server pool (16-key rotation): fetch token sekarang.
      fetchLiveSessionToken({ skipDirectKey: !isDirectKeyAvailable() }).then(function (session) {
        if (!self.isCallActive()) return;
        if (!session || !session.ok || !session.endpoint) {
          console.warn('[Mochi Voice SOS] Gemini Live endpoint unavailable, fallback to speech.');
          setConnectionStatusInternal(
            (typeof navigator !== 'undefined' && navigator.onLine === false) ? 'offline' : 'error',
            (typeof navigator !== 'undefined' && navigator.onLine === false)
              ? t('mochi-sos.conn-offline', 'Koneksi internet terputus — Mochi menunggu jaringan kembali aktif')
              : t('mochi-sos.conn-error', 'Koneksi AI bermasalah — Ketuk untuk coba lagi')
          );
          self._fallbackSpeechTurn(q);
          return;
        }
        self._connectLiveWebSocket(session.endpoint, q, session.keyIndex, !!session.isDirectKey);
      }).catch(function (err) {
        console.warn('[Mochi Voice SOS] Error fetching live token:', err);
        setConnectionStatusInternal('error', t('mochi-sos.conn-error', 'Koneksi AI bermasalah — Ketuk untuk coba lagi'));
        self._fallbackSpeechTurn(q);
      });
    },

    _startParallelSpeechRecognition: function () {
      var self = this;
      this._stopParallelSpeechRecognition();
      var SpeechRec = (root && (root.SpeechRecognition || root.webkitSpeechRecognition)) ||
                      (typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null);
      if (!SpeechRec) return;

      _speechRecActive = true;
      var accumulated = '';
      var startCycle = function () {
        if (!_speechRecActive || !_activeCall || !_activeCall.active) return;
        try {
          var rec = new SpeechRec();
          rec.lang = getLocale() === 'th' ? 'th-TH' : 'id-ID';
          rec.interimResults = true;
          var isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
          rec.continuous = !isAndroid;

          // PENTING: rec.onspeechstart DIHAPUS agar deru kendaraan / bising jalanan
          // tidak pernah memicu indikator bicara atau membekukan Mochi!

          rec.onresult = function (event) {
            if (!_speechRecActive || !_activeCall || !_activeCall.active) return;
            var mochiBusy = (_activeAudioSources.length > 0) || _modelTurnInProgress || _awaitingOpeningModelTurn || ((Date.now() - _lastMochiAudioEndedAt) < 450);
            if (mochiBusy) return;
            // Wajib lolos verifikasi Silero Neural VAD bila model aktif (tolak halusinasi bising jalanan)
            if (_sileroVadActive && (Date.now() - _sileroLastSpeechProbAt) > 2800) {
              return;
            }
            var tx = '';
            for (var i = event.resultIndex || 0; i < event.results.length; i++) {
              tx += event.results[i][0].transcript;
            }
            var clean = String(tx || '').replace(/\s+/g, ' ').trim();
            if (!clean || (clean.length < 2 && !/[^\x00-\x7F]/.test(clean))) return;
            accumulated = clean;
            self._setVoiceVisualizerUserSpeaking(true);
            _lastUserSpeechAt = Date.now();
            _silencePromptFired = false;
            if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }

            if (_speechRecSubmitTimer) clearTimeout(_speechRecSubmitTimer);
            _speechRecSubmitTimer = setTimeout(function () {
              _speechRecSubmitTimer = null;
              var toSend = String(accumulated || '').trim();
              accumulated = '';
              if (!toSend || !_activeCall || !_activeCall.active) return;
              if (_modelTurnInProgress || _awaitingOpeningModelTurn || _activeAudioSources.length > 0) return;
              if (_sileroVadActive && (Date.now() - _sileroLastSpeechProbAt) > 3600) return;
              if (_ws && _ws.readyState === 1 && _ws.__fzSetupComplete) {
                _userAskedConceptOnCurrent = true;
                _pendingFollowupBillable = true;
                _currentTurnMetered = false;
                _isSilenceNudgeTurn = false;
                var activeSpokenQ = getActiveQuestion(null);
                var bcSpoken = evaluateBraincoreStruggleState(activeSpokenQ);
                if (bcSpoken.isStruggling) {
                  autoHighlightQuestionClue(activeSpokenQ);
                }
                var learnerName = getRegisteredLearnerName();
                var snap = buildQuizContextSnapshot(activeSpokenQ, _currentCtx);
                try {
                  _ws.send(JSON.stringify({
                    clientContent: {
                      turns: [{
                        role: 'user',
                        parts: [{
                          text: '[Peserta "' + learnerName + '" berkata: "' + toSend + '" terkait butir "' + snap.stem + '".]\n' +
                            bcSpoken.diagnosticPacket + '\n' +
                            'Jawab langsung dengan suara manusia asli yang hangat menggunakan bahasa anak SMP yang sederhana dan perumpamaan sehari-hari berdasarkan konsep (' + (snap.rule || snap.why || 'konteks kalimat') + ') tanpa membocorkan kunci!'
                        }]
                      }],
                      turnComplete: true
                    }
                  }));
                } catch (_) {}
              }
            }, 850);
          };

          rec.onerror = function (evErr) {
            var code = String((evErr && evErr.error) || '');
            if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
              _speechRecActive = false;
            }
          };

          rec.onend = function () {
            if (!_speechRecActive || !_activeCall || !_activeCall.active) return;
            setTimeout(function () {
              if (_speechRecActive && _activeCall && _activeCall.active) startCycle();
            }, 180);
          };

          _speechRec = rec;
          rec.start();
        } catch (_) {}
      };
      startCycle();
    },

    _stopParallelSpeechRecognition: function () {
      _speechRecActive = false;
      if (_speechRecSubmitTimer) { clearTimeout(_speechRecSubmitTimer); _speechRecSubmitTimer = null; }
      if (_speechRec) {
        try {
          _speechRec.onresult = null;
          _speechRec.onend = null;
          _speechRec.onerror = null;
          _speechRec.onspeechstart = null;
          _speechRec.stop();
        } catch (_) {}
        _speechRec = null;
      }
    },

    _wireMicrophoneStream: function (stream) {
      var self = this;
      var ctx = getAudioContext();
      if (!ctx) return;
      try {
        if (ctx.state === 'suspended') {
          try { ctx.resume().catch(function () {}); } catch (_) {}
        }
        var micSource = ctx.createMediaStreamSource(stream);
        _micSource = micSource;
        var proc = ctx.createScriptProcessor ? ctx.createScriptProcessor(2048, 1, 1) : null;
        if (proc) {
          _micProcessor = proc;
          try { if (root) root.__fzMochiSosMicProcessor = proc; } catch (_) {}
          var inRate = ctx.sampleRate || 48000;
          var preRollFrames = [];
          _consecutiveSpeechFrames = 0;

          // Fallback Vocal-Formant Gate (hanya aktif selama ~120ms sebelum Silero ONNX WASM siap atau di lingkungan uji non-WASM)
          proc.onaudioprocess = function (e) {
            if (!_activeCall || !_activeCall.active) return;
            if (_sileroVadActive) return;
            if (ctx.state === 'suspended') {
              try { ctx.resume().catch(function () {}); } catch (_) {}
            }
            // Jangan pernah memotong atau mengirim derau mikrofon saat sapaan/penjelasan pembuka sedang berjalan
            if (!_openingTurnCompletedForQ || _awaitingOpeningModelTurn) {
              _consecutiveSpeechFrames = 0;
              return;
            }
            var float32 = e.inputBuffer.getChannelData(0);
            var v = analyzeHumanVoiceBandFrame(float32, inRate);
            var mochiPlayingAudio = (_activeAudioSources.length > 0) || ((Date.now() - _lastMochiAudioEndedAt) < 320);
            var inOpeningGrace = _activeCall && _activeCall.startedAt && ((Date.now() - _activeCall.startedAt) < 3200);

            var scheduleBurstEnd = function () {
              if (_audioStreamEndTimer) { clearTimeout(_audioStreamEndTimer); }
              _audioStreamEndTimer = setTimeout(function () {
                _audioStreamEndTimer = null;
                _userAudioBurstActive = false;
                self._setVoiceVisualizerUserSpeaking(false);
                if (_ws && _ws.readyState === 1 && _ws.__fzSetupComplete && !_modelTurnInProgress && !_awaitingOpeningModelTurn && _activeAudioSources.length === 0) {
                  _pendingFollowupBillable = true;
                  try {
                    _ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
                  } catch (_) {}
                }
              }, 520);
            };

            if (mochiPlayingAudio) {
              if (inOpeningGrace) {
                _consecutiveSpeechFrames = 0;
                return;
              }
              // Butuh >= 8 frame berturut-turut pita vokal manusia jelas & keras (tolak pantulan suara speaker Mochi sendiri)
              if (v.isHumanSpeech && v.rms >= 0.038) {
                _consecutiveSpeechFrames++;
                if (_consecutiveSpeechFrames >= 8) {
                  _lastBargeInAt = Date.now();
                  _modelTurnInProgress = false;
                  _awaitingOpeningModelTurn = false;
                  _userAskedConceptOnCurrent = true;
                  if (_openingModelTurnTimer) { clearTimeout(_openingModelTurnTimer); _openingModelTurnTimer = null; }
                  stopAllActiveAudioSources();
                  self._setVoiceVisualizerUserSpeaking(true);
                  _lastUserSpeechAt = Date.now();
                  _silencePromptFired = false;
                  if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
                  _userAudioBurstActive = true;
                  scheduleBurstEnd();
                } else {
                  return;
                }
              } else {
                _consecutiveSpeechFrames = 0;
                return;
              }
            } else {
              var minRms = _modelTurnInProgress ? 0.020 : 0.010;
              if (v.isHumanSpeech && v.rms >= minRms) {
                _consecutiveSpeechFrames++;
                if (_consecutiveSpeechFrames >= 4) {
                  _userAskedConceptOnCurrent = true;
                  self._setVoiceVisualizerUserSpeaking(true);
                  _lastUserSpeechAt = Date.now();
                  _silencePromptFired = false;
                  if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
                  _userAudioBurstActive = true;
                  scheduleBurstEnd();
                }
              } else {
                _consecutiveSpeechFrames = 0;
              }
            }

            if (!_ws || _ws.readyState !== 1 || !_ws.__fzSetupComplete) return;
            var pcmBase64 = resampleAndConvertToPcm16Base64(float32, inRate, 16000);
            if (!pcmBase64) return;

            if (_userAudioBurstActive) {
              while (preRollFrames.length > 0) {
                var pre = preRollFrames.shift();
                try {
                  _ws.send(JSON.stringify({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: pre } } }));
                } catch (_) {}
              }
              try {
                _ws.send(JSON.stringify({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: pcmBase64 } } }));
              } catch (_) {}
            } else {
              preRollFrames.push(pcmBase64);
              if (preRollFrames.length > 8) preRollFrames.shift();
            }
          };

          micSource.connect(proc);
          var silentGain = ctx.createGain();
          silentGain.gain.value = 0.00001;
          proc.connect(silentGain);
          silentGain.connect(ctx.destination);
        }

        // Utama: Neural Human-Voice VAD (@ricky0123/vad-web Silero VAD v5 ONNX WASM, self-hosted)
        ensureSileroVadBundle().then(function (vadLib) {
          if (!vadLib || !vadLib.MicVAD || typeof vadLib.MicVAD.new !== 'function') return;
          if (!_activeCall || !_activeCall.active || _micStream !== stream) return;
          var baseHref = resolveSileroVendorBase();
          var sileroPreRoll = [];
          var sileroSpeechStreak = 0;
          var sileroSilenceStreak = 0;

          vadLib.MicVAD.new({
            model: 'v5',
            baseAssetPath: baseHref,
            onnxWASMBasePath: baseHref,
            ortConfig: function (ort) {
              try {
                if (ort && ort.env && ort.env.wasm) {
                  ort.env.wasm.numThreads = 1;
                  ort.env.wasm.proxy = false;
                }
              } catch (_) {}
            },
            positiveSpeechThreshold: 0.62,
            negativeSpeechThreshold: 0.42,
            minSpeechMs: 192,
            redemptionMs: 480,
            preSpeechPadMs: 384,
            submitUserSpeechOnPause: false,
            getStream: function () { return Promise.resolve(stream); },
            pauseStream: function () { return Promise.resolve(); },
            resumeStream: function () { return Promise.resolve(stream); },
            audioContext: ctx,
            onFrameProcessed: function (probs, frame) {
              if (!_activeCall || !_activeCall.active) return;
              // Jangan pernah memotong giliran sapaan/penjelasan pembuka sebelum selesai diucapkan penuh
              if (!_openingTurnCompletedForQ || _awaitingOpeningModelTurn) {
                sileroSpeechStreak = 0;
                return;
              }
              var pSpeech = (probs && typeof probs.isSpeech === 'number') ? probs.isSpeech : 0;
              var n = frame ? frame.length : 0;
              var sq = 0;
              for (var i = 0; i < n; i++) sq += frame[i] * frame[i];
              var rms = n > 0 ? Math.sqrt(sq / n) : 0;
              var pcmBase64 = n > 0 ? float32ToPcm16Base64(frame) : '';
              var mochiPlayingAudio = (_activeAudioSources.length > 0) || ((Date.now() - _lastMochiAudioEndedAt) < 320);
              var inOpeningGrace = _activeCall && _activeCall.startedAt && ((Date.now() - _activeCall.startedAt) < 3200);

              if (mochiPlayingAudio) {
                if (inOpeningGrace) {
                  sileroSpeechStreak = 0;
                  return;
                }
                // Barge-in hanya diizinkan bila suara dekat mikrofon manusia asli terkonfirmasi >= 12 frame (384ms, p >= 0.88, rms >= 0.035)
                // sehingga gema speaker laptop/HP tidak pernah memotong penjelasan Mochi sendiri!
                if (pSpeech >= 0.88 && rms >= 0.035) {
                  _sileroLastSpeechProbAt = Date.now();
                  sileroSpeechStreak++;
                  sileroSilenceStreak = 0;
                  if (sileroSpeechStreak >= 12) {
                    _lastBargeInAt = Date.now();
                    _modelTurnInProgress = false;
                    _awaitingOpeningModelTurn = false;
                    _userAskedConceptOnCurrent = true;
                    if (_openingModelTurnTimer) { clearTimeout(_openingModelTurnTimer); _openingModelTurnTimer = null; }
                    stopAllActiveAudioSources();
                    self._setVoiceVisualizerUserSpeaking(true);
                    _lastUserSpeechAt = Date.now();
                    _silencePromptFired = false;
                    if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
                    _userAudioBurstActive = true;
                  } else {
                    return;
                  }
                } else {
                  if (pSpeech < 0.65) sileroSpeechStreak = 0;
                  return;
                }
              } else {
                // Saat mendengarkan: wajib >= 5 frame (160ms, p >= 0.62) suara bicara manusia; bising kendaraan diabaikan total!
                if (pSpeech >= 0.62 && rms >= 0.004) {
                  _sileroLastSpeechProbAt = Date.now();
                  sileroSpeechStreak++;
                  sileroSilenceStreak = 0;
                  if (sileroSpeechStreak >= 5) {
                    _userAskedConceptOnCurrent = true;
                    _userAudioBurstActive = true;
                    _lastUserSpeechAt = Date.now();
                    _silencePromptFired = false;
                    if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
                    self._setVoiceVisualizerUserSpeaking(true);
                  }
                } else if (pSpeech < 0.42) {
                  sileroSpeechStreak = 0;
                  if (_userAudioBurstActive) {
                    sileroSilenceStreak++;
                    if (sileroSilenceStreak >= 15) {
                      _userAudioBurstActive = false;
                      sileroSilenceStreak = 0;
                      self._setVoiceVisualizerUserSpeaking(false);
                      if (_ws && _ws.readyState === 1 && _ws.__fzSetupComplete && !_modelTurnInProgress && !_awaitingOpeningModelTurn && _activeAudioSources.length === 0) {
                        _pendingFollowupBillable = true;
                        try {
                          _ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
                        } catch (_) {}
                      }
                    }
                  }
                }
              }

              if (!_ws || _ws.readyState !== 1 || !_ws.__fzSetupComplete || !pcmBase64) {
                if (pcmBase64) {
                  sileroPreRoll.push(pcmBase64);
                  if (sileroPreRoll.length > 14) sileroPreRoll.shift();
                }
                return;
              }

              if (_userAudioBurstActive) {
                while (sileroPreRoll.length > 0) {
                  var preChunk = sileroPreRoll.shift();
                  try {
                    _ws.send(JSON.stringify({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: preChunk } } }));
                  } catch (_) {}
                }
                try {
                  _ws.send(JSON.stringify({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: pcmBase64 } } }));
                } catch (_) {}
              } else {
                sileroPreRoll.push(pcmBase64);
                if (sileroPreRoll.length > 14) sileroPreRoll.shift();
              }
            },
            onVADMisfire: function () {
              sileroSpeechStreak = 0;
              if (!_userAudioBurstActive) {
                self._setVoiceVisualizerUserSpeaking(false);
              }
            }
          }).then(function (myVad) {
            if (!myVad) return;
            if (!_activeCall || !_activeCall.active || _micStream !== stream) {
              try { if (typeof myVad.destroy === 'function') myVad.destroy(); } catch (_) {}
              return;
            }
            _sileroVad = myVad;
            _sileroVadActive = true;
            if (_audioStreamEndTimer) { clearTimeout(_audioStreamEndTimer); _audioStreamEndTimer = null; }
            try { myVad.start(); } catch (_) {}
            try { if (root) root.__fzMochiSileroVad = myVad; } catch (_) {}
          }).catch(function (vadErr) {
            console.warn('[Mochi Voice SOS] Silero VAD init fallback to vocal-band DSP:', vadErr);
          });
        });
      } catch (err) {
        console.warn('[Mochi Voice SOS] Mic wiring error:', err);
      }
    },

    _connectLiveWebSocket: function (endpoint, q, keyIndex, isDirectKey) {
      var WS = root.WebSocket || (typeof window !== 'undefined' ? window.WebSocket : null);
      if (!WS) { this._fallbackSpeechTurn(q); return; }
      try {
        var ws = new WS(endpoint);
        ws.binaryType = 'arraybuffer';
        ws.__fzKeyIndex = keyIndex || 0;
        ws.__fzDirectKey = !!isDirectKey;
        ws.__fzBoundQSig = getQuestionSig(q);
        this._adoptLiveWebSocket(ws, q, false);
      } catch (err) {
        console.warn('[Mochi Voice SOS] WebSocket creation error:', err);
        setConnectionStatusInternal('error', t('mochi-sos.conn-error', 'Koneksi AI bermasalah — Ketuk untuk coba lagi'));
        this._fallbackSpeechTurn(q);
      }
    },

    _adoptLiveWebSocket: function (ws, q, setupAlreadyComplete) {
      var self = this;
      _ws = ws;
      ws.__fzSetupComplete = !!(setupAlreadyComplete || _hotWsSetupComplete);
      var gotAnyAudio = false;
      if (_openingWatchdogTimer) { clearTimeout(_openingWatchdogTimer); _openingWatchdogTimer = null; }

      var armOpeningWatchdog = function () {
        if (_openingWatchdogTimer) clearTimeout(_openingWatchdogTimer);
        _openingWatchdogTimer = setTimeout(function () {
          _openingWatchdogTimer = null;
          if (gotAnyAudio || !self.isCallActive() || _ws !== ws) return;
          if (ws.__fzDirectKey) {
            markDirectKeyQuotaCooldown();
            setConnectionStatusInternal('quota', t('mochi-sos.conn-quota', 'Kuota API AI penuh — mengalihkan jalur koneksi...'));
          } else {
            setConnectionStatusInternal('reconnecting', t('mochi-sos.conn-reconnecting', 'Koneksi suara terputus — menyambungkan ulang...'));
          }
          _ws = null;
          try {
            ws.onclose = null;
            ws.onmessage = null;
            if (ws.readyState <= 1) ws.close(4008, 'opening_audio_watchdog');
          } catch (_) {}
          if (_reconnectAttempts < 3) {
            _reconnectAttempts++;
            fetchLiveSessionToken({ skipDirectKey: true }).then(function (session) {
              if (!self.isCallActive() || _ws) return;
              if (session && session.ok && session.endpoint) {
                self._connectLiveWebSocket(session.endpoint, getActiveQuestion(q), session.keyIndex, false);
              } else {
                setConnectionStatusInternal('error', t('mochi-sos.conn-error', 'Koneksi AI bermasalah — Ketuk untuk coba lagi'));
                self._fallbackSpeechTurn(q);
              }
            }).catch(function () {
              setConnectionStatusInternal('error', t('mochi-sos.conn-error', 'Koneksi AI bermasalah — Ketuk untuk coba lagi'));
              self._fallbackSpeechTurn(q);
            });
          } else {
            setConnectionStatusInternal('error', t('mochi-sos.conn-error', 'Koneksi AI bermasalah — Ketuk untuk coba lagi'));
          }
        }, OPENING_AUDIO_WATCHDOG_MS);
      };

      var openingSent = false;
      var sendOpeningTurn = function () {
        if (openingSent || !_ws || _ws.readyState !== 1) return;
        openingSent = true;
        ws.__fzSetupComplete = true;
        if (_connStatus.state === 'reconnecting' || _connStatus.state === 'quota' || _connStatus.state === 'error' || _connStatus.state === 'connecting') {
          setConnectionStatusInternal('connected', '');
        }
        _lastUserSpeechAt = Date.now();
        _silencePromptFired = false;
        _currentTurnMetered = false;
        _isSilenceNudgeTurn = false;
        _awaitingOpeningModelTurn = true;
        if (_openingModelTurnTimer) clearTimeout(_openingModelTurnTimer);
        _openingModelTurnTimer = setTimeout(function () {
          _awaitingOpeningModelTurn = false;
          _openingTurnCompletedForQ = true;
          _openingModelTurnTimer = null;
        }, 7500);
        var activeQ = getActiveQuestion(q);
        var bcOpen = evaluateBraincoreStruggleState(activeQ);
        if (bcOpen.isStruggling) {
          autoHighlightQuestionClue(activeQ);
        }
        var snap = buildQuizContextSnapshot(activeQ, _currentCtx);
        var learnerName = getRegisteredLearnerName();
        var playedInstant = !!(_activeCall && _activeCall.playedInstantGreeting);
        var detailsBlock =
          'DATA BUTIR DI LAYAR SAAT INI:\n' +
          bcOpen.diagnosticPacket + '\n' +
          (snap.instruction ? '- Instruksi: "' + snap.instruction + '"\n' : '') +
          (snap.focusWord ? '- Kata Fokus/Target: "' + snap.focusWord + '"\n' : '') +
          '- Kalimat Butir (#quizStem): "' + (snap.stem || '(lihat layar)') + '"\n' +
          (snap.passage ? '- Wacana Bacaan: "' + snap.passage + '"\n' : '') +
          (snap.options.length ? '- Pilihan Opsi di Layar: ' + snap.options.join(' | ') + '\n' : '') +
          (snap.rule ? '- Konsep Dasar (Pegangan Mentor): ' + snap.rule + '\n' : '') +
          (snap.why ? '- Logika Ilmiah (Pegangan Mentor): ' + snap.why + '\n' : '') +
          (snap.distractor ? '- Jebakan Pengecoh: ' + snap.distractor + '\n' : '');

        var openingInstruction;
        if (getLocale() === 'th') {
          openingInstruction = playedInstant
            ? '[ระบบ: คุณเพิ่งทักทาย "' + learnerName + '" ไปแล้ว อธิบายภาพรวมของโจทย์บนหน้าจอ ("' + snap.stem + '") ด้วยภาษาง่ายๆ ระดับมัธยมต้น 1 ประโยคสั้นๆ โดยห้ามชี้คำใบ้แคบๆ หรือเฉลยคำตอบ เพื่อให้ "' + learnerName + '" ลองอ่านและคิดด้วยตัวเองก่อน!\n' + detailsBlock + ']'
            : '[ระบบ: นักเรียนชื่อ "' + learnerName + '" เพิ่งเข้าสู่รอบฝึกซ้อม ทักทาย "' + learnerName + '" ทันทีด้วยเสียงอบอุ่นเป็นกันเอง แล้วชวนดูภาพรวมของโจทย์บนหน้าจอ ("' + snap.stem + '") ด้วยภาษาง่ายๆ ระดับมัธยมต้น โดยห้ามชี้คำใบ้แคบๆ หรือเฉลยคำตอบ เพื่อให้ "' + learnerName + '" ลองคิดเองก่อน!\n' + detailsBlock + ']';
        } else {
          openingInstruction = playedInstant
            ? '[SISTEM: Kamu baru saja menyapa "' + learnerName + '" melalui audio pembuka. Langsung ajak "' + learnerName + '" memperhatikan maksud umum butir di layar ("' + snap.stem + '") dengan bahasa anak SMP yang santai dan mudah dimengerti. JANGAN langsung menunjuk kata/kalimat kunci atau memberikan hint sempit yang membuat opsi mudah ditebak agar "' + learnerName + '" membaca dan mencoba berpikir sendiri dulu! DILARANG mengulang sapaan "Halo" dan DILARANG KERAS membocorkan kunci!\n' + detailsBlock + ']'
            : '[SISTEM: Peserta bernama "' + learnerName + '" baru saja masuk. Awali dengan menyapa hangat ("Halo ' + learnerName + '!") dalam 1 kalimat singkat yang ramah, lalu dengan bahasa anak SMP yang santai ajak "' + learnerName + '" memperhatikan maksud umum butir di layar ("' + snap.stem + '"). JANGAN langsung menunjuk kata/kalimat kunci atau memberikan hint sempit di awal agar "' + learnerName + '" membaca dan mencoba berpikir sendiri dulu! DILARANG KERAS membocorkan kunci!\n' + detailsBlock + ']';
        }
        try {
          _ws.send(JSON.stringify({
            clientContent: {
              turns: [{
                role: 'user',
                parts: [{
                  text: openingInstruction
                }]
              }],
              turnComplete: true
            }
          }));
          armOpeningWatchdog();
        } catch (_) {}
      };

      if (ws.readyState === 0) {
        ws.onopen = function () {
          if (!ws.__fzSetupSent) {
            ws.__fzSetupSent = true;
            try { ws.send(buildSetupFrame(q, _currentCtx)); } catch (_) {}
          }
        };
      } else if (ws.readyState === 1 && !ws.__fzSetupSent) {
        ws.__fzSetupSent = true;
        try { ws.send(buildSetupFrame(q, _currentCtx)); } catch (_) {}
      }

      ws.onmessage = function (event) {
        self._handleLiveWsMessage(event, q, sendOpeningTurn, function () {
          gotAnyAudio = true;
          _reconnectAttempts = 0;
          if (_connStatus.state !== 'connected' && _connStatus.state !== 'idle') {
            setConnectionStatusInternal('connected', '');
          }
          if (_openingWatchdogTimer) { clearTimeout(_openingWatchdogTimer); _openingWatchdogTimer = null; }
        });
      };
      ws.onerror = function (e) {
        console.warn('[Mochi Voice SOS] WebSocket error:', e);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          setConnectionStatusInternal('offline', t('mochi-sos.conn-offline', 'Koneksi internet terputus — Mochi menunggu jaringan kembali aktif'));
        }
      };
      ws.onclose = function (ev) {
        var wasCurrent = (_ws === ws);
        if (_openingWatchdogTimer) { clearTimeout(_openingWatchdogTimer); _openingWatchdogTimer = null; }
        // JANGAN memotong chunk audio sapaan yang sedang diputar di speaker murid!
        if (!wasCurrent) return;
        _ws = null;
        var code = ev && ev.code;
        var reason = String((ev && ev.reason) || '');
        var isQuotaErr = /quota|rate|exhausted|429|resource_exhausted/i.test(reason) || code === 1013;
        if (ws.__fzDirectKey && (code !== 1000 || !gotAnyAudio)) {
          markDirectKeyQuotaCooldown();
        }
        if (code !== 1000) reportDrop(code, reason, ws.__fzKeyIndex);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          setConnectionStatusInternal('offline', t('mochi-sos.conn-offline', 'Koneksi internet terputus — Mochi menunggu jaringan kembali aktif'));
        } else if (isQuotaErr) {
          setConnectionStatusInternal('quota', t('mochi-sos.conn-quota', 'Kuota API AI penuh — mengalihkan jalur koneksi...'));
        }
        // Self-healing auto-reconnect ke rotasi server pool jika sesi latihan masih berjalan
        if (self.isCallActive() && _session.active && !_session.locked && isMochiEnabledFromStorage() && _reconnectAttempts < 3) {
          _reconnectAttempts++;
          if (!isQuotaErr && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
            setConnectionStatusInternal('reconnecting', t('mochi-sos.conn-reconnecting', 'Koneksi suara terputus — menyambungkan ulang...'));
          }
          if (_reconnectTimer) clearTimeout(_reconnectTimer);
          _reconnectTimer = setTimeout(function () {
            if (self.isCallActive() && !_ws) {
              self._startGeminiLiveDuplex(getActiveQuestion(q));
            }
          }, 300);
          return;
        }
        if (self.isCallActive() && !gotAnyAudio) {
          setConnectionStatusInternal('error', t('mochi-sos.conn-error', 'Koneksi AI bermasalah — Ketuk untuk coba lagi'));
          self._fallbackSpeechTurn(q);
        }
      };

      if (setupAlreadyComplete || _hotWsSetupComplete) {
        sendOpeningTurn();
      } else if (ws.readyState === 1 && !ws.__fzSetupSent) {
        ws.__fzSetupSent = true;
        try { ws.send(buildSetupFrame(q, _currentCtx)); } catch (_) {}
      }
    },

    _handleLiveWsMessage: function (event, q, onSetupComplete, onAudio) {
      var self = this;
      var parseAndHandle = function (rawText) {
        var msg;
        try { msg = JSON.parse(rawText); } catch (_) { return; }

        if (msg.setupComplete) {
          if (_ws) _ws.__fzSetupComplete = true;
          if (typeof onSetupComplete === 'function') onSetupComplete();
          return;
        }

        // Live Function Calling (google-gemini/live-api-web-console pattern): Socratic clue highlight
        if (msg.toolCall && Array.isArray(msg.toolCall.functionCalls)) {
          var functionResponses = [];
          for (var ti = 0; ti < msg.toolCall.functionCalls.length; ti++) {
            var fc = msg.toolCall.functionCalls[ti];
            var toolOut = self._executeSocraticToolCall(fc, q);
            functionResponses.push({
              id: fc.id,
              name: fc.name,
              response: { result: toolOut }
            });
          }
          if (_ws && _ws.readyState === 1 && functionResponses.length > 0) {
            try {
              _ws.send(JSON.stringify({ toolResponse: { functionResponses: functionResponses } }));
            } catch (_) {}
          }
        }

        var sc = msg.serverContent;
        if (!sc) return;

        if (sc.interrupted) {
          _modelTurnInProgress = false;
          _awaitingOpeningModelTurn = false;
          _currentTurnMetered = false;
          _isSilenceNudgeTurn = false;
          if (_openingModelTurnTimer) { clearTimeout(_openingModelTurnTimer); _openingModelTurnTimer = null; }
          stopAllActiveAudioSources();
          _outTranscript = '';
        }

        // Deteksi suara murid dari transkrip input server Gemini Live (terpagar Silero VAD)
        if (sc.inputTranscription && sc.inputTranscription.text && String(sc.inputTranscription.text).trim()) {
          if (!_sileroVadActive || (Date.now() - _sileroLastSpeechProbAt) < 3500) {
            _lastUserSpeechAt = Date.now();
            _silencePromptFired = false;
            _pendingFollowupBillable = true;
            self._setVoiceVisualizerUserSpeaking(true);
            if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
          }
        }

        // Leak guard: transkrip keluaran model diperiksa incremental per giliran.
        if (sc.outputTranscription && sc.outputTranscription.text) {
          _outTranscript += ' ' + sc.outputTranscription.text;
          if (_outTranscript.length > 1200) _outTranscript = _outTranscript.slice(-1200);
          if (transcriptLeaks(_outTranscript, getActiveQuestion(q))) enforceLeakGuard(q);
        }

        if (sc.modelTurn && sc.modelTurn.parts) {
          if (_lastBargeInAt > 0 && (Date.now() - _lastBargeInAt) < 480) {
            return;
          }
          _modelTurnInProgress = true;
          _awaitingOpeningModelTurn = false;
          if (_openingModelTurnTimer) { clearTimeout(_openingModelTurnTimer); _openingModelTurnTimer = null; }
          if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
          for (var i = 0; i < sc.modelTurn.parts.length; i++) {
            var part = sc.modelTurn.parts[i];
            if (part.inlineData && part.inlineData.data) {
              if (typeof onAudio === 'function') onAudio();
              if (!_currentTurnMetered) {
                _currentTurnMetered = true;
                var billKind = _pendingFollowupBillable ? 'followup' : 'opening';
                _pendingFollowupBillable = false;
                self.meterDeliveredAiTurn(getActiveQuestion(q) || q, billKind);
              }
              self._scheduleAudioChunk(part.inlineData.data);
            }
          }
        }

        if (sc.turnComplete) {
          _modelTurnInProgress = false;
          _awaitingOpeningModelTurn = false;
          _currentTurnMetered = false;
          _isSilenceNudgeTurn = false;
          if (_openingModelTurnTimer) { clearTimeout(_openingModelTurnTimer); _openingModelTurnTimer = null; }
          _outTranscript = '';
          if (_turnEndFallbackTimer) { clearTimeout(_turnEndFallbackTimer); _turnEndFallbackTimer = null; }
          if (_activeAudioSources.length === 0) {
            self._onMochiSpeechEnded();
          } else {
            var ctx = _audioCtx;
            var remMs = ctx ? Math.max(40, Math.ceil((_nextAudioPlayTime - ctx.currentTime) * 1000) + 60) : 250;
            _turnEndFallbackTimer = setTimeout(function () {
              _turnEndFallbackTimer = null;
              if (_activeAudioSources.length > 0) {
                _activeAudioSources = [];
                self._setVoiceVisualizerSpeaking(false);
              }
              self._onMochiSpeechEnded();
            }, remMs);
          }
        }
      };

      if (typeof event.data === 'string') {
        parseAndHandle(event.data);
      } else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
        if (typeof event.data.text === 'function') event.data.text().then(parseAndHandle).catch(function () {});
        else { var reader = new FileReader(); reader.onload = function () { parseAndHandle(reader.result); }; reader.readAsText(event.data); }
      } else if (typeof ArrayBuffer !== 'undefined' && event.data instanceof ArrayBuffer) {
        try { var decoded = (typeof TextDecoder !== 'undefined') ? new TextDecoder().decode(event.data) : ''; if (decoded) parseAndHandle(decoded); } catch (_) {}
      }
    },

    _scheduleAudioChunk: function (base64Pcm16) {
      var ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(function () {});
      var buffer = pcm16Base64ToAudioBuffer(ctx, base64Pcm16, 24000);
      if (!buffer) return;

      var source = ctx.createBufferSource();
      source.buffer = buffer;

      // Jitter lead adaptif: 30ms untuk chunk pertama (respons terasa instan),
      // 60ms saat aliran berjalan dan sempat kosong (underrun) agar tidak pecah.
      var now = ctx.currentTime;
      var lead = _firstChunkPending ? 0.03 : 0.06;
      if (_nextAudioPlayTime < now + 0.01) _nextAudioPlayTime = now + lead;
      var startAt = _nextAudioPlayTime;
      _nextAudioPlayTime = startAt + buffer.duration;
      if (_firstChunkPending && _activeCall) { _activeCall.firstAudioAt = Date.now(); }
      _firstChunkPending = false;

      var targetNode = attachAnalyserToMochi(ctx) || ctx.destination;
      source.connect(targetNode);
      source.start(startAt);
      _activeAudioSources.push(source);
      this._setVoiceVisualizerSpeaking(true);
      try {
        var comp = root && root.FiezelMochiCompanion;
        var mochiInst = comp && typeof comp.getInstance === 'function' ? comp.getInstance() : null;
        if (mochiInst && typeof mochiInst.setTalking === 'function') mochiInst.setTalking(true);
      } catch (_) {}
      this._updateMochiMascotPose('greet');

      var self = this;
      source.onended = function () {
        _activeAudioSources = _activeAudioSources.filter(function (s) { return s !== source; });
        if (_activeAudioSources.length === 0) {
          self._setVoiceVisualizerSpeaking(false);
          try {
            var compEnd = root && root.FiezelMochiCompanion;
            var mochiEnd = compEnd && typeof compEnd.getInstance === 'function' ? compEnd.getInstance() : null;
            if (mochiEnd && typeof mochiEnd.setTalking === 'function') mochiEnd.setTalking(false);
          } catch (_) {}
          self._updateMochiMascotPose('idle');
          if (!_modelTurnInProgress && !_awaitingOpeningModelTurn) {
            if (_turnEndFallbackTimer) { clearTimeout(_turnEndFallbackTimer); _turnEndFallbackTimer = null; }
            self._onMochiSpeechEnded();
          }
        }
      };
    },

    _onMochiSpeechEnded: function () {
      if (!_activeCall || !_activeCall.active) return;
      _openingTurnCompletedForQ = true;
      _lastMochiAudioEndedAt = Date.now();
      _lastUserSpeechAt = Date.now();
      this._scheduleSilenceCheck(SILENCE_PROMPT_MS);
    },

    _scheduleSilenceCheck: function (delayMs) {
      if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
      if (!_activeCall || !_activeCall.active || !_ws || _ws.readyState !== 1) return;
      var self = this;
      var wait = typeof delayMs === 'number' ? delayMs : SILENCE_PROMPT_MS;
      _silenceTimer = setTimeout(function () {
        self._checkSilenceAndPrompt();
      }, wait);
    },

    _checkSilenceAndPrompt: function () {
      if (!_activeCall || !_activeCall.active || !_ws || _ws.readyState !== 1) return;
      if (_activeAudioSources.length > 0 || _modelTurnInProgress) {
        this._scheduleSilenceCheck(300);
        return;
      }
      if (_silencePromptFired) return;
      var now = Date.now();
      var elapsed = now - _lastUserSpeechAt;
      if (elapsed < SILENCE_PROMPT_MS - 30) {
        this._scheduleSilenceCheck(Math.max(50, SILENCE_PROMPT_MS - elapsed));
        return;
      }
      _silencePromptFired = true;
      _isSilenceNudgeTurn = true;
      _currentTurnMetered = false;
      _awaitingOpeningModelTurn = true;
      if (_openingModelTurnTimer) clearTimeout(_openingModelTurnTimer);
      _openingModelTurnTimer = setTimeout(function () {
        _awaitingOpeningModelTurn = false;
        _openingModelTurnTimer = null;
      }, 4500);
      var learnerName = getRegisteredLearnerName();
      var fallbackHint = t('mochi-sos.silence-prompt', 'Silakan bicara jika ingin bantuan dari aku');
      var promptText = (getLocale() === 'th')
        ? ('รีบเปิดไมค์พูดออกมาเลยนะ ' + learnerName + '!')
        : ('Segera buka suaramu, ' + learnerName + '!');
      _lastSilencePromptText = promptText;
      if (_activeCall) _activeCall.lastSilencePrompt = promptText;
      try {
        _ws.send(JSON.stringify({
          clientContent: {
            turns: [{
              role: 'user',
              parts: [{
                text: '[SISTEM: Peserta bernama "' + learnerName + '" tidak terdeteksi bersuara selama 2 detik setelah kamu bertanya. Ucapkan persis kalimat ini dengan suara seperti manusia asli yang hangat dan menyemangati: "' + promptText + '" (' + fallbackHint + ')]'
              }]
            }],
            turnComplete: true
          }
        }));
      } catch (_) {}
      _lastUserSpeechAt = Date.now();
    },

    triggerSilencePrompt: function () {
      if (!_lastUserSpeechAt || (Date.now() - _lastUserSpeechAt) < SILENCE_PROMPT_MS) {
        _lastUserSpeechAt = Date.now() - (SILENCE_PROMPT_MS + 50);
      }
      _silencePromptFired = false;
      this._checkSilenceAndPrompt();
    },

    _fallbackSpeechTurn: function (q) {
      var self = this;
      if (!this.isCallActive() || typeof fetch !== 'function') return;
      var activeQ = getActiveQuestion(q) || q;
      var guidance = String(this.buildSocraticGuidance(activeQ) || '').trim();
      if (!guidance) return;

      var loc = getLocale();
      var speaker = loc === 'th' ? 'premwadee' : 'gadis';
      var endpoints = [];
      if (isLocalEnv()) {
        endpoints.push('/api/tts/line');
      }
      var cfgEndpoint = root && root.FIEZEL_TTS_CONFIG && root.FIEZEL_TTS_CONFIG.endpoint;
      if (cfgEndpoint) endpoints.push(cfgEndpoint);
      endpoints.push('https://fiezel-apps.onrender.com/api/tts/line');

      var tryNext = function (idx) {
        if (idx >= endpoints.length || !self.isCallActive()) return;
        var url = endpoints[idx];
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, 5000) : null;
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: guidance, speaker: speaker, lang: loc === 'th' ? 'th' : 'id' }),
          signal: ctrl ? ctrl.signal : undefined
        }).then(function (res) {
          if (timer) clearTimeout(timer);
          if (!res || !res.ok) throw new Error('tts_http_' + (res ? res.status : 0));
          var ct = (res.headers && typeof res.headers.get === 'function' ? res.headers.get('content-type') : '') || '';
          if (ct.indexOf('audio/') !== -1) {
            return res.arrayBuffer();
          }
          if (ct.indexOf('application/json') !== -1) {
            return res.json().then(function (j) {
              var b64 = j && (j.audioBase64 || j.audio_base64 || j.audio || j.data);
              if (!b64 || typeof b64 !== 'string' || b64.length < 32) throw new Error('empty_json_audio');
              var cleanB64 = b64.replace(/^data:audio\/[^;]+;base64,/, '');
              var bin = atob(cleanB64);
              var arr = new Uint8Array(bin.length);
              for (var bi = 0; bi < bin.length; bi++) arr[bi] = bin.charCodeAt(bi);
              return arr.buffer;
            });
          }
          throw new Error('non_audio_ct');
        }).then(function (buf) {
          if (!buf || buf.byteLength < 64 || !self.isCallActive()) return;
          var ctx = getAudioContext();
          if (ctx) {
            return ctx.decodeAudioData(buf.slice(0)).then(function (decoded) {
              if (!self.isCallActive()) return;
              var source = ctx.createBufferSource();
              source.buffer = decoded;
              var targetNode = attachAnalyserToMochi(ctx) || ctx.destination;
              source.connect(targetNode);
              source.start(0);
              _activeAudioSources.push(source);
              setConnectionStatusInternal('connected', '');
              self._setVoiceVisualizerSpeaking(true);
              self._updateMochiMascotPose('greet');
              try {
                var c = root && root.FiezelMochiCompanion;
                var m = c && typeof c.getInstance === 'function' ? c.getInstance() : null;
                if (m && typeof m.setTalking === 'function') m.setTalking(true);
              } catch (_) {}
              self.meterDeliveredAiTurn(activeQ, 'opening');
              source.onended = function () {
                _activeAudioSources = _activeAudioSources.filter(function (s) { return s !== source; });
                if (_activeAudioSources.length === 0) {
                  self._setVoiceVisualizerSpeaking(false);
                  self._updateMochiMascotPose('idle');
                  try {
                    var ce = root && root.FiezelMochiCompanion;
                    var me = ce && typeof ce.getInstance === 'function' ? ce.getInstance() : null;
                    if (me && typeof me.setTalking === 'function') me.setTalking(false);
                  } catch (_) {}
                }
              };
            });
          }
        }).catch(function () {
          if (timer) clearTimeout(timer);
          tryNext(idx + 1);
        });
      };

      tryNext(0);
    },

    closeCall: function (reason) {
      this._stopParallelSpeechRecognition();
      if (_silenceTimer) { clearTimeout(_silenceTimer); _silenceTimer = null; }
      if (_turnEndFallbackTimer) { clearTimeout(_turnEndFallbackTimer); _turnEndFallbackTimer = null; }
      if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
      if (_openingModelTurnTimer) { clearTimeout(_openingModelTurnTimer); _openingModelTurnTimer = null; }
      if (_openingWatchdogTimer) { clearTimeout(_openingWatchdogTimer); _openingWatchdogTimer = null; }
      if (_userSpeakVisualTimer) { clearTimeout(_userSpeakVisualTimer); _userSpeakVisualTimer = null; }
      if (_audioStreamEndTimer) { clearTimeout(_audioStreamEndTimer); _audioStreamEndTimer = null; }
      _userAudioBurstActive = false;
      _userSpeakingNow = false;
      _silencePromptFired = false;
      _lastUserSpeechAt = 0;
      _modelTurnInProgress = false;
      _awaitingOpeningModelTurn = false;
      _currentTurnMetered = false;
      _isSilenceNudgeTurn = false;
      _pendingFollowupBillable = false;
      _pipeWarmToActiveCall = false;
      _sileroVadActive = false;
      if (_sileroVad) {
        var oldVad = _sileroVad;
        _sileroVad = null;
        try { if (typeof oldVad.pause === 'function') oldVad.pause(); } catch (_) {}
        try { if (typeof oldVad.destroy === 'function') oldVad.destroy(); } catch (_) {}
      }

      if (!_activeCall) {
        if (reason === 'session_end' || reason === 'ineligible_domain' || reason === 'user_disabled' || reason === 'shell_gone') {
          removeConnectionBannerInternal();
          _connStatus = { state: 'idle', message: '', updatedAt: 0 };
        }
        return;
      }
      var call = _activeCall;
      _activeCall = null;
      removeConnectionBannerInternal();
      _connStatus = { state: 'idle', message: '', updatedAt: 0 };

      if (reason === 'user_tapped' || reason === 'toggle' || reason === 'user_disabled') {
        try {
          if (typeof root.showToast === 'function') {
            if (!call.turnsDelivered) {
              root.showToast(t('mochi-sos.toast-zero-audio-safe', 'Belum ada suara AI yang diputar — 0 Gem terpakai! 💎'), 'info');
            } else if ((call.gemsSpent || 0) > 0) {
              root.showToast(t('mochi-sos.toast-session-receipt', 'Bantuan Mochi selesai: {turns} respon suara · {gems} Gem terpakai 💎', {
                turns: call.turnsDelivered,
                gems: call.gemsSpent
              }), 'info');
            } else if (call.useDailyFree) {
              root.showToast(t('mochi-sos.toast-session-free-receipt', 'Bantuan Mochi selesai: {turns} respon suara · Kuota Gratis Harian (0 💎)', {
                turns: call.turnsDelivered
              }), 'info');
            }
          }
        } catch (_) {}
      }

      playChime('disconnect');
      this.renderUnderMochiVoiceVisualizer(false);

      var doc = getDoc();
      if (doc) {
        var stage = doc.querySelector('.quiz-stage');
        if (stage) stage.classList.remove('is-teaching');
        var shell = doc.querySelector('.quiz-shell');
        if (shell) shell.classList.remove('is-call-active');
      }
      this.setRestingPawsVisible(true);
      try {
        var comp = root && root.FiezelMochiCompanion;
        var mochiInst = comp && typeof comp.getInstance === 'function' ? comp.getInstance() : null;
        if (mochiInst) {
          if (typeof mochiInst.setAccessory === 'function') mochiInst.setAccessory(null);
          if (typeof mochiInst.setTalking === 'function') mochiInst.setTalking(false);
          if (typeof mochiInst.retractHands === 'function') mochiInst.retractHands();
          if (typeof mochiInst.startEarTwitchLoop === 'function') mochiInst.startEarTwitchLoop(3200);
        }
      } catch (_) {}
      this._updateMochiMascotPose('idle');

      var bubble = getDoc() ? getDoc().getElementById('fzMochiThoughtBubble') : null;
      if (bubble && reason !== 'answered_correct') bubble.classList.remove('is-call-active');

      stopAllActiveAudioSources();
      clearQuizClueHighlights();
      _outTranscript = '';

      if (_micStream) {
        try { _micStream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (_) {}
        _micStream = null;
      }
      if (_micProcessor) {
        try { _micProcessor.onaudioprocess = null; _micProcessor.disconnect(); } catch (_) {}
        _micProcessor = null;
      }
      if (_micSource) {
        try { _micSource.disconnect(); } catch (_) {}
        _micSource = null;
      }
      if (_ws) {
        var ws = _ws;
        _ws = null;
        try { ws.onclose = null; ws.onmessage = null; if (ws.readyState <= 1) ws.close(1000, 'call_closed'); } catch (_) {}
      }
      if (_currentAudio) {
        try { _currentAudio.pause(); } catch (_) {}
        _currentAudio = null;
      }
      syncCompanionStrictMode();
    },

    toggleCall: function (q, opts) {
      if (this.isCallActive()) {
        this.closeCall('user_tapped');
      } else {
        this.startCall(q, opts);
      }
    },

    onQuestionAnswered: function (ok, q) {
      if (!this.isCallActive()) {
        var activeQ = getActiveQuestion(q);
        var doc = getDoc();
        var loc = getLocale();
        if (!ok) {
          // Murid baru saja menjawab salah saat panggilan suara tidak aktif.
          // Mochi bersikap proaktif layaknya tutor sungguhan tanpa memakan kuota token otomatis:
          try { this._updateMochiMascotPose('think'); } catch (_) {}
          var bubble = doc ? doc.getElementById('fzMochiThoughtBubble') : null;
          var hintText = t('mochi-sos.bubble-wrong-hint');
          if (bubble) {
            var txtEl = bubble.querySelector('.fz-thought-text');
            if (txtEl) txtEl.textContent = hintText;
          } else {
            this.mountThoughtBubble(activeQ);
          }
          var mascotEl = doc ? (doc.getElementById('fzMochiMascotVoiceSos') || doc.querySelector('.fz-mochi-avatar') || doc.querySelector('.fz-mochi-viewport')) : null;
          if (mascotEl) {
            mascotEl.classList.remove('fz-mochi-hint-pulse');
            void mascotEl.offsetWidth;
            mascotEl.classList.add('fz-mochi-hint-pulse');
          }
        } else {
          try { this._updateMochiMascotPose('greet'); } catch (_) {}
          var bubble = doc ? doc.getElementById('fzMochiThoughtBubble') : null;
          if (bubble) {
            var txtEl = bubble.querySelector('.fz-thought-text');
            if (txtEl) txtEl.textContent = t('mochi-sos.bubble-correct-praise');
          }
        }
        return;
      }
      _activeCall.answered = true;
      _silencePromptFired = false;
      _lastUserSpeechAt = Date.now();
      var learnerName = getRegisteredLearnerName();
      var activeQ = getActiveQuestion(q);
      var snap = buildQuizContextSnapshot(activeQ, _currentCtx);

      if (ok) {
        this._updateMochiMascotPose('greet');
        var paidOnQ = (_questionGemsMap[getQuestionSig(activeQ)] || 0) > 0;
        if (paidOnQ && !_activeCall.isWelcomePass && !_activeCall.cashbackAwardedForQ) {
          _activeCall.cashbackAwardedForQ = true;
          this.awardCashback();
        }
        sendContextUpdate(
          '[PEMBARUAN: Peserta "' + learnerName + '" baru saja menjawab BENAR pada soal "' + snap.stem + '"!]\n' +
          (snap.rule ? 'Inti Rumus yang baru dikuasai: ' + snap.rule + '\n' : '') +
          (snap.why ? 'Penjelasan di layar: ' + snap.why + '\n' : '') +
          (snap.memory ? 'Jangkar Ingatan: ' + snap.memory + '\n' : '') +
          'TUGAS: Berikan pujian singkat 1 kalimat dengan suara manusia asli yang hangat dan ceria, tegaskan 1 poin inti mengapa jawaban itu tepat sesuai penjelasan di layar, lalu ajak lanjut ke soal berikutnya!'
        );
        // Pujian jawaban benar gratis (0 Gem tambahan)
        _isSilenceNudgeTurn = true;
        _pendingFollowupBillable = false;
      } else {
        this._updateMochiMascotPose('greet');
        _pendingFollowupBillable = true;
        sendContextUpdate(
          '[PEMBARUAN: Respons peserta "' + learnerName + '" belum tepat pada soal "' + snap.stem + '".]\n' +
          (snap.rule ? 'Rumus/Pola Tata Bahasa di layar: ' + snap.rule + '\n' : '') +
          (snap.why ? 'Alasan Ilmiah di layar: ' + snap.why + '\n' : '') +
          (snap.distractor ? 'Jebakan Pengecoh: ' + snap.distractor + '\n' : '') +
          'TUGAS: Berikan semangat singkat yang hangat dan jelaskan secara Sokratik alasan struktur itu belum pas sesuai penjelasan di layar tanpa langsung membocorkan kata kunci jawaban bila murid masih mencoba ulang!'
        );
      }
    },

    speakMochiTurn: function (text, onComplete) {
      if (!this.isCallActive() || !_ws || _ws.readyState !== 1) {
        if (typeof onComplete === 'function') onComplete();
        return;
      }
      try {
        _ws.send(JSON.stringify({
          clientContent: {
            turns: [{
              role: 'user',
              parts: [{
                text: '[SISTEM: Katakan pesan ini sebagai Mochi secara singkat dan ramah: "' + String(text || '').replace(/"/g, '\\"') + '"]'
              }]
            }],
            turnComplete: true
          }
        }));
      } catch (_) {}
      if (typeof onComplete === 'function') onComplete();
    },

    _setVoiceVisualizerSpeaking: function (isSpeaking) {
      var doc = getDoc();
      if (!doc) return;
      var el = doc.getElementById('fzMochiVoiceUnder');
      if (el) {
        if (isSpeaking) {
          el.classList.add('is-speaking');
          if (!_userSpeakingNow) {
            el.classList.remove('is-user-speaking');
          }
        } else {
          el.classList.remove('is-speaking');
        }
      }
    },

    _setVoiceVisualizerUserSpeaking: function (isUserSpeaking) {
      var doc = getDoc();
      if (!doc) return;
      var el = doc.getElementById('fzMochiVoiceUnder');
      if (isUserSpeaking) {
        _userSpeakingNow = true;
        if (el) {
          el.classList.add('is-user-speaking');
        }
        if (_userSpeakVisualTimer) clearTimeout(_userSpeakVisualTimer);
        _userSpeakVisualTimer = setTimeout(function () {
          _userSpeakVisualTimer = null;
          _userSpeakingNow = false;
          var curEl = getDoc() ? getDoc().getElementById('fzMochiVoiceUnder') : null;
          if (curEl) curEl.classList.remove('is-user-speaking');
        }, 450);
      } else {
        _userSpeakingNow = false;
        if (_userSpeakVisualTimer) { clearTimeout(_userSpeakVisualTimer); _userSpeakVisualTimer = null; }
        if (el) el.classList.remove('is-user-speaking');
      }
    },

    // Strict 2-motion rule in Mochi SOS: ONLY open-eyes Idle ('dots' + retractHands) or open-eyes Greeting ('dots' + wave)
    _updateMochiMascotPose: function (pose) {
      var isGreet = (pose === 'greet' || pose === 'happy' || pose === 'speaking' || pose === 'wave');
      try {
        var comp = root && root.FiezelMochiCompanion;
        var mochi = comp && typeof comp.getInstance === 'function' ? comp.getInstance() : null;
        if (mochi) {
          if (typeof mochi.setVoiceCompanionStrictMode === 'function') mochi.setVoiceCompanionStrictMode(true);
          if (typeof mochi.setMood === 'function') mochi.setMood('dots');
          if (isGreet) {
            if (typeof mochi.triggerHandGesture === 'function') mochi.triggerHandGesture('wave', 2.4);
          } else {
            if (typeof mochi.retractHands === 'function') mochi.retractHands();
          }
        }
      } catch (_) {}
      try {
        if (typeof root.pawStagePose === 'function') {
          root.pawStagePose('.quiz-stage fiezel-mascot, .fz-paw-above fiezel-mascot, .quiz-shell fiezel-mascot', isGreet ? 'happy' : 'idle');
        }
      } catch (_) {}
    },

    // UI Mount: Small Corner Toggle Button on Practice Cards (#fzMochiCardToggle)
    _syncCardToggleUi: function (btn, isOn) {
      if (!btn) return;
      var titleText = isOn
        ? t('mochi-sos.toggle-on-title', 'Nonaktifkan bantuan suara Mochi')
        : t('mochi-sos.toggle-off-title', 'Aktifkan bantuan suara Mochi');
      var labelText = t('mochi-sos.toggle-label', 'Bantuan Mochi');
      var stateText = 'OFF';
      if (isOn) {
        if (_sessionGemsSpent > 0) {
          stateText = 'ON · -' + _sessionGemsSpent + '💎';
        } else if (_sessionFreeQuestions > 0) {
          stateText = 'ON · ' + t('mochi-sos.badge-free', 'Gratis');
        } else {
          stateText = 'ON';
        }
      }
      var stateSig = (isOn ? '1:' : '0:') + stateText + ':' + titleText;
      if (btn.getAttribute('data-mochi-sig') === stateSig) return;
      btn.setAttribute('data-mochi-sig', stateSig);
      btn.className = 'fz-mochi-card-toggle ' + (isOn ? 'is-on' : 'is-off');
      btn.setAttribute('role', 'switch');
      btn.setAttribute('aria-checked', isOn ? 'true' : 'false');
      btn.setAttribute('aria-label', titleText);
      btn.setAttribute('title', titleText);
      btn.innerHTML = [
        '<span class="fz-mct-label">' + labelText + '</span>',
        '<span class="fz-mct-switch" aria-hidden="true">',
        '  <span class="fz-mct-state">' + stateText + '</span>',
        '  <span class="fz-mct-knob"></span>',
        '</span>'
      ].join('');
    },

    mountCardToggle: function (q) {
      var doc = getDoc();
      if (!doc) return null;
      var activeQ = getActiveQuestion(q);
      if (isExamLocked() || !isMochiSosEligible(activeQ, _currentCtx)) {
        this.removeCardToggle();
        return null;
      }

      var card = doc.querySelector('.quiz-shell > .card:not(.card-reading):not(.card-flashcard)') ||
                 doc.querySelector('.quiz-shell .card:not(.card-reading):not(.card-flashcard)') ||
                 doc.querySelector('.writing-page .card.writing-prompt, .writing-stage .card, .writing-stage') ||
                 doc.querySelector('#fzStoryContainer .card, #fzStoryContainer') ||
                 doc.querySelector('.grammar-lesson-page .card, .grammar-lesson-page');
      if (!card) return null;

      try {
        var pos = (root.getComputedStyle ? root.getComputedStyle(card).position : card.style.position) || '';
        if (!pos || pos === 'static') card.style.position = 'relative';
      } catch (_) {
        if (!card.style.position) card.style.position = 'relative';
      }

      var isOn = isMochiEnabledFromStorage();
      var existing = doc.getElementById('fzMochiCardToggle');
      if (existing) {
        if (card.contains(existing)) {
          this._syncCardToggleUi(existing, isOn);
          return existing;
        }
        existing.remove();
      }

      var self = this;
      var btn = doc.createElement('div');
      btn.id = 'fzMochiCardToggle';
      btn.tabIndex = 0;
      this._syncCardToggleUi(btn, isOn);
      var handleToggle = function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        hapticTap(10);
        var currentlyOn = isMochiEnabledFromStorage();
        if (!currentlyOn) {
          self.showConfirmationModal(activeQ);
        } else {
          self.setMochiEnabled(false);
        }
      };
      btn.onclick = handleToggle;
      btn.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          handleToggle(e);
        }
      };
      card.appendChild(btn);
      return btn;
    },

    removeCardToggle: function () {
      var doc = getDoc();
      if (!doc) return;
      var existing = doc.getElementById('fzMochiCardToggle');
      if (existing) existing.remove();
    },

    // UI Mount: Resting paws removed per user instruction
    mountRestingPaws: function () {
      this.removeRestingPaws();
      return null;
    },

    setRestingPawsVisible: function (_visible) {
      this.removeRestingPaws();
    },

    removeRestingPaws: function () {
      var doc = getDoc();
      if (!doc) return;
      var existing = doc.getElementById('fzMochiRestingPaws');
      if (existing) existing.remove();
    },

    // UI Mount: Comic Thought Bubble ("Ketuk aku" matikan sepenuhnya per instruksi owner)
    mountThoughtBubble: function () {
      this.removeThoughtBubble();
      return null;
    },

    removeThoughtBubble: function () {
      var doc = getDoc();
      if (!doc) return;
      var existing = doc.getElementById('fzMochiThoughtBubble');
      if (existing) existing.remove();
      var allBubbles = doc.querySelectorAll('.fz-mochi-thought-bubble');
      for (var i = 0; i < allBubbles.length; i++) allBubbles[i].remove();
    },

    // UI Mount: Compact Centered Under-Mochi Soundwave Visualizer (Pill + Radiating Acoustic Arcs)
    renderUnderMochiVoiceVisualizer: function (visible) {
      var doc = getDoc();
      if (!doc) return;

      var existing = doc.getElementById('fzMochiVoiceUnder');
      if (!visible) {
        if (existing) existing.remove();
        return;
      }

      var slot = findMascotHost();
      if (!slot) return;

      if (existing) {
        if (slot.contains(existing)) {
          if (_activeAudioSources.length > 0) {
            existing.classList.add('is-speaking');
            existing.classList.remove('is-user-speaking');
          } else {
            existing.classList.remove('is-speaking');
            if (_userSpeakingNow) existing.classList.add('is-user-speaking');
            else existing.classList.remove('is-user-speaking');
          }
          return;
        }
        existing.remove();
      }

      slot.style.position = 'relative';
      slot.style.overflow = 'visible';

      var wave = doc.createElement('div');
      wave.id = 'fzMochiVoiceUnder';
      wave.className = 'fz-mochi-voice-under' + (_activeAudioSources.length > 0 ? ' is-speaking' : (_userSpeakingNow ? ' is-user-speaking' : ''));
      wave.setAttribute('aria-label', t('mochi-sos.call-title', 'Bantuan Suara Mochi'));
      wave.setAttribute('title', t('mochi-sos.call-close-title', 'Ketuk untuk tutup panggilan'));

      wave.innerHTML = [
        '<svg class="fz-sw-arc fz-sw-arc-l" viewBox="0 0 14 20" fill="none" aria-hidden="true">',
        '  <path class="sw-wave-out" d="M6.2 2.2C2.2 6.0 2.2 14.0 6.2 17.8" stroke="currentColor" stroke-width="2.0" stroke-linecap="round"/>',
        '  <path class="sw-wave-in" d="M10.8 5.0C8.0 7.4 8.0 12.6 10.8 15.0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
        '</svg>',
        '<span class="fz-sw-pill" aria-hidden="true">',
        '  <span class="sw-bar b-1"></span>',
        '  <span class="sw-bar b-2"></span>',
        '  <span class="sw-bar b-3"></span>',
        '  <span class="sw-bar b-4"></span>',
        '  <span class="sw-bar b-5"></span>',
        '  <span class="sw-bar b-6"></span>',
        '  <span class="sw-bar b-7"></span>',
        '</span>',
        '<svg class="fz-sw-arc fz-sw-arc-r" viewBox="0 0 14 20" fill="none" aria-hidden="true">',
        '  <path class="sw-wave-in" d="M3.2 5.0C6.0 7.4 6.0 12.6 3.2 15.0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
        '  <path class="sw-wave-out" d="M7.8 2.2C11.8 6.0 11.8 14.0 7.8 17.8" stroke="currentColor" stroke-width="2.0" stroke-linecap="round"/>',
        '</svg>'
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
      // Jangan tampilkan popup intro yang menghalangi layar saat panggilan live sudah aktif atau di domain non-SOS
      if (this.isCallActive() || !isMochiEnabledFromStorage() || !isMochiSosEligible(getActiveQuestion(null), _currentCtx)) return;
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
    },

    __debugPrompt: function () {
      return isLocalEnv() ? buildMochiSystemPrompt(getActiveQuestion(null), getLocale(), _currentCtx) : '';
    },

    __injectWsForTest: function (ws) {
      if (isLocalEnv()) {
        _ws = ws;
        _activeCall = _activeCall || { active: true, startedAt: Date.now(), question: getActiveQuestion(null) };
      }
    }
  };

  // HANYA mendeteksi permukaan latihan non-quizLoop yang membutuhkan penjelasan konseptual:
  // Writing Studio (.writing-page / .writing-stage) dan Graded Story Reading (#fzStoryContainer).
  // Vocabulary/Flashcard, Listening/Chokai, Kana/Hiragana/Katakana/Kanji TIDAK memunculkan Mochi SOS.
  function extractDomPracticeSurface(doc) {
    if (!doc) return null;
    // 1. Writing Studio (.writing-page / .writing-stage)
    var writingRoot = doc.querySelector('.writing-page, .writing-stage');
    if (writingRoot) {
      var wPrompt = writingRoot.querySelector('.writing-prompt h2, .writing-prompt h3, .writing-prompt p, h2, h3, .writing-prompt');
      var wHintEl = writingRoot.querySelector('.writing-hint, .hint, .coach-tip');
      var wBox = doc.getElementById('writingBox') || writingRoot.querySelector('textarea');
      var wStr = wPrompt ? wPrompt.textContent.replace(/\s+/g, ' ').trim() : 'Writing Studio';
      return {
        type: 'writing',
        q: {
          id: 'writing-' + clip(wStr, 40),
          type: 'writing',
          stem: wStr,
          writingHint: wHintEl ? wHintEl.textContent.replace(/\s+/g, ' ').trim() : '',
          writingDraft: wBox && wBox.value ? String(wBox.value).trim() : ''
        }
      };
    }
    // 2. Graded Story Reader (#fzStoryContainer)
    var storyBox = doc.getElementById('fzStoryContainer');
    if (storyBox && storyBox.children.length > 0) {
      var sTitle = storyBox.querySelector('h1, h2, h3');
      var sParas = storyBox.querySelectorAll('p, .story-line, .story-sentence');
      var pArr = [];
      for (var si = 0; si < Math.min(4, sParas.length); si++) {
        pArr.push(sParas[si].textContent.replace(/\s+/g, ' ').trim());
      }
      var sStr = sTitle ? sTitle.textContent.trim() : 'Graded Story Reader';
      return {
        type: 'reading',
        q: {
          id: 'story-' + clip(sStr, 40),
          type: 'reading',
          stem: sStr,
          passage: pArr.join(' ')
        }
      };
    }
    // 3. Grammar Lesson Intro Card (.grammar-lesson-page)
    var grammarLesson = doc.querySelector('.grammar-lesson-page');
    if (grammarLesson) {
      var gTitleEl = grammarLesson.querySelector('.grammar-lesson-title, h1, h2, h3');
      var gSummaryEl = grammarLesson.querySelector('.grammar-lesson-summary, p');
      var gFormulaEl = grammarLesson.querySelector('.grammar-formula-text, .grammar-lesson-formula');
      var gExampleEl = grammarLesson.querySelector('.grammar-example-jp, .grammar-lesson-example');
      var gTitle = gTitleEl ? gTitleEl.textContent.replace(/\s+/g, ' ').trim() : 'Tata Bahasa';
      var gRule = gFormulaEl ? gFormulaEl.textContent.replace(/\s+/g, ' ').trim() : '';
      var gWhy = gSummaryEl ? gSummaryEl.textContent.replace(/\s+/g, ' ').trim() : '';
      var gEx = gExampleEl ? gExampleEl.textContent.replace(/\s+/g, ' ').trim() : '';
      return {
        type: 'grammar',
        q: {
          id: 'grammar-lesson-' + clip(gTitle, 40),
          type: 'grammar',
          stem: gTitle + (gEx ? ' — Contoh: ' + gEx : ''),
          explain: {
            rule: gRule,
            why: gWhy
          }
        }
      };
    }
    return null;
  }

  // Safe auto-mounting & self-healing observer for quiz & practice lifecycle
  function checkAndAutoMount() {
    var doc = getDoc();
    if (!doc) return;
    var quizShell = doc.querySelector('.quiz-shell');
    var domSurface = quizShell ? null : extractDomPracticeSurface(doc);

    if (!quizShell && !domSurface) {
      if (_session.active && !_shellGoneTimer) {
        _shellGoneTimer = setTimeout(function () {
          _shellGoneTimer = null;
          var d = getDoc();
          if (d && !d.querySelector('.quiz-shell') && !extractDomPracticeSurface(d)) {
            if (_session.active) apiInstance.onQuizSessionEnd('shell_gone');
          }
        }, 400);
      }
      return;
    }

    if (_shellGoneTimer) {
      clearTimeout(_shellGoneTimer);
      _shellGoneTimer = null;
    }

    if (isExamLocked()) {
      apiInstance.removeThoughtBubble();
      apiInstance.removeCardToggle();
      return;
    }

    // Jika berada di permukaan latihan non-quizLoop yang sah (Writing Studio atau Story Reading)
    if (!quizShell && domSurface) {
      if (!isMochiSosEligible(domSurface.q, { cfgType: domSurface.type })) {
        apiInstance.removeThoughtBubble();
        apiInstance.removeCardToggle();
        return;
      }
      if (!_session.active) {
        apiInstance.onQuizSessionStart({ type: domSurface.type });
      }
      apiInstance.setActiveQuestion(domSurface.q, { cfgType: domSurface.type });
      apiInstance.mountCardToggle(domSurface.q);
      if (!isMochiEnabledFromStorage()) {
        apiInstance.removeThoughtBubble();
        if (apiInstance.isCallActive()) apiInstance.closeCall('user_disabled');
        return;
      }
      apiInstance.mountThoughtBubble(domSurface.q);
      if (!_session.greeted || !apiInstance.isCallActive()) {
        apiInstance.greetOnEntry(domSurface.q, { cfgType: domSurface.type });
      }
      return;
    }

    if (!_session.active) {
      apiInstance.onQuizSessionStart({ type: 'grammar' });
    }
    var activeQ = getActiveQuestion(null);
    if (!isMochiSosEligible(activeQ, _currentCtx)) {
      apiInstance.removeThoughtBubble();
      apiInstance.removeCardToggle();
      if (apiInstance.isCallActive()) apiInstance.closeCall('ineligible_domain');
      return;
    }
    apiInstance.mountCardToggle(activeQ);
    if (!isMochiEnabledFromStorage()) {
      apiInstance.removeThoughtBubble();
      apiInstance.removeRestingPaws();
      apiInstance.renderUnderMochiVoiceVisualizer(false);
      var stage = doc.querySelector('.quiz-stage');
      if (stage) stage.classList.remove('is-teaching');
      try {
        var comp = root && root.FiezelMochiCompanion;
        var mochiInst = comp && typeof comp.getInstance === 'function' ? comp.getInstance() : null;
        if (mochiInst) {
          if (typeof mochiInst.setAccessory === 'function') mochiInst.setAccessory(null);
          if (typeof mochiInst.setTalking === 'function') mochiInst.setTalking(false);
          if (typeof mochiInst.retractHands === 'function') mochiInst.retractHands();
          if (typeof mochiInst.startEarTwitchLoop === 'function') mochiInst.startEarTwitchLoop(3200);
        }
      } catch (_) {}
      if (apiInstance.isCallActive()) apiInstance.closeCall('user_disabled');
      return;
    }
    apiInstance.removeRestingPaws();
    apiInstance.removeThoughtBubble();
    if (apiInstance.isCallActive()) {
      apiInstance.renderUnderMochiVoiceVisualizer(true);
    }
    apiInstance.bindMascotTap();
  }

  if (typeof document !== 'undefined') {
    armAudioWarmup();

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('offline', function () {
        if (apiInstance.isCallActive() || isSosSurfaceActiveInternal()) {
          setConnectionStatusInternal('offline', t('mochi-sos.conn-offline', 'Koneksi internet terputus — Mochi menunggu jaringan kembali aktif'));
        }
      });
      window.addEventListener('online', function () {
        if (_connStatus.state === 'offline') {
          if (apiInstance.isCallActive()) {
            setConnectionStatusInternal('reconnecting', t('mochi-sos.conn-reconnecting', 'Koneksi suara terputus — menyambungkan ulang...'));
            _reconnectAttempts = 0;
            apiInstance._startGeminiLiveDuplex(getActiveQuestion(null));
          } else {
            removeConnectionBannerInternal();
            _connStatus = { state: 'idle', message: '', updatedAt: 0 };
          }
        }
      });
    }

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
        var _autoMountTimer = null;
        var isOwnMochiNode = function (node) {
          var cur = node && node.nodeType === 1 ? node : (node && node.parentElement ? node.parentElement : null);
          while (cur) {
            var cid = cur.id || '';
            if (cid === 'fzMochiCardToggle' || cid === 'fzMochiThoughtBubble' || cid === 'fzMochiVoiceUnder' || cid === 'fzMochiUnderVisualizer' || cid === 'fzMochiSosIntroModal' || cid === 'fzMochiSosIntroScrim' || cid === 'fzMochiConnBanner') {
              return true;
            }
            cur = cur.parentElement;
          }
          return false;
        };
        var autoObs = new MutationObserver(function (mutations) {
          var relevant = false;
          for (var mi = 0; mi < mutations.length; mi++) {
            var mut = mutations[mi];
            if (isOwnMochiNode(mut.target)) continue;
            var allOwn = true;
            var added = mut.addedNodes || [];
            var removed = mut.removedNodes || [];
            if (added.length === 0 && removed.length === 0) {
              relevant = true;
              break;
            }
            for (var ai = 0; ai < added.length; ai++) {
              if (!isOwnMochiNode(added[ai])) { allOwn = false; break; }
            }
            if (allOwn) {
              for (var ri = 0; ri < removed.length; ri++) {
                if (!isOwnMochiNode(removed[ri])) { allOwn = false; break; }
              }
            }
            if (!allOwn) {
              relevant = true;
              break;
            }
          }
          if (!relevant || _autoMountTimer) return;
          _autoMountTimer = setTimeout(function () {
            _autoMountTimer = null;
            checkAndAutoMount();
          }, 24);
        });
        autoObs.observe(appEl, { childList: true, subtree: true });
      }
    } catch (_) {}
  }

  return apiInstance;
});
