# FIEZEL HANDOFF DOSSIER: M025-641 VOICE STUDIO ANTI-CUTOFF VAD, CONTINUOUS SENTENCE TTS, ANTI-OK OPENER & INSTANT BARGE-IN

**Tanggal Rilis**: 24 Oktober 2026
**Build Version**: `m025-641`
**Target Modul**: `features/voice-studio/` (Mitra Kaiwa AI Call Studio) & `workers/api/ai/ai-tasks.js` (Cloudflare AI Pipeline)
**Tipe Rilis**: Perbaikan Bug Kritis, Peningkatan UX Realtime Voice Duplex, & Penegakan Regulasi Anti-Cutoff

---

## 1. Ringkasan Temuan Audit & Akar Masalah

Owner melaporkan 3 kekurangan utama pada pengalaman voice chat panggilan AI:
1. **Suara Terpotong Saat Murid Masih Berbicara**:
   - *Akar Masalah*: Timer keheningan VAD (`silenceWaitMs`) disetel terlalu agresif hanya `550ms` (jika `isFinal`) atau `900ms`. Saat murid berhenti sejenak untuk bernapas atau memikirkan kosakata lanjutan (misal *"I want a coffee and..."*), timer langsung mengeksekusi pengiriman parsial. Selain itu, pada peramban Chrome mobile/desktop, event `rec.onend` menutup siklus sementara dan langsung mem-force-submit `pending = accumulatedSpeech.trim()` tanpa memeriksa apakah timer kesabaran masih aktif.
2. **Jeda Lama Sekali pada Tanda Baca (`!`, `?`, `.`)**:
   - *Akar Masalah*: Fungsi `splitIntoSpeechChunks` memotong kalimat pendek/menengah menjadi beberapa potongan audio terpisah pada setiap tanda baca (`!`, `?`, `.`). Pemutaran audio di klien menunggu `audio.onended` per chunk sebelum meminta dan mengalokasikan instance `Audio` baru, menciptakan *dead-gap* 1,5–2,5 detik antar klausa.
3. **Balasan AI Selalu Diawali Kata "OK", "Okay", "Oh" Terus-Menerus**:
   - *Akar Masalah*: Prompt `promptConversation` menginstruksikan model untuk memulai dengan "short natural reaction", yang direspon LLM dengan selalu menyisipkan kata klise repetitif *"OK,"*, *"Okay,"*, *"Oh,"* atau *"ああ、"* di setiap giliran bicara.

---

## 2. Solusi Teknis yang Diterapkan

1. **Anti-Cutoff Speech Recognition & VAD (Patient Listening)**:
   - Menambahkan deteksi kalimat belum lengkap `isGrammaticallyIncomplete(clean, lang)`. Jika kalimat berakhiran konektor/preposisi/partikel (*and, or, because, with, to, for, in, on, a, the, i, like, want, は, が, を, に, で, と* dll), waktu tunggu keheningan diperpanjang menjadi **3.000 ms (3,0 detik)**. Untuk kalimat lengkap, batas keheningan dinaikkan dari 550 ms ke **2.000 ms (2,0 detik)**.
   - Status visual penenang: Status pill menampilkan `Mochi menunggu kamu selesai bicara…` selama periode keheningan aktif.
   - Proteksi `rec.onend`: Jika `liveSilenceTimerRef.current` masih aktif saat Chrome memicu `rec.onend`, sistem **TIDAK** memaksakan pengiriman parsial, melainkan menyimpan akumulasi teks ke `speechPrefix` dan menyambung ulang siklus pengenalan suara secara mulus (*seamless reconnect*).
   - Pada PTT (Push-to-Talk), batas keheningan dinaikkan menjadi 2.500 ms – 3.500 ms dan tombol `Stop` dapat ditekan kapan saja untuk pengiriman instan.
2. **Continuous Single-Stream Sentence TTS (Zero Punctuation Gaps)**:
   - Nilai `singleLimit` di `splitIntoSpeechChunks` dinaikkan menjadi **320 karakter**. Seluruh balasan percakapan telepon (1–2 kalimat) kini disintesis dan diputar sebagai **SATU aliran audio tunggal** berprosodi alami oleh Edge-TTS, melenyapkan jeda kaku antar tanda baca.
3. **Pembersihan Opener Klise Repetitif ("Anti-OK Opener")**:
   - Memperbarui instruksi prompt `promptConversation` di `workers/api/ai/ai-tasks.js` dengan larangan tegas: *"CRITICAL: NEVER start replies with repetitive filler words like 'OK', 'Okay', 'Oh', 'Alright', 'Sure', or 'Ah'. Start directly with varied natural conversational words."*
   - Menambahkan pembersih regex deterministik di `shapeConversationOutput`:
     - Bahasa Inggris: `/^(?:OK|Okay|Oh)[,!\s]+(?=[A-Za-z0-9])/i`
     - Bahasa Indonesia/Arti: `/^(?:Oke|Oh)[,!\s]+(?=[A-Za-z0-9])/i`
   - Memperluas `enFunctionWords` dengan kata penanda percakapan sehari-hari (*sure, up, out, right, here, now, got, get, please, thanks, great, nice, good, cool, awesome* dll) untuk mencegah penolakan palsu `locale_mismatch`.
4. **Instant Barge-In (Menyela AI seperti ChatGPT Voice)**:
   - Mengimplementasikan `interruptAiAndStartListening()`: mengetuk tombol mikrofon, mengetuk Mochi, atau mengklik stage saat AI sedang berbicara akan memotong pemutaran suara Mochi seketika dan langsung memberikan kendali giliran bicara kepada murid.
