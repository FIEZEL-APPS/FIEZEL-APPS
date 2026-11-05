# FIEZEL HANDOFF DOSSIER: PURE GENERATIVE COPILOT & STREAMING TRANSLATION STABILITY (m025-771)

## 1. Otoritas Rilis & Ringkasan Eksekutif
- **Otoritas**: MASTER & OWNER Authority Mandate (Mandat Tunggal)
- **Nomor Rilis**: `m025-771`
- **Cakupan**: Voice Studio (`features/voice-studio/`), Kawan Bicara AI Voice Studio, Gemini 3.5 Flash Copilot Assist, Live Audio Streaming Subtitle & Translation.
- **Latar Belakang & Masalah**:
  1. *Pembajakan Template Statis (Template Hijacking)*: Pada versi sebelumnya, sistem copilot bantuan jawaban (`1 · Singkat`, `2 · Alami`, `3 · + Tanya Balik`) menampilkan jawaban template/regex yang tidak nyambung ketika AI mengajukan pertanyaan spesifik (contoh: AI bertanya *"Where do you study?"*, bantuan jawabannya *"I'm doing great, how about you?"*).
  2. *Root Cause Template Hijacking*: `App.tsx` sebelumnya memanggil `triggerRealtimeCopilotRef` dengan `{ isDebouncedStreaming: true }` di tengah AI berbicara dan mengisi kartu optimistik fallback dari `buildContextualFallbackCards`. Saat AI selesai berbicara (`turnComplete`), fungsi generative dicegat oleh kondisi `if (lastCopilotAiKeyRef.current === dedupKey && copilotCardsRef.current.length > 0) return;` sehingga prompt generative ke Gemini API **TIDAK PERNAH TERKIRIM**.
  3. *Mutasi & Flicker Terjemahan*: Subtitle AI yang sedang berbicara diterjemahkan secara parsial kata per kata menggunakan regex lokal (`translateAndPhoneticizeLiveText({ syncOnly: true })`), menyebabkan teks terjemahan berganti-ganti dan melompat-lompat sebelum AI selesai berbicara.
  4. *Cloudflare Gateway Worker Stale Deployment*: Endpoint `/api/voice/copilot-assist` sebelumnya mengembalikan HTTP 503 karena worker Cloudflare menjalankan kode lama dengan model usang (`gemini-2.5-flash` 404).

## 2. Solusi & Perubahan Arsitektur
1. **Pemusnahan Total Template Statis (Zero-Template Mandate)**:
   - Menghapus fungsi `buildContextualFallbackCards` dari runtime dan import.
   - Mengubah `triggerRealtimeCopilotForAi`: langsung memunculkan indikator loading shimmer (`"Meracik Jawaban..."` / `"Menyesuaikan bantuan jawaban dengan kalimat yang baru diucapkan partner..."`) dan membersihkan kartu lama.
   - Mengambil bantuan jawaban murni dari Gemini 3.5 Flash via `POST https://api.fiezel.my.id/api/voice/copilot-assist`.
   - Mengabaikan dan memfilter kartu apapun yang memiliki flag `isOfflineFallback: true`.
2. **Sinkronisasi Pasca-Bicara Instan (Post-Speech Trigger)**:
   - Permintaan bantuan jawaban dan terjemahan final dikirim tepat saat AI selesai berbicara (`turnComplete`), dengan waktu respons ~300–600ms.
3. **Stabilisasi Terjemahan Streaming (Zero-Mutation Subtitle)**:
   - Selama AI berbicara (streaming draft, pemutaran audio, atau berpikir), subtitle terjemahan secara konsisten menampilkan `"Sedang memuat terjemahan..."` (atau lokalisasi Thai/Jepang/Mandarin).
   - Terjemahan final diisi secara instan dan utuh setelah AI selesai berbicara tanpa efek melompat atau kata yang bermutasi.
