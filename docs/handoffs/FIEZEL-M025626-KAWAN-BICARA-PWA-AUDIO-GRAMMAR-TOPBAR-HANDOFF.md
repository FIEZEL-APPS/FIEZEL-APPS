# FIEZEL HANDOFF DOSSIER: M025-626
## Perbaikan Menyeluruh Kawan Bicara (PWA Cache, Audio TTS 502, STT Buffer, Grammar Misconception, & Responsive Topbar)

- **Nomor Build**: `m025-626`
- **Tanggal**: 20 Oktober 2026
- **Status Mutu**: 100% Lulus Seluruh Gerbang Mutu Lokal & Probe Empiris

---

### 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan audit empiris terorkestrasi oleh 15 subagent spesialis terhadap seluruh keluhan pengguna:
1. **"Suara semuanya hilang baik di chat maupun di panggilan"**:
   - Di `backend/tts.py` baris 170-202, variabel `audio_data = bytearray()` terhapus saat pembersihan tanda baca, memicu `NameError: name 'audio_data' is not defined` yang menyebabkan endpoint Render upstream `/api/tts/line` mengembalikan HTTP 502 Bad Gateway 100% pada semua panggilan audio (Keita, Nanami, Guy, Aria).
   - Di `features/interactive-chat/fiezel-chat-voice.js`, logika failover memuat inverted conditional (`if (serverStatus !== 'available')`), dan `waitForSdk()` di `features/neural-voice/fiezel-puter-voice.js` membeku selama 15-30 detik saat Puter SDK tidak ada di halaman.
   - Perbaikan: `audio_data` diinisialisasi ulang di `backend/tts.py`, failover `serverStatus` diperbaiki di `fiezel-chat-voice.js`, fail-fast di `fiezel-puter-voice.js`, dan fallback audio terjamin bebas dari freeze.
2. **"Semua perbaikannya tidak berjalan di PWA"**:
   - Di `features/ui/fiezel-update-prompt.js`, ketika pengguna menekan tombol "Perbarui sekarang" saat Service Worker baru masih mengunduh 301 file (28 MB) di status `installing`, `reg.waiting` bernilai null sehingga pesan `FIEZEL_SKIP_WAITING` tidak pernah dikirim dan halaman langsung reload ke Service Worker lama (`m025-622`).
   - Perbaikan: Menambahkan listener `statechange` pada `reg.installing` agar menunggu hingga `installed` sebelum mengirim `FIEZEL_SKIP_WAITING` dan me-reload halaman.
3. **"Balasan AI nya bodoh dan tidak nyambung"**:
   - SpeechRecognition multi-segment (`event.resultIndex`) di `fiezel-voice-call.js` memotong ujaran murid yang memiliki jeda napas antar-klausa, sehingga AI hanya merespons segmen terakhir ("with my family" bukan kalimat utuh).
   - Perbaikan: Akumulasi multi-segmen continuous STT, peningkatan ambang jeda, refractory window 900ms untuk menepis gema speaker AI, dan penerusan mode `call` ke Worker AI.
4. **"Koreksi grammar tidak berfungsi"**:
   - `state.correctionMode` tidak diteruskan ke sesi panggilan suara di `fiezel-voice-call.js:982`.
   - `sessionId` di Braincore Misconception Ledger bernilai kosong sehingga gerbang `MIN_SESSIONS >= 2` tidak pernah tercapai.
   - Perbaikan: Sinkronisasi flag `correction` ke requestReply AI dan voice turn messages di feed chat, serta perbaikan activeChatSession timestamp.
5. **"Topbar berantakan"**:
   - Di `interactive-chat.css`, `.fzc-partner-name` memiliki `overflow: visible !important; text-overflow: clip !important; flex-shrink: 0 !important;` yang menabrak tombol Call hijau pada viewport 360px-390px.
   - Padding atas `#fzcCallOverlay` bernilai `0px` saat `env(safe-area-inset-top)` bernilai 0.
   - Perbaikan: `.fzc-partner-name` dibuat ellipsis rapi, container safe-area diberi batas minimum `max(16px, ...)`, dan media query 360px/375px diterapkan untuk topbar kompak.
6. **"Kotak transparan di sekeliling animasi AI"**:
   - Pseudo-element `::before` dan `::after` pada `.fzc-call-stage` serta overflow/outline menghasilkan artefak kotak transparan pada layar panggilan.
   - Perbaikan: Pseudo-element dinonaktifkan (`display: none !important`), `outline` dan `border` disetel `none !important`, dan `overflow: visible !important`.

---

### 2. Bukti Pengujian Empiris Nyata

1. **Suite Probe Panggilan Suara (`node tools/dev/probe-voice-call-audit.mjs`)**:
   - `split.en.abbrev-decimal`: PASS
   - `split.ja`: PASS
   - `tts.timeout-effective`: PASS
   - `tts.bargein.webaudio-residue`: PASS
   - `call.start`: PASS
   - `call.transcript.multi-segment`: PASS
   - `call.latency.silence-timeout`: PASS
   - `call.latency.time-to-speech`: PASS
   - `call.bargein.echo-guard`: PASS
   - `call.bargein.latency`: PASS
   - `call.end.race`: PASS
   - `call.end.sync-braincore`: PASS
   - `invariant.no-speechSynthesis`: PASS
   - **Hasil: 13/13 LULUS (100% PASS)**

