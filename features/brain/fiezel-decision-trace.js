/**
 * FIEZEL Decision Trace — catatan terstruktur "apa yang DILIHAT Braincore, dan apa yang
 * DIPUTUSKANNYA" (Fase 2 / Phase B).
 *
 * APA INI, DAN APA YANG BUKAN
 * ---------------------------
 * INI: alat diagnosis INTERNAL. Satu baris trace menjawab pertanyaan yang selama ini hanya
 * bisa dijawab dengan membaca ulang app.js: "waktu murid menjawab soal itu, Braincore tahu
 * apa, dan kenapa ia memilih tindakan berikutnya?"
 *
 * BUKAN: telemetri. Trace TIDAK PERNAH boleh dikirim ke server apa adanya. Lane telemetri
 * belajar punya kontraknya sendiri (BRAIN-TELEMETRY-SCHEMA.md) dengan enum tertutup dan
 * ember-ember kasar; trace ini sengaja LEBIH KAYA daripada itu, karena ia untuk manusia yang
 * sedang men-debug, bukan untuk basis data. Membiarkan keduanya tertukar adalah cara paling
 * mudah membocorkan sesuatu yang tidak pernah diniatkan keluar. Karena itu batas ini
 * DITEGAKKAN, bukan cuma ditulis: lihat `assertNotTelemetry` di bawah dan gerbang
 * decision-trace-test.js.
 *
 * KENAPA IA ADA
 * -------------
 * Audit Fase 1 menemukan dua hal yang sama akarnya. Pertama, manifest bisa basi berbulan-bulan
 * tanpa ada yang tahu, karena tidak ada catatan mesin tentang siapa memutuskan apa. Kedua —
 * dan ini lebih mahal — pengikat `say` hilang dari AudioService dan SELURUH tangga suara
 * neural mati DIAM-DIAM; tidak ada galat, tidak ada catatan, hanya kualitas yang turun. Kelas
 * cacat itu (jalur yang berhenti bekerja tanpa bersuara) tidak bisa dilihat oleh gerbang yang
 * membaca teks sumber. Ia hanya terlihat kalau keputusan yang SESUNGGUHNYA diambil bisa
 * dibaca ulang.
 *
 * BATAS YANG DIJAGA (sama dengan seluruh features/brain/)
 * ------------------------------------------------------
 * Modul MURNI: tanpa DOM, tanpa jaringan, tanpa storage, tanpa Math.random, tanpa jam.
 * Waktu SELALU disuntikkan pemanggil. Dua panggilan dengan masukan identik menghasilkan trace
 * identik — kalau tidak, trace tidak bisa dipakai membandingkan dua rilis.
 *
 * PRINSIP ISI: SEMINIMAL MUNGKIN, TETAPI CUKUP UNTUK MENJELASKAN SATU KEPUTUSAN.
 * Setiap field di bawah ada karena satu pertanyaan debug yang nyata. Field yang tidak menjawab
 * pertanyaan apa pun TIDAK ditambahkan — trace yang gemuk berhenti dibaca orang, dan trace
 * yang tidak dibaca sama tidak bergunanya dengan trace yang tidak ada.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelDecisionTrace = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-decision-trace-v1';

  /* Field identitas yang DILARANG KERAS muncul di trace, pada kedalaman berapa pun.
   * Daftar ini bukan hiasan: ia ditegakkan `assertNotTelemetry` dan gerbangnya. Trace hidup
   * di memori/panel diagnostik, dan satu-satunya cara memastikan ia tidak berubah menjadi
   * jalur kebocoran adalah membuat field identitas MUSTAHIL ditulis ke dalamnya. */
  var FORBIDDEN_KEYS = Object.freeze([
    'userId', 'user_id', 'uuid', 'ownerUuid', 'installId', 'install_id', 'deviceId',
    'device_id', 'email', 'name', 'userName', 'learnerName', 'ip', 'ipAddress',
    'token', 'sessionToken', 'cookie', 'answerText', 'typedAnswer', 'rawAnswer', 'script'
  ]);

  /** Keputusan yang boleh dicatat. Enum TERTUTUP: nilai asing ditolak, bukan dibiarkan lewat
   *  sebagai teks bebas. Kosakata ini mengikuti keputusan yang BENAR-BENAR ada di
   *  fiezel-tutor-brain.js (decideMove/escalate) dan jalur app.js, bukan karangan baru. */
  var DECISIONS = Object.freeze([
    'continue',        // lanjut ke soal berikutnya
    'hint',            // naikkan scaffold satu anak tangga
    'reteach',         // ajar ulang konsepnya
    'advance',         // naikkan tingkat/konsep
    'review',          // jadwalkan/ajukan ulangan
    'stop',            // hentikan sesi (mis. MISS_STREAK_STOP)
    'unknown'          // pemanggil tidak tahu — JUJUR, bukan ditebak jadi 'continue'
  ]);

  function num(v, fallback) { var n = Number(v); return isFinite(n) ? n : (fallback === undefined ? null : fallback); }
  function str(v) { return v == null ? '' : String(v); }
  function clamp01(v) { var n = Number(v); return isFinite(n) ? Math.max(0, Math.min(1, n)) : null; }
  function round3(v) { var n = Number(v); return isFinite(n) ? Math.round(n * 1000) / 1000 : null; }

  function deepFreeze(obj) {
    if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
      Object.freeze(obj);
      var keys = Object.getOwnPropertyNames(obj);
      for (var i = 0; i < keys.length; i++) deepFreeze(obj[keys[i]]);
    }
    return obj;
  }

  /**
   * Pagar privasi, dijalankan pada SETIAP trace yang dibangun. Ia menolak — melempar — alih-alih
   * membersihkan diam-diam: pemanggil yang menyodorkan identitas ke dalam trace sedang melakukan
   * kesalahan yang harus ia lihat, bukan kesalahan yang boleh ditelan modul.
   */
  function assertNotTelemetry(obj, path) {
    if (!obj || typeof obj !== 'object') return;
    var keys = Object.getOwnPropertyNames(obj);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      for (var j = 0; j < FORBIDDEN_KEYS.length; j++) {
        if (k === FORBIDDEN_KEYS[j]) {
          throw new Error(SCHEMA + ': field identitas terlarang "' + k + '" di ' + (path || '<root>') +
            ' — Decision Trace adalah diagnosis internal, bukan telemetri.');
        }
      }
      if (obj[k] && typeof obj[k] === 'object') assertNotTelemetry(obj[k], (path ? path + '.' : '') + k);
    }
  }

  /** Kode alasan: HANYA kosakata brain3_* yang sudah ada. Kode baru harus lahir di modul yang
   *  memutuskan, bukan di sini — trace mencatat alasan, ia tidak menciptakannya. */
  function normalizeReasonCodes(list) {
    var out = [];
    var seen = {};
    var arr = Array.isArray(list) ? list : (list == null ? [] : [list]);
    for (var i = 0; i < arr.length; i++) {
      var code = str(arr[i]).trim();
      if (!code) continue;
      if (!/^brain3_[a-z0-9_]+$/.test(code)) {
        throw new Error(SCHEMA + ': kode alasan "' + code + '" tidak mengikuti kosakata brain3_*');
      }
      if (seen[code]) continue;
      seen[code] = true;
      out.push(code);
    }
    return out;
  }

  /** Potret mastery SEBELUM/SESUDAH. Bentuknya mengikuti FiezelMasteryBKT.mastery(): {L,n}. */
  function masterySnapshot(m) {
    if (!m || typeof m !== 'object') return null;
    var L = clamp01(m.L);
    if (L === null) return null;
    return { L: round3(L), n: Math.max(0, Math.floor(num(m.n, 0) || 0)) };
  }

  /** Potret ingatan. Mengikuti sidecar yang benar-benar ditulis scheduleNext(): stabilityDays
   *  + retrievability. Tidak ada nextReview di sini — itu jam dinding, dan trace bebas jam. */
  function memorySnapshot(m) {
    if (!m || typeof m !== 'object') return null;
    var stability = num(m.stabilityDays, null);
    var retr = clamp01(m.retrievability);
    if (stability === null && retr === null) return null;
    return {
      stabilityDays: stability === null ? null : round3(stability),
      retrievability: retr === null ? null : round3(retr)
    };
  }

  /**
   * Bangun satu trace. Melempar pada masukan yang tidak bisa dievaluasi — trace setengah terisi
   * bukan data yang buruk, ia data yang MENYESATKAN, karena ia terlihat seperti bukti.
   *
   * @param {object} input
   * @param {string} input.braincoreVersion  bundleVersion dari FiezelBrainManifest (mis. '3.0.0')
   * @param {string|number} input.sessionId  kunci sesi (app.js memakai activeSession.startedAt)
   * @param {number} input.learnerStateVersion  state.stateRevision — naik tiap flush
   * @param {string} input.conceptId         konsep/skill yang sedang diuji
   * @param {object} input.evidence          {correct, kappa, timing, predicted}
   * @param {object} [input.masteryBefore]   {L,n}
   * @param {object} [input.masteryAfter]    {L,n}
   * @param {object} [input.memoryBefore]    {stabilityDays, retrievability}
   * @param {object} [input.memoryAfter]     {stabilityDays, retrievability}
   * @param {object} [input.misconceptionState] {activeCount, topCode}
   * @param {object} [input.difficultyState] {prior, effective, target}
   * @param {string} input.decision          salah satu DECISIONS
   * @param {string[]} input.reasonCodes     kode brain3_*
   * @param {number} input.confidence        0..1
   */
  function build(input) {
    var src = input && typeof input === 'object' ? input : {};
    assertNotTelemetry(src);

    var decision = str(src.decision).trim() || 'unknown';
    if (DECISIONS.indexOf(decision) === -1) {
      throw new Error(SCHEMA + ': keputusan "' + decision + '" di luar enum tertutup');
    }

    var ev = src.evidence && typeof src.evidence === 'object' ? src.evidence : {};
    var evidence = {
      correct: ev.correct === true ? true : (ev.correct === false ? false : null),
      // kappa: bobot kredibilitas dari FiezelEvidenceCredibility. null = modul absen, BUKAN 0 —
      // 0 berarti "bukti dibuang", dan itu keputusan yang berbeda dari "tidak diukur".
      kappa: clamp01(ev.kappa) === null ? null : round3(clamp01(ev.kappa)),
      timing: str(ev.timing) || null,
      predicted: clamp01(ev.predicted) === null ? null : round3(clamp01(ev.predicted))
    };

    var mis = src.misconceptionState && typeof src.misconceptionState === 'object' ? src.misconceptionState : null;
    var diff = src.difficultyState && typeof src.difficultyState === 'object' ? src.difficultyState : null;

    var trace = {
      schema: SCHEMA,
      braincoreVersion: str(src.braincoreVersion) || null,
      sessionId: src.sessionId == null ? null : str(src.sessionId),
      learnerStateVersion: src.learnerStateVersion == null ? null : Math.max(0, Math.floor(num(src.learnerStateVersion, 0) || 0)),
      conceptId: str(src.conceptId) || null,
      evidence: evidence,
      masteryBefore: masterySnapshot(src.masteryBefore),
      masteryAfter: masterySnapshot(src.masteryAfter),
      memoryBefore: memorySnapshot(src.memoryBefore),
      memoryAfter: memorySnapshot(src.memoryAfter),
      misconceptionState: mis ? {
        activeCount: Math.max(0, Math.floor(num(mis.activeCount, 0) || 0)),
        topCode: str(mis.topCode) || null
      } : null,
      difficultyState: diff ? {
        prior: num(diff.prior, null) === null ? null : round3(num(diff.prior)),
        effective: num(diff.effective, null) === null ? null : round3(num(diff.effective)),
        target: clamp01(diff.target) === null ? null : round3(clamp01(diff.target))
      } : null,
      decision: decision,
      reasonCodes: normalizeReasonCodes(src.reasonCodes),
      confidence: clamp01(src.confidence) === null ? null : round3(clamp01(src.confidence))
    };

    return deepFreeze(trace);
  }

  /**
   * Apakah keputusan ini benar-benar BERGERAK karena bukti? Dipakai gerbang Fase C/E: sebuah
   * trace yang mastery/ingatan/keputusannya identik sebelum-sesudah adalah trace yang
   * membuktikan Braincore TIDAK bereaksi — dan itu temuan, bukan kegagalan alat.
   */
  function movedState(trace) {
    if (!trace || typeof trace !== 'object') return false;
    var mb = trace.masteryBefore, ma = trace.masteryAfter;
    if (mb && ma && (mb.L !== ma.L || mb.n !== ma.n)) return true;
    var kb = trace.memoryBefore, ka = trace.memoryAfter;
    if (kb && ka && (kb.stabilityDays !== ka.stabilityDays || kb.retrievability !== ka.retrievability)) return true;
    return false;
  }

  /** Ringkasan satu baris untuk panel diagnostik/log. Sengaja tanpa apa pun yang bisa
   *  mengidentifikasi murid. */
  function summarize(trace) {
    if (!trace || typeof trace !== 'object') return '';
    var parts = [
      'brain=' + (trace.braincoreVersion || '?'),
      'concept=' + (trace.conceptId || '?'),
      'ok=' + (trace.evidence && trace.evidence.correct === null ? '?' : String(trace.evidence.correct)),
      'kappa=' + (trace.evidence && trace.evidence.kappa === null ? '?' : String(trace.evidence.kappa)),
      'decision=' + trace.decision,
      'moved=' + (movedState(trace) ? 'yes' : 'no')
    ];
    if (trace.reasonCodes && trace.reasonCodes.length) parts.push('why=' + trace.reasonCodes.join(','));
    return parts.join(' ');
  }

  return deepFreeze({
    SCHEMA: SCHEMA,
    DECISIONS: DECISIONS,
    FORBIDDEN_KEYS: FORBIDDEN_KEYS,
    build: build,
    movedState: movedState,
    summarize: summarize
  });
});
