# FIEZEL m025-744: Peningkatan Keamanan Tingkat Tinggi (High-Level Security Hardening)

Otoritas: OWNER / FIEZEL ARCHITECTURE & GOVERNANCE
Build: `m025-744`
Tanggal: 2 November 2026

Dokumen ini merangkum penyelesaian audit keamanan dan implementasi pengerasan keamanan tingkat tinggi (*high-level security hardening*) pada FIEZEL tanpa memengaruhi atau merusak sistem PWA aktif murid (*zero disruption on legitimate active PWA learners*).

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan temuan investigasi mendalam pada sesi `d1856b92-8844-42f9-a1eb-9c2a20c6d762`:
1. **Celah Bypass `navigator.webdriver`**:
   - *Masalah:* Pemeriksaan `navigator.webdriver` sebelumnya menonaktifkan proteksi anti-tamper secara global (termasuk di domain produksi `fiezel.my.id`). Hal ini memungkinkan alat scraping otomatis berbasis peramban (seperti Puppeteer/Selenium tanpa *stealth mode*) mengikis bank soal secara bebas.
   - *Solusi:* Membatasi *webdriver bypass* secara ketat hanya pada hostname pengujian lokal (`localhost`, `127.0.0.1`, `0.0.0.0`, subnet lokal `192.168.*`, `10.*`, domain `.local`, dan port dev `3000`, `3005`, `4173`, `5173`, `8080`). Di domain produksi (`fiezel.my.id`), `navigator.webdriver` diperlakukan sebagai scraper otomatis dan pertahanan anti-tamper tetap bersenjata penuh.
2. **Kerapuhan Watermark Terhadap Pembersihan Zero-Width Karakter**:
   - *Masalah:* Pelaku pencurian konten dapat menghapus karakter zero-width (`[\u200B-\u200D\uFEFF]`) dengan regex sederhana sebelum membocorkan naskah soal.
   - *Solusi:* Menambahkan steganografi multi-lapis (Dual-Layer Forensic Steganography). Lapisan 2 menyematkan signature pengguna menggunakan Unicode Variation Selectors (`\uFE00`–`\uFE0F`, di luar jangkauan zero-width standar), dipagari pembatas `\uFE0E\uFE00` dan `\uFE0F\uFE01`. Lapisan 3 memetakan visual homoglyphs (Cyrillic lookalikes). Jika penyerang membersihkan zero-width karakter, decoder Lapisan 2 secara otomatis mendeteksi dan mengungkap identitas forensik akun pembocor. Fungsi `FiezelWatermark.strip()` menormalisasi seluruh teks kembali ke ASCII murni sehingga pipeline TTS dan evaluasi Braincore tetap 100% akurat.
3. **Manipulasi Level & Status Verifikasi di Sisi Klien**:
   - *Masalah:* Nilai `state.level`, `state.verified`, dan `gems` di `localStorage` rentan diedit manual via browser DevTools untuk membuka kurikulum tingkat tinggi (C1/C2) tanpa menyelesaikan evaluasi.
   - *Solusi:*
     - Menambahkan fungsi `computeStateIntegrity(state)` berbasis FNV-1a hash yang mengikat `ownerUuid`, `level`, `verified`, `totalAnswered`, dan saldo gems.
     - Melakukan verifikasi hash pada `sanitizeState(raw)`. Jika nilai `_integrity` ditemukan dan tidak cocok dengan payload state (terbukti dimodifikasi dari luar runtime aplikasi), state dikembalikan ke baseline aman. State lawas tanpa `_integrity` tetap diizinkan agar murid aktif tidak terganggu saat migrasi.
     - Pengetatan `sanitizeLevelTrust(raw)`: status `verifiedSource === "exam"` wajib membuktikan kelulusan nyata di `exams[verified].passed`.
4. **Proteksi Drag & Callout di Perangkat Mobile**:
   - Menambahkan aturan CSS `-webkit-touch-callout: none !important;` dan `-webkit-user-drag: none !important;` pada area latihan untuk mencegah seleksi naskah soal melalui long-press di peramban iOS/Android.

---

## 2. Bukti Pengujian & Validasi Mutu Empiris

Seluruh pengujian lokal telah dijalankan di lingkungan worktree terisolasi `C:\Users\hp\fiezel-security-5af3` dengan hasil 100% lulus (hijau):

