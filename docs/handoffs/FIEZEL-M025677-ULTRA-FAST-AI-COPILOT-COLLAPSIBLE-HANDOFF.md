# FIEZEL-M025677: Ultra-Fast Real-Time AI Copilot (<2s) & Collapsible Assistant UI Dossier

**Tanggal Rilis**: 26 Oktober 2026
**Build Target**: `m025-677`
**Fitur Utama**: Kawan Bicara / Mitra Kaiwa Real-Time AI Copilot & Collapsible UI
**Status**: 100% Lulus Verifikasi Empiris Playwright & CI Quality Gates

---

## 1. Ringkasan & Latar Belakang Masalah

1. **Keluhan Pengguna**:
   - Sistem AI di fitur Kawan Bicara dirasakan lambat (~3.7s–5.8s saat memakai model default yang memproses thinking tokens).
   - Teks panduan perlu direvisi menjadi lebih ramah dan natural: *"Sini, biar Fiezel bantuin kamu jawab lebih natural"*.
   - Larangan keras terhadap template statis: Setiap opsi bantuan WAJIB 100% hasil racikan AI secara realtime berdasarkan apa yang baru saja diucapkan oleh lawan bicara AI.
   - Kebutuhan menyembunyikan bantuan: Pengguna membutuhkan tombol di pojok kanan atas untuk menyembunyikan kartu bantuan teleprompter agar dapat melihat avatar dan ekspresi lawan bicara secara bebas tanpa terhalang.

2. **Invarian Mutu yang Dipatuhi**:
   - Zero forbidden claims: Bebas dari `"100% Gratis"`, `"Latihan Bisa Offline"`, `"CEFR"`, `"JLPT"`.
   - Zero-Dumbing & Anti-Ghost: Tidak ada manipulasi opsi balasan, telemetri mengalir jujur ke Braincore.
   - Sumpah Hexa-Sync: Build `m025-677` dinaikkan serentak di 6 titik via `tools/bump-build.mjs`.
   - Git Protection: Wajib Pull Request (PR) ke `main`, monitor GitHub Actions hingga 100% HIJAU sebelum merge.

---

## 2. Solusi Teknikal & Optimasi Performa

### A. Sub-2s Latency Pipeline (`workers/api/voice/route-voice-live.js` & `server.js`)
1. **Model Prioritization**: Menggunakan `gemini-3-flash-preview` sebagai model utama copilot karena responsif dan mendukung penonaktifan thinking budget.
2. **Zero Thinking Budget**: Memasang `thinkingConfig: { thinkingBudget: 0 }` pada payload Gemini API (mengeliminasi latensi internal thinking 1.5s–3.0s).
3. **Agresif Hedging (750ms)**: Jika kunci API primer belum menjawab dalam 750ms, sistem secara otomatis meluncurkan permintaan paralel dari kunci sekunder dalam kolam 16 kunci API Cloudflare Worker. Kunci tercepat yang tiba pertama langsung diproses.
4. **Lean Single-Locale Prompting**: Alih-alih meminta translasi dwibahasa (ID dan TH) secara berlebih, prompt disederhanakan untuk meminta translasi bahasa ibu aktif murid (`locale === 'th' ? 'Thai' : 'Indonesian'`), memangkas ~110 token output dan menghemat ~800ms waktu transmisi.

### B. User Experience & Collapsible UI (`BeginnerAnswerAssistant.tsx`)
1. **Judul Natural**:
   - Desktop: `"Sini, biar Fiezel bantuin kamu jawab lebih natural"`
   - Mobile: `"Biar Fiezel bantu jawab natural"`
   - Badge: `"AI Realtime · Spontan"`
2. **Tombol Sembunyikan Bantuan**:
   - Menambahkan tombol `<EyeOff />` di header kartu (`Sembunyikan Bantuan` / `Sembunyikan`).
   - Ketika diklik, kartu berganti ke mode collapsed (strip ringkas dengan teks dan tombol `<Eye />` `Tampilkan Bantuan`), membuka pandangan panggung secara utuh.
   - Tata letak geometri terbukti bebas dari tumpang tindih dengan dock komposer bawah (zero slicing).

---

## 3. Hasil Pengujian Empiris (Headless Playwright & CI)

1. **Playwright Headless Probe (`tools/dev/probe-kawan-bicara-realtime-copilot.mjs`)**:
   - Mobile JA (390×844): Terverifikasi respons AI spontan atas kalimat murid *"昨日の夜、家で辛いラーメンを作りました"*, Copilot menghasilkan balasan kontekstual *"唐辛子をたくさん入れたので、すごく辛かったです"*.
   - Toggle collapse & expand terverifikasi berfungsi sempurna.
   - Desktop EN (1280×800): Terverifikasi respons AI spontan, bebas teks terlarang, bebas layout overlap.
   - Braincore Telemetry: Terverifikasi tersimpan di `localStorage.fiezel-braincore-voice-v1` dengan 12 kompetensi aktif.
   - Hasil: **`PROBE EMPIRIS KAWAN BICARA REALTIME AI COPILOT LULUS 100%`**.

2. **Gerbang Mutu Lokal**:
   - `cf-api-contract-test.js`: 285/285 PASS
   - `cf-wiring-test.js`: 117/117 PASS
   - `voice-studio-ui-architecture-test.js`: 5/5 PASS
   - `view-reachability-test.js`: 64/64 PASS
   - `th-ui-leak-test.js`: PASS
   - `curriculum-cache-version-test.js`: 33/33 PASS (m025-677)
   - `gate-registry-test.js`: 10/10 PASS
   - `id-golden-snapshot-test.js`: HIJAU
   - `bump-build.mjs --check`: Selaras (6 titik Hexa-Sync `m025-677`).

---

## 4. Daftar Berkas yang Dimodifikasi

- `workers/api/voice/route-voice-live.js`: Model priority, thinkingBudget: 0, 750ms hedge, lean locale prompt.
- `server.js`: Paritas lokal model priority, thinkingBudget: 0, 750ms hedge, lean locale prompt.
- `features/voice-studio/src/lib/liveTransport.ts`: Fallback personal key Gemini API upgrade ke `gemini-3-flash-preview` zero thinking budget.
- `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx`: Header natural baru, badge spontan, state collapsible, tombol Sembunyikan/Tampilkan.
- `dist/voice-studio.js` & `dist/voice-studio.css`: Hasil kompilasi Vite produksi.
- `tools/dev/probe-kawan-bicara-realtime-copilot.mjs`: Pengujian Playwright untuk collapse toggle dan judul natural.
- `id-golden-baseline.json`: Pembaruan baseline teks emas.
- Berkas Hexa-Sync `m025-677`: `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`.
