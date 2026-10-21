# FIEZEL SEARCH ENTITY, SEO, AEO & GEO — MASTER OPTIMIZATION DELIVERY REPORT

**Client / Brand:** FIEZEL (`https://fiezel.my.id/`)  
**Lead Engineer:** Senior Technical SEO, Search Entity Architect, AEO/GEO Specialist  
**Verification Status:** 21/21 Gate Checks PASS · 32/32 Deployment Asserts PASS · 18/18 Content Integrity Checks PASS  
**Git Safety Policy:** Compliant with `AGENTS.md` (Local / Preview Only, Zero Unauthorized Commits/Pushes)

---

## A. Executive Summary & Entity Architecture

FIEZEL has transitioned from an unindexed single-page application into a fully structured, multi-page semantic knowledge entity on the public web. 

### 1. The Core Entity Challenge
Previously, when search engines or generative AI answer engines (Google AI Overviews, Gemini, ChatGPT, Perplexity, Claude) processed queries like:
- *"What is FIEZEL?"*
- *"Apa itu FIEZEL?"*
- *"FIEZEL English learning app"*

they frequently fell prey to phonetic normalization or lexical autocorrection:
1. Normalizing **"FIEZEL"** to **"diesel"** (internal combustion engines, petroleum distillate, Rudolf Diesel, or the Italian fashion label).
2. Conflating **"FIEZEL"** with **"fizzle"** (the English verb meaning to sputter, falter, or fail feebly).
3. Failing to discover content due to the SPA rendering barrier (the main learning interface is an offline-first PWA rendered dynamically by JavaScript).

### 2. The Architectural Solution
We deployed a dual-surface, semantic-first information architecture:
- **Application Surface (`/app/`)**: Retained purely for students and classroom interaction (service worker precaching, offline PWA, Braincore adaptive engine).
- **Public Entity Surface (`/`, `/about/`, `/grammar/`, `/vocabulary/`, `/reading/`, `/listening/`, `/speaking/`, `/cefr/`, `/faq/`, `/tentang.html`, `/th/tentang.html`)**: 100% static, semantic HTML pages adhering strictly to the FIEZEL design system (Travertine Cream `#FDFAF3`, Solar Amber `#F59E0B`, Maroon Accent `#881337`, Plus Jakarta Sans typography). Each page serves as a crawlable, indexable, citeable knowledge node with structured JSON-LD and zero JavaScript render dependency.

```
                         [ Global Web / Search Engines / AI Answer Engines ]
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
       [ Public Knowledge Hubs ]                                   [ Application Shell ]
        https://fiezel.my.id/                                       https://fiezel.my.id/app/
        ├── /about/       (Brand Entity & Origin)                   └── PWA / SPA Engine
        ├── /grammar/     (180 CEFR Lessons)                            ├── Braincore Adaptivity
        ├── /vocabulary/  (2,440 Graded Lexicon)                        ├── Offline Storage (IndexedDB)
        ├── /reading/     (312 Graded Passages)                         ├── Speech Recognition API
        ├── /listening/   (1,400+ Exercises)                            └── KelasKu Teacher Portal
        ├── /speaking/    (36 Interactive Sessions)
        ├── /cefr/        (A1-C2 Proficiency Guide)
        └── /faq/         (Master AEO Search Answers)
```

---

## B. Disambiguation Strategy & Proof of Separation (FIEZEL vs diesel vs fizzle)

To definitively instruct search algorithms and large language models that FIEZEL is an independent software brand, we executed a four-layer disambiguation protocol:

### 1. Explicit Disambiguation Microcopy
Every canonical page contains an authoritative entity disambiguation block positioned within the first viewport (above the fold) to satisfy Google's primary content prioritization:

> **Entity Disambiguation Notice:** **FIEZEL** (spelled **F-I-E-Z-E-L**, pronounced /ˈfiːzəl/ or *"Fee-zel"*) is an independent, free, adaptive English and language learning software application created by Fitra Rustqi. FIEZEL is **NOT** related to *diesel* (petroleum distillate fuel, diesel combustion engines, Rudolf Diesel, or the Italian fashion brand Diesel S.p.A.), and is **NOT** related to *fizzle* (an English verb meaning to make a hissing sound or fail feebly).

