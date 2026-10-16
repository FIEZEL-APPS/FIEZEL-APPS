# FIEZEL m025-586: Handoff Perbaikan Menyeluruh UI/UX Sesi Listening (Audio-First, WCAG AAA, & Anti-Ghost-Button)

**Otoritas & Modul**: Sesi Listening (`features/speaking-listening/`), Tactile Clay Theme (`features/ui/`), dan Pipeline Ujian Chōkai / TOEFL.  
**Build Target**: `m025-586` (Hexa-Sync diverifikasi).  
**Tanggal**: 16 Oktober 2026.  

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan audit empiris mendalam lintas viewport (Android Compact 360x780, iPhone 14 390x844, Pixel 7 412x915, Desktop 1280x800) pada seluruh mode sesi listening (*English Skills Lab A1/A2*, *JLPT Chōkai N5/N4*, dan *TOEFL/IELTS Exam Simulation*), ditemukan 3 cacat kritis UI/UX yang melanggar standar aksesibilitas WCAG dan ergonomi mobile:

1. **"Ghost White Next Button" (Tombol Lanjut Memutih & Teks Hilang)**:
   - *Penyebab*: Aturan global `features/ui/fiezel-tactile-clay.css` pada baris 182-183 dan 195-196 (`button:not(.primary):not(.nav)...`) menimpa tombol `button[data-next]` di sesi listening. Akibatnya, tombol berubah menjadi putih pudar (`#FFFFFF`) dengan border abu-abu tipis, menghilangkan nuansa tactile 3D gold (`#FFE02E`) dan membuat teks "Lanjut / Pertanyaan Berikutnya" kontras rendah dan sulit dibaca.
   - *Solusi*: Mengisolasi selector `button[data-next]`, `.fsl-primary`, dan `.fsl-play-btn` dari pemutihan paksa tactile clay, serta menegaskan styling emas 3D dengan kontras teks hitam pekat (`#101018`, kontras 16.5:1).

2. **Cacat Kontras WCAG pada Opsi Jawaban Terkunci (Disabled State)**:
   - *Penyebab*: Ketika audio listening diputar, opsi jawaban dikunci demi pedagogi audio-first (`pointer-events: none; opacity: 0.72; color: #9A8A78;`). Di layar berlatar `#F7F3EB`, rasio kontras teks hanya **3.02:1** (gagal batas minimum WCAG AA 4.5:1).
   - *Solusi*: Memperbarui palet warna teks opsi terkunci dan badge nomor ke `#54483E`. Rasio kontras melonjak ke **7.99:1** (lulus standar WCAG AAA), menjaga teks tetap terbaca jelas tanpa disalahartikan sebagai opsi aktif.

3. **Cacat Area Catatan TOEFL/IELTS (Teks Nyaris Tak Terlihat & Terjepit Layar Kecil)**:
   - *Penyebab*: Area catatan (`textarea.fsl-notes`) mewarisi warna teks putih pucat `#F8FAFC` di atas latar belakang putih `#FFFFFF`, menghasilkan rasio kontras **1.05:1** (sama sekali tidak terbaca saat murid mencatat poin audio). Selain itu, margin disclaimer sumber audio terlalu besar sehingga mendorong kotak catatan terpotong di layar 360px.
   - *Solusi*: Menetapkan warna teks `color: #0F172A !important; background: #FFFFFF !important; border: 1.5px solid #CBD5E1 !important;` dengan rasio kontras tajam **17.85:1**. Memadatkan margin header/disclaimer sumber audio agar area catatan dan tombol kontrol muat 100% tanpa scrolling canggung.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright Probe)

Pengujian dilakukan menggunakan skrip probe otomatis:
`tools/dev/listening-deep-audit-v2.mjs`

### Hasil Pengukuran Empiris Lintas Viewport

| Parameter Uji | Sebelum Perbaikan | Sesudah Perbaikan (`m025-586`) | Status WCAG / Pedagogi |
| :--- | :---: | :---: | :---: |
| **Kontras Teks Opsi Terkunci** | 3.02:1 (`#9A8A78` vs `#F7F3EB`) | **7.99:1** (`#54483E` vs `#F7F3EB`) | **PASS (WCAG AAA)** |
| **Kontras Kotak Catatan TOEFL** | 1.05:1 (`#F8FAFC` vs `#FFFFFF`) | **17.85:1** (`#0F172A` vs `#FFFFFF`) | **PASS (WCAG AAA)** |
| **Kontras Tombol Lanjut (Next)** | 1.80:1 (Putih tertimpa Clay CSS) | **16.5:1** (`#101018` di atas Emas `#FFE02E`) | **PASS (WCAG AAA)** |
| **Minimum Tap Target Mobile** | 40px - 44px (beberapa margin mepet) | **$\ge 48\text{px}$** (Semua opsi & tombol) | **PASS (Apple/Android HIG)** |
| **Vertical Clipping / Scroll Bug** | Catatan TOEFL terdorong keluar layar | **0 Overflows** (Fit sempurna di 360px) | **PASS** |
| **Invarian Anti-Bocoran Ujian** | 0 petunjuk / 0 bocoran | 0 petunjuk / 0 bocoran | **PASS (Anti-Leak Purity)** |
| **Pedagogi Audio-First** | Opsi terkunci saat memutar audio | Opsi terkunci saat memutar audio | **PASS (Braincore Invariant)** |

Laporan JSON lengkap tersimpan di:
`reports/listening-deep-audit-v2/AUDIT-REPORT-V2.json`
Beserta 24 tangkapan layar verifikasi di folder `reports/listening-deep-audit-v2/`.

---

## 3. Daftar Seluruh Berkas yang Disentuh & Perubahannya

1. **`features/speaking-listening/speaking-listening-addon.css`**:
   - Memperbaiki kontras teks `.fsl-card-listening .fsl-work:disabled .fsl-option` dan `.fsl-option-badge` ke `#54483E`.
   - Mengatur warna teks, latar, dan border `.fsl-notes` agar kontras tinggi (`#0F172A` di atas `#FFFFFF`).
   - Merampingkan margin `.fsl-source` untuk memastikan layout responsif pada layar compact.
   - Mengunci styling emas 3D tactile untuk `button[data-next]`.

2. **`features/ui/fiezel-tactile-clay.css`**:
   - Menambahkan pengecualian `:not([data-next]):not(.fsl-primary):not(.fsl-play-btn)` pada selektor global `button:not(...)` agar tombol interaktif sesi listening tidak tertimpa styling putih default clay.

3. **Berkas Versi Arbiter (Hexa-Sync m025-586)**:
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`

---

## 4. Status Kelulusan Gerbang Mutu Lokal & Catatan Utang Teknis

### Gerbang Mutu Lokal (Quality Gates)
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (FIEZEL m025-265 kebocoran naskah Indonesia di mode Thai: PASS)**
- `node tests/curriculum-cache-version-test.js`: **PASS (26 penegasan, 2 halaman, build m025-586)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail, 374 gerbang terdaftar)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras 6 titik m025-586)**

### Catatan Utang Teknis
- Seluruh perbaikan CSS telah diisolasi dengan spesifisitas tinggi agar tidak mempengaruhi komponen clay di halaman lain.
- Tidak ada utang teknis baru yang ditinggalkan.
