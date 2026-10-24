# FIEZEL-M025637 — Mitra Kaiwa / Kawan Bicara: Voice-First 3D Mochi UI/UX Redesign, Honest Real-AI Turn Pipeline & SEA-LION v4 27B Voice Call Model

## 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Riset & Redesign Total Antarmuka Voice-First dengan Maskot 3D Mochi**:
   - **Single Unified Top Bar**: Menggabungkan tombol kembali, *pill* pemilih skenario (`<select>`), *toggle* `EN | JA`, persentase BKT, dan pengaturan API Key ke dalam satu baris navigasi atas tanpa bingkai kotak berlapis.
   - **Centered Voice Call Stage + 3D Mochi Mascot (`FiezelMochi`)**: Memasang maskot **3D Volumetric Daifuku Mochi** (`./mochi-mascot/fiezel-mochi.js`) di tengah panggung panggilan (`data-testid="mochi-3d-stage"`) lengkap dengan status berpikir (`isAiThinking`, aura biru, `chat_blue`, kibasan telinga, indikator `Mochi sedang berpikir…`), *open live subtitle spotlight*, serta kontrol panggilan berbentuk *pill* (`rounded-full`).
   - **Full-Width Interactive Reply Cards (`BeginnerAnswerAssistant.tsx`)**: Merombak *Ide Balasan* menjadi 3 kartu bersih dengan lebar penuh 100% untuk kalimat target & cara baca, diikuti arti bahasa Indonesia dan tombol bulat `[🔊] [🎙️] [Pakai]` di baris bawah.
   - **Floating Pill Composer Dock**: Mengubah bilah input bawah menjadi satu kapsul mengambang (`rounded-full`) berisi tombol `Bicara`, kolom ketik, dan tombol `Kirim`.
