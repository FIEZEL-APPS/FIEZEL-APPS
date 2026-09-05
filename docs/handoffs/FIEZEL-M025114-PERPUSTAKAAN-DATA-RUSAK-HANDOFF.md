# FIEZEL — Perpustakaan yang kehilangan seluruh datanya (handoff m025-114)

Rilis: `m025-114`
Berkas yang berubah: `features/library/library-books-v1.json` (satu koma),
`tests/library-integrity-test.js` (baru), `.github/workflows/quality.yml`, `core-config.js`,
`features/neural-voice/fiezel-diag-panel.js`, `sw.js`

---

## 1. Laporan

OWNER, 23 Agustus 2026:

> "COBA KAMU CEK FITUR AUDIOBOOK, LIBRARRYNYA TIDAK MEMUAT DATA APAPUN"

Benar. Rak buku kosong total — bukan sebagian, bukan sampul yang gagal dimuat, melainkan
sembilan buku hilang seluruhnya beserta audiobook dan terjemahannya.

## 2. Sebabnya satu koma

`features/library/library-books-v1.json` tidak bisa diurai. Di batas antara dua buku,
objek berikutnya dibuka tanpa koma pemisah:

```
6821      }        <- buku "the_little_prince" ditutup
6822    ]
6823  }            <- ... dan di sinilah koma itu hilang
6824      {        <- buku berikutnya dibuka
6825        "id": "charlottes_web_guide",
```

`fetch(...).json()` melempar `SyntaxError`, `FiezelLibrary.validate()` tidak pernah
menerima paketnya, dan layar Perpustakaan berhenti tanpa satu buku pun. Satu karakter
menjatuhkan seluruh fitur — itulah sifat berkas data: ia tidak rusak sebagian.

**Ini terjadi dua kali dalam satu malam**, pada dua penulisan berbeda ke `main`:

| Commit | Waktu | Akibat |
|---|---|---|
| `7ff64d3` "Update print statement from 'Hello' to 'Goodbye'" | 22 Agt 23.45 | paket 1.889 baris tidak bisa diurai |
| `34021f5` "Update library-books-v1.json" | 23 Agt 00.42 | paket 7.269 baris tidak bisa diurai, kerusakan yang sama persis |

Keduanya didorong langsung ke `main` tanpa PR, dengan pesan commit yang tidak
menggambarkan isinya.

## 3. Yang diperbaiki, dan yang sengaja TIDAK diganggu

Perbaikannya satu koma pada berkas versi `main` **terbaru** — bukan pemulihan versi lama.
Itu disengaja: penulisan `34021f5` memperluas "The Little Prince" dari 240 menjadi **1.484
kalimat**, dan memulihkan versi sebelumnya berarti membuang pekerjaan itu.

Sesudah perbaikan: 9 buku, 1.703 kalimat, seluruhnya berpasangan Inggris–Indonesia.

## 4. Kenapa 64 tes di CI tidak satu pun memerah

Karena tidak satu pun pernah **membuka berkas data yang benar-benar dikirim ke perangkat**.
Ada tes untuk struktur UI, kontras, cache PWA, koherensi rilis, konten pelajaran — tetapi
paket Perpustakaan tidak pernah diurai di luar peramban. `node --check` hanya memeriksa
JavaScript, dan `validator.js` tidak menyentuh berkas ini.

Celah itu lebih besar daripada satu berkas: setiap `.json` runtime punya risiko yang sama,
dan gejalanya selalu sama — **fitur yang kosong diam-diam**, bukan error yang terlihat.

## 5. Gerbang baru: `tests/library-integrity-test.js`

1. **Setiap `.json` yang ikut terkirim harus bisa diurai.** Gerbang langsung untuk
   kerusakan seperti di atas, berlaku untuk semua data runtime. BOM ditoleransi (peramban
   membuangnya saat mendekode UTF-8, jadi berkas ber-BOM tidak rusak di perangkat).
2. **Paket Perpustakaan memenuhi kontrak `fiezel-library.js`**: schema, minimal sembilan
   buku, id unik, sampul, bab.
3. **Setiap kalimat punya pasangan Inggris dan Indonesia.** JSON yang valid pun bisa kosong
   isinya: rak yang terlihat penuh dengan pemutar yang tidak punya apa pun untuk dibacakan.
4. **Berkasnya tetap satu dokumen**, bukan dua yang ditempel.

Diuji-mutasi terhadap kerusakan yang sebenarnya:

```
berkas rusak (7ff64d3) dikembalikan  ->  4 dari 4 pemeriksaan FAIL
diperbaiki                            ->  PASS
```

Sudah dipasang di `.github/workflows/quality.yml`.

## 6. Catatan untuk pekerjaan berikutnya

- Dua kerusakan berturut-turut datang dari penulisan langsung ke `main`. Gerbang di atas
  berjalan pada setiap `push`, jadi kerusakan ketiga akan memerah di CI — tetapi ia tetap
  mendarat di `main` dulu. Kalau paket Perpustakaan akan terus ditulis dari luar sesi ini,
  jalurnya sebaiknya lewat PR supaya gerbangnya berbicara **sebelum** murid melihat rak
  kosong.
- `reports/FIEZEL-5.18.0-AUTONOMOUS-BRAIN-EVIDENCE.json` dan
  `reports/FIEZEL-5.18.0-BASELINE-CHECKSUM.json` memakai BOM. Keduanya artefak bukti, tidak dibaca
  runtime, jadi sengaja ditoleransi — bukan diperbaiki diam-diam.