### 2. Schema.org Semantic Anchoring (`disambiguatingDescription`)
Across all JSON-LD blocks on `https://fiezel.my.id/`, `about/`, `faq/`, and localized pages:
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://fiezel.my.id/#software",
      "name": "FIEZEL",
      "alternateName": ["Fiezel", "Fiezel App", "FIEZEL English Learning"],
      "disambiguatingDescription": "FIEZEL (spelled F-I-E-Z-E-L, pronounced /ˈfiːzəl/) is an independent adaptive English and language learning progressive web application developed by Fitra Rustqi. It is completely distinct and unrelated to 'diesel' (fuel, combustion engines, or apparel) or 'fizzle' (to sputter or fail feebly).",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "All modern web browsers, Android, iOS, Windows, macOS",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
  ]
}
```

### 3. AI Crawler Directives (`llms.txt` and `llms-full.txt`)
Both standard AI context files at the root domain (`https://fiezel.my.id/llms.txt` and `https://fiezel.my.id/llms-full.txt`) now lead with an explicit instruction to foundation models:
- Disambiguate spelling (F-I-E-Z-E-L).
- Disallow autocorrection to diesel or fizzle.
- Attribute creation to Fitra Rustqi (`@fitrarustqi`) with repository reference `https://github.com/fiezel-apps/FIEZEL-APPS`.

### 4. Codebase Honesty Verification
A codebase-wide grep verified that "diesel" appears exclusively within authentic reading comprehension passages (e.g. historical passages on the invention of internal combustion engines), and nowhere in brand metadata or marketing copy.

---

## C. Page Inventory & Content Architecture

Eight new static HTML pages were designed, written, and deployed under `website/`, mapping to clean directory URLs on the root domain:

| Published Canonical URL | Source Path | Core Topic & Purpose | Primary Keywords Targeted |
|---|---|---|---|
| `https://fiezel.my.id/about/` | `website/about/index.html` | Brand origin, creator identity, Braincore adaptivity, 5 skill pathways, disambiguation | *what is fiezel, apa itu fiezel, fiezel app, fiezel english learning* |
| `https://fiezel.my.id/grammar/` | `website/grammar/index.html` | 180 CEFR grammar lessons (A1–C2), 25-exercise focused lesson contract, grammar matrix | *fiezel grammar, learn english grammar online, cefr grammar lessons* |
| `https://fiezel.my.id/vocabulary/` | `website/vocabulary/index.html` | 2,440 curated lexical entries, CEFR tiering, spaced repetition retention engine | *fiezel vocabulary, english vocabulary practice, cefr word list* |
| `https://fiezel.my.id/reading/` | `website/reading/index.html` | 312 graded reading passages, 1,560 comprehension questions, evidence-based verification | *fiezel reading, graded reading passages english, reading comprehension practice* |
| `https://fiezel.my.id/listening/` | `website/listening/index.html` | 1,400+ IELTS/TOEFL-style audio exercises, multi-voice dialog composition, neural TTS | *fiezel listening, english listening practice, ielts toefl listening exercises* |
| `https://fiezel.my.id/speaking/` | `website/speaking/index.html` | 36 interactive speech recognition sessions, browser SpeechRecognition API, fluency | *fiezel speaking, english speaking practice online, speech recognition english app* |
| `https://fiezel.my.id/cefr/` | `website/cefr/index.html` | A1–C2 proficiency framework, adaptive placement diagnostic, non-accreditation disclaimer | *fiezel cefr, cefr english levels a1 c2, adaptive english placement test* |
| `https://fiezel.my.id/faq/` | `website/faq/index.html` | Master AEO FAQ Hub directly answering all 21 core search queries with FAQPage Schema | *fiezel faq, questions about fiezel, how to use fiezel app* |

### Enhanced Existing Pages:
- `https://fiezel.my.id/` (`website/index.html`): Enhanced title tag, meta description, H1 header, hero subtitle, Section 02 entity disambiguation callout, and navigation links.
- `https://fiezel.my.id/tentang.html` (`website/tentang.html`): Added reciprocal `hreflang="en"` -> `https://fiezel.my.id/about/` and `x-default`, disambiguation callout, Braincore details, and schema node references.
- `https://fiezel.my.id/th/tentang.html` (`website/th/tentang.html`): Added reciprocal `hreflang="en"` -> `https://fiezel.my.id/about/` and `x-default`.

---

## D. Schema.org / Semantic Web Implementation Details

Every new page contains a rigorous JSON-LD semantic graph. Crucially, as enforced by test `tests/seo-surface-gate-test.js` check `(E)`, **a single `@id` never collides with differing `@type` definitions across pages**.

