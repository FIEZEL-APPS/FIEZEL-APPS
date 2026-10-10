# FIEZEL-M025-541-BRAINCORE-FEEDBACK-REPAIR-HANDOFF.md

## 1. Ringkasan Eksekutif & Temuan Audit Pedagogis
Audit sistemik dan orkestrasi perbaikan ini dipicu oleh temuan cacat fatal pada umpan balik scaffolding BrainCore saat murid menjawab salah pada latihan tata bahasa, sebagaimana terekam pada tangkapan layar `IMG_2634.png` dan `IMG_2633.png`:
- **Soal Kasus (A1-336)**: *"Your pencil fell. Look ___ your chair!"* (Opsi: `under`, `on`, `in`, `to`; Kunci: `under`).
- **Pilihan Murid**: Distraktor `on`.
- **Cacat di Layar Murid**:
  1. Tutor BrainCore menampilkan *"CONTOH MIRIP DARI SOAL LAIN"*:
     > *"Langkah 2, kita terapkan ke kalimatnya: 'Sit ___ me, Rina. This chair is empty'. Langkah 3, jadi bentuk yang paling pas: 'next to'. Sekarang pakai langkah yang sama untuk soalmu."*
  2. **Langkah 1 (Aturan tata bahasa) LENYAP/HILANG**.
  3. Contoh mirip yang disodorkan (`next to`) sama sekali bukan anggota opsi soal A1-336, tidak relevan dengan konsep benda jatuh ke lantai di bawah kursi, dan menyesatkan murid karena menyuruh murid *"memakai langkah yang sama"* padahal `next to` tidak ada di pilihan!

### Akar Masalah Sistemik (Root Causes)
1. **Pemusnahan Aturan oleh Heuristik Bahasa (`app.js:tutorIndonesian`)**:
   - `tutorIndonesian` menyaring teks dengan kondisi `en >= 3 && en > id`.
   - Sebanyak **68 template tata bahasa (13% dari bank)** memiliki aturan bahasa Indonesia (`ruleId`) yang memuat contoh kalimat pendek bahasa Inggris (seperti `in the classroom`, `on the table`, `at the bus stop`). Kata artikel `the` muncul 5 kali, sedangkan daftar penanda kata Indonesia `TUTOR_ID_MARKERS` belum mencakup kata umum seperti `kalau`, `di`, `dalam`, `pakai`, `atas`, `posisi`, `tempat`.
   - Akibatnya, `ruleId` terdeteksi salah sebagai bahasa Inggris dan dihapus menjadi string kosong `''`.
2. **Ketiadaan Langkah 1 di `workedExample` (`features/brain/fiezel-tutor-brain.js`)**:
   - Fungsi `workedExample` hanya memeriksa `if (rule) steps.push(step1)`. Ketika `rule` bernilai string kosong `''` akibat bug heuristik di atas, langkah 1 tidak dimasukkan, namun langkah 2 dan 3 tetap dimasukkan dan digabung.
   - Hasilnya adalah contoh cacat tanpa Langkah 1 yang menyuruh murid meniru contoh tanpa dasar kaidah.
3. **Penyaringan Paradoksal Pengecoh Preposisi (`app.js:grammarSimilarExample`)**:
   - `grammarSimilarExample` menggunakan set `taken` yang memblokir semua soal yang kunci jawabannya ada di pilihan soal saat ini (`under`, `on`, `in`, `to`).
   - Karena preposisi dasar adalah kelas leksikal tertutup (closed-class), pemblokiran tersebut membuang semua soal yang menggunakan preposisi tempat utama, menyisakan soal acak (`A1-334`) yang menguji `next to`.
4. **Panggilan Bar Mengambang Retry Hilang (`app.js:showQuizFloatingRetry`)**:
   - Panggilan `showQuizFloatingRetry(q,j)` pada cabang retry pilihan ganda di `answer()` terhapus dalam integrasi sebelumnya, sehingga tombol `#quizRetryGiveUp` ("Buka Pembahasan") tidak terpasang di DOM dan menyebabkan kegagalan regresi B4.
5. **Kebocoran Tip Infleksi Kata Kerja ke Kategori Bukan Kata Kerja (`cloze-bank-v1.json`)**:
   - Sebanyak 31 butir cloze non-verb (modal verbs, kata ganti, kata penunjuk, preposisi) memuat tip seragam hasil copy-paste: *"Tulis bentuk lengkapnya, jangan hanya kata dasarnya."* padahal kata-kata tersebut tidak memiliki kata dasar/infleksi.

