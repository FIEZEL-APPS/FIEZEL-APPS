-- ============================================================================
-- FIEZEL — migrasi NAMA LEARNER (D1: fiezel-core, binding CORE_DB/DB).
-- Otoritas: keputusan OWNER 2 Sep 2026 — "nama wajib diisi saat onboarding, dan
-- nama itu harus menjadi identitas learner di server, terikat identity.sub".
--
-- ############################################################################
-- #  BACA INI SEBELUM MENGUBAH APA PUN                                        #
-- #                                                                          #
-- #  1. KENAPA TABEL SENDIRI, BUKAN KOLOM DI `identity`. `0001_identity.sql`  #
-- #     memuat DAFTAR KERAS yang melarang nama/nama panggilan/email masuk ke  #
-- #     tabel itu, dengan alasan operasional yang masih berlaku: `identity`   #
-- #     adalah fakta yang JARANG berubah dan dibaca di jalur panas setiap     #
-- #     permintaan. Nama boleh berubah kapan saja murid mau. Menaruhnya di    #
-- #     sana berarti menulis ke tabel jalur-panas untuk alasan tampilan.      #
-- #     Larangan itu TIDAK dilemahkan oleh berkas ini — ia dihormati dengan   #
-- #     memberi nama tempatnya sendiri.                                       #
-- #                                                                          #
-- #  2. `sub` TETAP kunci teknis. Nama TIDAK PERNAH menjadi primary key,      #
-- #     tidak unik, dan tidak dipakai untuk mencocokkan apa pun. Murid yang   #
-- #     mengganti namanya tetap `sub` yang sama, jadi seluruh bukti dan       #
-- #     riwayatnya tetap melekat — itulah gunanya memisahkan keduanya.        #
-- #                                                                          #
-- #  3. NAMA DATANG DARI SERVER-SIDE IDENTITY. Rute penulisnya mengambil      #
-- #     `sub` dari cookie fz_id ber-HMAC; body HANYA boleh memuat `name`.     #
-- #     Body yang menitipkan `sub`/`userId` ditolak 400, bukan diabaikan.     #
-- #                                                                          #
-- #  4. YANG BOLEH ADA DI SINI HANYA NAMA PANGGILAN. DILARANG menambah:       #
-- #     nama lengkap, email, nomor telepon, sekolah, kelas, umur, tanggal     #
-- #     lahir, foto, IP, user-agent, atau sidik perangkat. Satu kolom teks    #
-- #     bebas di tabel identitas adalah satu kolom terlalu banyak; `name`     #
-- #     sudah menjadi pengecualian yang diputuskan owner, dan pengecualian    #
-- #     kedua butuh keputusan kedua.                                          #
-- #                                                                          #
-- #  5. RETENSI 180 HARI TANPA AKTIVITAS, angka yang SAMA dengan lane bukti   #
-- #     per-murid (LEARNER_EVIDENCE_LIMITS.RETENTION_DAYS). Klien menyegarkan #
-- #     `name_day` maksimum SEKALI SEHARI, jadi nama murid yang masih memakai #
-- #     FIEZEL tidak pernah kedaluwarsa, dan nama yang ditinggalkan hilang    #
-- #     sendiri. Lihat docs/D1-RETENTION.md §2.8.                             #
-- ############################################################################
-- ============================================================================

-- Satu baris per murid. `name` = nama panggilan yang DIKETIK murid di langkah
-- pertama perkenalan (wajib, tidak bisa dilewati), sudah dinormalkan server:
-- karakter kendali dan kurung sudut dibuang, spasi dirapikan, maksimum 24
-- karakter — aturan yang SAMA dengan `normalizeName()` di
-- features/onboarding/fiezel-onboarding.js. Dua normalisasi yang berbeda untuk
-- satu nilai berarti nama yang tampil di HP murid dan di dashboard owner
-- pelan-pelan menyimpang.
CREATE TABLE IF NOT EXISTS learner_name (
  sub        TEXT    NOT NULL PRIMARY KEY,  -- identity.sub; DITURUNKAN cookie, bukan dari body
  name       TEXT    NOT NULL,              -- nama panggilan; BUKAN kunci, BUKAN unik
  name_day   TEXT    NOT NULL,              -- 'YYYY-MM-DD' penulisan terakhir (retensi + rem tulis)
  updated_at INTEGER NOT NULL               -- epoch ms jam server
);

-- Purge retensi 180 hari. Satu-satunya pola baca yang boleh nyaman di tabel ini
-- selain "nama milik sub ini" — tidak ada indeks atas `name`, dan itu disengaja:
-- mencari murid BERDASARKAN NAMA tidak boleh menjadi operasi yang murah.
-- DIPAKAI purgeLearnerNames (learner-evidence-store-d1.js):
--   'DELETE FROM learner_name WHERE name_day < ?1'
CREATE INDEX IF NOT EXISTS idx_learner_name_day ON learner_name(name_day);
