# FIEZEL HANDOFF: m025-658 Multi-Key Gemini Live Pool & Mid-Call Failover

## 1. Ringkasan Eksekutif & Temuan Audit
- **Tujuan**: Memungkinkan panggilan suara dua arah (duplex voice call) real-time bebas jeda seperti ChatGPT Voice dengan memanfaatkan seluruh 16 Gemini API Key yang disetor pengguna ke dalam sebuah pool rotasi mandiri tanpa hambatan.
- **Kondisi Sebelumnya**: Panggilan suara langsung (Gemini Live) hanya mengandalkan kunci personal murid di `localStorage` atau proxy tunggal, yang rentan terhadap limit kuota (HTTP 429) dan batas TPM per menit (WebSocket close 1011).
- **Hasil Solusi**:
  1. **16-Key Centralized Vault**: Seluruh 16 API key divalidasi 100% dan disimpan terpusat di Cloudflare Worker secret `GEMINI_LIVE_KEYS`. Kunci asli murid **TIDAK PERNAH** bocor ke peramban frontend.
  2. **Worker Minting & Cooldown Arbiter**: Endpoint `POST /api/voice/live-session` mendistribusikan lalu lintas secara merata (*uniform load balancing*) dengan rotasi round-robin dan menerapkan isolasi cooldown 65 detik otomatis untuk setiap kunci yang menyentuh batas kuota/rate-limit.
  3. **Zero-Loss Mid-Call Auto-Failover**: Endpoint `POST /api/voice/report-drop` menerima laporan drop mid-call dari frontend (`ws.onclose` tak terduga / 1011). Frontend secara otomatis meminta token baru dari kunci sehat berikutnya dalam pool dan menyambung ulang dalam hitungan milidetik tanpa memutus riwayat percakapan.
  4. **Braincore Authority & Zero-Dumbing Invariant Terjaga Penuh**: Setiap giliran bicara murid di Gemini Live dievaluasi secara lokal oleh Braincore Engine (`recordSpeakingAttempt`), memperbarui theta/BKT, dan menyinkronkan telemetri secara jujur tanpa rekayasa data.
  5. **Safety Net Jalur Cadangan**: Jika seluruh 16 kunci habis atau offline, sistem otomatis mengalihkan sesi ke Turn-by-Turn fallback (Sensei Nanami) tanpa memunculkan layar galat.

---

## 2. Bukti Pengujian Empiris & Stress Test
- **Uji Kuota Empiris 1 Kunci**:
  - Durasi: 18,4 menit pengujian konkuren 4 saluran suara Keita (30 kalimat nyata).
  - Total panggilan: 92 sesi.
  - Total turn berhasil: 387 giliran.
  - Total token terkonsumsi: 560.966 token.
  - Latensi respons audio: P50 495ms (min 223ms, P90 923ms).
  - Bukti laporan lengkap: `scratch/live-stress/REPORT.md`.
- **Uji Rotasi Worker Produksi**:
  - `curl -X POST https://api.fiezel.my.id/api/voice/live-session`: Berhasil mencetak `auth_tokens/...` untuk model `gemini-3.8-live` dengan rotasi berurutan (contoh: `keyIndex: 13` -> `keyIndex: 14`).
  - `Invoke-RestMethod /api/voice/report-drop`: Menerima laporan kuota dan menggeser pointer pool dengan `shifted: true, isQuota: true`.

---

## 3. Berkas yang Diubah / Ditambahkan
1. `workers/api/voice/route-voice-live.js` (Baru): Handler minting ephemeral auth token 16 kunci, tracking status cooldown per instance, dan failover drop reporter.
2. `workers/api/schema.js`: Menambahkan limit ukuran payload untuk `/api/voice/live-session` (1024B) dan `/api/voice/report-drop` (2048B).
3. `workers/api/route-slots.js`: Mendaftarkan SLOT 14 untuk rute Gemini Live pool.
4. `features/voice-studio/src/lib/liveTransport.ts`: Menambahkan klien `requestGeminiLiveSessionToken` dan `reportGeminiLiveSessionDrop`.
5. `features/voice-studio/src/App.tsx`:
   - Integrasi auto-token minting pada `startLiveCall`.
   - Streaming mikrofon 16kHz PCM16 dan pemutaran audio 24kHz PCM16.
   - Deteksi barge-in `serverContent.interrupted`.
   - Transkripsi real-time dan evaluasi Braincore lokal pada `serverContent.turnComplete`.
   - Auto-reconnect mid-call pada `ws.onclose` tak terduga dengan failover ke kunci pool berikutnya.
   - Penanganan input teks via `clientContent` terstandarisasi.
6. `features/voice-studio/dist/*`: Hasil build bundel produksi voice studio.
7. `id-golden-baseline.json`: Pembaruan baseline snapshot literal Indonesia pasca-build bundel baru.
8. Hexa-sync build bump `m025-658` (`sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json`, `kurikulum.html`, `misi.html`, `call.html`).

---

## 4. Status Mutu & Kelulusan Gerbang Mutu Lokal
- `node tests/cf-wiring-test.js`: 117/117 checks PASS (100%).
- `node tests/id-golden-snapshot-test.js`: PASS (5938 literal emas utuh).
- `node tests/curriculum-cache-version-test.js`: PASS (33 penegasan, 3 halaman, m025-658).
- `node tests/gate-registry-test.js`: PASS (10 pass, 0 fail).
- `node tests/th-ui-leak-test.js`: PASS (0 kebocoran UI Thai).
- `node tools/bump-build.mjs --check`: PASS (Hexa-Sync selaras m025-658).
