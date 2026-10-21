# FIEZEL — Curriculum Engine, Question Engine, Assessment Engine, Student Learning Loop & Braincore Bridge

Status: **implemented end-to-end** (server + UI + data flow + tests).
Prinsip arsitektur: **TEACHER OWNS THE GOAL · BRAINCORE OPTIMIZES THE PATH · STUDENT OWNS THE LEARNING ACTION.**

---

## 1. Posisi terhadap sistem existing

| Lapisan existing | Perlakuan |
| --- | --- |
| PWA vanilla-JS (`index.html`, `app.js`), Ruang Guru (`features/teacher/*`), local-first localStorage | **Tidak diubah perilakunya.** Hanya satu tautan navigasi baru ditambahkan di sidebar Ruang Guru (`Kurikulum & Kompetensi`). |
| Braincore existing (`features/brain/*`: BKT, misconception ledger, OLM, confusion matrix, affect, step tutor, production grader, FSRS-like) | **Tidak diganti.** Engine baru memakai kontrak konseptual yang sama (posterior BKT, ledger miskonsepsi, penjadwalan ingatan) pada sisi server sebagai *decision engine curriculum-aware*, sehingga tidak ada dua algoritma yang berkelahi di satu perangkat. |
| Worker API Cloudflare (`workers/api/*`) + D1 | Tetap. Engine baru adalah **server source of truth** untuk kurikulum/soal/asesmen/evidence; klien local-first dapat sinkron ke sini (lihat §7). |
| Bank soal legacy berbasis `skill` (`past_tense`, `vocab_a2`, …) | Dipetakan ke kompetensi kurikulum lewat `meta.legacy_skill` + endpoint migrasi (`/api/migration/legacy-teacher-store`) dan `/api/curriculum/legacy-map`. Non-destruktif. |

Backend baru: `/app/backend` (FastAPI + MongoDB), semua route berprefix `/api`.
UI baru: `/kurikulum.html` (guru) dan `/misi.html` (murid), aset di `features/curriculum/*`.

---

## 2. Curriculum Engine (P0)

Learning graph bertipe di koleksi `curriculum_nodes`:

```
curriculum > phase > grade > subject > element > cp > tp > indicator > competency > topic > material
```

* ID **stabil & bukan display name**: `KURMER`, `FASE-D`, `KELAS-7`, `MAT-7`, `EL-MAT-BIL`, `CP-MAT-D-BIL`, `TP-MAT-D-7-BIL-02`, `IND-BIL-02-1`, `KOMP-BIL-FRAC-ADD`, …
* Setiap node membawa denormalisasi jalur (`curriculum_id`, `phase_id`, `grade_id`, `subject_id`, `element_id`, `cp_id`, `tp_id`, `indicator_id`, `competency_id`, `topic_id`, `material_id`) → satu query cukup untuk menelusuri asal-usul objective.
* Prasyarat kompetensi: `meta.prerequisite_competency_ids` (edge graf, divalidasi anti self-loop).
* Hapus = **arsip** (`status: archived`), supaya evidence historis tidak rusak.
* `GET /api/curriculum/node/{id}/trace` → breadcrumb + `labels` + `ids` (kurikulum apa, fase berapa, kelas, mapel, elemen, CP, TP, indikator, kompetensi).
* `GET /api/curriculum/health-check` → TP tanpa indikator, indikator tanpa kompetensi, kompetensi tanpa soal terbit.

Seed: Kurikulum Merdeka Fase D / Kelas 7 — Matematika (Bilangan: bulat, pecahan, rasio) dan Bahasa Inggris (recount/listening) lengkap dengan indikator, kompetensi, topik, materi, prasyarat.

## 3. Question Engine (P0)

`questions` menyimpan **Question DNA** penuh: `question_id`, `version`, `is_current`, `status`, seluruh path kurikulum, `skill`, `difficulty (1–5)`, `cognitive_level (C1–C6)`, `question_type`, `stem`, `options`, `answer_key`, `explanation`, `hints`, `misconception_id`, `distractor_misconceptions` (opsi → miskonsepsi), `prerequisite_competency_ids`, `estimated_time`, `is_transfer`, `variant_group_id`, `source`, `created_by`, timestamps.

