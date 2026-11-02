# FIEZEL Computerized Adaptive Placement (CAT) Engine 2.0 & In-Call Vocab Capture — Handoff Dossier

**Nomor Build**: `m025-751`<br>
**Tanggal**: 2 November 2026<br>
**Cakupan**: `feat(placement): [ALLOW-PROTECTED: ci|pwa] computerized adaptive placement cat engine and in-call vocab capture`<br>
**Branch Worktree**: `feat/placement-adaptive-cat` (`C:\Users\hp\fiezel-adaptive-cat`)

---

## 1. Ringkasan Eksekutif & Roadmap Fase 2

Sesuai instruksi dan mandat eksekutif, sprint ini menyelesaikan implementasi 3 pilar utama peningkatan pedagogis dan interaksi percakapan dengan kepatuhan mutlak pada **ZERO THIRD-PARTY BRANDING** dan **Anti-Leak Exam Purity**:

### Pilar 1: Computerized Adaptive Placement (CAT) Engine 2.0 (IRT 3PL)
- **Mesin Adaptif Berbasis IRT 3PL**: Menggantikan tes penempatan statis dengan mesin Item Response Theory adaptif (`features/placement/fiezel-adaptive-cat-engine.js`).
- **Logika Penyesuaian Dinamis**:
  - Soal awal: Menengah (A2 / Tier 1).
  - Jawaban benar berturut-turut ($k \ge 2$): Lompatan tingkat kesulitan (+1 level: A2 $\rightarrow$ B1 $\rightarrow$ B2).
  - Jawaban salah: Penurunan tingkat kesulitan (-1 level: B1 $\rightarrow$ A2 $\rightarrow$ A1) untuk kalibrasi kemampuan $\theta$.
  - Konvergensi objektif dalam 12–16 butir soal.
- **Bank Soal Terkalibrasi & Mandiri (100% Native FIEZEL)**:
  - `features/placement/fiezel-placement-bank-ja.js`: 36 butir terkalibrasi melintasi 4 tingkat (A1/N5, A2/N4, B1/N3, B2/N2).
  - `features/placement/fiezel-placement-bank-en.js`: 36 butir terkalibrasi melintasi 4 tingkat (A1, A2, B1, B2).
  - **Zero Third-Party Branding Guarantee**: Seluruh opsi surrender berbunyi `'🤷🏽 (わからない)'` dan `'🤷🏽 (I don\'t know)'`. Bersih total dari nama platform pihak ketiga.
- **Anti-Leak Exam Purity**: Penonaktifan total petunjuk (*hint*), popover intip arti kata, maupun bocoran distractor selama mode penempatan berlangsung.
- **Tanda Terima & Penyimpanan Hasil**: Menghasilkan tanda terima format `FZ-CAT:<LANG>:<TIER>:<COUNT>Q:<ACCURACY>PCT:<NONCE>` dan menyimpan hasil kalibrasi ke `state` serta `localStorage['fz_cat_placement_<lang>']`.

### Pilar 2: In-Call Real-Time Vocabulary Capture di AI Voice Studio (`call.html`)
- **Komponen HUD Mengambang**: `features/voice-studio/src/components/FiezelInCallVocabCapture.tsx` menyajikan notifikasi toast non-intrusif `.fz-in-call-capture` saat kosakata baru terdeteksi atau murid bertanya arti kata.
- **Penyimpanan Sekali Sentuh ke FSRS Braincore**: Satu ketukan tombol menyimpan kosakata ke antrean FSRS Spaced Repetition (`localStorage['fz_fsrs_harvested_queue']`) dan memancarkan event `fz:vocab-harvested`.
- **Integrasi Cangkang**: `app.js` memasang event listener global `fz:vocab-harvested` untuk memastikan ketahanan penyimpanan multi-tab.

### Pilar 3: 40 Skenario Roleplay Percakapan
- Menambahkan 11 skenario percakapan interaktif kaya konteks ke `features/voice-studio/src/data/callScenarios.ts` (mencapai genap 40 skenario siap latih di AI Voice Studio).
- Mengompilasi ulang bundel Voice Studio via Vite (`dist/voice-studio.js` dan `dist/voice-studio.css`).

---

## 2. Berkas yang Dibuat & Disentuh

