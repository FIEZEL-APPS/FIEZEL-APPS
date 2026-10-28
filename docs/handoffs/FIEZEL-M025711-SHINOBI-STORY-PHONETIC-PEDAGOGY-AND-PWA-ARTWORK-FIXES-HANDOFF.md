# FIEZEL HANDOFF DOSSIER: N5 SHINOBI GRADED READER — PWA ARTWORK PERMANENCE & ELEVENLABS PHONETIC PEDAGOGY
**Build Canonical**: `m025-711`
**Branch**: `feat/story-fixes-m025-711`
**Date**: 2026-10-29
**Status**: VERIFIED & READY FOR MERGE

---

## 1. Ringkasan Eksekutif & Akar Masalah
Menuntaskan perbaikan menyeluruh atas dua kegagalan fatal yang dilaporkan pengguna pada fitur Cerita Bergambar N5 (*Shinobi Graded Readers*):
1. **Kepastian Visual PWA (PWA Artwork Permanence / Zero-Download)**:
   - *Masalah*: Adegan cerita memanggil berkas JPG mentah (~850 KB) yang tidak terdaftar di precache service worker. Setiap kali pengguna berpindah adegan atau membuka PWA, peramban terpaksa mengunduh ulang gambar dari jaringan, memicu layar berkedip kosong saat luring atau koneksi lambat.
   - *Solusi*: Mengalihkan seluruh aset panggung cerita ke 12 berkas WebP ringkas (~68–80 KB) dan mendaftarkannya ke dalam `ASSETS` di `sw.js` agar ter-precache secara permanen di CacheStorage PWA.
   - *Zero-Lag Visual*: Menghapus deklarasi `display:none` pada lapisan vektor SVG panggung (`makeSceneSvg`). SVG kini selalu aktif seketika pada lapisan bawah (z-index: 1), sementara WebP beresolusi tinggi di-overlay di atasnya (z-index: 2).
   - *Audio Preloader*: Menambahkan `preloadStoryAudio(story)` saat judul cerita dibuka agar audio narasi ter-cache di memori sebelum pengguna menekan tombol Play.

2. **Rekalibrasi Fonetik Hiragana Murni & Intonasi Suara Pedagogis (ElevenLabs Multilingual V2)**:
   - *Masalah*: Memberikan kanji dan angka langsung ke model TTS multilingual menghasilkan misreadings fonetik fatal (misal: `17歳` dibaca angka bahasa Inggris "seventeen さい", `着ます` salah diucapkan sebagai "chakumasu/tsukimasu", `舞妓` dibaca "buko", `朝7時` salah intonasi, `2時間半` dibaca campur angka Inggris).
   - *Solusi*: Menggenerasi ulang seluruh 15 berkas audio (adegan dan kuis pemahaman) menggunakan transkripsi 100% aksara Hiragana dengan pemenggalan jeda koma (`、`) dan spasi batas kata Tokyo standard pitch-accent.
   - *Persona Suara Terkalibrasi*:
     - **Mizuki & Narator Kyoto**: Aki (`ngvNHfiCrXLPAHcTrZK1`)
     - **Kenji & Taro (Pelajar)**: Sora (`4sirbXwrtRlmPV80MJkQ`)
     - **Pemilik Kedai Teh**: Chieko (`xE6NbKmUvY3BhBzNAYsV`)
     - **Kondektur Shinkansen & Instruktur Kuis**: Akio (`eRD4wLHoHH7P30TZIexm`)

---

## 2. Quantitative Verification Reporting Table (Zero-Potemkin Invariant)

| Item/Fitur | Spesifikasi Target | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :---: |
| **PWA Artwork Precache** | 12 WebP tersimpan di CacheStorage PWA | 12 WebP terdaftar di `ASSETS` `sw.js` | **LULUS** (100%) |
| **Zero-Lag Visual Permanence** | Layer SVG aktif di bawah gambar tanpa `display:none` | SVG stack z-index: 1 instan, WebP z-index: 2 | **LULUS** (100%) |
| **Generasi Audio Fonetik Hiragana** | 15 berkas audio bebas salah baca kanji & angka | 15 MP3 fisik baru tergenerasi (100% Hiragana matched) | **LULUS** (100%) |
| **Content Integrity Gate** | 4/4 gerbang integritas konten lulus | `node tests/content-integrity-gate.js` 100% HIJAU | **LULUS** (100%) |
| **Story Audio Autoplay Suite** | Rantai transisi 1 → 2 → 3 → 4 → 5 lulus | `node tests/story-voice-autoplay-test.js` 100% LULUS | **LULUS** (100%) |
| **Story Brain Bridge & Telemetry** | BKT, OLM, dan Misconception Ledger terikat | `node tests/story-brain-bridge-test.js` 100% LULUS | **LULUS** (100%) |
| **PWA Cache & Pipeline Invariant** | Shell cache konsisten & nol kebocoran MP3 | `pwa-cache-test.js` & `audio-asset-pipeline-test.js` PASS | **LULUS** (100%) |
| **PWA Release Coherence** | Integritas cangkang rilis stabil | `pwa-release-coherence-test.js` PASS | **LULUS** (100%) |
| **Hexa-Sync Arbiter** | Build kanonikal selaras | `tools/bump-build.mjs --check` `m025-711` SELARAS | **LULUS** (100%) |
| **Cache Version Sync** | 33 penegasan lulus di seluruh HTML & skrip | `node tests/curriculum-cache-version-test.js` 33/33 LULUS | **LULUS** (100%) |
| **Golden Baseline Indonesia** | Seluruh literal Indonesia utuh tanpa regresi | `node tests/id-golden-snapshot-test.js` HIJAU | **LULUS** (100%) |
| **Gate Registry Invariant** | 403 gerbang valid tanpa gerbang hantu | `node tests/gate-registry-test.js` PASS (10/10) | **LULUS** (100%) |

---

## 3. Visual Verification Artifacts
- Mobile Screenshot: `story-mobile-fixed.png` (390 × 844 px)
- Desktop Screenshot: `story-desktop-fixed.png` (1280 × 800 px)