---

## 2. Perbaikan Kode & Kurikulum Terverifikasi

### A. Mesin Tutor & Scaffolding (`features/brain/fiezel-tutor-brain.js`)
- `workedExample` kini mewajibkan integritas pedagogis 3 langkah utuh:
  - Jika kaidah (`rule`) tidak tersedia atau langkah tidak lengkap (< 3 langkah), sistem **tidak akan pernah** menampilkan langkah 2 dan 3 yang buntung.
  - Sistem otomatis fallback secara elegan ke `brain-tutor.worked-fallback` (*"Kuncinya pada {concept}: ikuti bentuk yang diminta konteks kalimatnya ya."*).

### B. Heuristik Filter Bahasa Indonesia (`app.js`)
- `TUTOR_ID_MARKERS` diperluas dengan 30+ kata fungsi dan tata bahasa Indonesia (`di`, `ke`, `kalau`, `jika`, `bila`, `adalah`, `yaitu`, `seperti`, `contoh`, `pakai`, `gunakan`, `artinya`, `posisi`, `tempat`, `bawah`, `atas`, `dalam`, `luar`, `depan`, `belakang`, `pola`, `rumus`, `aturan`, `buat`, `sama`, `tanpa`, `susunan`, `klausa`, `kebanyakan`, `nama`, `jadwal`, `pelaporan`).
- Pembersihan tag HTML (`value.replace(/<[^>]+>/g, ' ')`) dilakukan sebelum evaluasi.
- Ambang penolakan diperketat menjadi: `(en >= 3 && id === 0) || (en >= 5 && en > id * 2)`.
- **Hasil**: 0 dari 512 aturan bahasa Indonesia terhapus (100% dipulihkan utuh).

### C. Pencegahan Contoh Asing Preposisi (`app.js`)
- `grammarSimilarExample` segera mengembalikan `null` untuk subskill preposisi (`/preposition/i.test(skill) || family === 'prepositions'`).
- Jika `mirip === null`, tutor BrainCore secara elegan menyajikan tuntunan penalaran 3 langkah pada soal murid itu sendiri (`stepTutorGuidanceMarkup(q)`) tanpa membingungkan murid dengan preposisi asing dari luar opsi.

### D. Restorasi Floating Retry Bar (`app.js`)
- Memanggil `showQuizFloatingRetry(q, j)` tepat sebelum `speak(...)` pada cabang retry pilihan ganda di `answer()`.
- Menjamin tombol "Buka Pembahasan" (`#quizRetryGiveUp`) selalu hadir di DOM dan dapat diakses murid maupun skrip otomasi.

### E. Zero-Loss Input & Distractor Formatting (`app.js` & `fiezel-grammar-upgrade.js`)
- `record()` mencatat input ketik murid (`q.__typedAnswer`) untuk cloze dan token susun kata (`q.__userTokenAnswer`) ke dalam `state.history` serta `correctAnswer` kanonik.
- `diagnoseTokenOrderMistake` mendukung distraktor objek `{option: "..."}` tanpa menghasilkan bug string `"[object Object]"`.
- `buildFeedbackHTML` mendukung `q.__userTokenAnswer` dan mencegah manipulasi tampilan jawaban murid.

### F. Kurasi Database Soal & Bank Cloze
- `grammar-templates.json` & `grammar-explanations-id.json`:
  - 14 template dikurasi dan diselaraskan dua arah via `tools/patch-grammar-templates-feedback.js`, `tools/sync-grammar-explanations-id.js --write`, dan `audit/merge-grammar-id.js`.
  - Aturan preposisi A1-336, A1-333, A1-335, A1-334, PR-006, A1-013 kini 100% spesifik sesuai opsi masing-masing soal.
- `cloze-bank-v1.json` & `cloze-explains-v1.json`:
  - 31 butir non-verb diperbaiki dengan tip kesalahan (`avoid`) spesifik konteks (aturan formal, kepemilikan, negasi ganda, dll).
- `id-golden-baseline.json` diperbarui secara sadar melalui `node tests/id-golden-snapshot-test.js --write-baseline`.

---

## 3. Bukti Pengujian Empiris (Playwright Probes & Quality Gates)

