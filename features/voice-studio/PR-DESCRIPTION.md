# Pull Request: `feat/voice-call-studio-ui` → `main`

## Ringkasan Perubahan
PR ini menambahkan sub-modul **FIEZEL AI Voice Call Studio** secara **100% terisolasi** di dalam direktori `features/voice-studio/` dan halaman dedicated `call.html`, tanpa menyentuh atau mengubah satu pun berkas root Vanilla PWA (`index.html`, `package.json`, `sw.js`, `core-config.js`, maupun `app.js`).

## Kepatuhan Arsitektur & Integritas Root
1. **Zero Root Mutation**:
   - `index.html`, `package.json`, `sw.js`, dan `core-config.js` di root repositori **TIDAK DISENTUH SAMA SEKALI**.
2. **Isolasi Direktori Penuh (`features/voice-studio/` & `call.html`)**:
   - Seluruh kode sumber React + TypeScript, styling Tailwind, dan hasil bundle produksi (`voice-studio.js` & `voice-studio.css`) berada di dalam `features/voice-studio/`.
   - Dapat diakses langsung melalui halaman dedicated `call.html` (`https://fiezel.my.id/app/call.html`), di-mount sebagai Web Component `<fiezel-voice-studio>`, atau di-embed via `<fiezel-voice-studio-frame>` (`features/voice-studio/fiezel-voice-studio-embed.js`).
   - Membaca preferensi bahasa (`fz_target_course`, `fiezel-v4-state`) secara *read-only* dan meneruskan telemetri ke `IndexedDB` (`fiezel-learning-queue-v1`) serta `window.parent.postMessage` tanpa memutus alur `localStorage` atau `IndexedDB` yang sudah ada.
3. **Arsitektur Koneksi Suara Fleksibel (Cloudflare Worker WSS + Turn-by-Turn Fallback)**:
   - **Primary Duplex Streaming**: Menghubungi proxy Cloudflare Worker WebSocket `wss://fiezel.my.id/api/live-call` (`gemini-3.8-live` / PCM16 16kHz in, 24kHz out).
   - **Automatic Fallback**: Jika WebSocket live tidak terhubung atau berjalan di lingkungan statis cPanel, otomatis beralih tanpa memutus panggilan ke mode **Turn-by-Turn Audio** menggunakan endpoint Edge TTS produksi FIEZEL (`self.FIEZEL_TTS_CONFIG.endpoint` / `/api/tts/line`), Gemini Audio REST, dan evaluator pedagogis Braincore sisi klien.

## Daftar File yang Ditambahkan
- `call.html`
- `features/voice-studio/call.html`
- `features/voice-studio/fiezel-voice-studio-embed.js`
- `features/voice-studio/vite.voice-studio.config.ts`
- `features/voice-studio/PR-DESCRIPTION.md`
- `features/voice-studio/worker/cloudflare-live-call-worker.js`
- `features/voice-studio/dist/voice-studio.js`
- `features/voice-studio/dist/voice-studio.css`
- `features/voice-studio/src/main.tsx`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/src/index.css`
- `features/voice-studio/src/types/voiceCall.ts`
- `features/voice-studio/src/data/callScenarios.ts`
- `features/voice-studio/src/lib/braincore.ts`
- `features/voice-studio/src/lib/i18n.ts`
- `features/voice-studio/src/lib/liveCallHelper.ts`
- `features/voice-studio/src/lib/liveTransport.ts`
- `features/voice-studio/src/lib/sfx.ts`
- `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx`
- `features/voice-studio/src/components/BraincoreTrendChart.tsx`
- `features/voice-studio/src/components/HomeRedesignView.tsx`
- `features/voice-studio/src/components/SpeakingProgressDashboard.tsx`
