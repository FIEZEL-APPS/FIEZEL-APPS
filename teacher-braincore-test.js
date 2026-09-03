/**
 * teacher-braincore-test.js — GERBANG integrasi konten guru <-> Braincore (§15-§17, §20, §29).
 *
 * Node murni, nol dependency, nol jaringan. Yang dijaga, dan kenapa:
 *   1. Normalisasi menghasilkan TEPAT bidang yang dibaca mesin adaptif FIEZEL
 *      (`fiezel-item-prior.difficultyFor` -> level/domain/stemLength). Kalau
 *      bidangnya meleset, "Braincore memakai konten guru" adalah klaim kosong.
 *   2. Item hasil normalisasi BENAR-BENAR diterima difficultyFor yang asli —
 *      berkas inti itu dimuat dan dipanggil di gerbang ini, bukan ditiru.
 *   3. Hanya konten TERBIT yang masuk indeks; kegagalan DILAPORKAN, tidak ditelan.
 *   4. Provenans §17 lengkap di setiap item dan setiap bukti.
 *   5. Keputusan adaptif BUKAN urutan tetap: ia berubah mengikuti bukti, dan
 *      contoh §16 (vocabulary kuat / listening lemah) menghasilkan listening.
 *   6. Keputusan DETERMINISTIK dan punya `reason` yang bisa diaudit.
 *   7. Laporan kelas §20 agregat saja, dan menahan kohor kecil dengan JUJUR.
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const results = [];
let failures = 0;
function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}

/**
 * Memuat modul otak inti (IIFE bergaya browser) di sandbox, supaya gerbang ini
 * memanggil `difficultyFor` YANG ASLI. Menyalin rumusnya ke sini akan membuat
 * gerbang lulus sambil produksi menyimpang — persis kegagalan yang mau dicegah.
 */
function loadCoreBrainModule(file, globalName) {
  const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const sandbox = { self: {}, console, Math, Date, JSON, Object, Array, String, Number };
  sandbox.window = sandbox.self;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file });
  return sandbox.self[globalName] || sandbox[globalName] || null;
}

