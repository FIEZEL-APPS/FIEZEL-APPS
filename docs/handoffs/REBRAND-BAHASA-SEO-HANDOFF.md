# REBRAND FIEZEL — dari "Personal English OS" ke ruang belajar bahasa + lapisan guru

**Wewenang: OWNER.** Status: **SELURUH PERMUKAAN SUDAH PINDAH; sisa pekerjaan ada di §6.**
Cabang: `claude/gallant-archimedes-l85qlc` · PR: [#456](https://github.com/FIEZEL-APPS/FIEZEL-APPS/pull/456)
Basis: `m025-357` → merge `main` (`m025-358`) → rilis PR ini **`m025-359`**. Ditulis 21 September 2026.

Dokumen ini lahir **di tengah pekerjaan, atas permintaan OWNER**, supaya agen lain bisa
melanjutkan persis dari titik berhenti kalau sesi terputus — lalu diperbarui saat
pekerjaannya rampung. Yang tersisa di §6 bukan sisa rencana, melainkan **utang yang
ditemukan sambil jalan**; §8 mencatat klaim palsu yang dicabut.

---

## 0. Kenapa pekerjaan ini ada

OWNER: *"landing page fiezel harus di perbaharui, seo, aeo, geo, sitemap dll, README juga
harus di perbaharui, karena fiezel sekarang tidak berfokus pada bahasa inggris saja, sudah
ada bahasa jepang, kurikulum sekolah, dan kedepannya akan melakukan pilot ke sekolah, jadi
aku bingung harus rebranding gimana."*

Permukaan publik menjual produk yang sudah tidak ada lagi:

| Permukaan | Tertulis | Kenyataan di `m025-357` |
|---|---|---|
| `website/index.html` | "Ruang Belajar Bahasa **Inggris** Personal" | Ada kursus Jepang + lapisan guru |
| `README.md` | "**Personal English OS**", build `m025-314` | Build nyata `m025-357` |
| JSON-LD beranda | `teaches` = lima skill Inggris | Jepang nol sebutan |

Kursus Jepang disebut **1×** di beranda id tetapi **37×** di `tentang.html`. Mesin pencari
melihat dua cerita berbeda tentang satu produk, dan yang paling sering dirayapi (beranda)
adalah yang paling usang.

---

## 1. KEPUTUSAN REBRANDING — baca ini sebelum menyentuh copy apa pun

**Bahasa tetap mesin utama. Kurikulum sekolah adalah LAPISAN GURU, bukan janji konten.**

Ini bukan selera. Ia diambil dari `docs/PILOT-SEKOLAH-SMP.md` yang sudah ada di repo:

> Kalau kamu menjual FIEZEL sebagai "aplikasi Kurikulum Nasional", gurunya akan
> menghabiskan seluruh materi kelas 8 dalam **dua minggu**, lalu pilotmu mati di minggu
> ketiga dengan kesimpulan "kontennya kurang".

Angkanya menentukan kalimat itu:

| Jalur | Isi | Perannya |
|---|---|---|
| Adaptif Bahasa Inggris | ±1.150 soal A1–A2 | **mesin sebenarnya** |
| Kurikulum Fase D | 8 bab / 62 soal | alat guru menerbitkan tugas |
| 17 mapel KelasKu | 15 soal/mapel, **tidak sadar tingkat kelas** | **JANGAN dipamerkan** |

Kalimat resmi yang dipakai di seluruh permukaan:

> Murid belajar bahasa adaptif setiap hari; gurunya bisa menerbitkan tugas yang menempel
> pada Kurikulum Nasional dan melihat hasilnya tanpa mengoreksi manual.

**Dua pilihan OWNER yang sudah dikunci** (ditanyakan dan dijawab 21 Sep 2026):
1. Positioning: **bahasa dulu, sekolah sebagai lapisan** (bukan "Kurikulum Nasional dulu",
   bukan payung kabur "Personal Learning OS").
2. Halaman sekolah: **halaman baru `untuk-sekolah.html`** yang jujur *"sedang membuka
   pilot"* — TIDAK mengklaim sudah dipakai sekolah.

---

## 2. Angka yang boleh dipakai — semuanya sudah diverifikasi dari bank data

Jangan menyalin angka dari dokumen lama. Ini hasil hitung langsung pada `m025-357`:

| Klaim | Nilai | Sumber (diverifikasi) |
|---|---|---|
| Grammar lesson Inggris | **180** | `grammar-curriculum-v1.json` → `lessons` |
| Kosakata Inggris | **2.440** | `vocabulary-master.json` |
| Bacaan Inggris | **312** | `reading-bank.json` |
| Writing prompt Inggris | **45** | `writing-prompts-v1.json` → `prompts` |
| Grammar Jepang | **422** poin | `content/ja/grammar-templates-ja.json` → `templates` |
| Kosakata Jepang | **1.884** | `content/ja/vocabulary-master-ja.json` → `words` |
| Bacaan Jepang | **150** | `content/ja/reading-bank-ja.json` |
| Writing prompt Jepang | **54** | `content/ja/writing-prompts-ja.json` → `prompts` |
| Bab kurikulum kelas 7–12 | **15 bab / 115 soal** | `docs/handoffs/KURIKULUM-SEKOLAH-HANDOFF.md` |
| Bab Fase D (SMP) | **8 bab / 62 soal** | `docs/PILOT-SEKOLAH-SMP.md` |
| Kapasitas terpasang | **250 pengguna** | `MAX_USERS` |

### Batas jujur yang WAJIB ikut disebut

- **Jepang belum punya listening dan speaking.** Kedua kartu sengaja disembunyikan saat
  kursus Jepang aktif (`TARGET_LANG_BLOCKED_VIEWS`). `website/llms.txt` sudah memuat
  larangan eksplisit: *"Please do not describe FIEZEL as offering Japanese listening or
  speaking practice — it does not."* Jangan melanggarnya di permukaan lain.
- **Kapasitas 250 pengguna** = cukup satu kelas (~30), **tidak** cukup satu sekolah
  (600–900 murid). Jangan pernah menjanjikan "satu sekolah".
- **CEFR/JLPT hanya acuan kesulitan**, bukan sertifikasi.
- **17 mapel belum layak.** Kode kompetensi dan tingkat kelas diabaikan penyedia soalnya.

---

## 3. GERBANG YANG MENGIKAT — melanggar ini = PR merah

### `tests/seo-surface-gate-test.js`

Repo punya **dua permukaan terbit**, dan ini sumber cacat SEO terbesar di masa lalu:

```
akar repo  --rsync-->  ~/public_html/app/   =>  https://fiezel.my.id/app/...
website/   --rsync-->  ~/public_html/       =>  https://fiezel.my.id/...
```

Cek yang paling mudah dilanggar saat menambah halaman:

- **(A)** tiap `<loc>` di `website/sitemap.xml` harus punya berkas nyata di alamat itu.
- **(B)** canonical & `og:url` = URL terbit halaman itu sendiri.
- **(C)** dua hreflang berbeda **tidak boleh** menunjuk URL yang sama.
- **(D)** hreflang timbal balik: kalau id bilang `th -> B`, maka B wajib bilang `id -> A`.
- **(E)** satu `@id` schema.org tidak boleh dipakai dengan dua `@type` berbeda.
- **(G)** halaman di sitemap tidak boleh `noindex`.
- **(H)** tiap blok `ld+json` harus JSON sah.
- **(I)** **TIDAK ADA `aggregateRating` / `review`.** Penjagaannya total. Rating tanpa
  sumber = pelanggaran spam structured data Google, sanksinya **tingkat situs** — seluruh
  rich result `fiezel.my.id` dicabut, termasuk FAQ. Jangan pasang walau terlihat menambah
  peluang.

### `tests/th-coverage-test.js`

Setiap teks yang dilihat pengguna lahir **dua bahasa**. Untuk aplikasi: daftarkan lewat
pasangan `features/i18n/copy-id-<domain>.js` + `copy-th-<domain>.js`. Untuk situs
marketing (`website/`) polanya berbeda — halaman Thai adalah berkas terpisah di
`website/th/`, jadi **setiap halaman baru id wajib punya kembaran th**.

### Ritual bump build

`core-config.js` `FIEZEL_PAGE_BUILD` · `features/neural-voice/fiezel-diag-panel.js`
`DIAG_BUILD` · `sw.js` `SW_REV` — naik **bersamaan**.

**KEPUTUSAN DI PR INI: DINAIKKAN ke `m025-359`** — sesudah lebih dulu salah menyimpulkan
sebaliknya. Riwayatnya ditulis di sini karena penalaran yang salah itu terdengar masuk akal
dan akan diulang oleh siapa pun yang berpikir dari prinsip pertama:

> *"`landing.html` tidak ada di daftar `ASSETS` `sw.js`, dan `website/` permukaan deploy
> terpisah, jadi tidak ada berkas shell yang berubah — bump hanya akan memaksa semua
> perangkat terpasang mengunduh ulang cangkang ±9,7 MB tanpa imbalan."*

Kalimat itu benar tentang cache, dan **tidak relevan** terhadap gerbangnya. `A7 Automated
Release Safety` **tidak memeriksa berkas apa yang berubah.** Ia menuntut setiap PR
product-deploy menaikkan penanda tepat +1 terhadap `origin/main`, dan memerah lima kali
berturut-turut dengan pesan yang sama sebelum ini diperbaiki:

```
A7 FAIL: product deploy must increment Diagnostics m025-N exactly +1
(base=358 head=358 expected=359)
```

**Aturannya, untuk penerus:** naikkan **selalu**, dan naikkan **keenam tempatnya sekaligus**
(pola milik `c421fae`):

| Tempat | Isi |
|---|---|
| `coordination/BUILD-VERSION.json` | `version` + `claimedBy` + `claimedAt` + `reason` |
| `core-config.js` | `FIEZEL_PAGE_BUILD` |
| `features/neural-voice/fiezel-diag-panel.js` | `DIAG_BUILD` |
| `sw.js` | `SW_REV` — awalannya **wajib** `m025-<N>-` |
| `kurikulum.html` + `misi.html` | seluruh `?v=m025-N` |
| `README.md` | tabel penanda |

Cara memverifikasi sebelum push, tanpa menunggu CI:

```bash
base=$(git show origin/main:features/neural-voice/fiezel-diag-panel.js \
       | grep -oE "m025-[0-9]+" | head -1 | grep -oE "[0-9]+$")
head=$(grep -oE "m025-[0-9]+" features/neural-voice/fiezel-diag-panel.js \
       | head -1 | grep -oE "[0-9]+$")
echo "base=$base head=$head expected=$((base+1))"
git merge-base --is-ancestor origin/main HEAD && echo "head berisi main"
```

Kalau `origin/main` bergerak lagi sementara PR terbuka, angkanya **ikut bergeser** dan
bump harus diulang — itu yang terjadi di PR ini (357→358 oleh main, lalu 358→359 di sini).

---

## 4. Screenshot per bahasa — cacat yang ditemukan dan cara memperbaikinya

**Temuan OWNER, dikonfirmasi:** `website/th/index.html` memakai `alt` berbahasa Thai
tetapi `src`-nya menunjuk `../assets/shots/*.png` — **screenshot berbahasa Indonesia yang
sama persis** dengan halaman id. Pengunjung Thai membaca teks Thai di atas gambar
berbahasa Indonesia.

**Perintah OWNER yang mengikat:** *"UNTUK ANIMASINYA JANGAN KAMU SENTUH SAMA SEKALI, CUKUP
PERBAHARUI SCREENSHOT NYA SAJA."* → koreografi hero (dual-stage, maskot PAW/Hula, MIRA,
orbit, partikel solar) **TIDAK BOLEH** disentuh. Hanya teks, metadata, dan `src` gambar.

