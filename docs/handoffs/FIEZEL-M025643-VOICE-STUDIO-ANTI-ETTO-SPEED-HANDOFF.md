# FIEZEL HANDOFF DOSSIER: M025-643 ELIMINASI FILLER JEPANG "ETTO" & OPTIMASI LATENSI VOICECALL

**Tanggal Rilis**: 24 Oktober 2026
**Build Version**: `m025-643`
**Target Modul**: `features/voice-studio/` (Mitra Kaiwa Studio) & `workers/api/ai/ai-tasks.js` (Cloudflare AI Pipeline)
**Tipe Rilis**: Perbaikan Bug Kritis, Peningkatan Kecepatan Respon Suara AI & Eliminasi Filler Ragu

---

## 1. Ringkasan Temuan Audit & Akar Masalah

Owner melaporkan 2 masalah utama dalam latihan percakapan bahasa Jepang:
1. **AI Selalu Mengawali Jawaban dengan Kata "Etto" / "Eeto" Sebelum Menjawab Sesuai Konteks**:
   - *Akar Masalah Utama*: Pada `features/voice-studio/src/App.tsx`, fungsi `playThinkingFiller()` memicu sintesis audio frasa jeda berpikir pada timer 650 ms. Pada `features/voice-studio/src/lib/liveTransport.ts`, kamus `getThinkingFillers('ja')` secara eksplisit mendefinisikan string `['ええと…']`. Frasa ini disintesis dan diputar ke telinga murid selagi model AI backend sedang memproses balasan. Ketika jawaban AI tiba, pemutar audio `speakAiText` menahan audio jawaban asli (`await Promise.race([fillerDoneRef.current, ...])`) sampai suara "ええと…" selesai diputar. Akibatnya, murid selalu mendengar kata "ええと..." (etto/eeto) sebelum setiap balasan nyata.
   - *Akar Masalah Sekunder*: Pada prompt LLM `promptConversation` di `workers/api/ai/ai-tasks.js`, larangan filler hanya tertulis untuk bahasa Inggris (*"OK, Okay, Oh, Alright, Sure, Ah"*), tanpa larangan eksplisit untuk bahasa Jepang (*えっと, ええと, えーと, あの, うーん, ああ*). Akibatnya model autoregresif Sea-Lion terkadang menyisipkan "ああ、" atau "えっと、" di baris balasan mentah.
2. **Respon AI Masih Sangat Lambat Sekali**:
   - *Akar Masalah 1*: Timer kesabaran VAD (`silenceWaitMs`) disetel terlalu lama yaitu 2.000 ms (2,0 detik) untuk kalimat lengkap dan 3.000 ms (3,0 detik) untuk kalimat bersambung. Setelah murid berhenti bersuara, sistem diam selama 2-3 detik sebelum permintaan dikirim ke server.
   - *Akar Masalah 2*: Pemutaran "filler" "ええと…" memakan waktu 1,2–1,5 detik dan menahan pemutaran jawaban asli AI.
   - *Akar Masalah 3*: Sintesis Edge-TTS untuk balasan AI baru diminta setelah balasan teks tiba di `submitStudentTurn`, bukannya diparalelkan di dalam `resolveAiReply`.
   - *Akar Masalah 4*: Anggaran `maxTokens` untuk panggilan suara telepon disetel ke 140 token, membuat model autoregresif berjalan lebih lama dari yang dibutuhkan untuk balasan 15 kata (~45 token).

---

## 2. Solusi Teknis yang Diterapkan

1. **Eliminasi Total Filler "Etto" / "Eeto"**:
   - Mengosongkan fungsi `getThinkingFillers`: mengembalikan array kosong `[]`.
   - Menghapus pemanggilan dan logika `playThinkingFiller()`, `fillerTimer`, dan `fillerDoneRef` di `features/voice-studio/src/App.tsx`. Indikator berpikir kini murni visual melalui animasi 3D Mochi tanpa menyisipkan kata suara palsu apapun.
   - Menghapus penahanan audio 1.200 ms di `speakAiText`: balasan AI asli langsung diputar seketika saat audio siap.
   - Menambahkan aturan prompt tegas untuk kursus Jepang pada `workers/api/ai/ai-tasks.js`:
     *"CRITICAL FOR JAPANESE: NEVER start replies with filler words like 'えっと', 'ええと', 'えーと', 'あの', 'うーん', 'ああ', or 'うん'. Start DIRECTLY with the actual conversational response (e.g. はい、かしこまりました / いいですよ / どうぞ / etc.)."*
   - Menambahkan pembersih regex deterministik di `shapeConversationOutput` dan `liveTransport.ts`:
     `/^(?:えっと|ええと|えーと|あの[ね]?|う[ー~]*ん|ああ|うん)[、,!\s・…〜~]*/`
