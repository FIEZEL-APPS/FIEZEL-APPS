/**
 * tools/gen-auth-migrations.mjs — MENURUNKAN `migrations/0011_auth_roles.sql` dan
 * `migrations/0012_teacher_content.sql` dari DDL runtime `workers/api/auth-schema.js`.
 *
 * ==========================================================================
 * KENAPA DITURUNKAN, BUKAN DIKETIK DUA KALI
 * ==========================================================================
 * Repo ini menuntut berkas migrasi (sumber resmi) dan DDL runtime (jalur
 * `ensureAuthSchema`, ada karena token CI tidak bisa `wrangler d1 execute
 * --remote`) SETARA pernyataan-per-pernyataan — `tests/auth-schema-contract-test.js`
 * memerahkan selisihnya. Dua berkas yang wajib identik dan ditulis tangan akan
 * menyimpang pada suntingan berikutnya; yang satu diturunkan dari yang lain
 * tidak bisa.
 *
 * Jalankan sesudah mengubah `auth-schema.js`:
 *     node tools/gen-auth-migrations.mjs
 *
 * ==========================================================================
 * BUKTI PEMAKAIAN INDEKS (INDEX_PROOF di bawah)
 * ==========================================================================
 * `tests/d1-schema-contract-test.js` menolak indeks yang tidak punya kueri nyata yang
 * memakainya — pada plan gratis, indeks tanpa kueri adalah baris tertulis
 * sia-sia pada setiap INSERT selamanya. Gerbang itu TIDAK menerima komentar
 * sebagai bukti dengan sendirinya: string kueri yang dikutip harus BENAR-BENAR
 * ada sebagai SQL di kode Worker, harus menyentuh tabel indeks itu, dan kolom
 * PERTAMA indeks harus muncul di bagian penyaring (WHERE/ORDER BY/GROUP BY).
 *
 * Karena itu setiap entri di bawah adalah salinan kueri yang sungguh dikirim ke
 * D1. Kalau kueri itu diubah di rute, gerbang akan merah di sini — dan itu
 * memang perilaku yang diinginkan: indeks yang kuerinya hilang harus ikut
 * dipertimbangkan ulang, bukan ditinggalkan menua diam-diam.
 *
 * ENAM indeks SENGAJA TIDAK ADA meski tabelnya ada: `friend_request`,
 * `notification`, `push_subscription`, `tc_node(parent_id)`,
 * `tc_assignment_target(learner_sub)`, dan `tc_lesson_evidence(lesson_id)`.
 * Alasannya sama untuk semuanya — rute yang akan MEMBACA lewat kolom-kolom itu
 * belum ditulis, jadi indeksnya hari ini murni biaya tulis tanpa satu pun
 * pembacaan yang mempercepatnya. Ia ditambahkan bersama rutenya, bukan
 * sebelumnya. (`tc_lesson_evidence` juga sudah dilayani PRIMARY KEY-nya sendiri,
 * yang berawalan `lesson_id`.)
 */

import { writeFileSync } from 'node:fs';
import { AUTH_DDL, TEACHER_DDL } from '../workers/api/auth-schema.js';

/** Kueri NYATA yang membuat setiap indeks layak ditulis. Disalin dari rute. */
const INDEX_PROOF = {
  ux_auth_account_handle: {
    why: 'login menukar handle -> akun, satu-satunya jalur masuk kata sandi',
    from: 'workers/api/route-account.js (routeAccountLogin)',
    query: 'SELECT sub, role, login_handle, status, institution_id FROM auth_account '
      + 'WHERE login_handle = ?1'
  },
  ix_tc_node_owner: {
    why: 'pohon konten guru — perjalanan terpanas dasbor guru',
    from: 'workers/api/route-teacher.js (routeTeacherTree)',
    query: 'SELECT * FROM tc_node WHERE teacher_sub = ?1 ORDER BY kind, title LIMIT 2000'
  },
  ix_tc_question_lesson: {
    why: 'soal satu lesson saat pratinjau, penerbitan, dan ekspor',
    from: 'workers/api/route-teacher.js (routeQuestionList, routeCsvExport)',
    query: 'SELECT * FROM tc_question WHERE teacher_sub = ?1 AND lesson_id = ?2 LIMIT 1000'
  },
  ux_tc_question_dedup: {
    why: 'PENEGAK §12 — impor CSV yang sama dua kali tidak boleh menghasilkan '
      + 'duplikat; sekaligus melayani pembacaan konteks impor',
    from: 'workers/api/route-teacher.js (importContext)',
    query: 'SELECT id, lesson_id, type, stem FROM tc_question WHERE teacher_sub = ?1'
  },
  ix_tc_assignment_owner: {
    why: 'laporan kelas menelusuri penugasan milik guru pemanggil',
    from: 'workers/api/route-teacher.js (routeTeacherProgress)',
    query: 'SELECT t.learner_sub FROM tc_assignment_target t JOIN tc_assignment a '
      + 'ON a.id = t.assignment_id WHERE a.lesson_id = ?1 AND a.teacher_sub = ?2'
  }
};

