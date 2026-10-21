# FIEZEL m025-628 · Voice Studio & Beginner Phonetic Answer Assistant Handoff

**Tanggal:** 2026-10-22
**Build:** `m025-628` (Hexa-Sync Arbiter certified)
**Branch:** `feat/voice-call-studio-assistant-m025-628`
**Otoritas:** FIEZEL Architectural Integrity & Braincore Pedagogical Authority

---

## 1. Ringkasan & Tujuan Perubahan

Mengintegrasikan fitur-fitur baru dari Google AI Studio (`fiezel-apps (2).zip`) ke dalam lingkungan produksi FIEZEL PWA secara terisolasi tanpa merusak cangkang Vanilla PWA utama (`index.html`, `package.json`, `sw.js`, `core-config.js`):

1. **Bantuan Cara Jawab Realtime (Pemula)**:
   - Menyediakan 3 opsi kartu jawaban kontekstual dinamis (`accurate`, `misconception`, `incomplete`).
   - Dilengkapi panduan cara baca fonetik berbahasa Indonesia bersuku kata ber-tanda hubung (misal: *"Aid laik en aist la-tei, plis. Af-ter kof-fi, aim mi-ting mai tim tu pri-per aur pre-zen-tei-shen."*).
   - Dilengkapi terjemahan kontekstual bahasa Indonesia dan Thai.
   - Tombol interaktif untuk menguji langsung respon murid atau mendengarkan lafal.
2. **Sub-Modul AI Voice Studio Terisolasi (`call.html` & `features/voice-studio/`)**:
   - Arsitektur berbasis Vite + React 19 + Tailwind v4 + Recharts terisolasi di folder `features/voice-studio/`.
   - Mengimplementasikan Gemini Live duplex audio (`WebSocketPair` via Cloudflare Worker `wss://fiezel.my.id/api/live-call` dengan fallback Turn-by-Turn Audio PCM).
   - Tab navigasi mulus: Beranda (target harian & streak), Panggilan AI (Voice Studio), dan Braincore (kurva trend akurasi vs kelancaran & Misconception Ledger).
   - Integrasi telemetri dua arah ke Braincore BKT dan Misconception Ledger.
   - Pintu masuk instan melalui tautan `⚡ Studio Lengkap` di dalam panggilan telepon utama.

---

## 2. Bukti Pengujian Empiris (Probe-Driven Audit)

Pengujian dilakukan menggunakan Playwright headless Chromium probe langsung di port lokal 3000 dan skrip probe otomatis:

1. **`tools/dev/probe-voice-studio-live.mjs`**:
   - Membuka `call.html` secara live.
   - Memverifikasi rendering tab Beranda, Panggilan AI, dan statistik Braincore.
   - Tangkapan layar tersimpan: `tools/dev/voice-studio-live.png` & `tools/dev/voice-studio-beranda.png`.
2. **`tools/dev/probe-voice-studio-tabs.mjs`**:
   - Memverifikasi transisi antar tab tanpa kebocoran state atau memory leak AudioContext.
   - Tangkapan layar tersimpan: `tools/dev/voice-studio-braincore.png`.
3. **`tools/dev/probe-voice-studio-active-call.mjs`**:
   - Memverifikasi koneksi WebSocket `/ws/live-call` ke Gemini Live (`ready { type: 'ready', model: 'gemini-3.8-live', voiceName: 'Puck' }`).
   - Memverifikasi pergantian status avatar PAW/Mochi antara mode *speaking* dan *idle*.
   - Tangkapan layar tersimpan: `tools/dev/voice-studio-call-active.png`.

---

## 3. Daftar Berkas yang Disentuh

| Berkas | Perubahan |
|---|---|
| `coordination/BUILD-VERSION.json` | Nomor build dinaikkan ke `m025-628` |
| `sw.js` | Service Worker cache revision dinaikkan ke `m025-628` |
| `core-config.js` | Runtime build dinaikkan ke `m025-628` |
| `features/neural-voice/fiezel-diag-panel.js` | Diag panel build dinaikkan ke `m025-628` |
| `kurikulum.html` | Query parameter cache dinaikkan ke `?v=m025-628` |
| `misi.html` | Query parameter cache dinaikkan ke `?v=m025-628` |
| `call.html` | Halaman root Voice Studio dengan palet FIEZEL Warm Paper (`bg-[#FFF9EE]`) |
| `features/voice-studio/dist/` | Berkas terkompilasi produksi `voice-studio.js` dan `voice-studio.css` |
| `features/voice-studio/call.html` | Submodul mirror `call.html` |
| `features/interactive-chat/fiezel-voice-scenarios.js` | Memperkaya seluruh 5 skenario dengan `pronunciation`, `meaningId`, dan `meaningTh` |
| `features/interactive-chat/fiezel-voice-call.js` | Merender kartu bantuan cara jawab pemula dengan fonetik dan tautan ke AI Voice Studio |
| `features/interactive-chat/interactive-chat.css` | Styling kartu panduan cara baca fonetik, badge sasaran, dan tautan studio |
| `.github/workflows/quality.yml` | Pendaftaran gerbang `tests/voice-studio-ui-architecture-test.js` ke CI |
| `tests/voice-studio-ui-architecture-test.js` | Gerbang mutu arsitektur UI & daur hidup Voice Studio |
| `id-golden-baseline.json` | Baseline emas naskah Indonesia terbarui secara sadar |
| `reports/th-ui-leak-report.json` | Laporan bebas kebocoran teks Indonesia di mode Thai |

---

## 4. Status Kelulusan Gerbang Mutu Lokal

Semua gerbang pengujian lokal lulus 100%:

- `node tools/bump-build.mjs --check`: **Selaras** (6/6 titik wajib)
- `node tests/deploy-site-gate-test.js`: **32/32 assert PASS** (termasuk nol rujukan `.assetsignore` di bundel)
- `node tests/voice-call-studio-integration-test.js`: **8/8 PASS** (100% sukses)
- `node tests/voice-studio-ui-architecture-test.js`: **5/5 PASS** (100% sukses)
- `node tests/voice-call-ai-studio-port-test.js`: **100% SUCCESS**
- `node tests/voice-call-two-way-test.js`: **6/6 PASS**
- `node tests/id-golden-snapshot-test.js`: **HIJAU** (baseline emas utuh)
- `node tests/th-ui-leak-test.js`: **PASS** (nol kebocoran di mode Thai)
- `node tests/gate-registry-test.js`: **10 pass, 0 fail** (seluruh gerbang terdaftar resmi)
- `node tests/curriculum-cache-version-test.js`: **26 penegasan, 2 halaman, build m025-628**
