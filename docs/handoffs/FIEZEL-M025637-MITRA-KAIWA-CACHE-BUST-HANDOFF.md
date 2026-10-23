# FIEZEL-M025636 — Mitra Kaiwa / Kawan Bicara: Voice-First 3D Mochi UI/UX Redesign, ~1.0s Parallel Neural Response & Cache-Busting

## 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Riset & Redesign Total Antarmuka Voice-First dengan Maskot 3D Mochi**:
   - **Akar Masalah Sebelumnya**: Tampilan lama maupun iterasi awal masih menumpuk 4–5 kotak berbingkai secara vertikal (*box-in-box soup*: kotak skenario terpisah, kotak kartu panggilan dengan sub-kotak di dalamnya, kotak saran balasan dengan 3 kotak sempit di dalamnya, kotak riwayat, dan kotak input bawah), ditambah ikon kucing kuning 2D statis yang tidak selaras dengan maskot **3D Mochi** di halaman utama.
   - **Solusi Berbasis Riset UI/UX (Speak App, ChatGPT Voice, Apple FaceTime Audio & Mochi 3D Companion)**:
     - **Single Unified Top Bar**: Menggabungkan tombol kembali, *pill* pemilih skenario (`<select>`), *toggle* `EN | JA`, persentase BKT, dan pengaturan API Key ke dalam satu baris navigasi atas yang bersih tanpa bingkai kotak berlapis.
     - **Centered Voice Call Stage + 3D Mochi Mascot (`FiezelMochi`)**: Memasang maskot **3D Volumetric Daifuku Mochi** (`./mochi-mascot/fiezel-mochi.js`) secara langsung di tengah panggung panggilan (`data-testid="mochi-3d-stage"`) di atas latar travertine hangat (`from-[#FAF5EB] to-white`) lengkap dengan *badge* `chat_purple`, ekspresi dinamis, kibasan telinga, serta lompatan halus saat AI berbicara/mendengarkan.
     - **Open Live Subtitle Spotlight**: Menampilkan kalimat partner AI dan terjemahannya secara terbuka dan terpusat di bawah maskot 3D Mochi tanpa kotak dalam kotak, diikuti kontrol panggilan berbentuk *pill* (`rounded-full`).
     - **Full-Width Interactive Reply Cards (`BeginnerAnswerAssistant.tsx`)**: Merombak *Ide Balasan* menjadi 3 kartu bersih tanpa kotak pembungkus luar, di mana kalimat target dan cara baca mendapatkan lebar penuh 100% (tidak terjepit kolom tombol di layar seluler 412px), sementara arti bahasa Indonesia berdampingan rapi dengan tombol bulat `[🔊] [🎙️] [Pakai]` di baris bawah.
     - **Floating Pill Composer Dock**: Mengubah bilah input bawah menjadi satu kapsul mengambang (`rounded-full`) berisi tombol `Bicara`, kolom ketik tanpa garis tepi dalam, dan tombol `Kirim`.
2. **Akselerasi Kecepatan Balasan (~1.0 Detik, Turun 6x dari ~6.2 Detik)**:
   - Di [`liveTransport.ts`](file:///c:/Users/hp/fiezel-apps/features/voice-studio/src/lib/liveTransport.ts), sintesis suara **Neural Edge TTS** dijalankan secara paralel (`_ttsInFlight` deduplication) sejak `t = 0ms` bersama pemanggilan mitra AI (`FAST_AI_BUDGET_MS = 850ms`) tanpa memblokir pembaruan antarmuka.
   - Hasil pengukuran empiris Playwright menunjukkan waktu respons antarmuka turun dari **6155 ms** menjadi **984 ms (EN)** dan **1047 ms (JA)** dengan **0 panggilan robot TTS peramban** (`speechSynthesis = 0`).
3. **Cache-Busting & Visibilitas Pembaruan (`m025-636`)**:
   - Menambahkan `?v=m025-636` pada `voice-studio.css` dan `voice-studio.js` di [`call.html`](file:///c:/Users/hp/fiezel-apps/call.html) dan [`features/voice-studio/call.html`](file:///c:/Users/hp/fiezel-apps/features/voice-studio/call.html), mengintegrasikan ke [`tools/bump-build.mjs`](file:///c:/Users/hp/fiezel-apps/tools/bump-build.mjs), menyetel strategi *network-first* untuk `call.html`/`voice-studio.*` di [`sw.js`](file:///c:/Users/hp/fiezel-apps/sw.js), serta menaikkan `#updateBanner` ke `z-index: 10020`.

## 2. Bukti Pengujian Empiris (Playwright Headless Probe)
Dieksekusi melalui `node tools/dev/mitra-kaiwa-live-voice-ai-probe.mjs`:
- **Bahasa Inggris (`en`, Coach Alex)**:
  - `Reply latency (ms): 984`
  - `speechSynthesis.speak() calls: 0 []` (`VERDICT zero robot voice: PASS`)
  - `VERDICT neural MP3 plays: 2` (`VERDICT neural TTS audible: PASS`)
  - `VERDICT real AI reply: PASS`
- **Bahasa Jepang (`ja`, Sensei Nanami)**:
  - `Reply latency (ms): 1047`
  - `AI reply text (HUD): かしこまりました！アイスコーヒーお一つですね。店内でお召し上がりですか、それともお持ち帰りですか？`
  - `speechSynthesis.speak() calls: 0 []` (`VERDICT zero robot voice: PASS`)
  - `VERDICT neural MP3 plays: 2` (`VERDICT neural TTS audible: PASS`)
  - `VERDICT real AI reply: PASS`

## 3. Daftar Berkas yang Disentuh
- `coordination/BUILD-VERSION.json` (`m025-636`)
- `sw.js` (`SW_REV = 'm025-636'` + network-first untuk `call.html` & `voice-studio.*`)
- `core-config.js` (`FIEZEL_PAGE_BUILD = 'm025-636'`)
- `features/neural-voice/fiezel-diag-panel.js` (`DIAG_BUILD = 'm025-636'`)
- `kurikulum.html` & `misi.html` (`?v=m025-636`)
- `call.html` & `features/voice-studio/call.html` (`?v=m025-636`)
- `tools/bump-build.mjs` & `tests/curriculum-cache-version-test.js`
- `features/interactive-chat/fiezel-interactive-chat.js`
- `style.css` & `features/ui/fiezel-update-prompt.js`
- `features/voice-studio/src/App.tsx` (Voice-First UI + 3D Mochi Mascot stage + floating pill dock)
- `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx` (Full-width clean reply cards)
- `features/voice-studio/src/index.css`
- `features/voice-studio/src/lib/liveTransport.ts` (`_ttsInFlight` deduplication + parallel `850ms` response)
- `features/voice-studio/src/lib/liveCallHelper.ts` (Context-aware Japanese & English cafe order matching)
- `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css`
- `tools/dev/mitra-kaiwa-live-voice-ai-probe.mjs`
- `tests/snapshots/id-ui-golden.json`

## 4. Status Gerbang Mutu Lokal
- `node tools/bump-build.mjs --check` -> **PASS (Selaras m025-636)**
- `node tests/id-golden-snapshot-test.js` -> **PASS**
- `node tests/th-ui-leak-test.js` -> **PASS**
- `node tests/curriculum-cache-version-test.js` -> **PASS**
- `node tests/gate-registry-test.js` -> **PASS**
- `node tests/voice-studio-ui-architecture-test.js` -> **PASS (5/5)**
