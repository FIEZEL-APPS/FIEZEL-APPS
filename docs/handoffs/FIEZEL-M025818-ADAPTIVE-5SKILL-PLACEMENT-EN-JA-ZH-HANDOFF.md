# Handoff Dossier — m025-818: Adaptive 5-Skill + Susun Kata IRT 3PL Placement Engine (EN · JA · ZH)

- **Authority**: OWNER & MASTER Gatekeeper Approved Two-Stage Execution
- **Build**: `m025-818` (Hexa-Sync certified via `tools/bump-build.mjs`)
- **Status**: READY FOR MERGE (100% Local Gates & Empirical Headless Playwright Probe Green)
- **Protected Surface Token**: `[ALLOW-PROTECTED: onboarding]` (onboarding Mandarin course picker & placement tier selector explicitly requested by OWNER)

## 1. Ringkasan Temuan Audit Empiris (Pra-Perbaikan `m025-817`)

Melalui eksekusi probe peramban Chromium Playwright sungguhan atas `buildPlacement()` dan simulasi 200 murid per kursus:
1. **Kursus Jepang (`ja`) Rusak Total (Mentok di N5)**:
   - Seluruh 62 butir bank listening JLPT (`jlpt-listening-bank-v1.json`) ditolak oleh `contentIntegrityGate` karena `makeListeningQuestion()` mengisi `distractors[].option` dengan `opt.textId` sedangkan tombol opsi di layar menampilkan `opt.text (opt.textId)`.
   - Akibat gagalnya listening, band N4, N3, N1, dan N1+ masing-masing hanya tersisa 1 soal (`< PLACEMENT_BAND_MIN_EVIDENCE = 2`), sehingga murid yang menjawab **100% benar (5/5 percobaan)** maupun murid B1 sejati (**200/200 percobaan**) selalu ditempatkan di **N5**.
2. **Kursus Mandarin (`zh`) Menyajikan Listening Bahasa Inggris & Template Grammar Rusak**:
   - `loadPlacementListening()` hanya bercabang `isJa ? jlpt : en`, sehingga murid Mandarin diberi 4 soal menyimak berbahasa Inggris.
   - Seluruh 192 entri `content/zh/grammar-templates-zh.json` memakai kerangka statis seragam `我们在学校____X` dengan opsi tidak bermakna (`米饭着过`, `在米饭了`).
   - Bahasa Mandarin (`zh`) masih terkunci sebagai kartu pasif *"Segera"* di `features/onboarding/fiezel-onboarding.js` (`COURSES = ['en', 'ja']`).
3. **Keterbatasan Format & Tidak Ada Pilihan Tingkat Awal**:
   - Tes penempatan hanya menguji pilihan ganda kosakata/tata bahasa/listening tanpa Reading, Writing, Speaking, maupun Susun Kata, serta belum menyediakan pilihan tingkat awal **Mudah / Normal / Susah**.

## 2. Solusi Arsitektur Dua Tahap (`m025-818`)

### Tahap 1 — Perbaikan Bug Kritis Lintas Kursus
- **Penyelarasan Label Distraktor Listening Jepang (`app.js`)**: `makeListeningQuestion()` menggunakan label tampilan kanonis yang identik untuk `options` dan `explain.distractors`, meloloskan seluruh butir JLPT N5–N1+ di `validateQuestion()`.
- **Jaminan Kuota Minimum Band (`buildPlacement` di `app.js`)**: Setiap band wajib memenuhi kuota jumlah soalnya; bila domain jaringan gagal atau tersaring, kekurangan ditambal dari grammar/kosakata band yang sama sehingga tidak ada band yang mati secara aritmetika.
- **Bank Kurasi Penempatan Mandarin & Jepang (`content/zh/placement-zh.json`, `content/ja/placement-ja.json`, `sw.js`)**:
  - Mandarin: 18 butir Menyimak (`zh-CN` neural TTS), suplemen Membaca HSK 6 (C2), 10 butir Menulis Cloze (menerima Hanzi & Pinyin), 9 butir Berbicara, 13 butir Susun Kata sintaksis, dan 18 butir Tata Bahasa HSK 1–6 bebas cacat template.
  - Jepang: 9 butir Menulis Cloze bebas bocoran kunci (menerima Kanji, Hiragana, & Romaji), 8 butir Berbicara N5–N1+, dan 12 butir Susun Kata sintaksis.
- **Aktivasi Bahasa Mandarin di Onboarding (`features/onboarding/fiezel-onboarding.js`)**:
  - `COURSES` diperluas menjadi `['en', 'ja', 'zh']` dengan panel pratinjau `<ruby>` Pinyin bertanda nada + sinkronisasi `fz_zh_pinyin` serta chip level mandiri `HSK 1`–`HSK 6`.

### Tahap 2 — Mesin Adaptif IRT 3PL 5 Keterampilan + Susun Kata & Pilihan Mudah / Normal / Susah
- **Pilihan Tingkat Awal Objektif (`PLACEMENT_TIERS_SPEC`)** di Onboarding Langkah 4 & halaman Tes Kemampuan Dasar:
  - **Mudah (`easy`)**: $\theta_0 = 1.3$ (mulai dasar A1/N5/HSK 1) · 12 soal adaptif.
  - **Normal (`normal`)**: $\theta_0 = 2.6$ (mulai menengah A2–B1/N4–N3/HSK 2–3) · 15 soal adaptif.
  - **Susah (`hard`)**: $\theta_0 = 4.0$ (mulai mahir B2/N2/HSK 4) · 18 soal adaptif.
  - Pembaruan posterior EAP grid $\theta \in [0.5, 6.5]$ + penjaga bukti bersih di atas tebakan memastikan pilihan tingkat hanya menentukan titik berangkat dan panjang tes: penebak acak di tier **Susah** tetap tertahan di A1/A2 (`>A2 = 0/400` di uji Monte Carlo), sedangkan murid sempurna di tier **Mudah** tetap mencapai C2/N1/HSK 6.
