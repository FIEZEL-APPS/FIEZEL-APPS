/**
 * workers/api/auth-schema.js — DDL runtime lapisan AKUN/PERAN/KONTEN GURU +
 * penerap idempoten. Pola dan alasannya SAMA PERSIS dengan
 * `workers/api/social-schema.js`, dan itu disengaja: token CI yang men-deploy
 * Worker tidak bisa menjalankan `wrangler d1 execute --remote`, jadi migrasi
 * `migrations/0011_auth_roles.sql` dan `0012_teacher_content.sql` tidak bisa
 * dijamin sudah terpasang saat kode ini tiba di produksi.
 *
 * DUA PAGAR yang membuat ini bukan migrasi bayangan:
 *   1. Berkas migrasi TETAP sumber resmi. Gerbang `auth-schema-contract-test.js`
 *      memerah kalau daftar DDL di bawah tidak setara pernyataan-per-pernyataan
 *      (ternormalisasi) dengan kedua berkas itu.
 *   2. Penerapan di-cache per handle DB (WeakMap): biayanya satu rangkaian
 *      `CREATE TABLE IF NOT EXISTS` per isolate dingin, bukan per permintaan.
 *
 * ==========================================================================
 * KATA SANDI DI DATABASE YANG MELARANG KATA SANDI — DAN KENAPA ITU KONSISTEN
 * ==========================================================================
 * Kepala `0001_identity.sql` melarang "password atau token apa pun" DI TABEL
 * `identity`. Larangan itu TIDAK dicabut dan tidak dilanggar: `identity` tetap
 * tanpa kredensial. Kredensial hidup di tabel TERPISAH `auth_credential`, dan
 * pemisahan itu punya guna nyata, bukan kosmetik — kueri yang membaca identitas
 * (jalur panas, hampir setiap permintaan) tidak pernah menyeret kolom hash
 * ikut serta, sehingga hash tidak pernah singgah di jalur log/telemetri mana pun.
 *
 * Yang disimpan tetap BUKAN kata sandi: `pass_hash` adalah turunan PBKDF2
 * ber-salt (lihat auth/password-core.js). Kata sandi mentah tidak pernah ditulis.
 *
 * TIDAK ADA KOLOM EMAIL, dan ini keputusan yang mengikat: login memakai
 * `login_handle` (pseudonim, aturan yang sama dengan `social_handle`). Email
 * ada di daftar keras PII bab 29 dan FIEZEL dipakai anak-anak; menambahkannya
 * demi "pemulihan kata sandi" adalah pertukaran yang HARUS diputuskan owner
 * secara terpisah, bukan diselundupkan lewat paket kerja ini. Konsekuensinya
 * disebut jujur: murid yang lupa kata sandi butuh bantuan guru/owner untuk
 * reset, dan itu batas yang diterima sadar.
 */

/** Tabel lapisan akun/peran. Dipakai gerbang untuk mengunci cakupan skema. */
export const AUTH_TABLES = Object.freeze([
  'auth_account', 'auth_credential', 'auth_login_handle',
  'teacher_invite', 'teacher_profile',
  'friend_request', 'notification', 'push_subscription'
]);

/** Tabel konten guru. */
export const TEACHER_TABLES = Object.freeze([
  'tc_node', 'tc_question', 'tc_assignment', 'tc_assignment_target', 'tc_lesson_evidence'
]);

/**
 * DDL — WAJIB setara (ternormalisasi spasi) dengan berkas migrasi.
 * Komentar ALASAN hidup di berkas migrasi; di sini hanya pernyataannya.
 */
