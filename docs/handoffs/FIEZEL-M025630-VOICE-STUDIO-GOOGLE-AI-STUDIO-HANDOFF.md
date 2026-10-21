# FIEZEL HANDOFF DOSSIER: INTEGRASI GOOGLE AI STUDIO BERANDA & GEMINI LIVE DUPLEX STREAMING (m025-630)

## 1. Ringkasan Temuan Audit & Alasan Perubahan
- **Kebutuhan Pengguna**: Menjawab kebutuhan integrasi menyeluruh Opsi A dan Opsi B:
  1. **Opsi A (Sistem Suara Google AI Studio Live Duplex)**:
     - Streaming duplex suara dua arah langsung dari peramban murid ke Google Gemini Multimodal Live API WebSocket (`wss://generativelanguage.googleapis.com/...`) dengan `gemini-2.0-flash-exp` tanpa perlu server proxy.
     - Penanganan setup frame otomatis (`models/gemini-2.0-flash-exp`, audio output modality, persona voice, system instructions).
     - Streaming mikrofon real-time PCM 16kHz (`realtimeInput.mediaChunks`) dan decoding audio model turn secara streaming tanpa latency.
     - Penanganan barge-in server-side interruption (`msg.serverContent?.interrupted`).
     - Modal konfigurasi kunci API pribadi (`fz_gemini_api_key`) tersimpan aman di `localStorage` peramban.
  2. **Opsi B (Desain Beranda Google AI Studio & Akses Terintegrasi)**:
     - Default landing tab di `call.html` kini adalah Google AI Studio Beranda (`HomeRedesignView`) yang memuat 4 modul studio: Telepon Live AI, Vocabulary Mastery, Grammar Pattern, dan Shadowing Suara.
     - URL sinkron otomatis dengan parameter query `?tab=home`, `?tab=call`, `?tab=braincore` serta `?scenario=...`.
     - Tombol navigasi `← PWA` (`./index.html`) di header kaca hangat untuk kembali ke aplikasi utama.
     - Kartu peluncur khusus "Studio Suara AI · Google AI Studio" di layar beranda utama PWA (`app.js`), serta tombol akses instan di header dan stage panggilan suara PWA (`fiezel-voice-call.js`).

## 2. Bukti Pengujian Empiris (Playwright Headless Probes)
1. **Probe Voice Studio AI Studio Verification (`tools/dev/probe-voice-studio-aistudio-verification.mjs`)**:
   - Membuka `call.html` secara default langsung memuat Beranda (`HomeRedesignView`).
   - Tombol `← PWA` aktif dan terhubung ke `./index.html`.
   - Modal Gemini Live Key terbuka, menerima kunci `AIzaSy...`, dan menyimpannya di `localStorage['fz_gemini_api_key']`.
   - Mengganti tab ke "Panggilan AI" memperbarui URL ke `?tab=call`.
   - Status: **100% PASS**.
2. **Probe PWA Home Studio Card (`tools/dev/probe-pwa-voice-studio-home-card.mjs`)**:
   - Membuka `index.html` (PWA Home).
   - Memastikan kartu `[data-testid="voice-studio-home-card"]` muncul dengan judul "Studio Suara AI · Google AI Studio".
   - Tombol CTA `[data-testid="voice-studio-cta"]` mengarah ke `./call.html`.
   - Status: **100% PASS**.

## 3. Daftar Berkas yang Disentuh & Perubahannya
1. `features/voice-studio/src/lib/liveTransport.ts`:
   - Menambahkan resolusi URL Google Gemini Multimodal Live WebSocket jika kunci `fz_gemini_api_key` tersedia.
2. `features/voice-studio/src/App.tsx`:
   - Default tab diatur ke `'home'`.
   - Sinkronisasi URL query parameter `?tab=...` via `window.history.replaceState`.
   - Penambahan modal Gemini Live Key dan tombol `← PWA` di header.
   - Penanganan setup frame, streaming mic, decoding audio, dan interupsi Gemini Live WebSocket.
3. `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css`:
   - Dibangun ulang secara bersih menggunakan Vite dan Tailwind v4.
4. `app.js`:
   - Penambahan fungsi `voiceStudioHomeCardMarkup()` pada panel Hari Ini PWA.
5. `features/interactive-chat/fiezel-voice-call.js`:
   - Penambahan tombol `✨ Studio Live` dan banner pintasan Google AI Studio.
6. `features/i18n/copy-id-student.js` & `features/i18n/copy-th-student.js`:
   - Pendaftaran naskah dua bahasa (ID & TH) untuk kartu Studio Suara, tombol, dan pintasan panggil.
7. `coordination/BUILD-VERSION.json`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `sw.js`:
   - Kenaikan build terkoordinasi ke `m025-630`.
8. `id-golden-baseline.json` & `reports/th-ui-leak-report.json`:
   - Sinkronisasi baseline emas Indonesia dan verifikasi 0 kebocoran UI Thai.

## 4. Status Kelulusan Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: **HIJAU**
- `node tests/th-ui-leak-test.js`: **HIJAU**
- `node tests/curriculum-cache-version-test.js`: **HIJAU**
- `node tests/gate-registry-test.js`: **HIJAU**
- `node tests/voice-call-two-way-test.js`: **HIJAU**
- `node tests/home-kawan-bicara-card-test.js`: **HIJAU**
- `node tests/pwa-cache-test.js`: **HIJAU**
- `node tools/bump-build.mjs --check`: **Selaras (6/6 titik)**
- `git diff --check`: **0 whitespace errors**
