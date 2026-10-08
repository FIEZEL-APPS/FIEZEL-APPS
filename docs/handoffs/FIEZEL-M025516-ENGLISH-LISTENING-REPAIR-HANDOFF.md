# FIEZEL M025-516: ENGLISH LISTENING REPAIR & TACTILE SINGLE-SCREEN REDESIGN HANDOFF

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan audit langsung dan masukan pengguna ("COBA KAU CEK BAGIAN LATIHAN LISTENING ENGLISH, RUSAK SEMUA"):
1. **Perbaikan Route Hijacking pada Beranda (`app.js:10778`)**:
   - Sebelumnya, Card 4 (tile Audio/Listening) di Beranda menggunakan:
     `onclick="if(window.openListeningPanel)openListeningPanel();else go('skills');"`
   - Karena `window.openListeningPanel` didefinisikan secara global oleh modul JLPT Jepang (`fiezel-jlpt-listening.js`), murid kursus Bahasa Inggris yang mengeklik tile Audio langsung dibajak dan dipaksa masuk ke ujian Listening JLPT Jepang (Mondai 1, mondai 2)!
   - Perbaikan: Ditambahkan penjaga bahasa target `activeTargetLang() === 'ja'` sebelum memanggil `openListeningPanel()`. Murid Bahasa Inggris kini langsung diarahkan ke `go('listening')`.
2. **Rekonstruksi Panggung Maskot 3D Mochi Daifuku (`speaking-listening-addon.css`)**:
   - Sebelumnya, `.fsl-card-listening .fsl-mascot-slot` dipatok ke `width: 44px; height: 44px; border-radius: 50%; overflow: hidden;` di dalam capsule horizontal 64px (`.fsl-player`). Akibatnya, kanvas 3D Three.js terpotong secara horizontal di bagian tengah kepala, hanya menyisakan telinga kelinci yang terjepit di lubang oval kecil.
   - Perbaikan: Wadah `.fsl-player` dan `.fsl-mascot-slot` diubah menjadi panggung 3D transparan mandiri (`height: 125px`, `min-height: 110px`, `max-height: 135px`, `overflow: visible`, `border: none; background: transparent;`). Maskot 3D Mochi Daifuku kini tampil utuh, bulat, empuk, dengan lencana indikator obrolan ungu aktif melayang, mata berbinar, dan bayangan kontak lantai yang lembut.
3. **Pemberantasan Teks Jawaban Terpotong (`white-space: nowrap` & `text-overflow: ellipsis`)**:
   - Sebelumnya, `.fsl-option-text` memiliki `white-space: nowrap !important; text-overflow: ellipsis !important;` dan `.fsl-option` memiliki `height: 50px !important; max-height: 52px !important;`. Hal ini menyebabkan semua kalimat pilihan jawaban menyimak terpotong ("Sepatu yang sudah kekecilan...", "Pertandingan sepak bola yan...", dll.), membuat murid tidak bisa membaca opsi lengkap untuk menjawab soal pemahaman dengar.
   - Perbaikan: `.fsl-option-text` diubah menjadi `white-space: normal !important; overflow: visible !important; text-overflow: clip !important; word-break: break-word !important;`, dan `.fsl-option` diatur ke `min-height: 46px !important; height: auto !important; max-height: none !important; padding: 10px 14px !important;`. Teks dapat membungkus alami ke 2 baris dan 100% terbaca jelas.
4. **Perbaikan Teks Ganda & Tata Letak Gem Footer (`copy-id-feat-d.js`, `copy-th-feat-d.js`, `speaking-listening-addon.css`)**:
   - Ditemukan anomali di kamus i18n (`copy-id-feat-d.js` & `copy-th-feat-d.js` baris 75), di mana `'gems.chip-balance'` keliru diisi teks petunjuk harga: `'1 gem per sesi · saldo kamu: {balance} gem'`. Hal ini membuat chip saldo mencetak teks sangat panjang sehingga tombol toggle terdesak ke baris kedua dan kartu meluap keluar layar ponsel.
   - Perbaikan: `'gems.chip-balance'` dikembalikan ke format saldo `{balance} gem`. `.fsl-gem-bar` distandarisasi ke `flex-wrap: nowrap !important;` dengan padding hemat ruang sehingga chip saldo (`0 gem · Runtun 0/5`) dan toggle terjemahan (`Terjemahan Indonesia · 1 gem per sesi`) berdampingan rapi dalam satu baris, menjaga seluruh kartu berada dalam satu layar ponsel tanpa scroll.
