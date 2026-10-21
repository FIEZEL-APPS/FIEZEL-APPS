# FIEZEL HANDOFF DOSSIER: MULTI-CHARACTER NEURAL VOICE KAWAN BICARA & CALL
**Build Version:** `m025-615`
**Tanggal:** 20 Oktober 2026
**Otoritas & Disiplin:** Antigravity Engineering Protocol

---

## 1. Ringkasan Temuan Audit & Akar Masalah (Root Cause Analysis)

### Masalah yang Dilaporkan Pengguna
Pada live PWA (`https://fiezel.my.id/app/`), tidak ada suara sama sekali baik saat melakukan panggilan suara (Voice Call) maupun balasan otomatis/tombol dengar di obrolan teks (Interactive Chat).

### Akar Masalah Nyata
1. **Kegagalan Endpoint L1 di Produksi:**
   PWA produksi diarahkan memanggil `/api/tts/line` pada same-origin (`https://fiezel.my.id/api/tts/line`). Karena server hosting `fiezel.my.id` adalah Apache/cPanel statis (docroot `public_html/app`), pemanggilan tersebut mengembalikan `404 Not Found`.
2. **Ketiadaan Cadangan Suara yang Berfungsi (Silent Degradation):**
   Jalur fallback (`FiezelVoiceSay`, `FiezelPuterVoice`) berada di dalam skrip `type="fiezel/lazy"` yang belum tentu dimuat saat murid langsung membuka chat. Selain itu, Puter diblokir CSP, dan Cloudflare AI TTS mengembalikan 401 unauthenticated untuk pengguna tanpa cookie server. Sesuai kanon L5 fail-quiet, sistem memilih bungkam (`resolve(false)`) daripada melempar error, sehingga murid mengalami kesunyian total (*total silence*).
3. **Autoplay Policy Peramban Seluler:**
   Pada beberapa browser mobile (iOS Safari & Android Chrome), elemen HTML5 `<audio>` diblokir jika belum ada *user gesture* audio context unlock.

---

## 2. Solusi & Arsitektur yang Diterapkan

1. **FastAPI Edge TTS Backend (`backend/tts.py` & `backend/server.py`):**
   - Menggunakan native WebSocket Edge TTS ke `wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1` dengan kalkulasi dynamic `Sec-MS-GEC` token (SHA-256 Windows ticks 5-menit).
   - Mendukung multi-persona vokal:
     - English: Coach Alex (`en-US-GuyNeural`), Coach Sarah (`en-US-AriaNeural`), Ava (`en-US-AvaNeural`).
     - Japanese: Sensei Nanami (`ja-JP-NanamiNeural`), Keita (`ja-JP-KeitaNeural`).
     - Indonesian: Instruktur Ardi (`id-ID-ArdiNeural`).
   - Waktu respons <0.4 detik dengan in-memory LRU cache.
   - Dihosting di Render (`https://fiezel-apps.onrender.com/api/tts/line`) dengan konfigurasi CORS resmi untuk `https://fiezel.my.id`.

2. **cPanel Same-Origin Bridge (`api/tts/line/index.php` & `api/tts/personas/index.php`):**
   - Jembatan PHP dengan disk cache di server cPanel untuk memastikan endpoint same-origin `/app/api/tts/line/index.php` dan `/api/tts/line` selalu menjawab 200 OK.

3. **Multi-Candidate Failover di Klien (`features/interactive-chat/fiezel-chat-voice.js`):**
   - Prioritas 1: Local server (jika di localhost/127.0.0.1:3000).
   - Prioritas 2: Remote Render backend (`https://fiezel-apps.onrender.com/api/tts/line`).
   - Prioritas 3: cPanel same-origin PHP proxy (`/app/api/tts/line/index.php`).
   - Dual-pipeline playback: Mencoba HTML5 Audio; jika terkena Autoplay rejection, seketika jatuh ke WebAudio `AudioContext.decodeAudioData` + `AudioBufferSourceNode`.
   - Global Audio Unlock: Menambahkan `unlockAudio()` pada interaksi `pointerdown` dan `touchstart`.

4. **UI Hooks Synchronization (`fiezel-interactive-chat.js` & `fiezel-voice-call.js`):**
   - Memanggil `unlockAudio()` dan `cv.unlockAudio()` saat panggilan dimulai atau tombol dengar ditekan.

---

## 3. Bukti Pengujian Empiris (Headless Chromium Playwright Probe)

Pengujian empiris nyata dijalankan dengan Playwright pada viewport mobile (390x844):
- **Skrip Probe:** `tools/dev/probe-kawan-bicara-neural-voice.mjs`
- **Hasil:**
  - View Kawan Bicara termuat sempurna dengan tombol `#fzcBtnCall`.
  - Voice Call Mode aktif: orb organik, halo opacity, dan partner label (`フィゼル先生`) tampil.
  - Orb dinamis berdenyut saat audio neural aktif (sampling 4 dari 4 frame aktif, scale > 1.05x).
  - Polite Barge-In: saat murid menginterupsi atau menekan tombol tutup, audio AI terputus seketika tanpa kebocoran suara.
  - Dialog panggilan tersimpan utuh di riwayat feed chat.
  - **Total Console Error:** 0
  - **Total Unhandled Exceptions:** 0
  - **Status:** 100% PASS 🎉

---

## 4. Status Gerbang Mutu Lokal

- `node tests/kawan-bicara-neural-voice-test.js`: **PASS (100%)**
- `node tests/id-golden-snapshot-test.js`: **PASS (Baseline emas utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (0 kebocoran naskah)**
- `node tests/curriculum-cache-version-test.js`: **PASS (26 penegasan)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tools/bump-build.mjs --check`: **PASS (Hexa-Sync Selaras m025-615)**

---

## 5. Daftar Berkas yang Disentuh

1. `backend/tts.py` (FastAPI Edge TTS router & dynamic Sec-MS-GEC generator)
2. `backend/server.py` (Registrasi `tts_router` ke aplikasi FastAPI)
3. `api/tts/line/index.php` (cPanel same-origin forwarder & cache)
4. `api/tts/personas/index.php` (cPanel same-origin personas manifest)
5. `core-config.js` (Konfigurasi `FIEZEL_TTS_CONFIG` & bump build `m025-615`)
6. `features/interactive-chat/fiezel-chat-voice.js` (Multi-candidate failover, WebAudio fallback, audio unlock)
7. `features/interactive-chat/fiezel-interactive-chat.js` (Audio unlock hook)
8. `features/interactive-chat/fiezel-voice-call.js` (Audio unlock hook)
9. `features/neural-voice/fiezel-diag-panel.js` (Bump build `m025-615`)
10. `sw.js` (Bump build `m025-615`)
11. `kurikulum.html` (Bump build `m025-615`)
12. `misi.html` (Bump build `m025-615`)
13. `coordination/BUILD-VERSION.json` (Hexa-Sync version `m025-615`)
14. `tests/kawan-bicara-neural-voice-test.js` (Unit test suite baru)
15. `tests/voice-call-two-way-test.js` (Isolasi unit test voice call)
16. `tests/chat-neural-voice-test.js` (Isolasi unit test chat neural voice)
17. `tests/audio-latency-barge-in-test.js` (Isolasi unit test audio latency & barge-in)
18. `tools/dev/probe-kawan-bicara-neural-voice.mjs` (Headless Playwright probe)
19. `docs/handoffs/FIEZEL-M025615-KAWAN-BICARA-MULTI-NEURAL-VOICE-HANDOFF.md` (Dossier handoff resmi)
