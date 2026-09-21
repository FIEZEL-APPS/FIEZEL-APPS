# Sumber resmi Buku Siswa — letakkan berkasnya di sini

Direktori ini menampung **dokumen resmi Kemendikbudristek/Kemendikdasmen** yang menjadi
dasar struktur bab dan isi bank mapel Fase D. Tanpa berkas di sini, bank mapel tidak boleh
diisi — lihat `docs/handoffs/BUKU-SISWA-BAB-HANDOFF.md`.

## Yang dibutuhkan

Untuk tiap mapel × kelas, **halaman Daftar Isi** sudah cukup untuk menyusun struktur bab.
PDF utuh boleh, tetapi yang benar-benar dipakai hanya daftar isinya.

Penamaan berkas:

```
sumber/buku-siswa-<mapel>-kelas-<7|8|9>.pdf
sumber/buku-siswa-<mapel>-kelas-<7|8|9>-daftar-isi.txt   (bila hanya menyalin daftar isinya)
```

dengan `<mapel>` salah satu dari: `ipa`, `mat`, `ind`, `eng`, `ips`.

## Yang wajib dicatat bersama berkasnya

Tiap berkas didampingi satu baris di `sumber/MANIFEST.tsv`:

```
berkas<TAB>judul resmi<TAB>penerbit<TAB>tahun<TAB>isbn<TAB>alamat unduh<TAB>tanggal unduh
```

Keenam medan itu yang nanti mengisi blok `provenance` di bank, dan gerbang
`tests/mapel-fase-d-content-test.js` menolak bank yang blok itu tidak lengkap.

## Kenapa bukan agen yang mengunduh

Lingkungan eksekusi agen memblokir seluruh egress keluar — `curl` ke `example.com` pun
mengembalikan `000`. Menyusun daftar isi dari situs pihak ketiga lalu menyebutnya resmi
adalah persis kesalahan yang menyebabkan 408 butir soal dicabut. Jadi berkas di sini
diunduh manusia dari portal resmi, bukan direkonstruksi agen.
