/**
 * FIEZEL R2 — Personal Learning Journey (5.19)
 *
 * Weekly Mission, Today Plan, recovery plan, skill map, dan goal profile.
 *
 * Modul ini sengaja PURE dan DETERMINISTIC: tidak ada Date.now(), tidak ada Math.random(),
 * tidak ada akses storage/DOM/network. Semua waktu masuk lewat parameter `now`. Dua panggilan
 * dengan input identik wajib menghasilkan output identik, byte per byte, supaya rencana belajar
 * bisa diaudit dan diuji ulang.
 *
 * Guardrail roadmap R2 yang dijaga di sini:
 * - Prioritas tetap deterministic + bounded. AI boleh MENJELASKAN rencana, tidak boleh MEMILIH.
 *   Karena itu penjelasan dibangun dari rationale code yang sudah ditentukan mesin.
 * - Tidak ada klaim skor IELTS/TOEFL. Goal profile hanya menyebut prasyarat.
 * - Listening/Speaking belum punya bukti di state v4; ditandai `not_measured`, bukan ditebak.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelPersonalJourney = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // AI-02 F01: naskah murid diambil dari lapisan i18n (copy-id-feat-b.js), bukan literal
  // di titik pakai. Di browser runtime-nya dimuat lebih dulu (index.html); di Node (gate
  // print-only me-require modul ini langsung) modul memuatnya sendiri supaya keluaran id
  // tetap byte-identik. Modul tetap PURE: T() deterministik untuk locale yang sama.
  var I18N = (typeof globalThis !== 'undefined' && globalThis.FiezelI18n) || null;
  if (!I18N && typeof require === 'function') {
    try {
      I18N = require('../i18n/fiezel-i18n.js');
      require('../i18n/copy-id-feat-b.js');
    } catch (loadError) { I18N = null; }
  }
  function T(key, params) { return I18N ? I18N.t(key, params) : String(key); }

  var SCHEMA = 'fiezel-personal-journey-v1';
  var DAY_MS = 86400000;
  // Produk ini dipakai di Indonesia dan "hari belajar" harus sama untuk pengguna dan untuk test.
  // Offset tetap dipilih supaya batas minggu tidak bergeser mengikuti timezone perangkat, yang
  // akan membuat missionId tidak reproducible.
  var WIB_OFFSET_MS = 7 * 3600000;

  var SKILLS = ['vocabulary', 'grammar', 'reading', 'listening', 'speaking'];
  var SKILL_LABELS = {
    vocabulary: 'Vocabulary', grammar: 'Grammar', reading: 'Reading',
    listening: 'Listening', speaking: 'Speaking'
  };
  // Domain yang punya bukti terukur di state v4. Listening/Speaking baru masuk pada R3
  // (proyeksi aggregate-only dari fiezel-sl-v1-state), jadi di R2 statusnya belum terukur.
  var MEASURED_SKILLS = ['vocabulary', 'grammar', 'reading'];

  // Nilai tabel dipetakan ke kunci i18n; buildGoalProfile me-resolve lewat T() pada saat
  // dipanggil supaya profilnya mengikuti locale aktif (AI-14 F03: render ulang pasca ganti).
  var GOALS = {
    school: {
      id: 'school', label: 'journey.goal-school-label',
      prerequisites: ['journey.goal-school-p1', 'journey.goal-school-p2', 'journey.goal-school-p3']
    },
    it: {
      id: 'it', label: 'journey.goal-it-label',
      prerequisites: ['journey.goal-it-p1', 'journey.goal-it-p2', 'journey.goal-it-p3']
    },
    campus: {
      id: 'campus', label: 'journey.goal-campus-label',
      prerequisites: ['journey.goal-campus-p1', 'journey.goal-campus-p2', 'journey.goal-campus-p3']
    },
    scholarship: {
      id: 'scholarship', label: 'journey.goal-scholarship-label',
      prerequisites: ['journey.goal-scholarship-p1', 'journey.goal-scholarship-p2', 'journey.goal-scholarship-p3']
    },
    exam_foundation: {
      id: 'exam_foundation', label: 'journey.goal-exam-label',
      // Roadmap melarang prediksi skor. Yang boleh disebut hanya prasyarat.
      prerequisites: ['journey.goal-exam-p1', 'journey.goal-exam-p2', 'journey.goal-exam-p3'],
      note: 'journey.goal-exam-note'
    },
    everyday: {
      id: 'everyday', label: 'journey.goal-everyday-label',
      prerequisites: ['journey.goal-everyday-p1', 'journey.goal-everyday-p2', 'journey.goal-everyday-p3']
    }
  };
  var DEFAULT_GOAL = 'school';

  /**
   * m025-131: alasan rencana, ditulis ulang dengan bahasa murid.
   *
   * KENAPA DIUBAH DI SINI, bukan diterjemahkan di lapisan tampilan. Percobaan pertama
   * memang begitu - app.js menyusun kalimatnya sendiri dari mode dan backlog - dan
   * personal-journey-ui-test menolaknya dengan benar: ia menuntut alasan YANG TAMPIL sama
   * persis dengan alasan yang dihitung mesin. Tuntutan itu bukan formalitas. Kalimat yang
   * cantik tetapi bukan alasan sesungguhnya adalah layar yang berbohong kepada murid, dan
   * ia akan menyimpang diam-diam pada hari mesinnya berubah.
   *
   * Jadi yang diperbaiki penulisnya, bukan penerjemahnya.
   */
  var RATIONALE_TEXT = {
    due_reviews: 'journey.rat-due-reviews',
    forgetting_risk: 'journey.rat-forgetting-risk',
    weak_skill: 'journey.rat-weak-skill',
    recurring_error: 'journey.rat-recurring-error',
    abandonment_risk: 'journey.rat-abandonment-risk',
    consistency_risk: 'journey.rat-consistency-risk',
    confidence_gap: 'journey.rat-confidence-gap',
    calm_pacing: 'journey.rat-calm-pacing',
    session_interrupted: 'journey.rat-session-interrupted',
    balanced_progression: 'journey.rat-balanced-progression',
    evidence_thin: 'journey.rat-evidence-thin',
    // m025-201 — beban memori yang NYATA (highRiskCount), bukan panjang antrean jatuh tempo.
    memory_high_risk_load: 'journey.rat-memory-high-risk-load',
    due_backlog_low_risk: 'journey.rat-due-backlog-low-risk',
    // m025-201 — penilaian hasil kebijakan terakhir. Sudah dikirim policy sejak lama dan
    // TIDAK PERNAH punya padanan teks di sini, jadi murid tidak pernah diberi tahu bahwa
    // rencana kemarin ikut menentukan rencana hari ini.
    recent_policy_outcome_negative: 'journey.rat-outcome-negative',
    recent_policy_outcome_mixed: 'journey.rat-outcome-mixed',
    recent_policy_outcome_positive: 'journey.rat-outcome-positive',
    // m025-201 — tren efektivitas atas SEPULUH hasil, bukan satu.
    policy_trend_declining: 'journey.rat-trend-declining',
    policy_trend_improving: 'journey.rat-trend-improving',
    policy_trend_flat: 'journey.rat-trend-flat',
    // m025-201 — alasan Core Brain di perangkat murid.
    brain_optimal_challenge: 'journey.rat-brain-optimal-challenge',
    brain_trend_improving: 'journey.rat-brain-trend-improving',
    brain_trend_plateau: 'journey.rat-brain-trend-plateau',
    brain_trend_declining: 'journey.rat-brain-trend-declining',
    brain_cognitive_load: 'journey.rat-brain-cognitive-load',
    brain_memory_at_risk: 'journey.rat-brain-memory-at-risk',
    brain_root_cause: 'journey.rat-brain-root-cause',
    // m025-201 — cermin penalaran sisi server, dipakai HANYA saat ringkasan Core Brain
    // tidak sampai. Diberi kata-kata sendiri supaya tidak mengaku sebagai Core Brain.
    server_cognitive_load: 'journey.rat-server-cognitive-load',
    server_pacing_watch: 'journey.rat-server-pacing-watch',
    server_memory_at_risk: 'journey.rat-server-memory-at-risk',
    server_trend_improving: 'journey.rat-server-trend-improving',
    server_trend_plateau: 'journey.rat-server-trend-plateau',
    server_trend_declining: 'journey.rat-server-trend-declining'
  };

  /** Kode PENALARAN: ditambahkan lapisan di atas v1 dan karena itu selalu berada di ekor. */
  var PRIORITY_RATIONALE = /^(brain_|server_|policy_trend_|recent_policy_outcome_)/;

  /**
   * Potong daftar kode dengan PRIORITAS, bukan posisi. Memotong `n` teratas secara
   * posisional berarti membuang kode penalaran setiap kali daftarnya penuh — dan daftar
   * paling sering penuh justru pada murid yang paling butuh dijelaskan.
   */
  function capCodes(list, n) {
    var codes = Array.isArray(list) ? list : [];
    if (codes.length <= n) return codes.slice();
    var keep = codes.filter(function (c) { return PRIORITY_RATIONALE.test(c); });
    var rest = codes.filter(function (c) { return !PRIORITY_RATIONALE.test(c); });
    return rest.slice(0, Math.max(0, n - keep.length)).concat(keep).slice(0, n);
  }

  function clamp(value, min, max) {
    var n = Number(value);
    if (!isFinite(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  function toDayKey(ms) {
    return new Date(Number(ms) + WIB_OFFSET_MS).toISOString().slice(0, 10);
  }

  /** Senin 00:00 WIB dari minggu yang memuat `now`, dikembalikan sebagai epoch ms UTC. */
  function weekStart(now) {
    var shifted = Number(now) + WIB_OFFSET_MS;
    var d = new Date(shifted);
    var weekday = (d.getUTCDay() + 6) % 7; // Senin = 0
    var midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return midnight - weekday * DAY_MS - WIB_OFFSET_MS;
  }

  function normalizeGoal(goal) {
    var key = String(goal || '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(GOALS, key) ? key : DEFAULT_GOAL;
  }

  /**
   * Goal profile: prasyarat, bukan janji hasil. Tidak pernah mengembalikan angka skor.
   */
  function buildGoalProfile(goal) {
    var row = GOALS[normalizeGoal(goal)];
    return {
      id: row.id,
      label: T(row.label),
      prerequisites: row.prerequisites.map(T),
      note: row.note ? T(row.note) : T('journey.goal-note-default'),
      scorePrediction: false
    };
  }

  /**
   * Skill map lima skill. Skill tanpa bukti TIDAK ditebak, sehingga dashboard bisa membedakan
   * "lemah" dari "belum terukur".
   *
   * Listening/Speaking memakai status `pending_r3`, bukan `not_measured`. Bedanya penting dan
   * bukan sekadar kata: `fiezel-sl-v1-state` SUDAH menyimpan bukti agregat untuk kedua skill
   * itu, hanya belum diproyeksikan ke Learner Evidence (itu pekerjaan R3). Menulis "belum ada
   * bukti" akan menjadi klaim yang salah terhadap murid yang sudah mengerjakan latihan
   * Speaking/Listening.
   */
  function buildSkillMap(input) {
    var evidence = (input && input.evidence) || {};
    var snapshot = (input && input.snapshot) || {};
    var domains = snapshot.domains || {};
    var weakest = (evidence.skills && evidence.skills.weakest) || [];
    var topRisks = (evidence.memory && evidence.memory.topRisks) || [];

    var spoken = (evidence.skills && evidence.skills.spoken) || null;

    return SKILLS.map(function (skill) {
      if (MEASURED_SKILLS.indexOf(skill) === -1) {
        // R3 memproyeksikan bukti agregat Speaking/Listening ke Learner Evidence. Kalau
        // proyeksinya ada dan berisi, skill ini terukur seperti yang lain; kalau belum,
        // statusnya tetap menunggu proyeksi - bukan diklaim tidak punya bukti.
        var row = spoken && spoken[skill];
        if (row && row.attempts > 0) {
          return {
            skill: skill, label: SKILL_LABELS[skill], status: 'measured',
            attempts: row.attempts,
            // practiceScore, bukan skor pengucapan. Namanya dijaga sampai ke layar.
            accuracy: row.practiceScore == null ? null : clamp(row.practiceScore, 0, 100),
            mastery: row.completionRate == null ? null : clamp(row.completionRate, 0, 100),
            riskCount: 0,
            targetCoverage: row.targetCoverage || null,
            basis: T('journey.basis-sl-practice', { n: row.attempts })
          };
        }
        return {
          skill: skill, label: SKILL_LABELS[skill], status: 'pending_r3',
          attempts: null, accuracy: null, mastery: null, riskCount: 0,
          basis: T('journey.basis-sl-pending')
        };
      }
      // Snapshot memakai nama `vocabulary`, riwayat jawaban memakai type `vocab`.
      var domain = domains[skill] || {};
      var historyType = skill === 'vocabulary' ? 'vocab' : skill;
      var attempts = clamp(domain.attempts, 0, 1e6);
      var accuracy = domain.recentAccuracy;
      if (accuracy == null) accuracy = domain.accuracy;
      var risks = topRisks.filter(function (r) {
        return String(r && r.domain) === (skill === 'vocabulary' ? 'vocab' : skill);
      }).length;
      var weakHere = weakest.filter(function (w) {
        return String(w && w.type) === historyType || String(w && w.type) === skill;
      }).length;
      return {
        skill: skill, label: SKILL_LABELS[skill],
        status: attempts > 0 ? 'measured' : 'not_measured',
        attempts: attempts,
        accuracy: accuracy == null ? null : clamp(accuracy, 0, 100),
        mastery: domain.average == null ? null : clamp(domain.average, 0, 100),
        riskCount: risks,
        weakSkillCount: weakHere,
        basis: attempts > 0
          ? T('journey.basis-answers', { n: attempts })
          : T('journey.basis-none')
      };
    });
  }

  /**
   * Target mingguan yang realistis: diturunkan dari ritme yang BENAR-BENAR terjadi 14 hari
   * terakhir, dan tidak boleh melompat lebih dari satu hari di atas kebiasaan. Target yang
   * tidak mungkin dicapai adalah cara tercepat membuat pengguna berhenti.
   */
  function realisticSessions(evidence) {
    var behavior = (evidence && evidence.behavior) || {};
    var activeDays14 = clamp(behavior.activeDays14, 0, 14);
    var observedPerWeek = Math.round(activeDays14 / 2); // 14 hari -> per minggu
    var abandonment = clamp(behavior.abandonmentRate, 0, 100);
    var target = observedPerWeek + 1;
    if (abandonment >= 35) target = Math.max(observedPerWeek, 2); // jangan menambah beban
    return clamp(target, 2, 6);
  }

  function rationaleText(codes) {
    var known = codes.filter(function (c) { return RATIONALE_TEXT[c]; });
    if (!known.length) return T('journey.rat-all-clear');
    // m025-201: tiga alasan yang ditampilkan dipilih supaya murid mendengar DUA HAL —
    // satu alasan penalaran (kenapa rencananya begini) dan bukti konkretnya. Sebelum ini
    // pemilihan murni posisional, dan karena lapisan penalaran selalu menambah di ekor,
    // alasan Core Brain tidak pernah sekali pun sampai ke layar.
    var reasoning = known.filter(function (c) { return PRIORITY_RATIONALE.test(c); });
    var evidence = known.filter(function (c) { return !PRIORITY_RATIONALE.test(c); });
    var picked = reasoning.slice(0, 1).concat(evidence).concat(reasoning.slice(1));
    var reasons = picked.slice(0, 3).map(function (c) { return T(RATIONALE_TEXT[c]); });
    return T('journey.rat-reasons', { reasons: reasons.join(', ') });
  }

  /**
   * Weekly Mission — satu misi per minggu belajar, dikunci ke evidence dan policy.
   * missionId stabil untuk minggu yang sama supaya misi tidak berganti tiap render.
   */
  function buildWeeklyMission(input) {
    var options = input || {};
    var evidence = options.evidence || {};
    var policy = options.policy || {};
    var snapshot = options.snapshot || {};
    var now = Number(options.now);
    if (!isFinite(now)) throw new Error('buildWeeklyMission: now wajib diisi (deterministic)');

    var start = weekStart(now);
    var codes = capCodes(policy.rationaleCodes, 6);
    var mode = String(policy.mode || 'diagnostic');
    var focusDomain = String(policy.primaryDomain || 'grammar');
    var focusSkill = String(policy.targetSkill || '').slice(0, 80);
    var sessionSize = clamp(policy.sessionSize, 4, 20);
    var sessions = realisticSessions(evidence);
    var memory = evidence.memory || {};

    // Review wajib: jatuh tempo nyata, dibatasi oleh kapasitas review sesi-sesi minggu ini
    // SENDIRI. buildTodayPlan menjamin review tidak pernah lebih dari setengah sesi, jadi
    // kapasitas mingguan yang jujur adalah sessions * floor(sessionSize / 2). Batas lama
    // (sessions * 4) bisa menjanjikan lebih banyak review daripada yang mungkin dijadwalkan
    // — misi yang mustahil diselesaikan tanpa melanggar aturan setengah-sesi itu sendiri.
    // Sisanya tetap tercatat sebagai backlog, bukan dihapus.
    var dueReviews = clamp(memory.dueReviews, 0, 1e5);
    var weeklyReviewCapacity = sessions * Math.floor(sessionSize / 2);
    var mustReview = clamp(dueReviews, 0, weeklyReviewCapacity);

    var skillMap = buildSkillMap({ evidence: evidence, snapshot: snapshot });
    var goal = buildGoalProfile(options.goal);
    var safeFocus = (focusSkill || focusDomain).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 32) || 'general';

    return {
      schema: SCHEMA,
      kind: 'weekly-mission',
      // Identitas misi dikunci ke minggu belajarnya saja. Sebelumnya `mode` dan fokus ikut
      // masuk ke id, sehingga bukti baru di tengah minggu diam-diam melahirkan misi "baru"
      // dan progres minggu berjalan kehilangan kaitannya.
      missionId: 'wm-' + toDayKey(start),
      // Isi misi memang dihitung ulang dari bukti terkini - modul ini stateless dan itu
      // disengaja. Karena itu perubahan isi harus TERLIHAT, bukan senyap: revision berubah
      // ketika fokus atau mode berubah, sehingga UI dan audit bisa membedakan "misi yang
      // sama, target bergeser" dari "minggu baru".
      missionRevision: mode + '-' + safeFocus,
      weekStart: toDayKey(start),
      weekEnd: toDayKey(start + 6 * DAY_MS),
      generatedAt: new Date(now).toISOString(),
      mode: mode,
      focusDomain: focusDomain,
      focusSkill: focusSkill,
      sessionsTarget: sessions,
      questionsTarget: sessions * sessionSize,
      minutesTarget: sessions * clamp(policy.estimatedMinutes, 5, 60),
      mustReview: mustReview,
      reviewBacklog: Math.max(0, dueReviews - mustReview),
      skillMap: skillMap,
      goalProfile: goal,
      rationale: { codes: codes, explanation: rationaleText(codes) },
      policyId: String(policy.policyId || ''),
      source: 'deterministic-journey-v1'
    };
  }

  /**
   * Recovery plan — dipakai setelah sesi terputus atau setelah beberapa hari tidak belajar.
   * Prinsipnya satu: perkecil beban sampai sesi bisa DISELESAIKAN, karena menyelesaikan sesi
   * pendek memberi bukti, sementara sesi panjang yang ditinggalkan tidak memberi apa-apa.
   */
  function buildRecoveryPlan(input) {
    var options = input || {};
    var evidence = options.evidence || {};
    var policy = options.policy || {};
    var now = Number(options.now);
    if (!isFinite(now)) throw new Error('buildRecoveryPlan: now wajib diisi (deterministic)');

    var behavior = evidence.behavior || {};
    var lastLearningAt = Number(options.lastLearningAt) || 0;
    var daysAway = lastLearningAt ? Math.max(0, Math.floor((now - lastLearningAt) / DAY_MS)) : null;
    var interrupted = !!options.interruptedSession;
    var abandonment = clamp(behavior.abandonmentRate, 0, 100);

    var needed = interrupted || abandonment >= 35 || (daysAway != null && daysAway >= 3);
    var base = clamp(policy.sessionSize, 4, 20);
    var questions = needed ? clamp(Math.min(base, 6), 3, 8) : base;

    var codes = [];
    if (interrupted) codes.push('session_interrupted');
    if (abandonment >= 25) codes.push('abandonment_risk');
    if (daysAway != null && daysAway >= 3) codes.push('consistency_risk');

    return {
      schema: SCHEMA,
      kind: 'recovery-plan',
      needed: needed,
      daysAway: daysAway,
      interruptedSession: interrupted,
      questions: questions,
      // Sesi comeback tidak boleh membuka materi baru; tujuannya menutup satu sesi, bukan menambah muatan.
      avoidNewContent: needed ? true : !!policy.avoidNewContent,
      pace: needed ? 'calm' : String(policy.pace || 'normal'),
      rationale: { codes: codes, explanation: rationaleText(codes) }
    };
  }

  /**
   * Today Plan — sesi pendek hari ini, review wajib, target realistis, dan alasan pemilihannya.
   * Blok dihitung dari mission + policy, bukan dari model bahasa.
   */
  function buildTodayPlan(input) {
    var options = input || {};
    var mission = options.mission || {};
    var evidence = options.evidence || {};
    var policy = options.policy || {};
    var now = Number(options.now);
    if (!isFinite(now)) throw new Error('buildTodayPlan: now wajib diisi (deterministic)');

    var recovery = buildRecoveryPlan({
      evidence: evidence, policy: policy, now: now,
      lastLearningAt: options.lastLearningAt,
      interruptedSession: options.interruptedSession
    });

    var total = recovery.needed ? recovery.questions : clamp(policy.sessionSize, 4, 20);
    var reviewShare = clamp(policy.reviewShare, 0, 0.8);
    var dueToday = clamp((evidence.memory || {}).dueReviews, 0, 1e5);

    // Review wajib tidak pernah melebihi setengah sesi: sesi yang isinya review saja membuat
    // pengguna merasa tidak maju, dan itu justru menaikkan abandonment.
    var review = Math.min(Math.round(total * reviewShare), Math.floor(total / 2), dueToday);
    if (dueToday > 0 && review < 1) review = 1;
    var focus = Math.max(1, total - review);
    var transfer = 0;
    if (!recovery.needed && !policy.avoidNewContent && focus > 4) { transfer = 1; focus -= 1; }

    var blocks = [];
    if (review > 0) blocks.push({ kind: 'review', questions: review, mandatory: true, why: T('journey.why-review') });
    blocks.push({
      kind: 'focus', questions: focus, mandatory: true,
      why: mission.focusSkill
        ? T('journey.why-focus-skill', { skill: String(mission.focusSkill).replace(/_/g, ' ') })
        : T('journey.why-focus-domain', { domain: String(mission.focusDomain || policy.primaryDomain || 'grammar') })
    });
    if (transfer > 0) blocks.push({ kind: 'transfer', questions: transfer, mandatory: false, why: T('journey.why-transfer') });

    var codes = recovery.needed
      ? recovery.rationale.codes
      : capCodes(policy.rationaleCodes, 6);

    var totalQuestions = blocks.reduce(function (n, b) { return n + b.questions; }, 0);
    return {
      schema: SCHEMA,
      kind: 'today-plan',
      planId: 'tp-' + toDayKey(now) + '-' + String(mission.missionId || 'no-mission'),
      date: toDayKey(now),
      missionId: String(mission.missionId || ''),
      mode: recovery.needed ? 'recovery' : String(policy.mode || 'balance'),
      blocks: blocks,
      questionsTarget: totalQuestions,
      mandatoryReview: review,
      minutesTarget: Math.max(3, Math.round(totalQuestions * (recovery.pace === 'calm' ? 1.25 : 1))),
      pace: recovery.pace,
      avoidNewContent: recovery.avoidNewContent,
      recovery: recovery,
      rationale: { codes: codes, explanation: rationaleText(codes) },
      source: 'deterministic-journey-v1'
    };
  }

  /**
   * Teks penjelasan untuk UI. Sengaja dibuat dari rationale code saja: penjelasan tidak boleh
   * menjadi jalan masuk untuk mengubah pilihan.
   */
  function explainSelection(plan) {
    var codes = (plan && plan.rationale && plan.rationale.codes) || [];
    return rationaleText(Array.isArray(codes) ? codes : []);
  }

  return {
    SCHEMA: SCHEMA,
    SKILLS: SKILLS,
    GOAL_IDS: Object.keys(GOALS),
    weekStart: weekStart,
    toDayKey: toDayKey,
    buildGoalProfile: buildGoalProfile,
    buildSkillMap: buildSkillMap,
    buildWeeklyMission: buildWeeklyMission,
    buildTodayPlan: buildTodayPlan,
    buildRecoveryPlan: buildRecoveryPlan,
    explainSelection: explainSelection
  };
});
