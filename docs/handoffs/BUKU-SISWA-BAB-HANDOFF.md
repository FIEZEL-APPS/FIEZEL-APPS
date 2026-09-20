# HANDOFF — Penyelarasan 5 Mapel Inti dengan Daftar Isi Buku Siswa Kemendikbudristek

**Repo:** `FIEZEL-APPS/FIEZEL-APPS` · **Basis ukur:** `m025-349` · **Status:** taksonomi selesai, pengisian bab berjalan

---

## 1. Kenapa ini dikerjakan

Sampai `m025-348`, guru yang menyusun tugas di Ruang Guru membaca daftar seperti ini:

```
KOMP-IPA-D-7-MET-01   Besaran, Satuan & Metode Ilmiah
KOMP-IPA-D-7-ZAT-01   Wujud Zat, Perubahan Fisika & Kimia
```

Tidak satu pun dari empat baris itu tercetak di buku yang dipegang muridnya. Buku Siswa
Kemendikbudristek Kurikulum Merdeka menyebutnya **"Bab 1: Hakikat Ilmu Sains dan Metode
Ilmiah"** dan **"Bab 2: Zat dan Perubahannya"**. Kodenya lebih buruk lagi: `MET`, `ZAT`,
`TEK` adalah singkatan buatan sendiri, bukan alamat yang bisa ditunjuk guru di kelas.

Biayanya ditanggung guru, tiap kali: ia harus menerjemahkan istilah aplikasi ke istilah
buku sebelum bisa memilih tugas yang benar.

---

## 2. Apa yang berubah

**Satu kompetensi = satu BAB Buku Siswa.** Nama bab, sub-bab, dan nomor bab ditulis persis
seperti Daftar Isi bukunya.

Kode berubah bentuk:

```
KOMP-IPA-D-7-MET-01   ->   KOMP-IPA-D-7-BAB1-01
KOMP-<MAPEL>-D-<kelas>-BAB<n>-<NN>
```

**Dua kompetensi berpindah kelas mengikuti bukunya, bukan kebiasaan lama:**

| Kompetensi | Sebelum | Sesudah | Alasan |
|---|---|---|---|
| Tekanan Zat dan Penerapannya | kelas 8 | kelas 9 Bab 3 | di situlah bab itu dicetak |
| Bilangan Berpangkat dan Bentuk Akar | kelas 9 | kelas 8 Bab 1 | di situlah bab itu dicetak |

Perpindahan ini tampak sepele dan tidak. Guru kelas 8 yang mencari "Bilangan Berpangkat"
sebelumnya tidak menemukannya sama sekali, karena bank menaruhnya di kelas 9.

**Dua mapel baru masuk jalur bank:** Bahasa Indonesia (`IND`) dan IPS (`IPS`). Sebelumnya
keduanya hidup di jalur template lama bersama 14 mapel lain.

---

## 3. Sensus sasaran

| Mapel | Bab | Butir |
|---|---|---|
| IPA | 19 | 228 |
| Matematika | 18 | 216 |
| Bahasa Indonesia | 17 | 204 |
| Bahasa Inggris | 15 | 180 |
| IPS | 12 | 144 |
| **Total** | **81** | **972** |

Angka 81 bukan target bulat buatan gerbang — ia jumlah bab yang benar-benar tercetak di
Daftar Isi kelima Buku Siswa untuk Fase D.

---

## 4. Yang ditegakkan gerbang

`tests/mapel-fase-d-content-test.js` (naik dari tiga mapel menjadi lima):

1. Bentuk kode `KOMP-<MAPEL>-D-<kelas>-BAB<n>-<NN>`, dan kelas di dalam kode = medan `grade`.
2. >= 12 butir per bab; >= 3 bab per kelas 7/8/9 tiap mapel.
3. Sensus 81 kompetensi / 972 butir.
4. Tiap butir: 4 opsi berbeda, kunci di indeks 0 pada sumber, `why` kunci terisi, dan
   `distractorWhy` ketiga pengecoh terisi.
5. Sebaran kesulitan tiap bab: >= 3 `dasar`, >= 3 `sedang`, >= 2 `tinggi`.
6. NOL rujukan posisi pilihan di `why`/`distractorWhy`, dalam bahasa apa pun. Opsi diacak
   saat terbit, jadi "pilihan pertama yang benar" berbohong 3 dari 4 kali.
7. Paritas sidecar Thai: tiap `code` dan `id` punya kembaran, nilai th ber-aksara Thai,
   himpunan `{placeholder}` sama persis, dan **himpunan angka di dalam opsi id vs th sama
   persis** — supaya murid Thai tidak pernah mengerjakan soal dengan angka berbeda.
8. Fail-quiet: bank absen => perilaku lama, nol lemparan.

**Bahasa Inggris punya satu kelonggaran yang disengaja:** batang soal dan opsi tetap dalam
bahasa Inggris pada kedua berkas, karena bahasa Inggris memang materinya — menerjemahkannya
merusak soalnya. Yang tetap wajib ber-aksara Thai adalah `why` dan `distractorWhy`, karena
itu penjelasan untuk murid, bukan materi ujian.

---

## 5. Cara menambah bab baru

Bank ditulis dari SATU sumber yang melahirkan dua berkas sekaligus (Indonesia + sidecar
Thai), sehingga tidak mungkin mengirim kunci tanpa kembarannya. Pola penulisannya ada di
riwayat commit cabang ini. Yang perlu diingat:

- `content/mapel/mapel-<mapel>-d.json` dan `-th.json` wajib punya `code`, `id`, `answer`,
  dan jumlah opsi yang sama persis dan berurutan sama.
- Kunci jawaban SELALU indeks 0 di berkas sumber. `shuffleOptions()` yang mengacaknya saat
  tugas diterbitkan.
- `distractorWhy` bukan hiasan: tiap pengecoh menjelaskan MISKONSEPSI yang membuat murid
  memilihnya, bukan sekadar menyatakan bahwa itu salah. Inilah yang dibaca guru saat
  membahas hasil ulangan.

---

## 6. Yang BELUM selesai

Pengisian 81 bab berjalan bab demi bab. Gerbang `mapel-fase-d-content-test` MERAH sampai
kelimanya lengkap — itu memang maksudnya, bukan kelalaian. Jangan menurunkan angka sensus
di gerbang untuk menghijaukannya; turunkan hanya bila OWNER memang memutuskan cakupannya
berkurang, dan catat keputusannya di sini.
