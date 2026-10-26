# Dossier Serah Terima — FIEZEL `m025-676`
## Sistem Komunikasi Dua Arah & Copilot Jawaban AI Realtime pada Fitur Kawan Bicara / Mitra Kaiwa

- **Versi Build**: `m025-676` (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` — Hexa-Sync `Selaras`)
- **Tanggal**: 26 Oktober 2026
- **Cakupan Fitur**: Sub-modul **Kawan Bicara** (EN) / **Mitra Kaiwa** (JA) (`features/voice-studio/`), Cloudflare Worker API (`workers/api/voice/route-voice-live.js`, `workers/api/schema.js`), dan Server Lokal (`server.js`).

---

## 1. Ringkasan Temuan Audit Empiris & Alasan Perubahan

Berdasarkan audit probe empiris sebelum perubahan (`probe_before_kawan_bicara.mjs`), ditemukan 4 masalah mendasar pada pengalaman percakapan Kawan Bicara / Mitra Kaiwa:

1. **Bantuan Jawaban Statis / Template Tidak Kontekstual**:
   - Sebelumnya, panel panduan jawaban bersumber dari fungsi pencocokan kata kunci statis (`getBeginnerReplyCards()` di `liveCallHelper.ts`).
   - Saat kalimat pembuka maupun saat Partner AI menanyakan topik spontan yang tidak ada di kamus regex (mis. membuat ramen pedas atau merancang rumah kaca hidroponik), panel menampilkan kalimat template yang sama sekali tidak nyambung (mis. `"すみません、ホットコーヒーを一つください"` / memesan kopi panas).
2. **Latensi Tinggi & Pemotongan JSON pada Model Thinking Gemini 3.x**:
   - Pada katalog Gemini 2026 (`thinking: true` aktif secara bawaan), batas `maxOutputTokens: 700` tanpa `thinkingConfig: { thinkingLevel: 'MINIMAL' }` membuat token berpikir mengonsumsi kuota output hingga JSON terpotong di tengah jalan (`SyntaxError`), memicu antrean *abort* beruntun hingga >10–46 detik.
3. **Tata Letak Memecah Kontak Mata & Terpotong di Layar Mobile (`390×844`)**:
   - Kartu panggung Mochi berukuran besar mendorong kartu bantuan jawaban hingga melewati batas bilah bawah (`DockTop = 777px`), sehingga teks panduan terpotong dan mata pengguna harus menggulir ke bawah (kehilangan kontak mata dengan layar percakapan).
   - Selain itu, label level mentah (`CEFR A1–B2`, `JLPT N5–N3`) masih bocor ke permukaan UI, melanggar aturan mutlak `AGENTS.md`.
4. **Ketidakselarasan Mode Telepon Live (WebSocket Duplex)**:
   - Saat mode **Telepon Live** (`models/gemini-3.8-live`) berjalan, transkripsi ucapan AI (`outputTranscription`) belum langsung memicu pembaruan bantuan jawaban AI secara real-time di layar user.

---

## 2. Solusi Arsitektur & Rekonstruksi UI/UX Dua Arah

1. **Mesin Copilot Jawaban AI 100% Realtime (`POST /api/voice/copilot-assist` & `POST /api/voice/partner-turn`)**:
   - Membangun dua endpoint real-time berbasis kolam rotasi 16 kunci API (`GEMINI_LIVE_KEYS` / `config/gemini-keys.json`) dengan strategi **Hedged Dual-Key Racing** (`1900ms` hedge timer) pada model `['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-flash-lite-latest']`, `thinkingConfig: { thinkingLevel: 'MINIMAL' }`, dan `maxOutputTokens: 2048`.
   - Pada mode Turn-by-Turn (`submitStudentTurn`), `/api/voice/partner-turn` menghasilkan **balasan lisan Partner AI sekaligus 3 opsi Copilot Jawaban AI Realtime** dalam **1 panggilan tunggal** (~3,1–4,2 detik).
   - Pada kalimat pembuka, tombol **Opsi Baru** (`variationSeed` + `excludeTexts`), serta mode **Telepon Live** WebSocket (`outputAudioTranscription: {}` — memicu lebih awal saat kalimat pertama selesai maupun saat `turnComplete`), `/api/voice/copilot-assist` meracik 3 opsi balasan kontekstual (`1 · Singkat`, `2 · Alami`, `3 · + Tanya Balik`) lengkap dengan panduan pelafalan/Romaji spasi per kata dan arti harfiah Bahasa Indonesia/Thai.
   - Cadangan deterministik hanya digunakan bila perangkat benar-benar *offline*, diberi penanda eksplisit `Cadangan Offline` (`data-copilot-source="offline-fallback"`).
2. **Rekonstruksi Panggung Komunikasi Dua Arah Fokus Kontak Mata (Eye-Contact Teleprompter HUD)**:
   - **Zona 1 — Panggung Partner AI Ringkas (`[data-testid="ai-call-card"]`)**: Avatar 3D Mochi (`84×80`), indikator status bicara real-time, kontrol cepat (`1.0x/0.8x`, `Putar Suara`, `Telepon Live`), serta teks ucapan terbaru Partner AI + terjemahan langsung + konteks kalimat terakhir murid (`Kamu: ...`). Seluruh label `CEFR` dan `JLPT` dibersihkan total.
   - **Zona 2 — Layar Teleprompter `Copilot Jawaban AI` (`[data-testid="beginner-answer-assistant"]`)**: Terletak tepat di bawah ucapan Partner AI pada sumbu pandang tengah. Menyajikan 3 tab gaya balasan instan (`1 · Singkat`, `2 · Alami`, `3 · + Tanya Balik`), teks target ukuran jelas (`15px–17px`), panduan pelafalan/Romaji warna kontras marun (`#8C2233`), terjemahan harfiah, serta tombol `Opsi Baru`, `Dengar`, `Ucapkan`, dan `Pakai`.
3. **Kepatuhan Penuh Invarian Braincore & Mode Ujian (`AGENTS.md`)**:
   - Setiap giliran bicara murid (baik via mikrofon, ketik manual, maupun tombol `Pakai`) tetap mengalir penuh ke `recordSpeakingAttempt()` pada `localStorage` (`fiezel-braincore-voice-v1`) untuk pembaruan BKT, IRT 3PL, dan Misconception Ledger.
   - Saat **Mode Ujian** (`isMeasureMode === true`) diaktifkan, panel Copilot disembunyikan 100% dari DOM (`count === 0`) demi kemurnian evaluasi tanpa bocoran bantuan.

---

## 3. Bukti Pengujian Empiris (Playwright Headless Two-Way Audit)

Skrip probe resmi tersimpan di:
- `tools/dev/probe-kawan-bicara-realtime-copilot.mjs`

Hasil eksekusi nyata pada Chromium Headless:
1. **Mobile Jepang (`390×844` — `call.html?embed=1&tab=call&lang=ja`)**:
   - **Geometri Viewport**: `StageBottom = 457px`, `CopilotBottom = 684px`, `DockTop = 777px` (**ruang aman 93px di atas bilah bawah**, nol teks terpotong, nol tumpang tindih).
   - **Uji Spontan Tanpa Skrip**: Murid mengirim `"昨日の夜、家で辛いラーメンを作りました。"` -> Partner AI membalas `"辛いラーメンですか。いいですね。自分で作ったラーメンは辛かったですか。"` (`4232ms` satu tarikan) -> Copilot AI langsung menyajikan 3 balasan kontekstual tentang ramen pedas (mis. Tab 2: `"少し辛かったですが、とても美味しかったです。"` | `"sukoshi karakatta desu ga, totemo oishikatta desu"` | `"Sedikit pedas, tapi sangat enak."`), **nol** kemunculan template kopi (`ホットコーヒー`), **nol** kemunculan `CEFR`/`JLPT`.
2. **Desktop Inggris (`1280×800` — `call.html?embed=1&tab=call&lang=en`)**:
   - **Geometri Viewport**: `StageBottom = 307px`, `CopilotBottom = 514px`, `DockTop = 733px` (**ruang aman 219px di atas bilah bawah**).
   - **Uji Spontan Tanpa Skrip**: Murid mengirim `"I am designing an automated hydroponic greenhouse in Bandung."` -> Partner AI bertanya balik spesifik tentang proyek hidroponik di Bandung -> Copilot AI menyajikan 3 jawaban relevan (mis. `"I want to help local farmers grow crops more efficiently using technology."`).
   - **Tombol `Opsi Baru`**: Terbukti menghasilkan variasi kalimat AI baru yang berbeda dari saran sebelumnya.
   - **Tombol `Pakai` & Braincore**: Mengirim giliran bicara dengan **0 runtime error**, direspons langsung oleh Partner AI, dan tercatat nyata pada `fiezel-braincore-voice-v1` (`historyCount: 2, competencyCount: 12`).
   - **Anti-Leak Exam Purity (`Mode Ujian`)**: Mengklik toggle `Mode Ujian` menurunkan jumlah elemen `[data-testid="beginner-answer-assistant"]` menjadi **`0`**.

---

## 4. Daftar Seluruh Berkas yang Disentuh

1. `workers/api/schema.js` — Menambahkan batas payload `12288` byte untuk `/api/voice/copilot-assist` dan `/api/voice/partner-turn`.
2. `workers/api/voice/route-voice-live.js` — Menambahkan handler `routeVoiceCopilotAssist` dan `routeVoicePartnerTurn` dengan rotasi 16 kunci, *hedged dual-key racing* (`1900ms`), `gemini-3.1-flash-lite` + `thinkingLevel: 'MINIMAL'`, dan `maxOutputTokens: 2048`.
3. `server.js` — Menambahkan endpoint lokal `/api/voice/copilot-assist`, `/api/voice/partner-turn`, `/api/voice/live-session`, `/api/voice/report-drop` dengan *hedged dual-key pool* serta menghapus pemblokiran sinkron `execSync('ffmpeg')` pada `tryGeminiTts` (diganti konversi WAV PCM memori instan).
4. `features/voice-studio/src/lib/liveCallHelper.ts` — Memperluas tipe `BeginnerReplyCard` dengan metadata provenans `isRealtimeAi` dan `isOfflineFallback`.
5. `features/voice-studio/src/lib/liveTransport.ts` — Menambahkan `resolveVoiceApiCandidateBases()`, `requestRealtimeCopilotAssist()`, integrasi terpadu `/api/voice/partner-turn` pada `resolveAiReply()`, dukungan Kanji pendek pada `replyLooksLikeTargetLanguage()`, serta perutean lokal bersih (`isLocalDevHost()`) bebas blokir CORS saat pratinjau lokal.
6. `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx` — Merekonstruksi komponen menjadi teleprompter dua arah fokus kontak mata (`Copilot Jawaban AI`) dengan 3 tab gaya balasan, panduan pelafalan/Romaji spasi kata, terjemahan harfiah, dan aksi cepat tanpa teks terpotong di mobile maupun desktop.
7. `features/voice-studio/src/components/HomeRedesignView.tsx` — Membersihkan label level agar bebas istilah `CEFR` / `JLPT`.
8. `features/voice-studio/src/App.tsx` — Merekonstruksi Zona 1 Partner AI yang ringkas di atas Zona 2 Copilot Jawaban AI, menghubungkan pemicu Copilot realtime pada pembuka sesi, Turn-by-Turn, variasi `Opsi Baru`, serta streaming transkripsi WebSocket **Telepon Live**.
9. `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css` — Hasil kompilasi produksi sub-modul Voice Studio.
10. `tools/dev/probe-kawan-bicara-realtime-copilot.mjs` — Skrip probe empiris otomatis berbasis Playwright Headless.
11. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `id-golden-baseline.json` — Sinkronisasi build `m025-676` via arbiter resmi dan pembaruan baseline literal Indonesia.

---

## 5. Status Gerbang Mutu Lokal & Catatan Teknis

- `node tools/bump-build.mjs --check` -> **PASS (`Selaras` — `m025-676`)**
- `node tools/dev/probe-kawan-bicara-realtime-copilot.mjs` -> **PASS (100%)**
- `node tests/voice-studio-ui-architecture-test.js` -> **PASS (5/5)**
- `npx tsx tests/voice-studio-reformulation-translation-test.js` -> **PASS (100%)**
- `node tests/voice-call-studio-integration-test.js` -> **PASS (8/8)**
- `node tests/kawan-bicara-neural-voice-test.js` -> **PASS (100%)**
- `node tests/cf-api-contract-test.js` -> **PASS (285/285)**
- `node tests/th-ui-leak-test.js` -> **PASS (4501 kunci id/th utuh)**
- `node tests/curriculum-cache-version-test.js` -> **PASS (`m025-676`)**
- `node tests/gate-registry-test.js` -> **PASS (10/10)**
- `node tests/id-golden-snapshot-test.js` -> **PASS (`HIJAU: baseline emas Indonesia utuh`)**
- `npx impeccable detect --json` -> **PASS (`[]` — 0 peringatan anti-pattern)**

**Catatan Operasional Saat Deploy ke Produksi**:
- Saat pengguna memberikan instruksi deploy ke produksi (`main` + Cloudflare), deploy Worker `fiezel-api` (`npx wrangler deploy`) perlu dijalankan bersama PR agar rute baru `/api/voice/copilot-assist` dan `/api/voice/partner-turn` juga aktif di `https://api.fiezel.my.id`.
