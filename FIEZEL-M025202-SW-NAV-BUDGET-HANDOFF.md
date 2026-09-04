# Handoff m025-202 — PWA terpasang berhenti tersandera jaringan yang menggantung

**Kewenangan: OWNER.** Laporan langsung: *"kenapa PWA di iPhone yang sudah terinstal harus
terhubung ke internet baru bisa jalan? perasaanku sebelumnya tidak begitu."*

Ia benar pada **kedua** bagiannya.

## Status

**SELESAI.** Terukur di Chromium dengan 181 berkas cangkang sudah tersimpan:

| kondisi jaringan | sebelum | sesudah |
|---|---|---|
| benar-benar mati (mode pesawat) | jalan 21 ms | jalan 21 ms (tidak berubah) |
| **menggantung** (Wi-Fi berhalaman-login, sinyal 1 batang) | **tidak pernah jalan** (habis waktu 30 s) | **jalan 2523 ms** |
| sehat | dokumen baru dari jaringan | dokumen baru dari jaringan (tidak berubah) |

## Akar masalah

Sejak **2026-08-26**, navigasi di `sw.js` menjadi *network-first* dan menunggu jaringan
**tanpa batas waktu**. Itu aman selama "tidak ada jaringan" berarti `fetch` **menolak** — dan
memang begitu di mode pesawat, di mana jalur cadangan cache langsung menyala.

Tetapi keadaan yang paling sering dialami murid bukan itu. Di Wi-Fi sekolah berhalaman-login
atau sinyal seluler satu batang, koneksinya **diterima lalu tidak pernah dijawab**: `fetch`
menggantung, dan cangkang yang sudah rapi di perangkat tidak pernah disentuh sampai iOS
menyerah sendiri. Dari sisi murid, itu terbaca sebagai "aplikasi butuh internet".

Perasaan pemilik bahwa dulu tidak begitu juga benar: sebelum 26 Agustus jalurnya cache-first.

## Perbaikan

Yang ditambahkan **hanya batas waktu**, bukan pergantian strategi:

- `NAV_NETWORK_BUDGET_MS = 2500` — anggaran untuk **navigasi saja**, bukan aset.
- Jaringan tetap didahulukan. Selama jawaban tiba dalam anggaran, jalannya **sama persis**
  seperti sebelumnya, bita demi bita — pemulihan-otomatis dokumen basi tetap utuh.
- Kalau anggaran lewat, cangkang disajikan, **tetapi permintaan jaringannya tidak dibatalkan**:
  ia dijaga hidup lewat `e.waitUntil()` supaya cache tetap tersegarkan. Penyembuhan tidak
  hilang, ia hanya mundur satu peluncuran pada jaringan buruk.

### Batas yang disengaja dan tidak ditutupi

Perangkat yang **belum punya cangkang** (pemasangan pertama) tetap harus menunggu jaringan.
Menyajikan "sesuatu" yang tidak ada bukan perbaikan, dan berpura-pura punya cangkang akan
menghasilkan layar kosong permanen. Assert (D) mengunci batas itu supaya tetap terlihat.

## Kenapa berkas ini menyentuh wilayah sesi lain

`sw.js` dan `cf-config-killswitch-test.js` adalah **klaim sesi A6**. Penyeberangan ini
**atas izin OWNER langsung** ("lanjutkan saja, dan hindari konflik dengan sesi lain"), dan
sengaja dijaga sekecil mungkin: satu konstanta + satu blok navigasi. Nol aturan cache lain
disentuh, nol perilaku aset berubah, `cf-config-killswitch-test.js` **tidak disentuh sama
sekali** dan tetap PASS.

`features/neural-voice/fiezel-diag-panel.js` berubah hanya pada satu angka `DIAG_BUILD`,
ditulis `tools/bump-build.mjs` — pintu tunggal yang disepakati protokol koordinasi.

## Gerbang

`sw-nav-budget-test.js` (8 assert) **menjalankan** pendengar `fetch` sungguhan dari `sw.js` di
atas lingkungan tiruan, lalu menembakkan permintaan navigasi dengan `fetch` yang menggantung.
Perilaku, bukan pola teks — assert berbasis pola teks sudah dua kali dalam sesi ini hijau
sementara cacat yang ia namai masih berdiri.

Bukti merah tiga arah, semuanya turun lalu pulih 8/8: hapus balapan anggaran · hapus
`waitUntil` · longgarkan anggaran jadi 60 detik.

**Catatan kejujuran harness:** bentuk pertama gerbang ini MEMERAHKAN skenario jaringan-sehat,
dan sempat terlihat seperti cacat produk. Ternyata `ResponseStub` saya tidak punya `clone()`,
jadi `r.clone()` melempar dan jatuh ke `.catch()`. Harness yang tidak meniru API sungguhan
menghasilkan tuduhan palsu, dan tuduhan palsu sama mahalnya dengan cacat yang terlewat.

## Utang yang masih terbuka

1. Uji ini berjalan di **Chromium**, bukan WebKit. Perilaku iOS Safari yang sebenarnya baru
   final di perangkat pemilik.
2. Angka 2500 ms belum diukur terhadap jaringan seluler nyata Indonesia; ia dipilih dari
   ukuran `index.html` (47 KB), bukan dari telemetri.
3. Tekanan kuota iOS (model neural 152 MB) tetap bisa menggusur cangkang; itu jalur kegagalan
   yang berbeda dan tidak disentuh rilis ini.
