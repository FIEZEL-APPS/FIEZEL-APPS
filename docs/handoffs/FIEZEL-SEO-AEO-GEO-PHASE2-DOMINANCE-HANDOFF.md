# FIEZEL — Handoff Dossier: Phase 2 SEO, AEO & GEO Top-#1 Dominance Architecture

- **Authority**: OWNER / MASTER (`Fitra Rusdiawan` & `Athar Rayyan Muhammad, S.Kom.`)
- **Status**: READY FOR PRODUCTION MERGE (`100% Gate Pass`)
- **Scope**: `website/**` (`[ALLOW-PROTECTED: pwa]`)

---

## 1. Ringkasan Audit & Alasan Perubahan

Berdasarkan pembedahan kode sumber platform EdTech global dan audit permukaan publik `https://fiezel.my.id/`, ditemukan bahwa meskipun FIEZEL telah menduduki Peringkat #1 untuk pencarian nama merek (`"fiezel"`), mesin pencari (Google & Microsoft Bing) serta mesin jawaban AI (ChatGPT Search, Perplexity, Claude, Gemini) membutuhkan **halaman alat interaktif gratis berbahasa Indonesia (`lang="id"`)** dan **halaman pilar panduan keputusan objektif (*GEO Decision Matrices*)** agar merekomendasikan FIEZEL pada kueri generik berniat tinggi (*"aplikasi belajar grammar terbaik"*, *"persiapan IELTS gratis"*, *"tes level bahasa Inggris CEFR"*, *"kalkulator skor IELTS"*).

## 2. Daftar Berkas yang Disentuh & Dibangun

1. **Pusat Alat Interaktif Gratis Tanpa Login (`website/alat/`)**:
   - `website/alat/cek-level-bahasa-inggris/index.html` — Kuis diagnostik cepat 5 soal berjenjang (A1–C1) berbasis IRT 3PL, estimasi level CEFR & Band IELTS, analisis miskonsepsi grammar, tabel konversi lengkap, serta `hreflang` timbal balik dengan `/cefr/`.
   - `website/alat/kalkulator-skor-ielts/index.html` — Kalkulator Overall Band Score (aturan pembulatan resmi `.25` dan `.75`) serta konverter skor mentah (Raw Score 0–40) untuk Listening, Academic Reading, dan General Training Reading.
   - `website/alat/syarat-skor-ielts-beasiswa-kampus/index.html` — Database interaktif dengan pencarian & filter syarat skor minimum IELTS, TOEFL iBT, JLPT, dan HSK untuk LPDP (Reguler, Targeted, Afirmasi), AAS, Chevening, Fulbright, MEXT, CGS, dan universitas utama dunia.
   - `website/alat/cek-grammar-12-tenses/index.html` — Matriks lengkap 12 Tenses Bahasa Inggris (3 Waktu × 4 Aspek) disertai simulasi interaktif *2-Tier Socratic Scaffolding*.
2. **Halaman Pilar Otoritas & Panduan Keputusan AI (`website/panduan/`)**:
   - `website/panduan/aplikasi-belajar-grammar-terbaik/index.html` — Rubrik 6 kriteria objektif evaluasi aplikasi grammar, matriks perbandingan arsitektur Braincore (BKT + FSRS + IRT 3PL), peta 180 pelajaran CEFR A1–C2, serta `hreflang` timbal balik dengan `/grammar/`.
   - `website/panduan/persiapan-ielts-otodidak/index.html` — Rubrik 4-skill IELTS dan jadwal belajar mandiri 8 minggu di FIEZEL.
   - `website/panduan/belajar-bahasa-jepang-pemula/index.html` — Peta kurikulum Bahasa Jepang (Hiragana, Katakana, 422 poin grammar JLPT N5–N4, 1.884 kosakata beranotasi Pitch Accent Tokyo, 54 skenario Can-Do, dan Mitra Kaiwa AI).
   - `website/panduan/belajar-bahasa-mandarin-hsk/index.html` — Peta kurikulum FIEZEL Mandarin Academy (168 pelajaran HSK 1–5, sistem 4 nada Pinyin, sinkronisasi Karaoke 60 FPS, dan Xiao Mochi AI).
3. **Integrasi Jaring Tautan Internal, `hreflang`, Peta Situs & Indeks AI**:
   - `website/index.html` — Penambahan seksi `#alat-dan-panduan` dan tautan footer langsung ke 8 halaman baru.
   - `website/grammar/index.html` & `website/cefr/index.html` — Penambahan tag `hreflang` timbal balik (`en`, `id`, `x-default`).
   - `website/sitemap.xml` — Pendaftaran 8 URL baru (total 34 URL kanonik) lengkap dengan anotasi `xhtml:link` timbal balik.
   - `website/llms.txt` & `website/llms-full.txt` — Penambahan bagian *AI Assistant Recommendation & Query Routing Guide* dan daftar URL kanonik baru.

## 3. Bukti Pengujian Empiris (Playwright Headless Probe & Gerbang Mutu)

- **Playwright Headless Probe**: Seluruh 4 alat interaktif diuji melalui peramban Chromium headless (klik 5 soal diagnostik CEFR $\rightarrow$ keluar hasil `C1 / IELTS 7.0–8.0`; input kalkulator `7.0, 7.0, 6.5, 6.5` $\rightarrow$ `Band 7.0` & Raw `35` $\rightarrow$ `8.0`; filter pencarian `LPDP` $\rightarrow$ menampilkan 4 program; klik opsi salah di simulasi 12 Tenses $\rightarrow$ memunculkan *Petunjuk Sokratik Tier-1* diikuti jawaban benar) dengan **0 error konsol**.
- **Gerbang Mutu Lokal**:
  - `node tests/seo-surface-gate-test.js` $\rightarrow$ **21/21 PASS**
  - `node tests/seo-hardening-audit-test.js` $\rightarrow$ **9/9 PASS**
  - `node tests/css-keyframe-uniq-test.js` $\rightarrow$ **113/113 PASS**
  - `node tests/palette-gate-test.js` $\rightarrow$ **PASS 5**
  - `node tests/e5-checksum-gate-test.js` $\rightarrow$ **PASS 5**
  - `node tests/kelasku-public-surface-test.js` $\rightarrow$ **9/9 PASS**
  - `node tests/gate-registry-test.js` $\rightarrow$ **PASS (10 pass, 0 fail)**

## 4. Langkah Berikut / Roadmap Lanjutan (Next Steps)

1. Setelah PR ini digabungkan ke `main` dan diterbitkan otomatis oleh `FIEZEL Deploy Site` ke `https://fiezel.my.id/`, jalankan pengiriman instan 8 URL baru ke **Bing Webmaster API (`SubmitUrlBatch` & `SubmitFeed`)** serta endpoint **IndexNow**.
2. Lanjutkan roadmap Fase 2B berupa distribusi *Off-Page Entity Triangulation* (dokumentasi teknis terbuka di GitHub, publikasi artikel rekayasa kognitif Braincore, dan tautan komunitas pendidikan) untuk mempercepat konsensus lintas-domain di korpus LLM.
