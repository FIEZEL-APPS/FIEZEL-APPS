# Handoff m025-211 — navigasi PWA dilayani cangkang generasi ini, jaringan menyusul

**Kewenangan: OWNER.** Laporan langsung sesudah m025-206: *"aman tapi sedikit lambat."*

Ia benar. Dan menelusurinya menemukan cacat kedua yang lebih serius daripada lambat.

## Status

**SELESAI.** Dua cacat ditutup oleh satu perubahan.

## Sentuhan pada `features/neural-voice/`

**Hanya nomor build** (`DIAG_BUILD` m025-210 → m025-211 lewat `tools/bump-build.mjs`). **Nol
baris logika suara neural berubah.**

## Cacat 1 — setiap peluncuran membayar perjalanan jaringan penuh

Bentuk m025-206 mengambil dokumen dari JARINGAN lebih dulu (dengan anggaran 2,5 detik),
padahal salinan sempurna sudah ada di perangkat. Terukur di Chromium dengan **181 berkas
cangkang sudah tersimpan**:

| kondisi jaringan | commit | FCP |
|---|---|---|
| sehat | 20 ms | 60 ms |
| lambat (700 ms/permintaan) | 720 ms | **752 ms** |
| menggantung | 2519 ms | **2556 ms** |

## Cacat 2 — dokumen build baru berjalan di atas JavaScript build lama

**Ini yang lebih serius, dan ia tidak dilaporkan siapa pun.**

SELURUH aset cangkang non-navigasi dilayani cache-first di dalam generasinya
(`isShellRequest`). Hanya DOKUMEN yang diambil dari jaringan. Jadi begitu build baru terbit
sementara SW lama masih aktif — dan ia memang masih aktif, karena `sw.js` sengaja tidak pernah
memanggil `skipWaiting()` — murid menerima `index.html` build **N+1** yang berjalan di atas
JavaScript build **N**.

Terukur di peramban, bukan dugaan: dengan `SW_REV` tidak berubah, dokumen membawa penanda
terbitan baru sementara `core-config.js` masih membawa penanda lama. `TIDAK_SEPADAN: true`.

Cabang yang dimaksudkan mencegah cangkang tak sepadan justru **membuatnya**.

## Yang berubah

Dokumen kini dibaca dari `SHELL_CACHE`, sama seperti setiap aset lain. Nama cache berkunci
`SW_REV` dan `activate` menghapus generasi lain, jadi cangkang yang ditemukan **dijamin
segenerasi** dengan SW yang melayaninya. Jaringan tidak ditinggalkan — ia pindah ke belakang
lewat `waitUntil`, menimpa entri cangkang setiap peluncuran.

| kondisi jaringan | FCP sebelum | FCP sesudah |
|---|---|---|
| sehat | 60 ms | 88 ms |
| lambat | 752 ms | **92 ms** |
| menggantung | 2556 ms | **40 ms** |
| dokumen ⇄ aset segenerasi | **TIDAK** | **YA** |

Kondisi jaringan tidak lagi memengaruhi peluncuran sama sekali.

## Regresi yang HAMPIR terkirim

Bentuk pertama perbaikan ini menyajikan `./index.html` untuk **setiap** navigasi. Itu akan
membuat `creator-report-dashboard.html` dan `creator-report-setup.html` — keduanya ada di
`ASSETS`, keduanya halaman sungguhan — **tidak pernah bisa dibuka lagi**. Tertangkap saat
memeriksa asimetri baca/tulis, bukan oleh gerbang mana pun yang sudah ada. Assert (J) kini
menjaganya, dan terbukti merah terhadap bentuk cacat itu.

## Gerbang

`sw-nav-budget-test.js` → **`sw-nav-shell-first-test.js`** (8 → **15 assert**). Gerbang lama
menjaga anggaran waktu yang kini tidak ada lagi; yang baru menjalankan pendengar `fetch`
sungguhan dari `sw.js` di atas cache tiruan yang BENAR-BENAR menyimpan per nama cache.

Bukti merah, empat arah:

| bentuk yang dicoba | hasil |
|---|---|
| kembalikan network-first m025-206 | **8/15** — A, B, C, C, H merah |
| buang `waitUntil` | **12/15** — revalidasi latar mati |
| buang penjaga `r.ok` | **12/15** — respons 500 meracuni cangkang |
| `index.html` untuk semua navigasi | **14/15** — assert J |

## Assert yang DIGANTI, dan kenapa itu bukan pelonggaran

Tiga gerbang meng-assert MEKANISME lama, bukan sifat:

1. `pwa-startup-white-screen-recovery-test.js` — `indexOf('fetch(') < indexOf('caches.match(')`.
   Assert semacam ini mengunci satu cara menulis kode; ketika cara itu sendiri keliru,
   gerbangnya ikut membela kekeliruan. Diganti: dokumen wajib dibaca dari `SHELL_CACHE`,
   revalidasi wajib `cache:'reload'` dan wajib dijaga `waitUntil`, hanya `.ok` yang boleh
   menimpa. Perilaku dalamnya pindah ke gerbang eksekusi di atas.
2. `pwa-release-coherence-test.js` — "dokumen jaringan harus menang atas entri kosong".
   Diganti: luring dijawab dari cangkang generasi ini, dan yang dijawab **sama persis** dengan
   yang tersimpan di sana (bebas mekanisme, dan lebih ketat).
3. Regex `skipWaiting\(` di dua gerbang memerah karena **komentar** yang menjelaskan kenapa
   `skipWaiting()` tidak dipakai. Diperbaiki dengan membuang komentar sebelum memindai —
   yang diuji PEMANGGILAN, bukan kemunculan kata.

## Utang jujur

1. **Penyembuhan mundur satu peluncuran.** Dokumen cangkang yang rusak dulu sembuh di
   peluncuran yang SAMA; kini di peluncuran berikutnya. Jalur itu nyaris mustahil dimasuki
   (`cache.put` hanya menulis respons `ok`, `addAll` menolak yang tidak `ok`), dan ditukar
   dengan menghapus satu perjalanan jaringan dari SETIAP peluncuran plus satu ketaksepadanan
   generasi yang terbukti nyata.
2. **Perangkat tanpa cangkang tetap menunggu jaringan** (pemasangan pertama, atau cache
   tergusur tekanan penyimpanan iOS). Di sana tidak ada apa pun untuk disajikan. Assert (F)
   dan (H) menguncinya supaya batas itu terlihat, bukan tersembunyi.
3. **Diuji di Chromium, bukan WebKit.** Perilaku iOS Safari baru final di perangkat pemilik.

## Koordinasi

`sw.js` wilayah klaim sesi A6, diseberangi **atas laporan OWNER langsung** dan dijaga sekecil
mungkin: satu cabang navigasi. `cf-config-killswitch-test.js` tidak disentuh dan tetap PASS.
