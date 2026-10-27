# FIEZEL Handoff Dossier: Smart Placement Gate, Kakijun Studio & Multi-Device UI/UX Overhaul (m025-684)

**Tanggal:** 28 Oktober 2026
**Build:** `m025-684` (Hexa-Sync 100% Selaras)
**Cabang:** `feat/kawan-bicara-pedagogy-roast-mascot-m025-684`

---

## 1. Ringkasan & Akar Masalah (Empirical Audit)
Pengguna menyampaikan tiga masalah krusial di ekosistem FIEZEL:
1. **Universal UI/UX Desktop & Tablet Rusak / Tampilan Mobile Dipaksakan**:
   - Tampilan desktop dan tablet terasa seperti layar mobile 390px yang dipaksa melebar atau di-letterbox secara janggal.
   - Bilah navigasi bawah (*floating bottomnav*) memiliki aturan `!important` global tanpa batasan media query (`width: 100% !important; bottom: 0 !important;`), sehingga pada tablet dan desktop bilah navigasi mobile menimpa rail/sidebar navigasi dan merusak kenyamanan tatap muka.
2. **Sistem Tes Level Fatal (Khususnya Kursus Jepang Belum Ada Uji Baca Huruf)**:
   - Tes penempatan level (*placement test*) langsung melemparkan butir soal Kanji dan tata bahasa rumit tanpa memeriksa apakah murid pemula sudah mengerti cara membaca Hiragana dan Katakana.
   - Akibatnya, murid pemula mengalami disorientasi total dan ditempatkan pada level yang tidak sesuai.
   - Belum ada opsi deklarasi diri yang membedakan pemula yang baru belajar dari nol (*zero foundation*) dengan pembelajar yang sudah bisa membaca huruf Jepang.
3. **Belum Ada Fitur Menulis Huruf Jepang (Hiragana, Katakana & Kanji)**:
   - Kursus Jepang belum memiliki media menulis interaktif standar dunia di mana pengguna dapat menggambar/menulis huruf dengan tangan atau stylus di atas kisi-kisi kertas (*Genkō Yōshi*), lengkap dengan panduan goresan langkah demi langkah (*stroke order / 書き順*).

---

## 2. Solusi & Perbaikan Sistemik

### A. Kakijun Studio (書き順 / Japanese Stroke Order Writing Canvas)
1. **Basis Vektor Kurva Bezier Presisi (`content/ja/kana-strokes-v1.json` & `features/japanese/fiezel-kakijun-data.js`)**:
   - Membangun repositori vektor 64 karakter (46 Hiragana Gojūon lengkap, Katakana esensial, dan N5 Kanji fondasi).
   - Setiap karakter memuat koordinat ternormalisasi 0..100, urutan nomor goresan, jalur SVG Bezier (`d`), titik awal/akhir (`start`, `end`), vektor arah goresan (`direction`), serta petunjuk dwibahasa ID & TH (`hint`, `hintTh`).
2. **Mesin Kanvas Genkō Yōshi & Validasi Vektor Real-Time (`features/japanese/fiezel-kakijun-studio.js` & `.css`)**:
   - Kisi-kisi kertas tradisional Jepang *Genkō Yōshi* bertekstur hangat `#FAF8F5` dengan garis bidik silang putus-putus slategray `#D9CEC3`.
   - Kanvas resolusi Retina (`devicePixelRatio`) dengan sapuan kaligrafi halus, penjejakan multi-sentuh `touch-action: none`, dan umpan balik haptik (`navigator.vibrate`).
   - Algoritma validasi goresan berbasis kedekatan titik awal ($\le 30\text{ unit}$), titik akhir ($\le 34\text{ unit}$), serta sudut dot product vektor arah goresan.
   - Dua mode latihan: **Mode Dipandu (Guided Tracing)** dengan animasi lingkaran panah arah goresan, dan **Mode Ingatan (Memory Recall)** tanpa bayangan panduan.
   - Pengucapan audio instan (`ja-JP`) dan integrasi telemetri belajar ke `updateMastery()`.

### B. Smart Placement Gate & Onboarding Literasi Huruf
1. **Pilihan Jalur Mulai di Onboarding Langkah 4 (`features/onboarding/fiezel-onboarding.js` & `app.js`)**:
   - Menghadirkan kartu pilihan jalur adaptif:
     - **Mulai dari Nol (Pemula Baru)**: Bagi pembelajar yang belum hafal huruf Kana, sistem langsung membuka gerbang Level 0 (`KANA`) dan mengantar murid ke Kakijun Studio / Peta Belajar Huruf tanpa memaksa tes penempatan yang membingungkan.
     - **Tes Singkat (12 Soal Adaptif)**: Bagi pembelajar yang sudah hafal huruf atau pernah belajar, untuk menentukan penempatan CEFR / JLPT yang akurat.
