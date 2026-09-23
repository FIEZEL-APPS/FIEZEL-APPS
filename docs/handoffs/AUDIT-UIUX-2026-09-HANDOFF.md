# Audit UI/UX 2026-09 — HANDOFF

**Otoritas:** OWNER meminta semua temuan laporan "Audit UI/UX FIEZEL" (23 Sep 2026, build
m025-360) diperbaiki dalam satu PR, **kecuali F06 (privasi ID online/liga) dan F22
(zoom/ukuran teks) — OWNER: "biarkan seperti itu, jangan sentuh"**.

## Status

| Temuan | Status |
|---|---|
| F07 label DICOBA/BENAR pecah per huruf | selesai (m025-361) |
| F08 dua tombol Lanjut, tombol menembus dialog | selesai (m025-361) |
| F01–F05 tes awal, CTA Home, gerbang level, nama tes, pertanyaan berulang | selesai |
| F06, F22 | **tidak disentuh atas perintah OWNER** |
| F10 intro materi grammar mengajarkan aturan topik (bukan strategi umum), soal 1 ≠ contoh | selesai (m025-363) · `tests/grammar-lesson-rule-test.js` |
| F15 Progress murid baru: kartu kosong disembunyikan, galeri Prasasti dilipat (390px: 2683 → 1520 px) | selesai (m025-363) |
| F17 satu `:root` token di `style.css`, `docs/DESIGN-SYSTEM.md` ditulis ulang ke token nyata | selesai (m025-363) · `tests/pastel-field-contrast-test.js` |
| F21 tata letak desktop ≥1100px: rel kiri, Home dua kolom, kuis/pelajaran 780px | selesai (m025-363) |
| F25 ruang guru satu navigasi (tab hub pindah ke sidebar), "Hapus kelas" masuk menu ⋯ | selesai (m025-363) · `tests/teacher-single-nav-test.js` |
| F28 shell + kurikulum guru dimuat malas; prefetch listening/pak ditunda sampai onboarding selesai (unduhan 15 dtk pertama 13,2 → ±10,9 MB) | selesai (m025-363) · `tests/teacher-lazy-load-test.js` |
| Temuan lain (F09, F11–F14, F16, F18–F20, F23, F24, F26, F27) | selesai di PR #459 |

Ikut diperbaiki karena merah di `main` sebelum PR ini: 27 kunci `kelas.*` tanpa
registrasi id/th, tab Kelas kehilangan pintu Tutor/Belajar mandiri dan baris guru
(659a1a0), ikon `alert-triangle` di luar subset lucide.

## Keputusan penting

- `render()` dari pekerjaan latar tidak lagi menimpa stage aktif (`repaintQuietly`).
  Inilah akar "Mulai tes penempatan membawa ke Home + tur" di produksi.
- `quizLoop` menunggu overlay perkenalan/splash yang sedang pergi sebelum mendorong
  stage; tanpa itu kuis tergambar tanpa stage (tanpa mode pelajaran).
- Jumlah soal tes awal: satu sumber (`leveltest.liteQuestions` di
  `features/diagnostics/fiezel-diagnostic-targets.js` = `PLACEMENT_LITE_SIZE`).

## Langkah berikutnya

- Lanjutkan temuan yang tersisa sesuai daftar di deskripsi PR.
- Setelah merge: uji manual alur murid baru di HP sungguhan (perkenalan → tes awal →
  Home) karena pendaftaran online hanya terjadi di produksi.
