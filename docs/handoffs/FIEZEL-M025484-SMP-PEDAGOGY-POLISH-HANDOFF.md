# FIEZEL HANDOFF DOSSIER: SMP PEDAGOGICAL POLISH & ANTI-LEAK CUE SANITIZATION
**Build Version:** `m025-484`
**Base Commit / Branch:** `fix/quiz-retry-ui-and-pedagogical-hint-polish`
**Target Branch:** `main`
**Hexa-Sync Status:** `Selaras` (6/6 titik tersinkronisasi)
**Date:** 2026-10-05

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan keluhan langsung pengguna dan audit empiris mendalam atas 512 templat tata bahasa (`grammar-templates.json` & `grammar-explanations-id.json`):
1. **Kebocoran Kunci Jawaban di Pegangan Ingatan (`memoryCue` / `memoryCueId`):**
   - Ditemukan **378 templat** di mana petunjuk membeberkan jawaban mentah langsung kepada murid (misal: *"Kalau ini aturan, pakai 'must'"*, *"Ada 'Look!', berarti lihat bentuk -ing-nya"*, *"Keputusan seketika, pakai 'will' seketika"*, *"Baru muncul pakai a atau an, udah dikenal pakai the"*).
   - Di sisi runtime tutor brain (`fiezel-tutor-brain.js`), saat murid meminta bantuan atau masuk putaran retry, petunjuk ingatan ini disodorkan mentah-mentah sehingga kesempatan kedua praktis membocorkan jawaban tanpa melatih nalar kognitif siswa.
2. **Residu Mode 'Teman kamu memilih [X], kenapa pilihan itu salah' (`diagnose_distractor_*`):**
   - Mode ini membebani siswa SMP dengan paragraf meta-linguistik teori panjang di layar ponsel. Di PR #512 (commit `97a84524`), generator soal sempat mengizinkan kembali mode ini ke kolam latihan aktif.
   - Di `copy-th-app-a.js:432`, teks Thai masih memuat figur *"เพื่อนเลือก"* (teman memilih).
3. **Istilah Linguistik Abstrak / Jargon Kampus untuk Siswa SMP:**
   - Ditemukan **32 templat** yang memuat istilah sintaksis akademik kaku seperti *"past participle"*, *"past simple"*, *"inversi"*, *"elipsis"*, dan *"klausa non-finit"*. Bagi anak SMP kelas 7–9 di Indonesia (Kurikulum Merdeka), istilah ini tidak dikenal dan membingungkan; siswa terbiasa dengan istilah *Verb 1*, *Verb 2*, *Verb 3*, dan pembalikan susunan kata tanya.

---

## 2. Solusi & Perubahan yang Diterapkan

1. **Sanitasi Total 378 Memory Cues Menjadi Cognitive Anchors (0 Kebocoran):**
   - Seluruh 378 memory cues yang membocorkan kunci jawaban dirombak total menjadi pemicu kognitif (*cognitive anchors*) ramah siswa SMP.
   - **Zero Answer Leak:** Dilarang menyebutkan kata kunci jawaban atau opsi distractor.
   - **Zero Suffix Spoiler:** Dilarang memberikan jalan pintas akhiran (-ed, -ing, -s, -es).
   - **Zero Directive Choice:** Dilarang memberi perintah tumpul ("pakai X", "pilih X"). Diganti menjadi panduan berpikir (misal: *"Periksa tingkat keharusannya: apakah aturan resmi atau anjuran biasa?"*, *"Perhatikan penanda seruan: apakah kejadiannya sedang berlangsung di depan mata?"*).
2. **Penyederhanaan Istilah Jargon Kampus Menjadi Bahasa SMP (0 Jargon Tersisa):**
   - *past participle* ➡️ *kata kerja bentuk ketiga (Verb 3)*
   - *past simple* ➡️ *kata kerja bentuk lampau (Verb 2)*
   - *inversi* ➡️ *pembalikan kata kerja bantu ke depan subjek*
   - *elipsis* ➡️ *peringkasan kalimat tanpa mengulang kata kerja*
   - *klausa non-finit* ➡️ *anak kalimat ringkas tanpa kata kerja berwaktu*
3. **Eradikasi Total `diagnose_distractor_*` dari Seluruh Kolam Latihan Aktif:**
   - `app.js`: `GRAMMAR_LESSON_SLOTS`, `GRAMMAR_PRACTICE_SLOT_MODES`, dan `GRAMMAR_WHY_SLOT_MODES` dikunci 100% ke mode bentuk bahasa alami (`apply_form`, `complete_sentence`, `repair_distractor_1..3`).
   - `copy-id-app-a.js`: Diubah menjadi *"Pilihan {opsiDikutip} kurang tepat untuk kalimat ini. Mengapa?\n{stem}"*.
   - `copy-th-app-a.js`: Baris 432 dicabut dari figur teman (*"ตัวเลือก {opsiDikutip} ไม่เหมาะสมสำหรับประโยคนี้ เพราะเหตุใด?\n{stem}"*).
