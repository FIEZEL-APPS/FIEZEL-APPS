# Kapasitas FIEZEL untuk satu sekolah penuh (R8)

Wewenang: OWNER, 5 Oktober 2026 (rencana induk `docs/STRATEGI-SEKOLAH-INDONESIA-2026.md`, R8).
Alat hitung: `node tools/kapasitas-sekolah.mjs` — angka di bawah adalah keluarannya, dan
`tests/kepatuhan-ai-sekolah-test.js` menjaga supaya tabel di sini sama dengan keluaran alat.

## 1. "Batas 250 pengguna" bukan batas murid

`MAX_USERS = "250"` di `workers/api/wrangler.toml` adalah **cermin** batas worker inti lama
(pengingat push lewat Puter, `tools/dev/fiezel-core-worker-proof-route.js`). Worker Cloudflare
+ D1 yang melayani kelas, laporan, tugas, akun, dan AI **tidak memeriksa angka itu sama sekali**.
Yang benar-benar membatasi satu sekolah adalah tiga hal di bawah.

## 2. Hitungan (asumsi bawaan: 30 menit aplikasi terlihat per murid per hari, 3 pertanyaan AI, 32 murid per rombel, papan guru 60 menit per rombel)

Ritme dari kode: polling murid 6 dtk, undangan panggung 12 dtk, papan guru 10 dtk. Plafon neuron AI akun 8000/hari.

| Murid | Permintaan/hari | Paket gratis (100 rb/hari) | Neuron AI/hari | Plafon AI sekarang | Paket berbayar, AI untuk semua |
|---|---|---|---|---|---|
| 250 | 119.130 | **lewat** | 22.500 | **lewat** (cukup untuk ±88 murid) | ±US$8.03/bulan |
| 500 | 238.260 | **lewat** | 45.000 | **lewat** (cukup untuk ±88 murid) | ±US$13.47/bulan |
| 1000 | 476.520 | **lewat** | 90.000 | **lewat** (cukup untuk ±88 murid) | ±US$24.51/bulan |
| 2000 | 952.680 | **lewat** | 180.000 | **lewat** (cukup untuk ±88 murid) | ±US$49.43/bulan |

Catatan cara membaca:
- Hitungan permintaan adalah **batas bawah**: satu ronde polling dihitung satu permintaan.
- Paket gratis **menolak** permintaan di atas batas harian — murid melihat aplikasi "tidak
  tersambung" di tengah jam pelajaran. Paket berbayar tidak menolak; kelebihannya ditagih.
- Kolom terakhir mengandaikan plafon neuron dinaikkan supaya semua murid terlayani AI
  (harga Workers AI di atas jatah gratis 10.000 neuron/hari).

## 3. Temuan

1. **Paket gratis sudah tidak cukup pada 250 murid** yang aktif 30 menit sehari. Penyebab
   terbesar adalah polling saat aplikasi terlihat: kabar kelas tiap 6 detik
   (`NOTIF_POLL_MS`) dan undangan Panggung Suara tiap 12 detik — yang terakhir berjalan untuk
   SEMUA murid, juga yang tidak pernah memakai Panggung Suara (±⅓ dari seluruh permintaan).
2. **AI adalah batas paling sempit.** Plafon neuron akun (`GLOBAL_NEURON_CAP`, dijepit
   `ACCOUNT_DAILY_NEURON_BUDGET` = 10.000) cukup untuk ±88 murid yang masing-masing bertanya
   3 kali sehari. Lewat dari itu, jalur AI turun ke model yang lebih murah lalu ke jawaban
   lokal — aplikasi tidak mati, tetapi AI terasa "hilang" untuk murid yang datang belakangan.
3. **D1 bukan masalah** pada skala sekolah (ribuan tulis per hari, jauh di bawah batas).

## 4. Rencana sebelum menawarkan ke satu sekolah penuh

| Langkah | Siapa | Dampak |
|---|---|---|
| Pindah ke Workers Paid | owner (dasbor Cloudflare) | Permintaan tidak lagi ditolak; ±US$8–25/bulan untuk 250–1.000 murid termasuk AI |
| Putuskan anggaran AI per sekolah, lalu naikkan `ACCOUNT_DAILY_NEURON_BUDGET` dan `GLOBAL_NEURON_CAP` bersama | owner | Tanpa ini AI hanya cukup untuk ±88 murid aktif per hari |
| Polling undangan Panggung Suara hanya untuk murid yang pernah memakai fitur sosial | kode (`pollStageInvites` di `app.js`) | Memangkas ±⅓ permintaan; perubahan perilaku, butuh persetujuan owner |
| Jalankan ulang `node tools/kapasitas-sekolah.mjs --menit=<data nyata>` setelah pilot | siapa saja | Asumsi 30 menit diganti angka pemakaian sebenarnya |

Belum dikerjakan di kode: ketiga langkah pertama adalah keputusan biaya/perilaku milik owner.
