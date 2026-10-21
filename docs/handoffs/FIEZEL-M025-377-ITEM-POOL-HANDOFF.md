# FIEZEL m025-377 — Braincore Langkah 2: Kesulitan Soal dari Semua Murid Handoff

Tanggal: 2026-09-27 WIB
Release: `FIEZEL_PAGE_BUILD=m025-377`, `DIAG_BUILD=m025-377`, `SW_REV=m025-377-braincore-audit-20260927`
(akhiran SW_REV dibawa `tools/bump-build.mjs` dari rilis sebelumnya; nomornya yang menentukan).
Base: `origin/main` (24f61fe, #470)
Otoritas: roadmap OWNER 2026-09-27, langkah 2 — "Tingkat kesulitan soal dihitung dari semua
murid, bukan per HP." OWNER: "lanjutkan" setelah #470 di-merge.

## STATUS

Machine-verified lokal: seluruh perintah gerbang `.github/workflows/quality.yml`, gerbang baru
`tests/item-pool-test.js` 41/41. **Server BELUM menyala**: `ITEM_POOL_ENABLED = "off"` dan
migrasi `0015_item_pool.sql` belum diterapkan ke `fiezel-evidence` — itu langkah OWNER di
`reports/ITEM_POOL_ACTIVATION.md`. Sampai itu, perangkat mencatat dan MENAHAN jawaban-pertama
(maks. 56 hari) dan kesulitan soal berperilaku persis seperti m025-376.

## APA YANG BERUBAH

1. **Perangkat** — `features/brain/fiezel-item-pool.js` (modul murni, manifest `itemPool:
   active`, bundle 3.14.0). Mencatat JAWABAN PERTAMA murid per soal: `[itemId, bucket
   prediksi 0..19, benar]` + hari. Prediksi diambil saat penyajian (`draw()` →
   `q.__predictedPrior`) dari PRIOR KANONIK (FiezelItemPrior level+mode) dan hanya bila
   keyakinan kemampuan ≥ 0.5; tes penempatan tanpa prediksi (soal tetap ditandai terlihat).
2. **Kirim/baca** — `itemPoolFlush` (akhir sesi, boot, online): 2xx = selesai; `{disabled}` =
   tahan 12 jam; 400 = buang; lainnya = backoff 1 jam×2^n (maks. 24 jam). `itemPoolRefreshTable`
   membaca tabel paling sering sekali sehari. Keduanya `credentials:'omit'`.
3. **Penerapan** — `itemCalibrationEffective`: tabel gabungan MENANG atas kalibrasi N=1 bila
   soal dijawab ≥ 20 murid (prior kanonik + koreksi, |koreksi| ≤ 1.0). Selain itu kalibrasi
   lokal seperti sebelumnya.
4. **Server** — `workers/api/evidence/item-pool-{core,store-d1}.js`, `route-item-pool.js`:
   `POST /api/braincore/item-evidence`, `GET /api/braincore/item-difficulty` (cache 1 jam).
   Validasi: struktur rusak = 400/413, isi asing dibuang diam-diam. D1: penghitung
   `(day,item_id,pb)→n,k`, dedup UUID 60 hari, tabel hasil dibangun ulang tiap hari.
5. **Penaksir** — dua tahap: (1) taksiran lemah per soal → median = pergeseran bersama (bias
   kemampuan semua perangkat) + tau empirical-Bayes; (2) MAP per soal dengan prior
   N(median, tau²), koreksi = delta − median. Simulasi (200 murid, 30% label meleset ±0.8, bias
   +0.2): galat kesulitan 0.45 → 0.30; kalibrasi per-HP yang melihat 10× lebih banyak jawaban
   hanya 0.41. tau dipatok (0.3/0.5) gagal di salah satu dunia; empirical-Bayes paling jauh
   0.006 dari pilihan terbaik di setiap dunia (gerbang E5).
6. **Cron harian** — `runItemPoolRollup`: rebuild tabel (hanya saat saklar on) + purge (selalu).
7. **Privasi** — `docs/BRAIN-DATA-PRIVACY.md` §7c (pengecualian ID templat soal yang ditulis),
   `docs/D1-RETENTION.md` (120/60 hari), tabel terbit hanya soal ≥ 20 murid (= k-anonimitas §4).

```yaml
files_added:
  - features/brain/fiezel-item-pool.js
  - workers/api/evidence/item-pool-core.js
  - workers/api/evidence/item-pool-store-d1.js
  - workers/api/evidence/route-item-pool.js
  - workers/api/migrations/0015_item_pool.sql
  - tests/item-pool-test.js
  - reports/ITEM_POOL_ACTIVATION.md
  - docs/handoffs/FIEZEL-M025-377-ITEM-POOL-HANDOFF.md
files_touched:
  - app.js
  - index.html
  - sw.js, core-config.js, features/neural-voice/fiezel-diag-panel.js, kurikulum.html, misi.html,
    coordination/BUILD-VERSION.json (bump build)
  - features/brain/fiezel-brain-manifest.js
  - features/telemetry/fiezel-telemetry-config.js
  - workers/api/route-wiring.js
  - workers/api/wrangler.toml
  - workers/api/migrations/MIGRATIONS.md
  - docs/BRAIN-DATA-PRIVACY.md
  - docs/D1-RETENTION.md
  - tests/brain-manifest-test.js
  - tests/reset-side-state-test.js
  - .github/workflows/quality.yml
```

## BATAS YANG DIKETAHUI (jujur)

- **Jalur yang menerapkan koreksi** sama dengan kalibrasi lokal: sesi adaptif + cloze. Jalur
  lesson grammar dan latihan level MENYUMBANG data tetapi belum MEMAKAI koreksi (mereka juga
  belum memakai kalibrasi lokal). Menyambungnya = keputusan terpisah.
- **Klien jujur diasumsikan** (sama dengan semua telemetri): tanpa pengenal, server tidak bisa
  memverifikasi "satu murid satu jawaban". Pagar: rate limit per IP, koreksi dijepit ±1.0,
  ambang 20, dead zone 0.2.
- **Bias bersama per level** diasumsikan sama untuk semua level (satu median global).

## BERIKUTNYA (roadmap OWNER, urutan tetap)

1. Fondasi — selesai (#470).
2. **Kesulitan soal dari semua murid — kode selesai (rilis ini); menunggu OWNER menjalankan
   `reports/ITEM_POOL_ACTIVATION.md`.**
3. Angka-angka rumus disetel dari data (a, c, pertumbuhan memori, dst.) — penghitung
   `item_pool_daily` adalah bahan pertamanya.
4. Uji A/B antar murid, dibagi server, diukur retensi D1/D7/D30.
5. Retensi murid (streak, target harian, pengingat, Pau).
6. Dua ukuran rutin di dashboard owner: Brier dan retensi 7/30 hari.