* **Lifecycle**: `DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED`. Terbit diblokir bila ada isu level `error`.
* **Ingestion**: manual (UI), bulk CSV/XLSX, copy-paste parser deterministik, dokumen PDF/TXT (pypdf + parser), kandidat Braincore (deterministik dari soal/materi). **Semua hasil otomatis masuk `REVIEW`** — AI/parser tidak pernah punya otoritas menerbitkan.
* **Validasi** (`/api/questions/validate`, otomatis pada create/update/queue): kelengkapan, kunci jawaban, pemetaan kurikulum/TP/CP/indikator/kompetensi, kesulitan, level kognitif, duplikat (hash stem ternormalisasi), penjelasan, miskonsepsi, prasyarat, saturasi kompetensi (“mengukur kompetensi yang sama dengan N soal lain”).
* **Versioning**: edit membuat versi baru; versi lama disimpan (`questions` + `question_versions`) dan attempt murid menyimpan `question_version` sehingga evidence historis tidak rusak.
* **Varian**: `/api/questions/{id}/variants` (angka digeser / konteks diubah, opsi `transfer: true` menaikkan level kognitif) — anti hafalan, mendukung retry & transfer.

## 4. Assessment Engine (P0)

* 8 jenis dengan perilaku berbeda: `diagnostic, practice, formative, summative, remedial, enrichment, review, transfer` (adaptif?, umpan balik langsung?, retry?, acak?, porsi transfer?, tujuan pedagogis).
* **Blueprint**: target TP + jumlah soal, distribusi kognitif, distribusi kesulitan, tipe soal, porsi transfer. `/api/blueprints/check` memberi peringatan: total ≠ 100%, C3+ < 30% (“cenderung menguji hafalan”), C1 > 50%, tanpa soal transfer, dan ketersediaan soal per TP.
* **Perakitan** memenuhi kuota kognitif & transfer, tanpa duplikat, dengan catatan bila stok kurang.
* **Analitik butir**: p-value, waktu rata-rata, sebaran miskonsepsi, flag “terlalu sulit/mudah/sehat”, plus sinyal `lucky_guess / false_confidence / careless / misconception`.
* **Coverage matrix** (`/api/coverage`) membedakan dengan tegas: `MISSING` (belum ada soal) · `NOT_TAUGHT` (belum ada evidence) · `GAP` (sudah dipelajari, mastery rendah) · `DEVELOPING` · `GOOD`.

## 5. Student Learning Loop (P0)

`POST /api/learning/sessions/start` membangun **learning mission** (today goal, why this matters, fase warm-up → example → practice → challenge → check → review, state kompetensi awal), bukan “ini 10 soal”.

Loop per soal:

```
next  → item dipilih Braincore + alasan berbahasa manusia
answer→ grading → diagnosis (correctness × confidence × waktu × hint × pola distractor)
      → penjelasan → hint → targeted retry (varian/soal setara)
gagal 2x → cek prasyarat → micro-remediation → retry
benar & kuat → soal transfer (konteks/format berbeda)
```

* **Confidence** wajib ditawarkan (`yakin / lumayan / tidak`) dan menjadi evidence tambahan.
* **Idempotensi**: `attempts.idempotency_key` unik + `learning_events.event_id` unik → tidak ada double-count.
* **Privasi**: payload event diminimalkan (`raw_answer`, nama, email dibuang); yang disimpan hanya sinyal yang dipakai untuk keputusan belajar.
* Event stabil: `lesson_started, question_presented, question_answered, hint_requested, explanation_viewed, retry_started, retry_completed, confidence_submitted, misconception_detected, competency_updated, mastery_changed, review_scheduled, transfer_attempted, transfer_completed, assignment_completed`.

## 6. Braincore sebagai decision engine (P1)

