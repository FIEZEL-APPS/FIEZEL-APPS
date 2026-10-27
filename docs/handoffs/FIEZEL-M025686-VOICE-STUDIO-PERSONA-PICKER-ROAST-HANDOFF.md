# FIEZEL Handoff Dossier: Voice Studio Persona & Scenario Picker, Amplified Tough-Love Roasting & Hexa-Sync (m025-686)

**Tanggal:** 28 Oktober 2026
**Build:** `m025-686` (Hexa-Sync 100% Selaras)
**Cabang:** `feat/voice-studio-persona-picker-m025-686`

---

## 1. Ringkasan & Temuan Audit Empiris UI/UX Kawan Bicara
Berdasarkan umpan balik langsung dari pengujian pengguna (*"aku tidak merasakan sama sekali perubahan ini, dan persona Ai nya juga 1 saja, tidak bisa pilih"*), dilakukan penelusuran arsitektural mendalam terhadap runtime Voice Studio (`features/voice-studio/`):

1. **Akar Masalah UI: Tidak Adanya Pengalih Karakter/Skenario di Antarmuka Mobile & Desktop**:
   - Di `App.tsx` sebelumnya, elemen nama persona di bar navigasi atas (`header`) menggunakan kelas `hidden sm:inline-block` dan hanya berupa elemen teks statis non-interaktif (`<span>`). Pada layar smartphone, identitas persona sama sekali tidak terlihat.
   - Variabel state `activeScenarioId` hanya diinisialisasi satu kali saat pemuatan halaman dan tidak memiliki komponen interaktif untuk mengubahnya (`setActiveScenarioId` terkunci).
   - Pengguna terkunci permanen pada persona default tanpa cara untuk memilih Sensei Nanami vs Keita Senpai pada bahasa Jepang, atau Coach Alex vs Coach Sarah pada bahasa Inggris.

2. **Akar Masalah Pedagogis: Kalimat Pembuka & Prompt yang Terlalu Lembut (Generic Bot)**:
   - Kalimat pembuka skenario bebas (`scen_ja_free_talk`) sebelumnya menggunakan kalimat teks buku standar yang manis dan sopan (*"ヤッホー！今日はお話しできてめっちゃ嬉しい！..."*), sehingga saat pertama kali menyambung, murid langsung merasa tidak ada perubahan karakter sama sekali.
   - Pada prompt `/api/voice/partner-turn` di `server.js` dan `route-voice-live.js`, instruksi roasting berstatus kondisional (*"IF the learner sounds stiff..."*). Ketika murid memberikan respons singkat atau umum, model Gemini mengabaikan roasting dan kembali ke mode asisten ramah standar.

---

## 2. Solusi & Perubahan Arsitektur

1. **Antarmuka Pemilih Karakter & Skenario (Persona & Scenario Bottom Sheet / Modal)**:
   - Menambahkan tombol interaktif `[data-testid="persona-picker-trigger"]` di header dengan lampu indikator kehadiran hijau, nama persona, dan chevron dropdown.
   - Menambahkan tombol interaktif `[data-testid="persona-card-trigger"]` pada kartu panggil `[data-testid="ai-call-card"]`.
   - Mengimplementasikan Modal/Bottom Sheet `[data-testid="persona-scenario-modal"]`:
     - **Pilihan Karakter Jepang (JA)**:
       * **Sensei Nanami (七海先生)**: Guru Kejam Tapi Baik Hati · Tsundere Sensei (Roasting kaku kayak kanebo kering & langsung ajarkan frasa lisan Tokyo).
       * **Keita (健太先輩)**: Senior Kampus Tokyo · Gaul & Roasting Santai (Ceng-cengin gaya bahasa pejabat formal & ajak ngobrol santai pakai Tokyo slang).
     - **Pilihan Karakter Inggris (EN)**:
       * **Coach Alex**: Tough-Love Buddy · American Natural Pace (Roast penerjemahan kata-per-kata & jeda robotik).
       * **Coach Sarah**: Academic & Interview Mentor · Sharp Critique (Kritik tajam kalimat bertele-tele & ajarkan penalaran terstruktur).
     - **Pilihan Skenario**: Seluruh skenario bahasa terkait ditampilkan secara ringkas dan dapat dipilih dengan satu ketukan.
   - Menyimpan preferensi persona terpilih di `localStorage` (`fiezel_voice_persona_pref`) dan mengalirkan pembaruan real-time ke TTS pre-rendering.

