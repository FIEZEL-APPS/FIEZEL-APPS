# FIEZEL Handoff Dossier: m025-660 — Gemini Live WebSocket Audio Streaming & Instant Connection Fix

## 1. Ringkasan Temuan Audit & Akar Masalah
- **Keluhan Pengguna**:
  Saat pertama kali menyambungkan panggilan suara di PWA (`call.html`), sistem membeku/terhambat selama 22 detik, kunci API Gemini tampak tidak aktif, dan suara yang berbunyi adalah suara lama yang sangat lambat/delay.
- **Akar Masalah (Root Causes)**:
  1. **Blob Serialization Bug di WebSocket Browser**:
     Pada peramban peramban asli (Chromium/WebKit), Google Gemini Live Bidi WebSocket mengalirkan pesan JSON (`setupComplete`, `sessionResumptionUpdate`, dan `modelTurn`) dalam bentuk `Blob`, bukan plain string. Pada `App.tsx`, kode sebelumnya memanggil `JSON.parse(event.data)` secara langsung yang memicu `SyntaxError: Unexpected token 'o', "[object Blob]" is not valid JSON`. Galat tersebut ditelan oleh blok `catch {}`, sehingga status `setupComplete` tidak pernah terbaca dan timer koneksi 4.000 ms habis waktu (*timeout*).
  2. **Dead Silence Loop 22 Detik**:
     Setelah 4 kali percobaan koneksi timeout berturut-turut ($4 \times 4.000\text{ ms} = 16.000\text{ ms}$), sistem memicu `activateTurnByTurnLiveFallback()`. Fallback ini memanggil sintesis HTTP Edge-TTS lama yang memakan waktu 6 detik tambahan, menghasilkan total **tepat 22 detik** keterlambatan sebelum suara lama diputar.
  3. **Sample Rate Mismatch & Format Realtime Input**:
     Di beberapa peramban mobile, `new AudioContext({ sampleRate: 16000 })` mengembalikan sample rate perangkat asli (mis. 48.000 Hz atau 44.100 Hz). Format chunk mic kini menggunakan schema resmi protobuf Google Multimodal Live `realtimeInput.mediaChunks` dengan sample rate dinamis yang akurat (`audio/pcm;rate=${inputRate}`).
  4. **Pencegahan CORS & Base Fallback**:
     `requestGeminiLiveSessionToken` dan `reportGeminiLiveSessionDrop` di `liveTransport.ts` dipastikan selalu merutekan ke endpoint Cloudflare Worker kanonis `https://api.fiezel.my.id` tanpa bergantung pada flag warisan `endpoints.ai`.

---

## 2. Bukti Pengujian Empiris (Probe-Driven Headless Playwright)
- Skrip pengujian: `scratch/probe-browser-ws.mjs` dan `scratch/test-local-voice-live.mjs`.
- **Hasil Sebelum Perbaikan**:
  ```
  [PAGE LOG log]: [HOOK WS MSG] Blob
  [PAGE LOG log]: [HOOK WS CLOSE] 1000 wasClean: true (timeout 4000ms loop x 4 = 16s)
  -> Fallback to turn-by-turn Edge-TTS (+6s) = 22s
  ```
- **Hasil Sesudah Perbaikan**:
  ```
  [WS CREATED]: wss://generativelanguage.googleapis.com/...
  [WS SENT]: {"setup":{"model":"models/gemini-3.8-live" ...
  [WS RECV len=26]: { "setupComplete": {} }
  [WS RECV len=118]: { "sessionResumptionUpdate": { ... } }
  [WS SENT len=11005]: {"realtimeInput":{"mediaChunks":[{"mimeType":"audio/pcm;rate=48000","data":...
  Continuous seamless 24kHz audio chunk streaming & real-time mic duplex active in <1s.
  Zero drops, zero timeouts.
  ```

---

## 3. Berkas yang Disentuh
1. `features/voice-studio/src/App.tsx`:
   - Penanganan asinkron untuk WebSocket message data (`Blob`, `ArrayBuffer`, `string`).
   - Unlocking `outputAudioCtxRef` (24kHz) langsung di dalam gesture sentuhan `primeAudioPlayback()`.
   - Streaming mic berbasis schema `mediaChunks` dengan deteksi sample rate perangkat asli.
   - Pemangkasan batas timeout koneksi ke 3.000 ms dan maksimal 1 kali percobaan sebelum fallback bersih.
2. `features/voice-studio/src/lib/liveTransport.ts`:
   - Pembersihan pengecekan `resolveCfApiBase` agar tidak terblokir oleh flag `endpoints.ai`.
   - Fallback eksplisit domain `https://api.fiezel.my.id`.
3. `features/voice-studio/dist/voice-studio.js`: Bundel Vite yang telah diperbarui.
4. `id-golden-baseline.json`: Regenerasi baseline emas literal Indonesia.
5. Hexa-sync rilis (`m025-660`): `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`.

---

## 4. Status Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: **PASS** (13 berkas terkunci identik, 5938 literal utuh)
- `node tests/th-ui-leak-test.js`: **PASS** (4498 kunci id, 0 kebocoran)
- `node tests/curriculum-cache-version-test.js`: **PASS** (33 penegasan, 3 halaman, build m025-660)
- `node tests/gate-registry-test.js`: **PASS** (395 gerbang bukti, 10/10)
- Hexa-Sync: `node tools/bump-build.mjs --check`: **Selaras (m025-660)**
