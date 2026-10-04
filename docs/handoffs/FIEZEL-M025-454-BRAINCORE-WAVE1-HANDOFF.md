# FIEZEL m025-454: BrainCore Gelombang 1, hasil BrainCore sampai ke Beranda, Progres, dan Grammar

Tanggal: 2026-10-04
Release: `FIEZEL_PAGE_BUILD=m025-454`, `DIAG_BUILD=m025-454`, `SW_REV=m025-454-unified-grammar-20261002` (lewat
`tools/bump-build.mjs`). Perubahan `features/neural-voice/fiezel-diag-panel.js` HANYA nomor build.
Branch: `claude/inspiring-franklin-xml8hz`, PR FIEZEL-APPS/FIEZEL-APPS#486.
Otoritas: OWNER memilih "Mulai dari Beranda (Gelombang 1)" dari `reports/BRAINCORE-WIRING-AUDIT-2026-10-04.md` §3,
dengan aturan bahasa: kalimat murid singkat, tanpa istilah mesin, tanpa tanda pisah, 1 sampai 2 baris per kartu,
langsung dengan tombol aksi, dan dwibahasa id/th.

## Yang berubah

1. **Beranda: kartu "Kata Braincore Hari Ini"** (`braincoreHomeCardMarkup`), dipasang sesudah kartu misi, DI LUAR
   blok `fz-tactile-audit-vault` yang disembunyikan.
   - Satu kalimat arah belajar dari momentum Core Brain (`bc.arah-*`) dengan fokus rencana adaptif.
   - Paling banyak 3 kata yang mulai memudar, diambil dari `vocabReviewQueue()` (diurutkan dari risiko lupa
     Core Brain). Tombol **Segarkan Sekarang** membuka `reviewVocab()`, antrean yang sama.
   - "Sering tertukar: A vs B" dari pasangan jawaban grammar/cloze yang salah minimal 2 kali dalam 200 jawaban
     terakhir. Tombol **Perbaiki Dasarnya** membuka lesson asalnya lewat `openGrammarLesson`, atau sasaran
     remedial matriks kekeliruan, atau hub Grammar.
2. **Progres · Ringkasan: panel "Bukti kamu makin pintar"** (`braincoreProofPanelMarkup`). Isinya: kecepatan
   menjawab dibanding minggu lalu (median jawaban benar), persentase kata yang masih melekat (hanya bila >= 50%),
   dan kenaikan ketepatan dari `learningMetricsSnapshot().gain`. Metrik itu dulu dihitung tetapi tidak punya
   pemanggil (D2).
3. **Hub Grammar: satu baris "Fokus saat ini"** (`braincoreGrammarFocusLine`), berisi pasangan tertukar atau
   lesson sasaran.

Semua butir hanya muncul bila buktinya ada. Murid tanpa riwayat tidak melihat apa pun yang baru.

## Gerbang
- Baru: `tests/braincore-wave1-wiring-test.js` (14 cek). Gerbang ini memeriksa kabel, posisi di luar blok
  tersembunyi, kembaran th, placeholder, tanpa tanda pisah, tanpa istilah mesin, dan panjang kalimat.
- `id-golden-baseline.json` ditulis ulang dengan sengaja (kalimat `bc.*` baru).
- Cek browser id + th: kartu, panel, dan baris fokus tampil, tanpa error halaman.

## Belum dikerjakan (Gelombang 2 dan 3 di laporan audit)
KelasKu (laporan ke guru, Papan Kelas, tugas remedial), graf kurikulum, dan pengingat di jam terbaik.
