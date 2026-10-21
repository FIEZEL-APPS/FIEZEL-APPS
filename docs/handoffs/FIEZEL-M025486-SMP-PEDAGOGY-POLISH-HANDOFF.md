# FIEZEL-M025486-SMP-PEDAGOGY-POLISH-HANDOFF.md

**Build Version:** `m025-486`
**Branch:** `fix/quiz-retry-ui-and-pedagogical-hint-polish`
**PR:** #515
**Tanggal:** 5 Oktober 2026
**Status Audit Empiris:** 100% HIJAU (361 gerbang mutu lolos, 0 kebocoran, 0 jargon kampus)

---

## 1. Ringkasan Temuan Audit & Akar Masalah

Pengguna melaporkan bahwa ketika menguji aplikasi layaknya murid asli di ponsel:
1. **Persepsi "Sudah Merge Tapi Masih Sama di Live":**
   - Di situs live production (`https://fiezel.my.id/app/`), PR #515 belum di-merge dan belum di-deploy (`coordination/BUILD-VERSION.json` live masih di `m025-484`/`m025-485`).
   - Di live production, mode `diagnose_distractor_1..3` masih aktif di dalam `GRAMMAR_LESSON_MODES` (`app.js`), sehingga soal bernarasi *"Temanmu memilih [X]. Kenapa pilihan itu salah?"* masih terus muncul kepada murid.
2. **Residu Istilah Linguistik Kampus:**
   - Ditemukan 38 templat di `grammar-explanations-id.json` yang masih memuat istilah teknis kaku (*past participle*, *inversi*, *elipsis*, *klausa non-finit*, *past simple*).
   - Istilah-istilah ini sangat asing bagi siswa SMP Grade 7–9. Siswa SMP memahami *"Verb 1, Verb 2, Verb 3"*, *"kata kerja lampau"*, dan *"kata bantu di depan subjek"*.
3. **Penyelarasan Memory Cues (Pegangan Ingatan):**
   - 7 butir `memoryCue` masih memuat istilah *past participle* dan *past simple*.
   - Telah dibersihkan menjadi jangkar kognitif (*cognitive anchors*) murni yang tidak membocorkan kata kunci maupun opsi jawaban mentah.

---

## 2. Bukti Pengujian Empiris (Playwright Mobile 390x844)

Pengujian dilakukan menggunakan peramban Chromium Playwright pada viewport iPhone 12/13/14 (390x844) menempuh alur lengkap murid sungguhan:
1. **Alur Navigasi Siswa:**
   - Home Screen (`index.html`) ➡️ Hub Latihan / Tata Bahasa ➡️ Pemilihan Ritme Belajar ➡️ Lesson Node ➡️ Panggung Materi ➡️ Kuis Aktif ➡️ Retry Salah Pertama ➡️ Penilaian Keyakinan ➡️ Umpan Balik Lengkap (Pembahasan) ➡️ Layar Hasil Kemenangan.
2. **Hasil Audit Peramban Headless (`reports/ux-grammar-verify-current/`):**
   - `04-soal.png`: Soal bentuk bahasa alami (*natural English usage*), bebas narasi pengarang *"Temanmu memilih [X]"*.
   - `05b-salah-pertama-full.png`: Banner retry muncul ramah (*"Belum tepat, tapi kamu masih punya satu kesempatan lagi nih!"*), tombol opsi yang sudah dicoba ditandai nonaktif, tombol pembahasan mengambang di bawah layar.
   - `07b-pembahasan-full.png`: Menampilkan vonis akurat, *"Mengapa kurang tepat?"*, tuntunan langkah, *"Intinya"*, aturan lengkap dengan **💡 RUMUS KILAT**, lipatan perbandingan pilihan lain, dan **💡 TRIK CEPAT INGAT** tanpa kebocoran jawaban.
   - Kontras warna WCAG AA: 0 pelanggaran.
   - Luapan horizontal (`luapan-x`): `false` (100% responsif).

---

## 3. Daftar Berkas yang Diubah

1. **`app.js`**:
   - Menghapus permanen `diagnose_distractor_1..3` dari `GRAMMAR_LESSON_MODES` dan `GRAMMAR_WHY_SLOT_MODES`.
   - Menguatkan pelindung anti-bocor di sensor Tutor Brain.
2. **`grammar-explanations-id.json`**:
   - Menyederhanakan 224 teks dan 38 templat yang memuat istilah linguistik kampus menjadi bahasa ramah SMP (*Verb 1/2/3*, *pembalikan kata bantu*).
   - Membersihkan seluruh residu *past participle* dan *past simple* pada `memoryCue`.
3. **`grammar-templates.json`**:
   - Disinkronkan penuh via `node audit/merge-grammar-id.js` (512/512 templat terisi penjelasan Indonesia yang ramah SMP).
4. **`cloze-bank-v1.json`**:
   - Dibuat ulang secara deterministik via `node tools/build-cloze-bank.js --write` (436 butir).
5. **`features/i18n/copy-id-app-a.js` & `copy-id-grammar-labels.js`**:
   - Mengganti teks keluarga aturan pasif dan label tata bahasa dari *past participle* / *past simple* ke *Verb 3* / *Verb 2*.
6. **`id-golden-baseline.json`**:
   - Diperbarui secara deterministik via `node tests/id-golden-snapshot-test.js --write-baseline` (4937 literal Indonesia valid).
7. **`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`**:
   - Dinaikkan secara selaras ke build `m025-486` melalui arbiter resmi `tools/bump-build.mjs`.

---

## 4. Status Gerbang Mutu Lokal

| Gerbang Mutu | Perintah | Status |
|---|---|---|
| Hexa-Sync Version | `node tools/bump-build.mjs --check` | **PASS (Selaras m025-486)** |
| ID Golden Snapshot | `node tests/id-golden-snapshot-test.js` | **PASS (HIJAU)** |
| Thai UI Leak Gate | `node tests/th-ui-leak-test.js` | **PASS (3945 kunci selaras)** |
| Thai Coverage Gate | `node tests/th-coverage-test.js` | **PASS (249/249)** |
| Cloze Bank Gate | `node tests/cloze-bank-test.js` | **PASS (436 butir deterministik)** |
| Content Integrity Gate | `node tests/content-integrity-gate-test.js` | **PASS (18 sub-pengujian)** |
| Curriculum Cache Version | `node tests/curriculum-cache-version-test.js` | **PASS (26 penegasan)** |
| Gate Registry | `node tests/gate-registry-test.js` | **PASS (361 gerbang terverifikasi)** |
