# PRD — Braincore Engine FIEZEL (audit → perbaikan)

## Problem statement asli
"https://github.com/FIEZEL-APPS/FIEZEL-APPS — analisa braincore enginenya, apa yang tidak
berfungsi, apa yang perlu ditingkatkan dan lain-lain" → lalu: "P0: tutup IDOR + perbaiki B7.
P1: paritas BKT klien-server, CI backend tests, hapus dead code. P2: refactor N+1" → lalu:
"perbaiki semua yang perlu diperbaiki, tingkatkan semua yang perlu ditingkatkan".

## Arsitektur
- `/app` = clone repo FIEZEL-APPS. `/app/backend` (FastAPI + Motor/MongoDB) **disinkronkan ke
  `origin/main`** pada 2026-06 (sebelumnya tertinggal ~2.300 commit) lalu dipatch.
- Auth: satu pintu tiket KelasKu (`POST /api/auth/kelasku`, HMAC `CURRICULUM_TICKET_KEY`).
- Env lokal `/app/backend/.env` (tidak di-commit): MONGO_URL, DB_NAME, JWT_SECRET,
  CURRICULUM_TICKET_KEY, CORS_ORIGINS. Preview: https://f81f2326-e070-4c8a-b861-6393b0133dcd.preview.emergentagent.com/api/health
- Frontend repo = halaman statis (kurikulum.html, misi.html, features/*) — tidak disentuh.

## Yang sudah dikerjakan
- 2026-09-29: audit statis + probe (laporan `/app/memory/braincore-analysis-2026-09.md`).
- 2026-06 (sesi lalu): patch drop-in di salinan lokal (kini dihapus, digantikan patch langsung).
- 2026-06 (sesi ini) — diterapkan di `/app/backend`, rincian di `/app/memory/braincore-fixes/PATCH-NOTES.md`:
  - P0 IDOR: `access.py` baru; guard di SEMUA endpoint guru/murid (coverage, recommendations,
    groups, lesson-plan, tp-detail, passport, evidence-graph, student-state, classes/{id}, roster,
    assessments create/list/get/analytics/from-recommendation, blueprints, learning events,
    sessions). Bootstrap tidak lagi mencuri kelas demo guru lain (kelas demo per guru).
  - P0 B7: note GAP = proporsi murid nyata.
  - P1: dead code dihapus; copy murid baru selaras IRT; `bkt_step()` + `test_client_parity`
    (bentuk rumus identik dengan klien; konstanta server dipertahankan, disetel dari data).
  - P1 CI: `.github/workflows/backend-tests.yml` (unit → probe → uvicorn+Mongo → E2E IDOR →
    kasus tepi → regresi).
  - P2: N+1 → batch `$in` di coverage/recommendations/tp-detail/passport/due_reviews/
    misconceptions/next_best_item/list_assessments/analytics/build_mission; `POOL_CAP` eksplisit;
    fail-fast MONGO_URL & DB_NAME; `p_mastery_decayed` tidak bocor ke DB (sync_state, migrasi).
  - Uji: unit 61/61, probe 15/15, pytest `test_idor_e2e` 7, `test_edge_cases` 15 (testing agent),
    `test_fiezel_backend` 23 pass/1 skip. Laporan: `/app/test_reports/iteration_3.json`.

## Backlog
- P1 (keputusan owner): `POST /api/learning/sync-state` mempercayai `p_mastery` klien → murid
  bisa menyetel dirinya MASTERED. Opsi: hitung ulang BKT dari delta attempts/correct di server.
- P2: satukan gerbang mastery klien (0,95 & n≥5) vs server (0,80 & 3 benar) bila owner ingin satu angka.
- P2: `mastery_pct` di coverage = rerata posterior (bukan proporsi murid) — pertimbangkan rename
  `avg_posterior_pct` di API + konsol guru (saran testing agent, bukan bug).
- Ops: jalankan workflow di GitHub setelah "Save to GitHub"; pasang `.env` produksi sesuai
  `backend/.env.example` (DB_NAME kini wajib).