`/app/backend/braincore.py`:

* **Mastery**: BKT (`p_init .25, p_learn .18, p_slip .10, p_guess .20`) dengan koreksi perilaku — benar setelah hint atau benar-tapi-tidak-yakin menaikkan posterior lebih sedikit; salah-tapi-sangat-yakin dibaca sebagai miskonsepsi, bukan kelalaian.
* **State kompetensi**: `NOT_EXPOSED → EXPOSED → PRACTICING → DEVELOPING → MASTERED → RETAINED → TRANSFERRED`. Mastery butuh posterior ≥ 0.8 **dan** ≥ 3 jawaban benar — nilai ≥ 80 saja tidak cukup.
* **Retensi (FSRS-lite)**: stability naik ×1.9 saat review sukses, ×0.5 saat gagal; `due_at` + `retrievability = exp(-Δhari/stability)`; `/api/learning/today` memunculkan review sebelum risiko lupa tinggi.
* **Transfer**: hanya soal `is_transfer` yang benar saat posterior sudah tinggi menjadikan state `TRANSFERRED`.
* **Misconception ledger**: kompetensi × miskonsepsi × frekuensi × recency × confidence × resolved (auto-resolve setelah 2 benar berturut-turut).
* **Pemilihan item**: prasyarat lemah → turun ke prasyarat; posterior rendah → tangga kesulitan menurun; posterior tinggi → transfer. Setiap keputusan mengembalikan `reason` berbahasa manusia (tidak ada “BKT posterior = 0.62” yang bocor ke murid).
* **Untuk guru**: coverage matrix, detail TP (mastered/developing/needs remediation/not started/ready enrichment), miskonsepsi kelas (“12 dari 28 murid masih keliru …”), kelompok dinamis, rencana mengajar berbasis evidence, rekomendasi 3 tindakan **yang langsung dieksekusi** (`/api/assessments/from-recommendation`), learning passport, evidence graph.

## 7. Local-first → sync → server

`teacher-store` lama tetap local-first. Model data server dirancang sebagai *source of truth* dengan jalur migrasi non-destruktif:

1. `POST /api/migration/legacy-teacher-store` (tersedia sebagai tombol di konsol → **Murid & Paspor**) memetakan kelas/murid/agregat skill lama menjadi kelas, murid, dan `learner_competency` (posterior direkonstruksi dari correct/total).
2. `GET /api/curriculum/legacy-map` menjaga kompatibilitas skill lama ↔ competency baru.
3. Data lama tidak dihapus; field lama tidak dibuang; adaptor berjalan satu arah dan idempoten per `legacy_id`.

## 8. Human policy gate

Braincore boleh *diagnose, recommend, rank, select, adapt, schedule*. Yang tetap milik guru: menerbitkan soal (`/questions/{id}/review`), membuat asesmen besar, menandai kurikulum selesai, intervensi berdampak tinggi, dan komunikasi eksternal. Kandidat AI/parser/import **selalu** berhenti di `REVIEW`.

## 9. Tes

| Berkas | Cakupan |
| --- | --- |
| `backend/unit_test.py` | BKT, state machine, retensi, diagnosis, parser tempelan, validasi soal, blueprint & perakitan (36 assert) |
| `backend/smoke_test.py` | integrasi end-to-end: guru → kurikulum → ingestion → validasi → versioning → varian → blueprint → asesmen → coverage → rekomendasi → eksekusi intervensi → murid → sesi adaptif → diagnosis → retry → paspor → analitik → idempotensi → migrasi legacy (35 assert) |
| `tests/*.js` existing | regresi Ruang Guru & pengalaman murid tetap PASS (`teacher-content`, `teacher-braincore`, `teacher-csv`, `teacher-instant-boot`, `ui-structure`, `regression`, `tutor-classroom-regression`, `global-name-collision`) |

Menjalankan: `/root/.venv/bin/python /app/backend/unit_test.py` dan `/root/.venv/bin/python /app/backend/smoke_test.py`.