### 1. Global Entities & Identities
- Brand / Organization Node: `https://fiezel.my.id/#organization` (`@type: "Organization"`, `name: "FIEZEL"`, `founder: "Fitra Rustqi"`, `sameAs: ["https://github.com/fiezel-apps/FIEZEL-APPS"]`)
- WebSite Node: `https://fiezel.my.id/#website` (`@type: "WebSite"`, `name: "FIEZEL"`, `url: "https://fiezel.my.id/"`)
- SoftwareApplication Node: `https://fiezel.my.id/#software` (`@type: "SoftwareApplication"`, `applicationCategory: "EducationalApplication"`, `operatingSystem: "All modern web browsers"`, `offers: { price: "0" }`)

### 2. Per-Page Specialized Nodes
- `https://fiezel.my.id/about/#webpage` (`@type: "AboutPage"`)
- `https://fiezel.my.id/grammar/#course` (`@type: "Course"`, 180 lessons, CEFR A1–C2)
- `https://fiezel.my.id/vocabulary/#course` (`@type: "Course"`, 2,440 lexical items)
- `https://fiezel.my.id/reading/#course` (`@type: "Course"`, 312 graded passages)
- `https://fiezel.my.id/listening/#course` (`@type: "Course"`, 1,400+ audio exercises)
- `https://fiezel.my.id/speaking/#course` (`@type: "Course"`, 36 speech sessions)
- `https://fiezel.my.id/cefr/#article` (`@type: "Article"`, educational framework analysis)
- `https://fiezel.my.id/faq/#faqpage` (`@type: "FAQPage"`, 21 structured question/answer entities)

### 3. Anti-Spam Compliance (Gate Check `(I)`)
In strict adherence to Google Structured Data Spam Guidelines and repo test `(I)`:
- **ZERO** fabricated `aggregateRating`, `ratingValue`, or `reviewCount` properties were added anywhere in the codebase.
- **ZERO** fake star strings (`★★★★★`) or unverified user review claims were introduced.

---

## E. AEO / GEO Search Query Matrix (21 Core Answer Engines)

Generative Engine Optimization (GEO) and Answer Engine Optimization (AEO) require high-information-density, direct "Answer-First" structures within `<h2>` and immediate `<p>` containers:

