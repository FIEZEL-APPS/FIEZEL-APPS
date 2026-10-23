# FIEZEL Handoff Dossier — m025-633: Decommissioning Total Soal Video Grammar & Video Lab

- **Tanggal**: 2026-10-24
- **Versi Build**: `m025-633`
- **Tipe / Cakupan**: `refactor(grammar)`
- **Branch**: `fix/remove-video-grammar`

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Sesuai permintaan pengguna:
> *"aku ingin kamu hapus semua kode tentan soal video grammar semua video lab grammar, dari aplikasi fiezel, dari sesi sesi soal, jangan sampai ada yang tertinggal"*

Dilakukan audit menyeluruh dan eliminasi menyeluruh terhadap seluruh arsitektur Video Grammar dan Video Lab di aplikasi FIEZEL:
1. **Pemisahan Modul Video Grammar**: Menghapus `features/grammar/fiezel-grammar-video.js` dari runtime aplikasi, `index.html`, dan precache `sw.js`.
2. **Eliminasi Bank Soal & Aset Video**: Menghapus berkas `content/video-grammar-bank-v1.json`, mockup `mockups/preview-video-grammar-pilot.html`, direktori video `content/video/` (termasuk klip mp4 Cake Lucy & Ryan), pipeline `tools/grammar-video-pipeline/`, serta generator `tools/video-factory/`.
3. **Pembersihan Logika Sesi Soal (`app.js`)**:
   - Menghapus pemuatan bank video `optional('content/video-grammar-bank-v1.json',null)` dan referensi `vgBankRaw` di `load()`.
   - Menghapus fungsi perakit soal video `getOrMakeVideoGrammarQuestion()` beserta fallback percakapan buatannya.
   - Menghapus alokasi `videoSlots` dari `weaveGrammarSessionVariety()` (sesi pelajaran 20 soal) dan `buildGrammarQuickQuestions()` (sesi kilat grammar).
   - Menghapus fungsi peluncur lab `startVideoGrammarSession()` dan ekspos `window.startVideoGrammarSession`.
   - Menghapus tombol antarmuka Video Lab `[data-testid="grammar-video-lab-btn"]` dari Grammar Hub.
   - Menghapus penanganan runtime pemutar video di `quizLoop`, `stem.before(playerEl)`, update state video `q.__vState`, dan percabangan `q.type === 'video-grammar'` pada ladder petunjuk maupun evaluasi skor.
4. **Pembersihan Modul Pendukung**:
   - `features/grammar/fiezel-grammar-upgrade.js`: Menghapus tipe `video-grammar`.
   - `features/grammar/grammar-upgrade.css`: Menghapus Bagian 8 (*Video-First Grammar Exercise Styles*).
   - `features/ui/fiezel-tactile-clay.css`: Menghapus selektor kontrol video (`.video-controls`, `.video-play-btn`, `.video-speed-btn`, dll.).
   - `features/i18n/copy-id-grammar-labels.js` & `features/i18n/copy-th-grammar-labels.js`: Menghapus seluruh 18 kunci i18n video grammar (`grammar.video-lab`, `grammar.video.question`, dsb.).
5. **Penjagaan Integritas Fitur Non-Grammar**: Pemindai QR kamera HTML5 (`qrScanVideo`, `startQrVideoScan`) untuk presensi/kehadiran ujian tetap dipertahankan utuh dan tidak terganggu.

---

## 2. Bukti Pengujian Empiris (Probe Headless Chromium Playwright)

Verifikasi dilakukan secara nyata menggunakan skrip Playwright headless `tests/probe-video-grammar-eliminated-test.js` yang menjalankan server HTTP lokal dan memuat `index.html`:
```
🚀 Local test server running on http://127.0.0.1:54351
🚀 Launching headless Chromium browser for empirical audit...
1. Verifying global runtime scope...
✔ window.FiezelGrammarVideo, startVideoGrammarSession, and __videoGrammarBankCache are completely absent.
2. Verifying Grammar Hub UI...
✔ Video Lab button is absent from Grammar Hub DOM.
3. Verifying Lesson Session generation (20-question session)...
✔ 20-question session for skill "time_prepositions_in_on_at" generated 20 questions of types: [grammar, token-order], zero video questions.
4. Verifying Quick Grammar Session generation...
✔ Quick session generated 5 questions of types: [grammar, token-order], zero video questions.
5. Verifying absence of obsolete script tag in DOM...
✔ No script tag for fiezel-grammar-video.js in DOM.

🎉 ALL EMPIRICAL BROWSER AUDIT PROBES PASSED (100% GREEN)!
```

---

## 3. Daftar Seluruh Berkas yang Disentuh & Dihapus