export const AUTH_DDL = Object.freeze([
  'CREATE TABLE IF NOT EXISTS auth_account (' +
    ' sub TEXT PRIMARY KEY,' +
    ' role TEXT NOT NULL DEFAULT \'learner\',' +
    ' login_handle TEXT NOT NULL,' +
    ' status TEXT NOT NULL DEFAULT \'active\',' +
    ' created_at INTEGER NOT NULL,' +
    ' last_login_at INTEGER,' +
    ' institution_id TEXT' +
    ' )',
  'CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_account_handle ON auth_account(login_handle)',
  'CREATE TABLE IF NOT EXISTS auth_login_handle (' +
    ' handle TEXT PRIMARY KEY,' +
    ' sub TEXT NOT NULL' +
    ' ) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS auth_credential (' +
    ' sub TEXT PRIMARY KEY,' +
    ' pass_hash TEXT NOT NULL,' +
    ' updated_at INTEGER NOT NULL,' +
    ' failed_count INTEGER NOT NULL DEFAULT 0,' +
    ' locked_until INTEGER' +
    ' )',
  'CREATE TABLE IF NOT EXISTS teacher_invite (' +
    ' code_hash TEXT PRIMARY KEY,' +
    ' teacher_name TEXT NOT NULL,' +
    ' institution TEXT NOT NULL,' +
    ' institution_type TEXT NOT NULL,' +
    ' created_at INTEGER NOT NULL,' +
    ' expires_at INTEGER NOT NULL,' +
    ' created_by TEXT NOT NULL,' +
    ' used_at INTEGER,' +
    ' used_by TEXT,' +
    ' revoked_at INTEGER' +
    ' )',
  'CREATE TABLE IF NOT EXISTS teacher_profile (' +
    ' sub TEXT PRIMARY KEY,' +
    ' teacher_name TEXT NOT NULL,' +
    ' institution TEXT NOT NULL,' +
    ' institution_type TEXT NOT NULL,' +
    ' institution_id TEXT NOT NULL,' +
    ' activated_at INTEGER NOT NULL' +
    ' )',
  'CREATE TABLE IF NOT EXISTS friend_request (' +
    ' from_sub TEXT NOT NULL,' +
    ' to_sub TEXT NOT NULL,' +
    ' status TEXT NOT NULL DEFAULT \'PENDING\',' +
    ' created_day TEXT NOT NULL,' +
    ' resolved_day TEXT,' +
    ' PRIMARY KEY (from_sub, to_sub)' +
    ' ) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS notification (' +
    ' id TEXT PRIMARY KEY,' +
    ' sub TEXT NOT NULL,' +
    ' kind TEXT NOT NULL,' +
    ' actor_sub TEXT,' +
    ' ref_id TEXT,' +
    ' day TEXT NOT NULL,' +
    ' created_at INTEGER NOT NULL,' +
    ' read_at INTEGER' +
    ' )',
  'CREATE TABLE IF NOT EXISTS push_subscription (' +
    ' endpoint_hash TEXT PRIMARY KEY,' +
    ' sub TEXT NOT NULL,' +
    ' endpoint TEXT NOT NULL,' +
    ' p256dh TEXT NOT NULL,' +
    ' auth TEXT NOT NULL,' +
    ' created_at INTEGER NOT NULL,' +
    ' failed_count INTEGER NOT NULL DEFAULT 0' +
    ' )',
]);