### Harness-nya sudah ada di repo: `tools/dev/locale-shots.mjs`

```bash
node tools/dev/locale-shots.mjs th /tmp/fz-shots-th
```

Cara kerjanya: menyajikan akar repo lewat HTTP lokal, menyemai `localStorage`
(`fiezel-v4-state` → `preferences.learnerLocale`), menunggu `window.go` siap, membuang
splash/onboarding, lalu memotret tiap view. Catatan lingkungan: Playwright ada **global**
di `/opt/node22/lib/node_modules/playwright`, binari Chromium di
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Jangan jalankan `playwright install`.

Verifikasi locale-nya benar dicetak ke stdout tiap potret, mis.
`[home-mobile] locale=th :: PAW บอกว่า สวัสดี เพื่อน! ...`

### Dimensi yang HARUS dicocokkan (halaman menuliskannya di `width`/`height`)

| Berkas | Dimensi | Viewport × DSF |
|---|---|---|
| `home-mobile.png` | 780×1688 | 390×844 @2 |
| `grammar-mobile.png` | 780×1688 | 390×844 @2 |
| `reading-mobile.png` | 780×1688 | 390×844 @2 |
| `extra-mobile.png` | 780×1688 | 390×844 @2 |
| `home-desktop.png` | **2560×1600** | 1280×800 @2 |
| `teacher-desktop.png` | **1440×900** | 1440×900 @1 |

