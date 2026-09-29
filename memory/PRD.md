# PRD — Analisis Braincore Engine FIEZEL

## Problem statement asli
"https://github.com/FIEZEL-APPS/FIEZEL-APPS — analisa braincore enginenya, apa yang tidak
berfungsi, apa yang perlu ditingkatkan dan lain-lain" (Bahasa Indonesia).

## Yang sudah dikerjakan (2026-09-29)
- Analisis statis backend/braincore.py (672 baris), braincore-bridge.js,
  fiezel-braincore-evidence.js, fiezel-braincore-review.js, wiring learning.py/assessment.py.
- Probe fungsional 15 cek (stub Mongo in-memory): 14 PASS — matematika inti sehat.
- Konfirmasi temuan: B7 (note GAP salah makna, MASIH ADA), IDOR pada student-state &
  endpoint guru (BARU), kode mati C6, paritas BKT klien-server (C3), N+1 query.
- Laporan lengkap: /app/memory/braincore-analysis-2026-09.md

## Backlog prioritas
- ~~P0: Fix IDOR (ownership kelas + self-check student-state); fix B7.~~ ✅ 2026-06
- P1: ~~Hapus dead code C6~~ ✅; paritas parameter BKT (C3) ⚠️ file klien tak ada lokal;
  ~~CI untuk backend/unit_test.py (B8)~~ ✅ (workflow disiapkan).
- P2: ~~fail-fast MONGO_URL~~ ✅; ~~N+1 next_best_item~~ ✅; N+1 jalur guru lain ⏳;
  satuan retrievability (C2) ⚠️ klien; cap senyap _pool ⏳.

## Patch diterapkan (2026-06) — repo eksternal, TIDAK bisa push
Perbaikan diterapkan pada salinan sumber lokal, diverifikasi probe **15 PASS / 0 FAIL**,
dikemas untuk owner terapkan ke `FIEZEL-APPS`:
- P0 IDOR (assessment.py): helper `_assert_class_teacher` / `_assert_student_access` pada
  student-state, coverage, recommendations, groups, lesson-plan, tp-detail, passport,
  evidence-graph, classes/{id}.
- P0 B7 (braincore.py coverage_matrix): note GAP kini proporsi MURID nyata (exposed−mastered),
  bukan 100−rerata posterior.
- P1 dead code C6 dihapus; P1 copy vs perilaku #4 diselaraskan (murid baru).
- P2 N+1 `get_states` ($in tunggal) di next_best_item; P2 fail-fast MONGO_URL (db.py).
- P1 B8: `.github/workflows/backend-tests.yml`.
- Deliverable: /app/memory/braincore-fixes/ (braincore.py, assessment.py, db.py, probe.py,
  backend-tests.yml, PATCH-NOTES.md).

## Next action items
- Owner terapkan patch ke repo & uji IDOR end-to-end 2 akun (guru A vs B, murid X vs Y).
- C3/C2: samakan konstanta & retrievability brain KLIEN dengan server (file klien belum diaudit lokal).
- P2 lanjut: N+1 coverage_matrix/learning_passport → aggregation; cap _pool.
