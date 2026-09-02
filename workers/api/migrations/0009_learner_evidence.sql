-- ============================================================================
-- FIEZEL — migrasi lane BUKTI BELAJAR PER-MURID Braincore
-- (D1: fiezel-core, binding CORE_DB/DB). Otoritas: BRAIN-DATA-PRIVACY.md §8
-- "Lane bukti per-murid" + reports/BRAINCORE_LEARNER_EVIDENCE_PIPELINE.md.
--
-- ############################################################################
-- #  BACA INI SEBELUM MENGUBAH APA PUN                                        #
-- #                                                                          #
-- #  1. INI BUKAN PENGGANTI LANE AGREGAT. `evidence_daily`,                   #
-- #     `evidence_dedup`, dan `evidence_learner_day` di database              #
-- #     `fiezel-evidence` TETAP ADA, tetap anonim, tetap ber-TTL 14 hari, dan #
-- #     TIDAK disentuh berkas ini. Dua lane, dua pertanyaan: yang itu         #
-- #     "bagaimana Braincore bekerja pada populasi", yang ini "apa yang       #
-- #     Braincore lakukan pada murid INI".                                     #
-- #                                                                          #
-- #  2. KENAPA DI `fiezel-core` DAN BUKAN DI `fiezel-evidence`: karena lane   #
-- #     ini memang beridentitas, dan identitas sudah tinggal di sini          #
-- #     (`identity`, `social_profile`). Menaruh `sub` di database bukti akan  #
-- #     mendudukkannya di sebelah `cohort` — dan sejak detik itu lane agregat #
-- #     berhenti anonim. Pemisahan fisik yang sudah ada dipertahankan, bukan  #
-- #     ditembus.                                                             #
-- #                                                                          #
-- #  3. KUNCINYA `sub`, BUKAN NAMA. Nama murid TIDAK PERNAH disimpan di       #
-- #     tabel-tabel ini. Nama untuk dashboard dibaca dari `social_profile`    #
-- #     (display_name/handle) lewat pembacaan TERPISAH ber-`sub` — satu sumber #
-- #     nama, bukan salinan kedua yang pelan-pelan menyimpang.                  #
-- #                                                                          #
-- #  4. DILARANG menambah kolom: nama, email, IP, user-agent, sidik           #
-- #     perangkat, token, jawaban murid, teks soal, transkrip AI, atau        #
-- #     timestamp presisi selain `received_at` (jam terima server, dipakai    #
-- #     untuk mengurutkan kejadian dalam satu hari).                           #
-- #                                                                          #
-- #  5. PERSETUJUAN WAJIB. Tanpa baris aktif di `learner_evidence_consent`,   #
-- #     rute tulis menolak 403 dan NOL baris tertulis (fail-closed di         #
-- #     route-learner-evidence.js). Memasang tabel ini saja tidak             #
-- #     mengumpulkan apa pun.                                                  #
-- #                                                                          #
-- #  6. RETENSI 180 HARI, eksplisit di LEARNER_EVIDENCE_LIMITS.RETENTION_DAYS #
-- #     dan di docs/D1-RETENTION.md. Bukan "selamanya", dan bukan angka yang  #
-- #     boleh naik tanpa mengubah kedua tempat itu.                            #
-- ############################################################################
-- ============================================================================

-- Satu baris per event bukti/keputusan Braincore milik SATU murid.
-- `dims` = JSON objek berisi HANYA field enum tertutup dari EVIDENCE_EVENT_SPEC
-- (evidence-core.js) — divalidasi di pintu masuk DAN divalidasi ulang di pintu
-- keluar (`parseStoredDims`), karena kolom TEXT tidak bisa menegakkan enum.
-- PK (sub, event_id) = idempotensi retry alami: klien yang mengirim ulang batch
-- yang sama menulis baris yang sama, bukan baris kedua.
CREATE TABLE IF NOT EXISTS learner_evidence (
  sub         TEXT    NOT NULL,           -- identity.sub; DITURUNKAN cookie fz_id, tidak pernah dari body
  event_id    TEXT    NOT NULL,           -- UUID v4 acak klien, KHUSUS lane ini (bukan eventId lane agregat)
  day         TEXT    NOT NULL,           -- 'YYYY-MM-DD' dari amplop batch
  received_at INTEGER NOT NULL,           -- epoch ms jam SERVER; urutan dalam satu hari
  event       TEXT    NOT NULL,           -- 'learner_evidence' | 'braincore_decision'
  dims        TEXT    NOT NULL,           -- JSON enum tertutup; TIDAK PERNAH teks bebas
  PRIMARY KEY (sub, event_id)
);

