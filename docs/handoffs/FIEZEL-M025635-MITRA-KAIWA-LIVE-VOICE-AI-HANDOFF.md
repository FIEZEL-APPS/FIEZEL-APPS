# FIEZEL M025-635 Handoff Dossier: Mitra Kaiwa / Kawan Bicara Live Neural Voice & Real AI Partner

## 1. Ringkasan Temuan Audit Empiris & Akar Masalah

Berdasarkan keluhan pengguna di produksi (`m025-633`/`m025-634`):
1. **"Suaranya masih belum ada"** dan **"aku tidak mau suaranya kaya robot atau tts web browser"**.
2. **"AI tidak bisa menjawab sama sekali saat melakukan panggilan live"**.

Hasil audit empiris menggunakan Playwright headless Chromium terhadap situs produksi (`https://fiezel.my.id/app/call.html`) menemukan 4 akar masalah nyata:

1. **Endpoint Neural TTS Salah Alamat (`404 Not Found`)**:
   - `synthesizeFlexibleTts()` di `features/voice-studio/src/lib/liveTransport.ts` menembak path relatif `/api/tts/line` (`https://fiezel.my.id/api/tts/line`), padahal `fiezel.my.id` adalah hosting statis cPanel dan tidak melayani `/api/tts/line`.
   - Sementara itu, `core-config.js` sudah mendefinisikan endpoint resmi `self.FIEZEL_TTS_CONFIG.endpoint = 'https://fiezel-apps.onrender.com/api/tts/line'` (Edge Neural Voice multi-karakter: Coach Alex, Coach Sarah, Nanami, Keita), namun `liveTransport.ts` mengabaikannya.
   - Selain itu, timeout `3500ms` terlalu pendek untuk *cold-start* Render (~7 detik), dan saat gagal kode langsung jatuh ke `window.speechSynthesis.speak()` (suara robot peramban) yang ditolak pengguna dan sering macet tanpa menembakkan `onend` (membuat `isPlayingAiAudio` terkunci `true` sehingga mikrofon *hands-free* tidak pernah terbuka).

2. **Ketiadaan Koneksi AI Nyata pada Mode Panggilan (`evaluateTurnFlexible`)**:
   - `evaluateTurnFlexible()` hanya memanggil Gemini apabila pengguna menempelkan kunci API pribadi `localStorage['fz_gemini_api_key']`. Tanpa kunci tersebut, sistem selalu jatuh ke template deterministik statis (`evaluateUtteranceClientSide`) dan tidak pernah memanggil backend AI produksi FIEZEL (`https://api.fiezel.my.id/api/ai/task` task `conversation_turn`).

3. **Blokir Autoplay Peramban Mobile pada Giliran Hands-Free & Izin Mikrofon**:
   - Balasan panggilan tiba 4–7 detik setelah ketukan pengguna (setelah STT + AI + Neural TTS selesai), di luar *transient user activation*, sehingga elemen `new Audio()` baru berisiko diblokir peramban mobile.
   - `SpeechRecognition` pada mode *Telepon Live* baru dimulai setelah sapaan pembuka selesai tanpa meminta izin mikrofon pada ketukan awal, dan galat `not-allowed` / `audio-capture` sebelumnya ditelan diam-diam (`rec.onerror = () => {}`).

## 2. Solusi Arsitektural yang Diterapkan

1. **100% Neural Voice Multi-Karakter & Eliminasi Total Robot Browser TTS (`speechSynthesis = 0`)**:
   - `resolveTtsEndpoint()` membaca `window.FIEZEL_TTS_CONFIG.endpoint` (serta fallback `window.parent.FIEZEL_TTS_CONFIG` saat dimuat di dalam iframe `index.html`), dengan pemanasan awal (`warmUpVoiceServices()`), *keep-alive* berkala, pra-render kalimat pembuka skenario di memori, dan *retry* otomatis hingga 3 kali dengan anggaran *cold-start* `12000ms`.
   - Seluruh pemanggilan `window.speechSynthesis` / `SpeechSynthesisUtterance` dihapus tuntas dari `features/voice-studio/src/App.tsx` (terverifikasi `0` kemunculan pada bundel produksi `dist/voice-studio.js`).

2. **Integrasi Partner Percakapan AI Produksi (`conversation_turn` di Cloudflare Worker `fiezel-api`)**:
   - `requestAiPartnerReply()` menerbitkan cookie identitas anonim (`POST /api/auth/anon` dengan `credentials: 'include'`) lalu memanggil `POST https://api.fiezel.my.id/api/ai/task` (`schema: 'fiezel-ai-task-v2'`, `task: 'conversation_turn'`) dengan riwayat percakapan kontekstual, bahasa target (`en`/`ja`), level CEFR/JLPT, dan peran skenario (`CONVERSATION_ROLES`).
   - Evaluasi tata bahasa, deteksi miskonsepsi, serta pencatatan telemetri Braincore BKT & IRT 3PL (`evaluateUtteranceClientSide` + `recordSpeakingAttempt`) tetap berjalan 100% deterministik dan bebas halusinasi.

