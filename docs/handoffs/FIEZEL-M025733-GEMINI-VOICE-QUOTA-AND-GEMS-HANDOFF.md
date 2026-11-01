# FIEZEL HANDOFF DOSSIER: BUILD m025-733
**Topik**: Gemini Live Ghost Prewarm Cleanup, Gem Confirmation Modals, Sequential Dual-Key Failover, and 100-Gem Economy Architecture
**Tanggal**: 1 November 2026
**Status**: LULUS MUTU (100% HIJAU)
**Nomor Build**: `m025-733`
**Branch**: `feat/mochi-gemini-quota-and-gems-m025-733`
**Target**: `main` via Pull Request (Zero-Red-Merge Invariant)

---

## 1. Ringkasan Temuan Audit dan Alasan Perubahan (Forensic Root Cause)

### A. Insiden Kuota Gemini API & Peringatan Google Trust & Safety
Aplikasi menerima surat peringatan resmi dari Google Cloud Platform Trust & Safety dengan subjek:
`"Policy Violation Action required: Critical problem with your Google Cloud/APIs project Gemini Project 3 (id: gen-lang-client-0016465797)"` disertai pesan error `429 ResourceExhausted (quota exceeded)`.

### B. Hasil Investigasi Forensik Sistem Suara
1. **Ghost WebSocket Prewarming di Latar Belakang (`features/mascot/fiezel-mochi-voice-sos.js`)**:
   - `prewarmLiveSession(false)` dipanggil otomatis pada milidetik ke-30 setelah DOM siap.
   - `schedulePrewarmRefresh()` menjadwalkan interval setiap 15 detik untuk memelihara soket WebSocket aktif ke Gemini Live.
   - `greetOnEntry` memicu `startCall()` seketika murid membuka layar kuis.
   - Karena `mochi_enabled` aktif secara default untuk seluruh murid PWA, ratusan peramban murid membuka saluran audio dua arah ke Google secara simultan tanpa ada interaksi suara aktif.
2. **Hedged Dual-Key Call Duplication (`workers/api/voice/route-voice-live.js`)**:
   - Skrip worker mengeksekusi `setTimeout(startHedge, 750)`. Jika Key #1 belum mengembalikan respons utuh dalam 750ms, Key #2 langsung dipanggil secara paralel. Ini menggandakan konsumsi token dan RPM sebesar 2x lipat pada setiap panggilan copilot.
3. **Ketiadaan Konfirmasi Gem & Pelindung Kuota**:
   - Murid tidak diberi tahu biaya Gem saat mengetuk Mochi SOS atau Kawan Bicara (Call Studio), sehingga Gem dan kuota API dapat terkuras tanpa kesadaran pengguna.

---

## 2. Solusi Arsitektur & Perubahan Sistemik

1. **Eliminasi Total Ghost Traffic (Zero Background Traffic Invariant)**:
   - Menghapus fungsi `warmGreetingAudioInBackground()`, `prewarmLiveSession()`, `schedulePrewarmRefresh()`, `openHotSocket()`, dan pemanggilan `setTimeout` saat startup.
   - Gemini Live WebSocket HANYA dibuka ketika murid secara sadar mengonfirmasi tombol dialog untuk memulai percakapan.
2. **Karakter Mochi Tetap Hidup Tanpa Boros Token (Proaktif Visual)**:
   - **Saat Masuk Kuis (`greetOnEntry`)**: Mochi menyapa dengan pose riang dan balon pikiran ramah visual tanpa membuka WebSocket.
   - **Saat Murid Menjawab Salah (`onQuestionAnswered`)**: Jika sesi suara sedang tidak aktif dan jawaban salah (`!ok`), Mochi beralih ke pose berpikir (`think`), memunculkan balon pikiran penyemangat ("Ayo kita bedah bareng! Ketuk Mochi ya..."), dan memicu animasi denyut `fz-mochi-hint-pulse`.
3. **Penyelarasan Sequential Failover di Worker**:
   - Menghapus dual hedged call timer. Key #2 HANYA dipanggil jika Key #1 mengalami kegagalan, timeout jaringan nyata, atau `429 ResourceExhausted`.
4. **Desain Ekonomi 100 Gem & Kuota Harian**:
   - **Kawan Bicara (`call.html` / `App.tsx`)**:
     * Biaya: 25 Gem per sesi.
     * Batas durasi per sesi: 5 menit (300 detik) otomatis berhenti.
     * Kuota Gratis Harian: 1 sesi per hari (`fz_free_kawan_bicara_date`).
     * Kapasitas 100 Gem: 4 sesi berbayar (20 menit total) + 1 sesi gratis per hari.
     * Modal Konfirmasi: Dialog interaktif menampilkan saldo Gem saat ini, sisa kuota gratis, atau biaya 25 Gem, serta dialog ramah jika saldo Gem tidak mencukupi.
   - **Mochi SOS (`fiezel-mochi-voice-sos.js`)**:
     * Biaya: 10 Gem per soal (-10 Gem di awal, cashback +5 Gem jika murid berhasil menjawab benar setelah dibimbing = biaya bersih 5 Gem).
     * Kuota Gratis Harian: 2 bantuan per hari (`fz_mochi_sos_daily_date` dan `fz_mochi_sos_daily_count`).
     * Modal Konfirmasi: Dialog interaktif sebelum panggilan Gemini Live terhubung, serta pencegahan modal ganda jika saldo Gem tidak mencukupi.
