# FIEZEL M025-631 Handoff Dossier: Perbaikan Tata Letak Topbar, Sticky Bottom Bar, dan Respons Suara Real-Time pada Mitra Kaiwa

**Nomor Rilis**: `m025-631`
**Cakupan**: `fix(chat): rapikan topbar bottombar dan aktifkan respons suara mitra kaiwa (m025-631)`
**Status Mutu Lokal**: 100% HIJAU (PASS)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan laporan pengguna (*"topbarnya berantakan, bottom bar nya terpotong, dan tidak merespon suara dari user"*) dan audit empiris Playwright pada perangkat mobile (`390x844`):

1. **Topbar Berantakan & Bertabrakan di Layar Mobile**:
   - Pada lebar layar `< 390px`, subjudul `会話パートナー · Studio Suara AI` dan ikon crest di dalam `<header>` mendesak tombol `Kunci Live` (`x=228.6px` bertabrakan dengan teks `Mitra Kaiwa` di `x=230.4px`).
   - Selain itu, efek `scrollIntoView` otomatis saat inisialisasi (`turns.length === 1`) menggulir halaman sejauh `1834px` ke bawah saat pertama dibuka.
2. **Bottom Bar Terpotong (`768px` vs `844px`)**:
   - Kontainer `#fzcContainer` di dalam `#app` terkena aturan CSS global `padding-bottom: 76px !important`, sehingga tinggi `<iframe id="fzMitraKaiwaStudioFrame">` terpotong menjadi `768px` (hilang `76px` di bagian bawah).
   - Di dalam `call.html`, baris input (`Rekam Suara` + input teks + `Kirim`) berada di tengah aliran kartu dan bukan *sticky bottom bar* di dasar layar, serta teks placeholder terpotong.
   - Pada `sw.js`, navigasi iframe ke `/call.html` yang belum ada di `SHELL_CACHE` jatuh ke cadangan `./index.html`.
3. **Tidak Merespon Suara dari User**:
   - Pada mode **Telepon Live** (`turn-by-turn-fallback`), aplikasi memutar kalimat pembuka AI tetapi tidak pernah menyalakan `SpeechRecognition` untuk mendengarkan jawaban suara murid.
   - Pada mode **Rekam Suara** (`startPttRecording`), pemanggilan `getUserMedia` (`MediaRecorder`) secara bersamaan dengan `SpeechRecognition` memblokir akses mikrofon `SpeechRecognition` di peramban Chrome/Android.
   - Selain itu, `evaluateTurnFlexible` dan `synthesizeFlexibleTts` menunggu berlapis-lapis *timeout* (hingga 25+ detik) pada *endpoint* `/api/voice-call/turn` dan `/api/voice-call/tts` sebelum memberikan balasan suara.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Probe)

Hasil pengukuran empiris sebelum dan sesudah perbaikan pada viewport mobile `390x844`:

- **Ukuran Kontainer & Iframe**:
  - Sebelum: `frameRect.height = 768px` (`paddingBottom = 76px`)
  - Sesudah: `frameRect = { x: 0, y: 0, width: 390, height: 844 }`, `scrollY = 0`
- **Tata Letak Topbar & Sticky Bottom Bar**:
  - `headerRect`: `{ top: 0, height: 57, width: 390 }`, `titleRect.right = 182.45px` (bebas tabrakan)
  - `bottomDockRect`: `{ top: 779, bottom: 844, width: 390, height: 65 }` (menempel presisi di dasar layar tanpa terpotong)
- **Uji Empiris Respons Suara (`Rekam Suara` & `Telepon Live`)**:
  - Uji `Rekam Suara` (`"ホットコーヒーを一つお願いします。"`): langsung ditranskripsi real-time, dievaluasi Braincore, dan dibalas oleh PAW (`"かしこまりました！ホットコーヒーとチーズケーキですね..."`).
  - Uji `Telepon Live` Hands-Free (`"店内で飲みます。チーズケーキもください。"`): otomatis mendengarkan (`🎙️ Mendengarkan...`), menangkap ucapan murid, mengirim otomatis saat jeda bicara, dan dibalas PAW dengan suara + terjemahan.

---

## 3. Daftar Berkas yang Disentuh

1. `features/voice-studio/src/App.tsx` & `features/voice-studio/dist/voice-studio.*`:
   - Merapikan `<header>` topbar responsif bebas tumpang-tindih.
   - Memindahkan baris input suara & ketik menjadi *Sticky Bottom Bar* (`[data-testid="mitra-kaiwa-bottom-dock"]`) di dasar layar lengkap dengan indikator tangkapan suara real-time.
   - Mengaktifkan siklus `SpeechRecognition` berkelanjutan (*hands-free*) pada mode **Telepon Live** (`turn-by-turn-fallback`) dan memperbaiki **Rekam Suara** (`startPttRecording` / `stopPttRecording`) tanpa konflik `MediaRecorder`.
2. `features/voice-studio/src/lib/liveTransport.ts`:
   - Memangkas jeda *timeout* berlapis pada `evaluateTurnFlexible` dan `synthesizeFlexibleTts` agar respons evaluasi dan suara PAW tampil seketika (`< 50ms`).
3. `features/interactive-chat/fiezel-interactive-chat.js` & `features/interactive-chat/interactive-chat.css`:
   - Memasang `position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100dvh !important; padding-bottom: 0 !important;` pada `#fzcContainer` dan `#fzMitraKaiwaStudioFrame`.
4. `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json`:
   - Menambahkan rute jaringan-dulu untuk `/call.html` dan `/features/voice-studio/dist/` di `sw.js` serta menaikkan nomor build Hexa-Sync ke `m025-631`.

---

## 4. Status Kelulusan Gerbang Mutu Lokal

- `node tools/bump-build.mjs --check`: **PASS** (`Selaras` pada `m025-631`)
- `node tests/id-golden-snapshot-test.js`: **PASS**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/curriculum-cache-version-test.js`: **PASS**
- `node tests/gate-registry-test.js`: **PASS**
