# FIEZEL HANDOFF DOSSIER: M025-645 — VOICE STUDIO FREE TALK, ANTI-ETTO FILLER & SPEED DUPLEX LATENCY

Tanggal: 24 Oktober 2026
Build: m025-645
Branch: fix/m025-641-voice-studio-anti-etto-speed
Target: main
Arbiter: node tools/bump-build.mjs "feat(voice-studio): m025-645 free talk open discussion mode, anti-etto filler & speed duplex latency"

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

### A. Fitur Baru: Free Talk (Pembahasan Bebas Tanpa Batas Topik)
* **Keluhan Pengguna**: Topic selama ini hanya ditentukan oleh skenario sistem (kafe, hotel, wawancara). Pengguna menginginkan mode *Free Talk* untuk bebas membahas apa saja (hobi, rencana, opini, cerita harian).
* **Solusi**:
  1. Menambahkan dua skenario baru di `features/voice-studio/src/data/callScenarios.ts`:
     - `scen_en_free_talk`: Obrolan Bebas Bersama Coach Alex (CEFR A1–B2).
     - `scen_ja_free_talk`: Kaiwa Bebas Bersama Sensei Nanami / 七海先生 (JLPT N5–N3).
  2. Kedua skenario disetel dengan `prereqCompetencyId: ''` sehingga tidak terkunci oleh prasyarat kosakata dan langsung "Siap Bicara".
  3. Menambahkan tombol filter `Free Talk (Bebas)` di `HomeRedesignView.tsx` bersanding dengan *Semua Jalur*, *Percakapan Harian*, dan *Opini & Akademik*.
  4. Penyesuaian relevansi dan evaluasi di `liveTransport.ts`: giliran pertama pada *Free Talk* tidak menuntut rumus kalimat kaku kafe/hotel.
  5. Pemetaan peran ke Cloudflare Worker `ai-tasks.js` otomatis mengarah ke `CONVERSATION_ROLES.free` ("a close friend having a relaxed everyday chat").

### B. Eliminasi "Etto" (ええと…) & Repetisi Pembuka "OK"
* **Akar Masalah**:
  - `playThinkingFiller()` di `App.tsx` memicu suara filler `ええと…` pada 650ms setelah murid bicara, memblokir balasan asli hingga 1.5 detik.
  - Model AI Cloudflare Worker sering mengawali giliran bahasa Inggris dengan klise "OK", "Okay", atau "Oh".
* **Solusi**:
  - `getThinkingFillers` mengembalikan array kosong `[]`.
  - Menghapus pemanggilan filler di `App.tsx` dan menghapus timer penahan balasan.
  - Menambahkan regex stripper deterministik anti-filler di `liveTransport.ts` dan `ai-tasks.js`:
    * Jepang: `/^(?:えっと|ええと|えーと|あの[ね]?|う[ー~]*ん|ああ|うん)[、,!\s・…〜~]*/`
    * Inggris: `/^(?:OK|Okay|Oh|Alright|Sure)[,!\s]+(?=[A-Za-z0-9])/i`

### C. Pangkas Latensi Jeda Tanda Baca & Respons Cepat (Speed Duplex)
* **Akar Masalah**:
  - Teks balasan sebelumnya dipecah perkata tanda baca (`!`, `?`, `.`), lalu masing-masing chunk diaudiokan secara berurutan. Antara kalimat pertama dan kedua terjadi jeda hening 1.5-2.5 detik.
  - VAD hening menunggu hingga 2000-3000ms sebelum menganggap murid selesai bicara.
* **Solusi**:
  - Batas chunking audio diperluas (`singleLimit = 320` karakter) sehingga kalimat percakapan disintesis utuh satu aliran suara dengan prosodi alami Edge-TTS tanpa jeda buatan.
  - Edge-TTS disintesis secara paralel di dalam `resolveAiReply` sehingga saat teks siap ditampilkan, audionya sudah tersedia tanpa fetch delay tambahan.
  - Timeout keheningan VAD dipangkas menjadi **850ms** untuk kalimat lengkap dan **1400ms** untuk jeda koma/konjungsi.

---

## 2. Bukti Pengujian Empiris (Probe-Driven Audit)

