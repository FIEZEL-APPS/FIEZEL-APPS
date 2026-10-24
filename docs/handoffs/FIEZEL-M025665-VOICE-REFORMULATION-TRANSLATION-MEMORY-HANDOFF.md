# FIEZEL HANDOFF DOSSIER: AI VOICE STUDIO NATURAL REFORMULATION, REAL-TIME TRANSLATION & PERSISTENT CONVERSATION MEMORY

- **Nomor Rilis**: `m025-665`
- **Cabang**: `feat/voice-call-transcript-romaji-fixes-m025-665`
- **Tanggal**: 2026-10-24
- **Modul**: AI Voice Studio (`call.html?tab=call`)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan telemetri sesi panggilan live user nyata (Bahasa Inggris dan Bahasa Jepang), ditemukan tiga defek kritis pada pengalaman belajar murid:
1. **Nonsense Hardcoded Correction ("Hot Coffee" Bug)**:
   - *Masalah*: Ketika murid berbicara bebas (misalnya *"ahem All right, yeah, I'm agree."* atau *"i like mine jobe"*), kartu diagnosis menampilkan saran kalimat kaku yang tidak relevan sama sekali: `Saran: "I'd like a hot coffee, please."`.
   - *Akar Masalah*: Di `liveTransport.ts` (`evaluateUtteranceClientSide`), blok evaluasi miskonsepsi sintaksis/morfologi secara statis meng-assign kalimat contoh skenario kafe tanpa mempertahankan maksud dan kosakata murid.
   - *Solusi*: Membangun mesin `synthesizeNaturalReformulation(exact, targetLang, misconceptionId)` yang mereformulasi secara presisi kalimat asli murid menjadi bentuk gramatikal alami (*"All right, yeah, I agree."*, *"I like my job."*), dan mengubah label kartu menjadi `Naturalnya:` / `ประโยคที่เป็นธรรมชาติ:` dengan tombol `Gunakan`.
2. **Dummy Translation Fallback ("Terjemahan langsung:" & "Kalimat bahasa Jepang:")**:
   - *Masalah*: Giliran bicara AI partner menampilkan awalan dummy `Terjemahan langsung: "<english text>"` atau `Kalimat bahasa Jepang: "<japanese text>"`.
   - *Akar Masalah*: Gemini Live WebSocket hanya mengirimkan audio dan transkripsi bahasa target, sementara fungsi `approximateEnglishToIndonesian` memiliki string fallback statis `Terjemahan langsung: "${text}"`.
   - *Solusi*: Mengintegrasikan API penerjemah real-time instan (Google GTX) via `fetchLiveTranslation` dengan dual-layer memory Map dan `localStorage` cache. Giliran AI langsung dirender dengan teks kontekstual dan diperbarui seketika dengan terjemahan alami bahasa Indonesia & Thai.
3. **Hilangnya Memori Percakapan (Amnesia Antar-Sesi & Reconnect)**:
   - *Masalah*: Ketika user bertanya *"Do you remember what about our previous conversation?"*, AI menjawab seolah-olah baru pertama kali bertemu (*"Haha, we're just getting started today!"*).
   - *Akar Masalah*: `turns` selalu direset ke `[activeScenario.openingLine]` setiap kali inisialisasi tanpa disimpan di `localStorage`. Pesan `setup` WebSocket hanya mengirimkan 4 turn terakhir tanpa direktif memori.
   - *Solusi*:
     - Menyimpan seluruh alur percakapan di `localStorage.setItem('fz_kaiwa_turns_' + targetLang + '_' + activeScenario.id, ...)` dan me-restore secara otomatis saat halaman dibuka.
     - Menyuntikkan riwayat percakapan hingga 12 giliran sebelumnya ke `systemInstruction` Gemini Live dengan direktif ketat: `CRITICAL MEMORY DIRECTIVE: If the learner asks about past topics or previous conversations, YOU MUST warmly and specifically recall the exact facts, projects, opinions, and details they mentioned above (such as building a language app, BKT algorithm, school pilot, etc.)! Never say you just met or forgot!`.
4. **Masukan Teks & Banner Handsfree saat Telepon Live**:
   - Memperbaiki pengiriman input teks saat telepon duplex aktif (`submitLiveUserUtterance`) agar langsung masuk ke alur percakapan murid, dinilai oleh Braincore BKT, dan dikirimkan ke model.
   - Menambahkan banner visual yang jelas saat mode handsfree aktif sehingga user tahu mikrofon siap menangkap suara tanpa perlu menekan tombol berulang kali.
   - Memasang komponen `BeginnerAnswerAssistant` untuk membantu pemula memilih variasi respon natural dengan satu klik.

