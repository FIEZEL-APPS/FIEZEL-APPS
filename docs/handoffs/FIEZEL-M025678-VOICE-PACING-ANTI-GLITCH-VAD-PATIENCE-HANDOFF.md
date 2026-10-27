# FIEZEL HANDOFF DOSSIER: M025-678 — KALIBRASI TEMPO BICARA, ANTI-GLITCH JITTER BUFFER, DAN VAD JEDA BERPIKIR

**Tanggal**: 2026-10-27
**Nomor Build**: `m025-678`
**Cakupan**: `features/voice-studio` (Kawan Bicara / Mitra Kaiwa)
**Tipe**: Perbaikan Kualitas & UX Interaksi Suara Lisan (Voice UX & Engine Calibration)

---

## 1. Ringkasan Temuan Audit & Keluhan Murid

Berdasarkan ulasan langsung murid saat berlatih di fitur Kawan Bicara:
> *"udah aku coba, jadi aga gimana ya, dai tuh agak cepet gitu sih ngomongnya tuh, terus kadang agak nge glitch gitusuaranya, agak tabrakan gitu suaranya, terus aku belum selesai ngomong tuh tiba tiba udah terkirim gitu, itu aja sih menurutku"*

Ditemukan 4 akar masalah teknis pada pipeline audio dan pengenalan suara:
1. **Tempo Bicara Terlalu Cepat (Native Speed)**:
   - Gemini Live WebSocket setup frame sebelumnya tidak menyertakan instruksi pembatasan tempo (*pacing directive*), sehingga model melontarkan ujaran dengan kecepatan cepat asli penutur asli (~350 mora/menit), membuat pembelajar pemula/menengah kewalahan menyimak partikel kalimat.
   - Pilihan kecepatan di antarmuka sebelumnya default di `1.0x` (bukan kecepatan nyaman pembelajar).
2. **Suara Nge-Glitch / Clicks & Stutter**:
   - Pemutaran chunk audio PCM 24kHz dari Gemini Live dijadwalkan secara instan tanpa lead buffer (`Math.max(ctx.currentTime, nextStartTimeRef.current)`). Sedikit saja terjadi jitter paket jaringan seluler (10-30ms), terjadi jeda hening mikro (*buffer underrun gap*). Peralihan waveform tanpa ramp memicu letupan DC (*clicks/pops*).
   - `isPlayingAiAudio` seketika menjadi `false` setiap kali antrean audio kosong beberapa milidetik antar paket, memicu flip-flop status yang menyalakan dan mematikan mikrofon secara liar di tengah kalimat.
3. **Tabrakan Suara (Voice Collision & Echo Leak)**:
   - Callback mikrofon `handleMicPcmData` sebelumnya terus mengalirkan audio mikrofon ke WebSocket Gemini Live bahkan ketika AI sedang aktif berbicara melalui speaker perangkat.
   - Suara AI dari speaker ponsel/laptop diserap mikrofon dan dikirim balik ke server. Gemini Live mendeteksi suara masuk ini sebagai interupsi murid (false barge-in), memotong ucapannya sendiri, atau memicu tabrakan suara ganda.
4. **Terpotong Prematur Sebelum Selesai Bicara (VAD Silence Threshold Terlalu Agresif)**:
   - Batas hening `silenceWaitMs` sebelumnya hanya 1600ms (dan 2200ms bila tidak lengkap).
   - Murid bahasa asing yang sedang bernapas atau mengingat kata (seperti *"ええと、私は..."*) terpotong seketika setelah jeda hening 1.6-2.2 detik.
   - Event peramban `rec.onend` pada peramban Chromium/Android yang tertutup tiba-tiba langsung memaksa pengiriman teks yang belum tuntas.

---

## 2. Solusi Teknis & Arsitektur Perbaikan

### A. Kalibrasi Tempo & Pacing Directive (0.85x / 0.92x / 1.0x)
- Default `speechRate` disetel ke `0.88x` (tempo ideal pembelajar).
- Tombol kecepatan mendukung 3 tahap siklus: `0.85x` (Santai & Jelas) -> `0.92x` (Sedang) -> `1.0x` (Normal).
- Diinjeksikan `[MANDATORY PACING & ENUNCIATION FOR LEARNER]` pada setup frame Gemini Live WebSocket, menginstruksikan model untuk berbicara secara tenang, jelas, dan mengartikulasikan setiap partikel (は, が, を, に, で) dengan jeda nafas antar klausa.

