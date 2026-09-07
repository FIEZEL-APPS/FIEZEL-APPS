# FIEZEL — PRD / Status Implementasi

**Terakhir diperbarui:** 7 Juni 2026

## 1. Problem statement asli (ringkas, verbatim intent)
FIEZEL tidak boleh lagi hanya "aplikasi tempat guru memberikan soal kepada murid". FIEZEL harus menjadi
**sistem yang memastikan setiap kompetensi Kurikulum Merdeka benar-benar dipelajari, dipahami, dikuasai, diingat,
dan dapat diterapkan oleh setiap murid**, dengan rantai:
KURIKULUM → FASE → MAPEL → ELEMEN → CP → TP → INDIKATOR/KOMPETENSI → MATERI → SOAL → ASESMEN → HASIL MURID →
BRAINCORE → DIAGNOSIS → INTERVENSI → REMEDIAL/PRACTICE/ENRICHMENT → MASTERY → RETENTION → TRANSFER → BUKTI PERKEMBANGAN.

Prinsip inti: **TEACHER OWNS THE GOAL · BRAINCORE OPTIMIZES THE PATH · STUDENT OWNS THE LEARNING ACTION**;
SCORE ≠ LEARNING; QUESTION ≠ COMPETENCY; ASSIGNMENT ≠ LEARNING.

## 2. Pilihan user
1. Parsing dokumen & pembuatan kandidat soal: **deterministik, tanpa LLM**.
2. Auth: **guru masuk dengan token khusus dari owner**; **murid bisa Google login atau login FIEZEL (email+sandi)**.

## 3. Arsitektur
* **Existing (tetap)**: PWA vanilla-JS (`index.html`, `app.js`), Ruang Guru local-first (`features/teacher/*`),
  Braincore klien (`features/brain/*`), Worker API Cloudflare + D1, seluruh tes node di `tests/`.
* **Baru (server source of truth)**: FastAPI + MongoDB di `/app/backend` — `curriculum.py`, `questions.py`,
  `assessment.py`, `learning.py`, `braincore.py`, `auth.py`, `seed.py`. Semua route `/api`.
* **Baru (UI)**: `/kurikulum.html` (konsol guru) + `/misi.html` (misi murid), aset `features/curriculum/*`.
  Tautan masuk ditambahkan di sidebar Ruang Guru existing (satu baris, non-destruktif).
* Dokumentasi arsitektur lengkap: `docs/CURRICULUM-ENGINE.md`. Playbook auth: `auth_testing.md`.

## 4. Persona
* **Guru baru** — butuh kurikulum sudah terisi (seed Kurikulum Merdeka) dan bahasa non-teknis.
* **Guru sibuk / punya Excel / punya PDF** — bulk import CSV/XLSX/PDF/paste, semua berhenti di antrean tinjau.
* **Guru 30 murid** — coverage matrix, detail TP, kelompok dinamis, rekomendasi 1-klik.
* **Murid cepat** — transfer & pengayaan otomatis. **Murid kesulitan** — tangga kesulitan turun + prasyarat.
* **Murid menebak / hafal pola** — confidence + diagnosis + soal transfer.
* **Owner** — mencetak token akses guru.

## 5. Kebutuhan inti (statis)
1. Kurikulum sebagai learning graph dengan ID stabil & metadata terlacak.
2. Question DNA + ingestion multi-jalur + validasi + versioning + varian + lifecycle approval.
3. Assessment blueprint + 8 jenis asesmen + coverage + analitik butir.
4. Student learning loop: mission → adaptif → diagnosis → penjelasan → hint → retry → remediasi → transfer.
5. Braincore sebagai decision engine (mastery, retensi, transfer, miskonsepsi, prasyarat) dengan human policy gate.
6. Insight guru yang actionable + rencana mengajar berbasis evidence + learning passport.
7. Telemetry idempoten, privasi minimal, backward compatibility & migrasi non-destruktif.

## 6. Sudah diimplementasikan (7 Juni 2026)
* **P0 Curriculum Foundation** — 11 tipe node, path denormalisasi, prasyarat, arsip non-destruktif, trace metadata,
  health-check struktur, seed Kurikulum Merdeka Fase D Kelas 7 (Matematika Bilangan + Bahasa Inggris) lengkap
  dengan indikator/kompetensi/topik/materi.