(async () => {
  const B = await import('file://' + path.join(__dirname, 'workers/api/teacher/braincore-bridge.js'));
  const C = await import('file://' + path.join(__dirname, 'workers/api/teacher/content-core.js'));

  const CTX = { teacherId: 'guruA', institutionId: 'inst1', subjectId: 'S1', courseId: 'C1', lessonId: 'L1' };
  function q(over) {
    return {
      id: 'Q' + (over.n || 1), lesson_id: 'L1', teacher_sub: 'guruA', type: 'mcq',
      stem: 'I have a ___ under the name Putri.', options: ['reservation', 'receipt'],
      answer: 'reservation', explanation: 'pemesanan di muka', skill: 'vocabulary',
      level: 'A2', difficulty: 2, tags: ['hotel'], status: 'PUBLISHED', ...over
    };
  }

  /* ---------- 1. Normalisasi + kontrak dengan mesin adaptif -------------------- */
  const normalized = B.normalizeForBraincore(q({}), CTX);
  assert(normalized.ok === true, 'soal terbit ternormalisasi');
  const item = normalized.item;
  for (const field of ['level', 'domain', 'stemLength']) {
    assert(field in item, 'item membawa bidang `' + field + '` yang dibaca difficultyFor');
  }
  assert(item.domain === 'vocabulary', 'skill dipetakan ke domain mesin adaptif');
  assert(item.stemLength === q({}).stem.length, 'panjang batang soal dihitung, bukan ditebak');
  assert(item.teacherDifficulty === 2 && !('difficulty' in item),
    'penilaian guru bernama `teacherDifficulty`, BUKAN `difficulty` — supaya tidak '
    + 'tertukar dengan kesulitan terkalibrasi FIEZEL');

  const prior = loadCoreBrainModule('features/brain/fiezel-item-prior.js', 'FiezelItemPrior');
  assert(prior && typeof prior.difficultyFor === 'function',
    'modul prior item inti termuat (kontrak diuji terhadap yang ASLI)');
  const d = prior.difficultyFor({ level: item.level, domain: item.domain, stemLength: item.stemLength });
  assert(typeof d === 'number' && Number.isFinite(d) && d > 0,
    'difficultyFor ASLI menerima item guru dan mengembalikan prior yang sah');
  const dHarder = prior.difficultyFor({ level: 'C1', domain: item.domain, stemLength: item.stemLength });
  assert(dHarder > d, 'CEFR lebih tinggi menghasilkan prior lebih sulit — CEFR guru BERPENGARUH');

  /* ---------- 2. Provenans (§17) ------------------------------------------------ */
  assert(item.contentSource === 'TEACHER', 'item ditandai sumber TEACHER');
  assert(C.CONTENT_SOURCE.CORE === 'CORE' && C.CONTENT_SOURCE.TEACHER === 'TEACHER',
    'batas domain CORE vs TEACHER dinyatakan enum');
  for (const field of ['teacherId', 'institutionId', 'subjectId', 'courseId', 'lessonId']) {
    assert(item[field] !== null && item[field] !== undefined,
      'provenans §17 memuat ' + field + ' — Braincore tahu asal dan lingkup item');
  }

  /* ---------- 3. Hanya konten terbit masuk indeks ------------------------------ */
  assert(B.normalizeForBraincore(q({ status: 'DRAFT' }), CTX).problem === B.BRIDGE_PROBLEM.NOT_PUBLISHED,
    'draf TIDAK masuk indeks Braincore — kalau bisa, ia tersaji tanpa lewat layar terbit');
  assert(B.normalizeForBraincore(q({ status: 'ARCHIVED' }), CTX).ok === false, 'arsip tidak masuk indeks');
  assert(B.normalizeForBraincore(q({ skill: 'kungfu' }), CTX).problem === B.BRIDGE_PROBLEM.SKILL_UNKNOWN,
    'skill di luar enum ditolak jembatan');
  assert(B.normalizeForBraincore(q({ level: 'Z9' }), CTX).problem === B.BRIDGE_PROBLEM.LEVEL_UNKNOWN,
    'CEFR di luar enum ditolak jembatan');

  const mixed = B.buildIndex([
    q({ n: 1 }), q({ n: 2, status: 'DRAFT' }), q({ n: 3, skill: 'listening' }), q({ n: 4, skill: 'grammar' })
  ], CTX);
  assert(mixed.items.length === 3, 'indeks memuat tiga item terbit');
  assert(mixed.skipped.length === 1 && mixed.skipped[0].id === 'Q2',
    'item yang dilewati DILAPORKAN — indeks tidak menelan kegagalan diam-diam');
  assert(mixed.bySkill.vocabulary.length === 1 && mixed.bySkill.listening.length === 1,
    'indeks bisa ditanya per keterampilan');
  assert(mixed.byLevel.A2.length === 3, 'indeks bisa ditanya per CEFR');

  /* ---------- 4. Bukti belajar --------------------------------------------------- */
  const ev = B.evidenceFromAttempt({ correct: false, latencyMs: 4200 }, item);
  assert(ev.skill === 'vocabulary' && ev.level === 'A2' && ev.correct === false,
    'bukti membawa dimensi yang SAMA dengan bukti item inti');
  assert(ev.contentSource === 'TEACHER' && ev.lessonId === 'L1', 'bukti membawa provenans');
  assert(!('answerText' in ev) && !('response' in ev) && !('transcript' in ev),
    'bukti TIDAK memuat teks jawaban murid (larangan transkrip bab 29)');
  assert(B.evidenceFromAttempt({ correct: 'ya' }, item).correct === false,
    'benar/salah hanya dari boolean sejati, bukan nilai truthy');

  /* ---------- 5. Keputusan adaptif — contoh §16 --------------------------------- */
  const index = B.buildIndex([
    q({ n: 10, skill: 'vocabulary' }), q({ n: 11, skill: 'listening' }), q({ n: 12, skill: 'grammar' })
  ], CTX);

  // Vocabulary KUAT, listening LEMAH, grammar SEDANG — persis skenario §16.
  const evidence = [];
  for (let i = 0; i < 5; i += 1) evidence.push({ skill: 'vocabulary', correct: true });
  for (let i = 0; i < 5; i += 1) evidence.push({ skill: 'listening', correct: i === 0 });
  for (let i = 0; i < 5; i += 1) evidence.push({ skill: 'grammar', correct: i < 3 });

  const decision = B.chooseNextActivity({ index, evidence });
  assert(decision.skill === 'listening',
    '§16: vocabulary kuat / listening lemah / grammar sedang -> Braincore memprioritaskan LISTENING');
  assert(decision.action === 'remediate' && decision.reason === 'weak_skill',
    'keputusan menyebut ALASANnya — adaptif yang tidak bisa dijelaskan tidak bisa diaudit');
  assert(decision.itemIds.includes('Q11'), 'keputusan menunjuk item guru yang relevan');

  // Bukti BERBEDA -> keputusan BERBEDA. Inilah yang membedakan adaptif dari urutan tetap.
  const flipped = evidence.map((e) => ({ ...e, correct: e.skill === 'listening' ? true : e.correct }));
  const flippedDecision = B.chooseNextActivity({ index, evidence: flipped });
  assert(flippedDecision.skill !== 'listening',
    'saat listening membaik, keputusan BERPINDAH — bukan urutan tetap (§16)');

  // Keterampilan yang belum pernah teramati didahulukan.
  const unseen = B.chooseNextActivity({ index, evidence: [{ skill: 'vocabulary', correct: true }] });
  assert(unseen.reason === 'unseen_skill',
    'keterampilan yang belum pernah teramati didahulukan — Braincore tidak menyimpulkan dari kekosongan');

  // Semua kuat -> maju, dan dikatakan apa adanya.
  const allStrong = [];
  for (const skill of ['vocabulary', 'listening', 'grammar']) {
    for (let i = 0; i < 5; i += 1) allStrong.push({ skill, correct: true });
  }
  assert(B.chooseNextActivity({ index, evidence: allStrong }).action === 'advance',
    'seluruh keterampilan kuat -> `advance`, bukan latihan basa-basi');

  // Satu jawaban salah BUKAN kelemahan.
  const thin = B.chooseNextActivity({
    index,
    evidence: [{ skill: 'vocabulary', correct: true }, { skill: 'listening', correct: false }, { skill: 'grammar', correct: true }]
  });
  assert(thin.reason !== 'weak_skill',
    'satu pengamatan tidak cukup untuk menyebut sebuah keterampilan lemah (MIN_OBSERVATIONS)');

  assert(B.chooseNextActivity({ index: { items: [], bySkill: {} }, evidence }).action === 'none',
    'tanpa item guru, keputusan `none` — bukan mengarang aktivitas');

  // Determinisme.
  const a = JSON.stringify(B.chooseNextActivity({ index, evidence }));
  const b = JSON.stringify(B.chooseNextActivity({ index, evidence }));
  assert(a === b, 'keputusan DETERMINISTIK atas bukti yang sama — bisa diuji dan bisa dijelaskan ke guru');

  const summary = B.masteryFromEvidence(evidence);
  assert(summary.bySkill.vocabulary.rate === 1 && summary.bySkill.listening.rate === 0.2,
    'ringkasan bukti menghitung proporsi teramati');
  assert('seen' in summary.bySkill.vocabulary,
    'jumlah pengamatan ikut dikembalikan supaya pemanggil bisa menolak menyimpulkan dari data tipis');

  /* ---------- 6. Laporan kelas (§20) -------------------------------------------- */
  const learners = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
  const classEvidence = [];
  for (const learnerRef of learners) {
    classEvidence.push({ learnerRef, lessonId: 'L1', skill: 'vocabulary', correct: true });
    classEvidence.push({ learnerRef, lessonId: 'L1', skill: 'listening', correct: false });
  }
  const report = B.classProgress({ learners, evidence: classEvidence, lessonId: 'L1' });
  assert(report.completed === 6 && report.assigned === 6, 'laporan kelas menghitung penyelesaian');
  assert(report.hardestSkill === 'listening', 'laporan kelas menunjuk keterampilan tersulit (§20)');
  assert(report.averageRate === 0.5, 'rata-rata kelas dihitung dari bukti nyata');
  const json = JSON.stringify(report);
  for (const learnerRef of learners) {
    assert(!json.includes(learnerRef),
      'laporan kelas TIDAK memuat pengenal murid — agregat saja, jadi tidak ada IDOR yang mungkin');
  }

  const tiny = B.classProgress({
    learners: ['m1', 'm2'],
    evidence: [{ learnerRef: 'm1', lessonId: 'L1', skill: 'listening', correct: false }],
    lessonId: 'L1'
  });
  assert(tiny.suppressed === true, 'agregat kelas sangat kecil DITAHAN (rata-rata 2 murid = data per murid)');
  assert(tiny.averageRate === null && tiny.hardestSkill === null, 'nilai yang ditahan = null, bukan nol');
  assert(tiny.completed === 1,
    'penahanan DILAPORKAN lewat `suppressed`, bukan disamarkan jadi "belum ada yang mengerjakan"');

  /* ---------- 7. Status sinkronisasi (§29) --------------------------------------- */
  const lesson = { id: 'L1', kind: 'lesson', status: 'PUBLISHED' };
  assert(B.syncStatusOf(lesson, { items: [item], skipped: [] }) === 'SYNCED', 'lesson terindeks = SYNCED');
  assert(B.syncStatusOf(lesson, { items: [], skipped: [{ id: 'Q2' }] }) === 'FAILED',
    'ada item gagal = FAILED — TIDAK PERNAH dilaporkan berhasil (§29)');
  assert(B.syncStatusOf({ ...lesson, status: 'DRAFT' }, { items: [], skipped: [] }) === 'PENDING',
    'draf = PENDING');
  assert(B.syncStatusOf(lesson, { items: [], skipped: [] }) === 'PENDING',
    'lesson terbit tanpa item terindeks = PENDING, bukan SYNCED palsu');
  assert(B.syncStatusOf(null, {}) === 'FAILED', 'node hilang = FAILED (fail-closed)');

  /* ---------- Laporan -------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  console.log('teacher-braincore-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('teacher-braincore-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('teacher-braincore-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
