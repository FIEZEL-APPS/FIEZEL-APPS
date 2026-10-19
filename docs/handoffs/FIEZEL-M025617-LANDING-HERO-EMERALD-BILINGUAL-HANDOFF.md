# FIEZEL HANDOFF DOSSIER: LANDING HERO BILINGUAL REFACTORING & KELASKU EMERALD PALETTE
**Build Version:** `m025-617`
**Tanggal:** 20 Oktober 2026
**Otoritas & Disiplin:** Antigravity Engineering Protocol & PWA Release Arbiter

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

### Arahan & Keluhan Pengguna
1. *"hero landing page fiezel.my.id sangat ramai dengan tulisan, dan warnanya penuh kuning, aku ingin palet warna nya di tambahkan seperti warna palet KelasKu yaitu hijau emerald dan tulisan tulisan yang mengagu di hapus saja"*
2. *"ini tidak cocok, karena fiezel tidak hanya ada bahasa inggris, melaikan bahasa jepang juga , dan tampilan tulisan ini masih sangat mengaggu, membuat websiteku terlihat murahan : Lancar Bahasa Inggris Sesuai Level Kemampuanmu \n Latihan adaptif otomatis dari dasar hingga mahir, langsung di browser."*

### Akar Masalah Desain & Estetika
1. **Kejenuhan Warna Kuning (*Solar Saturation & Visual Fatigue*):**
   - Latar hero sebelumnya menggunakan gradien radial kuning pekat (`#FFD94F` / `#FFF1B8`) ditambah animasi sinar berputar (*repeating conic sunburst*) yang silau dan melelahkan mata.
   - Panggung murid dan panggung guru (KelasKu dengan maskot Mira) terputus secara palet warna karena tidak adanya elemen penyeimbang bernuansa hijau emerald di paruh atas hero.
2. **Kelebihan Teks & Redundansi Logo (*Text Clutter & Duplication*):**
   - Terdapat SVG wordmark `FIEZEL` raksasa berukuran 1000px di masthead hero (`.mast-lock`) yang menduplikasi logo di topbar navigasi tepat di atasnya.
   - Terdapat baris tautan sekunder kecil (`.mast-sub-actions`) dan 3 trust pill melayang (`.mast-trust-pills`) yang menumpuk di bawah tombol CTA, mengacaukan hierarki visual dan mendorong mockup aplikasi ke luar layar pada perangkat seluler.
3. **Penyimpangan Relevansi Bahasa & Kesan Murahan (*Cheap & Biased Copy*):**
   - Judul sebelumnya hanya menyebut *"Bahasa Inggris"*, mengabaikan pilar utama kedua FIEZEL yaitu **Bahasa Jepang** (JLPT N5–N4).
   - Tipografi menggunakan efek stabilo/marker tebal (`.vv-hl::after`) dengan copywriting klise ala iklan pop-up (*"Lancar Bahasa Inggris...", "dari dasar hingga mahir, langsung di browser"*), merendahkan persepsi mutu brand FIEZEL.

---

## 2. Rekayasa Perubahan yang Diterapkan

1. **Inklusivitas Dua Bahasa & Tipografi Mewah (*Editorial Luxury*):**
   - **Headline Seimbang:** Mengganti judul menjadi:
     > **Belajar Bahasa Inggris & Jepang**  
     > *yang Menyesuaikan Dirimu*
   - **Gradien Teks Emerald:** Mengganti stabilo/marker tebal dengan teks bergradien hijau emerald KelasKu (`linear-gradient(135deg, #238970 0%, #166052 100%)`).
   - **Subjudul Bernas:** Mengganti kalimat penjelasan menjadi kalimat penghubung murid dan guru yang berbobot medium (`font-weight: 500`):
     > *"Latihan adaptif yang membaca pemahamanmu di setiap sesi — mandiri untuk murid, terarah untuk guru."*

