# FIEZEL — kartu konsep dan jeda yang benar-benar bisa diambil (handoff m025-125)

Rilis: `m025-125`
Lanjutan langsung dari: `FIEZEL-M025120-TUTOR-BRAIN-REALTIME-HANDOFF.md` (PR #171, mendarat
sebagai `69af7b6`)

Berkas yang berubah: `app.js`, `style.css`, `.github/workflows/quality.yml`,
`core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `sw.js`, plus satu berkas
baru: `tutor-reteach-card-test.js`.

---

## 1. Kenapa dokumen ini ada

Handoff m025-120 menutup dirinya sendiri dengan daftar yang sengaja belum dikerjakan, dan
dua yang pertama berbunyi begini:

> `decideMove` sudah memutuskan `reteach` dan `breathe`, tetapi UI-nya belum menyajikan
> **kartu konsep** sebelum soal berikutnya, dan belum menawarkan **menutup sesi lebih
> awal**. Keduanya baru terlihat sebagai naskah tutor.

Itulah yang ditutup rilis ini. Tidak ada keputusan baru yang ditambahkan ke otak tutor —
`decideMove` tidak disentuh sama sekali. Yang berubah: dua keputusan yang selama ini hanya
**terdengar** sekarang benar-benar **terjadi**.

## 2. `reteach` berhenti menjadi kalimat

`reteach` diputuskan ketika miskonsepsi yang sama muncul dua kali, atau setelah tiga salah
beruntun. Artinya di dalam otak tutor sudah tegas sejak m025-118: *berhenti menguji, mulai
mengajar*. Tetapi yang dilihat murid hanya satu baris di bawah soal yang baru saja gagal,
lalu soal berikutnya — dengan konsep yang sama, kepada orang yang keyakinannya belum
tersentuh.

Sekarang alurnya:

```
buka jawaban soal yang gagal
      ↓
KARTU KONSEP  (layar sendiri, menahan alur)
   AJAR ULANG · Present simple dan continuous
   Yang bikin tadi keliru: …
   <aturannya>
   💡 <pegangan ingatannya>
   [ Oke, aku siap coba lagi ]
      ↓