### B. Anti-Glitch Jitter Buffer (120ms Safety Lead + 3ms Ramp + 300ms Playout Tail)
- Saat pemutaran audio dimulai dari kondisi diam (*idle*), dijadwalkan *lead buffer* 120ms (`nextStartTimeRef.current = now + 0.12`). Seluruh paket audio jaringan tersambung mulus tanpa celah *underrun*.
- Ditambahkan *micro-gain ramp* 3ms linear pada awal dan akhir buffer untuk meniadakan letupan zero-crossing (*click-free audio*).
- Status `isPlayingAiAudioRef` menggunakan *debounce tail* 300ms, mencegah *flapping* status sebelum seluruh gelombang ujaran AI benar-benar selesai.

### C. Acoustic Echo Suppression & Anti-Collision Guard
- Pada `handleMicPcmData`: Saat `isPlayingAiAudioRef.current === true`, aliran suara mic yang berada di bawah ambang interupsi wajar (`rms <= 0.085`) sepenuhnya diredam dan TIDAK dikirim ke server.
- Aliran hanya diteruskan jika murid sengaja menyela/berbicara lantang (`rms > 0.085`), yang seketika memicu `interruptAiAndStartListening()` untuk mematikan audio AI secara haptik.
- Menghilangkan 100% loop umpan balik speaker-to-mic dan tabrakan suara.

### D. VAD Jeda Berpikir (Silence Patience 3.2s Baseline / 4.5s Incomplete)
- Baseline waktu hening dinaikkan dari 1.6s menjadi **3.2 detik** (3200ms).
- Untuk kalimat yang belum lengkap atau diakhiri kata pengisi jeda berpikir (*fillers* seperti `ええと`, `あの`, `その`, `んー`, `まあ`, `うーん`, dsb.), durasi hening diperpanjang menjadi **4.5 detik** (4500ms).
- Pada `rec.onend`: Peramban dilarang keras mengirimkan kalimat parsial secara prematur. Teks yang telah terkumpul dipindahkan ke `speechPrefix`, pengenalan suara direstart seketika, dan pengiriman HANYA terjadi bila timer hening benar-benar habis atau murid mengetuk tombol *"Kirim Sekarang"*.
- Status antarmuka secara transparan menampilkan: *"Mochi mendengarkan... (jeda berpikir)"* dengan animasi visual.

---

## 3. Bukti Pengujian Empiris (Empirical Verification)

1. **Uji Khusus Invarian Voice UX**:
   - Skrip: `node tools/dev/probe-voice-pacing-anti-glitch-vad.mjs`
   - Hasil: **6/6 Uji Lulus 100%** (Pacing calibration, Gemini Live directive, Jitter buffer lead, Acoustic echo suppression, VAD patience 4.5s, Zero forbidden claims).
2. **Uji Playwright Headless Realtime Copilot**:
   - Skrip: `node tools/dev/probe-kawan-bicara-realtime-copilot.mjs`
   - Hasil: **LULUS 100%** (Dynamic turns ramen JA/EN, zero layout overlap, telemetry Braincore tercatat).
3. **Uji Arsitektur UI & Lifecycle**:
   - Skrip: `node tests/voice-studio-ui-architecture-test.js`
   - Hasil: **5/5 LULUS 100%**.
4. **Gerbang Mutu Standar**:
   - `node tests/id-golden-snapshot-test.js`: **HIJAU** (baseline emas utuh).
   - `node tests/th-ui-leak-test.js`: **PASS** (nol kebocoran).
   - `node tests/curriculum-cache-version-test.js`: **PASS** (m025-678 selaras 33 penegasan).
   - `node tests/gate-registry-test.js`: **PASS** (10 pass, 0 fail).

---

## 4. Daftar Berkas yang Disentuh

- `features/voice-studio/src/App.tsx`:
  - Kalibrasi default `speechRate` 0.88x dan siklus kecepatan 3 tahap.
  - Implementasi jitter buffer 120ms dan micro-gain ramp 3ms.
  - Acoustic echo suppression pada `handleMicPcmData`.
  - Pacing directive pada setup frame Gemini Live WebSocket.
  - VAD silence patience 3.2s / 4.5s dengan proteksi anti-premature-cutoff pada `onend`.
- `features/voice-studio/dist/voice-studio.js` & `dist/voice-studio.css`:
  - Hasil kompilasi bundel produksi Vite.
- `id-golden-baseline.json`:
  - Pembaruan baseline string Indonesia terverifikasi.
- `tools/dev/probe-voice-pacing-anti-glitch-vad.mjs`:
  - Skrip probe otomatis pengujian invarian pacing, anti-glitch, dan VAD.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `kurikulum.html`, `misi.html`, `call.html`:
  - Kenaikan versi Hexa-Sync resmi arbiter ke `m025-678`.
