# FIEZEL · Handoff Dossier Build m025-584
## Penyempurnaan Total A11y, Distractor Diagnosis, dan Offline Resilience Sesi Listening

- **Nomor Rilis:** `m025-584`
- **Cakupan:** `fix(listening): a11y focus rings, distractor diagnosis, and cache resilience`
- **Waktu Rilis:** 16 Oktober 2026
- **Branch:** `feat/listening-perfection-a11y-pedagogy`
- **Target Penggabungan:** `main` (melalui Pull Request sesuai *Git Protection Rule*)

---

### 1. Ringkasan Temuan Audit & Alasan Perubahan

Menindaklanjuti arahan penyempurnaan total (*perbaiki semua*) dari temuan audit sesi Listening:
1. **Aksesibilitas & Standar WCAG 2.1 AAA (A11y)**:
   - Tombol pilihan ganda di JLPT listening sebelumnya belum memiliki penanda status terstruktur bagi pembaca layar (screen reader).
   - Ditambahkan atribut `aria-label` dinamis (`Pilihan X: [teks]`, serta status `(Kunci Jawaban Tepat)` atau `(Jawaban Anda, Belum Tepat)` saat terkunci).
   - Penambahan `role="alert"` dan `aria-live="assertive"` pada banner umpan balik agar hasil evaluasi langsung diumumkan secara lantang tanpa ketergantungan visual.
   - Penambahan cincin fokus `:focus-visible` taktil (`2px solid #D97706`, `outline-offset: 2px`) untuk navigasi keyboard dan murid berkebutuhan khusus *low-vision*.
2. **Penyelarasan Pedagogis Total (Pedagogical Distractor Diagnosis)**:
   - Sesuai Protocol 3 *Braincore Authority* di `AGENTS.md`, umpan balik salah tidak boleh sekadar menampilkan teks generik.
   - Bank soal `jlpt-listening-bank-v1.json` kini diperkaya dengan metadata diagnosis `whyFails` pada opsi distraktor.
   - Panel pembahasan `formatExplainHtml` di `fiezel-jlpt-listening.js` secara otomatis memunculkan kartu analisis distraktor (`jlpt-explain-distractor-card`) ketika opsi salah dipilih, menguraikan jebakan pemahaman secara presisi.
3. **Ketahanan Audio Offline (WebKit/Safari Cache Resilience)**:
   - Pada `playAudioStream()`, ditambahkan lapisan pemulihan otomatis via `window.caches.match(url) -> blob -> URL.createObjectURL(blob)` saat pemutaran berkas audio dari remote network menemui kegagalan atau status HTTP 206 di browser iOS/Safari.
4. **Ergonomi Layar Kompak (Zero-Scroll Viewport)**:
   - Textarea catatan TOEFL dan kontainer waktu ujian dipadatkan di `speaking-listening-addon.css` (`min-height: 50px; max-height: 85px;`) untuk memastikan seluruh panggung latihan tetap muat dalam satu layar tanpa scroll vertikal pada perangkat 360×800px.

---

### 2. Bukti Pengujian Empiris (Probe-Driven Headless Playwright)

Perubahan divalidasi menggunakan suite pengujian probe Playwright Chromium headless:
- `tests/listening-braincore-audit-probe.cjs`:
  - `stateSync.historyDelta: 1` (Perekaman riwayat tervalidasi)
  - `stateSync.listeningMasteryDelta: 1` (Telemetri listening terbarui)
  - `stateSync.bktChanged: true` (Model BKT Bayesian terbarui)
  - `feedbackBanner.html`: Mengandung `role="alert"` dan `aria-live="assertive"`
  - `bankIntegrity`: Distribusi kunci 25% merata di Mondai 1 & 2
- `tests/listening-ui-audit-probe.cjs`:
  - `fslSession.exitSize`: `44x44` (Ergonomi WCAG AAA)
  - `options.rect`: `346x44` (Standar tap target terpenuhi)
  - `bottomSheet.containerBg`: `rgb(255, 253, 249)` (Daylight Travertine murni)