2. **Pipa Percakapan Jujur (Zero Silent Template Swap) & Model Khusus Telepon (`MODELS.voiceCall`)**:
   - Menghapus `FAST_AI_BUDGET_MS = 850` di [`liveTransport.ts`](file:///c:/Users/hp/fiezel-apps/features/voice-studio/src/lib/liveTransport.ts) yang sebelumnya memotong panggilan AI nyata setelah 850 ms dan menggantinya secara diam-diam dengan kalimat template lokal.
   - Memisahkan alur giliran menjadi `evaluateTurnLocal` (penilaian tata bahasa & BKT instan untuk ucapan murid sendiri) dan `resolveAiReply` (menunggu balasan partner AI nyata dari `/api/ai/task` dan menandai `replySource: 'ai' | 'ai-gemini-key' | 'offline-template'`). Jika jaringan benar-benar terputus, antarmuka menampilkan label jujur `Mode offline · kalimat latihan, bukan AI` (`data-testid="live-hud-offline-label"`).
   - Menambahkan `MODELS.voiceCall` (`@cf/aisingapore/gemma-sea-lion-v4-27b-it`, `usedByTasks: 'conversation_turn:call'`, `pedagogicallyTrusted: false`) di [`workers/api/ai/ai-tasks.js`](file:///c:/Users/hp/fiezel-apps/workers/api/ai/ai-tasks.js) dan [`workers/api/ai/route-ai.js`](file:///c:/Users/hp/fiezel-apps/workers/api/ai/route-ai.js) dengan format `{ messages: [{ role: 'user', content: prompt }], max_tokens: 140 }` agar server vLLM Workers AI menerapkan *chat template* secara penuh (0 `empty_output`, 10/10 lulus kontrak pada Bahasa Inggris & Jepang).
   - Mengoptimalkan antrean **Neural Edge TTS** di [`App.tsx`](file:///c:/Users/hp/fiezel-apps/features/voice-studio/src/App.tsx) agar kalimat balasan pendek (`<= 120` karakter EN / `<= 60` karakter JA) disintesis dalam 1 permintaan utuh (selaras dengan *cache* kalimat pembuka) disertai *filler* suara pendek (`Hmm, okay…` / `えーと…`) saat Mochi berpikir.
3. **Cache-Busting & Visibilitas Pembaruan (`m025-637`)**:
   - Menambahkan `?v=m025-637` pada `voice-studio.css` dan `voice-studio.js` di [`call.html`](file:///c:/Users/hp/fiezel-apps/call.html) dan [`features/voice-studio/call.html`](file:///c:/Users/hp/fiezel-apps/features/voice-studio/call.html), mengintegrasikan ke [`tools/bump-build.mjs`](file:///c:/Users/hp/fiezel-apps/tools/bump-build.mjs), menyetel strategi *network-first* untuk `call.html`/`voice-studio.*` di [`sw.js`](file:///c:/Users/hp/fiezel-apps/sw.js), serta menaikkan `#updateBanner` ke `z-index: 10020`.

## 2. Bukti Pengujian Empiris 6 Giliran (Playwright Headless Probe)
Dieksekusi melalui `node tools/dev/mitra-kaiwa-live-voice-ai-probe.mjs` terhadap Worker produksi `https://api.fiezel.my.id/api/ai/task`:

| Bahasa | Giliran | Kalimat Murid | Balasan Partner AI Nyata (`source: ai`) | Arti Bahasa Indonesia | `t_text` | `t_audio` |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **EN** | 1 | *Hi, I would like an iced latte please.* | *Oh, nice choice! Coming right up.* | *Oh, pilihan yang bagus! Sebentar ya, aku buatkan.* | 6582 ms | 8263 ms |
| **EN** | 2 | *Do you have something without sugar? I am on a diet.* | *Oh, absolutely! We have sugar-free vanilla syrup.* | *Oh, tentu saja! Kami punya sirup vanila tanpa gula.* | 7560 ms | 8333 ms |
| **EN** | 3 | *My friend is coming later, can we sit by the window?* | *Sure, if a table is free when you both arrive!* | *Tentu, kalau ada meja kosong saat kamu berdua datang!* | 3266 ms | 4239 ms |
| **JA** | 1 | すみません、アイスコーヒーをひとつください。 | ああ、アイスコーヒーね。かしこまりました。 | *Oh, es kopi ya. Oke deh.* | 6140 ms | 9055 ms |
| **JA** | 2 | ケーキはありますか？ | はい、チーズケーキとチョコレートケーキがありますよ。 | *Iya, ada kue keju dan kue cokelat kok.* | 3920 ms | 5062 ms |
| **JA** | 3 | 店内でお願いします。 | ああ、店内ですね。かしこまりました！ | *Oh, di dalam toko ya. Oke!* | 4234 ms | 5202 ms |

- `speechSynthesis.speak() calls: 0` (`VERDICT zero robot voice: PASS`)
- `replies from real AI: 3/3 (EN) & 3/3 (JA)` (`VERDICT every reply is AI: PASS`)
- `VERDICT every reply voiced: PASS (3/3 EN & 3/3 JA)`

## 3. Daftar Berkas yang Disentuh
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` (`m025-637`)
- `tools/bump-build.mjs` & `tests/curriculum-cache-version-test.js`
- `features/interactive-chat/fiezel-interactive-chat.js`, `style.css`, `features/ui/fiezel-update-prompt.js`
- `features/voice-studio/src/App.tsx`, `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx`, `features/voice-studio/src/index.css`
- `features/voice-studio/src/lib/liveTransport.ts`, `features/voice-studio/src/lib/liveCallHelper.ts`, `features/voice-studio/src/types/voiceCall.ts`
- `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css`
- `workers/api/ai/ai-tasks.js` & `workers/api/ai/route-ai.js`
- `tests/ai-task-contract-test.js` & `tests/ai-response-shape-test.js`
- `tools/dev/mitra-kaiwa-live-voice-ai-probe.mjs`
- `tests/snapshots/id-ui-golden.json`

## 4. Status Gerbang Mutu Lokal
- `node tools/bump-build.mjs --check` -> **PASS (Selaras m025-637)**
- `node tests/ai-task-contract-test.js` -> **PASS**
- `node tests/ai-response-shape-test.js` -> **PASS**
- `node tests/ai-conversation-task-test.js` -> **PASS (48/48)**
- `node tests/voice-studio-ui-architecture-test.js` -> **PASS (5/5)**
- `node tests/id-golden-snapshot-test.js` -> **PASS**
- `node tests/th-ui-leak-test.js` -> **PASS**
- `node tests/curriculum-cache-version-test.js` -> **PASS**
- `node tests/gate-registry-test.js` -> **PASS**
