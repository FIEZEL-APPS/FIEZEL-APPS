# FIEZEL-M025630 — Satukan Mitra Kaiwa dengan Antarmuka Panggilan Studio Suara AI (Tanpa Kartu & Panel Beranda/Braincore Ganda)

- **Build**: `m025-630`
- **Tanggal**: 23 Oktober 2026
- **Status**: LULUS GERBANG MUTU LOKAL & PROBE EMPIRIS PLAYWRIGHT

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan
Sesuai arahan eksplisit pengguna:
1. **Penghapusan Kartu Ganda di Beranda PWA (`app.js`)**:
   - Sebelumnya terdapat dua kartu percakapan di layar Beranda PWA: **Mitra Kaiwa / Kawan Bicara** (`conversationPartnerHomeCardMarkup()`) dan **Studio Suara AI** (`voiceStudioHomeCardMarkup()`).
   - Kini `voiceStudioHomeCardMarkup()` dihapus sepenuhnya sehingga hanya ada **1 kartu tunggal** di Beranda, yaitu **Mitra Kaiwa** (kursus Jepang) / **Kawan Bicara** (kursus Inggris).
2. **Modifikasi Mitra Kaiwa Menjadi Ruang Panggilan Studio Suara AI Tanpa Panel Beranda/Braincore (`features/interactive-chat/fiezel-interactive-chat.js`, `features/voice-studio/src/App.tsx`, `features/voice-studio/src/lib/braincore.ts`)**:
   - Saat murid menekan kartu **Mitra Kaiwa / Kawan Bicara** (`go('chat')` -> `interactiveChatView()`), aplikasi langsung membuka ruang panggilan Studio Suara AI secara *full-bleed* di dalam `#app`.
   - Seluruh panel ekstra (`Beranda`, `Braincore`, bilah navigasi 3 tab atas/bawah, serta tombol `Patch`) dinonaktifkan/disembunyikan sehingga yang tampil murni adalah antarmuka panggilan suara AI (**Mitra Kaiwa** / **Kawan Bicara**).
   - Header menampilkan tombol `← Kembali` (yang langsung mengembalikan murid ke Beranda PWA tanpa muat ulang halaman), identitas **Mitra Kaiwa** (`会話パートナー · Studio Suara AI`) atau **Kawan Bicara** (`Speaking Partner · Studio Suara AI`), tombol **Kunci Live** (Google AI Studio Gemini Multimodal Live API Key), saklar bahasa target `EN | JA`, dan saklar bahasa antarmuka `ID | TH`.
   - Sinkronisasi otomatis kursus aktif (`ja` vs `en`) dan pencatatan riwayat giliran bicara ke `localStorage['fiezel-interactive-chat-v1']` agar lencana jumlah pesan pada kartu Beranda tetap terbarui secara jujur.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Probe)
Dieksekusi melalui `node tools/dev/probe-mitra-kaiwa-single-studio.mjs`:
- **Home Card Audit**: `{"kawanCardCount":1,"studioCardCount":0,"cardTitle":"Mitra Kaiwa"}`
- **Mitra Kaiwa Studio Call Room Audit**: `{"headerTitle":"Mitra Kaiwa","callCardVisible":true,"anyNavVisible":false,"selectedScenario":"scen_ja_n5_kissaten","pawImgLoaded":true}`
- **Back Navigation Audit**: `{"hasKawanCard":true,"hasFrameLeftover":false}`

---

## 3. Daftar Berkas yang Disentuh
- `app.js`: Hapus kartu duplikat `voiceStudioHomeCardMarkup()` dari Beranda PWA.
- `features/interactive-chat/fiezel-interactive-chat.js`: Arahkan `root.interactiveChatView()` untuk merender ruang panggilan Studio Suara AI secara langsung di dalam `#app` dengan pembersihan penuh pada `api.unmount()`.
- `features/voice-studio/src/App.tsx`: Kunci tampilan langsung ke ruang panggilan (`call`), tampilkan header **Mitra Kaiwa / Kawan Bicara** dengan tombol `← Kembali` yang terhubung ke navigasi PWA induk, sembunyikan navigasi tab `Beranda`/`Braincore` dan tombol `Patch`, serta tambahkan fallback path relatif avatar PAW.
- `features/voice-studio/src/lib/braincore.ts`: Sinkronkan preferensi kursus (`?lang=` dan `fz_target_course`) saat pemuatan state serta jembatan pencatatan giliran bicara ke `fiezel-interactive-chat-v1`.
- `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css`: Bundel produksi hasil kompilasi ulang Vite.
- `id-golden-baseline.json`: Pembaruan baseline literal Indonesia setelah penghapusan fungsi kartu duplikat di `app.js`.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Kenaikan nomor build resmi ke `m025-630` via `tools/bump-build.mjs`.

---

## 4. Status Kelulusan Gerbang Mutu Lokal
- `node tools/bump-build.mjs --check` -> **PASS (`Selaras` pada `m025-630`)**
- `node tests/build-number-uniqueness-test.js --strict` -> **PASS**
- `node tests/id-golden-snapshot-test.js` -> **PASS**
- `node tests/th-ui-leak-test.js` -> **PASS**
- `node tests/home-kawan-bicara-card-test.js` -> **PASS (5/5)**
- `node tests/voice-studio-ui-architecture-test.js` -> **PASS (5/5)**
- `node tests/secret-scan-test.js` -> **PASS (46/46)**
- `node tests/deploy-site-gate-test.js` -> **PASS (32/32)**
- `node tests/pastel-field-contrast-test.js` -> **PASS (9/0)**
- `node tests/interactive-chat-test.js` -> **PASS (11/11)**
- `node tests/voice-call-two-way-test.js` -> **PASS (6/6)**
- `node tests/curriculum-cache-version-test.js` -> **PASS**
- `node tests/gate-registry-test.js` -> **PASS (10/10)**