5. **Pencegahan Tumpang-Tindih Topbar Docked**:
   - `body.fz-stage-sl.fsl-session-active .app` diselaraskan dengan `padding-top: calc(56px + max(10px, env(safe-area-inset-top, 10px))) !important;` agar bilah atas tetap berada di zona aman tanpa menutupi judul soal.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright)

Skrip probe empiris dijalankan melalui `tools/dev/check-english-listening.mjs`:
- **Pengujian 1: Routing Card 4 Beranda**:
  - `reports/universal-gallery/07-english-listening-diagnosis/20b-card4-click-result.png`
  - Hasil: Klik tile "Dengar" di Beranda langsung meluncurkan latihan menyimak bahasa Inggris tanpa menampilkan modal JLPT Jepang.
- **Pengujian 2: Panggung Maskot 3D Mochi Daifuku & Tata Letak Bersih**:
  - `reports/universal-gallery/07-english-listening-diagnosis/22-listening-page.png`
  - Hasil: Maskot 3D Mochi Daifuku tampil utuh, bebas potong (`hasCanvas: true`, `mascotFound: true`). Pilihan A, B, C, D terbaca utuh tanpa elipsis. Gem footer bersanding rapi dalam 1 baris tanpa memotong batas bawah kartu.
- **Pengujian 3: Hub Skills Lab & Latihan Tab**:
  - `reports/universal-gallery/07-english-listening-diagnosis/21-skills-page.png`
  - `reports/universal-gallery/07-english-listening-diagnosis/23-latihan-page.png`
  - Hasil: Hub Bicara & Dengar dan tab Latihan termuat sempurna dalam mode Bahasa Inggris.

---

## 3. Daftar Berkas yang Disentuh

1. `app.js`: Memperbaiki routing Card 4 di Beranda (`activeTargetLang() === 'ja'` guard).
2. `features/speaking-listening/speaking-listening-addon.css`: Panggung 3D Mochi Daifuku unclipped, pembungkusan teks opsi jawaban tanpa ellipsis, perapian gem footer satu baris, dan penyesuaian padding topbar.
3. `features/i18n/copy-id-feat-d.js`: Memperbaiki string kunci `gems.chip-balance` menjadi `{balance} gem`.
4. `features/i18n/copy-th-feat-d.js`: Memperbaiki string kunci `gems.chip-balance` mode Thai menjadi `{balance} gem`.
5. `id-golden-baseline.json`: Pembaruan snapshot baseline teks bahasa Indonesia.
6. `coordination/BUILD-VERSION.json`: Bump build ke `m025-516`.
7. `sw.js`: Sinkronisasi `SW_REV = 'm025-516'`.
8. `core-config.js`: Sinkronisasi `self.FIEZEL_PAGE_BUILD = 'm025-516'`.
9. `features/neural-voice/fiezel-diag-panel.js`: Sinkronisasi `var DIAG_BUILD = 'm025-516'`.
10. `kurikulum.html`: Cache bust `?v=m025-516`.
11. `misi.html`: Cache bust `?v=m025-516`.

---

## 4. Status Kelulusan Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js`: **PASS (100% Hijau)**
- `node tests/th-ui-leak-test.js`: **PASS (0 kebocoran)**
- `node tests/curriculum-cache-version-test.js`: **PASS (26 penegasan, build m025-516)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tests/gems-test.js`: **PASS (34 pemeriksaan lolos)**
- `node tests/paw-mascot-test.js`: **PASS (35 pemeriksaan)**
- `node tests/pawprint-geometry-gate-test.js`: **PASS (5 pemeriksaan)**
- `node tests/mascot-reduced-motion-test.js`: **PASS (19 state, 14 ekspresi)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras 6 titik hexa-sync)**
