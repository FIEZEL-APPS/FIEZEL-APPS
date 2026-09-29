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

## Backlog prioritas (menunggu keputusan user)
- P0: Fix IDOR (ownership kelas + self-check student-state); fix B7.
- P1: Hapus dead code C6; paritas parameter BKT (C3); CI untuk backend/unit_test.py (B8).
- P2: Refactor N+1 → aggregation pipeline; satuan retrievability (C2); fail-fast MONGO_URL.

## Next action items
- Konfirmasi ke user: apakah mau langsung diperbaiki (perlu akses tulis/fork repo) atau
  cukup laporan analisis.