1. **`node tests/anti-tamper-and-watermark-test.js` (11/11 PASS)**:
   - Watermark: Encoding & decoding signature forensic identik.
   - Watermark: Strip menghasilkan teks bersih tanpa sisa signature.
   - Watermark: Layer 2 (Variation Selectors) bertahan dari pembersihan regex zero-width (`text.replace(/[\u200B-\u200D\uFEFF]/g, '')`) dan decoder berhasil memulihkan ID akun pembocor `fz:...`.
   - Watermark: Normalisasi homoglyph Cyrillic kembali ke ASCII Latin standar.
   - Anti-Tamper: `navigator.webdriver` aktif pada domain produksi `fiezel.my.id` (pertahanan tetap bersenjata, tidak di-bypass).
   - Anti-Tamper: `navigator.webdriver` di-bypass pada localhost / dev server demi kelancaran CI Playwright.
   - Anti-Tamper: CSS pencegah mobile touch-callout dan user-drag terpasang pada quiz-shell.
2. **`node tests/level-guard-test.js` (51/51 PASS)**:
   - Integritas state dan validasi lompatan level berjalan tanpa regresi.
3. **`node tests/curriculum-ticket-parity-test.js` (11/11 PASS)** & **`node tests/curriculum-single-door-test.js` (23/23 PASS)**:
   - Konsistensi tanda tangan tiket HMAC curriculum dan integritas klaim terverifikasi.
4. **`node tests/critical-surface-protection-test.js` (9/9 PASS)** & **`node tests/collateral-scope-guard-test.js` (8/8 PASS)**:
   - Memastikan tidak ada kerusakan kolateral pada permukaan terproteksi (Auth, PWA, Onboarding).
5. **`node tests/id-golden-snapshot-test.js` (PASS)** & **`node tests/th-ui-leak-test.js` (PASS)**:
   - Baseline emas naskah Indonesia dan 4.674 kunci Thai selaras.
6. **`node tools/bump-build.mjs --check` (Hexa-Sync PASS)**:
   - 6 titik kanonikal selaras pada nomor build `m025-744`.
7. **`node tests/curriculum-cache-version-test.js` (Octa-Sync PASS, 33 assertions)**:
   - Parameter versi query string pada semua berkas HTML (`kurikulum.html`, `misi.html`, `call.html`, dll.) 100% selaras dengan `m025-744`.

---

## 3. Daftar Berkas yang Disentuh & Ringkasan Perubahan

| Berkas | Perubahan |
|---|---|
| `features/ui/fiezel-anti-tamper.js` | Fungsi `isLocalHost()`, penguncian bypass `navigator.webdriver` hanya untuk hostname lokal, proteksi CSS `-webkit-touch-callout` & `-webkit-user-drag`, dan penandaan signature forensik pada clipboard copy event. |
| `features/ui/fiezel-watermark.js` | Steganografi Lapisan 2 (Variation Selectors `\uFE00–\uFE0F`), Lapisan 3 (Cyrillic homoglyphs map), update `strip()`, `hasWatermark()`, dan fallback decoding multi-layer. |
| `app.js` | Penambahan `computeStateIntegrity()`, validasi hash `_integrity` pada `sanitizeState()`, pengetatan `sanitizeLevelTrust()`, serta penyimpanan `state._integrity` pada `saveFlushWrite()`. |
| `workers/api/auth/curriculum-ticket.js` | Penambahan klaim `level`, `verified_level`, dan `exam_passed` pada pembuatan tiket kurikulum. |
| `tests/anti-tamper-and-watermark-test.js` | Penambahan 4 kasus uji empiris untuk Layer 2 steganography, homoglyphs, webdriver production enforcement, dan mobile touch-callout. |
| `id-golden-baseline.json` & `reports/th-ui-leak-report.json` | Sinkronisasi baseline pelindung naskah i18n pasca verifikasi. |
| `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` | Penyelarasan nomor build resmi ke `m025-744`. |

---

## 4. Status Kelulusan Mutu & Dampak pada Sistem Aktif

- **Zero Disruption Invariant**:
  - `computeStateIntegrity` bersifat *backward-compatible*. State murid eksisting yang belum memiliki field `_integrity` diperlakukan valid tanpa reset mendadak. Integritas hash baru akan dihitung dan disimpan secara alami saat sesi murid menyimpan progress belajar berikutnya.
  - Normalisasi watermark `FiezelWatermark.strip(text)` memastikan byte teks yang dikirim ke engine text-to-speech (TTS) dan Braincore evaluator tetap berupa karakter ASCII standar tanpa distorsi fonetik.
- **Utang Teknis Tersisa**: Nihil. Seluruh celah yang ditargetkan pada sesi audit telah tertutup rapat dan teruji secara mekanis.