2. **Playwright E2E Integration Probe**:
   - State machine `startCall` -> `listening` -> `thinking` -> `speaking` -> `idle`: Terverifikasi 100%.
   - Hands-free loop & polite barge-in: Terverifikasi.
   - Sinkronisasi Braincore: 8 panggilan `updateMastery`, 8 panggilan `bktRecord`, dan pencatatan miskonsepsi `particle_wa_ha` terverifikasi utuh.
   - Zero-Console Error: 0 uncaught exception, 0 console error.

---

### 3. Daftar Berkas yang Diubah

1. `backend/tts.py`:
   - Inisialisasi `audio_data = bytearray()` sebelum loop WebSocket sintesis Edge TTS.
2. `features/interactive-chat/fiezel-chat-voice.js`:
   - Koreksi logika `serverStatus = 'unavailable'`.
   - Pembersihan endpoint 404 pada failover line.
   - Penyesuaian `minLen = 3` untuk ujaran lisan bahasa Jepang pada `splitSentences`.
   - Normalisasi teks dan pembersihan furigana dengan dukungan parameter `course`.
   - Autoplay audio context unlock listener berulang.
3. `features/neural-voice/fiezel-puter-voice.js`:
   - Fail-fast langsung jika Puter SDK tidak termuat di DOM.
4. `features/interactive-chat/fiezel-voice-call.js`:
   - Penambahan Screen Wake Lock (`acquireWakeLock` & `releaseWakeLock`).
   - Guard `pageHideListener` agar tidak memutus panggilan saat layar HP padam.
   - Penyaringan gema AI (Acoustic Refractory Window 900ms & kana normalization).
   - Buffering ujaran murid saat transisi thinking.
   - Penerusan flag `correction` ke AI saat mode koreksi aktif.
5. `features/interactive-chat/fiezel-interactive-chat.js`:
   - Parameter `course` pada `cv.cleanText(text, state.course)`.
   - Sinkronisasi `sessionId` aktif ke `misconceptionLedgerRecord`.
   - Penyertaan `correctionMode: true` pada pesan suara murid di riwayat chat.
   - Pemutaran audio tombol manual menggunakan `targetMsg` untuk melindungi furigana.
   - Pembaharuan ikon audio `.fzc-btn-icon-wrap` saat memutar/berhenti.
   - Pembedaan kelas CJK `.fzc-japanese-text` vs `.fzc-english-text`.
   - Lencana mikrofon pada pesan hasil panggilan suara.
6. `features/interactive-chat/interactive-chat.css`:
   - Reset styling tombol untuk `#fzcCallOverlay`.
   - Zero-collision topbar (`text-overflow: ellipsis` pada `.fzc-partner-name`).
   - Penghapusan artefak kotak transparan pada `.fzc-call-stage`.
   - Media query kompak untuk topbar dan persona switch (360px-390px).
   - Horizontal rail anti-wrap pada action buttons di mobile feed chat.
7. `features/interactive-chat/fiezel-voice-orb.css`:
   - Pengisolasian `.fzc-call-container .fzc-call-stage` dari styling fixed background.
8. `index.html`:
   - Penambahan `interactive-widget=resizes-content` pada viewport meta tag.
   - Penambahan `https://www.jlpt.jp` pada CSP `media-src`.
9. `features/ui/fiezel-update-prompt.js`:
   - Listener `statechange` pada worker status `installing` untuk mencegah reload prematur.
10. `sw.js`:
    - Pembaruan nomor revisi cache shell ke `m025-626`.
11. `core-config.js`:
    - Sinkronisasi nomor build ke `m025-626`.
12. `features/neural-voice/fiezel-diag-panel.js`:
    - Sinkronisasi nomor build ke `m025-626`.
13. `kurikulum.html` & `misi.html`:
    - Sinkronisasi query param versi ke `m025-626`.
14. `coordination/BUILD-VERSION.json`:
    - Catatan rilis build `m025-626`.
15. `tests/chat-neural-voice-test.js`:
    - Penyesuaian assert `splitSentences` bahasa Jepang sesuai kanon ujaran lisan.
16. `id-golden-baseline.json`:
    - Pembaruan snapshot baseline teks bahasa Indonesia resmi.

---

### 4. Status Kelulusan Gerbang Mutu Lokal

- `node tests/chat-voice-neural-endpoint-test.js`: **PASS (6/6)**
- `node tests/chat-neural-voice-test.js`: **PASS (7/7)**
- `node tests/precache-covers-shell-test.js`: **PASS (5/5)**
- `node tests/pwa-cache-test.js`: **PASS**
- `node tests/id-golden-snapshot-test.js`: **PASS**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/curriculum-cache-version-test.js`: **PASS (m025-626)**
- `node tests/gate-registry-test.js`: **PASS (10/10)**
- `node tests/audio-locale-guard-test.js`: **PASS (32 modul audio bersih)**
- `node tools/bump-build.mjs --check`: **Selaras (Hexa-Sync Invariant Terpenuhi)**