2. **Rekomendasi Pondasi Kana di Layar Hasil Tes (`app.js`)**:
   - Jika kandidat kursus Jepang menyelesaikan placement test dan terbukti belum menguasai membaca Kana dasar (skor akurasi $< 45\%$ atau band A1 gagal), layar hasil menampilkan kartu panduan empatik yang merekomendasikan penguasaan huruf Kana terlebih dahulu dengan CTA langsung ke `go('kana')`.

### C. Multi-Device UI/UX Overhaul
1. **Isolasi Bottomnav Mobile (`style.css`)**:
   - Membatasi aturan `position: fixed !important; width: 100% !important; bottom: 0 !important;` khusus untuk layar ponsel `@media (max-width: 767px)`.
   - Membebaskan tablet ($768\text{px} - 1023\text{px}$) dan desktop ($\ge 1024\text{px}$) sehingga navigasi rail/sidebar dan dermaga mengambang (*floating dock*) berfungsi elegan tanpa tumpang tindih.

---

## 3. Bukti Verifikasi Mutu & Hasil Pengujian
1. **Probe Playwright Chromium Multi-Device (`tests/kakijun_studio_probe.js`)**:
   - Menjalankan pengujian otomatis headless Chromium di 3 resolusi:
     - **Mobile** ($390 \times 844\text{px}$): Banner Kakijun Studio terverifikasi, overlay kanvas terbuka ($331.5 \times 331.5\text{px}$), goresan 1 huruf あ berhasil digambar & tervalidasi, pergantian mode recall sukses, navigasi あ $\to$ い lancar.
     - **Tablet** ($820 \times 1180\text{px}$): Kanvas retina ($380 \times 380\text{px}$), goresan tervalidasi 100%, mode switcher berfungsi prima.
     - **Desktop** ($1440 \times 900\text{px}$): Kanvas retina ($380 \times 380\text{px}$), interaksi goresan presisi, tangkapan layar tersimpan di `reports/kakijun-studio-*.png`.
   - Alur Onboarding Smart Placement: pembukaan langkah 4 dan deteksi jalur pemula lulus 100%.
2. **Kepatuhan Kunci Dwibahasa & Zero Thai Leak (`tests/th-ui-leak-test.js`)**:
   - Seluruh 4.509 kunci ID memiliki padanan TH yang identik.
   - Status: **PASS (0 kebocoran)**.
3. **Rangkaian Gerbang Kualitas Lokal**:
   - `node tests/onboarding-test.js`: **PASS (58/58 test)**.
   - `node tests/placement-accuracy-test.js`: **PASS (100%)**.
   - `node tests/regression-test.js`: **PASS (100%)**.
   - `node tests/multi-device-comfort-test.js`: **PASS (8/8 invarian hijau)**.
   - `node tests/id-golden-snapshot-test.js`: **PASS (baseline utuh)**.
   - `node tests/curriculum-cache-version-test.js`: **PASS (build m025-684)**.
   - `node tests/gate-registry-test.js`: **PASS (10/10)**.
   - `node tests/deploy-site-gate-test.js`: **PASS (32/32)**.
4. **Hexa-Sync Build Version**:
   - `coordination/BUILD-VERSION.json`: `m025-684`
   - `sw.js`: `m025-684`
   - `core-config.js`: `m025-684`
   - `features/neural-voice/fiezel-diag-panel.js`: `m025-684`
   - `kurikulum.html`: `m025-684`
   - `misi.html`: `m025-684`
   - Status: **100% Selaras**.

---

## 5. Otoritas & Langkah Berikut (Roadmap)
- **Otoritas:** Perubahan disahkan di bawah protokol MASTER & instruksi OWNER.
- **Status:** Siap rilis penuh (Production Ready) pada build `m025-684`.
- **Langkah Berikut (Next Steps / Roadmap):**
  1. Melanjutkan pemantauan retensi kanji dan kana stroke order mastery di telemetri Braincore.
  2. Memperluas bank stroke kanji tingkat lanjut N4-N3 sesuai kebutuhan kurikulum.
  3. Mengamati feedback pengguna multi-device pada tablet dan desktop canvas.

## 5. Roadmap & Langkah Berikutnya (Next Steps)
1. **Langkah Berikutnya**: Pantau adopsi murid baru pada Kakijun Studio di mode tablet & smartphone.
2. **Roadmap**: Integrasi evaluasi goresan kanji N5–N4 ke dalam Braincore item pool dan Misconception Ledger.
3. **Otoritas & Status**: OWNER & MASTER release authority diverifikasi penuh. Status rilis: READY.