soal berikutnya, konsep yang sama (forceConcept, sudah ada sejak m025-118)
```

Tiga keputusan kecil di dalamnya, dan ketiganya disengaja:

- **Kartunya disusun dari soal yang BARU SAJA keliru**, bukan dari soal berikutnya. Yang
  perlu dijelaskan adalah hal yang barusan gagal, selagi masih hangat.
- **Kartu tanpa bahan tidak pernah ditampilkan.** Kalau soal itu tidak punya aturan maupun
  pegangan yang layak, `tutorConceptCard` mengembalikan `null` dan sesi lanjut seperti
  biasa. Kartu kosong menghentikan sesi tanpa memberi apa pun sebagai gantinya.
- **Seluruh naskahnya lewat `tutorIndonesian()`.** Bank soal menyimpan penjelasan aslinya
  dalam bahasa Inggris; mengutipnya mentah-mentah adalah persis regresi 1 yang ditemukan di
  m025-118, dan gerbang baru menguji ulang hal itu dengan naskah Inggris buatan.

Kartu ini juga membawa tombol **Keluar** yang sama dengan layar kuis — layar yang menahan
alur tanpa jalan keluar adalah kurungan, bukan pelajaran.

## 3. `breathe` berhenti menjadi saran, jadi pilihan

`decideMove` menaruh kelelahan di urutan **paling atas**, di atas segalanya, dengan alasan
yang ditulis di modulnya: latihan di atas kelelahan tidak menempel, dan yang tertinggal
justru ingatan bahwa belajar itu melelahkan.

Sampai m025-124 yang terjadi hanyalah tutor berkata *"kita berhenti di sini dulu"* — lalu
menyodorkan soal berikutnya. Sekarang murid benar-benar bisa berhenti:

```
[ Sudahi sesi ini ]   [ Lanjut, aku masih kuat ]
```

- **Berhenti tidak menghanguskan apa pun.** Skor dihitung dari soal yang sudah dijawab
  (`asked+1`, termasuk yang barusan), dan seluruh evidence sudah tercatat per jawaban sejak
  m025-118. Layar hasil muncul seperti sesi yang selesai wajar.
- **Ditawarkan SEKALI per sesi.** Tawaran berhenti yang diulang tiap soal berubah menjadi
  desakan; murid yang memilih lanjut sudah menjawab pertanyaan itu.
- **"Sudahi sesi ini" yang jadi tombol utamanya.** Pada titik ini FIEZEL memang sedang
  menyarankan berhenti, bukan sekadar mengizinkan.

## 4. Gerbang — `tutor-reteach-card-test.js` (13 gate, terdaftar di `quality.yml`)

Fungsi yang mengembalikan kartu kosong, atau tombol yang tidak menghentikan apa pun, akan
lulus setiap tes yang memeriksa "apakah fungsinya ada". Yang diuji di sini keputusannya:

- kartu tanpa bahan **tidak** dibuat;
- sebab kegagalan mengikuti pilihan yang **diambil**, bukan distraktor mana pun;
- naskah Inggris **tidak pernah** sampai ke kartu (dijalankan sungguhan: `tutorIndonesian`,
  `tutorWhyFails`, dan `tutorConceptCard` diambil apa adanya dari `app.js` lalu dieksekusi
  di VM — bukan disalin ulang ke dalam tes, karena salinan menguji salinan);
- kartu menahan alur **sebelum** soal berikutnya digambar, dan tombol lanjutnya
  mengosongkan kartu supaya tidak bisa muncul dua kali;
- tawaran berhenti memanggil `finishQuiz` dengan `asked+1`, dan penjaga sekali-tawar
  dipasang **sebelum** tawarannya digambar;
- bidang kartu memakai token bertema, jadi gerbang bidang pastel m025-117 tetap terpenuhi.

Berkas gerbangnya menormalkan akhiran baris lebih dulu (`\r\n` → `\n`), dengan sengaja:
pohon kerja Windows di-checkout sebagai CRLF sementara blob yang dilihat CI LF, dan gerbang
yang menuliskan `\n` di dalam polanya akan merah di satu tempat dan hijau di tempat lain
untuk berkas yang sama persis. (`back-nav-test.js` punya persis masalah itu dan merah
secara lokal di Windows; blobnya hijau — diperiksa dengan menjalankan polanya atas
`git show HEAD:app.js` dan `git show main:app.js`, keduanya cocok.)

## 5. Diverifikasi di Chromium, bukan dari membaca kode

```
build m025-125
jawab salah berulang  -> KARTU KONSEP muncul di putaran ke-2
                         "AJAR ULANG · Present simple dan continuous"
                         "Yang bikin tadi keliru: …"  + aturan + pegangan
                         penanda "Jeda mengajar" di topbar
[Oke, aku siap coba lagi] -> kartu hilang, soal berikutnya tergambar (4 opsi)
decideMove -> breathe     -> "Sudahi sesi ini" + "Lanjut, aku masih kuat"
[Sudahi sesi ini]         -> layar hasil: "1 dari 3 jawaban benar pada percobaan pertama",
                             plus baris laporan tutor
```

Satu cacat ditemukan di jalan itu dan langsung diperbaiki: kalimat sebab kegagalan berakhir
dengan **dua titik** karena teks sumbernya sudah membawa titiknya sendiri.

## 6. Yang masih sengaja belum dikerjakan

Diagnosis spesifik menjangkau **43%** distraktor grammar (168 dari 387). Diperiksa ulang di
rilis ini: 387 distraktor membawa **386 nama miskonsepsi unik**, semuanya kalimat bebas
berbahasa Inggris. Jadi ini bukan pekerjaan tabel terjemahan kecil yang bisa disisipkan di
sela rilis lain — ia pekerjaan konten tersendiri, dan tetap dicatat sebagai berikutnya.
