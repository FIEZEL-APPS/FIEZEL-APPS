# Patch Braincore FIEZEL — STATUS: DITERAPKAN LANGSUNG di `/app/backend` (2026-06)

Sebelumnya (2026-06, sesi lalu) patch hanya dikemas sebagai file drop-in di folder ini karena
`/app/backend` tertinggal ~2.300 commit dari `origin/main`. Kini `/app/backend` sudah
**disinkronkan ke `origin/main`** (`git checkout origin/main -- backend`) dan seluruh perbaikan
diterapkan di atasnya. File drop-in lama DIHAPUS supaya tidak ada dua versi. Sumber kebenaran =
`/app/backend/*.py` + `/app/.github/workflows/backend-tests.yml`. Simpan lewat "Save to GitHub".

## Perubahan (semua teruji: unit 61/61, probe 15/15, pytest 30 pass / 1 skip)
| Area | File | Isi |
| --- | --- | --- |
| P0 IDOR | `access.py` (BARU) | `assert_class_teacher`, `assert_class_member`, `assert_student_access`, `assert_assessment_access`, `teacher_class_ids`, `student_targeted` |
| P0 IDOR | `assessment.py` | guard di coverage, recommendations, groups, lesson-plan, tp-detail, passport, evidence-graph, student-state, classes/{id}, **roster, POST assessments, from-recommendation, GET assessments (guru hanya kelas diampu; murid hanya yang ditujukan), GET assessments/{id}, analytics, blueprints (per pembuat)** |
| P0 IDOR | `learning.py` | `GET events` (guru wajib student_id & hanya murid kelasnya; murid hanya dirinya), `GET sessions/{id}` (guru hanya sesi kelasnya), `sessions/start` pakai `student_targeted` |
| P0 IDOR-tulis | `seed.py` | bootstrap tidak lagi MENIMPA `teacher_id` kelas demo FZ-DEMO7A (kelas demo kini per guru); migrasi legacy tidak menumpang kelas guru lain |
| P0 B7 | `braincore.py` | note GAP = proporsi MURID nyata (`exposed − mastered`) |
| P1 | `braincore.py` | dead code `and s not in []` dihapus; copy murid baru selaras IRT |
| P1 C3 paritas | `braincore.py` + `unit_test.py::test_client_parity` | `bkt_step()` (bentuk sama dengan `bktStep()` klien) diuji dengan konstanta klien; konstanta server SENGAJA dipertahankan (disetel dari data, m025-379) — perbedaan didokumentasikan di test |
| P1 B8 CI | `.github/workflows/backend-tests.yml` | unit_test.py → probe.py → uvicorn+Mongo → `tests/test_idor_e2e.py` → `tests/test_fiezel_backend.py` |
| P2 N+1 | `braincore.py` | coverage_matrix (18→10 ops), recommendations (53→18), tp-detail (32→11), passport (16→9), due_reviews, class_misconceptions, next_best_item prasyarat → batch `$in`; `student_tp_summaries()` batch |
| P2 N+1 | `assessment.py`, `learning.py` | list_assessments (1 query sesi), analytics (1 query soal), build_mission/finish_session/start_session batch |
| P2 | `braincore.py` | `POOL_CAP=2000` eksplisit + log bila tercapai (dulu `to_list(500)` senyap) |
| P2 | `db.py` | fail-fast `MONGO_URL` & `DB_NAME` (sesuai `.env.example`/bootstrap.py) |
| Bug | `learning.py sync_state`, `seed.py migrate_legacy` | `p_mastery_decayed` (nilai turunan) tidak lagi tersimpan ke DB |

Latensi (uvicorn tanpa --reload, kelas demo 18 murid/180 evidence): coverage 17,5→5,8 ms;
recommendations 20,6→8,4 ms; tp-detail 10,3→5,2 ms. Skrip: `backend/perf_probe.py`.

## Temuan TERBUKA (belum diubah — butuh keputusan owner)
1. **`POST /api/learning/sync-state` mempercayai `p_mastery` klien.** Bila `attempts` klien > server,
   server menimpa `p_mastery` dengan angka klien → murid bisa menyetel diri sendiri MASTERED.
   Bertentangan dengan kontrak `offline-batch` ("skor klien tidak pernah menggerakkan mastery").
   Opsi: (a) server menghitung ulang BKT dari delta attempts/correct, (b) tandai `client_claimed`.
2. Gerbang mastery klien (0,95 & n≥5) vs server (0,80 & 3 benar) berbeda secara sengaja — kalau
   owner ingin SATU angka, ubah `P_INIT/P_LEARN/P_GUESS/MASTERY_T` di braincore.py dan
   `PARAMS/GATE` di fiezel-mastery-bkt.js bersamaan; `test_client_parity` akan menjaga bentuknya.