### Berkas Baru
1. `features/placement/fiezel-adaptive-cat-engine.js` — Mesin adaptive IRT 3PL dual-compatible (Browser & Node.js).
2. `features/placement/fiezel-placement-bank-ja.js` — Bank soal 36 butir adaptif Bahasa Jepang (A1–B2).
3. `features/placement/fiezel-placement-bank-en.js` — Bank soal 36 butir adaptif Bahasa Inggris (A1–B2).
4. `features/phase2/phase2-style.css` — Gaya antarmuka CAT placement card, IELTS band pills, dan floating in-call capture HUD.
5. `features/voice-studio/src/components/FiezelInCallVocabCapture.tsx` — Komponen React HUD penangkap kosakata aktif.
6. `tests/adaptive-cat-engine-test.js` — Pengujian unit mesin CAT (5 simulasi, kalibrasi IRT, dan audit sanitasi nama merek).
7. `tools/dev/adaptive-cat-probe.mjs` — Skrip audit empiris Playwright Chromium headless.
8. `docs/handoffs/FIEZEL-M025751-ADAPTIVE-CAT-AND-VOCAB-CAPTURE-HANDOFF.md` — Berkas dossier serah terima resmi ini.

### Berkas yang Dimodifikasi
1. `app.js` — Pemasangan handler `startAdaptiveCatPlacement()`, `openModal()`, dan listener `fz:vocab-harvested`.
2. `index.html` — Pendaftaran stylesheet `phase2-style.css` dan `<script defer>` mesin serta bank penempatan CAT.
3. `sw.js` — Precaching 4 berkas penempatan CAT untuk keandalan PWA luring.
4. `features/voice-studio/src/App.tsx` — Pemasangan komponen `FiezelInCallVocabCapture` di panggung panggilan suara.
5. `features/voice-studio/src/data/callScenarios.ts` — Pengayaan skenario roleplay hingga genap 40 skenario.
6. `features/voice-studio/dist/*` — Hasil build produksi Vite Voice Studio.
7. `.github/workflows/quality.yml` — Pendaftaran gerbang `tests/adaptive-cat-engine-test.js` di Meja 2 CI.
8. `id-golden-baseline.json` — Pembaruan baseline teks emas UI Indonesia terverifikasi.
9. `coordination/BUILD-VERSION.json`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` — Penyelarasan build canonical `m025-751` (Hexa-Sync & Octa-Sync).

---

## 3. Bukti Verifikasi Mutu & Pengujian Empiris

| Gerbang Uji Mutu | Perintah | Status |
| :--- | :--- | :--- |
| **Adaptive CAT Engine Test** | `node tests/adaptive-cat-engine-test.js` | **PASS (100% HIJAU)** |
| **Legacy Placement Accuracy** | `node tests/placement-accuracy-test.js` | **PASS (32/32 assertions)** |
| **Indonesian Golden Baseline** | `node tests/id-golden-snapshot-test.js` | **PASS (13 files locked, 6158 literals)** |
| **Thai Leak & Locale Guard** | `node tests/th-ui-leak-test.js` | **PASS (0 leaks)** |
| **Gate Registry & CI Coverage**| `node tests/gate-registry-test.js` | **PASS (10 pass, 0 fail, 417 gates)** |
| **Curriculum Cache Version** | `node tests/curriculum-cache-version-test.js`| **PASS (33 penegasan, build m025-751)**|
| **Hexa-Sync Arbiter Check** | `node tools/bump-build.mjs --check` | **PASS (Selaras)** |
| **Empirical Playwright Probe** | `node tools/dev/adaptive-cat-probe.mjs` | **PASS (100% HIJAU - 5 Checks)** |

---

## 4. Protokol Freeze & Delegasi Staging Arbiter

Sesuai aturan branch protection (`enforce_admins: true`, `strict: true`) dan protokol kolaborasi multi-agent:
- Moratorium deployment tetap dihormati penuh: **TIDAK ADA DIRECT PUSH ATAU MERGE KE `origin/main`**.
- Pekerjaan dikomit secara rapi di branch `feat/placement-adaptive-cat` dan diserahkan kepada **Master Staging Arbiter & Gatekeeper** (`91aad2bc-6ddf-4b42-b426-c5783856894f`) untuk peninjauan PR dan integrasi staging bertahap.