### A. Pengujian Headless Playwright Kasus Tangkapan Layar
Skrip probe Playwright: `tools/dev/probe-grammar-retry-screenshot.js`
- **Skenario**: Membuka soal A1-336 (*"Your pencil fell. Look ___ your chair!"*), memilih distraktor `on`.
- **Hasil Eksekusi**:
  ```
  --- EMPIRICAL PROBE RESULT FOR SCREENSHOT A1-336 ---
  Question Stem: Your pencil fell. Look ___ your chair!
  Options: [ 'in', 'to', 'under', 'on' ]
  Diagnostic Clue on "on": Pilihan “on” kurang tepat: “on” artinya di atas dudukan kursi, padahal pensil yang jatuh ada di lantai. Coba pilih opsi lainnya ya!
  Ladder on First Retry: PEGANGAN INGATAN
  Similar Example found for prepositions?: null
  Worked Turn Output:
    say: 'Pilihan tadi kurang pas karena artinya di atas dudukan kursi, padahal pensil yang jatuh ada di lantai. Aku contohkan satu yang mirip dulu ya, biar makin jelas langkahnya.'
    ask: 'Kuncinya pada Menentukan posisi letak benda (kata depan tempat):<br>• in: di dalam ruang tertutup atau wadah... • on: menempel di atas permukaan... • under: di bagian bawah sesuatu... • to: arah pergerakan... RUMUS KILAT: Di bagian bawah ➡️ under.'
  PROBE SUCCESS: All assertions for screenshot A1-336 PASSED!
  ```

### B. Status Kelulusan Seluruh Gerbang Mutu Lokal
1. `tests/grammar-feedback-regression-test.js`: **PASS (24/24)**
2. `tests/tutor-brain-v3-test.js`: **PASS (62 assertions)**
3. `tests/id-golden-snapshot-test.js`: **PASS (Baseline Emas Indonesia Utuh)**
4. `tests/th-ui-leak-test.js`: **PASS (Nol Kebocoran Teks)**
5. `tests/content-drift-test.js`: **PASS (512 Template Sinkron Dua Arah)**
6. `tests/curriculum-cache-version-test.js`: **PASS (26 Penegasan, Build m025-541)**
7. `tests/gate-registry-test.js`: **PASS (365 Gerbang Sah)**
8. `tests/grammar-curriculum-test.js`: **PASS (180 Pelajaran Utuh)**

---

## 4. Status Hexa-Sync & PWA Release Arbiter
Pemeriksaan build resmi:
```json
{
  "sumber": "m025-541",
  "terpasang": {
    "sw.js": "m025-541",
    "core-config.js": "m025-541",
    "features/neural-voice/fiezel-diag-panel.js": "m025-541"
  },
  "selaras": true
}
```
6 Titik Keselarasan:
- `coordination/BUILD-VERSION.json` -> `m025-541`
- `sw.js` -> `m025-541`
- `core-config.js` -> `m025-541`
- `features/neural-voice/fiezel-diag-panel.js` -> `m025-541`
- `kurikulum.html` -> `?v=m025-541`
- `misi.html` -> `?v=m025-541`

---

## 5. Berkas yang Disentuh (Touched Files)
1. `features/brain/fiezel-tutor-brain.js` (perbaikan integritas 3 langkah `workedExample` & fallback aman)
2. `app.js` (`tutorIndonesian` regex, `grammarSimilarExample` guard preposisi, `showQuizFloatingRetry` call, `record` zero-loss cloze/token-order, `diagnoseTokenOrderMistake` object distractor)
3. `features/grammar/fiezel-grammar-upgrade.js` (`buildFeedbackHTML` zero-loss token support)
4. `grammar-templates.json` (kurasi 14 template preposisi, habitual past, pembersihan kebocoran bahasa)
5. `grammar-explanations-id.json` (sinkronisasi dua arah dengan bank template)
6. `cloze-bank-v1.json` (perbaikan 31 butir avoid tip non-verb)
7. `cloze-explains-v1.json` (sinkronisasi 31 butir avoid tip non-verb)
8. `id-golden-baseline.json` (pembaruan baseline snapshot emas)
9. `tools/patch-grammar-templates-feedback.js` (skrip kurasi template)
10. `tools/patch-cloze-nonverb-avoids.js` (skrip kurasi cloze bank)
11. `tools/dev/probe-grammar-retry-screenshot.js` (skrip probe Playwright)
12. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html` (bump build `m025-541`)