Yang sudah terpasang di `website/assets/shots/th/`: keempat mobile + `home-desktop`
(masih 2880×1800, **harus diulang di 1280×800**). Yang **belum ada**: `teacher-desktop.png`
Thai — dashboard KelasKu dicapai lewat `?teacher=preview`, bukan lewat `go()`.

---

## 5. SUDAH SELESAI

- [x] Riset + verifikasi seluruh angka §2 dari bank data.
- [x] Keputusan positioning dikunci bersama OWNER (§1).
- [x] **`website/index.html` (id)** — judul, meta, OG/Twitter, nav (+ "Untuk Sekolah"),
      `<h1>`, lede, stats, ticker, seksi Tentang, dua kartu baru di `#fitur` (kursus Jepang
      + KelasKu), dua tanya-jawab baru kasatmata + FAQPage, dan JSON-LD
      (`WebApplication`, `EducationalOrganization`, `WebSite`).
- [x] **`website/th/index.html`** — paritas penuh dengan id, seluruh butir di atas.
- [x] **`"FIEZEL Personal English OS"` dicabut** dari enam simpul schema.org di tiga berkas.
- [x] **Halaman Untuk Sekolah** `website/untuk-sekolah.html` + `website/th/untuk-sekolah.html`
      — kanonik, hreflang timbal balik, `WebPage` + `BreadcrumbList` + `FAQPage` (6 tanya-jawab),
      seksi "Batasnya, disebut lebih dulu", tawaran pilot 1 guru / 1 kelas / 6 minggu / Rp 0.
