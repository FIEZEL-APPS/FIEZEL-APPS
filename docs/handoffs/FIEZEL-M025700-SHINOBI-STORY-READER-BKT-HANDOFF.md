# FIEZEL HANDOFF DOSSIER: SHINOBI GRADED READER & BRAINCORE BKT SUITE
**Build Tag**: `m025-700`
**Branch**: `fix/universal-onboarding-multi-device-m025-699`
**Pull Request**: `#761`
**Tanggal**: 2026-10-28

---

## 1. Ringkasan Eksekutif & Cakupan Pembaruan
Pembaruan ini menuntaskan integrasi arsitektur Graded Reader N5 berjenjang multi-adegan (*Shinobi Japanese Storytelling Engine*), memperkuat jembatan telemetri kognitif Braincore BKT (Bayesian Knowledge Tracing), mengokohkan antrean offline tahan zona waktu di runtime resmi (`app.js`), serta merapikan geometri layout multi-device (Desktop Split-Screen & Mobile Above-The-Fold).

---

## 2. Tabel Verifikasi Kuantitatif (Numeric Definition of Done)

| Item / Komponen | Target Spesifikasi | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :---: |
| **Koleksi Cerita N5** | Min. 3 judul Graded Readers N5 lengkap | 3 judul (`mizuki-maiko`, `asakusa-neko`, `shinkansen-trip`) | **PASS (100%)** |
| **Struktur Adegan per Cerita** | Min. 4 adegan multi-scene bertahap | 5 adegan (Adegan 1-4 narasi progresif + Adegan 5 kuis diagnostik) | **PASS (100%)** |
| **Aset Visual Latar Adegan** | Vektor fisik / SVG valid $\ge 150$ bita | Vektor SVG mandiri, zero-network latency, nol broken box | **PASS (100%)** |
| **Integrasi Runtime Utama** | Terhubung ke `index.html` & `app.js` | `<script defer>` di `index.html`, rute `#story` & kartu Latihan di `app.js` | **PASS (100%)** |
| **Telemetri Braincore BKT** | Aliran data nyata ketuk kanji `<ruby>` | Memanggil `FiezelStoryBrainBridge.recordWordInteraction()` & meteran BKT | **PASS (100%)** |
| **Anti-Ghost Answer Kuis** | Evaluasi jawaban riil murid | `evaluateStoryQuiz()` dengan pencatatan `misconceptionId` & `failWhy` | **PASS (100%)** |
| **Offline Sync Hardening** | Ikat `timezone` & `syncAttempts` | Diimplementasikan di `brainSyncWrite()` & `brainSyncFlush()` (`app.js`) | **PASS (100%)** |
| **Desktop Onboarding Width** | Bebas ruang kosong kerdil $\ge 800\text{px}$ | Split-screen dialog 960px (Travertine Mochi stage + Form sheet) | **PASS (100%)** |
| **Mobile Above-The-Fold** | Gambar $\le 25-30\%$, teks & CTA 100% terlihat | Max-height gambar 120px (~15% layar), tombol CTA 100% tampak tanpa scroll | **PASS (100%)** |
| **PWA Version Hexa-Sync** | Selaras 6 titik build arbiter | `BUILD-VERSION.json`, `sw.js`, `core-config.js`, `diag-panel`, `kurikulum`, `misi` = `m025-700` | **PASS (100%)** |

---

## 3. Berkas Utama yang Dimodifikasi / Dibuat
1. `features/japanese/fiezel-story-reader.js`: Engine pembaca multi-scene, 3 Graded Readers N5 (15 scene total), pemilih perpustakaan bento grid, popover kanji, kuis evaluasi BKT.
2. `features/japanese/fiezel-story-brain-bridge.js`: Jembatan telemetri kognitif BKT, timezone handling, misconception ledgering.
3. `features/speaking-listening/daily-news-chokai-v1.json`: Bank data siaran berita harian berjenjang N5-N4 untuk latihan chokai.
4. `index.html`: Pendaftaran `<script defer>` story reader & brain bridge.
5. `app.js`: Rute `story` & `news` di `VALID_VIEWS`, integrasi kartu di `latihanCards()`, offline sync timezone binding di `brainSyncWrite()` & `brainSyncFlush()`.
6. `style.css`: Layout Split-screen desktop (960px), ritme vertikal mobile onboarding step 4, bento grid perpustakaan, viewport gambar compact mobile (120px), tombol navigasi taktil berdaya kontras tinggi.
7. `tests/story-brain-bridge-test.js` & `tests/story-reader-integration-test.js`: Gerbang verifikasi otomatis suite cerita dan sinkronisasi.

---

## 4. Bukti Tangkapan Layar Langsung (Zero-Mockup index.html)
- Desktop Onboarding Split-Screen: `ob-step1-desktop.png`, `ob-step4-desktop.png`
- Mobile Onboarding Step 4: `ob-step4-mobile.png`
- Perpustakaan Cerita Desktop: `shinobi-library-desktop.png`
- Pembaca Cerita Desktop (Scene 1 + BKT Popover): `shinobi-story-desktop.png`
- Pembaca Cerita Mobile (Scene 1 Above-The-Fold): `shinobi-story-mobile.png`
- Pembaca Cerita Mobile (Scene 2 Dynamic Progression): `shinobi-story-scene2-mobile.png`
