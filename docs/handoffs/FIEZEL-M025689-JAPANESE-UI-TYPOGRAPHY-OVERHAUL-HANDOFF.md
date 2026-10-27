# FIEZEL HANDOFF DOSSIER: M025-689
**Perombakan Total Tipografi Teks Jepang, Anotasi Furigana/Romaji, Umpan Balik Seleksi Jawaban, dan Tata Letak Responsif Multi-Viewport (Mobile, Tablet, Desktop)**

- **Nomor Build**: `m025-689`
- **Tanggal**: 28 Oktober 2026
- **Status Gerbang Mutu**: 100% LULUS (Hexa-Sync Selaras, 5 Quality Gates Hijau)

---

## 1. Ringkasan Temuan Audit & Akar Masalah

Pengguna melaporkan 4 kecacatan fatal pada alur onboarding dan tes penempatan kursus Jepang:
1. **Kebocoran Kunci Translasi Mentah (`onboarding.checking`)**:
   - *Gejala*: Pada layar pemilihan kursus (`05_onboarding_course.png`), tombol CTA utama sempat menampilkan teks mentah `onboarding.checking` saat proses verifikasi.
   - *Akar Masalah*: Fungsi `T(key, fallback)` di `fiezel-onboarding.js` memanggil `FiezelI18n.t(key, params)`, namun fungsi `t` belum mendukung parameter fallback string. Ketika kunci belum terdaftar di registry i18n, kunci mentah bocor ke UI.
2. **Tipografi & Anotasi Jepang Terfragmentasi & Terbalik-balik (Amburadul)**:
   - *Gejala*: Pada soal bacaan/tata bahasa Jepang (`09_placement_question_1.png`), satu kalimat dialog terpecah menjadi 5 fragmen terpisah, romaji berselang-seling per kata secara vertikal di ponsel, tanda petik mendempet ganda (`""`), spasi partikel hilang (`shinbuno`), dan garis kosong (`___`) terputus dari kalimat.
   - *Akar Masalah*: Regex `JA_RUN_RE` berhenti pada karakter spasi ASCII dan garis bawah `___`. Setiap potongan dibungkus dalam flexbox `.ja-run` berorientasi kolom (`display: inline-flex; flex-direction: column`). Saat teks membungkus baris di ponsel, fragmen 1 Jepang diikuti romaji 1, lalu fragmen 2 Jepang diikuti romaji 2, menghasilkan tampilan acak yang tidak terbaca.
3. **Absennya Indikator Seleksi Jawaban di Mode Tes Penempatan (`MEASURE`)**:
   - *Gejala*: Saat pengguna memilih opsi (`10_placement_question_answered.png`), seluruh tombol dinonaktifkan (`disabled`) secara seragam dan buram abu-abu (`opacity: .78`). Pengguna tidak bisa membedakan mana pilihan yang barusan mereka klik.
   - *Akar Masalah*: Blok `if (MEASURE)` di `app.js` menonaktifkan seluruh tombol `.option` tanpa membubuhkan kelas penanda seleksi aktif (`.is-selected`, `.picked`), dan CSS `fiezel-2.css` tidak memiliki aturan styling khusus untuk opsi terpilih dalam keadaan `disabled`.
4. **Tata Letak Dipaksakan & Tabrakan Notifikasi Toast**:
   - *Gejala*: Tampilan desktop dan tablet meregangkan tombol opsi hingga lebar 1000px+. Selain itu, notifikasi toast bertabrakan dan menutupi tombol toggle `[ ふりがな ] [ ローマ字 ]` di bagian atas.
   - *Akar Masalah*: Di `features/ui/fiezel-tactile-clay.css:6031`, selector `body:has(.quiz-shell) .toast` memaksakan posisi `top: calc(66px + env(safe-area-inset-top)); bottom: auto !important;`, tepat di atas tombol toggle Jepang.

---

## 2. Rincian Solusi & Implementasi Kode