export const TEACHER_DDL = Object.freeze([
  'CREATE TABLE IF NOT EXISTS tc_node (' +
    ' id TEXT PRIMARY KEY,' +
    ' kind TEXT NOT NULL,' +
    ' parent_id TEXT,' +
    ' teacher_sub TEXT NOT NULL,' +
    ' institution_id TEXT,' +
    ' scope TEXT NOT NULL DEFAULT \'private\',' +
    ' title TEXT NOT NULL,' +
    ' description TEXT,' +
    ' objective TEXT,' +
    ' skill TEXT,' +
    ' level TEXT,' +
    ' difficulty INTEGER NOT NULL DEFAULT 3,' +
    ' duration_min INTEGER NOT NULL DEFAULT 0,' +
    ' tags TEXT,' +
    ' vocabulary TEXT,' +
    ' status TEXT NOT NULL DEFAULT \'DRAFT\',' +
    ' content_source TEXT NOT NULL DEFAULT \'TEACHER\',' +
    ' version INTEGER NOT NULL DEFAULT 1,' +
    ' created_at INTEGER NOT NULL,' +
    ' created_by TEXT NOT NULL,' +
    ' updated_at INTEGER NOT NULL,' +
    ' updated_by TEXT NOT NULL' +
    ' )',
  'CREATE INDEX IF NOT EXISTS ix_tc_node_owner ON tc_node(teacher_sub, kind)',
  'CREATE TABLE IF NOT EXISTS tc_question (' +
    ' id TEXT PRIMARY KEY,' +
    ' lesson_id TEXT NOT NULL,' +
    ' teacher_sub TEXT NOT NULL,' +
    ' type TEXT NOT NULL,' +
    ' stem TEXT NOT NULL,' +
    ' options TEXT,' +
    ' answer TEXT NOT NULL,' +
    ' explanation TEXT,' +
    ' example TEXT,' +
    ' skill TEXT NOT NULL,' +
    ' level TEXT NOT NULL,' +
    ' difficulty INTEGER NOT NULL DEFAULT 3,' +
    ' tags TEXT,' +
    ' status TEXT NOT NULL DEFAULT \'DRAFT\',' +
    ' content_source TEXT NOT NULL DEFAULT \'TEACHER\',' +
    ' version INTEGER NOT NULL DEFAULT 1,' +
    ' dedup_key TEXT NOT NULL,' +
    ' created_at INTEGER NOT NULL,' +
    ' created_by TEXT NOT NULL,' +
    ' updated_at INTEGER NOT NULL,' +
    ' updated_by TEXT NOT NULL' +
    ' )',
  'CREATE INDEX IF NOT EXISTS ix_tc_question_lesson ON tc_question(lesson_id, status)',
  'CREATE UNIQUE INDEX IF NOT EXISTS ux_tc_question_dedup ON tc_question(teacher_sub, dedup_key)',
  'CREATE TABLE IF NOT EXISTS tc_assignment (' +
    ' id TEXT PRIMARY KEY,' +
    ' lesson_id TEXT NOT NULL,' +
    ' teacher_sub TEXT NOT NULL,' +
    ' class_code TEXT,' +
    ' due_day TEXT,' +
    ' status TEXT NOT NULL DEFAULT \'DRAFT\',' +
    ' created_at INTEGER NOT NULL,' +
    ' updated_at INTEGER NOT NULL' +
    ' )',
  'CREATE INDEX IF NOT EXISTS ix_tc_assignment_owner ON tc_assignment(teacher_sub, status)',
  'CREATE TABLE IF NOT EXISTS tc_assignment_target (' +
    ' assignment_id TEXT NOT NULL,' +
    ' learner_sub TEXT NOT NULL,' +
    ' assigned_at INTEGER NOT NULL,' +
    ' PRIMARY KEY (assignment_id, learner_sub)' +
    ' ) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS tc_lesson_evidence (' +
    ' lesson_id TEXT NOT NULL,' +
    ' learner_sub TEXT NOT NULL,' +
    ' question_id TEXT NOT NULL,' +
    ' skill TEXT NOT NULL,' +
    ' level TEXT NOT NULL,' +
    ' correct INTEGER NOT NULL,' +
    ' day TEXT NOT NULL,' +
    ' PRIMARY KEY (lesson_id, learner_sub, question_id)' +
    ' ) WITHOUT ROWID',
]);

/** Seluruh DDL paket ini, urut terapan. */
export const ALL_DDL = Object.freeze([...AUTH_DDL, ...TEACHER_DDL]);

/**
 * Cache per handle DB. WeakMap supaya isolate yang membuang binding-nya tidak
 * menahan entri hidup; `Set` sederhana akan bocor sepanjang umur isolate.
 */
const APPLIED = new WeakMap();

/**
 * ensureAuthSchema(db) -> Promise<void>. Idempoten, aman dipanggil di awal
 * setiap handler paket ini. Kegagalan DILEMPAR, tidak ditelan: skema yang tidak
 * terpasang berarti seluruh jawaban sesudahnya akan salah, dan menjawab 200 atas
 * database yang tidak punya tabel adalah bentuk paling murni dari "melaporkan
 * operasi server sebagai berhasil padahal tidak" (§29).
 */
export async function ensureAuthSchema(db) {
  if (!db || typeof db.prepare !== 'function') throw new Error('auth_schema_no_db');
  if (APPLIED.get(db)) return;
  for (const statement of ALL_DDL) {
    /* eslint-disable no-await-in-loop */
    await db.prepare(statement).run();
  }
  APPLIED.set(db, true);
}

/** Hanya untuk gerbang: melupakan cache supaya urutan terapan bisa diuji ulang. */
export function resetSchemaCacheForTest(db) {
  if (db) APPLIED.delete(db);
}