-- Baca panel owner satu murid: selalu tersaring `sub` lebih dulu, lalu rentang
-- hari. Tanpa indeks ini, membuka satu murid memindai bukti seluruh murid.
-- DIPAKAI readLearnerEvidenceRows (learner-evidence-store-d1.js):
--   'SELECT day, received_at, event, dims FROM learner_evidence WHERE sub = ?1 AND day >= ?2 AND day <= ?3 ORDER BY day ASC LIMIT ?4'
CREATE INDEX IF NOT EXISTS idx_learner_evidence_sub_day ON learner_evidence(sub, day);

-- Purge retensi: satu-satunya pola baca yang boleh nyaman selain "murid ini".
-- DIPAKAI purgeLearnerEvidence (learner-evidence-store-d1.js):
--   'DELETE FROM learner_evidence WHERE day < ?1'
CREATE INDEX IF NOT EXISTS idx_learner_evidence_day ON learner_evidence(day);

-- Keadaan ringkas SATU baris per murid. Ada supaya direktori owner bisa
-- menjawab "siapa saja yang ada" TANPA memindai baris bukti semua orang:
-- membangun daftar nama dengan memindai riwayat belajar adalah cara termurah
-- membuat satu halaman dashboard membaca segalanya sekaligus.
CREATE TABLE IF NOT EXISTS learner_evidence_state (
  sub                 TEXT    PRIMARY KEY,
  first_day           TEXT    NOT NULL,
  last_day            TEXT    NOT NULL,
  updated_at          INTEGER NOT NULL,
  evidence_n          INTEGER NOT NULL DEFAULT 0,
  decision_n          INTEGER NOT NULL DEFAULT 0,
  last_level          TEXT,
  last_mastery        TEXT,
  last_trend          TEXT,
  last_misconception  TEXT,
  last_calibration    TEXT,
  last_improvement    TEXT,
  last_decision       TEXT,
  last_outcome        TEXT,
  last_recommendation TEXT
);

-- Direktori owner: "murid yang aktif sejak hari X", terbaru lebih dulu. Nama murid
-- TIDAK ikut di kueri ini: ia dibaca terpisah dari `social_profile` (satu kueri
-- `WHERE sub IN (…)`), supaya lane sosial yang mati berakhir sebagai "murid tanpa
-- nama" dan bukan sebagai direktori yang gagal.
-- DIPAKAI readLearnerDirectory (learner-evidence-store-d1.js):
--   'SELECT sub, first_day, last_day, evidence_n, decision_n, last_level, last_mastery, last_trend, last_outcome FROM learner_evidence_state WHERE last_day >= ?1 ORDER BY last_day DESC LIMIT ?2'
CREATE INDEX IF NOT EXISTS idx_learner_evidence_state_last_day ON learner_evidence_state(last_day);

-- PERSETUJUAN. Baris ADA dan `revoked_at IS NULL` = lane ini boleh menulis untuk
-- murid ini. Tidak ada baris = tidak boleh, dan itu keadaan bawaan setiap murid.
-- `policy` mencatat VERSI teks persetujuan: menaikkan versinya membuat
-- persetujuan lama berhenti berlaku, bukan diam-diam diwariskan ke maksud baru.
CREATE TABLE IF NOT EXISTS learner_evidence_consent (
  sub        TEXT    PRIMARY KEY,
  granted_at INTEGER NOT NULL,
  revoked_at INTEGER,
  policy     TEXT    NOT NULL
);
