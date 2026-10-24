# FIEZEL HANDOFF DOSSIER: Build m025-653
## Mitra Kaiwa & Kawan Bicara: Free Talk Real-Human Voice Architecture

- **Nomor Build**: `m025-653`
- **Tanggal**: 24 Oktober 2026
- **Status Mutu**: HIJAU / LULUS SEMUA GERBANG MUTU
- **Branch**: `feat/m025-653-voice-freetalk-clean`

---

### 1. Ringkasan Temuan Masalah & Penyebab Pokok (Root Cause Analysis)

1. **User Dipotong Prematur Saat Sedang Berpikir/Bernapas**:
   - *Penyebab*: `silenceWaitMs` pada live speech recognition disetel terlalu singkat (`380ms`), dan PTT auto-stop disetel `800ms`. Jeda alami manusia saat bernapas atau memikirkan kosakata bahasa Jepang/Inggris berkisar antara 600–1200ms. Ambang 380ms langsung memotong murid di tengah kata dan meluncurkan request/aizuchi.
   - *Perbaikan*: Dinaikkan menjadi `1800ms` (dan `2400ms` jika kalimat belum tuntas secara gramatika). Murid bebas mengambil nafas atau memikirkan kata tanpa pernah dipotong sepihak oleh AI.

2. **Permintaan Penghapusan Selector Topik & Ide Balasan**:
   - *Penyebab*: Top bar memuat dropdown `<select>` pemilih skenario yang membatasi murid ke skenario sempit (kafe/stasiun/ujian) dan memakan ruang vertikal. Begitu pula kartu rekomendasi jawaban (`BeginnerAnswerAssistant`) membuat layar telepon terasa seperti latihan kuis/contekan alih-alih telepon santai antar sahabat.
   - *Perbaikan*:
     - Menghapus `<select>` dropdown topik secara menyeluruh dari header.
     - Mengarahkan default percakapan ke **Free Talk / Percakapan Bebas** (`scen_ja_free_talk` untuk Jepang bersama Sensei Nanami, dan `scen_en_free_talk` untuk Inggris bersama Coach Alex).
     - Menghapus komponen `<BeginnerAnswerAssistant>` dan seluruh ide balasan agar ruang panggung bersih, lapang, dan fokus pada obrolan manusiawi.

3. **Scrolling Tanpa Batas & Bottom Bar Tidak Fixed Stay**:
   - *Penyebab*: Container luar menggunakan `min-h-screen` tanpa batas ketinggian (`100dvh`) dan tanpa `overflow-hidden`. Ditambah inner feed transcript memiliki `max-h-[280px] overflow-y-auto`, memicu nested scrollbar yang rusak di peramban seluler (iOS Safari/Android Chrome), menyebabkan bottom dock kendali mic/ketik terdorong ke bawah layar dan menghilang saat dialog bertambah panjang.
   - *Perbaikan*:
     - Mengunci viewport utama pada `h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col`.
     - Header atas disetel `shrink-0 sticky top-0 z-20`.
     - Container alur obrolan disetel `flex-1 min-h-0 overflow-y-auto overscroll-contain` sebagai satu-satunya elemen yang bergulir.
     - Bottom dock microphone & teks disetel `shrink-0 sticky bottom-0 z-30 bg-[#F6F3EC]/95 backdrop-blur-md border-t border-[#E8DFC8]/70 pb-[max(0.75rem,env(safe-area-inset-bottom))]` sehingga 100% fixed stay di dasar layar tanpa pernah bergeser atau hilang.