1. **Mesin Anotasi & Tokenizer Jepang (`features/japanese/fiezel-ja-ui.js`)**:
   - Memperluas `JA_RUN_RE` menjadi `/[぀-ヿ㐀-䶿一-鿿々　-〿！-／：-？～\s_()（）]+/g` agar seluruh kalimat dialog, tanda baca, tanda kurung, dan slot kosong (`___`) diproses sebagai satu kesatuan utuh.
   - Mengembangkan `tokenize()` dengan pendeteksian partikel pintar (`は` -> `wa`, `を` -> `o`, `で` -> `de`, `が` -> `ga`), isolasi slot kosong `<span class="ja-blank">______</span>`, dan penanganan spasi kata majemuk (`いま ははは` -> `ima haha wa`).
   - Memperkaya leksikon Jepang dasar (`kesa`, `shinbun`, `jikan`, `daidokoro`, `gohan`, `tsukuru`, `yomu`, bentuk lampau negatif `yomimasen deshita`, `arimasen deshita`, dll.).
   - Membersihkan tipografi kutipan di `annotateRun()` (menghilangkan spasi liar setelah pembuka `「` dan sebelum penutup `」`, menata jarak spasi romaji).
2. **Penyempurnaan Styling & Tipografi (`fiezel-2.css`)**:
   - `.ja-run`: Ditata sebagai blok terstruktur dengan `line-height: 1.8`.
   - `.ja-run-text`: Teks Jepang tajam berbobot 700 dengan kontras tinggi. Furigana ruby di atas kanji diberi warna aksen elegan (`#7E2D3B`) yang mudah dipindai mata.
   - `.ja-blank`: Didesain sebagai slot isian interaktif modern dengan garis bawah tebal biru (`#2563EB`) dan latar lembut (`rgba(37,99,235,0.06)`).
   - `.ja-run-romaji`: Ditata sebagai subjudul transkripsi yang rapi dan terpisah garis halus tipis di bawah kalimat Jepang, bukan memotong-motong kata.
   - `.option .ja-run`: Ditata ringkas dan seimbang di dalam tombol pilihan.
   - `.option.is-selected`, `.option.picked`: Diberikan status aktif kontras tinggi (border biru tebal `#2563EB`, latar `#EFF6FF`, teks `#1E3A8A`, lencana huruf solid biru, dan opasitas penuh `1.0`). Pilihan yang tidak dipilih diredam menjadi opasitas `0.55`.
   - **Tata Letak Responsif Tablet & Desktop**:
     - Pada layar $\ge 640\text{px}$ (tablet) dan $\ge 1024\text{px}$ (desktop), kartu kuis dipusatkan (`max-width: 700px - 780px`), dan pilihan ganda ditata dalam kisi 2-kolom (`grid-template-columns: repeat(2, minmax(0, 1fr))`), membasmi tombol melar 1000px.
3. **Pemberian Indikator Seleksi Aktif (`app.js`)**:
   - Di handler `reveal()`, sebelum kunci ditutup pada mode `MEASURE`, tombol pilihan yang diklik `j` otomatis ditandai dengan kelas `is-selected`, `picked`, dan `aria-selected="true"`.
   - Pada mode latihan biasa (`!MEASURE`), opsi salah juga ditandai dengan kelas `.wrong` bila jawaban kurang tepat.
4. **Relokasi Posisi Toast (`features/ui/fiezel-tactile-clay.css`)**:
   - Mengubah posisi toast pada kuis: `top: auto !important; bottom: calc(84px + env(safe-area-inset-bottom)) !important;`. Toast kini muncul aman di atas bilah navigasi bawah tanpa menghalangi tombol toggle Furigana/Romaji.
5. **Dukungan Fallback i18n & Registrasi Kunci Lengkap (`features/i18n/`)**:
   - Menambahkan parameter `fallback` pada `FiezelI18n.t(key, params, fallback)`.
   - Mendaftarkan seluruh kunci onboarding yang sebelumnya hilang ke `copy-id-feat-b.js` dan `copy-th-feat-b.js` (`onboarding.checking`, `onboarding.path-*`, `social.error-handle-taken`).

