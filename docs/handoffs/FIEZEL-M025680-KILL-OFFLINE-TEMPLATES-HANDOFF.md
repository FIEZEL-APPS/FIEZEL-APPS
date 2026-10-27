# FIEZEL Handoff Dossier: m025-680
## Eliminasi Total Template Cadangan Offline Kawan Bicara (Voice Studio Online-Only AI Invariant)

---

### 1. Ringkasan Temuan Audit & Alasan Perubahan
- **Keluhan Pengguna**:
  Pengguna mendapati bahwa bantuan jawaban pada fitur Kawan Bicara (Mitra Kaiwa) tidak realtime, melainkan menyajikan kartu template statis dari skenario offline ("Cadangan Offline" / "Mode offline · kalimat latihan, bukan AI"). Pengguna menginstruksikan dengan tegas:
  > "ADUH INI FATAL SIH, BANTUAN JAWABANNYA TIDAK REALTIME, DAN JAWABANYA TEMPLETE DARI OFLINE, MATIKAN SELURUH PROSES OFFLINE, KARENA FITUR KAWAN BICARA INI, HANYA DI PERUNTUNKAN BAGI YANG MAU MENCOBA ONLINE ATAU KHUSUS ONLINE"
- **Akar Masalah Sistemik**:
  1. Pada `features/voice-studio/src/lib/liveTransport.ts`, fungsi `requestRealtimeCopilotAssist` memiliki langkah Step 3 yang memanggil `getBeginnerReplyCards(...)` saat endpoint jaringan lambat atau terpotong, menyuntikkan template statis dengan flag `isOfflineFallback: true` dan `source: 'offline-fallback'`.
  2. Pada `resolveAiReply`, kegagalan partner AI juga mengalirkan `localResult.nextSuggestedReplies` sebagai `offlineCards` dengan label `replySource: 'offline-template'`.
  3. Pada `evaluateTurnLocal`, modul penilaian tata bahasa lokal menyisipkan template statis melalui `getBeginnerReplyCards`.
  4. Komponen `BeginnerAnswerAssistant.tsx` merender badge "Cadangan Offline" / "ออฟไลน์" dan label HUD "Mode offline · kalimat latihan, bukan AI" yang memalsukan interaksi kecerdasan buatan.

---

### 2. Tindakan Solusi Teknis & Arsitektural (Online-Only Invariant)
1. **Pemutusan Total Step 3 Fallback di `requestRealtimeCopilotAssist`**:
   - Menghapus pemanggilan `getBeginnerReplyCards` secara permanen dari pipeline bantuan jawaban.
   - Mengubah tipe `RealtimeCopilotAssistResult.source` menjadi murni `'ai-realtime'`.
   - Mengoptimalkan pembacaan kunci Gemini pribadi murid (`fz_gemini_api_key`, `gemini_api_key`, `GEMINI_API_KEY`) dengan jalur cepat (`gemini-3-flash-preview` sub-second) sebelum failover ke 16-key server pool.
   - Jika jaringan mati atau server AI tidak dapat dihubungi, sistem mengembalikan daftar kosong (`replies: []`) dan status transparan "Menghubungkan AI realtime...", BUKAN memalsukan jawaban lewat template statis.
2. **Pembersihan `resolveAiReply` & `evaluateTurnLocal`**:
   - Menghapus `replySource: 'offline-template'` dari seluruh model data (`voiceCall.ts` dan `liveTransport.ts`).
   - Pada `evaluateTurnLocal`, kolom `nextSuggestedReplies` disetel ke array kosong `[]`.
   - Jika terjadi gangguan koneksi mendadak pada `resolveAiReply`, karakter lawan bicara meminta murid mengulang secara natural lisan ("すみません、電波が少し途切れました。もう一度お話しいただけますか？" / "Sorry, the line glitched for a second. Could you say that again?") dengan sintesis audio neural, tanpa kartu template fiktif.
3. **Penyempurnaan Teleprompter UI `BeginnerAnswerAssistant.tsx`**:
   - Menghapus logika `isOfflineCard`, badge "Cadangan Offline", dan status `offline-fallback`.
   - Menampilkan status badge biner yang jujur: `Meracik AI...` (animasi kuning berdenyut) saat generasi sedang berlangsung, dan `AI Realtime · Spontan` (hijau aktif) saat kartu siap.
4. **Pencegahan Silang Offline di `App.tsx`**:
   - Menyaring seluruh saran balasan masuk murni untuk kartu `c.isRealtimeAi === true && !c.isOfflineFallback`.
   - Menghapus badge HUD "Mode offline · kalimat latihan, bukan AI".
   - Menambahkan event listener `offline` / `online` peramban untuk menampilkan peringatan eksplisit: *"Kawan Bicara membutuhkan koneksi internet aktif untuk percakapan AI realtime."*

---

### 3. Bukti Verifikasi Empiris Playwright & Mutu Lokal
- **Probe Headless Playwright**:
  - `node tools/dev/probe-kawan-bicara-realtime-copilot.mjs`:
    * Generasi Copilot Bahasa Jepang (390×844) terbukti 100% realtime AI (`data-copilot-source="ai-realtime"`).
    * Nol template statis (terkonfirmasi bersih dari "ホットコーヒー").
    * Telemetri Braincore BKT/IRT `fiezel-braincore-voice-v1` tercatat valid (2 gilir bicara, 12 kompetensi).
    * Anti-Leak Exam Purity terbukti menyembunyikan panel Copilot secara penuh.
    * Status: `✅ PROBE EMPIRIS KAWAN BICARA REALTIME AI COPILOT LULUS 100%`.
  - `node tools/dev/probe-voice-pacing-anti-glitch-vad.mjs`:
    * Lulus 100% untuk pacing 0.88x, zero-glitch jitter buffer, acoustic echo suppression, dan VAD 3.2s-4.5s.
- **Gerbang Mutu Lokal**:
  - `node tests/th-ui-leak-test.js`: PASS (4501 kunci teruji).
  - `node tests/curriculum-cache-version-test.js`: PASS (build m025-680 selaras di 3 halaman).
  - `node tests/gate-registry-test.js`: PASS (396 gerbang bukti selaras).
  - `node tests/id-golden-snapshot-test.js`: PASS (baseline diperbarui selaras bundle m025-680).
  - `node tools/bump-build.mjs --check`: PASS (Hexa-Sync selaras penuh pada build `m025-680`).

---

### 4. Daftar Berkas yang Disentuh
1. `features/voice-studio/src/types/voiceCall.ts`: Pembersihan `'offline-template'` dari `CallTurn.replySource`.
2. `features/voice-studio/src/lib/liveTransport.ts`: Eliminasi `getBeginnerReplyCards`, Step 3 fallback, dan perutean kartu online murni.
3. `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx`: Pembersihan badge offline dan penyelarasan teleprompter AI realtime.
4. `features/voice-studio/src/App.tsx`: Pembersihan status `offline-fallback`, filtrasi kartu realtime AI, dan penambahan notifikasi internet aktif.
5. `features/voice-studio/dist/voice-studio.js`: Hasil kompilasi bundel produksi Vite v6.4.5.
6. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: Hexa-Sync versi build resmi `m025-680`.
7. `id-golden-baseline.json`, `reports/th-ui-leak-report.json`: Pembaruan baseline snapshot emas Indonesia.