5. **Kepatuhan Larangan Suara Sintetis (Zero Synthetic TTS Mandate)**:
   - Sesuai arahan mutlak pengguna, TIDAK ADA suara browser/synthetic TTS yang digunakan. Mochi SOS dan Kawan Bicara 100% menggunakan Google Gemini Live (`models/gemini-3.8-live`) dengan suara persona `Puck`.

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu (Zero-Defect Verification)

Seluruh gerbang mutu lokal dijalankan dan lulus 100%:

1. **Mochi Voice SOS Unit Tests**:
   ```bash
   node tests/mochi-voice-sos-test.js
   ```
   *Hasil*: **25/25 PASS** (termasuk verifikasi Gem economy spend 10/cashback 5, non-destructive localhost dev mode, Socratic hints, anti-leak exam purity, dan status banner state machine).
2. **Curriculum Cache Version Alignment (Octa-Sync Invariant)**:
   ```bash
   node tests/curriculum-cache-version-test.js
   ```
   *Hasil*: **33 assertions PASS**, 3 pages aligned to `m025-733`.
3. **Indonesian Baseline Snapshot (Anti-Corruption Golden Snapshot)**:
   ```bash
   node tests/id-golden-snapshot-test.js
   ```
   *Hasil*: **HIJAU: baseline emas Indonesia utuh.**
4. **Thai UI Leak Prevention (Zero UI Leak Gate)**:
   ```bash
   node tests/th-ui-leak-test.js
   ```
   *Hasil*: **PASS (4644 kunci ID, seluruhnya memiliki padanan Thai tanpa kebocoran string modal).**
5. **Gate Registry Meta Verification**:
   ```bash
   node tests/gate-registry-test.js
   ```
   *Hasil*: **10 PASS, 0 FAIL.**

---

## 4. Daftar Berkas yang Disentuh (Inventory of Touched Files)

| Berkas | Perubahan |
|---|---|
| `coordination/BUILD-VERSION.json` | Menaikkan versi kanonikal ke `m025-733`. |
| `sw.js` | Memperbarui `SW_REV` ke `m025-733`. |
| `core-config.js` | Memperbarui `self.FIEZEL_PAGE_BUILD` ke `m025-733`. |
| `features/neural-voice/fiezel-diag-panel.js` | Memperbarui `var DIAG_BUILD` ke `m025-733`. |
| `kurikulum.html` | Memperbarui query string cache aset ke `?v=m025-733`. |
| `misi.html` | Memperbarui query string cache aset ke `?v=m025-733`. |
| `call.html` | Memperbarui query string cache aset ke `?v=m025-733`. |
| `features/voice-studio/call.html` | Memperbarui query string cache aset ke `?v=m025-733`. |
| `features/mascot/fiezel-mochi-voice-sos.js` | Menghapus prewarm background ghost socket; mengimplementasikan modal konfirmasi & saldo tidak cukup; menyesuaikan biaya 10 Gem + cashback 5 Gem; menambahkan batas gratis harian (2x); mempertahankan Mochi tetap proaktif lewat balon pikiran saat salah. |
| `features/mascot/mochi-voice-sos.css` | Menambahkan kelas gaya modal konfirmasi, tombol batal/konfirmasi, dan animasi denyut `@keyframes fzMochiHintPulse`. |
| `features/voice-studio/src/App.tsx` | Mengimplementasikan modal konfirmasi panggilan dan saldo tidak cukup; menambahkan batas durasi panggilan 5 menit; mengimplementasikan kuota gratis 1x per hari; biaya 25 Gem per panggilan berbayar. |
| `features/voice-studio/dist/voice-studio.js` | Hasil kompilasi Vite bundle terkini dari `App.tsx`. |
| `features/voice-studio/dist/voice-studio.css` | Hasil kompilasi Vite bundle terkini. |
| `workers/api/voice/route-voice-live.js` | Menghapus hedged dual-call timer 750ms; mengganti dengan sequential failover Key #1 -> Key #2. |
| `tests/mochi-voice-sos-test.js` | Menyesuaikan ekspektasi biaya 10 Gem dan cashback saldo; memastikan auto-entry tidak memicu panggilan soket tanpa izin eksplisit. |
| `id-golden-baseline.json` | Menyimpan pembaruan copy string konfirmasi modal ke dalam baseline emas Indonesia. |
| `reports/th-ui-leak-report.json` | Laporan hasil kelulusan uji kebocoran bahasa Thai. |
| `features/i18n/copy-id-core.js` | Mendaftarkan 12 kunci resmi i18n untuk modal konfirmasi Mochi SOS dan kuota gratis (Bahasa Indonesia). |
| `features/i18n/copy-th-core.js` | Mendaftarkan padanan 12 kunci resmi i18n Mochi SOS dalam Bahasa Thai (mencegah kunci hantu & kebocoran naskah). |
| `features/voice-studio/worker/cloudflare-live-call-worker.js` | Mengamankan header CORS dan origin validation pada worker Gemini Live WebSocket untuk mencegah pencurian kuota oleh origin eksternal. |

---

## 5. Status Rilis & Panduan Penanganan Banding Google

1. **Selesai Diuji Lokal**: Kode dan build `m025-733` telah siap diterbitkan melalui Pull Request resmi.
2. **Template Surat Banding (Google Trust & Safety)**:
   Pengguna dapat langsung menyalin surat sanggahan yang telah disiapkan di `GEMINI-INCIDENT-POLICY-VIOLATION-REPORT.md` untuk dikirimkan melalui formulir banding di Google Cloud Console.
