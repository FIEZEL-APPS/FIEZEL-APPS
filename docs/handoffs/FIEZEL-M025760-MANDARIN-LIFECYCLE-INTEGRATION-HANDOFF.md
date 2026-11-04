# FIEZEL HANDOFF DOSSIER: MANDARIN CORE LIFECYCLE & VOICE STUDIO INTEGRATION (m025-760)

## 1. Ringkasan Eksekutif & Akar Masalah
Pada audit rilis m025-759, ditemukan bahwa meskipun modul dan aset data Mandarin (`vocabulary-master-zh.json`, `grammar-templates-zh.json`, `reading-bank-zh.json`, dll.) telah tersimpan di repositori, integrasi siklus hidup inti di `app.js` dan `voice-studio.js` belum terhubung sepenuhnya:
1. `load()` di `app.js` hanya memuat dataset untuk `activeTargetLang() === 'ja'` atau fallback ke Inggris. Saat mode Mandarin (`zh`) dipilih, `V`, `G`, dan `R` tetap berisi dataset bahasa Inggris atau kosong.
2. `startLevelPractice()` dan `startLevelPlacement()` mengembalikan "0 soal yang valid / tes belum bisa dijalankan" karena tidak menemukan kata Mandarin pada dataset yang tidak terhidrasi.
3. `setTargetLangPreference()` membatasi nilai tujuan `(next === 'ja') ? 'ja' : 'en'`, sehingga setiap pemilihan `zh` langsung dipaksa kembali menjadi `en`.
4. `updateTopbarCourseButton()` dan `toggleTargetCourse()` hanya mendukung pertukaran dwibahasa Inggris <-> Jepang, tanpa ikon bendera Tiongkok dan label Mandarin.
5. `fiezel-interactive-chat.js` melakukan penimpaan kursus bawaan `lang = 'ja'` dan menulis `localStorage.setItem('fz_target_course', lang)`, sehingga saat murid masuk atau keluar dari Kawan Bicara (Mitra Kaiwa Studio), preferensi bahasa murid terlempar kembali ke Jepang.
6. `features/voice-studio/dist/voice-studio.js` dan `src/lib/braincore.ts` membatasi verifikasi parameter bahasa `(i === "ja" || i === "en")`, mengabaikan `zh` dan menyebabkan voice studio gagal memuat persona Xiao Mochi untuk Mandarin.
7. Tampilan progres murid membaca tata bahasa Inggris/Jepang akibat kebocoran status.

## 2. Perubahan Teknis yang Diterapkan
- **`app.js`**:
  - Menyambungkan cabang `else if (activeTargetLang() === 'zh')` di dalam `load()` untuk memuat `grammar-templates-zh.json`, `family-graph-zh.json`, `vocabulary-master-zh.json`, `reading-bank-zh.json`, dan `writing-prompts-zh.json` ke dalam `V`, `G`, `R`, dan `WRITING_BANK`.
  - Memperbarui `setTargetLangPreference()` untuk mengenali `zh`: `(next === 'ja') ? 'ja' : (next === 'zh' ? 'zh' : 'en')`.
  - Memperbarui `updateTopbarCourseButton()` dengan SVG bendera Tiongkok resmi (merah berbintang kuning) dan label `中文 ▾`.
  - Menghubungkan tombol alih kursus ke `FiezelMandarinUI.openCourseModal()` untuk pemilihan tiga kursus (`en`, `ja`, `zh`).
  - Menambahkan bank soal pemanasan cepat Mandarin (`qw-zh-1`, `qw-zh-2`, `qw-zh-3`) pada `startQuickWinLesson()`.
- **`features/interactive-chat/fiezel-interactive-chat.js`**:
  - Membaca `fz_target_course` dengan prioritas `zh` dan mencegah penimpaan paksa ke `ja`.
- **`features/mandarin/mandarin-ui.js`**:
  - Mengekspor alias `openCourseModal` ke `openCoursePickerModal`.
- **`features/voice-studio/`**:
  - Memperbarui `src/lib/braincore.ts` dan mem-patch `dist/voice-studio.js` agar mendukung `zh` pada pembacaan parameter URL, `localStorage`, BKT telemetry, dan pencatatan riwayat skenario.
- **`tools/bump-build.mjs`**:
  - Menaikkan versi build ke `m025-760` dan menyelaraskan 6 titik wajib.

## 3. Bukti Verifikasi Empiris Playwright
Semua 7 titik uji mutu empiris telah diuji dan lulus 100% via `tools/dev/probe-mandarin-full-7-points.mjs`:
1. ✓ Hidrasi Bank Konten Mandarin: 2.194 kata kosakata (`V`), 192 template tata bahasa (`G`), 49 bacaan (`R`).
2. ✓ Tampilan Latihan: Render bersih tanpa crash.
3. ✓ Latihan Level A1: Berjalan lancar tanpa galat "0 soal yang valid".
4. ✓ Tes Penempatan Level A1: 10 butir soal Mandarin berjalan mulus tanpa hambatan.
5. ✓ Kawan Bicara (Mitra Kaiwa Studio): Membuka dengan `lang=zh` tanpa merusak `fz_target_course`.
6. ✓ Retensi Kursus: Kembali ke Home tetap mempertahankan bahasa Mandarin (`zh`).
7. ✓ Kemurnian Progres: Bebas dari kebocoran materi Jepang/Inggris.

## 4. Status Gerbang Mutu Lokal
- `node tests/mandarin-blueprint-integrity-test.js`: PASS (8/8 pilar 100%)
- `node tests/mandarin-multi-course-probe.js`: PASS (100%)
- `node tests/mandarin-pinyin-ruby-test.js`: PASS (100%)
- `node tests/mandarin-tutor-braincore-feedback-test.js`: PASS (100%)
- `node tests/id-golden-snapshot-test.js`: PASS (Baseline emas Indonesia utuh)
- `node tests/th-ui-leak-test.js`: PASS (Anggaran literal 3/3 di `app.js`)
- `node tests/curriculum-cache-version-test.js`: PASS (m025-760 selaras di 3 halaman)
- `node tests/gate-registry-test.js`: PASS (10/10 gerbang mutu valid)