4. **Deploy Cloudflare API Worker**:
   - Menjalankan workflow GitHub Actions `FIEZEL API Worker Deploy` (`deploy-api-worker.yml`) sehingga endpoint live `https://api.fiezel.my.id/api/voice/copilot-assist` aktif melayani Gemini 3.5 Flash dengan status 200 OK.

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)
- **Probe Uji Kawan Bicara Roleplay EN (`tools/dev/probe-voice-copilot-roleplay.mjs`)**:
  - *Turn 1*: Memverifikasi shimmer loading `"Meracik Jawaban..."` aktif seketika saat AI mulai merespons (`audit-roleplay-en-turn1.png`).
  - *Turn 2*: Memverifikasi bahwa terjemahan selama AI berbicara bertuliskan `"Sedang memuat terjemahan..."` tanpa flicker (`audit-roleplay-en-turn2.png`).
  - *Turn 3*: Memverifikasi kartu generatif asli terpasang di DOM (`audit-e2e-generative-copilot.png`):
    - Pertanyaan AI: *"Talk to me for real, what part of English been tripping you up lately?"*
    - Pilihan 1 (Singkat): *"Honestly, I always get confused with past tense verbs."* (Pron: *"O-nes-ti, ai ol-weis get kon-fyusd wit past tens verb."*, Arti: *"Jujur saja, saya selalu bingung dengan kata kerja bentuk lampau."*).
    - Tidak ada template usang atau jawaban menghindar.
- **Verifikasi Multi-Bahasa**:
  - Bahasa Jepang (JA) & Mandarin (ZH) terverifikasi lulus 26 uji relevansi di `tests/voice-copilot-relevance-gate-test.js`.

## 4. Berkas yang Disentuh
1. `features/voice-studio/src/App.tsx`: Refactoring copilot shimmer, eliminasi debounced template cards, isolasi `turnComplete` trigger, dan stabilisasi subtitle.
2. `features/voice-studio/src/lib/liveTransport.ts`: Penandaan `isOfflineFallback`, bypass candidate URL fallback pada 404, dan penghapusan bypass turn pembuka.
3. `features/voice-studio/src/types/voiceCall.ts`: Penambahan metadata copilot status & dynamic board context.
4. `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx`: Dukungan kanvas kontekstual pedagogis multi-mode & kuis anti-spoiling.
5. `features/voice-studio/dist/voice-studio.js` & `voice-studio.css`: Re-bundle Vite produksi.
6. `mochi-mascot/fiezel-mochi.js`: Dynamic Retina Vector Face Engine (6-expression morphing).
7. `tests/secret-scan-test.js`: Pembersihan digest allowlist usang setelah regenerasi baseline emas.
8. `id-golden-baseline.json` & `reports/th-ui-leak-report.json`: Baseline emas terverifikasi 100%.
9. Hexa-sync rilis (`sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `call.html`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json`): Sinkron ke `m025-771`.

## 5. Status Gerbang Mutu (Quality Gates)
- `tests/voice-copilot-relevance-gate-test.js`: **26/26 PASS (100%)**
- `tests/id-golden-snapshot-test.js`: **PASS (Baseline emas utuh)**
- `tests/th-ui-leak-test.js`: **PASS (4751 kunci padanan utuh)**
- `tests/curriculum-cache-version-test.js`: **PASS (33 penegasan, m025-771)**
- `tests/gate-registry-test.js`: **PASS (10/10)**
- `tests/secret-scan-test.js`: **PASS (46/46, 0 temuan)**
- `tools/fiezel-guardians.mjs a10`: **PASS_WITH_RISK_REPORT (0 errors, 0 warnings)**

## 6. Rencana Lanjut & Roadmap Berikutnya (Next Steps)
1. **Langkah Berikutnya (Next Steps)**:
   - Pantau telemetri latency generasi kartu copilot pasca-bicara di production.
   - Evaluasi responsivitas Gemini 3.5 Flash pada koneksi mobile bandwidth rendah.
   - Lanjutkan peningkatan variasi ekspresi Mochi 3D Three.js pada skenario kuis interaktif tambahan.
