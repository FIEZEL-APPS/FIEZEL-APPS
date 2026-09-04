-- 0012_teacher_content.sql — hierarki konten guru (subject/course/topic/lesson),
-- bank soal, penugasan, dan bukti belajar per-lesson. Database tujuan:
-- fiezel-core (binding CORE_DB).
--
-- DITURUNKAN OTOMATIS dari workers/api/auth-schema.js oleh
-- `node tools/gen-auth-migrations.mjs`. JANGAN sunting berkas ini langsung.
--
-- ==========================================================================
-- SATU TABEL UNTUK EMPAT TINGKAT HIERARKI
-- ==========================================================================
-- subject/course/topic/lesson ada di SATU tabel `tc_node` ber-kolom `kind`,
-- bukan empat tabel. Keempatnya berbagi 90% kolom (pemilik, judul, status,
-- versi, stempel waktu), dan perjalanan terpanas produk ini adalah "ambil
-- seluruh pohon milik guru X" — satu SELECT ber-`teacher_sub`, bukan empat
-- kueri plus penggabungan di memori pada plan gratis.
--
-- HARGA YANG DIBAYAR, disebut supaya jujur: D1 tidak bisa menegakkan "induk
-- sebuah lesson wajib bertipe topic" lewat FK. Penegakannya ada di
-- `checkParent()` (workers/api/teacher/content-core.js) dan gerbang
-- `teacher-content-test.js` mengujinya langsung. Aturan yang ditegakkan kode
-- WAJIB punya gerbang; itu syarat memilih desain ini.
--
-- TANPA FK CASCADE lintas paket (pola yang sama dengan 0006_social.sql) supaya
-- migrasi ini bisa diterapkan runtime tanpa urutan ketat antar berkas.
--
-- `ux_tc_question_dedup` (teacher_sub, dedup_key) ADALAH penegak §12: impor CSV
-- yang sama dua kali tidak boleh menghasilkan duplikat. `dedup_key` =
-- lesson+tipe+batang soal ternormalisasi (csv-core.dedupKey). Keunikannya
-- ber-`teacher_sub` dan bukan global: dua guru berhak menulis soal yang sama.
--
-- `content_source` ada di kedua tabel konten dan nilainya SELALU 'TEACHER' di
-- sini. Kolomnya tetap eksplisit karena Braincore membacanya untuk memisahkan
-- kalibrasi item guru dari prior bank inti (§17) — satu soal guru yang menjebak
-- tidak boleh menggeser prior yang dipakai seluruh pengguna FIEZEL.
--
-- STATUS: DRAFT -> PUBLISHED -> ARCHIVED, transisi ditegakkan
-- `content-core.checkTransition`. Default DRAFT ada di DDL dan bukan hanya di
-- kode: konten impor yang belum tervalidasi TIDAK BOLEH sampai ke murid (§13),
-- dan default database adalah pertahanan terakhir kalau ada jalur tulis yang
-- lupa menyetelnya.
--
-- `tc_lesson_evidence` memuat BENAR/SALAH per soal per murid — TANPA teks
-- jawaban, TANPA transkrip (larangan bab 29 berlaku penuh). Ia WITHOUT ROWID
-- dengan PRIMARY KEY berawalan `lesson_id`, jadi pembacaan laporan kelas sudah
-- dilayani PK-nya sendiri dan TIDAK butuh indeks tambahan.

CREATE TABLE IF NOT EXISTS tc_node (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  parent_id TEXT,
  teacher_sub TEXT NOT NULL,
  institution_id TEXT,
  scope TEXT NOT NULL DEFAULT 'private',
  title TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  skill TEXT,
  level TEXT,
  difficulty INTEGER NOT NULL DEFAULT 3,
  duration_min INTEGER NOT NULL DEFAULT 0,
  tags TEXT,
  vocabulary TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  content_source TEXT NOT NULL DEFAULT 'TEACHER',
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);

-- DIPAKAI: pohon konten guru — perjalanan terpanas dasbor guru.
-- workers/api/route-teacher.js (routeTeacherTree)
-- 'SELECT * FROM tc_node WHERE teacher_sub = ?1 ORDER BY kind, title LIMIT 2000'
CREATE INDEX IF NOT EXISTS ix_tc_node_owner ON tc_node(teacher_sub, kind);

CREATE TABLE IF NOT EXISTS tc_question (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  teacher_sub TEXT NOT NULL,
  type TEXT NOT NULL,
  stem TEXT NOT NULL,
  options TEXT,
  answer TEXT NOT NULL,
  explanation TEXT,
  example TEXT,
  skill TEXT NOT NULL,
  level TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 3,
  tags TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  content_source TEXT NOT NULL DEFAULT 'TEACHER',
  version INTEGER NOT NULL DEFAULT 1,
  dedup_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);

-- DIPAKAI: soal satu lesson saat pratinjau, penerbitan, dan ekspor.
-- workers/api/route-teacher.js (routeQuestionList, routeCsvExport)
-- 'SELECT * FROM tc_question WHERE teacher_sub = ?1 AND lesson_id = ?2 LIMIT 1000'
CREATE INDEX IF NOT EXISTS ix_tc_question_lesson ON tc_question(lesson_id, status);

-- DIPAKAI: PENEGAK §12 — impor CSV yang sama dua kali tidak boleh menghasilkan duplikat; sekaligus melayani pembacaan konteks impor.
-- workers/api/route-teacher.js (importContext)
-- 'SELECT id, lesson_id, type, stem FROM tc_question WHERE teacher_sub = ?1'
CREATE UNIQUE INDEX IF NOT EXISTS ux_tc_question_dedup ON tc_question(teacher_sub, dedup_key);

CREATE TABLE IF NOT EXISTS tc_assignment (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  teacher_sub TEXT NOT NULL,
  class_code TEXT,
  due_day TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- DIPAKAI: laporan kelas menelusuri penugasan milik guru pemanggil.
-- workers/api/route-teacher.js (routeTeacherProgress)
-- 'SELECT t.learner_sub FROM tc_assignment_target t JOIN tc_assignment a ON a.id = t.assignment_id WHERE a.lesson_id = ?1 AND a.teacher_sub = ?2'
CREATE INDEX IF NOT EXISTS ix_tc_assignment_owner ON tc_assignment(teacher_sub, status);

CREATE TABLE IF NOT EXISTS tc_assignment_target (
  assignment_id TEXT NOT NULL,
  learner_sub TEXT NOT NULL,
  assigned_at INTEGER NOT NULL,
  PRIMARY KEY (assignment_id, learner_sub)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS tc_lesson_evidence (
  lesson_id TEXT NOT NULL,
  learner_sub TEXT NOT NULL,
  question_id TEXT NOT NULL,
  skill TEXT NOT NULL,
  level TEXT NOT NULL,
  correct INTEGER NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (lesson_id, learner_sub, question_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS tc_class (
  code TEXT PRIMARY KEY,
  teacher_sub TEXT NOT NULL,
  title TEXT NOT NULL,
  level TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tc_class_report (
  class_code TEXT NOT NULL,
  learner_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  learner_sub TEXT,
  reported_at INTEGER NOT NULL,
  report_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (class_code, learner_key)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS tc_class_assignment (
  class_code TEXT NOT NULL,
  id TEXT NOT NULL,
  teacher_sub TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  targets_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (class_code, id)
) WITHOUT ROWID;
