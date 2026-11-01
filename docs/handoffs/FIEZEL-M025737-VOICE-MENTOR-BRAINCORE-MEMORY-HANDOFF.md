# FIEZEL-M025737 — Voice Studio Ruthless Caring Mentor, Braincore Strength-Weakness Dossier, Dual-Brain Memory & Acoustic Language Lock Handoff

- **Authority**: OWNER / MASTER (`@fitrarustqi`)
- **Build Target**: `m025-737`
- **Status**: READY FOR PRODUCTION MERGE (`100% GREEN` pada seluruh gerbang mutu lokal & Playwright Empirical Probe)
- **Date**: 2026-11-02

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan evaluasi langsung OWNER terhadap pengalaman panggilan suara dua arah (**Duplex Live Voice Studio** / Kawan Bicara), ditemukan 6 celah pedagogis dan akustik yang harus ditutup secara global tanpa mengharuskan pengguna menulis instruksi prompt sendiri:

1. **Ketergantungan Prompt Manual & Ketawa Robotik (`"Haha!"` / `"あはは！"` di Setiap Giliran)**:
   - Prompt persona lama mewajibkan AI mengawali setiap balasan dengan `"Haha!"` atau `"あはは！"`, dan jalur WAV memakai instruksi kaku `"Read ONLY the exact text inside quotes verbatim"`. Akibatnya AI terdengar tidak wajar, membaca huruf tawa secara harfiah, atau tertawa di setiap kalimat padahal konteksnya tidak lucu.
2. **Suara Monoton Tanpa Kemampuan Ubah Aksen / Impersonasi**:
   - Persona suara belum diberi kebebasan global untuk mendemonstrasikan kontras intonasi ("suara robot buku teks kaku" vs "aliran penutur asli") maupun berpindah dialek/aksen secara natural (Tokyo vs Osaka/Kansai-ben `〜やん/〜やで` vs Hakata-ben vs Keigo; General American vs British RP/Aussie).
3. **Halusinasi Bahasa Asing (Bicara Bahasa Indonesia Dikira Bahasa Rusia)**:
   - `BidiGenerateContentSetup.inputAudioTranscription` dikirim sebagai objek kosong `{}` sehingga ASR multibahasa Gemini Live menebak seluruh 70+ bahasa dunia dan kerap salah mengenali fonem Indonesia sebagai bahasa Rusia (Cyrillic), lalu membalas murid dalam bahasa Rusia.
4. **Absennya Koreksi Grammar Langsung Saat Telepon Live**:
   - Ketika murid mengucapkan tata bahasa atau partikel yang salah (`×食べますでした`, `×行くです/飲むです`, `×美味しいでした`, `×図書館に勉強する`, `×勉強するたら`, `×I am agree`, `×I am want`, `×mine job`, `×similar with`), AI lama sering membiarkan kesalahan tersebut lewat begitu saja demi menjaga obrolan tetap sopan.
5. **Belum Terhubung ke Otak Aplikasi (Braincore) untuk Mengetahui Titik Pintar & Titik Lemah Murid**:
   - Voice Studio hanya membaca subset kompetensinya sendiri dan belum mengekstrak peta `lessons` (`fiezel-mastery-bkt-v1*`) maupun `entries` Bayesian log-odds (`fiezel-misconception-ledger-v1*`) dari aplikasi utama FIEZEL ke dalam instruksi sistem sesi telepon.
6. **Belum Ada Sistem Memori Dua Arah (Otak AI & Otak User Lintas Sesi)**:
   - Fakta personal murid, karakter bicara murid, kelemahan tata bahasa kronis, serta kesimpulan evaluasi mentor di akhir telepon belum disimpan secara persisten lintas panggilan.

---

## 2. Solusi Arsitektural yang Diterapkan (100% Rp 0 / Free-Tier Pool)

1. **Global Directives Tanpa Perintah User & Peningkatan Kualitas Vokal (`callScenarios.ts`, `liveTransport.ts`)**:
   - Mengangkat `nanami.geminiVoice` ke `'Aoede'` untuk artikulasi dan ekspresi vokal yang jauh lebih hidup.
   - Menghapus aturan paksaan `"Haha!"` / `"あはは！"` di setiap giliran. Menetapkan aturan **85%+ giliran tenang dan berwibawa**, humor kontekstual anti-garing, serta fungsi `sanitizeSpokenTextForClassicTts` untuk membersihkan token tawa literal sebelum fallback Edge-TTS (`/api/tts/line`).
   - Membuka kapabilitas global ubah aksen, dialek (Kansai-ben, Hakata-ben, Keigo, American/British/Aussie), dan kontras vokal.
