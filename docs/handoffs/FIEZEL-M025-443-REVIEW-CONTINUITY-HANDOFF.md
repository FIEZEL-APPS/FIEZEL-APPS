# FIEZEL m025-443 — Penilaian diri flashcard, titik awal kemampuan, ulangan lintas level — Handoff

Tanggal: 2026-10-04 WIB
Release: `FIEZEL_PAGE_BUILD=m025-443`, `DIAG_BUILD=m025-443`, `SW_REV=m025-443-unified-grammar-20261002` (lewat
`tools/bump-build.mjs`; perubahan `features/neural-voice/fiezel-diag-panel.js` di PR ini HANYA nomor build)
Branch: `claude/inspiring-franklin-xml8hz` (dimulai ulang dari `main` @ `b4c29219`, m025-442)
Otoritas: OWNER memilih tiga perbaikan ini dari daftar sisa audit 2026-10-04 ("kerjakan 3 ini dulu").

## STATUS

Machine-verified lokal. Gerbang baru `tests/review-continuity-2026-10-04-test.js` 16/16 hijau (bagian
browser lewat `page.route`, tanpa socket) dan merah 1/11 di `main` m025-442. Hasil suite penuh
`quality.yml` dan CI ada di PR.

## APA YANG BERUBAH

1. **V-E — "Masih belajar" bukan jawaban salah.** `markStillLearning()` menggantikan
   `updateMastery(...,false)` di flashcards dan "Review jatuh tempo": total, benar, lapses,
   beruntun-salah, dan mastery tidak bergerak; kartu kembali dalam 10 menit (tidak pernah lebih
   lambat dari jadwalnya). Laporan: `reports/VOCAB-FSRS-AUDIT-2026-10-04.md` §5.
2. **P-C — taksiran kemampuan mulai dari level aktif.** `coreBrainPriorAbility()` (A1=1 … C2=6)
   diteruskan sebagai `priorAbility` ke `FiezelCoreBrain.analyze()`. Murid C2 sesudah 12 jawaban:
   2,79 → 5,99. Laporan: `reports/PLACEMENT-IRT-AUDIT-2026-10-04.md` §5.
3. **Ulangan grammar/bacaan lintas level.** `reviewLevelOk()` dipakai `dueItems()` untuk ketiga
   jenis materi; sesi adaptif memasukkan materi level lama HANYA saat jatuh tempo, ditandai
   `__crossLevelReview` supaya lolos saringan level `quizLoop` dan tetap tercatat dengan level
   aslinya; "Reading adaptif" mendahulukan bacaan jatuh tempo dari level ≤ aktif; angka jatuh tempo
   kosakata di Beranda sama dengan isi "Review jatuh tempo".

## LANGKAH BERIKUTNYA (menunggu keputusan OWNER)

1. V-C (jeda belajar-ulang sesudah lupa ≤ 1 hari) dan V-D (`markMastered` vs `stabilityDays`).
2. P-D (dokumentasi kalibrasi kesulitan soal).
3. G13: penjelasan bank video-grammar (20 entri) masih Inggris - butuh konten id/th.
4. Kebocoran Thai di luar jalur grammar; tinjauan penutur asli Thai untuk kunci baru m025-442.
5. Gem hanya tersimpan di perangkat - keputusan produk.