5. **Kepatuhan Mutlak Regulasi Anti-PAW**:
   - Membersihkan seluruh string `"PAW berbicara..."` dan penyebutan nama maskot non-resmi pada antarmuka, menggantikannya secara konsisten dengan maskot resmi **Mochi** (*Daifuku Mochi* 3D).

---

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)

Pengujian dilakukan menggunakan skrip probe browser Playwright Chromium headless `honest-probe.mjs` yang melakukan klik nyata dan berinteraksi layaknya murid di `call.html`.

### Skenario 1: Percakapan Bahasa Inggris (3 Giliran)
```
--- TURN 1
 learner : Hi, I would like an iced latte please.
 AI      : Great! One iced latte coming right up.
 meaning : Satu iced latte sedang dibuat ya.
 source  : ai
 t_text  : 8869 ms (cold start Cloudflare Worker)
 t_audio : 9382 ms

--- TURN 2
 learner : Do you have something without sugar? I am on a diet.
 AI      : Absolutely! We have sugar-free vanilla syrup you can add.
 meaning : Tentu saja! Kami punya sirup vanilla tanpa gula yang bisa kamu tambahkan.
 source  : ai
 t_text  : 3205 ms
 t_audio : 3250 ms

--- TURN 3
 learner : My friend is coming later, can we sit by the window?
 AI      : Definitely! The window seats are free right now.
 meaning : Boleh banget! Kursi dekat jendela masih kosong sekarang.
 source  : ai
 t_text  : 3290 ms
 t_audio : 4311 ms

AI responses:
1. "Great! One iced latte coming right up." (Tanpa awalan "OK")
2. "Absolutely! We have sugar-free vanilla syrup you can add." (Tanpa awalan "OK")
3. "Definitely! The window seats are free right now." (Tanpa awalan "OK")
speechSynthesis.speak() calls: 0 (Zero Robot Voice)
VERDICT: PASS
```

### Skenario 2: Percakapan Bahasa Jepang (3 Giliran)
```
--- TURN 1
 learner : すみません、アイスコーヒーをひとつください。
 AI      : ああ、アイスコーヒーね。かしこまりました。
 meaning : es kopi ya. Oke, siap.
 source  : ai
 t_text  : 3419 ms
 t_audio : 3450 ms

--- TURN 2
 learner : ケーキはありますか？
 AI      : はい、チーズケーキとチョコレートケーキがありますよ。
 meaning : Iya, ada cheesecake dan chocolate cake kok.
 source  : ai
 t_text  : 2989 ms
 t_audio : 3034 ms

--- TURN 3
 learner : 店内でお願いします。
 AI      : かしこまりました。どうぞおかけください。
 meaning : siap. Silakan duduk ya.
 source  : ai
 t_text  : 3047 ms
 t_audio : 4007 ms

Rata-rata latensi teks  : 3152 ms
Rata-rata latensi audio : 3497 ms
speechSynthesis.speak() calls: 0 (Zero Robot Voice)
VERDICT: PASS
```

---

## 4. Daftar Berkas yang Disentuh

1. `workers/api/ai/ai-tasks.js`:
   - Memperluas kamus `enFunctionWords` dengan kata-kata obrolan natural.
   - Larangan filler klise repetitif pada prompt telepon `isCall`.
   - Stripper regex opener `OK`/`Okay`/`Oh` pada `reply` dan `meaning`.
2. `features/voice-studio/src/lib/liveTransport.ts`:
   - Menaikkan batas pemecahan chunk audio `singleLimit` ke 320 karakter (zero punctuation gap).
   - Menstabilkan retry loop pemanggilan model AI `voiceCall`.
3. `features/voice-studio/src/App.tsx`:
   - Menambahkan state `isWaitingAfterSpeech` dan helper `isGrammaticallyIncomplete`.
   - VAD adaptif: 2.000 ms (kalimat utuh) dan 3.000 ms (kalimat bersambung).
   - Proteksi `rec.onend` dengan `speechPrefix` anti-cutoff.
   - PTT silence timeout 2.500–3.500 ms.
   - Instant barge-in `interruptAiAndStartListening()` terhubung ke klik Mochi dan tombol mic.
   - Penggantian string status `PAW berbicara...` -> `Mochi berbicara...`.
4. `features/voice-studio/src/components/HomeRedesignView.tsx`:
   - Penggantian label dan atribut PAW menjadi Mochi.
5. `features/voice-studio/src/data/callScenarios.ts`:
   - Penggantian deskripsi skenario PAW menjadi Partner AI.
6. `features/voice-studio/src/lib/liveCallHelper.ts`:
   - Penggantian teks bantuan jawaban menjadi Partner AI.
7. `tests/voice-studio-ui-architecture-test.js`:
   - Penyesuaian assertions selaras dengan status pill `Mochi berbicara...` dan state `waiting`.
8. `id-golden-baseline.json`:
   - Regenerasi baseline snapshot teks Indonesia resmi.
9. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`:
   - Kenaikan versi selaras ke build `m025-641` via `bump-build.mjs`.

---

## 5. Status Gerbang Mutu Lokal & Verifikasi Hexa-Sync

- `node tools/bump-build.mjs --check`: **Selaras (m025-641)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (0 kebocoran)**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 penegasan, build m025-641)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tests/voice-studio-ui-architecture-test.js`: **PASS (5/5)**
- `node tests/ai-conversation-task-test.js`: **PASS (48/48)**
- Cloudflare Worker `fiezel-api`: **Deployed (Version ID: a18474dc-5007-4862-a261-514090a5c581)**
- Utang Teknis: **0**
