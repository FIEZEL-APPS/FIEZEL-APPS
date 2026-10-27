# FIEZEL HANDOFF DOSSIER: M025-685 AUTHENTIC KANJIVG KAKIJUN STUDIO & ZERO-LEAK PARITY

## 1. Ringkasan Eksekutif & Akar Masalah
- **Latar Belakang Audit**: Pengguna menemukan bahwa tuntunan urutan goresan (書き順 / Kakijun) sebelumnya sangat jelek, cacat bentuk, dan salah arah (khususnya Hiragana 'あ' di mana goresan ke-3 terputus setengah lingkaran di tengah dan menggunakan kurva aproksimasi kasar). Selain itu, pada tampilan visual ditemukan kebocoran string mentah `jepang.kakijun-*` karena kunci i18n belum didaftarkan di kamus copy-map runtime.
- **Solusi Komprehensif**:
  1. **KanjiVG Standard Vektor Baku**: Seluruh dataset 136 karakter (46 Hiragana Gojūon, 46 Katakana Gojūon, dan 44 Kanji JLPT N5) diganti dengan dataset vektor resmi berstandar Kementerian Pendidikan Jepang (MEXT) yang diderivasi dari KanjiVG (CC BY-SA 3.0 Ulrich Apel). Setiap karakter memiliki path Bezier murni, jumlah goresan baku, titik awal, dan koordinat nomor goresan resmi.
  2. **Render Presisi Tinggi via Canvas Path2D**: Kanvas menggambar vektor langsung menggunakan C++ Skia SVG path engine (`new Path2D(stroke.d)`) dalam ruang koordinat resmi $109 \times 109$, menghasilkan kaligrafi tinta Sumi hitam obsidian (`#1E293B`) yang halus dan tajam.
  3. **Tuntunan Animasi Goresan (書き順アニメーション)**: Fitur "▶ Lihat Contoh" memainkan animasi goresan per goresan dengan kecepatan terukur, dilengkapi sapuan kuas animasi dan nomor urut goresan interaktif.
  4. **Pencegahan Kebocoran i18n & Zero Thai Leak**: Seluruh 20 kunci `jepang.kakijun-*` didaftarkan secara lengkap dan selaras di `copy-id-bahasa.js` dan `copy-th-bahasa.js`. Fungsi `T(key, fallback)` diperkuat dengan fail-soft fallback agar kunci mentah tidak pernah bocor ke layar murid.
  5. **Drawer Pemilih Karakter Universal**: Menambahkan tombol "Pilih Huruf" yang membuka laci pemilih 3 tab (Hiragana 46, Katakana 46, Kanji N5 44) sehingga murid dapat melompat ke huruf mana pun secara instan.

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright)
- Pengujian dijalankan di 3 jenis viewport:
  - Mobile (390x844): Kanvas responsif, sentuhan goresan tervalidasi, tanpa scroll layout.
  - Tablet (820x1180): Tata letak 2 kolom seimbang, grid Genkō Yōshi (米字格) presisi retina 380x380px.
  - Desktop (1440x900): Mode panduan dan ingatan (recall) bekerja mulus.
- Hasil tangkapan layar verifikasi visual tersimpan di:
  - `reports/kakijun-authentic-a-guided.png` (Hiragana 'あ' asli KanjiVG dengan watermark 見本 dan badge 1)
  - `reports/kakijun-drawer-picker.png` (Grid pemilih 46 Hiragana)
  - `reports/kakijun-kanji-picker.png` (Grid pemilih 44 Kanji N5)
  - `reports/kakijun-studio-desktop.png` (Tampilan desktop bebas kebocoran kunci i18n)
  - `reports/kakijun-studio-mobile.png` (Tampilan mobile bebas kebocoran kunci i18n)

## 3. Berkas yang Disentuh & Dikeluarkan
1. `features/japanese/fiezel-kakijun-data.js`: Dataset vektor baku 136 karakter dari KanjiVG.
2. `features/japanese/fiezel-kakijun-studio.js`: Engine kanvas Path2D, animasi goresan, drawer pemilih, evaluasi arah goresan pedagogis, dan double-safety i18n resolver.
3. `features/japanese/fiezel-kakijun-studio.css`: Tata letak multi-device, drawer pemilih karakter, animasi `stroke-dashoffset`, dan tombol kendali.
4. `features/i18n/copy-id-bahasa.js`: 20 kunci terjemahan Indonesia untuk Kakijun Studio.
5. `features/i18n/copy-th-bahasa.js`: 20 kunci padanan bahasa Thai untuk kepatuhan Zero Thai Leak.
6. `id-golden-baseline.json`: Pembaruan snapshot baseline emas literal murid Indonesia.
7. `tools/dev/build-kanjivg-master-bank.mjs`: Script pembangkit dataset KanjiVG.
8. `tools/dev/capture-kakijun-authentic-preview.mjs`: Probe inspeksi Playwright otomatis.
9. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`: Build bumped ke `m025-685`.

## 4. Status Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: PASS (13 berkas terkunci identik, baseline literal utuh)
- `node tests/th-ui-leak-test.js`: PASS (0 kebocoran naskah Indonesia di mode Thai)
- `node tests/curriculum-cache-version-test.js`: PASS (33 penegasan selaras m025-685)
- `node tests/gate-registry-test.js`: PASS (10/10 checks lulus)
- `node tests/deploy-site-gate-test.js`: PASS (32/32 checks lulus)
- `node tests/japanese-th-parity-test.js`: PASS (paritas Thai isi bank Jepang 100%)
- `node tools/bump-build.mjs --check`: PASS (Hexa-Sync selaras m025-685)
