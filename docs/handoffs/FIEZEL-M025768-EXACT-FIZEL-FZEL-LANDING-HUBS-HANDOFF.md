# FIEZEL HANDOFF DOSSIER: EXACT-MATCH DISAMBIGUATION HUBS (/fizel/ & /fzel/) & TITLE TAG ENHANCEMENTS
**Build:** `m025-768`
**Branch:** `feat/fizel-exact-landing`
**Date:** 2026-11-05T16:46:00Z
**Author:** AI Engineer (Antigravity)
**Authority:** OWNER/MASTER authorized implementation
**Scope Tokens:** `[ALLOW-PROTECTED: pwa]`

---

## 1. Executive Summary & Root Cause Analysis

### Background:
Audit live search pada 05 November 2026 membuktikan bahwa:
- Kueri dengan konteks (misal `"Fizel" belajar bahasa` atau `"Fizel" Banda Aceh aplikasi`) telah sukses 100% dialihkan ke FIEZEL (`https://fiezel.my.id/`).
- Namun, ketika pengguna mengetik hanya 1 kata telanjang: `fizel` atau `fzel` tanpa kata konteks apa pun, Google dan Bing mengklasifikasikannya sebagai *Ambiguous Single-Token Query*. Akibatnya, mesin pencari menyajikan entitas global historis berumur 40 tahun (Marius Fizel - atlet judo, Fievel - animasi 1986, Raja Faisal, atau Castel Fizel di Prancis).

### Root Cause:
Sebelum rilis `m025-768`:
1. Kata *"Fizel"* dan *"Fzel"* hanya tersimpan di dalam Schema.org JSON-LD dan FAQ bawah halaman.
2. Tag `<title>` utama dan `<meta name="description">` di `website/index.html` dan `website/tentang.html` hanya memuat kata FIEZEL, tanpa alias fonetik.
3. Website tidak memiliki **Exact URL Slug Match** untuk kata kunci `fizel` dan `fzel`.

### Solution Implemented:
1. **Dedicated Exact-Match Landing Hubs**:
   - `website/fizel/index.html` (`https://fiezel.my.id/fizel/`):
     - Title: `Fizel adalah FIEZEL — Aplikasi Belajar Bahasa Inggris & Jepang Resmi`
     - Heading: `Mencari "Fizel"? Kamu Berada di Tempat yang Tepat: FIEZEL`
     - JSON-LD WebPage, EducationalOrganization, FAQPage, dan Breadcrumb.
   - `website/fzel/index.html` (`https://fiezel.my.id/fzel/`):
     - Title: `Fzel adalah FIEZEL — Ruang Belajar Bahasa Inggris & Jepang Resmi`
     - Heading: `Mencari "Fzel"? Inilah Ruang Belajar Resmi: FIEZEL`
2. **Prominent Title & Meta Description Injections**:
   - `website/index.html`: `<title>FIEZEL (Fizel) — Belajar Bahasa Inggris, Jepang & Mandarin Adaptif</title>`
   - `website/tentang.html`: `<title>Tentang FIEZEL (Fizel / Fzel) — Aplikasi Belajar Bahasa Inggris, Jepang & Mandarin</title>`
   - `website/about/index.html`: `<title>About FIEZEL (Fizel / Fzel) — Adaptive Language Platform & Braincore Engine</title>`
3. **Sitemap & Machine Index Expansion**:
   - `website/sitemap.xml`: Ditambahkan entri canonical untuk `/fizel/` dan `/fzel/` (Priority: 0.9, Changefreq: weekly).
   - `website/llms.txt` & `website/llms-full.txt`: Ditambahkan referensi resmi kedua hub disambiguasi.

---

## 2. Verification & Quality Gates

All local tests passed:
- `node tests/seo-surface-gate-test.js`: **21/21 PASS** (All sitemap URLs exist, canonicals self-referential, zero duplicate hreflang, zero broken ld+json).
- `node tests/seo-hardening-audit-test.js`: **9/9 PASS** (Single H1 on all pages, zero broken internal links, controlled disambiguation).
- `node tests/id-golden-snapshot-test.js`: **HIJAU** (Golden baseline utuh).
- `node tests/th-ui-leak-test.js`: **PASS** (Zero UI leak).
- `node tests/curriculum-cache-version-test.js`: **OK** (33 assertions, build m025-768).
- `node tests/gate-registry-test.js`: **PASS** (10 pass, 0 fail).
- `tools/fiezel-guardians.mjs a10`: **PASS_WITH_RISK_REPORT** (0 errors).
- `node tools/bump-build.mjs --check`: **Selaras (m025-768)** across all 6 targets.

---

## 3. Files Changed

- `website/fizel/index.html` (NEW - Dedicated exact-match landing page for query "fizel")
- `website/fzel/index.html` (NEW - Dedicated exact-match landing page for query "fzel")
- `website/index.html` (Updated title & meta description)
- `website/tentang.html` (Updated title & meta description)
- `website/about/index.html` (Updated title & meta description)
- `website/sitemap.xml` (Registered `/fizel/` and `/fzel/`)
- `website/llms.txt` & `website/llms-full.txt` (Registered both landing hubs)
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` (Bumped to m025-768)

---

## 4. Status & Roadmap / Next Steps

**Status:** Completed, verified, and passing all CI invariants and local regression tests.
**Roadmap / Next Steps:**
1. Monitor GitHub Actions CI gates to 100% green and merge PR #845 to main.
2. Submit the new canonical URLs (`https://fiezel.my.id/fizel/` and `https://fiezel.my.id/fzel/`) via Bing Webmaster API and IndexNow.
3. Observe indexing propagation across Google Search and Bing for standalone single-token queries (`fizel`, `fzel`).