/** Ubah satu pernyataan DDL satu-baris menjadi bentuk berkas migrasi. */
function pretty(stmt) {
  const index = /^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS (\w+)/.exec(stmt);
  if (index) {
    const proof = INDEX_PROOF[index[1]];
    if (!proof) {
      throw new Error(
        'indeks `' + index[1] + '` tidak punya entri INDEX_PROOF. Tambahkan kueri '
        + 'NYATA yang memakainya, atau buang indeksnya — tests/d1-schema-contract-test.js '
        + 'akan menolaknya juga.'
      );
    }
    return `-- DIPAKAI: ${proof.why}.\n-- ${proof.from}\n-- '${proof.query}'\n${stmt};`;
  }

  const m = stmt.match(/^(CREATE TABLE IF NOT EXISTS \w+ \()(.*)(\)\s*(WITHOUT ROWID)?)$/);
  if (!m) return stmt + ';';
  const cols = [];
  let depth = 0;
  let cur = '';
  for (const ch of m[2]) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { cols.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) cols.push(cur.trim());
  return m[1] + '\n  ' + cols.join(',\n  ') + '\n' + (m[4] ? ') WITHOUT ROWID;' : ');');
}

const HEAD_AUTH = `-- 0011_auth_roles.sql — skema AKUN, PERAN, UNDANGAN GURU, dan lapisan sosial
-- lanjutan (permintaan teman, notifikasi, langganan push). Database tujuan:
-- fiezel-core (binding CORE_DB), alasan yang sama dengan 0006_social.sql: token
-- CI tidak punya izin \`wrangler d1 create\`, jadi tabel per-pengguna hidup di
-- fiezel-core bersama identitas & kuota — dan TETAP HARAM di fiezel-stats.
--
-- DITURUNKAN OTOMATIS dari workers/api/auth-schema.js oleh
-- \`node tools/gen-auth-migrations.mjs\`. JANGAN sunting berkas ini langsung:
-- ubah DDL di auth-schema.js lalu jalankan ulang generatornya.
--
-- PENERAPAN: token CI juga tidak bisa \`wrangler d1 execute --remote\`. Runtime
-- punya \`ensureAuthSchema()\` yang menerapkan DDL YANG SAMA secara idempoten.
-- Berkas ini TETAP SUMBER RESMI; gerbang \`tests/auth-schema-contract-test.js\`
-- menegakkan keduanya setara pernyataan-per-pernyataan (ternormalisasi).
--
-- ==========================================================================
-- KATA SANDI, DAN KENAPA IA TIDAK MELANGGAR DAFTAR KERAS BAB 29
-- ==========================================================================
-- Kepala 0001_identity.sql melarang "password atau token apa pun" DI TABEL
-- \`identity\`. Larangan itu tidak dicabut: \`identity\` tetap bersih. Kredensial
-- hidup di \`auth_credential\` yang TERPISAH, dan pemisahan itu berguna nyata —
-- jalur panas yang membaca identitas tidak pernah menyeret kolom hash ikut,
-- jadi hash tidak singgah di jalur log/telemetri mana pun.
--
-- Yang disimpan BUKAN kata sandi melainkan turunan PBKDF2-HMAC-SHA256 ber-salt
-- 210.000 iterasi (workers/api/auth/password-core.js). Kata sandi mentah tidak
-- pernah ditulis ke kolom, log, atau analytics mana pun.
--
-- TIDAK ADA KOLOM EMAIL — dan itu mengikat. Login memakai \`login_handle\`
-- (pseudonim, aturan sanitasi yang sama dengan \`social_handle\`). Email ada di
-- daftar keras PII bab 29 dan FIEZEL dipakai anak-anak. Menambahkannya demi
-- "pemulihan kata sandi" adalah keputusan owner tersendiri, bukan sesuatu yang
-- boleh diselundupkan lewat paket kerja ini. Konsekuensi yang diterima sadar:
-- murid yang lupa kata sandi butuh reset lewat guru/owner.
--
-- DAFTAR KERAS yang DIWARISI UTUH dari 0001_identity.sql dan 0006_social.sql
-- dan TIDAK BOLEH ditambahkan ke tabel mana pun di berkas ini: nama asli murid,
-- email, sekolah murid, umur, nomor HP, IP mentah, User-Agent, jawaban/riwayat/
-- transkrip, dan KOLOM TEKS BEBAS ANTAR PENGGUNA dalam bentuk apa pun.
--   * \`notification\` karena itu menyimpan \`kind\` (enum) + \`actor_sub\`, TANPA
--     kolom pesan. Naskahnya dirakit KLIEN dari i18n. Satu kolom \`message TEXT\`
--     akan menjadi saluran pesan tak termoderasi antar anak dalam satu rilis.
--   * \`teacher_name\`/\`institution\` DIIZINKAN karena itu teks yang diketik OWNER
--     tentang orang dewasa yang ia rekrut — bukan PII murid.
--
-- UNDANGAN GURU disimpan sebagai \`code_hash\` (sha256), TIDAK PERNAH teks. Token
-- undangan adalah kredensial: siapa pun yang membacanya menjadi guru, jadi dump
-- D1 tidak boleh cukup untuk memakainya. Statusnya (ACTIVE/USED/EXPIRED/REVOKED)
-- DITURUNKAN dari kolom waktu, bukan disimpan: status tersimpan yang butuh cron
-- untuk jadi benar akan berbohong setiap kali cron telat.
--
-- INDEKS: hanya SATU (\`ux_auth_account_handle\`), dan ia UNIQUE karena login
-- menukar handle->akun. \`friend_request\`, \`notification\`, dan
-- \`push_subscription\` SENGAJA tanpa indeks: rute yang membacanya belum ditulis,
-- jadi indeksnya hari ini murni biaya tulis tanpa pembacaan yang dipercepat.
-- Ia ditambahkan bersama rutenya.
`;

