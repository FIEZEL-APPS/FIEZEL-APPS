# HANDOFF — Bank Mapel Fase D: kenapa isinya DICABUT, dan apa syarat isinya boleh kembali

**Repo:** `FIEZEL-APPS/FIEZEL-APPS` · **Basis ukur:** `m025-349` · **Keputusan:** OWNER

---

## 1. Apa yang dicabut

Seluruh sepuluh berkas bank mapel Fase D dihapus:

```
content/mapel/mapel-{ipa,mat,eng,ind,ips}-d.json
content/mapel/mapel-{ipa,mat,eng,ind,ips}-d-th.json
```

Isinya 408 butir soal. **Semuanya ditulis AI**, termasuk 324 butir yang sudah lebih dulu
hidup di `main` lewat PR #444 dan sudah sampai ke guru.

## 2. Kenapa dicabut

Tidak satu pun butir itu berasal dari bank soal resmi Kemendikbudristek, dan **tidak ada
satu pun berkas sumber resmi di repo ini** yang bisa dirujuk — dicari dengan `find` untuk
PDF, "buku siswa", "kemendikbud", "bskap": nol hasil.

Yang lebih berbahaya daripada butirnya adalah kutipannya. Tiap kompetensi mencantumkan:

```json
"cpRef": "Kepmendikbudristek/BSKAP No. 032/H/KR/2024 — Buku Siswa IPA Kelas 7 Bab 1"
```

Nomor kepmen itu tidak pernah diverifikasi terhadap dokumen aslinya. Ia lahir di commit
`2ae61ab` (agen AI), lalu dibuat **lebih spesifik** di cabang ini dengan menambahkan
"Buku Siswa IPA Kelas 7 Bab 1" — sehingga kutipannya tampak lebih bisa ditelusuri padahal
tetap tidak terverifikasi.

Gerbang lama ikut bersalah: ia menuntut `cpRef` sepanjang >= 10 karakter. Kutipan yang
TERDENGAR resmi lolos; kutipan yang benar-benar resmi tidak dibedakan sama sekali. **Panjang
string bukan bukti keabsahan.** Gerbang yang mengukur panjang mengajari penulis berikutnya
menulis string yang panjang, bukan string yang benar.

Guru memakai materi ini di kelas. Kutipan resmi palsu lebih berbahaya daripada tanpa
kutipan, karena guru mempercayainya dan tidak punya alasan memeriksanya.

## 3. Apa yang TIDAK ikut mati

Pencabutan ini tidak boleh terasa oleh guru mana pun. Yang dijaga:

- **Ketujuh belas mapel tetap melayani soal** lewat jalur template lama (`fail-quiet`).
  Gerbang menuntut ini secara eksplisit untuk ke-17 mapel, bukan sampel.
- **`sw.js` tidak lagi menyebut berkas bank mana pun.** Ini bukan kerapian: `addAll()`
  menolak SELURUH precache bila satu alamat gagal, jadi satu entri hantu membuat service
  worker gagal pasang. Gerbang sekarang memeriksa silang daftar precache terhadap berkas
  yang benar-benar ada.
- **Mekanisme banknya tetap utuh** di `fiezel-teacher-shell.js`. Yang hilang isinya, bukan
  jalurnya — begitu bank resmi ada, ia langsung terbaca.

## 4. Syarat isinya boleh kembali

Gerbang `tests/mapel-fase-d-content-test.js` sekarang **tidak menuntut isi sama sekali**.
Nol bank = hijau. Bank kosong bukan utang yang harus ditambal cepat-cepat; ia keadaan jujur
sampai sumbernya ada.

Tetapi begitu satu berkas bank muncul, ia wajib membawa asal-usulnya:

```json
"provenance": {
  "dokumen": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi)",
  "penerbit": "Pusat Perbukuan, Kemendikdasmen",
  "tahun": "2023",
  "isbn": "978-623-118-458-0",
  "diperolehDari": "<alamat unduh resmi + tanggal unduh>",
  "penyusunButir": "resmi-terverifikasi | guru-tervalidasi"
}
```

Dua aturan yang membuat kesalahan kemarin tidak bisa terulang tanpa terlihat:

1. **`penyusunButir` wajib** bernilai `resmi-terverifikasi` atau `guru-tervalidasi`. Nilai
   `ai-belum-divalidasi` sengaja disediakan supaya draf AI bisa disimpan tanpa berbohong
   tentang dirinya — dan sengaja **DITOLAK** gerbang, supaya draf itu tidak pernah diam-diam
   menjadi materi kelas.
2. **`cpRef` harus menunjuk dokumen yang sama** dengan `provenance.dokumen`. Kutipan yang
   tidak bisa ditelusuri ke dokumen yang dipegang bank itu bukan kutipan, melainkan hiasan.
   Panjang string tidak lagi diukur sama sekali.

## 5. Kenapa agen tidak bisa mengunduh sendiri sumbernya

Lingkungan eksekusi ini memblokir seluruh egress keluar — bukan hanya domain Kemendikbud.
`curl` ke `example.com` pun mengembalikan `000`, dan `WebFetch` menjawab `EGRESS_BLOCKED`
untuk setiap domain. Yang masih jalan hanya pencarian web, yang mengembalikan cuplikan dari
situs pihak ketiga.

Menyusun daftar isi dari blog pihak ketiga lalu menyebutnya resmi adalah persis kesalahan
yang dicabut di dokumen ini. Karena itu sumber resminya **diunduh oleh OWNER** dan
diletakkan di repo, bukan direkonstruksi oleh agen.

## 6. Dua persoalan berbeda yang tidak boleh dikaburkan

- **Struktur bab** BISA dibuat benar-benar resmi: daftar isi Buku Siswa terbatas, terbaca,
  dan bisa dicocokkan persis — tidak kurang tidak lebih.
- **Butir soal** TIDAK bisa "resmi" dengan cara yang sama. Kemendikbudristek tidak
  menerbitkan bank 972 soal resmi. Soal latihan di dalam Buku Siswa jumlahnya terbatas, dan
  menyalinnya utuh adalah persoalan lisensi tersendiri. Bank sebesar apa pun pasti disusun
  seseorang — yang menentukan adalah **siapa**, dan apakah itu **dinyatakan jujur**.
