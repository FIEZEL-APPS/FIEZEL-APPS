/**
 * FIEZEL R3 — Unified Skills Evidence (5.20)
 *
 * Memproyeksikan bukti agregat Speaking/Listening dari `fiezel-sl-v1-state` ke Learner
 * Evidence, sehingga peta skill R2 tidak lagi kehilangan dua skill yang sebenarnya sudah
 * dilatih murid.
 *
 * Sama seperti modul R2, ini PURE dan DETERMINISTIC: tidak ada Date.now(), tidak ada
 * random, tidak ada DOM. Pembacaan storage dipisah ke satu fungsi tersendiri supaya sisanya
 * bisa diuji tanpa lingkungan browser.
 *
 * Batas yang dijaga di sini, semuanya dari roadmap R3:
 * - Agregat saja. Raw audio, transcript, dan dictation tidak pernah keluar dari sidecar.
 * - Coverage target BUKAN skor, dan skor latihan BUKAN skor pengucapan. Keduanya dipisah
 *   namanya supaya tidak tertukar di dashboard.
 * - Yang tidak terukur ditulis sebagai tidak terukur, bukan diisi nol.
 * - Migrasi schema versioned dan idempotent.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelSkillsEvidence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // AI-02 F01: label terminologi diambil dari lapisan i18n (copy-id-feat-b.js), bukan
  // literal di titik pakai. Di browser runtime-nya sudah dimuat lebih dulu (index.html);
  // di Node (gate print-only me-require berkas ini langsung) modul memuatnya sendiri
  // supaya nilai yang dihasilkan tetap byte-identik dengan naskah hari ini.
  var I18N = (typeof globalThis !== 'undefined' && globalThis.FiezelI18n) || null;
  if (!I18N && typeof require === 'function') {
    try {
      I18N = require('../i18n/fiezel-i18n.js');
      require('../i18n/copy-id-feat-b.js');
    } catch (loadError) { I18N = null; }
  }
  function T(key, params) { return I18N ? I18N.t(key, params) : String(key); }

  var SCHEMA = 'fiezel-skills-evidence-v1';
  var VERSION = 1;
  var SOURCE_SCHEMA = 'fiezel-sl-v1';
  var SOURCE_KEY = 'fiezel-sl-v1-state';
  var DOMAINS = ['listening', 'speaking'];
  // Sidecar sudah membatasi event yang disimpan; batas kedua di sini menjaga proyeksi tetap
  // terbatas walau state di perangkat sudah membengkak karena versi lama.
  var MAX_EVENTS = 500;

  function clamp(value, min, max) {
    var n = Number(value);
    if (!isFinite(n)) return null;
    return Math.max(min, Math.min(max, n));
  }

  function median(values) {
    var rows = values.filter(function (v) { return typeof v === 'number' && isFinite(v); }).sort(function (a, b) { return a - b; });
    if (!rows.length) return null;
    var mid = Math.floor(rows.length / 2);
    return rows.length % 2 ? rows[mid] : Math.round((rows[mid - 1] + rows[mid]) / 2);
  }

  /**
   * Membaca state sidecar. Gagal baca, JSON rusak, atau storage tidak ada semuanya
   * menghasilkan null - tidak pernah melempar, karena kegagalan membaca bukti latihan tidak
   * boleh menjatuhkan Home.
   */
  function readSidecarState(env, key) {
    try {
      var store = env && env.localStorage;
      if (!store || typeof store.getItem !== 'function') return null;
      /* S1b: kunci boleh di-override supaya host bisa membacanya dari ruang akun
         (`<kunci>:<uuid>`). Default-nya tetap kunci datar: perangkat yang belum pernah
         login memang menyimpan di sana, dan modul ini tidak tahu apa-apa soal akun. */
      var sourceKey = typeof key === 'string' && key ? key : SOURCE_KEY;
      var raw = JSON.parse(store.getItem(sourceKey) || 'null');
      return raw && typeof raw === 'object' ? raw : null;
    } catch (_) { return null; }
  }

  /** Event yang bentuknya tidak dikenali dibuang, bukan ditambal dengan nilai karangan. */
  function usableEvents(state) {
    var rows = state && Array.isArray(state.events) ? state.events.slice(-MAX_EVENTS) : [];
    return rows.filter(function (e) {
      return e && DOMAINS.indexOf(e.domain) !== -1 && clamp(e.score, 0, 100) !== null;
    });
  }

  /**
   * Coverage target: berapa item berbeda yang sudah dikerjakan dibanding bank soalnya.
   * Ini BUKAN nilai. Tanpa jumlah bank yang diberikan pemanggil, coverage tidak dihitung -
   * menebak penyebut akan membuat angka persen yang terlihat resmi tapi tidak berarti.
   */
  function coverageFor(events, available) {
    var ids = {};
    for (var i = 0; i < events.length; i++) {
      var id = String(events[i].itemId || '');
      if (id) ids[id] = true;
    }
    var attempted = Object.keys(ids).length;
    var total = clamp(available, 0, 100000);
    if (!total) {
      return { measured: false, itemsAttempted: attempted, itemsAvailable: null, percent: null };
    }
    return {
      measured: true,
      itemsAttempted: attempted,
      itemsAvailable: total,
      percent: Math.min(100, Math.round(attempted / total * 100))
    };
  }

  function summarize(events, available) {
    var scores = [], times = [], levels = {}, replayRows = [];
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      scores.push(clamp(e.score, 0, 100));
      var ms = clamp(e.responseMs, 0, 600000);
      if (ms) times.push(ms);
      var level = String(e.level || 'A1');
      var replays = clamp(e.replays, 0, 20);
      if (replays !== null) replayRows.push(replays);
      var bucket = levels[level] || (levels[level] = { attempts: 0, passed: 0, scoreSum: 0 });
      bucket.attempts++;
      if (e.passed) bucket.passed++;
      bucket.scoreSum += clamp(e.score, 0, 100);
    }

    var attempts = events.length;
    var passed = events.filter(function (e) { return !!e.passed; }).length;
    // m025-65: `replays` kini benar-benar disimpan pada event oleh sidecar, jadi replay count
    // bukan lagi hal yang tidak terukur - SELAMA event-nya memang membawanya. Event lama dari
    // sebelum perubahan itu tidak punya field ini, dan untuk event seperti itu jawabannya tetap
    // "belum terukur", bukan nol. Nol berarti murid tidak pernah mengulang audio; tidak tahu
    // berarti kita tidak tahu.
    var replayTotal = replayRows.length ? replayRows.reduce(function (a, b) { return a + b; }, 0) : null;
    var unmeasurable = [];
    if (!replayRows.length) unmeasurable.push('replayCount');
    if (!available) unmeasurable.push('targetCoverage');

    return {
      status: attempts > 0 ? 'measured' : 'not_measured',
      attempts: attempts,
      completionRate: attempts ? Math.round(passed / attempts * 100) : null,
      // Sengaja bernama practiceScore. Ini skor latihan dari metrik sidecar, dan bukan -
      // serta tidak boleh ditampilkan sebagai - skor pengucapan.
      practiceScore: attempts ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / attempts) : null,
      medianResponseMs: median(times),
      replayCount: replayTotal,
      replayAverage: replayRows.length ? Math.round(replayTotal / replayRows.length * 10) / 10 : null,
      replayEvidence: replayRows.length,
      targetCoverage: coverageFor(events, available),
      byLevel: Object.keys(levels).sort().reduce(function (acc, key) {
        var b = levels[key];
        acc[key] = {
          attempts: b.attempts,
          completionRate: Math.round(b.passed / b.attempts * 100),
          practiceScore: Math.round(b.scoreSum / b.attempts)
        };
        return acc;
      }, {}),
      unmeasurable: unmeasurable
    };
  }

  /**
   * Proyeksi agregat. Input state mentah sidecar; output aman untuk dipakai Learner Evidence
   * dan dashboard.
   */
  function projectSkillsEvidence(input) {
    var options = input || {};
    var now = Number(options.now);
    if (!isFinite(now)) throw new Error('projectSkillsEvidence: now wajib diisi (deterministic)');
    var state = options.state && typeof options.state === 'object' ? options.state : null;
    var banks = options.bankCounts || {};
    var events = usableEvents(state);

    return {
      schema: SCHEMA,
      version: VERSION,
      generatedAt: new Date(now).toISOString(),
      sourceSchema: SOURCE_SCHEMA,
      sourceUpdatedAt: state && Number(state.updatedAt) > 0 ? new Date(Number(state.updatedAt)).toISOString() : null,
      domains: {
        listening: summarize(events.filter(function (e) { return e.domain === 'listening'; }), banks.listening),
        speaking: summarize(events.filter(function (e) { return e.domain === 'speaking'; }), banks.speaking)
      },
      privacy: {
        rawAudioIncluded: false,
        rawTranscriptIncluded: false,
        rawAnswerTextIncluded: false,
        aggregateOnly: true
      },
      // Dashboard tidak boleh menyebut coverage produksi lisan sebagai skor pengucapan.
      terminology: {
        practiceScore: T('skills.practice-score-label'),
        targetCoverage: T('skills.target-coverage-label'),
        pronunciationScore: false
      }
    };
  }

  /**
   * Migrasi versioned dan idempotent. Bentuk yang sudah v1 dikembalikan apa adanya; bentuk
   * lama atau rusak dinaikkan ke v1 tanpa mengarang angka. Menjalankannya dua kali harus
   * menghasilkan objek yang sama persis.
   */
  function migrateProjection(stored, now) {
    if (stored && stored.schema === SCHEMA && Number(stored.version) === VERSION) return stored;
    var clock = Number(now);
    if (!isFinite(clock)) throw new Error('migrateProjection: now wajib diisi (deterministic)');
    var empty = projectSkillsEvidence({ state: null, now: clock });
    if (!stored || typeof stored !== 'object') return empty;
    // Bentuk pra-v1 hanya boleh menyumbang angka yang masih bisa dipercaya; sisanya kembali
    // ke keadaan "belum terukur".
    var carried = {};
    for (var i = 0; i < DOMAINS.length; i++) {
      var name = DOMAINS[i];
      var row = stored.domains && stored.domains[name];
      var attempts = row ? clamp(row.attempts, 0, 100000) : null;
      carried[name] = attempts
        ? Object.assign({}, empty.domains[name], {
          status: 'measured',
          attempts: attempts,
          practiceScore: clamp(row.practiceScore != null ? row.practiceScore : row.averageScore, 0, 100),
          completionRate: clamp(row.completionRate != null ? row.completionRate : row.passRate, 0, 100)
        })
        : empty.domains[name];
    }
    return Object.assign({}, empty, { domains: carried, migratedFrom: String(stored.schema || 'unknown').slice(0, 60) });
  }

  /**
   * Menempelkan proyeksi ke Learner Evidence. Murni dan idempotent: memanggilnya berkali-kali
   * dengan proyeksi yang sama menghasilkan objek yang sama, karena hasilnya ditulis ulang,
   * bukan diakumulasi.
   */
  function mergeIntoLearnerEvidence(evidence, projection) {
    var base = evidence && typeof evidence === 'object' ? evidence : {};
    if (!projection || projection.schema !== SCHEMA) return base;
    var skills = Object.assign({}, base.skills);
    skills.spoken = {
      schema: projection.schema,
      version: projection.version,
      listening: projection.domains.listening,
      speaking: projection.domains.speaking,
      terminology: projection.terminology
    };
    return Object.assign({}, base, { skills: skills });
  }

  return {
    SCHEMA: SCHEMA,
    VERSION: VERSION,
    SOURCE_KEY: SOURCE_KEY,
    DOMAINS: DOMAINS,
    readSidecarState: readSidecarState,
    projectSkillsEvidence: projectSkillsEvidence,
    migrateProjection: migrateProjection,
    mergeIntoLearnerEvidence: mergeIntoLearnerEvidence
  };
});