const HEAD_TEACHER = `-- 0012_teacher_content.sql — hierarki konten guru (subject/course/topic/lesson),
-- bank soal, penugasan, dan bukti belajar per-lesson. Database tujuan:
-- fiezel-core (binding CORE_DB).
--
-- DITURUNKAN OTOMATIS dari workers/api/auth-schema.js oleh
-- \`node tools/gen-auth-migrations.mjs\`. JANGAN sunting berkas ini langsung.
--
-- ==========================================================================
-- SATU TABEL UNTUK EMPAT TINGKAT HIERARKI
-- ==========================================================================
-- subject/course/topic/lesson ada di SATU tabel \`tc_node\` ber-kolom \`kind\`,
-- bukan empat tabel. Keempatnya berbagi 90% kolom (pemilik, judul, status,
-- versi, stempel waktu), dan perjalanan terpanas produk ini adalah "ambil
-- seluruh pohon milik guru X" — satu SELECT ber-\`teacher_sub\`, bukan empat
-- kueri plus penggabungan di memori pada plan gratis.
--
-- HARGA YANG DIBAYAR, disebut supaya jujur: D1 tidak bisa menegakkan "induk
-- sebuah lesson wajib bertipe topic" lewat FK. Penegakannya ada di
-- \`checkParent()\` (workers/api/teacher/content-core.js) dan gerbang
-- \`tests/teacher-content-test.js\` mengujinya langsung. Aturan yang ditegakkan kode
-- WAJIB punya gerbang; itu syarat memilih desain ini.
--
-- TANPA FK CASCADE lintas paket (pola yang sama dengan 0006_social.sql) supaya
-- migrasi ini bisa diterapkan runtime tanpa urutan ketat antar berkas.
--
-- \`ux_tc_question_dedup\` (teacher_sub, dedup_key) ADALAH penegak §12: impor CSV
-- yang sama dua kali tidak boleh menghasilkan duplikat. \`dedup_key\` =
-- lesson+tipe+batang soal ternormalisasi (csv-core.dedupKey). Keunikannya
-- ber-\`teacher_sub\` dan bukan global: dua guru berhak menulis soal yang sama.
--
-- \`content_source\` ada di kedua tabel konten dan nilainya SELALU 'TEACHER' di
-- sini. Kolomnya tetap eksplisit karena Braincore membacanya untuk memisahkan
-- kalibrasi item guru dari prior bank inti (§17) — satu soal guru yang menjebak
-- tidak boleh menggeser prior yang dipakai seluruh pengguna FIEZEL.
--
-- STATUS: DRAFT -> PUBLISHED -> ARCHIVED, transisi ditegakkan
-- \`content-core.checkTransition\`. Default DRAFT ada di DDL dan bukan hanya di
-- kode: konten impor yang belum tervalidasi TIDAK BOLEH sampai ke murid (§13),
-- dan default database adalah pertahanan terakhir kalau ada jalur tulis yang
-- lupa menyetelnya.
--
-- \`tc_lesson_evidence\` memuat BENAR/SALAH per soal per murid — TANPA teks
-- jawaban, TANPA transkrip (larangan bab 29 berlaku penuh). Ia WITHOUT ROWID
-- dengan PRIMARY KEY berawalan \`lesson_id\`, jadi pembacaan laporan kelas sudah
-- dilayani PK-nya sendiri dan TIDAK butuh indeks tambahan.
`;

writeFileSync(
  new URL('../workers/api/migrations/0011_auth_roles.sql', import.meta.url),
  HEAD_AUTH + '\n' + AUTH_DDL.map(pretty).join('\n\n') + '\n'
);
writeFileSync(
  new URL('../workers/api/migrations/0012_teacher_content.sql', import.meta.url),
  HEAD_TEACHER + '\n' + TEACHER_DDL.map(pretty).join('\n\n') + '\n'
);
console.log('gen-auth-migrations: 0011 + 0012 ditulis ulang dari auth-schema.js');