- **6 Format Soal Diacak dengan Kuota Seimbang (`placementCatPromoteNext`)**:
  1. **Menyimak (`listening`)** — audio neural `en-US` / `ja-JP` / `zh-CN` tanpa bocoran teks/subtitle.
  2. **Membaca (`reading`)** — wacana ringkas terkalibrasi per level dengan bukti kutipan.
  3. **Menulis (`cloze`)** — produksi ketik dengan `FiezelProductionGrader` ($c = 0.05$).
  4. **Berbicara (`speaking`)** — perekaman mikrofon + penilaian pelafalan & akurasi multimodal **Gemini AI di server** (`POST /api/voice/verify-speech` di `workers/api/voice/route-voice-live.js`), dilengkapi tombol *Lewati tanpa penalti* bila perangkat tanpa mikrofon.
  5. **Susun Kata (`token-order`)** — penyusunan sintaksis ketat (`FiezelGrammarUpgrade.renderTokenOrder`, mode `measure: true` bebas intip arti, $c = 0.05$).
  6. **Jangkar Kosakata & Tata Bahasa (`anchor`)**.
- **Profil Presisi 5 Keterampilan di Layar Hasil (`placementSkillProfileMarkup`)**: Menampilkan rincian capaian per keterampilan (Menyimak, Membaca, Menulis, Berbicara, Susun Kata) berdampingan dengan level terverifikasi.

## 3. Bukti Probe Empiris Playwright (Sebelum vs Sesudah)

| Indikator Terukur | EN (Sesudah) | JA (Sebelum -> Sesudah) | ZH (Sebelum -> Sesudah) |
|---|---|---|---|
| Ukuran kolam kalibrasi 5 skill | 105 butir | 8 -> **89 butir** | 12 (bocor EN) -> **89 butir murni ZH** |
| Keterampilan tersampel per sesi | 5/5 (Listen, Read, Write, Speak, Susun Kata) | 2/5 -> **5/5 lengkap** | 2/5 -> **5/5 lengkap** |
| Murid sempurna (di tier Mudah) | **C2** | N5 -> **N1 (level 6)** | C2 -> **HSK 6 / C2** |
| Murid salah semua (di tier Susah) | **A1** | N5 -> **N5 (level 1)** | A1 -> **HSK 1 / A1** |
| Penebak acak murni > A2 (400 run/tier) | **0 / 400 (0%)** | **0 / 400 (0%)** | **0 / 400 (0%)** |
| Akurasi penempatan murid B1 sejati | **100% di rentang A2–B2 (70% tepat B1)** | 0% -> **100% di N4–N2 (74.2% tepat N3)** | **100% di HSK 2–4 (74.2% tepat HSK 3)** |

## 4. Daftar Berkas yang Disentuh
- `app.js` — Mesin CAT IRT 3PL 5 keterampilan + Susun Kata, perbaikan validator listening JLPT, pemuat bank JA/ZH, widget Speaking AI server, profil 5 keterampilan di layar hasil, serta pemilih tingkat Mudah/Normal/Susah.
- `features/onboarding/fiezel-onboarding.js` — Kartu kursus Bahasa Mandarin + panel Pinyin `<ruby>` + pemilih tingkat Mudah/Normal/Susah pada langkah Tes Penempatan.
- `features/ui/fiezel-tactile-clay.css` — Gaya komponen `.fz-ob-tier-row`, `.placement-tier-bar`, `.speaking-quiz-box`, dan `.result-skill-profile`.
- `workers/api/voice/route-voice-live.js` — Mode penilaian pelafalan & ketepatan kalimat target multimodal Gemini pada `POST /api/voice/verify-speech`.
- `content/zh/placement-zh.json`, `content/ja/placement-ja.json`, & `content/ja/placement-ja-th.json` — Bank soal kurasi 5 keterampilan + Susun Kata bebas bocoran kunci beserta sidecar paritas Thai lengkap (89/89 medan).
- `features/i18n/copy-id-feat-b.js`, `features/i18n/copy-th-feat-b.js`, `features/i18n/locales/*/ui.json` — Paritas penuh i18n 9 bahasa (0 kebocoran Thai).
- `tests/placement-accuracy-test.js`, `tests/onboarding-test.js`, `tests/auth-screen-test.js`, `tests/japanese-th-parity-test.js`, `id-golden-baseline.json` — Asersi regresi Monte Carlo CAT 3-tier, paritas sensus Thai bank Jepang, & onboarding 3 kursus.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html` — Sinkronisasi 6 titik `m025-818`.

## 5. Langkah Berikutnya (Roadmap)
- Memperluas bank kalimat *Speaking* dan *Susun Kata* Mandarin/Jepang secara berkala dari telemetri kalibrasi butir (`FiezelItemPool`) agar variasi antar-percobaan semakin kaya.
- Menambahkan dukungan penyimpanan riwayat skor fonetik per fonem/nada ke dasbor *Open Learner Model* (OLM) setelah murid menyelesaikan sesi latihan lanjutan.
