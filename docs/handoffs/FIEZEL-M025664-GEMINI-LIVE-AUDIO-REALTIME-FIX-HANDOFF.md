# Berkas Serah Terima: FIEZEL m025-664 — Perbaikan Protokol Streaming Mikrofon Gemini Live API

Tanggal: 24 Oktober 2026
Penyusun: Antigravity AI
Cakupan: `features/voice-studio/`, `worker/`, `call.html`, Hexa-Sync `m025-664`

---

## 1. Ringkasan Temuan Audit & Solusi Empiris

### A. Gejala yang Dikeluhkan Pengguna
- Panggilan Live terhubung dan AI menyapa, namun hands-free tidak mendengar suara murid sama sekali.
- Murid tidak bisa berbicara, hanya bisa mengetik teks lewat kolom bawah.

### B. Bukti Empiris & Akar Masalah
Melalui skrip probe `scratch/test-gemini-mic-input.mjs`, kami menguji dua format pengiriman audio PCM16 ke WebSocket Gemini Live API (`GenerativeService.BidiGenerateContentConstrained`):
1. **Format A (Lama - `realtimeInput.mediaChunks`)**:
   ```json
   { "realtimeInput": { "mediaChunks": [{ "mimeType": "audio/pcm;rate=16000", "data": "..." }] } }
   ```
   **Hasil**: Server Gemini **mengabaikan total frame ini**. Transkrip pengguna kosong (`""`), AI audio nol chunks (`0`).
2. **Format B (Baru - `realtimeInput.audio`)**:
   ```json
   { "realtimeInput": { "audio": { "mimeType": "audio/pcm;rate=16000", "data": "..." } } }
   ```
   **Hasil**: Server Gemini **100% mendengar suara**. Transkrip murid langsung terisi (`"すみません、駅はどこですか?"`), dan Gemini membalas secara instan dengan 19 potongan audio PCM24 (`"駅ですね。あちらの改札を出て、右へ進むとすぐですよ。"`).

---

## 2. Perubahan Teknis yang Diterapkan

1. **Pembaruan Protokol `realtimeInput.audio` di `App.tsx`**:
   - Node `ScriptProcessor` mengirimkan bingkai audio dengan payload `realtimeInput.audio` berkecepatan 16kHz PCM16.
   - Penyiapan `inputAudioCtxRef` dilakukan secara sinkron di dalam rantai gesture pengguna sebelum pemanggilan asinkron agar aman pada iOS Safari / Android Chrome.
2. **Penyelarasan di `cloudflare-live-call-worker.js`**:
   - Memperbarui pemetaan proxy WebSocket worker agar menggunakan `realtimeInput.audio`.
3. **Verifikasi E2E Chromium Headless (`scratch/probe-handsfree-e2e.mjs`)**:
   - Disimulasikan panggilan suara nyata di peramban Chromium dengan perangkat mikrofon palsu berisi suara bahasa Jepang.
   - Hasil membuktikan 265 frame audio terkirim, `userTranscript` berhasil menangkap: `"はじめまして。私はリャンです。よろしくお願いします。"`, dan Gemini merespons dengan 58 chunk audio pembicaraan.

---

## 3. Hasil Verifikasi Mutu & Pengujian

- `node tests/id-golden-snapshot-test.js`: **HIJAU** (baseline emas Indonesia utuh)
- `node tests/th-ui-leak-test.js`: **HIJAU** (nol kebocoran naskah)
- `node tests/curriculum-cache-version-test.js`: **HIJAU** (33 penegasan, build `m025-664`)
- `node tests/gate-registry-test.js`: **HIJAU** (10 pass, 0 fail)
- `node tests/voice-studio-ui-architecture-test.js`: **HIJAU** (5/5 pass)
- `node tools/bump-build.mjs --check`: **Selaras** (6 titik Hexa-Sync tepat pada `m025-664`)