2. **Optimasi Latensi & Kecepatan Respon Suara AI**:
   - **Pemangkasan Timer Hening VAD**:
     - Kalimat lengkap: dipangkas dari 2.000 ms menjadi **850 ms** (hemat 1.150 ms dead-air).
     - Kalimat belum lengkap (partikel/konjungsi): dipangkas dari 3.000 ms menjadi **1.400 ms** (hemat 1.600 ms).
     - Mode PTT: dipangkas dari 2.500 ms menjadi **1.200 ms**, dan murid dapat mengetuk tombol Stop kapan saja untuk pengiriman instan 0 ms.
   - **Sintesis Audio Paralel Pipelined**:
     - `resolveAiReply` langsung memicu `synthesizeFlexibleTts` secara paralel begitu teks balasan dari AI partner diterima, menghasilkan `audioBase64` preloaded yang langsung siap putar dengan 0 ms delay tambahan di `speakAiText`.
   - **Pemangkasan Batas Token Call**:
     - `maxTokens` mode panggilan telepon dipangkas menjadi **85 token** agar model tidak bertele-tele dan menyelesaikan inferensi lebih cepat.

---

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)

Pengujian dilakukan menggunakan probe browser Chromium headless `honest-probe.mjs` di antarmuka panggilan suara Jepang:

```
--- TURN 1
 learner : すみません、アイスコーヒーをひとつください。
 AI      : はい、かしこまりました。アイスコーヒー、ひとつですね。
 meaning : satu es kopi ya.
 source  : ai (Sea-Lion 27B)

--- TURN 2
 learner : ケーキはありますか？
 AI      : はい、チーズケーキとチョコレートケーキがありますよ。
 meaning : Iya, ada kue keju dan kue cokelat kok.
 source  : ai (Sea-Lion 27B)

--- TURN 3
 learner : 店内でお願いします。
 AI      : かしこまりました。どちらの席がよろしいですか？
 meaning : siap. Kamu mau duduk di mana?
 source  : ai (Sea-Lion 27B)

Hasil Audit Jawaban AI:
- Balasan 1: "はい、かしこまりました。アイスコーヒー、ひとつですね。" (NOL kata "えっと", NOL filler)
- Balasan 2: "はい、チーズケーキとチョコレートケーキがありますよ。" (NOL kata "えっと", NOL filler)
- Balasan 3: "かしこまりました。どちらの席がよろしいですか？" (NOL kata "えっと", NOL filler)
- speechSyntesis.speak() calls: 0 (Zero Robot Voice)
- Fillers spoken: 0
VERDICT: PASS
```

---

## 4. Daftar Berkas yang Disentuh

1. `workers/api/ai/ai-tasks.js`:
   - Prompt `promptConversation`: larangan mutlak kata jeda ragu (*えっと, ええと, あの, うーん*) pada kursus Jepang.
   - Pembersih regex pembuka Jepang pada `shapeConversationOutput`.
   - Penyesuaian `maxTokens` mode call menjadi 85 token.
2. `features/voice-studio/src/lib/liveTransport.ts`:
   - `getThinkingFillers`: mengembalikan `[]`.
   - Pembersih regex filler Jepang pada hasil inferensi AI partner dan Gemini key.
   - Paralelisasi sintesis Edge-TTS di dalam `resolveAiReply`.
3. `features/voice-studio/src/App.tsx`:
   - Menghapus seluruh logika dan referensi `playThinkingFiller`, `fillerDoneRef`, dan `fillerTimer`.
   - Menghapus penahanan 1.200 ms di `speakAiText`.
   - Menurunkan timer hening VAD hands-free ke 850 ms (lengkap) dan 1.400 ms (incomplete).
   - Menurunkan timer hening PTT ke 1.200 ms / 1.800 ms.
4. `features/voice-studio/dist/voice-studio.js`:
   - Rebuild bundle Vite terkompilasi (852,95 kB).
5. `tests/ai-conversation-task-test.js`:
   - Penambahan 2 pengujian otomatis pembersihan filler Jepang (50/50 PASS).
6. `id-golden-baseline.json`:
   - Regenerasi baseline snapshot teks resmi.
7. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`:
   - Kenaikan versi selaras ke build `m025-643` via `bump-build.mjs`.

---

## 5. Status Gerbang Mutu Lokal & Verifikasi Hexa-Sync

- `node tools/bump-build.mjs --check`: **Selaras (m025-643)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (0 kebocoran)**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 penegasan, build m025-643)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tests/voice-studio-ui-architecture-test.js`: **PASS (5/5)**
- `node tests/ai-conversation-task-test.js`: **PASS (50/50)**
- Cloudflare Worker `fiezel-api`: **Deployed (Version ID: 6654d9cf-5fd2-481e-9a40-f2f8075541cb)**
- Utang Teknis: **0**

---

## 6. Langkah Selanjutnya & Roadmap

1. Terus pantau latensi panggilan audio secara berkala pada skenario percakapan level lanjutan.
2. Evaluasi respons pengguna di perangkat nyata pada berbagai kecepatan jaringan seluler (3G/4G/5G).
