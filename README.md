# FIEZEL 5.19.0

**Personal English OS** — aplikasi belajar bahasa Inggris adaptif berbasis PWA.
Grammar, kosakata, reading, speaking, dan listening dipetakan ke CEFR A1–C2.
Gratis, tanpa langganan, tanpa akun.

🌐 [fiezel.my.id](https://fiezel.my.id/) · 🚀 [Buka Aplikasi](https://fiezel.my.id/app/) · 🇹🇭 [ภาษาไทย](https://fiezel.my.id/th/)

---

## Konten

| Skill | Jumlah | Detail |
| --- | --- | --- |
| Grammar | 180 lesson × 25 soal | A1: 17 · A2: 29 · B1: 52 · B2: 39 · C1: 24 · C2: 19 |
| Vocabulary | 2.440 entri | Bertingkat mengikuti CEFR |
| Reading | 312 passage / 1.560 soal | Bacaan berjenjang A1–C2 |
| Listening | 1.407 item bank + 36 latihan | Bergaya IELTS & TOEFL |
| Speaking | 36 sesi | Dengan pengenalan suara browser |

## Fitur utama

- **Belajar adaptif** — soal menyesuaikan pola jawaban, bukan urutan tetap. Kesalahan kembali sebagai review di sesi berikutnya.
- **Tes penempatan CEFR** — 25 soal menentukan level awal (A1–C2).
- **Progressive Web App** — dipasang ke Home Screen dari browser, bekerja offline setelah terpasang.
- **Suara neural lokal** — Kokoro.js + ONNX Runtime Web/WASM, ~119 MB diunduh sekali. Sebelum siap, memakai browser Speech Synthesis.
- **Tanpa akun** — progres tersimpan lokal di perangkat. Tidak ada API key vendor, paid inference, atau subscription.
- **Dua bahasa antarmuka** — Indonesia dan Thai. Sistem i18n registry-based (`FiezelI18n.t()`).
- **PAW** — maskot kucing geometris dengan 14 ekspresi interaktif yang bereaksi terhadap pola belajar.
- **Tutor AI** — penjelasan kontekstual dalam sesi belajar.
- **KelasKu untuk Guru** — dashboard analitik kelas dengan briefing otomatis.

## Arsitektur

```
fiezel.my.id/app/     ← PWA (index.html + app.js + sw.js)
fiezel.my.id/         ← Marketing site (website/)
api.fiezel.my.id      ← Cloudflare Worker (workers/api/)
```

| Tempat | Isinya |
| --- | --- |
| akar | Shell aplikasi (`index.html`, `app.js`, `style.css`, `sw.js`), konfigurasi (`core-config.js`), bank data JSON |
| `features/` | 33 modul fitur yang dimuat shell dan di-precache `sw.js` |
| `tests/` | 278 gerbang mutu. Jalankan dari akar: `node tests/<nama>-test.js` |
| `website/` | Situs marketing (id + th), sitemap, robots.txt, llms.txt |
| `workers/` | Cloudflare Worker (api, owner) |
| `deploy/` | Konfigurasi dan skrip deploy edge |
| `docs/` | Arsitektur, kontrak, runbook; `docs/handoffs/` untuk handoff milestone |
| `reports/` | Laporan audit dan evidence |
| `tools/` | Perkakas rilis; `tools/dev/` untuk harness sekali pakai |
| `design/` | Aset desain dan brief redesign |

## Versi & build

| Penanda | Nilai |
| --- | --- |
| `FIEZEL_PAGE_BUILD` | `m025-313` |
| `SW_REV` | `m025-313-paw-kembali-20260913` |
| Grammar schema | `2.0.0` |
| Practice blueprint | `focused-25-v1` |
| Core protocol | `1.7` |

Ketiga penanda build (`core-config.js`, `fiezel-diag-panel.js`, `sw.js`) harus dinaikkan bersamaan.

## Quality gate

```bash
# Gerbang utama
node tests/regression-test.js
node tests/http-smoke-test.js
node tests/a11y-test.js
node tests/pwa-cache-test.js
node tests/pwa-release-coherence-test.js
node tests/th-coverage-test.js

# Semua gerbang (lihat .github/workflows/quality.yml)
# CI menjalankan 278 gerbang pada setiap PR
```

Aplikasi harus dijalankan melalui HTTP/HTTPS, bukan `file://`.

## SEO / AEO / GEO

Situs marketing dilengkapi:
- **SEO**: JSON-LD structured data (8 schema per halaman), canonical, hreflang, Open Graph, Twitter Cards, sitemap dengan priority/lastmod
- **AEO**: FAQPage, HowTo, SpeakableSpecification untuk voice search
- **GEO**: `llms.txt` + `llms-full.txt` untuk AI crawler, robots.txt mengizinkan 12 AI agent (GPTBot, ClaudeBot, PerplexityBot, dll.)

## Instalasi

| Platform | Cara |
| --- | --- |
| Android (Chrome) | Menu ⋮ → "Instal aplikasi" |
| iPhone (Safari) | Bagikan → "Tambah ke Layar Utama" |
| Desktop (Chrome/Edge) | Ikon install di address bar |

## Lisensi & kredit

Dibuat oleh [@fitrarustqi](https://instagram.com/fitrarustqi).