4. **Sensor Anti-Bocor Berlapis di Tutor Brain (`fiezel-tutor-brain.js`):**
   - Sensor `bocor()` mendeteksi kunci jawaban, opsi pilihan mentah, dan pola akhiran (-ed, -ing, -s) sebelum disajikan ke murid.
5. **UI Polish & Immutability:**
   - Huruf opsi [A, B, C, D] terkunci permanen pada indeks `data-choice`.
   - Clearance 220px menjamin floating bar retry tidak menutupi Petunjuk Guru & Pegangan Ingatan.

---

## 3. Bukti Pengujian Empiris (Playwright & Probe Suite)

Jalankan pengujian empiris langsung pada lingkungan lokal:
- `node tests/quiz-retry-polish-probe.js`
  - PROBE 1 PASS: Option letters locked immutably to data-choice indices
  - PROBE 2 PASS: 220px bottom clearance for tutor turn against floating bar
  - PROBE 3 PASS: Tutor brain anti-leak suppresses suffix and word leaks
  - PROBE 4 PASS: Templates memory cues sanitized for SMP students
  - PROBE 5 PASS: diagnose_distractor removed from active pools
  - **ALL 5 EMPIRICAL PROBES PASSED 100%!**
- `node tools/dev/build-empirical-audit-report.mjs`
  - **Total Memory Cue Leaks: 0**
  - **Total Jargon Entries: 0**
  - **512 / 512 Templat 100% Bersih & Selaras**

---

## 4. Status Kelulusan Gerbang Mutu Lokal

| Gerbang Uji | Perintah Eksekusi | Status | Catatan |
|---|---|---|---|
| Content Drift Gate | `node tests/content-drift-test.js` | **PASS** | 512 template sinkron dua arah |
| Cloze Bank Gate | `node tests/cloze-bank-test.js` | **PASS** | 436 butir deterministik, 0 leak |
| Grammar Lesson Rule | `node tests/grammar-lesson-rule-test.js` | **PASS** | 8/8 lolos |
| Content Integrity Gate | `node tests/content-integrity-gate-test.js` | **PASS** | 18/18 lolos |
| ID Golden Baseline | `node tests/id-golden-snapshot-test.js` | **PASS** | Baseline emas Indonesia diperbarui |
| Thai UI Leak Gate | `node tests/th-ui-leak-test.js` | **PASS** | 3767 kunci id memiliki padanan th |
| Curriculum Cache Gate | `node tests/curriculum-cache-version-test.js` | **PASS** | Terdaftar pada m025-484 |
| Gate Registry Meta | `node tests/gate-registry-test.js` | **PASS** | 352 gerbang bukti lolos |
| Release Arbiter | `node tools/bump-build.mjs --check` | **PASS** | Hexa-Sync `Selaras` di m025-484 |

---

## 5. Daftar Berkas yang Disentuh

1. `app.js`: Eradikasi mode `diagnose_distractor_*` dari slot latihan grammar, penguncian huruf opsi A-D, dan pembersihan retry state.
2. `features/brain/fiezel-tutor-brain.js`: Penguatan sensor anti-bocor `bocor()` terhadap kunci jawaban dan akhiran kata.
3. `features/i18n/copy-id-app-a.js`: Netralisasi narasi diagnosis stem tanpa membawa nama teman.
4. `features/i18n/copy-th-app-a.js`: Penghapusan teks Thai *"เพื่อนเลือก"* (teman memilih) pada baris 432.
5. `style.css` & `fiezel-2.css`: Penambahan clearance bottom 220px dan visual lock untuk layout retry mobile.
6. `grammar-templates.json`: Penyederhanaan 32 jargon linguistik dan sanitasi 378 memory cues menjadi cognitive anchors.
7. `grammar-explanations-id.json`: Sinkronisasi dua arah penuh dengan `grammar-templates.json`.
8. `cloze-bank-v1.json`: Regenerasi deterministik cloze bank (436 butir) dari sumber yang telah disanitasi.
9. `id-golden-baseline.json`: Pembaruan snapshot emas teks Indonesia berlisensi.
10. `tools/sanitize_pedagogy.py`: Skrip sanitasi master dan verifikasi gerbang pedagogi.
11. `reports/empiris-audit-pedagogi-smp.json`: Laporan audit empiris komprehensif (0 leak, 0 jargon).
12. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Build bump sinkron ke `m025-484`.
