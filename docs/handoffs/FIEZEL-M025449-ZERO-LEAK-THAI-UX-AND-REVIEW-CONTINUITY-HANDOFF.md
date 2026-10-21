# DOSSIER SERAH TERIMA: FIEZEL BUILD m025-449
## Pelunasan Tugas Opus 5.5, Eliminasi Kebocoran Teks Thai, dan Integrasi Kontinuitas Review

Tanggal: 4 Oktober 2026
Build: m025-449 (Selaras 6 Titik Hexa Sync)
Status Mutu: 100% HIJAU (14/14 Gerbang Lolos)

---

### 1. Ringkasan Audit dan Latar Belakang

Pekerjaan Claude Opus 5.5 pada PR 485 terhenti karena batas kuota per jam (rate limit). Tugas tersebut diambil alih secara tuntas dan mandiri tanpa perlu menunggu reset kuota.

Tiga masalah utama yang diselesaikan dalam rilis m025-449 ini:
1. Kontinuitas Ulangan Lintas Level (Pekerjaan Inti Opus PR 485):
   * V-E: Tombol "Masih belajar" pada flashcards dan ulangan jatuh tempo diperlakukan sebagai penilaian mandiri (self-rating), bukan jawaban salah. Skor ketuntasan, kesalahan beruntun, dan riwayat belajar tetap terjaga murni tanpa penalti artifisial, dan kartu dijadwalkan ulang dalam 10 menit.
   * P-C: Kemampuan awal (priorAbility) pada penalaran CoreBrain kini dibenihkan dari indeks level aktif murid (A1=1 hingga C2=6), bukan lagi angka kaku 1.5. Murid berkemampuan C2 kini terkalibrasi secara presisi ke C2 setelah 12 soal.
   * R-X: Materi tata bahasa dan bacaan yang jatuh tempo dari level di bawah level aktif tetap dihitung di antrean review dan dapat masuk sesi adaptif dengan penanda khusus `__crossLevelReview`.

2. Eliminasi Kebocoran Teks Indonesia pada Antarmuka Murid Thai:
   * Tur Pengenalan (Coach Mark): Pada `features/onboarding/fiezel-tour.js`, fungsi `T()` kini mengevaluasi `FiezelI18n.t()` secara dinamis dan mendengarkan event perubahan bahasa `onChange`. Teks judul "Tab Latihan" dan tombol "Lanjut" kini otomatis menjadi "แท็บฝึกฝน" dan "ต่อไป" dalam bahasa Thai.
   * Badge Materi Tata Bahasa: Pada `app.js`, teks statis "TATA BAHASA · A1" telah diganti menjadi `${esc(FiezelI18n.t('skill.grammar', 'TATA BAHASA').toUpperCase())} · ${esc(getActiveLevel())}` sehingga menyajikan "ไวยากรณ์ · A1" secara otentik bagi murid Thai.

---

### 2. Bukti Pengujian Empiris Nyata (Headless Chromium Playwright)

1. Probe UX Sesi Tata Bahasa (`tools/dev/grammar-ux-audit-2026-10-04-probe.js`):
   * Menjelajahi 38 layar secara berurutan pada viewport mobile 390x844 (mode terang Indonesia, mode Thai, dan mode gelap).
   * Hasil temuan akhir: Total layar dengan kebocoran bahasa Indonesia adalah 0 (NOL).
   * Tangkapan layar `11-th-tur.png`, `11-th-sesudah-quest.png`, dan `11-th-materi.png` terverifikasi 100% berbahasa Thai.

2. Gerbang Kontinuitas Review (`tests/review-continuity-2026-10-04-test.js`):
   * 16/16 sub-pengujian lulus (13/13 blok cek lulus).

3. Gerbang Integritas Belajar (`tests/learning-integrity-2026-10-04-test.js`):
   * 36/36 pengujian lulus.

4. Baseline Emas Teks Indonesia (`tests/id-golden-snapshot-test.js`):
   * 13 berkas terkunci identik, literal utuh dan bersih. Status HIJAU.

---

### 3. Daftar Berkas yang Disentuh

1. `app.js`:
   * Mengintegrasikan `markStillLearning` untuk flashcard review tanpa merusak telemetri BKT.
   * Mengalirkan `priorAbility` sesuai level aktif ke `coreBrainSnapshot`.
   * Menambahkan toleransi filter `__crossLevelReview` di `quizLoop`.
   * Melokalkan badge judul materi tata bahasa dengan `skill.grammar`.
2. `features/onboarding/fiezel-tour.js`:
   * Evaluasi dinamis runtime i18n pada `T()`.
   * Pemasangan listener `onChange` pada `FiezelI18n` agar tur langsung mengecat ulang diri saat bahasa aktif berganti.
3. `tools/dev/grammar-ux-audit-2026-10-04-probe.js`:
   * Mengalirkan inisialisasi `learnerLocale` secara tepat ke state awal peramban headless.
4. `tests/review-continuity-2026-10-04-test.js`:
   * Uji kontrak formal untuk V-E, P-C, R-X, dan browser headless review.
5. Koordinasi Versi Build (Hexa-Sync m025-449):
   * `coordination/BUILD-VERSION.json`
   * `sw.js`
   * `core-config.js`
   * `features/neural-voice/fiezel-diag-panel.js`
   * `kurikulum.html`
   * `misi.html`

---

### 4. Status Gerbang Mutu Lokal

* `tests/review-continuity-2026-10-04-test.js`: 13/13 PASS
* `tests/learning-integrity-2026-10-04-test.js`: 36/36 PASS
* `tests/id-golden-snapshot-test.js`: HIJAU (baseline emas utuh)
* `tests/th-ui-leak-test.js`: PASS (anggaran kebocoran terkontrol)
* `tests/curriculum-cache-version-test.js`: PASS
* `tests/gate-registry-test.js`: 10/10 PASS
* `tests/panggung-suara-contract-test.js`: 32/32 PASS
* `tests/stage-signaling-contract-test.js`: 20/20 PASS
* `tests/friend-qr-contract-test.js`: 21/21 PASS
* `tests/friend-system-contract-test.js`: 44/44 PASS
* `tests/i18n-kunci-hantu-test.js`: PASS (4672 kunci terdaftar)
* `tests/th-coverage-test.js`: 249/249 PASS
* Pemeriksaan Hexa-Sync: Selaras di build m025-449.
