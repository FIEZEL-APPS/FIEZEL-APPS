# FIEZEL 5.19.0

**Ruang belajar bahasa personal** — PWA belajar bahasa adaptif dengan dua kursus:
**Bahasa Inggris** (CEFR A1–C2) dan **Bahasa Jepang** (JLPT N5–N4). Dilengkapi lapisan guru
**KelasKu** yang menyambungkan tugas kelas ke Kurikulum Nasional.
Gratis, tanpa langganan, tanpa akun.

> **Entity Notice / Disambiguasi Merek:** **FIEZEL** (dieja F-I-E-Z-E-L, lafal /ˈfiːzəl/ atau "Fee-zel") adalah perangkat lunak dan aplikasi web edukasi independen karya Fitra Rustqi. FIEZEL **bukan** "diesel" (bahan bakar minyak/mesin diesel) dan **bukan** "fizzle".

🌐 [fiezel.my.id](https://fiezel.my.id/) · 🚀 [Buka Aplikasi](https://fiezel.my.id/app/) · 🏫 [Untuk Sekolah](https://fiezel.my.id/untuk-sekolah.html) · 🇹🇭 [ภาษาไทย](https://fiezel.my.id/th/) · 📖 [About FIEZEL](https://fiezel.my.id/about/) · 📚 [English Hub](https://fiezel.my.id/grammar/) · ❓ [FAQ](https://fiezel.my.id/faq/)

---

## Positioning

**Bahasa adalah mesin utama. Kurikulum sekolah adalah lapisan guru, bukan janji konten.**

Ini keputusan sadar, bukan kebetulan penamaan. Angkanya yang menentukan:

| Jalur | Isi | Perannya |
| --- | --- | --- |
| Adaptif Bahasa Inggris | ±1.150 soal A1–A2 | mesin konten sebenarnya |
| Kurikulum Fase D | 8 bab / 62 soal | alat guru menerbitkan tugas |
| 17 mapel KelasKu | 15 soal/mapel, belum sadar tingkat kelas | belum layak dipakai |

Menjual FIEZEL sebagai "aplikasi Kurikulum Nasional" membuat guru menghabiskan materi satu
tingkat kelas dalam dua minggu. Latar lengkapnya di [`docs/PILOT-SEKOLAH-SMP.md`](docs/PILOT-SEKOLAH-SMP.md).

## Konten

### Kursus Bahasa Inggris — CEFR A1–C2

| Skill | Jumlah | Detail |
| --- | --- | --- |
| Grammar | 180 lesson × 25 soal | A1: 17 · A2: 29 · B1: 52 · B2: 39 · C1: 24 · C2: 19 |
| Vocabulary | 2.440 entri | Bertingkat mengikuti CEFR |
| Reading | 312 passage / 1.560 soal | Bacaan berjenjang A1–C2 |
| Listening | 1.407 item bank + 36 latihan | Bergaya IELTS & TOEFL |
| Speaking | 36 sesi | Dengan pengenalan suara browser |
| Writing | 45 prompt | Dengan rubrik per level |

### Kursus Bahasa Jepang — JLPT N5–N4

| Skill | Jumlah | Detail |
| --- | --- | --- |
| Grammar | 422 poin | 27 keluarga grammar |
| Vocabulary | 1.884 entri | Bertingkat mengikuti JLPT |
| Reading | 150 passage | Bacaan berjenjang N5–N4 |
| Writing | 54 prompt | Target karakter per level |

> **Batas jujur:** kursus Jepang **belum punya listening dan speaking**. Kedua kartu
> sengaja disembunyikan saat kursus Jepang aktif (`TARGET_LANG_BLOCKED_VIEWS`), bukan
> ditampilkan sebagai menu kosong. Penjagaannya di `tests/japanese-surface-honesty-test.js`.

### Kurikulum sekolah — alat guru

| Cakupan | Jumlah |
| --- | --- |
| Kelas 7–12, dua semester | 15 bab / 115 soal |
| Fase D (SMP kelas 7–9) | 8 bab / 62 soal |

Tiap bab membawa perangkat mengajar lengkap: apersepsi, rumus papan tulis, miskonsepsi khas
siswa, diferensiasi, dan kosakata kunci. Rinciannya di
[`docs/handoffs/KURIKULUM-SEKOLAH-HANDOFF.md`](docs/handoffs/KURIKULUM-SEKOLAH-HANDOFF.md).

## Fitur utama

- **Belajar adaptif** — soal menyesuaikan pola jawaban, bukan urutan tetap. Kesalahan kembali sebagai review di sesi berikutnya.
- **Dua sumbu terpisah** — `learnerLocale` (`id`/`th`) mengatur bahasa LAYAR; `targetLang` (`en`/`ja`) mengatur bahasa yang DIPELAJARI. Progres tiap bahasa target berdiri sendiri.
- **Tes penempatan CEFR** — 25 soal menentukan level awal (A1–C2).
- **Progressive Web App** — dipasang ke Home Screen dari browser, bekerja offline setelah terpasang.
- **Suara neural lokal** — Kokoro.js + ONNX Runtime Web/WASM, ~119 MB diunduh sekali. Sebelum siap, memakai browser Speech Synthesis.
- **Tanpa akun** — progres tersimpan lokal di perangkat. Tidak ada API key vendor, paid inference, atau subscription.
- **Dua bahasa antarmuka** — Indonesia dan Thai. Sistem i18n registry-based (`FiezelI18n.t()`).
- **PAW** — maskot kucing geometris dengan 14 ekspresi interaktif yang bereaksi terhadap pola belajar.
- **Tutor AI** — penjelasan kontekstual dalam sesi belajar.
- **KelasKu untuk Guru** — ruang kelas, tugas yang menempel Kurikulum Nasional, analitik per kompetensi, rapor orang tua, dan briefing otomatis.

## Status pilot sekolah

**Belum berjalan.** Belum ada satu pun sekolah yang memakai FIEZEL. Yang ditawarkan di
[halaman Untuk Sekolah](https://fiezel.my.id/untuk-sekolah.html) adalah pilot satu kelas —
1 guru, 1 kelas (~30 murid), 6 minggu, Rp 0.

Kapasitas terpasang **250 pengguna** (`MAX_USERS`): cukup untuk satu kelas, **tidak** cukup
untuk satu sekolah berisi 600–900 murid. Playbook lengkapnya di
[`docs/PILOT-SEKOLAH-SMP.md`](docs/PILOT-SEKOLAH-SMP.md).

## Arsitektur

```
fiezel.my.id/app/     ← PWA (index.html + app.js + sw.js)
fiezel.my.id/         ← Marketing site (website/)
api.fiezel.my.id      ← Cloudflare Worker (workers/api/)
```

| Tempat | Isinya |
| --- | --- |
| akar | Shell aplikasi (`index.html`, `app.js`, `style.css`, `sw.js`), konfigurasi (`core-config.js`), bank data JSON |
| `content/ja/` | Bank kursus Bahasa Jepang (grammar, kosakata, reading, writing) |
| `content/mapel/` | Bank mata pelajaran Fase D |
| `features/` | 33 modul fitur yang dimuat shell dan di-precache `sw.js` |
| `tests/` | 307 gerbang mutu. Jalankan dari akar: `node tests/<nama>-test.js` |
| `website/` | Situs marketing (id + th) yang terbit di ROOT domain: beranda, tentang, untuk-sekolah, install, legal, sitemap, robots.txt, llms.txt. Akar repo terbit di `/app/` — dua permukaan berbeda, dijaga `tests/seo-surface-gate-test.js` |
| `workers/` | Cloudflare Worker (api, owner) |
| `deploy/` | Konfigurasi dan skrip deploy edge |
| `docs/` | Arsitektur, kontrak, runbook; `docs/handoffs/` untuk handoff milestone |
| `reports/` | Laporan audit dan evidence |
| `tools/` | Perkakas rilis; `tools/dev/` untuk harness sekali pakai |
| `design/` | Aset desain dan brief redesign |

## Versi & build

| Penanda | Nilai |
| --- | --- |
| `FIEZEL_PAGE_BUILD` | `m025-359` |
| `SW_REV` | `m025-359-paw-kembali-20260913` |
| Grammar schema | `2.0.0` |
| Practice blueprint | `focused-25-v1` |
| Core protocol | `1.7` |

**Setiap PR product-deploy wajib menaikkan penanda tepat +1 terhadap `origin/main`** —
bukan hanya saat berkas shell berubah. `A7 Automated Release Safety` tidak memeriksa berkas
apa yang berubah; ia hanya membandingkan angkanya, dan memerahkan PR yang tidak naik.

Enam tempat naik bersamaan: `coordination/BUILD-VERSION.json`, `core-config.js`
(`FIEZEL_PAGE_BUILD`), `features/neural-voice/fiezel-diag-panel.js` (`DIAG_BUILD`), `sw.js`
(`SW_REV`, awalannya wajib `m025-<N>-`), `?v=` di `kurikulum.html` + `misi.html`, dan tabel
di atas. Kalau `main` bergerak sementara PR terbuka, angkanya bergeser dan bump harus
diulang.

Konsekuensi yang disadari: tiap kenaikan memaksa semua perangkat terpasang mengunduh ulang
cangkang ±9,7 MB. Itu harga yang memang dipilih repo ini demi jaminan bahwa PWA terpasang
tidak pernah menjalankan kode baru di atas cangkang lama.

## Quality gate

```bash
# Gerbang utama
node tests/regression-test.js
node tests/http-smoke-test.js
node tests/a11y-test.js
node tests/pwa-cache-test.js
node tests/pwa-release-coherence-test.js
node tests/th-coverage-test.js
node tests/seo-surface-gate-test.js

# Semua gerbang (lihat .github/workflows/quality.yml)
# CI menjalankan 307 gerbang pada setiap PR
```

Aplikasi harus dijalankan melalui HTTP/HTTPS, bukan `file://`.

## SEO / AEO / GEO

Situs marketing dilengkapi:
- **SEO**: JSON-LD structured data (8 schema per halaman), canonical, hreflang timbal balik id↔th, Open Graph, Twitter Cards, sitemap dengan priority/lastmod
- **AEO**: FAQPage, HowTo, SpeakableSpecification untuk voice search
- **GEO**: `llms.txt` + `llms-full.txt` untuk AI crawler, robots.txt mengizinkan 12 AI agent (GPTBot, ClaudeBot, PerplexityBot, dll.)

Dua aturan yang dijaga `tests/seo-surface-gate-test.js` dan mudah dilanggar tanpa sadar:

1. **Akar repo terbit di `/app/`, bukan di root domain.** Pekerjaan SEO untuk root domain
   harus dikerjakan di `website/`. `robots.txt` akar inert dan tidak pernah terlayani.
2. **Tidak ada `aggregateRating`/`review` di mana pun.** Rating tanpa sumber adalah
   pelanggaran kebijakan spam structured data Google yang sanksinya tingkat situs — seluruh
   rich result dicabut, termasuk FAQ. Cabut penjagaan ini hanya sesudah ada pipeline ulasan
   sungguhan yang bisa ditunjuk.

Screenshot situs dibuat ulang per bahasa lewat `node tools/dev/locale-shots.mjs <id|th> <outdir>`.
Potret Thai hidup di `website/assets/shots/th/`, potret Indonesia di `website/assets/shots/`.

## Instalasi

| Platform | Cara |
| --- | --- |
| Android (Chrome) | Menu ⋮ → "Instal aplikasi" |
| iPhone (Safari) | Bagikan → "Tambah ke Layar Utama" |
| Desktop (Chrome/Edge) | Ikon install di address bar |

## Lisensi & kredit

Dibuat oleh [@fitrarustqi](https://instagram.com/fitrarustqi).
