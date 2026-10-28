# FIEZEL HANDOFF · M025-709
**Judul**: Aktivasi Laci Umpan Balik Pedagogis Instan & Kolam Seimbang Vocab-Grammar-Listening pada Tes Penempatan (Placement Test)
**Nomor Build**: `m025-709`
**Tanggal**: 29 Oktober 2026
**Penulis**: Antigravity Agent (`53c29b7d`)
**Branch**: `feat/placement-pedagogy-epic`

---

## 1. Latar Belakang & Masalah (Review Pengguna Fiezel)
Berdasarkan review nyata dari pengguna baru Fiezel, terjadi friksi besar pada alur penempatan level pertama kali (*placement test*):
1. **Hostile Reading Ambush**: Saat murid memilih level (misal A2, B1, B2) atau tes awal, mereka disuguhi teks bacaan (*reading comprehension*) panjang dan rumit yang membuat mereka kewalahan dan akhirnya menyerah (churn).
2. **Ketiadaan Umpan Balik Instan ("Jawaban Tersimpan" Sterile Lockout)**: Pada implementasi lama, tes penempatan diperlakukan sebagai mode ukur kaku (`MEASURE`), sehingga jawaban murid hanya dibalas dengan tanda terima netral (*"Jawabanmu sudah dicatat untuk menentukan level belajarmu"*). Seluruh highlight warna (hijau/merah), alasan keliru (*whyFails*), aturan tata bahasa (*grammar rule*), trik cepat ingat (*memory cue*), serta reaksi maskot dimatikan. Padahal, tes awal adalah titik sentuh pertama (*first touch*) di mana murid seharusnya melihat kehebatan dan kecerdasan analisis pedagogis Fiezel.
3. **Keterbatasan Bank Audio Listening**: Bank listening tes penempatan sebelumnya hanya memuat bahasa Inggris dan belum mengintegrasikan materi Chōkai JLPT N5–N1 untuk kursus Bahasa Jepang.

---

## 2. Solusi yang Diterapkan

### A. Aktivasi Penuh Laci Umpan Balik Pedagogis (`quizLoop` & `reveal`)
- Membedakan mode ujian formal tertutup (`level-exam`, `grammar-skip`) dengan tes penempatan (`cfg.placement`).
- Pada `cfg.placement`, seluruh alur umpan balik kaya tetap aktif:
  - Opsi jawaban mendapatkan sorotan warna langsung: hijau (`.correct`) dan merah (`.wrong`).
  - Sinyal audio & haptik instan (`answerFeedbackSignal(ok)`).
  - Melewati popup keyakinan (*confidence pop*) agar alur tes tetap cepat dan tidak melelahkan.
  - Membuka laci umpan balik lengkap:
    - Judul vonis (*"Tepat sekali!"* / *"Hampir!"* / *"Kurang tepat"*).
    - Tuntunan langkah berpikir (*Step-by-step guidance*).
    - Penjelasan inti (*"Intinya..."*).
    - Analisis distraktor & alasan salah (*whyFails*).
    - Kartu aturan lengkap (*"Lihat aturan lengkap"*).
    - Kotak trik cepat ingat (*"TRIK CEPAT INGAT"*).
    - Tombol konsultasi AI (*"Jelaskan dengan cara yang lebih sederhana"*).
    - Reaksi maskot adaptif (*pawReact*).
  - Tombol **Lanjut** mengambang (*floating next button*) otomatis aktif.

### B. Eliminasi Total Teks Bacaan Panjang pada Penempatan Level
- Membangun `startLevelPlacement(level)` untuk menggantikan `startLevelPractice(level)` pada tombol grid level A1–C2.
- `startLevelPlacement(level)` menghasilkan 10 butir soal terkurasi:
  - 4 Kosakata (*Vocabulary*)
  - 4 Tata Bahasa (*Grammar*)
  - 2 Mendengar (*Listening*)
  - **0 Teks Bacaan Panjang**
- Menambahkan filter pada `startLevelPractice(level)` untuk membuang teks bacaan dengan panjang $>160$ karakter.

### C. Dukungan Ganda Listening Bahasa Inggris & JLPT Jepang
- Memperbarui `loadPlacementListening()` untuk mendeteksi kursus aktif (`ja` vs `en`).
- Memuat `jlpt-listening-bank-v1.json` untuk bahasa Jepang dan `listening-bank-v1.json` untuk bahasa Inggris.
- Mengadaptasi `makeListeningQuestion()` agar mampu memetakan opsi teks bilingual (`text` + `textId`), soal bahasa Jepang & terjemahan Indonesia, audio resmi/AI, serta diagnosis distraktor `whyFails`.

---

## 3. Tabel Verifikasi Kuantitatif (Zero-Potemkin Proof)

| Item/Fitur | Spesifikasi Target | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :--- |
| **Umpan Balik Tes Penempatan** | Sorotan benar/salah, alasan, aturan, trik ingat | Tampil 100% pada `#feedback` | **PASS** |
| **Pengecualian Teks Bacaan Panjang** | 0 soal passage reading panjang di placement | 0 reading passage (>160 char) | **PASS** |
| **Komposisi Soal Level Placement** | 10 soal (4 vocab, 4 grammar, 2 listening) | 10 butir terkurasi proporsional | **PASS** |
| **Listening Bilingual** | Support Bahasa Inggris & Chōkai JLPT Jepang | `listening-bank-v1` & `jlpt-listening-bank-v1` | **PASS** |
| **Deteksi Mobile (390×844)** | Feedback tampak, tombol lanjut di atas lipatan | Visual terverifikasi via Playwright | **PASS** |
| **Deteksi Desktop (1280×800)** | Format anti-void kartu terpusat rapi | Visual terverifikasi via Playwright | **PASS** |
| **Placement Accuracy Test** | Akurasi skoring CEFR & lite ladder | 30/30 checks lulus | **PASS** |
| **UX Redesign Test** | D1–D6 checks & blueprint placement lite | Lulus 100% | **PASS** |
| **Alasan Soal Test** | 39/39 penegasan alasan soal | 39/39 PASS | **PASS** |
| **Content Integrity Gate** | 18/18 checks integritas konten | 18 PASS / 0 FAIL | **PASS** |
| **ID Golden Snapshot** | 6.152 literal Indonesia terverifikasi | Baseline HIJAU | **PASS** |
| **Penyelarasan Build (Octa-Sync)** | Selaras 8 titik build `m025-709` | 33 penegasan lulus | **PASS** |

---

## 4. Berkas yang Diubah
1. `app.js` — Penyesuaian `MEASURE`, aktivasi feedback drawer di placement, `loadPlacementListening()`, `makeListeningQuestion()`, `startLevelPlacement()`, filter reading di `startLevelPractice()`.
2. `id-golden-baseline.json` — Baseline literal Indonesia tersinkronisasi.
3. `tools/dev/placement-pedagogy-probe.mjs` — Test runner empiris Playwright untuk mobile & desktop.
4. `sw.js`, `core-config.js`, `coordination/BUILD-VERSION.json`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` — Penyelarasan build `m025-709`.
5. `docs/handoffs/FIEZEL-M025709-PLACEMENT-PEDAGOGY-FEEDBACK-HANDOFF.md` — Berkas handoff resmi ini.