* **P0 Question Engine** — Question DNA penuh, lifecycle DRAFT→REVIEW→APPROVED→PUBLISHED→ARCHIVED, 5 jalur ingestion
  (manual, CSV/XLSX, paste, PDF/TXT, kandidat deterministik), 13 aturan validasi termasuk duplikat & saturasi
  kompetensi, versioning + riwayat, varian & varian transfer.
* **P0 Assessment Engine** — 8 jenis asesmen berperilaku beda, blueprint + peringatan keseimbangan (C3+, C1, transfer,
  stok soal), perakitan sesuai kuota, coverage matrix MISSING/NOT_TAUGHT/GAP/DEVELOPING/GOOD, analitik butir + sinyal
  confidence.
* **P0 Student Learning Loop** — learning mission (goal, why, fase), item adaptif + alasan manusiawi, confidence,
  diagnosis 7 label, penjelasan, hint bertingkat, targeted retry, micro-remediation prasyarat, cek transfer,
  ringkasan sesi.
* **P1 Braincore Integration** — BKT + koreksi hint/confidence, state NOT_EXPOSED..TRANSFERRED, FSRS-lite
  (stability ×1.9/×0.5, due_at, retrievability), misconception ledger dengan auto-resolve, evidence graph,
  learning passport.
* **P1 Teacher Copilot** — 3 rekomendasi harian yang langsung dieksekusi menjadi asesmen nyata, kelompok dinamis,
  rencana mengajar per menit berbasis snapshot kelas, detail TP.
* **Auth** — token guru dari owner (+ mint token), murid email+sandi (bcrypt, lockout per-email & per-IP di belakang
  ingress), Google Emergent-managed, JWT access+refresh cookie httpOnly, RBAC.
* **Telemetry & privasi** — 15 tipe event stabil, `event_id`/`idempotency_key` unik, payload diminimalkan.
* **Backward compatibility** — `legacy_skill` map + `POST /api/migration/legacy-teacher-store` (idempoten) + tombol
  impor di konsol; data localStorage lama tidak dihapus.

## 7. Hasil tes
| Suite | Hasil |
| --- | --- |
| `backend/unit_test.py` | 36/36 PASS |
| `backend/smoke_test.py` (integrasi e2e) | 35/35 PASS |
| `backend/tests/test_fiezel_backend.py` (pytest, via URL publik) | 17/17 PASS |
| Playwright e2e guru (bank soal, import, publish, varian, blueprint, coverage drawer, remedial, paspor) | PASS |
| Playwright e2e murid (register → misi → hint → diagnosis → transfer → ringkasan → paspor, tanpa jargon) | PASS |
| Regresi node existing (`teacher-content`, `teacher-braincore`, `teacher-csv`, `teacher-instant-boot`, `ui-structure`, `regression`, `tutor-classroom-regression`, `global-name-collision`) | PASS |

Bug yang ditemukan & diperbaiki dalam iterasi ini: brute-force lockout tidak aktif di belakang ingress
(`request.client.host`) → sekarang throttle per-email + `X-Forwarded-For`.

## 8. Backlog terprioritas
**P1**
1. Sync dua arah local-first ↔ server (saat ini migrasi satu arah + server sebagai source of truth).
2. Penilaian esai berbantuan rubrik untuk `question_type=essay` (kini ditandai menunggu penilaian guru).
3. Ingestion gambar/foto soal (OCR) — kini hanya PDF/TXT/CSV/XLSX yang deterministik.
4. Penjadwal review otomatis yang mengirim asesmen `review` tanpa aksi guru (kini muncul sebagai daftar due).

**P2**
5. Confusion matrix & affect existing klien disalurkan ke evidence server.
6. Laporan orang tua / ekspor PDF paspor belajar.
7. Editor kurikulum massal (impor CP/TP dari dokumen resmi per mapel).
8. Analitik longitudinal antar-semester + prediksi risiko.

## 9. Definition of done yang sudah terpenuhi
Teacher → Curriculum → Competency → Question → Assessment → Student → Learning Session → Evidence → Braincore →
Diagnosis → Adaptation → Mastery/Retention/Transfer → Teacher Insight → Next Action: **seluruh rantai memiliki data
flow nyata yang diverifikasi lewat tes API dan UI**.
