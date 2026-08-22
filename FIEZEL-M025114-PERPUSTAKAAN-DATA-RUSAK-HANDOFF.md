# FIEZEL — Perpustakaan yang kehilangan seluruh datanya (handoff m025-114)

Rilis: `m025-114`
Berkas yang berubah: `features/library/library-books-v1.json` (dipulihkan),
`library-integrity-test.js` (baru), `.github/workflows/quality.yml`, `core-config.js`,
`features/neural-voice/fiezel-diag-panel.js`, `sw.js`

---

## 1. Laporan

OWNER, 23 Agustus 2026:

> "COBA KAMU CEK FITUR AUDIOBOOK, LIBRARRYNYA TIDAK MEMUAT DATA APAPUN"

Benar. Rak buku kosong total — bukan sebagian, bukan gambar sampul yang gagal, melainkan
sembilan buku hilang seluruhnya beserta audiobook dan terjemahannya.

## 2. Sebabnya bukan kode Perpustakaan

`features/library/library-books-v1.json` **tidak bisa diurai** sejak commit `7ff64d3`
("Update print statement from 'Hello' to 'Goodbye'", 22 Agustus 23.45, -1058/+673 baris).

Satu dokumen JSON ditulis menimpa separuh berkas dan meninggalkan penutup akar di tengah:

```
1441      }
1442    ]          <- daftar buku ditutup di sini
1443  }            <- akar ditutup di sini
1444      {        <- ... lalu tiga buku lama menggantung sesudahnya
1445        "id": "charlottes_web_guide",
```

`fetch(...).json()` melempar `SyntaxError` di posisi 56789, `FiezelLibrary.validate()`
tidak pernah menerima paketnya, dan layar Perpustakaan berhenti tanpa satu buku pun.
Separuh atas berkas itu juga tidak utuh sendiri, jadi tidak ada perbaikan tempel yang
jujur: yang dipulihkan adalah versi sehat terakhir, `9dc132c`.

**Tidak ada isi yang hilang karena pemulihan ini.** Kedua versi sama-sama sembilan buku;
`9dc132c` sudah memuat "The Little Prince: An Extended Retelling" (240 kalimat) yang
ditambahkan di `a3ed061`. Yang ditinggalkan hanya penulisan ulang dari `7ff64d3` yang
memang tidak pernah menjadi berkas yang sah.

## 3. Kenapa 64 tes di CI tidak satu pun memerah

Karena tidak satu pun dari mereka pernah **membuka berkas data yang benar-benar dikirim ke
perangkat**. Ada tes untuk struktur UI, kontras, cache PWA, koherensi rilis, konten
pelajaran — tetapi paket Perpustakaan tidak pernah diurai di luar peramban.

Itu celah yang lebih besar daripada satu berkas: setiap `.json` runtime punya risiko yang
sama, dan gejalanya selalu sama — fitur yang **kosong diam-diam**, bukan error yang
terlihat.

## 4. Gerbang baru: `library-integrity-test.js`

1. **Setiap `.json` yang ikut terkirim harus bisa diurai.** Gerbang langsung untuk
   kerusakan seperti di atas, berlaku untuk semua data runtime, bukan hanya Perpustakaan.
   BOM ditoleransi (peramban membuangnya saat mendekode UTF-8; berkas ber-BOM tidak rusak
   di perangkat).
2. **Paket Perpustakaan memenuhi kontrak `fiezel-library.js`**: schema, minimal sembilan
   buku, id unik, sampul, bab.
3. **Setiap kalimat punya pasangan Inggris dan Indonesia.** JSON yang valid pun bisa
   kosong isinya: rak yang terlihat penuh dengan pemutar yang tidak punya apa pun untuk
   dibacakan.
4. **Berkasnya tetap satu dokumen**, bukan dua yang ditempel — menyebut nama kerusakan
   m025-114 supaya kegagalan berikutnya langsung terbaca sebagai apa.

Diuji-mutasi terhadap kerusakan yang sebenarnya:

```
berkas rusak (7ff64d3) dikembalikan  ->  4 dari 4 pemeriksaan FAIL
dipulihkan                            ->  PASS
```

Sudah dipasang di `.github/workflows/quality.yml`.

## 5. Catatan untuk pekerjaan berikutnya

- `FIEZEL-5.18.0-AUTONOMOUS-BRAIN-EVIDENCE.json` dan
  `FIEZEL-5.18.0-BASELINE-CHECKSUM.json` memakai BOM. Keduanya artefak bukti, tidak dibaca
  runtime, jadi sengaja ditoleransi — bukan diperbaiki diam-diam.
- Commit `7ff64d3` datang dari sesi lain dengan pesan yang tidak menggambarkan isinya.
  Kalau ada sesi paralel yang memang sedang menulis ulang paket Perpustakaan, pekerjaan itu
  harus dimulai kembali dari `main` sesudah rilis ini, dan gerbang di atas akan menahannya
  kalau hasilnya tidak sah.
