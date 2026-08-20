/**
 * FIEZEL R4 — Academic and Scholarship Readiness (5.21)
 *
 * Peta kesiapan akademik: jalur reading akademik, prasyarat fondasi IELTS/TOEFL, dan lab
 * komunikasi beasiswa. Semuanya diturunkan dari bukti belajar yang sudah ada, bukan dari
 * janji.
 *
 * PURE dan DETERMINISTIC seperti modul R2/R3: `now` wajib, tanpa random, storage, atau DOM.
 *
 * Dua batas roadmap yang dijaga keras di sini:
 *
 * 1. TIDAK ADA PREDIKSI SKOR. Modul ini hanya menyatakan prasyarat kemampuan dan apakah
 *    buktinya sudah ada. Tidak ada band, tidak ada rentang skor, tidak ada "kamu setara X".
 * 2. BELUM TERUKUR BUKAN BERARTI GAGAL. Prasyarat yang belum punya bukti berstatus
 *    `unknown`, bukan `not_met`. Menyatakan seseorang belum memenuhi syarat padahal FIEZEL
 *    belum pernah mengukurnya adalah tuduhan, bukan asesmen.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelAcademicReadiness = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-academic-readiness-v1';

  // Topik reading bertema sains/teknologi/lingkungan yang BENAR-BENAR ada di reading-bank.json.
  // Gate membandingkan daftar ini langsung ke bank, jadi topik yang hilang atau berganti nama
  // akan menjatuhkan test, bukan diam-diam menghasilkan jalur kosong.
  var ACADEMIC_READING_TOPICS = [
    'renewable energy',
    'coastal ecology',
    'river monitoring',
    'museum conservation',
    'urban gardening',
    'food waste'
  ];

  // Urutan tingkat untuk mini-path. Naik hanya kalau tingkat sebelumnya punya bukti.
  var PATH_LEVELS = ['A2', 'B1', 'B2'];

  var SCHOLARSHIP_TASKS = [
    {
      id: 'formal_email',
      label: 'Email formal ke kampus atau penyelenggara beasiswa',
      practises: ['struktur pembuka dan penutup', 'permintaan yang spesifik', 'nada sopan tanpa berlebihan']
    },
    {
      id: 'self_introduction',
      label: 'Perkenalan diri singkat',
      practises: ['latar belakang', 'alasan memilih bidang', 'rencana setelah studi']
    },
    {
      id: 'interview_practice',
      label: 'Latihan wawancara',
      practises: ['menjawab dengan contoh konkret', 'menjelaskan kelemahan tanpa merendahkan diri', 'bertanya balik']
    }
  ];

  function clamp(value, min, max) {
    var n = Number(value);
    return isFinite(n) ? Math.max(min, Math.min(max, n)) : null;
  }

  /**
   * Satu prasyarat. `unknown` dipakai ketika buktinya belum ada sama sekali - dibedakan dari
   * `not_met`, yang berarti buktinya ada dan belum cukup.
   */
  function requirement(id, label, measured, meets, basis) {
    return {
      id: id, label: label,
      status: !measured ? 'unknown' : (meets ? 'met' : 'not_met'),
      basis: basis
    };
  }

  function readingRequirement(snapshot) {
    var domain = (snapshot && snapshot.domains && snapshot.domains.reading) || {};
    var attempts = clamp(domain.attempts, 0, 1e6) || 0;
    var accuracy = domain.recentAccuracy != null ? clamp(domain.recentAccuracy, 0, 100)
      : (domain.accuracy != null ? clamp(domain.accuracy, 0, 100) : null);
    var measured = attempts >= 8 && accuracy != null;
    return requirement('academic_reading', 'Reading teks panjang dengan akurasi stabil', measured, measured && accuracy >= 65,
      measured ? attempts + ' bacaan dijawab, akurasi ' + accuracy + '%' : 'Belum cukup bukti reading (minimal 8 jawaban).');
  }

  function grammarRequirement(snapshot) {
    var domain = (snapshot && snapshot.domains && snapshot.domains.grammar) || {};
    var attempts = clamp(domain.attempts, 0, 1e6) || 0;
    var accuracy = domain.recentAccuracy != null ? clamp(domain.recentAccuracy, 0, 100)
      : (domain.accuracy != null ? clamp(domain.accuracy, 0, 100) : null);
    var measured = attempts >= 10 && accuracy != null;
    return requirement('grammar_accuracy', 'Akurasi grammar untuk tulisan formal', measured, measured && accuracy >= 70,
      measured ? attempts + ' soal grammar, akurasi ' + accuracy + '%' : 'Belum cukup bukti grammar (minimal 10 jawaban).');
  }

  function vocabularyRequirement(snapshot) {
    var domain = (snapshot && snapshot.domains && snapshot.domains.vocabulary) || {};
    var measuredItems = clamp(domain.measured, 0, 1e6) || 0;
    var mastered = clamp(domain.mastered, 0, 1e6) || 0;
    var measured = measuredItems >= 10;
    return requirement('vocabulary_breadth', 'Kosakata akademik dasar', measured, measured && mastered >= 5,
      measured ? mastered + ' dari ' + measuredItems + ' materi kosakata dikuasai' : 'Belum cukup materi kosakata yang terukur (minimal 10).');
  }

  /** Listening/Speaking memakai proyeksi R3; tanpa proyeksi statusnya unknown, bukan gagal. */
  function spokenRequirement(spoken, domain, id, label, minAttempts) {
    var row = spoken && spoken[domain];
    var attempts = row ? clamp(row.attempts, 0, 1e6) || 0 : 0;
    var score = row && row.practiceScore != null ? clamp(row.practiceScore, 0, 100) : null;
    var measured = attempts >= minAttempts && score != null;
    return requirement(id, label, measured, measured && score >= 60,
      measured ? attempts + ' latihan tercatat, skor latihan ' + score + '%'
        : 'Belum cukup latihan tercatat (minimal ' + minAttempts + ').');
  }

  /**
   * Peta fondasi IELTS/TOEFL. Menjelaskan prasyarat dan bukti yang ada - tidak pernah
   * memperkirakan skor, band, atau kesiapan ujian.
   */
  function buildFoundationMap(input) {
    var options = input || {};
    var now = Number(options.now);
    if (!isFinite(now)) throw new Error('buildFoundationMap: now wajib diisi (deterministic)');
    var snapshot = options.snapshot || {};
    var spoken = (options.evidence && options.evidence.skills && options.evidence.skills.spoken) || options.spoken || null;

    var requirements = [
      readingRequirement(snapshot),
      grammarRequirement(snapshot),
      vocabularyRequirement(snapshot),
      spokenRequirement(spoken, 'listening', 'listening_notetaking', 'Listening untuk mencatat poin utama', 6),
      spokenRequirement(spoken, 'speaking', 'academic_speaking', 'Speaking response situasi akademik', 6)
    ];

    var met = requirements.filter(function (r) { return r.status === 'met'; }).length;
    var unknown = requirements.filter(function (r) { return r.status === 'unknown'; }).length;

    return {
      schema: SCHEMA,
      kind: 'foundation-map',
      generatedAt: new Date(now).toISOString(),
      requirements: requirements,
      metCount: met,
      unknownCount: unknown,
      totalCount: requirements.length,
      // Ditulis eksplisit supaya UI tidak perlu menyimpulkannya sendiri, dan supaya gate bisa
      // memaksanya tetap ada.
      scorePrediction: false,
      readinessClaim: false,
      note: 'FIEZEL menjelaskan prasyarat kemampuan dan bukti yang sudah ada. FIEZEL tidak memprediksi skor IELTS/TOEFL dan tidak menyatakan kamu siap atau belum siap ujian.'
    };
  }

  /**
   * Mini-path reading akademik dari topik yang benar-benar ada di bank bacaan.
   * `bankTopics` diisi pemanggil (daftar {topic, level}); tanpa itu, jalurnya kosong dan
   * dinyatakan menunggu konten - tidak dikarang.
   */
  function buildAcademicReadingPath(input) {
    var options = input || {};
    var now = Number(options.now);
    if (!isFinite(now)) throw new Error('buildAcademicReadingPath: now wajib diisi (deterministic)');
    var rows = Array.isArray(options.bankTopics) ? options.bankTopics : [];
    var snapshot = options.snapshot || {};

    var stages = PATH_LEVELS.map(function (level) {
      var items = rows.filter(function (r) {
        return r && String(r.level) === level && ACADEMIC_READING_TOPICS.indexOf(String(r.topic)) !== -1;
      });
      var topics = [];
      for (var i = 0; i < items.length; i++) {
        if (topics.indexOf(items[i].topic) === -1) topics.push(items[i].topic);
      }
      return {
        level: level,
        items: items.length,
        topics: topics.sort(),
        status: items.length ? 'available' : 'content_pending'
      };
    });

    var reading = readingRequirement(snapshot);
    return {
      schema: SCHEMA,
      kind: 'academic-reading-path',
      generatedAt: new Date(now).toISOString(),
      stages: stages,
      totalItems: stages.reduce(function (n, s) { return n + s.items; }, 0),
      entryRequirement: reading,
      // Jalur tetap boleh dibuka walau prasyarat belum terpenuhi; prasyarat di sini adalah
      // informasi, bukan gerbang yang mengunci murid dari materinya sendiri.
      locked: false
    };
  }

  /**
   * Lab komunikasi beasiswa. Tugasnya nyata dan tetap, prasyaratnya diturunkan dari bukti.
   */
  function buildScholarshipLab(input) {
    var options = input || {};
    var now = Number(options.now);
    if (!isFinite(now)) throw new Error('buildScholarshipLab: now wajib diisi (deterministic)');
    var snapshot = options.snapshot || {};
    var grammar = grammarRequirement(snapshot);
    var vocabulary = vocabularyRequirement(snapshot);

    return {
      schema: SCHEMA,
      kind: 'scholarship-lab',
      generatedAt: new Date(now).toISOString(),
      tasks: SCHOLARSHIP_TASKS.map(function (task) {
        return {
          id: task.id, label: task.label, practises: task.practises.slice(),
          // Menulis email formal memakai grammar; wawancara memakai kosakata. Prasyarat
          // ditampilkan sebagai konteks, bukan penghalang.
          supportedBy: task.id === 'interview_practice' ? vocabulary.status : grammar.status
        };
      }),
      requirements: [grammar, vocabulary],
      scorePrediction: false
    };
  }

  /**
   * Jalur kosakata IT dan kehidupan kampus. Bank kosakata saat ini hanya bertopik
   * `general` dan `advanced`, jadi jalur ini BELUM punya konten. Dinyatakan menunggu konten,
   * bukan diisi dengan kata umum yang dilabeli ulang seolah-olah bertema IT.
   */
  function buildVocabularyPathway(input) {
    var options = input || {};
    var now = Number(options.now);
    if (!isFinite(now)) throw new Error('buildVocabularyPathway: now wajib diisi (deterministic)');
    var topics = Array.isArray(options.vocabTopics) ? options.vocabTopics : [];
    var themed = topics.filter(function (t) { return ['it', 'campus', 'technology', 'academic'].indexOf(String(t).toLowerCase()) !== -1; });
    return {
      schema: SCHEMA,
      kind: 'vocabulary-pathway',
      generatedAt: new Date(now).toISOString(),
      theme: 'it_campus',
      status: themed.length ? 'available' : 'content_pending',
      availableTopics: themed.sort(),
      note: themed.length
        ? 'Jalur kosakata bertema IT dan kehidupan kampus siap dipakai.'
        : 'Bank kosakata belum punya materi bertema IT atau kehidupan kampus. Jalur ini menunggu konten, dan FIEZEL tidak akan melabeli ulang kata umum supaya terlihat bertema.'
    };
  }

  return {
    SCHEMA: SCHEMA,
    ACADEMIC_READING_TOPICS: ACADEMIC_READING_TOPICS,
    PATH_LEVELS: PATH_LEVELS,
    SCHOLARSHIP_TASKS: SCHOLARSHIP_TASKS,
    buildFoundationMap: buildFoundationMap,
    buildAcademicReadingPath: buildAcademicReadingPath,
    buildScholarshipLab: buildScholarshipLab,
    buildVocabularyPathway: buildVocabularyPathway
  };
});