---

## 2. Bukti Pengujian Empiris

Pengujian empiris dilakukan dengan pengujian unit end-to-end (`tests/voice-studio-reformulation-translation-test.js`):
1. **Reformulasi Natural Bahasa Inggris**:
   - `"ahem All right, yeah, I'm agree."` -> `"All right, yeah, I agree."` (PASS)
   - `"i like mine jobe"` -> `"I like my job."` (PASS)
   - `"I'm think that this app it has great potential"` -> `"I think that this app has great potential."` (PASS)
   - `"Although working from home is good, but it is lonely"` -> `"Although working from home is good, it is lonely."` (PASS)
   - `"I still figuring out how do I get to school"` -> `"I am still figuring out how do I get to school."` (PASS)
   - `"Last weekend I goed to Bandung and buyed local food"` -> `"Last weekend I went to Bandung and bought local food."` (PASS)
   - `"it is look similar with duolingo"` -> `"It looks similar to duolingo."` (PASS)
2. **Reformulasi Natural Bahasa Jepang**:
   - `"えっと ホットコーヒーを飲むです"` -> `"ホットコーヒーを飲みます"` (PASS)
   - `"図書館に勉強します"` -> `"図書館で勉強します"` (PASS)
   - `"どうやって勉強するたらいいですか"` -> `"どうやって勉強したらいいですか"` (PASS)
   - `"ラーメンは美味しいでした"` -> `"ラーメンは美味しかったです"` (PASS)
3. **Invarian Nol Terjemahan Dummy**:
   - 0 kemunculan `"Terjemahan langsung:"` (PASS)
   - 0 kemunculan `"Kalimat bahasa Jepang:"` (PASS)
4. **Live Translation (Google GTX)**:
   - Terbukti menghasilkan terjemahan alami instan bahasa Indonesia dan Thai tanpa crash.
5. **Probe Suara Mikrofon Gemini Live**:
   - Terbukti via `scratch/test-gemini-mic-input.mjs`: format `realtimeInput: { audio: ... }` diterima 100% oleh model dan menghasilkan transkripsi audio penuh (sedangkan format legacy `mediaChunks` diabaikan).

---

## 3. Daftar Berkas yang Disentuh & Perubahannya

1. `features/voice-studio/src/lib/liveTransport.ts`:
   - Menambahkan fungsi `synthesizeNaturalReformulation(rawText, targetLang, misconceptionId)`.
   - Mengganti penugasan `syntacticCorrection` statis dengan hasil sintesis reformulasi alami murid.
2. `features/voice-studio/src/lib/liveCallHelper.ts`:
   - Menghapus string dummy `"Terjemahan langsung: \"${text}\""`.
   - Menambahkan fungsi `fetchLiveTranslation(text, targetLocale)` dengan memory Map & localStorage cache.
   - Menambahkan penangan `approximateEnglishToThai`.
3. `features/voice-studio/src/App.tsx`:
   - Persistensi `turns` percakapan di `localStorage` per skenario & bahasa.
   - Peningkatan memori percakapan pada setup `systemInstruction` Gemini Live WebSocket.
   - Latar belakang pembaruan terjemahan otomatis melalui `fetchLiveTranslation`.
   - Komit langsung kalimat murid via `commitLiveUserTurn` dan penanganan `voice-turn-input` di telepon live.
   - Pemasangan `BeginnerAnswerAssistant` dan perbaikan teks kartu perbaikan menjadi `Naturalnya:`.
4. `features/voice-studio/dist/voice-studio.js` & `dist/voice-studio.css`:
   - Pembaruan bundel produksi terkompilasi melalui Vite.
5. `id-golden-baseline.json`:
   - Pembaruan baseline emas terverifikasi untuk teks UI bahasa Indonesia.
6. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`:
   - Sinkronisasi versi build arbiter ke `m025-665`.
7. `tests/voice-studio-reformulation-translation-test.js`:
   - Berkas uji otomatis untuk reformulasi dan penerjemahan.

---

## 4. Status Kelulusan Gerbang Mutu Lokal

- `node tests/japanese-phonetics-test.js`: **PASS (100%)**
- `node tests/voice-studio-ui-architecture-test.js`: **PASS (5/5)**
- `npx tsx tests/voice-studio-reformulation-translation-test.js`: **PASS (100%)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js`: **PASS (4498 kunci selaras)**
- `node tests/curriculum-cache-version-test.js`: **PASS (m025-665)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras)**
