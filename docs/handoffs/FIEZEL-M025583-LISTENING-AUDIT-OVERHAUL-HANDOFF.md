# FIEZEL · Handoff Dossier Build m025-583
## Audit & Remediasi Menyeluruh Sesi Listening PWA Fiezel

**Nomor Rilis:** `m025-583`  
**Cakupan:** `fix(listening): overhaul total UI/UX, braincore sync, audio offline, and exam anti-leak`  
**Waktu Rilis:** 16 Oktober 2026  
**Branch:** `feat/listening-audit-overhaul`  
**Target Penggabungan:** `main` (melalui Pull Request sesuai *Git Protection Rule*)

---

### 1. Ringkasan Temuan Audit & Alasan Perubahan

Audit empiris mendalam dilakukan terhadap 4 pilar sesi listening di PWA Fiezel:
1. **JLPT Chōkai N5/N4 Modal**:
   - **Braincore Disconnect**: Jawaban siswa di `selectJlptChoice` sebelumnya tidak mengalirkan telemetri ke `updateMastery`, `bktRecord`, maupun `state.history`. Sesi berjalan terisolasi tanpa mencatat kemajuan penguasaan.
   - **Answer Key & Translation Leak**: Sebelum siswa menjawab, membuka tab "Pembahasan" membocorkan kunci jawaban resmi dan analisis soal. Selain itu, terjemahan Indonesia (`textId` dan `qId`) terpampang langsung di kartu sebelum dijawab.
   - **Audio Playback Overlap & TTS Pelanggaran**: Pemutaran audio tidak otomatis berhenti saat opsi dipilih. Selain itu, terdapat kode cadangan `window.speechSynthesis` / `SpeechSynthesisUtterance` yang melanggar larangan total TTS browser di zona audio.
   - **Distribusi Kunci Jawaban Pilihan 4 (0%)**: Dari 30 soal di `jlpt-listening-bank-v1.json`, tidak ada satu pun yang berkunci Pilihan 4 (index 3).
   - **Memory Leak pada Pointer Gestures**: Listener `pointermove`, `pointerup`, dan `pointercancel` dipasang permanen pada `window` di setiap render kartu (`initCardGestures`) dan pembukaan detail sheet (`initSheetPullDrag`).
2. **Skills Lab Daily Listening & Exam Simulations**:
   - **Unhandled Timeout Timer**: `Promise.race` di `renderListening` memasang timer 25 detik tanpa `clearTimeout`, menyebabkan kebocoran timer di memori peramban.
   - **Viewport Overflow & Zero-Scroll**: Pada layar ponsel kompak (360×800px), area `<textarea class="fsl-notes">` dengan `rows="5"` mendorong kartu ke bawah dan memicu scrolling vertikal saat menyimak.
   - **Ergonomi Tap Target**: Tombol keluar `.fsl-exit-btn` berukuran 36×36px, di bawah standar WCAG AAA 44×44px.
3. **PWA Service Worker & iOS CacheStorage**:
   - Respon audio HTTP 206 Partial Content menyebabkan penolakan cache pada browser berbasis WebKit (Safari/iOS).
4. **UI Styling & Cascade Invariant**:
   - Selektor tombol generik di `fiezel-tactile-clay.css:182` membajak warna background status umpan balik (`.correct`, `.wrong`) dan tombol speed. Drawer sheet tabs sempat memakai background gelap (`#202032`) yang tidak selaras dengan tema Daylight Travertine (`#FFFDF9`).

---

### 2. Bukti Pengujian Empiris (Probe-Driven Headless Playwright)

Seluruh perbaikan telah divalidasi menggunakan skrip probe Chromium headless Playwright nyata:
- `tests/listening-braincore-audit-probe.cjs`:
  - `stateSync.historyDelta: 1` (Terbukti mencatat riwayat ke `state.history`)
  - `stateSync.listeningMasteryDelta: 1` (Terbukti memperbarui `state.listening`)
  - `stateSync.bktChanged: true` (Terbukti mengalir ke BKT Bayesian Knowledge Tracing)
  - `sheetLeakBeforeAnswer.keyChoice: null` (Kunci jawaban 100% terkunci sebelum dijawab)
  - `sheetLeakBeforeAnswer.explainDesc: null` (Analisis 100% terkunci sebelum dijawab)
  - `translationLeaksOnCard.optionTranslations: []` (Terjemahan opsi terbukti tidak bocor)
  - `bankIntegrity.jlpt`: Mondai 1 & 2 memiliki 4 soal berkunci Pilihan 4 (tepat 25% dari 16 soal).
- `tests/listening-ui-audit-probe.cjs`:
  - `jlptModal.cardBg`: `rgb(255, 253, 249)` (Daylight Travertine murni)
  - `fslSession.exitSize`: `44x44` (Standar ergonomis WCAG AAA terpenuhi)
  - `options.rect`: `346x44` (Tactile clay options)
  - `bottomSheet.containerBg`: `rgb(255, 253, 249)` (Zero dark-void/inversion)

---

### 3. Berkas yang Diperbarui & Rincian Perubahan

1. **`sw.js`**:
   - Membatasi `cache.put()` hanya untuk response berstatus 200 (mengabaikan 206 Partial Content) dengan `.catch(() => {})` anti-unhandled rejection pada iOS/Safari.
