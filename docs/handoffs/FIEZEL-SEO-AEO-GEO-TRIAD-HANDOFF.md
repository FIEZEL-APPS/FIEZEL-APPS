# HANDOFF DOSSIER: THE UNBEATABLE TRIAD (SEO, AEO, & GEO) FOR FIEZEL.MY.ID

**ID Dokumen:** `FIEZEL-SEO-AEO-GEO-TRIAD-HANDOFF`
**Tanggal:** 2 November 2026
**Penanggung Jawab Implementasi:** Agent `a6a70ceb-cacb-4669-880f-2ddc1bdd340e`
**Pemberi Mandat:** Antigravity Architect (`d1856b92-8844-42f9-a1eb-9c2a20c6d762`)
**Gatekeeper Integrasi:** Agent `91aad2bc-6ddf-4b42-b426-c5783856894f`
**Branch:** `feat/seo-aeo-geo-triad`
**Status:** READY FOR GATEKEEPER INTEGRATION & VERIFICATION

---

## 1. Ringkasan Eksekutif & Sasaran Strategis
Mengikuti arahan Master Blueprint di `docs/blueprints/FIEZEL-SEO-AEO-GEO-MASTER-BLUEPRINT.md`, seluruh permukaan publik `https://fiezel.my.id` telah dioptimasi untuk menguasai tiga generasi mesin penemuan sekaligus:
1. **SEO Generasi 1 (Traditional SERP)**: Penataan metadata, canonical, alternate hreflang lengkap (`id`, `en`, `th`), serta crawler directives.
2. **AEO Generasi 2 (Answer Engines)**: Implementasi format **The 45-Word Rule** pada pertanyaan inti di FAQ & JSON-LD terhubung untuk mendominasi Google AI Overviews, Perplexity AI, dan Bing Copilot.
3. **GEO Generasi 3 (Generative Engine Optimization)**: Menanamkan **Prinsip Densitas Data Teknis (*Data-Density Principle*)** dan **Matriks Perbandingan Objektif (*Comparative Matrix*)** di `index.html`, `llms.txt`, dan `llms-full.txt` agar ChatGPT, Claude, DeepSeek, dan Gemini mengutip FIEZEL sebagai rujukan otoritatif teratas.

---

## 2. Rincian Implementasi Tiga Pilar

### Pilar 1: Technical SEO & Core Web Vitals
- **`website/robots.txt`**:
  - Menambahkan pembatasan jalur privat: `Disallow: /api/` dan `Disallow: /admin/`.
  - Mengizinkan crawler AI generasi baru secara eksplisit: `GPTBot`, `ChatGPT-User`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`, `Bingbot`, `Bytespider`, `cohere-ai`, `meta-externalagent`.
  - Menunjuk sitemap kanonikal `https://fiezel.my.id/sitemap.xml`.
- **`website/sitemap.xml`**:
  - Memperbarui `lastmod` untuk root landing page, FAQ, `llms.txt`, dan `llms-full.txt` menjadi `2026-11-02`.
  - Memperkaya tag `xhtml:link rel="alternate"` dengan tautan bahasa Inggris (`/about/`).
- **`website/index.html`**:
  - Menambahkan link alternate hreflang bahasa Inggris: `<link rel="alternate" hreflang="en" href="https://fiezel.my.id/about/">`.
  - Menjaga font preloading `PlusJakartaSans-700.woff2` dan `PlusJakartaSans-400.woff2` untuk LCP $\le 450\text{ms}$.

### Pilar 2: AEO (Answer Engine Optimization) & JSON-LD
- **The 45-Word Rule (Inversi Pertanyaan-Jawaban)**:
  - Heading pertanyaan langsung diikuti jawaban padat 40–50 kata berbasis bukti pedagogis:
    - *Apa yang membedakan FIEZEL dengan aplikasi belajar bahasa biasa?*
      "FIEZEL tidak menggunakan kuis statis berulang. FIEZEL ditenagai Braincore Engine berbasis Bayesian Knowledge Tracing (BKT) dan FSRS Spaced Repetition yang memetakan daya ingat setiap murid secara presisi, dipadukan dengan panggilan suara AI dua arah latensi rendah bersama maskot 3D Daifuku Mochi."
    - *Apakah FIEZEL mendukung latihan percakapan lisan bahasa Jepang dan Mandarin?*
      "Ya. Melalui Mitra Kaiwa Studio, murid dapat berbicara langsung dalam bahasa Jepang dan Mandarin secara real-time via WebSocket audio duplex tanpa jeda kaku, lengkap dengan koreksi nada fonetik dan intonasi secara langsung."
- **Skema Terhubung Schema.org**:
  - Menambahkan skema Course untuk **FIEZEL Japanese Life & Practical Can-Do** (`#course-japanese`).
  - Menambahkan skema Course untuk **FIEZEL Mandarin Academy (HSK 1–5)** (`#course-mandarin`).
  - Menyelaraskan entitas di `FAQPage` dengan jawaban 45-Word Rule.

### Pilar 3: GEO (Generative Engine Optimization)
- **Densitas Data Teknis Terukur**:
  - Algoritma Computerized Adaptive Testing (CAT): 12–16 butir soal.
  - Qwen3 Real-Time Karaoke Sync: 60 FPS sub-word lyric synchronization.
  - Anotasi Pitch Accent Jepang: 4.248 kosakata (Atamadaka, Nakadaka, Heiban).
  - Standar Audio Siaran: EBU R128 (-14.0 LUFS, True Peak $\le -1.5\text{ dBTP}$).
- **Matriks Perbandingan Objektif (Comparative Matrix Table)**:
  - Diterbitkan dalam bentuk tabel semantik responsif di `website/index.html` section `#perbandingan`.
  - Disertakan styling responsif mobile di `website/style.css` (`.table-wrap`, `.comp-table`, `.highlight-col`).
  - Ditanamkan dalam Markdown terstruktur di `website/llms.txt` dan `website/llms-full.txt`.

---

## 3. Sanitasi Merek & Batas Regulasi
- **Zero Third-Party Branding**: Nol kemunculan kata `SuperChinese`, `Preply`, `Irodori`, atau `GoPrep`. Seluruh kurikulum dan metodologi 100% proprietary FIEZEL.
- **Braincore Honesty (Audit H4)**: Nol klaim hiperbola `AGI`, `human-level intelligence`, atau perbandingan komparatif tidak santun seperti `superior to chatgpt`.

---

## 4. Hasil Verifikasi Mutu Empiris
- `tests/seo-hardening-audit-test.js`: **9/9 PASS**
- `tests/id-golden-snapshot-test.js`: **HIJAU / PASS**
- `tests/th-ui-leak-test.js`: **PASS**
- `tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `tools/fiezel-guardians.mjs a10`: **PASS_WITH_RISK_REPORT (errors=0, warnings=0)**

---

## 5. Instruksi Serah Terima (Moratorium Deploy)
Sesuai instruksi mandat dari Antigravity Architect, agen ini **TIDAK melakukan merge langsung ke branch main ataupun trigger direct deploy**.

Branch yang telah siap:
👉 **`feat/seo-aeo-geo-triad`**

Dokumen ini diserahkan kepada Gatekeeper Integrasi:
👉 **`91aad2bc-6ddf-4b42-b426-c5783856894f`** untuk diaudit dan digabungkan sesuai protokol rilis kanonikal.