---

### 3. Berkas yang Diperbarui & Rincian Perubahan

1. **`features/speaking-listening/fiezel-jlpt-listening.js`**:
   - Menambahkan `aria-label` terstruktur dan atribut `disabled` / `aria-disabled="true"` pada tombol opsi setelah dijawab.
   - Menambahkan `role="alert"` dan `aria-live="assertive"` pada kontainer banner umpan balik.
   - Mengintegrasikan kartu diagnosis distraktor `whyFails` pada `formatExplainHtml`.
   - Menambahkan pemulihan otomatis CacheStorage Blob URL pada `playAudioStream`.
   - Menggunakan `t('jlpt.kunci-tepat')` dan `t('jlpt.not-quite-right')` untuk menjamin nol kebocoran naskah pada mode multi-bahasa.
2. **`features/speaking-listening/jlpt-listening.css`**:
   - Memperbarui palet `.jlpt-replay-pill` menjadi `color: #7A5F1B; background: #FEF3C7; border: 1px solid #FDE68A;` untuk rasio kontras > 6:1.
   - Menambahkan aturan `:focus-visible` dengan outline taktil `#D97706`.
3. **`features/speaking-listening/speaking-listening-addon.css`**:
   - Menyesuaikan `.fsl-timing` dan `.fsl-notes` (`min-height: 50px; max-height: 85px;`) untuk zero-scroll pada layar ponsel kompak.
4. **`features/speaking-listening/jlpt-listening-bank-v1.json`**:
   - Memperkaya butir soal dengan anotasi `whyFails` pada opsi distraktor.
5. **`id-golden-baseline.json`**:
   - Memperbarui baseline emas untuk menyelaraskan token fallback i18n baru.
6. **`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`**:
   - Hexa-sync build dinaikkan dari `m025-583` ke `m025-584`.

---

### 4. Status Kelulusan Gerbang Mutu Lokal

Seluruh 11 gerbang mutu lolos dengan predikat **100% HIJAU (PASS)**:
- `node tests/audio-locale-guard-test.js` -> PASS (Audio locale-independent dan bebas TTS browser)
- `node tests/speaking-listening-test.js` -> PASS (45/0 pemeriksaan lolos)
- `node tests/listening-exam-test.js` -> PASS (38/0 pemeriksaan lolos)
- `node tests/chokai-multi-voice-protocol-test.js` -> PASS (Multi-voice persona tervalidasi)
- `node tests/course-persistence-and-jlpt-mobile-test.js` -> PASS (Persistensi kursus & kartu mobile tervalidasi)
- `node tests/gems-test.js` -> PASS (34 pemeriksaan lolos)
- `node tests/th-ui-leak-test.js` -> PASS (0 kebocoran naskah di mode Thai)
- `node tests/th-coverage-test.js` -> PASS (258/258 paritas kamus ID-TH penuh)
- `node tests/i18n-kunci-hantu-test.js` -> PASS (Semua t('kunci') terdaftar resmi, 0 kunci hantu)
- `node tests/id-golden-snapshot-test.js` -> PASS (Baseline emas Indonesia utuh)
- `node tests/curriculum-cache-version-test.js` -> PASS (26 penegasan selaras di build m025-584)
- `node tests/gate-registry-test.js` -> PASS (10/0 pemeriksaan registry lolos)
- `node tools/bump-build.mjs --check` -> PASS (Hexa-Sync: 6 titik selaras di m025-584)

---

### 5. Catatan Utang Teknis & Rekomendasi Selanjutnya

1. **Continuous Distractor Enrichment**: Sebanyak 3 butir pertama telah dilengkapi `whyFails` mendalam. Pola ini dapat terus diperluas secara bertahap ke seluruh 30 butir soal JLPT tanpa mengganggu struktur naskah audio yang sudah ter-render.
2. **PWA Shell Caching**: Saat rilis m025-584 dideploy ke CDN dan GitHub Pages, Service Worker akan menyajikan cache shell baru (`fiezel-shell-m025-584`) dan memicu dialog update resmi.