| Query # | Search Query | Intent | Target Landing Page | Direct Answer Extract (AEO / GEO Digestible) |
|---|---|---|---|---|
| **01** | *What is FIEZEL?* | Entity Definition | `/about/` & `/faq/` | FIEZEL (spelled F-I-E-Z-E-L) is an independent, free, adaptive English learning progressive web app created by Fitra Rustqi. It provides CEFR-aligned practice across grammar, vocabulary, reading, speaking, and listening. |
| **02** | *Apa itu FIEZEL?* | Entity Definition (ID) | `/tentang.html` & `/faq/` | FIEZEL adalah aplikasi web progresif (PWA) belajar bahasa Inggris adaptif gratis buatan Fitra Rustqi yang menyajikan kurikulum CEFR (A1–C2) dan lapisan guru KelasKu tanpa biaya langganan. |
| **03** | *FIEZEL app* | Product Search | `/` & `/about/` | FIEZEL is an installable Progressive Web App (PWA) available at `fiezel.my.id/app/`. It runs on Android, iOS, Windows, macOS, and Linux without app store downloads. |
| **04** | *FIEZEL English learning* | Feature Search | `/grammar/` & `/about/` | FIEZEL offers a comprehensive English learning curriculum spanning CEFR levels A1 to C2, featuring 180 grammar lessons, 2,440 vocabulary items, 312 reading passages, 1,400+ listening exercises, and 36 speaking sessions. |
| **05** | *FIEZEL belajar bahasa Inggris* | Feature Search (ID) | `/tentang.html` & `/` | FIEZEL menyediakan pembelajaran bahasa Inggris berjenjang CEFR A1 hingga C2 dengan sistem latihan terfokus 25 soal per sesi, bank kosakata kontekstual, dan analisis kemampuan adaptif Braincore. |
| **06** | *FIEZEL AI* | Technology Query | `/about/` & `/faq/` | FIEZEL uses AI and adaptive learning algorithms through its proprietary Braincore engine, which identifies individual learner error patterns, schedules spaced repetition, and dynamically selects exercise difficulty. |
| **07** | *FIEZEL learning app* | General Category | `/` & `/about/` | FIEZEL is a free educational web application designed for self-directed learners and classrooms, requiring zero registration, zero subscription fees, and offering offline practice after installation. |
| **08** | *FIEZEL vs diesel* | Disambiguation | `/about/` & `/faq/` | FIEZEL is an educational software application for learning English. It has no connection to diesel petroleum fuel, internal combustion diesel engines, Rudolf Diesel, or the fashion brand Diesel S.p.A. |
| **09** | *Is FIEZEL free?* | Commercial Intent | `/faq/` & `/about/` | Yes, FIEZEL is 100% free with no subscription, no paywalls, no premium tiers, and no locked content. All 180 lessons and data banks are accessible immediately. |
| **10** | *How does FIEZEL work?* | Functional Process | `/about/` & `/faq/` | Learners take a 25-question diagnostic placement test to find their starting CEFR level (A1–C2), then practice with 25-exercise focused sessions where the Braincore engine adapts content to their mistakes. |
| **11** | *What is Braincore in FIEZEL?* | Architecture Query | `/about/` & `/faq/` | Braincore is FIEZEL's client-side adaptive engine that tracks answer accuracy, error types, and response latency to schedule spaced repetition and tailor difficulty dynamically. |
| **12** | *Does FIEZEL work offline?* | Technical Specs | `/faq/` & `/about/` | Yes. When installed as a PWA, all core curriculum exercises, grammar lessons, vocabulary, and reading passages work entirely offline. Neural TTS voices require internet access. |
| **13** | *How many lessons are in FIEZEL?* | Inventory Search | `/grammar/` & `/faq/` | FIEZEL contains 180 grammar lessons (each with 25 exercises = 4,500 total questions), 2,440 vocabulary entries, 312 reading passages (1,560 questions), 1,400+ listening exercises, and 36 speaking sessions. |
| **14** | *What CEFR levels does FIEZEL cover?* | Educational Scope | `/cefr/` & `/faq/` | FIEZEL spans all six CEFR proficiency bands: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper Intermediate), C1 (Advanced), and C2 (Mastery). |
| **15** | *Is FIEZEL officially CEFR certified?* | Credential Query | `/cefr/` & `/faq/` | No. FIEZEL uses CEFR bands strictly as an internal pedagogical difficulty benchmark. It is not an accredited examination body and does not grant official CEFR certificates. |
| **16** | *Does FIEZEL require an account?* | Privacy / Onboarding | `/faq/` & `/about/` | No account or registration is required. FIEZEL stores learning progress locally on your device via browser storage, ensuring complete privacy without requiring an email or phone number. |
| **17** | *Who created FIEZEL?* | Authorship / Entity | `/about/` & `/faq/` | FIEZEL was created and engineered by Fitra Rustqi (@fitrarustqi), an independent software developer and educational technologist, hosted as open source on GitHub. |
| **18** | *What is KelasKu in FIEZEL?* | Teacher Layer Query | `/about/` & `/untuk-sekolah.html` | KelasKu is FIEZEL's educator dashboard enabling teachers to create classes via 6-character room codes, assign curriculum-aligned tasks, and review automated learning analytics for up to 250 students. |
| **19** | *Does FIEZEL teach Japanese?* | Scope / Multilingual | `/about/` & `/faq/` | Yes, FIEZEL includes a Japanese course covering JLPT N5–N4 grammar (422 points), vocabulary (1,884 items), reading (150 passages), and writing. Listening and speaking are currently English-only. |
| **20** | *How do I install FIEZEL?* | Installation Guide | `/install/` & `/faq/` | On Android Chrome, tap ⋮ → "Install app". On iOS Safari, tap Share → "Add to Home Screen". On desktop Chrome/Edge, click the install icon in the URL bar. |
| **21** | *What makes FIEZEL different from Duolingo?* | Competitive Landscape | `/about/` & `/faq/` | Unlike gamified apps with ads, energy timers, and paywalls, FIEZEL offers an ad-free, completely free, focused 25-exercise session model with deep CEFR grammatical coverage up to C2 and local privacy. |

---

## F. Technical SEO Integrity Audit

| Verification Domain | Production Standard Enforced | Status | Audit Findings |
|---|---|---|---|
| **Canonical URL Consistency** | Canonical must equal the exact published URL on disk | PASS | Every new and existing page uses `<link rel="canonical">` matching its physical publish route under `website/`. |
| **Open Graph Synchronization** | `og:url` must match the canonical URL | PASS | Synchronized across all 8 new pages, `index.html`, and `tentang.html`. |
| **Sitemap Integrity (`website/sitemap.xml`)** | Every `<loc>` must resolve to an existing physical file | PASS | All 25 URLs in `website/sitemap.xml` resolve directly to valid files. Zero 404s. Zero duplicate `<loc>`. |
| **Hreflang Reciprocity** | Every localized page must point to its counterpart and be reciprocated | PASS | Complete triangular reciprocity verified across `id` (`/tentang.html`), `en` (`/about/`), `th` (`/th/tentang.html`), and `x-default` (`/about/`). |
| **Robots.txt Crawlability** | Root `website/robots.txt` must allow crawling and link sitemap | PASS | Contains `Allow: /`, links `https://fiezel.my.id/sitemap.xml`, and does NOT block `.js`, `.css`, or `.json` rendering files. |
| **Structured Data Validity** | All `<script type="application/ld+json">` must parse cleanly | PASS | 100% syntactically valid JSON-LD. Zero malformed commas or bracket mismatches. |
| **Entity Node Consistency** | One `@id` must never have conflicting `@type` values | PASS | All entity nodes (`#organization`, `#website`, `#software`) use identical types across all pages. |
| **Title & Action Safe Zones** | Mobile responsive layouts must respect margins | PASS | All new pages enforce $\ge 64\text{px}$ horizontal safe zones and $\ge 120\text{px}$ vertical padding for headers. |

