# FIEZEL m025-462: BrainCore Gelombang 2, KelasKu tersambung ke model belajar BrainCore

Tanggal: 2026-10-04
Release: `FIEZEL_PAGE_BUILD=m025-462`, `DIAG_BUILD=m025-462`, `SW_REV=m025-462-...` (lewat `tools/bump-build.mjs`).
Perubahan `features/neural-voice/fiezel-diag-panel.js` HANYA nomor build.
Otoritas: OWNER "perbaiki semua dan lanjutkan sampai semuanya merge", atas
`reports/BRAINCORE-WIRING-AUDIT-2026-10-04.md` §2A (K1 sampai K3).

## Yang berubah
- **K1, laporan kelas membawa ringkasan BrainCore `bc`.** `braincoreClassDigest()` di app.js berisi level aktif,
  arah belajar (`up|flat|down|new`), jumlah materi yang menunggu diulang, paling banyak 3 pelajaran grammar
  dengan penguasaan BKT terendah (minimal 3 bukti), dan pelajaran yang perlu diperbaiki (dari pasangan yang
  tertukar). `fiezel-learner-flow.js` menempelkannya ke payload laporan.
  **Server** (`workers/api/teacher/class-sync-core.js` `normalizeReport`) memvalidasinya dengan ketat: enum,
  bilangan, dan kunci pelajaran berpola `^[a-z0-9_]{1,64}$`. Teks bebas ditolak (`bad_braincore`). Laporan
  tanpa `bc` tetap diterima. Sebelum Worker di-deploy, `bc` dibuang server secara diam-diam (field tak dikenal),
  jadi urutan deploy aman.
- **K2, guru melihat model belajar muridnya.** `fiezel-teacher-store.js` menormalkan `bc` lagi, karena jalur kode
  tempel tidak lewat server. Tab Saran Braincore (`tBraincoreLearnerModel`) menampilkan pelajaran yang paling
  banyak lemah, jumlah murid yang perlu didampingi, jumlah murid dengan materi yang menunggu diulang, dan satu
  baris per murid.
- **K3, Papan Kelas murid.** Streak dihitung dari semua hari belajar, bukan hanya hari kirim tugas. Skill
  terkuat dan terlemah ikut penguasaan BrainCore per pelajaran. Kartu "Kata Braincore Hari Ini" yang sama dengan
  Beranda tampil di atas.

## Gerbang
- Baru: `tests/braincore-wave2-kelasku-test.js` (12 cek, termasuk penolakan teks bebas di server).
- `id-golden-baseline.json` ditulis ulang dengan sengaja (kalimat `kelas.bc-*` baru).

## Belum dikerjakan
- K4: tugas remedial dari guru belum dipersonalisasi per murid. Bank soal guru memakai kunci skill yang
  berbeda dari kunci pelajaran BrainCore, jadi perlu peta skill ke pelajaran lebih dulu.
- Gelombang 3: graf kurikulum (`setCurriculumGraph`) dan pengingat di jam belajar terbaik.