3. **Pemutar Ganda Anti-Blokir Autoplay (Gesture-Primed HTMLAudio + Web Audio API) & Pengerasan Mikrofon Live**:
   - Ketukan pertama pengguna membuka kunci satu elemen `<audio>` persisten sekaligus mengaktifkan `AudioContext` (`ttsAudioCtxRef`). Jika `audio.play()` ditahan peramban di tengah giliran *hands-free*, MP3 Neural yang sama langsung didekode melalui `ctx.decodeAudioData()` dan diputar lewat `AudioBufferSourceNode` (tetap 100% suara neural, bebas suara robot).
   - `startLiveCall()` langsung menghangatkan izin mikrofon pada saat ketukan tombol **Telepon Live**, menangani duplikasi transkrip progresif Chrome Android, dan menampilkan pesan diagnostik yang jelas apabila mikrofon diblokir peramban.

## 3. Bukti Pengujian Empiris Dua Arah (Playwright Headless Chromium)

Skrip probe: `tools/dev/mitra-kaiwa-live-voice-ai-probe.mjs`

### Sebelum Perbaikan (Produksi `m025-633`)
- `POST https://fiezel.my.id/api/tts/line` -> `404 Not Found` (2x)
- `speechSynthesis.speak()` (suara robot browser) -> `2` pemanggilan
- Panggilan ke `/api/ai/task` -> `0` (balasan template kaku)
- Verdict: `neural TTS audible: FAIL`, `real AI reply: FAIL`

### Sesudah Perbaikan (`m025-635`)
- Terverifikasi pada skenario Bahasa Inggris (`en`) dan Bahasa Jepang (`ja`):
  - `POST https://fiezel-apps.onrender.com/api/tts/line` -> `200 OK` (MP3 Neural diputar >= 2 kali per sesi: sapaan pembuka + balasan AI)
  - `speechSynthesis.speak()` -> `0` pemanggilan (`zero robot voice: PASS`)
  - `POST https://api.fiezel.my.id/api/auth/anon` -> `200 OK` & `POST https://api.fiezel.my.id/api/ai/task` -> `200 OK` (`real AI reply: PASS`)

## 4. Daftar Berkas yang Disentuh

- `features/voice-studio/src/lib/liveTransport.ts` — Resolver `FIEZEL_TTS_CONFIG` & parent iframe, `warmUpVoiceServices()`, `ensureLearnerIdentity()`, `requestAiPartnerReply()` ke Worker `conversation_turn`, retry & timeout neural TTS.
- `features/voice-studio/src/App.tsx` — Eliminasi total `speechSynthesis`, pemutar neural ganda (`HTMLAudioElement` + `AudioContext.decodeAudioData`), pra-render kalimat pembuka, pemanasan izin mikrofon saat klik *Telepon Live*, dan penanganan error `SpeechRecognition`.
- `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css` — Bundel produksi hasil kompilasi ulang Vite.
- `tools/dev/mitra-kaiwa-live-voice-ai-probe.mjs` — Skrip probe Playwright dua arah (EN & JA) untuk verifikasi suara neural, nol suara robot, dan balasan AI nyata.
- `tests/snapshots/id-golden-snapshot.json` — Pembaruan snapshot literal Indonesia pasca-kompilasi bundel Voice Studio.
- Berkas Hexa-Sync rilis `m025-635` (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`).

## 5. Status Kelulusan Gerbang Mutu Lokal & Catatan Utang Teknis

- `node tests/voice-studio-ui-architecture-test.js` — **PASS (5/5)**
- `node tests/kawan-bicara-neural-voice-test.js` — **PASS (100%, synthTouched = 0)**
- `node tests/interactive-chat-test.js` — **PASS (11/11)**
- `node tests/voice-call-two-way-test.js` — **PASS (6/6)**
- `node tests/secret-scan-test.js` — **PASS (46/46, 0 temuan)**
- `node tests/id-golden-snapshot-test.js` — **PASS**
- `node tests/th-ui-leak-test.js` — **PASS**
- `node tests/curriculum-cache-version-test.js` — **PASS**
- `node tests/gate-registry-test.js` — **PASS**
- `node tools/bump-build.mjs --check` — **Selaras (6 titik)**

Catatan teknis: Worker produksi `api.fiezel.my.id` saat ini belum mengaktifkan field opsional `mode: 'call'` pada skema `CONVERSATION_INPUT`; `requestAiPartnerReply()` telah dilengkapi *graceful schema negotiation* otomatis yang menurunkan field opsional tersebut bila ditolak `400 invalid_input` dan mengingat kapabilitas server selama sesi berlangsung.