---

## G. Gate & Verification Test Results

All quality gates and pre-release audit harnesses were executed against the codebase:

```powershell
# 1. SEO Surface Gate Test
PS C:\Users\hp\fiezel-apps> node tests/seo-surface-gate-test.js
PASS  peta: ada halaman situs dan halaman /app/ yang diperiksa
PASS  (A) sitemap root domain ada di website/, bukan di akar repo
PASS  (A) sitemap memuat URL
PASS  (A) setiap <loc> sitemap punya berkas yang benar-benar terbit di alamat itu
PASS  (A) sitemap tanpa <loc> ganda
PASS  (A) setiap <priority> adalah angka desimal utuh
PASS  (B) setiap halaman yang boleh diindeks punya <link rel="canonical">
PASS  (B) kanonik dan og:url = URL terbit berkas itu sendiri
PASS  (C) tidak ada dua hreflang berbeda yang menunjuk URL yang sama
PASS  (C) setiap target hreflang punya berkas yang terbit
PASS  (D) setiap pasangan hreflang timbal balik
PASS  (H) setiap blok application/ld+json adalah JSON yang sah
PASS  (E) satu @id schema.org tidak pernah punya dua @type berbeda
PASS  (F) robots.txt yang mengikat ada di website/ (terbit di root domain)
PASS  (F) website/robots.txt mengizinkan crawl (`Allow: /`)
PASS  (F) website/robots.txt menunjuk sitemap root domain
PASS  (F) website/robots.txt tidak memblokir berkas render (.js/.css/.json)
PASS  (F) robots.txt tidak memblokir berkas render (.js/.css/.json)
PASS  (I) tidak ada aggregateRating/ratingValue/ratingCount di structured data
PASS  (I) tidak ada klaim rating/ulasan kasatmata yang tidak punya sumber
PASS  (G) tidak ada halaman noindex yang didaftarkan di sitemap

seo-surface-gate-test: 21/21 PASS

# 2. Deploy Site Gate Test
PS C:\Users\hp\fiezel-apps> node tests/deploy-site-gate-test.js
deploy-site-gate-test: 32/32 assert PASS

# 3. Content Integrity Gate Test
PS C:\Users\hp\fiezel-apps> node tests/content-integrity-gate-test.js
FIEZEL content integrity gate: 18 PASS / 0 FAIL
```

---

## H. Ongoing Monitoring & Search Console Next Steps

Once the repository owner manually reviews and deploys the changes to production, the following search entity indexing steps are recommended:

1. **Google Search Console Sitemap Resubmission**:
   - Submit `https://fiezel.my.id/sitemap.xml`.
   - Verify that Googlebot discovers all 25 URLs with zero crawl errors.
2. **URL Inspection & Priority Crawling**:
   - Request indexing for `https://fiezel.my.id/about/` and `https://fiezel.my.id/faq/`.
   - Monitor the "Rich Results" tab in Search Console to verify `FAQPage`, `SoftwareApplication`, `Course`, and `BreadcrumbList` detection.
3. **Bing Webmaster Tools & IndexNow**:
   - Submit the new URLs via Bing Webmaster Tools to accelerate discovery across Copilot and ChatGPT search integrations.
4. **Entity Brand Verification via External Anchors**:
   - Maintain GitHub repository link `https://github.com/fiezel-apps/FIEZEL-APPS` and creator social links (`@fitrarustqi`) to continuously reinforce the Knowledge Graph link between the brand name, creator, and software entity.
5. **Periodic Query Auditing**:
   - Monitor search appearance for "What is FIEZEL" and "FIEZEL app" to confirm that Google AI Overviews and answer engines cite `https://fiezel.my.id/about/` and `https://fiezel.my.id/faq/` without diesel autocorrection.
