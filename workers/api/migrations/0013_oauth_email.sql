-- 0013_oauth_email.sql — IDENTITAS GOOGLE dan EMAIL.
--
-- DITURUNKAN OTOMATIS dari workers/api/auth-schema.js oleh
-- `node tools/gen-auth-migrations.mjs`. JANGAN sunting berkas ini langsung.
--
-- ==========================================================================
-- KENAPA BERKAS INI MENCABUT SEBAGIAN LARANGAN EMAIL 0011 — DAN SEBERAPA JAUH
-- ==========================================================================
-- Kepala 0011_auth_roles.sql menulis: "Menambahkan email demi pemulihan kata
-- sandi adalah KEPUTUSAN OWNER TERSENDIRI, bukan sesuatu yang boleh
-- diselundupkan lewat paket kerja ini."
--
-- Keputusan itu diambil OWNER pada 6 September 2026, dengan alasan yang
-- dinyatakan sendiri: MENGHUBUNGI ORANG TUA ATAU SEKOLAH. Itu keperluan yang
-- tidak bisa dipenuhi tanpa alamat email, dan berbeda dari "pemulihan kata
-- sandi" yang dulu ditolak (untuk itu hash email sudah cukup).
--
-- Yang DICABUT hanya satu baris dari daftar keras: kolom email, dan HANYA di
-- tabel `auth_email` yang dibuat berkas ini. Sisa daftar keras 0001/0006/0011
-- BERLAKU UTUH dan tidak dinegosiasikan: nama asli murid, sekolah murid, umur,
-- nomor HP, IP mentah, User-Agent, jawaban/riwayat/transkrip, dan kolom teks
-- bebas antar pengguna. `tests/auth-schema-contract-test.js` mempersempit
-- assert-nya, BUKAN menghapusnya.
--
-- ==========================================================================
-- KENAPA TABEL SENDIRI, BUKAN KOLOM DI auth_account
-- ==========================================================================
-- Dua alasan, keduanya mengikat:
--   1. Migrasi di repo ini HANYA CREATE TABLE/INDEX IF NOT EXISTS — nol ALTER
--      (gerbang kontrak). Menambah kolom ke auth_account mustahil tanpa ALTER.
--   2. Alasan yang sama dengan `auth_credential`: jalur panas yang membaca
--      akun tidak pernah menyeret email ikut, jadi email tidak singgah di jalur
--      log/telemetri mana pun. Pemisahan itu bukan gaya, itu pagar.
--
-- ==========================================================================
-- KENAPA provider_sub, BUKAN EMAIL, YANG MENJADI KUNCI LOGIN
-- ==========================================================================
-- `auth_oauth_identity` memetakan (provider, provider_sub) -> sub. provider_sub
-- adalah klaim `sub` dari ID token Google: buram, stabil seumur akun, dan tidak
-- pernah dipakai ulang orang lain. EMAIL BISA BERGANTI PEMILIK — alamat sekolah
-- yang dilepas dan diberikan ke murid baru adalah kejadian biasa. Memakai email
-- sebagai kunci login berarti murid baru itu mewarisi akun pendahulunya.
-- Email karena itu ATRIBUT (auth_email), bukan kunci.
--
-- `auth_email` sengaja TIDAK unik: dua akun boleh berbagi email orang tua.
--
-- PRIMARY KEY (provider, provider_sub) menutup penyalahgunaan yang PALING
-- berbahaya: satu akun Google tidak bisa tertaut ke dua akun FIEZEL. Percobaan
-- kedua GAGAL di tingkat basis data, bukan memindahkan tautan diam-diam ke akun
-- penyerang.
--
-- Arah sebaliknya — satu akun FIEZEL menumpuk dua akun Google — SENGAJA belum
-- dijaga indeks di sini. UNIQUE (sub, provider) akan menjaganya, tetapi
-- `tests/d1-schema-contract-test.js` menuntut setiap indeks punya kueri NYATA
-- yang memakainya, dan rutenya (`route-auth-google.js`) belum ditulis. Indeks
-- tanpa pembaca adalah baris tertulis sia-sia pada setiap INSERT selamanya. Ia
-- ditambahkan BERSAMA rutenya — pola yang sama dengan enam indeks lain yang
-- sengaja absen di 0011/0012. Sampai saat itu, penumpukan dua akun Google pada
-- satu `sub` bukan pengambilalihan (keduanya login yang pemiliknya buktikan
-- sendiri), hanya berbagi akun.
-- `sub` YANG SUDAH ADA TIDAK PERNAH DIGANTI saat menautkan. Mengganti sub
-- berarti murid kehilangan keanggotaan kelas, seluruh laporan yang sudah
-- dilihat gurunya, daftar teman, dan notifikasinya — 16 tabel berkunci sub.
-- Login Google MENEMPEL pada identitas yang ada; ia bukan identitas baru.

CREATE TABLE IF NOT EXISTS auth_oauth_identity (
  provider TEXT NOT NULL,
  provider_sub TEXT NOT NULL,
  sub TEXT NOT NULL,
  linked_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_sub)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS auth_email (
  sub TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  updated_at INTEGER NOT NULL
) WITHOUT ROWID;

-- DIPAKAI: penautan Google memeriksa apakah akun ini SUDAH menaut satu akun Google; PRIMARY KEY tabel berawalan `provider`, jadi ia tidak melayani arah ini.
-- workers/api/route-auth-google.js (routeAuthGoogle, kasus B)
-- 'SELECT provider_sub FROM auth_oauth_identity WHERE sub = ?1 AND provider = ?2'
CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_oauth_sub_provider ON auth_oauth_identity (sub, provider);