2. **Strict Acoustic & Script Lock Anti-Rusia (`App.tsx`, `liveTransport.ts`)**:
   - Mengunci `inputAudioTranscription` pada `BidiGenerateContentSetup` dengan `languageCodes` eksplisit (`['ja-JP', 'id-ID']` atau `['en-US', 'id-ID']`, serta `'th-TH'` untuk locale Thailand) dan `customVocabulary`.
   - Menambahkan `sanitizeHallucinatedTranscript` yang memfilter aksara Cyrillic (`\u0400-\u052F`) dan aksara asing di luar bahasa target secara instan sebelum masuk ke draf maupun evaluasi giliran.
3. **Pedagogi "Guru Galak Tapi Penuh Perhatian" & Echo Redemption (`callScenarios.ts`, `liveTransport.ts`, `route-voice-live.js`)**:
   - Mengimplementasikan 4 langkah koreksi wajib: (1) Intersepsi langsung, (2) *Contextual tough-love roast* yang menyerang kebiasaan terjemahan kata-per-kata (dengan *Moral Compass*: bila murid jujur berkata belum tahu/lupa, langsung beralih ke bimbingan hangat), (3) **Echo Redemption** yang mewajibkan murid mengulangi kalimat yang benar saat itu juga, dan (4) Pujian tulus saat murid berhasil memperbaiki ucapannya.
   - Menyelaraskan Copilot (`routeVoiceCopilotAssist`) agar Opsi 1 (`tier="easy"`) menampilkan kalimat perbaikan **Echo Redemption** yang diminta mentor.
4. **Integrasi Penuh Braincore ("Tahu Murid Pintar di Mana & Lemah di Mana") & Memori Dua Arah (`braincore.ts`, `voiceCall.ts`, `App.tsx`)**:
   - Membangun `readHostPwaCognitiveSnapshot`, `inferLearnerCharacterProfile`, `extractPersonalFactsFromUtterance`, `finalizeCallSessionMemory`, dan `buildBraincoreCognitiveDossier`.
   - Menyinkronkan pembacaan dan penulisan dua arah dengan skema kanonikal aplikasi utama (`fiezel-mastery-bkt-v1` `lessons` + `skills` dan `fiezel-misconception-ledger-v1` `entries` Bayesian `logOdds` + `items`).
   - Menyimpan `dualBrainMemory` (`userBrain` + `mentorBrain`) di `fiezel-braincore-voice-v1` saat setiap giliran bicara dan saat panggilan diakhiri (`stopLiveCall`).

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu Lokal

1. **Playwright Chromium Headless Empirical Probe**:
   - Diuji terhadap server lokal `call.html` dengan intersepsi WebSocket `models/gemini-3.8-live`:
     - Memverifikasi `setup.inputAudioTranscription.languageCodes` terkunci pada `["ja-JP", "id-ID"]` beserta `customVocabulary`.
     - Memverifikasi injeksi `[FIEZEL BRAINCORE LIVE TELEMETRY & TWO-WAY MEMORY DOSSIER]` yang memuat nama murid (`Rian Pratama`), `TITIK PINTAR MURID`, `TITIK LEMAH & MISKONSEPSI AKTIF`, dan `FOKUS INSTRUKSI GURU HARI INI`.
     - Memverifikasi suntikan transkrip Rusia (`"Привет как дела"`) ditolak 100% oleh `sanitizeHallucinatedTranscript`.
     - Memverifikasi penyimpanan `dualBrainMemory` (`personalFacts`, `chronicWeaknesses`, `sessionSummaries`) di `localStorage` peramban.
2. **Unit & Integration Gate Tests**:
   - `node tests/voice-studio-ui-architecture-test.js`: **PASS (8/8)**
   - `npx tsx tests/voice-studio-reformulation-translation-test.js`: **PASS (7/7)**
   - `node tests/voice-call-ai-studio-port-test.js`: **PASS**
   - `node tests/voice-call-studio-integration-test.js`: **PASS**
   - `node tests/kawan-bicara-hardening-test.js`: **PASS (10/10)**

---

## 4. Daftar Berkas yang Disentuh

- `features/voice-studio/src/types/voiceCall.ts`
- `features/voice-studio/src/lib/braincore.ts`
- `features/voice-studio/src/data/callScenarios.ts`
- `features/voice-studio/src/lib/liveTransport.ts`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/dist/voice-studio.js`
- `workers/api/voice/route-voice-live.js`
- `tests/voice-studio-ui-architecture-test.js`
- `tests/voice-studio-reformulation-translation-test.js`
- `call.html`, `features/voice-studio/call.html`, `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html` (via `bump-build.mjs` ke `m025-737`)
- `docs/handoffs/FIEZEL-M025737-VOICE-MENTOR-BRAINCORE-MEMORY-HANDOFF.md`

---

## 5. Langkah Berikutnya (Next Steps / Roadmap)

1. Memantau telemetri rasio keberhasilan *Echo Redemption* pada sesi telepon murid di dasbor analitik Braincore.
2. Menambahkan visualisasi ringkas catatan *Dual-Brain Memory* pada tab Braincore di dalam Voice Studio pada iterasi UI berikutnya.