Eksekusi probe mandiri `tools/dev/probe-freetalk-speed.mjs` terhadap API produksi Cloudflare Worker:
```text
=== FIEZEL VOICE STUDIO FREE TALK & ANTI-ETTO SPEED PROBE ===

✓ Found scen_en_free_talk: Free Talk: Obrolan Bebas Bersama Coach Alex (prereq: none)
✓ Found scen_ja_free_talk: Free Talk: Obrolan Bebas Bersama Sensei Nanami (フリートーク) (prereq: none)

--- Authenticating anonymous session ---
✓ Auth status: 200 (cookie received)

--- Testing Japanese Turn (Anti-Etto check) ---
Latency: 3349ms
Reply: "そうだね、本当にいい天気！ 私はカフェで本を読むかも。"
Translation: "Iya, beneran cuaca bagus! Aku mungkin baca buku di kafe."
✓ Anti-filler check passed (Zero banned opener detected)

--- Testing English Turn (Anti-OK check) ---
Latency: 3268ms
Reply: "That’s so cool! I’m really into baking, especially cookies."
Translation: "Keren banget! Aku lagi suka banget bikin kue, apalagi cookies."
✓ Anti-filler check passed (Zero banned opener detected)

======================================================
ALL PROBE CHECKS PASSED: Free talk & Anti-Etto verified!
======================================================
```

---

## 3. Berkas yang Disentuh & Perubahan

1. `features/voice-studio/src/types/voiceCall.ts`:
   - `prereqCompetencyId?: string` dibuat opsional.
2. `features/voice-studio/src/lib/braincore.ts`:
   - `checkPrerequisiteStatus` dan `recordVocabPrereqMastery` mendukung skenario tanpa prasyarat (`!prereqCompetencyId` mengembalikan `isReady: true`).
3. `features/voice-studio/src/data/callScenarios.ts`:
   - Menambahkan skenario `scen_en_free_talk` dan `scen_ja_free_talk`.
4. `features/voice-studio/src/components/HomeRedesignView.tsx`:
   - `type ScenarioFilter = 'all' | 'free' | 'daily' | 'academic'`.
   - Menambahkan filter pill `Free Talk (Bebas)`.
5. `features/voice-studio/src/lib/liveTransport.ts`:
   - Anti-filler stripper untuk Jepang (`えっと`/`ええと`) dan Inggris (`OK`/`Okay`).
   - Relevansi Free Talk dibebaskan dari syarat kaku kafe/hotel.
   - Pipelining TTS paralel di `resolveAiReply`.
   - `splitIntoSpeechChunks` tidak memecah kalimat pendek untuk mencegah jeda canggung antar tanda baca.
6. `features/voice-studio/src/App.tsx`:
   - VAD timeout dioptimalkan (850ms / 1400ms).
   - Menghapus pemanggilan filler dan latency hold.
7. `features/voice-studio/dist/voice-studio.js`:
   - Kompilasi ulang Vite (859.90 kB) menyertakan seluruh pembaruan.
8. `workers/api/ai/ai-tasks.js`:
   - Prompt anti-repetisi dan anti-filler pembuka giliran, `maxTokens` dioptimalkan 85 token.
9. `tools/dev/probe-freetalk-speed.mjs`:
   - Skrip probe empiris untuk menguji Free Talk dan anti-filler.
10. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`:
    - Sinkronisasi build hexa-sync ke `m025-645`.
11. `id-golden-baseline.json`:
    - Pembaruan baseline emas snapshot Indonesia.

---

## 4. Status Kelulusan Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js`: PASS
- `node tests/th-ui-leak-test.js`: PASS (4498 kunci id selaras th)
- `node tests/curriculum-cache-version-test.js`: PASS (33 penegasan, 3 halaman, build m025-645)
- `node tests/gate-registry-test.js`: PASS (10/10 pass)
- `node tests/voice-studio-ui-architecture-test.js`: PASS (5/5 pass)
- `node tests/ai-conversation-task-test.js`: PASS (50/50 pass)
- `node tools/bump-build.mjs --check`: PASS (Selaras m025-645)

---

## 5. Langkah Berikutnya (Next Steps & Roadmap)

1. Pantau alur CI GitHub Actions (`FIEZEL Quality Gate` dan `FIEZEL Deploy Site`) hingga 100% hijau.
2. Gabungkan Pull Request #706 ke branch `main` via squash merge.
3. Verifikasi live di production `https://fiezel.my.id/app/coordination/BUILD-VERSION.json` bahwa build `m025-645` telah terpasang aktif.
4. Lakukan smoke test panggilan suara interaktif langsung di perangkat seluler pada mode Free Talk dan percakapan kafe.
