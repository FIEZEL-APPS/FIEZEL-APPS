# FIEZEL Handoff Dossier: SERP Paritas Duolingo, Suite Ikon Favicon Sirkular & Pembersihan Metadata (m025-683)

**Tanggal:** 28 Oktober 2026
**Build:** `m025-683` (Hexa-Sync 100% Selaras)
**Cabang:** `fix/serp-duolingo-parity-favicon-m025-683`

---

## 1. Ringkasan & Akar Masalah (Empirical Audit)
Pengguna menyampaikan komparasi visual langsung dari Google Search antara **Duolingo** dan **FIEZEL** dengan 3 masalah utama:
1. **Logo Terpotong & Tidak Fit**:
   - Ikon Duolingo berbentuk sirkular penuh dengan maskot yang mengisi 80% lingkaran secara tegas, seimbang, dan berlatar transparan.
   - Ikon FIEZEL sebelumnya berbentuk persegi (`512x512` / `192x192`) berwarna latar hitam pekat (`#070405`) dengan glif F kecil dan batang gelombang suara yang berada di tepi kanan. Saat dipotong secara otomatis oleh Google ke avatar lingkaran 16–28px, ikon terpotong tidak wajar di sudut-sudutnya, tampak tenggelam, dan menyerupai "F1" yang cacat.
   - Googlebot mengabaikan SVG untuk favicon SERP dan mewajibkan PNG/ICO berasio 1:1.
2. **Nama Brand di Header SERP Menampilkan Domain `fiezel.my.id > Buka Aplikasi` (Bukan `FIEZEL`)**:
   - Di Duolingo, baris paling atas adalah nama situs murni **`Duolingo`** dengan URL `https://id.duolingo.com`.
   - Di FIEZEL, baris paling atas adalah domain `fiezel.my.id` dengan breadcrumb `› Buka Aplikasi`.
   - **Akar Masalah**: Terdapat blok skema `BreadcrumbList` yang dipasang keliru pada *root homepage* (`website/index.html`) yang menunjuk ke anak halaman `/app/` ("Buka Aplikasi"). Menurut pedoman Google Search Central, BreadcrumbList pada homepage merusak hierarki entitas dan memaksa Google menyajikan remah roti kategori alih-alih Site Name.
   - Selain itu, properti `alternateName` pada skema `WebSite` sebelumnya berisi slogan deskriptif (`"FIEZEL — Ruang Belajar Bahasa"`), yang melanggar standar Google untuk nama situs.
3. **Keterangan Tanggal Mengotori Snippet (`16 Okt 2026 — `)**:
   - Snippet Duolingo bersih tanpa tanggal artikel/publikasi.
   - FIEZEL memunculkan tanggal rilis/crawling (`16 Okt 2026 — `) karena header server `Last-Modified` dan format skema WebPage/artikel membingungkan crawler seolah-olah homepage adalah artikel berita/blog berkala.
   - Judul homepage sebelumnya (`FIEZEL — Aplikasi Belajar Bahasa Inggris Adaptif Gratis (CEFR A1–C2)`) terlalu panjang (72 karakter) sehingga terpotong elipsis (`...`).

---

## 2. Solusi & Perbaikan Sistemik
1. **Suite Ikon Medallion Sirkular Standar Industri (Anti-Clipping)**:
   - Glif resmi FIEZEL (Huruf F Gading metalik + 2 Batang Suara Emas 24K) diskalakan proporsional `1.30x` dengan *drop shadow* 3D lembut dan terpusat optis.
   - Latar belakang menggunakan medali sirkular dengan gradasi radial obsidian mewah (`#241A1D` -> `#140E10` -> `#070405`), kilau *specular sheen*, garis tepi halus (*rim*), dan sudut luar **transparan 100%**.
   - Menghasilkan rangkaian aset lengkap:
     - `website/assets/brand/fiezel-icon-512.png` (512x512)
     - `website/assets/brand/fiezel-icon-192.png` (192x192)
     - `website/assets/brand/fiezel-icon-96.png` (96x96)
     - `website/assets/brand/fiezel-icon-48.png` (48x48)
     - `website/favicon.ico` & `favicon.ico` (multi-size container: 16x16, 32x32, 48x48)
     - `favicon-64.png` & `apple-touch-icon.png` (180x180)
2. **Pembersihan Skema & Promosi `WebSite` Structured Data**:
   - Menghapus blok `BreadcrumbList` keliru dari root landing page (`website/index.html`).
   - Mempromosikan skema `WebSite` ke posisi teratas pada JSON-LD dengan nama brand resmi `"name": "FIEZEL"` dan variasi yang sah: `"alternateName": ["Fiezel", "Fiezel Apps", "FIEZEL Apps"]`.
3. **Pemberantasan Tanggal & Optimasi Snippet Ala Duolingo**:
   - Memasang `Header unset Last-Modified` untuk berkas `.html` pada `website/.htaccess`.
   - Mengganti `<title>` menjadi ringkas dan punchy (48 karakter, bebas elipsis):
     `FIEZEL — Belajar Bahasa Inggris &amp; Jepang Adaptif`
   - Mengganti meta description menjadi elegan dan berorientasi aksi:
     `Ruang belajar bahasa personal, adaptif, dan efektif. Nikmati pelajaran singkat bertenaga Braincore yang disesuaikan dengan kemampuanmu. Mulai gratis!`

---

## 3. Bukti Verifikasi Mutu & Hasil Pengujian
1. **Hexa-Sync Invariant**:
   - `coordination/BUILD-VERSION.json`: `m025-683`
   - `sw.js`: `m025-683`
   - `core-config.js`: `m025-683`
   - `features/neural-voice/fiezel-diag-panel.js`: `m025-683`
   - `kurikulum.html`: `m025-683`
   - `misi.html`: `m025-683`
   - Status: **100% Selaras**.
2. **Automated Quality Gates**:
   - `node tests/seo-surface-gate-test.js` -> 21/21 PASS
   - `node tests/seo-hardening-audit-test.js` -> 9/9 PASS
   - `node tests/id-golden-snapshot-test.js` -> PASS
   - `node tests/th-ui-leak-test.js` -> PASS
   - `node tests/curriculum-cache-version-test.js` -> PASS (33 penegasan)
   - `node tests/gate-registry-test.js` -> PASS (10 pass, 0 fail)
