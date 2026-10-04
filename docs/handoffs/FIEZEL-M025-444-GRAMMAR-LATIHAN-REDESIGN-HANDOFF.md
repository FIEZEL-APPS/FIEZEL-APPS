# FIEZEL-M025-444: Grammar & Latihan UI Polish & Zero-Slop Handoff Dossier

**Nomor Build**: `m025-444`  
**Tanggal**: 4 Oktober 2026  
**Status**: Lulus Uji Mutu 100% (Hexa-Sync Selaras, Quality Gates Pass)

---

## 1. Ringkasan Perubahan & Arahan Pengguna

Berdasarkan tinjauan layar empiris pengguna pada alur Latihan, Grammar Hub, Materi Pelajaran, dan Sesi Soal & Umpan Balik:

1. **Layar Latihan (`g01-latihan.png`)**:
   - *Masalah*: Grid 3 kolom membuat teks nama fitur panjang terpotong (*"Panggung Suara Live (Duet..."*) dan menyisakan ruang hampa void kosong yang besar di bagian bawah.
   - *Solusi*: Diubah menjadi grid 2 kolom seimbang (`repeat(2, minmax(0, 1fr))`) dengan squircle ikon yang berada di tengah, subjudul ringkas, dan kartu ke-7 (`Perpustakaan`) span 2 kolom dengan rapi. Teks judul dipersingkat menjadi `"Panggung Suara Live"`.

2. **Grammar Hub Roadmap (`g02-grammar-hub.png`)**:
   - *Masalah*: Kartu roadmap lama sangat besar (tinggi >220px monolitik gelap dengan tombol bertumpuk), melelahkan di mata.
   - *Solusi*: Didesain ulang menjadi kartu putih bersih minimalis (~80px) dengan aksen amber lembut, tombol aksi pill compact (`Mulai`, `Lanjut`), dan tautan lewati yang ringkas.

3. **Materi Pelajaran Grammar (`g04-lesson-materi.png`)**:
   - *Masalah*: Penjelasan materi berisi dinding teks panjang, kotak CONTOH tebal, kartu kontras, kartu prasyarat, dan tip memori yang membuat murid malas membaca.
   - *Solusi*: Dibuat langsung *to-the-point* dengan kartu Hero ringkas: badge level, judul topik, 1 kalimat intisari rumus utama, dan tombol aksi emas `"Mulai Latihan (10 Soal) ->"`.

4. **Floating Retry Bar & Guru Tutor (`g06-setelah-jawab.png`)**:
   - *Masalah*: Lingkaran/kontainer warna gelap di belakang floating retry bar dan warna kuning pada ikon petunjuk guru serta pil kecepatan.
   - *Solusi*: Background floating bar diubah menjadi transparan total tanpa bayangan hitam, dan warna petunjuk guru/pil kecepatan diubah menjadi hijau emerald (`#10B981`) yang segar dan berwibawa.

5. **Umpan Balik Penjelasan (`g07-penjelasan.png`)**:
   - *Masalah*: Baris telemetri (`BKT 20%`, `I, Me, My: Tiga Wujud Kata Ganti`, `2x keliru`, `Review 1h`) mengacaukan fokus murid, dan tanda pisah em-dash (`—` / `–`) terlihat seperti AI slop.
   - *Solusi*: Baris telemetri disembunyikan sepenuhnya dari layar murid (`display: none !important`), dan seluruh tanda hubung em-dash dihilangkan serta digantikan koma alami pada seluruh naskah alasan dan step tutor.

---

## 2. Berkas yang Diubah

1. `features/i18n/copy-id-redesign.js`:
   - Mengubah `'latihan.panggung'` menjadi `'Panggung Suara Live'`.
2. `features/i18n/copy-id-app-a.js`:
   - Menghilangkan tanda em-dash pada `'grammar.alasan-benar-kausal'`.
3. `app.js`:
   - `renderGrammarLesson(skill)`: Mengganti dinding materi dengan Hero Card langsung to-the-point.
   - `reveal()`: Menghilangkan row telemetri murid (`telemetryRowHtml = ''`) dan sanitasi em-dash pada string penjelasan.
   - `stepTutorGuidanceMarkup()`: Sanitasi tanda pisah em-dash pada naskah pemandu.
4. `features/ui/fiezel-tactile-clay.css`:
   - `.practice-hub-grid`: 2 kolom terdistribusi merata dengan nol void.
   - `.path-step .path-label`: Kartu roadmap putih compact yang ramah di mata.
   - `#quizFloatingBar`: Background transparan bersih tanpa lingkaran gelap.
   - Emerald styling untuk tutor header, clue, dan speed pill (`#10B981`).
   - `.braincore-telemetry-row`: `display: none !important`.
5. `id-golden-baseline.json`:
   - Baseline emas diperbarui secara resmi via `--write-baseline`.
6. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`:
   - Sinkronisasi versi build resmi `m025-447`.

---

## 3. Hasil Uji Mutu (Quality Gates)

- `node tests/curriculum-cache-version-test.js` -> PASS (m025-447)
- `node tests/th-ui-leak-test.js` -> PASS (3667 kunci)
- `node tests/gate-registry-test.js` -> PASS (10 pass, 0 fail)
- `node tests/id-golden-snapshot-test.js` -> PASS (HIJAU: baseline emas Indonesia utuh)
- `node tests/step-tutor-test.js` -> PASS
- `node tools/bump-build.mjs --check` -> PASS (Selaras)