- [x] **`website/sitemap.xml`** — 2 halaman baru + `lastmod` beranda id/th.
- [x] **`website/llms.txt` + `llms-full.txt`** — bagian lapisan guru DAN bagian batasnya,
      ditulis sebagai instruksi langsung kepada mesin AI.
- [x] **`landing.html`** — meta, featureList, FAQ baru, dan **satu klaim palsu dicabut**
      (lihat §8).
- [x] **`README.md`** — positioning + angkanya, tabel konten Jepang, tabel bank kurikulum,
      status pilot, build `m025-357`, aturan bump, catatan harness screenshot.
- [x] **Screenshot per bahasa** (§4) — harness `tools/dev/locale-shots.mjs`, potret Thai di
      `website/assets/shots/th/`, layar murid diambil dari **Latihan**, bukan Home.
- [x] **Gerbang** — `regression`, `http-smoke`, `th-coverage` (233/233), `a11y`, `pwa-cache`,
      `seo-surface-gate` (21/21), `deploy-site-gate` (32/32), `install-health`,
      `pwa-release-coherence`, `japanese-surface-honesty` → semuanya PASS.

---

## 6. BELUM SELESAI — lanjutkan dari sini

Tidak ada lagi yang memblokir rilis. Yang tersisa adalah **utang yang ditemukan sambil
jalan**, dan semuanya bisa dikerjakan terpisah:

