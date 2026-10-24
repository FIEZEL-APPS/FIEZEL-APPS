# FIEZEL Handoff Dossier — Build `m025-637`
## Pure JLPT N5–N1 Japanese UX, 50 Structured Bunpō Lessons, Live Kanji & JLPT Moshi Modules, Unclipped Minimalist Level Picker, and Level Exam / Placement Fixes

**Tanggal:** 2026-10-24  
**Build:** `m025-637`  
**Branch:** `fix/ja-ux-pure-jlpt-n5-n1`

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan audit empiris menggunakan headless Chromium Playwright (`probe-ja-flows.mjs` dan `audit-ja-ux-bugs.mjs`) serta masukan langsung pengguna terhadap kursus Bahasa Jepang (`kursus Jepang`), ditemukan dan diperbaiki 6 masalah utama:

1. **Sesi Bunpō (`go('grammar')`) Gagal Dibuka (`0 soal valid`) & Daftar Materi Berisi 236 Slug Internal Inggris:**
   - **Akar Masalah:** Fungsi `norm(s)` di `app.js:453` menghapus seluruh karakter non-ASCII (`[^a-z0-9\s]`), sehingga teks soal dan pilihan jawaban berbahasa Jepang berubah menjadi string kosong `""` dan ditolak oleh `validateQuestion(q)`. Selain itu, `load()` di `app.js:6316` mengelompokkan `GRAMMAR_ITEMS` menggunakan `t.subskill` (236 slug Inggris internal), bukan 50 lesson kurikulum `jaGraph.families` (`t.skill`).
   - **Solusi:** Memperluas regex `norm(s)` agar mempertahankan rentang Unicode Hiragana, Katakana, Kanji CJK, dan karakter lebar penuh Jepang; membangun `GRAMMAR_CURRICULUM_INDEX` dari `jaGraph.families` dan mengelompokkan template berdasarkan `t.skill || t.subskill || t.family || 'general'`. Kini halaman Bunpō menampilkan **50 materi tata bahasa Jepang berbahasa Indonesia/Thai** (12 materi pada level N5), dan baik `openGrammarLesson` maupun `startGrammarQuickSession` langsung membuka kuis interaktif ber-furigana & romaji.

2. **Ujian Naik Level (`startLevelExam`) & Tes Awal (`startPlacement`) Gagal di Kursus Jepang:**
   - **Akar Masalah:** `buildLevelExamQuestions` dan `buildPlacement` gagal merakit soal grammar/vocab karena `norm(s)` menghapus huruf Jepang dan `C2` dilebur ke `C1` (`N1`).
   - **Solusi:** Dengan perbaikan `norm(s)` dan pemetaan sumber `C2 -> C1` (`N1`) pada `buildPlacement()` di mode Jepang, baik **Ujian Naik Level (25 soal)** maupun **Tes Awal (Placement Test)** berjalan mulus.

3. **Penghapusan Kartu Mati `"Segera hadir"` (`ja-soon`) & Peluncuran Fitur Aktif Kanji + JLPT Moshi:**
   - **Akar Masalah:** Tab Renshū (`go('latihan')`) masih merender `FiezelJaUi.comingSoonMarkup()` untuk Chōkai, Kaiwa, Kanji, dan JLPT Moshi.
   - **Solusi:** Menghapus panggilan `comingSoonMarkup()` dari `latihan()` dan menggantinya dengan kartu peluncur interaktif **Kanji** (`openKanjiPractice()` & `startKanjiQuiz()`) serta **JLPT Moshi** (`openJlptMoshiPanel()` & `startJlptMoshiExam()`) yang terhubung penuh ke pipa evaluasi Braincore (`quizLoop` -> `record()` -> `updateMastery()` -> `bktRecord()`).

4. **Pembersihan Total Istilah `A1–C2` & `N1+` Menjadi Murni 5 Level Resmi `JLPT N5–N1`:**
   - **Akar Masalah:** Berbagai permukaan kursus Jepang masih menampilkan kode CEFR (`A1`–`C2`) atau `N1+`, serta referensi IELTS/TOEFL di kartu rubrik Sakubun.
   - **Solusi:** Menambahkan helper `displayLevel(level)` di `app.js`, memetakan `JLPT_BY_LEVEL` ke 5 level murni (`N5`, `N4`, `N3`, `N2`, `N1`), menyaring `C2` dari pemilih level & peta progres Jepang, serta memperbarui seluruh naskah `copy-id-bahasa.js` dan `copy-th-bahasa.js` dengan paritas 100% ID/TH.