2. **Amplifikasi Pedagogi Sassy Mentor & Kalimat Pembuka Otentik**:
   - Memperbarui kalimat pembuka resmi Nanami: *"あら、やっと来たの？待たせるなんていい度胸ね！さあ、教科書みたいなカチコチな日本語は禁止よ。最近何してたの？"*.
   - Memperbarui kalimat pembuka resmi Keita: *"おっ、来たな後輩！今日もよろしく！変にかしこまった敬語使ったら容赦なくツッコミ入れるからなー！で、最近なんか面白いことあった？"*.
   - Menambahkan direktif imperatif `[MANDATORY SASSY REACTION DIRECTIVE]` pada `server.js`, `route-voice-live.js`, `liveTransport.ts`, dan instruksi sesi Gemini Live di `App.tsx`: setiap giliran bicara WAJIB diawali dengan reaksi vokal spontan (1-3 kata) sesuai karakter sebelum memberikan frasa lisan alami.

---

## 3. Bukti Pengujian Empiris Nyata (Headless Playwright Chromium)
Pengujian otomatis dilakukan melalui `tools/dev/probe-voice-studio-persona-picker.mjs`:
- **Uji 1 (Kontrak Persona & Direktif)**: PASS (Nanami, Keita, Coach Alex, Coach Sarah terdefinisi lengkap dengan openingGreeting, personalityTag, dan roastStyle).
- **Uji 2 (Pendeteksian Trigger di Mobile)**: PASS (`[data-testid="persona-picker-trigger"]` dan `[data-testid="persona-card-trigger"]` tampak pada viewport 390x844).
- **Uji 3 (Buka Modal)**: PASS (Klik trigger membuka modal selector).
- **Uji 4 (Alih ke Keita)**: PASS (Header berubah menampilkan "Keita", localStorage bernilai `"keita"`, modal tertutup).
- **Uji 5 (Alih kembali ke Nanami)**: PASS (Header kembali ke "Sensei Nanami", localStorage bernilai `"nanami"`).
- **Uji 6 (Alih ke Bahasa Inggris & Sarah)**: PASS (Header berganti ke "Coach Alex", modal dibuka menampilkan Coach Alex & Coach Sarah, memilih Sarah memperbarui header ke "Coach Sarah" dan localStorage bernilai `"coach_sarah"`).
- **Uji 7 (Zero Console Error)**: PASS (0 error pada console peramban).

Pengujian mimicry maskot melalui `tools/dev/probe-pedagogy-roast-mascot-mimicry.mjs`:
- Emosi Bicara Roasting, Praise, dan Laugh terdeteksi dan di-mimic oleh maskot 3D Mochi secara akurat (100% PASS).

---

## 4. Daftar Berkas yang Disentuh
- `features/voice-studio/src/App.tsx`: Penambahan state `selectedPersonaId`, `showPersonaModal`, interaktif header trigger, kartu panggil trigger, handler pemilihan persona & skenario, modal bottom sheet UI, dan penguatan instruksi sesi Live.
- `features/voice-studio/src/data/callScenarios.ts`: Penambahan metadata persona (`openingGreeting`, `personalityTag`, `roastStyle`), penambahan skenario `scen_ja_free_talk_keita` & `scen_en_free_talk_sarah`, dan penguatan sistem prompt.
- `features/voice-studio/src/types/voiceCall.ts`: Penambahan tipe properti opsional pada interface `VoicePersona`.
- `features/voice-studio/src/lib/liveTransport.ts`: Penambahan direktif reaksi vokal sassy pada fallback transport.
- `server.js` & `workers/api/voice/route-voice-live.js`: Penegakan aturan `[MANDATORY SASSY REACTION DIRECTIVE]` pada endpoint `/api/voice/partner-turn`.
- `features/voice-studio/dist/voice-studio.js` & `voice-studio.css`: Hasil kompilasi bundel produksi Vite.
- `tools/dev/probe-voice-studio-persona-picker.mjs`: Skrip probe empiris pengujian otomatis Playwright.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: Kenaikan nomor build m025-686 sesuai Hexa-Sync Invariant.
- `id-golden-baseline.json`: Regenerasi baseline emas setelah penambahan teks UI pemilih karakter.

---

## 5. Status Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: PASS (HIJAU: baseline emas Indonesia utuh).
- `node tests/th-ui-leak-test.js`: PASS (4529 kunci id punya padanan th).
- `node tests/curriculum-cache-version-test.js`: PASS (33 penegasan, 3 halaman, build m025-686).
- `node tests/gate-registry-test.js`: PASS (10 pass, 0 fail).
- `node tools/bump-build.mjs --check`: PASS (Selaras 100%).