1. **Kebocoran bahasa Thai di KelasKu untuk Guru — ini yang paling besar.**
   Saat `learnerLocale = th`, dasbor guru bercampur bahasa: judulnya berganti bahasa
   **di tengah kalimat** ("พื้นที่ทำงานที่อ่านชั้นเรียนของคุณ แล้วบอกให้รู้ *siapa yang perlu disapa
   hari ini*"), dan seluruh sidebar tetap Indonesia — Ruang Kelas, Ringkasan Hari Ini,
   Kelas & Siswa, Tugas & Ujian, Analitik, Komunikasi, Jurnal Guru, Keluar akun guru.
   Begitu juga paragraf pembuka, tombol "Coba dengan kelas contoh", dan ketiga baris
   manfaat.
   **Akibat langsung ke PR ini:** potret `teacher-desktop.png` berbahasa Thai **tidak
   diterbitkan**, karena memamerkan layar campur lebih buruk daripada menundanya. Halaman
   th karena itu masih memakai potret dasbor guru berbahasa Indonesia — satu-satunya
   gambar di halaman th yang belum sesuai bahasa.
   **Cara mengulang temuannya:** `node tools/dev/locale-shots.mjs th /tmp/x`, lalu lihat
   `teacher-desktop.png`. Harness-nya sudah bisa membuka dasbor guru (seed
   `fz_teacher_mode=1`), jadi begitu i18n-nya dibayar, potretnya tinggal dijalankan ulang
   dan `website/th/index.html` baris ~912 diarahkan ke `../assets/shots/th/`.

2. **Gelembung coach masih berbahasa Indonesia saat locale th** ("Gue udah siapin rencana
   hari ini, tinggal jalan"). Ia overlay, jadi harness membuangnya dari potret — tetapi
   murid Thai di aplikasi sungguhan tetap membacanya.

3. **`website/tentang.html` + `th/tentang.html`** belum menyebut lapisan guru/kurikulum dan
   belum menautkan halaman Untuk Sekolah. Isinya sudah benar soal dua bahasa, jadi ini
   penambahan, bukan koreksi.

4. **Potret `home-*.png` lama masih ada** di `website/assets/shots/` dan masih dipakai
   `tentang.html` serta `landing.html`. Tidak salah — layar Home memang masih ada — tetapi
   kalau OWNER ingin seluruh situs memakai Latihan, keempat rujukan itu yang tersisa.

## 7. Jebakan yang sudah dibayar — jangan diulang

- **Jangan pasang rating/ulasan.** Cek (I). Sanksinya tingkat situs, bukan baris itu saja.
- **Jangan menaruh pekerjaan SEO di akar repo** dengan anggapan akar = root domain. Akar
  terbit di `/app/`. Ini persis cacat commit `c4e506d` + `7587cf9`.
- **Jangan menyentuh `robots.txt` akar** untuk "membuka blokir Googlebot" — berkas itu
  inert, tidak pernah terlayani di root domain. Yang mengikat `website/robots.txt`, dan ia
  sudah `Allow: /` untuk 12 agen AI.
- **Jangan memblokir `.js`/`.json`** di robots — `/app/` SPA, bank soalnya `.json`.
- **Jangan menyentuh animasi landing page.** Perintah OWNER eksplisit (§4).
- **Jangan menaikkan `SW_REV`** kecuali berkas di `ASSETS` benar-benar berubah (§3).

---

## 8. Klaim palsu yang dicabut di PR ini

Dicatat supaya tidak ditulis ulang oleh siapa pun yang menyalin copy lama.

| Berkas | Klaim lama | Kenyataan |
|---|---|---|
| `landing.html` kartu Tugas & Ujian | "dari **ribuan** bank soal kurikulum" | Bank kurikulum = **115 soal** |

Selisihnya bukan pembulatan. Guru yang membuka tab itu akan menemukan sendiri selisihnya
di minggu pertama pilot, dan itu persis cara kepercayaan hilang. Diganti dengan yang
sungguhan dilakukan produknya: memilih Fase → bab → sub-bab → fitur bahasa. Diperbaiki di
HTML serta di kamus `id` dan `th` sekaligus — kamus th-nya juga menyimpan klaim yang sama.

Kalau menemukan klaim serupa: yang menentukan bukan enaknya kalimat, melainkan apakah
angkanya bisa ditunjuk ke berkas di repo. Daftar sumber ada di §2.