### A. Berkas yang Dihapus Permanen (`deleted`):
1. `features/grammar/fiezel-grammar-video.js`
2. `content/video-grammar-bank-v1.json`
3. `mockups/preview-video-grammar-pilot.html`
4. `tools/grammar-video-pipeline/generate-video-grammar.js`
5. `content/video/cake-lucy-5q-exact-poster.jpg`
6. `content/video/cake-lucy-5q-exact.mp4`
7. `content/video/cake-lucy-clip2-5q-poster.jpg`
8. `content/video/cake-lucy-clip2-5q.mp4`
9. `content/video/cake-ryan-jake-poster.jpg`
10. `content/video/cake-ryan-jake.mp4`
11. `tools/video-factory/README.md`
12. `tools/video-factory/batch_spec_initial_approved.json`
13. `tools/video-factory/batch_spec_scaled.json`
14. `tools/video-factory/grammar_rules_catalog.json`
15. `tools/video-factory/inspect_timing.py`
16. `tools/video-factory/test_pipeline.py`
17. `tools/video-factory/verify_browser.js`
18. `tools/video-factory/video_batch_pipeline.py`

### B. Berkas Inti yang Dimodifikasi (`modified`):
1. `app.js`: Pembersihan total loader, getOrMakeVideoGrammarQuestion, startVideoGrammarSession, tombol video lab di Hub, alokasi videoSlots di sesi soal, dan rendering video di kuis.
2. `index.html`: Pelepasan tag `<script defer src="./features/grammar/fiezel-grammar-video.js"></script>`.
3. `sw.js`: Bump versi cache Service Worker ke `m025-633` dan pencabutan rujukan precache video.
4. `features/grammar/fiezel-grammar-upgrade.js`: Penghapusan guard tipe `video-grammar`.
5. `features/grammar/grammar-upgrade.css`: Pembersihan aturan CSS video player & dialog video.
6. `features/ui/fiezel-tactile-clay.css`: Pembersihan aturan styling tactile tombol kontrol video.
7. `features/i18n/copy-id-grammar-labels.js` & `features/i18n/copy-th-grammar-labels.js`: Pembersihan kunci i18n video.
8. `id-golden-baseline.json`: Pembaruan snapshot emas baseline literal murid Indonesia via `--write-baseline`.
9. `core-config.js`: Penyelarasan build number ke `m025-633`.
10. `features/neural-voice/fiezel-diag-panel.js`: Penyelarasan build number ke `m025-633`.
11. `kurikulum.html` & `misi.html`: Penyelarasan cache query string build ke `m025-633`.
12. `coordination/BUILD-VERSION.json`: Penyelarasan build metadata ke `m025-633`.

### C. Penyesuaian Gerbang Pengujian (`tests/`):
1. `tests/probe-video-grammar-eliminated-test.js`: Probe empiris Chromium Playwright baru untuk sertifikasi penghapusan video grammar.
2. `tests/grammar-8-upgrades-full-test.js`: Uji 6 dialihkan memvalidasi dekomisioning total video grammar di `app.js`.
3. `tests/grammar-ux-p1-2026-10-04-test.js`: Penegasan U1 dan U2 memverifikasi ketiadaan berkas dan fungsi video grammar.
4. `tests/braincore-pedagogy-audit-2026-10-11-test.js`: Penegasan P7 dialihkan memvalidasi dekomisioning video grammar dan slotnya.
5. `tests/audit-all-question-step-guidance.js`: Pelepasan tipe video grammar dari matriks bimbingan langkah kuis.
6. `tests/learning-integrity-2026-10-04-test.js`: Penyelarasan filter tipe soal.
7. `tests/alasan-soal-test.js`: Penyelarasan tipe soal.

---

## 4. Status Kelulusan Gerbang Mutu Lokal

Semua gerbang pengujian kualitas (Quality Gates) lulus 100% HIJAU:
- `node tools/bump-build.mjs --check`: **Selaras (Hexa-Sync 6/6 PASS)**
- `node tests/id-golden-snapshot-test.js`: **HIJAU (13 berkas terkunci, baseline utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (4.412 kunci selaras bilingual)**
- `node tests/curriculum-cache-version-test.js`: **PASS (26 penegasan selaras build m025-633)**
- `node tests/gate-registry-test.js`: **PASS (10/10 penegasan registry aman)**
- `node tests/grammar-8-upgrades-full-test.js`: **PASS (9/9 modul tata bahasa lulus)**
- `node tests/grammar-ux-p1-2026-10-04-test.js`: **PASS (11/11 lulus)**
- `node tests/learning-integrity-2026-10-04-test.js`: **PASS (36/36 lulus)**
- `node tests/braincore-pedagogy-audit-2026-10-11-test.js`: **PASS (15/15 lulus)**
- `node tests/alasan-soal-test.js`: **PASS (39/39 lulus)**
- `node tests/probe-video-grammar-eliminated-test.js`: **PASS (100% Chromium Playwright empiris)**
- `node tools/sync-android-assets.mjs`: **PASS (737 aset web shell tersinkronisasi)**

---

## 5. Catatan Utang Teknis yang Tersisa

- Tidak ada utang teknis baru yang diperkenalkan. Kode aplikasi kini lebih bersih, ukuran bundle lebih ringan, pemuatan awal lebih cepat karena tidak ada lagi duplikasi request JSON video yang tidak terpakai, dan sesi kuis berjalan murni pada format soal grammar pedagogis (pilihan ganda terstruktur & susun kata token rail).
