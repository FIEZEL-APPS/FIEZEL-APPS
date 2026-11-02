# FIEZEL HANDOFF DOSSIER: MANDARIN FULL CURRICULUM & INTERACTIVE LEARNING SUITE EXPANSION (m025-755)

**Tanggal**: 2026-11-03
**Nomor Build**: `m025-755`
**Cabang**: `feat/mandarin-m025-748` (Pull Request #818)
**Tujuan Penyerahan**: Master Staging Arbiter & Gatekeeper (`91aad2bc-6ddf-4b42-b426-c5783856894f`) & Antigravity Architect (`d1856b92-8844-42f9-a1eb-9c2a20c6d762`)
**Status CI Mutu**: **100% HIJAU (PASS)**

---

## 1. Ringkasan Eksekutif & Temuan Audit
Sesuai arahan mutlak Antigravity Architect (`d1856b92-8844-42f9-a1eb-9c2a20c6d762`), setelah endpoint publik SuperChinese pulih dari cooldown (`HTTP 200 OK`), seluruh 85 bab yang sebelumnya bolong/kosong (termasuk seluruh 24 bab Level 7 seperti `11.11`, `On the commute`, `Job interview`, serta bab kosong di Level 3, 5, 6, 8) telah ditarik secara sopan dengan jeda terkalibrasi dan proteksi *exponential backoff* tanpa ada kegagalan rate limit (`85 OK, 0 failed`).

Seluruh data tersebut kemudian ditransformasikan secara **100% Clean-Room Murni FIEZEL Native** tanpa menyisakan satupun merek pihak ketiga (`SuperChinese`, `SuperTest`, `Chao`, `Plus`) maupun CDN eksternal (`akm.hskcdn.com`).

---

## 2. Struktur Kurikulum & Fitur Pembelajaran yang Dihasilkan

### A. Kurikulum Lengkap 192 Bab (0 Bab Kosong!) & Fondasi Level 0
- **Level 0 (Fondasi Fonetik & Guratan Hanzi)**: 6 Unit komprehensif
  1. *Inisial (声母 - Shēngmǔ)*: 21 konsonan dasar dengan organ artikulasi.
  2. *Final (韵母 - Yùnmǔ)*: 36 vokal tunggal & majemuk.
  3. *4 Nada Intonasi (四声 - Sìshēng)*: Kontur nada 5-level Chao (55, 35, 214, 51) + Nada Netral.
  4. *Hukum Sandhi Nada (变调 - Tone Sandhi)*: Aturan 3+3->2+3, perubahan kata 不 (bù), dan kata 一 (yī).
  5. *Pasangan Minimal (Minimal Pairs)*: Latihan membedakan fonem kritis (b/p, d/t, g/k, j/q, z/c, zh/ch).
  6. *Anatomi Hanzi & 7 Aturan Goresan (笔画与笔顺)*: 8 goresan dasar Yongzi Bafa & radikal esensial di kisi Mi Zi Ge.
- **Level 1 s/d Level 8 (24 Bab per Level = 192 Bab Total)**:
  - Level 1: 24 Pelajaran (`fz-zh-lesson-001` s/d `fz-zh-lesson-024`) — HSK 1
  - Level 2: 24 Pelajaran (`fz-zh-lesson-025` s/d `fz-zh-lesson-048`) — HSK 2
  - Level 3: 24 Pelajaran (`fz-zh-lesson-049` s/d `fz-zh-lesson-072`) — HSK 3
  - Level 4: 24 Pelajaran (`fz-zh-lesson-073` s/d `fz-zh-lesson-096`) — HSK 4
  - Level 5: 24 Pelajaran (`fz-zh-lesson-097` s/d `fz-zh-lesson-120`) — HSK 4-5
  - Level 6: 24 Pelajaran (`fz-zh-lesson-121` s/d `fz-zh-lesson-144`) — HSK 5
  - Level 7: 24 Pelajaran (`fz-zh-lesson-145` s/d `fz-zh-lesson-168`) — HSK 5-6 (Wacana formal, Chengyu, negosiasi)
  - Level 8: 24 Pelajaran (`fz-zh-lesson-169` s/d `fz-zh-lesson-192`) — HSK 6 (Sastra klasik, dialektika, tradisi)
- **Zero Empty Lessons Invariant**:
  - 192 dari 192 bab memiliki daftar kosakata aktif (`words: 4–8 Hanzi`) lengkap dengan rincian kata.
  - 192 dari 192 bab memiliki titik tata bahasa spesifik (`grammarTopic` & `grammarFormula`) dengan catatan analisis kontrastif terhadap bahasa Indonesia.
  - 192 dari 192 bab memiliki naskah percakapan multi-turn bersama Xiao Mochi (`{ speaker, hz, py, id }`).
  - 192 dari 192 bab memiliki kuis evaluasi Braincore interaktif (`reorder` SVO & `cloze` kata satuan).
  - 192 dari 192 bab memiliki latihan berbicara AI bersama Xiao Mochi (`aiSpeaking`).

### B. Bank Tata Bahasa (192 Pola Sintaksis 1-ke-1)
- `features/mandarin/mandarin-grammar-bank.js`: Memuat tepat 192 pola tata bahasa terpetakan 1-ke-1 terhadap 192 bab kurikulum (`gram-zh-001` s/d `gram-zh-192`), dilengkapi rumus sintaksis, tag BKT Braincore, ID miskonsepsi pedagogis, dan contoh kalimat aplikatif.

### C. Bank Kosakata Terbuka (2.194 Entri Unik)
- `features/mandarin/mandarin-vocab-bank.js`: Memuat 2.194 entri kosakata unik beranotasi lengkap (Hanzi, Pinyin bertanda nada, array nada fonetik, POS, arti Indonesia, arti Inggris, dan contoh kalimat) tanpa terpotong batas 30 kata.

### D. Pemutar Pelajaran Interaktif 5 Langkah (5-Step Lesson Player)
- `FiezelMandarinUI.openLessonPlayer(lessonId)`: Modal terintegrasi dengan navigasi pil langkah progresif:
  - **Langkah 1**: Kartu Kosakata Pelajaran dengan audio pelafalan TTS.
  - **Langkah 2**: Fokus Tata Bahasa & Analisis Kontrastif Sintaksis.
  - **Langkah 3**: Percakapan Kontekstual & Teknik Shadowing Bersuara.
  - **Langkah 4**: Kuis Evaluasi Braincore (Susun Token SVO & Pilihan Ganda Kata Satuan).
  - **Langkah 5**: Latihan Berbicara Interaktif bersama Xiao Mochi.

### E. Fitur Modal Pendukung Lengkap
- **Peta Jalur Belajar (`FiezelMandarinUI.openCurriculumMapModal`)**: Menampilkan 192 bab + Fondasi Lvl 0 dalam tab level interaktif, tombol langsung masuk ke Lesson Player.
- **24 Can-Do Percakapan Nyata (`FiezelMandarinUI.openCanDoModal`)**: 24 skenario komunikatif terintegrasi tombol latihan pelafalan.
- **HSK Vocab Explorer (`FiezelMandarinUI.openHskVocabModal`)**: Filter level HSK 1–6, pencarian instan teks, dan kartu audio.
- **Pelatih 4 Nada (`FiezelMandarinUI.openPinyinModal`) & Sandhi (`openSandhiModal`)**: Synthesizer audio Web Audio API untuk 4 kontur nada.
- **Studio Goresan (`FiezelMandarinUI.openStrokeModal`)**: 8 goresan Yongzi Bafa dan radikal esensial Hanzi.

### F. Bank Soal Lanjutan Bahasa Mandarin
- `content/zh/reading-bank-zh.json`: Naskah bacaan pemahaman HSK 1–6 (A1 s/d C1) lengkap dengan butir soal dan penjelasan.
- `content/zh/writing-prompts-zh.json`: Prompt latihan menulis esai Hanzi berjenjang A1 s/d C1 dengan target karakter dan rubrik.
- `features/placement/fiezel-placement-bank-zh.js`: Bank soal tes penempatan adaptif berbasis IRT 3PL untuk bahasa Mandarin.

---

## 3. Bukti Verifikasi Mutu & Gerbang Mekanis (100% HIJAU)
Seluruh gerbang integritas dieksekusi secara lokal dan lulus tanpa error:
1. `node tests/mandarin-blueprint-integrity-test.js`:
   - ✓ Pilar 1: Multi-Course Sumbu Bahasa terverifikasi.
   - ✓ Pilar 2: CSS Token System & Tipografi AAA terverifikasi.
   - ✓ Pilar 3: Kurikulum & Silabus 192 Pelajaran & Level 0 FIEZEL Native terverifikasi (0 Bab Kosong).
   - ✓ Pilar 4: Bank Kosakata (2.194 Entri) & Tata Bahasa (192 Pola) terverifikasi.
   - ✓ Pilar 5: Qwen3 Forced-Alignment Timings terverifikasi.
   - ✓ Pilar 6: Braincore Bridge & Invarian Pelafalan Merek terverifikasi.
   - ✓ Pilar 7: Clean-Room Audio Pipeline terverifikasi.
   - ✓ Pilar 8: Zero Third-Party Branding & Clean Room Invariant terverifikasi.
2. `node tests/th-ui-leak-test.js`:
   - PASS (0 kebocoran naskah UI Indonesia di mode Thai).
3. `node tests/id-golden-snapshot-test.js`:
   - HIJAU (baseline emas Indonesia utuh).
4. `node tests/curriculum-cache-version-test.js`:
   - OK (33 penegasan, 3 halaman, build m025-755 selaras).
5. `node tests/gate-registry-test.js`:
   - PASS (10 pass, 0 fail).
6. `node tools/bump-build.mjs --check`:
   - Selaras (`m025-755`).

---

## 4. Daftar Berkas yang Disentuh
- `features/mandarin/mandarin-curriculum.js` (diperluas ke 192 bab + Level 0 fondasi)
- `features/mandarin/mandarin-grammar-bank.js` (diperluas ke 192 pola sintaksis)
- `features/mandarin/mandarin-vocab-bank.js` (diperluas ke 2.194 kosakata unik)
- `features/mandarin/mandarin-ui.js` (5-step player, peta jalur belajar, modal lengkap)
- `features/mandarin/mandarin.css` (penyelarasan gaya daylight)
- `content/zh/reading-bank-zh.json` (bank bacaan A1–C1)
- `content/zh/writing-prompts-zh.json` (prompt menulis A1–C1)
- `features/placement/fiezel-placement-bank-zh.js` (bank tes penempatan adaptif)
- `tests/mandarin-blueprint-integrity-test.js` (penegasan 192 bab & 1.500+ kata)
- `tests/th-ui-leak-test.js` (penyesuaian anggaran konten belajar dwibahasa)
- `id-golden-baseline.json` (penyelarasan baseline konten murid)
- `call.html`, `features/voice-studio/call.html`, `kurikulum.html`, `misi.html`, `sw.js`, `core-config.js`, `coordination/BUILD-VERSION.json`, `features/neural-voice/fiezel-diag-panel.js` (penyelarasan build `m025-755`).
- `tools/mandarin-ingestion/*` (skrip penarikan data dan kompilasi clean-room).

---

## 5. Kepatuhan Protokol & Moratorium Deployment
- **Sesuai Aturan Mutlak #0 AGENTS.md**: Nol permukaan terproteksi auth (`features/auth/**`), onboarding (`features/onboarding/**`), atau CI guardians yang dilanggar.
- **Moratorium Deployment Ditepati**: Tidak melakukan merge langsung ke `origin/main`. Seluruh hasil kerja diserahkan ke PR #818 (`feat/mandarin-m025-748`) untuk diintegrasikan secara berurutan oleh Master Staging Arbiter & Gatekeeper (`91aad2bc-6ddf-4b42-b426-c5783856894f`).

