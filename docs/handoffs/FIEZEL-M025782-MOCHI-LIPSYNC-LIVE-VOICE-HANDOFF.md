# FIEZEL Handoff Dossier — m025-782: Natural 3D Mochi Lipsync, Kawan Bicara Live Audio Continuity, & Mochi Voice SOS

## 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Bekunya Mulut 3D Mochi di Kawan Bicara Live Call (`features/voice-studio/src/App.tsx`):**
   - **Akar Masalah:** Di `ws.onmessage`, setiap potongan (*chunk*) audio PCM Gemini Live (~200ms) memanggil `stopNeuralBufferSource()`, yang secara tak bersyarat memanggil `mochiInstanceRef.current.setTalking(false)`. Pada *chunk* #1, `setAiAudioPlaying(true)` memicu `useEffect` untuk menyalakan `setTalking(true)`. Namun pada *chunk* #2 (200ms kemudian), `stopNeuralBufferSource()` mematikan `setTalking(false)` sementara `isPlayingAiAudioRef.current` sudah bernilai `true` (sehingga `useEffect` tidak pernah terpanggil ulang), membekukan mulut Mochi sepanjang sisa kalimat.
   - **Solusi:** Menambahkan *guard* pada `stopNeuralBufferSource()`, `src.onended`, `settle()`, dan `speakAiText` `finally` agar tidak pernah mematikan `setTalking(false)` selama `isLiveConnectedRef.current` aktif atau `activeSourcesRef.current.length > 0`, serta menjaga `liveAnalyserRef.current` dan `setTalking(true)` tetap aktif sepanjang pemutaran chunk Gemini Live.
2. **Analisis Akustik `WawaLipsyncAnalyzer` Berbasis Linear Time-Domain RMS + Silabel Formant (`mochi-mascot/fiezel-mochi.js`):**
   - **Akar Masalah:** `extractFeatures()` sebelumnya menghitung `feat.rms` dari `getByteFrequencyData()` (skala dB logaritmik), sehingga nilai RMS selalu tinggi selama ada sinyal suara dan mulut tidak pernah menutup antar-suku kata. Selain itu, ekspresi `curr.bi || 0.95` mengevaluasi nilai `bi: 0` menjadi `0.95` pada setiap frame konsonan/jeda.
   - **Solusi:** Menggunakan `getByteTimeDomainData(this.timeDataArray)` untuk amplitudo gelombang linear sejati (`feat.rms`), menambahkan pelacak *envelope* silabel cepat/lambat (`rig.fastRms`, `rig.slowRms`, `rig.peakRms`) dengan katupan konsonan alami (~4.6 Hz), memperbaiki evaluasi bilabial `typeof curr.bi === 'number' ? curr.bi : ...`, serta mengembalikan *shading* 3D Daifuku Mochi (`roughness = 0.28`, `sheen = 0.90`, `sheenColor = 0xFFC4D6`) dan mempertahankan 4 taring demon pada ekspresi `sangat_marah` / `furious_roar`.
3. **Tombol `"Mulai Telepon FaceTime"` di `call.html` (`features/voice-studio/src/App.tsx`):**
   - Mengatur tinggi kartu `<section data-testid="ai-call-card">` menjadi `h-auto min-h-[310px] sm:min-h-[345px] relative z-10 shrink-0` sehingga tombol `[data-testid="facetime-call-switch-btn"]` tidak tertutup oleh kartu terjemahan di bawahnya.
4. **Mochi Voice SOS Sesi Latihan (`features/mascot/fiezel-mochi-voice-sos.js` & `features/mascot/fiezel-mochi-companion.js`):**
   - Menghapus field `clientContent` ganda saat mengirim `{ realtimeInput: { audioStreamEnd: true } }` yang sebelumnya menyebabkan penutupan WebSocket `1007 Invalid value (oneof)`.
   - Menambahkan *prewarm* token sesi Live saat kartu latihan dimuat (`mountCardToggle`) dan *formant vocal-band fallback* pada Silero VAD agar respons suara pengguna langsung tertangkap.
   - Membatasi aksesoris `'teacher'` di `applySessionAccessories` hanya pada sesi `quiz` atau saat panggilan SOS aktif sehingga aksesoris `'headset'` (Listening/Skills Lab) dan `'pencil'` (Writing) tetap terjaga.

## 2. Bukti Pengujian Empiris (Playwright Headless Probes & Unit Suites)
- `node tools/dev/probe-kawan-live-lipsync.mjs`:
  - `talkingSamples: 35`, `maxOpen: 0.81`, `meanOpen: 0.27`, `openCloseTransitions: 21`, visemes: `["viseme_sil", "viseme_U", "viseme_CH", "viseme_SS", "viseme_DD", "viseme_aa", "viseme_I"]`.
- `node tools/dev/verify-mochi-mouth-naturalness.mjs`: PASS 100% (vokal terbuka `0.796`, katupan bilabial `0.041`, kembali ke `0` saat selesai).
- `node tools/dev/verify-mochi-lipsync-perfection.mjs`: PASS 100%.
- `node tests/mochi-voice-sos-test.js`: PASS 27/27 (+ 30/30 FSRS-6 + 36/36 Japanese Conjugator).
- `node tests/test-all-practices-mochi-wire.js`: PASS 100% (JLPT Listening, Quiz, Writing, Skills Lab, Global `pawReact`).

## 3. Daftar Berkas yang Disentuh
- `mochi-mascot/fiezel-mochi.js`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/src/lib/liveTransport.ts`
- `features/voice-studio/src/lib/liveCallHelper.ts`
- `features/voice-studio/dist/voice-studio.js`
- `features/voice-studio/dist/voice-studio.css`
- `features/voice-studio/worker/cloudflare-live-call-worker.js`
- `features/mascot/fiezel-mochi-voice-sos.js`
- `features/mascot/fiezel-mochi-companion.js`
- `features/ui/fiezel-tactile-clay.css`
- `features/brand/fiezel-splash.js`
- `app.js`
- `index.html`
- `call.html`, `kurikulum.html`, `misi.html`, `features/voice-studio/call.html`
- `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json`
- `id-golden-baseline.json`, `reports/th-ui-leak-report.json`

## 4. Status Gerbang Mutu Lokal & Otoritas OWNER / MASTER
- **Otoritas Rilis:** Disetujui di bawah protokol OWNER / MASTER FIEZEL (`m025-782`).
- **Status:** READY FOR PRODUCTION DEPLOY (`100% PASS`).
- `node tools/bump-build.mjs --check`: Selaras (`m025-782`)
- `node tests/id-golden-snapshot-test.js`: PASS
- `node tests/th-ui-leak-test.js`: PASS
- `node tests/curriculum-cache-version-test.js`: PASS
- `node tests/gate-registry-test.js`: PASS

## 5. Langkah Berikutnya (Next Steps / Roadmap)
- Memantau telemetri produksi `https://fiezel.my.id/app/` pasca-deploy `m025-782` untuk latensi prewarm token Gemini Live dan artikulasi viseme Mochi di perangkat mobile murid.