---

## 3. Bukti Pengujian Empiris (Probe-Driven Headless Playwright)

Skrip pengujian otomatis dijalankan secara headless Chromium:
- `scratch/capture_first_time_level_test.js`: Menangkap seluruh alur onboarding dari awal hingga layar hasil tes penempatan (12 tangkapan layar penuh).
- `scratch/probe_active_quiz_desktop.js`: Menangkap pengujian kuis aktif dan pembuktian kisi 2-kolom serta active state pada tablet (768x1024) dan desktop (1280x800).
- Seluruh tangkapan layar tersimpan dan terverifikasi di:
  `c:/Users/hp/fiezel-apps/first_time_test_level/` dan
  `C:/Users/hp/.gemini/antigravity/brain/c3bb0f7b-6c16-484c-b9e6-010c71c7a6af/first_time_test_level/`

Hasil empiris:
- `05_onboarding_course.png`: Tombol CTA menampilkan "Lanjut" / "Memeriksa..." secara mulus tanpa kebocoran kunci mentah.
- `09_placement_question_1.png`: Teks Jepang tersusun utuh menjadi satu kalimat dialog mengalir, slot isian rapi, dan romaji tersusun rapi di bawah kalimat.
- `10_placement_question_answered.png`: Pilihan yang diklik murid langsung menyala biru tegas dengan lencana huruf putih solid, sementara opsi lain redup, dan panel "Tersimpan" muncul secara anggun.
- `tablet_active_quiz_q1_answered.png` & `desktop_active_quiz_q1_answered.png`: Kisi 2-kolom seimbang, tidak ada tombol yang melar janggal, kartu terpusat elegan.

---

## 4. Daftar Berkas yang Disentuh

1. `features/i18n/fiezel-i18n.js` (penambahan parameter fallback pada `t()`)
2. `features/onboarding/fiezel-onboarding.js` (forward fallback ke `I18N.t()`)
3. `features/i18n/copy-id-feat-b.js` (registrasi kunci Indonesia)
4. `features/i18n/copy-th-feat-b.js` (registrasi kunci Thailand)
5. `features/japanese/fiezel-ja-ui.js` (overhaul tokenizer kalimat dialog utuh, leksikon, partikel, & romaji)
6. `app.js` (penambahan kelas `is-selected`/`picked` pada opsi yang diklik di mode `MEASURE`)
7. `fiezel-2.css` (styling tipografi Jepang, Furigana, Romaji subtitle, slot blank, active selection state, dan grid 2-kolom tablet/desktop)
8. `features/ui/fiezel-tactile-clay.css` (perbaikan posisi toast di kuis mode agar tidak menabrak toggle)
9. `sw.js` (peningkatan nomor build ke `m025-689`)
10. `core-config.js` (peningkatan nomor build ke `m025-689`)
11. `features/neural-voice/fiezel-diag-panel.js` (peningkatan nomor build ke `m025-689`)
12. `coordination/BUILD-VERSION.json` (peningkatan nomor build ke `m025-689`)
13. `kurikulum.html`, `misi.html`, `call.html` (penyelarasan parameter versi cache query)
14. `id-golden-baseline.json` (sinkronisasi baseline snapshot literal emas Indonesia)

---

## 5. Status Gerbang Mutu Lokal & Catatan Kepatuhan

- `node tools/bump-build.mjs --check`: **Selaras (Hexa-Sync HIJAU)**
- `node tests/japanese-ja-ui-test.js`: **PASS (29/29 assertions HIJAU)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js`: **PASS (HIJAU)**
- `node tests/curriculum-cache-version-test.js`: **PASS (HIJAU)**
- `node tests/gate-registry-test.js`: **PASS (HIJAU)**
- **Git Protection Rule**: Sesuai mandat perlindungan git, seluruh hasil kerja berada di lingkungan lokal/preview dan tidak dilakukan commit/push ke branch `main` tanpa instruksi tertulis langsung dari pengguna.
