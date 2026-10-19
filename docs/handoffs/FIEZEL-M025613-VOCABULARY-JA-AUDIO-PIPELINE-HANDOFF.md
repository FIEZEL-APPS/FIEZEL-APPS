# FIEZEL M025-613 Handoff Dossier: Japanese Vocabulary Audio Pipeline & 1000 N5 Budget

## 1. Ringkasan & Latar Belakang
- **Tujuan**: Menambahkan channel produksi audio `vocabulary_ja` pada generator audio FIEZEL (`tools/audio-batch-generate.mjs`), sehingga seluruh 1.884 kosakata dan kalimat Bahasa Jepang dari `content/ja/vocabulary-master-ja.json` dapat diproduksi secara terstruktur dengan Voice ID native Japanese (Sora - `4sirbXwrtRlmPV80MJkQ`).
- **Skalabilitas**: Memperluas anggaran aset per run (`maxAssetsPerRun: 1000`) di `audio/manifest.json`, memungkinkan seluruh 1.000 kata N5 (Level A1, total 2.670 karakter) diproduksi sekaligus dalam satu kali jalan workflow.
- **Dampak**: 1.000 kata N5 Bahasa Jepang langsung memiliki pelafalan audio studio native ElevenLabs tanpa membakar kuota berlebih (<3.000 karakter dari sisa 27.900 karakter).
- **Otoritas**: MASTER & OWNER.

## 2. Berkas yang Diubah
- `tools/audio-batch-generate.mjs`: Menambahkan fungsi `vocabulary_ja()` ke `REGISTRY` dengan locale `ja-JP`, mengurutkan level N5 lebih dulu, kata sebelum kalimat.
- `.github/workflows/audio-generate.yml`: Menambahkan `vocabulary_ja` pada deskripsi pilihan input `content`.
- `audio/manifest.json`: Mengatur `maxAssetsPerRun: 1000` pada konfigurasi budget.
- Sinkronisasi rilis arbiter 6 titik (`m025-613`):
  - `sw.js`
  - `core-config.js`
  - `features/neural-voice/fiezel-diag-panel.js`
  - `kurikulum.html`
  - `misi.html`
  - `coordination/BUILD-VERSION.json`

## 3. Verifikasi & Pengujian
- `node tools/audio-batch-generate.mjs --content=vocabulary_ja --limit=1000`: Berhasil merencanakan tepat 1.000 kata N5 / 2.670 karakter kanonik.
- `node tests/audio-asset-pipeline-test.js`: 51/51 checks pass.
- `node tools/bump-build.mjs --check`: Status `Selaras.` untuk seluruh titik hexa-sync.
- `node tests/id-golden-snapshot-test.js`: PASS.
- `node tests/th-ui-leak-test.js`: PASS.
- `node tests/curriculum-cache-version-test.js`: PASS.
- `node tests/gate-registry-test.js`: PASS.
