# Berkas Serah Terima: FIEZEL m025-663 — Panggilan Suara AI Live 100% Hands-Free & Stream Mikrofon Dua Arah

Tanggal: 24 Oktober 2026
Penyusun: Antigravity AI
Cakupan: `features/voice-studio/`, `call.html`, Hexa-Sync `m025-663`

---

## 1. Ringkasan Temuan Audit & Solusi

### A. Gejala yang Dikeluhkan Pengguna
1. Panggilan Live Gemini Multimodal tidak berbicara secara otomatis saat tersambung.
2. Pengguna harus mengklik tombol "Bicara" secara manual setelah telepon tersambung.
3. Saat tombol "Bicara" ditekan, alur terputus dan suara jatuh ke Edge-TTS lama yang patah-patah dengan jeda lama.

### B. Akar Masalah Sistemik
1. **Kegagalan Sapaan Pembuka AI (`turnsRef.current.length === 0`)**:
   State `turns` diinisialisasi secara bawaan dengan 1 entri (kalimat situasi pembuka skenario). Akibatnya, `turnsRef.current.length === 0` selalu bernilai `false`, sehingga instruksi sapaan awal ke WebSocket Gemini Live tidak pernah terkirim. Gemini terdiam menunggu masukan murid, sementara murid terdiam menunggu suara AI.
2. **Pemblokiran Izin Mikrofon & AudioContext pada Peramban Ponsel**:
   Sebelumnya, inisialisasi `navigator.mediaDevices.getUserMedia` dan `new AudioContext` dieksekusi secara asinkron di dalam callback `ws.onmessage`. Di iOS Safari dan Android Chrome, peramban memblokir aktivasi audio hardware yang tidak berada langsung di dalam rantai gesture pengguna (`onClick`).
3. **Ketidakcocokan Frekuensi Sampel Mikrofon (Hardware vs Gemini Live)**:
   Hardware mikrofon menangkap pada 44.1kHz / 48kHz, sedangkan Gemini Multimodal Live API mewajibkan PCM16 pada 16kHz (`audio/pcm;rate=16000`).
4. **Kebingungan Tombol PTT di Bilah Bawah (Bottom Dock)**:
   Saat `isLiveConnected === true`, bilah bawah masih menampilkan tombol PTT ("Bicara"). Ketika pengguna mengklik tombol tersebut karena menyangka harus menekan untuk bicara, sistem mengeksekusi `startPttRecording()` (pengenal suara peramban) dan beralih ke fallback HTTP lama (Edge-TTS).

---

## 2. Perubahan Teknis yang Diterapkan

1. **Inisialisasi Hardware Audio Langsung pada User Gesture (`startLiveCall`)**:
   - `outputAudioCtxRef` (24kHz) dan `inputAudioCtxRef` langsung dibuat dan di-`resume()` saat pengguna mengetuk tombol "Telepon Live".
   - Aliran mikrofon (`getUserMedia`) ditangkap dan dihubungkan ke `ScriptProcessorNode` secara langsung tanpa jeda.
2. **Resampling Linier PCM16 16kHz (`resampleAndConvertToPcm16Base64`)**:
   - Menambahkan fungsi konversi dan interpolasi frekuensi sampel di `features/voice-studio/src/lib/liveTransport.ts`.
   - Mengalirkan potongan audio mikrofon berkecepatan 16kHz secara murni ke Gemini WebSocket.
3. **Koreksi Logika Sapaan Pembuka AI**:
   - Mengubah kondisi dari `turnsRef.current.length === 0` menjadi `!hasUserSpoken` (`!turnsRef.current.some(t => t.speaker === 'user')`).
   - Sesaat setelah `setupComplete`, sistem langsung mengirimkan instruksi pembuka ke Gemini Live, dan AI langsung bersuara dalam < 500ms.
4. **Bilah Bawah Khusus Hands-Free Saat Mode Live Terhubung**:
   - Tombol PTT "Bicara" digantikan oleh indikator tombol `🟢 Hands-Free` dengan animasi denyut hijau.
   - Mengklik tombol ini berfungsi sebagai toggle bisukan mikrofon (`toggleMuteMic()`) atau menyela AI (`interruptAiAndStartListening()`), bukan lagi memicu PTT legacy.
   - Status panggilan menampilkan `"Mendengarkan kamu... (00:05)"` saat mikrofon aktif.
5. **Pembersihan Sumber Daya Audio Saat Menutup Panggilan (`stopLiveCall`)**:
   - Menghentikan seluruh trek mikrofon (`track.stop()`), memutuskan node prosesor audio, dan menutup `inputAudioCtxRef`.

---

## 3. Hasil Verifikasi Mutu & Pengujian

- `node tests/id-golden-snapshot-test.js`: **HIJAU** (baseline emas Indonesia utuh)
- `node tests/th-ui-leak-test.js`: **HIJAU** (nol kebocoran naskah)
- `node tests/curriculum-cache-version-test.js`: **HIJAU** (33 penegasan, build `m025-663`)
- `node tests/gate-registry-test.js`: **HIJAU** (10 pass, 0 fail)
- `node tools/bump-build.mjs --check`: **Selaras** (6 titik Hexa-Sync tepat pada `m025-663`)