4. **Jawaban AI Rusak / Balasan Kafe & Ujian Kaku yang Tidak Relevan**:
   - *Penyebab*:
     a) Di `workers/api/ai/ai-tasks.js`, pemotongan `maxTokens = Math.min(maxTokens, 40)` memotong token kanji/hiragana Jepang dan tag terjemahan bahasa Indonesia di tengah jalan, membuat parsing respons gagal dan jatuh ke mode offline template.
     b) Di `liveTransport.ts`, `isGibberishJa` menandai kalimat Jepang apa pun yang tidak memuat kata kafe/senpai sebagai gibberish (`ok: false`), lalu fallback lokal memaksakan ceramah memesan kopi dengan partikel `を` ("なるほど！注文するときは助詞の「を」を使って...").
     c) Di `liveCallHelper.ts`, `generateDynamicContextualAiReply` tidak memiliki penanganan untuk `free_talk`, sehingga kalimat sapaan santai murid dijawab dengan memesan kopi panas ("かしこまりました！ホットコーヒーお一つですね。店内でお召し上がりですか...").
   - *Perbaikan*:
     - Mengubah `maxTokens` untuk `isCall` di Cloudflare Worker `ai-tasks.js` dari 40 menjadi 90 token.
     - Menghilangkan jebakan `isGibberishJa` dan `lacksPoliteEnding` pada `free_talk`.
     - Menambahkan cabang generator kontekstual cerdas multi-topik untuk Free Talk bahasa Jepang (Sensei Nanami) dan bahasa Inggris (Coach Alex) yang merespons hangat topik apa pun (sapaan, makanan, hobi/anime/musik, cuaca/liburan, kerjaan/lelah, lelucon, dan pertanyaan murid).

---

### 2. Bukti Pengujian Empiris (Playwright Headless Probe)

Skrip probe empiris: `tools/dev/probe-voice-freetalk-speed.mjs`
Hasil eksekusi nyata:
- `Topic select dropdown count: 0 (expected: 0)` -> LULUS
- `Header title text: "Mitra Kaiwa · Free Talk"` -> LULUS
- `BeginnerAnswerAssistant count: 0, suggestionCards: 0 (expected: 0)` -> LULUS
- `Root container classes: h-[100dvh] max-h-[100dvh] overflow-hidden` -> LULUS
- `Bottom dock classes: shrink-0 sticky bottom-0` -> LULUS
- `Turn diagnosis ok: true` -> LULUS
- `AI Live Reply JA: "こんにちは！すごく元気ですよ！今日はお話しできてとっても嬉しいです。今日はどんな一日でしたか？..."` (Bukan pesan kafe/ujian) -> LULUS
- `AI Live Reply EN: "Hey there! I'm doing awesome, thanks for asking! It is so great connecting with you today. How has your day been going?"` (Bukan remote work IELTS) -> LULUS
- `Page errors: 0` -> LULUS 100%

---

### 3. Daftar Berkas yang Disentuh

1. `features/voice-studio/src/App.tsx`:
   - Penyesuaian `silenceWaitMs` dan `pttSilenceWaitMs` ke 1800ms / 2400ms.
   - Penghapusan `<select>` dropdown topik, penggantian ke judul clean Free Talk.
   - Penghapusan `<BeginnerAnswerAssistant>` dan suggestion chips.
   - Penataan layout `100dvh overflow-hidden` dengan fixed bottom dock.
   - Default ke skenario `scen_ja_free_talk` dan `scen_en_free_talk`.
2. `features/voice-studio/src/lib/liveTransport.ts`:
   - Pengecualian pembatasan kafe/senpai pada `isGibberishJa` untuk Free Talk.
   - Pembaruan fallback ramah manusia tanpa ceramah memesan kopi di kafe.
3. `features/voice-studio/src/lib/liveCallHelper.ts`:
   - Penambahan percakapan alami Free Talk dinamis Sensei Nanami (JA) & Coach Alex (EN).
4. `workers/api/ai/ai-tasks.js`:
   - Peningkatan `maxTokens` telepon suara dari 40 ke 90 token.
5. `features/voice-studio/dist/voice-studio.js` & `dist/voice-studio.css`:
   - Hasil kompilasi bundel produksi Vite terbaru.
6. Berkas hexa-sync & audit:
   - `sw.js`, `core-config.js`, `coordination/BUILD-VERSION.json`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `id-golden-baseline.json`.

---

### 4. Status Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js` -> LULUS (HIJAU)
- `node tests/th-ui-leak-test.js` -> LULUS (HIJAU)
- `node tests/curriculum-cache-version-test.js` -> LULUS (HIJAU)
- `node tests/gate-registry-test.js` -> LULUS (HIJAU)
- `node tests/ai-conversation-task-test.js` -> LULUS (50/50 LULUS)
- `node tools/bump-build.mjs --check` -> LULUS (Selaras di m025-653)