2. **`features/speaking-listening/fiezel-jlpt-listening.js`**:
   - Menghapus total `speechSynthesis` dan `SpeechSynthesisUtterance`. Menggunakan pintu suara bersama `window.FiezelVoiceSay`.
   - Menghentikan audio seketika (`stopJlptAudio()`) saat murid memilih jawaban.
   - Mengalirkan telemetri nyata ke `window.updateMastery('listening', ...)`, `window.record(...)`, dan `window.bktRecord(...)`.
   - Menghubungkan listener gesture `pointermove`/`pointerup`/`pointercancel` secara dinamis pada `onPointerDown`/`onStart` dan melepasnya di `onPointerEnd`/`onEnd`.
   - Mengunci kunci jawaban dan analisis pada `formatExplainHtml` saat `selectedChoice === null`.
   - Menyembunyikan terjemahan Indonesia pada kartu opsi dan soal sampai jawaban dipilih.
   - Menambahkan pengatur kecepatan pemutaran audio (`audioPlaybackRate`: 0.8×, 1.0×, 1.2×) dengan chip tactile `.jlpt-speed-chip`.
3. **`features/speaking-listening/jlpt-listening-bank-v1.json`**:
   - Menyeimbangkan distribusi kunci jawaban: meredistribusi soal nomor 4, 7, 18, 22 ke Pilihan 4 (index 3), serta menyeimbangkan nomor 28 dan 29.
4. **`features/speaking-listening/jlpt-listening.css`**:
   - Menambahkan styling tactile untuk chip kecepatan `.jlpt-speed-chip`.
5. **`features/speaking-listening/fiezel-speaking-listening-addon.js`**:
   - Menambahkan `clearTimeout(ttsTimer)` pada `Promise.race` untuk membersihkan timer timeout.
   - Mengubah ukuran textarea catatan TOEFL dari `rows="5"` menjadi `rows="3"` untuk menjamin zero-scroll pada layar ponsel 360×800px.
6. **`features/speaking-listening/speaking-listening-addon.css`**:
   - Menyesuaikan `.fsl-notes` dengan `min-height: 60px; max-height: 100px;`.
   - Memperbesar tap target `.fsl-exit-btn` menjadi 44×44px.
7. **`features/ui/fiezel-tactile-clay.css`**:
   - Menambahkan `:not(.jlpt-opt-btn):not(.fsl-option):not(.fsl-exit-btn):not(.listening-close-btn):not(.jlpt-primary-play-btn):not(.jlpt-jees-chip):not(.jlpt-speed-chip):not(.jlpt-fb-next-btn):not(.jlpt-fb-key-btn):not(.jlpt-tab-chip):not(.fsl-play-hero)` pada selector button lines 182, 183, 195, 196.
   - Menyelaraskan tab drawer `.jlpt-tab-chip` dengan Daylight Travertine (`#FAF6EF` / `#FFE02E`).
8. **`features/ui/mobile-edge-fit.css`**:
   - Menghapus pewarnaan gelap `#14141E` pada `#jlptDetailSheet`, menegakkan warna Daylight Travertine (`#FFFDF9`, `#FAF6EF`, `#E8DFD3`).
9. **`app.js`**:
   - Memaparkan `window.record = record;` untuk perekaman telemetri modul satelit.
10. **`tests/audio-locale-guard-test.js`**:
    - Menambahkan `features/speaking-listening` ke zona yang diawasi bebas dari `speechSynthesis`.
11. **`id-golden-baseline.json`**:
    - Memperbarui baseline emas untuk menyertakan fallback i18n yang ditambahkan secara sah.
12. **`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`**:
    - Hexa-sync build dinaikkan dari `m025-582` ke `m025-583`.

---

### 4. Status Kelulusan Gerbang Mutu Lokal

Seluruh 9 gerbang mutu lolos dengan predikat **100% HIJAU (PASS)**:
- `node tests/audio-locale-guard-test.js` -> PASS (Audio tetap locale-independent dan bebas TTS browser)
- `node tests/speaking-listening-test.js` -> PASS (45/0 pemeriksaan lolos)
- `node tests/listening-exam-test.js` -> PASS (38/0 pemeriksaan lolos)
- `node tests/chokai-multi-voice-protocol-test.js` -> PASS (30 soal, multi-voice protocol tervalidasi)
- `node tests/gems-test.js` -> PASS (34 pemeriksaan lolos)
- `node tests/th-ui-leak-test.js` -> PASS (Bebas kebocoran teks non-i18n di mode Thai)
- `node tests/id-golden-snapshot-test.js` -> PASS (Baseline emas Indonesia utuh)
- `node tests/curriculum-cache-version-test.js` -> PASS (26 penegasan selaras di build m025-583)
- `node tests/gate-registry-test.js` -> PASS (10/0 pemeriksaan registry lolos)
- `node tools/bump-build.mjs --check` -> PASS (Hexa-Sync: 6 titik selaras di m025-583)

---

### 5. Catatan Utang Teknis & Rekomendasi Selanjutnya

1. **Audio Synthesis Pre-generation**: Untuk 4 soal yang baru saja ditukar opsi jawabannya (nomor 4, 7, 18, 22), audio studio multi-karakter yang sudah ada di `./features/speaking-listening/audio-jlpt/` tetap valid karena naskah percakapan tidak berubah sama sekali, hanya urutan visual pilihan ganda pada kartu dan penjelasan kunci jawaban yang diperbarui.
2. **PWA Shell Caching**: Saat rilis dideploy ke Cloudflare Pages / GitHub Pages, Service Worker akan mendeteksi `SW_REV = 'm025-583'` dan otomatis menyajikan shell cache baru tanpa intervensi manual.
