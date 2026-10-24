# FIEZEL M025-643 HANDOFF: JLPT MOSHI INTERACTIVE N5–N1 SIMULATION UNLOCK

**Otoritas Rilis**: OWNER / MASTER Directive Direct Alignment
**Tanggal Rilis**: 24 Oktober 2026
**Nomor Build**: `m025-643`
**Status Fitur**: PASS (Terverifikasi Empiris & Siap Produksi)

## 1. Ringkasan Temuan Audit & Masalah
- **Masalah Utama**: Murid melaporkan "JLPT MOSHI TIDAK BISA DI BUKA" pada kursus bahasa Jepang.
- **Akar Masalah (Root Cause)**:
  1. `startJlptMoshiExam(level)` di `app.js` memanggil `startLevelExam(level)`.
  2. `startLevelExam` memberlakukan aturan rantai level (`levelExamAvailability` dengan alasan `not_next`). Jika level murid saat ini adalah `A1` (N5), `startLevelExam('A1')` menolak dengan toast `"Ujiannya berantai: yang kebuka sekarang A2."` dan langsung membatalkan ujian.
  3. Panel Moshi lama (`openJlptMoshiPanel`) tidak menyediakan pemilih level interaktif (N5–N1), sehingga terkunci pada level aktif default dan selalu gagal dibuka karena penolakan `not_next`.
  4. Mode Moshi (simulasi latihan mandiri) sebelumnya mewarisi penalti cooldown 24 jam dari `startLevelExam` jika gagal atau ditinggalkan (`abandonActiveSession`).

## 2. Solusi & Perubahan Arsitektur
1. **Interactive N5–N1 Level Selector**:
   - `openJlptMoshiPanel(customLevel)` kini merender level selector chips (`[N5] [N4] [N3] [N2] [N1]`).
   - Setiap chip memperbarui modal secara dinamis ke tingkat JLPT yang dipilih tanpa perlu menutup modal.
2. **Decoupled Exam Launcher**:
   - `startJlptMoshiExam(targetLevel)` kini memanggil langsung `buildLevelExamQuestions(target)` dan meluncurkan `quizLoop` dengan flag `isMoshi: true` dan `noHints: true`.
   - Tidak lagi bergantung pada `levelExamAvailability` sehingga murid dapat mensimulasikan level JLPT mana pun (N5 sampai N1) kapan saja.
3. **Zero Cooldown Penalty for Moshi**:
   - `recordSkipExamFail(state, level, detail)` kini memeriksa flag `detail?.noCooldown`.
   - `levelExamSettle` dan `abandonActiveSession` meneruskan `noCooldown: isMoshi` / `noCooldown: !!a.isMoshi`. Murid tidak terkunci 24 jam bila latihan Moshi gagal atau dihentikan di tengah jalan.
4. **Pure JLPT N5–N1 Invariant**:
   - Toasts dan header hasil ujian membungkus parameter level dengan `displayLevel()` sehingga tidak membocorkan istilah CEFR (`A1`–`C2`) pada kursus Jepang.
   - Penambahan kunci i18n terkalibrasi: `jepang.moshi-start-toast` pada bahasa Indonesia dan Thailand.

## 3. Bukti Pengujian Empiris (Playwright Probe & Unit Tests)
- **Unit Contract Test**: `tests/japanese-jlpt-moshi-test.js` (PASS 100%).
- **Headless Chromium Probe**: `tools/dev/probe-moshi-click.mjs`:
  - Mengklik `.ja-moshi-card` di halaman Latihan.
  - Membuka modal "Simulasi Ujian JLPT Moshi · N5" dengan 5 chips [N5, N4, N3, N2, N1].
  - Mengklik chip N4 -> modal judul berganti ke "Simulasi Ujian JLPT Moshi · N4" dan tombol berganti ke `startJlptMoshiExam('A2')`.
  - Mengklik tombol "Mulai Ujian Moshi ➔" -> ujian 25 butir terkalibrasi langsung aktif dengan 3D Mochi companion, furigana, romaji, dan 4 pilihan jawaban.
  - Menjawab soal 1 dan transisi ke soal 2/25 terbukti lancar dan anti-leak.
  - Artefak tangkapan layar tersimpan di `scratch/ja-moshi-modal.png` dan `scratch/ja-moshi-exam.png`.

## 4. Berkas yang Dimodifikasi
- `app.js`: Implementasi level chips di `openJlptMoshiPanel`, peluncur mandiri di `startJlptMoshiExam`, bypass cooldown di `recordSkipExamFail`, `levelExamSettle`, `abandonActiveSession`, serta sanitasi label level dengan `displayLevel()`.
- `features/i18n/copy-id-bahasa.js`: Penambahan `jepang.moshi-start-toast`.
- `features/i18n/copy-th-bahasa.js`: Penambahan `jepang.moshi-start-toast` (paritas 100%).
- `tests/japanese-jlpt-moshi-test.js`: Berkas pengujian kontrak unit fitur JLPT Moshi.
- `.github/workflows/quality.yml`: Registrasi gerbang uji `tests/japanese-jlpt-moshi-test.js`.
- Berkas Sinkronisasi Arbiter (`m025-643`):
  - `coordination/BUILD-VERSION.json`
  - `sw.js`
  - `core-config.js`
  - `features/neural-voice/fiezel-diag-panel.js`
  - `kurikulum.html`
  - `misi.html`
  - `call.html`
  - `features/voice-studio/call.html`
  - `id-golden-baseline.json`

## 5. Status Gerbang Mutu Lokal & Verifikasi Hexa-Sync
- `node tools/bump-build.mjs --check`: SELARAS (6 titik).
- `node tests/id-golden-snapshot-test.js`: HIJAU (baseline emas Indonesia utuh).
- `node tests/th-ui-leak-test.js`: PASS (0 kebocoran).
- `node tests/curriculum-cache-version-test.js`: OK (33 penegasan, build m025-643).
- `node tests/gate-registry-test.js`: PASS (396 invokasi, 0 fail).
- Utang Teknis: 0.

## 6. Langkah Berikutnya (Next Steps & Roadmap)
1. Commit berkas handoff yang telah diselaraskan.
2. Push branch `fix/jlpt-moshi-interactive-launch` ke remote origin.
3. Buat Pull Request (PR) resmi ke branch `main`.
4. Pantau seluruh alur GitHub Actions CI (Quality Gate & Deploy Site) hingga 100% HIJAU.
5. Merge PR ke `main` dan verifikasi bahwa produksi (`https://fiezel.my.id/app/`) aktif melayani build `m025-643`.
