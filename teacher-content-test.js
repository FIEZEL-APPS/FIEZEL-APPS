/**
 * teacher-content-test.js — GERBANG model konten guru (§3-§6, §13, §14, §18).
 *
 * Node murni, nol dependency, nol jaringan. Yang dijaga:
 *   1. Enum pedagogis konten guru SETARA enum inti FIEZEL (skill + CEFR).
 *      Divergensi = konten guru yang tidak bisa dibaca Braincore.
 *   2. Hierarki subject->course->topic->lesson ditegakkan, termasuk penahan
 *      IDOR "induk milik guru lain".
 *   3. Validasi mengembalikan SELURUH masalah, bukan yang pertama.
 *   4. Soal dengan jawaban di luar opsi DITOLAK (soal mustahil = bukti palsu).
 *   5. Mesin status terbit + kesiapan terbit (lesson kosong / induk draft).
 *   6. Versi naik pada sunting, dan created_by/created_at tidak pernah ditimpa.
 *   7. Isolasi konten antar guru, dan murid tidak melihat konten belum ditugaskan.
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const results = [];
let failures = 0;
function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}
function has(verdict, problem) {
  return !verdict.ok && verdict.problems.some((p) => p.problem === problem);
}

(async () => {
  const C = await import('file://' + path.join(__dirname, 'workers/api/teacher/content-core.js'));
  const NOW = 1_800_000_000_000;

  /* ---------- 1. Kesetaraan enum dengan inti FIEZEL --------------------------- */
  // Sumber kebenaran inti dibaca dari BERKASNYA, bukan diketik ulang di gerbang:
  // gerbang yang menyalin nilai hanya menguji dirinya sendiri.
  const journey = fs.readFileSync(path.join(__dirname, 'features/personal-journey/fiezel-personal-journey.js'), 'utf8');
  const coreBrain = fs.readFileSync(path.join(__dirname, 'features/brain/fiezel-core-brain.js'), 'utf8');
  const skillLine = journey.match(/var SKILLS = \[([^\]]+)\]/);
  const levelLine = coreBrain.match(/var LEVELS = Object\.freeze\(\[([^\]]+)\]\)/);
  assert(!!skillLine, 'enum SKILLS inti ditemukan di fiezel-personal-journey.js');
  assert(!!levelLine, 'enum LEVELS inti ditemukan di fiezel-core-brain.js');
  const coreSkills = skillLine[1].split(',').map((s) => s.trim().replace(/['"]/g, ''));
  const coreLevels = levelLine[1].split(',').map((s) => s.trim().replace(/['"]/g, ''));
  assert(JSON.stringify(C.SKILLS.slice()) === JSON.stringify(coreSkills),
    'SKILLS konten guru SETARA enum inti (' + coreSkills.join(',') + ')');
  assert(JSON.stringify(C.LEVELS.slice()) === JSON.stringify(coreLevels),
    'LEVELS konten guru SETARA enum CEFR inti');

  /* ---------- 2. Hierarki ----------------------------------------------------- */
  assert(C.parentKindOf('subject') === null, 'subject adalah akar');
  assert(C.parentKindOf('course') === 'subject', 'induk course = subject');
  assert(C.parentKindOf('topic') === 'course', 'induk topic = course');
  assert(C.parentKindOf('lesson') === 'topic', 'induk lesson = topic');

  const guruA = 'sub-guru-A';
  const guruB = 'sub-guru-B';
  const subjectA = { id: 'n1', kind: 'subject', teacher_sub: guruA, status: 'PUBLISHED' };
  const courseA = { id: 'n2', kind: 'course', teacher_sub: guruA, status: 'PUBLISHED' };
  const topicA = { id: 'n3', kind: 'topic', teacher_sub: guruA, status: 'PUBLISHED' };

  assert(C.checkParent({ kind: 'subject', parent: null, teacherSub: guruA }) === null,
    'subject tanpa induk DITERIMA');
  assert(C.checkParent({ kind: 'subject', parent: subjectA, teacherSub: guruA }).problem
    === C.CONTENT_PROBLEM.PARENT_FORBIDDEN, 'subject ber-induk DITOLAK');
  assert(C.checkParent({ kind: 'course', parent: null, teacherSub: guruA }).problem
    === C.CONTENT_PROBLEM.PARENT_REQUIRED, 'course tanpa induk DITOLAK');
  assert(C.checkParent({ kind: 'lesson', parent: courseA, teacherSub: guruA }).problem
    === C.CONTENT_PROBLEM.PARENT_KIND_MISMATCH, 'lesson di bawah course DITOLAK (harus topic)');
  assert(C.checkParent({ kind: 'lesson', parent: topicA, teacherSub: guruA }) === null,
    'lesson di bawah topic DITERIMA');
  // Penahan IDOR: menggantung konten di pohon guru lain.
  assert(C.checkParent({ kind: 'lesson', parent: topicA, teacherSub: guruB }).problem
    === C.CONTENT_PROBLEM.PARENT_NOT_OWNED, 'guru B TIDAK bisa menggantung lesson di pohon guru A');
  assert(C.checkParent({ kind: 'chapter', parent: null, teacherSub: guruA }).problem
    === C.CONTENT_PROBLEM.KIND_INVALID, 'tingkat hierarki karangan DITOLAK');

  /* ---------- 3. Validasi node ------------------------------------------------ */
  const lessonInput = {
    kind: 'lesson', title: 'Hotel Check-in', description: 'Menyambut tamu di meja depan.',
    objective: 'Murid bisa menangani check-in tamu.', skill: 'vocabulary', level: 'A2',
    difficulty: 2, durationMin: 25, tags: ['hospitality', 'check-in'],
    vocabulary: ['reservation', 'check-in', 'checkout', 'room key']
  };
  const okLesson = C.validateNode(lessonInput, NOW);
  assert(okLesson.ok === true, 'lesson lengkap lolos validasi');
  assert(okLesson.node.status === 'DRAFT',
    'konten baru SELALU lahir DRAFT, apa pun status yang dikirim klien');
  assert(okLesson.node.content_source === 'TEACHER', 'konten guru ditandai sumber TEACHER (§17)');
  assert(okLesson.node.vocabulary.length === 4, 'kosakata lesson tersimpan');

  const forcedPublish = C.validateNode({ ...lessonInput, status: 'PUBLISHED' }, NOW);
  assert(forcedPublish.node.status === 'DRAFT',
    'klien TIDAK bisa menerbitkan lewat bidang status saat membuat');

  assert(has(C.validateNode({ ...lessonInput, title: '   ' }, NOW), C.CONTENT_PROBLEM.TITLE_EMPTY),
    'judul kosong DITOLAK');
  assert(has(C.validateNode({ ...lessonInput, skill: 'kungfu' }, NOW), C.CONTENT_PROBLEM.SKILL_INVALID),
    'skill di luar enum DITOLAK');
  assert(has(C.validateNode({ ...lessonInput, level: 'D9' }, NOW), C.CONTENT_PROBLEM.LEVEL_INVALID),
    'CEFR di luar enum DITOLAK');
  assert(has(C.validateNode({ ...lessonInput, difficulty: 9 }, NOW), C.CONTENT_PROBLEM.DIFFICULTY_INVALID),
    'kesulitan di luar 1..5 DITOLAK');
  assert(has(C.validateNode({ ...lessonInput, difficulty: 2.5 }, NOW), C.CONTENT_PROBLEM.DIFFICULTY_INVALID),
    'kesulitan pecahan DITOLAK (skala bilangan bulat)');
  assert(has(C.validateNode({ ...lessonInput, durationMin: 10000 }, NOW), C.CONTENT_PROBLEM.DURATION_INVALID),
    'durasi tak masuk akal DITOLAK');
  assert(has(C.validateNode({ ...lessonInput, skill: undefined }, NOW), C.CONTENT_PROBLEM.SKILL_INVALID),
    'lesson WAJIB berskill (Braincore membacanya)');
  assert(C.validateNode({ kind: 'subject', title: 'English for Hospitality' }, NOW).ok === true,
    'subject TIDAK wajib berskill/CEFR — sebuah mata pelajaran tidak punya satu CEFR');

  // Seluruh masalah dilaporkan sekaligus.
  const manyBad = C.validateNode({ kind: 'lesson', title: '', skill: 'x', level: 'y', difficulty: 99 }, NOW);
  assert(manyBad.ok === false && manyBad.problems.length >= 4,
    'validasi melaporkan SEMUA masalah sekaligus, bukan berhenti di yang pertama');

  // Normalisasi dilaporkan sebagai peringatan, bukan diam-diam.
  const normalized = C.validateNode({ ...lessonInput, level: ' a2 ', skill: 'Vocabulary' }, NOW);
  assert(normalized.ok === true, 'nilai yang bisa dinormalkan tetap diterima');
  assert(normalized.warnings.some((w) => w.field === 'level' && w.to === 'A2'),
    'normalisasi CEFR DILAPORKAN sebagai peringatan (§8)');
  assert(normalized.warnings.some((w) => w.field === 'skill' && w.to === 'vocabulary'),
    'normalisasi skill DILAPORKAN');

  /* ---------- 4. Validasi soal ------------------------------------------------ */
  const q = {
    lessonId: 'n4', type: 'mcq', stem: 'I have a ___ under the name Putri.',
    options: ['reservation', 'receipt', 'reception', 'refund'], answer: 'reservation',
    explanation: 'Reservation = pemesanan di muka.', skill: 'vocabulary', level: 'A2', difficulty: 2
  };
  assert(C.validateQuestion(q, NOW).ok === true, 'soal MCQ lengkap lolos');
  assert(C.validateQuestion(q, NOW).question.status === 'DRAFT', 'soal baru lahir DRAFT');

  assert(has(C.validateQuestion({ ...q, answer: 'kamar' }, NOW),
    C.CONTENT_PROBLEM.QUESTION_ANSWER_NOT_IN_OPTIONS),
  'jawaban benar DI LUAR opsi DITOLAK — soal mustahil menghasilkan bukti palsu');
  assert(has(C.validateQuestion({ ...q, answer: '' }, NOW), C.CONTENT_PROBLEM.QUESTION_ANSWER_MISSING),
    'soal tanpa kunci jawaban DITOLAK');
  assert(has(C.validateQuestion({ ...q, options: ['satu'] }, NOW), C.CONTENT_PROBLEM.QUESTION_OPTIONS_TOO_FEW),
    'MCQ dengan satu opsi DITOLAK');
  assert(has(C.validateQuestion({ ...q, options: ['a', 'A', 'b'], answer: 'a' }, NOW),
    C.CONTENT_PROBLEM.QUESTION_OPTION_DUPLICATE), 'opsi duplikat (beda kapital) DITOLAK');
  assert(has(C.validateQuestion({ ...q, type: 'tebak-tebakan' }, NOW), C.CONTENT_PROBLEM.QUESTION_TYPE_INVALID),
    'tipe soal karangan DITOLAK');
  assert(has(C.validateQuestion({ ...q, stem: '' }, NOW), C.CONTENT_PROBLEM.QUESTION_STEM_EMPTY),
    'batang soal kosong DITOLAK');
  assert(has(C.validateQuestion({ ...q, lessonId: '' }, NOW), C.CONTENT_PROBLEM.QUESTION_LESSON_MISSING),
    'soal tanpa lesson DITOLAK (soal yatim tidak bisa ditugaskan)');
  assert(C.validateQuestion({ ...q, type: 'short_answer', options: [], answer: 'reservation' }, NOW).ok === true,
    'short_answer tidak butuh opsi');
  assert(C.validateQuestion({ ...q, type: 'speaking_prompt', options: [], answer: 'Good morning, sir.' }, NOW).ok === true,
    'speaking_prompt dinilai terhadap acuan, bukan pilihan');
  assert(C.questionNeedsOptions('mcq') === true && C.questionNeedsOptions('short_answer') === false,
    'tipe berpilihan dibedakan dari tipe beracuan');

  /* ---------- 5. Mesin status terbit ------------------------------------------ */
  assert(C.checkTransition('DRAFT', 'PUBLISHED') === null, 'DRAFT -> PUBLISHED diizinkan');
  assert(C.checkTransition('PUBLISHED', 'DRAFT') === null,
    'PUBLISHED -> DRAFT diizinkan (tarik kembali tanpa memutus ID stabil)');
  assert(C.checkTransition('PUBLISHED', 'ARCHIVED') === null, 'PUBLISHED -> ARCHIVED diizinkan');
  assert(C.checkTransition('ARCHIVED', 'DRAFT') === null, 'ARCHIVED -> DRAFT diizinkan (pemulihan)');
  assert(C.checkTransition('ARCHIVED', 'PUBLISHED') !== null,
    'ARCHIVED -> PUBLISHED DITOLAK: wajib lewat draft + validasi lagi');
  assert(C.checkTransition('DRAFT', 'DIHAPUS') !== null, 'status karangan DITOLAK');

  const lessonNode = { id: 'n4', kind: 'lesson', status: 'DRAFT' };
  const validQ = { ...C.validateQuestion(q, NOW).question, id: 'q1' };
  assert(C.checkPublishReady({ node: lessonNode, questions: [validQ], ancestors: [] }) === null,
    'lesson bersoal sah siap terbit');
  assert(C.checkPublishReady({ node: lessonNode, questions: [], ancestors: [] }).problem
    === C.CONTENT_PROBLEM.PUBLISH_NO_QUESTIONS,
  'lesson TANPA soal TIDAK boleh terbit — murid akan menemukan halaman kosong');
  assert(C.checkPublishReady({
    node: lessonNode, questions: [{ ...validQ, answer: 'di-luar-opsi' }], ancestors: []
  }).problem === C.CONTENT_PROBLEM.PUBLISH_QUESTION_INVALID,
  'soal rusak memblokir penerbitan — gerbang terakhir sebelum murid melihatnya');
  assert(C.checkPublishReady({
    node: lessonNode, questions: [validQ], ancestors: [{ id: 'n3', status: 'DRAFT' }]
  }).problem === C.CONTENT_PROBLEM.PUBLISH_PARENT_DRAFT,
  'induk masih DRAFT memblokir penerbitan anak (konten tanpa jalan navigasi)');
  assert(C.checkPublishReady({ node: { id: 'n1', kind: 'subject', status: 'DRAFT' }, ancestors: [] }) === null,
    'subject tidak butuh soal untuk terbit');

  /* ---------- 6. Versi -------------------------------------------------------- */
  const created = C.versionStamp({ isCreate: true, actorSub: guruA, nowMs: NOW });
  assert(created.version === 1 && created.created_by === guruA, 'konten baru = versi 1');
  const updated = C.versionStamp({ record: created, actorSub: guruB, nowMs: NOW + 5000 });
  assert(updated.version === 2, 'sunting menaikkan versi');
  assert(updated.created_at === NOW && updated.created_by === guruA,
    'created_at/created_by TIDAK PERNAH ditimpa pembaruan — itu yang membuatnya jejak');
  assert(updated.updated_by === guruB && updated.updated_at === NOW + 5000, 'updated_* mengikuti penyunting');
  assert(C.nextVersion(0) === 1 && C.nextVersion(null) === 1 && C.nextVersion(7) === 8,
    'versi rusak/absen pulih ke 1, bukan NaN');

  /* ---------- 7. Isolasi & lingkup (§18, §19) --------------------------------- */
  const privat = { id: 'n9', teacher_sub: guruA, institution_id: 'inst1', scope: 'private', status: 'PUBLISHED' };
  const seInstitusi = { ...privat, scope: 'institution' };
  const viewerA = { sub: guruA, institutionId: 'inst1' };
  const viewerB = { sub: guruB, institutionId: 'inst1' };
  const viewerLuar = { sub: guruB, institutionId: 'inst2' };

  assert(C.canTeacherRead(privat, viewerA) === true, 'guru membaca konten sendiri');
  assert(C.canTeacherRead(privat, viewerB) === false,
    'guru B TIDAK melihat konten PRIVAT guru A meski satu institusi (§18)');
  assert(C.canTeacherRead(seInstitusi, viewerB) === true,
    'berbagi se-institusi berlaku hanya bila EKSPLISIT');
  assert(C.canTeacherRead(seInstitusi, viewerLuar) === false, 'institusi lain tetap tidak melihat');
  assert(C.canTeacherRead({ ...seInstitusi, institution_id: null }, viewerB) === false,
    'lingkup institusi tanpa institution_id = fail-closed');
  assert(C.canTeacherWrite(seInstitusi, viewerB) === false,
    'berbagi se-institusi adalah BACA, bukan TULIS');
  assert(C.canTeacherWrite(privat, viewerA) === true, 'hanya pemilik yang menulis');

  const murid = { sub: 'murid1', assignedNodeIds: ['n9'] };
  const muridLain = { sub: 'murid2', assignedNodeIds: [] };
  assert(C.canLearnerSee(privat, murid) === true, 'murid yang ditugaskan melihat konten terbit');
  assert(C.canLearnerSee(privat, muridLain) === false,
    'murid TANPA penugasan TIDAK melihatnya — terbit != publik (§5)');
  assert(C.canLearnerSee({ ...privat, status: 'DRAFT' }, murid) === false,
    'draf tidak pernah terlihat murid meski ditugaskan');

  const view = C.publicNodeView({ ...privat, kind: 'lesson', title: 'Hotel Check-in', created_by: guruA });
  for (const leaked of ['teacher_sub', 'institution_id', 'created_by', 'updated_by', 'scope']) {
    assert(!(leaked in view), 'tampilan murid TIDAK memuat ' + leaked);
  }
  assert(view.contentSource === 'TEACHER', 'tampilan murid tetap menyatakan asal konten');

  /* ---------- Laporan -------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  console.log('teacher-content-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('teacher-content-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('teacher-content-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
