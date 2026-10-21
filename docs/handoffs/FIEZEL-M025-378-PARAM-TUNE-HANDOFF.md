# FIEZEL m025-378 — Braincore Langkah 3: Angka Rumus Disetel dari Data Handoff

Tanggal: 2026-09-28 WIB
Release: `FIEZEL_PAGE_BUILD=m025-378`, `DIAG_BUILD=m025-378`, `SW_REV=m025-378-braincore-audit-20260927`
(akhiran SW_REV dibawa `tools/bump-build.mjs`; nomornya yang menentukan).
Base: `origin/main` (383eb48, #474 — `ITEM_POOL_ENABLED = "on"`, migrasi 0015 sudah diterapkan)
Otoritas: roadmap OWNER 2026-09-27, langkah 3 — "Angka-angka rumus disetel dari data, bukan
ditebak." OWNER: "LANJUTKAN".

## STATUS

Machine-verified lokal: seluruh perintah gerbang `.github/workflows/quality.yml`; gerbang baru
`tests/brain-param-tune-test.js` 19/19, `tests/item-pool-test.js` 43/43. Tidak ada angka rumus
yang berubah di rilis ini — rilis ini membangun jalur pengukurannya.

**Sisa langkah OWNER** (`reports/ITEM_POOL_ACTIVATION.md`): terapkan migrasi
`0016_item_pool_probe.sql`, lalu deploy Worker. Workflow **Braincore Item Pool** berjalan sendiri
(harian 01:20 WIB) dengan rahasia deploy yang sudah ada.

## TEMUAN YANG MENGUBAH RANCANGAN

1. **Langkah 2 (sudah di main) akan melewati batas CPU Worker gratis.** Pembangunan tabel di
   cron Worker diukur 11 ms (1.000 soal) dan 19 ms (3.000 soal); batas paket gratis 10 ms
   (`docs/CF-MIGRATION-RUNBOOK.md`). Dengan `ITEM_POOL_ENABLED = "on"` (#474) cron akan gagal
   begitu soalnya ribuan. Perbaikan: penaksir dioptimalkan (typed array, validasi ID sekali per
   soal: 18.6 → 9.1 ms) DAN dipindah ke GitHub Actions (`tools/item-pool-job.mjs`); cron Worker
   kini hanya mempurge.
2. **a dan c tidak bisa ditaksir sebagai "nilai sebenarnya" dari data ber-bucket.** Simulasi:
   taksiran gabungan per soal menaikkan a 1.5 → 1.8 (masalah parameter insidental), likelihood
   marginal masih meleset ±0.15 (sebaran koreksi soal bukan normal) — dengan ribuan jawaban,
   galat baku kecil sehingga keduanya MENGUSULKAN perubahan palsu di dunia yang baik-baik saja.
   Rancangan diganti ke **validasi silang**: a/c dipilih dari log-loss held-out (hari
   genap/ganjil), diusulkan hanya bila selang bootstrap perbaikan > 0.
3. **Paruh-waktu tidak boleh diukur dari jawaban ulangan biasa** (lupa tercampur belajar). Ia
   diukur dari **probe retensi** (3/7/21 hari setelah lesson dikuasai) dengan model
   p = c + (1-c)·q·R^(1/k).
4. **Urutan rilis situs → Worker membuang data.** Situs terbit otomatis sesudah main hijau;
   Worker di-deploy owner belakangan. Worker langkah 2 menjawab amplop baru (ber-`pv`) dengan
   `400 unknown_field` (dibuktikan dengan `item-pool-core.js` dari main), dan perangkat
   membuang batch ber-400 — jadi jawaban-pertama di sela itu hilang untuk selamanya (soalnya
   sudah ditandai terlihat). Perbaikan: `400 unknown_field` = "Worker lebih tua dari aplikasi",
   batch DISIMPAN dan dicoba lagi dengan backoff (gerbang A4b, terbukti merah tanpa perbaikan).
   Batch cacat lain tetap dibuang.

## APA YANG BERUBAH

1. **Perangkat** — `FiezelItemPool.observeProbe` (penghitung `[bucket R -> n, benar]` per hari,
   tanpa ID); amplop membawa `pv` (versi konstanta). app.js: `draw()` → `q.__probeR` (bukan saat
   penempatan), `record()` → `itemPoolObserveProbe`; `itemPoolFlush` menyimpan batch yang
   ditolak `unknown_field` (temuan 4).
2. **Server** — probe diterima di `POST /api/braincore/item-evidence` (≤ 20 baris/event);
   `pv` lain dibuang seluruhnya (diterima supaya perangkat berhenti mengulang); tulis soal dan
   probe dua batch terpisah (tabel probe yang belum ada tidak menghilangkan hitungan soal).
   Migrasi `0016_item_pool_probe.sql`. Cron Worker: purge saja (dedup 60, soal+probe 120 hari).
3. **Job Actions** — `tools/item-pool-job.mjs` + `.github/workflows/braincore-item-pool.yml`:
   baca penghitung lewat API D1 (dijumlahkan per lipatan di SQL), bangun ulang tabel (rencana tulis
   sama dengan gerbang, nilai divalidasi ketat), jalankan penyetel, tulis laporan ke ringkasan
   job + artefak JSON. Saklar off = keluar sukses tanpa rahasia; on tanpa rahasia = gagal keras.
4. **Penyetel** — `tools/brain-param-tune.mjs`: grid a ∈ [1.0, 2.0], c ∈ [0.15, 0.30] (dalam
   BOUNDS FiezelBrainConfig); gerbang: ≥ 3.000 jawaban, CI bootstrap perbaikan > 0, langkah
   ≥ 0.1 (a) / 0.02 (c); paruh-waktu: ≥ 600 probe, CI k tidak memuat 1, |ln k| ≥ ln 1.15.
   `CODE_SITES` = daftar tempat yang wajib diubah PR penyetelan (dikunci gerbang T6).

Simulasi (gerbang T1–T4): dunia tanpa masalah — termasuk kemampuan berderau dan bias −0.4 — nol
usulan; a=1.2/c=0.2 → usulan tepat 1.2/0.2; ingatan 1.5× → paruh-waktu 1.6 → ~2.4 hari; tanpa
gerbang CI dunia berderau akan mengusulkan perubahan palsu (RED).

```yaml
files_added:
  - tools/brain-param-tune.mjs
  - tools/item-pool-job.mjs
  - .github/workflows/braincore-item-pool.yml
  - workers/api/migrations/0016_item_pool_probe.sql
  - tests/brain-param-tune-test.js
  - docs/handoffs/FIEZEL-M025-378-PARAM-TUNE-HANDOFF.md
files_touched:
  - app.js
  - features/brain/fiezel-item-pool.js
  - workers/api/evidence/item-pool-core.js
  - workers/api/evidence/item-pool-store-d1.js
  - workers/api/evidence/route-item-pool.js
  - workers/api/route-wiring.js
  - workers/api/migrations/MIGRATIONS.md
  - docs/BRAIN-DATA-PRIVACY.md
  - docs/D1-RETENTION.md
  - reports/ITEM_POOL_ACTIVATION.md
  - tests/item-pool-test.js
  - .github/workflows/quality.yml
  - sw.js, core-config.js, features/neural-voice/fiezel-diag-panel.js, kurikulum.html, misi.html,
    coordination/BUILD-VERSION.json (bump build)
```

## CARA MENERAPKAN USULAN (untuk sesi Claude berikutnya)

Owner: "terapkan usulan penyetelan Braincore". Baca run terakhir workflow **Braincore Item Pool**
(ringkasan job / artefak `braincore-tuning`). Untuk setiap usulan, ubah SEMUA tempat di
`CODE_SITES` (tools/brain-param-tune.mjs) sekaligus, naikkan `PARAM_VERSION` (perangkat + server,
identik) dan `PARAM_EPOCH_DAY` (hari rilis), perbarui `CURRENT` di penyetel dan literal uji yang
memakai 1.5/0.25/1.6, bump build, jalankan suite. Bundle manifest naik MINOR.

## BATAS YANG DIKETAHUI

- BKT (L0, T, slip, guess) TIDAK disetel: butuh urutan jawaban per murid, bertentangan dengan
  lane anonim. `targetSuccess` dan `bkt.T` sudah disetel per murid oleh self-tune (A3).
- Model probe mengandaikan plafon q sama untuk semua murid; simulasi dengan q ~ U(0.8, 1)
  tetap tidak menghasilkan usulan palsu, tetapi taksiran titik k bergeser ~+0.15.
- Penyetelan a/c bersifat PREDIKTIF: dengan taksiran kemampuan yang berderau, a terbaik untuk
  memprediksi bisa lebih kecil dari a "sebenarnya". Itu disengaja — a dipakai untuk memprediksi.

## BERIKUTNYA (roadmap OWNER, urutan tetap)

3. Angka rumus dari data — jalur selesai (rilis ini); usulan pertama muncul setelah data cukup.
4. Uji A/B antar murid, dibagi server, diukur retensi D1/D7/D30.
5. Retensi murid (streak, target harian, pengingat, Pau).
6. Dua ukuran rutin di dashboard owner: Brier dan retensi 7/30 hari.