5. **Redesain Minimalis & Anti-Terpotong pada Modal `Pilih level kamu` (`openLevelPanel`) dan `Latihan Huruf Kanji` (`openKanjiPractice`):**
   - **Akar Masalah:** Kartu level di `openLevelPanel()` terlalu tinggi (4 baris teks per kartu yang mengulang `"JLPT N5 ·"`), sehingga tinggi total modal melebihi batas layar ponsel dan memotong tombol `Mulai ujian` serta menyembunyikan tombol `Selesai`.
   - **Solusi:** Menyederhanakan deskripsi level Jepang menjadi satu baris ringkas (`Pemula · kalimat dasar`, `Dasar · percakapan harian`, `Menengah · teks umum`, `Menengah atas · bisnis`, `Mahir · akademik & sastra`) dan menata `.level-picker-card` serta `.level-exam-cta` menjadi baris horizontal minimalis di `features/ui/fiezel-tactile-clay.css` dan `features/ui/mobile-edge-fit.css`. Seluruh isi modal kini tampil utuh dalam satu layar ponsel tanpa ada tombol yang terpotong.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Probe)

Hasil eksekusi probe Playwright (`probe-ja-flows.mjs` & `audit-ja-ux-bugs.mjs`):
- **`cefrLeaks` di seluruh rute (`home`, `latihan`, `vocab`, `grammar`, `reading`, `writing`, `kana`, `progress`, `profile`)**: `[]` (0 kebocoran `A1–C2` atau `N1+`).
- **`grammarSkillsTotal`**: `50` lesson kurikulum Jepang (`12` di N5).
- **`openGrammarLesson('particles')` + `practiceSkill('particles')`**: `quizShellVisible: true` (10 soal aktif).
- **`startGrammarQuickSession()`**: `quizShellVisible: true` (10 soal kilat aktif).
- **`startKanjiQuiz()`**: `quizShellVisible: true` (10 soal Kanji aktif).
- **`startJlptMoshiExam()`**: `quizShellVisible: true` (simulasi JLPT Moshi aktif).
- **`startLevelExam('A2')`**: `quizShellVisible: true` (25 soal Ujian Naik Level N4 aktif).
- **`startPlacement()`**: `quizShellVisible: true` (12 soal Tes Awal aktif).

---

## 3. Daftar Berkas yang Disentuh

- `app.js`
- `features/japanese/fiezel-ja-ui.js`
- `features/i18n/copy-id-bahasa.js`
- `features/i18n/copy-th-bahasa.js`
- `features/speaking-listening/fiezel-jlpt-listening.js`
- `features/ui/fiezel-tactile-clay.css`
- `features/ui/mobile-edge-fit.css`
- `index.html`
- `tests/japanese-ja-ui-test.js`
- `id-golden-baseline.json`
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html` (via `tools/bump-build.mjs`)

---

## 4. Status Kelulusan Gerbang Mutu Lokal

- `node tools/bump-build.mjs --check` -> **Selaras (`m025-637`)**
- `node tests/id-golden-snapshot-test.js` -> **PASS (13/13 berkas terkunci identik, 5933 literal utuh)**
- `node tests/th-ui-leak-test.js` -> **PASS (4497 kunci ID/TH 100% paritas)**
- `node tests/level-grammar-contract-test.js` -> **PASS (18/18 checks)**
- `node tests/target-lang-surface-guard-test.js` -> **PASS (13/13 asserts)**
- `node tests/japanese-ja-ui-test.js` -> **PASS (29/29 asserts)**
- `node tests/japanese-surface-honesty-test.js` -> **PASS (7/7 asserts)**
- `node tests/japanese-bank-survives-load-test.js` -> **PASS (5/5 asserts)**
- `node tests/japanese-course-wiring-test.js` -> **PASS (9/9 asserts)**
- `node tests/japanese-th-parity-test.js` -> **PASS (8/8 asserts)**
- `node tests/japanese-vocab-bank-test.js` -> **PASS (9/9 asserts)**
- `node tests/curriculum-cache-version-test.js` -> **PASS (26 assertions, build `m025-637`)**
- `node tests/gate-registry-test.js` -> **PASS (10/10 checks)**
