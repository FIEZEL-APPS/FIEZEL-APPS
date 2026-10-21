# FIEZEL M025-611 Handoff Dossier: ElevenLabs Budget Scaling (8000 Chars / ~200 Aset Per Run)

## 1. Ringkasan & Latar Belakang
- **Tujuan**: Mempercepat produksi massal contoh kalimat Level B1 dan level-level berikutnya dengan menaikkan batas aman produksi audio dari 2.000 karakter (~45 kalimat) menjadi 8.000 karakter (~200 kalimat) per run.
- **Dampak**: Memangkas total putaran workflow dari ~13 kali putaran menjadi hanya 3 kali putaran, mengurangi waktu tunggu siklus gerbang CI secara signifikan.
- **Otoritas**: MASTER & OWNER.

## 2. Berkas yang Diubah
- `audio/manifest.json`: Mengubah `maxCharactersPerRun` dari 2000 menjadi 8000.
- `.github/workflows/audio-generate.yml`: Mengubah default input `limit` menjadi 200 aset per jalan.
- Sinkronisasi rilis arbiter 6 titik (`m025-611`):
  - `sw.js`
  - `core-config.js`
  - `features/neural-voice/fiezel-diag-panel.js`
  - `kurikulum.html`
  - `misi.html`
  - `coordination/BUILD-VERSION.json`

## 3. Verifikasi & Pengujian
- `node tools/audio-batch-generate.mjs --content=vocabulary --limit=200 --budget-chars=8000`: Berhasil merencanakan tepat 200 aset / 7.920 karakter di bawah batas aman.
- `node tools/bump-build.mjs --check`: Status `Selaras.` untuk seluruh titik rilis.