2. **Integrasi Palet Hijau Emerald KelasKu (`#1F7A63`):**
   - Mengganti latar belakang hero menjadi pancaran lembut **Emerald Radiance** (`rgba(31, 122, 99, 0.18)`) bergradasi ke permukaan krem travertine (`#F2F8F5` $\to$ `#FAF8F2` $\to$ `#FFF9EE`), mengeliminasi sunburst kuning berputar yang silau.
   - Mengubah tombol CTA utama (`.btn-primary-hero`) dan tombol topbar (`.topbar .btn-primary`) ke gradien hijau emerald KelasKu (`#28967B` $\to$ `#1F7A63` $\to$ `#166052`) dengan batas `#145545` dan bayangan 3D `#124537`.
   - Menyelaraskan ornamen dekorasi ambient (`.decor-glow` dan garis orbit) dengan nuansa emerald dan emas lembut.

3. **Pembersihan Elemen Pengganggu (*De-cluttering*):**
   - Menghapus SVG wordmark raksasa `mast-lock` di hero.
   - Menghapus tautan sekunder `mast-sub-actions` dan 3 trust pill `mast-trust-pills`.
   - Menyederhanakan tombol CTA menjadi satu baris: **"Mulai Belajar →"**.
   - Memastikan *Title & Action Safe Zone* terjaga tanpa pemotongan kata (*zero crop*) pada layar seluler (360px–390px).

4. **Penyesuaian Gerbang Mutu Registry:**
   - Menambahkan pengecualian untuk `tools/dev/probe-voice-call-full-audit.mjs` pada `EXCLUSIONS` di `tests/gate-registry-test.js` sebagai alat pelaporan audit Playwright lokal.

---

## 3. Bukti Pengujian Empiris (Playwright)

- **Desktop (1280×900)**: Terverifikasi panggung ganda (HP murid di kiri dan laptop guru KelasKu di kanan) menyatu secara harmonis dengan aksen emerald.
- **Mobile (390×844)**: Terverifikasi judul tidak terpotong, tombol CTA berada dalam jangkauan jempol yang ergonomis, dan perangkat langsung terlihat tanpa hambatan teks berlebih.
- **Hasil Gerbang Mutu Lokal**:
  - `node tests/id-golden-snapshot-test.js` $\to$ PASS
  - `node tests/th-ui-leak-test.js` $\to$ PASS
  - `node tests/curriculum-cache-version-test.js` $\to$ PASS
  - `node tests/gate-registry-test.js` $\to$ PASS (10/10)
  - `node tests/seo-surface-gate-test.js` $\to$ PASS (21/21)
  - `node tests/teacher-demo-preview-test.js` $\to$ PASS
  - `node tests/seo-hardening-audit-test.js` $\to$ PASS (9/9)
  - `node tools/bump-build.mjs --check` $\to$ Selaras (`m025-617`)

---

## 4. Berkas yang Diubah

1. `website/index.html`: Refactoring masthead hero (Bahasa Inggris & Jepang, naskah bersih, single CTA).
2. `website/vivid.css`: Palet hijau emerald hero, tipografi gradien teks, eliminasi yellow sunburst.
3. `website/style.css`: Palet tombol CTA hijau emerald KelasKu, peredaman decor-glow hero.
4. `tests/gate-registry-test.js`: Pendaftaran eksklusi alat audit dev probe.
5. `coordination/BUILD-VERSION.json`: Peningkatan versi build ke `m025-617`.
6. `sw.js`: Peningkatan `SW_REV` ke `m025-617`.
7. `core-config.js`: Peningkatan `self.FIEZEL_PAGE_BUILD` ke `m025-617`.
8. `features/neural-voice/fiezel-diag-panel.js`: Peningkatan `DIAG_BUILD` ke `m025-617`.
9. `kurikulum.html`: Cache query string bump `m025-617`.
10. `misi.html`: Cache query string bump `m025-617`.
11. `docs/handoffs/FIEZEL-M025617-LANDING-HERO-EMERALD-BILINGUAL-HANDOFF.md`: Dokumen serah terima resmi.
